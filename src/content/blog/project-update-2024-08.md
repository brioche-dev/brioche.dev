---
title: Brioche Project Update - August 2024
pubDate: 2024-08-01T20:50:42-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

So, it's been about two months since the [initial public release of Brioche](/blog/announcing-brioche), so I thought it was about time to share what's been going on with the project! I quite like the newsletter-style updates that [Rust](https://this-week-in-rust.org/) and [Dolphin](https://dolphin-emu.org/blog/tags/progress%20report/) put out regularly, so I think I'll start doing something similar for Brioche (expect ~monthly updates)

## Brioche releases

[Brioche v0.1.1](https://github.com/brioche-dev/brioche/blob/d09edd5102d243d04fe12cb79e2f832c42bd7584/CHANGELOG.md#v011---2024-06-09) was released in early June, which helped smooth out some of the kinks from v0.1.0. The [changelog](https://github.com/brioche-dev/brioche/blob/d09edd5102d243d04fe12cb79e2f832c42bd7584/CHANGELOG.md#v011---2024-06-09) includes all the details, but to give a few highlights:

- Speed up registry syncing drastically and tweak registry timeouts
- Update the JS runtime to report the current version of Brioche. This will allow `std` to detect the version before using a new recipe type (either returning an error or using a fallback implementation)
- Add a new `collect_references` recipe type for use in the `std` package

I even included a subcommand to update Brioche itself, but uhhh... [it's broken](https://github.com/brioche-dev/brioche/issues/95), so for now, you'll need to follow the [installation instructions](https://brioche.dev/docs/installation/) again to upgrade. Also unfortunately, I didn't catch this issue before v0.1.1 was released, so it's _still_ broken and the _next_ release will also require a manual upgrade... oops

## Package updates

During the initial release, there were only 10 packages available: `ca_certificates`, `curl`, `jq`, `miniserve`, `nodejs`, `rust`, plus the `std` package and a few miscellaneous ones (`hello_world`, `typer`, `smol_toml`)

Now, there are 38, almost 4x as many as during the original launch! Here's what's available now:

- `alsa_lib`
- `bat`
- `broot`
- `carapace`
- `dust`
- `eza`
- `git`
- `gitui`
- `go`
- `joshuto`
- `jujutsu`
- `jwt_cli`
- `k9s`
- `lurk`
- `oha`
- `oniguruma`
- `openssl` (split out from `std`)
- `opentofu`
- `pcre2`
- `pv`
- `ripgrep`
- `ruff`
- `tcsh`
- `tokei`
- `xplr`
- `xsv`
- `zoxide`

Massive kudos for these packages go to [**@jaudiger**](https://github.com/jaudiger) and [**@asheliahut**](https://github.com/asheliahut), who opened 31 and 7 Pull Requests, respectively!

There were also several breaking changes made to Rust, NodeJS, and Go, to make building packages more consistent. See the PRs [brioche-packages#65](https://github.com/brioche-dev/brioche-packages/pull/65) and [brioche-packages#67](https://github.com/brioche-dev/brioche-packages/pull/67) for an overview of the changes.

## std updates

The `std` package has also seen quite a few changes. Note that it's still pretty volatile, so keep an eye on the [changelog](https://github.com/brioche-dev/brioche-packages/blob/0bb7a9871953eac009744407e76e956daf8a5c92/packages/std/CHANGELOG.md) to see how it evolves.

Since the initial release, there have been quite a few changes! Here's the [full list of changes since the initial release](https://github.com/brioche-dev/brioche-packages/blob/0bb7a9871953eac009744407e76e956daf8a5c92/packages/std/CHANGELOG.md#2024-07-12-breaking), but here are the highlights:

- Remove Python and OpenSSL from `std.toolchain()`. OpenSSL was added as its own package (`openssl`), and Python will join it soon!
- Overhaul recipe casting. See [brioche-packages#25](https://github.com/brioche-dev/brioche-packages/pull/25) for more context
- Replace the `std.auotwrap()` function with `std.autopack()`. Migrating to the new function should be fairly straightforward, and the new function provides a lot more options
- Add `std.BRIOCHE_VERSION` to check which version of Brioche is being used. This will mainly be used by `std` itself for feature detection
- Optimize container sizes made with `std.ociContainerImage()`. When using Brioche >=0.1.1, container images can now be much smaller!

## Brioche core updates

I was hoping to have a v0.1.2 release ready to go before publishing the first project update, but alas, it's not ready to go quite yet...

...but that also means there are a few goodies in the `main` branch that you can look forward to for the next release!

**Updates to several subcommands (`fmt`, `check`, `publish`, `install`) so they can take more than one package at a time.** When working with multiple Brioche projects (say, if you're [contributing a new package](https://github.com/brioche-dev/brioche-packages?tab=readme-ov-file#contributing-new-packages)), you can now save time by passing the `-p` or `-r` flag more than once! Once again, huge thanks to [**@jaudiger**](https://github.com/jaudiger) for contributing these changes!

**Add support for "locked downloads" with `Brioche.download` expressions.** Normally when downloading something with Brioche, you need to provide the download hash explicitly in code. This has long led to an awkward dance where you need to get the URL, download it yourself first, get the hash, then paste it in the code. Well, as long as the URL is static in your source code, you'll no longer need to do this! Just change from this:

```ts
// Old way, need to specify the hash manually
const source = std
  .download({
    url: "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-1.7.1.tar.gz",
    hash: std.sha256Hash(
      "478c9ca129fd2e3443fe27314b455e211e0d8c60bc8ff7df703873deeee580c2",
    ),
  })
  .unarchive("tar", "gzip")
  .peel();
```

...to this:

```ts
// New way, hash gets saved to the lockfile
const source = Brioche.download(
  "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-1.7.1.tar.gz",
)
  .unarchive("tar", "gzip")
  .peel();
```

...and the URL will automatically be downloaded and recorded in the lockfile! Note that this will require an update to the `std` package too, which is [still in draft](https://github.com/brioche-dev/brioche-packages/pull/75).

## Registry updates

Right after release, [**@matklad**](https://github.com/matklad) opened a [Zulip discussion](https://brioche.zulipchat.com/#narrow/stream/440653-general/topic/Why.20so.20slow.3F/near/442736995) to ask why installing `hello_world` took so long (and then also contributed [brioche#54](https://github.com/brioche-dev/brioche/pull/54) to help stop the bleeding).

After a lot of back-and-forth with testing, I got some general fixes in place that went out with Brioche v0.1.1, but it still wasn't a great experience. After a lot of investigation, [**@asheliahut**](https://github.com/asheliahut) and I ended up doing a major change to [the registry](https://github.com/brioche-dev/brioche-registry).

To cut a long story short, the registry runs on ephemeral [Fly.io](https://fly.io/) machines, and I originally used [LiteFS](https://fly.io/docs/litefs/) for the database (basically, SQLite with replication). LiteFS ended up causing a lot of latency and reliability issues, so we ended up migrating to a Postgres database hosted by [Neon](https://neon.tech/) (which, so far, has been an _amazing_ database host!)

Now, the registry should respond much faster, even when a Fly.io machine has to do a cold start!

## Coming soon

To close this out, I wanted to share a shortlist of things currently in progress and things I'd like to make progress on in the near future! But... consider this more of a "wishlist" than a "roadmap"

- [**@jaudiger**](https://github.com/jaudiger) opened [brioche#105](https://github.com/brioche-dev/brioche/pull/105) to upgrade Deno Core to the latest version. There's still quite a bit of work left to get this working and mergeable, but I'm hoping this will make it in soon!
- Add a new `std.glob()` function, which will take a recipe and keep only the files matching a glob pattern
- More cleanup to `std.toolchain()`, especially around autotools (you need to do [some hacky stuff](https://github.com/brioche-dev/brioche-packages/blob/0bb7a9871953eac009744407e76e956daf8a5c92/packages/jq/project.bri#L33-L34) to use autotools currently)
- [**@asheliahut**](https://github.com/asheliahut) made some progress on [CMake](https://github.com/brioche-dev/brioche-packages/tree/add-cmake) ([permalink](https://github.com/brioche-dev/brioche-packages/commit/598d90cbfad77d56e5e32f1d0c86f05c496b0302)) and [Python](https://github.com/brioche-dev/brioche-packages/tree/python-build-temp) ([permalink](https://github.com/brioche-dev/brioche-packages/commit/0502ab44e451b93c357b263b3aa625143b3af999)). Both open up lots of new packages that can be added!
- Cross-platform support and cross-compilation are going to be fairly massive tasks, but I'd like to start making some progress towards these. ARM64 Linux will probably be the second supported target, and macOS will be further down the line.
