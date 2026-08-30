# TASK-105-08-05-L04: Menus, Dashboard, and Kits Runtime Smoke
# FileName: TASK-105-08-05-L04-runtime-smoke.md

**Parent Subtask:** TASK-105-08-05
**Priority:** High
**Category:** Runtime Smoke + QA
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-05-L03 validated receipt; committed/frozen L14/L16 Bun-manifest
handoff; shared-supervisor sealed fixed-entry capability. Generic shared-supervisor and outer
runner raw-tail redaction remains the separately owned
`runtime-smoke-platform-raw-tail-redaction` prerequisite, with its own writer handoff.
**Status:** ⏳ To Do

---

## Overview

Register one thin shared-runtime-platform adapter for the admin behavior covered by
L01–L03. No existing adapter proves this surface: `task-547` verifies a public full-site
package, not menu editor, dashboard, or solution-kit admin flows. The adapter must use
the shared `bun scripts/runtime-smoke.ts run` lifecycle; it may not copy a task-local
server, worker, Playwright, report, or cleanup loop.

All product and route modules stay read-only. The suite may create only a task-namespaced
synthetic admin fixture and must remove it or fail closed. Its only persistent evidence
tree is canonical `_docs/_workflows/_smoke/evidence/task-105/<session>/`; the shared
runner, not the adapter, safely bootstraps the absent `task-105` parent if needed and then
atomically claims that exact absent session. A failed run retains its diagnostic evidence but
never authorizes L06.

### Current diagnostic boundary (2026-08-29)

The historical `task105-l05-fast-20260828-r1` evidence remains immutable: it reached
the browser `create_menu_for_fixture` action and timed out, but it predates the current
browser-driver coordinator. The fresh
`task105-l05-fast-20260829-r2` attempt is also diagnostic only. It failed before host
startup and before any scenario was emitted with the redacted runner failure
`smoke_process_failed` / `worker dispatch failed`; after the terminal report was written,
the runner remained live until the orchestrator terminated that exact run process. It did
not provide a verified fixture-mutation or cleanup receipt and does not qualify as an
acceptance attempt.

Before another smoke, this leaf must first make the persistent-worker boundary type-safe,
diagnosable through a bounded redacted error code, and lifecycle-terminal. One
discriminated `serializePublicSmokeFailure(...)` input in `contracts.ts` is the **only**
projection used by runner-primary, lifecycle/cleanup, and worker-dispatch failure paths.
It accepts only the closed boundary/phase enums and a trusted stable code, returning a
literal public code/message; it must never read or interpolate `message`, `cause`, stack,
worker frame, environment value, PID, SQL/database value, fixture identity, URL, token,
credential, or settings JSON. The L04-controlled runner-primary, lifecycle, and worker
projections to JSON stdout, formatted stderr, reports, diagnostics, and evidence consume that
serializer's bounded result only. This does not claim control of generic shared-supervisor raw
tails or the outer Node/tsx launcher's raw error output. A post-report live process is a smoke
failure even if every emitted scenario otherwise passes.

The public runner failure remains the existing `smoke_process_failed` token. Its only
permitted L04 diagnostic refinement is the literal bounded pair
`TASK-105 L05 worker <phase> failed (<stable-code>)`. `r2` additionally recorded
fixture-cleanup `close` and `absence` failures, so a failed mutation dispatch must be
treated as response-unknown: a missing install response is never evidence that no role,
user, session, page, storage state, or setting mutation exists.

**Task and suite identity:** `TASK-105-08-05-L04` is the task/receipt owner for this
leaf. `task-105-l05` / `Task105L05` is intentional and is the stable public
shared-runtime suite ID used by the CLI, registry, adapter paths, evidence, and report
identity. No `task-105-l04` alias is valid. The leaf ID must not be inferred from the
suite ID, and the suite ID must not be treated as a task-leaf identifier.

## Exact Single-Writer Scope

This leaf may edit only the following runtime-smoke code, tests, and generated/docs
exceptions:

- `scripts/runtime-smoke.ts`
- `scripts/runtime-smoke/contracts.ts`
- `scripts/runtime-smoke/cli.ts`
- `scripts/runtime-smoke/registry.ts`
- `scripts/runtime-smoke/adapters/types.ts`
- `scripts/runtime-smoke/evidence-session.ts` (new)
- `scripts/runtime-smoke/browser/admin-auth.ts` (narrow environment-free storage-state helper only)
- `scripts/runtime-smoke/server/supervised-server.ts` (narrow sealed fixed-entry capability only)
- `scripts/runtime-smoke/server/fixed-dev-host.ts` (new fixed Bun entry; no shell/package-script/
  dotenv path)
- `scripts/runtime-smoke/adapters/task-105-l05.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/descriptors.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/fixture.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/host.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/browser-segments.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/browser-drivers.ts` (new; bounded
  worker dispatch phase projection, private recovery dispatch, and lifecycle
  registration/teardown only)
- `scripts/runtime-smoke/adapters/task-105-l05/browser-page-driver.ts` (new;
  cohesive observer/coordinator/page-driver extraction required to keep the
  browser runtime below the 1,000-line module gate)
- `scripts/runtime-smoke/adapters/task-105-l05/cleanup.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/cleanup-deps.ts` (new; concrete
  cleanup DB/filesystem dependencies extracted from the lifecycle facade)
- `scripts/runtime-smoke/adapters/task-105-l05/output-manifest.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/settings-lease.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l05/worker-operations.ts` (bounded descriptor
  registry, frame validation, and environment policy only after cohesive extraction)
- `scripts/runtime-smoke/adapters/task-105-l05/worker-fixture-operations.ts` (new; owned
  fixture mutation/checkpoint operations extracted before additional handlers)
- `scripts/runtime-smoke/adapters/task-105-l05/worker-recovery-operations.ts` (new; owned
  private recovery/absence operations extracted before additional handlers)
- `scripts/runtime-smoke/adapters/task-105-l05/recovery-receipt.ts` (new; receipt
  schema typing, HMAC/transition validation, and private-only authority handling)
- `scripts/runtime-smoke/adapters/task-105-l05/recovery-db.ts` (new; worker-owned
  receipt persistence, CAS recovery, and terminal absence proof only)
- `scripts/runtime-smoke/adapters/task-105-l05/recovery-settings-input.ts` (new;
  closed five-key recovery payload validation)
- `scripts/runtime-smoke/adapters/task-105-l05/recovery-db-test-seam.ts` (new;
  isolated deterministic receipt/CAS test seam only)
- `_docs/_workflows/lib/smoke-evidence.mjs` (current 812-line compatibility facade and
  narrow manifest-writer/auditor hardening)
- `_docs/_workflows/lib/smoke-evidence.d.mts` (the matching optional private-evidence
  audit flag and secure report-read declaration only)
