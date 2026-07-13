# TASK-543-03-L01: Close Failure, Keyboard, Viewport Flows, and Closure

# FileName: TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md

**Parent Task:** TASK-543
**Parent Subtask:** TASK-543-03
**Priority:** High
**Category:** UI Tests / Accessibility / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-543-01-L01, TASK-543-02-L01
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Reopened:** 2026-07-13 — full validation and live smoke must be repeated after the cross-session drain fix
**Changelog:** 1255

---

## Scope and ownership

Rerun/smoke/docs-only leaf. Twelve named Vitest/UI-integration files are read-only inputs
owned by TASK-543-01-L01 and TASK-543-02-L01; `page-table-wave` is one additional shared
read-only no-regression gate. This leaf may edit only TASK-543
task-scoped screenshots and closeout evidence under the currently supported
`_docs/_workflows/_smoke/` path,
`docs/guide/coderso/post-editor-preview-revisions-and-settings.md`,
`docs/guide/coderso/posts-list-and-creation.md`, this family’s
statuses, _docs/_TASKS/README.md, changelog 1255, and _docs/_CHANGELOG/README.md. It must
not edit production source or tests. Read indexes fresh before closure.

The full gate exposed five historical shell/chrome suites whose partial hook mocks described
the real SSR/loading fail-closed boundary while their assertions expected a loaded editor.
That correction was returned to TASK-543-01-L01, which owns and rebaselines those tests with
an explicit loaded post; this closure leaf only reruns the resulting 13-file matrix.

Both guide edits are mandatory: the editor guide states that Close waits for the latest
save and a failure retains the draft with Retry; the list guide states that only the title
link navigates and author/date remain visible through the mid-width layout.

## Implementation Pseudocode

Read-only source-test verification:

~~~ts
test initial and post-hydration clean Close:
  render shell from an authoritative saved revision; click Close;
  expect zero save requests and one canonical navigation;
  install another accepted authoritative hydration and repeat with zero writes.

test clean revert proof:
  edit and revert byte-exactly to the authoritative snapshot with no save pending;
  click Close; expect zero save requests;
  then start different-byte save A, revert to the authoritative bytes as exact revision B,
  and click Close while A remains pending;
  assert B is registered immediately, wire order is A -> B, B restores the exact clean
  bytes, and navigation waits for B even though derived dirty state is false.

test editor identity transition:
  transition from post A to authoritative post B while an A request is settling;
  before B's deferred load settles, assert the public hook state is blank/loading/non-dirty,
  exposes no A document bytes, and cannot schedule an A autosave through stale callbacks;
  assert B receives a freshly seeded persisted target and clean Close performs zero writes;
  settle A late and assert it cannot mutate B draft/baseline/error/revision state;
  repeat clean Close after late A settles and again assert zero writes;
  while B load/restore remains pending, settle stale A success/failure and assert B's loading/
  restoring state remains active until B's own request settles.

test pending Close across route identity:
  start pending Close for post A, then route to authoritative post B before A settles;
  settle A as success and as failure in separate cases;
  assert the stale Close promise rejects, never navigates, and cannot mutate B draft, persisted
  baseline, errors, history, selection, revision, or loading/restoring state.

test dirty Close:
  defer save promise; click Close;
  assert pending state and no navigation;
  resolve; assert one navigation.

test active save plus newer edit:
  start save A, mutate to revision B, click Close;
  resolve A with server values different from B;
  assert B title/slug/document/featured image/metadata, dirty marker, selection and undo
  history remain byte-identical;
  assert the next request payload is exactly B, then navigate only after B resolves.

test active manual save:
  start manual save, then activate Close;
  assert Close awaits the same registered promise and does not duplicate the write;
  cover success and shared failure with no navigation on rejection.

test autosave-first same-target coalescing:
  admit the same exact new-entry target through autosave first, then activate manual Save and Close;
  assert all three consumers share one promise and one POST, issue zero PATCH requests, and share
  the same success result; repeat with rejection and assert one shared failure plus no navigation.

test manual Save while background A is active:
  edit/capture B and activate manual Save while A is pending;
  resolve A; assert manual promise/toast remains pending and exact B request starts;
  edit C while B waits; resolve B; assert manual succeeds for B while C remains dirty;
  cover A rejection/retry and concurrent Close without a duplicate B request.

