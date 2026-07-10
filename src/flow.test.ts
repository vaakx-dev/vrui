import { describe, it, expect } from "vitest";
import { sig, effect } from "./core";
import { button, div, span } from "./elements";
import { dynamic_child, keep, list, show } from "./flow";
import { has_scope } from "./scope";

/* dynamic_child -- one reactive child */

describe("dynamic_child", () => {
  it("uses a supplied container without adding another wrapper", () => {
    const current = sig("a");
    const container = span({ class: "slot" });

    const root = dynamic_child(current, (value) => div({ text: value }), container);

    expect(root).toBe(container);
    expect(root.className).toBe("slot");
    expect(root.children.length).toBe(1);
    expect(root.children[0].tagName).toBe("DIV");
    expect(root.textContent).toBe("a");
  });

  it("replaces the child when the signal changes", () => {
    const current = sig("a");
    const root = dynamic_child(current, (value) => div({ text: value }));
    const first = root.children[0];

    current.set("b");

    expect(root.children.length).toBe(1);
    expect(root.children[0]).not.toBe(first);
    expect(root.textContent).toBe("b");
  });

  it("does not replace the child when factory-local state changes", () => {
    const current = sig("a");
    const local = sig("rectangle");
    const root = dynamic_child(current, (value) => {
      local.get();
      return div({ text: value });
    });
    const first = root.children[0];

    local.set("arrow");

    expect(root.children[0]).toBe(first);
    expect(root.textContent).toBe("a");
  });

  it("updates reactive child props without replacing the child", () => {
    const current = sig("a");
    const label = sig("first");
    const root = dynamic_child(current, (value) => div({ "data-mode": value }, label));
    const first = root.children[0];

    label.set("second");

    expect(root.children[0]).toBe(first);
    expect(root.textContent).toBe("second");
  });

  it("recreates factory-local state when the driving signal changes", () => {
    const current = sig("a");
    const root = dynamic_child(current, (value) => {
      const count = sig(0);

      return div(
        div("Mode: ", value),
        div("Count: ", count),
        button({ on_click: () => count.update((n) => n + 1) }, "Increment"),
      );
    });

    const first = root.children[0];
    first.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    expect(first.textContent).toContain("Count: 1");

    current.set("b");

    expect(root.children[0]).not.toBe(first);
    expect(root.textContent).toContain("Mode: b");
    expect(root.textContent).toContain("Count: 0");
  });

  it("runs scoped cleanup when the child is replaced and disconnected", async () => {
    const current = sig("a");
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    const root = dynamic_child(current, (value) => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      return div({ text: value });
    });

    document.body.appendChild(root);
    expect(runs).toBe(1);

    source.set(1);
    expect(runs).toBe(2);
    expect(cleanups).toBe(1);

    current.set("b");
    expect(runs).toBe(3);
    expect(cleanups).toBe(2);
    expect(root.textContent).toBe("b");

    document.body.removeChild(root);
    await Promise.resolve();
    expect(cleanups).toBe(3);

    source.set(2);
    expect(runs).toBe(3);
  });
});

/* list -- row scope owns nested cleanups */