- `_docs/_workflows/lib/smoke-evidence-filesystem.mjs` (existing cohesive no-follow
  evidence-files helper retained alongside the facade)
- `tests/unit/runtime-smoke/cli-registry.test.ts`
- `tests/unit/runtime-smoke/task105-l05-adapter.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l05-descriptors.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l05-cleanup.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l05-output-manifest.test.ts` (new)
- `tests/unit/runtime-smoke/evidence-session.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l05-auth.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l05-worker-operations.test.ts` (new; worker
  descriptor/phase-redaction and close-boundary cases only)
- `tests/unit/runtime-smoke/task105-l05-recovery-receipt.test.ts` (new; receipt
  transition/invariant cases only)
- `tests/unit/runtime-smoke/task105-l05-recovery-db.test.ts` (new; bounded
  persistence/recovery seam and unknown-response cleanup cases only)
- `tests/unit/runtime-smoke/task105-l05-runner-redaction.test.ts` (new; controlled runner
  projection seams only)
- `tests/unit/workflows/smokeEvidenceFilesystem.test.ts` (new; focused no-follow
  filesystem extraction, manifest/audit, and identity-swap cases only)
- `tests/bun-lane-manifest.json` (generated exception only)
- `tests/README.md` (the runtime-smoke command and adapter inventory only)
- `docs/develop/runtime-smoke-cookbook.md` (operator-only manual-cleanup runbook only)

The shared runner may create the single missing `task-105` ancestor with a trusted,
component-by-component no-follow bootstrap, then may create only the exact canonical session
directory stated above through its exclusive claim. L04 owns no `core/**`, route, schema,
migration, service client, Vitest coverage suite, or other task document. The shared browser
helper remains backwards-compatible for its existing ambient-credential callers; L04 may add
only an environment-free, dynamic-base storage-state primitive and may not change their login
behavior. `worker-operations.ts` is already 911 physical lines, so its fixture and recovery
operations must be cohesively extracted into the two named files above before extra recovery
handlers land; each module remains at most 1,000 physical lines and public descriptor exports
remain stable. Preserve the prior evidence-files extraction: the current 812-line
`smoke-evidence.mjs` facade, its filesystem helper, public exports, and all non-L04 caller
behavior remain stable except for the additive secure report-read API and fail-closed rejection
of unsafe evidence nodes. Before classification, L04 must wait for `HEAD` to contain the exact
committed/frozen L14/L16 rows. The current six inherited L04 generated rows remain dirty and
unchanged; `node _docs/_workflows/task-105-08-05-implement.mjs
--assert-l04-classify-preconditions` verifies every `HEAD` row is unchanged, retains those six
rows, and rejects any other dirty addition.
Generation may retain every existing row and add exactly these eleven L04 rows: adapter,
descriptors, cleanup, output manifest, evidence-session, auth, worker operations, recovery
receipt, recovery DB, `smokeEvidenceFilesystem`, and runner redaction. Immediately after
generation it runs `--assert-l04-manifest-projection`; it must not hand-edit the manifest,
absorb an unowned row, or overwrite the handoff. The 905-line
`smokeEvidenceDriver.test.ts` remains byte-for-byte unchanged and outside L04 writer scope.

## Implementation Pseudocode

```ts
export const TASK105_L05_SCENARIOS = Object.freeze([
  "menu-structure-save-publish-parity",
  "menu-design-appearance-visible-effect",
  "dashboard-edit-configure-save",
  "dashboard-dirty-remote-stale",
  "solution-kit-select-reviewed-handoff",
] as const);

export function assertExactTask105L05Invocation(input: SmokeInput): void {
  if (
    input.command !== "run" ||
    input.suite !== "task-105-l05" ||
    (input.profile !== "fast" && input.profile !== "certification")
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 invocation is invalid");
  }
}

export function task105L05EvidenceDirectory(input: SmokeInput, root: string): string {
  assertExactTask105L05Invocation(input);
  return resolveInsideRoot(
    root,
    `_docs/_workflows/_smoke/evidence/task-105/${input.session}`,
    "task105_l05_evidence"
  );
}

export async function runTask105L05Adapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  assertExactTask105L05Invocation(context.input);
  context.lifecycle.assertAccepting();
  const manifest = buildExactTask105L05ScreenshotManifest(context.input);
  const before = await context.repository.snapshot(manifest.paths);
  const execution = await executeSharedSegments(context, manifest);
  const scenarios = requireManifestableScenarioResults(execution.scenarios, execution.screenshots);
  await assertTask105L05RepositoryUnchanged({ guard: context.repository, before, manifest });
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios,
    screenshots: execution.screenshots,
    consoleErrors: execution.consoleErrors,
    cleanup: execution.cleanup,
  });
}

type Task105L05WorkerFailurePhase =
  | "spawn"
  | "protocol"
  | "install"
  | "settings_apply"
  | "settings_restore"
  | "close";
type Task105L05WorkerFailureCode =
  | "worker_dispatch_failed"
  | "worker_protocol_failed"
  | "worker_unavailable"
  | "worker_close_failed";
type Task105L05PublicFailure =
  | { readonly boundary: "runner"; readonly stableCode: "runner_failed" }
  | { readonly boundary: "lifecycle"; readonly stableCode: "lifecycle_failed" }
  | {
      readonly boundary: "worker";
      readonly phase: Task105L05WorkerFailurePhase;
      readonly stableCode: Task105L05WorkerFailureCode;
    };

export function serializePublicSmokeFailure(
  input: Task105L05PublicFailure
): Readonly<{ code: "smoke_process_failed"; message: string }> {
  // Every runner-primary, lifecycle, and worker path calls this one projection.
  // It receives a closed trusted code, never an Error or an unbounded value.
  const message = input.boundary === "worker"
    ? `TASK-105 L05 worker ${input.phase} failed (${input.stableCode})`
    : `TASK-105 L05 ${input.boundary} failed (${input.stableCode})`;
  return Object.freeze({ code: "smoke_process_failed", message });
}

function projectTask105L05WorkerFailure(input: {
  readonly phase: Task105L05WorkerFailurePhase;
  readonly error: unknown;
}): SmokeError {
  const publicFailure = serializePublicSmokeFailure({
    boundary: "worker",
    phase: input.phase,
    stableCode: classifyTrustedWorkerFailure(input.error),
  });
  return new SmokeError(
    publicFailure.code,
    publicFailure.message
  );
}

export default Object.freeze({
  suiteId: "task-105-l05",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  evidenceSessionPolicy: "exclusive",
  run: runTask105L05Adapter,
  evidenceDirectory: task105L05EvidenceDirectory,
} satisfies SmokeAdapter);
```

