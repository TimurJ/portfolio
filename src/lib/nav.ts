/** The page's sections in scroll order — the single source for the header
    nav, the footer nav, the scroll-cue chain, and each section's own id. */
export const sections = [
  { id: "hero", label: "Home" },
  { id: "experience", label: "Experience" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
/** In-page link target for a section. */
export type SectionHref = `#${SectionId}`;
/** A section heading's id — the four real sections and nothing else, so the
    prop typed to it rejects an arbitrary string. Not generic in the section id:
    no consumer holds one section's title id at a narrower type than this, so
    the extra precision would be computed and discarded. */
export type SectionTitleId = `${SectionId}-title`;

export const hrefOf = (id: SectionId): SectionHref => `#${id}`;

/** A section's scroll-cue target: the next entry in the shared order.
    undefined for the last section, which has nothing to cue on to. */
export const nextOf = (id: SectionId): SectionHref | undefined => {
  const next = sections[sections.findIndex((section) => section.id === id) + 1];
  return next && hrefOf(next.id);
};

/** The id of a section's own heading, for the section's aria-labelledby — a
    <section> is only exposed as a region landmark once it has a name. Derived
    from the same SectionId as the link target, so the two can't drift.

    Bind the result to a const rather than calling this twice per section: the
    aria-labelledby and the heading id the section renders must agree, and two
    independent calls would type-check even after one drifted. */
export const titleIdOf = (id: SectionId): SectionTitleId => `${id}-title`;
