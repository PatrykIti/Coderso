# TASK-547-06: Runtime Acceptance, Documentation and Closure
# FileName: TASK-547-06-Runtime-Acceptance-Docs-And-Closure.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Testing / Runtime Smoke / Documentation
**Estimated Effort:** Large
**Dependencies:** TASK-547-05
**Status:** 🚧 In Progress
**Validation:** The previous final-gate, post-audit and smoke evidence is
invalidated; the complete acceptance/cleanup cycle must be rerun on the final
working tree.

---

## Overview

Prove the complete installed package through dependency-shaped automated tests and
18 independently runnable real-browser scenarios, publish documentation, then
close the task family. This child owns acceptance tests, the tracked smoke runner,
shared docs, task/changelog and tracked smoke evidence only; TASK-547-01..05
retain exclusive ownership of their targeted tests and production contracts.
The exact user/developer guide path owned here is
`docs/develop/full-site-packages.md`; do not create an alternate guide path.
All ignored `_docs/_workflows/_smoke/task-547/**` files are invalid historical
evidence and are never force-added. Canonical executable scenarios live under
`scripts/task-547-runtime-smoke/scenarios/`; canonical evidence lives under
`_docs/PLAYWRIGHT/task-547-runtime-smoke/` and is tracked through a narrow
`.gitignore` exception.
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
  `/admin/api/solution-kits/runs/:runId`. Form writes exercised are public-site
  `POST /forms/:id/submissions` and internal
  `POST /admin/api/forms/:id/submissions` through the existing dual mount.
- **Authentication/RBAC:** every Solution Kit route requires an authenticated
  admin/API-key principal. List/detail/plan/run reads require
  `solution-kits:read`; apply/rollback require `solution-kits:write`. Public
  contact submission is unauthenticated only for the server-observed
  `status:"published"` plus `submissionAccess:"public"` form; internal mode
  instead requires a coherent admin session with `forms:write` or API-key scope
  `forms.submit`; anonymous access to the internal mount is rejected.
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
async function runScenarioInCleanRoom(
  ctx: RootSmokeContext,
  scenario: RuntimeSmokeScenario,
): Promise<TrackedScenarioResult> {
  return ctx.withExclusiveTaskLock(async () => {
    await ctx.assertPortsFree([3000, 5173, 5174]);
    await ctx.closeSessionIfPresent(scenario.session);
    await ctx.assertSessionClosed(scenario.session);
    await ctx.assertNoScenarioTempState(scenario.id);
    const prior = await ctx.capturePresenceAwareState();
    const cleanup = ctx.createScenarioCleanupRegistry(scenario.id);
    let pending: FrozenPreCleanupEvidence | null = null;
    let sourceRun: AppliedPackageRun | null = null;
    let installedExpected: FullSiteInstalledSnapshot | null = null;
    let finalStateDigest: string | null = null;
    let primaryError: unknown;
    const cleanupErrors: unknown[] = [];
    try {
      sourceRun = await ctx.applyFreshScopedPackage(scenario.id);
      installedExpected = await ctx.readInstalledSnapshotFromRun(sourceRun);
      await ctx.startOnlyThroughHelper("coderso-dev-core-host");
      await ctx.assertAdminAndFrontHealthy();
      await ctx.openFreshSession(scenario.session, scenario.viewport);
      const tracker = cleanup.submissionTracker({
        beforeDispatch: "register-marker",
        afterAcceptedResponse: "attach-id-before-next-assertion",
      });
      pending = await scenario.arrangeActAssert({
        ctx, tracker, noRetryAfterDispatch: true,
      });
      await ctx.captureAndFullyDecodePng(pending);
    } catch (error) {
      primaryError = error;
    } finally {
      await ctx.attemptEveryCleanupStep(cleanupErrors, [
        ...cleanup.submissionDeletions(),
        () => cleanup.assertZeroSubmissionRows(),
        () => cleanup.removeScenarioTempArtifacts(),
        () => cleanup.assertZeroTempArtifacts(),
        () => ctx.rollbackExactRunOrAtomicCas(sourceRun, installedExpected, prior),
        () => ctx.assertDatabaseAndSettingsEqual(prior),
        () => ctx.closeSessionIfPresent(scenario.session),
        () => ctx.stopExactHelperProcess("coderso-dev-core-host"),
        () => ctx.assertPortsFree([3000, 5173, 5174]),
        () => ctx.assertNoScenarioTempState(scenario.id),
        async () => {
          finalStateDigest = await ctx.captureExactStateDigest();
          ctx.assertStateDigestEqual(finalStateDigest, prior.digest);
        },
      ]);
    }
    ctx.throwPrimaryWithCleanupAggregate(primaryError, cleanupErrors);
    return ctx.attachCleanupAndFreezeResult(pending, {
      priorStateDigest: prior.digest,
      finalStateDigest: ctx.requireCapturedDigest(finalStateDigest),
    });
  });
}

