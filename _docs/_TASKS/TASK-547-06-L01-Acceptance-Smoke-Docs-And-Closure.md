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
`1260-YYYY-MM-DD-<task-547-slug>.md` and task closure.
The single guide artifact is `docs/develop/full-site-packages.md`.
The existing smoke manifest/screenshots are invalidated and remain untouched
until the final fresh smoke run replaces them as one evidence set.

The exact ordered IDs are `home-desktop-effects`,
`all-routes-desktop-shell`, `tablet-responsive`, `mobile-navigation`,
`portfolio-facets`, `aurora-detail`, `contact-form`, `publish-rollback`; tests
assert equality and order, not only count.

## Security Contract

No endpoint changes. Validate existing internal Solution Kit routes remain
unchanged and public form nonce/rate/CAPTCHA paths. Use fake scoped data and clean
submissions/resources; no secrets in screenshots/logs.

## Implementation Pseudocode

```ts
await applyScopedPackage();
await runAutomatedMatrix();
await assertPortsFree([3000, 5173, 5174]);
await restartServer("coderso-dev-core-host");
await assertAdminAndFrontHealthy();
const result = await smokeEightRealFlows({
  session:"wf547smoke", assertVisibleEffects:true, consoleErrors:0
});
await deleteOnlyTaskScopedSubmission();
await rollbackExactSourceRunAndAssertPriorShellValueEquality();
await closeSmokeSessionAndStopServer("wf547smoke");
await writeEvidence(result);
```

Data flow: capture prior shell/settings → scoped install → gates → free-port
preflight → fresh runtime restart/health → visible browser assertions in
`playwright-cli -s=wf547smoke` → delete only the task-scoped submission → rollback
the exact source apply run → prove exact prior shell/settings equality → close
session/server → docs/changelog/task closure. Any skipped required lane, console
error, dirty cleanup, unresolved H/M or >1,000-line file blocks closure.

Regression/smoke in
`tests/integration/kits/projektyDomowInstalledSite.test.ts`: all eight routes,
distinct desktop/tablet/mobile shell and geometry, portfolio visible filter change,
Aurora bindings/registered-widget gradient/card gallery geometry, exact installed
`success_message` action plus real form validation/nonce/submission, reduced
motion, `lang="pl"` on Page/detail and publish/front parity.
Pin native lifecycle evidence: staged-then-published Page/entry/detail/menu,
direct published Form status, no listing-template status, and `enabled:true`
only on the success-message action.
Prove static SEO from TASK-547-04-L01, dynamic detail SEO from TASK-547-03-L02
and their exact preservation by TASK-547-04-L02 at the public runtime boundary.

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

The smoke result contains eight ordered scenario objects. A scenario is exactly
`{ id, url, viewport, pass, consoleErrors, screenshot, assertions }`; an assertion
is exactly `{ id, kind, target, expected, observed, pass }` with a non-boolean,
material `observed` value. A screenshot is exactly
`{ scenarioId, path, sha256, width, height }` and must match the distinct PNG
bytes. The workflow validator owns scenario-specific required assertion IDs and
rejects missing, extra, reordered, shallow, stale or console-error-bearing
evidence. The canonical ID/kind/URL/viewport matrix lives only in
`_docs/_workflows/lib/task-547-smoke-contract.mjs`; this leaf produces evidence
against it and does not duplicate a looser validator.

The `home-desktop-effects` scenario includes ordered assertion
`home-switcher-accessible-name` with kind `aria`; its target is the rendered
home selector `[role="tablist"]`, expected value is the exact material string
`Wybór stylu domu`, and observed value is read from the live accessibility/DOM
attribute and must equal that exact string rather than being inferred from
serialized Page JSON.

## Sub-Tasks

- [ ] Add/finalize acceptance-only tests and run combined gates/security.
- [ ] Run exactly eight stable scenario identities and save at least one distinct
  screenshot per identity plus the manifest.
- [ ] Update docs/changelog/tasks/statistics and final drift evidence.

## Testing Requirements

All parent-required targeted/full commands, strict scan and Playwright CLI smoke
using exact session `wf547smoke`; assert ports 3000/5173/5174 are free before the
fresh `coderso-dev-core-host` restart and verify admin/front health. Every
DB-targeted command has an explicit timeout of at least 360,000 ms.
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
