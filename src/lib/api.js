/* ============================================================================
 * PlacementAI — API helpers
 * Shared utilities for talking to the FastAPI backend.
 * ========================================================================== */

/**
 * Safe API error extraction.
 *
 * FastAPI returns `detail` as a string for HTTPException, but as an ARRAY of
 * objects for request-validation errors. Stringify anything non-string so the
 * UI never shows "[object Object]" or "undefined".
 */
export const extractError = (data, fallback = 'Something went wrong. Please try again.') => {
  if (!data) return fallback;
  const detail = data.detail ?? data.message;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail != null) {
    try {
      const text = JSON.stringify(detail);
      if (text && text !== 'null' && text !== '[]') return text;
    } catch { /* ignore */ }
  }
  return fallback;
};