async function runTrackedSmoke(
  ctx: RootSmokeContext,
  selection: "all" | ScenarioNumber,
): Promise<void> {
  await ctx.verifyReferenceManifest(EXPECTED_REFERENCE_DIGEST);
  const baseline = await ctx.captureExactStateDigest();
  const selected = ctx.registry.select(selection);
  const staged = ctx.createBoundedInMemoryEvidenceSet();
  try {
    for (const scenario of selected) {
      staged.add(await runScenarioInCleanRoom(ctx, scenario));
    }
    await ctx.assertDigestChain(staged, { runInitialStateDigest: baseline });
    await ctx.promoteEvidenceTransactionally(staged, selection);
  } finally {
    staged.wipe();
    await ctx.removeAndAssertNoRunStaging();
  }
}
```

**Data flow:** the trusted root CLI loads one registry entry, acquires the
exclusive TASK-547 lock, proves free ports/no named session/no scenario temp
state, captures a presence-aware DB/settings snapshot and digest, applies a fresh
scenario-scoped package, starts the server only through
`coderso-dev-core-host`, verifies admin/front health, opens the suite's exact
session fresh, then calls that scenario file's own `arrange/act/assert`. A
submission marker is registered before browser dispatch and an accepted ID is
attached before the next assertion. The root freezes visible observations and a
fully decoded PNG in staging, then `finally` deletes scoped rows, proves zero
rows/temp state, rolls back by exact source run with expected-current atomic CAS
fallback, proves byte/value DB/settings equality, closes the session, stops the
exact helper process and proves ports free. Only a result containing that clean
receipt may be promoted.

**Error handling:** no retry is allowed after browser dispatch or any mutation.
Preserve the first scenario failure, attempt every cleanup step independently,
and return it with every cleanup failure. Never promote partial or pre-cleanup
evidence. `--all` stages all 18 results and uses rollback-capable, manifest-last
promotion so readers see either the previous valid 37-file set or the complete
new one. `--scenario 05` may replace only scenario 05's result/PNG plus the root
manifest and must prove the other 17 result/PNG pairs byte-identical. Missing
routes, invisible effects, console/page errors, dirty cleanup, digest-chain
drift, corrupt PNGs or a >1,000-line touched production/test file block evidence
and closure.

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

### Tracked Smoke Ownership And Atomic Land Order

TASK-547-06-L01 is the sole tracked-smoke writer. Its implementation surface is
`scripts/task-547-runtime-smoke/**`; its modular tests are
`tests/unit/workflows/task547RuntimeSmoke/**`. It also owns the two package
aliases, `tests/README.md`, and only the narrow `.gitignore` exception needed to
track PNG evidence:
`!/_docs/PLAYWRIGHT/task-547-runtime-smoke/*/screenshot.png`. Canonical tracked
evidence is:

- `_docs/PLAYWRIGHT/task-547-runtime-smoke/manifest.json`;
- for every exact `NN-id` below,
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/NN-id/result.json` and
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/NN-id/screenshot.png`.

That is exactly 37 tracked evidence artifacts. Final validation uses
`git ls-files --error-unmatch` for all 18 scenario modules, all 18 matching
scenario test files and all 37 evidence files. TASK-547-04-L01 owns only its
production contracts and concise Page Editor handoff; TASK-547-07 owns only the
ignored workflow bridge that invokes this tracked CLI. Internal Codex agents may
audit root-authored results but never author or patch smoke evidence.

The implementation state machine exposes 22 exact-path, separately gated atomic
phases within this leaf:

1. `547-06-L01-acceptance-tests`;
2. `547-06-L01-smoke-framework`;
3. `547-06-L01-smoke-01` through `547-06-L01-smoke-18`, strictly in number
   order, each owning one scenario file plus only its matching test file;
4. `547-06-L01-smoke-registry`;
5. `547-06-L01-integration`.

The framework phase owns shared contracts, Playwright CLI adapter, browser
harness, scenario runner, artifacts, root-port and live-root adapter modules plus
their focused tests. Registry owns only registry/aggregate modules and tests.
Integration owns `cli.ts`, its test, aliases, runner docs and the narrow ignore
exception. Every changed phase is committed atomically after its focused gate;
a validated zero-delta phase records `validated-existing` without an empty
commit. The 37 evidence files land later in one dedicated fresh-evidence commit.

## Required Smoke Scenarios

The tracked registry is exactly:

| No. | Stable ID / standalone module basename | Session | URL | Viewport |
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

Each module is exactly
`scripts/task-547-runtime-smoke/scenarios/NN-id.ts`; its only scenario test is
`tests/unit/workflows/task547RuntimeSmoke/scenarios/NN-id.test.ts`. A scenario
owns its `arrange/act/assert`, imports shared framework modules but no other
scenario, supports direct `--self-test` and `--run`, and is independently
runnable by its matching test path. The three fixed session names are reused
sequentially by suite, but the root closes any predecessor and opens the exact
session fresh for every scenario.

Exact ordered IDs:
`home-desktop-effects`, `all-routes-desktop-shell`, `tablet-responsive`,
`mobile-navigation`, `portfolio-facets`, `aurora-detail`, `contact-form`,
`publish-rollback`.

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
   installed Form also proves the internal mount's exact matrix: coherent
   session plus `forms:write`, valid CSRF and `admin_write`; API key plus
   `forms.submit`, no cookie-CSRF and `admin_write`; anonymous rejection with
   no row. It executes `show-message-keep-form` visibly: the supporting note
   disappears, exact success appears and all controls remain visible. Clean
   every registered submission independently and prove zero matching rows.
8. Draft/publish-to-front parity, native lifecycle order, source-run rollback,
   all registered submission cleanup, scenario-temporary-state cleanup, exact
   prior shell/settings restoration and aggregate digest chaining.

Every scenario writes one strict root result after cleanup:
`{ schemaVersion, scenario, reference, preflight, assertions, consoleErrors,
pageErrors, screenshot, cleanup, failures, pass }`. `scenario` contains exact
`{ number, id, session, url, viewport }`; `reference` is exactly
`{label:"projekty-domow-wow-site",
digest:"d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e"}`.
`preflight` materially records the free-port set, absent predecessor session and
temp state, prior-state digest, fresh scoped apply, helper-only restart and both
health responses. `cleanup` materially records hashed marker/attached-ID pairs,
empty remaining-row/temp arrays, exact-source rollback outcome, equal prior/final
state digests, closed exact session, stopped exact helper process and free ports.
It is impossible to serialize a passing result before cleanup is complete.

Every assertion remains exactly
`{ id, kind, target, expected, observed, pass }`; `observed` is a material string,
number, array or object, never a boolean proxy. Required assertion IDs are
scenario-specific and ordered. Every result has empty `consoleErrors`,
`pageErrors` and `failures`, with `pass:true`. Evidence contains no timestamps,
raw database IDs, credentials, cookies, `.env` values, stored form payloads or
absolute paths.

Each screenshot record is exactly
`{ scenarioId, path, sha256, width, height }`; `path` is repository-relative and
points to that scenario's tracked `screenshot.png`. Hash and dimensions must
match fresh staged bytes. The validator fully decodes PNG signature, chunk
ordering, lengths/CRC, IHDR, at least one IDAT and IEND; pseudo-images, corrupt
images, duplicate peer bytes and mismatched dimensions fail. Assertions use
computed styles, measured geometry, DOM/ARIA state, content sets, persistence
and visible result changes—not only control presence or emitted CSS strings.

The tracked aggregate `manifest.json` is root-authored from verified result/PNG
bytes. It freezes the exact 01..18 order, relative paths/hashes, reference,
`runInitialStateDigest`, every scenario's `priorStateDigest` and
`finalStateDigest`, failures and pass. It rejects predecessor-state leakage
unless for every adjacent pair:
`scenario[N].cleanup.finalStateDigest ===
scenario[N+1].preflight.priorStateDigest === runInitialStateDigest`.
It also requires each scenario's prior and final digest to equal the same run
initial digest. Agents may review this aggregate but cannot write it.

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
- `publish-rollback`: `publish-front-parity`, `publish-lifecycle-order`,
  `rollback-source-run`, `prior-shell-settings-restored`,
  `scoped-submission-cleanup`.

`scoped-submission-cleanup` is a material clean-state receipt, not a boolean. Its
expected object names only row 08 and session `wf547smoke`, records bounded
digests for row 08's own pre-registered markers and attached IDs, and has exact
terminal arrays `remainingSubmissionRows:[]` and
`remainingTempArtifacts:[]`. Raw markers/IDs never enter tracked evidence. The
receipt is attached only after row 08's `finally` has attempted every deletion
and both zero-state queries have passed. Only `manifest.json` aggregates all 18
independent cleanup receipts and proves the three session families; row 08
cannot summarize or depend on rows 09–18.

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
- the installed Form's internal submission evidence is exactly
  `contact-internal-session-contract → {mount:"/admin/api/forms/:id/submissions",
  principal:"coherent-session",permission:"forms:write",csrf:"valid",
  rateLimit:"admin_write",outcome:"accepted"}`,
  `contact-internal-api-key-contract →
  {mount:"/admin/api/forms/:id/submissions",principal:"api-key",
  scope:"forms.submit",cookieCsrf:"not-applicable",rateLimit:"admin_write",
  outcome:"accepted"}`, and `contact-internal-anonymous-rejected →
  {mount:"/admin/api/forms/:id/submissions",principal:"anonymous",status:401,
  createdSubmissionIds:[]}`. The session and API-key submissions use distinct
  pre-registered markers; their returned IDs are attached immediately and both
  rows are deleted independently. The anonymous marker is also registered
  before dispatch and the zero-row assertion proves rejection created nothing;
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
acceptance rerun include five distinct `playwright-cli -s=wf547formdesign`
flows, each with zero console/page errors and a fresh screenshot:

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
`form-design-save-reload` and `form-design-publish-front`. This evidence is
owned by standalone modules 09..13 and is independent of the exact eight public
modules 01..08.

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
  `form-design-front-scoped-cleanup`.

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
  `page-editor-front-scoped-cleanup`.

Standalone modules 14..18 implement this list under exact session
`wf547pageeditor`, reset it fresh per scenario and produce five decoded PNGs.
They prove light/dark, tablet/mobile, base-only override prevention, reset,
save/reload and publish/front visible effects without taking production
ownership.

## Sub-Tasks

- [ ] **TASK-547-06-L01** — modular acceptance matrix, tracked root CLI, exactly
  18 standalone smoke scenario/test pairs, 37 tracked evidence artifacts, shared
  docs, changelog and closure.

## Testing Requirements

- execute and persist structured results for every ordered entry in
  `_docs/_workflows/lib/task-547-final-validation-contract.mjs`: all targeted
  TASK-547-01..05 Vitest/Bun lanes, `bun --cwd core lint:types`,
  `bun --cwd core lint`, `bun run lint:repo:types`, `bun run test`,
  `bun run precommit:check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, workflow contract self-tests, canonical
  generator zero-diff and baseline-to-final line counts;
