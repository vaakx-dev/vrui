# Reactivity

Use `sig` for mutable state, `derive` for read-only computed state, `effect`
for side effects, and `batch` to group updates so dependent effects run once.

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

Signals include helpers such as `update`, `toggle`, `setter`, `from_input`,
`map`, `eq`, `prop`, `or`, `index`, and `filter`.

## Reactive UI

Factory props and children can read signals directly:

```ts
import { button, div, sig } from "@vaakx-dev/vrui";

const active = sig(false);

const view = div(
  { class: ["panel", { active }] },
  button({ on_click: active.toggle() }, active.map((value) => value ? "On" : "Off")),
);
```

The reactive work is cleaned up when the node disconnects or when its owning
scope is disposed.
