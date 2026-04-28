# 503 — Widget Template Builder: Toolbar and Mobile Panel UX Fixes

**Date:** 2026-03-19
**Version:** —
**Tasks:** TASK-054-29

---

## Key Changes

### Admin/UI — WidgetTemplateEditorPage

- **Toolbar consolidated to single row.** Replaced the previous 3-row action bar (label + subtitle row, Discard + Save row, History + mobile buttons row) with a single `flex items-center` row: label | spacer | [Settings/Details mobile] | History | Preview | Discard | Save Template.

- **Toolbar spans full canvas width.** Moved `mx-auto max-w-3xl` from the outer sticky wrapper to the inner content div. Removed `p-10` from `<main>`. The toolbar border now touches both the left and right sidebars, matching the page builder (`PageEditor`) pattern. Canvas content padding is preserved on the inner div.

- **Toolbar responsive.** On mobile widths: History is icon-only, Preview is icon-only, Discard is hidden, Save Template is shortened to "Save". Reduces overflow at narrow viewports.

- **Settings panel grid fixed.** Layout Controls grid changed from `md:grid-cols-2 xl:grid-cols-3` to `grid-cols-2`. The `xl:grid-cols-3` breakpoint produced ~83px columns in the 320px sidebar, causing select element overflow/overlap.

- **Mobile Settings/Details panel replaced Dialog with Sheet.** The `Dialog` (full-width, hard to scroll) is replaced by a `Sheet` with `side="right"` and `sm:max-w-md`, matching `PageSettingsDrawer`. Both Settings and Details tabs now use `ScrollArea className="h-full"` for full scrollability on mobile.
