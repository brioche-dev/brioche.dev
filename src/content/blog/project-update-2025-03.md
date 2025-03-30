---
title: Brioche Project Update - March 2025
pubDate: 2025-03-31T00:35:49-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

## Status report

### Cyclic imports

Last month, I [mentioned challenges with a package where we wanted cyclic/recursive imports](/blog/project-update-2025-02#recursive-import-troubles). Well, I'm happy to report that that PR [#211](https://github.com/brioche-dev/brioche/pull/211) added support for cyclic imports and has been merged in! It allows two projects to import each other as long as they're part of the same [workspace](https://brioche.dev/docs/core-concepts/workspaces/).

Getting this feature over the finish line took a lot more work than I was expecting! To get into the weeds a bit: Brioche internally represented projects as a JSON structure that looked like this:

```json
{
  // Value of `export const project`
  "definition": {
    "name": "curl",
    "version": "8.11.1",
  },

  // Hashes of the TypeScript modules from the project
  "modules": {/* ... */},

  // Any statics (downloads, etc) from the project
  "statics": {/* ... */},

  // Other projects imported by this project
  "dependencies": {
    "std": "<hash>",
    "openssl": "<hash>",
  }
}
```

This JSON structure is then normalized and hashed, which is used as the `ProjectHash`, which is used to uniquely identify the project. This hash is used for publishing and retrieving the projects via the registry, and is used in lockfiles when another project references it. Each value under `dependencies` is a `ProjectHash` value... which means that a `ProjectHash` depends on the `ProjectHash` values of its dependencies.

...do you see the problem? If `fizz` and `buzz` depend on each other, then `fizz` depends on the hash of `buzz`, and `buzz` depends on the hash of `fizz`, which... uh... you can't do!

To handle cycles, I introduced some indirection: projects get grouped into a "workspace", which basically just contains multiple of the JSON value from before:

```json
{
  "packages/curl": {
    // Value of `export const project`
    "definition": {
      "name": "curl",
      "version": "8.11.1",
    },

    // ... same fields as before ...
  },
  "packages/openssl": {
    // ...
  },
  "packages/std": {
    // ...
  }
}
```

We hash _this_ JSON value to get a `WorkspaceHash`. We still have a `ProjectHash`, but it instead comes from a JSON value that references the `WorkspaceHash`:

```json
{
  "type": "workspace_member",
  "workspace": "<hash>",
  "path": "packages/curl",
}
```

So, as long as "_workspaces_" don't form cycles, we're golden.

I've also been using quotes around "workspaces". We do only group projects together when they're part of the same [workspace](https://brioche.dev/docs/core-concepts/workspaces/) on disk, i.e. they're under a directory containing a `brioche_workspace.toml` file. But, we only group projects together in a shared structure if we need to break a cycle: we build a graph of projects with their dependencies, and build a "workspace" from each [strongly-connected component](https://en.wikipedia.org/wiki/Strongly_connected_component) of the graph containing more than one project (and we validate that each grouped project contains the same `brioche_workspace.toml` file). This both ensures hash stability (since the hash only depends on the subset of projects part of the same workspace group) _and_ backwards compatibility (if a project doesn't have any cycles, it still uses the "original" JSON format and so will keep the same hash as before, which is important for prior versions of Brioche).

> **Side note**: I haven't been super happy with calling these grouped projects "workspaces" in this context, so I might switch to a different term before this feature gets shipped.

### Debug shell for failed jobs

Okay, this one isn't super flashy, but it's something I've wanted for a long time and I'm really happy I finally had a chance to sit down and implement it! It landed in PR [#215](https://github.com/brioche-dev/brioche/pull/215).

TL;DR: if a build fails, you can now run `brioche jobs debug-shell $path_to_event_file` and you'll get dropped into a shell in the sandbox for the failed build! It doesn't sound super exciting, but it can be a huge quality-of-life boost when trying to write a package with a slow build process.

The catalyst was LLVM, which I worked on packaging last week. The build failed consistently at _98%_, after about an hour and a half and after consuming around 150 GB of disk space! Even worse: I tried running the build through `strace` to log all the subprocesses started by the build-- an invaluable tool for finding subtle build issues previously-- and something else went wrong earlier in the build process. My go-to debugging tool was interefering in some way with the build.

After I added the `brioche jobs debug-shell`, I could jump right into the LLVM build process. Since almost the whole build had already finished, running `cmake build` within the shell let me explore what went wrong-- basically doing an autopsy on the build itself. Along with `strace`, I was able to narrow down what went wrong with the build, short-circuiting the rest of the build that ran without problems.

The failure turned out to be from `brioche-ld`. I never implemented support for `@file`-style arguments, which was causing the build to fail. I got a fix ready pretty quickly in [brioche-dev/brioche-runtime-utils#21](https://github.com/brioche-dev/brioche-runtime-utils/pull/21). It would've taken _much_ longer to track this down without the new debug shell command!

### `Brioche.gitCheckout` groundwork

Currently, if you want to check out a git repo in Brioche, the recommended way is to combine the `gitCheckout` and `Brioche.gitRef` functions:

```typescript
const source = gitCheckout(
  Brioche.gitRef({
    repository: "https://github.com/antonmedv/fx.git",
    ref: "35.0.0",
  }),
);
```

After some discussion about standardizing and improving how downloads from GitHub are handled in [brioche-dev/brioche-packages#176](https://github.com/brioche-dev/brioche-packages/discussions/176), [**@jaudiger**](https://github.com/jaudiger) proposed having a single function to combine both steps.

`Brioche.gitRef` is a [static](https://brioche.dev/docs/core-concepts/statics/#briochegitref), which means that it gets some super-powers from the runtime so it can push stuff into the lockfile. However, that also comes with some tight restrictions: it _must_ be called with very simple arguments, or it'll return a runtime error. That also means that it can't just be wrapped in another function call.

So, to solve this, I added `Brioche.gitCheckout` as a new static in [#218](https://github.com/brioche-dev/brioche/pull/218). The runtime itself treats it identically to `Brioche.gitRef` when it comes to the lockfile, but the [`brioche-packages`](https://github.com/brioche-dev/brioche-packages/) repo can take care of the implementation so that it gets the commit and checks it out from the repo in one function call.

The implementation still hasn't landed yet, but expect to see it shortly after the next Brioche release!

### New build machine

Whenever a build is triggered for [`brioche-packages`](https://github.com/brioche-dev/brioche-packages/), it runs on a server in my and [**@asheliahut**](https://github.com/asheliahut)'s homelab. Unfortunately, this hasn't been a great setup for a number of reasons:

- The server it runs on is used for other stuff too. Sharing CPU with the other stuff makes builds slower overall
- The I/O on the server is really slow-- it's fine for low-usage stuff, but it does noticeably impact build times
- There's some kind of issue in the kernel or firmware or something that causes disks to permanently disconnect until a reboot. It only happens about once a month, and seems to trigger more often with high I/O usage. Not a blocker, but it's definitely been annoying to deal with!

I finally decided to bite the bullet and ordered a new mini PC recently. I went for the Minisforum MS-A1, and it's now set up to run all the build jobs in the [`brioche-packages`](https://github.com/brioche-dev/brioche-packages/) repo! Builds have been noticeably faster

## Housekeeping

### New packages

Since the last update, there were **10** new packages:

- `re2c` ([#241](https://github.com/brioche-dev/brioche-packages/pull/241) by [**@asheliahut**](https://github.com/asheliahut))
- `process_compose` ([#257](https://github.com/brioche-dev/brioche-packages/pull/257))
- `icu` ([#258](https://github.com/brioche-dev/brioche-packages/pull/258))
- `postgresql` ([#259](https://github.com/brioche-dev/brioche-packages/pull/259))
- `libtirpc` ([#264](https://github.com/brioche-dev/brioche-packages/pull/264))
- `rpcsvc_proto` ([#265](https://github.com/brioche-dev/brioche-packages/pull/265))
- `php` ([#266](https://github.com/brioche-dev/brioche-packages/pull/266) by [**@asheliahut**](https://github.com/asheliahut))
- `caddy` ([#269](https://github.com/brioche-dev/brioche-packages/pull/269))
- `nginx` ([#270](https://github.com/brioche-dev/brioche-packages/pull/270))
- `llvm` ([#271](https://github.com/brioche-dev/brioche-packages/pull/271))

### Brioche core updates

- Fix occasional error when an inline cache archive contains an empty blob ([#196](https://github.com/brioche-dev/brioche/pull/196))
- Rust 1.85 support ([#197](https://github.com/brioche-dev/brioche/pull/197) by [**@jaudiger**](https://github.com/jaudiger))
- Handle projects with cyclic (circular) dependencies ([#211](https://github.com/brioche-dev/brioche/pull/211))
- Add a new command to start a debug shell within a job ([#215](https://github.com/brioche-dev/brioche/pull/215))
- Fix "File exists" error when fetching a project from the cache (sometimes) ([#216](https://github.com/brioche-dev/brioche/pull/216))
- Add support for `Brioche.gitCheckout` as a static ([#218](https://github.com/brioche-dev/brioche/pull/218))
