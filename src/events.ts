// ============================================================
// vrui - event helpers
// ============================================================

export type EventHandler<E extends Event = Event> = (event: E) => void;

/**
 * Browser events supported by declarative `on*` props.
 *
 * Each name follows the runtime convention: remove `on` and lowercase the
 * remainder to obtain the browser event name. Custom events intentionally do
 * not belong here; attach those with `listen`.
 */
export type EventPropName =
  | "onAbort"
  | "onAnimationCancel"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onAuxClick"
  | "onBeforeInput"
  | "onBeforeMatch"
  | "onBeforeToggle"
  | "onBlur"
  | "onCancel"
  | "onCanPlay"
  | "onCanPlayThrough"
  | "onChange"
  | "onClick"
  | "onClose"
  | "onCompositionEnd"
  | "onCompositionStart"
  | "onCompositionUpdate"
  | "onContextLost"
  | "onContextMenu"
  | "onContextRestored"
  | "onCopy"
  | "onCueChange"
  | "onCut"
  | "onDblClick"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "onDurationChange"
  | "onEmptied"
  | "onEnded"
  | "onError"
  | "onFocus"
  | "onFocusIn"
  | "onFocusOut"
  | "onFormData"
  | "onGotPointerCapture"
  | "onInput"
  | "onInvalid"
  | "onKeyDown"
  | "onKeyPress"
  | "onKeyUp"
  | "onLoad"
  | "onLoadedData"
  | "onLoadedMetadata"
  | "onLoadStart"
  | "onLostPointerCapture"
  | "onMouseDown"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onMouseMove"
  | "onMouseOut"
  | "onMouseOver"
  | "onMouseUp"
  | "onPaste"
  | "onPause"
  | "onPlay"
  | "onPlaying"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerEnter"
  | "onPointerLeave"
  | "onPointerMove"
  | "onPointerOut"
  | "onPointerOver"
  | "onPointerRawUpdate"
  | "onPointerUp"
  | "onProgress"
  | "onRateChange"
  | "onReset"
  | "onResize"
  | "onScroll"
  | "onScrollEnd"
  | "onSecurityPolicyViolation"
  | "onSeeked"
  | "onSeeking"
  | "onSelect"
  | "onSelectionChange"
  | "onSelectStart"
  | "onSlotChange"
  | "onStalled"
  | "onSubmit"
  | "onSuspend"
  | "onTimeUpdate"
  | "onToggle"
  | "onTouchCancel"
  | "onTouchEnd"
  | "onTouchMove"
  | "onTouchStart"
  | "onTransitionCancel"
  | "onTransitionEnd"
  | "onTransitionRun"
  | "onTransitionStart"
  | "onVolumeChange"
  | "onWaiting"
  | "onWheel";

export type EventNameFromProp<P extends EventPropName> =
  P extends `on${infer Name}`
    ? Lowercase<Name> & keyof GlobalEventHandlersEventMap
    : never;

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
  > | undefined;
};

export function eventNameFromProp(key: string): string {
  return key.slice(2).toLowerCase();
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

export function stopThen<E extends Event>(fn?: EventHandler<E>): EventHandler<E> {
  return event(fn, { stop: true });
}

export function preventThen<E extends Event>(fn?: EventHandler<E>): EventHandler<E> {
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

const MODIFIERS = ["ctrl", "alt", "shift", "meta"] as const;

type Chord = {
  key: string;
  held: string;
  handler: KeyMap[string];
};

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function modifierName(part: string): string {
  if (part === "mod") return isMac() ? "meta" : "ctrl";
  if (part === "cmd") return "meta";
  if (part === "control") return "ctrl";
  if (part === "option") return "alt";
  return part;
}

function parseChord(name: string, handler: KeyMap[string]): Chord | undefined {
  const plus = name.lastIndexOf("+", name.length - 2);
  if (plus <= 0) return undefined;

  const parts = name.slice(0, plus).toLowerCase().split("+").map(modifierName);
  const held = MODIFIERS.filter((modifier) => parts.includes(modifier)).join("+");
  return { key: name.slice(plus + 1).toLowerCase(), held, handler };
}

function heldModifiers(ev: KeyboardEvent): string {
  const held = [ev.ctrlKey, ev.altKey, ev.shiftKey, ev.metaKey];
  return MODIFIERS.filter((_, index) => held[index]).join("+");
}

function pressedKeys(ev: KeyboardEvent): string[] {
  const names = [ev.key.toLowerCase()];
  if (ev.key === " ") names.push("space");
  if (/^Key[A-Z]$/.test(ev.code)) names.push(ev.code.slice(3).toLowerCase());
  if (/^Digit\d$/.test(ev.code)) names.push(ev.code.slice(5));
  return names;
}

function chordHandler(chords: Chord[], ev: KeyboardEvent): KeyMap[string] {
  if (!chords.length) return undefined;
  const held = heldModifiers(ev);
  if (!held) return undefined;
  const pressed = pressedKeys(ev);
  return chords.find((chord) => chord.held === held && pressed.includes(chord.key))?.handler;
}

/**
 * Map keys to handlers. Plain names match `event.key`, such as `Enter` or
 * `ArrowDown`. Chords join modifiers and a key with `+`, such as `mod+k`,
 * `shift+Enter`, or `ctrl+alt+Delete`; `mod` is Meta on Apple platforms and
 * Control elsewhere. A chord matches only its exact modifiers, and takes
 * precedence over a plain name for the same key.
 */
export function keys(map: KeyMap, options: KeyOptions = {}): EventHandler<KeyboardEvent> {
  const shouldPrevent = options.prevent ?? true;
  const chords = Object.entries(map)
    .map(([name, handler]) => parseChord(name, handler))
    .filter((chord): chord is Chord => !!chord);

  return (ev) => {
    if (options.self && ev.target !== ev.currentTarget) return;
    if (options.repeat === false && ev.repeat) return;

    const handler = chordHandler(chords, ev) ?? map[ev.key];
    if (!handler) return;

    if (shouldPrevent) ev.preventDefault();
    if (options.stop) ev.stopPropagation();

    handler(ev);
  };
}
