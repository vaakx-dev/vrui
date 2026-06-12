import { describe, expect, it } from "vitest";
import { sig } from "./core";
import { circle, rect, svg, svg_el, text_el } from "./svg";

describe("svg factories", () => {
  it("creates namespaced elements with attributes and children", () => {
    const node = svg({ width: 10, height: 20 }, rect({ x: 1, y: 2, width: 3, height: 4 }));

    expect(node.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(node.getAttribute("width")).toBe("10");
    expect(node.getAttribute("height")).toBe("20");
    expect(node.firstElementChild?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(node.firstElementChild?.getAttribute("x")).toBe("1");
  });

  it("applies refs, events, text, class, and reactive attributes", () => {
    const radius = sig(4);
    const label = sig("start");
    const cls = sig("ready");
    let clicks = 0;
    let ref: SVGElement | null = null;

    const node = circle({
      ref: (el: SVGElement) => {
        ref = el;
      },
      r: radius,
      text: label,
      class: cls,
      on_click: () => {
        clicks++;
      },
    });

    expect(ref).toBe(node);
    expect(node.getAttribute("r")).toBe("4");
    expect(node.textContent).toBe("start");
    expect(node.getAttribute("class")).toBe("ready");

    node.dispatchEvent(new MouseEvent("click"));
    expect(clicks).toBe(1);

    radius.set(8);
    label.set("done");
    cls.set("active");

    expect(node.getAttribute("r")).toBe("8");
    expect(node.textContent).toBe("done");
    expect(node.getAttribute("class")).toBe("active");
  });

  it("updates nested reactive class parts", () => {
    const active = sig(true);
    const node = circle({ class: ["dot", { active, hidden: false }] });

    expect(node.getAttribute("class")).toBe("dot active");

    active.set(false);
    expect(node.getAttribute("class")).toBe("dot");
  });

  it("removes nullish attributes and normalizes common camelCase names", () => {
    const radius = sig<number | null>(4);
    const label = sig<string | undefined>("marker");
    const node = circle({
      r: radius,
      "aria-label": label,
      role: "img",
      strokeWidth: 2,
    });
    const empty = rect({ x: null, y: undefined });

    expect(node.getAttribute("r")).toBe("4");
    expect(node.getAttribute("aria-label")).toBe("marker");
    expect(node.getAttribute("role")).toBe("img");
    expect(node.getAttribute("stroke-width")).toBe("2");
    expect(node.hasAttribute("strokeWidth")).toBe(false);
    expect(empty.hasAttribute("x")).toBe(false);
    expect(empty.hasAttribute("y")).toBe(false);

    radius.set(null);
    label.set(undefined);

    expect(node.hasAttribute("r")).toBe(false);
    expect(node.hasAttribute("aria-label")).toBe(false);
  });

  it("allows omitted props and reactive text children", () => {
    const label = sig("hello");
    const node = svg_el("g", text_el(null, label));

    expect(node.localName).toBe("g");
    expect(node.textContent).toBe("hello");

    label.set("world");
    expect(node.textContent).toBe("world");
  });
});
