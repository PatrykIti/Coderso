# TASK-547-06-L01: Acceptance, Smoke, Docs and Closure
# FileName: TASK-547-06-L01-Acceptance-Smoke-Docs-And-Closure.md

**Parent Subtask:** TASK-547-06
**Priority:** High
**Category:** QA / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-547-05
**Status:** 🚧 In Progress
**Validation:** All previous final-gate, smoke, cleanup and closure claims are
invalidated and await fresh evidence from the final working tree.

## Overview

Own final acceptance-only tests, the tracked root Playwright CLI harness,
exactly 18 standalone scenario/test pairs, 37 tracked evidence artifacts, shared
docs, changelog
`_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md` and
task closure.
The single guide artifact is `docs/develop/full-site-packages.md`.
All ignored `_docs/_workflows/_smoke/task-547/**` content is invalid historical
evidence and is never force-added. The final fresh run writes only the tracked
`_docs/PLAYWRIGHT/task-547-runtime-smoke/**` contract through the root CLI.
Acceptance first verifies logical reference label `projekty-domow-wow-site` and
aggregate ordered-manifest digest
`d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`;
neither the absolute main-repository path nor raw reference content enters
evidence.

The exact ordered registry is the parent's 01..18 list. Tests assert exact
number, ID, module/test/evidence path, session, normalized URL, viewport,
assertion list and order—not only count.

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
- tracked runner modules under `scripts/task-547-runtime-smoke/**`, including
  exact entrypoint `cli.ts`, shared `contracts.ts`, `playwrightCli.ts`,
  `browserHarness.ts`, `runScenario.ts`, `artifacts.ts`, `rootPort.ts`,
  `liveRootAdapter.ts`, `registry.ts`, `aggregate.ts`, and exactly 18
  `scenarios/NN-id.ts` modules;
- modular runner tests under
  `tests/unit/workflows/task547RuntimeSmoke/**`: focused
  `contracts.test.ts`, `playwrightCli.test.ts`, `browserHarness.test.ts`,
  `runScenario.test.ts`, `artifacts.test.ts`, `rootPort.test.ts`,
  `liveRootAdapter.test.ts`, `registry.test.ts`, `aggregate.test.ts`,
  `cli.test.ts`, plus exactly 18 `scenarios/NN-id.test.ts` files;
- exactly 37 tracked evidence files:
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/manifest.json` and, for each
  parent-frozen `NN-id`,
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/NN-id/result.json` plus
  `screenshot.png`;
- root integration surfaces `.gitignore`, `package.json` and `tests/README.md`,
  limited respectively to exact screenshot exception
  `!/_docs/PLAYWRIGHT/task-547-runtime-smoke/*/screenshot.png`, package aliases
  `task-547:smoke`/`task-547:smoke:test`, and runner documentation;
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

Before closure, TASK-547-07 retains phase-scoped ownership of its own contract
and ignored workflow libraries; its bridge invokes this tracked CLI directly and
does not duplicate the registry, browser lifecycle or evidence authoring.
TASK-547-04-L01 owns production contracts only and hands scenario IDs 14..18 to
this leaf. Internal Codex agents audit root-authored evidence only; no agent
authors or patches it. L01 must not edit any TASK-547-01..05 production or
targeted-test path.
Every repository path outside the exact list above is forbidden to this leaf.
The executable map in
`_docs/_workflows/lib/task-547-ownership.mjs` must equal this set and fail on
duplicates, missing paths or cross-leaf ownership.

## Security Contract

- **Visibility/endpoints:** add no route. Validate all existing internal admin
  `/admin/api/solution-kits*` read/plan/apply/rollback/run routes plus the one
  public write `POST /forms/:id/submissions`.
- **Auth/RBAC:** internal reads/plan require authenticated
  `solution-kits:read`; apply/rollback require authenticated
  `solution-kits:write`. Public contact submission is unauthenticated only for a
  currently published, `submissionAccess:"public"` form. Internal
  `POST /admin/api/forms/:id/submissions` accepts only a coherent session with
  `forms:write` or an API key with exact scope `forms.submit`; anonymous access
  is rejected.
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
  returned submission ID immediately, delete each registered ID/marker
  independently and idempotently, and prove zero scoped rows. Tracked cleanup
  evidence retains only bounded marker/ID digests and outcomes, never raw values.
  Expose no
  credentials, `.env` values, raw submission payload, absolute main-repository
  path or provider token in logs/screenshots/manifests.

