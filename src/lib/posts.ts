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

/** The `getStaticPaths` both routes under pages/blog/[slug] export — the page
    and its card — so they are built for the same posts with the same param. */
export const postPaths = async () =>
  (await getPosts()).map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));

/** Trailing slash on purpose: the build writes /blog/<id>/index.html and the
    canonical is that path as served, so this is the same URL — without it
    Cloudflare's auto-trailing-slash puts a 307 in front of every row click. */
export const postHref = (post: Post): `/blog/${string}/` => `/blog/${post.id}/`;

/** The post's social card, built by pages/blog/[slug]/og.png.ts from lib/og.ts
    and named here from `postHref` so the page's og:image is the route's path —
    the one place the article's URL shape is spelled. */
export const postOgHref = (post: Post): `/blog/${string}/og.png` =>
  `${postHref(post)}og.png`;

/** The one place a post's "N min read" is derived: `body` is optional on the
    entry type, and both consumers would otherwise repeat the fallback. */
export const readingTimeOf = (post: Post): number =>
  readingTime(post.body ?? "");
