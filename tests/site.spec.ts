import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { hrefOf, sections, titleIdOf } from "../src/lib/nav";
import {
  THEME_ATTRIBUTE,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from "../src/lib/theme";

/* A smoke net, not a unit suite: one case per behaviour the page actually has
   at runtime, plus an axe scan in both themes. The four client scripts and the
   landmark structure are invisible to the other gates (format, lint, typecheck,
   build), so this file is the only thing that can catch them regressing. */

test("loads with no console errors", async ({ page }) => {
  /* Attached before goto, or the scripts have already run by the time we
     listen. */
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the skip link is the first tab stop and lands in main", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.locator('a[href="#main"]');
  await expect(skipLink).toBeFocused();
  /* sr-only until focused, then fixed at the top-left — a skip link nobody can
     see is the usual way this breaks. */
  await expect(skipLink).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("the theme toggle flips the theme and persists it", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const themeColor = page.locator('meta[name="theme-color"]');

  /* Light is the absence of the attribute, not data-theme="light". */
  await expect(html).not.toHaveAttribute(THEME_ATTRIBUTE);
  await expect(themeColor).toHaveAttribute("content", THEME_COLORS.light);

  /* The button's label is the theme it switches *to*, and both labels sit in
     the DOM at once (CSS picks one), so only the accessible name is meaningful
     — textContent reads "Dark themeLight theme". */
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, "dark");
  await expect(themeColor).toHaveAttribute("content", THEME_COLORS.dark);
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, "dark");
});

test("every section is exposed as a named region", async ({ page }) => {
  await page.goto("/");

  /* The count is the load-bearing assertion: the role is computed by the
     accessibility engine, and a <section> without a name is a generic, not a
     region — so dropping one aria-labelledby drops the count. axe won't catch
     that on its own; it has no rule requiring sections to be named. */
  await expect(page.getByRole("region")).toHaveCount(sections.length);

  /* The count only catches a *missing* aria-labelledby. A dangling one — the
     attribute present, the element it names empty — leaves the section counted
     as a region and unnamed in practice, so the emptiness check below is the
     only thing that sees it. Both were measured against the built page. */
  for (const { id } of sections) {
    await expect(page.locator(`section#${id}`)).toHaveAttribute(
      "aria-labelledby",
      titleIdOf(id),
    );
    await expect(page.locator(`#${titleIdOf(id)}`)).not.toBeEmpty();
  }
});

test("clicking a nav link marks it as the current location", async ({
  page,
}) => {
  await page.goto("/");
  /* The footer repeats these hrefs, so the locator has to be scoped — and the
     header nav is the one landmark the markup names, which is a steadier
     handle than the id the sticky-scroll script happens to use. */
  const nav = page.getByRole("navigation", { name: "Main" });
  const home = nav.locator(`a[href="${hrefOf("hero")}"]`);
  const experience = nav.locator(`a[href="${hrefOf("experience")}"]`);

  await expect(home).toHaveAttribute("aria-current", "location");

  await experience.click();
  await expect(experience).toHaveAttribute("aria-current", "location");
  /* Removed rather than set to "false" — the attribute has no falsy value. */
  await expect(home).not.toHaveAttribute("aria-current");
});

test.describe("on a phone viewport", () => {
  /* Both the description clamp and the toggle are gated on
     @media (width < 700px) as well as on html[data-js]. */
  test.use({ viewport: { width: 390, height: 844 } });

  test("read more expands a clamped description", async ({ page }) => {
    await page.goto("/");

    /* Two rows carry a read-more, so scope to one. */
    const row = page.locator(".exp-row").first();
    const toggle = row.getByRole("button", { name: "Read more" });

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();

    /* Assert state, never height: the row animates max-height for 650ms and
       clears the inline style on transitionend. The "Show less" name is itself
       proof the row opened — the label swap is driven by [data-open], so the
       accessible name only resolves once the attribute is set. */
    await expect(
      row.getByRole("button", { name: "Show less" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`has no accessibility violations in ${theme} mode`, async ({ page }) => {
    if (theme === "dark") {
      /* Seeded before first paint rather than by clicking the toggle, so the
         scan can't catch the page mid-fade. */
      await page.addInitScript(
        (key) => localStorage.setItem(key, "dark"),
        THEME_STORAGE_KEY,
      );
    }
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
