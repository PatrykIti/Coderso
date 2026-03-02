# TASK-063-16-15: Section Inline Typography Preview Persistence
# FileName: TASK-063-16-15_Section_Inline_Typography_Preview_Persistence.md

**Priority:** High  
**Category:** Admin/UI + Runtime  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Ensure inline typography spans survive writing-canvas normalization so preview/front rendering keeps inline font family and text size when the block is not active.

---

## Sub-Tasks
1. Preserve inline typography spans during writing-canvas normalization.
2. Add unit coverage for writing-canvas inline typography roundtrip.
3. Update docs/changelog.

---

## Testing Requirements
- `bun test tests/unit/posts/post-paste-normalizer.test.ts`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
