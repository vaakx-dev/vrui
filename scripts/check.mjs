#!/usr/bin/env node
// vrui-check: flags VRUI application code that bypasses VRUI.
//
//   vrui-check [paths...]
//
// Paths default to the "vrui.check" list in ./package.json, then to "src".
// Configure it in package.json:
//
//   "vrui": {
//     "check": ["src"],             folders or files to scan
//     "classes": ["markdown"],      app-defined class names that are not utilities
//     "ui": ["@vaakx-dev/vrui"]     a file is UI code when it imports one of these
//   }
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const vrui = await loadVrui();

async function loadVrui() {
  const built = join(here, "..", "dist", "index.js");
  const source = join(here, "..", "src", "index.ts");
  try {
    return await import(pathToFileURL(existsSync(built) ? built : source).href);
  } catch (error) {
    console.error(`vrui-check: could not load VRUI (${error.message}). Build it with "npm run build" or run the check with Bun.`);
    process.exit(2);
  }
}

const CALL_ROUTES = new Map([
  ["addEventListener", "event props, onTarget, onWindow, onDocument, or listen"],
  ["appendChild", "VRUI factories, children, mount, list, or portal"],
  ["removeChild", "show, list, replace, or a scoped disposer"],
  ["replaceChild", "replace or a flow helper"],
  ["createElement", "a VRUI DOM or SVG factory"],
  ["setTimeout", "onTimeout"],
  ["setInterval", "onInterval"],
  ["requestAnimationFrame", "onRaf"],
]);

const CONSTRUCT_ROUTES = new Map([
  ["ResizeObserver", "resizeObserver"],
  ["IntersectionObserver", "intersectionObserver"],
  ["MutationObserver", "a VRUI flow or lifecycle helper"],
]);

const ASSIGNMENT_ROUTES = new Map([
  ["className", "a reactive class prop"],
  ["innerHTML", "VRUI factories and children"],
  ["textContent", "a reactive child or text prop"],
]);

const SCALE = "0, px, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96";

// ---------------------------------------------------------------- config

function readConfig(cwd) {
  const manifest = join(cwd, "package.json");
  if (!existsSync(manifest)) return {};
  const config = JSON.parse(readFileSync(manifest, "utf8")).vrui ?? {};
  return typeof config === "object" && config ? config : {};
}

const cwd = process.cwd();
const config = readConfig(cwd);
const args = process.argv.slice(2);
const roots = (args.length ? args : config.check ?? ["src"]).map((path) => resolve(cwd, path));
const allowed = new Set(config.classes ?? []);
const uiModules = config.ui ?? ["@vaakx-dev/vrui"];

// ---------------------------------------------------------------- files

const SKIP = new Set(["node_modules", "dist", ".git", "integrations"]);

function collect(path, found) {
  if (!existsSync(path)) {
    console.error(`vrui-check: ${relative(cwd, path)} does not exist`);
    process.exit(2);
  }
  if (statSync(path).isFile()) {
    found.push(path);
    return found;
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) collect(child, found);
    else if (/\.(ts|tsx|html)$/.test(entry.name) && !/\.(d|test)\.ts$/.test(entry.name)) found.push(child);
  }
  return found;
}

// Groups repeated-shape findings by the nearest package, or the first folder under the scanned root.
function projectOf(path) {
  for (let dir = dirname(path); dir.startsWith(cwd) && dir !== cwd; dir = dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
  }
  const root = roots.find((candidate) => path.startsWith(candidate)) ?? cwd;
  return join(root, relative(root, path).split(/[\\/]/)[0]);
}

// ---------------------------------------------------------------- lexer

const REGEX_BEFORE = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
const REGEX_KEYWORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "yield", "await"]);

