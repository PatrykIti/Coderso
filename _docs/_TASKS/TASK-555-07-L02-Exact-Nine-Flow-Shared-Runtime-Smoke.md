# TASK-555-07-L02: Exact Nine-Flow Shared Runtime Smoke
# FileName: TASK-555-07-L02-Exact-Nine-Flow-Shared-Runtime-Smoke.md

**Parent Subtask:** TASK-555-07
**Priority:** High
**Category:** Runtime Smoke / QA / Accessibility
**Estimated Effort:** Very Large
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-07-L01 receipt; terminal TASK-545 workflow/evidence
authority; current terminal shared-writer handoff; tracked regular non-symlink
`_docs/_workflows/task-555-implement.mjs` whose bytes equal `git show HEAD`

---

## Overview

Register and run one shared nine-flow real-browser suite in both profiles with exact
visible, security, and cleanup contracts. `wf555fast` is normal non-closure runtime
evidence. Only `wf555final` emits canonical closure evidence and enters terminal
TASK-545's two-phase owner-review checkpoint contract.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Sole writer after fresh shared-seam read: `scripts/runtime-smoke/adapters/task-555.ts`,
cohesive task modules under `scripts/runtime-smoke/adapters/task-555/`, exact
new reusable `scripts/runtime-smoke/database-lease.ts`,
additive registrations in `scripts/runtime-smoke/contracts.ts`,
`scripts/runtime-smoke/cli.ts`, and `scripts/runtime-smoke/registry.ts`, exact
`task-555` cases in `tests/unit/runtime-smoke/cli-registry.test.ts`,
`tests/unit/runtime-smoke/task-555-adapter.test.ts`, new
`tests/unit/runtime-smoke/database-lease.test.ts`, and final task-scoped evidence only
under `_docs/_workflows/_smoke/evidence/task-555/wf555final/`. Preserve all registered
suites and compose the shared lifecycle; no second lifecycle/worker/browser/report
loop. The already-tracked workflow bootstrap is execution authority and read-only in
this leaf; an ignored/untracked workflow or old `_smoke/task-555/` path is invalid.

All L01 product/security/cache/developer/Guide source and generated-documentation
paths are read-only. Before either profile, require L01's exact terminal TASK-548
transaction and gate receipt against the current bytes. L02 must finish its own adapter
and test writes, then run final targeted/broad gates and post-audit on the complete
candidate before starting `wf555fast`.

## Exact Frozen Real Flows

Use base URLs from the shared started host only, Admin path
`/admin/advanced/solution-kits`, canonical Setup interception path `/admin`, public paths
`/`, `/oferta`, `/projekty`, `/proces`, `/cennik`, `/o-nas`, `/kontakt`, and fixture
detail route. Setup is reached by arranging the presence-aware `setup.completed`
precondition and navigating to `/admin`; `/admin/setup` is never requested, registered,
linked, or accepted as evidence.
Desktop viewport is `1440x1000`; mobile assertion viewport is `390x844`. Each ID below
is identical in fast/certification and asserts visible text plus nonzero bounding boxes,
computed visibility/contrast where relevant, zero console/page errors, and screenshot:

1. `discovery-light`
2. `discovery-dark`
3. `preview-takeover-review`
4. `apply-and-open-public-routes`
5. `setup-finish-preserves-formadom`
6. `contact-form-public-submit`
7. `rollback-restores-prior-shell`
8. `stale-preview-and-drift-rejection`
9. `provider-offline-curated-availability`

Frozen visible assertions are: discovery IDs show seven cards plus FormaDom and
`local-service-business`, with computed readable contrast in their named theme;
preview shows operation geometry, seven residual rows, and disabled Apply until typed
takeover confirmation; apply opens all eight listed public paths and each main region
has width/height >0; Setup Finish leaves rendered name `FormaDom Studio` and locale
`pl`, navigates to canonical `/admin`, and visibly renders the Dashboard while the URL
is asserted never to equal `/admin/setup`; contact submit shows the real success status
after the existing nonce flow;
rollback restores exact prior shell presence/value in DOM; stale preview shows
rejection while owned fixture state remains unchanged; provider-offline shows
catalog/detail/preview and records zero provider requests. Desktop is `1440x1000`;
public-route and Setup responsive assertions also run at `390x844`. No
control-presence-only check is accepted.
The profile matrix also renders preview/apply/result/status in dark mode and the
Solution Kits reviewed mutation/status regions at `390x844`; these are variants
inside the same nine IDs, not extra scenarios.

## Presence-Aware Baseline and Exact Cleanup

Before either profile starts its host or captures a baseline, require
`CODERSO_RUNTIME_SMOKE_DATABASE_URL`, canonicalize its host/port/database identity,
and prove it differs from ordinary `DATABASE_URL`. Project only the dedicated value to
the profile server/worker as their `DATABASE_URL`; a missing, equal, malformed, or
unreachable identity fails before fixture mutation. The fixed Setup flow is forbidden
against the ordinary/shared database. The variable's registration in
`.env.example` and `docs/develop/runtime-smoke-cookbook.md` and its
`environment.ts` parse contract are owned by TASK-489-03-L02; this leaf consumes
them read-only and re-owns neither the registration nor the parse.

