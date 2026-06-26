// ============================================================
// vrui - dom factories + reactive prop/child bindings
// ============================================================

import { effect, is_reactive, resolve, type Cleanup, type ReactiveValue } from "./core";
import { event_name_from_prop, type EventHandler } from "./events";
import {
  collect_scope,
  dispose_all,
  has_scope,
  once,
  register_in_scope,
  scoped,
} from "./scope";

/* ---------- string + class helpers ---------- */

export function safe_str(v: unknown): string {
  return v == null ? "" : String(v);
}

function is_node(v: unknown): v is Node {
  return typeof Node !== "undefined" && v instanceof Node;
}

export function class_str(v: unknown): string {
  if (Array.isArray(v)) return v.map(class_str).filter(Boolean).join(" ");
  if (v == null || v === false) return "";
  if (typeof v === "object" && !is_node(v)) {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, enabled]) => !!resolve(enabled))
      .map(([name]) => name)
      .join(" ");
  }
  return String(resolve(v));
}

/* ---------- connect / disconnect cleanup ---------- */

const disconnect_cbs = new Map<Node, (() => void)[]>();
const pending_mounts = new Map<Node, ((el: Node) => Cleanup)[]>();
const mount_cleanups = new Map<Node, (() => void)[]>();
let mo: MutationObserver | null = null;

function push_map<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (!values) {
    map.set(key, [value]);
    return;
  }

  values.push(value);
}

function is_connected(node: Node): boolean {
  return (node as any).isConnected;
}

function disconnected_nodes<V>(map: Map<Node, V[]>): Node[] {
  const nodes: Node[] = [];
  for (const node of map.keys()) {
    if (!is_connected(node)) nodes.push(node);
  }
  return nodes;
}

function run_node_callbacks(map: Map<Node, (() => void)[]>, node: Node): void {
  const callbacks = map.get(node);
  map.delete(node);
  if (!callbacks) return;

  for (const callback of callbacks) callback();
}

function add_mount_cleanup(node: Node, cleanup: Cleanup): void {
  if (typeof cleanup !== "function") return;
  ensure_mo();
  push_map(mount_cleanups, node, cleanup);
}

function flush_disconnects(): void {
  if (disconnect_cbs.size === 0 && mount_cleanups.size === 0) return;

  for (const node of disconnected_nodes(disconnect_cbs)) {
    run_node_callbacks(disconnect_cbs, node);
  }

  for (const node of disconnected_nodes(mount_cleanups)) {
    run_node_callbacks(mount_cleanups, node);
  }
}

function flush_mounts(): void {
  if (pending_mounts.size === 0) return;

  const fired: Node[] = [];
  for (const node of pending_mounts.keys()) {
    if (is_connected(node)) fired.push(node);
  }
  if (!fired.length) return;

  for (const node of fired) {
    const fns = pending_mounts.get(node);
    pending_mounts.delete(node);
    if (!fns) continue;

    for (const fn of fns) {
      add_mount_cleanup(node, fn(node));
    }
  }
}

function ensure_mo(): void {
  if (mo || typeof document === "undefined") return;
  mo = new MutationObserver((muts) => {
    let added = false;
    let removed = false;
    for (const m of muts) {
      if (m.addedNodes.length) added = true;
      if (m.removedNodes.length) removed = true;
      if (added && removed) break;
    }
    if (added) flush_mounts();
    if (removed) flush_disconnects();
  });
  mo.observe(document, { childList: true, subtree: true });
}

export function on_disconnect(el: Node, fn: () => void): void {
  ensure_mo();
  push_map(disconnect_cbs, el, fn);
}

/* on_mount: run fn(el) once el is in the document. If a Cleanup is
 * returned, it fires when el is later disconnected. If el is already
 * connected when on_mount is called, fn runs synchronously. */
export function on_mount(el: Node, fn: (el: Node) => Cleanup): void {
  if (is_connected(el)) {
    add_mount_cleanup(el, fn(el));
    return;
  }

  ensure_mo();
  push_map(pending_mounts, el, fn);
}

