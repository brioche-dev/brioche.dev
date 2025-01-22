---
title: Statics
---

A **static** is a special function that gets resolved by Brioche before your script runs, most commonly returning a [recipe](/docs/core-concepts/recipes).

Some statics are resolved by reading files locally from your project, others get resources from the internet and record the results in your project's lockfile. In either case, using a static lets you "pull in" something from outside Brioche, but in a way that Brioche can track to guarantee reliability.

Since they are resolved so early in the process, there are some restrictions on how you can define and use them in your scripts (hence why they are called "statics"). When calling a static function, **all of the arguments must use string literals**! In the root module (`project.bri`), you can use string templates that reference the [project metadata](/docs/core-concepts/projects#project-metadata) value as well. If you try to pass a string from a dynamic value or other variable for a static recipe, you will get an error when trying to build your project.

All of these statics are implemented by the `std` package, so you will need import `std` in your project to use them. This also means that, if a new static gets added, you'll need to both update Brioche and update the `std` package to use it.

## `Brioche.includeFile`

Returns a [file recipe](/docs/core-concepts/recipes#stdfile) from a file in your project. The path is resolved relative to the current module.

```typescript
// Project structure:
// - project.bri
// - main.c

import * as std from "std";

// Read the file "main.c"
const sourceCode = Brioche.includeFile("main.c");

// Use the file to build a program
export default function () {
  return std.runBash`
    mkdir -p "$BRIOCHE_OUTPUT"/bin
    cp "$sourceCode" main.c
    gcc main.c -o "$BRIOCHE_OUTPUT"/bin/program
  `
    .env({ sourceCode })
    .dependencies(std.toolchain());
}
```

## `Brioche.includeDirectory`

Returns a [directory recipe](/docs/core-concepts/recipes#stddirectory) from a directory in your project. The path is resolved relative to the current module.

Note that all files within the directory are included! If you want to include only some files, consider using [`Brioche.glob`](#briocheglob) instead.

```typescript
// Project structure:
// - project.bri
// - src/main.c

import * as std from "std";

// Include all files from the the directory "src".
// Contains `main.c`
const src = Brioche.includeDirectory("src");

// Build a program from `src/main.c`
export default function () {
  return std.runBash`
    mkdir -p "$BRIOCHE_OUTPUT"/bin
    gcc "$src/main.c" -o "$BRIOCHE_OUTPUT"/bin/program
  `
    .env({ src })
    .dependencies(std.toolchain());
}
```

## `Brioche.glob`

Return a [directory recipe](/docs/core-concepts/recipes#stddirectory) from a list of **glob patterns**. Any files relative to the current module that match the glob pattern will be included in the directory. Included files will have the same path, relative to the directory recipe.

Glob patterns are matched using the [`globset`](https://docs.rs/globset/0.4.14/globset/index.html) Rust crate.

Note that using a glob pattern that tries to traverse outside the module's directory will not work.

```typescript
// Project structure:
// - project.bri
// - src/main.c
// - include/main.h

import * as std from "std";

// Include all `.c` files from the `src` directory,
// and all `.h` files from the `include` directory.
// Contains `src/main.c` and `include/main.h`
const projectDir = Brioche.glob("src/*.c", "include/*.h");

// Build a program from `src/main.c`
export default function () {
  return std.runBash`
    mkdir -p "$BRIOCHE_OUTPUT"/bin
    gcc \\
      -I "$projectDir/include" \\
      "$projectDir/src/main.c" \\
      -o "$BRIOCHE_OUTPUT"/bin/program
  `
    .env({ projectDir })
    .dependencies(std.toolchain());
}
```

## `Brioche.download`

Returns a [file recipe](/docs/core-concepts/recipes#stdfile) containing the contents of the provided URL. The hash of the URL's contents will be recorded in the lockfile, and the hash from the lockfile will be used to validate the download in subsequent builds if not already cached. This ensures that the URL's contents are the same, even when running the build on a different machine.

This function is similar to [`std.download`](/docs/core-concepts/recipes#stddownload), except the hash is handled for you using the lockfile.

```typescript
import * as std from "std";

// Download the Brioche source code and unarchive it
const source = Brioche.download(
  "https://github.com/brioche-dev/brioche/archive/refs/tags/v0.1.0.tar.gz",
)
  .unarchive("tar", "gzip")
  .peel();
```

The [project metadata](/docs/core-concepts/projects#project-metadata) can also be used as part of the URL, which helps to ensure that the right version of a release gets downloaded.

```typescript
import * as std from "std";

export const project = {
  name: "brioche",
  version: "0.1.0",
};

// Download the Brioche source code based on the project version above
const source = Brioche.download(
  `https://github.com/brioche-dev/brioche/archive/refs/tags/v${project.version}.tar.gz`,
)
  .unarchive("tar", "gzip")
  .peel();
```

## `Brioche.gitRef`

Takes a git repository URL and a [git ref](https://git-scm.com/book/en/v2/Git-Internals-Git-References) (such as a branch or tag name), and returns an object containing the repository URL and a git commit hash. Brioche will query the repository URL to get the current commit hash for the ref, then record the result in the lockfile. The same commit hash will be returned until the lockfile is updated again, even if the ref changes in the repository.

This function is best paired with the `gitCheckout` function from the `git` package, which can checkout the repository from the returned commit.

Only public git repositories can be used, since authentication is disabled when querying the repository. Additionally, querying the repository uses the [`gitoxide`](https://github.com/Byron/gitoxide) Rust crate, which means that some legacy git protocol versions aren't supported.

```typescript
import * as std from "std";
import { gitCheckout } from "git";

// Check out the Brioche repository from the `main` branch
const source = gitCheckout(
  Brioche.gitRef({
    repository: "https://github.com/brioche-dev/brioche.git",
    ref: "main",
  }),
);
```

The [project metadata](/docs/core-concepts/projects#project-metadata) can also be used for either the repository URL or for the git ref, which can be used to check out the correct version of the source code.

```typescript
import * as std from "std";
import { gitCheckout } from "git";

export const project = {
  name: "brioche",
  version: "0.1.0",
};

// Check out the Brioche repository from a tagged version
const source = gitCheckout(
  Brioche.gitRef({
    repository: "https://github.com/brioche-dev/brioche.git",
    ref: `v${project.version}`,
  }),
);
```
