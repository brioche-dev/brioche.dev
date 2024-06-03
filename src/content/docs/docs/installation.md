---
title: Installation
---

Brioche is distributed as a portable executable that can be dropped in and run easily. You don't need root permissions to install Brioche.

## Automatic installation

**Linux (x86-64)**

```bash
curl --proto '=https' --tlsv1.2 -sSfL 'https://brioche.dev/install.sh' | bash
```

This script will install Brioche under `~/.local/bin`, which is commonly included by default in the `$PATH` for your shell.

## Editor support

### Visual Studio Code

You can install the "Brioche" extension from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=brioche-dev.brioche-vscode) (the extension ID is `brioche-dev.brioche-vscode`)

The extension requires that the `brioche` CLI tool is available on your `$PATH`, so make sure you install Brioche first!

> **Warning**: Brioche's LSP integration is still very experimental! You will see some errors in day-to-day use. Especially the following:
>
> - Adding dependencies will show up with an error message until the file is saved. Sometimes, you may need to reload the extension by running "Brioche LSP: Restart LSP Server" from the Command Palette.
> - Every time you open a Brioche file for the first time, you will see an error notification with the message "Request textDocument/diagnostic failed". This error can be safely dismissed, and the extension should continue to work.
> - The LSP will sometimes crash without automatically restarting, leading to lots of error notifications. Re-opening VS Code or running "Brioche LSP: Restart LSP Server" will often fix this.

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
