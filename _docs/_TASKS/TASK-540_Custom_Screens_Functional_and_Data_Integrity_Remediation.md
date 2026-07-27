# TASK-540: Custom Screens Functional and Data-Integrity Remediation

# FileName: TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md

**Priority:** High
**Category:** Custom Screens / Admin UI / Accessibility / Cache / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-496, TASK-498, TASK-500, TASK-503, TASK-505, TASK-543 (program order)
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Modularity Repair Revalidated:** 2026-07-17 — eight source-owner modularity repairs and exact gates passed.
**Repair Started:** 2026-07-16
**Current Closure Repair Started:** 2026-07-23
**Current Closure Repair State:** All source-owner repairs remain landed. The
owner-directed behavior-preserving smoke modularization phase — split the smoke executor
and scenario infrastructure into cohesive modules of at most 1,000 physical lines
without adding hardening, changing the frozen smoke contract, or returning to runtime
diagnosis — is **complete**. Checkpoints `f22eee9f` through `8259a326` extracted the
shared observation and visible-assertion sources, all seven scenario owners, and the
simple browser invocation owner; a further 111 commits ran from `8259a326` to
`c89fa96c` (`git rev-list --count 8259a326..c89fa96c`), of which `b8170be1` moved the
executor self-test body out of the facade entirely. Re-measured with `wc -l` at HEAD `a68a19e0` on 2026-07-27: the executor facade
is **976 lines**, `task-540-smoke-contract.mjs` 13, `task-540-smoke-host.mjs` 84, and
the largest of the 162 child modules under `_docs/_workflows/task-540-smoke/**` is 964,
with none above the limit. The remaining order is therefore targeted and full gates ->
helper restart plus one canonical seven-flow Playwright CLI smoke with 13/13 screenshots
and deterministic cleanup -> changelog/status closure -> integration into
`feat/implementations`.
**Current Codex Collaboration Directive:** 2026-07-24 — Codex agents are the only
reviewers/implementers used for remaining work. The tracked Codex bridge and local
orchestrator are landed; Claude invocation and fallback are absent from the current
workflow and closure path.
**Current Smoke Module Ownership:** The seven top-level helper/facade paths remain the
public workflow bundle. That seven-path contract does not forbid implementation
modules: cohesive tracked owners under `_docs/_workflows/task-540-smoke/**` are part of
the same TASK-540 smoke implementation, must each remain at most 1,000 physical lines,
and join tracked-parity, diff, formatting, and line-count validation. The executor
self-test must also prove exhaustive, non-overlapping action-to-scenario ownership for
the current manifest, including enumerated related-cache and responsive-users owners,
so no omitted registry member silently falls through to a shared builder.
**Current Fresh-Target Changelog Projection Repair:** 2026-07-23 — after the committed
TASK-548 board/changelog state was merged into the isolated TASK-540 worktree, the
canonical Start gate stopped before agent, server, browser, fixture, or closure mutation
because the TASK-540 index projection incorrectly included the independent 1260/1261
reservation sentence in its mutable prose slot. The ignored implementation helper and
tracked structural regression now contain TASK-540-06/L01's fail-closed correction at
the exact pre-bridge checkpoint: mask only the unique canonical TASK-540 reservation
sentence or consumed two-sentence pair, preserve every following reservation byte, and
reject duplicates, malformed/interposed state, or escaped 1252/neighbor contradictions.
Those bytes still await the combined targeted gate and are not a current receipt. The
stopped invocation produced no smoke or closure evidence.
**Current Closure Board Checkpoint:** Merge HEAD
`aaf7e6dbd13fe51d5ab00cfc5dbcaa5e44b60d01` synchronized `feature/tasks-fixes`
with committed `feat/implementations` and observed To Do 409 / In Progress 7 / Done 3116.
TASK-540's isolated expected delta is 409 / 6 / 3117, but this is only a
checkpoint: closure must read the board and changelog index fresh and derive the same
single-family delta from whatever unrelated agents have landed.
**Local Workflow Recovery Authority:** The operational workflow set was historically
recovered locally, without staging, from commit
`3d5604ecfdeaa9c4d5ef32c1314b838a793441ad`. Its six historical helper hashes match
TASK-540-06/L01's pre-bridge checkpoint; recovery remains verification-only and must not
restore, replay, or overwrite repaired bytes. The seven top-level helper/facade paths
and every cohesive child module under `_docs/_workflows/task-540-smoke/**` must be
tracked and clean-checkout reproducible without changing the broad
`_docs/_workflows/` ignore rule. TASK-540-06/L01 owns the top-level set, child-module
ownership, historical provenance, final repins, and tracked-parity rules. TASK-545
retains ownership of repository-wide workflow policy and durable screenshot manifests.
**Current Vite Authority:** TASK-546 owns `package.json`, `core/package.json`, and
`bun.lock`; their landed bytes already resolve Vite `8.1.5` and remain
byte-identical/read-only throughout TASK-540. Before any bridge or combined targeted
gate, TASK-540-06/L01 changes only the smoke-host implementation's exact version
literals, default fixtures, version mutants, self-test expectations, embedded
child-source byte pins to `8.1.5`, then privately re-audits and revalidates the
optimizer-readiness shape against that exact version. That revalidation, the bridge
implementation, the formatting and every helper byte are final, so the dependent helper
hashes and implement/executor/task/test pins are recomputed inside the closure
transaction. No other current Vite authority is permitted.
**Required Post-Repair Codex Collaboration Host Authority:** After the no-Claude
bridge/local-host/schema/CAS-ACK/recovery/prompt/test implementation lands, receives its
final repins, and passes the combined targeted gate, one continuous canonical
`task-540-local-orchestrator.mjs --run` process must retain every repository snapshot,
exact rollback, validation command, server, Playwright, fixture, evidence, and exact-one
smoke authority. Until then, `--run` must fail closed or remain withheld before agent
dispatch. The coordinating external root launches exactly one outer
`node _docs/_workflows/task-540-local-orchestrator.mjs --run` child from the verified
root with `shell:false`, `detached:false`, and private non-TTY pipe stdin/stdout. It
never launches a request/recovery bridge child. The landed host may delegate only
schema-bound audit/fix reasoning through the task-scoped helper
`_docs/_workflows/task-540-codex-agent-bridge.mjs`, which remains one of the seven
top-level tracked entrypoints. Cohesive smoke child modules are internal implementation
owners, not additional public entrypoints. That continuous `--run` host alone owns
every request/recovery bridge child launch.

The root consumes the one private canonical-LF notification
`{deadlineAtEpochMs,requestDir,requestId,sequence}` and sends all later control traffic
only through that same outer host's private stream. `controlCore` is exactly
`{command,controlId,controlOrdinal,payload,requestId,sequence}` and
`controlReplyCore` is exactly
`{command,controlId,controlOrdinal,requestId,result,sequence,status:"ok"}`. Exactly one
command may be in flight. `controlOrdinal` is dense positive, `controlId` is an
independent random 128-bit lowercase-hex value, and `command` is exactly `inspect`,
`respond`, `status`, `wait`, `procedure`, `recover-review`, or `abort`. The first five
commands bind non-null `requestId` and `sequence` to the notified request; `abort` and
`recover-review` use both as null. `payload` is null exactly for `inspect`, `status`,
and `wait`; `respond`, `procedure`, and `recover-review` carry only their exact
leaf-defined payloads, while `abort` carries exactly `{reason,review}`, with `reason`
from the closed `abortCore` enum and `review` the complete task-name-free
`recoveryReviewCore`. `abort` is handled entirely by the host and never
launches a bridge child. Reply correlation repeats the command, control ID, ordinal,
request ID, and sequence exactly. Each complete input or reply frame, including its
sole LF, is at most 8,454,144 bytes. Both endpoints parse and re-encode before acting,
reject noncanonical encodings, unknown or duplicate fields, out-of-order or replayed
commands, pipelining, and extra bytes, and never echo a raw frame or accept an argv,
environment, file, socket, TTY, or inherited-descriptor alternate transport. An
explicit valid framed `abort` is the sole controlled-abort path: the host freezes
dispatch, validates the live-root review, seals and cleans the aborted generation,
sends the correlated reply, and exits; the external root then proves the host absent.
Unframed EOF, root loss, or control-transport loss instead freezes dispatch, terminates
and proves absent only provable exact child state, preserves all journal/request/ledger
evidence, and exits nonzero. A fresh external root must prove the old host absent and
enter raw recovery; it may not retroactively abort, reconnect, resume, or adopt the
generation, and a missing private transcript map blocks cleanup. Root alone may win
the operator claim and mediate dispatch; the local timeout contender may instead win
the sole pre-claim timeout claim, cancel without dispatch/procedure, and produce the
exact nondispatch ledger state.

