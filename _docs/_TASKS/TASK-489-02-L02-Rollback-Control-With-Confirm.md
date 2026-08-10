# TASK-489-02-L02: Strict Browser Client, Identity-Safe Cache, and Race-Safe Hook
# FileName: TASK-489-02-L02-Rollback-Control-With-Confirm.md

**Parent Subtask:** TASK-489-02
**Priority:** High
**Category:** Solution Kits / Admin Client / Cache / Concurrency
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-02-L01; TASK-547 done; complete terminal TASK-551 Admin cache installation authority
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Replace the raw ledger-shaped types used by TASK-489 run history/detail/rollback
with strict safe DTOs, implement bounded keyset client/cache operations, and make
package/page/detail transitions race-safe through the terminal TASK-551 Admin
cache installation authority. Retained apply response types are outside this
replacement claim. Expose exact rollback only; remove apply/dry-run/latest
rollback from this hook's operational surface.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:**
`core/admin/services/solutionKitsClient.ts`,
`core/admin/services/cachePolicy.ts` only for Solution Kit safe keys/TTLs, and
`core/admin/ui/kits/hooks/useSolutionKitRuns.ts`. This leaf also owns only the
post-success run-history invalidation call sites in
`core/admin/services/assistantClient.ts` and
`core/admin/services/starterContentClient.ts`; their unrelated action/Setup
contracts remain byte-identical.

**Tests:**
`tests/vitest/admin/solutionKitsClient.test.ts`,
`tests/vitest/admin/solutionKitRunsCacheAuthority.test.ts` (new), and
`tests/vitest/ui/solutionKitRunsHook.test.tsx` (new), plus bounded assertions in
new independently runnable
`tests/vitest/admin/solutionKitRunHistoryInvalidationCallers.test.ts` and new
`tests/vitest/admin/starterContentClient.test.ts`.

The existing 1,071-line `tests/vitest/admin/assistantClient.test.ts` is forbidden
and remains byte-identical. Assistant invalidation assertions use the focused new
test above; this leaf does not append to or split that unrelated legacy suite.

No TASK-551 authority/identity/storage/cacheBus utility, route/service, UI page,
DB schema/migration, runtime-smoke, docs/task/changelog/board, apply/dry-run
client route, public/API-key route, or TASK-555/TASK-556 may be edited.

## Client And Cache Contract

- Browser types mirror only `SafeSolutionKitRunSummaryDto`,
  `SafeSolutionKitRunItemDto`, `SafeSolutionKitRunDetailDto`, keyset envelope,
  and strict `SafeSolutionKitRollbackResultDto`; strict validators reject unknown
  keys recursively and all forbidden ledger fields. Running run summaries require
  `summary:null`, `finishedAt:null`, and nonterminal detail trace; terminal rows
  alone accept counters. Rollback results accept terminal success/failed summaries
  or claimed-owner `recovery_required` with durable run ID and `summary:null`.
  Failed is presented only as the server-proven zero-net/full-compensation branch;
  a client never infers failed from an HTTP error or running history row.
  Detail otherwise includes only strict `itemTrace` plus bounded
  `omittedItemCount`; summary includes only the closed superseded/relation-limit
  rollback-ineligibility code or null.
- `SafeRunsPageDto` is exactly
  `{items:readonly SafeSolutionKitRunSummaryDto[],nextCursor:string|null,
  hasMore:boolean}` with no total, filter echo, or arbitrary metadata.
- `listSolutionKitRunsPage(input, options?)`, `getSolutionKitRunDetail(runId)`, and
  `rollbackExactSolutionKitRun(runId, options?)` are the only TASK-489 run-
  operations API functions. The list options are exactly `{force?:boolean}` and
  the rollback options are exactly
  `{operationToken?:CacheEventOperationToken}`. Both are browser-local control
  metadata: `force` reaches only the selected read-through cache instance and is
  excluded from HTTP query serialization, canonical page input, persistent/cacheBus
  keys, and cache instance identity; `operationToken` reaches only best-effort
  invalidation broadcasts and is never serialized or persisted. Retained catalog/
  apply functions outside this surface are not claimed or retyped. Rollback sends
  `POST` body exactly `JSON.stringify({})` with CSRF.
