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

Own final acceptance-only tests, eight-flow Playwright CLI smoke, screenshots,
scenario manifest, shared docs, changelog
`_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md` and
task closure.
The single guide artifact is `docs/develop/full-site-packages.md`.
The existing smoke manifest/screenshots are invalidated and remain untouched
until the final fresh smoke run replaces them as one evidence set.
Acceptance first verifies logical reference label `projekty-domow-wow-site` and
aggregate ordered-manifest digest
`d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`;
neither the absolute main-repository path nor raw reference content enters
evidence.

The exact ordered IDs are `home-desktop-effects`,
`all-routes-desktop-shell`, `tablet-responsive`, `mobile-navigation`,
`portfolio-facets`, `aurora-detail`, `contact-form`, `publish-rollback`; tests
assert equality and order, not only count.

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
- public smoke manifest
  `_docs/_workflows/_smoke/task-547/smoke-result.json` and exactly eight PNGs
  under `_docs/_workflows/_smoke/task-547/screenshots/`, named by the eight
  public scenario IDs;
- Form Design manifest
  `_docs/_workflows/_smoke/task-547/form-design-smoke-result.json` and exactly
  `_docs/_workflows/_smoke/task-547/form-design-screenshots/form-design-author-light.png`,
  `form-design-author-dark.png`, `form-design-reset-mobile.png`,
  `form-design-save-reload.png`, and `form-design-publish-front.png` in that
  directory;
- Page Editor manifest
  `_docs/_workflows/_smoke/task-547/page-editor-smoke-result.json` and exactly
  the five PNGs named by TASK-547-04-L01's ordered scenario IDs under
  `_docs/_workflows/_smoke/task-547/page-editor-screenshots/`;
- ephemeral evidence staging only under
  `_docs/_workflows/_smoke/task-547/.tmp/`: one fresh empty run directory for
  each of `wf547smoke`, `wf547formdesign` and `wf547pageeditor`, created and
  registered atomically and absent after the outer cleanup;
