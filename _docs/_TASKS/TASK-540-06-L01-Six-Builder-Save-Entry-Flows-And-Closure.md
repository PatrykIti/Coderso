# TASK-540-06-L01: Seven Builder-Save-Entry Flows and Closure

# FileName: TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-06
**Priority:** High
**Category:** Testing / Documentation / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01, TASK-540-03-L01, TASK-540-04-L01..L04, TASK-540-05-L01..L02
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Source Repair Started:** 2026-07-15
**Source Repair Reason:** Mandatory repository-wide `bun run test` paused closure after confirming that `screen-editor-sections.test.tsx` lacked the fresh-symbol cacheBus factory required by the L04-owned Screen builder Save path. TASK-540-04-L04 completed the additive mock repair and exact six-file re-gate; closure resumed with every source-owner test read-only.
**Source Repair Revalidated:** 2026-07-15 — `bun --cwd core lint:types`, `bun --cwd core lint`, root `tsc`, exact six-file Vitest gate 66/66, isolated `screen-editor-sections` 9/9, workflow syntax, repair-sibling self-test 9/9, diff check, and five post-audit lenses with zero HIGH/MEDIUM/LOW findings
**Historical Source Repair Started:** 2026-07-14
**Historical Source Repair Reason:** Repository-wide Bun validation paused closure after confirming a stale strict-V4 Custom Screen fixture in `tests/unit/assistant/actionExecutorService.test.ts`. TASK-540-01-L01 alone owned the fixture-only repair and re-gate; closure kept every source-owner test read-only and resumed after R01 was Done.
**Changelog:** 1252 (pinned; closure only)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

---

## Exclusive ownership

- new aggregate suite
  `tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`; this is the
  only test file closure may create or edit
- every other Vitest/Bun path in the required matrix is read-only here and remains
  owned by its source leaf, including the image-inspector, Custom Screens client,
  entry-preference persistence, and navigation-guard suites
- `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`, and the
  narrow `_docs/SECURITY_SPEC.md` correction stating that CSRF covers every unsafe
  method, including PATCH
- `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`
- relevant Custom Screens user/developer guides
- task-prefixed screenshots named `_docs/_workflows/_smoke/task-540-*`
- TASK-540 descendant statuses, board row/statistics, changelog 1252 at closure

Do not reopen production source or re-baseline/edit a source-owner test. If a source
defect or missing source-owner assertion remains, return it to its owning leaf/fix
workflow, re-run that leaf's gate, then resume closure.

## Required test matrix

```text
tests/vitest/admin/cacheBus.test.ts
tests/vitest/admin/custom-screen-schemas.test.ts
tests/vitest/admin/customScreensClient.test.ts
tests/vitest/customScreens/screenDocumentOps.test.ts
tests/vitest/customScreens/screen-document-image-src.test.ts
tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts
tests/vitest/customScreens/customScreenService.test.ts
tests/vitest/customScreens/relatedEntryResolver.test.ts
tests/vitest/admin/entriesClient.test.ts
tests/vitest/admin/mediaClient.test.ts
tests/vitest/admin/userSettingsClient.test.ts
tests/vitest/ui/admin-auth-identity.test.tsx
tests/vitest/ui/assistant-panel-interaction.test.tsx
tests/vitest/ui/use-screen-entry-preferences.test.ts
tests/vitest/ui/use-screen-related-entries.test.tsx
tests/vitest/ui/custom-screen-entry-draft.test.ts
tests/vitest/ui/custom-screen-binding-panel.test.tsx
tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx
tests/vitest/ui/custom-screen-authoring-boundary.test.ts
tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx
tests/vitest/ui/custom-screens-page.test.tsx
tests/vitest/ui/custom-screen-route-params.test.ts
tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx
tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx
tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx
tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx
tests/vitest/ui-integration/screen-editor-sections.test.tsx
tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx
tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx
tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
tests/vitest/widgets/screenWidgets.test.tsx
tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx
tests/unit/settings/userSettingsService.test.ts
tests/integration/routes/userSettings.test.ts
tests/integration/routes/cors.test.ts
tests/integration/routes/customScreensRoutes.test.ts
tests/unit/assistant/actionExecutorService.test.ts
```

This required matrix contains exactly 39 files: 34 Vitest files plus 5 Bun files.
Exactly 38 are source-owner files and 1 is the closure-owned aggregate
`custom-screen-task-540-flow.test.tsx`.

The closure ownership reconcile also verifies, read-only, that TASK-540-02-L01
solely wrote `ScreenBlockInspector.tsx` plus its image-inspector suite; TASK-540-04-L03
solely wrote `screenEntryPresentationOverrideContract.ts`,
  `screenEntryPresentationOverrides.ts`, `customScreensClient.ts`, `cacheBus.ts`, and their
  two admin suites; and TASK-540-04-L04 solely wrote `CustomScreenEditorPage.tsx`, its
  route helper, Page/route/binding suites, plus only the additive cacheBus factory mock in
  the recovery suite and the identical additive
  `createCacheEventOperationToken: () => Symbol(),` property in
  `screen-editor-sections.test.tsx`, while consuming the L03 token names and signatures
  byte-identically. TASK-505 recovery assertions and all nine TASK-500 section-suite
  tests and all of their assertions, imports, and other mock bytes must remain byte-identical. The workflow's leaf allowlists, targeted commands,
