# TASK-547-06: Runtime Acceptance, Documentation and Closure
# FileName: TASK-547-06-Runtime-Acceptance-Docs-And-Closure.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Testing / Runtime Smoke / Documentation
**Estimated Effort:** Large
**Dependencies:** TASK-547-05, TASK-552-04 shared dispatcher/server extraction
**Status:** ✅ Done
**Completed:** 2026-08-08
**Validation:** Final repository checks passed; certification session `wf547final`
passed 18/18 in 220.687 s with 18 PNGs, zero console errors and cleanup PASS.

---

## Overview

Prove the complete installed package through dependency-shaped automated tests
and 18 real-browser scenarios, publish documentation, then close the task
family. This child owns acceptance tests, the thin shared-runner suite adapter,
shared docs and task/changelog closure only; TASK-547-01..05 retain exclusive
ownership of their targeted tests and production contracts.
The exact user/developer guide path owned here is
`docs/develop/full-site-packages.md`; do not create an alternate guide path.
Fresh screenshots live under `_docs/_workflows/_smoke/task-547/`; structured
reports are emitted by the shared runner on stdout/stderr after cleanup.
Historical files do not prove the current candidate; the final shared-runner
report and observed command outcome are the acceptance evidence, not a tracked
generated ledger.
Acceptance fails closed unless the twelve-file logical reference
`projekty-domow-wow-site` still has aggregate ordered-manifest digest
`d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`.
The evidence records only that logical label and digest, never the main-repository
path or raw reference contents.

## Security Contract

- **Endpoint visibility:** this task adds no endpoint. Existing internal admin
  routes remain `/admin/api/solution-kits`, `/admin/api/solution-kits/:id`,
  `/admin/api/solution-kits/plan`, `/admin/api/solution-kits/:id/apply`,
  `/admin/api/solution-kits/:id/rollback`, `/admin/api/solution-kits/runs` and
  `/admin/api/solution-kits/runs/:runId`. Form writes use the existing shared
  executor at `POST /forms/:id/submissions` and its stripped-admin
  `/admin/api/forms/:id/submissions` alias; the Form's mode, not the mount,
  selects public versus internal authorization.
- **Authentication/RBAC:** every Solution Kit route requires an authenticated
  admin/API-key principal. List/detail/plan/run reads require
  `solution-kits:read`; apply/rollback require `solution-kits:write`. Public
  contact submission is unauthenticated only for the server-observed
  `status:"published"` plus `submissionAccess:"public"` form on either alias;
  internal mode on either alias requires a coherent admin session with
  `forms:write` or API-key scope `forms.submit`, and rejects anonymous access.
- **CSRF/rate limit:** every session-authenticated Solution Kit `POST`,
  including plan, apply and rollback, retains CSRF enforcement and the shared
  `admin_write` bucket; API-key auth follows its existing non-cookie policy.
  Public submission is not authorized by an admin cookie, is charged exactly
  once to `public_write`, and a cookie cannot bypass its public nonce/rate
  decision. Internal session submission requires valid cookie CSRF and
  `admin_write`; internal API-key submission uses no cookie-CSRF and still
  charges `admin_write`.
- **Strict validation and anti-abuse:** Solution Kit request schemas and the
  public/internal submission envelopes reject unknown keys. The public form
  accepts only declared server-side fields, requires the opaque server-minted
  `timestamp.signature` HMAC nonce bound to the form ID, rejects missing,
  altered, expired and cross-form nonces, and follows the configured optional
  reCAPTCHA v3 `public_write` policy. No package-specific bypass is allowed.
- **Evidence hygiene:** use fake task-scoped PII only. Screenshots, command
  results and manifests contain no credentials, provider keys, raw `.env`
  values, absolute main-repository path or stored submission payload.

## Implementation Pseudocode

