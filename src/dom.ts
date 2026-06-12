// ============================================================
// vrui - dom factories + reactive prop/child bindings
// ============================================================

import { effect, is_reactive, resolve, type Cleanup } from "./core";
import { enter_scope, exit_scope, has_scope, register_in_scope } from "./scope";

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

function flush_disconnects(): void {
  if (disconnect_cbs.size === 0 && mount_cleanups.size === 0) return;
  let stale_disc: Node[] | null = null;
  for (const node of disconnect_cbs.keys()) {
    if (!(node as any).isConnected) {
      (stale_disc ??= []).push(node);
    }
  }
  let stale_mc: Node[] | null = null;
  for (const node of mount_cleanups.keys()) {
    if (!(node as any).isConnected) {
      (stale_mc ??= []).push(node);
    }
  }
  if (stale_disc) {
    for (const node of stale_disc) {
      const cbs = disconnect_cbs.get(node);
      disconnect_cbs.delete(node);
      if (cbs) for (const cb of cbs) cb();
    }
  }
  if (stale_mc) {
    for (const node of stale_mc) {
      const cbs = mount_cleanups.get(node);
      mount_cleanups.delete(node);
      if (cbs) for (const cb of cbs) cb();
    }
  }
}

function flush_mounts(): void {
  if (pending_mounts.size === 0) return;
  let fired: Node[] | null = null;
  for (const node of pending_mounts.keys()) {
    if ((node as any).isConnected) (fired ??= []).push(node);
  }
  if (!fired) return;
  for (const node of fired) {
    const fns = pending_mounts.get(node);
    pending_mounts.delete(node);
    if (!fns) continue;
    for (const fn of fns) {
      const cleanup = fn(node);
      if (typeof cleanup === "function") {
        const arr = mount_cleanups.get(node);
        if (arr) arr.push(cleanup);
        else mount_cleanups.set(node, [cleanup]);
      }
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
  const arr = disconnect_cbs.get(el);
  if (arr) arr.push(fn);
  else disconnect_cbs.set(el, [fn]);
}

/* on_mount: run fn(el) once el is in the document. If a Cleanup is
 * returned, it fires when el is later disconnected. If el is already
 * connected when on_mount is called, fn runs synchronously. */
export function on_mount(el: Node, fn: (el: Node) => Cleanup): void {
  if ((el as any).isConnected) {
    const cleanup = fn(el);
    if (typeof cleanup === "function") {
      ensure_mo();
      const arr = mount_cleanups.get(el);
      if (arr) arr.push(cleanup);
      else mount_cleanups.set(el, [cleanup]);
    }
    return;
  }
  ensure_mo();
  const arr = pending_mounts.get(el);
  if (arr) arr.push(fn);
  else pending_mounts.set(el, [fn]);
}

export function auto_dispose(el: Node, dispose: () => void): void {
  if (has_scope()) register_in_scope(dispose);
  else on_disconnect(el, dispose);
}

export function listen(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  target.addEventListener(event, handler, options);
  const dispose = () => target.removeEventListener(event, handler, options);
  if (has_scope()) register_in_scope(dispose);
  return dispose;
}

export function on_target(
  owner: Node,
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): void {
  const stop = listen(target, event, handler, options);
  let stopped = false;
  const dispose = () => {
    if (stopped) return;
    stopped = true;
    stop();
  };
  on_disconnect(owner, dispose);
  if (has_scope()) register_in_scope(dispose);
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

/* ---------- props ---------- */

export type Props = Record<string, unknown>;

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
  if (s === "") el.style.removeProperty(k);
  else el.style.setProperty(k, s);
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

export function set_style(el: HTMLElement | SVGElement, value: unknown): void {
  if (value == null) return;

  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }

  if (is_reactive(value)) {
    let prev: Set<string> | null = null;
    let prev_css_text = false;
    const dispose = effect(() => {
      const next = resolve(value);
      if (next == null) {
        if (prev_css_text) el.style.cssText = "";
        else if (prev) for (const k of prev) el.style.removeProperty(k);
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
    return;
  }

  if (typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (is_reactive(v)) {
        const dispose = effect(() => write_style_key(el, key, resolve(v)));
        auto_dispose(el, dispose);
      } else {
        write_style_key(el, key, v);
      }
    }
  }
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

function set_prop(el: HTMLElement, key: string, value: unknown): void {
  if (key === "ref") {
    (value as (el: HTMLElement) => void)(el);
    return;
  }

  if (key === "on_mount") {
    on_mount(el, value as (el: Node) => Cleanup);
    return;
  }

  if (key === "class") {
    set_class(el, value);
    return;
  }

  if (key === "style") {
    set_style(el, value);
    return;
  }

  if (key === "text") {
    if (is_reactive(value)) {
      const dispose = effect(() => {
        el.textContent = safe_str(resolve(value));
      });
      auto_dispose(el, dispose);
    } else {
      el.textContent = safe_str(value);
    }
    return;
  }

  if (key.startsWith("on_")) {
    const event = key.slice(3);
    const handler = value as EventListener;
    el.addEventListener(event, handler);
    auto_dispose(el, () => el.removeEventListener(event, handler));
    return;
  }

  if (key.startsWith("data-") || key.startsWith("aria-") || key === "role") {
    if (is_reactive(value)) {
      const dispose = effect(() => {
        const next = resolve(value);
        if (next == null) el.removeAttribute(key);
        else el.setAttribute(key, String(next));
      });
      auto_dispose(el, dispose);
    } else {
      if (value == null) el.removeAttribute(key);
      else el.setAttribute(key, String(value));
    }
    return;
  }

  if (key === "value" && el instanceof HTMLInputElement) {
    if (is_reactive(value)) {
      const dispose = effect(() => {
        const v = safe_str(resolve(value));
        if (el.value !== v) el.value = v;
      });
      auto_dispose(el, dispose);
    } else {
      el.value = safe_str(value);
    }
    return;
  }

  if (is_reactive(value)) {
    const dispose = effect(() => {
      (el as any)[key] = resolve(value);
    });
    auto_dispose(el, dispose);
  } else {
    (el as any)[key] = value;
  }
}

export function by_id<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`vrui: missing element #${id}`);
  return el as unknown as T;
}

export function append_child(parent: Node, child: unknown): void {
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

function mount_children(parent: Node, children: unknown[]): () => void {
  const frag = document.createDocumentFragment();

  enter_scope();
  let scope: (() => void)[];
  try {
    for (const child of children) append_child(frag, child);
    scope = exit_scope();
  } catch (err) {
    scope = exit_scope();
    for (const dispose of scope) dispose();
    throw err;
  }

  const mounted = Array.from(frag.childNodes);
  parent.appendChild(frag);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const node of mounted) {
      if (node.parentNode === parent) parent.removeChild(node);
    }
    for (const dispose of scope) dispose();
  };

  if (has_scope()) register_in_scope(dispose);
  return dispose;
}

function document_observer_root(): Node {
  return document.documentElement ?? document.body ?? document;
}

function mount_when_available(target_id: string, children: unknown[]): () => void {
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

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    stop_mount?.();
  };

  if (has_scope()) register_in_scope(dispose);
  return dispose;
}

export function mount(target: Node | string, ...children: unknown[]): () => void {
  if (typeof target !== "string") return mount_children(target, children);

  const parent = document.getElementById(target);
  if (parent) return mount_children(parent, children);

  return mount_when_available(target, children);
}

const replace_mounts = new WeakMap<Node, () => void>();

export function replace(target: Node | string, ...children: unknown[]): () => void {
  const parent = typeof target === "string" ? by_id(target) : target;
  const previous = replace_mounts.get(parent);
  if (previous) previous();

  while (parent.firstChild) parent.removeChild(parent.firstChild);
  const stop = mount(parent, ...children);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    if (replace_mounts.get(parent) === dispose) replace_mounts.delete(parent);
  };

  replace_mounts.set(parent, dispose);
  return dispose;
}

