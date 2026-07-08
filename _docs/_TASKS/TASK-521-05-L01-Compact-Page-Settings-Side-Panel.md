# TASK-521-05-L01: Compact Page-Settings Side-Inspector Panel (relocation)

# FileName: TASK-521-05-L01-Compact-Page-Settings-Side-Panel.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-05
**Priority:** High
**Category:** Admin UI (Pages)
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the panel-shell / trigger region of
`core/admin/ui/pages/PageEditor.tsx`: relocates the page settings from the
full-height `SettingsSheet` drawer into a COMPACT panel in the right
side-inspector rail, triggered by a button next to the section-panel icon (reuse
`Settings2`). Moves ALL existing `SettingsSheet` fields — **Title** (`TextField`),
**Slug** (`TextField`), **Show-in-navigation**, **Revision-retention** — PLUS the
explicit **Save settings** action (a template read-out is additionally shown,
read-only) into the compact panel; L02 adds the Effects section into the same
panel. Disjoint from L02's Effects-controls region.

**Which fields move (verified vs live `SettingsSheet`, `:4876-4929`):** the drawer
is the SOLE edit surface for FIVE controls — Title, Slug, Show-in-nav,
Revision-retention, and a `Save settings` Button. `settingsTitle`/`settingsSlug`
(`:730-731`) are edited ONLY here (elsewhere they are read-only displays, `:2439`/
`:3041`); dropping them would strand page Title/Slug editing. ALL five relocate
verbatim.

