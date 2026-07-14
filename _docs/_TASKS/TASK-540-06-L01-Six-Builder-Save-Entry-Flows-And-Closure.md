# TASK-540-06-L01: Seven Builder-Save-Entry Flows and Closure

# FileName: TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-06
**Priority:** High
**Category:** Testing / Documentation / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01, TASK-540-03-L01, TASK-540-04-L01..L04, TASK-540-05-L01..L02
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- new aggregate suite
  `tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`; this is the
  only test file closure may create or edit
- every other Vitest/Bun path in the required matrix is read-only here and remains
  owned by its source leaf, including the image-inspector, Custom Screens client,
  entry-preference persistence, and navigation-guard suites
- `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`
- relevant Custom Screens user/developer guides
- task-prefixed screenshots named `_docs/_workflows/_smoke/task-540-*`
- TASK-540 descendant statuses, board row/statistics, changelog 1252 at closure

Do not reopen production source or re-baseline/edit a source-owner test. If a source
defect or missing source-owner assertion remains, return it to its owning leaf/fix
workflow, re-run that leaf's gate, then resume closure.

## Required test matrix

```text
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
tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx
tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx
tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx
tests/unit/settings/userSettingsService.test.ts
tests/integration/routes/userSettings.test.ts
tests/integration/routes/customScreensRoutes.test.ts
```

The closure ownership reconcile also verifies, read-only, that TASK-540-02-L01
solely wrote `ScreenBlockInspector.tsx` plus its image-inspector suite, and that
TASK-540-04-L03 solely wrote `screenEntryPresentationOverrideContract.ts`,
`screenEntryPresentationOverrides.ts`, `customScreensClient.ts`, and
`customScreensClient.test.ts`. The workflow's leaf allowlists, targeted commands,
aggregate matrix, and closure hash set must name these exact paths identically.

Assertions must cover exact reject-unknown/round-trip behavior, hostile URL
corpus, recursive children/slot rejection, direct-image UUID→media URL resolution and
cancellation, link-only/legacy disabled compatibility, Tabs minimum/maximum plus keyboard/ARIA/visible
panel behavior, nested interactive Space, promise fail→retry and identity guard,
cacheBus target refresh without dirty overwrite, target A→B immediate stale-row
disappearance before delayed B resolves, both dirty guards, narrow layout,
landmark role, and per-user settings isolation including a delayed prior-user PATCH.
The aggregate Button flow must bind, clear, rebind, save, and reopen while proving no
empty-field sentinel reaches the persisted definition. The new aggregate file may
compose public production seams and leaf-owned test helpers, but it must not copy
production algorithms or weaken a source-owner assertion.
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
run full test/precommit/Admin build-boundary-bundle/release/security gates
restart the Bun server, execute the seven synthetic builder -> save -> entry flows,
save task-540-prefixed screenshots and record visible scenario evidence in closeout
update only the declared product/cache/API docs
atomically keep all TASK-540 files In Progress, create/verify pinned changelog 1252,
run full validation, then atomically update all statuses/rows/statistics and close the
parent; run the mechanical graph gate and rollback to In Progress on a later failure
```

### Orchestrated status flow

Before each implementation/fix pass, a task-only transition agent marks the exact
leaf and its direct child `🚧 In Progress`, keeps the board parent and root
TASK-540 `🚧 In Progress`, and synchronizes the child leaf table plus root
subtask table. A green targeted gate does **not** close the leaf or child: both
remain In Progress and the leaf receives a dedicated `**Targeted Gate Passed:**`
field with the date and exact gate evidence. A fixer likewise keeps its owner
leaf/child In Progress and records `**Revalidation Passed:**` after the re-gate.
These transition agents may edit only the root TASK-540 file, the exact child, and
the exact leaf; they never edit source, tests, board, changelog, or another task
family. Every root/child status table remains In Progress, and the board row plus
statistics stay byte-identical until closure.

All 17 task files remain In Progress through prepare, post-audit, full validation,
live smoke, deterministic cleanup, and smoke-evidence audit. Closure first atomically
sets/keeps every physical task In Progress with a unique pending-generation receipt.
Its evidence owner then creates/updates changelog 1252 with the exact canonical
redacted appendix, the orchestrator byte-verifies it, and the complete full validation
runs while statuses are still In Progress. Only after that pass may the separate
status owner atomically mark every leaf, every child, and finally the root Done and
update the board. A final mechanical graph/evidence/diff gate follows. Every closure
or re-closure updates all 17 task files with the evidence hash and generation; a
missing descendant fails. Any exception after status mutation triggers a best-effort
atomic all-17 reopen/board rollback before propagating the error. No task is Done
before its changelog evidence and full validation pass.

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
inspects their receipts plus PNGs. A missing result is not a pass.

Final closure drift has at most two fresh rounds and is remedial, not throw-only.
Any non-clean round atomically reopens all 17 contracts before remediation starts.
Source-owner findings keep that leaf/child In Progress, fix only its owned files,
re-gate and run full validation, then rerun smoke plus the evidence audit and refresh
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
and reset authored state between flows.

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
contains the rendered identity text):

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
content types, user-settings rows, sessions, and synthetic users. Alongside the
entity inventory, keep redacted cleanup-resource records for `session-user-a`,
`session-user-b`, `setting-user-a`, `presentation-override`, and
`media-storage-object`. Each `session-user-*` record uses `identifierType:"db-id"`
and the synthetic user's/session row's UUID; it never stores an authentication
credential. Every other record contains only its non-secret DB ID, bounded
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
absence while the owned host is still available. It returns exactly one runtime
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
| `related-a-refresh` | same exact A path | delayed captured success; old rows remain with visible refreshing state |
| `related-b-load` | `GET **/admin/api/content/<RELATED_B_SLUG>/entries` | delayed captured success after A→B; immediate empty/loading and stale-A rejection |

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
   `related-first-failure`, read hit `1`, unroute it, then use the visible Retry and
   prove A rows. During
   `related-a-refresh`, rows remain visible with computed refreshing state. Switch
   A→B while A is held; prove immediate empty/loading, release stale A with no DOM
   commit, then release B and prove only B rows. Existing dirty content/presentation
   remains byte-identical throughout.
7. **Responsive geometry and two users, light/dark.** Execute every resize below
   in order. At 320/390/480, open and closed computed right padding is `24px`, the
   scroller border box is unchanged, content width is positive, and the panel rect
   remains inside the viewport. At 1024/1280, closed/open right padding is
   `32px`/`332px`, border-box width/left edge stay fixed, and open content width is
   exactly 300 CSS px smaller within 1 px. User A enables field metadata and waits
   for the real PATCH; after real sign-out/sign-in, user B initially sees the server
   default and no A value. While B is active, change A's server value through the
   scoped fixture path; when A returns, its keyed in-session value may appear only
   while the authoritative A read is pending, after which the changed server value
   replaces it. Repeat the refresh, make a newer local A toggle while it is held,
   then release it and prove the local value wins by per-user write generation.
   Prove `coderso.screens.entry.preferences.v1` is absent throughout. User A is
   observed in light and user B in dark, with each theme asserted from computed
   root/surface colors.

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
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png --full-page
playwright-cli -s=wf540smoke --raw screenshot --filename /home/coder/project/Coderso/_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png --full-page
```

