---
title: Brioche Project Update - April 2025
pubDate: 2025-04-26T18:48:00-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

The biggest news this month was [the release of Brioche v0.1.5](/blog/announcing-brioche-v0-1-5/)! There were also 2 PSAs to be aware of from that announcement: **registry support for Brioche v0.1.4 and earlier will be ending on 2025-04-30**, and **upgrading to Brioche v0.1.5 affects self-hosted registries pretty drastically**, check the release announcement for more details.

## Status report

### Brioche v0.1.5 features

The [Brioche v0.1.5 announcement](/blog/announcing-brioche-v0-1-5/) includes all the details for the new release, so go check that out for more! Since the last project update, there were a few smaller changes that got merged prior to the release:

- **Support inheriting host CA certificates** ([#232](https://github.com/brioche-dev/brioche/pull/232)). This adds a new special process template value that allows passing in the host's CA certificates into a recipe, but only when `unsafe.networking` is enabled! Once the supporting changes land in `std`, this means the `ca_certificates` package won't be needed for making HTTPS requests in most cases.
- **Implement `currentDir` option when baking process recipes** ([#231](https://github.com/brioche-dev/brioche/pull/231)). This allows for changing which directory a process recipe starts in, rather than needing to use `cd` within a shell script
- **Implement the `unsandboxed` sandbox backend** ([#230](https://github.com/brioche-dev/brioche/pull/230)). This is a very simple backend that can work as a "last resort" when other sandboxing wouldn't work.
- **Update custom cache to work as a layer with default cache** ([#229](https://github.com/brioche-dev/brioche/pull/229)). The new cache was [merged in February](https://brioche.dev/blog/project-update-2025-02/#major-overhaul-and-speedup-for-cached-builds). When it was first merged, setting a custom cache would _replace_ the default cache, which made it hard to use a custom cache in practice! Now it works as a layer on top of the default cache, which I made sure to get in before the v0.1.5 release.
- **Show download sizes in console** ([#227](https://github.com/brioche-dev/brioche/pull/227)). Previously, the console would show the "blob count" when fetching from the cache, the "blob + recipe" count when fetching from the legacy registry, and would just show a percentage for downloads and archives. Now, it will consistently show a message with the current bytes and the total bytes (where possible). I found this to help give some context for large / slow downloads.
- **Fix V8 platform initialization** ([#225](https://github.com/brioche-dev/brioche/pull/225)). I switched to daily driving Linux recently (from Windows + WSL) and ran into a weird crash in V8 when running Brioche tests. I dug in and found that it had to do with how the V8 platform got set up depending on your CPU flags. Fixing it was kinda dirty, but running test works for me again!
- **Merge various security fixes** (various Dependabot PRs). There were several outstanding Dependabot alerts in Brioche, which have all been resolved. Most were in the `runtime` NPM project which has no security impact on Brioche due to the nature of how restricted our runtime is (I believe). But there was one fix that was relevant: an update to the `zip` dependency to resolve [CVE-2025-29787](https://github.com/advisories/GHSA-94vh-gphv-8pm8). Support for unarchiving zip files was merged [last month](/blog/project-update-2025-02/#support-for-unarchiving-zip-files), but this feature only landed in v0.1.5, so there were no vulnerable versions of Brioche released!

### Dropping support for earlier versions of Brioche

As mentioned in the v0.1.5 announcement, [I'll be removing APIs used by older versions of Brioche from the registry after 2025-04-30](/blog/announcing-brioche-v0-1-5/#psa-sunsetting-support-for-older-versions-of-brioche), effectively ending support for Brioche versions <=v0.1.4.

Some packages in the `brioche-packages` repo have already started adopting cyclic dependencies, which already can't be fetched from the registry for prior versions. We've also started adding some features to `std` that depend on v0.1.5 features, so earlier versions of Brioche are already starting to lose out on the latest changes.

### Package live updates

I merged [#234](https://github.com/brioche-dev/brioche/pull/234) recently, which added the new `brioche live-update` subcommand. This new command allows us to define a special export per package, which allows packages to update themselves based on the latest upstream version. Thanks to the work of [**@jaudiger**](https://github.com/jaudiger), 71 out of 90 packages already support live-updates, which will massively help with keeping packages up to date!

The name was based on Homebrew's [`livecheck`](https://docs.brew.sh/Brew-Livecheck) subcommand. Originally, I was going to call it `auto-update` and so we've been using the name `autoUpdate` as the export, but I'm happier with the term "live update". The next step will be to rename all of the `autoUpdate` exports to `liveUpdate`.

I've also gotten a first-pass GitHub Action set up to create PRs from the live updates, many of which [have started getting merged in `brioche-packages`](https://github.com/brioche-dev/brioche-packages/pulls?q=is%3Apr+label%3A%22live+update%22+created%3A%3C%3D2025-04-26)!

### `brioche.dev` updates

The source for <https://brioche.dev> is itself [in a public repo](https://github.com/brioche-dev/brioche.dev), which includes automatic updates through Dependabot. Last week, I saw an exciting update come in that added support for using Tailwind v4 with Starlight!

...that update required _a lot_ of fixes to get the site looking right again. But, I spent a lot of time fixing stuff, and merged the update. One really nice outcome is that the blog posts now use the same Markdown stylings as the doc pages, including header links. Nice!

## Housekeeping

### New packages

Since the last update, there were **4** new packages:

- `kubent` ([#308](https://github.com/brioche-dev/brioche-packages/pull/308) by [**@jaudiger**](https://github.com/jaudiger))
- `popeye` ([#300](https://github.com/brioche-dev/brioche-packages/pull/300) by [**@jaudiger**](https://github.com/jaudiger))
- `rclone` ([#322](https://github.com/brioche-dev/brioche-packages/pull/322))
- `strace` ([#272](https://github.com/brioche-dev/brioche-packages/pull/272))

### Brioche core updates

- Fix Deno Core / V8 platform initialization ([#225](https://github.com/brioche-dev/brioche/pull/225))
- Upgrade dependencies in `runtime` NPM project ([#226](https://github.com/brioche-dev/brioche/pull/226))
- Update console output to show download / archive sizes ([#227](https://github.com/brioche-dev/brioche/pull/227))
- Update Rust to v1.86 ([#228](https://github.com/brioche-dev/brioche/pull/228) by [**@jaudiger**](https://github.com/jaudiger))
- Update custom cache to work as a layer with default cache ([#229](https://github.com/brioche-dev/brioche/pull/229))
- Implement the `unsandboxed` sandbox backend ([#230](https://github.com/brioche-dev/brioche/pull/230))
- Implement `currentDir` option when baking process recipes ([#231](https://github.com/brioche-dev/brioche/pull/231))
- Support inheriting host CA certificates ([#232](https://github.com/brioche-dev/brioche/pull/232))
- Add `brioche live-update` command to live-update/auto-update projects ([#234](https://github.com/brioche-dev/brioche/pull/234))

### std updates

- Add support for `zip` archive format ([#335](https://github.com/brioche-dev/brioche-packages/pull/335) by [**@asheliahut**](https://github.com/asheliahut))
