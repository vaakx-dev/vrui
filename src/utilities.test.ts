import { beforeEach, describe, expect, it } from "vitest";
import { sig } from "./core";
import { button, div } from "./elements";
import { mount } from "./mount";
import { colorValue, colorVar } from "./utilities/colors";
import { isUtility } from "./utilities/compiler";
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
      class: "inline-flex h-px w-px items-center gap-2 rounded-md border-b px-4 py-2 text-sm font-semibold",
    });

    expect(node.className).toContain("px-4");
    expect(utilityCss()).toContain(".inline-flex{display:inline-flex}");
    expect(utilityCss()).toContain(".gap-2{gap:0.5rem}");
    expect(utilityCss()).toContain(".px-4{padding-inline:1rem}");
    expect(utilityCss()).toContain(".h-px{height:1px}");
    expect(utilityCss()).toContain(".w-px{width:1px}");
    expect(utilityCss()).toContain(".border-b{border-width:0px;border-bottom-width:1px}");
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
    expect(utilityCss()).toContain(".border-b{border-width:0px;border-bottom-width:1px}");
    expect(utilityCss()).toContain(".accent-blue-600{accent-color:#2563eb}");
    expect(utilityCss()).toContain(".w-64{width:16rem}");
    expect(utilityCss()).toContain(".max-w-3xl{max-width:48rem}");
    expect(utilityCss()).toContain(".mx-auto{margin-inline:auto}");
    expect(utilityCss()).toContain(".font-sans{font-family:ui-sans-serif");
  });

  it("places positioned elements with the spacing scale", () => {
    div({ class: "absolute top-0 right-2 bottom-px left-auto top-full inset-x-4 inset-y-0" });

    expect(utilityCss()).toContain(".top-0{top:0px}");
    expect(utilityCss()).toContain(".right-2{right:0.5rem}");
    expect(utilityCss()).toContain(".bottom-px{bottom:1px}");
    expect(utilityCss()).toContain(".left-auto{left:auto}");
    expect(utilityCss()).toContain(".top-full{top:100%}");
    expect(utilityCss()).toContain(".inset-x-4{left:1rem;right:1rem}");
    expect(utilityCss()).toContain(".inset-y-0{top:0px;bottom:0px}");
    expect(isUtility("top-7")).toBe(false);
    expect(isUtility("py-px")).toBe(true);
    expect(isUtility("gap-x-px")).toBe(true);
    expect(isUtility("md:hover:top-2")).toBe(true);
  });

  it("supports the 1.5 spacing step", () => {
    div({ class: "gap-1.5 h-1.5 w-1.5 -top-1.5 -mt-1.5 translate-x-1.5" });

    expect(utilityCss()).toContain(".gap-1\\.5{gap:0.375rem}");
    expect(utilityCss()).toContain(".h-1\\.5{height:0.375rem}");
    expect(utilityCss()).toContain(".w-1\\.5{width:0.375rem}");
    expect(utilityCss()).toContain(".-top-1\\.5{top:-0.375rem}");
    expect(utilityCss()).toContain(".-mt-1\\.5{margin-top:-0.375rem}");
    expect(isUtility("px-1.5")).toBe(true);
    expect(isUtility("gap-2.5")).toBe(false);
    expect(isUtility("p-1.")).toBe(false);
  });

  it("supports text, scrolling, transform and animation utilities", () => {
    div({
      class: "font-mono tabular-nums whitespace-pre-wrap wrap-anywhere break-words line-clamp-2 resize-none overscroll-contain overflow-x-auto overflow-y-hidden scrollbar-none rotate-90 -rotate-90 rounded-t-lg rounded-b animate-spin",
    });

    expect(utilityCss()).toContain(".font-mono{font-family:ui-monospace");
    expect(utilityCss()).toContain(".tabular-nums{font-variant-numeric:tabular-nums}");
    expect(utilityCss()).toContain(".whitespace-pre-wrap{white-space:pre-wrap}");
    expect(utilityCss()).toContain(".wrap-anywhere{overflow-wrap:anywhere}");
    expect(utilityCss()).toContain(".line-clamp-2{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}");
    expect(utilityCss()).toContain(".overflow-x-auto{overflow-x:auto}");
    expect(utilityCss()).toContain(".scrollbar-none{scrollbar-width:none}.scrollbar-none::-webkit-scrollbar{display:none}");
    expect(utilityCss()).toContain(".-rotate-90{rotate:-90deg}");
    expect(utilityCss()).toContain(".rounded-t-lg{border-top-left-radius:0.5rem;border-top-right-radius:0.5rem}");
    expect(utilityCss()).toContain(".rounded-b{border-bottom-right-radius:0.375rem;border-bottom-left-radius:0.375rem}");
    expect(utilityCss()).toContain("@keyframes vrui-spin{to{transform:rotate(360deg)}}.animate-spin{animation:vrui-spin 1s linear infinite}");
    expect(isUtility("rounded-tl")).toBe(false);
    expect(isUtility("line-clamp-7")).toBe(false);
  });

  it("places and sizes with fractions and negative offsets", () => {
    div({ class: "absolute top-1/2 -left-1 max-w-1/2 w-2/3 -mt-1 -mx-px aspect-square object-cover object-top-left" });

    expect(utilityCss()).toContain(".top-1\\/2{top:50%}");
    expect(utilityCss()).toContain(".-left-1{left:-0.25rem}");
    expect(utilityCss()).toContain(".max-w-1\\/2{max-width:50%}");
    expect(utilityCss()).toContain(".w-2\\/3{width:66.666667%}");
    expect(utilityCss()).toContain(".-mt-1{margin-top:-0.25rem}");
    expect(utilityCss()).toContain(".-mx-px{margin-inline:-1px}");
    expect(utilityCss()).toContain(".aspect-square{aspect-ratio:1 / 1}");
    expect(utilityCss()).toContain(".object-cover{object-fit:cover}");
    expect(utilityCss()).toContain(".object-top-left{object-position:top left}");
    expect(isUtility("-p-1")).toBe(false);
    expect(isUtility("-top-auto")).toBe(false);
    expect(isUtility("w-1/5")).toBe(false);
  });

  it("translates on its own property so translate composes with rotate", () => {
    div({ class: "translate-x-1/2 -translate-y-1/2 rotate-45 md:-translate-x-4" });

    expect(utilityCss()).toContain(
      "@property --vrui-translate-x{syntax:\"*\";inherits:false}.translate-x-1\\/2{--vrui-translate-x:50%;translate:var(--vrui-translate-x, 0) var(--vrui-translate-y, 0)}",
    );
    expect(utilityCss()).toContain(".-translate-y-1\\/2{--vrui-translate-y:-50%;");
    expect(utilityCss()).toContain("@property --vrui-translate-x{syntax:\"*\";inherits:false}@media (min-width:48rem){.md\\:-translate-x-4{--vrui-translate-x:-1rem;");
    expect(utilityCss()).toContain(".rotate-45{rotate:45deg}");
  });

  it("supports type, cursor, ring, blur and accessibility utilities", () => {
    div({ class: "leading-none leading-6 tracking-wide cursor-grabbing ring-inset ring-2 backdrop-blur sr-only md:not-sr-only" });

    expect(utilityCss()).toContain(".leading-none{line-height:1}");
    expect(utilityCss()).toContain(".leading-6{line-height:1.5rem}");
    expect(utilityCss()).toContain(".tracking-wide{letter-spacing:0.025em}");
    expect(utilityCss()).toContain(".cursor-grabbing{cursor:grabbing}");
    expect(utilityCss()).toContain(".ring-inset{--vrui-ring-inset:inset}");
    expect(utilityCss()).toContain(".ring-2{--vrui-ring-shadow:var(--vrui-ring-inset,) 0 0 0 2px var(--vrui-ring-color, currentColor);");
    expect(utilityCss()).toContain(".backdrop-blur{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}");
    expect(utilityCss()).toContain(".sr-only{position:absolute;width:1px;height:1px;");
    expect(utilityCss()).toContain(".md\\:not-sr-only{position:static;");
  });

  it("lets leading override the line height a text size sets", () => {
    div({ class: "leading-6 text-sm" });

    expect(utilityCss().indexOf(".leading-6{")).toBeGreaterThan(utilityCss().indexOf(".text-sm{"));
  });

  it("fades colors and elements on the step-5 alpha scale", () => {
    div({ class: "opacity-60 bg-accent-500/20 text-neutral-400/5 border-blue-600/100 bg-white/10 ring-black/40" });

    expect(utilityCss()).toContain(".opacity-60{opacity:0.6}");
    expect(utilityCss()).toContain(".bg-accent-500\\/20{background-color:color-mix(in srgb, var(--vrui-color-accent-500) 20%, transparent)}");
    expect(utilityCss()).toContain(".text-neutral-400\\/5{color:color-mix(in srgb, var(--vrui-color-neutral-400) 5%, transparent)}");
    expect(utilityCss()).toContain(".border-blue-600\\/100{border-color:color-mix(in srgb, #2563eb 100%, transparent)}");
    expect(utilityCss()).toContain(".bg-white\\/10{background-color:rgb(255 255 255 / 0.1)}");
    expect(utilityCss()).toContain(".ring-black\\/40{--vrui-ring-color:rgb(0 0 0 / 0.4)}");
    expect(isUtility("opacity-7")).toBe(false);
    expect(isUtility("bg-accent-500/7")).toBe(false);
    expect(isUtility("bg-current/50")).toBe(false);
  });

  it("tunes transitions after the transition utility", () => {
    div({ class: "transition transition-transform duration-200 ease-out delay-75" });

    const css = utilityCss();
    expect(css).toContain(".transition{transition-property:color, background-color, border-color, box-shadow, opacity, transform, translate, rotate;transition-duration:150ms}");
    expect(css).toContain(".transition-transform{transition-property:transform, translate, rotate;transition-duration:150ms}");
    expect(css).toContain(".ease-out{transition-timing-function:cubic-bezier(0, 0, 0.2, 1)}");
    expect(css).toContain(".delay-75{transition-delay:75ms}");
    expect(css.indexOf(".duration-200{transition-duration:200ms}")).toBeGreaterThan(css.indexOf(".transition-transform{"));
  });

  it("supports group variants", () => {
    div({ class: "group" }, div({ class: "hidden group-hover:flex group-focus-within:opacity-100 focus-within:ring-2" }));

    expect(utilityCss()).toContain(".group:hover .group-hover\\:flex{display:flex}");
    expect(utilityCss()).toContain(".group:focus-within .group-focus-within\\:opacity-100{opacity:1}");
    expect(utilityCss()).toContain(".focus-within\\:ring-2:focus-within");
    expect(isUtility("group")).toBe(true);
    expect(isUtility("group-hover:group-focus:flex")).toBe(false);
    expect(isUtility("group-wobble:flex")).toBe(false);
  });

  it("writes the base rules before every utility", () => {
    div({ class: "border" });

    expect(utilityCss().startsWith("*,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}")).toBe(true);
    expect(utilityCss()).toContain("[data-vrui-mode=dark]{color-scheme:dark}");
    expect(utilityCss()).toContain("@media (prefers-reduced-motion:reduce){");
  });

  it("applies hover only on devices that can hover", () => {
    div({ class: "group" }, div({ class: "hover:bg-blue-700 group-hover:flex md:hover:px-6 focus:ring-2" }));

    expect(utilityCss()).toContain("@media (hover:hover){.hover\\:bg-blue-700:hover{");
    expect(utilityCss()).toContain("@media (hover:hover){.group:hover .group-hover\\:flex{display:flex}}");
    expect(utilityCss()).toContain("@media (min-width:48rem) and (hover:hover){.md\\:hover\\:px-6:hover{");
    expect(utilityCss()).toContain(".focus\\:ring-2:focus{");
  });

  it("supports touch, motion and keyboard focus variants", () => {
    div({ class: "group" }, div({ class: "opacity-0 touch:opacity-100 motion-reduce:hidden motion-safe:flex group-focus-visible-within:flex" }));

    const css = utilityCss();
    expect(css).toContain("@media (hover:none){.touch\\:opacity-100{opacity:1}}");
    expect(css).toContain("@media (prefers-reduced-motion:reduce){.motion-reduce\\:hidden{display:none}}");
    expect(css).toContain("@media (prefers-reduced-motion:no-preference){.motion-safe\\:flex{display:flex}}");
    expect(css).toContain(".group:is(:focus-visible, :has(:focus-visible)) .group-focus-visible-within\\:flex{display:flex}");
    expect(css.indexOf(".touch\\:opacity-100{")).toBeGreaterThan(css.indexOf(".opacity-0{"));
  });

  it("styles pseudo-elements and direct children", () => {
    div({ class: "placeholder:text-neutral-500 selection:bg-accent-500/40 marker:text-neutral-500 *:animate-fade" });

    const css = utilityCss();
    expect(css).toContain(".placeholder\\:text-neutral-500::placeholder{color:var(--vrui-color-neutral-500)}");
    expect(css).toContain(".selection\\:bg-accent-500\\/40::selection,.selection\\:bg-accent-500\\/40 *::selection{");
    expect(css).toContain(".marker\\:text-neutral-500::marker,.marker\\:text-neutral-500 *::marker{");
    expect(css).toContain(".\\*\\:animate-fade > *{animation:vrui-fade 300ms");
    div({ class: "*:first:rounded-t-xl" });
    expect(utilityCss()).toContain(".\\*\\:first\\:rounded-t-xl > *:first-child{border-top-left-radius:0.75rem;");
    expect(isUtility("placeholder:selection:flex")).toBe(false);
    expect(isUtility("*:placeholder:flex")).toBe(false);
    expect(isUtility("placeholder:scrollbar-none")).toBe(false);
  });

  it("supports entrance, shimmer, table, touch and type utilities", () => {
    div({
      class: "animate-rise animate-shimmer ease-spring border-dashed border-collapse align-top flow-root touch-none callout-none antialiased text-box-trim scrollbars-thin",
    });

    const css = utilityCss();
    expect(css).toContain("@keyframes vrui-rise{from{opacity:0;transform:translateY(8px)}}.animate-rise{animation:vrui-rise 250ms cubic-bezier(0.32, 0.72, 0, 1)}");
    expect(css).toContain("@keyframes vrui-shimmer{");
    expect(css).toContain(".animate-shimmer{-webkit-text-fill-color:transparent;");
    expect(css).toContain(".ease-spring{transition-timing-function:cubic-bezier(0.32, 0.72, 0, 1)}");
    expect(css).toContain(".border-dashed{border-style:dashed}");
    expect(css).toContain(".border-collapse{border-collapse:collapse}");
    expect(css).toContain(".align-top{vertical-align:top}");
    expect(css).toContain(".flow-root{display:flow-root}");
    expect(css).toContain(".touch-none{touch-action:none}");
    expect(css).toContain(".callout-none{-webkit-touch-callout:none}");
    expect(css).toContain(".antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}");
    expect(css).toContain(".text-box-trim{text-box:trim-both ex alphabetic}");
    expect(css).toContain(".scrollbars-thin{scrollbar-width:thin;");
    expect(css).toContain(".scrollbars-thin *{scrollbar-width:thin;");
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

  it("adds utilities to the mount target while mounted", () => {
    const target = div({ class: "page" });
    const stop = mount(target, { class: "bg-neutral-900 text-sm page" });

    expect(target.className).toBe("page bg-neutral-900 text-sm");
    expect(utilityCss()).toContain(".bg-neutral-900{");

    stop();

    expect(target.className).toBe("page");
  });

  it("exposes color values and role variables", () => {
    expect(colorVar("neutral", 900)).toBe("var(--vrui-color-neutral-900)");
    expect(colorValue("accent", 500)).toBe("var(--vrui-color-accent-500)");
    expect(colorValue("slate", "50")).toBe("#f8fafc");
    expect(colorValue("plum", 500)).toBeUndefined();
  });

  it("provides explicit built-in color themes", () => {
    expect(themes.indigo.colors.accent!["600"]).toBe("#4f46e5");
    expect(themes.blue.colors.neutral!["900"]).toBe("#0f172a");
    expect(themes.violet.colors.danger!["500"]).toBe("#ef4444");
  });
});
