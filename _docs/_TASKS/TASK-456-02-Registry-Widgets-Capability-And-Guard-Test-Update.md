# TASK-456-02: Registry Widgets Capability And Guard Test Update
# FileName: TASK-456-02-Registry-Widgets-Capability-And-Guard-Test-Update.md

**Parent Task:** TASK-456
**Priority:** High
**Category:** Pages / Page Editor V2 / Forms
**Estimated Effort:** Large
**Dependencies:** TASK-456-01
**Status:** ⏳ To Do

---

## Overview

Implement the frozen contract: capability flip (`form` into
`editorInsertableBlockTypes`, gating reason removed, palette entry), registry
controls (formId combobox + title text), the NEW combobox primitive
(`ComboboxControl` in `editorControls/` + `combobox` model kind in the
adapter with dynamic options sources — single owner of this primitive; the
TASK-457 family reuses it), canvas-safe form preview, and the deliberate
TASK-452 guard-test update to the new frozen catalog. All four layers per the
4-layer rule; existing public submit pipeline untouched.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// adapter: resolvePageEditorControlUiModel gains
// { kind: "combobox", optionsSource } for select controls flagged with an
// optionsSource; PageEditor wires sources: forms -> listFormsCached().
// ComboboxControl: searchable list, keyboard accessible, dark chrome,
// allowNull "None" row; marks dangling current value.
// Capability flip + palette entry in pageDocumentV2.ts; TASK-452 suites
// updated to 15/4 with title "Form" asserted present.
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
