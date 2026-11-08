// Shared HTTP for providers: JSON POST, retries on transient errors, friendly error messages.

class ProviderError extends Error {
  constructor(message, { status = 0, code = "", retryable = false, detail = "", retryAfterMs = 0 } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.detail = detail;
    this.retryAfterMs = retryAfterMs;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// How long a request may take before Fulla gives up on it. Image models take from seconds to a
// couple of minutes; a quick check (is this key valid?) should answer in seconds.
const TIMEOUT_MS = { POST: 5 * 60 * 1000, GET: 20 * 1000 };

const cancelledError = () => new ProviderError("Cancelled. Nothing was changed.", { code: "cancelled" });

/**
 * POST JSON and parse JSON. `classify(status, body)` turns an error response into a ProviderError.
 * Retries retryable errors up to `retries` times with exponential backoff + jitter. Only refusals
 * that are sure to have cost nothing are retryable (classify decides: rate limit, provider
 * unavailable); a network failure is not retried, as the request may have gone through.
 * Once `cancelled()` is true no new request is sent (each one may be billed): it throws instead.
 * When `whenCancelled` resolves, the request in flight is dropped at once (its reply is ignored).
 * A request that takes longer than `timeoutMs` fails and is not retried: it may still be billed.
 */
async function postJson({ fetch, url, headers, body, classify, retries = 2, host, cancelled, whenCancelled, timeoutMs }) {
  return requestJson({ fetch, url, headers, body, classify, retries, host, method: "POST", cancelled, whenCancelled, timeoutMs });
}

/** GET JSON, no retries: used for quick checks the user is waiting on (is this key valid?). */
async function getJson({ fetch, url, headers, classify, host, timeoutMs }) {
  return requestJson({ fetch, url, headers, classify, retries: 0, host, method: "GET", timeoutMs });
}

/**
 * The response and its text, or a ProviderError when the deadline passes ("timeout") or the run is
 * cancelled ("cancelled") first. Network failures reject with the fetch's own error.
 */
function exchange(fetch, url, init, { timeoutMs, whenCancelled, host, method }) {
  const abort = typeof AbortController === "function" ? new AbortController() : null;
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, v) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (fn === reject && abort) abort.abort();
      fn(v);
    };
    const minutes = Math.round(timeoutMs / 60000);
    const timer = setTimeout(
      () =>
        finish(
          reject,
          new ProviderError(
            method === "GET"
              ? `${host} didn't answer in time. Check your internet connection and try again.`
              : `${host} didn't answer within ${minutes} minute${minutes === 1 ? "" : "s"}. Nothing was changed; try again (if it finished on their side, it may still be billed).`,
            { code: "timeout" }
          )
        ),
      timeoutMs
    );
    if (whenCancelled) whenCancelled.then(() => finish(reject, cancelledError()));
    Promise.resolve()
      .then(() => fetch(url, abort ? { ...init, signal: abort.signal } : init))
      .then(async (res) => ({ res, text: await res.text() }))
      .then((v) => finish(resolve, v), (e) => finish(reject, e));
  });
}

async function requestJson({ fetch, url, headers, body, classify, retries, host, method, cancelled, whenCancelled, timeoutMs }) {
  const deadline = timeoutMs || TIMEOUT_MS[method];
  let dropped = false;
  if (whenCancelled) whenCancelled.then(() => (dropped = true));
  const isCancelled = () => dropped || (cancelled && cancelled());
  // Waits between attempts end early on Cancel.
  const pause = (ms) =>
    new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      if (whenCancelled) whenCancelled.then(() => (clearTimeout(t), resolve()));
    });
  let attempt = 0;
  for (;;) {
    if (isCancelled()) throw cancelledError();
    let res;
    let text;
    try {
      ({ res, text } = await exchange(
        fetch,
        url,
        method === "GET"
          ? { method, headers: { ...headers } }
          : { method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) },
        { timeoutMs: deadline, whenCancelled, host, method }
      ));
    } catch (e) {
      if (e instanceof ProviderError) throw e; // timeout or cancelled: never retried
      // Not retried either: the connection may have dropped after the provider took the request.
      throw new ProviderError(`Can't reach ${host}. Check your internet connection.`, {
        code: "network",
        detail: String((e && e.message) || e),
      });
    }
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = null;
    }
    if (res.ok && json) return json;
    const err = res.ok
      ? new ProviderError(`${host} sent a response Fulla couldn't read.`, { status: res.status, detail: text.slice(0, 300) })
      : classify(res.status, json, text);
    if (err.retryable && attempt++ < retries) {
      const after = Number(res.headers && res.headers.get && res.headers.get("retry-after"));
      const wait = err.retryAfterMs > 0 ? err.retryAfterMs : after > 0 ? after * 1000 : backoff(attempt);
      await pause(Math.min(wait, 30000));
      continue;
    }
    throw err;
  }
}

function backoff(attempt) {
  return Math.min(8000, 1000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 400);
}

module.exports = { ProviderError, postJson, getJson, sleep, TIMEOUT_MS };
