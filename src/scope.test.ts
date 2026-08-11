import { describe, expect, it } from "vitest";
import {
  collectScope,
  disposeAll,
  enterScope,
  exitScope,
  hasScope,
  once,
  registerInScope,
  scoped,
} from "./scope";

describe("scope stack", () => {
  it("collects disposers in the active scope", () => {
    const calls: string[] = [];

    registerInScope(() => calls.push("outside"));
    expect(hasScope()).toBe(false);

    enterScope();
    expect(hasScope()).toBe(true);
    registerInScope(() => calls.push("outer"));

    enterScope();
    registerInScope(() => calls.push("inner"));
    const inner = exitScope();

    expect(hasScope()).toBe(true);
    expect(calls).toEqual([]);

    for (const dispose of inner) dispose();
    expect(calls).toEqual(["inner"]);

    const outer = exitScope();
    expect(hasScope()).toBe(false);

    for (const dispose of outer) dispose();
    expect(calls).toEqual(["inner", "outer"]);
  });

  it("throws clearly when exiting without a matching enter", () => {
    expect(() => exitScope()).toThrow("vrui: exitScope called without matching enterScope");
  });

  it("collects scoped work and cleans up failed scopes", () => {
    const calls: string[] = [];

    const created = collectScope(() => {
      registerInScope(() => calls.push("ok"));
      return 42;
    });

    expect(created.value).toBe(42);
    expect(calls).toEqual([]);
    disposeAll(created.scope);
    expect(calls).toEqual(["ok"]);

    expect(() => collectScope(() => {
      registerInScope(() => calls.push("failed"));
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

    enterScope();
    const scopedDispose = scoped(once(() => calls.push("scoped")));
    scopedDispose();
    disposeAll(exitScope());

    expect(calls).toEqual(["once", "scoped"]);
  });

  it("attempts every disposer before reporting failures", () => {
    const first = new Error("first");
    const second = new Error("second");
    const calls: string[] = [];
    let thrown: unknown;

    try {
      disposeAll([
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
      collectScope(() => {
        registerInScope(() => {
          throw cleanup;
        });
        throw creation;
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([creation, cleanup]);
    expect(hasScope()).toBe(false);
  });
});
