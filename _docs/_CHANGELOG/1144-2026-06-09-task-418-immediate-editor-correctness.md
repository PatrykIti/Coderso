# 1144 - TASK-418 Immediate Editor Correctness

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-02, TASK-418-02-L03

## Key Changes

### Page Editor
- Completed the immediate correctness wave for PageEditor v2 authoring.
- Command palette block insertion now targets the active selected block or
  section, and no-selection block insertion creates a content section containing
  the requested block type.
- Empty sections now expose a canvas CTA that opens block insertion for that
  section.
- Selected blocks can move, duplicate, and delete without affecting unrelated
  blocks; deletion falls back to the nearest surviving block or parent section.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts`
  - Passed: 13 tests during the substrate leaf.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - Passed: 12 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.

## Notes

- `TASK-418-02` is closed with all physical children done.
- Nested container-slot actions remain deferred to TASK-418-05-L02 and
  TASK-418-06-L02.
