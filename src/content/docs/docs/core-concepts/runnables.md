---
title: Runnables
---

A **runnable** is a [directory artifact](./artifacts) that can be used with `brioche run`. A runnable is just an ordinary directory artifact that contains a file or symlink called `brioche-run` at the root-- this is the executable that gets invoked when calling `brioche run`:

```ts
import * as std from "std";
import { cargoBuild } from "rust";

export default function () {
  // Build a cargo project
  //
  // app
  // └── bin
  //    └── hello
  const app = cargoBuild({
    crate: Brioche.glob("src", "Cargo.*"),
  });

  // Add a symlink for use with `brioche run`
  //
  // app
  // ├── bin
  // │  └── hello
  // └── brioche-run -> bin/hello
  return app.insert("brioche-run", std.symlink({ target: "bin/hello" }));
}
```

If you were to call the above project with `brioche run`, then the project would build, then Brioche would execute the `brioche-run` symlink from the artifact, which in turn would call `bin/hello`.

You could also simplify the above code using the `std.withRunnableLink` utility, but the result is the same:

```ts
import * as std from "std";
import { cargoBuild } from "rust";

export default function () {
  const app = cargoBuild({
    crate: Brioche.glob("src", "Cargo.*"),
  });

  return std.withRunnableLink(app, "bin/hello");
}
```

`rust.cargoBuild()` also provides a `runnable` option to simplify it even more:

```ts
import * as std from "std";
import { cargoBuild } from "rust";

export default function () {
  return cargoBuild({
    crate: Brioche.glob("src", "Cargo.*"),
    runnable: "bin/hello",
  });
}
```

## Making a runnable from a Bash script

Sometimes, you may want to use `brioche run`, but you may not be able to link to a single binary to do what you want to do:

- Calling an interpreter like `node` with a specific script path
- Passing default arguments or environment variables to a binary
- Transforming the result of a binary

The utility `std.bashRunnable` is meant for these sorts of use cases: it takes a Bash script and some optional extra context, and returns a runnable that executes the script when `brioche run` is called. There's nothing special about it: just like every other runnable, it returns a directory with a `brioche-run` executable in it.

```ts
import * as std from "std";
import nodejs from "nodejs";

export default function () {
  const nodeProject = Brioche.glob("src/**.js");

  return std.bashRunnable`
    node "$root"/src/script.js
  `
    .root(nodeProject)
    .dependencies(nodejs());
}
```

`.root()` is used to include extra stuff in the root of the artifact, which can be referenced in the script using the `$root` environment variable. Dependencies and extra env vars can be bundled in the script using the `.dependencies()` and `.env()` methods, respectively.

## Turning a runnable into a container image

You can use `std.ociContainerImage()` to build an OCI container image, e.g. for Docker or Podman. If you don't set an entrypoint, then `/brioche-run` will be used by default. This means you can easily turn any runnable artifact into an OCI container image!

```ts
import * as std from "std";
import nodejs from "nodejs";

export default function build() {
  const nodeProject = Brioche.glob("src/**.js");

  return std.bashRunnable`
    node "$root"/src/script.js
  `
    .root(nodeProject)
    .dependencies(nodejs());
}

export function container() {
  return std.ociContainerImage({
    recipe: build(),
  });
}
```

In this example, you can run `brioche run` to run the project natively on your machine, or you can run `brioche build -e container -o container.tar` to build an easily-deployable container image.
