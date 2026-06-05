# TASK-407-07-L02: Basic Live Playwright E2E
# FileName: TASK-407-07-L02-Basic-Live-Playwright-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Playwright E2E
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L01
**Status:** ⏳ To Do

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
