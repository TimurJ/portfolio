import { defineConfig } from "@playwright/test";

/* The suite runs against `dist/` — the built site, not the dev server — so what
   it asserts is what deploys. Port 4322 rather than Astro's default 4321:
   `astro dev` owns that one, and reuseExistingServer below would otherwise
   happily point the whole suite at a dev server left running in another
   terminal. */
const PORT = 4322;
const baseURL = `http://localhost:${PORT}/`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    /* Stated rather than inherited. Playwright already defaults to light
       (`contextOptions.colorScheme ?? "light"`), but the emulated OS is a
       variable the theme cases reason about, so the suite pins it rather than
       leaving it to a default that could move. The site ignores
       prefers-color-scheme entirely, which is exactly what the dark-OS block
       overriding this proves: under a dark machine the page still opens light,
       and the toggle still reaches dark from there. */
    colorScheme: "light",
  },
  /* One engine. It catches script regressions, which is what these tests are
     for; browser-specific CSS is verified by hand against the design.
     `browserName` rather than the usual devices["Desktop Chrome"] spread — the
     descriptor only adds a UA and the 1280x720 viewport Playwright already
     defaults to, and indexing that record trips noUncheckedIndexedAccess. */
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `pnpm exec astro preview --port ${PORT}`,
    /* Astro detaches the preview server when it detects it was started by a
       coding agent, which leaves Playwright watching a process that exits
       immediately ("webServer exited early"). This is the variable Astro sets
       on the child it spawns for `--background`; setting it here says the
       backgrounding decision is already made, so run in the foreground. */
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
