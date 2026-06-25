// ============================================================
// vrui - public api
// ============================================================

export {
  Condition,
  Derive,
  Sig,
  batch,
  derive,
  effect,
  sig,
  untrack,
} from "./core";
export type { Cleanup, ReactiveValue } from "./core";

export {
  collect_scope,
  dispose_all,
  enter_scope,
  exit_scope,
  has_scope,
  once,
  register_in_scope,
  scoped,
} from "./scope";
export type { Disposer, ScopedValue } from "./scope";

export { resource, store } from "./store";
export type { Resource, Store } from "./store";

export {
  Fragment,
  a,
  append_child,
  article,
  aside,
  auto_dispose,
  by_id,
  button,
  canvas,
  class_str,
  dd,
  details,
  div,
  dialog,
  dl,
  dt,
  el,
  em,
  fieldset,
  footer,
  form,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  header,
  img,
  input,
  label,
  li,
  legend,
  listen,
  main,
  mount,
  nav,
  ol,
  option,
  on_disconnect,
  on_document,
  on_mount,
  on_target,
  on_window,
  p,
  replace,
  safe_str,
  section,
  select,
  set_style,
  small,
  span,
  strong,
  summary,
  table,
  tbody,
  td,
  template,
  textarea,
  tfoot,
  th,
  thead,
  tr,
  ul,
} from "./dom";
export type {
  Child,
  ClassValue,
  Component,
  MaybeReactive,
  Props,
  StyleMap,
  StylePrimitive,
  StyleValue,
  WritableSignal,
} from "./dom";

export {
  event,
  keys,
  prevent,
  prevent_then,
  stop,
  stop_then,
} from "./events";
export type {
  EventHandler,
  EventOptions,
  KeyHandler,
  KeyMap,
  KeyOptions,
} from "./events";

export {
  intersection_observer,
  on_interval,
  on_media,
  on_raf,
  on_resize,
  on_timeout,
  resize_observer,
} from "./browser";
export type { MediaHandler } from "./browser";

export { dynamic_child, keep, list, show } from "./flow";

export { portal } from "./portal";

export {
  circle,
  defs,
  ellipse,
  g,
  line,
  path,
  polygon,
  polyline,
  rect,
  svg,
  svg_el,
  text_el,
  title_el,
  use_el,
} from "./svg";

export {
  has_icon,
  icon,
  snake_to_pascal,
} from "./icons";
export type { icon_node } from "./icons";
