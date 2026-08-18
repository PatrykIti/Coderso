# 1290 - TASK-568 Public Analytics Head Log Hygiene

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-568

## Key Changes

### Public Rendering / Logging
- `core/server/publicHeadTags.ts` no longer logs the full error object on the
  public analytics-head resolution path: the catch block emits only the fixed
  allowlisted code `analytics_head_resolution_failed` with no message, cause,
  config, URL, or error internals (defense-in-depth against future resolver
  paths interpolating config text; today the only throwing path is
  `decryptSecret` with fixed machine-readable codes).
- Response stays fail-closed `null` on failure (no tag emitted); the intent
  comment is preserved.

## Validation
- `bun --cwd core lint` + `lint:types` green; Vitest test spies on
  `console.warn` with a sentinel-secret error (mock
  `analyticsRuntime` throw + `publicSitePageRuntime` to avoid db/client) and
  asserts only the fixed code appears.
- `bun test tests/integration/routes/publicSiteAnalytics.test.ts` and
  `bun test tests/vitest/integrations/analyticsRuntime.test.ts` stay green.
- Runtime smoke (`wf568smoke`): public page head is clean with no GA
  configured (0 gtag scripts, correct title); configuring a GA4 measurement
  id through admin Settings -> Integrations injects the gtag script + inline
  init; removing the integration makes the head fail closed; 0
  `analytics_head_resolution_failed` entries in the server log. Screenshots in
  `_docs/_workflows/_smoke/evidence/task-568/wf568smoke/`.
