import { describe, expect, it } from "vitest";
import {
  collect_scope,
  dispose_all,
  enter_scope,
  exit_scope,
  has_scope,
  once,
  register_in_scope,
  scoped,
} from "./scope";

describe("scope stack", () => {
  it("collects disposers in the active scope", () => {
    const calls: string[] = [];

    register_in_scope(() => calls.push("outside"));
    expect(has_scope()).toBe(false);

    enter_scope();
    expect(has_scope()).toBe(true);
    register_in_scope(() => calls.push("outer"));

    enter_scope();
    register_in_scope(() => calls.push("inner"));
    const inner = exit_scope();

    expect(has_scope()).toBe(true);
    expect(calls).toEqual([]);

    for (const dispose of inner) dispose();
    expect(calls).toEqual(["inner"]);

    const outer = exit_scope();
    expect(has_scope()).toBe(false);

    for (const dispose of outer) dispose();
    expect(calls).toEqual(["inner", "outer"]);
  });

  it("throws clearly when exiting without a matching enter", () => {
    expect(() => exit_scope()).toThrow("vrui: exit_scope called without matching enter_scope");
  });

  it("collects scoped work and cleans up failed scopes", () => {
    const calls: string[] = [];

    const created = collect_scope(() => {
      register_in_scope(() => calls.push("ok"));
      return 42;
    });

    expect(created.value).toBe(42);
    expect(calls).toEqual([]);
    dispose_all(created.scope);
    expect(calls).toEqual(["ok"]);

    expect(() => collect_scope(() => {
      register_in_scope(() => calls.push("failed"));
      throw new Error("boom");
    })).toThrow("boom");
    expect(calls).toEqual(["ok", "failed"]);
  });

  it("wraps one-shot and scoped disposers", () => {
    const calls: string[] = [];
    const dispose = once(() => calls.push("once"));

    dispose();
    dispose();
    expect(calls).toEqual(["once"]);

    enter_scope();
    const scoped_dispose = scoped(once(() => calls.push("scoped")));
    scoped_dispose();
    dispose_all(exit_scope());

    expect(calls).toEqual(["once", "scoped"]);
  });

  it("attempts every disposer before reporting failures", () => {
    const first = new Error("first");
    const second = new Error("second");
    const calls: string[] = [];
    let thrown: unknown;

    try {
      dispose_all([
        () => {
          calls.push("first");
          throw first;
        },
        () => calls.push("middle"),
        () => {
          calls.push("second");
          throw second;
        },
      ]);
    } catch (err) {
      thrown = err;
    }

    expect(calls).toEqual(["first", "middle", "second"]);
    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([first, second]);
  });

  it("preserves scope and cleanup failures together", () => {
    const creation = new Error("creation");
    const cleanup = new Error("cleanup");
    let thrown: unknown;

    try {
      collect_scope(() => {
        register_in_scope(() => {
          throw cleanup;
        });
        throw creation;
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([creation, cleanup]);
    expect(has_scope()).toBe(false);
  });
});
