import { describe, expect, it } from "vitest";
import { effect, sig } from "./core";
import { portal } from "./portal";
import { enter_scope, exit_scope } from "./scope";

const flushMutationObserver = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("portal", () => {
  it("removes the portaled node and scoped effects when the surrounding scope is disposed", () => {
    const target = document.createElement("section");
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    enter_scope();
    const marker = portal(target, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      const child = document.createElement("article");
      child.id = "portaled";
      return child;
    });
    const disposers = exit_scope();

    expect(marker.style.display).toBe("none");
    expect(target.querySelector("#portaled")).not.toBeNull();
    expect(runs).toBe(1);

    source.set(1);
    expect(runs).toBe(2);
    expect(cleanups).toBe(1);

    for (const dispose of disposers) dispose();

    expect(target.querySelector("#portaled")).toBeNull();
    expect(cleanups).toBe(2);

    source.set(2);
    expect(runs).toBe(2);
  });

  it("accepts an id target", () => {
    const target = document.createElement("section");
    target.id = "vrui-portal-target";
    const child = document.createElement("span");
    document.body.appendChild(target);

    try {
      portal("vrui-portal-target", child);
      expect(child.parentNode).toBe(target);
    } finally {
      target.remove();
    }
  });

  it("cleans up when the marker disconnects", async () => {
    const target = document.createElement("section");
    const host = document.createElement("div");
    const child = document.createElement("span");
    document.body.append(target, host);

    const marker = portal(target, child);
    host.appendChild(marker);

    expect(child.parentNode).toBe(target);

    host.remove();
    await flushMutationObserver();

    expect(child.parentNode).toBeNull();

    target.remove();
  });
});
