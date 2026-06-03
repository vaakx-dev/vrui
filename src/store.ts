// ============================================================
// vrui - store + resource (object sugar, async fetch w/ abort)
// ============================================================

import { sig, Sig } from "./core";
import { register_in_scope } from "./scope";

/* ---------- store ---------- */

export function store<T extends object>(initial: T): { [K in keyof T]: Sig<T[K]> } {
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
  }) as { [K in keyof T]: Sig<T[K]> };
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
  fetcher: (signal?: AbortSignal) => Promise<T>,
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
    controller = new AbortController();
    const my = ++token;
    data.set(undefined);
    error.set(undefined);
    loading.set(true);
    fetcher(controller.signal)
      .then((v) => { if (my === token && !disposed) data.set(v); })
      .catch((e) => { if (my === token && !disposed) error.set(e); })
      .finally(() => { if (my === token && !disposed) loading.set(false); });
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
