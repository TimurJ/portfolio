import type { APIRoute } from "astro";

/* Dynamic so the sitemap URL derives from `site` in astro.config.mjs rather
   than repeating the domain here — the same source Base.astro resolves the
   canonical and og:url against, so the three can't drift. The recipe from the
   @astrojs/sitemap docs, verbatim. */
export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(`User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`);
};