```ts
import type { SmokeAdapter } from "./types";

export const task547Adapter: SmokeAdapter = {
  suiteId: "task-547",
  supportedProfiles: ["fast", "certification"],
  async run(context) {
    assertExactTask547Invocation(context.input); // suite + supported profile, before side effects
    const timingPolicy = task547TimingPolicy(context.input.profile); // timeouts only
    await verifyTask547ReferenceManifest(context.root, EXPECTED_REFERENCE_DIGEST);
    const screenshots = buildExactTask547ScreenshotManifest(context.input); // exact 18 PNGs
    const repositoryBefore = await context.repository.snapshot(screenshots.paths);
    const bun = await resolveExecutableOnPath("bun");
    const workers = await WorkerPool.create({
      root: context.root,
      executable: bun,
      supervisor: context.processes,
      registry: createTask547WorkerRegistry(),
      profiles: createTask547WorkerProfiles(),
      lifecycle: context.lifecycle,
    });
    const resources = createTask547ResourceSlots();
    let accepted: Task547AcceptedObservations | null = null;
    let primary: unknown = null;
    let cleanupProof: Task547CleanupProof | null = null;
    try {
      const fixture = await installTask547Fixture(workers); // one fixture for rows 01..18
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
      const plan = materializeTask547BrowserDispatchPlan(
        buildTask547BrowserActions(),
      ); // includes every bounded source-byte split
      const dispatcher = new PlaywrightCliDispatcher({
        context,
        session: context.input.session,
        workspace: resources.workspace.path,
        segments: task547PhysicalSegmentIds(plan),
      });
      resources.browser = new BrowserTransport(context.input.session, dispatcher);
      context.lifecycle.register(resources.browser);
      const observed = await runTask547BrowserPlan({
        browser: resources.browser,
        plan,
        workers,
        authTimeoutMs: timingPolicy.authTimeoutMs,
      });
      accepted = validateAll18Task547Scenarios(observed);
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
        ], // idempotent; shared lifecycle closes them safely again
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
    }); // exact SmokeAdapterResult shape
  },
};

// Add `task-547` to contracts.ts SUITE_IDS, cli.ts SUPPORTED_PROFILES,
// registry.ts ADAPTER_PATHS/descriptor map, and cli-registry.test.ts positives/negatives.
// Both profiles run the same plan; only bounded polling/auth windows differ.
```

**Data flow:** the shared CLI selects the statically registered `task-547`
adapter. Suite-local factories construct real shared primitives from
`RuntimeSmokeContext`: a lifecycle-registered `WorkerPool`,
`SupervisedServerResource`/`startSupervisedServer(...)` from
`scripts/runtime-smoke/server/supervised-server.ts`, `pollUntil`, and a
lifecycle-registered `BrowserTransport` backed by `PlaywrightCliDispatcher` from
`scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts`. These shared
exports land in TASK-552-04 and are imported rather than copied. One install
supplies every Form/Page identity used by ordered rows 01..18. Persistent bounded
workers and set-based DB operations replace one-process-per-query work. The
adapter validates all 18 scenario assertions internally, completes and proves
final cleanup, verifies repository snapshots, then returns only the bounded
`SmokeAdapterResult`; the shared entry point owns timing, process counters,
redaction and final `RuntimeSmokeReport`.

**Error handling:** the adapter's `finally` phase idempotently closes browser,
its lifecycle-registered private workspace, server, submission-cleanup,
scenario-reset and exact-run rollback resources,
retains every close/absence receipt, proves zero scoped rows/temp state and prior
DB/settings equality, and compares final to initial `RepositoryGuard` snapshots.
Only the exact derived suite screenshot paths are allowed to change. The shared
runner emits its bounded JSON/Markdown report on stdout/stderr after adapter and
global lifecycle cleanup; the adapter neither writes nor duplicates it. The
shared lifecycle safely closes those resources again and owns the worker close.
The primary execution failure outranks cleanup failures, but every failure is
retained and any one blocks a result. Missing routes, invisible effects,
console/page errors, dirty cleanup, corrupt PNGs, unexpected repository mutation
or a >1,000-line touched production/test file block closure. Do not add fixed
sleeps, a duplicate lifecycle, generated-ledger authority or an unimplemented
end-to-end resume claim.

**Regression-test shape:** assert exact resource counts and identities, repeat
apply noops, dynamic routes/data, filter result changes, form persistence and
cleanup, shell/settings restoration, SEO tags, reduced-motion and responsive
geometry. For each non-Aurora slug assert resolver not-found before metadata,
zero resolved document keys, zero closed detail roots/blocks, zero matches
across all installed titles/source-backed project corpus/dynamic detail SEO
titles and descriptions, and zero canonical hrefs; mutate each array and the
resolver outcome independently in typed validator self-tests. Assert the
lifecycle contract by native capability: Page, entry, detail and menu are
staged then published; Form stores native
`status:"published"` directly; listing template has no status field; action
`enabled:true` is not mistaken for a form-level flag.

Static SEO emitted by TASK-547-04-L01 and dynamic Aurora SEO emitted by
TASK-547-03-L02 must survive TASK-547-04-L02 assembly byte-for-byte and be
observed at runtime here. Reference-backed public facts and strings must be
asserted alongside resource counts so a structurally valid but different theme
cannot pass.

### Acceptance Test Ownership

- Keep `tests/integration/kits/projektyDomowInstalledSite.test.ts` at its current
  985-line boundary; do not append. Within that boundary it owns the installed
  Form's exact internal session/API-key/anonymous matrix and all marker/ID
  cleanup assertions; extract its existing cohesive setup to the support module
  rather than growing the file. Other new concerns use independently runnable
  focused files.
