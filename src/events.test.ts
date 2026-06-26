import { describe, expect, it, vi } from "vitest";
import { event, keys, prevent, prevent_then, stop, stop_then } from "./events";

describe("event helpers", () => {
  it("provides stop and prevent handlers", () => {
    const click = new MouseEvent("click", { cancelable: true });
    const stop_spy = vi.spyOn(click, "stopPropagation");

    stop(click);
    prevent(click);

    expect(stop_spy).toHaveBeenCalledOnce();
    expect(click.defaultPrevented).toBe(true);
  });

  it("wraps handlers with stop/prevent behavior", () => {
    const submit = new Event("submit", { bubbles: true, cancelable: true });
    let calls = 0;

    prevent_then<Event>(() => {
      calls++;
    })(submit);

    expect(calls).toBe(1);
    expect(submit.defaultPrevented).toBe(true);

    const click = new MouseEvent("click", { bubbles: true });
    const wrapped = stop_then<MouseEvent>(() => {
      calls++;
    });

    wrapped(click);
    expect(calls).toBe(2);
  });

  it("supports generic event options", () => {
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    let calls = 0;

    event<MouseEvent>(() => {
      calls++;
    }, { prevent: true, stop: true })(click);

    expect(calls).toBe(1);
    expect(click.defaultPrevented).toBe(true);
  });
});

describe("keys", () => {
  it("maps keyboard keys to handlers and prevents handled keys by default", () => {
    const seen: string[] = [];
    const handler = keys({
      Escape: () => seen.push("escape"),
      ArrowDown: (event) => seen.push(event.key),
    });

    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    handler(escape);

    const down = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      cancelable: true,
    });
    handler(down);

    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      cancelable: true,
    });
    handler(tab);

    expect(seen).toEqual(["escape", "ArrowDown"]);
    expect(escape.defaultPrevented).toBe(true);
    expect(down.defaultPrevented).toBe(true);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("can stop propagation and ignore repeated keydown events", () => {
    let handled = 0;

    const handler = keys({
      Enter: () => {
        handled++;
      },
    }, { repeat: false, stop: true });

    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    const stop_spy = vi.spyOn(enter, "stopPropagation");

    handler(enter);
    handler(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      repeat: true,
    }));

    expect(handled).toBe(1);
    expect(stop_spy).toHaveBeenCalledOnce();
  });
});