test exact-revision save-queue order under post-A contention:
  while A is pending enqueue manual B, then capture/enqueue Close/background C;
  release A with both waiters runnable;
  assert request order and payload identity are exactly A -> B -> C;
  assert neither C start/success nor a higher revision counter can resolve manual B;
  assert same-revision joiners share one B promise/write;
  give every revision distinct title/slug/document/featured-image/tags/category/SEO sentinels
  and deep-equal every production-client payload.

test response-derived baselines and reload cache ordering:
  for autosave and manual transports, cover both current and newer-live response branches with
  server-normalized document/featured-image/base-data sentinels;
  assert current hydrates clean, newer stays byte-exact dirty, and reverting to response bytes
  lets Close navigate with zero writes;
  queue predecessor save A whose response normalizes document and featured image and carries opaque
  baseData, then admit authoritative reload R; assert R hydrates those response bytes clean and a
  subsequent Close performs zero writes;
  queue save A before reload R and emit A's real cache event; assert R still dispatches after A
  and propagates both success and rejection without self-invalidating its generation.

test chained authoritative barrier failure:
  admit same-identity R1 then R2 and a post-cutoff save; reject R1;
  assert R2 never dispatches, both barrier callers reject through the same ordering failure,
  and the downstream save rejects without transport.

test failure/retry/double:
  reject shared save; assert alert, draft retained, no navigation;
  Retry uses manual draft persistence and succeeds without navigation; a separate Close then
  dedupes the exact persisted snapshot and navigates once without another write;
  double activation while pending invokes one chain and the Close control alone is
  disabled/aria-busy while a representative canvas edit remains enabled and its production
  callback still updates the editor draft.

test PostsTable semantics:
  assert row has no synthetic activation;
  assert structural canonical title link and isolated checkbox/action callbacks;
  assert the production PageRowActions trigger has its contextual/default accessible name.

browser viewport assertions:
  at 390/768/900/1024 px use native keyboard activation and inspect computed visible
  author/date/status nodes, geometry, and accessible names.
~~~

Each listed non-browser source-test assertion must already exist in its owning source
leaf's suite. This closure leaf searches/reads and reruns those files; if a required
structural assertion is absent or weakened, return the defect to that source leaf and
repeat its gate instead of editing the test here. Native keyboard, computed visibility,
geometry, and accessibility-tree assertions belong exclusively to this leaf's live smoke.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-editor-state-hook-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui/posts-editor-chrome-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell.test.tsx \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx \
  tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx \
  tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx \
  tests/vitest/ui-integration/post-editor-layout-shell.test.tsx \
  tests/vitest/ui/page-row-actions.test.tsx \
  tests/vitest/ui/page-table-wave.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
set -a && source .env && set +a && bun run test
bun run precommit:check
bun run scan:security:strict
node --check _docs/_workflows/task-543-implement.mjs
git diff --check
~~~

Re-run each named failure once in isolation.

### Workflow design note

The receipt/result-schema text in this paragraph describes the syntax-checked, audit-hardened
workflow design; it is not a completion requirement or a claim that the workflow emitted the
executed smoke evidence.

The workflow artifact was designed to run its pinned command list in exact order, including a command-backed
database reachability/`select 1` preflight. Every command returns its exact command, exit status,
unmodified raw output, and the SHA-256 of those raw bytes; boolean-only pass claims are invalid.
The task-scoped Semgrep command is pinned to every TASK-543 production file. The strict scan
retains ordered Semgrep, Bun-audit, Trivy vulnerability/config/secret, and Gitleaks history/
worktree component records with exact commands, exit codes, raw-output hashes, and findings.
Every component also records exact start/end offsets whose slice is byte-for-byte equal to its
canonical section in the retained strict-scan output; its exit code must match that output's
summary line. A separately pinned Semgrep JSON wrapper retains the exact command, exit code,
stdout, and stderr, and every claimed finding must be derived from its machine-readable rule ID,
normalized path, and start line with zero scanner errors. Self-consistent component blobs or
finding metadata detached from those receipts are invalid.
Only a clean scan or the exact unchanged TASK-545-owned `task-522-author.mjs:185` finding may
qualify; tooling failures and any other finding fail the gate.

## Runtime smoke

### Superseded closure correction: historical executed evidence

