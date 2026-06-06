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
- Verify the second site is prompt-specific, not just a regenerated generic
  local-service shell: brand/site name, hero copy, service/content sections,
  navigation labels, SEO titles/descriptions, and at least one legal/gated media
  decision must fit the requested industry/theme.
- Verify public runtime, navigation/footer, content, media policy,
  desktop/mobile, and console/page errors for the second site.

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
  await promptAsBeginner(
    "nie znam sie na cms, zrob mi kompletna strone dla innej branzy niz poprzednio"
  );
  await completeGuidedSiteFlow(page);
  await assertPublicRuntimeIsDifferentIndustry();
  await assertPromptSpecificCopyBrandingAndMediaPolicy();
}
```

## Data Flow and Error Handling

- E2E records created resources during execution; cleanup consumes only those
  trusted ids.
- Missing ids, unrelated ids, broad delete requests, DB truncation attempts, or
  cleanup failures block the second run.
- Second run must prove different content/theme choices, not only regenerate the
  first prompt.
- Generic fallback text such as `Local Service Business`, unrelated testimonial
  fixtures, or unexplained media placeholders cannot satisfy the prompt-specific
  copy/branding evidence unless the task explicitly records a blocking follow-up
  with rationale.

## Testing Requirements

- Playwright CLI cleanup plus second full-site run.
- Assertions that cleanup is scoped and non-destructive.
- Public runtime, mobile, navigation/footer, media policy, and console checks for
  second site.
- Assertions that the second site's visible copy, metadata, and media policy are
  specific to the requested industry/theme rather than generic kit defaults.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- TASK-407 closure notes/changelog when complete.

## Acceptance Criteria

- First-run generated resources are removed through scoped cleanup only.
- Second full-site run succeeds for a different industry/theme.
- Second full-site run produces prompt-specific copy/branding/media-policy
  evidence for that industry/theme.
- No unrelated resources are deleted or mutated.
