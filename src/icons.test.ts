import { describe, expect, it, vi } from "vitest";
import { has_icon, icon, snake_to_pascal } from "./icons";

describe("lucide icon helper", () => {
  it("converts snake, kebab, and spaced names to PascalCase", () => {
    expect(snake_to_pascal("chevron_down")).toBe("ChevronDown");
    expect(snake_to_pascal("chevron-down")).toBe("ChevronDown");
    expect(snake_to_pascal("chevron down")).toBe("ChevronDown");
    expect(snake_to_pascal("  chevron__down-- ")).toBe("ChevronDown");
  });

  it("creates SVG icons from snake and kebab names", () => {
    const snake = icon("chevron_down", 16, 1.5);
    const kebab = icon("chevron-down");

    expect(snake.className).toBe("vrui-icon");
    expect(snake.querySelector("svg")).not.toBeNull();
    expect(snake.querySelector("svg")?.getAttribute("width")).toBe("16");
    expect(snake.querySelector("svg")?.getAttribute("height")).toBe("16");
    expect(snake.querySelector("svg")?.getAttribute("stroke-width")).toBe("1.5");
    expect(snake.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(snake.querySelector("svg")?.getAttribute("focusable")).toBe("false");
    expect(kebab.querySelector("svg")).not.toBeNull();
    expect(kebab.querySelector("svg")?.getAttribute("width")).toBe("12");
    expect(kebab.querySelector("svg")?.getAttribute("height")).toBe("12");
    expect(kebab.querySelector("svg")?.getAttribute("stroke-width")).toBe("2");
  });

  it("falls back for unknown icons", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const node = icon("not_a_real_icon");

    expect(node.className).toBe("vrui-icon");
    expect(node.textContent).toBe("?");
    expect(node.querySelector("svg")).toBeNull();
    expect(warn).toHaveBeenCalledWith("unknown lucide icon: not_a_real_icon");

    warn.mockRestore();
  });

  it("checks icon availability", () => {
    expect(has_icon("chevron_down")).toBe(true);
    expect(has_icon("chevron-down")).toBe(true);
    expect(has_icon("ChevronDown")).toBe(true);
    expect(has_icon("not_a_real_icon")).toBe(false);
  });

  it("creates SVG icons from direct Lucide export names", () => {
    const node = icon("ChevronDown");

    expect(node.querySelector("svg")).not.toBeNull();
  });
});
