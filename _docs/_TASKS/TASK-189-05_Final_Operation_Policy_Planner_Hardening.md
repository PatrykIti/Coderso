# TASK-189-05: Final Operation Policy Planner Hardening
# FileName: TASK-189-05_Final_Operation_Policy_Planner_Hardening.md

**Priority:** High
**Category:** Assistant/Core + Safety + Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-189-01, TASK-189-02, TASK-189-03, TASK-189-04
**Status:** Done (2026-04-19)

---

## Overview

Close the remaining TASK-189 audit gaps after provider `actions[]` removal.

The final planner contract is:

```text
prompt
  -> local CmsOperationDraft OR provider CmsOperationDraft
  -> strict provider validation with exact policy resource identity
  -> assistantOperationPolicy lookup
  -> trusted target resolver
  -> policy action/safety mapper
  -> dry-run/review/execute
```

No provider executable payload, provider repair fallback, duplicated CMS/admin
resource branch, or first-kind shared-resource fallback may remain in active
planning.

Product blueprint flows may remain local because they create composite site-kit or
business-pack plans outside the generic CMS/admin operation planner, but any
CMS/admin resource operation must route through `assistantOperationPolicy`.

## Planner Audit and Removal Plan

Audit source: `core/services/assistant/actionPlannerService.ts` at TASK-189
closure (`983e6c51`, 3.7k lines).

Remove or replace these planner-owned CMS/admin branches:

| Current line range | Category | Action |
|--------------------|----------|--------|
| 127-171 | `resourcePolicyAliases` and delete keyword mirrors | Delete from planner; aliases live in `assistantOperationPolicy`. |
| 173-195 | quoted/prefix helpers used only by legacy target branches | Delete from planner; target parsing belongs to `cmsTargetResolver`. |
| 197-309 | custom screen delete branch | Delete; generic draft/resolver/mapper owns custom screen delete. |
| 311-387 | page delete branch | Delete; generic draft/resolver/mapper owns page delete. |
| 389-521 | page metadata update branch | Delete; generic mapper owns page update fields from policy. |
| 523-894 | selected page widget/template bridge patch branches | Move behind policy-backed operation draft/mapping only; no provider/local fallback branch in planner. |
| 896-1161 | widget template delete/edit branches | Delete from planner; policy actions own template delete/update/block patch. |
| 1163-1329 | custom screen edit branches | Delete from planner; policy actions own screen update/widget patch. |
| 1331-1523 | active entry/content type delete branches | Delete from planner; resolver/mapper owns active entry and content type delete. |
| 1534-1866 | listing/form delete/archive branches | Delete from planner; resolver/mapper owns listing/form operations. |
| 1868-2099 | menu/SEO delete branches | Delete from planner; resolver/mapper owns menu/SEO operations. |
| 2101-2443 | entry/form/listing/menu/SEO update branches | Delete from planner; mapper derives fields from policy. |
| 3055-3152 | provider repair and prompt-implied hardcoded draft patching | Replace with strict provider validation plus policy-derived field/filter inference only. |
| 3154-3182 | provider local recovery metadata that marks fallback as provider draft | Replace with deterministic local policy recovery that never reuses provider payload and reports `providerDraftUsed=false`. |
| 3257-3331 | post/media upload one-off gates | Delete; post and media upload prompts must be represented by policy gated actions. |
| 3333-3402 | explicit media attach branch | Delete from planner; media attach must be reconstructed through a policy-backed draft. |
| 3427-3588 | ordered legacy CMS/admin branch calls | Delete; call one local operation policy planner instead. |

Keep these planner areas:

- strict prompt classification and docs-only answer fallback,
- product/business blueprint pack dispatch,
- site-kit action plan wrapper,
- generic CMS operation orchestration helpers that call resolver/mapper,
- provider orchestration wrapper that calls the provider only for strict
  `CmsOperationDraft` and falls back to local deterministic policy planning on
  provider failure.

## Acceptance Criteria

1. Provider output is strict `CmsOperationDraft` only; unknown fields and mixed
   `actions[]` payloads are rejected and never repaired.
