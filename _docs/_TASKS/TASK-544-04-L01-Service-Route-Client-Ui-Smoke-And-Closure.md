# TASK-544-04-L01: Service, Route, Client, UI Smoke, and Closure

# FileName: TASK-544-04-L01-Service-Route-Client-Ui-Smoke-And-Closure.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-04
**Priority:** Medium
**Category:** DB Tests / UI Tests / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-544-01-L01, TASK-544-02-L01, TASK-544-03-L01
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope and ownership

Additive-route-test/rerun/docs-only leaf. It may edit only TASK-544 additions to
`tests/integration/routes/media.test.ts` for broad route-registration/mapping coverage;
all service, media-folder route, client and UI suites named below are read-only inputs
owned by 544-01/02/03. It may also edit TASK-544 task-scoped screenshots and closeout evidence under the currently
supported `_docs/_workflows/_smoke/` path, _docs/MEDIA_SPEC.md, _docs/ADMIN_CACHE.md and
_docs/ADMIN_CACHE_MAP.md when their contract changes, family statuses,
_docs/_TASKS/README.md, changelog 1256, and _docs/_CHANGELOG/README.md. It must not edit
production source or scanner/workflow config. Read indexes fresh before closure.

## Implementation Pseudocode

Read-only source-test verification and additive route proof:

~~~ts
verify the 544-01-owned service unit tests already:
  feed direct/wrapped {code:"23505", constraint_name:owned} into the pure predicate;
  expect media_folder_slug_conflict;
  feed unrelated constraint_name/code and expect original error;
  prove deterministic blocked create/update writes passed precheck before owned 23505.

verify its deterministic DB concurrency proof already:
  create uniquely prefixed prerequisite rows and open a separately owned postgres-js blocker;
  begin the blocker transaction and write the create/update collision without committing;
  start exactly one service create/update whose precheck has already passed;
  poll bounded pg_blocking_pids/pg_locks evidence until that service backend PID is waiting on
    the exact blocker PID/transaction and its ungranted transaction-ID lock matches the
    blocker's granted lock; timeout is a failed test, never probabilistic retry;
  commit the blocker, then assert the waiting operation receives the owned 23505 and maps to
    media_folder_slug_conflict; assert unrelated rows/constraints remain untouched;
  rollback on setup failure and clean only exact owned rows in FK-safe order.

verify the media-folders route assertions after those service barriers:
  POST /media/folders maps the stable media_folder_slug_conflict to ApiError 409;
  PATCH /media/folders/:id maps the same stable conflict to ApiError 409;
  pass each caught ApiError through toErrorResponse and serialize the exact bounded JSON;
  neither response exposes PostgreSQL code, constraint_name, SQL, cause, or raw message.
  Do not substitute Promise.allSettled timing for either deterministic blocker proof.

verify the 544-02-owned client deferred-promise tests already:
  reject list request then retry;
  overlap old and forced-new request;
  assert identity guard preserves new promise/cache.

verify the 544-03-owned UI tests for each operation already:
  reject load/create/rename/reorder/delete;
  assert role=alert, retry button, pending state, retained draft/selection/order;
  assert the real page's captured Retry double-click starts one deferred request,
    removes the consumed Retry while aria-busy remains true, and ignores the second click;
  assert a cross-tab load keeps its retained mutation action disabled, then its captured
    Retry double-click likewise yields one request and zero Retry locators while pending;
  resolve retry and assert success-only dismissal/reconciliation.

add only to tests/integration/routes/media.test.ts:
  assert the existing POST and PATCH media-folder routes remain registered and their
  centralized media_folder_slug_conflict -> 409 mapping is reachable after the direct
  deterministic proofs, without changing route source.
~~~