**Commit model (decision):** the compact panel KEEPS the explicit `Save settings`
Button wired to `handleSettingsSave` (`:2230`), NOT live draft writes. Rationale:
`handleSettingsSave` persists title+slug (+data) via `updatePage` (`:2244-2245`) —
a DISTINCT flow from the normal draft-save that title/slug require; converting it
to live in-memory writes would silently change persistence semantics. Show-in-nav /
revision-retention keep their existing `setShowInNav`/`setRevisionRetention` state
and are committed by the same Save action, exactly as today. (521-05-L02's Effects
controls persist through `currentData.settings.effects` on the normal draft-save
path — see L02; the compact panel therefore has BOTH the explicit page-meta Save
button and the live-draft Effects section, matching each field's existing flow.)

## Grounded anchors

`Settings2` import (`:34`) — currently the icon inside the drawer trigger
(`:3048-3052`, `onClick={() => setSettingsOpen(true)}`). `SlidersHorizontal`
(`:35`) is the section-panel/"Show panel" icon (`:3024`, `:3154-3161`
`setPanelOpen`). State: `panelOpen`/`setPanelOpen` (`:675`), `settingsOpen`/
`setSettingsOpen` (`:729`). `SettingsSheet` component (`:4876-4929`) uses
`Sheet`/`SheetContent side="right"` (`:4903-4904`, the full-height drawer the owner
dislikes); its props are `title`/`slug`/`showInNav`/`revisionRetention`/`isSaving`
+ `onTitleChange`/`onSlugChange`/`onShowInNavChange`/`onRevisionRetentionChange`/
`onSave` (`:4876-4901`), rendering Title `TextField` (`:4909`), Slug `TextField`
(`:4910`), Show-in-nav `SelectField` (`:4911`), Revision-retention `NumberField`
(`:4917`), and the `Save settings` Button (`:4924`). State + wiring at the call
site (`:3243-3253`): `title={settingsTitle}` `slug={settingsSlug}`
`onTitleChange={setSettingsTitle}` `onSlugChange={setSettingsSlug}`
`onSave={handleSettingsSave}`. `settingsTitle`/`settingsSlug` state (`:730-731`);
`showInNav`/`revisionRetention` state; `handleSettingsSave` (`:2230`, persists
title+slug via `updatePage` `:2244-2245`). The compact inspector chrome precedent
is `ToolbarSubpanel` (`:3295-…`, the rounded scroll-safe rail panel with a header +
close button `:3361-3384`) and the reopen chip button (`:3018-3025`).

## Implementation pseudocode

```tsx
// (1) Add a compact "page settings" panel mode to the side-inspector rail.
//     Reuse the ToolbarSubpanel shell (or a sibling PageSettingsSubpanel that
//     mirrors its chrome) rather than the Sheet. A small state flag:
const [pageSettingsPanelOpen, setPageSettingsPanelOpen] = useState(false);

// (2) Trigger button NEXT TO the section-panel toggle (near :3154 where the
//     "Hide/Show panel" SlidersHorizontal button lives), reusing Settings2:
<ToolbarIconButton
  tooltip="Page settings"
  aria-pressed={pageSettingsPanelOpen}
  onClick={() => setPageSettingsPanelOpen((o) => !o)}
>
  <Settings2 className="h-4 w-4" />
</ToolbarIconButton>

// (3) Render the compact panel in the rail (same column as ToolbarSubpanel),
//     carrying ALL SettingsSheet fields verbatim: Title, Slug (TextFields),
//     Show-in-nav, Revision-retention, PLUS the explicit Save action. The panel
//     reuses the SAME state + handlers the Sheet used (:3243-3253) — this is a pure
//     relocation of the field set + save wiring, not a rewrite:
{pageSettingsPanelOpen && (
  <PageSettingsSubpanel
    panelTitle="Page settings"
    onClose={() => setPageSettingsPanelOpen(false)}
    title={settingsTitle} onTitleChange={setSettingsTitle}          // TextField (was :4909)
    slug={settingsSlug} onSlugChange={setSettingsSlug}              // TextField (was :4910)
    showInNav={showInNav} onShowInNavChange={setShowInNav}          // SelectField (was :4911)
    revisionRetention={revisionRetention}
    onRevisionRetentionChange={setRevisionRetention}               // NumberField (was :4917)
    isSaving={isSaving}
    onSave={handleSettingsSave}                                     // explicit Save (was :4924, :3253)
    template={pageDocument.settings.template}                      // read-only display
    effectsSlot={/* 521-05-L02 mounts the Effects section here */ null}
  />
)}
// PageSettingsSubpanel signature (mirrors SettingsSheet props minus open/onOpenChange,
// wrapped in ToolbarSubpanel chrome): { panelTitle, onClose, title, onTitleChange,
// slug, onSlugChange, showInNav, onShowInNavChange, revisionRetention,
// onRevisionRetentionChange, isSaving, onSave, template, effectsSlot }.

// (4) Remove the header "Page settings" Settings2 button (:3048) + the
//     SettingsSheet (:4876-4929) drawer, OR keep the button but repoint it to
//     setPageSettingsPanelOpen (owner: relocate, not duplicate). Preserve EVERY
//     field (Title/Slug/Show-in-nav/Revision-retention) + the explicit
//     handleSettingsSave (:2230, updatePage title+slug persistence) verbatim —
//     do NOT drop Title/Slug and do NOT convert the explicit Save to a live write.
```

**Reuse, don't reinvent:** the compact panel MUST reuse the existing rail chrome
(`ToolbarSubpanel` header/scroll/close styling, `editorPanel*` classes from
`controlChrome.ts`) so it visually matches the section/block panels. Keep the
field state + save path byte-equivalent — this is a RELOCATION, not a rewrite.

## Regression-test shape (delegated to L04, asserted here)

- The compact panel opens from the rail trigger (not a Sheet); ALL five fields are
  present and editable — **Title** + **Slug** (TextFields), **Show-in-nav**,
  **Revision-retention** — and Title/Slug/Show-in-nav/Revision-retention edits
  persist through the explicit Save action (`handleSettingsSave` → `updatePage`)
  identically to before; the full-height `SettingsSheet` is gone (or no longer the
  settings surface). L04's assertions MUST include Title + Slug persistence, not
  only showInNav/revisionRetention.

## Hard Invariants

1. Compact rail panel (reuse `ToolbarSubpanel` chrome), NOT `SheetContent`.
2. Trigger next to the section-panel icon, reusing `Settings2`.
3. ALL existing settings fields — Title, Slug, Show-in-nav, Revision-retention —
   AND the explicit `handleSettingsSave` (`updatePage` title+slug persistence) are
   preserved verbatim (relocation only). Title/Slug are NOT dropped and the explicit
   Save is NOT converted to a live draft write.