export function auto_dispose(el: Node, dispose: () => void): void {
  if (has_scope()) {
    register_in_scope(dispose);
    return;
  }

  on_disconnect(el, dispose);
}

export function listen(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  target.addEventListener(event, handler, options);
  return scoped(once(() => target.removeEventListener(event, handler, options)));
}

export function on_target(
  owner: Node,
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): void {
  const stop = listen(target, event, handler, options);
  const dispose = once(stop);
  on_disconnect(owner, dispose);
  scoped(dispose);
}

export function on_window(
  owner: Node,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): void {
  on_target(owner, window, event, handler, options);
}

export function on_document(
  owner: Node,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): void {
  on_target(owner, document, event, handler, options);
}

/* ---------- public UI types ---------- */

export type MaybeReactive<T> = T | ReactiveValue<T>;

export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>
  | Child[];

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>
  | ClassValue[]
  | Record<string, unknown>;

export type StylePrimitive = string | number | boolean | null | undefined;
export type StyleMap = Record<string, unknown>;
export type StyleValue =
  | string
  | StyleMap
  | null
  | undefined
  | ReactiveValue<unknown>;

export type WritableSignal<T> = {
  get(): T;
  set(value: T): void;
};

type DataProps = {
  [key: `data-${string}`]: MaybeReactive<unknown>;
};

type AriaProps = {
  [key: `aria-${string}`]: MaybeReactive<unknown>;
};

type EventProps = {
  [key: `on_${string}`]: EventHandler<any>;
};

export type Props<E extends Element = HTMLElement> = {
  ref?: (el: E) => void;
  on_mount?: (el: Node) => Cleanup;
  class?: ClassValue;
  style?: StyleValue;
  text?: MaybeReactive<unknown>;
  role?: MaybeReactive<string>;
  bind_value?: WritableSignal<unknown>;
  bind_checked?: WritableSignal<boolean>;
} & DataProps
  & AriaProps
  & EventProps
  & Partial<Record<keyof E, unknown>>
  & Record<string, unknown>;

export type Component<P extends Props = Props, E extends HTMLElement = HTMLElement> = (
  props?: P | Child,
  ...children: Child[]
) => E;

/* ---------- style ----------
 *
 * Reactive style prop. Accepts:
 *   string          - assigned to cssText as-is
 *   Record<k, v>    - per-key, each v may be a value or a reactive
 *   reactive        - whole-object reactive, missing keys are cleared on update
 *
 * Numeric values get a "px" suffix unless the (kebab) key is in UNITLESS.
 * Keys are normalized camelCase -> kebab-case. Keys starting with "--" are
 * passed through verbatim as CSS custom properties (setProperty path).
 *
 * Null/undefined/false value for a key removes that property. */

const UNITLESS = new Set([
  "animation-iteration-count", "aspect-ratio", "border-image-outset",
  "border-image-slice", "border-image-width", "box-flex", "box-flex-group",
  "box-ordinal-group", "column-count", "columns", "flex", "flex-grow",
  "flex-positive", "flex-shrink", "flex-negative", "flex-order", "grid-area",
  "grid-row", "grid-row-end", "grid-row-span", "grid-row-start", "grid-column",
  "grid-column-end", "grid-column-span", "grid-column-start", "font-weight",
  "line-clamp", "line-height", "opacity", "order", "orphans", "scale",
  "tab-size", "widows", "z-index", "zoom",
  "fill-opacity", "flood-opacity", "stop-opacity", "stroke-dasharray",
  "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "stroke-width",
]);