`database-lease.ts` is the shared reusable owner for this guard. It opens one direct
dedicated PostgreSQL session, obtains the canonical database-scoped advisory lease with
a bounded non-waiting/polling acquisition, and registers that same session as a shared
`RuntimeLifecycle` resource before baseline capture. The lease remains held through all
nine scenarios, reverse rollback, owned cleanup, and final parity proof, then lifecycle
close releases it. Contention returns `smoke_database_busy` before mutation. It never
logs a DSN, credentials, raw database name, or advisory key. Each fast/certification
command acquires and releases its own lease; session-name prefixes are not substitutes.

Each profile owns an independent baseline and cleanup receipt. After `wf555fast`
cleanup succeeds, capture a fresh `wf555final` baseline before any certification
scenario mutates state. Keep the snapshot memory-only and redacted. Its exact setting
key set is the sorted union of:

- `setup.completed`;
- every key emitted by the actual Setup steps/Finish values exercised by the suite,
  including conditional keys when present; and
- every `resources.settings[].key` in the verified immutable FormaDom release,
  including `site.contentRoutes`, `site.footerTemplateId`, `site.homepageId`,
  `site.locale`, `site.name`, and `site.navigationMenuId`.

For every key capture `{present,value}` through the existing raw presence-aware setting
owner and retain canonical value bytes/digest for parity; absent is distinct from
present `null` or `false`. This specifically prevents cleanup from replacing an absent
`setup.completed` row with `false`. Also point-read all seven curated lineage rows,
capture each exact `activeHeadRunId`, and require every pending apply/rollback/
reservation/lease field to be null before the profile starts. Freeze the exact owned
fixture IDs, contact-submission IDs, and ordered list of every apply result that advances
a head, including all-noop heads created by this invocation. A replay of one of those
results deduplicates to its original run ID and never creates a second unwind entry.

Cleanup is deterministic and fail closed:

1. Walk the smoke-created head list in strict reverse creation order. For each current
   head above its baseline, require it is the exact suite-owned active head and invoke
   the server-verified source-run rollback. Never latest-match, directly rewrite
   lineage, or delete run/history rows. Continue until every starter head equals its
   captured baseline; an unowned/intervening head blocks cleanup.
2. A terminal rollback `failed` must leave the head unchanged, clear all pending
   reservation fields, and expose explicit retry; `recovery_required` must retain its
   reservation for authoritative resume. Neither is cleanup success, and neither may
   be hidden by deleting lineage/history. Any unresolved branch prevents phase 1.
3. Restore the complete setting snapshot through the presence-aware owner: update
   present rows to their exact prior values and delete only keys that were absent at
   baseline. Then recapture and require exact presence plus canonical byte parity.
4. Apart from owner-mediated removal of setting keys proven absent at baseline, direct
   fixture cleanup may delete only recorded suite-owned fixture rows and exact contact
   submissions created by this invocation, using bounded set-based deletes. Never
   truncate, broad-delete, or directly delete shared resources, lineage, runs, items,
   audits, or outbox rows.
5. Re-read all seven lineage rows and the owned resource/fixture state. Require exact
   baseline head parity, zero pending reservation fields, exact setting parity, exact
   rollback/restoration state, and absence only for owned fixture/submission rows.

Both profiles perform this contract, but fast remains non-checkpoint operational
evidence. Only the clean `wf555final` receipt may flow to phase 1, and phase 1 is called
exactly once after these final parity checks.

Both profiles execute exactly the nine IDs above in that order and use the same
scenario descriptors/assertions. `wf555fast` uses the shared runner's normal ignored
or task-temporary operational output only. It may retain a bounded redacted runtime
report for the current invocation, but it creates no TASK-545 manifest/checkpoint,
has no owner-review or staging step, is never copied into the canonical final evidence
directory, and has no closure authority.

Only `wf555final` writes terminal TASK-545's strict `manifest.json`, strict redacted
`report.json`, referenced screenshots/hashes with at least one per smoke ID, and the
phase-1-created immutable `resume-checkpoint.json` under its canonical final session
path; no unreferenced file is allowed. Its manifest contains exactly the nine IDs above
in order. Revision, working-tree hash, server-up, scenario results, visible assertions,
console errors, redacted baseline identity, cleanup/parity result, screenshot
paths/hashes, report identity, and session identity are strictly cross-checked. Before
phase 1, assert no `wf555fast` artifact is present in or tracked as part of the final
closure inventory, all seven heads equal baseline, all pending reservations are absent,
and every snapshotted setting matches prior presence/value bytes.

## Security Contract

