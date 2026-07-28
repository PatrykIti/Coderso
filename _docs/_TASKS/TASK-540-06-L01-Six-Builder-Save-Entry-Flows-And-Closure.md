# TASK-540-06-L01: Seven Builder-Save-Entry Flows and Closure

# FileName: TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md

**Historical Filename:** The physical filename retains the original six-flow slug for stable task identity. The executable contract later expanded to seven flows, so the current H1 and scope correctly say “Seven”; no rename is part of TASK-540.

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-06
**Priority:** High
**Category:** Testing / Documentation / Smoke / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01, TASK-540-03-L01, TASK-540-04-L01..L04, TASK-540-05-L01..L02
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Fix Started:** 2026-07-23
**Implementation Complete:** 2026-07-28 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Revalidation Passed:** pre-closure remediation / fix-started 2026-07-23 / gate green
**Modularity Repair Revalidated:** 2026-07-19 — eight source-owner modularity repairs and exact gates passed.
**Historical Implementation Complete:** 2026-07-16 — the then-assigned work was
complete, but the later live-smoke repair superseded this as current completion
authority. It cannot satisfy a current-state predicate.
**Historical Pre-Current-Repair Revalidation:** pre-closure remediation / fix-started
2026-07-15 / gate green; this predates the active 2026-07-21 repair and cannot authorize
implementation, smoke, or closure.
**Current Closure Repair Started:** 2026-07-23
**Current Closure Repair State:** The owner-directed behavior-preserving modularization
of the smoke executor and scenario infrastructure is **complete**, and is no longer
blocking. It took no new hardening, product change, runtime diagnosis, or smoke retry.
Checkpoints `f22eee9f` through `8259a326` extracted the shared observation and
visible-assertion sources, all seven scenario owners, and the simple browser
invocations; a further 111 commits ran from `8259a326` to `c89fa96c`
(`git rev-list --count 8259a326..c89fa96c`), of which `b8170be1` moved the executor
self-test body out of the facade entirely. The executor
facade no longer contains that body: it imports `createRunTask540SmokeExecutorSelfTest`
from `task-540-smoke/executor/self-test/entry.mjs` at `:6` and instantiates it at
`:866`. Re-measured with `wc -l` at HEAD `a68a19e0` on 2026-07-27, the requirement that
every facade and child owner finish at no more than 1,000 physical lines is satisfied:
`task-540-smoke-executor.mjs` is 976, `task-540-smoke-contract.mjs` is 13,
`task-540-smoke-host.mjs` is 84, and of the 162 child modules under
`_docs/_workflows/task-540-smoke/**` the largest is
`executor/self-test/browser-widget-absence-scope.mjs` at 964, with zero modules above
the limit. What remains for closure, unchanged and in order: run targeted/full gates,
restart the helper, run exactly one canonical seven-flow Playwright CLI smoke with 13/13
screenshots and deterministic cleanup, create changelog 1252, close child-first, commit,
and integrate into `feat/implementations`. Prior runtime smoke evidence is tracked in
`_docs/_workflows/_smoke/` and indexed, with each receipt's exact scope and limits,
under `Smoke evidence receipts in the tree` in TASK-540-06; none of it discharges the
canonical run above.
**Current Codex Collaboration Directive:** 2026-07-24 — Codex agents are the only
reviewers/implementers used for the remaining work. The tracked Codex bridge and local
orchestrator are landed; Claude invocation and fallback are absent from the current
workflow and closure path.
**Historical Pre-Modularization Helper Checkpoint:** 2026-07-24 — commit `911c29f5`
tracks the seven top-level
helpers and focused regression after the 5/13 harness diagnosis. The owner requested
minimum threefold runtime budgets for the slow shared Render database before the next
canonical smoke; those timeout-only bytes require their own focused revalidation and
checkpoint before runtime. This is historical provenance after the later smoke splits,
not current closure authority. No product source change is authorized by the 5/13
result.
**Current Fresh-Target Changelog Projection Repair:** 2026-07-23 — after the committed
TASK-548 board/changelog state was merged into this isolated worktree, the canonical
Start gate stopped before agent, server, browser, fixture, or closure mutation with
`TASK-540 changelog prose slot is not canonical`. The parser had extended TASK-540's
mutable prose slot through the independent 1260/1261 reservation sentence. The local
implementation helper and tracked structural regression now make the mutable slot
exactly one unique canonical reserved sentence or one unique canonical consumed
two-sentence pair, preserve following reservations as unrelated bytes, and reject
duplicates, malformed/interposed pairs, and escaped 1252/1251/1254/1257 contradictions.
Those landed pre-bridge bytes still require the combined targeted gate and fresh
read-only audit before another top-level canonical invocation.
**Historical Executor SHA-256:** `f473f4ff5e4c64fc1b2fc730cd24cbe48f7e1ea6d8aff1730ed32fe862d5c8de`
— checkpoint `911c29f5`; it is non-authoritative after the behavior-preserving smoke
splits.
**Historical Mid-Split Executor Inventory:** At the `8259a326` checkpoint the facade was
26,391 lines and hashed to
`bf2a3debbdb3646f302b0debd0eb480027453484a3ee46b2a187f69f2bb82799`
(`git show 8259a326:_docs/_workflows/task-540-smoke-executor.mjs | wc -l` and
`| sha256sum`). That was a mid-split inventory value and is superseded; it must not be
read as the facade's present size.
**Current Executor Inventory:** At HEAD `a68a19e0`, re-measured 2026-07-27, the facade
is **976 lines** and hashes to
`2699ea77f59bf40691c8561936d1e484c32cc3639679f2f4c27c6b22f06c9442`, which is also the
value pinned as `FROZEN_HELPER_SHA256[_docs/_workflows/task-540-smoke-executor.mjs]` in
`tests/unit/workflows/task540SmokeExecutorSecurity.test.ts:34`. This is an inventory
value, not a closure pin. Every facade and child-module byte has stabilized, so the
final dependent hashes and pins are recomputed inside the closure transaction.
**Current Split Integrity Contract:** The executor self-test must prove exhaustive,
non-overlapping action-to-scenario ownership for the current manifest, including the
enumerated related-cache and responsive-users owners. An omitted registry member must
fail instead of silently falling through to a shared builder. This is modularization
integrity only; it adds no product behavior or smoke hardening.
**Historical Source Repair Revalidated (superseded by the later L03 overflow revalidation):** 2026-07-16 — the final sequential post-audit stopped before smoke on R01 whole-document stored-read collapse and ambiguous legacy IDs, L03 scalar override loss for `media.multiple`, an optional Canvas region name, incomplete A/B self-scope evidence, and one stale L04 binding-ID expectation. A fresh contract audit also found the optional-ID Assistant composer, missing stored-duplicate regression, and stale L04 provenance. Those scoped repairs had matching receipts before the later overflow repair; this does not replace the next clean post-audit, full validation, final audit, or live smoke.
**Historical Source Repair Ownership (superseded for the later L03 state):** TASK-540-01-L01 owned its schema normalizer and regressions, registered metadata-PATCH proof, `blueprintBindingComposer.ts` plus its focused suite, and read-only action-plan/catalog consumers. TASK-540-04-L03 owned Entry Editor filtering, shared override-contract eligibility, override service activity, and its domain/UI regressions. TASK-540-04-L04 exclusively owned the test-only `custom-screen-editor-binding-flow.test.tsx` shared-helper expectation and its receipt. TASK-540-05-L01 owned only the shared Canvas semantic-panel prop and named-region suite; TASK-540-05-L02 owned only the user-settings route proof. This describes the pre-overflow checkpoint; the later L03 state is recorded below.
**Historical Source Repair Gate Contract (superseded by the later L03 overflow revalidation):** Every owner remained `🚧 In Progress`. The prior behavior owners had `Implementation Complete` and exact receipts when this gate was recorded. Its L03 258/258, L04 98/98, Bun route, static, line, name, workflow, and audit results are historical for the pre-overflow-repair bytes. TASK-540-04-L03 later restored canonical `Implementation Complete` and its exact overflow receipt with no `Repair Pending`; its 2026-07-19 Entry-correction receipt is now current. TASK-540-06-L01 remains the exact pre-closure gate owner. No clean family post-audit, full validation, live smoke, changelog 1252, or atomic Done transition is claimed.
**Historical Pre-Overflow Post-Audit Orchestrator Repair:** 2026-07-17 — the third one-shot post-audit stopped before full validation and smoke. In addition to the L03/L04 owner fixes, closure then pinned the aggregate expected binding ID as a literal, narrowed the grounded-path exception to the two exact declared RouteSession component basenames, and invoked the L04 five-module structural verifier from the owner, closure, and full gates. These durable hardening changes did not authorize closure.
**Historical Pre-Overflow Post-Audit Orchestrator Revalidated:** 2026-07-17 — workflow syntax and repair self-tests passed, including 33 local-runner/security cases and 8 L04 verifier cases; the aggregate/focused eight-file Vitest matrix passed 65/65; core/root static checks, the full family line gate, both split verifiers, the all-family name contract, and `git diff --check` passed; two fresh scoped audits reported 0 HIGH/MEDIUM/LOW findings. The later L03 overflow repair superseded that prepared closure state.
**Historical Pre-Overflow Subsequent Post-Audit Repair:** 2026-07-17 — a complete five-lens run then stopped before full validation and smoke on a narrowed 12-file L03 read-only consumer gate, compile-time type erasure in the R03 shared harness, one duplicate forced content-type read, a 201-media-ID render throw, and one receipt-order sentence. R03 and L03 then owned their source/test corrections; the orchestrator removed the obsolete transient consumer list and pinned the final 15-file L04 matrix in both the executable owner gate and its isolation self-test.
**Historical Pre-Overflow Subsequent Post-Audit Repair Revalidated:** 2026-07-17 — core lint/types and root `tsc` passed; R03 passed the exact six-file 89/89 gate with unchanged 72-name/67-declaration fingerprints; L03 passed its then-exact twenty-two-file 258/258 gate with final navigation/restyle fingerprints; the repaired fifteen-file L04 matrix passed 98/98; and the all-family name/body contract, workflow self-tests, family line gate, and `git diff --check` passed. The later L03 overflow repair superseded that behavior gate.
**Historical Pre-Overflow Scoped Audit Follow-up Revalidated:** 2026-07-17 — two fresh repair audits found and closed the then-remaining contract drift: R03 restored shallow runtime immutability without type assertions, and L03 removed the executable ambiguity around the obsolete 12-file handoff. R03 passed 89/89 plus static/name/line/format/diff checks; the then-prepared-resume workflow, final 15-file authority checks, and both fresh read-only audits passed with 0 HIGH/MEDIUM/LOW findings. That checkpoint still required a clean five-lens run and all later closure gates; the later L03 overflow repair superseded its prepared state.
**Historical Pre-Overflow Start-Gate Semantic Repair:** 2026-07-17 — the next canonical run stopped before post-audit because the historical `task-540-fix.mjs` still executed as a conflicting then-current owner, then-current gate prose retained stale 10/12-file and pre-split counts, the R03 receipt still said 88 harness lines after its freeze repair, follow-up dates preceded the modularity receipt, and two root descriptions mislabeled the deterministic reserved closure gate. The fix workflow then became inert archived evidence, the final 15-file/98-test authority and then-current L04/Canvas/User Settings receipts became explicit, the harness receipt said 95 lines, chronology and reserved-pre-closure prose were corrected, and start-gate failures preserved their safe structured `errors[]`. That checkpoint did not authorize closure.
**Historical Pre-Overflow Start-Gate Semantic Repair Mechanical Revalidation:** 2026-07-17 — archived-fix syntax/import/inertness, implementation syntax and repair self-tests, exact then-prepared resume, family line gate, local helper self-test, Prettier, and full HEAD diff check passed. That checkpoint still required a semantic start audit and all later closure gates; the later L03 overflow repair superseded its prepared state.
**Historical Pre-Overflow Full-Validation Receipt Observability Repair:** 2026-07-17 — a canonical full-validation attempt returned only the generic `full command receipt mismatch` after the full sequential Bun lane completed and the Vitest child ran; the exact full Vitest rerun passed 861/861 files and 7,183/7,183 tests, but the opaque receipt prevented safe classification. The orchestrator now reports only its closed expected command ID plus normalized status, timeout, output-limit, and unchanged-repository booleans after the existing fail-closed predicate rejects. It never projects raw output, received IDs, paths, environment values, or secrets. At that checkpoint the real failure path self-test, syntax, formatting, then-prepared resume, family line gate, and a fresh focused security audit passed with 0 HIGH/MEDIUM/LOW findings; the later L03 overflow repair superseded its prepared state.
**Historical Pre-Overflow Targeted Vitest Under-Load Repair:** 2026-07-17 — the next fresh Start gate and all five read-only post-audit lenses passed without a fixer, after which the new receipt identified `targetedVitest,status=1,timedOut=false,outputLimitExceeded=false,repositoryUnchanged=true`. Two exact 64-file reproductions isolated the same 5,008 ms timeout in the CPU-bound Entry Editor AST/import boundary test while the other 63 files and 706 tests passed; its isolated 7/7 rerun passed. TASK-540-05-L01 added a local bounded 15-second timeout without changing assertions, and revalidation passed isolated 7/7, exact owner 19/19, and exact TASK-540 64-file/707-test matrices plus root static, line, workflow, formatting, and diff gates. Because this test changed after the clean five-lens run, that checkpoint still required a new Start gate and all later closure gates.
**Historical Pre-Overflow Runtime Smoke Preflight Repair (preflight-only call):** the subsequent fresh Start gate, all five post-audit lenses, and the complete full-validation matrix passed, but the one-shot executor call returned only its required fixed failure before helper or browser launch. A bounded read-only DB projection proved `setup.completed` was no longer true and the persisted storage rows were absent. Source inspection then proved the repository-wide Bun lane had deterministically removed those shared rows in two settings-suite teardowns; the next storage step also resolved the relative local root from repo root instead of the bridge's real `core` cwd. The settings suites then added exact row snapshot/restore, the closure/full gates added baseline hashes, and the smoke bridge required canonical persisted storage; a separate audit corrected `Secondary URL`. This consumed call produced no live helper/browser evidence and did not authorize closure.
**Historical Pre-Overflow Post-Audit Selector/Scope Repair:** the next fresh five-lens post-audit stopped before full validation and smoke. It proved the exact media field option is rendered as `Media Asset (media)`, while the action contract still targeted `Media asset (media)`, and it found that the settings-suite isolation repair had also restructured an unrelated legacy-key behavior test outside this leaf's narrow exception. The two media actions and their contract self-test then pinned `Media Asset`; the legacy-key test was restored to its prior behavior shape while exact shared-row snapshot/restore remained. That checkpoint did not authorize closure.
**Historical Pre-Overflow Runtime Smoke Failure-Action Observability Repair:** the next canonical Start gate and all five post-audit lenses passed, followed by green core/root static checks, targeted Bun/Vitest tests, full `bun run test`, exact pre/post settings baseline proof, `precommit:check`, Admin build/boundary/bundle checks, `gates:coderso`, the strict security scan with only its pinned TASK-545-owned finding, and final workflow checks. The one-shot smoke then started the repo-owned helper and returned only `{code:"task540_smoke_failed"}` before any provable successful bootstrap login. Its deterministic cleanup restored settings baseline SHA-256 `7e453af480fe040a55d81ad0ee6c168ef8295a820b4eec2c1ee3331e18ab665b`, removed all task browser/session/listener/screenshot state, and preserved staged snapshot SHA-256 `c5a339b8c5a8d0f639067ae630b8c81c158d8cb519c87445b9416072206c9f0f`. The old generic-only boundary intentionally destroyed the failing action identity, so no exact action or smoke pass was claimed. The executor then added only the bounded allowlisted active-action diagnostic; that checkpoint did not authorize closure.
**Historical Pre-Overflow Failure-Action Diagnostic Self-Test:** at that checkpoint the final executor self-test passed 490 actions and 196 negative cases with caught synchronous stderr writes, including `EPIPE`, `EBADF`, and partial-write containment. The later L03 overflow repair superseded the prepared closure state, not this durable diagnostic behavior.
**Historical Pre-Current-Repair Corrective Implementation State:** 2026-07-19 — the
R01 → R03 → L03 → L04 source chain and TASK-540-05-L01 insertion-test compatibility
update landed and remain re-gated in dependency order. The closure leaf's then-exact
`pre-closure remediation / fix-started 2026-07-15 / gate green` receipt is historical;
only the source-owner receipts remain current. The current closure repair order at the
top of this file supersedes this checkpoint.
**Historical Auth-Settlement Diagnostic Repair:** 2026-07-20 — after the strengthened 60-second exact-root/visible-menu settlement helper and Dashboard warm restart, a fresh canonical Start gate, five-lens post-audit, and complete full-validation matrix passed, but the one-shot smoke again stopped at `set-011a-bootstrap-auth-settled`. Cleanup proved no retained helper, browser, server, screenshot, or repository mutation. L01 added exact allowlisted browser failure frames, private `WeakMap` branding, and a post-cleanup class projection. The next canonical run proved that repair incomplete because its generated-source harness began after the real command boundary and therefore could not classify a transport, normalization, or success-contract failure.
**Historical Auth-Settlement Pre-Classifier Repair Implemented And Target-Revalidated:** 2026-07-20 — the prior canonical Start gate, all five post-audit lenses, full repository test matrix, precommit checks, release gates, strict security scan, and final workflow contracts passed before the helper-backed Playwright CLI smoke stopped at `set-011a-bootstrap-auth-settled` with the exact action-only diagnostic. Deterministic cleanup left no helper, browser, server, session, listener, screenshot, private workspace, or repository mutation. The then-current repo/inherited secret corpus had no substring collision with an allowlisted auth failure frame, so that consumed run proved only a pre-classifier blind spot. The frozen executor separated browser, executor, and diagnostic-union classes; retained raw CLI/error/process details only in a separate write-only private map; applied the exact Playwright-only frame and secret-first process precedence; branded invocation, normalization, eligible success-contract, command-receipt, and validated post-parse result boundaries; and executed the real `LocalCommandAuthority` plus tracker/cleanup/emitter in its hermetic matrix. SHA-256 `70162b648d4f294d61142da3a424b9a7b79a61cf0b30a450307abde8105f503e` passed Prettier, syntax, and the executor self-test with 496 actions, 159 runtime receipts, 54 cleanup actions, and 706 negative cases. Two fresh current-byte implementation post-audits reported 0 HIGH/MEDIUM/LOW findings. The next canonical smoke classified the still-present invocation bug, so this receipt is historical.
**Historical Capture-Frontier Observation Repair Implemented And Target-Revalidated:** 2026-07-20 — the next fresh Start gate, five post-audit lenses, full repository validation, release gates, strict security scan, and final workflow checks passed before the one-shot helper-backed Playwright CLI smoke stopped at `set-011a-bootstrap-auth-settled` with exact `failureClass:"invocation_boundary_failed"`. Deterministic cleanup left no helper, browser, server, session, listener, screenshot, private workspace, or repository mutation; no TASK-540 fixture-create action had started. Three independent read-only traces and an in-memory call through the production compiler proved the ordinal-15 observation failed before CLI spawn because its generic config eagerly resolved the later `media.id` entry baseline. The strict capture map/resolver remained unchanged and fail-closed. Entry-baseline/reset authority became lazy for its two observation consumers, and executor SHA-256 `bfbc662b94127c486ac5e8057f51f498147e391854bcd8ac50eab1e8e3738f03` passed Prettier, syntax, and the self-test with 707 negative cases. A fresh post-audit then found one sibling LOW: non-consuming visible assertions still eagerly resolved the same baseline, so this receipt is historical.
**Historical Capture-Frontier Consumer-Isolation Repair Implemented And Target-Revalidated:** 2026-07-20 — the strict capture map and resolver remain unchanged and fail-closed. Entry-baseline/reset authority was materialized only by its three exact consumers: observations `relation-pickers-a-b-warm` and `related-unrelated-drafts-before`, plus assertion `relation-diff-exact`. Exact empty and partial bootstrap-frontier regressions compiled the canonical invocation, a non-entry assertion compiled without baseline captures, and both entry-dependent observation and assertion paths rejected missing captures. Frozen executor SHA-256 `cde2a5924fcef4ecab2ed05b019b0ea1cf6492c77f458e7d716e7cf78950cf25` passed Prettier, syntax, and the self-test with 496 actions, 159 runtime receipts, 54 cleanup actions, and 708 negative cases. The next canonical workflow passed the clean five-lens post-audit and complete full validation before exposing the later dirty-flow handoff defect, so this receipt is historical.
**Historical Dirty-Flow Beforeunload Handoff Repair Implemented And Target-Revalidated:** 2026-07-20 — the canonical Start gate, clean five-lens post-audit, full `bun run test`, `precommit:check`, Admin build/boundary/bundle checks, `gates:coderso`, strict scan, and final workflow contracts passed before the helper-backed Playwright CLI smoke stopped at `dg-003-builder`. Flow 4 intentionally commits an inline Entry edit and therefore leaves the browser draft dirty; `dg-001/002` reset and verify only the backend. The unchanged 496-action manifest now states that boundary explicitly. Only `dg-003-builder` proves the visible dirty badge, snapshots and temporarily replaces the exact CLI dialog listener set, accepts exactly one `beforeunload`, restores listener identity/order in `finally`, and then proves the exact builder URL plus one visible canvas. Frozen executor SHA-256 `b808b044b1f19d8b4cb7d3a103005b772208ecb6466c4ff1e74f7ea7b806e695` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 159 runtime receipts, 54 cleanup actions, and 732 negative cases. The failed call removed its browser/process/port/task-traffic state but left nonce-scoped domain fixtures, so this receipt is historical.
**Historical Failure-Cleanup Lifecycle Repair Implemented And Target-Revalidated:** 2026-07-20 — exact recovery removed only the failed nonce's one SEO row, two Screens, six Entries, one Media row and its SHA-256-pinned file, four content types, two users, and two role bindings; required settings and the accepted bootstrap recovery baseline remained byte-identical during recovery. Read-only source and DB evidence proved `ss-005/006` had intentionally removed and proved the acquired presentation override absent before failure cleanup incorrectly required it present, and proved Entry cleanup did not own the separately persisted SEO document. The executor now accepts an absent override only with the complete exact create -> `ss-005` reset -> `ss-006` empty-proof authority, emits its real provenance/delete/absence receipts against a fresh exact absence proof, and otherwise fails closed. It also discovers the exact Entry SEO row with bounded cardinality, models it as a child, and deletes/proves it absent before the Entry. Frozen SHA-256 `1073a2d61d05874b6cdc2525d62e346a18049846452d160a30c965abd13bd100` passed Prettier, syntax, diff checks, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 748 negative cases. The next canonical run passed all gates and setup, then exposed the later `dg-017` settlement-proof race, so this receipt is historical.
**Historical Builder-Discard Settlement Proof Repair Implemented And Target-Revalidated:** 2026-07-20 — the latest canonical Start gate, clean five-lens post-audit, complete repository validation, release gates, strict scan, and helper-backed Playwright CLI setup passed; four screenshots were captured before the smoke stopped at `dg-017-builder-confirm-proof`, and deterministic cleanup removed every task-owned fixture and screenshot. The action contract already required the records workspace, discarded draft, and exact visible `Record actions` control to be ready, but the executor sampled URL and navigation count immediately after the SPA discard click, omitted the workspace latch, and derived `draftDiscarded` from absence of the Screen ID in a canonical records URL that necessarily contains that ID. `dg-017` now waits up to 30 seconds for the canonical records URL plus exactly one visible positive-geometry control and exact absence of both builder canvas and dirty badge, fails closed on duplicates or timeout, and only then proves the one-navigation discard. Its compiled-source self-test pins those checks and forbids the invalid URL-substring derivation. Frozen SHA-256 `cf821d6604174bd61ab4ca432742ad7c665d56e04a975e3c32c3157863b855e4` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 748 negative cases. A fresh read-only audit found no other HIGH/MEDIUM issue in `dg-011`–`dg-018` and verified the product discard path plus regression tests are correct. The next canonical run passed `dg-017` and exposed the later tone-selection proof defect, so this receipt is historical.
**Historical Pre-TASK-546 Strict Dependency Repair:** 2026-07-20 — TASK-540 then
remediated development-toolchain advisories with the exact versions present at that
checkpoint. TASK-546 later superseded those versions and owns the current dependency
graph. TASK-540 must preserve the landed `package.json`/lockfile bytes and prove a fresh
zero-finding strict scan; it must not restore or validate the historical pins.
**Historical Tone-Selection Visible-Effect Proof Repair Implemented And Target-Revalidated:** 2026-07-20 — the next canonical Start gate, all five fresh post-audit lenses, complete repository validation, release gates, and strict security scan passed. The helper-backed Playwright CLI smoke passed the repaired `dg-017`, captured four screenshots, then stopped at `dg-022-tone-muted`; deterministic cleanup removed every task-owned fixture and acquired TASK-540 screenshot. Three independent read-only traces found no product defect: the typed Select -> override draft -> dirty state -> renderer path and its Vitest regressions are intact. The defect was the generic click executor, which neither owned the portaled Radix menu nor waited for its advertised muted/dirty visible effect. Both `dg-021`/`dg-022` and the sibling `rc-015`/`rc-016` became exact specializations requiring the selected target, visible positive-geometry panel/trigger/menu/option, `aria-controls` menu ownership, retained selection, exact content and presentation dirty badges, closed-menu settlement, the presentation-override marker, and a real computed-color transition. Frozen SHA-256 `9400241963457929fad02edcc1c3d841edec2db78a5f2abcc2a65a7b611e5b6d` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 916 negative cases. The next canonical smoke exposed the post-fill blur race at `dg-021`, so this receipt is historical.
**Historical Post-Fill Blur And Portaled Tone Settlement Repair Implemented And Target-Revalidated:** 2026-07-21 — the subsequent canonical Start gate, all five post-audit lenses, complete repository validation, release gates, and strict security scan passed; the helper-backed Playwright CLI smoke passed `dg-017`, captured four screenshots, then stopped at `dg-021-tone-open`, and deterministic cleanup removed every nonce-owned fixture and acquired screenshot. Two independent read-only source traces proved the product Select, override, renderer, and selection contracts correct and identified an executor race: `dg-020` used `fill()`, while `InlineEditWrapper` commits only on blur, so the first Tone interaction both committed the content draft and opened the portaled Radix menu across a rerender. Both `dg-021` and sibling `rc-015` then explicitly blurred the exact selected textbox, waited for the visible dirty settlement, and reacquired the panel, target, handle, textbox, trigger, and portaled menu. Frozen SHA-256 `72e5f16fcc9fa34b4b9acde85d0304c0b947d2ba30f63809fdd55db91ea0a996` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 974 negative cases. The following diagnostic helper-backed smoke returned `200` for Admin and front, completed setup, captured five screenshots, again stopped at `dg-021-tone-open`, and completed exact fixture/screenshot/server cleanup. That run proved the commit still belonged to the wrong action, so this receipt is historical.
**Historical Atomic Content-Commit And Tone Diagnostic Repair Implemented And Target-Revalidated:** 2026-07-21 — source tracing found the remaining contract drift one action earlier: `dg-020-headline-fill` and sibling `rc-014-unrelated-fill` promised `value -> content dirty` but used the generic fill executor and returned while the draft still existed only in the focused DOM node. Because `InlineEditWrapper` commits on blur, the next action could encounter a refreshed or hydrated textbox and never obtain dirty authority. Those exact two fill actions now atomically require unique visible positive-geometry textbox, selected root, and pressed handle; fill the exact expected draft; prove exact text plus active focus; blur; reacquire every locator; and require the exact non-focused draft, retained selection, and one visible positive-geometry `Unsaved changes` badge before returning. `dg-021` and `rc-015` contain neither fill nor blur: they consume that settled draft/dirty authority, capture baseline color, then prove the visible positive-geometry Radix menu, Muted option, reciprocal `aria-controls`/id, and expanded state. A closed four-class diagnostic for only those two open actions distinguishes target, draft/dirty, trigger, and portal settlement through byte-identical frames, a private WeakMap, the existing 256-byte one-shot post-cleanup channel, and no raw error/DOM parsing. Three fresh current-byte audits passed the DOM/runtime, action-ownership/hydration, and diagnostic-security/mutant lenses with no finding. Frozen SHA-256 `c0589a50484357209b506865ca449cf6399654ffb77a1f1c3bfd53dace45b533` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1239 negative cases. The next helper-backed diagnostic smoke passed `dg-020` and `dg-021`, captured five screenshots, then stopped at `dg-022`; exact cleanup removed every fixture, screenshot, helper, browser, and server, so this receipt is historical.
**Historical Tone-Select Settlement Diagnostic Repair Implemented And Target-Revalidated:** 2026-07-21 — the next frozen executor kept the already-proven atomic content commit and added six monotonic, exact-frame classes for only `dg-022` and sibling `rc-016`: authority/option, menu close, dirty badges, selection/override, muted class, and computed-color delta. Exact frames remained bounded to 256 bytes, mapped to a private WeakMap, and emitted once only after cleanup without raw error or DOM parsing. SHA-256 `a6ecc7cc28c5f28a5aecbb6aa2d264e6ab107c19f11652e389164576ffffa829` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1534 negative cases. Two independent runtime traces found no product defect, and the helper-backed diagnostic smoke then passed `dg-020`, `dg-021`, and all six `dg-022` visible-effect latches before stopping at `dg-024-entry-nav-cancel`; five screenshots were acquired and exact cleanup removed every task-owned resource. A fresh audit also found one MEDIUM mutation-test gap in tone-select process precedence, fixed and revalidated by the successor, so this receipt is historical.
**Historical Dirty-Navigation Dialog Settlement Repair Implemented And Target-Revalidated:** 2026-07-21 — the `dg-024` terminal boundary proved that the old generic click failed during target acquisition or click before it could own the advertised dialog effect. Source tracing found desktop and hidden mobile SidebarNav instances, while the generic executor incorrectly required total DOM cardinality one. Exactly five contract-identical actions (`dg-012`, `dg-015`, `dg-024`, `dg-037`, and `rc-037a`) now select exactly one visible positive-geometry Records link, freeze the canonical source URL and navigation count, click once, and return only after one visible positive-geometry dialog exposes the exact realm-specific title and description plus one `Keep editing` and one `Discard and continue` button while URL and navigation count remain unchanged. Product source remains untouched; its isolated dirty-navigation suite passed 9/9. Independent literal ownership and mapping pins, per-field/extra-action/deletion/order mutants, and the repaired exact-frame process-precedence test closed both fresh audit findings; two fresh read-only re-audits reported 0 HIGH/MEDIUM/LOW findings. Frozen SHA-256 `214a5fa2d7a3e33a7003ed8c8e2005a921574dbb4be4d471adadfcbb2be7e789` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1968 negative cases. The next helper-backed diagnostic smoke passed the builder siblings `dg-012` and `dg-015`, again acquired five screenshots, then stopped at entry action `dg-024`; exact cleanup removed every task-owned resource. A fresh trace found that the remaining latch incorrectly counted every global dialog surface instead of the exact named dirty-navigation dialog, so this receipt is historical.
**Historical Exact-Named Dirty-Navigation Dialog Repair Implemented And Target-Revalidated:** 2026-07-21 — the five dirty-navigation actions retain their exact visible-link, canonical URL, navigation-count, realm-title, description, button, and geometry requirements, but dialog cardinality is now scoped to `getByRole("dialog", { name: exact realm title, exact: true })` instead of every unrelated Admin dialog surface. Heading, description, `Keep editing`, and `Discard and continue` remain exact and scoped under that one named dialog; two dialogs with the same owned accessible name still fail closed. The source contract forbids the global locator and adds explicit global, inexact, wrong-name, deletion, and ordering mutants while preserving the independent literal five-action mapping. Two fresh current-byte read-only audits report 0 HIGH/MEDIUM/LOW findings and independently confirm no product change is required; the second live run also disproved the earlier `dg-010` predecessor-race hypothesis by passing both builder cancel/reopen latches. Frozen SHA-256 `4e2995ae56174032b71fa897276009d6b7ef366568ec547d5227e75952f2315b` passes Prettier, syntax, the 109-case contract self-test, the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1983 negative cases, plus the repair-sibling and local-orchestrator self-tests. The next diagnostic run and cleanup audit superseded this receipt.
**Historical Bounded Dirty-Navigation Diagnostics And Complete Cleanup Coverage Implemented And Target-Revalidated:** 2026-07-21 — a third helper-backed diagnostic smoke again reached `dg-024-entry-nav-cancel` after five screenshots, while an exact manual Playwright point probe and an immediate post-dirty race probe both proved one visible Records target, one exact named dialog with positive geometry, its exact heading/description/buttons, a stable source URL, and zero navigation. This isolated the unresolved boundary to executor diagnostics rather than product UI. An exact residue audit then corrected the prior cleanup claim: eight complete TASK-540 nonce families remained (127 exact DB rows and eight exact media files) because the terminal masked cleanup failure and SEO discovery owned only one of six fixture Entry documents. Every exact leaked row and file was removed with provenance, cardinality, bootstrap-admin, no-follow, inode, size, and SHA-256 guards; the active canonical admin remains intact. The executor emits one post-cleanup, <=256-byte allowlisted diagnostic, preserves the real phase for returned phase-6/7 failures, and discovers all six exact Entry SEO targets with stable child-before-parent cleanup. Frozen SHA-256 `4bae679c630e54533c240fae5e6d76b58254dc109242b91d1ba84b162408f1da` passed Prettier, syntax, and the executor self-test with 496 actions, 177 runtime receipts, 72 cleanup actions, and 2230 negative cases. The next live smoke exposed incomplete Select teardown and insufficient phase-3 attribution, so this receipt is historical.
**Historical Select-Teardown, Physical Dirty-Navigation, And Phase-3 Attribution Repair Implemented And Target-Revalidated:** 2026-07-21 — the next helper-backed smoke again passed setup and the Tone visible-effect flow, then emitted exact terminal `{failedActionId:"dg-024-entry-nav-cancel",failureClass:"click_failed",cleanupPhase:3,cleanupFailureClass:"phase_failed"}`. Read-only forensics found one exact nonce family with four content types, six Entries, two Screens, one Media row and its 68-byte SHA-256-pinned file; SEO, overrides, revisions, settings, synthetic users, sessions, audit/access rows, and every other task-owned surface were absent, global settings matched baseline, and the sole active canonical admin remained intact. A literal-ID, no-wildcard, no-user-delete, no-follow cleanup removed exactly that `4/6/2/1 + file` family and a fresh dry-run proved `0/0/0/0 + no file`. Source tracing found no product navigation defect: the Tone-select latch could return before Radix released its global pointer/scroll lock, while dirty-navigation visibility/geometry did not prove event delivery and its catch conflated pre-dispatch failure with post-dispatch auto-wait. Exactly two Tone-select actions now require every Select content node absent plus body scroll/pointer unlock; exactly five dirty-navigation actions require body unlock, a center-point physical hit test, no pre-existing named dialog, `noWaitAfter`, and the full stable dialog postcondition even after click throws. Their closed browser union adds only `pointer_locked` and `target_intercepted`. Phase 3 now distinguishes stage, dependency, provenance, delete, and absence failures while preserving higher-priority plan/Admin classes. A fresh cleanup-integrity audit found that four real Admin/plan/phase/final aggregation seams were not mutation-guarded; hermetic production-path evidence and four source mutants now bind those seams through the exact bounded, private-marker-free diagnostic. Frozen SHA-256 `5b0de7a899f17148e23272a83d69a5ce148bf3477adc1aed6db3e80b65d039b4` passes Prettier, syntax, and the executor self-test with 496 actions, 177 runtime receipts, 72 cleanup actions, and 2544 negative cases. Fresh read-only re-audits, one diagnostic helper-backed smoke, then the canonical audit/full-validation/smoke, changelog, and closure remain mandatory.
**Historical Stable Select Handoff, Latest-Target Diagnostics, And Hash-Only Cleanup Receipts Implemented And Target-Revalidated:** 2026-07-21 — the next helper-backed diagnostic smoke passed setup and the Tone visible-effect flow, then emitted exact terminal `{failedActionId:"dg-024-entry-nav-cancel",failureClass:"pointer_locked",cleanupPhase:3,cleanupFailureClass:"persistent_provenance_failed"}`. Exact nonce `wf540-fb30befde747` residue was four content types, six Entries, two Screens, one Media row, and its exact 68-byte file; a literal-ID, no-wildcard, no-user-delete, no-follow cleanup script with SHA-256 `821fe5d6ecf122edf068d8b051c3ac9c903faecc19f7d84399a244e56dbf2b1e` removed exactly that `4/6/2/1 + file` family, and two consecutive post-apply dry-runs proved `0/0/0/0 + no file` while preserving the canonical admin and proving no FK blocker. No TASK-540 screenshot, browser/server process, or owned port remained. Three independent read-only traces found no product defect: Tone selection used a mixed-time cached teardown sample, dirty-navigation retained a sticky historical blocker instead of the latest poll state, and each successful cleanup Admin GET carried a non-empty `Buffer` into recursive freeze after provenance but before DELETE; the same latent defect also affected DELETE and 404 absence receipts. The executor now requires the full Tone visible-effect and atomic Select/body teardown postcondition continuously for at least 600 ms across at least two samples plus a final atomic handoff sample, reports one of seven exact Tone-select classes, recomputes each target-acquisition poll from the latest one of five blocker classes within the closed twelve-class dirty-navigation action union, and hashes bounded non-empty authoritative response bytes before discarding the raw `Buffer`; only validated lowercase SHA-256 enters frozen cleanup receipts, while exact ID/media key/URL and fresh absence proofs remain unchanged and `deepFreezeExact` is not weakened. Hermetic real Admin P/C/A tests and mutants cover legal Screen/Entry representation drift, wrong ID/key/URL, exact attempted-request/no-DELETE/zero-receipt projection, accepted one-byte/exact-MAX boundaries, non-Buffer/empty/oversized byte rejection, unconditional latest-state assignment, full dwell reset/body/geometry predicates, relock timelines, and raw-Buffer/hash regressions. Product source remains untouched by this repair. Frozen executor SHA-256 `6accccffc88371978f2c3ad1727dbbf96aa2473802ea583d14cbc0c4ea548001` passes Prettier, syntax, diff checks, and the full self-test with 496 actions, 177 runtime receipts, 72 cleanup actions, 26 captures, and 2668 negative cases. Fresh read-only re-audits, one diagnostic helper-backed smoke, then the canonical audit/full-validation/smoke, changelog, and closure remain mandatory.
**Historical Scroll-Lock Ownership And Bootstrap-Restore Uncertainty Repair Trigger:** 2026-07-21 — the next helper-backed smoke reached the same Entry dirty-navigation boundary and emitted exact terminal `{failedActionId:"dg-024-entry-nav-cancel",failureClass:"scroll_locked",cleanupPhase:8,cleanupFailureClass:"phase_failed"}`. A post-exit read-only absence audit proved every TASK-540 nonce-shaped resource, owned file, screenshot, helper/browser/server process, and owned port absent, but phase 8 did not return accepted restoration evidence before the executor exited; the private preflight bootstrap timestamp baseline and newest smoke-owned pair are no longer available, so the final `lastLoginAt`/`updatedAt` restoration outcome is unprovable. This consumed run must not be recovered by guessed timestamps or any post-exit write and does not authorize closure. Exact source/dependency tracing proved `dg-022` handed off one final atomic unlocked sample after its full 600 ms dwell, `dg-023` performed read-only DOM/URL observations, and `dg-024` reported only its last completed target poll rather than a continuous ten-second lock; no product or Radix reopen path is evidenced before the unperformed navigation click. The bounded cross-CLI lock-owner observation and phase-8 uncertain-CAS reconciliation plus their tests/mutants are now landed in the exact pre-bridge checkpoint above, with product source unchanged. They still await the bridge-inclusive targeted gate and carry no current completion receipt.
**Current Repair Execution Order:** The final sentence of the 2026-07-21 trigger
evidence describes its then-planned sequence and is historical. The authoritative
sequence is the `Current Closure Repair State` at the top of this file. Its first step,
cohesive smoke facade/child modularization to at most 1,000 physical lines per module,
is **done** as of 2026-07-27 and is struck from the remaining work; the surviving order
is: prove split integrity and recompute final dependent helper/task/test pins now that
the smoke bytes have stabilized -> targeted and full gates -> helper restart -> exactly
one canonical seven-flow Playwright CLI smoke with 13/13 screenshots and deterministic
cleanup -> changelog/control and child-first status closure -> final closure checks,
commit, and integration into `feat/implementations`.
**Historical L03 Source Repair Required:** On 2026-07-15 the live-smoke feasibility audit proved duplicate canonical/legacy cacheBus transport delivery made the exact-one `related-a-refresh` route contract impossible; the scoped repair landed and was revalidated.
**Historical L03 Source Repair Owner:** TASK-540-04-L03 was the sole repair owner for the generic per-subscription cacheBus transport dedupe in `core/admin/utils/cacheBus.ts`, its regressions in `tests/vitest/admin/cacheBus.test.ts`, and additive direct-image route-boundary regressions in `tests/integration/routes/customScreensRoutes.test.ts`. No production route file changed.
**Historical L03 Source Repair Gate:** TASK-540-04-L03 alone held the exact three-path repair authority, ran its required gates, and atomically replaced its matching `Repair Pending` receipt with one `Revalidation Passed` successor plus canonical `Implementation Complete`. That durable evidence remains valid but does not substitute for any later source-repair receipt or closure gate.
**Prior Source Repair Started:** 2026-07-15
**Prior Source Repair Reason:** Mandatory repository-wide `bun run test` paused closure after confirming that `screen-editor-sections.test.tsx` lacked the fresh-symbol cacheBus factory required by the L04-owned Screen builder Save path. TASK-540-04-L04 completed the additive mock repair and exact six-file re-gate; closure resumed with every source-owner test read-only.
**Prior Source Repair Revalidated:** 2026-07-15 — `bun --cwd core lint:types`, `bun --cwd core lint`, root `tsc`, exact six-file Vitest gate 66/66, isolated `screen-editor-sections` 9/9, workflow syntax, repair-sibling self-test 9/9, diff check, and five then-current post-audit lenses with zero HIGH/MEDIUM/LOW findings; this historical L04 receipt predates and cannot substitute for the later cacheBus repair's own landed L03 revalidation.
**Historical Source Repair Started:** 2026-07-14
**Historical Source Repair Reason:** Repository-wide Bun validation paused closure after confirming a stale strict-V4 Custom Screen fixture in `tests/unit/assistant/actionExecutorService.test.ts`. TASK-540-01-L01 alone owned the fixture-only repair and re-gate; closure kept every source-owner test read-only and resumed after R01 was Done.
**Changelog:** 1252 (pinned; closure only)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

---

## Exclusive ownership

- new aggregate suite
  `tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`; this is the only
  test file closure may create and the only behavior suite it may extend
- verified full-gate state-isolation repairs in exactly
  `tests/unit/settings/settingsService.test.ts` and
  `tests/unit/settings/storageSettings.test.ts`; these two suites may change only their
  shared-row snapshot/restore and cache/environment teardown boundaries
- exact successor ownership of
  `tests/unit/workflows/task540SmokeExecutorSecurity.test.ts` for this workflow repair
  only: preserve every TASK-546 credential/run-code/executor-equality assertion; add the
  worktree-root and clean-strict-scan regressions; independently load the new bridge
  source and prove no Claude runtime/fallback; the exact continuous
  root-to-`task-540-local-orchestrator.mjs --run` private non-TTY pipe transport,
  local notification, seven control/reply frame pairs, sequential single-flight
  enforcement, explicit host-handled abort versus raw EOF/root-loss lifecycle, and
  host-only inspect/status/wait/respond/procedure/recover-review CLI launch authority;
  schema
  registration/identity/GATE/clone rules,
  the closed scalar type forms plus the sole exact GATE-property
  `["string","null"]` union,
  domain-separated canonical hash preimages, the decision-bound operator/timeout claim
  CAS and its six-row cleanup-only crash matrix, timeout-before/after-claim transitions,
  exact monotonic response eligibility, claimed-but-spawn-failed/deadline race table,
  exact result/transcript digest binding, contender-start identity/hash binding, CAS
  link-count transitions, success/EEXIST acknowledgement, procedure/transcript
  correlation, safe ledger projection/prefix/restart, abort sealing, terminal/abort hash
  preimages, pre-artifact run journal, crash-recoverable index-last terminal journal, and
  exact request/ledger cleanup presence plus terminal-temp restart tables; the
  fixed-journal launch-plan/host-arm/private-GO handshake for every bridge mode spawned
  only by the continuous host, including the pre-GO request-inaccessibility and EOF
  contract; exact
  21-target status rollback-marker creation, marker-priority restart, all-old board-last
  convergence, deterministic journal cleanup; final cleanup behavior; and pinned mutant
  counters; and update
  `MASKED_IMPLEMENT_SHA256` exactly once after all authorized implement-workflow bytes
  are final. The bridge self-test cannot self-certify these properties by itself, and
  weakening/removing the masked-byte equality is forbidden. No extracted tracked
  test/support file is authorized for this repair; this one tracked successor must
  remain at most 1,000 physical lines. Clean-checkout reproducibility is mandatory.
  The seven top-level helper/facade paths remain the public workflow bundle. Cohesive
  tracked modules under `_docs/_workflows/task-540-smoke/**` are their internal
  implementation owners, not new public entrypoints or extracted security-test support.
  Before the complete targeted gate, every top-level path and child owner must be a
  regular tracked non-symlink file with its final hash. The 1,000-line limit does **not**
  apply to the seven top-level helpers and that is settled — do not re-open it. AGENTS.md
  binds "a human-authored production module or test file"; these are workflow tooling
  under `_docs/_workflows/`, and `isLineLimitedHumanAuthoredModule` already admits only
  `core/`, `packages/`, `store/` and `tests/` paths, with a self-test case asserting
  `_docs/_workflows/example.mjs` is out of scope. Three helpers exceed the limit today
  (`task-540-implement.mjs`, `task-540-local-orchestrator.mjs`,
  `task-540-test-name-contract.mjs`), so the earlier wording was unsatisfiable without
  splitting a volume of tooling no gate measures. Child modules under
  `_docs/_workflows/task-540-smoke/**` stay at or below 1,000 lines as a family
  convention — the property that localises a regression to one named file — not as the
  AGENTS.md gate. See TASK-540-06 for the full reasoning.
  TASK-540 stages only its changed top-level and child-module paths without changing the
  broad `_docs/_workflows/` ignore rule. Missing, ignored-only, partially tracked,
  hash-mismatched, generated/archived, conditionally registered, or skipped coverage
  fails. TASK-545 retains repository-wide workflow and screenshot-manifest policy.
- every other Vitest/Bun path in the required matrix is read-only here and remains
  owned by its source leaf, including the image-inspector, Custom Screens client,
  entry-preference persistence, and navigation-guard suites
- `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, and the narrow
  `_docs/SECURITY_SPEC.md` correction stating that CSRF covers every unsafe method,
  including PATCH
- `_docs/CMS_API.md` is a read-only closure validation input because its matching
  direct-image/media-field correction is already landed at the current HEAD
- `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`
- relevant Custom Screens user/developer guides
- task-prefixed screenshots named `_docs/_workflows/_smoke/task-540-*`
- TASK-540 descendant statuses, board row/statistics, changelog 1252 at closure

Do not reopen production source or re-baseline/edit a source-owner test outside the two
exact state-isolation repairs above. If a source
defect or missing source-owner assertion remains, return it to its owning leaf/fix
workflow, re-run that leaf's gate, then resume closure.

### Accepted non-blocking LOW follow-ups

Closure may treat only this concrete, execution-ready TASK-9999 leaf as non-blocking:

- TASK-9999-01-L01:
  `_docs/_TASKS/TASK-9999-01-L01-Decouple-Actor-And-Media-Uuid-Domain-Naming.md`.
  TASK-9999-01-L01 approved evidence: core/services/customScreens/screenMediaIdentity.ts:4; core/services/customScreens/screenEntryPresentationOverrideContract.ts:192; core/services/customScreens/screenEntryPresentationOverrideContract.ts:229; core/services/customScreens/screenEntryPresentationOverrides.ts:421.
  TASK-9999-01-L01 approved rationale: the shared UUID predicate already accepts and rejects the intended actor/media UUID grammar and preserves exact input bytes; deferral changes no UI/UX/accessibility, data, security/privacy/auth/RBAC, API, persistence/migration, performance/reliability, or test-integrity behavior.
  TASK-9999-01-L02 was re-triaged on 2026-07-18 and is `⏭️ Superseded` by active `TASK-540-02-L01`; removing `baseLabel` would regress focus-preserving stale-draft invalidation, so it is not eligible for TASK-9999 deferral.

The sole accepted normalized tuple is the canonical JSON object
`{"area":"deferred-low:actor-media-uuid-domain-naming","evidence":["core/services/customScreens/screenMediaIdentity.ts:4","core/services/customScreens/screenEntryPresentationOverrideContract.ts:192","core/services/customScreens/screenEntryPresentationOverrideContract.ts:229","core/services/customScreens/screenEntryPresentationOverrides.ts:421"],"finding":"Actor UUID validation reuses the media-named UUID predicate without behavior change.","ownerOneOf":["540-01-L01","540-04-L03"],"recommendation":"TASK-9999-01-L01","severity":"low"}`.
Its pinned digest is
`sha256("coderso.task540.deferred-low-tuple.v1\0" + canonicalJson(tuple)) =
797e76b442acd2a0e8afcde29250cd2e558e93a8bb4b489bfce1908fd06e8666`.
An audit item normalizes only when its owner is one exact `ownerOneOf` member and all
other scalar fields and the ordered, semicolon-parsed evidence array are byte-equal;
the actual owner never changes the normalized tuple. The full current backlog leaf
must independently hash to
`0179d6fc94762dc5fa27d6749a1149031ab7912ea4757911e59238736cfc4eda`,
have exact physical ID `TASK-9999-01-L01`, `Source Task: TASK-540`, and `Status: ⏳ To
Do`, and both TASK-540 source backlinks must be exact. Only then may the workflow
exclude that one tuple. A changed backlog byte, second match, different finding,
TASK-9999-01-L02, any other TASK-9999 item, HIGH/MEDIUM, or LOW involving
UI/UX/accessibility/data/security/privacy/auth/RBAC/API/persistence/migration/
performance/reliability/test integrity remains blocking.
TASK-9999 remains byte-identical as the final In Progress board row throughout closure;
board counts are read fresh and TASK-540 applies only its own In Progress→Done delta.

### Orchestrator-only smoke module boundary

The current repository broadly ignores `_docs/_workflows/`; TASK-545 owns the
repository-wide workflow and durable screenshot-manifest policy. TASK-540 historically
recovered its operational files only into the local worktree. Recovery is complete; the
Vite/bridge/local-host/schema/recovery prerequisites are landed. Behavior-preserving
modularization of the smoke facade into cohesive tracked owners under
`_docs/_workflows/task-540-smoke/**` is complete; it replayed no recovery, added no
hardening, and altered no product behavior. Every facade and child owner is at or below
1,000 physical lines and the smoke bytes have stabilized, so the condition on computing
dependent hashes and updating the implement/executor/task/test pins is met; that
recomputation is part of the closure transaction, not a step ahead of it. Final
preflight and staging cover the
seven top-level helper/facade paths plus every changed child owner, without changing
`.gitignore` or staging any unrelated workflow or loose screenshot.
The sole historical recovery source is commit
`3d5604ecfdeaa9c4d5ef32c1314b838a793441ad`, with these exact pre-repair SHA-256
values:

| Local workflow                    | Recovery SHA-256                                                   |
| --------------------------------- | ------------------------------------------------------------------ |
| `task-540-fix.mjs`                | `b65b1b7cce153471e71ef613bb6515846ba02515a603a899be3ffdc9388ef846` |
| `task-540-implement.mjs`          | `aaff4435ea87445e2183c3ba017c9c8e1de255694838be91aa1845fa1e1eb377` |
| `task-540-local-orchestrator.mjs` | `f3a26517f3d2f4bfc8618c0690ae10a3b59a9281b17ead7f426fdac632411f46` |
| `task-540-smoke-contract.mjs`     | `5ed7407d13c71becaea40128128774bdf6e3baf26e4f04353715a72f0a48eb74` |
| `task-540-smoke-executor.mjs`     | `75b89a07917b4030f9876f6670c5532a9153ca0415b639b36295ba2088293aaf` |
| `task-540-smoke-host.mjs`         | `ddb9464221275c8b47fffbc7350c95f156393c8652d69920c9e4dd4f6d81fa84` |
| `task-540-test-name-contract.mjs` | `f11a7db3fbddc23274dcc76ecab7183523e5a3604e596606dcb591f93282015d` |

`task-540-codex-agent-bridge.mjs` is the new seventh current repair helper. It is
intentionally absent from this seven-blob historical recovery table and has no invented
recovery hash. The inert historical `task-540-fix.mjs` remains recovery provenance and
is not counted among the seven current repair helpers.

The historical pre-modularization tracked checkpoint bundle was:

| Current local helper                    | Checkpoint SHA-256                                                | Landed authority                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `task-540-codex-agent-bridge.mjs`       | `c3c594a17cb63943beab29e7f621f6e1ca46cb3b5abb67625edcddb900788341` | no-Claude root-mediated Codex bridge                                                               |
| `task-540-implement.mjs`                | `eeb25e7be19f3aa0fa8a6638c5976d9cd1a6228d1d19f9272d713ec0dca4f9cb` | fresh-target parser, worktree root, strict scan and helper pins                                     |
| `task-540-local-orchestrator.mjs`       | `e06c7be9652554111c111c2e8210b733db908a4f272bcbd4a11781174e132da4` | worktree-root host and local orchestration authority                                                |
| `task-540-smoke-contract.mjs`           | `5ed7407d13c71becaea40128128774bdf6e3baf26e4f04353715a72f0a48eb74` | canonical seven-flow smoke contract                                                                |
| `task-540-smoke-executor.mjs`           | `f473f4ff5e4c64fc1b2fc730cd24cbe48f7e1ea6d8aff1730ed32fe862d5c8de` | same-action scroll/pointer/geometry/hit-test dirty navigation and slow-DB cleanup authority          |
| `task-540-smoke-host.mjs`               | `2dbec5af334b4b8d5ef7b2bcda2c1f56f6cac9e86bb7df6bedfb358d05b7d68f` | Vite 8.1.5 smoke host                                                                               |
| `task-540-test-name-contract.mjs`       | `ce052b4245c8c384d0405c32cf9d1df146a2f83a409994a6a2822de5422fc4f5` | worktree-root/name authority                                                                        |

These exact top-level bytes are tracked by checkpoint `911c29f5` and passed their
focused non-DB validation at that checkpoint. The executor hash is non-authoritative
after the later behavior-preserving splits, and the table does not exclude the tracked
child owners under `_docs/_workflows/task-540-smoke/**`. Those facade and child-module
bytes have stabilized, so the final dependent hashes and pins are recomputed inside the
closure transaction.
Historical checkpoint verification checked every byte without replaying recovery. The
recovered implement workflow's
`64daaabad53ebf3a73cc7a35fa4cb6f6b72fcf38f7e85367bf35381e492a57f4`
executor pin is stale against the recovered executor and is not authority. Historical
executor SHA `6accccffc88371978f2c3ad1727dbbf96aa2473802ea583d14cbc0c4ea548001`
is provenance only. Those Vite/bridge/local-host prerequisites are landed, and so are
the cohesive behavior-preserving smoke splits and their split-integrity tests: every
facade and child-module byte is final. Current authorized writes are therefore the
closure transaction's own — the dependent helper hashes and the
implement/executor/live-task/focused-test pins, computed inside that transaction — and
then the remaining steps listed under `Current Closure Repair State` above. Require the
focused TASK-546 security test to prove the equality.
Tracked TASK-540 product/task/test bytes remain the current verified working-tree
authority; old commits are recovery/provenance anchors, never a replacement source
branch.

Historical recovery was idempotent only before the first repair edit. The following
pseudocode remains historical verification/bridge provenance, not the current execution
order:

```text
verifyRecoveredTask540WorkflowSet(root, recoveryTable, currentCheckpoint):
  derive root from the executing module; accept no argv/env root override
  require git rev-parse --show-toplevel == realpath(root)
  require the historical seven-blob provenance table still hashes at its source commit
  require the inert fix helper retains its historical hash
  require each six landed pre-bridge helpers as a local regular, non-symlink file
  require their exact current hashes and the absent not-yet-created bridge
  record verification complete without opening any destination for write
  never restore, replay, or overwrite later repaired bytes

finalizeTask540ExecutorPin():
  require every facade and child owner to be cohesive and <= 1,000 physical lines
  require exhaustive, non-overlapping current-manifest scenario ownership
  format every authorized top-level and child-module change
  require every smoke byte final before computing any dependent final hash or pin
  hash executor exactly once
  update the final dependent helper hashes and implement/executor/task pins
  compute the final masked implement hash and update the focused-test pin once
  run syntax, format-check, and helper self-test preflight
  stage the finalized seven top-level paths plus every changed tracked child owner
  require tracked parity/hashes, then run the focused Bun test and complete targeted gate
  freeze both files; any later byte change invalidates finalization and restarts the gate
```

The formatting-only drift in the recovered implement workflow at its
`sensitiveAssignmentRanges` loop is not TASK-546 behavior. Restore the spaced
`match !== null; )` form before calculating the new masked baseline, then make only the
current contract-authorized changes: the fresh-target changelog-projection parser and
its regression; worktree-root, strict-scan, embedded-diagnostic, scroll-lock-owner, and
phase-8 uncertain-CAS repairs; the `task-540-smoke-host.mjs`-only Vite 8.1.5 version
literals, default fixtures, version mutants, self-test expectations, and embedded
child-source byte pins plus their private optimizer-readiness audit/revalidation;
creation of the Codex bridge; removal of Claude from and integration into the local
host; schema registration and recursive validation; Codex behavioral-policy prompt
replacement; CAS/ACK/procedure-ledger cleanup enforcement; bridge gates and independent
workflow-security test mutants; formatting; and, now that every helper byte is final,
the final dependent helper hashes plus executor/implement/task/test repins, computed
inside the closure transaction.
Root `package.json`, `core/package.json`, and `bun.lock` remain byte-identical and
read-only.
No other recovery edit is authorized. The focused test's new masked hash freezes that
complete authorized result.

### Dedicated-worktree root and security authority

The workflow must run from the dedicated `feature/tasks-fixes` worktree requested for
this concurrent task. `task-540-local-orchestrator.mjs`,
`task-540-codex-agent-bridge.mjs`, `task-540-implement.mjs`, and
`task-540-test-name-contract.mjs` each derive `ROOT` from their own `import.meta.url`
using `fileURLToPath`, `dirname`, `resolve`, and `realpath`; no caller, environment
variable, current working directory, hardcoded checkout name, or sibling worktree may
supply it.
Each requires the executing module to be a no-follow regular file under
`ROOT/_docs/_workflows`, requires `git rev-parse --show-toplevel` and the Git common-dir
worktree relationship to identify that same root, and requires branch
`feature/tasks-fixes`. The root must be a direct safe child of
`/home/coder/project`, must not be `/home/coder/project` itself, and must not resolve
through a symlink. Its basename must match
`/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/`. The canonical module path must equal
`ROOT/_docs/_workflows/<one expected filename>`; `realpath(ROOT) === ROOT` and every
module-path directory segment must be a non-symlink directory. Fixed Git observations
must satisfy `realpath(--show-toplevel) === ROOT`,
`realpath(--git-common-dir) === gitCommonDir`,
`realpath(--git-dir) === gitDir`,
`dirname(gitDir) === gitCommonDir + "/worktrees"`, and
`gitDir !== gitCommonDir`. Thus only a linked worktree of that same repository is
accepted; the primary checkout and unrelated/sibling Git directories are rejected.

The local orchestrator builds every prompt path, `.env*`/`.git`/`node_modules` deny
rule, allowed repository boundary, sibling-project deny rule, bridge URL, and
implementer URL from that verified root. It denies all other discovered worktrees and
sibling projects. The bridge, implementation, and test-name workflows independently
derive and verify the same root; they do not trust a global binding from the host. Every
one of their self-tests covers the dedicated worktree, the legacy main checkout, cwd
spoofing, argv/env override, symlinked module/root, wrong Git top-level/common-dir,
unsafe parent/basename, prompt/deny-rule leakage, and cross-worktree access. A
worktree-local regular `.env` and worktree-local frozen `node_modules` are mandatory;
symlinks or reuse through another checkout fail closed.

### Current strict-scan and embedded diagnostic authority

`task-540-implement.mjs` removes `KNOWN_STRICT_FINDING`, `allowStrictScan`, and every
special status-1/finding projection. Its command schema, `requireFullValidation`,
summary, and hermetic self-tests accept the strict scan only when the command exits 0,
the scanner/tool succeeds, and its locally derived reject-unknown projection is exactly
`{accepted:true,exitCode:0,green:true,classification:"clean",task540Findings:0,
toolingFailure:false,suppressed:false,externalFindings:[],scannerIds:[
"semgrep-sast","bun-audit","trivy-vuln","trivy-config","trivy-secret",
"gitleaks-history","gitleaks-worktree"]}`. The parser requires one strict-mode marker,
exactly those seven `ok` summary rows in that order, one clean terminal marker, empty
wrapper-failure inventory, and no extra/missing/non-zero summary row. Scanner stderr is
bounded and retained only in the existing private local-command authority, must pass
the existing secret-output detector, and is never parsed into or exposed by the clean
projection; benign version-dependent scanner banners/progress therefore cannot become
evidence or a false failure. Exit 0 plus the wrapper-owned exact seven-row/clean-terminal
stdout is the sole success authority; any scanner start/tool/finding failure makes the
wrapper non-zero or changes those rows and is rejected. The full-gate schema pins the exact
keys/constants, `externalFindings` to zero items, and `scannerIds` to that tuple. No
TASK-545/TASK-522 exception, warning-success state, or fallback remains.

There is one runtime mode, not separate diagnostic and canonical modes. A fresh
top-level `--run` performs the Start gate, audits, full validation, and exactly one
canonical executor call. Inside that call, the exact `dg-022` -> read-only `dg-023` ->
`dg-024` sequence is the lock-owner real-browser diagnostic sub-proof. It produces no
partial `CanonicalSmokeEvidence`, changelog/status mutation, screenshot retention, or
reusable pass token. If the sub-proof or any later action fails, deterministic cleanup
runs and the invocation stops; a retry requires a completely fresh top-level invocation
and repeats every audit and full-validation gate. Only the complete seven-flow execution,
evidence audit, and cleanup may satisfy closure. Self-tests reject a second executor call,
partial-evidence promotion, sub-proof replay/skip/reorder, and closure after a diagnostic
failure.

### Current repair implementation pseudocode and targeted gate

```text
deriveTask540WorktreeRoot(moduleUrl, deps):
  fileURLToPath(moduleUrl); no-follow lstat the module and require one regular file
  bind the caller to its compile-time expected filename from the closed
    local-orchestrator/bridge/implement/test-name set; never accept it from argv/env
  require its real path under <candidate>/_docs/_workflows with no symlinked segment
  require candidate parent == /home/coder/project and basename
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
  run fixed /usr/bin/git observations with cwd=candidate and the fixed observational env
  realpath all three roots; require top-level == candidate, dirname(gitDir) ==
    gitCommonDir + "/worktrees", gitDir != gitCommonDir, and branch == feature/tasks-fixes
  reject cwd/argv/env/global overrides, the legacy checkout, a sibling worktree,
    wrong common-dir/top-level, or any path/prompt/deny-rule outside the verified candidate
  return one frozen {root,modulePath,gitDir,gitCommonDir,branch} authority

requireZeroFindingStrictScanReceipt(receipt):
  validate the ordinary local-command receipt schema and exact strictScan command identity
  require tool/scanner success, status 0, no timeout/truncation/spawn error, unchanged repo,
    and a structured zero-finding result
  reject status 1, any finding, warning-success, allowStrictScan, a known-finding projection,
    an exception/allowlist, or missing/malformed scanner output

registerCodexSchemas(agent):
  after every maintenance/self-test early-exit branch and immediately before main execution,
    call the non-enumerable agent.registerSchemas exactly once with
    {audit:AUDIT_SCHEMA,gate:GATE_SCHEMA,mutation:MUTATION_SCHEMA,result:RESULT_SCHEMA}
  accept scalar type forms only object,array,string,boolean,integer plus only the exact
    GATE property union ["string","null"]; reject every other type array/form and keyword
  WeakMap each original identity/name/hash; GATE remains registered/hashed but dispatch-rejected
  reject second registration; at dispatch recompute hash and reject mutation, clone, GATE, unknown

createCodexBridgeRequest(policy, safePrompt, registeredSchema, runState):
  require the local single-flight latch and no other root-authorized TASK-540 writer for mutation
  map registered RESULT/AUDIT -> read-only and registered MUTATION -> mutating
  build schemaCore and exact requestCore; compute each domain-separated hash over core only
  require the fixed run journal prepared; fsync exact request-sequence planned record first
  create /tmp request dir 0700 and exact 0600 files with O_EXCL/O_NOFOLLOW and stable identity
  fsync exact created record binding the request directory identity before notification
  emit exactly canonical-LF {deadlineAtEpochMs,requestDir,requestId,sequence}

startRootMediatedCodexHost():
  root spawns exactly
    node _docs/_workflows/task-540-local-orchestrator.mjs --run
    from the verified root with shell false, detached false, and private non-TTY
    pipe stdin/stdout; no bridge CLI is ever a root child
  retain and verify the exact host PID/start/module/cwd/argv identity
  host stdout carries only the existing canonical request notification or one exact
    controlReplyCore per accepted command, each as one canonical JSON line
  forbid echo, TTY, socket, temporary control file, argv/env payload, alternate launcher,
    reconnect, resume, or adoption

executeRootControlCommand(command, requestAuthority, payload):
  require no earlier control command in flight and allocate one fresh random 128-bit
    lowercase-hex controlId plus the next dense positive controlOrdinal
  build exact reject-unknown
    controlCore={command,controlId,controlOrdinal,payload,requestId,sequence}
  command is exactly inspect/respond/status/wait/procedure/recover-review/abort
  first five commands bind requestId/sequence to the host's notification-backed private map;
    recover-review and abort alone use null requestId/sequence; recover-review is legal
    only in recovery phase and abort is legal only for the current frozen generation
  payload is null exactly for inspect/status/wait; respond/procedure/recover-review use
    their exact already-defined private stdin frame; abort payload is exact
    {reason,review}, with reason from abortCore and review the complete recoveryReviewCore
  require one canonical UTF-8 JSON serialization plus one LF, no duplicate key, BOM, CR,
    whitespace variant, trailing/extra byte, or second/pipelined frame, with total frame
    size <= 8,454,144 bytes and every existing nested schema/string/array/depth bound
  host performs read -> validate -> execute -> reply completely before reading another command
  host returns exact reject-unknown
    controlReplyCore={command,controlId,controlOrdinal,requestId,result,sequence,status:"ok"}
    with identical bindings and result equal to the exact validated mode output
  apply the same canonical-LF/cardinality/8,454,144-byte/nested bounds to the reply
  reject replay, ordinal gap, out-of-order ID/binding, duplicate reply, or pipelining
  abort is host-handled, launches no bridge child, and is the only controlled-abort trigger:
    freeze, validate review, seal/clean the abort journal, return exact
    {accepted:true,runSha256,status:"aborted"}, close, and let root prove host absence
  on plain/unframed EOF, root disappearance, broken control transport, or host crash
    freeze dispatch, boundedly stop only exact armed children the host can still prove,
    preserve all journal/request/ledger bytes, exit nonzero, and never write an abort receipt
    or claim the host's own absence; never reconnect to, resume, or adopt the run

launchArmedBridgeModeAsHost(mode, requestAuthority, input, priorHelperSweep):
  allocate the next dense launch ordinal in the fixed run journal
  write/fsync the exact
    launch-<zero-padded-12-digit-launchOrdinal>.planned.json envelope before spawn
  create one private child-only control pipe in addition to the mode's existing stdin contract
  spawn the exact bridge module/mode with shell false and no ambient descriptor inheritance
  before GO the child may only parse its bounded canonical bootstrap and wait on that pipe
  parent identity-checks the exact child PID/start/executable/cwd/module/mode/argv
  parent writes/fsyncs
    launch-<zero-padded-12-digit-launchOrdinal>.armed.json with that exact identity and
    priorHelperSweepSha256 null for every normal mode or the verified sweep digest for
    recover-review
  parent sends the one exact GO frame naming the armed hash and carrying
    priorHelperSweep null for every normal mode or the exact verified sweep envelope for
    recover-review, then closes its control endpoint
  child revalidates the armed envelope and its own identity before any request/journal access
  recover-review additionally validates the sweep digest and exact-set equality to every
    launch ordinal before its own before reading the root frame or any request byte
  pre-GO EOF exits nonzero with empty stdout/stderr and no request access or output
  after exit prove the exact identity absent and durably publish launch cleanup markers
  capture and validate the child's one exact canonical-LF mode output privately; only the
    parsed exact result enters the matching controlReplyCore
  never expose child stdout directly or accept a root-launched bridge process

inspectAndMediateAsRoot(requestDir):
  receive the host's exact request notification; send exact inspect controlCore
  host launches/arms the inspect child; monotonic deadline wins the sole claim before
    dispatch or operator atomically claims and returns only the exact ten-key inspect bundle
  privately map requestId to agent task name; spawn one fresh agent with fork_turns="none"
  on spawn failure submit exact spawn_failed procedure; invent no task/result/correlation
  send only policy + prompt + resultSchema; do not send request/path/IDs/env/raw bytes/user data
  hash the exact transcript result; relay result + agentResultSha256 only in the exact
    respond controlCore payload
  accept only {accepted,requestId,status}; poll cancellation/deadline
  on live-agent timeout call interrupt_agent; never claim interrupt for a normal request
  hash and self-check the private request/task-name/exact-result transcript correlation
  relay exact root attestation plus only that digest in the procedure controlCore payload
  require one exact spawned/fork-none or spawn_failed procedure receipt per operator
    claim, or one nondispatch ledger entry for pre-claim timeout

createOrJoinCodexClaim(owner, requestAuthority):
  prepare and validate every claim preimage and candidate byte before the eligibility sample
  set decisionMonotonicNs from the operator's final decision sample as the last
    non-filesystem step before candidate write/fsync/link
  operator is eligible only when decisionMonotonicNs < deadlineMonotonicNs; otherwise
    create or join timeout and never write/link an operator candidate
  timeout is eligible only when decisionMonotonicNs >= deadlineMonotonicNs; equality is timeout
  build claimCore with decisionMonotonicNs and write the exact claim envelope to only
    operator.claim.candidate.json or timeout.claim.candidate.json using
    O_CREAT|O_EXCL|O_NOFOLLOW, mode 0600, stable identity, file fsync, and nlink 1
  hard-link no-overwrite to claim.json, fsync the parent, require same dev/ino and nlink 2,
    identity-unlink the candidate, fsync the parent, and require claim.json nlink 1
  on EEXIST stable-read/validate the existing claim and join it; identity-unlink/fsync
    only this contender's distinct loser candidate, never the claim or another contender
  reject owner/basename/time/hash/request/schema/identity/link-graph drift

settleAndCleanCodexRequest(kind, core):
  on pre-claim timeout use the sole timeout claim and never dispatch
  on post-operator-claim timeout reuse that exact claim; never create a second claim
  at inspect, response-start, and response-CAS boundaries compare the pinned monotonic deadline
  at/after deadline never link response; start/join deadline cancellation under the same claim
  durably record and identity-pin exact hashed response.started/cancel.started before candidate
  recompute agent-result digest; bind it and decisionMonotonicNs into eligible response
  compute settlement hash from exact response-or-cancel core binding request/claim/schema/start
  require candidate nlink 1; hard-link no-overwrite to settlement; require same inode/nlink 2
  unlink candidate; require settlement nlink 1; loser EEXIST unlinks only its candidate
  after CAS success or EEXIST, every started contender writes/links its exact start-bound ACK
  wait bounded for every started acknowledgement, required procedure receipt, and responder absence
  recursively validate response against registered original schema (8 MiB; 4096-byte strings)
  always run existing postchecks and rollback, including timeout/failure/cancellation
  freeze disposition; write one immutable safe dense ledger entry preserving request/run/
    worktree/claim/settlement/procedure truth plus every sorted start/ACK pair
  fsync ledger-sequence planned record before entry creation and created record afterward
  re-read the entry against retained preimages; bind its pre-closure prefix into closureControl
  fsync request cleanup-started record; unlink only identity-bound known files
  prove empty rmdir; fsync request cleaned record
  never recursive/glob cleanup

recoverCrashedCodexGeneration(rootReview):
  refuse normal dispatch while the fixed recovery journal exists
  require the bridge module's sole export sweepPriorBridgeLaunchesForRecovery and call it
    only from the verified continuous host in recovery-only phase
  the sweep may stable-read only fixed run/launch records and /proc; it must not read
    request bytes or root payload, nor perform artifact cleanup
  planned-without-armed proves request incapability because GO was impossible; for every
    armed prior helper identity-check the exact positive PID/start/module/mode/worktree,
    TERM then KILL only that exact identity when live, and prove final identity absence
  receive exact reject-unknown
    {...priorHelperSweepCore,priorHelperSweepSha256}, with
    priorHelperSweepCore={launches,runSha256,schemaVersion:1}, launches the dense
    prior-ordinal array of exact {launchArmedSha256,launchOrdinal,
    launchPlannedSha256,state} projections, state armed_absent|planned_unarmed, and
    priorHelperSweepSha256 in only the recovery-helper-sweep domain
  plan/arm recover-review only after that preflight, bind priorHelperSweepSha256 into its
    armed core, and send the exact sweep envelope in GO
  after GO the recover-review child recomputes the digest and requires its launches to
    exact-set equal every launch ordinal before its own, then and only then reads
    rootReview and planned requests
  require one exact private root-review item for every journal-planned request sequence
  validate each durable start plus exact PID/start/role/module/worktree process identity
  TERM then KILL only a still-live exact bridge-mode helper PID named by a durable start
    record, with bounded absence proofs; make no server/browser/fixture/process recovery claim
  reject PID reuse, identity drift, an unknown process, or group/broad signalling
  require the root to interrupt and prove stopped every still-live mapped collaboration task
  retain request bytes until local-process absence and root procedural review both complete
  never persist or log a collaboration task name; never claim local API verification
  normalize claim CAS residue only from exact journal-known identities and only for cleanup:
    no claim/no candidate; no claim plus one/both nlink-1 candidates; claim alone at
    nlink 1; claim plus one same-inode linked candidate at nlink 2; claim plus one/both
    distinct nlink-1 losers; or claim plus one same-inode linked candidate and one
    distinct nlink-1 loser
  for no-claim candidate rows identity-unlink/fsync only known candidates and never elect;
    for a same-inode linked candidate identity-unlink/fsync it and require claim nlink 1;
    for distinct losers identity-unlink/fsync only those losers and retain the valid claim
  fail closed and retain evidence for every impossible inode/link graph, unknown link,
    identity/hash/owner/basename/time condition, mode/UID/type drift, operator decision
    at/after deadline, timeout decision before deadline, or equality assigned to operator
  recovery never creates or links a claim, samples a decision, dispatches, resumes, or adopts
  recover only journal-listed request and ledger artifacts through the exact presence matrix

sealAbortedCodexGeneration(reason, review, ledger):
  require invocation only by the valid host-handled abort control command; launch no
    bridge child and freeze dispatch
  require reason in the exact abortCore enum and review exact-set equal every planned
    request after root interruption/final-non-live proof for every live mapped task
  require every actual transcript/procedure correlation from the task-name-free review
  hash exact abortCore; prepare/fsync the fixed Git-dir recovery journal and bound identities
  identity-clean only journal-listed ledger entries; persist cleaned marker; remove journal safely
  on restart continue cleanup only from a valid prepared journal; never adopt it as workflow evidence
  return exact {accepted:true,runSha256,status:"aborted"}, close the host, and require the
    root to prove the retained host PID/start identity absent

persistTask540StatusTransaction(mode, exactTargets):
  for close require exact twelve leaves + seven children + root + board in that order
  before any target write journal/fsync every old/new payload, mode, hash, identity, and temp
  replace/fsync task targets 0..19; rename/fsync board target 20 last as commit point
  without status.rollback-prepared.json, restart board-old rolls all targets back and
    board-new rolls all targets forward
  for every post-status failure create/fsync the exact status.rollback-prepared.json first;
    its presence overrides either board hash and forces all 21 old payloads, board last
  verify the complete old generation and deterministically clean the status journal before
    ordinary repair may add any pending evidence; never publish a partial per-file status
    mutation or a second status transaction

persistTerminalCodexGeneration(completeLedger, preClosure):
  freeze dispatch; require root transcript review; build exact terminalCore/receipt
  separately journal/fsync exact old/new bytes for changelog, three tasks, and index
  write/fsync prepared marker; atomically replace/fsync first four targets; commit index last
  recover by index-old rollback or index-new roll-forward; reject every other state
  before terminal recovery writes any status-old target, create/fsync the status journal's
    exact rollback-prepared marker and converge all 21 status targets to old, board last
  run final local gate plus repeated root review; then clean ledger and journal idempotently

settleToneAndBodyHandoff(page):
  at dg-022 require the authored tone, dirty badges, retained selection/override marker,
    computed color change, closed Select content, and unlocked body continuously for at
    least 600 ms across at least two complete samples
  take one final atomic structural/body-interaction sample immediately before returning

snapshotEntryDrafts(page):
  at dg-023 capture the content/presentation/URL/navigation snapshot exactly once

settleDirtyNavigationTarget(page):
  at dg-024 poll the current body scroll/pointer state and exactly one visible positive-
    geometry Records link; scroll it into view, reacquire final geometry/visibility, and
    require center-point event ownership
  click once with noWaitAfter and require the exact named dialog plus stable URL/navigation

executeCanonicalSmokeOnce(state):
  require state.executorCalls == 0 and no partial/diagnostic evidence
  call executeTask540SmokePlan exactly once; dg-022 -> dg-023 -> dg-024 executes in manifest order
  on any failure run deterministic cleanup, expose no partial evidence, and stop the invocation
  on complete seven-flow success run the smoke-evidence audit and seal one evidence object
  reject replay, a second call, skipped/reordered sub-proof actions, or closure after failure

currentRepairMutants():
  exercise every local-orchestrator/bridge/implement/test-name root-authority
    spoof/symlink/common-dir/branch/path leak independently
  exercise strict status/finding/exception/allowStrictScan and malformed-output cases
  exercise Claude executable/API/fallback remnants and local-orchestrator mode drift
  exercise registration order/cardinality, supported keywords/scalar types, the sole exact
    GATE-property ["string","null"] union, all other type arrays/forms, identity/hash mutation,
    clones/GATE
  exercise the exact notification plus inspect/respond/status/wait/procedure/recover-review/
    abort controlCore/controlReplyCore fields, enum, result, null/request bindings, random
    128-bit control ID, dense ordinal, 8,454,144-byte accepted/rejected boundary, nested
    schema bounds, reject-unknown, duplicate key, noncanonical JSON/LF, missing/extra/
    trailing frame, replay/gap/reorder, pipelining/second in-flight command, echo, TTY,
    socket, temp-file, argv/env-payload, alternate-launcher, premature/plain/unframed
    stdin EOF, root disappearance, broken input/output control pipe, raw-byte preservation,
    no false abort receipt/host-absence claim, explicit abort-only controlled cleanup,
    host crash/raw recovery, and forbidden reconnect/resume/adoption; also
    missing/ignored-only/partially tracked/hash-mismatched
    helper inventory and conditional/skip test coverage
  exercise agent payload leakage of path/token/env/.env/raw logs/user data, agent-result
    digest/rewrite/transcript mismatch, and cancellation with an invented result digest
  exercise domain/hash kind/preimage/own-hash inclusion and request/claim/settlement binding
  exercise claim decision field omission/substitution, operator final-sample ordering,
    operator strictly-before/equal/after and timeout before/equal/after, wrong owner/time/
    candidate basename, timeout-before-claim with no dispatch, timeout-after-operator-claim
    reusing that one claim, second-claim creation, and missing/extra
    response.started/cancel.started records
  exercise operator-claim spawn failure before task identity, false spawned/correlation/result,
    dispatch_failed cancellation/procedure/rollback/ledger/cleanup, forbidden retry, and
    spawn-failure before/equal/after-deadline plus pre-started cancellation race rows
  exercise exact-before/equal/after monotonic deadline at inspect, response start, and
    pre-CAS boundary, delayed timer, late result, clock-field replay, and ineligible response win
  exercise start filename/payload/hash-kind, responder/canceller PID-start mismatch,
    cross-kind/request/claim start swap, replacement before cleanup, settlement/ACK
    missing or wrong startSha256, and loser start/ACK omission from the ledger
  exercise directory/file mode, UID/type/link/identity swaps, O_NOFOLLOW/O_EXCL omissions,
    invalid/noncanonical UTF-8 JSON, duplicate keys, sequence/ID/hash/PID/start/deadline replay
  exercise nlink 1->2->1, partial response, both CAS race orders, missing winner/loser done
    acknowledgement, process-absence-as-ack substitution, live/recycled responder,
    overwrite/rename, recursive/glob cleanup, residue, wrong-path deletion
  exercise claim candidate O_EXCL/O_NOFOLLOW/mode/fsync/stable-identity omission,
    no-overwrite link and parent-fsync boundaries, same-inode/nlink checks, EEXIST
    stable-validation, own-distinct-loser-only cleanup, and all six cleanup-only crash
    rows: empty, candidate(s)-only, claim-only, claim+same-inode candidate,
    claim+distinct loser(s), and claim+same-inode candidate+distinct loser; reject every
    impossible inode/link/hash/identity/owner/time graph and every recovery
    election/link/dispatch/resume/adoption
  exercise response-started/pre-CAS-deadline withdrawal with no response candidate,
    cancellation-bound response_done, both starts/ACKs in the ledger, and every illegal
    candidate/omitted-ACK variant
  exercise exact procedure CLI frames, status/list/interrupt race truth table,
    missing/duplicate/replayed procedure receipts, transcript-correlation mismatch,
    nondispatch entries, opaque/incomplete safe projections, ledger holes/reordering/rewrite,
    postcheck-before/after-ledger crash boundaries, closure-prefix mismatch, digest-only
    or missing independent index prefix, missing-changelog recovery without anchor bytes,
    stale-/tmp adoption, non-prefix terminal ledger, partial/failed terminal-evidence
    transaction and rollback, terminal/abort wrong hash domain or preimage, receipt/control
    cross-field mismatch, missing/wrong terminal receipt, post-freeze agent dispatch,
    abort without root review/seal or with stale/unknown ledger identity, and cleanup
    before durable terminal or abort evidence
  exercise process termination at every recovery-journal file/directory fsync, prepared
    marker, target temp write/fsync/rename/parent-fsync, index-last commit, roll-forward/
    rollback, rollback-prepared/committed marker, ledger cleanup, cleaned marker, and
    journal removal boundary
  exercise host-only helper launch plan write/fsync, spawn-before-bootstrap, bootstrap parse/wait,
    armed write/fsync, GO write/partial/duplicate/EOF, post-GO identity validation, and
    response.started/cancel.started publication boundaries for every spawned CLI mode
  exercise the bridge module's exact-one export name, calls outside verified-host
    recovery-only phase, direct CLI/same-process mode execution through that export,
    forbidden request/root-payload/ledger/artifact reads or cleanup, prior sweep
    unknown/missing/extra/reordered/hole/duplicate launch projections, wrong state/nullability,
    wrong recovery-helper-sweep domain/digest, normal-mode non-null and recover-review
    null/mismatched armed digest, GO null/envelope mismatch, child root/request read before
    post-GO digest/exact-prior-set verification, and controller crash before/during/after GO
  exercise pre-GO requestDir/journal/repo stat/open/read/write, stdout/stderr, inherited
    control descriptor, wrong PID/start/module/mode/argv/worktree, plan/armed swap/replay,
    planned-without-armed recovery, and armed TERM/KILL/final-absence rows
  exercise every 21-target status manifest/prepared/payload/temp/board-last/committed
    boundary, status rollback-marker create/fsync, all status hash cores, board
    old/new/third-state restart with and without that marker, every reverse target temp
    write/fsync/rename/parent-fsync, board-last old commit, deterministic rollback cleanup,
    post-status failure rollback, terminal-failure rollback ordering, and partial
    Done-graph retention
  exercise restart with a live/recycled/mismatched helper PID, wrong role/module/worktree,
    TERM-only and KILL boundary, missing process-absence proof, missing/false/incomplete
    root recovery review, live agent without interrupt, task-name persistence/logging,
    request cleanup before both reviews, and negative/zero/process-group signalling
  exercise abort payload reason/review unknown/missing/extra/request-set drift, a live
    un-interrupted mapped task, abort child launch/launch ordinal, non-abort controlled
    cleanup, wrong aborted result, host remaining live, and raw EOF/root-loss cleanup
  exercise every exact recovery core unknown/missing/extra/reordered field, wrong domain,
    collection hole/duplicate/order mismatch, private path leak outside root mediation,
    request/ledger/directory planned-created-cleanup-started-cleaned presence-table row,
    repeated-crash row, and every terminal temp absent/required/opposite/partial/
    wrong-identity/already-renamed row
  do not claim local mutants executed spawn_agent/fork_turns/interrupt_agent; require per-dispatch
    root attestation plus final transcript review and timeout-only interrupt evidence,
    never a normal-request interrupt
  exercise attempted agent validation/server/browser/fixture/smoke execution
  exercise observer timing/options/slot/deletion/bound/order/count/state/owner/final-sample cases
  exercise separate diagnostic call, second executor call, partial evidence, skip/replay/reorder
  exercise phase-8 known success, uncertain byte-identical reconciliation, divergent reread,
    second write, missing receipt, and post-restore proof failures
```

The literal ordered `CURRENT_REPAIR_TARGETED_GATE` is:

```bash
node --check _docs/_workflows/task-540-smoke-contract.mjs
node _docs/_workflows/task-540-smoke-contract.mjs --self-test
node --check _docs/_workflows/task-540-smoke-executor.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node --check _docs/_workflows/task-540-smoke-host.mjs
node _docs/_workflows/task-540-smoke-host.mjs --self-test
node --check _docs/_workflows/task-540-codex-agent-bridge.mjs
node _docs/_workflows/task-540-codex-agent-bridge.mjs --self-test
node --check _docs/_workflows/task-540-local-orchestrator.mjs
node _docs/_workflows/task-540-local-orchestrator.mjs --self-test
node --check _docs/_workflows/task-540-implement.mjs
node --check _docs/_workflows/task-540-test-name-contract.mjs
node _docs/_workflows/task-540-test-name-contract.mjs --mode=self-test
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
node _docs/_workflows/task-540-implement.mjs --self-test-file-line-limit
bunx --no-install prettier --check _docs/_workflows/task-540-smoke-contract.mjs _docs/_workflows/task-540-smoke-executor.mjs _docs/_workflows/task-540-smoke-host.mjs _docs/_workflows/task-540-codex-agent-bridge.mjs _docs/_workflows/task-540-local-orchestrator.mjs _docs/_workflows/task-540-implement.mjs _docs/_workflows/task-540-test-name-contract.mjs
bun --cwd core lint:types
bun --cwd core lint
git ls-files --error-unmatch _docs/_workflows/task-540-smoke-contract.mjs _docs/_workflows/task-540-smoke-executor.mjs _docs/_workflows/task-540-smoke-host.mjs _docs/_workflows/task-540-codex-agent-bridge.mjs _docs/_workflows/task-540-local-orchestrator.mjs _docs/_workflows/task-540-implement.mjs _docs/_workflows/task-540-test-name-contract.mjs
bun test tests/unit/workflows/task540SmokeExecutorSecurity.test.ts
bun run scan:security:strict
git diff --check
```

Run it from the verified dedicated root only, in order, with no skipped command or
accepted non-zero result. Its pass freezes all seven top-level workflow files, every
tracked child owner under `_docs/_workflows/task-540-smoke/**`, and the focused
workflow-security test. Any later byte change invalidates the receipt and requires the
whole targeted gate again before the fresh post-audits.

The root-local orchestrator is the sole writer of the current repair bytes in these
task-workflow modules:

- `_docs/_workflows/task-540-smoke-contract.mjs`
- `_docs/_workflows/task-540-smoke-executor.mjs`
- `_docs/_workflows/task-540-smoke-host.mjs`
- `_docs/_workflows/task-540-codex-agent-bridge.mjs`
- `_docs/_workflows/task-540-local-orchestrator.mjs`
- `_docs/_workflows/task-540-implement.mjs`
- `_docs/_workflows/task-540-test-name-contract.mjs`

They are neither production/source files nor closure-owned tests/docs, and they must
never appear in a closure agent's `allowedFiles`. The orchestrator lands and integrates
them separately, then the closure agent consumes only the resulting safe projections.
These tracked task-workflow helpers are infrastructure, not human-authored production
or test modules, so the AGENTS production/test classification does not independently
cover them. The current owner directive is stricter: every TASK-540 smoke facade and
every tracked child module under `_docs/_workflows/task-540-smoke/**` must still finish
at no more than 1,000 physical lines. The cohesive Codex bridge has the same target, and
the independently tracked workflow-security test remains subject to the blocking
1,000-line gate.
The integration into `_docs/_workflows/task-540-implement.mjs` must delete the old
agent-executed `runSmoke`/browser/cleanup/evidence path and every alternate agent
fallback. It may retain a read-only post-execution evidence audit, but no agent may
execute, recover, or supply observations for the smoke. The old and new execution
models must not coexist.

`_docs/_workflows/task-540-local-orchestrator.mjs` remains the one continuous
task-scoped Node host for `_docs/_workflows/task-540-implement.mjs`; direct execution
keeps only these exact forms:

```bash
node _docs/_workflows/task-540-local-orchestrator.mjs --self-test
node _docs/_workflows/task-540-local-orchestrator.mjs --run
```

The following paragraphs define the required post-repair state; the recovered source is
not evidence that this state has landed. The host and bridge must contain no Claude
executable, process, CLI/API invocation, compatibility check, recovery branch, or
fallback. The bridge is an import-safe CLI module whose six request/recovery modes are
spawned only as continuous-host-owned, armed children. No same-process bridge
invocation, optional worker, root-launched bridge child, alternate launcher, Claude
launcher, or Claude child process is legal. The implementation
orchestrator may retain its internal `agent(prompt, options)` call shape, but that
binding must wait on the root-mediated Codex bridge. The same local process must remain
alive from Start gate through every audit/fix, validation, exact-one smoke call,
closure, final audit, and terminal rollback/cleanup.

The bridge module exports exactly one narrow named function,
`sweepPriorBridgeLaunchesForRecovery`, solely for the verified continuous host while it
is in recovery-only phase. That export is process preflight, not direct CLI or
same-process execution of any request/recovery mode. It may stable-read only the fixed
run/launch records and `/proc`, terminate only exact prior armed PID/start identities,
and prove either armed absence or planned-unarmed request incapability. It cannot read
a request byte or root payload, execute a request mode, or perform request, ledger,
journal, or other artifact cleanup. The module exports nothing else.

The host defines a non-enumerable, non-writable `agent.registerSchemas` method. In
`task-540-implement.mjs`, textually after every maintenance/self-test early-exit branch
and immediately before main workflow execution, call it exactly once as
`agent.registerSchemas({audit:AUDIT_SCHEMA,gate:GATE_SCHEMA,mutation:MUTATION_SCHEMA,result:RESULT_SCHEMA})`.
The call accepts exactly those four own data properties and original objects. The host
stores each object identity in a private `WeakMap` with its schema name and canonical
hash captured at registration; second registration fails. Every dispatch recomputes the
hash and accepts only the unchanged registered object identity: registered
`RESULT_SCHEMA`/`AUDIT_SCHEMA` map to `read-only`, registered `MUTATION_SCHEMA` maps to
`mutating`, and registered `GATE_SCHEMA`, clones, unknown schemas, or post-registration
schema mutation fail before request creation. Caller options, prompt text, bridge
files, and returned data cannot choose the class.

The same continuous host's in-process schema validator validates an accepted result
recursively against that registered original object. Schemas may use only the closed keywords
`type`, `properties`, `required`, `additionalProperties:false`, `items`, `enum`,
`minLength`, and `uniqueItems`. A scalar `type` is exactly one of `object`, `array`,
`string`, `boolean`, or `integer`. The only permitted array-valued `type` is the exact
ordered `["string","null"]` union on the already pinned GATE property; it is not legal
on any other property or schema. Every other type token, array, ordering, duplicate,
or form and every other keyword fails at registration. `GATE_SCHEMA` is still
registered and hashed under this rule but remains dispatch-rejected. Values must expose
exact own enumerable data properties with no symbol, accessor, inherited, or extra
property; arrays must be dense, contain at most 4,096 items apiece, and satisfy
`uniqueItems` by canonical value; recursion depth is bounded to 64. No coercion,
default insertion, or property removal is permitted. The canonical result is at most
8 MiB and every string at most 4,096 UTF-8 bytes. The responder prevalidates its
serialized schema copy only to reject obvious bad input; that check is not authority.
The continuous process repeats validation against the registered original identity and
its unchanged registration hash, then reruns the secret scan.

The bridge uses one shared domain-separated hash rule:
`bridgeDigest(kind,core) =
sha256("coderso.task540.bridge." + kind + ".v1\0" + canonicalJson(core))`. Every exact
core omits its own digest field; no envelope is hashed recursively. This is the
exhaustive canonical-digest registry—no inline prefix, unnamed domain, or generic
envelope hash is legal:

| `kind`                          | Digest field                       | Exact core                                                                                |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `schema`                        | `schemaSha256`                     | `{name,resultSchema}`                                                                     |
| `request`                       | `requestSha256`                    | `requestCore` defined below                                                               |
| `claim`                         | `claimSha256`                      | `claimCore` defined below                                                                 |
| `contender-start`               | `startSha256`                      | `startCore` defined below                                                                 |
| `settlement`                    | `settlementSha256`                 | response or cancellation `settlementCore` below                                           |
| `ack`                           | `ackSha256`                        | `{requestId,sequence,settlementSha256,startSha256,status}`                                |
| `agent-result`                  | `agentResultSha256`                | `{result}`                                                                                |
| `status-observation`            | `statusSha256`                     | `{claimOwner,deadlineRelation,observedAtMonotonicNs,requestId,sequence,settlementStatus}` |
| `procedure`                     | `procedureSha256`                  | `procedureCore` defined below                                                             |
| `transcript`                    | `transcriptCorrelationSha256`      | `{agentResultSha256,requestId,taskName}`                                                  |
| `request-id`                    | `requestIdSha256`                  | `{requestId}`                                                                             |
| `run-id`                        | `runIdSha256`                      | `{runId}`                                                                                 |
| `recovery-task`                 | `taskCorrelationSha256`            | `{requestSha256,sequence,taskName}`                                                       |
| `recovery-review`               | `reviewSha256`                     | `{requests,runSha256,schemaVersion:1}`                                                    |
| `recovery-helper-sweep`         | `priorHelperSweepSha256`           | `priorHelperSweepCore` defined below                                                      |
| `ledger-entry`                  | `ledgerEntrySha256`                | the safe ledger-entry core below                                                          |
| `ledger-prefix`                 | `preClosureSha256`                 | `{entries}`                                                                               |
| `terminal-ledger`               | terminal receipt `sha256`          | `terminalCore` below                                                                      |
| `abort-ledger`                  | abort receipt `sha256`             | `abortCore` below                                                                         |
| `branch-id`                     | `branchSha256`                     | `{branch}`                                                                                |
| `git-dir-id`                    | `gitDirSha256`                     | `{gitDir}`                                                                                |
| `root-id`                       | `rootSha256`                       | `{root}`                                                                                  |
| `worktree-id`                   | `worktreeSha256`                   | `{branchSha256,gitDirSha256,rootSha256}`                                                  |
| `artifact-path`                 | `pathSha256` or `ledgerPathSha256` | `{path}`                                                                                  |
| `run`                           | `runSha256`                        | `runCore` below                                                                           |
| `run-prepared`                  | `runPreparedSha256`                | `{runSha256}`                                                                             |
| `artifact-plan`                 | `planSha256`                       | `planCore` below                                                                          |
| `artifact-created`              | `createdSha256`                    | `createdCore` below                                                                       |
| `artifact-cleanup-started`      | `cleanupStartedSha256`             | `cleanupStartedCore` below                                                                |
| `artifact-cleaned`              | `cleanedSha256`                    | `cleanedCore` below                                                                       |
| `helper-launch-planned`         | `launchPlannedSha256`              | `helperLaunchPlannedCore` below                                                           |
| `helper-launch-armed`           | `launchArmedSha256`                | `helperLaunchArmedCore` below                                                             |
| `helper-launch-cleanup-started` | `launchCleanupStartedSha256`       | `helperLaunchCleanupStartedCore` below                                                    |
| `helper-launch-cleaned`         | `launchCleanedSha256`              | `helperLaunchCleanedCore` below                                                           |
| `recovery-manifest`             | `manifestSha256`                   | exact abort or terminal manifest core below                                               |
| `recovery-prepared`             | `preparedSha256`                   | exact abort or terminal prepared core below                                               |
| `recovery-rollback-prepared`    | `rollbackPreparedSha256`           | `rollbackPreparedCore` below                                                              |
| `recovery-committed`            | `committedSha256`                  | `committedCore` below                                                                     |
| `recovery-ledger-cleaned`       | `ledgerCleanedSha256`              | `ledgerCleanedCore` below                                                                 |
| `status-manifest`               | `statusManifestSha256`             | `statusManifestCore` below                                                                |
| `status-prepared`               | `statusPreparedSha256`             | `statusPreparedCore` below                                                                |
| `status-rollback-prepared`      | `statusRollbackPreparedSha256`     | `statusRollbackPreparedCore` below                                                        |
| `status-committed`              | `statusCommittedSha256`            | `statusCommittedCore` below                                                               |

Every canonical envelope is exactly `{...core,<mapped-field>}`. Raw file/payload
digests—`contentSha256`, `oldSha256`, `newSha256`, `oldPayloadSha256s`, and
`newPayloadSha256s`—are the lowercase SHA-256 of the exact bytes and are the only
non-domain-separated hashes. `abortReceiptSha256`, `indexNewSha256`,
`ledgerDirectoryCreatedSha256`, `ledgerEntryCreatedSha256s`,
`ledgerDirectoryCleanedSha256`, and `ledgerEntryCleanedSha256s` are exact references to
already-verified registry or raw-byte fields, never newly hashed aliases.
`schemaCore` is exactly `{name,resultSchema}`. `requestCore` is exactly
`{accessClass,deadlineAtEpochMs,deadlineMonotonicNs,label,orchestratorPid,orchestratorStartTime,phase,policy,prompt,requestId,resultSchema,runId,schemaSha256,sequence,worktreeSha256}`.
At request creation,
`deadlineMonotonicNs=(process.hrtime.bigint()+timeoutMs*1_000_000n).toString()` and is
an exact positive decimal string shared by every local bridge process; wall-clock
`deadlineAtEpochMs` is notification/display evidence only.
`claimCore` is exactly
`{claimId,claimOwner,deadlineAtEpochMs,deadlineMonotonicNs,decisionMonotonicNs,requestId,requestSha256,schemaSha256,sequence}`,
where `claimOwner` is `operator` or the local `timeout` contender and
`decisionMonotonicNs` is its exact positive-decimal eligibility sample. An operator
claim requires `decisionMonotonicNs < deadlineMonotonicNs`; a timeout claim requires
`decisionMonotonicNs >= deadlineMonotonicNs`, so equality belongs only to timeout. A response
`settlementCore` is exactly
`{agentResultSha256,claimId,claimSha256,decisionMonotonicNs,requestId,requestSha256,responderPid,responderStartTime,result,schemaSha256,sequence,startSha256,status:"response"}`;
a cancellation core replaces `result` and responder identity with
`agentResultSha256:null,error,startSha256,status:"cancelled"`, where `error` is exactly
`deadline_exceeded` or `dispatch_failed`. A response requires
`decisionMonotonicNs < deadlineMonotonicNs`; `deadline_exceeded` requires
`decisionMonotonicNs >= deadlineMonotonicNs`; `dispatch_failed` requires
`decisionMonotonicNs < deadlineMonotonicNs`, the operator claim, and the exact
failed-dispatch procedure below. For either cancellation the decision equals its bound
cancel start's `startedAtMonotonicNs`. Thus every
settlement binds the request, winning claim, registered schema, exact started
contender, monotonic eligibility decision, and exact accepted result without a
self-referential preimage. `agentResultSha256` is the `agent-result` hash of exact core
`{result}` after
registered-schema validation.

Each fixed `response.started.json` or `cancel.started.json` file contains exactly one
`startCore`:
`{claimId,claimSha256,contenderId,contenderKind,processId,processRole,processStartTime,requestId,requestSha256,schemaSha256,sequence,startedAtMonotonicNs}`,
where `contenderKind` is exactly `response` or `cancel`, `contenderId` is an independent
random 128-bit lowercase-hex value, response process identity is the responder's
PID/start time, and `processRole` is exactly `host`, `inspect`, `respond`, `status`,
`wait`, or `procedure` and must match the actual authorized local bridge process
creating the record. Its exact envelope is `{...core,startSha256}` under the
`contender-start` hash domain. The bridge captures and retains each start file's
`dev/ino/type/uid/mode/nlink/size/time/hash` identity through cleanup. A response start
must match the response settlement's responder identity; a cancel start must match the
actual bridge-process identity/role that enforced cancellation. Cross-kind,
cross-request, cross-claim, replacement, duplicate, unauthorized process-role, or
unbound starts reject.

Acknowledgement cores bind `requestId`, `sequence`, `settlementSha256`,
`startSha256`, and exact `status:"response_done"|"cancel_done"` under the `ack` domain.
The status matches the bound start's contender kind, while `settlementSha256` always
names the actual winner. A response that starts and then withdraws or loses to
cancellation therefore writes `response_done` bound to the cancellation settlement and
its own response start.

A dispatched request's `procedureCore` is exactly
`{agentResultSha256,agentStateAtFinalList,agentStateAtFirstList,claimSha256,dispatchStatus,forkTurns,interruptAttempted,interruptPreviousState,requestId,requestSha256,sequence,settlementSha256,spawned,statusSha256,transcriptCorrelationSha256}`.
The bridge never claims retrospective agent liveness at the monotonic deadline. These
fields describe only root collaboration-tool observations after the terminal local
status frame:

- spawned response: non-null transcript/settlement result digest; first-list,
  final-list, and interrupt-previous states all `not_applicable`;
  `interruptAttempted:false`;
- spawned cancellation: result digest is null or the exact result already returned by
  the transcript; `agentStateAtFirstList` is `live` or `not_live` and
  `agentStateAtFinalList:"not_live"`. First-list `live` requires
  `interruptAttempted:true` and `interruptPreviousState` `live` or `not_live` because
  completion may race the call. First-list `not_live` requires
  `interruptAttempted:false` and `interruptPreviousState:"not_applicable"`;
- spawn failure: `spawned:false`, `dispatchStatus:"spawn_failed"`,
  `forkTurns:"none"`, null result/correlation, all three state fields
  `not_applicable`, and `interruptAttempted:false`; the root input carries
  `status:null`, then procedure samples/settles locally and binds the exact internally
  generated terminal status observation/hash into `procedureCore`;
- every spawned row has `spawned:true`, `dispatchStatus:"spawned"`,
  `forkTurns:"none"`, and
  `transcriptCorrelationSha256=bridgeDigest("transcript",
{agentResultSha256,requestId,taskName})`, computed by the root using its private actual
  task name. Only the digest crosses the no-echo boundary.

This records the real terminal status -> first `list_agents` -> optional
`interrupt_agent` -> final `list_agents` race. A spawn-failed procedure samples the
pinned monotonic deadline, settles or joins the one cancellation under the already won
operator claim, and only then hashes the procedure. A cancellation start strictly
before the deadline derives `dispatch_failed`; one at or after derives
`deadline_exceeded`; a joiner cannot change it.

Each immutable run-ledger entry is itself the safe verification projection rather than
an opaque hash list. Its exact core is
`{accessClass,claim,contenders,dispatch,disposition,request,settlement}`. `claim` is
exactly `{claimOwner,claimSha256}`. `contenders` is the exact non-empty array sorted by
`response` before `cancel`, with one exact
`{ackSha256,contenderKind,startSha256}` item for every and only durable started
contender. `dispatch` is exactly
`{agentResultSha256,agentStateAtFinalList,agentStateAtFirstList,dispatchStatus,forkTurns,interruptAttempted,interruptPreviousState,procedureSha256,spawned,statusSha256,transcriptCorrelationSha256}`.
For a pre-claim timeout it is exactly
`{agentResultSha256:null,agentStateAtFinalList:null,agentStateAtFirstList:null,dispatchStatus:"not_started",forkTurns:null,interruptAttempted:false,interruptPreviousState:null,procedureSha256:null,spawned:false,statusSha256:null,transcriptCorrelationSha256:null}`;
for an operator claim it copies every safe procedure truth field, uses exactly
`dispatchStatus:"spawned"` or `"spawn_failed"`, and requires the exact procedure hash
plus a correlation hash only for spawned.
`disposition` is exactly `accepted` or `rejected_rolled_back` after final postchecks and
any required rollback. `request` is exactly
`{deadlineMonotonicNs,requestIdSha256,requestSha256,runIdSha256,sequence,worktreeSha256}`.
`settlement` is exactly
`{agentResultSha256,decisionMonotonicNs,error,settlementSha256,startSha256,status}`,
where status is `response` or `cancelled`, `error` is null for response and the exact
cancellation error otherwise, and the start hash is the winning contender.
`requestIdSha256` and `runIdSha256` use the registry cores, so no raw bridge ID enters
closure evidence. The ledger entry envelope is exactly
`{...core,ledgerEntrySha256}` and uses the `ledger-entry` hash domain.
For a complete ordered safe prefix `entries`, `preClosureSha256` is exactly
`bridgeDigest("ledger-prefix",{entries})`; it is never a raw array or receipt hash.
`terminalCore` is exactly
`{entries,preClosureCount,preClosureSha256,schemaVersion:1}` and its
`sha256` is the `terminal-ledger` domain hash. The public terminal receipt is exactly
`{count:entries.length,preClosureCount,preClosureSha256,schemaVersion:1,sha256}`.
`closureControl.collaborationLedger.terminalCount` must equal `receipt.count` and
`terminalSha256` must equal `receipt.sha256`; neither may be recomputed from the receipt
envelope itself. For an aborted generation, `abortCore` is exactly
`{entries,reason,schemaVersion:1}`, where reason is one of
`agent_dispatch_failed`, `agent_result_rejected`, or `workflow_failed`; its exact
`{count:entries.length,reason,schemaVersion:1,sha256}` receipt uses the
`abort-ledger` domain and is transient recovery evidence only.
`recoveryReviewCore` is exactly `{requests,runSha256,schemaVersion:1}` with the
task-name-free request rows defined in the recovery section below. Its
`reviewSha256` uses the `recovery-review` domain. `priorHelperSweepCore` is exactly
`{launches,runSha256,schemaVersion:1}`. `launches` is dense and ordered by every prior
positive launch ordinal; each exact reject-unknown projection is
`{launchArmedSha256,launchOrdinal,launchPlannedSha256,state}`, where `state` is exactly
`armed_absent` with a non-null armed digest or `planned_unarmed` with a null armed
digest. Its envelope is exactly
`{...priorHelperSweepCore,priorHelperSweepSha256}`, where
`priorHelperSweepSha256=bridgeDigest("recovery-helper-sweep",priorHelperSweepCore)`.
`runCore` is exactly
`{branchSha256,gitDirSha256,ledgerPath,ledgerPathSha256,rootSha256,runIdSha256,worktreeSha256}`;
`runPreparedCore` is `{runSha256}`.

The root launches exactly one continuous
`node _docs/_workflows/task-540-local-orchestrator.mjs --run` host from the verified
root with `shell:false`, `detached:false`, and private non-TTY pipe
stdin/stdout. Its stdout carries only the existing canonical request notification plus
the exact replies below. The root never launches a request/recovery bridge CLI.
`controlCore` is exactly
`{command,controlId,controlOrdinal,payload,requestId,sequence}`.
`command` is exactly `inspect`, `respond`, `status`, `wait`, `procedure`,
`recover-review`, or `abort`; `controlId` is a fresh independent random 128-bit
lowercase-hex value; and `controlOrdinal` is a dense positive safe integer. For the
first five commands, `requestId` and `sequence` are non-null and exactly bind the
host's private notification-backed request map. Only `recover-review` and `abort` have
both fields null. `recover-review` is legal only in recovery-only phase; `abort` is
legal only for the current host's frozen generation and is the sole controlled-abort
trigger. `payload` is null exactly for `inspect`, `status`, and `wait`; for `respond`,
`procedure`, and `recover-review` it is the exact already-defined private stdin frame
for that mode. The `abort` payload is exactly `{reason,review}`: `reason` is one of the
three exact `abortCore` enum values and `review` is the complete task-name-free
`recoveryReviewCore` for every planned request after the root has interrupted and
proven stopped every live mapped collaboration task.

`controlReplyCore` is exactly
`{command,controlId,controlOrdinal,requestId,result,sequence,status:"ok"}`. Its command,
ID, ordinal, request ID, and sequence exactly equal the one in-flight control command,
including either null pair; `result` is the exact validated mode output or, for
`abort`, exactly `{accepted:true,runSha256,status:"aborted"}`. Both cores reject
unknown/missing/accessor/inherited fields and use
exactly one canonical UTF-8 JSON serialization plus one LF, with no duplicate key,
BOM, CR, insignificant whitespace, trailing byte, extra frame, or echo. Each complete
frame including LF is at most 8,454,144 bytes and retains all existing nested
registered-schema limits: result/schema bytes, 4,096-byte strings, 4,096-item dense
arrays, recursion depth 64, and the stricter bounds of the named mode payload. Exactly
one command may be in flight. The host completes `read -> validate -> execute ->
reply` before reading the next; replayed IDs, ordinal gaps, out-of-order bindings,
pipelining, duplicate replies, or unsolicited reply frames fail closed.

For every bridge-backed command (`inspect`, `respond`, `status`, `wait`, `procedure`,
and `recover-review`), the host alone converts an accepted command into the existing
bridge-mode launch below, captures and exact-validates that child's
canonical-LF stdout, and nests only its parsed exact output as `result`; child stdout
is never directly root-visible. `abort` is the sole exception: it is handled entirely
by the host, launches no bridge child and therefore creates no launch ordinal, validates
the root review, seals and cleans the already durable abort journal, returns its exact
result, and closes. The root then proves the retained host PID/start identity absent.
No echo, TTY, socket, temporary control file, argv/environment payload, second
launcher, or ambient descriptor is legal.

Plain or unframed root-stdin EOF is not an abort command. That EOF, root
disappearance, a broken input/output control pipe, or an unexpected host crash creates
a raw failed generation: the host permanently freezes dispatch, boundedly terminates
only exact armed child PID/start identities it can still prove, preserves every
journal, request, and ledger byte, and exits nonzero. It never creates an abort receipt,
claims successful cleanup, or claims its own absence. A fresh root must first prove
the old host PID/start identity absent and only then start a recovery-only host. Loss
of the original root's private request-to-task transcript mapping blocks cleanup.
Neither path permits reconnect, resume, or adoption.

Every host-spawned request/recovery bridge CLI uses one parent-owned launch
ordinal and these exact reject-unknown cores:

- `helperLaunchPlannedCore` is exactly
  `{launchId,launchOrdinal,mode,requestDir,requestIdSha256,requestSha256,runSha256,sequence}`.
  `launchId` is an independent random 128-bit lowercase-hex value and
  `launchOrdinal` is a dense positive safe integer within the run. `mode` is exactly
  `inspect`, `respond`, `status`, `wait`, `procedure`, or `recover-review`. For the first
  five modes, `requestDir`, both request digests, and the positive request sequence
  exactly bind the already journal-planned request. For `recover-review`, those four
  request fields are exactly null; no other null combination is legal.
- `helperLaunchArmedCore` is exactly
  `{launchOrdinal,launchPlannedSha256,mode,moduleSha256,priorHelperSweepSha256,processId,processStartTime,worktreeSha256}`.
  The host writes this record, and only the host: `processId` is the spawned positive
  PID, `processStartTime` is its positive canonical decimal `/proc` start identity,
  `moduleSha256` is the raw lowercase SHA-256 of the already identity-pinned bridge
  module, and the mode/worktree/ordinal exactly repeat the plan.
  `priorHelperSweepSha256` is exactly null for all five normal request modes and the
  exact non-null `recovery-helper-sweep` digest only for `recover-review`.
- `helperLaunchCleanupStartedCore` is exactly
  `{launchArmedSha256,launchOrdinal,launchPlannedSha256}` and
  `helperLaunchCleanedCore` is exactly
  `{launchArmedSha256,launchCleanupStartedSha256,launchOrdinal,launchPlannedSha256}`.
  `launchArmedSha256` is the exact armed digest or null only for a spawn failure or
  pre-arm EOF proven never to have received GO. An armed launch can never clean through
  the null row. A null-arm cleanup/cleaned pair attests only GO impossibility,
  request incapability, and journal-lifecycle completion; it does not assert a
  PID/start identity or physical absence for an unarmed pre-exec process.

Their exact envelopes are respectively
`{...helperLaunchPlannedCore,launchPlannedSha256}`,
`{...helperLaunchArmedCore,launchArmedSha256}`,
`{...helperLaunchCleanupStartedCore,launchCleanupStartedSha256}`, and
`{...helperLaunchCleanedCore,launchCleanedSha256}` under only the four named launch
domains in the registry. The fixed-journal filenames are
`launch-<zero-padded-12-digit-launchOrdinal>.planned.json`, `.armed.json`,
`.cleanup-started.json`, and `.cleaned.json`; no sidecar, PID file, alternate suffix,
or reused ordinal is legal.

The private control pipe carries exactly two bounded canonical-LF frames and no third
frame. The bootstrap frame is exactly
`{launchOrdinal,launchPlannedSha256,mode}`. The GO frame is exactly
`{command:"GO",launchArmedSha256,launchOrdinal,launchPlannedSha256,priorHelperSweep}`.
`priorHelperSweep` is exactly null for each normal request mode and exactly
`{...priorHelperSweepCore,priorHelperSweepSha256}` for `recover-review`; its digest
must equal the armed core's non-null `priorHelperSweepSha256`. Bootstrap carries
no request path, ID, prompt, result, environment value, or task name. The parent may
send bootstrap after spawn, but it may send GO only after the armed envelope and its
containing fixed-journal directory are fsynced. Before validating GO, the child may
parse only its exact argv/mode plus this bounded bootstrap and may inspect only its own
process identity; it MUST NOT stat, open, read, write, or derive `requestDir`, the
recovery journal, Git/repository state, or another path. EOF, malformed bootstrap, a
second bootstrap, GO-before-arm, wrong/replayed GO, or any extra byte exits nonzero
with empty stdout and stderr and with no request access. After GO, the child derives
the fixed authority, stable-reads and hashes its exact plan and armed records, proves
the armed PID/start/module/mode/worktree is itself, and only then may it access the
request/recovery journal or publish a `response.started.json`/
`cancel.started.json` contender record. A `recover-review` child additionally
recomputes the sweep digest and proves that its dense projection exact-set equals every
launch ordinal before its own. Only after that check may it read its separate root
review frame or any planned request byte.

Every artifact uses exact `planCore`
`{artifactKind,path,pathSha256,requestIdSha256,runIdSha256,sequence}` with this closed
matrix:

| `artifactKind`      | `requestIdSha256`            | `sequence`                           | Journal basename              |
| ------------------- | ---------------------------- | ------------------------------------ | ----------------------------- |
| `ledger-directory`  | `null`                       | `null`                               | `ledger-directory`            |
| `request-directory` | exact request-ID digest      | positive request sequence            | `request-<12-digit-sequence>` |
| `ledger-entry`      | exact same request-ID digest | exact same positive request sequence | `ledger-<12-digit-sequence>`  |

Every plan, including the ledger directory, has its own `artifact-plan` digest;
`planSha256` is never aliased to `runSha256`. Raw paths may exist only in that private
current-UID journal, the explicit root-private notification, and the host-internal
inspect/respond/status/wait/procedure request-path argv channels defined below. They
never enter a collaboration-agent prompt/result, general workflow
log, safe closure projection, collaboration transcript payload, or task/changelog
evidence; the paired hashes detect replay or substitution. `createdCore` is exactly
`{artifactKind,contentSha256,identity,pathSha256,planSha256,sequence}`, with exact
directory identity `{dev,ino,mode,type:"directory",uid}` or file identity
`{ctimeNs,dev,ino,mode,mtimeNs,nlink,size,type:"file",uid}`, using canonical decimal
strings for bigint fields. Directory `contentSha256` is null; ledger-entry content is
the raw digest of its exact canonical envelope. A request or ledger artifact
`cleanupStartedCore` is exactly
`{createdSha256,pathSha256,sequence}` and its `cleanedCore` is exactly
`{cleanupStartedSha256,createdSha256,pathSha256,sequence}`. Mode manifests and
prepared/committed/cleaned markers use these exact reject-unknown cores:

- `abortManifestCore` is exactly
  `{abortReceipt,branchSha256,entries,generation,gitDirSha256,ledgerDirectoryCreatedSha256,ledgerEntryCreatedSha256s,mode:"abort",rootSha256,runSha256,transactionId,worktreeSha256}`;
- `terminalManifestCore` is exactly
  `{branchSha256,entries,generation,gitDirSha256,ledgerDirectoryCreatedSha256,ledgerEntryCreatedSha256s,mode:"terminal",preClosureCount,preClosureSha256,rootSha256,runSha256,targets,terminalReceipt,transactionId,worktreeSha256}`;
- each ordered `targets` item is exactly
  `{index,mode,newSha256,oldSha256,path,tempPath}`, with indices `0..4`, safe absolute
  paths equal to the five fixed targets, and journal-derived same-parent temp paths;
- `abortPreparedCore` is exactly
  `{abortReceiptSha256,manifestSha256,transactionId}`;
- `terminalPreparedCore` is exactly
  `{manifestSha256,newPayloadSha256s,oldPayloadSha256s,transactionId}`, whose two arrays
  are exact ordered length-five 64-lowercase-hex lists matching `targets`;
- `rollbackPreparedCore` is exactly
  `{manifestSha256,reason:"terminal_verification_failed",transactionId}`;
- `committedCore` is exactly
  `{indexNewSha256,manifestSha256,terminalSha256,transactionId}`;
- `ledgerCleanedCore` is exactly
  `{ledgerDirectoryCleanedSha256,ledgerEntryCleanedSha256s,manifestSha256,transactionId}`,
  where the entry array is dense sequence order and covers every created ledger entry.

`transactionId` is one independent random 128-bit lowercase-hex value. `generation` is a
positive safe integer; entry, created-record, and cleaned-record arrays are dense,
same-length, sequence ordered, unique, and exact-set equal. Every core rejects missing,
extra, accessor, inherited, duplicate, sparse, reordered, or malformed data. The
manifest/marker envelopes use only their named recovery hash domains above; hashing a
generic JSON envelope, omitting a record/payload, or reusing a domain fails.
At each index, the ledger plan/created record sequence equals the safe entry's request
sequence, its `contentSha256` equals the exact canonical ledger-entry envelope bytes,
and its entry hash recomputes from that envelope. `abortReceiptSha256` is exactly the
abort receipt's `sha256`, not a hash of its envelope. All recovery JSON is bounded to
32 MiB, all entry/record arrays to 4,096 items, all strings to 4,096 UTF-8 bytes except
the five fixed target payload files, and all numeric fields to safe integers or the
explicit decimal-string form.

Each request directory is a new canonical direct child of `/tmp`, mode `0700`, owned by
the current UID, and named with a random 128-bit lowercase-hex request ID. Run,
request, claim, and contender IDs are independently random 128-bit values; sequence is
dense and positive. Every enumerated file is a regular current-UID `0600` file.
The closed request-file inventory is exactly `request.json`,
`operator.claim.candidate.json`, `timeout.claim.candidate.json`, `claim.json`,
`response.started.json`, `cancel.started.json`, `response.candidate.json`,
`cancel.candidate.json`, `settlement.json`, `response.done.candidate.json`,
`cancel.done.candidate.json`, `response.done.json`, `cancel.done.json`,
`procedure.candidate.json`, and `procedure.json`; a file absent because its contender
never started is not invented. `response.started.json` is the sole responder
PID/start record. Claim, settlement, done, and procedure candidates are linked to their
fixed destination and then unlinked; no alternate suffix, temporary filename, or
responder sidecar is accepted. Each run-ledger entry is exactly
`ledger-<zero-padded-12-digit-sequence>.json` inside the separately identity-bound
run-ledger directory.
Launch records never join the request-file inventory: they are the exact
ordinal-qualified planned/armed/cleanup-started/cleaned files in the one fixed run
journal, and their set is dense and exact for every host-spawned CLI helper.
Directory/file operations follow stable
`lstat -> open(O_NOFOLLOW) -> fstat -> bounded read/write -> fsync when written ->
fstat/path-lstat identity recheck`; compare `dev`, `ino`, type, UID, mode, link count,
size, and captured time metadata. Creation uses `O_CREAT|O_EXCL|O_NOFOLLOW`;
overwrite-rename is forbidden. No unavailable `O_CLOEXEC` contract is invented.
Every host-spawned
inspect/respond/status/wait/procedure/recover-review CLI uses `shell:false`, the exact
parent-owned launch protocol above, a child-only control pipe excluded from inherited
stdin/stdout/stderr and closed across any later exec, and an explicit empty descriptor
map except for its named pipes. `respond`, `procedure`, and spawned `recover-review`
retain their separate no-echo stdin payload pipe; the arm/GO pipe never carries those
payloads. The host obtains those payloads only from the validated outer controlCore and
never forwards outer framing. No TTY, ambient descriptor inheritance, second launch
protocol, root-launched bridge, or unarmed worker is permitted.

Every envelope/result is exact canonical UTF-8 JSON from one shared serializer: plain
data only, recursively lexicographically sorted object keys, preserved array order,
finite JSON numbers, no accessors/custom prototypes/undefined/bigint, and no duplicate
key, BOM, invalid UTF-8, insignificant whitespace, trailing newline, or trailing byte.
Readers parse/re-encode and require byte equality before checking the domain-separated
hash and stable file identity.

The host-internal bridge CLI mode set is closed to exactly:

```bash
node _docs/_workflows/task-540-codex-agent-bridge.mjs --self-test
node _docs/_workflows/task-540-codex-agent-bridge.mjs --inspect <requestDir>
node _docs/_workflows/task-540-codex-agent-bridge.mjs --respond <requestDir>
node _docs/_workflows/task-540-codex-agent-bridge.mjs --status <requestDir>
node _docs/_workflows/task-540-codex-agent-bridge.mjs --wait <requestDir>
node _docs/_workflows/task-540-codex-agent-bridge.mjs --procedure <requestDir>
node _docs/_workflows/task-540-codex-agent-bridge.mjs --recover-review
```

These remain exactly seven bridge CLI modes. `self-test` is the sole maintenance mode
and does not participate in launch journaling; `recover-review` is the sole
recovery-only no-path/null-request mode. During `--run`, only the continuous
local-orchestrator host may invoke the six request/recovery modes, always through the
one arm/GO protocol.
`recover-review` is the sole null-request outer command that launches a bridge child;
`abort` is also null-request but is handled by the host and launches none. Before a
recovery child is planned, the verified recovery-only host calls the bridge module's
sole export `sweepPriorBridgeLaunchesForRecovery`. Only after that preflight returns
its exact sweep core does the host plan, arm, and GO `recover-review` through the
ordinary null-request launch row while binding the proof as specified above. The root
never directly launches a bridge CLI, and no direct or same-process request/recovery
mode may bypass the host parent launcher.

| CLI mode                      | Exact launch role | Post-GO access                                                                                           | Possible contender start                                    |
| ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `inspect`                     | `inspect`         | its exact request only                                                                                   | `cancel` only when it wins/joins the monotonic timeout path |
| `status`                      | `status`          | its exact request only                                                                                   | `cancel` only at/after deadline                             |
| `wait`                        | `wait`            | its exact request only                                                                                   | `cancel` only at/after deadline                             |
| `respond`                     | `respond`         | its exact request plus its separate bounded stdin result                                                 | `response`, or `cancel` on deadline                         |
| `procedure`                   | `procedure`       | its exact request plus its separate bounded stdin procedure                                              | `cancel` only for the pinned spawn-failure/deadline rows    |
| `recover-review` when spawned | `recover-review`  | fixed recovery journal only after GO verifies the bound prior-helper sweep and before-root-read ordering | none                                                        |

The table is exhaustive for host-spawned bridge helpers. The same-process host
timer may retain exact `processRole:"host"` when it creates a cancellation start; it is
not a spawned CLI role and does not create a launch record. A request
`response.started.json` or `cancel.started.json` still uses the existing exact
`processRole` enum (`host`, `inspect`, `respond`, `status`, `wait`, or `procedure`);
`recover-review` never creates a contender start.

`self-test` accepts no stdin and creates no request/recovery artifact. Among the
host-spawned modes, only `inspect`, `status`, and `wait` receive no payload.
`respond`, `procedure`, and `recover-review` receive one bounded canonical JSON
document on their child-private pipe, then EOF; that document is exactly the payload
already validated in the outer controlCore, and stdin is never inherited or echoed.
The recovery child must not read that pipe until its post-GO sweep-envelope verification
has passed.
`wait` uses a fixed 1,000 ms
monotonic poll slice and returns early on settlement or deadline; it is not an unbounded
wait.
`status` samples once without sleeping. Both use exact `statusCore`
`{claimOwner,deadlineRelation,observedAtMonotonicNs,requestId,sequence,settlementStatus}`,
where `claimOwner` is null, `operator`, or `timeout`; `deadlineRelation` is `before` or
`at_or_after`; and `settlementStatus` is `pending`, `response`, or `cancelled`. They
emit exactly canonical `{...statusCore,statusSha256}` plus LF. A pending observation at
or after the pinned monotonic deadline must first start/join cancellation and emit the
resulting terminal cancellation; `pending` is legal only with `before`. Wall time never
chooses a state.

Every successful mode emits its one documented canonical frame plus LF and empty
stderr. Any argv, stdin, cardinality, canonicalization, identity, schema, replay, or
state failure exits nonzero with empty stdout and exactly
`{"code":"task540_bridge_request_rejected"}` plus LF on stderr; an internal
identity/journal failure instead uses exact code `task540_bridge_failed`. Neither frame
contains a request path, prompt, result, task name, environment value, or raw input.
Missing, combined, repeated, reordered, or additional modes/arguments fail before
opening a request or journal. The arm boundary is the one stricter exception: any
pre-GO EOF/bootstrap/arm/control failure exits nonzero with both stdout and stderr
empty, because even a generic frame would falsely imply that request processing began.

After durable request creation, the continuous host writes exactly one root-visible
safe notification line and no other bridge notification:
`{deadlineAtEpochMs,requestDir,requestId,sequence}` as canonical JSON plus one terminal
LF on the same private stdout used for control replies. The host records the raw path
only in its private request map; the root returns only the matching request ID and
sequence in the next dense `inspect` controlCore. The host then launches `--inspect`
through the exact launch-plan/arm/GO protocol; raw or root spawn is not an alternate.
The request starts unclaimed. Inspect and the local pre-claim timeout race through one
no-overwrite claim slot.

Before either claim attempt, every non-time preimage, candidate byte, schema/hash, and
identity expectation is complete. The operator's
`process.hrtime.bigint()` decision sample is the last non-filesystem step before its
candidate write, file fsync, and hard-link CAS. It may create
`operator.claim.candidate.json` only when that exact
`decisionMonotonicNs < deadlineMonotonicNs`; otherwise it creates or joins timeout and
never writes or links an operator candidate. A timeout contender may create
`timeout.claim.candidate.json` only from an exact
`decisionMonotonicNs >= deadlineMonotonicNs`. Equality is timeout.

Each candidate's bytes are exactly the claim envelope
`{...claimCore,claimSha256}`. It is created with
`O_CREAT|O_EXCL|O_NOFOLLOW`, mode `0600`, stable current-UID regular-file identity,
file fsync, parent fsync, and `nlink=1`. The contender hard-links it with no overwrite
to `claim.json`, parent-fsyncs, proves both names are the same `(dev,ino)` with
`nlink=2`, identity-unlinks the candidate, parent-fsyncs, and proves the stable claim
remains at `nlink=1`. On `EEXIST`, it stable-reads and fully validates the existing
claim envelope/identity/link graph and joins that winner; it unlinks and parent-fsyncs
only its own exact distinct loser candidate, never the claim or another contender.
If timeout wins first,
it creates the one claim with `claimOwner:"timeout"`, starts cancellation against that
claim, emits only canonical `{requestId,status:"cancelled"}` plus LF instead of an
inspect bundle, and no collaboration agent may be spawned. If the
operator wins first, inspect creates the one claim with `claimOwner:"operator"` and
emits exactly one canonical-LF bundle with only
`{accessClass,claimId,deadlineAtEpochMs,label,phase,policy,prompt,requestId,resultSchema,sequence}`.
The root privately records `requestId -> collaboration task name`, starts exactly one
fresh `spawn_agent` with `fork_turns="none"`, and sends that agent only
`policy + prompt + resultSchema`. The agent never receives the request path/ID,
claim ID, process environment or `.env` material, raw patch/content, raw command or log
bytes, credentials/session material, or user data.
If `spawn_agent` fails before returning a task identity, the root retains no invented
mapping/result/correlation and immediately sends the exact `procedure` controlCore
whose payload is the `spawn_failed` frame below. The host's bridge call reuses the operator claim, settles the
derived cancellation from the exact race table below, runs postchecks/rollback, writes
the failed-dispatch ledger projection, cleans the request safely, and returns the
workflow error; no retry or replacement agent is launched.

After an operator claim exists, the deadline path must never create or replace a second
claim. It reuses that exact operator `claimId`/`claimSha256` and races a cancellation
candidate against the response candidate for the same settlement. A cancellation may
be enforced by the authorized host timer or by an
inspect/respond/status/wait/procedure helper that observes the monotonic boundary; each
uses its actual process role/identity in the one `cancel.started.json`, and all other
helpers join that contender. `dispatch_failed` is created only by the procedure mode
after an actual failed spawn attempt and only from a cancellation start strictly before
the deadline, while `deadline_exceeded` always records a decision at/after the deadline.
The exact spawn-failure/deadline race table is:

| First durable cancellation start                                 | Settlement error    | Decision                                                                                           | Procedure / ledger dispatch                                                  | ACK owner and cleanup                                                                                                             |
| ---------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `spawn_failed` procedure strictly before deadline                | `dispatch_failed`   | `decisionMonotonicNs < deadlineMonotonicNs` and equals that cancel start's `startedAtMonotonicNs`  | `spawn_failed`; no task/result/correlation/interrupt                         | procedure process owns the one cancel start/ACK; timer joins; request cleanup precedes aborted-generation finalization            |
| deadline path at or after deadline                               | `deadline_exceeded` | `decisionMonotonicNs >= deadlineMonotonicNs` and equals that cancel start's `startedAtMonotonicNs` | later procedure remains `spawn_failed`; no task/result/correlation/interrupt | winning deadline process owns the one cancel start/ACK; procedure joins; request cleanup precedes aborted-generation finalization |
| procedure observes failure at or after deadline before any start | `deadline_exceeded` | exact procedure sample, `>= deadlineMonotonicNs`, becomes cancel start `startedAtMonotonicNs`      | `spawn_failed`; no task/result/correlation/interrupt                         | procedure owns the one cancel start/ACK; request cleanup precedes aborted-generation finalization                                 |

At equality the deadline case wins. The first valid `cancel.started.json` is immutable;
its actual process role plus `startedAtMonotonicNs` derives the sole legal reason, and a
joiner cannot create another start/candidate/ACK or change the reason. Every row has
`disposition:"rejected_rolled_back"`. A timer delayed behind a pre-deadline
`dispatch_failed` start must join that state; a late procedure behind a deadline start
must join `deadline_exceeded`.
A cancellation
contender is started only when its exact durable `cancel.started.json` record is created
with `O_EXCL`; a responder is started only when its exact durable
`response.started.json` record is created. Creation of either start record makes that
contender's final acknowledgement mandatory even when it loses with `EEXIST`.

After receiving the exact agent result, the root sends one `respond` controlCore whose
payload is exact
`{agentResultSha256,claimId,requestId,result,sequence}`. The host validates its
top-level request binding, then launches `--respond <requestDir>` with `shell:false`,
the arm/GO control pipe, and the distinct no-echo child stdin pipe. No claim/result
enters argv, launch records, GO, or environment. The root computes `agentResultSha256` from
the exact schema-valid collaboration result and the responder recomputes byte equality
after GO but before any start record. Respond samples monotonic time before
`response.started.json` and again immediately before settlement CAS. If either sample
is at or after the deadline, it must not link a response settlement; it starts or joins
exact `deadline_exceeded` cancellation under the existing claim. Otherwise its start
record and response settlement bind the two monotonic samples. The launch armed record
already binds the responder PID/start identity; after GO the responder repeats that
identity in `response.started.json`. The inspect bundle contains no PID. Respond emits
only canonical
`{accepted:boolean,requestId,status}` plus LF, where the closed status is `accepted`
when an eligible response won or `cancelled` when cancellation won. Malformed/replayed
input exits nonzero without another structured frame.

The response-started/deadline-withdrawal branch is exact: when the first sample is
before deadline, `response.started.json` becomes durable; when the second pre-CAS
sample is at or after deadline, the responder creates no `response.candidate.json`, no
response settlement core, and no response link attempt. It starts or joins
`cancel.started.json`, waits for the cancellation settlement, then writes its mandatory
`response_done` ACK bound to that cancellation `settlementSha256` and its own response
`startSha256`. The canceller writes `cancel_done`; the ledger contains both sorted
contender rows and names the cancel start as settlement winner. The same
two-start/two-ACK shape applies when an eligible response candidate loses `EEXIST` to
concurrent cancellation. An illegal response candidate, hypothetical-response-bound
ACK, missing ACK, or omitted contender fails closed.

The root alternates bounded collaboration waits with exact `status`/`wait` control
commands, each completed before another command. A terminal cancellation causes the
first-list/optional-interrupt/final-list
procedure above; local monotonic cancellation remains enforcement.
Local self-tests and the tracked independent test cover only the filesystem/wire
protocol. They must not claim to hermetically execute `spawn_agent`,
`fork_turns="none"`, or `interrupt_agent`. After response settlement, or after handling
a dispatched cancellation, the root sends one `procedure` controlCore carrying exactly
`{agentResultSha256,agentStateAtFinalList,agentStateAtFirstList,claimId,dispatchStatus,forkTurns,interruptAttempted,interruptPreviousState,requestId,sequence,spawned,status,transcriptCorrelationSha256}`.
The host launches `--procedure <requestDir>` through the same parent-owned arm/GO
launcher and distinct no-echo child stdin boundary.
`status` is the complete exact terminal `{...statusCore,statusSha256}` frame. Spawn
failure uses the same keys with the exact spawn-failed values pinned above and
`status:null`; procedure itself creates the cancellation and terminal status hash
before hashing its receipt.
The procedure command emits only canonical
`{accepted:true,requestId,status:"recorded"}` plus LF. It cannot contain a task name,
path, token, prompt, result, environment, log, or user data.

Every operator-claimed request must have one exact procedure receipt. A spawned receipt
attests that the root maintained its private request-to-task mapping, performed
`spawn_agent` with `fork_turns="none"`, and relayed the exact result digest when a
response settled. A `spawn_failed` receipt attests only the failed attempt and must not
invent a task, result, correlation, or interrupt. A pre-claim timeout instead receives
one exact `dispatchStatus:"not_started"` ledger entry and must not claim spawn or
interrupt. The
local bridge cannot hermetically prove a collaboration API call; the root final reviewer
must recompute every `agentResultSha256` and `transcriptCorrelationSha256` from its
private request-to-task map plus exact actual collaboration result and cross-check each
attestation against the collaboration-tool transcript before it submits the `respond`
or `procedure` control command, then repeat the same correlation over the retained safe ledger projection
at the terminal gate. A cancellation settlement has no accepted result digest, although
procedure truth may retain the digest of a transcript result that actually arrived; a
spawn failure has neither task correlation nor result digest. Local enforcement proves
exact cardinality, sequence, settlement binding, and that interrupt attempts occur only
after a terminal cancellation plus an actual first-list-live observation.

Response and cancellation write separate exact `0600` candidates. Immediately before
link, the candidate has `nlink=1`. A winning hard link to the one absent
`settlement.json` must make candidate and settlement the same `(dev,ino)` with
`nlink=2`; the contender then unlinks its candidate and proves the settlement remains
at `nlink=1`. On `EEXIST`, a loser unlinks only its own candidate. After its final CAS
state, whether success or `EEXIST`, every started response or cancellation contender
must create its exact `response.done`/`cancel.done` acknowledgement through the same
candidate-link-unlink pattern. Process or PID/start absence is never a substitute for
that acknowledgement.

Claim-CAS crash recovery is cleanup-only and uses this exhaustive table. “Candidate”
means only the exact identity-bound `operator.claim.candidate.json` or
`timeout.claim.candidate.json`; all envelopes include `decisionMonotonicNs` and satisfy
their owner/time relation.

| Claim/Candidate state                                             | Exact legal cleanup-only recovery                                                                                                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no claim and no candidate                                         | Accept the never-started claim slot; elect nothing and continue only the aborted-generation cleanup.                                                                                                                 |
| no claim and one or both candidates                               | Require each known candidate to be a distinct current-UID regular `0600` identity with valid envelope and `nlink=1`; identity-unlink and parent-fsync only those candidates. Never link, elect, dispatch, or resume. |
| claim alone                                                       | Stable-validate the exact claim envelope/identity and `nlink=1`; retain it until ordinary identity-bound request cleanup.                                                                                            |
| claim plus its same-inode linked candidate                        | Require exact equal envelope, same `dev/ino`, and `nlink=2` at both names; identity-unlink the candidate, parent-fsync, and require the claim at `nlink=1`.                                                          |
| claim plus one or both distinct loser candidates                  | Require the stable valid claim at `nlink=1` and every exact distinct loser at `nlink=1`; identity-unlink/parent-fsync only the losers and retain the claim.                                                          |
| claim plus one same-inode linked candidate and one distinct loser | Require the winner graph at `nlink=2` plus the distinct loser at `nlink=1`; identity-unlink/parent-fsync the two known candidate names and require the claim at `nlink=1`.                                           |

Any other claim/candidate graph, external/unknown link, extra same-inode name, link
count, inode, hash, stable identity, owner/basename, decision/deadline, UID, mode, or
type condition is impossible and fails closed with evidence retained. In particular,
operator at/equal/after the deadline, timeout before it, or equality assigned to
operator is invalid. Recovery normalizes only these known identities during
cleanup-only recovery; it never creates a claim/candidate, performs a missing link,
resamples time, chooses a winner, dispatches, reconnects, resumes, or adopts.

The continuous bridge is the sole shared cleanup owner. It bounded-waits for every
started contender's exact acknowledgement and, when a responder record exists, for
that responder PID/start identity to be absent. An operator-claimed request must also
have its exact procedure receipt; a pre-claim timeout must have no procedure receipt.
Before unlinking, it requires a one-to-one set equality between the stable
`response.started.json`/`cancel.started.json` envelopes, their kind-matching done
acknowledgements, and the prospective safe ledger core's sorted `contenders`; the
winning settlement's `startSha256` must be one member of that set. No loser start/ACK
may disappear.

With every request preimage and stable identity still retained, the host stable-reads
the settlement, runs the existing post-dispatch repository, index, environment,
task-state, ownership, and secret checks, and completes/verifies exact rollback when
needed—even after timeout, dispatch failure, invalid response, or cancellation. Only
after those checks finish does it freeze `disposition`, build the complete safe
verification projection above, and write exactly one immutable `0600` ledger-entry file
per dense request sequence with `O_EXCL` into the canonical direct child
`/tmp/coderso-task540-ledger-<runId>`, where `runId` is the request-core run ID and the
directory is a private current-UID `0700` non-symlink identity. It fsyncs each entry and
never rewrites or deletes an earlier entry before terminal verification. After re-reading
and verifying that immutable entry against the still-present preimages, it unlinks only
the acquired known start/acknowledgement/procedure/responder/settlement/claim/request
files and removes the proven-empty exact request directory. It never recursively
removes, globs, overwrites, or follows a caller-supplied cleanup path. A missing
acknowledgement or procedure receipt, live/recycled responder identity, failed
postcheck/rollback, ledger mismatch, residual file, or cleanup race fails closed without
publishing a misleading ledger entry or erasing evidence.

The verified worktree Git directory owns one fixed private recovery-journal path,
`<gitDir>/coderso-task540-recovery-v1`, as a current-UID `0700` direct child. It is
outside the tracked worktree but inside this verified per-worktree `gitDir` beneath
`<gitCommonDir>/worktrees`; it is isolated from the common-dir root and sibling
worktree Git directories, cannot be caller-selected, and is single-flight with the run.
Before the first random `/tmp` artifact, the host creates and parent-fsyncs this
directory, chooses the run ID and exact planned run-ledger path, writes/fsyncs
`run.json`, then writes/fsyncs `run.prepared.json`. It next writes/fsyncs
`ledger-directory.planned.json`; only then may it create the ledger directory. It
publishes exact `ledger-directory.created.json`,
`ledger-directory.cleanup-started.json`, and `ledger-directory.cleaned.json` using the
artifact cores/matrix above. The plan has its own `planSha256`, while `sequence` and
`requestIdSha256` remain null.
Its per-sequence recovery files are exact zero-padded
`request-<sequence>.planned.json`, `.created.json`, `.cleanup-started.json`, and
`.cleaned.json`, plus `ledger-<sequence>.planned.json`, `.created.json`,
`.cleanup-started.json`, and `.cleaned.json`. A planned record containing the exact
future path/name is durable before each request directory or ledger-entry file can be
created; the created record then binds its observed identity/hash. Normal request and
ledger cleanup fsync cleanup-started before unlink/rmdir and cleaned afterward. Thus a
crash between creation and identity publication still has one fixed durable path
authority; absence after a created record is acceptable only when cleanup-started is
valid, while planned-without-created absence means creation never became durable.
The same journal also owns the exact dense launch record families
`launch-<zero-padded-12-digit-launchOrdinal>.planned.json`, `.armed.json`,
`.cleanup-started.json`, and `.cleaned.json`. A launch plan is durable before `spawn`;
the host-written armed identity is durable before GO; cleanup-started is durable before
launch-record cleanup; and an armed row becomes cleaned only after its exact helper
identity is absent. A null-arm row becomes cleaned only after GO impossibility and
request incapability are proven; it makes no claim about the physical identity or
absence of an unarmed pre-exec process. The complete launch-mode multiset must equal the
actual host-spawned CLI invocations.

Abort mode additionally owns `abort.manifest.json`, `abort.prepared.json`, and
`abort-receipt.json`; terminal mode owns `terminal.manifest.json`,
`terminal.prepared.json`, `old-0.bin` through `old-4.bin`, `new-0.bin` through
`new-4.bin`, and optional `committed.json`, `terminal.rollback-prepared.json`, and
`ledger-cleaned.json`. Every file is
created with
`O_EXCL|O_NOFOLLOW`, mode `0600`, stable identity, exact canonical metadata where JSON,
and file fsync. The journal directory and its Git-directory parent are fsynced after
creation and after each marker. Each mode manifest binds a random transaction ID, exact
branch/worktree/Git-directory hashes, generation, mode, complete safe projection and
receipt hash, the current run-ledger directory identity, and the exact ordered known
ledger-entry identities/hashes. Terminal mode additionally binds the five fixed target
paths, their original modes and old/new byte hashes, and deterministic same-parent
temporary basenames. A valid mode-specific prepared record hashes that complete manifest
plus every owned payload hash; no target or ledger deletion may begin before it and the
containing directory are durable.

On startup, the host resolves only this fixed path before any new run. An active
fixed directory without valid `run.prepared.json` is an incomplete pre-run journal:
random artifact creation was forbidden, so restart requires every run/planned path
absent, removes only known incomplete journal files, fsyncs the Git directory, and fails
the old invocation. A present artifact in that state is unsafe. An active run-prepared
journal without a durable abort/terminal prepared record is a crashed, non-resumable
generation. A fresh root first proves the retained prior host PID/start identity absent,
then starts one new host in recovery-only phase; it cannot reconnect to or resume the
old control stream. That host preserves all request/ledger bytes until the prior-helper
sweep and complete root review below pass. Only the armed recovery child may then use
the planned paths and closed request-file inventory to identity-validate and remove
exact known request files/directories and planned/created ledger entries; it never
executes their payloads. It may create a missing cleanup-started marker before
recovering a still-present created request/ledger artifact. A created artifact already
absent without that marker is unsafe; planned-without-created absence is the only
no-create case. An unknown path/file, identity mismatch, unplanned artifact, or missing
original private request-to-task transcript map fails closed with all bytes retained.
It never glob-scans `/tmp`, adopts old work, or starts a new normal run until this exact
cleanup completes. Termination mutants cover journal directory, run record, run-prepared marker,
every request/ledger planned record, artifact creation, created record,
cleanup-started, request unlink/rmdir, cleaned-record publication, and every launch-plan
write/fsync, spawn, pre-bootstrap, armed write/fsync, GO, request-start publication,
helper-exit/absence, and launch cleanup boundary.

Before crashed-generation cleanup can unlink any request byte, a fresh continuous host
is already in recovery-only mode after the old-host absence proof. The root may send
only one `recover-review` controlCore with null `requestId`/`sequence`; the root never
launches `--recover-review` directly. Its payload is the exact
`recoveryReviewCore`:
`{requests:[{agentStateAtFinalList,agentStateAtFirstList,dispatchState,interruptAttempted,interruptPreviousState,requestSha256,sequence,taskCorrelationSha256}],runSha256,schemaVersion:1}`.
`requests` is dense, sequence ordered, unique, and exact-set equal to every
journal-planned request—zero items only when the journal planned zero requests and at
most 4,096 otherwise. `dispatchState` is exactly `not_started`, `spawn_failed`, or
`spawned`. The first two require both list states and `interruptPreviousState`
`not_applicable`, `interruptAttempted:false`, and null correlation. `spawned` requires
one root-computed `taskCorrelationSha256=bridgeDigest("recovery-task",
{requestSha256,sequence,taskName})`, first-list `live` or `not_live`, final-list
`not_live`, and the same list/interrupt race rules as a cancelled procedure. The root
retains task names only in its private map until the fixed recovery directory is proven
absent; no task name enters stdin, stdout, stderr, journal, ledger, prompt, task, or
changelog.

Before planning that controller, the host calls exactly
`sweepPriorBridgeLaunchesForRecovery` from the identity-pinned bridge module. The
function rejects every caller except the verified continuous host in recovery-only
phase and stable-reads only `run.json`, `run.prepared.json`, the dense fixed launch
record families, and `/proc`. It reads no request, root-review, ledger, manifest,
prepared/receipt, status, or target artifact and performs no artifact cleanup. For
each prior plan it proves either an exact armed PID/start identity absent—after bounded
PID-only TERM then conditional KILL when needed—or planned-unarmed GO/request
incapability. It returns only the exact reject-unknown
`{...priorHelperSweepCore,priorHelperSweepSha256}` envelope defined above.

After that preflight, the host allocates the next launch ordinal, plans and arms the
`recover-review` child, binds `priorHelperSweepSha256` into its armed core, and sends
the exact sweep envelope in GO. After GO the child recomputes the digest and requires
the dense launch projections to exact-set equal every launch ordinal before its own.
Only then may it read and validate the separate root-review frame, inspect request
bytes, validate contender starts, or perform artifact cleanup.

On success the bridge computes
`reviewSha256=bridgeDigest("recovery-review",{requests,runSha256,schemaVersion:1})`,
retains it only in process until cleanup completes, and emits exactly
`{accepted:true,reviewSha256,runSha256,status:"recorded"}` plus LF to the host; the host
returns that parsed object as the exact matching control reply `result`. Missing/extra/
duplicate/reordered rows, a request-set mismatch, a false interrupt combination, or an
unreviewed spawned task uses the closed generic failure frame and retains every request
byte. The root derives the frame from the actual collaboration transcript; for every
first-list-live task it calls `interrupt_agent`, records the actual previous-state race,
and proves a final non-live list before submission. The bridge cross-checks available
claim/procedure preimages but never persists the review, receives a task name, or claims
local collaboration-API verification. Loss of the private root map blocks recovery.

The sweep validates every launch plan before the controller can open any request
directory. A valid planned-without-armed row is request-incapable by construction: GO
was forbidden, the only control-pipe parent is gone, EOF forces silent nonzero child
exit, and pre-GO code cannot touch `requestDir`, the journal, or repo state. Its
projection is exactly `{launchArmedSha256:null,...,state:"planned_unarmed"}` and neither
assigns a PID/start identity nor claims physical process absence. A bounded current-UID
`/proc` observation may be keyed to exact canonical bridge module/mode/launch authority,
but a hit without the matching durable arm is observation only and is never signalled.
For each valid armed row the sweep combines the exact
PID/start/mode/module/worktree with the fixed bridge authority and checks `/proc`
without shell interpretation for that positive identity, executable, cwd, exact
module/mode/request argv, and role. If that exact old helper remains live, it sends
`SIGTERM` only to that positive PID, waits at most five seconds, then sends `SIGKILL`
only if the same identity remains and waits at most five more seconds. It never signals
zero, a negative PID, a process group, a recycled PID, or a mismatched process. Final
absence yields exactly `state:"armed_absent"` with the non-null armed digest.

Only after every armed/request-capable launch is absent does the post-GO recovery child
validate each durable `response.started.json`/`cancel.started.json` against its matching
armed launch (or the same-process host timer), including PID/start/role/mode. A started record without a
valid GO-capable arm, an armed helper without the exact permitted start/absence state,
identity drift, unknown live claimant, failed signal, or missing final absence proof
fails closed. Request cleanup may start only after the child has verified the bound
sweep, every prior armed helper identity is absent, and the complete root procedural
review above has passed. A crash before, during, or after the controller launch leaves
its plan/arm records intact; that controller is therefore one of the prior ordinals in
the next fresh sweep, classified planned-unarmed or armed-absent under the same rules.
The controller creates no contender, and its parent proves its absence before final
journal cleanup.

The launch-record restart table is exact:

| Launch records                                                                                                       | Sweep classification and later controller action                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| planned only                                                                                                         | sweep proves GO/request incapability and returns `planned_unarmed`; only the post-GO controller may later publish cleanup-started with null armed hash, then cleaned                                       |
| planned + armed, no cleanup-started                                                                                  | sweep identity-checks, TERM then conditionally KILLs only the exact live identity, proves absence, and returns `armed_absent`; only the post-GO controller may later publish cleanup-started, then cleaned |
| cleanup-started, no cleaned                                                                                          | sweep repeats any required exact-identity absence proof and returns the matching state; only the post-GO controller may publish cleaned                                                                    |
| cleaned                                                                                                              | sweep requires the armed identity absent or the planned-only request-incapability proof and returns the matching state; the controller requires no request start inconsistent with the row                 |
| armed without planned, wrong predecessor/hash/mode/ordinal, GO-capable start without armed, or any extra launch file | fail closed and retain all request/journal bytes                                                                                                                                                           |

The exact restart presence matrix applies independently to the ledger directory, every
request directory, and every ledger entry:

For a regular file, `identity-equal` means every recorded identity/hash field is exact.
For a directory being cleaned, it means exact `dev/ino/type/uid/mode` plus the same
canonical path; `nlink/size/mtimeNs/ctimeNs` may change only as the journal-listed,
closed-inventory children are identity-unlinked, and are recaptured after every parent
fsync. Any unaccounted change or unknown child fails. A complete request inventory also
revalidates its canonical envelopes and internal hard-link graph; a bounded partial
fixed-name file may be removed only when it is current-UID regular, expected-mode, and
has no link outside that closed request directory.

| Durable recovery records    | Artifact state                                                                                                   | Legal restart action                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| plan only                   | absent                                                                                                           | record never-created; remove only its recovery record during final journal cleanup         |
| plan only                   | present with exact permitted identity/type/mode and self-validating content when a file                          | publish created, then publish cleanup-started and clean                                    |
| plan only                   | ledger file present as current-UID regular `nlink=1`, expected mode/path, and bounded partial/noncanonical bytes | identity-unlink, parent-fsync, retain the plan as never-created; never parse or publish it |
| created, no cleanup-started | present and identity/hash-equal                                                                                  | publish cleanup-started, then clean                                                        |
| created, no cleanup-started | absent or mismatched                                                                                             | fail closed                                                                                |
| cleanup-started, no cleaned | present and identity/hash-equal                                                                                  | continue exact unlink/rmdir, fsync parent, then publish cleaned                            |
| cleanup-started, no cleaned | absent                                                                                                           | treat unlink/rmdir as completed, fsync parent, then publish cleaned                        |
| cleaned                     | absent                                                                                                           | already complete                                                                           |
| cleaned                     | present, or any marker without every required predecessor                                                        | fail closed                                                                                |

Directory cleanup additionally requires every journal-planned child to be cleaned and
the closed inventory to contain no unknown entry before rmdir. A second or later crash
re-enters the same row; no absence is inferred from process state alone.

For a controlled workflow stop before normal terminal closure—including spawn/schema
rejection, an audit finding, validation failure, or another sanitized workflow
failure—the root first interrupts and proves stopped every live mapped collaboration
task, then recomputes every actual request/task/result/procedure correlation; spawn
failure has the exact no-task/no-result state. It sends the sole `abort` control command
with exact payload `{reason,review}`, where `reason` is the matching `abortCore` enum
and `review` is the exact task-name-free `recoveryReviewCore` covering every planned
request. The host handles that command itself and launches no bridge child. It freezes
dispatch, validates the review against its private request map and durable preimages,
builds the exact `abort-ledger` receipt, and writes/fsyncs the abort manifest, receipt,
and prepared marker into the already durable run recovery journal with the complete
safe projection and known run-ledger identities. Only then may it identity-unlink
those exact ledger files and remove the proven-empty ledger directory.

Cleanup is idempotent: restart may continue only the journal-listed entries, accepting
absence only as a previously completed step from that same prepared journal; it never
scans or adopts them as workflow evidence. The host writes/fsyncs
`ledger-cleaned.json`, verifies the abort receipt and absence, unlinks only the known
journal files, removes the proven-empty recovery directory, fsyncs the Git directory,
returns exact `{accepted:true,runSha256,status:"aborted"}` in the matching control
reply, and closes. The root proves the retained host PID/start identity absent. A
missing/incomplete review, live mapped task, unprepared journal, identity mismatch,
unknown file, unsafe absence, or recovery mismatch fails closed and preserves evidence.
Plain/unframed EOF, root disappearance, or a broken control pipe never enters this
path, never writes an abort receipt, and preserves journal/request/ledger bytes as the
raw failed-generation contract above requires.

Immediately before closure-control creation, the host stable-reads the immutable ledger
entries, requires exact dense sequences `1..preClosureCount`, one entry for every bridge
request and exactly one procedure receipt whose dispatch state is `spawned` or
`spawn_failed` for every operator claim, and hashes the canonical ordered envelope array
as `preClosureSha256`. The strict `closureControl.collaborationLedger` object stores
exactly that positive count and digest, while both the independent changelog-index
anchor and changelog evidence block embed that exact ordered safe-verification
projection prefix for restart verification. In the same process, final closure-drift
requests append only higher dense sequences. On a fresh terminal restart, the root
launches a new outer host/control generation; it never reconnects to, resumes, or adopts
the prior control stream. That new host must first verify the independent control
anchor/evidence hash and recompute every embedded
ledger-entry hash, density, safe truth-table invariant, prefix count, and prefix digest.
It adopts the index-embedded array only as an immutable base projection,
prepares/fsyncs a fresh fixed run journal with its planned random run-ledger path,
creates that ledger directory, and assigns new request sequences from
`preClosureCount + 1`; it never scans, discovers, or adopts a stale `/tmp` request or
ledger directory. A crash before a valid independently embedded prefix exists supplies
no resumable closure authority and cannot be normalized into closure evidence; the
fixed run journal may authorize cleanup only, never workflow resumption.

After exactly one final agent-backed closure-drift pass returns its last clean result,
the host permanently freezes agent dispatch,
canonicalizes the immutable base plus current run entries, proves the pre-closure array
is an exact prefix, revalidates every later request/dispatch safe projection plus
correlation-digest format/cardinality, and builds one exact terminal
`{count,preClosureCount,preClosureSha256,schemaVersion:1,sha256}` receipt. The root final
reviewer recomputes every digest against its private actual tool transcript before
accepting that receipt; the local gate never claims it can inspect collaboration APIs.
No collaboration-agent call is legal after the freeze. This does not reuse or replace
the already committed 21-target status journal. The host then prepares the separate
five-file terminal-receipt recovery journal above for these fixed ordered targets:
changelog 1252, root task, closure child, closure leaf, and changelog index last. It
records/fsyncs exact old
and new bytes, modes, hashes, deterministic same-parent temporary names, the complete
safe projection, receipt, and current ledger identity; writes/fsyncs
`terminal.prepared.json`; then replaces targets 0..3 one at a time through their
journal-bound `O_EXCL` temporary file, file fsync, atomic rename, and parent-directory
fsync. The changelog index is
target 4 and the sole commit point: its new anchor is renamed and parent-fsynced last.
Only after that durable commit point may `committed.json` be written/fsynced. Every
replacement is byte/hash/mode verified and unrelated bytes remain pinned.

Restart reads only the fixed identity-bound journal. Without a valid durable prepared
marker, target writes were forbidden; it verifies the old target hashes and cleans only
known incomplete journal files. With a valid prepared marker, no rollback-prepared
marker, and the old index hash, it restores/verifies all five old payloads, then uses the
terminal manifest and still-prepared 21-target status journal. Before any status target
write it creates/fsyncs the exact `status.rollback-prepared.json`; that marker forces
all 20 task files and the board to their old payloads with target 20 last. Only after
full old verification and the deterministic status-journal cleanup may it
identity-clean the failed run ledger/terminal journal, fail the old generation, and
allow ordinary repair to add pending evidence. With the exact new index hash and no
rollback-prepared marker, it rolls all five targets forward to their journaled new
payloads, writes a missing committed marker, and continues terminal verification.
A caught terminal-verification failure first writes/fsyncs the exact
`terminal.rollback-prepared.json` envelope. Once that marker exists, either journaled
index hash requires convergence to all five old payloads with the old index renamed and
parent-fsynced last, followed by creation/fsync of the status rollback marker and the
same marker-priority all-old 21-target rollback/cleanup; it never removes either
journal while retaining an old ledger or Done graph. Any other
index hash, missing payload, path/identity/mode/hash mismatch, unknown file, or unsafe
temporary state fails closed with both journals and the ledger retained. Thus old index
without rollback-prepared is the uncommitted path, new index without it rolls forward,
and rollback-prepared makes old the sole legal destination. Termination mutants
must cover every payload write/fsync, prepared marker/fsync, target temp
write/fsync/rename/parent-fsync, index commit, committed marker, mechanical gate, ledger
unlink/rmdir, and journal cleanup boundary.

For each exact journal-bound target, restart first chooses the required old or new
payload from that index decision, then applies this temp-path table before retrying the
replacement:

| Temp / target state                                                                                                                             | Legal action                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| temp absent, target already required hash/mode                                                                                                  | no rewrite; parent fsync and continue                                                   |
| temp absent, target other journaled hash/mode                                                                                                   | create temp with `O_EXCL                                                                | O_NOFOLLOW`, write full required payload, fchmod original mode, file-fsync, rename, parent-fsync |
| temp present as current-UID regular `nlink=1`, exact mode and complete required payload                                                         | revalidate identity/hash, rename over target, parent-fsync                              |
| temp present as the complete opposite journaled payload                                                                                         | identity-unlink temp, parent-fsync, recreate required payload through the preceding row |
| temp present as a bounded partial payload at the exact planned path, current UID, regular, `nlink=1`, and expected creation mode                | identity-unlink temp, parent-fsync, recreate required payload                           |
| temp symlink/directory/device, wrong UID/mode/link count, unbounded/unknown bytes, path replacement, or target outside its two journaled hashes | fail closed and retain journal/ledger                                                   |
| temp absent because rename completed, target required hash/mode                                                                                 | treat rename as complete; never recreate                                                |

Every present temp is opened no-follow and path/fd identity-rechecked before unlink or
rename. No temp is globbed or inferred from a suffix. A crash during temp unlink,
recreate, rename, or parent fsync re-enters exactly one row.

The identity-bound current run-ledger directory remains intact until the subsequent
final local mechanical gate verifies the durable terminal bytes and the root repeats
its transcript review. Only then may the host idempotently identity-unlink its
journal-listed immutable entries, remove the proven-empty directory, write/fsync
`ledger-cleaned.json`, clean the known terminal journal, then clean the verified
committed status journal, with a Git-dir fsync after each directory removal. A crash
during that cleanup may continue only those exact journal-listed identity operations.
Any ordinary repair attempted after a failed published status generation starts only
after marker-priority all-old verification and status-journal cleanup, then creates a
fresh control generation and repins the now-longer prefix.

This is a same-UID coordination boundary against accidental collision, replay, late
response, and partial writes, not an OS security boundary against a malicious same-UID
process. “No concurrent writer” means the local single-flight latch plus no other
root-authorized TASK-540 writer; arbitrary same-UID writers are outside that cooperative
claim and are detected only by the existing snapshots/postchecks. Those postchecks,
registered-schema validation, and rollback remain final authority; bridge settlement
alone never authorizes mutation or closure.

The agent context remains the current hash/length-only `GroundedChangeManifest`, bounded
to 96 KiB inside the 128 KiB complete prompt. It contains named worktree paths, kinds,
byte lengths, and SHA-256 values plus HEAD/branch/index/worktree authority, never a raw
tracked patch or tracked/untracked file content. The collaboration agent reads the
named current worktree files locally. Sensitive paths, unsupported entries, bound
overflow, and stable-read identity drift fail before dispatch. The implementation
orchestrator still verifies every read-only/mutating result against exact repository
snapshots and ownership.

The implementer must replace the recovered
`READ_ONLY_AGENT_SHARED_CONTRACT` claim that a bounded Claude-style
`Read/Grep/Glob` tool set exists and that shell access is unavailable. The replacement
must state the Codex collaboration behavioral policy honestly: use only local
read-only inspection for audit requests; do not edit, stage, commit, start a server or
browser, run smoke/fixtures/cleanup/validation, invoke another agent, or access
credentials, `.env`, raw logs, or user data. It must not claim a per-agent tool
allowlist or OS sandbox. The independently tracked workflow-security test must prove
the stale tool-language is absent and the replacement prohibitions are present.

Beyond its own identity-bound request/ledger/journal cleanup, the bridge defines no
server, browser, DB operation, validation command, repository/fixture cleanup, smoke
evidence, or smoke capability. All validation commands and the single smoke execution
remain direct responsibilities of the same local implementation orchestrator; only
`executeTask540SmokePlan` constructs the private real smoke capabilities. A
collaboration agent may audit or propose an allowed mutation only; it never executes or
recovers any server/browser/smoke step.

`_docs/_workflows/task-540-smoke-contract.mjs` has exactly these public exports:

```ts
buildTask540SmokePlan({ nonce });
runTask540SmokeContractSelfTest();
```

The module is import-side-effect-free and performs no environment, filesystem,
database, network, or `process.env` access. `buildTask540SmokePlan` accepts an exact
reject-unknown one-key object with the canonical 12-lower-hex nonce and owns the
`SMOKE_FIXTURE_BLUEPRINT`, the source tuples and compiler for all 496 ordered action
rows, every recursive strict schema, the selector/builder/command/output registry,
cardinality/set/dependency validation, single-assignment capture validation, and the
route/page/auth/theme/top-level state machines. It returns one recursively deep-frozen
plan whose sole action collection is the complete 496-row `actionManifest`; there is no
second setup collection or setup execution prepass. Its compiler requires every source
row to have exactly five Markdown-equivalent columns and its transition tuple to have
exactly three explicit clauses (`precondition -> captured output -> postcondition`);
it performs no prose inference and leaves capture/fixture refs symbolic for lazy
resolution at their exact action ordinal. The fixed scope remains exactly 55 setup
rows + 434 flow rows + 7 terminal browser rows = 496, 15 fixture subjects, exactly 17
public capture names, 13 screenshots, and 55 unique visible assertions.
`runTask540SmokeContractSelfTest()` is hermetic and deterministically checks those
counts, strict unknown-key rejection, registries, dependency/capture closure, state
transitions, recursive freezing, the exact disjoint `55/434/7` action-set partition,
dense ordinals `1..496`, and one fake execution plus one receipt for each action exactly
once through an independent contract-model loop. The executor self-test separately
exercises the real executor loop with hermetic capabilities; the two loops do not share
execution authority. Direct `--self-test` execution calls that export, while importing
the module runs nothing.

`_docs/_workflows/task-540-smoke-executor.mjs` has exactly these public exports:

```ts
executeTask540SmokePlan({ root, nonce, assertSafeEvidence, snapshotRepository });
runTask540SmokeExecutorSelfTest();
```

The executor is import-side-effect-free. Its public wrapper first declares one nullable
construction/cleanup-authority slot without reading the untrusted input. Inside the
wrapper's outer sanitizing `try`, and still before it reads any property or prototype
from that input, it creates one pure executor-private construction/cleanup authority.
Authority construction is non-acquiring bookkeeping and performs no environment,
filesystem, process, port, or network access. If that constructor itself fails, the
still-null branch has nothing to clean and retains or discards the cause only through a
non-acquiring module-private never-throw sink before emitting the fixed public failure.
Its public execution input must be a plain object with exactly those four own keys and
validated types; missing/extra keys or an unexpected prototype fail before any runtime
capability starts. `root` must be a canonical
absolute, NUL-free repository path, `nonce` must match the same 12-lower-hex contract,
and both named callbacks must be functions. It accepts no raw environment
map or secret, plan override, `dispatchAgent` callback, browser/API/DB/storage adapter,
arbitrary shell string/argv, command result, agent receipt, or caller-supplied hash.
It calls `buildTask540SmokePlan({nonce})` itself, invokes the two named orchestrator
callbacks only at their strict safe-projection boundaries, and constructs the real
allowlisted local capability adapters privately. Every capability constructor registers
each nullable/partial handle with that construction/cleanup authority immediately when
acquired, before attempting the next construction step. A non-exported
`executeSmokePlanCore(plan, capabilities, constructionCleanupAuthority)` is the sole
execution engine; the same core
supports those real adapters and executor-owned hermetic fakes used only by
`runTask540SmokeExecutorSelfTest()`.

The executor itself remains a Node `.mjs` module. It never statically or dynamically
imports a TypeScript file below `<canonical-root>/core`, a Bun-only production module,
`db/client`, an application service, or an application validation schema. Runtime
handlers that require production service/schema/DB behavior may cross only the private,
fixed one-shot Bun bridge defined below. HTTP requests, isolated API-session ownership,
cookie/CSRF handling, health probes, Playwright dispatch, filesystem observation, and
host-process control remain Node-local and never pass through that bridge.

`_docs/_workflows/task-540-smoke-host.mjs` is the repo-owned, import-side-
effect-free host runner. Its only public export is
`runTask540SmokeHostSelfTest()`. Direct execution accepts exactly one of these two
closed CLI forms:

```bash
node _docs/_workflows/task-540-smoke-host.mjs --self-test
node _docs/_workflows/task-540-smoke-host.mjs --serve <canonical-root>
```

Missing, combined, repeated, reordered, or additional arguments fail before runtime
dependencies are constructed. The `--self-test` branch executes before any filesystem,
`process.env`, `/proc`, spawn, signal, port, or network access. The executor invokes the
`--serve` form directly with its already validated canonical root and exact
null-prototype child environment. The runner never reads, parses, sources, imports, or
searches for `.env`/`.env.*`; rejects every environment key outside the exact host
allowlist below; and directly spawns the one backend, Admin Vite, and site Vite command
descriptors defined below. No installed/global host helper, shell profile, package
script that sources `.env`, or alternate server launcher is permitted. Its hermetic
self-test validates CLI/root/environment rejection, the exact three child descriptors,
process-group ownership, bounded descendant TERM-to-KILL state transitions, and proof
schemas without starting a process, opening a port, reading the environment, or touching
the filesystem.

Raw environment values, stdout/stderr and HTTP bytes, request/response bodies, cookies,
CSRF values, session tokens/hashes/handles, DB/storage details, and live process handles
remain in executor-private authority. A separate inaccessible `WeakMap` may retain the
raw cause, retained stdout/stderr buffers, and process-result metadata for cleanup and
hermetic non-egress checks; the class map, tracker, and diagnostic emitter cannot read
that detail map. No callback, public error, log, audit prompt, or returned object may
receive those private details. Success crosses the module boundary only as one strict
reject-unknown, recursively frozen `CanonicalSmokeEvidence` whose hashes were computed
from the private observations.

After cleanup, a failure may write exactly one synthesized canonical stderr line of at
most 256 bytes through a caught synchronous full write to file descriptor `2`. The line
always contains `code:"task540_smoke_failed"` and at least one authority: the active
frozen-manifest `failedActionId`, or the inseparable cleanup pair
`cleanupPhase`/`cleanupFailureClass`. `failureClass` may accompany only an active action
in the closed auth-settlement, Tone-open, Tone-select, or dirty-navigation action sets.
The only exact key shapes are action-only two/three-key, cleanup-only three-key, and
combined four/five-key diagnostics. Cleanup phase is an integer from 0 through 10;
phase 0 accepts only `cleanup_boundary_failed` or `construction_cleanup_failed`, phases
1 through 10 accept `phase_failed`; phase 8 additionally accepts the exact classes
`bootstrap_reconciliation_failed`, `bootstrap_cas_failed`,
`bootstrap_uncertain_baseline_failed`, `bootstrap_post_restore_proof_failed`, and
`bootstrap_restore_receipt_failed`; and phase 3 additionally accepts
`admin_api_failed`, `persistent_plan_failed`, `persistent_stage_failed`,
`persistent_dependency_blocked`, `persistent_provenance_failed`,
`persistent_delete_failed`, and `persistent_absence_failed`. Multiple cleanup failures
select the earliest phase, then the exact same-phase priority
`persistent_plan_failed` -> `admin_api_failed` -> `persistent_provenance_failed` ->
`persistent_delete_failed` -> `persistent_absence_failed` ->
`persistent_stage_failed` -> `persistent_dependency_blocked` ->
`bootstrap_reconciliation_failed` -> `bootstrap_cas_failed` ->
`bootstrap_uncertain_baseline_failed` -> `bootstrap_post_restore_proof_failed` ->
`bootstrap_restore_receipt_failed` -> `phase_failed` ->
`construction_cleanup_failed` -> `cleanup_boundary_failed`. `EPIPE`, `EBADF`, a
partial write, or any other write failure remains private and cannot replace the fixed
thrown failure. No diagnostic contains captured command stderr, a raw cause, or a raw
observation. Auth-settlement
browser-observation failure classes remain limited to
`dom_read_failed`, `geometry_absent`, `geometry_nonfinite`,
`geometry_nonpositive`, `label_absent`, `label_duplicate`,
`loading_view`, `login_route`, `menu_absent`, `menu_duplicate`, `menu_hidden`,
`name_empty`, `name_mismatch`, `noncanonical_route`, `page_closed`,
`runtime_failure`, or `url_unstable`. Pre-classifier executor failures are separately
limited to `invocation_boundary_failed`, `repository_boundary_failed`,
`process_runner_failed`, `process_timeout`, `process_exit_failed`,
`process_stderr_rejected`, `process_output_limit`, `browser_error_frame`,
`receipt_boundary_failed`, `output_normalization_failed`, or `success_contract_failed`.
Tone-open is limited to its four `tone_*` settlement classes. Tone-select is limited to
the seven exact classes `tone_select_authority_option_precondition`,
`tone_select_menu_close`, `tone_select_interaction_handoff`,
`tone_select_dirty_badges`, `tone_select_selection_override`,
`tone_select_muted_class`, and `tone_select_computed_color_delta`. The four
dirty-navigation siblings other than `dg-024-entry-nav-cancel` remain limited to the
twelve exact browser classes `target_bound`, `target_duplicate`, `target_missing`,
`source_url`, `scroll_locked`, `inline_pointer_locked`, `computed_pointer_locked`,
`target_intercepted`, `click_failed`, `dialog_duplicate`, `not_suspended`, and
`dialog_settlement`. `dg-024-entry-nav-cancel` uses that same twelve-class contract;
there is no cross-action owner-timeline class or page-global diagnostic authority.
Every browser class may be joined only by the executor-stage classes above. Exactly the
two Tone-select
actions settle only after every Select content node is absent, the body has no
`data-scroll-locked` attribute, and both its inline and computed pointer-event values
are unlocked continuously for at least 600 ms across at least two complete samples.
Any failed complete postcondition resets the dwell, and one final atomic teardown
sample must pass immediately before handoff; their existing selected value,
dirty-state, selection, and computed-color proofs remain required. Each of the five
dirty-navigation actions first proves the exact named dialog absent, body pointer and
scroll state unlocked, and the link physically owns its center-point hit target. It
then dispatches the physical click with `noWaitAfter` and evaluates the complete exact
named-dialog, stable-URL, and stable-navigation postcondition even when the click call
throws.

For the exact `dg-022` -> `dg-023` -> `dg-024` sequence, responsibility is deliberately
split without a page-global handoff. `dg-022` owns the Radix Select transition and may
return only after the complete authored tone/dirty/selection/computed-color proof, at
least 600 ms of continuously closed Select content and unlocked scroll/pointer state,
and one final atomic teardown sample. `dg-023` freezes only the dirty content,
presentation, URL, and navigation authority. `dg-024` reads the current document state
inside its own command: every target poll recomputes body scroll/pointer state, visible
target cardinality, geometry, and event ownership. Before the hit-test it calls
`scrollIntoViewIfNeeded`, then reacquires the final rectangle and visibility so stale
pre-scroll geometry cannot pass. It dispatches one physical click with `noWaitAfter` and
requires the exact named dialog with positive geometry, exact heading/description/
buttons, and unchanged URL/navigation even when the click call throws. The executor
self-test must reject removal/reordering of the current-state checks, final geometry,
scroll settlement, center hit-test, click, and dialog/navigation postconditions. Product
source remains read-only unless this same-action evidence names a live product-owned
layer.

The browser-frame set and executor-stage set are disjoint. Their frozen diagnostic union
is the sole allowlist for private error branding, tracker retention, and the emitter.
Only the browser-frame set may generate or classify a serialized failure frame; an
executor-stage class serialized by browser output remains non-exact and generic. Except
for the explicitly bounded `success_contract_failed` eligibility guard below, stage
classes are selected only by their owning boundary, already-retained process
booleans/counts, or the allowlisted browser-error marker after the secret scan. Those
selectors never parse, hash, excerpt, or project an error message, stderr, URL, body,
cookie, credential, environment value, session handle, or response payload. After the
non-exact command buffers have passed the generic secret scan and output normalization,
the success eligibility guard may privately decode and parse only the complete canonical
three-field envelope to check its keys, types, and canonical framing. It never selects a
class from a field value and never stores, returns, logs, hashes, excerpts, or projects a
field value; the registered parser/schema/predicate remains the sole semantic authority.

The browser helper returns its two-key private failure frame at the bounded deadline, or
immediately after a proven page-close during polling. The command authority retains a
post-run repository failure instead of throwing it until output safety is resolved. Only
when the program is exactly `playwright-cli` and the repository boundary plus every
bounded successful-process guard are clean may it byte-compare and brand the complete
exact browser failure frame before the generic substring secret scan. That match is safe
by construction because the entire stdout is one allowlisted constant and stderr is
empty. The allowlisted browser-error marker likewise maps to `browser_error_frame` only
for `playwright-cli`. A different program carrying either an exact browser frame or the
marker remains generic. Every other returned process outcome first scans all retained
non-exact stdout/stderr bytes; a secret/corpus match remains generic.
Only after a clean scan does the closed process precedence apply:
`process_output_limit` > `process_timeout` > `process_runner_failed` for a returned
spawn/termination anomaly > `browser_error_frame` > `process_stderr_rejected` >
`process_exit_failed`. A runner throw with no returned buffers maps directly to
`process_runner_failed`; a pre-run snapshot failure maps directly to
`repository_boundary_failed`. A retained post-run repository failure takes precedence
over the process classes after the non-exact scan. The same browser-frame exact-byte
check remains after output normalization as defense in depth.

`invocation_boundary_failed` owns only compilation of the registered action execution
spec, route metadata, and browser invocation before the command starts.
`output_normalization_failed` owns only command-output normalization.
`success_contract_failed` owns only the registered success parser/schema/predicate and
is eligible only after a private no-throw guard proves that the normalized bytes are the
canonical one-line auth-settlement success envelope with exactly the own keys
`url`, `userMenuVisible`, and `userName` and the exact types string, boolean, and string.
One-line invalid JSON, a wrong type, an additional key, an unknown or executor-stage
failure class, and any other non-success-shaped frame remain unbranded generic failures.
`receipt_boundary_failed` owns both the command receipt and the complete post-parse
browser result boundary: receipt construction, safe-evidence validation, capture binding,
resource-delta derivation, result freeze, and the real `validateCapabilityResult` call
before `executeAction` returns. The core keeps its existing second
`validateCapabilityResult` call as defense in depth. Ledger append and post-ledger
resource registration remain intentionally generic internal invariants because the six
auth-settlement actions have an empty acquisition delta. Unknown classes, additional
keys, raw URL/body/cookie/credential content outside the exact eligible canonical
success envelope, non-settlement actions, secret matches, corrupt internal invariants
outside those exact scopes, and unbranded failures remain the original action-only
diagnostic. A non-secret URL with the wrong semantic value inside that exact envelope is
eligible for the registered predicate and maps to `success_contract_failed`. Every failure from
exact input validation, plan construction, partial or complete capability construction,
core execution, or cleanup still throws only the frozen exact sanitized projection
`{code:"task540_smoke_failed"}`. Construction, unknown, no-active-action, and
cleared-action states emit no line when cleanup proves absence; when cleanup itself
fails they may emit only the exact cleanup-only diagnostic defined above. The one
private authority performs bounded idempotent
cleanup of exactly the handles/resources acquired so far; a core cleanup attempt and the
public wrapper's failure cleanup share the same once-state, so they cannot double-close
or double-delete. Raw causes and raw cleanup observations remain private; only the
bounded phase/class pair may cross the diagnostic sink, and a cleanup error cannot
replace the fixed public failure. The executor self-test uses
only hermetic fakes and covers success, construction-authority creation failure while the
slot remains null, reject-unknown input, plan-build failure, failure after each
partial-construction acquisition, duplicate/corrupt actions, exactly-once cleanup on core
and cleanup failure, private-value non-egress, fixed failure shape, once-only exact-byte
diagnostic output, contained synchronous `EPIPE`/`EBADF` and partial-write failures, and the prohibition
on agent/command/receipt/hash injection. A hermetic generated-source harness executes
the real auth helper and common observation epilog for success, login, loading,
menu-absent, runtime-failure, DOM-read-failure, and page-close-during-wait states. A
second harness invokes the production `LocalCommandAuthority` with a module-private
injected fake process runner and immutable fake snapshots. It proves exact browser
failure frames are branded before the generic secret scan; a serialized executor-stage
frame and the browser frame/marker under any non-`playwright-cli` program remain generic;
each clean, non-secret closed invocation, process, repository, normalization,
success-contract, and both receipt stages map to the exact safe class; invalid-UTF-8,
empty, or multiline non-secret framing maps only to `output_normalization_failed`; and one-line
invalid JSON, a wrong success-field type, additional/raw keys, an unknown class, or a
serialized executor-stage class remains generic. Canonical success-shaped frames with a
wrong URL, false visibility, or an empty user name map to `success_contract_failed`.
An invalid browser result that passes command-receipt construction but fails the real
`validateCapabilityResult` maps to `receipt_boundary_failed` after exactly-once cleanup.
The same failures on a non-auth action remain generic. Table-driven overlapping process
outcomes pin the precedence above, with a non-auth generic twin for every row. The
repository matrix additionally proves that a post-run repository failure beats an exact
auth frame and every individual or overlapping process flag after a clean scan, that a
repository failure plus secret-bearing non-exact stdout/stderr remains generic, and that
a pre-run snapshot failure invokes no runner. Secret-bearing non-exact stdout/stderr
remains generic in every mixed case. Both harnesses continue
through the real diagnostic union, tracker, core cleanup, and exact post-cleanup boundary
without projecting their retained private marker. Its successful-loop case proves that after
`end-007-session-absence` phase 1 issues zero browser CLI invocations and zero browser
receipts, then identity-safely removes only the already-acquired private root. Its early-
failure matrix proves that phase 1 executes exactly the still-missing subset of
release/unroute, native route-list, close, and global-list absence operations once, emits only private
cleanup diagnostics for them, and never replays an already completed terminal browser
operation. The null-authority case proves zero cleanup attempts and only the module-
private never-throw sink; every failure case observes the same frozen public failure.

Implementation pseudocode for the pre-classifier repair:

```ts
const AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  // The existing 17 DOM, URL, geometry, identity, and runtime classes.
]);
const AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES = deepFreezeExact([
  "invocation_boundary_failed",
  "repository_boundary_failed",
  "process_runner_failed",
  "process_timeout",
  "process_exit_failed",
  "process_stderr_rejected",
  "process_output_limit",
  "browser_error_frame",
  "receipt_boundary_failed",
  "output_normalization_failed",
  "success_contract_failed",
]);
const AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES = deepFreezeExact([
  ...AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES,
  ...AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES,
]);
const AUTH_SETTLEMENT_FAILURE_FRAMES = buildExactFrames(AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES);
const PRIVATE_AUTH_SETTLEMENT_FAILURE_CLASSES = new WeakMap();
const PRIVATE_AUTH_SETTLEMENT_FAILURE_DETAILS = new WeakMap();

function createPrivateAuthSettlementFailure(failureClass, privateDetails = null) {
  requireMember(AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES, failureClass);
  const failure = new Error("TASK-540 auth settlement failed");
  PRIVATE_AUTH_SETTLEMENT_FAILURE_CLASSES.set(failure, failureClass);
  if (privateDetails !== null) {
    PRIVATE_AUTH_SETTLEMENT_FAILURE_DETAILS.set(failure, privateDetails);
  }
  return failure;
}

function failAuthSettlementStage(action, failureClass, privateDetails, fallbackMessage): never {
  if (AUTH_SETTLEMENT_ACTION_IDS.includes(action.id)) {
    throw createPrivateAuthSettlementFailure(failureClass, privateDetails);
  }
  throw new Error(fallbackMessage);
}

function classifySafeProcessOutcome(program, execution) {
  // Called only after the retained non-exact buffers pass the secret scan.
  if (execution.stdout.exceeded || execution.stderr.exceeded) return "process_output_limit";
  if (execution.timedOut) return "process_timeout";
  if (execution.spawnError || !execution.termination.absent) return "process_runner_failed";
  if (program === "playwright-cli" && hasAllowlistedBrowserErrorMarker(execution.stdout.bytes)) {
    return "browser_error_frame";
  }
  if (execution.stderr.bytes.length !== 0) return "process_stderr_rejected";
  if (execution.completion.code !== 0) return "process_exit_failed";
  return null;
}

function isExactAuthSettlementSuccessFrame(action, normalizedBytes) {
  if (!AUTH_SETTLEMENT_ACTION_IDS.includes(action.id)) return false;
  try {
    const text = decodeExactNativeUtf8(normalizedBytes, "auth settlement success frame");
    if (!text.endsWith("\n") || text.length <= 1 || text.slice(0, -1).includes("\n")) {
      return false;
    }
    const body = text.slice(0, -1);
    const value = JSON.parse(body);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    if (!deepEqualJson(Object.keys(value), ["url", "userMenuVisible", "userName"])) {
      return false;
    }
    return (
      canonicalJson(value) === body &&
      typeof value.url === "string" &&
      typeof value.userMenuVisible === "boolean" &&
      typeof value.userName === "string"
    );
  } catch {
    return false;
  }
}

class LocalCommandAuthority {
  constructor(input, processRunner = runRetainedProcessGroup) {
    // The optional runner is module-private and accepted only by hermetic self-tests.
    bindPrivateAuthority(this, input, processRunner);
  }

  async executeProgram(input) {
    let before;
    try {
      before = await snapshotRepository();
    } catch (cause) {
      failAuthSettlementStage(
        input.action,
        "repository_boundary_failed",
        { cause },
        "snapshot failed"
      );
    }

    let execution;
    try {
      execution = await privateProcessRunner(input);
    } catch (cause) {
      failAuthSettlementStage(input.action, "process_runner_failed", { cause }, "command failed");
    }

    let repositoryFailure = null;
    try {
      const after = await snapshotRepository();
      assertRepositoryMutationPolicy(input.action, before, after);
    } catch (cause) {
      repositoryFailure = cause;
    }

    const cleanProcess = processOutcomeIsSuccessfulBoundedAndAbsent(execution);
    const exactFailureClass =
      input.program === "playwright-cli" && repositoryFailure === null && cleanProcess
        ? classifyPrivateAuthSettlementFailureFrame(input.action.id, execution.stdout.bytes)
        : null;
    if (exactFailureClass !== null) {
      throw createPrivateAuthSettlementFailure(exactFailureClass, { execution });
    }

    // Every non-exact retained stdout/stderr buffer is scanned before a safe stage class.
    assertCommandOutputContainsNoSensitiveValue(execution);
    if (repositoryFailure !== null) {
      failAuthSettlementStage(
        input.action,
        "repository_boundary_failed",
        { cause: repositoryFailure, execution },
        "repository changed"
      );
    }
    const processFailureClass = classifySafeProcessOutcome(input.program, execution);
    if (processFailureClass !== null) {
      failAuthSettlementStage(
        input.action,
        processFailureClass,
        { execution },
        "local command failed"
      );
    }

    try {
      return buildAndValidateSafeCommandReceipt(execution);
    } catch (cause) {
      failAuthSettlementStage(
        input.action,
        "receipt_boundary_failed",
        { cause, execution },
        "command receipt failed"
      );
    }
  }
}

async function executeBrowserAction(action) {
  let invocation;
  try {
    invocation = buildRegisteredExecutionSpecRouteMetadataAndInvocation(action);
  } catch (cause) {
    failAuthSettlementStage(
      action,
      "invocation_boundary_failed",
      { cause },
      "browser invocation failed"
    );
  }
  const commandResult = await authority.executeProgram(invocation);
  let normalizedBytes;
  try {
    normalizedBytes = await normalizeBrowserCommandOutput(commandResult.stdout);
  } catch (cause) {
    failAuthSettlementStage(
      action,
      "output_normalization_failed",
      { cause, commandResult },
      "output invalid"
    );
  }
  const exactFailureClass = classifyPrivateAuthSettlementFailureFrame(action.id, normalizedBytes);
  if (exactFailureClass !== null) throw createPrivateAuthSettlementFailure(exactFailureClass);
  const successContractEligible = isExactAuthSettlementSuccessFrame(action, normalizedBytes);
  let parsedOutput;
  try {
    parsedOutput = parseRegisteredOutput(normalizedBytes);
  } catch (cause) {
    if (successContractEligible) {
      failAuthSettlementStage(
        action,
        "success_contract_failed",
        { cause, commandResult },
        "output contract failed"
      );
    }
    throw cause;
  }
  try {
    const result = buildValidateAndFreezeBrowserCapabilityResult(
      action,
      commandResult,
      parsedOutput
    );
    validateCapabilityResult(result, action, executable, plan);
    return result;
  } catch (cause) {
    failAuthSettlementStage(
      action,
      "receipt_boundary_failed",
      { cause, commandResult },
      "browser result failed"
    );
  }
}
```

The private one-shot Bun runtime bridge does not add a fourth smoke module. Its
action-specific registry, immutable
`--eval` source constants, schemas, and one-shot spawn primitive are non-exported
declarations inside `task-540-smoke-executor.mjs`; there is no separate Bun-bridge file, package
script, installed helper, executable wrapper, daemon, persistent worker, or reusable Bun
server. The Codex collaboration bridge above is workflow coordination, not a smoke or
Bun-runtime module. The exact three named repo-owned smoke modules remain the complete
on-disk smoke-module set.

Once all three smoke modules, the Codex collaboration bridge, and the separate
local-orchestrator host exist, the closure leaf gate, `FULL_GATE_COMMANDS`, and every
final mechanical gate run these exact ten
task-infrastructure commands in this order:

```bash
node --check _docs/_workflows/task-540-smoke-contract.mjs
node _docs/_workflows/task-540-smoke-contract.mjs --self-test
node --check _docs/_workflows/task-540-smoke-executor.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node --check _docs/_workflows/task-540-smoke-host.mjs
node _docs/_workflows/task-540-smoke-host.mjs --self-test
node --check _docs/_workflows/task-540-codex-agent-bridge.mjs
node _docs/_workflows/task-540-codex-agent-bridge.mjs --self-test
node --check _docs/_workflows/task-540-local-orchestrator.mjs
node _docs/_workflows/task-540-local-orchestrator.mjs --self-test
```

These commands are additive to the existing implementation-orchestrator syntax and
repair-resume checks. They were not added to the pre-existing TASK-540-04-L03
repair-only gate: that historical gate ran before these smoke modules existed and retained
its exact repair-set ownership and command set. This temporal exclusion never permits a
closure/full/final gate to omit any module after orchestration lands them.

## Security Contract

TASK-540-06-L01 adds no route and widens no visibility. Custom Screen, content-type,
content-entry, presentation-override, media, and user-settings traffic remains on the
existing internal `/admin/api/*` surface. It authenticates only with the existing Admin
session cookie; it adds no API-key, bearer-token, anonymous, or public-write mode. The
only public/auth-surface reads are the existing login, CSRF, bootstrap-auth, and exact
bot-protection preflight calls needed to establish or prove that same Admin session.

RBAC remains exact: Custom Screen, content-type, content-entry, and presentation-
override reads require `content:read`, and their writes require `content:write`; media
reads require `media:read`, while upload/delete require `media:write`. User-settings
GET/PATCH remains authenticated-user self-scoped and has no widened permission or
body-selected user authority. The local A/B provisioning service adapter creates only
the two isolated canonical Admin-role fixtures and is neither an Admin API nor a route
permission bypass.

Every unsafe internal HTTP request used by the manifest—POST, PATCH, or DELETE—carries
the current session's shared CSRF token under the exact privately loaded
`security.csrf.headerName`; no conventional header spelling, retry, or exemption is
allowed. The HTTP classifier still classifies authenticated internal GET/HEAD as
`admin_read` and authenticated internal POST/PATCH/DELETE as `admin_write`, but the
current shared `checkRateLimit()` contract deliberately returns without consuming
either counter when `isAuthenticated` is true. Therefore the smoke must not budget or
claim authenticated Admin read/write counter hits. Only the exact enumerated `/auth/*`
calls consume the `auth` bucket and join `REQUIRED_AUTH_RATE_PLAN`; its capacity
preflight and six bounded natural-window barriers remain authoritative. No limiter
state or security setting is reset or mutated.

Every fixed request envelope and nested Screen section/block/tab/binding object,
content-type/entry body, presentation override, user-settings `{value}` body, and media
metadata object remains strict reject-unknown before persistence. Known domain errors
remain machine-readable and route-mapped; unknown fields, raw values, DB errors,
secrets, and paths cannot enter evidence. Nonce plus signature/HMAC, reCAPTCHA, and
other anonymous anti-abuse controls are inapplicable because this leaf adds no public
write or anonymous mutation; the disabled bot-protection preflight is an infrastructure
condition, not a bypass.

## Required test matrix

```text
tests/vitest/admin/cacheBus.test.ts
tests/vitest/admin/cacheBusCorrelation.test.ts
tests/vitest/admin/cacheBusHardening.test.ts
tests/vitest/admin/custom-screen-binding-contract.test.ts
tests/vitest/admin/custom-screen-block-style.test.ts
tests/vitest/admin/custom-screen-document-contract.test.ts
tests/vitest/admin/custom-screen-fixed-block-contract.test.ts
tests/vitest/admin/custom-screen-schemas.test.ts
tests/vitest/admin/custom-screen-section-style-and-binding-gc.test.ts
tests/vitest/admin/custom-screen-stored-read-repair.test.ts
tests/vitest/admin/customScreensClient.test.ts
tests/vitest/admin/customScreensEntryOverridesClient.test.ts
tests/vitest/customScreens/screenDocumentOps.test.ts
tests/vitest/customScreens/screen-document-image-src.test.ts
tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts
tests/vitest/customScreens/customScreenService.test.ts
tests/vitest/customScreens/relatedEntryResolver.test.ts
tests/vitest/admin/entriesClient.test.ts
tests/vitest/admin/entriesClientReadAuthority.test.ts
tests/vitest/admin/entriesClientMutationReconciliation.test.ts
tests/vitest/admin/mediaClient.test.ts
tests/vitest/admin/userSettingsClient.test.ts
tests/vitest/assistant/action-plan-schema.test.ts
tests/vitest/assistant/blueprint-binding-composer.test.ts
tests/vitest/assistant/catalogBlueprintEngine.test.ts
tests/vitest/ui/admin-auth-identity.test.tsx
tests/vitest/ui/assistant-panel-interaction.test.tsx
tests/vitest/ui/assistant-panel-conversation.test.tsx
tests/vitest/ui/use-screen-entry-preferences.test.ts
tests/vitest/ui/use-screen-related-entries.test.tsx
tests/vitest/ui/custom-screen-entry-draft.test.ts
tests/vitest/ui/custom-screen-entry-presentation-media.test.ts
tests/vitest/ui/custom-screen-binding-panel.test.tsx
tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx
tests/vitest/ui/custom-screen-authoring-boundary.test.ts
tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx
tests/vitest/ui/custom-screen-records.test.tsx
tests/vitest/ui/custom-screens-page.test.tsx
tests/vitest/ui/custom-screen-editor-draft-and-save.test.tsx
tests/vitest/ui/custom-screen-editor-hydration-authority.test.tsx
tests/vitest/ui/custom-screen-editor-visit-authority.test.tsx
tests/vitest/ui/custom-screen-list-view-canvas.test.tsx
tests/vitest/ui/custom-screen-route-params.test.ts
tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx
tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx
tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx
tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx
tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx
tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx
tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx
tests/vitest/ui-integration/screen-editor-sections.test.tsx
tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx
tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx
tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx
tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx
tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-presentation.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-layout.test.tsx
tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
tests/vitest/widgets/screenWidgets.test.tsx
tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx
tests/unit/settings/userSettingsService.test.ts
tests/integration/routes/userSettings.test.ts
tests/integration/routes/userSettingsAccessLogHarness.test.ts
tests/integration/routes/cors.test.ts
tests/integration/routes/customScreensRoutes.test.ts
tests/integration/routes/customScreensDefinitionIntegrityRoutes.test.ts
tests/unit/assistant/actionExecutorService.test.ts
tests/unit/assistant/actionExecutorCustomScreens.test.ts
tests/unit/assistant/actionExecutorPages.test.ts
tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts
tests/unit/assistant/actionExecutorForms.test.ts
tests/unit/assistant/actionExecutorMenusAndSeo.test.ts
tests/unit/assistant/actionExecutorContentUpdates.test.ts
tests/unit/assistant/actionExecutorAutomationBlueprints.test.ts
tests/unit/assistant/actionExecutorIdempotencyAndSiteKit.test.ts
tests/unit/assistant/actionExecutorCatalogBlueprints.test.ts
tests/unit/assistant/actionExecutorSupportingPageLinks.test.ts
tests/unit/assistant/actionExecutorDetailPages.test.ts
```

This required matrix contains exactly 82 files: 64 Vitest files plus 18 Bun files.
Exactly 81 are source-owner/read-only dependency files and 1 is the closure-owned aggregate
`custom-screen-task-540-flow.test.tsx`.

Before and after every source-owner gate and every full-validation command sequence, the
workflow verifies baseline `e5f15a5675b58df85e573f760df4429af735400f` as the first
family commit's parent and current merge base, inventories every production/test path
touched anywhere in `baseline..HEAD` plus the current tracked diff and exact untracked
paths, and counts complete physical lines for each human-authored `core/**`,
`packages/**`, `store/**`, or `tests/**` JavaScript/TypeScript module. The pre-split
authority contains exactly 91 current owned module/test paths; planned split/support
paths join it without replacing any historical owner. Every evidence row contains exact
`{ path, owner, lines, sha256 }` and the gate fails when any count exceeds 1,000. The
generated/vendor/migration-metadata exemptions match `AGENTS.md`; every frozen or
dynamically discovered touched path must still exist as a regular non-symlink file, so
missing/deleted/renamed historical paths fail closed. A printed count without a non-zero
failure is not evidence, and an over-limit file cannot be deferred to TASK-9999.

The ten protected split families must preserve the exact sorted multiset of all 347
fully expanded pre-split test names. Every final suite runs independently, each family
runs as one combined command, and the before/after name contract must pass; matching
only a count is insufficient. Outside that 347 total, R01's seven schema suites retain
their exact 77-name `18+9+10+13+11+5+11` partition and its two route suites retain exact
13+8 names; the same executable name/body/partition helper protects both auxiliary
families in R01 and final closure.

The historical source-modularity land order (already completed; not the current
bridge-frontier execution order) was
`540-01-L01 → 540-02-L01 → 540-03-L01 → 540-04-L01 → 540-04-L03 →
540-04-L04 → 540-05-L01 boundary → 540-05-L02 → 540-06-L01`. Closure must
read every predecessor's post-split receipt from the current tree; a historical
pre-split behavior receipt cannot satisfy this dependency.

The closure ownership reconcile also verifies, read-only, that TASK-540-01-L01 owns the
stable explicit `customScreenSchemas.ts` facade, its cohesive extracted schema owners,
the type-only `bindingResolver.ts` cycle break, seven independently runnable schema
suites plus their fixture module, the exact-UUID route harness and 13+8 Custom Screens
route-suite partition, the narrow shared-builder replacement in `screenDocumentOps.ts`,
the cohesive document-operation facade/five-owner split, the explicit-ID Assistant
composer plus its focused regression, and the twelve-suite/73-name Assistant executor
family plus five support owners, while the Assistant action-plan/catalog Vitest files
remain read-only consumers. R01's Bun-free `screenMediaIdentity.ts` also owns the sole
first-valid scalar/array media-UUID selector; R03's runtime leaf renderer and L03's
Entry presentation-media planner import it directly and remain read-only to one another.
TASK-540-02-L01 solely owns the stable
`ScreenBlockInspector.tsx` facade, `screenBlockInspectorModel.ts`,
`ScreenBlockInspectorControls.tsx`, `ScreenBlockInspectorTabs.tsx`, and
`ScreenBlockInspectorSection.tsx` plus its binding-panel/image-inspector UI gate;
schema and document-op files remain R01-owned. TASK-540-03-L01 solely owns the stable
`ScreenRuntimeRenderer.tsx` facade, its six focused implementation owners, and the
stateless harness/four-suite 72-name renderer family. TASK-540-04-L01 owns the Entries
client harness/three-suite 42-name family. TASK-540-04-L03 owns the stable Entry Editor
wrapper, its eight extracted production modules, the mounted/pure restyle pair, the
Custom Screens client pair/harness, cacheBus three-suite/harness family, and Entry
navigation pair/harness; TASK-540-05-L01 alone owns the final authoring-boundary
enumeration of the complete Entry Editor and Screen Builder graphs. TASK-540-04-L03
historically wrote `screenEntryPresentationOverrideContract.ts`,
`screenEntryPresentationOverrides.ts`, `customScreensClient.ts`, `cacheBus.ts`, and
their split admin families; its completed 2026-07-15 repair additionally owned only additive
direct-image route-boundary assertions in `tests/integration/routes/customScreensRoutes.test.ts`
while every production route byte remains read-only. TASK-540-04-L04 solely owns the
stable `CustomScreenEditorPage.tsx` facade, seven focused implementation owners, the
Page harness/four-suite 36-name family, its route helper and route/binding suites, plus
only the additive cacheBus factory mock in
the recovery suite and the identical additive
`createCacheEventOperationToken: () => Symbol(),` property in
`screen-editor-sections.test.tsx`, while consuming the L03 token names and signatures
byte-identically. TASK-505 recovery assertions and all nine TASK-500 section-suite
tests and all of their assertions, imports, and other mock bytes must remain byte-identical. The workflow's leaf allowlists, targeted commands,
aggregate matrix, and closure hash set must name these exact paths identically.
The earlier import-only L03 attempt was reverted before the first prepared-state pass.
The later final sequential post-audit independently reopened L03 for the substantive
single-versus-multiple media override contract and included canonical import placement
inside that then-current receipt. Historical cache ownership remains separate evidence.
TASK-540-05-L02 additionally owns the exact auth-identity contract/provider/route paths,
the stateless access-log harness, its eight-test Bun suite, and the retained two-test
user-settings route suite, plus the Assistant panel harness and 7+6 suite partition and
`admin-auth-identity.test.tsx`; its reopened correction solely owns
`securitySettings.ts`, `cors.ts`, and `cors.test.ts` for the required-header union and
default/preflight evidence. Its Assistant suite is mechanically projected to the one
required typed fixture property. TASK-540-04-L03 remains the sole writer of
the Entry Editor production modules and leaves their preference-hook call
transport-neutral before L02; L02 consumes those modules byte-identically.
For the historical Assistant fixture correction, TASK-540-01-L01 additionally owns
only the existing
`executeAssistantActionPlan patches custom screen block data` fixture/assertion region
at its pre-split location in `actionExecutorService.test.ts`; the modularity split moves
that complete unchanged test to `actionExecutorCustomScreens.test.ts`. Its canonical fixed-kind
repair may change the selected block kind/ID, `dataPath`, value assertions, and the
independent sibling fixture/assertion needed to prove preservation; shared helpers,
other Assistant cases and production Assistant code remain read-only. The current
identity correction separately owns the strict Screen schema and narrow document-op
builder handoff described above. Closure runs and hashes all twelve Assistant executor
suites/support owners without editing them, and verifies the exact 73-name multiset.
R01 additionally owns the narrow explicit-ID correction in
`core/services/assistant/blueprints/blueprintBindingComposer.ts` and its focused
`tests/vitest/assistant/blueprint-binding-composer.test.ts`; the catalog caller already
provides explicit IDs and remains read-only. R01 also runs the direct dependency gates
`tests/vitest/assistant/action-plan-schema.test.ts` and
`tests/vitest/assistant/catalogBlueprintEngine.test.ts`; closure runs them read-only and
does not re-baseline their existing action-plan/catalog normalization behavior. Those
two read-only consumer tests never enter R01 `allowedFiles`, effective repair ownership,
or closure mutation authority.
The R01 schema/document-op regressions pin segment-safe max-160 structural and binding
paths, canonical max-120 binding IDs, the bounded-readable-prefix plus mandatory
13-character framed-tuple hash on every generated ID, separator/case separation for
short and long tuples, valid explicit-ID preservation, strict write versus
public compatibility-write versus fail-soft stored-read behavior, exact editor/row
references and idempotence, shared factory/duplication IDs, and metadata-only PATCH
document preservation. Stored-read duplicate IDs remain outside the per-item catch and
pin the outer fail-closed empty-editor fallback. The composer suite separately pins
required explicit IDs plus missing/null/blank runtime rejection without a tuple
fallback. Its 12-case V1/V2/V3 migration table independently exercises
overlong binding IDs, block IDs/references, prop paths, and fields while preserving
primary/sibling data. The L02 binding-panel regression pins the Inspector's same
max-120 helper output and blank/over-120 blur/Enter restore to the latest committed
label without a patch. The R03 renderer regression pins the exact visible
`role="status"` text `No tabs available.` and absence of `tablist`, `tab`, and
`tabpanel` for zero tabs.

Assertions must cover exact reject-unknown/round-trip behavior, hostile URL
corpus, recursive children/slot rejection, direct-image UUID→media URL resolution and
cancellation, link-only/legacy disabled compatibility, Tabs minimum/maximum plus keyboard/ARIA/visible
panel behavior, nested interactive Space, promise fail→retry and identity guard,
cacheBus target refresh without dirty overwrite, target A→B immediate stale-row
disappearance before delayed B resolves, both dirty guards, narrow layout,
landmark role, and per-user settings isolation including strict isolated GET/PATCH
response normalization, safe failure/cancellation retry, a delayed prior-user PATCH,
an undispatched queued A write canceled by the auth-identity epoch before B can own
the session, same-mounted-session prune→A→B→A retaining only the latest exact shared-
settled hook-local copy during fresh GET, and a brand-new post-prune remount starting
default/unhydrated with a fresh GET. The L02-owned real HTTP suite freezes the
start-baseline UUID set for access logs carrying its exact unique non-secret User-Agent
marker, then inventories, deletes, and proves absence of every new exact owned access
row emitted by its requests before it removes task sessions/users.
This includes null-user unauthenticated access rows; user/session/actor identity is
correlation evidence, not an ownership filter. Since logging is fire-and-forget, proof
uses bounded exact-marker stable-set and stable-absence polls for the access-log table
after suite traffic stops, leaves baseline/different-marker rows untouched, and fails
when quiescence is not reached. The later closure-owned runtime smoke independently
owns its broader task-User-Agent audit-log baseline/delta/cleanup contract; that smoke
authority is not duplicated in the L02 route-test harness.
The aggregate Button flow must bind, update the existing binding, clear, rebind, save,
and reopen while proving no
empty-field sentinel reaches the persisted definition. The new aggregate file may
compose public production seams and leaf-owned test helpers, but it must not copy
production algorithms or weaken a source-owner assertion.
The R01-owned Assistant regression must construct the native strict-V4 fixture only
from canonical fixed kinds, patch `heading.data.text`, preserve another property on that
heading, and preserve the independent `text.data.content` sibling. It must not make
unsupported Screen `hero`/`rich-text-section` kinds acceptable; similarly named Page or
Widget fixtures outside this exact Custom Screen case remain outside TASK-540.
TASK-540-02-L01 owns `custom-screen-image-inspector.test.tsx`; TASK-540-04-L02 owns
`use-screen-related-entries.test.tsx`; TASK-540-04-L03 owns
`customScreensClient.test.ts` plus `custom-screen-entry-navigation-guard.test.tsx`;
and TASK-540-05-L02 owns
`custom-screen-entry-preferences-persistence.test.tsx`. Each is created and green
before its source gate; closure runs every path read-only. Every source owner updates
behavior expectations before its own gate. Closure adds
cross-leaf cases only in `custom-screen-task-540-flow.test.tsx` and may not defer,
weaken, or re-baseline any source-owner proof.

## Implementation Pseudocode

```text
verify every source owner leaf is landed and its behavior tests plus targeted gate are green
create only tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx for declared
cross-leaf regressions; keep every other named behavior test byte-identical during closure
except the exact settingsService/storageSettings shared-row snapshot/restore repair
run each named lane; on failure rerun the named file once and route real defects
back to the single owning source leaf
when resuming an active no-gate implementation leaf after an interrupted writer, run its
exact gate first: a green gate restores its gated In Progress state without requiring a second source diff; a red
behavior gate enters the scoped fix loop, while infrastructure stops; the special
pre-pending active 540-06-L01 repair below always completes this gate-first path with its
exact deterministic Revalidation value, whether the first gate is green or a scoped fix
is required
run full test/precommit/Admin build-boundary-bundle/release/security gates
restart the Bun server; install the exact-path media GET logger before fixture-driven
browser work; preseed the acquired-media override plus distinct missing bound UUID
through the existing authenticated Admin flow/API without opening Media Library,
MediaPicker, or an entry surface; while still on the builder
prove the naturally cold `media:list` state, then install `media-prior-resolution`
which validates the authoritative HTTP 200 JSON media list plus the exact acquired
TASK-540 row and stages only that verified row for the browser without mutating DB/storage,
before consecutive `records-workspace-navigation` and `first-entry-mount` clicks
execute the seven synthetic builder -> save -> entry flows, save task-540-prefixed
screenshots, and record visible scenario evidence in closeout; for the first media
flow prove one non-forced shared promise/one GET through the two
`assert-media-get-count` receipts, switch the winner with visible
`Clear selected presentation` while the response is held, and reject the stale URL
update only the declared product/cache/API docs
while changelog 1252 is absent, keep every landed source/technical leaf, its child,
the active closure leaf/child, and root In Progress; each landed leaf retains its
behavior gate plus, for an owner in the eight-leaf modularity sequence, exactly one
Modularity Repair Revalidated receipt and no Modularity Repair Pending or Completed
field, while every genuinely unstarted descendant remains To Do
mechanically require the L03-owned entry editor to remain byte-identical during L02,
and restrict L02's Assistant suite to the exact typed UserSettings fixture property
on an ordinary source-owner repair, or any 540-06-L01 repair after a valid
evidence-before-pending anchor or durable Closure Pending exists, invalidate old gate
receipts and persist one exact Repair Pending generation/token; a restart repairs/re-gates
only that owner and restores its gated In Progress state only with a matching fresh
Revalidation receipt while every other gated In Progress leaf remains untouched; an
anchor-backed 540-06-L01 repair additionally binds prior
gate, Repair Pending hash, and exact successor Revalidation in the changelog-index
repairAuthorization before task-state repair mutation
for a verified post-audit or smoke-evidence source finding owned by already-active
540-06-L01 only while the changelog index is still in its canonical reserved/no-anchor
state and Closure Pending does not exist, atomically remove its old gate and write the
same canonical Fix Started ISO date on only 540-06 and 540-06-L01; write no Repair Pending
or repairAuthorization, preserve the root/child/leaf plus task-board snapshot for exact
rollback, then run only its scoped fixer and gate
define preClosureRegateValue(fixStartedDate) to reject a non-canonical YYYY-MM-DD and
otherwise return exactly `pre-closure remediation / fix-started ${fixStartedDate} / gate green`;
require the transition agent to write that precomputed Revalidation Passed value and
verify byte equality, including after restart
after a task-metadata-capable fixer and before its gate, mechanically re-read the exact
repair owner/status tables plus closure receipts after both successful and failed dispatch,
and reject any changed pending token, pre-pending Fix Started marker, or stale gate
use the program-pinned changelog path above (never a new RUN_DATE derivation), discover
exactly zero or one changelog 1252 file, reject duplicates, and reuse that path even when
a failed evidence dispatch temporarily removed the file; create and byte-verify changelog
1252 plus its index row/control anchor first with the exact 20-ID Tasks line; then rerun
the complete full validation against those bytes; only then atomically mark all twelve
leaves, all seven children, and root Done in
descendant-before-parent order while applying the one board-statistics delta; run the mechanical
graph gate; on any later failure create/fsync status.rollback-prepared.json, restore all
21 old targets with the board last, verify/clean that journal, then let ordinary repair
select an evidenced owner and add pending evidence
capture one board baseline, the closure leaf's exact gate field/value, and the fixed
changelog path from the unchanged active graph before the first status mutation; first
bind their strict control manifest plus generation/evidence hash into the independently
evidence-owned changelog-index anchor and hashed changelog block, then persist the identical baseline/path through pending, retry, rollback,
status, terminal restart, and verification without recapturing them from a mutated board/task
on terminal startup, validate that changelog 1252 and its exact 20-ID Tasks line existed
before the atomic transition, then validate all 20 Done contracts, closure-leaf gate receipt, board row
plus its exact persisted statistics baseline, unique changelog-index row, shared closure
receipt, and the single changelog evidence hash; any failure first marker-rolls all 21
status targets to old and cleans the status journal, after which ordinary repair may
rerun the post-audit, full validation, smoke, closure, final drift, and final gate sequence
strict-parse a persisted Closure Pending or terminal Closure Generation, seed the durable
counter from it, and require every later closure attempt to use a greater generation
```

### Orchestrated status flow

Before each implementation/fix pass, a task-only transition agent marks the exact
leaf and its direct child `🚧 In Progress`, keeps the board parent and root
TASK-540 `🚧 In Progress`, and synchronizes the child leaf table plus root
subtask table. Before family changelog 1252 exists, a green targeted gate never writes
`✅ Done` or `Completed`. It leaves that exact implementation leaf and its direct child
`🚧 In Progress`, writes exactly one current byte-pinned `Targeted Gate Passed` or
`Revalidation Passed` field on the leaf, and makes the child table project the same
gated In Progress state. This is completed implementation evidence, not task closure;
no physical TASK-540 contract becomes Done before its own ID appears in the family
changelog. An ordinary source-owner repair, and any
540-06-L01 repair after a valid evidence-before-pending anchor or durable
`Closure Pending` exists, selects only its exact already-In-Progress owner leaf/direct child, removes stale
`Targeted Gate Passed`/`Revalidation Passed` evidence, and persists one
`**Repair Pending:** generation ... / token ...` receipt. A restart
recognizes exactly that non-prefix repair owner among the other gated In Progress
leaves, executes only its implementation/re-gate, and restores its completed-
implementation state only after replacing Repair Pending with the fresh matching
`**Revalidation Passed:**` receipt. An anchor-backed closure-leaf
repair also requires the evidence-owned anchor authorization chain described below. A
task-metadata-capable fixer is followed, before any read-only gate, by a deterministic
re-read that requires the same Repair Pending token, active root/child/leaf statuses and
rows, cleared old gate/Completed fields, and byte-identical closure
pending/evidence/generation/baseline receipts. Other gated siblings never rerun. Selecting
a source repair owner requires the board to be already In Progress and preserves the complete
board byte-identically; only the dedicated closure-pending and closure-status transitions
may move TASK-540 or change the board statistics.

The completed modularity phase was a stricter predecessor to that ordinary status flow.
Each of the eight owners started with exactly one `Modularity Repair Pending` field and
its historical behavior receipt. Each successful post-split gate atomically removed only
that modularity-pending field and wrote one byte-pinned
`Modularity Repair Revalidated` receipt; it did not erase the historical behavior
receipt, add `Completed`, or move status. The restart invariant still accepts either an
exact pending state or an exact revalidated state, never both. All eight revalidated
receipts now exist in the mandatory order, and the family line/name/matrix gates passed,
so TASK-540-06-L01 reached—but did not complete—the closure-preparation frontier at
that historical checkpoint. The corrective source/test commits and exact owner re-gates
are now complete in order R01 → R03 → L03 → L04 → L01. This closure leaf can resume
only after its current workflow recovery, worktree-root/strict-scan, lock-owner, and
uncertain-CAS repairs pass targeted revalidation; the fresh clean post-audit follows
that gate, then full validation, one canonical smoke containing the embedded diagnostic
sub-proof, smoke-evidence audit, changelog 1252/control preparation, the complete
full-validation rerun, child-first atomic family closure, and final
closure-drift/mechanical gate follow in order.

The verified pre-run Start-gate repair made that then-prepared resume executable. Its
structural Markdown status-table reader selects only a table with one unique leading
`ID` column and one unique trailing `Status` column, so same-ID historical evidence
tables remain byte-identical instead of colliding with status authority. Resume
validation, unrelated-byte projection, and exact rollback use the same reader; all 18
selection/mutation cases and the then-current prepared-resume gate passed. This is
historical workflow-authority evidence only. The current corrective commits and exact
R01 → R03 → L03 → L04 → L01 owner re-gates/receipts are complete; closure work resumes
only after the current closure-workflow repair and targeted gate, followed by the
subsequent clean five-lens post-audit.

During an earlier source-owner `Repair Pending`, every landed sibling remains
`🚧 In Progress`; each completed implementation sibling retains exactly one current
gate receipt and no `Completed` field. Before the closure leaf's own gate,
TASK-540-06-L01 remains deliberately ungated and has neither `Targeted Gate Passed` nor
`Revalidation Passed`. After all twelve leaves land, an exact reserved/no-anchor
pre-closure continuation may instead preserve TASK-540-06-L01's deterministic
`Revalidation Passed` while a non-closure source owner is selected for repair. That exception
requires matching canonical child/leaf `Fix Started`, the exact
`preClosureRegateValue`, no changelog 1252 draft, no control anchor, no closure receipt,
one non-closure Repair Pending owner, and exactly that owner as the sole remaining leaf;
the independently resolved changelog mode must be
`reserved-pre-closure-regated-source-repair`. A closure-owner repair, Targeted Gate,
wrong date/value, extra remaining leaf, anchor, draft, or Closure Pending fails closed.
Never fabricate closure or source gate evidence to satisfy a restart projection.
`_docs/_workflows/task-540-implement.mjs` owns this invariant and its hermetic
`--self-test-repair-siblings` cases cover both accepted phases and the rejection matrix.

The sole pre-pending exception is a verified post-audit or smoke-evidence source finding
owned by `540-06-L01` while that closure leaf, its child, and TASK-540 are already active,
the changelog index is still the canonical reserved state with no TASK-540 control anchor,
and no durable `Closure Pending` exists. One task-only transaction removes the closure
leaf's old gate and writes one identical canonical `Fix Started` ISO date on only
TASK-540-06 and TASK-540-06-L01. It writes neither `Repair Pending` nor
`repairAuthorization`, and it captures the exact root/child/leaf plus task-board bytes so
any mutation or verification failure restores the whole task-and-board transaction. The
scoped owner fixer and exact leaf gate then run. Whether the gate-first restart is green
immediately or becomes green after that fixer, the status transition writes the exact
precomputed `preClosureRegateValue(persistedFixStartedDate)` value
`pre-closure remediation / fix-started ${persistedFixStartedDate} / gate green` into
`Revalidation Passed` and verifies byte equality. The helper rejects a non-canonical
YYYY-MM-DD. This marker is recovery state only: it is not closure authority and cannot
satisfy pending or terminal closure validation.
These transition agents may edit only the root TASK-540 file, the exact child, and
the exact leaf; they never edit source, tests, board, changelog, or another task
family. Unstarted leaves stay canonically `⏳ To Do`; the currently executing leaf and
every landed/gated leaf/direct child stay `🚧 In Progress`; no TASK-540 descendant
receives `✅ Done` or `Completed` while changelog 1252 is absent.
The board parent remains In Progress and its statistics stay byte-identical until
final family closure.

At closure, all twelve implementation leaves, all seven direct children, and root remain
In Progress; each landed leaf has its required current behavior/modularity receipts and
no `Modularity Repair Pending` or `Completed`,
and no unlanded descendant may be promoted from To Do. The workflow uses only the fixed `Changelog File` path above, discovers exactly
zero or one `1252-*.md`, rejects duplicates, and persists that same safe repo-relative
path on the root, TASK-540-06, and TASK-540-06-L01. Before any status-owner mutation,
the orchestrator pins the unchanged active board baseline, exact closure-leaf gate
field/value, path, and positive generation. The evidence owner creates/updates changelog
1252 and one strict canonical HTML-comment JSON anchor in the existing changelog index:

```json
{
  "schemaVersion": 1,
  "evidenceSha256": "64-lowercase-hex",
  "closureControl": {
    "schemaVersion": 1,
    "generation": 1,
    "boardBaseline": "toDo 0 / inProgress 0 / done 0",
    "changelogPath": "_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md",
    "gateReceipt": {
      "field": "Targeted Gate Passed",
      "valueSha256": "64-lowercase-hex"
    },
    "collaborationLedger": {
      "preClosureCount": 1,
      "preClosureSha256": "64-lowercase-hex",
      "terminalCount": null,
      "terminalSha256": null
    }
  },
  "collaborationLedgerPrefix": [
    {
      "accessClass": "read-only",
      "claim": {
        "claimOwner": "operator",
        "claimSha256": "64-lowercase-hex"
      },
      "contenders": [
        {
          "ackSha256": "64-lowercase-hex",
          "contenderKind": "response",
          "startSha256": "64-lowercase-hex"
        }
      ],
      "dispatch": {
        "agentResultSha256": "64-lowercase-hex",
        "agentStateAtFinalList": "not_applicable",
        "agentStateAtFirstList": "not_applicable",
        "dispatchStatus": "spawned",
        "forkTurns": "none",
        "interruptAttempted": false,
        "interruptPreviousState": "not_applicable",
        "procedureSha256": "64-lowercase-hex",
        "spawned": true,
        "statusSha256": "64-lowercase-hex",
        "transcriptCorrelationSha256": "64-lowercase-hex"
      },
      "disposition": "accepted",
      "request": {
        "deadlineMonotonicNs": "1",
        "requestIdSha256": "64-lowercase-hex",
        "requestSha256": "64-lowercase-hex",
        "runIdSha256": "64-lowercase-hex",
        "sequence": 1,
        "worktreeSha256": "64-lowercase-hex"
      },
      "settlement": {
        "agentResultSha256": "64-lowercase-hex",
        "decisionMonotonicNs": "1",
        "error": null,
        "settlementSha256": "64-lowercase-hex",
        "startSha256": "64-lowercase-hex",
        "status": "response"
      },
      "ledgerEntrySha256": "64-lowercase-hex"
    }
  ],
  "terminalCollaborationReceipt": null,
  "repairAuthorization": null
}
```

The independent changelog-index anchor and changelog evidence block both embed the exact
same `closureControl`, exact `collaborationLedgerPrefix` array containing only the safe
immutable ledger-entry envelopes, and exact `terminalCollaborationReceipt`. Before
status closure, the prefix's canonical count/hash equal
`preClosureCount`/`preClosureSha256`, both terminal fields and the terminal receipt are
null, and the evidence block's whole byte hash equals `evidenceSha256`. The real
counters/hash replace the illustrative values. Unknown/missing keys, an unsafe/different
path, non-positive generation or `preClosureCount`, unsupported gate field, non-64-hex
digest, terminal fields present early, or any anchor/evidence ledger-prefix mismatch
fail closed. The independently embedded index prefix is the sole regeneration authority
when changelog 1252 is missing; a digest without that byte-identical safe prefix is
insufficient. The orchestrator byte-verifies and hashes the whole block
before the status owner writes identical `Closure Pending`, `Closure Board Baseline`,
and `Closure Changelog Path` receipts on the three active closure contracts. Complete
full validation then runs before final family status mutation. The evidence owner must first
create and byte-verify changelog 1252, its unique index row/control anchor, and the exact
20-ID `Tasks:` line below while all 20 task files and the board remain In Progress.
For unrelated-byte protection, the changelog-index projection owns only the unique
canonical TASK-540 reserved sentence or, after evidence creation, the adjacent canonical
consumed sentence plus remaining 1251/1254/1257 reservation sentence. Independent
following reservations—including the pinned 1260/1261 mapping for TASK-547/TASK-548—
must remain byte-identical outside that slot. A duplicate marker, malformed pair,
independent sentence interposed inside the consumed pair, or contradictory escaped
1252/1251/1254/1257 prose fails closed. Hermetic reserved and consumed fixtures must
prove both preservation and those rejection paths.
Only after that durable changelog coverage exists may one status transaction prepare
the twelve leaf changes, then the seven child changes, then root TASK-540, and atomically
publish all 20 `✅ Done`/`Completed` transitions together with the single deterministic
board row/statistics delta. There is no durable intermediate state in which a leaf or
child is Done without changelog coverage. Exactly one final agent-backed closure-drift
pass runs now and appends its lenses' procedure entries; any finding first
creates/fsyncs the status rollback
marker and restores/verifies/cleans the complete 21-target old generation, board last.
Only then may the ordinary repair path select the evidenced owner and add pending
evidence.
After that pass's last clean drift result, the host permanently closes agent dispatch
for this generation. The root first recomputes every actual transcript correlation;
then the host canonicalizes the full embedded base plus current ledger and builds exact
`terminalCollaborationReceipt`
`{count,preClosureCount,preClosureSha256,schemaVersion:1,sha256}` from the exact
`terminal-ledger` preimage pinned above. Its count/hash must equal
`closureControl.collaborationLedger.terminalCount/terminalSha256`.

Before deleting any run-ledger byte, the exact prepared, fsynced, index-anchor-last
recovery-journal transaction above updates the changelog-index anchor, changelog
evidence block, and the root/closure-child/closure-leaf
`Closure Evidence SHA-256` receipts. It replaces
`collaborationLedgerPrefix` with the complete safe projection, sets
`closureControl.collaborationLedger.terminalCount/terminalSha256`, embeds the exact
terminal receipt, recomputes `evidenceSha256`, and byte-verifies all five files. It must
not change generation, pre-closure fields, gate receipt, statuses, Completed dates,
board row/statistics, changelog Tasks line, or unrelated bytes. No agent call is legal
after this terminal-ledger freeze. A caught failure durably selects the
rollback-prepared path above; process-death recovery follows the index/marker truth
table. Only after all five terminal targets and all 21 status targets verify at their
old generation may it identity-clean the failed ledger and both journals, return to the
ordinary repair workflow, and propagate the sanitized failure. An ambiguous/failed
rollback retains both journals, the ledger, and every remaining target byte and fails
closed. A committed terminal state instead retains those authorities until its
remaining checks pass.

A final local mechanical graph/evidence/diff gate then validates the persisted complete
ledger/terminal receipt and every ordinary closure invariant. The root final reviewer
recomputes each actual task/result correlation before accepting that gate; only then may
the host clean the current ledger directory. Each terminal leaf retains its own gate
evidence, while the final three closure
contracts carry the family evidence hash/generation; a missing/open descendant or
pre-changelog Done state fails. Any later exception uses the exact terminal rollback
plus full 21-target status rollback above before propagating; no descendant from that
failed closure generation remains Done. The subsequent ordinary repair workflow may
then select its verified owner chain and record fresh repair evidence; it does not
alter the journaled all-old status generation during rollback.

Changelog 1252 must contain exactly one task metadata line, byte-identical to this
complete, unique, deterministically ordered family set:

```text
Tasks: TASK-540, TASK-540-01, TASK-540-01-L01, TASK-540-02, TASK-540-02-L01, TASK-540-03, TASK-540-03-L01, TASK-540-04, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06, TASK-540-06-L01, TASK-540-07, TASK-540-07-L01, TASK-540-07-L02
```

A process restart from a terminal-looking graph is not accepted on status alone. It
first requires all 20 contracts plus the board Done, identical valid evidence
hash/generation/baseline/path fields on exactly the root and closure child/leaf, no closure-only
receipt on a source descendant, exactly one byte-pinned Targeted Gate Passed or
Revalidation Passed field/value on the closure leaf, exactly one four-cell TASK-540 row
in the 1252 changelog index with filename-matching date/title/type, consumed reservation
prose, and exactly one valid canonical TASK-540 control anchor. When the changelog exists,
its canonical evidence block must hash to both the task receipt and anchor; when it is
missing/malformed, the valid independent anchor can verify journal recovery but cannot
authorize post-status task mutation or changelog regeneration. The anchor's strict
evidence-owner `closureControl` must independently match the task generation, pinned
baseline, pinned path, SHA-256 of the exact closure-leaf gate value, and the immutable
pre-closure and terminal collaboration-ledger count/hash fields. Its independently
embedded complete safe prefix must recompute both pairs and its non-null exact terminal
receipt. A restart
without that exact retained complete prefix/receipt cannot trust the control and fails
closed; coherent edits to the status-owner task files plus board therefore cannot become
trusted after a process restart. The three closure
contracts also carry one identical `Closure Board Baseline` captured once while TASK-540
is In Progress; terminal validation requires current statistics to equal that pinned
baseline with In Progress -1 and Done +1. It is never recalculated from the board after
the first closure transition. A fully committed and verified terminal generation is
accepted without status mutation. Any restart state that requires another post-audit,
validation, smoke, or evidence write enters the universal terminal-plus-status rollback:
create/fsync `status.rollback-prepared.json`, restore the five terminal targets with the
changelog index last, then restore all 21 status targets from the still-prepared status
journal with the board last. Only after complete all-old verification and journal
cleanup may a fresh ordinary repair invocation run. A malformed/mismatched terminal
graph fails closed.
`Closure Pending` is strict `generation <positive-safe-integer> / <12-lower-hex-token>`;
startup seeds the in-memory counter from that receipt or the shared terminal
`Closure Generation`, so the next `runClosure` generation is strictly greater even
across a new UTC date or process.

A restart before `Closure Pending` accepts the special active 540-06-L01 repair only
from the canonical reserved/no-anchor state and only when TASK-540-06 and
TASK-540-06-L01 carry the same canonical `Fix Started` date, the date is less than or
equal to the current UTC run date, neither contract is completed, and the leaf has
neither `Repair Pending` nor a stale gate. It runs the exact gate first;
both an immediately green gate and a gate made green by the scoped fixer must write the
same byte-identical `preClosureRegateValue(persistedFixStartedDate)` receipt. That narrow
recovery acceptance forces a fresh post-audit, full validation, live smoke,
smoke-evidence audit, and fresh evidence/control write before any `Closure Pending` is
created. The persisted prior-day Fix Started date is retained across UTC rollover;
startup never replaces it with the new run date. Neither the ungated nor regated recovery
marker authorizes pending or terminal closure. This closure-owner recovery is distinct
from the exact non-closure source-repair sibling state above: the latter preserves the
already-regated closure leaf and is authorized only by the reserved/no-anchor changelog
mode's independent byte match. If a valid evidence-before-pending anchor
already exists, startup rejects a task-only ungated marker or forged Revalidation and uses
the ordinary exact Repair Pending plus anchor `repairAuthorization` prior/successor hash
chain instead; normal `runClosure` later replaces that repair authorization with fresh
control and `repairAuthorization:null`.

`Repair Pending` is independently strict
`generation <32-lower-hex> / token <32-lower-hex>`; every active repair root, child,
owner leaf, and active closure sibling must have no `Completed` receipt. Duplicate or
malformed repair/status/table receipts fail before dispatch.
For a closure-leaf repair after a valid evidence-before-pending anchor or durable
`Closure Pending` exists, the evidence owner stores one exact
`repairAuthorization` in the index anchor. It binds the SHA-256 of Repair Pending, the
prior gate field/value hash already held by `closureControl`, and the exact successor
Revalidation field/value hash. A missing-gate pending restart or successor gate mismatch
is accepted only through that exact chain; matching a receipt regex alone is never
authority. Normal reclosure replaces the anchor with `repairAuthorization:null`.

## Post-audit

After source owners, tests, and docs are final—but before live smoke—run exactly five
fresh read-only lenses, in the following fixed order, over implementation fidelity plus
runtime-smoke feasibility:

1. fixed-kind schema/legacy-read/URL-policy and present-only round-trip fidelity;
2. Tabs identity, scoped DOM IDs, interaction semantics, and accessibility;
3. dirty guards, promise retry/cancellation, cache subscriptions, and no dirty overwrite;
4. authenticated-user preference isolation and narrow-canvas/ARIA geometry;
5. test integrity, docs/cache maps, task/changelog graph, and whether the declared
   runtime scenarios/receipts/cleanup remain executable against the final source.

Every finding needs `file:line` evidence and every expected lens result must be present.
Dispatch these lenses strictly sequentially. A transport, schema, or agent failure stops
before any later lens is launched; it has no same-invocation retry, so no sibling agent
process can outlive the failed audit boundary.
Every accepted finding is projected with its fixed lens ID in lens/result order. If any
accepted finding belongs to the orchestrator, the workflow stops before every fixer and
returns one parseable sensitivity-rechecked diagnostic containing the complete mixed
finding set; only rejected/schema-invalid or unsafe projections use a generic discarded
marker. A non-clean second round uses the same complete ordered diagnostic for
orchestrator, mixed, or leaf-only residual findings before the invocation stops.
This task applies the repository's stricter no-unresolved-drift closure rule: every
verified HIGH, MEDIUM, or LOW finding blocks this closure unless it is explicitly split
into a non-blocking follow-up with rationale. Fix every retained finding in its sole
source-owning leaf, rerun the affected gates, then execute a fresh reconcile before
smoke. This pass cannot claim runtime evidence:
the separate smoke-evidence audit runs only after the real helper/browser flows and
inspects their receipts plus PNGs. A missing result is not a pass. When that sole owner is
540-06-L01, only canonical reserved/no-anchor state uses the pre-pending Fix Started plus
deterministic Revalidation path; once a valid evidence anchor exists, the same finding
uses exact Repair Pending and the anchor repair-authorization chain.

Final closure drift has at most two fresh rounds and is remedial, not throw-only.
Its audit lenses use the same strict sequential dispatch and fail-stop/no-retry boundary
as the pre-smoke post-audit.
Any non-clean round first creates/fsyncs `status.rollback-prepared.json` and restores
the complete 21-target old generation from the still-prepared status journal, with the
board last. Every armed/request-capable bridge helper must already be absent before
request cleanup. Only after all old bytes/modes/hashes are verified and the status
journal is deterministically cleaned may the ordinary repair path name the verified
source owner, fix only its owned files, persist its pending evidence, re-gate to a
matching fresh Revalidation, and run full validation. All 20 task contracts remain in
their journaled old In Progress generation until a later complete status transaction;
the current invocation stops after repair validation.
A later fresh top-level run may execute its one smoke plus evidence audit and refresh the
changelog evidence block before re-closing; the repairing invocation never executes a
second smoke. Runtime/evidence-only findings are
owned by the executor boundary: the current invocation completes deterministic cleanup,
emits at most the exact post-cleanup allowlisted action-ID line, returns the unchanged
fixed sanitized failure, and stops. After a verified contract fix and
fresh clean-baseline proof, a later top-level closure run may invoke the executor once;
the failed call itself has no retry, recovery, or second smoke attempt and findings are
never routed to TASK-540-06 tests/docs. Closure/task/changelog-only findings use
an orchestrator metadata fixer, validation, canonical evidence verification, and a
fresh final audit. Only a residual from the second fresh round blocks closure.

### 2026-07-15 smoke-contract correction and failed-attempt audit

Two browser-reaching attempts were fail-closed and are diagnostic evidence only; neither is a
smoke pass. Attempt 1 (`wf540-62a9e9a41951`) reached the media flow, but its delayed
`route.fetch()` reused the browser hostname, which the Playwright Node route worker
could not resolve (`ENOTFOUND coderso-a.localhost`). Attempt 2
(`wf540-5ad40b32fe79`) used the loopback backing origin, but an earlier entry/media
consumer had already warmed the shared media-list seam before interception, so the
sole `media-prior-resolution` setup observed hit count `0`. The second attempt stopped
at that missing hit instead of adding a probe, cache event, or forced retry.

Both attempts completed their terminal browser cleanup and exact fixture cleanup.
Their task-owned rows, media row/storage object, overrides, settings, synthetic
sessions/users, and acquired access-log rows were proven absent; the `wf540smoke`
session, owned host-runner/descendant PIDs, and listeners on `3000`, `5173`, and `5174`
were also proven absent. No screenshot or partial assertion from either attempt may
be promoted into canonical smoke evidence. The correction below makes the first
media request observable before any entry or media consumer can warm it and changes
only the backing origin used by `route.fetch`, not the application request semantics.
A fresh read-only cleanup-contract audit found that those attempts had not treated
`audit_logs.metadata.userAgent` as a cleanup authority; an exact eight-User-Agent query
against the current local DB returned no matching audit rows, but that diagnostic is
not smoke evidence. The corrected contract still adds independent audit-log
baseline/delta/cleanup so future attempts cannot rely on incidental absence.
A same-date round-1 contract audit then made the open/logger metadata, consecutive
cold→setup→workspace→entry→hit receipts, exact route commands, and before/after GET
count receipts mechanically binding. This task-file correction is not runtime evidence
and does not claim a new smoke attempt or pass.
A same-date round-2 audit additionally bound the typed media-race fixture/absence
receipts, closure-backed instrumentation, exact visible-effect commands/outputs, and
the two source-labelled real retries. It likewise records contract correction only,
not a third browser-reaching attempt or smoke pass.
A same-date round-3 audit found that agent-returned command receipts, lexical
observation-token checks, page-local logging, and hit-count-only delay latches were not
independent execution evidence. The contract below therefore makes the local workflow
process the sole execution/evidence authority, replaces free-form browser commands with
positive registries and fixture-expanded builders, instruments every BrowserContext
page, and binds every delayed result to response capture plus fulfillment/UI settlement.
This is another contract-only correction: those two failed attempts remain the only
browser-reaching attempts, and their screenshots or partial observations remain ineligible.
A later one-shot executor call consumed its call latch but failed during the storage/setup
preflight before helper or browser launch; it is the separately recorded preflight-only call
above, produced no runtime screenshot evidence, and is not a third browser-reaching attempt.

### 2026-07-18 ambient-media isolation correction

A later finite, redacted runtime diagnostic classified the remaining aggregate console
failure as a missing media-delivery response. Local DB/storage comparison then proved that
the acquired TASK-540 PNG had both its exact row and storage object, while unrelated
pre-existing media rows referenced absent storage objects. Those ambient rows are not owned
by this task and must not be deleted, consumed, or accepted as task evidence. The corrected
route therefore validates the real backing list and exact acquired row, then exposes only a
one-row copy of that verified fixture to the browser cache. This is a contract correction,
not a smoke pass; a fresh canonical smoke remains required.

### Private deterministic fixture blueprint

`_docs/_workflows/task-540-smoke-contract.mjs` owns the following reject-unknown
`SMOKE_FIXTURE_BLUEPRINT` in its deep-frozen plan. It is the sole source for fixture
expansion; an integration test may import a frozen non-secret projection only to prove
shape/set equality and cannot substitute mocked fixture IDs, browser actions, storage
observations, or UI assertions for the real smoke. The object is validated before the
helper starts and again after every server-generated capture. Missing, extra, duplicate,
or rebound keys fail closed.

```ts
type CaptureRef = Readonly<{ capture: CaptureName }>;
type RuntimeBlockRef = Readonly<{
  captureNewBlock: string;
  expectedType: "button" | "image" | "field" | "tabs" | "text";
}>;
type PathTemplate = Readonly<{ template: string; captures: readonly string[] }>;

const PREFIX = `wf540-${NONCE}` as const;
const capture = (name: CaptureName): CaptureRef => Object.freeze({ capture: name });
const runtimeBlock = (
  name: string,
  expectedType: RuntimeBlockRef["expectedType"]
): RuntimeBlockRef => Object.freeze({ captureNewBlock: name, expectedType });

const SMOKE_FIXTURE_BLUEPRINT = deepFreezeExact({
  schemaVersion: 1,
  fixturePrefix: PREFIX,
  origins: {
    admin: "http://coderso-a.localhost:5173",
    front: "http://coderso-a.localhost:3000",
    routeBacking: "http://127.0.0.1:5173",
  },
  userAgents: {
    browser: `${PREFIX}-browser`,
    publicPreflight: `${PREFIX}-public-preflight`,
    apiBootstrap: `${PREFIX}-api-bootstrap`,
    apiUserA: `${PREFIX}-api-user-a`,
  },
  paths: {
    login: "/admin/login",
    screens: "/admin/advanced/custom-screens",
    builder: { template: "/admin/advanced/custom-screens/{screen.id}", captures: ["screen.id"] },
    records: {
      template: "/admin/advanced/custom-screens/{screen.id}/entries",
      captures: ["screen.id"],
    },
    entry: {
      template: "/admin/advanced/custom-screens/{screen.id}/entries/{entry.id}",
      captures: ["screen.id", "entry.id"],
    },
    retryEntry: {
      template: "/admin/advanced/custom-screens/{retry-screen.id}/entries/{entry.id}",
      captures: ["retry-screen.id", "entry.id"],
    },
    relatedEntryA1Editor: {
      template: `/admin/advanced/entries/${PREFIX}-related-a/{related-entry-a1.id}`,
      captures: ["related-entry-a1.id"],
    },
    safeFront: `http://coderso-a.localhost:3000/#${PREFIX}-safe`,
    nestedHash: `#${PREFIX}-nested`,
  },
  users: {
    bootstrap: { emailEnv: "ADMIN_EMAIL", passwordEnv: "ADMIN_PASSWORD" },
    a: {
      id: capture("user-a.id"),
      email: `wf540-a-${NONCE}@example.test`,
      displayName: `WF540 User A ${NONCE}`,
      passwordEnv: "ADMIN_PASSWORD",
      role: "Admin",
      preferenceBaseline: false,
      theme: "light",
    },
    b: {
      id: capture("user-b.id"),
      email: `wf540-b-${NONCE}@example.test`,
      displayName: `WF540 User B ${NONCE}`,
      passwordEnv: "ADMIN_PASSWORD",
      role: "Admin",
      preferenceBaseline: false,
      theme: "dark",
    },
  },
  contentTypes: {
    editable: {
      id: capture("content-type-editable.id"),
      name: `${PREFIX} Records`,
      slug: `${PREFIX}-records`,
      fields: [
        { id: "field-primaryUrl", name: "primaryUrl", label: "Primary URL", type: "text" },
        { id: "field-secondaryUrl", name: "secondaryUrl", label: "Secondary URL", type: "text" },
        { id: "field-headline", name: "headline", label: "Headline", type: "text" },
        { id: "field-raceImageId", name: "raceImageId", label: "Race image ID", type: "text" },
        {
          id: "field-mediaAsset",
          name: "mediaAsset",
          label: "Media asset",
          type: "media",
          media: { multiple: false, accept: ["image/*"] },
        },
        {
          id: "field-relationA",
          name: "relationA",
          label: "Related A",
          type: "relation",
          relation: { target: `${PREFIX}-related-a`, multiple: true },
        },
        {
          id: "field-relationB",
          name: "relationB",
          label: "Related B",
          type: "relation",
          relation: { target: `${PREFIX}-related-b`, multiple: true },
        },
        {
          id: "field-relationFailure",
          name: "relationFailure",
          label: "Related failure fixture",
          type: "relation",
          relation: { target: `${PREFIX}-related-failure`, multiple: true },
        },
        { id: "field-unrelatedNote", name: "unrelatedNote", label: "Unrelated note", type: "text" },
      ],
    },
    relatedA: {
      id: capture("content-type-related-a.id"),
      name: `${PREFIX} Related A`,
      slug: `${PREFIX}-related-a`,
      fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
    },
    relatedB: {
      id: capture("content-type-related-b.id"),
      name: `${PREFIX} Related B`,
      slug: `${PREFIX}-related-b`,
      fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
    },
    relatedFailure: {
      id: capture("content-type-related-failure.id"),
      name: `${PREFIX} Related failure`,
      slug: `${PREFIX}-related-failure`,
      fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
    },
  },
  relatedEntries: {
    a1: {
      id: capture("related-entry-a1.id"),
      title: `${PREFIX} Related A One`,
      slug: `${PREFIX}-related-a-one`,
      updatedTitle: `${PREFIX}-related-a-updated`,
      data: { label: "A-one" },
    },
    a2: {
      id: capture("related-entry-a2.id"),
      title: `${PREFIX} Related A Two`,
      slug: `${PREFIX}-related-a-two`,
      data: { label: "A-two" },
    },
    b1: {
      id: capture("related-entry-b1.id"),
      title: `${PREFIX} Related B One`,
      slug: `${PREFIX}-related-b-one`,
      data: { label: "B-one" },
    },
    b2: {
      id: capture("related-entry-b2.id"),
      title: `${PREFIX} Related B Two`,
      slug: `${PREFIX}-related-b-two`,
      data: { label: "B-two" },
    },
    failure1: {
      id: capture("related-entry-failure1.id"),
      title: `${PREFIX} Related failure One`,
      slug: `${PREFIX}-related-failure-one`,
      data: { label: "failure-one" },
    },
  },
  media: {
    id: capture("media.id"),
    title: `${PREFIX} Safe image`,
    originalName: `${PREFIX}-safe.png`,
    mimeType: "image/png",
    uploadFixture: {
      encoding: "base64",
      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      decodedSizeBytes: 68,
      sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
    },
    resolvedUrl: capture("media.resolved-url"),
    storageKey: capture("media.storage-key"),
    missingBoundMediaId: "54000000-0000-4000-8000-000000000001",
  },
  entry: {
    id: capture("entry.id"),
    title: `${PREFIX} Editable entry`,
    slug: `${PREFIX}-editable-entry`,
    baseline: {
      primaryUrl: `http://coderso-a.localhost:3000/#${PREFIX}-safe`,
      secondaryUrl: "javascript:alert(1)",
      headline: `${PREFIX} headline baseline`,
      raceImageId: "54000000-0000-4000-8000-000000000001",
      mediaAsset: capture("media.id"),
      relationA: [capture("related-entry-a1.id"), capture("related-entry-a2.id")],
      relationB: [],
      relationFailure: [capture("related-entry-failure1.id")],
      unrelatedNote: `${PREFIX} unrelated baseline`,
    },
    contentDraft: `${PREFIX} headline dirty draft`,
    presentationDraft: { tone: "muted" },
    relatedUnrelatedDraft: `${PREFIX} unrelated relation-race draft`,
    spacePhrase: "Alpha beta gamma delta",
  },
  screen: {
    id: capture("screen.id"),
    name: `${PREFIX} Entry screen`,
    status: "active",
    showInSidebar: true,
    sidebarLabel: `${PREFIX} Records`,
    mode: "editor-view",
    contentTypeId: capture("content-type-editable.id"),
    blockIds: {
      raceImage: `${PREFIX}-race-image`,
      mediaField: `${PREFIX}-media-field`,
      headlineField: `${PREFIX}-headline-field`,
      relationAField: `${PREFIX}-relation-a-field`,
      relationBField: `${PREFIX}-relation-b-field`,
      readOnlyField: `${PREFIX}-read-only-field`,
      relatedListA: `${PREFIX}-related-list-a`,
      relatedListB: `${PREFIX}-related-list-b`,
      spaceGroup: `${PREFIX}-space-group`,
      spaceNoteField: `${PREFIX}-space-note-field`,
      spaceLink: `${PREFIX}-space-link`,
    },
    definitionTemplate: {
      schemaVersion: 4,
      listView: {
        materializerId: "buildDefaultListViewDefinition",
        privateProjectionAuthorityId: "editable-content-type-detail",
      },
      editorView: {
        saveMode: "entry",
        interactionMode: "inline",
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: `${PREFIX}-section-main`,
              type: "section",
              data: {},
              blocks: [
                {
                  id: `${PREFIX}-race-image`,
                  type: "image",
                  data: { label: `${PREFIX} race image` },
                },
                {
                  id: `${PREFIX}-media-field`,
                  type: "field",
                  data: { field: "mediaAsset", label: "Media asset" },
                },
                {
                  id: `${PREFIX}-headline-field`,
                  type: "field",
                  data: { field: "headline", label: "Headline" },
                },
                {
                  id: `${PREFIX}-relation-a-field`,
                  type: "field",
                  data: { field: "relationA", label: "Related A" },
                },
                {
                  id: `${PREFIX}-relation-b-field`,
                  type: "field",
                  data: { field: "relationB", label: "Related B" },
                },
                {
                  id: `${PREFIX}-related-list-a`,
                  type: "related-list",
                  data: {
                    label: "Related A",
                    target: `${PREFIX}-related-a`,
                    displayField: "title",
                    variant: "cards",
                    limit: 10,
                    field: "relationA",
                  },
                },
                {
                  id: `${PREFIX}-related-list-b`,
                  type: "related-list",
                  data: {
                    label: "Related B",
                    target: `${PREFIX}-related-b`,
                    displayField: "title",
                    variant: "cards",
                    limit: 10,
                    field: "relationB",
                  },
                },
                {
                  id: `${PREFIX}-read-only-field`,
                  type: "field",
                  data: { field: "primaryUrl", label: "Read-only URL" },
                },
                {
                  id: `${PREFIX}-space-group`,
                  type: "field-group",
                  data: { title: "Nested controls", description: "" },
                  slots: {
                    content: [
                      {
                        id: `${PREFIX}-space-note-field`,
                        type: "field",
                        data: { field: "unrelatedNote", label: "Unrelated note" },
                      },
                      {
                        id: `${PREFIX}-space-link`,
                        type: "button",
                        data: {
                          label: "Nested destination",
                          action: "link",
                          href: `#${PREFIX}-nested`,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        bindings: [
          {
            id: `${PREFIX}-bind-race-image`,
            blockId: `${PREFIX}-race-image`,
            propPath: "src",
            source: "entry",
            field: "raceImageId",
            mode: "read",
          },
          {
            id: `${PREFIX}-bind-media-field`,
            blockId: `${PREFIX}-media-field`,
            propPath: "value",
            source: "entry",
            field: "mediaAsset",
            mode: "readwrite",
          },
          {
            id: `${PREFIX}-bind-headline`,
            blockId: `${PREFIX}-headline-field`,
            propPath: "value",
            source: "entry",
            field: "headline",
            mode: "readwrite",
          },
          {
            id: `${PREFIX}-bind-relation-a-field`,
            blockId: `${PREFIX}-relation-a-field`,
            propPath: "value",
            source: "entry",
            field: "relationA",
            mode: "readwrite",
          },
          {
            id: `${PREFIX}-bind-relation-b-field`,
            blockId: `${PREFIX}-relation-b-field`,
            propPath: "value",
            source: "entry",
            field: "relationB",
            mode: "readwrite",
          },
          {
            id: `${PREFIX}-bind-related-a`,
            blockId: `${PREFIX}-related-list-a`,
            propPath: "items",
            source: "entry",
            field: "relationA",
            mode: "read",
          },
          {
            id: `${PREFIX}-bind-related-b`,
            blockId: `${PREFIX}-related-list-b`,
            propPath: "items",
            source: "entry",
            field: "relationB",
            mode: "read",
          },
          {
            id: `${PREFIX}-bind-read-only`,
            blockId: `${PREFIX}-read-only-field`,
            propPath: "value",
            source: "entry",
            field: "primaryUrl",
            mode: "read",
          },
          {
            id: `${PREFIX}-bind-space-note`,
            blockId: `${PREFIX}-space-note-field`,
            propPath: "value",
            source: "entry",
            field: "unrelatedNote",
            mode: "readwrite",
          },
        ],
      },
    },
  },
  retryScreen: {
    id: capture("retry-screen.id"),
    name: `${PREFIX} Retry screen`,
    status: "active",
    showInSidebar: true,
    sidebarLabel: `${PREFIX} Retry records`,
    contentTypeId: capture("content-type-editable.id"),
    relatedListBlockId: `${PREFIX}-retry-related-list-failure`,
    definitionTemplate: {
      schemaVersion: 4,
      listView: {
        materializerId: "buildDefaultListViewDefinition",
        privateProjectionAuthorityId: "editable-content-type-detail",
      },
      editorView: {
        saveMode: "entry",
        interactionMode: "inline",
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: `${PREFIX}-retry-section`,
              type: "section",
              data: {},
              blocks: [
                {
                  id: `${PREFIX}-retry-related-list-failure`,
                  type: "related-list",
                  data: {
                    label: "Related failure retry",
                    target: `${PREFIX}-related-failure`,
                    displayField: "title",
                    variant: "cards",
                    limit: 10,
                    field: "relationFailure",
                  },
                },
              ],
            },
          ],
        },
        bindings: [
          {
            id: `${PREFIX}-retry-bind-related-failure`,
            blockId: `${PREFIX}-retry-related-list-failure`,
            propPath: "items",
            source: "entry",
            field: "relationFailure",
            mode: "read",
          },
        ],
      },
    },
  },
  paletteBlocks: {
    button: runtimeBlock("palette.button", "button"),
    image: runtimeBlock("palette.image", "image"),
    mediaField: runtimeBlock("palette.media-field", "field"),
    outerTabs: runtimeBlock("palette.outer-tabs", "tabs"),
    tabOneText: runtimeBlock("palette.tab-one-text", "text"),
    tabTwoText: runtimeBlock("palette.tab-two-text", "text"),
    tabThreeText: runtimeBlock("palette.tab-three-text", "text"),
    innerTabs: runtimeBlock("palette.inner-tabs", "tabs"),
    dirtyText: runtimeBlock("palette.dirty-text", "text"),
  },
  tabs: {
    defaults: [
      { id: "tab-1", label: "Tab 1" },
      { id: "tab-2", label: "Tab 2" },
    ],
    added: { id: "tab-3", label: "Tab 3" },
    authoredLabels: { "tab-1": "Overview", "tab-2": "Details", "tab-3": "History" },
    text: {
      "tab-1": `${PREFIX} overview text`,
      "tab-2": `${PREFIX} details text`,
      "tab-3": `${PREFIX} history text`,
    },
  },
  overrides: {
    directImageSafe: [{ blockId: `${PREFIX}-race-image`, mediaAssetId: capture("media.id") }],
    directImageCleared: [],
  },
  routes: {
    "media-prior-resolution": { method: "GET", pattern: "/admin/api/media", kind: "delayed" },
    "entry-save-failure": {
      method: "PATCH",
      pattern: {
        template: `/admin/api/content/${PREFIX}-records/entries/{entry.id}`,
        captures: ["entry.id"],
      },
      kind: "malformed",
    },
    "related-first-failure": {
      method: "GET",
      pattern: `/admin/api/content/${PREFIX}-related-failure/entries`,
      kind: "malformed",
    },
    "related-a-refresh": {
      method: "GET",
      pattern: `/admin/api/content/${PREFIX}-related-a/entries`,
      kind: "delayed",
    },
    "preference-a-read-refresh": {
      method: "GET",
      pattern: "/admin/api/user-settings/customScreens.entry.preferences",
      kind: "delayed",
    },
    "preference-a-write-exit": {
      method: "PATCH",
      pattern: "/admin/api/user-settings/customScreens.entry.preferences",
      kind: "delayed",
    },
  },
  screenshotPaths: [
    "_docs/_workflows/_smoke/task-540-wf540smoke-button-image-light.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-content-dark.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-keyboard-light.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-space-selection-dark.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-save-failure.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-guards-final.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-related-first-failure.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-converged.png",
  ],
});
```

The four content-type IDs, the editable plus five related-entry IDs, both Screen IDs,
the media ID/URL/key, and both synthetic-user IDs above are deliberately the exact 17
public `CaptureName`/`CaptureRef` values. Their create operations own those IDs, so the
owning setup action captures and freezes the create-operation value, then a separate
detail/list read proves it. The exact four-key editable content-type detail output
`{id,slug,name,schema}` from `set-017-editable-type-proof` is deliberately not an
eighteenth capture: it enters only the executor-private single-assignment projection
authority specified below. It is absent from the public capture map, plan/evidence
capture projections, callbacks, receipts, errors, and logs. The six entry slugs are
deterministic, safe, client-authored create-body values and must round-trip
byte-identically. Content-type field IDs are a different contract: the persisted
schema owns field names and configuration, not client-authored field-ID bytes. After
each content-type detail read, the workflow runs the production `fieldsFromSchema()`
projection and requires each reconstructed ID to equal exact `field-${name}`. Only
those canonical reconstructed IDs enter the UI fixture projection.
Accordingly, each related content type independently reconstructs its sole `label`
field as `field-label`; that per-type identity is intentional, not a global ID collision.
Section, preseeded block, and binding IDs remain client-authored deterministic document
values and must round-trip byte-identically.
No palette-created block ID appears in the blueprint: `createId()` in
`screenDocumentOps.ts` uses `Date.now()` plus `Math.random()`. For each
`RuntimeBlockRef`, the manifest first captures the exact live block-ID set, then clicks
one visible palette control, then `capture-new-block` requires a set difference of
exactly one, verifies the new node's `data-screen-block-type`, freezes that ID under
the declared capture name, and rejects later rebinding.

Content-type, entry, media, Screen, and override fixture acquisition is real Admin API
work, not integration-test seeding. Each unsafe HTTP request uses the current
authenticated session and a privately acquired CSRF token; neither cookies nor CSRF
values may enter a descriptor, receipt, prompt, or error. User provisioning separately
follows the already mandated service contract below. The two preference baselines are
the sole task-fixture exception for persisted non-entity baseline values:
`fixture(set-user-a-preference-false)` and
`fixture(set-user-b-preference-false)` are local `setUserSetting` service operations,
and their proof builders are local `getUserSetting` service operations. They are
neither Admin API writes nor direct DB seeding. The ordered setup is users A/B, four
content types, related entries A1/A2/B1/B2/failure1, PNG media upload, editable entry,
the main and retry Screens, then the A/B preference baselines. Each entity create
response is strictly validated and followed by a separate authenticated provenance
read. Reset actions PUT/PATCH the exact blueprint baseline and verify it with a separate
read; they never replace a UI action that a scenario is required to exercise.

The deep-frozen `media.uploadFixture` object is the sole upload-byte authority. The
`set-030-media-upload` runtime descriptor reads those four exact own data properties,
requires canonical base64 round-trip equality, decodes exactly 68 bytes, verifies the
eight-byte PNG signature and SHA-256
`431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`, and submits
those bytes once with blueprint `originalName` and `mimeType`. It accepts no fixture
path, generated image, alternate literal, caller bytes, environment value, or hidden
runtime data authority. The bytes and multipart body remain private; only the existing
strict media create projection may bind the three public media captures.

The preference fixture builders bind the source-owned domain normalizer under the local
name `normalizeScreenEntryPreferencesStrict`; this is an adapter name, not a second
normalization algorithm. It recursively rejects unknown keys, requires exact
`{version:1,showFieldMetadata:boolean}`, and must return the same exact shape before a
service call:

```ts
const SCREEN_ENTRY_PREFERENCE_KEY = "customScreens.entry.preferences";

async function setPreferenceBaselineFalse(userId: string): Promise<void> {
  const value = normalizeScreenEntryPreferencesStrict({
    version: 1,
    showFieldMetadata: false,
  });
  assertDeepEqual(value, { version: 1, showFieldMetadata: false });
  await setUserSetting(userId, SCREEN_ENTRY_PREFERENCE_KEY, value);
}

async function readPreferenceBaselineFalse(userId: string): Promise<false> {
  const stored = await getUserSetting(userId, SCREEN_ENTRY_PREFERENCE_KEY);
  const value = normalizeScreenEntryPreferencesStrict(stored);
  assertDeepEqual(value, { version: 1, showFieldMetadata: false });
  return false;
}
```

The A and B builders call these functions with only their captured user UUID. Each
write is one bounded service operation; each proof is a separate bounded service read
whose only egress is literal `false`. Cleanup owns the two exact composite rows
`(userAId, SCREEN_ENTRY_PREFERENCE_KEY)` and
`(userBId, SCREEN_ENTRY_PREFERENCE_KEY)` and deletes them in canonical cleanup order.

The storage half of setup is limited to the explicitly persisted local driver and makes
no cloud listing claim. Before media upload or any storage snapshot, privately query
the exact settings keys `storage.driver` and `storage.local.dir` separately with a
two-row bound each. Require exactly one row per key, require the decoded driver value
to be exact string `"local"`, and require the decoded local-dir value to be one
non-empty string. Then call `getStorageSettingsInternal()`, require its `driver` to be
byte-equal to the persisted `"local"`, require
`localDir` to be a non-empty string byte-equal to that persisted row, and require
both `process.env.MEDIA_STORAGE === undefined` and
`process.env.MEDIA_DIR === undefined` after the repo environment is loaded. S3, Azure,
an unknown driver, zero/duplicate settings rows, a non-string/empty/mismatched value, a
present `MEDIA_STORAGE` or `MEDIA_DIR` (including an empty value), or any
default/fallback resolution is an infrastructure failure. In particular, neither
environment variable nor the
`createLocalAdapter` default may satisfy this preflight. The raw row and settings object
stay private; sanitized egress does not expose the key value or path.

```ts
const driverRows = await querySettingRowsExact("storage.driver", { limit: 2 });
const localDirRows = await querySettingRowsExact("storage.local.dir", { limit: 2 });
assertCardinality(driverRows, 1);
assertCardinality(localDirRows, 1);
const persistedDriver = assertExactString(driverRows[0].value, "local");
const persistedLocalDir = assertNonEmptyString(localDirRows[0].value);
assert(process.env.MEDIA_STORAGE === undefined);
assert(process.env.MEDIA_DIR === undefined);
const storageSettings = await getStorageSettingsInternal();
assert(storageSettings.driver === persistedDriver);
assert(assertNonEmptyString(storageSettings.localDir) === persistedLocalDir);
```

Resolve the root only as `path.resolve(CORE_CWD, persistedLocalDir)`. Require it not to
equal the filesystem root; `lstat` every existing ancestor from the filesystem root
through the configured root and reject any symlink; require the final root to be a
directory on one stable device and freeze its canonical real path plus
`(dev,ino,type,mode)` identity.

Inventory it twice per observation with the same sorted, bounded recursive `lstat`
walk: depth <= 3, entries <= 10,000, directories <= 2,000, elapsed time <= 10 seconds,
canonical relative-key bytes <= 512 each, and total private serialized manifest bytes
<= 4 MiB. Reject every symlink, device change, and node other than a regular file or
directory; require every child real path to remain under the canonical root and use the
same device. Canonicalize file keys to POSIX relative paths with no leading slash,
backslash, NUL, empty/`.`/`..` segment, or duplicate. Each private entry records exact
`key,dev,ino,type,size,mode,mtimeNs`; root identity, sorted entry arrays, and the DB
absence result must be identical across the two scans. Any mutation/TOCTOU signal,
limit breach, timestamp/identity drift, or incomplete walk fails closed.

`storageMatches` is intentionally narrow: it counts only inventoried regular-file
canonical keys whose final basename stem, after removal of the one canonical extension,
is exactly the lowercase `missingBoundMediaId`. This does not claim that a matching
filename would be associated with that media UUID: `media.id` and `media.key` are
different contracts. The authoritative mapping proof is a separate exact DB query
showing zero `media.id = missingBoundMediaId` rows before and after each stable scan.
Run the stable DB-plus-two-scan observation before setup, after fixture setup, and after
cleanup. Raw settings, absolute/canonical root paths, root/entry names, manifests, and
snapshot bytes remain only in `LOCAL_COMMAND_AUTHORITY` WeakMap storage; only the exact
sanitized `{ rowCount: 0, storageMatches: 0 }` may egress. Cleanup deletes only the
acquired media row and its separately captured canonical key and requires the final
stable snapshot to equal the pre-setup snapshot apart from independently inventoried
task-owned deltas. It never reports generic object-store absence.

The local adapter creates `yyyy/mm` directories but deletes only the file. Therefore
`media-row-key` also freezes, during upload provenance, the exact canonical file
`(dev,ino,type,mode)` and the identities of its `yyyy` and `yyyy/mm` ancestors, while
marking which of those two directories were absent from `storageStartBaseline` and
were created by this upload. Its sole storage-object deleter is the one real media
DELETE by captured media UUID. After that call, the same record proves the DB row and
exact file key absent, then visits only newly acquired ancestors deepest-first. It may
`rmdir` an ancestor only when its canonical real path remains under the unchanged
root, it is a non-symlink directory on the frozen device with the same `(dev,ino)`, it
was absent at baseline, and one bounded `readdir` is exact `[]`; it then proves
`lstat` returns `ENOENT`. A pre-existing, changed, non-empty, symlinked, or wrong-device
directory is never removed. These structural empty-directory restorations belong to
the one `media-row-key` absence adapter and are not a second storage resource or
storage-key delete authority.

`validateSmokeFixtureBlueprint()` and `bindSmokeFixtureCaptures()` implement these
fail-closed checks. `FIXTURE_BLUEPRINT_SCHEMA` allowlists `slug` on exactly the editable
entry and five related-entry nodes; it remains required on all six and rejected on
unrelated nodes:

```ts
assertExactKeysRecursively(SMOKE_FIXTURE_BLUEPRINT, FIXTURE_BLUEPRINT_SCHEMA);
assertSetEqual(Object.keys(contentTypes), ["editable", "relatedA", "relatedB", "relatedFailure"]);
assertSetEqual(
  editable.fields.map(({ name }) => name),
  [
    "primaryUrl",
    "secondaryUrl",
    "headline",
    "raceImageId",
    "mediaAsset",
    "relationA",
    "relationB",
    "relationFailure",
    "unrelatedNote",
  ]
);
assertDeepEqual(
  editable.fields.map(({ id }) => id),
  [
    "field-primaryUrl",
    "field-secondaryUrl",
    "field-headline",
    "field-raceImageId",
    "field-mediaAsset",
    "field-relationA",
    "field-relationB",
    "field-relationFailure",
    "field-unrelatedNote",
  ]
);
assertDeepEqual(
  relatedA.fields.map(({ id }) => id),
  ["field-label"]
);
assertDeepEqual(
  relatedB.fields.map(({ id }) => id),
  ["field-label"]
);
assertDeepEqual(
  relatedFailure.fields.map(({ id }) => id),
  ["field-label"]
);
assertExactKeys(entry, [
  "id",
  "title",
  "slug",
  "baseline",
  "contentDraft",
  "presentationDraft",
  "relatedUnrelatedDraft",
  "spacePhrase",
]);
assertExactKeys(relatedEntries.a1, ["id", "title", "slug", "updatedTitle", "data"]);
for (const relatedEntry of [
  relatedEntries.a2,
  relatedEntries.b1,
  relatedEntries.b2,
  relatedEntries.failure1,
]) {
  assertExactKeys(relatedEntry, ["id", "title", "slug", "data"]);
}
assertSetEqual(allEntrySlugs(), [
  `${PREFIX}-editable-entry`,
  `${PREFIX}-related-a-one`,
  `${PREFIX}-related-a-two`,
  `${PREFIX}-related-b-one`,
  `${PREFIX}-related-b-two`,
  `${PREFIX}-related-failure-one`,
]);
assertEveryEntrySlugIsSafeAndTaskPrefixed();
assertEveryEntryCreateBodyHasExactKeys(["title", "slug", "data"]);
assertDeepEqual(entryCreateBodies(), {
  editable: { title: entry.title, slug: entry.slug, data: entry.baseline },
  a1: {
    title: relatedEntries.a1.title,
    slug: relatedEntries.a1.slug,
    data: relatedEntries.a1.data,
  },
  a2: {
    title: relatedEntries.a2.title,
    slug: relatedEntries.a2.slug,
    data: relatedEntries.a2.data,
  },
  b1: {
    title: relatedEntries.b1.title,
    slug: relatedEntries.b1.slug,
    data: relatedEntries.b1.data,
  },
  b2: {
    title: relatedEntries.b2.title,
    slug: relatedEntries.b2.slug,
    data: relatedEntries.b2.data,
  },
  failure1: {
    title: relatedEntries.failure1.title,
    slug: relatedEntries.failure1.slug,
    data: relatedEntries.failure1.data,
  },
});
assertDeepEqual(roundTrippedEntrySlugs(), {
  editable: `${PREFIX}-editable-entry`,
  a1: `${PREFIX}-related-a-one`,
  a2: `${PREFIX}-related-a-two`,
  b1: `${PREFIX}-related-b-one`,
  b2: `${PREFIX}-related-b-two`,
  failure1: `${PREFIX}-related-failure-one`,
});
for (const contentType of [editable, relatedA, relatedB, relatedFailure]) {
  assertDeepEqual(
    fieldsFromSchema(capturedSchemaFor(contentType)).map(({ id, name }) => ({ id, name })),
    contentType.fields.map(({ id, name }) => ({ id, name }))
  );
}
assertContentTypeCreateBodiesPersistNamesAndConfigurationButNoFieldIds();
assertSetEqual(preseededDocumentBlockIds(), [
  `${PREFIX}-race-image`,
  `${PREFIX}-media-field`,
  `${PREFIX}-headline-field`,
  `${PREFIX}-relation-a-field`,
  `${PREFIX}-relation-b-field`,
  `${PREFIX}-related-list-a`,
  `${PREFIX}-related-list-b`,
  `${PREFIX}-read-only-field`,
  `${PREFIX}-space-group`,
  `${PREFIX}-space-note-field`,
  `${PREFIX}-space-link`,
]);
assertSetEqual(bindingIds(), [
  `${PREFIX}-bind-race-image`,
  `${PREFIX}-bind-media-field`,
  `${PREFIX}-bind-headline`,
  `${PREFIX}-bind-relation-a-field`,
  `${PREFIX}-bind-relation-b-field`,
  `${PREFIX}-bind-related-a`,
  `${PREFIX}-bind-related-b`,
  `${PREFIX}-bind-read-only`,
  `${PREFIX}-bind-space-note`,
]);
assertSetEqual(retryScreenDocumentBlockIds(), [`${PREFIX}-retry-related-list-failure`]);
assertSetEqual(retryScreenBindingIds(), [`${PREFIX}-retry-bind-related-failure`]);
assertDeepEqual(roundTrippedImageData(), {
  label: `${PREFIX} race image`,
});
assertDeepEqual(roundTrippedRelatedListData(), {
  mainA: screen.definitionTemplate.editorView.document.sections[0].blocks[5].data,
  mainB: screen.definitionTemplate.editorView.document.sections[0].blocks[6].data,
  retryFailure: retryScreen.definitionTemplate.editorView.document.sections[0].blocks[0].data,
});
assertDeepEqual(media.uploadFixture, {
  encoding: "base64",
  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  decodedSizeBytes: 68,
  sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
});
assertCanonicalPngFixture(media.uploadFixture, {
  decodedSizeBytes: 68,
  signatureHex: "89504e470d0a1a0a",
  sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
});
assertSet030UsesSoleBlueprintUploadAuthorityAndNoPathOrAlternateBytes();
assertDeepEqual(
  tabs.defaults.map(({ id }) => id),
  ["tab-1", "tab-2"]
);
assertDeepEqual([tabs.added.id], ["tab-3"]);
assertCardinality(SMOKE_FIXTURE_BLUEPRINT.screenshotPaths, 13);
assertEveryCanonicalScreenshotPathMatches(
  SMOKE_FIXTURE_BLUEPRINT.screenshotPaths,
  /^_docs\/_workflows\/_smoke\/task-540-[a-z0-9-]+\.png$/
);
assertSetEqual(Object.keys(routes), REQUIRED_ROUTE_KEYS);
assertSetEqual(publicCaptureRefNames(), REQUIRED_CAPTURE_NAMES);
assertCardinality(publicCaptureRefNames(), 17);
assertEveryPublicCaptureRefBoundExactlyOnceAndEveryRuntimeBlockInitiallyUnbound();
```

The `definitionTemplate.listView` objects are workflow-private materializer descriptors,
not API payloads or capture descriptors. The Node executor never imports their
production TypeScript owner. The exact `set-017-editable-type-proof` output schema
accepts only the recursively validated four-key value `{id,slug,name,schema}`. After
that output is parsed, and before its ordinary bounded proof receipt is recorded, the
executor binds the deep-frozen value once in a non-exported `WeakMap` keyed by the
private execution authority. No other action may write it. The two Screen materializer
handlers are its only readers:

```ts
type EditableContentTypeDetailProjection = Readonly<{
  id: string;
  slug: string;
  name: string;
  schema: ContentTypeSchema;
}>;

const EDITABLE_CONTENT_TYPE_DETAIL_AUTHORITY_ID = "editable-content-type-detail" as const;
const EDITABLE_CONTENT_TYPE_DETAIL_PRODUCER_ACTION_IDS = Object.freeze([
  "set-017-editable-type-proof",
]);
const EDITABLE_CONTENT_TYPE_DETAIL_CONSUMER_ACTION_IDS = Object.freeze([
  "set-035-screen-create",
  "set-037-retry-screen-create",
]);
const PRIVATE_EDITABLE_CONTENT_TYPE_DETAIL = new WeakMap<
  PrivateExecutionAuthority,
  EditableContentTypeDetailProjection
>();

function bindEditableContentTypeDetail(executionAuthority, actionId, output) {
  assert(actionId === "set-017-editable-type-proof");
  assertExactKeys(output, ["id", "slug", "name", "schema"]);
  assertEditableContentTypeDetailProjection(output);
  assert(!PRIVATE_EDITABLE_CONTENT_TYPE_DETAIL.has(executionAuthority));
  PRIVATE_EDITABLE_CONTENT_TYPE_DETAIL.set(executionAuthority, deepFreezeExact(output));
}

function readEditableContentTypeDetail(executionAuthority, actionId, authorityId) {
  assert(authorityId === EDITABLE_CONTENT_TYPE_DETAIL_AUTHORITY_ID);
  assert(EDITABLE_CONTENT_TYPE_DETAIL_CONSUMER_ACTION_IDS.includes(actionId));
  const value = PRIVATE_EDITABLE_CONTENT_TYPE_DETAIL.get(executionAuthority);
  assert(value !== undefined);
  return value;
}

assertSetEqual(
  privateProjectionProducerActionIdsActuallyRegistered(),
  EDITABLE_CONTENT_TYPE_DETAIL_PRODUCER_ACTION_IDS
);
assertSetEqual(
  privateProjectionConsumerActionIdsActuallyRegistered(),
  EDITABLE_CONTENT_TYPE_DETAIL_CONSUMER_ACTION_IDS
);
assertSetEqual(listViewDescriptorPrivateProjectionAuthorityIds(), [
  EDITABLE_CONTENT_TYPE_DETAIL_AUTHORITY_ID,
]);
assertCardinality(listViewDescriptors(), 2);
assertNoPrivateProjectionInPublicCapturesPlanEvidenceReceiptsOrErrors();

async function materializeScreenCreateBody(
  executionAuthority,
  currentActionId,
  boundBridgeDescriptor,
  blueprint
) {
  assertDescriptorOwnedByCurrentRuntimeHandler(boundBridgeDescriptor);
  const { listView: descriptor, ...definitionWithoutListView } = blueprint.definitionTemplate;
  assertDeepEqual(descriptor, {
    materializerId: "buildDefaultListViewDefinition",
    privateProjectionAuthorityId: EDITABLE_CONTENT_TYPE_DETAIL_AUTHORITY_ID,
  });
  const contentTypeDetail = readEditableContentTypeDetail(
    executionAuthority,
    currentActionId,
    descriptor.privateProjectionAuthorityId
  );
  const createBody = await executePrivateBunBridge(boundBridgeDescriptor, {
    bodyWithoutDefinition: {
      contentTypeId: contentTypeDetail.id,
      name: blueprint.name,
      showInSidebar: blueprint.showInSidebar,
      sidebarLabel: blueprint.sidebarLabel,
      status: blueprint.status,
    },
    contentType: contentTypeDetail,
    definitionWithoutListView,
  });
  assertExactKeys(createBody, exactCustomScreenCreateBodyKeysForBlueprint(blueprint));
  const definition = deepFreezeExact(createBody.definition);
  assertExactKeys(definition.listView, [
    "columns",
    "filters",
    "defaultSort",
    "bulkActions",
    "rowTemplate",
  ]);
  assertDeepEqual(createBody.contentTypeId, contentTypeDetail.id);
  return deepFreezeExact(createBody);
}
```

Both producer and consumer equality checks are bidirectional: an undeclared accessor
and a declared-but-unused action fail equally. Hermetic negatives cover a second
`set-017` bind, a bind by any other action, a read before `set-017`, a read by any
action other than `set-035`/`set-037`, an altered authority ID, and projection value or
hash leakage through the 17-name public capture map, safe evidence, receipt, callback,
error, or log surface.

Immediately before each Screen POST, the direct
`runtime/set-035-screen-create` or `runtime/set-037-retry-screen-create` handler invokes
its own fixed `schema-only` Bun bridge descriptor once. That descriptor's immutable
source imports `buildDefaultListViewDefinition`,
`normalizeCustomScreenDefinitionForWrite`, `customScreenCreateSchema`, and the production
schema validator from their fixed repo-relative core modules; it materializes and
validates the concrete V4 create body from the privately held, separately proven
content-type detail projection.

Inside each immutable source, `listView` is exactly
`buildDefaultListViewDefinition(contentType)`, the full definition must be byte-identical
to `normalizeCustomScreenDefinitionForWrite(definition,{contentType})`, and the returned
body must pass `validate(customScreenCreateSchema, body)` before canonical stdout is
written. The Node handler applies its bridge output schema, proves that no descriptor key
survived, and issues the single fixed authenticated POST itself; the bridge cannot choose
or call that endpoint. The corresponding detail read must prove the returned definition
is byte-identical to the frozen materialized value, including the exact Image data
`{label}`, all three related-list data objects, every binding, and the complete concrete
list-view object. A descriptor key reaching the request body, a dropped allowlisted data
key, a normalizer delta, or a main/retry materialization that reuses the other Screen's
captured ID fails closed.

### Workflow-owned ordered smoke action manifest

`_docs/_workflows/task-540-smoke-contract.mjs` also owns the frozen
`SMOKE_ACTION_MANIFEST`. Its compiler produces all 496 action objects before any
capability starts; it does not execute setup, resolve a capture value, recompile, or
expand a second manifest after setup. Each row below becomes one exact object with the
reject-unknown keys
`{ordinal,id,scenario,pageId,tabIndex,kind,builder,precondition,captureInput,
captureOutput,postcondition,assertionDependencies,routeStateBefore,routeStateAfter,
executable,outputSchemaId,repositoryMutationPolicy}`.
`pageId/tabIndex` is `p1/0` unless the row says `p2/1`; `runtime` means both are null.
`-` means an empty capture/dependency set or route state `absent` as appropriate, not
an omitted key. Every row is one browser invocation or one bounded runtime
API/DB/storage action. A browser `click`, `fill`, `press`, `type`, `goto`, `resize`,
`screenshot`, route operation, log read, and assertion are never combined.
The compiler takes `scenario` from the enclosing flow heading, maps `p1/0` and `p2/1`
to the exact stable page identities, maps the builder arguments and dependency column
to `captureInput` and `assertionDependencies`, and maps the middle clause of the
transition sentence to `captureOutput`; route shorthand expands to the full declared
before/after state for every route key. It emits every schema key even when its value
is `null` or an empty frozen array. `kind`, `builder`, and the transition prose remain
review/audit identity only: they never select code, argv, source, parsing, or output.
No prose inference remains at execution time.

Execution authority is only the recursively reject-unknown, deep-frozen
`executable` discriminated union below. The former executable fields
`templateId`, `sourceAuthority`, `transport`, `stdoutPolicy`, and top-level
`argumentRefs` are forbidden everywhere in the compiled plan and executor. They may
not survive as compatibility aliases. `outputSchemaId` and
`repositoryMutationPolicy` remain top-level because they validate the normalized
operation result and repository boundary independently of how the operation runs.

```ts
type LiteralRef = Readonly<{
  op: "literal";
  value: string | number;
}>;
type CaptureRef = Readonly<{
  op: "capture";
  name: CaptureName;
}>;
type FixtureRef = Readonly<{
  op: "fixture";
  path: readonly [FixtureRootKey, ...string[]];
}>;
type PathRef = Readonly<{
  op: "path";
  key: PathRegistryKey;
}>;
type SelectorRef = Readonly<{
  op: "selector";
  templateId: SelectorRegistryKey;
  args: readonly NonSecretRef[];
}>;
type SecretNameRef = Readonly<{
  op: "secret";
  name: "ADMIN_EMAIL" | "ADMIN_PASSWORD";
}>;
type NonSecretRef = LiteralRef | CaptureRef | FixtureRef | PathRef | SelectorRef;
type Ref = NonSecretRef | SecretNameRef;

type RuntimeOperationExecutable = Readonly<{
  type: "runtime-operation";
  operationId: RuntimeOperationId;
  refs: readonly NonSecretRef[];
}>;
type BrowserRunCodeExecutable = Readonly<{
  type: "browser-run-code";
  sourceId: BrowserRunCodeSourceId;
  refs: readonly NonSecretRef[];
}>;
type BrowserNativeExecutable = Readonly<{
  type: "browser-native";
  operationId: BrowserNativeOperationId;
  refs: readonly Ref[];
}>;
type BrowserScreenshotExecutable = Readonly<{
  type: "browser-screenshot";
  screenshotId: ScreenshotId;
  fullPage: true;
}>;
type BrowserGlobalListExecutable = Readonly<{
  type: "browser-global-list";
}>;
type Executable =
  | RuntimeOperationExecutable
  | BrowserRunCodeExecutable
  | BrowserNativeExecutable
  | BrowserScreenshotExecutable
  | BrowserGlobalListExecutable;
```

Plan construction validates each symbolic ref's shape, registry membership, producer,
consumer, and producer-before-consumer dependency without reading its runtime value.
Only the current action's `buildRegisteredInvocation(...)` resolves refs, immediately
after that action's declared dependencies and all earlier ordinals have completed.
Resolution reads captures and fixture leaves lazily from the then-current private
single-assignment state; an unbound required ref fails at that exact ordinal, while a
capture produced by a later ordinal is never read early. The executor never eagerly
resolves all refs, recompiles rows, or revisits an earlier action after a capture binds.

Every object above has exactly the displayed own keys, a plain/null prototype as
specified by the helper, no accessors/symbols, and no sparse arrays. Strings are
bounded NUL/CR/LF-free UTF-8; numbers are safe integers. `LiteralRef` cannot carry an
object, array, boolean, null, `$...` placeholder, source text, command, URL assembled
outside the path registry, or secret value. `FixtureRef.path` is validated against a
closed leaf-path registry rather than traversed dynamically. `SelectorRef.args` is
recursive but secret-free, and its exact arity/type contract comes from the closed
selector registry. A `SecretNameRef` is a symbolic name only, never a value; it is
legal solely as the second ref of a native `fill-secret` descriptor, after the exact
login email/password selector ref allowed for that action. It is forbidden in runtime,
run-code, screenshot, global-list, nested selector, path, fixture, capture, logging,
and evidence structures. Synthetic user emails are ordinary bounded fixture refs and
therefore use run-code; they are not secret-name refs.

The source tuples mechanically contain exactly these six ref discriminants and no
others: `literal`, `path`, `selector`, `secret`, `capture`, and `fixture`. The helper
self-test recounts those exact `op` values from all refs, including recursive selector
args; the `templateId` selector key intentionally matches the helper registry and may
not be renamed only in docs or executor. The compiler then owns exact closed
operation/source registries. Runtime and run-code IDs are action-specific literal
keys, so a generic family cannot hide a second dispatch switch:

```ts
type RuntimeOperationId = `runtime/${RuntimeActionId}`;
type BrowserRunCodeSourceId = `run-code/${BrowserRunCodeActionId}`;
const BROWSER_NATIVE_OPERATION_IDS = Object.freeze([
  "open-about-blank",
  "fill-secret",
  "tab-new",
  "tab-select",
  "tab-close",
  "route-list",
  "close",
]);
```

`RUNTIME_OPERATION_HANDLERS` has exactly the 76 literal
`runtime/<exact-action-id>` keys from the runtime table below and functions as values.
The semantic-family table is audit grouping only and never dispatch authority. Two
keys may reference the same handler function only when their ref signature, endpoint,
auth/context, validation schema, result projection, error mapping, ledger effects, and
retry policy are byte-identical; otherwise each owns a distinct handler closure.
Every runtime handler's exact ref schema is data-only: no literal/fixture/path/capture
value chooses another handler, endpoint, schema, auth mode, source, or cleanup
authority.

The subset that needs production service/schema/DB behavior owns a second, private
action-specific closure at the same literal `runtime/<exact-action-id>` entry. That
closure contains one recursively frozen descriptor of this exact shape; it is never
accepted from the plan, an action row, a ref, a callback, or executor input:

```ts
type PrivateBunBridgeDescriptor = Readonly<{
  operationId: BunBridgeOperationId;
  file: "bun";
  args: readonly ["--no-env-file", "--cwd", CanonicalCoreRoot, "--eval", ImmutableSourceBytes];
  cwd: CanonicalRoot;
  envProfileId:
    | "schema-only"
    | "database"
    | "bootstrap-preflight"
    | "user-identity-proof"
    | "user-provisioning";
  inputSchemaId: BunBridgeInputSchemaId;
  outputSchemaId: BunBridgeOutputSchemaId;
  timeoutMs: 30_000;
  maxStdinBytes: 1_048_576;
  maxStdoutBytes: 4_194_304;
  maxStderrBytes: 4_194_304;
}>;
```

The resulting invocation is always exactly
`bun --no-env-file --cwd <canonical-core> --eval <immutable-source>`, with
canonical-root cwd and spawn options
`{shell:false,detached:true,stdio:["pipe","pipe","pipe"]}`. `CanonicalCoreRoot` is
the already identity-validated `<canonical-root>/core`; source bytes are a frozen
executor constant with fixed relative import specifiers and no root, action, ref, env,
or payload interpolation. Caller-provided argv/source, a shell, `bunx`, `bun run`, a
package script, a separate bridge source file, a caller-selected module, an eval fragment
assembled from data, and a generic "run Bun" capability are forbidden. Before first use
and immediately before each spawn, the executor resolves `bun` through the exact projected
`PATH`, freezes and revalidates its canonical realpath plus executable
`(dev,ino,type,mode)` identity, and fails on drift. The executor's one-shot executable allowlist is
bidirectionally set-equal to the files referenced by its frozen descriptor registries;
`bun` is admitted only for these descriptors and cannot execute any other argv.

Each bridge operation receives exactly one UTF-8 stdin frame
`canonicalJson(validatedInput) + "\n"`, then EOF. The Node side validates the operation's
strict reject-unknown input schema before encoding; the immutable Bun source independently
rejects BOM/NUL/CR, duplicate keys, non-finite values, non-canonical bytes, missing/extra
keys, wrong scalar/tuple bounds, trailing bytes, and a second JSON layer. Success is exit
status `0`, exact empty stderr, and exactly one bounded stdout frame
`canonicalJson(validatedOutput) + "\n"`; the executor performs the same byte and
reject-unknown checks before binding any capture or ledger result. Empty, truncated,
multi-frame, noncanonical, over-limit, schema-mismatched, or nonzero output fails closed.
No secret, cookie, CSRF value, authorization header, raw DB row, source bytes, or raw
observed HTTP request/response bytes may cross either JSON schema.

The child environment starts from `Object.create(null)` and is the exact projection for
the descriptor's frozen profile:

```ts
const BUN_BRIDGE_ENV_PROFILES = deepFreezeExact({
  "schema-only": {
    requiredInherited: ["PATH"],
    requiredRepo: [],
    optionalRepo: [],
    fixed: {},
  },
  database: {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL"],
    optionalRepo: [],
    fixed: { DB_POOL_MAX: "1" },
  },
  "bootstrap-preflight": {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL", "PII_HASH_KEY", "PII_ENC_KEY", "ADMIN_EMAIL"],
    optionalRepo: [],
    fixed: { DB_POOL_MAX: "1" },
  },
  "user-identity-proof": {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL", "PII_HASH_KEY", "PII_ENC_KEY"],
    optionalRepo: [],
    fixed: { DB_POOL_MAX: "1" },
  },
  "user-provisioning": {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL", "PII_HASH_KEY", "PII_ENC_KEY", "ADMIN_PASSWORD"],
    optionalRepo: ["AUTH_PASSWORD_PEPPER"],
    fixed: { DB_POOL_MAX: "1" },
  },
});

const REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE = deepFreezeExact({
  "bootstrap-preflight": ["runtime/set-001-storage-preflight"],
  database: [
    "runtime/set-004b-session-policy-preflight",
    "runtime/set-004c-auth-rate-budget-preflight",
    "runtime/set-032-storage-post-setup",
    "runtime/set-041-preference-a",
    "runtime/set-042-preference-a-proof",
    "runtime/set-043-preference-b",
    "runtime/set-044-preference-b-proof",
  ],
  "user-identity-proof": ["runtime/set-013-user-a-proof", "runtime/set-015-user-b-proof"],
  "user-provisioning": ["runtime/set-012-user-a-create", "runtime/set-014-user-b-create"],
  "schema-only": ["runtime/set-035-screen-create", "runtime/set-037-retry-screen-create"],
});
assertCardinality(
  Object.values(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).flat(),
  14
);
assertUnique(Object.values(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).flat());
assertSetEqual(
  Object.keys(BUN_BRIDGE_ENV_PROFILES),
  Object.keys(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE)
);
assertSetEqual(
  Object.values(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).flat(),
  runtimeHandlerIdsWithPrivateBunDescriptor()
);
assertCardinality(
  runtimeExecutableActionIds().filter(
    (id) => !runtimeHandlerIdsWithPrivateBunDescriptor().includes(`runtime/${id}`)
  ),
  62
);
```

`schema-only` is required for pure production schema/normalizer/helper imports and does
not receive `DATABASE_URL`. Every descriptor that imports DB-coupled code receives
`DATABASE_URL`; it receives no secret unless the exact imported operation requires that
secret. The sole bootstrap descriptor imports the production PII helpers and receives
`ADMIN_EMAIL` plus the two PII keys so it can prove the canonical existing Admin row; the
email is forbidden from stdin/argv/output. The two identity-proof descriptors receive
only the PII keys needed to hash/decrypt their synthetic-user rows. The two provisioning
descriptors additionally receive optional-present `AUTH_PASSWORD_PEPPER` and
`ADMIN_PASSWORD`; within the Bun bridge, `ADMIN_PASSWORD` is legal solely there and is
forbidden from stdin, argv, stdout, stderr, and every other bridge environment.
`set-004b`/`set-004c` call only `getSecuritySettings()`, never the public secret projection
or bot-secret decryption. `set-001` requires `storage.driver === "local"` before any
provider-secret branch. Therefore no enumerated bridge source requires
`MEDIA_SECRET_MASTER_KEY`, provider/cloud keys, or storage fallback variables, and all are
absent from every bridge child. Browser secrets-file variables, the host env, and every
other unlisted inherited/repo key are likewise absent. Profile/key equality is checked
before every spawn, not inferred from the imported module at runtime. Required inherited
and repo values must be own, non-empty strings; the optional pepper is copied only when
it is an own non-empty string; fixed values are synthesized literally; accessors,
symbols, duplicate/prototype-pollution keys, non-string values, and every extra final key
fail before spawn.

`BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS` has exactly the 14 literal keys in
`REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE`; the other 62 runtime handlers
are the exact Node-local complement and cannot acquire a bridge descriptor.
`BUN_BRIDGE_RESOURCE_OPERATION_DESCRIPTORS` is private append-only. A strict proposed
resource record is validated against the exhaustive participation table below and its
required provenance descriptor is held in one private pending slot before that operation
runs. A failed create adapter's `finally` may retain only its immutable pending-attempt
descriptor, already frozen baseline, intended parent identifiers, authored-request digest,
and private failure observation. It performs no discovery query and cannot register or
append any resource, core, edge, or authoritative descriptor. Only a successful proof in
the sole ordinal loop, or the one exact phase-3 response-lost discovery, atomically
appends the acquisition core and promotes that pending descriptor while adding its
cleanup/absence descriptors; only then may the latter execute. Each frozen phase projection and the final
frozen ledger require exact set equality between eligible concrete P/C/A operation IDs
and the accumulated authoritative descriptors;
logical provenance rows marked `bound-runtime-bridge` bind the already executed matching
runtime receipt and do not spawn or register a duplicate resource descriptor. The union
is `BUN_BRIDGE_OPERATION_DESCRIPTORS`, and all three sets are checked bidirectionally;
no Node-local operation appears and no declared bridge operation is missing. A runtime
entry owns its complete source, fixed production import, service/schema/query, env
profile, strict input/output schemas, and projection. A bridge-participating ledger entry
owns the same fields before any identifier values are bound. `operationId` performs one
exact registry lookup only; neither `action.id`, `kind`, `builder`, scenario, ref
contents, resource identifier values, nor input JSON can choose or interpolate source,
module specifier, HTTP endpoint, SQL/table/columns, schema, env profile, or output parser.
The Node-local HTTP handler separately owns its fixed method/path/auth/session semantics;
bridge source is forbidden from opening a socket, listening on a port, making HTTP, or
handling cookies/CSRF/session state.

Every bridge child is one operation and one executor-owned detached process group. The
executor retains the child handle plus PID/PGID/start identity and private stdin/stdout/
stderr/env/source bytes in `LOCAL_COMMAND_AUTHORITY`; it never forwards those bytes to a
callback, error, receipt, audit prompt, or artifact. Normal exit must prove the group
absent. Each DB-coupled immutable source awaits its final query/transaction and canonical
stdout drain, then terminates the one-shot process without leaving its connection pool or
another handle alive; it may never keep a pool for the next operation. Spawn error or the
fixed 30-second timeout follows bounded same-identity group
TERM, conditional KILL, and stable absence proof before the optional exact active-action
diagnostic and fixed sanitized failure may return. Reuse, a persistent DB worker, an orphaned descendant, unbounded waiting, and
PID-only cleanup are forbidden.

Executor self-test derives the declared bridge-operation set independently from the
physical 14-ID runtime map, frozen ledger, and exhaustive resource participation table,
and proves bidirectional descriptor/executable/env-profile/schema set equality, unique
keys, immutable source hashes, exact argv/cwd, and one dry dispatch of every descriptor.
Named hermetic negatives cover a missing/extra descriptor or executable, altered
source/import/argv/timeout/byte bound, unknown participation mode/channel, a duplicate
resource descriptor for a bound-runtime receipt, forbidden env key or misplaced
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, action/ref/payload attempts to select source/endpoint,
malformed canonical JSON in both directions, nonempty stderr, truncation, timeout group
cleanup, and private-byte egress. Trap fakes require zero process, filesystem, DB,
network, environment, or clock capability calls; they also prove the Node executor has
no application/core TypeScript import outside the immutable source-string constants.

`BROWSER_RUN_CODE_SOURCES` has exactly the 392 literal
`run-code/<exact-action-id>` keys from the run-code partition and owns each complete
immutable `(page) => ...` source builder, required non-secret ref signature, target
page contract, and result-key order. Common safe serializer/locator primitives may be
shared, but no generic `observation`, `assertion`, `route`, `log`, or UI-operation
source may switch on a literal ref: each observation name, assertion name, route
key+mode, log scope+channel, and ordinary UI action is already bound by its direct
source registry entry. `BROWSER_NATIVE_OPERATIONS` has exactly the seven native IDs
and owns exact argv/ref/output-grammar builders. `SCREENSHOT_PATHS` has exactly the 13
`ScreenshotId` keys and the full canonical repo-relative PNG values already declared by
the blueprint, each beginning with exact `_docs/_workflows/_smoke/task-540-`. Startup
proves bidirectional key coverage against the 13 screenshot actions and exact value-set
equality against `SMOKE_FIXTURE_BLUEPRINT.screenshotPaths`; a basename, absolute path,
alternate directory, duplicate value, or key/value derivation is not equivalent.
Missing, extra, inherited, duplicate, unused, or non-function registry members fail
plan construction.

The executor dispatches only by `executable.type` and then exact registry lookup. It
does not parse the `runtime/` or `run-code/` prefixes or derive an action ID from them.
Switching on `action.id`, `kind`, `builder`, scenario, action-name prefixes, ref
values, output schema, or prose is forbidden; an ID-specific special case must instead
be an explicit registry entry validated by bidirectional set equality.

The current 496 rows have been mechanically recounted from their exact builders and
must compile to this exhaustive disjoint partition:

```ts
const REQUIRED_EXECUTABLE_TYPE_COUNTS = deepFreezeExact({
  "runtime-operation": 76,
  "browser-run-code": 392,
  "browser-native": 14,
  "browser-screenshot": 13,
  "browser-global-list": 1,
});
const REQUIRED_NATIVE_ACTION_IDS = Object.freeze([
  "set-005-open",
  "set-009-login-email",
  "set-010-login-password",
  "ru-042-a-password",
  "ru-068-b-password",
  "ru-078-a2-password",
  "ru-092-b2-password",
  "ru-104-a3-password",
  "rc-019-related-tab-new",
  "rc-022-related-tab-origin",
  "rc-044-close-second-tab",
  "rc-045-origin-proof",
  "end-002-route-list",
  "end-006-close",
]);
const REQUIRED_GLOBAL_LIST_ACTION_IDS = Object.freeze(["end-007-session-absence"]);
```

The seven credential fills above are the only native fills. The other 16 fills, all
125 clicks, all 22 gotos, all 11 resizes, all presses/types/focus operations, routes,
observations, assertions, log reads, and browser cleanup observations are run-code.
The four native tab actions, one open, one route-list, one close, and seven secret
fills total 14. The 13 screenshot action IDs are set-equal to the blueprint screenshot
registry; `end-007-session-absence` alone is global-list. The 76 runtime IDs are
set-equal to the runtime table below. The run-code set is the exact 496-ID set minus
those four disjoint sets, not a permissive fallback. Startup asserts per-type counts,
per-source/per-operation counts, full 496-ID union equality, empty intersections,
descriptor/registry bidirectional set equality, ref closure, and the independent
ordinal partition `setup=1..55`, `flow=56..489`, `terminal=490..496`. This validation
does not execute an action or resolve a ref.

The two helper self-tests must include named hermetic negative cases for: one missing
and one extra key at the action and every executable-union variant; unknown
`runtime/<action-id>`, unknown `run-code/<action-id>`, unknown native operation,
unknown screenshot ID, missing/extra registry entry, duplicate registry key, and an
incomplete 495-action mapping; every unsupported/ref-misspelled discriminant; a
`SecretNameRef` in run-code/runtime/screenshot/nested-selector position and a raw
secret value disguised as literal/capture/fixture data; output schema/parser mismatch;
and all native grammar mutations (missing/extra LF, CRLF, BOM/NUL, nonempty stderr,
wrong PID/session/page URL, an inserted `### Ran Playwright code` or any other open
section, missing/extra/escaped/out-of-root snapshot, malformed tab
row/current marker, alternate route-list text, screenshot path drift, close with one
LF, and any nonempty global browser listing). JSON negatives cover zero/two layers,
`JSON.stringify(...)` string output, LF-only/undefined, duplicate keys, noncanonical
bytes, trailing whitespace, and unknown result keys. The positive executor self-test
runs the sole real executor loop with hermetic fake capabilities and requires its first
496 capability calls to cover the 496 action rows before cleanup. It then validates the
executor's separate browser/runtime receipt lanes, cleanup order, and finalization; it
does not manufacture a global 496-receipt executor trace. Independently, the contract
self-test's model loop proves 496 model dispatches and receipts, manifest-ID equality,
dense ordinals `1..496`, exact-once counts, and the disjoint `55/434/7` partition.
The executor self-test separately proves the derived executable partition
`76/392/14/13/1`, every declared
top-level/page/route/auth/theme transition in order, rejection of an undeclared,
duplicate, delayed, or stale-page route transition, and assignment of each validated
next `RunState` before the following precondition is checked. Its fake successful-create
handlers produce a non-empty exact acquisition corpus, while every non-acquiring action
produces an exact empty delta; descriptor/result/provenance/ledger equality is
bidirectional per action. Success and a response-lost fake both append through the same
private ledger, but the response-lost fake proves its adapter `finally` performs zero
queries and zero registry/ledger appends; phase 3 alone consumes the frozen pending
attempt, performs exactly one bounded query, validates it, and returns exactly one safe
failure-discovery delta. A mixed batch with one exact discovered create, one absent
create, one ambiguous create, and one independent already-acquired resource proves that
all safe deltas append, every per-key failure joins the common aggregate, the ambiguous
create grants no delete authority, only its exact intended parents/transitive ancestors
are blocked, and the independent resource still reaches cleanup plus absence. A query/
append from adapter `finally`, a batch-global discovery throw, a second phase-3 query or
append, a missing/duplicate pending attempt, and reuse of a mutable baseline/request
object all fail. The compiled acquired cleanup-key set must equal the exact cleaned and
absence-proven set. Named tuple-gate negatives skew, omit, and duplicate each of
`provenance`, `delete`, and `absence` for one persistent key, one terminal key, and the
final union while preserving the old bare-key set and total count; every case must fail.
A skipped, duplicate, reordered, setup-prepass, post-setup replay, unledgered create,
extra ledger core/edge, wrong acquisition owner, recompilation/re-expansion after a plan
is frozen, or cleanup-set drift fails. No real process, filesystem, DB, network, browser,
caller callback, or environment capability is touched.

The same self-test runs both phase-1 branches. A complete 496-row success trace ending
in `end-007-session-absence` must retain its browser invocation/receipt counts unchanged
through cleanup while only the acquired private-root identity is removed. Every sampled
early-failure ordinal derives and executes the exact missing subset of release/unroute,
native route-list, close, and global-list operations once as private diagnostics, then proves the session
and root absent; replay, an extra route-list/log command, or a canonical receipt fails.
Phase 4 proves object identity from its input `RunState` to the disposal transition,
requires independent context-absence evidence, sets only `apiContexts:"closed"`, and
deep-freezes the result. Phase 5 rejects a closed-state-only or proof-only input. After
terminal discovery it creates exactly one frozen final cleanup plan and graph; phases 6
and 7 receive that graph by identity while their phase-specific action plans remain the
original objects. Named negatives reject graph cloning, recompilation, substitution,
phase-local fallback, and a terminal session/audit/access failure that does not block its
exact synthetic user and transitive destructive parents.

The contract self-test additionally pins the upload fixture literal, canonical base64
round trip, 68-byte decoded length, PNG signature, and exact SHA-256, and rejects an
altered byte/base64 spelling, size, digest, encoding, extra key, fixture path, or second
byte authority. The executor self-test dispatches `runtime/set-030-media-upload` once
through its exact registry entry, has the fake multipart sink independently hash the
received 68 bytes, and proves equality to the blueprint digest/name/MIME tuple. Named
trap negatives reject a handler that reads a path, generated/caller/environment bytes,
or any value other than the deep-frozen blueprint upload fixture.

`repositoryMutationPolicy` is exact `{mode:"none"|"allowlist",paths:string[]}`.
Every non-screenshot action has `mode:"none"` and exact `paths:[]`; each of the 13
screenshot actions alone has `mode:"allowlist"` with its one canonical repo-relative
TASK-540 PNG path. Before and after every action, including a throwing action, the
executor calls `snapshotRepository` and strictly validates a safe snapshot containing
the unchanged HEAD/ref/index hashes plus a sorted map of repo-relative path metadata
and content hashes (registered ignored PNG paths are included explicitly; file bytes
never cross the callback). It computes the path-level delta itself: `none` requires an
empty delta, while `allowlist` requires every changed path to be in the exact declared
set and the screenshot adapter must independently prove the expected create. A HEAD,
index, `.git`, mode/type, symlink, or undeclared path change always fails. Success must
end at the initial repository snapshot plus exactly the 13 acquired screenshots;
failure cleanup must restore the initial snapshot exactly after identity-safe removal.
The private failure-removal phase derives its temporary allowlist only from acquired
screenshot ledger records and receives its own before/after snapshot comparison; it
cannot authorize any other path.
A final whole-run hash without these per-action comparisons, or merely copying the
policy into a receipt, is not enforcement.

The canonical implement workflow must not reject merely because the caller already
has staged entries. Before any agent dispatch or task mutation it read-only captures
the exact resolved Git index file identity and byte SHA-256 plus the SHA-256 of the
complete NUL-delimited `git ls-files --stage -z` projection. Any initially empty or
non-empty staged baseline is acceptable only when both projections remain
byte-identical through every dispatch, smoke action, cleanup, closure mutation, and
final gate. A concurrent index change fails closed; the workflow never adopts the new
baseline mid-run. Agents never run `git add`, `git restore --staged`, `git reset`,
`git stash`, commit, or any other index writer, and the script never unstages or
recreates an owner's pre-existing staged state.

The exact selector/builder registry is source-grounded and rejects aliases:

```ts
const S = deepFreezeExact({
  loginEmail: 'input#email[name="email"][type="email"]',
  loginPassword: 'input#password[name="password"][type="password"]',
  loginSubmit: 'button[type="submit"]:text-is("Sign in")',
  canvas: '[data-screen-authoring-canvas="true"]',
  blockRoot: (id: string) => `[data-screen-block-id="${id}"]`,
  palette: (label: "Button" | "Tabs" | "Text" | "Field" | "Image") =>
    `div[data-screen-block-library="true"] button:text-is("${label}")`,
  selectBlock: (id: string) => `button[data-screen-select-block="${id}"]`,
  buttonAffordance: (id: string) =>
    `[data-screen-block-id="${id}"] [data-screen-button-affordance="true"]`,
  boundField: '[data-screen-bound-field="true"]',
  fieldOption: (label: string, type: string) => `[role="option"]:text-is("${label} (${type})")`,
  staticLink: 'button:text-is("Use static link")',
  staticLinkInput: 'input[placeholder="https://…"]',
  paragraph: 'textarea[placeholder="Paragraph text"]',
  tabLabel: (id: "tab-1" | "tab-2" | "tab-3") => `[data-screen-tab-label="${id}"]`,
  editTab: (label: string) => `button[aria-label="Edit content for ${label}"]`,
  addTab: 'button:text-is("Add tab")',
  runtimeTab: (label: string) => `[role="tab"]:text-is("${label}")`,
  scopedRuntimeTab: (blockId: string, label: string, scope = "") =>
    `${scope} [data-screen-block-id="${blockId}"] [role="tab"]:text-is("${label}")`.trim(),
  previewRuntimeTab: (blockId: string, label: string) =>
    `[data-preview-shell="roomy"] [data-preview-device="desktop"] [data-screen-block-id="${blockId}"] [role="tab"]:text-is("${label}")`,
  runtimePanel: (id: string) => `[role="tabpanel"][data-screen-runtime-tab="${id}"]`,
  builderSave: 'button:text-is("Save")',
  preview: 'button:text-is("Preview")',
  previewShell: '[data-preview-shell="roomy"] [data-preview-device="desktop"]',
  previewClose: '[data-preview-shell="roomy"] button[data-slot="dialog-close"]',
  keepEditing: 'button:text-is("Keep editing")',
  discard: 'button:text-is("Discard and continue")',
  entrySave: 'button:text-is("Save")',
  presentationSave: 'button:text-is("Save presentation")',
  presentationClear: 'button:text-is("Clear selected presentation")',
  relatedListRoot: (blockId: string) => `[data-screen-block-id="${blockId}"]`,
  relatedRow: (blockId: string, entryId: string) =>
    `[data-screen-block-id="${blockId}"] [data-screen-related-entry="${entryId}"]`,
  relatedSkeletonChip: (blockId: string) =>
    `[data-screen-block-id="${blockId}"] span:text-is("Chip")`,
  relatedEmpty: (blockId: string, target: string) =>
    `[data-screen-block-id="${blockId}"] p:text-is("No related ${target}.")`,
  fieldBadge: (blockId: string, label: "Editable" | "Read" | "Text") =>
    `[data-screen-block-id="${blockId}"] [data-slot="badge"]:text-is("${label}")`,
  relatedAlert:
    '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable"))',
  relatedRetry:
    '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable")) button:text-is("Retry")',
  metadata: 'button[aria-label="Show field metadata"]',
  browseMedia: 'button:text-is("Browse media")',
  mediaCard: (title: string) => `button:has(p:text-is("${title}"))`,
  relationEntry: (blockId: string, title: string) =>
    `[data-screen-block-id="${blockId}"] button:has(p:text-is("${title}"))`,
  contentEditable: (blockId: string, label: string) =>
    `[data-screen-block-id="${blockId}"] [role="textbox"][aria-label="${label}"]`,
  toneTrigger: '[data-presentation-control="tone"] button[role="combobox"]',
  muted: '[role="option"]:text-is("Muted")',
  recordsLink: (screenId: string) => `a[href="/admin/advanced/custom-screens/${screenId}/entries"]`,
  recordActions: 'button[aria-label="Record actions"]',
  editRecord: '[role="menuitem"]:text-is("Edit record")',
  builderLink: (screenId: string) => `a[href="/admin/advanced/custom-screens/${screenId}"]`,
  userMenu: (name: string) => `header button:has(span.block.text-sm:text-is("${name}"))`,
  bootstrapUserMenu: 'header button[data-slot="dropdown-menu-trigger"]:has(span.block.text-sm)',
  signOut: '[role="menuitem"]:text-is("Sign out")',
  colorMode: 'button[aria-label="Toggle dark mode"]',
  panelHide: 'button[aria-label="Hide panel"][aria-pressed="true"]',
  panelShow: 'button[aria-label="Show panel"][aria-pressed="false"]',
  canvasScroller: '[data-screen-editor-canvas-scroller="true"]',
  editorPanel: '[data-screen-editor-panel="true"][role="region"]',
  secondTabTitle: 'textarea[placeholder="Enter post title..."]',
  secondTabSave: 'button:text-is("Save draft")',
});
```

The runtime renderer intentionally owns focus scoping through its React root ref and
does not emit a `[data-screen-runtime-root]` DOM marker. Smoke code must not add or
depend on that legacy selector. `observe(preview-shell-desktop)` waits for the exact
desktop preview shell and proves the captured outer and nested Tabs roots are each
unique, visible, and positive-geometry below it. Entry-draft readers scope editable
content below the exact `S.canvasScroller` surface and its rendered sections. The
cross-renderer ID proof resolves the captured outer Tabs root independently below the
builder `S.canvas` and desktop `S.previewShell`, then concatenates only the tab/panel
IDs owned by the exact outer `3 + 3` and nested `2 + 2` tab/panel shapes from both
roots (`10` IDs per realm, `20` total); it never queries the global document or a
production-only test hook. All captured block-root selectors are rendered through the
canonical CSS-string encoder before browser execution.

`expandPath()` requires exact `PathTemplate` keys, substitutes every declared capture
once, percent-encodes path segments, rejects unresolved/extra braces, and joins Admin
paths to the exact Admin origin. The same expansion rule owns route templates. It
never stringifies a `CaptureRef` or accepts an agent-composed URL.

`api(name)` is one request through the isolated bootstrap API session and
`apiRead(name)` is a separate request. `isolatedApiSessionLogin(user)` creates one
empty-jar APIRequestContext and issues exactly one login request for the declared
identity; `isolatedApiSessionCsrfCapture(user)` then issues exactly one `/auth/csrf`
request in that isolated jar. The cookie, unchanged session token/hash, and CSRF value
remain WeakMap-private. `isolatedApiSessionApiAs(user,name)` and
`isolatedApiSessionApiReadAs(user,name)` each issue exactly one domain request through
that isolated context and never touch `page.route`. There is no implicit 401/403 CSRF
refresh or retry: any non-success response fails closed. `/auth/csrf` replaces only
`csrfTokenHash` in the current session row; it does not rotate the session token or its
hash. That replacement can stale a previously cached browser CSRF token for the same
session, so acquiring it in the browser's active jar could corrupt the later UI flow.
Each synthetic-user
builder first requires the matching exact topbar observation and locally captured user
ID, strictly parses the response projection, and emits neither cookie nor CSRF value.
`fixture(set-user-a-preference-false)` and
`fixture(set-user-b-preference-false)` each invoke exactly one local
`setUserSetting(capturedUserId, "customScreens.entry.preferences", normalizedValue)`
service operation with the strict domain-normalized exact value
`{version:1,showFieldMetadata:false}`. `fixtureRead(user-a-preference)` and
`fixtureRead(user-b-preference)` each invoke exactly one local
`getUserSetting(capturedUserId, "customScreens.entry.preferences")`, recursively
strict-normalize the returned value, and emit only literal `false`. These four builders
accept no Admin API/HTTP adapter and no direct DB write/read adapter. Every terminal-
delta `session-task`, `audit-log-task-ua`, and `access-log-task-ua` row carrying one of
the four exact task User-Agents joins cleanup inventory/absence proof. Early captured
session IDs are cross-checks, never a substitute for terminal discovery. Every
`observe(...)` row maps to its own complete direct `run-code/<action-id>` source; the
observation name remains audit identity only and never selects implementation.

`apiPublicRead(auth-bot-protection)` uses only `userAgents.publicPreflight`; isolated
bootstrap and A contexts use only `userAgents.apiBootstrap` and `userAgents.apiUserA`.
The browser uses only `userAgents.browser`. The executor validates these four strings
as non-empty, pairwise distinct, task-prefixed, bounded User-Agent values and rejects
default/inherited substitution.

At the start of `set-001-storage-preflight`, while the helper is stopped and before
the first HTTP request bearing any of those four User-Agents, the row's first
fail-closed sub-proof first requires one exact persisted `setup.completed` setting row
whose decoded value is boolean `true`; missing/false/non-boolean/duplicate state fails
before helper or browser startup, so this smoke never opens or completes the first-run
wizard and never mutates global setup settings. It then freezes the private baselines:
the exact task-User-Agent access-log UUID set, the exact task-User-Agent audit-log UUID
set selected only by `metadata.userAgent`, the complete bounded sorted session-row UUID set as
`sessionStartBaselineIds`, and the stable local-storage DB/root snapshot as
`storageStartBaseline`, the proof-only complete `site.contentRoutes` settings-row
baseline, plus the canonical pre-existing bootstrap Admin row selected without calling
`getUserByEmail`. The executor privately computes
`normalizedBootstrapEmail = normalizeEmail(ADMIN_EMAIL)` and
`bootstrapEmailHash = hashEmail(normalizedBootstrapEmail)`, performs one read-only
two-row-bounded user query whose predicate is exact
`email_hash = bootstrapEmailHash OR email IN (bootstrapEmailHash, normalizedBootstrapEmail)`,
and requires exactly one row satisfying all of:
`status === "active"`, `emailHash === bootstrapEmailHash`,
`email === bootstrapEmailHash`, `isEncryptedEmail(emailEncrypted) === true`, and
`decryptEmail(emailEncrypted) === normalizedBootstrapEmail`. A joined, bounded role
read must additionally prove exactly one membership in the single canonical role whose
name is exact `"admin"` and whose normalized permissions are exact `["*"]`; every
bootstrap `user_roles` tuple is frozen for the terminal unchanged proof. The query
freezes the complete raw user row plus exact `id`, `lastLoginAt`, and `updatedAt`;
raw PII, password hash, encrypted email, role rows, and timestamps never egress.
Zero/duplicate/inactive/wrong-role/legacy-noncanonical bootstrap rows are infrastructure
failures instead of allowing `getUserByEmail` to perform an implicit migration.

The `site.contentRoutes` member reads the exact settings key with a two-row bound,
freezes either exact row absence or the complete `{key,value,updatedAt}` row, and
requires that no normalized route has `type` equal to any of the four task content-type
slugs. It has `deleteAuthority:false` and `restoreAuthority:false`: immediately before
each task content-type deletion the current complete row/absence must still be
byte-identical to the baseline, and after all four deletions it must again be
byte-identical. Drift blocks the affected delete and closure; cleanup never overwrites
or reconstructs this global setting. This proof is required because
`deleteContentType()` conditionally prunes `site.contentRoutes`.

Constructing the storage member first performs the exact
persisted-setting/top-level service value, root identity, and stable-walk validation
specified above; those checks and all frozen results belong to this same first
sub-proof. No helper launch or task-UA HTTP may run until every member succeeds. The access-log
read selects only rows whose User-Agent is
byte-equal to one of `[browser, publicPreflight, apiBootstrap, apiUserA]` and stores
their exact UUIDs as `accessLogStartBaselineIds`; the session read is a complete
bounded UUID inventory whose overflow is an infrastructure failure; and the storage
baseline binds the bounded media DB-row/exact-key projection to the canonical root identity
and stable sorted manifest. Query, row, path, and manifest bytes stay private. Every
audit-log baseline independently selects only rows whose recursively strict metadata
object contains a `userAgent` byte-equal to one of those exact four values and stores
their UUIDs as `auditLogStartBaselineIds`; substring/actor/action selection is forbidden.
After the final
task-User-Agent request—including fixture deletion traffic—has settled, the executor
bounded-polls the same exact-four-User-Agent predicates for access logs, audit logs,
and session rows until two consecutive sorted UUID sets for all three tables are
byte-identical. It then freezes `taskAccessLogIds = stableAccessIds -
accessLogStartBaselineIds`, `taskAuditLogIds = stableAuditIds -
auditLogStartBaselineIds`, and `taskSessionIds = stableSessionIds -
sessionStartBaselineIds`, where terminal session rows must also carry one of the four
exact task User-Agents. Every delta row is task-owned regardless of authentication
state: this includes null-user login/public log rows and authenticated bootstrap, A,
or B rows, plus a session created immediately before a failed action returned its ID.
A row is never selected by user A/B alone, a prefix/substring User-Agent match, or an unrelated/default User-Agent.
Pre-start rows (including a pre-existing row with the same nonce marker), different-UA
rows, and unrelated rows remain untouched. Failure to reach a bounded stable set fails
cleanup and closure.

Each frozen task access-log UUID creates exactly one cleanup resource with
`kind:"access-log-task-ua"`, `identifierType:"db-id"`, and that UUID as its subject
identifier. Its `ownerSubjectIdentifier` is the row's exact non-secret session UUID
when present, otherwise its exact non-secret user UUID when present, otherwise `null`;
this field is correlation evidence and never broadens deletion authority. Every other
kind uses the exhaustive owner mapping in the acquired-resource ledger below. Cleanup deletes
each exact frozen UUID separately, proves each absent before deleting any task session
or user, and then bounded-polls the exact after-baseline task-UA predicate to stable
absence. No per-user access-log cleanup kind, bootstrap exclusion, or wildcard
access-log cleanup kind exists.

Each frozen task audit-log UUID analogously creates one `audit-log-task-ua` cleanup
resource with `identifierType:"db-id"`, that exact UUID, and
`ownerSubjectIdentifier` equal to its exact non-secret actor UUID or `null`; metadata,
PII, IP, and User-Agent bytes remain private. Each frozen task session UUID creates one
generic `session-task` resource with `identifierType:"db-id"`, the exact UUID, and
`ownerSubjectIdentifier` equal to its exact non-secret `user_id`. No UI/API/identity-specific session kind exists, and
capturing a session during a successful action is correlation only: the terminal
baseline delta is the exhaustive authority. Cleanup deletes and proves every exact
audit log before every exact access log, then deletes/proves every exact session before
task users; both log predicates are stable-polled back to their start-baseline sets.
No wildcard, user-wide, token/hash, cookie, or revoked-only deletion is allowed.

Bootstrap browser/API login attempts can create a session and call `updateLastLogin`
before their client-visible action succeeds; `updateLastLogin` mutates both
`lastLoginAt` and `updatedAt` before the login audit finishes. Therefore the private
executor
records one proof-only `bootstrap-user-login-state` resource with the exact bootstrap
DB UUID, `identifierType:"db-id"`, `deleteAuthority:false`, and
`restoreAuthority:true`; it is excluded from both staged delete-subject sets. Per
`RESOURCE_KIND_CONTRACTS` it has required provenance, restore, and post-restore
byte-identity operation/schema pairs, but never a delete triple. Every bootstrap login adapter, including the UI
login and isolated bootstrap API login, executes one private bounded complete-row read
immediately before the request and one in an unconditional `finally` immediately after
the attempt settles or throws. That `finally` bounded-polls the row and the exact
request/server-side-effect boundary to two consecutive identical observations, so a
server continuation after a client transport failure cannot race past capture. The
post-read must keep all non-login columns and all
bootstrap role tuples byte-identical; if the two timestamp columns changed, even when
the response failed, their exact nullable pair becomes the newest smoke-owned CAS
expected value. If neither changed, the prior expected pair remains authoritative.
Any one-column-only change, non-timestamp/role drift, missing row, or ambiguous read
fails closed but does not skip terminal restoration. If transport failure prevents the
inline completion barrier, terminal exact-UA discovery may bind one late pair only
when an exact bootstrap session/audit row from that entered attempt proves the delayed
server completion and every other row/role byte is unchanged; otherwise it cannot
claim the timestamps.

After the last task HTTP request and API-context disposal, the executor attempts one
ID-scoped restoration in a DB transaction. It locks the exact bootstrap row
`FOR UPDATE` and the exact membership/role rows `FOR SHARE`, verifies every unchanged
column and role tuple against preflight, and
updates only `last_login_at` and `updated_at`. The conditional update binds the UUID,
every unchanged column, and both newest smoke-owned timestamp values; nullable values
use PostgreSQL `IS NOT DISTINCT FROM`, including nullable `last_login_at`, rather than
`=`. Zero or multiple affected rows fails instead of overwriting a concurrent legal
mutation. A separate bounded read in the same transaction and a fresh read after
commit must make the complete user row and all role tuples byte-identical to the
private preflight baseline. Failure cleanup attempts this same CAS once in its
outermost deterministic path whenever any bootstrap login was entered, including a
partial login whose action never returned success. No further login or task HTTP is
allowed after restoration starts; restoration failure is retained privately and
blocks canonical evidence without suppressing independent screenshot/process cleanup.

Phase 8 must expose separately classified reconciliation, CAS, uncertain-outcome
baseline-proof, ordinary post-restore-proof, and runtime-receipt substages. It seals the
newest smoke-owned timestamp pair before starting exactly one nullable-safe CAS bridge
write attempt. A validated bridge result retains the existing in-transaction and after-
commit complete-row/role proof. If bridge completion becomes uncertain after that one
attempt may have committed, the executor performs exactly one additional read-only,
ID-scoped complete-user-row plus complete-role-tuple comparison with the immutable
preflight baseline. Only byte-identical equality may resolve the state as
`already-restored-after-uncertain-outcome`; that resolution performs zero second CAS or
other write. A row still at the newest owned pair, unknown-column drift,
missing/duplicate row, or role drift fails closed without retry, repair, or timestamp
reconstruction. Receipt construction is a separate substage after restoration state is
sealed: its failure maps only to `bootstrap_restore_receipt_failed`, cannot erase the
proven restoration state, and cannot call restoration again. No later process may
recover an exited run by guessing its destroyed private timestamp baseline.

```ts
const newestOwnedPair = reconcileAndSealNewestBootstrapPair(attempts);
const casAttempt = await runBootstrapCasBridgeOnce({ baseline, newestOwnedPair });
let resolution;
if (casAttempt.kind === "validated") {
  resolution = requireValidatedInTransactionAndAfterCommitProof(casAttempt);
} else if (casAttempt.kind === "outcome-uncertain") {
  const oneReadOnlyProof = await readCompleteBootstrapRowAndRolesOnce(baseline.id);
  resolution = requireByteIdenticalBaseline(oneReadOnlyProof)
    ? "already-restored-after-uncertain-outcome"
    : failClosed("bootstrap_uncertain_baseline_failed");
} else {
  failClosed("bootstrap_cas_failed");
}
sealBootstrapRestorationResolution(resolution);
emitBootstrapRestoreReceiptOnce(resolution); // no restore/write authority
```

Hermetic production-path tests and source mutants must cover commit plus lost bridge
output, lost output without commit, newest-pair selection across multiple login attempts,
stale-pair substitution, unknown column drift, role drift, missing/duplicate row, zero
or two uncertain-outcome reads, any second CAS/write, acceptance without complete byte
identity, and receipt failure after a proven restore. They must prove exact substage-
class mapping and that receipt failure is retained separately from restoration failure.
`assert(name)` is `expectedVisibleAssertionCommand`; `blocksBefore(name)` and
`captureNew(name,type,before)` are the two read-only block-set commands around exactly
one palette click. `route(key,operation)`, `screen(path)`, and `logs(scope,channel)` are
the already registered exact builders. Route states are
`absent -> installed -> hit -> released -> unroute` for delayed routes and
`absent -> installed -> hit -> unroute` for malformed routes. A row's precondition is
the previous row's postcondition plus its explicit dependencies.

The local executor timestamps every manifest boundary with one monotonic clock. It
imports and pins the source-owned `SCREEN_PREFERENCE_SETTLED_RETENTION_MS === 30_000`
and requires both unmounted windows, `ru-049` completion→`ru-052` completion and
`ru-054` completion→`ru-056` completion, to remain below the conservative 20,000 ms
limit. Timeout fails the attempt before a retention assertion; it cannot fall through
to default `false`. The isolated API contexts never become browser subscribers and
cannot reset, refresh, or stand in for retained browser coordinator state.

No login action may run before both read-only auth preflights. The public exact GET
`/admin/api/auth/bot-protection` must strictly parse only
`{enabled,provider,siteKey,enforceOnLocalhost}` and require `enabled === false`; only
`{"enabled":false}` may egress. Enabled bot protection is an infrastructure failure:
the workflow neither attempts CAPTCHA nor assumes a localhost exemption and never
mutates security settings. Separately, local `getSecuritySettings()` reads the session
policy plus the exact `security.csrf.headerName` into WeakMap-private state. The CSRF
header name must be a non-empty valid HTTP field name and never egresses. The session
policy requires `singleSession === false` plus `maxPerUser <= 0 || maxPerUser >= 2`. Only
`{"singleSession":false,"effectiveMaxPerUserAtLeast2":true}` may egress. This guards
the browser+isolated session pair from the revocation behavior in
`sessionService.ts:112-153`; a failing policy aborts before browser or isolated login,
without changing it.

The same read-only settings authority reads only the active auth bucket from
`{enabled,buckets:{auth:{windowSeconds,maxRequests}}}` and the private bridge returns
the flat exact projection `{enabled,maxRequests,windowSeconds}`; no other security
setting may egress. Every HTTP context uses its exact unique blueprint User-Agent, and
direct source `run-code/set-006-logger` sets the browser context User-Agent before the
first application request. The frozen planner mirrors `resolveRateLimitBucket`,
`resolveRateLimitIdentifier`, and the authenticated-user precedence in
`rateLimit.ts`: internal domain calls are classified `admin_read`/`admin_write`, but
authenticated Admin requests consume neither counter because `checkRateLimit()` returns
for those two buckets when `isAuthenticated` is true. They are excluded from the rate
plan. Among the exact enumerated `/auth/*` calls, unauthenticated login uses
IP+UA+lowercased email, unauthenticated `/auth/me` and bot-protection use IP+UA, and
authenticated auth calls use user ID.
It counts source-required login calls (`login` then forced `me` plus post-assign
`me`/install-status), bot-protection/login-page reads, first-document CSRF
acquisitions, logouts, every deliberate full Admin reload, and the related-entry
second tab. Six explicit barriers split those calls into seven fixed-window epochs:
`bi-016a`, `bi-061a`, `tc-032a`, `rc-017b`, `ru-076b`, and `ru-100a`. The exact
maximum request count for any one limiter identity in those epochs is respectively
`9`, `10`, `9`, `10`, `9`, `7`, and `6`. The detailed frozen epoch plan also pins
bootstrap/user-A/user-B, browser-anonymous, browser-login-email, isolated-login, and
public-preflight identities separately. If rate limiting is enabled, require safe
integer `1 <= windowSeconds <= 60` and `maxRequests >= 10`; otherwise the smoke is an
infrastructure failure before login. Disabled rate limiting still records the exact
projected bucket. The workflow never resets limiter state or mutates settings.

`dispatchAndCaptureSelectionHandle()` is one registered
`playwright-cli --raw run-code` invocation. Within it, the builder attaches one
temporary capturing `click` listener to the exact selection handle, retains the actual
`MouseEvent` object in closure state, performs one Playwright
`locator(S.selectBlock(id)).click()` (never `dispatchEvent`), and removes the listener
in `finally`. On the immediately following microtask it reads that same event object's
exact `defaultPrevented === false`, the active element, and the wrapper's
`data-selected` state, then returns only the strict sanitized projection. A missing,
duplicate, synthetic, differently targeted, or non-cancelable event fails closed.

Each real `S.signOut` click has exactly one immediately following settlement observer:
`ru-040a`, `ru-066a`, `ru-076a`, `ru-090a`, and `ru-102a`. The observer requires
`page.url()` byte-equal to `origins.admin + paths.login`, and exactly one each of
`S.loginEmail`, `S.loginPassword`, and `S.loginSubmit` with positive computed geometry;
only then may credential fill begin. `ru-090a` additionally requires the exact captured
preference Request object's bounded `net::ERR_ABORTED` latch. A click receipt alone,
generic login text, redirect start, or old-realm DOM cannot satisfy settlement.

Each `authRateWindowBarrier()` is an explicit registered rate wait. With limiting
enabled it waits exactly one configured fixed window plus one second, which
conservatively expires every task-owned identity bucket from the preceding epoch;
disabled limiting skips the timer but performs the same bounded realm-stability proof.
A context-wide request listener remains active through the after-sample and requires
zero `/admin/api/auth/*` traffic during the barrier. The before/after samples require
the exact Admin URL and navigation count to remain byte-identical and the document root
to have positive finite geometry in both samples. The generated `playwright-cli`
callback parses origins and pathnames with its own fail-closed parser for canonical
lowercase-HTTP(S) browser URLs with DNS/IPv4 authorities and bounded numeric ports; it
must not depend on the unavailable host-global `URL` constructor. Unsupported or
malformed page/request authorities fail closed rather than becoming harmless
cross-origin traffic, and listener cleanup remains exact. Only
`{"barrierSatisfied":true}` may egress. For `ru-100a`, B continuity is compositional:
`ru-099` proves B immediately before the barrier and `ru-101` targets the exact B user
menu immediately after it. A barrier never inspects or prunes limiter state, resets a
bucket, mutates settings, holds a delayed route, or claims anything about preference
coordinator state. No hidden sleep or limiter reset is permitted.

The following tables are the exhaustive ordered source of `SMOKE_ACTION_MANIFEST`;
the implementation may generate ordinals but may not insert, remove, merge, reorder,
or rename rows.

#### Setup and fixture acquisition

| ID                                     | Page    | Kind / exact builder                       | Precondition -> captured output -> postcondition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dependencies / route transition                           |
| -------------------------------------- | ------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `set-001-storage-preflight`            | runtime | `storage(preflight-and-snapshot)`          | helper stopped/no task-UA request issued -> first sub-proof requires exact persisted `setup.completed:true`, freezes the exact canonical bootstrap Admin identity/role, exact task-UA access/audit-log and complete bounded session-row baselines, plus proof-only complete `site.contentRoutes` row/absence with all task slugs absent; validates exact-one persisted `storage.driver:"local"` and private `storage.local.dir` rows equal top-level local config + `MEDIA_STORAGE`/`MEDIA_DIR` absent, then freezes the bound storage DB/root baseline; egress exact missing row/file zero only -> setup/bootstrap/routes/storage proven | `- / absent -> absent`                                    |
| `set-002-helper-launch`                | runtime | `host(helper-launch)`                      | storage proven, ports absent -> owned PID/lineage -> host starting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `set-001 / absent -> absent`                              |
| `set-003-admin-health`                 | runtime | `health(admin)`                            | owned host -> status -> Admin healthy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `set-002 / absent -> absent`                              |
| `set-004-front-health`                 | runtime | `health(front)`                            | Admin healthy -> status -> front healthy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `set-003 / absent -> absent`                              |
| `set-004a-bot-protection-preflight`    | runtime | `apiPublicRead(auth-bot-protection)`       | host healthy/no login attempted -> strict four-key public response/private fields -> sanitized exact `{"enabled":false}` or infrastructure fail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `set-004 / absent -> absent`                              |
| `set-004b-session-policy-preflight`    | runtime | `settingsRead(session-policy)`             | bot protection disabled -> WeakMap-private session policy + validated exact `security.csrf.headerName` -> sanitized exact `{"singleSession":false,"effectiveMaxPerUserAtLeast2":true}` or infrastructure fail                                                                                                                                                                                                                                                                                                                                                                                                                             | `set-004a-bot-protection-preflight / absent -> absent`    |
| `set-004c-auth-rate-budget-preflight`  | runtime | `settingsRead(auth-rate-budget)`           | session policy proven -> exact active auth bucket projection + frozen identity/window budget computation -> capacity proven or infrastructure fail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `set-004b-session-policy-preflight / absent -> absent`    |
| `set-005-open`                         | p1/0    | `open(about:blank)`                        | auth/session/rate preflights proven -> page identity -> original page open                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `set-004c-auth-rate-budget-preflight / absent -> absent`  |
| `set-006-logger`                       | p1/0    | `logger-install`                           | blank original -> exact unique browser User-Agent applied before network + `true` -> immutable context logger/navigation/auth-challenge tracker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `set-005 / absent -> absent`                              |
| `set-007-goto-login`                   | p1/0    | `goto(paths.screens)`                      | logger installed + setup preflight proven -> URL -> login only; wizard is forbidden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-006 / absent -> absent`                              |
| `set-008-resize`                       | p1/0    | `resize(1280,900)`                         | login visible/wizard absent -> viewport -> 1280x900                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-007 / absent -> absent`                              |
| `set-009-login-email`                  | p1/0    | `fill(S.loginEmail,$ADMIN_EMAIL)`          | login visible -> discarded -> email filled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `set-008 / absent -> absent`                              |
| `set-010-login-password`               | p1/0    | `fill(S.loginPassword,$ADMIN_PASSWORD)`    | email filled -> discarded -> credentials filled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `set-009 / absent -> absent`                              |
| `set-011-login-submit`                 | p1/0    | `click(S.loginSubmit)`                     | credentials filled -> navigation -> bootstrap authenticated                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `set-010 / absent -> absent`                              |
| `set-011a-bootstrap-auth-settled`      | p1/0    | `observe(bootstrap-auth-identity-settled)` | submit navigation started -> post-login Admin URL + positive-geometry `S.bootstrapUserMenu` -> bootstrap realm settled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `set-011 / absent -> absent`                              |
| `set-011b-bootstrap-api-login`         | runtime | `isolatedApiSessionLogin(bootstrap)`       | bootstrap UI identity settled -> one login in empty isolated jar + exact session-row inventory -> isolated bootstrap API session acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `set-011a-bootstrap-auth-settled / absent -> absent`      |
| `set-011c-bootstrap-csrf-capture`      | runtime | `isolatedApiSessionCsrfCapture(bootstrap)` | isolated bootstrap session acquired -> one CSRF request/private rotated capability -> bootstrap unsafe API actions authorized without changing the browser jar                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `set-011b-bootstrap-api-login / absent -> absent`         |
| `set-012-user-a-create`                | runtime | `fixture(create-user-a)`                   | bootstrap API capability proven -> captured server ID -> user A acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `set-011c-bootstrap-csrf-capture / absent -> absent`      |
| `set-013-user-a-proof`                 | runtime | `fixtureRead(user-a)`                      | user A acquired -> exact safe projection/Admin role -> user A proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `set-012 / absent -> absent`                              |
| `set-014-user-b-create`                | runtime | `fixture(create-user-b)`                   | user A proven -> captured server ID -> user B acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `set-013 / absent -> absent`                              |
| `set-015-user-b-proof`                 | runtime | `fixtureRead(user-b)`                      | user B acquired -> exact safe projection/Admin role -> users proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-014 / absent -> absent`                              |
| `set-016-editable-type-create`         | runtime | `api(create-content-type-editable)`        | users proven/exact names+configuration body without field IDs -> captured ID + exact authored slug -> editable schema acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `set-015 / absent -> absent`                              |
| `set-017-editable-type-proof`          | runtime | `apiRead(content-type-editable)`           | editable schema acquired -> exact nine names/configs + canonical `fieldsFromSchema()` IDs -> editable schema proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-016 / absent -> absent`                              |
| `set-018-related-a-type-create`        | runtime | `api(create-content-type-related-a)`       | editable schema proven/exact names+configuration body without field IDs -> captured ID + exact authored slug -> A schema acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-017 / absent -> absent`                              |
| `set-019-related-a-type-proof`         | runtime | `apiRead(content-type-related-a)`          | A schema acquired -> exact field/slug + canonical `field-label` reconstruction -> A schema proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-018 / absent -> absent`                              |
| `set-020-related-b-type-create`        | runtime | `api(create-content-type-related-b)`       | A schema proven/exact names+configuration body without field IDs -> captured ID + exact authored slug -> B schema acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `set-019 / absent -> absent`                              |
| `set-021-related-b-type-proof`         | runtime | `apiRead(content-type-related-b)`          | B schema acquired -> exact field/slug + canonical `field-label` reconstruction -> all schemas proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `set-020 / absent -> absent`                              |
| `set-021a-related-failure-type-create` | runtime | `api(create-content-type-related-failure)` | A/B schemas proven/exact names+configuration body without field IDs -> captured ID + exact authored slug -> failure schema acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-021 / absent -> absent`                              |
| `set-021b-related-failure-type-proof`  | runtime | `apiRead(content-type-related-failure)`    | failure schema acquired -> exact field/slug + canonical `field-label` reconstruction -> all four schemas proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `set-021a-related-failure-type-create / absent -> absent` |
| `set-022-related-a1-create`            | runtime | `api(create-related-entry-a1)`             | A schema proven/exact title+slug+data body -> captured ID -> A1 acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `set-021b-related-failure-type-proof / absent -> absent`  |
| `set-023-related-a1-proof`             | runtime | `apiRead(related-entry-a1)`                | A1 acquired -> exact title/slug/data -> A1 proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-022 / absent -> absent`                              |
| `set-024-related-a2-create`            | runtime | `api(create-related-entry-a2)`             | A1 proven/exact title+slug+data body -> captured ID -> A2 acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `set-023 / absent -> absent`                              |
| `set-025-related-a2-proof`             | runtime | `apiRead(related-entry-a2)`                | A2 acquired -> exact title/slug/data -> A2 proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-024 / absent -> absent`                              |
| `set-026-related-b1-create`            | runtime | `api(create-related-entry-b1)`             | A entries proven/exact title+slug+data body -> captured ID -> B1 acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `set-025 / absent -> absent`                              |
| `set-027-related-b1-proof`             | runtime | `apiRead(related-entry-b1)`                | B1 acquired -> exact title/slug/data -> B1 proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-026 / absent -> absent`                              |
| `set-028-related-b2-create`            | runtime | `api(create-related-entry-b2)`             | B1 proven/exact title+slug+data body -> captured ID -> B2 acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `set-027 / absent -> absent`                              |
| `set-029-related-b2-proof`             | runtime | `apiRead(related-entry-b2)`                | B2 acquired -> exact title/slug/data -> A/B related entries proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `set-028 / absent -> absent`                              |
| `set-029a-related-failure1-create`     | runtime | `api(create-related-entry-failure1)`       | failure schema proven/exact title+slug+data body -> captured ID -> failure entry acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `set-029 / absent -> absent`                              |
| `set-029b-related-failure1-proof`      | runtime | `apiRead(related-entry-failure1)`          | failure entry acquired -> exact title/slug/data -> all related entries proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `set-029a-related-failure1-create / absent -> absent`     |
| `set-030-media-upload`                 | runtime | `api(upload-fixture-png)`                  | local snapshot held + exact deep-frozen blueprint base64/68-byte/PNG-signature/SHA-256 authority -> one real multipart upload + media ID/URL/key -> media acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `set-029b-related-failure1-proof / absent -> absent`      |
| `set-031-media-proof`                  | runtime | `apiRead(media-detail)`                    | media acquired -> exact safe projection -> media proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `set-030 / absent -> absent`                              |
| `set-032-storage-post-setup`           | runtime | `storage(post-setup-stable-observation)`   | media proven -> exact zero egress + private snapshots -> owned delta frozen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `set-031 / absent -> absent`                              |
| `set-033-entry-create`                 | runtime | `api(create-editable-entry)`               | all value refs bound/exact title+slug+data body -> captured entry ID -> baseline entry acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `set-032 / absent -> absent`                              |
| `set-034-entry-proof`                  | runtime | `apiRead(editable-entry)`                  | entry acquired -> exact title/slug/baseline data -> entry proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `set-033 / absent -> absent`                              |
| `set-035-screen-create`                | runtime | `api(create-screen-definition)`            | entry/schema proven -> materialized/strict-validated concrete listView + one POST/captured Screen ID -> deterministic main document acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `set-034 / absent -> absent`                              |
| `set-036-screen-proof`                 | runtime | `apiRead(screen-definition)`               | Screen acquired -> byte-identical concrete listView/Image/related-list data/IDs/bindings -> main Screen proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `set-035 / absent -> absent`                              |
| `set-037-retry-screen-create`          | runtime | `api(create-retry-screen-definition)`      | main Screen proven -> independently materialized/strict-validated concrete listView + one POST/captured retry Screen ID -> retry-only document acquired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `set-036 / absent -> absent`                              |
| `set-038-retry-screen-proof`           | runtime | `apiRead(retry-screen-definition)`         | retry Screen acquired -> byte-identical concrete listView + exact one failure related-list/no Field blocks -> retry Screen proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-037 / absent -> absent`                              |
| `set-039-override-create`              | runtime | `api(replace-direct-image-safe-override)`  | main Screen/entry/media proven -> one write -> acquired-media override stored                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `set-038 / absent -> absent`                              |
| `set-040-override-proof`               | runtime | `apiRead(direct-image-safe-override)`      | override stored -> exact one scoped tuple -> media-race projection proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `set-039 / absent -> absent`                              |
| `set-041-preference-a`                 | runtime | `fixture(set-user-a-preference-false)`     | user A proven/strict domain-normalized false -> one local `setUserSetting` call -> exact A composite setting stored                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-040 / absent -> absent`                              |
| `set-042-preference-a-proof`           | runtime | `fixtureRead(user-a-preference)`           | A composite setting stored -> one local `getUserSetting` + strict normalized literal `false` -> A baseline proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `set-041 / absent -> absent`                              |
| `set-043-preference-b`                 | runtime | `fixture(set-user-b-preference-false)`     | user B proven/strict domain-normalized false -> one local `setUserSetting` call -> exact B composite setting stored                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `set-042 / absent -> absent`                              |
| `set-044-preference-b-proof`           | runtime | `fixtureRead(user-b-preference)`           | B composite setting stored -> one local `getUserSetting` + strict normalized literal `false` -> fixtures ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `set-043 / absent -> absent`                              |
| `set-045-builder-cold`                 | p1/0    | `goto(paths.builder)`                      | fixtures ready, no entry/media consumer visited -> URL/marker -> cold builder visible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `set-044 / absent -> absent`                              |

#### Flow 1 — Button, Image, media race, and binding persistence

| ID                                 | Page    | Kind / exact builder                               | Precondition -> captured output -> postcondition                                                                                                                                                                   | Dependencies / route transition                       |
| ---------------------------------- | ------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `bi-001-light-proof`               | p1/0    | `observe(theme-light)`                             | cold builder -> `aria-pressed=false` + computed colors -> light proven                                                                                                                                             | `set-045 / absent -> absent`                          |
| `bi-002-resize`                    | p1/0    | `resize(1280,900)`                                 | light builder -> viewport -> 1280x900                                                                                                                                                                              | `bi-001 / absent -> absent`                           |
| `bi-003-button-before`             | p1/0    | `blocksBefore(palette.button)`                     | canvas visible -> exact block-ID set + Insert selected -> Button baseline captured                                                                                                                                 | `bi-002 / absent -> absent`                           |
| `bi-004-button-click`              | p1/0    | `click(S.palette("Button"))`                       | Button baseline -> click receipt -> one Button inserted/selected                                                                                                                                                   | `bi-003 / absent -> absent`                           |
| `bi-005-button-capture`            | p1/0    | `captureNew(palette.button,"button",bi-003)`       | insertion settled -> one new ID -> `palette.button` frozen                                                                                                                                                         | `bi-003,bi-004 / absent -> absent`                    |
| `bi-006-bound-open-primary`        | p1/0    | `click(S.boundField)`                              | Button selected -> menu visible -> bound-field menu open                                                                                                                                                           | `bi-005 / absent -> absent`                           |
| `bi-007-bound-primary`             | p1/0    | `click(S.fieldOption("Primary Url","text"))`       | menu open -> visible Primary Url option -> semantic `primaryUrl` field bound                                                                                                                                       | `bi-006 / absent -> absent`                           |
| `bi-008-bound-open-secondary`      | p1/0    | `click(S.boundField)`                              | Primary bound -> menu visible -> menu open                                                                                                                                                                         | `bi-007 / absent -> absent`                           |
| `bi-009-bound-secondary`           | p1/0    | `click(S.fieldOption("Secondary Url","text"))`     | menu open -> selected label -> Secondary URL bound                                                                                                                                                                 | `bi-008 / absent -> absent`                           |
| `bi-010-use-static`                | p1/0    | `click(S.staticLink)`                              | Secondary bound -> inspector transition -> binding removed/static input visible                                                                                                                                    | `bi-009 / absent -> absent`                           |
| `bi-011-fill-static`               | p1/0    | `fill(S.staticLinkInput,paths.nestedHash)`         | static input visible -> value -> static link authored                                                                                                                                                              | `bi-010 / absent -> absent`                           |
| `bi-012-bound-open-final`          | p1/0    | `click(S.boundField)`                              | static link authored -> menu visible -> menu open                                                                                                                                                                  | `bi-011 / absent -> absent`                           |
| `bi-013-bound-final`               | p1/0    | `click(S.fieldOption("Primary Url","text"))`       | menu open -> visible Primary Url option -> exactly semantic `primaryUrl` field bound                                                                                                                               | `bi-012 / absent -> absent`                           |
| `bi-014-builder-save`              | p1/0    | `click(S.builderSave)`                             | dirty builder -> save settlement -> builder clean                                                                                                                                                                  | `bi-013 / absent -> absent`                           |
| `bi-015-persisted-binding`         | p1/0    | `observe(binding-after-save)`                      | save settled -> strict persisted read -> post-Save binding sample frozen                                                                                                                                           | `bi-014 / absent -> absent`                           |
| `bi-016-list`                      | p1/0    | `goto(paths.screens)`                              | builder clean -> URL -> Screen list                                                                                                                                                                                | `bi-015 / absent -> absent`                           |
| `bi-016a-auth-rate-window-barrier` | p1/0    | `authRateWindowBarrier()`                          | Screen list stable/bounded rate epoch -> configured auth window naturally expires when enabled or timer is skipped when disabled + bounded realm-stability proof -> exact `{"barrierSatisfied":true}`              | `bi-016 / absent -> absent`                           |
| `bi-017-reopen`                    | p1/0    | `goto(paths.builder)`                              | Screen list -> URL/canvas marker -> saved builder reopened                                                                                                                                                         | `bi-016a-auth-rate-window-barrier / absent -> absent` |
| `bi-018-reopen-proof`              | p1/0    | `assert(persisted-no-empty-binding)`               | reopened -> strict observation -> binding still exact                                                                                                                                                              | `bi-017 / absent -> absent`                           |
| `bi-019-cache-cold`                | p1/0    | `assert(media-cache-cold-before-route)`            | no prior entry/media consumer -> exact aggregate count -> media GET count 0                                                                                                                                        | `bi-018 / absent -> absent`                           |
| `bi-020-media-route-setup`         | p1/0    | `route(media-prior-resolution,route-setup)`        | cache cold -> registered task-owned media tuple -> delayed isolating route installed                                                                                                                               | `bi-019 / absent -> installed`                        |
| `bi-021-records-link`              | p1/0    | `click(S.recordsLink(screen.id))`                  | delayed route installed/builder -> URL + exact visible Record actions control -> records workspace ready                                                                                                           | `bi-020 / installed -> installed`                     |
| `bi-022-entry-link`                | p1/0    | `click(S.recordActions,S.editRecord)`              | records workspace ready -> open exact Record actions menu then click exact Edit record item -> entry navigation started                                                                                            | `bi-021 / installed -> installed`                     |
| `bi-023-media-route-hit`           | p1/0    | `route(media-prior-resolution,route-hit-read)`     | entry mounting -> backing list validated + exact acquired fixture projected -> route hit exactly 1/pending                                                                                                         | `bi-022 / installed -> hit`                           |
| `bi-024-prior-resolution`          | p1/0    | `assert(prior-media-resolution-pending)`           | hit pending -> selected target + pending source -> prior protected value visible                                                                                                                                   | `bi-023 / hit -> hit`                                 |
| `bi-025-select-race-image`         | p1/0    | `click(S.selectBlock(screen.blockIds.raceImage))`  | entry visible -> selection state -> race Image selected                                                                                                                                                            | `bi-024 / hit -> hit`                                 |
| `bi-026-clear-presentation`        | p1/0    | `click(S.presentationClear)`                       | direct override selected -> dirty override -> newer local clear visible                                                                                                                                            | `bi-025 / hit -> hit`                                 |
| `bi-027-newer-presentation`        | p1/0    | `assert(newer-media-winner-selected-pending)`      | clear applied/hit pending -> DOM source state -> missing-field placeholder wins                                                                                                                                    | `bi-026 / hit -> hit`                                 |
| `bi-028-media-pending-shot`        | p1/0    | `screen(media-prior-pending)`                      | newer state visible -> PNG -> pending-race screenshot created                                                                                                                                                      | `bi-027 / hit -> hit`                                 |
| `bi-029-media-count-before`        | p1/0    | `media-count-before-release`                       | route pending -> exact count -> count 1                                                                                                                                                                            | `bi-023 / hit -> hit`                                 |
| `bi-030-media-release`             | p1/0    | `route(media-prior-resolution,route-release)`      | validated task-owned projection held -> fulfillment receipt -> isolated response released/UI settled                                                                                                               | `bi-023,bi-029 / hit -> released`                     |
| `bi-031-stale-protected`           | p1/0    | `assert(stale-media-result-ignored)`               | released/settled -> DOM source state -> stale result cannot overwrite clear                                                                                                                                        | `bi-026,bi-030 / released -> released`                |
| `bi-032-media-count-after`         | p1/0    | `media-count-after-release`                        | settlement complete -> exact count -> still 1                                                                                                                                                                      | `bi-030 / released -> released`                       |
| `bi-033-media-unroute`             | p1/0    | `route(media-prior-resolution,unroute)`            | released and count proven -> `true` -> route absent                                                                                                                                                                | `bi-031,bi-032 / released -> absent`                  |
| `bi-034-browse-direct`             | p1/0    | `click(S.browseMedia)`                             | race Image selected + task-owned cache -> dialog -> Media library visible with exact fixture                                                                                                                       | `bi-033 / absent -> absent`                           |
| `bi-035-select-direct-media`       | p1/0    | `click(S.mediaCard(media.title))`                  | exact media card visible -> selected ID -> direct override uses acquired media                                                                                                                                     | `bi-034 / absent -> absent`                           |
| `bi-036-direct-safe`               | p1/0    | `assert(direct-image-safe-url)`                    | media resolved -> DOM img/url -> acquired safe URL rendered                                                                                                                                                        | `bi-035 / absent -> absent`                           |
| `bi-037-clear-direct`              | p1/0    | `click(S.presentationClear)`                       | direct media visible -> override clear -> missing binding restored                                                                                                                                                 | `bi-036 / absent -> absent`                           |
| `bi-038-direct-missing`            | p1/0    | `assert(missing-or-unsafe-placeholder)`            | clear settled -> placeholder/URL state -> no unsafe image emitted                                                                                                                                                  | `bi-037 / absent -> absent`                           |
| `bi-039-select-media-field`        | p1/0    | `click(S.selectBlock(screen.blockIds.mediaField))` | entry visible -> selected state -> preseed Media field selected                                                                                                                                                    | `bi-038 / absent -> absent`                           |
| `bi-040-browse-field`              | p1/0    | `click(S.browseMedia)`                             | Media field selected + task-owned cache -> dialog -> Media library visible with exact fixture                                                                                                                      | `bi-039 / absent -> absent`                           |
| `bi-041-select-field-media`        | p1/0    | `click(S.mediaCard(media.title))`                  | exact media card visible -> selected ID -> UUID draft selected                                                                                                                                                     | `bi-040 / absent -> absent`                           |
| `bi-042-save-presentation`         | p1/0    | `click(S.presentationSave)`                        | presentation dirty -> exact PATCH success + `Saving...` absent + clean-disabled Save presentation control -> override clean                                                                                        | `bi-041 / absent -> absent`                           |
| `bi-043-media-uuid`                | p1/0    | `assert(media-field-keeps-uuid)`                   | save settled -> unique visible fixture display title + canonical rendered image source mapped to the captured media fixture, plus authenticated persisted read -> captured UUID retained/no resolved URL persisted | `bi-042 / absent -> absent`                           |
| `bi-044-builder-return`            | p1/0    | `goto(paths.builder)`                              | entry clean -> URL/canvas -> builder visible                                                                                                                                                                       | `bi-043 / absent -> absent`                           |
| `bi-045-image-before`              | p1/0    | `blocksBefore(palette.image)`                      | canvas visible -> ID set + Insert selected -> Image baseline captured                                                                                                                                              | `bi-044 / absent -> absent`                           |
| `bi-046-image-click`               | p1/0    | `click(S.palette("Image"))`                        | baseline -> click -> one Image inserted                                                                                                                                                                            | `bi-045 / absent -> absent`                           |
| `bi-047-image-capture`             | p1/0    | `captureNew(palette.image,"image",bi-045)`         | insertion settled -> one new ID -> palette Image frozen                                                                                                                                                            | `bi-045,bi-046 / absent -> absent`                    |
| `bi-048-image-bound-open`          | p1/0    | `click(S.boundField)`                              | Image selected -> menu -> menu open                                                                                                                                                                                | `bi-047 / absent -> absent`                           |
| `bi-049-image-bound-media`         | p1/0    | `click(S.fieldOption("Media Asset","media"))`      | menu open -> exact option -> palette Image media-bound                                                                                                                                                             | `bi-048 / absent -> absent`                           |
| `bi-050-field-before`              | p1/0    | `blocksBefore(palette.mediaField)`                 | canvas visible -> ID set + Insert selected -> Field baseline captured                                                                                                                                              | `bi-049 / absent -> absent`                           |
| `bi-051-field-click`               | p1/0    | `click(S.palette("Field"))`                        | baseline/Insert palette remains visible -> click -> one Field inserted                                                                                                                                             | `bi-050 / absent -> absent`                           |
| `bi-052-field-capture`             | p1/0    | `captureNew(palette.mediaField,"field",bi-050)`    | insertion settled -> one new ID -> palette Field frozen                                                                                                                                                            | `bi-050,bi-051 / absent -> absent`                    |
| `bi-053-field-bound-open`          | p1/0    | `click(S.boundField)`                              | Field selected -> menu -> menu open                                                                                                                                                                                | `bi-052 / absent -> absent`                           |
| `bi-054-field-bound-media`         | p1/0    | `click(S.fieldOption("Media Asset","media"))`      | menu open -> exact option -> palette Field media-bound                                                                                                                                                             | `bi-053 / absent -> absent`                           |
| `bi-055-save-palette-media`        | p1/0    | `click(S.builderSave)`                             | palette media blocks dirty -> save settlement -> builder clean                                                                                                                                                     | `bi-054 / absent -> absent`                           |
| `bi-056-entry-return`              | p1/0    | `goto(paths.entry)`                                | builder clean -> URL/document marker -> entry visible                                                                                                                                                              | `bi-055 / absent -> absent`                           |
| `bi-056a-safe-link-observe`        | p1/0    | `observe(safe-link-anchor-before-activation)`      | entry visible -> tag/href/rect -> safe anchor sample frozen                                                                                                                                                        | `bi-056 / absent -> absent`                           |
| `bi-057-safe-link-click`           | p1/0    | `click(S.buttonAffordance(palette.button))`        | safe anchor present -> navigation -> front hash destination reached                                                                                                                                                | `bi-056a-safe-link-observe / absent -> absent`        |
| `bi-058-safe-link-proof`           | p1/0    | `assert(safe-link-front-url)`                      | front loaded + anchor sample -> href/page URL -> exact safe front URL                                                                                                                                              | `bi-056a-safe-link-observe,bi-057 / absent -> absent` |
| `bi-059-entry-after-front`         | p1/0    | `goto(paths.entry)`                                | front assertion complete -> URL -> entry visible                                                                                                                                                                   | `bi-058 / absent -> absent`                           |
| `bi-060-unsafe-patch`              | runtime | `api(patch-screen-button-binding-secondary-url)`   | entry baseline already holds unsafe Secondary URL -> one Screen PATCH -> Button rebound                                                                                                                            | `bi-059 / absent -> absent`                           |
| `bi-061-unsafe-proof-read`         | runtime | `apiRead(screen-button-binding-secondary-url)`     | PATCH settled -> exact binding + baseline entry capture -> unsafe fixture proven                                                                                                                                   | `bi-060 / absent -> absent`                           |
| `bi-061a-auth-rate-window-barrier` | p1/0    | `authRateWindowBarrier()`                          | unsafe fixture proven/bounded rate epoch -> configured auth window naturally expires when enabled or timer is skipped when disabled + bounded realm-stability proof -> exact `{"barrierSatisfied":true}`           | `bi-061 / absent -> absent`                           |
| `bi-062-entry-unsafe-reload`       | p1/0    | `goto(paths.entry)`                                | unsafe fixture proven -> URL/document -> entry rerendered                                                                                                                                                          | `bi-061a-auth-rate-window-barrier / absent -> absent` |
| `bi-063-unsafe-disabled`           | p1/0    | `assert(unsafe-link-disabled)`                     | entry rerendered -> span/ARIA/anchor count -> unsafe URL inert                                                                                                                                                     | `bi-062 / absent -> absent`                           |
| `bi-064-baseline-restore`          | runtime | `api(reset-screen-baseline)`                       | unsafe assertion complete -> one Screen PATCH -> baseline restored                                                                                                                                                 | `bi-063 / absent -> absent`                           |
| `bi-065-baseline-proof`            | runtime | `apiRead(screen-baseline)`                         | restore settled -> exact baseline document -> reset proven                                                                                                                                                         | `bi-064 / absent -> absent`                           |
| `bi-066-final-entry`               | p1/0    | `goto(paths.entry)`                                | reset proven -> URL/document -> final entry visible                                                                                                                                                                | `bi-065 / absent -> absent`                           |
| `bi-067-final-shot`                | p1/0    | `screen(button-image-light)`                       | final safe state -> PNG -> flow screenshot created                                                                                                                                                                 | `bi-066 / absent -> absent`                           |
| `bi-068-log-agg-errors`            | p1/0    | `logs(aggregate,console-errors)`                   | flow complete -> `[]` -> aggregate errors clean                                                                                                                                                                    | `bi-067 / absent -> absent`                           |
| `bi-069-log-pages-errors`          | p1/0    | `logs(per-page,console-errors)`                    | logger stable -> every page `[]` -> page errors clean                                                                                                                                                              | `bi-068 / absent -> absent`                           |
| `bi-070-log-agg-warnings`          | p1/0    | `logs(aggregate,console-warnings)`                 | flow complete -> `[]` -> aggregate warnings clean                                                                                                                                                                  | `bi-069 / absent -> absent`                           |
| `bi-071-log-pages-warnings`        | p1/0    | `logs(per-page,console-warnings)`                  | logger stable -> every page `[]` -> page warnings clean                                                                                                                                                            | `bi-070 / absent -> absent`                           |
| `bi-072-log-agg-page-errors`       | p1/0    | `logs(aggregate,page-errors)`                      | flow complete -> `[]` -> aggregate page errors clean                                                                                                                                                               | `bi-071 / absent -> absent`                           |
| `bi-073-log-pages-page-errors`     | p1/0    | `logs(per-page,page-errors)`                       | logger stable -> every page `[]` -> flow 1 clean                                                                                                                                                                   | `bi-072 / absent -> absent`                           |

#### Flow 2 — Tabs content, add-tab identity, save, and reopen

| ID                                 | Page    | Kind / exact builder                                     | Precondition -> captured output -> postcondition                                                                                                                                                      | Dependencies / route transition                       |
| ---------------------------------- | ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `tc-001-reset`                     | runtime | `api(reset-entry-overrides-empty)`                       | flow 1 clean/Screen and entry already baseline -> one scoped call -> overrides empty                                                                                                                  | `bi-073 / absent -> absent`                           |
| `tc-002-reset-proof`               | runtime | `apiRead(entry-overrides-empty)`                         | reset settled -> exact `[]` -> reset proven                                                                                                                                                           | `tc-001 / absent -> absent`                           |
| `tc-003-builder`                   | p1/0    | `goto(paths.builder)`                                    | reset proven -> URL/canvas -> builder visible                                                                                                                                                         | `tc-002 / absent -> absent`                           |
| `tc-004-dark-toggle`               | p1/0    | `click(S.colorMode)`                                     | light proven -> aria state -> dark selected                                                                                                                                                           | `bi-001,tc-003 / absent -> absent`                    |
| `tc-005-dark-proof`                | p1/0    | `observe(theme-dark)`                                    | toggle settled -> computed colors/aria -> dark proven                                                                                                                                                 | `tc-004 / absent -> absent`                           |
| `tc-006-resize`                    | p1/0    | `resize(1280,900)`                                       | dark builder -> viewport -> 1280x900                                                                                                                                                                  | `tc-005 / absent -> absent`                           |
| `tc-007-tabs-before`               | p1/0    | `blocksBefore(palette.outerTabs)`                        | canvas visible -> ID set + Insert selected -> Tabs baseline captured                                                                                                                                  | `tc-006 / absent -> absent`                           |
| `tc-008-tabs-click`                | p1/0    | `click(S.palette("Tabs"))`                               | baseline -> click -> one Tabs inserted                                                                                                                                                                | `tc-007 / absent -> absent`                           |
| `tc-009-tabs-capture`              | p1/0    | `captureNew(palette.outerTabs,"tabs",tc-007)`            | insertion settled -> one new ID + defaults -> outer Tabs frozen                                                                                                                                       | `tc-007,tc-008 / absent -> absent`                    |
| `tc-010-label-one`                 | p1/0    | `fill(S.tabLabel("tab-1"),"Overview")`                   | defaults exact -> value -> tab-1 renamed                                                                                                                                                              | `tc-009 / absent -> absent`                           |
| `tc-011-label-two`                 | p1/0    | `fill(S.tabLabel("tab-2"),"Details")`                    | tab-1 renamed -> value -> tab-2 renamed                                                                                                                                                               | `tc-010 / absent -> absent`                           |
| `tc-012-add-tab`                   | p1/0    | `click(S.addTab)`                                        | only tab-1/tab-2 -> UI mutation -> exact tab-3 added                                                                                                                                                  | `tc-011 / absent -> absent`                           |
| `tc-013-label-three`               | p1/0    | `fill(S.tabLabel("tab-3"),"History")`                    | tab-3 exact -> value -> tab-3 renamed                                                                                                                                                                 | `tc-012 / absent -> absent`                           |
| `tc-014-edit-overview`             | p1/0    | `click(S.editTab("Overview"))`                           | outer selected -> active slot -> tab-1 insertion armed                                                                                                                                                | `tc-013 / absent -> absent`                           |
| `tc-015-text-one-before`           | p1/0    | `blocksBefore(palette.tabOneText)`                       | tab-1 armed -> ID set + Insert selected -> Text baseline captured                                                                                                                                     | `tc-014 / absent -> absent`                           |
| `tc-016-text-one-click`            | p1/0    | `click(S.palette("Text"))`                               | baseline -> click -> Text inserted in tab-1                                                                                                                                                           | `tc-015 / absent -> absent`                           |
| `tc-017-text-one-capture`          | p1/0    | `captureNew(palette.tabOneText,"text",tc-015)`           | insertion settled -> one ID -> tab-1 Text frozen                                                                                                                                                      | `tc-015,tc-016 / absent -> absent`                    |
| `tc-018-text-one-fill`             | p1/0    | `fill(S.paragraph,tabs.text.tab-1)`                      | Text selected -> value -> Overview text authored                                                                                                                                                      | `tc-017 / absent -> absent`                           |
| `tc-019-reselect-outer-one`        | p1/0    | `click(S.selectBlock(palette.outerTabs))`                | child authored -> selected state -> outer Tabs selected                                                                                                                                               | `tc-018 / absent -> absent`                           |
| `tc-020-edit-details`              | p1/0    | `click(S.editTab("Details"))`                            | outer selected -> active slot -> tab-2 armed                                                                                                                                                          | `tc-019 / absent -> absent`                           |
| `tc-021-text-two-before`           | p1/0    | `blocksBefore(palette.tabTwoText)`                       | tab-2 armed -> ID set + Insert selected -> Text baseline captured                                                                                                                                     | `tc-020 / absent -> absent`                           |
| `tc-022-text-two-click`            | p1/0    | `click(S.palette("Text"))`                               | baseline -> click -> Text inserted in tab-2                                                                                                                                                           | `tc-021 / absent -> absent`                           |
| `tc-023-text-two-capture`          | p1/0    | `captureNew(palette.tabTwoText,"text",tc-021)`           | insertion settled -> one ID -> tab-2 Text frozen                                                                                                                                                      | `tc-021,tc-022 / absent -> absent`                    |
| `tc-024-text-two-fill`             | p1/0    | `fill(S.paragraph,tabs.text.tab-2)`                      | Text selected -> value -> Details text authored                                                                                                                                                       | `tc-023 / absent -> absent`                           |
| `tc-025-reselect-outer-two`        | p1/0    | `click(S.selectBlock(palette.outerTabs))`                | child authored -> selected state -> outer selected                                                                                                                                                    | `tc-024 / absent -> absent`                           |
| `tc-026-edit-history`              | p1/0    | `click(S.editTab("History"))`                            | outer selected -> active slot -> tab-3 armed                                                                                                                                                          | `tc-025 / absent -> absent`                           |
| `tc-027-text-three-before`         | p1/0    | `blocksBefore(palette.tabThreeText)`                     | tab-3 armed -> ID set + Insert selected -> Text baseline captured                                                                                                                                     | `tc-026 / absent -> absent`                           |
| `tc-028-text-three-click`          | p1/0    | `click(S.palette("Text"))`                               | baseline -> click -> Text inserted in tab-3                                                                                                                                                           | `tc-027 / absent -> absent`                           |
| `tc-029-text-three-capture`        | p1/0    | `captureNew(palette.tabThreeText,"text",tc-027)`         | insertion settled -> one ID -> tab-3 Text frozen                                                                                                                                                      | `tc-027,tc-028 / absent -> absent`                    |
| `tc-030-text-three-fill`           | p1/0    | `fill(S.paragraph,tabs.text.tab-3)`                      | Text selected -> value -> History text authored                                                                                                                                                       | `tc-029 / absent -> absent`                           |
| `tc-031-save`                      | p1/0    | `click(S.builderSave)`                                   | three tabs/text dirty -> save settlement -> builder clean                                                                                                                                             | `tc-030 / absent -> absent`                           |
| `tc-032-list`                      | p1/0    | `goto(paths.screens)`                                    | builder clean -> URL -> Screen list                                                                                                                                                                   | `tc-031 / absent -> absent`                           |
| `tc-032a-auth-rate-window-barrier` | p1/0    | `authRateWindowBarrier()`                                | Screen list stable/bounded rate epoch -> configured auth window naturally expires when enabled or timer is skipped when disabled + bounded realm-stability proof -> exact `{"barrierSatisfied":true}` | `tc-032 / absent -> absent`                           |
| `tc-033-reopen`                    | p1/0    | `goto(paths.builder)`                                    | list -> URL/canvas -> builder reopened                                                                                                                                                                | `tc-032a-auth-rate-window-barrier / absent -> absent` |
| `tc-034-three-tabs`                | p1/0    | `assert(three-tabs-persisted)`                           | reopened -> tab/slot/nested DOM + read -> exact persisted structure                                                                                                                                   | `tc-033 / absent -> absent`                           |
| `tc-035-click-details`             | p1/0    | `click(S.scopedRuntimeTab(palette.outerTabs,"Details"))` | Overview active -> selected state -> Details active                                                                                                                                                   | `tc-034 / absent -> absent`                           |
| `tc-036-details-state`             | p1/0    | `observe(outer-tabs-details-state)`                      | Details active -> geometry/hidden/armed -> Details sample frozen                                                                                                                                      | `tc-035 / absent -> absent`                           |
| `tc-037-click-history`             | p1/0    | `click(S.scopedRuntimeTab(palette.outerTabs,"History"))` | Details active -> selected state -> History active                                                                                                                                                    | `tc-036 / absent -> absent`                           |
| `tc-038-history-state`             | p1/0    | `observe(outer-tabs-history-state)`                      | History active -> geometry/hidden/armed -> History sample frozen                                                                                                                                      | `tc-037 / absent -> absent`                           |
| `tc-039-one-panel`                 | p1/0    | `assert(one-panel-visible)`                              | two samples/current DOM -> strict geometry -> exactly one visible                                                                                                                                     | `tc-036,tc-038 / absent -> absent`                    |
| `tc-040-hidden-panels`             | p1/0    | `assert(other-panels-zero-geometry)`                     | current History -> hidden/rects -> other panels zero                                                                                                                                                  | `tc-038 / absent -> absent`                           |
| `tc-041-armed-slot`                | p1/0    | `assert(armed-slot-equals-active-tab)`                   | Details+History samples -> IDs -> armed equals active both directions                                                                                                                                 | `tc-036,tc-038 / absent -> absent`                    |
| `tc-042-shot`                      | p1/0    | `screen(tabs-content-dark)`                              | assertions pass -> PNG -> tabs-content screenshot created                                                                                                                                             | `tc-039,tc-040,tc-041 / absent -> absent`             |
| `tc-043-log-agg-errors`            | p1/0    | `logs(aggregate,console-errors)`                         | flow complete -> `[]` -> aggregate clean                                                                                                                                                              | `tc-042 / absent -> absent`                           |
| `tc-044-log-pages-errors`          | p1/0    | `logs(per-page,console-errors)`                          | logger stable -> every page `[]` -> pages clean                                                                                                                                                       | `tc-043 / absent -> absent`                           |
| `tc-045-log-agg-warnings`          | p1/0    | `logs(aggregate,console-warnings)`                       | flow complete -> `[]` -> aggregate clean                                                                                                                                                              | `tc-044 / absent -> absent`                           |
| `tc-046-log-pages-warnings`        | p1/0    | `logs(per-page,console-warnings)`                        | logger stable -> every page `[]` -> pages clean                                                                                                                                                       | `tc-045 / absent -> absent`                           |
| `tc-047-log-agg-page-errors`       | p1/0    | `logs(aggregate,page-errors)`                            | flow complete -> `[]` -> aggregate clean                                                                                                                                                              | `tc-046 / absent -> absent`                           |
| `tc-048-log-pages-page-errors`     | p1/0    | `logs(per-page,page-errors)`                             | logger stable -> every page `[]` -> flow 2 clean                                                                                                                                                      | `tc-047 / absent -> absent`                           |

#### Flow 3 — Keyboard/ARIA Tabs and nested renderer identity

| ID                             | Page | Kind / exact builder                                                   | Precondition -> captured output -> postcondition                                                              | Dependencies / route transition                  |
| ------------------------------ | ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `tk-001-light-toggle`          | p1/0 | `click(S.colorMode)`                                                   | flow 2 dark -> aria state -> light selected                                                                   | `tc-048 / absent -> absent`                      |
| `tk-002-light-proof`           | p1/0 | `observe(theme-light)`                                                 | toggle settled -> computed colors/aria -> light proven                                                        | `tk-001 / absent -> absent`                      |
| `tk-003-resize`                | p1/0 | `resize(1024,900)`                                                     | light builder -> viewport -> 1024x900                                                                         | `tk-002 / absent -> absent`                      |
| `tk-004-select-outer`          | p1/0 | `click(S.selectBlock(palette.outerTabs))`                              | saved outer exists -> selected state -> outer selected                                                        | `tk-003 / absent -> absent`                      |
| `tk-005-edit-overview`         | p1/0 | `click(S.editTab("Overview"))`                                         | outer selected -> insertion state -> tab-1 armed                                                              | `tk-004 / absent -> absent`                      |
| `tk-006-inner-before`          | p1/0 | `blocksBefore(palette.innerTabs)`                                      | tab-1 armed -> ID set + Insert selected -> nested Tabs baseline                                               | `tk-005 / absent -> absent`                      |
| `tk-007-inner-click`           | p1/0 | `click(S.palette("Tabs"))`                                             | baseline -> click -> nested Tabs inserted                                                                     | `tk-006 / absent -> absent`                      |
| `tk-008-inner-capture`         | p1/0 | `captureNew(palette.innerTabs,"tabs",tk-006)`                          | insertion settled -> one ID/default tabs -> inner Tabs frozen                                                 | `tk-006,tk-007 / absent -> absent`               |
| `tk-009-save`                  | p1/0 | `click(S.builderSave)`                                                 | nested Tabs dirty -> save settlement -> builder clean                                                         | `tk-008 / absent -> absent`                      |
| `tk-010-preview`               | p1/0 | `click(S.preview)`                                                     | builder clean -> dialog -> Editor View Preview open                                                           | `tk-009 / absent -> absent`                      |
| `tk-011-preview-proof`         | p1/0 | `observe(preview-shell-desktop)`                                       | dialog open -> exact desktop shell + unique visible outer/nested Tabs roots -> second renderer visibly proven | `tk-010 / absent -> absent`                      |
| `tk-012-focus-overview`        | p1/0 | `focus(S.previewRuntimeTab(palette.outerTabs,"Overview"))`             | preview visible -> focus state -> outer Overview focused                                                      | `tk-011 / absent -> absent`                      |
| `tk-013-arrow-left`            | p1/0 | `press(S.previewRuntimeTab(palette.outerTabs,"Overview"),"ArrowLeft")` | Overview focused -> key -> History focused/selected                                                           | `tk-012 / absent -> absent`                      |
| `tk-014-observe-left`          | p1/0 | `observe(key-step-arrow-left)`                                         | key settled -> text/IDs/tabIndex -> Left step frozen                                                          | `tk-013 / absent -> absent`                      |
| `tk-015-arrow-right`           | p1/0 | `press(S.previewRuntimeTab(palette.outerTabs,"History"),"ArrowRight")` | History focused -> key -> Overview focused/selected                                                           | `tk-014 / absent -> absent`                      |
| `tk-016-observe-right`         | p1/0 | `observe(key-step-arrow-right)`                                        | key settled -> text/IDs/tabIndex -> Right step frozen                                                         | `tk-015 / absent -> absent`                      |
| `tk-017-home`                  | p1/0 | `press(S.previewRuntimeTab(palette.outerTabs,"Overview"),"Home")`      | Overview focused -> key -> Overview remains focused/selected                                                  | `tk-016 / absent -> absent`                      |
| `tk-018-observe-home`          | p1/0 | `observe(key-step-home)`                                               | key settled -> text/IDs/tabIndex -> Home step frozen                                                          | `tk-017 / absent -> absent`                      |
| `tk-019-end`                   | p1/0 | `press(S.previewRuntimeTab(palette.outerTabs,"Overview"),"End")`       | Overview focused -> key -> History focused/selected                                                           | `tk-018 / absent -> absent`                      |
| `tk-020-observe-end`           | p1/0 | `observe(key-step-end)`                                                | key settled -> text/IDs/tabIndex -> End step frozen                                                           | `tk-019 / absent -> absent`                      |
| `tk-021-keyboard-proof`        | p1/0 | `assert(arrow-home-end-focus)`                                         | four key samples/current DOM -> Left/Right/Home/End steps -> roving focus exact                               | `tk-014,tk-016,tk-018,tk-020 / absent -> absent` |
| `tk-022-aria-proof`            | p1/0 | `assert(aria-reciprocal)`                                              | preview DOM -> exact tab/panel IDs -> reciprocal ARIA/visibility                                              | `tk-020 / absent -> absent`                      |
| `tk-022a-restore-overview`     | p1/0 | `click(S.previewRuntimeTab(palette.outerTabs,"Overview"))`             | ARIA proof settled with History active -> click -> outer Overview restored and inner controls visible         | `tk-022 / absent -> absent`                      |
| `tk-023-inner-second`          | p1/0 | `click(S.previewRuntimeTab(palette.innerTabs,"Tab 2"))`                | outer Overview active -> click -> inner Tab 2 selected only                                                   | `tk-022a / absent -> absent`                     |
| `tk-024-outer-details`         | p1/0 | `click(S.previewRuntimeTab(palette.outerTabs,"Details"))`              | inner Tab 2 selected -> click -> outer Details selected                                                       | `tk-023 / absent -> absent`                      |
| `tk-025-outer-overview`        | p1/0 | `click(S.previewRuntimeTab(palette.outerTabs,"Overview"))`             | outer Details selected -> click -> outer Overview restored                                                    | `tk-024 / absent -> absent`                      |
| `tk-026-nested-proof`          | p1/0 | `assert(nested-tabs-isolated)`                                         | both roots visible -> scoped IDs/selections -> independent state                                              | `tk-023,tk-025 / absent -> absent`               |
| `tk-027-ids-proof`             | p1/0 | `assert(renderer-ids-unique)`                                          | builder + dialog outer/nested roots -> exact 10 tab/panel IDs per realm -> 20 globally unique                 | `tk-011 / absent -> absent`                      |
| `tk-028-shot`                  | p1/0 | `screen(tabs-keyboard-light)`                                          | assertions pass -> PNG -> keyboard screenshot created                                                         | `tk-021,tk-022,tk-026,tk-027 / absent -> absent` |
| `tk-029-preview-close`         | p1/0 | `click(S.previewClose)`                                                | screenshot captured -> dialog state -> preview closed                                                         | `tk-028 / absent -> absent`                      |
| `tk-030-log-agg-errors`        | p1/0 | `logs(aggregate,console-errors)`                                       | flow complete -> `[]` -> aggregate clean                                                                      | `tk-029 / absent -> absent`                      |
| `tk-031-log-pages-errors`      | p1/0 | `logs(per-page,console-errors)`                                        | logger stable -> every page `[]` -> pages clean                                                               | `tk-030 / absent -> absent`                      |
| `tk-032-log-agg-warnings`      | p1/0 | `logs(aggregate,console-warnings)`                                     | flow complete -> `[]` -> aggregate clean                                                                      | `tk-031 / absent -> absent`                      |
| `tk-033-log-pages-warnings`    | p1/0 | `logs(per-page,console-warnings)`                                      | logger stable -> every page `[]` -> pages clean                                                               | `tk-032 / absent -> absent`                      |
| `tk-034-log-agg-page-errors`   | p1/0 | `logs(aggregate,page-errors)`                                          | flow complete -> `[]` -> aggregate clean                                                                      | `tk-033 / absent -> absent`                      |
| `tk-035-log-pages-page-errors` | p1/0 | `logs(per-page,page-errors)`                                           | logger stable -> every page `[]` -> flow 3 clean                                                              | `tk-034 / absent -> absent`                      |

#### Flow 4 — Real Space input and independent nested selection

| ID                             | Page    | Kind / exact builder                                                                       | Precondition -> captured output -> postcondition                                                                                                       | Dependencies / route transition                  |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `ss-001-screen-reset`          | runtime | `api(reset-screen-baseline)`                                                               | flow 3 clean -> one PATCH -> preseed document restored                                                                                                 | `tk-035 / absent -> absent`                      |
| `ss-002-screen-proof`          | runtime | `apiRead(screen-baseline)`                                                                 | PATCH settled -> exact document -> Screen reset proven                                                                                                 | `ss-001 / absent -> absent`                      |
| `ss-003-entry-reset`           | runtime | `api(reset-entry-baseline)`                                                                | Screen proven -> one PATCH -> content baseline restored                                                                                                | `ss-002 / absent -> absent`                      |
| `ss-004-entry-proof`           | runtime | `apiRead(entry-baseline)`                                                                  | PATCH settled -> exact values -> entry reset proven                                                                                                    | `ss-003 / absent -> absent`                      |
| `ss-005-overrides-reset`       | runtime | `api(reset-entry-overrides-empty)`                                                         | entry proven -> one DELETE/PATCH contract call -> overrides empty                                                                                      | `ss-004 / absent -> absent`                      |
| `ss-006-overrides-proof`       | runtime | `apiRead(entry-overrides-empty)`                                                           | reset settled -> `[]` -> reset complete                                                                                                                | `ss-005 / absent -> absent`                      |
| `ss-007-entry`                 | p1/0    | `goto(paths.entry)`                                                                        | reset complete -> URL/document -> entry visible                                                                                                        | `ss-006 / absent -> absent`                      |
| `ss-008-dark-toggle`           | p1/0    | `click(S.colorMode)`                                                                       | flow 3 light -> aria state -> dark selected                                                                                                            | `ss-007 / absent -> absent`                      |
| `ss-009-dark-proof`            | p1/0    | `observe(theme-dark)`                                                                      | toggle settled -> colors/aria -> dark proven                                                                                                           | `ss-008 / absent -> absent`                      |
| `ss-010-resize`                | p1/0    | `resize(1024,900)`                                                                         | dark entry -> viewport -> 1024x900                                                                                                                     | `ss-009 / absent -> absent`                      |
| `ss-011-selection-before`      | p1/0    | `observe(selected-block-before-nested-controls,S.selectBlock(screen.blockIds.spaceGroup))` | entry stable -> exact Space-group selection handle clicked and settled -> selected block/URL baseline frozen                                           | `ss-010 / absent -> absent`                      |
| `ss-012-editor-click`          | p1/0    | `click(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"))`                | nested editor visible -> focus -> editor focused/wrapper unchanged                                                                                     | `ss-011 / absent -> absent`                      |
| `ss-013-select-all`            | p1/0    | `press(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"Control+A")`    | editor focused -> selection -> existing text selected                                                                                                  | `ss-012 / absent -> absent`                      |
| `ss-014-type-alpha`            | p1/0    | `type(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"Alpha")`         | text selected -> input -> `Alpha`                                                                                                                      | `ss-013 / absent -> absent`                      |
| `ss-015-space-one`             | p1/0    | `press(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"Space")`        | caret after Alpha -> key input -> one literal U+0020 appended                                                                                          | `ss-014 / absent -> absent`                      |
| `ss-016-type-beta`             | p1/0    | `type(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"beta")`          | first Space present -> input -> `Alpha beta`                                                                                                           | `ss-015 / absent -> absent`                      |
| `ss-017-space-two`             | p1/0    | `press(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"Space")`        | caret after beta -> key input -> second U+0020 appended                                                                                                | `ss-016 / absent -> absent`                      |
| `ss-018-type-gamma`            | p1/0    | `type(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"gamma")`         | second Space present -> input -> `Alpha beta gamma`                                                                                                    | `ss-017 / absent -> absent`                      |
| `ss-019-space-three`           | p1/0    | `press(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"Space")`        | caret after gamma -> key input -> third U+0020 appended                                                                                                | `ss-018 / absent -> absent`                      |
| `ss-020-type-delta`            | p1/0    | `type(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),"delta")`         | third Space present -> input -> exact phrase                                                                                                           | `ss-019 / absent -> absent`                      |
| `ss-021-space-proof`           | p1/0    | `assert(space-text-preserved)`                                                             | phrase authored -> textContent/value -> exact `Alpha beta gamma delta`                                                                                 | `ss-020 / absent -> absent`                      |
| `ss-022-selection-after-input` | p1/0    | `observe(selected-block-after-nested-input)`                                               | editor still focused -> selected block/focus -> wrapper identity unchanged                                                                             | `ss-011,ss-020 / absent -> absent`               |
| `ss-023-nested-link`           | p1/0    | `click(S.buttonAffordance(screen.blockIds.spaceLink))`                                     | nested safe link visible -> hash navigation -> nested destination activated                                                                            | `ss-022 / absent -> absent`                      |
| `ss-024-selection-after-link`  | p1/0    | `observe(selected-block-after-nested-link)`                                                | hash active -> selection/URL/focus -> wrapper identity unchanged                                                                                       | `ss-011,ss-023 / absent -> absent`               |
| `ss-025-refocus-input`         | p1/0    | `focus(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"))`                | link activation proven -> focus -> nested editor focused                                                                                               | `ss-024 / absent -> absent`                      |
| `ss-026-nested-proof`          | p1/0    | `assert(nested-controls-do-not-select)`                                                    | before/input/link samples -> activation/focus/selection -> nested controls independent                                                                 | `ss-011,ss-022,ss-024,ss-025 / absent -> absent` |
| `ss-027-selection-handle`      | p1/0    | `dispatchAndCaptureSelectionHandle(S.selectBlock(screen.blockIds.spaceGroup))`             | nested controls proven -> one cancelable click dispatched and captured after handler -> group selected, exact `defaultPrevented:false`, handle focused | `ss-026 / absent -> absent`                      |
| `ss-028-handle-proof`          | p1/0    | `assert(selection-handle-independent)`                                                     | handle clicked -> focus/ARIA/event/selection -> exact independent selection                                                                            | `ss-027 / absent -> absent`                      |
| `ss-029-shot`                  | p1/0    | `screen(space-selection-dark)`                                                             | assertions pass -> PNG -> space screenshot created                                                                                                     | `ss-021,ss-026,ss-028 / absent -> absent`        |
| `ss-030-log-agg-errors`        | p1/0    | `logs(aggregate,console-errors)`                                                           | flow complete -> `[]` -> aggregate clean                                                                                                               | `ss-029 / absent -> absent`                      |
| `ss-031-log-pages-errors`      | p1/0    | `logs(per-page,console-errors)`                                                            | logger stable -> every page `[]` -> pages clean                                                                                                        | `ss-030 / absent -> absent`                      |
| `ss-032-log-agg-warnings`      | p1/0    | `logs(aggregate,console-warnings)`                                                         | flow complete -> `[]` -> aggregate clean                                                                                                               | `ss-031 / absent -> absent`                      |
| `ss-033-log-pages-warnings`    | p1/0    | `logs(per-page,console-warnings)`                                                          | logger stable -> every page `[]` -> pages clean                                                                                                        | `ss-032 / absent -> absent`                      |
| `ss-034-log-agg-page-errors`   | p1/0    | `logs(aggregate,page-errors)`                                                              | flow complete -> `[]` -> aggregate clean                                                                                                               | `ss-033 / absent -> absent`                      |
| `ss-035-log-pages-page-errors` | p1/0    | `logs(per-page,page-errors)`                                                               | logger stable -> every page `[]` -> flow 4 clean                                                                                                       | `ss-034 / absent -> absent`                      |

#### Flow 5 — Builder and entry dirty guards with a real failed Save/retry

| ID                             | Page    | Kind / exact builder                                                                   | Precondition -> captured output -> postcondition                                                                                                                                                                                                                                                                    | Dependencies / route transition           |
| ------------------------------ | ------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `dg-001-entry-reset`           | runtime | `api(reset-entry-baseline)`                                                            | flow 4 clean -> one PATCH -> entry baseline restored                                                                                                                                                                                                                                                                | `ss-035 / absent -> absent`               |
| `dg-002-entry-proof`           | runtime | `apiRead(entry-baseline)`                                                              | PATCH settled -> exact values -> entry reset proven                                                                                                                                                                                                                                                                 | `dg-001 / absent -> absent`               |
| `dg-003-builder`               | p1/0    | `goto(paths.builder)`                                                                  | reset proven -> URL/canvas -> builder visible                                                                                                                                                                                                                                                                       | `dg-002 / absent -> absent`               |
| `dg-004-light-toggle`          | p1/0    | `click(S.colorMode)`                                                                   | flow 4 dark -> aria state -> light selected                                                                                                                                                                                                                                                                         | `dg-003 / absent -> absent`               |
| `dg-005-light-proof`           | p1/0    | `observe(theme-light)`                                                                 | toggle settled -> colors/aria -> light proven                                                                                                                                                                                                                                                                       | `dg-004 / absent -> absent`               |
| `dg-006-resize`                | p1/0    | `resize(1280,900)`                                                                     | light builder -> viewport -> 1280x900                                                                                                                                                                                                                                                                               | `dg-005 / absent -> absent`               |
| `dg-007-dirty-before`          | p1/0    | `blocksBefore(palette.dirtyText)`                                                      | canvas visible -> ID set + Insert selected -> dirty Text baseline                                                                                                                                                                                                                                                   | `dg-006 / absent -> absent`               |
| `dg-008-dirty-click`           | p1/0    | `click(S.palette("Text"))`                                                             | baseline -> click -> Text inserted                                                                                                                                                                                                                                                                                  | `dg-007 / absent -> absent`               |
| `dg-009-dirty-capture`         | p1/0    | `captureNew(palette.dirtyText,"text",dg-007)`                                          | insertion settled -> one ID -> dirty Text frozen                                                                                                                                                                                                                                                                    | `dg-007,dg-008 / absent -> absent`        |
| `dg-010-dirty-fill`            | p1/0    | `fill(S.paragraph,entry.contentDraft)`                                                 | Text selected -> value -> builder dirty draft authored                                                                                                                                                                                                                                                              | `dg-009 / absent -> absent`               |
| `dg-011-builder-before-cancel` | p1/0    | `observe(builder-draft-url-before-cancel)`                                             | builder dirty -> document bytes/URL -> before sample frozen                                                                                                                                                                                                                                                         | `dg-010 / absent -> absent`               |
| `dg-012-builder-nav-cancel`    | p1/0    | `click(S.recordsLink(screen.id))`                                                      | dirty builder -> dialog -> navigation suspended                                                                                                                                                                                                                                                                     | `dg-011 / absent -> absent`               |
| `dg-013-builder-keep`          | p1/0    | `click(S.keepEditing)`                                                                 | dialog visible -> close -> builder retained                                                                                                                                                                                                                                                                         | `dg-012 / absent -> absent`               |
| `dg-014-builder-cancel-proof`  | p1/0    | `assert(builder-cancel-byte-identical)`                                                | dialog canceled -> draft/URL read -> byte-identical                                                                                                                                                                                                                                                                 | `dg-011,dg-013 / absent -> absent`        |
| `dg-015-builder-nav-confirm`   | p1/0    | `click(S.recordsLink(screen.id))`                                                      | builder still dirty -> dialog -> navigation suspended again                                                                                                                                                                                                                                                         | `dg-014 / absent -> absent`               |
| `dg-016-builder-discard`       | p1/0    | `click(S.discard)`                                                                     | dialog visible -> navigation -> records workspace                                                                                                                                                                                                                                                                   | `dg-015 / absent -> absent`               |
| `dg-017-builder-confirm-proof` | p1/0    | `assert(builder-confirm-navigates-once)`                                               | records loaded -> URL/count/draft + exact visible Record actions control -> one navigation/discard and records workspace ready                                                                                                                                                                                      | `dg-011,dg-016 / absent -> absent`        |
| `dg-018-entry-link`            | p1/0    | `click(S.recordActions,S.editRecord)`                                                  | records workspace with exact visible Record actions control -> open exact menu then click exact Edit record item -> entry visible                                                                                                                                                                                   | `dg-017 / absent -> absent`               |
| `dg-019-select-headline`       | p1/0    | `click(S.selectBlock(screen.blockIds.headlineField))`                                  | entry visible -> selection -> Headline selected                                                                                                                                                                                                                                                                     | `dg-018 / absent -> absent`               |
| `dg-020-headline-fill`         | p1/0    | `fill(S.contentEditable(screen.blockIds.headlineField,"Headline"),entry.contentDraft)` | headline selected -> value -> content dirty                                                                                                                                                                                                                                                                         | `dg-019 / absent -> absent`               |
| `dg-021-tone-open`             | p1/0    | `click(S.toneTrigger)`                                                                 | selected target supports tone -> menu -> tone menu open                                                                                                                                                                                                                                                             | `dg-020 / absent -> absent`               |
| `dg-022-tone-muted`            | p1/0    | `click(S.muted)`                                                                       | menu open -> selected value + all Select content absent + body pointer/scroll unlocked continuously for >=600 ms across >=2 complete samples + final atomic teardown sample -> presentation dirty muted                                                                                                                | `dg-021 / absent -> absent`               |
| `dg-023-entry-before-cancel`   | p1/0    | `observe(entry-drafts-url-before-cancel)`                                              | both channels dirty -> content/presentation/URL/navigation snapshot -> before sample frozen                                                                                                                                                                                                                          | `dg-022 / absent -> absent`               |
| `dg-024-entry-nav-cancel`      | p1/0    | `click(S.recordsLink(screen.id))`                                                      | entry dirty -> current body scroll/pointer unlock + exact visible geometry + scroll settlement + final geometry/visibility + center hit-test -> exact dialog -> navigation suspended                                                                                                                                 | `dg-023 / absent -> absent`               |
| `dg-025-entry-keep`            | p1/0    | `click(S.keepEditing)`                                                                 | dialog visible -> close -> entry retained                                                                                                                                                                                                                                                                           | `dg-024 / absent -> absent`               |
| `dg-026-entry-cancel-bytes`    | p1/0    | `assert(entry-cancel-byte-identical)`                                                  | canceled -> both drafts -> byte-identical                                                                                                                                                                                                                                                                           | `dg-023,dg-025 / absent -> absent`        |
| `dg-027-entry-cancel-url`      | p1/0    | `assert(entry-cancel-url-stable)`                                                      | canceled -> before/after URL -> byte-identical                                                                                                                                                                                                                                                                      | `dg-023,dg-025 / absent -> absent`        |
| `dg-028-save-route-setup`      | p1/0    | `route(entry-save-failure,route-setup)`                                                | both drafts retained -> tuple -> malformed PATCH route installed                                                                                                                                                                                                                                                    | `dg-026,dg-027 / absent -> installed`     |
| `dg-029-save-click`            | p1/0    | `click(S.entrySave)`                                                                   | route installed/dirty -> Save -> request intercepted                                                                                                                                                                                                                                                                | `dg-028 / installed -> installed`         |
| `dg-030-save-route-hit`        | p1/0    | `route(entry-save-failure,route-hit-read)`                                             | Save pending -> captured request -> hit exactly 1                                                                                                                                                                                                                                                                   | `dg-029 / installed -> hit`               |
| `dg-030a-save-ui-settled`      | p1/0    | `observe(entry-save-failure-ui-settled)`                                               | hit read -> error visible and exact Save control re-enabled -> failure settlement latch frozen                                                                                                                                                                                                                      | `dg-030 / hit -> hit`                     |
| `dg-031-error-drafts`          | p1/0    | `assert(entry-error-retains-both-drafts)`                                              | failure UI settled -> UI/drafts/dirty flags -> content and presentation retained                                                                                                                                                                                                                                    | `dg-030a-save-ui-settled / hit -> hit`    |
| `dg-032-beforeunload`          | p1/0    | `assert(beforeunload-active)`                                                          | both channels dirty -> cancelable event -> prevented/return value set                                                                                                                                                                                                                                               | `dg-031 / hit -> hit`                     |
| `dg-033-failure-shot`          | p1/0    | `screen(dirty-save-failure)`                                                           | visible error/drafts -> PNG -> failure screenshot created                                                                                                                                                                                                                                                           | `dg-031,dg-032 / hit -> hit`              |
| `dg-034-save-unroute`          | p1/0    | `route(entry-save-failure,unroute)`                                                    | hit read and shot complete -> `true` -> route absent                                                                                                                                                                                                                                                                | `dg-030,dg-033 / hit -> absent`           |
| `dg-035-real-retry`            | p1/0    | `click(S.entrySave)`                                                                   | route absent/error visible -> real Save -> content request succeeds                                                                                                                                                                                                                                                 | `dg-034 / absent -> absent`               |
| `dg-036-retry-proof`           | p1/0    | `assert(successful-retry-clears-persisted-channel)`                                    | content Save settled -> persisted content plus the ss-006 proven empty server-presentation baseline, dg-023 local presentation bytes, and current dirty states captured -> content matches and is clean while the server presentation remains unchanged and the local presentation remains byte-identical and dirty | `ss-006,dg-023,dg-035 / absent -> absent` |
| `dg-037-entry-nav-confirm`     | p1/0    | `click(S.recordsLink(screen.id))`                                                      | presentation still dirty -> dialog -> navigation suspended                                                                                                                                                                                                                                                          | `dg-036 / absent -> absent`               |
| `dg-038-entry-discard`         | p1/0    | `click(S.discard)`                                                                     | dialog visible -> navigation -> records workspace                                                                                                                                                                                                                                                                   | `dg-037 / absent -> absent`               |
| `dg-039-entry-confirm-proof`   | p1/0    | `assert(entry-confirm-navigates-once)`                                                 | records loaded -> URL/count -> one navigation                                                                                                                                                                                                                                                                       | `dg-038 / absent -> absent`               |
| `dg-040-dark-toggle`           | p1/0    | `click(S.colorMode)`                                                                   | final records light -> aria state -> dark selected                                                                                                                                                                                                                                                                  | `dg-039 / absent -> absent`               |
| `dg-041-dark-proof`            | p1/0    | `observe(theme-dark)`                                                                  | toggle settled -> colors/aria -> dark proven                                                                                                                                                                                                                                                                        | `dg-040 / absent -> absent`               |
| `dg-042-final-shot`            | p1/0    | `screen(dirty-guards-final)`                                                           | final state -> PNG -> dirty-guards screenshot created                                                                                                                                                                                                                                                               | `dg-039,dg-041 / absent -> absent`        |
| `dg-043-log-agg-errors`        | p1/0    | `logs(aggregate,console-errors)`                                                       | expected handled error excluded from console -> `[]` -> aggregate clean                                                                                                                                                                                                                                             | `dg-042 / absent -> absent`               |
| `dg-044-log-pages-errors`      | p1/0    | `logs(per-page,console-errors)`                                                        | logger stable -> every page `[]` -> pages clean                                                                                                                                                                                                                                                                     | `dg-043 / absent -> absent`               |
| `dg-045-log-agg-warnings`      | p1/0    | `logs(aggregate,console-warnings)`                                                     | flow complete -> `[]` -> aggregate clean                                                                                                                                                                                                                                                                            | `dg-044 / absent -> absent`               |
| `dg-046-log-pages-warnings`    | p1/0    | `logs(per-page,console-warnings)`                                                      | logger stable -> every page `[]` -> pages clean                                                                                                                                                                                                                                                                     | `dg-045 / absent -> absent`               |
| `dg-047-log-agg-page-errors`   | p1/0    | `logs(aggregate,page-errors)`                                                          | flow complete -> `[]` -> aggregate clean                                                                                                                                                                                                                                                                            | `dg-046 / absent -> absent`               |
| `dg-048-log-pages-page-errors` | p1/0    | `logs(per-page,page-errors)`                                                           | logger stable -> every page `[]` -> flow 5 clean                                                                                                                                                                                                                                                                    | `dg-047 / absent -> absent`               |

#### Flow 6 — Related retry, cache identity, A -> B switch, and stale protection

| ID                                 | Page    | Kind / exact builder                                                                                   | Precondition -> captured output -> postcondition                                                                                                                                                                                                                                                         | Dependencies / route transition                                        |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `rc-001-entry-reset`               | runtime | `api(reset-entry-baseline)`                                                                            | flow 5 clean -> one PATCH -> relation/content baseline restored                                                                                                                                                                                                                                          | `dg-048 / absent -> absent`                                            |
| `rc-002-entry-proof`               | runtime | `apiRead(entry-baseline)`                                                                              | PATCH settled -> exact A IDs/B empty/other values -> entry reset proven                                                                                                                                                                                                                                  | `rc-001 / absent -> absent`                                            |
| `rc-003-overrides-reset`           | runtime | `api(reset-entry-overrides-empty)`                                                                     | entry proven -> one contract call -> presentation overrides empty                                                                                                                                                                                                                                        | `rc-002 / absent -> absent`                                            |
| `rc-004-overrides-proof`           | runtime | `apiRead(entry-overrides-empty)`                                                                       | reset settled -> `[]` -> reset proven                                                                                                                                                                                                                                                                    | `rc-003 / absent -> absent`                                            |
| `rc-005-failure-route-setup`       | p1/0    | `route(related-first-failure,route-setup)`                                                             | records workspace, entry unmounted -> tuple -> malformed GET route installed                                                                                                                                                                                                                             | `rc-004 / absent -> installed`                                         |
| `rc-006-entry-link`                | p1/0    | `goto(paths.retryEntry)`                                                                               | route installed/records visible -> retry Screen URL/document -> retry-only entry mounting with no relation FieldRenderer                                                                                                                                                                                 | `rc-005 / installed -> installed`                                      |
| `rc-007-failure-route-hit`         | p1/0    | `route(related-first-failure,route-hit-read)`                                                          | entry mounting -> captured request -> hit exactly 1                                                                                                                                                                                                                                                      | `rc-006 / installed -> hit`                                            |
| `rc-008-failure-visible`           | p1/0    | `assert(related-error-visible-before-retry)`                                                           | malformed response handled -> exact related Alert/Retry plus retry-list-root scoped rows/skeleton/empty geometry -> failure visible with zero rows, exact three visible skeleton chips, no empty fallback                                                                                                | `rc-007 / hit -> hit`                                                  |
| `rc-009-failure-shot`              | p1/0    | `screen(related-first-failure)`                                                                        | failure visible -> PNG -> first-failure screenshot created                                                                                                                                                                                                                                               | `rc-008 / hit -> hit`                                                  |
| `rc-010-failure-unroute`           | p1/0    | `route(related-first-failure,unroute)`                                                                 | hit/shot complete -> `true` -> malformed route absent                                                                                                                                                                                                                                                    | `rc-007,rc-009 / hit -> absent`                                        |
| `rc-011-visible-retry`             | p1/0    | `click(S.relatedRetry)`                                                                                | route absent/scoped related Retry visible -> real Retry -> dedicated related-failure request succeeds                                                                                                                                                                                                    | `rc-010 / absent -> absent`                                            |
| `rc-012-retry-proof`               | p1/0    | `assert(visible-retry-succeeds)`                                                                       | Retry settled -> related Alert absent plus retry-list-root scoped row/skeleton/empty geometry -> exact dedicated failure-fixture row alone and visibly rendered                                                                                                                                          | `rc-011 / absent -> absent`                                            |
| `rc-012a-records-remount`          | p1/0    | `click(S.recordsLink(screen.id))`                                                                      | related-list Retry succeeded/entry clean -> internal navigation + exact visible Record actions control -> records workspace ready                                                                                                                                                                        | `rc-012 / absent -> absent`                                            |
| `rc-012b-entry-remount`            | p1/0    | `click(S.recordActions,S.editRecord)`                                                                  | records workspace ready -> open exact Record actions menu then click exact Edit record item -> fresh entry realm mounted                                                                                                                                                                                 | `rc-012a-records-remount / absent -> absent`                           |
| `rc-012c-picker-warm-proof`        | p1/0    | `observe(relation-pickers-a-b-warm)`                                                                   | remount requests settled -> exact A1/A2/B1/B2 title buttons enabled + A related rows visible + exact positive B-list GET count frozen -> both pickers and related hook healthy/B cache warm baseline captured                                                                                            | `rc-012b-entry-remount / absent -> absent`                             |
| `rc-013-select-note`               | p1/0    | `click(S.selectBlock(screen.blockIds.spaceNoteField))`                                                 | picker warm proof complete -> selection -> unrelated text Field selected                                                                                                                                                                                                                                 | `rc-012c-picker-warm-proof / absent -> absent`                         |
| `rc-014-unrelated-fill`            | p1/0    | `fill(S.contentEditable(screen.blockIds.spaceNoteField,"Unrelated note"),entry.relatedUnrelatedDraft)` | field selected -> value -> unrelated content dirty                                                                                                                                                                                                                                                       | `rc-013 / absent -> absent`                                            |
| `rc-015-tone-open`                 | p1/0    | `click(S.toneTrigger)`                                                                                 | selected field supports tone -> menu -> tone menu open                                                                                                                                                                                                                                                   | `rc-014 / absent -> absent`                                            |
| `rc-016-tone-muted`                | p1/0    | `click(S.muted)`                                                                                       | menu open -> selected value + all Select content absent + body pointer/scroll unlocked continuously for >=600 ms across >=2 complete samples + final atomic teardown sample -> unrelated presentation dirty                                                                                              | `rc-015 / absent -> absent`                                            |
| `rc-017-unrelated-before`          | p1/0    | `observe(related-unrelated-drafts-before)`                                                             | both unrelated channels dirty -> bytes -> before sample frozen                                                                                                                                                                                                                                           | `rc-016 / absent -> absent`                                            |
| `rc-017a-pre-route-a-baseline`     | p1/0    | `observe(related-a-visible-baseline)`                                                                  | main entry/pickers settled -> exact main-A-list-root row IDs/text/positive rects and zero skeleton/empty geometry + current p1 `navigationCount` -> pre-route visible/navigation baseline frozen                                                                                                         | `rc-017 / absent -> absent`                                            |
| `rc-017b-auth-rate-window-barrier` | p1/0    | `authRateWindowBarrier()`                                                                              | entry baseline stable/bounded rate epoch -> configured auth window naturally expires when enabled or timer is skipped when disabled + bounded realm-stability proof -> exact `{"barrierSatisfied":true}`                                                                                                 | `rc-017a-pre-route-a-baseline / absent -> absent`                      |
| `rc-018-refresh-route-setup`       | p1/0    | `route(related-a-refresh,route-setup)`                                                                 | first failure recovered/drafts and A baseline held -> tuple -> delayed A route installed                                                                                                                                                                                                                 | `rc-017b-auth-rate-window-barrier / absent -> installed`               |
| `rc-019-related-tab-new`           | p2/1    | `tab-new(paths.relatedEntryA1Editor)`                                                                  | route installed/context logger active -> identity/URL -> p2 related-A editor                                                                                                                                                                                                                             | `rc-018 / installed -> installed`                                      |
| `rc-020-related-tab-edit`          | p2/1    | `fill(S.secondTabTitle,relatedEntries.a1.updatedTitle)`                                                | p2 editor visible -> value -> harmless A1 draft                                                                                                                                                                                                                                                          | `rc-019 / installed -> installed`                                      |
| `rc-021-related-tab-save`          | p2/1    | `click(S.secondTabSave)`                                                                               | p2 dirty -> real Save draft click/request begins -> A mutation in flight                                                                                                                                                                                                                                 | `rc-020 / installed -> installed`                                      |
| `rc-021a-related-tab-save-settled` | p2/1    | `observe(related-tab-save-settled)`                                                                    | mutation in flight -> exact PATCH method/path/success + strict returned A1 ID/updated title + Save draft re-enabled/`Saving...` absent -> A1 persisted and cache broadcast completed                                                                                                                     | `rc-021 / installed -> installed`                                      |
| `rc-022-related-tab-origin`        | p1/0    | `tab-select(0)`                                                                                        | p2 save settlement proven -> selected tab -> p1 restored                                                                                                                                                                                                                                                 | `rc-021a-related-tab-save-settled / installed -> installed`            |
| `rc-023-refresh-route-hit`         | p1/0    | `route(related-a-refresh,route-hit-read)`                                                              | broadcast refresh started after p2 Save -> strict parsed authoritative updated-A response with exact A IDs/no duplicate or unknown row keys/A1 updated title -> `{"hits":1,"captured":true,"rowCount":2,"rowIdsMatch":true,"uniqueIds":true,"updatedA1Matches":true}`/pending                            | `rc-022 / installed -> hit`                                            |
| `rc-024-same-target`               | p1/0    | `assert(same-target-visible-rows-retained)`                                                            | updated-A response pending -> main-A-list-root scoped row IDs/text/rects/skeleton/empty plus related Alert -> pre-route A baseline retained                                                                                                                                                              | `rc-017a-pre-route-a-baseline,rc-023 / hit -> hit`                     |
| `rc-025-clear-a1`                  | p1/0    | `click(S.relationEntry(screen.blockIds.relationAField,relatedEntries.a1.title))`                       | relation A has A1/A2 -> toggle -> A1 cleared, A2 remains                                                                                                                                                                                                                                                 | `rc-024 / hit -> hit`                                                  |
| `rc-026-clear-a2`                  | p1/0    | `click(S.relationEntry(screen.blockIds.relationAField,relatedEntries.a2.title))`                       | relation A has A2 -> toggle -> relation A empty                                                                                                                                                                                                                                                          | `rc-025 / hit -> hit`                                                  |
| `rc-027-target-empty`              | p1/0    | `assert(target-switch-immediate-empty)`                                                                | A empty/B untouched -> main A/B list-root scoped rows/skeleton/empty geometry -> zero rows/no empty nodes/exact three visible skeleton chips in each root                                                                                                                                                | `rc-026 / hit -> hit`                                                  |
| `rc-028-select-b1`                 | p1/0    | `click(S.relationEntry(screen.blockIds.relationBField,relatedEntries.b1.title))`                       | B picker warm/empty -> toggle -> B1 selected                                                                                                                                                                                                                                                             | `rc-027 / hit -> hit`                                                  |
| `rc-029-select-b2`                 | p1/0    | `click(S.relationEntry(screen.blockIds.relationBField,relatedEntries.b2.title))`                       | B1 selected -> toggle -> exact B1/B2 selected                                                                                                                                                                                                                                                            | `rc-028 / hit -> hit`                                                  |
| `rc-030-only-b`                    | p1/0    | `assert(only-b-rows-visible)`                                                                          | B selection settled -> main-B-list-root scoped IDs/rects plus zero skeleton/empty geometry and B-list GET count unchanged from rc-012c -> exact B rows visible from warmed cache with zero network delta                                                                                                 | `rc-012c-picker-warm-proof,rc-029 / hit -> hit`                        |
| `rc-031-draft-proof`               | p1/0    | `assert(unrelated-draft-byte-identical)`                                                               | B visible/A pending -> before/after bytes -> unrelated channels unchanged                                                                                                                                                                                                                                | `rc-017,rc-030 / hit -> hit`                                           |
| `rc-032-diff-proof`                | p1/0    | `assert(relation-diff-exact)`                                                                          | current root-scoped A/B picker pressed states + relation paths from frozen exact-reset `rc-002` baseline + exhaustive non-relation current-draft diff against frozen post-unrelated-edits `rc-017` sample -> A/B/other paths -> only A cleared+B selected and no post-`rc-017` non-relation path changed | `rc-002,rc-017,rc-030,rc-031 / hit -> hit`                             |
| `rc-033-stale-shot`                | p1/0    | `screen(related-a-stale)`                                                                              | B visible/A pending -> PNG -> stale-A screenshot created                                                                                                                                                                                                                                                 | `rc-030,rc-031,rc-032 / hit -> hit`                                    |
| `rc-034-refresh-release`           | p1/0    | `route(related-a-refresh,route-release)`                                                               | captured A response held -> fulfillment receipt -> response released/UI settled                                                                                                                                                                                                                          | `rc-023,rc-033 / hit -> released`                                      |
| `rc-035-stale-proof`               | p1/0    | `assert(stale-a-cannot-commit)`                                                                        | updated-A settled after target B -> exact main-A title and main-B row state captured -> updated A1 title absent only inside the main-A list root while B-root rows remain retained                                                                                                                       | `rc-034 / released -> released`                                        |
| `rc-036-refresh-unroute`           | p1/0    | `route(related-a-refresh,unroute)`                                                                     | stale protection proven -> `true` -> delayed route absent                                                                                                                                                                                                                                                | `rc-035 / released -> absent`                                          |
| `rc-037-final-shot`                | p1/0    | `screen(related-b-dark)`                                                                               | B retained/dark -> PNG -> final related screenshot created                                                                                                                                                                                                                                               | `rc-035,rc-036 / absent -> absent`                                     |
| `rc-037a-exit-navigation`          | p1/0    | `click(S.recordsLink(screen.id))`                                                                      | content/presentation/relation drafts still dirty -> real internal navigation -> discard dialog visible/navigation suspended                                                                                                                                                                              | `rc-037 / absent -> absent`                                            |
| `rc-037b-exit-discard`             | p1/0    | `click(S.discard)`                                                                                     | discard dialog visible -> real discard action -> records workspace loaded                                                                                                                                                                                                                                | `rc-037a-exit-navigation / absent -> absent`                           |
| `rc-037c-exit-proof`               | p1/0    | `assert(flow6-exit-discarded-once)`                                                                    | records workspace settled -> URL/current p1 navigation count minus frozen `rc-017a` count/entry dirty badges -> exact delta one and both dirty channels unmounted                                                                                                                                        | `rc-017a-pre-route-a-baseline,rc-037b-exit-discard / absent -> absent` |
| `rc-038-log-agg-errors`            | p1/0    | `logs(aggregate,console-errors)`                                                                       | flow complete -> both pages aggregate `[]` -> clean                                                                                                                                                                                                                                                      | `rc-037c-exit-proof / absent -> absent`                                |
| `rc-039-log-pages-errors`          | p1/0    | `logs(per-page,console-errors)`                                                                        | p1+p2 registered -> both `[]` -> page errors clean                                                                                                                                                                                                                                                       | `rc-038 / absent -> absent`                                            |
| `rc-040-log-agg-warnings`          | p1/0    | `logs(aggregate,console-warnings)`                                                                     | flow complete -> both pages aggregate `[]` -> clean                                                                                                                                                                                                                                                      | `rc-039 / absent -> absent`                                            |
| `rc-041-log-pages-warnings`        | p1/0    | `logs(per-page,console-warnings)`                                                                      | p1+p2 registered -> both `[]` -> page warnings clean                                                                                                                                                                                                                                                     | `rc-040 / absent -> absent`                                            |
| `rc-042-log-agg-page-errors`       | p1/0    | `logs(aggregate,page-errors)`                                                                          | flow complete -> both pages aggregate `[]` -> clean                                                                                                                                                                                                                                                      | `rc-041 / absent -> absent`                                            |
| `rc-043-log-pages-page-errors`     | p1/0    | `logs(per-page,page-errors)`                                                                           | p1+p2 registered -> both `[]` -> flow 6 clean                                                                                                                                                                                                                                                            | `rc-042 / absent -> absent`                                            |
| `rc-044-close-second-tab`          | p2/1    | `tab-close(1)`                                                                                         | both-page logs captured -> close receipt -> p2 closed, identity retained in logger evidence                                                                                                                                                                                                              | `rc-043 / absent -> absent`                                            |
| `rc-045-origin-proof`              | p1/0    | `tab-select(0)`                                                                                        | p2 closed -> selected tab -> p1 active                                                                                                                                                                                                                                                                   | `rc-044 / absent -> absent`                                            |

##### Flow 6 fixture rationale and historical cacheBus prerequisite

The retry-only Screen above is mandatory, not optional fixture complexity. On the main
Screen's first mount, `useScreenRelatedEntries` starts a non-force A read while each
visible relation `FieldRenderer` starts force A/B reads; the force A request bypasses
pending dedupe. Therefore `related-first-failure` cannot truthfully have exact hit `1`
on the main Screen. The retry Screen contains exactly one dedicated related-failure
list block and no relation Field block, so the malformed-route interval has one
source-grounded request for the failure fixture only.
After real Retry succeeds, the manifest navigates to the main Screen, waits for both
real relation pickers and the related-list hook to settle, and only then authors the
unrelated drafts.

At an earlier closure revision, the same four-key remote event arrived once through the
canonical transport and once through the legacy mirror. A read-only reproduction then
observed two deliveries, and force refresh bypassed pending-request dedupe, so the
manifest's exact-one `related-a-refresh` assertion was not executable. TASK-540-04-L03
repaired that cacheBus transport correlation and passed its owner/dependency matrix; the
old generation/token receipt and its three-path repair scope are retained only as
historical evidence in the L03/root headers.

That cacheBus blocker is resolved and is not a current special smoke prerequisite. The
current workflow validates cacheBus through the ordinary L03 and aggregate command
matrices; it has no separate
`source_prerequisite_unmet:cache_bus_transport_dedupe` branch and does not require the
historical `/ gate green` token as the current L03 receipt. Flow 6 still must observe
exactly one visible refresh for one mirrored logical event. Any regression fails the
normal targeted/full validation or live-flow assertion; it cannot be hidden by relaxing
route hits, clearing caches, synthesizing events, or re-baselining the expectation.

#### Flow 7 — Responsive geometry, preference races, and user A/B isolation

Every viewport uses four separate commands after resize: hide the open panel, capture
closed geometry, show the panel, capture open geometry. `geometry(width,state)` reads
the scroller border/content boxes, computed right padding, and panel rect; it performs
no click and stores the sample executor-locally for the three final geometry assertions.

| ID                                        | Page    | Kind / exact builder                                                  | Precondition -> captured output -> postcondition                                                                                                                                                                                                                                                                      | Dependencies / route transition                                           |
| ----------------------------------------- | ------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ru-001-screen-reset`                     | runtime | `api(reset-screen-baseline)`                                          | flow 6 clean -> one PATCH -> preseed Screen restored                                                                                                                                                                                                                                                                  | `rc-045 / absent -> absent`                                               |
| `ru-002-screen-proof`                     | runtime | `apiRead(screen-baseline)`                                            | PATCH settled -> exact document -> Screen reset proven                                                                                                                                                                                                                                                                | `ru-001 / absent -> absent`                                               |
| `ru-003-entry-reset`                      | runtime | `api(reset-entry-baseline)`                                           | Screen proven -> one PATCH -> entry baseline restored                                                                                                                                                                                                                                                                 | `ru-002 / absent -> absent`                                               |
| `ru-004-entry-proof`                      | runtime | `apiRead(entry-baseline)`                                             | PATCH settled -> exact values -> entry reset proven                                                                                                                                                                                                                                                                   | `ru-003 / absent -> absent`                                               |
| `ru-005-overrides-reset`                  | runtime | `api(reset-entry-overrides-empty)`                                    | entry proven -> one contract call -> overrides empty                                                                                                                                                                                                                                                                  | `ru-004 / absent -> absent`                                               |
| `ru-006-overrides-proof`                  | runtime | `apiRead(entry-overrides-empty)`                                      | reset settled -> `[]` -> reset complete                                                                                                                                                                                                                                                                               | `ru-005 / absent -> absent`                                               |
| `ru-007-builder`                          | p1/0    | `goto(paths.builder)`                                                 | reset complete -> URL/canvas -> builder, panel open                                                                                                                                                                                                                                                                   | `ru-006 / absent -> absent`                                               |
| `ru-008-resize-320`                       | p1/0    | `resize(320,844)`                                                     | panel open -> viewport -> 320x844                                                                                                                                                                                                                                                                                     | `ru-007 / absent -> absent`                                               |
| `ru-009-hide-320`                         | p1/0    | `click(S.panelHide)`                                                  | panel open -> toggle -> panel closed                                                                                                                                                                                                                                                                                  | `ru-008 / absent -> absent`                                               |
| `ru-010-closed-320`                       | p1/0    | `observe(geometry-320-closed)`                                        | panel closed -> geometry sample -> closed 320 frozen                                                                                                                                                                                                                                                                  | `ru-009 / absent -> absent`                                               |
| `ru-011-show-320`                         | p1/0    | `click(S.panelShow)`                                                  | panel closed -> toggle -> panel open                                                                                                                                                                                                                                                                                  | `ru-010 / absent -> absent`                                               |
| `ru-012-open-320`                         | p1/0    | `observe(geometry-320-open)`                                          | panel open -> geometry/panel sample -> open 320 frozen                                                                                                                                                                                                                                                                | `ru-011 / absent -> absent`                                               |
| `ru-013-resize-390`                       | p1/0    | `resize(390,844)`                                                     | panel open -> viewport -> 390x844                                                                                                                                                                                                                                                                                     | `ru-012 / absent -> absent`                                               |
| `ru-014-hide-390`                         | p1/0    | `click(S.panelHide)`                                                  | panel open -> toggle -> panel closed                                                                                                                                                                                                                                                                                  | `ru-013 / absent -> absent`                                               |
| `ru-015-closed-390`                       | p1/0    | `observe(geometry-390-closed)`                                        | panel closed -> geometry sample -> closed 390 frozen                                                                                                                                                                                                                                                                  | `ru-014 / absent -> absent`                                               |
| `ru-016-show-390`                         | p1/0    | `click(S.panelShow)`                                                  | panel closed -> toggle -> panel open                                                                                                                                                                                                                                                                                  | `ru-015 / absent -> absent`                                               |
| `ru-017-open-390`                         | p1/0    | `observe(geometry-390-open)`                                          | panel open -> geometry/panel sample -> open 390 frozen                                                                                                                                                                                                                                                                | `ru-016 / absent -> absent`                                               |
| `ru-018-resize-480`                       | p1/0    | `resize(480,844)`                                                     | panel open -> viewport -> 480x844                                                                                                                                                                                                                                                                                     | `ru-017 / absent -> absent`                                               |
| `ru-019-hide-480`                         | p1/0    | `click(S.panelHide)`                                                  | panel open -> toggle -> panel closed                                                                                                                                                                                                                                                                                  | `ru-018 / absent -> absent`                                               |
| `ru-020-closed-480`                       | p1/0    | `observe(geometry-480-closed)`                                        | panel closed -> geometry sample -> closed 480 frozen                                                                                                                                                                                                                                                                  | `ru-019 / absent -> absent`                                               |
| `ru-021-show-480`                         | p1/0    | `click(S.panelShow)`                                                  | panel closed -> toggle -> panel open                                                                                                                                                                                                                                                                                  | `ru-020 / absent -> absent`                                               |
| `ru-022-open-480`                         | p1/0    | `observe(geometry-480-open)`                                          | panel open -> geometry/panel sample -> open 480 frozen                                                                                                                                                                                                                                                                | `ru-021 / absent -> absent`                                               |
| `ru-023-resize-1024`                      | p1/0    | `resize(1024,900)`                                                    | panel open -> viewport -> 1024x900                                                                                                                                                                                                                                                                                    | `ru-022 / absent -> absent`                                               |
| `ru-024-hide-1024`                        | p1/0    | `click(S.panelHide)`                                                  | panel open -> toggle -> panel closed                                                                                                                                                                                                                                                                                  | `ru-023 / absent -> absent`                                               |
| `ru-025-closed-1024`                      | p1/0    | `observe(geometry-1024-closed)`                                       | panel closed -> geometry sample -> closed 1024 frozen                                                                                                                                                                                                                                                                 | `ru-024 / absent -> absent`                                               |
| `ru-026-show-1024`                        | p1/0    | `click(S.panelShow)`                                                  | panel closed -> toggle -> panel open                                                                                                                                                                                                                                                                                  | `ru-025 / absent -> absent`                                               |
| `ru-027-open-1024`                        | p1/0    | `observe(geometry-1024-open)`                                         | panel open -> geometry/panel sample -> open 1024 frozen                                                                                                                                                                                                                                                               | `ru-026 / absent -> absent`                                               |
| `ru-028-resize-1280`                      | p1/0    | `resize(1280,900)`                                                    | panel open -> viewport -> 1280x900                                                                                                                                                                                                                                                                                    | `ru-027 / absent -> absent`                                               |
| `ru-029-hide-1280`                        | p1/0    | `click(S.panelHide)`                                                  | panel open -> toggle -> panel closed                                                                                                                                                                                                                                                                                  | `ru-028 / absent -> absent`                                               |
| `ru-030-closed-1280`                      | p1/0    | `observe(geometry-1280-closed)`                                       | panel closed -> geometry sample -> closed 1280 frozen                                                                                                                                                                                                                                                                 | `ru-029 / absent -> absent`                                               |
| `ru-031-show-1280`                        | p1/0    | `click(S.panelShow)`                                                  | panel closed -> toggle -> panel open                                                                                                                                                                                                                                                                                  | `ru-030 / absent -> absent`                                               |
| `ru-032-open-1280`                        | p1/0    | `observe(geometry-1280-open)`                                         | panel open -> geometry/panel sample -> open 1280 frozen                                                                                                                                                                                                                                                               | `ru-031 / absent -> absent`                                               |
| `ru-033-narrow-proof`                     | p1/0    | `assert(narrow-padding-and-positive-geometry)`                        | six narrow samples -> strict samples -> 24px/positive/equal boxes                                                                                                                                                                                                                                                     | `ru-010,ru-012,ru-015,ru-017,ru-020,ru-022 / absent -> absent`            |
| `ru-034-wide-proof`                       | p1/0    | `assert(wide-padding-delta-300)`                                      | four wide samples -> strict samples -> 32/332px and 300px delta                                                                                                                                                                                                                                                       | `ru-025,ru-027,ru-030,ru-032 / absent -> absent`                          |
| `ru-035-panel-proof`                      | p1/0    | `assert(panel-inside-viewport)`                                       | five open samples -> rects -> panel inside every viewport                                                                                                                                                                                                                                                             | `ru-012,ru-017,ru-022,ru-027,ru-032 / absent -> absent`                   |
| `ru-036-light-toggle`                     | p1/0    | `click(S.colorMode)`                                                  | flow 6 dark -> aria state -> light selected                                                                                                                                                                                                                                                                           | `ru-035 / absent -> absent`                                               |
| `ru-037-light-proof`                      | p1/0    | `observe(theme-light-user-a-candidate)`                               | toggle settled -> colors/aria -> light captured                                                                                                                                                                                                                                                                       | `ru-036 / absent -> absent`                                               |
| `ru-038-entry`                            | p1/0    | `goto(paths.entry)`                                                   | geometry complete -> URL/document -> bootstrap entry visible                                                                                                                                                                                                                                                          | `ru-037 / absent -> absent`                                               |
| `ru-039-bootstrap-menu`                   | p1/0    | `click(S.bootstrapUserMenu)`                                          | bootstrap entry -> menu -> menu open                                                                                                                                                                                                                                                                                  | `ru-038 / absent -> absent`                                               |
| `ru-040-bootstrap-signout`                | p1/0    | `click(S.signOut)`                                                    | menu open -> real logout click/navigation initiated -> bootstrap realm leaving                                                                                                                                                                                                                                        | `ru-039 / absent -> absent`                                               |
| `ru-040a-bootstrap-signout-settled`       | p1/0    | `observe(signout-settled-bootstrap)`                                  | logout initiated -> exact canonical `paths.login` URL + positive-geometry exact email/password/submit selectors -> login realm settled                                                                                                                                                                                | `ru-040 / absent -> absent`                                               |
| `ru-041-a-email`                          | p1/0    | `fill(S.loginEmail,$WF540_USER_A_EMAIL)`                              | settled login form -> discarded -> A email filled                                                                                                                                                                                                                                                                     | `ru-040a-bootstrap-signout-settled / absent -> absent`                    |
| `ru-042-a-password`                       | p1/0    | `fill(S.loginPassword,$ADMIN_PASSWORD)`                               | A email filled -> discarded -> password filled                                                                                                                                                                                                                                                                        | `ru-041 / absent -> absent`                                               |
| `ru-043-a-submit`                         | p1/0    | `click(S.loginSubmit)`                                                | credentials filled -> auth navigation -> A authenticated                                                                                                                                                                                                                                                              | `ru-042 / absent -> absent`                                               |
| `ru-043a-a-identity-settled`              | p1/0    | `observe(auth-identity-settled-users-a)`                              | submit navigation started -> post-login Admin URL + positive-geometry `S.userMenu(users.a.displayName)` -> A realm settled                                                                                                                                                                                            | `ru-043 / absent -> absent`                                               |
| `ru-043b-a-api-login`                     | runtime | `isolatedApiSessionLogin(user-a)`                                     | A browser identity proven -> one login in empty unique-UA isolated jar + exact session-row inventory -> isolated A API session acquired                                                                                                                                                                               | `ru-043a-a-identity-settled / absent -> absent`                           |
| `ru-043c-a-api-csrf-capture`              | runtime | `isolatedApiSessionCsrfCapture(user-a)`                               | isolated A session acquired -> one CSRF request/private rotated capability -> isolated A writes authorized without changing browser jar                                                                                                                                                                               | `ru-043b-a-api-login / absent -> absent`                                  |
| `ru-044-a-entry`                          | p1/0    | `goto(paths.entry)`                                                   | A browser/API identities settled -> URL/document -> A entry visible                                                                                                                                                                                                                                                   | `ru-043c-a-api-csrf-capture / absent -> absent`                           |
| `ru-045-a-light-capture`                  | p1/0    | `observe(user-a-light-computed)`                                      | A entry/light storage -> computed colors -> A light sample frozen                                                                                                                                                                                                                                                     | `ru-037,ru-044 / absent -> absent`                                        |
| `ru-046-a-metadata-enable`                | p1/0    | `click(S.metadata)`                                                   | A preference false -> UI + real PATCH -> visible true/write pending                                                                                                                                                                                                                                                   | `ru-045 / absent -> absent`                                               |
| `ru-047-a-write-settle`                   | p1/0    | `observe(preference-a-write-settled)`                                 | PATCH started -> exact browser PATCH sequence 1/success/strict `{version:1,showFieldMetadata:true}`/user-A match + checked positive-geometry Switch + true metadata badge geometry -> A browser write settled                                                                                                         | `ru-046 / absent -> absent`                                               |
| `ru-047a-a-durable-proof`                 | runtime | `isolatedApiSessionApiReadAs(user-a,preference-initial-true)`         | browser write settled -> strict exact `{key:"customScreens.entry.preferences",value:{version:1,showFieldMetadata:true}}` -> A true durable independently proven                                                                                                                                                       | `ru-047 / absent -> absent`                                               |
| `ru-048-a-first-shot`                     | p1/0    | `screen(responsive-user-a-light)`                                     | A true durable/light/badges visible -> PNG -> A screenshot created                                                                                                                                                                                                                                                    | `ru-047a-a-durable-proof / absent -> absent`                              |
| `ru-049-a-away`                           | p1/0    | `click(S.recordsLink(screen.id))`                                     | entry clean -> internal navigation/monotonic unmount-window start + exact visible Record actions control -> records workspace ready in same realm                                                                                                                                                                     | `ru-047a-a-durable-proof / absent -> absent`                              |
| `ru-050-a-server-false`                   | runtime | `isolatedApiSessionApiAs(user-a,set-preference-false)`                | isolated A capability -> one strict PATCH through isolated APIRequestContext -> server false                                                                                                                                                                                                                          | `ru-049 / absent -> absent`                                               |
| `ru-051-a-server-false-proof`             | runtime | `isolatedApiSessionApiReadAs(user-a,preference)`                      | PATCH settled -> strict exact `{key:"customScreens.entry.preferences",value:{version:1,showFieldMetadata:false}}` -> server change proven                                                                                                                                                                             | `ru-050 / absent -> absent`                                               |
| `ru-052-a-return`                         | p1/0    | `click(S.recordActions,S.editRecord)`                                 | records same realm with exact visible Record actions control before 20,000 ms deadline -> open exact menu then click exact Edit record item + retained coordinator mount -> A entry remounted                                                                                                                         | `ru-051 / absent -> absent`                                               |
| `ru-053-a-authoritative`                  | p1/0    | `assert(same-user-authoritative-refresh)`                             | remount read settled -> before/server/after plus false badge geometry -> false replaces proven durable true                                                                                                                                                                                                           | `ru-047a-a-durable-proof,ru-051,ru-052 / absent -> absent`                |
| `ru-053a-a-nondefault-toggle`             | p1/0    | `click(S.metadata)`                                                   | authoritative false visible -> real UI PATCH/optimistic state -> non-default true intent                                                                                                                                                                                                                              | `ru-053 / absent -> absent`                                               |
| `ru-053b-a-nondefault-write-settled`      | p1/0    | `observe(nondefault-browser-patch-settled)`                           | true intent started -> context logger exact current-A PATCH sequence 2/success/strict true response -> non-default true persisted                                                                                                                                                                                     | `ru-053a-a-nondefault-toggle / absent -> absent`                          |
| `ru-054-a-away-again`                     | p1/0    | `click(S.recordsLink(screen.id))`                                     | A non-default true persisted/entry clean -> internal navigation/second monotonic unmount-window start + exact visible Record actions control -> records workspace ready                                                                                                                                               | `ru-053b-a-nondefault-write-settled / absent -> absent`                   |
| `ru-055-read-route-setup`                 | p1/0    | `route(preference-a-read-refresh,route-setup)`                        | A away/latest non-default true settled -> tuple -> delayed GET installed                                                                                                                                                                                                                                              | `ru-054 / absent -> installed`                                            |
| `ru-056-a-remount-pending`                | p1/0    | `click(S.recordActions,S.editRecord)`                                 | route installed/records ready before 20,000 ms deadline -> open exact Record actions menu then click exact Edit record item + retained coordinator mount -> A entry remount/read pending                                                                                                                              | `ru-055 / installed -> installed`                                         |
| `ru-057-read-route-hit`                   | p1/0    | `route(preference-a-read-refresh,route-hit-read)`                     | remount -> exact GET/no-body validated and stale non-default true response captured -> `{"hits":1,"captured":true,"method":"GET","bodyAbsent":true}`/pending                                                                                                                                                          | `ru-056 / installed -> hit`                                               |
| `ru-058-retained-pending`                 | p1/0    | `assert(same-user-retained-view-pending)`                             | GET pending -> DOM/shared value -> settled non-default true retained, distinguishable from cold default false                                                                                                                                                                                                         | `ru-057 / hit -> hit`                                                     |
| `ru-059-new-local-toggle`                 | p1/0    | `click(S.metadata)`                                                   | retained true/read pending -> UI/write -> newer local false                                                                                                                                                                                                                                                           | `ru-058 / hit -> hit`                                                     |
| `ru-059a-new-local-browser-write-settled` | p1/0    | `observe(new-local-browser-patch-settled)`                            | UI false/write started -> context logger exact current-A PATCH sequence 3/success/strict false response -> browser write succeeded and durable false before stale-read release                                                                                                                                        | `ru-059 / hit -> hit`                                                     |
| `ru-060-new-local-pending`                | p1/0    | `assert(newer-local-write-pending)`                                   | browser PATCH settled/read held -> visible/generation -> false wins pending                                                                                                                                                                                                                                           | `ru-059a-new-local-browser-write-settled / hit -> hit`                    |
| `ru-061-read-release`                     | p1/0    | `route(preference-a-read-refresh,route-release)`                      | captured stale true held/newer browser PATCH proven durable false -> fulfillment -> response released/UI settled                                                                                                                                                                                                      | `ru-057,ru-059a-new-local-browser-write-settled,ru-060 / hit -> released` |
| `ru-061a-a-durable-bypass-read`           | runtime | `isolatedApiSessionApiReadAs(user-a,preference-outside-page-routing)` | stale page response released -> isolated A API strict exact `{key:"customScreens.entry.preferences",value:{version:1,showFieldMetadata:false}}` -> persisted false frozen without touching page route or browser cookies                                                                                              | `ru-061 / released -> released`                                           |
| `ru-062-new-local-wins`                   | p1/0    | `assert(newer-local-write-wins-refresh)`                              | stale true read settled + independent durable capture -> current DOM/generation -> newer false retained/persisted                                                                                                                                                                                                     | `ru-061,ru-061a-a-durable-bypass-read / released -> released`             |
| `ru-063-read-unroute`                     | p1/0    | `route(preference-a-read-refresh,unroute)`                            | winner proven -> `true` -> delayed GET absent                                                                                                                                                                                                                                                                         | `ru-062 / released -> absent`                                             |
| `ru-064-legacy-storage`                   | p1/0    | `assert(legacy-local-storage-absent)`                                 | A state settled -> key/read/write instrumentation -> absent/no writes                                                                                                                                                                                                                                                 | `ru-063 / absent -> absent`                                               |
| `ru-065-a-menu`                           | p1/0    | `click(S.userMenu(users.a.displayName))`                              | A entry -> menu -> menu open                                                                                                                                                                                                                                                                                          | `ru-064 / absent -> absent`                                               |
| `ru-066-a-signout`                        | p1/0    | `click(S.signOut)`                                                    | menu open -> real logout click/navigation initiated -> A realm leaving                                                                                                                                                                                                                                                | `ru-065 / absent -> absent`                                               |
| `ru-066a-a-signout-settled`               | p1/0    | `observe(signout-settled-user-a)`                                     | logout initiated -> exact canonical `paths.login` URL + positive-geometry exact login form -> login realm settled                                                                                                                                                                                                     | `ru-066 / absent -> absent`                                               |
| `ru-067-b-email`                          | p1/0    | `fill(S.loginEmail,$WF540_USER_B_EMAIL)`                              | settled login form -> discarded -> B email filled                                                                                                                                                                                                                                                                     | `ru-066a-a-signout-settled / absent -> absent`                            |
| `ru-068-b-password`                       | p1/0    | `fill(S.loginPassword,$ADMIN_PASSWORD)`                               | B email filled -> discarded -> password filled                                                                                                                                                                                                                                                                        | `ru-067 / absent -> absent`                                               |
| `ru-069-b-submit`                         | p1/0    | `click(S.loginSubmit)`                                                | credentials filled -> auth navigation -> B authenticated                                                                                                                                                                                                                                                              | `ru-068 / absent -> absent`                                               |
| `ru-069a-b-identity-settled`              | p1/0    | `observe(auth-identity-settled-users-b)`                              | submit navigation started -> post-login Admin URL + positive-geometry `S.userMenu(users.b.displayName)` -> B realm settled                                                                                                                                                                                            | `ru-069 / absent -> absent`                                               |
| `ru-070-b-entry`                          | p1/0    | `goto(paths.entry)`                                                   | B identity settled -> URL/document -> B entry mounting                                                                                                                                                                                                                                                                | `ru-069a-b-identity-settled / absent -> absent`                           |
| `ru-071-b-dark-toggle`                    | p1/0    | `click(S.colorMode)`                                                  | shared theme currently light -> aria state -> dark selected                                                                                                                                                                                                                                                           | `ru-070 / absent -> absent`                                               |
| `ru-072-b-dark-capture`                   | p1/0    | `observe(user-b-dark-computed)`                                       | toggle settled/B entry settled -> exact root/body colors + aria + root-scoped metadata effect `false` -> B dark/default-false sample frozen                                                                                                                                                                           | `ru-071 / absent -> absent`                                               |
| `ru-073-light-dark-proof`                 | p1/0    | `assert(light-and-dark-computed)`                                     | A/B samples -> computed colors/themes + frozen B root-scoped metadata effect -> A light/B dark/default false                                                                                                                                                                                                          | `ru-045,ru-072 / absent -> absent`                                        |
| `ru-074-b-shot`                           | p1/0    | `screen(responsive-user-b-dark)`                                      | B false/dark -> PNG -> B screenshot created                                                                                                                                                                                                                                                                           | `ru-073 / absent -> absent`                                               |
| `ru-075-b-menu`                           | p1/0    | `click(S.userMenu(users.b.displayName))`                              | B entry -> menu -> menu open                                                                                                                                                                                                                                                                                          | `ru-074 / absent -> absent`                                               |
| `ru-076-b-signout`                        | p1/0    | `click(S.signOut)`                                                    | menu open -> real logout click/navigation initiated -> B realm leaving                                                                                                                                                                                                                                                | `ru-075 / absent -> absent`                                               |
| `ru-076a-b-signout-settled`               | p1/0    | `observe(signout-settled-user-b)`                                     | logout initiated -> exact canonical `paths.login` URL + positive-geometry exact login form -> login realm settled                                                                                                                                                                                                     | `ru-076 / absent -> absent`                                               |
| `ru-076b-auth-rate-window-barrier`        | p1/0    | `authRateWindowBarrier()`                                             | login realm stable/bounded rate epoch -> configured auth window naturally expires when enabled or timer is skipped when disabled + bounded realm-stability proof -> exact `{"barrierSatisfied":true}`                                                                                                                 | `ru-076a-b-signout-settled / absent -> absent`                            |
| `ru-077-a2-email`                         | p1/0    | `fill(S.loginEmail,$WF540_USER_A_EMAIL)`                              | settled login form -> discarded -> A email filled                                                                                                                                                                                                                                                                     | `ru-076b-auth-rate-window-barrier / absent -> absent`                     |
| `ru-078-a2-password`                      | p1/0    | `fill(S.loginPassword,$ADMIN_PASSWORD)`                               | A email filled -> discarded -> password filled                                                                                                                                                                                                                                                                        | `ru-077 / absent -> absent`                                               |
| `ru-079-a2-submit`                        | p1/0    | `click(S.loginSubmit)`                                                | credentials filled -> auth navigation -> A authenticated                                                                                                                                                                                                                                                              | `ru-078 / absent -> absent`                                               |
| `ru-079a-a2-identity-settled`             | p1/0    | `observe(auth-identity-settled-users-a)`                              | submit navigation started -> post-login Admin URL + exact A trigger -> A realm settled                                                                                                                                                                                                                                | `ru-079 / absent -> absent`                                               |
| `ru-080-a2-entry`                         | p1/0    | `goto(paths.entry)`                                                   | A identity settled -> URL/document -> returned A entry mounting                                                                                                                                                                                                                                                       | `ru-079a-a2-identity-settled / absent -> absent`                          |
| `ru-081-a2-light-toggle`                  | p1/0    | `click(S.colorMode)`                                                  | shared theme dark -> aria state -> light selected                                                                                                                                                                                                                                                                     | `ru-080 / absent -> absent`                                               |
| `ru-082-isolation-proof`                  | p1/0    | `assert(user-a-b-a-isolated)`                                         | first A durable proof + frozen B sample from `ru-072` + current returned-A strict read/root-scoped metadata effect + `ru-081` light toggle -> exact per-user values and reject-unknown current `userAReturnComputed` theme/aria/root/body-color sample -> per-user values isolated and returned A visibly false/light | `ru-047a-a-durable-proof,ru-072,ru-080,ru-081 / absent -> absent`         |
| `ru-083-write-route-setup`                | p1/0    | `route(preference-a-write-exit,route-setup)`                          | A false durable/entry visible -> exact bounded `requestfailed` listener installed before route, then tuple -> delayed PATCH installed                                                                                                                                                                                 | `ru-082 / absent -> installed`                                            |
| `ru-084-first-a-toggle`                   | p1/0    | `click(S.metadata)`                                                   | A visible false -> UI/write -> true PATCH captured                                                                                                                                                                                                                                                                    | `ru-083 / installed -> installed`                                         |
| `ru-085-write-route-hit`                  | p1/0    | `route(preference-a-write-exit,route-hit-read)`                       | first write -> exact PATCH/body/content-type/user-header/CSRF-presence validated and captured -> `{"hits":1,"captured":true,"backingSettled":true,"method":"PATCH","bodyMatches":true,"contentTypeJson":true,"expectedUserIdMatches":true,"csrfPresent":true}`/pending                                                | `ru-084 / installed -> hit`                                               |
| `ru-086-second-a-toggle`                  | p1/0    | `click(S.metadata)`                                                   | first true write pending -> UI/generation -> second false intent queued                                                                                                                                                                                                                                               | `ru-085 / hit -> hit`                                                     |
| `ru-087-second-intent`                    | p1/0    | `assert(second-a-intent-visible-before-exit)`                         | second toggle settled -> visible/queue/pending -> false intent visible                                                                                                                                                                                                                                                | `ru-086 / hit -> hit`                                                     |
| `ru-088-hit-before-release`               | p1/0    | `assert(preference-a-write-hit-before-release)`                       | first pending/second queued -> route counter -> exact 1                                                                                                                                                                                                                                                               | `ru-085,ru-087 / hit -> hit`                                              |
| `ru-089-a-exit-menu`                      | p1/0    | `click(S.userMenu(users.a.displayName))`                              | A dirty preference realm -> menu -> menu open                                                                                                                                                                                                                                                                         | `ru-088 / hit -> hit`                                                     |
| `ru-090-a-exit-signout`                   | p1/0    | `click(S.signOut)`                                                    | menu open/first Request object captured -> real logout click/navigation initiated -> old A realm leaving                                                                                                                                                                                                              | `ru-089 / hit -> hit`                                                     |
| `ru-090a-a-exit-signout-settled`          | p1/0    | `observe(signout-settled-user-a-with-abort)`                          | logout initiated -> exact same captured Request emits `net::ERR_ABORTED` + exact canonical `paths.login` URL + positive-geometry exact login form -> old-client abort and login realm settled                                                                                                                         | `ru-090 / hit -> hit`                                                     |
| `ru-091-b2-email`                         | p1/0    | `fill(S.loginEmail,$WF540_USER_B_EMAIL)`                              | settled login form -> discarded -> B email filled                                                                                                                                                                                                                                                                     | `ru-090a-a-exit-signout-settled / hit -> hit`                             |
| `ru-092-b2-password`                      | p1/0    | `fill(S.loginPassword,$ADMIN_PASSWORD)`                               | B email filled -> discarded -> password filled                                                                                                                                                                                                                                                                        | `ru-091 / hit -> hit`                                                     |
| `ru-093-b2-submit`                        | p1/0    | `click(S.loginSubmit)`                                                | credentials filled -> auth navigation -> B authenticated                                                                                                                                                                                                                                                              | `ru-092 / hit -> hit`                                                     |
| `ru-093a-b2-identity-settled`             | p1/0    | `observe(auth-identity-settled-users-b)`                              | submit navigation started -> post-login Admin URL + exact B trigger -> B realm settled                                                                                                                                                                                                                                | `ru-093 / hit -> hit`                                                     |
| `ru-094-b2-entry`                         | p1/0    | `goto(paths.entry)`                                                   | B identity settled -> URL/document -> B entry visible                                                                                                                                                                                                                                                                 | `ru-093a-b2-identity-settled / hit -> hit`                                |
| `ru-095-b-before-release`                 | p1/0    | `assert(user-b-default-before-release)`                               | B entry/read settled -> strict authenticated `{key,value:false}` + false badge geometry -> exact B default false                                                                                                                                                                                                      | `ru-094 / hit -> hit`                                                     |
| `ru-096-write-release`                    | p1/0    | `route(preference-a-write-exit,route-release)`                        | A backing response settled/B active/exact captured Request abort proven -> abort-aware terminal receipt -> no response delivered into B realm                                                                                                                                                                         | `ru-085,ru-090a-a-exit-signout-settled,ru-095 / hit -> released`          |
| `ru-097-hit-after-release`                | p1/0    | `assert(preference-a-write-hit-after-release)`                        | release settled -> route counter -> exact 1                                                                                                                                                                                                                                                                           | `ru-096 / released -> released`                                           |
| `ru-098-queued-zero`                      | p1/0    | `assert(queued-a-write-zero-dispatch)`                                | old realm destroyed -> derived dispatch count -> exact 0                                                                                                                                                                                                                                                              | `ru-097 / released -> released`                                           |
| `ru-099-b-unchanged`                      | p1/0    | `assert(user-b-default-unchanged)`                                    | strict B `{key,value}` reads before/after release + false badge geometry -> exact false/false -> B unchanged                                                                                                                                                                                                          | `ru-095,ru-096 / released -> released`                                    |
| `ru-100-write-unroute`                    | p1/0    | `route(preference-a-write-exit,unroute)`                              | hit/queue/B proven -> `true` -> delayed PATCH absent and exact bounded `requestfailed` listener removed                                                                                                                                                                                                               | `ru-097,ru-098,ru-099 / released -> absent`                               |
| `ru-100a-auth-rate-window-barrier`        | p1/0    | `authRateWindowBarrier()`                                             | routes absent/B active/bounded rate epoch -> configured auth window naturally expires when enabled or timer is skipped when disabled + bounded realm-stability proof -> exact `{"barrierSatisfied":true}`; `ru-099`/`ru-101` compose the exact B proof                                                                | `ru-100 / absent -> absent`                                               |
| `ru-101-b2-menu`                          | p1/0    | `click(S.userMenu(users.b.displayName))`                              | auth budget barrier/B entry -> menu -> menu open                                                                                                                                                                                                                                                                      | `ru-100a-auth-rate-window-barrier / absent -> absent`                     |
| `ru-102-b2-signout`                       | p1/0    | `click(S.signOut)`                                                    | menu open -> real logout click/navigation initiated -> B realm leaving                                                                                                                                                                                                                                                | `ru-101 / absent -> absent`                                               |
| `ru-102a-b2-signout-settled`              | p1/0    | `observe(signout-settled-user-b)`                                     | logout initiated -> exact canonical `paths.login` URL + positive-geometry exact login form -> login realm settled                                                                                                                                                                                                     | `ru-102 / absent -> absent`                                               |
| `ru-103-a3-email`                         | p1/0    | `fill(S.loginEmail,$WF540_USER_A_EMAIL)`                              | settled login form -> discarded -> A email filled                                                                                                                                                                                                                                                                     | `ru-102a-b2-signout-settled / absent -> absent`                           |
| `ru-104-a3-password`                      | p1/0    | `fill(S.loginPassword,$ADMIN_PASSWORD)`                               | A email filled -> discarded -> password filled                                                                                                                                                                                                                                                                        | `ru-103 / absent -> absent`                                               |
| `ru-105-a3-submit`                        | p1/0    | `click(S.loginSubmit)`                                                | credentials filled -> auth navigation -> A authenticated                                                                                                                                                                                                                                                              | `ru-104 / absent -> absent`                                               |
| `ru-105a-a3-identity-settled`             | p1/0    | `observe(auth-identity-settled-users-a)`                              | submit navigation started -> post-login Admin URL + exact A trigger + preference-GET counter baseline -> brand-new A realm settled                                                                                                                                                                                    | `ru-105 / absent -> absent`                                               |
| `ru-106-a3-entry`                         | p1/0    | `goto(paths.entry)`                                                   | brand-new A realm -> URL/document + fresh preference GET starts -> A entry mounting                                                                                                                                                                                                                                   | `ru-105a-a3-identity-settled / absent -> absent`                          |
| `ru-106a-a3-fresh-read-settled`           | p1/0    | `observe(post-redirect-a-fresh-read-settled)`                         | entry mounting -> exact one new GET method/path/success + strict `{key:"customScreens.entry.preferences",value:{version:1,showFieldMetadata:true}}` + `activeUserMenuVisible:true` from positive-geometry exact A menu + checked Switch/true badge geometry -> fresh durable true rendered in new A realm             | `ru-105a-a3-identity-settled,ru-106 / absent -> absent`                   |
| `ru-107-fresh-a-toggle`                   | p1/0    | `click(S.metadata)`                                                   | fresh A true durable/route absent -> UI + real PATCH -> fresh false write                                                                                                                                                                                                                                             | `ru-106a-a3-fresh-read-settled / absent -> absent`                        |
| `ru-108-convergence`                      | p1/0    | `assert(final-a-retry-converges)`                                     | fresh PATCH settled -> UI + authenticated durable read -> exact false convergence                                                                                                                                                                                                                                     | `ru-107 / absent -> absent`                                               |
| `ru-109-converged-shot`                   | p1/0    | `screen(responsive-user-a-converged)`                                 | convergence proven -> PNG -> final A screenshot created                                                                                                                                                                                                                                                               | `ru-108 / absent -> absent`                                               |
| `ru-110-log-agg-errors`                   | p1/0    | `logs(aggregate,console-errors)`                                      | flow complete -> all registered pages aggregate `[]` -> clean                                                                                                                                                                                                                                                         | `ru-109 / absent -> absent`                                               |
| `ru-111-log-pages-errors`                 | p1/0    | `logs(per-page,console-errors)`                                       | logger stable -> p1/p2 arrays `[]` -> clean                                                                                                                                                                                                                                                                           | `ru-110 / absent -> absent`                                               |
| `ru-112-log-agg-warnings`                 | p1/0    | `logs(aggregate,console-warnings)`                                    | flow complete -> all pages aggregate `[]` -> clean                                                                                                                                                                                                                                                                    | `ru-111 / absent -> absent`                                               |
| `ru-113-log-pages-warnings`               | p1/0    | `logs(per-page,console-warnings)`                                     | logger stable -> p1/p2 arrays `[]` -> clean                                                                                                                                                                                                                                                                           | `ru-112 / absent -> absent`                                               |
| `ru-114-log-agg-page-errors`              | p1/0    | `logs(aggregate,page-errors)`                                         | flow complete -> all pages aggregate `[]` -> clean                                                                                                                                                                                                                                                                    | `ru-113 / absent -> absent`                                               |
| `ru-115-log-pages-page-errors`            | p1/0    | `logs(per-page,page-errors)`                                          | logger stable -> p1/p2 arrays `[]` -> flow 7 clean                                                                                                                                                                                                                                                                    | `ru-114 / absent -> absent`                                               |

#### Terminal browser and runtime cleanup expansion

The manifest ends with the exact seven browser cleanup operations already defined by
this leaf; these are seven distinct CLI invocations and no browser invocation follows
`cleanup-session-absence`:

| ID                         | Page   | Kind / exact builder       | Precondition -> captured output -> postcondition                                                                                                                                                                                  | Dependencies / route transition   |
| -------------------------- | ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `end-001-release-unroute`  | p1/0   | `cleanup-release-unroute`  | all flow routes terminal -> `true` only after every latch is released, `await page.unrouteAll({behavior:"wait"})` settles, and the authoritative context active-route registry is exact `[]` -> raw `page.route()` registry empty | `ru-115 / all terminal -> absent` |
| `end-002-route-list`       | p1/0   | `cleanup-route-list`       | authoritative context registry empty -> `[]` -> CLI-wrapper route registry independently empty                                                                                                                                    | `end-001 / absent -> absent`      |
| `end-003-console-errors`   | p1/0   | `cleanup-console-errors`   | route list empty -> exact aggregate/pages -> all error arrays empty                                                                                                                                                               | `end-002 / absent -> absent`      |
| `end-004-console-warnings` | p1/0   | `cleanup-console-warnings` | errors clean -> exact aggregate/pages -> all warning arrays empty                                                                                                                                                                 | `end-003 / absent -> absent`      |
| `end-005-page-errors`      | p1/0   | `cleanup-page-errors`      | warnings clean -> exact aggregate/pages -> all page-error arrays empty                                                                                                                                                            | `end-004 / absent -> absent`      |
| `end-006-close`            | p1/0   | `cleanup-close`            | logs clean -> `closed` -> named session closed                                                                                                                                                                                    | `end-005 / absent -> absent`      |
| `end-007-session-absence`  | global | `cleanup-session-absence`  | close receipt -> global list bytes -> `wf540smoke` absent/terminal                                                                                                                                                                | `end-006 / absent -> absent`      |

Native CLI `route-list` does not enumerate handlers installed through raw
`page.route()`. Therefore `end-001` is the sole authoritative absence proof for those
handlers: its registered builder releases every named latch, awaits
`page.unrouteAll({behavior:"wait"})`, reads the context-owned active-route registry,
and returns `true` only when that registry is exact `[]`. `end-002` proves only that
the separate CLI-wrapper registry is empty; its `[]` can never replace or weaken
`end-001`.

`executeSmokePlanCore` owns one private `ResourceLedgerBuilder`: an append-only log of
immutable acquisition cores plus an append-only log of immutable dependency edges.
Neither log permits update, replacement, removal, ordinal reuse, or in-place
`dependsOn` mutation. `compileResourceRecords(stage)` derives the reject-unknown
records below from those two logs. It freezes the persistent projection before the
first phase-3 delete. Only after the same deep-frozen `RunState` records both API
contexts closed, an independent capability proof confirms their absence, and terminal
exact-User-Agent discovery is stable does it deep-freeze the final acquired-resource
ledger and construct one explicit final cleanup plan. That plan owns the final cross-
stage dependency graph while retaining the already-frozen persistent and terminal
action plans by object identity. No abbreviated fixture object or receipt may stand in
for a compiled record:

The sole 496-row ordinal loop is the only writer for successful action-bound
acquisitions. Immediately after strict result, receipt, and independent provenance
validation, and before that action may transition state or become completed, the
executor takes exactly one private action-bound acquisition delta. The delta is a strict
reject-unknown `{cores,dependencyEdges}` object and may be empty; its source action ID,
ordinal, descriptor, result projection, and provenance operation must agree
bidirectionally with every core and edge it proposes. The executor appends the validated
delta to this same `ResourceLedgerBuilder` and then proves exact equality between the
eligible descriptor/result/provenance set and the ledger's action projection. A create
that proves a resource but returns an empty delta, a non-acquiring action that returns a
core/edge, a ledger record without an eligible result, or an eligible acquisition not
present in the ledger fails before completion. Bounded response-lost discovery during
cleanup does not create a second ledger. It returns one immutable result for every
pending attempt: a validated safe delta (possibly empty), a nullable per-key failure,
and exact already-acquired intended-parent keys to block. One attempt never throws a
batch-global error. The scheduler appends every safe
`acquisitionChannel:"failure-discovery"` delta through this same builder and the same
core/edge validators, records every returned failure in the same private aggregate
cleanup error, and propagates each blocker through known dependency ancestors without
creating a core, edge, identifier, or delete authority for an ambiguous candidate.
Failed adapters can retain only frozen pending-attempt data and a private failure
observation; they cannot query, register, or append. Cleanup phase 3 is the only
response-lost query/validation path and the only failure-discovery writer, and it
compiles the persistent cleanup plan once after processing the complete result batch so
independent branches still execute.

```ts
type AcquiredResourceRecord = Readonly<{
  schemaVersion: 1;
  resourceKey: string;
  class: "delete" | "restore" | "runtime" | "retained";
  kind:
    | "presentation-override"
    | "seo-document-entry"
    | "setting-user-a"
    | "setting-user-b"
    | "screen-main"
    | "screen-retry"
    | "entry-editable"
    | "entry-related"
    | "media-row-key"
    | "content-type"
    | "audit-log-task-ua"
    | "access-log-task-ua"
    | "session-task"
    | "user-a"
    | "user-b"
    | "bootstrap-user-login-state"
    | "site-content-routes-baseline"
    | "storage-baseline"
    | "missing-media-baseline"
    | "screenshot"
    | "browser-session"
    | "route-registry"
    | "api-context-bootstrap"
    | "api-context-user-a"
    | "browser-private-root"
    | "host-process-group";
  identifierType:
    | "db-id"
    | "db-composite"
    | "seo-document-target"
    | "media-id-and-storage-key"
    | "setting-row"
    | "filesystem-path"
    | "browser-session-name"
    | "api-context-name"
    | "process-group-id"
    | "proof-key";
  identifier: readonly string[];
  ownerSubjectIdentifier: string | null;
  acquisitionSourceId: string;
  acquisitionOrdinal: number;
  sourceActionOrdinal: number | null;
  acquisitionChannel:
    | "admin-api"
    | "service"
    | "terminal-db-delta"
    | "filesystem"
    | "browser"
    | "process"
    | "preflight"
    | "failure-discovery"
    | "cleanup-discovery";
  dependsOn: readonly string[];
  provenanceAdapterId:
    | "admin-api-exact"
    | "db-exact"
    | "db-terminal-delta"
    | "user-setting-service"
    | "user-provisioning-service"
    | "media-api-composite"
    | "postgres-bootstrap-cas"
    | "filesystem-identity"
    | "playwright-session"
    | "playwright-route-registry"
    | "api-request-context"
    | "owned-process-group"
    | "proof-only";
  cleanupAdapterId:
    | "admin-api-exact"
    | "db-exact"
    | "media-api-composite"
    | "postgres-bootstrap-cas"
    | "filesystem-identity"
    | "playwright-session"
    | "playwright-route-registry"
    | "api-request-context"
    | "owned-process-group"
    | null;
  absenceAdapterId:
    | "admin-api-exact"
    | "db-exact"
    | "media-api-composite"
    | "filesystem-identity"
    | "playwright-session"
    | "playwright-route-registry"
    | "api-request-context"
    | "owned-process-group"
    | "proof-only"
    | null;
  cleanupPhase: Readonly<{
    success: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    failure: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  }>;
  cleanupPolicy:
    | "delete-and-prove-absent"
    | "restore-and-prove-byte-identical"
    | "dispose-and-prove-closed"
    | "release-and-prove-empty"
    | "retain-and-validate"
    | "retain-on-success-remove-on-failure"
    | "observe-only";
  deleteAuthority: boolean;
  restoreAuthority: boolean;
  provenanceOpId: string | null;
  cleanupOpId: string | null;
  absenceOpId: string | null;
  provenanceSchemaId: string | null;
  cleanupSchemaId: string | null;
  absenceSchemaId: string | null;
}>;
```

`resourceKey` is unique and immutable. `identifier` has the exact tuple arity selected
by `identifierType`. `acquisitionOrdinal` is solely the positive dense insertion
ordinal of the acquisition-core log: it is assigned as `cores.length + 1`, is never a
manifest/source ordinal, and is never copied from a failed request. If
`acquisitionSourceId` names a manifest action, `sourceActionOrdinal` is that exact
bounded positive manifest ordinal; otherwise it is `null` and the source ID is exactly
`preflight-baseline`, `failure-resource-discovery`, or
`terminal-task-ua-discovery`, except that bounded Entry SEO discovery uses exactly
`cleanup-seo-entry-discovery`. Response-lost discovery for a known create preserves
that create's action ID and manifest ordinal in those two source fields while selecting
`acquisitionChannel:"failure-discovery"`; the discovery query is represented only by
the provenance adapter/operation IDs. This removes every source-ordinal overload from
`acquisitionOrdinal`.

The following table is the exhaustive serialized form of
`RESOURCE_KIND_CONTRACTS`. `P/C/A` mean provenance/cleanup/absence. `R` means both the
operation ID and its paired schema ID are required non-null; `-` means both are
required `null`. `S/F` is the success/failure cleanup phase. Each acquisition cell is
the only allowed `acquisitionChannel -> provenanceAdapterId` pair. The validator
asserts exact key equality between this table and the `kind` union and rejects every
unlisted class, identifier arity, channel/adapter pair, cleanup/absence adapter,
phase, policy, authority, or ID/schema-nullability combination:

| Kind                           | Class; identifier type/arity         | Allowed acquisition -> P adapter                                            | C adapter / A adapter                                 |   S/F | Policy                              | delete/restore | P/C/A |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------- | ----: | ----------------------------------- | -------------- | ----- |
| `presentation-override`        | delete; `db-composite`/4             | admin-api -> admin-api-exact; failure-discovery -> db-exact                 | db-exact / db-exact                                   |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `seo-document-entry`           | delete; `seo-document-target`/3      | cleanup-discovery -> db-exact                                               | db-exact / db-exact                                   |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `setting-user-a`               | delete; `setting-row`/2              | service -> user-setting-service; failure-discovery -> db-exact              | db-exact / db-exact                                   |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `setting-user-b`               | delete; `setting-row`/2              | service -> user-setting-service; failure-discovery -> db-exact              | db-exact / db-exact                                   |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `screen-main`                  | delete; `db-id`/1                    | admin-api -> admin-api-exact; failure-discovery -> db-exact                 | admin-api-exact / admin-api-exact                     |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `screen-retry`                 | delete; `db-id`/1                    | admin-api -> admin-api-exact; failure-discovery -> db-exact                 | admin-api-exact / admin-api-exact                     |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `entry-editable`               | delete; `db-id`/1                    | admin-api -> admin-api-exact; failure-discovery -> db-exact                 | admin-api-exact / admin-api-exact                     |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `entry-related`                | delete; `db-id`/1                    | admin-api -> admin-api-exact; failure-discovery -> db-exact                 | admin-api-exact / admin-api-exact                     |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `media-row-key`                | delete; `media-id-and-storage-key`/2 | admin-api -> media-api-composite; failure-discovery -> media-api-composite  | media-api-composite / media-api-composite             |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `content-type`                 | delete; `db-id`/1                    | admin-api -> admin-api-exact; failure-discovery -> db-exact                 | admin-api-exact / admin-api-exact                     |   3/3 | delete-and-prove-absent             | true/false     | R/R/R |
| `audit-log-task-ua`            | delete; `db-id`/1                    | terminal-db-delta -> db-terminal-delta                                      | db-exact / db-exact                                   |   6/6 | delete-and-prove-absent             | true/false     | R/R/R |
| `access-log-task-ua`           | delete; `db-id`/1                    | terminal-db-delta -> db-terminal-delta                                      | db-exact / db-exact                                   |   6/6 | delete-and-prove-absent             | true/false     | R/R/R |
| `session-task`                 | delete; `db-id`/1                    | terminal-db-delta -> db-terminal-delta                                      | db-exact / db-exact                                   |   6/6 | delete-and-prove-absent             | true/false     | R/R/R |
| `user-a`                       | delete; `db-id`/1                    | service -> user-provisioning-service; failure-discovery -> db-exact         | db-exact / db-exact                                   |   7/7 | delete-and-prove-absent             | true/false     | R/R/R |
| `user-b`                       | delete; `db-id`/1                    | service -> user-provisioning-service; failure-discovery -> db-exact         | db-exact / db-exact                                   |   7/7 | delete-and-prove-absent             | true/false     | R/R/R |
| `bootstrap-user-login-state`   | restore; `db-id`/1                   | preflight -> db-exact                                                       | postgres-bootstrap-cas / db-exact                     |   8/8 | restore-and-prove-byte-identical    | false/true     | R/R/R |
| `site-content-routes-baseline` | retained; `proof-key`/1              | preflight -> db-exact                                                       | null / db-exact                                       |   9/9 | observe-only                        | false/false    | R/-/R |
| `storage-baseline`             | retained; `proof-key`/1              | preflight -> filesystem-identity                                            | null / filesystem-identity                            |   9/9 | observe-only                        | false/false    | R/-/R |
| `missing-media-baseline`       | retained; `proof-key`/1              | preflight -> filesystem-identity                                            | null / filesystem-identity                            |   9/9 | observe-only                        | false/false    | R/-/R |
| `screenshot`                   | retained; `filesystem-path`/1        | filesystem -> filesystem-identity; failure-discovery -> filesystem-identity | filesystem-identity / filesystem-identity             |   9/2 | retain-on-success-remove-on-failure | true/false     | R/R/R |
| `browser-session`              | runtime; `browser-session-name`/1    | browser -> playwright-session                                               | playwright-session / playwright-session               |   1/1 | dispose-and-prove-closed            | false/false    | R/R/R |
| `route-registry`               | runtime; `proof-key`/1               | browser -> playwright-route-registry                                        | playwright-route-registry / playwright-route-registry |   1/1 | release-and-prove-empty             | false/false    | R/R/R |
| `api-context-bootstrap`        | runtime; `api-context-name`/1        | service -> api-request-context                                              | api-request-context / api-request-context             |   4/4 | dispose-and-prove-closed            | false/false    | R/R/R |
| `api-context-user-a`           | runtime; `api-context-name`/1        | service -> api-request-context                                              | api-request-context / api-request-context             |   4/4 | dispose-and-prove-closed            | false/false    | R/R/R |
| `browser-private-root`         | runtime; `filesystem-path`/1         | filesystem -> filesystem-identity                                           | filesystem-identity / filesystem-identity             |   1/1 | dispose-and-prove-closed            | false/false    | R/R/R |
| `host-process-group`           | runtime; `process-group-id`/1        | process -> owned-process-group                                              | owned-process-group / owned-process-group             | 10/10 | dispose-and-prove-closed            | false/false    | R/R/R |

Every non-null operation ID and schema ID is derived deterministically from
`resourceKey`, validated as a bounded safe identifier, paired (`op === null` iff
`schema === null`), and unique within its field. A `class:"delete"` record alone joins
one of the two staged cleanup-subject sets below. The screenshot's path-scoped
`deleteAuthority:true` is conditional failure removal and never joins those sets.
Only `bootstrap-user-login-state` has `restoreAuthority:true`. The three observe-only
records have no cleanup operation; all other nulls are forbidden. The proof-only
`site-content-routes-baseline` additionally runs its already specified byte-identity
gate immediately before every phase-3 content-type delete; phase 9 is its terminal
validation phase. Canonical evidence receives only strict redacted projections; full
identifiers, rows, paths, adapters, and ownership remain private.

Bridge participation is not inferred from adapter names. This exhaustive companion to
`RESOURCE_KIND_CONTRACTS` physically assigns every allowed provenance channel and every
cleanup/absence slot. `node-local` creates no bridge descriptor;
`bound-runtime-bridge` consumes the named already executed 14-ID runtime receipt and
creates no duplicate child; `node+bound-runtime-bridge` adds a Node-local filesystem
sub-proof to that same bound receipt; `bun-one-shot` creates one descriptor with the
exact shown profile; and `node+bun-one-shot` is one logical composite whose HTTP/
filesystem part stays Node-local and whose exact DB sub-proof is one descriptor with the
exact shown profile:

```ts
const RESOURCE_BUN_BRIDGE_PARTICIPATION = deepFreezeExact({
  "presentation-override": {
    provenance: {
      "admin-api": { mode: "node-local" },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "seo-document-entry": {
    provenance: {
      "cleanup-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "setting-user-a": {
    provenance: {
      service: {
        mode: "bound-runtime-bridge",
        operationId: "runtime/set-041-preference-a",
      },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "setting-user-b": {
    provenance: {
      service: {
        mode: "bound-runtime-bridge",
        operationId: "runtime/set-043-preference-b",
      },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "screen-main": {
    provenance: {
      "admin-api": { mode: "node-local" },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "screen-retry": {
    provenance: {
      "admin-api": { mode: "node-local" },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "entry-editable": {
    provenance: {
      "admin-api": { mode: "node-local" },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "entry-related": {
    provenance: {
      "admin-api": { mode: "node-local" },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "media-row-key": {
    provenance: {
      "admin-api": { mode: "node+bun-one-shot", envProfileId: "database" },
      "failure-discovery": { mode: "node+bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "node+bun-one-shot", envProfileId: "database" },
    absence: { mode: "node+bun-one-shot", envProfileId: "database" },
  },
  "content-type": {
    provenance: {
      "admin-api": { mode: "node-local" },
      "failure-discovery": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "audit-log-task-ua": {
    provenance: {
      "terminal-db-delta": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "access-log-task-ua": {
    provenance: {
      "terminal-db-delta": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "session-task": {
    provenance: {
      "terminal-db-delta": { mode: "bun-one-shot", envProfileId: "database" },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "user-a": {
    provenance: {
      service: {
        mode: "bound-runtime-bridge",
        operationId: "runtime/set-012-user-a-create",
      },
      "failure-discovery": {
        mode: "bun-one-shot",
        envProfileId: "user-identity-proof",
      },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "user-b": {
    provenance: {
      service: {
        mode: "bound-runtime-bridge",
        operationId: "runtime/set-014-user-b-create",
      },
      "failure-discovery": {
        mode: "bun-one-shot",
        envProfileId: "user-identity-proof",
      },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "bootstrap-user-login-state": {
    provenance: {
      preflight: {
        mode: "bound-runtime-bridge",
        operationId: "runtime/set-001-storage-preflight",
      },
    },
    cleanup: { mode: "bun-one-shot", envProfileId: "database" },
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "site-content-routes-baseline": {
    provenance: {
      preflight: {
        mode: "bound-runtime-bridge",
        operationId: "runtime/set-001-storage-preflight",
      },
    },
    cleanup: null,
    absence: { mode: "bun-one-shot", envProfileId: "database" },
  },
  "storage-baseline": {
    provenance: {
      preflight: {
        mode: "node+bound-runtime-bridge",
        operationId: "runtime/set-001-storage-preflight",
      },
    },
    cleanup: null,
    absence: { mode: "node+bun-one-shot", envProfileId: "bootstrap-preflight" },
  },
  "missing-media-baseline": {
    provenance: {
      preflight: {
        mode: "node+bound-runtime-bridge",
        operationId: "runtime/set-001-storage-preflight",
      },
    },
    cleanup: null,
    absence: { mode: "node+bun-one-shot", envProfileId: "database" },
  },
  screenshot: {
    provenance: {
      filesystem: { mode: "node-local" },
      "failure-discovery": { mode: "node-local" },
    },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "browser-session": {
    provenance: { browser: { mode: "node-local" } },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "route-registry": {
    provenance: { browser: { mode: "node-local" } },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "api-context-bootstrap": {
    provenance: { service: { mode: "node-local" } },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "api-context-user-a": {
    provenance: { service: { mode: "node-local" } },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "browser-private-root": {
    provenance: { filesystem: { mode: "node-local" } },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
  "host-process-group": {
    provenance: { process: { mode: "node-local" } },
    cleanup: { mode: "node-local" },
    absence: { mode: "node-local" },
  },
});

assertSetEqual(
  Object.keys(RESOURCE_BUN_BRIDGE_PARTICIPATION),
  Object.keys(RESOURCE_KIND_CONTRACTS)
);
assertEveryResourceProvenanceChannelSetEqual();
assertEveryBoundRuntimeBridgeIdIn(
  Object.values(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).flat()
);
assertSetEqual(
  Object.keys(BUN_BRIDGE_RESOURCE_OPERATION_DESCRIPTORS),
  deriveIndependentResourceBunOperationIdsFromFrozenLedger(RESOURCE_BUN_BRIDGE_PARTICIPATION)
);
```

Candidate validation and every later frozen-ledger derivation add only a concrete non-null
P/C/A operation ID whose selected mode is `bun-one-shot` or `node+bun-one-shot`; a
bound-runtime or Node-local slot is excluded. A failed candidate remains only as one
immutable pending-attempt descriptor with its frozen baseline, intended parents, authored-
request digest, and private failure observation. Its adapter `finally` performs no query
and cannot clear/promote the slot or enter canonical evidence, the authoritative registry,
or the ledger. Phase 3 alone consumes the slot: exact response-lost discovery either
proves absence and clears it or appends the corresponding acquisition core; ambiguity
returns one strict per-key failure plus the exact already-acquired intended-parent keys,
retains that failure in the common private aggregate, and grants no delete authority.
Each attempt result is immutable and complete, and an unexpected query/validation error
is converted to that attempt's bounded failure instead of throwing across the result
batch. After every result has been visited, all valid deltas are appended, the union of
blocked parent keys is transitively propagated over the known graph, and the persistent
plan is compiled once. Known independent resources therefore continue through cleanup;
only the ambiguous resource's intended parents and their destructive ancestors are
blocked. No candidate-derived key or identifier enters the blocker set.
It rejects an unknown mode/profile, a null/missing operation where Bun is selected, a Bun
descriptor for a Node-local/bound slot, a bound ID outside the physical 14-ID runtime
set, or any missing/extra/duplicate descriptor. Every independently spawned resource
descriptor uses `database`, except the two user failure-discovery provenance descriptors,
which use the explicitly shown `user-identity-proof` profile. No resource cleanup or
absence descriptor receives `ADMIN_EMAIL`, `ADMIN_PASSWORD`, PII keys, pepper, or media/
provider secrets.

Each selected resource descriptor is bound before execution. Its source owns the exact
production service call or fixed parameterized SQL statement, table, columns, predicate,
affected-row rule, proof query, and output projection. Its strict stdin schema accepts
only the resource's already validated identifier tuple and the minimum expected-state
scalars for that operation; identifiers become positional/query parameters only. It
accepts no SQL, table/column/query name, method, URL, path, module/source ID, schema ID,
adapter ID, action ID, or arbitrary predicate. Thus a `db-id`, `db-composite`,
`setting-row`, or `media-id-and-storage-key` value can authorize only the exact operation
already fixed by its ledger entry and cannot broaden deletion/discovery. Cleanup and its
fresh absence proof remain separate exact descriptors, both validated against the same
parameter tuple; prefix deletes, table-wide mutation, string-built SQL, endpoint choice,
and fallback/cascade authority are forbidden.

`user-provisioning-service` is one exact composite provenance adapter, not an Admin
API alias. For `user-a` and `user-b` it alone performs the existing `createUser`
service call, hashes the private bootstrap password through the existing
`hashPassword`, updates `passwordHash` by the exact returned user UUID only, and then
performs an independent fresh exact-UUID user-row plus role-membership proof. Its
required provenance operation/schema pair validates the returned ID, canonical active
row projection, exact intended normalized email identity, password-hash write
completion without exporting the hash, and exactly one canonical Admin-role tuple.
The create result, ID-scoped hash update, and independent proof are all required before
the acquisition core is appended; a missing step, zero/multiple affected rows, wrong
role, or projection drift fails closed. The exhaustive adapter validator permits
`service -> user-provisioning-service` only for `user-a`/`user-b`, requires their
provenance operation/schema IDs non-null, and rejects `admin-api-exact`,
`user-setting-service`, direct-DB creation, or any other service/adapter pairing for a
successful acquisition. Response-lost discovery remains the separately listed
`failure-discovery -> db-exact` path. Cleanup and absence remain exact-ID `db-exact`
operations and never reuse the provisioning adapter.

The owner mapping is exhaustive and is correlation only: settings A/B own the
corresponding synthetic user UUID; sessions own their exact `user_id`; audit logs own
their exact `actor_id` or `null`; access logs own exact `session_id`, otherwise exact
`user_id`, otherwise `null`; presentation overrides own exact `updated_by` or `null`;
entries own exact `author_id` or `null`; media owns exact `created_by` or `null`; every
other record has `ownerSubjectIdentifier:null`. No owner value selects rows or broadens
delete authority. `dependsOn` has one mathematical direction everywhere: for exact
resource keys `P` and `C`, `P.dependsOn` contains `C` iff deleting destructive parent
`P` could cascade-delete, `SET NULL`, detach, or otherwise hide exact child `C` before
`C` has passed both cleanup and absence. Therefore `C` must succeed before `P` may be
deleted; failure of `C` blocks `P` and every transitive ancestor of `P`. It never means
that a child waits for its parent.

Dependency edges are appended when both exact keys/relations are known, then compiled
to sorted unique key arrays. Content types depend on their exact Screens and entries;
each Screen and entry depends on every exact override that names it; a media record
depends on an override whose value names that media; a task user depends on its exact
setting, authored entry, created media, updater-owned override, terminal session,
actor-owned audit log, and direct-user-owned access log; each task session depends on
each access log whose exact FK names it. An access log with a session FK is reached
transitively through that session instead of being duplicated as a user edge. Audit or
access rows with `null` ownership have no destructive parent edge. The bootstrap
restore record is not a destructive parent and receives no such edge. All other
records have `dependsOn:[]` unless one of those exact rules applies. Phase-3 compilation
requires every persistent edge endpoint in the persistent set; terminal compilation
adds only exact terminal endpoints after stable discovery and the final-plan compiler
then joins those terminal edges with the unchanged persistent graph. It requires every
final `dependsOn` key in the final ledger and makes that one final graph the only phase-6/
phase-7 dependency authority. Thus the phase-3 graph deliberately cannot authorize
synthetic-user deletion: only the final graph can bind a user to its later-discovered
session/audit/access children. A missing endpoint, self-edge, duplicate edge, cycle,
reverse-oriented edge, phase-local fallback, or edge inferred from a prefix/owner alone
rejects the plan before the affected phase.

Acquisition is registered only from a strict successful create response followed by
its separate provenance read, from bounded response-lost failure discovery, or from
the bounded stable exact-target cleanup discovery reserved for the six fixture Entry
SEO targets. For the successful
path, strict raw/result/receipt/provenance validation completes first; the action-bound
delta is then appended and cross-checked bidirectionally against the action descriptor
and result before captures, state transition, receipt storage, or completed-action
membership can authorize the next ordinal. Before the first write, the executor freezes
exact empty/baseline queries for every nonce natural key:
user email hash, content-type slug, entry `(type,slug)`, Screen nonce name plus content
type, media nonce original-name/byte identity, preference composite key, override
four-column key, and every screenshot path. If a create request throws, times out, or
returns unparsable bytes, its adapter `finally` retains only one strict immutable pending-
attempt descriptor containing that frozen baseline, the intended parent IDs, the authored-
request digest, and the private failure observation. It performs no query and cannot
register a row or append a resource/core/edge/descriptor. During cleanup, phase 3 is the
sole consumer and writer: it performs exactly one response-independent bounded query per
pending attempt, subtracts the frozen baseline, validates the complete candidate against
the intended parents and authored-request digest, and returns one strict immutable
attempt result. Exactly one candidate supplies that result's safe delta; zero candidates
supplies an empty delta and proves absence; more than one, any mismatch, or a bounded
query/validation error supplies an empty delta, one bounded per-key failure, and only the
already-acquired intended-parent blocker keys. No attempt throws across the batch.
After all attempt results exist, phase 3 calls
`appendValidatedFailureDiscoveryDelta` once for each safe result delta, adds each failure
to the common `PrivateAggregateCleanupError`, validates and freezes the blocker-key
union, and compiles the persistent plan exactly once. This catches a server-side create
that committed before its response failed while still cleaning every independent known
resource. Intent, a prefix match, an expected response ID, or an ambiguous candidate is
never delete authority. That same phase-3 authority also re-queries exact scoped
override/setting rows and the exact media discriminator plus storage identity. It also
performs two bounded, stable polls using the six exact fixture Entry IDs in one fixed
target list. Each result must contain at most six
`seo_documents(target_type="entry",target_id=<fixture-entry-id>)` rows, at most one per
exact target, with unique document IDs and stable target-ID/document-ID ordering. Zero
rows add no resource; one to six stable rows each add an individual
`seo-document-entry` with identifier `[seo-id,"entry",fixture-entry-id]` and a child
edge to that exact fixture Entry. A foreign target/type, duplicate target/document,
overflow, identity drift, incomplete fixture inventory, or unstable polls fail closed
and block all acquired fixture Entries plus their transitive parents.
The 13 fixed screenshot paths remain under the separate phase-2 filesystem-identity
discovery/removal contract and never enter this persistent-create query or writer.
For a known originating action, its ID and manifest ordinal remain solely in
`acquisitionSourceId`/`sourceActionOrdinal`; the newly appended acquisition core gets
the next dense `acquisitionOrdinal`. `acquisitionChannel:"failure-discovery"` and the
actual query adapter/operation IDs become the provenance authority.

Dynamic delete cleanup is expanded and frozen in two stages. The 15
`REQUIRED_FIXTURE_SUBJECT_KEYS` remain only the fixed entity-fixture provenance set;
they are neither cleanup inventory nor cleanup cardinality. After phase-3
response-lost discovery is complete and before its first delete,
`compileResourceRecords("persistent")` selects every acquired `class:"delete"` core
except `terminal-db-delta` records. It maps logical `media` to the single composite
`media-row-key`, includes the other 14 entity subjects plus the main override, zero to
six exact cleanup-discovered Entry SEO documents, and settings A/B, and freezes
`persistentCleanupSubjectKeys` and
`persistentCleanupSubjectCount`. `expandPersistentRuntimeCleanup()` adds one explicit
provenance/delete/absence manifest object per exact key—not a loop hidden inside a
command—and must pass both:

```ts
const CLEANUP_OPERATION_KINDS = deepFreezeExact(["provenance", "delete", "absence"]);
const persistentCleanupTuples = deepFreezeExact(
  expandedPersistentRuntimeCleanupActions.map(({ resourceKey, operationKind }) =>
    deepFreezeExact([resourceKey, operationKind])
  )
);
const expectedPersistentCleanupTuples = deepFreezeExact(
  cartesianCleanupTuples(persistentCleanupSubjectKeys, CLEANUP_OPERATION_KINDS)
);
assertNoDuplicateCleanupTuples(persistentCleanupTuples);
assertExactCleanupTupleSetEqual(persistentCleanupTuples, expectedPersistentCleanupTuples);
assertCardinality(expandedPersistentRuntimeCleanupActions, persistentCleanupSubjectCount * 3);
```

That persistent expansion and its phase-local graph are immutable after the gate. The
plan also freezes the exact failure-discovery blocker roots and their then-known
transitive destructive ancestors. Phase-3 resources may then be deleted in canonical
order while consulting those blockers; an ambiguous pending create cannot prevent an
independent branch from running. Synthetic-user actions are already expanded but remain
ineligible until phase 7 and must consult the later final compiled dependency graph,
never this pre-terminal graph.

Only after phase 4 has passed the same `RunState` through disposal, independently proved
both API request contexts closed, transitioned `apiContexts` to exact `closed`, and
deep-frozen the next `RunState`, and phase 5 has rechecked both that state and the
independent absence proof before reaching two identical bounded exact-User-Agent audit/
access/session sets, may the builder append one core and the exact dependency edges for
every terminal delta UUID. It then freezes `terminalCleanupSubjectKeys`, expands exactly
those terminal provenance/delete/absence objects, and runs a separate terminal gate
before the first phase-6 delete:

```ts
const terminalCleanupTuples = deepFreezeExact(
  expandedTerminalRuntimeCleanupActions.map(({ resourceKey, operationKind }) =>
    deepFreezeExact([resourceKey, operationKind])
  )
);
const expectedTerminalCleanupTuples = deepFreezeExact(
  cartesianCleanupTuples(terminalCleanupSubjectKeys, CLEANUP_OPERATION_KINDS)
);
assertNoDuplicateCleanupTuples(terminalCleanupTuples);
assertExactCleanupTupleSetEqual(terminalCleanupTuples, expectedTerminalCleanupTuples);
assertCardinality(expandedTerminalRuntimeCleanupActions, terminalCleanupSubjectCount * 3);
assertDisjoint(persistentCleanupSubjectKeys, terminalCleanupSubjectKeys);
```

At that point—and never earlier—the builder deep-freezes the final compiled resource
ledger and the exact union, then single-assignment-constructs one explicit
`finalCleanupPlan`. The final plan retains the persistent and terminal action-plan
objects unchanged by identity and owns the one final dependency graph containing all
persistent, terminal, and cross-stage edges plus the propagated failure-discovery
blockers:

```ts
const acquiredCleanupSubjectKeys = deepFreezeExact(
  sortedUnion(persistentCleanupSubjectKeys, terminalCleanupSubjectKeys)
);
const expandedRuntimeCleanupActions = deepFreezeExact([
  ...expandedPersistentRuntimeCleanupActions,
  ...expandedTerminalRuntimeCleanupActions,
]);
const acquiredCleanupTuples = deepFreezeExact(
  expandedRuntimeCleanupActions.map(({ resourceKey, operationKind }) =>
    deepFreezeExact([resourceKey, operationKind])
  )
);
const expectedAcquiredCleanupTuples = deepFreezeExact(
  cartesianCleanupTuples(acquiredCleanupSubjectKeys, CLEANUP_OPERATION_KINDS)
);
assertNoDuplicateCleanupTuples(acquiredCleanupTuples);
assertExactCleanupTupleSetEqual(acquiredCleanupTuples, expectedAcquiredCleanupTuples);
assertCardinality(expandedRuntimeCleanupActions, acquiredCleanupSubjectKeys.length * 3);
const finalCompiledLedger = deepFreezeFinalCompiledLedger();
const finalDependencyGraph = deepFreezeExact(
  compileFinalCrossStageDependencyGraph(finalCompiledLedger)
);
const finalFailureDiscoveryBlockedParentKeys = deepFreezeExact(
  compileBlockedParentClosure(finalDependencyGraph, failureDiscoveryBlockerRoots)
);
assert(finalCleanupPlan === null);
finalCleanupPlan = createDeepFrozenFinalCleanupPlan({
  ledger: finalCompiledLedger,
  dependencyGraph: finalDependencyGraph,
  persistentActionPlan: persistentCleanupPlan,
  terminalActionPlan: terminalCleanupPlan,
  failureDiscoveryBlockedParentKeys: finalFailureDiscoveryBlockedParentKeys,
});
assert(finalCleanupPlan.persistentActionPlan === persistentCleanupPlan);
assert(finalCleanupPlan.terminalActionPlan === terminalCleanupPlan);
assertFinalDependencyGraphExact(finalCleanupPlan, finalCompiledLedger);
```

`assertNoDuplicateCleanupTuples` serializes each strict two-string tuple with an
unambiguous length-prefixed encoding before uniqueness comparison;
`assertExactCleanupTupleSetEqual` compares only those unique tuple encodings. A set
comparison over repeated bare resource keys, even when paired with total cardinality,
is forbidden because it cannot prove exactly one operation of each kind per resource.

No core, dependency edge, cleanup subject, cleanup action, blocker, or final-plan field
may be appended after that terminal freeze. The final plan and graph are single-
assignment, recursively frozen, and passed by identity to phases 6 and 7; cloning,
recompilation, substitution, or falling back to either phase-local graph is forbidden.
A captured session is only an early cross-check; terminal stable delta against
`sessionStartBaselineIds` remains the exhaustive session authority. No fixed value such
as 15 or 18 can stand in for either staged or final cardinality.

On success, the ordinal loop has already completed `end-001` through `end-007` and the
same `RunState` is `browser-session-absent`. Cleanup phase 1 therefore executes zero
browser CLI commands and emits zero browser receipts; it only identity-safely removes
the already-acquired private browser root and proves it absent. On an early failure,
phase 1 derives from the validated state and exact completed-action set only the still-
missing release/unroute, native route-list, close, and global-list absence operations, executes each once
as private cleanup diagnostics, then removes the root and transitions to
`browser-session-absent`. It never replays a completed terminal operation and never
promotes failure cleanup into canonical action receipts.

Cleanup then processes every response-lost attempt without allowing one attempt to abort
the batch. It cleans the independent override/settings/Screens/entries/media/content-
type graph while the isolated bootstrap API context is still available, disposes both
isolated API request contexts, independently proves them closed, transitions the same
`RunState.apiContexts` to `closed`, and deep-freezes it before declaring task HTTP
traffic stopped. Phase 5 requires both that state and the exact independently captured
absence proof,
then bounded-polls exact-User-Agent audit/access/session sets, adds every terminal delta
record, and creates the final cleanup plan before deleting those exact rows. Thus a
session or log written immediately before a failing response cannot escape the ledger.
Early IDs are cross-checks only. Cleanup never issues another HTTP request after context
disposal or starts terminal polling before both contexts are closed by both proofs.

The phase scheduler is closed and identical on success/failure except where noted:

1. when the success loop already proved browser authority absent, issue no browser CLI or
   receipt and identity-remove only its private root; otherwise execute exactly the
   missing release/unroute, native route-list, close, and global-list absence operations once, remove the
   root, and transition browser authority absent;
2. on failure, discover and identity-safely remove acquired screenshots;
3. return every per-attempt response-lost safe delta, failure, and blocker without a
   batch-global throw; append safe deltas, aggregate failures, freeze blocker roots,
   compile/freeze/gate the exact persistent cleanup set once, then clean every eligible
   independent override, preference, Screen, entry, media, and content-type branch in
   the canonical sort below;
4. finish all cleanup HTTP; pass the same `RunState` through bootstrap and user-A API-
   context disposal/absence proof, transition `apiContexts` to `closed`, and deep-freeze;
5. require both that closed `RunState` and an independent absence proof; freeze two-
   consecutive-set terminal exact-UA audit/access/session deltas; append their
   cores/edges, compile/freeze/gate the exact terminal cleanup set, deep-freeze the final
   ledger and persistent+terminal union, and single-assignment-freeze the final cleanup
   plan plus final cross-stage graph;
6. delete/prove exact audit rows, access rows, and sessions using the unchanged terminal
   action plan plus the exact final graph by identity;
7. delete/prove synthetic users using the unchanged persistent action plan plus that
   same final graph and propagated blockers; a failed terminal session/audit/access child
   blocks its exact user and all transitive destructive parents;
8. seal the newest bootstrap pair, attempt the bootstrap CAS write exactly once, resolve
   an uncertain bridge outcome only through one read-only complete-row/role baseline
   proof with zero second write, then construct its separate runtime receipt;
9. prove `site.contentRoutes`, settings, storage/missing-media state, and either
   validate retained success screenshots or prove failure screenshot absence;
10. TERM/KILL and prove the owned process group, PIDs, and ports absent.

An error never skips phase 10. A phase continues independent resource branches but
never deletes `P` while any exact key in final `P.dependsOn` lacks successful cleanup
and absence, or while `P` is in the transitively propagated failure-discovery blocker
set; no cleanup action is silently retried through a broader adapter.

The canonical reverse-dependency sort is: the main override; zero to six exact
cleanup-discovered Entry SEO documents in their frozen stable discovery order; setting A/B; the main and
retry Screens; the editable entry and five related entries; the composite media-row-key;
the four content types; stable-polled task-UA audit logs; stable-polled task-UA access
logs; every acquired `session-task`; then users A/B. Each resource gets separate
`cleanup-provenance:<kind>:<id>`, `cleanup-delete:<kind>:<id>`, and
`cleanup-absence:<kind>:<id>` runtime actions. Stable polling itself is one bounded
read per poll and expansion records every poll; it stops only after two identical exact
after-baseline task-UA audit-log, access-log, and session UUID sets. No delete authority spans two cleanup
subjects, uses wildcards or a table-wide predicate, or reaches an unacquired row. The
composite media subject's real DELETE is still one media-ID operation; its captured
exact storage key is absence-proof input, never a second delete authority. The cleanup order sentence
above is canonical everywhere in this leaf; later sections may repeat it only
byte-identically or refer back to it. The proof-only bootstrap login-state restore is
not a delete resource and therefore is outside that sort and both staged `count * 3`
equalities;
it is attempted exactly once after terminal HTTP/context shutdown and task log/session
cleanup, before final DB/storage scans or host-runner shutdown. A cleanup or absence failure
marks that ledger key failed and blocks deletion of every transitive parent that lists
it in `dependsOn`, preventing FK cascade/`SET NULL` from hiding the child. Unrelated
branches, bootstrap restoration, failure screenshot cleanup, settings/storage proofs,
and process shutdown continue in canonical phase order; all primary, discovery,
cleanup, blocked-parent, and absence errors are retained together privately. Any one
error blocks canonical evidence.

Every non-empty authoritative Admin provenance, delete, and absence response is
validated within its bounded API boundary, SHA-256-hashed immediately, and discarded
before any recursive freeze. Only the lowercase 64-hex `observedBytesSha256` value may
enter frozen cleanup state and receipt evidence. The raw `Buffer` never crosses that
boundary; exact response ID and media key/URL checks plus fresh absence proofs remain
mandatory, and `deepFreezeExact` is not weakened or special-cased.

The remaining exact runtime suffix is: exact bootstrap `lastLoginAt`/`updatedAt`
restore plus complete-row/role byte-identity proof; proof-only
`site.contentRoutes` byte identity; two stable post-delete DB/storage scans for the
missing media UUID; success screenshot `lstat`/signature/hash/device/inode validation
for each of 13 paths (or identity-safe failure removal); repo-owned host-runner process-group TERM,
bounded conditional process-group KILL, one
absence receipt per inventoried PID, and one listener-absence receipt for each of
ports 3000/5173/5174. Runtime receipts are then sealed. The two exact stage gates and
the final disjoint-union gate above are the only dynamic cleanup-cardinality contract;
the obsolete single-set-before-first-delete formulation is forbidden.

#### Manifest equality, state machine, and executor pseudocode

The exact scenario/cardinality checks are part of workflow startup, not reviewer
guidance:

```ts
const REQUIRED_SCENARIOS = Object.freeze([
  "button-image",
  "tabs-content",
  "tabs-keyboard-aria",
  "space-selection",
  "dirty-guards",
  "related-retry-cache",
  "responsive-users",
]);
const REQUIRED_SMOKE_ASSERTIONS = deepFreezeExact({
  "button-image": [
    "persisted-no-empty-binding",
    "media-cache-cold-before-route",
    "prior-media-resolution-pending",
    "newer-media-winner-selected-pending",
    "stale-media-result-ignored",
    "direct-image-safe-url",
    "missing-or-unsafe-placeholder",
    "media-field-keeps-uuid",
    "safe-link-front-url",
    "unsafe-link-disabled",
  ],
  "tabs-content": [
    "three-tabs-persisted",
    "one-panel-visible",
    "other-panels-zero-geometry",
    "armed-slot-equals-active-tab",
  ],
  "tabs-keyboard-aria": [
    "arrow-home-end-focus",
    "aria-reciprocal",
    "nested-tabs-isolated",
    "renderer-ids-unique",
  ],
  "space-selection": [
    "space-text-preserved",
    "nested-controls-do-not-select",
    "selection-handle-independent",
  ],
  "dirty-guards": [
    "builder-cancel-byte-identical",
    "builder-confirm-navigates-once",
    "entry-cancel-byte-identical",
    "entry-cancel-url-stable",
    "entry-error-retains-both-drafts",
    "beforeunload-active",
    "successful-retry-clears-persisted-channel",
    "entry-confirm-navigates-once",
  ],
  "related-retry-cache": [
    "related-error-visible-before-retry",
    "visible-retry-succeeds",
    "same-target-visible-rows-retained",
    "target-switch-immediate-empty",
    "only-b-rows-visible",
    "unrelated-draft-byte-identical",
    "relation-diff-exact",
    "stale-a-cannot-commit",
    "flow6-exit-discarded-once",
  ],
  "responsive-users": [
    "narrow-padding-and-positive-geometry",
    "wide-padding-delta-300",
    "panel-inside-viewport",
    "same-user-authoritative-refresh",
    "same-user-retained-view-pending",
    "newer-local-write-pending",
    "newer-local-write-wins-refresh",
    "legacy-local-storage-absent",
    "light-and-dark-computed",
    "user-a-b-a-isolated",
    "second-a-intent-visible-before-exit",
    "preference-a-write-hit-before-release",
    "user-b-default-before-release",
    "preference-a-write-hit-after-release",
    "queued-a-write-zero-dispatch",
    "user-b-default-unchanged",
    "final-a-retry-converges",
  ],
});
const REQUIRED_FLOW_ACTION_COUNTS = Object.freeze({
  "button-image": 76,
  "tabs-content": 49,
  "tabs-keyboard-aria": 36,
  "space-selection": 35,
  "dirty-guards": 49,
  "related-retry-cache": 54,
  "responsive-users": 135,
});
const REQUIRED_SETUP_ACTION_COUNT = 55;
const REQUIRED_TERMINAL_BROWSER_ACTION_COUNT = 7;
const REQUIRED_FIXTURE_SUBJECT_KEYS = Object.freeze([
  "user-a",
  "user-b",
  "content-type-editable",
  "content-type-related-a",
  "content-type-related-b",
  "content-type-related-failure",
  "related-entry-a1",
  "related-entry-a2",
  "related-entry-b1",
  "related-entry-b2",
  "related-entry-failure1",
  "media",
  "editable-entry",
  "screen",
  "retry-screen",
]);
const REQUIRED_CAPTURE_NAMES = Object.freeze([
  "user-a.id",
  "user-b.id",
  "content-type-editable.id",
  "content-type-related-a.id",
  "content-type-related-b.id",
  "content-type-related-failure.id",
  "related-entry-a1.id",
  "related-entry-a2.id",
  "related-entry-b1.id",
  "related-entry-b2.id",
  "related-entry-failure1.id",
  "media.id",
  "media.resolved-url",
  "media.storage-key",
  "entry.id",
  "screen.id",
  "retry-screen.id",
]);
const REQUIRED_ISOLATED_API_ACTION_IDS = Object.freeze([
  "set-011b-bootstrap-api-login",
  "set-011c-bootstrap-csrf-capture",
  "ru-043b-a-api-login",
  "ru-043c-a-api-csrf-capture",
  "ru-047a-a-durable-proof",
  "ru-050-a-server-false",
  "ru-051-a-server-false-proof",
  "ru-061a-a-durable-bypass-read",
]);
const REQUIRED_SIGNOUT_SETTLEMENT_IDS = Object.freeze([
  "ru-040a-bootstrap-signout-settled",
  "ru-066a-a-signout-settled",
  "ru-076a-b-signout-settled",
  "ru-090a-a-exit-signout-settled",
  "ru-102a-b2-signout-settled",
]);
const REQUIRED_METADATA_STATE_VALUES = deepFreezeExact({
  "ru-047-a-write-settle": true,
  "ru-053-a-authoritative": false,
  "ru-053b-a-nondefault-write-settled": true,
  "ru-058-retained-pending": true,
  "ru-059a-new-local-browser-write-settled": false,
  "ru-062-new-local-wins": false,
  "ru-072-b-dark-capture": false,
  "ru-082-isolation-proof": false,
  "ru-087-second-intent": false,
  "ru-095-b-before-release": false,
  "ru-099-b-unchanged": false,
  "ru-106a-a3-fresh-read-settled": true,
  "ru-108-convergence": false,
});
const MAX_PREFERENCE_UNMOUNT_WINDOW_MS = 20_000;
const REQUIRED_AUTH_RATE_PLAN = deepFreezeExact({
  epochs: [
    { endsAtBarrierActionId: "bi-016a-auth-rate-window-barrier", maximum: 9 },
    { endsAtBarrierActionId: "bi-061a-auth-rate-window-barrier", maximum: 10 },
    { endsAtBarrierActionId: "tc-032a-auth-rate-window-barrier", maximum: 9 },
    { endsAtBarrierActionId: "rc-017b-auth-rate-window-barrier", maximum: 10 },
    { endsAtBarrierActionId: "ru-076b-auth-rate-window-barrier", maximum: 9 },
    { endsAtBarrierActionId: "ru-100a-auth-rate-window-barrier", maximum: 7 },
    { endsAtBarrierActionId: null, maximum: 6 },
  ],
  requiredEnabledMaxRequests: 10,
  requiredEnabledWindowSecondsMin: 1,
  requiredEnabledWindowSecondsMax: 60,
});
// The executable contract expands every `maximum` above to its exact
// `maximumRequestsByIdentity` object and mechanically recomputes it from the frozen
// per-action auth-cost ledger. An independent producer classifier covers every full
// navigation, auth operation, and conditionally cached CSRF writer, then requires exact
// set equality with that ledger. A missing/moved barrier, unclassified sensitive writer,
// changed producer signature, or missing producer cost therefore fails contract
// construction instead of relying on prose counts.
const REQUIRED_RUNTIME_BLOCK_CAPTURES = Object.freeze([
  "palette.button",
  "palette.image",
  "palette.media-field",
  "palette.outer-tabs",
  "palette.tab-one-text",
  "palette.tab-two-text",
  "palette.tab-three-text",
  "palette.inner-tabs",
  "palette.dirty-text",
]);

assertSetEqual(manifestScenarios(SMOKE_ACTION_MANIFEST), REQUIRED_SCENARIOS);
assertCardinality(SMOKE_ACTION_MANIFEST, 496);
assertEverySourceTupleHasExactlyFiveColumns();
assertEveryTransitionTupleHasExactlyThreeClauses();
assertCardinality(setupActions(), REQUIRED_SETUP_ACTION_COUNT);
for (const scenario of REQUIRED_SCENARIOS) {
  assertCardinality(actionsFor(scenario), REQUIRED_FLOW_ACTION_COUNTS[scenario]);
}
assertCardinality(flowActions(), 434);
assertCardinality(terminalBrowserActions(), REQUIRED_TERMINAL_BROWSER_ACTION_COUNT);
assertDeepEqual(
  setupActions().map(({ ordinal }) => ordinal),
  integerRange(1, 55)
);
assertDeepEqual(
  flowActions().map(({ ordinal }) => ordinal),
  integerRange(56, 489)
);
assertDeepEqual(
  terminalBrowserActions().map(({ ordinal }) => ordinal),
  integerRange(490, 496)
);
assertPairwiseDisjointActionIdSets([setupActions(), flowActions(), terminalBrowserActions()]);
assertSetEqual(
  [...setupActions(), ...flowActions(), ...terminalBrowserActions()].map(({ id }) => id),
  SMOKE_ACTION_MANIFEST.map(({ id }) => id)
);
assertDeepEqual(
  SMOKE_ACTION_MANIFEST.map(({ ordinal }) => ordinal),
  integerRange(1, 496)
);
assertUnique(SMOKE_ACTION_MANIFEST.map(({ id }) => id));
assertEveryRowHasExactKeys(ACTION_MANIFEST_SCHEMA);
assertEveryBrowserRowBuildsExactlyOneCliInvocation();
assertEveryApiRowIssuesExactlyOneAuthenticatedDomainRequest();
assertEveryStorageOrDbRowIsOneBoundedLocalOperation();
assertSetEqual(captureRefNames(), REQUIRED_CAPTURE_NAMES);
assertCardinality(captureRefNames(), 17);
assertSetEqual(acquiredFixtureSubjectKeys(), REQUIRED_FIXTURE_SUBJECT_KEYS);
assertSetEqual(provenanceFixtureSubjectKeys(), REQUIRED_FIXTURE_SUBJECT_KEYS);
assertSetEqual(entityCleanupFixtureSubjectKeys(), REQUIRED_FIXTURE_SUBJECT_KEYS);
assert(cleanupSubjectKeyForFixture("media") === "media-row-key");
assertEveryOtherFixtureCleanupSubjectKeyIsIdentityMapped();
assertCardinality(REQUIRED_FIXTURE_SUBJECT_KEYS, 15);
assertSetEqual(isolatedApiActionIds(), REQUIRED_ISOLATED_API_ACTION_IDS);
assertSetEqual(isolatedApiSessionOwners(), ["bootstrap", "user-a"]);
assertEveryIsolatedApiSessionHasExactlyOneLoginOneCsrfAndNoAutomaticRetry();
assertDeepEqual(computeAuthRatePlan(SMOKE_ACTION_MANIFEST), REQUIRED_AUTH_RATE_PLAN);
assertSetEqual(rateLimitBucketsCountedByPlan(), ["auth"]);
assertAuthenticatedAdminReadWriteCounterConsumptionIsZero();
assertRatePolicyCapacityOrDisabled(authRateProjection(), REQUIRED_AUTH_RATE_PLAN);
assertExactUniqueUserAgents(SMOKE_FIXTURE_BLUEPRINT.userAgents);
assertSetEqual(signoutSettlementActionIds(), REQUIRED_SIGNOUT_SETTLEMENT_IDS);
assertEverySignoutClickHasExactlyOneImmediateSettlementObserver();
assertDeepEqual(metadataStateValuesActuallyAsserted(), REQUIRED_METADATA_STATE_VALUES);
assert(MAX_PREFERENCE_UNMOUNT_WINDOW_MS < SCREEN_PREFERENCE_SETTLED_RETENTION_MS);
assert(SCREEN_PREFERENCE_SETTLED_RETENTION_MS === 30_000);
assertMonotonicWindow("ru-049-a-away", "ru-052-a-return", MAX_PREFERENCE_UNMOUNT_WINDOW_MS);
assertMonotonicWindow(
  "ru-054-a-away-again",
  "ru-056-a-remount-pending",
  MAX_PREFERENCE_UNMOUNT_WINDOW_MS
);
assertSetEqual(runtimeBlockCaptureNames(), REQUIRED_RUNTIME_BLOCK_CAPTURES);
assertSetEqual(paletteLabelsActuallyClicked(), ["Button", "Tabs", "Text", "Field", "Image"]);
assertSetEqual(routeKeysActuallyUsed(), Object.keys(SMOKE_FIXTURE_BLUEPRINT.routes));
assertEveryRouteSequenceMatchesItsDeclaredStateMachineExactlyOnce();
assertSetEqual(assertionNamesActuallyExecuted(), Object.values(REQUIRED_SMOKE_ASSERTIONS).flat());
assertUnique(assertionNamesActuallyExecuted());
assertCardinality(assertionNamesActuallyExecuted(), 55);
assertCardinality(scenarioLogReadActions(), 7 * 3 * 2);
assertSetEqual(screenshotPathsActuallyWritten(), SMOKE_FIXTURE_BLUEPRINT.screenshotPaths);
assertCardinality(screenshotPathsActuallyWritten(), 13);
assertDeepEqual(browserCleanupActionIds(), [
  "end-001-release-unroute",
  "end-002-route-list",
  "end-003-console-errors",
  "end-004-console-warnings",
  "end-005-page-errors",
  "end-006-close",
  "end-007-session-absence",
]);

const oneLoopSelfTestTrace = runHermeticOneLoopExecutorSelfTest();
assertCardinality(oneLoopSelfTestTrace.actionDispatches, 496);
assertCardinality(oneLoopSelfTestTrace.actionReceipts, 496);
assertDeepEqual(
  oneLoopSelfTestTrace.actionDispatches.map(({ ordinal }) => ordinal),
  integerRange(1, 496)
);
assertDeepEqual(
  oneLoopSelfTestTrace.actionReceipts.map(({ ordinal }) => ordinal),
  integerRange(1, 496)
);
assertSetEqual(
  oneLoopSelfTestTrace.actionReceipts.map(({ actionId }) => actionId),
  SMOKE_ACTION_MANIFEST.map(({ id }) => id)
);
assertEveryActionIdHasExactlyOneDispatchAndOneReceipt(oneLoopSelfTestTrace);
assertReceiptPartitionExact(oneLoopSelfTestTrace, {
  setup: setupActions().map(({ id }) => id),
  flow: flowActions().map(({ id }) => id),
  terminal: terminalBrowserActions().map(({ id }) => id),
});
```

#### Closed runtime registry and implementation order

The 76 action-specific runtime descriptors are exhaustively grouped below only to
audit their semantic adapter family. Array order is manifest ordinal order, and the
concatenated set must equal the complete `runtime-operation` action set. The count
beside each family is therefore derived, not advisory; these family names are not
`operationId` values and never reach executor dispatch.

```ts
const REQUIRED_RUNTIME_ACTIONS_BY_OPERATION = deepFreezeExact({
  storage: ["set-001-storage-preflight", "set-032-storage-post-setup"],
  host: ["set-002-helper-launch"],
  health: ["set-003-admin-health", "set-004-front-health"],
  apiPublicRead: ["set-004a-bot-protection-preflight"],
  settingsRead: ["set-004b-session-policy-preflight", "set-004c-auth-rate-budget-preflight"],
  isolatedApiSessionLogin: ["set-011b-bootstrap-api-login", "ru-043b-a-api-login"],
  isolatedApiSessionCsrfCapture: ["set-011c-bootstrap-csrf-capture", "ru-043c-a-api-csrf-capture"],
  fixture: [
    "set-012-user-a-create",
    "set-014-user-b-create",
    "set-041-preference-a",
    "set-043-preference-b",
  ],
  fixtureRead: [
    "set-013-user-a-proof",
    "set-015-user-b-proof",
    "set-042-preference-a-proof",
    "set-044-preference-b-proof",
  ],
  api: [
    "set-016-editable-type-create",
    "set-018-related-a-type-create",
    "set-020-related-b-type-create",
    "set-021a-related-failure-type-create",
    "set-022-related-a1-create",
    "set-024-related-a2-create",
    "set-026-related-b1-create",
    "set-028-related-b2-create",
    "set-029a-related-failure1-create",
    "set-030-media-upload",
    "set-033-entry-create",
    "set-035-screen-create",
    "set-037-retry-screen-create",
    "set-039-override-create",
    "bi-060-unsafe-patch",
    "bi-064-baseline-restore",
    "tc-001-reset",
    "ss-001-screen-reset",
    "ss-003-entry-reset",
    "ss-005-overrides-reset",
    "dg-001-entry-reset",
    "rc-001-entry-reset",
    "rc-003-overrides-reset",
    "ru-001-screen-reset",
    "ru-003-entry-reset",
    "ru-005-overrides-reset",
  ],
  apiRead: [
    "set-017-editable-type-proof",
    "set-019-related-a-type-proof",
    "set-021-related-b-type-proof",
    "set-021b-related-failure-type-proof",
    "set-023-related-a1-proof",
    "set-025-related-a2-proof",
    "set-027-related-b1-proof",
    "set-029-related-b2-proof",
    "set-029b-related-failure1-proof",
    "set-031-media-proof",
    "set-034-entry-proof",
    "set-036-screen-proof",
    "set-038-retry-screen-proof",
    "set-040-override-proof",
    "bi-061-unsafe-proof-read",
    "bi-065-baseline-proof",
    "tc-002-reset-proof",
    "ss-002-screen-proof",
    "ss-004-entry-proof",
    "ss-006-overrides-proof",
    "dg-002-entry-proof",
    "rc-002-entry-proof",
    "rc-004-overrides-proof",
    "ru-002-screen-proof",
    "ru-004-entry-proof",
    "ru-006-overrides-proof",
  ],
  isolatedApiSessionApiAs: ["ru-050-a-server-false"],
  isolatedApiSessionApiReadAs: [
    "ru-047a-a-durable-proof",
    "ru-051-a-server-false-proof",
    "ru-061a-a-durable-bypass-read",
  ],
});
assertDeepEqual(
  Object.fromEntries(
    Object.entries(REQUIRED_RUNTIME_ACTIONS_BY_OPERATION).map(([id, ids]) => [id, ids.length])
  ),
  {
    storage: 2,
    host: 1,
    health: 2,
    apiPublicRead: 1,
    settingsRead: 2,
    isolatedApiSessionLogin: 2,
    isolatedApiSessionCsrfCapture: 2,
    fixture: 4,
    fixtureRead: 4,
    api: 26,
    apiRead: 26,
    isolatedApiSessionApiAs: 1,
    isolatedApiSessionApiReadAs: 3,
  }
);
assertCardinality(Object.values(REQUIRED_RUNTIME_ACTIONS_BY_OPERATION).flat(), 76);
assertUnique(Object.values(REQUIRED_RUNTIME_ACTIONS_BY_OPERATION).flat());
assertSetEqual(
  Object.values(REQUIRED_RUNTIME_ACTIONS_BY_OPERATION).flat(),
  runtimeExecutableActionIds()
);
```

Implementation proceeds in dependency/manifest order through the 76 direct
`runtime/<action-id>` registry entries; it never switches on an action ID after
lookup. Each entry itself pins its endpoint/service operation, auth/context, schema,
result projection, ledger effects, and exact ref signature. Refs supply data only, so
all 76 actions above are covered without a hidden second-level branch:

```text
compile plan and validate the exact 76-ID table before creating a capability
run storage(set-001): verify setup/bootstrap/routes/local-storage preconditions and freeze baselines
run host(set-002): start and identity-bind the one repo-owned host-runner process group
run health(set-003,set-004), apiPublicRead(set-004a), settingsRead(set-004b,set-004c)
  as separate bounded reads; reject nonzero status, extra fields, or policy mismatch
after browser bootstrap login, create isolated bootstrap API context then capture CSRF
for each fixture create immediately followed by fixtureRead proof:
  normalize and strict-validate the request; issue exactly one write; on lost response
  retain only the frozen pending-attempt descriptor and private observation, with no query
  or append; phase 3 alone discovers against that frozen natural-key baseline and registers
  immutable failure-discovery provenance; issue the paired exact-ID proof before any
  dependent create on the successful path
for each api create/reset/write immediately followed by its declared apiRead proof:
  bind only prior captures; strict-validate schema; issue one authenticated domain request;
  map a known domain failure to its declared result; reject unknown status/body/keys;
  register a successful persistent resource only after the proof read
run storage(set-032) only after media proof: compare the exact local DB/root delta to baseline
run preference fixture/fixtureRead pairs through domain services, not direct DB or Admin API claims
during flows, execute each api/apiRead reset or hostile-write pair at its ordinal only after
  all assertion dependencies; never batch a write and proof into one operation
create the user-A isolated API context at ru-043b, capture its CSRF at ru-043c, then run
  ru-047a, ru-050, ru-051, and ru-061a through their exact isolated-context handlers;
  automatic login, CSRF retry, or fallback to browser/session authority is forbidden
after every handler result, apply outputSchemaId, bind captures once, enforce the declared
  state transition, and snapshot the repository; any failure enters the one cleanup path
```

Every runtime handler receives only its validated `NonSecretRef[]`, the executor's
private capability object, prior single-assignment captures, and ledger authority. It
returns one bounded typed projection; raw DB rows, HTTP bodies/headers, environment,
process handles, and storage paths stay private. A handler cannot invoke another
manifest operation, retry automatically, or broaden delete/discovery predicates.

`REQUIRED_SMOKE_ASSERTIONS` is the exhaustive 55-name set above and the visible
assertion matrix below defines each predicate. Specialized cold-cache, media-race, and
preference route-counter assertions remain in that same equality check even when their
output parser is specialized; the two media-count receipts are separately pinned
operations with null assertion names. No assertion may appear twice: the post-Save
binding observation in Flow 1 is a capture, and the sole
`persisted-no-empty-binding` assertion runs after reopen.

The executor accepts only these state transitions:

```text
stopped
  -> local-storage-proven
  -> helper-owned-and-healthy
  -> logger-installed
  -> bootstrap-authenticated
  -> fixtures-acquired-and-proven
  -> cold-builder
  -> button-image-complete
  -> tabs-content-complete
  -> tabs-keyboard-aria-complete
  -> space-selection-complete
  -> dirty-guards-complete
  -> related-retry-cache-complete
  -> responsive-users-complete
  -> browser-session-absent
  -> fixtures-and-storage-absent
  -> helper-processes-and-ports-absent
  -> evidence-sealed
```

Page state is `none -> p1/0 -> p1/0+p2/1 -> p1/0 -> none`; no identity is reused.
Authentication state is `none -> bootstrap -> A -> B -> A -> B -> A -> none`, with
the exact sign-out/login command groups in Flow 7. Theme state is
`light -> dark -> light -> dark -> light -> dark -> light -> dark -> light`, driven by
exactly `tc-004`, `tk-001`, `ss-008`, `dg-004`, `dg-040`, `ru-036`, `ru-071`, and
`ru-081` in that order. The first six toggle proofs/samples are respectively `tc-005`,
`tk-002`, `ss-009`, `dg-005`, `dg-041`, and `ru-037`; `ru-071` is captured by
`ru-072`, whose B-dark sample also includes root-scoped metadata effect `false`, and is
bound by `ru-073`. The single `ru-082` assertion consumes that frozen `ru-072` B
sample but directly reads and validates the current returned-A durable/metadata state
and computed light sample after `ru-081`. A malformed route cannot
release, a delayed route cannot unroute before release/UI settlement, and no second
route with the same key may be installed.

```ts
const TASK_540_SMOKE_FAILURE = deepFreezeExact({ code: "task540_smoke_failed" });

type RunState = DeepReadonly<{
  topLevel: TopLevelSmokeState;
  pages: PageIdentityState;
  routes: RouteRegistryState;
  authentication: AuthenticationState;
  theme: ThemeState;
  browserAuthority: BrowserAuthorityState;
  apiContexts: ApiContextState;
  fixtures: FixtureLifecycleState;
  host: HostLifecycleState;
}>;

type FailureDiscoveryAttemptResult = DeepReadonly<{
  pendingAttemptKey: string;
  safeDelta: AcquisitionDelta;
  failure: FailureDiscoveryFailure | null;
  intendedParentBlockerKeys: readonly string[];
}>;

type ResponseLostDiscoveryBatch = DeepReadonly<{
  attemptResults: readonly FailureDiscoveryAttemptResult[];
}>;

type FrozenFinalCleanupPlan = DeepReadonly<{
  ledger: FinalCompiledResourceLedger;
  dependencyGraph: FinalCrossStageDependencyGraph;
  persistentActionPlan: FrozenPersistentCleanupPlan;
  terminalActionPlan: FrozenTerminalCleanupPlan;
  failureDiscoveryBlockedParentKeys: readonly string[];
}>;

export async function executeTask540SmokePlan(input): Promise<CanonicalSmokeEvidence> {
  // Declaring a null slot is non-acquiring and reads nothing from untrusted input.
  let constructionCleanupAuthority: PrivateConstructionCleanupAuthority | null = null;
  try {
    // The constructor is pure, non-acquiring bookkeeping. It is inside the outer
    // sanitizing try and still runs before any property/prototype read from input.
    constructionCleanupAuthority = createPrivateConstructionCleanupAuthority();
    assertExactPlainObjectKeys(input, [
      "root",
      "nonce",
      "assertSafeEvidence",
      "snapshotRepository",
    ]);
    assertExecutorInputTypes(input);
    const plan = buildTask540SmokePlan({ nonce: input.nonce });
    const capabilities = createPrivateRealCapabilities({
      root: input.root,
      assertSafeEvidence: input.assertSafeEvidence,
      snapshotRepository: input.snapshotRepository,
      // Every handle is registered here immediately as it is acquired; construction
      // may fail before a complete capabilities object exists.
      constructionCleanupAuthority,
    });
    constructionCleanupAuthority.bindCompleteCapabilities(capabilities);
    return await executeSmokePlanCore(plan, capabilities, constructionCleanupAuthority);
  } catch (cause) {
    if (constructionCleanupAuthority === null) {
      // Constructor failure acquired nothing. The pre-existing non-acquiring module sink
      // never throws and exposes no cause outside executor-private memory. With no
      // active allowlisted manifest action it emits no action diagnostic.
      retainOrDiscardPreAuthorityCauseInModuleSinkNeverThrow(cause);
    } else {
      // Internally catches/aggregates cleanup errors and returns the same frozen private
      // diagnostics on later calls; it never rejects and never repeats an operation.
      const cleanupDiagnostics =
        await constructionCleanupAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
      constructionCleanupAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(
        cause,
        cleanupDiagnostics
      );
      // Real execution only: after cleanup, write at most one canonical bounded line
      // containing exactly the fixed code and the still-active ID validated against
      // this frozen manifest. The sink is injected for hermetic tests and never throws.
      constructionCleanupAuthority.emitSafeFailureActionOnceNeverThrow();
    }
    throw TASK_540_SMOKE_FAILURE;
  }
}

// Private: called only by the public real-adapter wrapper and hermetic self-test.
async function executeSmokePlanCore(
  plan,
  capabilities,
  constructionCleanupAuthority
): Promise<CanonicalSmokeEvidence> {
  assertTask540SmokePlanDeepFrozen(plan);
  const authority = privateCommandAuthority(capabilities);
  const executionAuthority = privateExecutionAuthority(capabilities);
  const captures = new SingleAssignmentCaptureMap();
  const resources = new ResourceLedgerBuilder(RESOURCE_KIND_CONTRACTS);
  const completedActionIds = new Set<ActionId>();
  const actionReceipts = new Map<number, ActionReceipt>();
  let runState: RunState = createInitialValidatedRunState({
    topLevel: "stopped",
    pages: emptyPageIdentityState(),
    routes: emptyRouteRegistryState(),
    authentication: "none",
    theme: "light",
    browserAuthority: "absent",
    apiContexts: "none",
    fixtures: "absent",
    host: "stopped",
  });

  constructionCleanupAuthority.bindCoreCleanupOnce(async () => {
    runState = await executeDeterministicCleanup(
      capabilities,
      authority,
      captures,
      resources,
      completedActionIds,
      actionReceipts,
      runState
    );
  });

  validateSmokeFixtureBlueprint(plan.fixtureBlueprint);
  validateManifestSetEqualityStateMachineAndPartition(plan.actionManifest);
  for (const action of plan.actionManifest) {
    // Module-private tracker rejects unknown/duplicate IDs and owns no cause/output.
    failureActionTracker.begin(action.id, plan.actionManifest);
    assert(action.ordinal === completedActionIds.size + 1);
    assertEveryDependencyCompleted(action, completedActionIds);
    assert(!completedActionIds.has(action.id));
    assertState(action.precondition, runState, captures);
    // Ref values resolve here, for this action only, after prior producers completed.
    const exactInvocation = buildRegisteredInvocation(plan.registries, action, captures);
    assertOneOperation(exactInvocation, action.kind);
    const { raw, receipt } = await authority.execute(exactInvocation);
    // Raw bytes and the editable content-type detail stay WeakMap-local.
    const parsed = parseRejectUnknown(action, raw);
    assertOneReceiptForExactAction(receipt, action);
    const provenance = validateIndependentActionProvenance(
      executionAuthority,
      action,
      exactInvocation,
      parsed,
      receipt
    );
    const acquisitionDelta = takeExactActionBoundAcquisitionDelta(
      executionAuthority,
      action,
      parsed,
      provenance
    );
    assertExactActionBoundAcquisitionDelta(action, acquisitionDelta); // empty is valid
    resources.appendValidatedActionDelta(action, acquisitionDelta);
    assertDescriptorResultProvenanceLedgerBidirectionalEquality(
      action,
      exactInvocation,
      parsed,
      provenance,
      acquisitionDelta,
      resources.actionProjection(action.id)
    );
    bindRegisteredPrivateProjectionOutput(executionAuthority, action.id, parsed);
    bindSingleAssignmentCaptures(action, parsed, captures);
    const nextRunState = transition(runState, action, parsed);
    assertPostcondition(action, parsed, nextRunState, captures);
    runState = assertValidatedDeepFrozenRunState(nextRunState);
    assert(!actionReceipts.has(action.ordinal));
    actionReceipts.set(action.ordinal, receipt);
    completedActionIds.add(action.id);
    // Clear only after receipt, resource, capture, and completion bookkeeping passes.
    failureActionTracker.complete(action.id);
  }
  assert(failureActionTracker.activeId() === null);
  assertExactOneLoopManifestExecution(plan.actionManifest, completedActionIds, actionReceipts, {
    setup: 55,
    flow: 434,
    terminal: 7,
  });
  const cleanupResult =
    await constructionCleanupAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  assertPrivateCleanupSucceeded(cleanupResult);
  runState = transitionToEvidenceSealed(runState);
  const evidence = sealCanonicalEvidence(authority, captures, runState);
  capabilities.assertSafeEvidence(evidence); // sanitized canonical candidate only
  return assertCanonicalSmokeEvidenceDeepFrozen(evidence);
}

async function executeDeterministicCleanup(
  capabilities,
  authority,
  captures,
  resources,
  completedActionIds,
  actionReceipts,
  initialRunState
): Promise<RunState> {
  let runState = assertValidatedDeepFrozenRunState(initialRunState);
  const errors = new PrivateAggregateCleanupError();
  // Each plan is assigned and deep-frozen exactly once, then reused by identity.
  let persistentCleanupPlan: FrozenPersistentCleanupPlan | null = null;
  let terminalCleanupPlan: FrozenTerminalCleanupPlan | null = null;
  let finalCleanupPlan: FrozenFinalCleanupPlan | null = null;
  let apiContextsClosedProof: FrozenApiContextsClosedProof | null = null;
  let failureDiscoveryBlockerRoots: readonly string[] | null = null;
  await continuePhase(errors, 1, async () => {
    if (isTerminalBrowserAbsenceState(runState, completedActionIds, actionReceipts)) {
      const before = authority.snapshotBrowserInvocationAndReceiptCounts();
      await identityRemoveAlreadyAbsentBrowserPrivateRootOnce(capabilities, runState);
      authority.assertBrowserInvocationAndReceiptCountsUnchanged(before);
      assert(runState.topLevel === "browser-session-absent");
      assert(runState.browserAuthority === "absent");
    } else {
      const missing = deriveExactMissingFailureBrowserCleanupOperations({
        runState,
        completedActionIds,
        actionReceipts,
        allowedOperations: ["release-unroute", "route-list", "close", "global-list-absence"],
      });
      const failureCleanup =
        await authority.executeMissingBrowserCleanupOnceAsPrivateDiagnostics(missing);
      assertExactMissingBrowserCleanupTrace(missing, failureCleanup);
      assertNoCanonicalActionReceiptAdded(actionReceipts, failureCleanup);
      runState = assertValidatedDeepFrozenRunState(
        transitionEarlyFailureToBrowserSessionAbsent(runState, failureCleanup)
      );
      await identityRemoveAlreadyAbsentBrowserPrivateRootOnce(capabilities, runState);
    }
  });
  await continuePhase(errors, 2, cleanupFailureScreenshotsIfApplicable);
  await continuePhase(errors, 3, async () => {
    const pendingAttempts = authority.takeFrozenPendingFailureAttemptsForCleanupOnce();
    const discoveryBatch: ResponseLostDiscoveryBatch =
      await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
        capabilities,
        pendingAttempts
      );
    assertOneImmutableDiscoveryResultPerPendingAttempt(
      pendingAttempts,
      discoveryBatch.attemptResults
    );
    const blockerRoots = new FailureDiscoveryBlockerRootBuilder();
    for (const result of discoveryBatch.attemptResults) {
      assertFailureDiscoveryAttemptResult(result);
      resources.appendValidatedFailureDiscoveryDelta(result.safeDelta);
      if (result.failure !== null) {
        errors.addFailureDiscoveryFailure(result.pendingAttemptKey, result.failure);
        blockerRoots.appendValidatedExistingParentKeys(
          result.pendingAttemptKey,
          result.intendedParentBlockerKeys,
          resources
        );
      } else {
        assertDeepEqual(result.intendedParentBlockerKeys, []);
      }
    }
    assertFailureDiscoveryLedgerBidirectionalEquality(discoveryBatch, resources);
    assert(failureDiscoveryBlockerRoots === null);
    failureDiscoveryBlockerRoots = blockerRoots.deepFreezeExactRoots();
    const persistent = resources.compileAndFreezePersistentProjection();
    const actions = expandPersistentRuntimeCleanup(persistent);
    assertPersistentSetAndCardinality(persistent, actions);
    const persistentBlockedParentKeys = compileBlockedParentClosure(
      persistent.dependencyGraph,
      failureDiscoveryBlockerRoots
    );
    assert(persistentCleanupPlan === null);
    persistentCleanupPlan = createDeepFrozenPersistentCleanupPlan({
      projection: persistent,
      actions,
      dependencyGraph: persistent.dependencyGraph,
      failureDiscoveryBlockedParentKeys: persistentBlockedParentKeys,
    });
    const exactPersistentPlan = assertFrozenPersistentCleanupPlanPresent(persistentCleanupPlan);
    await runEligiblePhase3Actions(
      exactPersistentPlan,
      exactPersistentPlan.dependencyGraph,
      exactPersistentPlan.failureDiscoveryBlockedParentKeys,
      errors
    );
  });
  await continuePhase(errors, 4, async () => {
    const sameInputRunState = runState;
    const proof = await disposeAndIndependentlyProveBothApiContextsClosed(
      capabilities,
      sameInputRunState
    );
    assert(proof.inputRunState === sameInputRunState);
    assert(apiContextsClosedProof === null);
    apiContextsClosedProof = assertDeepFrozenApiContextsClosedProof(proof);
    runState = assertValidatedDeepFrozenRunState(
      transitionOnlyApiContextsToClosed(sameInputRunState, apiContextsClosedProof)
    );
    assertRunStateFieldsExceptApiContextsPreservedByIdentity(sameInputRunState, runState);
    assert(runState.apiContexts === "closed");
  });
  await continuePhase(errors, 5, async () => {
    assert(runState.apiContexts === "closed");
    const exactApiContextsClosedProof =
      assertFrozenApiContextsClosedProofPresent(apiContextsClosedProof);
    assertIndependentApiContextAbsenceProofMatchesRunState(exactApiContextsClosedProof, runState);
    assertNoFurtherHttpAllowed();
    const terminalDelta = await stablePollExactTaskUaDelta();
    resources.appendTerminalCoresAndExactEdges(terminalDelta);
    const terminal = resources.compileAndFreezeTerminalProjection();
    const terminalActions = expandTerminalRuntimeCleanup(terminal);
    assertTerminalSetAndCardinality(terminal, terminalActions);
    assert(terminalCleanupPlan === null);
    terminalCleanupPlan = createDeepFrozenTerminalCleanupPlan({
      projection: terminal,
      actions: terminalActions,
      dependencyGraph: terminal.dependencyGraph,
    });
    const exactPersistentPlan = assertFrozenPersistentCleanupPlanPresent(persistentCleanupPlan);
    const exactTerminalPlan = assertFrozenTerminalCleanupPlanPresent(terminalCleanupPlan);
    const exactFailureDiscoveryBlockerRoots = assertFrozenFailureDiscoveryBlockerRootsPresent(
      failureDiscoveryBlockerRoots
    );
    const finalCompiledLedger = resources.compileAndDeepFreezeFinalLedgerAndDisjointUnion(
      exactPersistentPlan,
      exactTerminalPlan
    );
    const finalDependencyGraph = deepFreezeExact(
      compileFinalCrossStageDependencyGraph(finalCompiledLedger)
    );
    const finalFailureDiscoveryBlockedParentKeys = deepFreezeExact(
      compileBlockedParentClosure(finalDependencyGraph, exactFailureDiscoveryBlockerRoots)
    );
    assert(finalCleanupPlan === null);
    finalCleanupPlan = createDeepFrozenFinalCleanupPlan({
      ledger: finalCompiledLedger,
      dependencyGraph: finalDependencyGraph,
      persistentActionPlan: exactPersistentPlan,
      terminalActionPlan: exactTerminalPlan,
      failureDiscoveryBlockedParentKeys: finalFailureDiscoveryBlockedParentKeys,
    });
    assertFinalCleanupPlanExactAndDeepFrozen(finalCleanupPlan, finalCompiledLedger);
    assert(finalCleanupPlan.persistentActionPlan === exactPersistentPlan);
    assert(finalCleanupPlan.terminalActionPlan === exactTerminalPlan);
  });
  await continuePhase(errors, 6, async () => {
    const exactTerminalPlan = assertFrozenTerminalCleanupPlanPresent(terminalCleanupPlan);
    const exactFinalPlan = assertFrozenFinalCleanupPlanPresent(finalCleanupPlan);
    assert(exactFinalPlan.terminalActionPlan === exactTerminalPlan);
    await runTerminalDeleteAndAbsenceActions(
      exactTerminalPlan,
      exactFinalPlan.dependencyGraph,
      exactFinalPlan.failureDiscoveryBlockedParentKeys,
      errors
    );
  });
  await continuePhase(errors, 7, async () => {
    const exactPersistentPlan = assertFrozenPersistentCleanupPlanPresent(persistentCleanupPlan);
    const exactFinalPlan = assertFrozenFinalCleanupPlanPresent(finalCleanupPlan);
    assert(exactFinalPlan.persistentActionPlan === exactPersistentPlan);
    await runGuardedSyntheticUserActionsFromPersistentPlan(
      exactPersistentPlan,
      exactFinalPlan.dependencyGraph,
      exactFinalPlan.failureDiscoveryBlockedParentKeys,
      errors
    );
  });
  await continuePhase(errors, 8, restoreBootstrapWithSingleCasAndUncertainOutcomeProof);
  await continuePhase(errors, 9, async () => {
    await proveGlobalStorageAndScreenshotPostconditions(runState);
    runState = transitionCleanupState(runState, "fixtures-and-storage-absent");
  });
  await continuePhase(errors, 10, async () => {
    await stopAndProveOwnedHostProcessGroupAbsent(runState);
    runState = transitionCleanupState(runState, "helper-processes-and-ports-absent");
  });
  errors.throwIfAny();
  return assertValidatedDeepFrozenRunState(runState);
}
```

The two phase-action-plan constructors and the final-plan constructor reject an already
assigned slot and recursively freeze their projections, action arrays, blockers, and
graphs. Every later phase asserts presence and object identity. Phase 3 receives the
exact persistent action plan and its phase-local graph; phases 6 and 7 receive their
unchanged phase-specific action plan plus the exact final graph from the same
`finalCleanupPlan`. No phase may compile, expand, clone, replace, substitute, or derive
another plan or graph. Executor self-tests cover absent, double-assigned, mutable,
identity-substituted, cloned, recompiled, and re-expanded plans/graphs at each boundary,
including the cross-stage terminal-child-to-user guard.

That `for (const action of plan.actionManifest)` statement is the only static-action
execution loop. It executes setup ordinals `1..55`, flow ordinals `56..489`, and
terminal browser ordinals `490..496` once each and records one matching receipt before
the next ordinal. Cleanup expansion is separately ledger-derived failure/success
cleanup authority; it cannot contain a manifest action ID, satisfy a missing manifest
receipt, or replay setup. Neither the real path nor the hermetic self-test has an
alternate setup executor, capture-triggered manifest expansion, retry loop, or fallback
dispatch path.

Each parser rejects unknown keys, non-finite geometry, wrong types, missing capture
dependencies, stale page identity, route-state mismatch, unexpected URL, duplicate
capture, repository-fingerprint drift, truncated output, or nonzero status. Successful
cleanup performs no browser command after the terminal global-list receipt and only
identity-removes the already-absent private root. Early-failure cleanup executes exactly
the missing release/unroute, native route-list, close, and global-list absence subset once as private
diagnostics, then deletes/proves only acquired independent fixtures in canonical resource
order, runs the mandatory bootstrap login-state restore/complete-row proof, both stable
storage/DB absence scans, and finally stops/proves the owned process tree and ports.

The canonical reverse-dependency sort is: the main override; zero to six exact
cleanup-discovered Entry SEO documents in their frozen stable discovery order; setting A/B; the main and
retry Screens; the editable entry and five related entries; the composite media-row-key;
the four content types; stable-polled task-UA audit logs; stable-polled task-UA access
logs; every acquired `session-task`; then users A/B. Cleanup failure is retained privately; the public
wrapper may emit only the exact action-only, cleanup-only, or combined bounded
diagnostic shapes defined above after cleanup, then
throws the unchanged fixed sanitized failure and never starts another attempt.
The diagnostic sink is module-private and injectable only for hermetic executor tests.
Those tests prove exact canonical bytes and one emission, reject an ID outside the
frozen manifest as action authority, emit nothing for construction/no-active-action
when cleanup proves absence, emit the exact cleanup-only shape when cleanup fails, clear
a successfully completed action so cleanup cannot be misattributed to it, select the
earliest cleanup phase and fixed same-phase class precedence, and prove a private marker
from the retained cause never appears.
The real sink is bounded and wrapped so an output failure cannot replace the primary
fixed failure.

## Real browser smoke

### Server, URLs, session, and fixture discipline

The executor's private real capability—never an agent or external runner—starts from
stopped host ports by spawning `process.execPath` with the canonical repo-owned
`_docs/_workflows/task-540-smoke-host.mjs` path, exact argv
`[hostModulePath,"--serve",canonicalRoot]`, canonical-root cwd, `shell:false`, and
`detached:true`. The executor alone creates that dedicated session/process group; the
host never self-detaches, respawns itself, or treats a plain interactive shell launch as
process-group-equivalent. Before spawning a child, the host verifies on Linux that its
retained PID equals its PGID. It owns the `EXECUTOR_EVIDENCE_RUNNER_VERSION = 1` runner
and retains the live `ChildProcess` handle, host-runner PID, bounded stdout/stderr bytes,
and the non-secret listener PID/PPID/full ancestry for backend, Admin Vite, and site
Vite. Each listener must descend from that exact repo-owned runner, so cleanup never
signals an unrelated process. A read-only post-execution audit may classify the final
executor-produced, secret-scanned canonical projection; no agent launches a server,
invokes a validation/browser/API/DB/storage command, supplies command output, or authors
an evidence hash. The installed/global `coderso-dev-core-host` helper and every other
external launcher are explicitly forbidden. The executor removes that installed helper
from its program allowlist, admits only the pinned Node executable for this host launch,
and never falls back to the helper. The operator-equivalent health checks are:

```bash
curl --fail --silent --show-error http://coderso-a.localhost:5173/admin/advanced/custom-screens >/dev/null
curl --fail --silent --show-error http://coderso-a.localhost:3000/ >/dev/null
```

The executor runs each health probe through Node `execFile("curl", argv)` so it can
hash the real captured stdout/stderr. Its runtime `operationDescriptor` therefore
records the exact `curl` argv without claiming that the display-only shell redirection
above executed.

If spawn, health, listener inventory, or ancestry validation fails after process
creation, `startOwnedSmokeHost` must not merely signal the retained child and throw.
Its bounded catch path sends TERM then KILL only to the owned process group, enumerates
that group until the repo-owned runner and every descendant are absent, and proves ports
`3000`, `5173`, and `5174` have no listeners. The thrown error carries
`hostAbsenceProven:true` only after all of those observations pass. An occupied-port
preflight or incomplete absence proof is non-retryable: the executor returns only its
optional exact active-action diagnostic plus fixed sanitized failure after its one
bounded cleanup path and never starts a
replacement fixture prefix/host runner or browser authority in that invocation.

The host's own bounded shutdown path is deliberately narrower: after revalidating
PID/PPID/PGID/start identities, it sends TERM and then conditional KILL only to surviving
same-identity descendants and proves descendant plus port absence while it is still
alive. It never claims its own PID or PGID absent and never sends `SIGKILL` to its own
negative PGID. The executor's outer authority exclusively owns negative-PGID signalling
and the complete runner/PID/PGID absence proof described in the terminal host contract.

The Admin URL is
`http://coderso-a.localhost:5173/admin/advanced/custom-screens`; the public-front
URL is `http://coderso-a.localhost:3000/`. The executor canonicalizes the supplied
repository root and requires the already existing regular file
`<canonical-root>/.env`; it neither creates nor rewrites that file. It reads
`ADMIN_EMAIL` and `ADMIN_PASSWORD` only into private memory without echoing either
value. That repo file is executor input only: it is never used as a browser secrets
path, browser cwd, browser config, browser output, browser HOME, or browser/XDG store.

Before any browser command, the executor creates exactly one task-owned private root
with `mkdtemp` beneath the canonical system temp directory, outside and neither an
ancestor nor descendant of the repository. Creation uses a non-symlink parent and
mode `0700`; a stable `lstat`/`realpath` proof freezes the root `(dev,ino,type,mode)`.
Under it the executor creates only these `0700` directories, all on that device:
`cwd`, `cwd/.playwright`, `home`, `tmp`, `xdg/config`, `xdg/cache`, `xdg/data`,
`config`, and `output`. `cwd/.playwright` is created exclusively by the executor
before the first CLI call and is the unique workspace/session registry for this run;
it is identity-ledgered like every other private node and must be absent at terminal
cleanup.
The Playwright daemon location is thereby exactly
`<private-root>/xdg/cache/ms-playwright/daemon`; the CLI cwd is exactly
`<private-root>/cwd`, so repo-local `.claude`/skill configuration cannot be discovered
or loaded. One `browser-private-root` resource owns this root and its WeakMap-private,
append-only artifact identity subledger.

The executor writes `<private-root>/config/secrets.env` with an exclusive no-follow
create and mode `0600`. Its reject-duplicate dotenv serializer writes exactly two
keys—`ADMIN_EMAIL` and `ADMIN_PASSWORD`—with safe escaping, reads it back through the
same strict parser, and requires exact value equality; no third key, blank duplicate,
comment substitution, interpolation, or inherited value is permitted. It separately
writes `<private-root>/config/playwright.json` with mode `0600`, reads it back, and
requires this exact semantic object (the concrete output path is the private path just
created):

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": { "args": ["--no-sandbox"] }
  },
  "codegen": "none",
  "outputDir": "<private-root>/output"
}
```

This object is closed against the locally installed 0.1.17 config schema. That schema
supports top-level `outputDir` and `codegen`; it does not support a top-level
`outputMode` config key. The similarly named internal/MCP CLI option is not config-file
authority for this skill invocation, so adding `outputMode` or any other unknown key
fails preflight. Raw CLI output is selected by the executor's fixed `--raw` argv.

`/ms-playwright` must independently resolve to the expected non-symlink browser
directory before spawn. Every browser child starts from an empty null-prototype map.
It may copy only defined string values for the frozen non-secret inherited names below;
all filesystem/control values are then set to the exact workflow-owned literals shown:

```ts
const BROWSER_INHERITED_ENV = [
  "PATH",
  "USER",
  "LOGNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
] as const;
const BROWSER_FIXED_ENV = deepFreezeExact({
  HOME: privateHomeDir,
  TMPDIR: privateTmpDir,
  TMP: privateTmpDir,
  TEMP: privateTmpDir,
  XDG_CONFIG_HOME: privateXdgConfigDir,
  XDG_CACHE_HOME: privateXdgCacheDir,
  XDG_DATA_HOME: privateXdgDataDir,
  PLAYWRIGHT_MCP_CONFIG: privateConfigPath,
  PLAYWRIGHT_MCP_OUTPUT_DIR: privateOutputDir,
  PLAYWRIGHT_MCP_SECRETS_FILE: privateSecretsPath,
  PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright",
  CI: "1",
  NO_UPDATE_NOTIFIER: "1",
});
```

The browser receives exactly `BROWSER_INHERITED_ENV + BROWSER_FIXED_ENV`; raw
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, repo paths other than an explicitly allowlisted
screenshot target, provider/cloud credentials, host settings, and any other
environment key are absent. Credential fill output is captured privately, checked
against its exact grammar below, then represented only by a discarded-output marker.

The installed `playwright-cli` skill-mode contract is version `0.1.17` and hardcodes
full snapshot mode; configuration cannot disable it. Therefore no descriptor may
pretend snapshot output is absent. Ordinary goto/resize/click/non-secret fill/press/
type/focus operations are deliberately one-layer-JSON run-code sources; they never use
their native CLI commands. Only the 14 native descriptors, 13 screenshot descriptors,
and one global-list descriptor use non-JSON output.

All command grammars below require exit status `0`, exact empty stderr, valid UTF-8,
no BOM/NUL/CR, the displayed LF bytes, and bounded stdout before parsing. Angle-bracket
tokens are grammar captures, not permissive prose. `<PID>` is a positive safe decimal
integer that must equal the newly inventoried owned browser process. `<SNAPSHOT>` is
exactly `../output/page-<UTC>.yml`, where `<UTC>` matches
`YYYY-MM-DDTHH-MM-SS-mmmZ`; resolving it against the private cwd must produce a new
no-follow regular file strictly under the identity-ledgered private output directory.

Native `open-about-blank` stdout is exactly:

```text
### Browser `wf540smoke` opened with pid <PID>.
### Page
- Page URL: about:blank
### Snapshot
- [Snapshot](<SNAPSHOT>)
```

There is exactly one LF after the snapshot-link line and no blank line, code fence,
`### Ran Playwright code` section, or other byte in stdout. The parser is implemented
from those fixed byte fragments and the two bounded token spans, not by Markdown
parsing. The open descriptor requires exactly one snapshot, the exact `about:blank`
Page section, and no code section, then normalizes only to the typed owned-session
projection required by its `outputSchemaId`.

Native `fill-secret` argv is exactly
`["-s=wf540smoke","--raw","fill",<exact-login-selector>,<secret-name>]`, where
`<secret-name>` is the literal `ADMIN_EMAIL` or `ADMIN_PASSWORD`; the secret file,
not argv interpolation, supplies its value. Its stdout is exactly one LF byte (`"\n"`),
not empty bytes, and it emits no snapshot link. The selector/name pair must match the
action-specific descriptor: email may use only the email selector and
`ADMIN_EMAIL`; password may use only the password selector and `ADMIN_PASSWORD`.

Native tab stdout uses only these fixed productions:

```text
TAB = - <nonnegative-index>: <optional-(current)-marker>[<bounded-title>](<exact-expected-url>)\n
TAB_NEW = <exact-p1-noncurrent-TAB><exact-p2-current-TAB>- [Snapshot](<SNAPSHOT>)\n
TAB_SELECT_0 = <exact-p1-current-TAB><exact-p2-noncurrent-TAB>
TAB_CLOSE_1 = <exact-p1-current-TAB>
```

The executor derives the exact expected index/current-marker/URL table from its
already-bound page state. Titles are bounded UTF-8 and must exclude CR/LF, backslash,
`[`, `]`, `(`, and `)` so they cannot alter the production. `tab-new` requires one
snapshot; `tab-select` and `tab-close` forbid one. Extra/missing/reordered/duplicate
tab rows, a reused page identity, or an unexpected current marker fails closed.
Native `route-list` stdout is exactly `No active routes\n` and normalizes to exact
`[]`. Native `close` stdout is exactly
`Browser 'wf540smoke' closed\n\n` and normalizes to `"closed"`.

Each `browser-screenshot` stdout is exactly
`- [Screenshot of full page](<EXPECTED_RELATIVE_PNG>)\n`.
`<EXPECTED_RELATIVE_PNG>` must byte-equal the POSIX relative path from the private cwd
to that descriptor's one canonical allowlisted repository PNG, and resolution must
equal the same target; absolute, encoded, escaped, alternate, or second links fail.
The subsequent no-follow PNG identity/signature proof remains separately mandatory.

Because the executor's private cwd and its newly created `.playwright` workspace are
unique, after native close the sole `browser-global-list` command must return exactly
`  (no browsers)\n`. It normalizes to `true` only after the named session/process
absence proof. A `### Browsers` section, any session row, extra blank line, or any
other byte fails; the workflow never adopts or closes an unrelated browser.

Every `browser-run-code` source returns a JSON value directly; it never returns
`JSON.stringify(...)`. Raw stdout must equal `canonicalJson(decodedValue) + "\n"`
with no leading/trailing whitespace, and the decoder performs exactly one JSON parse.
A JSON string containing serialized JSON, `undefined`/LF-only output, NaN/infinity,
duplicate object key, non-canonical number/string escape, unexpected key order, or a
second parse is rejected. The decoded value is then validated by the top-level exact
`outputSchemaId`. Side-effect-only sources return the exact registered object
`{"ok":true}` rather than ambiguous empty/unit output. Thus run-code, native, runtime,
screenshot, and global-list outputs cannot share a generic stdout parser.

Unknown/duplicate sections, an undeclared snapshot, a missing required snapshot,
inline YAML, or a link outside the exact private output root/allowlisted screenshot
path fails closed. Every linked private snapshot is opened no-follow, bounded,
identity-registered, hash-bound to the command receipt, and then removed with the
private root; it is never mistaken for canonical evidence or left in the repository.

Before opening a browser, `screenshot-baseline` requires fresh `lstat` to return
`ENOENT` for every exact TASK-540 PNG path. A pre-existing path of any type is an
infrastructure failure and is never removed or adopted. Immediately after each
registered screenshot invocation—even when that invocation throws after creating a
file—its adapter performs `lstat`, requires a new non-symlink regular file under the
exact allowlisted path with PNG signature, and freezes `(dev,ino,mode,size)` as the
acquired screenshot identity in the ledger's sole
`retain-on-success-remove-on-failure` record class. Success retains all 13 and revalidates the same
identities, distinct hashes, and PNG bytes. Failure cleanup unlinks only an acquired
path whose current `(dev,ino)` still matches; it then requires `lstat` `ENOENT`. A
missing/unowned, replaced, symlinked, or identity-changed path is never unlinked and
records a private cleanup failure.

After the named session is closed and the global list proves it absent—and on every
failure path after bounded termination of any owned browser command group—the executor
stable-walks the private root with no symlinks and appends every CLI-created daemon,
profile, snapshot, config, output, cache, and temp artifact to the private identity
subledger. It removes acquired files and directories deepest-first only while each
`(dev,ino,type)` still matches, removes the secrets file as soon as browser authority
is absent, and proves the entire root `ENOENT`. An unexpected external/replaced node,
identity drift, live daemon, non-empty unowned directory, or incomplete absence is a
private cleanup failure; broad `rm -rf`, prefix deletion, and adoption of a pre-existing
path are forbidden. Thus private Playwright output/temp cannot mutate the repo and no
secret/config/snapshot artifact survives success or failure.

No child receives `process.env`, `{...process.env}`, or the complete parsed `.env`.
The host module uses exactly these imports. Under the repository's pinned
`>=26.5.0 <27` Node runtime, direct-entry detection intentionally remains a pure guard
that compares `import.meta.url` with
`pathToFileURL(path.resolve(cwd, process.argv[1]))` rather than depending on
`import.meta.main`. Its hermetic self-test pins absolute and relative direct-entry
matches plus mismatched and missing argv rejection. Every runtime capability remains
unused on the `--self-test` branch:

```ts
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, lstat, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
```

The executor constructs the host environment from these disjoint frozen contracts:

```ts
const HOST_REQUIRED_INHERITED_ENV = ["PATH"] as const;

const HOST_OPTIONAL_INHERITED_ENV = [
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
  "XDG_DATA_HOME",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
] as const;

const HOST_REQUIRED_REPO_ENV = [
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
] as const;

const HOST_OPTIONAL_REPO_ENV = [
  "CORE_VERSION",
  "DB_POOL_MAX",
  "AUTH_PASSWORD_PEPPER",
  "ANALYTICS_IP_HASH_SECRET",
  "FORM_SUBMIT_NONCE_SECRET",
  "FORM_SUBMIT_NONCE_TTL_MINUTES",
  "ANALYTICS_BEACON_NONCE_SECRET",
  "ANALYTICS_BEACON_NONCE_TTL_MINUTES",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "EMAIL_TRANSPORT",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
  "PLUGINS_SAFE_MODE",
  "PLUGIN_UPDATE_MODE",
  "PLUGIN_ERROR_THRESHOLD",
  "PLUGIN_TIMEOUT_MS",
  "PLUGIN_DOWNLOAD_TIMEOUT_MS",
  "PLUGIN_MAX_SIZE_MB",
  "STORE_BASE_URL",
  "STORE_PUBLIC_KEY",
] as const;

const HOST_FIXED_ENV = deepFreezeExact({
  PORT: "3000",
  PUBLIC_BASE_URL: "http://coderso-a.localhost:3000",
  NODE_ENV: "development",
  COOKIE_SECURE: "false",
  VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
  VITE_SITE_DEV_SERVER_URL: "http://127.0.0.1:5174",
  VITE_API_ORIGIN: "http://127.0.0.1:3000",
  VITE_ADMIN_STRICT_MODE: "false",
  CODERSO_PUBLIC_VITE_DEV_URL: "http://coderso-a.localhost:5173",
  CI: "true",
});
```

The executor starts from `hostEnv = Object.create(null)`, copies each required inherited
and repository value as a non-empty string, copies an optional value only when its source
has an own data property whose value is a string, and then installs every fixed value.
If a parsed or inherited source defines a fixed key, an identical string is accepted but
is not copied as source authority; any different or non-string value fails. A missing
fixed key is synthesized from `HOST_FIXED_ENV`, not from a mutable default or `.env`
rewrite. The strict dotenv parser rejects duplicate entries, while unlisted repo values
are never projected. Accessors, symbols, prototype-pollution names, duplicate projected
keys, missing required values, and an unknown key in the final host projection fail
before spawn.

The executor passes that exact frozen null-prototype object as the repo-owned runner's
complete environment. On the `--serve` path only, the runner privately parses the raw
NUL-delimited `/proc/self/environ` bytes so duplicate names remain observable, rejects
malformed UTF-8 and non-canonical entries, and cross-checks exact key/value equality
against own data properties in `process.env`. The original JavaScript prototype cannot
survive `execve`; null-prototype construction and source accessors therefore remain
executor-owned proofs. Neither raw environment bytes nor a value-bearing diagnostic may
leave private authority. The runner never calls a dotenv loader, reads or sources
`.env`/`.env.*`, runs a shell/profile, invokes `bun run dev:core`, or delegates to an
installed helper. The executor may privately parse the canonical repo `.env` once to
construct the allowlisted host projection and the separate per-operation Bun-bridge
projections; no parsed map or unlisted key crosses into the host runner or any bridge
child.

After canonical-root, locally installed executable/Vite, Linux process-group, and
two-observation port-absence validation, the runner directly spawns exactly these three
frozen descriptors in this order. Every child receives the same exact `hostEnv` and
spawn options `shell:false`, `detached:false`, and
`stdio:["ignore","pipe","pipe"]`; both output streams are bounded and drained
privately, never forwarded. `<BACKEND_SOURCE>`, `<ADMIN_VITE_SOURCE>`, and
`<SITE_VITE_SOURCE>` are static repo-owned constants, not caller input or root-dependent
source interpolation.

`<BACKEND_SOURCE>` imports `startHttpServer` from `./server/httpServer`, starts only the
Bun HTTP backend with exact
`{port:3000,adminDevUrl:process.env.VITE_DEV_SERVER_URL}`, and registers idempotent
bounded SIGTERM/SIGINT handlers that call `server.stop()` once. It performs no Vite
spawn, `.env` read, or environment mutation. The two Vite sources import `createServer`
from the locally installed Vite 8 package and call it with these exact closed options,
changing only `configFile`, `cacheDir`, and `port`; each lifecycle instance awaits
`server.listen()` through the bounded restart helper below:

```ts
const ADMIN_VITE_OPTIONS = deepFreezeExact({
  configFile: "./vite.config.ts",
  configLoader: "native",
  cacheDir: "../node_modules/.vite/wf540-admin",
  envDir: false,
  clearScreen: false,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 5173, strictPort: true, open: false },
});

const SITE_VITE_OPTIONS = deepFreezeExact({
  configFile: "./vite.site.config.ts",
  configLoader: "native",
  cacheDir: "../node_modules/.vite/wf540-site",
  envDir: false,
  clearScreen: false,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 5174, strictPort: true, open: false },
});
```

The inline `envDir:false` must override both loaded configs so Vite neither loads nor
watches `.env`/`.env.*`; `configLoader:"native"` prevents bundle-loader temp output.
The two exact relative cache paths resolve from the configured `core/admin` and
`core/site` roots to the disjoint canonical directories
`core/node_modules/.vite/wf540-admin` and
`core/node_modules/.vite/wf540-site`. Admin and Site must never share or alias an
optimizer `deps` directory.
TASK-546 owns `package.json`, `core/package.json`, and `bun.lock`; their landed bytes
already resolve Vite `8.1.5` and remain byte-identical/read-only throughout TASK-540.
TASK-540 changes only `task-540-smoke-host.mjs` version literals, default fixtures,
version mutants, self-test expectations, and embedded child-source byte pins in this
step. The runner validates that authority before spawn and never permits
`bunx`, package installation, network resolution, a CLI Vite wrapper, or an installed
helper. The exact pin is part of
the readiness contract because the publication barrier below consumes the typed Vite
`server.environments.client.depsOptimizer` shape. Immediately after checkpoint
verification and before bridge/local-host/schema/CAS/ACK/recovery/prompt/test
implementation, the smoke-host owner must update only those exact TASK-540-owned
literals, fixtures, mutants, expectations, and embedded pins to 8.1.5, then privately
re-audit and revalidate optimizer readiness; mixed-version authority is a hard failure.
That revalidation, the bridge-frontier implementation, the formatting and every helper
byte are final, so the dependent helper hashes and implement/executor/task/test pins are
recomputed inside the closure transaction.

Before either Vite child emits its ready marker, it must pass the fail-closed
`settleViteReadiness(server, readinessUrls, failureCode)` barrier below. For Admin the
exact ordered URL set is `/main.tsx`, `/app/AdminApp.tsx`,
`/app/adminRouteComponents.tsx`, and
`/ui/custom-screens/CustomScreenListPage.tsx`; for Site it is `/main.ts`.
`server.waitForRequestsIdle()` proves only completion of the static-import crawl; it
does not by itself prove that the asynchronous dependency scan and optimizer commit
have published the browser hash and optimized files.

```ts
async function settleViteReadiness(server, readinessUrls, failureCode) {
  const optimizer = server.environments?.client?.depsOptimizer;
  if (!optimizer || typeof optimizer !== "object") throw new Error(failureCode);
  let previousStableMetadata = null;

  for (let round = 0; round < 8; round += 1) {
    await transformExactNonEmptySet(server, readinessUrls, failureCode);
    await server.waitForRequestsIdle();
    await requirePromiseOrAbsent(optimizer.scanProcessing, failureCode);

    const processing = uniquePresentProcessingPromises(
      requireExactMetadata(optimizer.metadata, failureCode).depInfoList,
      failureCode
    );
    await Promise.all(processing);
    await new Promise((resolve) => setImmediate(resolve));

    const metadata = requireExactMetadata(optimizer.metadata, failureCode);
    const remaining = uniquePresentProcessingPromises(metadata.depInfoList, failureCode);
    if (optimizer.scanProcessing !== undefined || remaining.length !== 0) continue;

    const stableMetadata = {
      identity: metadata,
      browserHash: metadata.browserHash,
      depIdentity: exactSortedDepIdentity(metadata.depInfoList),
    };
    if (
      previousStableMetadata !== null &&
      previousStableMetadata.identity === stableMetadata.identity &&
      previousStableMetadata.browserHash === stableMetadata.browserHash &&
      previousStableMetadata.depIdentity === stableMetadata.depIdentity
    ) {
      return;
    }
    previousStableMetadata = stableMetadata;
  }

  throw new Error(failureCode);
}
```

The helper validates required method/object/array/string shapes without coercion,
rejects unknown or malformed processing thenables, awaits every unique present
`OptimizedDepInfo.processing` promise, yields one event-loop turn so optimizer commit
continuations and module-graph invalidation finish, and requires two consecutive stable
metadata-identity/hash/dependency observations around fresh exact re-transforms. A
missing optimizer API, rejected scan/processing promise, malformed metadata, empty/null
transform, non-convergence, or ready marker emitted while an initial request can still
receive `504 Outdated Optimize Dep` fails the host contract.

Each Vite child then performs exactly one bounded warm restart through the same private,
serialized
`startViteWithWarmRestart(createServer, options, readinessUrls, expectedCacheDir, failureCode)`
helper. The Admin caller passes exactly
`process.cwd() + "/node_modules/.vite/wf540-admin"`; the Site caller passes exactly
`process.cwd() + "/node_modules/.vite/wf540-site"`. Canonical preflight and the fixed
`--cwd <canonical-core>` descriptor make those independent expected authorities exact;
the helper never derives expected authority from received Vite state. The options
argument is the recursively frozen exact owner shown above; it is never passed directly
to Vite because Vite 8.1.5 mutates its inline config during resolution. Before each
create, the helper validates that owner and constructs a fresh mutable plain-data clone,
including a fresh nested `server` object. The two dispatched clones must be deep/byte
equal to the frozen owner at their call boundary while both root and nested identities
are distinct; Vite mutation of one clone cannot affect the owner or the next start.

The helper creates the first server from clone 1, validates its resolved cache, listens,
passes `settleViteReadiness`, closes that server completely, creates a fresh second
server from clone 2, validates the same resolved cache, listens, passes the same
readiness barrier again, and returns only that second live server. The first server can
never emit READY; no third start or retry loop is allowed. Any option-clone,
create/listen/barrier/close failure closes the currently acquired server once where
possible and fails with the fixed child failure code. The host allows 120 seconds for
this two-start lifecycle, while its per-step optimizer loop remains eight rounds. This
codifies the observed local `coderso-dev-core-host` cold-start requirement without
delegating authority to that installed helper or accepting a white Admin document as
ready.

Every first and second server instance verifies its resolved `server.config.cacheDir`
equals its child-specific canonical directory before listening. The host validates the
two lexical authorities are distinct and remain beneath canonical
`core/node_modules/.vite`; any already-existing cache directory must be a canonical
non-symlink directory. The same rule applies independently to each exact optimizer
directory `<cacheDir>/deps`: when present before spawn it must be a canonical
non-symlink directory whose realpath remains under its own exact cache parent. After
both final children emit their private markers and before the public ready projection,
the host requires both cache and both nested `deps` directories to exist as canonical
non-symlink directories, with correct-parent real containment and distinct cache and
optimizer realpaths. A missing post-ready directory, cross-child cache literal,
parent/nested alias or symlink, shared realpath, escaped containment, or resolved-config
mismatch fails startup. The first and second start of one child intentionally retain
that child's own cache, while neither child can remove, rename, or publish into the
other's optimizer directory.

The executor owns the outer host-ready deadline as the exact private constant
`HOST_READY_TIMEOUT_MS = 130_000`, providing a fixed ten-second margin beyond the
host's 120-second lifecycle for spawn and final process/listener proof. The production
`readHostReadyLine()` call has no caller-controlled timeout override. Its hermetic fake-
timer self-test proves the registered delay is exactly 130,000 ms, a valid bounded ready
line before expiry settles once and clears the timer, expiry rejects once, and the stale
70,000-ms deadline is absent. The executor must never time out a still-valid host before
the host's own bounded two-start lifecycle can finish.

```ts
const HOST_CHILD_DESCRIPTORS = deepFreezeExact([
  {
    kind: "backend",
    file: "bun",
    args: ["--no-env-file", "--cwd", canonicalCoreRoot, "--eval", BACKEND_SOURCE],
    cwd: canonicalRoot,
  },
  {
    kind: "admin",
    file: "bun",
    args: ["--no-env-file", "--cwd", canonicalCoreRoot, "--eval", ADMIN_VITE_SOURCE],
    cwd: canonicalRoot,
  },
  {
    kind: "site",
    file: "bun",
    args: ["--no-env-file", "--cwd", canonicalCoreRoot, "--eval", SITE_VITE_SOURCE],
    cwd: canonicalRoot,
  },
]);
```

The runner itself is the retained process-group leader; the three direct Bun children
stay in that same owned group. Startup succeeds only after two stable observations prove
the group is exactly the runner plus those three direct children and map backend ->
`3000`, Admin -> `5173`, and site -> `5174`, with no extra group member or listener.
A process identity is the strict
`{pid,ppid,pgid,startTicks}` shape, where `startTicks` is a canonical positive decimal
string. The host-private startup proof is the strict recursively frozen shape:

```ts
{
  schemaVersion: 1,
  runner: { pid, ppid, pgid, startTicks },
  children: [
    { kind: "backend", identity: { pid, ppid, pgid, startTicks } },
    { kind: "admin", identity: { pid, ppid, pgid, startTicks } },
    { kind: "site", identity: { pid, ppid, pgid, startTicks } },
  ],
  listeners: [
    { kind: "backend", port: 3000, identity },
    { kind: "admin", port: 5173, identity },
    { kind: "site", port: 5174, identity },
  ],
  ports: [3000, 5173, 5174],
}
```

Only the strict bounded non-secret ready projection
`{schemaVersion:1,runnerPid,children:[{kind,pid}],ports:[3000,5173,5174]}` crosses host
stdout, exactly once. The executor independently cross-checks every
PID/PPID/PGID/start identity and listener before emitting the host runtime receipt; it
never trusts readiness alone. A missing, extra, reordered, shell-wrapped,
source-changing, or externally delegated descriptor fails the host self-test and runtime
preflight.

The host-private descendant-stop proof is the strict recursively frozen shape
`{schemaVersion:1,reason,term:{attempted,targets,survivors},kill:{attempted,targets,survivors},descendantsAbsent,portsAbsent}`.
`reason` is exactly `signal`, `child_exit`, or `startup_failure`; successful completion
requires both survivor arrays empty, `descendantsAbsent:true`, and
`portsAbsent:[3000,5173,5174]`. It is not whole-group evidence. The executor separately
owns the runner identity, complete retained membership, negative-PGID TERM/conditional
KILL observations, PID/start-identity and PGID absence, and two stable port-absence
observations. Only that executor proof may contribute to canonical smoke evidence.

The host self-test uses injected pure fakes and covers both exact CLI forms plus every
missing/mixed/extra form; lexical and filesystem-projected root rejection; unknown,
duplicate, malformed, accessor, symbol, prototype-pollution, missing-required, and
fixed-conflict environment cases; exact descriptor order/keys/argv/source bytes; the
absence of `bunx`, helper, shell, package-script, dotenv, or network paths; runner-not-
leader, wrong child parent/group/start identity, missing/duplicate/foreign listener, and
extra-member rejection; TERM-only success, TERM-to-KILL success, timeout, PID reuse,
persistent port, and concurrent-cleanup idempotence; and strict unknown-key plus
recursive-freeze checks for every proof shape. Its trap dependencies throw if
environment, filesystem, `/proc`, spawn, signal, port, or network capability is invoked,
and the self-test requires zero such calls.

The self-test also invokes the exact same private `settleViteReadiness` function whose
`Function.prototype.toString()` bytes are embedded into both Vite child sources; the
independent complete child-source byte pins remain literal and do not reuse that
serialization. Controlled deferred promises prove the continuation that writes READY
has not run before `scanProcessing`, has still not run before every
`OptimizedDepInfo.processing` publication, and runs exactly once only after the
event-loop yield and two stable fresh re-transform rounds. The positive cases pin two
ordered transforms of all four Admin URLs and two transforms of the one Site URL.
Negatives cover a missing optimizer API, malformed metadata, non-native processing
thenables, rejected scan and processing promises, null/empty transforms, and eight
non-convergent rounds; every negative emits zero READY continuations.

The self-test invokes the exact same serialized `startViteWithWarmRestart` helper with
fake Vite factories and each exact child-specific `expectedCacheDir`, and pins this order
for both Admin and Site: create 1 -> cache-authority check 1 -> listen 1 -> two stable
readiness transforms -> close 1 -> create 2 -> cache-authority check 2 -> listen 2 -> two
stable readiness transforms -> return final server -> READY continuation. It proves the
final server is not closed before the continuation and covers first/second create,
resolved-cache mismatch, listen, readiness, and close failures with exactly-once cleanup
of the acquired instance. Source assertions and independent full byte pins prove both
real child programs pass their exact expected authority and await this helper before
their ready markers, and contain neither a third start nor an alternate retry path.
The factory fake retains both pre-call option projections and proves they equal the exact
frozen owner while the dispatched root/server identities differ; mutations applied by
create 1 cannot appear in clone 2. Unknown/missing owner keys, an unfrozen owner or
nested server, shared clone identity, and clone value drift fail before READY.

The preflight and final-ready fakes additionally prove the two exact resolved cache
authorities, reject either child carrying the other child's cache literal, and reject a
missing post-ready directory, symlink, non-canonical path, shared realpath, or directory
outside `core/node_modules/.vite`. They separately reject distinct cache parents whose
nested `deps` paths are symlinks, escape their owning cache realpath, or resolve to one
shared optimizer directory. The serialized restart helper rejects a resolved
`server.config.cacheDir` mismatch on either first or second instance before that
instance can listen.

The host child receives only the union of the required, optional-present, and fixed host
contracts above; the browser uses the separate exact private contract and never receives
host environment wholesale. `ADMIN_EMAIL`, `ADMIN_PASSWORD`, provider/cloud
credentials, `MEDIA_STORAGE`, and `MEDIA_DIR` are never copied to the host or browser.
Values needed by Node-local adapters remain in executor-private memory. A Bun bridge
child receives only its descriptor's exact null-prototype env profile for that one
operation; no parsed map, host projection, browser projection, or secret corpus is
forwarded wholesale.

Every browser invocation is one separate command executed by the local evidence runner
in the single named session, including route setup, release, assertions, screenshots,
and cleanup. The private executor consumes the deep-frozen positive command plan
directly; no browser agent or parallel command path exists. Source-row builders may
display symbolic `$ADMIN_*`/`$WF540_*` text for human review, but compiled executables
contain no `$...` placeholder. The compiler emits only `SecretNameRef` for the two
credential names and ordinary fixture refs for synthetic emails. It never performs
shell interpolation. Therefore no raw credential value can enter the spawned
process's `/proc/*/cmdline`. A later read-only audit can inspect only the sealed
redacted evidence.

Every executor-owned one-shot child (`playwright-cli`, health probe, pinned Bun bridge,
or other bounded local runtime command) is also spawned in its own retained process
group. Normal exit and
timeout both inventory PID/PGID/start identities; timeout sends bounded group TERM,
then bounded group KILL only to surviving same-identity owned members, and proves the
group absent before returning a sanitized failure. A single `child.kill`, detached
descendant, or unproved timeout cleanup is forbidden. The long-lived host-runner group is
separate and follows the terminal host contract below.

The opening/authentication executable sequence is exactly
`browser-native/open-about-blank` (`set-005`), direct source
`run-code/set-006-logger`, direct source `run-code/set-007-goto-login`, direct source
`run-code/set-008-resize`, two native `fill-secret` descriptors (`set-009`/`set-010`),
direct source `run-code/set-011-login-submit`, and direct source
`run-code/set-011a-bootstrap-auth-settled`. The direct registry entries own their complete
source; ordinary goto/resize/click actions do not invoke native CLI commands. The
native descriptors contain only the selector ref plus literal secret-name ref described
above, and their exact argv is validated immediately before spawn.

Direct source `run-code/set-006-logger` is installed on the blank original page before authentication,
fixture work, or application navigation. It owns shared state on the `BrowserContext`,
attaches the original page plus every existing page, and subscribes to
`context.on("page")` before any tab can be created. Each page receives one immutable
identity in creation order: `wf540-page-<positive>` plus a never-reused nonnegative
`tabIndex`. The original is exactly `wf540-page-1` / `0`; the related-cache tab is
exactly `wf540-page-2` / `1`.

The context and every instrumented page expose only the non-configurable readers
`__wf540PageIdentity`, `__wf540ReadAggregateChannels()`,
`__wf540ReadPageChannels()`, `__wf540ReadMediaGetCount()`, and
`__wf540ReadPreferenceWrites()`, `__wf540ReadPreferenceReads()`,
`__wf540ReadRelatedListGetCounts()`, and
`__wf540ReadRelatedEntryWrites()`, plus the private-authority-only auth-budget reader.
Channel readers return
frozen copies; callers cannot obtain or mutate the backing arrays/maps. The
BrowserContext-owned null-prototype `__wf540RouteLatches` and `__wf540Releases`
registries are likewise exposed read-only on the context and every instrumented page.
The same private authority owns a distinct null-prototype active-context-route
registry: every raw `page.route()` setup inserts its exact key before installation and
only its awaited unroute/finally removes it. The terminal cleanup builder reads a
frozen sorted projection of this registry after awaited `unrouteAll`; it is independent
of the native CLI wrapper registry queried by `route-list`.
The logger counts only requests whose method is `GET` and whose parsed pathname is
exactly `/admin/api/media`; substring, prefix, POST upload, `/media/:id`, and the route
worker's loopback backing fetch do not join the counter.

The preference-write reader is a separate bounded frozen sequence, not part of the
aggregate log schema. For browser-originated responses only, it accepts the exact
PATCH pathname `/admin/api/user-settings/customScreens.entry.preferences`, requires
the current page identity, locally compares `x-coderso-expected-user-id` to the
captured active user, and strictly parses the success response as exact
`{key:"customScreens.entry.preferences",value:{version:1,showFieldMetadata:boolean}}`.
It retains only
`{pageId,sequence,status,keyMatches,value,expectedUserIdMatches}`. It never
retains headers, bodies, cookies, or a CSRF value. `ru-053b` bounded-waits for exact
sequence `2`, status success, value `{version:1,showFieldMetadata:true}`, and user-A
match; `ru-059a` then bounded-waits for exact sequence `3`, status success, value
`{version:1,showFieldMetadata:false}`, and the same user-A match. The only earlier
browser preference write is `ru-046`. Thus the stale GET cannot
be released and the isolated durable read cannot run merely because the optimistic DOM
changed; the real browser PATCH response boundary must have settled first.

The preference-read reader accepts only browser-originated exact GETs for the one
preference key, uses the same recursive reject-unknown response schema, and retains the safe projection
`{pageId,sequence,status,keyMatches,value}`. `ru-105a` freezes its count before the A3
entry mount; `ru-106a` requires a delta of exactly one, success, exact key, and value
`{version:1,showFieldMetadata:true}`. Preference GET carries no expected-user header,
so the proof has no `userIdMatches` field and must not infer identity from one. The
combined `post-redirect-a-fresh-read-settled` observer instead emits
`activeUserMenuVisible:true` only after the exact
`S.userMenu(users.a.displayName)` has positive geometry in the current realm, alongside
the strict GET projection and scoped metadata effect. A cached/default/tombstone-only
render, an old-realm response, an isolated-context read, a hidden menu, or a reused
user-header assertion cannot satisfy that post-redirect proof.

Every isolated or browser durable preference read in the manifest uses that identical
recursive schema: outer keys exactly `key,value`; key byte-equal to
`customScreens.entry.preferences`; value keys exactly `version,showFieldMetadata`;
version exactly `1`; boolean value exactly the state declared by the action. No helper
may collapse this to a bare boolean before validation, accept unknown keys, or satisfy
a browser visible-effect assertion without the scoped Switch/badge geometry contract.

The related readers are likewise bounded frozen safe projections. The GET counter
accepts only browser requests whose method is GET and pathname exactly equals one of
the three fixture related-list paths, keyed by the exact captured slug; it excludes
loopback backing fetches and exposes integer counts only. `rc-012c` freezes the
positive related-B count after both real pickers settle, and `rc-030` requires the
same value and delta zero. The write reader accepts only p2's exact PATCH path for A1,
strictly parses the success response projection, and exposes only
`{pageId,method,pathMatches,status,idMatches,titleMatches}`. `rc-021a` requires p2,
PATCH, exact path, success, exact captured A1 ID, the updated fixture title, a
positive-geometry re-enabled `S.secondTabSave`, and no visible `Saving...` text before
p1 can be selected. Raw related response bytes stay in local authority state.

Its canonical aggregate output shape is exact and reject-unknown:

```json
{
  "aggregate": {
    "consoleErrors": [],
    "consoleWarnings": [],
    "pageErrors": [],
    "mediaGetCount": 0
  },
  "pages": [
    {
      "pageId": "wf540-page-1",
      "tabIndex": 0,
      "consoleErrors": [],
      "consoleWarnings": [],
      "pageErrors": [],
      "mediaGetCount": 0
    }
  ]
}
```

`pages` is ordered by `tabIndex`; the numeric count changes only with real matching
requests. After every scenario, `expectedAggregateLogReadCommand(channel)` and
`expectedPerPageLogReadCommand(channel)` are each executed for all three exact channels
`console-errors`, `console-warnings`, and `page-errors`. Both aggregate and every
then-registered page array must be `[]`; a clean original page cannot mask an error or
warning in the second tab. Duplicate instrumentation fails before adding a listener.
No later command may replace, redefine, remove, or alias these readers, registries, or
listeners; only an exact positive-registry route builder may add its declared key.

The logger also owns one private, bounded, append-only expected-auth-challenge event
ledger because it is deliberately installed before the first application request.
`AdminApp` performs an unauthenticated `GET /admin/api/auth/me` bootstrap on a protected
URL, and the owned route correctly returns HTTP `401`; Chromium reports that handled
network challenge as a resource-shaped console error even though the client resolves it
to the `unauthenticated` auth state. This exception is controlled by a closed phase
authority, not by matching arbitrary later `401` messages. Exactly these six phases may
arm and close seven named, single-use, cardinality-one tokens on `p1/0`:

- `set-007-goto-login` arms `initial-protected-bootstrap` immediately before navigating
  to Screens and `initial-login-document-bootstrap` only after the first token is
  consumed and before the full login-document bootstrap. It closes only after its own
  exact login URL/form settlement, with both tokens consumed once in that strict order
  and in two successive main-frame navigation epochs;
- `ru-040-bootstrap-signout` -> `ru-040a-bootstrap-signout-settled`;
- `ru-066-a-signout` -> `ru-066a-a-signout-settled`;
- `ru-076-b-signout` -> `ru-076a-b-signout-settled`;
- `ru-090-a-exit-signout` -> `ru-090a-a-exit-signout-settled`;
- `ru-102-b2-signout` -> `ru-102a-b2-signout-settled`.

The immutable token records its phase ID, `pageId`, main-frame navigation baseline,
and arm event sequence. One matching response may bind and consume it only while that
phase is armed; the response record must have the same `pageId`, method `GET`, full URL
byte-equal to `origins.admin + "/admin/api/auth/me"` with empty search/hash, status
exactly `401`, and a main-frame navigation epoch after the arm baseline and no later
than the closing settlement. Its immediately
correlated console record must be the next failure-channel event in the same page and
bound navigation epoch, have `message.location().url` byte-equal to that recorded full
response URL, and have text byte-equal to the one closed Chromium value
`Failed to load resource: the server responded with a status of 401 (Unauthorized)`.
No intervening unexpected response `>=400`, console error, warning, or page error may be
cross-paired. Each sign-out phase close requires exactly one consumed response/message
pair, while `set-007` requires its exact ordered pair of consumed tokens. An unused,
rebound, duplicate, reversed-epoch, late, cross-page, cross-epoch, or already-closed
token fails.

At log-read time only, one pure reconciler derives a filtered per-page projection from
those already-consumed pairs and recomputes the aggregate from that same projection;
it never mutates either ledger. All raw response/message proofs remain private. A `403`,
an unarmed or authenticated-phase `/auth/me` `401`, any other pathname or method, a
message with any prefix/suffix/case/newline drift, a userland `console.error` whose
location is not the exact response URL, an unpaired response/message, or any extra
console message remains in its original page and aggregate channel and fails the same
empty-array predicate. Diagnostics choose the first remaining unexpected event, never
the first historical quarantined response. This is not a listener reset, substring
allowlist, general HTTP-error suppression, or permission bypass; the already-declared
auth-rate ledger continues to count every unauthenticated `/auth/me` request.

The executor self-test executes the real pure reconciler and phase state machine. Its
negative matrix covers an unarmed/authenticated `401`, a second `401` for one token,
`403`, `POST`, media/Site-Vite/other-Admin paths, response without message, message
without response, cross-page and cross-navigation pairs, one response with two messages,
an intervening unrelated failure, every exact-text drift above, a userland spoof,
wrong-query and wrong-origin locations, warning/page-error preservation, unused/reused
tokens, ledger overflow, diagnostics
after a quarantined event, missing/duplicate/reversed initial epochs, both callback
orders, repeated idempotent log reads, and proof that private records never egress.

The first browser receipt is exactly sequence `1`, scenario `setup`, operation `open`,
route key `null`, the literal `open about:blank` command above, assertion name `null`,
sanitized output `true`, and `stdoutDiscarded:false`. The combined logger is exactly
sequence `2` with no intervening browser command: scenario `setup`, operation
`logger-install`, route key `null`, exact source `run-code/set-006-logger`, assertion name
`null`, sanitized output `true`, and `stdoutDiscarded:false`. No second logger-install
or listener-reset command is permitted.
Before `assert-media-cache-cold`, the positive command plan contains no Media Library,
MediaPicker, Custom Screen entry, cache mutation/event, Retry, reload, or force command.
This is enforced by the exact action-specific source-ID tuple set returned by the
contract helper's `buildProtectedMediaCommandRegistry(smoke)` authoring validator,
not by searching agent text for forbidden substrings. The executor never calls that
builder or switches on a tuple label; it receives only already-closed direct sources.

The executor-private evidence ledger stores this exact immutable shape for every locally
completed command:

```ts
type ExecutorEvidenceRecord = Readonly<{
  runnerVersion: 1;
  sequence: number;
  kind: string;
  scenario: string | null;
  operation: string;
  routeKey: string | null;
  assertionName: string | null;
  command: string;
  status: number;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutSha256: string;
  stderrSha256: string;
  stdoutTruncated: false;
  stderrTruncated: false;
  sanitizedOutput: string;
  pageId: `wf540-page-${number}` | null;
  tabIndex: number | null;
}>;
```

The runner captures at most 4 MiB for each raw stdout/stderr stream and fails closed on
either truncation; only `LOCAL_COMMAND_AUTHORITY` may retain an at-most-8-KiB excerpt
per stream alongside the full bounded bytes. Neither excerpts nor raw bytes join any
receipt, evidence projection, agent prompt, or artifact. Those private bytes are
secret-scanned, and are never sent to an agent or persisted in the changelog. SHA-256
is recomputed locally from those exact retained bytes; a returned digest or sanitized
summary is never accepted as authority. Canonical browser receipts derive route method
and fixture-expanded pattern from their registered tuple, add `stdoutDiscarded`, and
must carry a stable `pageId`/`tabIndex`; only a global `playwright-cli --raw list`
receipt may use both as `null`.

Every required visible assertion and route hit read has a same-scenario receipt whose
assertion name matches the structured assertion and whose sanitized output is produced
by its strict local parser. Credential-fill receipts retain the registered manifest's
literal symbolic `$ADMIN_*`/`$WF540_*` descriptor, set `stdoutDiscarded:true`, and use
the exact sanitized marker `[discarded]`; they never record expanded values. The
executor-private ledger separately binds that descriptor to the actual argv and
requires each credential argument to equal literal `ADMIN_EMAIL` or
`ADMIN_PASSWORD`, and each synthetic-email argument to equal its already captured
non-secret fixture string. It rejects a secret-corpus match in any argv element before
spawn. Before canonical evidence is built,
scan every browser command (including non-credential `run-code`) and sanitized output,
every runtime operation descriptor/output/subject identifier, every fixture ID/slug,
and every cleanup scoped identifier/probe. Reject raw secret assignments, cookie or
authorization headers, bearer/JWT values, opaque token/hash identifiers, credentials,
CSRF values, raw rows, and unredacted user data. Benign task prose that merely names
`token`, `cookie`, or `authorization` without carrying a value is not a finding.
The workflow parses the existing canonical-root `.env` into a private map without
output and selects values only through the frozen smoke-child-specific allowlists
above; neither the inherited map nor parsed map is spread/forwarded. No smoke host,
browser, runtime-operation, or Bun-bridge command recipe sources the file. The sole
full-validation exception for the separately owned local `bun run test` command is
pinned under **Validation and closure** below and cannot widen any smoke child. The
browser child instead receives the controlled secret-file environment described above. The
workflow builds an in-memory-only corpus from both inherited and repo credential/secret-like
keys, including `ADMIN_EMAIL`, `ADMIN_PASSWORD`, encryption/hash keys, and numbered
database/Redis/DSN URL encoded and decoded password components, generic secret-key
variables, and connection strings. Every evidence string above—including
browser operation/scenario labels and scenario IDs/viewports—is also checked for an
exact raw corpus value; neither map nor the corpus is ever placed in a prompt, receipt,
error, log, or persisted artifact. Every non-empty value classified by a secret-like
key joins the corpus; values shorter than six characters use boundary-aware matching
instead of being silently skipped. Every classifier result—including its non-canonical
`summary`, full-gate classification, and audit/fixer findings—is scanned before
forwarding. It can label a locally captured failure but cannot change a command, status,
byte count, hash, parsed observation, page identity, or fingerprint. Accepted audit
findings are projected with their fixed lens ID and rechecked before the complete ordered
set may enter a parseable orchestrator-intervention diagnostic. A rejected agent dispatch,
schema parse, or unsafe projection is replaced with a generic label-only error; its raw
error object/message never enters an aggregate failure, retry prompt, log, or artifact.
The evidence-audit prompt receives only the already validated canonical evidence object.
Route receipts use the exact operation labels `route-setup`, `route-hit-read`,
`route-release`, `unroute`, and `real-retry`; the contiguous sequence proves that
malformed routes are read/unrouted before retry and delayed routes are read,
released, then unrouted.

Every DOM/computed-style/geometry/ARIA/persisted-read assertion receipt uses operation
`visible-effect-assertion`, its exact scenario, route key/method/pattern all `null`,
`stdoutDiscarded:false`, and one non-null assertion name that occurs exactly once in
both receipts and that scenario's structured `visibleAssertions`. Its command is a
binding observation produced only by
`expectedVisibleAssertionCommand(smoke, assertionName)`. That workflow-owned builder
expands every target from the validated fixture projection and returns an exact command;
the runner rejects any byte difference. `validateVisibleAssertionOutput(smoke,
assertionName, output)` parses the real command bytes locally against
`VISIBLE_ASSERTION_CONTRACTS`. It never accepts an agent-authored observation.

Every non-special visible assertion output is reject-unknown with the exact top-level
keys `{ assertion, target, observations }`: `assertion` equals the receipt name,
`target` equals the fixture-expanded DOM/API identity owned by the contract, and
`observations` contains exactly the named fields below. No `pass` boolean exists. The
validator computes success from the observations and fixture state, including every
required absence/negative value. The tuple `(scenario, assertionName, command,
sanitizedOutput)` must be unique and the structured observed value must byte-match the
receipt output. Specialized cold-cache, media-count, delayed-route hit/release,
log-read, and screenshot receipts retain their separately pinned operations/builders.

A visible-effect assertion cannot be a constant return, echoed fixture value, no-op,
presence-only query, click/fill/goto, route command, screenshot, log read, or
CSS/transition source-string check. Its registered builder must read the target DOM,
computed geometry/style/ARIA, selected/focus state, request order, or authenticated
persisted response that owns the named effect. The exact output-field/predicate matrix
is:

`media-field-keeps-uuid` never expects the DOM to expose a media UUID. It requires one
unique positive-geometry visible title byte-equal to the captured fixture display
title and one canonical rendered `img.src` byte-equal to the captured fixture's safe
resolved URL; only the frozen fixture inventory maps those two observations to the
media fixture. A separate authenticated persisted read must contain the captured UUID
and no resolved-URL value. Missing DOM evidence cannot be replaced by an echoed
fixture ID, a hidden/data-attribute ID, or any fixture-value fallback.

Every Flow 6 related-list builder first resolves exactly one root through
`S.relatedListRoot()` for the declared retry, main-A, or main-B block ID, then queries
`[data-screen-related-entry]` only inside that root (the renderer-owned row anchor at
`ScreenRuntimeLeafBlocks.tsx:545` for the `cards` variant,
`ScreenRuntimeLeafBlocks.tsx:580` for the `activity` variant, and
`ScreenRuntimeLeafBlocks.tsx:604` for the default `list` variant). It records positive/zero bounding-box geometry
for the root-scoped row nodes, the root-scoped three `Chip` skeleton markers, and the
root-scoped exact `No related <target>.` empty node; the error path separately queries
only `S.relatedAlert` and its scoped Retry. Missing/duplicate roots or any page-wide
row/text query fails closed. In particular, `staleATextPresent` searches for
`relatedEntries.a1.updatedTitle` only under
`S.relatedListRoot(screen.blockIds.relatedListA)`: the RelationSelect may legitimately
retain that title elsewhere on the page and is outside this assertion's rendering
contract.

`relation-diff-exact` resolves the unique fixture-expanded RelationSelect root for A
and B separately and reads the current root-scoped checked option IDs after the
unsaved edits. Each reader enumerates every option in its unique picker root, rejects
duplicate/blank/non-UUID/unknown option IDs, and derives the checked set from that
complete enumeration; it may not query only the four expected fixture options. Those
DOM reads, not an authenticated persisted A/B read, supply `relationAAfter` and
`relationBAfter`. `rc-002` freezes the complete exact persisted reset draft and is the
sole authority for `relationABefore`/`relationBBefore`; both relation paths in the
post-unrelated-edit `rc-017` draft must still equal that reset baseline. As part of
freezing `rc-017`, its registered observation source captures the complete current
draft in the context-private immutable baseline store and proves that the exhaustive
`rc-002 -> rc-017` diff contains exactly the two declared intentional unrelated edits
(the note content path and selected field tone path), with neither relation path nor
any third path changed. Its public observation remains only the bounded canonical
content/presentation byte projections already required by
`unrelated-draft-byte-identical`.

At `rc-032`, the registered assertion source exhaustively walks the union of leaf
paths in the current draft and frozen `rc-017` draft, represents missing/added/removed
paths explicitly, excludes only the exact two declared relation paths, and returns all
remaining changed paths in stable lexical order as `otherDiffPaths`. It therefore
compares post-relation current state to the post-unrelated-edit baseline, not to the
pre-edit `rc-002` draft. It fails on duplicate/missing picker roots, an
unchecked/checked set mismatch, an added/removed/omitted draft path, missing or mutable
`rc-017` private authority, relation drift between `rc-002` and `rc-017`, or any
post-`rc-017` non-relation change. `rc-032` directly depends on the `rc-002`, `rc-017`,
`rc-030`, and `rc-031` receipts; ordinal adjacency is not accepted as a substitute.

Every Flow 7 preference-state receipt runs the same root-scoped visible-effect helper,
not merely a Switch or API check. It requires `S.metadata` to have positive geometry
and exact `aria-checked` equal to the expected boolean. Under
`screen.blockIds.headlineField`, authored `true` requires exactly one positive-geometry
`Editable` badge and one positive-geometry `Text` badge; under
`screen.blockIds.readOnlyField`, it requires exactly one positive-geometry `Read` badge
and one positive-geometry `Text` badge. Authored `false` requires all four exact scoped
locators to have count/visible geometry zero. Unbound or page-wide badges never count.
This helper is mandatory for state receipts `ru-047`, `ru-053`, `ru-053b`, `ru-058`,
`ru-059a`, `ru-062`, `ru-072`, `ru-082`, `ru-087`, `ru-095`, `ru-099`, `ru-106a`, and
`ru-108`, with expected values respectively
`true,false,true,true,false,false,false,false,false,false,false,true,false`; screenshot
preconditions reuse the immediately preceding state sample.

| Scenario / assertion                                         | Exact `observations` fields and locally checked predicate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button-image` / `persisted-no-empty-binding`                | `screenId`, `hrefBindingCount`, `hrefBindingField`, `emptyFieldCount`; exact main fixture Screen, one expected href binding/field, zero empty-field sentinels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `button-image` / `safe-link-front-url`                       | `tagName`, `href`, `pageUrl`; exact selected Button is `A`, href is the fixture-safe front URL, real activation reaches that URL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `button-image` / `unsafe-link-disabled`                      | `tagName`, `ariaDisabled`, `href`, `anchorCount`; `SPAN`, `"true"`, `null`, `0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `button-image` / `direct-image-safe-url`                     | `imageCount`, `src`, `placeholderVisible`; one `img`, exact resolved acquired-media URL, `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `button-image` / `missing-or-unsafe-placeholder`             | `imageCount`, `placeholderVisible`, `unsafeUrlPresent`; `0`, `true`, `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `button-image` / `media-field-keeps-uuid`                    | `selectedMediaTitle`, `selectedImageSrc`, `persistedMediaId`, `persistedResolvedUrlPresent`; the first two are the unique visible fixture display title and canonical rendered `img.src` mapped through the frozen fixture inventory, the persisted value is exact captured media UUID, and persisted resolved-URL presence is `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `tabs-content` / `three-tabs-persisted`                      | `tabIds`, `labels`, `slotIds`, `nestedText`; exact three unique fixture arrays and text after save/reopen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tabs-content` / `one-panel-visible`                         | `activeTabId`, `visiblePanelIds`, `visibleRects`; one expected ID and one positive-width/height rect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tabs-content` / `other-panels-zero-geometry`                | `hiddenPanelIds`, `hiddenValues`, `rects`; the other two exact IDs, all hidden, every width/height `0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `tabs-content` / `armed-slot-equals-active-tab`              | `activeTabId`, `armedSlotId`, `selectedTabId`; all three byte-identical in both activation directions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tabs-keyboard-aria` / `arrow-home-end-focus`                | `steps`; exact ordered ArrowLeft/ArrowRight/Home/End objects with `key`, `focusedTabText`, `focusedTabId`, `selectedTabId`, and `tabIndex`, each matching the expected roving result.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tabs-keyboard-aria` / `aria-reciprocal`                     | `pairs`, `visiblePanelId`, `hiddenPanelIds`; every exact tab/panel pair has reciprocal IDs, one visible expected panel, all others hidden.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tabs-keyboard-aria` / `nested-tabs-isolated`                | `outerRootId`, `innerRootId`, `outerSelectedId`, `innerSelectedId`; roots are distinct, outer is exact Overview/default[0], and inner is exact Tab 2/default[1] after the away/back isolation cycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `tabs-keyboard-aria` / `renderer-ids-unique`                 | `ids`, `uniqueCount`; exact 20-item unique ID array (`3 + 3` outer and `2 + 2` inner per realm) and `uniqueCount === ids.length` across builder and preview.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `space-selection` / `space-text-preserved`                   | `text`, `expectedText`; exact multi-word text including real Spaces is byte-identical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `space-selection` / `nested-controls-do-not-select`          | `linkActivated`, `inputFocused`, `selectedBefore`, `selectedAfter`; real nested controls work and selection identity is unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `space-selection` / `selection-handle-independent`           | `handleFocused`, `ariaPressed`, `selectedBlockId`, `defaultPrevented`; exact handle independently focuses/selects the fixture block and `defaultPrevented` is exact `false` because the source handler stops propagation but does not prevent default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `dirty-guards` / `builder-cancel-byte-identical`             | `draftBefore`, `draftAfter`, `urlBefore`, `urlAfter`; both byte pairs are identical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `dirty-guards` / `builder-confirm-navigates-once`            | `urlBefore`, `urlAfter`, `navigationCount`, `draftDiscarded`; URL changes to the registered destination exactly once and discard is `true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `dirty-guards` / `entry-cancel-byte-identical`               | `contentBefore`, `contentAfter`, `presentationBefore`, `presentationAfter`; both draft channels remain byte-identical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `dirty-guards` / `entry-cancel-url-stable`                   | `urlBefore`, `urlAfter`; byte-identical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dirty-guards` / `entry-confirm-navigates-once`              | `urlBefore`, `urlAfter`, `navigationCount`; exact registered destination and count `1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `dirty-guards` / `entry-error-retains-both-drafts`           | `errorVisible`, `contentValue`, `presentationValue`, `contentDirty`, `presentationDirty`; visible error, exact fixture draft values, both dirty flags `true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `dirty-guards` / `beforeunload-active`                       | `defaultPrevented`, `returnValueSet`; both `true` from a real cancelable `beforeunload`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dirty-guards` / `successful-retry-clears-persisted-channel` | Exact fields `persistedContentMatches`, `persistedPresentationUnchanged`, `localPresentationPreserved`, `contentDirty`, `presentationDirty`; content alone equals the successful Save response/server read and `persistedContentMatches === true`; server presentation remains byte-identical to its pre-draft baseline and differs from the intentional local draft, so `persistedPresentationUnchanged === true`; the local presentation draft remains byte-identical to its pre-retry dirty bytes, so `localPresentationPreserved === true`; `contentDirty === false` and `presentationDirty === true`. A `persistedPresentationMatches` field or claim that the presentation draft was persisted is forbidden.                                                                                                        |
| `related-retry-cache` / `related-error-visible-before-retry` | `rootId`, `errorVisible`, `retryVisible`, `rowCount`, `skeletonChipCount`, `skeletonRects`, `emptyVisible`; exact retry root, `true`, `true`, `0`, `3`, every skeleton-chip rect positive, `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `related-retry-cache` / `visible-retry-succeeds`             | `rootId`, `errorVisible`, `retryVisible`, `failureRowIds`, `failureRowRects`, `skeletonVisible`, `emptyVisible`; exact retry root, both flags false, IDs equal the sole dedicated failure fixture, every row rect positive, both fallbacks false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `related-retry-cache` / `same-target-visible-rows-retained`  | `rootId`, `rowIdsBefore`, `rowIdsPending`, `rowTextBefore`, `rowTextPending`, `rectsBefore`, `rectsPending`, `errorVisible`, `skeletonVisible`, `emptyVisible`; exact main-A root, IDs/text/rects byte-identical to the frozen pre-route baseline, rects positive, all three flags false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `related-retry-cache` / `target-switch-immediate-empty`      | `aRootId`, `bRootId`, `aRowCount`, `bRowCount`, `aEmptyVisible`, `bEmptyVisible`, `aSkeletonChipCount`, `bSkeletonChipCount`, `skeletonRects`; exact main roots, `0`, `0`, both empty nodes absent, exact `3`/`3` root-scoped chips with positive rects immediately after clearing A and before selecting warm B.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `related-retry-cache` / `stale-a-cannot-commit`              | `aRootId`, `bRootId`, `aRowCount`, `bRowIds`, `staleATextPresent`; exact main roots, `0`, exact B IDs, and `false` only under the main-A related-list root for `relatedEntries.a1.updatedTitle` after the updated-A response settles.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `related-retry-cache` / `only-b-rows-visible`                | `rootId`, `visibleRowIds`, `visibleRects`, `skeletonVisible`, `emptyVisible`, `bListGetCountBaseline`, `bListGetCount`, `bListGetDelta`; exact main-B root, exact B IDs, all rects positive, both fallbacks false, positive frozen baseline equals current count, delta `0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `related-retry-cache` / `unrelated-draft-byte-identical`     | `contentBefore`, `contentAfter`, `presentationBefore`, `presentationAfter`; both unrelated draft channels byte-identical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `related-retry-cache` / `relation-diff-exact`                | `relationABefore`, `relationAAfter`, `relationBBefore`, `relationBAfter`, `otherDiffPaths`; before arrays come only from the frozen exact-reset `rc-002` relation paths, after arrays come from the two current root-scoped checked-option sets, A goes exact IDs→empty, and B empty→exact selected IDs. `rc-017` first proves its complete post-unrelated-edit draft differs from `rc-002` at only the exact intended note-content and field-tone paths with no relation drift; the exhaustive union-of-paths non-relation diff of current draft against that frozen `rc-017` draft then leaves `otherDiffPaths` exact `[]`.                                                                                                                                                                                             |
| `related-retry-cache` / `flow6-exit-discarded-once`          | `url`, `navigationCountBaseline`, `navigationCountCurrent`, `navigationCountDelta`, `entryDirtyBadgeCount`, `presentationDirtyBadgeCount`; exact main records URL, baseline from `rc-017a`, current locally read after discard, `navigationCountCurrent - navigationCountBaseline === 1`, and both badge counts `0`; no absolute navigation-count constant may substitute.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `responsive-users` / `narrow-padding-and-positive-geometry`  | `samples`; exact 320/390/480 objects with open/closed padding `24px`, equal border boxes, positive content width.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `responsive-users` / `wide-padding-delta-300`                | `samples`; exact 1024/1280 objects with `32px`/`332px`, equal left/width border box, content delta within 1 px of 300.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `responsive-users` / `panel-inside-viewport`                 | `samples`; every declared viewport has `left >= 0`, `right <= viewportWidth`, positive width/height.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `responsive-users` / `user-a-b-a-isolated`                   | `userAFirst`, `userB`, `userAReturn`, `durableA`, `metadataEffects`, `userAReturnComputed`; exact `true`, `false`, `false`, `false`, plus matching true/false/false scoped effects. The B value/effect is read from the frozen `ru-072` sample; the returned-A value/effect is read directly in the current realm by `ru-082`, never reused from `ru-080` navigation or an earlier sample. `userAReturnComputed` is reject-unknown with exact keys `{theme,rootColor,bodyColor,toggleAriaPressed}`: theme is `"light"`, both computed colors are non-empty and match the established light sample rather than B's dark sample, and toggle aria-pressed is `"false"`. This proves B never inherited A's first value, A follows only its own later write, and the real `ru-081` toggle has a computed visible light effect. |
| `responsive-users` / `same-user-retained-view-pending`       | `visibleValue`, `durableA`, `readPending`, `metadataEffect`; exact non-default `true`, `true`, `true`, true scoped effect, distinguishable from cold default `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `responsive-users` / `same-user-authoritative-refresh`       | `before`, `server`, `after`, `metadataEffect`; exact `true`, `false`, `false`, false scoped effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `responsive-users` / `newer-local-write-pending`             | `visibleValue`, `newLocalValue`, `readPending`, `metadataEffect`; exact `false`, `false`, `true`, false scoped effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `responsive-users` / `newer-local-write-wins-refresh`        | `visibleValue`, `persistedValue`, `staleReadValue`, `metadataEffect`; exact `false`, `false`, `true`, false scoped effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `responsive-users` / `legacy-local-storage-absent`           | `key`, `value`, `writeCount`; exact legacy key, `null`, `0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `responsive-users` / `light-and-dark-computed`               | `userA`, `userB`; exact theme labels plus computed non-empty root/body colors, A light and B dark; the frozen `ru-072` B sample additionally has exact root-scoped `metadataEffect:false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `responsive-users` / `second-a-intent-visible-before-exit`   | `visibleValue`, `queuedIntent`, `firstWritePending`, `metadataEffect`; exact `false`, `false`, `true`, false scoped effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `responsive-users` / `user-b-default-before-release`         | `response`, `metadataEffect`; response exact `{key:"customScreens.entry.preferences",value:{version:1,showFieldMetadata:false}}`, false scoped effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `responsive-users` / `user-b-default-unchanged`              | `before`, `after`, `metadataEffect`; both responses use the exact schema/value false and the scoped effect remains false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `responsive-users` / `final-a-retry-converges`               | `visibleValue`, `persistedValue`, `writePending`, `unhandledRejectionCount`, `metadataEffect`; both values exact `false`, pending false, rejection count `0`, false scoped effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

The specialized exact outputs remain binding: the cold/cache, three critical-media,
and two media-count outputs declared below; `preference-a-write-hit-before-release =>
1`, `preference-a-write-hit-after-release => 1`, and
`queued-a-write-zero-dispatch => 0`; plus the two strict user-B response/effect objects
in the table. Media-list transport/fixture validation and one-row isolation remain
executor-private, source-bound preconditions of `bi-020-media-route-setup`; they add no
egress field to the generic route-hit/release receipts, which are accepted only after
those private checks have succeeded.
Unknown assertion names, missing/extra fields, wrong scalar types, target mismatch,
unregistered commands, or a failed negative predicate fail closed. Lexical token
presence is never observation authority.

Non-browser work has a parallel, contiguous `runtimeReceipts` sequence derived only
from the same executor-private ledger. Each receipt records a bounded operation, truthful
`operationDescriptor`, locally observed exit status, locally recomputed
`evidenceSha256`, optional non-secret subject kind/identifier, and at most 4096
characters of sanitized output. All critical authenticated Admin API, DB, and storage
setup/provenance/delete/absence operations run through this evidence runner. No agent
participates in operation selection or execution, returns an observation, or chooses a
hash; a later read-only audit may classify only the sealed canonical projection. A
runtime receipt never claims an unexecuted command and never hashes sanitized prose as
though it were authoritative bytes.
For a bridge-backed receipt, `operationDescriptor` remains the predeclared safe label
owned by that exact runtime/resource operation—not eval source, argv, env, stdin, SQL, or
raw output—and is accepted only after private authority has matched the actual executable,
source hash, env profile, process identity, exit status, and canonical I/O bytes to its
one bridge descriptor. Existing exact labels such as composite DB-plus-storage proofs do
not gain a conflicting `bun-bridge:*` alias. HTTP/session receipts remain Node-local and
cannot claim a Bun child; a bridge receipt cannot claim an HTTP method/path, cookie jar,
CSRF transition, or session context.
The primary sequence contains exactly one `host-runner-launch`,
`admin-health`, `front-health`, `fixture-setup`, and `host-runner-stop`; one
receipt for each bounded terminal/stable-absence audit-log, access-log, and session poll (the start baselines are
part of the private first sub-proof of the existing `set-001-storage-preflight`
receipt, alongside the setup/bootstrap and storage DB/root baselines);
`pid-lineage` plus `process-absence` per inventoried child; one `port-absence` per
port 3000/5173/5174; one `fixture-provenance` plus `entity-absence` per fixture;
and one `cleanup-absence` per cleanup-resource record, plus the proof-only bootstrap
compare-and-swap restore and complete-row proof. Host-runner receipts bind to the
recorded repo-owned runner PID, child receipts to `<kind>:<pid>`, port receipts to the decimal
port, and fixture/resource receipts to their exact non-secret ID/key. Session cleanup
resources use the task session row's exact non-secret database UUID—not a bounded
substitute label, session cookie, token/hash, CSRF value, or password hash. Literal
credential manifest references are allowed only in the exact discarded browser fill
descriptors, never in actual argv, sanitized output, or a runtime operation descriptor.
Actual credential-fill argv may contain only the two allowlisted literal secret names;
actual synthetic-email argv may contain only the captured non-secret fixture email.

The first-run wizard must never be completed by this smoke. `set-001` proves persisted
`setup.completed:true` before helper/browser startup; if a wizard nevertheless appears,
the realm fails closed because its presence contradicts that private preflight. No
wizard field, global setup setting, or product onboarding state may be mutated. Never
paste an expanded credential into a command, screenshot, task file, or closeout.
Evidence carries only the manifest's literal
symbolic `$ADMIN_EMAIL`/`$ADMIN_PASSWORD` descriptors and discarded marker; the
private execution binding carries only the corresponding literal names and proves no
secret value entered argv.

Create one uniquely prefixed fixture family (`wf540-<nonce>`) and record every
server-returned ID immediately in a fixture inventory: two active synthetic users
A/B with the existing Admin role, all four content-type IDs and safe generated slugs,
all five related-entry IDs, the editable entry ID, the six exact safe entry slugs, both
main/retry Screen IDs, and the media asset ID. These are the exact 15
`REQUIRED_FIXTURE_SUBJECT_KEYS`; acquisition,
separate provenance reads, and entity cleanup/absence must have identical subject-key
sets, while the 17 `CaptureRef` names additionally carry the media URL/key. The bootstrap password and
both synthetic-user password hashes derive from the loaded `ADMIN_PASSWORD`; the
value is never printed. Record IDs and generated fixture labels only. Provision
the content, media, both Screens, both materialized builder definitions, and records through real Admin
flows; capturing a POST response ID is acquisition evidence, while a separate
list/detail read proves provenance. Reuse the same fixtures for all seven flows and
reset authored state between flows. Audit-log, access-log, and session ownership is
exclusively the after-baseline, exact-four-User-Agent UUID-set contract defined above.
Once all task-UA traffic has stopped, freeze all three bounded stable UUID sets,
including null-user login/public and bootstrap log rows and any session created just
before failure; delete each exact `audit-log-task-ua`, `access-log-task-ua`, and
`session-task` UUID in canonical order and prove all three after-baseline sets stably
absent before users A/B may be removed. Pre-start, different-UA, and unrelated rows remain untouched.
Failure to reach quiescence blocks cleanup and closure.

The fixture setup pre-seeds the first flow through the existing authenticated Admin
flow/API without opening a browser media or entry consumer; direct DB-only creation is
not allowed for either Screen, the entry, media, or override. Its direct image block has one
`src` binding to an entry field containing a
canonical UUID that is distinct from every acquired media ID and intentionally has no
media row or storage object. The same block has exactly one persisted presentation
override, `propPath:"mediaAssetId"`, whose value is the acquired image UUID. The
acquired media detail/list read records its canonical safe URL; the missing bound UUID
is recorded as a non-entity fixture value and its exact row/storage absence is proven
at setup and cleanup. Both Screens are active and sidebar-visible; the main Screen owns
the visible records-workspace Admin link used to reach the first entry surface by real
Admin UI clicks after interception.
Neither fixture acquisition nor provenance may populate browser `media:list`.
The intercepted backing list may contain unrelated rows, but it must be bounded, carry
unique IDs, and contain exactly one strict row matching the acquired fixture. The browser
receives exactly `[acquiredRow]`; unrelated rows remain untouched in DB/storage and cannot
cause browser media fetches or count as smoke evidence.

Canonical evidence carries one strict, reject-unknown media-race projection:

```ts
type MediaRaceFixtureProjection = Readonly<{
  acquiredMedia: Readonly<{ id: string; canonicalSafeUrl: string }>;
  missingBoundMediaId: string;
  screenId: string;
  entryId: string;
  directImageBlockId: string;
  boundField: string;
  override: Readonly<{
    screenId: string;
    entryId: string;
    blockId: string;
    propPath: "mediaAssetId";
    mediaId: string;
  }>;
}>;
```

`acquiredMedia.id`, `screenId`, and `entryId` equal, respectively, the exact `media`,
main `screen`, and `editable-entry` fixture inventory IDs. The `retry-screen` ID is
distinct, is absent from every presentation override, and cannot satisfy
`mediaRace.screenId`. Both media identities pass the
canonical UUID predicate and are unequal; `missingBoundMediaId` equals no acquired
media ID. `canonicalSafeUrl` is byte-identical to the acquired media Admin response's
canonical root-relative safe URL. `directImageBlockId` resolves to one real `image`
block in that Screen; exactly one `src` binding for it names `boundField`; the editable
entry's exact persisted field value is `missingBoundMediaId`. The override object is
cross-bound to those same screen/entry/block/acquired-media IDs, and provenance proves
that it is the only persisted override in that `(screenId, entryId)` scope. Missing,
unknown, additional, duplicate, differently scoped, or non-identical projection values
fail before browser dispatch.

Canonical runtime evidence contains exactly one
`media-race-projection-provenance` receipt after fixture provenance and before the
browser flow. Its subject kind is `screen`, its subject identifier is exactly
`mediaRace.screenId`, its operation descriptor is exactly
`admin-api:media-race-projection`, and its sanitized output is exactly
`{"bindingCount":1,"overrideCount":1,"entryValueMatches":true,"safeUrlMatches":true}`.
Its exit status is `0`. The local evidence runner retains the bounded, redacted,
authoritative authenticated Admin response bytes, parses exactly
`{bindingCount,overrideCount,entryValueMatches,safeUrlMatches}` from those bytes, and
recomputes the receipt hash from the retained bytes. The sanitized four-key object is
only the canonical projection; an agent-supplied object/hash or a hash of that summary
cannot satisfy provenance. A missing, duplicate, differently scoped, differently
described, inferred, truncated, unparseable, or locally hash-mismatched observation
fails.

The absent bound UUID has two separately typed runtime receipts:
`media-race-missing-absence-setup` after fixture provenance and before browser flow,
and `media-race-missing-absence-cleanup` after exact cleanup. Each has subject kind
`media-race-missing-media`, subject identifier exactly `missingBoundMediaId`, a
truthful DB-plus-storage observation/evidence hash, operation descriptor exactly
`db+storage:missing-media-absence`, exit status `0`, and
sanitized output exactly `{"rowCount":0,"storageMatches":0}`. The setup receipt
proves no media mapping row and no canonical local file key whose exact basename stem
equals the UUID before interception; it does not infer an ID/key association. The
cleanup receipt independently repeats the DB-before -> stable scan 1 -> stable scan 2
-> DB-after sequence. Both DB reads must return zero and both scans must have identical
root identity plus sorted `{key,dev,ino,type,size,mode,mtimeNs}` entries under the
bounds above. The runner keeps raw settings, paths, names, manifests, query bytes, and
snapshot bytes only in `LOCAL_COMMAND_AUTHORITY` WeakMap state, recomputes hashes
locally, and exports only the sanitized two-key object. Neither receipt is a delete,
cloud-listing, task-object association, fixture row, agent-returned observation,
inference, truncated record, or hash of sanitized prose.

Provision A/B through the exact `user-provisioning-service` adapter. The direct
`runtime/set-012-user-a-create` and `runtime/set-014-user-b-create` handlers each own and
run one separate fixed `user-provisioning` Bun bridge descriptor; there is no combined
fixture command or persistent Bun setup process. Each descriptor's immutable source
imports the existing `createUser`, `getAdminRoleIds`, and `hashPassword` functions from
their fixed core modules. It calls `createUser` with deterministic non-empty names
`WF540 User A <nonce>` / `WF540 User B <nonce>`, unique
`wf540-a|b-<nonce>@example.test` emails, `status:"active"`, and the IDs from
`getAdminRoleIds()`; hashes the descriptor-env `ADMIN_PASSWORD` through the existing
`hashPassword` helper; and updates only that operation's returned user ID
`passwordHash`. `ADMIN_PASSWORD` is absent from this operation's stdin/argv/output and
from every other Bun bridge descriptor.
Fail before browser login if either ID, exact ID-scoped hash update, independent fresh
row proof, or canonical Admin role assignment is missing. Only after that proof may the
service acquisition be ledgered; cleanup remains exact-ID DB cleanup. Each bridge output
is identity-specific exact `{userId,userEmail}`. Only after both separate actions and
their proof actions pass may the Node fixture projection combine them as
`{userAId,userAEmail,userBId,userBEmail}`—never the password, hash, session cookie, CSRF
token, or full database row.

After provisioning, retain the generated non-secret emails in the single-assignment
fixture capture map; do not export them through a task shell. The manifest's symbolic
`$WF540_USER_A_EMAIL`/`$WF540_USER_B_EMAIL` references bind directly to those exact
safe strings, while every password reference binds only to literal secret name
`ADMIN_PASSWORD`. The exhaustive Flow 7 manifest is the sole command source for
A1/B1/A2/B2/A3 authentication. Every fill/click is byte-generated
from the exact `S.loginEmail`, `S.loginPassword`, `S.loginSubmit`, identity-specific
`S.userMenu(name)`, and `S.signOut` selectors, with its separate identity/signout
settlement observer. Signout/login uses full-page assignment and therefore creates a
new JavaScript realm; durable per-user and fresh-GET proof, not an old module map,
authorizes each return.

Executor-owned fixture/browser cleanup runs inside the same private
`executeTask540SmokePlan` call. On success, the exact seven terminal browser rows run
once and their final global session-absence observation is the last browser command.
On failure before that terminal matrix completes, the executor's single bounded
`catch/finally` cleanup releases/unroutes registered latches, closes and proves the
named session absent when it exists, and records every command it actually executes in
private cleanup diagnostics. Those diagnostics never become a replacement canonical
matrix or cross the fixed failure boundary. Exactly one executor cleanup authority
exists; there is no fallback, alternate runner, or agent path.

The canonical reverse-dependency sort is: the main override; zero to six exact
cleanup-discovered Entry SEO documents in their frozen stable discovery order; setting A/B; the main and
retry Screens; the editable entry and five related entries; the composite media-row-key;
the four content types; stable-polled task-UA audit logs; stable-polled task-UA access
logs; every acquired `session-task`; then users A/B. Every frozen after-baseline task-UA access-log row is deleted by its
exact UUID and proved absent before any referenced task session/user deletion.
After terminal traffic/context shutdown, the separate proof-only
`bootstrap-user-login-state` record restores the pre-existing bootstrap row's exact
`lastLoginAt`/`updatedAt` values only through the newest per-login-finally pair and the
locked nullable-safe compare-and-swap defined above. Fresh private reads prove the
complete user row and role tuples byte-identical to preflight; a concurrent mutation
makes the CAS affect zero rows and fails closed. It is never a delete subject and does
not join either staged cleanup-triple cardinality.
Alongside the entity inventory, keep one redacted cleanup-resource record for every
terminal-delta `session-task` row, plus `setting-user-a`, `setting-user-b`,
`presentation-override`, zero to six exact cleanup-discovered `seo-document-entry`
records (at most one per fixture Entry target), the single composite `media-row-key`, and one
`audit-log-task-ua` plus `access-log-task-ua` record per corresponding frozen
after-baseline row. Every `session-task`, audit-log, and access-log record uses
`identifierType:"db-id"` and its exact row UUID. Audit-log ownership records the exact
non-secret actor UUID or `null`; access-log ownership follows the exact
session-then-user-then-null rule defined above; every other kind follows the exhaustive
owner mapping in the ledger contract above. No identity-specific session kind exists
and no cleanup record stores an authentication credential.
Every other record contains only its non-secret DB ID, bounded composite key, or
storage key plus a bounded sanitized absence-probe result; it must never contain a
cookie, session token/hash, CSRF token, password/hash, raw row, or storage credential.
Use one record per acquired delete authority, so multiple presentation overrides
remain separately inventoried while the media lifecycle stays one composite authority.
Each `seo-document-entry` binds the exact tuple
`(seo_id,"entry",fixture_entry_id)`, is a child of that matching fixture Entry, and
receives its own exact DB provenance, delete, and absence operations before parent
cleanup. Zero discovered rows add no resource; a foreign target/type, duplicate,
overflow, ambiguity, incomplete inventory, or unstable discovery blocks all acquired
fixture Entries instead of authorizing a delete.
Each `presentation-override` cleanup selects exactly one of two fail-closed paths. If
the four-column row is present, cleanup performs one direct exact DB delete, requires
affected-row count one, and follows with the same four-column absence query. If the
normal smoke flow already removed it, the no-delete path is authorized only by the
ordered, identity-matched successful receipts and authoritative response hashes for
the acquired override, `ss-005-overrides-reset`, and
`ss-006-overrides-proof`; current-owner refresh must then prove exact zero cardinality.
Each of that resource's three P/C/A cleanup actions repeats the fresh exact
four-column absence probe and binds its evidence to those receipts. Cleanup phase 3
never calls the scoped replace API or relies on Screen/Entry/content-type cascade;
missing lineage, a surviving row, or ambiguous cardinality fails closed.
The `media-row-key` record privately binds the captured media
UUID and its exact captured storage key, has the sole media cleanup delete authority,
and invokes the real authenticated media DELETE exactly once by media UUID. Its
response-failure path never issues a second DELETE: it runs the exact DB/file probes;
complete absence proves the first request committed, while any surviving member is a
private cleanup failure requiring no broader fallback. Its
absence action then performs two distinct authoritative probes: the exact media DB row
is absent and the exact captured local-storage key is absent under the unchanged root
identity, then applies only the identity-safe empty-directory restoration defined
above. There is no separate storage cleanup resource and no second storage deleter.
An optional separately typed storage observation may be recorded only as
proof-only evidence with `deleteAuthority:false`; it is excluded from both staged
delete-subject sets, receives no three-action cleanup triple, and cannot issue
or authorize deletion. A separate authoritative list/detail query must prove every
exact entity and cleanup-resource identifier absent. Never truncate a table, delete by
prefix alone, or delete unrelated rows.

The scenario core does not expose or transfer the host-runner handle. The executor
spawns the repo-owned runner detached in its own process group and freezes the leader PID/PGID plus every
observed member's PID, PPID, PGID, and Linux process-start identity. Its private
outermost `finally` first re-inventories the group and rejects signalling if any member
is not in the retained repo-owned runner lineage. It sends `SIGTERM` to the negative owned PGID,
bounded-polls group absence, then—only for still-live same-identity owned members—sends
`SIGKILL` to that same negative PGID and bounded-polls again. A lone
`child.kill("SIGTERM")`, an unbounded wait, PID-only matching, or signalling a foreign
listener is forbidden. After stopping it, two stable observations prove every
inventoried PID/start identity and the PGID absent and prove no listener remains on API
`3000`, Admin Vite `5173`, or site Vite `5174`. Port 5174 is cleanup evidence even
though front health uses the proxied URL on port 3000.

One executor invocation fixes one nonce/prefix and starts browser authority at most
once. Even on interruption or schema failure, that same executor discovers only
resources already acquired under the fixed nonce, validates exact non-secret IDs/keys,
performs the one deterministic cleanup sequence, and proves fixture, storage, session,
task-UA audit/access-log, bootstrap-row restoration, process, and port absence while
retaining private diagnostics. It
records the real bounded operations under exact receipt labels
`executor-discovery`, `executor-identifier-validation`, `executor-exact-delete`,
`executor-absence`, `executor-host-runner-stop`, and `executor-port-probe`. On success those
receipts join canonical evidence; on failure they remain private and only
the optional exact post-cleanup active-action line plus the unchanged thrown
`{code:"task540_smoke_failed"}` may leave the module. Primary, cleanup, and host-stop
failures are retained together privately rather than masking one another. The failed
invocation never starts another prefix, host runner, browser session, or smoke attempt and
never delegates recovery to an agent or outer orchestrator.

### Deterministic delay and failure strategy

Install method-aware `page.route` handlers; the CLI shorthand route is not
sufficient because several paths support both reads and writes. Expand every
`<...>` placeholder from the recorded fixture inventory before execution and keep
the expanded command in closeout evidence. A deliberate application failure uses
HTTP 200 with malformed JSON (`"{"`) so it exercises the parser/retry path without
creating an expected browser resource-console error. A delayed stale-success
handler captures `await route.fetch()`, resolves its single response-captured signal,
and waits on its named release latch. Related-refresh and preference-read routes fulfill
that captured response unchanged and expose UI settlement. The media route first requires
HTTP `200` with exact JSON media type, validates the bounded/unique backing list and strict
task-owned row, and fulfills the inherited response with only that row as a JSON body
override. The
`preference-a-write-exit` route instead uses the abort-aware terminal described below
because real sign-out destroys the requesting realm. Count every matching request; an
unexpected duplicate fails the scenario rather than continuing to the backend. Every delayed-
success handler rewrites only the backing fetch origin to
`http://127.0.0.1:5173`, preserving the intercepted request's pathname, query,
method, headers, postData/body, and application-visible browser URL. Every delayed
`route.fetch` explicitly receives the original `request.method()`,
`request.headers()`, and `request.postData() ?? undefined`. It must not ask the Node
route worker to fetch `coderso-a.localhost` or change the backing request semantics.
Non-media success payloads remain byte-for-byte inherited. The media route's sole allowed
response delta is the strict one-row task-owned list projection above; it may not fabricate
or repair that row. This loopback rewrite is required because attempt 1 proved that Node
cannot resolve the browser-only hostname. The exact media list has no query, so its
expanded backing URL is `http://127.0.0.1:5173/admin/api/media`.

Malformed-JSON handlers are strictly one-shot: read and assert their hit count as
`1`, then remove the handler in a separate full CLI invocation **before** clicking
the real Save/Retry control. They never contain a pass-through retry branch while
installed. Delayed handlers also accept one request only. Ordinary delayed latch values
have exactly `readHits()`, `captured`, `fulfilled`, and `uiSettled`; the abort-aware
write latch instead has exactly `readHits()`, `captured`, `backingSettled`, and
`clientAborted`. The separate release registry function can only resolve the held gate.
A delayed `route-hit-read`
bounded-waits for `captured`, rejects timeout/duplicate signal/hit count other than one,
and outputs exactly `{"hits":1,"captured":true}` except for the two stricter
preference projections declared below. For media this generic output is valid only after
the private transport, fixture-cardinality, exact-row, and isolation checks have passed;
no raw response, row list, URL, or diagnostic text leaves that authority boundary. A
delayed `route-release` invokes
the release function, awaits `fulfilled`, awaits `uiSettled`, and crosses a real
two-`requestAnimationFrame` rendered commit boundary before outputting exactly
`{"released":true,"fulfilled":true,"uiSettled":true}`. Only then may a
post-release assertion execute; the route is removed afterward. Evidence records
`released:false` for malformed handlers and `released:true` only for delayed
handlers; every record has `hitRead:true`, and malformed records additionally have
`unroutedBeforeRetry:true`.

For `preference-a-write-exit`, `route.fetch()` must already have returned the exact
backing response and persisted the first A write before sign-out. The route then proves
the original client request aborted when the A realm was destroyed. During route setup,
before installing the route handler, the workflow installs one bounded
`page.on("requestfailed")` listener. The handler freezes the exact intercepted
Playwright `Request` object identity; the listener may satisfy its latch only for that
same object, exact PATCH method/path, and cancellation-class
`failure().errorText === "net::ERR_ABORTED"`. It ignores no matching duplicates: a
second match, a different error, timeout, or failure before capture fails closed. The
listener is removed by the exact unroute command and by the route registry's `finally`.
Its release command
terminally settles the held handler only after that object-identity latch, without delivering into B's realm, and outputs
exactly `{"released":true,"backingSettled":true,"clientAborted":true}`; it neither
awaits nor claims `fulfilled:true` or `uiSettled:true`. Exact hit `1`, queued-dispatch
`0`, and B's before/after `false` are separate binding assertions before unroute.
`clientAborted` must not be inferred from auth change, page navigation, realm identity,
`route.fulfill`/`route.abort` success or exception, or the absence of a UI update.

Preference-route setup also owns strict local request validation before any backing
fetch. `preference-a-read-refresh` accepts only an exact GET with absent body and its
hit projection is exactly
`{"hits":1,"captured":true,"method":"GET","bodyAbsent":true}`.
`preference-a-write-exit` accepts only an exact PATCH whose parsed JSON is deeply and
key-exactly `{value:{version:1,showFieldMetadata:true}}`, whose content type is JSON,
whose `x-coderso-expected-user-id` equals captured user A's ID, and whose
header selected by the private exact `security.csrf.headerName` is present and
non-empty. The route builder performs the lookup with that validated dynamic name;
neither `run-code/set-006-logger` nor any request logger/validator may hardcode a CSRF
header name or fall back to a conventional spelling. Its strict sanitized hit projection is
exactly
`{"hits":1,"captured":true,"backingSettled":true,"method":"PATCH","bodyMatches":true,"contentTypeJson":true,"expectedUserIdMatches":true,"csrfPresent":true}`.
Unknown body or projection keys, alternate values, missing headers, a raw body/header
dump, or any cookie/CSRF value in output fails closed; only these booleans may egress.

`related-a-refresh` has an equally strict captured-response boundary before its release
gate. It parses the backing body as an exact array of two EntrySummary objects, rejects
unknown row keys against the production EntrySummary allowlist, requires each `data`
object to have exactly the fixture `label` key, validates every optional nested
author/SEO/tags value when present, rejects duplicate IDs, and requires the exact
A1/A2 ID set. A1 must have `title === relatedEntries.a1.updatedTitle`; A2 must retain
its fixture title. Only
`{"hits":1,"captured":true,"rowCount":2,"rowIdsMatch":true,"uniqueIds":true,"updatedA1Matches":true}`
may egress. Thus the post-release stale-title absence is coupled to proof that the held
response actually contained the updated A1 value; malformed, old, extra, duplicate, or
unknown-key rows fail before target switching.

The two malformed-route real retries are the direct run-code registry entries
`run-code/dg-035-real-retry` and `run-code/rc-011-visible-retry`. Each owns its exact
strict-one locator source and direct one-layer result; neither is a native CLI click.

The first is the sole `real-retry` receipt for `entry-save-failure`: scenario
`dirty-guards`, method `PATCH`, fixture-expanded entry-save pattern, assertion name
`null`, sanitized output `true`, and `stdoutDiscarded:false`. The second is the sole
`real-retry` receipt for `related-first-failure`: scenario `related-retry-cache`,
method `GET`, fixture-expanded related-failure list pattern, assertion name `null`, sanitized
output `true`, and `stdoutDiscarded:false`. For each route the exact order is setup →
hit-read → required `visible-effect-assertion` receipt(s) → declared transient
screenshot → unroute → real-retry. The retry immediately follows unroute; every route
receipt carries the same exact route key/method/expanded pattern.

Validation rejects any selector or mechanism other than these exact registered sources,
including Save presentation, Save draft, Save changes, `has-text("Save")`, generic
`button:has-text("Retry")` or `button:text-is("Retry")`, a generic first matching
button, keyboard submit, dispatchEvent, evaluate/helper invocation, reload, or a second
retry. The related retry selector must be byte-identical in `S.relatedRetry`, the
manifest row, and `expectedRouteRetryCommand`; its destructive Alert scope and exact
`Related records unavailable` title prevent the presentation-media Retry from
matching. A successful backend retry or control-presence assertion cannot substitute
for the real visible button click.

The required intercepted attempts are:

| Key                         | Method and expanded path                                                                                                     | Mode / visible boundary                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `media-prior-resolution`    | exact pathname `GET /admin/api/media`, routed by `**/admin/api/media`; backing fetch `http://127.0.0.1:5173/admin/api/media` | after natural cold proof, validate the bounded backing list and exact acquired media row, project only that task-owned row into the UI cache, then delay the response from exactly one non-forced first entry mount; clearing the override exposes the distinct missing bound UUID, and that newer winner must survive release |
| `entry-save-failure`        | `PATCH **/admin/api/content/<TYPE_SLUG>/entries/<ENTRY_ID>`                                                                  | one malformed-JSON failure; dirty guard remains until real retry                                                                                                                                                                                                                                                               |
| `related-first-failure`     | `GET **/admin/api/content/<RELATED_FAILURE_SLUG>/entries`                                                                    | one malformed-JSON failure on the cold retry-only Screen; visible scoped related Retry                                                                                                                                                                                                                                         |
| `related-a-refresh`         | same exact A path                                                                                                            | delayed captured success; the already rendered A rows and their geometry remain visible while the route is pending                                                                                                                                                                                                             |
| `preference-a-read-refresh` | `GET **/admin/api/user-settings/customScreens.entry.preferences`                                                             | hold one same-user SPA remount read after the latest A value is shared-settled; that exact value may remain visible, then a newer local generation must win after release                                                                                                                                                      |
| `preference-a-write-exit`   | `PATCH **/admin/api/user-settings/customScreens.entry.preferences`                                                           | hold the first A write, queue a second A toggle, leave the old realm through real sign-out, authenticate B, then release; the queued A write must never dispatch and hit count stays `1`                                                                                                                                       |

The media route has a stricter binding sequence. While still on the Screen builder,
the `assert-media-cache-cold` receipt uses assertion name
`media-cache-cold-before-route`. Its command is exactly
`expectedMediaColdAssertionCommand(smoke)`, which reads `page.url()`, the real
`[data-screen-authoring-canvas="true"]` computed style/bounding box, `media:list`, and
the context logger. Its exact fixture-expanded output is
`expectedMediaColdAssertionOutput(smoke)`:

```json
{
  "builderUrl": "http://coderso-a.localhost:5173/admin/advanced/custom-screens/<SCREEN_ID>",
  "builderMarkerVisible": true,
  "localStorageAbsent": true,
  "mediaGetCount": 0
}
```

The intercepted backing response must be HTTP `200` JSON with a bounded, unique-ID
array containing exactly one row for the acquired TASK-540 media ID. That row must
match the captured canonical storage key and `/media/<key>` projection, upload title
and filename, PNG MIME/size/dimensions, empty optional metadata, and valid timestamp
and owner shapes. The route then fulfills the pending browser request with a
one-element copy containing only that verified row. This isolates the task-owned
MediaPicker cache from unrelated pre-existing media rows without allowing, consuming,
or suppressing any `/media/*` failure: the acquired PNG still loads through the real
backend delivery and storage path, and any failure of that task-owned URL remains a
zero-console-error smoke failure.

The URL must equal the canonical fixture Screen builder URL byte-for-byte and the real
builder marker must have positive geometry and visible computed display/visibility. A
cold receipt from the Screens list, another Screen, an entry surface, or a hidden marker
fails. It has scenario `button-image`, route key `null`, and
`stdoutDiscarded:false`.

Its immediately following receipt is `expectedRouteSetupCommand(smoke,
"media-prior-resolution")`. The next receipt is the real visible records-workspace
link click `expectedMediaRecordsWorkspaceCommand(smoke)` with operation
`records-workspace-navigation`; the next is exactly one real entry-link click
`expectedMediaFirstEntryCommand(smoke)` with operation `first-entry-mount`; and the
next is `expectedRouteHitReadCommand("media-prior-resolution")`. That hit read
bounded-waits for the one captured response and outputs exactly
`{"hits":1,"captured":true}` under assertion
`route-hit:media-prior-resolution`. These five receipts are consecutive, with no
command or receipt inserted between them. There may be no entry `goto`, reload,
prefetch probe, or second mount click before capture.

The first click above has operation `records-workspace-navigation`; the second click,
and only that click, has operation `first-entry-mount`. Both use scenario
`button-image`, route key `null`, assertion name `null`, sanitized output `true`, and
`stdoutDiscarded:false`. The route setup/hit receipts use scenario `button-image`,
route key `media-prior-resolution`, route method `GET`, and expanded route pattern
`**/admin/api/media`; their command strings must equal the fixture-expanded workflow
builders rather than merely contain the route key. The setup keeps the exact method and
pathname guards, duplicate guard, static loopback backing URL, original
`request.method()` / `request.headers()` / `request.postData()` forwarding,
non-configurable shared registry entries, and the four-member delayed latch. It captures
the response, privately validates/isolate its media payload, and resolves `captured`
exactly once before waiting for release; after release it awaits the inherited-response
fulfillment with the exact one-row JSON body override, resolves `fulfilled`, and permits the
release builder to establish `uiSettled` plus the rendered commit boundary. Duplicate
registry/setup/capture/fulfillment signals fail.

After the hit read, the critical operations are the complete direct source registry
entries `run-code/bi-024-prior-resolution`,
`run-code/bi-025-select-race-image`,
`run-code/bi-026-clear-presentation`,
`run-code/bi-027-newer-presentation`, and
`run-code/bi-031-stale-protected`. Their exact ref schemas bind the direct Image block
ID and acquired canonical safe URL from the strict `mediaRace` projection; refs supply
data only and cannot select source. The registry owns all DOM/geometry/cache-count
logic, and each source returns its strict one-layer JSON object directly. The source
bytes plus serialized non-secret refs are hash-bound before execution.

The `bi-024`, `bi-027`, and `bi-031` sources have route metadata `null` and
assertion names/strict sanitized outputs respectively:

```text
prior-media-resolution-pending => {"overridePresent":true,"imagePresent":false,"placeholderVisible":true,"mediaGetCount":1}
newer-media-winner-selected-pending => {"overridePresent":false,"imagePresent":false,"placeholderVisible":true,"presentationDirtyVisible":true,"mediaGetCount":1}
stale-media-result-ignored => {"overridePresent":false,"imagePresent":false,"placeholderVisible":true,"acquiredUrlPresent":false,"mediaGetCount":1}
```

The selection command uses operation `selection-handle-click`; the Clear command uses
operation `clear-selected-presentation`. Both have scenario `button-image`, route
metadata/assertion name `null`, sanitized output `true`, and
`stdoutDiscarded:false`. Their selectors are exact: the first is bound to
`mediaRace.directImageBlockId`, and the second matches the source label byte-for-byte.
No card-body click, picker remove button, dispatchEvent/evaluate helper, alternate text
selector, or constant output is accepted.

The validator enforces this exact consecutive critical sequence after the already
consecutive hit read: `prior-media-resolution-pending` → `selection-handle-click` →
`clear-selected-presentation` → `newer-media-winner-selected-pending` → transient
media screenshot → `media-get-count-before-release` → route release →
`stale-media-result-ignored` → `media-get-count-after-release` → unroute. Each adjacent
receipt has sequence delta `1`; no observation, click, route, or helper command may be
inserted or reordered. The stale command is the fifth command shape above but executes
only in its declared post-release position.

After the hit read, assertion `prior-media-resolution-pending` proves the
pre-seeded acquired-media override is still the selected winner, its first non-forced
resolution is held, and both route and logger counts are `1`. Then select the fixture
direct-image block through its visible selection handle and click the visible
`Clear selected presentation` button while the media response remains held. Do not
open the Media Library or picker dialog for this transition. The separate
`newer-media-winner-selected-pending` assertion must prove that the block no longer
has `data-screen-presentation-override`, has no `img`, renders the visible
`data-image-disabled="true"` placeholder, remains presentation-dirty, and is still
bound to the fixture's missing UUID while both counts remain `1`. This is the newer
winner; it is produced by the ordinary non-forced request-key change and reuses the
one pending `listMediaCached({force:false})` promise. Capture the declared
`_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png` transient screenshot only after both
pre-release assertions and before releasing the latch. A separate receipt named
`media-get-count-before-release` uses the complete direct source
`run-code/bi-029-media-count-before`
immediately after the transient screenshot and before release, with scenario
`button-image`, route key `null`, `stdoutDiscarded:false`, and sanitized output exactly
`1`.

Release through the separate complete direct source
`run-code/bi-030-media-release`. That source invokes the
context-owned release function, bounded-awaits both `fulfilled` and `uiSettled`, then
crosses its additional two-`requestAnimationFrame` rendered commit boundary before it
returns exactly `{"released":true,"fulfilled":true,"uiSettled":true}`. Only after
that command completes may `stale-media-result-ignored` prove the placeholder is still
visible, the acquired-media URL never appears in the block or page, and the exact-path
logger still reads `1`. Before unroute, repeat the exact counter-read command with
direct source `run-code/bi-032-media-count-after` in a distinct
`media-get-count-after-release`
receipt. It has scenario `button-image`, route key `null`, `stdoutDiscarded:false`, and
sanitized output exactly `1`; only then run direct source
`run-code/bi-033-media-unroute` in its own command.

The release and unroute receipts use the same scenario, route key, method, and expanded
pattern as setup, with operations `route-release` then `unroute`, assertion names
`null`, and `stdoutDiscarded:false`. Their sanitized outputs are respectively the exact
release-settlement object above and `true`. The validator byte-compares all four
fixture-expanded setup/hit/release/unroute builder results. Cache events, forced or
manual retries, a second route setup, and in-page cache/test seams have no registered
command in the protected interval and therefore fail closed.
Only after release, unroute, and stale-URL rejection may the now-warmed real UI open
MediaPicker or otherwise exercise the existing safe/missing/unsafe URL and media-field
UUID assertions.

The validator requires the strict order
`media-cache-cold-before-route < route-setup(media-prior-resolution) <
records-workspace-navigation < first-entry-mount <
route-hit-read(media-prior-resolution)` with exactly one receipt for each operation
and a sequence delta of exactly `1` between each adjacent receipt. It separately
requires the initial `open about:blank` receipt at sequence `1` and the one combined
logger at sequence `2`, with the exact metadata and commands declared above. It also
requires the exact hit output `{"hits":1,"captured":true}`, exact-path logger count
`1` before and after release through exactly one `media-get-count-before-release` and
one `media-get-count-after-release` receipt, both with operation
`assert-media-get-count`, the exact settled release output, one later `unroute`, the
pending/new-winner visible assertion, and the post-release stale-URL absence assertion.
It rejects missing or reordered
`prior-media-resolution-pending`, `newer-media-winner-selected-pending`, the transient
PNG, either exact-output counter receipt, or `stale-media-result-ignored`. The before
counter must be after hit-read and before release; the after counter must be after
release and before unroute. A hit `0`, duplicate hit, missing cold receipt,
non-exact cold JSON, or any entry/media consumer before route setup fails the attempt
and cannot be repaired by a probe.

From logger installation through the `media-prior-resolution` unroute, command
authority is the frozen positive action-specific source-ID tuple registry validated by
`buildProtectedMediaCommandRegistry(smoke)` during plan construction. Each tuple fixes source bytes,
operation, scenario, page identity, route metadata, assertion name, output parser, and
allowed count. Every receipt in that closed sequence interval must consume exactly one
registered tuple, and every required tuple must be consumed in its declared order and
cardinality. Unknown, duplicate, omitted, reordered, or metadata-mismatched commands
fail closed. There is no fallback lexical denylist: cache/counter/storage mutation,
listener replacement, registry/prototype mutation, Retry/reload/remount, Media Library,
test seams, early entry visits, or alternate winner transitions are rejected because
no registry tuple owns them. The only registry-defining commands are the exact one-time
`run-code/set-006-logger` and the exact fixture-expanded route setup; the only entry
mount is `expectedMediaFirstEntryCommand(smoke)` after
`expectedMediaRecordsWorkspaceCommand(smoke)`, and the only winner transition is
`expectedMediaClearPresentationCommand()` after captured hit-read.

All remaining route sources are binding contract-plan output; the executor may neither
substitute a similar handler nor accept externally expanded source text. The
`expected*Command(...)` notation in the following audit table is author-time contract
helper notation only: plan construction resolves every cell to its exact
`run-code/<action-id>` registry entry and proves bidirectional equality; no such
function/name/key switch exists in executor dispatch. The exact source/output table is:

| Route mode                            | Setup                                                                           | Hit read / exact output                                                                                                                                                                            | Release / exact output                                                                                                           | Unroute                                                                  | Real retry                                |
| ------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| malformed JSON                        | `expectedRouteSetupCommand(smoke, key)`                                         | `expectedRouteHitReadCommand(key)` / `1`                                                                                                                                                           | none                                                                                                                             | `expectedRouteUnrouteCommand(expectedRoutePattern(smoke, key))` / `true` | `expectedRouteRetryCommand(key)` / `true` |
| delayed visible success (media)       | `expectedRouteSetupCommand(smoke, key)`                                         | `expectedRouteHitReadCommand(key)` / `{"hits":1,"captured":true}`                                                                                                                                  | `expectedRouteReleaseCommand(key)` / `{"released":true,"fulfilled":true,"uiSettled":true}`                                       | `expectedRouteUnrouteCommand(expectedRoutePattern(smoke, key))` / `true` | none                                      |
| delayed related-A refresh             | exact related-A setup                                                           | strict related-A response hit builder / `{"hits":1,"captured":true,"rowCount":2,"rowIdsMatch":true,"uniqueIds":true,"updatedA1Matches":true}`                                                      | exact related-A release / `{"released":true,"fulfilled":true,"uiSettled":true}`                                                  | exact related-A unroute / `true`                                         | none                                      |
| delayed preference GET                | `expectedRouteSetupCommand(smoke, "preference-a-read-refresh")`                 | exact preference-read hit builder / `{"hits":1,"captured":true,"method":"GET","bodyAbsent":true}`                                                                                                  | exact preference-read release / `{"released":true,"fulfilled":true,"uiSettled":true}`                                            | exact preference-read unroute / `true`                                   | none                                      |
| delayed preference PATCH + realm exit | exact setup that installs the bounded `requestfailed` listener before the route | exact preference-write hit builder / `{"hits":1,"captured":true,"backingSettled":true,"method":"PATCH","bodyMatches":true,"contentTypeJson":true,"expectedUserIdMatches":true,"csrfPresent":true}` | `expectedRouteReleaseCommand(smoke, "preference-a-write-exit")` / `{"released":true,"backingSettled":true,"clientAborted":true}` | exact preference-write unroute plus listener removal / `true`            | none                                      |

The generic visible-success hit shape applies only to `media-prior-resolution`; related
A and the preference GET use their stricter hit projections. All three own
the ordinary four-member latch and follow the fulfillment/rendered-state boundary
described above. The media shape does not expose its verified row: its source-bound setup
must already have accepted the real backing transport and exact task-owned projection.
`preference-a-write-exit` owns
the separate abort-aware latch and never projects the old A response into B's realm.
All handlers guard exact method/pathname, reject a second hit, and retain the captured
backing response only in local authority state.

For non-media delayed routes, the setup constructs `backingUrl` from the intercepted
request URL and changes only `hostname = "127.0.0.1"` and `port = "5173"`; it forwards
the original method, headers, and `postData() ?? undefined` without changing protocol,
pathname, search, or body semantics. The media builder instead uses the exact static
loopback URL already declared. One-shot malformed handlers remain read and unrouted
before their exact source-labelled retry. Every setup, hit, release, assertion,
screenshot, unroute, retry, and route-list action is a distinct local-runner command.

Before releasing any latch, a separate full assertion command must prove the
pending/dirty/loading visible state and a separate screenshot command must capture it.
After each of the seven flows, the local runner executes both
`expectedAggregateLogReadCommand(channel)` and
`expectedPerPageLogReadCommand(channel)` for each of `console-errors`,
`console-warnings`, and `page-errors`. The aggregate reader must return the exact
reject-unknown `{aggregate,pages}` shape declared above, and the per-page reader must
return its exact `pages` array ordered by `tabIndex`; the selected channel is `[]` in
the aggregate and on every page. The receipts carry the scenario, the exact channel
assertion name, stable page identity where applicable, and locally parsed output. An
empty array from only the active/original page is never sufficient.

### Seven distinct visible-effect flows

1. **Button/image, light, 1280×900.** Insert Button from the visible Screen
   palette, bind a URL field, clear to the static `http://coderso-a.localhost:3000/`
   fallback, rebind, save/reopen, and read the saved definition to prove no
   empty-field sentinel. Activate the safe link and prove the front URL; an unsafe
   URL remains visibly disabled. Before any entry/media surface, observe the exact
   natural-cold assertion on the builder, install `media-prior-resolution`, traverse
   the visible records-workspace link with operation `records-workspace-navigation`,
   and mount the entry with the one receipted `first-entry-mount` click. The first
   non-forced media GET resolves the pre-seeded
   acquired-media override but stays held. The backing response is real and may contain
   ambient rows, while the browser/cache receives only the strictly verified acquired
   fixture row. Read hit `1`; select that direct image and
   use visible `Clear selected presentation` to expose its distinct canonical-but-
   missing bound UUID. While held, prove the new winner's visible placeholder,
   absent override marker/`img`, dirty state, and exact
   `media-get-count-before-release` output `1` under operation
   `assert-media-get-count`. Release, prove the acquired-media URL never commits over
   that missing winner plus exact `media-get-count-after-release` output `1` under the
   same operation, then unroute. Only afterward use the
   warmed real UI to apply a media UUID to a direct image and prove its resolved safe
   URL is the computed `img.src`; missing/unsafe
   winning IDs still show the placeholder. A media-field override must retain the
   exact UUID in MediaPicker selection and never receive the URL.
2. **Tabs content, dark, 1280×900.** Add exactly three Tabs, rename them to
   non-empty unique labels, insert distinct nested content into every panel through
   the visible active authoring target, save/reopen, and switch with real mouse
   input. Exactly one panel has non-zero visible geometry; the other two are hidden
   and have zero rendered geometry. The selected authoring tab and armed slot are
   the same identity in both directions.
3. **Tabs keyboard/ARIA, light, 1024×900.** Use ArrowLeft/ArrowRight/Home/End
   from real tab focus. After each key assert focused tab text, `aria-selected`,
   `tabIndex`, panel `hidden`, and reciprocal `aria-controls`/`aria-labelledby`.
   Mount nested Tabs plus a second renderer instance and prove IDs are unique and
   focus/selection stay root-scoped.
4. **Space and selection, dark, 1024×900.** Type a multi-word phrase with real
   Space input into contenteditable and read its exact text. Activate a nested safe
   link and input without selecting the wrapper; then focus and activate the
   explicit selection handle independently. Record `defaultPrevented`, focus, and
   selected block/section DOM state rather than control presence.
5. **Both dirty guards, light then dark, 1280×900.** In the builder, make a
   document/binding draft, attempt internal navigation, cancel and prove byte-identical
   draft/URL, then confirm and prove one navigation plus discarded state. In the
   entry editor make both content and presentation dirty, repeat cancel, then hold
   `entry-save-failure`; assert the visible error, retained values, active
   `beforeunload`, and blocked navigation, then read hit `1`, unroute in a separate
   command, and only then click the real Save control. A successful retry clears
   only the channels actually persisted, and confirm-discard navigates once.
6. **Related retry/cache identity, dark, 1280×900.** Trigger the one-shot
   `related-first-failure`, read hit `1`, assert the visible error and capture
   `_docs/_workflows/_smoke/task-540-wf540smoke-related-first-failure.png`, then unroute it and use the
   visible scoped related Retry to prove the dedicated failure row. Navigate to the
   main A/B switch Screen, prove both pickers warm, install `related-a-refresh`, then
   open a second tab in the same
   named browser session at
   `/admin/advanced/entries/<RELATED_A_SLUG>/<RELATED_A_ENTRY_ID>`, change one harmless
   authored value, and save through the real entry UI. That real mutation broadcasts
   the `entries:list:<RELATED_A_SLUG>` cache event to the still-mounted first tab and
   triggers the authoritative A refresh; return to the first tab before assertions.
   The held response is authoritative updated-A data produced after the awaited p2
   Save, not an old response. Before installing the route, freeze exact visible A row
   IDs/text/rects. During `related-a-refresh`, prove that pre-route visible baseline
   remains byte-identical while the updated-A response is held, with no replacement
   error or empty/loading canvas. Use two authored relation fields: A initially contains IDs
   while B is empty. Both real relation pickers load on mount, so B is intentionally
   warm before the switch. Clear A, prove the expected empty/loading transition, then
   select B through the real entry control and prove B is visible from the warmed
   cache. This changes the normalized target identity A→B without mutating the Screen
   document. Release the now-obsolete updated-A response and prove its exact updated A1
   title cannot replace B. The pre-existing unrelated
   content field and presentation draft remain byte-identical; the only content diff
   is exactly relation A cleared plus relation B selected. After the final B
   screenshot, exercise the real internal records navigation and visible discard
   confirmation, prove one records transition and no mounted dirty badges, and only
   then collect terminal logs; Flow 7 never inherits Flow 6 dirty state.

   The cache-event trigger is the mechanically consecutive frozen descriptor array
   `expectedRelatedSecondTabCommands(smoke)`. Its exact operation order and page
   identities are `related-tab-new` (`wf540-page-2`, `1`) → `related-tab-edit`
   (`wf540-page-2`, `1`) → `related-tab-save` (`wf540-page-2`, `1`) →
   `related-tab-save-settled` (`wf540-page-2`, `1`) → `related-tab-select-origin`
   (`wf540-page-1`, `0`). The builder fixture-expands the
   exact related-A entry URL, real edit-control selector, and harmless authored value;
   Save is exactly `click 'button:text-is("Save draft")'`; the separate settlement
   observer proves its exact PATCH response plus re-enabled control before return is
   exactly `tab-select 0`. Each is a separate local-runner invocation and byte-compared to its
   descriptor. No placeholder selector/value, direct cache event, page-local helper,
   `clearEntriesCache`, or `broadcastCacheEvent` is accepted. The six terminal Flow 6
   aggregate/per-page log commands, after release/unroute and both screenshots, must
   show empty error/warning/page-error arrays for both stable page identities; no
   contradictory mid-sequence log-read requirement is inserted after tab return.

7. **Responsive geometry and two users, light/dark.** Execute every resize below
   in order. At 320/390/480, open and closed computed right padding is `24px`, the
   scroller border box is unchanged, content width is positive, and the panel rect
   remains inside the viewport. At 1024/1280, closed/open right padding is
   `32px`/`332px`, border-box width/left edge stay fixed, and open content width is
   exactly 300 CSS px smaller within 1 px. User A enables field metadata and waits
   for the real PATCH. Navigate away through a real internal Admin link while clean,
   change A's server value through the scoped fixture path, return within the same SPA
   realm, and prove the real authoritative read replaces older `true` with server
   `false`. Through the real UI, write A back to non-default `true` and wait for the
   strict browser PATCH success projection before navigating away again. Install
   `preference-a-read-refresh` and remount the entry surface as A: retained `true`
   must remain visible while the captured stale-true GET is pending, which cannot be
   confused with cold default `false`. Make a newer local A toggle to `false`, wait for
   that real browser PATCH to persist, then release the stale `true` response and prove
   the newer local `false` wins by per-user write generation and an isolated A read.
   After real sign-out/sign-in, user B initially sees the server default and no A
   value; a real return to A restores only A's durable value. Finally hold the first
   `preference-a-write-exit` PATCH, issue the opposite visible A toggle so it is queued,
   and leave the old realm through real sign-out before authenticating B. After proving
   the A backing write settled and its original client aborted, terminally release the
   held handler without fulfillment into B's realm. Read hit count `1` before and after release, prove the queued A
   write never executes with B's session and B stays unchanged, then unroute and return
   to A. One fresh visible A toggle retries successfully and both current UI and durable
   server value converge without an unhandled rejection. Same-mounted A→B→A identity
   generations remain covered by the required Vitest hook suite because real auth
   redirects intentionally replace the realm. The `ru-082` isolation assertion also
   reads the post-`ru-081` theme label, toggle aria state, and computed root/body colors
   into its strict `userAReturnComputed` sample in that returned A realm; it may not
   reuse the earlier A-light or B-dark sample.
   Prove `coderso.screens.entry.preferences.v1` is absent throughout. User A is
   observed in light and user B in dark, with each theme asserted from computed
   root/surface colors. After the final durable A retry converges, capture the separate
   post-release `_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-converged.png` final screenshot;
   neither pending A nor pending B image may substitute for it.

   The preference write hit/queue assertions read the closure-backed route counter
   directly through complete direct sources `run-code/ru-088-hit-before-release`,
   `run-code/ru-097-hit-after-release`, and `run-code/ru-098-queued-zero`. Each source
   returns its numeric JSON value directly and owns its exact route-counter reader;
   no assertion-name literal selects code.

   All three use operation `visible-effect-assertion`, scenario `responsive-users`,
   nullable route metadata, `stdoutDiscarded:false`, and their matching assertion
   names. Their strict sanitized outputs are respectively `1`, `1`, and `0`. The
   first occurs after the route hit read and before release; the latter two occur
   after release and before unroute. No mutable counter, page-array seam, inferred
   queue length, or alternate route-hit command is accepted.

The five responsive resizes and light toggle/proof are complete direct sources
`run-code/ru-008-resize-320`, `run-code/ru-013-resize-390`,
`run-code/ru-018-resize-480`, `run-code/ru-023-resize-1024`,
`run-code/ru-028-resize-1280`, `run-code/ru-036-light-toggle`, and
`run-code/ru-037-light-proof`; they are not native resize/click commands. The proof
source executes DOM access only inside `page.evaluate`; direct `document` or
`getComputedStyle` access in the Playwright CLI Node VM is invalid. Its output parser
rejects unknown keys and requires exact `{dark:boolean,background:string}` with a
non-empty computed background string before binding the theme sample.

Every flow gets one final full-page screenshot; delayed/error flows also capture
their transient state. The 13 `browser-screenshot` descriptors and
`SCREENSHOT_PATHS` registry are the sole path/argv authority; each path is resolved
from the canonical runtime `root`, never copied from a hardcoded absolute shell
command. The exact 13 repo-relative paths remain the blueprint values already
set-equal to the screenshot action IDs above.

Record for each flow its ID, theme, viewport, linked expanded command receipts,
route hit counts, visible/geometry/ARIA assertions with bounded sanitized observed
outputs, all three empty console-error/console-warning/page-error arrays, and
screenshot path/size/SHA-256/device/inode.
Verify every file is a non-symlink PNG with the PNG signature and that all canonical
paths, `(device,inode)` identities, and hashes are distinct.
Assertions use computed style, bounding boxes, DOM/ARIA state, persisted server
reads, and request order—never mere control presence or CSS-string presence.
TASK-545's future manifest/evidence path is not a prerequisite.

Changelog 1252 is the durable TASK-540 smoke evidence record. Between the exact
markers below it stores one canonical, pretty-printed, redacted JSON object
containing browser receipts, runtime receipts, routes, fixtures/cleanup resources,
helper/PID lineage, screenshots, and scenario assertions. The workflow scans the
complete created changelog for the private value corpus, then requires the block to be
byte-identical to its in-memory validated evidence before the single status transaction
makes all twelve leaves, all seven children, and TASK-540 `✅ Done`. Until that transaction,
landed source leaves remain `🚧 In Progress` with `Implementation Complete` awaiting
family changelog 1252:

````text
<!-- TASK-540-SMOKE-EVIDENCE:BEGIN -->
```json
{
  "placeholder": "replaced by the validated canonical redacted evidence object"
}
```
<!-- TASK-540-SMOKE-EVIDENCE:END -->
````

These markers are TASK-540-specific closeout metadata, not the future generic
TASK-545 manifest contract. After any source repair or smoke rerun, closure replaces
this block with the newest validated canonical evidence before re-closing statuses.

Status closure is its own crash-atomic 21-target transaction and is not the later
five-file collaboration-terminal transaction. Before the first status or `Completed`
write, the fixed per-worktree Git-dir journal
`<gitDir>/coderso-task540-status-closure-v1` must durably record old/new bytes, modes,
hashes, fixed same-parent temp paths, and identities for these exact ordered targets:

1. the twelve leaves in land order `TASK-540-01-L01`, `TASK-540-02-L01`,
   `TASK-540-03-L01`, `TASK-540-04-L01`, `TASK-540-04-L02`, `TASK-540-04-L03`,
   `TASK-540-04-L04`, `TASK-540-05-L01`, `TASK-540-05-L02`, `TASK-540-07-L01`,
   `TASK-540-07-L02`, then closure leaf `TASK-540-06-L01` last;
2. the seven direct children in that same land order `TASK-540-01`,
   `TASK-540-02`, `TASK-540-03`, `TASK-540-04`, `TASK-540-05`, `TASK-540-07`,
   then closure child `TASK-540-06` last;
3. board parent `TASK-540`;
4. `_docs/_TASKS/README.md` last.

The journal inventory is exactly `status.manifest.json`, `status.prepared.json`,
`old-0.bin` through `old-20.bin`, `new-0.bin` through `new-20.bin`, optional
`status.committed.json`, and optional `status.rollback-prepared.json`.
`statusManifestCore` is exactly
`{branchSha256,generation,gitDirSha256,mode:"status-close",rootSha256,targets,transactionId,worktreeSha256}`.
Each ordered target is exactly
`{index,mode,newSha256,oldSha256,path,tempPath}` with indices `0..20`, one of the fixed
paths above, its original mode, raw old/new byte digests, and a deterministic
journal-derived same-parent temp path. `statusPreparedCore` is exactly
`{manifestSha256,newPayloadSha256s,oldPayloadSha256s,transactionId}`, where
`manifestSha256` equals the exact `statusManifestSha256` and both payload arrays are
exact ordered length-21 raw digests matching the targets.
`statusRollbackPreparedCore` is EXACTLY
`{manifestSha256,transactionId}`.
`statusCommittedCore` is exactly
`{boardNewSha256,manifestSha256,transactionId}`, with the same exact manifest hash. The
four exact envelopes are
`{...statusManifestCore,statusManifestSha256}`,
`{...statusPreparedCore,statusPreparedSha256}`,
`{...statusRollbackPreparedCore,statusRollbackPreparedSha256}`, and
`{...statusCommittedCore,statusCommittedSha256}`. They use only the
`status-manifest`, `status-prepared`, `status-rollback-prepared`, and
`status-committed` registry domains above and reject every missing, extra, reordered,
sparse, duplicate, or malformed field. All payload and marker files use the same
no-follow identity, `O_EXCL`, file-fsync, containing-directory-fsync, and bounded-byte
rules as the five-file terminal transaction.

Targets `0..19` are replaced/fsynced in order; the board target at index 20 is the sole
commit point and is renamed and parent-fsynced last. Before a valid prepared marker no
target write is legal. Restart applies the exact terminal-temp restart table to every
status temp. Exact old board hash rolls every target back to its journaled old bytes;
exact new board hash rolls every target forward to new bytes and writes a missing
committed marker only while `status.rollback-prepared.json` is absent. Presence of that
valid rollback marker overrides both normal decisions: either journaled board hash
forces convergence to all 21 old payloads, targets `0..19` first and target 20 renamed
and parent-fsynced last. Any third state, missing payload, unknown temp, mode/path/hash
drift, invalid marker, or partial identity fails closed with the journal retained. The
status journal and both payload generations remain intact through final closure-drift
and the later five-file terminal transaction.

Any audit, mechanical, gate, terminal-receipt, or other failure after status publication
must reuse that still-prepared 21-target journal. Before the first old-payload target
write, it creates `status.rollback-prepared.json` with
`O_EXCL|O_NOFOLLOW`, file-fsyncs it, and fsyncs the journal directory. It then restores
all 20 TASK-540 task files and `_docs/_TASKS/README.md` to the exact journaled old
generation, with target 20 (the board) last as the rollback commit point. A process
death re-enters marker-priority all-old convergence, never the normal board-new
roll-forward decision.

After every old target and mode/hash is stable-read and verified and every exact status
temp is absent, rollback cleanup is deterministic: identity-unlink
`status.committed.json` when present and parent-fsync; unlink
`status.rollback-prepared.json` and parent-fsync; unlink `new-20.bin` through
`new-0.bin` in descending order with a parent fsync after each; unlink `old-20.bin`
through `old-0.bin` likewise; unlink `status.prepared.json`, then
`status.manifest.json`, fsyncing after each; remove the proven-empty status-journal
directory; and fsync `gitDir`. Only after that full old-generation verification and
journal cleanup may the ordinary repair workflow add fresh pending evidence. No handler
may direct-write an individual status target, create a second status transaction,
retain a partial post-commit generation, or describe rollback as best-effort.
Termination mutants
cover rollback-marker creation/fsync, every reverse temp create/write/file-fsync/
rename/parent-fsync boundary for targets `0..20`, the board-last old commit, every
verification, every ordered cleanup unlink/fsync, journal rmdir, and Git-dir fsync.
On terminal success, the final mechanical gate verifies the committed new status
generation before both journals are identity-cleaned in their declared order.

The final cleanup plan contains exactly seven separate local-runner commands whose
operation starts with `cleanup-`, in the order below—no duplicate or extra
`cleanup-*` operations. Earlier preparatory theme/bootstrap/fixture steps use distinct
non-`cleanup-*` operation labels:

|   # | Operation                  | Exact command shape                                                                                                                            | Sanitized output                                                         |
| --: | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
|   1 | `cleanup-release-unroute`  | release every named latch, `await page.unrouteAll({behavior:"wait"})`, then require the authoritative context active-route registry exact `[]` | `true`                                                                   |
|   2 | `cleanup-route-list`       | session `route-list` (CLI-wrapper registry only)                                                                                               | `[]`                                                                     |
|   3 | `cleanup-console-errors`   | `expectedAggregateLogReadCommand("console-errors")`                                                                                            | exact `{aggregate,pages}`; errors empty on aggregate and every page      |
|   4 | `cleanup-console-warnings` | `expectedAggregateLogReadCommand("console-warnings")`                                                                                          | exact `{aggregate,pages}`; warnings empty on aggregate and every page    |
|   5 | `cleanup-page-errors`      | `expectedAggregateLogReadCommand("page-errors")`                                                                                               | exact `{aggregate,pages}`; page errors empty on aggregate and every page |
|   6 | `cleanup-close`            | session `close`                                                                                                                                | `closed`                                                                 |
|   7 | `cleanup-session-absence`  | global `playwright-cli --raw list`                                                                                                             | `true` after proving `wf540smoke` absent                                 |

The close and final global list are distinct invocations. Receipt 7 is executed by the
executor-owned local command authority, never supplied by an agent; it may normalize
the non-secret list result to boolean `true`, but it may not omit the command or infer
absence merely from a successful close. Before sealing success evidence, that same
private authority retains and independently parses the raw global-list observation
under `terminal-session-list`; the canonical `cleanup-session-absence` receipt must
derive from and cross-match that local observation byte-for-byte. It is the final
browser receipt overall, and no browser command or receipt may follow proven session
absence. No second browser-cleanup authority or replacement matrix exists. If failure
cleanup must execute close/list before the success matrix is complete, those actual
operations and hashes remain executor-private cleanup diagnostics and cannot become
canonical smoke evidence.

## Validation and closure

The displayed gate list is the binding `FULL_GATE_COMMANDS` input to
`runLocalCommandSequence(FULL_GATE_COMMANDS, { label })`; neither
a validation agent nor a closure agent executes these commands or returns their
outputs. The orchestrator local process runs them sequentially with the same 4 MiB
per-stream bound, retains raw bytes and bounded excerpts only in its
`LOCAL_COMMAND_AUTHORITY` WeakMap, recomputes both SHA-256 values, and fails closed on
timeout, spawn error, truncation, changed repository state, or an unaccepted exit
status. Each command is an exact executable/argv child of a fixed Node launcher that
self-stops as the detached group/session leader before spawn, receives the fresh strict
environment unchanged, and remains alive until it mirrors the command exit. After
identity binding and `SIGCONT`, the command runs in that same owned group/session; exact
`bun run test` therefore gains no workflow-added shell wrapper. The timeout adapter uses
bounded TERM, bounded KILL for same-identity survivors, then PID/PGID absence proof; a
signal to only the leader cannot satisfy the gate. Signalled command exits map
deterministically to `128 + signalNumber` (`255` only for an unknown signal). Bun, Node,
Git, and the repository-local TypeScript CLI are resolved to fixed absolute paths at
startup and bound to their requested/resolved file identities plus initial SHA-256
authority. Every identity is revalidated immediately before launch and again before the
stopped launcher receives `SIGCONT`; the user-owned TypeScript target additionally
rechecks its SHA-256 at both boundaries. Repository-local `tsc` runs as the pinned TypeScript target through pinned
Node, never through its PATH-dependent shebang; `bunx` materializes as pinned Bun with
`x --no-install`. System executables must be root-owned and not group/world-writable;
the sole user-owned target must remain under the exact repository-local TypeScript
package and pass its just-in-time hash recheck. Neither a command receipt nor any
agent-visible projection carries raw bytes or
excerpts; it exposes only numeric stdout/stderr byte counts, hashes, truncation flags,
and the command's start/end repository fingerprints. The sequence result additionally
has the exact authority projection
`{runner:"orchestrator-local-v1",start:{head,branch,worktreeSha256},end:{head,branch,worktreeSha256},unchanged:true}`.
An agent sees only the secret-scanned bounded projection and may classify a locally
observed failure; it cannot execute a gate, alter its status/output/hash/fingerprint,
or turn a non-pass into evidence. TASK-546 removed the prior TASK-522 finding; the
strict scan now has no exception and must exit zero with zero accepted findings.
Before the first displayed
command, the local runner opens the existing canonical-root `.env` with no-follow
pre/handle/post identity checks, fingerprints its bytes plus
`dev/ino/mode/nlink/size/mtime/ctime`, parses only those stable bytes, and later requires
the workflow baseline to match that exact initial fingerprint. It admits only the exact
repo process-control names `PATH`, `BUN_OPTIONS`, and `NODE_ENV` for centralized fixed-
value comparison; values identical to `HOST_FIXED_ENV` pass, different values fail, and
every other Bun/Node/package-manager/Git/SSH/loader/shell/proxy process-control key is
rejected. Ambient `CI` absent, `1`, or `true` always projects to fixed `CI=true`; every
other inherited `CI` value fails. It starts
from an empty null-prototype child map, and copies only the required/optional-present
names from `HOST_REQUIRED_INHERITED_ENV`, `HOST_OPTIONAL_INHERITED_ENV`,
`HOST_REQUIRED_REPO_ENV`, and `HOST_OPTIONAL_REPO_ENV`, then applies the exact
`HOST_FIXED_ENV` conflict rules. Every command receives fixed
`PATH=/usr/local/bin:/usr/bin:/bin` and `BUN_OPTIONS=--no-env-file`; it adds
`ADMIN_EMAIL` plus `ADMIN_PASSWORD` when
defined. It rejects unknown projected keys and never forwards either complete
environment map. Every displayed non-Git command except exact `bun run test` receives
only a fresh clone of that strict projection; Git receives only the smaller dedicated
environment below. A prior child cannot mutate the parent authority or widen a later
command. A live hermetic self-test proves both the parent Bun and a
nested Bun see the same exact projected key set and retain `--no-env-file`. Workflow
self-test modes use a fixed synthetic null-prototype repository environment and
synthetic private `.env*` projection; they do not read or parse the real repo `.env`.

All observational Git calls—including every validation `git diff --check` child—use
absolute `/usr/bin/git`, `--no-pager`, disabled
fsmonitor/untracked-cache, and a separate minimal frozen null-prototype environment
with fixed locale/PATH, `/dev/null` global config, disabled system config/optional
locks/prompts, and a nonexistent HOME. Diff capture also disables external diff and
textconv. Git never receives application secrets or the validation environment.
Repository/index/tracked/untracked context reads use no-follow opened handles with
pre/post handle and path identity checks; their fingerprints bind bytes plus
`dev/ino/mode/nlink/size/mtime/ctime`. Every TASK-540 status file included in an agent
prompt is decoded from the same stable reader and joins both context-sandwich snapshots
plus the immediate pre-dispatch authority check, even when the file is otherwise Git
clean. The exact Git index and all root `.env*`
projection (every root name beginning `.env`, bounded to 64 stable regular files) is
privately captured before and after every command and agent boundary,
before/after the one-shot smoke, and at terminal workflow exit; create/delete/rename,
content drift, or same-byte inode replacement fails closed without exposing names,
values, or hashes.

Exact `bun run test` is the sole full-`.env` consumer in `FULL_GATE_COMMANDS`. It is
still spawned only by the orchestrator-local authority, from canonical repo root, with
no agent execution path and no shell wrapper added by this workflow. Before spawn the
runner requires the current root `package.json` own script strings to equal this closed
map byte-for-byte:

```ts
const REQUIRED_TEST_ENV_SOURCE_SCRIPTS = deepFreezeExact({
  test: "set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun run test:bun && bun run test:vitest",
  "test:bun":
    "set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test --parallel=1 --timeout=15000 tests/unit tests/integration/routes tests/integration/runtime tests/integration/server tests/integration/store tests/integration/plugins tests/integration/analytics tests/perf tests/security",
  "test:vitest":
    "set -a && { [ ! -f .env ] || . ./.env; } && set +a && NODE_ENV=test vitest run --config vitest.config.ts",
});
```

Those exact strings authorize exactly three root-`.env` source operations: one in
`test`, one in its `test:bun` child, and one in its `test:vitest` child. The runner
requires all three operations to occur in that fixed parent/child order and rejects a
missing, additional, reordered, alternate-path, `test:full`, manual-source, or changed
script operation. Fixed inherited `BUN_OPTIONS=--no-env-file` disables Bun's implicit
dotenv discovery throughout that process tree, so only those three explicit shell
source operations may load `.env`. The full environment exists only inside that one owned process group
and dies with it; it is never copied back into local authority or reused by any later
command.

Before importing the smoke executor, the implementation orchestrator opens the one
canonical regular module with no-follow identity checks and requires the exact SHA-256
computed once from the final post-repair bytes. The recovery SHA
`75b89a07917b4030f9876f6670c5532a9153ca0415b639b36295ba2088293aaf`,
the stale recovered implement pin, and every historical receipt are forbidden as final
authority. The final task closeout replaces this paragraph's recovery wording with that
one computed hash. The orchestrator performs
exactly one literal dynamic import, requires the exact two-export surface, and repeats
the byte/identity check after import. Full validation binds that same executor authority
to its result; immediately before the single smoke call the current, imported, and
validated identities/hashes must all match. A mismatch fails before the one-shot latch
and never selects an alternate executor.

Immediately before the closure leaf's isolated settings-hygiene command and immediately
after it, then again immediately before the repository-wide test and after the last ordinary
full-gate command, identical baseline probes require exact persisted
`setup.completed:true`, `storage.driver:"local"`, and one non-empty
`storage.local.dir` row whose values equal the internal storage service. Each emits only
one SHA-256 over the sorted three `{key,value,updatedAt}` rows. The local authority
strictly parses each one-key JSON receipt and requires each bracketing pair to match; a missing,
malformed, non-zero, extra-key, or changed receipt fails before smoke without exposing a
setting value or path.

The same 4 MiB-per-stream bound applies to this exception. Only when the program is
exactly `playwright-cli`, after the repository and successful-process guards, may one
complete stdout that byte-equals an allowlisted two-key browser failure frame from the
closed auth-settlement, Tone-open, Tone-select, or dirty-navigation family be classified
without reading any field or matching the secret corpus; exact whole-frame equality
proves that no additional byte can carry a secret. The same bytes under every other
program remain non-exact and generic.
Every non-exact raw output and bounded excerpt remains private, is scanned against the
in-memory inherited/repo secret corpus, and any match is fully redacted locally before
the only permitted generic failure label can cross authority; neither raw nor redacted
excerpts are agent-visible.
No `.env` bytes, environment key/value, selected/unselected key name, map, count, hash,
corpus match, or environment-derived projection enters a receipt, evidence object,
prompt, changelog, or screenshot. Numeric command byte counts and locally recomputed
output hashes retain their ordinary gate meaning and do not authorize environment
evidence. All other commands remain strict-projection-only as stated above.

```bash
bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); if (!reachable) process.exit(1); process.exit(0)'
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bunx vitest run --config vitest.config.ts tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/admin/custom-screen-binding-contract.test.ts \
  tests/vitest/admin/custom-screen-block-style.test.ts \
  tests/vitest/admin/custom-screen-document-contract.test.ts \
  tests/vitest/admin/custom-screen-fixed-block-contract.test.ts \
  tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/admin/custom-screen-section-style-and-binding-gc.test.ts \
  tests/vitest/admin/custom-screen-stored-read-repair.test.ts \
  tests/vitest/admin/customScreensClient.test.ts \
  tests/vitest/admin/customScreensEntryOverridesClient.test.ts \
  tests/vitest/customScreens/screenDocumentOps.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts \
  tests/vitest/customScreens/customScreenService.test.ts \
  tests/vitest/customScreens/relatedEntryResolver.test.ts \
  tests/vitest/admin/entriesClient.test.ts \
  tests/vitest/admin/entriesClientReadAuthority.test.ts \
  tests/vitest/admin/entriesClientMutationReconciliation.test.ts \
  tests/vitest/admin/mediaClient.test.ts \
  tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/assistant/action-plan-schema.test.ts \
  tests/vitest/assistant/blueprint-binding-composer.test.ts \
  tests/vitest/assistant/catalogBlueprintEngine.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx \
  tests/vitest/ui/use-screen-entry-preferences.test.ts \
  tests/vitest/ui/use-screen-related-entries.test.tsx \
  tests/vitest/ui/custom-screen-entry-draft.test.ts \
  tests/vitest/ui/custom-screen-entry-presentation-media.test.ts \
  tests/vitest/ui/custom-screen-binding-panel.test.tsx \
  tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx \
  tests/vitest/ui/custom-screen-records.test.tsx \
  tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui/custom-screen-editor-draft-and-save.test.tsx \
  tests/vitest/ui/custom-screen-editor-hydration-authority.test.tsx \
  tests/vitest/ui/custom-screen-editor-visit-authority.test.tsx \
  tests/vitest/ui/custom-screen-list-view-canvas.test.tsx \
  tests/vitest/ui/custom-screen-route-params.test.ts \
  tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx \
  tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx \
  tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx \
  tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx \
  tests/vitest/ui-integration/screen-editor-sections.test.tsx \
  tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx \
  tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-presentation.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-layout.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/widgets/screenWidgets.test.tsx \
  tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/integration/routes/userSettingsAccessLogHarness.test.ts \
  tests/integration/routes/cors.test.ts \
  tests/integration/routes/customScreensRoutes.test.ts \
  tests/integration/routes/customScreensDefinitionIntegrityRoutes.test.ts \
  tests/unit/assistant/actionExecutorService.test.ts \
  tests/unit/assistant/actionExecutorCustomScreens.test.ts \
  tests/unit/assistant/actionExecutorPages.test.ts \
  tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts \
  tests/unit/assistant/actionExecutorForms.test.ts \
  tests/unit/assistant/actionExecutorMenusAndSeo.test.ts \
  tests/unit/assistant/actionExecutorContentUpdates.test.ts \
  tests/unit/assistant/actionExecutorAutomationBlueprints.test.ts \
  tests/unit/assistant/actionExecutorIdempotencyAndSiteKit.test.ts \
  tests/unit/assistant/actionExecutorCatalogBlueprints.test.ts \
  tests/unit/assistant/actionExecutorSupportingPageLinks.test.ts \
  tests/unit/assistant/actionExecutorDetailPages.test.ts
node --check _docs/_workflows/task-540-test-name-contract.mjs
node _docs/_workflows/task-540-test-name-contract.mjs --mode=self-test
node _docs/_workflows/task-540-test-name-contract.mjs --mode=final --family=all
node _docs/_workflows/task-540-implement.mjs --check-l02-assistant-split
node _docs/_workflows/task-540-implement.mjs --check-l04-page-split
bun --cwd core --eval 'import { createHash } from "node:crypto"; import { inArray } from "drizzle-orm"; import { db } from "./db/client.ts"; import { settings } from "./db/schema.ts"; import { getStorageSettingsInternal, resetStorageSettingsCache } from "./services/settings/storageSettings.ts"; const keys = ["setup.completed", "storage.driver", "storage.local.dir"]; const rows = await db.select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt }).from(settings).where(inArray(settings.key, keys)).orderBy(settings.key); const byKey = new Map(rows.map((row) => [row.key, row])); if (rows.length !== 3 || byKey.get("setup.completed")?.value !== true || byKey.get("storage.driver")?.value !== "local" || typeof byKey.get("storage.local.dir")?.value !== "string" || byKey.get("storage.local.dir").value.length === 0 || Object.hasOwn(process.env, "MEDIA_STORAGE") || Object.hasOwn(process.env, "MEDIA_DIR")) process.exit(2); resetStorageSettingsCache(); const storage = await getStorageSettingsInternal(); if (storage.driver !== byKey.get("storage.driver").value || storage.localDir !== byKey.get("storage.local.dir").value) process.exit(2); const baseline = rows.map((row) => ({ key: row.key, value: row.value, updatedAt: row.updatedAt.toISOString() })); process.stdout.write(JSON.stringify({ baselineSha256: createHash("sha256").update(JSON.stringify(baseline)).digest("hex") })); process.exit(0)'
bun run test
bun run precommit:check
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
# Must exit zero with zero accepted findings; no allowlist or inherited exception.
bun run scan:security:strict
bun test tests/unit/workflows/task540SmokeExecutorSecurity.test.ts
node --check _docs/_workflows/task-540-smoke-contract.mjs
node _docs/_workflows/task-540-smoke-contract.mjs --self-test
node --check _docs/_workflows/task-540-smoke-executor.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node --check _docs/_workflows/task-540-smoke-host.mjs
node _docs/_workflows/task-540-smoke-host.mjs --self-test
node --check _docs/_workflows/task-540-codex-agent-bridge.mjs
node _docs/_workflows/task-540-codex-agent-bridge.mjs --self-test
node --check _docs/_workflows/task-540-local-orchestrator.mjs
node _docs/_workflows/task-540-local-orchestrator.mjs --self-test
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
git diff --check
bun --cwd core --eval 'import { createHash } from "node:crypto"; import { inArray } from "drizzle-orm"; import { db } from "./db/client.ts"; import { settings } from "./db/schema.ts"; import { getStorageSettingsInternal, resetStorageSettingsCache } from "./services/settings/storageSettings.ts"; const keys = ["setup.completed", "storage.driver", "storage.local.dir"]; const rows = await db.select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt }).from(settings).where(inArray(settings.key, keys)).orderBy(settings.key); const byKey = new Map(rows.map((row) => [row.key, row])); if (rows.length !== 3 || byKey.get("setup.completed")?.value !== true || byKey.get("storage.driver")?.value !== "local" || typeof byKey.get("storage.local.dir")?.value !== "string" || byKey.get("storage.local.dir").value.length === 0 || Object.hasOwn(process.env, "MEDIA_STORAGE") || Object.hasOwn(process.env, "MEDIA_DIR")) process.exit(2); resetStorageSettingsCache(); const storage = await getStorageSettingsInternal(); if (storage.driver !== byKey.get("storage.driver").value || storage.localDir !== byKey.get("storage.local.dir").value) process.exit(2); const baseline = rows.map((row) => ({ key: row.key, value: row.value, updatedAt: row.updatedAt.toISOString() })); process.stdout.write(JSON.stringify({ baselineSha256: createHash("sha256").update(JSON.stringify(baseline)).digest("hex") })); process.exit(0)'
```

The `canConnect` command is a mandatory `select 1` preflight and its explicit
`process.exit(0)` prevents imported runtime handles from hanging the gate. If it
fails, do not run/claim DB closure until connectivity is restored. Rerun every
named failing Vitest file once with `bunx vitest run <exact-file>` and every Bun
file once with `bun test <exact-file>` before classification; after any fix,
rerun the failed parent command, and rerun full `bun run test` plus
`bun run precommit:check` whenever source/tests/docs change after their pass.

Immediately before any TASK-540-06-L01 preparation or repair resume, record a content
hash for all 81 source-owner/read-only matrix files (including both Entry navigation
suites, all twelve R01 Assistant executor suites, and the L04-repaired whole-file hash
of `tests/vitest/ui-integration/screen-editor-sections.test.tsx`) plus every non-test
support owner covered by the line gate. Refresh that
source-owner baseline only after an exact earlier
source-owner repair passes its matching re-gate, then compare the retained map after
closure; every hash must be byte-identical. Hash the closure-owned aggregate suite
separately at `runClosure` entry and compare it after status closure. The
closure-attributable test patch may contain only
`tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx` plus the exact
state-isolation-only changes in `tests/unit/settings/settingsService.test.ts` and
`tests/unit/settings/storageSettings.test.ts`, and the exact successor workflow-security
changes in `tests/unit/workflows/task540SmokeExecutorSecurity.test.ts`; earlier
source-leaf changes can still appear in the overall working-tree diff and are not
misclassified as closure edits. While changelog 1252 is absent, preserve every landed
descendant as In Progress with its current exact leaf gate receipt and no Completed
field, keep the closure leaf/direct child and root In Progress, and keep any genuinely
unlanded descendant To Do;
then discover exactly zero or one `_docs/_CHANGELOG/1252-*.md`, reject duplicates, and
create or reuse the fixed safe path above. Require exactly one `Tasks:` metadata line
whose parsed IDs are the exact unique ordered set pinned above; reject missing,
duplicate, reordered, or additional IDs. Before any status mutation, write and
byte-verify the changelog-index anchor plus canonical evidence block containing the
strict generation, baseline, path, evidence hash, and hashed-gate control manifest. The subsequent pending transition
persists identical Closure Pending, Closure Board Baseline, and Closure Changelog Path
receipts on the root/closure parent/leaf. A validated restart requires all three to match
the independently owned control even if the changelog file must be restored at the same
pinned path. Run the complete full validation now, before final family closure. Only
after it passes, all twelve leaves have current exact gate receipts, all 20 contracts are
still In Progress, and changelog 1252 already byte-covers the exact 20-ID Tasks line may
the status-stage transaction record the exact evidence SHA-256/generation while
preserving the identical Closure Board Baseline and Closure Changelog Path; prepare
twelve leaves, then seven children, then TASK-540, and atomically publish all Done/Completed
fields plus the board-statistics delta. Run exactly one final agent-backed
closure-drift pass now; a
finding first triggers the universal marker-priority all-old status rollback, then may
enter the pinned ordinary repair path only after complete verification and cleanup.
After that pass's last clean result,
permanently freeze collaboration dispatch for the generation, root-review every actual
result/task correlation, build the exact complete safe projection and terminal receipt,
and atomically persist/byte-verify them in both durable closure authorities plus the
three matching task evidence receipts before any run-ledger cleanup. No agent call is
legal after that freeze. A read-only local mechanical graph gate then verifies all
statuses/tables, evidence, the deterministic board-statistics delta, unique 1252 index
row, the exact persisted complete collaboration-ledger projection and both
pre-closure/terminal count-hash pairs, every later dense request/procedure entry, the
root-reviewed spawn/fork/timeout-only-interrupt attestations, and the non-null terminal
receipt. The root then repeats that transcript-correlation review; only both passes
permit identity-bound local ledger cleanup. It then reruns the
exact task-infrastructure
`node --check`/`--self-test` commands displayed above plus the
implementation-orchestrator checks and `git diff --check`. Any status-stage,
mechanical-gate, final-audit,
or final-gate failure creates/fsyncs `status.rollback-prepared.json`, restores any
terminal transaction with the changelog index last, and then restores the complete
20-task-plus-board old status generation from the still-prepared journal with the board
last. Ordinary repair starts only after all 21 old bytes/modes/hashes and journal
cleanup verify. Process death is recoverable only for the
bridge-owned request/ledger/fixed-journal artifacts and the two journaled closure
transactions described here. Restart makes no claim to recover collaboration APIs,
arbitrary repository mutation, DB/application fixtures, browser/server state, or OS
state outside those identity-bound artifacts; it fails closed until root procedural
review and the existing independent cleanup proofs complete. Do not close with a failed/skipped DB preflight,
functional gate, runtime flow, fixture cleanup, or open child. The strict scan must
run without suppression and exit zero with zero accepted findings. TASK-546 removed the
historical TASK-522 Semgrep finding; any finding, scanner/tool failure, exception,
allowlist, or non-zero result blocks closure.

Every closure status dispatch captures the exact pre-dispatch Pending/Evidence/
Generation/Baseline/Path/gate projection. Failure rollback restores that projection,
never a partially mutated post-failure value. Pending restart accepts Evidence and
Generation only when both are absent on all three closure contracts or present with one
identical well-formed value on all three. `Repair Pending` is rejected from every root or
parent and every terminal contract; gate receipts are rejected on the root and
TASK-540-06 parent. Board and changelog-index mutation guards compare unrelated-byte
projections after success and failure. Repository snapshots also compare hashes of
every root `.env*` file (including non-dot suffixes) without logging its value,
name, or hash.

After a final-drift source repair and its fresh gate, the pre-repair durable Pending
projection is explicitly invalidated before any recapture assignment. If that recapture
fails, the workflow establishes and verifies a new Closure Pending projection from the
current repaired graph before propagating the error; the outer failure handler can
therefore restore only the current projection and can never roll back the repaired gate
or canonical `Implementation Complete`. A hermetic workflow self-test must force this
recapture failure, prove the stale projection is unreachable, and prove the newly
established projection is retained.
