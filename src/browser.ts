// ============================================================
// vrui - cleanup-aware browser helpers
// ============================================================

import { auto_dispose, on_window } from "./dom";
import { once, scoped } from "./scope";

export function on_timeout(fn: () => void, ms?: number): () => void {
  const id = window.setTimeout(fn, ms);

  return scoped(once(() => window.clearTimeout(id)));
}

export function on_interval(fn: () => void, ms?: number): () => void {
  const id = window.setInterval(fn, ms);

  return scoped(once(() => window.clearInterval(id)));
}

export function on_raf(fn: FrameRequestCallback): () => void {
  const id = window.requestAnimationFrame(fn);

  return scoped(once(() => window.cancelAnimationFrame(id)));
}

export function on_resize(
  owner: Node,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): void {
  on_window(owner, "resize", handler, options);
}

export type MediaHandler = (matches: boolean, media: MediaQueryList) => void;

export function on_media(query: string | MediaQueryList, fn: MediaHandler): () => void {
  const media = typeof query === "string" ? window.matchMedia(query) : query;
  const handler = () => fn(media.matches, media);

  handler();

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handler);
    return scoped(once(() => media.removeEventListener("change", handler)));
  }

  media.addListener(handler);
  return scoped(once(() => media.removeListener(handler)));
}

export function resize_observer(
  owner: Element,
  fn: ResizeObserverCallback,
  options?: ResizeObserverOptions,
): ResizeObserver {
  const observer = new ResizeObserver(fn);
  observer.observe(owner, options);
  auto_dispose(owner, () => observer.disconnect());
  return observer;
}

export function intersection_observer(
  owner: Element,
  fn: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): IntersectionObserver {
  const observer = new IntersectionObserver(fn, options);
  observer.observe(owner);
  auto_dispose(owner, () => observer.disconnect());
  return observer;
}
