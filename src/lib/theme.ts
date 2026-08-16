/* global.css is a co-owner of these values: its dark custom variant and
   [data-theme="dark"] token block hard-code the attribute, so change them in
   lockstep. */
export const THEME_STORAGE_KEY = "tj-portfolio-theme";

/** Set on <html> when dark; absent in light mode (the CSS default). */
export const THEME_ATTRIBUTE = "data-theme";
