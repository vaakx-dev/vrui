import { describe, expect, it, vi } from "vitest";
import { effect } from "./core";
import { resource, store } from "./store";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("store", () => {
  it("exposes object fields as signals and updates them through proxy writes", () => {
    const state = store({ count: 1, name: "Ada" });
    const seen: number[] = [];

    const stop = effect(() => {
      seen.push(state.count.get());
    });

    expect(state.count.get()).toBe(1);
    expect(state.name.get()).toBe("Ada");

    if (false) {
      // @ts-expect-error store fields expose readonly signals; proxy writes need an explicit runtime cast.
      state.count = 2;
    }
    (state as unknown as { count: number }).count = 2;

    expect(state.count.get()).toBe(2);
    expect(seen).toEqual([1, 2]);

    stop();
  });
});

describe("resource", () => {
  it("starts lazily, aborts stale requests, and ignores stale results", async () => {
    const resolves: ((value: string) => void)[] = [];
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((signal?: AbortSignal) => {
      signals.push(signal!);
      return new Promise<string>((resolve) => {
        resolves.push(resolve);
      });
    });

    const state = resource(fetcher, { lazy: true });

    expect(fetcher).not.toHaveBeenCalled();
    expect(state.loading.get()).toBe(false);

    state.refetch();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.loading.get()).toBe(true);

    state.refetch();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true);

    resolves[0]("stale");
    await flush();
    expect(state.data.get()).toBeUndefined();
    expect(state.loading.get()).toBe(true);

    resolves[1]("fresh");
    await flush();
    expect(state.data.get()).toBe("fresh");
    expect(state.error.get()).toBeUndefined();
    expect(state.loading.get()).toBe(false);

    state.dispose();
    expect(signals[1].aborted).toBe(false);
  });

  it("records fetch errors", async () => {
    const error = new Error("boom");
    const state = resource(() => Promise.reject(error));

    await flush();

    expect(state.error.get()).toBe(error);
    expect(state.loading.get()).toBe(false);

    state.dispose();
  });

  it("records synchronous fetch errors without throwing or staying loading", async () => {
    const error = new Error("sync boom");
    const fetcher = vi.fn(() => {
      throw error;
    });
    const state = resource(fetcher, { lazy: true });

    expect(() => state.refetch()).not.toThrow();
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(state.data.get()).toBeUndefined();
    expect(state.error.get()).toBe(error);
    expect(state.loading.get()).toBe(false);

    state.dispose();
  });

  it("keeps a synchronous error current when an aborted stale request later resolves", async () => {
    let resolveStale!: (value: string) => void;
    const signals: AbortSignal[] = [];
    const error = new Error("latest failed");
    const fetcher = vi
      .fn()
      .mockImplementationOnce((signal?: AbortSignal) => {
        signals.push(signal!);
        return new Promise<string>((resolve) => {
          resolveStale = resolve;
        });
      })
      .mockImplementationOnce((signal?: AbortSignal) => {
        signals.push(signal!);
        throw error;
      });
    const state = resource(fetcher, { lazy: true });

    state.refetch();
    expect(state.loading.get()).toBe(true);

    expect(() => state.refetch()).not.toThrow();
    expect(signals[0].aborted).toBe(true);
    expect(state.error.get()).toBe(error);
    expect(state.loading.get()).toBe(false);

    resolveStale("stale");
    await flush();

    expect(state.data.get()).toBeUndefined();
    expect(state.error.get()).toBe(error);
    expect(state.loading.get()).toBe(false);

    state.dispose();
  });
});
