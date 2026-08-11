import { describe, expect, it } from "vitest";
import { batch, derive, effect, isReactive, resolve, sig, untrack } from "./core";
import { enterScope, exitScope, hasScope, registerInScope } from "./scope";

describe("core helpers", () => {
  it("resolves plain, signal, derive, and function values", () => {
    const source = sig(2);
    const doubled = derive(() => source.get() * 2);

    expect(resolve(1)).toBe(1);
    expect(resolve(source)).toBe(2);
    expect(resolve(doubled)).toBe(4);
    expect(resolve(() => 5)).toBe(5);

    expect(isReactive(source)).toBe(true);
    expect(isReactive(doubled)).toBe(true);
    expect(isReactive(() => 5)).toBe(true);
    expect(isReactive(5)).toBe(false);

    doubled.dispose();
  });

  it("runs effects on signal changes and coalesces batched updates", () => {
    const count = sig(0);
    const seen: number[] = [];
    let cleanups = 0;

    const stop = effect(() => {
      seen.push(count.get());
      return () => {
        cleanups++;
      };
    });

    count.set(1);
    count.set(1);
    batch(() => {
      count.set(2);
      count.set(3);
    });

    expect(seen).toEqual([0, 1, 3]);
    expect(cleanups).toBe(2);

    stop();
    expect(cleanups).toBe(3);

    count.set(4);
    expect(seen).toEqual([0, 1, 3]);
  });

  it("settles a diamond of derives before running effects", () => {
    const source = sig(1);
    const left = derive(() => source.get() + 1);
    const right = derive(() => source.get() * 10);
    const total = derive(() => left.get() + right.get());
    const seen: [number, number, number][] = [];

    const stop = effect(() => {
      seen.push([left.get(), right.get(), total.get()]);
    });

    source.set(2);

    expect(seen).toEqual([
      [2, 10, 12],
      [3, 20, 23],
    ]);

    stop();
    total.dispose();
    right.dispose();
    left.dispose();
  });

  it("runs an effect with direct and derived dependencies once per write", () => {
    const source = sig(1);
    const doubled = derive(() => source.get() * 2);
    const seen: [number, number][] = [];

    const stop = effect(() => {
      seen.push([source.get(), doubled.get()]);
    });

    source.set(2);

    expect(seen).toEqual([
      [1, 2],
      [2, 4],
    ]);

    stop();
    doubled.dispose();
  });

  it("settles nested writes before later queued observers run", () => {
    const source = sig(0);
    const mirrored = sig(0);
    const doubled = derive(() => mirrored.get() * 2);
    const seen: [number, number, number][] = [];

    const stopMirror = effect(() => {
      const value = source.get();
      if (value) mirrored.set(value);
    });
    const stopObserver = effect(() => {
      seen.push([source.get(), mirrored.get(), doubled.get()]);
    });

    source.set(2);

    expect(seen).toEqual([
      [0, 0, 0],
      [2, 2, 4],
    ]);

    stopObserver();
    stopMirror();
    doubled.dispose();
  });

  it("drains queued effects after an error and recovers on later writes", () => {
    const source = sig(0);
    const calls: string[] = [];
    let fail = true;

    const stopFailing = effect(() => {
      const value = source.get();
      if (value === 1 && fail) {
        fail = false;
        calls.push("failing:1");
        throw new Error("scheduled failure");
      }
      calls.push(`failing:${value}`);
    });
    const stopHealthy = effect(() => {
      calls.push(`healthy:${source.get()}`);
    });

    expect(() => source.set(1)).toThrow("scheduled failure");
    expect(calls).toEqual([
      "failing:0",
      "healthy:0",
      "failing:1",
      "healthy:1",
    ]);

    source.set(2);
    expect(calls.slice(-2)).toEqual(["failing:2", "healthy:2"]);

    stopHealthy();
    stopFailing();
  });

  it("propagates derive failures instead of exposing stale computed values", () => {
    const source = sig(1);
    const failure = new Error("derive failed");
    const doubled = derive(() => {
      const value = source.get();
      if (value < 0) throw failure;
      return value * 2;
    });
    const seen: Array<[number, number | "error"]> = [];

    const stop = effect(() => {
      const direct = source.get();
      try {
        seen.push([direct, doubled.get()]);
      } catch {
        seen.push([direct, "error"]);
      }
    });

    expect(() => source.set(-1)).toThrow(failure);
    expect(seen).toEqual([[1, 2], [-1, "error"]]);

    source.set(2);
    expect(seen).toEqual([[1, 2], [-1, "error"], [2, 4]]);

    stop();
    doubled.dispose();
  });

  it("clears throwing cleanups and preserves effect dependencies", () => {
    const source = sig(0);
    const runs: number[] = [];
    const cleanups: number[] = [];

    const stop = effect(() => {
      const value = source.get();
      runs.push(value);
      return () => {
        cleanups.push(value);
        if (value === 0) throw new Error("cleanup failure");
      };
    });

    expect(() => source.set(1)).toThrow("cleanup failure");
    expect(runs).toEqual([0]);
    expect(cleanups).toEqual([0]);

    source.set(2);
    expect(runs).toEqual([0, 2]);
    expect(cleanups).toEqual([0]);

    stop();
    expect(cleanups).toEqual([0, 2]);
  });

  it("attempts scoped and returned cleanup even when both throw", () => {
    const source = sig(0);
    const calls: string[] = [];
    const stop = effect(() => {
      source.get();
      registerInScope(() => {
        calls.push("scoped");
        throw new Error("scoped failure");
      });
      return () => {
        calls.push("returned");
        throw new Error("returned failure");
      };
    });

    let thrown: unknown;
    try {
      source.set(1);
    } catch (err) {
      thrown = err;
    }

    expect(calls).toEqual(["scoped", "returned"]);
    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toHaveLength(2);

    expect(() => stop()).not.toThrow();
    source.set(2);
    expect(calls).toEqual(["scoped", "returned"]);
  });

  it("runs code without tracking signal reads", () => {
    const count = sig(0);
    let runs = 0;

    const stop = effect(() => {
      runs++;
      untrack(() => count.get());
    });

    count.set(1);

    expect(runs).toBe(1);
    stop();
  });

  it("disposes nested scope work from a failed effect rerun", () => {
    const gate = sig(false);
    const source = sig(0);
    let innerRuns = 0;
    let innerCleanups = 0;

    const stop = effect(() => {
      if (!gate.get()) return;

      effect(() => {
        source.get();
        innerRuns++;
        return () => {
          innerCleanups++;
        };
      });

      throw new Error("boom");
    });

    expect(() => gate.set(true)).toThrow("boom");
    expect(innerRuns).toBe(1);
    expect(innerCleanups).toBe(1);
    expect(hasScope()).toBe(false);

    source.set(1);
    expect(innerRuns).toBe(1);

    stop();
  });

  it("derives values and exposes read-only behavior", () => {
    const count = sig(2);
    const doubled = derive(() => count.get() * 2);

    expect(doubled.get()).toBe(4);
    count.set(4);
    expect(doubled.get()).toBe(8);
    expect(() => doubled.set(10)).toThrow("derive is read-only");

    doubled.dispose();
  });

  it("supports signal event and collection helpers", () => {
    const enabled = sig(false);
    enabled.toggle()();
    expect(enabled.get()).toBe(true);

    const name = sig("Ada");
    const next = sig("Grace");
    name.setter(next)();
    expect(name.get()).toBe("Grace");

    const inputValue = sig("");
    const input = document.createElement("input");
    input.value = "typed";
    inputValue.fromInput()({ target: input } as unknown as Event);
    expect(inputValue.get()).toBe("typed");

    const user = sig({ id: 7, label: null as string | null });
    const id = user.prop("id");
    const label = sig<string | null>(null).or("fallback");
    expect(id.get()).toBe(7);
    expect(label.get()).toBe("fallback");

    const items = sig(["a", "b", "c"]);
    const index = sig(1);
    const selected = items.index(index);
    const query = sig("a");
    const filtered = items.filter(query, (item, q) => item.includes(q));

    expect(selected.get()).toBe("b");
    expect(filtered.get()).toEqual(["a"]);
    index.set(2);
    query.set("");
    expect(selected.get()).toBe("c");
    expect(filtered.get()).toEqual(["a", "b", "c"]);

    id.dispose();
    label.dispose();
    selected.dispose();
    filtered.dispose();
  });

  it("creates conditions from signal equality checks", () => {
    const mode = sig("view");

    enterScope();
    const condition = mode.eq("edit");
    const label = condition.select("editing", "viewing");
    const disposers = exitScope();

    expect(condition.get()).toBe(false);
    expect(label.get()).toBe("viewing");
    mode.set("edit");
    expect(condition.get()).toBe(true);
    expect(label.get()).toBe("editing");

    for (const dispose of disposers) dispose();
  });
});