- Export synchronous `peekSolutionKitRunsPage(input): SafeRunsPageDto | null`.
  It returns only a currently authorized in-memory page registered by the same
  normalized-input cache instance used by `listSolutionKitRunsPage`; it performs
  no storage/API work and returns null after authority reset. The hook uses this
  exact signal in its lazy initial state, making a warm hit reachable rather than
  inferring it after the async list promise has already started.
- Preserve `listSolutionKitRunsCached({force?})` as a compatibility prefetch
  wrapper for the first unfiltered safe page because `adminPrefetch.ts` is an
  existing caller outside this leaf. It returns only page `items`, never raw
  ledger rows, and creates no second cache implementation.
- Cache key family v2 includes canonical filter digest plus cursor digest for
  each list page and canonical run ID for detail. Values are safe DTOs only.
- `cachePolicy.ts` owns these exact bounded event/key identities:
  `solutionKits:runs:v2:all`,
  `solutionKits:runs:v2:package:<lowercase-sha256-normalized-package>`, and
  `solutionKits:runs:v2:detail:<canonical-uuid>`. Persistent page keys additionally
  include lowercase SHA-256 of canonical `{packageKey|null,cursor|null,limit}`;
  raw package/cursor values never enter storage or cacheBus keys. The client keeps
  a bounded current-authority registry of tracked page/detail cache instances and
  registers its one reset callback through
  `registerAdminModuleCacheReset`, clearing values, in-flight promises, tracked
  keys, and generations synchronously.
- TTL: list page 15 seconds, detail 30 seconds. No stale-while-revalidate for a
  rollback-eligible detail after mutation; explicit refresh is authoritative.
- Consume `captureAdminCacheInstallationToken`, current-token checks, registered
  reset, and identity-scoped storage from terminal TASK-551-09-L04. Never create
  an identity-free Map/storage key or compatibility cache.
- On every rollback result (`success`, `failed`, or `recovery_required`), use
  returned authoritative `packageKey` to invalidate
  all tracked global list pages, all tracked pages for that package, source
  detail, and returned rollback detail; broadcast invalidation after the
  response. Recovery may follow earlier committed mutations and creates a durable
  nonterminal owner that history must reveal; failed is authoritative only after
  the server proves no mutation or compensates every mutation back to source. A
  pre-write HTTP rejection has no rollback run and emits no invalidation. Storage/
  cacheBus failures are best-effort and cannot reject the authoritative result.
- `invalidateSolutionKitRunHistoryBestEffort` first clears the current tab's
  tracked global/package pages and named details, then broadcasts `invalidate`
  for the exact global, optional package-digest, source-detail, and rollback-detail
  keys through `broadcastCacheEvent`. Every mounted hook subscribes through
  `subscribeCacheEvents`; a matching local or remote global/package event clears
  matching current-authority entries and coalesces one page-one refresh, while a
  detail event clears only that detail before the same guarded refresh path.
  The helper accepts an optional caller-owned `CacheEventOperationToken`; when it
  is absent, the helper creates one with `createCacheEventOperationToken()`, and
  it passes the selected token to all broadcasts from one authoritative result.
  `rollbackExact` creates and retains its token before starting the request, passes
  it through `rollbackExactSolutionKitRun` into this helper, and recognizes the
  same token if synchronous local subscribers run before the client promise
  settles; that local event does not schedule a second refresh after the hook's
  direct result handling. Remote events carry no token and use generation-scoped
  microtask coalescing. A
  second tab must become stale immediately even while its 15/30-second TTL is
  otherwise fresh. Broadcast/storage failure remains a local clear plus safe miss.
