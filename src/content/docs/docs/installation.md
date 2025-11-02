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

To view the source of the installer script or for more details, check the [`brioche-installer`](https://github.com/brioche-dev/brioche-installer) repository.

### Installation options

The installer script supports passing extra environment variables to customize the installation. You can either set each of these environment variables before running the installer (e.g. `export BRIOCHE_INSTALL_VERSION=nightly`), or prepend it before the `sh` command (e.g. `curl ... | BRIOCHE_INSTALL_VERSION=nightly sh`).

- `BRIOCHE_INSTALL_VERSION`: Specify a version or channel of Brioche to install: `stable`, `nightly`, `v0.1.6`, etc. (Default: `stable`)
- `BRIOCHE_INSTALL_ROOT`: The root directory for the installer itself. Brioche versions will be extracted into this directory. (Default: `$HOME/.local/share/brioche-install`)
- `BRIOCHE_INSTALL_BIN_DIR`: The directory to place a symlink to the installed Brioche version. This directory should ideally be in your `$PATH` and will get created if it doesn't exist. (Default: `$HOME/.local/bin`)
- `BRIOCHE_INSTALL_VERIFY_SIGNATURE`: By default, the installer will validate the signature of the release tarball. Set to `auto` to skip verification if the command(s) required for validation (`ssh-keygen`) aren't installed, or `false` to always skip. (Default: `true`)

## Manual installation

Rather than running the installation script, you can also manually install Brioche by downloading the latest release under the ["Releases"](https://github.com/brioche-dev/brioche/releases) section of Brioche's GitHub repo.

**Linux**

1. Download the latest release tarball for your architecture from the ["Releases"](https://github.com/brioche-dev/brioche/releases) page, e.g. `brioche-x86_64-linux.tar.xz`
2. Create a directory to hold the installation: `mkdir -p ~/.local/share/brioche-install/brioche/stable`
3. Extract the tarball: `tar -xJf brioche-x86_64-linux.tar.xz --strip-components=1 -C ~/.local/share/brioche-install/brioche/stable`
4. Create a symlink for the current version: `ln -s stable ~/.local/share/brioche-install/brioche/current`
5. Create a symlink to main Brioche binary in your `$PATH` such as `~/.local/bin`: `ln -s ~/.local/share/brioche-install/brioche/current/bin/brioche ~/.local/bin/brioche`

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

Brioche uses the following paths on Linux by default:

- `~/.local/share/brioche-install`: The main path where each version of Brioche is installed to
- `~/.local/bin/brioche`: (A symlink to) the Brioche CLI tool
- `~/.local/share/brioche/installed`: All of the packages installed with `brioche install`
- `~/.local/share/brioche`: The full cache of all build artifacts and outputs
- `~/.config/brioche`: Custom Brioche configuration

Here's a script to uninstall all of them manually:

```sh
chmod -R +w ~/.local/share/brioche && rm -rf ~/.local/share/brioche
rm ~/.local/bin/brioche
rm -r ~/.local/share/brioche-install
rm -r ~/.config/brioche
```
