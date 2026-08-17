/**
 * test/decrypt-client.test.mjs
 *
 * Unit tests exercising the client-side decryption path implemented in
 * `site/js/decrypt.mjs`. This covers the real AES-CBC + PBKDF2 code path
 * used by visitors (WebCrypto + hashed password in localStorage) and
 * guards against the gap described in `docs/TO_FIX.md` #29.
 *
 * Two layers of coverage:
 *
 *   Layer 1 — Direct unit tests for aesDecrypt() and fromHex():
 *     Constructs ciphertext manually (known HMAC stub + IV + AES-CBC data)
 *     and asserts the IV/offset arithmetic. This is the gap that was missing:
 *     previously only the encode→parseJson round-trip existed, which exercises
 *     aesDecrypt() only indirectly via staticrypt's codec.
 *
 *   Layer 2 — parseJson() integration tests (unchanged from before):
 *     Exercises the full stack including localStorage and the staticrypt codec.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cryptoEngine = require('../node_modules/staticrypt/lib/cryptoEngine.js');
const codec        = require('../node_modules/staticrypt/lib/codec.js');
const { encode }   = codec.init(cryptoEngine);

// Minimal localStorage mock used by decrypt.mjs
globalThis.localStorage = {
  _store: Object.create(null),
  getItem(key) { return this._store[key] ?? null; },
  setItem(key, value) { this._store[key] = String(value); },
  removeItem(key) { delete this._store[key]; }
};

import { parseJson, aesDecrypt, fromHex } from '../site/js/decrypt.mjs';

const TEST_PASSWORD = 'test-password-kilombo';
const TEST_SALT     = '15efb88b5789d0133e0f8771165ee709';
const TEST_PAYLOAD  = JSON.stringify([{ id: 'test-article', title: 'Artículo de prueba' }]);
const STORAGE_KEY   = 'staticrypt_passphrase';

// ================================================================
// Layer 1 — Direct unit tests for fromHex() and aesDecrypt()
// ================================================================

test('fromHex — converts a hex string to the correct Uint8Array', () => {
  const result = fromHex('deadbeef');
  assert.deepEqual(result, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
});

test('fromHex — handles all-zero hex string', () => {
  const result = fromHex('0000');
  assert.deepEqual(result, new Uint8Array([0x00, 0x00]));
});

test('aesDecrypt — decrypts a known AES-CBC envelope with correct IV offset', async () => {
  // Build a real AES-256-CBC ciphertext using WebCrypto directly,
  // then prepend the 64-char HMAC stub + 32-char IV hex — the exact
  // envelope format aesDecrypt() expects. This validates the slice
  // arithmetic (HMAC_HEX_LEN=64, IV_HEX_LEN=32) independently of staticrypt.
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv     = crypto.getRandomValues(new Uint8Array(16));

  const keyObj = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, ['encrypt']);
  const plaintext = 'hello from direct aesDecrypt test';
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    keyObj,
    new TextEncoder().encode(plaintext)
  );

  const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const hmacStub    = '0'.repeat(64);              // 64 hex chars of placeholder HMAC
  const ivHex       = toHex(iv);                   // 32 hex chars
  const cipherHex   = toHex(encrypted);
  const envelope    = hmacStub + ivHex + cipherHex; // the format aesDecrypt() slices
  const hashedPassword = toHex(rawKey);             // 64 hex chars (256-bit key)

  const recovered = await aesDecrypt(envelope, hashedPassword);
  assert.equal(recovered, plaintext);
});

test('aesDecrypt — wrong IV (off-by-one offset) produces wrong output or throws', async () => {
  // Regression guard for the v0.26.0 bug: the old code used slice(0, 32) for
  // the IV, reading into the HMAC prefix instead of the real IV at offset 64.
  // This test constructs a valid envelope and verifies that using the WRONG
  // offset (reading IV from position 0 instead of 64) would NOT decrypt cleanly.
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv     = crypto.getRandomValues(new Uint8Array(16));

  const keyObj = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, ['encrypt', 'decrypt']);
  const plaintext = 'regression: wrong IV must not produce correct output';
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, keyObj, new TextEncoder().encode(plaintext));

  const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const wrongIv      = crypto.getRandomValues(new Uint8Array(16));  // different from the real IV
  const hmacStub     = toHex(wrongIv) + toHex(wrongIv);            // 64 chars — fills the HMAC prefix with wrong IV bytes
  const ivHex        = toHex(iv);
  const envelope     = hmacStub + ivHex + toHex(encrypted);
  const hashedPassword = toHex(rawKey);

  // Correct offset (64) recovers the plaintext
  const recovered = await aesDecrypt(envelope, hashedPassword);
  assert.equal(recovered, plaintext, 'correct offset must recover plaintext');

  // Wrong offset (0) — simulates the pre-v0.26.0 bug — must NOT recover plaintext
  // It either throws (bad padding) or produces garbled output; either is correct.
  let wrongResult = null;
  let threw = false;
  try {
    const ivWrong   = fromHex(envelope.slice(0, 32));   // old buggy slice
    const dataWrong = fromHex(envelope.slice(32));
    const keyWrong  = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, ['decrypt']);
    const buf       = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivWrong }, keyWrong, dataWrong);
    wrongResult = new TextDecoder().decode(buf);
  } catch {
    threw = true;
  }
  assert.ok(threw || wrongResult !== plaintext, 'wrong IV offset must not recover plaintext');
});

test('aesDecrypt — throws on malformed ciphertext (too short)', async () => {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Envelope shorter than HMAC(64)+IV(32) = 96 hex chars minimum — nothing to decrypt
  const shortEnvelope = '0'.repeat(40);
  await assert.rejects(
    () => aesDecrypt(shortEnvelope, toHex(rawKey)),
    'too-short ciphertext must reject'
  );
});

// ================================================================
// Layer 2 — parseJson() integration tests (unchanged)
// ================================================================

test('parseJson decrypts envelope when hashed password present in localStorage', async () => {
  const ciphertext = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);

  // staticrypt stores the PBKDF2-derived hashed password (hex) — replicate it
  const hashedPassword = await cryptoEngine.hashPassword(TEST_PASSWORD, TEST_SALT);
  localStorage.setItem(STORAGE_KEY, hashedPassword);

  const envelopeText = JSON.stringify({ encrypted: true, ciphertext, salt: TEST_SALT });
  const recovered = await parseJson(envelopeText);

  assert.deepEqual(recovered, JSON.parse(TEST_PAYLOAD));
});

test('parseJson throws when stored hashed password is wrong', async () => {
  const ciphertext = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);
  // intentionally set an incorrect hashed password
  localStorage.setItem(STORAGE_KEY, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
  const envelopeText = JSON.stringify({ encrypted: true, ciphertext, salt: TEST_SALT });

  await assert.rejects(() => parseJson(envelopeText), {
    name: 'Error'
  });
});

test('parseJson throws when no hashed password present', async () => {
  const ciphertext = await encode(TEST_PAYLOAD, TEST_PASSWORD, TEST_SALT);
  localStorage.removeItem(STORAGE_KEY);
  const envelopeText = JSON.stringify({ encrypted: true, ciphertext, salt: TEST_SALT });

  await assert.rejects(() => parseJson(envelopeText), {
    name: 'Error'
  });
});
