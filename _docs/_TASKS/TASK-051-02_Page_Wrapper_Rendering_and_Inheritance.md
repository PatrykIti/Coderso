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
This subtask also unifies runtime preview rendering so preview output matches
published runtime output for all previewable targets.

---

## Rendering Requirements

1) **Public render**
   - Wrap `<main>` with a page wrapper that uses `page.data.settings.layout`.
   - Apply background color/image at wrapper level.
   - Apply section gap between widgets.

2) **Preview render**
   - Same wrapper logic for preview (admin preview + public preview).
   - No separate visual pipeline that bypasses runtime renderer/theme rules.

3) **Widget template runtime preview**
   - Template preview must use the same widget runtime renderer stack.
   - Theme/layout token resolution must match runtime rules used by published pages.

---

## Unified Preview Contract (Runtime)

1) Preview endpoints return a consistent response contract:
- `previewUrl`
- `expiresAt`
- optional metadata (for UI only)

2) `/preview` runtime route supports all preview target types used by admin:
- `page`
- `content`
- `widget-template`

3) Runtime preview and published runtime must share:
- token resolution
- wrapper/layout precedence
- widget rendering pipeline
- fallback behavior for missing optional assets

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
| `core/server/publicSite.tsx` | unify preview target rendering | page/content/widget-template |
| `core/widgets/renderers/widgetRenderer.tsx` | accept page defaults | only for inherit |
| `core/widgets/types.ts` | add `"inherit"` option for layout tokens | if needed |
| `core/services/pages/previewService.ts` | extend/confirm typed target support | include widget-template target |
| `core/server/routes/widgetTemplateRoutes.ts` | align preview response contract | return runtime preview URL |
| `core/services/widgets/widgetTemplatePreviewService.tsx` | remove isolated HTML-only path or adapt to unified runtime contract | avoid styling drift |
| `core/admin/ui/pages/builder/blockUtils.ts` | apply defaults to new blocks | optional |
| `tests/unit/site/publicRenderer.test.tsx` | new tests for wrapper + gap | |
| `tests/unit/site/publicSite.test.tsx` | preview parity tests | page/content/widget-template |
| `tests/integration/routes/widgetTemplatePreview.test.ts` | contract parity with other preview endpoints | |

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md` (wrapper flow)
- `_docs/PAGE_MODEL.md` (inheritance rules)
- `_docs/WIDGETS.md` (inherit + defaults)
- `_docs/PREVIEW_SPEC.md` (unified preview target contract)
- `_docs/CMS_API.md` (preview endpoint response consistency)
