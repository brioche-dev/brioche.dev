---
title: Projects
---

Everything built with Brioche starts with a **project**, which is a folder containing the Brioche scripts and any other files needed to for your build. The main entrypoint for your project is the file `project.bri`, which contains the root TypeScript module for your project. Typically, a project will at least import the `std` package (the Brioche standard library) and export a default function used by the `brioche build` command:

```ts
// TODO: Untested
import * as std from "std";

export default function (): std.Recipe {
  // ...
}
```

## Project metadata

You can optionally define project metadata in the project root by adding a special `export const project = { /* ... */ }` declaration:

```ts
// project.bri
export const project = {
  name: "my_project",
  version: "0.0.1",
  dependencies: {
    std: "*",
  },
};
```

## Imports

Brioche supports a few different JavaScript import specifiers:

- **Relative imports**: Import a `.bri` file relative to the current module. Must start with `./` or `../`. If the specifier points to the project root directory, then the root module (`project.bri`) will be imported. If the path points to a subdirectory of the project, then the module `index.bri` within the directory will be imported. Example: `import "./module.bri";`
- **Project root import**: Import a `.bri` file relative to the project root. Must start with `/`. Follows the same rules as a relative import, but starts from the project root path. Example: `import "/module.bri";`
- **External project import**: Import the root module of an external project. This will normally be resolved to a dependency from the registry, but this can changed in the project definition. Example: `import "std";`

## Dependencies

When you import an external project, such as when writing `import "std";`, the name `std` is a **dependency**, which then gets resolved to another project.

### Explicit dependencies

The most specific way to resolve the dependency is by adding a dependency declaration in the project definition, like in the following code snippet:

```ts
import "std";

export const project = {
  dependencies: {
    std: "*",
  },
};
```

Here, the field `std: "*"` within the project definition is a dependency declaration that specifies where the project `std` comes from. In this case, it's a wildcard dependency, meaning the latest version of the dependency is imported from the registry.

### Implicit dependencies

If you use an `import` statement without including dependency declaration explicitly, the dependency will be implicitly imported, such as in this code snippet:

```ts
import "std";

export const project = {
  dependencies: {
    // ... std is not listed here ...
  }
}
```

Here, `std` will be resolved exactly the same as if you had included an explicit dependency declaration of `std: "*"`.

## Dependency declarations

Dependency declarations can be added to the project definition to specify exactly how an imported dependency should be resolved.

### Wildcard dependency

Pull in the latest version of a dependency from the registry (which will be pinned in the lockfile). If the same dependency name is found in the [workspace](./workspaces.md), then the workspace dependency will be used.

```ts
export const project = {
  dependencies: {
    my_project: "*",
  },
};
```

### Path dependency

Pull in a dependency from the local filesystem.

```ts
export const project = {
  dependencies: {
    my_project: { path: "../my_project" },
  },
};
```

## Exports

`.bri` files are normal TypeScript files, so `project.bri` can export values using the JavaScript `export` keyword. These exports can be used by submodules or dependent projects.

Exports also serve as the actual entrypoint to builds. Running `brioche build -p project_path` will call the default export from the root module (`project.bri`). This can be changed to a different export explicitly with the `-e` flag, which names a different exported function to call. Here's a minimal example:

```ts
// Project structure:
// - project.bri
// - frontend/: Frontend NodeJS project
// - backend/: Backend Rust project

// TODO: Untested
import * as std from "std";
import { cargoBuild } from "rust";
import node from "node";

export function frontend (): std.Recipe {
  return std.runBash`
    npm run build
    mv dist "$BRIOCHE_OUTPUT"
  `
    .dependencies(node())
    .workDir(Brioche.get("frontend"));
}

export function backend (): std.Recipe {
  return cargoBuild({
    crate: Brioche.get("backend"),
  });
}
```

You can then run `brioche build -e frontend` or `brioche build -e backend` to call the frontend or backend functions, respectively (don't forget the `-o` flag if you want to put the output somewhere!)

The export used by `brioche build` should be a function that can be called with no arguments and should return the type `std.Recipe` or a compatible subtype (it's good pratice to use a more specific type if possible, such as `std.Recipe<std.Directory>` if the function returns a directory recipe).

By convention, the default export should be the "main" build recipe, most commonly a directory recipe containing a `bin/` directory containing built programs.

