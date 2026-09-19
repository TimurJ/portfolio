import { type CollectionEntry, getCollection } from "astro:content";

import { readingTime } from "./readingTime";

export type Post = CollectionEntry<"blog">;

/** Published posts, newest first — the one list both the homepage section
    and the article route render from, so a post cannot appear in one and not
    the other. Drafts are visible in dev only. */
export const getPosts = async (): Promise<Post[]> => {
  const posts = await getCollection(
    "blog",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
};

/** Trailing slash on purpose: the build writes /blog/<id>/index.html and the
    canonical is that path as served, so this is the same URL — without it
    Cloudflare's auto-trailing-slash puts a 307 in front of every row click. */
export const postHref = (post: Post): `/blog/${string}/` => `/blog/${post.id}/`;

/** The one place a post's "N min read" is derived: `body` is optional on the
    entry type, and both consumers would otherwise repeat the fallback. */
export const readingTimeOf = (post: Post): number =>
  readingTime(post.body ?? "");
