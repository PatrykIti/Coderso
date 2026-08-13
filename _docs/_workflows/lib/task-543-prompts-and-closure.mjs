// TASK-543 prompts-and-closure (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  KNOWN_STRICT_FINDING,
  STRICT_COMPONENTS,
} from "./task-543-gate-contracts.mjs";

const ROOT = "/home/coder/project/Coderso";

// TASK-543 prompts and closure (single owner: TASK-545-02-L02).
// Environment-neutral ESM: bounded agent prompt builders, declared post-audit
// and final-drift lenses, the closure plan, and the final metadata-gate
// prompt. No repository, runtime, server, or global agent dependency.
// ROOT is a fixed task constant the resolver injects locally.
export const CHANGELOG = `${ROOT}/_docs/_CHANGELOG/1255-${new Date().toISOString().slice(0, 10)}-task-543-posts-exit-safety-and-list-accessibility.md`;

// Declared post-audit lenses for the canonical post-audit driver. Keys are the
// trusted `lens:<key>` identities; scope is the bounded audit focus text.
export const POST_LENSES = [
  [
    "snapshot-queue",
    "Exact immutable payload/signature, synchronous mutation revision, ascending exact-revision save queue, conflicting-predecessor restoration, pre-request authoritative barrier ordering, first-owner endpoint, cross-mode coalescing.",
  ],
  [
    "response-identity",
    "Response-derived normalized persisted baseline, current/newer branches, route-authorized post-identity transition, success/error/finally generation guards, unmount/stale refresh/restore isolation, no newer draft/history overwrite.",
  ],
  [
    "close-errors",
    "Real flush promise, background rejection ownership, Close coalescing/navigation-once, Close-only pending ARIA, bounded failure, Retry focus and retry success.",
  ],
  [
    "table-a11y",
    "Passive table rows, canonical title AdminLink, checkbox/actions isolation, exactly one semantic status/author/date copy and md..lg visibility.",
  ],
  [
    "test-integrity",
    "All required races, cacheBus refresh gating, authoritative barrier and response normalization for both transports, exact wire order, focus/ARIA, structural UI assertions and real-browser keyboard/viewport assertions; correct Vitest lane; no weakened legacy assertions.",
  ],
];

// Declared final working-tree drift lenses for the canonical post-audit driver.
export const FINAL_LENSES = [
  [
    "graph",
    "Seven physical TASK-543 files, parent/child rows, board bucket/statistics and all terminal statuses.",
  ],
  [
    "changelog",
    "One changelog 1255 with all seven IDs, exact validation/smoke evidence, reservations and index ordering.",
  ],
  [
    "guides",
    "Both required guide updates accurately describe awaited Close/failure Retry and title-only navigation/mid-width metadata.",
  ],
  [
    "evidence",
    "Full gates, strict scan qualification, seven canonical flows, unique PNG hashes and complete cleanup are truthful.",
  ],
  [
    "scope",
    "Final diff preserves single writers, no source mutation after smoke, no other task/widget/route/migration/status change.",
  ],
];

// Closure plan: the only paths the closure agent may edit.
export const CLOSURE_ALLOWED = [
  "docs/guide/coderso/post-editor-preview-revisions-and-settings.md",
  "docs/guide/coderso/posts-list-and-creation.md",
  "_docs/_TASKS/README.md",
  "_docs/_CHANGELOG/README.md",
  CHANGELOG.slice(ROOT.length + 1),
  ...[
    "TASK-543_Posts_Exit_Safety_and_List_Accessibility.md",
    "TASK-543-01-Autosave-Flush-Before-Close.md",
    "TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md",
    "TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md",
    "TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md",
    "TASK-543-03-Tests-Smoke-And-Closure.md",
    "TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md",
  ].map((file) => `_docs/_TASKS/${file}`),
];

