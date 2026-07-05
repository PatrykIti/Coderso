// Shared TTL math for the beacon nonce (TASK-483-02-L01) and the site HTML
// cache TTL setting (site.cacheTtlSeconds). Pure & Bun-free — NO ApiError,
// db/client, or env-at-import coupling — so both settingsService and beaconNonce
// (and Vitest) can import it without runtime side effects.
//
// WHY THIS EXISTS (TASK-483 post-audit MEDIUM): the per-render beacon nonce is
// embedded into HTML that is then stored in the site HTML cache keyed by
// site.cacheTtlSeconds. If the cache TTL could exceed the nonce TTL, every
// cache-served page would carry an already-expired nonce and the ingestion
// route would 400 (`analytics_nonce_invalid`) for the whole cache window —
// silently killing analytics. To make that impossible we GUARANTEE, by
// construction, that the (minimum) nonce lifetime always exceeds the (maximum)
// allowed site cache TTL:
//
//     MAX_SITE_CACHE_TTL_SECONDS < BEACON_NONCE_MIN_TTL_MINUTES * 60
//
// The invariant is asserted by tests; keep these three constants coherent.

export const BEACON_NONCE_DEFAULT_TTL_MINUTES = 30; // matches the analytics session window

// Floor: even if an operator lowers ANALYTICS_BEACON_NONCE_TTL_MINUTES, the
// effective nonce lifetime never drops below this, so a nonce baked into cached
// HTML stays valid across the whole (capped) cache window.
export const BEACON_NONCE_MIN_TTL_MINUTES = 15; // 900s

// Upper clamp for site.cacheTtlSeconds. Kept strictly below the minimum nonce
// lifetime (900s) with a comfortable margin so cache-served pages never carry an
// expired beacon nonce.
export const MAX_SITE_CACHE_TTL_SECONDS = 600; // 10 min < 900s

// Resolve the effective beacon nonce TTL (ms) from the raw env string. Unset or
// non-positive/non-finite → default; otherwise clamped up to the floor.
export function resolveBeaconNonceTtlMs(rawEnv: string | undefined): number {
  if (!rawEnv) return BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000;
  const parsed = Number(rawEnv);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000;
  }
  const minutes = Math.max(parsed, BEACON_NONCE_MIN_TTL_MINUTES);
  return minutes * 60 * 1000;
}
