import { effect, is_reactive, resolve, type ReactiveValue } from "./core";
import type {
  StyleMap,
  StyleShape,
  StyleValue,
} from "./dom_types";
import { auto_dispose } from "./lifecycle";

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
  return key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function format_value(key: string, value: unknown): string {
  if (value == null || value === false) return "";
  if (typeof value === "number" && !UNITLESS.has(key) && !key.startsWith("--")) {
    return `${value}px`;
  }
  return String(value);
}

function write_key(el: HTMLElement | SVGElement, key: string, value: unknown): void {
  const normalized = to_kebab(key);
  const formatted = format_value(normalized, value);
  if (!formatted) {
    el.style.removeProperty(normalized);
    return;
  }

  el.style.setProperty(normalized, formatted);
}

function apply_object(
  el: HTMLElement | SVGElement,
  next: StyleMap,
  previous: Set<string> | null,
): Set<string> {
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(next)) {
    const normalized = to_kebab(key);
    seen.add(normalized);
    write_key(el, key, value);
  }

  if (previous) {
    for (const key of previous) {
      if (!seen.has(key)) el.style.removeProperty(key);
    }
  }

  return seen;
}

function clear_keys(el: HTMLElement | SVGElement, keys: Set<string> | null): void {
  if (!keys) return;
  for (const key of keys) el.style.removeProperty(key);
}

function set_entry(el: HTMLElement | SVGElement, key: string, value: unknown): void {
  if (!is_reactive(value)) {
    write_key(el, key, value);
    return;
  }

  auto_dispose(el, effect(() => write_key(el, key, resolve(value))));
}

function set_object(el: HTMLElement | SVGElement, value: StyleMap): void {
  for (const [key, entry] of Object.entries(value)) set_entry(el, key, entry);
}

function bind_reactive(
  el: HTMLElement | SVGElement,
  value: ReactiveValue<StyleShape>,
): void {
  let previous: Set<string> | null = null;
  let used_css_text = false;

  auto_dispose(el, effect(() => {
    const next = resolve(value);
    if (next == null) {
      if (used_css_text) el.style.cssText = "";
      else clear_keys(el, previous);
      previous = null;
      used_css_text = false;
      return;
    }

    if (typeof next === "string") {
      el.style.cssText = next;
      previous = null;
      used_css_text = true;
      return;
    }

    if (used_css_text) el.style.cssText = "";
    previous = apply_object(el, next, previous);
    used_css_text = false;
  }));
}

export function set_style(el: HTMLElement | SVGElement, value: StyleValue): void {
  if (value == null) return;

  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }

  if (is_reactive(value)) {
    bind_reactive(el, value as ReactiveValue<StyleShape>);
    return;
  }

  set_object(el, value);
}
