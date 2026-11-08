// The Generate button's state, host-free: one run at a time, Cancel during a run, and the second
// half of a double click ignored. The panel (main.js) draws it; the pipeline gets `cancelled` and
// `whenCancelled` from it.

// A click on Cancel this soon after Generate is the second half of a double click: ignored.
const CANCEL_GRACE_MS = 500;

/** @param {{now?: () => number, graceMs?: number}} [o] */
function createRunGate({ now = () => Date.now(), graceMs = CANCEL_GRACE_MS } = {}) {
  let busy = false;
  let startedAt = 0;
  let cancelled = false;
  let release = null;
  let whenCancelled = null;
  return {
    get busy() {
      return busy;
    },
    /** True once Cancel was clicked in the current run: send no further request. */
    cancelled: () => cancelled,
    /** Resolves when Cancel is clicked in the current run: the request in flight is dropped. */
    get whenCancelled() {
      return whenCancelled;
    },
    /**
     * A click on the Generate / Cancel button. "start": a run begins (busy at once, before anything
     * is awaited, so a second click can't start another billed run); "cancel": the run is cancelled;
     * "ignore": the second half of a double click.
     */
    click() {
      if (!busy) {
        busy = true;
        startedAt = now();
        cancelled = false;
        whenCancelled = new Promise((resolve) => (release = resolve));
        return "start";
      }
      if (now() - startedAt < graceMs) return "ignore";
      cancelled = true;
      if (release) release();
      return "cancel";
    },
    /** The run is over, however it ended. */
    finish() {
      busy = false;
      release = null;
    },
  };
}

module.exports = { createRunGate, CANCEL_GRACE_MS };
