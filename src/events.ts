// ============================================================
// vrui - event helpers
// ============================================================

export type EventHandler<E extends Event = Event> = (event: E) => void;

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