export function startGatePrompt() {
  return (
    `Read-only TASK-543 start gate at ${ROOT}. Verify all seven physical TASK-543 files are ` +
    "In Progress with the same Started date, the sole board row is In Progress, changelog 1255 " +
    "remains reserved and no changelog file exists. Verify HEAD descends from completed TASK-544. " +
    "Do not edit."
  );
}

export function crossLaneGatePrompt() {
  return (
    `Read-only TASK-543 cross-lane gate at ${ROOT}. Run the canonical 13-file Vitest matrix from ` +
    `${ROOT}/_docs/_TASKS/TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md, then ` +
    "bun --cwd core lint:types, bun --cwd core lint, and git diff --check. Do not edit. " +
    "Return pass=true only when every command exits zero."
  );
}

export function postAuditFixPrompt(common, leaf, findings, lensKeys) {
  return (
    `${common}\nFix only verified post-audit findings that belong to ${leaf.id}. Edit only ` +
    `${JSON.stringify(leaf.allowed)}; leave findings owned by the other leaf untouched. ` +
    `Report affectedLensKeys as the exact lens keys whose input files you changed among ` +
    `${JSON.stringify(lensKeys)} (empty array when you changed nothing). ` +
    `Findings:\n${findings
      .map((finding) => `- [${finding.severity}] ${finding.evidence}: ${finding.finding}`)
      .join("\n")}`
  );
}

export function fullGatesPrompt(fullGateCommands) {
  return (
    `Final read-only TASK-543 validation at ${ROOT}. Run every command in this exact order and do ` +
    `not stop after a failure: ${JSON.stringify(fullGateCommands)}. For each command return its ` +
    "exact id/command/exit status, unmodified captured stdout+stderr text, and SHA-256 of those exact " +
    "raw bytes. Never replace a receipt with a boolean. Parse the DB preflight JSON into database and " +
    "require configured/reachable/selectOne exactly. The task-scoped Semgrep command is exact and exits " +
    "zero only with no TASK-543 finding. For strict scan, split the retained raw output into the seven " +
    `ordered component records ${JSON.stringify(STRICT_COMPONENTS)} with each exact command, exit code, ` +
    "raw text/hash and findings. Each component must carry the exact start/end string offsets of " +
    "its canonical `[security-scan] <title>` section in the retained strict receipt; its raw text must equal " +
    "that exact slice, and its exit code must equal the matching retained summary line. The only permitted " +
    "non-zero strict result is the single exact finding. The separately pinned `strictSemgrepJson` command " +
    "must retain its exact command/exit/stdout/stderr envelope; derive every finding from the nested Semgrep " +
    "JSON result (rule ID, normalized path, and start line) with zero Semgrep errors. Agent-supplied finding " +
    "metadata that is not equal to that machine output fails. The allowed finding is " +
    `${JSON.stringify(KNOWN_STRICT_FINDING)}; every other component must be clean. Return pass=false with ` +
    "errors and all collected receipts on any mismatch. Do not edit or suppress/configure scanners."
  );
}

export function fingerprintPrompt() {
  return (
    `At ${ROOT}, read-only, compute a deterministic tracked-working-tree fingerprint as the ` +
    "SHA-256 of the exact bytes emitted by `git diff --binary HEAD` followed by `sha256sum " +
    "_docs/_workflows/task-543-implement.mjs`; list every non-ignored changed/untracked path from " +
    "`git status --porcelain=v1 --untracked-files=all`, sorted and unique. Do not edit."
  );
}