## Official Rollback And Emergency Cleanup Contract

Normal cleanup calls the final
`rollbackFullSiteInstall({ sourceRunId, actorId, ledger })` for the exact apply
run and then proves the complete prior shell/settings raw state. Acceptance code
must not import `applySettingsBatch`, `restoreSettingsBatchRaw`, plain
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

## Implementation Pseudocode

```ts
export async function runOneScenario(
  root: RootSmokePort,
  scenario: RuntimeSmokeScenario,
): Promise<TrackedScenarioResult> {
  return root.withExclusiveTaskLock(async () => {
    await root.assertPortsFree([3000, 5173, 5174]);
    await root.closeSessionIfPresent(scenario.session);
    await root.assertNoSessionOrTempState(scenario);
    const prior = await root.capturePresenceAwareDatabaseAndSettings();
    const cleanup = root.createCleanupRegistry(scenario.id);
    let run: AppliedPackageRun | null = null;
    let installedExpected: FullSiteInstalledSnapshot | null = null;
    let frozen: FrozenPreCleanupEvidence | null = null;
    let finalStateDigest: string | null = null;
    let primaryError: unknown;
    const cleanupErrors: unknown[] = [];
    try {
      run = await root.applyFreshScenarioScopedPackage(scenario.id);
      installedExpected = await root.readDurableInstalledSnapshot(run);
      await root.startOnlyThroughCodersoDevCoreHost();
      await root.assertHealth({
        admin: "http://127.0.0.1:5173/",
        front: "http://127.0.0.1:3000/",
      });
      await root.openFreshSession(scenario.session, scenario.viewport);
      frozen = await scenario.arrangeActAssert({
        browser: root.argvOnlyPlaywrightCli({ noRetryAfterDispatch: true }),
        submissions: cleanup.registerBeforeDispatchAndAttachBeforeAssertion(),
      });
      await root.validateVisibleAssertionsAndDecodePng(frozen);
    } catch (error) {
      primaryError = error;
    } finally {
      await root.attemptEvery(cleanupErrors, [
        ...cleanup.deleteEverySubmissionIndependently(),
        () => cleanup.assertZeroSubmissionRows(),
        () => cleanup.removeAndAssertZeroTempArtifacts(),
        () => root.rollbackExactRunOrEmergencyAtomicCas({
          run, expectedCurrent: installedExpected, target: prior,
        }),
        () => root.assertDatabaseAndSettingsEqual(prior),
        () => root.closeSessionIfPresent(scenario.session),
        () => root.stopExactCodersoDevCoreHostProcess(),
        () => root.assertPortsFree([3000, 5173, 5174]),
        () => root.assertNoSessionOrTempState(scenario),
        async () => {
          finalStateDigest = await root.captureExactStateDigest();
          root.assertStateDigestEqual(finalStateDigest, prior.digest);
        },
      ]);
    }
    root.throwPrimaryWithCleanupAggregate(primaryError, cleanupErrors);
    return root.attachCleanupReceipt(frozen, {
      priorStateDigest: prior.digest,
      finalStateDigest: root.requireCapturedDigest(finalStateDigest),
    });
  });
}

export async function runSelection(
  root: RootSmokePort,
  selection: "all" | ScenarioNumber,
): Promise<void> {
  const runInitialStateDigest = await root.captureExactStateDigest();
  const staged = root.createBoundedInMemoryEvidenceSet();
  try {
    for (const scenario of root.registry.select(selection)) {
      staged.add(await runOneScenario(root, scenario));
    }
    await root.aggregate.assertExactOrderAndDigestChain(
      staged,
      runInitialStateDigest,
    );
    await root.artifacts.promoteTransactionalManifestLast(staged, selection);
  } finally {
    staged.wipe();
    await root.artifacts.removeAndAssertNoRunStaging();
  }
}
```

Data flow is complete per scenario, never per suite: exclusive lock → exact
preflight and prior digest → fresh scoped install → fresh helper-only server and
health → close/open the suite's fixed session → that module's own
arrange/act/assert → marker before dispatch and accepted ID before the next
assertion → material observations plus decoded PNG in staging → independent
ordered cleanup → exact rollback/CAS → zero rows/temp state → DB/settings
equality and identical final digest → exact session/server shutdown and free
ports → post-cleanup result. No retry is allowed after browser dispatch or any
mutation. Preserve the primary failure plus every cleanup failure; never promote
pre-cleanup or partial evidence.

