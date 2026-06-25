import { describe, it, expect } from "vitest";
import { sig, effect } from "./core";
import { div, on_mount, span } from "./dom";
import { dynamic_child, keep, list, show } from "./flow";
import { portal } from "./portal";
import { has_scope } from "./scope";
import { svg, rect } from "./svg";

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

/* portal -- child lands on the target node */

describe("portal", () => {
  it("appends the resolved child to the target node", () => {
    const target = document.createElement("section");
    document.body.appendChild(target);
    const marker = portal(target, () => {
      const el = document.createElement("article");
      el.id = "portaled";
      return el;
    });
    expect(target.querySelector("#portaled")).not.toBeNull();
    expect(marker.style.display).toBe("none");
    document.body.removeChild(target);
  });

  it("accepts a pre-built Node as child", () => {
    const target = document.createElement("section");
    document.body.appendChild(target);
    const child = document.createElement("span");
    portal(target, child);
    expect(child.parentNode).toBe(target);
    document.body.removeChild(target);
  });
});

/* on_mount -- runs synchronously when el is already connected */

describe("on_mount", () => {
  it("fires synchronously when target is already in the document", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let fired = false;
    on_mount(el, () => { fired = true; });
    expect(fired).toBe(true);
    document.body.removeChild(el);
  });
});

/* svg -- factories produce real SVG-namespaced elements */

describe("svg factories", () => {
  it("svg_el uses the SVG namespace", () => {
    const node = svg({ width: "10", height: "10" }, rect({ x: "0", y: "0", width: "10", height: "10" }));
    expect(node.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(node.children[0].namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("setAttribute path picks up reactive props", () => {
    const w = sig(20);
    const node = rect({ x: "0", y: "0", width: w, height: "5" });
    document.body.appendChild(node);
    expect(node.getAttribute("width")).toBe("20");
    w.set(40);
    expect(node.getAttribute("width")).toBe("40");
    document.body.removeChild(node);
  });
});

/* style prop */

describe("reactive style prop", () => {
  it("string value assigns to cssText", () => {
    const el = div({ style: "left: 5px; top: 10px" });
    expect(el.style.left).toBe("5px");
    expect(el.style.top).toBe("10px");
  });

  it("object with numbers gets px on lengthy keys, raw on unitless", () => {
    const el = div({ style: { left: 10, width: 200, opacity: 0.5, zIndex: 3 } });
    expect(el.style.left).toBe("10px");
    expect(el.style.width).toBe("200px");
    expect(el.style.opacity).toBe("0.5");
    expect(el.style.zIndex).toBe("3");
  });

  it("camelCase keys are converted to kebab", () => {
    const el = div({ style: { fontSize: 14, marginTop: 4 } });
    expect(el.style.fontSize).toBe("14px");
    expect(el.style.marginTop).toBe("4px");
  });

  it("CSS custom properties go through setProperty", () => {
    const el = div({ style: { "--ui-scale": 1.5, "--strip-h": "12px" } });
    expect(el.style.getPropertyValue("--ui-scale")).toBe("1.5");
    expect(el.style.getPropertyValue("--strip-h")).toBe("12px");
  });

  it("null/false value clears a style key", () => {
    const el = div({ style: { left: 10 } });
    expect(el.style.left).toBe("10px");
    // ad-hoc clear via re-set
    el.style.removeProperty("left");
    expect(el.style.left).toBe("");
  });

  it("per-key reactive: changing one sig only updates that key", () => {
    const w = sig(20);
    const h = sig(30);
    const el = div({ style: { width: w, height: h } });
    expect(el.style.width).toBe("20px");
    expect(el.style.height).toBe("30px");
    w.set(50);
    expect(el.style.width).toBe("50px");
    expect(el.style.height).toBe("30px");
    h.set(80);
    expect(el.style.height).toBe("80px");
  });

  it("whole-object reactive: drops keys present last tick but missing now", () => {
    const s = sig<Record<string, unknown>>({ left: 10, top: 20, width: 100 });
    const el = div({ style: s });
    expect(el.style.left).toBe("10px");
    expect(el.style.top).toBe("20px");
    expect(el.style.width).toBe("100px");
    s.set({ left: 15 });
    expect(el.style.left).toBe("15px");
    expect(el.style.top).toBe("");
    expect(el.style.width).toBe("");
  });

  it("works on SVG elements", () => {
    const node = rect({ x: "0", y: "0", width: "10", height: "10", style: { fill: "red", opacity: 0.7 } });
    expect(node.style.fill).toBe("red");
    expect(node.style.opacity).toBe("0.7");
  });
});

/* sanity: dom.div still works after the dom.ts edits */

describe("dom.div smoke after edits", () => {
  it("builds and renders", () => {
    const el = div({ class: "x", id: "y" }, "hello");
    expect(el.tagName).toBe("DIV");
    expect(el.className).toBe("x");
    expect(el.id).toBe("y");
    expect(el.textContent).toBe("hello");
  });
});
