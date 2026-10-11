import { wordsOf } from "./lex.mjs";
import { isIdent, isPunct } from "./tokens.mjs";

const SCALE = "0, px, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96";
const OPEN = new Set(["(", "[", "{"]);
const CLOSE = new Set([")", "]", "}"]);
const COMPARISONS = new Set(["===", "!==", "==", "!="]);
const UTILITY_LIKE = /^(?:[a-z0-9-]+:)*-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|inset-x|inset-y|text|bg|border|ring|rounded|shadow|font|flex|grid|grid-cols|items|justify|self|overflow|opacity|z|cursor|whitespace|leading|tracking|line-clamp|rotate|translate|scale|animate|accent|outline|divide|space-x|space-y|order|col|row|basis|grow|shrink)-[a-z0-9]/;

const isComparison = (token) => token?.type === "punct" && COMPARISONS.has(token.value);

const isCompared = (tokens, index) =>
  isComparison(tokens[index + 1]) || isComparison(tokens[index - 1]) || isPunct(tokens[index + 1], "?");

const isClassKey = (tokens, index) => {
  const token = tokens[index];
  return (isIdent(token, "class") || (token.type === "string" && token.value === "class")) &&
    isPunct(tokens[index + 1], ":") && (isPunct(tokens[index - 1], "{") || isPunct(tokens[index - 1], ","));
};

// String and template tokens of a `class:` value, up to the end of the property,
// except strings that are compared or tested (`mode === "dark" ? ...`).
function classValueTokens(tokens, from) {
  const found = [];
  let depth = 0;
  for (let index = from; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === "punct") {
      if (OPEN.has(token.value)) depth++;
      else if (CLOSE.has(token.value)) { if (depth === 0) break; depth--; }
      else if ((token.value === "," || token.value === ";") && depth === 0) break;
      continue;
    }
    if ((token.type === "string" || token.type === "template") && !isCompared(tokens, index)) found.push(token);
  }
  return found;
}

export function classChecker({ isUtility, allowed }) {
  const known = (name) => allowed.has(name) || isUtility(name);

  const nameFindings = (token, names) => names.flatMap((name) => {
    if (name.includes("[") || name.includes("]")) {
      return [{ start: token.start, rule: "arbitrary-value", message: `arbitrary value "${name}"; use the fixed scales, or the style prop for a truly dynamic value` }];
    }
    if (known(name)) return [];
    return [{ start: token.start, rule: "unknown-class", message: `unknown class "${name}" does nothing; ${suggestion(name)}` }];
  });

  // Whether a string outside `class:` reads as a class list: lowercase words where
  // known classes make up at least half and the rest look like class names
  // (`cc-glass`, `p-7`), or nothing but utility-shaped words.
  const looksLikeClasses = (names) => {
    if (!names.length || names.some((name) => !/^-?[a-z][a-z0-9:/.\-[\]]*$/.test(name))) return false;
    const unknown = names.filter((name) => !known(name));
    if (!unknown.length) return false;
    if (names.length >= 2 && unknown.length * 2 <= names.length && unknown.every((name) => /[a-z0-9]-[a-z0-9]|:/.test(name))) return true;
    if (!unknown.every((name) => UTILITY_LIKE.test(name))) return false;
    return names.length >= 2 || /\d$|:/.test(names[0]);
  };

  return function classFindings(tokens, { strings }) {
    const findings = [];
    const shapes = [];
    const seen = new Set();

    tokens.forEach((token, index) => {
      if (!isClassKey(tokens, index)) return;
      const names = [];
      for (const value of classValueTokens(tokens, index + 2)) {
        seen.add(value);
        const words = wordsOf(value);
        names.push(...words);
        findings.push(...nameFindings(value, words));
      }
      const unique = [...new Set(names)].sort();
      if (unique.length >= 6) shapes.push({ start: token.start, tokens: unique });
    });

    if (strings) {
      tokens.forEach((token, index) => {
        if ((token.type !== "string" && token.type !== "template") || seen.has(token) || isCompared(tokens, index)) return;
        const words = wordsOf(token);
        if (looksLikeClasses(words)) findings.push(...nameFindings(token, words));
      });
    }
    return { findings, shapes };
  };
}

function suggestion(name) {
  const utility = name.split(":").pop();
  if (/^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|w|h|top|right|bottom|left|inset|inset-x|inset-y)-/.test(utility)) {
    return `use a step on the spacing scale (${SCALE})`;
  }
  const color = /^(bg|text|border|ring|accent)-([a-z]{2,})-\d+$/.exec(utility);
  if (color && /^(accent|neutral|success|warning|danger)$/.test(color[2])) {
    return "use a shade from 50, 100, 200, ... 900, 950";
  }
  if (color) {
    return `"${color[2]}" is not a color role; use accent, neutral, success, warning or danger, or list a role the app's theme adds in package.json "vrui.roles"`;
  }
  if (name.includes(":")) return "that variant or utility doesn't exist; see docs/utilities.md, or list an app class in package.json \"vrui.classes\"";
  return "use a VRUI utility (docs/utilities.md), or list an app-defined class in package.json \"vrui.classes\"";
}
