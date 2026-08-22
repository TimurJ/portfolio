/** Shared presentation attrs for the inline stroke icons (spread onto <svg>);
    size and stroke weight are the only things that vary between them. */
export const iconAttrs = (size: number, strokeWidth: number) =>
  ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": strokeWidth,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }) as const;
