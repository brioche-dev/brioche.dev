import type { Props } from "@astrojs/starlight/props";

export const siteDescription =
  "A delicious package manager for building and running your most complex software projects";

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
    slug: "",
    render: () => {
      throw new Error("Called `starlightProps.render`");
    },
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
  labels: {
    "skipLink.label": "Skip to content",
    "search.label": "Search",
    "search.shortcutLabel": "(Press / to Search)",
    "search.cancelLabel": "Cancel",
    "search.devWarning":
      "Search is only available in production builds. \nTry building and previewing the site to test it out locally.",
    "themeSelect.accessibleLabel": "Select theme",
    "themeSelect.dark": "Dark",
    "themeSelect.light": "Light",
    "themeSelect.auto": "Auto",
    "languageSelect.accessibleLabel": "Select language",
    "menuButton.accessibleLabel": "Menu",
    "sidebarNav.accessibleLabel": "Main",
    "tableOfContents.onThisPage": "On this page",
    "tableOfContents.overview": "Overview",
    "i18n.untranslatedContent":
      "This content is not available in your language yet.",
    "page.editLink": "Edit page",
    "page.lastUpdated": "Last updated:",
    "page.previousLink": "Previous",
    "page.nextLink": "Next",
    "page.draft":
      "This content is a draft and will not be included in production builds.",
    "404.text": "Page not found. Check the URL or try using the search bar.",
    "aside.note": "Note",
    "aside.tip": "Tip",
    "aside.caution": "Caution",
    "aside.danger": "Danger",
    "fileTree.directory": "Directory",
  },
};
