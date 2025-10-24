---
title: Contributor's Overview
---

There are [lots of ways to get involved with Brioche](/get-involved)! If you're interested in development specifically, this guide will help outline the different pieces of Brioche.

Development work is done via our GitHub org: <https://github.com/brioche-dev>.

## Main Brioche repo

<https://github.com/brioche-dev/brioche>

This is the main repo for Brioche itself-- the `brioche` CLI tool.

Brioche itself is written in Rust. It's broken up as a [Cargo workspace](https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html). Here's an overview of the crates in the workspace:

- `crates/brioche`: The entrypoint and main CLI tool. There's not much logic here directly, it mostly wraps `brioche-core`.
- `crates/brioche-core`: This is where most of the logic for Brioche itself lives. It's structured as a library for use by `brioche` and other projects in the ecosystem. It includes:
  - Recipe evaluation
  - Local database queries and migrations
  - Pulling from and pushing to remote caches
  - JavaScript runtime components
  - Sandboxing
  - LSP for `.bri` files
- `crates/brioche-pack`: Defines encoding / decoding for [packed executables](/docs/how-it-works/packed-executables). `brioche-core` uses this during recipe evaluation, and it's also used by other projects in the ecosystem.
- `crates/brioche-test-support`: Used internally for writing tests.

For the JavaScript runtime, we also have a small Node.js project under `crates/brioche-core/runtime`. This is used for bundling code to include with Brioche's JS runtime (with dependencies like TypeScript, ESLint, etc.).

## Brioche Packages

<https://github.com/brioche-dev/brioche-packages/>

All packaging work is centralized here. New packages and package updates are submitted as Pull Requests. Builds are handled automatically through GitHub Actions.

See the [packaging guide](/docs/contributing/packaging-guide) for details on adding new packages.

The `std` package is also worth a special mention. It includes a ton of building blocks used by other packages, including:

- Standard Unix-style utilities (`std.tools`) plus a gcc-based toolchain (`std.toolchain`), based on [Linux From Scratch](https://www.linuxfromscratch.org/)
- Types and functions for recipes and interacting with the runtime (`Brioche.download`, `std.Recipe`, etc.)
- Common generic helper utilities like `std.pipe`
- High-level functions for making recipes like `std.runBash`
- Miscellaneous scripts and tools (`std.liveUpdateFromGithubReleases`, `std.runtimeUtils`)

### brioche-packages-extra

<https://github.com/brioche-dev/brioche-packages-extra>

A secondary repo for things that aren't a good fit for the main Brioche Packages repo. Think work-in-progress packages, miscellaneous examples, experiments, or things that are complicated to support long term.

At the time of writing, there's no CI set up to build these packages though, so you'll need to build them from source!

## brioche.dev

<https://github.com/brioche-dev/brioche.dev>

The main <https://brioche.dev> website, including docs and the blog.

We use [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/) for the website, so it's built and served as a static site.

## Brioche Installer

<https://github.com/brioche-dev/brioche-installer>

The Brioche install script.

## Brioche Runtime Utils

<https://github.com/brioche-dev/brioche-runtime-utils>

A collection of utilities for use in Brioche Packages. This includes some low-level building blocks used by the `std` toolchain.

## Brioche Registry

<https://github.com/brioche-dev/brioche-registry>

API server for serving packages. While it's self-hostable, the main goal is for serving `https://registry.brioche.dev`, which is the default API that Brioche uses to resolve packages.

### Brioche Cache

See ["Cache vs. Registry"](https://brioche.dev/docs/core-concepts/cache/#cache-vs-registry) for the difference between the cache and the registry. TL;DR: the registry mainly maps package names to project hashes; the cache is used for fetching projects by hash, mapping recipe hashes to artifact hashes, and fetching artifacts by hash.

The cache doesn't have a repo-- it's a dumb S3-compatible object store! The default cache is served at `https://cache.brioche.dev`.

## setup-brioche (GitHub Action)

<https://github.com/brioche-dev/setup-brioche>

A GitHub Action to install Brioche. It's little more than a wrapper over the normal installer.

## brioche-vscode (VS Code extension)

<https://github.com/brioche-dev/brioche-vscode>

The VS Code extension for Brioche-- mainly to support `.bri` files. This repo _should_ be pretty small, as a lot of the heavy lifting is handled by the LSP in the main repo, where possible.