**Exclusive evidence-session flow:** `evidenceSessionPolicy: "exclusive"` tells the shared
runner to invoke its central helper before it calls the adapter. The helper validates the
existing fixed ancestry below the repository root component by component; if
`_docs/_workflows/_smoke/evidence/task-105` is absent, it creates only that parent with a
non-recursive mode-0700 mkdir, then rechecks its no-follow directory identity. It creates the
terminal session directory with one non-recursive exclusive mkdir, creates `report.json` with
`O_CREAT | O_EXCL | O_NOFOLLOW` and mode 0600, and rechecks directory/file identity before
the final report write. Existing session/report paths, a symlink/non-directory ancestor,
an unexpected `task-105` parent mode/identity, or an identity swap fail with `SmokeError`;
adapters without the policy retain their current runner behavior. The adapter only resolves
the canonical path and never races the runner with its own absent-session check.

**Fixture and cleanup data flow:** create one namespaced, non-system smoke role and one
synthetic smoke admin user linked only to that role, one synthetic published public page, and
a private browser workspace through the shared persistent worker/lifecycle. The role has
exactly `menus:read`, `menus:write`, `settings:read`, `settings:write`, `content:read`,
`dashboard:write`, and `solution-kits:read`; it must not reuse the migration-guaranteed
full-access role or any ambient role. Its dashboard layout belongs only to that synthetic
user. Its role name/description are exactly `task-105-l05-${session}-role` and
`TASK-105 L05 synthetic role for ${session}`; its synthetic email uses the same session namespace
under the reserved `.invalid` domain. The synthetic page is exactly slug
`task-105-l05-${session}-home`, title `TASK-105 L05 homepage ${session}`, published, and authored
by that linked user. The UI-created menu is exactly `TASK-105 L05 navigation ${session}`,
published, with exactly one item pointing to that page. Creation first proves those role/user
identities are absent, then returns only the role ID, user ID, canonical permission array, and
user-role link as bounded fixture facts. A task-local, worker-owned
`Task105L05SettingsLease` uses the existing DB writer fence, table lock, `FOR UPDATE`, raw JSON
value, `updatedAt`, and `xmin` patterns to protect exactly seven global keys:
`assistant.enabled`, `assistant.launcher.avatarEnabled`, `assistant.launcher.avatarAsset`,
`site.homepageId`, `site.navigationMenuId`, `site.footerTemplateId`, and `site.adminPath`
(the Site Shell pair is separately claimed after its browser write).

Before the host starts, the lease snapshots every leased row (including absent rows), writes
only `assistant.enabled = true`, disables the launcher avatar, clears its asset value, points
`site.homepageId` to the synthetic published page, and writes the validated non-default
`site.adminPath` `/${session}-admin` (no query, fragment, dot segment, encoded separator, or
`/admin` value). It does not enable an LLM, configure a provider, alter the assistant default
mode, or write credentials. `host.ts` derives a distinct immutable
`task-105-l05-dev-host` policy from `CODERSO_DEV_HOST_ENVIRONMENT_POLICY`, preserving its
allowlisted input sets and fixed values except for the exact fixed
`VITE_ADMIN_BASE_PATH: "${adminBase}/"`; it never mutates the shared policy or reads an ambient
`VITE_ADMIN_BASE_PATH`.

The current shared host starts through `startSupervisedServer`, the outer runner is Node/tsx,
and the installed `coderso-dev-core-host` launcher sources `.env`; L04 therefore must **not**
claim a direct `Bun.spawn`, a no-`.env`-ancestor launch, or redaction of that launcher's raw
tail. Instead `host.ts` requests a new narrow `fixed-dev-host` capability from
`server/supervised-server.ts`. The shared supervisor owns the child and receives only a frozen
allowlisted environment plus an absolute Bun executable and fixed
`server/fixed-dev-host.ts` entry. That entry uses `--no-env-file`, no shell, `bunx`, `bun run`,
package script, or dotenv/load-env API; it programmatically starts the core and both Vite dev
servers with `envFile: false`, and its source inventory rejects those forbidden launch forms.
The capability seals the dynamic admin base rather than reading it from `.env`, and rejects an
attempt to select the legacy external launcher. Browser navigation, readiness, and classification
derive all internal routes from the returned validated `adminBase`, never `/admin`. Focused host
tests use a non-`/admin` base and prove the fixed entry/env projection, forbidden launcher/source
forms, zero child start on invalid capability input, and `<adminBase>/` plus
`<adminBase>/api` traffic.

L04 may ensure that its report/diagnostic projection never retains host stdout/stderr and may
redact only its controlled runner projection seams. Generic `ProcessSupervisor` raw-stderr
errors, `supervised-server` raw log-tail diagnostics, and the Node/tsx outer launcher's stderr
remain the separately owned `runtime-smoke-platform-raw-tail-redaction` prerequisite; its writer
handoff is outside L04's narrow capability/seam changes even where a surrounding file is shared.
No L04 test may claim sentinel absence there. That prerequisite must supply bounded redaction
before any platform-wide raw-tail claim.
The terminal smoke is the real fixed-entry Vite proxy proof. Before the real Site Shell UI PATCH, the lease snapshots both Site Shell rows. After the browser PATCH, it locks and claims
both current Site Shell rows, requiring the synthetic published navigation menu ID and capturing
the post-write `xmin`/timestamp/raw value for **both** rows—the UI serializes the footer key too,
even where its value is unchanged.

The fixture creates its role and active user through the existing `createRole` and `createUser`
services with the exact role ID; `createUser` remains the owner of the internally generated
password hash and encrypted/hash-normalized email fields. It then creates exactly one bounded
session through `createSession` with a task-namespaced user-agent. The worker retains its
session ID plus token-hash identity for cleanup and directly calls the new environment-free shared helper
`writeAdminSessionStorageState({ adminUrl, expectedAdminPath, workspace, storageStatePath,
sessionValue })` before it returns any fixture facts. The opaque token therefore never crosses a
worker response, fixture/result/receipt, log, or environment variable. The helper validates the
local dynamic base and writes one exclusive, no-follow, 0600 browser storage-state file. L04 must not call
`createAdminAuthStorageState`, any `/admin`-only helper branch, or any ambient credential
variable. The worker drops the transient session-token reference immediately after the file is
written.

