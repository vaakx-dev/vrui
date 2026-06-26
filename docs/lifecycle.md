# Lifecycle and Cleanup

Lifecycle and browser side-effect helpers keep cleanup tied to scopes or node
disconnects.

## Mounting

`mount(target, ...children)` mounts children into a node or id target and
returns a disposer.

```ts
import { div, mount } from "@vaakx-dev/vrui";

const stop = mount("app", div("Hello"));
stop();
```

If the id target does not exist yet, mounting is deferred until it appears. The
returned disposer cancels the pending mount or unmounts mounted children.

## on_mount

`on_mount` runs when a node is connected. If the callback returns a cleanup
function, that cleanup runs when the node disconnects.

```ts
import { div } from "@vaakx-dev/vrui";

const panel = div({
  on_mount: () => {
    start();
    return stop;
  },
});
```

## Cleanup helpers

Available helpers include:

- `listen`
- `on_window`
- `on_document`
- `on_target`
- `on_timeout`
- `on_interval`
- `on_raf`
- `on_resize`
- `on_media`
- `resize_observer`
- `intersection_observer`

Example:

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
    const stop_refresh = on_interval(refresh, 30_000);
    const stop_media = on_media("(prefers-reduced-motion: reduce)", (matches) => {
      reduced_motion.set(matches);
    });

    return () => {
      stop_refresh();
      stop_media();
    };
  },
});
```

Effects created inside active scopes are disposed with that scope. DOM reactive
props and event handlers are cleaned up when the node disconnects or when an
active scope is disposed.
