# TASK-547-06-L01: Acceptance, Smoke, Docs and Closure
# FileName: TASK-547-06-L01-Acceptance-Smoke-Docs-And-Closure.md

**Parent Subtask:** TASK-547-06
**Priority:** High
**Category:** QA / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-547-05, TASK-552-04 shared dispatcher/server extraction
**Status:** ✅ Done
**Completed:** 2026-08-08
**Validation:** TASK-547 harness tests passed 26/26; certification session
`wf547final` passed 18/18 in 220.687 s with zero console errors and cleanup PASS.

## Overview

Own final acceptance-only tests, the thin `task-547` adapter for the shared
runtime-smoke platform, all 18 scenario descriptors/assertions, shared docs,
changelog
`_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md` and
task closure.
The single guide artifact is `docs/develop/full-site-packages.md`.
Historical smoke output does not prove the current candidate. Fresh screenshots
go under `_docs/_workflows/_smoke/task-547/`; the shared runner emits its
bounded JSON/Markdown report on stdout/stderr. Both are review evidence, not a
generated task-state ledger.
Acceptance first verifies logical reference label `projekty-domow-wow-site` and
aggregate ordered-manifest digest
`d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`;
neither the absolute main-repository path nor raw reference content enters
evidence.

The exact ordered descriptor set is the parent's 01..18 list. Tests assert exact
number, ID, browser segment, normalized URL, viewport, assertion list and
order—not only count. Both `fast` and `certification` execute the same 18 IDs
and assertions; only bounded polling/auth infrastructure windows differ.

## Exact Single-Writer Ownership

During its acceptance/closure phase this leaf is the sole writer for exactly:

- acceptance tests
  `tests/integration/kits/projektyDomowInstalledSite.test.ts`,
  `tests/integration/kits/projektyDomowInstalledTestSupport.ts`,
  `tests/integration/kits/projektyDomowInstalledAccessibility.test.ts`,
  `tests/integration/runtime/projekty-domow-detail-route.test.ts`,
  `tests/integration/runtime/pages-runtime.test.ts`,
  `tests/integration/runtime/pages-runtime-blocks.test.ts`,
  `tests/integration/runtime/pages-runtime-listings.test.ts`,
  `tests/integration/runtime/pages-runtime-responsive.test.ts`,
  `tests/integration/runtime/pages-runtime-test-support.ts` and
  `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx`;
- runtime-smoke production paths
  `scripts/runtime-smoke/adapters/task-547.ts`,
  `scripts/runtime-smoke/adapters/task-547/descriptors.ts`,
  `scripts/runtime-smoke/adapters/task-547/host.ts`,
  `scripts/runtime-smoke/adapters/task-547/worker-operations.ts`,
  `scripts/runtime-smoke/adapters/task-547/fixture.ts`,
  `scripts/runtime-smoke/adapters/task-547/cleanup.ts`,
  `scripts/runtime-smoke/adapters/task-547/workspace.ts`,
  `scripts/runtime-smoke/adapters/task-547/browser-segments.ts`,
  `scripts/runtime-smoke/adapters/task-547/assertions.ts` and
  `scripts/runtime-smoke/adapters/task-547/output-manifest.ts`; shared static registration in
  `scripts/runtime-smoke/contracts.ts`, `scripts/runtime-smoke/cli.ts` and
  `scripts/runtime-smoke/registry.ts`;
- runtime-smoke tests `tests/unit/runtime-smoke/cli-registry.test.ts`,
  `tests/unit/runtime-smoke/task547-adapter.test.ts`,
  `tests/unit/runtime-smoke/task547-descriptors.test.ts`,
  `tests/unit/runtime-smoke/task547-host.test.ts`,
  `tests/unit/runtime-smoke/task547-worker-operations.test.ts`,
  `tests/unit/runtime-smoke/task547-cleanup-batch.test.ts`,
  `tests/unit/runtime-smoke/task547-workspace.test.ts`,
  `tests/unit/runtime-smoke/task547-browser-segments.test.ts` and
  `tests/unit/runtime-smoke/task547-output-manifest.test.ts`;
- root integration surfaces `package.json`, `tests/README.md` and shared smoke
  docs only where needed for the new suite commands/registration; no task-local
  CLI, lifecycle, process supervisor, DB worker, browser loop, report loop or
  `.gitignore` evidence exception is added;
- product/developer docs `_docs/SOLUTION_KITS.md`,
  `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/PAGE_MODEL.md`,
  `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`, `_docs/SECURITY_SPEC.md`,
  `docs/develop/README.md`, and
  `docs/develop/full-site-packages.md`; `_docs/DATA_MODEL.md` must retain the
  four legacy install-ledger values while documenting all ten full-site
  resource kinds, with no DDL migration for the text-backed expansion;
- closure indexes/artifacts `_docs/_TASKS/README.md`,
  `_docs/_CHANGELOG/README.md`, and
  `_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md`;
