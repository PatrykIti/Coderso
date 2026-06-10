# TASK-423-03: Validation Viewport Smoke And Closure
# FileName: TASK-423-03-Validation-Viewport-Smoke-And-Closure.md

**Parent Task:** TASK-423
**Priority:** High
**Category:** Pages / Public Runtime / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-423-02
**Status:** ⏳ To Do

---

## Overview

Close the responsive-runtime family with lane-correct validation and a real
viewport replay of the audit method. The closure proof must show that mobile and
tablet overrides now reach the published front, while preview-device flattening
still behaves exactly as before.

---

## Implementation Pseudocode

```text
Live smoke:
1. Create/publish a page with desktop=1080, tablet=640, mobile=360 section width.
2. Verify editor badges still show Base / Override / Inherited correctly.
3. Open published front at 390px -> computed max-width = 360px.
4. Open published front at tablet width -> computed max-width = 640px.
5. Open preview with previewDevice=mobile -> flattened mobile HTML, no public
   responsive <style data-page-responsive>.
```

Expected validation set:

- Vitest responsive CSS planner tests pass.
- Bun public runtime/preview tests pass.
- Live browser smoke proves computed front styles change with viewport.

Error handling:

- If any viewport still computes desktop-only values, keep the task open and
  split any follow-up explicitly before closure.

Regression-test shape:

- No new production logic; this subtask records and verifies the final proof.

---

## Testing Requirements

- `bun run test:vitest`
- `bun run test:bun`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live viewport smoke

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