The prior acceptance smoke was a manual, command-by-command live run, but a later source finding
invalidated it as closure proof. It remains historical evidence only: the exact helper below,
separate full `playwright-cli` commands in
`wf543smoke`, one uniquely titled real-UI fixture reused across seven isolated scenarios, and
11 task-scoped PNGs. The workflow file's stricter receipt/result-schema machinery was syntax-
checked and audit-hardened, but it was not executed as a canonical structured-result producer;
none of the schema/receipt design notes below are claimed as live evidence. Fresh full smoke is
required after the cross-session transport fix. TASK-545 owns the future durable manifest and
generalized evidence schema.

This closure correction supersedes every contradictory fixture-count or structured-receipt
imperative retained below as historical workflow-design rationale, but it does not supersede the
current reopened status. A new Completion section and finalized changelog 1255 become authoritative
only after the corrected source passes fresh full validation, audits, and live smoke.

The nonce-bound canonical background launcher must invoke exactly:

~~~bash
coderso-dev-core-host /home/coder/project/Coderso
~~~

Immediately before starting it, record `/usr/bin/date +%s%3N` with status, exact stdout/stderr,
both hashes, and parsed epoch as
the server-start timestamp used by screenshot freshness checks.

Before launch, prove ports 3000 and 5173 have no listener. Generate one safe task nonce with
the workflow's exact command-backed `node:crypto.randomBytes(16)` command; its exact stdout,
stderr, per-stream hashes, and separately parsed non-zero `wf543-` plus 32-hex value bind the
nonce used by the launch and identity receipts. Use the workflow's canonical nonce-bound
launch command. That short shell backgrounds the
required helper with redirected child streams, prints only `$!`, and exits zero; the printed
PID must equal the independently inspected helper root PID.
The spawn and independent `/proc` receipts bind nonce, root PID, PPID, process start ticks,
exact command line and hash, cwd, and launch timestamp. Cleanup may signal the retained root
PID only through the canonical guard that rechecks every identity field; PID reuse or a
mismatched process fails closed.

Verify `http://coderso-a.localhost:5173/admin/` and
`http://coderso-a.localhost:3000`, then use only separate full commands in the task-scoped
session `playwright-cli -s=wf543smoke --raw ...`. Load credentials from `.env`; never print or
persist their values, and redirect both credential-fill outputs to `/dev/null`.
Every command receipt stores exact, unmodified `stdout` and `stderr` separately, SHA-256 for
each stream, and a separately derived `parsedOutput`; a combined stream, parsed value substituted
for source bytes, or missing stream hash is invalid. Successful `--raw run-code` stdout is the
CLI's exact compact JSON plus LF (or LF for undefined), and `parsedOutput` must derive from those
bytes. The CLI skill-version warning stays in command `stderr` and is not a browser console
warning. Parse the browser-open receipt from the real CLI envelope, including PID, final admin
URL, optional emitted `Page Title`, and snapshot path; the parsed object must equal those stdout
bytes exactly. Record these fields for helper launch, browser open, both credential fills, the
workflow's exact login activation, and installation of the console/page-error listeners. The launch
status belongs to the short launcher shell; it is a successful spawn receipt, not a claim
that the long-running helper has exited.

Create one uniquely titled fixture through the real UI and reuse that exact server-owned post
across the seven sequential scenarios, resetting it to the required clean state between flows.
Every later editor URL and task route derives from that ID. Cleanup deletes the fixture through
the real UI and a separate list reload proves the exact row absent.
Split acquisition from provenance: the Create-click command parses the successful PostDetail
response ID and records it immediately, before any later URL/editor/list assertion. A separate
full raw command proves the editor URL and list href carry that same response-owned ID, so a
later provenance failure can never hide an acquired fixture from exact UI cleanup.

Run at least these distinct
flows: clean Close; dirty delayed-save Close; pending-write clean-revert restoration; save
failure stays then retry; double Close while pending; keyboard title/checkbox/action
behavior; and responsive metadata at 390, 768, 900, and 1024 px. Cover light/dark. Assert URL,
busy/alert state, retained draft text, focus/activation, computed visibility, accessible
names, request order where observable, and zero console errors. Keep post-hydration and
identity-transition stale-response cases as deterministic focused integration tests if the
browser flow cannot trigger those internal boundaries without test-only hooks.