- every TASK-547 family contract:
  `TASK-547_Full_Site_Example_Package_And_Projekty_Domow_Installer.md`,
  `TASK-547-01-Full-Site-Package-Contract-And-Reference-Graph.md`,
  `TASK-547-01-L01-Package-Schema-Normalizer-And-Limits.md`,
  `TASK-547-01-L02-Reference-Registry-Graph-And-Contract-Tests.md`,
  `TASK-547-02-Installer-Resource-Lifecycle-And-Rollback.md`,
  `TASK-547-02-L01-Installer-Split-And-Plan-Resolver.md`,
  `TASK-547-02-L02-Native-Resource-Adapters-And-Run-Ledger.md`,
  `TASK-547-02-L03-Failure-Atomicity-Rollback-And-Security-Tests.md`,
  `TASK-547-03-Projekty-Domow-Content-Forms-And-Listings.md`,
  `TASK-547-03-L01-Project-Schema-And-Entry-Fixtures.md`,
  `TASK-547-03-L02-Listing-Query-Detail-And-Content-Route.md`,
  `TASK-547-03-L03-Contact-Form-Action-And-Generator-Tests.md`,
  `TASK-547-04-Projekty-Domow-Pages-Shell-And-Canonical-Package.md`,
  `TASK-547-04-L01-Seven-Page-V2-Documents.md`,
  `TASK-547-04-L02-Site-Shell-Settings-And-Canonical-Artifact.md`,
  `TASK-547-04-L03-Public-Locale-Propagation.md`,
  `TASK-547-05-Installer-Backed-CLI-And-Starter-Registration.md`,
  `TASK-547-05-L01-Strict-Installer-CLI-And-Tests.md`,
  `TASK-547-06-Runtime-Acceptance-Docs-And-Closure.md`,
  `TASK-547-06-L01-Acceptance-Smoke-Docs-And-Closure.md`, and
  `TASK-547-07-Multi-Agent-Workflow-And-Drift-Evidence.md`, all under
  `_docs/_TASKS/`.

Before closure, TASK-547-07 retains ownership of its workflow contract only and
does not duplicate the shared runner. TASK-547-04-L01 owns production contracts
only and hands scenario IDs 14..18 to this leaf. L01 must not edit any
TASK-547-01..05 production or targeted-test path without a fresh verified defect
assigned back to that owner. Every new/changed path must have one writer and a
focused owning gate; broad directory globs are not writable authority.

TASK-552-04 must land first. This leaf imports
`PlaywrightCliDispatcher` from
`scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts` and
`SupervisedServerResource`/`startSupervisedServer(...)` from
`scripts/runtime-smoke/server/supervised-server.ts`; it must not duplicate the
private dispatcher/server loops from any existing adapter.

The shared `startSupervisedServer(context, spec)` resolves the literal
`coderso-dev-core-host` through the validated `PATH` projection to an absolute
executable and registers its returned resource with `context.lifecycle` before
readiness work; the adapter must not register it again. TASK-547 passes the
shared exact `CODERSO_DEV_HOST_ENVIRONMENT_POLICY` from
`server/supervised-server.ts`. Its required, optional, inherited and fixed keys
are the sole child environment authority; blank required values and NUL fail
before spawn, every non-allowlisted ambient key is ignored, and
`MEDIA_STORAGE`/`MEDIA_DIR` are deliberately rejected. No ambient spread or
suite-local environment projector is allowed, and evidence exposes only key
names plus redacted presence, never values.

## Security Contract

- **Visibility/endpoints:** add no route. Validate all existing internal admin
  `/admin/api/solution-kits*` read/plan/apply/rollback/run routes plus the one
  public write `POST /forms/:id/submissions`.
- **Auth/RBAC:** internal reads/plan require authenticated
  `solution-kits:read`; apply/rollback require authenticated
  `solution-kits:write`. Public contact submission is unauthenticated only for a
  currently published, `submissionAccess:"public"` form on either shared-
  executor mount. A `submissionAccess:"internal"` Form on either mount accepts
  only a coherent session with `forms:write` or an API key with exact scope
  `forms.submit`; anonymous access is rejected. The URL prefix never selects mode.
- **CSRF/rate limits:** every session-authenticated Solution Kit `POST`
  (plan/apply/rollback) requires CSRF and uses `admin_write`; API keys retain
  their existing non-cookie policy. Public submit is charged exactly once to
  `public_write`; an admin cookie does not bypass public nonce/rate enforcement.
  Internal session submission requires valid cookie CSRF and `admin_write`;
  internal API-key submission uses no cookie-CSRF and still uses `admin_write`.
- **Validation/anti-abuse:** all fixed request/envelope objects reject unknown
  keys. Public data keys/types are checked against server-owned fields; require
  the runtime-minted `timestamp.signature` HMAC nonce bound to this form and
  reject missing, altered, expired and cross-form values. Assert both configured
  reCAPTCHA-v3-required rejection and configured exemption behavior; clients
  cannot select that policy.