Register the persistent worker pool first, then the workspace, then **one** aggregate
`Task105L05FixtureCleanup` resource before fixture installation. It owns the settings lease,
session, and synthetic fixture cleanup; do not separately register settings/session/user/role
resources whose reverse order could drift. The workspace is registered before the aggregate so
the aggregate can still use its private storage state while it cleans up; host and browser
transport register only after those three resources. Lifecycle reverse order is therefore browser
transport → host termination/absence proof → aggregate cleanup (while the worker remains usable)
→ workspace/private-storage-state absence → worker-pool close/absence → process-supervisor
absence. The aggregate performs settings CAS restore/invalidation → owned-session revoke,
deleted-row absence proof → synthetic layout/user absence → synthetic-role CAS deletion/absence
proof. A later resource may not depend on a resource that this order has already closed.
The aggregate finalizer attempts every later cleanup step even if an earlier step fails and
returns the primary plus cleanup failures without masking either. The session cleanup first
proves its exact ID/user/token-hash identity, revokes it, proves the revocation, removes only that
now-revoked session, and proves its absence before deleting the user/link/role. The lease restores
only while every owned record matches its post-write `xmin`, timestamp, and raw JSON; it deletes
an absent baseline row or writes the exact present baseline, then proves it. A mismatch on any of
the seven leased setting keys fails closed without overwriting another writer. Site-shell cache
invalidation follows a successful direct restore only after the host is absent, so no separate
host process can retain a stale global setting. User deletion may remove its owned user-role link
through the existing foreign-key cascade; after that deletion, cleanup locks the synthetic role
and deletes it only if its ID, namespaced name/description, canonical seven-permission JSON, and
`xmin` still match the fixture-owned record. It proves absence of the link, user, role, menu,
page, dashboard layout, private state, and session. A role identity or permission drift fails
closed without deleting a record another writer changed. No arbitrary existing role, page, menu,
layout, user, session, or settings row may be edited or deleted.

**In-process response-unknown recovery:** This is deliberately **not** crash/parent-death
recovery. Before the first fixture mutation, the live adapter creates one private
`Task105L05RecoveryAuthority` and the worker durably records the HMAC-protected
`fixture-intent` receipt. The authority stays only in the live parent and worker request frames;
it never appears in a worker output, browser state, report, diagnostic, screenshot, or evidence.
The guarantee applies only when that parent remains alive, retains the authority, and receives an
unknown install/settings/Site-Shell response. If the parent dies or loses that authority, the run
fails closed: no autonomous later-process recovery, mutation retry, or same-session continuation
is allowed. The retained private receipt is diagnostic only; an authorized operator must use the
documented manual cleanup procedure with a fresh maintenance lock and exact ownership/absence
proofs before another run, and that manual action cannot produce a passing L04 receipt.

`transitionReceipt(authority, expectedPhase, nextPhase, patch)` in `recovery-receipt.ts` is the
sole receipt mutation API; the present merge helper is not claimed to provide this property. In
one worker-owned transaction it verifies the authority/HMAC, locks or CAS-compares the receipt
version, requires `expectedPhase`, validates the closed transition, stores one canonical bounded
patch, and returns the committed receipt. A repeat is idempotent only when the receipt is already
at `nextPhase` with the exact canonical patch digest; a stale expected phase, different patch, or
concurrent winner is a fail-closed conflict. The state machine is `fixture-intent` →
`fixture-installing` → `fixture-installed` → `settings-applied` → `site-shell-intent` →
`site-shell-claimed` → `recovering` → `settings-restored` → `fixtures-removed`. It records only
the private CAS identities needed for in-process recovery; the HMAC key, token hash, raw setting
JSON, row IDs, and receipt body are never projected.

`createTask105L05Fixture` ownership callbacks are awaited worker-local transition points: after
each successfully created role, user, session, and page, `transitionReceipt` commits before the
next mutation starts. The browser-driver ownership cell is populated only from a fully validated
successful worker result; it is never recovery authority. `fixture-intent` may be removed only
after a namespaced absence proof establishes that no fixture mutation began. An incomplete
`fixture-installing` record is never treated as absent: the live parent either proves exact owned
identities through the receipt/namespace contract or fails closed without deleting anything. No
crash window may become an ID-only cleanup.

If an install, settings-apply, settings-restore, or Site Shell worker response is unknown while
the parent still owns the authority, it maps the primary through the one public serializer, then
uses the same authority through a fresh or healthy pool client for the exact recovery/proof
operations. Recovery first restores only receipt-owned settings, then deletes only
receipt-proven fixture records, deletes the receipt, and proves the namespaced role/user/page/menu
plus receipt absent. It never guesses from a missing response, retries a mutation, or performs an
ID-only/best-effort delete. A recovery or absence-proof failure remains a cleanup failure and
blocks another smoke/manifest; it does not authorize ambient-record cleanup.

The only additive worker descriptors for that path are `task105l05.recovery.recover` (a
non-replayed mutation) and `task105l05.recovery.prove-absent` (an idempotent read). They accept
the exact private authority, return only `{ recovered: true }` or `{ absent: true }`, and are not
a general recovery API. Their registry close hook must close the lazy DB client before the worker
can report clean exit.

**Runtime data flow:** strict CLI input → exact suite/profile guard → central exclusive
evidence-session claim → registered `task-105-l05` adapter → one private recovery authority and
live-parent CAS receipt → reversible assistant/homepage/admin-base lease, shared persistent workers,
synthetic-session private state, validated derived host policy, and supervised local host →
authenticated browser segments → exact observable assertions/screenshots → redacted report →
ordered in-process receipt-backed recovery/CAS cleanup/absence proof → repository guard comparison. Use
shared lifecycle failures and aggregate cleanup failures without masking a primary failure.

## Five Required Visible Flows

1. Use the worker-created synthetic published page as the leased homepage, create/edit/publish
   a synthetic menu through the admin UI with a link to that page, then open **Site shell**
   through the UI, select that published menu as navigation, and save through the real
   settings PATCH path. Reload the leased public homepage and prove the menu text/link and
   page target are visible. Cleanup performs the worker-owned version check/restoration for
   homepage plus both Site Shell keys before deleting the menu and page.
2. Change one menu-design appearance control on the synthetic menu and prove a computed
   style or DOM-state effect in the editor or published shell, not merely a stored JSON
   value.
3. In the synthetic user's dashboard, enter **Customize**, add/configure/reposition a
   widget through real controls, save, reload, and prove its `data-widget-id` geometry or
   visible configuration effect.
4. Open two authenticated pages for the same synthetic user in the same browser storage
   partition. Make page A's dashboard draft dirty; save a different fixture-owned layout
   through page B's real UI so its cache broadcast reaches A. Assert A shows **Saved layout
   changed elsewhere**, keeps its draft visible, and has Save disabled; delete the
   synthetic user/layout during cleanup rather than mutating any ambient layout.
5. Select a solution kit, prove selected card/detail state, open the reviewed LLM Guide,
   and assert the handoff UI state. The run-local lease enables
   `assistant.enabled = true` while disabling the ambient launcher avatar before the host
   starts; it does not configure an LLM, provider, default mode, or credentials. Never invoke
   solution-kit apply or rollback, chat, plan, dry-run, or execute.

