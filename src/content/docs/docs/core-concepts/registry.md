---
title: Registry
---

The **registry** is a central server that serves Brioche [projects](/docs/core-concepts/projects), serving as a canonical place to resolve dependencies by name.

The official registry is hosted at the URL `https://registry.brioche.dev/`. The registry is automatically published and built from the [`brioche-packages`](https://github.com/brioche-dev/brioche-packages) repo. You can submit a Pull Request or Issue to this repo to request new projects be added or to report issue in existing projects.

Note that the registry itself is lightweight, and only resolves each project name to an [artifact](/docs/core-concepts/artifacts) containing the project's source files. Artifacts are then retrieved through a [cache](/docs/core-concepts/cache). See ["Cache vs. Registry"](/docs/core-concepts/cache#cache-vs-registry) for more details.

## Self-hosted registries

The source code for the registry is available in the [`brioche-registry`](https://github.com/brioche-dev/brioche-registry) repository. With it, you can self-host your own registry, and Brioche can be configured to pull from a your own registry URL instead (see [configuration](/docs/configuration) for details).

When run, the registry will allow anyone with access to pull projects, but will require authentication to publish new projects. Set the `$BRIOCHE_REGISTRY_PASSWORD` environment variable to authenticate with the registry.

### Publishing

> **Note**: To publish projects, you'll also need to configure a [custom cache](/docs/core-concepts/cache#custom-cache)

Run `brioche publish -p project_path` to publish a project to a self-hosted registry. This will save an [artifact](/docs/core-concepts/artifacts) to the custom cache containing all of the project's files, then it will create or update tags for the project in the self-hosted registry, associated with the artifact's hash.

Then, running `brioche build -r project_name` will then call the registry to determine the artifact hash associated to `project_name`, then Brioche will retrieve the project's artifact via the cache.
