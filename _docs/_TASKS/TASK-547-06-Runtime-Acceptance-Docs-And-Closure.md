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

## Security Contract

No endpoint or permission model changes. Validation must exercise the existing
internal Solution Kit auth/RBAC/CSRF boundary and the public Forms nonce,
rate-limit and optional CAPTCHA behavior. Smoke fixtures and screenshots must
contain no real PII or credentials.

## Implementation Pseudocode

```ts
async function verifyInstalledFormaDomSite(ctx: SmokeContext): Promise<SmokeResult> {
  await ctx.assertPortsFree([3000, 5173, 5174]);
  await ctx.restartServer();
  await ctx.assertHealthy(["http://127.0.0.1:3000/", "http://127.0.0.1:5173/"]);
  const scenarios = await runScenarios([
    verifyHomeEffectsAndReducedMotion,
    verifyAllRoutesAndDesktopNavigation,
    verifyTabletResponsiveGeometry,
    verifyMobileMenuAndResponsiveGeometry,
    verifyPortfolioFilterChangesVisibleResults,
    verifyAuroraDynamicDetailBindings,
    verifyContactValidationNonceAndSubmission,
    verifyPublishFrontParityAndShell,
  ]);
  return assertStructuredSmoke({ scenarios, consoleErrors: ctx.consoleErrors });
}
```

**Data flow:** capture exact prior shell/settings → clean scoped DB/site fixture →
package dry-run/apply → automated contract matrix → assert ports 3000/5173/5174
are free → restart `coderso-dev-core-host` → verify admin/front health →
`playwright-cli -s=wf547smoke` → assertions and screenshots → delete only the
submission bearing the task-scoped marker → rollback the exact source apply run →
assert byte/value equality with every captured prior shell/settings value → close
the named browser session and stop the server → final drift audit.

**Error handling:** any missing route, dangling link, invisible effect,
console/page error, failed submission security check, dirty rollback, skipped
required test, or >1,000-line touched file blocks closure.

**Regression-test shape:** assert exact resource counts and identities, repeat
apply noops, dynamic routes/data, filter result changes, form persistence and
cleanup, shell/settings restoration, SEO tags, reduced-motion and responsive
geometry. Assert the lifecycle contract by native capability: Page, entry,
detail and menu are staged then published; Form stores native
`status:"published"` directly; listing template has no status field; action
`enabled:true` is not mistaken for a form-level flag.

Static SEO emitted by TASK-547-04-L01 and dynamic Aurora SEO emitted by
TASK-547-03-L02 must survive TASK-547-04-L02 assembly byte-for-byte and be
observed at runtime here. Reference-backed public facts and strings must be
asserted alongside resource counts so a structurally valid but different theme
cannot pass.

### Acceptance Test Ownership

- Keep `tests/integration/kits/projektyDomowInstalledSite.test.ts` at its current
  985-line boundary; do not append. Extract new concerns into independently
  runnable focused files.
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
  Aurora route/data/SEO behavior.
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
   exact tablist accessible name `Wybór stylu domu`, visible CTA and
   reduced-motion behavior.
2. All eight public routes, exact static/dynamic SEO, `lang="pl"` and desktop
   header/footer link integrity.
3. Tablet viewport: nav mode, no overflow, asymmetric geometry, portfolio columns
   and form layout, with a distinct screenshot.
4. Mobile menu plus one-column responsive layouts.
5. Portfolio facet changes visible cards/count/URL and survives no-JS GET.
6. Aurora resolves through entry/detail bindings and native detail blocks with
   source-backed facts, gallery/spec geometry and exact dynamic SEO.
7. Contact rejects invalid data, uses nonce, stores one scoped submission and
   executes the installed `success_message` action visibly; clean it up afterwards.
8. Draft/publish-to-front parity, native lifecycle order, source-run rollback,
   scoped submission cleanup and exact prior shell/settings restoration.

The manifest IDs and order equal the exact list above. Each scenario is an object
with exactly `id`, `url`, `viewport`, `pass`, `consoleErrors`, `screenshot` and
`assertions`. Every assertion is
`{ id, kind, target, expected, observed, pass }`; `observed` must be a material
string, number, array or object, never a boolean proxy. Required assertion IDs
are scenario-specific and ordered. Every scenario and the root manifest have
zero console errors.

Each screenshot record is exactly
`{ scenarioId, path, sha256, width, height }`; its hash and PNG dimensions must
match the file bytes. Save one fresh, byte-distinct PNG per scenario under
`_docs/_workflows/_smoke/task-547/screenshots/`. Assert computed styles, geometry,
DOM/ARIA state, content sets, persistence and visible result changes—not only
control presence or CSS-string emission.

Required ordered assertion IDs are frozen per scenario:

- `home-desktop-effects`: `home-hero-geometry`, `home-header-appearance`,
  `home-interaction-effects`, `home-switcher-accessible-name`,
  `home-reduced-motion`;
- `all-routes-desktop-shell`: `all-public-routes-status`,
  `desktop-shell-links`, `public-seo-titles`, `public-document-language`;
- `tablet-responsive`: `tablet-no-horizontal-overflow`,
  `tablet-navigation-mode`, `tablet-asymmetric-layout`,
  `tablet-portfolio-columns`, `tablet-form-layout`;
- `mobile-navigation`: `mobile-menu-collapsed`, `mobile-menu-expanded`,
  `mobile-navigation-geometry`, `mobile-one-column-layouts`,
  `mobile-no-horizontal-overflow`;
- `portfolio-facets`: `portfolio-reference-order`,
  `portfolio-barn-visible-set`, `portfolio-eco-visible-set`,
  `portfolio-filter-url`, `portfolio-no-js-get`;
- `aurora-detail`: `aurora-route-resolution`, `aurora-entry-bindings`,
  `aurora-gallery-geometry`, `aurora-specification-geometry`, `aurora-seo`;
- `contact-form`: `contact-invalid-rejected`, `contact-nonce-contract`,
  `contact-captcha-policy`, `contact-scoped-submission`,
  `contact-success-action`;
- `publish-rollback`: `publish-front-parity`, `publish-lifecycle-order`,
  `rollback-source-run`, `prior-shell-settings-restored`,
  `scoped-submission-cleanup`.

Exact title proof is required for `/` (`Nowoczesne projekty domów — FormaDom
Studio`), `/oferta` (`Oferta — FormaDom Studio`), `/projekty` (`Projekty domów —
FormaDom Studio`), `/proces` (`Proces projektowy — FormaDom Studio`), `/cennik`
(`Cennik — FormaDom Studio`), `/o-nas` (`O nas — FormaDom Studio`), `/kontakt`
(`Kontakt — FormaDom Studio`) and `/projekty/aurora` (`Dom Aurora — projekt
pokazowy — FormaDom Studio`). Each uses the reference description
`Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy
proces projektowy.`

## Sub-Tasks

- [ ] **TASK-547-06-L01** — acceptance matrix, eight-flow Playwright smoke,
  shared docs, changelog and closure.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- all targeted Vitest and Bun suites named by TASK-547-01..05
- `bun run test`
- `bun run precommit:check`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- Playwright CLI smoke with exact named session `wf547smoke`
- exact session `playwright-cli -s=wf547smoke`, free-port preflight for
  3000/5173/5174, fresh `coderso-dev-core-host` restart and admin/front health
- all DB-targeted commands use an explicit timeout of at least 360,000 ms
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
`1260-YYYY-MM-DD-<task-547-slug>.md`/index, task
statuses/board/statistics, and smoke manifest.
