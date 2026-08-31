/* global.css is a co-owner of these values: its dark custom variant and
   [data-theme="dark"] token block hard-code the attribute, so change them in
   lockstep. */
export const THEME_STORAGE_KEY = "tj-portfolio-theme";

/** Set on <html> when dark; absent in light mode (the CSS default). */
export const THEME_ATTRIBUTE = "data-theme";

/** The --bg token per theme, for the theme-color meta (browser chrome). A
    <meta content> can't read CSS variables, so these mirror global.css —
    change them in lockstep too. */
export const THEME_COLORS = { light: "#ffffff", dark: "#0e0e0e" };

/** Milliseconds from a CSS <time>, whichever unit it arrives in. Reading a
    duration token back out of computed style needs this because the unit is
    not the one the source declares: the build minifies --theme-fade's `500ms`
    to `.5s`, so a bare parseFloat yields 0.5 in production and 500 in dev. */
export const cssTimeToMs = (value: string) => {
  const time = parseFloat(value);
  if (Number.isNaN(time)) return 0;
  return value.trim().endsWith("ms") ? time : time * 1000;
};