If any changed-behavior assertion is absent or weakened, return it to the owning source
leaf and repeat that leaf's gate. Do not repair or rebaseline source-owned tests here.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/mediaFoldersService.test.ts \
  tests/integration/routes/media-folders.test.ts \
  tests/integration/routes/media.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/mediaFoldersClient.test.ts \
  tests/vitest/ui/media-folder-rail.test.tsx \
  tests/vitest/ui/media-library.test.tsx \
  tests/vitest/mediaUi/mediaLibrary.test.tsx
set -a && source .env && set +a && bun run test
set -a && source .env && set +a && bun run precommit:check
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
bun run scan:security:strict
git diff --check
~~~

Re-run every named failing file once in isolation. If DATABASE_URL is unavailable, do
not claim DB/concurrency closure. Run a DB `select 1` preflight before targeted or full
DB tests. The full test, precommit, Admin build/boundary/bundle, five release gates, and
strict scan are mandatory before smoke and Done. If a final-drift fix changes source,
tests, or docs, rerun full `bun run test` and `bun run precommit:check`. After staging,
run `bun run precommit` before the task-scoped manual commit.

## Runtime smoke

Start from a clean process state and retain the helper PID/PTY cleanup handle. Execute the
literal helper plus independent health checks (do not abbreviate the helper):

~~~bash
coderso-dev-core-host /home/coder/project/Coderso
curl --fail --silent --show-error http://coderso-a.localhost:5173/admin/ >/dev/null
curl --fail --silent --show-error http://coderso-a.localhost:3000 >/dev/null
~~~

Source `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env` without printing, logging, screenshotting,
or persisting their values. Open the one named session as a real touch/no-hover context; every
later browser action, assertion, route, release, screenshot, and close is a separate full CLI
command with the same prefix (never an alias or in-process replacement):

~~~bash
playwright-cli -s=wf544smoke open http://coderso-a.localhost:5173/admin/media --device "iPhone 15"
playwright-cli -s=wf544smoke resize 1440 900
playwright-cli -s=wf544smoke fill 'input[type="email"]' "$ADMIN_EMAIL" >/dev/null
playwright-cli -s=wf544smoke fill 'input[type="password"]' "$ADMIN_PASSWORD" >/dev/null
playwright-cli -s=wf544smoke click 'button[type="submit"]'
~~~

The two credential-bearing fill commands suppress CLI-generated code output so expanded
environment values never enter the agent transcript. Evidence records only the literal
`$ADMIN_EMAIL`/`$ADMIN_PASSWORD` command forms above; no generated fill code or field value.

After login/setup, begin a clean canonical console/page-error observation interval and require
`matchMedia("(hover: none)").matches === true` plus
`matchMedia("(pointer: coarse)").matches === true`, including after resizing to the wide
viewport. Use full `resize 1440 900` and `resize 390 844` commands for the exact wide/narrow
sizes below. After every canonical flow, run three separate full task-session `run-code`
readouts for captured console errors, console warnings, and page errors; retain the commands
and array outputs and require every output empty.

### Deterministic one-shot faults

The CLI `route` command cannot distinguish GET from POST on the shared folder-list URL, so it
must not be used for these faults. Install each fault with a full method-aware `run-code`
command. The workflow generates this command byte-for-byte. The handler matches one method plus
one exact path and increments its counter for _every_ matching request before branching. Hit one
waits on a named release latch so pending UI is observable. Every matching duplicate is also
fulfilled with malformed JSON and HTTP 200 immediately; it is never continued to the backend.
Only a method mismatch may continue. Example for the list flow (the other four use the table below):