- Extract its cohesive scoped install/rollback fixture into
  `tests/integration/kits/projektyDomowInstalledTestSupport.ts`, then consume
  that support from both the existing suite and the new focused
  `tests/integration/kits/projektyDomowInstalledAccessibility.test.ts`. The
  focused suite applies the real package, calls the real `handlePublicRequest`
  for `/`, asserts the home tablist has exact accessible name
  `Wybór stylu domu`, and rolls back the exact source run while proving prior
  shell/settings equality. It uses an explicit 360,000 ms timeout.
- Add the already allocated
  `tests/integration/runtime/projekty-domow-detail-route.test.ts` for dynamic
  detail behavior: the exact six-slug positive/typed fail-closed objects,
  pre-metadata resolver outcome, all closed negative scan arrays, resolved
  Aurora canonical, typed visible hero-art geometry, exact CTA placement/link,
  body facts and dynamic SEO.
- Own the existing focused runtime suites
  `pages-runtime.test.ts`, `pages-runtime-blocks.test.ts`,
  `pages-runtime-listings.test.ts`, `pages-runtime-responsive.test.ts` and their
  `pages-runtime-test-support.ts` support module.
- Own `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx` for Bun-free
  render assertions. Every production/test module remains at most 1,000 physical
  lines and every extracted suite stays runnable in its owning lane.

### Shared Runtime-Smoke Ownership And Land Order

TASK-547-06-L01 is the sole TASK-547 smoke adapter writer. It owns exactly
`scripts/runtime-smoke/adapters/task-547.ts` and these suite-local modules:
`task-547/descriptors.ts`, `task-547/host.ts`,
`task-547/worker-operations.ts`, `task-547/fixture.ts`,
`task-547/cleanup.ts`, `task-547/workspace.ts`, `task-547/browser-segments.ts`,
`task-547/assertions.ts` and `task-547/output-manifest.ts`, all relative to
`scripts/runtime-smoke/adapters/`. It owns exactly the focused tests
`tests/unit/runtime-smoke/task547-adapter.test.ts`,
`task547-descriptors.test.ts`, `task547-host.test.ts`,
`task547-worker-operations.test.ts`, `task547-cleanup-batch.test.ts`,
`task547-workspace.test.ts`,
`task547-browser-segments.test.ts` and `task547-output-manifest.test.ts` under
`tests/unit/runtime-smoke/`. It statically registers suite `task-547` by editing exactly
`scripts/runtime-smoke/contracts.ts`, `scripts/runtime-smoke/cli.ts`,
`scripts/runtime-smoke/registry.ts` and
`tests/unit/runtime-smoke/cli-registry.test.ts`. No other adapter or runtime-smoke
test path is writable authority. The registration tests cover both
accepted profiles, the exhaustive suite/profile map, the fixed adapter path and
negative unsupported suite/profile pairs; the adapter itself rejects a
mismatched suite or profile before any fixture/server/browser side effect. It
must follow
`docs/develop/runtime-smoke-cookbook.md` and reuse the platform contracts rather
than owning another CLI, process manager, DB worker, Playwright loop, cleanup
loop or report format.

TASK-552-04 lands first and owns the extraction of
`scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts`
(`PlaywrightCliDispatcher`) and
`scripts/runtime-smoke/server/supervised-server.ts`
(`SupervisedServerResource`, `startSupervisedServer(...)`). TASK-547 imports
those exact exports; it must not copy the private loops from an existing adapter
or introduce suite-local dispatcher/server implementations.

`startSupervisedServer(context, spec)` owns lifecycle registration and resolves
the literal `coderso-dev-core-host` through its validated `PATH` projection to
one absolute executable before spawning it. TASK-547 must not register the
returned resource again. It reuses the shared exact
`CODERSO_DEV_HOST_ENVIRONMENT_POLICY`; no TASK-547 environment projector or
ambient spread is permitted. Blank required values and NUL fail before spawn,
non-allowlisted ambient keys are ignored, and `MEDIA_STORAGE`/`MEDIA_DIR` are
deliberately rejected so the host consumes the authoritative persisted storage
configuration. Tests and reports record key names and redacted presence only,
never values.

Land the remaining acceptance tests first, then the suite descriptors/adapter,
then static registration and focused adapter/registry tests, and finally docs and
closure. Each changed unit gets typecheck, lint, its owning tests and a line-
count gate. A clean completed unit is not replayed after an unrelated later
failure. Screenshots are written under `_docs/_workflows/_smoke/task-547/` for
review; the shared bounded report remains the command's stdout/stderr receipt. A
strict screenshot-manifest builder derives the exact 18 screenshot paths for the
validated profile/session; the repository guard allows only those exact paths,
never the directory prefix. Generated smoke output is not a task-state ledger
and is not counted as a fixed tracked-artifact closure gate.

