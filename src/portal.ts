// ============================================================
// vrui - portal (mount a subtree into a non-parent DOM node)
// ============================================================
//
// Why this exists: the dock layer needs to mount things outside their
// call-site parent - the drag ghost lives on document.body, the drop-zone
// overlay sits above the whole layout, floating panels stack above splits.
// portal() lets the declarative tree express "this lives over there" while
// keeping cleanup wired to the call site, not the destination.

import { collect_scope, dispose_all, once, register_in_scope } from "./scope";
import { by_id, on_disconnect } from "./dom";

export function portal(target: Node | string, child: Node | (() => Node)): HTMLElement {
  const parent = typeof target === "string" ? by_id(target) : target;
  // Marker stays in the surrounding tree as a slot-keeper so on_disconnect
  // fires when the call-site subtree is removed. display:none keeps it from
  // affecting layout.
  const marker = document.createElement("div");
  marker.style.display = "none";

  // Build the portaled child inside a fresh scope so its effects, lists,
  // signals, etc. get cleaned up with the portal rather than leaking when
  // target outlives us.
  const created = collect_scope(() => typeof child === "function" ? child() : child);
  const node = created.value;
  const scope = created.scope;

  parent.appendChild(node);

  const dispose = once(() => {
    if (node.parentNode === parent) parent.removeChild(node);
    dispose_all(scope);
  });

  // Register against both the surrounding scope (if any) AND the marker's
  // disconnect. Either fires first wins; the disposed guard prevents a
  // double-teardown.
  register_in_scope(dispose);
  on_disconnect(marker, dispose);

  return marker;
}
