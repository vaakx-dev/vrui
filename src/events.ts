// ============================================================
// vrui - event helpers
// ============================================================

export type EventHandler<E extends Event = Event> = (event: E) => void;

/**
 * Browser events supported by declarative `on_*` props.
 *
 * Each name follows the runtime convention: remove `on_` and every remaining
 * underscore to obtain the browser event name. Custom events intentionally do
 * not belong here; attach those with `listen`.
 */
export type EventPropName =
  | "on_abort"
  | "on_animation_cancel"
  | "on_animation_end"
  | "on_animation_iteration"
  | "on_animation_start"
  | "on_aux_click"
  | "on_before_input"
  | "on_before_match"
  | "on_before_toggle"
  | "on_blur"
  | "on_cancel"
  | "on_can_play"
  | "on_can_play_through"
  | "on_change"
  | "on_click"
  | "on_close"
  | "on_composition_end"
  | "on_composition_start"
  | "on_composition_update"
  | "on_context_lost"
  | "on_context_menu"
  | "on_context_restored"
  | "on_copy"
  | "on_cue_change"
  | "on_cut"
  | "on_dbl_click"
  | "on_drag"
  | "on_drag_end"
  | "on_drag_enter"
  | "on_drag_leave"
  | "on_drag_over"
  | "on_drag_start"
  | "on_drop"
  | "on_duration_change"
  | "on_emptied"
  | "on_ended"
  | "on_error"
  | "on_focus"
  | "on_focus_in"
  | "on_focus_out"
  | "on_form_data"
  | "on_got_pointer_capture"
  | "on_input"
  | "on_invalid"
  | "on_keydown"
  | "on_keypress"
  | "on_keyup"
  | "on_load"
  | "on_loaded_data"
  | "on_loaded_metadata"
  | "on_load_start"
  | "on_lost_pointer_capture"
  | "on_mouse_down"
  | "on_mouse_enter"
  | "on_mouse_leave"
  | "on_mouse_move"
  | "on_mouse_out"
  | "on_mouse_over"
  | "on_mouse_up"
  | "on_paste"
  | "on_pause"
  | "on_play"
  | "on_playing"
  | "on_pointer_cancel"
  | "on_pointer_down"
  | "on_pointer_enter"
  | "on_pointer_leave"
  | "on_pointer_move"
  | "on_pointer_out"
  | "on_pointer_over"
  | "on_pointer_raw_update"
  | "on_pointer_up"
  | "on_progress"
  | "on_rate_change"
  | "on_reset"
  | "on_resize"
  | "on_scroll"
  | "on_scroll_end"
  | "on_security_policy_violation"
  | "on_seeked"
  | "on_seeking"
  | "on_select"
  | "on_selection_change"
  | "on_select_start"
  | "on_slot_change"
  | "on_stalled"
  | "on_submit"
  | "on_suspend"
  | "on_time_update"
  | "on_toggle"
  | "on_touch_cancel"
  | "on_touch_end"
  | "on_touch_move"
  | "on_touch_start"
  | "on_transition_cancel"
  | "on_transition_end"
  | "on_transition_run"
  | "on_transition_start"
  | "on_volume_change"
  | "on_waiting"
  | "on_wheel";

type WithoutUnderscores<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Head}${WithoutUnderscores<Tail>}`
    : S;

export type EventNameFromProp<P extends EventPropName> =
  P extends `on_${infer Name}` ? WithoutUnderscores<Name> : never;

type InputEventFor<E extends Element> =
  E extends HTMLInputElement | HTMLTextAreaElement ? InputEvent : Event;

type EventFor<
  E extends Element,
  Name extends keyof GlobalEventHandlersEventMap,
> = Name extends "click"
  ? MouseEvent
  : Name extends "input"
    ? InputEventFor<E>
    : Name extends `pointer${string}`
      ? PointerEvent
      : GlobalEventHandlersEventMap[Name];

/** Exact declarative event props for an element. */
export type EventProps<E extends Element = Element> = {
  [P in EventPropName]?: EventHandler<
    EventFor<E, EventNameFromProp<P>>
  >;
};

export function event_name_from_prop(key: string): string {
  return key.slice(3).replace(/_/g, "");
}

export type EventOptions = {
  prevent?: boolean;
  stop?: boolean;
  self?: boolean;
};

export const stop: EventHandler = (event) => {
  event.stopPropagation();
};

export const prevent: EventHandler = (event) => {
  event.preventDefault();
};

export function event<E extends Event>(
  fn?: EventHandler<E>,
  options: EventOptions = {},
): EventHandler<E> {
  return (ev) => {
    if (options.self && ev.target !== ev.currentTarget) return;
    if (options.prevent) ev.preventDefault();
    if (options.stop) ev.stopPropagation();
    if (fn) fn(ev);
  };
}

export function stop_then<E extends Event>(fn?: EventHandler<E>): EventHandler<E> {
  return event(fn, { stop: true });
}

export function prevent_then<E extends Event>(fn?: EventHandler<E>): EventHandler<E> {
  return event(fn, { prevent: true });
}

export type KeyHandler = EventHandler<KeyboardEvent>;

export type KeyMap = Record<string, KeyHandler | null | undefined | false>;

export type KeyOptions = EventOptions & {
  /**
   * Defaults to true. Set repeat: false to ignore held-key repeat events.
   */
  repeat?: boolean;
};

export function keys(map: KeyMap, options: KeyOptions = {}): EventHandler<KeyboardEvent> {
  const should_prevent = options.prevent ?? true;

  return (ev) => {
    if (options.self && ev.target !== ev.currentTarget) return;
    if (options.repeat === false && ev.repeat) return;

    const handler = map[ev.key];
    if (!handler) return;

    if (should_prevent) ev.preventDefault();
    if (options.stop) ev.stopPropagation();

    handler(ev);
  };
}
