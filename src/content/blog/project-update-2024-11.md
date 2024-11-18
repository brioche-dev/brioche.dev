---
title: Brioche Project Update - November 2024
pubDate: 2024-11-17T23:53:23-08:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

The last month (and change) has been one of rabbit holes!

## Package updates

Since the last update, there were 11 new packages:

- `tcpdump`
- `libpcap` (thanks to [**@jaudiger**](https://github.com/jaudiger) for laying out the groundwork!)
- `python`
- `sqlite`
- `wasmtime`
- `asciinema`
- `libxml2`
- `libxslt`
- `moreutils`
- `zx` (thanks [**@asheliahut**](https://github.com/asheliahut)!)
- `amber` (thanks [**@asheliahut**](https://github.com/asheliahut)!)
- `fd` (thanks [**@asheliahut**](https://github.com/asheliahut)!)

Python was a big milestone! It was quite fun to puzzle out how package builds look when using Python. You can see [`asciinema`](https://github.com/brioche-dev/brioche-packages/blob/e49e2961f463ebd2d017b7dbda64dd1032b4c5f9/packages/asciinema/project.bri) for what a Python-based build looks like (although projects using Poetry/uv/pyenv/etc will probably end up being quite different-- `asciinema` just uses pure Python and pip)

`moreutils` proved to be a surprising challenge-- it's simple on the surface but it turned out to be hard specifically due to how docs are built. I needed to figure out what an ["XML catalog"](https://en.wikipedia.org/wiki/XML_catalog) was, which I used to create [this ~monstrosity~ beautiful inline XML file](https://github.com/brioche-dev/brioche-packages/blob/e49e2961f463ebd2d017b7dbda64dd1032b4c5f9/packages/moreutils/project.bri#L70) directly in the package definition. ~~(next up: adding JSX support for defining inline XML files more easily in Brioche?)~~

## std updates

There were a few disperate changes in `std` since last update. Full changes in [the changelog](https://github.com/brioche-dev/brioche-packages/blob/main/packages/std/CHANGELOG.md#2024-10-12).

There was a breaking change around the `std.process()` function-- the `unsafe` options have been reorganized to be more composable. The `rust` package is now taking advantage of this as of [brioche-dev/brioche-packages#123](https://github.com/brioche-dev/brioche-packages/pull/123), where it passes through all unsafe options directly to the underlying `std.process()`.

There were also two new functions used to create ["runnables"](https://brioche.dev/docs/core-concepts/runnables/) (this also included a minor breaking change around process template symbols). The new functions `std.withRunnable()` and `std.addRunnable()` provide a nice alternative to the very bare-bones `std.withRunnableLink()` function, and the heavy-handed `std.bashRunnable` template function that pulls in Bash as a dependency.

Finally, there were a few minor changes around the toolchain to sand off a few more sharp edges:

- Fix typo in `$PERL5LIB` env var
- Fix broken library symlinks
- Patch `pkg-config` files to use relative paths. We'll probably want to provide a general mechanism for this, but for now it's been copy/pasted to a few other packages (see [brioche-dev/brioche-packages#135](https://github.com/brioche-dev/brioche-packages/issues/135))
- Set `$BISON_PKGDATADIR` to fix Bison
- Set some more symlinks and env vars so more autotools builds "just work"

## Brioche core updates

Okay, here's where things get exciting (and also a little complicated!)

This cycle, I've been interested in improving developer ergonomics in preparation to start on cross-platform builds, so I wanted to revisit some of the minor pain points in the flow for building and debugging packages before embarking on that journey.

### New console output

I was getting pretty tired of the "pretty" output that the CLI currently uses... so I redesigned it!

Here's a side-by-side between the current version in Brioche v0.1.3 and the new one as of [brioche-dev/brioche#137](https://github.com/brioche-dev/brioche/pull/137):

<div class="flex flex-col gap-x-4 content-between md:flex-row md:relative md:p-8 md:extrawide">
  <div class="flex-1">
    <a href="https://asciinema.org/a/9W15OfFdkIljSS2tVrIlWKIlX" class="text-center block">Before</a>
    <script src="https://asciinema.org/a/9W15OfFdkIljSS2tVrIlWKIlX.js" id="asciicast-9W15OfFdkIljSS2tVrIlWKIlX" async="true"></script>
  </div>
  <div class="flex-1">
    <a href="https://asciinema.org/a/681816" class="text-center block">After</a>
    <script src="https://asciinema.org/a/681816.js" id="asciicast-681816" async="true"></script>
  </div>
</div>

(You can probably guess why I added the `asciinema` package recently!)

I find the new output much easier to scan personally. The new output also uses a higher framerate, which makes it "feel" faster-- to my eyes at least.

### New process logging

When a build fails in Brioche v0.1.3, you get a _very_ ugly error message:

```console
Error: process failed, view full output from these paths:
- /home/user/.local/share/brioche/process-temp/01JCYBMMGZ5QJD61R5Z0H7WZCQ/stdout.log
- /home/user/.local/share/brioche/process-temp/01JCYBMMGZ5QJD61R5Z0H7WZCQ/stderr.log: process exited with status code exit status: 1
```

The file paths listed though are pretty helpful! You can see the full stdout/stderr of the failed process (and pro tip: the directories containing those files contain the build's working directory, making it easy to find things like `config.log` files). Lots of process write to both stdout and stderr, but since they get written to separate files, these logs are _lossy_, since you lose how the messages get interleaved. In practice, this just makes trawling through failed logs harder than it should be.

As of [brioche-dev/brioche#138](https://github.com/brioche-dev/brioche/pull/138), the error message is... still pretty ugly, but more useful!

```console
Error: process failed, view full output by runing `brioche jobs logs /home/user/.local/share/brioche/process-temp/01JCYC3PN9QHFJDD6R41KRTDMB/events.bin.zst`: process exited with status code exit status: 1
```

As hinted by the error message, the separate stdout and stderr files have been replaced with a new mysterious `events.bin.zst` file, _ooh!_ This is a pretty simple (binary) file format that includes _both_ stdout and stderr, but with lots of fancy bells and whistles:

- stdout and stderr are interleaved, but each chunk is tagged to indicate which stream it's from
- Each chunk includes a timestamp
- There's an event that includes the process exit code at the end (also timestamped)
- There's an event at the start with lots of metadata about the build, including a stack trace

If we run the suggested `brioche jobs logs` command, we get a pretty detailed output:

```console
$ brioche jobs logs /home/user/.local/share/brioche/process-temp/01JCYC3PN9QHFJDD6R41KRTDMB/events.bin.zst
process stack trace:
- file:///home/user/.local/share/brioche/projects/97beeb18f169ced9073a4f542f4195ef675ca4b1407170a247485c21545987bf/extra/run_bash.bri:42:14
- file:///home/user/example-project/project.bri:4:21

[0.00s] [spawned process with pid 109069, preparation took 0.01s]
[0.01s] uh oh, build failed
[0.01s] [process exited with code 1]
```

There's lots of untapped potential with the new process event format, but I'm pretty happy with this as a first pass! `brioche jobs` is an entirely new subcommand, and I think it'll be possible to add lots of handy new utilities for diving in when a build fails.

### Compression woes

Oh, also, you may have noticed the filename above was `events.bin.zst`, implying zstd ([Zstandard](https://facebook.github.io/zstd/)) compression. This is obviously good! If you have a long-running and verbose build that dumps a ton of output to stdout and stderr, compression can save a lot of disk space.

...but, I wanted to have my cake and eat it too. The new `brioche jobs logs` command also supports the flag `--reverse`, allowing you to print events starting from the end. For a super long build log, it'd be annoying to have to wait for the entire file to decompress just to show the last 100 or so log lines!

That's when I learned about the [zstd seekable format](https://github.com/facebook/zstd/tree/45fdc5f9e408f41f10e671c207cd424b20ce58f3/contrib/seekable_format), which basically chunks a zstd stream into multiple frames, and allows efficient seeking by only needing to decompress a particular frame: in the case of reading only a few lines starting from the end, you might only need to read the last frame for example (currently ~1MB of data). It's not a magic bullet though: dividing a stream into multiple frames does harm the compression ratio. But, in this case, I thought the trade-off was worth it.

Unfortunately, the zstd seekable format isn't yet supported in either the `zstd` or the `async-compression` Rust crates (it _should_ be decodable by any compliant decoder, but it wouldn't allow seeking and it wouldn't be possible to encode the seekable format without explicit support). So, I ended up writing the [`zstd-framed`](https://crates.io/crates/zstd-framed) crate to handle the compression and decompression with the seekable format. It should also gracefully handle edge cases, like if the process dies after having written a partial file, where it'll allow decoding even if the file wasn't closed properly during encoding. Good if, I dunno, your computer shuts down during a long-running build!

Anyway, the choice to use compression ended up stretching out development of the new process event format by several weeks, but I'm really happy with the end result!

## Extension updates

[**@asheliahut**](https://github.com/asheliahut) just published v0.2.0 of the `brioche-vscode` extension, and added a new GitHub Actions workflow to simplify publishing of future versions! The new release doesn't have any feature changes, but bumps the versions of various dependencies (and additionally now requires a newer version of VS Code, hence why it was a bump to v0.2.0).

Also, we published the VS Code extension in the [Open VSX Registry](https://open-vsx.org/extension/brioche-dev/brioche-vscode) (although at the time of writing, our namespace is not yet verified, track [this issue](https://github.com/EclipseFdn/open-vsx.org/issues/3124) for progress). This means you can now use Brioche in other VS Code-based editors, such as [VSCodium](https://vscodium.com/)!

## Infrastructure updates

In our homelab, we have an M1 Mac mini that has gone largely unused since we got it. I finally decided to provision it with [Asahi Linux](https://asahilinux.org/), which means I now have a powerful machine for doing native ARM64 Linux builds locally! This represents the first tangible work towards getting Brioche supporting cross-platform builds-- first up will be supporting _native_ ARM64 (aarch64) Linux builds, followed by supporting ARM64-to-x86_64 and x86_64-to-ARM64 cross builds. The Asahi-ified Mac mini will be how I'll work on builds, and it'll eventually become a GitHub Actions runner for the `brioche-packages` repo.

## Coming soon

Here's my shortlist of features that I'm semi-planning to work on soon:

- CMake!
- More work on improving the flow when debugging failed builds, including:
  - Different build ID format (we currently use ULID, which turns out to be counter-productive as it takes a lot of characters to disambiguate failed builds)
  - Command to show failed builds without using a full path, e.g. `brioche jobs logs $BUILD_ID`
  - Record failed builds in Brioche database, so we can easily clean old failed builds and to allow e.g. `brioche jobs logs last` to show the last failed build
  - Allow for starting a shell within a failed build to allow for debugging
- Look for low-hanging fruit to speed up build times. [brioche-dev/brioche#78](https://github.com/brioche-dev/brioche/issues/78) is the first candidate here
- Make some progress on ARM64 Linux toolchain builds
