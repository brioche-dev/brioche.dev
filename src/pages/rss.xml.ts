import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
const parser = new MarkdownIt();

export const GET: APIRoute = async (context) => {
  const blogEntries = await getCollection("blog");
  blogEntries.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  return rss({
    title: "Brioche Blog",
    description: "The official blog of Brioche.",
    site: context.site || import.meta.env.SITE,
    stylesheet: "/rss/styles.xsl",
    trailingSlash: false,
    items: blogEntries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.pubDate,
      author: entry.data.author,
      link: `/blog/${entry.id}`,
      content: sanitizeHtml(parser.render(entry.body ?? ""), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      }),
    })),
  });
};