- Export one safe `invalidateSolutionKitRunHistoryBestEffort` helper from the
  client owner. Existing direct Solution Kit apply, successful
  `site-kit.install` execution, successful direct dry-run, successful Setup
  starter preview, and successful Setup starter apply call it after authoritative
  success when that response persisted a run. This includes the current Setup
  preview path, which writes a `dry_run` ledger row; it is not a validation-only
  no-run response. Use the known package key when available and always invalidate
  tracked global pages so another tab cannot retain a fresh-looking history page.
  They invalidate every persisted success, including all-noop byte-equal apply and
  dry-run/preview rows. They emit nothing for rejected, failed, genuinely
  validation-only, or proven no-run actions; this does not weaken failed/recovery
  rollback invalidation. These narrowly owned call sites do not parse, cache,
  redact, or reclassify the retained apply/Assistant/Setup response DTOs.
- Its exact exported signature is
  `invalidateSolutionKitRunHistoryBestEffort(input: {packageKey?: string | null;
  sourceRunId?: string | null; rollbackRunId?: string | null;
  operationToken?: CacheEventOperationToken}): void`. It always clears/broadcasts
  the tracked global family, adds the package family only for a validated package,
  and adds only canonical non-null detail IDs. No alias helper or DTO-shaped overload
  is exported.
- Logout/login, deployment, permission epoch/fingerprint, and cross-tab auth
  generation transitions make old data inaccessible and reset hook state.

## Race-Safe Hook Contract

- `useSolutionKitRuns({packageKey?})` owns current pages, `nextCursor`, `hasMore`,
  selected run ID/detail, loading/error states, and exact rollback pending state.
- Page one is cached-first and revalidated in the background exactly once per
  current scope/cache generation: lazy initialization calls
  `peekSolutionKitRunsPage` before the first request; a valid identity-scoped page
  is visible on the initial render, then one `force:true` request refreshes it.
  Cache-bus invalidation
  coalesces into the same current-scope refresh path. Every completion is guarded
  by the captured installation token plus hook generation before cache install or
  state replacement. A cold miss performs one foreground request; a failed
  background refresh preserves visible safe rows and exposes retry state without
  a mount-force loop.
- A monotonically increasing request generation plus captured installation token
  guards every list/detail/rollback completion. A late prior-package/page/run
  completion cannot overwrite current state or install cache.
- Package-scope change resets pages/cursor/selection before requesting page one.
- `loadMore` is single-flight per current cursor, appends once, dedupes by run ID,
  and refuses stale/cross-scope cursors. It never loops to reconstruct all pages.
- If one non-null cursor receives `solution_kit_runs_cursor_expired`, mark that
  exact scope/cursor consumed, preserve the visible rows/detail, show fixed
  non-destructive `history refreshed because its continuation expired` notice,
  and request page one exactly once under the current generation/token. The
  successful first page replaces pages without silently clearing the notice or
  a still-present selection. The same cursor is never retried; page-one failure
  or a repeated terminal code becomes a normal retryable read error without an
  automatic loop. Scope/identity reset clears the consumed-cursor guard.
- Selecting a run fetches only that exact detail. Read errors retain already
  visible safe history; 403 renders read-only denial, not fake empty history.
- A detail response rejected with fixed server code
  `solution_kit_run_shape_invalid`, including the 513-item sentinel, enters a
  dedicated `corrupt_detail` state with the selected safe history row retained,
  fixed non-sensitive copy, no item/counter synthesis, and no rollback control.
  It is distinct from not-found, denied, empty, and retryable transport errors;
  explicit retry may reread the same exact ID but no automatic loop runs.
- `rollbackExact(runId)` uses only the selected exact ID. All three statuses
  create one operation token before request dispatch, retain it for that pending
  mutation, pass it to the client/invalidation helper, and invalidate plus refresh
  page one. Success selects the returned terminal rollback
  run. Failed preserves source context, exposes only fixed zero-net safe copy/code/
  counters, clears local pending after authoritative refresh, and re-enables an
  exact retry only if refreshed source detail is eligible; that retry receives a
  new rollback owner ID.
  Recovery preserves source context, exposes fixed recovery copy plus the durable
  rollback run ID, never invents counters, and leaves repeat mutation disabled
  while the same owner is running. No latest derivation.

