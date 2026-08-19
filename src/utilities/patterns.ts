import { compileUtility } from "./compiler";

const PREFIX = "vrui-pattern:";
const KEY = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export type PatternDefinition = {
  readonly [key: string]: string | PatternDefinition;
};

export type PatternClasses<T extends PatternDefinition> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends PatternDefinition
      ? PatternClasses<T[K]>
      : never;
};

export type PatternInfo = {
  classes: string;
  name: string;
  token: string;
};

export type PatternIssue = {
  kind: "duplicate-patterns" | "similar-patterns";
  message: string;
  patterns: [string, string];
};

export type RepeatedUtilitiesIssue = {
  classes: string;
  count: number;
  kind: "repeated-utilities";
  message: string;
  tag: string;
};

export type SimilarUtilitiesIssue = {
  classes: [string, string];
  kind: "similar-utilities";
  message: string;
  tag: string;
};

export type UnknownClassesIssue = {
  classes: string;
  kind: "unknown-classes";
  message: string;
  tag: string;
};

export type UtilityIssue =
  | RepeatedUtilitiesIssue
  | SimilarUtilitiesIssue
  | UnknownClassesIssue;

export type UtilityCheckOptions = {
  strict?: boolean;
};

const catalog = new Map<string, PatternInfo>();

function token(name: string): string {
  return `${PREFIX}${name}`;
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function normalize(value: string): string {
  return words(value).join(" ");
}

function flatten(
  definition: PatternDefinition,
  parent: string,
  output: PatternInfo[],
): void {
  for (const [key, value] of Object.entries(definition)) {
    if (!KEY.test(key)) throw new Error(`vrui: invalid pattern key: ${key}`);
    const name = parent ? `${parent}.${key}` : key;
    if (typeof value === "string") {
      const classes = normalize(value);
      if (!classes) throw new Error(`vrui: empty utility pattern: ${name}`);
      output.push({ classes, name, token: token(name) });
      continue;
    }
    flatten(value, name, output);
  }
}

function validate(entries: PatternInfo[]): void {
  const available = new Set([...catalog.keys(), ...entries.map((entry) => entry.name)]);
  for (const entry of entries) {
    for (const value of words(entry.classes)) {
      if (value.startsWith(PREFIX)) {
        const dependency = value.slice(PREFIX.length);
        if (available.has(dependency)) continue;
      } else if (compileUtility(value)) {
        continue;
      }
      throw new Error(`vrui: unknown utility in pattern ${entry.name}: ${value}`);
    }
  }
}

function result<T extends PatternDefinition>(
  definition: T,
  parent = "",
): PatternClasses<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(definition)) {
    const name = parent ? `${parent}.${key}` : key;
    output[key] = typeof value === "string"
      ? token(name)
      : result(value, name);
  }
  return output as PatternClasses<T>;
}

export function patterns<const T extends PatternDefinition>(
  definition: T,
): PatternClasses<T> {
  const entries: PatternInfo[] = [];
  flatten(definition, "", entries);
  validate(entries);

  for (const entry of entries) {
    const current = catalog.get(entry.name);
    if (current && current.classes !== entry.classes) {
      throw new Error(`vrui: conflicting utility pattern: ${entry.name}`);
    }
    catalog.set(entry.name, entry);
  }
  return result(definition);
}

function expandToken(value: string, stack: Set<string>): string[] {
  if (!value.startsWith(PREFIX)) return [value];
  const name = value.slice(PREFIX.length);
  const entry = catalog.get(name);
  if (!entry) throw new Error(`vrui: unknown utility pattern: ${name}`);
  if (stack.has(name)) throw new Error(`vrui: circular utility pattern: ${name}`);

  stack.add(name);
  const expanded = [value];
  for (const child of words(entry.classes)) {
    expanded.push(...expandToken(child, stack));
  }
  stack.delete(name);
  return expanded;
}

export function expandPatterns(className: string): string {
  const expanded = words(className).flatMap((value) => expandToken(value, new Set()));
  return [...new Set(expanded)].join(" ");
}

