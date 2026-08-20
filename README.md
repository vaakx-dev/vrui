# VRUI

VRUI is a small TypeScript toolkit for building browser interfaces with real
DOM nodes. It provides signals, typed element factories, flow helpers, scoped
lifecycle work, and Tailwind-like runtime utilities.

Applications do not need CSS files, a utility compiler, or a source scan.
Element factories have no visual defaults. The view states its appearance with
a known utility vocabulary, and VRUI creates the required CSS rules in the
browser.

```ts
button(
  {
    class: [
      "inline-flex items-center gap-2 rounded-lg px-4 py-2",
      "bg-accent-600 text-sm font-semibold text-white",
      "hover:bg-accent-700 focus-visible:ring-2 disabled:opacity-50",
    ],
    onClick: model.save,
  },
  "Save",
);
```

Spacing, sizing, type, radii, shadows, colors, breakpoints, and state variants
come from fixed built-in scales. Arbitrary values such as `w-[13px]` are
rejected. Themes map color roles only; they never change layout or sizing.

## Install

```sh
npm install github:vaakx-dev/vrui lucide
```

```ts
import { button, div, mount, sig } from "@vaakx-dev/vrui";
```

VRUI builds ESM to `dist/index.js` with declarations in `dist/index.d.ts`.

## Examples

The repository contains two independent applications. Each has its own HTML
entry point, model, view, and mount boundary. Their HTML files contain only a
mount target and module script; every visible element is VRUI code.

- [Tasks](examples/tasks) is a small application with one `view.ts`. It keeps
  the whole interface easy to read before splitting it into components.
- [Workshop](examples/workshop) is a larger bicycle service application. It
  separates work orders, scheduling, and parts by feature and reuses real
  application components.

Run either application directly:

```sh
npm install
npm run example:tasks
```

```sh
npm run example:workshop
```

## Small application structure

Start with the smallest structure that gives state and UI clear ownership:

```text
tasks/
  index.html
  main.ts
  model.ts
  view.ts
```

`model.ts` owns state, derived values, and actions. `view.ts` renders the model
and routes interactions to those actions. `main.ts` selects the color theme and
mounts the application.

```ts
// model.ts
import { derive, sig } from "@vaakx-dev/vrui";

export function create_tasks() {
  const tasks = sig<string[]>([]);
  const draft = sig("");
  const can_add = derive(() => draft.get().trim().length > 0);

  function add() {
    const title = draft.get().trim();
    if (!title) return;
    tasks.update((items) => [...items, title]);
    draft.set("");
  }

  return { add, can_add, draft, tasks };
}
```

```ts
// view.ts
export function tasks_view(model: TasksModel) {
  return form(
    { onSubmit: preventThen(model.add) },
    input({ bindValue: model.draft, placeholder: "What needs doing?" }),
    button(
      {
        class: "rounded-lg bg-accent-600 px-4 py-2 text-white",
        disabled: model.can_add.map((value) => !value),
        type: "submit",
      },
      "Add task",
    ),
    list(model.tasks, (task) => task, (task) => div(task)),
  );
}
```

## Larger application structure

Split code when a feature or component has real ownership, not because every
screen must follow a template. The workshop example grows into this shape:

```text
workshop/
  components/
    action.ts
    badge.ts
    field.ts
    navigation.ts
    page.ts
    panel.ts
    record.ts
  orders/
    editor.ts
    model.ts
    row.ts
    view.ts
  parts/
    model.ts
    row.ts
    view.ts
  schedule/
    model.ts
    slot.ts
    view.ts
  main.ts
  model.ts
  view.ts
```

Shared UI is a function that returns a VRUI element. It owns both behavior and
the utility composition that makes it reusable:

```ts
export function primary_action(
  props: Props<HTMLButtonElement>,
  ...children: Child[]
) {
  return button(
    {
      ...props,
      class: [
        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
        "bg-accent-600 text-sm font-semibold text-white",
        "hover:bg-accent-700 focus-visible:ring-2 disabled:opacity-50",
        props.class,
      ],
    },
    ...children,
  );
}
```

This keeps repeated shapes searchable as components such as
`primary_action(...)`, `panel(...)`, and `record(...)`. It does not introduce a
second catalog of class-name strings.

## The VRUI path

Application work maps to a small set of library concepts:

| Intent | VRUI path |
| --- | --- |
| Build an element | `div`, `button`, `input`, `form`, `table`, `svg`, and other factories |
| Hold or derive state | `sig`, `derive`, `store`, and `resource` |
| Render conditional or repeated UI | `show`, `keep`, `dynamicChild`, and keyed `list` |
| Bind a form control | `bindValue` and `bindChecked` |
| Handle an element interaction | typed props such as `onClick`, `onSubmit`, and `onKeyDown` |
| Express event behavior | `keys`, `preventThen`, `stopThen`, and `event` |
| Observe a window, document, or target | `onWindow`, `onDocument`, `onTarget`, and `listen` |
| Own delayed or observed browser work | `onTimeout`, `onInterval`, `onRaf`, `onResize`, and observer helpers |
| Integrate an imperative browser or third-party API | `ref` or `onMount`, returning cleanup |

Every browser side effect belongs to a VRUI element or active scope. Models
describe what an action means; views declare how browser interaction reaches
it. See [Application structure](docs/application-patterns.md) for complete
examples.

## Runtime utilities

VRUI registers known class names when elements are created, generates each CSS
rule once, and orders rules consistently. The class vocabulary stays close to
Tailwind: fixed scales, responsive prefixes such as `md:`, and state prefixes
such as `hover:` and `focus-visible:`. The difference is when the rules are
created: at runtime instead of in a build step.

```ts
div({
  class: "grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6",
});
```

Mount a color theme at the application boundary:

```ts
mount("app", { theme: themes.indigo }, application);
```

Read [Runtime utilities](docs/utilities.md) for scales, variants, and themes.

## Keeping application code coherent

`npm run examples:style` checks example source for three kinds of drift:

- browser work that has not been routed through a VRUI event or lifecycle API
- arbitrary utility values outside the fixed scale
- repeated or near-repeated utility shapes that should become an application
  component

The check works on source, so it catches drift in rarely rendered branches as
well as the current page. Integration modules remain explicit escape hatches
for canvas, third-party widgets, measurements, and unsupported platform APIs.

## Reference

- [Application structure](docs/application-patterns.md)
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

## Development

```sh
npm run check
npm run examples:style
npm run examples:check
```

`npm run check` type-checks the library and examples, runs the tests, checks
application structure, builds both examples, and builds the package.
