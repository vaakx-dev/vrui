// ============================================================
// vrui - cleanup-aware browser helpers
// ============================================================

import { autoDispose, listen, onDisconnect, onWindow } from "./lifecycle";
import { once, scoped } from "./scope";

/**
 * Tie a stop function to the active scope and, when given, to an owner node's
 * mounted lifetime, like `onTarget`. The returned disposer stops early.
 */
function owned(stop: () => void, owner?: Node): () => void {
  const dispose = scoped(once(stop));
  if (!owner) return dispose;

  const cancelDisconnect = onDisconnect(owner, dispose);
  return once(() => {
    cancelDisconnect();
    dispose();
  });
}

export function onTimeout(fn: () => void, ms?: number, owner?: Node): () => void {
  let id: number | undefined;
  const dispose = owned(() => window.clearTimeout(id), owner);
  id = window.setTimeout(() => {
    dispose();
    fn();
  }, ms);
  return dispose;
}

export function onInterval(fn: () => void, ms?: number, owner?: Node): () => void {
  const id = window.setInterval(fn, ms);

  return owned(() => window.clearInterval(id), owner);
}

export function onRaf(fn: FrameRequestCallback, owner?: Node): () => void {
  let id: number | undefined;
  const dispose = owned(() => {
    if (id !== undefined) window.cancelAnimationFrame(id);
  }, owner);
  id = window.requestAnimationFrame((time) => {
    dispose();
    fn(time);
  });
  return dispose;
}

export function onResize(
  owner: Node,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  return onWindow(owner, "resize", handler, options);
}

export type MediaHandler = (matches: boolean, media: MediaQueryList) => void;

export function onMedia(query: string | MediaQueryList, fn: MediaHandler): () => void {
  const media = typeof query === "string" ? window.matchMedia(query) : query;
  const handler = () => fn(media.matches, media);

  handler();

  return listen(media, "change", handler);
}

export function resizeObserver(
  owner: Element,
  fn: ResizeObserverCallback,
  options?: ResizeObserverOptions,
): ResizeObserver {
  const observer = new ResizeObserver(fn);
  observer.observe(owner, options);
  autoDispose(owner, () => observer.disconnect());
  return observer;
}

export function intersectionObserver(
  owner: Element,
  fn: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): IntersectionObserver {
  const observer = new IntersectionObserver(fn, options);
  observer.observe(owner);
  autoDispose(owner, () => observer.disconnect());
  return observer;
}