Each scenario has accessible/visible assertions, zero console/page errors, one captured
screenshot validated as manifestable, and light/dark coverage across the set. The suite
must preserve existing internal write contracts rather than bypass them with direct browser
fixture injection. It uses exactly two persistent authenticated admin pages for the whole fast
run: page A carries flows 1–3 and 5 plus the one required dashboard document reload; page B is
opened once only for flow 4. It must not create a third authenticated page, authenticate again,
or call browser logout. This bounds the route-classified `auth` facts to at most eight across the
fast run (two bootstrap GETs for A, two after A's one reload, two for B, and at most one CSRF GET
per page), below the existing 10-per-60-second `auth` bucket without mutating security settings.

## Security Contract

All protected admin requests remain existing **internal/session-authenticated** routes. The sole
bootstrap exception is the existing public read-only `GET .../auth/install/status`; it performs
no mutation and does not gain a fixture credential. The fixture user receives only its owned
synthetic role with the seven existing permissions needed for these flows: `menus:read`/
`menus:write`, Site Shell `settings:read`/`settings:write`, dashboard/page reads through
`content:read`, `dashboard:write`, and `solution-kits:read`; assistant-status is covered by the
same `settings:read`. Menu, settings, and dashboard unsafe writes use the normal CSRF path;
route schemas continue strict reject-unknown validation.
`GET <adminBase>/api/auth/me`, `GET .../auth/install/status`, and `GET .../auth/csrf` use the
existing `auth` rate-limit classification (`install/status` remains its existing public-read
route and never receives a fixture credential); normal menu/settings/dashboard/content/kit
requests use `admin_read`/`admin_write`; and dynamic
`<adminBase>/api/assistant/status` uses `assistant`. The public homepage reload is a normal
unauthenticated `public_read` request, requires no CSRF or public-write mechanism, and exposes
no private fixture data.

The browser network receipt has two bounded phases for **every newly opened authenticated admin
page**, including both pages in the stale-layout flow. Before `goto`, the bootstrap observer is
installed and admits only the dynamic-base `GET` map `auth/me` (200), `auth/install/status`
(200), `settings` (200), `custom-screens` (200), and `solution-kits` (200). It waits for every
expected bootstrap fact without fixed sleeps. Because dashboard and other page effects may start
concurrently, a known semantic request observed before that seal is kept only in a bounded local
pending list; it is fully classified/validated in original order and projected only after the
five bootstrap facts seal. Unknown, failed, or forbidden API traffic fails immediately in either
state. The semantic observer uses the validated `<adminBase>/api` prefix and admits
`GET .../auth/csrf` before the first unsafe request plus the menu, `GET .../pages`,
`GET .../page-templates`, Site Shell settings, dashboard, solution-kit detail/catalog,
assistant-status, and public-home data requests needed by the five flows. Document/static
admin-shell and public assets are observed for console/page errors but are not mistaken for
application API calls. Both observers reject
any `solution-kits/*/apply` or `solution-kits/*/rollback`, `/assistant/chat`, or assistant
action plan/dry-run/execute request. Evidence and reports contain only safe scalar
endpoint IDs/statuses/counts/digests/relative paths: never credentials, CSRF tokens, raw
settings values, user data, database rows, raw URLs, or browser storage.

The direct fixture lease for `assistant.enabled`, the two launcher-avatar keys, `site.homepageId`,
and `site.adminPath` is private setup/cleanup only, not a browser/API acceptance shortcut. It
writes only boolean `true`, boolean `false`, empty avatar asset, the synthetic page ID, and the
validated task-local admin path behind the native writer fence and locked settings table; it
stores absent-or-present raw baselines plus owned `xmin`/timestamp/value identities and performs
CAS restoration only after the host is proven absent. It snapshots the two Site Shell rows but
claims their post-write ownership only after the real browser UI PATCH. It never reads or writes
credentials. The visible menu, Site Shell, and dashboard mutations remain real browser UI calls
under their ordinary session, RBAC, CSRF, strict-validation, and reference-validation contracts.
The receipt asserts route classification and CSRF/RBAC use; it must not claim that authenticated
`admin_read`/`admin_write` requests were throttled, because the existing middleware
intentionally bypasses those buckets for authenticated sessions.

## Browser Observation Receipt

`descriptors.ts` owns an exact local `Task105L05BrowserReceipt` validator and
`browser-segments.ts` owns its producer. It contains only the scenario/variant enum,
`consoleErrorCount`, `pageErrorCount`, plus ordered bounded bootstrap and semantic request
facts `{ endpointId, method, status, count }` and a safe digest/count projection. It never
records raw URLs, query strings, headers, bodies, CSRF values, setting values, user data, or
console/page-error text.

`browser-drivers.ts` owns `createTask105L05InjectedObserver(dispatcher, descriptor)`, not a
native Playwright page-emitter observer. The CLI dispatcher installs one page init-script before
each authenticated page's first navigation and uses dispatcher `run-code` controls to manage it.
The wrapper classifies immediately to safe endpoint IDs/methods/statuses/counts; its bounded
bootstrap pending queue contains only those safe facts, never a raw URL, request/response object,
console value, or page-error value. It wraps `fetch`, XHR `open`/`send`, `console.error`, and the
page error/rejection handlers, keeping exact original functions/property descriptors only in the
page-local restoration closure.

`install()` first writes a task-scoped activation generation into `window.name`, then adds the
init script. On each navigation the script installs only while that marker matches; page A stays
active through its allowed reload and starts a fresh receipt epoch, while page B gets its own
bootstrap epoch. `dispose()` always runs through the dispatcher in `finally`: it restores the
exact original functions/property descriptors and handlers in the current document, clears the
page-local queues/counters, removes the activation marker, and makes duplicate install/dispose
fail closed. Because CLI `addInitScript` registrations cannot be removed, a final disposal proof
must navigate once more and show the retained registration is inert without the marker; it must
not falsely claim `page.off()` removal. A thrown scenario action still runs this restoration
control before it propagates failure.

The first finite state is the exact bootstrap map above. Before its five bootstrap facts seal,
known semantic responses go only to the bounded safe pending queue; after seal, it validates and
projects them in order, then transitions to the fixed dynamic-admin-base pathname/method semantic
map. The semantic map covers CSRF, menu read/write, page-list, page-template-list, Site Shell
settings read/write, dashboard layout/data read/write, solution-kit catalog/detail, assistant
status, and public-home data. Every classified response must carry its expected successful status;
an unknown semantic API request or forbidden apply, rollback, chat, plan, dry-run, or execute
route fails the scenario in either state. Tests prove the second stale-layout page bootstrap,
concurrent initial dashboard buffering/projection only after seal, unknown-traffic refusal, exact
restoration after success and a thrown action, and inertness after final disposal. They reject an
auth-fact total above eight or unexpected authenticated-page creation/reload. Every scenario
requires zero console/page-error counts. Only after local validation may the adapter project an
empty generic `consoleErrors` array and the safe scalar receipt facts into the shared result/report.

