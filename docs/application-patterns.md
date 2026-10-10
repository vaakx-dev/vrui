# Application structure

VRUI applications keep domain state independent from browser code and give
every browser side effect an element or active scope that owns its lifetime.

## Small applications

Keep a small application together while it is still easy to read:

```text
feature/
  index.html
  main.ts
  model.ts
  view.ts
```

`model.ts` owns state, derived values, and domain actions. It can be tested
without rendering a page.

`view.ts` creates elements, binds state, renders flow, and declares browser
work. Private component functions can stay in the same file while they only
serve that view.

`main.ts` composes the application, selects a color theme, and mounts the root.

The [tasks example](../examples/tasks) uses this structure.

## State and view

```ts
// model.ts
import { derive, sig } from "@vaakx-dev/vrui";

export function create_profile() {
  const name = sig("");
  const can_save = derive(() => name.get().trim().length > 0);

  function save() {
    if (!can_save.get()) return;
    persist({ name: name.get() });
  }

  return { can_save, name, save };
}
```

```ts
// view.ts
import { button, form, input, preventThen } from "@vaakx-dev/vrui";

export function profile_view(model: ProfileModel) {
  return form(
    { onSubmit: preventThen(model.save) },
    input({ bindValue: model.name }),
    button({
      disabled: model.can_save.map((value) => !value),
      type: "submit",
    }, "Save"),
  );
}
```

The model describes what saving means. The view describes how browser input
reaches it.

## Larger applications

Split a project along real ownership boundaries. A feature folder owns a part
of the domain and its view. An application component owns a visual or
interactive shape reused across features.

```text
application/
  components/
    action.ts
    badge.ts
    field.ts
    panel.ts
  orders/
    editor.ts
    model.ts
    row.ts
    view.ts
  parts/
    model.ts
    row.ts
    view.ts
  main.ts
  model.ts
  view.ts
```

The root model composes feature models. The root view handles application-level
navigation and renders the active feature. Feature models do not depend on one
another's views.

The [workshop example](../examples/workshop) shows this structure with work
orders, a schedule, parts inventory, keyboard navigation, an editor dialog,
timed state, and shared application components.

## Application components

A reusable component is a function that returns a VRUI element. It owns the
utility composition and interaction contract for that element:

```ts
import { button, type Child, type Props } from "@vaakx-dev/vrui";

export function primary_action(
  props: Props<HTMLButtonElement>,
  ...children: Child[]
) {
  const { class: class_name, ...button_props } = props;

  return button(
    {
      ...button_props,
      class: [
        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
        "bg-accent-600 text-sm font-semibold text-white",
        "hover:bg-accent-700 focus-visible:ring-2 disabled:opacity-50",
        class_name,
      ],
    },
    ...children,
  );
}
```

Callers use `primary_action({ onClick: model.save }, "Save")`. The name is
searchable, the element remains typed, and repeated class strings do not become
a parallel UI API.

Keep a component inside its feature when only that feature uses it. Move it to
the nearest shared `components` folder when two features share the same UI
contract.

## Interaction routes

| Need | VRUI route |
| --- | --- |
| Element event | typed event prop such as `onClick`, `onInput`, or `onKeyDown` |
| Form state | `bindValue` or `bindChecked` |
| Form submission | `onSubmit: preventThen(action)` |
| Key mapping | `keys({ Escape: close, "mod+Enter": submit })` |
| Window event | `onWindow(owner, event, handler)` |
| Document event | `onDocument(owner, event, handler)` |
| Custom, socket, or third-party event | `onTarget` or `listen` |
| Timer or animation frame | `onTimeout`, `onInterval`, or `onRaf`, with an optional owner node |
| Resize or media state | `onResize`, `media`, `onMedia`, or `resizeObserver` |
| Persisted state or current time | `stored(key, fallback)` or `clock(ms)` |
| Conditional UI | `show` or `keep`; factories may return `null` |
| Repeated UI | keyed `list` |
| Imperative integration | `ref` or `onMount` with cleanup |

## Element events

```ts
button({ onClick: model.save }, "Save");

div({
  onKeyDown: keys({
    Escape: model.close,
    Enter: model.choose,
  }),
});
```

Event props are typed from the element. Event helpers keep common preventing,
stopping, and key routing visible at the declaration.

## Window and document work

The owner element defines the lifetime:

```ts
const panel = div({
  onMount: (owner) => {
    onWindow(owner, "resize", model.measure);
    onDocument(owner, "keydown", model.shortcut);
  },
});
```

Both registrations are released when `panel` disconnects.

## Timers and observers

```ts
const dashboard = div({
  onMount: (owner) => {
    const stop_refresh = onInterval(model.refresh, 30_000);
    resizeObserver(owner, model.resize);
    return stop_refresh;
  },
});
```

