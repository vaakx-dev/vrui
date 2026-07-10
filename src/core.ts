// ============================================================
// vrui - core (signals, derives, effects, batching)
// ============================================================

import { dispose_all, enter_scope, exit_scope, register_in_scope } from "./scope";

/* ---------- globals ---------- */

let active_effect: Effect | null = null;
let batch_depth = 0;
let notification_depth = 0;
let effect_depth = 0;
let flushing = false;
const derive_queue = new Set<Effect>();
const effect_queue = new Set<Effect>();

function throw_errors(errors: unknown[], message: string): void {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, message);
}

function take_first(queue: Set<Effect>): Effect {
  const item = queue.values().next().value as Effect;
  queue.delete(item);
  return item;
}

function flush_queue(): void {
  if (flushing || batch_depth || notification_depth || effect_depth) return;

  const errors: unknown[] = [];
  flushing = true;

  try {
    while (derive_queue.size || effect_queue.size) {
      const queue = derive_queue.size ? derive_queue : effect_queue;
      const next = take_first(queue);

      try {
        next.run();
      } catch (err) {
        errors.push(err);
      }
    }
  } finally {
    flushing = false;
  }

  throw_errors(errors, "vrui: multiple reactive updates failed");
}

function enqueue(effect: Effect, derived: boolean): void {
  (derived ? derive_queue : effect_queue).add(effect);
  flush_queue();
}

function dequeue(effect: Effect): void {
  derive_queue.delete(effect);
  effect_queue.delete(effect);
}

/* ---------- core types ---------- */

export type Cleanup = (() => void) | void;
export type ReactiveValue<T> = Sig<T> | Derive<T> | (() => T);

export function resolve<T>(v: T | ReactiveValue<T>): T {
  if (v instanceof Sig || v instanceof Derive) return v.get();
  if (typeof v === "function") return (v as () => T)();
  return v;
}

export function is_reactive(v: unknown): v is ReactiveValue<unknown> {
  return v instanceof Sig || v instanceof Derive || typeof v === "function";
}

export function untrack<T>(fn: () => T): T {
  const prev = active_effect;
  active_effect = null;
  try {
    return fn();
  } finally {
    active_effect = prev;
  }
}

/* ---------- effect ---------- */

export class Effect {
  private fn: () => Cleanup;
  private cleanup: Cleanup = undefined;
  private deps = new Set<Sig<unknown>>();
  private scope_disposers: (() => void)[] = [];
  private disposed = false;
  private running = false;
  private derived: boolean;

  constructor(fn: () => Cleanup, track_scope = true, derived = false) {
    this.fn = fn;
    this.derived = derived;
    this.run();
    if (track_scope) register_in_scope(() => this.dispose());
  }

  private release_owned(scope: (() => void)[], cleanup: Cleanup): void {
    const errors: unknown[] = [];
    const prev = active_effect;
    active_effect = null;

    try {
      try {
        dispose_all(scope);
      } catch (err) {
        errors.push(err);
      }

      if (cleanup) {
        try {
          cleanup();
        } catch (err) {
          errors.push(err);
        }
      }
    } finally {
      active_effect = prev;
    }

    throw_errors(errors, "vrui: multiple effect cleanups failed");
  }

  private drain_owned(): void {
    const scope = this.scope_disposers;
    const cleanup = this.cleanup;
    this.scope_disposers = [];
    this.cleanup = undefined;
    this.release_owned(scope, cleanup);
  }

  private clear_deps(): void {
    for (const d of this.deps) d.unsub(this);
    this.deps.clear();
  }

  private restore_deps(old_deps: Set<Sig<unknown>>): void {
    this.clear_deps();
    for (const d of old_deps) {
      this.deps.add(d);
      d.sub(this);
    }
  }

  private execute(): void {
    const old_deps = new Set(this.deps);

    this.running = true;
    try {
      this.clear_deps();

      try {
        this.drain_owned();
      } catch (err) {
        if (!this.disposed) this.restore_deps(old_deps);
        throw err;
      }

      if (this.disposed) return;

      const prev = active_effect;
      active_effect = this;
      enter_scope();

      let cleanup: Cleanup = undefined;
      let scope: (() => void)[] = [];
      const errors: unknown[] = [];

      try {
        cleanup = this.fn();
      } catch (err) {
        errors.push(err);
      } finally {
        try {
          scope = exit_scope();
        } catch (err) {
          errors.push(err);
        } finally {
          active_effect = prev;
        }
      }

      if (errors.length || this.disposed) {
        this.clear_deps();
        if (!this.disposed) this.restore_deps(old_deps);

        try {
          this.release_owned(scope, errors.length ? undefined : cleanup);
        } catch (err) {
          errors.push(err);
        }

        throw_errors(errors, "vrui: effect execution and cleanup failed");
        return;
      }

      this.cleanup = cleanup;
      this.scope_disposers = scope;
    } finally {
      this.running = false;
    }
  }

  run(): void {
    if (this.disposed || this.running) return;

    const errors: unknown[] = [];
    effect_depth++;

    try {
      this.execute();
    } catch (err) {
      errors.push(err);
    } finally {
      effect_depth--;
    }

    try {
      flush_queue();
    } catch (err) {
      errors.push(err);
    }

    throw_errors(errors, "vrui: effect and scheduled updates failed");
  }

  add_dep(sig: Sig<unknown>): void {
    this.deps.add(sig);
  }

