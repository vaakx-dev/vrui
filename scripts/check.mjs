#!/usr/bin/env node
// vrui-check: flags VRUI application code that bypasses VRUI.
//
//   vrui-check [paths...]
//
// Paths default to the "vrui.check" list of the nearest package.json, then to "src".
// Configure it in package.json:
//
//   "vrui": {
//     "check": ["src"],             folders or files to scan
//     "classes": ["markdown"],      app-defined class names that are not utilities
//     "roles": ["sky"],             extra color roles the app's theme registers
//     "ui": ["@vaakx-dev/vrui"],    a file is UI code when it imports one of these
//     "browser": ["**/web/**"],     globs of files that are browser code even without DOM globals
//     "shapes": "tree"              compare repeated class lists across the "tree" or per "project"
//   }
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findConfig, globRegex } from "./check/config.mjs";
import { createInspector } from "./check/inspect.mjs";
import { repeatedShapes } from "./check/shapes.mjs";

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

const cwd = process.cwd();
const { root, manifest, config } = findConfig(cwd);
const args = process.argv.slice(2);
const roots = args.length ? args.map((path) => resolve(cwd, path)) : config.check.map((path) => resolve(root, path));
// Themes register their roles at runtime; register the app's extra roles the same way.
for (const role of config.roles) vrui.theme({ [role]: "slate" });

const inspect = createInspector({
  isUtility: vrui.isUtility,
  allowed: new Set(config.classes),
  ui: config.ui,
  browser: config.browser.map(globRegex),
});

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

const display = (path) => relative(root, path).replaceAll("\\", "/");

// The nearest folder with a package.json, or the first folder under the scanned root.
function projectOf(path) {
  for (let dir = dirname(path); dir.startsWith(root) && dir !== root; dir = dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
  }
  const scanned = roots.find((candidate) => path.startsWith(candidate)) ?? root;
  return join(scanned, relative(scanned, path).split(/[\\/]/)[0]);
}

// ---------------------------------------------------------------- main

const files = [...new Set(roots.flatMap((path) => collect(path, [])))];
const findings = [];
const shapes = [];
for (const path of files) {
  const file = display(path);
  const result = inspect(file, readFileSync(path, "utf8"));
  for (const finding of result.findings) findings.push({ at: `${file}:${finding.line}`, rule: finding.rule, message: finding.message });
  const group = config.shapes === "project" ? projectOf(path) : root;
  for (const shape of result.shapes) shapes.push({ at: `${file}:${shape.line}`, group, tokens: shape.tokens });
}
findings.push(...repeatedShapes(shapes));

// App classes that VRUI now generates itself, so the app's own rule competes with VRUI's.
if (manifest && !args.length) {
  const text = readFileSync(manifest, "utf8");
  for (const name of config.classes.filter(vrui.isUtility)) {
    const line = text.slice(0, text.indexOf(JSON.stringify(name))).split("\n").length;
    findings.push({ at: `${display(manifest)}:${line}`, rule: "redundant-class", message: `vrui.classes lists "${name}", which VRUI generates; remove it here and from the app's CSS` });
  }
}

if (findings.length) {
  for (const { at, rule, message } of findings) console.error(`${at} ${message} [${rule}]`);
  const counts = new Map();
  for (const { rule } of findings) counts.set(rule, (counts.get(rule) ?? 0) + 1);
  const summary = [...counts].sort((left, right) => right[1] - left[1]).map(([rule, count]) => `${rule} ${count}`).join(", ");
  console.error(`\nvrui-check: ${findings.length} problem${findings.length === 1 ? "" : "s"} in ${files.length} files (${summary}).`);
  process.exitCode = 1;
} else {
  console.log(`vrui-check: ${files.length} files follow VRUI conventions.`);
}
