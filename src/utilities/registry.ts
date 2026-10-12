import { colorRolesVersion } from "./colors";
import { compileUtility, type CompiledUtility } from "./compiler";
import { PREFLIGHT } from "./preflight";

type Registry = {
  rules: Map<string, CompiledUtility>;
  ensured: Map<string, number>;
  style: HTMLStyleElement;
};

const registries = new WeakMap<Document, Registry>();
const compiledTokens = new Map<string, CompiledUtility>();
const plainTokens = new Map<string, number>();

function createStyle(document: Document): HTMLStyleElement {
  const style = document.createElement("style");
  style.setAttribute("data-vrui-utilities", "");
  (document.head ?? document.documentElement).appendChild(style);
  return style;
}

function registry(document: Document): Registry {
  let current = registries.get(document);
  if (!current) {
    current = { rules: new Map(), ensured: new Map(), style: createStyle(document) };
    registries.set(document, current);
    return current;
  }

  if (!current.style.isConnected) {
    current.style = createStyle(document);
    render(current);
  }
  return current;
}

function render(current: Registry): void {
  const rules = Array.from(current.rules.values())
    .sort((left, right) => left.order.localeCompare(right.order))
    .map((rule) => rule.css);
  current.style.textContent = [PREFLIGHT, ...rules].join("\n");
}

function compileOnce(token: string, rolesVersion: number): CompiledUtility | undefined {
  const known = compiledTokens.get(token);
  if (known) return known;
  if (plainTokens.get(token) === rolesVersion) return;
  const rule = compileUtility(token);
  if (rule) compiledTokens.set(token, rule);
  else plainTokens.set(token, rolesVersion);
  return rule;
}

function rejectArbitrary(tokens: readonly string[]): void {
  for (const token of tokens) {
    if (token.includes("[") || token.includes("]")) {
      throw new Error(`vrui: arbitrary utility values are not supported: ${token}`);
    }
  }
}

export function ensureUtilities(element: Element, className: string): string {
  const document = element.ownerDocument;
  const rolesVersion = colorRolesVersion();
  if (registries.get(document)?.ensured.get(className) === rolesVersion) {
    registry(document);
    return className;
  }

  const tokens = className.split(/\s+/).filter(Boolean);
  rejectArbitrary(tokens);
  const compiled = tokens
    .map((token) => compileOnce(token, rolesVersion))
    .filter((rule): rule is CompiledUtility => !!rule);
  if (!compiled.length) return className;

  const current = registry(document);
  let changed = false;
  for (const rule of compiled) {
    if (current.rules.has(rule.token)) continue;
    current.rules.set(rule.token, rule);
    changed = true;
  }
  if (changed) render(current);
  current.ensured.set(className, rolesVersion);
  return className;
}
