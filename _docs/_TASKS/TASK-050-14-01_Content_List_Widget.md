# TASK-050-14-01: Content List Widget
# FileName: TASK-050-14-01_Content_List_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Runtime + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-14, TASK-003-06, TASK-048  
**Status:** To Do

---

## Overview

Implement Content List widget to render entry collections from selected content type.
This is the key dynamic block for blog/news/case-study pages.

---

## Scope

- Widget ID: `content-list`
- Variants: `cards`, `list`, `compact`
- Model:
  - source: `contentTypeId`, `statusScope`, `limit`, `sort`
  - filters: `taxonomy`, `featuredOnly`, `searchQuery`, `authorId`
  - fields: `showImage`, `showExcerpt`, `showMeta`, `showCta`
  - emptyState: `title`, `description`
  - style: `columns`, `gap`, `cardStyle`
- Wizard:
  - choose content type
  - choose variant
  - set item count
- Visual:
  - data source + filters + list presentation
- Advanced:
  - technical query/fallback controls

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/contentList.tsx` | new model/schema/defaults/render | runtime data integration |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | new editors | source + style UX |
| `core/services/content/*` | extend querying helper if needed | safe filters |
| `core/widgets/runtime.tsx` | ensure runtime context mapping | preview/published parity |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register definition | catalog |
| `tests/unit/widgets/contentList.test.tsx` | new tests | model/render/query mapping |
| `tests/unit/site/publicRenderer.test.tsx` | add runtime assertions | SSR parity |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun test tests/unit/site/publicRenderer.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-list-widget.md`
