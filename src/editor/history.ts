// Generic undo/redo history of immutable snapshots.

export const HISTORY_LIMIT = 100;

export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  /** Key of the last commit. A following commit with the same key replaces it instead of adding a step. */
  readonly mergeKey: string | null;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], mergeKey: null };
}

/**
 * Records a new present. Commits with the same `mergeKey` in a row (for example typing into
 * one field) become a single undo step.
 */
export function commit<T>(history: History<T>, next: T, mergeKey?: string): History<T> {
  if (Object.is(next, history.present)) return history;
  if (mergeKey !== undefined && mergeKey === history.mergeKey) {
    return { ...history, present: next, future: [] };
  }
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    mergeKey: mergeKey ?? null,
  };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous as T,
    future: [history.present, ...history.future],
    mergeKey: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (history.future.length === 0) return history;
  return {
    past: [...history.past, history.present],
    present: next as T,
    future: rest,
    mergeKey: null,
  };
}

export const canUndo = (history: History<unknown>): boolean => history.past.length > 0;
export const canRedo = (history: History<unknown>): boolean => history.future.length > 0;
