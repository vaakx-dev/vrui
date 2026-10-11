import { colorValue } from "./colors";
import { ALPHA, BLUR, DURATION, EASE, FRACTION, LEADING, MAX_WIDTH, RADIUS, SHADOW, SPACE, TEXT, TRACKING } from "./scales";

export type Declaration = readonly [property: string, value: string];

export type ResolvedUtility = {
  declarations: readonly Declaration[];
  order: number;
  /** Extra rules on the same selector plus a suffix, such as a pseudo-element. */
  nested?: readonly (readonly [suffix: string, declarations: readonly Declaration[]])[];
  /** Complete at-rules the utility needs, such as `@keyframes` or `@property`. */
  prelude?: string;
};

/** Registers a custom property that does not inherit, so a parent's value never leaks into a child. */
const local = (name: string) => `@property ${name}{syntax:"*";inherits:false}`;

const negate = (value: string) => (value === "0px" ? value : `-${value}`);

const alpha = (key: string | undefined) => (key !== undefined && ALPHA.includes(key) ? Number(key) : undefined);

const exact: Record<string, ResolvedUtility> = {};

function add(
  order: number,
  names: Record<string, readonly Declaration[]>,
): void {
  for (const [name, declarations] of Object.entries(names)) {
    exact[name] = { declarations, order };
  }
}

add(100, {
  "box-border": [["box-sizing", "border-box"]],
  block: [["display", "block"]],
  "inline-block": [["display", "inline-block"]],
  inline: [["display", "inline"]],
  flex: [["display", "flex"]],
  "inline-flex": [["display", "inline-flex"]],
  grid: [["display", "grid"]],
  hidden: [["display", "none"]],
  contents: [["display", "contents"]],
});

add(105, {
  "sr-only": [
    ["position", "absolute"], ["width", "1px"], ["height", "1px"], ["padding", "0"], ["margin", "-1px"],
    ["overflow", "hidden"], ["clip", "rect(0, 0, 0, 0)"], ["white-space", "nowrap"], ["border-width", "0"],
  ],
  "not-sr-only": [
    ["position", "static"], ["width", "auto"], ["height", "auto"], ["padding", "0"], ["margin", "0"],
    ["overflow", "visible"], ["clip", "auto"], ["white-space", "normal"],
  ],
});

add(110, {
  static: [["position", "static"]],
  fixed: [["position", "fixed"]],
  absolute: [["position", "absolute"]],
  relative: [["position", "relative"]],
  sticky: [["position", "sticky"]],
  "z-0": [["z-index", "0"]],
  "z-10": [["z-index", "10"]],
  "z-20": [["z-index", "20"]],
  "z-30": [["z-index", "30"]],
  "z-40": [["z-index", "40"]],
  "z-50": [["z-index", "50"]],
});

add(200, {
  "flex-row": [["flex-direction", "row"]],
  "flex-col": [["flex-direction", "column"]],
  "flex-wrap": [["flex-wrap", "wrap"]],
  "flex-nowrap": [["flex-wrap", "nowrap"]],
  "flex-1": [["flex", "1 1 0%"]],
  grow: [["flex-grow", "1"]],
  "grow-0": [["flex-grow", "0"]],
  shrink: [["flex-shrink", "1"]],
  "shrink-0": [["flex-shrink", "0"]],
  "items-start": [["align-items", "flex-start"]],
  "items-center": [["align-items", "center"]],
  "items-end": [["align-items", "flex-end"]],
  "items-stretch": [["align-items", "stretch"]],
  "items-baseline": [["align-items", "baseline"]],
  "justify-start": [["justify-content", "flex-start"]],
  "justify-center": [["justify-content", "center"]],
  "justify-end": [["justify-content", "flex-end"]],
  "justify-between": [["justify-content", "space-between"]],
  "self-start": [["align-self", "flex-start"]],
  "self-center": [["align-self", "center"]],
  "self-end": [["align-self", "flex-end"]],
  "self-stretch": [["align-self", "stretch"]],
});

