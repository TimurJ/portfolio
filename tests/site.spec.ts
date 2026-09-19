import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { homeHrefOf, hrefOf, sections, titleIdOf } from "../src/lib/nav";
import { cv, ogImage } from "../src/lib/site";
import {
  cssTimeToMs,
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

/* Attached before goto, or the scripts have already run by the time we
   listen. */
const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

/* What the theme flip should be animating, read from the stylesheet rather
   than restated here: every custom property the dark block declares, each for
   --theme-fade. Deriving it is the point — a hard-coded list can only catch a
   token dropped from the fade, not a twelfth one added to the palette and
   forgotten, which is the direction the drift actually goes.

   The selector is matched with its quotes stripped because the build minifies
   [data-theme="dark"] to [data-theme=dark], and the block is top level in both
   the dev and the built stylesheet, so a flat walk reaches it. */
const expectedTokenFade = async (page: Page) => {
  const { tokens, fade } = await page.evaluate((attribute) => {
    const declared: string[] = [];
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (
          rule instanceof CSSStyleRule &&
          rule.selectorText.replaceAll('"', "") === `[${attribute}=dark]`
        ) {
          for (const property of rule.style) {
            if (property.startsWith("--")) declared.push(property);
          }
        }
      }
    }
    return {
      tokens: declared,
      fade: getComputedStyle(document.documentElement).getPropertyValue(
        "--theme-fade",
      ),
    };
  }, THEME_ATTRIBUTE);

  return Object.fromEntries(tokens.map((token) => [token, cssTimeToMs(fade)]));
};

/* The CSS transitions the root element is running, as {property: duration}.
   Only the theme flip animates anything on <html>, so this needs no filtering
   beyond "is a transition". */
const rootTransitions = (page: Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      document.documentElement
        .getAnimations()
        .filter(
          (animation): animation is CSSTransition =>
            animation instanceof CSSTransition,
        )
        .map((animation) => [
          animation.transitionProperty,
          Number(animation.effect?.getComputedTiming().duration),
        ]),
    ),
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
  const errors = collectErrors(page);
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

  /* The fade runs on the tokens, on the root, and nowhere else — the whole
     point of registering them (global.css) is that one interpolated value
     drives every colour, so text can't finish after its background. Read
     through getAnimations rather than by sampling a frame, which would be a
     race against the interpolation; this reads the transitions the flip
     started, not their progress. It is captured first, before any awaited
     assertion, because ThemeToggle drops .theme-switching 560ms after the
     click and the animations go with it. */
  const started = await rootTransitions(page);

  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, "dark");
  await expect(themeColor).toHaveAttribute("content", THEME_COLORS.dark);
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();

  expect(started).toEqual(await expectedTokenFade(page));

  await page.reload();
  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, "dark");
});

test.describe("with no stored choice and a dark OS", () => {
  test.use({ colorScheme: "dark" });

  /* Light is the default outright: the site never reads prefers-color-scheme,
     so a dark machine gets a light page. This is the only case that can catch
     an OS fallback creeping back into the pre-paint script — every other test
     runs under the config's light colorScheme, where a light page proves
     nothing. */
  test("the page still opens light", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute(THEME_ATTRIBUTE);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      THEME_COLORS.light,
    );
  });

  /* The escape hatch the whole arrangement rests on: ignoring the OS is only
     defensible if a visitor who wants dark can still get there. This overlaps
     the flip-and-persist case above on purpose — that one runs under a light
     OS, and what this adds is that a dark machine doesn't gate the toggle. */
  test("the toggle still reaches dark", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute(THEME_ATTRIBUTE, "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      THEME_COLORS.dark,
    );
  });
});

