# VRUI Codegen Conventions

Write application code as VRUI code first. Raw DOM APIs are escape hatches, not
the normal style.

Prefer:

- factories such as `div`, `button`, `input`, `form`, `label`, `select`,
  `option`, `dialog`, `table`, and `svg`
- reactive props and children with `sig`, `derive`, and `effect`
- `bind_value` and `bind_checked` for common form state
- event props such as `on_click`, `on_input`, and `on_keydown`
- event helpers such as `stop`, `prevent`, `prevent_then`, `stop_then`, and
  `keys`
- flow helpers such as `show`, `keep`, `list`, `portal`, `mount`, and
  `replace`
- cleanup-aware helpers such as `listen`, `on_window`, `on_document`, and
  `on_target`
- browser side-effect helpers such as `on_timeout`, `on_interval`, `on_raf`,
  `on_resize`, `on_media`, `resize_observer`, and `intersection_observer`

Avoid in app code unless there is a real integration need:

- `document.createElement`
- element-level `addEventListener`
- manual `appendChild` or `removeChild`
- manual `textContent`, `className`, or `style.*` updates for reactive UI
- unmanaged timers, observers, or global event listeners

Acceptable escape hatches include canvas rendering, third-party widgets,
measurement/layout reads, unsupported platform APIs, and custom elements that
need direct imperative setup. Use `ref`, `on_mount`, and cleanup-aware helpers
around those boundaries.