aggregate matrix, and closure hash set must name these exact paths identically.
TASK-540-05-L02 additionally owns the exact auth-identity contract/provider/route paths
and `admin-auth-identity.test.tsx`; its reopened correction solely owns
`securitySettings.ts`, `cors.ts`, and `cors.test.ts` for the required-header union and
default/preflight evidence. Its Assistant suite is mechanically projected to the one
required typed fixture property. TASK-540-04-L03 remains the sole writer of
`CustomScreenEntryEditor.tsx` and leaves its hook call transport-neutral before L02;
L02 consumes that component byte-identically.
TASK-540-01-L01 additionally owns only the existing
`executeAssistantActionPlan patches custom screen block data` fixture/assertion region
inside `tests/unit/assistant/actionExecutorService.test.ts`. Its canonical fixed-kind
repair may change the selected block kind/ID, `dataPath`, value assertions, and the
independent sibling fixture/assertion needed to prove preservation; shared helpers,
other Assistant cases, production Assistant code, and strict Screen schema/source are
read-only. Closure runs and hashes the whole Assistant file without editing it.

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
default/unhydrated with a fresh GET. The real HTTP suite
must inventory, delete, and prove absence of only the access-log rows emitted by its
synthetic sessions and requests before it removes those sessions/users. Since logging
is fire-and-forget, every suite request (including unauthenticated cases) uses one
unique non-secret exact User-Agent marker, and proof includes a bounded marker plus
exact-user/session stable-set and absence poll after synthetic traffic stops; failure
to reach quiescence fails the test.
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
cross-leaf regressions; keep every other named test byte-identical during closure
run each named lane; on failure rerun the named file once and route real defects
back to the single owning source leaf
when resuming an active no-gate implementation leaf after an interrupted writer, run its
exact gate first: a green gate closes it without requiring a second source diff; a red
behavior gate enters the scoped fix loop, while infrastructure stops; the special
pre-pending active 540-06-L01 repair below always closes this gate-first path with its
exact deterministic Revalidation value, whether the first gate is green or a scoped fix
is required
run full test/precommit/Admin build-boundary-bundle/release/security gates
restart the Bun server, execute the seven synthetic builder -> save -> entry flows,
save task-540-prefixed screenshots and record visible scenario evidence in closeout
update only the declared product/cache/API docs
preserve already completed source leaves/children as Done, keep the active closure
leaf/child and root In Progress, and leave every unstarted descendant To Do
mechanically require the L03-owned entry editor to remain byte-identical during L02,
and restrict L02's Assistant suite to the exact typed UserSettings fixture property
on an ordinary source-owner repair, or any 540-06-L01 repair after a valid
evidence-before-pending anchor or durable Closure Pending exists, invalidate old gate
receipts and persist one exact Repair Pending generation/token; a restart repairs/re-gates
only that owner and closes it only with a matching fresh Revalidation receipt while later
Done leaves remain untouched; an anchor-backed 540-06-L01 repair additionally binds prior
gate, Repair Pending hash, and exact successor Revalidation in the changelog-index
repairAuthorization before task-state reopen
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
a failed evidence dispatch temporarily removed the file, run full validation, then mark the closure
leaf/child and root Done only after every other descendant is Done; run the mechanical
graph gate and reopen only the affected owner plus closure/root on a later failure
capture one board baseline, the closure leaf's exact gate field/value, and the fixed
changelog path from the unchanged active graph before the first status mutation; first
bind their strict control manifest plus generation/evidence hash into the independently
evidence-owned changelog-index anchor and hashed changelog block, then persist the identical baseline/path through pending, retry, rollback,
status, terminal restart, and verification without recapturing them from a mutated board/task
on terminal startup, validate all 17 Done contracts, closure-leaf gate receipt, board row
plus its exact persisted statistics baseline, unique changelog-index row, shared closure
receipt, and the single changelog evidence hash before scoped-reopening closure/root and rerunning the
post-audit, full validation, smoke, closure, final drift, and final gate sequence
strict-parse a persisted Closure Pending or terminal Closure Generation, seed the durable
counter from it, and require every later closure attempt to use a greater generation
```

### Orchestrated status flow

Before each implementation/fix pass, a task-only transition agent marks the exact
leaf and its direct child `🚧 In Progress`, keeps the board parent and root
TASK-540 `🚧 In Progress`, and synchronizes the child leaf table plus root
subtask table. A green targeted gate closes that exact leaf `✅ Done`; its direct
child becomes Done only when all of its physical leaves are terminal. This source
completion is valid before the family changelog exists because changelog 1252 is
pinned and created once at family closure. An ordinary source-owner repair, and any
540-06-L01 repair after a valid evidence-before-pending anchor or durable
`Closure Pending` exists, reopens only its exact owner leaf/direct child, removes stale
`Targeted Gate Passed`/`Revalidation Passed` evidence, and persists one
`**Repair Pending:** generation ... / token ...` receipt. A restart
recognizes exactly that non-prefix repair owner even when later leaves are Done, executes
only its implementation/re-gate, and closes it only after replacing Repair Pending with
the fresh matching `**Revalidation Passed:**` receipt. An anchor-backed closure-leaf
repair also requires the evidence-owned anchor authorization chain described below. A
task-metadata-capable fixer is followed, before any read-only gate, by a deterministic
re-read that requires the same Repair Pending token, active root/child/leaf statuses and
rows, cleared old gate/Completed fields, and byte-identical closure
pending/evidence/generation/baseline receipts. Completed siblings never rerun. Reopening
a source owner requires the board to be already In Progress and preserves the complete
board byte-identically; only the dedicated closure-pending and closure-status transitions
may move TASK-540 or change the board statistics.

During an earlier source-owner `Repair Pending`, TASK-540-06-L01 is the sole later leaf
permitted to remain `🚧 In Progress`. It is deliberately ungated in that graph and must
have neither `Targeted Gate Passed` nor `Revalidation Passed`; its active status is not a
claim that the closure gate ran. Every other source sibling must remain `✅ Done` with
its `Completed` receipt. Never fabricate closure or source gate evidence to satisfy a
restart projection. `_docs/_workflows/task-540-implement.mjs` owns this invariant and
must keep `--self-test-repair-siblings` green.

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
family. Unstarted leaves stay canonically `⏳ To Do`; only the currently executing
leaf/direct child is `🚧 In Progress`; completed leaves/children stay `✅ Done`.
The board parent remains In Progress and its statistics stay byte-identical until
final family closure.

At closure, previously completed descendants remain Done; the closure leaf/direct
child and root stay In Progress, while no unlanded descendant may be promoted from
To Do. The workflow uses only the fixed `Changelog File` path above, discovers exactly
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
    }
  },
  "repairAuthorization": null
}
```

The changelog evidence block embeds the exact same `closureControl`; its whole byte hash
must equal `evidenceSha256`. The real counters/hash replace the illustrative values. Unknown/missing keys,
an unsafe/different path, non-positive generation, unsupported gate field, or non-64-hex
digest fail closed. The orchestrator byte-verifies and hashes the whole block before the
status owner writes identical `Closure Pending`, `Closure Board Baseline`, and
`Closure Changelog Path` receipts on the three active closure contracts. Complete full
validation then runs before final family status mutation. Only when every physical descendant other than the active closure
leaf/direct child is already Done may the status owner mark TASK-540-06-L01,
TASK-540-06, and finally TASK-540 Done and update the board. A final mechanical
graph/evidence/diff gate follows. Each terminal descendant
must carry its own completion/gate evidence, while the final three closure contracts
carry the family evidence hash/generation; a missing or open descendant fails. Any
later exception reopens only the affected source owner (when applicable), the closure
leaf/direct child, and root before propagating. Unrelated completed descendants remain
Done, and unstarted descendants remain To Do.

