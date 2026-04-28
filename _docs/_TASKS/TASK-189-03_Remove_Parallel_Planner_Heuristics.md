# TASK-189-03: Remove Parallel Planner Heuristics
# FileName: TASK-189-03_Remove_Parallel_Planner_Heuristics.md

**Priority:** High
**Category:** Assistant/Core + Refactor
**Estimated Effort:** Large
**Dependencies:** TASK-189-01, TASK-189-02
**Status:** Done (2026-04-19)

---

## Overview

Reduce `actionPlannerService.ts` to orchestration for CMS/admin operation planning and remove duplicate local keyword branches that are already represented in `assistantOperationPolicy`.

The current planner still contains CMS resource delete/update keyword lists, unsupported post/media guards, provider-preferred local routing, read-only status helpers, and listing layout/limit guards. These branches can override or bypass the policy pipeline. This task removes the second path and leaves the correct path:

```text
prompt -> local/provider CmsOperationDraft -> policy resource identity -> resolver -> safety -> mapper
```

Product blueprint setup/refinement planners may remain local when they are outside CMS operation policy, but they must not own CMS/admin resource aliases, fields, gated settings behavior, destructive rules, or provider post-validation safety.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
  - Remove local CMS resource keyword lists that duplicate policy aliases.
  - Remove provider-preferred local guards when policy draft/resolver can express the behavior.
  - Replace post/media/settings one-off gated checks with policy resources/actions.
  - Keep orchestration and product blueprint dispatch only.
- `core/services/assistant/actionPlanHeuristics.ts`
  - Keep broad prompt kind/family classification only.
  - Do not own CMS/admin resource aliases if policy owns them.
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts`
- `core/services/assistant/operationPolicy/*`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
- `tests/vitest/assistant/operation-policy-safety.test.ts`

## Acceptance Criteria

1. `actionPlannerService.ts` no longer contains duplicated CMS resource delete/update keyword arrays for pages, entries, forms, listings, menus, SEO, widgets, custom screens, or content types.
2. Read-only status/search handling for forms/pages/screens and similar resources is produced through policy draft/resolver behavior.
3. Unsupported/gated post, media upload, settings, tools, users, roles, logs, and security prompts are modeled by policy entries and action modes, not one-off planner functions.
4. Provider path does not run provider-preferred local branches that duplicate policy routing before model inference.
5. Existing active-surface widget/page/template behaviors either move behind policy-declared adapter metadata or remain explicitly documented as temporary adapter exceptions with tests.
6. Broad destructive, counted destructive, filtered-all, and field-mismatch safety still use policy helpers and remain green.

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: unchanged; action execution still enforces route/domain permissions.
- CSRF: unchanged; no route changes.
- Rate-limit bucket: existing assistant planning/execution buckets.
- Reject-unknown validation: strict action plan and CMS operation draft schemas remain final.
- Anti-abuse: removing local one-offs must not weaken broad destructive denial, expected count checks, gated settings/security surfaces, post/media upload gating, or secret handling.
- Public-write hardening: not applicable; no public endpoint. Nonce/signature/HMAC and reCAPTCHA are not applicable.
- Secret handling: policy redaction and provider disallow flags remain authoritative.

## Testing Requirements

- Add regression tests proving the policy path owns:
  - page/form/listing/menu/SEO delete/update routing,
  - read-only form visibility/status questions,
  - media upload gating,
  - post mutation gating,
  - settings/security/API key gating,
  - provider route does not bypass policy.
- Run:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- Changelog entry on completion.

## Completion Notes (2026-04-19)

- Removed provider-side local-first helper branches for active surfaces, listing fields, read-only status/search, and generic policy pre-routing.
- Added a single policy-backed local operation preplan/recovery path that uses `CmsOperationDraft`, exact policy identity, resolver, safety, and mapper.
- Moved CMS resource target keyword lists to policy aliases and reused `assistantOperationPolicy` from planner compatibility branches.
- Added provider safety mismatch coverage for non-destructive counted action count mismatches and field/action mismatches.
- Preserved active-surface widget/page/template adapter behavior as an explicit local adapter exception when generic CMS parsing is intentionally skipped.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
