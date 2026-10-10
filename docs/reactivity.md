# Reactivity

Use `sig` for mutable state, `derive` for read-only computed state, `effect`
for side effects, and `batch` to group updates so dependent effects run once.

Updates are synchronous. VRUI settles every affected derive before running user
effects, so an effect never observes a mixture of old and new computed values.
An effect that depends on both a source and its derive runs once for that
transaction.

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

If reactive work throws, VRUI still drains the queued transaction before
reporting the error. Cleanup likewise attempts every owned disposer, reporting
multiple failures with `AggregateError` after teardown completes. A failed
derive propagates that failure to its readers until it recomputes successfully;
VRUI does not expose its last value as if it belonged to the new transaction.

Signals include helpers such as `update`, `toggle`, `setter`, `fromInput`,
`map`, `eq`, `prop`, `or`, `index`, and `filter`.

`read(value)` reads a plain value, signal, derive, getter, or `Condition`, and
tracks it inside an effect. Use it in components that accept `MaybeReactive`
props.

```ts
function badge(label: MaybeReactive<string>) {
  return span({ text: () => read(label).toUpperCase() });
}
```

## Browser-backed signals

These signals belong to the active scope, which stops their listeners and
timers:

- `stored(key, fallback, valid?)` loads JSON from `localStorage`, saves every
  `set`, and falls back when the saved value is missing, unreadable, or fails
  `valid`. By default a saved value must have the fallback's type.
- `media(query)` is a read-only boolean that follows a media query.
- `clock(ms = 1000)` is a read-only `Date.now()` that updates every `ms`.

```ts
const width = stored("sidebar-width", 280);
const wide = media("(min-width: 64rem)");
const now = clock(30_000);
```

## Reactive UI

Factory props and children can read signals directly:

```ts
import { button, div, sig } from "@vaakx-dev/vrui";

const active = sig(false);

const view = div(
  { class: ["panel", { active }] },
  button({ onClick: active.toggle() }, active.map((value) => value ? "On" : "Off")),
);
```

The reactive work is cleaned up when the node disconnects or when its owning
scope is disposed.
