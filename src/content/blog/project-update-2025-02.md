---
title: Brioche Project Update - February 2025
pubDate: 2025-02-26T00:41:51-08:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

Some highlights this month have been a major overhaul to build caching and more progress towards automatic updates!

## Status report

### Major overhaul (and speedup) for cached builds

Last month, I [talked about progress on speeding up synced builds](/blog/project-update-2025-01#sync-speedup), which I still felt was a big win, but it involved some manual work at the packaging level. I wanted to come up with a way to improve syncing across the board _without_ any extra manual work... which led to [#179](https://github.com/brioche-dev/brioche/pull/179).

The problem is that even moderately complicated directory structures would take a _long_ time to fetch from the registry-- each file _and_ each subdirectory required a separate request. Things were downloaded in parallel to make this somewhat tolerable, but the sheer number of requests made fetching from the registry pretty slow.

Now, the new cache stores each artifact as a custom archive format. For small artifacts, that's basically it: fetch the entire archive, unpack it, and you're done. But, once the total data in the archive crosses some threshold (2 MB currently), we break the archive up into chunks using a [content-defined chunking](https://joshleeb.com/posts/content-defined-chunking.html) algorithm. Doing so means that two similar artifacts can share some underlying data, reducing the total amount of data stored in the the cache. Actually, the new cache uses _less_ storage space than the data used by the registry for the same set of artifacts!

That said, the registry isn't going away either-- it's still used for mapping project names to project hashes. That is, when you run `brioche run -r hello_world`, the registry is used to determine which files to fetch from the cache for the name `hello_world`. But, if you were running a custom registry, you'll either want to migrate to a cache _in parallel_, or move entirely to using the new cache system.

Anyway, I plan on writing more in-depth on how the new cache works and especially the details of the custom archive format soon

### Cache migration

Oh, and to follow up on the cache, I migrated all existing artifacts/bakes/projects from the existing registry to the new cache, which is already configured to be used by default when building Brioche from `main` today. The new code will also ensure all `brioche-packages` builds will be uploaded both to the legacy registry and to the new cache in parallel.

For the next release, migrating over to the new cache should be completely seamless

### Support for unarchiving zip files

In [#176](https://github.com/brioche-dev/brioche/pull/176), [**@paricbat**](https://github.com/paricbat) updated Brioche's `unarchive` recipes to support unarchiving zip files! These work just like tar files, except the option to additionally decompress the file first isn't supported (since zip files natively handle compression internally).

The changes on the `std` side will be published following the next Brioche release, so the following will work:

```typescript
const source = Brioche.download(
  "https://github.com/brioche-dev/brioche/archive/refs/tags/v0.1.4.zip",
).unarchive("zip");
```

### LSP fixes and tweaks

While working on the new cache, I ended up [causing a regression](https://github.com/brioche-dev/brioche/issues/186) in the LSP code...

That was enough motivation to sit down and finally write some integration tests for the LSP server. Along the way, I found and fixed some _other_ LSP bugs while fixing the regression, which all landed in [#188](https://github.com/brioche-dev/brioche/pull/188). There were quite a few fixes, so check the PR for details.

I also made a minor tweak to the LSP: the LSP server will no longer remove unused dependencies from the lockfile on save. The main motivation is that I felt the current behavior could be surprising if you commented then uncommented part of a file. You can read more about the change in [#192](https://github.com/brioche-dev/brioche/pull/192).

### `brioche fmt` fix

[**@asheliahut**](https://github.com/asheliahut) opened [#190](https://github.com/brioche-dev/brioche/pull/190) to fix a bug with `brioche fmt`. If you didn't _explicitly_ specify a project path with `-p`, the command would just exit without doing anything! The PR fixed this, defaulting to the current directory if no project path is provided.

### More work on auto-updates and tests

Since [last month](/blog/project-update-2025-01#progress-on-package-auto-updates-and-tests), [**@jaudiger**](https://github.com/jaudiger) has started adding a ton more `test` and `autoUpdate` scripts to tons of packages. Some of the newly-added packages have these functions too, so as we make progress on [#94](https://github.com/brioche-dev/brioche/issues/94) and [#165](https://github.com/brioche-dev/brioche/issues/165), a lot of packages should be ready to go on day one for automated tests and auto-updates!

### Recursive import troubles

While working on [adding libpsl support to curl](https://github.com/brioche-dev/brioche-packages/pull/228), [**@jaudiger**](https://github.com/jaudiger) hit a case where two packages would need to `import` each other, which straight-up doesn't work today.

After a lot of trial and error, we came to the conclusion that there wouldn't be a satisfying way to work around this problem. So, I opened [#175](https://github.com/brioche-dev/brioche/issues/175) to track work on adding circular project dependencies. I haven't gotten very far with the implementation yet, but it's my highest priority currently, and I'm hoping to get a PR up in short order.

## Housekeeping

### New packages

Since the last update, there were **9** new packages:

- `seaweedfs` ([#213](https://github.com/brioche-dev/brioche-packages/pull/213))
- `libffi` ([#215](https://github.com/brioche-dev/brioche-packages/pull/215))
- `aws_cli` ([#217](https://github.com/brioche-dev/brioche-packages/pull/217))
- `libpsl` ([#224](https://github.com/brioche-dev/brioche-packages/pull/224), thanks [**@jaudiger**](https://github.com/jaudiger)!)
- `github_cli` ([#225](https://github.com/brioche-dev/brioche-packages/pull/225), thanks [**@asheliahut**](https://github.com/asheliahut)!)
- `nasm` ([#229](https://github.com/brioche-dev/brioche-packages/pull/229), thanks [**@paricbat**](https://github.com/paricbat)!)
- `steampipe` ([#234](https://github.com/brioche-dev/brioche-packages/pull/234), thanks [**@asheliahut**](https://github.com/asheliahut)!)
- `restic` ([#240](https://github.com/brioche-dev/brioche-packages/pull/240))
- `claude_code` ([#243](https://github.com/brioche-dev/brioche-packages/pull/243), thanks [**@asheliahut**](https://github.com/asheliahut)!)

### Brioche core updates

- Use `$BRIOCHE_DATA_DIR` env var to override main Brioche path used for storing data ([#171](https://github.com/brioche-dev/brioche/pull/171))
- Add support for unarchiving zip files ([#176](https://github.com/brioche-dev/brioche/pull/176) by [**@paricbat**](https://github.com/paricbat))
- New cache ([#179](https://github.com/brioche-dev/brioche/pull/179))
  - Enable conditional PUTs for S3 object store ([#181](https://github.com/brioche-dev/brioche/pull/181))
  - Add config option to allow for HTTP-only cache requests ([#182](https://github.com/brioche-dev/brioche/pull/182))
  - Tweak how cache fetch jobs are displayed in plain output format ([#183](https://github.com/brioche-dev/brioche/pull/183))
- Enable some more Clippy lints ([#185](https://github.com/brioche-dev/brioche/pull/185))
- Fix miscellaneous bugs in LSP ([#188](https://github.com/brioche-dev/brioche/pull/188))
- Default `brioche fmt` to `.` ([#190](https://github.com/brioche-dev/brioche/pull/190) by [**@asheliahut**](https://github.com/asheliahut))
- Tweak LSP to keep unused dependencies when saving ([#192](https://github.com/brioche-dev/brioche/pull/192))
