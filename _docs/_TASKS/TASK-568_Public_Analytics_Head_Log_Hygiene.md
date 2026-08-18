# TASK-568: Public Analytics Head Log Hygiene

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1290 (pinned)
**Priority:** Low
**Size:** Small

# FileName: TASK-568_Public_Analytics_Head_Log_Hygiene.md

**Parent Task:** none
**Source Findings:** L-491-02 (docs-only finding from the 2026-08-17 TASK-560 audit sweep; audit reports removed by owner 2026-08-18, evidence re-anchored at HEAD `6ca20b38`)

## Purpose

`core/server/publicHeadTags.ts:20-25` logs the full error object via
`console.warn("analytics_head_resolution_failed", error)` on the public
head-resolution path. Today the resolver's only throwing path is
`decryptSecret` with fixed machine-readable codes
(`secretStore.ts:14-39,81-100`), so the leak risk is LATENT/defense-in-depth
rather than a demonstrated current leak — but the log still violates the repo
rule to keep secrets/sensitive config out of logs and would leak verbatim if a
future resolver path interpolated config text. Not TASK-9999-eligible: logging
hygiene touches the public surface and secret-handling expectations.

**Cross-stream note:** TASK-567 explicitly EXCLUDES `publicHeadTags` from its
scope; TASK-568 is the single writer for this file.

## Evidence

- `core/server/publicHeadTags.ts:20-25` — `console.warn("analytics_head_resolution_failed", error)`.
- `core/services/integrations/analyticsRuntime.ts:62-79` — lazy
  `getIntegrationRuntimeConfig()`; `core/services/integrations/integrationsService.ts:306-329`
  decrypts runtime config values before returning them to the resolver.

## Scope

- Log only a fixed, allowlisted code (e.g. `analytics_head_resolution_failed`
  with no `message`/`cause`/config) or a normalized error code without raw
  payload.
- Add a test with an error containing a secret sentinel asserting it never
  reaches `console.warn`.

## Fix Strategy

```ts
// publicHeadTags.ts — keep the intent comment
} catch {
  // fail closed, no tag
  console.warn("analytics_head_resolution_failed"); // fixed code only, no error object
  return null;
}
```

## Security Contract

- No endpoint change; response remains fail-closed `null`.
- Log lines must not contain secrets, decrypted config, URLs, or error internals.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Test lane: `publicHeadTags.ts` is NOT Bun-free — line 12 re-exports
  `buildLiveAnalyticsScriptHtml` from `publicSitePageRuntime.tsx`, which
  transitively imports `db/client` (postgres instantiates at import), and
  `resolvePublicAnalyticsHeadSnippet` has no deps-injection seam. The Vitest
  test MUST `vi.mock` `../services/integrations/analyticsRuntime` (force the
  throw) AND `./publicSitePageRuntime` (avoid db/client) before importing the
  module, then spy on `console.warn` with a sentinel-secret error and assert
  only the fixed code appears.
- Also run the existing suites that exercise the contract path:
  `bun test tests/integration/routes/publicSiteAnalytics.test.ts` (Bun-owned
  public GA head injection) and
  `bun test tests/vitest/integrations/analyticsRuntime.test.ts`.
