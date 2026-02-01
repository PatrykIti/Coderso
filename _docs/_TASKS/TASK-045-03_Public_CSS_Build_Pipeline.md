# TASK-045-03: Public CSS Build Pipeline
# FileName: TASK-045-03_Public_CSS_Build_Pipeline.md

**Priority:** 🔴 High  
**Category:** Site/Appearance  
**Estimated Effort:** Medium  
**Dependencies:** TASK-045-02  
**Status:** 🟡 To Do

---

## Overview

Frontend (public site) needs **dedicated CSS** independent from admin UI.  
Goal: build `dist/site/site.css` and load it in public page render (SSR).

No JS bundle required at this stage — just CSS + CSS variables.

---

## Build Plan

1. Add `core/site/styles.css` with Tailwind layers and site tokens:
   ```css
   @import "tailwindcss";
   @layer base {
     :root {
       --site-bg: #ffffff;
       --site-text: #0f172a;
     }
     body { background: var(--site-bg); color: var(--site-text); }
   }
   ```

2. Add `core/site/tailwind.config.ts` (separate from admin).

3. Add build script:
   - `bun --cwd core x tailwindcss -i site/styles.css -o dist/site/site.css`

4. Update `renderPublicPageHtml` to use `dist/site/site.css` when present.

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| CSS | `core/site/styles.css` | base + tokens |
| Config | `core/site/tailwind.config.ts` | site theme |
| Script | `core/package.json` | `build:site-css` |
| Renderer | `core/site/renderPublicPage.tsx` | use `/site/site.css` |

---

## Testing Requirements

- Unit: ensure renderer includes CSS link when file exists.
- Lint/Types.

---

## Documentation Updates Required

- `_docs/SITE_THEMES.md` (build pipeline section)
- `_docs/_CHANGELOG/<new>.md`