- product/developer docs `_docs/SOLUTION_KITS.md`,
  `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/PAGE_MODEL.md`,
  `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md`,
  `docs/develop/README.md`, and
  `docs/develop/full-site-packages.md`;
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
and workflow libraries; it hands its final validated evidence/state to this
leaf. L01 must not edit any TASK-547-01..05 production or targeted-test path.
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
  independently and idempotently, and prove zero scoped rows. Expose no
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
await verifyPinnedReferenceDigest();
await runIsolatedAutomatedMatrixBeforeOuterInstall();
await assertPortsFree([3000, 5173, 5174]);
const prior = await captureFullSiteSettingsBatchRaw(SHELL_KEYS);
const cleanup = createOuterCleanupRegistry();
let sourceRun: AppliedPackageRun | null = null;
let installedShellExpected: readonly FullSiteRawSettingState[] | null = null;
let primaryError: unknown;
let cleanupErrors: unknown[] = [];
let pendingEvidence: PendingSmokeEvidence | null = null;
try {
  sourceRun = await applyScopedPackageForBrowserSmoke();
  installedShellExpected = await readInstalledShellTargetFromSourceEvidence(sourceRun);
  await restartServer("coderso-dev-core-host");
  await assertAdminAndFrontHealthySeparately();
  const publicEvidenceDir =
    await cleanup.createAndRegisterTempEvidenceDir("wf547smoke");
  const formDesignEvidenceDir =
    await cleanup.createAndRegisterTempEvidenceDir("wf547formdesign");
  const pageEditorEvidenceDir =
    await cleanup.createAndRegisterTempEvidenceDir("wf547pageeditor");
  const submissionTracker = {
    beforeSubmit: (source: SmokeSet, marker: string) =>
      cleanup.registerSubmissionMarkerImmediately(source, marker),
    onCreated: (marker: string, submissionId: string) =>
      cleanup.attachSubmissionIdImmediately(marker, submissionId),
  };
  const publicResult = await smokeEightRealFlows({
    session:"wf547smoke", evidenceDir:publicEvidenceDir,
    submissionTracker, visibleEffects:true,
  });
  const formDesignResult = await smokeFiveFormDesignFlows({
    session:"wf547formdesign", evidenceDir:formDesignEvidenceDir,
    submissionTracker, lightAndDark:true, visibleEffects:true,
  });
  const pageEditorResult = await smokeFivePageEditorFlows({
    session:"wf547pageeditor", evidenceDir:pageEditorEvidenceDir,
    submissionTracker, lightAndDark:true, visibleEffects:true,
  });
  pendingEvidence = await validateAndFreezePreCleanupEvidenceBytes(
    publicResult, formDesignResult, pageEditorResult
  );
} catch (error) {
  primaryError = error;
} finally {
  cleanupErrors = await runSequentialIndependentIdempotentCleanup([
    ...cleanup.submissions().map((submission) =>
      () => deleteSubmissionByIdAndMarkerIdempotently(submission)
    ),
    () => assertZeroRowsForRegisteredIdsAndMarkers(cleanup.submissions()),
    ...cleanup.tempEvidenceDirs().map((directory) =>
      () => removeTempEvidenceDirIdempotently(directory)
    ),
    () => assertZeroRegisteredTempEvidenceDirs(cleanup.tempEvidenceDirs()),
    () => rollbackExactSourceRunOrEmergencyAtomic({
      sourceRun, prior, installedShellExpected,
    }),
    () => assertPriorShellSettingsEqual(prior),
    () => closeSmokeSession("wf547smoke"),
    () => closeSmokeSession("wf547formdesign"),
    () => closeSmokeSession("wf547pageeditor"),
    () => stopServer("coderso-dev-core-host"),
  ]);
}
throwPrimaryErrorWithAllCleanupErrors(primaryError, cleanupErrors);
await verifyPinnedReferenceDigest();
const completeEvidence = attachAndValidateCleanStateReceipts(
  pendingEvidence, cleanup.receipts()
);
await writeEvidenceFromValidatedFrozenBytesAfterCleanupEquality(completeEvidence);
```

Data flow: verify reference manifest → isolated self-cleaning matrix → free-port
preflight → capture prior shell/settings → scoped outer install → fresh runtime
restart/health → immediately create/register one fresh temporary evidence
directory for each named smoke set → register every submission marker before
dispatch and attach its ID immediately after creation → capture the six-slug
resolver outcome before metadata and scan the complete closed detail-root/block,
installed-title, source-corpus and dynamic-SEO sets for every non-Aurora 404 →
visible browser assertions in all three named sessions → freeze validated
evidence bytes →
delete every registered submission independently/idempotently and prove zero
matching rows → remove every registered temporary directory independently/
idempotently and prove zero directories → officially roll back the exact source
run, using durable-expected-current atomic emergency cleanup only on failure →
prove exact prior shell/settings equality → close all three sessions/server
through guaranteed `finally` cleanup → preserve the primary failure plus every
cleanup failure → attach and validate material zero-row/zero-temp/prior-state
receipts → atomically write the frozen evidence only after clean equality →
final drift/regate → docs/changelog/task closure. Any skipped required lane,
console/page error, dirty cleanup, stale/corrupt evidence, unresolved H/M or
>1,000-line file blocks closure.

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

The public smoke result root is exactly
`{ reference, preflight, scenarios, consoleErrors, pageErrors, screenshots,
failures, pass }` with the parent-frozen reference and material port/restart/
admin-health/front-health records. It contains eight ordered scenario objects.
A scenario is exactly
`{ id, url, viewport, pass, consoleErrors, pageErrors, screenshot, assertions }`;
an assertion is exactly `{ id, kind, target, expected, observed, pass }` with a
non-boolean, material `observed` value. A screenshot is exactly
`{ scenarioId, path, sha256, width, height }` and must match the distinct,
fully decoded PNG bytes. Root `screenshots` repeats those exact eight records in
scenario order; every console/page/failure array is empty. The workflow
validator owns typed scenario-specific expected values and rejects missing,
extra, reordered, shallow, stale, corrupt or error-bearing evidence. A generic
string/object plus `pass:true` never satisfies a semantic assertion. The
executable canonical ID/kind/URL/viewport matrix lives in
`_docs/_workflows/lib/task-547-smoke-contract.mjs`; it must equal, not weaken,
the frozen task lists. This leaf produces evidence against that typed validator.

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
receipt whose expected object names
`["wf547smoke","wf547formdesign","wf547pageeditor"]`, records every
pre-registered marker and attached ID, and has exact terminal arrays
`remainingSubmissionRows:[]` and `remainingTempEvidenceDirs:[]`. It is attached
only after the outer `finally` attempts every deletion and both zero-state
queries pass.

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

The separate Form Design result implements the five exact IDs, normalized URLs,
viewports and ordered assertion IDs from the parent under session
`wf547formdesign`. It has exactly five fresh byte-distinct PNGs, light and dark
coverage, material computed-style/geometry/DOM/persistence observations and
empty console/page/failure arrays. The validator lives in the workflow contract,
not an agent-authored free-form manifest.

The separate Page Editor result implements TASK-547-04-L01's five exact IDs,
normalized URLs, viewports and ordered assertion IDs under session
`wf547pageeditor`. It likewise requires exactly five fresh decoded PNGs,
light/dark, cross-device, override/reset, save/reload and publish/front visible
effects with empty console/page/failure arrays.

## Sub-Tasks

- [ ] Replace inherited weak cleanup with the exact expected-current atomic CAS
  path, correct the frozen reference-fidelity assertions, finalize modular
  acceptance-only tests and run combined gates/security.
- [ ] Run exactly eight stable scenario identities and save at least one distinct
  screenshot per identity plus the manifest.
- [ ] Run exactly five Form Design scenario identities and save one distinct
  screenshot per identity plus the separate manifest.
- [ ] Run exactly five Page Editor scenario identities and save one distinct
  screenshot per identity plus the separate manifest.
- [ ] Prepare draft docs/changelog/task closeout, then complete final drift,
  remediation, invalidated-gate reruns and fresh evidence.
- [ ] Confirm every TASK-547-01..05 leaf/parent is already terminal in descendant
  order; then terminalize TASK-547-07 after final drift, this L01 after its
  evidence/docs, TASK-547-06, and finally TASK-547. Update board/statistics and
  changelog 1260 last, then run a read-only task-graph/closeout consistency pass.

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

Run all three Playwright CLI sessions exactly as frozen by the parent and
TASK-547-04-L01. Assert ports
3000/5173/5174 are free before the fresh `coderso-dev-core-host` restart and
verify admin/front health separately. Before every DB/settings test or dev
command execute exactly, without printing/copying/hashing/persisting the file or
its values:

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

## Documentation Updates Required

Sole writer for all shared TASK-547 documentation and closeout artifacts,
including exact guide path `docs/develop/full-site-packages.md`.
