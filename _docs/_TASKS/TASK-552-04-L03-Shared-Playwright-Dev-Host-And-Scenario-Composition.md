# TASK-552-04-L03: Shared Playwright Dev Host and Scenario Composition
# FileName: TASK-552-04-L03-Shared-Playwright-Dev-Host-And-Scenario-Composition.md

**Parent Subtask:** TASK-552-04
**Priority:** High
**Category:** Testing Infrastructure / Browser / Process Lifecycle / Runtime
**Estimated Effort:** Very Large
**Dependencies:** TASK-552-04-L02 complete
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family reclosure)

---

## Objective

Land the one shared Playwright CLI dispatcher and supervised-server resource,
compose the complete native TASK-540 browser/host flow, and migrate the complete
widget-contract Playwright runner—not only its small error probe—to those shared
capabilities. Remove every private Playwright/server/process/wait loop from the
registered TASK-540, widget and production-boundary adapters while preserving
their product-visible contracts. The 5,530-line widget runner split/migration is
mandatory in this leaf and cannot be deferred to documentation, cleanup or a
future task.

## Exact Single-Writer Ownership

L03 alone consumes every inventory entry classified
`l03-browser-host-composition` and owns these shared capabilities:

- `scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts`, exporting
  `PlaywrightCliDispatcher`;
- `scripts/runtime-smoke/server/supervised-server.ts`, exporting
  `SupervisedServerResource` and self-registering
  `startSupervisedServer(...)`;
- `tests/unit/runtime-smoke/playwright-cli-dispatcher.test.ts`;
- `tests/unit/runtime-smoke/supervised-server.test.ts`.

L03 exclusively owns TASK-540 browser, host and composition:

- `scripts/runtime-smoke/adapters/task-540.ts` and its executor input seam;
- `scripts/runtime-smoke/adapters/task-540/browser-executor.ts` and
  `browser-segments.ts`;
- native `scripts/runtime-smoke/adapters/task-540/suite/browser/**`;
- native `scripts/runtime-smoke/adapters/task-540/suite/host/**`;
- native `scripts/runtime-smoke/adapters/task-540/suite/composition/**`;
- `tests/unit/runtime-smoke/task540-native-suite-boundary.test.ts`;
- focused updates to `task540-adapter.test.ts` and
  `task540-browser-plan.test.ts`.

This is L03's complete TASK-540 source authority. It does not move or rewrite
any source-dependent executor/runtime, operation descriptor, operation registry,
handler, alias, worker or cleanup module owned by L02, and it does not rewrite
an L01 stable module. Browser/host/composition code imports the already landed
L01 contracts and L02 typed operation API read-only. No destination file is
created by one leaf and then taken over by another.

L03 exclusively owns the widget migration and mandatory split of both legacy
oversized files:

- rewrite `scripts/playwright-widget-contract-smoke.ts` as a thin backwards-
  compatible CLI forwarder;
- reduce `scripts/runtime-smoke/adapters/widget-contract.ts` to a thin registered
  adapter;
- create cohesive modules under
  `scripts/runtime-smoke/adapters/widget-contract/`: `contracts.ts`,
  `inventory.ts`, `environment.ts`, `fixtures.ts`, `auth.ts`,
  `admin-probe.ts`, `public-probe.ts`, `report.ts`, `suite.ts` and `cli.ts`;
- replace the 2,764-line
  `tests/unit/playwright-widget-contract-smoke.test.ts` with independently
  runnable suites `widget-contract-cli.test.ts`,
  `widget-contract-inventory.test.ts`, `widget-contract-fixtures.test.ts`,
  `widget-contract-admin-probe.test.ts`,
  `widget-contract-public-probe.test.ts` and
  `widget-contract-report.test.ts` under `tests/unit/runtime-smoke/`;
- update `tests/unit/runtime-smoke/widget-adapter.test.ts`.

The split follows cohesive responsibilities; no generated dumping-ground helper
is allowed. The compatibility CLI, thin adapter, every extracted production
module and every extracted test must finish at or below 1,000 physical lines.
The original 5,530-line implementation body is physically removed from
`scripts/playwright-widget-contract-smoke.ts`; retaining it behind a forwarder,
dynamic import, subprocess or compatibility branch does not satisfy the split.

L03 also owns the focused refactor of
`scripts/runtime-smoke/adapters/production-boundary.ts` and
`production-boundary-adapter.test.ts` to consume the shared server resource.
It does not edit L01/L02 files, TASK-547 files, product code, task/changelog docs
or legacy files outside the explicitly named widget CLI.

## Shared Playwright Contract