## Required Smoke Scenarios

The suite descriptor order is exactly:

| No. | Stable scenario ID | Logical group | URL | Viewport |
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

The `wf547*` labels are descriptor metadata only. They never become dispatcher
segment IDs or separate Playwright sessions. The suite uses only
`context.input.session`; it materializes and byte-splits the browser plan first,
then passes the exact resulting `segment-NNNN` and any `-part-NN` IDs to
`PlaywrightCliDispatcher.segments`.

These are strict TASK-547 descriptors consumed by the thin shared-runner
adapter. They may be split into cohesive suite-local modules, but they do not
own another process, browser, DB, cleanup or report loop. The adapter groups
them into the public, Form Design and Page Editor browser segments and relies on
the shared lifecycle to isolate browser state. Both supported profiles retain
this exact order, IDs, URLs, viewports and assertions. One installed fixture is
kept through the whole ordered plan; no segment performs a second install or
rolls back the source run before row 18 completes.

Exact ordered IDs:
`home-desktop-effects`, `all-routes-desktop-shell`, `tablet-responsive`,
`mobile-navigation`, `portfolio-facets`, `aurora-detail`, `contact-form`,
`publish-lifecycle-parity`.

1. Home desktop: material hero geometry, header appearance, interaction effects,
   exact source hero text/facts, all three ordered style controls and their
   changed visible panel values, exact tablist accessible name
   `Wybór stylu domu`, visible CTA and reduced-motion behavior.
2. All eight public routes, exact static/dynamic SEO, `lang="pl"` and desktop
   header/footer link integrity; every route uses the exact shared description
   and source-backed route H1/lead rather than structurally valid substitute
   copy.
3. Tablet viewport: nav mode, no overflow, asymmetric geometry, portfolio columns
   and form layout, with a distinct screenshot.
4. Mobile menu plus one-column responsive layouts.
5. Portfolio proves all five ordered controls, the exact six-card default
   order/copy/destinations, no visible per-card CTA, each of the four category
   result sets/counts, URL reset and no-JS GET parity.
6. The exact six-slug matrix proves Aurora resolves through entry/detail
   bindings at 200 with exact body, title, description and canonical URL, while
   Linea, Nova, Mono, Vista and Calm each return 404 without Aurora body/title/
   description/canonical leakage. Aurora visibly renders its typed primary/
   secondary hero-art surfaces and responsive geometry, exact lead, four
   ordered statistics, `Chcę podobny dom` linking to `/kontakt`, assumptions
   and three-card gallery sequence/geometry in the required public order, plus
   exact dynamic SEO.
7. Contact proves the exact ordered prototype fields, placeholders, four
   nonblank stage options with first/default `Mam działkę`, five textarea rows,
   Polish pending label, submit/note/success copy plus the native consent;
   rejects invalid data, missing/altered nonce and configured CAPTCHA failures,
   Public-site, Form Design and Page Editor flows register every unique
   submission marker before dispatch and every returned ID immediately. The
   installed public Form proves both mount aliases retain public nonce/CAPTCHA/
   `public_write` behavior. A separate scoped `submissionAccess:"internal"`
   Form proves coherent session plus `forms:write`, valid CSRF and `admin_write`;
   API key plus `forms.submit`, no cookie-CSRF and `admin_write`; anonymous
   rejection with no row. It executes `show-message-keep-form` visibly: the supporting note
   disappears, exact success appears and all controls remain visible. Project
   each submission is registered for the single suite-final set-based cleanup,
   which later projects per-item logical receipts and proves zero matching rows.
8. Draft/publish-to-front parity and native lifecycle order while the exact
   source run remains installed. This row proves the installed Form/Page
   identities are still available to rows 09..18; it performs no rollback,
   settings restoration or suite cleanup.

The suite-local validator owns the bounded assertion observations needed to
prove the ordered IDs below. Each observation has a material string, number,
array or object—not a boolean proxy—and is checked before the adapter returns.
The adapter then projects only the real `SmokeAdapterResult` contract:
`scenarios` contains `{id,pass,elapsedMs}`, `screenshots` contains relative
`{path,sha256}`, `consoleErrors` is empty, and `cleanup` contains safe scalar
proofs such as restored prior state and zero scoped rows/temp artifacts. The
shared entry point adds timings, process counters, snapshot count, lifecycle
cleanup and failures in `RuntimeSmokeReport`, with final redaction and the 1 MiB
bound.

