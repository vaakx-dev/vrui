// ============================================================
// vrui - portal (mount a subtree into a non-parent DOM node)
// ============================================================

import { append_child } from "./dom";
import type { Child } from "./dom_types";
import { on_disconnect } from "./lifecycle";
import { collect_scope, dispose_all, once, register_in_scope } from "./scope";

type PortalFactory = () => Child | Child[];
type PortalChild = Child | PortalFactory;

type MountedPortal = {
  dispose: () => void;
};

function document_observer_root(): Node {
  return document.documentElement ?? document.body ?? document;
}

function is_factory(children: PortalChild[]): children is [PortalFactory] {
  return children.length === 1 && typeof children[0] === "function";
}

function append_portal_children(
  parent: Node,
  children: PortalChild[],
  dispose_portal: () => void,
): MountedPortal {
  const frag = document.createDocumentFragment();
  const created = collect_scope(() => {
    if (is_factory(children)) {
      append_child(frag, children[0]());
      return;
    }

    for (const child of children) append_child(frag, child as Child);
  });

  const mounted = Array.from(frag.childNodes);
  parent.appendChild(frag);

  let cancel_disconnects: (() => void)[] = [];
  const dispose = once(() => {
    for (const cancel of cancel_disconnects) cancel();
    cancel_disconnects = [];

    for (const node of mounted) {
      if (node.parentNode === parent) node.parentNode.removeChild(node);
    }
    dispose_all(created.scope);
  });

  cancel_disconnects = [
    ...mounted.map((node) => on_disconnect(node, dispose_portal)),
    on_disconnect(parent, dispose_portal),
  ];

  return { dispose };
}

function mount_when_available(
  target_id: string,
  children: PortalChild[],
  dispose_portal: () => void,
): () => void {
  let mounted: MountedPortal | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function try_mount(): void {
    if (disposed || mounted) return;

    const parent = document.getElementById(target_id);
    if (!parent) return;

    observer?.disconnect();
    observer = undefined;
    mounted = append_portal_children(parent, children, dispose_portal);
  }

  observer = new MutationObserver(try_mount);
  observer.observe(document_observer_root(), { childList: true, subtree: true });
  queueMicrotask(try_mount);

  const dispose = once(() => {
    disposed = true;
    observer?.disconnect();
    mounted?.dispose();
  });

  return dispose;
}

export function portal(target: Node | string, ...children: PortalChild[]): Comment {
  const marker = document.createComment("vrui portal");
  let dispose_target = () => {};
  let cancel_marker_disconnect = () => {};
  const dispose = once(() => {
    cancel_marker_disconnect();
    dispose_target();
  });

  if (typeof target === "string") {
    const parent = document.getElementById(target);
    dispose_target = parent
      ? append_portal_children(parent, children, dispose).dispose
      : mount_when_available(target, children, dispose);
  } else {
    dispose_target = append_portal_children(target, children, dispose).dispose;
  }

  cancel_marker_disconnect = on_disconnect(marker, dispose);
  register_in_scope(dispose);

  return marker;
}