test("a later OS switch leaves the theme alone", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(html).not.toHaveAttribute(THEME_ATTRIBUTE);

  /* The page has already painted, so a change here could only come from a
     listener — and there is none. Asserting that absence needs a positive to
     wait on first: a `not.toHaveAttribute` passes on its first poll, which can
     land before the renderer has even dispatched the media change, so on its
     own it would go green against a page that was about to flip. This marker
     listener is registered before the switch and proves the event reached page
     scripts, so by the time the negative runs a reintroduced subscription would
     already have acted. Together with the dark-OS case above — which covers the
     pre-paint half — that closes both sides. */
  await page.evaluate(() => {
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      () => document.documentElement.setAttribute("data-mq-fired", ""),
      { once: true },
    );
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveAttribute("data-mq-fired");
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
  const errors = collectErrors(page);

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

test("the footer's Résumé link serves the hosted CV", async ({ page }) => {
  await page.goto("/");
  const link = page
    .getByRole("contentinfo")
    .getByRole("link", { name: /Résumé/ });
  await expect(link).toHaveAttribute("href", cv);
  /* Resolved against baseURL, so this is the file astro preview serves out
     of dist/ — a renamed or dropped PDF fails here, not on the live site. */
  const response = await page.request.get(cv);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

/* The first article's URL, read off the home page rather than imported: the
   collection lives behind astro:content, which node can't resolve here. Any
   post will do — the cases below assert the page's shape, not its content. */
const firstArticleHref = async (page: Page) => {
  await page.goto("/");
  const href = await page
    .locator("#blog a.blog-row")
    .first()
    .getAttribute("href");
  if (!href) throw new Error("no article row on the home page");
  return href;
};

test.describe("blog", () => {
  test("home rows are links to article pages, named by their title", async ({
    page,
  }) => {
    await page.goto("/");
    const rows = page.locator("#blog a.blog-row");
    await expect(rows).not.toHaveCount(0);
    for (const row of await rows.all()) {
      /* Trailing slash: the URL as built and served, so no redirect hop. */
      await expect(row).toHaveAttribute("href", /^\/blog\/[a-z0-9-]+\/$/);
      /* aria-labelledby names the row by its title alone, not the whole card. */
      await expect(row).toHaveAccessibleName(
        await row.locator("h3").innerText(),
      );
    }
  });

  test("an article page answers with its own head and a home-first nav", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const href = await firstArticleHref(page);
    const response = await page.goto(href);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    /* Base builds the canonical from `site`, so under preview only the path
       can agree with the served URL. */
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical && new URL(canonical).pathname).toBe(
      new URL(page.url()).pathname,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    await expect(
      page.locator('meta[property="article:published_time"]'),
    ).toHaveCount(1);

    /* Off the home page a bare #hash is dead, so every nav link goes home
       first — and the scroll-spy, matching none of them, highlights none. */
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const { id } of sections) {
      await expect(nav.locator(`a[href="${homeHrefOf(id)}"]`)).toHaveCount(1);
    }
    await expect(nav.locator("a[aria-current]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("an article's social card is its own, built, and the size it claims", async ({
    page,
  }) => {
    const href = await firstArticleHref(page);
    await page.goto(href);
    const card = `${href}og.png`;

    /* The card lives beside the page and is named by the title, not the site. */
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(image && new URL(image).pathname).toBe(card);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      await page.getByRole("heading", { level: 1 }).innerText(),
    );

    /* Built, not just advertised: fetch it and read the PNG's IHDR (the
       width and height at bytes 16–24) against `ogImage`, the one source the
       og:image:width/height metas are printed from. */
    const response = await page.request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(ogImage.width);
    expect(png.readUInt32BE(20)).toBe(ogImage.height);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`an article has no accessibility violations in ${theme} mode`, async ({
      page,
    }) => {
      /* Seeded before the first goto, so both navigations paint dark. */
      if (theme === "dark") await seedDark(page);
      await page.goto(await firstArticleHref(page));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test.describe("on a phone viewport", () => {
    /* The article collapses to one column below 900px and steps its type down
       below 700px; the desktop scan never sees either. */
    test.use({ viewport: { width: 390, height: 844 } });

    test("an article has no accessibility violations", async ({ page }) => {
      await page.goto(await firstArticleHref(page));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test("/blog lands on the blog section", async ({ page }) => {
    /* Astro's static redirect is a meta-refresh shell, which preview serves
       for /blog as it would any directory index. Not axe-scanned: the shell
       has no <html lang>, and nobody is meant to see it. */
    await page.goto("/blog");
    await page.waitForURL(/\/#blog$/);
    await expect(page.locator("section#blog")).toBeVisible();
  });
});
