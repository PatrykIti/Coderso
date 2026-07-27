# TASK-540-06: Tests, Smoke, and Closure

# FileName: TASK-540-06-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Testing / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-540-01..05
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Fix Started:** 2026-07-15
**Modularity Repair Revalidated:** 2026-07-17 — eight source-owner modularity repairs and exact gates passed.
**Historical Implementation Complete:** 2026-07-16 — the then-assigned closure work was
complete, but the later live-smoke repair superseded this as current completion
authority. It cannot satisfy a current-state predicate.
**Current Closure Repair Started:** 2026-07-23
**Current Closure Repair State:** The owner-directed behavior-preserving modularization
of the smoke executor and scenario infrastructure is **complete** and no longer blocking;
it took no new hardening, product change, runtime diagnosis, or smoke retry. Checkpoints
`f22eee9f` through `8259a326` extracted the shared observation/visible-assertion sources,
all seven scenario owners and the simple browser invocations; a further 111 commits ran
from `8259a326` to `c89fa96c` (`git rev-list --count 8259a326..c89fa96c`), of which
`b8170be1` moved the executor self-test body out of the facade entirely. Re-measured with `wc -l` at HEAD `a68a19e0` on 2026-07-27,
every facade and child owner is at most 1,000 physical lines: executor facade 976,
`task-540-smoke-contract.mjs` 13, `task-540-smoke-host.mjs` 84, largest of the 162 child
modules under `_docs/_workflows/task-540-smoke/**` 964, none above the limit. Remaining
order: targeted/full gates -> helper restart -> exactly one canonical seven-flow
Playwright CLI smoke with 13/13 screenshots and deterministic cleanup ->
changelog/status closure -> integration into `feat/implementations`.
**Current Codex Collaboration Directive:** 2026-07-24 — all remaining review and repair
uses Codex collaboration agents only. The obsolete Claude host/fallback is absent; the
tracked Codex bridge and local orchestrator are landed. No Claude invocation is part of
the current workflow or remaining closure path.
**Current Fresh-Target Changelog Projection Repair:** 2026-07-23 — the first canonical
restart after merging the committed TASK-548 board/changelog state failed closed in the
Start gate before agent, server, browser, fixture, or closure mutation. Its TASK-540
prose projection had treated the independent 1260/1261 reservation as part of the
TASK-540 slot. The exact unique-slot parser and regression fixtures are now landed at
the verified pre-bridge checkpoint; they preserve all following reservation bytes and
reject duplicate, malformed, or interposed TASK-540 states. They await the complete
targeted gate. The stopped invocation remains diagnostic only.
**Local Workflow Recovery Authority:** The exact historical local recovery set and
hashes are defined by TASK-540-06/L01. The prerequisite is satisfied only by read-only
inventory/provenance/current-hash verification; recovery replay, destination writes, or
overwriting repaired bytes is forbidden. The seven top-level helper/facade paths remain
the public bundle, while cohesive tracked owners under
`_docs/_workflows/task-540-smoke/**` are its internal implementation modules.
Finalization must keep both sets clean-checkout reproducible; it neither changes the
broad ignore rule nor stages any unrelated workflow or loose screenshot. TASK-545
retains the repository-wide workflow/evidence policy.
**Historical Executor SHA-256:** `f473f4ff5e4c64fc1b2fc730cd24cbe48f7e1ea6d8aff1730ed32fe862d5c8de`
— hash-verified checkpoint `911c29f5`; it is non-authoritative after the subsequent
behavior-preserving modularization commits.
**Historical Mid-Split Executor Inventory:** At the `8259a326` checkpoint the facade was
26,391 lines, hashing to `bf2a3debbdb3646f302b0debd0eb480027453484a3ee46b2a187f69f2bb82799`.
That was a mid-split value, superseded; it is not the facade's present size.
**Current Executor Inventory:** At HEAD `a68a19e0`, re-measured 2026-07-27, the facade is
**976 lines**, hashing to `2699ea77f59bf40691c8561936d1e484c32cc3639679f2f4c27c6b22f06c9442`.
This is an inventory value, not a closure pin. All facade and child-module bytes have
stabilized, so the final dependent hashes and pins are recomputed inside the closure
transaction.
**Historical Source Repair Revalidated (superseded for L03):** 2026-07-16 — expanded R01 composer/stored-duplicate work and the L04 compatibility correction received their then-exact receipts alongside L03 and TASK-540-05. The later overflow repair restored L03's canonical `Implementation Complete` and exact successor gate; this historical receipt still does not authorize closure. The 2026-07-19 Entry-correction receipt is current; fresh post-audit, full validation, live smoke, changelog, and closure remain pending.
**Historical Pre-Overflow Post-Audit Orchestrator Revalidated:** 2026-07-17 — the real-source L04 test repair, L03 hygiene fixes, independently pinned aggregate expectation, fail-closed grounded-path exception, and mechanically invoked five-module L04 verifier passed focused static/test/line/self-test gates and two scoped zero-finding audits. The later L03 overflow repair superseded that prepared closure state.
**Historical Pre-Overflow Subsequent Post-Audit Repair Revalidated:** 2026-07-17 — the final L04 consumer gate then enumerated all 15 files and passed 98/98; R03 fixture typing and receipt order passed 89/89; L03 single-read and bounded-media repairs passed 258/258; static, name/body, line, workflow, and diff gates were green at that checkpoint. The later L03 overflow repair superseded that behavior gate.
**Historical Pre-Overflow Scoped Audit Follow-up Revalidated:** 2026-07-17 — R03 restored assertion-free shallow fixture freezes and L03 made the final 15-file/98-test consumer gate exclusively authoritative; exact focused checks and two fresh zero-finding audits passed. The later L03 overflow repair superseded that prepared closure state.
**Historical Pre-Overflow Start-Gate Semantic Repair Mechanical Revalidation:** 2026-07-17 — closure then had one implementation owner, then-current final gate/count receipts and chronology, exact reserved-pre-closure prose, and actionable safe start-gate errors; syntax/inertness/workflow/prepare/line/helper/format/diff checks passed. The later L03 overflow gate was exact at that checkpoint; a fresh clean five-lens audit and all later closure gates remained pending.
**Historical Pre-Overflow Runtime Smoke Preflight Repair (preflight-only call):** after the complete full gate passed, the one-shot executor call stopped before helper or browser launch because full-test teardown had removed the shared persisted setup and storage rows. The closure lane added and retains exact pre-suite restore, safe baseline hashes, the canonical `core` storage root, and the corrected field-option selector. The consumed call produced no live browser evidence and did not authorize closure.
**Historical Pre-Overflow Post-Audit Selector/Scope Repair:** the next five-lens post-audit stopped before full validation and smoke on the exact `Media asset`/rendered `Media Asset` selector mismatch and an unrelated legacy-key test refactor outside the shared-settings isolation exception. L01 then pinned `Media Asset` in both media-binding actions and self-test, restored the legacy behavior test shape, and retained only the exact snapshot/restore hygiene changes. That checkpoint did not authorize closure.
**Historical Pre-Overflow Runtime Smoke Failure-Action Observability Repair:** the subsequent canonical Start gate, all five post-audit lenses, complete repository-wide validation, strict scan, and final workflow checks passed before the one-shot smoke returned the fixed generic failure. Cleanup restored the exact settings baseline SHA-256 `7e453af480fe040a55d81ad0ee6c168ef8295a820b4eec2c1ee3331e18ab665b`, left no browser/session/listener or screenshot, and preserved the user-owned staged snapshot; the old generic-only boundary intentionally erased the failing action, so it is diagnostic evidence rather than a smoke pass. L01 then added the bounded allowlisted failure-action line; that checkpoint did not authorize closure.
**Historical Pre-Overflow Failure-Action Diagnostic Self-Test:** at that checkpoint the final executor self-test passed 490 actions and 196 negative cases with a caught synchronous stderr write, including `EPIPE`, `EBADF`, and partial-write containment. The later L03 overflow repair superseded the prepared closure state, not this durable diagnostic behavior.
**Current Corrective Implementation State:** 2026-07-19 — the R01 → R03 → L03 → L04 source chain and the TASK-540-05-L01 insertion-test compatibility update are landed and re-gated in dependency order. Each leaf carries one current owner-gate receipt; older receipts are historical. The clean five-lens post-audit, full validation, smoke, and closure remain pending.
**Historical Auth-Settlement Diagnostic Repair:** 2026-07-20 — a fresh Start gate, all five post-audit lenses, and complete full validation passed, then the strengthened one-shot smoke again stopped at `set-011a-bootstrap-auth-settled` and completed deterministic cleanup. L01 added a closed allowlisted browser-observation `failureClass` channel for only the six auth-settlement actions; raw URL, body, cookies, credentials, CLI errors, and unknown frames could not cross the boundary. The next canonical run proved that repair incomplete because a pre-classifier failure still emitted only the action ID.
**Historical Auth-Settlement Pre-Classifier Repair Implemented And Target-Revalidated:** 2026-07-20 — the prior canonical Start gate, all five post-audit lenses, full `bun run test`, `precommit:check`, `gates:coderso`, strict security scan, and final workflow contracts passed before the one-shot helper-backed Playwright CLI smoke stopped at `set-011a-bootstrap-auth-settled` without a `failureClass`; deterministic cleanup left no helper, browser, session, listener, screenshot, task workspace, or repository mutation. The frozen executor then extended the closed channel with safe executor-stage classes, kept raw process/error details in a separate write-only private map, traversed the production command authority in a hermetic matrix, and pinned SHA-256 `70162b648d4f294d61142da3a424b9a7b79a61cf0b30a450307abde8105f503e`. Prettier, syntax, and the executor self-test passed with 496 actions, 159 runtime receipts, 54 cleanup actions, and 706 negative cases; two fresh current-byte post-audits reported 0 HIGH/MEDIUM/LOW findings. The next canonical smoke classified the still-present invocation bug, so this receipt is historical.
**Historical Capture-Frontier Observation Repair Implemented And Target-Revalidated:** 2026-07-20 — the next fresh Start gate, all five post-audit lenses, complete full validation, and strict security scan passed before the helper-backed Playwright CLI smoke stopped at `set-011a-bootstrap-auth-settled` with exact `failureClass:"invocation_boundary_failed"`. Cleanup left no task helper, browser, server, listener, screenshot, private workspace, or repository mutation, and fixture creation had not begun. Three independent read-only traces plus an in-memory production-path reproduction proved the action failed before CLI spawn because `buildObservationSource` eagerly resolved the future `media.id` entry baseline at ordinal 15. The strict capture map and resolver remained fail-closed; entry-baseline/reset authority became lazy for its two observation consumers. SHA-256 `bfbc662b94127c486ac5e8057f51f498147e391854bcd8ac50eab1e8e3738f03` passed Prettier, syntax, and the executor self-test with 496 actions, 159 runtime receipts, 54 cleanup actions, and 707 negative cases. A fresh post-audit then found one sibling LOW: non-consuming visible assertions still eagerly resolved the same baseline, so this receipt is historical.
**Historical Capture-Frontier Consumer-Isolation Repair Implemented And Target-Revalidated:** 2026-07-20 — the strict capture map and recursive resolver remain unchanged and fail-closed. The frozen executor materialized entry-baseline/reset authority only for its three exact consumers: observations `relation-pickers-a-b-warm` and `related-unrelated-drafts-before`, plus assertion `relation-diff-exact`. Empty and partial bootstrap frontiers compiled the canonical four-argument `playwright-cli --raw run-code` invocation; non-entry assertions compiled without baseline captures; both entry-dependent observation and assertion paths rejected an incomplete frontier. SHA-256 `cde2a5924fcef4ecab2ed05b019b0ea1cf6492c77f458e7d716e7cf78950cf25` passed Prettier, syntax, and the executor self-test with 496 actions, 159 runtime receipts, 54 cleanup actions, and 708 negative cases. The next canonical workflow passed the clean five-lens post-audit and complete full validation before exposing the later dirty-flow handoff defect, so this receipt is historical.
**Historical Dirty-Flow Beforeunload Handoff Repair Implemented And Target-Revalidated:** 2026-07-20 — the canonical Start gate, clean five-lens post-audit, full `bun run test`, `precommit:check`, Admin build/boundary/bundle checks, `gates:coderso`, strict scan, and final workflow contracts passed before the helper-backed Playwright CLI smoke stopped at `dg-003-builder`. Read-only source/DB evidence proved Flow 4 correctly left the inline Entry draft dirty, `dg-001/002` reset only the backend, and the next hard navigation exposed a native `beforeunload` that the Playwright CLI retained as modal state. The 496-action manifest now records that causal handoff; only `dg-003-builder` proves the visible dirty badge, snapshots and temporarily replaces the exact CLI dialog listener set, accepts exactly one `beforeunload`, restores listener identity/order in `finally`, and then requires the exact builder URL plus one visible canvas. SHA-256 `b808b044b1f19d8b4cb7d3a103005b772208ecb6466c4ff1e74f7ea7b806e695` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 159 runtime receipts, 54 cleanup actions, and 732 negative cases. The failed call removed its browser/process/port/task-traffic state but left nonce-scoped domain fixtures, so this receipt is historical.
**Historical Failure-Cleanup Lifecycle Repair Implemented And Target-Revalidated:** 2026-07-20 — exact recovery removed only the failed nonce's one SEO row, two Screens, six Entries, one Media row and its SHA-256-pinned file, four content types, two users, and two role bindings; required settings and the accepted bootstrap recovery baseline remained byte-identical during recovery. The executor now treats the intentionally absent presentation override as early-released only after the complete exact create -> `ss-005` reset -> `ss-006` empty-proof chain, emits real provenance/delete/absence receipts against a fresh exact absence proof, and fails closed for missing authority or ambiguous rows. It also discovers the bounded exact Entry SEO row, models it as a child, and deletes/proves it absent before Entry cleanup. SHA-256 `1073a2d61d05874b6cdc2525d62e346a18049846452d160a30c965abd13bd100` passed Prettier, syntax, diff checks, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 748 negative cases. The next canonical run passed all gates and setup, then exposed the later `dg-017` settlement-proof race, so this receipt is historical.
**Historical Builder-Discard Settlement Proof Repair Implemented And Target-Revalidated:** 2026-07-20 — the latest canonical Start gate, clean five-lens post-audit, complete repository validation, release gates, strict scan, and helper-backed Playwright CLI setup passed; four screenshots were captured before the smoke stopped at `dg-017-builder-confirm-proof`, and deterministic cleanup removed every task-owned fixture and screenshot. The action contract already required the records workspace, discarded draft, and exact visible `Record actions` control to be ready, but the executor sampled URL and navigation count immediately after the SPA discard click, omitted the workspace latch, and derived `draftDiscarded` from absence of the Screen ID in a canonical records URL that necessarily contains that ID. `dg-017` now waits up to 30 seconds for the canonical records URL plus exactly one visible positive-geometry control and exact absence of both builder canvas and dirty badge, fails closed on duplicates or timeout, and only then proves the one-navigation discard. Its compiled-source self-test pins those checks and forbids the invalid URL-substring derivation. SHA-256 `cf821d6604174bd61ab4ca432742ad7c665d56e04a975e3c32c3157863b855e4` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 748 negative cases. A fresh read-only audit found no other HIGH/MEDIUM issue in `dg-011`–`dg-018` and verified the product discard path plus regression tests are correct. The next canonical run passed `dg-017` and exposed the later tone-selection proof defect, so this receipt is historical.
**Historical Pre-TASK-546 Strict Dependency Repair:** 2026-07-20 — TASK-540 then
remediated development-toolchain advisories with the exact versions present at that
checkpoint. TASK-546 later superseded those versions and owns the current dependency
graph. TASK-540 must preserve the landed `package.json`/lockfile bytes and prove a fresh
zero-finding strict scan; it must not restore or validate the historical pins.
**Historical Tone-Selection Visible-Effect Proof Repair Implemented And Target-Revalidated:** 2026-07-20 — the next canonical Start gate, all five fresh post-audit lenses, complete repository validation, release gates, and strict security scan passed. The helper-backed Playwright CLI smoke passed the repaired `dg-017`, captured four screenshots, then stopped at `dg-022-tone-muted`; deterministic cleanup removed every task-owned fixture and acquired TASK-540 screenshot. Three independent read-only traces found no product defect: the typed Select -> override draft -> dirty state -> renderer path and its Vitest regressions are intact. The defect was the generic click executor, which neither owned the portaled Radix menu nor waited for its advertised muted/dirty visible effect. Both `dg-021`/`dg-022` and the sibling `rc-015`/`rc-016` became exact specializations requiring the selected target, visible positive-geometry panel/trigger/menu/option, `aria-controls` menu ownership, retained selection, exact content and presentation dirty badges, closed-menu settlement, the presentation-override marker, and a real computed-color transition. Frozen SHA-256 `9400241963457929fad02edcc1c3d841edec2db78a5f2abcc2a65a7b611e5b6d` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 916 negative cases. The next canonical smoke exposed the post-fill blur race at `dg-021`, so this receipt is historical.
**Historical Post-Fill Blur And Portaled Tone Settlement Repair Implemented And Target-Revalidated:** 2026-07-21 — the subsequent canonical Start gate, all five post-audit lenses, complete repository validation, release gates, and strict security scan passed; the helper-backed Playwright CLI smoke passed `dg-017`, captured four screenshots, then stopped at `dg-021-tone-open`, and deterministic cleanup removed every nonce-owned fixture and acquired screenshot. Two independent read-only source traces proved the product Select, override, renderer, and selection contracts correct and identified an executor race: `dg-020` used `fill()`, while `InlineEditWrapper` commits only on blur, so the first Tone interaction both committed the content draft and opened the portaled Radix menu across a rerender. Both `dg-021` and sibling `rc-015` then explicitly blurred the exact selected textbox, waited for the visible dirty settlement, and reacquired the panel, target, handle, textbox, trigger, and portaled menu. Frozen SHA-256 `72e5f16fcc9fa34b4b9acde85d0304c0b947d2ba30f63809fdd55db91ea0a996` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 974 negative cases. The following diagnostic helper-backed smoke returned `200` for Admin and front, completed setup, captured five screenshots, again stopped at `dg-021-tone-open`, and completed exact fixture/screenshot/server cleanup. That run proved the commit still belonged to the wrong action, so this receipt is historical.
**Historical Atomic Content-Commit And Tone Diagnostic Repair Implemented And Target-Revalidated:** 2026-07-21 — source tracing found the remaining contract drift one action earlier: `dg-020-headline-fill` and sibling `rc-014-unrelated-fill` promised `value -> content dirty` but used the generic fill executor and returned while the draft still existed only in the focused DOM node. Because `InlineEditWrapper` commits on blur, the next action could encounter a refreshed or hydrated textbox and never obtain dirty authority. Those exact two fill actions now atomically require unique visible positive-geometry textbox, selected root, and pressed handle; fill the exact expected draft; prove exact text plus active focus; blur; reacquire every locator; and require the exact non-focused draft, retained selection, and one visible positive-geometry `Unsaved changes` badge before returning. `dg-021` and `rc-015` contain neither fill nor blur: they consume that settled draft/dirty authority, capture baseline color, then prove the visible positive-geometry Radix menu, Muted option, reciprocal `aria-controls`/id, and expanded state. A closed four-class diagnostic for only those two open actions distinguishes target, draft/dirty, trigger, and portal settlement through byte-identical frames, a private WeakMap, the existing 256-byte one-shot post-cleanup channel, and no raw error/DOM parsing. Three fresh current-byte audits passed the DOM/runtime, action-ownership/hydration, and diagnostic-security/mutant lenses with no finding. Frozen SHA-256 `c0589a50484357209b506865ca449cf6399654ffb77a1f1c3bfd53dace45b533` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1239 negative cases. The next helper-backed diagnostic smoke passed `dg-020` and `dg-021`, captured five screenshots, then stopped at `dg-022`; exact cleanup removed every fixture, screenshot, helper, browser, and server, so this receipt is historical.
**Historical Tone-Select Settlement Diagnostic Repair Implemented And Target-Revalidated:** 2026-07-21 — the next frozen executor kept the already-proven atomic content commit and added six monotonic, exact-frame classes for only `dg-022` and sibling `rc-016`: authority/option, menu close, dirty badges, selection/override, muted class, and computed-color delta. Exact frames remained bounded to 256 bytes, mapped to a private WeakMap, and emitted once only after cleanup without raw error or DOM parsing. SHA-256 `a6ecc7cc28c5f28a5aecbb6aa2d264e6ab107c19f11652e389164576ffffa829` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1534 negative cases. Two independent runtime traces found no product defect, and the helper-backed diagnostic smoke then passed `dg-020`, `dg-021`, and all six `dg-022` visible-effect latches before stopping at `dg-024-entry-nav-cancel`; five screenshots were acquired and exact cleanup removed every task-owned resource. A fresh audit also found one MEDIUM mutation-test gap in tone-select process precedence, fixed and revalidated by the successor, so this receipt is historical.
**Historical Dirty-Navigation Dialog Settlement Repair Implemented And Target-Revalidated:** 2026-07-21 — the `dg-024` terminal boundary proved that the old generic click failed during target acquisition or click before it could own the advertised dialog effect. Source tracing found desktop and hidden mobile SidebarNav instances, while the generic executor incorrectly required total DOM cardinality one. Exactly five contract-identical actions (`dg-012`, `dg-015`, `dg-024`, `dg-037`, and `rc-037a`) now select exactly one visible positive-geometry Records link, freeze the canonical source URL and navigation count, click once, and return only after one visible positive-geometry dialog exposes the exact realm-specific title and description plus one `Keep editing` and one `Discard and continue` button while URL and navigation count remain unchanged. Product source remains untouched; its isolated dirty-navigation suite passed 9/9. Independent literal ownership and mapping pins, per-field/extra-action/deletion/order mutants, and the repaired exact-frame process-precedence test closed both fresh audit findings. Frozen SHA-256 `214a5fa2d7a3e33a7003ed8c8e2005a921574dbb4be4d471adadfcbb2be7e789` passed Prettier, syntax, the 109-case contract self-test, and the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1968 negative cases. The next helper-backed diagnostic smoke passed the builder siblings `dg-012` and `dg-015`, again acquired five screenshots, then stopped at entry action `dg-024`; exact cleanup removed every task-owned resource. A fresh trace found that the remaining latch incorrectly counted every global dialog surface instead of the exact named dirty-navigation dialog, so this receipt is historical.
**Historical Exact-Named Dirty-Navigation Dialog Repair Implemented And Target-Revalidated:** 2026-07-21 — the five dirty-navigation actions retain their exact visible-link, canonical URL, navigation-count, realm-title, description, button, and geometry requirements, but dialog cardinality is now scoped to `getByRole("dialog", { name: exact realm title, exact: true })` instead of every unrelated Admin dialog surface. Heading, description, `Keep editing`, and `Discard and continue` remain exact and scoped under that one named dialog; two dialogs with the same owned accessible name still fail closed. The source contract forbids the global locator and adds explicit global, inexact, wrong-name, deletion, and ordering mutants while preserving the independent literal five-action mapping. Two fresh current-byte read-only audits report 0 HIGH/MEDIUM/LOW findings and independently confirm no product change is required; the second live run also disproved the earlier `dg-010` predecessor-race hypothesis by passing both builder cancel/reopen latches. Frozen SHA-256 `4e2995ae56174032b71fa897276009d6b7ef366568ec547d5227e75952f2315b` passes Prettier, syntax, the 109-case contract self-test, the executor self-test with 496 actions, 162 runtime receipts, 57 cleanup actions, and 1983 negative cases, plus the repair-sibling and local-orchestrator self-tests. The next diagnostic run and cleanup audit superseded this receipt.
**Historical Bounded Dirty-Navigation Diagnostics And Complete Cleanup Coverage Implemented And Target-Revalidated:** 2026-07-21 — a third helper-backed diagnostic smoke again reached `dg-024-entry-nav-cancel` after five screenshots, while an exact manual Playwright point probe and an immediate post-dirty race probe both proved one visible Records target, one exact named dialog with positive geometry, its exact heading/description/buttons, a stable source URL, and zero navigation. This isolated the unresolved boundary to executor diagnostics rather than product UI. An exact residue audit then corrected the prior cleanup claim: eight complete TASK-540 nonce families remained (127 exact DB rows and eight exact media files) because the terminal masked cleanup failure and SEO discovery owned only one of six fixture Entry documents. Every exact leaked row and file was removed with provenance, cardinality, bootstrap-admin, no-follow, inode, size, and SHA-256 guards; the active canonical admin remains intact. The executor emits one post-cleanup, <=256-byte allowlisted diagnostic, preserves the real phase for returned phase-6/7 failures, and discovers all six exact Entry SEO targets with stable child-before-parent cleanup. Frozen SHA-256 `4bae679c630e54533c240fae5e6d76b58254dc109242b91d1ba84b162408f1da` passed Prettier, syntax, and the executor self-test with 496 actions, 177 runtime receipts, 72 cleanup actions, and 2230 negative cases. The next live smoke exposed incomplete Select teardown and insufficient phase-3 attribution, so this receipt is historical.
**Historical Select-Teardown, Physical Dirty-Navigation, And Phase-3 Attribution Repair Implemented And Target-Revalidated:** 2026-07-21 — the next helper-backed smoke again passed setup and the Tone visible-effect flow, then emitted exact terminal `{failedActionId:"dg-024-entry-nav-cancel",failureClass:"click_failed",cleanupPhase:3,cleanupFailureClass:"phase_failed"}`. Read-only forensics found one exact nonce family with four content types, six Entries, two Screens, one Media row and its 68-byte SHA-256-pinned file; SEO, overrides, revisions, settings, synthetic users, sessions, audit/access rows, and every other task-owned surface were absent, global settings matched baseline, and the sole active canonical admin remained intact. A literal-ID, no-wildcard, no-user-delete, no-follow cleanup removed exactly that `4/6/2/1 + file` family and a fresh dry-run proved `0/0/0/0 + no file`. Source tracing found no product navigation defect: the Tone-select latch could return before Radix released its global pointer/scroll lock, while dirty-navigation visibility/geometry did not prove event delivery and its catch conflated pre-dispatch failure with post-dispatch auto-wait. Exactly two Tone-select actions now require every Select content node absent plus body scroll/pointer unlock; exactly five dirty-navigation actions require body unlock, a center-point physical hit test, no pre-existing named dialog, `noWaitAfter`, and the full stable dialog postcondition even after click throws. Their closed browser union adds only `pointer_locked` and `target_intercepted`. Phase 3 now distinguishes stage, dependency, provenance, delete, and absence failures while preserving higher-priority plan/Admin classes. A fresh cleanup-integrity audit found that four real Admin/plan/phase/final aggregation seams were not mutation-guarded; hermetic production-path evidence and four source mutants now bind those seams through the exact bounded, private-marker-free diagnostic. Frozen SHA-256 `5b0de7a899f17148e23272a83d69a5ce148bf3477adc1aed6db3e80b65d039b4` passes Prettier, syntax, and the executor self-test with 496 actions, 177 runtime receipts, 72 cleanup actions, and 2544 negative cases. Fresh read-only re-audits, one diagnostic helper-backed smoke, then the canonical audit/full-validation/smoke, changelog, and closure remain mandatory.
**Historical Stable Select Handoff, Latest-Target Diagnostics, And Hash-Only Cleanup Receipts Implemented And Target-Revalidated:** 2026-07-21 — the next helper-backed diagnostic smoke passed setup and the Tone visible-effect flow, then emitted exact terminal `{failedActionId:"dg-024-entry-nav-cancel",failureClass:"pointer_locked",cleanupPhase:3,cleanupFailureClass:"persistent_provenance_failed"}`. Exact nonce `wf540-fb30befde747` residue was four content types, six Entries, two Screens, one Media row, and its exact 68-byte file; a literal-ID, no-wildcard, no-user-delete, no-follow cleanup script with SHA-256 `821fe5d6ecf122edf068d8b051c3ac9c903faecc19f7d84399a244e56dbf2b1e` removed exactly that `4/6/2/1 + file` family, and two consecutive post-apply dry-runs proved `0/0/0/0 + no file` while preserving the canonical admin and proving no FK blocker. No TASK-540 screenshot, browser/server process, or owned port remained. Three independent read-only traces found no product defect: Tone selection used a mixed-time cached teardown sample, dirty-navigation retained a sticky historical blocker instead of the latest poll state, and each successful cleanup Admin GET carried a non-empty `Buffer` into recursive freeze after provenance but before DELETE; the same latent defect also affected DELETE and 404 absence receipts. The executor now requires the full Tone visible-effect and atomic Select/body teardown postcondition continuously for at least 600 ms across at least two samples plus a final atomic handoff sample, reports one of seven exact Tone-select classes, recomputes each target-acquisition poll from the latest one of five blocker classes within the closed twelve-class dirty-navigation action union, and hashes bounded non-empty authoritative response bytes before discarding the raw `Buffer`; only validated lowercase SHA-256 enters frozen cleanup receipts, while exact ID/media key/URL and fresh absence proofs remain unchanged and `deepFreezeExact` is not weakened. Hermetic real Admin P/C/A tests and mutants cover legal Screen/Entry representation drift, wrong ID/key/URL, exact attempted-request/no-DELETE/zero-receipt projection, accepted one-byte/exact-MAX boundaries, non-Buffer/empty/oversized byte rejection, unconditional latest-state assignment, full dwell reset/body/geometry predicates, relock timelines, and raw-Buffer/hash regressions. Product source remains untouched by this repair. Frozen executor SHA-256 `6accccffc88371978f2c3ad1727dbbf96aa2473802ea583d14cbc0c4ea548001` passes Prettier, syntax, diff checks, and the full self-test with 496 actions, 177 runtime receipts, 72 cleanup actions, 26 captures, and 2668 negative cases. Fresh read-only re-audits, one diagnostic helper-backed smoke, then the canonical audit/full-validation/smoke, changelog, and closure remain mandatory.
**Historical Scroll-Lock Ownership And Bootstrap-Restore Uncertainty Repair Trigger:** 2026-07-21 — the next helper-backed smoke reached the same Entry dirty-navigation boundary and emitted exact terminal `{failedActionId:"dg-024-entry-nav-cancel",failureClass:"scroll_locked",cleanupPhase:8,cleanupFailureClass:"phase_failed"}`. A post-exit read-only absence audit proved every TASK-540 nonce-shaped resource, owned file, screenshot, helper/browser/server process, and owned port absent, but phase 8 did not return accepted restoration evidence before the executor exited; the private preflight bootstrap timestamp baseline and newest smoke-owned pair are no longer available, so the final `lastLoginAt`/`updatedAt` restoration outcome is unprovable. This consumed run must not be recovered by guessed timestamps or any post-exit write and does not authorize closure. Exact source/dependency tracing proved `dg-022` handed off one final atomic unlocked sample after its full 600 ms dwell, `dg-023` performed read-only DOM/URL observations, and `dg-024` reported only its last completed target poll rather than a continuous ten-second lock; no product or Radix reopen path is evidenced before the unperformed navigation click. The bounded cross-CLI lock-owner observation and phase-8 uncertain-CAS reconciliation plus their tests/mutants are now landed in the exact pre-bridge checkpoint above, with product source unchanged. They still await the bridge-inclusive targeted gate and carry no current completion receipt.
**Current Repair Execution Order:** The final sentence of the 2026-07-21 trigger evidence describes its then-planned sequence and is historical. The authoritative
sequence is the `Current Closure Repair State` and `Family modularity prerequisite` sequence in this file.
Its first step, cohesive smoke facade/child modularization to at most 1,000 physical
lines per module, is **done** as of 2026-07-27 and is struck from the remaining work;
the surviving order is:
prove split integrity and recompute final dependent helper/task/test pins now that the
smoke bytes have stabilized -> targeted and full gates -> helper restart -> exactly one canonical
seven-flow Playwright CLI smoke with 13/13 screenshots and deterministic cleanup ->
changelog/control and child-first status closure -> final closure checks, commit, and
integration into `feat/implementations`.
**Changelog:** 1252 (pinned; closure only)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

