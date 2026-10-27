// ============================================================
// vrui - lucide icon helper
// ============================================================

import type { IconNode as LucideIconNode } from "lucide";

export type IconNode = LucideIconNode;

type NodeAttributes = Record<string, string | number | undefined>;
type NodeData = readonly [
  tag: string,
  attributes: NodeAttributes,
  children?: readonly NodeData[],
];

const SVG_NS = "http://www.w3.org/2000/svg";

function createNode([tag, attributes, children]: NodeData): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }
  for (const child of children ?? []) node.appendChild(createNode(child));
  return node;
}

function createIcon(node: IconNode, attributes: NodeAttributes): SVGElement {
  return createNode([
    "svg",
    {
      xmlns: SVG_NS,
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      ...attributes,
    },
    node as unknown as readonly NodeData[],
  ]);
}

const NAMED_SIZES = { xs: 12, sm: 14, md: 16, lg: 20 } as const;

export type IconSize = number | keyof typeof NAMED_SIZES;

export type IconOptions = {
  size?: IconSize;
  strokeWidth?: number;
  fill?: boolean;
};

export function icon(node: IconNode, size?: IconSize, strokeWidth?: number): HTMLElement;
export function icon(node: IconNode, options: IconOptions): HTMLElement;
export function icon(node: IconNode, sizeOrOptions: IconSize | IconOptions = {}, strokeWidth?: number): HTMLElement {
  const options = typeof sizeOrOptions === "object" ? sizeOrOptions : { size: sizeOrOptions, strokeWidth };
  const { size = 12, strokeWidth: stroke = 2, fill = false } = options;
  const pixels = typeof size === "number" ? size : NAMED_SIZES[size];
  const wrapper = document.createElement("span");
  wrapper.className = "vrui-icon";
  Object.assign(wrapper.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "0",
  });

  wrapper.appendChild(createIcon(node, {
    width: pixels,
    height: pixels,
    "stroke-width": stroke,
    fill: fill ? "currentColor" : "none",
    "aria-hidden": "true",
    focusable: "false",
  }));

  return wrapper;
}