Changelog 1252 must contain exactly one task metadata line, byte-identical to this
complete, unique, deterministically ordered family set:

```text
Tasks: TASK-540, TASK-540-01-L01, TASK-540-02-L01, TASK-540-03-L01, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06-L01
```

A process restart from a terminal-looking graph is not accepted on status alone. It
first requires all 17 contracts plus the board Done, identical valid evidence
hash/generation/baseline/path fields on exactly the root and closure child/leaf, no closure-only
receipt on a source descendant, exactly one byte-pinned Targeted Gate Passed or
Revalidation Passed field/value on the closure leaf, exactly one four-cell TASK-540 row
in the 1252 changelog index with filename-matching date/title/type, consumed reservation
prose, and exactly one valid canonical TASK-540 control anchor. When the changelog exists,
its canonical evidence block must hash to both the task receipt and anchor; when it is
missing/malformed, the valid independent anchor is required before scoped reopen and
regeneration at the same fixed path through fresh validation/smoke. The anchor's strict
evidence-owner `closureControl` must independently match the task generation, pinned
baseline, pinned path, and SHA-256 of the exact closure-leaf gate value; coherent edits
to the status-owner task files plus board therefore cannot become trusted after a process
restart. The three closure
contracts also carry one identical `Closure Board Baseline` captured once while TASK-540
is In Progress; terminal validation requires current statistics to equal that pinned
baseline with In Progress -1 and Done +1. It is never recalculated from the board after
the first closure transition. Only then does startup scoped-reopen the three closure
contracts and rerun post-audit, full validation, live smoke, closure, final drift, and
the final mechanical gate. A malformed/mismatched terminal graph fails closed.
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
marker authorizes pending or terminal closure. If a valid evidence-before-pending anchor
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

After source owners, tests, and docs are final—but before live smoke—run approximately
five fresh read-only lenses over implementation fidelity plus runtime-smoke feasibility:

1. fixed-kind schema/legacy-read/URL-policy and present-only round-trip fidelity;
2. Tabs identity, scoped DOM IDs, interaction semantics, and accessibility;
3. dirty guards, promise retry/cancellation, cache subscriptions, and no dirty overwrite;
4. authenticated-user preference isolation and narrow-canvas/ARIA geometry;
5. test integrity, docs/cache maps, task/changelog graph, and whether the declared
   runtime scenarios/receipts/cleanup remain executable against the final source.

Every finding needs `file:line` evidence and every expected lens result must be present.
Fix verified HIGH/MEDIUM drift in its sole source-owning leaf, rerun the affected gates,
then execute a fresh reconcile before smoke. This pass cannot claim runtime evidence:
the separate smoke-evidence audit runs only after the real helper/browser flows and
inspects their receipts plus PNGs. A missing result is not a pass. When that sole owner is
540-06-L01, only canonical reserved/no-anchor state uses the pre-pending Fix Started plus
deterministic Revalidation path; once a valid evidence anchor exists, the same finding
uses exact Repair Pending and the anchor repair-authorization chain.

Final closure drift has at most two fresh rounds and is remedial, not throw-only.
Any non-clean round reopens the closure leaf/direct child and root; it additionally
reopens only a source leaf/direct child named by a verified source-owner finding.
Unrelated completed descendants remain Done and unlanded descendants remain To Do.
Source-owner findings keep that exact leaf/child In Progress, fix only its owned files,
persist their Repair Pending generation/token, re-gate to a matching fresh Revalidation,
and run full validation, then rerun smoke plus the evidence audit and refresh
the changelog evidence block before re-closing. Runtime/evidence-only findings are
owned by the orchestrator: run deterministic cleanup and a fresh smoke attempt,
never route them to TASK-540-06 tests/docs. Closure/task/changelog-only findings use
an orchestrator metadata fixer, validation, canonical evidence verification, and a
fresh final audit. Only a residual from the second fresh round blocks closure.

## Real browser smoke

### Server, URLs, session, and fixture discipline

The workflow orchestrator—not the smoke agent—restarts from stopped helper ports by
calling Node `spawn` for the task-owned helper in a dedicated process group. Before
dispatching the smoke agent it retains the live `ChildProcess` handle, helper PID,
bounded stdout/stderr buffers, and the non-secret listener PID/PPID/full ancestry for
backend, Admin Vite, and site Vite. Each listener must descend from that exact helper,
so cleanup never signals an unrelated process. The smoke agent only attaches to these
already healthy ports and never launches, replaces, or stops the server. The launch
command and operator-equivalent health checks are:

```bash
coderso-dev-core-host /home/coder/project/Coderso
curl --fail --silent --show-error http://coderso-a.localhost:5173/admin/advanced/custom-screens >/dev/null
curl --fail --silent --show-error http://coderso-a.localhost:3000/ >/dev/null
```

The workflow runs each health probe through Node `execFile("curl", argv)` so it can
hash the real captured stdout/stderr. Its runtime `operationDescriptor` therefore
records the exact `curl` argv without claiming that the display-only shell redirection
above executed.

If spawn, health, listener inventory, or ancestry validation fails after process
creation, `startOwnedSmokeHost` must not merely signal the retained child and throw.
Its bounded catch path sends TERM then KILL only to the owned process group, enumerates
that group until the helper and every descendant are absent, and proves ports
`3000`, `5173`, and `5174` have no listeners. The thrown error carries
`hostAbsenceProven:true` only after all of those observations pass. An occupied-port
preflight or incomplete absence proof is non-retryable: a new fixture prefix/helper
may start only when the prior start catch or the normal outer cleanup proved the exact
process group, descendants, browser session, fixtures, and all three ports absent.

