# @vaakx-dev/vrui

Small DOM UI toolkit with signals, derived values, scoped cleanup, DOM/SVG factories, flow helpers, resources, portals, and Lucide icons.

## Overview

VRUI builds real DOM nodes directly. State lives in signals, reactive reads inside `effect` or factory props update the DOM, and cleanup is tied to scopes or node disconnects.

Use it when you want lightweight UI code without a virtual DOM or component runtime.

## Install, use, and imports

This package is exported from `./src/index.ts` for local Vite and Tauri development.

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

Factories create DOM nodes: `div`, `span`, `button`, `input`, `a`, `ul`, `li`, `h1`, `h2`, `p`, `section`, `article`, `nav`, `header`, `footer`, `main`, and `aside`. Use `el(tag, props, ...children)` for other tags.

Props can be plain values or reactive values. `class`, `style`, `text`, `data-*`, `aria-*`, `role`, `value` on inputs, normal DOM properties, and children can all react to signals or derives. Event props use `on_eventName`.

```ts
import { button, div, input, sig } from "@vaakx-dev/vrui";

const name = sig("Ada");
const enabled = sig(true);

const form = div(
  {
    class: ["panel", { active: enabled }],
    style: { opacity: enabled.map((v) => (v ? 1 : 0.5)) },
  },
  input({ value: name, on_input: name.from_input() }),
  button({ disabled: enabled.map((v) => !v), on_click: enabled.toggle() }, "Toggle"),
  "Hello ",
  name,
);
```

Boundary helpers include `by_id(id)` for required elements and `mount(target, ...children)` for app roots. String targets are element ids and throw if missing.

```ts
import { by_id, div, mount } from "@vaakx-dev/vrui";

const root = by_id("app");
mount(root, div("Hello"));
mount("sidebar", div("Tools"));
```

Lifecycle props and helpers include `ref`, `on_mount`, `on_disconnect`, `listen`, `on_window`, `on_document`, and `on_target`.

## Flow helpers

`show` lazily creates a node when a condition is true and disposes it when hidden. `keep` also creates lazily, but keeps the node mounted and toggles display. `list` renders keyed arrays and reuses rows by key.

```ts
import { button, derive, div, keep, li, list, show, sig, ul } from "@vaakx-dev/vrui";

const open = sig(false);
const items = sig([
  { id: 1, label: "Alpha" },
  { id: 2, label: "Beta" },
]);

const view = div(
  button({ on_click: open.toggle() }, "Toggle"),
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
npm test
npm run typecheck
```
