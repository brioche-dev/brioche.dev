---
title: Recipes
---

A **recipe** is a value that describes how to build an [artifact](/docs/core-concepts/artifacts). Recipes can span from "create a file containing this string" to "save the output from running these Bash commands". Many recipes take other recipes as input, which can represent very complex build pipelines as a big tree of steps needed for the build.

To do anything useful, a recipe must be [baked](/docs/core-concepts/baking), which evaluates it and returns the resulting artifact.

Every artifact is itself a recipe-- when baked, it just returns itself.

Recipes are **immutable**. There are several utilities that work with recipes, but these will return new, modified recipes, leaving the originals unchanged. For example, calling [`.remove()`](#directoryremove) on a recipe will return a new recipe that has the item removed, leaving the original recipe unchanged.

## `std.Recipe`

In the Brioche standard library (the `std` package), the type `std.Recipe` represents a recipe. This type also takes an optional generic to specify what kind of artifact the recipe bakes into:

- `std.Recipe`: Bakes into a file, directory, or symlink artifact
- `std.Recipe<File>`: Bakes into a file artifact
- `std.Recipe<Directory>`: Bakes into a directory artifact
- `std.Recipe<Symlink>`: Bakes into a symlink artifact
- `std.Recipe<File | Directory>`: Bakes into either a file _or_ directory artifact
- ...etc.

Recipes have a few utility methods that work with any recipe, but there are also some specific utility methods that are only available for specific types of recipes. For example, [`.get()`](#directoryget) only makes sense for directory recipes, so this method won't be available for other types of recipes. If you want to cast a recipe to a more specific type, use the [`.cast()`](#artifactcast) method.

## `std.file`

Takes a string or `Uint8Array` and bakes to a file artifact containing the specified contents.

```ts
std.file("hello world!");
```

## `std.directory`

Takes an object that associates filenames with recipes, and bakes to a directory artifact. Inner recipes are baked recursively and lazily.

```ts
std.directory({
  "hello.txt": std.file("hello world!"),
});
```

## `std.symlink`

Returns a symlink artifact with the specified target file.

```ts
std.symlink("../hello.txt");
```

## `std.merge`

Bakes to a directory artifact that merges together two or more directory recipes. Directories are merged recursively. The rightmost directory take precedence.

```ts
// Returns a directory containing `hello.txt` and `world.txt`
std.merge(
  std.directory({
    "hello.txt": std.file("hello!"),
  }),
  std.directory({
    "world.txt": std.file("world!"),
  }),
);
```

## `std.download`

Bakes to a file containing the contents of the specified URL. A hash must be specified explicitly, and will be validated when the URL is downloaded.

```ts
std.download({
  url: "https://gist.githubusercontent.com/kylewlacy/c0f1a43e2641686f377178880fcce6ae/raw/f48155695445aa218e558fba824b61cf718d5e55/lorem-ipsum.txt",
  hash: std.sha256Hash(
    "642e3f58cc2bcc0d12d2e1e21dd9ea131f058a98e23e9beac79881bb0a324d06",
  ),
});
```

## `std.process`

A low-level utility that creates a recipe to run a process. Generally, you'll call another function that wraps `std.process` under the hood.

Takes an object with options for spawning the process:

- `command` (required): The command to run
- `args`: Command-line arguments to invoke the process with
- `env`: An object containing extra environment variables to pass to the process. A minimal set of environment variables is included by default
- `dependencies`: An array of recipes to include in the process's environment when run. Binaries and environment variables will be set based on all dependencies (see ["Process Dependencies"](/docs/how-it-works/process-dependencies))
- `workDir`: The process starts by default in an empty working directory. Set this to a directory recipe to pre-populate the process's working directory when it starts
- `outputScaffold`: The path `$BRIOCHE_OUTPUT` initially doesn't exist when the process starts, and must be written to before the process exits in order to succeed. Set `outputScaffold` to any recipe to initialize this output path with some sort of contents. This is useful to run a command like `sed -i` that modifies its output contents in place, or to run a command like `gcc` to let it output directly into a `bin/` directory
- `unsafe`: Opt-in to certain unsafe features (see ["Unsafe processes"](/docs/how-it-works/sandboxing#unsafe-options))

The values for `commands`, `args`, and `env` can be passed as plain strings or using **process templates**, created with `std.tpl`. Recipes can be interpolated in the template, which will automatically bake the recipe before the process starts, then will resolve to a path containing the recipe's output artifact.

See ["Sandboxing"](/docs/how-it-works/sandboxing) for more details about how processes are run and what they have access to.

```ts
// Will run a bash script. The command template expands to a path to run `bin/bash` within the recipe returned by `std.tools()`
std.process({
  command: std.tpl`${std.tools()}/bin/bash`,
  args: ["-c", 'echo hello > "$BRIOCHE_OUTPUT"'],
});
```

The return value of `std.process()` has additional utility methods to change the options for the process as it runs. Just like other recipe utilities, the original process is immutable and these methods return copies.

```ts
// Start with a bash script
const process = std.process({
  command: std.tpl`${std.tools()}/bin/bash`,
  args: ["-c", 'echo "$PATH" > "$BRIOCHE_OUTPUT"'],
});

// Add more dependencies to the process. These changes
// only affect `newProcess`, not `process`
const newProcess = process.dependencies([nodejs(), rust()]);
```

## `std.sync`

Sync a recipe to the [registry](/docs/core-concepts/registry) explicitly. This is a fairly low-level tool that is only used for optimizing the time to sync from the registry.

Normally, only the intermediate recipes of a build are synced to the registry, as doing so allows for better cache reuse for partial rebuilds and reduces the storage use for the registry.

You can wrap any recipe with `std.sync` to sync it to the registry too (the intermediate recipes will still be synced). This will use more storage in the registry and will take longer to sync to the registry, but can speed up the time to sync complex recipes from the registry.

```ts
const hello = std
  .process({
    command: std.tpl`${std.tools()}/bin/bash`,
    args: ["-c", 'echo hello > "$BRIOCHE_OUTPUT/hello.txt"'],
    outputScaffold: std.directory(),
  })
  .cast("directory");
const world = std
  .process({
    command: std.tpl`${std.tools()}/bin/bash`,
    args: ["-c", 'echo hello > "$BRIOCHE_OUTPUT/world.txt"'],
    outputScaffold: std.directory(),
  })
  .cast("directory");

// `merged` gets synced to the registry, meaning users can
// fetch it directly without first fetching the recipes
// `hello`, `world`, or `std.tools()`
const merged = std.sync(std.merge(hello, world));
```

## `Recipe.cast`

Lazily cast a recipe from one type to another. Returns an error when baked if the recipe doesn't match the casted type. Effectively, this acts as a sort of assert that the recipe matches the expected type.

This is useful because recipes like `std.process()` could return any kind of artifact, and so some utility methods cannot be accessed without casting first.

```ts
// A process can return any type, but we know this will output a file
const recipe: std.Recipe = std.process({
  command: std.tpl`${std.tools()}/bin/bash`,
  args: ["-c", 'echo hello > "$BRIOCHE_OUTPUT"'],
});

// Cast it to a file explicitly using `.cast("file")`
const file: std.Recipe<std.File> = recipe.cast("file");

// Now we can use file-specific utility methods
const executableFile = file.withPermissions({ executable: true });
```

## `Recipe.bake`

Eagerly [bake](/docs/core-concepts/baking) a recipe, returning a `Promise<Artifact>`.

Calling `.bake()` manually should be a pretty rare occurrence. Brioche implicitly bakes the recipe returned when calling `brioche build`, so this is only needed when an artifact needs to be interacted with directly within the build script.

```ts
const artifact = await std
  .file(
    std.indoc`
      #!/usr/bin/env bash
      echo hello world!
    `,
  )
  .bake();
```

## `File.withPermissions`

Returns a new recipe that bakes to a file with the same contents, but with different permissions set.

```ts
std
  .file(
    std.indoc`
      #!/usr/bin/env bash
      echo hello world!
    `,
  )
  .withPermissions({ executable: true });
```

## `File.unarchive`

Unarchive a (possibly compressed) archive of a directory, such as a `.tar.gz` file.

Calling `.unarchive()` is pretty limited. If you need more advanced unarchiving options, consider using a process or Bash script to call a program such as `tar` directly instead.

```ts
std
  .download({
    url: "https://development-content.brioche.dev/linuxfromscratch.org/v12.0/packages/bash-5.2.15.tar.gz",
    hash: std.sha256Hash(
      "13720965b5f4fc3a0d4b61dd37e7565c741da9a5be24edc2ae00182fc1b3588c",
    ),
  })
  .unarchive("tar", "gzip");
```

## `File.readBytes`

Read the contents of a file into a `Uint8Array`. Implicitly calls [`.bake()`](#artifactbake). See [`File.read`](#fileread) to read a string instead.

## `File.read`

Read the contents of a file as a UTF-8 string. Implicitly calls [`.bake()`](#artifactbake). Throws an exception if the file was not valid UTF-8.

```ts
const content = await std.file("hello!").read();
// "hello!"
```

## `Directory.get`

Returns a recipe that retrieves the given path from the artifact. Fails if the path is not valid or descends into a non-directory artifact.

```ts
std
  .directory({
    hello: std.directory({
      "world.txt": std.file("hello world!"),
    }),
  })
  .get("./hello/world.txt");
```

## `Directory.insert`

Returns a new recipe with a new artifact inserted at the provided path. If the path already exists, it will be replaced. Fails if the path is not valid or descends into a non-directory artifact.

```ts
// Start with a directory containing `hello/world.txt`
const directory = std.directory({
  hello: std.directory({
    "world.txt": std.file("hello world!"),
  }),
});

// `newDirectory` is the same as `directory`, except it also contains `hello/universe.txt`
const newDirectory = directory.insert(
  "hello/universe.txt",
  std.file("hello universe!"),
);
```

**Note**: Be sure you use the return value of the call to `.insert()` instead of the original! `.insert()` returns a new recipe, leaving the original unchanged.

<!-- TODO: Use a component to highlight this block specially, so it's clear that it's not a working example -->

```
const directory = std.directory();

// INVALID! This returns a new recipe, which is ignored
directory.insert("hello.txt", std.file("hello world"));

// This will still return an empty directory
return directory;
```

## `Directory.remove`

Returns a new recipe that removes the artifact from the provided path. Fails if the path is not valid or descends into a non-directory artifact. If the path doesn't exist in the directory, then the newly-returned directory is unchanged.

```ts
// Start with a directory containing `hello/world.txt`
const directory = std.directory({
  "hello": std.directory({
    "world.txt": std.file("hello world!"),
  }),
});

// `newDirectory` is left with just an empty `hello` directory
const newDirectory = directory.remove("hello/world.txt"));
```

**Note**: Be sure you use the return value of the call to `.remove()` instead of the original! `.remove()` returns a new recipe, leaving the original unchanged.

<!-- TODO: Use a component to highlight this block specially, so it's clear that it's not a working example -->

```
const directory = std.directory({
  "hello.txt": std.file("hello world!"),
});

// INVALID! This returns a new recipe, which is ignored
directory.remove("hello.txt");

// This directory will still contain "hello.txt"
return directory;
```

## `Directory.peel`

If a directory only contains a single inner directory, return a recipe that just extracts this inner directory. Can also be called with an argument to specify the number of times to repeat this peeling process (the default value is `1`). Fails if a peeled directory does not contain exactly one directory artifact entry.

This is mostly useful for tarballs, which can sometimes contain a top-level directory named after the tarball itself.

```ts
// Bakes to the inner directory, containing just `world.txt`
std
  .directory({
    hello: std.directory({
      "world.txt": std.file("hello world!"),
    }),
  })
  .peel();
```
