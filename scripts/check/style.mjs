import { isIdent, isPunct } from "./tokens.mjs";

const OPEN = new Set(["(", "[", "{"]);
const CLOSE = new Set([")", "]", "}"]);

const table = new Map();
const same = (property, values, prefix = "") => {
  for (const value of values) table.set(`${property}:${value}`, `${prefix}${value}`);
};
same("position", ["static", "fixed", "absolute", "relative", "sticky"]);
same("display", ["block", "inline-block", "inline", "flex", "inline-flex", "grid", "contents"]);
table.set("display:none", "hidden");
for (const side of ["top", "right", "bottom", "left", "inset"]) {
  for (const zero of ["0", "0px"]) table.set(`${side}:${zero}`, `${side}-0`);
  table.set(`${side}:100%`, `${side}-full`);
  table.set(`${side}:auto`, `${side}-auto`);
}
for (const [property, prefix] of [["width", "w"], ["height", "h"]]) {
  table.set(`${property}:100%`, `${prefix}-full`);
  table.set(`${property}:auto`, `${prefix}-auto`);
}
same("overflow", ["auto", "hidden", "visible", "scroll"], "overflow-");
same("cursor", ["auto", "default", "pointer"], "cursor-");
same("pointer-events", ["none", "auto"], "pointer-events-");
same("white-space", ["nowrap", "pre", "pre-wrap"], "whitespace-");
same("text-align", ["left", "center", "right"], "text-");
same("flex-direction", ["row"], "flex-");
table.set("flex-direction:column", "flex-col");
table.set("flex-wrap:wrap", "flex-wrap");
table.set("flex-shrink:0", "shrink-0");
table.set("flex-grow:1", "grow");
table.set("flex-grow:0", "grow-0");
table.set("user-select:none", "select-none");
table.set("box-sizing:border-box", "box-border");
table.set("align-items:center", "items-center");
table.set("justify-content:center", "justify-center");
table.set("justify-content:space-between", "justify-between");
for (const [value, name] of [["0", "0"], ["0.25", "25"], ["0.5", "50"], ["0.75", "75"], ["1", "100"]]) table.set(`opacity:${value}`, `opacity-${name}`);
for (const level of ["0", "10", "20", "30", "40", "50"]) table.set(`z-index:${level}`, `z-${level}`);
for (const [weight, name] of [["400", "normal"], ["500", "medium"], ["600", "semibold"], ["700", "bold"]]) table.set(`font-weight:${weight}`, `font-${name}`);

const kebab = (key) => key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
const normalValue = (token) => (token.type === "number" ? String(Number(token.value)) : token.value.trim());

const isStyleKey = (tokens, index) =>
  (isIdent(tokens[index], "style") || (tokens[index].type === "string" && tokens[index].value === "style")) &&
  isPunct(tokens[index + 1], ":") && (isPunct(tokens[index - 1], "{") || isPunct(tokens[index - 1], ","));

// Fixed style entries in `style:` values that a built-in utility already sets, such as `top: '0'`.
export function styleFindings(tokens) {
  const findings = [];
  tokens.forEach((token, index) => {
    if (!isStyleKey(tokens, index)) return;
    let depth = 0;
    for (let at = index + 2; at < tokens.length; at++) {
      const current = tokens[at];
      if (current.type === "punct") {
        if (OPEN.has(current.value)) depth++;
        else if (CLOSE.has(current.value)) { if (depth === 0) break; depth--; }
        else if ((current.value === "," || current.value === ";") && depth === 0) break;
        continue;
      }
      if ((current.type !== "ident" && current.type !== "string") || !isPunct(tokens[at + 1], ":")) continue;
      if (!isPunct(tokens[at - 1], "{") && !isPunct(tokens[at - 1], ",")) continue;
      const value = tokens[at + 2];
      const end = tokens[at + 3];
      if (!value || (value.type !== "string" && value.type !== "number") || !(isPunct(end, ",") || isPunct(end, "}"))) continue;
      const property = kebab(current.value);
      const utility = table.get(`${property}:${normalValue(value)}`);
      if (utility) {
        findings.push({ start: current.start, rule: "style-utility", message: `style ${current.value}: ${JSON.stringify(value.type === "number" ? Number(value.value) : value.value)} duplicates the "${utility}" utility; add "${utility}" to class instead` });
      }
    }
  });
  return findings;
}
