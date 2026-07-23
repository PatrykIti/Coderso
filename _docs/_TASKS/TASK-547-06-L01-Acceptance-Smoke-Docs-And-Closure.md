# TASK-547-06-L01: Acceptance, Smoke, Docs and Closure
# FileName: TASK-547-06-L01-Acceptance-Smoke-Docs-And-Closure.md

**Parent Subtask:** TASK-547-06
**Priority:** High
**Category:** QA / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-547-05
**Status:** ⏳ To Do

## Overview

Own final acceptance-only tests, eight-flow Playwright CLI smoke, screenshots,
scenario manifest, shared docs, changelog 1260 and task closure.

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
await restartServer();
const result = await smokeEightRealFlows({ assertVisibleEffects:true, consoleErrors:0 });
await rollbackAndAssertPriorShell();
await writeEvidence(result);
```

Data flow: scoped install → gates → runtime restart → visible browser assertions →
cleanup/rollback → docs/changelog/task closure. Any skipped required lane, console
error, dirty cleanup, unresolved H/M or >1,000-line file blocks closure.

Regression/smoke in
`tests/integration/kits/projektyDomowInstalledSite.test.ts`: all eight routes,
distinct desktop/tablet/mobile shell and geometry, portfolio visible filter change,
Aurora bindings/registered-widget gradient/card gallery geometry, exact installed
`success_message` action plus real form validation/nonce/submission, reduced
motion, `lang="pl"` on Page/detail and publish/front parity.

## Sub-Tasks

- [ ] Add acceptance-only tests and run combined gates/security.
- [ ] Run exactly eight stable scenario identities and save at least one distinct
  screenshot per identity plus the manifest.
- [ ] Update docs/changelog/tasks/statistics and final drift evidence.

## Testing Requirements

All parent-required targeted/full commands, strict scan and Playwright CLI smoke.

## Documentation Updates Required

Sole writer for all shared TASK-547 documentation and closeout artifacts.
