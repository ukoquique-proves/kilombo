/**
 * api/lib/http-errors.mjs
 *
 * Every drafts-related route handler in server.mjs was independently
 * re-implementing the same `if (err.code === 'X') return res.status(Y)...`
 * chain for errors thrown by scripts/lib/drafts-store.mjs. That duplication
 * meant a new error code (or a status-code fix) had to be copy-pasted into
 * 5 different route handlers to stay consistent — this module is the single
 * place that decision lives now.
 *
 * @module
 */

/** @type {Record<string, number>} */
const STATUS_BY_CODE = {
  INVALID_SLUG: 400,
  DRAFT_ALREADY_APPROVED: 400,
  DRAFT_NOT_FOUND: 404,
  SUGGESTION_NOT_FOUND: 404,
};

/**
 * Map a drafts-store error to an HTTP response.
 *
 * Known codes (DRAFT_NOT_FOUND, INVALID_SLUG, DRAFT_ALREADY_APPROVED,
 * VALIDATION_FAILED, SUGGESTION_NOT_FOUND) always map to the same
 * status/shape everywhere they're thrown from — that's the duplication this
 * module removes.
 *
 * Routes differ only in what to do for an *uncoded* error (a plain
 * validation Error with no `.code`, thrown by drafts-store's field
 * validation): some routes treat that as a 400 INVALID_FIELDS with a
 * details array (create/update), others as a generic 500 (read/approve/
 * AI endpoints). Pass `fallback` to control that per call site, matching
 * each route's pre-refactor behavior exactly.
 *
 * @param {import('express').Response} res
 * @param {Error & { code?: string, validationErrors?: string[] }} err
 * @param {string} fallbackMessage - Used when err has no message
 * @param {{ status?: number, code?: string, includeDetails?: boolean }} [fallback]
 *   Response shape for an error with none of the known codes above.
 *   Default: `{ status: 500 }` → `{ ok: false, error, internal }`.
 */
export function sendDraftError(res, err, fallbackMessage, fallback = { status: 500 }) {
  const code = err && err.code;

  if (code === 'VALIDATION_FAILED') {
    return res.status(422).json({
      ok: false,
      error: 'Validation failed — same rules as CI. Fix issues and retry.',
      code,
      details: { validationErrors: Array.isArray(err.validationErrors) ? err.validationErrors : [] },
    });
  }

  const status = code && STATUS_BY_CODE[code];
  if (status) {
    return res.status(status).json({
      ok: false,
      error: (err && err.message) || fallbackMessage,
      code,
    });
  }

  if (fallback.status === 500) {
    return res.status(500).json({
      ok: false,
      error: fallbackMessage,
      internal: err && err.message,
    });
  }

  return res.status(fallback.status).json({
    ok: false,
    error: (err && err.message) || fallbackMessage,
    code: fallback.code,
    ...(fallback.includeDetails ? { details: splitFieldErrors(err) } : {}),
  });
}

/**
 * A few call sites (POST /api/drafts, PUT /api/drafts/:slug) also want the
 * raw validation message split into a `details` array of individual
 * complaints — drafts-store joins them with "; " into a single message.
 * @param {Error} err
 * @returns {string[]}
 */
export function splitFieldErrors(err) {
  return err && err.message ? err.message.split('; ').map((s) => s.trim()).filter(Boolean) : [];
}
