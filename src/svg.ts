// ============================================================
// vrui - svg factories with reactive props (mirrors dom.ts shape)
// ============================================================
//
// SVG elements live in a different XML namespace from HTML, so they need
// createElementNS, and almost all their props go through setAttribute
// rather than property assignment. We mirror the dom.ts API (factories,
// reactive props, on_* event handlers, text/class shortcuts) but with
// setAttribute-based prop application.
//
// Why we want this: the dock layer's drop-zone overlay, split previews,
// resize cursors, and panel icons all want SVG. Routing through el() in
// dom.ts would silently produce HTML-namespaced nodes that don't render.

import { effect, is_reactive, resolve } from "./core";
import {
  auto_dispose,
  append_child,
  class_str,
  on_mount,
  safe_str,
  set_style,
  type Child,
  type Props,
} from "./dom";

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
  if (value == null) el.removeAttribute(key);
  else el.setAttribute(key, String(value));
}

function set_svg_prop(el: SVGElement, key: string, value: unknown): void {
  if (key === "ref") {
    (value as (el: SVGElement) => void)(el);
    return;
  }

  if (key === "on_mount") {
    on_mount(el, value as (el: Node) => void | (() => void));
    return;
  }

  const attr = svg_attr_name(key);

  if (attr === "class") {
    if (has_reactive_part(value)) {
      const dispose = effect(() => {
        el.setAttribute("class", class_str(is_reactive(value) ? resolve(value) : value));
      });
      auto_dispose(el, dispose);
    } else {
      el.setAttribute("class", class_str(value));
    }
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

  // Everything else (including data-*, aria-*, role, geometry attributes
  // like x/y/cx/cy/width/r/d/transform, presentation attrs like fill/stroke)
  // goes through setAttribute. SVG elements expose most of these as DOM
  // properties too, but the property model is inconsistent across browsers
  // and engines; setAttribute is the safe path.
  if (is_reactive(value)) {
    const dispose = effect(() => write_svg_attr(el, attr, resolve(value)));
    auto_dispose(el, dispose);
  } else {
    write_svg_attr(el, attr, value);
  }
}

export function svg_el(tag: string, props?: Props<SVGElement> | Child, ...children: Child[]): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);

  // Mirror dom.ts: allow callers to omit props and pass children directly.
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
export const svg = (props?: Props<SVGSVGElement> | Child, ...children: Child[]) => svg_el("svg", props, ...children);
export const g = (props?: Props<SVGGElement> | Child, ...children: Child[]) => svg_el("g", props, ...children);
export const path = (props?: Props<SVGPathElement> | Child, ...children: Child[]) => svg_el("path", props, ...children);
export const rect = (props?: Props<SVGRectElement> | Child, ...children: Child[]) => svg_el("rect", props, ...children);
export const circle = (props?: Props<SVGCircleElement> | Child, ...children: Child[]) => svg_el("circle", props, ...children);
export const ellipse = (props?: Props<SVGEllipseElement> | Child, ...children: Child[]) => svg_el("ellipse", props, ...children);
export const line = (props?: Props<SVGLineElement> | Child, ...children: Child[]) => svg_el("line", props, ...children);
export const polyline = (props?: Props<SVGPolylineElement> | Child, ...children: Child[]) => svg_el("polyline", props, ...children);
export const polygon = (props?: Props<SVGPolygonElement> | Child, ...children: Child[]) => svg_el("polygon", props, ...children);
export const defs = (props?: Props<SVGDefsElement> | Child, ...children: Child[]) => svg_el("defs", props, ...children);
export const text_el = (props?: Props<SVGTextElement> | Child, ...children: Child[]) => svg_el("text", props, ...children);
export const title_el = (props?: Props<SVGTitleElement> | Child, ...children: Child[]) => svg_el("title", props, ...children);
export const use_el = (props?: Props<SVGUseElement> | Child, ...children: Child[]) => svg_el("use", props, ...children);
