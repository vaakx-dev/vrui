import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  event,
  eventNameFromProp,
  keys,
  prevent,
  preventThen,
  stop,
  stopThen,
  type EventNameFromProp,
  type EventProps,
} from "./events";

describe("event props", () => {
  it("maps snakeCase props to browser event names", () => {
    expect(eventNameFromProp("onClick")).toBe("click");
    expect(eventNameFromProp("onBeforeInput")).toBe("beforeinput");
    expect(eventNameFromProp("onPointerDown")).toBe("pointerdown");
    expect(eventNameFromProp("onGotPointerCapture")).toBe("gotpointercapture");
    expect(eventNameFromProp("onSecurityPolicyViolation"))
      .toBe("securitypolicyviolation");
  });

  it("keeps the type-level and runtime name mappings aligned", () => {
    expectTypeOf<EventNameFromProp<"onPointerRawUpdate">>()
      .toEqualTypeOf<"pointerrawupdate">();
    expectTypeOf<EventNameFromProp<"onTransitionEnd">>()
      .toEqualTypeOf<"transitionend">();
  });

  it("infers specific event types", () => {
    type InputProps = EventProps<HTMLInputElement>;
    type SelectProps = EventProps<HTMLSelectElement>;

    expectTypeOf<Parameters<NonNullable<InputProps["onClick"]>>[0]>()
      .toEqualTypeOf<MouseEvent>();
    expectTypeOf<Parameters<NonNullable<InputProps["onKeyDown"]>>[0]>()
      .toEqualTypeOf<KeyboardEvent>();
    expectTypeOf<Parameters<NonNullable<InputProps["onPointerMove"]>>[0]>()
      .toEqualTypeOf<PointerEvent>();
    expectTypeOf<Parameters<NonNullable<InputProps["onInput"]>>[0]>()
      .toEqualTypeOf<InputEvent>();
    expectTypeOf<Parameters<NonNullable<SelectProps["onInput"]>>[0]>()
      .toEqualTypeOf<Event>();
  });

  it("rejects unsupported and misspelled props", () => {
    const props: EventProps<HTMLButtonElement> = {
      onClick: (event) => void event.clientX,
      // @ts-expect-error Misspelled declarative events are not supported.
      onClik: () => undefined,
    };

    expect(props.onClick).toBeTypeOf("function");
  });
});

describe("event helpers", () => {
  it("provides stop and prevent handlers", () => {
    const click = new MouseEvent("click", { cancelable: true });
    const stopSpy = vi.spyOn(click, "stopPropagation");

    stop(click);
    prevent(click);

    expect(stopSpy).toHaveBeenCalledOnce();
    expect(click.defaultPrevented).toBe(true);
  });

  it("wraps handlers with stop/prevent behavior", () => {
    const submit = new Event("submit", { bubbles: true, cancelable: true });
    let calls = 0;

    preventThen<Event>(() => {
      calls++;
    })(submit);

    expect(calls).toBe(1);
    expect(submit.defaultPrevented).toBe(true);

    const click = new MouseEvent("click", { bubbles: true });
    const wrapped = stopThen<MouseEvent>(() => {
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
    const stopSpy = vi.spyOn(enter, "stopPropagation");

    handler(enter);
    handler(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      repeat: true,
    }));

    expect(handled).toBe(1);
    expect(stopSpy).toHaveBeenCalledOnce();
  });
});