## Security Contract

- **Endpoint visibility:** internal routes through shared `apiRequest` only.
- **Auth/RBAC:** server authoritative; UI state exposes `canRead` and require-all
  `canRollback = can(solution-kits:write) && can(settings:write)` for L03.
- **CSRF/rate limit:** exact rollback uses `withCsrf:true`; no raw `fetch`.
- **Validation:** strict inputs and recursive safe DTO validators; reject unknown.
- **Anti-abuse:** default 25/max 100, one-page-at-a-time, single-flight, exact run.
- **Sensitive data:** TASK-489 history/detail/rollback exports, cache values, hook
  state, and UI have no types or fields for actors/options/snapshots/rollback
  payload/raw errors and never persist raw operation data. This statement does not
  cover retained apply response types outside this leaf's DTO ownership.

## Implementation Pseudocode

```ts
async function listSolutionKitRunsPage(
  input: RunsPageInput,
  options: { force?: boolean } = {},
) {
  const normalized = parseRunsPageInput(input);
  const canonical = canonicalPageInput(normalized);
  const cache = currentAuthorityPageRegistry.getOrCreate(canonical, () =>
    createReadThroughCache({
      ttlMs: SOLUTION_KIT_RUNS_PAGE_TTL_MS,
      load: async () => parseSafeRunsPage(await apiRequest(
        buildRunsPath(normalized),
        { method: "GET" },
      )),
    }),
  );
  return cache.get({ force: options.force });
}

function peekSolutionKitRunsPage(input: RunsPageInput): SafeRunsPageDto | null {
  const normalized = parseRunsPageInput(input);
  return currentAuthorityPageRegistry
    .get(canonicalPageInput(normalized))?.peek() ?? null;
}

async function rollbackExactSolutionKitRun(
  runId: string,
  options: { operationToken?: CacheEventOperationToken } = {},
) {
  const id = parseCanonicalUuid(runId);
  const dto = parseSafeRollbackResult(await apiRequest(
    `/solution-kits/runs/${id}/rollback`,
    { method: "POST", headers: jsonHeaders, body: JSON.stringify({}) },
    { withCsrf: true },
  ));
  invalidateSolutionKitRunHistoryBestEffort({
    packageKey: dto.packageKey,
    sourceRunId: dto.sourceRunId,
    rollbackRunId: dto.rollbackRunId,
    operationToken: options.operationToken,
  });
  return dto;
}

function useSolutionKitRuns(filters: RunsFilters) {
  // Advance local request generation on scope/selection change.
  // Lazy-initialize page one from peekSolutionKitRunsPage before starting I/O.
  // Before every state write, require matching generation + authority token.
  // Hydrate page one from current identity cache, then coalesce one guarded
  // force revalidation; route cache-bus invalidation through that same path.
  // loadMore appends one current cursor page. Rollback creates its operation token
  // before dispatch and passes it through the client so synchronous local events
  // coalesce with the hook's one direct result refresh.
}
```

**Data flow:** normalized filter/cursor -> identity-scoped safe cache -> internal
API -> strict DTO -> token/generation guard -> hook state -> L03 UI. Rollback
flows selected ID -> exact empty body -> safe result -> best-effort invalidation
-> authoritative page-one/detail refresh.

**Error handling:** preserve stable API code/status in a bounded client error,
never raw server text. Malformed DTO -> `solution_kit_response_invalid` and no
cache install. Stale completion is ignored. Cache/storage/broadcast failure is a
safe miss/no-op; HTTP 202 is parsed as the successful transport of a strict
`recovery_required` DTO, not thrown as an API error. Network/API failure leaves
prior safe state and enables retry.
Only `solution_kit_runs_cursor_expired` activates the one-shot cursor reset;
arbitrary 400/409/network errors never do.
Only exact detail-read code `solution_kit_run_shape_invalid` activates
`corrupt_detail`; the client retains only code/status/run ID and discards response
copy/body. Other 500s remain retryable transport errors and cannot masquerade as
stored-evidence corruption.