~~~bash
playwright-cli -s=wf544smoke run-code '(page) => { const key = "list-retry-light-wide-initial-fault"; const pattern = "**/admin/api/media/folders"; const method = "GET"; page.__wf544FaultHits ??= {}; page.__wf544FaultRelease ??= {}; page.__wf544FaultHits[key] = 0; return page.route(pattern, async (route) => { const request = route.request(); if (request.method() !== method) return route.continue(); page.__wf544FaultHits[key] += 1; if (page.__wf544FaultHits[key] > 1) { await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); return; } await new Promise((resolve) => { page.__wf544FaultRelease[key] = resolve; }); await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); }); }'
playwright-cli -s=wf544smoke run-code '(page) => { page.__wf544FaultRelease["list-retry-light-wide-initial-fault"](); return true; }'
playwright-cli -s=wf544smoke run-code '(page) => page.__wf544FaultHits["list-retry-light-wide-initial-fault"] ?? 0'
playwright-cli -s=wf544smoke unroute '**/admin/api/media/folders'
playwright-cli -s=wf544smoke run-code '(page) => (async () => { await page.unroute("**/admin/api/media/folders"); return true; })()'
playwright-cli -s=wf544smoke route-list
~~~

For every flow repeat that exact full setup/release/hit-read/CLI-unroute/page-unroute/route-list command form,
substituting only these literal values. Replace an id placeholder with its recorded
`encodeURIComponent` value before execution and retain the fully expanded command in evidence:

| Attempt key | Method | Exact route pattern |
|---|---|---|
| `list-retry-light-wide-initial-fault` | `GET` | `**/admin/api/media/folders` |
| `list-retry-light-wide-retry-fault` | `GET` | `**/admin/api/media/folders` |
| `create-retry-dark-narrow-initial-fault` | `POST` | `**/admin/api/media/folders` |
| `rename-retry-dark-wide-initial-fault` | `PATCH` | `**/admin/api/media/folders/<ENCODED_RENAME_ID>` |
| `reorder-retry-light-narrow-initial-fault` | `POST` | `**/admin/api/media/folders/reorder` |
| `delete-retry-light-wide-initial-fault` | `DELETE` | `**/admin/api/media/folders/<ENCODED_DELETE_ID>` |

Before releasing each latch, assert the visible pending state with separate full CLI commands.
For each initial non-Retry mutation, action, disabled probe, and disabled second activation are
workflow-generated exact-equality commands for the _same_ accessible-name target: `Create folder`,
`Save folder name`, `Delete <exact targetName>`, or `Move <row name> up|down`. The create/rename/
delete names are fixed from the product or recorded exact target. Reorder records only structured
`{ rowId, rowName, direction }`; the validator maps that id to the DOM-read before row, requires a
same-parent adjacent neighbor in the requested direction, requires that single swap equal
`capturedOrder`, and only then derives the Move accessible name. A free-standing action-name
string cannot satisfy the contract. Require rail `aria-busy="true"`, disabled output `true`,
disabled second-activation output `true`, and exact attempt-key fault hit `1`; initial mutation
action output is `null`.

For the first list attempt, whose real trigger is an external cacheBus event, keep the exact
retained-row representative Delete locator. Before the event install the workflow-generated
DELETE-only `__wf544MutationHits` counter on `**/admin/api/media/folders/*`. Matching DELETE
traffic is fulfilled malformed and never reaches the backend. After the disabled representative
activation, the exact counter read also awaits `page.unroute` and must output `0`, independently
of the GET fault counter's output `1`. Record the cacheBus action's actual `true` output.

