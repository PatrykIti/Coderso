# TASK-105-08-14: TASK-540 Runtime Smoke Revision Repair
# FileName: TASK-105-08-14-task-540-runtime-smoke-revision-repair.md

**Parent Task:** TASK-105-08
**Priority:** High
**Category:** Testing Infrastructure / Runtime Smoke
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-04 static and targeted-suite receipt; TASK-569 is terminal and
its server revision contract is authoritative
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-08-22

---

## Objective

Repair the two definition-bearing custom-screen PATCH callers in the registered TASK-540
runtime-smoke adapter so the required L04 fast smoke exercises the current optimistic-
concurrency API contract. The failed smoke session
`task105-l04-fast-20260822` stopped during `button-image` with `smoke_output_invalid`. Source
inspection shows that both adapter definition PATCHes omit `expectedRevision`; the current
TASK-569 service deterministically rejects that request shape.

This is a narrow harness-only recovery, not a TASK-569 product repair. The current server
correctly requires a revision for definition-bearing PATCHes and must not be weakened. This leaf
narrowly supersedes terminal TASK-552-04-L02 only for suite/runtime/override-actions.ts and its
new focused test. TASK-560 remains historical run protocol only; neither terminal family is
reopened.

## Scope and Single-Writer Ownership

This leaf is the sole writer of exactly:

- `scripts/runtime-smoke/adapters/task-540/suite/runtime/override-actions.ts`;
- `tests/unit/runtime-smoke/task540-override-actions.test.ts` (new focused Bun suite).

Its uniquely named rerun may cause the shared runner to create one new evidence directory under
`_docs/_workflows/_smoke/evidence/task-540/`, whether the run succeeds or fails. A failed rerun
report remains read-only diagnostic evidence; only a successful report with proven cleanup can
advance L04. The existing failed `task105-l04-fast-20260822` report is also read-only.

This leaf must not edit `core/**`, `tests/vitest/**`, `scripts/runtime-smoke` browser,
composition, lifecycle, cleanup, worker, route, schema, persistence, or configuration modules;
nor may it edit completed TASK-552, TASK-560, or TASK-569 documentation. It does not own
presentation-override, entry-reset, or user-preference PATCHes in the same adapter.

## Implementation Pseudocode

The adapter already has an authenticated, CSRF-capable bootstrap session. Keep that session and
the server's fail-closed conflict behavior unchanged.

```ts
function currentScreenRevision(screen: PlainJsonObject, label: string): number {
  const revision = screen.revision;
  runtimeInvariant(
    Number.isSafeInteger(revision) && revision >= 1,
    `${label} revision is invalid`
  );
  return revision;
}

async function patchScreenDefinition(
  state: Task540RuntimeState,
  definition: PlainJsonObject,
  expectedRevision: number,
  label: string
): Promise<PlainJsonObject> {
  const response = await bootstrap(state).request("PATCH", screenRoute(state), {
    json: { schemaVersion: 4, definition, expectedRevision },
  });
  const saved = runtimeObject(response.value, `${label} save`);
  runtimeInvariant(saved.revision === expectedRevision + 1, `${label} revision drifted`);
  return saved;
}
```

1. `bi-060-unsafe-patch` uses its already-fetched screen revision in its definition PATCH and
   verifies the returned revision advanced exactly once. It performs exactly its existing GET
   followed by one PATCH; it does not re-read after deriving the unsafe binding.
2. The shared baseline reset handler performs a fresh GET immediately before every definition
   PATCH, validates that response's revision, then sends it with the original baseline
   definition. It must not reuse the create-time revision or a prior PATCH response because
   browser actions may have persisted an intervening edit.
3. Keep a 409 conflict fail-closed: do not retry, rebase, or substitute a revision. Invalid,
   missing, fractional, or unsafe revisions fail before PATCH.