In that workflow design, each flow returns kind-discriminated evidence for independent validation:
clean Close has zero writes and exactly one list navigation; dirty delayed Close has one
exact payload, busy/disabled Close, an editable non-Close control, and no navigation before
release; clean revert records exact A then B payloads; failure records alert, retained draft,
and Retry focus, then proves Retry performs the existing exact manual chain — one successful
base PATCH followed by one successful metadata PATCH required by restoration debt — while
remaining on the editor with the alert cleared. The flow awaits both responses and the settled
Save draft control before a separate Back-to-posts activation, which adds no write and navigates
exactly once. Double Close records two actual DOM click events, one write/navigation,
and the pending control's disabled, `aria-busy`, and `data-post-editor-close-pending` states;
the focused Vitest case, not a synthetic smoke counter, proves the one internal flush chain.
Table keyboard records native Enter/Space outcomes plus exact title,
checkbox and action accessible names; after observing the modal action menu it presses Escape
before resolving the underlying row controls again. Responsive records one visible semantic status,
author and date copy. The live assertion command's exact raw stdout must parse to this typed evidence,
except that the responsive summary is derived from and must equal its four ordered raw probe
records. A generic URL/body observation cannot pass.
The intentional first autosave failure is an HTTP 200 response with invalid JSON, which exercises
the application's parse/error path without a browser network-console error. A 4xx/5xx route fault
cannot satisfy the zero-console contract.

The four pending/error flows also have a distinct read-only transient assertion and screenshot
before any release, retry, or navigation. Dirty Close and double Close capture the pending route
and live pending-control state; restoration captures draft B while save A is still pending;
failure captures the visible alert, retained draft, and focused Retry before Retry is clicked.
The transient screenshot command and its independent file receipts immediately follow that
assertion. Only the later final assertion may release a delayed route, invoke Retry, or navigate.
Final-state screenshots do not substitute for these transient frames.
Close-flow request counters, payloads, and ordering come from task-scoped Playwright-side
request/route instrumentation that each reset removes; literal returned counters are invalid.
For every scenario that listener captures every `POST`/`PUT`/`PATCH`/`DELETE` whose pathname
is the exact fixture post base or descendant. Typed evidence equals the complete expected
method/path/payload sequence with no extra mutation. A main-frame listener likewise records
the complete URL transition sequence; expected list/editor destinations must match in order,
and any redirect or unrelated detour fails.

The executable browser contract is owned by the canonical builders in
`_docs/_workflows/task-543-implement.mjs`: scenario setup, route install/removal, user actions,
live assertions, theme/setup state reads and restoration, and reset commands must byte-match
the commands those builders emit for the recorded scenario and fixture. Do not substitute a
token-equivalent command. Close actions bind to
`[data-post-editor-header-close="true"]` (the visible control is the canonical Back-to-posts
control), and title edits bind to `[data-post-editor-title-input="true"]`. Keyboard commands
must bind `.press("Enter")` to the exact title link and action-button locators and
`.press("Space")` to the exact checkbox locator; mentioning those keys elsewhere is not
activation evidence.

Smoke evidence is command-backed, not an acceptance-checklist transcript. For every flow,
record the actual separate full `playwright-cli -s=wf543smoke --raw ...` commands, in execution
order, for log reset, theme/setup, route installation when the scenario uses a delay or
fault, user action, transient assertion and screenshot where required, final live
DOM/URL/computed-style/geometry assertion, all three console-error, console-warning, and
page-error reads, final screenshot, matching unroute, and state reset. Record
the action/assertion outputs and the three empty log arrays per flow. A prose assertion or a
boolean that is not tied to a recorded live command is not smoke evidence. Every scenario
gets one distinct final full-page screenshot command and path; the four pending/error flows
also get one distinct transient command and path, for exactly eleven PNG receipts.
In addition to grouped records, return one global `commandTimeline`. Its consecutive sequence
numbers, scopes, exact commands, statuses, exact stdout/stderr, both hashes, and parsed outputs
must equal the workflow-derived order byte-for-byte
for every startup, identity, health, browser, state, fixture, scenario, screenshot metadata,
and cleanup command. Per-phase label arrays are not chronology evidence.
Command-backed lifecycle log reads additionally cover fixture create/provenance, every
unroute/reset boundary, delete, absence, and one final read before browser close. Top-level
console/page-error arrays are derived exactly from those receipts; caller-supplied empty arrays
without receipt equality cannot pass.
Every command record includes its exit status and both raw streams/hashes. Installed route patterns and
removed route patterns must match exactly. Setup and reset commands have matching records.
Health probes, theme/setup before/restore/after values, and each fixture's create, exact-id
delete, and separate exact-id absence probe are command-backed; restoration/cleanup booleans
without those records are invalid. Theme restoration preserves the exact nullable stored
preference and the original dark/light root-class booleans; setup restoration preserves the
exact nullable task-scoped session value. All three records are typed, non-null live objects.
If startup or any flow fails, return the schema's discriminated `pass: false` branch with at
least one error and a global timeline through and including the failing command. Inventory every
acquired helper identity, browser session, fixture, route,
and theme/setup state. Ordered cleanup receipts are derived from that inventory and must use
the same canonical unroute, fixture delete/absence, restoration, browser close/list, identity-
guarded helper stop, PID, and port commands. Cleanup is the exact ordered suffix of the same
timeline: `failedAtSequence`/`failedScope` point to the failing receipt, cleanup sequence values
continue globally, and cleanup scopes are `cleanup:<kind>:<resourceId>`. Partial
startup is represented with `identityComplete: false` and must not signal an incompletely
identified PID. Failed cleanup attempts retain their real non-zero statuses, while
`remainingResources` exactly lists resources whose cleanup/absence proof failed; it is empty
only after verified cleanup. Never fabricate the success shape. The workflow rejects that
honest failure after retaining its diagnostics.

