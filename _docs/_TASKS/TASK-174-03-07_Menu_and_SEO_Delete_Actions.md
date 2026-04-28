# TASK-174-03-07: Menu and SEO Delete Actions
# FileName: TASK-174-03-07_Menu_and_SEO_Delete_Actions.md

**Priority:** Medium
**Category:** Assistant/Delete + Menus/SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-03
**Status:** Done (2026-04-14)

---

## Overview

Add reviewed delete actions for menu items and SEO documents.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/menus/menuService.ts`
- `core/services/seo/seoService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: menu delete requires `menus:write`; SEO delete requires `content:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict schemas reject unknown fields.
- Anti-abuse: menu item delete reuses existing menu tree service and preserves unrelated items.
- Idempotency: execute requires idempotency key.
- Secret handling: no secret-like SEO/menu config in UI/audit.

## Testing Requirements

- Vitest:
  - target resolution,
  - ambiguity handling,
  - schema rejection.
- Bun:
  - menu item delete preserves unrelated tree,
  - SEO document delete uses domain service,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can delete exact menu items and SEO documents after review.
2. Menu tree operations preserve unrelated items.
3. Domain services own mutation behavior.

## Completion Notes

- Added executable `menu.item.delete`.
- Added executable `seo.document.delete`.
- Extended the server-side assistant resource catalog with bounded menu item summaries and existing SEO document summaries.
- Menu item delete resolves exact catalog targets by item id, label, or href, then deletes through the menu tree service while preserving unrelated items.
- SEO document delete resolves exact catalog targets by id, slug, target title, or active SEO context, then deletes through the SEO domain service.
- Added read-only existing SEO document listing to avoid planning-time SEO document creation.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts tests/vitest/assistant/provider-planning-context.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/assistant-panel.test.tsx`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/menus/menuService.test.ts tests/unit/seo/seoService.test.ts`
