# 1171 - TASK-465 Page route validation memory hardening

**Date:** 2026-06-14
**Version:** Unreleased
**Tasks:** TASK-465

## Key Changes

### Pages / Page Templates

- Replaced the recursive Page v2 document schema embedded in Page and Page
  Template route validators with lightweight Page v2 envelope schemas.
- Kept strict recursive document validation in the domain owner normalizers, so
  deep unknown fields, invalid tokens, legacy root `blocks[]`, slot/depth
  bounds, and mixed contracts still reject before persistence.
- Reduced local empty Page Template route-validation RSS from about 810 MB to
  about 76 MB; empty Page create validation measured about 68 MB.

## Validation

- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/pages/validation.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/integration/routes/pageTemplates.test.ts tests/integration/routes/pages.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun run test:vitest -- tests/vitest/pages/page-template-library-schema.test.ts`
- Local RSS smoke for `pageTemplateCreateSchema` and `pageCreateSchema` empty-document validation.
