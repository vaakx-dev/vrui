// ============================================================
// vrui - svg factories with reactive props (mirrors dom.ts shape)
// ============================================================
//
// SVG needs its own namespace and attribute-oriented prop path. Using the HTML
// factory would create nodes that look correct structurally but do not render.

import { effect, is_reactive, resolve } from "./core";
import {
  append_child,
  class_str,
  safe_str,
} from "./dom";
import type { Child, ClassValue, StyleValue } from "./dom_types";
import { event_name_from_prop } from "./events";
import { auto_dispose, on_mount, on_target } from "./lifecycle";
import { set_style } from "./style";
import type { SvgProps } from "./svg_types";

const SVG_NS = "http://www.w3.org/2000/svg";

const SVG_ATTR_ALIASES: Record<string, string> = {
  alignmentBaseline: "alignment-baseline",
  baselineShift: "baseline-shift",
  className: "class",
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  colorRendering: "color-rendering",
  dominantBaseline: "dominant-baseline",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontSizeAdjust: "font-size-adjust",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontWeight: "font-weight",
  imageRendering: "image-rendering",
  letterSpacing: "letter-spacing",
  lightingColor: "lighting-color",
  markerEnd: "marker-end",
  markerMid: "marker-mid",
  markerStart: "marker-start",
  shapeRendering: "shape-rendering",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration",
  textRendering: "text-rendering",
  transformOrigin: "transform-origin",
  vectorEffect: "vector-effect",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode",
};

function is_node(v: unknown): v is Node {
  return typeof Node !== "undefined" && v instanceof Node;
}

function has_reactive_part(value: unknown): boolean {
  if (is_reactive(value)) return true;
  if (Array.isArray(value)) return value.some(has_reactive_part);
  if (value && typeof value === "object" && !is_node(value)) {
    return Object.values(value as Record<string, unknown>).some(has_reactive_part);
  }
  return false;
}

function svg_attr_name(key: string): string {
  return SVG_ATTR_ALIASES[key] ?? key;
}

function write_svg_attr(el: SVGElement, key: string, value: unknown): void {
  if (value == null) {
    el.removeAttribute(key);
    return;
  }

  el.setAttribute(key, String(value));
}

type SvgPropSetter = (el: SVGElement, value: unknown) => void;

function set_svg_class(el: SVGElement, value: unknown): void {
  if (!has_reactive_part(value)) {
    el.setAttribute("class", class_str(value as ClassValue));
    return;
  }

  const dispose = effect(() => {
    const next = is_reactive(value) ? resolve(value) : value;
    el.setAttribute("class", class_str(next as ClassValue));
  });
  auto_dispose(el, dispose);
}

function set_svg_text(el: SVGElement, value: unknown): void {
  if (!is_reactive(value)) {
    el.textContent = safe_str(value);
    return;
  }

  const dispose = effect(() => {
    el.textContent = safe_str(resolve(value));
  });
  auto_dispose(el, dispose);
}

function set_svg_event(el: SVGElement, key: string, value: unknown): void {
  const event = event_name_from_prop(key);
  const handler = value as EventListener;
  on_target(el, el, event, handler);
}

function set_svg_attr(el: SVGElement, key: string, value: unknown): void {
  if (!is_reactive(value)) {
    write_svg_attr(el, key, value);
    return;
  }

  const dispose = effect(() => write_svg_attr(el, key, resolve(value)));
  auto_dispose(el, dispose);
}

const SVG_PROP_SETTERS: Record<string, SvgPropSetter> = {
  ref: (el, value) => (value as (el: SVGElement) => void)(el),
  on_mount: (el, value) => on_mount(el, value as (el: Node) => void | (() => void)),
  style: (el, value) => set_style(el, value as StyleValue),
  text: set_svg_text,
};

function set_svg_prop(el: SVGElement, key: string, value: unknown): void {
  const attr = svg_attr_name(key);

  if (attr === "class") {
    set_svg_class(el, value);
    return;
  }

  const setter = SVG_PROP_SETTERS[key];
  if (setter) {
    setter(el, value);
    return;
  }

  if (key.startsWith("on_")) {
    set_svg_event(el, key, value);
    return;
  }

  // Everything else (including data-*, aria-*, role, geometry attributes
  // like x/y/cx/cy/width/r/d/transform, presentation attrs like fill/stroke)
  // goes through setAttribute. SVG elements expose most of these as DOM
  // properties too, but the property model is inconsistent across browsers
  // and engines; setAttribute is the safe path.
  set_svg_attr(el, attr, value);
}

function is_child_argument(value: unknown): value is Child {
  return value != null &&
    (typeof value !== "object" ||
      is_node(value) ||
      Array.isArray(value) ||
      is_reactive(value));
}

export function svg_el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: SvgProps<SVGElementTagNameMap[K]> | Child,
  ...children: Child[]
): SVGElementTagNameMap[K];
export function svg_el(tag: string, props?: SvgProps | Child, ...children: Child[]): SVGElement;
export function svg_el(tag: string, props?: unknown, ...children: Child[]): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);

  // Mirror dom.ts: allow callers to omit props and pass children directly.
  if (is_child_argument(props)) {
    children.unshift(props);
    props = undefined;
  }

  if (props) {
    for (const [key, value] of Object.entries(props as SvgProps)) {
      set_svg_prop(node, key, value);
    }
  }

  for (const child of children) {
    append_child(node, child);
  }

  return node;
}

/* tag shortcuts. We rename anything that collides with HTML factory names
 * in dom.ts (a, title) or with JS reserved words (use) to keep imports
 * unambiguous at call sites. */
export const svg = (props?: SvgProps<SVGSVGElement> | Child, ...children: Child[]) => svg_el("svg", props, ...children);
export const g = (props?: SvgProps<SVGGElement> | Child, ...children: Child[]) => svg_el("g", props, ...children);
export const path = (props?: SvgProps<SVGPathElement> | Child, ...children: Child[]) => svg_el("path", props, ...children);
export const rect = (props?: SvgProps<SVGRectElement> | Child, ...children: Child[]) => svg_el("rect", props, ...children);
export const circle = (props?: SvgProps<SVGCircleElement> | Child, ...children: Child[]) => svg_el("circle", props, ...children);
export const ellipse = (props?: SvgProps<SVGEllipseElement> | Child, ...children: Child[]) => svg_el("ellipse", props, ...children);
export const line = (props?: SvgProps<SVGLineElement> | Child, ...children: Child[]) => svg_el("line", props, ...children);
export const polyline = (props?: SvgProps<SVGPolylineElement> | Child, ...children: Child[]) => svg_el("polyline", props, ...children);
export const polygon = (props?: SvgProps<SVGPolygonElement> | Child, ...children: Child[]) => svg_el("polygon", props, ...children);
export const defs = (props?: SvgProps<SVGDefsElement> | Child, ...children: Child[]) => svg_el("defs", props, ...children);
export const text_el = (props?: SvgProps<SVGTextElement> | Child, ...children: Child[]) => svg_el("text", props, ...children);
export const title_el = (props?: SvgProps<SVGTitleElement> | Child, ...children: Child[]) => svg_el("title", props, ...children);
export const use_el = (props?: SvgProps<SVGUseElement> | Child, ...children: Child[]) => svg_el("use", props, ...children);
