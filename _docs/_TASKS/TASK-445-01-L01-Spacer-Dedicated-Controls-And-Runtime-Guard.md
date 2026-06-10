# TASK-445-01-L01: Spacer Dedicated Controls And Runtime Guard
# FileName: TASK-445-01-L01-Spacer-Dedicated-Controls-And-Runtime-Guard.md

**Parent Subtask:** TASK-445-01
**Priority:** Low
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Small
**Dependencies:** TASK-445-01
**Status:** ⏳ To Do

---

## Overview

Adopt the shared dedicated controls for Spacer style/visibility while
preserving the currently-correct fixed-height runtime output.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
renderBlockControls(getBlockControlsForType("spacer"));
expect(renderPublishedSpacer(block)).toContain("height");
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Spacer style/visibility controls move to the dedicated widgets.
- Published runtime keeps rendering the current deterministic height output.

Error handling:

- Unsupported sizes remain clamped to the existing safe range.
- Control migration must not alter spacer persistence semantics.

Regression-test shape:

- UI coverage for dedicated controls and runtime coverage for spacer output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Spacer fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
