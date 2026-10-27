import { BREAKPOINT } from "./scales";
import { resolveUtility, type ResolvedUtility } from "./rules";

export type CompiledUtility = {
  css: string;
  key: string;
  order: string;
  token: string;
};

const states: Record<string, string> = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  "focus-visible-within": ":is(:focus-visible, :has(:focus-visible))",
  active: ":active",
  disabled: ":disabled",
  checked: ":checked",
  first: ":first-child",
  last: ":last-child",
};

const CAN_HOVER = "(hover:hover)";

const queries: Record<string, string> = {
  touch: "(hover:none)",
  "motion-safe": "(prefers-reduced-motion:no-preference)",
  "motion-reduce": "(prefers-reduced-motion:reduce)",
};

const pseudoElements: Record<string, readonly string[]> = {
  placeholder: ["::placeholder"],
  marker: ["::marker", " *::marker"],
  selection: ["::selection", " *::selection"],
};

function escapeClass(token: string): string {
  return token.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function declarations(entries: readonly (readonly [string, string])[]): string {
  return entries.map(([property, value]) => `${property}:${value}`).join(";");
}

function properties(utility: ResolvedUtility): string {
  return [
    ...utility.declarations.map(([property]) => property),
    ...(utility.nested ?? []).flatMap(([suffix, nested]) => nested.map(([property]) => `${suffix}${property}`)),
  ].sort().join(",");
}

export function compileUtility(token: string): CompiledUtility | undefined {
  const parts = token.split(":");
  const utilityName = parts.pop()!;
  const utility = resolveUtility(utilityName);
  if (!utility) return;

  let selector = "&";
  let breakpoint: keyof typeof BREAKPOINT | undefined;
  let group: string | undefined;
  let pseudo: readonly string[] | undefined;
  let dark = false;
  let children = false;
  const conditions = new Set<string>();

  for (const variant of parts) {
    if (variant in BREAKPOINT) {
      if (breakpoint) return;
      breakpoint = variant as keyof typeof BREAKPOINT;
      continue;
    }
    if (variant === "dark") {
      dark = true;
      continue;
    }
    if (variant === "*") {
      if (children) return;
      children = true;
      selector += " > *";
      continue;
    }
    const query = queries[variant];
    if (query) {
      conditions.add(query);
      continue;
    }
    const element = pseudoElements[variant];
    if (element) {
      if (pseudo) return;
      pseudo = element;
      continue;
    }
    const groupState = variant.startsWith("group-") ? states[variant.slice(6)] : undefined;
    if (groupState) {
      if (group) return;
      group = `.group${groupState} `;
      if (variant === "group-hover") conditions.add(CAN_HOVER);
      continue;
    }
    const suffix = states[variant];
    if (!suffix) return;
    selector += suffix;
    if (variant === "hover") conditions.add(CAN_HOVER);
  }
  if (pseudo && (children || utility.nested)) return;

  if (dark) {
    selector += ":where([data-vrui-mode=\"dark\"], [data-vrui-mode=\"dark\"] *)";
  }
  if (group) selector = `${group}${selector}`;
  const media = [...(breakpoint ? [`(min-width:${BREAKPOINT[breakpoint]})`] : []), ...conditions];
  const key = `${[...media].sort().join(" and ")}{${selector}${pseudo?.join(",") ?? ""}}${properties(utility)}`;
  selector = selector.replace("&", () => `.${escapeClass(token)}`);
  const targets = (pseudo ?? [""]).map((suffix) => `${selector}${suffix}`).join(",");

  let css = [
    `${targets}{${declarations(utility.declarations)}}`,
    ...(utility.nested ?? []).map(([suffix, nested]) => `${selector}${suffix}{${declarations(nested)}}`),
  ].join("");
  if (media.length) css = `@media ${media.join(" and ")}{${css}}`;
  css = `${utility.prelude ?? ""}${css}`;

  const breakpointOrder = breakpoint
    ? Object.keys(BREAKPOINT).indexOf(breakpoint) + 1
    : 0;
  return {
    css,
    key,
    order: `${breakpointOrder.toString().padStart(2, "0")}:${conditions.size ? 1 : 0}:${utility.order.toString().padStart(4, "0")}:${token}`,
    token,
  };
}

/** Whether VRUI generates CSS for this class name, including its variants. */
export function isUtility(token: string): boolean {
  return compileUtility(token) !== undefined;
}

/** Classes with the same key set the same properties under the same variants; in one class list the later one wins. */
export function utilityKey(token: string): string | undefined {
  return compileUtility(token)?.key;
}
