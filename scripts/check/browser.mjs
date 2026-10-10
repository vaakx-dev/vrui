import { callsWithoutArguments, isAssigned, isCalled, isIdent, isMember, isPunct, receiverOf } from "./tokens.mjs";

const DOM_GLOBALS = new Set([
  "document", "window", "navigator", "localStorage", "sessionStorage",
  "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "getComputedStyle", "customElements",
  "DocumentFragment", "ShadowRoot", "ResizeObserver", "IntersectionObserver", "MutationObserver",
  "KeyboardEvent", "PointerEvent", "MouseEvent", "FocusEvent", "DragEvent", "WheelEvent", "TouchEvent", "InputEvent", "ClipboardEvent",
]);
const ELEMENT_TYPE = /^(HTML|SVG)\w*Element$/;

export function importsModule(tokens, modules) {
  return tokens.some((token, index) => {
    if (token.type !== "string" || !modules.some((name) => token.value === name || token.value.startsWith(`${name}/`))) return false;
    const before = tokens[index - 1];
    return isIdent(before, "from") || isIdent(before, "import") || (isPunct(before, "(") && isIdent(tokens[index - 2], "import"));
  });
}

const isDomName = (token) => token.type === "ident" && (DOM_GLOBALS.has(token.value) || ELEMENT_TYPE.test(token.value));
const DECLARES = new Set(["const", "let", "var", "function", "class"]);

// Whether tokens[index] declares or names a key rather than reading a global:
// `const window =`, `(window: Limit)`, `window => ...`, `{ document: ... }`, `[window = id]`.
function isBinding(tokens, index) {
  const before = tokens[index - 1];
  const after = tokens[index + 1];
  return DECLARES.has(before?.value) && before.type === "ident" ||
    isPunct(after, ":") || isPunct(after, "=>") || (isPunct(after, "?") && isPunct(tokens[index + 2], ":")) ||
    (isPunct(before, "(") && isPunct(after, ")") && isPunct(tokens[index + 2], "=>")) ||
    (isPunct(after, "=") && ["[", ",", "{"].some((open) => isPunct(before, open)));
}

// A DOM global read as a value or type, not as a property, behind `typeof`, or shadowed by a local of the same name.
export function touchesDom(tokens) {
  const shadowed = new Set(tokens.filter((token, index) => isDomName(token) && isBinding(tokens, index)).map((token) => token.value));
  return tokens.some((token, index) =>
    isDomName(token) && !shadowed.has(token.value) && !isMember(tokens, index) && !isIdent(tokens[index - 1], "typeof"));
}

const GLOBAL_RECEIVERS = new Set([undefined, "window", "globalThis", "self"]);

const TIMERS = new Map([
  ["setTimeout", "onTimeout(fn, ms), owned by the active scope or an owner node"],
  ["setInterval", "onInterval(fn, ms), owned by the active scope or an owner node"],
  ["requestAnimationFrame", "onRaf(fn), owned by the active scope or an owner node"],
  ["queueMicrotask", "onTimeout(fn), which the owning scope cancels"],
  ["clearTimeout", "the disposer onTimeout returns"],
  ["clearInterval", "the disposer onInterval returns"],
  ["cancelAnimationFrame", "the disposer onRaf returns"],
]);

const TREE = new Set([
  "append", "prepend", "before", "after", "insertBefore", "replaceChildren", "replaceWith",
  "appendChild", "insertAdjacentElement", "insertAdjacentHTML", "insertAdjacentText",
]);
const DETACH = new Set(["removeChild", "replaceChild"]);
const CREATE = new Map([
  ["createElement", "a typed factory such as div or button, or el(tag)"],
  ["createElementNS", "svg or svgEl(tag)"],
  ["createTextNode", "a string or reactive child"],
  ["createDocumentFragment", "an array of children"],
]);
const ATTRIBUTES = new Set(["setAttribute", "removeAttribute", "toggleAttribute", "setAttributeNS", "removeAttributeNS"]);
const CONTENT = new Map([
  ["className", "a reactive class prop"],
  ["innerHTML", "VRUI factories and children"],
  ["outerHTML", "VRUI factories and children"],
  ["textContent", "a reactive child or text prop"],
  ["innerText", "a reactive child or text prop"],
]);
const OBSERVERS = new Map([
  ["ResizeObserver", "resizeObserver(owner, fn)"],
  ["IntersectionObserver", "intersectionObserver(owner, fn)"],
  ["MutationObserver", "onMount or onDisconnect for node lifetimes, or a focused integrations module"],
]);
const NOT_NODES = /^(form|formData|data|body|params|searchParams|query|search|headers|url)$/i;

// The typed factories VRUI exports for HTML tags; keep in sync with src/elements.ts.
export const FACTORY_TAGS = new Set([
  "a", "article", "aside", "button", "canvas", "dd", "details", "dialog", "div", "dl", "dt", "em",
  "fieldset", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "img", "input", "label",
  "legend", "li", "main", "nav", "ol", "option", "p", "section", "select", "small", "span", "strong",
  "summary", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "tr", "ul",
]);

