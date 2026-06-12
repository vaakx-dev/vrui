// ============================================================
// vrui - flow control (list, show)
// ============================================================

import { batch, Condition, Derive, effect, resolve, sig, Sig } from "./core";
import { auto_dispose } from "./dom";
import { collect_scope, dispose_all, type Disposer } from "./scope";

/* ---------- dynamic_child ---------- */

type DynamicChildValue<T> = Sig<T> | Derive<T> | Condition | (() => T);

function resolve_dynamic_child<T>(value: DynamicChildValue<T>): T {
  return value instanceof Condition ? value.get() as T : resolve(value);
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
  scope: Disposer[];
};

function pool_row<T, K>(pool: Map<K, ListRow<T, K>[]>, row: ListRow<T, K>): void {
  const rows = pool.get(row.key);
  if (!rows) {
    pool.set(row.key, [row]);
    return;
  }

  rows.push(row);
}

function take_pooled_row<T, K>(
  pool: Map<K, ListRow<T, K>[]>,
  key: K,
): ListRow<T, K> | undefined {
  const rows = pool.get(key);
  if (!rows) return undefined;

  const row = rows.shift();
  if (!rows.length) pool.delete(key);
  return row;
}

function dispose_row<T, K>(row: ListRow<T, K>): void {
  row.el.remove();
  dispose_all(row.scope);
  row.item.dispose();
  row.idx.dispose();
}

function dispose_rows<T, K>(rows: Iterable<ListRow<T, K>>): void {
  for (const row of rows) dispose_row(row);
}

function dispose_pool<T, K>(pool: Map<K, ListRow<T, K>[]>): void {
  for (const rows of pool.values()) dispose_rows(rows);
}

function create_row<T, K>(
  item: T,
  index: number,
  key: K,
  factory: (item: Sig<T>, idx: Sig<number>) => HTMLElement,
): ListRow<T, K> {
  const item_sig = sig(item);
  const idx_sig = sig(index);
  const created = collect_scope(() => factory(item_sig, idx_sig));
  return { el: created.value, item: item_sig, idx: idx_sig, key, scope: created.scope };
}

function update_row<T, K>(row: ListRow<T, K>, item: T, index: number): void {
  batch(() => {
    row.item.set(item);
    row.idx.set(index);
  });
}

function reuse_or_create_row<T, K>(
  pool: Map<K, ListRow<T, K>[]>,
  item: T,
  index: number,
  key: K,
  factory: (item: Sig<T>, idx: Sig<number>) => HTMLElement,
): ListRow<T, K> {
  const row = take_pooled_row(pool, key);
  if (!row) return create_row(item, index, key, factory);

  update_row(row, item, index);
  return row;
}

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
    const new_rows: ListRow<T, K>[] = [];
    const pool = new Map<K, ListRow<T, K>[]>();

    for (const row of rows) {
      pool_row(pool, row);
    }

    for (let i = 0; i < items.length; i++) {
      const val = items[i];
      const key = key_fn(val);
      new_rows.push(reuse_or_create_row(pool, val, i, key, factory));
    }

    // Each row.scope owns every cleanup created by the row's factory
    // invocation, including effects spawned later via effects inside the row.
    // Disposing the scope cascades through Effect.dispose, which tears down
    // its own nested scopes - we do not need to walk recursively here.
    dispose_pool(pool);

    for (let i = 0; i < new_rows.length; i++) {
      const row = new_rows[i];
      if (node.children[i] !== row.el) {
        node.insertBefore(row.el, node.children[i] ?? null);
      }
    }

    rows = new_rows;
  });

  auto_dispose(node, () => {
    dispose_eff();
    dispose_rows(rows);
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
  let scope: Disposer[] = [];

  const dispose_child = () => {
    if (node?.parentNode === wrapper) node.remove();
    dispose_all(scope);
    scope = [];
    node = null;
  };

  const ensure_child = () => {
    if (node) return;

    const created = collect_scope(factory);
    node = created.value;
    scope = created.scope;
  };

  const dispose_eff = effect(() => {
    const visible = resolve(condition instanceof Condition ? () => condition.get() : condition);
    if (!visible) {
      dispose_child();
      return;
    }

    ensure_child();
    if (node!.parentNode === wrapper) return;
    wrapper.appendChild(node!);
  });

  auto_dispose(wrapper, () => {
    dispose_eff();
    dispose_child();
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
  let scope: Disposer[] = [];

  const ensure_child = () => {
    if (node) return;

    const created = collect_scope(factory);
    node = created.value;
    scope = created.scope;
    wrapper.appendChild(node);
  };

  const dispose_child = () => {
    if (node?.parentNode === wrapper) node.remove();
    dispose_all(scope);
    scope = [];
    node = null;
  };

  const dispose_eff = effect(() => {
    const visible = resolve(condition instanceof Condition ? () => condition.get() : condition);
    if (!visible) {
      if (!node) return;
      node.style.display = "none";
      return;
    }

    ensure_child();
    node!.style.display = "";
  });

  auto_dispose(wrapper, () => {
    dispose_eff();
    dispose_child();
  });

  return wrapper;
}
