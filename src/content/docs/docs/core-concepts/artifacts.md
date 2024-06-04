---
title: Artifacts
---

An **artifact** is a value that represents the _output_ of a build: a file, a directory, or a symlink. You normally don't create artifacts directly, but instead by [baking](/docs/core-concepts/baking) a [recipe](/docs/core-concepts/recipes), which returns an artifact as an output. In the command `brioche build -o output`, the resulting artifact of the build is written to the path `output`.

Artifacts don't store general Unix permissions, timestamps, or other metadata that isn't strictly necessary. This is because Brioche will need to rebuild if either input artifacts or recipes change, and having extra metadata that may not be used during the build greatly increases the chances that the build will lead to a cache miss. If you need to preserve timestamps or other permissions in your build, you can use tarfiles to get a lot more control over what kind of metadata is preserved.

Every artifact is itself a kind of [recipe](/docs/core-concepts/recipes) (when [baked](/docs/core-concepts/baking), an artifact just evaluates to itself).

## Files

A file artifact contains a [blob hash](/docs/how-it-works/blobs) of the file's contents and an "executable" permission bit, plus an optional "resources" directory artifact.

When set, the "**resources**" directory for a file specifies a directory that the file expects to exist "nearby" at runtime. For a [packed ELF](/docs/how-it-works/packed-executables) file, for example, the "resources" directory would contain all of the dynamically linked libraries used by the program, structured in such a way that they can be found when the executable is run.

## Directory

A directory artifact contains an "entries" object, listing all the artifacts within the directory. Each key is the filename ([tick encoded](/docs/how-it-works/tick-encoding)), and the value is an [artifact hash](#artifact-hashes) of a file, directory, or symlink.

## Symlink

A symlink contains a "target" field, listing the filename the symlink should point to ([tick encoded](/docs/how-it-works/tick-encoding)). Symlinks should generally be relative paths, but they don't need to be.

## Artifact hashes

Artifacts are referred to by computing a hash from their JSON representation. Because an artifact is a special kind of recipe, an artifact hash is also a valid recipe hash.
