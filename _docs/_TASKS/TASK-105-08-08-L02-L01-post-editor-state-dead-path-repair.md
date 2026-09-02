# TASK-105-08-08-L02-L01: Post Editor State Dead-Path Repair
# FileName: TASK-105-08-08-L02-L01-post-editor-state-dead-path-repair.md

**Parent Subtask:** TASK-105-08-08-L02
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Medium
**Dependencies:** TASK-105-08-08-L02 closure verification (2026-09-02, NOT closed: checklist
items 2 and 3); L03 dead-path repair pattern (2026-09-02); the three L02 residual suites on
this tree (data-errors, concurrency, richtext)
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-09-02

---

## Overview

TASK-105-08-08-L02's V8 gate is 29/33 include paths at 100% lines: the three 2026-09-02
residual suites cleared `postRichTextSelection.ts` and
`postEditorStateRefresh.ts:562-563`, leaving 24 uncovered executable lines in four post
editor state modules. L02's own rule ("removing them through a fresh source-owner contract
if a line proves dead") requires exactly this child: a dead-path deletion set over the four
files, following the L03 house pattern — minimal deletion of the dead guards/branches,
pre-gating invariant comments naming the enforcement site, behavior byte-equivalence on
supported flows, and no artificial execution.

The inherited classification below was double-verified by two independent agents and was
re-verified line-by-line against the live 2026-09-02 tree before each deletion in this
child (verification notes per row; the shared machinery in
`postEditorStateSession.ts:182-436`, the bus in `core/admin/utils/cacheBus.ts`, and the
normalizers in `core/services/posts/editor/postBlockNormalizer.ts:223-245` are the
enforcement sites). One row was inherited as tool noise but re-classified during
implementation as a dead path: `postEditorStateSaveQueue.ts:292` — and the entire
non-silent hydrate apply tail it sits in — is structurally unreachable (no source path
produces a `syncMode: "hydrate"` record; every enqueue is `"silent"`). The inherited
`292:29` count-0 observation was real V8 fold noise, but the surrounding tail lines'
apparent coverage was V8 function-range bleed-through (the function's entry count
attributed to straight-line code that never executes), so the honest disposition is
deletion of the dead tail — see the Closure Receipt amendment.

