/* UTC throughout: a frontmatter `pubDate: 2026-10-01` parses as UTC midnight,
   and a formatter in the machine's own zone would print 30 September
   anywhere west of Greenwich. */
const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "September 2026" — the homepage row. */
export const formatMonthYear = (date: Date): string => monthYear.format(date);

/** "19 September 2026" — the article header. */
export const formatLongDate = (date: Date): string => longDate.format(date);

/** "2026-09-19" — `<time datetime>`, article:published_time, datePublished. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
