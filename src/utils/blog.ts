import { z, type CollectionEntry } from "astro:content";

export const BlogEntry = z.object({
  title: z.string(),
  author: z.string(),
  authorUrl: z.string(),
  pubDate: z.date().or(z.null()),
});
export type BlogEntry = z.infer<typeof BlogEntry>;

export const PublishedBlogEntry = BlogEntry.and(z.object({
  pubDate: z.date(),
}))
export type PublishedBlogEntry = z.infer<typeof PublishedBlogEntry>;

export function isPublished(
  entry: CollectionEntry<"blog">,
): entry is CollectionEntry<"blog"> & { data: PublishedBlogEntry } {
  return entry.data.pubDate != null;
}
