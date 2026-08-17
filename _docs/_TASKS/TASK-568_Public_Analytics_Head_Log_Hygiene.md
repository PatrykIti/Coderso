# TASK-568: Public Analytics Head Log Hygiene

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Low
**Size:** Small

# FileName: TASK-568_Public_Analytics_Head_Log_Hygiene.md

**Parent Task:** none
**Source Findings:** L-491-02 (audit `_TMP-audit-task-491-integrations.md`, verified at HEAD `4e3dab15`)

## Purpose

`core/server/publicHeadTags.ts:20-25` logs the full error object via
`console.warn("analytics_head_resolution_failed", error)` on the public
head-resolution path. The error may contain implementation details, URLs, or
runtime-config related text from the lazy analytics resolver. The public
response is already fail-closed (`null`), but the log violates the repo rule to
keep secrets/sensitive config out of logs. Not TASK-9999-eligible: logging
hygiene touches the public surface and secret-handling expectations.

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
// publicHeadTags.ts
} catch {
  console.warn("analytics_head_resolution_failed"); // no error object
  return null;
}
```

## Security Contract

- No endpoint change; response remains fail-closed `null`.
- Log lines must not contain secrets, decrypted config, URLs, or error internals.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest unit test spying on `console.warn` with a sentinel-secret error.