`--all` stages all 18 clean results and promotes the rollback-protected
37-artifact set with `manifest.json` last. `--scenario 05` executes only module
05 and may replace only its `result.json`, `screenshot.png` and the aggregate;
the root snapshots and proves the other 17 pairs byte-identical. The aggregate
requires every scenario's prior/final digest and every adjacent
`final → prior` link to equal `runInitialStateDigest`, disproving hidden
predecessor state.

## Exact Modular Scenario Registry

| No. | ID | Session | Normalized URL | Viewport |
| --- | --- | --- | --- | --- |
| 01 | `home-desktop-effects` | `wf547smoke` | `http://127.0.0.1:3000/` | `1440x1000` |
| 02 | `all-routes-desktop-shell` | `wf547smoke` | `http://127.0.0.1:3000/` | `1440x1000` |
| 03 | `tablet-responsive` | `wf547smoke` | `http://127.0.0.1:3000/` | `1024x1366` |
| 04 | `mobile-navigation` | `wf547smoke` | `http://127.0.0.1:3000/` | `390x844` |
| 05 | `portfolio-facets` | `wf547smoke` | `http://127.0.0.1:3000/projekty` | `1440x1000` |
| 06 | `aurora-detail` | `wf547smoke` | `http://127.0.0.1:3000/projekty/aurora` | `1440x1000` |
| 07 | `contact-form` | `wf547smoke` | `http://127.0.0.1:3000/kontakt` | `1440x1000` |
| 08 | `publish-rollback` | `wf547smoke` | `http://127.0.0.1:3000/` | `1440x1000` |
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

Literal `{formId}`/`{pageId}` redactions are validated against the live installed
resource without persisting the raw ID. Every implementation file is
`scripts/task-547-runtime-smoke/scenarios/NN-id.ts`; every matching independent
test is
`tests/unit/workflows/task547RuntimeSmoke/scenarios/NN-id.test.ts`. A scenario
exports its own `arrange/act/assert`, supports direct `--self-test` and `--run`,
imports shared harness contracts but never another scenario, and may be fixed
and rerun without changing any peer.

`registry.ts` exports the only executable runtime descriptor projection as
`task547RuntimeRegistryProjection()`. The returned strict JSON value is exactly
`{schemaVersion:1,scenarios:[...]}`. Every ordered scenario row is exactly
`{number,id,session,url,viewport,assertions,modulePath,testPath,resultPath,
screenshotPath}`. `number` is the integer `1..18`; `url` is the normalized
string or string array above; `assertions` is the ordered non-empty array of
exact `{id,kind,target,expected}` semantic descriptors owned by that scenario.
All paths are literal repository-relative paths derived from the same row.
`expected` is JSON-safe and contains the complete typed expected value, not a
generic description or boolean proxy. The registry projection imports all
18 landed scenario descriptors but no browser, database, settings, server or
evidence-writing adapter.

Markdown freezes each scenario's assertion IDs/order and every explicitly
stated semantic constraint. At the registry phase, the tracked descriptor
becomes canonical for the complete `kind`, `target` and typed `expected`
values; its focused tests prove those values satisfy all frozen prose
constraints. The workflow does not invent missing tuple fields: it verifies
identity/session/URL/viewport/paths and assertion IDs/order against the task
contract, reject-unknown-validates every complete tuple, and then compares each
result assertion byte-semantically with that tracked registry descriptor.

The root CLI and ignored workflow validator canonicalize that projection by
recursively sorting object keys while preserving array order, then SHA-256 hash
the UTF-8 JSON. `manifest.json` contains that digest as `registryDigest`.
Before accepting evidence, the workflow loads the tracked export through one
bounded argv-only Bun import, validates all 18 rows under the split authority
above and the parent's identity/session table, and requires the same digest. No
workflow module owns or reconstructs another runtime ID/session/URL/assertion
list.

## Atomic Implementation Phases

The implementation workflow lands these 22 phases strictly in order:

1. `547-06-L01-acceptance-tests` owns only the ten acceptance/support paths
   listed in Exact Single-Writer Ownership.
2. `547-06-L01-smoke-framework` owns
   `scripts/task-547-runtime-smoke/{contracts.ts,playwrightCli.ts,browserHarness.ts,runScenario.ts,artifacts.ts,rootPort.ts,liveRootAdapter.ts}`
   and matching focused tests
   `tests/unit/workflows/task547RuntimeSmoke/{contracts.test.ts,playwrightCli.test.ts,browserHarness.test.ts,runScenario.test.ts,artifacts.test.ts,rootPort.test.ts,liveRootAdapter.test.ts}`.
