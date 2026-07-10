import { ChevronDown, Settings } from "lucide";
import { describe, expect, it } from "vitest";
import { icon, type IconNode } from "./icons";

describe("lucide icon helper", () => {
  it("creates SVG icons from explicitly imported Lucide nodes", () => {
    const chevron = icon(ChevronDown, 16, 1.5);
    const settings = icon(Settings);

    expect(chevron.className).toBe("vrui-icon");
    expect(chevron.querySelector("svg")).not.toBeNull();
    expect(chevron.querySelector("svg")?.getAttribute("width")).toBe("16");
    expect(chevron.querySelector("svg")?.getAttribute("height")).toBe("16");
    expect(chevron.querySelector("svg")?.getAttribute("stroke-width")).toBe("1.5");
    expect(chevron.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(chevron.querySelector("svg")?.getAttribute("focusable")).toBe("false");
    expect(settings.querySelector("svg")).not.toBeNull();
    expect(settings.querySelector("svg")?.getAttribute("width")).toBe("12");
    expect(settings.querySelector("svg")?.getAttribute("height")).toBe("12");
    expect(settings.querySelector("svg")?.getAttribute("stroke-width")).toBe("2");
  });

  it("exposes the Lucide IconNode type", () => {
    const node: IconNode = ChevronDown;
    expect(icon(node).querySelector("svg")).not.toBeNull();

    if (false) {
      // @ts-expect-error Icons must be explicitly imported Lucide nodes.
      icon("ChevronDown");
    }
  });
});