export function smokePrompt(nonceGenerationCommand, smokeScreenshotRoot) {
  return (
    `Final TASK-543 real browser smoke at ${ROOT}. Read 543-03-L01 in full. Load .env without ` +
    "printing credentials. Every command receipt stores exact unmodified stdout and stderr separately, " +
    "the SHA-256 of each exact stream, and a separately derived `parsedOutput`; never merge streams or " +
    "replace source bytes with parsed JSON. Run every Playwright command using the canonical `--raw` " +
    "spelling. Successful `run-code` stdout is exactly compact JSON plus LF (or LF for undefined), and " +
    "parsedOutput must be derived from those bytes. The CLI skill-version warning remains in command " +
    "stderr and is not a browser console warning. Record the preflight `playwright-cli --raw list` receipt and " +
    "require only wf543smoke absent; clear any old task listeners. Before launch prove ports 3000/5173 " +
    `absent with the canonical lsof checks, execute the exact crypto nonce command ${JSON.stringify(nonceGenerationCommand)}, ` +
    "require one non-zero `wf543-` plus 32-hex value, record " +
    "`/usr/bin/date +%s%3N`, then execute the canonical nonce-bound background-spawn command emitted by " +
    "`expectedHelperLaunchCommand` (it invokes `coderso-dev-core-host /home/coder/project/Coderso`, redirects " +
    "the child streams, prints only `$!`, and lets the launcher shell exit). " +
    "Retain root/child PIDs and owned ports, " +
    "verify http://coderso-a.localhost:5173/admin/ and http://coderso-a.localhost:3000. Use only " +
    "separate full `playwright-cli -s=wf543smoke --raw ...` commands; credential-fill stdout goes to " +
    "`/dev/null`. Execute the workflow's exact login run-code. Record both streams/hashes/parsedOutput " +
    "for helper launch, browser open, both credential " +
    "fills, login activation and console-listener installation. The browser-open parsed output must be " +
    "derived from the exact CLI envelope: session, PID, final " +
    "admin URL, optional emitted Page Title, and snapshot path. Shared session-list parsing must retain " +
    "valid attached and incompatible-version owner sessions while requiring only wf543smoke absent. " +
    "The helper spawn receipt status belongs only to the short launcher shell and its stdout must be the " +
    "root PID plus LF; it is not a process-exit " +
    "claim. Separate " +
    "canonical `/proc` receipts must bind nonce, PID, PPID, start ticks, exact cmdline and its hash, cwd, " +
    "and start time; do not claim long-running process exit. Create exactly one uniquely titled shared " +
    "fixture through the real Admin UI and reuse its UI-response-derived ID across all seven scenarios. " +
    "Its title, slug and draft-A sentinel are pairwise distinct; restoration draft B aliases the clean title. " +
    "Execute the byte-exact canonical create builder: open Posts, activate New post, fill the visible title " +
    "and slug controls, preserve the existing Open in editor after create preference, activate Create Post, " +
    "await the successful UI-triggered response JSON and immediately return its PostDetail ID as the canonical " +
    "fixture acquisition. Put that exact ID in acquired inventory before any later command. After the three " +
    "after-create raw log reads, execute the separate canonical provenance command: require the preserved " +
    "post-create editor URL or exact created-row href ID, the explicit editor URL ID, and the final list href " +
    "ID all to equal the response ID. Immediately retain a separate after-provenance error, warning and " +
    "page-error read set before the first scenario log reset, so provenance diagnostics cannot be erased. " +
    "A later provenance failure must retain the acquired fixture and trigger " +
    "UI deletion plus reload-absence cleanup. Retain the response status/URL without issuing page-evaluate " +
    "fetches. The independent " +
    "clean-payload oracle includes the editor-normalized writing-canvas layout attrs rather than copying the " +
    "real UI create payload's `{}` data. Every scenario fixtureId must equal that single shared ID; derive " +
    "later editor URLs, routes, reset, deletion and absence proofs from it. The canonical reset command must " +
    "restore the fixture's clean title through the editor UI after each flow before the next scenario starts. " +
    "Execute at least seven canonical flows: clean Close; " +
    "dirty delayed-save Close; pending-write clean-revert restoration; save failure stays then Retry; " +
    "double Close coalescing; native title/checkbox/action keyboard behavior; responsive metadata at " +
    "390/768/900/1024. Cover light/dark. Assert visible URL, exact request order/count/payload, Close-only " +
    "busy/disabled, alert/Retry focus, retained draft, DOM/computed visibility and accessible names. " +
    "The setup listener records every POST/PUT/PATCH/DELETE whose pathname is the exact fixture post " +
    "base or descendant; typed evidence must contain the complete method/path/payload sequence with no " +
    "extra mutation. Record every main-frame URL transition in order and reject any detour. " +
    "Return the kind-discriminated evidence required by the schema: clean Close=0 writes/1 list " +
    "navigation; dirty delay=one exact payload plus busy/disabled/non-Close-editable and no pre-release " +
    "navigation; clean revert=exact A then B payloads; failure=one failed autosave POST, visible alert/" +
    "retained draft/Retry focus, then one successful manual base PATCH with the editor URL unchanged and " +
    "alert cleared, followed by a separate Back-to-posts activation that adds no write and navigates once; " +
    "double Close=two actual DOM click events but one write/navigation plus disabled/aria-busy/pending-data " +
    "DOM state; the focused Vitest assertion, not smoke counters, owns internal chain coalescing; keyboard=real Enter/" +
    "Space outcomes and exact accessible names (dismiss the modal action menu with Escape before querying " +
    "the underlying row again); responsive=one visible semantic status/author/date copy. " +
    "Transient assertions are read-only: dirty/double capture one pending route and pending Close DOM; " +
    "restoration captures authored draft B while save A is still pending; failure captures the visible " +
    "alert, retained draft and focused Retry before clicking Retry. Capture the transient screenshot " +
    "immediately after that assertion; only the later final assertion may release a route, retry, or navigate. " +
    "For the six non-responsive flows the final live assertion parsed from exact raw stdout must equal " +
    "this typed evidence; the responsive summary must exactly match its four parsed raw probes. A generic " +
    "body/goto observation fails. " +
    "Execute the byte-exact commands emitted by this workflow's canonical scenario setup, route, " +
    "action, assertion, state and reset builders for each recorded fixture; a token-equivalent command " +
    "fails validation. Bind every Close action to `[data-post-editor-header-close=\"true\"]` and every " +
    'title edit to `[data-post-editor-title-input="true"]`; Retry uses its exact accessible name. ' +
    'For keyboard evidence bind `.press("Enter")` to the exact Edit-post link and Actions button ' +
    'locators and `.press("Space")` to the exact Select checkbox locator. Dirty/revert/failure/' +
    "double flows also need a real editable " +
    "fill/type/press. Live assertion code must read its typed keys plus URL and flow DOM state (aria-busy/" +
    "disabled, alert/draft, or aria-label/checked) exactly as required by `validateScenarioByKind`; " +
    "Close-flow mutations and navigation sequences come from task-scoped `page.__wf543*` Playwright-side " +
    "listeners that reset removes, not literal or synthetic counters. " +
    "For every scenario return each actual separate full CLI command in execution order: log reset, " +
    "theme/setup, route installation when the flow uses a fault or delay, action, the canonical transient " +
    "assertion plus transient PNG before any route release/retry/navigation for dirty-delay, restoration, " +
    "failure, and double-Close, then the final live DOM assertion, the three canonical log reads, final " +
    "PNG, unroute when installed, its three raw log reads, state reset, and its three raw log reads. Every " +
    "recorded browser command must begin with the full " +
    "`playwright-cli -s=wf543smoke --raw ` prefix; do not replace " +
    "commands or live outputs with prose assertions/booleans. Assertion commands must read live DOM/" +
    "URL/computed/geometry state and their recorded outputs must match the structured evidence. Pair every " +
    "installed route pattern with the identical recorded unroute pattern; record exact streams/hashes and parsed output for " +
    "each install as `{pattern,installed:true,mode}` (`delay` or `failure`) and each removal as " +
    "`{pattern,removed:true,releasedPending}`; delayed flows require delay and Retry requires failure. " +
    "The failure route returns HTTP 200 with intentionally invalid JSON so application parsing fails without " +
    "creating a browser network-console error; an HTTP 4xx/5xx fault is not equivalent. " +
    "Record exact receipt streams/hashes/parsedOutput for " +
    "setup/action/transient-assertion/final-assertion/log/reset commands. At least one setup parsed output is live " +
    "`{url, ready:true}` and one reset parsed output is live `{url, reset:true}` for the admin route. Record " +
    "command/status/stdout/stderr/hash-backed health probes with parsed `{httpStatus:200}`, exact " +
    "shared-fixture canonical real-UI create/delete/reload-absence ID, commands, UI-triggered response " +
    "URLs/statuses and row/action-menu/dialog DOM provenance, plus theme/setup before, restore, and after values. " +
    "Theme restore preserves the exact nullable stored preference and original dark/light root classes; " +
    "setup restore preserves the exact nullable task session value. Return typed non-null live objects. " +
    "For the responsive scenario execute and record exactly `resize <width> 900` plus the canonical " +
    "live apply probe for each width 390, 768, 900, and 1024; return actual applied width, fallback/" +
    "column visibility and non-zero row/table geometry for every width. Locate only the fixture-owned row " +
    "through its exact Edit-post accessible name and require exact fixture ID plus exact title/checkbox/" +
    "action names. Every fallback/status/author/date/row/table node records computed display, visibility, " +
    "opacity and geometry; fallback author/date come from the concrete span/time nodes. Reset and read canonical " +
    "console/warning/page-error arrays for every flow; require empty. Also retain receipt-bound canonical " +
    "console/warning/page-error reads immediately after fixture creation, immediately after provenance and " +
    "before any scenario reset, every unroute, every reset, fixture deletion, reload-absence, and once finally " +
    "before browser close. Derive the top-level consoleErrors, " +
    "consoleWarnings and pageErrors arrays only by aggregating those receipt parsed outputs; caller-supplied " +
    "summary assertions are not evidence. Capture exactly eleven distinct PNGs: " +
    "one final PNG per flow plus one transient PNG for each of the four pending/failure flows, under the " +
    `absolute ${smokeScreenshotRoot}/task-543-wf543smoke-<scenario>-<phase>.png path. ` +
    "The actual screenshot CLI stdout reports the repo-relative path; retain and hash that exact stdout, " +
    "parse its `reportedPath`, and independently stat/hash/signature-check the absolute file path. For every " +
    "PNG record exact screenshot/stat/sha256/first-eight-byte xxd receipts immediately after capture; " +
    "require a post-server-start mtime and PNG signature " +
    "89504e470d0a1a0a. Return the single global `commandTimeline` in the exact order emitted by " +
    "`expectedSuccessCommandTimeline`: monotonically consecutive sequence numbers plus scope, exact command, " +
    "status, exact stdout/stderr and both hashes plus parsedOutput for every startup, identity, health, browser, state, fixture, scenario, PNG, and " +
    "cleanup receipt. Per-phase label arrays are not chronology evidence. " +
    "Always cleanup in finally: release/remove routes, delete the exact fixture through its row Actions menu " +
    "and Delete post confirmation, then run the separate list-reload DOM-absence proof, " +
    "but if provenance or its three-read boundary failed, first capture all three canonical " +
    "`cleanup:log:after-provenance:*` receipts before cleanup navigation can obscure diagnostics. " +
    "restore theme/setup in that order, close/list wf543smoke, stop exact helper PID tree, prove PIDs and ports " +
    "3000/5173/all owned alternates absent. Before stopping, record `/usr/bin/pstree -p <rootPid>` plus " +
    "the exact discovered root/child PID set, then run `/usr/bin/lsof -nP -a -p <comma-separated-owned-" +
    "PIDs> -iTCP -sTCP:LISTEN -FpPn` once and retain its exact stdout plus parsed PID/port ownership mappings. Its discovered " +
    "port set must exactly equal every declared port. Record one exact process guard command `bash -lc " +
    "'if kill -0 -- <pid> 2>/dev/null; then exit 1; fi'` with status 0/empty output for every " +
    "owned PID, and one exact `/usr/bin/lsof -nP -iTCP:<port> -sTCP:LISTEN -t` with status 1/empty " +
    "output for every owned port. Record the exact final full route-list, browser-close, session-list, " +
    "helper-stop, PID-check and port-check commands and their outputs. Helper stop must use the canonical " +
    "identity-guarded SIGTERM command (the background launcher makes inherited SIGINT ignored) and refuse " +
    "to signal a PID whose nonce/PPID/start ticks/cmdline hash/cwd differ; " +
    "only `wf543smoke` must be absent " +
    "from the final `playwright-cli --raw list` stdout because other owner sessions may remain. Do not summarize " +
    "cleanup as booleans alone. On startup or flow failure, inventory every actually acquired helper/" +
    "browser/fixture/route/theme/setup resource and return the discriminated `pass:false` branch with at " +
    "least one error, a global timeline through and including the failing command, then the exact ordered " +
    "cleanup receipts as the timeline suffix. `failedAtSequence` and `failedScope` identify that failing " +
    "record; cleanup record sequence values continue globally and their timeline scopes are exactly " +
    "`cleanup:<kind>:<resourceId>`. The pre-failure prefix must be the same byte-exact canonical startup " +
    "prefix as success, with every earlier receipt proving command-specific success and honest raw " +
    "Playwright parsing. Identity outputs must equal acquired PPID/start/cmdline/cwd/hash/nonce fields, " +
    "and later fixture/scenario receipts must be an ordered canonical success-flow prefix. `failurePhase` " +
    "matches the failed scope, including lifecycle/state/helper scopes. The failed receipt is genuinely non-zero, " +
    "except that an occupied pre-launch port is the explicit status-0/`{absent:false}` semantic failure. " +
    "Every successful helper launch/browser open/fixture create/route install and captured theme/setup " +
    "state must be present in acquired inventory, and every acquired browser/fixture/route/scenario entry " +
    "must have the matching attempted or successful timeline acquisition: inventory equality is bidirectional, " +
    "so fabricated extras fail. A successful create followed by a failed provenance command is the explicit " +
    "partial-acquisition case. Helper ownership is also bidirectionally exact against pre-cleanup evidence. " +
    "Before a successful pid-tree receipt, `ownedPids` is exactly the command-backed root PID (or empty when " +
    "the launcher failed and no PID was returned); only the exact parsed `/usr/bin/pstree` PID set may expand it. " +
    "Before a successful lsof ownership receipt, `ownedPorts` is exactly `[3000,5173]`; only the exact parsed " +
    "port set from the canonical lsof receipt may expand it, and every mapped owner must belong to the proven " +
    "PID set. Discovery must occur before `failedAtSequence`; cleanup PID/port checks never establish ownership " +
    "and phantom PID/port entries fail. " +
    "Partial helper acquisition uses `identityComplete:false`; never signal it without the full guard " +
    "identity. Non-zero cleanup attempts remain in the receipts, and `remainingResources` must exactly list " +
    "every resource whose canonical cleanup/absence proof did not succeed (it is empty only if cleanup " +
    "actually completed); never fabricate the success " +
    "shape. The workflow rejects that honest failure after retaining diagnostics. You may write only " +
    "the task-scoped PNG files; do not edit source/tests/docs/tasks/workflow. " +
    "Return the exact structured result."
  );
}