describe("list keyed reconciliation", () => {
  it("reuses rows by key when the array reorders", () => {
    const data = sig<{ id: string }[]>([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const root = list(data, (it) => it.id, (item) => {
      const el = document.createElement("div");
      el.dataset.id = item.get().id;
      return el;
    });
    const aBefore = root.querySelector('[data-id="a"]');
    const bBefore = root.querySelector('[data-id="b"]');
    data.set([{ id: "b" }, { id: "a" }, { id: "c" }]);
    expect(root.querySelector('[data-id="a"]')).toBe(aBefore);
    expect(root.querySelector('[data-id="b"]')).toBe(bBefore);
    expect(root.children[0]).toBe(bBefore);
    expect(root.children[1]).toBe(aBefore);
  });

  it("disposes a row's nested effects when the row is evicted", () => {
    const data = sig<{ id: string }[]>([{ id: "a" }, { id: "b" }]);
    let runs = 0;
    let disposes = 0;
    list(data, (it) => it.id, (item) => {
      effect(() => {
        item.get();
        runs++;
        return () => { disposes++; };
      });
      return document.createElement("div");
    });
    expect(runs).toBe(2);
    expect(disposes).toBe(0);
    data.set([{ id: "a" }]);
    expect(disposes).toBeGreaterThanOrEqual(1);
  });

  it("cleans row scope and balances scopes when a row factory throws", () => {
    const data = sig([{ id: "a" }]);
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    expect(() => list(data, (it) => it.id, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      throw new Error("row failed");
    })).toThrow("row failed");

    expect(runs).toBe(1);
    expect(cleanups).toBe(1);
    expect(has_scope()).toBe(false);

    source.set(1);
    expect(runs).toBe(1);
  });

  it("batches reused row item and index updates", () => {
    const data = sig([
      { id: "a", label: "old-a" },
      { id: "b", label: "old-b" },
    ]);
    const seen: string[] = [];

    list(data, (it) => it.id, (item, idx) => {
      effect(() => {
        seen.push(`${item.get().label}:${idx.get()}`);
      });
      return document.createElement("div");
    });

    seen.length = 0;
    data.set([
      { id: "b", label: "new-b" },
      { id: "a", label: "new-a" },
    ]);

    expect(seen).toEqual(["new-b:0", "new-a:1"]);
  });
});

/* show -- node is mounted only while visible */

describe("show", () => {
  it("builds lazily and disposes scoped work on hide", () => {
    const visible = sig(false);
    const source = sig(0);
    let builds = 0;
    let runs = 0;
    let cleanups = 0;

    const wrapper = show(visible, () => {
      builds++;
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      return div({ text: "shown" });
    });

    expect(builds).toBe(0);
    expect(wrapper.children.length).toBe(0);

    visible.set(true);
    expect(builds).toBe(1);
    expect(wrapper.textContent).toBe("shown");
    expect(runs).toBe(1);

    source.set(1);
    expect(runs).toBe(2);
    expect(cleanups).toBe(1);

    visible.set(false);
    expect(wrapper.children.length).toBe(0);
    expect(cleanups).toBe(2);

    source.set(2);
    expect(runs).toBe(2);

    visible.set(true);
    expect(builds).toBe(2);
    expect(wrapper.textContent).toBe("shown");
  });

  it("cleans child scope and balances scopes when the factory throws", () => {
    const visible = sig(true);
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    expect(() => show(visible, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      throw new Error("show failed");
    })).toThrow("show failed");

    expect(runs).toBe(1);
    expect(cleanups).toBe(1);
    expect(has_scope()).toBe(false);

    source.set(1);
    expect(runs).toBe(1);
  });
});
/* keep -- node stays mounted, display toggles */

describe("keep", () => {
  it("builds once and toggles display on flips", () => {
    const visible = sig(false);
    let builds = 0;
    const wrapper = keep(visible, () => {
      builds++;
      const el = document.createElement("section");
      el.textContent = "kept";
      return el;
    });
    expect(builds).toBe(0);
    expect(wrapper.children.length).toBe(0);

    visible.set(true);
    expect(builds).toBe(1);
    expect(wrapper.children.length).toBe(1);
    expect((wrapper.children[0] as HTMLElement).style.display).toBe("");

    visible.set(false);
    expect(builds).toBe(1);
    expect((wrapper.children[0] as HTMLElement).style.display).toBe("none");

    visible.set(true);
    expect(builds).toBe(1);
    expect((wrapper.children[0] as HTMLElement).style.display).toBe("");
  });

  it("cleans child scope and balances scopes when the factory throws", () => {
    const visible = sig(true);
    const source = sig(0);
    let runs = 0;
    let cleanups = 0;

    expect(() => keep(visible, () => {
      effect(() => {
        source.get();
        runs++;
        return () => {
          cleanups++;
        };
      });
      throw new Error("keep failed");
    })).toThrow("keep failed");

    expect(runs).toBe(1);
    expect(cleanups).toBe(1);
    expect(has_scope()).toBe(false);

    source.set(1);
    expect(runs).toBe(1);
  });
});
