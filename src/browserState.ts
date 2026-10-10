// ============================================================
// vrui - browser-backed signals (storage, media queries, clock)
// ============================================================

import { derive, Sig, sig, type Derive } from "./core";
import { onInterval, onMedia } from "./browser";

export type StoredValidator = (value: unknown) => boolean;

function load<T>(key: string, fallback: T, valid: StoredValidator): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const value: unknown = JSON.parse(saved);
    return valid(value) ? value as T : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the signal keeps its value in memory.
  }
}

class StoredSig<T> extends Sig<T> {
  readonly key: string;

  constructor(key: string, value: T) {
    super(value);
    this.key = key;
  }

  override set(value: T): void {
    super.set(value);
    save(this.key, value);
  }
}

function sameType(fallback: unknown): StoredValidator {
  return (value) => typeof value === typeof fallback && Array.isArray(value) === Array.isArray(fallback);
}

/**
 * A signal persisted as JSON in localStorage under `key`. A missing, unreadable,
 * or invalid saved value yields `fallback`; by default a saved value must have
 * the same type as the fallback.
 */
export function stored<T>(key: string, fallback: T, valid: StoredValidator = sameType(fallback)): Sig<T> {
  return new StoredSig(key, load(key, fallback, valid));
}

/** Whether a media query matches, updated while the active scope lives. */
export function media(query: string): Derive<boolean> {
  const matches = sig(false);
  onMedia(query, (value) => matches.set(value));
  return derive(() => matches.get());
}

/** The current time in milliseconds, updated every `ms` while the active scope lives. */
export function clock(ms = 1000): Derive<number> {
  const now = sig(Date.now());
  onInterval(() => now.set(Date.now()), ms);
  return derive(() => now.get());
}
