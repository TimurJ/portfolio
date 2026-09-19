import { glob } from "astro/loaders";
/* astro/zod rather than the `z` re-exported from astro:content, which Astro
   marks deprecated for removal in 8. */
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

/* One collection: posts as markdown under src/content/blog. The filename is
   the slug — the loader github-slugs it into entry.id, and both the homepage
   section and the article route read the list through lib/posts.ts. Enforced
   on both sides: the pattern is flat, so a nested file is not a post rather
   than an id the single-segment [slug] route can't serve; and the schema is
   strict, because the loader would otherwise take a `slug:` key as the id
   unvalidated, and a mis-cased key (`Draft:`) would pass as absent. */
const blog = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/blog" }),
  schema: z.strictObject({
    title: z.string(),
    description: z.string(),
    /* coerce: YAML hands over a Date for an unquoted 2026-09-19 and a string
       for a quoted one; both land here as a Date. */
    pubDate: z.coerce.date(),
    /* A draft builds in dev and is dropped from production — lib/posts.ts. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
