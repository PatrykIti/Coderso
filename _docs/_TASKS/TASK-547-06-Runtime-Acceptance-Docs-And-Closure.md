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
real browser flows, publish documentation, then close the task family. This child
owns acceptance/smoke tests, shared docs, task/changelog and smoke evidence only;
TASK-547-01..05 retain exclusive ownership of their targeted tests.
The exact user/developer guide path owned here is
`docs/develop/full-site-packages.md`; do not create an alternate guide path.
The prior string-only manifest and its screenshots are invalid evidence; only the
final fresh `wf547smoke` run may replace them.
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
async function verifyInstalledFormaDomSite(ctx: SmokeContext): Promise<SmokeResult> {
  await ctx.verifyReferenceManifest(EXPECTED_REFERENCE_DIGEST);
  await ctx.runIsolatedAutomatedMatrix(FINAL_VALIDATION_COMMANDS);
  await ctx.assertPortsFree([3000, 5173, 5174]);
  const prior = await ctx.capturePriorSiteState();
  const cleanup = ctx.createOuterCleanupRegistry();
  let sourceRun: AppliedPackageRun | null = null;
  let primaryError: unknown;
  let cleanupErrors: unknown[] = [];
  let pendingEvidence: PendingSmokeEvidence | null = null;
  try {
    sourceRun = await ctx.applyPackageForBrowserSmoke();
    await ctx.restartServer("coderso-dev-core-host");
    await ctx.assertAdminAndFrontHealthy();
    const publicEvidenceDir =
      await cleanup.createAndRegisterTempEvidenceDir("wf547smoke");
    const formDesignEvidenceDir =
      await cleanup.createAndRegisterTempEvidenceDir("wf547formdesign");
    const pageEditorEvidenceDir =
      await cleanup.createAndRegisterTempEvidenceDir("wf547pageeditor");
    const submissionTracker = {
      beforeSubmit(source: SmokeSet, marker: string) {
        cleanup.registerSubmissionMarkerImmediately(source, marker);
      },
      onCreated(marker: string, submissionId: string) {
        cleanup.attachSubmissionIdImmediately(marker, submissionId);
      },
    };
    const scenarios = await runScenarios(FROZEN_EIGHT_REAL_FLOWS, {
      evidenceDir: publicEvidenceDir,
      submissionTracker,
    });
    const formDesign = await ctx.runFormDesignSmoke({
      session: "wf547formdesign",
      evidenceDir: formDesignEvidenceDir,
      submissionTracker,
    });
    const pageEditor = await ctx.runPageEditorSmoke({
      session: "wf547pageeditor",
      evidenceDir: pageEditorEvidenceDir,
      submissionTracker,
    });
    pendingEvidence = await ctx.validateAndFreezePreCleanupEvidenceBytes({
      scenarios, formDesign, pageEditor,
    });
  } catch (error) {
    primaryError = error;
  } finally {
    cleanupErrors = await ctx.runSequentialIndependentIdempotentCleanup([
      ...cleanup.submissions().map((submission) =>
        () => ctx.deleteSubmissionByIdAndMarkerIdempotently(submission)
      ),
      () => ctx.assertZeroRowsForRegisteredIdsAndMarkers(cleanup.submissions()),
      ...cleanup.tempEvidenceDirs().map((directory) =>
        () => ctx.removeTempEvidenceDirIdempotently(directory)
      ),
      () => ctx.assertZeroRegisteredTempEvidenceDirs(cleanup.tempEvidenceDirs()),
      () => ctx.rollbackExactSourceRun(sourceRun),
      () => ctx.assertPriorSiteStateEqual(prior),
      () => ctx.closePlaywrightSession("wf547smoke"),
      () => ctx.closePlaywrightSession("wf547formdesign"),
      () => ctx.closePlaywrightSession("wf547pageeditor"),
      () => ctx.stopServer("coderso-dev-core-host"),
    ]);
  }
  ctx.throwPrimaryErrorWithAllCleanupErrors(primaryError, cleanupErrors);
  await ctx.verifyReferenceManifest(EXPECTED_REFERENCE_DIGEST);
  const completeEvidence = ctx.attachAndValidateCleanStateReceipts(
    pendingEvidence, cleanup.receipts()
  );
  return ctx.writeEvidenceFromValidatedFrozenBytesAfterCleanEquality(
    completeEvidence
  );
}
```

**Data flow:** verify pinned reference digest → run every isolated/non-mutating
and self-cleaning automated command before the outer browser install → assert
ports 3000/5173/5174 are free → capture exact prior shell/settings → apply one
task-scoped package run → restart `coderso-dev-core-host` → separately verify
admin and public-front health → create and immediately register one fresh
task-owned temporary evidence directory for each of `wf547smoke`,
`wf547formdesign` and `wf547pageeditor` → before every submission register its
unique marker/source and immediately attach the returned submission ID before
the next assertion → capture the six-slug resolver outcome before metadata and
scan the complete closed detail-root/block, installed-title, source-corpus and
dynamic-SEO sets for every non-Aurora 404 → validate and freeze the three
pre-cleanup artifact/evidence sets as immutable in-memory bytes → independent
ordered `finally` cleanup
attempts → delete every
registered ID/marker independently and idempotently → prove zero matching rows →
remove every registered temporary evidence directory independently and
idempotently → prove zero such directories → rollback only the exact outer
source run → assert byte/value equality with every captured prior
shell/settings value → close all named browser sessions and stop the server →
attach the material zero-row/zero-temp/prior-state cleanup receipts and validate
the complete evidence. Evidence is atomically written from the frozen bytes only
after all cleanup/equality checks succeed; closeout follows final drift/
remediation and its invalidated-gate reruns.

**Error handling:** preserve the first test/smoke error, attempt every cleanup
step even when an earlier cleanup fails, then surface the primary error together
with every cleanup failure. Marker registration happens before dispatch and ID
attachment happens immediately after creation, so a lost response or later
assertion failure cannot orphan a row. Temporary-directory registration is part
of the create helper and completes before it returns. A failed deletion cannot
skip later deletions or either zero-state assertion. Any missing route, dangling
link, invisible effect, console/page error, failed submission security check,
dirty rollback, skipped required test, stale/corrupt screenshot, manifest drift
or >1,000-line touched file blocks evidence and closure.

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

## Required Smoke Scenarios

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
   all registered submission cleanup, all three temporary-evidence-directory
   cleanup and exact prior shell/settings restoration.

The manifest IDs and order equal the exact list above. Its root object has
exactly `{ reference, preflight, scenarios, consoleErrors, pageErrors,
screenshots, failures, pass }`. `reference` is exactly
`{ label:"projekty-domow-wow-site",
digest:"d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e" }`.
`preflight` is exactly `{ portsFree, restart, adminHealth, frontHealth }`, where
`portsFree` equals `{required:[3000,5173,5174],occupied:[]}`, `restart` equals
`{service:"coderso-dev-core-host",session:"wf547smoke",fresh:true}`,
`adminHealth` equals `{url:"http://127.0.0.1:5173/",status:200}` and
`frontHealth` equals `{url:"http://127.0.0.1:3000/",status:200}`.

Each scenario is an object with exactly `id`, `url`, `viewport`, `pass`,
`consoleErrors`, `pageErrors`, `screenshot` and `assertions`. Every assertion is
`{ id, kind, target, expected, observed, pass }`; `observed` must be a material
string, number, array or object, never a boolean proxy. Required assertion IDs
are scenario-specific and ordered. Every scenario and the root manifest have
empty `consoleErrors` and `pageErrors`; root `failures` is empty and `pass` is
true. Root `screenshots` is the exact ordered array of the same eight screenshot
records embedded in the scenarios, not independent mutable metadata.

Each screenshot record is exactly
`{ scenarioId, path, sha256, width, height }`; its hash and PNG dimensions must
match the file bytes. Save one fresh, byte-distinct PNG per scenario under
`_docs/_workflows/_smoke/task-547/screenshots/`. Assert computed styles, geometry,
DOM/ARIA state, content sets, persistence and visible result changes—not only
control presence or CSS-string emission. Snapshot each fixed path's pre-run
identity/hash, capture into a newly created empty task-owned temporary run
directory, and only after complete validation atomically replace the fixed
eight-PNG/manifest set. Every new identity/hash must differ from its predecessor
and every peer; touching an old file is not fresh. Fully decode every PNG and
require valid signature, chunk ordering, lengths/CRC, IHDR, at least one IDAT
and IEND; 25-byte signature/IHDR pseudo-images, corrupt images and mismatched
dimensions fail. Always remove the temporary directory in cleanup.

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
expected object names all three sources
`["wf547smoke","wf547formdesign","wf547pageeditor"]`, records every
pre-registered marker and attached ID, and has exact terminal arrays
`remainingSubmissionRows:[]` and `remainingTempEvidenceDirs:[]`. The receipt is
attached only after the outer `finally` has attempted every deletion and both
zero-state queries have passed.

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
independent of, and does not change, the exact eight public `wf547smoke`
scenario identities.

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

TASK-547-04-L01 freezes a second, independent five-flow editor contract under
`playwright-cli -s=wf547pageeditor`. Final acceptance reruns those exact ordered
IDs/URLs/viewports/assertions with five fresh decoded PNGs and proves both new
Page controls through light/dark, tablet/mobile, base-only override prevention,
reset, save/reload and publish/front visible effects. It does not alter the
eight public or five Form Design scenario identities.

## Sub-Tasks

- [ ] **TASK-547-06-L01** — acceptance matrix, eight-flow Playwright smoke,
  shared docs, changelog and closure.

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
- Playwright CLI smoke with exact named sessions `wf547smoke`,
  `wf547formdesign` and `wf547pageeditor`;
- exact session `playwright-cli -s=wf547smoke`, free-port preflight for
  3000/5173/5174, fresh `coderso-dev-core-host` restart and admin/front health
- exactly five parent-frozen Form Design flows under
  `playwright-cli -s=wf547formdesign`;
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

## Documentation Updates Required

Update all docs listed in the parent, add the example generation/install/rollback
guide at `docs/develop/full-site-packages.md`, changelog
`_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md`/index, task
statuses/board/statistics, and smoke manifest.
