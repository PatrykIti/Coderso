# TASK-555-04-L01: Strict Client Cache and Authority Adoption
# FileName: TASK-555-04-L01-Strict-Client-Cache-And-Authority-Adoption.md

**Parent Subtask:** TASK-555-04
**Priority:** High
**Category:** Admin Client / Cache / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-03-L03 and TASK-551-09-L04 FINAL receipts

---

## Overview

Adopt the shared curated-starter DTOs and terminal Admin cache authority with exact
keys/TTLs/invalidation matrices, without breaking the separate legacy
catalog/navigation or TASK-489 operational contract.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Adopt the explicit TASK-555 DTO normalizers and TASK-551 cache installation authority.
Sole writer: `core/admin/services/solutionKitsClient.ts`,
`core/admin/services/solutionKitSelection.ts`, `core/admin/services/cachePolicy.ts`,
`tests/vitest/admin/solutionKitsClient.test.ts`,
`tests/vitest/admin/solutionKitSelection.test.ts`, and
`tests/vitest/admin/cachePolicy.test.ts`. No local starter-ID union remains. The
legacy navigation selection remains the six server `SolutionKitId` values,
including `local-service-business`; `formadom-studio` is a curated starter ID,
not a legacy active-navigation kit. Legacy catalog/navigation/planner APIs and
their AdminShell DTO remain separate and unchanged. Remove the retired legacy
`applySolutionKit` Admin HTTP mutation and every raw Admin apply body/response type;
all six catalog installs in Solution Kits and Setup now use the curated preview/apply
client. This does not remove or alter the current internal Assistant
`site-kit.install` executor, which terminal TASK-414 migrates later. TASK-489 exact
rollback remains separate and unchanged.

## Forbidden Paths

All TASK-414/489/545/547/548/551/554/556 files, Setup/UI hosts, DB/routes, artifacts,
task/changelog indexes, foreign changelogs/workflows/smokes, root config, and TMP files.

## Security Contract

Internal session API only. Reads require server `solution-kits:read`; mutations retain
their route RBAC. New POST mutations use shared CSRF and `admin_write`; TASK-555 does
not alter the terminal legacy planner policy. Exact response normalizers reject unknown
keys. No package, snapshots, raw key, actor, secrets, preview claim, validation
internals, or negative response enters cache.

## Exact Cache Contract

Every logical key is installed only through terminal TASK-551's deployment + user +
auth/permission-epoch scope. The exact logical keys and positive TTLs are:

| Value | Logical key | TTL |
|---|---|---:|
| curated list | `solutionKits:curated:list:v1` | `300_000 ms` |
| Setup/Admin options | `solutionKits:curated:options:v1` | `300_000 ms` |
| starter detail | `solutionKits:curated:detail:v1:<CuratedStarterId>` | `300_000 ms` |
| installed status | `solutionKits:curated:status:v1:<CuratedStarterId>` | `15_000 ms` |

There is no negative caching. Unknown/403/404/409/5xx/malformed responses install
nothing. List/options/detail may hydrate safe cached data then perform one deduplicated
background revalidation. Status may do the same only when the selected starter has no
dirty preview/apply/validate/rollback or uncertain result. A captured installation
token plus per-starter mutation generation guards every install/state write; a late
revalidation cannot overwrite an authoritative mutation result or dirty review state.

The complete browser invalidation matrix is exact:

| Outcome | Curated cache | TASK-489 cache |
|---|---|---|
| persisted preview success | none | call terminal helper once; always invalidate tracked global history and add authoritative package/preview-run detail identities only when the strict response supplies them |
| preview rejection or proven no-run response | none | none |
| apply committed, including replay recovery and all-noop success | invalidate selected status; list/options/detail remain | terminal helper invalidates all tracked global and package list pages plus apply/source detail |
| explicit validation/recovery | invalidate selected status | invalidate exact source detail only if its safe projection changed |
| rollback terminal success | invalidate selected status | terminal helper invalidates global/package list pages, source detail, and returned rollback detail |
| rollback terminal failed | invalidate selected status; the terminal failed settlement leaves the head unchanged, clears every pending reservation field, and makes an explicit retry available | terminal helper invalidates global/package list pages, source detail, and returned failed rollback detail |
| rollback `recovery_required` HTTP 202 | evict selected status and keep dirty/recovery guard until authoritative resume | terminal helper invalidates global/package list pages, source detail, and the known durable rollback-owner detail; never invent counters |
| apply/rollback uncertain error after possible commit | evict selected status and keep dirty/uncertain guard until authoritative refresh | best-effort terminal helper invalidates known source/global families without manufacturing a run ID |
| true pre-write rejection | none | none |

Call terminal `invalidateSolutionKitRunHistoryBestEffort`; TASK-555 never rebuilds its
filter/cursor key family. Cache/storage/cacheBus failure is best effort after HTTP
success and never changes the returned committed result.
Preview uses one helper-created operation token because there is no hook-owned direct
history refresh to coalesce. It never infers a package key or run ID from starter/browser
text; global invalidation is sufficient when the strict preview DTO exposes neither.

## Implementation Pseudocode

```ts
const token = captureAdminCacheInstallationToken();
const value = normalizeCuratedStarterList(await apiRequest("/solution-kits/starters"));
if (isCurrentAdminCacheInstallationToken(token) && mutationGenerationIsCurrent()) {
  installScopedCache("solutionKits:curated:list:v1", value, 300_000);
}
return value;
```

API -> strict DTO -> current authority token -> identity-scoped cache/cacheBus. Reset
registration clears values, promises, and maps. Stale completions return to their
caller but never install. Errors are stable client errors; malformed payload is
`curated_starter_response_invalid`; storage/cacheBus failures do not fail API success.

## Error Handling

Malformed payloads fail closed; API errors stay typed; cache/storage/broadcast errors
are isolated and stale completions never install.

## Testing Requirements

Test all seven IDs, exact four keys/TTLs, identity/user/auth-epoch separation, no
negative caching, one deduplicated background refresh, dirty/uncertain mutation
protection, stale identity/generation completion, reset, cacheBus failure, every row of
the apply/validate/rollback/TASK-489 invalidation matrix, terminal failed clearing its
pending reservation and enabling explicit retry, `recovery_required` retaining its
reservation/recovery guard, uncertain-after-possible-commit outcomes, no sensitive
fields, absence of the legacy Admin/Setup direct-apply client, explicit preservation of
the internal Assistant service path, and byte-behavior preservation of legacy
read/navigation/plan plus TASK-489 functions.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/solutionKitsClient.test.ts tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/cachePolicy.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/services/solutionKitsClient.ts core/admin/services/solutionKitSelection.ts core/admin/services/cachePolicy.ts tests/vitest/admin/solutionKitsClient.test.ts tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/cachePolicy.test.ts
```

Every touched human-authored file must be <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 updates Admin cache docs/maps before smoke; this leaf edits no
docs/index. L03 is closure metadata only.