Screenshot paths live under `_docs/_workflows/_smoke/task-547/`. The exact
screenshot manifest lists each allowed PNG; a directory-prefix allowlist is
forbidden. Before projection the suite validates fresh bytes, dimensions and
complete PNG decode; pseudo-images, corrupt images, duplicate peer bytes or
viewport mismatches fail. The suite also validates the fixed reference digest,
shared supervised-server start, health checks, exact-source rollback and
prior/final state equality before returning `pass:true`. Initial and final
repository snapshots must differ only at the exact screenshot-manifest paths.
Reports contain no raw database IDs, credentials, cookies, `.env` values, stored
form payloads or absolute paths. Assertions use computed styles, measured
geometry, DOM/ARIA state, content sets, persistence and visible result changes—not
only control presence or emitted CSS strings.

Required ordered assertion IDs are frozen per scenario:

- `home-desktop-effects`: `home-hero-geometry`, `home-header-appearance`,
  `home-reference-copy-and-facts`, `home-switcher-control-order`,
  `home-switcher-visible-states`, `home-interaction-effects`,
  `home-switcher-accessible-name`, `home-reduced-motion`;
- `all-routes-desktop-shell`: `all-public-routes-status`,
  `desktop-shell-links`, `public-route-headings-and-leads`,
  `public-seo-titles`, `public-seo-description`,
  `public-document-language`;
- `tablet-responsive`: `tablet-no-horizontal-overflow`,
  `tablet-navigation-mode`, `tablet-asymmetric-layout`,
  `tablet-portfolio-columns`, `tablet-form-layout`;
- `mobile-navigation`: `mobile-menu-collapsed`, `mobile-menu-expanded`,
  `mobile-navigation-geometry`, `mobile-one-column-layouts`,
  `mobile-no-horizontal-overflow`;
- `portfolio-facets`: `portfolio-control-order`,
  `portfolio-reference-order`, `portfolio-card-destinations`,
  `portfolio-no-visible-card-cta`, `portfolio-barn-visible-set`,
  `portfolio-villa-visible-set`, `portfolio-single-visible-set`,
  `portfolio-eco-visible-set`, `portfolio-filter-url-reset`,
  `portfolio-no-js-get`;
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
  `contact-success-action`, `contact-controls-remain-visible`;
- `publish-lifecycle-parity`: `publish-front-parity`,
  `publish-lifecycle-order`, `installed-fixture-continuity`.

Suite-final cleanup is intentionally not a row-08 assertion. After row 18, one
material cleanup proof records bounded digests for every pre-registered
submission marker/attached ID from rows 01..18 and exact terminal arrays
`remainingSubmissionRows:[]` and `remainingTempArtifacts:[]`; raw markers/IDs
never enter the report. The adapter then resets temporary Form/Page mutations to
the durable installed snapshot, invokes exact-source rollback once, verifies
presence-aware prior shell/settings equality and retains every receipt. It
projects only safe aggregate scalars into `SmokeAdapterResult.cleanup` after the
proof passes.

`contact-nonce-contract` freezes the real public write boundary as
`{missingStatus:400, alteredStatus:403, validStatus:200}`: a missing nonce is a
malformed request, while a valid-format nonce with a bad HMAC signature is
forbidden and must not be weakened to `400`.

Exact title proof is required for `/` (`Nowoczesne projekty domów — FormaDom
Studio`), `/oferta` (`Oferta — FormaDom Studio`), `/projekty` (`Projekty domów —
FormaDom Studio`), `/proces` (`Proces projektowy — FormaDom Studio`), `/cennik`
(`Cennik — FormaDom Studio`), `/o-nas` (`O nas — FormaDom Studio`), `/kontakt`
(`Kontakt — FormaDom Studio`) and `/projekty/aurora` (`Dom Aurora — projekt
pokazowy — FormaDom Studio`). Each uses the reference description
`Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy
proces projektowy.`

### Fail-Closed Reference Fidelity Matrix

The semantic smoke validator owns typed expectations, not generic
`pass:true` evidence. It rejects missing/extra/reordered values and freezes at
least these material public structures:

- home hero H1
  `Dom, który wygląda jak przyszłość — i czuje się jak Ty.`, blueprint facts
  `Concept 07 / Modern Barn`, `142 m²`, `3 / warianty układu`, `21 dni /
  koncepcja`, `96% / światło dzienne`, and ordered switcher transitions
  `Nowoczesna stodoła → Modern Barn`, `Miejska willa → Urban Villa`,
  `Dom eko → Eco Soft`, including each complete L01-owned visible description;
- portfolio controls
  `Wszystkie`, `Nowoczesna stodoła`, `Wille`, `Parterowe`,
  `Energooszczędne`; default cards
  `Dom Aurora|142 m² · stodoła · eko|/projekty/aurora`,
  `Dom Linea|188 m² · miejska willa|/projekty`,
  `Dom Nova|121 m² · parterowy|/projekty`,
  `Dom Mono|156 m² · czarna elewacja|/projekty`,
  `Dom Vista|206 m² · willa z patio|/projekty`,
  `Dom Calm|98 m² · kompaktowy|/projekty`; category visible sets are
  `barn:[Dom Aurora,Dom Mono]`, `villa:[Dom Linea,Dom Vista]`,
  `single:[Dom Nova,Dom Calm]` and
  `eco:[Dom Aurora,Dom Nova,Dom Vista]`;