---

## Scope

Create one cross-leaf aggregate regression suite for TASK-540, run every source-owner
suite read-only, update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, the narrow
unsafe-method wording in `_docs/SECURITY_SPEC.md`, both admin-cache docs, and the declared
Custom Screens guides; validate the already-landed `_docs/CMS_API.md` correction
read-only. Execute seven real browser flows and close the family only after every
descendant and required gate is green. Exactly five fresh post-audit lenses, in their contract order, must cover schema/URL compatibility,
Tabs/accessibility, async/dirty/cache safety, per-user responsive behavior, and
test/docs/smoke-feasibility/task-graph integrity before runtime starts; the separate
smoke-evidence audit runs only after the live flows. The pre-smoke lenses run strictly
sequentially, and the first dispatch/transport/schema failure stops later lens launch with
no same-invocation retry; final closure-drift lenses use the same boundary. A missing lens
result is not a pass. Every verified HIGH or MEDIUM finding blocks closure without
exception. A LOW blocks unless it is the exact already-approved TASK-9999-01-L01
finding, with its evidence, backlink, and zero-impact eligibility reverified exactly as
TASK-540-06/L01 specifies; no new follow-up created during closure is non-blocking. This
subtask owns no production source. Its shared-suite exceptions are the verified
full-gate state-isolation repair in `tests/unit/settings/settingsService.test.ts` and
`tests/unit/settings/storageSettings.test.ts`, plus the L01-delegated successor update
to `tests/unit/workflows/task540SmokeExecutorSecurity.test.ts`. That one successor must
preserve every TASK-546 credential/run-code/executor-equality assertion and,
independently of the bridge's hermetic self-test, mutation-kill the exact continuous-host
control frames, single-flight/order/replay/EOF boundary, host-owned arm/GO launches,
claim decision/CAS/crash table, and raw-crash-versus-controlled-abort behavior below.
It also owns the dedicated-worktree root, zero-finding strict scan, no-Claude bridge,
schema registration/identity/GATE/clone and closed type forms, canonical hashes,
agent-result/transcript and CAS/ACK/procedure correlation, status/list/interrupt fields,
late-response withdrawal ACK, exhaustive digest/recovery/status registries including
`status.rollback-prepared.json`, independent anchor prefix, pre-artifact run journal,
ledger-directory lifecycle, abort sealing, crash-recoverable index-last terminal
journal, exact helper PID/start/arming and recovery, repeated-crash artifact/terminal-
temp tables, safe-ledger cleanup/restart, honest Codex prompt, and L01's pinned mutants.
No extracted tracked test/support file is authorized; the expanded successor itself
must remain at most 1,000 physical lines. Clean-checkout reproducibility is mandatory.
The seven top-level helper/facade paths remain the public bundle; cohesive tracked
modules under `_docs/_workflows/task-540-smoke/**` are their internal implementation
owners. Before the complete targeted gate, every top-level path and child owner must be
a regular tracked non-symlink file with its final hash.

