# TASK-407-07-L05: Scoped Cleanup and Second Theme Rebuild E2E
# FileName: TASK-407-07-L05-Scoped-Cleanup-and-Second-Theme-Rebuild-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Reset E2E
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L04
**Status:** ⏳ To Do

---

## Overview

Prove the guided assistant is generic by cleaning up only resources created by
the first E2E run and then creating a second full site in a different
industry/theme from a fresh nontechnical prompt.

## Sub-Tasks

- Tag or record resource ids/slugs created by E2E runs.
- Delete only those scoped pages/content/media/menu/form/SEO resources.
- Assert first-run pages/resources no longer remain.
- Run a second full-site Basic or mixed guided flow for a different
  industry/theme.
- Verify public runtime, navigation/footer, content, media policy, desktop/mobile,
  and console/page errors for the second site.

## Security Contract

- Endpoint visibility: no new public assistant write endpoint.
- Auth model: existing admin session.
- RBAC: cleanup uses normal admin delete/write permissions for scoped resources.
- CSRF: cleanup/admin POSTs use normal UI/API CSRF handling.
- Rate-limit bucket: `assistant` for assistant calls; existing resource route
  buckets for cleanup calls.
- Reject unknown validation: cleanup must use recorded trusted resource ids and
  reject untracked ids.
- Anti-abuse: cleanup must not truncate tables, delete unrelated user resources,
  or rely on broad prompt text to choose resources.
- Secret handling: cleanup logs and evidence must not include auth state,
  cookies, CSRF tokens, provider keys, signed URLs, raw provider output, or raw
  uploaded bytes.

## Files To Change

| Area | Files |
|---|---|
| E2E harness | `.tmp/*` local scripts only unless sanitized reusable harness is added |
| Fixture tagging | committed helper only if reusable and sanitized |
| Closure evidence | TASK-407 closure notes/changelog once complete |

## Implementation Pseudocode

```ts
async function runScopedCleanupAndSecondThemeE2E(page) {
  const resources = await listResourcesCreatedByE2ERun();
  await deleteOnlyScopedResources(resources);
  await assertNoFirstRunResourcesRemain(resources);
  await promptAsBeginner("zrob mi strone dla innej branzy niz poprzednio");
  await completeGuidedSiteFlow(page);
  await assertPublicRuntimeIsDifferentIndustry();
}
```

## Data Flow and Error Handling

- E2E records created resources during execution; cleanup consumes only those
  trusted ids.
- Missing ids, unrelated ids, broad delete requests, DB truncation attempts, or
  cleanup failures block the second run.
- Second run must prove different content/theme choices, not only regenerate the
  first prompt.

## Testing Requirements

- Playwright CLI cleanup plus second full-site run.
- Assertions that cleanup is scoped and non-destructive.
- Public runtime, mobile, navigation/footer, media policy, and console checks for
  second site.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- TASK-407 closure notes/changelog when complete.

## Acceptance Criteria

- First-run generated resources are removed through scoped cleanup only.
- Second full-site run succeeds for a different industry/theme.
- No unrelated resources are deleted or mutated.
