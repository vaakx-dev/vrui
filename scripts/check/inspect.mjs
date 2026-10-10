import { browserFindings, importsModule, touchesDom } from "./browser.mjs";
import { classChecker } from "./classes.mjs";
import { lex } from "./lex.mjs";
import { styleFindings } from "./style.mjs";

const PAGE_BODY = /^<div id="app"><\/div> <script type="module" src="[^"]+"><\/script>$/;

function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index++) if (text[index] === "\n") starts.push(index + 1);
  return starts;
}

function lineAt(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

function htmlFindings(text) {
  const body = /<body>([\s\S]*?)<\/body>/i.exec(text)?.[1]?.replace(/\s+/g, " ").trim();
  if (!body || PAGE_BODY.test(body)) return [];
  return [{ line: 1, rule: "html", message: "visible HTML in the page; HTML should only host #app and the module entry, build the view with VRUI" }];
}

// Checks one source file. `file` is its "/"-separated path relative to the config root.
// Returns findings as { line, rule, message } and class shapes as { line, tokens }.
export function createInspector({ isUtility, allowed, ui, browser }) {
  const classFindings = classChecker({ isUtility, allowed });

  return function inspect(file, text) {
    if (file.endsWith(".html")) return { findings: htmlFindings(text), shapes: [], browser: false };

    const tokens = lex(text);
    const isBrowser = importsModule(tokens, ui) || browser.some((glob) => glob.test(file)) || touchesDom(tokens);
    const classes = classFindings(tokens, { strings: isBrowser });
    const found = [...classes.findings, ...styleFindings(tokens), ...(isBrowser ? browserFindings(tokens) : [])];

    const starts = lineStarts(text);
    const findings = found
      .sort((left, right) => left.start - right.start)
      .map(({ start, rule, message }) => ({ line: lineAt(starts, start), rule, message }));
    const shapes = classes.shapes.map(({ start, tokens: names }) => ({ line: lineAt(starts, start), tokens: names }));
    return { findings, shapes, browser: isBrowser };
  };
}
