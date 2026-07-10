import { append_child } from "./dom";
import type { Child } from "./dom_types";
import { collect_scope, dispose_all, once, scoped } from "./scope";

export function by_id<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`vrui: missing element #${id}`);
  return el as unknown as T;
}

function mount_children(parent: Node, children: Child[]): () => void {
  const fragment = document.createDocumentFragment();
  const { scope } = collect_scope(() => {
    for (const child of children) append_child(fragment, child);
  });

  const mounted = Array.from(fragment.childNodes);
  parent.appendChild(fragment);

  const dispose = once(() => {
    for (const node of mounted) {
      if (node.parentNode === parent) parent.removeChild(node);
    }
    dispose_all(scope);
  });

  return scoped(dispose);
}

function observer_root(): Node {
  return document.documentElement ?? document.body ?? document;
}

function mount_when_available(target_id: string, children: Child[]): () => void {
  let stop_mount: (() => void) | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function try_mount(): void {
    if (disposed || stop_mount) return;
    const parent = document.getElementById(target_id);
    if (!parent) return;
    observer?.disconnect();
    observer = undefined;
    stop_mount = mount_children(parent, children);
  }

  observer = new MutationObserver(try_mount);
  observer.observe(observer_root(), { childList: true, subtree: true });
  queueMicrotask(try_mount);

  const dispose = once(() => {
    disposed = true;
    observer?.disconnect();
    stop_mount?.();
  });

  return scoped(dispose);
}

export function mount(target: Node | string, ...children: Child[]): () => void {
  if (typeof target !== "string") return mount_children(target, children);

  const parent = document.getElementById(target);
  if (parent) return mount_children(parent, children);
  return mount_when_available(target, children);
}

const replacements = new WeakMap<Node, () => void>();

export function replace(target: Node | string, ...children: Child[]): () => void {
  const parent = typeof target === "string" ? by_id(target) : target;
  replacements.get(parent)?.();

  while (parent.firstChild) parent.removeChild(parent.firstChild);
  const stop = mount(parent, ...children);

  const dispose = once(() => {
    stop();
    if (replacements.get(parent) === dispose) replacements.delete(parent);
  });

  replacements.set(parent, dispose);
  return dispose;
}