export function el(tag: string, props?: Props | unknown, ...children: unknown[]): HTMLElement {
  const node = document.createElement(tag);

  if (
    props != null &&
    (typeof props !== "object" ||
      is_node(props) ||
      Array.isArray(props) ||
      is_reactive(props))
  ) {
    children.unshift(props);
    props = undefined;
  }

  if (props) {
    for (const [key, value] of Object.entries(props as Props)) {
      set_prop(node, key, value);
    }
  }

  for (const child of children) {
    append_child(node, child);
  }

  return node;
}

export function Fragment(_props?: Props | unknown, ...children: unknown[]): unknown[] {
  return children;
}

/* tag shortcuts */
export const div = (props?: unknown, ...children: unknown[]) => el("div", props, ...children);
export const span = (props?: unknown, ...children: unknown[]) => el("span", props, ...children);
export const button = (props?: unknown, ...children: unknown[]) => el("button", props, ...children);
export const input = (props?: Props) => el("input", props);
export const a = (props?: unknown, ...children: unknown[]) => el("a", props, ...children);
export const ul = (props?: unknown, ...children: unknown[]) => el("ul", props, ...children);
export const li = (props?: unknown, ...children: unknown[]) => el("li", props, ...children);
export const h1 = (props?: unknown, ...children: unknown[]) => el("h1", props, ...children);
export const h2 = (props?: unknown, ...children: unknown[]) => el("h2", props, ...children);
export const p = (props?: unknown, ...children: unknown[]) => el("p", props, ...children);
export const section = (props?: unknown, ...children: unknown[]) => el("section", props, ...children);
export const article = (props?: unknown, ...children: unknown[]) => el("article", props, ...children);
export const nav = (props?: unknown, ...children: unknown[]) => el("nav", props, ...children);
export const header = (props?: unknown, ...children: unknown[]) => el("header", props, ...children);
export const footer = (props?: unknown, ...children: unknown[]) => el("footer", props, ...children);
export const main = (props?: unknown, ...children: unknown[]) => el("main", props, ...children);
export const aside = (props?: unknown, ...children: unknown[]) => el("aside", props, ...children);
