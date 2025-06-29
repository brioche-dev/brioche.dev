---
title: Brioche Project Update - June 2025
pubDate: 2025-06-28T23:39:51-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

In a surprising twist, this month has been all about getting aarch64 support in place!

## Status report

### aarch64-linux support

Last month, [I wrote about my thoughts on getting aarch64 support in place](https://brioche.dev/blog/project-update-2025-05/#work-on-cross-platform-support). Actually, it was shortly after publishing that Project Update that I started re-thinking things a bit...

**The end goal for cross-platform support is still the same as from the May Project Update**. But I also know it might take a long time to implement everything needed for that! Meanwhile, the more packages we get that are only being built for x86-64 today, the more work it'll be to add support for aarch64 in the future. So I decided to do a very simple version of cross-platform support now. After all, the end-goal for cross-platform support will require a breaking change (probably), so now's the right time to get an implementation in place as an MVP.

The "cross-platform MVP" is very simple: there's a new `std.CURRENT_PLATFORM` const. It has the value `"x86_64-linux"` if you're running on x86-64 Linux, or the value `"aarch64-linux"` if you're running on aarch64 Linux. Pretty straightforward.

Most packages shouldn't need to use `std.CURRENT_PLATFORM` at all. `std.toolchain` and all the compilers / interpreters / etc. were updated to support both platforms, and everything cascades from there and "just works" (usually)!

The most exciting part though? (🥁 drumroll 🥁)

<div class="my-12">
<strong class="text-3xl block p-4 my-6 text-center border-4 rounded-lg border-gray-300 shadow-xl dark:border-gray-500 dark:shadow-black/80 ">All published packages have now been built for aarch64!<small class="text-sm align-super">*</small></strong>

<small class="text-sm text-gray-400">\*with the exception of the package <code>bugstalker</code>. [BugStalker](https://github.com/godzie44/BugStalker) doesn't support aarch64 (yet), but it markets itself as a "modern debugger for Linux x86-64", so fair enough!</small>

</div>

aarch64 support hasn't been included in a release yet, but if you install Brioche [from source](https://github.com/brioche-dev/brioche) on an aarch64-based Linux machine, all packages can be installed and used from the registry!

The GitHub Actions workflow in [`brioche-packages`](https://github.com/brioche-dev/brioche-packages) now runs builds for both platforms. x86-64 and aarch64 are treated as equals, so all packages will need to build successfully for both platforms before packages are published (or with a magic comment to skip unsupported packages by platform, like for `bugstalker`).

### TSDoc for package documentation

In [brioche-packages#671](https://github.com/brioche-dev/brioche-packages/pull/671) and [brioche-packages#675](https://github.com/brioche-dev/brioche-packages/pull/675), [**@jaudiger**](https://github.com/jaudiger) went through and updated all the doc comments across all packages to use [TSDoc](https://tsdoc.org/) by convention.

The existing docs were basically Markdown. TSDoc has a ton of support in the TypeScript ecosystem, and it should play much nicer with existing TypeScript tooling. It also unlocks some options down the line, e.g. easily generating static doc pages for published packages.

### Faster git cloning

[brioche-packages#703](https://github.com/brioche-dev/brioche-packages/pull/703) by [**@jaudiger**](https://github.com/jaudiger) uses the new `git clone --revision` option from git v2.49.0 when cloning a specific commit from a repo. GitLab's coverage of git v2.49.0 [has a good explainer about the new option](https://about.gitlab.com/blog/whats-new-in-git-2-49-0/#thin-clone-using---revision). Not only does this simplify git clones, but it's faster too! (Check the PR for some benchmark numbers)

### More live-update updates

[**@jaudiger**](https://github.com/jaudiger) opened quite a few PRs to clean up, fix, and improve live updates in the past month. The biggest improvement came in [brioche-packages#717](https://github.com/brioche-dev/brioche-packages/pull/717), which added a new `std.liveUpdateFromNpmPackages` to easily live-update packages based on the version from the NPM registry!

## Housekeeping

### New packages

Since the last update, there are **30** new packages:

- `asdf`
- `blake3`
- `boost`
- `cargo_chef`
- `cyrus_sasl`
- `dependabot`
- `editline`
- `gengetopt`
- `gmp`
- `gperf`
- `iamlive`
- `inframap`
- `krb5`
- `libevent`
- `libfaketime`
- `libyaml`
- `libzip`
- `lzo`
- `lzop`
- `markdownlint_cli2`
- `ncurses`
- `nlohmann_json`
- `patch`
- `readline`
- `renovate`
- `sqlx_cli`
- `toml11`
- `util_macros`
- `wabt`
- `yaml_language_server`

### Brioche core updates

- Update OpenTelemetry crates ([#257](https://github.com/brioche-dev/brioche/pull/257) by [**@jaudiger**](https://github.com/jaudiger))
- Fix another "file exists" bug when fetching projects from cache ([#259](https://github.com/brioche-dev/brioche/pull/259))
- Add JS op to get current platform ([#260](https://github.com/brioche-dev/brioche/pull/260))
- Resolve some Clippy pedantic lints ([#263](https://github.com/brioche-dev/brioche/pull/263) by [**@jaudiger**](https://github.com/jaudiger))
- Upgrade all the transient dependencies ([#265](https://github.com/brioche-dev/brioche/pull/265) by [**@jaudiger**](https://github.com/jaudiger))
- Update to Rust v1.88 ([#267](https://github.com/brioche-dev/brioche/pull/267))