4. Add focused fake-session tests that assert the exact one-GET/one-PATCH sequence and JSON
   body for `bi-060`, and the fresh one-GET/one-PATCH sequence for each reset alias family.
   They must prove a newly fetched revision is used for reset, a returned revision must equal
   `N + 1`, and invalid/stale inputs do not trigger a second PATCH. Existing
   presentation-override, entry, and preference PATCH payloads remain revision-free.

## Security Contract

This is test infrastructure using existing internal `/admin/api/custom-screens/:id` endpoints.
The existing bootstrap session, `content:write` RBAC, CSRF header, admin rate-limit bucket, and
strict reject-unknown schema remain mandatory. There is no public endpoint, no new auth model,
no persistence or API contract change, and no nonce/HMAC/reCAPTCHA surface. The adapter remains
loopback-only. Reports and failure diagnostics must remain redacted: never write credentials,
cookies, CSRF values, raw response bodies, or database URLs to smoke evidence.

The r2 diagnostic subsequently proved that the post-report launcher remained live and that its
flat screenshot paths were not durable evidence. Do not broaden this leaf into a cleanup redesign
or perform broad database/filesystem deletion. TASK-105-08-15 exclusively owns that separately
audited launcher-and-evidence repair.

## Validation Gates

1. `bun test tests/unit/runtime-smoke/task540-override-actions.test.ts`
2. `bun test tests/unit/runtime-smoke`
3. `bun --cwd core lint:types` and `bun --cwd core lint`
4. `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false`; every diagnostic
   must be attributed to a named leaf, and no L14-owned path may appear.
5. `git diff --check` and a physical line-count check over both owned files (each at most
   1,000 lines).
6. Preserve task105-l04-fast-20260822-r2 as historical diagnostic evidence only. It completed
   the request-shape diagnosis but cannot advance L04: its launcher remained live and its report
   referenced transient flat screenshot paths. Do not rerun or retrofit r2.
7. TASK-105-08-15's one r3 command is failed diagnostic evidence: it terminated before scenarios
   because storage preflight counted unrelated sessions. TASK-105-08-16 owns the narrow repair,
   one terminal r4 fast smoke, archive-hash validation, and fresh post-implementation audit of
   L14, L15, L16, and L04 acceptance. Do not record an L04 receipt or advance L05 from this leaf.

## Acceptance Criteria

1. Both and only both definition-bearing custom-screen PATCH callers send a validated current
   `expectedRevision` and confirm a single revision increment.
2. The focused Bun regression proves fresh-read behavior, fail-closed invalid/conflict behavior,
   and unchanged unrelated PATCH contracts.
3. L14's request-shape behavior is ready for the independent TASK-105-08-16 terminal r4 smoke.
   Only L16's terminal exit plus durable 13/13 archive-hash receipt can prove 496 logical actions,
   visible effects, seven scenarios, zero console/page errors, and deterministic cleanup for L04.
4. No production, route, schema, persistence, security, TASK-569, or completed TASK-552/560
   file changes; all modified production/test files are at most 1,000 physical lines.

## Closure (2026-09-02)

Closed on committed runtime-smoke evidence per the smoke-family closure standard: r4 terminal evidence at _docs/_workflows/_smoke/evidence/task-540/task105-l04-fast-20260822-r4/report.json records pass: true, serverUp: true, 7/7 scenarios, empty failures and consoleErrors, successful cleanup, and 13 screenshots; archive-hash validation is 13/13.
Revision repair is in the tree: scripts/runtime-smoke/adapters/task-540/suite/runtime/override-actions.ts carries the expectedRevision flow (lines 34-153); the committed fixture JSON (1434 lines) is exempt from the line gate.
Landing commits: 70d9954b (L04 smoke platform guard and receipts), 699ab3b1 (freeze of the task-540 L14/L16 handoff).
Note for the record: the earlier failed r3 run directory was never committed to any branch; only the r4 terminal evidence above is citable.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — canonical run 1186 files / 10444 tests / 0 failures, 99.26% lines / 291 uncovered across 87 files.