export function smokeAuditPrompt(smoke) {
  return (
    `Fresh read-only TASK-543 smoke evidence audit at ${ROOT}. Inspect actual PNG files and ` +
    "stat/hash/signature metadata and fresh mtimes; all eleven transient/final screenshot phases; every " +
    "per-flow setup/route/action/transient-assertion/final-assertion/log-read/screenshot/unroute/reset " +
    "command with exact stdout/stderr, both hashes and parsedOutput; prove transient capture precedes " +
    "route release/retry/navigation; kind-specific behavioral evidence; " +
    "the ordered exact fixture-row 390/768/900/1024 computed-style/geometry probes; full mutation and " +
    "main-frame navigation sequences without extras; corrected Retry manual-PATCH-then-separate-Close " +
    "behavior; zero receipt-derived aggregate logs; one shared fixture's canonical real-UI New-post create " +
    "response JSON ID acquisition followed by separate response-ID-equal URL/editor/list provenance and its " +
    "own pre-reset log-read boundary, per-flow " +
    "UI reset, row Actions-menu Delete/confirmation and reload-absence response/DOM provenance; raw log-read " +
    "receipts after create, after provenance before any reset, every unroute/reset, delete, absence and finally " +
    "before close; theme/setup before/" +
    "after records; the globally consecutive commandTimeline with exact byte-for-byte grouped-record " +
    "parity, bidirectionally exact acquired inventory, failed-provenance partial acquisition, and honest " +
    "failure-prefix/cleanup-suffix semantics, including exact pre-cleanup pstree/lsof-derived helper PID/port " +
    "ownership with no cleanup-backfilled or phantom entries, and first-in-cleanup provenance log reads when its normal " +
    "boundary did not finish; command-backed unique nonce/PID/PPID/" +
    "start/cmdline/cwd helper identity, pre-stop PID-tree/port-owner mappings; " +
    "and final route-list/browser-" +
    "close/session-list/helper/PID/port cleanup. Confirm only wf543smoke absence is required when auditing " +
    "shared sessions. Evidence: " +
    `${JSON.stringify(smoke)}` +
    ". Report every H/M/L; do not edit or start runtime."
  );
}

