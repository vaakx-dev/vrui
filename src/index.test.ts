import { describe, expect, it } from "vitest";
import * as vrui from "./index";

describe("public index exports", () => {
  it("re-exports representative core, dom, flow, store, portal, and svg APIs", () => {
    const count = vrui.sig(1);
    const doubled = vrui.derive(() => count.get() * 2);
    const node = vrui.div({ class: "box" }, String(doubled.get()));
    const picture = vrui.svg({ width: 10 }, vrui.rect({ width: 10, height: 10 }));
    const state = vrui.store({ name: "Ada" });
    const target = document.createElement("section");
    const marker = vrui.portal(target, vrui.span({ text: "ported" }));

    expect(count.get()).toBe(1);
    expect(doubled.get()).toBe(2);
    expect(node.textContent).toBe("2");
    expect(picture.firstElementChild?.localName).toBe("rect");
    expect(state.name.get()).toBe("Ada");
    expect(marker.style.display).toBe("none");
    expect(target.textContent).toBe("ported");
    expect(typeof vrui.by_id).toBe("function");
    expect(typeof vrui.mount).toBe("function");
    expect(typeof vrui.show).toBe("function");
    expect(typeof vrui.list).toBe("function");
    expect(typeof vrui.keep).toBe("function");
    expect(typeof vrui.keys).toBe("function");
    expect(typeof vrui.prevent_then).toBe("function");
    expect(typeof vrui.on_interval).toBe("function");
    expect(typeof vrui.on_resize).toBe("function");
    expect(typeof vrui.form).toBe("function");
    expect(typeof vrui.textarea).toBe("function");
    expect(typeof vrui.table).toBe("function");
    expect(typeof vrui.collect_scope).toBe("function");
    expect(typeof vrui.dispose_all).toBe("function");
    expect(typeof vrui.once).toBe("function");

    doubled.dispose();
  });
});
