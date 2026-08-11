import { afterEach, describe, expect, it, vi } from "vitest";
import { div } from "./elements";
import { enterScope, exitScope } from "./scope";
import { onInterval, onMedia, onResize, onTimeout } from "./browser";

describe("cleanup-aware browser helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("cleans up intervals registered inside a scope", () => {
    vi.useFakeTimers();
    let calls = 0;

    enterScope();
    onInterval(() => {
      calls++;
    }, 10);
    const scope = exitScope();

    vi.advanceTimersByTime(25);
    expect(calls).toBe(2);

    for (const dispose of scope) dispose();
    vi.advanceTimersByTime(30);
    expect(calls).toBe(2);
  });

  it("returns a timeout disposer", () => {
    vi.useFakeTimers();
    let calls = 0;

    const dispose = onTimeout(() => {
      calls++;
    }, 10);

    dispose();
    vi.advanceTimersByTime(20);

    expect(calls).toBe(0);
  });

  it("ties resize listeners to an owner node", async () => {
    const owner = div();
    let calls = 0;

    document.body.appendChild(owner);
    onResize(owner, () => {
      calls++;
    });

    window.dispatchEvent(new Event("resize"));
    expect(calls).toBe(1);

    owner.remove();
    await Promise.resolve();

    window.dispatchEvent(new Event("resize"));
    expect(calls).toBe(1);
  });

  it("returns a resize listener disposer", () => {
    const owner = div();
    let calls = 0;
    const stop = onResize(owner, () => {
      calls++;
    });

    window.dispatchEvent(new Event("resize"));
    stop();
    window.dispatchEvent(new Event("resize"));

    expect(calls).toBe(1);
  });

  it("registers media query listeners and returns a disposer", () => {
    const media = Object.assign(new EventTarget(), {
      matches: false,
      media: "(min-width: 1px)",
      onchange: null,
    }) as MediaQueryList & { matches: boolean };
    const seen: boolean[] = [];

    const dispose = onMedia(media, (matches) => {
      seen.push(matches);
    });

    expect(seen).toEqual([false]);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(seen).toEqual([false, true]);

    dispose();
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    expect(seen).toEqual([false, true]);
  });
});
