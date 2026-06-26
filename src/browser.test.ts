import { afterEach, describe, expect, it, vi } from "vitest";
import { div } from "./dom";
import { enter_scope, exit_scope } from "./scope";
import { on_interval, on_media, on_resize, on_timeout } from "./browser";

describe("cleanup-aware browser helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("cleans up intervals registered inside a scope", () => {
    vi.useFakeTimers();
    let calls = 0;

    enter_scope();
    on_interval(() => {
      calls++;
    }, 10);
    const scope = exit_scope();

    vi.advanceTimersByTime(25);
    expect(calls).toBe(2);

    for (const dispose of scope) dispose();
    vi.advanceTimersByTime(30);
    expect(calls).toBe(2);
  });

  it("returns a timeout disposer", () => {
    vi.useFakeTimers();
    let calls = 0;

    const dispose = on_timeout(() => {
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
    on_resize(owner, () => {
      calls++;
    });

    window.dispatchEvent(new Event("resize"));
    expect(calls).toBe(1);

    owner.remove();
    await Promise.resolve();

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

    const dispose = on_media(media, (matches) => {
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
