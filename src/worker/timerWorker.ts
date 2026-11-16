/**
 * Precision drift-free Web Worker code.
 * Calculates drift relative to performance.now() and compensates interval delays,
 * ensuring timing precision even when the main browser thread is busy rendering KaTeX or DOM nodes.
 */

export interface TimerMessageToWorker {
  action: 'START' | 'PAUSE' | 'RESUME' | 'STOP';
  initialSeconds?: number;
  autoSaveIntervalSeconds?: number;
}

export interface TimerMessageFromWorker {
  type: 'TICK' | 'AUTO_SAVE' | 'EXPIRED';
  remainingSeconds: number;
  driftMs: number;
}

export const WORKER_INLINE_SCRIPT = `
let timerId = null;
let expectedTime = 0;
let remainingSeconds = 0;
let autoSaveInterval = 10;
let autoSaveCounter = 0;
let isRunning = false;

self.onmessage = function(e) {
  const { action, initialSeconds, autoSaveIntervalSeconds } = e.data;

  if (action === 'START') {
    if (initialSeconds !== undefined) {
      remainingSeconds = Math.max(0, initialSeconds);
    }
    if (autoSaveIntervalSeconds !== undefined) {
      autoSaveInterval = autoSaveIntervalSeconds;
    }
    autoSaveCounter = 0;
    isRunning = true;
    expectedTime = performance.now() + 1000;
    scheduleNextTick();
  } else if (action === 'PAUSE' || action === 'STOP') {
    isRunning = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  } else if (action === 'RESUME') {
    if (!isRunning && remainingSeconds > 0) {
      isRunning = true;
      expectedTime = performance.now() + 1000;
      scheduleNextTick();
    }
  }
};

function scheduleNextTick() {
  if (!isRunning) return;

  const now = performance.now();
  const drift = now - (expectedTime - 1000);
  const nextInterval = Math.max(0, 1000 - (now - expectedTime));

  timerId = setTimeout(() => {
    if (!isRunning) return;

    remainingSeconds = Math.max(0, remainingSeconds - 1);
    autoSaveCounter += 1;

    self.postMessage({
      type: 'TICK',
      remainingSeconds: remainingSeconds,
      driftMs: Math.round(drift)
    });

    if (autoSaveCounter >= autoSaveInterval) {
      autoSaveCounter = 0;
      self.postMessage({
        type: 'AUTO_SAVE',
        remainingSeconds: remainingSeconds,
        driftMs: Math.round(drift)
      });
    }

    if (remainingSeconds <= 0) {
      isRunning = false;
      self.postMessage({
        type: 'EXPIRED',
        remainingSeconds: 0,
        driftMs: Math.round(drift)
      });
      return;
    }

    expectedTime += 1000;
    scheduleNextTick();
  }, nextInterval);
}
`;

/**
 * Creates a drift-free Worker instance safely across browsers and environments.
 */
export function createPrecisionTimerWorker(): Worker {
  const blob = new Blob([WORKER_INLINE_SCRIPT], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);
  return worker;
}