- **Data hygiene:** use only fake uniquely marker-bearing data. Register every
  public, Form Design and Page Editor marker before dispatch, attach every
  returned submission ID immediately, delete registered IDs/markers in one
  bounded set-based final cleanup with per-item logical receipts, and prove zero
  scoped rows. Tracked cleanup evidence retains only bounded marker/ID digests
  and outcomes, never raw values.
  Expose no
  credentials, `.env` values, raw submission payload, absolute main-repository
  path or provider token in logs/screenshots/manifests.

## Official Rollback And Emergency Cleanup Contract

Install exactly one fixture and keep its source run live through ordered rows
01..18. Row 08 proves publish/front and native lifecycle parity but must not call
rollback; rows 09..18 reuse the installed Form/Page IDs. Only the adapter's final
`finally` phase, after row 18, calls
`rollbackFullSiteInstall({ sourceRunId, actorId, ledger })` once for the exact
apply run and then proves the complete prior shell/settings raw state. Acceptance
code must not import `applySettingsBatch`, `restoreSettingsBatchRaw`, plain
`deleteById`, or any other weak/per-key compensation surface.

Before apply, capture prior shell settings through L02's presence-aware raw
reader. After successful apply, freeze the exact installed raw setting target
from durable source evidence; do not recapture it at cleanup and call that a CAS
expectation. If official rollback fails, preserve that primary error while
independently attempting L02's
`restoreFullSiteSettingsBatchRawAtomic({ expectedCurrent: installed, target:
prior })`. Any emergency native resource cleanup likewise uses final atomic
delete/restore adapters with the durable installed snapshot as
`expectedCurrent`; a mismatch fails closed and never becomes last-writer-wins.
Every official/emergency/verification failure remains in the cleanup aggregate.
The final phase explicitly and idempotently closes browser, server,
submission-cleanup, scenario-reset and rollback resources, then validates all
cleanup/absence receipts and the final repository snapshot before returning a
`SmokeAdapterResult`. The shared lifecycle can safely call `close()` and
`proveAbsent()` on those already-closed resources again.

## Implementation Pseudocode

```ts
import type { SmokeAdapter, SmokeAdapterResult } from "./types";

export async function runTask547Adapter(
  context: RuntimeSmokeContext,
): Promise<SmokeAdapterResult> {
  assertExactTask547Invocation(context.input); // fail closed before side effects
  const timingPolicy = task547TimingPolicy(context.input.profile);
  // timingPolicy changes only bounded polling/auth windows; scenarioPlan is identical
  const scenarioPlan = buildTask547ScenarioPlan(TASK_547_SCENARIOS);
  const screenshots = buildExactTask547ScreenshotManifest(context.input);
  const repositoryBefore = await context.repository.snapshot(screenshots.paths);

  const workers = await WorkerPool.create({
    root: context.root,
    executable: await resolveExecutableOnPath("bun"),
    supervisor: context.processes,
    registry: createTask547WorkerRegistry(),
    profiles: createTask547WorkerProfiles(),
    lifecycle: context.lifecycle,
  });
  const resources = createTask547ResourceSlots();
  let accepted: Task547AcceptedObservations | null = null;
  let cleanupProof: Task547CleanupProof | null = null;
  let primary: unknown = null;
  try {
    const fixture = await installTask547FixtureInBatches(workers); // one install for 01..18
    resources.rollback = createTask547RollbackResource({ workers, fixture });
    resources.reset = createTask547ScenarioResetResource({ workers, fixture });
    resources.submissions = createTask547SubmissionCleanupResource({ workers, fixture });
    registerTask547Resources(context.lifecycle, resources);

    resources.server = await startSupervisedServer(context, {
      executable: { kind: "path-literal", name: "coderso-dev-core-host" },
      args: [context.root],
      cwd: context.root,
      environment: {
        source: process.env,
        policy: CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
      },
      ports: [3000, 5173, 5174],
      readiness: task547Readiness(),
      readinessTimeoutMs: timingPolicy.healthTimeoutMs,
      family: "task547-dev-host",
    });

    resources.workspace = await createTask547PrivateWorkspace(context);
    const dispatchPlan = materializeTask547BrowserDispatchPlan(
      scenarioPlan.actions,
    ); // includes all bounded source-byte splits
    const dispatcher = new PlaywrightCliDispatcher({
      context,
      session: context.input.session,
      workspace: resources.workspace.path,
      segments: task547PhysicalSegmentIds(dispatchPlan),
    });
    resources.browser = new BrowserTransport(context.input.session, dispatcher);
    context.lifecycle.register(resources.browser);
    const observations = await executeTask547Segments({
      browser: resources.browser,
      dispatchPlan,
      workers,
      authTimeoutMs: timingPolicy.authTimeoutMs,
    });
    accepted = validateExactTask547Observations(observations, scenarioPlan);
  } catch (error) {
    primary = error;
  } finally {
    const finalization = await finalizeTask547ResourcesNeverThrow({
      resources: [
        resources.browser,
        resources.workspace,
        resources.server,
        resources.submissions,
        resources.reset,
        resources.rollback,
      ], // each close/proveAbsent is idempotent
      workers,
    });
    cleanupProof = finalization.proof;
    const repository = await compareTask547RepositoryNeverThrow({
      guard: context.repository,
      before: repositoryBefore,
      allowedPaths: screenshots.paths,
    }); // takes the final snapshot
    primary = preservePrimaryWithCleanup(
      primary,
      finalization.failures,
      repository.failure,
    );
  }
  if (primary !== null) throw primary;
  if (accepted === null || cleanupProof === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-547 result is incomplete");
  }
  return projectTask547SmokeAdapterResult({
    accepted,
    cleanupProof,
    workerCounters: workers.counters(),
  });
}

export default Object.freeze({
  suiteId: "task-547",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask547Adapter,
}) satisfies SmokeAdapter;
```