The mounted view owns the schedule and observation. The model owns what a
refresh or resize means.

An event handler runs outside any scope, so pass the element as the owner to
cancel a timer when the element disconnects:

```ts
button({
  onClick: (event) => {
    model.copy();
    onTimeout(model.clear_copied, 1_500, event.currentTarget as Node);
  },
}, "Copy");
```

## Integration boundaries

Keep imperative platform or third-party setup in a focused integration
function:

```ts
// integrations/chart.ts
export function chart(node: HTMLCanvasElement, data: ChartData) {
  const instance = create_chart(node, data);
  return () => instance.destroy();
}
```

```ts
// view.ts
canvas({
  onMount: (node) => chart(node, model.chart_data.get()),
});
```

The view remains VRUI-shaped while the integration keeps its native contract.

## Source checks

`vrui-check` checks the complete application source rather than only the
rendered page. It reports:

- class names VRUI does not generate, in `class:` values, in the complete words
  of template literals, and in strings elsewhere that read as class lists, such
  as `const tones = { ok: "text-sucess-600" }`
- arbitrary utility values outside the built-in scale
- fixed inline styles a utility already sets, such as `style: { top: "0" }`
- browser work that bypasses the application routes above
- exact and near-duplicate utility shapes across the checked tree

A file is browser code when it imports a `ui` module, reads a DOM global such
as `document`, `window`, `navigator`, `localStorage`, or an `HTMLElement`
type, or matches a `browser` glob. Server code that only uses `setTimeout` is
left alone. In browser code the check reports:

| Found | Use instead |
| --- | --- |
| `addEventListener`, `removeEventListener` | event props, `onWindow`, `onDocument`, `onTarget`, or `listen` |
| `socket.onmessage = ...` and other `on*` handler properties | `listen(socket, "message", handler)` |
| `append`, `prepend`, `before`, `after`, `insertBefore`, `replaceChildren`, `replaceWith`, `appendChild`, `insertAdjacent*`, `remove()`, `removeChild`, `replaceChild` | factory children, reactive children, `show`, `dynamicChild`, `list`, or `portal` |
| `createElement`, `createElementNS`, `createTextNode`, `document.getElementById` | factories, `svgEl`, string children, or `byId` |
| `el("div")` and other tags with a typed factory | `div(...)` |
| `span({ hidden: true })` placeholders, alone or around a `portal` | return `null` or the portal from the `show` or `dynamicChild` factory |
| `setAttribute`, `removeAttribute`, `toggleAttribute` | reactive `data-*`, `aria-*`, `role`, or element property props |
| `classList`, `className =` | a reactive `class` prop |
| `style.x =`, `style.setProperty` | a reactive `style` prop or a utility |
| `innerHTML`, `outerHTML`, `textContent`, `innerText` writes | factories and reactive children |
| `new ResizeObserver`, `new IntersectionObserver`, `new MutationObserver` | `resizeObserver`, `intersectionObserver`, or `onMount` |
| `setTimeout`, `setInterval`, `requestAnimationFrame`, `queueMicrotask`, and their `clear` calls | `onTimeout`, `onInterval`, `onRaf`, and their disposers |
| `matchMedia` | `media(query)` or `onMedia` |
| `localStorage`, `sessionStorage` | `stored(key, fallback)` |

`append` on `FormData`, `URLSearchParams`, and `Headers`, and `remove(item)`
with arguments, are not DOM work and are not reported.

Each report names the file and line, what was found, and the VRUI route, with
the rule in brackets:

```text
src/chat/socket.ts:14 assigning .onmessage holds one untracked handler; use listen(target, "message", handler), or the event prop on a VRUI element [on-prop]
```

When a repeated shape is reported, extract the actual VRUI element into the
nearest feature or application component. Focused `integrations` folders are
treated as explicit native-platform boundaries and are not checked.

Run it as `npx vrui-check` or `bunx vrui-check`, and add it to the
application's other checks. Pass paths, such as `vrui-check src/chat`, to check
part of the tree. It reads its settings from the `vrui` field in the nearest
`package.json`:

```json
"vrui": {
  "check": ["src"],
  "classes": ["markdown"],
  "roles": ["sky"],
  "ui": ["@vaakx-dev/vrui"],
  "browser": ["**/web/**"],
  "shapes": "tree"
}
```

- `check` lists the folders to scan when no paths are given.
- `classes` lists class names the application defines in its own CSS. A full
  run reports listed names that VRUI now generates itself.
- `roles` lists extra color roles the application's theme registers.
- `ui` lists the modules that mark a file as view code.
- `browser` lists globs, relative to the `package.json`, of files that are
  browser code even when they read no DOM global.
- `shapes` compares repeated class lists across the whole `"tree"`, the
  default, or within each `"project"`: the nearest folder with its own
  `package.json`, or the first folder under the scanned path.