Every bridge child launched by that continuous host is parent-armed under one dense
launch ordinal. The fixed journal uses the leaf's exact
`launch-<zero-padded-12-digit-launchOrdinal>.planned.json`, `.armed.json`,
`.cleanup-started.json`, and `.cleaned.json` records and its exact
`helper-launch-planned` -> `launchPlannedSha256`, `helper-launch-armed` ->
`launchArmedSha256`, `helper-launch-cleanup-started` ->
`launchCleanupStartedSha256`, and `helper-launch-cleaned` -> `launchCleanedSha256`
domains/cores. The host writes and fsyncs the plan before spawn. Before arming, the
child may parse only the bounded private bootstrap and MUST NOT stat, open, read, write,
or derive `requestDir`, the fixed journal, or repository state. The host then writes
and fsyncs the exact positive PID/start identity in the armed record before sending one
exact `GO` frame through the private control pipe. EOF before `GO` exits silently with
a nonzero status and no request/journal/repository access or output. Only after valid
`GO` may the child enter its exact mode; `response.started.json` and
`cancel.started.json` remain the only request contender-start records.

A planned-without-armed launch is never request-capable and can never later gain
request/journal/repository access because `GO` was impossible. That fact does not claim
the PID, start identity, or physical absence of an unarmed pre-exec process. The bridge
module's sole export is the narrow host-only in-process pre-arm primitive
`sweepPriorBridgeLaunchesForRecovery`; it is not a CLI mode, cannot execute a
request/recovery mode in process, and has no request/root-payload or cleanup authority.
In a fresh recovery-only host it validates the complete prior launch-record set,
terminates only exact still-live armed PID/start identities, and proves every prior
armed/request-capable helper absent. It returns exactly
`{...priorHelperSweepCore,priorHelperSweepSha256}`, where
`priorHelperSweepCore={launches,runSha256,schemaVersion:1}` and `launches` is dense,
prior-ordinal ordered, and contains only exact
`{launchArmedSha256,launchOrdinal,launchPlannedSha256,state}` items. `state` is
`armed_absent` with a non-null armed digest or `planned_unarmed` with a null armed
digest; the sole mapping is `recovery-helper-sweep` -> `priorHelperSweepSha256`.
`helperLaunchArmedCore` is exactly
`{launchOrdinal,launchPlannedSha256,mode,moduleSha256,priorHelperSweepSha256,processId,processStartTime,worktreeSha256}`;
its sweep digest is null for the five request modes and exact non-null only for
`recover-review`. GO is exactly
`{command:"GO",launchArmedSha256,launchOrdinal,launchPlannedSha256,priorHelperSweep}`,
with `priorHelperSweep` null for the five request modes and the exact sweep envelope for
`recover-review`. Only after this preflight may the host plan, arm, and GO its
`recover-review` controller. Before recovery-payload access, that child exact-set
verifies every prior launch ordinal, excluding only its own new ordinal. A crashed
controller joins the next fresh host's prior-launch sweep. An exact bounded current-UID `/proc` scan keyed to canonical
module/mode/request/launch authority is only additional absence evidence and never
authorizes signalling an unknown or mismatched result. The handshake and recovery
primitive add no child CLI mode: the direct bridge modes remain exactly `--self-test`,
`--inspect`, `--respond`, `--status`, `--wait`, `--procedure`, and
`--recover-review`.

Operator/timeout election uses one hard-link no-overwrite CAS. `claimCore` is exactly
`{claimId,claimOwner,deadlineAtEpochMs,deadlineMonotonicNs,decisionMonotonicNs,requestId,requestSha256,schemaSha256,sequence}`.
Operator is eligible only when `decisionMonotonicNs < deadlineMonotonicNs`; timeout is
eligible only when `decisionMonotonicNs >= deadlineMonotonicNs`, so equality is timeout.
A contender creates its candidate at `nlink=1`, links it without overwrite to the fixed
claim path, verifies the same inode at `nlink=2`, unlinks its candidate, and verifies the
claim at `nlink=1`. `EEXIST` validates and joins the published winner and cleans only
that contender's distinct losing candidate; it never overwrites or removes the winner.
TASK-540-06-L01 owns the exact six crash rows—empty, candidate(s)-only, claim-only,
claim plus same-inode candidate, claim plus distinct loser(s), and claim plus both—as
well as every row and claim-boundary mutant.

After an operator claim, root starts one fresh non-root collaboration agent with
`fork_turns="none"` and relays its exact result plus root-attested,
transcript-correlated procedural receipt through the pinned host-stream
notify→inspect→status/wait→respond→procedure protocol. Only spawned non-root
collaboration agents
are forbidden from receiving the bridge path or request/claim IDs, environment or
`.env` material, raw patch/content/log bytes, credentials/session material, or user
data; each receives only the safe policy, prompt, and result schema. No spawned non-root
agent may start a server, browser, or smoke.

Schema identity must be registered once in-process; RESULT/AUDIT are read-only,
registered MUTATION is the sole mutating class, and GATE, clones, unknown schemas, or
post-registration schema-object mutation reject. The exact transcript result digest is
bound through response, procedure, settlement, and ledger evidence. A claimed request
whose spawn fails records exact `dispatchStatus:"spawn_failed"` in its procedure/ledger
without invented task identity or retry; a first cancellation start strictly before the
deadline settles with `error:"dispatch_failed"`, while equality/after or an
already-started deadline cancellation settles with `error:"deadline_exceeded"`. Pinned
monotonic checks at inspect, response start, and pre-CAS plus no-overwrite CAS enforce
timeout; the root's `interrupt_agent` is procedural closure evidence, not a hermetic
local-test claim. The independent changelog-index anchor and changelog evidence both
retain the safe ledger prefix.

Only the explicit framed `abort` command may controlled-abort a pre-terminal
generation. It freezes dispatch, consumes the live root's final review of the available
actual request/task/result/procedure correlations plus its reason, seals the safe
projection under the exact abort hash in a prepared/fsynced journal, and then
identity-cleans only the listed bridge run-ledger entries before reply and host exit.
Raw process-crash or unframed transport-loss recovery is a separate cleanup-only path.
Its fixed private per-worktree Git-dir run journal is prepared and fsynced before the
first bridge-owned random `/tmp` request-directory or run-ledger artifact and durably
plans each such identity before creation. Thus the no-undiscoverable-artifact claim is
strictly limited to bridge-owned request/ledger artifacts; it does not claim raw-crash
durability for smoke/browser/server/fixture artifacts, general host temporary state,
or a reusable partial smoke.

