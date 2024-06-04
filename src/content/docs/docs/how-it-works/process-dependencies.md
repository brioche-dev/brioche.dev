---
title: Process Dependencies
---

When you create a [process recipe](/docs/core-concepts/recipes#stdprocess), you can pass in an array of recipes in the `dependencies` option (or call the `.dependencies()` method to create a new recipe with more dependencies). When baked, the process will use these dependencies to append to `$PATH` or other environment variables (the explicit env vars on the process take precedent over the env vars set by dependencies).

## Dependency structure

Any directory recipe can be used as a dependency, but it will only do something useful if it follows a specific scheme.

### Explicit env vars

A dependency recipe can set environment variables in its parent by creating a `brioche-env.d` directory:

- `brioche-env.d` should contain an inner `env` directory
- Each directory in `env` should be named after an environment variable to set
- Each env var directory should contain symlinks. The paths referenced by the symlinks will be expanded to absolute paths, and all the symlinks will be concatenated together with `:` (the name of the symlink is unused).

Here's an example structure to set some env vars:

```
artifact
├── brioche-env.d
│  └── env
│     ├── LIBRARY_PATH
│     │  ├── lib -> ../../../lib
│     │  └── usr_lib -> ../../../usr/lib
│     └── PKG_CONFIG_PATH
│        └── lib_pkgconfig -> ../../../lib/pkgconfig
├── lib
│  ├── pkgconfig
│  │  └── ...
│  └── ...
└── usr
   └── lib
      └── ...
```

If this artifact is used as a dependency for a process, then the process would start with `$LIBRARY_PATH` set to `/absolute/path/to/lib:/absolute/path/to/usr/lib` and `$PKG_CONFIG_PATH` would be set to `/absolute/path/to/lib/pkgconfig`.

You can use the `std.setEnv()` function to more easily build this directory structure:

```ts
return std.setEnv(recipe, {
  LIBRARY_PATH: [{ path: "lib" }, { path: "usr/lib" }],
  PKG_CONFIG_PATH: { path: "lib/pkgconfig" },
});
```

If multiple dependencies set the same env vars are used (or two dependencies merged together with `std.merge()`), then the env vars will be set from all of the dependencies.

### Implicit `$PATH`

If a dependency includes a `bin/` directory, then it will be implicitly added to `$PATH` automatically. The dependency can add additional directories to `$PATH` explicitly as well (e.g. using `std.setEnv`), and the values will be concatenated together with `:`.