- `PlaywrightCliDispatcher` implements `BrowserTransportDispatcher`, resolves
  `playwright-cli` to an absolute executable, owns a validated named session,
  writes bounded mode-0600 run-code files and dispatches only through
  `ProcessSupervisor`.
- It additionally exposes suite-neutral `loadStorageState(...)` for the widget
  flow. That method accepts only a canonical owned mode-0600 file inside the
  task workspace, invokes the fixed CLI `state-load` operation through the same
  supervisor and never returns, logs or reports cookie/storage-state contents.
- It opens lazily once per declared session, validates session/segment/size/UTF-8
  and canonical frames, and never evaluates result text in the parent process.
- `close()` is idempotent and closes the exact session after partial open or
  dispatch failure. `proveAbsent()` requires no active child plus completed
  close proof.
- The class is suite-neutral. TASK-540 and widget adapters supply scenario/
  segment allowlists, frame schemas and workspaces through `BrowserTransport`.
- The widget suite may own multiple bounded sessions where isolation is a real
  contract, but every open/run/state/close goes through
  `PlaywrightCliDispatcher`; no `Bun.spawn`, raw `playwright-cli` command,
  fixed settle sleep or private process loop remains.

## Shared Server Contract

`startSupervisedServer(context, spec)` registers its
`SupervisedServerResource` with `context.lifecycle` before spawning and accepts
exactly this executable union:

```ts
type SupervisedServerExecutable =
  | { readonly kind: "path-literal"; readonly name: "coderso-dev-core-host" }
  | { readonly kind: "absolute"; readonly path: string };
```

- The literal branch resolves only `coderso-dev-core-host` through bounded
  canonical `PATH` entries to an absolute executable internally. The helper
  rejects an empty, relative, duplicate, oversized or over-count PATH entry set,
  constructs one explicitly bounded projected `PATH`, resolves the literal
  against that projection and passes only the absolute result to
  `ProcessSupervisor`. The absolute branch validates/realpaths an already
  selected executable for the production boundary. No caller-supplied
  executable name or shell fragment is accepted.
- `startSupervisedServer(...)` receives an environment source plus a fixed
  allowlist policy and performs the projection internally before spawn; callers
  cannot pass an unvalidated arbitrary environment map. The TASK-540 dev-host
  required repository keys are exactly `DATABASE_URL`, `PII_HASH_KEY`,
  `PII_ENC_KEY` and `MEDIA_SECRET_MASTER_KEY`. Optional repository keys are `CORE_VERSION`,
  `DB_POOL_MAX`, `AUTH_PASSWORD_PEPPER`, `ANALYTICS_IP_HASH_SECRET`,
  `FORM_SUBMIT_NONCE_SECRET`, `FORM_SUBMIT_NONCE_TTL_MINUTES`,
  `ANALYTICS_BEACON_NONCE_SECRET`, `ANALYTICS_BEACON_NONCE_TTL_MINUTES`,
  `MEDIA_BASE_URL`, `MEDIA_ALLOWED_MIME`, `MEDIA_MAX_SIZE_BYTES`,
  `EMAIL_TRANSPORT`, `THEMES_DIR`, `PLUGINS_RUNTIME_DIR`, `PLUGINS_SAFE_MODE`,
  `PLUGIN_UPDATE_MODE`, `PLUGIN_ERROR_THRESHOLD`, `PLUGIN_TIMEOUT_MS`,
  `PLUGIN_DOWNLOAD_TIMEOUT_MS`, `PLUGIN_MAX_SIZE_MB`, `STORE_BASE_URL` and
  `STORE_PUBLIC_KEY`. Optional inherited process keys are exactly `HOME`,
  `USER`, `LOGNAME`, `SHELL`, `TMPDIR`, `TMP`, `TEMP`, `LANG`, `LC_ALL`,
  `LC_CTYPE`, `TZ`, `TERM`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`,
  `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, `DISPLAY`,
  `WAYLAND_DISPLAY`, `XAUTHORITY` and `DBUS_SESSION_BUS_ADDRESS`.