Before raw recovery may remove request bytes, the fresh external root proves the old
host absent and the recovery-only host completes the prior-helper sweep above. Recovery
also validates each durable response/cancel start's exact positive
PID/start/role/module/worktree identity. It sends SIGTERM only to an exact still-live
helper PID and waits at most five seconds, then sends SIGKILL only if that same identity
remains and waits at most five more seconds; a recycled or mismatched process is never
signalled. Every recorded local start identity must be proven absent. Root then supplies
the exact task-name-free procedural review through the host-stream `recover-review`
command for every journal-planned request; for each still-live mapped collaboration
task, root first calls `interrupt_agent` and boundedly proves it stopped. A missing
private transcript map, missing or mismatched review, failed termination, or missing
absence proof retains the journal, request, and ledger evidence.
After exactly one final agent-backed closure-drift pass returns clean, agent dispatch
freezes permanently. The root first recomputes every actual transcript correlation;
then the exact terminal hash binds the complete projection and pre-closure fields, and
a prepared/fsynced five-file transaction commits the changelog-index anchor last so
restart can roll back or forward. A final local mechanical gate and repeated root
transcript review must both pass before local ledger cleanup, and no agent call is legal
after the freeze. Every failure after the 21-target status commit reuses that
same still-prepared status journal; no partial per-file status mutation or second
status transaction is legal. Before the first old-payload restore,
the host creates and fsyncs exact `status.rollback-prepared.json`, whose envelope uses
domain `status-rollback-prepared`, digest field
`statusRollbackPreparedSha256`, and core exactly
`{manifestSha256,transactionId}`. Once present, that marker forces convergence to the
complete old generation regardless of the current board hash. A terminal failure first
restores the five terminal targets with the changelog index last, then every failure
restores all 20 TASK-540 task files plus `_docs/_TASKS/README.md` from the status
journal, with the board last as rollback commit point. Ordinary repair may start only
after all 21 old payloads are byte/mode/hash verified. Crash mutants cover the rollback
marker creation/fsync and every reverse payload write, file fsync, rename, and
parent-directory fsync. TASK-540-06-L01 owns the exact frames, domain-separated hash
cores, contender-start/settlement/acknowledgement bindings, procedure ledger, schema
validator, recovery matrices, and mutants. “No concurrent writer” covers the local
single-flight and other root-authorized TASK-540 writers; arbitrary same-UID drift is
detected by snapshots. The bridge is coordination rather than malicious same-UID OS
isolation, so existing postchecks and rollback remain final authority.
**Historical Pre-Overflow Repair Reason:** The final sequential post-audit stopped before smoke on evidence-backed drift. R01 owned scoped malformed-binding recovery, one-pass legacy orphan filtering, collision-safe id-less legacy generation, explicit-ID-only Assistant composition, stored duplicate-ID fail-closed proof, and metadata-PATCH preservation. L03 owned single-media override eligibility across service and Entry Editor plus canonical import placement. L01 required every Canvas region name, L02 completed both sides of the authenticated A/B self-scope proof, and L04 owned the binding-flow expectation that consumes the shared binding-ID helper. Earlier R01/L02/R03 strict-ID, Tab-label, and zero-Tabs repairs remain durable; the later repair reason at that checkpoint was the L03 overflow state recorded below.
**Historical Pre-Modularity Repair Revalidation:** 2026-07-16 — against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus the exact dirty paths recorded by each leaf, core/root static gates passed; expanded R01 changed suites passed 81/81, six-file Vitest 176/176, route/Assistant Bun 93/93 with 576 expectations, isolated route 20/20 with 118 expectations, and document ops 11/11; L03 then retained Vitest 258/258, cacheBus 22/22, and the then-current pre-split routes 20/20 with 118; L04 passed isolated 3/3 and its ten-file matrix 98/98; TASK-540-05-L01 then retained 16/16; TASK-540-05-L02 then retained Vitest 66/66, Bun 27/27 with 165, and user-settings 10/10 with 64; DB preflight, workflow self-tests, and diff checks passed. R01/L03 route evidence is pre-modularity-split only. This historical targeted receipt was superseded by later owner receipts, themselves superseded for L03's behavior gate by the later overflow repair, and claims no closure result.
**Historical Pre-Overflow Post-Audit Repair Revalidated:** 2026-07-17 — after the third one-shot post-audit stopped before full validation and smoke, L04 switched from synthetic source projection to genuine production-file assertions and gained an exact five-module structural verifier; L03 removed a dead fixture and tautological continuation comparisons; closure pinned the aggregate expected ID independently and narrowed the grounded-path false-positive exception without weakening non-negotiable sensitive-path rejection. Focused static/test/line/workflow gates passed, and two fresh scoped audits reported 0 HIGH/MEDIUM/LOW findings. At that checkpoint the mandatory fresh five-lens family post-audit and all later closure gates remained pending; the later L03 overflow repair superseded its behavior-gate state.
**Historical Pre-Overflow Subsequent Post-Audit Repair Revalidated:** 2026-07-17 — the next complete five-lens run stopped before full validation and smoke and produced five deduplicated actionable groups. R03 restored compile-time fixture typing and corrected receipt order; L03 collapsed duplicate content-type reads and bounded 201-ID media plans without weakening the strict decoder; closure restored the final 15-file L04 read-only gate. Core/root static gates, R03 89/89, L03 258/258, L04 98/98, all-family name/body fingerprints, the family line gate, workflow self-tests, and diff checks passed. At that checkpoint a clean five-lens rerun and all later closure gates remained pending; the later L03 overflow repair superseded its behavior-gate state.
**Historical Pre-Overflow Scoped Audit Follow-up Revalidated:** 2026-07-17 — R03 restored the prior assertion-free shallow fixture-freeze contract and L03 removed the last then-current reference to its superseded 12-file handoff. Exact 89/89, static/name/line/format/diff, then-prepared-resume, final 15-file workflow checks, and two fresh audits with 0 HIGH/MEDIUM/LOW findings passed. That checkpoint still required a clean five-lens rerun, repository-wide validation, Playwright smoke, changelog 1252, and atomic closure; the later L03 overflow repair superseded its prepared-resume state.
**Historical Pre-Overflow Start-Gate Semantic Repair Mechanical Revalidation:** 2026-07-17 — the historical corrective workflow was inert, all then-current gate/count/date/reserved-state receipts matched the then-landed tree, and safe semantic start errors were no longer discarded; exact workflow/prepare/line/helper/format/diff checks passed. That checkpoint still required a semantic audit and all later closure gates; the later L03 overflow repair superseded its prepared-resume state.
**Historical Pre-Overflow Runtime Smoke Preflight Repair (preflight-only call):** the one-shot executor call correctly failed closed before helper or browser launch after the otherwise-green full gate exposed destructive shared-settings teardown. TASK-540-06/L01 then added exact settings snapshot/restore, baseline hashes around both its targeted settings-hygiene run and the full gate, persisted local-storage/core-cwd enforcement, and the corrected exact field-option selector. The consumed call was diagnostic only and produced no live browser evidence; it did not authorize closure.
**Historical Pre-Overflow Post-Audit Selector/Scope Repair:** a later fresh five-lens post-audit stopped before full validation and smoke because the media option action targeted `Media asset` while the real humanized UI renders `Media Asset`, and because closure had restructured one legacy settings behavior test beyond its state-isolation exception. TASK-540-06/L01 then pinned the rendered media label with a self-test and restored the unrelated behavior test shape; that checkpoint still required fresh gates and closure.
**Historical Pre-Overflow Runtime Smoke Failure-Action Observability Repair:** the next canonical Start gate, five-lens post-audit, complete full validation, release/security gates, and workflow checks passed; the one-shot smoke then returned the generic fixed failure after starting the repo-owned helper but before any provable successful bootstrap login. Deterministic cleanup restored the exact protected settings baseline, removed every browser/session/listener/screenshot, and preserved the staged snapshot. Because the old boundary erased even the non-secret manifest action ID, this is diagnostic evidence only. TASK-540-06/L01 then added an exact post-cleanup two-key diagnostic line containing only the fixed code and allowlisted active action ID while keeping the thrown failure shape unchanged; that checkpoint did not authorize closure.
**Historical Pre-Overflow Failure-Action Diagnostic Self-Test:** at that checkpoint the final executor self-test passed 490 actions and 196 negative cases with a caught synchronous stderr write, including `EPIPE`, `EBADF`, and partial-write containment. The later L03 overflow repair superseded the prepared closure state, not this durable diagnostic behavior.
**Prior L03 Overflow Repair Revalidated:** 2026-07-18 — TASK-540-04-L03 restored canonical `Implementation Complete` and replaced its exact `Repair Pending` with `Revalidation Passed: generation 71b1c73b899a4ab4be94690ce387f28e / token ff99adec779348e796d56df5dbda3627 / gate green`. At that checkpoint the canonical resolver was prepared with all ten leaves landed and no remaining implementation leaf; TASK-540-06-L01 retained its exact `reserved-pre-closure-regated` receipt. Later R01 and post-audit work supersede only that prepared-resume claim, not the recorded L03 gate.
**Historical R01 Stored-Read Repair Revalidated:** 2026-07-19 — TASK-540-01-L01 replaced `Repair Pending: generation 28bd5c90c7fd485eabc0c611d5e34752 / token 0237fd1a85b54c7e80e46c0eaac5477d` with the exact matching gate successor and restored canonical `Implementation Complete`; TASK-540-01 mirrors that completion state. The later selector-inclusive R01 receipt supersedes this as current owner-gate evidence.
**Historical 2026-07-19 Post-Audit Intervention:** 2026-07-19 — one complete five-lens round stopped before full validation and smoke. The verified correction was a four-owner dependency chain: R01 appended one Bun-free, precisely returning first-media-UUID selector to `screenMediaIdentity.ts` and extended its existing UUID test declaration; R03 consumed that selector in the runtime renderer; L03 consumed it in Entry presentation media, gave every Entry Presentation control a programmatic name, and replaced its hand-built records-workspace href with the canonical helper; L04 gave every Screen Settings control a programmatic name. The failed L03-only attempt was fully reverted and remains diagnostic evidence that a pure L03 owner must not import the R03 admin/UI model. All four implementations landed in dependency order, the L01 compatibility test followed, and all five exact owner re-gates were green at that checkpoint. A fresh clean family post-audit remained required before full validation.
**Historical Four-Owner Implementation Evidence:** 2026-07-19 — R01 landed as `f8e916b9255677352a2ed2fef9bd73093dec5683`, R03 as `596ede31d17c65168510baf6b478696e3d345377`, L03 as `46759bcea211c39a708ed424f749efe2343a56b3`, and L04 as `204fd1de0f129f73976f577f420acbdac5316dea`. These commit identities record source/test provenance only; they are not generation/token receipts and do not claim full validation, smoke, changelog, or closure.
**Current L01 Compatibility Evidence:** 2026-07-19 — commit `7a393dcc7aaf454fee582ce7745073768e0e131b` reopens the one-shot Insert palette before the existing second insertion assertion, while commit `204fd1de0f129f73976f577f420acbdac5316dea` assigns that test exclusively to TASK-540-05-L01. The insertion target and ordering assertions remain unchanged; this is implementation provenance, not a current owner-gate receipt.
**Historical 2026-07-19 Focused Validation Evidence:** all five dependency-ordered owner gates passed at that checkpoint. R01: schema 77/77, document operations 43/43, exact Vitest 210/210, routes 21/21, Assistant 73/73, combined Bun 94/94, and DB/static/name/line/workflow checks. R03: isolated 22/13/24/13 and combined 89/89. L03: expanded 258/258, L04 read-only consumers 98/98, and routes 13/13. L04: isolated 6/13/8/9 and combined 98/98. L01: isolated 7/7 and 10/10, combined 29/29. Full-family line, prepared-resume, workflow, and diff checks passed.
**Current Receipt Synchronization State:** R03's current 2026-07-20 authority is exactly
`Revalidation Passed: generation 90d5543e1773459aaf7893aec3f24c57 / token a837a8a8a8fa442dbae7656abb3e88ac / gate green`
for its unchanged exact 89/89 renderer contract. Its separately current auxiliary
dead-code receipt proves the independent 6/6 gate, unchanged renderer fingerprints,
sole-writer/153-line contract, workflow checks, and diff check. The 2026-07-19 R03
selector-consumer commit and its selector-inclusive gate remain historical
implementation provenance. R01, L03, L04, and TASK-540-05-L01 retain the current
authorities recorded in their own leaves. The clean five-lens family post-audit and
full validation remain pending.
**Current Mechanical-Gate Correction:** the protected-name `current` mode now applies the same exact additive callback-preservation contract as `final` mode for `userSettingsRoutes`; it still preserves all names, partitions, retained statements, producer/result assertions, and support-module boundaries. This removes the deterministic current-mode false failure without weakening or re-baselining the changed body SHA.
**Prior Repair Revalidation:** 2026-07-16 — before the composer and L04 provenance findings, HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus the then-recorded dirty paths passed core/root static gates; R01 Vitest 168/168, route/Assistant Bun 92/92 with 568 expectations, route 19/19 with 110, and ops 11/11; L03 Vitest 258/258, cacheBus 22/22, and L04 consumer matrix 98/98; L01 16/16; L02 Vitest 66/66 and Bun 27/27 with 165 expectations; user-settings 10/10 with 64; DB preflight; binding-flow 3/3; workflow self-tests; and diff checks. This evidence is historical for the expanded contract.
**Historical L03 Repair Started:** 2026-07-15
**Historical L03 Repair Reason:** Closure validation reproduced one logical remote cache event twice when canonical and legacy BroadcastChannel/storage transports delivered the same serialized event, and contract audit required direct-image route-boundary coverage at the strict write seam. TASK-540-04/L03 was the sole scoped repair owner with exactly three writable paths: `core/admin/utils/cacheBus.ts`, `tests/vitest/admin/cacheBus.test.ts`, and additive direct-image regressions in `tests/integration/routes/customScreensRoutes.test.ts`; `core/server/routes/customScreenRoutes.ts` and every other production route/UI/client/service file remained read-only. That repair passed its focused and dependency-shaped gates on 2026-07-15, and its exact `Repair Pending` receipt was replaced by the matching `Revalidation Passed` successor. L03 and every other then-landed source leaf remained `🚧 In Progress` with `Implementation Complete` awaiting family changelog 1252, while post-audit, full validation, live smoke, and atomic closure remained pending.
**Historical L04 Repair Started:** 2026-07-15
**Historical L04 Repair Reason:** Mandatory repository-wide `bun run test` confirmed that `screen-editor-sections.test.tsx` fully mocked cacheBus without the fresh-symbol factory required by the L04-owned Screen builder Save path. TASK-540-04/L04 completed the additive mock repair and exact six-file/66-test re-gate; at that historical phase closure resumed and every source descendant was Done, before the later L03 duplicate-delivery finding paused closure again.
**Historical Repair Started:** 2026-07-14
**Historical Repair Reason:** Repository-wide Bun validation confirmed one stale Assistant Custom Screen block-patch fixture using unsupported strict-V4 block kinds. TASK-540-01/L01 alone owned that fixture-only compatibility repair while closure remained In Progress.
**Changelog:** 1252 (pinned; create only at implementation closure)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

