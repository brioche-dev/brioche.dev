---
title: Registry
---

The **registry** is a central server that serves Brioche [projects](./projects), serving as a canonical place to resolve dependencies by name. The registry also serves [baked](./baking) artifacts, making it so clients can fetch pre-built artifacts instead of needing to build all of their dependencies from source.

The official registry is hosted at the URL `https://registry.brioche.dev/`. The registry is automatically published and built from the [`brioche-packages`](https://github.com/brioche-dev/brioche-packages) repo. You can submit a Pull Request or Issue to this repo to request new projects be added or to report issue in existing projects.

## Self-hosted registries

The source code for the registry is available in the [`brioche-registry`](https://github.com/brioche-dev/brioche-registry) repository. With it, you can self-host your own registry, and Brioche can be configured to pull from a your own registry URL instead (see [configuration](../configuration) for details).

When run, the registry will allow anyone with access to pull projects or artifacts, but will require authentication to publish new projects or to sync pre-baked recipes. Set the `$BRIOCHE_REGISTRY_PASSWORD` environment variable to authenticate with the registry.

Run `brioche publish -p project_path` to publish a project to the registry. This will collect all files included by the project, upload them to the registry, and create new tags based on the project's name and version metadata.

Run `brioche build -p project_path --sync` to sync recipes baked during the project build. This will build the project as normal, plus it will upload some of the baked recipes to the registry (recipes that are fast to bake will generally not be uploaded). When other machines using Brioche use the same registry, they will pull the pre-baked recipes from the registry, avoiding the need to bake the recipes themselves.

Publishing and syncing are completely independent. You can sync a build without publishing the built project to the registry, meaning that the recipes will be cached when someone else builds the same project (or a different project that uses the same recipes). Or, you can publish without syncing, which will let anyone add the project as a dependency by name, but they will need to bake recipes from the project themselves during the build.

You can also sync multiple different builds of a project to a registry. For example, you may want to sync multiple project exports from the same project to the registry, which could look like this:

```bash
brioche build -p project_path -e frontend --sync
brioche build -p project_path -e backend --sync
```
