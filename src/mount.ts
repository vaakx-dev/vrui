import { appendChild } from "./dom";
import type { Child } from "./domTypes";
import { collectScope, disposeAll, once, scoped } from "./scope";

export function byId<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`vrui: missing element #${id}`);
  return el as unknown as T;
}

function mountChildren(parent: Node, children: Child[]): () => void {
  const fragment = document.createDocumentFragment();
  const { scope } = collectScope(() => {
    for (const child of children) appendChild(fragment, child);
  });

  const mounted = Array.from(fragment.childNodes);
  parent.appendChild(fragment);

  const dispose = once(() => {
    for (const node of mounted) {
      if (node.parentNode === parent) parent.removeChild(node);
    }
    disposeAll(scope);
  });

  return scoped(dispose);
}

function observerRoot(): Node {
  return document.documentElement ?? document.body ?? document;
}

function mountWhenAvailable(targetId: string, children: Child[]): () => void {
  let stopMount: (() => void) | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function tryMount(): void {
    if (disposed || stopMount) return;
    const parent = document.getElementById(targetId);
    if (!parent) return;
    observer?.disconnect();
    observer = undefined;
    stopMount = mountChildren(parent, children);
  }

  observer = new MutationObserver(tryMount);
  observer.observe(observerRoot(), { childList: true, subtree: true });
  queueMicrotask(tryMount);

  const dispose = once(() => {
    disposed = true;
    observer?.disconnect();
    stopMount?.();
  });

  return scoped(dispose);
}

export function mount(target: Node | string, ...children: Child[]): () => void {
  if (typeof target !== "string") return mountChildren(target, children);

  const parent = document.getElementById(target);
  if (parent) return mountChildren(parent, children);
  return mountWhenAvailable(target, children);
}

const replacements = new WeakMap<Node, () => void>();

export function replace(target: Node | string, ...children: Child[]): () => void {
  const parent = typeof target === "string" ? byId(target) : target;
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
