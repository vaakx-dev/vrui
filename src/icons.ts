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

function create_node([tag, attributes, children]: NodeData): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }
  for (const child of children ?? []) node.appendChild(create_node(child));
  return node;
}

function create_icon(node: IconNode, attributes: NodeAttributes): SVGElement {
  return create_node([
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

export function icon(node: IconNode, size = 12, stroke_width = 2): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "vrui-icon";
  Object.assign(wrapper.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "0",
  });

  wrapper.appendChild(create_icon(node, {
    width: size,
    height: size,
    "stroke-width": stroke_width,
    "aria-hidden": "true",
    focusable: "false",
  }));

  return wrapper;
}