Data flow: the shared CLI creates `RuntimeSmokeContext`; suite-local factories
construct a lifecycle-registered persistent `WorkerPool`, TASK-552-04's shared
`SupervisedServerResource`/`startSupervisedServer(...)`, `pollUntil` health check
and lifecycle-registered `BrowserTransport` backed by its shared
`PlaywrightCliDispatcher`. The suite materializes and byte-splits compatible
Playwright run-code actions without crossing scenario boundaries, then derives
the dispatcher's exact physical segment allowlist from that final plan. DB fixture,
proof and cleanup operations use bounded worker batches. One fixture supplies
the Form/Page IDs for the exact same 18-row plan in both profiles; only timing-
policy polling/auth timeout values differ.

The adapter's `finally` phase closes browser, its lifecycle-registered private
workspace, server, submission, reset and rollback resources in dependency-safe
order and preserves cleanup failures. The
submission resource performs one bounded set-based deletion, reset restores the
installed mutation baseline, and rollback performs exact-run rollback or
expected-current atomic CAS once before proving zero scoped rows/temp state and
prior DB/settings equality. It then verifies the final repository snapshot
against the exact output-path allowlist. All resources are idempotent, so the
shared lifecycle safely closes/proves them again before it closes workers. No
retry occurs after a non-idempotent browser or DB dispatch. The adapter validates
material observations and decoded PNGs, then returns only bounded
`SmokeAdapterResult`; shared reporting owns redaction, timings, process counters
and global cleanup. There is no TASK-547 CLI, tracked
evidence ledger or claimed end-to-end checkpoint resume.

## Exact Shared-Adapter Scenario Descriptors

| No. | ID | Logical group | Normalized URL | Viewport |
| --- | --- | --- | --- | --- |
| 01 | `home-desktop-effects` | `wf547smoke` | `http://127.0.0.1:3000/` | `1440x1000` |
| 02 | `all-routes-desktop-shell` | `wf547smoke` | `http://127.0.0.1:3000/` | `1440x1000` |
| 03 | `tablet-responsive` | `wf547smoke` | `http://127.0.0.1:3000/` | `1024x1366` |
| 04 | `mobile-navigation` | `wf547smoke` | `http://127.0.0.1:3000/` | `390x844` |
| 05 | `portfolio-facets` | `wf547smoke` | `http://127.0.0.1:3000/projekty` | `1440x1000` |
| 06 | `aurora-detail` | `wf547smoke` | `http://127.0.0.1:3000/projekty/aurora` | `1440x1000` |
| 07 | `contact-form` | `wf547smoke` | `http://127.0.0.1:3000/kontakt` | `1440x1000` |
| 08 | `publish-lifecycle-parity` | `wf547smoke` | `http://127.0.0.1:3000/` | `1440x1000` |
| 09 | `form-design-author-light` | `wf547formdesign` | `http://127.0.0.1:5173/admin/advanced/forms/{formId}` | `1440x1000` |
| 10 | `form-design-author-dark` | `wf547formdesign` | `http://127.0.0.1:5173/admin/advanced/forms/{formId}` | `1440x1000` |
| 11 | `form-design-reset-mobile` | `wf547formdesign` | `http://127.0.0.1:5173/admin/advanced/forms/{formId}` | `390x844` |
| 12 | `form-design-save-reload` | `wf547formdesign` | `http://127.0.0.1:5173/admin/advanced/forms/{formId}` | `1440x1000` |
| 13 | `form-design-publish-front` | `wf547formdesign` | `http://127.0.0.1:3000/kontakt` | `1440x1000` |
| 14 | `page-editor-switcher-author-light` | `wf547pageeditor` | `http://127.0.0.1:5173/admin/pages/{pageId}` | `1440x1000` |
| 15 | `page-editor-switcher-tablet-reset` | `wf547pageeditor` | `http://127.0.0.1:5173/admin/pages/{pageId}` | `1024x1366` |
| 16 | `page-editor-collection-cta-dark` | `wf547pageeditor` | `http://127.0.0.1:5173/admin/pages/{pageId}` | `1440x1000` |
| 17 | `page-editor-form-presentation-save-reload` | `wf547pageeditor` | `http://127.0.0.1:5173/admin/pages/{pageId}` | `1440x1000` |
| 18 | `page-editor-publish-front-parity` | `wf547pageeditor` | `["http://127.0.0.1:3000/","http://127.0.0.1:3000/projekty","http://127.0.0.1:3000/kontakt"]` | `390x844` |