add(300, {
  "overflow-auto": [["overflow", "auto"]],
  "overflow-hidden": [["overflow", "hidden"]],
  "overflow-visible": [["overflow", "visible"]],
  "overflow-scroll": [["overflow", "scroll"]],
  "pointer-events-none": [["pointer-events", "none"]],
  "pointer-events-auto": [["pointer-events", "auto"]],
  "appearance-none": [["appearance", "none"]],
  "select-none": [["user-select", "none"]],
  "resize-none": [["resize", "none"]],
  resize: [["resize", "both"]],
  "resize-x": [["resize", "horizontal"]],
  "resize-y": [["resize", "vertical"]],
  "overscroll-auto": [["overscroll-behavior", "auto"]],
  "overscroll-contain": [["overscroll-behavior", "contain"]],
  "overscroll-none": [["overscroll-behavior", "none"]],
  group: [],
});

for (const axis of ["x", "y"]) {
  add(300, Object.fromEntries(
    ["auto", "hidden", "visible", "scroll"].map((value) => [`overflow-${axis}-${value}`, [[`overflow-${axis}`, value]]]),
  ));
}

const CURSORS = [
  "auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu",
  "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing",
  "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize",
  "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize",
  "zoom-in", "zoom-out",
];
add(300, Object.fromEntries(CURSORS.map((cursor) => [`cursor-${cursor}`, [["cursor", cursor]]])));

exact["scrollbar-none"] = {
  declarations: [["scrollbar-width", "none"]],
  nested: [["::-webkit-scrollbar", [["display", "none"]]]],
  order: 300,
};

add(400, {
  "m-auto": [["margin", "auto"]],
  "mx-auto": [["margin-inline", "auto"]],
  "my-auto": [["margin-block", "auto"]],
  "mt-auto": [["margin-top", "auto"]],
  "mr-auto": [["margin-right", "auto"]],
  "mb-auto": [["margin-bottom", "auto"]],
  "ml-auto": [["margin-left", "auto"]],
});