function to_kebab(key: string): string {
  if (key.startsWith("--")) return key;
  return key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

function format_style_value(kebab: string, v: unknown): string {
  if (v == null || v === false) return "";
  if (typeof v === "number" && !UNITLESS.has(kebab) && !kebab.startsWith("--")) {
    return v + "px";
  }
  return String(v);
}

function write_style_key(el: HTMLElement | SVGElement, key: string, v: unknown): void {
  const k = to_kebab(key);
  const s = format_style_value(k, v);
  if (s === "") {
    el.style.removeProperty(k);
    return;
  }

  el.style.setProperty(k, s);
}

function apply_style_object(
  el: HTMLElement | SVGElement,
  next: Record<string, unknown>,
  prev: Set<string> | null,
): Set<string> {
  const seen = new Set<string>();
  for (const [key, v] of Object.entries(next)) {
    const k = to_kebab(key);
    seen.add(k);
    write_style_key(el, key, v);
  }
  if (prev) {
    for (const k of prev) {
      if (!seen.has(k)) el.style.removeProperty(k);
    }
  }
  return seen;
}

function clear_style_keys(el: HTMLElement | SVGElement, keys: Set<string> | null): void {
  if (!keys) return;
  for (const key of keys) el.style.removeProperty(key);
}

function clear_reactive_style(
  el: HTMLElement | SVGElement,
  keys: Set<string> | null,
  used_css_text: boolean,
): void {
  if (used_css_text) {
    el.style.cssText = "";
    return;
  }

  clear_style_keys(el, keys);
}

function set_style_entry(el: HTMLElement | SVGElement, key: string, value: unknown): void {
  if (!is_reactive(value)) {
    write_style_key(el, key, value);
    return;
  }

  const dispose = effect(() => write_style_key(el, key, resolve(value)));
  auto_dispose(el, dispose);
}

function set_style_object(el: HTMLElement | SVGElement, value: Record<string, unknown>): void {
  for (const [key, entry] of Object.entries(value)) {
    set_style_entry(el, key, entry);
  }
}

function bind_reactive_style(el: HTMLElement | SVGElement, value: ReactiveValue<unknown>): void {
  let prev: Set<string> | null = null;
  let prev_css_text = false;

  const dispose = effect(() => {
    const next = resolve(value);
    if (next == null) {
      clear_reactive_style(el, prev, prev_css_text);
      prev = null;
      prev_css_text = false;
      return;
    }

    if (typeof next === "string") {
      el.style.cssText = next;
      prev = null;
      prev_css_text = true;
      return;
    }

    if (prev_css_text) el.style.cssText = "";
    prev = apply_style_object(el, next as Record<string, unknown>, prev);
    prev_css_text = false;
  });

  auto_dispose(el, dispose);
}

export function set_style(el: HTMLElement | SVGElement, value: unknown): void {
  if (value == null) return;

  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }

  if (is_reactive(value)) {
    bind_reactive_style(el, value);
    return;
  }

  if (typeof value !== "object") return;
  set_style_object(el, value as Record<string, unknown>);
}

function has_reactive_part(value: unknown): boolean {
  if (is_reactive(value)) return true;
  if (Array.isArray(value)) return value.some(has_reactive_part);
  if (value && typeof value === "object" && !is_node(value)) {
    return Object.values(value as Record<string, unknown>).some(has_reactive_part);
  }
  return false;
}

function set_class(el: HTMLElement, value: unknown): void {
  if (has_reactive_part(value)) {
    const dispose = effect(() => {
      el.className = class_str(resolve(value));
    });
    auto_dispose(el, dispose);
    return;
  }
  el.className = class_str(value);
}

function is_writable_signal(value: unknown): value is WritableSignal<unknown> {
  return !!value &&
    typeof value === "object" &&
    typeof (value as WritableSignal<unknown>).get === "function" &&
    typeof (value as WritableSignal<unknown>).set === "function";
}

function is_value_element(
  el: HTMLElement,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement;
}

function bind_value(el: HTMLElement, value: unknown): void {
  if (!is_writable_signal(value)) {
    throw new Error("vrui: bind_value expects a writable signal");
  }
  if (!is_value_element(el)) {
    throw new Error("vrui: bind_value can only be used on input, textarea, or select");
  }

  const dispose = effect(() => {
    const next = safe_str(value.get());
    if (el.value !== next) el.value = next;
  });
  auto_dispose(el, dispose);

  const event = el instanceof HTMLSelectElement ? "change" : "input";
  const handler = () => value.set(el.value);
  on_target(el, el, event, handler);
}