- the manifest self-test fails on a missing, duplicate, reordered, weakened or
  non-executed command and the final drift fixer reruns the complete manifest
  after any source/test/workflow/task mutation;
- run every focused shared harness test and each of the 18 scenario test files
  independently; scenario test 05 must run without importing/executing 01..04 or
  06..18;
- a preliminary direct trusted-root
  `bun scripts/task-547-runtime-smoke/cli.ts --all` stages all 18 and promotes
  only after all clean lifecycle/digest-chain checks;
- next, `bun scripts/task-547-runtime-smoke/cli.ts --scenario 05` runs only
  `05-portfolio-facets`, may promote only its result/PNG plus `manifest.json`,
  and proves the other 17 evidence pairs byte-identical before and after;
- a final fresh direct trusted-root `--all` replaces the complete 37-artifact
  set and is the only run eligible for the evidence commit;
- every browser command uses exact argv-only `playwright-cli` operations and the
  scenario's suite session `wf547smoke`, `wf547formdesign` or
  `wf547pageeditor`; close/open is repeated per scenario;
- every scenario independently proves ports 3000/5173/5174 free, starts only
  `coderso-dev-core-host`, verifies admin/front health, and records exact
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
run five fresh independent post-audit lenses → remediate verified findings and
rerun every invalidated dependency-shaped gate → run one immutable-candidate
composite gate with preliminary `--all`, isolated `--scenario 05` and final
`--all` → commit the verified 37-file evidence set atomically → terminalize
TASK-547-07, this leaf, TASK-547-06 and TASK-547 in descendant order while the
audited changelog body stays byte-identical → run the final read-only
graph/closeout consistency pass. No terminal status or evidence commit may
precede the clean post-audits and fresh final smoke.

## Documentation Updates Required

Update all docs listed in the parent, add the example generation/install/rollback
guide at `docs/develop/full-site-packages.md`, changelog
`_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md`/index, task
statuses/board/statistics, package aliases/tests runner docs and tracked
`_docs/PLAYWRIGHT/task-547-runtime-smoke/manifest.json`. Update
`_docs/DATA_MODEL.md` so the text-backed install-ledger `resource_type` domain
retains the four legacy values and documents all ten full-site resource kinds;
no DDL migration is required.
