# TASK-407-07-L05: Scoped Cleanup and Second Theme Rebuild E2E
# FileName: TASK-407-07-L05-Scoped-Cleanup-and-Second-Theme-Rebuild-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Reset E2E
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L04
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Prove the guided assistant is generic across install/cleanup/rebuild cycles by
running a self-contained first site install, cleaning it up through the exact
solution-kit install run id, and then creating a second full site in a different
industry kit/theme family from a fresh nontechnical prompt.

This leaf must not claim prompt-bespoke public copy, arbitrary brand theming, or
theme-token application beyond the current TASK-407 implementation contract.
Those capabilities are not applied by the current site-kit installer; L05 must
prove industry-kit differentiation and scoped rollback safety honestly, and any
future prompt-bespoke copy/theme work must be tracked as follow-on scope instead
of being inferred from this E2E.

## Sub-Tasks

- Create a first site inside the L05 harness, capture the exact
  `site-kit.install` execution result, selected kit id, install run id, and
  sanitized run items.
- Fetch the authoritative run detail for that install run and build a sanitized
  cleanup manifest from recorded ids only.
- Clean up through `POST /admin/api/solution-kits/:id/rollback` with explicit
  `sourceRunId`; never fall back to the latest run and never delete by broad
  slug/name heuristics.
- Assert created first-run resources are removed by id, updated pre-existing
  resources are restored, and at least one unrelated pre-existing resource still
  exists after cleanup.
- Clear assistant browser/session state after cleanup, then run a second
  full-site Basic or mixed guided flow from a fresh nontechnical prompt that
  contains an industry keyword known to select a different kit.
- Verify the second site is industry-kit-specific, not just a regenerated
  `local-service-business` shell: selected kit id differs, public runtime and
  metadata contain second-industry terms, first-run/L02/L03 brand or vertical
  terms do not bleed through, and media policy/gate evidence remains legal and
  bounded.
- Verify public runtime, navigation/footer, content, media policy,
  desktop/mobile, and console/page errors for the second site.

## Security Contract

- Endpoint visibility: no new public assistant write endpoint.
- Auth model: existing admin session.
- RBAC: assistant planning/execution uses normal admin permissions; cleanup uses
  existing solution-kit rollback permissions (`solution-kits:write`) and the
  server-owned rollback manifest for the recorded install run.
- CSRF: cleanup/admin POSTs use normal UI/API CSRF handling, including rollback.
- Rate-limit bucket: `assistant` for assistant calls; existing admin read/write
  route buckets for rollback and run-detail reads.
- Reject unknown validation: cleanup must use the recorded trusted
  `sourceRunId`, selected kit id, and run items; unknown ids, missing run ids,
  mismatched kit ids, or rollback without `sourceRunId` fail the harness.
- Anti-abuse: cleanup must not truncate tables, delete unrelated user resources,
  delete resources by common slugs such as `/contact`, or rely on broad prompt
  text to choose resources.
- Secret handling: cleanup logs and evidence must not include auth state,
  cookies, CSRF tokens, provider keys, signed URLs, raw provider output, or raw
  uploaded bytes.

## Files To Change

| Area | Files |
|---|---|
| E2E harness | `.tmp/*` local scripts only unless sanitized reusable harness is added |
| Fixture tagging | committed helper only if reusable and sanitized |
| Docs and matrices | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`, `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` |
| Closure evidence | `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, new changelog entry once complete |

## Implementation Pseudocode

```ts
async function runScopedCleanupAndSecondThemeE2E(page) {
  const first = await runSiteBuilderInstall({
    prompt: "nietechniczny prompt wybierajacy medical-clinic",
    expectedKitId: "medical-clinic",
  });
  const manifest = await fetchSolutionKitRunManifest({
    selectedKitId: first.selectedKitId,
    sourceRunId: first.sourceRunId,
  });
  assertManifestUsesOnlyRunItems(manifest);
  await rollbackSolutionKitRun({
    selectedKitId: first.selectedKitId,
    sourceRunId: first.sourceRunId,
  });
  await assertCreatedRunItemsRemovedById(manifest);
  await assertUpdatedRunItemsRestored(manifest);
  await assertKnownUnrelatedResourceStillExists();
  await clearAssistantState();
  await promptAsBeginner(
    "nie znam sie na cms, zrob mi kompletna strone dla salonu urody i spa"
  );
  const second = await completeGuidedSiteFlow(page);
  await assertSelectedKitDiffers(first.selectedKitId, second.selectedKitId);
  await assertPublicRuntimeIsIndustryKitSpecific(second, {
    expectedKitId: "beauty-salon",
    requiredTerms: ["salon", "beauty", "spa"],
    forbiddenPriorTerms: [
      "Velo Serwis",
      "Zielona Pracownia",
      "Local Service Business",
      "Medical Clinic",
      "doctor",
      "clinic",
    ],
  });
  await assertMediaPolicyIsBoundedAndNoBrokenImages();
}
```

## Data Flow and Error Handling