function bind_checked(el: HTMLElement, value: unknown): void {
  if (!is_writable_signal(value)) {
    throw new Error("vrui: bind_checked expects a writable boolean signal");
  }
  if (!(el instanceof HTMLInputElement)) {
    throw new Error("vrui: bind_checked can only be used on input");
  }

  const dispose = effect(() => {
    const next = !!value.get();
    if (el.checked !== next) el.checked = next;
  });
  auto_dispose(el, dispose);

  const handler = () => value.set(el.checked);
  on_target(el, el, "change", handler);
}

type DomPropSetter = (el: HTMLElement, value: unknown) => void;

function set_text(el: HTMLElement, value: unknown): void {
  if (!is_reactive(value)) {
    el.textContent = safe_str(value);
    return;
  }

  const dispose = effect(() => {
    el.textContent = safe_str(resolve(value));
  });
  auto_dispose(el, dispose);
}

function set_event_prop(el: HTMLElement, key: string, value: unknown): void {
  const event = event_name_from_prop(key);
  const handler = value as EventListener;
  on_target(el, el, event, handler);
}

function is_attribute_prop(key: string): boolean {
  return key.startsWith("data-") || key.startsWith("aria-") || key === "role";
}

function write_attribute(el: HTMLElement, key: string, value: unknown): void {
  if (value == null) {
    el.removeAttribute(key);
    return;
  }

  el.setAttribute(key, String(value));
}

function set_attribute_prop(el: HTMLElement, key: string, value: unknown): void {
  if (!is_reactive(value)) {
    write_attribute(el, key, value);
    return;
  }

  const dispose = effect(() => write_attribute(el, key, resolve(value)));
  auto_dispose(el, dispose);
}

function set_input_value_prop(el: HTMLInputElement, value: unknown): void {
  if (!is_reactive(value)) {
    el.value = safe_str(value);
    return;
  }

  const dispose = effect(() => {
    const next = safe_str(resolve(value));
    if (el.value !== next) el.value = next;
  });
  auto_dispose(el, dispose);
}

function maybe_set_input_value_prop(el: HTMLElement, key: string, value: unknown): boolean {
  if (key !== "value" || !(el instanceof HTMLInputElement)) return false;
  set_input_value_prop(el, value);
  return true;
}

function set_dom_property(el: HTMLElement, key: string, value: unknown): void {
  if (!is_reactive(value)) {
    (el as any)[key] = value;
    return;
  }

  const dispose = effect(() => {
    (el as any)[key] = resolve(value);
  });
  auto_dispose(el, dispose);
}

const DOM_PROP_SETTERS: Record<string, DomPropSetter> = {
  ref: (el, value) => (value as (el: HTMLElement) => void)(el),
  on_mount: (el, value) => on_mount(el, value as (el: Node) => Cleanup),
  bind_value,
  bind_checked,
  class: set_class,
  style: set_style,
  text: set_text,
};

function set_prop(el: HTMLElement, key: string, value: unknown): void {
  const setter = DOM_PROP_SETTERS[key];
  if (setter) {
    setter(el, value);
    return;
  }

  if (key.startsWith("on_")) {
    set_event_prop(el, key, value);
    return;
  }

  if (is_attribute_prop(key)) {
    set_attribute_prop(el, key, value);
    return;
  }

  if (maybe_set_input_value_prop(el, key, value)) return;
  set_dom_property(el, key, value);
}

export function by_id<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`vrui: missing element #${id}`);
  return el as unknown as T;
}

export function append_child(parent: Node, child: Child): void {
  if (child == null || child === false || child === true) return;

  if (Array.isArray(child)) {
    for (const c of child) append_child(parent, c);
    return;
  }

  if (is_node(child)) {
    parent.appendChild(child);
    return;
  }

  if (is_reactive(child)) {
    const text = document.createTextNode("");
    const dispose = effect(() => {
      text.textContent = safe_str(resolve(child));
    });
    auto_dispose(text, dispose);
    parent.appendChild(text);
    return;
  }

  parent.appendChild(document.createTextNode(safe_str(child)));
}