| File:line(s) | Classification | Re-verification on this tree |
|---|---|---|
| `postEditorStateSaveQueue.ts:154-155` | dead | At every `rejectQueuedSession` sweep all queued records belong to the departed `(identity, epoch)` and are undispatched: dispatched records are spliced out of the ordered queue at dispatch (drain `:359`/`:366`), each earlier session's records were rejected at its own route transition (facade effect `usePostEditorState.ts:396-402`) or barrier catch, and no admission can occur in the mixed-refs window between the layout `syncRouteIdentity` and the passive `syncRouteSession` (every admission path fails `isCurrentEditableSession` there). |
| `postEditorStateSaveQueue.ts:178-180` | dead | Every `liveDraftRef` writer installs the matching `liveSignatureRef` value in the same synchronous step: `dispatchEditorAction`/`installLiveDraftMutation` (`postEditorStateSession.ts:305-313`, `:333-339`), `installAuthoritativePost` (`:211-212` of refresh, snapshot built from the same draft), `syncRouteSession` (`:256-257`), and the drain's three apply paths (`:252-253`, `:281-282`, `:297-298`; the `:298` signature covers `editorState.document`, which `createInitialPostEditorState` preserves by normalizing the same document). `buildDraftSnapshot` is deterministic, so the resync condition cannot hold. |
| `postEditorStateSaveQueue.ts:200` | dead | A resolved barrier outcome settles only after the operation's own synchronous session checks succeeded, and the barrier's `finally` (release + map delete) runs before any awaiting continuation; a failed outcome rejects the `await` instead. No microtask in that gap can flip the session (session flips ride React passive effects, not microtasks). |
| `postEditorStateSaveQueue.ts:216` | dead | Drains apply same-session records serially in ascending revision order; `lastPersistedExactTargetRef` is written only from applied records (`:232`), from `applyBarrierAuthoritativePost` (`refresh:376`, `reservedRevision` ≤ every post-cutoff admission), or from `installAuthoritativePost` (`refresh:213`), which defers while same-session saves are pending (`refresh:191-194`; in-flight records stay in the keyed map until their settling `finally`). A strictly greater persisted revision therefore cannot exist at this check. |
| `postEditorStateSaveQueue.ts:292` | ATTRIBUTION NOISE — corrected during implementation to dead | Inherited as tool noise (`292:29` count 0 while the tail lines reported counts). Re-verification proved the whole non-silent hydrate apply tail (`292-308`) structurally unreachable: `PostDraftSyncMode` has no `"hydrate"` producer — `flushLatestAutosave` and the editor-close path take `enqueueExactRevisionSave`'s `"silent"` default and both `saveDraftInternal` callers pass `{ syncMode: "silent" }` (verified at HEAD and on this tree) — so `record.syncMode === "silent"` always holds at apply. The tail's reported counts were V8 function-range bleed-through, not execution (probe evidence: 13 applies, all `mode=silent`). Deleted with the tail. |
| `postEditorStateSaveQueue.ts:331, 335` | dead | A rejected predecessor barrier outcome means `runAuthoritativeIdentityBarrier`'s own catch already swept this record from the ordered queue and the keyed map (`:628-641` runs before `rejectOutcome` settles awaiters), so both guards miss and only the already-settled rejection is replayed. |
| `postEditorStateSaveQueue.ts:354-355` | dead | Any same-session barrier registered at this check was created after the record's admission (its `cutoffAdmissionOrder` covers the record), and a barrier from before the admission was awaited via `predecessorBarrierOutcome` (`:324-327`) and has deregistered in its `finally` before this continuation; `admissionOrder > cutoffAdmissionOrder` cannot hold. |
| `postEditorStateSaveQueue.ts:475` | dead | All three callers (`runAutosave`, `saveDraftInternal`, `flushLatestAutosave`) enqueue a target captured synchronously in the same task with no intervening await, and `captureCurrentTarget`'s guard (`:167-175`) is a strict superset of the entry check. |
| `postEditorStateSaveQueue.ts:547` | dead | Same-session admissions carry strictly ascending revisions (monotonic `dirtyRevisionRef`; equal revision + equal epoch = same key = coalescing at `:503-513`; `setDirtyRevisionTo` only writes 0 for a fresh session whose queue is provably empty because the deferral guards reject that state), so `insertAt` is always −1 and the queue only appends. |
| `postEditorStateSaveQueue.ts:563` | dead | Both callers (`markReloadRemote` `refresh:595-608`, `restoreRevision` `usePostEditorState.ts:643-657`) pin the session via `requireCurrentEditableSession` plus an immediate synchronous re-check with no await between. |
| `postEditorStateSaveQueue.ts:713` | dead | Reaching this point means the route, editorState, and live-draft guards just above (`:698-707`) all pin the closing session; the active identity/epoch pair only diverges from the editorState pair during a route transition, which fails those guards first (a stale queue closure fails `:698`, a fresh one fails `:701-703`). |
| `postEditorStateSaveQueue.ts:761` | dead | `assertCloseIdentityCurrent` (`:715-725`) pins the active pair immediately before `captureCurrentTarget`, which validates the same pair and throws on mismatch itself. |
| `postEditorStateRefresh.ts:177, 184` | dead | `installAuthoritativePost` has exactly two callers — `applyLoadedPost:271` and `applyBarrierAuthoritativePost:358` (grep-verified; the facade's only refresh-internal call is `applyBarrierAuthoritativePost` at `usePostEditorState.ts:672`) — and both pin route/active pairs to `(nextPost.id, expectedEpoch)` synchronously in their own guards, so install's mismatch return never fires and an identity-transition install always has `previousIdentity === nextPost.id` and `previousEpoch === expectedEpoch`. |
| `postEditorStateRefresh.ts:295` | dead | All five `commitIdentityLoadFailure` call sites (`:449`, `:477`, `:543`, `:550`, `:580`) run `isCurrentRequest()` synchronously beforehand, and that check is a superset of the guard (mounted + route + active pairs). |
| `postEditorStateRefresh.ts:632-633` | dead | Between the operation's first debt check (`:614`) and the post-get check (`:631`) no settlement can move the restoration debt: the barrier awaits every predecessor — queued and in-flight alike, because dispatched records stay in the keyed map until their settling `finally` — plus every cross-session barrier before the operation, and post-cutoff admissions wait for this barrier's outcome before dispatching. |
| `postEditorStateDocument.ts:60` | dead | Every paragraph block reaching `hasMeaningfulParagraphAttrs` comes through `coercePostDocument` → `normalizePostBlockDocument` → `normalizeBlockAttrs`, whose paragraph case returns exactly `normalizeCommonBlockLayoutAttrs`'s key set (align, width, spacingTop, spacingBottom, textScale, highlight, hideOnMobile, optional anchorId/className — all handled by the earlier ifs; the legacy literal uses `attrs: {}`), so no unknown key can occur. |
| `usePostEditorState.ts:417` | dead | The route refs are synced by the layout effect (`:268-270`) before this passive subscription's cleanup runs; local cache-bus delivery is synchronous from cache writes that ride per-task-drained network promise chains, so no event for the departed post can be delivered inside that synchronous commit window, and remote deliveries are separate tasks that cannot interleave with it (concurs with the inherited double-verified audit and 0 executions across the full 10,478-test lane). |

If any row above had proved reachable through a supported flow, the matching line would
have been kept and reported instead of deleted; the gate would then stay open.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts` (13 dead guards/branches
  deleted; 1 attribution-noise whitespace restructure)
- `core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts` (3 dead guards/branches
  deleted; the now-unused `rejectQueuedSession` dependency removed with it)
- `core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts` (1 unreachable fallback
  return deleted)
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` (1 unreachable guard deleted;
  plus dropping the `rejectQueuedSession` prop from the refresh deps wiring)
- `_docs/_TASKS/TASK-105-08-08-L02-L01-post-editor-state-dead-path-repair.md` (this file)

**Test writers (extensions only, and only if a regression case must be added):**

- `tests/vitest/ui/task-105-08-08-post-editor-state-data-errors-residual.test.tsx`
- `tests/vitest/ui/task-105-08-08-post-editor-state-concurrency-residual.test.tsx`
- `tests/vitest/ui/task-105-08-08-post-richtext-residual.test.tsx`

No deletions of tests. Everything else — `postEditorStateSession.ts`, the posts shells,
fixtures, board, changelog, coverage configuration, TASK-105-08-12's ledger — is read-only.

## Implementation Steps

1. Delete each dead guard/branch listed above, leaving a one-line (or two-line) invariant
   comment at the deletion site stating the invariant and its enforcement site, exactly as
   `PostClassicEditorShell.tsx` did for L03. No casts, no logic reshuffling beyond what the
   deletion requires, no renames of live identifiers. In `rejectQueuedSession` the
   parameters become `_identity`/`_epoch` (they exist only for the exported callback
   contract; eslint's `argsIgnorePattern: "^_"` covers them).
2. Remove the now-dead wiring: `rejectQueuedSession` from `RefreshLifecycleDeps`
   (`postEditorStateRefresh.ts:86`), its destructure (`:108`), and the facade's prop
   (`usePostEditorState.ts:358`) — the only consumer was the deleted `refresh:184` sweep.
3. `postEditorStateSaveQueue.ts:292`: first implemented as a whitespace-only line merge
   restoring attribution; that fix was not prettier-stable (`scripts/format-staged.ts`
   re-splits the merged line at commit) and the follow-up re-verification then proved the
   whole non-silent hydrate apply tail dead (no `"hydrate"`-mode record producer exists),
   so the final disposition is deletion of the tail — see the Closure Receipt amendment.
4. Keep every touched file ≤ 1,000 physical lines and byte-equivalent on supported flows.
5. Run all gates below; only real numbers are recorded.

## Security Contract

Internal admin UI control-flow repair only. No endpoint, schema, migration, session/RBAC,
CSRF, rate-limit, cache-broadcast, persistence, or secret-handling change: every deletion
removes a branch that no supported flow could reach, so no reachable behavior changes. The
save queue's fail-closed identity discipline is unchanged — every surviving transition,
dispatch, and apply path still rejects stale sessions exactly as before. Tests contain no
secrets or privileged payloads.

## Testing Gates

```bash
for test_path in \
  tests/vitest/ui/task-105-08-08-post-table-preferences-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-shell-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-inspector-store-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-classic-canvas-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-editor-state-data-errors-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-editor-state-concurrency-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-richtext-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-classic-dead-paths.test.tsx; do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
```

Then TASK-105-08-08-L02's combined full-lane post-repair V8 proof, unchanged — all 33
amended include paths, `json-summary` reporter, and the gate's own node check
(`failures.length → process.exit(1)`), which must exit 0 with 33/33 files at
`lines.pct === 100`.

```bash
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts \
  core/admin/ui/posts/editor/hooks/usePostEditorState.ts
bun --cwd core lint
bun --cwd core lint:types
./node_modules/.bin/tsc -p tsconfig.json --noEmit
git diff --check
wc -l core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts \
  core/admin/ui/posts/editor/hooks/usePostEditorState.ts
```

## Acceptance Criteria

- [ ] Every classified line is deleted with a pre-gating invariant comment (the one row
      inherited as attribution noise was re-classified dead during implementation and is
      deleted with its tail); none is exercised artificially (no cast, no private
      mock, no coverage ignore).
- [ ] Behavior on supported flows is byte-equivalent: the residual suites, the L02-owned
      posts suites, and `task-105-08-08-post-classic-dead-paths.test.tsx` are green.
- [ ] L02's V8 gate reports 33/33 include paths at 100% lines and its node check exits 0.
- [ ] Static gates pass and every touched file stays ≤ 1,000 physical lines; `git status`
      shows no writer outside this contract's set.

## Closure Receipt (2026-09-02)

Implemented exactly as scoped, with one in-scope classification correction recorded in the
amendment below. Per-line dispositions: all 24 inherited uncovered executable
lines resolved (23 deleted as dead — saveQueue 154-155, 178-180, 200, 216, 331, 335,
354-355, 475, 547, 563, 713, 761; refresh 177, 184, 295, 632-633; document 60;
facade 417 — plus the dead `rejectQueuedSession` wiring they orphaned in refresh and the
facade; and saveQueue 292, inherited as tool noise but re-classified dead and deleted
together with the entire non-silent hydrate apply tail it sat in — 13 further executable
lines whose prior apparent coverage was V8 function-range bleed-through, not execution).
No line proved live; no STOP. No test file needed extending by this leaf: the deleted
branches had zero executions across the full lane, so no existing assertion observes them.
(The same package's three residual-suite extensions belong to the L02 parent closure and
are attributed in that receipt, not here.)

- Regression gates (real runs, 2026-09-02): the eight suites named above plus
  `post-insert-flow.test.ts` — 9 files / 85 tests passed (`post-table-preferences-residual`
  11, `post-shell-residual` 9, `post-inspector-store-residual` 8, `post-classic-canvas-
  residual` 5, `post-editor-state-data-errors-residual` 12, `post-editor-state-
  concurrency-residual` 14, `post-richtext-residual` 7, `post-classic-dead-paths` 13,
  `post-insert-flow` 6).
- L02's V8 gate, full lane (no test-file filter), v8 provider, all 33 amended include
  paths, temp report dir (final post-amendment tree): 1189 files / 10481 tests /
  0 failures; 33/33 include files at `lines.pct === 100` (gate total 3810/3810 lines;
  the four repaired modules: `postEditorStateSaveQueue.ts` 307/307,
  `postEditorStateRefresh.ts` 255/255, `postEditorStateDocument.ts` 158/158,
  `usePostEditorState.ts` 245/245); the gate's node check printed `{"failures":[]}` and
  exited 0.
- Static gates: eslint `--max-warnings=0` on the four production files — exit 0;
  `bun --cwd core lint` — exit 0; `bun --cwd core lint:types` — exit 0; root
  `tsc -p tsconfig.json --noEmit` — exit 0; `bunx prettier --check` on
  `postEditorStateSaveQueue.ts` — exit 0 (pre-commit `format-staged.ts` stability);
  `git diff --check` — clean.
- Line counts after repair: `postEditorStateSaveQueue.ts` 805, `postEditorStateRefresh.ts`
  723, `postEditorStateDocument.ts` 541, `usePostEditorState.ts` 799 — all ≤ 1,000
  (production diff: +134 / −167 across the four files).
- Residual: none for this child. L02's checklist items 2 and 3 are unblocked; the L02
  closure pass owns recording them.

### Amendment (2026-09-02, same day): prettier-stability defect and dead-tail discovery

The first implementation of the `:292` disposition was the whitespace-only statement merge
described in the original plan (capture and assignment sharing one physical line, guarded
by `// prettier-ignore`). Orchestrator verification found it does not survive the repo's
pre-commit hook: `scripts/format-staged.ts` runs `prettier --write` on staged files, and
prettier splits the merged line back (`bunx prettier --check` failed; the ignore comment
does not protect the second AST node). Post-commit, the receipts would have claimed a gate
state the committed code no longer satisfied.

The prettier-stable re-fix (dropping the provably-dead `?.`/`?? null` arms) then failed
the gate 96.87% (310/320) and exposed the real defect the merge had been masking: the
entire non-silent hydrate apply tail never executes. Evidence trail:

- File-append probes in `applyPersistedResponse` across the nine targeted suites: 13
  entries, every record `mode=silent` (7 silent applies, 1 rebase, 5 early guard returns);
  the non-silent tail zero times — while the merged-line build reported count 13 on the
  tail's statements (13 = the function's entry count, i.e. V8 function-range
  bleed-through attributing the entry count to straight-line code inside no branch block;
  the count-0 `292:29` fold was the only honest zero in that region).
- No `"hydrate"` producer exists anywhere in `core` (verified with `git grep` at HEAD and
  on the working tree): `flushLatestAutosave` and the editor-close path take
  `enqueueExactRevisionSave`'s `"silent"` default; both `saveDraftInternal` callers
  (`createRefreshLifecycle`'s `markReloadRemote` and the facade `saveDraft`) pass
  `{ syncMode: "silent" }`. `PostDraftSyncMode`'s `"hydrate"` arm and the queue's
  coalescing upgrade remain as public contract.

Final disposition (house pattern): the dead tail is deleted together with the always-true
`record.syncMode === "silent"` guard (body dedented, trailing `return;` dropped, orphaned
`createInitialPostEditorState` import and `dispatch` destructure removed), with a
pre-gating invariant comment naming the enforcement sites. `SaveQueueDeps.dispatch` stays
in the type (the facade still passes it; only the unused destructure binding is removed).
All gates re-run on the final tree: nine targeted suites 9 files / 85 tests passed; full
L02 gate 1189 files / 10481 tests / 0 failures, 33/33 includes at 100% lines
(3810/3810; saveQueue 307/307), node check exit 0; eslint / core lint / core lint:types /
root tsc / `git diff --check` all clean; `bunx prettier --check` exit 0.

Tooling note for the program ledger: V8 function-range bleed-through can make
never-executed straight-line code report covered depending on incidental expression shape
(the `?.`/`??` arms' presence or absence changed it). The 08-12 protocol may want a
spot-check for this class in other 100%-claimed files; this repair's gate no longer
depends on it.
