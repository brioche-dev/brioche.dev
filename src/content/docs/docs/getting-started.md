---
title: Getting started
---

**Brioche** is a simple and flexible package manager and build tool. It's designed to make it super simple to use whatever tools you want, natively on any platform without virtualization, shared with all your contributors and team members, and re-used in your CI/CD pipelines and container images. Builds re-use cached artifacts stored either locally or remotely, and all dependencies are tracked with a lockfile, which ensures your builds are fast and reliable.

Brioche scripts are written with [TypeScript](https://www.typescriptlang.org/) and run through a trimmed down JavaScript runtime by leveraging [Deno Core](https://github.com/denoland/deno_core). This gives you excellent type-checking, editor autocompletion, formatting, and linting for your scripts without needing to mess around with any extra tooling.

```ts
// project.bri
import * as std from "std";
import nodejs, { npmInstall } from "nodejs";

export default function (): std.Recipe {
  // Import the npm package files from the current directory
  const source = Brioche.glob("src", "package.json", "package-lock.json");

  // Install all npm package dependencies
  const npmPackage = npmInstall({ source });

  // Run the npm build script and save the output from the `dist/` dir
  return std.runBash`
    npm run build
    mv dist "$BRIOCHE_OUTPUT"
  `
    .dependencies(nodejs())
    .workDir(npmPackage);
}
```

## Why Brioche?

There are lots and lots of different package managers to choose from, and all of them have their own merits! So why would you choose to use Brioche for your project?

- **Easy to use**: Brioche is meant to be dead simple to install and set up, and the familiar TypeScript-based scripts makes it easy to create build pipelines as simple or as complex as you need.
- **Reliable**: All external dependencies are pinned in a lockfile, making it much easier to ensure all of your build inputs don't change out from underneath you. Even if you live life on the bleeding edge, this gives you great auditability.
- **Cacheable**: Brioche hashes all input files to tell when previous build artifacts can be re-used. Builds without any changes finish fast, and intermediate artifacts can be synced remotely for use between different machines.
- **Cross-platform**: Brioche makes it easy to build and run your projects on any supported platform, including hassle-free cross-compilation.
- **Cross-ecosystem**: Mix and match different languages and tools within a project and across multiple projects.
- **Composable**: Bring in all of your tools, and re-use them across build scripts, test runners, Docker images, and local dev environments.

## Installation

Run the following command to install Brioche:

```sh
curl --proto '=https' --tlsv1.2 -sSfL 'https://brioche.dev/install.sh' | sh
```

For the best experience, [configuring your editor with Brioche support](/docs/installation#editor-support) is **strongly recommended!** Also see [Installation](/docs/installation) for more installation options and details.

## "Hello world!"

Let's start with a very minimal "Hello world!" example to get a feel for Brioche:

```ts
// project.bri

// Import the `std` package (the Brioche standard library)
// This will be included in most projects
import * as std from "std";

// This is the default function that gets run when calling `brioche build`
export default function (): std.Recipe {
  // Run a script to create a file named `hello.txt`
  return std.runBash`
    mkdir -p "$BRIOCHE_OUTPUT"
    echo "hello world" > "$BRIOCHE_OUTPUT/hello.txt"
  `;
}
```

Save this file as `project.bri`, then run `brioche build -o output`.

When you run this, Brioche will run the `default` function from `project.bri` in the current directory, then write the output to the path `output`. The first run may take a while to download dependencies, but afterwards, you can open the file `output/hello.txt` to see "hello world"!

...okay, creating a plain text file isn't much to write home about. But let's talk about what's going on: the `default` function doesn't end up really doing anything on its own. Instead, it returns a [recipe](/docs/core-concepts/recipes), which describes how to build the output. In this case, it says "run a bash script to write the file `hello.txt`". The special path `$BRIOCHE_OUTPUT` is the "output" of the recipe: your scripts and commands _need_ to put something there (think of it like returning from a function in a programming language).

Also, you may have also noticed the file `brioche.lock` appeared as well. This is the lockfile, which pins the version of the `std` dependency used for the build, including the exact version of Bash used for the build. Once you start bringing your own build tools into the mix-- Go, Rust, NodeJS, Python, etc.-- they'll all be locked as well.