function listenerRoute(receiver) {
  if (receiver === "document") return "onDocument(owner, event, handler)";
  if (GLOBAL_RECEIVERS.has(receiver)) return "onWindow(owner, event, handler)";
  return "an on* prop on the VRUI element, or onTarget(owner, target, event, handler) or listen(target, event, handler)";
}

// Variables the file builds as FormData, URLSearchParams or Headers, whose append() is not DOM work.
function nonNodeNames(tokens) {
  const names = new Set();
  tokens.forEach((token, index) => {
    if (isIdent(token, "new") && ["FormData", "URLSearchParams", "Headers"].includes(tokens[index + 1]?.value) &&
      isPunct(tokens[index - 1], "=") && isIdent(tokens[index - 2])) names.add(tokens[index - 2].value);
  });
  return names;
}

// Browser work in a browser file that VRUI owns; each finding is { start, rule, message }.
export function browserFindings(tokens) {
  const findings = [];
  const notNodes = nonNodeNames(tokens);
  const add = (token, rule, message) => findings.push({ start: token.start, rule, message });

  tokens.forEach((token, index) => {
    if (token.type !== "ident") return;
    const name = token.value;
    const member = isMember(tokens, index);
    const receiver = receiverOf(tokens, index);
    const called = isCalled(tokens, index);
    const global = !member || GLOBAL_RECEIVERS.has(receiver) && receiver !== undefined;

    if (called && name === "addEventListener") {
      add(token, "listener", `${receiver ? `${receiver}.` : ""}addEventListener() is never removed with its owner; use ${listenerRoute(receiver)}`);
    } else if (called && name === "removeEventListener") {
      add(token, "listener", "removeEventListener() pairs a hand-rolled listener; call the disposer that listen, onTarget, onWindow or onDocument returns");
    } else if (member && /^on[a-z]{3,}$/.test(name) && isAssigned(tokens, index)) {
      add(token, "on-prop", `assigning .${name} holds one untracked handler; use listen(target, "${name.slice(2)}", handler), or the event prop on a VRUI element`);
    } else if (member && called && TREE.has(name) && !(name === "append" && (NOT_NODES.test(receiver ?? "") || notNodes.has(receiver)))) {
      add(token, "dom-tree", `.${name}() edits the DOM by hand; pass children to a VRUI factory, or use a reactive child, show, dynamicChild, list or portal`);
    } else if (member && ((name === "remove" && callsWithoutArguments(tokens, index)) || (called && DETACH.has(name)))) {
      add(token, "dom-tree", `.${name}() edits the DOM by hand; render the node with show, dynamicChild or list, or call its mount's disposer`);
    } else if (member && called && CREATE.has(name)) {
      add(token, "create-element", `${name}() bypasses VRUI; use ${CREATE.get(name)}`);
    } else if (member && called && name === "getElementById" && receiver === "document") {
      add(token, "create-element", "document.getElementById() bypasses VRUI; use byId(id)");
    } else if (member && called && ATTRIBUTES.has(name)) {
      add(token, "attribute", `.${name}() bypasses VRUI; use a reactive prop: data-*, aria-*, role or the element property`);
    } else if (member && name === "classList") {
      add(token, "class-list", ".classList bypasses VRUI's class handling; use a reactive class prop such as class: { active: isActive }");
    } else if (member && receiver === "style" && (called || isAssigned(tokens, index))) {
      add(token, "style-write", `.style.${name}${called ? "()" : " ="} bypasses VRUI; use a reactive style prop or a utility class`);
    } else if (member && name === "style" && isAssigned(tokens, index)) {
      add(token, "style-write", "assigning .style bypasses VRUI; use a reactive style prop or a utility class");
    } else if (member && CONTENT.has(name) && isAssigned(tokens, index)) {
      add(token, "content", `assigning .${name} bypasses VRUI; use ${CONTENT.get(name)}`);
    } else if (isIdent(tokens[index - 1], "new") && OBSERVERS.has(name)) {
      add(token, "observer", `new ${name}() is never disconnected with its owner; use ${OBSERVERS.get(name)}`);
    } else if (global && called && TIMERS.has(name)) {
      const why = /^(clear|cancel)/.test(name) ? "pairs a hand-rolled timer" : "keeps running after its owner is gone";
      add(token, "timer", `${name}() ${why}; use ${TIMERS.get(name)}`);
    } else if (global && called && name === "matchMedia") {
      add(token, "match-media", "matchMedia() is read by hand; use media(query) for a reactive match, or onMedia(query, fn)");
    } else if (global && (name === "localStorage" || name === "sessionStorage") && !isPunct(tokens[index + 1], ":")) {
      add(token, "storage", `${name} is used by hand; use stored(key, fallback) for persisted state, or keep raw storage in a focused integrations module`);
    } else if (!member && called && name === "el" && tokens[index + 2]?.type === "string" && FACTORY_TAGS.has(tokens[index + 2].value)) {
      const tag = tokens[index + 2].value;
      add(token, "factory", `el("${tag}") has a typed factory; use ${tag}(props, ...children)`);
    }
  });
  return findings;
}
