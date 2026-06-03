// ============================================================
// vrui - lucide icon helper
// ============================================================

import { createElement, icons, type IconNode } from "lucide";

export type icon_node = IconNode;

const icon_map = icons as Record<string, IconNode>;

export function snake_to_pascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function icon_node_for(name: string): IconNode | undefined {
  return icon_map[name] ?? icon_map[snake_to_pascal(name)];
}

export function has_icon(name: string): boolean {
  return icon_node_for(name) != null;
}

export function icon(name: string, size = 12, stroke_width = 2): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "vrui-icon";
  Object.assign(wrapper.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "0",
  });

  const node = icon_node_for(name);
  if (!node) {
    wrapper.textContent = "?";
    console.warn(`unknown lucide icon: ${name}`);
    return wrapper;
  }

  wrapper.appendChild(createElement(node, {
    width: size,
    height: size,
    "stroke-width": stroke_width,
    "aria-hidden": "true",
    focusable: "false",
  }));

  return wrapper;
}
