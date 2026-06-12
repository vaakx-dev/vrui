// ============================================================
// vrui - cleanup-aware browser helpers
// ============================================================

import { auto_dispose, on_window } from "./dom";
import { has_scope, register_in_scope } from "./scope";

function scoped(dispose: () => void): () => void {
  if (has_scope()) register_in_scope(dispose);
  return dispose;
}

export function on_timeout(fn: () => void, ms?: number): () => void {
  const id = window.setTimeout(fn, ms);
  let active = true;

  return scoped(() => {
    if (!active) return;
    active = false;
    window.clearTimeout(id);
  });
}

export function on_interval(fn: () => void, ms?: number): () => void {
  const id = window.setInterval(fn, ms);
  let active = true;

  return scoped(() => {
    if (!active) return;
    active = false;
    window.clearInterval(id);
  });
}

export function on_raf(fn: FrameRequestCallback): () => void {
  const id = window.requestAnimationFrame(fn);
  let active = true;

  return scoped(() => {
    if (!active) return;
    active = false;
    window.cancelAnimationFrame(id);
  });
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
    return scoped(() => media.removeEventListener("change", handler));
  }

  media.addListener(handler);
  return scoped(() => media.removeListener(handler));
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