## Screenshot Output Contract

Browser segments write candidate PNGs only into the private task workspace. The task-local
`output-manifest.ts` validates the bounded exact five-screenshot manifest and archives each
candidate into the claimed evidence session under `screenshots/`. Before archiving, it reads
each workspace candidate under trusted workspace ancestry through
`O_RDONLY | O_NOFOLLOW | O_NONBLOCK`, requiring a bounded regular single-link descriptor and
stable descriptor/path identity before and after the read; it validates the PNG signature/size
and derives the archive hash from those exact bytes. It never follows, copies, or hashes a
pathname with `readFile`. It creates the evidence child directory through trusted no-follow
checks and a non-recursive mode-0700 mkdir, then creates each canonical PNG with
`O_CREAT | O_EXCL | O_NOFOLLOW`, mode 0600, a regular/single-link descriptor check, a
post-write identity recheck, and a final no-follow hash/mode verification. A pre-existing PNG,
candidate or destination symlink/hard link/non-regular node, identity swap, duplicate manifest
path, or hash mismatch fails closed without replacement. Only the verified archived paths are
returned as `SmokeScreenshotResult` values; staging output never becomes canonical evidence.

Before any manifest projection or write, `output-manifest.ts` runs the exact read-only
`verifyTask105L05ArchivedScreenshotsBeforeManifest(...)`. It first requires
`manifest.json` to be absent, derives the five expected archive paths from
`buildExactTask105L05ScreenshotManifest`, and requires the terminal report's screenshot entries
to be exactly those paths and hashes. Through trusted no-follow ancestry it then enumerates
exactly those five PNGs—no extras—and opens each with
`O_RDONLY | O_NOFOLLOW | O_NONBLOCK`; before and after the bounded PNG/hash read it proves
path/descriptor `dev:ino` identity, regular single-link type, and mode `0600`. It returns only
the verified relative path/hash/mode facts and never invokes a manifest writer. The
`task105-l05-output-manifest.test.ts` seam must force bad mode, hash, symlink, and identity-swap
failures and prove each leaves `manifest.json` absent with zero manifest-writer calls.

**Final manifest and audit hardening:** the orchestrator-only final manifest write is part of
the same exclusive-evidence boundary; it is not an unchecked generic follow-up. Before changing
the current 812-line `smoke-evidence.mjs` facade, preserve its existing extracted
`smoke-evidence-filesystem.mjs` boundary so both modules remain at most 1,000 physical lines. The
facade keeps every existing export/signature, imports/re-exports the extracted operations, and
adds only `readCanonicalSmokeEvidenceReport(...)`; its matching `.d.mts` declaration changes only
for that secure read and the optional audit flag. The helper must revalidate the real Git root and
every existing component through the claimed session before and after every sensitive operation,
using no-follow directory identity checks rather than a one-time pathname check. It creates a
missing canonical component only one level at a time with non-recursive mkdir and immediately
rechecks its identity.

`readCanonicalSmokeEvidenceReport` reads only the exact `report.json` in the expected task/session
through `O_RDONLY | O_NOFOLLOW | O_NONBLOCK`; it requires a regular single-link descriptor, size
bounds, stable descriptor/path identity before and after reading, then returns private in-process
`{ report, sha256 }` data without logging raw bytes. The same helper primitives must protect the
manifest and screenshot reads used by validation/audit. `canonicalStatusRecords` must likewise
use stable no-follow reads for regular dirty files and pre/post `readlink` identity checks for its
intentional status-symlink representation, so a computed working-tree revision is not assembled
from swapped pathname objects. `writeSmokeEvidenceManifest` first binds
the validated manifest's `taskId` and `session` to its `expectedTask` and `expectedSession`; it
then creates `manifest.json` exactly once with `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW`, mode
0600, regular/single-link descriptor checks, fsync, a safe post-write reread, and pre/post
directory/file identity rechecks. It never replaces an existing file.

`auditSmokeEvidenceDirectory` gains one backwards-compatible explicit
`requirePrivateEvidenceFiles` option. Existing callers retain their current regular-file audit;
the L04 orchestrator passes `true`, requiring the exact report, manifest, and manifest-referenced
PNGs to be regular, single-link, mode 0600 files read through the no-follow helper with stable
post-read identity/hash checks. The audit revalidates canonical ancestry before and after
enumeration and every report/manifest/screenshot operation. A symlink, a non-regular node, a hard
link, unsafe mode, a component/file identity change, a pre-existing or mismatched-task/session
manifest, or an unexpected present file fails closed and never causes an overwrite. This is a
narrow L04 supersession of TASK-545's shared evidence helper, not a transfer of checkpoint or
closure-resume behavior; L04 does not invoke those separate APIs.

**Terminal report identity:** `descriptors.ts` also owns
`assertTerminalTask105L05Report(report, expected)`. Before a report can be projected, this exact
local validator requires the complete runner-report envelope
`schemaVersion`, `suiteId`, `profile`, `session`, `pass`, `serverUp`, `timings`, `processes`,
`snapshots`, `scenarios`, `screenshots`, `consoleErrors`, `suiteCleanup`, `cleanup`, and
`failures`; it rejects unknown/missing keys. It requires `schemaVersion === 1`, the exact
`{ suiteId: "task-105-l05", profile: "fast", session }` identity, exit zero, passing server and
cleanup fields, an empty failure list, the five expected passing scenarios, and the existing
bounded/redacted receipt invariants. It never accepts identity from the manifest projection as a
substitute for the runner report. The descriptor tests include wrong-suite, wrong-profile,
wrong-session, and malformed-envelope refusals.

## Testing Requirements

1. Add the suite ID to the closed `SUITE_IDS` union, CLI supported-profile map, and static
   registry; update the registry test's exact list and adapter loading proof. The adapter
   itself must reject an unexpected suite/profile before it touches a resource. Extend
   `SmokeAdapter` with optional `evidenceSessionPolicy: "exclusive"`; only the L04
   adapter opts in, so existing adapters retain their current evidence behavior.
