/**
 * decrypt.mjs — client-side JSON decryption companion for the staticrypt gate.
 *
 * When the site is deployed with encryption (npm run encrypt), JSON data files
 * are replaced with envelopes of the form:
 *
 *   { "encrypted": true, "ciphertext": "<hex>", "salt": "<hex>" }
 *
 * staticrypt stores the PBKDF2-derived hashed password in sessionStorage under
 * the key "staticrypt_hashed_password" after a successful login. This module
 * reads that key and decrypts the ciphertext using the same AES-256-CBC
 * pipeline, returning the original plaintext.
 *
 * If the file is NOT encrypted (dev mode / unencrypted deploy), the function
 * is a no-op and returns the parsed data directly.
 *
 * @param {string} jsonText  Raw text body of the fetched JSON file
 * @returns {any}            Parsed and (if needed) decrypted JSON value
 */

const STORAGE_KEY = 'staticrypt_hashed_password';
const IV_BYTES    = 16; // AES-CBC IV length in bytes (32 hex chars)

/** hex string → Uint8Array */
function fromHex(hex) {
  const buf = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    buf[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return buf;
}

/**
 * Decrypt a staticrypt-encoded ciphertext string using a pre-hashed password.
 * The ciphertext format is: <32-hex IV> + <hex AES-CBC ciphertext>
 *
 * @param {string} ciphertext     Hex-encoded IV + ciphertext
 * @param {string} hashedPassword Hex-encoded 256-bit key (from sessionStorage)
 * @returns {Promise<string>}     Decrypted plaintext
 */
async function aesDecrypt(ciphertext, hashedPassword) {
  const IV_HEX_LEN = IV_BYTES * 2;
  const iv         = fromHex(ciphertext.slice(0, IV_HEX_LEN));
  const data       = fromHex(ciphertext.slice(IV_HEX_LEN));

  const key = await crypto.subtle.importKey(
    'raw',
    fromHex(hashedPassword),
    'AES-CBC',
    false,
    ['decrypt']
  );

  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

/**
 * Parse a JSON response body, decrypting it first if it was encrypted at
 * build time.
 *
 * @param {string} jsonText  Raw text from fetch()
 * @returns {Promise<any>}   Parsed JSON value (array, object, …)
 * @throws  If the content is encrypted but no password is found in
 *          sessionStorage (user bypassed the login page).
 */
export async function parseJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON received from server.');
  }

  // Not encrypted — plain dev/preview mode
  if (!parsed || parsed.encrypted !== true) return parsed;

  // Encrypted — retrieve the hashed password from sessionStorage
  const hashedPassword = sessionStorage.getItem(STORAGE_KEY);
  if (!hashedPassword) {
    throw new Error(
      'El contenido está cifrado y no se encontró la contraseña en la sesión. ' +
      'Recarga la página e introduce la contraseña de acceso.'
    );
  }

  // Decrypt and re-parse
  let plaintext;
  try {
    plaintext = await aesDecrypt(parsed.ciphertext, hashedPassword);
  } catch {
    throw new Error(
      'Error al descifrar los datos. La contraseña almacenada puede ser incorrecta.'
    );
  }

  return JSON.parse(plaintext);
}
