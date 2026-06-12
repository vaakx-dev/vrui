import { describe, expect, it } from "vitest";
import { enter_scope, exit_scope, has_scope, register_in_scope } from "./scope";

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
});
