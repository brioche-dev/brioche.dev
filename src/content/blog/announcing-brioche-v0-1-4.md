---
title: Announcing Brioche v0.1.4
pubDate: 2025-01-18
author: Kyle Lacy
authorUrl: https://kyle.space
---

[Brioche](https://brioche.dev/) is a new package manager and build tool that makes it easy to mix and match languages and tools for your own development projects.

Today marks the release of Brioche v0.1.4-- over 3 months in the making since our last release, and the fourth version after the [public release in July](https://brioche.dev/blog/announcing-brioche/)!

## New console output

My personal favorite feature, and the one that's most fun to show off, is the new TUI-style console output you see during a build. Compared to [the old console output](https://asciinema.org/a/9W15OfFdkIljSS2tVrIlWKIlX), the new format is colorful, cleaner, and more clearly organized. Plus, it runs at a higher refresh rate, so it _feels_ a lot snappier. And here's what it looks like:

<div>
  <script src="https://asciinema.org/a/681816.js" id="asciicast-681816" async="true"></script>
</div>

## New format for process failures

Nothing's worse than following along with the instructions on building a program from source, only to get a build error _despite_ doing everything the documentation says. Well, getting a build error and not being able to see what the error was might be worse...

Up until now, if a process recipe failed to bake, you'd get an error message helpfully pointing you to two files: `stdout.txt` and `stderr.txt`. As you might've guessed, these files contained the stdout and stderr streams of the failed process, respectively.

This definitely helped give _some_ context on what went wrong. But, since stdout and stderr were written separately, if a process interleaved messages on both streams, it might be impossible to figure out _when_ or _where_ an error happened. While Brioche would print a stack trace on failure, it didn't persist the stack trace anywhere, so working backwards from the files `stdout.txt` / `stderr.txt`, it could be hard to even find out _what_ failed!

In the latest release, build failures are definitely still painful, but a _little_ less. Now, Brioche records a bunch more details on process failure in a new combined file format:

- stdout and stderr get saved in the same file, preserving how output was interleaved
- Details about the failed process recipe are recorded, including a full stack trace of your `.bri` code
- We also save the process exit status and a timestamp for each output line for good measure
- Oh, and the new format is compressed! I even ended up writing a new Rust crate ([`zstd-framed`](https://crates.io/crates/zstd-framed)) to handle the compression while keeping the format seekable (which I wrote about in the [November Project Update](/blog/project-update-2024-11))

Anyway, the important part is, when a process fails, the error message will tell you to run a command like this: `brioche jobs logs /path/to/events.bin.zst`. If you do so, you'll see much more detail about the failed process than what you got before:

```console
$ brioche jobs logs /home/user/.local/share/brioche/process-temp/01JCYC3PN9QHFJDD6R41KRTDMB/events.bin.zst
process stack trace:
- file:///home/user/.local/share/brioche/projects/97beeb18f169ced9073a4f542f4195ef675ca4b1407170a247485c21545987bf/extra/run_bash.bri:42:14
- file:///home/user/example-project/project.bri:4:21

[0.00s] [spawned process with pid 109069, preparation took 0.01s]
[0.01s] uh oh, build failed
[0.01s] [process exited with code 1]
```

## CLI improvements

Like other package managers, several Brioche subcommands now have a `--locked` flag. This will prevent Brioche from updating your lockfile: if the lockfile is out of date, the command will instead error out. This is a perfect fit for CI/CD pipelines, where you want to make sure your lockfiles are committed to the repo properly.

Also, CLI commands take a new `--display` flag. With this, you can force Brioche to output plaintext only instead of using a TUI-style view (`--display plain`), or you can force it to output in TUI mode explicitly (`--display console`). Additionally, there's a brand new _reduced_ display mode (`--display plain-reduced`), which is the same as plaintext, except it's less verbose. We now use this in the `brioche-packages` repo to avoid outputting an absurd amount of text during the GitHub Actions build, and it might be a good choice any time you have an overly-noisy or long-running build.

## New recipe: `attach_resources`

This release includes a new `attach_resources` recipe. This is really a lower level tool that I don't really expect to be used outside the `std` package, but the goal is to help optimize how large recipes get served from the registry.

Okay, let's get in the weeds a little: [file artifacts](/docs/core-concepts/artifacts#files) can have a "resource directory" attached, where the contents of the directory will be "nearby" at runtime. This is a core ingredient for [packed executables](/docs/how-it-works/packed-executables).

The challenge is that resources are kinda lossy, and moving them into and out of processes can sometimes "lose" the resources if not handled properly. So, back in [Brioche v0.1.1](https://github.com/brioche-dev/brioche/releases/tag/v0.1.1), we added the new `collect_references` recipe, which basically collects all the resources used in a directory and puts them within a subdirectory named `brioche-resources.d`, then detaches the files from their resources. `attach_resources` is the inverse[^attach-resources-and-collect-references-naming]: given a directory, it looks for each file's resources by looking under `brioche-resources.d`, and reattaches them. Together, these can be used to round-trip a recipe into a tar file and back out again, preserving the recipes on either side.

So, circling back to speeding up registry syncs: [@pzmarzly](https://github.com/brioche-dev/brioche/issues/147) opened [#147](https://github.com/brioche-dev/brioche/issues/147) becuase, when trying to build one of the example projects, the initial registry sync took over 15 minutes! I had the idea to speed up the download of the `std.toolchain()` recipe by serving it as a single tar file, but to do so, Brioche needed a way to tar up a recipe and untar it _while keeping the references in tact_. With the new `attach_resources` recipe, this should be now be pretty easy!

## Packed builds of Brioche

[@matklad](https://github.com/matklad) opened [#51](https://github.com/brioche-dev/brioche/issues/51) following Brioche's public release, asking for a fully static build so it can work on non-glibc-based Linux distros-- and specifically for NixOS.

Not that long ago, I wrote about [how Brioche builds portable packages on Linux](/blog/portable-dynamically-linked-packages-on-linux), so it's a bit embarrassing that Brioche _itself_ wasn't distributed that way...

Well, as of this release, Brioche has its own `project.bri` and can build itself! The result is fully portable and should work on any x86-64 Linux system, including distributions without glibc installed globally like NixOS and Alpine Linux.

Shortly after the release goes live, I'll work on updating the Brioche install script. For starters, this packed build will be used as a fallback, and the default will still be to install the glibc-based executable. Packed builds **don't support automatic updates yet**, so there's more work to do.

In the coming release(s), I'm hoping to build on this work: add support for automatic updates, switch to the packed builds as the default, and offer a migration path for existing installations during automatic updates. But this first milestone should make it possible for more people to try out Brioche today!

## Linux sandboxing fallback with PRoot

Recently, I worked on upgrading all of our GitHub Actions pipelines from Ubuntu 22.04 to 24.04. I thought this would be frictionless, but I was very wrong...

In Ubuntu 23.10, [Ubuntu started restricting unprivileged user namespaces by default](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces), which is the basis for how [sandboxing](/docs/how-it-works/sandboxing) works on Linux. Ubuntu 24.04 [loosened the restrictions a little](https://ubuntu.com/blog/whats-new-in-security-for-ubuntu-24-04-lts#:~:text=22.04%20LTS.-,Unprivileged%20user%20namespace%20restrictions,-Unprivileged%20user%20namespaces), but the end result was that Brioche didn't work out of the box by default on Ubuntu 24.04.

For our internal GitHub Actions workflows, it was easy enough to use some `sysctl` commands to allow unprivileged user namespaces. For our public [`setup-brioche` action](https://github.com/brioche-dev/setup-brioche), we also now try to install an AppArmor profile if needed ([brioche-dev/setup-brioche#2](https://github.com/brioche-dev/setup-brioche/pull/2)), which should help avoid any issues for GitHub Actions workflows in most cases.

But for end users, I still wanted Brioche to work without any extra setup and without needing root to grant extra permissions. So now, Brioche will try to detect if it's able to use namespaces for sandboxing-- the same as before. If that doesn't work, it'll now fallback to sandboxing using namespaces along with [PRoot](https://proot-me.github.io/) (as introduced by [#159](https://github.com/brioche-dev/brioche/pull/159)). Failing that, it'll return an error. Using PRoot does come with a notable performance impact (see [this comment](https://github.com/brioche-dev/brioche/pull/159#issuecomment-2589262344)), so it prints a warning (by default) if it needs to be used. [You can also manually tweak the config for more control over sandboxing now](/docs/configuration#sandbox-configuration).

Despite the performance impact, I feel pretty good about falling back to PRoot, so Brioche works without any extra setup on Ubuntu 24.04 (I believe Ubuntu 23.10 _won't_ work, although I haven't tested it). And over time, Brioche will definitely gain more options for sandboxing, in order to balance the tradeoffs between performance, isolation, and host compatibility.

---

Anyway, Brioche v0.1.4 is live now! If you already have it installed, run `brioche self-update` and follow the prompts to update to the latest version. Or, if you haven't tried out Brioche yet, check out [installation options in the docs](/docs/installation).

Oh, and rolling out the new [packed builds](#packed-builds-of-brioche) will take a little extra work post-release, so keep an eye on the docs for additional information shortly.

Questions, help, and feedback are always welcome on Brioche's [GitHub](https://github.com/brioche-dev/brioche), [Discord](https://discord.gg/cw5QeWv4E5), and [Zulip](https://brioche.zulipchat.com/)!


[^attach-resources-and-collect-references-naming]: Yes, one of the recipes is named "collect _references_" and the other is named "attach _resources_", and these recipes are effectively opposites of each other. I don't like the split in the "references" / "resources" terminology, and I don't think "collect" and "attach" really make it clear these recipes are complimentary. I'd like to try to come up with better names in a future release (open to bike-shedding!)
