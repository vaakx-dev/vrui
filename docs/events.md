# Events

Event props use `on_event_name`. Underscores after `on_` are removed when the
browser event listener is registered.

| Prop | Browser event |
| --- | --- |
| `on_click` | `click` |
| `on_input` | `input` |
| `on_keydown` | `keydown` |
| `on_pointer_down` | `pointerdown` |
| `on_pointer_move` | `pointermove` |
| `on_pointer_up` | `pointerup` |
| `on_pointer_cancel` | `pointercancel` |

`on_mount` is a lifecycle prop, not a browser event prop.

```ts
import { canvas } from "@vaakx-dev/vrui";

const pad = canvas({
  on_pointer_down: start_stroke,
  on_pointer_move: move_stroke,
  on_pointer_up: end_stroke,
  on_pointer_cancel: end_stroke,
});
```

## Helpers

VRUI includes helpers for common UI event boilerplate:

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

Available helpers are `stop`, `prevent`, `stop_then(fn)`,
`prevent_then(fn)`, `event(fn, options)`, and `keys(map, options)`.

`keys(map)` handles only mapped keys and prevents their default browser action
by default.

```ts
keys({ Enter: submit }, { prevent: false });
keys({ Escape: close }, { stop: true, repeat: false });
```

Use VRUI event props or cleanup-aware helpers at integration boundaries.