**The 1,000-line limit does not apply to the seven top-level helpers, and this is
settled — do not re-open it.** AGENTS.md § "File Size and Modularity" binds "a
human-authored production module or test file"; the helpers are workflow *tooling*
under `_docs/_workflows/`, which is neither. The implementation already agrees:
`isLineLimitedHumanAuthoredModule` (`task-540-implement.mjs`) admits only `core/`,
`packages/`, `store/` and `tests/` paths, and its own self-test asserts that
`_docs/_workflows/example.mjs` is out of scope. An earlier revision of this contract
extended the limit to all seven helpers, which contradicted both AGENTS.md and the code,
and was unsatisfiable in practice: `task-540-implement.mjs`, `task-540-local-orchestrator.mjs`
and `task-540-test-name-contract.mjs` all exceed it by a wide margin, so honouring it would
have meant splitting the bulk of the family's tooling, which no gate asks about. Their exact lengths are deliberately not restated here: `wc -l` is the authority, and `tests/unit/workflows/task540StaleCountProse.test.ts` measures that the three exceed the limit and rejects any length restated back into the prose. Keeping the child modules under
`_docs/_workflows/task-540-smoke/**` at or below 1,000 lines remains a deliberate family
convention — it is what makes a regression localise to one named file, and it holds today
for every child module — but it is a convention, not the AGENTS.md gate.

