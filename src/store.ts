// ============================================================
// vrui - store + resource (object sugar, async fetch w/ abort)
// ============================================================

import { sig, Sig } from "./core";
import { register_in_scope } from "./scope";

/* ---------- store ---------- */

export type Store<T extends object> = { readonly [K in keyof T]: Sig<T[K]> };

export function store<T extends object>(initial: T): Store<T> {
  const signals = new Map<string | symbol, Sig<unknown>>();

  return new Proxy(initial, {
    get(target, prop) {
      if (!signals.has(prop)) {
        signals.set(prop, sig((target as any)[prop]));
      }
      return signals.get(prop)!;
    },
    set(target, prop, value) {
      (target as any)[prop] = value;
      if (signals.has(prop)) {
        signals.get(prop)!.set(value);
      } else {
        signals.set(prop, sig(value));
      }
      return true;
    },
  }) as Store<T>;
}

/* ---------- resource ---------- */

export type Resource<T> = {
  data: Sig<T | undefined>;
  loading: Sig<boolean>;
  error: Sig<unknown>;
  refetch: () => void;
  dispose: () => void;
};

export function resource<T>(
  fetcher: (signal?: AbortSignal) => Promise<T> | T,
  options?: { lazy?: boolean }
): Resource<T> {
  const data = sig<T | undefined>(undefined);
  const loading = sig(false);
  const error = sig<unknown>(undefined);
  let controller: AbortController | null = null;
  let token = 0;
  let disposed = false;

  function load() {
    if (disposed) return;
    if (controller) controller.abort();
    const current = new AbortController();
    controller = current;
    const my = ++token;
    data.set(undefined);
    error.set(undefined);
    loading.set(true);

    let promise: Promise<T>;
    try {
      promise = Promise.resolve(fetcher(current.signal));
    } catch (e) {
      if (my === token && !disposed) {
        error.set(e);
        loading.set(false);
        if (controller === current) controller = null;
      }
      return;
    }

    promise
      .then((v) => { if (my === token && !disposed) data.set(v); })
      .catch((e) => { if (my === token && !disposed) error.set(e); })
      .finally(() => {
        if (controller === current) controller = null;
        if (my === token && !disposed) loading.set(false);
      });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    token++;
    if (controller) controller.abort();
    controller = null;
    data.dispose();
    loading.dispose();
    error.dispose();
  }

  if (!options?.lazy) load();
  register_in_scope(dispose);
  return { data, loading, error, refetch: load, dispose };
}
