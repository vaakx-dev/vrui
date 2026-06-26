# @vaakx-dev/vrui

Small DOM UI toolkit with signals, derived values, scoped cleanup, DOM/SVG
factories, flow helpers, resources, portals, and Lucide icons.

Repository: https://github.com/vaakx-dev/vrui

## Overview

VRUI builds real DOM nodes directly. State lives in signals, reactive reads
inside `effect` or factory props update the DOM, and cleanup is tied to scopes
or node disconnects.

Use it when you want lightweight browser UI code without a virtual DOM or
component runtime.

## Install, use, and imports

This package exports built ESM from `./dist/index.js` with TypeScript
declarations from `./dist/index.d.ts` for browser-bundled apps.

```ts
import {
  button,
  div,
  icon,
  input,
  mount,
  sig,
} from "@vaakx-dev/vrui";
```

Quick start:

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

## Application code style

VRUI app code should read like a small UI language over the DOM. Prefer
factories, reactive props, bindings, flow helpers, and cleanup-aware event
helpers before reaching for raw browser APIs.

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

Avoid app-level raw DOM listeners unless you are integrating a browser API,
third-party widget, canvas renderer, measurement, or another real escape hatch.

## Core support

| Item | Support |
| --- | --- |
| `div` | DOM factory for `HTMLDivElement` |
| `button` | DOM factory with reactive props and event props |
| `input` | DOM factory with `value`, `bind_value`, and `bind_checked` support |
| `img` | DOM factory for `HTMLImageElement` |
| `canvas` | DOM factory for canvas escape hatches through `ref` and `on_mount` |
| `dynamic_child` | Replaces one child when its driving reactive value changes |
| `sig` | Mutable signal with helpers such as `set`, `update`, `map`, and `toggle` |
| `icon` | Lucide icon wrapper with name normalization |

## Event and lifecycle props

Event props use `on_event_name`. Underscores after `on_` are removed when the
browser listener is registered.

Common event prop names:

- `on_click`
- `on_pointer_down`
- `on_pointer_move`
- `on_pointer_up`
- `on_pointer_cancel`

Common lifecycle prop names:

- `on_mount`

```ts
import { canvas } from "@vaakx-dev/vrui";

const pad = canvas({
  on_pointer_down: start_stroke,
  on_pointer_move: move_stroke,
  on_pointer_up: end_stroke,
  on_pointer_cancel: end_stroke,
});
```

## Common examples

Signal-driven disabled button:

```ts
import { button, div, input, sig } from "@vaakx-dev/vrui";

const name = sig("");
const can_save = name.map((value) => value.trim().length > 0);

const form = div(
  input({ bind_value: name, placeholder: "Name" }),
  button({ disabled: can_save.map((value) => !value), on_click: save }, "Save"),
);
```

Form binding:

```ts
import { form, input, label, sig } from "@vaakx-dev/vrui";

const email = sig("");

const profile = form(
  label("Email", input({ type: "email", bind_value: email })),
);
```

## Detailed docs

- [DOM factories](docs/dom_factories.md)
- [Events](docs/events.md)
- [Reactivity](docs/reactivity.md)
- [Flow helpers](docs/flow.md)
- [Forms](docs/forms.md)
- [Lifecycle and cleanup](docs/lifecycle.md)
- [Canvas](docs/canvas.md)
- [Icons](docs/icons.md)
- [Store and resources](docs/store_resource.md)
- [Portal](docs/portal.md)
- [SVG](docs/svg.md)

## Runtime and input caveats

VRUI is browser DOM code. It expects globals such as `document`, `window`,
`Node`, and `MutationObserver`; SSR, workers, and non-browser runtimes need a
DOM shim or a separate client-only entry point.

Text children and the `text` prop are assigned through text nodes or
`textContent`, so they do not parse HTML. Props are otherwise applied directly
to DOM properties, attributes, styles, or event listeners. Do not pass
untrusted prop objects, prop names, event handlers, URLs, style strings, or
HTML-bearing properties such as `innerHTML` unless your application has
validated or sanitized them first.

## Development commands

```sh
npm run build
npm test
npm run typecheck
```