---

## Overview

The audit confirmed that Screens can lose dirty work on navigation, Tabs are
authored only partially and render as decoration, Button field binding is not
reachable from the UI, unsafe URL forms survive normalization, empty documents
retain ghost bindings, async related-entry reads can become permanently rejected
or update after unmount, and selection semantics create nested-interactive/Space
failures. Fixed rail clearance, invalid ARIA, and globally keyed preferences add
responsive/accessibility drift.

This family repairs the existing ScreenDocumentV1/Custom Screen V4 product. It
does not invent an action API. Button authoring exposes only the implemented
`link` action; the legacy read adapter maps `publish`/`custom` to the write-valid
`action:"link"` shape with no `href` and prunes only that legacy button's `href`
binding, so it is safely disabled without adding a persisted `disabled` enum. No
endpoint or migration is added. Custom Screens remain a Screen-owned sections/blocks
surface; this family does not add or widen `core/widgets/*`, a Widget Template, a
module-pack entry, or any non-Dashboard widget authoring surface.

## Accepted non-blocking LOW follow-ups

Exactly one evidence-backed, currently behavior-neutral LOW finding remains deferred
under the permanent TASK-9999 eligibility contract:

- TASK-9999-01-L01 at
  `_docs/_TASKS/TASK-9999-01-L01-Decouple-Actor-And-Media-Uuid-Domain-Naming.md`.
  TASK-9999-01-L01 approved evidence: core/services/customScreens/screenMediaIdentity.ts:4; core/services/customScreens/screenEntryPresentationOverrideContract.ts:192; core/services/customScreens/screenEntryPresentationOverrideContract.ts:229; core/services/customScreens/screenEntryPresentationOverrides.ts:421.
  R01 keeps the predicate at `screenMediaIdentity.ts:4` while appending the shared
  selector below it. Deferred evidence is anchored to the predicate symbol and line,
  not to an exact file length; the retired pre-split location in
  `customScreenSchemas.ts` cannot satisfy final closure.
  TASK-9999-01-L01 approved rationale: the shared UUID predicate already accepts and rejects the intended actor/media UUID grammar and preserves exact input bytes; deferral changes no UI/UX/accessibility, data, security/privacy/auth/RBAC, API, persistence/migration, performance/reliability, or test-integrity behavior.
