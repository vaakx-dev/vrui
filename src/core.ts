// ============================================================
// vrui - core (signals, derives, effects, batching)
// ============================================================

import { enter_scope, exit_scope, register_in_scope } from "./scope";

/* ---------- globals ---------- */

let active_effect: Effect | null = null;
let batch_depth = 0;
const batch_queue = new Set<Effect>();

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

/* ---------- effect ---------- */

export class Effect {
  private fn: () => Cleanup;
  private cleanup: Cleanup = undefined;
  private deps = new Set<Sig<unknown>>();
  private scope_disposers: (() => void)[] = [];
  private disposed = false;
  private running = false;

  constructor(fn: () => Cleanup, track_scope = true) {
    this.fn = fn;
    this.run();
    if (track_scope) register_in_scope(() => this.dispose());
  }

  private drain_scope(): void {
    if (!this.scope_disposers.length) return;
    const ds = this.scope_disposers;
    this.scope_disposers = [];
    for (const d of ds) d();
  }

  run(): void {
    if (this.disposed || this.running) return;
    this.running = true;
    const old_deps = new Set(this.deps);
    const restore_old_deps = () => {
      for (const d of this.deps) d.unsub(this);
      this.deps.clear();
      for (const d of old_deps) {
        this.deps.add(d);
        d.sub(this);
      }
    };
    try {
      for (const d of this.deps) d.unsub(this);
      this.deps.clear();
      this.drain_scope();
      if (this.cleanup) {
        this.cleanup();
        this.cleanup = undefined;
      }

      const prev = active_effect;
      active_effect = this;
      enter_scope();
      let completed = false;
      try {
        this.cleanup = this.fn();
        completed = true;
      } catch (err) {
        const failed_scope = exit_scope();
        active_effect = prev;
        try {
          for (const d of failed_scope) d();
        } finally {
          restore_old_deps();
        }
        throw err;
      } finally {
        try {
          if (completed) this.scope_disposers = exit_scope();
        } finally {
          active_effect = prev;
        }
      }
    } finally {
      this.running = false;
    }
  }

  add_dep(sig: Sig<unknown>): void {
    this.deps.add(sig);
  }

  remove_dep(sig: Sig<unknown>): void {
    this.deps.delete(sig);
  }

  notify(): void {
    if (this.disposed || this.running) return;
    if (batch_depth > 0) {
      batch_queue.add(this);
    } else {
      this.run();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const d of this.deps) d.unsub(this);
    this.deps.clear();
    this.drain_scope();
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
  }
}

export function effect(fn: () => Cleanup): () => void {
  const e = new Effect(fn);
  return () => e.dispose();
}

/* ---------- batch ---------- */

export function batch(fn: () => void): void {
  batch_depth++;
  try {
    try {
      fn();
    } finally {
      if (batch_depth === 1) {
        while (batch_queue.size) {
          const q = Array.from(batch_queue);
          batch_queue.clear();
          for (let i = 0; i < q.length; i++) {
            try {
              q[i].run();
            } catch (err) {
              for (let j = i + 1; j < q.length; j++) batch_queue.add(q[j]);
              throw err;
            }
          }
        }
      }
    }
  } finally {
    batch_depth--;
  }
}

/* ---------- sig ---------- */

export class Sig<T> {
  protected _val: T;
  private subs = new Set<Effect>();

  constructor(v: T) {
    this._val = v;
  }

  get(): T {
    if (active_effect) {
      this.subs.add(active_effect);
      active_effect.add_dep(this);
    }
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
    const snapshot = Array.from(this.subs);
    for (const e of snapshot) e.notify();
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

  index(idx: number | Sig<number>): Derive<T extends (infer E)[] ? E | undefined : never> {
    return derive(() => {
      const i = idx instanceof Sig ? idx.get() : idx;
      const arr = this.get() as unknown as any[];
      return arr[i];
    }) as Derive<T extends (infer E)[] ? E | undefined : never>;
  }

  filter<Q>(
    query: Sig<Q>,
    fn: (item: T extends (infer E)[] ? E : never, q: Q) => boolean
  ): Derive<T extends (infer E)[] ? E[] : never> {
    return derive(() => {
      const q = query.get();
      const arr = this.get() as unknown as any[];
      return arr.filter((item: any) => fn(item, q));
    }) as Derive<T extends (infer E)[] ? E[] : never>;
  }
}

export function sig<T>(v: T): Sig<T> {
  return new Sig(v);
}

/* ---------- derive ---------- */

export class Derive<T> extends Sig<T> {
  private _effect: Effect;

  constructor(fn: () => T) {
    super(undefined as T);
    this._effect = new Effect(() => {
      const v = fn();
      if (!Object.is(v, this._val)) {
        this._val = v;
        this.notify();
      }
    }, false);
    register_in_scope(() => this.dispose());
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
