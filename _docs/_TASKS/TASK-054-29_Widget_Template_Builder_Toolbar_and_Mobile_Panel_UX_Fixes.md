# TASK-054-29: Widget Template Builder — Toolbar and Mobile Panel UX Fixes
# FileName: TASK-054-29_Widget_Template_Builder_Toolbar_and_Mobile_Panel_UX_Fixes.md

**Priority:** 🟡 Medium
**Category:** Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-054-28 (Widget Template Builder Settings, Details, and Canvas Action Parity)
**Status:** ✅ **Done** (2026-03-19)

---

## Overview

Follow-up UX fixes for `WidgetTemplateEditorPage` identified after TASK-054-28 was merged.
Three separate issues were reported and resolved:

1. **Toolbar layout** — the sticky action bar above the canvas was rendered across 3 rows (label + subtitle, Discard + Save, History + mobile buttons), making it visually noisy and oversized.
2. **Toolbar full-width** — the toolbar had `mx-auto max-w-3xl` on the outer wrapper, so it was narrower than the canvas area and didn't touch the left/right sidebars. It should span edge-to-edge like the page builder.
3. **Settings panel grid overflow** — the Layout Controls section used `md:grid-cols-2 xl:grid-cols-3`. In the 320px right sidebar, `xl:grid-cols-3` produced ~83px columns, causing element overlap.
4. **Toolbar responsiveness** — on mobile widths all buttons (Settings, Details, History, Preview, Discard, Save Template) appeared in one row and overflowed.
5. **Mobile panel (Settings/Details)** — the dialog used for mobile Settings/Details was `sm:max-w-4xl` with fixed-height constraints, making it too wide on narrow screens and non-scrollable. Should match the `Sheet` pattern from `PageSettingsDrawer`.

---

## Files Changed

- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`

---

## Sub-Tasks

### TASK-054-29-1: Consolidate toolbar into single row

**Status:** ✅ Done

Replaced the 3-row `flex-col` toolbar with a single `flex items-center` row:
- "Template canvas" label (hidden on xs, visible `sm:block`)
- `flex-1` spacer
- Mobile-only Settings/Details buttons (`lg:hidden`)
- History (icon-only button, always visible)
- Preview (full label on `sm+`, icon-only on mobile)
- Discard (hidden on mobile `sm:inline-flex`)
- Save Template (shortened to "Save" on mobile via `sm:hidden`/`sm:inline` spans)

### TASK-054-29-2: Fix toolbar full-width span

**Status:** ✅ Done

Moved `mx-auto max-w-3xl` from the outer `div` to the inner content `div`, and removed `p-10` from `<main>`. The outer wrapper is now `w-full`, making the toolbar border span from the left sidebar edge to the right sidebar edge — identical to the page builder (`PageEditor`) pattern.

Canvas content padding (`px-6 py-8`) is preserved on the inner content div.

### TASK-054-29-3: Fix settings panel grid overflow

**Status:** ✅ Done

Changed Layout Controls grid from `grid gap-3 md:grid-cols-2 xl:grid-cols-3` to `grid grid-cols-2 gap-3`. The `xl:grid-cols-3` breakpoint was causing ~83px columns in the 320px sidebar, which caused visible overflow/overlap of select elements.

### TASK-054-29-4: Replace Dialog with Sheet for mobile panel

**Status:** ✅ Done

Replaced the `Dialog` (full-screen, non-scrollable on mobile) with a `Sheet` matching the `PageSettingsDrawer` pattern:
- `side="right"`, `sm:max-w-md`
- `showCloseButton={false}` with a manual `SheetClose` X button in the header
- `ScrollArea className="h-full"` for both Settings and Details tabs
- Imports updated: removed `Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription`, added `Sheet/SheetContent/SheetTitle/SheetClose`
- Added `X` icon from `lucide-react`

---

## Testing Requirements

- No logic changes — UI/layout only.
- Manually verify:
  - [ ] Toolbar renders as a single row at full canvas width (touching left and right panels)
  - [ ] On mobile viewport: History shows as icon, Preview as icon, Discard hidden, Save shows "Save"
  - [ ] Settings/Details buttons on mobile open a Sheet from the right
  - [ ] Sheet is scrollable for both Settings and Details tabs
  - [ ] Settings panel grid shows 2 columns without overflow in the sidebar
  - [ ] No TypeScript errors (`bun --cwd core lint:types`)

---

## Documentation Updates Required

- None. UI-only fix, no API or architecture contract changes.

---

## Changelog

- Entry: `503-2026-03-19-task-054-29-widget-template-builder-toolbar-mobile-panel-ux.md`