export function findPatterns(query = ""): PatternInfo[] {
  const term = query.toLowerCase();
  return Array.from(catalog.values())
    .filter((entry) => entry.name.toLowerCase().includes(term))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({ ...entry }));
}

function utilitySet(classes: string): Set<string> {
  const expanded = expandPatterns(classes);
  return new Set(words(expanded).filter((value) => compileUtility(value)));
}

function difference(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of left) if (!right.has(value)) count++;
  for (const value of right) if (!left.has(value)) count++;
  return count;
}

function overlap(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of left) if (right.has(value)) count++;
  return count;
}

export function checkPatterns(): PatternIssue[] {
  const entries = Array.from(catalog.values()).sort((left, right) => left.name.localeCompare(right.name));
  const issues: PatternIssue[] = [];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex++) {
    const left = entries[leftIndex]!;
    const leftSet = utilitySet(left.classes);
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex++) {
      const right = entries[rightIndex]!;
      const rightSet = utilitySet(right.classes);
      const patterns: [string, string] = [left.name, right.name];
      if (difference(leftSet, rightSet) === 0) {
        issues.push({
          kind: "duplicate-patterns",
          message: `${left.name} and ${right.name} define the same utilities`,
          patterns,
        });
      } else if (overlap(leftSet, rightSet) >= 3 && difference(leftSet, rightSet) <= 2) {
        issues.push({
          kind: "similar-patterns",
          message: `${left.name} and ${right.name} differ by at most two utilities`,
          patterns,
        });
      }
    }
  }
  return issues;
}

function elements(root: ParentNode): Element[] {
  const descendants = Array.from(root.querySelectorAll("*"));
  return root instanceof Element ? [root, ...descendants] : descendants;
}

export function checkUtilities(
  root: ParentNode,
  options: UtilityCheckOptions = {},
): UtilityIssue[] {
  const combinations = new Map<string, { classes: string; count: number; tag: string }>();
  const unknown: UnknownClassesIssue[] = [];

  for (const element of elements(root)) {
    const values = words(element.getAttribute("class") ?? "");
    const hasPattern = values.some((value) => value.startsWith(PREFIX));
    if (options.strict && !hasPattern) {
      const classes = values.filter((value) => !compileUtility(value)).join(" ");
      if (classes) {
        const tag = element.tagName.toLowerCase();
        unknown.push({
          classes,
          kind: "unknown-classes",
          message: `${tag} has unknown classes: ${classes}`,
          tag,
        });
      }
    }
    if (hasPattern) continue;
    const utilities = values.filter((value) => compileUtility(value)).sort();
    if (utilities.length < 3) continue;
    const classes = utilities.join(" ");
    const tag = element.tagName.toLowerCase();
    const key = `${tag}\0${classes}`;
    const current = combinations.get(key);
    if (current) current.count++;
    else combinations.set(key, { classes, count: 1, tag });
  }

  const entries = Array.from(combinations.values());
  const repeated: RepeatedUtilitiesIssue[] = entries
    .filter((entry) => entry.count > 1)
    .map((entry) => ({
      ...entry,
      kind: "repeated-utilities" as const,
      message: `${entry.count} ${entry.tag} elements repeat the same raw utility combination`,
    }));

  const similar: SimilarUtilitiesIssue[] = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex++) {
    const left = entries[leftIndex]!;
    const leftSet = new Set(words(left.classes));
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex++) {
      const right = entries[rightIndex]!;
      if (left.tag !== right.tag) continue;
      const rightSet = new Set(words(right.classes));
      if (overlap(leftSet, rightSet) < 3 || difference(leftSet, rightSet) > 2) continue;
      similar.push({
        classes: [left.classes, right.classes],
        kind: "similar-utilities",
        message: `${left.tag} utility combinations differ by at most two values`,
        tag: left.tag,
      });
    }
  }

  return [...repeated, ...similar, ...unknown];
}