export function closurePrompt(common, fullGates, smoke) {
  return (
    `${common}\nTASK-543 source gates, post-audit and smoke passed. Read indexes fresh. Edit only ` +
    `${JSON.stringify(CLOSURE_ALLOWED)}. Update both required guide contracts. Record the already ` +
    `verified structured full-gate evidence ${JSON.stringify(fullGates)} and smoke evidence ` +
    `${JSON.stringify(smoke)}, including honest strict-scan qualification without suppression. Create ` +
    `${CHANGELOG}; mark leaves, then children, then parent Done; move only TASK-543 board row and ` +
    "statistics; consume 1255 while preserving 1251-1252,1254,1257 reservations and next 1258. " +
    "Do not edit source/tests/workflow, stage, or commit. Report the exact closure paths changed and " +
    "the exact task commit scope to the owner; only the owner runs `bun run precommit`, stages, and commits."
  );
}

export function finalDriftFixPrompt(common, findings) {
  return (
    `${common}\nFix only closure-owned task/guide/changelog/index evidence drift within ` +
    `${JSON.stringify(CLOSURE_ALLOWED)}. Never edit source/tests/workflow or fabricate evidence. ` +
    "If a finding requires source/test mutation, return without editing so the next audit fails. " +
    `Report affectedLensKeys as the exact lens keys whose input files you changed (empty array when ` +
    "you changed nothing; if a finding needs source/test mutation you change nothing). " +
    `Findings:\n${findings
      .map((finding) => `- [${finding.severity}] ${finding.evidence}: ${finding.finding}`)
      .join("\n")}`
  );
}

export function finalMetadataGatePrompt(workflow) {
  return (
    `Final read-only TASK-543 metadata gate at ${ROOT}. Run exactly: node --check ${workflow} && ` +
    "git diff --check. Verify no staged files. Return pass=true only if all pass; do not edit."
  );
}