The three `wf547*` values are descriptor metadata used to group review evidence;
they are not Playwright sessions or dispatcher segment IDs. The only real
Playwright session is `context.input.session`, while physical `segment-NNNN`
and any `-part-NN` IDs come from the fully materialized dispatch plan. Literal
`{formId}`/`{pageId}` redactions are validated against the live installed
resource without persisting the raw ID. One strict suite-local descriptor
projection owns exact `{number,id,segment,url,viewport,assertions}` rows.
`assertions` is an ordered non-empty list of exact
`{id,kind,target,expected}` values with JSON-safe typed expectations. It is
Bun-free and imports no DB, server, browser or evidence adapter. Focused tests
prove the exact 01..18 order and byte-semantic equality of the descriptor plan
between `fast` and `certification`; only the separate profile timeout policy may
differ. One fixture remains installed for the full ordered plan; row 08 cannot
rollback it before the Form Design and Page Editor segments consume its IDs.

## Dependency-Shaped Implementation Units

Resume from the actual merged branch inventory and land only unfinished units:

1. acceptance/support tests owned by this leaf;
2. TASK-547 descriptor, worker-operation, cleanup-batch, supervised-host,
   private-workspace, screenshot-manifest and browser-segment helpers plus thin
   adapter;
3. exhaustive `SUITE_IDS` registration in `scripts/runtime-smoke/contracts.ts`,
   `SUPPORTED_PROFILES` in `scripts/runtime-smoke/cli.ts`, `ADAPTER_PATHS` and
   descriptor-map registration in `scripts/runtime-smoke/registry.ts`, plus
   focused positive/negative CLI/registry tests in
   `tests/unit/runtime-smoke/cli-registry.test.ts` and adapter fail-closed tests;
4. shared docs, non-terminal changelog/task drafts and closure.

Each changed unit passes typecheck, lint, its focused tests and line-count gate
before the next dependency. A clean zero-delta or already validated unit is not
replayed. A harness-only repair reruns the shared harness self-test and affected
runtime smoke; it does not invalidate unrelated product/security gates.

Regression/smoke in
`tests/integration/kits/projektyDomowInstalledSite.test.ts`: all eight routes,
distinct desktop/tablet/mobile shell and geometry, portfolio visible filter change,
Aurora bindings/registered-widget hero-art and gallery geometry, exact installed
`success_message` action plus real installed-public and scoped-internal Form validation/security/submission,
reduced motion, `lang="pl"` on Page/detail and publish/front parity. Both aliases
retain mode-based authorization. The scoped internal Form matrix proves coherent session + `forms:write` + valid CSRF +
`admin_write`, API key + `forms.submit` + no cookie-CSRF + `admin_write`, and
anonymous rejection without a row. Every accepted public/internal submission
created by the public, Form Design or Page Editor set is registered by unique
marker and returned ID, joined into one bounded final deletion and included in
the final zero-scoped-row assertion.
Pin native lifecycle evidence: staged-then-published Page/entry/detail/menu,
direct published Form status, no listing-template status, and `enabled:true`
only on the success-message action.
Prove static SEO from TASK-547-04-L01, dynamic detail SEO from TASK-547-03-L02
and their exact preservation by TASK-547-04-L02 at the public runtime boundary.
The suite statically and behaviorally proves no weak settings batch or
`deleteById` cleanup import remains; an injected official-rollback failure makes
the emergency settings CAS restore all keys or none, rejects intervening drift,
and retains the official failure alongside every cleanup failure.

`tests/integration/runtime/projekty-domow-detail-route.test.ts` owns the exact
six-slug acceptance matrix: `/projekty/aurora` is 200 with exact public body,
title, description and canonical
`new URL("/projekty/aurora", capturedInstalledPublicOrigin).href`; the material
origin in final smoke is `http://127.0.0.1:3000`. `/projekty/linea`,
`/projekty/nova`, `/projekty/mono`, `/projekty/vista` and `/projekty/calm` are
404 with exact `detail_not_found_before_metadata`, no resolved document keys,
no closed detail root/block IDs, no match from the full installed-title,
source-backed project corpus or dynamic detail SEO title/description scans, and
no canonical href. Typed validator negatives make every empty array nonempty
one at a time and drift the resolver outcome. Aurora's visible detail order
includes the typed primary/secondary hero-art surfaces
with desktop spans `8/4`, stacked tablet/mobile spans `12/12`, nonzero measured
rectangles and computed resolved theme backgrounds; four statistics precede
exact CTA `Chcę podobny dom` → `/kontakt`, which precedes assumptions.
Assumption values belong to TASK-547-03-L01 fixtures and are bound by
TASK-547-03-L02; TASK-547-03-L03 owns only aggregate preservation.

Do not append to the existing 985-line
`tests/integration/kits/projektyDomowInstalledSite.test.ts`. Extract its cohesive
scoped install/rollback harness into the new
`tests/integration/kits/projektyDomowInstalledTestSupport.ts` and reuse that
harness from both the existing suite and the new
`tests/integration/kits/projektyDomowInstalledAccessibility.test.ts`. The
accessibility suite applies the real package, calls the real
`handlePublicRequest` for `/`, asserts the rendered home tablist has exact
`aria-label="Wybór stylu domu"`, and rolls back the exact source run with prior
shell/settings equality; its Bun test timeout is explicitly 360,000 ms.

