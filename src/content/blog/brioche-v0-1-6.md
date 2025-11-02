---
title: "Brioche v0.1.6: Now for ARM64!"
pubDate: 2025-11-02T14:29:45-08:00
author: Kyle Lacy
authorUrl: https://kyle.space
showBlurb: true
tableOfContents: true
---

Well, it's been a while since the release of [Brioche v0.1.5](/blog/announcing-brioche-v0-1-5). We've got some exciting new features in this release, plus Brioche finally supports **aarch64 Linux** (a.k.a ARM64 Linux) as a platform!

Whether you're new to Brioche or want to try out the latest improvements, check out the [installation docs](/docs/installation) for instructions on installing the latest release! Oh, and if you want a detailed breakdown of all the changes from this release, check out the [release notes](https://github.com/brioche-dev/brioche/releases/tag/v0.1.6) too.

(and small heads up: there were some [major changes to the release process](#release-process-changes), so automatic updates with `brioche self-update` aren't available for existing installations for this release! sorry!!)

## aarch64 support

If you're on an aarch64 machine, you can now install Brioche! It'd be hard to even tell that anything's different from an x86-64 machine.

Behind the scenes, it took a lot of work to reach this point. We needed to pull in aarch64 versions of our sandbox rootfs components, add a way for build scripts to distinguish the current platform, update the toolchain to for native aarch64 compilation, rebuild and fix all of our existing packages, and set up a CI runner for package builds. We've had all this up and running in nightly [since June](/blog/project-update-2025-06#aarch64-linux-support), so **all existing packages in the Brioche Packages repo are supported on aarch64 now, and provided in the cache!** <sup>(...with a few exceptions when an upstream package doesn't support aarch64!!)</sup>

This is another step on our goal towards great cross-platform and cross-compilation support in Brioche. With _native compilation_ for aarch64, this is a stepping stone towards _cross-compilation_. Also, going from _one_ to _two_ platforms is a stepping stone to _lots_ of platforms. (Check the GitHub Discussion [on cross compilation](https://github.com/brioche-dev/brioche/discussions/302) too, if you're interested!)

## Live updates

The [Brioche Packages](/packages) repo is growing steadily-- and we [just crossed 300 packages](/blog/project-update-2025-10)! With only a small number of maintainers, we need to be thoughtful in how we stay on top of continual package updates over time.

That's where live updates come in: a tool for automated package updates. Basically, each package defines its "live update" script. Then, we have a CI job that runs weekly, calls each package's live update script, then creates a PR automatically for each out-of-date package. From there, the PRs go through review. We're able to merge most update PRs as-is, and the rest act as a starting point for manual changes.

Let's go through a little example to see live updates in action. Here's a Brioche project for building [eza](https://github.com/eza-community/eza):

```typescript title=eza/project.bri
import * as std from "std";
import { cargoBuild } from "rust";

export const project = {
  name: "eza",
  version: "0.23.3",
  repository: "https://github.com/eza-community/eza.git",
};

const source = Brioche.gitCheckout({
  repository: project.repository,
  ref: `v${project.version}`,
});

export default function eza(): std.Recipe<std.Directory> {
  return cargoBuild({
    source,
    runnable: "bin/eza",
  });
}
```

...oh, but our package is already out-of-date! [eza v0.23.3 was released at the start of October](https://github.com/eza-community/eza/releases/tag/v0.23.4). eza seems to have new versions published on their GitHub Releases page, so we'll use the [`std.liveUpdateFromGithubReleases`](https://github.com/brioche-dev/brioche-packages/blob/4cdeef2a102cda612880090619e60407512e9c1d/packages/std/extra/live_update/from_github_releases.bri) function:

```typescript title=eza/project.bri
// ...

export function liveUpdate(): std.Recipe<std.Directory> {
  return std.liveUpdateFromGithubReleases({ project });
}
```

Now if we run `brioche live-update`, we'll see that the version is automatically updated for us!

```diff
 export const project = {
   name: "eza",
-  version: "0.23.3",
+  version: "0.23.4",
   repository: "https://github.com/eza-community/eza.git",
 };
```

Not just that, but our lockfile `brioche.lock` was also updated, so it now points to the new commit for the `v0.23.4` tag!

Under the hood, each piece is pretty simple:

1. `brioche live-update` builds and runs the `liveUpdate` export from our project-- which in turn just uses `std.liveUpdateFromGithubReleases`.
2. `std.liveUpdateFromGithubReleases` uses [a small Nushell script](https://github.com/brioche-dev/brioche-packages/blob/4cdeef2a102cda612880090619e60407512e9c1d/packages/std/extra/live_update/scripts/live_update_from_github_releases.nu) to call the GitHub Releases API. It takes our starting `project` export, updates the version based on the API response, and prints the new value as JSON to stdout.
3. Brioche parses the JSON, then updates our `project.bri`, substituting the previous `export const project` with the JSON value.
4. Brioche updates the lockfile, if needed. This works because [statics](/docs/core-concepts/statics)-- like `Brioche.gitCheckout`-- can reference the `project` export.

This approach is both simple and powerful, making it easy to add pre-built live-update scripts from a variety of sources, or project-specific ones as needed. And [**@jaudiger**](https://github.com/jaudiger) has been hard at work adding pre-built live-update scripts [for a _bunch_ of common package sources](https://github.com/brioche-dev/brioche-packages/tree/main/packages/std/extra/live_update)!

## Faster bulk checking and formatting of packages

`brioche check` and `brioche fmt` can both take multiple packages to work on in bulk, [since Brioche v0.1.2](https://github.com/brioche-dev/brioche/releases/tag/v0.1.2).

Well, now, both have been re-worked: both commands now load and handle all the projects in bulk too, rather than just processing them one by one. For `brioche check` especially, this can be a _huge_ improvement! Back when [PR #255](https://github.com/brioche-dev/brioche/pull/255) was opened, I measured the time it took to call `brioche check` with all the packages from the `brioche-packages` repo, and it went from **6 minutes 1 second** to just **7.5 seconds**-- that's **48 times faster**!

(the actual speed improvement will be proportional to the number of projects you're checking, though!)

## Lazy building (experimental)

The main build job in the Brioche Packages CI pipeline boils down to a simple loop-- basically:

```bash
for package in package/*; do
  brioche build -p "$package" --sync --locked
done
```

Unintuitively, this ended up wasting a _lot_ of time and bandwidth. That's because, today, `brioche build` always ensures the build result exists locally (either building it, or pulling it from the cache). In other words, we were fetching the output for _every_ package on _every_ CI run, even if the package was already up-to-date in the remote cache!

I ruled out updating our CI pipeline to look at which files changed. It's not specific enough for our needs, since we'd also want to re-run if a dependent package changed too. It also creates awkward issues and failure cases if earlier CI builds failed.

Instead, I added a new flag for `brioche build`: `--experimental-lazy`. Basically, it first checks if the build result exists in the remote cache, and skips doing anything else if it does. It avoids the useless pulling from the cache that we don't want!

I added it as a new build flag for now; mostly because the implementation was a bit hacky and awkward, and partially because I felt like the old behavior of pulling the cache results _could_ be useful in some cases. I also still feel this flag is experimental (hopefully that's clear from the name)! A few thoughts:

- The name is not final of course. It could be renamed to `--lazy` (or some other name)
- ...or, in the future, we could make this the default behavior of `brioche build` (possibly with, say, an inverse `--pull` flag to always pull the result from the cache)
- The behavior is also not final. It doesn't exactly play well with other flags like `-o` / `--output` today
- We've been using this for a while now in the Brioche Packages repo, and so far nothing has broken terribly!

## Lazy publishing

The basic flow of the Brioche Packages CI pipeline basically does this:

1. Check each package
2. Build each package
3. Publish each package

We've already talked about how we've sped up [checking](#faster-bulk-checking-and-formatting-of-packages) and [building](#lazy-building-experimental), but we've also sped up publishing!

Each time we ran `brioche publish`, Brioche would first run checks against the package. But by the time we reached step (3) in the workflow, we've already run `brioche check` on each package in step (1), so this check was redundant. And worse, `brioche publish` doesn't support taking multiple packages to publish (today), so each of these checks were run sequentially, just like we had been doing before.

So, [**@jaudiger**](https://github.com/jaudiger) added the new `--no-verify` flag for the `brioche publish` command ([PR #326](https://github.com/brioche-dev/brioche/pull/326)). As the name implies, it skips over the checks we do before publishing. This sped up the "publish" step in our CI pipeline roughly from **30 minutes** to **3 minutes**-- that's **900% faster**!

(again, it's actually proportional to the number of projects you're trying to publish! also please don't use it unless you're already calling `brioche check` first!!)

## Shorthand (non-function) exports

Let's look at a basic Brioche project (based roughly on our [`rust_backend` example project](https://github.com/brioche-dev/brioche-packages/blob/32357428b11a8f1b511ef03ccd6d01b96930b8c7/examples/rust_backend/project.bri)):

```typescript title=project.bri
import * as std from "std";
import { cargoBuild } from "rust";

export default function () {
  return cargoBuild({
    source: Brioche.glob("src", "Cargo.*"),
    runnable: "bin/rust_backend",
  });
}
```

The meat and potatoes of our build is wrapped within the `export default function () { }`. But having to wrap our build in an extra function doesn't seem to be super helpful here, does it?

Well, now you get rid of the `function` wrapper, if you'd like!

```typescript title=project.bri
import * as std from "std";
import { cargoBuild } from "rust";

export default cargoBuild({
  source: Brioche.glob("src", "Cargo.*"),
  runnable: "bin/rust_backend",
});
```

Both snippets are effectively the same now, so it really comes down to personal preference for which style you go with. For Brioche Packages, we'll likely stick with the existing wrapper functions for a number of reasons (specifying the type of the recipe, giving the function a module-local name for use with tests, deferring work until a recipe is evaluated). But I have some ideas for future features where non-function exports could be a big improvement for ergonomics, plus I think this change makes things more consistent!

## Release process changes

Our release process for Brioche went through a massive overhaul during this release, stemming from [PR #281](https://github.com/brioche-dev/brioche/pull/281).

Unfortunately, the new release structure isn't compatible with the pre-existing self-update process-- sorry about that! Whether you have an existing installation of Brioche or not, check the ["Installation" docs](/docs/installation) for details on installing the latest release.

This is mostly an internal change, and one that should make it easier to get new releases out faster. But there are a few interesting things that you might notice from the outside too:

- Releases are now signed! Both the installer and self-updater will validate the signature against our "release" public key before installing.
- Releases are now [attested](https://github.com/brioche-dev/brioche/pull/352), too. We don't do any validation around the attestation (today), but this gives strong guarantees about how the release artifacts were built. Check out GitHub's docs on [artifact attestation](https://docs.github.com/en/actions/concepts/security/artifact-attestations) for more context.
- We've now moved entirely over to ["packed builds"](<(/blog/announcing-brioche-v0-1-4#packed-builds-of-brioche)>), finally! (Unpacked builds are still included with nightly releases though)
- The release artifacts are distributed as `.tar.xz` files, meaning they're smaller (and therefore quicker to download)!
- The install script now lives in its own repo: [`brioche-installer`](https://github.com/brioche-dev/brioche-installer) (still missing a README + docs at the time of writing, but hopefully that will change soon)

---

Well, this release ended up including a lot more than I was expecting... but it makes sense since it's been over 6 months since our last release.

Going forward, I'm aiming for smaller, more frequent releases, so expect less exciting announcements! The new release process should make it _much_ easier to get new releases out the door. Plus, if you didn't see the news from the last project update, I'm now [working on Brioche part-time](/blog/project-update-2025-10#officially-working-part-time-on-brioche)!
