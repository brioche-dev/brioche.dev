import { z, type CollectionEntry } from "astro:content";

const BlogEntryCommon = z.object({
  title: z.string(),
  author: z.string(),
  authorUrl: z.string(),
});
type BlogEntryCommon = z.infer<typeof BlogEntryCommon>;

export const PublishedBlogEntry = BlogEntryCommon.and(
  z.object({
    pubDate: z.date(),
  }),
);
export type PublishedBlogEntry = z.infer<typeof PublishedBlogEntry>;

export const DraftBlogEntry = BlogEntryCommon.and(
  z.object({
    pubDate: z.null(),
  }),
);
export type DraftBlogEntry = z.infer<typeof DraftBlogEntry>;

export const BlogEntry = PublishedBlogEntry.or(DraftBlogEntry);
export type BlogEntry = z.infer<typeof BlogEntry>;

export function isPublished(
  entry: CollectionEntry<"blog">,
): entry is CollectionEntry<"blog"> & { data: PublishedBlogEntry } {
  return entry.data.pubDate != null;
}