Record for each flow its ID, theme, viewport, linked expanded command receipts,
route hit counts, visible/geometry/ARIA assertions with bounded sanitized observed
outputs, both empty error arrays, and screenshot path/size/SHA-256/device/inode.
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
byte-identical to its in-memory validated evidence before any task status becomes Done:

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
bun --cwd core lint:types
bun --cwd core lint
bunx tsc -p tsconfig.json --noEmit
bunx vitest run tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/admin/customScreensClient.test.ts \
  tests/vitest/customScreens/screenDocumentOps.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts \
  tests/vitest/customScreens/customScreenService.test.ts \
  tests/vitest/customScreens/relatedEntryResolver.test.ts \
  tests/vitest/admin/entriesClient.test.ts \
  tests/vitest/admin/mediaClient.test.ts \
  tests/vitest/admin/userSettingsClient.test.ts \
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
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; if (!(await canConnect())) throw new Error("task_540_db_unreachable"); process.exit(0)'
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/integration/routes/customScreensRoutes.test.ts
bun run test
bun run precommit:check
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
# Must be executed and captured even when it exits non-zero for the exact known
# TASK-545-owned finding described below.
bun run scan:security:strict
git diff --check
```

The `canConnect` command is a mandatory `select 1` preflight and its explicit
`process.exit(0)` prevents imported runtime handles from hanging the gate. If it
fails, do not run/claim DB closure until connectivity is restored. Rerun every
named failing Vitest file once with `bunx vitest run <exact-file>` and every Bun
file once with `bun test <exact-file>` before classification; after any fix,
rerun the failed parent command, and rerun full `bun run test` plus
`bun run precommit:check` whenever source/tests/docs change after their pass.

At the closure phase boundary, record a content hash for every existing
source-owner matrix file (including the newly created navigation-guard file) and
compare the same map after closure; every hash must be byte-identical. The
closure-attributable test patch may contain only
`tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`; earlier
source-leaf changes can still appear in the overall working-tree diff and are not
misclassified as closure edits. Atomically set/keep all 17 tasks In Progress, then
create exactly `_docs/_CHANGELOG/1252-...md` with the canonical evidence block. The
evidence-stage agent self-verifies it and the orchestrator byte-compares it. Run the
complete full validation now, before any Done mutation. Only after it passes may the
status-stage agent touch all 17 task files, record the exact evidence SHA-256 and
generation, atomically set every descendant and then root Done, and recalculate board
statistics. A read-only mechanical graph gate verifies all statuses/tables, evidence,
`node --check`, and `git diff --check`. Any status-stage, mechanical-gate, final-audit,
or final-gate failure invokes an atomic all-17 In-Progress rollback where execution
can continue; interruption that kills the workflow process is the only unavoidable
best-effort boundary. Do not close with a failed/skipped DB preflight,
functional gate, runtime flow, fixture cleanup, or open child. The strict scan must
run without suppression. Its only permitted non-zero result is the exact unchanged
Semgrep finding
`javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag`
at `_docs/_workflows/task-522-author.mjs:185`, already owned by TASK-545. Record that
truthfully as external non-green, verify the exact rule/path/line against structured
scanner output, and block closure for any additional finding or scanner/tool failure.
