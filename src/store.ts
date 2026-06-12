// ============================================================
// vrui - store + resource (object sugar, async fetch w/ abort)
// ============================================================

import { sig, Sig } from "./core";
import { register_in_scope } from "./scope";

/* ---------- store ---------- */

export type Store<T extends object> = { readonly [K in keyof T]: Sig<T[K]> };

export function store<T extends object>(initial: T): Store<T> {
  const signals = new Map<string | symbol, Sig<unknown>>();

  const signal_for = (target: T, prop: string | symbol): Sig<unknown> => {
    const existing = signals.get(prop);
    if (existing) return existing;

    const created = sig((target as any)[prop]);
    signals.set(prop, created);
    return created;
  };

  return new Proxy(initial, {
    get(target, prop) {
      return signal_for(target, prop);
    },
    set(target, prop, value) {
      (target as any)[prop] = value;

      const existing = signals.get(prop);
      if (!existing) {
        signals.set(prop, sig(value));
        return true;
      }

      existing.set(value);
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

  const is_current = (request: number): boolean => request === token && !disposed;

  const abort_current = () => {
    if (!controller) return;
    controller.abort();
    controller = null;
  };

  const finish_request = (request: number, current: AbortController) => {
    if (controller === current) controller = null;
    if (!is_current(request)) return;
    loading.set(false);
  };

  const fail_sync = (request: number, current: AbortController, thrown: unknown) => {
    if (controller === current) controller = null;
    if (!is_current(request)) return;

    error.set(thrown);
    loading.set(false);
  };

  function load() {
    if (disposed) return;
    abort_current();
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
      fail_sync(my, current, e);
      return;
    }

    promise
      .then((v) => {
        if (!is_current(my)) return;
        data.set(v);
      })
      .catch((e) => {
        if (!is_current(my)) return;
        error.set(e);
      })
      .finally(() => finish_request(my, current));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    token++;
    abort_current();
    data.dispose();
    loading.dispose();
    error.dispose();
  }

  if (!options?.lazy) load();
  register_in_scope(dispose);
  return { data, loading, error, refetch: load, dispose };
}
