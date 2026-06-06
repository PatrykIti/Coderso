# TASK-407-07-L02: Basic Live Playwright E2E
# FileName: TASK-407-07-L02-Basic-Live-Playwright-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Playwright E2E
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L01
**Status:** ✅ Done
**Completed:** 2026-06-06

---

## Overview

Validate Basic site-builder intake creation through the real admin UI as a slightly
nontechnical user, then verify the public runtime output.

## Sub-Tasks

- Restart `coderso-dev-core-host`.
- Use `playwright-cli` against `http://coderso-b.localhost:5175/admin/`.
- Start with a beginner prompt such as a user who does not know CMS concepts and
  wants a full service website.
- Complete Basic intake questions, review, dry-run, execute, and public runtime
  checks on `http://coderso-b.localhost:3001/`.
- Verify desktop/mobile layout, nav/footer, contact path, SEO basics, and
  console/page errors.

## Security Contract

- Endpoint visibility: no public assistant write endpoint.
- Auth model: existing admin session and normal login/auth state.
- RBAC: E2E user must exercise normal admin permissions; no bypass in app code.
- CSRF: all admin POSTs use normal UI/API CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: include at least one tampered/unknown Basic answer
  check in targeted tests or E2E if feasible.
- Anti-abuse: no unreviewed mutation; public forms retain existing hardening.
- Secret handling: do not commit auth state, screenshots with secrets, cookies,
  CSRF tokens, OpenRouter keys, or raw provider payloads.

## Files To Change

| Area | Files |
|---|---|
| E2E harness | `.tmp/*` local scripts only unless a sanitized reusable harness is added |
| Closure evidence | TASK-407 closure notes/changelog once complete |

## Implementation Pseudocode

```ts
async function runBasicLiveSiteBuilderIntakeE2E(page) {
  await openAdminAssistant(page);
  await promptAsBeginner("nie znam cms, stworz mi pelna strone dla lokalnej uslugi");
  await completeBasicSteps(page);
  await confirmSiteBuilderIntakeReview(page);
  await dryRunAndExecute(page);
  await assertPublicRuntime({ frontUrl: "http://coderso-b.localhost:3001/" });
}
```

## Data Flow and Error Handling

- Browser drives admin UI; admin UI calls real backend; backend executes reviewed
  strict actions; public runtime is checked separately.
- Login/auth, provider failures, CSRF/RBAC errors, dry-run conflicts, execute
  failures, console errors, mobile layout regressions, or public 404s fail E2E.
- Evidence is sanitized before documentation.

## Testing Requirements

- Playwright CLI Basic flow on:
  - admin: `http://coderso-b.localhost:5175/admin/`
  - front: `http://coderso-b.localhost:3001/`
  - site assets: `http://coderso-b.localhost:5176/site/`
- Desktop and mobile viewport screenshots/checks.
- Console/page error checks.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- TASK-407 closure notes/changelog when complete.

## Acceptance Criteria

- A nontechnical Basic prompt can produce a reviewed, executed full site.
- Public runtime output is usable on desktop and mobile.
- Evidence is sanitized and no secrets are committed.

## Completion Evidence

- Restarted `coderso-dev-core-host` with admin
  `http://coderso-b.localhost:5175/admin/` and public runtime
  `http://coderso-b.localhost:3001/`.
- Ran `playwright-cli -s=task407-basic-e2e run-code --filename .tmp/task-407-07-l02-basic-e2e.js`
  after the restart with a nontechnical Polish Basic prompt for a local bicycle
  service business.
- The live flow completed Basic intake steps, review confirmation, dry-run, and
  execute through the real admin UI. The compiled plan was `Local Service
  Business Site Kit` with `site-kit.recommend` plus `site-kit.install`.
- Dry-run returned `readyToExecute: true`; execute returned failed count `0`.
- Public runtime checks covered `/`, `/contact`, `/services`, `/portfolio`,
  `/faq`, desktop/mobile viewports, SEO description basics, contact form
  presence, broken-image checks, console errors, and page errors.
- Screenshots were written only to ignored `.tmp/` paths:
  `.tmp/task-407-07-l02-basic-desktop.png` and
  `.tmp/task-407-07-l02-basic-mobile.png`.
- Scope note: this Basic smoke verifies the generic local-service site-kit,
  reviewed execution, public pages, and contact form. It does not claim full
  media/personalized-image coverage; broader Advanced, follow-up, and
  second-theme checks remain in TASK-407-07-L03 through TASK-407-07-L05.

## Validation

- `git diff --check`
- `set -a && source .env && set +a && bun test tests/unit/kits/solutionKitsCatalog.test.ts tests/unit/kits/installService.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/siteBuilderPlanner.test.ts`
- `playwright-cli -s=task407-basic-e2e run-code --filename .tmp/task-407-07-l02-basic-e2e.js`

## Claude and Agent Evidence

- Subagent pre-audit found real drift in Basic `process` widget mapping,
  single-business service prompts selecting the directory kit, and reviewed
  site-kit launch-readiness metadata. Each finding was verified locally and
  fixed before the live E2E pass.
- Claude read-only audit confirmed the direction of the dirty working-tree fix
  and flagged an additional Polish `katalog` false-positive risk. That risk was
  verified locally and fixed with compiler regressions so `katalog uslug` stays
  on `local-service-business`, while explicit provider catalogs still use
  `services-directory`.