New Aurora route/data/SEO coverage belongs in the already allocated
`tests/integration/runtime/projekty-domow-detail-route.test.ts`; focused Page
runtime coverage remains split across `pages-runtime.test.ts`,
`pages-runtime-blocks.test.ts`, `pages-runtime-listings.test.ts`,
`pages-runtime-responsive.test.ts`, `pages-runtime-test-support.ts`, and the
Bun-free `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx`. Every file
is independently runnable in its lane and at most 1,000 physical lines.

Suite-local strict observations retain the full material assertion values needed
to validate this contract, but the adapter returns only the shared bounded
shape. `SmokeAdapterResult.scenarios` has the exact ordered 18
`{id,pass,elapsedMs}` rows; `screenshots` has relative `{path,sha256}` rows;
`consoleErrors` is empty; and `cleanup` contains safe scalar proof/count fields.
The shared `RuntimeSmokeReport` adds profile/session, timing receipts, process
counters, repository snapshot count, global lifecycle cleanup and failure codes.

Before projecting a passing result, suite-local validators cross-bind the exact
scenario descriptor, reference digest, installed source run and material browser
observations. They fully decode distinct PNGs, reject raw IDs/secrets/absolute
paths, require zero console/page errors, and prove all registered task-scoped
submission markers are deleted in one bounded set-based cleanup. Final cleanup
closes browser/server work, deletes submissions, resets temporary Form/Page
mutations to the durable installed snapshot, then calls official exact-run
rollback once and may attempt expected-current atomic CAS after a failure. It
always proves zero scoped rows/temp artifacts plus presence-aware prior/final
DB/settings equality. An official rollback failure remains primary; fallback
cleanup cannot turn the run into PASS.

Before any fixture/server/browser side effect, the adapter takes an initial
`RepositoryGuard` snapshot including the exact screenshot manifest. After its
final cleanup and before returning, it takes the final snapshot and calls
`assertUnchanged` with only that run's exact 18 screenshot paths. The adapter
does not write or duplicate the shared report: `scripts/runtime-smoke.ts` emits
the final bounded JSON/Markdown report only after adapter and lifecycle cleanup.
A broad `_docs/_workflows/_smoke/task-547/` allowlist, an unlisted file or any
source/doc mutation fails the smoke.

The profile policy is reject-unknown and may branch only on bounded polling/auth
windows. Descriptor IDs/order/URLs/viewports/assertions, worker operations,
browser action plan, fixture/install behavior and cleanup proofs are byte-
semantically identical between `fast` and `certification`. No generated manifest
or smoke output determines task status.

The parent and this leaf freeze these two ordered scenario lists identically:

- `aurora-detail`: `aurora-route-resolution`, `aurora-entry-bindings`,
  `aurora-six-slug-eligibility`, `aurora-reference-lead`,
  `aurora-hero-art-geometry`, `aurora-reference-statistics`,
  `aurora-contact-cta`, `aurora-reference-assumptions`,
  `aurora-gallery-content`, `aurora-gallery-geometry`,
  `aurora-specification-geometry`, `aurora-seo`;
- `contact-form`: `contact-reference-fields-and-options`,
  `contact-reference-native-presentation`,
  `contact-reference-submit-note-success`, `contact-invalid-rejected`,
  `contact-nonce-contract`, `contact-captcha-policy`,
  `contact-internal-session-contract`, `contact-internal-api-key-contract`,
  `contact-internal-anonymous-rejected`, `contact-scoped-submission`,
  `contact-success-action`, `contact-controls-remain-visible`.

`publish-lifecycle-parity` owns ordered `publish-front-parity`,
`publish-lifecycle-order` and `installed-fixture-continuity`. It proves row 08's
material lifecycle state and that the installed fixture remains available for
rows 09..18; it does not own cleanup or rollback.

After row 18, one material suite-final cleanup proof records bounded digests for
all pre-registered markers/attached IDs and exact terminal arrays
`remainingSubmissionRows:[]` and `remainingTempArtifacts:[]`. It is accepted
only after set-based deletion, Form/Page mutation reset, exact-source rollback
and every zero/prior-state query pass. The adapter validates all cleanup receipts
before projecting safe aggregate scalars into `SmokeAdapterResult.cleanup`.

`contact-nonce-contract` freezes the real public write boundary as
`{missingStatus:400, alteredStatus:403, validStatus:200}`: a missing nonce is a
malformed request, while a valid-format nonce with a bad HMAC signature is
forbidden and must not be weakened to `400`.

`aurora-six-slug-eligibility` keeps the exact Aurora positive object described
above, including its material resolved canonical string. Each of
`/projekty/linea`, `/projekty/nova`, `/projekty/mono`, `/projekty/vista` and
`/projekty/calm` stores this exact material object:

