# TASK-456-01: Form Controls Contract And Capability Plan
# FileName: TASK-456-01-Form-Controls-Contract-And-Capability-Plan.md

**Parent Task:** TASK-456
**Priority:** High
**Category:** Pages / Page Editor V2 / Forms
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Freeze the form-block authoring contract before code: verify the exact block
props in `pageBlockDefaultProps` (`formId`, `title` — confirm), the runtime
fail-closed shape for missing/dangling `formId` (read the form branch in
`pageRendererV2.tsx` / the scoped binding from TASK-418-06-L04), the canvas
representation (fields preview with submit disabled in canvas mode), the
combobox control contract (dynamic options from `listFormsCached()`,
searchable, dark-toolbar chrome), and the exact TASK-452 amendment values
(15 insertable blocks, 4 gated, palette title "Form"). Record decisions in
this file; the implementation leaf executes from it.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Contract artifacts to freeze here:
// 1. props table (key, schema, default, control)
// 2. combobox model kind shape for pageEditorControlUiModel:
//    { kind: "combobox", optionsSource: "forms", placeholder, allowNull }
// 3. canvas-mode interactivity gate: layoutMode === "canvas" -> fieldset disabled
// 4. TASK-452 new frozen values (documented diff)
```

---

## Security Contract

- **Endpoint visibility:** no new endpoints (see the parent family contract).
- **Auth model / RBAC / CSRF / rate-limit:** unchanged.
- **Validation:** schema-owned props with reject-unknown preserved.
- **Anti-abuse controls:** existing public pipelines untouched.

---

## Testing Requirements

- Targeted Vitest suites for this leaf.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root `npx tsc -p tsconfig.json --noEmit`.

---

## Documentation Updates Required

- Covered by the parent family closure leaf.
