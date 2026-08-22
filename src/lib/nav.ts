/** The page's sections in scroll order — the single source for the header
    nav, the footer nav, the scroll-cue chain, and each section's own id. */
export const sections = [
  { id: "hero", label: "Home" },
  { id: "experience", label: "Experiences" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
export type SectionHref = `#${SectionId}`;

export const hrefOf = (id: SectionId): SectionHref => `#${id}`;
