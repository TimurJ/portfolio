import type { APIRoute } from "astro";

/* Dynamic so the sitemap URL derives from `site` in astro.config.mjs — the
   domain lives once, and the cutover to it is still pending. The recipe from
   the @astrojs/sitemap docs, verbatim. */
export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(`User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`);
};
