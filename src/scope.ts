// ============================================================
// vrui - scope
// ============================================================

export type Disposer = () => void;

export type ScopedValue<T> = {
  value: T;
  scope: Disposer[];
};

const scope_stack: Disposer[][] = [];

export function enter_scope(): void {
  scope_stack.push([]);
}

export function exit_scope(): Disposer[] {
  const scope = scope_stack.pop();
  if (!scope) throw new Error("vrui: exit_scope called without matching enter_scope");
  return scope;
}

export function register_in_scope(dispose: Disposer): void {
  if (scope_stack.length) scope_stack[scope_stack.length - 1].push(dispose);
}

export function has_scope(): boolean {
  return scope_stack.length > 0;
}

export function dispose_all(disposers: Iterable<Disposer>): void {
  for (const dispose of disposers) dispose();
}

export function collect_scope<T>(fn: () => T): ScopedValue<T> {
  enter_scope();
  try {
    const value = fn();
    return { value, scope: exit_scope() };
  } catch (err) {
    dispose_all(exit_scope());
    throw err;
  }
}

export function once(dispose: Disposer): Disposer {
  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;
    dispose();
  };
}

export function scoped(dispose: Disposer): Disposer {
  if (has_scope()) register_in_scope(dispose);
  return dispose;
}