2. Add focused adapter, descriptor, cleanup, output-manifest, evidence-session, auth, worker-operation,
   recovery-receipt, recovery-DB, `smokeEvidenceFilesystem`, and named
   `task105-l05-runner-redaction.test.ts` Bun tests, then run each and
   `bun test tests/unit/runtime-smoke`. The evidence-session test proves missing-`task-105`
   bootstrap, existing-session/report refusal, symlink/non-directory ancestry refusal,
   identity-swap refusal, and 0600 report ownership. `scripts/runtime-smoke.ts` adds only narrow
   controlled dependency seams for this named runner-redaction test (adapter/descriptor loading,
   lifecycle/resource construction, and diagnostic writer); production `main` supplies the real
   dependencies. That test injects `SECRET_SENTINEL` only through message, cause, and stack for
   runner-primary, lifecycle cleanup, and every worker phase (`spawn`, `protocol`, `install`,
   `settings_apply`, `settings_restore`, `close`), captures JSON stdout, Markdown stderr,
   diagnostics, report, and evidence, and proves the sentinel absent while only the closed
   boundary/code/worker-phase literal remains. It does not inspect or claim redaction of a host
   raw tail, and it remains at most 1,000 physical lines. The output-manifest test proves trusted private staging, exact five
   source/archived PNG paths, source and destination exclusive/no-follow regular-single-link
   reads/creation, source-symlink/hard-link/identity-swap plus destination
   symlink/pre-existing/identity-swap refusal, modes, and hashes. The auth test proves a synthetic-session storage state accepts only the
   validated non-`/admin` local base, is exclusive/no-follow/0600, contains one bounded session
   cookie without leaking its value, and never selects ambient credentials. The task cleanup
   tests prove all seven setting keys across absent/present/null baselines, avatar/footer/admin
   path drift refusal, host absence before restoration, cache invalidation, exact-seven-permission
   role creation, session revoke/delete/absence before user cleanup, user-role-link/user absence,
   role-drift refusal, role absence, synthetic-page absence, and terminal fixture absence.
   They also prove a pre-install/lost-response cell does not mistake missing returned IDs for
   absence: it enters receipt-backed recovery while the worker is still registered, and only then
   permits workspace and pool teardown. A resource that cannot be proven absent must make the
   lifecycle cleanup fail rather than allow report/manifest success.
   Adapter/descriptor tests prove the five flows, a non-`/admin` host policy/navigation/API-prefix
   receipt, the shared-supervisor fixed-entry capability's sealed environment and source inventory,
   and zero child start on invalid capability input; they do not use the legacy `.env`-sourcing
   launcher or assert its raw-tail behavior. They also prove injected observer
   `install()`/`dispose()` restores the page-local original functions/property descriptors and
   handlers, clears safe queues/counters, and leaves the init script inert after a final-navigation
   proof following both a success and a thrown scenario. They prove per-fresh-page bootstrap (`auth/me`, install status, settings, custom screens, and
   solution kits) plus safe buffering of concurrent initial dashboard facts, the
   two-page/one-reload/eight-auth-fact budget, page/page-template semantic endpoints, two-page stale behavior, and
   safe-result/redaction projection. The worker-operation test proves the exact descriptor/profile
   set, strict reject-unknown worker frames, the fixed environment allowlist without logging a
   value, no mutation replay after a dispatched failure, and phase/code projection for spawn,
   protocol, install, settings apply/restore, and close. It must prove that neither an exception
   message nor its cause reaches a reportable diagnostic. The recovery-receipt test proves exact
   fields, byte bound, HMAC rejection, all allowed and rejected transitions, and phase invariants.
   The recovery-DB seam test proves `fixture-intent` exists before fixture mutation, a lost install
   response triggers recovery rather than a mutation retry, only receipt-owned records/settings
   can be restored/deleted, and receipt plus namespaced fixture absence is required before success.
   It covers both a proven-empty `fixture-intent` and an incomplete `fixture-installing` record;
   the latter must fail closed unless exact ownership can be re-established.
   It proves `transitionReceipt` is the sole mutation path: valid CAS transition, stale expected
   phase rejection, exact-patch idempotence, different-patch rejection, and two concurrent recovery
   attempts with only one committed winner. It also proves parent-death/authority loss fails closed
   into manual-cleanup-required state rather than attempting cross-process recovery. It may use a
   private deterministic persistence seam but may not add a generic public recovery API or include
   private receipt data in an assertion snapshot. The focused
   `smokeEvidenceFilesystem.test.ts` suite proves manifest task/session binding before creation,
   exclusive/no-follow creation, 0600 mode,
   pre-existing/symlink and deterministic identity-swap refusal, secure report read, and the
   `requirePrivateEvidenceFiles` report/manifest/PNG audit branch; they also prove a changed
   working-tree revision blocks final receipt both before and after the private-file audit. A
   private filesystem-operation seam may make the mid-operation swap/mutation deterministic, but
   it must not become a new public caller API. `smokeEvidenceDriver.test.ts` is not extended.
   These cases may not alter unrelated TASK-545 scenarios.

   At minimum, the focused worker/recovery receipt is:

   ```bash
   bun test tests/unit/runtime-smoke/task105-l05-worker-operations.test.ts \
     tests/unit/runtime-smoke/task105-l05-recovery-receipt.test.ts \
     tests/unit/runtime-smoke/task105-l05-recovery-db.test.ts \
     tests/unit/runtime-smoke/task105-l05-cleanup.test.ts \
     tests/unit/runtime-smoke/task105-l05-adapter.test.ts \
     tests/unit/runtime-smoke/task105-l05-runner-redaction.test.ts \
     tests/unit/workflows/smokeEvidenceFilesystem.test.ts
   ```

3. Immediately before classification, run
   `node _docs/_workflows/task-105-08-05-implement.mjs --assert-l04-classify-preconditions`.
   It fails unless `HEAD` contains the frozen exact L14/L16 handoff rows while every inherited
   L04 dirty row and every `HEAD` row remains semantically unchanged; preserve those rows until
   the generator runs. Then run
   `bun scripts/bun-lane-classify.ts`, followed by
   `node _docs/_workflows/task-105-08-05-implement.mjs --assert-l04-manifest-projection`.
   The generated diff must retain every prior semantic row and add exactly the eleven registered
   L04 rows, then run `bun test tests/unit/toolchain/bunLaneManifest.test.ts` and
   `bun test tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts`. Do not hand-edit the
   generated manifest or reclassify another leaf's test.
4. Run root ESLint over every changed owned path (including `scripts/runtime-smoke.ts`,
   `adapters/types.ts`, `evidence-session.ts`, `browser/admin-auth.ts`,
   `task-105-l05/host.ts`, `task-105-l05/browser-drivers.ts`,
   `task-105-l05/worker-operations.ts`, `task-105-l05/worker-fixture-operations.ts`,
   `task-105-l05/worker-recovery-operations.ts`, `task-105-l05/recovery-receipt.ts`,
   `task-105-l05/recovery-db.ts`, `task105-l05-runner-redaction.test.ts`, and both shared
   evidence modules), `bun --cwd core lint`,
   `bun --cwd core lint:types`, root TypeScript with zero L04-owned diagnostics,
   `git diff --check`, and the line-count gate.
