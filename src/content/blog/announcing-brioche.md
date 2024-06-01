---
title: Announcing Brioche!
pubDate: 2024-06-01T03:02:54-07:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

I'm super excited to announce the first public release of Brioche! Brioche is a brand new package manager and build tool that builds on top of the best ideas of other package managers, like Nix, Homebrew, and Cargo. It's designed to be flexible and easy to use, and it leverages TypeScript for fancy typechecking and autocompletions in your build scripts.

I'd consider this release a **Technical Preview**. Currently, it's limited to x86-64 Linux only, there's only a small number of packages, performance still leaves a lot to be desired. Brioche isn't really at the point I'd recommend folks use it for Serious Business™ yet... but, everything is _working_, and I'm finally at the point where I'm ready to get some more eyes on the project.

> If you've heard of [Tangram](https://www.tangram.dev/) before, Brioche might looks pretty familiar because Brioche heavily borrows ideas from it too. There's a bit of a history there, which I [touch on below](#on-tangram).

...Anyway, without further ado, here's a fairly simple Brioche project file:

```ts
// project.bri

// Import dependencies
import * as std from "std";
import { cargoBuild } from "rust";

// This will get built by default
export default function app() {
  // Build a Rust project with Cargo
  return cargoBuild({
    // Import Cargo files to build
    crate: Brioche.glob("src", "Cargo.*"),

    // Define the path of the default binary to run
    runnable: "bin/hello",
  });
}

// Define an extra export that builds a container
export function container() {
  // Wrap the Rust build into an OCI container image
  return std.ociContainerImage({
    recipe: app(),
  });
}
```

The `Brioche.glob` line imports files from disk next to the `project.bri` file, so this particular script is meant to live alongside an existing Rust project. Besides that, hopefully it's pretty self-explanatory what's going on. A few things you can do with this:

- You can run `brioche run`, which will call the default export function. This returns a [**recipe**](../docs/core-concepts/recipes/) that will use the Rust compiler to build the project. Then, Brioche will call the `bin/hello` binary
- You can run `brioche build -e container -o container.tar` to call the `container` function. This will build an OCI container image, ready to be imported into either Docker or Podman
- You can run `brioche build -o output/` to save a directory containing `bin/hello`. Not just that: this directory will contain all of the runtime dependencies for the project (including glibc)! That means you can send it to another computer, and it'll run using the exact same dependencies you just ran it with

If you want to check out some more examples or if you want to give Brioche a spin yourself, take a look at the [documentation](../docs/). If you want to see the currently available packages (or just want to explore some real-world Brioche code), check out the [brioche-packages repo](https://github.com/brioche-dev/brioche-packages).

## Why write another package manager?

There are _lots_ of tools that cover some or all of the use-cases I had in mind for Brioche: Nix, Bazel, Earthly, Homebrew, asdf, direnv, devenv, tea, and too many more to list. So why spend the time building something new?

Well, first off, it's fun! Brioche has been one of my favorite projects to work on. Rust and TypeScript are my two favorite languages to write, and I love the fairly low-level nature of working with compiler toolchains (even if dealing with autotools is endlessly frustrating...)

Second, Nix. A long long time ago (circa 2016), I daily drove NixOS and even briefly maintained a package in the Nixpkgs repo. I was really sold on Nix's ideas, but I eventually abandoned it because I ended up feeling pretty frustrated when using it. I learned NixLang pretty in-depth, but it never really felt intuitive to me. Derivations always felt weirdly rigid. I didn't like that the Nixpkgs repo as a whole is versioned as one unit instead of individual packages. I didn't like how much work I had to put in to get stuff that just works out-of-the-box everywhere else to work on NixOS: I felt like my tools work working _against_ me instead of _for_ me.

2016 was 8 years ago now, and I know the Nix ecosystem has evolved a lot since then. I know Flakes are supposed to be a game changer, there are lots more packages and resources for using Nix, and the core tooling has certainly been improved a lot since then. But it was this experience that planted the idea for Brioche in my head, and I couldn't shake the feeling that, starting from scratch, I could design something less quirky than Nix while keeping its best features.

## What's in store for Brioche

I want Brioche to be the best way to manage your software projects. I end up finding myself mixing and matching lots of tools in weird ways: I've had projects that mix Rust and TypeScript, Rust and ffmpeg, Rust and Swift, Rust and the Windows API, Rust and Godot, Rust and SDL2, etc. (did I mention I like Rust?)

My dream is that I could use Brioche for all of these projects. I want to make a project and have all of its external dependencies tracked in a lockfile. I want to run one command that takes care of building, seeding my test databases, checking formatting, then starting a server in watch mode with my database running alongside. I want to use the same build configuration locally, for a container image, and for CI builds. And I want it to work without virtualization whether I'm using Windows on my desktop, macOS on my laptop, or Linux on the server (and Linux on the desktop when I can finally run all the games I want through Proton)

## On the Nix community

The Nix community has recently [been going through Something](https://lwn.net/Articles/970824/). My decision to build Brioche was in no way a reaction to the recent fallout around Nix. I still have a ton of respect for Nix as a community, and I'm genuinely rooting for them to establish a solid governance model that puts the community first so Nix-the-project can thrive.

## On Tangram

[Tangram](https://www.tangram.dev/) is another package manager that has a lot of overlap with Brioche: it's heavily Nix-inspired, it uses TypeScript for build scripts, it's written in Rust, and generally Brioche build scripts look pretty similar to Tangram build scripts. At the time of writing, Tangram hasn't yet been released, but it's due to release very soon.

The similarities between Tangram and Brioche aren't a coincidence: I worked for Tangram, Inc. starting in October 2022 to April 2023, when I was fired (I felt I was fired completely unfairly, but this isn't the time or place for that story). I had been working on Brioche before my time there, and I decided to resume it some time after I was fired.

There were design decisions made at Tangram that I thought worked really well, and some I thought didn't work so well, so I simply incorporated what I learned at Tangram into the current iteration of Brioche. I think it's fair to say that Brioche is, ethically, a fork of Tangram, even though haven't used any code from Tangram directly (although I am still using some prebuilt static Busybox/Dash/env binaries that Tangram built/published). This is also why the [Brioche license](https://github.com/brioche-dev/brioche/blob/5bede7097a2736e3582d51c899975dda8e7e8011/LICENSE.md) includes a copyright notice from Tangram.

So, why build Brioche rather than just using Tangram when it comes out? Basically, my time at Tangram, Inc. led me to believe pretty strongly that Tangram hits _most_ of what I want from a package manager, but I don't believe it hits _everything_ I have in mind for Brioche (and vice versa, there certainly will be things Tangram can do that Brioche won't be able to do and aren't part of my long-term goals for the project). Said another way, I think both Tangram and Brioche have their own goals and will have their own niches to fill.

I also chose to start from a fresh codebase rather than forking. I felt that starting from scratch would let me re-evaluate some fundamental design decisions. Even though the up-front cost was higher, it also let me iterate faster in the long-run.