- contact ordered prototype fields/placeholders
  `Imię i nazwisko|Jan Kowalski`,
  `E-mail|jan@email.pl`,
  `Na jakim jesteś etapie?`,
  `Krótki opis|Napisz, jaki dom Ci się marzy, gdzie jest działka i jaki styl
  lubisz.`; the stage select has exactly the four nonblank ordered options
  `Mam działkę`, `Szukam działki`, `Mam gotowy projekt do adaptacji`,
  `Chcę tylko konsultację`, with first/default `Mam działkę` and no blank
  prompt; the textarea has exactly five rows; pending submit shows
  `Wysyłanie...`; the only extra public field is native required consent
  `Zgoda na kontakt w sprawie zapytania`; submit is `Wyślij brief`,
  initial note is `Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez
  zobowiązań i bez sprzedażowej presji.`, and success is `Dziękujemy! Odezwiemy
  się z pierwszym pomysłem na Twój dom — do usłyszenia.`;
- a separately created scoped `submissionAccess:"internal"` Form supplies
  internal submission evidence exactly as
  `contact-internal-session-contract → {mount:"/admin/api/forms/:id/submissions",
  principal:"coherent-session",formSource:"scoped-internal-fixture",
  submissionAccess:"internal",permission:"forms:write",csrf:"valid",
  rateLimit:"admin_write",outcome:"accepted"}`,
  `contact-internal-api-key-contract →
  {mount:"/admin/api/forms/:id/submissions",principal:"api-key",
  formSource:"scoped-internal-fixture",submissionAccess:"internal",
  scope:"forms.submit",cookieCsrf:"not-applicable",rateLimit:"admin_write",
  outcome:"accepted"}`, and `contact-internal-anonymous-rejected →
  {mount:"/admin/api/forms/:id/submissions",principal:"anonymous",status:401,
  formSource:"scoped-internal-fixture",submissionAccess:"internal",
  createdSubmissionIds:[]}`. The session and API-key submissions use distinct
  pre-registered markers; their returned IDs are attached immediately and both
  logical rows join one bounded set-based cleanup with per-ID receipts. The
  anonymous marker is also registered before dispatch and the zero-row assertion
  proves rejection created nothing.
  Suite-final cleanup deletes the scoped internal Form after its submissions and
  proves both gone;
- `aurora-six-slug-eligibility` observes one exact keyed object. Aurora has
  `status:200`, exact title
  `Dom Aurora — projekt pokazowy — FormaDom Studio`, exact description
  `Nowoczesne projekty domów, architektura indywidualna, wizualizacje i
  kompleksowy proces projektowy.`, and canonical equal to
  `new URL("/projekty/aurora", capturedInstalledPublicOrigin).href`. The final
  smoke records the captured origin materially as `http://127.0.0.1:3000` and
  records the resolved canonical URL string, without hardcoding a production
  FormaDom domain. Each of `/projekty/linea`, `/projekty/nova`,
  `/projekty/mono`, `/projekty/vista` and `/projekty/calm` stores this exact
  material object:

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
  construction, so `resolvedDetailDocumentKeys` is empty. The DOM scan covers
  the complete closed renderer-owned project-detail root-selector registry and
  exact block IDs `project-back-link`, `project-hero`, `project-hero-art`,
  `project-statistics`, `project-contact-cta`, `project-assumptions` and
  `project-gallery`; neither roots nor blocks may render. The installed-title
  scan covers all six exact entry titles `Dom Aurora`, `Dom Linea`, `Dom Nova`,
  `Dom Mono`, `Dom Vista` and `Dom Calm`. The closed corpus scan covers every
  TASK-547-03-L01 source-backed project title/card/detail/stat/assumption string
  plus every TASK-547-03-L02 static detail/CTA string. Dynamic SEO scans cover
  every installed project's resolved detail title pattern and every exact
  fixture `seoDescription`, not only Aurora's pair. Every match array and
  `canonicalHrefs` must remain empty. Generic neutral not-found copy may exist.
  Typed validator self-tests independently make each array nonempty and drift
  `resolverOutcome`; every mutation must fail;