TASK-540 stages only those changed top-level and child-module paths without
changing the broad `_docs/_workflows/` ignore rule. Missing, ignored-only, partially
tracked, hash-mismatched, generated/archived, conditionally registered, or skipped
helper coverage fails. TASK-545 retains repository-wide workflow and
screenshot-manifest policy. No source-owner behavior assertion may be weakened or
re-baselined.
Flow 6 freezes the complete persisted reset draft at `rc-002`, then the complete
post-intentional-edit current draft at `rc-017`; `rc-032` derives relation before
values only from `rc-002`, exhaustively enumerates each current picker DOM option, and
compares all non-relation current paths to `rc-017`. It separately proves
`rc-002 -> rc-017` changed only the intended note-content and field-tone paths. The
dirty-save retry persists and cleans content only: server presentation remains at its
baseline while the local presentation bytes remain preserved and dirty; no
`persistedPresentationMatches:true` claim is valid.

## Leaf

| ID              | Title                                      | Ownership                                                                                                                                                       | Status         |
| --------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TASK-540-06-L01 | Seven builder-save-entry flows and closure | one new aggregate test, two exact shared-settings hygiene repairs, one successor workflow-security test update, docs, smoke evidence, TASK-540 closure metadata | 🚧 In Progress |

TASK-540-06-L01 deliberately retains the historical physical filename
`TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md` from the original
six-flow contract. The row uses the current seven-flow title, and no rename is part of
TASK-540.

## Smoke evidence receipts in the tree

The programme's runtime smoke evidence is written down in
`_docs/_workflows/_smoke/`. It is tracked, but until now no task file pointed at it, so
a closure operator walking the family had no path to it. Read the receipt itself before
citing it — each states its own scope, and one of them is explicitly labelled as
routinely misquoted.

| Receipt | What it records | What it does **not** record |
|---|---|---|
| `_docs/_workflows/_smoke/task-540-smoke-green-full-strength.md` | the two fully green runs, both at commit `c89fa96c`: `pass: true`, all 496 actions, 13/13 screenshots, full terminal cleanup. Run 1 is at the shipped 60 s auth window, run 2 at a shortened 5 s window. Transcribed from the two annotated git tags. | a receipt for the current bytes. Both runs describe `c89fa96c`, not HEAD, and neither discharges the canonical smoke this file owns. |
| `_docs/_workflows/_smoke/task-540-milestone-13-of-13.md` | the plan reaching 13 of 13 checkpoints at commit `92cc3bd5`, and the blocker inventory plus reproduction caveats, which still apply. | a passing run. Terminal cleanup still failed at that commit; it was repaired afterwards in `939328ef` and `c89fa96c`. Its "What is NOT yet true" section is history. |
| `_docs/_workflows/_smoke/task-540-milestone-11-of-13.md` | an earlier bisect anchor: 11 of 13 checkpoints, action 424 of 496, at commit `6df739cc`. | current state. Superseded for progress purposes by the 13-of-13 file. |

The smoke harness has not moved since those runs:
`git diff --name-only c89fa96c..HEAD -- '_docs/_workflows/task-540-smoke*'` is empty at
HEAD `6bf2ed98`. That is a fact about the diff and nothing more — `core/**` did change
over the same range, and the canonical seven-flow run remains required for closure.

## Family modularity prerequisite

Before the current corrective chain, closure consumed the exact source-owner sequence
`540-01-L01 → 540-02-L01 → 540-03-L01 → 540-04-L01 → 540-04-L03 →
540-04-L04 → 540-05-L01 boundary → 540-05-L02`. The prepared resolver's ten-landed-leaf
state is historical evidence, not current closure authority. The corrective source/test
commits and exact R01 → R03 → L03 → L04 → L01 owner re-gates are complete. The
completed current prefix is the landed no-Claude helper, host, schema, recovery, and
smoke-contract work plus the behavior-preserving splits through HEAD `8259a326`. This
prerequisite — cohesive smoke facade/child modularization to at most 1,000 physical
lines per module — is **satisfied**; see `Current Closure Repair State` at the top of
this file for the measurement. It is no longer part of the remaining work.
Split-integrity self-tests must prove exhaustive,
non-overlapping action-to-scenario ownership for the current manifest, including the
enumerated related-cache and responsive-users owners, so no omitted registry member can
silently fall through to a shared builder. Now that the smoke bytes have stabilized,
recompute final dependent pins, run targeted/full gates, restart the helper, and run
exactly one canonical seven-flow/13-screenshot smoke before closure. The
TASK-540 root owns the canonical 15-row pre-split evidence table. No owner, count, or
SHA-256 may be dropped; every final production, test, and test-support record is emitted
as `{ path, owner, lines, sha256 }` from the full baseline history plus current tracked
and untracked state. Staging/current-HEAD changes cannot narrow that authority.

Every human-authored result must be `<= 1000` physical lines under the exact AGENTS.md
exemptions. A violation is blocking and cannot become a LOW or TASK-9999 item. Each of
the ten split test families runs every resulting suite alone, runs the family together,
and preserves the exact sorted multiset of all 347 expanded pre-split names. Those
modularity prerequisites remain durable. After the corrective chain and its fresh clean
five-lens post-audit, closure runs the exact 64-Vitest/18-Bun product matrix. Its
ordinary closure-owned test is
`tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`; the later verified
pre-smoke repair additionally owns the two exact shared-settings hygiene suites and the
successor `tests/unit/workflows/task540SmokeExecutorSecurity.test.ts` update named
above. The focused workflow-security suite is a targeted/full-repository security check
outside the frozen 82-file product matrix. Changelog 1252 stays
pinned and is created only after these gates, post-audit, full validation, and runtime
smoke succeed.

## Orchestrator-only smoke helpers

The root-local orchestrator, outside every closure-agent `allowedFiles` list, solely owns
the current repair bytes in `_docs/_workflows/task-540-smoke-contract.mjs`,
`_docs/_workflows/task-540-smoke-executor.mjs`,
`_docs/_workflows/task-540-smoke-host.mjs`,
`_docs/_workflows/task-540-codex-agent-bridge.mjs`,
`_docs/_workflows/task-540-local-orchestrator.mjs`,
`_docs/_workflows/task-540-implement.mjs`, and
`_docs/_workflows/task-540-test-name-contract.mjs`. They are task-workflow infrastructure,
not production/source files and not closure-owned tests or docs. Their exact final
versions become tracked TASK-540 runtime/test inputs as the narrow reproducibility
exception above; cohesive owned modules under `_docs/_workflows/task-540-smoke/**` may
join the same commit, but no unrelated workflow path may. The contract helper
exports only `buildTask540SmokePlan({nonce})` and
`runTask540SmokeContractSelfTest()`; it is import-side-effect-free, uses no environment,
filesystem, database, network, or `process.env`, and owns the blueprint plus the strict
compiler/validation for exactly 496 action rows, 15 fixture subjects, exactly 17 public
capture names, 13 screenshots, and 55 visible assertions. The plan has one complete
`actionManifest` and no second setup collection: all 55 setup rows, 434 flow rows, and
7 terminal browser rows execute exactly once through one dense ordinal `1..496` loop.
Refs remain symbolic in the frozen plan and resolve lazily only for the current action,
after its dependencies and capture producers have completed. The executor exports only
`executeTask540SmokePlan({root,nonce,assertSafeEvidence,snapshotRepository})` and
`runTask540SmokeExecutorSelfTest()`, rejects unknown input keys, accepts no raw
environment/secrets, agent dispatcher, arbitrary shell command, or caller-supplied
receipt/hash, and keeps its real/fake capability boundary private.

The historical pre-modularization tracked helper checkpoint was verified as:
`task-540-codex-agent-bridge.mjs`
`c3c594a17cb63943beab29e7f621f6e1ca46cb3b5abb67625edcddb900788341`,
`task-540-implement.mjs`
`eeb25e7be19f3aa0fa8a6638c5976d9cd1a6228d1d19f9272d713ec0dca4f9cb`,
`task-540-local-orchestrator.mjs`
`e06c7be9652554111c111c2e8210b733db908a4f272bcbd4a11781174e132da4`,
`task-540-smoke-contract.mjs`
`5ed7407d13c71becaea40128128774bdf6e3baf26e4f04353715a72f0a48eb74`,
`task-540-smoke-executor.mjs`
`f473f4ff5e4c64fc1b2fc730cd24cbe48f7e1ea6d8aff1730ed32fe862d5c8de`,
`task-540-smoke-host.mjs`
`2dbec5af334b4b8d5ef7b2bcda2c1f56f6cac9e86bb7df6bedfb358d05b7d68f`,
and `task-540-test-name-contract.mjs`
`ce052b4245c8c384d0405c32cf9d1df146a2f83a409994a6a2822de5422fc4f5`;
the inert `task-540-fix.mjs` retains recovery hash
`b65b1b7cce153471e71ef613bb6515846ba02515a603a899be3ffdc9388ef846`,
and was not part of that seven-helper bundle. Those facts prove checkpoint `911c29f5`
only. Its executor hash is non-authoritative after the smoke splits; every facade and
child-module byte has since stabilized, so the final helper, task, and test pins are
recomputed inside the closure transaction. Repeating the recovery prerequisite is
read-only verification only;
replaying or writing a historical blob is forbidden.

The required post-repair local orchestrator remains one continuous Node `--run` host; root
launches exactly the outer `node _docs/_workflows/task-540-local-orchestrator.mjs --run`
child from the verified root with `shell:false`, `detached:false`, and private non-TTY pipe
stdin/stdout. Its only other direct form is `--self-test`; until the targeted gate passes,
`--run` fails closed before dispatch. The no-Claude host alone spawns/arms every bridge
child; root never does. The bridge permits one request and no other authorized writer.
Snapshots detect arbitrary same-UID writers; no per-agent tool allowlist claim is made.

After maintenance/self-test early exits and immediately before main execution, the
implementer calls the non-enumerable
`agent.registerSchemas({audit:AUDIT_SCHEMA,gate:GATE_SCHEMA,mutation:MUTATION_SCHEMA,result:RESULT_SCHEMA})`
once. A `WeakMap` keeps original identities/hashes; RESULT/AUDIT are read-only, MUTATION
is mutating, and GATE/clones/mutation/unknown/second registration reject. The same
process recursively validates exact own data, dense arrays, L01's closed keywords, no
coercion/default/removal, 8 MiB total, and 4,096-byte strings; serialized-copy
prevalidation is not authority. Mutation remains a proposal: existing snapshots,
allowed/touched files, task-state and secret checks, and rollback decide surviving
bytes. Non-root agents cannot run gates, servers, Playwright, fixtures, cleanup,
evidence sealing, or smoke; those remain root/orchestrator/executor children.

