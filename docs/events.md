# Events

Event props use `onEventName`. Underscores after `on` are removed when the
browser event listener is registered. The supported props are closed and
typed, so misspellings fail type checking and handlers receive the appropriate
DOM event type.

| Prop | Browser event |
| --- | --- |
| `onClick` | `click` |
| `onInput` | `input` |
| `onKeyDown` | `keydown` |
| `onPointerDown` | `pointerdown` |
| `onPointerMove` | `pointermove` |
| `onPointerUp` | `pointerup` |
| `onPointerCancel` | `pointercancel` |

`onMount` is a lifecycle prop, not a browser event prop.

The standard set includes:

- focus and form events: `onBlur`, `onChange`, `onFocus`, `onFocusIn`,
  `onFocusOut`, `onInput`, `onInvalid`, `onReset`, and `onSubmit`
- keyboard and composition events: `onKeyDown`, `onKeyPress`, `onKeyUp`,
  `onCompositionStart`, `onCompositionUpdate`, and `onCompositionEnd`
- mouse, pointer, touch, drag, clipboard, and wheel events
- animation and transition events
- common media, loading, scrolling, selection, and toggle events

Names follow browser terminology. For example, double-click is `onDblClick`,
which maps to `dblclick`.

```ts
import { canvas } from "@vaakx-dev/vrui";

const pad = canvas({
  onPointerDown: startStroke,
  onPointerMove: moveStroke,
  onPointerUp: endStroke,
  onPointerCancel: endStroke,
});
```

## Helpers

VRUI includes helpers for common UI event boilerplate:

```ts
import { button, div, keys, preventThen, stop } from "@vaakx-dev/vrui";

const saveButton = button({ onClick: preventThen(save) }, "Save");

const palette = div({
  onClick: stop,
  onKeyDown: keys({
    Escape: closePalette,
    Enter: runSelected,
    ArrowDown: () => moveSelection(1),
    ArrowUp: () => moveSelection(-1),
  }),
});
```

Available helpers are `stop`, `prevent`, `stopThen(fn)`,
`preventThen(fn)`, `event(fn, options)`, and `keys(map, options)`.

`keys(map)` handles only mapped keys and prevents their default browser action
by default.

```ts
keys({ Enter: submit }, { prevent: false });
keys({ Escape: close }, { stop: true, repeat: false });
```

Join modifiers and a key with `+` for a chord. `mod` is Meta on Apple
platforms and Control elsewhere; `ctrl`, `alt`, `shift`, and `meta` name one
modifier each. A chord matches only its exact modifiers and wins over a plain
name for the same key. Plain names still match `event.key` whatever modifiers
are held.

```ts
keys({
  Enter: send,
  "shift+Enter": newLine,
  "mod+k": openPalette,
});
```

Use VRUI event props or cleanup-aware helpers at integration boundaries.

## Custom events

Declarative props intentionally cover standard browser events only. Use
`listen` for custom events or third-party integration events. It returns a
cleanup function.

```ts
import { listen } from "@vaakx-dev/vrui";

const stopListening = listen(target, "panel:activate", (event) => {
  activatePanel(event);
});

stopListening();
```

`listen` takes any `EventTarget`, including a `WebSocket`, `FileReader`,
`MediaQueryList`, or `AbortSignal`. Use it instead of `addEventListener` or
handler properties such as `socket.onmessage`. Annotate the handler's event
type for typed access:

```ts
listen(socket, "message", (event: MessageEvent<string>) => {
  model.receive(JSON.parse(event.data));
});
```