- Aurora body lead is `Nowoczesna stodoła z wysoką strefą dzienną, dużym
  przeszkleniem od ogrodu i spokojną elewacją z drewna oraz grafitowej blachy.`;
  ordered statistics are `142 m²|powierzchnia`, `4|sypialnie`,
  `2|łazienki`, `A++|standard energii`. The typed
  `aurora-hero-art-geometry` expectation contains exactly
  `hero-art-main` with desktop/tablet/mobile spans `8/12/12`, `minHeight:"xl"`
  and computed background equal to the resolved `--color-primary`, plus
  `hero-art-accent` with spans `4/12/12`, `minHeight:"xl"` and computed
  background equal to resolved `--color-secondary`; live nonzero DOM rectangles
  prove side-by-side desktop and stacked tablet/mobile surfaces. The exact
  `aurora-contact-cta` observation is
  `{label:"Chcę podobny dom",href:"/kontakt",
  previousBlock:"project-statistics",nextBlock:"project-assumptions"}`.
  Assumptions are exactly the three TASK-547-03-L01 fixture values
  `Strefa dzienna|Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i
  ukryta spiżarnia.`, `Strefa prywatna|Sypialnia master z garderobą, trzy pokoje
  oraz kompaktowa strefa pracy.`, and `Elewacja|Drewno, grafit, ciepłe światło i
  proste detale bez zbędnych ozdobników.` They are bound into the document by
  TASK-547-03-L02; TASK-547-03-L03 only aggregates and preserves that child
  slice. Gallery sequence is exactly `tall`, `default`, `warm`, without captions
  or media IDs.

Every one of the twelve pinned inputs has a named acceptance consumer:

| Reference | Acceptance consumer |
| --- | --- |
| `README.md` | logical provenance label/digest and no expanded scope |
| `index.html` | home content/facts/switcher, route SEO and geometry |
| `oferta.html` | exact L01 offer heading/lead/sections/links |
| `projekty.html` | five controls, six cards, category sets and destinations |
| `proces.html` | exact L01 heading/lead/five steps/CTA |
| `cennik.html` | exact L01 three packages/prices/items/links |
| `o-nas.html` | exact L01 approach/value/role-only team copy |
| `kontakt.html` | contact page, field/option/note/contact-card copy |
| `projekt-aurora.html` | Aurora facts, assumptions, gallery and dynamic SEO |
| `assets/app.js` | visible switcher/menu/form state transitions and exact success |
| `assets/styles.css` | source-informed palette, responsive/material geometry and declared visual residuals |
| `assets/favicon.svg` | verified reference-only asset plus exact `favicon-not-installed` residual |

The validator compares public runtime observations to these structures and the
complete TASK-547-03/04 source matrices. It separately records native security,
accessibility, URL/no-JS filtering and the seven declared approximations; those
adaptations cannot replace reference parity or authorize invented facts.

### Form Design UI Runtime Acceptance

Because TASK-547-03-L03 changes a real admin editor, its leaf gate and the final
acceptance rerun include five distinct flows in logical segment
`wf547formdesign` through the one task-scoped shared-CLI session, each with zero
console/page errors and a fresh screenshot:

1. in light mode author nested `theme.submit.supportingText` and prove the exact
   value appears in both Form canvas and runtime preview after the submit
   control;
2. in dark mode change the value and prove visible text, computed color/contrast
   and runtime-preview placement rather than control presence;
3. clear/reset the value from a mobile-width preview and prove the nested key,
   preview node and emitted public bytes are all absent;
4. save, navigate away/back and reload to prove persisted round trip, cache
   hydration and dirty-state protection do not lose or overwrite the value;
5. publish and submit through the public front to prove the authored note is
   visible initially, exact success replaces it, controls remain visible and
   admin/public values agree.

The exact five IDs are `form-design-author-light`,
`form-design-author-dark`, `form-design-reset-mobile`,
`form-design-save-reload` and `form-design-publish-front`. Their descriptors are
rows 09..13 and remain independent of the exact eight public descriptors 01..08.

The first four scenarios use normalized evidence URL
`http://127.0.0.1:5173/admin/advanced/forms/{formId}`; `{formId}` is a literal
redaction token whose live value must independently resolve to the installed
`project-brief` form. The fifth uses
`http://127.0.0.1:3000/kontakt`. Ordered viewports are
`1440x1000`, `1440x1000`, `390x844`, `1440x1000`, `1440x1000`.
Exactly five fresh, byte-distinct, fully decoded PNGs are required. Ordered
assertion IDs are:

- `form-design-author-light`: `form-design-light-control-value`,
  `form-design-light-canvas-text`, `form-design-light-preview-text`,
  `form-design-light-placement`;
- `form-design-author-dark`: `form-design-dark-control-value`,
  `form-design-dark-preview-text`, `form-design-dark-computed-contrast`,
  `form-design-dark-placement`;
- `form-design-reset-mobile`: `form-design-reset-control-empty`,
  `form-design-reset-persisted-key-absent`,
  `form-design-reset-preview-node-absent`,
  `form-design-reset-public-bytes-absent`,
  `form-design-reset-mobile-geometry`;
