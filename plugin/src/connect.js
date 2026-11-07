// Connect an OpenRouter account without creating or pasting a key: OAuth PKCE in OpenRouter's
// "headless" mode (no callback URL, nothing hosted by Fulla). Fulla opens openrouter.ai/auth with a
// code challenge; the user signs in and authorizes; OpenRouter shows a one-time code; the user
// pastes it in the panel; Fulla exchanges code + verifier for a key. The code alone is useless:
// the verifier never leaves this computer. Host-free (the panel supplies fetch, randomness, sleep).

const { sha256 } = require("./sha256");
const { toBase64, utf8Encode } = require("./bytes");
const { postJson, ProviderError } = require("./providers/http");

const HOST = "openrouter.ai";
// A code lasts 10 minutes. Within that time, "open the page again" reuses the same verifier, so the
// code from any page the user opened still works.
const SESSION_MS = 9 * 60 * 1000;

const b64url = (bytes) => toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** @param {(n: number) => Uint8Array} randomBytes  a cryptographic source (crypto.getRandomValues) */
function newSession(randomBytes, now = Date.now()) {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(sha256(utf8Encode(verifier)));
  // key_label is the name OpenRouter shows on its page ("Fulla requests access...") and gives the key.
  const url = `https://${HOST}/auth?code_challenge=${challenge}&code_challenge_method=S256&key_label=Fulla`;
  return { verifier, challenge, url, startedAt: now };
}

function isFresh(session, now = Date.now()) {
  return !!session && now - session.startedAt < SESSION_MS;
}

function classify(status, json, text) {
  const e = (json && json.error) || {};
  const msg = e.message || (text || "").slice(0, 200) || `HTTP ${status}`;
  const detail = `${status}: ${msg}`;
  if (/expired/i.test(msg)) {
    return new ProviderError("This code has expired (codes last 10 minutes). Click \"Open the page again\" and paste the new code.", { status, code: "code_expired", detail });
  }
  if (status === 403 || status === 400) {
    return new ProviderError("This code doesn't match. Paste the code from the last OpenRouter page you opened, or start again.", { status, code: "bad_code", detail });
  }
  if (status >= 500) return new ProviderError("OpenRouter is having trouble right now. Try again shortly.", { status, code: String(status), detail });
  return new ProviderError(`OpenRouter: ${msg}`, { status, code: String(status), detail });
}

/** Trade the pasted code for a key. Never retried: a code works once. */
async function exchangeCode({ fetch, code, verifier }) {
  const json = await postJson({
    fetch,
    url: `https://${HOST}/api/v1/auth/keys`,
    headers: {},
    body: { code: String(code || "").trim(), code_verifier: verifier, code_challenge_method: "S256" },
    classify,
    retries: 0,
    host: HOST,
  });
  if (!json.key) throw new ProviderError("OpenRouter sent no key. Try connecting again.", { code: "no_key" });
  return json.key;
}

/**
 * A new key answers 401 for a while (1 to 33 s seen on 2026-11-07). Call `check` until it works;
 * rethrow anything else at once, and the last 401 after `timeoutMs`.
 */
async function waitUntilActive({ check, sleep, timeoutMs = 90000, everyMs = 3000, now = () => Date.now() }) {
  const end = now() + timeoutMs;
  for (;;) {
    try {
      return await check();
    } catch (e) {
      if (e.status !== 401 || now() + everyMs > end) throw e;
    }
    await sleep(everyMs);
  }
}

module.exports = { newSession, isFresh, exchangeCode, waitUntilActive, SESSION_MS };
