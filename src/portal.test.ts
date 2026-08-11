import { describe, expect, it } from "vitest";
import { effect, sig } from "./core";
import { div, span } from "./elements";
import { portal } from "./portal";
import { enterScope, exitScope } from "./scope";

const flushMutationObserver = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("portal", () => {
  it("returns a comment marker and mounts children into the target", () => {
    const target = div();
    const marker = portal(target, span("one"), span("two"));

    expect(marker.nodeType).toBe(Node.COMMENT_NODE);
    expect(marker.nodeValue).toBe("vrui portal");
    expect(target.textContent).toBe("onetwo");
    expect(target.children).toHaveLength(2);
  });

  it("removes portaled nodes and scoped effects when the surrounding scope is disposed", () => {
    const target = div();
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    enterScope();
    portal(target, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      return span({ id: "portaled" });
    });
    const disposers = exitScope();

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

  it("defers id targets until the element exists", async () => {
    const marker = portal("vrui-portal-target", span("portaled"));
    const target = div({ id: "vrui-portal-target" });

    document.body.appendChild(target);
    await flushMutationObserver();

    expect(marker.nodeType).toBe(Node.COMMENT_NODE);
    expect(target.textContent).toBe("portaled");

    target.remove();
  });

  it("mounts existing id targets synchronously", () => {
    const target = div({ id: "vrui-existing-portal-target" });
    document.body.appendChild(target);

    try {
      portal("vrui-existing-portal-target", span("portaled"));
      expect(target.textContent).toBe("portaled");
    } finally {
      target.remove();
    }
  });

  it("cancels deferred id target mounts when the marker disconnects", async () => {
    const host = div();
    const marker = portal("vrui-cancelled-portal-target", span("never mounted"));
    host.appendChild(marker);
    document.body.appendChild(host);

    host.remove();
    await flushMutationObserver();

    const target = div({ id: "vrui-cancelled-portal-target" });
    document.body.appendChild(target);
    await flushMutationObserver();

    expect(target.textContent).toBe("");

    target.remove();
  });

  it("cleans up when the marker disconnects", async () => {
    const target = div();
    const host = div();
    const child = span();
    document.body.append(target, host);

    const marker = portal(target, child);
    host.appendChild(marker);

    expect(child.parentNode).toBe(target);

    host.remove();
    await flushMutationObserver();

    expect(child.parentNode).toBeNull();

    target.remove();
  });

  it("cleans scoped work when the target disconnects", async () => {
    const target = div();
    const host = div();
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    document.body.append(target, host);
    const marker = portal(target, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      return span("portaled");
    });
    host.appendChild(marker);

    expect(runs).toBe(1);

    target.remove();
    await flushMutationObserver();

    expect(cleanups).toBe(1);

    source.set(1);
    expect(runs).toBe(1);

    host.remove();
    await flushMutationObserver();
    expect(cleanups).toBe(1);
  });

  it("cleans scoped work when a portaled child disconnects", async () => {
    const target = div();
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    document.body.appendChild(target);
    portal(target, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      return span("portaled");
    });

    expect(runs).toBe(1);

    target.firstChild?.remove();
    await flushMutationObserver();

    expect(cleanups).toBe(1);

    source.set(1);
    expect(runs).toBe(1);

    target.remove();
  });
});
