import type { Props } from "@astrojs/starlight/props";

/**
 * Dummy Starlight props to reuse Starlight components outside of Starlight
 */
export const starlightProps: Props = {
  siteTitle: "Brioche",
  dir: "ltr",
  headings: [],
  sidebar: [],
  hasSidebar: false,
  pagination: {
    prev: undefined,
    next: undefined,
  },
  toc: undefined,
  lastUpdated: undefined,
  editUrl: undefined,
  entry: {
    body: "",
    collection: "docs",
    data: {
      draft: false,
      editUrl: false,
      head: [],
      pagefind: false,
      sidebar: {
        attrs: {},
        hidden: true,
      },
      template: "doc",
      title: "",
    },
    id: "docs/getting-started.md",
    filePath: "docs/getting-started.md",
    slug: "",
  },
  entryMeta: {
    dir: "ltr",
    lang: "en",
    locale: undefined,
  },
  id: "",
  lang: "en",
  locale: undefined,
  siteTitleHref: "",
  slug: "",
  isFallback: true,
  labels: {},
};
