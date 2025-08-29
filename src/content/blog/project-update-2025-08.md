---
title: Brioche Project Update - August 2025
pubDate: 2025-08-28T20:11:40-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

Not a lot of new headliner features made it in this month, but lots of little incremental improvements have been piling up!

## Status report

### Set up merge queues for CI

Each Friday, we run an automated GitHub Actions workflow for "live updates", where scripts check for new upstream package versions, then create separate PRs for each package. Each PR would trigger a build immediately, and could be merged after being reviewed and after a successful build.

But this setup started causing a "traffic jam", especially since the number of packages has been steadily growing! We only have one CI runner for each of `x86_64` and `aarch64` today, so triggering builds both when these live-update PRs open _and_ when they were merged was slow, and could create a lot of wasteful / unused build results. Not to mention, if there were breakages between 2 new updated packages, we'd only find out when the `main` branch would fail-- which would then block any new packages or updates from going out as well!

We hit a particularly bad case starting August 8th: it took probably 36 hours to work through all the queued build jobs! That weekend, I [updated `brioche-packages` to use merge queues instead](https://github.com/brioche-dev/brioche-packages/pull/1015). This was my first time using GitHub's merge queue feature-- I think it's kinda confusing... but getting this in has been really helpful for improving our CI!

Basically, live-update PRs never trigger builds anymore. Instead, _every_ PR gets "queued" before merging, which is where we do the actual build. If the build passes, only then do we push to `main`, which then publishes the packages to the Brioche Registry. This avoids some "wasted" builds that are never published, prevents `main` from ever being broken due to conflicts between new versions, and gives us tools like limiting concurrent builds, rearranging PRs in the queue, etc. It's not a perfect setup, but it's a big improvement!

### "Lazy builds" for CI

For builds, our CI pipeline basically just runs `brioche build -p ./package/${package_name}` for each package. Build results are cached of course, but this still ends up being pretty wasteful because `brioche build` _always_ makes sure the build result is available-- downloading it from the cache if it doesn't exist locally.

Oh, and even though the new merge queue setup ensures PRs are built before reaching `main`, we still call `brioche build` for each package before publishing (that lets us still push fixes directly to `main` without going through the PR process, but that's a last-resort measure). But that also means each PR will fetch every package from the cache _twice_ before publishing!

This was slowing down builds somewhat and wasting a little money each month for our cache cloud costs. As a quick-and-dirty workaround, I added a new `--experimental-lazy` flag in [`brioche#294`](https://github.com/brioche-dev/brioche/pull/294). When running `brioche build`, this flag first checks if the build result exists in the remote cache, then returns early if it does. We now always use this flag for `brioche-packages` builds, so this saves a ton of time and bandwidth wasted fetching packages unnecessarily from the cache.

My gut feeling right now is that we should make this behavior the default eventually. Actually, the reason I didn't make it the default yet was because I want to do some internal refactoring to make this change more natural first (the current implementation actually checks the cache twice and can only short-circuit the top-level build-- these are both not ideal but are consequences due to how builds are currently handled, and I think reworking some stuff could make "lazy builds" the default, basically).

### `object_store` update for better retry logic

Back in July, [**@nz366**](https://github.com/nz366) opened [`brioche#286`](https://github.com/brioche-dev/brioche/pull/286) to improve the retry logic when encountering network errors when fetching from the cache.

Well, it turns out that the the upstream `object_store` crate had a bug that prevented retrying requests due to connection errors, which was fixed in [this PR](https://github.com/apache/arrow-rs-object-store/pull/445). So once the new version of `object_store` was released, [**@nz366**](https://github.com/nz366) opeend [`brioche#287`](https://github.com/brioche-dev/brioche/pull/287), which just bumped `object_store` to the new version that included the upstream fix.

Sometimes it stings to see a code change thrown away because you tried to fix something _too_ fast... but we got the retry improvements in the end either way!

### Even more live-update improvements

[**@jaudiger**](https://github.com/jaudiger) has continued with lots of improvements to the live-update scripts, which helps us keep as many packages up-to-date with as little friction as possible! A few specific PRs:

- [#974](https://github.com/brioche-dev/brioche-packages/pull/974): Add validation to version matching regex
- [#1098](https://github.com/brioche-dev/brioche-packages/pull/1098): Refactor projects with multiple versions for consistency and ease of updates
- [#1103](https://github.com/brioche-dev/brioche-packages/pull/1103): Update GitHub live-update scripts to support updating multiple simultaneous package versions

## Housekeeping

### New packages

Since the last update, there were **20** new packages:

- `coturn`
- `cspell`
- `dclint`
- `deno`
- `gopls`
- `hugo`
- `hunspell`
- `isl`
- `keep_sorted`
- `libice`
- `libsm`
- `libxau`
- `libxc`
- `libxcrypt`
- `mutagen`
- `nuspell`
- `socat`
- `terragrunt`
- `xorgproto`
- `xtrans`

This month, we had quite a few people to `brioche-packages`! Thanks to [**@jaudiger**](https://github.com/jaudiger), [**@asheliahut**](https://github.com/asheliahut), [**@easrng**](https://github.com/easrng) for PR contributions, and additional thanks to [**@rawkode**](https://github.com/rawkode) and [**@nz366**](https://github.com/nz366) for help in [#366](https://github.com/brioche-dev/brioche-packages/issues/336) towards adding `deno`!

### Brioche core updates

- Bump object store ([#287](https://github.com/brioche-dev/brioche/pull/287) by [**@nz366**](https://github.com/nz366))
- Fix CI build for packed aarch64 artifact using x86-64 ([#292](https://github.com/brioche-dev/brioche/pull/292))
- Use Brioche nightly for building packed aarch64 build ([#293](https://github.com/brioche-dev/brioche/pull/293))
- Add new `--experimental-lazy` CLI option for `brioche build` ([#294](https://github.com/brioche-dev/brioche/pull/294))
- Update Rust version to 1.89 ([#295](https://github.com/brioche-dev/brioche/pull/295) by [**@jaudiger**](https://github.com/jaudiger))
- Update clippy lints ([#297](https://github.com/brioche-dev/brioche/pull/297) by [**@jaudiger**](https://github.com/jaudiger))
- Fix `live-update` removing some TypeScript annotations ([#298](https://github.com/brioche-dev/brioche/pull/298))
- Resolve all the automatic fixable lints from pedantic ([#299](https://github.com/brioche-dev/brioche/pull/299) by [**@jaudiger**](https://github.com/jaudiger))
- Use lazy lock when it's possible ([#300](https://github.com/brioche-dev/brioche/pull/300) by [**@jaudiger**](https://github.com/jaudiger))
- Remove features from tokio-util dependency ([#301](https://github.com/brioche-dev/brioche/pull/301) by [**@jaudiger**](https://github.com/jaudiger))