function mount_children(parent: Node, children: Child[]): () => void {
  const frag = document.createDocumentFragment();

  const { scope } = collect_scope(() => {
    for (const child of children) append_child(frag, child);
  });

  const mounted = Array.from(frag.childNodes);
  parent.appendChild(frag);

  const dispose = once(() => {
    for (const node of mounted) {
      if (node.parentNode === parent) parent.removeChild(node);
    }
    dispose_all(scope);
  });

  scoped(dispose);
  return dispose;
}

function document_observer_root(): Node {
  return document.documentElement ?? document.body ?? document;
}

function mount_when_available(target_id: string, children: Child[]): () => void {
  let stop_mount: (() => void) | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function try_mount(): void {
    if (disposed || stop_mount) return;
    const parent = document.getElementById(target_id);
    if (!parent) return;
    observer?.disconnect();
    observer = undefined;
    stop_mount = mount_children(parent, children);
  }

  observer = new MutationObserver(try_mount);
  observer.observe(document_observer_root(), { childList: true, subtree: true });
  queueMicrotask(try_mount);

  const dispose = once(() => {
    disposed = true;
    observer?.disconnect();
    stop_mount?.();
  });

  scoped(dispose);
  return dispose;
}

export function mount(target: Node | string, ...children: Child[]): () => void {
  if (typeof target !== "string") return mount_children(target, children);

  const parent = document.getElementById(target);
  if (parent) return mount_children(parent, children);

  return mount_when_available(target, children);
}

const replace_mounts = new WeakMap<Node, () => void>();

export function replace(target: Node | string, ...children: Child[]): () => void {
  const parent = typeof target === "string" ? by_id(target) : target;
  const previous = replace_mounts.get(parent);
  if (previous) previous();

  while (parent.firstChild) parent.removeChild(parent.firstChild);
  const stop = mount(parent, ...children);

  const dispose = once(() => {
    stop();
    if (replace_mounts.get(parent) === dispose) replace_mounts.delete(parent);
  });

  replace_mounts.set(parent, dispose);
  return dispose;
}

function is_child_argument(value: Props | Child | undefined): value is Child {
  return value != null &&
    (typeof value !== "object" ||
      is_node(value) ||
      Array.isArray(value) ||
      is_reactive(value));
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props<HTMLElementTagNameMap[K]> | Child,
  ...children: Child[]
): HTMLElementTagNameMap[K];
export function el(tag: string, props?: Props | Child, ...children: Child[]): HTMLElement;
export function el(tag: string, props?: Props | Child, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);

  if (is_child_argument(props)) {
    children.unshift(props);
    props = undefined;
  }

  const deferred_props: [string, unknown][] = [];
  if (props) {
    for (const [key, value] of Object.entries(props as Props)) {
      if (key === "bind_value" || key === "bind_checked") {
        deferred_props.push([key, value]);
        continue;
      }

      set_prop(node, key, value);
    }
  }

  for (const child of children) {
    append_child(node, child);
  }

  for (const [key, value] of deferred_props) {
    set_prop(node, key, value);
  }

  return node;
}

export function Fragment(_props?: Props | Child, ...children: Child[]): Child[] {
  return children;
}