The Admin URL is
`http://coderso-a.localhost:5173/admin/advanced/custom-screens`; the public-front
URL is `http://coderso-a.localhost:3000/`. Source `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from `/home/coder/project/Coderso/.env` without echoing either
value. Credential fill output is always discarded. Every browser invocation is
one separate full command in the single named session, including route setup,
release, assertions, screenshots, and cleanup:

```bash
set -a && source /home/coder/project/Coderso/.env && set +a
playwright-cli -s=wf540smoke --raw open http://coderso-a.localhost:5173/admin/advanced/custom-screens
playwright-cli -s=wf540smoke --raw resize 1280 900
playwright-cli -s=wf540smoke --raw fill 'input[type="email"]' "$ADMIN_EMAIL" >/dev/null
playwright-cli -s=wf540smoke --raw fill 'input[type="password"]' "$ADMIN_PASSWORD" >/dev/null
playwright-cli -s=wf540smoke --raw click 'button[type="submit"]'
playwright-cli -s=wf540smoke --raw goto http://coderso-a.localhost:5173/admin/advanced/custom-screens
playwright-cli -s=wf540smoke --raw run-code '(page) => { page.__wf540ConsoleErrors = []; page.__wf540ConsoleWarnings = []; page.__wf540PageErrors = []; page.on("console", (message) => { if (message.type() === "error") page.__wf540ConsoleErrors.push(message.text()); if (message.type() === "warning") page.__wf540ConsoleWarnings.push(message.text()); }); page.on("pageerror", (error) => page.__wf540PageErrors.push(error.message)); return true; }'
```

Record every browser receipt in execution order with a contiguous sequence number,
its scenario (`setup`, one of the seven flow kinds, or `cleanup`), bounded operation
label, nullable route key, exact full command, exit status,
stdout/stderr SHA-256, `stdoutDiscarded`, optional assertion name, and bounded
sanitized output (maximum 4096 characters). Every required visible assertion and
route hit read has a same-scenario receipt whose assertion name matches the
structured assertion and whose sanitized output contains the observed non-secret
value. Credential-fill receipts retain only literal `$ADMIN_*` / `$WF540_*`
references, set `stdoutDiscarded:true`, and use the exact sanitized marker
`[discarded]`; they never record expanded values. Before canonical evidence is built,
scan every browser command (including non-credential `run-code`) and sanitized output,
every runtime operation descriptor/output/subject identifier, every fixture ID/slug,
and every cleanup scoped identifier/probe. Reject raw secret assignments, cookie or
authorization headers, bearer/JWT values, opaque token/hash identifiers, credentials,
CSRF values, raw rows, and unredacted user data. Benign task prose that merely names
`token`, `cookie`, or `authorization` without carrying a value is not a finding.
The workflow parses `.env` into a private map without output, overwrites only the
process keys declared by that file so helper/runtime values match `source .env`, and
builds an in-memory-only corpus from both inherited and repo credential/secret-like
keys, including `ADMIN_EMAIL`, `ADMIN_PASSWORD`, encryption/hash keys, and numbered
database/Redis/DSN URL encoded and decoded password components, generic secret-key
variables, and connection strings. Every evidence string above—including
browser operation/scenario labels and scenario IDs/viewports—is also checked for an
exact raw corpus value; neither map nor the corpus is ever placed in a prompt, receipt,
error, log, or persisted artifact. Every non-empty value classified by a secret-like
key joins the corpus; values shorter than six characters use boundary-aware matching
instead of being silently skipped. The complete raw smoke result (including its
non-canonical `summary`) is scanned immediately after dispatch and before its failure
text can enter an exception. Every other structured agent result—including full-gate
summaries and audit/fixer findings—is scanned before it is forwarded. The evidence-audit
prompt receives only the already validated canonical evidence object. A rejected agent
dispatch or schema parse is replaced with a generic label-only error; its raw error
object/message never enters an aggregate failure, retry prompt, log, or artifact.
Route receipts use the exact operation labels `route-setup`, `route-hit-read`,
`route-release`, `unroute`, and `real-retry`; the contiguous sequence proves that
malformed routes are read/unrouted before retry and delayed routes are read,
released, then unrouted.

Non-browser work has a parallel, contiguous `runtimeReceipts` sequence. Each receipt
records a bounded operation, a truthful `operationDescriptor`, exit status,
`evidenceSha256` over the real captured stdout/stderr bytes or explicit Node/DB/storage
observation bytes, an optional non-secret subject kind/identifier, and at most 4096
characters of sanitized output. A runtime receipt never claims an unexecuted shell
command and never hashes sanitized prose as though it were stdout. Browser receipts
continue to hash the actual stdout/stderr of each exact Playwright CLI invocation.
The primary sequence contains exactly one `helper-launch`,
`admin-health`, `front-health`, `fixture-setup`, and `helper-stop`; one
`pid-lineage` plus `process-absence` per inventoried child; one `port-absence` per
port 3000/5173/5174; one `fixture-provenance` plus `entity-absence` per fixture;
and one `cleanup-absence` per cleanup-resource record. Helper receipts bind to the
recorded helper PID, child receipts to `<kind>:<pid>`, port receipts to the decimal
port, and fixture/resource receipts to their exact non-secret ID/key. Session cleanup
resources use the synthetic user's/session row's non-secret database UUID or a bounded
label—not a session cookie, token/hash, CSRF value, or password hash. Literal credential
environment references are allowed only in the exact discarded browser fill commands,
never in sanitized output or a runtime operation descriptor.

If the first-run wizard appears, complete it through the same full command form
before fixture creation. Never paste an expanded credential into a command,
screenshot, task file, or closeout. The only credential-bearing evidence is the
literal `$ADMIN_EMAIL`/`$ADMIN_PASSWORD` command text above.

Create one uniquely prefixed fixture family (`wf540-<nonce>`) and record every
server-returned ID immediately in a fixture inventory: two active synthetic users
A/B with the existing Admin role, all content-type IDs and safe generated slugs,
related-entry IDs,
the editable entry ID, Screen ID, and media asset ID. The bootstrap password and
both synthetic-user password hashes derive from the loaded `ADMIN_PASSWORD`; the
value is never printed. Record IDs and generated fixture labels only. Provision
the content, media, Screen, builder definition, and records through real Admin
flows; capturing a POST response ID is acquisition evidence, while a separate
list/detail read proves provenance. Reuse the same fixtures for all seven flows
and reset authored state between flows. Before deleting either synthetic session or
user, query `access_logs` by those exact task-owned user/session UUIDs, inventory each
returned access-log UUID separately, and treat only that exact ID set as acquired
cleanup state; bootstrap-admin and unrelated access rows are never owned. Access-log
writes are fire-and-forget, so after the last synthetic-user request the cleanup uses
a bounded stable-set poll, deletes only each discovered UUID, and requires bounded
repeated exact-absence observations before sessions/users may be removed. Failure to
reach quiescence blocks cleanup and closure.

Provision A/B in one task-scoped Bun fixture setup: call the existing `createUser`
with deterministic non-empty names `WF540 User A <nonce>` / `WF540 User B <nonce>`,
unique `wf540-a|b-<nonce>@example.test` emails, `status:"active"`, and the IDs from
`getAdminRoleIds()`; hash `process.env.ADMIN_PASSWORD` through the existing
`hashPassword` helper and update only each returned user ID's `passwordHash`.
Fail before browser login if either ID, Admin role assignment, or hash write is
missing. The setup result may emit `{userAId,userAEmail,userBId,userBEmail}` only—
never the password, hash, session cookie, CSRF token, or full database row.

After provisioning, expose only the generated non-secret emails as
`WF540_USER_A_EMAIL`/`WF540_USER_B_EMAIL` in the task shell; both use the loaded
`ADMIN_PASSWORD` value without printing it. The real A→B→A transitions in flow 7
use these separate full commands (the user-menu trigger is the TopBar button that
contains the rendered identity text). Sign out and login each perform a full-page
redirect and therefore create a new JavaScript realm; their live proof is durable
per-user isolation, not same-mounted hook retention:

```bash
playwright-cli -s=wf540smoke --raw fill 'input[type="email"]' "$WF540_USER_A_EMAIL" >/dev/null
playwright-cli -s=wf540smoke --raw fill 'input[type="password"]' "$ADMIN_PASSWORD" >/dev/null
playwright-cli -s=wf540smoke --raw click 'button[type="submit"]'
playwright-cli -s=wf540smoke --raw click 'header button:has(span.block.text-sm)'
playwright-cli -s=wf540smoke --raw click 'text=Sign out'
playwright-cli -s=wf540smoke --raw fill 'input[type="email"]' "$WF540_USER_B_EMAIL" >/dev/null
playwright-cli -s=wf540smoke --raw fill 'input[type="password"]' "$ADMIN_PASSWORD" >/dev/null
playwright-cli -s=wf540smoke --raw click 'button[type="submit"]'
playwright-cli -s=wf540smoke --raw click 'header button:has(span.block.text-sm)'
playwright-cli -s=wf540smoke --raw click 'text=Sign out'
playwright-cli -s=wf540smoke --raw fill 'input[type="email"]' "$WF540_USER_A_EMAIL" >/dev/null
playwright-cli -s=wf540smoke --raw fill 'input[type="password"]' "$ADMIN_PASSWORD" >/dev/null
playwright-cli -s=wf540smoke --raw click 'button[type="submit"]'
```

Agent-owned fixture/browser cleanup runs in a `finally`: release every latch, remove every task route, restore
the original light/dark mode, sign back in as the bootstrap admin, then delete in
reverse dependency order only the inventoried overrides, entries, Screen, media,
content types, user-settings rows, access-log rows, sessions, and synthetic users.
Every inventoried access-log row is deleted by its exact UUID before its referenced
session/user; the cleanup then proves that exact UUID absent. Alongside the
entity inventory, keep redacted cleanup-resource records for `session-user-a`,
`session-user-b`, `setting-user-a`, `presentation-override`, and
`media-storage-object`, plus one `access-log-user-a|b` record per acquired row. Each
`session-user-*` record uses `identifierType:"db-id"` and the synthetic session
row's UUID. Each `access-log-user-*` record uses `identifierType:"db-id"` and that
exact access-log row UUID, with its owning synthetic user/session UUID only in
`ownerSubjectIdentifier`; every non-access-log cleanup record sets that field to
`null`. Neither record stores an authentication credential. Every
other record contains only its non-secret DB ID, bounded
composite key, or storage key plus a bounded sanitized absence-probe result; it
must never contain a cookie, session token/hash, CSRF token, password/hash, raw
row, or storage credential. Use one record per acquired row/object, so multiple
presentation overrides remain separately inventoried. The media record proves
both its DB row and exact task-owned storage object/key absent. A separate
authoritative list/detail query
must prove every exact entity and cleanup-resource identifier absent. Never
truncate a table, delete by prefix alone, or delete unrelated rows. Close the
browser after the absence probes; return host ownership to the orchestrator.
The agent does not stop the helper. In the workflow's outermost `finally`, the
orchestrator always signals and awaits the exact retained process group/handle, with
a bounded TERM→KILL fallback, even when the smoke agent is interrupted, throws, or
fails schema validation. After stopping it, prove every inventoried child PID absent and prove no listener
remains on any helper-owned port: API `3000`, Admin Vite `5173`, or site Vite
`5174`. Port 5174 is cleanup evidence even though front health uses the proxied
URL on port 3000.

The workflow owns an orchestration-level `try/finally` around every smoke attempt
and fixes the nonce/prefix before dispatch. Even if the smoke agent is interrupted,
throws, or fails schema validation, a separate cleanup agent always discovers only
rows and objects belonging to that nonce, resolves them to exact non-secret IDs/keys,
deletes by those exact identifiers (never by prefix), and proves fixture/session/object
and access-log absence while the owned host is still available. It returns exactly one
runtime
receipt for each of `orchestrator-discovery`, `orchestrator-identifier-validation`,
`orchestrator-exact-delete`, `orchestrator-absence`,
`orchestrator-helper-stop`, and `orchestrator-port-probe`, all bound to the fixed
prefix. The first four are returned by the cleanup agent while the last two come
only from the orchestrator's retained `ChildProcess` finally. Primary, cleanup-agent,
and host-stop failures are aggregated rather than masking one another; a retry starts
with a new prefix, a newly owned helper, and wholly fresh evidence. A cleanup-agent
throw/schema failure gets one bounded second cleanup attempt against the **same**
prefix while the owned helper remains live; both attempt errors are aggregated, and
the workflow cannot advance to a new prefix before this retry plus outer host stop.
Browser authority is dispatched at most once. If the first cleanup attempt was told to
recover the browser and then throws or returns invalid evidence, the second attempt is
DB/storage-only and executes zero Playwright commands: it cannot issue anything after a
possibly successful terminal receipt 7, cannot substitute for the missing browser proof,
and therefore cannot authorize a new-prefix retry.

Browser cleanup is conditional and never hidden inside those four runtime receipts.
When the primary smoke successfully executed and returned the canonical terminal
seven-receipt matrix, the outer cleanup agent executes **zero** Playwright commands;
it performs only DB/storage discovery, exact deletion, and absence proof. When the
primary terminal matrix is absent or malformed, the cleanup agent performs browser
recovery only after DB/storage work and returns a separate receipt for every actual
CLI invocation. It first runs the global session list. If the session is already
absent, that sole command is the terminal `cleanup-session-absence` proof and the
attempt cannot masquerade as complete smoke evidence. If present, the discovery
receipt is followed by the exact seven cleanup commands below. Those recovery
receipts replace—not hide—the primary terminal matrix in canonical evidence; any
partial primary cleanup receipts remain recorded under `superseded-cleanup-*` labels.
The recovery global absence command is the last browser operation overall. No
Playwright command is allowed after a successful canonical receipt 7.

### Deterministic delay and failure strategy

Install method-aware `page.route` handlers; the CLI shorthand route is not
sufficient because several paths support both reads and writes. Expand every
`<...>` placeholder from the recorded fixture inventory before execution and keep
the expanded command in closeout evidence. A deliberate application failure uses
HTTP 200 with malformed JSON (`"{"`) so it exercises the parser/retry path without
creating an expected browser resource-console error. A delayed stale-success
handler captures `await route.fetch()`, waits on its named release latch, then
fulfills that captured response. Count every matching request; an unexpected
duplicate fails the scenario rather than continuing to the backend.

Malformed-JSON handlers are strictly one-shot: read and assert their hit count as
`1`, then remove the handler in a separate full CLI invocation **before** clicking
the real Save/Retry control. They never contain a pass-through retry branch while
installed. Delayed handlers also accept one request only, expose one hit read,
release their captured response, and are then removed. Evidence records
`released:false` for malformed handlers and `released:true` only for delayed
handlers; every record has `hitRead:true`, and malformed records additionally have
`unroutedBeforeRetry:true`.

The required intercepted attempts are:

| Key | Method and expanded path | Mode / visible boundary |
|---|---|---|
| `media-prior-resolution` | `GET **/admin/api/media` | delay captured old media list; a newer override/request must win |
| `entry-save-failure` | `PATCH **/admin/api/content/<TYPE_SLUG>/entries/<ENTRY_ID>` | one malformed-JSON failure; dirty guard remains until real retry |
| `related-first-failure` | `GET **/admin/api/content/<RELATED_A_SLUG>/entries` | one malformed-JSON failure; visible Retry |
| `related-a-refresh` | same exact A path | delayed captured success; the already rendered A rows and their geometry remain visible while the route is pending |
| `preference-a-read-refresh` | `GET **/admin/api/user-settings/customScreens.entry.preferences` | hold one same-user SPA remount read after the latest A value is shared-settled; that exact value may remain visible, then a newer local generation must win after release |
| `preference-a-write-exit` | `PATCH **/admin/api/user-settings/customScreens.entry.preferences` | hold the first A write, queue a second A toggle, leave the old realm through real sign-out, authenticate B, then release; the queued A write must never dispatch and hit count stays `1` |

The command shapes below are binding. Substitute only key, method, and expanded
pattern. A one-shot failure refuses an unexpected second hit; its real retry occurs
only after the separate hit-read and unroute invocations. A delay captures exactly
one real response and releases that same response later. Each setup/release/hit-read/
unroute/Retry/route-list remains a separate full invocation:

```bash
playwright-cli -s=wf540smoke --raw run-code '(page) => { const key = "related-first-failure"; const method = "GET"; const pattern = "**/admin/api/content/<RELATED_A_SLUG>/entries"; page.__wf540RouteHits ??= {}; page.__wf540RouteHits[key] = 0; return page.route(pattern, async (route) => { if (route.request().method() !== method) return route.continue(); page.__wf540RouteHits[key] += 1; if (page.__wf540RouteHits[key] !== 1) throw new Error("wf540_unexpected_duplicate:" + key); return route.fulfill({ status: 200, contentType: "application/json", body: "{" }); }); }'
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540RouteHits["related-first-failure"] ?? 0'
playwright-cli -s=wf540smoke --raw run-code '(page) => (async () => { await page.unroute("**/admin/api/content/<RELATED_A_SLUG>/entries"); return true; })()'
playwright-cli -s=wf540smoke --raw click 'button:has-text("Retry")'
playwright-cli -s=wf540smoke --raw run-code '(page) => { const key = "related-a-refresh"; const method = "GET"; const pattern = "**/admin/api/content/<RELATED_A_SLUG>/entries"; page.__wf540RouteHits ??= {}; page.__wf540Releases ??= {}; page.__wf540RouteHits[key] = 0; return page.route(pattern, async (route) => { if (route.request().method() !== method) return route.continue(); page.__wf540RouteHits[key] += 1; if (page.__wf540RouteHits[key] !== 1) throw new Error("wf540_unexpected_duplicate:" + key); const response = await route.fetch(); await new Promise((resolve) => { page.__wf540Releases[key] = resolve; }); return route.fulfill({ response }); }); }'
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540RouteHits["related-a-refresh"] ?? 0'
playwright-cli -s=wf540smoke --raw run-code '(page) => { const release = page.__wf540Releases["related-a-refresh"]; if (!release) throw new Error("wf540_release_missing"); release(); return true; }'
playwright-cli -s=wf540smoke --raw run-code '(page) => (async () => { await page.unroute("**/admin/api/content/<RELATED_A_SLUG>/entries"); return true; })()'
playwright-cli -s=wf540smoke --raw route-list
```

Before releasing any latch, a separate full assertion command must prove the
pending/dirty/loading visible state and a separate screenshot command must capture
it. After each of the seven flows, read all three log channels with these exact
separate commands; each receipt is linked to that scenario, uses respectively
`console-errors`, `console-warnings`, or `page-errors` as its assertion name, and
has sanitized output exactly `[]`:

```bash
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540ConsoleErrors ?? []'
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540ConsoleWarnings ?? []'
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540PageErrors ?? []'
```

### Seven distinct visible-effect flows

1. **Button/image, light, 1280×900.** Insert Button from the visible Screen
   palette, bind a URL field, clear to the static `http://coderso-a.localhost:3000/`
   fallback, rebind, save/reopen, and read the saved definition to prove no
   empty-field sentinel. Activate the safe link and prove the front URL; an unsafe
   URL remains visibly disabled. Apply a media UUID to a direct image and prove its
   resolved safe URL is the computed `img.src`; missing/unsafe winning IDs show the
   placeholder. Hold `media-prior-resolution`, change the winner, release it, and
   prove the prior URL never replaces the newer one. A media-field override must
   retain the exact UUID in MediaPicker selection and never receive the URL.
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
   `task-540-wf540smoke-related-first-failure.png`, then unroute it and use the
   visible Retry to prove A rows. Install `related-a-refresh`, then open a second tab in the same
   named browser session at
   `/admin/advanced/entries/<RELATED_A_SLUG>/<RELATED_A_ENTRY_ID>`, change one harmless
   authored value, and save through the real entry UI. That real mutation broadcasts
   the `entries:list:<RELATED_A_SLUG>` cache event to the still-mounted first tab and
   triggers the authoritative A refresh; return to the first tab before assertions.
   During
   `related-a-refresh`, prove the already rendered A row text and non-zero geometry
   remain byte-identical while the route hit is held, with no replacement error or
   empty/loading canvas. Use two authored relation fields: A initially contains IDs
   while B is empty. Both real relation pickers load on mount, so B is intentionally
   warm before the switch. Clear A, prove the expected empty/loading transition, then
   select B through the real entry control and prove B is visible from the warmed
   cache. This changes the normalized target identity A→B without mutating the Screen
   document. Release stale A and prove it cannot replace B. The pre-existing unrelated
   content field and presentation draft remain byte-identical; the only content diff
   is exactly relation A cleared plus relation B selected.

   The cache-event trigger uses separate full CLI commands; it must not call
   `clearEntriesCache`, `broadcastCacheEvent`, or another in-page test helper:

   ```bash
   playwright-cli -s=wf540smoke --raw tab-new http://coderso-a.localhost:5173/admin/advanced/entries/<RELATED_A_SLUG>/<RELATED_A_ENTRY_ID>
   playwright-cli -s=wf540smoke --raw fill '<REAL_RELATED_A_EDIT_CONTROL>' '<UPDATED_VISIBLE_VALUE>'
   playwright-cli -s=wf540smoke --raw click 'button:text-is("Save draft")'
   playwright-cli -s=wf540smoke --raw tab-select 0
   ```
