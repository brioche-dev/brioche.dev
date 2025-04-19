import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { redirects } from "./src/pages/_redirects";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://brioche.dev",
  redirects: Object.fromEntries(redirects.map(({ from, to }) => [from, to])),

  integrations: [
    sitemap(),
    robotsTxt(),
    starlight({
      title: "Brioche",
      description:
        "A delicious package manager for building and running your most complex software projects",
      logo: {
        light: "./src/assets/brioche-logo-light.svg",
        dark: "./src/assets/brioche-logo-dark.svg",
      },
      favicon: "/favicon.ico",
      social: [
        { icon: "zulip", label: "Zulip", href: "https://brioche.zulipchat.com/" },
        { icon: "discord", label: "Discord", href: "https://discord.gg/cw5QeWv4E5" },
        { icon: "github", label: "GitHub", href: "https://github.com/brioche-dev" },
      ],
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
          label: "Example Projects",
          link: "/docs/example-projects",
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
              label: "Statics",
              link: "/docs/core-concepts/statics",
            },
            {
              label: "Runnables",
              link: "/docs/core-concepts/runnables",
            },
            {
              label: "Cache",
              link: "/docs/core-concepts/cache",
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
              label: "Process Dependencies",
              link: "/docs/how-it-works/process-dependencies",
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
      customCss: ["./src/styles/global-starlight.css"],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            sizes: "180x180",
            href: "/apple-touch-icon.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            sizes: "32x32",
            href: "/favicon-32x32.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            sizes: "16x16",
            href: "/favicon-16x16.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "manifest",
            href: "/site.webmanifest",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "mask-icon",
            href: "/safari-pinned-tab.svg",
            color: "#e9c193",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "msapplication-TileColor",
            content: "#da532c",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: "#41362f",
          },
        },
      ],
    }),
    {
      name: "_redirects",
      hooks: {
        "astro:config:setup": ({ injectRoute }) => {
          injectRoute({
            pattern: "/_redirects",
            entrypoint: "./src/pages/_redirects.ts",
          });
        },
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
