/** Contact address, rendered by Contact (CTA links) and Footer (mailto + display). */
export const email = "timurjalilov1@gmail.com";

/** Site identity — page titles (index, 404), Hero's rail label, and Base's
    meta/JSON-LD. */
export const name = "Timur Jalilov";
export const role = "Senior Frontend Engineer";

/** Public profiles — Footer's "Elsewhere" links and Base's JSON-LD sameAs. */
export const socials = [
  { href: "https://github.com/TimurJ", label: "GitHub" },
  { href: "https://www.linkedin.com/in/timur-jalilov/", label: "LinkedIn" },
];

/** Social card served from public/og.jpg — Base's og:image tags. The card is
    rendered from scripts/og-card.html, whose fixed canvas must match these
    dimensions; that file names this object as the authority. */
export const ogImage = { src: "/og.jpg", width: 1200, height: 630 };