- E2E records the exact `site-kit.install` run id from execution output, then
  fetches the authoritative run detail via admin API before cleanup.
- Cleanup calls rollback with explicit `sourceRunId` only. Missing ids,
  mismatched kit ids, latest-run fallback, broad delete requests, DB truncation
  attempts, or cleanup failures block the second run.
- Cleanup assertions use run-item ids and rollback metadata. Created resources
  must be absent by id after rollback; updated resources must be restored rather
  than deleted.
- The assistant state is cleared after cleanup so the second prompt starts a
  fresh intake/plan rather than a stale follow-up path.
- Second run must prove a different industry kit and runtime output, not only
  regenerate the first source-kit path or the earlier `local-service-business`
  path from L02/L03.
- Generic fallback text such as `Local Service Business`, first-run brand terms,
  unrelated testimonial fixtures, or unexplained media placeholders cannot
  satisfy the second-industry evidence. The task may record curated media
  registry or gated media decisions, but must not claim arbitrary media upload
  or prompt-bespoke image generation.

## Testing Requirements

- Playwright CLI cleanup plus second full-site run.
- Assertions that cleanup is scoped and non-destructive.
- Public runtime, mobile, navigation/footer, media policy, and console checks for
  second site.
- Assertions that the second site's selected kit id, visible copy, metadata, and
  media policy are specific to the selected industry kit rather than the first
  source kit or earlier local-service runs.
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Bun/Vitest suites for any changed production contracts.
- `bun run gates:coderso`
- `bun run precommit` before commit.
- Fresh Claude/subagent drift review after task contract fixes and again after
  implementation/validation.

## Completion Evidence

- Live helper: restarted `coderso-dev-core-host` with admin
  `http://coderso-b.localhost:5175/admin/`, front
  `http://coderso-b.localhost:3001/`, and site assets
  `http://coderso-b.localhost:5176/site/` before the final Playwright pass.
- Final Playwright CLI command:
  `playwright-cli -s=task407-l05-cleanup-theme-r9 run-code --filename .tmp/task-407-07-l05-scoped-cleanup-second-theme-e2e.js`.
- First beginner prompt selected `medical-clinic`; source apply run
  `8de2bf41-7fef-4f17-bf29-bf68355663f1` completed with no failed action
  results.
- Cleanup used explicit rollback `sourceRunId` only. Rollback run
  `cd6191d5-d2d1-4e28-b0c8-8a0df253493e` reported
  `rollbackOfRunId=8de2bf41-7fef-4f17-bf29-bf68355663f1`, `total=7`,
  `success=7`, `failed=0`, with `delete=4` and `restore=3`.
- Sanitized run manifest contained 4 created resources and 3 updated resources.
  The harness asserted created resources were absent by id after rollback,
  updated resources were restored, and unrelated published page `about`
  remained unchanged.
- Assistant browser/session state was cleared before the second beginner prompt.
  The second prompt selected `beauty-salon`; source apply run
  `b6588b3e-1451-4ff6-9095-db17a22d3a55` completed.
- Public runtime checks passed for `/`, `/offers`, and `/contact`, including
  SEO descriptions, navigation/footer links, visible booking form, desktop and
  mobile screenshots, curated media registry URLs, no broken images, no
  first-run medical/local-service/default-widget copy bleed, no horizontal
  overflow, and zero browser console/page errors.
- Screenshot review found and fixed two product drifts before closure:
  `beauty-salon`/`medical-clinic` home pages previously rendered generic widget
  defaults, and the salon hero needed stronger image overlay/text contrast.
  The catalog now ships industry-specific starter copy, license-documented
  curated media, package/testimonial/gallery data, menu-backed navigation,
  footer links, and connected contact form embeds.
- Targeted regression coverage:
  `bun test tests/unit/kits/solutionKitsCatalog.test.ts tests/unit/kits/installService.test.ts`
  checks navigation, footer, contact form binding, curated media registry usage,
  absence of generic widget default copy for industry starter pages, and
  installer compatibility.
- Validation coverage passed: `git diff --check`, `bun --cwd core lint`,
  `bun --cwd core lint:types`, `./node_modules/.bin/tsc -p tsconfig.json
  --noEmit`, `bun run gates:coderso`, and `bun run precommit`.
- Drift review coverage: Claude and subagent read-only passes reviewed the L05
  implementation/task/changelog state; their media-contract finding was resolved
  by moving industry starter images through `curatedMediaProfiles` instead of
  direct kit-local URLs.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New TASK-407/L05 changelog entry.

## Acceptance Criteria

- First-run generated resources are cleaned through explicit run-scoped rollback
  only, with `sourceRunId` and no latest-run/broad-slug fallback.
- Second full-site run succeeds for a different industry kit/theme family.
- Second full-site run produces selected-kit-specific copy, metadata, structure,
  and media-policy evidence for that industry kit, while not claiming
  prompt-bespoke public copy/branding/theme-token application.
- No unrelated resources are deleted or mutated.