No product/docs/generated-doc/task/index/changelog edits, no TASK-547 adapter copy, no
foreign smoke evidence, root config, or unrelated TMP. Internal writes use
session/RBAC/CSRF/admin_write; public
Form uses nonce/CAPTCHA/public_write. Reports/screenshots redact sessions, tokens, raw
keys, package/snapshots, form payload, and setting values. Exact reverse-head rollback,
presence-aware setting restoration, owned fixture/submission cleanup, no direct
run/lineage delete, and no truncation.
The dedicated-database identity check and exclusive lease are mandatory reliability/
security preconditions, not optional diagnostics. `contracts.ts` adds only the stable
`smoke_database_busy` error code required by the reusable lease.
The workflow never stages or commits. It must not call phase 1 for `wf555fast`.
For `wf555final` only, phase 1 validates fresh untracked final-session evidence,
atomically creates the checkpoint, returns `owner_action_required` with exact
run/checkpoint identity and resume command, then stops immediately. Only after the
owner reviews and stages that exact directory may L03 invoke phase 2 and require
tracked parity. Wrong HEAD/workflow bytes/session/path/hash/file set or non-evidence
delta fails closed.

## Implementation Pseudocode

```ts
export const task555Suite = defineSuite({ id: "task-555", scenarios: EXACT_NINE });
async function runTask555Profile(profile, session, runtimeContext) {
  const databaseLease = await acquireRuntimeSmokeDatabaseLeaseFromEnv();
  runtimeContext.lifecycle.register(databaseLease);
  return runSharedSuiteWithBaselineAndCleanup({
    profile, session, databaseUrl: databaseLease.dedicatedDatabaseUrl,
  });
}
await runTask555Profile("fast", "wf555fast", fastContext);
assertFastCreatedNoCheckpoint();
const finalResult = await runTask555Profile("certification", "wf555final", finalContext);
await requireExactReverseRollbackAndBaselineParity(finalResult);
return createTask545CheckpointForFinalCertificationOnly(finalResult);
```

Final gates/post-audit -> fast shared host/worker/browser -> exact cleanup and
non-closure receipt -> unchanged certification candidate -> independent scenario
checkpoints -> exact rollback/scoped cleanup -> strict final manifest/report -> final
phase-1 checkpoint -> owner review/stage -> L03 exact tracked phase-2 resume.

## Error Handling

Failure identifies scenario and preserves redacted diagnostics; harness repair reruns
only affected smoke when repository policy permits. Any product, test, workflow,
configuration, runtime-doc, Guide, generated-doc, or adapter mutation after the fast
receipt invalidates the pre-smoke receipts and requires affected gates/post-audits plus
both profiles to be rerun before a final phase 1. Missing owner review or tracked parity
returns `owner_action_required`, never a fabricated pass. A fast checkpoint is a hard
contract failure, not a second closure receipt. Setting/head/owned-row parity failure,
an unowned intervening head, or any pending reservation blocks phase 1 and preserves
safe redacted diagnostics; cleanup never masks it with direct ledger deletion.

## Testing Requirements

The owned adapter suite must pin absent versus present `false`/`null` setting snapshots,
the complete dynamic setting write set, all seven initial heads, reverse-order unwind
including all-noop heads, rejection of an unowned intervening head, failed settlement
clearing reservation and permitting explicit retry, recovery settlement retaining its
reservation, exact setting byte/presence restoration, owned-only row deletion, and a
hard no-phase-1 result for any pending reservation or parity mismatch. Registry/CLI
tests prove fast cannot request a checkpoint and certification can request exactly one
only after the cleanup receipt passes.
The lease suite pins missing/equal/malformed dedicated URLs, redacted canonical identity,
bounded contention returning `smoke_database_busy`, acquisition before baseline, the
same direct session held through parity, lifecycle release, and zero DSN/advisory-key
leakage. Adapter tests prove both profile subprocesses receive only the dedicated URL.

```bash
bun test tests/unit/runtime-smoke/task-555-adapter.test.ts tests/unit/runtime-smoke/database-lease.test.ts tests/unit/runtime-smoke/cli-registry.test.ts
node --check _docs/_workflows/task-555-implement.mjs
bun --cwd core lint:types
bun --cwd core lint
bun run test
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
git diff --check
# Run wc -l over every L02-added/modified human-authored production module/test file,
# including every cohesive module below scripts/runtime-smoke/adapters/task-555/.
# Run the required independent post-audit lenses on this complete candidate.
bun scripts/runtime-smoke.ts run --suite task-555 --profile fast --session wf555fast
# Assert wf555fast produced no TASK-545 checkpoint and no canonical closure files.
bun scripts/runtime-smoke.ts run --suite task-555 --profile certification --session wf555final
# Run terminal TASK-545 phase 1 only for wf555final and stop on its emitted
# owner_action_required. L03, not this phase, invokes the exact phase-2 resume.
```

Every added or modified human-authored production module and test file must be <=1000
lines. Task/runtime documentation and generated evidence are outside the repository
line-count gate.

## Documentation Updates Required

This leaf edits no documentation. It read-validates L01's frozen documentation and
generated-output receipt before smoke, then hands L03 only the final certification
phase-1 identity, owner action, exact nine-flow final evidence, cleanup result, and
already-complete gate/post-audit receipts. Fast output is not a closure handoff.
