# TASK-407-07-L03: Advanced Live Playwright E2E
# FileName: TASK-407-07-L03-Advanced-Live-Playwright-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Advanced Playwright E2E
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L02
**Status:** ⏳ To Do

---

## Overview

Validate Advanced site-builder intake creation through the real admin UI with design,
menu, hero, section, and reference-review choices.

## Sub-Tasks

- Use `playwright-cli` against the real admin helper URL.
- Start or switch into Advanced mode.
- Select design preset, menu behavior, hero variant, section variants, and CTA
  behavior.
- Exercise reference review gates using safe media-library ids or sanitized
  synthetic reference fixtures when available.
- Verify dry-run, execute, and public runtime reflect selected Advanced choices
  without unsupported media/reference claims.

## Security Contract

- Endpoint visibility: no public assistant write endpoint.
- Auth model: existing admin session.
- RBAC: normal admin permissions; media read permission required for media-backed
  reference checks.
- CSRF: all admin POSTs use normal UI/API CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: E2E or targeted tests must reject tampered Advanced
  option/reference ids.
- Anti-abuse: reference input remains design evidence only and cannot execute,
  import arbitrary media, or bypass review.
- Secret handling: do not commit auth state, provider keys, cookies, CSRF
  tokens, raw screenshots with secrets, raw uploaded bytes, or raw provider
  payloads.

## Files To Change

| Area | Files |
|---|---|
| E2E harness | `.tmp/*` local scripts only unless sanitized reusable harness is added |
| Closure evidence | TASK-407 closure notes/changelog once complete |

## Implementation Pseudocode

```ts
async function runAdvancedLiveSiteBuilderIntakeE2E(page) {
  await openAdminAssistant(page);
  await startSiteBuilderIntake({ mode: "advanced" });
  await chooseDesignPreset("modern");
  await chooseAdvancedMenuHeroSections();
  await reviewReferenceBriefOrGate();
  await confirmSiteBuilderIntakeReview(page);
  await dryRunAndExecute(page);
  await assertAdvancedPublicRuntime();
}
```

## Data Flow and Error Handling

- Advanced UI choices become structured answers, then reviewed facts, then
  existing siteKit plan input and strict actions.
- Unsupported reference/media choices must display gates and keep execution
  safe.
- Provider latency/failure, invalid option ids, reference scan failure, dry-run
  conflicts, execute failures, or public runtime mismatches fail E2E.

## Testing Requirements

- Playwright CLI Advanced flow on admin/front/site-asset URLs.
- Reference brief or fail-closed gate proof.
- Desktop/mobile and console/page error checks.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/MEDIA_SPEC.md` if live validation changes media policy docs.

## Acceptance Criteria

- Advanced choices survive review/dry-run/execute.
- Reference handling is reviewed or gated, not silently trusted.
- Public runtime reflects selected supported choices.
