import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  redirects: {
    "/docs": "/docs/getting-started",
  },
  integrations: [
    starlight({
      title: "Brioche",
      social: {
        github: "https://github.com/brioche-dev",
      },
      sidebar: [
        {
          label: "Getting Started",
          link: "/docs/getting-started",
        },
        {
          label: "Installation",
          link: "/docs/installation",
        },
        {
          label: "Configuration",
          link: "/docs/configuration",
        },
        {
          label: "Core Concepts",
          items: [
            {
              label: "Projects",
              link: "/docs/core-concepts/projects",
            },
            {
              label: "Artifacts",
              link: "/docs/core-concepts/artifacts",
            },
            {
              label: "Recipes",
              link: "/docs/core-concepts/recipes",
            },
            {
              label: "Baking",
              link: "/docs/core-concepts/baking",
            },
            {
              label: "Registry",
              link: "/docs/core-concepts/registry",
            },
            {
              label: "Workspaces",
              link: "/docs/core-concepts/workspaces",
            },
          ],
        },
        {
          label: "How It Works",
          items: [
            {
              label: "Blobs",
              link: "/docs/how-it-works/blobs",
            },
            {
              label: "Sandboxing",
              link: "/docs/how-it-works/sandboxing",
            },
            {
              label: "Tick Encoding",
              link: "/docs/how-it-works/tick-encoding",
            },
            {
              label: "Packed Executables",
              link: "/docs/how-it-works/packed-executables",
            },
          ],
        },
      ],
      customCss: ["./src/tailwind.css"],
    }),
    tailwind({ applyBaseStyles: false }),
  ],
});