- `form-design-save-reload`: `form-design-save-persisted-value`,
  `form-design-save-navigation-roundtrip`,
  `form-design-save-reload-roundtrip`,
  `form-design-dirty-state-protection`;
- `form-design-publish-front`: `form-design-front-initial-note`,
  `form-design-front-success-message`,
  `form-design-front-controls-visible`,
  `form-design-front-admin-public-parity`,
  `form-design-front-submission-registered`.

### Page Editor UI Runtime Acceptance

TASK-547-04-L01 hands off the five Page Editor product-flow IDs and viewports
without taking smoke ownership. This child freezes their normalized URLs in the
01..18 table and these exact ordered assertion IDs:

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

Descriptor rows 14..18 implement this list in the Page Editor browser segment
and produce five decoded PNGs. They prove light/dark, tablet/mobile, base-only
override prevention, reset, save/reload and publish/front visible effects
without taking production ownership.

## Sub-Tasks

- [x] **TASK-547-06-L01** — modular acceptance matrix, thin shared-runner
  adapter for all 18 scenarios, focused adapter/descriptor tests, shared docs,
  changelog and closure.

## Testing Requirements

- run dependency-shaped TASK-547-01..05 tests only where the resumed inventory or
  a verified finding shows unfinished/changed work, plus the closure gates
  `bun --cwd core lint:types`, `bun --cwd core lint`, `bun run lint:repo:types`,
  `bun run test`, `bun run precommit:check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, canonical generator zero-diff and touched-file
  line counts;
- run the shared runtime-smoke self-tests plus focused TASK-547 adapter,
  descriptor, cleanup-batch and browser-segment tests; include positive
  `task-547` fast/certification registration plus wrong-suite,
  wrong-profile and unsupported suite/profile negative tests in
  `tests/unit/runtime-smoke/cli-registry.test.ts` and the adapter lane;
- prove with focused descriptor/plan tests that `fast` executes the same ordered
  18 scenarios and assertions as certification; only bounded polling/auth
  windows differ, and keep `fast` available as an optional feedback lane;
- run one mandatory final
  `bun scripts/runtime-smoke.ts run --suite task-547 --profile certification --session wf547final`;
- prove that each profile performs one install, executes ordered rows 01..18 on
  that fixture, then completes one final idempotent submission/reset/rollback
  phase, verifies every cleanup receipt and accepts only exact screenshot
  repository mutations before returning its adapter result;
- every browser command uses argv-only `playwright-cli` through the shared
  TASK-552-04 `PlaywrightCliDispatcher`; server ownership uses the shared
  `SupervisedServerResource`/`startSupervisedServer(...)` with only
  `coderso-dev-core-host`, the exact bounded inherited-environment projection and
  helper-owned lifecycle registration, polls admin/front health and records
  session/server/port cleanup;
- before every DB/settings test or dev command execute exactly
  `set -a && source /home/coder/project/Coderso/.env && set +a`, without
  printing/copying/hashing/persisting the file or values, then perform a bounded
  pass/fail-only `DATABASE_URL` reachability probe;
- all DB-targeted commands run serially with an explicit timeout of at least
  360,000 ms;
- `bun test --parallel=1 --timeout=360000
  tests/integration/kits/projektyDomowInstalledSite.test.ts`
- `bun test --parallel=1 --timeout=360000
  tests/integration/kits/projektyDomowInstalledAccessibility.test.ts`
- `bun test --parallel=1 --timeout=360000
  tests/integration/runtime/projekty-domow-detail-route.test.ts`

These three serial DB-backed lanes are explicit closure gates; root
`bun run test` does not own `tests/integration/kits/` and therefore cannot
substitute for either installed-site command.

Closeout ordering is strict: prepare non-terminal docs/changelog/task drafts →
run one dependency-shaped post-audit with the relevant independent lenses →
remediate verified HIGH/MEDIUM findings and rerun only affected lenses/gates →
run the final 18-scenario shared certification smoke → terminalize TASK-547-07,
this leaf, TASK-547-06 and TASK-547 in descendant order → update board/changelog
indexes → run the final read-only graph/closeout consistency pass. Changelog
1260 stays Draft and unindexed until this sequence passes.

## Documentation Updates Required

Update all docs listed in the parent, add the example generation/install/rollback
guide at `docs/develop/full-site-packages.md`, changelog
`_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md`/index, task
statuses/board/statistics and shared runner docs. Save screenshots under
`_docs/_workflows/_smoke/task-547/`; retain the shared runner's bounded report as
the command receipt. Update
`_docs/DATA_MODEL.md` so the text-backed install-ledger `resource_type` domain
retains the four legacy values and documents all ten full-site resource kinds;
no DDL migration is required.
