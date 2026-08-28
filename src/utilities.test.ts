import { beforeEach, describe, expect, it } from "vitest";
import { sig } from "./core";
import { button, div } from "./elements";
import { mount } from "./mount";
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
      class: "inline-flex h-px w-px items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
    });

    expect(node.className).toContain("px-4");
    expect(utilityCss()).toContain(".inline-flex{display:inline-flex}");
    expect(utilityCss()).toContain(".gap-2{gap:0.5rem}");
    expect(utilityCss()).toContain(".px-4{padding-inline:1rem}");
    expect(utilityCss()).toContain(".h-px{height:1px}");
    expect(utilityCss()).toContain(".w-px{width:1px}");
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

  it("supports layered application surfaces", () => {
    div({ class: "fixed inset-0 z-50 items-baseline bg-black/50" });

    expect(utilityCss()).toContain(".z-50{z-index:50}");
    expect(utilityCss()).toContain(".items-baseline{align-items:baseline}");
    expect(utilityCss()).toContain(".bg-black\\/50{background-color:rgb(0 0 0 / 0.5)}");
  });

  it("supports application shell and layout utilities", () => {
    div({
      class: "fixed inset-0 box-border flex flex-1 w-64 max-w-3xl mx-auto border-b border-solid accent-blue-600 font-sans list-none whitespace-nowrap",
    });

    expect(utilityCss()).toContain(".inset-0{inset:0px}");
    expect(utilityCss()).toContain(".flex-1{flex:1 1 0%}");
    expect(utilityCss()).toContain(".border-b{border-bottom-width:1px}");
    expect(utilityCss()).toContain(".accent-blue-600{accent-color:#2563eb}");
    expect(utilityCss()).toContain(".w-64{width:16rem}");
    expect(utilityCss()).toContain(".max-w-3xl{max-width:48rem}");
    expect(utilityCss()).toContain(".mx-auto{margin-inline:auto}");
    expect(utilityCss()).toContain(".font-sans{font-family:ui-sans-serif");
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
