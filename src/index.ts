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
  append_child,
  class_str,
  el,
  safe_str,
} from "./dom";
export {
  Fragment,
  a,
  article,
  aside,
  button,
  canvas,
  dd,
  details,
  div,
  dialog,
  dl,
  dt,
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
  main,
  nav,
  ol,
  option,
  p,
  section,
  select,
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
} from "./elements";
export {
  auto_dispose,
  listen,
  on_disconnect,
  on_document,
  on_mount,
  on_target,
  on_window,
} from "./lifecycle";
export { by_id, mount, replace } from "./mount";
export { set_style } from "./style";
export type {
  Child,
  ClassValue,
  Component,
  MaybeReactive,
  Props,
  StyleEntry,
  StyleMap,
  StylePrimitive,
  StyleShape,
  StyleValue,
  WritableSignal,
} from "./dom_types";

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
  EventNameFromProp,
  EventPropName,
  EventProps,
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
export type { SvgAttribute, SvgProps } from "./svg_types";

export { icon } from "./icons";
export type { IconNode } from "./icons";
