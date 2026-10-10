import { describe, expect, it } from "vitest";
import * as vrui from "../../src/index";
import { el } from "../../src/dom";
import { FACTORY_TAGS } from "./browser.mjs";
import { globRegex } from "./config.mjs";
import { createInspector } from "./inspect.mjs";
import { repeatedShapes } from "./shapes.mjs";

const inspect = createInspector({
  isUtility: vrui.isUtility,
  allowed: new Set(["markdown"]),
  ui: ["@vaakx-dev/vrui"],
  browser: [globRegex("**/web/**")],
});

const UI = 'import { div } from "@vaakx-dev/vrui";\n';
const rules = (file, text) => inspect(file, text).findings.map((finding) => finding.rule);
const messages = (file, text) => inspect(file, text).findings.map((finding) => finding.message);

describe("vrui-check browser files", () => {
  it("treats ui imports, DOM globals and browser globs as browser code", () => {
    expect(inspect("src/a.ts", `${UI}const x = 1;`).browser).toBe(true);
    expect(inspect("src/a.ts", "document.body;").browser).toBe(true);
    expect(inspect("src/a.ts", "const f = (el: HTMLElement) => el;").browser).toBe(true);
    expect(inspect("src/web/a.ts", "const x = 1;").browser).toBe(true);
  });

  it("leaves server code, typeof guards and shadowed names alone", () => {
    expect(rules("src/a.ts", "setTimeout(run, 10); signal.addEventListener('abort', stop);")).toEqual([]);
    expect(inspect("src/a.ts", "if (typeof window !== 'undefined') run();").browser).toBe(false);
    expect(inspect("src/a.ts", "const left = (window: Limit) => window.used;").browser).toBe(false);
    expect(inspect("src/a.ts", "const document = parse(text); use(document);").browser).toBe(false);
  });
});

describe("vrui-check browser rules", () => {
  it("flags a toggle() whose handler is thrown away", () => {
    const wasted = `${UI}const a = { onClick: () => open.toggle() };\nif (x) state.open.toggle();\nconst f = () => { open.toggle(); };`;
    expect(rules("src/a.ts", wasted)).toEqual(["discarded-handler", "discarded-handler", "discarded-handler"]);
    const used = `${UI}const a = { onClick: open.toggle(), run: open.toggle() };\nopen.toggle()();`;
    expect(rules("src/a.ts", used)).toEqual([]);
  });

  it("flags listeners with the matching VRUI route", () => {
    const found = messages("src/a.ts", `${UI}window.addEventListener("resize", f);\ndocument.addEventListener("keydown", f);\nsocket.addEventListener("open", f);\nsocket.removeEventListener("open", f);`);
    expect(found[0]).toContain("onWindow");
    expect(found[1]).toContain("onDocument");
    expect(found[2]).toContain("listen(target, event, handler)");
    expect(found[3]).toContain("disposer");
  });

  it("flags handler properties", () => {
    expect(messages("src/a.ts", `${UI}socket.onmessage = (event) => read(event);`)[0]).toContain('listen(target, "message", handler)');
  });

  it("flags DOM tree edits but not FormData, URLSearchParams or remove with arguments", () => {
    expect(rules("src/a.ts", `${UI}parent.append(child); node.remove(); parent.insertBefore(a, b); node.replaceChildren();`)).toEqual(["dom-tree", "dom-tree", "dom-tree", "dom-tree"]);
    expect(rules("src/a.ts", `${UI}const body = new FormData(); body.append("a", "b"); const q = new URLSearchParams(); q.append("a", "b"); url.searchParams.append("a", "b"); set.remove(item);`)).toEqual([]);
  });

  it("flags attributes, class lists, styles and content writes", () => {
    expect(rules("src/a.ts", `${UI}node.setAttribute("a", "b"); node.classList.add("x"); node.style.top = "1px"; node.style.setProperty("--x", "1"); node.textContent = "x"; node.innerHTML += "x"; node.className = "x";`))
      .toEqual(["attribute", "class-list", "style-write", "style-write", "content", "content", "content"]);
  });

  it("flags observers, timers, media queries and storage", () => {
    expect(rules("src/a.ts", `${UI}new ResizeObserver(f); setTimeout(f, 1); window.setInterval(f, 1); clearTimeout(id); requestAnimationFrame(f); queueMicrotask(f); matchMedia("(x)"); localStorage.getItem("k");`))
      .toEqual(["observer", "timer", "timer", "timer", "timer", "timer", "match-media", "storage"]);
  });

  it("leaves method calls named like timers alone", () => {
    expect(rules("src/a.ts", `${UI}clock.setTimeout(f); scheduler.queueMicrotask(f);`)).toEqual([]);
  });

  it("flags el() for tags with a typed factory", () => {
    expect(messages("src/a.ts", `${UI}el("h2", "Title"); el("iframe", {});`)).toEqual(['el("h2") has a typed factory; use h2(props, ...children)']);
  });

  it("flags hidden placeholder elements", () => {
    expect(rules("src/a.ts", `${UI}show(open, () => span({ hidden: true })); dynamicChild(x, () => span({ hidden: true }, portal(document.body, layer)));`))
      .toEqual(["placeholder", "placeholder"]);
    expect(rules("src/a.ts", `${UI}span({ hidden: true }, "kept"); div({ hidden: open });`)).toEqual([]);
  });

  it("lists exactly the exported HTML factories", () => {
    for (const tag of FACTORY_TAGS) {
      const factory = vrui[tag];
      expect(typeof factory).toBe("function");
      expect(factory().tagName).toBe(el(tag).tagName);
    }
  });
});

