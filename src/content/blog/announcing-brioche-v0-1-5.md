---
title: Announcing Brioche v0.1.5
pubDate: 2025-04-19T23:20:05-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

[Brioche](https://brioche.dev/) is a new package manager and build tool that makes it easy to mix and match languages and tools for your own development projects. Check [the installation docs](/docs/installation/) to get started or run `brioche self-update` to update Brioche!

Since the [release of v0.1.4](/blog/announcing-brioche-v0-1-4), we've gathered a number of new features and quality of life improvements! Check the [release notes](https://github.com/brioche-dev/brioche/releases/tag/v0.1.5) for all the changes for this release, and thanks to [**@jaudiger**](https://github.com/jaudiger), [**@paricbat**](https://github.com/paricbat), and [**@asheliahut**](https://github.com/asheliahut) for PR contributions for this release!

Before diving into the features, 2 quick PSAs:

- **Support for earlier versions of Brioche will phase out soon**, so upgrading is strongly recommended. TL;DR: the registry will no longer support Brioche <=v0.1.4 as of 2025-04-30. [See below for more details](#psa-sunsetting-support-for-older-versions-of-brioche).
- **Self-hosted registries behave very differently now**. If you're using a self-hosted registry, you'll need to update your configration and migrate your data after upgrading. [See below for more details](#psa-self-hosted-registry-changes).

## New cache

The biggest quality-of-life improvement day-to-day is the new cache system. Fetching large artifacts should now be much faster, and it's much easier to set up a self-hosted or private cache!

Since the initial release, Brioche has used a fairly naive means for storing and loading cached values: each individual file would be stored and fetched independently (although they were at least compressed and deduplicated by hash). That meant that fetching large directories with lots of small files would be painfully slow.

Now, artifacts are stored in the cache as a custom archive format. Plus, to reduce costs, archives are deduplicated using a [content-defined chunking](https://joshleeb.com/posts/content-defined-chunking.html) algorithm to avoid storing data redundantly.

But the best part? There are multiple supported backends for caching, so **setting up a custom cache is very easy!** Any S3-compatible storage provider should work with the custom cache, and it only takes a single env var to opt-in to the custom cache, which is much easier to use for CI/CD workflows. [Check the docs for more details on caching](/docs/core-concepts/cache).

## Debug shell for failed build

Today, we have the `brioche jobs logs` subcommand to show all the output from a failed build. It's an indespenable tool for diagnosing build errors, especially when working on new packages. It's very useful! But sometimes though, I just wish I could _reach into_ a build and poke around with it-- explore files, re-run commands with different parameters, etc.

The new `brioche jobs debug-shell` command lets you do just that. When a build fails, you can run `brioche jobs debug-shell ${path_to_events_file}`, and you'll get dropped right into an interactive shell, right from where the build failed! It'll run with the exact same sandbox semantics as the build did too.

Here's a quick recording to demo what this is like in practice:

<script src="https://asciinema.org/a/d7DsWq9zVEC0LtjhsY2Ciyu39.js" id="asciicast-d7DsWq9zVEC0LtjhsY2Ciyu39" async="true"></script>

## Support projects with cyclic imports

This one was originally motivated by a long-standing draft PR in the `brioche-packages` repo: [#228](https://github.com/brioche-dev/brioche-packages/pull/228). Basically, this PR was blocked because there was a cyclic dependency between two projects: we wanted the `curl` package to use the `libpsl` package, but a helper function from `libpsl` dependends on `curl` (transitively).

In Brioche's JavaScript runtime (Deno Core / V8), this works without any hiccups. But for Brioche itself, I needed to make some adjustments to how projects were represented internally. It turned out to be a lot of work, but it works seamlessly now!

## New `unsandboxed` sandbox backend

There might be times where the `linux_namespace` sandbox backend can't be used for builds or might be limited due to security policies.

So, I implemented the `unsandboxed` sandbox backend. As the name implies, it _disables_ sandboxing. Generally, this isn't what you want, so **this should only be used if you have no other options or if you know what you're doing!** [Check the docs](/docs/configuration#unsandboxed) for caveats and details on enabling this backend.

The coolest part though is that this sandbox only relies on Rust `std`, so it should work on _any_ platform! This isn't very useful in general, but I think this will come in handy when standing up Brioche on new platforms.

## Coming soon to `std`

Brioche itself includes several new features that will be used by the `std` package. These will be published sometime after release, and you'll need to update to the latest version of the `std` package to use them-- keep an eye on the [`std` changelog](https://github.com/brioche-dev/brioche-packages/blob/main/packages/std/CHANGELOG.md) for when they land!

### Support for unarchiving `.zip` files

[**@paricbat**](https://github.com/paricbat) implemented support for unarchiving zip files, so they can now be treated as first-class citizens just like `.tar` files!

```typescript
Brioche.download(
  "https://github.com/brioche-dev/brioche/archive/refs/tags/v0.1.4.zip",
).unarchive("zip");
```

### `process.currentDir` to change a process's starting directory

By default, processes start in an empty directory called `work`. You can pre-populate this directory using the `.workDir()` method, but this just writes files into this `work` directory.

Sometimes, it's useful to start in a different directory directly. Most commonly, it can be useful to start in `$BRIOCHE_OUTPUT`, which can be used to create or modify an artifact through a shell script.

Previously, you'd need to start your shell script with `cd "$BRIOCHE_OUTPUT"`, but soon you'll be able to use `.currentDir()` to set the starting directory:

```typescript
// Apply a sed script to each `.pc` file within `${recipe}/lib/pkgconfig`
recipe = std.runBash`
  sed -i 's|=/|=\${pcfiledir}/../../|' lib/pkgconfig/*.pc
`
  .outputScaffold(recipe)
  .currentDir(std.outputPath);
```

### `Brioche.gitCheckout` to checkout a repo directly

Today, if you want to check out a git repo without specifying a commit hash directly, the easiest way is by combining the [`Brioche.gitRef` static](/docs/core-concepts/statics/#briochegitref) with `git.gitCheckout`, like this:

```typescript
import * as std from "std";
import { gitCheckout } from "git";

const source = gitCheckout(
  Brioche.gitRef({
    repository: "https://github.com/brioche-dev/brioche.git",
    ref: "main",
  }),
);
```

`Brioche.gitCheckout` is a new static, which combines both functions together:

```typescript
import * as std from "std";
import "git";

const source = Brioche.gitCheckout({
  repository: "https://github.com/brioche-dev/brioche.git",
  ref: "main",
});
```

## PSA: Sunsetting support for older versions of Brioche

Projects with [cyclic imports](#support-projects-with-cyclic-imports) are represented very differently from projects _without_ cyclic imports. As such, projects with cyclic imports won't work on earlier versions of Brioche.

On top of that, the [new cache](#new-cache) stores data independently from how the registry cached data previously. As of the Brioche v0.1.5 release, I'm paying costs for both the "legacy" storage as well as the new cache storage.

For both of these reasons, I'm planning on sunsetting support for prior versions of Brioche. **On 2025-04-30 (or later), registry requests will fail for Brioche <=v0.1.4**. The registry will no longer serve the endpoints used by prior versions of Brioche.

Existing data from the registry has already been migrated to the new cache, so this should be seamless when upgrading to Brioche v0.1.5 when using the official registry/cache. But I wanted to give a grace period before sunsetting prior versions.

**If you have questions/comments/concerns about this timeline, please reach out via Discord, Zulip, or GitHub!**

## PSA: Self-hosted registry changes

With the [new cache](#new-cache), project files are now stored and retrieved via the cache instead of via the registry. However, the registry is still used to associate project names with the artifact hash stored in the cache.

If you're using Brioche <=v0.1.4 with a self-hosted registry, this means a few things:

1. You'll need to update your config to use a custom cache along with a self-hosted registry, in order to store project files.
2. Since recipes/bakes/artifacts are no longer stored in the registry, you'll need to either start from a clean slate or migrate to the cache.

If you're using a self-hosted registry today and need help migrating to Brioche v0.1.5, please reach out via Discord, Zulip, or GitHub. This release includes some internal commands / options that can help with the migration, but these will likely be removed before the next release!