The failure prefix starts with the same byte-exact canonical preflight/bootstrap sequence as
success and may stop only at its recorded failing command. All earlier receipts must prove their
command-specific success, including raw Playwright parsing and the intentional lsof-status-1
absence result. Successful identity receipts must equal the partial or complete acquired helper's
PPID, start ticks, command line, cwd, command-line hash, and nonce, while fixture/scenario receipts
must be the ordered prefix of the same canonical commands and typed outputs as the success flow.
`failurePhase` must match `failedScope`, including `state:*` and `helper:*`; the failed receipt must have a real
non-zero status, except that an occupied pre-launch port is the explicit status-0/`absent:false`
semantic failure. A successful helper launch, browser open, fixture creation, or route install
must appear in the acquired inventory, so the failure shape cannot omit cleanup for a resource
that its own timeline proves was acquired. Any acquired helper always carries ports 3000 and
5173 in `ownedPorts`, even if discovery failed before alternate ports were known.

The responsive flow must execute and record these four commands exactly (with a separate
live DOM apply probe after each):

~~~bash
playwright-cli -s=wf543smoke --raw resize 390 900
playwright-cli -s=wf543smoke --raw resize 768 900
playwright-cli -s=wf543smoke --raw resize 900 900
playwright-cli -s=wf543smoke --raw resize 1024 900
~~~

For each width, the apply probe returns the actual `window.innerWidth`, fallback and column
visibility for status/author/date, and non-zero row/table geometry. Expected cascade: the
fallback metadata is visible below 1024; fallback status is visible only below 768; the
dedicated status column is visible from 768; dedicated author/date columns are visible from
1024. The probe first resolves exactly one fixture-owned row through
`aria-label="Edit post: <fixture title>"`, verifies the href-derived fixture ID and exact
title/checkbox/action accessible names, and scopes every query to that row. Every fallback,
status, author, date, row, and table node records computed `display`, `visibility`, `opacity`,
width, and height. Fallback author/date evidence comes from the concrete author span and
`time` nodes, not visibility of the fallback wrapper. The four width records remain in
390 → 768 → 900 → 1024 execution order and retain
the exact resize status/output plus the canonical probe status and unmodified raw DOM output.

In a mandatory `finally`, remove every task route/fault handler, delete and separately
verify every exact fixture id absent, restore theme then setup state, close `wf543smoke`, stop
only the retained helper PID tree, and prove sessions, owned PIDs, and ports 3000/5173 plus
every helper-owned alternate port absent. Record distinct PNG sizes, inodes, and SHA-256.
Before stopping the helper, record `/usr/bin/pstree -p <rootPid>` and the exact discovered
root/child PID set. Then run one PID-filtered `/usr/bin/lsof` discovery with flags
`-nP -a -p <comma-separated-owned-PIDs> -iTCP -sTCP:LISTEN -FpPn` and retain its raw
PID/port ownership mappings; its discovered port set must exactly equal the declared helper
port set. Post-stop checks must cover precisely those PIDs and ports.
The structured result must include and validate the exact final
`playwright-cli -s=wf543smoke --raw route-list`,
`playwright-cli -s=wf543smoke --raw close`, `playwright-cli --raw list`, PID-bound helper-stop,
per-PID `kill -0` absence probes, and per-port absolute `/usr/bin/lsof` absence probes with
their real outputs. Other owner browser sessions may remain; only `wf543smoke` must be absent
from the final session list. Valid attached sessions and sessions emitted with Playwright's
incompatible-version marker remain acceptable. Cleanup booleans alone are insufficient.
The helper stop receipt uses the canonical identity guard and refuses to signal a process
whose nonce, PPID, start ticks, command-line hash, or cwd differs from the launch identity.
After the identity check it sends `SIGTERM` (the non-interactive Bash background launcher makes
`SIGINT` inherited-ignored), then waits with a bounded timeout until the same process-start
identity disappears before the independent per-PID absence probes begin.

