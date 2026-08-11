import { describe, expect, it, vi } from "vitest";
import { sig } from "./core";
import type { StyleShape } from "./domTypes";
import {
  classStr,
  el,
  safeStr,
} from "./dom";
import {
  button,
  canvas,
  dialog,
  div,
  form,
  h3,
  input,
  label,
  option,
  select,
  span,
  table,
  tbody,
  td,
  textarea,
  tr,
} from "./elements";
import { listen } from "./lifecycle";
import { byId, mount, replace } from "./mount";

describe("string and class helpers", () => {
  it("normalizes nullable strings and mixed class inputs", () => {
    const active = sig(true);

    expect(safeStr(null)).toBe("");
    expect(safeStr(0)).toBe("0");
    expect(classStr(["base", null, false, { active, hidden: false }, ["nested"]])).toBe("base active nested");

    active.set(false);
    expect(classStr({ active })).toBe("");
  });

  it("does not require a global Node constructor for class helpers", () => {
    vi.stubGlobal("Node", undefined);
    try {
      expect(classStr(["base", { active: true, hidden: false }])).toBe("base active");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("dom element factories", () => {
  it("provides closed element-specific prop types", () => {
    button({
      disabled: sig(false),
      onClick: (event) => {
        const mouseEvent: MouseEvent = event;
        expect(mouseEvent.type).toBe("click");
      },
    }).click();

    if (false) {
      // @ts-expect-error Misspelled event props are rejected.
      button({ onClik: () => {} });
      // @ts-expect-error DOM property values retain their browser types.
      button({ disabled: "yes" });
      // @ts-expect-error Form bindings only belong on value elements.
      div({ bindValue: sig("") });
      // @ts-expect-error Checked bindings require a boolean signal.
      input({ bindChecked: sig("yes") });
      // @ts-expect-error Unknown DOM properties require an explicit escape hatch.
      div({ mysteryProperty: true });
      // @ts-expect-error Element methods are not assignable factory props.
      div({ focus: () => {} });
    }
  });

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
        onClick: () => {
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

  it("normalizes snake case pointer event props to browser event names", () => {
    const calls: string[] = [];
    const node = canvas({
      onPointerDown: () => {
        calls.push("down");
      },
      onPointerMove: () => {
        calls.push("move");
      },
      onPointerUp: () => {
        calls.push("up");
      },
      onPointerCancel: () => {
        calls.push("cancel");
      },
    });

    node.dispatchEvent(new Event("pointerdown"));
    node.dispatchEvent(new Event("pointermove"));
    node.dispatchEvent(new Event("pointerup"));
    node.dispatchEvent(new Event("pointercancel"));

    expect(calls).toEqual(["down", "move", "up", "cancel"]);
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

  it("binds input, textarea, select value, and checkbox checked state", () => {
    const name = sig("Ada");
    const field = input({ bindValue: name });

    expect(field.value).toBe("Ada");
    name.set("Grace");
    expect(field.value).toBe("Grace");
    field.value = "Katherine";
    field.dispatchEvent(new Event("input"));
    expect(name.get()).toBe("Katherine");

    const notes = sig("first");
    const area = textarea({ bindValue: notes });
    area.value = "updated";
    area.dispatchEvent(new Event("input"));
    expect(notes.get()).toBe("updated");

    const choice = sig("b");
    const menu = select(
      { bindValue: choice },
      option({ value: "a" }, "A"),
      option({ value: "b" }, "B"),
    );
    expect(menu.value).toBe("b");
    menu.value = "a";
    menu.dispatchEvent(new Event("change"));
    expect(choice.get()).toBe("a");

    const enabled = sig(false);
    const toggle = input({ type: "checkbox", bindChecked: enabled });
    expect(toggle.checked).toBe(false);
    enabled.set(true);
    expect(toggle.checked).toBe(true);
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    expect(enabled.get()).toBe(false);
  });

  it("exports common tag factories to avoid raw document.createElement usage", () => {
    const node = form(
      label("Name", input({ value: "Ada" })),
      h3("Rows"),
      table(tbody(tr(td("cell")))),
      canvas({ width: 100, height: 50 }),
      dialog("Dialog"),
    );

    expect(node.tagName).toBe("FORM");
    expect(node.querySelector("label input")).not.toBeNull();
    expect(node.querySelector("h3")?.textContent).toBe("Rows");
    expect(node.querySelector("td")?.textContent).toBe("cell");
    expect(node.querySelector("canvas")?.getAttribute("width")).toBe("100");
    expect(node.querySelector("dialog")?.textContent).toBe("Dialog");
  });

  it("clears stale cssText when whole reactive styles switch shape", () => {
    const styles = sig<StyleShape>("color: red; width: 12px;");
    const node = div({ style: styles });

    expect(node.style.color).toBe("red");
    expect(node.style.width).toBe("12px");

    styles.set({ height: 20, opacity: 0.5 });
    expect(node.style.color).toBe("");
    expect(node.style.width).toBe("");
    expect(node.style.height).toBe("20px");
    expect(node.style.opacity).toBe("0.5");

    styles.set(null);
    expect(node.style.cssText).toBe("");

    styles.set("margin-top: 3px;");
    expect(node.style.marginTop).toBe("3px");

    styles.set(undefined);
    expect(node.style.cssText).toBe("");
  });

  it("removes nullish data, aria, and role attributes", () => {
    const state = sig<string | null>("open");
    const label = sig<string | undefined>("Save");
    const role = sig<string | null>("button");
    const node = div({
      "data-state": state,
      "data-empty": null,
      "aria-label": label,
      "aria-hidden": undefined,
      role,
    });
    const emptyRole = div({ role: null });

    expect(node.getAttribute("data-state")).toBe("open");
    expect(node.hasAttribute("data-empty")).toBe(false);
    expect(node.getAttribute("aria-label")).toBe("Save");
    expect(node.hasAttribute("aria-hidden")).toBe(false);
    expect(node.getAttribute("role")).toBe("button");
    expect(emptyRole.hasAttribute("role")).toBe(false);

    state.set(null);
    label.set(undefined);
    role.set(null);

    expect(node.hasAttribute("data-state")).toBe(false);
    expect(node.hasAttribute("aria-label")).toBe(false);
    expect(node.hasAttribute("role")).toBe(false);
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
      expect(byId("vrui-test-target")).toBe(target);
      expect(() => byId("vrui-missing-target")).toThrow("vrui: missing element #vrui-missing-target");
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
