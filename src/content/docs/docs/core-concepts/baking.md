---
title: Baking
---

**Baking** is the process of evaluating a [recipe](/docs/core-concepts/recipes) to turn it into an [artifact](/docs/core-concepts/artifacts). Running `brioche build` always bakes at least one recipe: the one returned by the default exported function (or whichever export is selected with `-e`). Recipes can also be baked explicitly with the [`.bake()`](/docs/core-concepts/recipes#artifactbake) method.

When a recipe is baked, the resulting artifact is saved in a local cache, so that future builds don't need to re-evaluate the recipe. Some recipes, such as [process recipes](/docs/core-concepts/recipes#stdprocess), will be fetched from the [registry](/docs/core-concepts/registry) if available, allowing artifacts to be shared across machines.
