import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enterScope, exitScope } from "./scope";
import { clock, media, stored } from "./browserState";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, String(value)),
  };
}

describe("stored", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("loads a saved value and saves every set", () => {
    localStorage.setItem("width", "320");
    const width = stored("width", 240);

    expect(width.get()).toBe(320);
    width.set(400);
    expect(localStorage.getItem("width")).toBe("400");
    width.update((value) => value + 1);
    expect(localStorage.getItem("width")).toBe("401");
  });

  it("falls back for missing, unreadable, or mistyped values", () => {
    localStorage.setItem("broken", "{");
    localStorage.setItem("typed", '"wide"');

    expect(stored("missing", 1).get()).toBe(1);
    expect(stored("broken", 1).get()).toBe(1);
    expect(stored("typed", 1).get()).toBe(1);
    expect(stored("typed", ["a"]).get()).toEqual(["a"]);
  });

  it("accepts a custom validator", () => {
    localStorage.setItem("mode", '"loud"');
    const valid = (value: unknown) => value === "quiet" || value === "normal";

    expect(stored("mode", "normal", valid).get()).toBe("normal");
  });
});

describe("media", () => {
  afterEach(() => vi.restoreAllMocks());

  it("follows a media query until its scope is disposed", () => {
    const list = Object.assign(new EventTarget(), { matches: true, media: "(pointer: fine)" });
    vi.spyOn(window, "matchMedia").mockReturnValue(list as unknown as MediaQueryList);

    enterScope();
    const fine = media("(pointer: fine)");
    const scope = exitScope();

    expect(fine.get()).toBe(true);
    list.matches = false;
    list.dispatchEvent(new Event("change"));
    expect(fine.get()).toBe(false);

    for (const dispose of scope) dispose();
    list.matches = true;
    list.dispatchEvent(new Event("change"));
    expect(fine.get()).toBe(false);
  });
});

describe("clock", () => {
  afterEach(() => vi.useRealTimers());

  it("ticks until its scope is disposed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    enterScope();
    const now = clock(500);
    const scope = exitScope();

    expect(now.get()).toBe(1_000);
    vi.advanceTimersByTime(500);
    expect(now.get()).toBe(1_500);

    for (const dispose of scope) dispose();
    vi.advanceTimersByTime(500);
    expect(now.get()).toBe(1_500);
  });
});