The host emits private canonical-LF `{deadlineAtEpochMs,requestDir,requestId,sequence}`,
retains the path privately, and accepts only exact
`controlCore={command,controlId,controlOrdinal,payload,requestId,sequence}` frames on non-
TTY stdin. `command` is exactly `inspect|respond|status|wait|procedure|recover-review|
abort`; ordinal is dense positive with independent random 128-bit lowercase-hex ID. The
first five bind the notified request/sequence; abort and recover-review bind both null.
Payload is null for inspect/status/wait, the exact named bridge frame for respond/
procedure/recover-review, and exactly `{reason,review}` for abort, with L01's closed
reason and complete task-name-free live-root recovery review.
Bridge-backed commands complete read→child arm/GO→execute→reply; abort completes read→
review/reason validation→host seal/cleanup→reply with no child. The host then emits
`controlReplyCore={command,controlId,controlOrdinal,requestId,result,sequence,status:"ok"}`,
with closed result and repeated correlation. Whole input/reply including its sole LF is
at most 8,454,144 bytes. Parse/re-encode/reject-unknown checks reject missing/duplicate/
noncanonical/reordered/replayed/out-of-order identity, pipelining, binding drift, BOM/
invalid UTF-8, partial/multiple LF, and trailing/extra bytes. Nothing is echoed; argv/
env/file/inherited-FD/socket/TTY alternatives are banned. The bridge CLI remains exactly
`--self-test|--inspect|--respond|--status|--wait|--procedure|--recover-review`; no
`--abort` exists.

`inspect` returns either closed pre-claim cancellation with no dispatch or the exact safe
request/claim bundle. Root privately maps request to task and spawns one fresh
`fork_turns="none"` agent with only policy/prompt/schema. Pre-identity spawn failure
sends L01's exact `spawn_failed` procedure on the same stream, reuses the claim, rolls
back/ledgers/cleans without invented correlation or retry, and settles
`dispatch_failed` only strictly before deadline; equality/after or an earlier deadline
start settles `deadline_exceeded` while dispatch remains `spawn_failed`.

Otherwise root hashes and sends only exact
`{agentResultSha256,claimId,requestId,result,sequence}` as `respond`; the responder
recomputes it and cannot link when start or pre-CAS is at/after deadline. Root recomputes
private request/task/result correlation and sends the exact `procedure`; status/wait are
bounded observations. Polling/interrupt are procedural evidence; CAS is local
enforcement, and tests never claim to execute collaboration tools.

A responder that durably created `response.started.json` but reaches the pre-CAS
deadline links no response candidate: it withdraws, starts/joins deadline cancellation,
and publishes its start-bound `response.done.json` bound to that settlement. Its
start/ACK stays beside the winning cancel start/ACK, cannot revive the result, and cannot
be replaced by process absence.

The seven commands are the whole root surface. Status is one stable read, wait is
bounded, and recovery accepts only L01's task-name-free payload/closed ACK. Caller claim/
cancel/replay/path cleanup and second recovery-write modes do not exist; IDs/paths stay
private and agents receive only policy/prompt/schema. Only explicit accepted abort is
controlled. Unframed EOF/root/transport loss freezes dispatch, terminates only provable
children, retains all journal/request/ledger bytes, and exits raw-failed without reply,
abort receipt, or cleanup. The host never reconnects/resumes or claims self-absence.
A fresh root proves the old host absent and submits review only with the original root's
private request-to-task transcript map; otherwise recovery blocks. Raw failure never
permits retroactive abort, replay, dispatch, or generation resume.

Every request uses a private `0700` `/tmp` directory and exact `0600` files with stable
`lstat/open(O_NOFOLLOW)/fstat/recheck` identity. Every canonical digest uses only
`bridgeDigest(kind,core) =
sha256("coderso.task540.bridge." + kind + ".v1\0" + canonicalJson(core))`; each exact
core excludes its own digest field. The exhaustive kind→field registry is:
`schema→schemaSha256`, `request→requestSha256`, `claim→claimSha256`, `contender-start→startSha256`,
`settlement→settlementSha256`, `ack→ackSha256`, `agent-result→agentResultSha256`,
`status-observation→statusSha256`, `procedure→procedureSha256`, `transcript→transcriptCorrelationSha256`,
`request-id→requestIdSha256`, `run-id→runIdSha256`, `recovery-task→taskCorrelationSha256`,
`recovery-review→reviewSha256`, `recovery-helper-sweep→priorHelperSweepSha256`,
`ledger-entry→ledgerEntrySha256`, `ledger-prefix→preClosureSha256`, `terminal-ledger→sha256`,
`abort-ledger→sha256`, `branch-id→branchSha256`, `git-dir-id→gitDirSha256`, `root-id→rootSha256`,
`worktree-id→worktreeSha256`, `artifact-path→pathSha256|ledgerPathSha256`, `run→runSha256`,
`run-prepared→runPreparedSha256`, `artifact-plan→planSha256`, `artifact-created→createdSha256`,
`artifact-cleanup-started→cleanupStartedSha256`, `artifact-cleaned→cleanedSha256`,
`helper-launch-planned→launchPlannedSha256`, `helper-launch-armed→launchArmedSha256`,
`helper-launch-cleanup-started→launchCleanupStartedSha256`, `helper-launch-cleaned→launchCleanedSha256`,
`recovery-manifest→manifestSha256`, `recovery-prepared→preparedSha256`,
`recovery-rollback-prepared→rollbackPreparedSha256`, `recovery-committed→committedSha256`,
`recovery-ledger-cleaned→ledgerCleanedSha256`, `status-manifest→statusManifestSha256`,
`status-prepared→statusPreparedSha256`, `status-rollback-prepared→statusRollbackPreparedSha256`,
and `status-committed→statusCommittedSha256`. No unnamed/generic/alias hash is legal.
Only exact byte digests `contentSha256`, `oldSha256`, `newSha256`, `oldPayloadSha256s`,
and `newPayloadSha256s` are nondomain. L01 pins every core/envelope;
`status-rollback-prepared` is exactly `{manifestSha256,transactionId}`. Canonical UTF-8
JSON rejects duplicate keys, BOM, invalid/trailing bytes, and noncanonical whitespace.
The claim digest's exact `claimCore` is
`{claimId,claimOwner,deadlineAtEpochMs,deadlineMonotonicNs,decisionMonotonicNs,requestId,requestSha256,schemaSha256,sequence}`.
The final operator decision sample is the last non-filesystem step before its candidate
write/fsync/link and is legal only when `decisionMonotonicNs < deadlineMonotonicNs`;
otherwise it joins or creates timeout. Timeout is legal only at/equality/after
(`decisionMonotonicNs >= deadlineMonotonicNs`), so equality can never elect operator.
Before any random `/tmp` ledger or request artifact, the bridge alone creates/fsyncs one
fixed run-recovery journal under the verified per-worktree Git directory. It durably
records the ledger directory's exact plan before creation, its identity after creation,
cleanup-started before `rmdir`, and cleaned state after the parent fsync. It applies the
same planned/created/cleanup-started/cleaned lifecycle to every exact request directory
and ledger entry. Restart uses only those records and the closed request inventory to
clean a crashed generation, never scans `/tmp` or adopts old work. The location is
outside the tracked tree but inside this worktree's Git directory beneath the common Git
directory, isolated from sibling worktrees.
Every bridge helper launch is performed only by the continuous `--run` host through the
leaf's parent-owned arm handshake and reject-unknown launch cores; root can cause one
only through an accepted control command. For dense `launchOrdinal`, its files are exactly
`launch-<zero-padded-12-digit-launchOrdinal>.planned.json`, `.armed.json`,
`.cleanup-started.json`, and `.cleaned.json` under the four `helper-launch-*` domains
above. The continuous host writes and fsyncs the plan before spawn. Before `GO`, the child
may parse only its bounded private bootstrap and cannot stat, open, read, write, or
derive the request directory, journal, or repository state; pre-`GO` EOF exits silently
with a nonzero status and no access or output. The host writes and fsyncs the exact
positive PID/start identity in the armed record, then sends one exact `GO` over the
private control pipe. Only an armed child is request-capable;
`response.started.json` and `cancel.started.json` remain the only request
contender-start records after arming.

A planned-unarmed launch is permanently request-incapable because `GO` was impossible;
it proves no PID/start identity or physical absence. A bounded current-UID `/proc` scan
under exact module/mode/request/launch authority is additional evidence only and never
signals an unknown or mismatched result.

The bridge module's sole export is `sweepPriorBridgeLaunchesForRecovery`, a host-only
in-process preflight that cannot execute any request/recovery mode. Before planning
`recover-review`, the fresh recovery-only host calls it to validate the fixed journal,
terminate only exact live armed PID/start identities, and prove prior armed helpers
absent. It returns exactly `{...priorHelperSweepCore,priorHelperSweepSha256}`, where
`priorHelperSweepCore={launches,runSha256,schemaVersion:1}`; `launches` is dense,
prior-ordinal ordered, and contains exact
`{launchArmedSha256,launchOrdinal,launchPlannedSha256,state}` items. State is exactly
`armed_absent` with a non-null armed digest or `planned_unarmed` with a null digest; only
`recovery-helper-sweep` maps to `priorHelperSweepSha256`.
`helperLaunchArmedCore` is exactly
`{launchOrdinal,launchPlannedSha256,mode,moduleSha256,priorHelperSweepSha256,processId,processStartTime,worktreeSha256}`;
its sweep digest is null for the five request modes and exact non-null for
`recover-review`. GO is exactly
`{command:"GO",launchArmedSha256,launchOrdinal,launchPlannedSha256,priorHelperSweep}`;
that field is null for those five modes and the exact sweep envelope for recovery.
Only after preflight may the host plan/arm/GO the controller; after GO it exact-set
verifies every prior ordinal before root-review access or cleanup. A crashed controller
joins the next fresh sweep.
Root keeps the original request-to-task map outside the journal, stops every live mapped
task, then submits the task-name-free review. Missing map/review, identity/sweep drift,
live/recycled PID, or premature cleanup retains all evidence.
After a fresh root proves the old host absent, raw recovery cleans journal-listed
identities without retroactive abort/workflow evidence. Only explicit live-root `abort`
is controlled: the host validates reason/review, prepares the abort journal, and cleans
without a child. Self-tests/mutants cover export isolation, exact cores/order/nullability,
prior-ordinal completeness, crashed-controller inclusion, seven modes, abort bindings,
raw-loss retention, old-host absence, missing-map blocking, and no host self-absence claim.

Operator/timeout claim candidates contain the exact claim envelope, are created
`O_EXCL|O_NOFOLLOW` as stable current-UID regular `0600` identities at `nlink=1`, and
hard-link without overwrite to fixed `claim.json`. A winner proves the same `(dev,ino)`
at `nlink=2`, identity-unlinks its candidate, fsyncs the parent, and proves the claim at
`nlink=1`; `EEXIST` stable-validates and joins the winner, then unlinks/fsyncs only the
distinct loser candidate. Raw-crash recovery uses this exhaustive cleanup-only table:

| Durable graph                                 | Exact recovery                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| no claim; no candidate                        | valid never-created CAS; no election, dispatch, or resume                                                     |
| no claim; one/both known candidates           | validate each exact owner/time envelope at distinct `nlink=1`; unlink/fsync only those candidates             |
| claim alone                                   | stable-validate exact claim identity/envelope at `nlink=1`; retain through ordinary request cleanup           |
| claim plus same-inode winner candidate        | validate same `(dev,ino)` graph at `nlink=2`; unlink/fsync candidate; require claim `nlink=1`                 |
| claim plus one/both distinct loser candidates | validate claim `nlink=1` and each known loser `nlink=1`; unlink/fsync only losers                             |
| claim plus linked winner and distinct loser   | validate winner graph at `nlink=2` and loser `nlink=1`; unlink/fsync known candidates; end at claim `nlink=1` |

Any other/unknown link graph or identity/owner/mode/time/deadline drift retains all
evidence and fails closed; recovery never creates a claim/link/decision or adopts work.
The bridge self-test and successor security test independently mutation-kill every row,
link-count/inode/link/unlink/EEXIST/join/crash edge, and operator/timeout equality swap.

