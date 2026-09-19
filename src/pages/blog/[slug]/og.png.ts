import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from "astro";

import { renderPostCard } from "../../../lib/og";
import { postPaths } from "../../../lib/posts";

/* Static: the build writes dist/blog/<id>/og.png and nothing runs at request
   time. The paths are [slug].astro's, so a page cannot advertise a card that
   was not built. */
export const getStaticPaths = postPaths satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props, site }) => {
  if (!site) throw new Error("`site` must be set in astro.config.mjs");
  const { title, pubDate } = props.post.data;
  const png = await renderPostCard({ title, pubDate, site });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
