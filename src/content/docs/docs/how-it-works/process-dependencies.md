---
title: Process Dependencies
---

When you create a [process recipe](/docs/core-concepts/recipes#stdprocess), you can pass in an array of recipes in the `dependencies` option (or call the `.dependencies()` method to create a new recipe with more dependencies). When baked, the process will use these dependencies to append to `$PATH` or other environment variables (the explicit env vars on the process take precedent over the env vars set by dependencies).

## Dependency structure

Any directory recipe can be used as a dependency, but it will only do something useful if it follows a specific scheme.

### Explicit env vars

A dependency recipe can set environment variables in its parent by creating a `brioche-env.d` directory:

- `brioche-env.d` should contain an inner `env` directory
- `env` can contain files, symlinks, or directories. Each one should be named after an environment variable to set.
  - For a **file**, the environment variable will be set to the contents of the file. This value will be used as a fallback if the environment variable is not set.
  - For a **symlink**, the environment variable will be set to an absolute path of the symlink's target. This value will be used as a fallback if the environment variable is not set.
  - For a **directory**, it should only contain symlinks. The environment variable will contain absolute paths of the symlink targets concatenated together with `:`. Each individual symlink's name is unused. This value will be appended to the environment variable if it's already set.

Here's an example structure to set some env vars:

```
artifact
├── brioche-env.d
│  └── env
│     ├── LIBRARY_PATH
│     │  ├── lib -> ../../../lib
│     │  └── usr_lib -> ../../../usr/lib
│     ├── PKG_CONFIG_PATH
│     │  └── lib_pkgconfig -> ../../../lib/pkgconfig
│     ├── ARTIFACT_ROOT -> ../../..
│     └── DEBUG
├── lib
│  ├── pkgconfig
│  │  └── ...
│  └── ...
└── usr
   └── lib
      └── ...
```

If this artifact is used as a dependency for a process, then the process would start with these environment variables set:

- `$LIBRARY_PATH`: `/absolute/path/to/artifact/lib:/absolute/path/to/artifact/usr/lib`
- `$PKG_CONFIG_PATH`: `/absolute/path/to/artifact/lib/pkgconfig`
- `$ARTIFACT_ROOT`: `/absolute/path/to/artifact`
- `$DEBUG`: (The literal contents of the `DEBUG` file)

You can use the `std.setEnv()` function to more easily build this directory structure:

```ts
return std.setEnv(recipe, {
  LIBRARY_PATH: {
    append: [
      { path: "lib" },
      { path: "usr/lib" },
    ],
  },
  PKG_CONFIG_PATH: {
    append: [{path: "lib/pkgconfig" }],
  },
  ARTIFACT_ROOT: { fallback: { path: "." } },
  DEBUG: { fallback: { value: "1" } },
});
```

If multiple dependencies set the same env vars (or two dependencies merged together with `std.merge()`), then the env vars will be set from all of the dependencies.

### Implicit `$PATH`

If a dependency includes a `bin/` directory, then it will be implicitly added to `$PATH` automatically. The dependency can add additional directories to `$PATH` explicitly as well (e.g. using `std.setEnv`), and the values will be concatenated together with `:`.