3. `547-06-L01-smoke-01` through `547-06-L01-smoke-18` each own exactly one
   `scenarios/NN-id.ts` and its one `scenarios/NN-id.test.ts`, in number order.
4. `547-06-L01-smoke-registry` owns
   `scripts/task-547-runtime-smoke/{registry.ts,aggregate.ts}` and
   `tests/unit/workflows/task547RuntimeSmoke/{registry.test.ts,aggregate.test.ts}`.
5. `547-06-L01-integration` owns
   `scripts/task-547-runtime-smoke/cli.ts`,
   `tests/unit/workflows/task547RuntimeSmoke/cli.test.ts`, `.gitignore`,
   `package.json` and `tests/README.md`.

Each changed phase passes its exact focused test paths, line count and forbidden
path gate, then receives one atomic root-owned commit before the next phase.
Validated zero-delta phases record `validated-existing` without empty commits.
The final fresh 37-artifact evidence set is a separate root-owned atomic commit.

Regression/smoke in
`tests/integration/kits/projektyDomowInstalledSite.test.ts`: all eight routes,
distinct desktop/tablet/mobile shell and geometry, portfolio visible filter change,
Aurora bindings/registered-widget hero-art and gallery geometry, exact installed
`success_message` action plus real public and internal form validation/security/
submission, reduced motion, `lang="pl"` on Page/detail and publish/front parity.
The Form matrix proves coherent session + `forms:write` + valid CSRF +
`admin_write`, API key + `forms.submit` + no cookie-CSRF + `admin_write`, and
anonymous rejection without a row. Every accepted public/internal submission
created by the public, Form Design or Page Editor set is registered by unique
marker and returned ID, independently deleted and included in the final
zero-scoped-row assertion.
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

Each tracked `result.json` has exact root
`{ schemaVersion, scenario, reference, preflight, assertions, consoleErrors,
pageErrors, screenshot, cleanup, failures, pass }`. `scenario` is exact
`{number,id,session,url,viewport}`. Assertions remain
`{id,kind,target,expected,observed,pass}` with non-boolean material
observations. Screenshot metadata remains
`{scenarioId,path,sha256,width,height}` and must match a distinct, fully decoded
tracked PNG. Preflight includes prior digest, free ports, no predecessor
session/temp state, fresh scoped apply, helper-only restart and separate health
records. Cleanup includes digested submission identities, empty row/temp arrays,
exact rollback/CAS outcome, equal final digest, closed session, stopped helper
and free ports. Every console/page/failure array is empty.

The nested lifecycle roots are reject-unknown exact schemas. A passing
`preflight` is exactly:

```ts
{
  lock: {
    scope: "task-547-runtime-smoke";
    leaseDigest: Sha256;
    held: true;
  };
  attempt: {
    number: 1;
    retryAfterMutation: 0;
    retryAfterBrowserDispatch: 0;
  };
  ports: { required: [3000, 5173, 5174]; occupied: [] };
  session: { name: ExactScenarioSession; predecessorAbsent: true };
  temp: { scenarioId: ExactScenarioId; remaining: [] };
  priorStateDigest: Sha256;
  apply: {
    fresh: true;
    scoped: true;
    sourceRunDigest: Sha256;
    installedStateDigest: Sha256;
  };
  server: {
    helper: "coderso-dev-core-host";
    fresh: true;
    processIdentityDigest: Sha256;
  };
  health: {
    admin: { url: "http://127.0.0.1:5173/"; status: 200 };
    front: { url: "http://127.0.0.1:3000/"; status: 200 };
  };
}
```

A passing `cleanup` is exactly:

```ts
{
  priorStateDigest: Sha256;
  finalStateDigest: Sha256;
  submissionIdentityDigests: Array<{
    markerDigest: Sha256;
    attachedIdDigest: Sha256 | null;
    outcome: "deleted" | "not-created";
  }>;
  remainingSubmissionRows: [];
  remainingTempArtifacts: [];
  rollback: {
    sourceRunDigest: Sha256;
    officialOutcome: "restored";
    recoveryMode: "not-needed";
    expectedCurrentDigest: Sha256;
    targetPriorDigest: Sha256;
    casOutcome: "not-run";
  };
  settings: {
    priorDigest: Sha256;
    finalDigest: Sha256;
    presenceAware: true;
    equal: true;
  };
  database: {
    priorDigest: Sha256;
    finalDigest: Sha256;
    equal: true;
  };
  session: { name: ExactScenarioSession; closed: true };
  server: {
    helper: "coderso-dev-core-host";
    processIdentityDigest: Sha256;
    stopped: true;
  };
  ports: {
    required: [3000, 5173, 5174];
    free: [3000, 5173, 5174];
  };
  lock: { leaseDigest: Sha256; released: true };
}
```