  remove_dep(sig: Sig<unknown>): void {
    this.deps.delete(sig);
  }

  notify(): void {
    if (this.disposed || this.running) return;
    enqueue(this, this.derived);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    dequeue(this);
    this.clear_deps();
    this.drain_owned();
  }
}

export function effect(fn: () => Cleanup): () => void {
  const e = new Effect(fn);
  return () => e.dispose();
}

/* ---------- batch ---------- */

export function batch(fn: () => void): void {
  const errors: unknown[] = [];
  batch_depth++;

  try {
    fn();
  } catch (err) {
    errors.push(err);
  } finally {
    batch_depth--;
  }

  try {
    flush_queue();
  } catch (err) {
    errors.push(err);
  }

  throw_errors(errors, "vrui: batch and scheduled updates failed");
}

/* ---------- sig ---------- */

export class Sig<T> {
  protected _val: T;
  private subs = new Set<Effect>();

  constructor(v: T) {
    this._val = v;
  }

  get(): T {
    if (!active_effect) return this._val;

    this.subs.add(active_effect);
    active_effect.add_dep(this);
    return this._val;
  }

  protected set_raw(v: T): void {
    if (Object.is(this._val, v)) return;
    this._val = v;
    this.notify();
  }

  set(v: T): void {
    this.set_raw(v);
  }

  update(fn: (v: T) => T): void {
    this.set(fn(this._val));
  }

  sub(e: Effect): void {
    this.subs.add(e);
  }
  unsub(e: Effect): void {
    this.subs.delete(e);
  }

  notify(): void {
    // Snapshot to avoid re-visiting effects that re-subscribe mid-iteration.
    // JS Set iteration revisits entries that are deleted then re-added during
    // the same loop, which Effect.run does (unsubs all deps, then re-reads).
    notification_depth++;
    try {
      const snapshot = Array.from(this.subs);
      for (const e of snapshot) e.notify();
    } finally {
      notification_depth--;
    }

    flush_queue();
  }

  dispose(): void {
    for (const e of this.subs) e.remove_dep(this);
    this.subs.clear();
  }

  /* ---- transforms ---- */

  map<U>(fn: (v: T) => U): Derive<U> {
    return derive(() => fn(this.get()));
  }

  eq(v: T | ReactiveValue<T>): Condition {
    return new Condition(derive(() => Object.is(this.get(), resolve(v))));
  }

  /* ---- event helpers ---- */

  toggle(this: Sig<boolean>): () => void {
    return () => this.set(!this._val);
  }

  setter(v: T | ReactiveValue<T>): () => void {
    return () => this.set(resolve(v));
  }

  from_input(): (e: Event) => void {
    return (e) => this.set((e.target as HTMLInputElement).value as unknown as T);
  }

  /* ---- object / array helpers ---- */

  prop<K extends keyof T>(key: K): Derive<T[K]> {
    return derive(() => this.get()[key]);
  }

  or<F>(fallback: F): Derive<NonNullable<T> | F> {
    return derive(() => (this.get() ?? fallback) as NonNullable<T> | F);
  }

  /* -- array only -- */

  index<E>(this: Sig<readonly E[]>, idx: number | Sig<number>): Derive<E | undefined> {
    return derive(() => {
      const i = idx instanceof Sig ? idx.get() : idx;
      return this.get()[i];
    });
  }

  filter<E, Q>(
    this: Sig<readonly E[]>,
    query: Sig<Q>,
    fn: (item: E, query: Q) => boolean,
  ): Derive<E[]> {
    return derive(() => {
      const value = query.get();
      return this.get().filter((item) => fn(item, value));
    });
  }
}

export function sig<T>(v: T): Sig<T> {
  return new Sig(v);
}

/* ---------- derive ---------- */

const NO_DERIVE_ERROR = Symbol("no derive error");

export class Derive<T> extends Sig<T> {
  private _effect: Effect;
  private _error: unknown = NO_DERIVE_ERROR;

  constructor(fn: () => T) {
    super(undefined as T);
    this._effect = new Effect(() => {
      let value: T;
      try {
        value = fn();
      } catch (error) {
        this._error = error;
        this.notify();
        throw error;
      }

      const recovered = this._error !== NO_DERIVE_ERROR;
      this._error = NO_DERIVE_ERROR;
      if (!recovered && Object.is(value, this._val)) return;
      this._val = value;
      this.notify();
    }, false, true);
    register_in_scope(() => this.dispose());
  }

  get(): T {
    const value = super.get();
    if (this._error !== NO_DERIVE_ERROR) throw this._error;
    return value;
  }

  set(_v: T): never {
    throw new Error("derive is read-only");
  }

  update(_fn: (v: T) => T): never {
    throw new Error("derive is read-only");
  }

  toggle(this: Sig<boolean>): never {
    throw new Error("derive is read-only");
  }

  setter(_v: T | ReactiveValue<T>): never {
    throw new Error("derive is read-only");
  }

  from_input(): never {
    throw new Error("derive is read-only");
  }

  dispose(): void {
    this._effect.dispose();
    super.dispose();
  }
}

export function derive<T>(fn: () => T): Derive<T> {
  return new Derive(fn);
}

/* ---------- condition ---------- */

export class Condition {
  private d: Derive<boolean>;

  constructor(d: Derive<boolean>) {
    this.d = d;
  }

  get(): boolean {
    return this.d.get();
  }

  select(a: string, b: string): Derive<string> {
    return derive(() => (this.d.get() ? a : b));
  }
}
