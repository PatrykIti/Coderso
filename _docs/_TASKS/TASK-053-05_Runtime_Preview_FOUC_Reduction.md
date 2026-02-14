# TASK-053-05: Runtime Preview FOUC Reduction
# FileName: TASK-053-05_Runtime_Preview_FOUC_Reduction.md

**Priority:** Medium  
**Category:** CMS/Pages + Runtime + Preview  
**Estimated Effort:** Medium  
**Dependencies:** TASK-045-03, TASK-052-05  
**Status:** Done (2026-02-14)  

---

## Overview

Reduce flash of unstyled content (FOUC) when opening runtime preview for pages and entries.

Current HTML renders immediately while the CSS bundle loads, causing a brief unstyled frame. We should make CSS loading more deterministic and hide preview content until CSS is ready.

---

## Scope

1. **Preload CSS**: add `<link rel="preload" as="style">` for the resolved CSS bundle.
2. **Ensure stylesheet priority**: keep `<link rel="stylesheet">` in head.
3. **Preview-only hide**: hide body until CSS is loaded in preview mode only.
4. **Keep SSR safe**: changes must work for pages + entries + preview routes.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/site/renderPublicPage.tsx` | update | add preload + preview-only hide logic (inline style + onload) |
| `core/site/renderPublicEntry.tsx` | update | keep consistent with page rendering |
| `core/server/publicSite.tsx` | verify | ensure CSS href resolution is stable in preview mode |
| `tests/unit/site/publicRenderer.test.tsx` | update | assert CSS preload + stylesheet tags presence |

---

## Acceptance Criteria

1. Runtime preview no longer shows a noticeable unstyled flash (or is significantly reduced).
2. CSS link tags are deterministic and consistent across pages and entries.
3. Preview still works with both dev and production asset sources.

---

## Testing Requirements

- `bun test tests/unit/site/publicRenderer.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` (runtime preview render pipeline + CSS handling)
