---
title: Brioche Project Update - October 2024
pubDate: 2024-10-04T22:17:40-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

Well, it's been a busy couple of months! Since the [last update in August](/blog/project-update-2024-08), there have been _two_ releases, some big changes in `std`, and more!

## Blog posts

If you hadn't seen it yet, I published a post a couple of weeks ago called ["Portable, dynamically linked packages on Linux"](/blog/portable-dynamically-linked-packages-on-linux)

It's a pretty in-depth behind the scenes look at how [packed executables](/docs/how-it-works/packed-executables) work in Brioche. I wanted to make it general enough that folks interested in packaging or distributing software more generally for Linux get some value out of it-- which is also why it's pretty technical and long

## Brioche releases

[Brioche v0.1.2](https://github.com/brioche-dev/brioche/releases/tag/v0.1.2) was released last week, with [Brioche v0.1.3](https://github.com/brioche-dev/brioche/releases/tag/v0.1.3) close behind. v0.1.3 was pretty small release with a few bugfixes (most notably a fix for an LSP regression from v0.1.2), but the real meat and potatoes were in v0.1.2.

The [release notes](https://github.com/brioche-dev/brioche/releases/tag/v0.1.2) cover everything that changed, and there's a lot of exciting stuff! Especially the CLI changes that allow for running across multiple projects at once and the fix for the Brioche auto-updater (finally!) which will make future updates go more smoothly.

My favorite new features though are locked downloads and locked git refs.

### Locked downloads

Up to this point, if you were adding a package in Brioche, you'd get something that looks like [this package (dust)](https://github.com/brioche-dev/brioche-packages/blob/79f173c68d3e2db6b51f70ad6cc246706df659dc/packages/dust/project.bri). In the middle, you'd see something like this:

```typescript
const source = std
  .download({
    url: `https://github.com/bootandy/dust/archive/refs/tags/v${project.version}.tar.gz`,
    hash: std.sha256Hash(
      "98cae3e4b32514e51fcc1ed07fdbe6929d4b80942925348cc6e57b308d9c4cb0",
      // ^^^ tedious, boring busywork ^^^
    ),
  })
  .unarchive("tar", "gzip")
  .peel();
```

To download the source code to build a project, we need its hash. So, how do we even _get_ the hash for a URL? Well, before v0.1.2, there were two ways:

1. Copy the URL and paste it into a shell one-liner using `curl | sha256sum`, then copy the hash into the source code
2. Add an invalid hash, run the build, then copy the hash from the error message into the source code

In either case, _manually_ copy/pasting hashes is busywork, which is the kind of thing we want to automate away. Which brings us to `Brioche.download`! Here's a snippet that's roughly the same as before:

```typescript
const source = Brioche.download(
  `https://github.com/bootandy/dust/archive/refs/tags/v${project.version}.tar.gz`,
  // No more hash!
)
  .unarchive("tar", "gzip")
  .peel();
```

The "trick" is that, when you call `brioche build` on this project, Brioche scans for all occurrences of `Brioche.download` in the code, downloads each one, then _saves each hash in the lockfile_. This has all the same benefits as having the hash directly in the source code, except you don't need to manually figure out the hash yourself (plus Brioche only downloads the URL once, instead of making Brioche download it a second time after you manually hashed it)

Since Brioche needs to scan the script to find all URLs, there are some limitations on how you can construct the URL. Namely, the URL needs to be hard-coded as a string literal, or as a template that uses the [project metadata](/docs/core-concepts/projects/#project-metadata) (like `project.version` above). In the future, it should be possible to make this support a little more general, but the important thing is that Brioche needs to be able to figure out the URL _statically_.

### Locked git refs

In the same vein, packages that clone from git [used to need to reference the git hash directly in the source code](https://github.com/brioche-dev/brioche-packages/blob/79f173c68d3e2db6b51f70ad6cc246706df659dc/packages/gitui/project.bri).

If you squint, this is the exact same problem as with URL download hashes! So, Brioche can also apply the same trick: instead of referencing the git hash directly, you can call `Brioche.gitRef({ repository, ref })`, and Brioche will record the commit hash the currently corresponds with that git ref in the lockfile, such as in this snippet:

```typescript
// Previously
// const source = gitCheckout({
//   repository: "https://github.com/extrawurst/gitui.git",
//   commit: "95e1d4d4324bf1eab34f8100afc7f3ae7e435252",
//   // Commit grabbed manually by finding the right tag in the repo
// });

