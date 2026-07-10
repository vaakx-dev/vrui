// ============================================================
// vrui - dom factories + reactive prop/child bindings
// ============================================================

import {
  effect,
  is_reactive,
  resolve,
  type Cleanup,
} from "./core";
import type {
  Child,
  ClassValue,
  Props,
  StyleValue,
  WritableSignal,
} from "./dom_types";
import { event_name_from_prop } from "./events";
import {
  auto_dispose,
  on_mount,
  on_target,
} from "./lifecycle";
import { set_style } from "./style";

/* ---------- string + class helpers ---------- */

export function safe_str(v: unknown): string {
  return v == null ? "" : String(v);
}

function is_node(v: unknown): v is Node {
  return typeof Node !== "undefined" && v instanceof Node;
}

export function class_str(v: ClassValue): string {
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
      el.className = class_str(resolve(value) as ClassValue);
    });
    auto_dispose(el, dispose);
    return;
  }
  el.className = class_str(value as ClassValue);
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
    Reflect.set(el, key, value);
    return;
  }

  const dispose = effect(() => {
    Reflect.set(el, key, resolve(value));
  });
  auto_dispose(el, dispose);
}

const DOM_PROP_SETTERS: Record<string, DomPropSetter> = {
  ref: (el, value) => (value as (el: HTMLElement) => void)(el),
  on_mount: (el, value) => on_mount(el, value as (el: Node) => Cleanup),
  bind_value,
  bind_checked,
  class: set_class,
  style: (el, value) => set_style(el, value as StyleValue),
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

function is_child_argument(value: unknown): value is Child {
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
export function el(tag: string, props?: unknown, ...children: Child[]): HTMLElement {
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
