import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLatestRunner } from './schedule';

describe('createLatestRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the task once with the latest value after the delay', async () => {
    const seen: number[] = [];
    const runner = createLatestRunner<number>(100, (value) => {
      seen.push(value);
      return Promise.resolve();
    });
    runner.push(1);
    runner.push(2);
    await vi.advanceTimersByTimeAsync(99);
    expect(seen).toEqual([]);
    runner.push(3);
    await vi.advanceTimersByTimeAsync(1);
    // Not postponed by later pushes: steady typing still updates every 100 ms.
    expect(seen).toEqual([3]);
  });

  it('runs again for values pushed while the task is busy, never twice at once', async () => {
    const seen: number[] = [];
    let finish: () => void = () => undefined;
    let running = 0;
    let maxRunning = 0;
    const runner = createLatestRunner<number>(100, async (value) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      seen.push(value);
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      running--;
    });
    runner.push(1);
    await vi.advanceTimersByTimeAsync(100);
    runner.push(2);
    runner.push(3);
    await vi.advanceTimersByTimeAsync(500);
    expect(seen).toEqual([1]);
    finish();
    await vi.advanceTimersByTimeAsync(100);
    expect(seen).toEqual([1, 3]);
    finish();
    await vi.advanceTimersByTimeAsync(500);
    expect(seen).toEqual([1, 3]);
    expect(maxRunning).toBe(1);
  });

  it('runs nothing after cancel', async () => {
    const task = vi.fn(() => Promise.resolve());
    const runner = createLatestRunner<number>(100, task);
    runner.push(1);
    runner.cancel();
    runner.push(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).not.toHaveBeenCalled();
  });

  it('keeps running after a failed task', async () => {
    const seen: number[] = [];
    const runner = createLatestRunner<number>(100, (value) => {
      seen.push(value);
      return value === 1 ? Promise.reject(new Error('broken')) : Promise.resolve();
    });
    runner.push(1);
    await vi.advanceTimersByTimeAsync(100);
    runner.push(2);
    await vi.advanceTimersByTimeAsync(100);
    expect(seen).toEqual([1, 2]);
  });
});
