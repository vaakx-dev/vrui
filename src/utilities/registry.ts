import { colorRolesVersion } from "./colors";
import { compileUtility, type CompiledUtility } from "./compiler";
import { PREFLIGHT } from "./preflight";

type Placed = { utility: CompiledUtility; ruleCount: number };

type Ensured = { rolesVersion: number; className: string };

const sheets = new WeakMap<Document, UtilitySheet>();
const compiledTokens = new Map<string, CompiledUtility>();
const plainTokens = new Map<string, number>();

function createStyle(document: Document): HTMLStyleElement {
  const style = document.createElement("style");
  style.setAttribute("data-vrui-utilities", "");
  (document.head ?? document.documentElement).appendChild(style);
  return style;
}

class UtilitySheet {
  readonly ensured = new Map<string, Ensured>();
  private readonly document: Document;
  private readonly placed: Placed[] = [];
  private readonly tokens = new Set<string>();
  private style: HTMLStyleElement;
  private sheet: CSSStyleSheet | null = null;
  private preflightRules = 0;

  constructor(document: Document) {
    this.document = document;
    this.style = createStyle(document);
    this.attach();
  }

  keepAttached(): void {
    if (this.style.sheet !== this.sheet) this.attach();
  }

  add(utilities: readonly CompiledUtility[]): void {
    for (const utility of utilities) {
      if (!this.tokens.has(utility.token)) this.place(utility);
    }
  }

  private attach(): void {
    if (!this.style.isConnected) this.style = createStyle(this.document);
    this.style.textContent = PREFLIGHT;
    this.sheet = this.style.sheet;
    this.preflightRules = this.sheet?.cssRules.length ?? 0;
    let index = this.preflightRules;
    for (const entry of this.placed) {
      entry.ruleCount = this.insert(entry.utility.rules, index);
      index += entry.ruleCount;
    }
  }

  private place(utility: CompiledUtility): void {
    const position = this.positionOf(utility.order);
    const ruleCount = this.insert(utility.rules, this.ruleIndexAt(position));
    this.placed.splice(position, 0, { utility, ruleCount });
    this.tokens.add(utility.token);
  }

  private positionOf(order: string): number {
    let low = 0;
    let high = this.placed.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (this.placed[middle]!.utility.order < order) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  private ruleIndexAt(position: number): number {
    let index = this.preflightRules;
    for (let placed = 0; placed < position; placed++) index += this.placed[placed]!.ruleCount;
    return index;
  }

  private insert(rules: readonly string[], index: number): number {
    let inserted = 0;
    for (const rule of rules) {
      if (this.inserted(rule, index + inserted)) inserted++;
    }
    return inserted;
  }

  private inserted(rule: string, index: number): boolean {
    if (!this.sheet) return false;
    try {
      this.sheet.insertRule(rule, index);
      return true;
    } catch {
      return false;
    }
  }
}

function attachedSheet(document: Document): UtilitySheet {
  const known = sheets.get(document);
  if (known) {
    known.keepAttached();
    return known;
  }
  const created = new UtilitySheet(document);
  sheets.set(document, created);
  return created;
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

function lastWins(tokens: readonly string[], rolesVersion: number): { kept: string[]; rules: CompiledUtility[] } {
  const later = new Set<string>();
  const kept: string[] = [];
  const rules: CompiledUtility[] = [];
  for (const token of [...tokens].reverse()) {
    const rule = compileOnce(token, rolesVersion);
    if (rule && later.has(rule.key)) continue;
    if (rule) {
      later.add(rule.key);
      rules.push(rule);
    }
    kept.unshift(token);
  }
  return { kept, rules };
}

export function ensureUtilities(element: Element, className: string): string {
  const document = element.ownerDocument;
  const rolesVersion = colorRolesVersion();
  const known = sheets.get(document)?.ensured.get(className);
  if (known?.rolesVersion === rolesVersion) {
    attachedSheet(document);
    return known.className;
  }

  const tokens = className.split(/\s+/).filter(Boolean);
  rejectArbitrary(tokens);
  const { kept, rules } = lastWins(tokens, rolesVersion);
  if (!rules.length) return className;

  const sheet = attachedSheet(document);
  sheet.add(rules);
  const result = kept.length === tokens.length ? className : kept.join(" ");
  sheet.ensured.set(className, { rolesVersion, className: result });
  return result;
}