The retry-fault attempt must instead execute one canonical action that resolves the exact Retry
locator once and calls `click()` twice synchronously on that captured element. Its command output
must prove exactly one Retry was captured. While the request latch remains held, separate exact
commands must read rail `aria-busy` as `"true"`, the same Retry accessible-name locator count as
`0` (consumed feedback is absent), and the attempt-key fault hit as `1`. There is no
`controlDisabled: true` or `secondActivationRequestDelta: 0` self-claim for this path: the exact
double-activation command plus DOM-count and request-hit outputs are the evidence. The recorded
attempt order is `routeFault → mutationCounterSetupIfNeeded → action → pendingRailBusy →
pendingControlProbe → pendingSecondActivationIfNeeded →
pendingMutationCounterReadAndCleanupIfNeeded → pendingHitRead → release → failureProbe → hitRead →
unroute → pageUnroute → routeList`; the retry path records no separate pending second-activation command
because both synchronous activations already occurred in its canonical action. After release,
require hit count exactly `1`, fixed alert copy, and
the operation-specific Retry accessible name. After _each_ released failure, retain one full
`run-code` failure probe plus its browser output reading the live alert role, exact Retry button
accessible name, fresh `data-folder-error-token`, and visibility. Use the workflow's canonical
DOM-reading command; it also reads the current form input and focused element. For create/rename
those two values must equal the before probe immediately after failure; only then may the smoke
edit the draft to produce the later assertion mismatch. Do not substitute constants or a
page-side debug/evidence global. The list
flow therefore has two independent
failure probes/tokens rather than one aggregate claim. Run the full CLI-registry
`unroute '<same-pattern>'` command, then the canonical full `run-code` command that awaits
`page.unroute(<same-pattern>)`, then `route-list`, and prove the exact pattern is absent before
clicking Retry. The CLI may truthfully report `Removed 0 route(s)` for a page handler installed
through `run-code`; the page-unroute result must still be `true`. A failed setup,
missing/extra hit, unresolved latch, or uncleared route fails the scenario. Do not return
`duplicatePendingRequests: 0`: the every-match fault counter output `1` plus the separate list
DELETE counter output `0` are the executable duplicate-suppression evidence. Cleanup executes
these release/CLI-unroute/page-unroute/route-list steps in a `finally` path even when an assertion fails. The
real 23505/409 behavior remains in the Bun DB/route tests; HTTP-200 malformed JSON uses the
literal string body `"{"` because `playwright-cli run-code` does not expose Node's `Buffer`
global inside this callback. This avoids an expected non-2xx resource-console error in the
canonical browser interval while still exercising the response parser failure.

The workflow also owns an outer idempotent cleanup `finally`: even if the smoke agent, its
schema, a visible assertion, PNG validation, or the smoke-evidence audit throws, it releases
all named latches, removes all routes, proves a globally empty route list, closes the exact
named session, and stops/verifies only the exact helper process tree and its owned ports.
Its process/port probes always prove ports `3000` and `5173` absent, even when setup failed before
a helper PID was retained, and also cover every discovered helper-owned alternate port.

### Five canonical visible flows

Run exactly this matrix; setup/debug/cleanup probes are not scenarios:

| Kind | Theme / viewport | Required visible assertions before and after Retry |
|---|---|---|
| `list-retry` | light / `1440x900` | Last good nested tree remains; fixed load alert and Retry are visible; failed Retry once more publishes a fresh visible load error; final Retry restores rows. Rail bounding width is exactly `200px`; a focused row action and a wide coarse-pointer row action both have computed display/visibility enabled. The active row retains `bg-primary-soft` and `text-primary-soft-foreground`, with non-transparent computed light-theme colors. |
| `create-retry` | dark / `390x844` | Exact normalized name and input focus survive failure. The canonical mismatch command changes only the draft while keeping parent/generation, the open form is observed, and the canonical restore command returns it to the immutable target; matching Retry then creates exactly one named row and dismisses that matching form. Alert and row-action rectangles remain inside the rail (`scrollWidth <= clientWidth` and no right/bottom overflow); computed dark-theme active-row colors remain visible. |
| `rename-retry` | dark / `1440x900` | Exact folder id, draft, focus, and form generation survive failure. The canonical mismatch command changes only the draft while retaining id/generation, the open form is observed, and restore returns the immutable target; matching Retry changes only that row's name and closes the form. Rail width remains `200px`; active tokens/computed colors remain unchanged. |
| `reorder-retry` | light / `390x844` | Capture sibling DOM ids/order before activation; failure leaves byte-for-byte DOM order unchanged; matching immutable Retry applies the captured order once. Actions are visible under narrow/no-hover/coarse-pointer CSS and the compact alert does not overflow. |
| `delete-retry` | light / `1440x900` | Initial confirmation cancel sends zero requests. Before and after the failed confirm, selected row, `activeFolderId`, `mediaFilterState.folderId`, and child parent all equal the exact delete target id. The bounded `Retry deleting <folder>` accessible name is the second explicit confirmation and opens no generic dialog; success sends one DELETE, removes that folder, unparents its child visibly, and clears both visible filter owners only when still targeting the deleted id. Rail width/tokens remain unchanged. |

