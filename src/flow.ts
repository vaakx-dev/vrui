// ============================================================
// vrui - flow control (list, show)
// ============================================================

import { batch, Condition, Derive, effect, resolve, sig, Sig } from "./core";
import { auto_dispose } from "./dom";
import { enter_scope, exit_scope } from "./scope";

/* ---------- dynamic_child ---------- */

type DynamicChildValue<T> = Sig<T> | Derive<T> | Condition | (() => T);

function resolve_dynamic_child<T>(value: DynamicChildValue<T>): T {
  return value instanceof Condition ? value.get() as T : resolve(value);
}

function collect_scope<T>(fn: () => T): { value: T; scope: (() => void)[] } {
  enter_scope();
  try {
    const value = fn();
    return { value, scope: exit_scope() };
  } catch (err) {
    const scope = exit_scope();
    for (const dispose of scope) dispose();
    throw err;
  }
}

export function dynamic_child<T>(
  value: DynamicChildValue<T>,
  factory: (value: T) => HTMLElement,
  container?: HTMLElement,
): HTMLElement {
  const node = container ?? document.createElement("div");
  if (!container) node.style.display = "contents";

  let child: HTMLElement | null = null;

  const dispose_eff = effect(() => {
    const next = resolve_dynamic_child(value);
    child = factory(next);
    node.appendChild(child);

    return () => {
      if (child?.parentNode === node) node.removeChild(child);
      child = null;
    };
  });

  auto_dispose(node, dispose_eff);

  return node;
}

/* ---------- list ---------- */

type ListRow<T, K> = {
  el: HTMLElement;
  item: Sig<T>;
  idx: Sig<number>;
  key: K;
  scope: (() => void)[];
};

export function list<T, K>(
  data: Sig<T[]> | Derive<T[]>,
  key_fn: (item: T) => K,
  factory: (item: Sig<T>, idx: Sig<number>) => HTMLElement,
  container?: HTMLElement
): HTMLElement {
  const node = container ?? document.createElement("div");
  let rows: ListRow<T, K>[] = [];

  const dispose_eff = effect(() => {
    const items = data.get();
    const newRows: ListRow<T, K>[] = [];
    const pool = new Map<K, ListRow<T, K>[]>();

    for (const row of rows) {
      const arr = pool.get(row.key);
      if (arr) arr.push(row);
      else pool.set(row.key, [row]);
    }

    for (let i = 0; i < items.length; i++) {
      const val = items[i];
      const key = key_fn(val);
      const candidates = pool.get(key);
      let row = candidates?.shift();

      if (row) {
        batch(() => {
          row.item.set(val);
          row.idx.set(i);
        });
      } else {
        const item_sig = sig(val);
        const idx_sig = sig(i);
        const created = collect_scope(() => factory(item_sig, idx_sig));
        row = { el: created.value, item: item_sig, idx: idx_sig, key, scope: created.scope };
      }

      newRows.push(row);
    }

    // Each row.scope owns every cleanup created by the row's factory
    // invocation, including effects spawned later via effects inside the row.
    // Disposing the scope cascades through Effect.dispose, which tears down
    // its own nested scopes - we do not need to walk recursively here.
    for (const arr of pool.values()) {
      for (const row of arr) {
        row.el.remove();
        for (const d of row.scope) d();
        row.item.dispose();
        row.idx.dispose();
      }
    }

    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i];
      if (node.children[i] !== row.el) {
        node.insertBefore(row.el, node.children[i] ?? null);
      }
    }

    rows = newRows;
  });

  auto_dispose(node, () => {
    dispose_eff();
    for (const row of rows) {
      row.el.remove();
      for (const d of row.scope) d();
      row.item.dispose();
      row.idx.dispose();
    }
    rows = [];
  });

  return node;
}

/* ---------- show ---------- */

export function show(
  condition: Sig<boolean> | Derive<boolean> | Condition,
  factory: () => HTMLElement
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";

  let node: HTMLElement | null = null;
  let scope: (() => void)[] = [];

  const dispose_eff = effect(() => {
    const visible = resolve(condition instanceof Condition ? () => condition.get() : condition);
    if (visible) {
      if (!node) {
        const created = collect_scope(factory);
        node = created.value;
        scope = created.scope;
      }
      if (node.parentNode !== wrapper) wrapper.appendChild(node);
    } else {
      if (node && node.parentNode === wrapper) wrapper.removeChild(node);
      for (const d of scope) d();
      scope = [];
      node = null;
    }
  });

  auto_dispose(wrapper, () => {
    dispose_eff();
    if (node && node.parentNode === wrapper) wrapper.removeChild(node);
    for (const d of scope) d();
    scope = [];
    node = null;
  });

  return wrapper;
}

/* ---------- keep ----------
 *
 * Sibling of `show` that keeps the node mounted across visibility flips.
 * Built lazily on the first true; on subsequent flips toggles `display`
 * between '' and 'none'. Scope is torn down only when the wrapper itself
 * is disconnected from the document.
 *
 * Use this when the child owns state that's expensive to rebuild - canvas
 * pixel data, scroll position, an open subscription, a paused animation -
 * and the layout is going to hide/show it repeatedly (panel tabs, dock
 * collapse, etc.). For booleans where rebuilding is cheap, prefer `show`.
 *
 * Caveat: the factory must not rely on inline `style.display` for layout;
 * keep owns that property. Use a wrapper div with `display: contents` or
 * a CSS class if the factory needs a specific display mode.
 */
export function keep(
  condition: Sig<boolean> | Derive<boolean> | Condition,
  factory: () => HTMLElement
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";

  let node: HTMLElement | null = null;
  let scope: (() => void)[] = [];

  const dispose_eff = effect(() => {
    const visible = resolve(condition instanceof Condition ? () => condition.get() : condition);
    if (visible) {
      if (!node) {
        const created = collect_scope(factory);
        node = created.value;
        scope = created.scope;
        wrapper.appendChild(node);
      }
      node.style.display = "";
    } else if (node) {
      node.style.display = "none";
    }
  });

  auto_dispose(wrapper, () => {
    dispose_eff();
    if (node && node.parentNode === wrapper) wrapper.removeChild(node);
    for (const d of scope) d();
    scope = [];
    node = null;
  });

  return wrapper;
}