7. **Responsive geometry and two users, light/dark.** Execute every resize below
   in order. At 320/390/480, open and closed computed right padding is `24px`, the
   scroller border box is unchanged, content width is positive, and the panel rect
   remains inside the viewport. At 1024/1280, closed/open right padding is
   `32px`/`332px`, border-box width/left edge stay fixed, and open content width is
   exactly 300 CSS px smaller within 1 px. User A enables field metadata and waits
   for the real PATCH. Navigate away through a real internal Admin link while clean,
   change A's server value through the scoped fixture path, return within the same SPA
   realm, and prove the real authoritative read replaces the older A value. Navigate
   away again, install `preference-a-read-refresh`, and remount the entry surface as A:
   only A's latest exact shared-settled value may remain visible while that GET is
   pending. Make a newer local A toggle while it is held, then release it and prove the
   local value wins by per-user write generation.
   After real sign-out/sign-in, user B initially sees the server default and no A
   value; a real return to A restores only A's durable value. Finally hold the first
   `preference-a-write-exit` PATCH, issue the opposite visible A toggle so it is queued,
   and leave the old realm through real sign-out before authenticating B and releasing
   the first response. Read hit count `1` before and after release, prove the queued A
   write never executes with B's session and B stays unchanged, then unroute and return
   to A. One fresh visible A toggle retries successfully and both current UI and durable
   server value converge without an unhandled rejection. Same-mounted A→B→A identity
   generations remain covered by the required Vitest hook suite because real auth
   redirects intentionally replace the realm.
   Prove `coderso.screens.entry.preferences.v1` is absent throughout. User A is
   observed in light and user B in dark, with each theme asserted from computed
   root/surface colors. After the final durable A retry converges, capture the separate
   post-release `task-540-wf540smoke-responsive-user-a-converged.png` final screenshot;
   neither pending A nor pending B image may substitute for it.

