# 1114 - TASK-407 reference design brief review gate

Date: 2026-06-05
Version: unreleased
Tasks: TASK-407-04-L04, TASK-407-04

## Key Changes

### Assistant Site Builder
- Added `assistantSiteBuilderIntakeReferenceBrief.ts` to convert sanitized
  references into enum-only color, layout, density, typography, and
  image-treatment hints.
- Added explicit review gating so reference design hints do not merge into
  intake facts until confirmed.
- Projected confirmed reference brief hints to provider context as digest,
  enum ids, warning codes, gate codes, and `rawIncluded:false`.

### Safety
- Brief facts reject unknown fields, unsupported hint ids, invalid warning/gate
  codes, and unsafe constraints.
- Reference briefs cannot emit executable actions, media imports, CSS,
  RBAC/CSRF changes, or review-bypass instructions.
- Raw reference ids, filenames, OCR/extracted text, metadata, URLs, media bytes,
  and poisoned text remain outside provider prompts and diagnostics.

### QA
- Added `assistantSiteBuilderIntakeReferenceBrief.test.ts`.
- Closed TASK-407-04 after completing all Advanced preset, layout, reference
  validation, and reference review leaves.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeReferenceBrief.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeReferencePolicy.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
