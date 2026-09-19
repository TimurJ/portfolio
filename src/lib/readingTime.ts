export const WORDS_PER_MINUTE = 200;

/** Minutes to read a markdown body at 200 wpm, never below 1. Counts every
    whitespace-separated token, code blocks included — they are read too, and
    a one-line estimate beats a markdown parser for a "N min read" label. */
export const readingTime = (body: string): number => {
  const words = body.match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};
