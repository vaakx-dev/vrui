// ============================================================
// vrui - DOM lifecycle ownership + cleanup-aware listeners
// ============================================================

import type { Cleanup } from "./core";
import { has_scope, once, scoped } from "./scope";

type DisconnectRegistration = {
  callback: () => void;
  release: () => void;
};

type MountRegistration = {
  callback: (node: Node) => Cleanup;
  cleanup?: () => void;
  release: () => void;
};

type LifecycleState = {
  connected: boolean;
  disconnects: Set<DisconnectRegistration>;
  mounts: Set<MountRegistration>;
};

const lifecycles = new WeakMap<Node, LifecycleState>();
let observer: MutationObserver | undefined;

function is_connected(node: Node): boolean {
  return node.isConnected;
}

function state_for(node: Node): LifecycleState {
  const existing = lifecycles.get(node);
  if (existing) return existing;

  const state: LifecycleState = {
    connected: is_connected(node),
    disconnects: new Set(),
    mounts: new Set(),
  };
  lifecycles.set(node, state);
  return state;
}

function prune(node: Node, state: LifecycleState): void {
  if (state.disconnects.size || state.mounts.size) return;
  if (lifecycles.get(node) === state) lifecycles.delete(node);
}

function collect_registered(root: Node, found: Set<Node>): void {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (lifecycles.has(node)) found.add(node);

    for (let child = node.firstChild; child; child = child.nextSibling) {
      pending.push(child);
    }
  }
}

function run_mount(
  node: Node,
  state: LifecycleState,
  registration: MountRegistration,
): void {
  if (!state.mounts.has(registration)) return;

  let cleanup: Cleanup;
  try {
    cleanup = registration.callback(node);
  } catch (error) {
    state.mounts.delete(registration);
    registration.release();
    prune(node, state);
    throw error;
  }

  if (typeof cleanup === "function") {
    registration.cleanup = once(cleanup);
    return;
  }

  state.mounts.delete(registration);
  registration.release();
  prune(node, state);
}

function connect(node: Node, state: LifecycleState): void {
  state.connected = true;

  const errors: unknown[] = [];
  for (const registration of [...state.mounts]) {
    try {
      run_mount(node, state, registration);
    } catch (error) {
      errors.push(error);
    }
  }

  throw_errors(errors);
}

function disconnect(node: Node, state: LifecycleState): void {
  lifecycles.delete(node);
  state.connected = false;

  const callbacks: (() => void)[] = [];
  for (const registration of state.disconnects) {
    registration.release();
    callbacks.push(registration.callback);
  }
  state.disconnects.clear();

  for (const registration of state.mounts) {
    registration.release();
    if (registration.cleanup) callbacks.push(registration.cleanup);
  }
  state.mounts.clear();

  const errors: unknown[] = [];
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }

  throw_errors(errors);
}

function throw_errors(errors: unknown[]): void {
  if (errors.length === 0) return;
  if (errors.length === 1) throw errors[0];
  throw new AggregateError(errors, "vrui: multiple lifecycle callbacks failed");
}

function flush(mutations: MutationRecord[]): void {
  const added = new Set<Node>();
  const affected = new Set<Node>();

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      collect_registered(node, added);
      collect_registered(node, affected);
    }
    for (const node of mutation.removedNodes) {
      collect_registered(node, affected);
    }
  }

  const errors: unknown[] = [];
  for (const node of affected) {
    const state = lifecycles.get(node);
    if (!state) continue;

    if (is_connected(node)) {
      if (!state.connected) {
        try {
          connect(node, state);
        } catch (error) {
          errors.push(error);
        }
      }
      continue;
    }

    if (!state.connected && !added.has(node)) continue;

    try {
      disconnect(node, state);
    } catch (error) {
      errors.push(error);
    }
  }

  throw_errors(errors);
}

function ensure_observer(): void {
  if (observer || typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return;
  }

  observer = new MutationObserver(flush);
  observer.observe(document, { childList: true, subtree: true });
}

/**
 * Run a callback once the node has been connected and is later disconnected.
 * The returned function cancels the pending registration without running it.
 */
export function on_disconnect(node: Node, callback: () => void): () => void {
  ensure_observer();
  const state = state_for(node);

  let tracked_node: Node | undefined = node;
  let tracked_state: LifecycleState | undefined = state;
  let tracked_registration: DisconnectRegistration | undefined;

  const release = () => {
    tracked_node = undefined;
    tracked_state = undefined;
    tracked_registration = undefined;
  };

  const registration: DisconnectRegistration = { callback, release };
  tracked_registration = registration;
  state.disconnects.add(registration);

  const cancel = once(() => {
    const current_node = tracked_node;
    const current_state = tracked_state;
    const current_registration = tracked_registration;
    release();
    if (!current_node || !current_state || !current_registration) return;

    current_state.disconnects.delete(current_registration);
    prune(current_node, current_state);
  });

  return scoped(cancel);
}

/**
 * Run a callback once the node is connected. A returned cleanup runs when the
 * node disconnects or when the returned disposer is called.
 */
export function on_mount(node: Node, callback: (node: Node) => Cleanup): () => void {
  ensure_observer();
  const state = state_for(node);

  let tracked_node: Node | undefined = node;
  let tracked_state: LifecycleState | undefined = state;
  let tracked_registration: MountRegistration | undefined;

  const release = () => {
    tracked_node = undefined;
    tracked_state = undefined;
    tracked_registration = undefined;
  };

  const registration: MountRegistration = { callback, release };
  tracked_registration = registration;
  state.mounts.add(registration);

  const dispose = once(() => {
    const current_node = tracked_node;
    const current_state = tracked_state;
    const current_registration = tracked_registration;
    release();
    if (!current_node || !current_state || !current_registration) return;

    current_state.mounts.delete(current_registration);
    prune(current_node, current_state);
    current_registration.cleanup?.();
  });

  if (is_connected(node)) {
    if (state.connected) {
      run_mount(node, state, registration);
    } else {
      connect(node, state);
    }
  }

  return scoped(dispose);
}

/** Tie cleanup to the active scope, or to the node's mounted lifetime. */
export function auto_dispose(node: Node, cleanup: () => void): () => void {
  const run_cleanup = once(cleanup);
  if (has_scope()) return scoped(run_cleanup);

  const cancel_disconnect = on_disconnect(node, run_cleanup);
  return once(() => {
    cancel_disconnect();
    run_cleanup();
  });
}

export function listen(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  target.addEventListener(event, handler, options);
  return scoped(once(() => target.removeEventListener(event, handler, options)));
}

export function on_target(
  owner: Node,
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  const stop = listen(target, event, handler, options);
  const cancel_disconnect = on_disconnect(owner, stop);

  return once(() => {
    cancel_disconnect();
    stop();
  });
}

export function on_window(
  owner: Node,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  return on_target(owner, window, event, handler, options);
}

export function on_document(
  owner: Node,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  return on_target(owner, document, event, handler, options);
}
