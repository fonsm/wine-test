import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, canRedo, canUndo, commit, createHistory, redo, undo } from './history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const history = createHistory('a');
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('undoes and redoes commits in order', () => {
    let history = createHistory('a');
    history = commit(history, 'b');
    history = commit(history, 'c');

    history = undo(history);
    expect(history.present).toBe('b');
    history = undo(history);
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);

    history = redo(history);
    expect(history.present).toBe('b');
    history = redo(history);
    expect(history.present).toBe('c');
    expect(canRedo(history)).toBe(false);
  });

  it('undo and redo do nothing at the ends', () => {
    const history = createHistory('a');
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });

  it('a new commit after undo clears the redo stack', () => {
    let history = commit(commit(createHistory('a'), 'b'), 'c');
    history = undo(history);
    history = commit(history, 'd');
    expect(history.present).toBe('d');
    expect(canRedo(history)).toBe(false);
    expect(undo(history).present).toBe('b');
  });

  it('ignores commits that do not change anything', () => {
    const history = createHistory('a');
    expect(commit(history, 'a')).toBe(history);
  });

  it('merges consecutive commits with the same key into one undo step', () => {
    let history = createHistory('');
    history = commit(history, 'H', 'typing');
    history = commit(history, 'Ha', 'typing');
    history = commit(history, 'Hal', 'typing');
    history = commit(history, 'Hallo', 'typing');
    expect(history.present).toBe('Hallo');
    expect(undo(history).present).toBe('');
  });

  it('does not merge across a different key, no key, or an undo', () => {
    let history = createHistory('0');
    history = commit(history, '1', 'a');
    history = commit(history, '2', 'b');
    history = commit(history, '3');
    history = commit(history, '4', 'b');
    expect(history.past).toEqual(['0', '1', '2', '3']);

    history = undo(history);
    history = commit(history, '5', 'b');
    expect(history.past).toEqual(['0', '1', '2', '3']);
    expect(history.present).toBe('5');
  });

  it(`keeps at most ${String(HISTORY_LIMIT)} undo steps`, () => {
    let history = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) history = commit(history, i);
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(10);
  });
});
