# VRUI

Small DOM UI toolkit with signals, derived values, scoped cleanup, DOM/SVG
factories, runtime utilities, color themes, flow helpers, resources, portals,
and Lucide icons.

## Overview

VRUI builds real DOM nodes directly. State lives in signals, reactive reads
inside `effect` or factory props update the DOM, and cleanup is tied to scopes
or node disconnects.

Use it when you want lightweight browser UI code without a virtual DOM or
component runtime.

## Use

VRUI is consumed directly from this GitHub repository. It builds ESM to
`./dist/index.js` with TypeScript declarations in `./dist/index.d.ts` for
browser-bundled apps.

```ts
import {
  button,
  div,
  input,
  mount,
  sig,
} from "@vaakx-dev/vrui";
```

```sh
npm install github:vaakx-dev/vrui lucide
```

Quick start:

```ts
import { button, div, mount, sig } from "@vaakx-dev/vrui";

const count = sig(0);

const app = div(
  { class: "counter" },
  button({ onClick: () => count.update((n) => n + 1) }, "Add"),
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
    onClick: stop,
    onKeyDown: keys({
      Escape: open.setter(false),
      Enter: runSelected,
      ArrowDown: () => moveSelection(1),
      ArrowUp: () => moveSelection(-1),
    }),
  },
  "Commands",
);
```

Avoid app-level raw DOM listeners unless you are integrating a browser API,
third-party widget, canvas renderer, measurement, or another real escape hatch.

## Runtime utilities

Known class names generate CSS rules at runtime. VRUI uses fixed scales, keeps
unknown external classes, rejects arbitrary utility values, and inserts each
generated rule once. No project CSS file or CSS build step is required.

```ts
import { button, mount, themes } from "@vaakx-dev/vrui";

const save = button(
  {
    class: [
      "inline-flex items-center gap-2 rounded-md px-4 py-2",
      "bg-accent-600 text-sm font-semibold text-white",
      "hover:bg-accent-700 disabled:opacity-50",
    ],
    onClick: saveProject,
  },
  "Save",
);

mount("app", { theme: themes.indigo }, save);
```

Color themes only assign color roles. Spacing, sizing, typography, radii,
shadows, and breakpoints are stable built-in scales. Named `patterns` provide
searchable project standards, while `checkPatterns` and `checkUtilities`
report duplicated or drifting combinations.

## Core support

| Item | Support |
| --- | --- |
| `div` | DOM factory for `HTMLDivElement` |
| `button` | DOM factory with reactive props and event props |
| `input` | DOM factory with `value`, `bindValue`, and `bindChecked` support |
| `img` | DOM factory for `HTMLImageElement` |
| `canvas` | DOM factory for canvas escape hatches through `ref` and `onMount` |
| `dynamicChild` | Replaces one child when its driving reactive value changes |
| `sig` | Mutable signal with helpers such as `set`, `update`, `map`, and `toggle` |
| `icon` | Lucide icon wrapper for explicitly imported icon nodes |

## Event and lifecycle props

Event props use `onEventName`. Underscores after `on` are removed when the
browser listener is registered.

Common event prop names:

- `onClick`
- `onPointerDown`
- `onPointerMove`
- `onPointerUp`
- `onPointerCancel`

Common lifecycle prop names:

- `onMount`

```ts
import { canvas } from "@vaakx-dev/vrui";

const pad = canvas({
  onPointerDown: startStroke,
  onPointerMove: moveStroke,
  onPointerUp: endStroke,
  onPointerCancel: endStroke,
});
```

## Common examples

Signal-driven disabled button:

```ts
import { button, div, input, sig } from "@vaakx-dev/vrui";

const name = sig("");
const canSave = name.map((value) => value.trim().length > 0);

const form = div(
  input({ bindValue: name, placeholder: "Name" }),
  button({ disabled: canSave.map((value) => !value), onClick: save }, "Save"),
);
```

Form binding:

```ts
import { form, input, label, sig } from "@vaakx-dev/vrui";

const email = sig("");

const profile = form(
  label("Email", input({ type: "email", bindValue: email })),
);
```

## Detailed docs

- [DOM factories](docs/domFactories.md)
- [Runtime utilities](docs/utilities.md)
- [Events](docs/events.md)
- [Reactivity](docs/reactivity.md)
- [Flow helpers](docs/flow.md)
- [Forms](docs/forms.md)
- [Lifecycle and cleanup](docs/lifecycle.md)
- [Canvas](docs/canvas.md)
- [Icons](docs/icons.md)
- [Store and resources](docs/storeResource.md)
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
npm run check
npm test
npm run typecheck
```
