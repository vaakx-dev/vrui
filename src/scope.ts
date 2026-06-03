// ============================================================
// vrui - scope
// ============================================================

const scope_stack: (() => void)[][] = [];

export function enter_scope(): void {
  scope_stack.push([]);
}

export function exit_scope(): (() => void)[] {
  return scope_stack.pop()!;
}

export function register_in_scope(dispose: () => void): void {
  if (scope_stack.length) scope_stack[scope_stack.length - 1].push(dispose);
}

export function has_scope(): boolean {
  return scope_stack.length > 0;
}
