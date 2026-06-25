import { describe, expect, it } from "vitest";
import { batch, derive, effect, is_reactive, resolve, sig, untrack } from "./core";
import { enter_scope, exit_scope, has_scope } from "./scope";

describe("core helpers", () => {
  it("resolves plain, signal, derive, and function values", () => {
    const source = sig(2);
    const doubled = derive(() => source.get() * 2);

    expect(resolve(1)).toBe(1);
    expect(resolve(source)).toBe(2);
    expect(resolve(doubled)).toBe(4);
    expect(resolve(() => 5)).toBe(5);

    expect(is_reactive(source)).toBe(true);
    expect(is_reactive(doubled)).toBe(true);
    expect(is_reactive(() => 5)).toBe(true);
    expect(is_reactive(5)).toBe(false);

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
    expect(has_scope()).toBe(false);

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
    inputValue.from_input()({ target: input } as unknown as Event);
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

    enter_scope();
    const condition = mode.eq("edit");
    const label = condition.select("editing", "viewing");
    const disposers = exit_scope();

    expect(condition.get()).toBe(false);
    expect(label.get()).toBe("viewing");
    mode.set("edit");
    expect(condition.get()).toBe(true);
    expect(label.get()).toBe("editing");

    for (const dispose of disposers) dispose();
  });
});
