# TASK-050-14-02: Entry Teaser Widget
# FileName: TASK-050-14-02_Entry_Teaser_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Runtime + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-14-01  
**Status:** Done (2026-02-08)

---

## Overview

Implement Entry Teaser widget for highlighted content placements.
Target output: one featured entry or manually selected entry teaser block.

---

## Scope

- Widget ID: `entry-teaser`
- Variants: `horizontal`, `vertical`, `minimal`
- Model:
  - sourceMode: `manual` | `latest` | `featured`
  - source: `contentTypeId`, `entryId`
  - fields: `showImage`, `showExcerpt`, `showMeta`, `showTags`
  - cta: `label`, `hrefMode`
  - style: `surface`, `border`, `radius`, `spacing`
- Wizard:
  - choose source mode
  - pick content type / entry
- Visual:
  - source + teaser content controls
- Advanced:
  - technical fallback behavior

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/entryTeaser.tsx` | new model/schema/defaults/render | deterministic source resolution |
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | new editors | source and display controls |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register definition | catalog |
| `tests/unit/widgets/entryTeaser.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/site/publicRenderer.test.tsx` | add runtime assertions | preview parity |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/entryTeaser.test.tsx`
- `bun test tests/unit/site/publicRenderer.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-teaser-widget.md`