- Fixed local runtime names are `PORT`, `PUBLIC_BASE_URL`, `NODE_ENV`,
  `COOKIE_SECURE`, `VITE_DEV_SERVER_URL`, `VITE_SITE_DEV_SERVER_URL`,
  `VITE_API_ORIGIN`, `VITE_ADMIN_STRICT_MODE`,
  `CODERSO_PUBLIC_VITE_DEV_URL` and `CI`. The implementation owns their
  canonical local values. The task contract intentionally records environment
  key names only; reports, tests and documentation never record their values or
  any secret value.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MEDIA_STORAGE` and `MEDIA_DIR` are not passed
  by the parent projector. The host script alone sources the selected worktree's
  `.env`; no environment enumeration appears in evidence.
- The resource captures bounded UTF-8 logs, preserves the primary failure,
  polls readiness without fixed sleeps, terminates the exact process group,
  waits for exit and proves every declared port released. Close is idempotent.
- TASK-540 starts only the literal `coderso-dev-core-host` with its canonical
  worktree root and readiness probes for Admin, API/public front and site Vite
  on ports 5173, 3000 and 5174.

## TASK-540 Composition and Registered Boundary

- L03 performs the only switch of the registered `task-540` adapter from legacy
  roots to the completed L01/L02/L03 native graph.
- Compile the unchanged 420 browser actions into dependency-bounded segments
  around runtime/native/screenshot/capture barriers and dispatch them through
  one named session. Preserve all 496 receipts and exact first failure.
- Install console/page-error listeners before first navigation in each scenario
  epoch. Both profiles run the same seven scenarios, visible effects,
  light/dark checks and 13 screenshots; only bounded timing windows differ.
- Report real scenario elapsed times and real console/page-error arrays, never
  zero placeholders.
- The registered dependency test traces static, computed fixed imports,
  `createRequire` edges and subprocess executable/argument paths. It rejects any
  `_docs/_workflows/task-540*` edge, path escape, symlink, missing target or
  unregistered extension.

## Widget Migration Contract

- Preserve the current CLI arguments, dry-run behavior, inventory selection,
  fixture/media/auth behavior, Admin modes, public assertions, reports,
  screenshot paths, strict exit status and direct-command compatibility.
- The registered widget adapter imports `widget-contract/suite.ts` directly; it
  must not spawn the compatibility CLI.
- Both the direct compatibility CLI and the registered adapter call the same
  modular suite. Every Playwright open/run/state-load/close is dispatched by
  `PlaywrightCliDispatcher`, and every child process is supervised by the shared
  runtime-smoke lifecycle. There is no legacy/full-mode escape hatch.
- Convert command completion and Playwright-open settling to bounded condition
  polling. Preserve console/page-error and visible-effect proof.
- A reviewed assertion mapping ports every assertion from the old oversized test
  into one of the six focused suites before that test is deleted.
- Tests fail on any remaining `Bun.spawn`, direct `playwright-cli`, private
  dispatcher, fixed settle timeout or duplicate session lifecycle in the widget
  production graph.

## Implementation Pseudocode

```ts
const server = await startSupervisedServer(context, {
  executable: { kind: "path-literal", name: "coderso-dev-core-host" },
  args: [context.root],
  cwd: context.root,
  environment: {
    source: process.env,
    policy: TASK540_DEV_HOST_ENVIRONMENT_POLICY,
  },
  ports: [3000, 5173, 5174],
  readiness: task540Readiness,
}); // self-registers, projects bounded PATH/env, resolves absolute executable, then spawns

const dispatcher = new PlaywrightCliDispatcher({
  context,
  session: context.input.session,
  workspace: taskScopedWorkspace,
});
const browser = new BrowserTransport(context.input.session, dispatcher);
context.lifecycle.register(browser);

for (const scenario of task540Scenarios) {
  await context.timing.measure("scenario", scenario.id, () =>
    runScenarioSegments({ scenario, browser, server })
  );
}
```

## Failure Handling and Gates

Reject unsafe sessions/origins/paths, unknown environment keys, oversized
programs/output, malformed frames, readiness timeout, process exit/log overflow,
console/page errors, missing screenshots, close failure or occupied released
ports. Preserve primary plus cleanup failures.

Tests cover dispatcher open-once/multi-segment/partial failure/close twice,
owned storage-state load/redaction/path rejection; server literal and absolute
branches, registration-before-spawn, literal-to-absolute PATH resolution,
bounded PATH rejection, required-key failure, exact environment projection,
value redaction, process escalation and port absence; registered TASK-540 graph
rejection; widget CLI/direct-adapter parity and complete split coverage; and
production-boundary parity. Static graph tests fail if any registered initial
suite retains a private server/Playwright/process/wait loop. Run focused
runtime-smoke and split widget tests, root TypeScript, relevant lint, formatting,
`git diff --check`, touched-file line counts and a deterministic host/Playwright
integration probe. Full fast and certification runs belong to L04.

## Local Tooling and Security Constraints

No API route changes. Only loopback origins, the one literal dev-host name or a
validated absolute executable, canonical worktree paths, explicit bounded
environment names, mode-0600 programs, redacted logs and owned sessions/PIDs/
ports are allowed. No shell, remote browser target, raw environment value or
secret-bearing report field is accepted.