TASK-9999-01-L02 was re-triaged on 2026-07-18 and is `⏭️ Superseded` by active `TASK-540-02-L01`; removing `baseLabel` would regress focus-preserving stale-draft invalidation, so it is not eligible for TASK-9999 deferral.

TASK-9999-01-L01 is the only TASK-540 deferred finding. HIGH/MEDIUM findings and every LOW with
user-visible, accessibility, data, security, privacy, auth/RBAC, API, persistence,
migration, performance, reliability, or test-integrity impact remain blocking.
No newly reported LOW, newly created follow-up, or alternate TASK-9999 leaf may be
treated as non-blocking during TASK-540 closure.

## Hard invariants

- New writes use strict schemas for every fixed data-oriented block kind; legacy/plugin
  kinds retain only their explicit compatibility arm. Tabs items have required,
  non-empty, unique IDs and canonical labels/slots.
- Button/image URLs pass through the Screen-owned wrapper before the shared authoring
  URL policy. The wrapper rejects every ASCII control (`U+0000..U+001F` and `U+007F`)
  and every backslash before delegation, so TAB/LF/CR protocol-relative confusion,
  executable forms, and unsupported schemes fail closed at write and render without
  modifying the Page-owned helper. A present URL field on write must be a string: direct normalizer/service
  calls reject `null` and every non-string just as the route schema does; only the
  stored-read compatibility path may fail soft by omitting malformed legacy values.
- Builder Buttons are always non-anchor and non-navigating, even with a safe href.
  Preview and entry may render an anchor only for a re-sanitized safe href; absent,
  unsafe, and legacy-disabled hrefs remain disabled non-anchors in every mode.
- Presentation image values remain media UUIDs. A direct image block may receive its
  winning asset identity from an active presentation override or from its bound media
  value. Override presence is absolute and UUID-only: resolve it through the map or
  render a placeholder, without fallback. Only without an override may a present
  binding supply a scalar UUID or the first valid UUID from an array; malformed and
  URL-shaped bound values, missing map entries, and unsafe resolved URLs render the
  placeholder without fallback. Static `data.src` is eligible only when neither
  override nor binding exists. The entry host resolves only direct-image IDs to
  `MediaRecord.url` through an authoritative-request/cancellation-guarded cache seam;
  the pure renderer sanitizes the resolved URL and never places a UUID in `src`. Field
  blocks bound to media retain scalar/array UUID identity required by MediaPicker.
  `screenMediaIdentity.ts` owns one Bun-free `isScreenMediaAssetUuid` predicate,
  explicitly re-exported by the stable `customScreenSchemas.ts` facade and used by the
  renderer and later strict override contract; it also owns the single
  `firstScreenMediaAssetUuid(value: unknown): string | null` selector used by R03 and
  L03. The `unknown` input is an untrusted value boundary that is narrowed immediately;
  no `any`, assertion cast, duplicated regex, or consumer-local selector is allowed.
  The new selector remains internal to this owner and does not widen the stable facade's
  pinned public export manifest.
- Binding GC prunes every missing block, including when the live block set is
  empty, and reports the existing warning shape.
- Fresh V4 section/block IDs and binding `blockId`/`propPath`/`field` values share one
  segment-safe max-160 path grammar; explicit/generated binding IDs share canonical
  slug grammar and max 120. Strict writes accept only `blockId`; the public Assistant
  compatibility helper requires exactly one `blockId|widgetId` and exact present
  source/mode values. Stored read consciously retains its legacy fail-soft alias and
  source/mode coercion, but emits canonical `blockId` and deterministically hashes safe
  overlong identities so editor/row references, siblings, Tabs slots, input bytes, and
  read/write idempotence survive repair. Legacy V1/V2/V3 editor migrations converge on
  that same V4 stored-read pass after mapping, closing the historical max-bound bypass
  without remigrating list views or losing block data. Metadata-only PATCH persists that
  repaired base definition without document loss.
- `customScreenNormalizationPrimitives.ts` solely implements
  `buildScreenFieldBindingId(blockId, propPath)`; the stable
  `customScreenSchemas.ts` facade explicitly re-exports that same function identity.
  Every generated ID consists of a bounded readable prefix, `-`, and the exact
  13-character hash of `JSON.stringify([blockId, propPath])`; the suffix applies to
  short and long tuples and distinguishes separator/case variants. Valid explicit IDs
  remain unchanged. The schema normalizer and R01-owned `screenDocumentOps` binding
  factories/duplication consume it; the TASK-540-02 Inspector is a read-only
  domain-helper consumer under L02 ownership. No `ScreenFieldBinding` producer keeps a
  local binding-ID mirror. The pre-V4 Assistant `CustomScreenBinding` composer is not a
  `ScreenFieldBinding` generator and does not consume this helper, but its separate
  contract is R01-owned for the correction: contributions require explicit `id: string`,
  runtime absent/null/blank IDs fail closed, and no ambiguous local tuple fallback
  remains. Current catalog callers already provide explicit IDs; duplicate explicit IDs
  keep their existing fail-closed semantics.
- Tabs use real `tablist`/`tab`/`tabpanel`, one active panel, unique DOM IDs, and
  roving keyboard navigation. In builder mode the visible active tab is derived from
  the host `insertPoint`; activating a tab also arms that tab's slot-end target. Preview
  and entry renderers keep instance-local active state. Authoring and rendering never
  maintain competing tab identities.
- A defensive zero-item Tabs runtime value emits no empty tablist, tab, or panel and
  instead visibly renders exact `role="status"` text `No tabs available.`.
- Selection is not represented by a focusable `role=button` wrapper containing
  links/inputs/contenteditable. Space in an editor stays text input.
- Both builder and entry dirty states use the shared navigation/beforeunload
  guard. Synchronous mutation-generation refs are advanced by every local content,
  presentation, document, binding, or Screen-metadata edit; presentation saved/draft refs
  and visible/ref dirtiness transition together, including change-then-revert and
  stale-save-baseline reconciliation. Hydration rechecks the latest generation and every
  applicable dirty channel at commit time, while save-triggered same-tab cache events are
  invalidated per channel/visit. The Screen builder's synchronous exact-save token also
  suppresses matching self-event refreshes and older hydration commits until mutation
  settlement. Both editors use keyed inner sessions with an opaque
  mounted `RouteVisit` that scopes every visible commit, async token, and captured create
  target, so neither route-A state under B nor first-visit A state after A→B→A can render
  or mutate before the exact visit hydrates. Confirmed discard synchronously invalidates
  all current load/save continuations before navigation; cancel changes none. Remote
  updates never overwrite edits made after a request starts.
  Successful persisted creates use the router's explicit blocker bypass only after the
  save succeeds.
- Cached entry and media promises are retryable. Only the request still registered as
  authoritative may publish a value or clear its pending slot; subscriptions include
  every related target key, cache-event reads force one refresh per unique target, and
  async work checks identity/cancellation before every state commit.