```ts
{
  status: 404,
  resolverOutcome: "detail_not_found_before_metadata",
  resolvedDetailDocumentKeys: [],
  renderedProjectDetailRootSelectors: [],
  renderedProjectDetailBlockIds: [],
  installedProjectTitleMatches: [],
  installedProjectDetailCorpusMatches: [],
  dynamicDetailSeoTitleMatches: [],
  dynamicDetailSeoDescriptionMatches: [],
  canonicalHrefs: [],
}
```

Resolver instrumentation must return no detail document before metadata
construction, so `resolvedDetailDocumentKeys` is empty. The DOM scan covers the
complete closed renderer-owned project-detail root-selector registry and exact
block IDs `project-back-link`, `project-hero`, `project-hero-art`,
`project-statistics`, `project-contact-cta`, `project-assumptions` and
`project-gallery`; neither roots nor blocks may render. The installed-title scan
covers all six exact entry titles `Dom Aurora`, `Dom Linea`, `Dom Nova`,
`Dom Mono`, `Dom Vista` and `Dom Calm`. The closed corpus scan covers every
TASK-547-03-L01 source-backed project title/card/detail/stat/assumption string
plus every TASK-547-03-L02 static detail/CTA string. Dynamic SEO scans cover
every installed project's resolved detail title pattern and every exact fixture
`seoDescription`, not only Aurora's pair. Every match array and
`canonicalHrefs` must remain empty. Generic neutral not-found copy may exist.
Typed validator self-tests independently make each array nonempty and drift
`resolverOutcome`; every mutation must fail.

`aurora-hero-art-geometry` observes typed surface IDs, spans, measured nonzero
DOM rectangles and computed backgrounds equal to the resolved primary/secondary
theme values at desktop/tablet/mobile viewports. `aurora-contact-cta` observes
exactly `{label:"Chcę podobny dom",href:"/kontakt",
previousBlock:"project-statistics",nextBlock:"project-assumptions"}`.

The three scoped-internal-Form observations are exactly:

- `contact-internal-session-contract`:
  `{mount:"/admin/api/forms/:id/submissions",principal:"coherent-session",
  formSource:"scoped-internal-fixture",submissionAccess:"internal",
  permission:"forms:write",csrf:"valid",rateLimit:"admin_write",
  outcome:"accepted"}`;
- `contact-internal-api-key-contract`:
  `{mount:"/admin/api/forms/:id/submissions",principal:"api-key",
  formSource:"scoped-internal-fixture",submissionAccess:"internal",
  scope:"forms.submit",cookieCsrf:"not-applicable",rateLimit:"admin_write",
  outcome:"accepted"}`;
- `contact-internal-anonymous-rejected`:
  `{mount:"/admin/api/forms/:id/submissions",principal:"anonymous",status:401,
  formSource:"scoped-internal-fixture",submissionAccess:"internal",
  createdSubmissionIds:[]}`.

Their markers are registered before dispatch, accepted response IDs are
attached immediately, and final runtime proof includes zero rows for every registered
ID/marker. Suite-final cleanup deletes the scoped internal Form after its
submissions and proves both absent. Material expected/observed objects, not
boolean proxies, satisfy these assertions.

The `home-desktop-effects` scenario includes ordered assertion
`home-switcher-accessible-name` with kind `aria`; its target is the rendered
home selector `[role="tablist"]`, expected value is the exact material string
`Wybór stylu domu`, and observed value is read from the live accessibility/DOM
attribute and must equal that exact string rather than being inferred from
serialized Page JSON.

Descriptor rows 09..13 implement the five exact Form Design IDs, normalized
URLs, viewports and ordered assertion IDs in the Form Design browser segment.
Each has one distinct decoded PNG,
light/dark material computed-style/geometry/DOM/persistence observations and
empty console/page/failure arrays.

TASK-547-04-L01 hands off the five Page Editor product-flow IDs and viewports;
this leaf owns their table URLs and exact ordered assertion IDs:

- `page-editor-switcher-author-light`:
  `page-editor-switcher-control-value`, `page-editor-switcher-base-prop`,
  `page-editor-switcher-canvas-aria`,
  `page-editor-switcher-light-geometry`;
- `page-editor-switcher-tablet-reset`:
  `page-editor-tablet-base-prop-updated`,
  `page-editor-tablet-responsive-override-absent`,
  `page-editor-tablet-reset-key-absent`,
  `page-editor-tablet-reset-fallback-aria`;
- `page-editor-collection-cta-dark`:
  `page-editor-collection-control-value`,
  `page-editor-collection-card-link-preserved`,
  `page-editor-collection-cta-visibly-absent`,
  `page-editor-collection-dark-computed-contrast`;
- `page-editor-form-presentation-save-reload`:
  `page-editor-form-controls-values`, `page-editor-form-visible-preview`,
  `page-editor-form-save-reload-roundtrip`,
  `page-editor-form-runtime-contract`;