The available CLI closes or poisons its named session when a second native JavaScript dialog is
accepted, so the delete scenario uses a deterministic browser confirmation seam without a
page-side evidence object. Before the cancel click, one full `run-code` sets
`window.confirm = () => false`; the click must produce zero DELETE requests. Before the failed
confirm click, a separate full command sets `window.confirm = () => true`. After that request
fails and before the explicitly labelled Retry, a third command replaces confirm with a
function that throws `Unexpected delete confirmation`; Retry must succeed without triggering
that guard or a page error. After the success screenshot/probes, the full CLI `reload` command
restores the native browser function. These exact commands are workflow-validated. Do not use
native `dialog-dismiss`/`dialog-accept` or install a `page.once("dialog")` handler.

Return one delete-only `confirmEvidence` object (and `null` for all other flows) with this exact
live execution order: `cancelOverride → cancelClick → cancelDeleteCountRead → acceptOverride →
faultDelete → guardOverride → retry → successProbe → screenshot → nativeRestore`. The fault
route is installed immediately before that sequence. `cancelClick` and `faultDelete` are the
same workflow-generated exact Delete-button command. The cancel count is not an aggregate:
immediately after the cancel click execute the canonical attempt-key
`page.__wf544FaultHits[<attempt-id>] ?? 0` read and record its browser output `0`. Record actual
`true` outputs from the three override commands, successful cancel-click completion, the exact
fault action, exact Retry and success-probe commands, the sole delete-flow screenshot command,
and successful full-CLI reload completion. The workflow rejects evidence whose command strings
only name these steps without binding the exact commands and live outputs.

Before accepting primary or cleanup evidence, recursively inspect every recorded full
`playwright-cli` command string, including setup arrays, fault/action/pending/probe fields,
screenshots, route cleanup, fixture cleanup, theme restore, and browser cleanup. Fail closed on
`dialog-accept`, `dialog-dismiss`, `page.once("dialog")`/single-quoted equivalents, or any
persistent page/window/global identifier whose name contains `smoke` or `evidence`. The existing
Playwright-side `__wf544FaultHits`, release latches, list-only `__wf544MutationHits`, and
console/page-error observers remain the only narrowly scoped runtime trackers; none may stand in
for DOM-visible assertions.

