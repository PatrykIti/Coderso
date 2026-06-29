# TASK-479-10-L02: Menu Editor & Design Editor Restyle
# FileName: TASK-479-10-L02-Menu-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Menus
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-10-L01, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-10

---

## Overview

Restyle the two menu editing surfaces to the prototype look:

1. **Menu structure editor** (`MenuEditorPage.tsx`) — the nested, draggable item
   list + item-settings inspector. Port the prototype's rounded item rows
   (grip handle, nested `CornerDownRight` indent, mono URL line, active
   highlight), the soft inspector rows wrapping the EXISTING `MenuItemForm`
   fields (`Navigation Label` / `Link Type` / `Page`|`URL` / `Parent` /
   `Visibility` / `Badge` / `Description` / `Icon`), and the dashed "Add menu
   item" affordance. (The prototype's "Open in new tab" switch is dropped — the
   real menu item schema has no such field; see Out of scope.)
2. **Menu design editor** (`MenuDesignEditorPage.tsx`) — the shared `PageEditor`
   host bound to a menu. This file is mostly host wiring; the restyle here is
   limited to the small bits of chrome it owns directly (the settings sheet form,
   the canvas-chrome fallback states, the empty/loading copy) so they read in the
   new design language. The shared `PageEditor` surface itself is restyled by its
   own TASK-479 page-editor leaf, not here.

This is presentation-only. Drag-and-drop ordering, nesting/parent rules,
dirty-state tracking, save/publish, and the `PageEditorHost` contract are
preserved exactly.

- **Goal:** Make the menu structure editor and the menu-design chrome match
  `_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx` without changing any
  ordering, dirty-state, save/publish, or host-contract behavior.
- **Owning module/service:** `core/admin/ui/menus/MenuEditorPage.tsx`,
  `core/admin/ui/menus/MenuDesignEditorPage.tsx`, and the leaf components they
  compose (`MenuTree.tsx`, `MenuItemRow.tsx`, `MenuItemForm.tsx`,
  `MenuItemDrawer.tsx`, `MenuAppearancePanel.tsx`).
