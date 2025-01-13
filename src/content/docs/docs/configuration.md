---
title: Configuration
---

Brioche's configuration lives in `~/.config/brioche/config.toml` on Linux, and is configured using [TOML](https://toml.io/).

```toml title=~/.config/brioche/config.toml
registry_url = "https://registry.example.com/"

[sandbox]
backend = "auto"
```

## Options

 The configuration supports the following options:

- `registry_url` (string): The URL of the [registry](/docs/core-concepts/registry) to fetch projects and baked artifacts from. Defaults to `https://registry.brioche.dev/`
- `sandbox.backend` (string): The backend used for [sandboxing](/docs/how-it-works/sandboxing) when baking [process recipes](/docs/core-concepts/recipes#stdprocess). Defaults to `auto`. See the ["Sandbox configuration"](#sandbox-configuration) section for details on all supported backends, and extra options for each.

## Sandbox configuration

Brioche will automatically try and detect an appropriate way to sandbox processes on your machine. However, it may either log a warning if the most efficient sandboxing method is unavailable, or may return an error if it couldn't automatically decide on which sandboxing method to use. In these cases, you may need to manually choose which sandbox to use.

In `config.toml` under the `[sandbox]` section, you can choose one of the following values for the `backend` key:

| `sandbox.backend` | Linux | macOS | Windows |
|-------------------|-------|-------|---------|
| `linux_namespace` | ✅ **Default** | ❌ | ❌ |
| `unsandboxed`     | ❌ | ❌ | ❌ |

You can additionally set the `backend` key to `auto`, which will automatically select the best backend for your machine.

### `linux_namespace`

This backend runs each process in an isolated [Linux namespace](https://man7.org/linux/man-pages/man7/namespaces.7.html)-- the same feature underlying containers as implemented by Docker, Podman, and others. This is the preferred backend on Linux.

```toml title=~/.config/brioche/config.toml
[sandbox]
backend = "linux_namespace"
# proot = false
```

#### Options

- `proot` (boolean, string, or object): Control whether or not [PRoot](https://proot-me.github.io/) should be used instead of using a mount namespace. See ["PRoot fallback"](#proot-fallback) below for more details.
  - `"auto"`: Only use PRoot if needed for sandboxing (and additionally silence the warning even if it's required).
  - `true`: Always use PRoot for mounting paths in the sandbox. **Negatively impacts performance!**
  - `false`: Never use PRoot for mounting paths in the sandbox. Paths will always be mounted using a mount namespace.
  - `{ path: "/path/to/proot" }`: An object containing an absolute path to a PRoot binary on your system. Uses PRoot, but uses a custom binary instead of the one provided by Brioche. This may be required if no compatible PRoot binary is available for your machine.


#### PRoot fallback

Some Linux machines may be configured to prevent or restrict namespaces, including the default configuration of Ubuntu starting in Ubuntu 23.10. In these cases, Brioche may try to use [PRoot](https://proot-me.github.io/) within a namespace to make builds work at all, **but performance will take a hit!** You'll know this is happening because a warning message like this will be logged:

```console
failed to run process sandbox with mount namespace, falling back to PRoot
```

If you see this warning, there are a few different options you can take:

1. Manually update `config.toml`, and explicitly set `sandbox.backend` to `linux_namespace`, then explicitly set `sandbox.proot` to `true`. This will continue to use PRoot, but will silence the warning.
2. (With root permission) Add a custom AppArmor profile to allow Brioche to use unrestricted namespaces. This works on newer kernels using at least AppArmor 4.0. [This post from Ubuntu](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces) includes an example AppArmor profile.
3. (With root permission) Un-restrict user namespaces system-wide. Ubuntu restricts user namespaces by default as a security measure, so this may negatively impact the security of your Linux machine. If you fully understand the risks, [this post from Ubuntu](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces) includes the `sysctl` settings that can be used to change this configuration.
