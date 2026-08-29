import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/", ".astro/", ".wrangler/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,
  eslintPluginAstro.configs["jsx-a11y-recommended"],
  {
    /* Hand-run maintenance scripts (see scripts/) run under Node, not the
       browser. Declared narrowly — just the globals they use — so no-undef
       keeps doing its job everywhere else. */
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", URL: "readonly" },
    },
  },
);
