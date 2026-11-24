export interface LatestRunner<T> {
  /** Remembers the value; the task runs with the latest value at most every delayMs. */
  push(value: T): void;
  /** Stops all future runs (a run in progress finishes). */
  cancel(): void;
}

/**
 * Runs an async task with the most recent value: delayMs after the first push, then again for
 * values pushed while it was running. Never runs two tasks at once. Edits in quick succession
 * (typing) become one update instead of one per keystroke, but are never postponed for longer.
 */
export function createLatestRunner<T>(
  delayMs: number,
  task: (value: T) => Promise<void>,
): LatestRunner<T> {
  let latest: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let cancelled = false;

  function schedule() {
    if (cancelled || timer !== null || running || latest === null) return;
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delayMs);
  }

  async function run() {
    if (cancelled || latest === null) return;
    const { value } = latest;
    latest = null;
    running = true;
    try {
      await task(value);
    } catch {
      // A failed update leaves the previous preview; the next edit tries again.
    } finally {
      running = false;
    }
    schedule();
  }

  return {
    push(value) {
      if (cancelled) return;
      latest = { value };
      schedule();
    },
    cancel() {
      cancelled = true;
      latest = null;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
