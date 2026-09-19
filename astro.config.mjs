// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://timurjalilov.com",
  integrations: [sitemap()],
  /* /blog has no index of its own — the homepage section is the index. The
     static build emits a meta-refresh + noindex shell for it, which the
     sitemap integration skips. (On Cloudflare a typed /blog first 307s to
     /blog/, then the shell lands on the section.) */
  redirects: { "/blog": "/#blog" },
  markdown: {
    shikiConfig: {
      /* GitHub's current Primer pair: every common token colour clears 4.5:1
         on the page grounds (github-light's variable orange is 3.49:1 on
         white and fails axe), and their editor backgrounds sit within a shade
         of --bg in each theme, so a block reads as the page with a hairline.
         defaultColor: false makes Shiki emit only --shiki-light/--shiki-dark
         custom properties and no colour of its own; data-theme picks the side
         in pages/blog/[slug].astro. */
      themes: { light: "github-light-default", dark: "github-dark-default" },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Archivo",
      cssVariable: "--font-archivo",
      weights: [400],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
});