- Canonical and legacy remote cache transports are compatibility mirrors, not two logical
  invalidations. Each subscription correlates their exact four-key event identity with a
  private bounded multiset, rejects every non-exact own-key set before state mutation,
  delivers once per logical occurrence in either order, retains canonical-only,
  legacy-only, byte-identical repeated, and asymmetric per-subscription occurrences, and
  commits correlation before invoking a handler so a throwing canonical handler is not
  retried by its legacy twin. It uses a true touch-on-residual LRU with fail-open eviction
  after exactly 128 entries. Malformed/own-source input cannot consume or evict residual
  state. Local events bypass correlation and retain exact non-serialized operation tokens;
  storage payloads over 2048 code units are rejected before parsing and remove-before-set
  re-arms identical fallback broadcasts. The event payload and exported API remain
  unchanged.
- Entry and Custom Screen list/detail publishers reconcile by monotonic per-item
  authority: newer detail/mutation values and delete tombstones survive older lists,
  while full-list responses still fill unrelated rows. A Screen detail fallback that
  fetched the list publishes that complete reconciled list.
- Entry preferences use the existing self-scoped authenticated user-settings
  service/client with a strict namespaced key and degrade safely when no user
  context or network is available.

## Security Contract

- **Visibility/endpoints:** existing internal Custom Screens and content-entry
  routes only; no public Screen write or new route.
- **Auth/RBAC:** these Admin routes use the existing authenticated session-cookie
  model and `content:read`/`content:write` permissions. Presentation overrides keep
  their current internal owner permissions; this task does not add API-key mode.
- **CSRF/rate limits:** all writes retain CSRF and `admin_write`; reads retain their
  existing admin-read bucket. No public nonce/captcha applies.
- **Validation:** route schemas are reject-unknown at every fixed-kind data, nested
  tab, block, section, and binding level. Explicit legacy/plugin kinds retain their
  documented compatibility shape; server normalizers and render seams reapply
  URL/action policy.
- **User settings:** preference reads/writes are internal, self-scoped to the
  authenticated session, and PATCH retains CSRF with strict `{ value }` input.
  Preferences contain non-secret view flags only; no entry content, tokens,
  bindings, or privileged data enters browser storage.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-540-01 | Strict Screen data, URLs, Tabs, and binding GC | TASK-540-01-L01 | 🚧 In Progress |
| TASK-540-02 | Button binding and Tabs authoring | TASK-540-02-L01 | 🚧 In Progress |
| TASK-540-03 | Accessible Tabs and selection semantics | TASK-540-03-L01 | 🚧 In Progress |
| TASK-540-04 | Dirty navigation and async/cache recovery | TASK-540-04-L01..L04 | 🚧 In Progress |
| TASK-540-05 | Responsive canvas, ARIA, and user preferences | TASK-540-05-L01, L02 | 🚧 In Progress |
| TASK-540-06 | Tests, smoke, and closure | TASK-540-06-L01 | 🚧 In Progress |
| TASK-540-07 | Smoke option-selector correction and first-failure reporting | TASK-540-07-L01, L02 | 🚧 In Progress |

## Hard family-wide modularity gate

The line gate freezes the verified 91-path pre-split authority, then unions the complete
Git history after baseline `e5f15a5675b58df85e573f760df4429af735400f`, the final HEAD
diff, and all untracked paths. The first TASK-540 family commit must retain that baseline
as its sole parent, and both the baseline and first family commit must remain ancestors
of HEAD. Staging, intermediate commits, squash, rebase, or a new current HEAD never reset
or narrow the scope. This family authorizes no deletion or rename of a touched module:
every authority path must remain a regular non-symlink file in the final tree, while
each cohesive split adds its explicit replacement owners.

The historical pre-split blocker inventory was exactly 15 files. It remains frozen as
provenance for baseline-to-final scope; all fifteen rows are now resolved by the eight
source-owner modularity repairs, including TASK-540-05-L01's separate blocking boundary
handoff and TASK-540-05-L02's final six-path test split. All eight owner receipts exist,
and the current family line gate reports zero blockers:

