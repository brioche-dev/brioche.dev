import { z, defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  blog: defineCollection({
    schema: z.object({
      title: z.string(),
      author: z.string(),
      authorUrl: z.string(),
      pubDate: z.date(),
    }),
  }),
};