/* tag shortcuts */
export const div = (props?: Props<HTMLDivElement> | Child, ...children: Child[]) => el("div", props, ...children);
export const span = (props?: Props<HTMLSpanElement> | Child, ...children: Child[]) => el("span", props, ...children);
export const button = (props?: Props<HTMLButtonElement> | Child, ...children: Child[]) => el("button", props, ...children);
export const input = (props?: Props<HTMLInputElement>) => el("input", props);
export const textarea = (props?: Props<HTMLTextAreaElement> | Child, ...children: Child[]) => el("textarea", props, ...children);
export const select = (props?: Props<HTMLSelectElement> | Child, ...children: Child[]) => el("select", props, ...children);
export const option = (props?: Props<HTMLOptionElement> | Child, ...children: Child[]) => el("option", props, ...children);
export const label = (props?: Props<HTMLLabelElement> | Child, ...children: Child[]) => el("label", props, ...children);
export const form = (props?: Props<HTMLFormElement> | Child, ...children: Child[]) => el("form", props, ...children);
export const fieldset = (props?: Props<HTMLFieldSetElement> | Child, ...children: Child[]) => el("fieldset", props, ...children);
export const legend = (props?: Props<HTMLLegendElement> | Child, ...children: Child[]) => el("legend", props, ...children);
export const a = (props?: Props<HTMLAnchorElement> | Child, ...children: Child[]) => el("a", props, ...children);
export const img = (props?: Props<HTMLImageElement>) => el("img", props);
export const dialog = (props?: Props<HTMLDialogElement> | Child, ...children: Child[]) => el("dialog", props, ...children);
export const canvas = (props?: Props<HTMLCanvasElement> | Child, ...children: Child[]) => el("canvas", props, ...children);
export const ul = (props?: Props<HTMLUListElement> | Child, ...children: Child[]) => el("ul", props, ...children);
export const ol = (props?: Props<HTMLOListElement> | Child, ...children: Child[]) => el("ol", props, ...children);
export const li = (props?: Props<HTMLLIElement> | Child, ...children: Child[]) => el("li", props, ...children);
export const dl = (props?: Props<HTMLDListElement> | Child, ...children: Child[]) => el("dl", props, ...children);
export const dt = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("dt", props, ...children);
export const dd = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("dd", props, ...children);
export const h1 = (props?: Props<HTMLHeadingElement> | Child, ...children: Child[]) => el("h1", props, ...children);
export const h2 = (props?: Props<HTMLHeadingElement> | Child, ...children: Child[]) => el("h2", props, ...children);
export const h3 = (props?: Props<HTMLHeadingElement> | Child, ...children: Child[]) => el("h3", props, ...children);
export const h4 = (props?: Props<HTMLHeadingElement> | Child, ...children: Child[]) => el("h4", props, ...children);
export const h5 = (props?: Props<HTMLHeadingElement> | Child, ...children: Child[]) => el("h5", props, ...children);
export const h6 = (props?: Props<HTMLHeadingElement> | Child, ...children: Child[]) => el("h6", props, ...children);
export const p = (props?: Props<HTMLParagraphElement> | Child, ...children: Child[]) => el("p", props, ...children);
export const strong = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("strong", props, ...children);
export const em = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("em", props, ...children);
export const small = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("small", props, ...children);
export const section = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("section", props, ...children);
export const article = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("article", props, ...children);
export const nav = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("nav", props, ...children);
export const header = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("header", props, ...children);
export const footer = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("footer", props, ...children);
export const main = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("main", props, ...children);
export const aside = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("aside", props, ...children);
export const table = (props?: Props<HTMLTableElement> | Child, ...children: Child[]) => el("table", props, ...children);
export const thead = (props?: Props<HTMLTableSectionElement> | Child, ...children: Child[]) => el("thead", props, ...children);
export const tbody = (props?: Props<HTMLTableSectionElement> | Child, ...children: Child[]) => el("tbody", props, ...children);
export const tfoot = (props?: Props<HTMLTableSectionElement> | Child, ...children: Child[]) => el("tfoot", props, ...children);
export const tr = (props?: Props<HTMLTableRowElement> | Child, ...children: Child[]) => el("tr", props, ...children);
export const th = (props?: Props<HTMLTableCellElement> | Child, ...children: Child[]) => el("th", props, ...children);
export const td = (props?: Props<HTMLTableCellElement> | Child, ...children: Child[]) => el("td", props, ...children);
export const details = (props?: Props<HTMLDetailsElement> | Child, ...children: Child[]) => el("details", props, ...children);
export const summary = (props?: Props<HTMLElement> | Child, ...children: Child[]) => el("summary", props, ...children);
export const template = (props?: Props<HTMLTemplateElement> | Child, ...children: Child[]) => el("template", props, ...children);
