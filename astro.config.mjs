// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://timurjalilov.com",
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Archivo",
      cssVariable: "--font-archivo",
      weights: [400, 500, 600, 800],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
});
