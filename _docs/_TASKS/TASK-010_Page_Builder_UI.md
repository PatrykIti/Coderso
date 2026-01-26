# TASK-010: Page Builder UI
# FileName: TASK-010_Page_Builder_UI.md

**Priority:** High
**Category:** CMS/PageBuilder
**Estimated Effort:** Large
**Dependencies:** TASK-002, TASK-009, TASK-024
**Status:** Done (2026-01-26)

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
core/admin/ui/pages/
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

## Commands (if needed)

No new dependencies.

---

## Sub-Tasks

### TASK-010-01_Block_list_and_ordering

**Status:** Done (2026-01-26)

- Add blocks from a widget picker.
- Drag and drop reorder.
- Duplicate and delete blocks.

Rules:
- Ensure unique `id` per block.
- Use `widgetRegistry` to list available widgets.
- Unknown widget type shows placeholder + warning.

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
| `core/admin/ui/pages/builder/BlockList.tsx` | list + drag reorder |
| `core/admin/ui/pages/builder/WidgetPicker.tsx` | add block UI |

Block list sketch:

```tsx
function BlockList({ blocks, onReorder }) {
  return blocks.map((block, index) => (
    <BlockToolbar key={block.id} index={index} />
  ));
}
```

Toolbar sketch:

```tsx
function BlockToolbar({ onDuplicate, onDelete }) {
  return (
    <div>
      <button onClick={onDuplicate}>Duplicate</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  );
}
```

---

### TASK-010-02_Wizard_flow

**Status:** Done (2026-01-26)

- Wizard asks minimal questions and sets variant.
- On finish, switch to Visual mode.
- Store wizard progress in `editor` metadata only.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | wizard UI |

Wizard sketch:

```tsx
<WizardPanel
  widget={widget}
  onComplete={(variant, data) => setBlock({ ...block, variant, data })}
/>
```

---

### TASK-010-03_Visual_mode

**Status:** Done (2026-01-26)

- Variant picker with previews.
- Show only fields relevant to chosen variant.
- Persist chosen variant to block data.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | visual editor |

Visual sketch:

```tsx
<VisualPanel
  variants={widget.variants}
  selected={block.variant}
  onSelect={(v) => setBlock({ ...block, variant: v })}
/>
```

---

### TASK-010-04_Advanced_mode

**Status:** Done (2026-01-26)

- Layout panel for spacing, margins, container width.
- Per-device visibility toggles.
- Only allow tokens defined in `PAGE_MODEL.md`.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | advanced controls |
| `core/admin/ui/pages/builder/LayoutPanel.tsx` | layout tokens |

Layout panel sketch:

```tsx
<LayoutPanel
  value={block.layout}
  onChange={(layout) => setBlock({ ...block, layout })}
/>
```

Block settings sketch:

```tsx
function BlockSettings({ block, onChange }) {
  return <AdvancedPanel value={block.layout} onChange={(layout) => onChange({ ...block, layout })} />;
}
```

---

### TASK-010-05_Save_and_publish

**Status:** Done (2026-01-26)

- Save draft via `PATCH /pages/:id`.
- Publish via `POST /pages/:id/publish`.
- Warn about unsaved changes.
- Strip `editor` metadata before publish.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/pages/PageEditor.tsx` | save/publish actions |
| `core/admin/ui/pages/PageList.tsx` | list + status |

Save sketch:

```ts
await fetch(`/admin/api/pages/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
  body: JSON.stringify({ data: stripEditor(blocks) }),
});
```

Page list sketch:

```tsx
<PageList items={pages} onOpen={(id) => navigate(`/pages/${id}`)} />
```

---

## Testing Requirements

- [ ] `tests/unit/pageBuilder/blockList.test.tsx` add/reorder/delete blocks.
- [ ] `tests/unit/pageBuilder/wizardFlow.test.tsx` wizard sets variant.
- [ ] `tests/integration/ui/pageBuilder.test.tsx` save + publish flow.
- [ ] `tests/unit/pageBuilder/advancedPanel.test.tsx` validates layout tokens.
- [ ] `tests/unit/pageBuilder/unsavedChanges.test.tsx` warns on navigate.

---

## New Files to Create

- `core/admin/ui/pages/PageList.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/BlockToolbar.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/WizardPanel.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`
- `core/admin/ui/pages/builder/AdvancedPanel.tsx`
- `core/admin/ui/pages/builder/WidgetPicker.tsx`
- `core/admin/ui/pages/builder/LayoutPanel.tsx`
- `tests/unit/pageBuilder/blockList.test.tsx`
- `tests/unit/pageBuilder/wizardFlow.test.tsx`
- `tests/unit/pageBuilder/advancedPanel.test.tsx`
- `tests/unit/pageBuilder/unsavedChanges.test.tsx`
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
