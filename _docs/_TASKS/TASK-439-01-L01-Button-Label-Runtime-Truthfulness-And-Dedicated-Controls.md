# TASK-439-01-L01: Button Label Runtime Truthfulness And Dedicated Controls
# FileName: TASK-439-01-L01-Button-Label-Runtime-Truthfulness-And-Dedicated-Controls.md

**Parent Subtask:** TASK-439-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-439-01
**Status:** ⏳ To Do

---

## Overview

Adopt the shared label-edit and dedicated-control paths for Button while
proving that variant, size, target, accent, and link behavior stay truthful on
the published front.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
renderInlineEditableButtonLabel(block.props.label);
renderButtonControls(getBlockControlsForType("button"));
renderPublishedButton(block.props);
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

- Button label can be edited on canvas and in the inspector through one path.
- Variant/size/target/accent edits re-render published output truthfully.
- Inspector widgets adopt the shared dedicated control surface.

Error handling:

- Invalid URLs/targets remain clamped to the existing safe contract.
- Empty required labels fall back to the current valid value.

Regression-test shape:

- Vitest UI and runtime coverage for label edits and Button prop truthfulness.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Button fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Button runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
