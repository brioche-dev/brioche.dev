---
title: Brioche Project Update - May 2025
pubDate: 2025-05-30T01:21:36-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

This month has been a lot of work on ergonomics, future planning, and _a lot_ of new packages!

## Status report

### Simplify recipes in `std`

[`brioche-packages#425`](https://github.com/brioche-dev/brioche-packages/pull/425) updated `std` to let you pass a function in most places that expected a recipe, rather than needing to call it first (e.g. passing `openssl` instead of `openssl()`):

```typescript
import * as std from "std";
import meson from "meson";
import ninja from "ninja";
import cmake from "cmake";
import openssl from "openssl";

export default function (): std.Recipe<std.Directory> {
  // Previous:
  // return std.runBash`...`
  //   .dependencies(std.toolchain(), meson(), ninja(), cmake(), openssl())
  //   .workDir(source)
  //   .toDirectory();

  // New:
  return std.runBash`...`
    .dependencies(std.toolchain, meson, ninja, cmake, openssl)
    .workDir(source)
    .toDirectory();
}
```

I think this makes Brioche projects look simpler at first glance, and hopefully should be more intuitive too!

This was enabled by replacing the previous `std.AsyncRecipe` type (which could be either `Recipe` or `Promise<Recipe>`) with the new `std.RecipeLike` type (which can be `Recipe` or `Promise<Recipe>` like before, but also `() => Recipe` or `() => Promise<Recipe>`).

See [the updated docs for more details on `RecipeLike`](https://brioche.dev/docs/core-concepts/recipes/#stdrecipelike-and-stdrecipe)!

### `pipe` utilities in `std`

[`brioche-packages#424`](https://github.com/brioche-dev/brioche-packages/pull/424) added a new `.pipe()` method to recipes, letting you combine together several utilities a little more ergonomically:

```typescript
export default function () {
  // Previous:
  // let recipe = std.runBash`...`
  //   .workDir()
  //   .toDirectory();
  // recipe = std.setEnv(recipe, {
  //   /* env vars */
  // });
  // recipe = std.withRunnableLink(recipe, "bin/path");
  // return recipe;

  // New:
  return std.runBash`...`
    .workDir()
    .toDirectory()
    .pipe((recipe) =>
      std.setEnv(recipe, {
        /* env vars */
      }),
    )
    .pipe((recipe) => std.withRunnableLink(recipe, "bin/path"));
}
```

I found this to be especially helpful when using standalone utility methods like `std.withRunnableLink`, etc. Before, you'd have to shuffle between `return ...` to `const recipe = ...; return ...` to `let recipe = ...; return ...`, which could get kinda annoying!

We've adopted this style across the `brioche-packages` repo. But for your own projects, the old way still works if `.pipe` feels a little too functional for your tastes!

Oh, and there's also a standalone `std.pipe` function. It's basically the same, but as a standalone function rather than a method. [Check the docs for more info about both versions of `pipe`](https://brioche.dev/docs/core-concepts/recipes/#stdpipe--recipepipe)!

### Work on cross-platform support

The next big feature I'm aiming for is cross-platform support in Brioche. Specifically, my goal is to support aarch64 (ARM64) Linux as a build host + target. Since cross-compilation is also an eventual goal, I'm trying to build support in a way that will lead smoothly to cross-compilation too.

Unfortunately, I think there's still quite a bit of work remaining before we can get this implemented...

#### Design ideas

So, the "big idea" I'm working towards is to support _dynamic bindings_ in recipes. Basically, you could have a recipe that looks like this (placeholder syntax):

```typescript
export default function curl() {
  return std.runBash`
    # Build OpenSSL from source
    ./configure && make && make install
  `
    .workDir(source)
    .dependencies(std.toolchain, openssl)
    .hostPlatform(std.variable("hostPlatform"))
    .targetPlatform(std.variable("targetPlatform"));
}
```

The "trick" is that `std.variable` in this case _doesn't_ return a string value like `linux-x86_64` or whatever. Instead, it returns a "placeholder" value that we can substitute later. If you tried to `console.log` them, they would just show as variables named `hostPlatform` and `targetPlatform`. The Brioche runtime itself would substitute them-- say, based on a CLI option like `brioche build --target ...`.

...why do we need that? Well, let's say I want to build curl for x86-64 and aarch64, and create a single tarfile for both of them. I'd like to write this recipe:

```typescript
export default function () {
  // Build curl for x86-64 Linux
  const curlX64 = curl().setVariable({ targetPlatform: "x86_64-linux" });

  // Build curl for aarch64 Linux
  const curlArm = curl().setVariable({ targetPlatform: "aarch64-linux" });

  // Combine into a directory
  const curls = std.directory({
    "curl-x86-64-linux": curlX64,
    "curl-aarch64-linux": curlArm,
  });

  // Create a tarfile for the directory
  return createTarfile(curls);
}
```

The neat thing is that these `hostPlatform` and `targetPlatform` values can flow down into dependencies automatically. Since we're building `curl` for both x86-64 and aarch64, that means that `openssl` will be built for both as well.

This isn't just an arbitrary example either: since OCI / Docker container images are "just" tarfiles, we could use this to easily make multi-platform OCI images with very little extra work!

There's a lot of details I'm glossing over, and there's still even more work to iron out the details for this design, so I'll leave it at that for now.

#### Roadblocks

While starting work to implement and experiment with this design, I've basically fallen into a quagmire of issues:

1. To maintain backwards compatibility, I think the best option would be to handle these "dynamic bindings" as a _preprocessing_ step on recipes.
2. Brioche has support "proxy recipes" today. A "proxy recipe" is a recipe that contains a hash for another recipe to use in its place. These were added as a performance optimization, since this lets us avoid (de)serializing duplicate recipes in the build graph.
3. Because proxy recipes are hashed eagerly, they basically conflict with having a preprocessing step. We also can't just "turn them off" for a number of reasons.
4. ...but, I realized we could rely on referential equality in JavaScript as a simpler alternative to proxy recipes. This would be much cleaner and should be faster too.
5. ...but that would require our own way to deserialize values from JavaScript to Rust, due to limitations with how we currently deserialize. But the `Recipe` type is huge and complex, and it'd be unwieldy to hand-write deserialization logic.

For (4), I've already got some prototype code that handles this properly on the JS side. For (5), I've been playing around with [facet](https://facet.rs/) recently. Right now, I believe it's the best path forward for handling deserialization on the Rust side, which in turn should start to unravel these issues.

And just to be clear, cross-platform support is the catalyst for cleaning this up, but I think getting this cleaned up anyway will be a good change overall, even ignoring cross-platform support.

#### Breaking changes?

But, I'm also unsure if untangling the whole mess above can be done in a backwards-compatible way. Well, not so much if it _can_ be done, but rather if it'd be better to do so as a breaking change...

I secretly hoped Brioche would graduate from v0.1.x straight to v1.0.0, but I've already got a wishlist of minor breaking changes I'd love to make to the data model. It might be time to rip the band-aid.

I'm still on the fence overall, but I'm leaning more towards it. That means cross-platform support might need to wait until Brioche v0.2.0.

## Housekeeping

### New packages

Since the last update, there were **64** new packages!

- `bash_language_server`
- `biome`
- `brotli`
- `bubblewrap`
- `bugstalker`
- `cargo_about`
- `cargo_audit`
- `cargo_bloat`
- `cargo_msrv`
- `cargo_mutants`
- `cargo_nextest`
- `cargo_udeps`
- `cmctl`
- `codex`
- `cosign`
- `delve`
- `difftastic`
- `eks_node_viewer`
- `expat`
- `fzf`
- `go_mockery`
- `golangci_lint`
- `gosec`
- `grcov`
- `gron`
- `gtest`
- `htop`
- `hyperfine`
- `jjui`
- `kor`
- `lerc`
- `libcap`
- `libdeflate`
- `libgit2`
- `libjpeg`
- `libjpeg_turbo`
- `libpng`
- `libsodium`
- `libssh2`
- `libunwind`
- `markdownlint_cli`
- `mdbook`
- `meson`
- `mitmproxy`
- `ninja`
- `pcre`
- `pnpm`
- `rip2`
- `sccache`
- `snazy`
- `starship`
- `tailspin`
- `tflint`
- `trivy`
- `uthash`
- `uv`
- `vegeta`
- `xcaddy`
- `xh`
- `xz`
- `yazi`
- `zlib`
- `zlib_ng`
- `zziplib`

Thanks to [**@jaudiger**](https://github.com/jaudiger), who added a majority of these packages!

(the list in this section is so long now...! I feel like I'll need to eventually tweak the CSS a bit so it doesn't take up so much space on the page!)

### Brioche core updates

- Update `live-update` subcommand to use `liveUpdate` export ([#237](https://github.com/brioche-dev/brioche/pull/237))
- Speed up debug compilation ([#238](https://github.com/brioche-dev/brioche/pull/238))
- Remove use of legacy registry endpoints ([#239](https://github.com/brioche-dev/brioche/pull/239))
- Fix `brioche live-update` not showing output on error ([#243](https://github.com/brioche-dev/brioche/pull/243))
- Update Rust version to 1.87 ([#248](https://github.com/brioche-dev/brioche/pull/248) by [**@jaudiger**](https://github.com/jaudiger))
- Upgrade Rust version for Brioche-in-Brioche ([#249](https://github.com/brioche-dev/brioche/pull/249))
- Add workaround for "file exists" bug in CI ([#250](https://github.com/brioche-dev/brioche/pull/250))
- Update CI macOS default images ([#251](https://github.com/brioche-dev/brioche/pull/251) by [**@jaudiger**](https://github.com/jaudiger))
- ci: Add GitHub Actions updates through dependabot ([#252](https://github.com/brioche-dev/brioche/pull/252) by [**@jaudiger**](https://github.com/jaudiger))