add(510, {
  "aspect-auto": [["aspect-ratio", "auto"]],
  "aspect-square": [["aspect-ratio", "1 / 1"]],
  "aspect-video": [["aspect-ratio", "16 / 9"]],
  ...Object.fromEntries(
    ["contain", "cover", "fill", "none", "scale-down"].map((fit) => [`object-${fit}`, [["object-fit", fit]]]),
  ),
  ...Object.fromEntries(
    ["center", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"]
      .map((place) => [`object-${place}`, [["object-position", place.replace("-", " ")]]]),
  ),
});

add(600, {
  "font-sans": [["font-family", "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji"]],
  "font-mono": [["font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace"]],
  "tabular-nums": [["font-variant-numeric", "tabular-nums"]],
  "whitespace-normal": [["white-space", "normal"]],
  "whitespace-pre": [["white-space", "pre"]],
  "whitespace-pre-line": [["white-space", "pre-line"]],
  "whitespace-pre-wrap": [["white-space", "pre-wrap"]],
  "whitespace-break-spaces": [["white-space", "break-spaces"]],
  "break-words": [["overflow-wrap", "break-word"]],
  "break-all": [["word-break", "break-all"]],
  "wrap-anywhere": [["overflow-wrap", "anywhere"]],
  "text-left": [["text-align", "left"]],
  "text-center": [["text-align", "center"]],
  "text-right": [["text-align", "right"]],
  "font-normal": [["font-weight", "400"]],
  "font-medium": [["font-weight", "500"]],
  "font-semibold": [["font-weight", "600"]],
  "font-bold": [["font-weight", "700"]],
  "italic": [["font-style", "italic"]],
  "not-italic": [["font-style", "normal"]],
  "list-none": [["list-style-type", "none"]],
  "whitespace-nowrap": [["white-space", "nowrap"]],
  "uppercase": [["text-transform", "uppercase"]],
  "lowercase": [["text-transform", "lowercase"]],
  "truncate": [
    ["overflow", "hidden"],
    ["text-overflow", "ellipsis"],
    ["white-space", "nowrap"],
  ],
  "no-underline": [["text-decoration-line", "none"]],
  underline: [["text-decoration-line", "underline"]],
  ...Object.fromEntries(Object.entries(TRACKING).map(([name, value]) => [`tracking-${name}`, [["letter-spacing", value]]])),
});

add(620, Object.fromEntries(Object.entries(LEADING).map(([name, value]) => [`leading-${name}`, [["line-height", value]]])));

add(700, {
  "border-0": [["border-width", "0px"]],
  border: [["border-width", "1px"]],
  "border-2": [["border-width", "2px"]],
  // Side widths zero the remaining sides so border-solid does not expose the
  // UA initial `medium` width on them.
  "border-t": [["border-width", "0px"], ["border-top-width", "1px"]],
  "border-r": [["border-width", "0px"], ["border-right-width", "1px"]],
  "border-b": [["border-width", "0px"], ["border-bottom-width", "1px"]],
  "border-l": [["border-width", "0px"], ["border-left-width", "1px"]],
  "border-solid": [["border-style", "solid"]],
  "outline-none": [["outline", "2px solid transparent"], ["outline-offset", "2px"]],
  "shadow-none": [["--vrui-shadow", "0 0 #0000"], ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"]],
  ...Object.fromEntries(["0", "1", "2", "4"].map((width) => [`ring-${width}`, [
    ["--vrui-ring-shadow", `var(--vrui-ring-inset,) 0 0 0 ${width}px var(--vrui-ring-color, currentColor)`],
    ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"],
  ]])),
});

exact["ring-inset"] = {
  declarations: [["--vrui-ring-inset", "inset"]],
  prelude: local("--vrui-ring-inset"),
  order: 700,
};

add(800, Object.fromEntries(ALPHA.map((step) => [`opacity-${step}`, [["opacity", String(Number(step) / 100)]]])));

const TRANSITIONS: Record<string, string> = {
  "": "color, background-color, border-color, box-shadow, opacity, transform, translate, rotate",
  all: "all",
  colors: "color, background-color, border-color",
  opacity: "opacity",
  shadow: "box-shadow",
  transform: "transform, translate, rotate",
};
for (const [name, properties] of Object.entries(TRANSITIONS)) {
  add(800, { [name ? `transition-${name}` : "transition"]: [["transition-property", properties], ["transition-duration", "150ms"]] });
}
add(800, { "transition-none": [["transition-property", "none"]] });

add(810, {
  ...Object.fromEntries(DURATION.map((ms) => [`duration-${ms}`, [["transition-duration", `${ms}ms`]]])),
  ...Object.fromEntries(DURATION.map((ms) => [`delay-${ms}`, [["transition-delay", `${ms}ms`]]])),
  ...Object.fromEntries(Object.entries(EASE).map(([name, curve]) => [`ease-${name}`, [["transition-timing-function", curve]]])),
});

for (const degrees of ["0", "45", "90", "180"]) {
  add(820, { [`rotate-${degrees}`]: [["rotate", `${degrees}deg`]] });
  if (degrees !== "0") add(820, { [`-rotate-${degrees}`]: [["rotate", `-${degrees}deg`]] });
}

const backdrop = (filter: string): readonly Declaration[] => [["-webkit-backdrop-filter", filter], ["backdrop-filter", filter]];
add(840, {
  "backdrop-blur": backdrop(BLUR.sm),
  ...Object.fromEntries(Object.entries(BLUR).map(([name, filter]) => [`backdrop-blur-${name}`, backdrop(filter)])),
});

exact["animate-spin"] = {
  declarations: [["animation", "vrui-spin 1s linear infinite"]],
  prelude: "@keyframes vrui-spin{to{transform:rotate(360deg)}}",
  order: 830,
};
add(830, { "animate-none": [["animation", "none"]] });

add(610, { "line-clamp-none": [["overflow", "visible"], ["display", "block"], ["-webkit-box-orient", "horizontal"], ["-webkit-line-clamp", "unset"]] });
for (const lines of ["1", "2", "3", "4", "5", "6"]) {
  add(610, {
    [`line-clamp-${lines}`]: [
      ["overflow", "hidden"],
      ["display", "-webkit-box"],
      ["-webkit-box-orient", "vertical"],
      ["-webkit-line-clamp", lines],
    ],
  });
}

function spacing(token: string): ResolvedUtility | undefined {
  const match = /^(-?)(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(\d+(?:\.5)?|px)$/.exec(token);
  if (!match) return;
  const [, minus, kind, key] = match as unknown as [string, string, string, string];
  if (minus && !kind.startsWith("m")) return;
  const space = SPACE[key as keyof typeof SPACE];
  if (!space) return;
  const value = minus ? negate(space) : space;

  const properties: Record<string, string[]> = {
    p: ["padding"], px: ["padding-inline"], py: ["padding-block"],
    pt: ["padding-top"], pr: ["padding-right"], pb: ["padding-bottom"], pl: ["padding-left"],
    m: ["margin"], mx: ["margin-inline"], my: ["margin-block"],
    mt: ["margin-top"], mr: ["margin-right"], mb: ["margin-bottom"], ml: ["margin-left"],
    gap: ["gap"], "gap-x": ["column-gap"], "gap-y": ["row-gap"],
  };
  return {
    declarations: properties[kind]!.map((property) => [property, value]),
    order: 400,
  };
}

function position(token: string): ResolvedUtility | undefined {
  const match = /^(-?)(top|right|bottom|left|inset-x|inset-y|inset)-(.+)$/.exec(token);
  if (!match) return;
  const [, minus, kind, key] = match as unknown as [string, string, string, string];
  const offset = SPACE[key as keyof typeof SPACE] ?? FRACTION[key as keyof typeof FRACTION];
  const value = minus ? offset && negate(offset) : offset ?? (key === "auto" ? "auto" : undefined);
  if (!value) return;
  const properties: Record<string, string[]> = {
    top: ["top"], right: ["right"], bottom: ["bottom"], left: ["left"],
    inset: ["inset"], "inset-x": ["left", "right"], "inset-y": ["top", "bottom"],
  };
  return {
    declarations: properties[kind]!.map((property) => [property, value]),
    order: 120,
  };
}

function size(token: string): ResolvedUtility | undefined {
  const match = /^(w|h|min-w|min-h|max-w|max-h)-(.+)$/.exec(token);
  if (!match) return;
  const [, kind, key] = match as unknown as [string, string, string];
  const property = {
    w: "width", h: "height", "min-w": "min-width", "min-h": "min-height",
    "max-w": "max-width", "max-h": "max-height",
  }[kind]!;
  const named: Record<string, string> = {
    auto: "auto", screen: kind.includes("w") ? "100vw" : "100vh",
    min: "min-content", max: "max-content", fit: "fit-content",
  };
  const value = SPACE[key as keyof typeof SPACE] ??
    FRACTION[key as keyof typeof FRACTION] ??
    (kind === "max-w" ? MAX_WIDTH[key as keyof typeof MAX_WIDTH] : undefined) ??
    named[key];
  if (!value) return;
  return { declarations: [[property, value]], order: 500 };
}

function translate(token: string): ResolvedUtility | undefined {
  const match = /^(-?)translate-([xy])-(.+)$/.exec(token);
  if (!match) return;
  const [, minus, axis, key] = match as unknown as [string, string, string, string];
  const offset = SPACE[key as keyof typeof SPACE] ?? FRACTION[key as keyof typeof FRACTION];
  if (!offset) return;
  const variable = `--vrui-translate-${axis}`;
  return {
    declarations: [
      [variable, minus ? negate(offset) : offset],
      ["translate", "var(--vrui-translate-x, 0) var(--vrui-translate-y, 0)"],
    ],
    prelude: local(variable),
    order: 820,
  };
}

function columns(token: string): ResolvedUtility | undefined {
  const match = /^grid-cols-(\d+)$/.exec(token);
  if (!match) return;
  const count = Number(match[1]);
  if (count < 1 || count > 12) return;
  return {
    declarations: [["grid-template-columns", `repeat(${count}, minmax(0, 1fr))`]],
    order: 210,
  };
}

function textSize(token: string): ResolvedUtility | undefined {
  if (!token.startsWith("text-")) return;
  const key = token.slice(5) as keyof typeof TEXT;
  const value = TEXT[key];
  if (!value) return;
  return {
    declarations: [["font-size", value[0]], ["line-height", value[1]]],
    order: 610,
  };
}

const CORNERS: Record<string, readonly string[]> = {
  "": ["border-radius"],
  t: ["border-top-left-radius", "border-top-right-radius"],
  r: ["border-top-right-radius", "border-bottom-right-radius"],
  b: ["border-bottom-right-radius", "border-bottom-left-radius"],
  l: ["border-top-left-radius", "border-bottom-left-radius"],
};

function rounded(token: string): ResolvedUtility | undefined {
  const match = /^rounded(?:-([trbl]))?(?:-(.+))?$/.exec(token);
  if (!match) return;
  const [, side = "", key = "md"] = match;
  const value = RADIUS[key as keyof typeof RADIUS];
  if (!value) return;
  return {
    declarations: CORNERS[side]!.map((property) => [property, value]),
    order: side ? 711 : 710,
  };
}

function shadow(token: string): ResolvedUtility | undefined {
  if (!token.startsWith("shadow-")) return;
  const key = token.slice(7) as keyof typeof SHADOW;
  const value = SHADOW[key];
  if (!value) return;
  return {
    declarations: [
      ["--vrui-shadow", value],
      ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"],
    ],
    order: 720,
  };
}

const COLOR_PROPERTY: Record<string, string> = {
  accent: "accent-color",
  bg: "background-color",
  text: "color",
  border: "border-color",
  ring: "--vrui-ring-color",
};

function color(token: string): ResolvedUtility | undefined {
  const match = /^(accent|bg|text|border|ring)-([a-z][a-z0-9-]*)-(\d+)(?:\/(\d+))?$/.exec(token);
  if (!match) return;
  const [, kind, name, shade, opacity] = match as unknown as [string, string, string, string, string | undefined];
  const base = colorValue(name, shade);
  const percent = alpha(opacity);
  if (!base || (opacity !== undefined && percent === undefined)) return;
  const value = percent === undefined ? base : `color-mix(in srgb, ${base} ${percent}%, transparent)`;
  return { declarations: [[COLOR_PROPERTY[kind]!, value]], order: 750 };
}

function simpleColor(token: string): ResolvedUtility | undefined {
  const match = /^(bg|text|border|ring)-(transparent|black|white|current)(?:\/(\d+))?$/.exec(token);
  if (!match) return;
  const [, kind, name, opacity] = match as unknown as [string, string, string, string | undefined];
  const percent = alpha(opacity);
  if (opacity !== undefined && (percent === undefined || (name !== "black" && name !== "white"))) return;
  const value = percent === undefined
    ? { transparent: "transparent", black: "#000", white: "#fff", current: "currentColor" }[name]!
    : `rgb(${name === "black" ? "0 0 0" : "255 255 255"} / ${percent / 100})`;
  return { declarations: [[COLOR_PROPERTY[kind]!, value]], order: 750 };
}

const resolvers = [position, spacing, size, translate, columns, textSize, rounded, shadow, color, simpleColor];

export function resolveUtility(token: string): ResolvedUtility | undefined {
  const known = exact[token];
  if (known) return known;
  for (const resolve of resolvers) {
    const result = resolve(token);
    if (result) return result;
  }
}
