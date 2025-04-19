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
- `cache.url` (string): A custom cache URL for saving baked recipes. See ["Cache configuration"](#cache-configuration) for supported URL schemas.
- `cache.max_concurrent_operations` (number): The maximum number of connections to use when calling the cache URL on the client. Defaults to `200`.
- `cache.use_default_cache` (bool): Load baked recipes from the official Brioche cache if not found otherwise. Defaults to `true`. When a custom cache is also enabled, the custom cache acts as an overlay and will be checked before the default cache.
- `cache.read_only` (bool): Don't try to write to the custom cache-- only fetch values that have already been cached from the cache specified by `url`. Defaults to `false`.
- `cache.allow_http` (bool): Allow insecure HTTP access for the cache. Defaults to `false`, which means requests to the cache must go over HTTPS.

## Sandbox configuration

Brioche will automatically try and detect an appropriate way to sandbox processes on your machine. However, it may either log a warning if the most efficient sandboxing method is unavailable, or may return an error if it couldn't automatically decide on which sandboxing method to use. In these cases, you may need to manually choose which sandbox to use.

In `config.toml` under the `[sandbox]` section, you can choose one of the following values for the `backend` key:

| `sandbox.backend` | Linux          | macOS | Windows |
| ----------------- | -------------- | ----- | ------- |
| `linux_namespace` | ✅ **Default** | ❌    | ❌      |
| `unsandboxed`     | ✅             | ❌    | ❌      |

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

### `unsandboxed`

> ⚠️ **Warning**: Using the `unsandboxed` backend can be extra risky when running builds! There are no protections so builds can cause mayhem on a running system-- either maliciously or just accidentally. **Only use the unsandboxed backend if you know what you're doing!**

As the name implies, the unsandboxed backend will run build processes without any sandboxing protections or restrictions. Here are a few things to watch out for when using the `unsandboxed` backend:

- Processes will run with unrestricted network access, even if the `networking` option is not set.
- Processes can read or modify any files (that your user account has access to). Processes could potentially create, read, modify, or delete files in your home directory!
- Processes can be affected by the host OS. If a build process tries to call another program, it could end up using a dynamic library installed on your host machine unintentionally.

It's extra risky to use the `unsandboxed` backend when collaborating on Brioche projects, as it's much harder to ensure that a build that works for you will successfully run on another machine.

## Cache configuration

Brioche supports configuring a custom [cache](/docs/core-concepts/cache), which is used to store and retrieve the results of [baking](/docs/core-concepts/baking) recipes.

```toml title=~/.config/brioche/config.toml
[cache]
url = "s3://private-brioche-cache/"
# max_concurrent_operations = 200
# use_default_cache = true
# read_only = false
# allow_http = false
```

You can also configure the cache using the following environment variables:

- `$BRIOCHE_CACHE_URL`
- `$BRIOCHE_CACHE_USE_DEFAULT_CACHE`
- `$BRIOCHE_CACHE_READ_ONLY`
- `$BRIOCHE_CACHE_MAX_CONCURRENT_OPERATIONS`
- `$BRIOCHE_CACHE_ALLOW_HTTP`

The URL schema of the value for `cache.url` (or `$BRIOCHE_CACHE_URL`)determines which cache backend to use. The following URL schemas are supported:

- `s3://`: AWS S3 or an S3-compatible object storage provider
  - Full URL structure: `s3://<bucket>/<prefix>` (`prefix` is optional)
  - Authentication follows the normal semantics of the AWS SDK (`$AWS_ACCESS_KEY_ID`, `$AWS_SECRET_ACCESS_KEY`, etc.)
  - **Note**: Brioche currently uses [`object_store`](https://docs.rs/object_store/0.12.0/object_store/aws/struct.AmazonS3Builder.html) for S3, but it may use the AWS SDK directly in the future. Make sure your AWS SDK configuration is set up properly!
- `https://`: Read from a plain HTTPS server (or `http://` for plain HTTP)
  - **Note**: It's recommended to set the `read_only = true` option when with HTTP(S). HTTP support is handled through [`object_store`](https://docs.rs/object_store/0.12.0/object_store/http/index.html) which will attempt to use WebDAV when writing to the cache, but this may change in the future. Please reach out if you have a need for writing to a cache via WebDAV!
- `file://`: Directory on the local filesystem