// Now
const source = gitCheckout(
  Brioche.gitRef({
    repository: "https://github.com/extrawurst/gitui.git",
    ref: `v${project.version}`,
    // The commit hash for the version tag gets saved in the lockfile
  }),
);
```

## Package updates

Since the last update, the only new package is `terraform` (thanks [**@asheliahut**](https://github.com/asheliahut)!), but quite a few packages were also updated across the board (kudos to [**@jaudiger**](https://github.com/jaudiger) and [**@asheliahut**](https://github.com/asheliahut)!)

The `rust` package was updated from v1.79 to v1.81, which did see a few packages break along the way. `go` was also updated to support more complex module layouts, namely to unblock the `terraform` package (under the hood, the `go` package now properly grabs all the `go.mod` and `go.sum` files before trying to download dependencies).

## std updates

A _lot_ of work went into `std` updates. The [changelog](https://github.com/brioche-dev/brioche-packages/blob/e70bd2a3525e6b7b3603cd3aa9a3e047d59d8b4f/packages/std/CHANGELOG.md#2024-10-04) has a full breakdown.

The `std.glob()`, `Brioche.download()`, and `Brioche.gitRef()` functions were added to support new features from Brioche v0.1.2. The `std.setEnv()` function had a breaking change that also enables support for more ways to set env vars (which also requires Brioche v0.1.2). Also, the new `std.semverMatches()` function allows for testing semver constraints, which is used by `std` itself to ensure you can't accidentally use new features on older versions of Brioche

`std.toolchain()` now sets a bunch of env vars that autotools use, so autotools builds should now work [without needing to configure lots of env vars manually!](https://github.com/brioche-dev/brioche-packages/pull/110/files#diff-caf738b3d91954f00137e92a4503a1fb820a9faa08722f37f64a4b7f1689b2bc)

Also, both `std.toolchain()` and `std.tools()` are now "rewrapped", which ensures the final built version of glibc is used internally by all the different binaries. Previously, if you saved `std.toolchain()` as an output, you'd see that there were multiple different copies of glibc present in the output, due to different binaries being built at different stages and ending up with different versions of glibc! Rewrapping ensures everything is using a single copy of glibc for consistency (which also has the nice benefit that the output is now smaller too!)

## Brioche core updates

Shortly after the v0.1.3 update, I fixed another LSP issue ([#134](https://github.com/brioche-dev/brioche/pull/134)). This one is certainly annoying as well, but I didn't feel that it was critical enough to cut another release immediately.

I also added a new `--locked` flag for the quartet of `brioche build`, `brioche run`, `brioche check` and `brioche install` ([#133](https://github.com/brioche-dev/brioche/pull/133)). Basically, it just ensures that the `brioche.lock` lockfile is up-to-date. This is useful for CI/CD (and was also sorely needed for the `brioche-packages` repo, especially now that downloads and git refs are being recorded in the lockfile)

## Infrastructure updates

I've been doing my best running Brioche [on a shoestring budget](https://brioche.zulipchat.com/#narrow/stream/440653-general/topic/Storage.20size.20information/near/459742418), and so far things have been going really well! Besides an [outage due to an expired TLS cert](https://community.fly.io/t/tls-handshake-failing-on-fly-io-app/21923/3), all of the infrastructure behind Brioche has been ticking along smoothly.

...well, with one exception. Builds are obviously _super_ important for Brioche, and making it so updates to the [`brioche-packages`](https://github.com/brioche-dev/brioche-packages) repo get built and published in a timely manner is a core part of the project!

That entire pipeline is handled with a [pretty boring GitHub Actions workflow](https://github.com/brioche-dev/brioche-packages/blob/fe61cd9719c661267dc843548899df37b0b49cef/.github/workflows/ci.yml), which first validates all the packages, builds and syncs the recipes to the registry, then publishes the project files to the recipe. We use GitHub Action's generous free runners where possible. But, for the actual slow, CPU-intensive builds, those get run on my and [**@asheliahut**](https://github.com/asheliahut)'s homelab.

In early September, I decided to upgrade the Linux kernel on the hypervisor, plus all of the OS packages. The upgrade _appeared_ to go fine. It was not fine.

To cut a long story short, the server would crash after about 24 hours of uptime (and, very annoyingly, would bring down our entire home network as well). We fought for _weeks_ to triage the issue, from using older kernel releases, to trying out different kernel flags, to swapping the NIC in the server (which at least made it so the server crashes wouldn't bring down the network), to updating the BIOS. The last thing we did was disabling CPU C-states in the BIOS, and so far that seems to be holding strong

## Coming soon

As with last time, here's a short wishlist of things I hope to make progress on soon

- CMake and Python are still work in progress and haven't been touched since the last update. These will be pretty high priority!
- There's still some work to do before merging [brioche-dev/brioche-packages#80](https://github.com/brioche-dev/brioche-packages/pull/80), but that should unlock more NPM packages as well
- `Brioche.download()` and `Brioche.gitRef()` make it so many package updates are as simple as bumping a version number in `project.bri`. The next logical step would be to support package auto-updates, where bumping the version number itself is automated
- Still no forward progress on cross-platform support. The immediate next step is to set up Asahi Linux on our homelab Mac Mini, which will make it possible to start tinkering with ARM64 Linux builds
