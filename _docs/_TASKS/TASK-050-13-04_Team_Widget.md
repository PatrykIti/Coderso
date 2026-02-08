# TASK-050-13-04: Team Widget
# FileName: TASK-050-13-04_Team_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-13-03  
**Status:** To Do

---

## Overview

Implement Team widget for company/about sections.

---

## Scope

- Widget ID: `team`
- Variants: `cards`, `compact-list`, `spotlight`
- Model:
  - header: `title`, `description`
  - members[]: `name`, `role`, `bio`, `photo`, `socialLinks[]`
  - style: `columns`, `gap`, `cardSurface`, `cardBorder`, `radius`
- Wizard: add first members
- Visual: member editing + social links + style
- Advanced: technical layout tokens

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/team.tsx` | new model/schema/defaults/render | deterministic member cards |
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | new editors | Visual-first |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register definition | catalog |
| `tests/unit/widgets/team.test.tsx` | new tests | schema/defaults/render |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/team.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-team-widget.md`
