---
title: Portable, dynamically linked packages on Linux
pubDate: 2024-09-21T22:18:17+00:00
author: Kyle Lacy
authorUrl: https://kyle.space
---

Hey, want to see a magic trick? If you [have Brioche installed](https://brioche.dev/docs/installation/), you can run this command:

```sh
brioche build -r curl -o ./output
```

...to get a copy of curl! Like you can then run `./output/bin/curl --version` and it works!

> \*crickets\*

Okay, not impressed? Well, like all of the best magicians, I will now explain why this is a good trick:

1. The `output` directory contains every file we need to run curl
2. The underlying curl binary is dynamically linked against glibc
3. There are no containers up my sleeve[^the-container-up-my-sleeve-kinda]

Which means we can just put this directory _anywhere on the file system_ and it'll run... including in a container image. Presto, behold a `Dockerfile`!

```dockerfile
FROM scratch
COPY output /output
ENTRYPOINT [ "/output/bin/curl" ]
```

Save it as `Dockerfile` (or `Containerfile`), build it with Podman / Docker / etc, and it still runs, even in the completely barren [`scratch`](https://hub.docker.com/_/scratch) environment:

```shellsession
$ podman build . -t magic-trick
$ podman run --rm magic-trick --version
curl 8.8.0 (x86_64-pc-linux-gnu) libcurl/8.8.0 OpenSSL/3.3.1 zlib/1.2.13 zstd/1.5.5
Release-Date: 2024-05-22
Protocols: dict file ftp ftps gopher gophers http https imap imaps ipfs ipns mqtt pop3 pop3s rtsp smb smbs smtp smtps telnet tftp
Features: alt-svc AsynchDNS HSTS HTTPS-proxy IPv6 Largefile libz NTLM SSL threadsafe TLS-SRP UnixSockets zstd
```

Not just that, but the container we get out is actually pretty small[^small-container], since it's [distroless](https://github.com/GoogleContainerTools/distroless)!

## so? who cares??

Well, I care, for one! I'm a weirdo trying to build a package manager. And building a package manager means... putting packages on people's computers, so you need to figure out _where_ to put the package on the computer. Being able to put the package _anywhere_ makes it easier!

Let's look at those those 3 facts about this version of curl from before:

1. The `output` directory contains every file we need to run curl
2. The underlying curl binary is dynamically linked against glibc
3. There are no containers here

Depending on how much you know about dynamic linking, it should seem impossible for all 3 of these things to be true. Let's ignore the how for now and talk about **why I made it work this way**:

- **You shouldn't need root permissions to install Brioche or to install new packages**. Package managers usually install packages into a global, fixed directory (`/nix` for Nix, `/home/linuxbrew/.linuxbrew` for Homebrew), but that's just not an option if we want everything to work rootlessly. So we need to make everything portable so it works from anywhere on the filesystem
- **Brioche should be able to package software that uses glibc**. The obvious option would be to just use musl libc for everything, which makes it easier to do fully static builds. The problem is musl isn't a drop-in replacement for glibc: as an example, [musl's DNS resolution trips people up](https://purplecarrot.co.uk/post/2021-09-04-does_alpine-resolve_dns_properly/). I really wanted to support packages that wanted or needed to use glibc
- **Brioche packages shouldn't use containers at runtime**. [snap](https://snapcraft.io/), [Flatpak](https://flatpak.org/), and [AppImage](https://appimage.org/) all already use containers for packages, but I wanted to kick Brioche off with a focus on developer-facing CLI tools-- things that would be more awkward to try and use from a containerized environment. Since containers have their own view of the filesystem, using tools like `find`, `du`, etc. might not work like you expect! Plus, containers are a form of sandboxing and sandboxing is hard and I didn't want "solving sandboxing" to be a yak I needed to shave as a precursor[^sandboxing-future]

So hopefully you can see how the little party trick with curl came to be: to tick all the boxes for Brioche, I _had_ to make that trick work. Every package in Brioche works this way, too. You can just put any package into a directory somewhere on your filesystem, and it'll run entirely self-contained even for a completely bare-bones Linux setup

## Let's do it ourselves

So let's make our own portable package that checks all the same boxes that we get from Brioche. Let's start with a little Rust program to use as our candidate to package. First, run `cargo new lil-demo`, then `cd lil-demo`, then put this in `src/main.rs`:

```rust
// lil-demo/src/main.rs
fn main() {
    let location = std::env::current_exe().unwrap();
    println!("Hello from {}", location.display());
}
```

When a program calls [`std::env::current_exe()`](https://doc.rust-lang.org/stable/std/env/fn.current_exe.html), it gets the path to itself (yes, using this particular function is important, we'll come back to it later). If you run it with `cargo run`, you'll see some output like this:

```
Hello from /your/path/to/lil-demo/target/debug/lil-demo
```

Wait, actually, I should mention... I'm in an Ubuntu Linux environment, so by default Cargo dynamically links my `lil-demo` program against glibc. This is true for most Linux distros, but if yours is different, you might not be able to follow along.

### Finding all the dependencies

So we want to package our `lil-demo` up just like we had curl at the start. Remember, that means **we need to put all of its dependencies into a self-contained directory**. So, what does it depend on? Well, we can answer that using `ldd`:

```shellsession
$ ldd target/debug/lil-demo
linux-vdso.so.1 (0x00007ffd6c14a000)
libgcc_s.so.1 => /home/linuxbrew/.linuxbrew/lib/libgcc_s.so.1 (0x00007fa6b1856000)
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fa6b1620000)
/lib64/ld-linux-x86-64.so.2 (0x00007fa6b18d2000)
```

Each line is a dynamic library our `lil-demo` depends on, which shows the name of the library that the program asked for, then the location it actually loaded it from (the hex is the address it got loaded to but we don't care about that):

- `linux-vdso.so.1`: Okay, we start off with a free square! The ["vDSO"](https://man7.org/linux/man-pages/man7/vdso.7.html) is a special dynamic library provided by the Linux kernel itself, so it's not our responsibility to provide it
- `libgcc_s.so.1`: Provided by gcc, and I think Rust links against it for stack traces or something. It's a very common standard system library (don't ask why mine comes from Homebrew)
- `libc.so.6`: The main C library, glibc in my case. This is another system library
- `/lib64/ld-linux-x86-64.so.2`: Okay, this one's pretty complicated. This is the [dynamic linker](https://man7.org/linux/man-pages/man8/ld-linux.so.8.html). When you try to run `lil-demo`, the Linux kernel _actually_ calls this `ld-linux-x86-64.so.2` program instead (because its dynamically linked). It's job is to first find all the dynamic libraries `lil-demo` needs, load them into memory, then _really_ run `lil-demo`

As you might've guessed, the name of that last one in particular varies per platform, so I'm going to use the generic name of `ld-linux.so` when I talk about it instead.

### Setting up the portable directory

So in total, we need the `lil-demo` program itself, the 2 dynamic libraries it links against (not counting the "vDSO" one Linux gives us for free), and `ld-linux.so`, a.k.a. the dynamic linker. How do we combine these ingredients to make something portable?

Let's start with a little boilerplate first:

1. Make a new directory: `mkdir lil-demo-portable`
2. Copy `lil-demo` into it: `cp target/debug/lil-demo lil-demo-portable/`
3. Copy the 2 dynamic libraries and `ld-linux.so` into it too. These will be whatever paths you got from `ldd`. In other words, something like `cp /path/to/libgcc_s.so.1 /path/to/libc.so.6 /lib64/ld-linux-x86-64.so.2 ./lil-demo-portable/`
4. Create a new shell script at `lil-demo-portable/run.sh` with the following contents:

```sh
# lil-demo/lil-demo-portable/run.sh
#!/usr/bin/env bash

portable_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

exec "$portable_dir"/lil-demo
```

Then, mark the script as executable and run it:

```shellsession
$ chmod +x lil-demo-portable/run.sh
$ ./lil-demo-portable/run.sh
Hello from /your/path/to/lil-demo/lil-demo-portable/lil-demo
```

Okay, so the script is pretty straightforward: first, it [gets the directory containing the shell script itself](https://stackoverflow.com/a/246128) (meaning `lil-demo-portable/`). Then, it uses `exec` to run the original `lil-demo` binary that we copied in[^exec]. Unsurprisingly, we see the path of this copied binary!

Okay, we've finally set the stage to actually make `lil-demo` into a lil' _portable_ demo

### Wrapping the binary

When `lil-demo` runs, we want it to use the copied libraries from within `lil-demo-portable`. The easiest way is to set the env var `$LD_LIBRARY_PATH`. When it's set, `ld-linux.so` uses it as a place to find dynamic libraries, which is exactly what we want! Here's an updated `run.sh`:

```sh
# lil-demo/lil-demo-portable/run.sh
#!/usr/bin/env bash

portable_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
export LD_LIBRARY_PATH="$portable_dir"

exec "$portable_dir"/lil-demo
```

...basically, we just set `$LD_LIBRARY_PATH` to the directory containing the shell script itself. If we run `run.sh` again, the result is the same. But now, all the dynamic libraries get read directly from the `lil-demo-portable-dir`! Neat!

(If you want to see for yourself that libraries are now getting resolved correctly, change the last line of `run.sh` to `ldd "$portable_dir"/lil-demo`)

### Wrapping the dynamic linker, too

So we're running `lil-demo` from our portable directory, and we're even loading all the dynamic libraries we need from it to thanks to `$LD_LIBRARY_PATH`. That just leaves `ld-linux.so`. To recap, it's not a dynamic library itself, but it's the thing responsible for loading all the dynamic libraries.

When we run `lil-demo` (either directly or via `run.sh`), the Linux kernel doesn't actually run `lil-demo` directly. Instead, it checks the header of the file-- specifically, the `PT_INTERP` element from the program header of the ELF file-- sees that it points to `/lib64/ld-linux-x86-64.so.2`, and runs that instead.

In other words, this:

```shellsession
$ ./lil-demo-portable/lil-demo
```

...effectively becomes this:

```shellsession
$ /lib64/ld-linux-x86-64.so.2 ./lil-demo-portable/lil-demo
```

But we don't want it to become that! We _want_ it to call the `ld-linux.so` that's under `lil-demo-portable`!

...so instead, we can just call `ld-linux.so` directly ourselves. Here's an updated `run.sh`:

```sh
# lil-demo/lil-demo-portable/run.sh
#!/usr/bin/env bash

portable_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
export LD_LIBRARY_PATH="$portable_dir"

exec "$portable_dir"/ld-linux-x86-64.so.2 "$portable_dir"/lil-demo
```

We just changed the last line to execute `ld-linux.so` with `lil-demo` as an argument. And, we can run it and see it works just like before, just using our copy of `ld-linux.so` from the portable directory instead!

```shellsession
$ ./lil-demo-portable/run.sh
Hello from /your/path/to/lil-demo/lil-demo-portable/ld-linux-x86-64.so.2
```

...

...

...wait, something feels... off somehow? Do you feel it? Let's zoom and enhance:

```diff
-Hello from /your/path/to/lil-demo/lil-demo-portable/lil-demo
+Hello from /your/path/to/lil-demo/lil-demo-portable/ld-linux-x86-64.so.2
```

...the path changed from `lil-demo` to `ld-linux.so`???

### Checkov's path

Okay, remember a million words ago when I said [`std::env::current_exe()`](https://doc.rust-lang.org/stable/std/env/fn.current_exe.html) was going to be important later? Well later is now, and now we need to talk about it

How does `lil-demo` know where it is? ~~it knows where it is because it knows where it isn't~~ it knows where it is because it reads the path of the symlink `/proc/self/exe`[^proc-absolute-path], which is a special symlink that Linux sets up that _always refers to the current executable_.

For a demo that's kinda trippy, try this:

```shellsession
$ readlink /proc/self/exe
/usr/bin/readlink
```

When `readlink` reads the `/proc/self/exe` symlink, then _by definition_, it reads its own path, so it prints the path to `readlink` itself!

And of course, that's also exactly how [`std::env::current_exe()`](https://doc.rust-lang.org/stable/std/env/fn.current_exe.html) is implemented

So `/proc/self/exe` is some Weird Magic that gets controlled by the Linux kernel. It basically points to whatever file was passed to the underlying [`execve()` syscall](https://man7.org/linux/man-pages/man2/execve.2.html). Our shell script is now executing `ld-linux.so` instead of `lil-demo`, so that's what `/proc/self/exe` resolves to. And `ld-linux.so` then sets up and runs our program directly (i.e. no calls to `execve()`), so `/proc/self/exe` is "stuck" with `ld-linux.so` until the process ends or until it uses the `execve()` syscall itself

> Wait but why do we care so much about `/proc/self/exe`?

You'd be surprised how many programs will break if they don't get the right value for `/proc/self/exe`! The Rust compiler itself reads `/proc/self/exe` to resolve the path to the Rust standard library. Off the top of my head, I _believe_ both Node.js and gcc both read `/proc/self/exe` for resolving resources. It's just a pretty common thing that programs built for Linux end up depending on.

## Fixing `/proc/self/exe`

Okay, so we know `/proc/self/exe` is important, and we know we're now "breaking" it, in a sense. Let's step through how we got here

At first, we started with just calling `exec lil-demo`. The flow basically worked like this:

<svg class="w-full" viewBox="-0.5 -0.5 681 201">
  <title>Flow through the original lil-demo wrapper</title>
  <desc>Your shell calls run.sh using execve, which in turn calls lil-demo using execve. Indirectly, the call to lil-demo uses the PT_INTERP ELF header to find ld-linux.so, which then loads and executes lil-demo</desc>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="0" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 w-[78px] h-px pt-10 ml-px">your shell</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 80 40 L 193.63 40" stroke-miterlimit="10" />
    <path class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" d="M 198.88 40 L 191.88 43.5 L 193.63 40 L 191.88 36.5 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs  text-accent-600 dark:text-accent-200 font-mono size-px pt-5 ml-[138px]">execve()</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="200" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[201px]">run.sh</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 280 40 L 593.63 40" fill="none" stroke="rgb(0, 0, 0)" stroke-miterlimit="10" pointer-events="stroke"/>
    <path class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" d="M 598.88 40 L 591.88 43.5 L 593.63 40 L 591.88 36.5 Z" fill="rgb(0, 0, 0)" stroke="rgb(0, 0, 0)" stroke-miterlimit="10" pointer-events="all"/>
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 font-mono size-px pt-[21px] ml-[441px]">execve()</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 240 80 L 240 160 L 393.63 160" stroke-miterlimit="10" stroke-dasharray="8 8" />
    <path class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" d="M 398.88 160 L 391.88 163.5 L 393.63 160 L 391.88 156.5 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 size-px pt-[141px] ml-[321px]">
        <div>
          <div>ELF header</div>
          <div className="font-mono">PT_INTERP</div>
        </div>
      </div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="400" y="120" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-40 ml-[401px]">ld-linux.so</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 480 160 L 640 160 L 640 86.37" stroke-miterlimit="10" stroke-dasharray="8 8" />
    <path class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" d="M 640 81.12 L 643.5 88.12 L 640 86.37 L 636.5 88.12 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 whitespace-nowrap size-px pt-[144px] ml-[551px]">load and execute</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="600" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible text-left">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[601px]">lil-demo</div>
    </foreignObject>
  </g>
</svg>

The execution of `lil-demo` was implicitly calling `ld-linux.so` under the hood via the `PT_INTERP` ELF header.

In our latest version, we changed it to _explicitly_ call `exec ld-linux.so`, so we could use the dynamic linker from our portable bundle:

<svg class="w-full" viewBox="-0.5 -0.5 681 82">
  <title>Flow through the current lil-demo wrapper</title>
  <desc>Your shell calls run.sh using execve, which calls ld-linux.so using execve, which then loads and executes lil-demo</desc>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="0" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 w-[78px] h-px pt-10 ml-px">your shell</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 80 40 L 193.63 40" stroke-miterlimit="10" />
    <path class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" d="M 198.88 40 L 191.88 43.5 L 193.63 40 L 191.88 36.5 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 font-mono size-px pt-5 ml-[138px]">execve()</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="200" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[201px]">run.sh</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 280 40 L 393.63 40" />
    <path class="fill-accent-600 stroke-accent-600 dark:fill-accent-200 dark:stroke-accent-200" d="M 398.88 40 L 391.88 43.5 L 393.63 40 L 391.88 36.5 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 font-mono pt-5 ml-[345px] size-px overflow-visible">execve()</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="400" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[401px]">ld-linux.so</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 480 40 L 593.63 40" stroke-miterlimit="10" stroke-dasharray="8 8" />
    <path d="M 598.88 40 L 591.88 43.5 L 593.63 40 L 591.88 36.5 Z" class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 whitespace-nowrap size-px pt-5 ml-[540px]">load and execute</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="600" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[601px]">lil-demo</div>
    </foreignObject>
  </g>
</svg>

As we discussed before, `/proc/self/exe` is determined by the _last_ call to `execve()`. And we can see the path `ld-linux.so` → `lil-demo` does not use `execve()`. So if we want to un-break `/proc/self/exe`, we need to change our `execve()` calls! ...somehow

Maybe we could somehow change `ld-linux.so` itself? Like, if we could make it so the path `ld-linux.so` → `lil-demo` uses `execve()`, that could fix our problem? But remember, any time anything uses `execve()` to call `lil-demo`, the Linux kernel itself will do the little `ld-linux.so` → `lil-demo` dance for us, so we can't do that...

The actual fix we're going for is to change the `run.sh` → `ld-linux.so` path. Specifically, we're going to explicitly call `ld-linux.so` _without_ using `execve()`:


<svg class="w-full" viewBox="-0.5 -0.5 681 82">
  <title>Proposed lil-demo execution flow</title>
  <desc>Your shell calls run using execve, which then loads and executes ld-linux.so, which in turn loads and executes lil-demo</desc>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="0" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 w-[78px] h-px pt-10 ml-px">your shell</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 80 40 L 193.63 40" stroke-miterlimit="10" />
    <path class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" d="M 198.88 40 L 191.88 43.5 L 193.63 40 L 191.88 36.5 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 font-mono size-px pt-5 ml-[138px]">execve()</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="200" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[201px]">run</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 280 40 L 393.63 40" stroke-miterlimit="10" stroke-dasharray="8 8" />
    <path class="stroke-accent-600 fill-accent-600dark:stroke-accent-200 dark:fill-accent-200" d="M 398.88 40 L 391.88 43.5 L 393.63 40 L 391.88 36.5 Z" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 whitespace-nowrap pt-5 ml-[340px] size-px overflow-visible">load and execute</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="400" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[401px]">ld-linux.so</div>
    </foreignObject>
  </g>
  <g>
    <path class="stroke-accent-600 fill-none dark:stroke-accent-200" d="M 480 40 L 593.63 40" stroke-miterlimit="10" stroke-dasharray="8 8" />
    <path d="M 598.88 40 L 591.88 43.5 L 593.63 40 L 591.88 36.5 Z" class="stroke-accent-600 fill-accent-600 dark:stroke-accent-200 dark:fill-accent-200" stroke-miterlimit="10" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-600 dark:text-accent-200 whitespace-nowrap size-px pt-5 ml-[540px]">load and execute</div>
    </foreignObject>
  </g>
  <g>
    <rect class="stroke-accent-600 fill-accent-900" x="600" y="0" width="80" height="80" />
    <foreignObject class="size-full overflow-visible">
      <div class="flex items-center justify-center text-center text-xs text-accent-200 font-mono w-[78px] h-px pt-10 ml-[601px]">lil-demo</div>
    </foreignObject>
  </g>
</svg>

So how do we execute `ld-linux.so` without using `execve()`? How can we execute something without using the special "execute something" syscall??

The keyword we're looking for is called ["userland exec"](https://grugq.github.io/docs/ul_exec.txt). It's a technique for executing a program without involving the kernel. The core idea is not too complicated: Linux programs use the ELF file format, which contains a description the exact memory layout a program expects when it runs. So we just parse the program as an ELF file, read the memory layout, then directly jump to the program's start address.

<a href="https://fasterthanli.me/" class="no-underline hover:underline">fasterthanlime</a> has a blog post [describing exactly how to do that](https://fasterthanli.me/series/making-our-own-executable-packer/part-2) (part of a series of posts on building an executable packer), so be sure to give that a read if you want the fine details!

But _we're_ gonna take the lazy path. and uhh... this is also not something you could do from a shell script[^userland-exec-shell-script]. So we're gonna handle all this "userland exec" stuff in Rust. That'll also let us ~~cheat~~ leverage the breadth of Rust's package ecosystem by using the [`userland-execve`](https://crates.io/crates/userland-execve) crate, which will handle the raw assembly and pointer manipulation for us. We're not gonna get our hands _too_ dirty today.

### Rewriting it in Rust

Let's start first by porting our current shell script to Rust as-is. Let's set up a second crate next to our `lil-demo` crate (so if you're in the `lil-demo` directory still, run `cd ..`). Run `cargo new run` to create the crate, then put this in `run/src/main.rs`:

```rust
// run/src/main.rs
use std::os::unix::process::CommandExt as _;

fn main() {
    let current_exe = std::env::current_exe().unwrap();
    let portable_dir = current_exe.parent().unwrap();

    let ld_linux_so = portable_dir.join("ld-linux-x86-64.so.2");
    let lil_demo = portable_dir.join("lil-demo");

    let error = std::process::Command::new(ld_linux_so)
        .arg(lil_demo)
        .env("LD_LIBRARY_PATH", &portable_dir)
        .exec();
    panic!("failed to exec: {error}");
}
```

A few notes on this version:

- It uses [`std::env::current_exe()`](https://doc.rust-lang.org/stable/std/env/fn.current_exe.html) to find the "portable dir" path (equivalent to what we did in Bash)
- It builds a command to call `ld-linux.so`, with the path to `lil-demo` as an argument
- It sets `$LD_LIBRARY_PATH` to the portable dir for the command
- It uses the (Unix-only) [`.exec()`](https://doc.rust-lang.org/stable/std/process/struct.Command.html#method.exec) method, just like how we used `exec` in Bash. It's a little unintuitive, but this method _should never return_ (it only returns if there was an error, which is why there's a `panic!()` right after)

While in the `run` directory, use these commands to build it and put it in our `lil-demo-portable` directory (which is where `run` expects to be):

```shellsession
$ cargo build
$ cp target/debug/run ../lil-demo/lil-demo-portable/
```

Alright, now if we run our new `run` program, we should see the same output as when we ran `run.sh`:

```shellsession
$ ../lil-demo/lil-demo-portable/run
Hello from /your/path/to/lil-demo/lil-demo-portable/ld-linux-x86-64.so.2
```

### Userland or bust

We're ready to swap over to [`userland-execve`](https://crates.io/crates/userland-execve). Add it to your dependencies by running `cargo add userland-execve`, then update the code to use it:

```rust
// run/src/main.rs
use std::ffi::CString;

fn main() {
    let current_exe = std::env::current_exe().unwrap();
    let portable_dir = current_exe.parent().unwrap();

    let ld_linux_so = portable_dir.join("ld-linux-x86-64.so.2");
    let lil_demo = portable_dir.join("lil-demo");

    let ld_linux_so_cstr = CString::new(ld_linux_so.to_str().unwrap()).unwrap();
    let lil_demo_cstr = CString::new(lil_demo.to_str().unwrap()).unwrap();
    let ld_library_path_env = CString::new(format!(
        "LD_LIBRARY_PATH={}",
        portable_dir.to_str().unwrap()
    ))
    .unwrap();

    userland_execve::exec(
        &ld_linux_so,
        &[&ld_linux_so_cstr, &lil_demo_cstr],
        &[ld_library_path_env],
    );
}
```

So pretty similar structurally to the last one, except it uses `userland_execve::exec` to run now-- the first argument is the file to execute, the second are the args[^userland-args], and the third are the env vars[^userland-env-vars]


Rebuild the `run` executable again, copy it over, and watch the magic unfold:

```shellsession
$ cargo build
$ cp target/debug/run ../lil-demo/lil-demo-portable/
$ ../lil-demo/lil-demo-portable/run
Hello from /your/path/to/lil-demo/lil-demo-portable/run
```

It's now a _fully self-contained, portable Linux bundle_! If you put this `lil-demo-portable` directory on another Linux machine (of the same architecture), calling `run` will run the same even if it doesn't have glibc or any other libraries installed globally, or even if the dynamic linker is missing

Then, when `run` gets called, it'll _actually_ run `lil-demo`, which will _think_ it's own path is `run`

> wait but isn't this still wrong? don't we want it to think it's `lil-demo`? not `run`??

Ahh, well it's time to come clean...

## Revealing the secret

Okay, here was the little curl example from a billion miles up the page[^billion-miles]:

```shellsession
$ ./output/bin/curl --version
```

There was a little sleight of hand earlier... `./output/bin/curl` _is not actually curl at all_. It's _actually_ a little substitute program, equivalent to the `run` program from above! The _real_ curl is somewhere under `./output/brioche-resources.d` with some unholy hash as part of its filename.

The important thing is that, from an outside perspective, `./output/bin/curl` quacks like curl, waddles like curl, and eats bread like curl.

> But won't this still break for programs that care about `/proc/self/exe`?

Nope! Let's take Rust as an example. If you install Rust through Rustup, it'll create a directory structure like this somewhere under `~/.rustup`:

- `bin/rustc`
- `lib/librustc_driver.xxxxxx.so`
- `lib/libstd-xxxxxx.so`
- ...

Rust uses `/proc/self/exe` to find its current folder, then grabs libraries from `../lib`. So if we replace `bin/rustc` with a wrapper program like `run`, Rust will read `/proc/self/exe` and still think it's at the path `bin/rustc`. So it'll resolve `../lib` to the right directory-- no matter where the real Rust binary lives-- because it still _thinks_ it's at `bin/rustc`.

It also works for programs that execute themselves, since our little wrapper program runs exactly like the original program. The only thing that could break is if a program tries to read data from itself by opening its own path as a file, but that would obviously be very silly[^reading-executables]

## Closing thoughts

So that's a peak behind the scenes for how ["packed executables"](https://brioche.dev/docs/how-it-works/packed-executables/) work in Brioche on Linux. Hopefully you've walked away with the impression that there isn't _too much_ dark magic going on (or maybe you've now seen horrors previously beyond your comprehension)

I think this is just a really cool technique, and I'd love to see it get adopted across other package managers or in other places where Linux executables get distributed! For Brioche, it means I can set up a fresh Brioche installation in a few seconds and start installing packages right away, without needing root permissions. It means that I can just run `brioche build -o output ...` to get a bundle, then just `scp` it to some remote Linux machine or send it to someone, even if Brioche isn't installed on the other side. It means the same bundle can be used both inside and outside a Docker container. It means I can just use glibc or whatever dynamically linked libraries I want, and not have to fiddle around with toolchains to make a fully-static build[^static-builds]

You might also wonder: what does _making_ a nice, portable package look like if you use Brioche directly? Well, let's see what the config would look like to build a portable version of our `lil-demo` project:

```typescript
// lil-demo/project.bri
import { cargoBuild } from "rust";

export default function () {
  return cargoBuild({
    source: Brioche.glob("src", "Cargo.*"),
  });
}
```

...yep, that's it! No need to set up any wrappers explicitly, it's all handled automatically. All the build tools within Brioche are set up to add all these little wrapper binaries automatically out-of-the-box, so all your builds will work fully portably by default. Just like magic.

---

[^the-container-up-my-sleeve-kinda]: Okay, technically, `brioche build -r curl` should basically always be a cache hit, but if it isn't for some reason and it has to build from source, the build itself _would_ run in a container. The _output_ doesn't use any containers though
[^small-container]: From commit [`97cfcce`](https://github.com/brioche-dev/brioche-packages/tree/97cfcce19268326d6c76458218b60c723c84225f), this example container came out to a size of 27 MB, which is pretty small (and glibc is 12 MB of that)! The official curl container image is still smaller at the time of writing (21 MB uncompressed) and that also includes both CA certificates and Busybox, but the big difference is that it uses musl instead of glibc. So getting a glibc-based curl container down to 27 MB is something I'm still proud of overall! ...but in the real world, you'd at least want to add CA certs to this image
[^sandboxing-future]: There is build-time sandboxing, but once a package gets built, the result doesn't itself run in a sandbox. But, it'd be possible to add a function in Brioche that "sandbox-ifies" another package, e.g. by using [Bubblewrap](https://github.com/containers/bubblewrap). This would make sandboxing a composable piece, rather than being a core part of Brioche's design
[^exec]: Running `exec ./some-program` is almost the same as directly running `./some-program`. The former _replaces_ the current process with the new program to execute by directly using the [`execve()` syscall](https://man7.org/linux/man-pages/man2/execve.2.html), where the latter runs it as a subprocess. If you haven't used `exec` before, your homework assignment is to understand why it's the right tool for our `lil-demo` wrapper
[^proc-absolute-path]: Bonus points if you noticed that `/proc/self/exec` is an absolute path, the exact thing we're trying to get rid of! Well, Linux is very Unix-y, meaning "everything is a file", where "everything" includes several core APIs. These are implemented via special virtual filesystems, which get mounted at `/proc`, `/sys`, and `/dev`. Because they're so critical, you really can't avoid them for some tasks... but that also means even extremely bare-bones environments have them mounted (e.g. Docker's `scratch` container)
[^userland-exec-shell-script]: Super bonus points to the first person to write a userland exec implementation in pure POSIX shell
[^userland-args]: You may have noticed that we originally only passed one arg, but passed two when using userland exec. This is because the `userland-execve` crate expects you to pass `argv0` explicitly, whereas `std::process::Comamnd` passes it implicitly by default.
[^userland-env-vars]: Note that the example code will clear every env var except for `$LD_LIBRARY_PATH`. If you want to inherit the rest of the env vars like `std::process::Command` does, you'll need to manually iterate over [`std::env::vars_os()`](https://doc.rust-lang.org/stable/std/env/fn.vars_os.html) and pass each one explicitly.
[^billion-miles]: 1,609,344,000,000 km
[^reading-executables]: Yep... horrifyingly, I have seen at least one package that directly reads an executable and looks for a specific byte pattern. I actually can't remember which package it was... but luckily it was only part of a test suite if I remember right
[^static-builds]: Don't get me wrong, I love a good static build! It's just that setting up the build tooling and getting the right libraries for it can be a pain
