---
title: Cache
---

A **cache** is used for saving and retrieving [baked](/docs/core-concepts/baking) artifacts. If an artifact doesn't exist locally, Brioche will first try to retrieve it from a cache, and only then fall back to baking it if it doesn't already exist.

When running builds with the `--sync` flag, Brioche will also save any uncached bake results to the cache (if configured).

## Default cache

The official cache is hosted at the URL `https://cache.brioche.dev/`. Without any additional configuration, builds will check against the official cache when possible.

The official cache serves packages built from the [`brioche-packages`](https://github.com/brioche-dev/brioche-packages) repo.

## Custom cache

You can also cache the results of builds for your personal or team projects using a custom cache. Brioche supports using multiple storage backends, including AWS S3 and S3-compatible providers. See ["Cache configuration"](/docs/configuration#cache-configuration) for supported backends and cache options.

By default, enabling a custom cache will act as an "overlay" on top of the default cache. That is, Brioche will first check the custom cache, then the default cache, then finally fall back to baking the recipe if needed.

### Syncing

With a custom cache configured, run `brioche build -p project_path --sync` to sync recipes baked during the project build. This will build the project as normal, plus it will upload some of the baked recipes to the cache (recipes that are fast to bake will generally not be uploaded). When other machines using Brioche use the same cache, they will pull the pre-baked recipes from the cache, avoiding the need to bake the recipes themselves.

You can also sync multiple different builds of a project to a cache. For example, you may want to sync multiple project exports from the same project to the cache, which could look like this:

```bash
brioche build -p project_path -e frontend --sync
brioche build -p project_path -e backend --sync
```

## Cache vs. registry

When resolving a [project](/docs/core-concepts/projects) from a registry, the registry will return an artifact hash. Brioche will then fetch the artifact from a cache, which contains the project's files. In other words, the cache and registry work in tandem to return the project files.

> **Note**: Currently, the globally-configured cache options are also used when fetching the artifact hash returned by a registry. This will likely change in the future, but it also means you can't use the official registry today when the `use_default_cache` setting is set to `false`.

In addition to using a custom cache, you can also self-host a [registry](/docs/core-concepts/registry). However, setting up a custom cache should be enough for most teams.