| Leaf owner | Pre-split blocker | Physical lines | Pre-split SHA-256 |
|---|---|---:|---|
| TASK-540-01-L01 | `core/services/customScreens/screenDocumentOps.ts` | 1,030 | `dc20fc963c6fcc6e4c7ef647284fd0ee3ee174302f9ba196e869f40eaae0b69b` |
| TASK-540-01-L01 | `tests/unit/assistant/actionExecutorService.test.ts` | 6,577 | `41bd0ec9f0a0042ca87bc7f688206b391671788176b13bac0b525ce677f6c62b` |
| TASK-540-02-L01 | `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` | 1,194 | `eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df` |
| TASK-540-03-L01 | `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | 1,983 | `eb7b659f5c5c4edcd26bfc0ae53716ec538f6ecfad98aa284ae975a051b143ab` |
| TASK-540-03-L01 | `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` | 2,415 | `455f8d1149d218f2125003fb8538a330c043e79ac894bb9203f150970452997e` |
| TASK-540-04-L01 | `tests/vitest/admin/entriesClient.test.ts` | 1,893 | `011bdef52770f4943daf9f33fcf25a5597e537c386ae3347102020875c17c9a5` |
| TASK-540-04-L03 | `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | 2,235 | `9d1c59d48e9c5de8f81d3acaa01583ea04efeab8438bb837af1db392cdd17001` |
| TASK-540-04-L03 | `tests/vitest/admin/cacheBus.test.ts` | 1,165 | `301c51a4725dca5ef159ab18e21ea5afda1a457730c616f4e08dc1c0d82de024` |
| TASK-540-04-L03 | `tests/vitest/admin/customScreensClient.test.ts` | 1,359 | `3e529d58401b62b3cc097d9ddfd51df1b6247b75c9ff8fc2043caecd57aecdda` |
| TASK-540-04-L03 | `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` | 1,141 | `b336092db65daf52c6d9c381d7e5fc5cbb22206095aae719d98de274de7ebb86` |
| TASK-540-04-L03 | `tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx` | 1,079 | `ded6ce43edb92875c1af0787aa66c010049328de3cf701eb4003d25b9d2b92b6` |
| TASK-540-04-L04 | `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | 1,594 | `66c399215f25a00b123869a56a709e5a02bd53606c72db1966b2477eb24c0ba7` |
| TASK-540-04-L04 | `tests/vitest/ui/custom-screens-page.test.tsx` | 2,313 | `79734548b7374ae24fae034acda989bf5c66d29aa94cd882e933400f8596766f` |
| TASK-540-05-L02 | `tests/integration/routes/userSettings.test.ts` | 1,064 | `c3f70ae3d795367dae66b503d618a8c16587a49114883ba455000074c3c86601` |
| TASK-540-05-L02 | `tests/vitest/ui/assistant-panel-interaction.test.tsx` | 1,506 | `bae04840eb4aa25cbaa02a6c59d8cee121afff8d817ff30136b746313c325095` |

Every listed path has exactly one leaf owner. The final receipt records every extant
scoped human-authored production, test, and test-support file as
`{ path, owner, lines, sha256 }`, using byte-based physical-line counting that includes
blank/comment lines and an unterminated final line. Every result must be `<= 1000`.
Generated artifacts, lockfiles, vendored code, database snapshots, and generated
migration metadata alone retain the AGENTS.md exemption. This gate is blocking and no
violation may become a LOW or TASK-9999 deferral.

At the completed modularity checkpoint, before the later L03 overflow repair, the
remaining TASK-540 land order was exactly:

```text
TASK-540-06-L01 closure
```

Behavior-preserving smoke executor/scenario modularization to <=1000 LOC per module was
the first step of this order and is **done** as of 2026-07-27 (see `Current Closure
Repair State` at the top of this file for the measurement); it is struck below. The
current remaining order is exactly:

```text
run targeted and full gates now that all smoke bytes have stabilized →
restart the helper-backed server and run one canonical seven-flow Playwright CLI smoke →
require 13/13 screenshots, zero console errors, and deterministic cleanup →
create changelog 1252 and close all 20 task files child-first plus the board →
run the final focused closure checks → commit → integrate into feat/implementations
```

Prior runtime smoke evidence is tracked in `_docs/_workflows/_smoke/` and indexed, with
each receipt's exact scope and limits, under `Smoke evidence receipts in the tree` in
TASK-540-06. None of it discharges the canonical run above.

The ten protected pre-split test families preserve the exact sorted multiset of all
347 fully expanded test names across their final 36 suite files, with each suite
independently runnable. The closure target is exactly 64 Vitest + 18 Bun = 82 files:
81 source-owner/read-only targets and one closure-owned
`tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`.

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| II-H-01 dirty navigation | 540-04/L03 + L04 | builder/entry content/presentation blocker and beforeunload tests |
| II-H-02 unreachable Button binding; II-M-03 inert actions | 540-01/L01 + 540-02/L01 + 540-03/L01 + 540-04/L04 + 540-06/L01 | field→href→clear→rebind→save/reopen→entry link with no empty sentinel persisted; builder never anchors/navigates; preview/entry safe link; legacy unsupported action stays disabled |
| II-H-03 decorative Tabs; II-M-04 weak IDs/schema | 540-01/L01 + 540-02/L01 + 540-03/L01 | reject duplicates/unknowns; add/rename/remove/slot; keyboard/hidden panel behavior |
| II-H-04 Space/nested interaction | 540-03/L01 | contenteditable Space and link/input activation without wrapper activation |
| II-M-05 URL sanitization; image URL LOW plus UUID presentation resolution drift | 540-01/L01 + 540-03/L01 + 540-04/L03 | shared safe/unsafe corpus plus TAB/LF/CR protocol-relative-confusion and NUL/DEL controls; direct sanitizer/write/stored-read/compat-alias evidence; final Button disabled-non-anchor and Image placeholder/no-`img` sink evidence; direct-write non-string rejection/stored-read omission; direct-image override, scalar/array binding, malformed/URL-shaped/missing/unsafe cases with no fallback and no UUID in `src`; media-field scalar/array UUID retained for MediaPicker |
| II-M-06 rejected promise; II-M-07 missing target subscription | 540-04/L01..L03 | fail→retry and cacheBus refresh without dirty overwrite |
| II-M-12 empty-doc ghost binding | 540-01/L01 | zero-block prune warning/round-trip test |
| II-M-01 fixed Screen rail; invalid ARIA role; global prefs | 540-05/L01 + L02 | narrow geometry, role/name checks, two authenticated-user isolation |
| 2026-07-19 post-audit selector/accessibility/navigation drift | 540-01/L01 → 540-03/L01 → 540-04/L03 → 540-04/L04 | one service-owned scalar/array UUID selector consumed by both renderer paths; distinct Entry Presentation and Screen Settings programmatic names; canonical Entry records-workspace helper; extend existing protected test declarations without changing R01 77 or Entry navigation 9+13 counts |

## Ownership, order, and collision guards

The board-family order remains `540-01 → 02 → 03 → 04 → 05 → 06`,
after TASK-543 and before TASK-539 in the audited remediation dependency map. Within
the completed modularity repair, the finer-grained mandatory owner order was
`540-01-L01 → 540-02-L01 → 540-03-L01 → 540-04-L01 → 540-04-L03 → 540-04-L04 →
540-05-L01 boundary → 540-05-L02 → 540-06-L01`; the behavior-only 540-04-L02 leaf was
already landed and had no modularity writer. At that historical checkpoint every
predecessor was receipted and `540-06-L01 closure` was the only frontier. The later
overflow repair temporarily superseded that frontier; `540-04-L03` has now revalidated
under its exact generation/token receipt. That historical frontier does not prescribe
the current repair sequence; the current closure-repair state and TASK-540-06/L01
execution-order contract above supersede it.
Earlier corrective work across
`540-01-L01 → 540-03-L01 → 540-04-L01 → 540-04-L03 → 540-05-L02` is durable in
the affected task files' historical revalidation/post-audit metadata; no
mutable workflow file is treated as immutable evidence for that earlier pass. The
current `_docs/_workflows/task-540-fix.mjs` records only the completed R01→R03
control-character URL correction, with R01 gated before the R03 final-sink regressions.
That workflow and the prior 75/75 Vitest plus 15/15 DB route evidence remain historical
and were not rewritten for the 2026-07-14 fixture-only repair. Repository-wide Bun
validation subsequently exposed the stale `tests/unit/assistant/actionExecutorService.test.ts`
Custom Screen block-patch fixture. R01 alone owned replacement with canonical
`heading.data.text` and an independent `text.data.content` sibling plus same-block and
sibling-block preservation assertions; production Assistant and Screen schema/source
files remained unchanged. Its repair, revalidation, and then-Done transition are
historical. On 2026-07-16 the final workflow audit reopened R01 for the strict
section/block/binding path max-160 contract, binding-ID max-120 contract, three-mode
normalizer, deterministic identity-preserving stored-read repair, metadata-only PATCH
proof, and domain-owned `buildScreenFieldBindingId`. R01 alone owned
`customScreenSchemas.ts`, the narrow builder replacement in `screenDocumentOps.ts`,
their source-owner tests, route/Assistant Bun proof, and two unchanged read-only
Assistant Vitest consumers. The later contract audit additionally assigned the
explicit-ID-only `blueprintBindingComposer.ts` boundary and its focused suite to R01;
that expanded correction now has its exact current receipt. L02 then owned only the Inspector
call-site handoff, invalid Tab-label restore, and its UI regressions; schema and document
ops remained R01-owned.
R03 owned only the accessible zero-item Tabs renderer branch and its renderer regression.
R01, L02, R03, and L01 retain their exact current receipts. R03's current
2026-07-20 generation `90d5543e1773459aaf7893aec3f24c57` covers its exact 89/89
owner gate, while its separate auxiliary receipt covers the independent dead-code 6/6
gate; its 2026-07-19 selector-consumer commit remains historical provenance. L01 passed
isolated 19/15/8 plus Media 23 and combined 65/65; both retain zero-finding owner audits.
None claims a full family post-audit, full validation, smoke, or closure. After
changelog 1252 covers their
physical IDs, the covered post-1252 state may be `✅ Done` with `Completed`.
Mandatory repository-wide `bun run test` on 2026-07-15 then confirmed that the legacy
`screen-editor-sections.test.tsx` full-module cacheBus mock omitted the fresh-symbol factory
called before every L04 Screen-builder mutation. L04 alone owns the additive
`createCacheEventOperationToken: () => Symbol(),` property; all nine TASK-500 tests and all
of their assertions, imports, and other mock bytes are frozen. The one-property repair,
isolated 9/9 regression, exact six-file/66-test re-gate, and five zero-finding post-audit
lenses passed on 2026-07-15; that historical implementation evidence remains valid, while
L04 is later reopened and revalidated for its owned binding-flow generated-ID
expectation with a separate fresh owner receipt.
That one-property path is the exact historical repair scope, not a permanent narrowing
of L04. For a new exact evidence-backed post-audit or final-drift L04 repair, the workflow
uses the full original L04 `allowedFiles`, including its production and owned test paths.
The `screen-editor-sections.test.tsx` seam remains fixture-only and may be touched only
when the finding requires it; the exact finding prompt and post-agent `touchedFiles`
verification constrain the mutation.
Closure validation subsequently reproduced
one logical remote event delivered once from each canonical/legacy compatibility
transport. TASK-540-04/L03 alone owned that historical scoped repair, completed it, and
replaced its persisted repair receipt with the matching `Revalidation Passed` successor.
At that historical checkpoint TASK-540-04 and every other landed source leaf remained
`🚧 In Progress` with `Implementation Complete` awaiting family changelog 1252. The
later overflow repair temporarily removed L03's gate and `Implementation Complete`, and
the 2026-07-18 owner transition restored both under its then-current overflow receipt;
the 2026-07-19 Entry-correction receipt is now the sole current L03 owner authority. The
completed historical L03 repair wrote only
`core/admin/utils/cacheBus.ts`, `tests/vitest/admin/cacheBus.test.ts`, and additive-only
direct-image route-boundary regressions in
`tests/integration/routes/customScreensRoutes.test.ts`; the production
`core/server/routes/customScreenRoutes.ts` file plus every UI, client, service,
hook/dialog, renderer, and L04 consumer file remained read-only during that historical
repair. The additive route-test path was a one-time historical exception and is not part
of L03's original declared owner set. For a new exact evidence-backed post-audit or
final-drift L03 repair, the workflow uses the full original L03 `allowedFiles`, including
`core/services/customScreens/screenEntryPresentationOverrideContract.ts`, without
silently re-adding the historical route-test exception. The exact finding prompt and
post-agent `touchedFiles` verification still constrain every mutation.
The earlier import-only L03 attempt was reverted before the first prepared-state pass.
Before the later overflow repair, the final sequential post-audit independently reopened
L03 for the substantive single-versus-multiple media override contract and included
canonical import placement inside that scoped repair. All nine landed source-owner
leaves retain exactly one current gate receipt: `Revalidation Passed` on
TASK-540-01-L01, TASK-540-02-L01, TASK-540-03-L01, TASK-540-04-L01,
TASK-540-04-L03, TASK-540-04-L04, TASK-540-05-L01, and TASK-540-05-L02, plus
`Targeted Gate Passed` on TASK-540-04-L02. R03 additionally retains its separately
current auxiliary dead-code receipt. Every field explicitly labeled prior or historical
remains provenance only.
After closure, that exact-finding owner additionally receives only the TASK-540 root,
TASK-540-04 child, and L03 leaf task contracts for evidenced prose; status transitions
remain separate task-state mutations. TASK-540-06-L01 remains deliberately active. Its
deterministic `pre-closure remediation / fix-started 2026-07-15 / gate green` value is
historical `reserved-pre-closure-regated` evidence from when L03 was the sole repair
leaf; it is not a current `Revalidation Passed` field and cannot satisfy a current-state
predicate. The prior modularity receipt remains historical split evidence,
TASK-540-06-L01 has no current `Implementation Complete`, `Revalidation Passed`, or
`Completed`. The already-landed R01 → R03 → L03 → L04 → L01 chain records the latest
correction sequence but is not the complete current receipt set; the exact nine-leaf set
is pinned above. Closure resumes only after the complete current repair order above. The
pre-fix repository-wide `bun run test` command still requires a fresh parent rerun; no
full-suite or live-smoke pass is claimed here.
Leaves have exclusive source ownership; any shared block data/action/DOM-id
shape is defined by 540-01 and consumed verbatim. TASK-540-03 owns the pure renderer's
optional UUID→URL map prop; TASK-540-04-L03 exclusively threads and populates it through
`CustomScreenEntryCanvas.tsx`, the optional pass-through props of
`CustomScreenPreview.tsx`, and `CustomScreenEntryEditor.tsx`. Preview output remains
byte-identical when no entry-scoped presentation inputs are supplied.
TASK-540-02 exclusively owns the Inspector's shared binding-ID helper call site and
compatibility expectations in `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
plus `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx`; R01 retains
the helper and document-op source/test ownership.

