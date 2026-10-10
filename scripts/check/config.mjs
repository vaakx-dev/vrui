import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The nearest package.json with a "vrui" block, searching up from `cwd`.
// Its folder is the root that config paths and report paths are relative to.
export function findConfig(cwd) {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      const config = JSON.parse(readFileSync(manifest, "utf8")).vrui;
      if (config && typeof config === "object") return { root: dir, config: normalize(config) };
    }
    if (dirname(dir) === dir) return { root: cwd, config: normalize({}) };
  }
}

function normalize(config) {
  return {
    check: config.check ?? ["src"],
    classes: config.classes ?? [],
    roles: config.roles ?? [],
    ui: config.ui ?? ["@vaakx-dev/vrui"],
    browser: config.browser ?? [],
    shapes: config.shapes ?? "tree",
  };
}

// Converts a path glob (`*`, `**`, `?`) to a regex over "/"-separated relative paths.
export function globRegex(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      const slash = glob[index + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      index += slash ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}