```bash
playwright-cli -s=wf540smoke --raw resize 320 844
playwright-cli -s=wf540smoke --raw resize 390 844
playwright-cli -s=wf540smoke --raw resize 480 844
playwright-cli -s=wf540smoke --raw resize 1024 900
playwright-cli -s=wf540smoke --raw resize 1280 900
playwright-cli -s=wf540smoke --raw click 'button[aria-label="Toggle dark mode"]'
playwright-cli -s=wf540smoke --raw run-code '(page) => ({ dark: document.documentElement.classList.contains("dark"), background: getComputedStyle(document.body).backgroundColor })'
```

Every flow gets one final full-page screenshot; delayed/error flows also capture
their transient state. Use these exact absolute paths and separate commands:

```bash
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-button-image-light.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-tabs-content-dark.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-tabs-keyboard-light.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-space-selection-dark.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-dirty-save-failure.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-dirty-guards-final.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-related-first-failure.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-converged.png --full-page
```

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
byte-identical to its in-memory validated evidence before the closure leaf/direct child
and TASK-540 become Done (source leaves already closed by their targeted gates remain
Done):

````text
<!-- TASK-540-SMOKE-EVIDENCE:BEGIN -->
```json
{ ... canonical redacted evidence ... }
```
<!-- TASK-540-SMOKE-EVIDENCE:END -->
````

