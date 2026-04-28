# TASK-174-05-01: Template Section Reference Inspection
# FileName: TASK-174-05-01_Template_Section_Reference_Inspection.md

**Priority:** High
**Category:** Assistant/Context + Widget Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-05
**Status:** Done (2026-04-14)

---

## Overview

Add helpers that extract `template-section` references from page canvas blocks and hydrate referenced widget template summaries.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/widgets/widgetTemplateService.ts`
- `tests/vitest/assistant/*template*.test.ts`
- `tests/unit/assistant/*template*.test.ts` if domain service hydration is used.

## Security Contract

- Visibility: internal planning context only.
- Auth model: existing admin session.
- RBAC: requires `content:read` for page and `widgets:read` for template details.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: template reference summaries reject unknown fields.
- Anti-abuse: read-only inspection until typed mutation is reviewed.
- Idempotency: not applicable.
- Secret handling: redact template settings and block config summaries.

## Testing Requirements

- Vitest:
  - extracts template ids from page blocks,
  - dedupes template ids,
  - summarizes template nested blocks and redacts secret-like values.
- Bun:
  - service hydration if DB-backed template detail loading is used.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can inspect page template-section references.
2. Assistant can summarize referenced widget templates safely.
3. Duplicate template refs are deduped.

## Progress Notes

- 2026-04-14: Completed template-section reference inspection. Added bounded helpers for extracting/deduping page `template-section` references, server-side active page hydration for referenced widget template summaries, redacted nested template block/config summaries, and route-level `widgets:read` enforcement for active page template inspection.
- 2026-04-14: Validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/template-section-references.test.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
