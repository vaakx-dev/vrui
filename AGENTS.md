# VRUI Codegen Conventions

Write application code as VRUI code first. Raw DOM APIs are escape hatches, not
the normal style.

Prefer:

- factories such as `div`, `button`, `input`, `form`, `label`, `select`,
  `option`, `dialog`, `table`, and `svg`
- reactive props and children with `sig`, `derive`, and `effect`
- `bindValue` and `bindChecked` for common form state
- event props such as `onClick`, `onInput`, and `onKeyDown`
- event helpers such as `stop`, `prevent`, `preventThen`, `stopThen`, and
  `keys`
- flow helpers such as `show`, `keep`, `list`, `portal`, `mount`, and
  `replace`
- cleanup-aware helpers such as `listen`, `onWindow`, `onDocument`, and
  `onTarget`
- browser side-effect helpers such as `onTimeout`, `onInterval`, `onRaf`,
  `onResize`, `onMedia`, `resizeObserver`, and `intersectionObserver`

Avoid in app code unless there is a real integration need:

- `document.createElement`
- element-level `addEventListener`
- manual `appendChild` or `removeChild`
- manual `textContent`, `className`, or `style.*` updates for reactive UI
- unmanaged timers, observers, or global event listeners

Acceptable escape hatches include canvas rendering, third-party widgets,
measurement/layout reads, unsupported platform APIs, and custom elements that
need direct imperative setup. Use `ref`, `onMount`, and cleanup-aware helpers
around those boundaries.
