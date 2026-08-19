import { beforeEach, describe, expect, it } from "vitest";
import { sig } from "./core";
import { button, div } from "./elements";
import { mount } from "./mount";
import {
  checkPatterns,
  checkUtilities,
  findPatterns,
  patterns,
} from "./utilities/patterns";
import { theme, themes } from "./utilities/theme";

function utilityCss(): string {
  return document.head
    .querySelector<HTMLStyleElement>("style[data-vrui-utilities]")
    ?.textContent ?? "";
}

describe("runtime utilities", () => {
  beforeEach(() => {
    document.head
      .querySelector<HTMLStyleElement>("style[data-vrui-utilities]")
      ?.remove();
  });

  it("generates rules from fixed utility scales", () => {
    const node = button({
      class: "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
    });

    expect(node.className).toContain("px-4");
    expect(utilityCss()).toContain(".inline-flex{display:inline-flex}");
    expect(utilityCss()).toContain(".gap-2{gap:0.5rem}");
    expect(utilityCss()).toContain(".px-4{padding-inline:1rem}");
    expect(utilityCss()).toContain(".rounded-md{border-radius:0.375rem}");
    expect(utilityCss()).toContain(".text-sm{font-size:0.875rem;line-height:1.25rem}");
  });

  it("supports state and responsive variants", () => {
    div({ class: "hover:bg-blue-700 focus-visible:ring-2 dark:bg-blue-700 md:px-6" });

    expect(utilityCss()).toContain(".hover\\:bg-blue-700:hover");
    expect(utilityCss()).toContain(".focus-visible\\:ring-2:focus-visible");
    expect(utilityCss()).toContain(
      ".dark\\:bg-blue-700:where([data-vrui-mode=\"dark\"], [data-vrui-mode=\"dark\"] *)",
    );
    expect(utilityCss()).toContain("@media (min-width:48rem){.md\\:px-6");
  });

  it("registers utilities introduced by reactive classes", () => {
    const classes = sig("p-2");
    const node = div({ class: classes });

    expect(node.className).toBe("p-2");
    expect(utilityCss()).toContain(".p-2{padding:0.5rem}");

    classes.set("p-4");

    expect(node.className).toBe("p-4");
    expect(utilityCss()).toContain(".p-4{padding:1rem}");
  });

  it("keeps external classes and rejects arbitrary values", () => {
    expect(div({ class: "project-card" }).className).toBe("project-card");
    expect(() => div({ class: "w-[13px]" })).toThrow(
      "vrui: arbitrary utility values are not supported: w-[13px]",
    );
  });

  it("inserts each utility once", () => {
    div({ class: "flex p-4" });
    div({ class: "flex p-4" });

    expect(utilityCss().match(/\.p-4\{/g)).toHaveLength(1);
  });
});

describe("color themes", () => {
  it("applies semantic color palettes at the mount boundary", () => {
    const target = div();
    const colors = theme({ accent: "blue", neutral: "slate" });
    const stop = mount(
      target,
      { theme: colors, mode: "dark" },
      button({ class: "bg-accent-600 text-neutral-50" }, "Save"),
    );

    expect(target.style.getPropertyValue("--vrui-color-accent-600")).toBe("#2563eb");
    expect(target.style.getPropertyValue("--vrui-color-neutral-50")).toBe("#f8fafc");
    expect(target.dataset.vruiMode).toBe("dark");
    expect(utilityCss()).toContain("background-color:var(--vrui-color-accent-600)");

    stop();

    expect(target.style.getPropertyValue("--vrui-color-accent-600")).toBe("");
    expect(target.hasAttribute("data-vrui-mode")).toBe(false);
  });

  it("provides explicit built-in color themes", () => {
    expect(themes.indigo.colors.accent["600"]).toBe("#4f46e5");
    expect(themes.blue.colors.neutral["900"]).toBe("#0f172a");
    expect(themes.violet.colors.danger["500"]).toBe("#ef4444");
  });
});

describe("utility patterns", () => {
  it("registers searchable nested patterns and expands them on elements", () => {
    const ui = patterns({
      testAction: {
        primary: "inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white",
      },
    });

    const node = button({ class: ui.testAction.primary }, "Save");
    const found = findPatterns("testAction");

    expect(node.className).toContain("vrui-pattern:testAction.primary");
    expect(node.className).toContain("bg-blue-600");
    expect(found).toEqual([
      {
        classes: "inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white",
        name: "testAction.primary",
        token: "vrui-pattern:testAction.primary",
      },
    ]);
  });

  it("rejects unknown utilities inside patterns", () => {
    expect(() => patterns({ brokenTestPattern: "p-4 typo-class" })).toThrow(
      "vrui: unknown utility in pattern brokenTestPattern: typo-class",
    );
    expect(() => patterns({ brokenColorPattern: "bg-blu-600" })).toThrow(
      "vrui: unknown utility in pattern brokenColorPattern: bg-blu-600",
    );
  });

  it("reports repeated raw utility combinations", () => {
    const root = div(
      button({ class: "inline-flex rounded-md px-4 py-2" }, "One"),
      button({ class: "inline-flex rounded-md px-4 py-2" }, "Two"),
    );

    expect(checkUtilities(root)).toEqual([
      expect.objectContaining({
        count: 2,
        kind: "repeated-utilities",
        tag: "button",
      }),
    ]);
  });

  it("does not report repeated registered patterns as raw one-offs", () => {
    const ui = patterns({
      auditAction: "inline-flex rounded-md bg-blue-600 px-4 py-2 text-white",
    });
    const root = div(
      button({ class: ui.auditAction }, "One"),
      button({ class: ui.auditAction }, "Two"),
    );

    expect(checkUtilities(root)).toEqual([]);
  });

  it("reports raw combinations that drift by one utility", () => {
    const root = div(
      button({ class: "inline-flex items-center rounded-md px-4 py-2" }, "One"),
      button({ class: "inline-flex items-center rounded-md px-3 py-2" }, "Two"),
    );

    expect(checkUtilities(root)).toEqual([
      expect.objectContaining({
        kind: "similar-utilities",
        tag: "button",
      }),
    ]);
  });

  it("reports unknown classes only in strict mode", () => {
    const root = div({ class: "project-card" });

    expect(checkUtilities(root)).toEqual([]);
    expect(checkUtilities(root, { strict: true })).toEqual([
      expect.objectContaining({
        classes: "project-card",
        kind: "unknown-classes",
        tag: "div",
      }),
    ]);
  });

  it("finds duplicate pattern definitions", () => {
    patterns({
      duplicateTest: {
        first: "flex items-center gap-2",
        second: "flex items-center gap-2",
      },
    });

    expect(checkPatterns()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "duplicate-patterns",
        patterns: ["duplicateTest.first", "duplicateTest.second"],
      }),
    ]));
  });
});
