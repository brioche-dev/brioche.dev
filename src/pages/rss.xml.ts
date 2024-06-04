import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
  const blog = await getCollection("blog");
  return rss({
    title: "Brioche Blog",
    description: "The official blog of Brioche.",
    site: context.site || import.meta.env.SITE,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      author: post.data.author,
      link: `/blog/${post.slug}`,
    })),
  });
};
