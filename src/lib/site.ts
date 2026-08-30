/** Contact address, displayed by Footer. */
export const email = "timurjalilov1@gmail.com";

/** The destination of every "Get in Touch" CTA — the header and section intros
    (ContactCta), the Contact section's button, and the footer's address. Built
    once here because three components need the same href, and a `mailto:`
    assembled in each of them is a string that can drift. */
export const mailto = `mailto:${email}`;

/** Site identity — page titles (index, 404), Hero's rail label, and Base's
    meta/JSON-LD. */
export const name = "Timur Jalilov";
export const role = "Senior Frontend Engineer";

/** The home page's meta description, and so its og/twitter description. Lives
    here with the other identity strings rather than inline in the page.
    Length is deliberate: 156 characters, inside the ~155-160 Google renders
    before truncating, so the sentence is never cut mid-phrase. */
export const description = `${role} in London building the frontends of real-time trading platforms — currently leading the team behind an energy-commodities terminal.`;

/** Public profiles — Footer's "Elsewhere" links and Base's JSON-LD sameAs. */
export const socials = [
  { href: "https://github.com/TimurJ", label: "GitHub" },
  { href: "https://www.linkedin.com/in/timur-jalilov/", label: "LinkedIn" },
];

/** Social card served from public/og.jpg — Base's og:image tags. The card is
    rendered from scripts/og-card.html, whose fixed canvas must match these
    dimensions; that file names this object as the authority. */
export const ogImage = { src: "/og.jpg", width: 1200, height: 630 };