Each screenshot path is the canonical absolute
`/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-<scenario>-<phase>.png`.
The actual screenshot CLI stdout reports a repo-relative path; retain and hash that exact
stdout, parse the reported relative path separately, and independently run the canonical
absolute-path stat, SHA-256, and first-eight-byte signature commands. Record exact stdout/stderr,
both hashes, and parsed values for all four receipts. The file mtime must be later than server
start and its signature must be `89504e470d0a1a0a`.

TASK-545 lands later. Record the current task-scoped screenshots and concise closeout
facts only; do not depend on, pre-create, or claim validation by TASK-545's future durable
manifest/schema/`.gitignore` contract.

## Closure

Run fresh lenses for newest-draft saving, promise/error propagation, navigation
idempotence, table semantics, and responsive test integrity. Finalize draft changelog 1255, mark
all descendants Done, close the parent, and synchronize task/changelog indexes.
Closure agents never stage or commit. They report the exact changed paths and exact TASK-543
commit scope to the owner. Only the owner runs `bun run precommit`, stages that reviewed
scope, and creates one task commit after all gates, smoke, cleanup, and final audits pass.

## Superseded pre-fix evidence

The following results are retained only as pre-fix history. They must not be used for closure;
all full gates and the live smoke are required again after the final remediation.

- Targeted validation passed 112/112 across eight files (source 93/93; table 19/19).
  Full Bun passed 1,687 with one intentional opt-in live skip and zero failures; sequential
  Vitest passed 836 files / 6,852 tests. Type checks, `precommit:check`, Admin
  build/boundary/bundle, all five release gates, and task-scoped Semgrep passed.
- The strict scan completed every component clean except the exact unchanged
  `_docs/_workflows/task-522-author.mjs:185` Semgrep finding owned by TASK-545. No suppression
  or scanner configuration changed.
- The exact `coderso-dev-core-host /home/coder/project/Coderso` helper served Admin and front
  with HTTP/browser 200. Seven distinct flows covered clean Close, delayed dirty Close,
  pending B→A restoration, invalid-JSON failure plus focused Retry and separate clean Close,
  coalesced double Close, native keyboard table controls/passive row, and responsive metadata
  at 390/768/900/1024 px. Light and dark runs produced zero console errors, warnings, or page
  errors.
- One real-UI fixture was deleted through the UI and proved absent after reload. Theme, routes,
  named browser session, helper PIDs, and ports were restored or removed. Eleven PNGs and their
  hashes are recorded in changelog 1255.

## Superseded closure attempt

The evidence below predates the final cross-session drain finding and cannot close this leaf.

- The final 13-file matrix passed 144/144. Full validation passed 1,687 Bun tests and 6,865
  Vitest tests (8,552 total), with one intentional opt-in live skip and zero failures.
- Core type/lint, `precommit:check`, Admin build (2,637 modules), boundary (776 files), bundle,
  release gates 5/5, workflow syntax, diff check, and task-scoped Semgrep all passed. The strict
  scan's only non-green result is the exact unchanged TASK-545-owned Semgrep finding at
  `_docs/_workflows/task-522-author.mjs:185`; every other strict-scan component was clean.
- The exact helper served Admin and front with HTTP/browser 200. Seven separate real
  `playwright-cli -s=wf543smoke --raw ...` flows passed with visible, ARIA, request-order,
  keyboard, and 390/768/900/1024 px geometry assertions in light and dark. Console errors,
  warnings, and page errors stayed empty.
- The single UI-created fixture was deleted through the UI and absent after reload. All routes,
  the named browser session, helper processes, and ports were removed; the original light theme
  was restored. Changelog 1255 records the final hashes for all 11 PNGs.
