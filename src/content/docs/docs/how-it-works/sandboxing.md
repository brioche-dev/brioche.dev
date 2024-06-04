---
title: Sandboxing
---

When you [bake](/docs/core-concepts/baking) a [process recipe](/docs/core-concepts/recipes#stdprocess), Brioche needs to run a command on your machine. But, Brioche aims to make builds as reliable as possible, and software is very messy and can do different things depending on what other software is installed on your machine or how your machine is set up! To try and make baking process recipes as reliable as possible, we run the process's command in a sandbox. In other words, we aim for builds to be [hermetic](https://bazel.build/basics/hermeticity). This doesn't _guarantee_ that the command will always work across different machines, but it helps to prevent some cases where a build can work on one machine but fail on another. "Works on your machine?" Well, it should work on mine, too!

> _**Warning**: Process sandboxing is not intended as a security feature! Do not run malicious programs within the sandbox. Malicious software within the sandbox could infect the host machine!_

Sandboxing works differently depending on the host platform, but there are some things a process can rely on when run:

- `$HOME` is set to a writable directory
- `$TMPDIR` is set to a writable directory
- The working directory starts in an empty directory within `$HOME`. This directory can be populated with contents by setting the `workDir` option when constructing the process recipe.
- `$BRIOCHE_OUTPUT` is set to a path that the process must write to before exiting (otherwise, baking the process will fail). Initially, this path does not exist, but this path can be populated by setting the `outputScaffold` option when constructing the process recipe (after which, the process can then modify the contents of this path).
- `$BRIOCHE_RESOURCE_DIR` is set to a writable directory. This is a special directory used for [packed executables](/docs/how-it-works/packed-executables).
- `$BRIOCHE_INPUT_RESOURCE_DIRS` is set to a colon-separated (`:`) list of readable directories. These directories are used for [packed executables](packed-executables).
- The `command`, `args`, and `env` options can take process templates (`std.tpl`). When these templates include a recipe, it will expand to an absolute path of the baked recipe's contents. You should assume these paths are read-only.

## Unsafe processes

Because builds are meant to be hermetic, Brioche will by default restrict processes from doing certain things out of the box that could break hermeticity, such as network access. In some cases, processes can opt in to some of these unsafe feature explicitly.

### Rules for unsafe

There aren't strict rules for whether the use of unsafe in Brioche is valid or invalid-- it's really dependent on context. But, in general, you should stay away from using unsafe to pull in resources that might change over time (where those changes could make your build valid or invalid). Builds are still cached based only on their inputs, so if a remote URL changes out from under you, for example, it's **your** responsibility to make sure both the old content and the new content are still valid inputs for your build!

- **Valid**: Using unsafe to clone a Git repo to check out a specific commit
- **Invalid**: Using unsafe to download the `main` branch of a repo to try and keep in sync with the latest source code
- **Valid**: Using unsafe to pull in Node.js dependencies based on a lockfile
- **Invalid**: Using unsafe to pull in Node.js dependencies without a lockfile and not isolating yourself from breaking changes from dependencies

### Unsafe options

You can enable unsafe by setting `unsafe: true` or by calling `.unsafe({ /* ... */ })` on a [process recipe](/docs/core-concepts/recipes#stdprocess). Here are the available unsafe options:

- `networking`: Enable direct network access through the host machine

## Platform details

Sandboxing is a higher-level concept, and how it's implemented varies between platforms.

### Linux

On Linux, processes are sandboxed using [Linux namespaces](https://man7.org/linux/man-pages/man7/namespaces.7.html) to isolate or control different parts of the environment when the process runs. This is the same feature used by Docker and Podman (and other projects) to implement containers on Linux.

On Linux, the sandbox will include executables at `/bin/sh` and `/usr/bin/env`. **You shouldn't rely on these paths for your process recipes where possible!**

```ts
// Wrong
std.process({
  command: "/bin/sh",
  args: ["-c", 'echo hi > "$BRIOCHE_OUTPUT"'],
});

// Right
std.process({
  command: std.tpl`${std.bash()}/bin/bash`,
  args: ["-c", 'echo hi > "$BRIOCHE_OUTPUT"'],
});
```
