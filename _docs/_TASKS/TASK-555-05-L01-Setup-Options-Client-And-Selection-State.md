# TASK-555-05-L01: Setup Options Client and Selection State
# FileName: TASK-555-05-L01-Setup-Options-Client-And-Selection-State.md

**Parent Subtask:** TASK-555-05
**Priority:** High
**Category:** Setup Wizard / Admin Client / Cache
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-04-L03 and TASK-551-09-L04 FINAL receipts,
including L04's exact curated options key/TTL contract

---

## Overview

Replace drifted Setup starter identifiers and payloads with the shared strict
server option and client contracts.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Replace obsolete Setup IDs/DTOs with shared strict options and clients. Sole writer:
`core/admin/services/starterContentClient.ts`, new
`core/admin/ui/setup/starterContentSelection.ts`, and
`tests/vitest/admin/starterContentClient.test.ts`.
The client consumes L04's exported curated-options cache authority and key; it does not
create another value/promise/map/reset registry merely because Setup uses an alias
endpoint.

Preserve terminal TASK-489's existing
`invalidateSolutionKitRunHistoryBestEffort` calls in the Setup preview/apply client.
After strict normalization of every authoritative persisted preview success, call the
landed helper exactly once with global scope and add package/preview-run detail only
when supplied by the strict server DTO. After every authoritative committed persisted
apply result, call it exactly once, including replay recovery and an all-noop byte-equal apply.
Use the helper's landed scope/signature after a fresh read; do not rebuild its tracked
filter/cursor family or infer a package key from browser text. The best-effort call is
post-commit and cannot turn the authoritative success into an error. Preview rejection,
validation-only, true pre-write rejection, and any proven no-run response emit no
history invalidation. Rollback keeps its separately owned TASK-489
invalidation path. The leaf start receipt must capture the exact terminal TASK-489
helper signature, existing Setup call arguments, and focused assertions before editing;
their absence or drift blocks implementation rather than authorizing a replacement.

## Forbidden Paths

Setup step/reducer/AdminApp, Solution Kits host, server/DB/artifacts, named forbidden
tasks, indexes/changelogs/workflows/smokes/root/TMP files.

## Security Contract

Internal session API. Options/status use read permission/admin_read. Preview/apply/
rollback use the shared CSRF client and admin_write with server RBAC. Strict shared DTO
normalizers reject unknown fields. Cache uses TASK-551 authority; no preview/raw key/
package/snapshot/actor is persisted.

## Implementation Pseudocode

```ts
export const listStarterOptions = async () =>
  normalizeCuratedStarterOptions(await apiRequest("/setup/starter-content/options"));
export const createStarterSelection = (id: unknown) => ({ starterId: requireCuratedStarterId(id) });

export const applyStarterContent = async (input: CuratedStarterApplyInput) => {
  const result = normalizeCuratedStarterApplyResult(await postCuratedApply(input));
  // Preserve TASK-489's exact landed helper call and arguments at this point.
  invalidateSolutionKitRunHistoryBestEffort(/* exact existing TASK-489 arguments */);
  return result;
};
```

Server options -> strict normalization ->
`solutionKits:curated:options:v1` under deployment/user/auth epoch with exact
`300_000 ms` positive TTL and no negative caching -> Setup selection.
Changing selection clears preview/apply state in the later reducer. Malformed response
fails closed; storage failure is a cache miss; no hard-coded fallback IDs.

## Error Handling

Invalid options/responses fail closed, storage failure is a miss, stale completions do
not install, and no hard-coded fallback masks server failure.

## Testing Requirements

Test exact seven options/order, invalid legacy IDs, strict bodies/responses, exact
scoped options key/TTL, no negative caching, authority reset/stale completion, CSRF
matrices, and no provider/package fields. In this leaf's owned
`starterContentClient.test.ts`, also prove the landed TASK-489 helper is called exactly
once after persisted preview success, normal committed apply success, replay recovery,
and all-noop committed apply success; preview supplies at least global scope and never
derives package/run identity from browser text. It is not called for preview rejection,
validation-only, or a proven no-run response, and cannot fail the returned preview/apply
result when cache/storage/cacheBus invalidation throws.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/starterContentClient.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/services/starterContentClient.ts core/admin/ui/setup/starterContentSelection.ts tests/vitest/admin/starterContentClient.test.ts
```

All touched files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 owns the documentation handoff before smoke; L03 is closure metadata
only.
