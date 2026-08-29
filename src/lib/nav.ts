/** The page's sections in scroll order — the single source for the header
    nav, the footer nav, the scroll-cue chain, and each section's own id. */
export const sections = [
  { id: "hero", label: "Home" },
  { id: "experience", label: "Experiences" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
/** In-page link target for a section. */
export type SectionHref = `#${SectionId}`;

export const hrefOf = (id: SectionId): SectionHref => `#${id}`;

/** The id of a section's own heading, for the section's aria-labelledby — a
    <section> is only exposed as a region landmark once it has a name. Derived
    from the same SectionId as the link target, so the two can't drift. */
export const titleIdOf = (id: SectionId) => `${id}-title`;
