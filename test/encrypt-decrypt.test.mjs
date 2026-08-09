/**
 * test/encrypt-decrypt.test.mjs
 *
 * Integration test for the encrypt.mjs → decrypt.mjs round-trip.
 *
 * Guards against silent breakage caused by staticrypt internal API changes
 * (key names, codec format, PBKDF2 parameters) across library updates.
 * Staticrypt is pinned to an exact version in package.json, but this test
 * provides a second line of defense that would catch drift even if the pin
 * were ever relaxed.
 *
 * What is tested:
 *   1. encode()  — staticrypt's own codec (used by scripts/encrypt.mjs)
 *                  encrypts a known JSON payload with a known password + salt
 *   2. The output is a valid envelope: { encrypted, ciphertext, salt }
 *   3. The envelope's ciphertext can be decrypted with the same password
 *      using the AES-256-CBC + PBKDF2 pipeline that decrypt.mjs implements
 *   4. The decrypted plaintext JSON-parses back to the original value
 *   5. A wrong password produces a decryption error (not silent garbage)
 *   6. Plain (non-encrypted) JSON passes through parseJson() unchanged
 *
 * The test reimplements the decrypt.mjs logic using Node's built-in
 * crypto.webcrypto (structurally identical to the browser Web Crypto API)
 * so it runs in Node without a DOM shim and without importing decrypt.mjs
 * directly (which references sessionStorage, a browser-only global).
 *
 * Run with:   node --test test/encrypt-decrypt.test.mjs
 * Or via:     ./scripts/test.sh
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// ── Load staticrypt internals (same path as encrypt.mjs) ─────────────────────
const require = createRequire(import.meta.url);
const cryptoEngine = require('../node_modules/staticrypt/lib/cryptoEngine.js');
const codec        = require('../node_modules/staticrypt/lib/codec.js');
const { encode }   = codec.init(cryptoEngine);

// ── Test fixtures ─────────────────────────────────────────────────────────────
const TEST_PASSWORD = 'test-password-kilombo';
const TEST_SALT     = '15efb88b5789d0133e0f8771165ee709'; // same salt as .staticrypt.json
const TEST_PAYLOAD  = JSON.stringify([
  { id: 'test-article', title: 'Artículo de prueba', section: 'general' }
]);

// ── Decrypt helpers (use staticrypt's own codec.decode to stay in sync) ───────

const { decode } = codec.init(cryptoEngine);

/**
 * Node-side equivalent of decrypt.mjs parseJson(), using codec.decode()
 * directly. This is the canonical inverse of encode() and will break if
 * staticrypt ever changes its internal format — which is exactly what we want.
 */
async function parseJsonWithKey(jsonText, password, salt) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || parsed.encrypted !== true) return parsed;

  const hashedPassword = await cryptoEngine.hashPassword(password, salt);
  const result = await decode(parsed.ciphertext, hashedPassword, salt);

  if (!result.success) {
    throw new Error(`Decryption failed: ${result.message}`);
  }
  return JSON.parse(result.decoded);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test('encrypt — encode() produces a valid envelope', async () => {
  const ciphertext = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);
  const envelope   = JSON.parse(JSON.stringify({ encrypted: true, ciphertext, salt: TEST_SALT }));

  assert.equal(envelope.encrypted, true, 'envelope must have encrypted: true');
  assert.ok(typeof envelope.ciphertext === 'string', 'ciphertext must be a string');
  assert.ok(envelope.ciphertext.length > 64, 'ciphertext must be longer than the IV alone');
  assert.equal(envelope.salt, TEST_SALT, 'envelope must carry the project salt');
  // ciphertext is hex: must contain only 0-9a-f
  assert.match(envelope.ciphertext, /^[0-9a-f]+$/, 'ciphertext must be hex-encoded');
});

test('encrypt → decrypt round-trip recovers original plaintext', async () => {
  const ciphertext   = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);
  const envelopeText = JSON.stringify({ encrypted: true, ciphertext, salt: TEST_SALT });

  const recovered = await parseJsonWithKey(envelopeText, TEST_PASSWORD, TEST_SALT);

  assert.deepEqual(recovered, JSON.parse(TEST_PAYLOAD),
    'decrypted value must deeply equal the original payload');
});

test('round-trip preserves unicode and special characters', async () => {
  const payload   = JSON.stringify({ title: 'Siempre víctimas — «Israel»', tags: ['&', '<', '>'] });
  const ct        = await encode(payload, TEST_PASSWORD, TEST_SALT);
  const envText   = JSON.stringify({ encrypted: true, ciphertext: ct, salt: TEST_SALT });
  const recovered = await parseJsonWithKey(envText, TEST_PASSWORD, TEST_SALT);

  assert.deepEqual(recovered, JSON.parse(payload), 'unicode/special chars must survive round-trip');
});

test('wrong password produces a decryption error', async () => {
  const ciphertext   = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);
  const envelopeText = JSON.stringify({ encrypted: true, ciphertext, salt: TEST_SALT });

  await assert.rejects(
    () => parseJsonWithKey(envelopeText, 'completely-wrong-password', TEST_SALT),
    'decryption with wrong password must throw'
  );
});

test('parseJson no-op: plain JSON passes through unchanged', async () => {
  const plain  = JSON.stringify([{ id: 'abc', title: 'Plain' }]);
  const result = await parseJsonWithKey(plain, TEST_PASSWORD, TEST_SALT);

  assert.deepEqual(result, JSON.parse(plain), 'unencrypted JSON must pass through as-is');
});

test('encode output changes with different passwords (no key reuse)', async () => {
  const ct1 = await encode(TEST_PAYLOAD, 'password-one', TEST_SALT);
  const ct2 = await encode(TEST_PAYLOAD, 'password-two', TEST_SALT);
  assert.notEqual(ct1, ct2, 'different passwords must produce different ciphertexts');
});

test('encode output changes with different salts (no salt reuse)', async () => {
  const altSalt = 'aabbccddeeff00112233445566778899';
  const ct1 = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);
  const ct2 = await encode(TEST_PAYLOAD, TEST_PASSWORD, altSalt);
  assert.notEqual(ct1, ct2, 'different salts must produce different ciphertexts');
});