The validator cross-binds the session, scenario, lock lease, helper process,
source run, installed expected state and every prior/final digest. The settings
and database prior/final digests must match, and the complete final state digest
must equal the preflight and manifest initial digest. An official rollback
failure may still run the expected-current atomic CAS to restore local state,
but that failure stays in the unpromoted failure aggregate; fallback cleanup
can never serialize the passing schema above.

`submissionIdentityDigests` contains at most 32 unique, marker-sorted rows per
scenario. An accepted write requires a non-null attached-ID digest and
`outcome:"deleted"`; a rejected dispatch requires
`attachedIdDigest:null` and `outcome:"not-created"`. Every registered marker is
represented exactly once, so rejected public/internal attempts are zero-row
proven without inventing a submission ID.

The tracked `registry.ts` is the executable canonical matrix; ignored TASK-547-07
workflow validators consume it and may not define a second weaker list. The
tracked aggregate contains the exact 01..18 order, result/PNG paths and hashes,
reference, `registryDigest`, `runInitialStateDigest`, prior/final digests,
failures and pass. A generic string/object plus `pass:true`, missing cleanup or
any timestamp/raw ID/secret/absolute path is invalid.

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

`publish-rollback` retains ordered `scoped-submission-cleanup`. It is a material
receipt whose expected object names only row 08 and session `wf547smoke`,
records bounded digests for row 08's own pre-registered markers and attached
IDs, and has exact terminal arrays `remainingSubmissionRows:[]` and
`remainingTempArtifacts:[]`. It is attached only after row 08's `finally`
attempts every deletion and both zero-state queries pass. Cross-row cleanup is
owned solely by `manifest.json`, which aggregates all 18 independent receipts
and proves the three session families; row 08 cannot depend on rows 09–18.

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

The three internal-contact observations are exactly:

- `contact-internal-session-contract`:
  `{mount:"/admin/api/forms/:id/submissions",principal:"coherent-session",
  permission:"forms:write",csrf:"valid",rateLimit:"admin_write",
  outcome:"accepted"}`;
- `contact-internal-api-key-contract`:
  `{mount:"/admin/api/forms/:id/submissions",principal:"api-key",
  scope:"forms.submit",cookieCsrf:"not-applicable",rateLimit:"admin_write",
  outcome:"accepted"}`;
- `contact-internal-anonymous-rejected`:
  `{mount:"/admin/api/forms/:id/submissions",principal:"anonymous",status:401,
  createdSubmissionIds:[]}`.

Their markers are registered before dispatch, accepted response IDs are
attached immediately, and final evidence includes zero rows for every registered
ID/marker. Material expected/observed objects, not boolean proxies, satisfy these
assertions.

The `home-desktop-effects` scenario includes ordered assertion
`home-switcher-accessible-name` with kind `aria`; its target is the rendered
home selector `[role="tablist"]`, expected value is the exact material string
`Wybór stylu domu`, and observed value is read from the live accessibility/DOM
attribute and must equal that exact string rather than being inferred from
serialized Page JSON.

Standalone modules 09..13 implement the five exact Form Design IDs, normalized
URLs, viewports and ordered assertion IDs from the parent under reused session
`wf547formdesign`, reset fresh per scenario. Each has one distinct decoded PNG,
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
  `page-editor-front-scoped-cleanup`.

Standalone modules 14..18 implement those assertions under reused session
`wf547pageeditor`, reset fresh per scenario. They require five distinct decoded
PNGs and light/dark, cross-device, override/reset, save/reload and publish/front
visible effects with empty console/page/failure arrays.

## Sub-Tasks

- [ ] Replace inherited weak cleanup with the exact expected-current atomic CAS
  path, correct the frozen reference-fidelity assertions, finalize modular
  acceptance-only tests and run combined gates/security.
- [ ] Land framework, 18 scenario/test pairs, registry and integration through
  their exact-path atomic phases; prove every scenario file and test independently
  runnable and every touched production/test file at most 1,000 lines.