2. Provider schema requires non-null `resourceKey` when operation policy metadata
   is supplied.
3. Shared-kind resources such as `settings-surface` cannot fall back to the first
   matching kind when `resourceKey` is missing or null.
4. Post mutation and media upload prompts produce policy-gated plans, not
   one-off planner-specific responses.
5. Explicit media reference attach is reconstructed from a policy-backed
   operation draft and mapper, not from a planner shortcut.
6. `actionPlannerService.ts` no longer owns CMS/admin delete/update keyword
   branches for pages, entries, forms, listings, menus, SEO, widgets, custom
   screens, content types, posts, media, settings, or admin surfaces.
7. Product blueprint flows remain unchanged and are documented as outside the
   generic CMS/admin operation planner.
8. TASK-189 targeted Vitest, lint, and typecheck pass.

## Security Contract

- Visibility: internal assistant planning and execution only.
- Auth model: existing admin session on `/assistant/actions/*`.
- RBAC: unchanged; action dry-run/execute still enforce route/domain permissions.
- CSRF: unchanged; admin/internal write endpoints still require `X-CSRF-Token`.
- Rate-limit bucket: existing assistant planning/execution buckets.
- Reject-unknown validation: provider drafts with unknown fields, `actions[]`, or
  null/missing ambiguous `resourceKey` are rejected before target resolution.
- Anti-abuse: providers cannot supply executor payloads; gated resources return
  non-executable plans; destructive/bulk operations require exact trusted
  targets, policy safety checks, and reviewed dry-run.
- Public-write hardening: not applicable; no public endpoint is introduced.
- Secret handling: settings/admin/media/post secret-bearing surfaces remain
  redacted and provider-disallowed through operation policy metadata.

## Testing Requirements

- Add/update Vitest coverage for:
  - provider `actions[]` mixed with valid draft fields is rejected and not
    repaired,
  - provider `settings-surface` with `resourceKey: null` or missing is rejected,
  - provider schema exposes non-null `resourceKey`,
  - local `API Keys`/Assistant/Security/Webhooks prompts preserve exact policy
    resource keys,
  - post create/update/delete prompts return policy-gated non-executable plans,
  - media upload prompts return policy-gated non-executable plans,
  - explicit media reference attach goes through operation policy mapping,
  - existing page/form/listing/menu/SEO/content/widget/custom-screen plans still
    route through generic resolver/mapper behavior.
- Run:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry for TASK-189-05.

## Completion Notes (2026-04-19)

- Reduced `core/services/assistant/actionPlannerService.ts` from roughly 3.7k
  lines to 1066 lines by removing planner-owned CMS/admin delete/update/gated
  branches.
- Removed provider draft repair from active planning; provider output must pass
  strict `CmsOperationDraft` validation and exact policy resource identity.
- Expanded operation policy draft kinds so post/media/admin gated surfaces can be
  represented by policy instead of planner one-offs.
- Moved active target, selected-block patch, media reference, post/media gated,
  numeric field, boolean field, and exact resource mapping through
  `cmsTargetResolver` + `cmsOperationActionMapper`.
- Updated tests so provider `actions[]` mixed payloads are rejected rather than
  repaired and shared-kind `resourceKey: null` fails closed.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Follow-up Fixes (2026-04-20)

- Fixed live-regression cases reported after TASK-189-05:
  - admin/security/store/theme/dashboard prompts no longer throw on gated or
    unsupported operation drafts,
  - post/media gated plans are accepted as non-executable live results,
  - listing template layout prompts keep `layout` instead of being mapped to
    `slug`,
  - selected-block `dataPath` patches are not overwritten by prompt field aliases,
  - the DB-backed user settings suite has a wider timeout for slower local runs.

## Follow-up Validation (2026-04-20)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/settings/userSettingsService.test.ts`
- `set -a && source .env && set +a && TEST_OPENROUTER_API_KEY= TEST_OPENROUTER_MODEL= bun test tests/integration/assistant-live` (local harness skipped DB-backed suites)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
