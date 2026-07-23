# TASK-547-06: Runtime Acceptance, Documentation and Closure
# FileName: TASK-547-06-Runtime-Acceptance-Docs-And-Closure.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Testing / Runtime Smoke / Documentation
**Estimated Effort:** Large
**Dependencies:** TASK-547-05
**Status:** ⏳ To Do

---

## Overview

Prove the complete installed package through dependency-shaped automated tests and
real browser flows, publish documentation, then close the task family. This child
owns acceptance/smoke tests, shared docs, task/changelog and smoke evidence only;
TASK-547-01..05 retain exclusive ownership of their targeted tests.

## Security Contract

No endpoint or permission model changes. Validation must exercise the existing
internal Solution Kit auth/RBAC/CSRF boundary and the public Forms nonce,
rate-limit and optional CAPTCHA behavior. Smoke fixtures and screenshots must
contain no real PII or credentials.

## Implementation Pseudocode

```ts
async function verifyInstalledFormaDomSite(ctx: SmokeContext): Promise<SmokeResult> {
  await ctx.restartServer();
  await ctx.assertHealthy(["/", "/admin"]);
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
  return assertCleanRuntime({ scenarios, consoleErrors: ctx.consoleErrors });
}
```

**Data flow:** clean scoped DB/site fixture → package dry-run/apply → automated
contract matrix → server restart → Playwright CLI named session → assertions and
screenshots → form/entry/install rollback cleanup → final drift audit.

**Error handling:** any missing route, dangling link, invisible effect,
console/page error, failed submission security check, dirty rollback, skipped
required test, or >1,000-line touched file blocks closure.

**Regression-test shape:** assert exact resource counts and identities, repeat
apply noops, dynamic routes/data, filter result changes, form persistence and
cleanup, shell/settings restoration, SEO tags, reduced-motion and responsive
geometry.

## Required Smoke Scenarios

Exact ordered IDs:
`home-desktop-effects`, `all-routes-desktop-shell`, `tablet-responsive`,
`mobile-navigation`, `portfolio-facets`, `aurora-detail`, `contact-form`,
`publish-rollback`.

1. Home desktop: hero, switcher, reveal/tilt/spotlight and visible CTA.
2. All eight public routes and desktop header/footer link integrity.
3. Tablet viewport: nav mode, no overflow, asymmetric geometry, portfolio columns
   and form layout, with a distinct screenshot.
4. Mobile menu plus one-column responsive layouts.
5. Portfolio facet changes visible cards/count/URL and survives no-JS GET.
6. Aurora resolves through entry/detail bindings and registered-widget
   gradient/card gallery/spec geometry.
7. Contact rejects invalid data, uses nonce, stores one scoped submission and
   executes the installed `success_message` action visibly; clean it up afterwards.
8. Publish-to-front parity, reduced-motion behavior, and prior shell restoration
   after rollback.

The manifest IDs and order equal the exact list above. Save distinct screenshots and a durable manifest under
`_docs/_workflows/_smoke/task-547/`. Assert computed styles, geometry, DOM/ARIA
state and visible result changes—not only control or CSS-string presence.

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
- Playwright CLI smoke with named task session

## Documentation Updates Required

Update all docs listed in the parent, add the example generation/install/rollback
guide, changelog 1260/index, task statuses/board/statistics, and smoke manifest.
