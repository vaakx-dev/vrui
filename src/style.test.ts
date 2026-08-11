import { describe, expect, it } from "vitest";
import { sig } from "./core";
import type { StyleMap, StylePrimitive } from "./domTypes";
import { div } from "./elements";
import { rect } from "./svg";

describe("style bindings", () => {
  it("assigns CSS text", () => {
    const el = div({ style: "left: 5px; top: 10px" });
    expect(el.style.left).toBe("5px");
    expect(el.style.top).toBe("10px");
  });

  it("adds units only to dimensional numeric properties", () => {
    const el = div({ style: { left: 10, width: 200, opacity: 0.5, zIndex: 3 } });
    expect(el.style.left).toBe("10px");
    expect(el.style.width).toBe("200px");
    expect(el.style.opacity).toBe("0.5");
    expect(el.style.zIndex).toBe("3");
  });

  it("normalizes camel case and preserves custom properties", () => {
    const el = div({
      style: {
        fontSize: 14,
        marginTop: 4,
        "--ui-scale": 1.5,
        "--strip-h": "12px",
      },
    });

    expect(el.style.fontSize).toBe("14px");
    expect(el.style.marginTop).toBe("4px");
    expect(el.style.getPropertyValue("--ui-scale")).toBe("1.5");
    expect(el.style.getPropertyValue("--strip-h")).toBe("12px");
  });

  it("removes a key when its reactive value becomes empty", () => {
    const left = sig<StylePrimitive>(10);
    const el = div({ style: { left } });
    expect(el.style.left).toBe("10px");

    left.set(false);
    expect(el.style.left).toBe("");
  });

  it("updates per-key reactive values independently", () => {
    const width = sig(20);
    const height = sig(30);
    const el = div({ style: { width, height } });

    width.set(50);
    expect(el.style.width).toBe("50px");
    expect(el.style.height).toBe("30px");

    height.set(80);
    expect(el.style.height).toBe("80px");
  });

  it("clears missing keys from whole-object reactive values", () => {
    const styles = sig<StyleMap>({ left: 10, top: 20, width: 100 });
    const el = div({ style: styles });

    styles.set({ left: 15 });
    expect(el.style.left).toBe("15px");
    expect(el.style.top).toBe("");
    expect(el.style.width).toBe("");
  });

  it("applies styles to SVG elements", () => {
    const node = rect({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      style: { fill: "red", opacity: 0.7 },
    });

    expect(node.style.fill).toBe("red");
    expect(node.style.opacity).toBe("0.7");
  });
});