5. Update only the supported-suite command and current-adapter inventory in `tests/README.md`.
   Before the one smoke attempt, require a quiescent shared worktree, an absent exact
   canonical **session** directory, no same-session process, a guarded status baseline, and
   no reuse of another suite's screenshots. The `task-105` parent itself may be absent:
   the central exclusive helper bootstraps it safely, then claims the absent session
   atomically; the adapter does not perform a second preflight check.
6. Only after all static gates and an explicit no-live-process proof, run a fresh, absent
   evidence session exactly once:

```bash
bun scripts/runtime-smoke.ts run --suite task-105-l05 --profile fast --session task105-l05-fast-20260829-r3
```

7. After natural terminal exit, the **orchestrator only** reads the final runner
   `report.json` through `readCanonicalSmokeEvidenceReport`, never a raw pathname
   `readFile`. Before it may project or create `manifest.json`, it independently
   requires exit 0, `report.pass === true`, `report.serverUp === true`,
   `report.cleanup.pass === true`, an empty `report.failures` array, exactly the five
   required passing scenario IDs, zero console/page-error receipt counts, exact five archived
   screenshot paths/hashes/modes, no live session process, and cleanup/absence plus
   repository-guard proof. Any failed condition retains only diagnostic evidence and blocks
   manifest creation and L06.

   `report.processes` is a safe start-counter summary, not an absence proof. The terminal
   liveness receipt therefore separately requires natural runner exit and successful
   lifecycle `close()` plus `proveAbsent()` for the task worker pool, host, browser dispatcher,
   workspace, aggregate fixture cleanup, and shared process supervisor. It may record only the
   boolean pass/fail result for each named resource and the bounded cleanup phase/code; it must
   not record a PID, command line, worker error text, recovery authority/receipt, or process
   output; the same public-error serializer is the only failure projection. Parent death or lost
   recovery authority is a fail-closed non-terminal state requiring the documented manual cleanup,
   never a manifest or L06 receipt. Poll for those conditions through the shared
   lifecycle/supervisor primitives; do not use a fixed sleep or kill a still-live run merely to
   manufacture a passing receipt.

   Only after those checks it performs the exact secure receipt, including a clean worktree
   revision comparison before and after the manifest write and again after the private-file
   audit:

~~~ts
const securedReport = await readCanonicalSmokeEvidenceReport({
  repoRoot,
  expectedTask: "TASK-105",
  expectedSession: session,
});
const report = securedReport.report;
assertTerminalTask105L05Report(report, {
  exitCode,
  suiteId: "task-105-l05",
  profile: "fast",
  session,
});
await verifyTask105L05ArchivedScreenshotsBeforeManifest({
  repoRoot,
  expectedTask: "TASK-105",
  expectedSession: session,
  expectedManifest: buildExactTask105L05ScreenshotManifest({
    command: "run",
    suite: "task-105-l05",
    profile: "fast",
    session,
  }),
  report,
});
const revisionBefore = publicRevision(
  await computeWorkingTreeRevision(repoRoot, "TASK-105", session)
);
const manifest = projectSmokeEvidenceManifest({
  taskId: "TASK-105",
  suiteId: "task-105-l05",
  profile: "fast",
  session,
  reportPath: "report.json",
  reportSha256: securedReport.sha256,
  revision: revisionBefore,
  generatedAt: new Date().toISOString(),
  report,
});
await writeSmokeEvidenceManifest({
  repoRoot,
  expectedTask: "TASK-105",
  expectedSession: session,
  manifest,
});
const revisionAfter = publicRevision(
  await computeWorkingTreeRevision(repoRoot, "TASK-105", session)
);
if (!revisionEquals(revisionBefore, revisionAfter)) {
  throw new SmokeEvidenceError("smoke_revision_mismatch", "working_tree", "changed_during_receipt");
}
await auditSmokeEvidenceDirectory({
  repoRoot,
  expectedTask: "TASK-105",
  expectedSuite: "task-105-l05",
  expectedProfile: "fast",
  expectedSession: session,
  expectedRevision: revisionAfter,
  requireCheckpoint: false,
  requireTracked: false,
  requirePrivateEvidenceFiles: true,
});
const revisionAfterAudit = publicRevision(
  await computeWorkingTreeRevision(repoRoot, "TASK-105", session)
);
if (!revisionEquals(revisionAfter, revisionAfterAudit)) {
  throw new SmokeEvidenceError("smoke_revision_mismatch", "working_tree", "changed_during_audit");
}
~~~

8. The audit must prove the exact `{report.json, manifest.json, manifested PNGs}` tree,
   hashes, and retained report/manifest paths. Run certification only when the release
   boundary requires it; it retains the same product-visible scenarios.

## Documentation Updates Required

Return the exact smoke command, terminal result, static/Bun gates, scenario results,
redacted evidence location, cleanup proof, and audit verdict to the orchestrator. Update
the three explicitly owned non-task artifacts (`tests/bun-lane-manifest.json`, `tests/README.md`,
and the operator-only section in `docs/develop/runtime-smoke-cookbook.md`) as described above.
The cookbook runbook is a fail-closed manual-cleanup procedure only: it creates neither a task
receipt nor a manifest and is never a continuation of the failed session. The orchestrator alone
writes the canonical evidence manifest after the terminal report checks. `TASK-105-09` alone
writes the bounded L04 task receipt/status and L05 board synchronization after L12 and changelog
1325. No L04 implementer stages, commits, or alters task-board rows.

## Closure Checklist

- [ ] Exactly one shared-platform adapter is statically registered; no task-local loop exists.
- [ ] Five real admin flows prove visible effects and accessibility behavior.
- [ ] Existing session/RBAC/CSRF/validation paths are preserved and disallowed requests are absent.
- [ ] Synthetic role/user/link/session, menu/page, user layout, and all seven leased settings are
      cleanup-proven without clobbering drift.
- [ ] A response-unknown worker failure is recovered only while the live parent retains the
      private HMAC/CAS authority; parent death fails closed to manual cleanup, and no private
      authority, receipt field, or raw worker failure is projected into evidence.
- [ ] Evidence is canonical, hash-verified through the orchestrator-owned manifest,
      redacted, task-scoped, runner-exclusively claimed, and terminal.
- [ ] Worker failure projection is redacted and the parent, worker, host, and browser
      processes are all absent before terminal receipt is considered.
- [ ] The shared fixed-entry host capability is present; generic shared-supervisor/outer-runner
      raw-tail redaction is either separately delivered or blocks any claim about those raw logs.
- [ ] The no-follow pre-manifest screenshot verifier proves the exact five `0600` archive files
      before manifest projection, and manual cleanup remains operator-only/non-manifestable.
- [ ] The smoke receipt permits L05 family closure and then L06.
