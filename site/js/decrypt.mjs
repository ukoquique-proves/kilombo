/**
 * decrypt.mjs — client-side JSON decryption companion for the staticrypt gate.
 *
 * When the site is deployed with encryption (npm run encrypt), JSON data files
 * are replaced with envelopes of the form:
 *
 *   { "encrypted": true, "ciphertext": "<hex>", "salt": "<hex>" }
 *
 * staticrypt stores the PBKDF2-derived hashed password in localStorage under
 * the key "staticrypt_passphrase" after a successful login. This module
 * reads that key and decrypts the ciphertext using the same AES-256-CBC
 * pipeline, returning the original plaintext.
 *
 * If the file is NOT encrypted (dev mode / unencrypted deploy), the function
 * is a no-op and returns the parsed data directly.
 *
 * @param {string} jsonText  Raw text body of the fetched JSON file
 * @returns {any}            Parsed and (if needed) decrypted JSON value
 */

const STORAGE_KEY = 'staticrypt_passphrase';

/** hex string → Uint8Array */
export function fromHex(hex) {
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
 * @param {string} hashedPassword Hex-encoded 256-bit key read from localStorage
 * @returns {Promise<string>}     Decrypted plaintext
 */
export async function aesDecrypt(ciphertext, hashedPassword) {
  const HMAC_HEX_LEN = 64; // HMAC-SHA256 = 32 bytes = 64 hex chars (prepended by staticrypt's encode())
  const IV_HEX_LEN   = 32; // AES-CBC IV = 16 bytes = 32 hex chars
  const iv   = fromHex(ciphertext.slice(HMAC_HEX_LEN, HMAC_HEX_LEN + IV_HEX_LEN));
  const data = fromHex(ciphertext.slice(HMAC_HEX_LEN + IV_HEX_LEN));

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
 *          localStorage (user bypassed the login page).
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

  // Encrypted — retrieve the hashed password from localStorage
  // staticrypt stores it as 'staticrypt_passphrase' in localStorage
  // (not sessionStorage — it persists across page navigations within the same browser)
  const hashedPassword = localStorage.getItem(STORAGE_KEY);
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
