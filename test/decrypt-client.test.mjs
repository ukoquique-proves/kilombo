/**
 * test/decrypt-client.test.mjs
 *
 * Unit tests exercising the client-side decryption path implemented in
 * `site/js/decrypt.mjs`. This covers the real AES-CBC + PBKDF2 code path
 * used by visitors (WebCrypto + hashed password in localStorage) and
 * guards against the gap described in `docs/TO_FIX.md`.
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

import { parseJson } from '../site/js/decrypt.mjs';

const TEST_PASSWORD = 'test-password-kilombo';
const TEST_SALT     = '15efb88b5789d0133e0f8771165ee709';
const TEST_PAYLOAD  = JSON.stringify([{ id: 'test-article', title: 'Artículo de prueba' }]);
const STORAGE_KEY   = 'staticrypt_passphrase';

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