These markers are TASK-540-specific closeout metadata, not the future generic
TASK-545 manifest contract. After any source repair or smoke rerun, closure replaces
this block with the newest validated canonical evidence before re-closing statuses.

The final cleanup commands include the same task session and are each separate:

```bash
playwright-cli -s=wf540smoke --raw run-code '(page) => (async () => { for (const release of Object.values(page.__wf540Releases ?? {})) release(); await page.unrouteAll({ behavior: "wait" }); return true; })()'
playwright-cli -s=wf540smoke --raw route-list
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540ConsoleErrors ?? []'
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540ConsoleWarnings ?? []'
playwright-cli -s=wf540smoke --raw run-code '(page) => page.__wf540PageErrors ?? []'
playwright-cli -s=wf540smoke --raw close
playwright-cli --raw list
```

Exactly seven final receipts whose operation starts with `cleanup-` occur in the
displayed order—no duplicate or extra `cleanup-*` operations. Earlier preparatory
theme/bootstrap/fixture steps use distinct non-`cleanup-*` operation labels:

| # | Operation | Exact command shape | Sanitized output |
|---:|---|---|---|
| 1 | `cleanup-release-unroute` | release every named latch and `await page.unrouteAll({behavior:"wait"})` | `true` |
| 2 | `cleanup-route-list` | session `route-list` | `[]` |
| 3 | `cleanup-console-errors` | final console-error read | `[]` |
| 4 | `cleanup-console-warnings` | final console-warning read | `[]` |
| 5 | `cleanup-page-errors` | final page-error read | `[]` |
| 6 | `cleanup-close` | session `close` | `closed` |
| 7 | `cleanup-session-absence` | global `playwright-cli --raw list` | `true` after proving `wf540smoke` absent |