TASK-540 must not edit TASK-478/TASK-481 page-only seams while either stream is
active. Its forbidden paths include `core/admin/ui/pages/**`,
`core/services/pages/pageRendererV2.tsx`, and `core/ui/theme/tokenCss.ts`; reuse
the shared URL helper by import, not by modifying the Page-owned implementation.
TASK-540-01 owns a Screen-specific wrapper that rejects every ASCII control
(`U+0000..U+001F`, `U+007F`) and every backslash before delegating to that imported
helper; the Page-owned helper is read-only. Its compatibility alias delegates to the
wrapper while TASK-540-02 migrates the Inspector and TASK-540-03 migrates the renderer.
R01 owns the direct sanitizer/write/stored-read/compat-alias evidence; R03 owns only the
final renderer-sink regressions and need not change renderer production when the wrapper
fix is sufficient. No direct Screen consumer may remain on the alias after that rollout. TASK-540-04-L01 owns
both entry-list and media-list promise publication. TASK-540-04-L03 exclusively owns
the presentation-target service expansion plus entry host/canvas forwarding. Its completed
2026-07-15 repair alone owned the cache-bus canonical/legacy multiset and its owner tests.
The historical L03 cache-bus repair and the earlier R01/L02/R03 corrections remain
validated. Before the later overflow repair, the later L03, TASK-540-05-L01, and
TASK-540-05-L02 repairs had matching receipts; expanded R01 and L04 retain theirs. After
the later R01 stored-read repair gate, the resolver again reported all ten leaves landed;
the subsequent five-lens intervention landed R01 → R03 → L03 → L04 in dependency
order, followed by the L01 compatibility test. Those 2026-07-19 R03
selector-consumer bytes and gate are historical; R03's replacement 2026-07-20
generation plus its separate auxiliary dead-code gate are the current authorities. The
other matching current leaf receipts pass; the closure leaf is not regated and is back
at the closure frontier, because the behavior-preserving smoke modularization it waited
on finished with every facade/child module at most 1,000 physical lines. Those bytes
have stabilized, so final dependent hashes and pins are recomputed as part of the
closure transaction; targeted/full gates, the canonical runtime smoke, and closure then
follow in the current order above.
L03's earlier overflow and
single-versus-multiple media receipts are historical. The matching
`_docs/CMS_API.md` update is already landed and remains read-only while closure validates
and consumes it.
If shared `CanvasEditor.tsx` changed meanwhile, re-read and re-audit before land.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after each leaf.
- Every source leaf updates/creates its behavior tests before its targeted gate. Closure
  may add aggregate cases but never defers or re-baselines a source-owner assertion.
- Targeted Custom Screen schema/ops/service/client/UI/runtime Vitest suites and
  existing Bun route integration suites.
- R01's identity correction owns `custom-screen-schemas.test.ts`,
  `screenDocumentOps.test.ts`, and `blueprint-binding-composer.test.ts`; its targeted
  gate also runs the unchanged
  `action-plan-schema.test.ts` and `catalogBlueprintEngine.test.ts` as explicit read-only
  Assistant consumers plus the existing image-src contract. L02 owns only the Inspector
  call site and `custom-screen-binding-panel.test.tsx`, gated with the existing image
  inspector suite. R03 owns the accessible zero-item renderer state and its exact 89/89
  renderer/interaction/image gate. Closure runs all of them read-only in the final
  64-Vitest/18-Bun aggregate (81 source-owner/read-only files plus one closure-owned
  aggregate), including every independently runnable split suite. The ten protected
  split families must additionally retain their exact 347-name pre-split multiset.
- R01's exact Bun gate includes `tests/unit/assistant/actionExecutorService.test.ts`;
  only its existing Custom Screen block-patch fixture/assertions may change, while the
  full file proves the fixture remains compatible with the Assistant executor contract.
- Cache/async tests use deferred promises and explicit unmount/cancellation.
- Exactly seven canonical real flows: Button bound link with builder non-navigation and
  preview/entry navigation, plus direct/media-field presentation with override and
  scalar/array binding provenance/no-fallback cases;
  add/nest/save/reopen Tabs; keyboard
  Tabs; inline Space; dirty navigation cancel/discard; related-list fail/retry+
  cross-tab update; plus narrow canvas and two-user preference spot checks.
  They inherit TASK-540-06/L01's exact-one executor-call contract: no extra diagnostic,
  recovery, or retry smoke invocation and no partial, diagnostic, or reusable evidence.
  Assert visible/ARIA/geometry effects, light/dark, and zero console errors.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`,
the narrow unsafe-method CSRF wording in `_docs/SECURITY_SPEC.md`; validate the
already-landed `_docs/CMS_API.md` direct-image/media-field correction read-only; update
`_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, and Custom Screens user/
developer docs. At closure create changelog 1252 and close every descendant.
