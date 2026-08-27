import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

// Set NODE_ENV before importing the server so the module doesn't
// auto-start on a port. The server.mjs guard (`if (process.env.NODE_ENV !==
// 'test')`) relies on this being in place at import time.
process.env.NODE_ENV = 'test';

// KILO_SHARED_SECRET must be set before the module is evaluated because
// server.mjs reads it at the top level into `SHARED_SECRET`.
const TEST_SECRET = 'test-secret-for-unit-tests';
process.env.KILO_SHARED_SECRET = TEST_SECRET;

// Import the REAL app — the one that actually ships.
// Any change to requireSharedSecret or route registration in server.mjs
// is now immediately reflected here without any manual mirroring.
const { default: app } = await import('../api/server.mjs');

test('management API auth: health ok, protected endpoints require secret', async () => {
  // Bind to an ephemeral port so tests can run in parallel without conflicts.
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    // ── /api/health is public ────────────────────────────────────────────────
    const h = await fetch(`${base}/api/health`);
    assert.equal(h.status, 200, 'health should return 200');
    const hBody = await h.json();
    assert.equal(hBody.status, 'ok', 'health body should have status: ok');

    // ── /api/audit-log requires the secret ──────────────────────────────────
    const noSecret = await fetch(`${base}/api/audit-log`);
    assert.equal(noSecret.status, 401, 'audit-log without secret should be 401');

    const wrongSecret = await fetch(`${base}/api/audit-log`, {
      headers: { 'x-kilo-secret': 'wrong-secret' },
    });
    assert.equal(wrongSecret.status, 401, 'audit-log with wrong secret should be 401');

    const goodSecret = await fetch(`${base}/api/audit-log`, {
      headers: { 'x-kilo-secret': TEST_SECRET },
    });
    assert.equal(goodSecret.status, 200, 'audit-log with correct secret should be 200');

    // ── /api/jobs requires the secret ───────────────────────────────────────
    const jobsNoSecret = await fetch(`${base}/api/jobs`);
    assert.equal(jobsNoSecret.status, 401, 'jobs without secret should be 401');

    const jobsGood = await fetch(`${base}/api/jobs`, {
      headers: { 'x-kilo-secret': TEST_SECRET },
    });
    assert.equal(jobsGood.status, 200, 'jobs with correct secret should be 200');

    // ── /api/commands/* requires the secret ─────────────────────────────────
    const cmdNoSecret = await fetch(`${base}/api/commands/create-article`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Test', body: '<p>Test</p>' }),
    });
    assert.equal(cmdNoSecret.status, 401, 'commands without secret should be 401');

    // ── KILO_APPROVE_PUBLISHING gate blocks direct publication ───────────────
    // Make sure the env gate is NOT set (default) so the 403 fires.
    delete process.env.KILO_APPROVE_PUBLISHING;
    const pubAttempt = await fetch(`${base}/api/commands/manage-article-status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-kilo-secret': TEST_SECRET,
      },
      body: JSON.stringify({ id: 1, status: 'publie', change: true }),
    });
    assert.equal(pubAttempt.status, 403, 'direct publication without KILO_APPROVE_PUBLISHING should be 403');

  } finally {
    server.close();
    await once(server, 'close');
  }
});