Response/cancel candidates begin at `nlink=1`, share a hard-link no-overwrite CAS, and
the winner proves the candidate/settlement same inode at `nlink=2`, unlinks its
candidate, then proves settlement `nlink=1`. A loser unlinks only its candidate. After
its final CAS state, every started response or cancellation contender—winner or
`EEXIST` loser—must publish its exact `response.done`/`cancel.done` acknowledgement.
Only a contender that never started has no acknowledgement obligation. L01 pins each
fixed start file's exact canonical identity/hash core, binds `startSha256` into the
settlement and kind-matching ACK, and preserves every winner/loser start→ACK pair in the
ledger. The bridge host's durable arm record already binds a responding or cancelling
helper's PID/start identity before `GO`; the bridge then bounded-waits for every started
contender's acknowledgement, the required procedure receipt, and, when an arm record
exists, helper PID/start absence. A pre-claim
timeout has no procedure receipt and receives an exact nondispatch ledger entry. An
operator-claimed timeout reuses that one operator claim and must never create a second
claim. Even after timeout/failure/cancel the bridge runs existing postchecks and
rollback while all preimages remain retained. It then writes and revalidates one
immutable dense safe-projection ledger entry that exposes no raw ID/prompt/result but
records run/worktree, claim owner, settlement/start, every winner/loser start→ACK,
dispatch/fork/conditional-interrupt transcript correlation, and final disposition.
Only then may it unlink known identity-bound request files and remove the proven-empty
request directory. The pre-closure ledger prefix is bound into `closureControl` and
embedded byte-identically in both the independent changelog-index anchor and changelog
evidence. After final closure-drift, agent dispatch freezes permanently for that
generation. The root final reviewer first recomputes every actual
request/task-name/result/procedure correlation before accepting the terminal receipt;
its exact hash preimage binds the complete ordered projection and both pre-closure
fields, and its count/hash equal the control's terminal count/hash. One
crash-recoverable transaction under the verified worktree Git directory then journals
and fsyncs exact old/new bytes, updates changelog plus three task receipts, and commits
the changelog-index anchor last. Restart rolls back on the old index hash or forward on
the new hash; every other state fails closed. A final local mechanical gate
byte-verifies those durable bytes, and the root repeats the transcript-correlation
review, before the `/tmp` run ledger may be cleaned.
Digest-only recovery, a post-freeze agent call, partial terminal persistence, or cleanup
before that gate fails closed. Recursive cleanup is forbidden.

Accepted explicit `abort` uses the fixed private recovery location: freeze, validate
live-root transcript/procedure review plus reason, seal the safe projection under exact
`abort-ledger`, fsync its prepared journal, then identity-clean only listed entries.
Restart may continue cleanup but cannot adopt it as workflow evidence; marker/journal
remain until verified absence. A live root converts spawn/schema/finding/workflow stops
to this explicit command. Unframed EOF or transport/root loss instead follows the raw-
failed retained-evidence path. The private seven-command stream is the sole root surface;
bridge modes/self-test are not alternate transports. This is a same-UID coordination/
replay/partial-write boundary, not an OS boundary against a hostile same-UID process.

The bridge, host, implementation workflow, and test-name workflow independently derive
their dedicated-worktree root from `import.meta.url`, require
realpath/Git-top-level/common-dir agreement and exact branch `feature/tasks-fixes`, and
accept no cwd/argv/env or hardcoded checkout-root override. The complete fail-closed
contract and mutants are owned by TASK-540-06/L01. Agent context remains the
hash/length-only `GroundedChangeManifest` inside the existing 96 KiB context and
128 KiB complete-prompt bounds. It names paths/kinds/byte lengths/hashes so the agent
can inspect current worktree files locally; raw patches and file content never cross
the bridge. The implementation orchestrator independently verifies every result and
repository snapshot. The adapter
defines no gate, DB operation, browser command, or smoke capability itself. Those
operations remain direct children of the root-local implementation orchestrator and
executor; no agent execution path is introduced.
The host module exposes only its hermetic self-test and closed `--serve <canonical-root>`
CLI. Its direct-entry guard is compatible with the repository's pinned
`>=26.5.0 <27` Node runtime and hermetically tests absolute/relative matches plus
mismatched/missing argv rejection. It never reads/sources `.env`,
receives only the executor's exact null-prototype
allowlisted host environment, directly spawns the backend/Admin/site descriptors, and
while still alive owns only descendant cleanup: after identity revalidation it sends
graceful TERM and then conditional KILL to surviving same-identity descendants and
proves descendant/listener absence. It cannot signal its own negative PGID or prove its
own runner/group absence. The executor exclusively owns whole negative-PGID TERM/KILL
and final runner, process-group, descendant, and port absence; no installed helper is
legal.

Each action has one exact reject-unknown `executable` descriptor; deprecated
`templateId/sourceAuthority/transport/stdoutPolicy` execution authority is forbidden.
The mechanically recounted disjoint partition is exactly 76 runtime operations, 392
browser run-code sources, 14 browser-native operations, 13 screenshots, and one global
browser list. Runtime operation IDs and run-code source IDs are direct per-action
registry keys with bidirectional set equality, not generic `api`/`observation`/
`assertion`/`route` switches over literal refs. Refs use only the six helper-matching
discriminants `literal/path/selector/secret/capture/fixture`; secret refs contain only
the names `ADMIN_EMAIL` or `ADMIN_PASSWORD` and are legal solely in the seven exact
native credential fills. All ordinary goto/resize/click/non-secret fill/press/type/
focus operations are one-layer-JSON run-code. The executor self-test uses the real
executor loop with hermetic fakes and proves one capability dispatch for each of the
496 action rows before cleanup, plus the executor's lane-specific runtime/browser
receipts and deterministic cleanup. Independently, the contract self-test's model loop
mechanically proves 496 model dispatches, 496 model receipts, receipt ordinals
`1..496`, manifest-ID set equality, the exact disjoint `55/434/7` receipt partition,
and exactly one model dispatch plus receipt per action. Neither self-test starts a real
capability.

The rate-limit preflight freezes the exact active auth policy and accepts enabled
limiting only for `maxRequests >= 10` and `1 <= windowSeconds <= 60`. Six explicit
`authRateWindowBarrier()` rows split the complete auth-request plan into seven epochs
whose per-identity maxima are `9, 10, 9, 10, 9, 7, 6`. An independent producer
classifier covers full navigations, auth operations, and conditionally cached CSRF
writers and requires exact set equality with the frozen per-action cost ledger. It
rejects an unclassified sensitive writer, changed producer signature, or missing
producer cost. An enabled barrier waits one complete configured fixed window plus one
second; a disabled barrier skips the timer but performs the same bounded realm proof.
Each barrier keeps a context-wide
`/admin/api/auth/*` request listener active through its after-sample and fails if auth
traffic or URL/navigation identity changes, or if root geometry is not finite and
positive before or after. Its generated `playwright-cli` source uses a local,
fail-closed parser for canonical lowercase-HTTP(S) browser URLs with DNS/IPv4
authorities and bounded numeric ports. Unsupported or malformed authorities are
rejected rather than treated as harmless cross-origin traffic; the callback never uses
the host-global `URL` constructor that the CLI sandbox does not expose. It never resets the limiter, mutates settings, mocks
an auth route, or weakens the deliberate cold-load/persistence navigations.

The editable content-type detail projection is not an eighteenth public capture. Only
the exact `set-017-editable-type-proof` four-key output `{id,slug,name,schema}` may bind
the executor-private single-assignment `WeakMap` authority
`editable-content-type-detail`; only `set-035-screen-create` and
`set-037-retry-screen-create` may consume it. The two blueprint list-view descriptors
name `materializerId` plus `privateProjectionAuthorityId`, never a capture key.
Producer and consumer registries are checked bidirectionally against actual accessors,
and the projection value/hash is forbidden from public captures, plan/evidence,
receipts, callbacks, errors, and logs.

The orchestrator integration replaces and removes the old agent-executed smoke and
cleanup path; the execution models may not coexist, even as fallback or recovery.
Only strict canonical evidence or, after failure cleanup, one synthesized canonical
stderr line of at most 256 bytes may leave the executor before its unchanged fixed
one-key thrown failure. Every line contains the fixed `code` and at least one of these
two authorities: `failedActionId` for the currently active frozen-manifest action, or
the inseparable `cleanupPhase`/`cleanupFailureClass` pair for a failed cleanup. An
allowlisted `failureClass` may accompany only an active action in the closed auth,
Tone-open, Tone-select, or dirty-navigation diagnostic families. Consequently the
exact shapes are action-only two/three-key, cleanup-only three-key, or combined
four/five-key lines; unknown keys and partial cleanup pairs reject emission.
The action ID is validated against that invocation's manifest and is cleared after a
fully recorded action. Cleanup phase is an integer from 0 through 10: phase 0 accepts
only `cleanup_boundary_failed` or `construction_cleanup_failed`; phases 1 through 10
accept `phase_failed`; phase 8 additionally accepts
`bootstrap_reconciliation_failed`, `bootstrap_cas_failed`,
`bootstrap_uncertain_baseline_failed`, `bootstrap_post_restore_proof_failed`, and
`bootstrap_restore_receipt_failed`; phase 3 additionally accepts `admin_api_failed`,
`persistent_plan_failed`, `persistent_stage_failed`,
`persistent_dependency_blocked`, `persistent_provenance_failed`,
`persistent_delete_failed`, and `persistent_absence_failed`. Earliest phase wins,
with the frozen same-phase class priority defined in L01. Construction or
cleared-action state emits nothing when cleanup proves absence, but may emit the
cleanup-only shape when that cleanup itself fails. Raw causes/messages/codes, bytes,
cookies, CSRF values, command output, paths, PIDs, environment data, secrets, and
session material remain private.

`dg-024-entry-nav-cancel` uses the same closed twelve-class dirty-navigation contract as
its four siblings: `target_bound`, `target_duplicate`, `target_missing`, `source_url`,
`scroll_locked`, `inline_pointer_locked`, `computed_pointer_locked`,
`target_intercepted`, `click_failed`, `dialog_duplicate`, `not_suspended`, and
`dialog_settlement`. `dg-022` independently proves the selected Muted value, dirty
channels, visible computed-color effect, complete Select teardown, and unlocked body
continuously for at least 600 ms plus one final atomic resample. Adjacent read-only
`dg-023` freezes the draft/URL/navigation authority. In one same-action poll, `dg-024`
then proves current body scroll/pointer unlock, exactly one visible positive-geometry
Records link, scrolls it into view, reacquires its final geometry/visibility, and proves
center-point event ownership before clicking. The exact dirty dialog, stable URL, and
stable navigation remain mandatory even when the click call throws. This removes only
the unreliable page-global cross-command observer; it does not add a fallback or change
product source.
Each invocation
starts browser authority at most once and keeps deterministic route, browser, resource,
access-log, process, and port cleanup plus absence proof inside the executor; a failed
call cannot launch an outer recovery, replacement prefix/host runner, or second smoke attempt.
Once the modules land, their exact `node --check` and `--self-test` commands are
mandatory in the closure gate, the complete full gate, and every final mechanical gate.
They are absent only from a sealed source-owner repair gate that predates the three
modules. That is a phase/evidence rule, not a claim about any sibling's current repair
or completion status: every pre-1252 closure/full/final gate after the modules land,
and every post-1252 covered final gate, includes all ten helper commands plus the exact
operational tracked-test command below.

