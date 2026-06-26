// ============================================================
// vrui - portal (mount a subtree into a non-parent DOM node)
// ============================================================

import { type Child, append_child, on_disconnect } from "./dom";
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

function append_portal_children(parent: Node, children: PortalChild[]): MountedPortal {
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

  const dispose = once(() => {
    for (const node of mounted) {
      if (node.parentNode === parent) node.parentNode.removeChild(node);
    }
    dispose_all(created.scope);
  });

  for (const node of mounted) on_disconnect(node, dispose);
  on_disconnect(parent, dispose);

  return { dispose };
}

function mount_when_available(target_id: string, children: PortalChild[]): () => void {
  let mounted: MountedPortal | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function try_mount(): void {
    if (disposed || mounted) return;

    const parent = document.getElementById(target_id);
    if (!parent) return;

    observer?.disconnect();
    observer = undefined;
    mounted = append_portal_children(parent, children);
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
  let dispose: () => void;

  if (typeof target === "string") {
    const parent = document.getElementById(target);
    dispose = parent
      ? append_portal_children(parent, children).dispose
      : mount_when_available(target, children);
  } else {
    dispose = append_portal_children(target, children).dispose;
  }

  on_disconnect(marker, dispose);
  register_in_scope(dispose);

  return marker;
}
