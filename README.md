# @vaakx-dev/vrui

Small DOM UI toolkit with signals, derived values, scoped cleanup, DOM/SVG factories, flow helpers, resources, portals, and Lucide icons.

## Overview

VRUI builds real DOM nodes directly. State lives in signals, reactive reads inside `effect` or factory props update the DOM, and cleanup is tied to scopes or node disconnects.

Use it when you want lightweight UI code without a virtual DOM or component runtime.

## Application code style

VRUI app code should read like a small UI language over the DOM. Prefer factories,
reactive props, bindings, flow helpers, and cleanup-aware event helpers before
reaching for raw browser APIs.

Prefer this:

```ts
import { div, keys, sig, stop } from "@vaakx-dev/vrui";

const open = sig(false);

const palette = div(
  {
    on_click: stop,
    on_keydown: keys({
      Escape: open.setter(false),
      Enter: run_selected,
      ArrowDown: () => move_selection(1),
      ArrowUp: () => move_selection(-1),
    }),
  },
  "Commands",
);
```

Avoid app-level code like this unless you are integrating a browser API,
third-party widget, canvas renderer, measurement, or another true escape hatch:

```ts
const palette = document.createElement("div");
palette.addEventListener("keydown", (event) => {
  event.preventDefault();
});
```

## Install, use, and imports

This package exports built ESM from `./dist/index.js` with TypeScript declarations from `./dist/index.d.ts` for browser-bundled apps.

```ts
import {
  batch,
  button,
  derive,
  div,
  effect,
  icon,
  mount,
  sig,
} from "@vaakx-dev/vrui";
```

Example mount:

```ts
import { button, div, mount, sig } from "@vaakx-dev/vrui";

const count = sig(0);

const app = div(
  { class: "counter" },
  button({ on_click: () => count.update((n) => n + 1) }, "Add"),
  " Count: ",
  count,
);

mount("app", app);
```

## Reactivity basics

Use `sig` for mutable state, `derive` for read-only computed state, `effect` for side effects, and `batch` to group updates so dependent effects run once.

```ts
import { batch, derive, effect, sig } from "@vaakx-dev/vrui";

const first = sig("Ada");
const last = sig("Lovelace");
const full = derive(() => `${first.get()} ${last.get()}`);

const stop = effect(() => {
  console.log(full.get());
});

batch(() => {
  first.set("Grace");
  last.set("Hopper");
});

stop();
```

Signals also include helpers such as `update`, `toggle`, `setter`, `from_input`, `map`, `eq`, `prop`, `or`, `index`, and `filter`.

## DOM factories and reactive props

Factories create DOM nodes: `div`, `span`, `button`, `input`, `form`, `label`, `textarea`, `select`, `option`, `a`, `img`, `dialog`, `canvas`, lists, headings through `h6`, table elements, sectioning elements, and semantic text helpers like `strong`, `em`, and `small`. Use `el(tag, props, ...children)` for custom or uncommon tags.

Props can be plain values or reactive values. `class`, `style`, `text`, `data-*`, `aria-*`, `role`, `value` on inputs, normal DOM properties, and children can all react to signals or derives. Event props use `on_event_name`, such as `on_click`, `on_input`, and `on_pointer_down`.

```ts
import { button, div, input, sig } from "@vaakx-dev/vrui";

const name = sig("Ada");
const enabled = sig(true);

const form = div(
  {
    class: ["panel", { active: enabled }],
    style: { opacity: enabled.map((v) => (v ? 1 : 0.5)) },
  },
  input({ bind_value: name }),
  button({ disabled: enabled.map((v) => !v), on_click: enabled.toggle() }, "Toggle"),
  "Hello ",
  name,
);
```

Boundary helpers include `by_id(id)` for required elements and `mount(target, ...children)` for app roots. `by_id(id)` throws if the element is missing. `mount("id", ...children)` accepts an element id string; if the element does not exist yet, mounting is deferred until the element appears in the document, and the returned disposer cancels the pending mount or unmounts the mounted children.

```ts
import { by_id, div, mount } from "@vaakx-dev/vrui";

const root = by_id("app");
mount(root, div("Hello"));
mount("sidebar", div("Tools"));
```

Lifecycle props and helpers include `ref`, `on_mount`, `on_disconnect`, `listen`, `on_window`, `on_document`, and `on_target`.

## Events and keyboard maps

Event props use `on_event_name`. Underscores after `on_` are removed when the browser event listener is registered, so `on_pointer_down` listens for `pointerdown`. VRUI includes helpers for common UI event
boilerplate:

```ts
import { button, div, keys, prevent_then, stop } from "@vaakx-dev/vrui";

const save_button = button({ on_click: prevent_then(save) }, "Save");

const palette = div({
  on_click: stop,
  on_keydown: keys({
    Escape: close_palette,
    Enter: run_selected,
    ArrowDown: () => move_selection(1),
    ArrowUp: () => move_selection(-1),
  }),
});
```

`keys(map)` handles only mapped keys and prevents their default browser action
by default. Use options when needed:

```ts
keys({ Enter: submit }, { prevent: false });
keys({ Escape: close }, { stop: true, repeat: false });
```

Available helpers are `stop`, `prevent`, `stop_then(fn)`,
`prevent_then(fn)`, `event(fn, options)`, and `keys(map, options)`.

## Form bindings

Use bindings for common form state:

```ts
import { input, option, select, sig, textarea } from "@vaakx-dev/vrui";

const name = sig("Ada");
const enabled = sig(false);
const role = sig("admin");

input({ bind_value: name });
textarea({ bind_value: name });
input({ type: "checkbox", bind_checked: enabled });
select(
  { bind_value: role },
  option({ value: "admin" }, "Admin"),
  option({ value: "viewer" }, "Viewer"),
);
```

