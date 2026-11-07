const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { sha256 } = require("../plugin/src/sha256");
const connect = require("../plugin/src/connect");
const openrouter = require("../plugin/src/providers/openrouter");

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const { status = 200, json } = await handler(url, init, calls.length);
    return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(json) };
  };
  fn.calls = calls;
  return fn;
}

test("sha256 matches Node's crypto, padding edges included", () => {
  for (const n of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 1000]) {
    const bytes = crypto.randomBytes(n);
    assert.equal(Buffer.from(sha256(new Uint8Array(bytes))).toString("hex"), crypto.createHash("sha256").update(bytes).digest("hex"), `${n} bytes`);
  }
});

test("connect session: S256 challenge of a 43-char verifier, headless URL named Fulla, reused for 9 minutes", () => {
  const s = connect.newSession((n) => new Uint8Array(crypto.randomBytes(n)), 1000);
  assert.match(s.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(s.challenge, crypto.createHash("sha256").update(s.verifier).digest("base64url"));
  const u = new URL(s.url);
  assert.equal(u.origin + u.pathname, "https://openrouter.ai/auth");
  assert.deepEqual(Object.fromEntries(u.searchParams), { code_challenge: s.challenge, code_challenge_method: "S256", key_label: "Fulla" });
  assert.ok(connect.isFresh(s, 1000 + 8 * 60 * 1000));
  assert.ok(!connect.isFresh(s, 1000 + connect.SESSION_MS));
  assert.ok(!connect.isFresh(null));
});

test("exchangeCode: posts code and verifier once; wrong or expired codes get plain messages", async () => {
  const ok = fakeFetch(() => ({ json: { key: "sk-or-v1-new", user_id: "or_user_1" } }));
  assert.equal(await connect.exchangeCode({ fetch: ok, code: "  a7010f20-6624  ", verifier: "v" }), "sk-or-v1-new");
  assert.equal(ok.calls[0].url, "https://openrouter.ai/api/v1/auth/keys");
  assert.deepEqual(ok.calls[0].body, { code: "a7010f20-6624", code_verifier: "v", code_challenge_method: "S256" });
  // Bodies seen on 2026-11-07 (the first one in a real UXP test).
  const cases = [
    [403, { error: { message: "Invalid code or code_verifier", code: 403 } }, /doesn't match.*last OpenRouter page/],
    [403, { error: { message: "Authorization code expired", code: 403 } }, /expired.*Open the page again/],
  ];
  for (const [status, json, re] of cases) {
    const bad = fakeFetch(() => ({ status, json }));
    await assert.rejects(connect.exchangeCode({ fetch: bad, code: "c", verifier: "v" }), re);
    assert.equal(bad.calls.length, 1, "a code works once: never retried");
  }
});

test("waitUntilActive: waits out the 401s of a brand-new key, gives up after the timeout, stops on other errors", async () => {
  let t = 0;
  const sleep = async (ms) => {
    t += ms;
  };
  const now = () => t;
  const notYet = Object.assign(new Error("User not found."), { status: 401 });
  let n = 0;
  const info = await connect.waitUntilActive({ check: async () => (++n < 4 ? Promise.reject(notYet) : { usage: 0 }), sleep, now, everyMs: 3000 });
  assert.deepEqual([info, n, t], [{ usage: 0 }, 4, 9000]);
  t = 0;
  await assert.rejects(connect.waitUntilActive({ check: async () => Promise.reject(notYet), sleep, now, timeoutMs: 10000, everyMs: 3000 }), /User not found/);
  assert.ok(t <= 10000);
  t = 0;
  const offline = Object.assign(new Error("Can't reach openrouter.ai"), { code: "network" });
  await assert.rejects(connect.waitUntilActive({ check: async () => Promise.reject(offline), sleep, now }), /Can't reach/);
  assert.equal(t, 0, "no waiting on errors other than 401");
});

test("openrouter balance: credits bought minus used; null when OpenRouter won't say", async () => {
  const f = fakeFetch(() => ({ json: { data: { total_credits: 10, total_usage: 2.5 } } }));
  assert.equal(await openrouter.balance({ fetch: f, apiKey: "k" }), 7.5);
  assert.equal(f.calls[0].url, "https://openrouter.ai/api/v1/credits");
  assert.equal(f.calls[0].init.headers.Authorization, "Bearer k");
  assert.equal(await openrouter.balance({ fetch: fakeFetch(() => ({ status: 403, json: { error: { message: "Forbidden" } } })), apiKey: "k" }), null);
});
