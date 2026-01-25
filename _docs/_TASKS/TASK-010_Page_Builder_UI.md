# TASK-010: Page Builder UI
# FileName: TASK-010_Page_Builder_UI.md

**Priority:** High
**Category:** CMS/PageBuilder
**Estimated Effort:** Large
**Dependencies:** TASK-002, TASK-009
**Status:** To Do

---

## Overview

Build the admin page builder UI with block management and the
Wizard/Visual/Advanced configuration flow for widgets.

**Goals:**
- Add/reorder/delete blocks.
- Wizard -> Visual -> Advanced flow per widget.
- Save draft and publish actions.

---

## Architecture

```
admin/ui/pages/
  PageList.tsx
  PageEditor.tsx
  builder/
    BlockList.tsx
    BlockToolbar.tsx
    BlockSettings.tsx
    WizardPanel.tsx
    VisualPanel.tsx
    AdvancedPanel.tsx
    WidgetPicker.tsx
    LayoutPanel.tsx

tests/unit/pageBuilder/
  blockList.test.tsx
  wizardFlow.test.tsx
```

---

## Sub-Tasks

### TASK-010-01_Block_list_and_ordering

**Status:** To Do

- Add blocks from a widget picker.
- Drag and drop reorder.
- Duplicate and delete blocks.

Example block creation:

```ts
const newBlock: Block = {
  id: crypto.randomUUID(),
  type: "hero",
  variant: "centered",
  data: {},
  layout: { container: "default" },
  visibility: { devices: ["desktop", "mobile"], enabled: true },
  editor: { mode: "wizard", wizardCompleted: false },
};
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/pages/builder/BlockList.tsx` | list + drag reorder |
| `admin/ui/pages/builder/WidgetPicker.tsx` | add block UI |

---

### TASK-010-02_Wizard_flow

**Status:** To Do

- Wizard asks minimal questions and sets variant.
- On finish, switch to Visual mode.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/pages/builder/WizardPanel.tsx` | wizard UI |

---

### TASK-010-03_Visual_mode

**Status:** To Do

- Variant picker with previews.
- Show only fields relevant to chosen variant.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/pages/builder/VisualPanel.tsx` | visual editor |

---

### TASK-010-04_Advanced_mode

**Status:** To Do

- Layout panel for spacing, margins, container width.
- Per-device visibility toggles.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/pages/builder/AdvancedPanel.tsx` | advanced controls |
| `admin/ui/pages/builder/LayoutPanel.tsx` | layout tokens |

---

### TASK-010-05_Save_and_publish

**Status:** To Do

- Save draft via `PATCH /pages/:id`.
- Publish via `POST /pages/:id/publish`.
- Warn about unsaved changes.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/pages/PageEditor.tsx` | save/publish actions |
| `admin/ui/pages/PageList.tsx` | list + status |

---

## Testing Requirements

- [ ] `tests/unit/pageBuilder/blockList.test.tsx` add/reorder/delete blocks.
- [ ] `tests/unit/pageBuilder/wizardFlow.test.tsx` wizard sets variant.
- [ ] `tests/integration/ui/pageBuilder.test.tsx` save + publish flow.

---

## New Files to Create

- `admin/ui/pages/PageList.tsx`
- `admin/ui/pages/PageEditor.tsx`
- `admin/ui/pages/builder/BlockList.tsx`
- `admin/ui/pages/builder/BlockToolbar.tsx`
- `admin/ui/pages/builder/BlockSettings.tsx`
- `admin/ui/pages/builder/WizardPanel.tsx`
- `admin/ui/pages/builder/VisualPanel.tsx`
- `admin/ui/pages/builder/AdvancedPanel.tsx`
- `admin/ui/pages/builder/WidgetPicker.tsx`
- `admin/ui/pages/builder/LayoutPanel.tsx`
- `tests/unit/pageBuilder/blockList.test.tsx`
- `tests/unit/pageBuilder/wizardFlow.test.tsx`
- `tests/integration/ui/pageBuilder.test.tsx`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (editor metadata rules).
- `_docs/CMS_SPEC.md` (page builder UX notes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-page-builder-ui.md`
- Notes: page builder UI and widget configuration flow.

---

## Additional Docs

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md`
