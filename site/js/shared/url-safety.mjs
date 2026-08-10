// @ts-check
// site/js/shared/url-safety.mjs
//
// Single source of truth for the URL-safety rules applied to `contentHtml`.
// Two independent call sites need to agree on these rules and previously
// didn't:
//   - site/js/render.mjs      → sanitizeHtml() (browser, DOM-based, runs on
//                                every page view)
//   - scripts/validate-data.mjs → CI-time schema check (Node, regex-based,
//                                runs once per deploy)
//
// The relative-URL bug (TO_FIX #31) happened specifically because the two
// implementations drifted: validate-data.mjs learned to reject relative
// URLs but render.mjs's isSafeUrl() never did. Importing both rules from
// this single module means a future rule change only has to happen once,
// and test/url-safety.test.mjs can assert the two consumers stay in sync.

const UNSAFE_URL_SCHEMES = /^\s*(javascript|data|vbscript):/i;
const ABSOLUTE_OR_EXEMPT = /^(https?:\/\/|#|mailto:)/i;

/**
 * True if `url` is not a javascript:/data:/vbscript: URL. This is the XSS
 * guard — a failure here means the URL could execute code if inserted into
 * the DOM (e.g. as an <a href> or <img src>).
 * @param {unknown} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  return !UNSAFE_URL_SCHEMES.test(String(url));
}

/**
 * True if `url` is either an absolute http(s) URL, an in-page anchor (#...),
 * or a mailto: link. A relative URL is not unsafe in the XSS sense, but it
 * silently 404s once rendered on the mirror.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isAbsoluteOrExempt(url) {
  return ABSOLUTE_OR_EXEMPT.test(String(url));
}

/**
 * Combined check used at content-ingestion time: a URL must be both safe
 * and either absolute or exempt.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isImportableUrl(url) {
  return isSafeUrl(url) && isAbsoluteOrExempt(url);
}