For every scenario record structured evidence, not prose-only claims: `kind`, theme, exact
viewport, touch/no-hover/coarse-pointer booleans, fault method/pattern/setup command/release
command/hit-read command/hit count/CLI-unroute/page-unroute commands and result/route-list result, alert text and token
change, Retry accessible name, exact action output, `aria-busy` output, initiating-control-disabled
or consumed-Retry-absent DOM output, every-match pending hit-read output, list-only DELETE counter
setup/read-and-unroute command plus output, exact focused element/input value/selected folder/DOM
ids before-failure-after-success, structured reorder row/direction and derived adjacent swap, and
success-only dismissal/reconciliation. Record numeric rail/alert/action `DOMRect`,
`clientWidth`, `scrollWidth`, token class strings, computed background/text/display/visibility,
and per-scenario console errors, warnings, and page errors; every error array must be empty.
For every scenario retain three full DOM probes: `beforeProbeCommand` immediately before the
fault, `assertionProbeCommand` while the final fault and any deliberately mismatched/reopened
form remain visible, and `successProbeCommand` immediately after the final successful Retry.
Their snapshots must source the aggregated before/failure/after state rather than repeat
self-reported values. Record the literal order
`beforeProbe → faultAttempts → makeDraftMismatchIfNeeded → assertionProbe → restoreMatchingFormIfNeeded → finalRetry → successProbe`;
all three probe
commands must equal the workflow-generated command strings, not merely mention their selectors.
For create/rename the assertion snapshot proves a draft-only mismatch while kind, target/parent,
and form generation stay identical to the immutable Retry target. An exact generated mismatch
command and its DOM-read target output precede that assertion. One exact generated restore
command fills that target's name, returns a DOM-read target identical to the Retry payload, and
only then may final Retry exercise the matching-form dismissal guard. Other flows return null
for both mismatch fields and both restore fields.
Stale-success and changed-target/generation races remain mandatory direct Vitest coverage from
TASK-544-03; this live matrix does not claim to execute those additional async races.
The failure probe reads the scenario form evidence together with
`getBoundingClientRect`, `getComputedStyle`, and `matchMedia` through the literal
`data-media-folder-rail`, `data-media-filter-folder-id`, `data-media-folder-id`,
`data-media-folder-actions`, `data-folder-error-*`, `data-folder-retry-*`, and
`data-folder-form-*` seams. It may not synthesize constants or use a page-side debug/evidence
global; its returned state/form/geometry/media-query branches and the before/success state
snapshots must be identical to the corresponding structured evidence above.
Every snapshot carries DOM-read folder `{ id, name, parentId }` rows. Create success must add
exactly one recorded id with the expected name while preserving all prior rows; rename success
must change only the recorded target row's name. Delete records the exact child id used for the
before/failure parent-retention and success-unparenting proof.

Capture at least one distinct valid PNG per canonical flow with a separate full command such
as:

~~~bash
playwright-cli -s=wf544smoke screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-544-wf544smoke-list-retry.png --full-page
~~~

Use uniquely prefixed nested fixtures and record exact created ids per scenario. The flattened,
duplicate-free scenario-owned id set must equal the top-level created/deleted/verified-absent
set and include every non-null target, child, and success-target id. In cleanup, release any
remaining latch, run both CLI unroute and canonical page unroute for every exact pattern,
use `page.unrouteAll({ behavior:"wait" })` as the final idempotent guard, require `route-list`
empty, delete every fixture,
verify every created id absent, first read and later restore the exact original product color
mode with canonical full commands, and record both exact `{ preference, resolved }` results.
The existing product contract is only `light | dark`; absent/invalid storage resolves to its
documented light default and must not be widened into a new `system` preference. Then confirm the canonical
console/warning/page-error arrays remain empty. Finish with:

~~~bash
playwright-cli -s=wf544smoke close
playwright-cli list
~~~

Require `wf544smoke` absent from the session list. Stop the retained helper through its normal
interrupt/cleanup handle, wait for it, and verify its API/Admin/front child processes and
ports `3000`, `5173`, and helper-owned alternates are gone. Record full commands with secrets
redacted, exact created/deleted/verified-absent id sets, original/restored theme preference and
resolved mode, route hit and
cleanup evidence, helper PID/process/port checks, distinct PNG paths, sizes, and SHA-256 hashes.
Outer cleanup is PID/port-bound: use `kill -INT -- <rootPid>` only for the exact retained helper,
one `bash -lc 'if kill -0 -- <pid> 2>/dev/null; then exit 1; fi'` result per helper-tree PID,
and one workflow-generated `bash -lc` guard around absolute
`/usr/bin/lsof -nP -iTCP:<port> -sTCP:LISTEN -t` per verified port. Listener output fails;
only status `1` with empty combined output means no match; every other status/output combination
fails closed. The PID set must equal the
process-probe set; the verified port set must equal
the port-probe set and always include 3000/5173. Broad name-based kill commands are forbidden.
Each fixture cleanup command is canonical and id-bound. Through one full task-session
`run-code`, read the authenticated folder list first, skip only when that exact id is already
absent, otherwise fetch the existing CSRF token and DELETE only
`/admin/api/media/folders/<encodeURIComponent(id)>`; accept only an OK response. Then run a
separate exact-id authenticated folder-list absence probe. This avoids cleanup-only confirm
dialogs while proving authoritative server absence; unrelated ids/commands cannot satisfy
scenario cleanup.
Describe screenshots as local evidence because TASK-545 still owns durable manifests and the
`.gitignore` exception.

