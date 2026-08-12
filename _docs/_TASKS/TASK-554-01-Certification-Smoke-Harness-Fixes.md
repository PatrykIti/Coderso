# TASK-554-01: Certification Smoke Harness Fixes
# FileName: TASK-554-01-Certification-Smoke-Harness-Fixes.md
**Parent Task:** TASK-554
**Status:** 🚧 In Progress
**Started:** 2026-08-12
**Completed:** (pending)
**Diagnosis Agents:** dove (v4 pro), cricket (glm-5.2 openrouter), dog (glm-5.2), v4 flash
**Evidence:** dove report (report.json wrapper-owned; direct CLI cannot pass the
exact-set gate; AGENTS.md requires the shared CLI entry), cricket report
(server logs never surfaced on unexpected exit; exit code/signal discarded;
`exposeFunction` accumulates 28 bindings over certification; admin vite OOM
hypothesis), dog report (pending).
**Scope:** harness-only changes; product code is off-limits.

---

## Context

The TASK-554 runtime smoke fast profile passes canonically (7 scenarios,
exact evidence validation). The certification profile (28 scenarios) fails:
direct CLI runs fail `validateTask554ScreenshotOutputs` because `report.json`
is wrapper-owned and never written by the shared runner; canonical runs have
failed with `smoke_process_failed` / `smoke_server_unexpected_exit` and the
server log tail was never surfaced (the temporary DIAG called a non-existent
`SupervisedServerResource.snapshot()`).

## Implementation Pseudocode

### Fix 1: cert-report-json-ownership
Runner owns the evidence report.

1. In `runRuntimeSmoke` (scripts/runtime-smoke.ts):
   - Before `adapter.run`, derive the evidence session dir from the adapter
     declaration (see below) and pre-create `report.json` with
     `openSync(path, "wx", 0o600)` (empty placeholder, single-link) so the
     adapter's exact-set validation sees the file present.
   - After `createRuntimeSmokeReport`, rewrite `report.json` in place:
     `openSync(path, O_WRONLY|O_TRUNC|O_NOFOLLOW)`, verify the fd node matches
     the pre-created node (dev/ino/mode/nlink), write the exact JSON +
     trailing newline, `fchmod 0o600`, close, then `lstat`-prove
     `nlink === 1` and stable dev/ino/mode.
2. Adapter declaration: add an optional `evidenceDirectory(input, root):
   string | null` to the `SmokeAdapter` interface; `task-554` returns
   `_docs/_workflows/_smoke/task-554/<session>`; other suites return null
   (runner skips the pre-create/write for null).
3. In `_docs/_workflows/task-554-implement.mjs` `runTask554SmokeProfile`:
   drop the pre-created fd and stdout redirection; spawn the CLI with normal
   stdio; the runner writes report.json. Keep the post-run byte-exact re-read
   and `assertExactTask554SmokeEvidence` unchanged.

Gate: direct CLI certification run passes `validateTask554ScreenshotOutputs`;
the workflow still passes exact evidence validation.

### Fix 2: cert-server-diagnostics
Surface server logs and exit info on unexpected exit.

1. Add public `snapshotLogs()` to `SupervisedServerResource`
   (scripts/runtime-smoke/server/supervised-server.ts) that returns
   `{stdout, stderr}` via the bounded captures' `snapshot(redact)` WITHOUT
   requiring `#closeFinished` (new method; `logs()` unchanged).
2. In `waitForUnexpectedExit()`: include `exitCode` and `signal` from
   `#handle.wait()` in the `SmokeError` message.
3. In task-554.ts adapter catch: call `server.snapshotLogs()` (not the
   non-existent `snapshot()`) and print bounded redacted tails.

Gate: a crashed certification run prints the real server stdout/stderr tail
and the exit code/signal.

### Fix 3: cert-exposefunction-cleanup
Prevent Playwright binding accumulation over 28 scenarios.

In browser-actions.ts `finally` block (after listener removal), run
`await page.evaluate((name) => { delete window[name]; }, cacheBridgeName)
.catch(() => undefined)` so the JS-side bridge binding is released each
scenario. The bridge name already includes the variant id (commit 004af39b).

Gate: certification runs without binding-registry growth; receipts unchanged.

### Fix 4: cert-png-preservation
Keep failed-evidence artifacts inspectable.

In task-554.ts adapter catch: only unlink manifest PNGs when the failure is
NOT the evidence-set validation; leave PNGs in place on evidence-set
validation failure so a failed certification leaves inspectable artifacts.

Gate: failed certification leaves PNGs + report.json in the session dir.

## Validation

- `bun --cwd core lint:types` and `bun --cwd core lint`
- targeted runtime-smoke unit tests (task-554-adapter, task-554-worker,
  supervised-server, cli-registry)
- canonical workflow smoke: fast + certification, exact evidence validation
- if certification still fails: capture the server log tail via Fix 2 and
  iterate with fresh agents
