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
    expect(signals[1].aborted).toBe(true);
  });

  it("records fetch errors", async () => {
    const error = new Error("boom");
    const state = resource(() => Promise.reject(error));

    await flush();

    expect(state.error.get()).toBe(error);
    expect(state.loading.get()).toBe(false);

    state.dispose();
  });
});