If a final-drift source repair changes the closure leaf's gate or completion metadata,
the workflow must invalidate every pre-repair durable Pending snapshot before it tries
to recapture the repaired graph. A recapture failure must establish and verify a fresh
Closure Pending projection from that current, already re-gated graph; it may never make
the outer failure handler restore the stale pre-repair projection. The workflow
self-test must execute that failure branch hermetically.

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
git ls-files --error-unmatch _docs/_workflows/task-540-smoke-contract.mjs _docs/_workflows/task-540-smoke-executor.mjs _docs/_workflows/task-540-smoke-host.mjs _docs/_workflows/task-540-codex-agent-bridge.mjs _docs/_workflows/task-540-local-orchestrator.mjs _docs/_workflows/task-540-implement.mjs _docs/_workflows/task-540-test-name-contract.mjs
bun test tests/unit/workflows/task540SmokeExecutorSecurity.test.ts
```

## Security Contract

No new route or widened visibility exists. Every Custom Screen, content-type, content-
entry, presentation-override, media, and user-settings operation used for fixture
state remains on the existing internal `/admin/api/*` surface. Authentication is the
existing Admin session cookie only; no API-key mode, bearer token, cross-user body
scope, or public mutation is added. The only non-domain HTTP calls are the existing
login/CSRF/bootstrap-auth reads needed to create that same session.

RBAC remains exact to the owning domain contracts: Custom Screen/content-type/content-
entry/presentation-override reads require `content:read`, their mutations require
`content:write`, media reads require `media:read`, and media upload/delete require
`media:write`. User-settings GET/PATCH has no separate widened RBAC permission: it is
strictly self-scoped by the authenticated session, and the optional expected-user ID
may only reject an identity change. Local A/B provisioning uses the exact service
adapter contract below and creates canonical Admin-role memberships only for the
isolated task users; it is not an Admin API or permission bypass claim.

Every unsafe internal HTTP method used here—POST, PATCH, and DELETE—must carry the
shared CSRF token under the private exact configured `security.csrf.headerName`;
hardcoding a logger/header spelling is forbidden. The shared classifier labels internal
GET/HEAD as `admin_read` and internal POST/PATCH/DELETE as `admin_write`, but current
`checkRateLimit()` behavior deliberately returns without consuming either counter for
an authenticated Admin request. The smoke therefore makes no Admin read/write counter
consumption claim. Only its exact enumerated `/auth/*` calls consume the `auth` bucket
and join the frozen auth-rate capacity plan/window barrier. No limiter state or security
setting is skipped, reset, replaced, relabelled, or mutated by the smoke.

All fixed request envelopes and nested Screen section/block/tab/binding objects,
content-type/entry payloads, presentation overrides, user-settings `{value}` payloads,
and media metadata fields retain strict reject-unknown validation before persistence.
Known domain validation codes remain mapped at the existing route boundary; raw values,
DB errors, paths, secrets, and unknown submitted fields never become response/evidence
details. Nonce, HMAC/signature, and reCAPTCHA are not applicable because TASK-540 adds
no public write or anonymous mutation. Tests must prove these existing auth/RBAC/CSRF,
rate-limit, self-scope, and reject-unknown contracts rather than inventing an exception.

Smoke uses uniquely scoped synthetic Screen/content/media/user fixtures, records
their server IDs plus redacted session/setting/override/storage identifiers for
exact cleanup; session resources use only exact non-secret database IDs, never
cookies or session tokens/hashes. The A/B preference baselines are the sole local
fixture exception: strict domain normalization followed by exact
`setUserSetting`/`getUserSetting` service operations, never an Admin API claim or
direct DB seed; cleanup may delete only the two captured composite setting rows.
Storage preflight privately requires exactly one non-empty persisted
`storage.local.dir` row byte-equal to `getStorageSettingsInternal().localDir`, exactly
one persisted `storage.driver` row equal to `"local"` and byte-equal to the resolved
driver, and absent `MEDIA_DIR` plus `MEDIA_STORAGE`; no default/environment fallback
may satisfy it.
As the first fail-closed sub-proof of `set-001-storage-preflight`, before the first
task-User-Agent request, the executor freezes both access-log UUID and audit-log UUID
baselines for the four exact nonce User-Agents, the complete task-session row baseline,
the proof-only complete `site.contentRoutes` row/absence, and the storage DB/root
baseline. The same private sub-proof requires persisted `setup.completed` exact
boolean `true`; no task content-type slug in `site.contentRoutes`; and exactly one
active canonical bootstrap Admin. Without calling `getUserByEmail`, it requires
`emailHash === hashEmail(normalizeEmail(ADMIN_EMAIL))`, `email === emailHash`, a valid
encrypted email that decrypts to the normalized value, and exactly one membership in
the canonical `admin` role with normalized permissions `["*"]`. Missing/incomplete
setup, a first-run wizard, identity/role/email drift, or duplicate row is an
infrastructure failure before host-runner/browser startup. Raw PII, password/encrypted
email, rows, and timestamps remain private.

Every bootstrap UI/API login has a private complete-row read before the request and an
unconditional read in `finally`; a timestamp pair changed before a failed response is
still the newest smoke-owned CAS value. Terminal restoration locks the exact row,
compares every unchanged column/role tuple plus both timestamps (nullable values use
`IS NOT DISTINCT FROM`), restores only `lastLoginAt`/`updatedAt`, and proves the
complete row/roles byte-identical before and after commit. Concurrent drift yields zero
affected rows and fails closed. The proof-only restore record has no delete authority.

Cleanup phase 8 has separately classified reconciliation, CAS, uncertain-outcome
baseline proof, ordinary post-restore proof, and receipt substages. It first seals the
newest smoke-owned timestamp pair, then starts exactly one nullable-safe CAS bridge
write attempt. A validated bridge result follows the existing in-transaction and after-
commit complete-row/role proof. If bridge completion becomes uncertain after that one
attempt may have committed, phase 8 performs exactly one additional read-only complete-
row plus complete-role-tuple comparison with the immutable preflight baseline. It may
accept `already-restored-after-uncertain-outcome` only when that entire read is byte-
identical to baseline, and then performs zero second CAS or other write. A row still at
the newest pair, unknown column drift, missing/duplicate row, or role drift fails closed
without retry or timestamp reconstruction. Runtime-receipt construction is a separate
substage: failure emits only `bootstrap_restore_receipt_failed`, does not erase a proven
restore, and cannot invoke restoration again. Hermetic tests and source mutants cover
commit plus lost output, lost output without commit, exact newest-pair selection, stale-
pair substitution, unknown drift, role drift, zero/two uncertainty reads, every second-
write path, and receipt failure after a proven restore. No post-exit recovery may guess
the consumed run's baseline timestamps.

One append-only resource-ledger builder owns immutable acquisition cores and dependency
edges. A response-lost adapter retains only its pending private attempt and frozen
pre-write baseline; it neither queries nor appends a core during action execution.
Phase 3 alone processes each pending attempt as an independent bounded branch. It
returns every safe validated `acquisitionChannel:"failure-discovery"` delta plus a
per-key failure/block projection instead of throwing away sibling results; it appends
all safe deltas through the same builder, records every failure in the one private
aggregate, and blocks the ambiguous resource's intended parents and their transitive
destructive ancestors without inventing delete authority. It then compiles and
single-assignment-freezes the persistent cleanup plan before the first phase-3 delete,
so an ambiguous pending create cannot prevent cleanup of a known independent resource.
Only after phase 4 has disposed/proved both API contexts and transitioned the same
authoritative `RunState.apiContexts` to its deep-frozen closed state, and exact-UA
audit/access/session polling is stable, may the builder append terminal cores/edges,
compile and single-assignment-freeze the terminal cleanup plan, and deep-freeze the
final ledger plus disjoint union. That phase-5 freeze also creates exactly one final
cleanup plan/dependency graph containing the cross-stage user-to-session/audit/access
edges. Phases 6 and 7 consume that exact final graph by identity while retaining their
already frozen terminal and persistent action plans; a clone, recompilation, or stale
phase-3 graph is rejected. Each persistent, terminal, and final-union expansion
separately requires duplicate-free exact Cartesian equality between
`(resourceKey,operationKind)` pairs and its cleanup-subject keys crossed with the exact
operation-kind set `{provenance,delete,absence}`, plus cardinality `subjectCount * 3`;
bare-key set equality is insufficient and no fixed fixture count substitutes for these
gates. Each frozen persistent or terminal plan is passed by identity unchanged to every
later phase consumer; it is never rebuilt, widened, or re-derived after its gate.
Every final record owns exact provenance, identifier tuple/arity, dense ledger-only
`acquisitionOrdinal`, nullable separate `sourceActionOrdinal`, owner-correlation,
`dependsOn`, separate provenance/cleanup/absence adapters, success/failure cleanup
phase/policy, authorities, and exact operation/schema-ID nullability selected from the
exhaustive `RESOURCE_KIND_CONTRACTS` map. Successful creates register only after strict
provenance reads. At phase 3, a recorded response failure triggers bounded exact
natural-key/composite discovery against its retained frozen pre-write baseline, so a
committed-before-response-failure
user/type/entry/Screen/media/setting/override remains acquired; ambiguity never becomes
delete authority. `P.dependsOn` lists exact child `C` only when deleting parent `P`
could hide `C`; a failed child blocks that parent and every transitive destructive
ancestor, while independent branches and process shutdown retain all errors privately.
Phase 3 also performs two stable, bounded exact-target polls for SEO rows whose target
is one of the six exact fixture Entry IDs. Zero to six rows become individual
`seo-document-entry` children, each with its own exact P/C/A cleanup before its matching
Entry deletion; a foreign target, duplicate document or target, overflow, ambiguity, or
instability blocks all six Entries and their transitive parents. Override cleanup either
performs one exact four-column DB delete for a
present row or, only after the identity-matched acquired -> `ss-005` reset -> `ss-006`
empty-proof receipt chain, emits its three P/C/A actions with a fresh exact absence
probe per action and no second delete. Cleanup phase 3 never PATCHes
`{overrides:[]}` and never relies on a cascade.

Every non-empty authoritative Admin provenance, delete, and absence response is
validated within its bounded API boundary, SHA-256-hashed immediately, and discarded
before any recursive freeze. Only the lowercase 64-hex `observedBytesSha256` value may
enter frozen cleanup state and receipt evidence. The raw `Buffer` never crosses that
boundary; exact response ID and media key/URL checks plus fresh absence proofs remain
mandatory, and `deepFreezeExact` is not weakened or special-cased.

The single `media-row-key` record is the only storage deleter: it invokes the real
media DELETE once, proves exact DB row/file absence, and may remove only upload-created
baseline-absent empty `yyyy/mm` directories with unchanged non-symlink `(dev,ino)`;
pre-existing/changed/non-empty directories remain untouched. All 13 screenshot paths
must be absent at preflight. Each created PNG freezes `(dev,ino)`; success retains and
validates it, while failure unlinks only the same acquired identity and proves
`ENOENT`.

Cleanup is state-aware and exact-once. After successful manifest action `end-007`,
`RunState` already proves the named browser session absent, so phase 1 emits no further
browser CLI command or receipt and only identity-safely removes the already-absent
session's private root. After an earlier failure, phase 1 executes only the still-missing
release/unroute, native route-list, close, and global-list operations, records their exact receipts once, then
transitions that same `RunState` to browser-session-absent. Phase 3 alone consumes each
retained response-lost pending attempt/baseline through independent non-throwing branch
results, appends all safe failure-discovery deltas, records every per-key failure/block,
freezes/gates the persistent plan, and passes that exact frozen plan unchanged to
phase-3 entity cleanup while the bootstrap API context is usable. Phase 4 disposes and
independently proves both isolated API contexts closed, updates/deep-freezes the same
`RunState`, and phase 5 requires both that state and the independent proof before any
terminal poll. Only after all task HTTP stops does phase 5 stable-poll exact-UA
audit/access/session deltas, append terminal cores, freeze/gate the terminal plan and
the single final cross-stage plan/graph. Phase 6 receives the exact terminal action plan
plus the exact final graph; phase 7 receives the exact persistent action plan plus that
same final graph. A failed terminal session/log/access child therefore blocks its exact
synthetic-user parent and every transitive destructive ancestor before proving the
start baselines restored. The proof-only `site.contentRoutes` row/absence remains byte-identical
immediately before each type deletion and after cleanup; drift blocks deletion and is
never overwritten.

Hermetic executor tests cover both phase-1 branches, a mixed phase-3 case with one
ambiguous pending create plus one independently cleanable acquired resource, rejection
of terminal polling while `RunState.apiContexts` is not closed, and terminal-child
failure blocking the exact user. They also reject a cloned, recomputed, substituted, or
stale final graph and any second browser receipt after successful `end-007`.

The repo-owned `_docs/_workflows/task-540-smoke-host.mjs` leads the executor-created
detached group, identity-revalidates and TERM→conditionally KILLs only exact descendants,
and proves descendant/listener absence. It never signals its own negative PGID, claims
its PID/PGID absent, or performs the terminal group proof; the executor owns whole-group
termination and final runner/group/descendant plus 3000/5173/5174 absence. Child
environments use empty maps/allowlists, never full `process.env` or parsed `.env`. The
sole host CLI reads no `.env`/profile/package launcher and spawns backend/Admin/site Vite. TASK-546 owns `package.json`, `core/package.json`, and `bun.lock`; their landed
bytes already resolve Vite 8.1.5 and remain byte-identical/read-only throughout TASK-540. After checkpoint verification, TASK-540 first changes only
`task-540-smoke-host.mjs` Vite 8.1.5 literals, default fixtures, version mutants, self-test expectations, and embedded child-source byte pin, then privately re-audits
Vite 8.1.5 optimizer/readiness before bridge/local-host/schema/CAS/ACK/recovery/prompt/test implementation. After formatting, and with all helper bytes now final,
it computes the final dependent helper
hashes and performs the implement/executor/task/test repins inside the closure
transaction; final preflight validates
the seven top-level entrypoints plus every tracked child owner before the complete
targeted gate.
Browser authority uses a task-owned `0700` temp root outside the repo for
cwd/HOME/TMP/XDG, daemon, config,
and output; its `0600` secrets file contains exactly `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
its executor-created `cwd/.playwright` is the unique private workspace/session
registry, its config pins only supported 0.1.17 keys (Chromium plus `--no-sandbox`,
`codegen:"none"`, and private `outputDir`; unsupported `outputMode` is forbidden), and
its environment pins exact private
`PLAYWRIGHT_MCP_CONFIG`, `PLAYWRIGHT_MCP_OUTPUT_DIR`,
`PLAYWRIGHT_MCP_SECRETS_FILE`, `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`, `CI=1`, and
`NO_UPDATE_NOTIFIER=1`. The repo `.env` is never the browser secrets file. The
installed skill's unavoidable full snapshot links are strictly parsed,
identity-ledgered beneath private output, and removed with all daemon/profile/config/
secret/temp artifacts after session absence on success and failure. Per-action repository snapshots enforce each exact
`repositoryMutationPolicy`: all non-screenshot actions permit no path change, each
screenshot permits its one path, and HEAD/index/`.git` or undeclared changes fail.
The canonical implement workflow accepts an arbitrary initially empty or non-empty
staged baseline only after read-only capture of exact index-file bytes and complete
`git ls-files --stage -z` projection; both must remain byte-identical. Agents never
stage, unstage, reset, stash, or commit.

Native CLI 0.1.17 stdout is parsed by closed byte grammars: open is exactly the Browser
PID header, Page `about:blank` section, Snapshot link, and one terminal LF with no
`### Ran Playwright code` section or blank line; secret fill is exactly one LF byte, tab-new includes
one snapshot while select/close do not, route-list is `No active routes\n`, screenshot
is one exact full-page link, close has its exact two trailing LFs, and the unique
private-workspace global list is exactly `  (no browsers)\n`. Snapshot mode cannot be
disabled. Run-code returns a value directly and is decoded exactly once from canonical
JSON plus one LF; returning `JSON.stringify(...)`, empty/unit output, or a second JSON
layer fails.

Before canonicalization, value-aware
validation scans runtime subjects, fixture/cleanup identifiers and probes, every
browser command (including non-credential run-code), operation descriptor, and output
for raw secret values without rejecting benign prose that only names a security concept.
Linked browser receipts retain bounded sanitized assertion output and actual CLI stdout/stderr
hashes; runtime receipts hash real command/Node/DB/storage observation bytes rather
than sanitized prose. Credential fills retain the manifest's literal symbolic `$...`
references and a discarded-output marker, but the executor never expands a secret
value into browser argv. It sets the controlled browser child's
`PLAYWRIGHT_MCP_SECRETS_FILE` only to the task-owned `0600` two-key private file;
credential-fill argv contains only the allowlisted literal names `ADMIN_EMAIL` or
`ADMIN_PASSWORD`, while synthetic email fills contain their exact non-secret fixture
strings. Login credentials are read privately from the existing repo env into memory
and serialized only into that private file, never sourced by the public browser command
recipe, printed, placed in `/proc/*/cmdline`, or persisted in smoke evidence.
All non-empty classified secret-like environment values (including short values via
boundary-aware matching) join the private corpus. Raw smoke failure results, full-gate
summaries, findings, and every other structured agent result are scanned before reuse.
Accepted schema-valid audit findings retain their fixed lens ID and complete ordered
finding set in one parseable, sensitivity-rechecked intervention diagnostic whenever any
finding belongs to the orchestrator; mixed leaf findings remain visible and no fixer runs
before that stop. Rejected dispatch/schema output and any unsafe intervention projection
are discarded behind a generic label-only error. A still-non-clean second round also
stops with the complete ordered sensitivity-rechecked finding set, including a leaf-only
residual. The complete created changelog is scanned before its canonical block is
byte-verified.
The local non-Git validation runner accepts only the exact repo process-control names
`PATH`, `BUN_OPTIONS`, and `NODE_ENV`, then centralizes their value check in the fixed
projection: identical `HOST_FIXED_ENV` values pass and any different value fails. Every
other repo process-control key is rejected. Ambient `CI` may be absent, `1`, or `true`;
all three project to fixed `CI=true`, while any other inherited value fails. Commands use
fixed `PATH=/usr/local/bin:/usr/bin:/bin` plus `BUN_OPTIONS=--no-env-file`; the sole
full-test exception remains exactly the three
pinned explicit `.env` source operations in the existing `test`, `test:bun`, and
`test:vitest` scripts. Hermetic workflow self-tests use synthetic repo/environment
authority and never parse the real `.env`. Bun, Node, Git, and repo-local TypeScript
targets are absolute identity/hash-pinned and revalidated before launch; observational
Git—including validation `git diff --check` children—has its own minimal no-secret
environment and fixed external-diff/textconv-disabled argv. All executable identities
are revalidated before launch; the sole user-owned TypeScript target also rechecks its
SHA-256 at each boundary. Stable no-follow reads bind
bytes plus `dev/ino/mode/nlink/size/mtime/ctime` for the initial `.env` parse, index,
worktree, untracked set, every prompt-carried TASK-540 status file (including Git-clean
files), and all root `.env*` projection at every command,
agent, smoke, and terminal workflow boundary; `.env*` means every root name beginning
`.env`, with a 64-entry bound. The smoke executor is dynamically loaded once only after
the exact no-follow file identity and the one final post-repair SHA-256 shared verbatim
by TASK-540-06/L01 and `FROZEN_SMOKE_EXECUTOR_SHA256` pass. The recovered and historical
hashes are not live authority. The final identity/hash must still match after import,
after full validation, and immediately before the one-shot call; any subsequent executor
or implement-workflow byte change invalidates finalization and restarts the targeted
gate.
Before any closure status mutation, the evidence owner writes and byte-verifies one
strict canonical control anchor in the existing changelog index plus changelog 1252's
redacted smoke block. The anchor binds its evidence SHA-256, generation, board baseline,
the fixed safe changelog path above, the SHA-256 of the closure-leaf gate value, exact
pre-closure collaboration-ledger count/hash, and the byte-identical ordered safe prefix.
It remains independent regeneration authority if the changelog file is missing; a
digest without the prefix is insufficient. It may carry one exact old-gate -> Repair
Pending -> successor-gate authorization during closure-leaf repair.
The three active closure contracts then persist identical
Closure Pending, Closure Board Baseline, and Closure Changelog Path receipts. A restart
must compare their status-owner state against that independent control rather than
recapturing it. Sibling status authority is phase-derived, not inferred from current
repair prose. While changelog 1252 and its exact sealed 20-ID Tasks line are absent,
the pre-1252 authority requires all 20 physical contracts to remain In Progress; each
landed implementation leaf has its matching behavior receipt and, for each of the eight
modularity owners, exactly one `Modularity Repair Revalidated` receipt with no remaining
`Modularity Repair Pending`; no leaf has a `Completed` field. While any modularity
pending field remains, closure authority cannot be created. The evidence owner must
create and byte-verify changelog 1252
and that exact Tasks line before one status transaction prepares twelve leaves, then seven
children, then root. Before publishing any target, its own prepared/fsynced 21-target
status journal binds exact old/new bytes, modes, paths, and hashes for all 20 task
contracts plus `_docs/_TASKS/README.md`; it replaces the twelve leaves, seven children, and
root in that order and commits the board row/statistics last as the sole status commit
point. Restart rolls that complete 21-target set back or forward from the board hash.
This journal is distinct from and precedes the later five-target terminal journal. It
atomically publishes all 20 Done/Completed transitions with the board delta against the
same evidence hash. After that atomic transition, the
post-1252 authority is the sealed changelog/control evidence and all 20 covered
contracts are Done/Completed. A restart first determines which of those two phases the
sealed evidence proves and validates only that phase's graph. The status registry,
closed inventory, validators, execution, and recovery all include exact
`status.rollback-prepared.json`. Every failure after the 21-target board commit reuses
the still-prepared status journal and durably fsyncs that marker before the first old-
payload restoration. Marker presence overrides the board hash and forces convergence
to all 20 task old bytes plus the board old bytes last. No partial per-file status
mutation or second status transaction is permitted; ordinary owner repair may start
only after the complete old generation's bytes, modes, and hashes are verified.
Hermetic execution tests and exact crash mutants inject at marker
durability and every reverse-restoration old-payload write,
file-fsync, rename, and parent-fsync boundary; every restart must converge to that same
board-last all-old generation.
Final closure-drift agents append only higher dense ledger entries. After their last
clean result, dispatch freezes permanently for the generation and the root recomputes
every actual request/task-name/result/procedure correlation before accepting the
terminal receipt. Before `/tmp` ledger cleanup, one separate prepared/fsynced terminal
journal binds exact old/new bytes for exactly five targets—changelog 1252, TASK-540,
TASK-540-06, TASK-540-06-L01, then `_docs/_CHANGELOG/README.md` last—replaces both
durable prefixes with the complete safe projection, persists matching terminal
count/hash and exact terminal-domain receipt, recomputes the evidence hash, and updates
the three closure-task evidence receipts. The changelog-index anchor is its sole commit
point. Restart uses that index's old/new hash as the rollback/roll-forward decision and
never substitutes the earlier status journal. A caught terminal verification failure
enters the universal post-status failure path: it first durably fsyncs
`status.rollback-prepared.json`, restores the five terminal targets with the changelog
index last, then reuses the still-prepared status journal to restore and verify the
complete 20-task-plus-board old generation with the board last before cleanup. The
final local mechanical gate verifies the durable terminal bytes, then the root repeats
the transcript-correlation review; no agent call after freeze or cleanup before both
passes is legal.

```text
Tasks: TASK-540, TASK-540-01, TASK-540-01-L01, TASK-540-02, TASK-540-02-L01, TASK-540-03, TASK-540-03-L01, TASK-540-04, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06, TASK-540-06-L01, TASK-540-07, TASK-540-07-L01, TASK-540-07-L02
```

Every shared board/index mutation preserves an orchestrator-captured projection of all
unrelated rows and bytes after both success and dispatch failure. Only TASK-540's board
row/statistics, the exact 1252 row/reservation prose, and the exact TASK-540 control
anchor are mutable.