TASK-545 lands later. Record current task-scoped screenshots and concise closeout facts;
do not depend on, pre-create, or claim validation by TASK-545's future durable manifest/
schema/`.gitignore` contract.

## Documentation and closure

Document the owned 409 race mapping, retryable dedupe lifecycle, success-only cache
events, and visible state-preserving UI errors. Run fresh post-audit lenses for DB error
specificity, promise identity, state retention, cache timing, and test integrity. Create
changelog 1256, mark every descendant Done, close the parent, and synchronize indexes.

## Completion evidence

- Targeted Bun service/route coverage passed 36/36; the four targeted Vitest suites
  passed 78/78. Full validation passed Bun 1,687 with one optional live OpenAI skip and
  zero failures across 261 files, plus Vitest 6,794/6,794 across 836 files.
- Core lint/types, `precommit:check`, Admin build (2,637 modules; chunk warnings only),
  Admin boundary (776 files), Admin bundle, and all five release gates passed. Targeted
  Semgrep reported zero TASK-544 findings. The strict scan's only non-green result was
  the exact unchanged `_docs/_workflows/task-522-author.mjs:185` finding owned by
  TASK-545; Bun audit, Trivy, and Gitleaks were clean, without suppression.
- Fresh source, test, post-implementation, and smoke audits reported zero
  High/Medium/Low findings. The final five real flows used the required helper and full
  task-scoped CLI commands in light/dark and wide/narrow modes, asserted visible state,
  geometry, hit counters, confirmation behavior, and zero canonical console/warning/page
  errors. All nine fixtures, the DB prefix, setup/theme state, routes, session, helper
  process tree, and ports were cleaned or restored.
- Earlier measured attempts exposed and corrected the load-busy generation drift and
  hardened the smoke contract: malformed JSON uses literal `{` because browser `Buffer`
  is unavailable; CLI-installed routes receive an exact `page.unroute`; native dialog
  session poisoning was replaced by deterministic confirmation overrides; an already
  consumed Retry is asserted absent. Attempts with stale retry expectations or incorrect
  probe chronology were discarded before the final run.
- Credential fills redirect command output to `/dev/null`; the recent workflow-artifact
  scan found zero credential-value hits. Older ignored local artifacts predate this task
  and remain out of scope pending separate user-authorized hygiene.

| Canonical final flow | SHA-256 | Bytes |
|---|---|---:|
| `task-544-wf544smoke-final4-list-retry.png` | `8c5828656ed43cc18a17d95c5ad64831a0556dd45d9125b44255a2eb0d3c59ad` | 132593 |
| `task-544-wf544smoke-final4-create-retry.png` | `50c11eda345d66eb1034962706f103cd334c4e8059b52d96a019489f5a736dcc` | 61512 |
| `task-544-wf544smoke-final4-rename-retry.png` | `56c422f73cf19199fc1f62b28d693983ae3d640c843046892739247199364400` | 130683 |
| `task-544-wf544smoke-final4-reorder-retry.png` | `52885b12659d335495a9273aa172d52cc7cbc763f730c302556ded4c636f24a7` | 61650 |
| `task-544-wf544smoke-final4-delete-retry.png` | `422a8234367e8f7ad9c0476ae183a090df1c44322f0b0ac5fe90cfa41901930f` | 128547 |

These PNGs are task-local smoke evidence; TASK-545 still owns the durable evidence
manifest and `.gitignore` contract.
