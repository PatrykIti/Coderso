# TASK-425-01-L01: Define Responsive Panel Controls And Override Ownership
# FileName: TASK-425-01-L01-Define-Responsive-Panel-Controls-And-Override-Ownership.md

**Parent Subtask:** TASK-425-01
**Priority:** High
**Category:** Admin UI / Pages / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-425-01
**Status:** ⏳ To Do

---

## Overview

Define the metadata, labels, and ownership model for Responsive-panel controls
such as hide-on-screen, mobile-layout toggles, explicit reset actions, and
device readouts.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
export const pageResponsivePanelControls = defineResponsivePanelControls([
  toggle("visible.desktop"),
  toggle("visible.tablet"),
  toggle("layout.stackOnMobile"),
  action("resetOverride"),
]);
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Panel controls map onto the existing responsive override model.
- Labels distinguish Base, Override, and Inherited states explicitly.
- Device widths come from one shared constant source.

Error handling:

- Unsupported targets render no control rather than a fake toggle.
- Reset actions only appear when an override actually exists.

Regression-test shape:

- Vitest covers state projection, visibility of resets, and label/readout logic.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** panel metadata may only address schema-owned override fields.

---

## Testing Requirements

- Relevant Vitest coverage for responsive control metadata/state.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
