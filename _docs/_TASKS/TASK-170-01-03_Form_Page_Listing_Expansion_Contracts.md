# TASK-170-01-03: Form, Page, and Listing Expansion Contracts
# FileName: TASK-170-01-03_Form_Page_Listing_Expansion_Contracts.md

**Priority:** High  
**Category:** Core/Assistant + Coderso Surfaces  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-01  
**Status:** Done (2026-04-12)

---

## Overview

Extend the already shipped `form.upsert`, `page.upsert`, and listing actions beyond the first catalog slice. This leaf defines compatible contract growth before executor/UI changes.

## Sub-Tasks

No child task files.

## Target Additions

- `form.automation.upsert` for existing automation service contracts.
- `page.widget.patch` for deterministic block insertion/update.
- `listing-query.filters.patch` for field-safe filters.
- `listing-template.card.patch` for card field/layout refinements.

## Pseudocode

```ts
const patch = normalizeSurfacePatch(action.input);
const current = await loadExistingSurface(patch.target);

const next = applyDeterministicPatch(current, patch, {
  allowedWidgetTypes,
  allowedListingFields,
  preserveUnknownLegacyBlocks: true,
});

return diffSurface(current, next);
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/forms/formsService.ts`
- `core/services/pages/pageService.ts`
- `core/services/content/listingQueriesService.ts`
- `core/services/content/listingTemplatesService.ts`
- widget/listing contract modules that own schema/defaults/normalizers

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: form/page/listing read for plan/dry-run and write/publish permissions for execute as appropriate.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: patch inputs must reject unknown widget types, unknown listing fields, and unsupported automation actions.
- Anti-abuse: public forms must reuse existing public form nonce/captcha/access evaluators; no new public endpoint.
- Idempotency: patches must be deterministic and replay-safe.
- Secret handling: form automation payloads must not leak integration secrets, submission data, or internal webhook credentials.

## Testing Requirements

- Vitest:
  - patch schema and normalizer coverage,
  - deterministic widget/listing patch diff coverage,
  - unknown widget/field rejection.
- Bun:
  - DB-backed page/listing/form executor tests when executable,
  - public runtime acceptance for generated page/listing/form output.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/WIDGET_PACK_MATRIX.md` if widget pack completeness changes.
- Relevant `docs/` assistant corpus pages if new guide behavior is user-facing.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Existing catalog actions can grow without breaking the shipped plan shape.
2. Patch actions are non-destructive and deterministic.
3. Public form hardening stays owned by existing forms contracts.

## Completion Notes (2026-04-12)

- Registered contract-only expansion actions: `form.automation.upsert`, `page.widget.patch`, `listing-query.filters.patch`, and `listing-template.card.patch`.
- Documented existing public form hardening reuse for form automation and non-destructive patch expectations for pages/listings.
- Added Vitest coverage proving the new expansion contracts do not widen strict executable action plans yet.

## Follow-Up Notes

- 2026-04-12: `TASK-170-03-03-01` promoted `listing-query.filters.patch` to an executable action. `form.automation.upsert`, `page.widget.patch`, and `listing-template.card.patch` remain contract-only.
- 2026-04-12: `TASK-170-03-03-02` promoted `listing-template.card.patch` to an executable action. `form.automation.upsert` and `page.widget.patch` remain contract-only.
- 2026-04-12: `TASK-170-03-03-03` promoted `page.widget.patch` to an executable action for top-level `upsert-block`. `form.automation.upsert` remains contract-only.
