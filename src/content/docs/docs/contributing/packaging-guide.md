---
title: Packaging Guide
---

Packages in Brioche are managed in the [Brioche Packages repo](https://github.com/brioche-dev/brioche-packages). Packages are built automatically using a CI workflow, and are ultimately published to the [the registry](/docs/core-concepts/registry).

The basic workflow to add a new package is:

1. Clone the Brioche Packages repo: <https://github.com/brioche-dev/brioche-packages>
2. Create a new directory for the package with a `project.bri` file, e.g. `packages/my_package/project.bri`
3. Write the code to build the package!
4. Test it locally:
    - Build it: `brioche build -p packages/my_package`
    - Run it: `brioche run -p packages/my_package -- --help`
    - Run tests: `brioche build -p packages/my_package -e test`
    - Test that live updates work: `brioche live-update -p packages/my_package`
5. Fork the repo and push the new package as a branch
6. Open a Pull Request to add the package

## Package naming

Each package is a directory under `packages/`, named the same as the package name. A few rules:

- **All packages must use alphanumeric and underscore names, no dashes!** (This will likely change in the future, see [`brioche-dev/brioche#321`](https://github.com/brioche-dev/brioche/issues/321))
- **The `export const project` `name` field must match the directory name** (We don't have a lint for this today! See [`brioche-dev/brioche#67`](https://github.com/brioche-dev/brioche/issues/67))
- There's no shortage of naming collisions between software projects! Consult [Repology](https://repology.org/) to get a sense of how packages are named across different package manager repositories.

## Package structure

Here's the basic scaffolding of a `project.bri` file for a package, annotated to explain each piece:

```typescript
// Import other packages as dependencies
import * as std from "std";

// Define project metadata (must have `name` and `version`!)
export const project = {
  name: "my_package", // TODO: Package name
  version: "0.0.0", // TODO: Latest version
  repository: "https://example.com", // TODO: Repository URL
};

// Get package source via git (can also use `Brioche.download` to
// fetch via URL)
// TODO: Update this to reflect actual package source!
const source = Brioche.gitCheckout({
  repository: project.version,
  ref: `v${project.version}`, // e.g. checkout tag based on version
})

// The main function to build the package.
//
// We use the convention "export default function <projectName>()".
// - "export default" means this is used for the main build
// - "myProject" is purely local to the current file!
export default function myProject(): std.Recipe<std.Directory> {
  // TODO: Fill this out!
}

// A "build script" to validate that the package works properly.
//
// This build is called automatically during CI to catch regressions. Often,
// this will be a simple use of any binaries, such as checking that the
// version returned by `--version` matches the version from the metadata.
export async function test(): Promise<std.Recipe<std.File>> {
  // Example: call `--version` and save the output to a file.
  const script = std.runBash`
    my-project --version | tee "$BRIOCHE_OUTPUT"
  `
    .dependencies(myProject) // Note that this uses the main build above!
    .toFile();

  // Read the output of the build script
  const result = (await script.read()).trim();

  // Make assertions based on the output
  // Check that the result contains the expected version
  const expected = `my-project version ${project.version}`;
  std.assert(
    result.startsWith(expected),
    `expected '${expected}', got '${result}'`,
  );

  // NOTE: For... reasons, this function should return a recipe today!
  return script;
}

// Define the live-update script for this package.
//
// This function returns a small helper script, which gets the latest
// version of the package. This is used to automatically create a PR whenever
// a new version comes out!
export async function liveUpdate(): Promise<std.Recipe<std.Directory>> {
  return std.liveUpdateFromGithubReleases({ project });
}
```

## Package build

The `export default function ...` part is where the actual package build is defined. This should be a function that returns `std.Recipe<std.Directory>`-- a directory recipe.

### General info

The directory returned from a build should usually have some of these folders:

- `bin/`: Executables. This directory is added to `$PATH` when used as a dependency!
- `lib/`: Shared / static libraries (["Post-processing"](#post-processing))
- `lib/pkgconfig/`: pkg-config files (["Post-processing"](#post-processing))
- `share/pkgconfig/`: Another path for pkg-config files (["Post-processing"](#post-processing))
- `share/man/`: Manpages (["Post-processing"](#post-processing))
- `include/`: C/C++ header files (["Post-processing"](#post-processing))
- `brioche-env.d/`: Extra metadata about env vars to set for Brioche
- `brioche-run`: A symlink to the main executable to run with `brioche run`

### Make / autotools

Good example packages:

- [`htop`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/htop/project.bri)
- [`iperf3`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/iperf3/project.bri)
- [`jq`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/jq/project.bri)

```typescript
import * as std from "std";

export default function myPackage(): std.Recipe<std.Directory> {
  return std.runBash`
    ./configure --prefix=/
    make -j "$(nproc)"
    make install DESTDIR="$BRIOCHE_OUTPUT"
  `
    .workDir(source)
    .dependencies(std.toolchain)
    .toDirectory()
    .pipe((recipe) => std.withRunnableLink(recipe, "bin/my-package"));
}
```

### Rust / Cargo

Good example packages:

- [`ripgrep`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/ripgrep/project.bri)
- [`oha`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/oha/project.bri)
- [`tokei`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/tokei/project.bri)

```typescript
import * as std from "std";
import { cargoBuild } from "rust";

export default function myPackage(): std.Recipe<std.Directory> {
  return cargoBuild({
    source,
    runnable: "bin/my-package", // Default executable to run
  });
}
```

### Go

Good example packages:

- [`tenv`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/tenv/project.bri)
- [`asdf`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/asdf/project.bri)
- [`tofu`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/opentofu/project.bri)

```typescript
import { goBuild } from "go";

export default function myPackage(): std.Recipe<std.Directory> {
  return goBuild({
    source,
    buildParams: {
      ldflags: ["-s", "-w", "-X", `main.version=${project.version}`],
    },
    path: "./cmd/my-package",
    runnable: "bin/my-package", // Default executable to run
  });
}
```

### Node.js (JavaScript)

Good example packages:

- [`cspell`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/cspell/project.bri) (`npmInstallGlobal`)
- [`markdownlint_cli`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/markdownlint_cli/project.bri) (`npmInstallGlobal`)
- [`renovate`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/renovate/project.bri) (`pnpmInstall`)

Different Node.js-based projects may have different requirements. Most commonly, we use `npmInstallGlobal` to install Node.js packages via NPM if possible (similar to using `npm install -g`). Some packages may require pnpm rather than NPM, so there are also utilities in the `pnpm` package for using pnpm instead.

```typescript
import { npmInstallGlobal } from "nodejs";

export const project = {
  // ...
  extra: {
    packageName: "my-package", // NPM package name (can be used for live updates)
  },
};

export default function myPackage(): std.Recipe<std.Directory> {
  return npmInstallGlobal({
    packageName: project.extra.packageName,
    version: project.version,
  }).pipe((recipe) => std.withRunnableLink(recipe, "bin/my-package"));
}
```

### Python

Good example packages:

- [`aws_cli`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/aws_cli/project.bri)
- [`meson`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/meson/project.bri)
- [`mitmproxy`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/mitmproxy/project.bri)

Python-based packages vary a lot in terms of how they're built! There are still many projects in the wild that provide a `requirements.txt` file without specific versions, hashes, or a lockfile. For reliability, packages in this camp will need to take special care to lock down the requirements as much as possible-- sometimes even shipping our own more specific `requirements.txt` file.

(This space intentionally left blank! At the time of writing, we don't have many Python packages, and it'll be hard to generalize what a good minimal example function would look like.)

### CMake

Good example packages:

- [`blake3`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/blake3/project.bri)
- [`ninja`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/ninja/project.bri)
- [`pstack`](https://github.com/brioche-dev/brioche-packages/blob/main/packages/pstack/project.bri)

```typescript
import { cmakeBuild } from "cmake";

export default function myPackage(): std.Recipe<std.Directory> {
  return cmakeBuild({
    source,
    dependencies: [std.toolchain],
    set: {
      // Any CMake variables to set
    },
    runnable: "bin/pstack",  // Default executable to run
  });
}
```

## Post-processing

**Be aware that some packages may require some manual post-processing!** Here are some examples:

- Most packages should use `std.withRunnableLink` (or equivalent langauge-specific helper) to set a "main" executable. This will be used when the package is run with `brioche run`. See also: ["Runnables"](/docs/core-concepts/runnables)
- If a package includes pkg-config files (under `lib/pkg-config` or `share/pkg-config`), you should use `std.pkgConfigMakePathsRelative` to patch them for portability
- If a package includes libtool archives (`lib/**/*.la`), you should use `std.libtoolSanitizeDependencies` to patch them for portability
- If a package includes libraries, headers, pkg-config files, libtool archives, manpages, or other common resources, you should use `std.setEnv` to set env vars so these resources are discovered when the package is used as a dependency (but _not_ `bin/`, as this is handled automatically for `$PATH`). Common env vars to set:
  - `LIBRARY_PATH`
  - `CPATH`
  - `PKG_CONFIG_PATH`
  - `CMAKE_PREFIX_PATH`


## Debugging tips

When a build fails, you'll get a path back like `~/.local/share/brioche/.../events.bin.zst`. This is Brioche's custom event format, and can be used for different things:

- View full build log: `brioche jobs logs /path/to/events.bin.zst`
- Attach a shell to the sandbox of the failed build: `brioche jobs debug-shell /path/to/events.bin.zst`

(**Cursed knowledge**) At the time of writing, the directory containing the `events.bin.zst` will also have a `root` directory beside it, which is the root of the Brioche sandbox. If you poke around this directory, you can view or edit files from the build! This can be useful if you want to use a local text editor, rather than being limited to the tools within the sandbox. (Note that this is kinda hacky and could change at any time though!)

`strace` can be invaluable for figuring out what's causing a build to fail. The output from `strace` or [`systrument`](https://github.com/kylewlacy/systrument) (a light wrapper for `strace`) can sometimes help find a "smoking gun". For example, spotting a critical "File not found" error (`ENOENT`) at the end of a build can help work out a required library that couldn't be found.
