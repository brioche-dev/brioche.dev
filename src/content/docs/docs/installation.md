---
title: Installation
---

Brioche is distributed as a portable executable that can be dropped in and run easily. You don't need root permissions to install Brioche.

## Automatic installation

**Linux (x86-64)**

```bash
curl --proto '=https' --tlsv1.2 -sSfL 'https://brioche.dev/install.sh' | sh
```

This script will install Brioche under `~/.local/bin`, which is commonly included by default in the `$PATH` for your shell.

### Installation options

The installer script supports passing extra environment variables to customize the installation. You can either set each of these environment variables before running the installer (e.g. `export BRIOCHE_INSTALL_TYPE=bin`), or prepend it before the `sh` command (e.g. `curl ... | BRIOCHE_INSTALL_TYPE=bin sh`).

- `BRIOCHE_INSTALL_DIR`: The directory to place the final Brioche binary. This directory should ideally be in your `$PATH` and will get created if it doesn't exist. Defaults to `$HOME/.local/bin`.
- `BRIOCHE_INSTALL_TYPE`: The type of installation to use. Options are `auto` (default), `packed` for portable builds, or `bin` for standalone builds.
- `BRIOCHE_INSTALL_UNPACK_DIR`: For packed installations, the directory where the packed build will be unpacked to. Defaults to `$HOME/.local/libexec/brioche`.

## Manual installation

Rather than running the installation script, you can also manually install Brioche by downloading the latest release under the ["Releases"](https://github.com/brioche-dev/brioche/releases) section of Brioche's GitHub repo.

**Linux**

> These instructions work for systems that use glibc, which includes most distributions. For Linux distributions that don't use glibc, such as Alpine Linux or NixOS, see the "**Linux (portable)**" section below.

1. Download the latest release binary for your architecture from the ["Releases"](https://github.com/brioche-dev/brioche/releases) page, e.g. `brioche-x86_64-linux`
2. Place the binary in your desired installation directory, such as `~/.local/bin`. Brioche can be run from any directory, but it should be a directory in your `$PATH`.
3. Make the binary executable using `chmod`: `chmod +x ~/.local/bin/brioche`

**Linux (portable)**

> **Note**: Portable builds are still considered experimental, and may not support all features of Brioche yet! Non-portable builds are currently recommended unless your system doesn't use glibc.

1. Download the latest release tar file named `brioche-packed-*` for your architecture from the ["Releases"](https://github.com/brioche-dev/brioche/releases) page, e.g. `brioche-packed-x86_64-linux.tar.gz`
2. Create a new directory to contain the unpacked tar file: `mkdir -p ~/.local/libexec/brioche`
3. Extract the tar file using into the directory: `tar -xzf brioche-packed-x86_64-linux.tar.gz --strip-components=1 -C ~/.local/libexec/brioche`
4. Add a symlink for `bin/brioche` from the unpacked directory into a folder in your `$PATH`: `ln -s ~/.local/libexec/brioche/bin/brioche ~/.local/bin/brioche`

## Editor support

### Visual Studio Code

You can install the "Brioche" extension from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=brioche-dev.brioche-vscode) (the extension ID is `brioche-dev.brioche-vscode`)

The extension requires that the `brioche` CLI tool is available on your `$PATH`, so make sure you install Brioche first!

> **Warning**: Brioche's LSP integration is still very experimental! You will see some errors in day-to-day use. Especially the following:
>
> - Adding dependencies will show up with an error message until the file is saved. Sometimes, you may need to reload the extension by running "Brioche LSP: Restart LSP Server" from the Command Palette.
> - The LSP will sometimes crash without automatically restarting, leading to lots of error notifications. Re-opening VS Code or running "Brioche LSP: Restart LSP Server" will often fix this.

## Updating

Once Brioche is installed, you can automatically update it by running the following command:

```bash
brioche self-update
```

### Manually updating

For versions of Brioche that are too old or were installed without support for automatic updates, you may need to update by manually re-installing Brioche. In most cases, you should be able to follow the instructions from the section ["Automatic installation"](#automatic-installation).

## Uninstallation

### Linux

Brioche uses the following paths on Linux:

- `~/.local/bin/brioche`: The main Brioche CLI tool
- `~/.local/share/brioche/installed`: All of the packages installed with `brioche install`
- `~/.local/share/brioche`: The full cache of all build artifacts and outputs
- `~/.config/brioche`: Custom Brioche configuration

Here's a script to uninstall all of them manually:

```sh
chmod -R +w ~/.local/share/brioche && rm -rf ~/.local/share/brioche
rm ~/.local/bin/brioche
rm -r ~/.config/brioche
```
