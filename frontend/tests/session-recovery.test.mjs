import assert from "node:assert/strict";
import test from "node:test";
import { createSessionRecovery } from "../src/services/api/session-recovery.js";

function setup(refreshTokens) {
  let tokens = { access: "expired", refresh: "refresh-one" };
  let expired = 0;
  const recovery = createSessionRecovery({
    getTokens: () => tokens,
    setTokens: (next) => { tokens = next; },
    refreshTokens,
    onExpired: () => { expired++; },
  });
  return { recovery, getTokens: () => tokens, setTokens: (next) => { tokens = next; }, expired: () => expired };
}

test("concurrent 401s share one refresh and retain the refresh token", async () => {
  let requests = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const session = setup(async () => { requests++; await gate; return { access: "renewed" }; });
  const old = session.getTokens();
  const work = [session.recovery.recover(old), session.recovery.recover(old), session.recovery.recover(old)];
  release();
  assert.deepEqual(await Promise.all(work), ["renewed", "renewed", "renewed"]);
  assert.equal(requests, 1);
  assert.deepEqual(session.getTokens(), { access: "renewed", refresh: "refresh-one" });
  assert.equal(await session.recovery.recover(old), "renewed");
  assert.equal(requests, 1);
});

test("rejected refresh expires the session once", async () => {
  const session = setup(async () => { throw Object.assign(new Error("Expired"), { status: 401 }); });
  const old = session.getTokens();
  assert.deepEqual(await Promise.all([session.recovery.recover(old), session.recovery.recover(old)]), [null, null]);
  assert.equal(session.getTokens(), null);
  assert.equal(session.expired(), 1);
});

test("network and server errors preserve tokens and allow a retry", async () => {
  let attempts = 0;
  const session = setup(async () => {
    attempts++;
    if (attempts === 1) throw new TypeError("Network offline");
    if (attempts === 2) throw Object.assign(new Error("Unavailable"), { status: 503 });
    return { access: "renewed", refresh: "rotated" };
  });
  const old = session.getTokens();
  await assert.rejects(session.recovery.recover(old), /offline/);
  await assert.rejects(session.recovery.recover(old), /Unavailable/);
  assert.equal(session.getTokens(), old);
  assert.equal(session.expired(), 0);
  assert.equal(await session.recovery.recover(old), "renewed");
  assert.equal(session.getTokens().refresh, "rotated");
});

test("refresh finishing after sign-out cannot restore the old session", async () => {
  let release;
  const session = setup(() => new Promise((resolve) => { release = resolve; }));
  const work = session.recovery.recover(session.getTokens());
  session.setTokens(null);
  release({ access: "old-account-renewed" });
  assert.equal(await work, null);
  assert.equal(session.getTokens(), null);
});

test("old failures cannot overwrite or clear another account's tokens", async () => {
  for (const fail of [false, true]) {
    let finish;
    const session = setup(() => new Promise((resolve, reject) => { finish = fail ? reject : resolve; }));
    const old = session.getTokens();
    const work = session.recovery.recover(old);
    const replacement = { access: "another-account", refresh: "different-refresh" };
    session.setTokens(replacement);
    finish(fail ? Object.assign(new Error("Expired"), { status: 401 }) : { access: "stale-renewal" });
    assert.equal(await work, null);
    assert.equal(session.getTokens(), replacement);
    assert.equal(session.expired(), 0);
    assert.equal(await session.recovery.recover(old), null);
    session.recovery.expire(old);
    assert.equal(session.getTokens(), replacement);
  }
});

test("legacy access-only sessions request sign-in instead of retrying forever", async () => {
  const session = setup(async () => { throw new Error("Must not refresh"); });
  session.setTokens({ access: "expired" });
  assert.equal(await session.recovery.recover(session.getTokens()), null);
  assert.equal(session.expired(), 1);
});