## Browser side effects

Use cleanup-aware helpers for common browser side effects:

```ts
import {
  div,
  on_interval,
  on_media,
  on_resize,
  resize_observer,
} from "@vaakx-dev/vrui";

const panel = div({
  on_mount: (el) => {
    on_resize(el, recalc_layout);
    resize_observer(el as Element, recalc_panel);
    on_interval(refresh, 30_000);
    on_media("(prefers-reduced-motion: reduce)", (matches) => {
      reduced_motion.set(matches);
    });
  },
});
```

Available helpers are `on_timeout`, `on_interval`, `on_raf`, `on_resize`,
`on_media`, `resize_observer`, and `intersection_observer`.

## Runtime and input caveats

VRUI is browser DOM code. It expects globals such as `document`, `window`, `Node`, and `MutationObserver`; SSR, workers, and non-browser runtimes need a DOM shim or a separate client-only entry point.

Text children and the `text` prop are assigned through text nodes or `textContent`, so they do not parse HTML. Props are otherwise applied directly to DOM properties, attributes, styles, or event listeners. Do not pass untrusted prop objects, prop names, event handlers, URLs, style strings, or HTML-bearing properties such as `innerHTML` unless your application has validated or sanitized them first.

## Flow helpers

`dynamic_child` replaces one child when its input value changes. The child factory is built without tracking incidental signal reads, so local child state does not cause a remount. `show` lazily creates a node when a condition is true and disposes it when hidden. `keep` also creates lazily, but keeps the node mounted and toggles display. `list` renders keyed arrays and reuses rows by key.

```ts
import { button, derive, div, dynamic_child, keep, li, list, show, sig, ul } from "@vaakx-dev/vrui";

const open = sig(false);
const mode = sig("summary");
const items = sig([
  { id: 1, label: "Alpha" },
  { id: 2, label: "Beta" },
]);

const view = div(
  button({ on_click: open.toggle() }, "Toggle"),
  dynamic_child(mode, (value) => div(value)),
  show(open, () => div("Visible only while open")),
  keep(open, () => div("State is kept while hidden")),
  list(items, (item) => item.id, (item, idx) => {
    const label = derive(() => `${idx.get() + 1}. ${item.get().label}`);
    return li(label);
  }, ul()),
);
```

## Store and resource basics

`store` wraps object fields as signals. Reading a property returns a `Sig` for that field.

```ts
import { div, input, store } from "@vaakx-dev/vrui";

const user = store({ name: "Ada", visits: 1 });

const profile = div(
  input({ value: user.name, on_input: user.name.from_input() }),
  "Visits: ",
  user.visits,
);

user.visits.update((n) => n + 1);
```

`resource` runs an async fetcher, exposes `data`, `loading`, `error`, `refetch`, and `dispose`, and passes an `AbortSignal` to cancel stale requests.

```ts
import { button, div, resource, show } from "@vaakx-dev/vrui";

const users = resource((signal) =>
  fetch("/api/users", { signal }).then((res) => res.json()),
);

const panel = div(
  button({ on_click: users.refetch }, "Reload"),
  show(users.loading, () => div("Loading...")),
  show(users.error.map(Boolean), () => div("Could not load users")),
  users.data.map((data) => JSON.stringify(data ?? [])),
);
```

Use `{ lazy: true }` to wait until `refetch()` before the first load.

## Portal

`portal(target, child)` mounts a child into another DOM node and leaves a hidden marker in the call-site tree. Cleanup follows the marker or surrounding scope. The target can be a node or an element id string.

```ts
import { button, div, portal } from "@vaakx-dev/vrui";

const view = div(
  "Page content",
  portal("modals", () =>
    div({ class: "modal" }, button({ on_click: () => console.log("close") }, "Close")),
  ),
);
```

## SVG

SVG factories mirror DOM factories but create namespaced SVG nodes and set most props as attributes. Available helpers include `svg`, `g`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `defs`, `text_el`, `title_el`, and `use_el`.

```ts
import { circle, sig, svg } from "@vaakx-dev/vrui";

const active = sig(true);

const mark = svg(
  { viewBox: "0 0 24 24", width: 24, height: 24 },
  circle({
    cx: 12,
    cy: 12,
    r: 8,
    fill: active.map((v) => (v ? "lime" : "gray")),
  }),
);
```

## Icons

VRUI includes a small Lucide wrapper. `icon(name, size = 12, stroke_width = 2)` returns a `span.vrui-icon` containing the SVG. Names may be Lucide PascalCase, snake case, kebab case, or spaced words. Unknown icons render `?` and warn. Use `has_icon` to check first.

```ts
import { button, has_icon, icon } from "@vaakx-dev/vrui";

const chevron = icon("chevron_down", 16, 1.75);
const settings = icon("Settings");
const save = has_icon("save") ? icon("save") : "Save";

const controls = button({ class: "icon-button" }, chevron, settings, save);
```

## Lifecycle and cleanup notes

- `effect` returns a dispose function.
- Effects created inside active scopes are disposed with that scope.
- DOM reactive props and event handlers are cleaned up when the node disconnects, or when an active scope is disposed.
- `show`, `keep`, `list`, `portal`, and `resource` create scoped cleanup for their internal work.
- `on_mount` runs when a node is connected. If it returns a function, that function runs when the node disconnects.
- Call `dispose()` on long-lived resources or signals you own when they outlive their DOM scope.

## Development commands

```sh
npm run build
npm test
npm run typecheck
```
