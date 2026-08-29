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
