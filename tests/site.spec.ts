import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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

/* Seeded into storage before first paint rather than set by clicking the
   toggle, so a scan can't catch the page mid-fade. */
const seedDark = (page: Page) =>
  page.addInitScript(
    (key) => localStorage.setItem(key, "dark"),
    THEME_STORAGE_KEY,
  );

/* Click the first Experience row open and assert the description really grew.

   State alone is not enough: delete the [data-open] max-height rule and the
   click still sets an inline max-height, still flips aria-expanded and still
   swaps the label, so every state assertion stays green while the text is
   clipped.

   Height alone is not enough either, and this was measured rather than assumed
   — two polls for "taller than before" were tried and both passed against the
   deleted rule. The row animates twice: out to the inline pixel height, then,
   once that style is cleared, back down to the clamp. Any poll for a taller box
   catches one of those frames and goes green.

   The settled computed value is what has no transient: with the rule the open
   row resolves to max-height: none, and toHaveCSS retries until the inline
   style is gone and it does. Without it, it resolves to the clamp forever.
   `none` also means nothing is left to animate toward, so the box has reached
   full height and can be measured directly. */
const expectRowExpands = async (page: Page) => {
  const description = page.locator(".exp-row").first().locator(".exp-desc");
  const clamped = (await description.boundingBox())?.height ?? 0;
  expect(clamped).toBeGreaterThan(0);

  await page
    .locator(".exp-row")
    .first()
    .getByRole("button", { name: "Read more" })
    .click();

  await expect(description).toHaveCSS("max-height", "none");
  expect((await description.boundingBox())?.height ?? 0).toBeGreaterThan(
    clamped,
  );
};

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
     see is the usual way this breaks, and toBeVisible() cannot catch it: an
     sr-only element is a 1x1 box with clip-path, and Playwright's visibility is
     checkVisibility() plus a non-empty rect, neither of which reads clip-path.
     One assertion per way the reveal breaks — dropping the :focus block leaves
     position static, dropping focus:not-sr-only leaves the clip in place. */
  await expect(skipLink).toHaveCSS("position", "fixed");
  await expect(skipLink).toHaveCSS("clip-path", "none");

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  /* The hash changes whether or not #main resolves, so the URL alone stays
     green with id="main" deleted. Tabbing on is what proves the target exists
     — and that <main> needs no tabindex="-1" for focus to continue inside it,
     which is why the fragment gets no focus of its own to assert. */
  await page.keyboard.press("Tab");
  await expect(page.locator("main :focus")).toHaveCount(1);
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

test.describe("with no stored choice and a dark OS", () => {
  test.use({ colorScheme: "dark" });

  /* The other half of the theme contract, and the one the rest of the suite
     can't see: with nothing in localStorage the pre-paint script defers to the
     OS. Every other test runs under the config's light colorScheme, so without
     this case the fallback branch is never executed. */
  test("the page opens dark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(THEME_ATTRIBUTE, "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      THEME_COLORS.dark,
    );
  });
});

test("a later OS switch flips the theme, until a choice is stored", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(html).not.toHaveAttribute(THEME_ATTRIBUTE);

  /* The page has already painted, so this is the listener's job, not the
     pre-paint script's — nothing here reloads. */
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, "dark");
  await expect(themeColor).toHaveAttribute("content", THEME_COLORS.dark);

  /* And the other half of the rule: using the toggle is making a choice, after
     which the OS stops being consulted. The button's name is the theme it
     switches *to*, so on a dark page it reads "Light theme". */
  await page.getByRole("button", { name: "Light theme" }).click();
  await expect(html).not.toHaveAttribute(THEME_ATTRIBUTE);

  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).not.toHaveAttribute(THEME_ATTRIBUTE);
  await expect(themeColor).toHaveAttribute("content", THEME_COLORS.light);
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

    await expectRowExpands(page);

    /* The "Show less" name is itself proof the row opened — the label swap is
       driven by [data-open], so the accessible name only resolves once the
       attribute is set. */
    await expect(
      row.getByRole("button", { name: "Show less" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("read more still expands with reduced motion", async ({ page }) => {
    /* The blanket transition override in global.css is 0.01ms rather than 0
       precisely so transitionend still fires for the expand handler. At 0 it
       would never fire, the inline pixel height would never be cleared, and the
       computed max-height would stay that pixel value instead of settling on
       none — which is the assertion expectRowExpands makes. */
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expectRowExpands(page);
  });

  test("a description that fits loses both its toggle and its fade", async ({
    page,
  }) => {
    await page.goto("/");

    const row = page.locator(".exp-row").first();
    const description = row.locator(".exp-desc");
    const toggle = row.getByRole("button", { name: "Read more" });

    await expect(toggle).toBeVisible();
    await expect(description).not.toHaveCSS("mask-image", "none");

    /* Neither shipped description can fit the clamp — both run past five lines
       at this width — so the only way to reach this path is to shorten one in
       the page and let the component's own resize handler re-measure. */
    const setText = (text: string) =>
      description.evaluate((element, value) => {
        element.textContent = value;
        window.dispatchEvent(new Event("resize"));
      }, text);

    const original = (await description.textContent()) ?? "";
    await setText("Short enough to fit.");

    /* The toggle would otherwise be a control that changes nothing, and the
       fade would ramp the bottom 14px of a box shorter than the clamp —
       advertising hidden content over a real final line. */
    await expect(toggle).toBeHidden();
    await expect(description).toHaveCSS("mask-image", "none");

    /* Restoring the text must bring both back, and this half is load-bearing:
       it pins the clamp staying unconditional. Scope max-height to
       :not([data-fits]) instead and scrollHeight equals clientHeight whatever
       the text says, so the row measures as fitting forever and never
       re-clamps. */
    await setText(original);

    await expect(toggle).toBeVisible();
    await expect(description).not.toHaveCSS("mask-image", "none");
  });

  /* The read-more button, its aria-expanded/aria-controls pair, the clamp and
     ThemeToggle's sr-only label are live only below the phone tiers, so the
     desktop scan above has never seen any of them. Expanded as well as
     collapsed: the open state is the one the script builds. */
  for (const theme of ["light", "dark"] as const) {
    test(`has no accessibility violations in ${theme} mode`, async ({
      page,
    }) => {
      if (theme === "dark") await seedDark(page);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const collapsed = await new AxeBuilder({ page }).analyze();
      expect(collapsed.violations).toEqual([]);

      await page
        .locator(".exp-row")
        .first()
        .getByRole("button", { name: "Read more" })
        .click();

      const expanded = await new AxeBuilder({ page }).analyze();
      expect(expanded.violations).toEqual([]);
    });
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`has no accessibility violations in ${theme} mode`, async ({ page }) => {
    if (theme === "dark") await seedDark(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("the 404 page is reachable, noindex, and clean", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  /* The Worker serves dist/404.html for any unmatched path
     (not_found_handling: "404-page"), and astro preview serves the same file,
     so requesting a path that doesn't exist exercises what deploys. It is a
     real page with the pre-paint script on it, and nothing else in this suite
     ever loads it. */
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  /* Base gives a page one or the other, never both: a noindex page has no
     canonical worth asserting, and the two would be conflicting signals. */
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  /* Requesting a path that doesn't exist makes the browser log the document's
     own 404 status as a console error — that is the navigation, not the page.
     Everything else still has to be clean: a subresource that fails to load,
     or a script that throws, carries a different message and fails here. */
  expect(
    errors.filter((message) => !message.includes("status of 404")),
  ).toEqual([]);
});