describe("vrui-check classes", () => {
  it("checks class values, including complete words of templates", () => {
    expect(messages("src/a.ts", `div({ class: "flex p-7" });`)[0]).toContain('unknown class "p-7"');
    expect(messages("src/a.ts", "div({ class: `flex gap-7 ${open ? 'block' : 'hidden'} p-${size}` });")).toEqual([
      expect.stringContaining('unknown class "gap-7"'),
    ]);
    expect(rules("src/a.ts", `div({ class: "w-[13px]" });`)).toEqual(["arbitrary-value"]);
    expect(rules("src/a.ts", `div({ class: "markdown flex" });`)).toEqual([]);
  });

  it("checks class lists outside class keys in browser files", () => {
    expect(messages("src/a.ts", `${UI}const tones = { ok: "text-sucess-400", bad: "text-danger-500" };`)).toEqual([
      expect.stringContaining('unknown class "text-sucess-400"'),
    ]);
    expect(messages("src/a.ts", `${UI}const plain = "app-glass ring-neutral-700";`)[0]).toContain('unknown class "app-glass"');
    expect(rules("src/a.ts", `${UI}const labels = ["Show hidden", " more hidden", "flex-end", "text-input", "pointer-down"];`)).toEqual([]);
    expect(rules("src/a.ts", 'const tones = { ok: "text-sucess-400" };')).toEqual([]);
  });
});

describe("vrui-check styles", () => {
  it("flags fixed style values a utility covers", () => {
    expect(messages("src/a.ts", `div({ style: { top: "0", left: 0, bottom: "100%", width: size } });`)).toEqual([
      'style top: "0" duplicates the "top-0" utility; add "top-0" to class instead',
      'style left: 0 duplicates the "left-0" utility; add "left-0" to class instead',
      'style bottom: "100%" duplicates the "bottom-full" utility; add "bottom-full" to class instead',
    ]);
    expect(rules("src/a.ts", `div({ style: { top: "3px", transform: "none" } });`)).toEqual([]);
  });
});

describe("vrui-check shapes", () => {
  it("reports each repeated shape once, within its group", () => {
    const tokens = ["a", "b", "c", "d", "e", "f"];
    const found = repeatedShapes([
      { at: "x:1", group: "tree", tokens },
      { at: "y:1", group: "tree", tokens },
      { at: "z:1", group: "tree", tokens },
      { at: "w:1", group: "other", tokens },
    ]);
    expect(found.map((finding) => `${finding.at} ${finding.message}`)).toEqual([
      "y:1 repeats the class list at x:1; extract an app-owned VRUI component",
      "z:1 repeats the class list at x:1; extract an app-owned VRUI component",
    ]);
  });
});

describe("vrui-check globs", () => {
  it("matches path globs", () => {
    expect(globRegex("**/web/**").test("plugins/a/src/web/view.ts")).toBe(true);
    expect(globRegex("**/web/**").test("web/view.ts")).toBe(true);
    expect(globRegex("**/web/**").test("plugins/web-client/a.ts")).toBe(false);
    expect(globRegex("src/*.ts").test("src/a/b.ts")).toBe(false);
  });
});
