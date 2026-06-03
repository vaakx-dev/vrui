import { describe, expect, it } from "vitest";
import { sig } from "./core";
import { button, by_id, class_str, div, el, input, listen, mount, replace, safe_str, span } from "./dom";

describe("string and class helpers", () => {
  it("normalizes nullable strings and mixed class inputs", () => {
    const active = sig(true);

    expect(safe_str(null)).toBe("");
    expect(safe_str(0)).toBe("0");
    expect(class_str(["base", null, false, { active, hidden: false }, ["nested"]])).toBe("base active nested");

    active.set(false);
    expect(class_str({ active })).toBe("");
  });
});

describe("dom element factories", () => {
  it("applies props, events, refs, reactive text, and reactive attributes", () => {
    const label = sig("save");
    const active = sig(true);
    const disabled = sig(false);
    let clicks = 0;
    let ref: HTMLElement | null = null;

    const node = button(
      {
        ref: (el: HTMLElement) => {
          ref = el;
        },
        class: ["btn", { active }],
        text: label,
        disabled,
        "data-state": label,
        "aria-label": "Save",
        role: "button",
        on_click: () => {
          clicks++;
        },
      },
    );

    expect(ref).toBe(node);
    expect(node.className).toBe("btn active");
    expect(node.textContent).toBe("save");
    expect(node.dataset.state).toBe("save");
    expect(node.getAttribute("aria-label")).toBe("Save");
    expect(node.getAttribute("role")).toBe("button");
    expect((node as HTMLButtonElement).disabled).toBe(false);

    node.dispatchEvent(new MouseEvent("click"));
    expect(clicks).toBe(1);

    label.set("done");
    active.set(false);
    disabled.set(true);

    expect(node.textContent).toBe("done");
    expect(node.dataset.state).toBe("done");
    expect(node.className).toBe("btn");
    expect((node as HTMLButtonElement).disabled).toBe(true);
  });

  it("sets input values and appends nested static and reactive children", () => {
    const value = sig("first");
    const count = sig(1);
    const field = input({ value });
    const root = el("div", "Count: ", count, [span({ text: "!" })]);

    expect((field as HTMLInputElement).value).toBe("first");
    value.set("second");
    expect((field as HTMLInputElement).value).toBe("second");

    expect(root.textContent).toBe("Count: 1!");
    count.set(2);
    expect(root.textContent).toBe("Count: 2!");
  });

  it("returns a disposer from listen", () => {
    const target = new EventTarget();
    let calls = 0;

    const stop = listen(target, "ping", () => {
      calls++;
    });

    target.dispatchEvent(new Event("ping"));
    stop();
    target.dispatchEvent(new Event("ping"));

    expect(calls).toBe(1);
  });

  it("finds elements by id and throws when missing", () => {
    const target = div({ id: "vrui-test-target" });
    document.body.appendChild(target);

    try {
      expect(by_id("vrui-test-target")).toBe(target);
      expect(() => by_id("vrui-missing-target")).toThrow("vrui: missing element #vrui-missing-target");
    } finally {
      target.remove();
    }
  });

  it("mounts children into id targets and returns an unmount disposer", () => {
    const target = div({ id: "vrui-mount-target" });
    const count = sig(1);
    document.body.appendChild(target);

    try {
      const unmount = mount("vrui-mount-target", "Count: ", count, span("!"));

      expect(target.textContent).toBe("Count: 1!");
      count.set(2);
      expect(target.textContent).toBe("Count: 2!");

      unmount();
      expect(target.textContent).toBe("");

      count.set(3);
      expect(target.textContent).toBe("");
    } finally {
      target.remove();
    }
  });

  it("defers id target mounts until the element exists", async () => {
    const count = sig(1);
    const unmount = mount("vrui-deferred-target", "Count: ", count);
    const target = div({ id: "vrui-deferred-target" });

    document.body.appendChild(target);
    await Promise.resolve();

    expect(target.textContent).toBe("Count: 1");
    count.set(2);
    expect(target.textContent).toBe("Count: 2");

    unmount();
    expect(target.textContent).toBe("");

    target.remove();
  });

  it("cancels pending id target mounts", async () => {
    const unmount = mount("vrui-cancelled-target", "never mounted");
    unmount();

    const target = div({ id: "vrui-cancelled-target" });
    document.body.appendChild(target);
    await Promise.resolve();

    expect(target.textContent).toBe("");
    target.remove();
  });

  it("replaces old children with new children", () => {
    const target = div({ id: "vrui-replace-target" }, "old");
    document.body.appendChild(target);

    try {
      replace("vrui-replace-target", div("new"), span(" content"));

      expect(target.textContent).toBe("new content");
      expect(target.children).toHaveLength(2);
    } finally {
      target.remove();
    }
  });

  it("returns a replace disposer that removes mounted children", () => {
    const target = div();
    const stop = replace(target, "current", span(" child"));

    expect(target.textContent).toBe("current child");

    stop();
    expect(target.textContent).toBe("");
  });

  it("disposes prior replacement effects on second replace", () => {
    const target = div();
    const label = sig("old");
    let runs = 0;

    replace(target, () => {
      runs++;
      return label.get();
    });
    expect(target.textContent).toBe("old");
    expect(runs).toBe(1);

    replace(target, "new");
    label.set("changed");

    expect(target.textContent).toBe("new");
    expect(runs).toBe(1);
  });

  it("keeps newer replacements mounted when an old disposer is called", () => {
    const target = div();
    const first = replace(target, "first");
    replace(target, "second");

    first();

    expect(target.textContent).toBe("second");
  });

  it("shortcut factories build expected tags", () => {
    const node = div({ id: "root" }, span({ text: "child" }));

    expect(node.tagName).toBe("DIV");
    expect(node.id).toBe("root");
    expect(node.firstElementChild?.tagName).toBe("SPAN");
  });
});
