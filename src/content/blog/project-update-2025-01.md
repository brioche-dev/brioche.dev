---
title: Brioche Project Update - January 2025
pubDate: 2025-01-26T23:19:42-08:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

It's been a while since I got a Project Update out. December was a turbulent month for me-- we had a loss in the family, we were out of town for a while, and I was sick for a while. And beyond all that, it was nice to unplug for a while to spend time with friends and family over the holidays too.

...anyway, since the start of the year, I've definitely picked up steam on Brioche again, and a lot has happened [since the last update in November!](project-update-2024-11.md)

## Status report

### Brioche v0.1.4 released

About a week ago, I published [Brioche v0.1.4](/blog/announcing-brioche-v0-1-4/)! There were some fun headline features, but to me this release was more about finally getting a few incremental improvements out in the wild.

### CMake

[brioche-packages#144](https://github.com/brioche-dev/brioche-packages/pull/144) introduced a new package for CMake. A simple `project.bri` for a CMake project might look something like this:

```typescript
import * as std from "std";
import { cmakeBuild } from "cmake";

export default function (): std.Recipe<std.Directory> {
  return cmakeBuild({
    source: Brioche.glob("CMakeLists.txt", /* build files */),
    dependencies: [std.toolchain(), /* other deps */],
  });
}
```

The biggest challenge here was to do with [packed executables](/docs/how-it-works/packed-executables/). It turns out CMake, in some cases, will try to update an executable's rpath after the build. Brioche's packed executable format interfered with CMake's logic here, so I ended up introducing a patch to the CMake build.

This patch updates CMake to look for Brioche's packed executables, and-- if found-- applies the rpath logic to the unpacked executable, then re-packs it. For normal non-packed executables, this logic works exactly the same, so you can use Brioche's version of CMake for totally normal builds too-- say, by running `brioche install -r cmake`!

### Ubuntu troubles

I finally decided to update our GitHub Actions workflows from Ubuntu 22.04 to Ubuntu 24.04. That sent me down a rabbit hole, where I discovered that [Ubuntu 23.10 started restricting user namespaces by default](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces). Brioche uses user namespaces for build sandboxing, so this means **Brioche builds don't work on Ubuntu out-of-the-box!**

This led to a few outcomes:

- I updated the main Brioche build to use Ubuntu 24.04, but added a sysctl config to "un-restrict" user namespaces ([brioche#151](https://github.com/brioche-dev/brioche/pull/151))
- I updated the [`setup-brioche`](https://github.com/brioche-dev/setup-brioche) GitHub Action to try installing an AppArmor profile, if it seems like it's needed ([setup-brioche#2](https://github.com/brioche-dev/setup-brioche/pull/2))
- As part of the Brioche v0.1.4 release, I added a sandboxing fallback using [PRoot](https://proot-me.github.io/). This has a performance penalty, but it makes sure Brioche can work out-of-the-box on Ubuntu 24.04 ([brioche#159](https://github.com/brioche-dev/brioche/pull/159)).

The work on the sandboxing fallback ended up taking me a lot longer than I expected. There were some false starts, but using PRoot seemed to be the most reasonable direction here. Specifically, we run PRoot within a namespace-- Ubuntu 24.04 lets you create an unprivileged user namespace, but prevents you from creating _mounts_ within an unprivileged namespace.

So the idea is that we use namespaces just like we did before, except if using mounts fails for isolating the filesystem, we'll use PRoot instead (e.g. on Ubuntu 24.04).

PRoot definitely isn't a perfect solution, but it was the best solution that I could adopt easily. I also looked into using [User-mode Linux](https://en.wikipedia.org/wiki/User-mode_Linux), but everything I've read about it suggests it's not really meant as a sandboxing tool... plus I wasn't able to compile a working build of it. Longer-term, if Brioche is going to need sandboxing option like PRoot, I think it'd be interesting to build a DIY solution: a built-in ptrace-based sandboxing tool, but tailored for Brioche's sandboxing needs.

Shorter-term, I'd also like to add more sandboxing options. The next one would be an "unsandboxed" sandboxing mode, and later followed by a "qemu" sandboxing mode. I don't think either would be a good default, but would be a good option if you're using, say, Ubuntu 24.04 and want better performance than PRoot, but don't want to (or can't) lift the user namespace restrictions.

### Sync speedup

[**@pzmarzly**](https://github.com/pzmarzly) opened [brioche#147](https://github.com/brioche-dev/brioche/issues/147), pointing out that syncing `std.toolchain()` for a minimal example build is really slow. I think solving this issue would be really valuable-- not just for first-time users, but also because `brioche-packages` builds start from a blank slate, meaning that this issue compounds _a lot_ over time.

Today, things should be a lot better than when the issue was first opened, but it involved a few moving pieces: first, I added the new `attach_resources` recipe (discussed in [the v0.1.4 announcement](/blog/announcing-brioche-v0-1-4/#new-recipe-attach_resources) and from [brioche#149](https://github.com/brioche-dev/brioche/pull/149)). Then, I updated the `std` package to sync `std.toolchain()` as a tarball using the `attach_resources` recipe ([brioche-packages#147](https://github.com/brioche-dev/brioche-packages/pull/147)). Combined, `std.toolchain()` will now get delivered from the registry as one big tarball instead of thousands of tiny files-- much faster!

I still have more ideas for speeding up syncing in general, so I didn't feel ready to close out [brioche#147](https://github.com/brioche-dev/brioche/issues/147) yet-- expect more updates here for next month!

### aarch64 work

[brioche#150](https://github.com/brioche-dev/brioche/pull/150) introduced support for `aarch64-linux` builds in Brioche! This means you can now build packages targetting Linux on either aarch64 or x86-64 now!

...but, to make that _usable_, packages need to be built to support aarch64 as well. If you check out the [`wip/aarch64-linux`](https://github.com/brioche-dev/brioche-packages/tree/wip/aarch64-linux) branch, running `brioche build -p packages/std -e toolchain` _works_, and will create a toolchain for aarch64. I also verified that at least `curl` also builds with the toolchain changes!

But, the branch is not mergeable in its current state. There's no way for a recipe to choose between doing an x86-64 build or an aarch64 build right now. I've got an idea on how the host / target platform can get threaded down through recipes, but it'll take some work to implement. And, I'd like to hold that off until after doing some refactoring to the code first.

TL;DR: aarch64 works right now if you're willing to build from-source from a branch, but it's going to take some work to get everything playing nicely together.

### Brioche-in-Brioche

As mentioned in the v0.1.4 announcement, [Brioche can now build itself](/blog/announcing-brioche-v0-1-4/#packed-builds-of-brioche)! For releases, this is useful because it leads to a packed build, which is fully portable despite Brioche itself targetting glibc.

(This also led to some changes to the install script, you can read about all the new options in the ["Installation" docs](/docs/installation/))

For development, this is also pretty cool because you can now test your changes locally, and you'll get feedback beyond what you'd get just using `cargo run`! For example, if you update the JS runtime package under `crates/brioche-core/runtime` but _don't_ rebuild it, you'll get an error during the build. We were already explicitly checking for this in our GitHub Actions workflow, but it's nice to have an easy way to run some CI-only checks locally without needing to install new tools. Oh, and you can also use `brioche build -e runtime` to rebuild / update the runtime too, even if you don't have your own NodeJS toolchain set up locally.

### Performance optimizations

I spent some time cleaning up Brioche's Tracing / OpenTelemetry output in [brioche#168](https://github.com/brioche-dev/brioche/pull/168), which makes it much easier to dig into performance issues.

That led me to find some low-hanging fruit for optimization, so I opened [brioche#169](https://github.com/brioche-dev/brioche/pull/169), which can drastically speed up cache hits when preparing to do a build! For a (failing) test build, the time for the build to exit dropped from 15.51 seconds down to 1.12 seconds!

### Progress on package auto-updates and tests

For a while, I've had in mind some ways we could automate simple package updates. Well, [**@jaudiger**](https://github.com/jaudiger) started picking up the work here and updated the `alsa_lib` package in [brioche-packages#211](https://github.com/brioche-dev/brioche-packages/pull/211) as the first step to landing this work!

The end goal will make it so routine package updates won't require any manual code changes: a simple CI pipeline should be able to handle the version bump in the `project.bri` file, then automatically run tests to catch any regressions. There will still be plenty of work for manual review and testing, but getting the routine work handled automatically should help a ton for keeping packages up-to-date.

## Housekeeping

### New packages

Since the last update, there were **13** new packages:

- `cmake` ([#144](https://github.com/brioche-dev/brioche-packages/pull/144))
- `pstack` ([#145](https://github.com/brioche-dev/brioche-packages/pull/145))
- `talloc` ([#150](https://github.com/brioche-dev/brioche-packages/pull/150))
- `libarchive` ([#151](https://github.com/brioche-dev/brioche-packages/pull/151))
- `proot` ([#152](https://github.com/brioche-dev/brioche-packages/pull/152))
- `fx` ([#154](https://github.com/brioche-dev/brioche-packages/pull/154))
- `dasel` ([#155](https://github.com/brioche-dev/brioche-packages/pull/155))
- `scdoc` ([#157](https://github.com/brioche-dev/brioche-packages/pull/157))
- `kmod` ([#158](https://github.com/brioche-dev/brioche-packages/pull/158))
- `s2argv_execs` ([#159](https://github.com/brioche-dev/brioche-packages/pull/159))
- `vdeplug4` ([#160](https://github.com/brioche-dev/brioche-packages/pull/160))
- `linux` ([#161](https://github.com/brioche-dev/brioche-packages/pull/161))
- `just` ([#168](https://github.com/brioche-dev/brioche-packages/pull/168), thanks [**@paricbat**](https://github.com/paricbat)!)

There was also one extra package (`jj`) which was added in [brioche-packages#148](https://github.com/brioche-dev/brioche-packages/pull/148). [**@jaudiger**](https://github.com/jaudiger) pointed out that this was redundant with the existing `jujutsu` package, so `jj` was removed ([brioche-packages#187](https://github.com/brioche-dev/brioche-packages/pull/187)). Oops...

And huge kudos to [**@jaudiger**](https://github.com/jaudiger), who also updated 37 packages over the past week!

### Brioche core updates

- Add `--display` flag to explicitly choose an output format ([#141](https://github.com/brioche-dev/brioche/pull/141))
  - The new `--display plain-reduced` format is now used in the `brioche-packages` repo (see [brioche-packages#143](https://github.com/brioche-dev/brioche-packages/pull/143))
- Add frame to process events after writing description ([#144](https://github.com/brioche-dev/brioche/pull/144))
- Add initial support for `aarch64` ([#150](https://github.com/brioche-dev/brioche/pull/150))
- Fix OpenTelemetry runtime and shutdown ([#142](https://github.com/brioche-dev/brioche/pull/142))
- Add `project.bri` to build Brioche with Brioche ([#157](https://github.com/brioche-dev/brioche/pull/157))
- Update Linux sandbox to fallback to using PRoot for mounts ([#159](https://github.com/brioche-dev/brioche/pull/159))
- Clean up tracing output ([#168](https://github.com/brioche-dev/brioche/pull/168))
- Speed up outputs and fetching blobs ([#169](https://github.com/brioche-dev/brioche/pull/169))
- Disable self-update commands in packed Brioche builds ([#161](https://github.com/brioche-dev/brioche/pull/161))
- Update installation script in README ([#163](https://github.com/brioche-dev/brioche/pull/163))
- Update Cargo workspace and resolve a few lints on Darwin ([#164](https://github.com/brioche-dev/brioche/pull/164))
- Update Rust version to 1.84 in Cargo.toml files ([#167](https://github.com/brioche-dev/brioche/pull/167))
- Update tokio-utils features ([#170](https://github.com/brioche-dev/brioche/pull/170))

### setup-brioche action updates

- Add AppArmor profile to fix Brioche builds on Ubuntu 24.04 ([#2](https://github.com/brioche-dev/setup-brioche/pull/2))
  - Can also control this behavior explicitly with the new `install-apparmor` input value

### Project update

I've been pretty loose with the structure of the project updates. I decided to try breaking it up into the "status report" with a little more in-depth discusion, and "housekeeping" with bulleted notes, mainly summarizing stuff from GitHub PRs.