// Splits TypeScript into identifiers, punctuation and string literals, skipping comments.
// Template literals with substitutions become a "template" token whose parts are lexed recursively.
function lex(text) {
  const tokens = [];
  let i = 0;
  const previous = () => tokens[tokens.length - 1];

  const readString = (quote) => {
    const start = i++;
    let value = "";
    while (i < text.length && text[i] !== quote) {
      if (text[i] === "\\") { value += text[i + 1]; i += 2; continue; }
      if (text[i] === "\n" && quote !== "`") break;
      value += text[i++];
    }
    i++;
    return { start, value };
  };

  const readTemplate = () => {
    const start = i++;
    let value = "";
    let dynamic = false;
    while (i < text.length && text[i] !== "`") {
      if (text[i] === "\\") { value += text[i + 1]; i += 2; continue; }
      if (text[i] === "$" && text[i + 1] === "{") {
        dynamic = true;
        let depth = 1;
        const inner = i + 2;
        i += 2;
        while (i < text.length && depth) {
          if (text[i] === "`") readTemplate();
          else if (text[i] === "'" || text[i] === '"') readString(text[i]);
          else {
            if (text[i] === "{") depth++;
            if (text[i] === "}") depth--;
            i++;
          }
        }
        tokens.push(...lex(text.slice(inner, i - 1)).map((token) => ({ ...token, start: token.start + inner })));
        continue;
      }
      value += text[i++];
    }
    i++;
    return { start, value, dynamic };
  };

  while (i < text.length) {
    const char = text[i];
    if (/\s/.test(char)) { i++; continue; }
    if (char === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (char === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i + 2); i = i < 0 ? text.length : i + 2; continue; }
    if (char === "'" || char === '"') { const { start, value } = readString(char); tokens.push({ type: "string", value, start }); continue; }
    if (char === "`") {
      const { start, value, dynamic } = readTemplate();
      tokens.push({ type: dynamic ? "template" : "string", value, start });
      continue;
    }
    if (char === "/") {
      const before = previous();
      const regex = !before || (before.type === "punct" && REGEX_BEFORE.has(before.value)) ||
        (before.type === "ident" && REGEX_KEYWORDS.has(before.value));
      if (regex) {
        let inClass = false;
        i++;
        while (i < text.length && text[i] !== "\n") {
          if (text[i] === "\\") { i += 2; continue; }
          if (text[i] === "[") inClass = true;
          else if (text[i] === "]") inClass = false;
          else if (text[i] === "/" && !inClass) break;
          i++;
        }
        i++;
        while (/[a-z]/i.test(text[i] ?? "")) i++;
        tokens.push({ type: "regex", value: "", start: i });
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = i;
      while (/[\w$]/.test(text[i] ?? "")) i++;
      tokens.push({ type: "ident", value: text.slice(start, i), start });
      continue;
    }
    if (/\d/.test(char)) { const start = i; while (/[\w.]/.test(text[i] ?? "")) i++; tokens.push({ type: "number", value: text.slice(start, i), start }); continue; }
    if (text.startsWith("=>", i) || text.startsWith("==", i) || text.startsWith("!=", i) ||
      text.startsWith("<=", i) || text.startsWith(">=", i) || text.startsWith("?.", i) ||
      text.startsWith("&&", i) || text.startsWith("||", i) || text.startsWith("??", i) || text.startsWith("...", i)) {
      const width = text.startsWith("...", i) || text.startsWith("===", i) || text.startsWith("!==", i) ? 3 : 2;
      tokens.push({ type: "punct", value: text.slice(i, i + width), start: i });
      i += width;
      continue;
    }
    tokens.push({ type: "punct", value: char, start: i });
    i++;
  }
  return tokens;
}

// ---------------------------------------------------------------- inspection

const OPEN = new Set(["(", "[", "{"]);
const CLOSE = new Set([")", "]", "}"]);
const CONDITION_ENDS = new Set(["?", "&&", "||", "??", "===", "!==", "==", "!="]);

// Class strings of a `class:` value: every string literal up to the end of the property,
// except strings that are compared or tested (`mode === "dark" ? ...`).
function classStrings(tokens, from) {
  const strings = [];
  let depth = 0;
  for (let index = from; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === "punct") {
      if (OPEN.has(token.value)) depth++;
      else if (CLOSE.has(token.value)) { if (depth === 0) break; depth--; }
      else if ((token.value === "," || token.value === ";") && depth === 0) break;
      continue;
    }
    if (token.type !== "string") continue;
    const next = tokens[index + 1];
    const before = tokens[index - 1];
    const compared = (next?.type === "punct" && CONDITION_ENDS.has(next.value) && next.value !== "&&" && next.value !== "||" && next.value !== "??") ||
      (before?.type === "punct" && ["===", "!==", "==", "!="].includes(before.value));
    if (!compared) strings.push(token);
  }
  return strings;
}

