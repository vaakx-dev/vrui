import { colorRolesVersion } from "./colors";
import { compileUtility, MEDIA_LAYERS, type CompiledUtility, type MediaLayer } from "./compiler";
import { PREFLIGHT } from "./preflight";
import { PRELUDES } from "./rules";

type Placed = { utility: CompiledUtility; ruleCount: number };

type RuleList = CSSStyleSheet | CSSGroupingRule;

type Group = { layer: MediaLayer; rule: CSSGroupingRule | null; placed: Placed[] };

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

function positionOf(placed: readonly Placed[], order: string): number {
  let low = 0;
  let high = placed.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (placed[middle]!.utility.order < order) low = middle + 1;
    else high = middle;
  }
  return low;
}

function ruleCountOf(placed: readonly Placed[], end = placed.length): number {
  let count = 0;
  for (let index = 0; index < end; index++) count += placed[index]!.ruleCount;
  return count;
}

function inserted(list: RuleList | null, rule: string, index: number): boolean {
  if (!list) return false;
  try {
    list.insertRule(rule, index);
    return true;
  } catch {
    return false;
  }
}

function insert(list: RuleList | null, rules: readonly string[], index: number): number {
  let count = 0;
  for (const rule of rules) {
    if (inserted(list, rule, index + count)) count++;
  }
  return count;
}

function insertAll(list: RuleList | null, placed: readonly Placed[], index: number): void {
  let at = index;
  for (const entry of placed) {
    entry.ruleCount = insert(list, entry.utility.rules, at);
    at += entry.ruleCount;
  }
}

class UtilitySheet {
  readonly ensured = new Map<string, Ensured>();
  private readonly document: Document;
  private readonly plain: Placed[] = [];
  private readonly groups: Group[] = MEDIA_LAYERS.map((layer) => ({ layer, rule: null, placed: [] }))
    .sort((a, b) => (a.layer.order < b.layer.order ? -1 : 1));
  private readonly tokens = new Set<string>();
  private style: HTMLStyleElement;
  private sheet: CSSStyleSheet | null = null;
  private baseRules = 0;

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
    this.style.textContent = PREFLIGHT + PRELUDES.join("");
    this.sheet = this.style.sheet;
    this.baseRules = this.sheet?.cssRules.length ?? 0;
    insertAll(this.sheet, this.plain, this.baseRules);
    for (const group of this.groups) {
      group.rule = this.groupRule(group.layer, this.sheet?.cssRules.length ?? 0);
      insertAll(group.rule, group.placed, 0);
    }
  }

  private groupRule(layer: MediaLayer, index: number): CSSGroupingRule | null {
    if (!this.sheet || !inserted(this.sheet, `@media ${layer.media}{}`, index)) return null;
    return this.sheet.cssRules[index] as CSSGroupingRule;
  }

  private groupOf(layer: MediaLayer): Group {
    const position = this.groups.findIndex((group) => group.layer.order >= layer.order);
    const at = position < 0 ? this.groups.length : position;
    const found = this.groups[at];
    if (found?.layer.media === layer.media) return found;
    const group = { layer, rule: this.groupRule(layer, this.baseRules + ruleCountOf(this.plain) + at), placed: [] };
    this.groups.splice(at, 0, group);
    return group;
  }

  private place(utility: CompiledUtility): void {
    if (utility.layer.media) {
      const group = this.groupOf(utility.layer);
      this.placeIn(group.rule, group.placed, 0, utility);
    } else {
      this.placeIn(this.sheet, this.plain, this.baseRules, utility);
    }
    this.tokens.add(utility.token);
  }

  private placeIn(list: RuleList | null, placed: Placed[], offset: number, utility: CompiledUtility): void {
    const position = positionOf(placed, utility.order);
    const ruleCount = insert(list, utility.rules, offset + ruleCountOf(placed, position));
    placed.splice(position, 0, { utility, ruleCount });
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