## Regression Tests

- Recursive validators reject actor/options/snapshot/rollbackAction/error and
  unknown keys at run/item/result levels; all ten kinds, both terminal item-trace
  variants, nonterminal `summary:null`/trace, bounded omitted counts, superseded
  and relation-limit ineligibility, and all three result statuses pass. Any
  running fake-zero summary or recovery result with counters fails.
- Query serialization pins packageKey/cursor/limit and no extras. A forced page
  read bypasses a fresh cache value exactly once but produces the same HTTP URL,
  canonical page input, cache key/instance, and persisted/cacheBus key as the
  corresponding unforced read; concurrent non-force reads keep normal dedupe.
- Rollback sends exact path, `{}` body, CSRF, and no kit/source/options fields.
- Cache keys differ by deployment/auth/permission scope, package scope, and cursor;
  reset blocks old hydration and late cache installation. Raw package/cursor bytes
  are absent from storage/cacheBus keys; exact global/package/detail events clear
  both local and simulated second-tab registries.
- Delayed A->B package-scope and run-detail responses cannot overwrite B.
- Warm mount hydrates once then performs one token/generation-guarded background
  revalidation from the synchronous peek path; cold mount performs one request;
  cache-bus bursts coalesce; stale
  refresh completion, reset, permission transition, and refresh failure cannot
  overwrite or erase visible current-scope rows and cannot create a refetch loop.
- Concurrent load-more dedupes; stale cursor cannot append; no eager page loop.
- Expired/rotated-key cursor resets once to page one, preserves rows/detail and a
  non-destructive notice, never retries the same cursor, and cannot loop when the
  reset request fails or repeats the code.
- Success, failed, and recovery-required results survive storage/cacheBus failure
  and invalidate all named families; recovery preserves its durable owner ID and
  null summary, terminal failed refresh can re-enable the source and a second
  exact request receives a different owner, while recovery refresh retains the
  same owner and cannot issue another mutation. Pre-write HTTP rejection
  invalidates none.
- Hook-owned rollback creates its operation token before client dispatch; every
  local broadcast receives that exact token, synchronous delivery before promise
  settlement schedules no duplicate refresh, direct result handling refreshes
  exactly once, and helper callers without a token still create one token per
  authoritative result. Remote delivery remains token-free and coalesced.
- Existing direct apply/dry-run, Assistant `site-kit.install`, and Setup starter
  preview/apply each broadcast global/package run-history invalidation exactly
  once after every persisted success, including all-noop byte-equal apply and
  preview/dry-run rows, and never before success or after rejection/failure/no-run;
  their unrelated cache behavior is unchanged.
- Permission transition clears state and prevents prior response installation.
- A real 513-item detail response produces `corrupt_detail`, preserves its safe
  selected history row, renders no synthesized items/counters, exposes no rollback
  callback, and performs no automatic retry.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/solutionKitsClient.test.ts tests/vitest/admin/solutionKitRunsCacheAuthority.test.ts tests/vitest/admin/solutionKitRunHistoryInvalidationCallers.test.ts tests/vitest/admin/starterContentClient.test.ts tests/vitest/ui/solutionKitRunsHook.test.tsx
wc -l core/admin/services/solutionKitsClient.ts core/admin/services/cachePolicy.ts core/admin/services/assistantClient.ts core/admin/services/starterContentClient.ts core/admin/ui/kits/hooks/useSolutionKitRuns.ts tests/vitest/admin/solutionKitsClient.test.ts tests/vitest/admin/solutionKitRunsCacheAuthority.test.ts tests/vitest/admin/solutionKitRunHistoryInvalidationCallers.test.ts tests/vitest/admin/starterContentClient.test.ts tests/vitest/ui/solutionKitRunsHook.test.tsx
git diff --check
```

Every touched production/test file must be <=1,000 physical lines.

## Documentation Updates Required

TASK-489-03-L02 updates `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`
with safe key families, TTLs, auth/deployment/permission scope, invalidation,
race guards, and the explicit ban on raw operational persistence.