function inspect(path, lineOf, findings, shapes) {
  const text = readFileSync(path, "utf8");
  const file = relative(cwd, path).replaceAll("\\", "/");
  const at = (start) => `${file}:${lineOf(text, start)}`;

  if (path.endsWith(".html")) {
    const body = /<body>([\s\S]*?)<\/body>/i.exec(text)?.[1]?.replace(/\s+/g, " ").trim();
    if (body && !/^<div id="app"><\/div> <script type="module" src="[^"]+"><\/script>$/.test(body)) {
      findings.push(`${file}:1 visible HTML in the page; HTML should only host #app and the module entry, build the view with VRUI`);
    }
    return;
  }

  const tokens = lex(text);
  const ui = uiModules.some((name) => text.includes(`"${name}"`) || text.includes(`'${name}'`));

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const before = tokens[index - 1];

    const isClassKey = (token.type === "ident" || token.type === "string") && token.value === "class" &&
      next?.type === "punct" && next.value === ":" &&
      before?.type === "punct" && (before.value === "{" || before.value === ",");
    if (isClassKey) {
      const strings = classStrings(tokens, index + 2);
      const all = [];
      for (const string of strings) {
        for (const name of string.value.trim().split(/\s+/).filter(Boolean)) {
          all.push(name);
          if (name.includes("[") || name.includes("]")) {
            findings.push(`${at(string.start)} arbitrary value "${name}"; use the fixed scales, or the style prop for a truly dynamic value`);
          } else if (!allowed.has(name) && !vrui.isUtility(name)) {
            findings.push(`${at(string.start)} unknown class "${name}" does nothing; ${suggestion(name)}`);
          }
        }
      }
      const unique = [...new Set(all)].sort();
      if (unique.length >= 6) shapes.push({ at: at(token.start), project: projectOf(path), tokens: unique });
      continue;
    }

    if (!ui) continue;

    if (token.type === "ident" && next?.type === "punct" && next.value === "(" && CALL_ROUTES.has(token.value)) {
      const method = before?.type === "punct" && (before.value === "." || before.value === "?.");
      const bare = !method && token.value.startsWith("set") || token.value === "requestAnimationFrame";
      if (method || bare) findings.push(`${at(token.start)} ${token.value}() bypasses VRUI; use ${CALL_ROUTES.get(token.value)}`);
    }

    if (token.type === "ident" && token.value === "new" && next?.type === "ident" && CONSTRUCT_ROUTES.has(next.value)) {
      findings.push(`${at(next.start)} new ${next.value}() bypasses VRUI; use ${CONSTRUCT_ROUTES.get(next.value)}`);
    }

    const assigned = tokens[index + 1]?.type === "punct" && tokens[index + 1].value === "=";
    if (token.type === "ident" && assigned && before?.type === "punct" && before.value === ".") {
      const route = ASSIGNMENT_ROUTES.get(token.value);
      const styled = tokens[index - 2]?.value === "style" && tokens[index - 3]?.value === ".";
      if (route) findings.push(`${at(token.start)} assigning .${token.value} bypasses VRUI; use ${route}`);
      else if (styled) findings.push(`${at(token.start)} assigning .style.${token.value} bypasses VRUI; use a reactive style prop or a utility class`);
    }
  }
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
    return `"${color[2]}" is not a color role; use accent, neutral, success, warning or danger, and choose palettes in the theme`;
  }
  if (name.includes(":")) return "that variant or utility doesn't exist; see docs/utilities.md, or list an app class in package.json \"vrui.classes\"";
  return "use a VRUI utility (docs/utilities.md), or list an app-defined class in package.json \"vrui.classes\"";
}

// ---------------------------------------------------------------- shapes

function repeatedShapes(shapes) {
  const findings = [];
  for (let left = 0; left < shapes.length; left++) {
    const a = new Set(shapes[left].tokens);
    for (let right = left + 1; right < shapes.length; right++) {
      if (shapes[left].project !== shapes[right].project) continue;
      const b = new Set(shapes[right].tokens);
      let shared = 0;
      for (const token of a) if (b.has(token)) shared++;
      const distance = a.size + b.size - 2 * shared;
      if (distance === 0) {
        findings.push(`${shapes[right].at} repeats the class list at ${shapes[left].at}; extract an app-owned VRUI component`);
      } else if (shared >= 8 && distance <= 2) {
        findings.push(`${shapes[right].at} nearly repeats the class list at ${shapes[left].at}; extract an app-owned VRUI component`);
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------- main

const lineStarts = new Map();
function lineOf(text, offset) {
  let starts = lineStarts.get(text);
  if (!starts) {
    starts = [0];
    for (let index = 0; index < text.length; index++) if (text[index] === "\n") starts.push(index + 1);
    lineStarts.set(text, starts);
  }
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

const files = roots.flatMap((root) => collect(root, []));
const findings = [];
const shapes = [];
for (const file of files) inspect(file, lineOf, findings, shapes);
findings.push(...repeatedShapes(shapes));

if (findings.length) {
  for (const finding of findings) console.error(finding);
  console.error(`\nvrui-check: ${findings.length} problem${findings.length === 1 ? "" : "s"} in ${files.length} files.`);
  process.exitCode = 1;
} else {
  console.log(`vrui-check: ${files.length} files follow VRUI conventions.`);
}