- `page-editor-publish-front-parity`:
  `page-editor-front-switcher-aria`,
  `page-editor-front-project-card-links-without-cta`,
  `page-editor-front-contact-presentation-and-success`,
  `page-editor-front-controls-visible`, `page-editor-front-mobile-geometry`,
  `page-editor-front-submission-registered`.

Descriptor rows 14..18 implement those assertions in the Page Editor browser
segment. They require five distinct decoded PNGs and light/dark, cross-device,
override/reset, save/reload and publish/front visible effects with empty
console/page/failure arrays.

## Sub-Tasks

- [x] Inventory the interrupted branch, finish acceptance-only tests and retain
  exact expected-current atomic cleanup plus all 18 frozen assertion sets.
- [x] Add only the exact owned `task-547` adapter/helper/test files above, the
  four-file static shared registration and focused tests; reuse TASK-552-04's
  dispatcher/server exports and all other shared platform loops.
- [x] Prove `fast` and `certification` have identical 01..18 descriptors,
  assertions and cleanup behavior, differing only in bounded polling/auth
  windows; retain `fast` as an optional feedback lane and run certification
  once as the final runtime gate.
- [x] Prepare non-terminal docs/changelog/task drafts, complete one dependency-
  shaped post-audit, remediate verified HIGH/MEDIUM findings and rerun only
  invalidated lenses/gates.
- [x] Run the final 18-scenario certification smoke and verify screenshots,
  zero console/page errors, exact rollback and set-based cleanup.
- [x] Confirm every TASK-547-01..05 leaf/parent is already terminal in descendant
  order; then terminalize TASK-547-07, this L01, TASK-547-06 and TASK-547.
  Keep the audited changelog 1260 file byte-identical, update only the task
  board/statistics and changelog-index row last, then run a read-only task-graph/
  closeout consistency pass.

## Testing Requirements

Run the shared runtime-smoke self-tests plus focused TASK-547 adapter,
descriptor/profile, worker-operation, cleanup-batch and browser-segment tests.
Descriptor tests must prove both profiles execute the exact same ordered 18 IDs,
URLs, viewports and assertions. CLI/registry tests must prove the exhaustive
suite/profile map accepts `task-547` with `fast` and `certification`, resolves the
fixed adapter, and rejects unsupported suite/profile pairs. Direct adapter tests
must inject a mismatched suite and each unsupported profile and prove rejection
before install, server or browser dispatch. Run the dependency-shaped acceptance tests and
the closure gates `bun --cwd core lint:types`, `bun --cwd core lint`,
`bun run lint:repo:types`, `bun run test`, `bun run precommit:check`,
`bun run gates:coderso`, `bun run scan:security:strict`, canonical generator
zero-diff and touched-file line counts. Do not replay unchanged completed lanes
after a harness-only correction.

Focused descriptor/plan tests must prove profile parity. The final runtime gate
is run once through the shared entry point:

- `bun scripts/runtime-smoke.ts run --suite task-547 --profile certification --session wf547final`.

The equivalent `fast` command remains available for optional development
feedback; it is not replayed immediately before certification because it would
repeat the same product proof.

Both execute all 18 scenarios. The adapter uses argv-only `playwright-cli`
through `BrowserTransport` and TASK-552-04's `PlaywrightCliDispatcher`, starts
the server only through its shared `startSupervisedServer(...)`/
`SupervisedServerResource` with `coderso-dev-core-host`, the exact bounded
environment projection and helper-owned lifecycle registration, polls health and
records cleanup through the shared lifecycle. Each profile performs one install for all
18 rows and one final cleanup/rollback. No retry occurs after non-idempotent
browser/DB dispatch.

Before every DB/settings test or dev command execute exactly, without
printing/copying/hashing/persisting the file or its values:

`set -a && source /home/coder/project/Coderso/.env && set +a`

Then verify `DATABASE_URL` reachability through a bounded connection probe that
logs only pass/fail. Every DB-targeted command has an explicit timeout of at
least 360,000 ms.
Run all three required DB-backed lanes explicitly and serially:

- `bun test --parallel=1 --timeout=360000
  tests/integration/kits/projektyDomowInstalledSite.test.ts`
- `bun test --parallel=1 --timeout=360000
  tests/integration/kits/projektyDomowInstalledAccessibility.test.ts`
- `bun test --parallel=1 --timeout=360000
  tests/integration/runtime/projekty-domow-detail-route.test.ts`

Root `bun run test` excludes `tests/integration/kits/`, so it does not replace
either installed-site command.

Closure order: non-terminal docs/changelog/task drafts → one dependency-shaped
post-audit → verified HIGH/MEDIUM remediation and affected regates → final
18-scenario certification smoke → terminal statuses/board/indexes → final
read-only graph consistency pass. Changelog 1260 stays Draft and unindexed until
this sequence passes.

## Documentation Updates Required

Sole writer for all shared TASK-547 documentation and closeout artifacts,
including exact guide path `docs/develop/full-site-packages.md`, shared runner
registration/docs and screenshots under `_docs/_workflows/_smoke/task-547/`.
The runner emits bounded JSON to stdout and Markdown to stderr; a durable
task-scoped receipt may be stored beside the screenshots when closure requires
it.
