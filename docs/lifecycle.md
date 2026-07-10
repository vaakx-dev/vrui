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
function, that cleanup runs when the node disconnects. `on_mount` itself
returns a disposer that cancels a pending mount or runs the mounted cleanup.

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

`on_disconnect(node, cleanup)` waits for a real mounted lifetime: a newly
created detached node is not treated as disconnected. Its returned function
cancels the registration without running the cleanup.

Available helpers include:

- `listen`
- `on_disconnect`
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

Listener helpers tied to an owner node, including `on_target`, `on_window`,
`on_document`, `on_resize`, return a disposer for explicit early cleanup as
well as cleaning up when the owner disconnects.

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
    resize_observer(el, recalc_panel);
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
