---
title: Installation
---

Brioche is distributed as a portable executable that can be dropped in and run easily. You don't need root permissions to install Brioche.

## Manual installation


**Linux (x86-64)**

<!-- TODO: Improve this and add instructions for other platforms -->

```bash
mkdir -p ~/.local/bin
curl -o ~/.local/bin/brioche -L https://development-content.brioche.dev/github.com/brioche-dev/brioche/branches/main/x86_64-linux/brioche
chmod +x ~/.local/bin/brioche
```

This script will install Brioche under `~/.local/bin`, which is commonly included by default in the `$PATH` for your shell.