The close and final global list are distinct invocations. Receipt 7 may normalize
the non-secret list result to boolean `true`, but it may not omit the command or infer
absence merely from a successful close. It is also the final browser receipt overall;
no browser command or receipt may follow the proven session absence. This invariant
applies whether the seven receipts came directly from the primary agent or from the
conditional outer recovery. A valid primary matrix suppresses outer browser work
entirely. A recovery matrix is merged as the canonical final sequence, retains the
real stdout/stderr hashes from each recovery CLI invocation, and remains terminal.

## Validation and closure

```bash
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); if (!reachable) process.exit(1); process.exit(0)'
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bunx vitest run --config vitest.config.ts tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/admin/customScreensClient.test.ts \
  tests/vitest/customScreens/screenDocumentOps.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts \
  tests/vitest/customScreens/customScreenService.test.ts \
  tests/vitest/customScreens/relatedEntryResolver.test.ts \
  tests/vitest/admin/entriesClient.test.ts \
  tests/vitest/admin/mediaClient.test.ts \
  tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/use-screen-entry-preferences.test.ts \
  tests/vitest/ui/use-screen-related-entries.test.tsx \
  tests/vitest/ui/custom-screen-entry-draft.test.ts \
  tests/vitest/ui/custom-screen-binding-panel.test.tsx \
  tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx \
  tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui/custom-screen-route-params.test.ts \
  tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx \
  tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx \
  tests/vitest/ui-integration/screen-editor-sections.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/widgets/screenWidgets.test.tsx \
  tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/integration/routes/cors.test.ts \
  tests/integration/routes/customScreensRoutes.test.ts \
  tests/unit/assistant/actionExecutorService.test.ts
bun run test
bun run precommit:check
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
# Must be executed and captured even when it exits non-zero for the exact known
# TASK-545-owned finding described below.
bun run scan:security:strict
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
git diff --check
```

The `canConnect` command is a mandatory `select 1` preflight and its explicit
`process.exit(0)` prevents imported runtime handles from hanging the gate. If it
fails, do not run/claim DB closure until connectivity is restored. Rerun every
named failing Vitest file once with `bunx vitest run <exact-file>` and every Bun
file once with `bun test <exact-file>` before classification; after any fix,
rerun the failed parent command, and rerun full `bun run test` plus
`bun run precommit:check` whenever source/tests/docs change after their pass.

Immediately before any TASK-540-06-L01 preparation or repair resume, record a content
hash for every existing source-owner matrix file (including the newly created
navigation-guard file, the R01-owned whole-file hash of
`tests/unit/assistant/actionExecutorService.test.ts`, and the L04-repaired whole-file hash
of `tests/vitest/ui-integration/screen-editor-sections.test.tsx`). Refresh that
source-owner baseline only after an exact earlier
source-owner repair passes its matching re-gate, then compare the retained map after
closure; every hash must be byte-identical. Hash the closure-owned aggregate suite
separately at `runClosure` entry and compare it after status closure. The
closure-attributable test patch may contain only
`tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`; earlier
source-leaf changes can still appear in the overall working-tree diff and are not
misclassified as closure edits. Preserve completed descendants as Done, keep the
closure leaf/direct child and root In Progress, and keep any unlanded descendant To Do;
then discover exactly zero or one `_docs/_CHANGELOG/1252-*.md`, reject duplicates, and
create or reuse the fixed safe path above. Require exactly one `Tasks:` metadata line
whose parsed IDs are the exact unique ordered set pinned above; reject missing,
duplicate, reordered, or additional IDs. Before any status mutation, write and
byte-verify the changelog-index anchor plus canonical evidence block containing the
strict generation, baseline, path, evidence hash, and hashed-gate control manifest. The subsequent pending transition
persists identical Closure Pending, Closure Board Baseline, and Closure Changelog Path
receipts on the root/closure parent/leaf. A validated restart requires all three to match
the independently owned control even if the changelog file must be restored at the same
pinned path. Run the complete full validation now, before final family closure. Only after it passes and
every other physical descendant is Done may the status-stage agent record the exact
evidence SHA-256/generation while preserving their identical Closure Board Baseline and
Closure Changelog Path,
mark TASK-540-06-L01,
TASK-540-06, and then TASK-540 Done, and recalculate board
statistics. A read-only mechanical graph gate verifies all statuses/tables, evidence,
the deterministic board-statistics delta, unique 1252 index row, `node --check`, and
`git diff --check`. Any status-stage, mechanical-gate, final-audit,
or final-gate failure reopens the closure leaf/direct child and root, plus only an
exact source owner implicated by verified drift; unrelated completed descendants stay
Done and unlanded descendants stay To Do. Interruption that kills the workflow process
is the only unavoidable best-effort boundary. Do not close with a failed/skipped DB preflight,
functional gate, runtime flow, fixture cleanup, or open child. The strict scan must
run without suppression. Its only permitted non-zero result is the exact unchanged
Semgrep finding
`javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag`
at `_docs/_workflows/task-522-author.mjs:185`, already owned by TASK-545. Record that
truthfully as external non-green, verify the exact rule/path/line against structured
scanner output, and block closure for any additional finding or scanner/tool failure.

Every closure status dispatch captures the exact pre-dispatch Pending/Evidence/
Generation/Baseline/Path/gate projection. Failure rollback restores that projection,
never a partially mutated post-failure value. Pending restart accepts Evidence and
Generation only when both are absent on all three closure contracts or present with one
identical well-formed value on all three. `Repair Pending` is rejected from every root or
parent and every terminal contract; gate receipts are rejected on the root and
TASK-540-06 parent. Board and changelog-index mutation guards compare unrelated-byte
projections after success and failure. Repository snapshots also compare hashes of
ignored `.env`/`.env.*` files without logging their values or hashes.