- [ ] Prove `--scenario 05` isolation, `--all` transactional staging/promotion,
  exact 01..18 ordering, digest chaining and 37 tracked artifact paths.
- [ ] Prepare non-terminal docs/changelog/task drafts, complete all five
  independent post-audit lenses, remediate verified findings and rerun every
  invalidated dependency-shaped gate.
- [ ] Only after that clean pass, execute the root-owned composite
  `--all → --scenario 05 → --all` gate, commit the 37 verified evidence files,
  and keep internal agents read-only over evidence.
- [ ] Confirm every TASK-547-01..05 leaf/parent is already terminal in descendant
  order; then terminalize TASK-547-07, this L01, TASK-547-06 and TASK-547.
  Keep the audited changelog 1260 file byte-identical, update only the task
  board/statistics and changelog-index row last, then run a read-only task-graph/
  closeout consistency pass.

## Testing Requirements

`_docs/_workflows/lib/task-547-final-validation-contract.mjs` is the sole
executable ordered final-tree command manifest. Its self-test compares the
declared command set to every named TASK-547-01..05 targeted Vitest/Bun lane,
the three serial DB acceptance commands below, `bun --cwd core lint:types`,
`bun --cwd core lint`, `bun run lint:repo:types`, `bun run test`,
`bun run precommit:check`, `bun run gates:coderso`,
`bun run scan:security:strict`, workflow self-tests, canonical generator
zero-diff and baseline-to-final line counts. Missing, duplicate, reordered,
weakened-timeout or skipped commands fail before closure. Each command records
exact argv, start/end/exit status and redacted diagnostics; any post-gate
source/test/workflow/task fix invalidates and reruns its dependency-shaped
targets plus the complete final manifest.

Run every shared harness test and each of the 18 scenario tests independently.
In particular, executing
`bun test tests/unit/workflows/task547RuntimeSmoke/scenarios/05-portfolio-facets.test.ts`
must not import or execute any peer scenario. Also run:

- `bun scripts/task-547-runtime-smoke/cli.ts --self-test`;
- one root-owned preliminary `--all`, followed by
  `bun scripts/task-547-runtime-smoke/cli.ts --scenario 05` with before/after
  hashes proving the other 17 result/PNG pairs byte-identical and only 05's
  pair plus `manifest.json` promotable;
- final `bun scripts/task-547-runtime-smoke/cli.ts --all`, with all 18 full
  clean-room lifecycles and aggregate digest-chain validation;
- `git ls-files --error-unmatch` over all 18 scenario modules, 18 scenario tests
  and 37 exact evidence artifacts;
- baseline-to-final physical line counts over every touched production/test
  module, failing above 1,000.

The package aliases are exactly `task-547:smoke` →
`bun scripts/task-547-runtime-smoke/cli.ts` and `task-547:smoke:test` →
`bun test tests/unit/workflows/task547RuntimeSmoke`. The root CLI invokes
argv-only `playwright-cli`; it reuses exactly `wf547smoke`,
`wf547formdesign` and `wf547pageeditor` by suite but closes/opens the applicable
session for every scenario. No retry occurs after browser dispatch or mutation.
Each scenario independently asserts ports 3000/5173/5174 free, starts the server
only through `coderso-dev-core-host`, verifies admin/front health, and records
closed-session/stopped-process/free-port cleanup.

Before every DB/settings test or dev command execute exactly, without
printing/copying/hashing/persisting the file or its values:

`set -a && source /home/coder/project/Coderso/.env && set +a`

Each strict result includes the complete cleanup root. Only after every selected
scenario is clean does the trusted root promote its tracked evidence. Agents are
read-only reviewers. `--all` promotes the rollback-protected 37-file set with
`manifest.json` last; any torn set fails hash validation and is rolled back.

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

Closure order is immutable: non-terminal docs/changelog/task drafts → five
fresh independent internal-Codex post-audits → verified remediation and all
invalidated regates → one immutable-candidate root gate with preliminary
`--all`, isolated `--scenario 05` and final `--all` → atomic tracked evidence
commit → terminal statuses/board/indexes → final read-only graph consistency
pass.

## Documentation Updates Required

Sole writer for all shared TASK-547 documentation and closeout artifacts,
including exact guide path `docs/develop/full-site-packages.md`, the two package
aliases, runner docs, narrow evidence ignore exception and the 37 tracked
evidence paths. Never merge this worktree into `feat/implementations` here.