- **Source-of-truth docs:**
  - PROTOTYPE source to port: `_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx`
    (`MenuItem` row shape, `InspectorRow`, `EditorPreviewFrame` 3-pane layout,
    dashed add-item button, soft/outline badges).
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`.
  - Real host contract: `core/admin/ui/pages/editor/pageEditorHostContract.ts`,
    `core/admin/ui/pages/PageEditor.tsx`.
  - Real item logic to preserve: `core/admin/ui/menus/menuDnD.ts`,
    `core/admin/ui/menus/MenuTree.tsx`, `MenuItemRow.tsx`, and the
    `replaceMenuItems` / `updateMenu` services in `menusClient.ts`.
- **Out of scope:** No change to drag/order math (`menuDnD.ts`, `MenuDropIntent`,
  `flattenMenuItems`/`buildDisplayTree`), to the menu item schema /
  `normalizeMenuItemSettings` (which exposes only `visibility` /`badge` /
  `description` /`icon` on `MenuItemSettings`, plus `label`/`href`/`pageId`/
  `parentId` on `MenuItemRecord` — there is **no** `openInNewTab`/link-target
  field; do not introduce one), to `replaceMenuItems`/`updateMenu`, to publish or
  cache keys, or to the shared `PageEditor` internals. Do not alter the
  `PageEditorHost` object returned by `MenuDesignEditorPage` (only restyle the
  JSX it renders: settings form, canvas-chrome fallback, copy).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

### A. Structure editor item rows (`MenuTree.tsx` / `MenuItemRow.tsx`)

Port the prototype `MenuItem` shape onto the real draggable row, keeping every
drag handler, `data-*` hook, and the existing `MenuDropIntent` wiring.

```tsx
// core/admin/ui/menus/MenuItemRow.tsx — restyle the row container only.
// Ports visuals from _docs/_PROTOTYPE/.../MenuEditorPreview.tsx <MenuItem/>.
<div className={nested ? "pl-8" : undefined}>
  <div
    {...dragHandlers}                         // KEEP existing dnd props/refs
    data-menu-item-row=""                     // KEEP existing test/dnd hooks
    className={cn(
      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-accent",
      isActive ? "border-primary bg-primary-soft/40" : "border-border bg-card",
      hasError && "border-destructive/40",     // preserve error status styling
    )}
  >
    <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
    {nested ? <CornerDownRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium">{item.label}</div>
      <div className="truncate font-mono text-xs text-muted-foreground">{item.href ?? pageHref}</div>
    </div>
    {/* keep existing per-row controls (edit/delete drawer triggers) */}
  </div>
</div>
```

### B. Item-settings inspector (`MenuItemForm.tsx` / `MenuItemDrawer.tsx`)

```tsx
function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
// Wrap the EXISTING `MenuItemForm` fields (controlled inputs bound to the
// `MenuItemFormValue` the drawer derives from `MenuItemDraft`) in InspectorRow —
// re-skin only; bind to REAL fields, invent none:
//   Navigation Label -> <Input value={value.label} … />
//   Link Type        -> existing Page|URL segmented toggle (value.linkType)
//   Page / URL       -> <Select value={value.pageId} …> / <Input value={value.href} className="font-mono text-xs" … />
//   Parent Item      -> <Select value={value.parentId ?? "root"} …>
//   Visibility       -> <Select value={value.visibility} …> with the REAL enum
//                       (`menuVisibilityOptions` = all | logged_in | logged_out →
//                        "Show to everyone" / "Only logged-in users" / "Only logged-out users")
//   Badge Label / Badge Tone / Description / Icon Name -> existing Inputs/Selects
// There is NO "open in new tab"/link-target field on the menu item schema
// (`MenuItemRecord` / `MenuItemSettings`) — do NOT add a Switch for one (forbidden
// schema change). All onChange handlers, validation, and dirty tracking stay as-is.
```

### C. Dashed add-item affordance + page chrome

```tsx
// "Add menu item" CTA (ports the prototype dashed button) wired to the REAL add handler:
<button onClick={handleAddItem} className="mt-3 flex w-full items-center justify-center gap-2
  rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground
  transition-colors hover:border-primary/50 hover:text-primary">
  <LinkIcon className="size-4" /> Add menu item
</button>
// Header keeps PageHeader (@/ui/shared/PageHeader) with the existing Save + Publish
// buttons and the live status badge; only swap to soft/violet variants.
```

### D. Design-editor chrome (`MenuDesignEditorPage.tsx`)

Restyle ONLY the JSX the page owns directly — do not touch the `host` object:

- `MenuDesignSettingsForm`: wrap the name field in the soft label/Input shape,
  keep `updateMenu(detail.id, { name })`, dirty/save logic, and the "Open
  structure editor" navigate button (route shape unchanged).
- `MenuDesignCanvasChrome`: keep the loading/error/ready state machine and the
  `SiteHeaderNav` live preview; only restyle the dashed fallback card to
  `rounded-2xl` warm-neutral copy.

**Data flow:** unchanged. Structure editor: cache-first `getMenuWithItemsCached`
→ `buildDisplayTree` → draggable tree → `replaceMenuItems`/`updateMenu` on save;
dirty state still guards navigation. Design editor: the `PageEditorHost`
(`freshnessMode: "forced-clean-replace"`, `detailCacheKey: cacheKeys.menuDetail`,
`saveDocument`/`publish`) is preserved verbatim.

**Error handling:** preserve the existing `Alert`/inline error surfaces and the
canvas-chrome `loading`/`error` fallbacks; only restyle them.

**Hooks rules:** no sync setState in effects; keep the existing lazy-init
(`useState(() => …)`) for `resolvedMenuId` and the remount-keyed settings form.
Do not add mount-force refetch loops; do not overwrite dirty drafts on
background revalidation.

**Regression-test shape:** see TASK-479-10-L03 — assert a nested item renders the
indent affordance, the inspector renders Navigation Label / URL / Visibility (real
`all`/`logged_in`/`logged_out` enum) plus the other existing `MenuItemForm` fields
bound to the form value (no fabricated open-in-new-tab Switch), the add-item button
calls the real add handler, dirty-state save still
fires `replaceMenuItems`/`updateMenu`, and the design page still mounts the
shared `PageEditor` with the menu host.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-item-form.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-design-editor-flow.test.tsx tests/vitest/ui/menu-editor-refresh-policy.test.tsx`

All existing editor/tree/dnd/design suites must stay green (ordering,
dirty-state, validation, refresh policy). State in the summary if anything was
skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-10-L02`.
- No host-contract or `menusClient` doc edits (restyle only; no contract change).
