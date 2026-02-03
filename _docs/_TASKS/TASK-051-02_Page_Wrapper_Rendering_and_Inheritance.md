# TASK-051-02: Page Wrapper Rendering + Inheritance
# FileName: TASK-051-02_Page_Wrapper_Rendering_and_Inheritance.md

**Priority:** High  
**Category:** Site/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-051-01  
**Status:** To Do

---

## Overview

Apply page-level layout settings at render time and implement inheritance rules
so widgets can default to page settings when not explicitly configured.

---

## Rendering Requirements

1) **Public render**
   - Wrap `<main>` with a page wrapper that uses `page.data.settings.layout`.
   - Apply background color/image at wrapper level.
   - Apply section gap between widgets.

2) **Preview render**
   - Same wrapper logic for preview (admin preview + public preview).

---

## Inheritance Rules

If a widget block has `layout.container` or `layout.padding` set to `"inherit"`:
1) Resolve from `page.settings.layout.sections.defaults`
2) Otherwise fallback to widget default layout tokens.

If no `inherit` is used, block settings win.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/site/renderPublicPage.tsx` | wrap main with layout | apply background + gap |
| `core/server/publicSite.tsx` | pass layout settings to renderer | preview + public |
| `core/widgets/renderers/widgetRenderer.tsx` | accept page defaults | only for inherit |
| `core/widgets/types.ts` | add `"inherit"` option for layout tokens | if needed |
| `core/admin/ui/pages/builder/blockUtils.ts` | apply defaults to new blocks | optional |
| `tests/unit/site/publicRenderer.test.tsx` | new tests for wrapper + gap | |

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md` (wrapper flow)
- `_docs/PAGE_MODEL.md` (inheritance rules)
- `_docs/WIDGETS.md` (inherit + defaults)
