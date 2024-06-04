---
title: Workspaces
---

A **workspace** is a collection of [projects](/docs/core-concepts/projects), where each project can depend on other projects in the workspace as if they were external dependencies, but _don't_ get locked in the lockfile. Workspaces are mainly meant for monorepos containing multiple interdependent Brioche projects, and are designed to make it easier to move code into and out of the workspace without needing to translate between normal dependencies and path dependencies.

A workspace can be defined by creating the file `brioche_workspace.toml` in the workspace root. The file looks like this:

```toml
members = ["projects/*", "others/foo"]
```

Each entry in members must be a subpath, which may end with the `/*` wildcard to include all subdirectories as members. **Note that projects under the workspace directory but not included in the list of members will still resolve dependencies within the workspace, but they themselves can't be imported by other members**! Consider the following directory structure, where `brioche_workspace.toml` contains the contents above:

<!-- TODO: Find a more accessible representation for this diagram -->

```
my_workspace
├── brioche_workspace.toml
├── projects/
│   ├── fizz/
│   │   └── project.bri
│   └── buzz/
│       └── project.bri
└── others/
    ├── foo/
    │   └── project.bri
    └── bar/
        └── project.bri
```

When any project under this directory tries to resolve the packages `fizz`, `buzz`, or `foo`, these will resolve to the workspace member paths `projects/fizz`, `projects/buzz`, and `others/foo`, respectively. This means that these packages can refer to each other by name (as long as they don't create a cycle), and `others/bar` can refer to any of the three by name (but no other package can refer to it, except by using a path dependency).

Unlike other dependencies resolved by name like this, `fizz`, `buzz`, and `foo` would _not_ be included in a lockfile. If they were, then the lockfile would be regenerated any time any files from any of these packages were changed, which would would lead to extra churn in a VCS (e.g. Git).

The main use case for workspaces is for monorepos containing multiple Brioche packages, like the [brioche-packages](https://github.com/brioche-dev/brioche-packages/) repo. In cases like this, we'd like dependencies to depend on each other by path. But, using path dependencies directly would require a translation step if code were to be moved into or out of the repo. So, workspaces offer a middle-ground, where packages act like path dependencies but are written in code just like normal named dependencies.
