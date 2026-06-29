# TASK-479-19-L02: Product Editor Restyle
# FileName: TASK-479-19-L02-Product-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Commerce
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-19
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Restyle the **functional** product editor to the prototype look: a calm two-column
layout — a main column of soft `rounded-2xl` cards (Details / Media / Pricing /
Inventory) beside a sticky settings sidebar (Status / Organization / Price summary)
rendered as the EXISTING `EditorShell` right rail, with the left context rail kept
(restyled). The editor STAYS on the `EditorShell` 3-pane — it does NOT fork a second
inline sidebar that would duplicate the rail content. This is
a real, working editor — NOT the non-functional preview — so the product schema
(`commerceEditorModel` ↔ `CommerceProductInput`), the draft/snapshot dirty-state,
the cache hydrate + `cacheBus` revalidation, and the create/update/publish flows are
preserved exactly; only chrome, cards, and typography change.

- **Goal:** `core/admin/ui/commerce/CommerceEditorPage.tsx` and its render tree
  (`components/{CommerceEditorSections,CommerceContextPanel,CommerceCollectionsPanel}.tsx`)
  read like `_docs/_PROTOTYPE/src/pages/advanced/CommerceEditorPreview.tsx` — same
  warm tokens, rounded cards, soft sidebar — without losing any behavior.
- **Owning module/service:** `core/admin/ui/commerce/CommerceEditorPage.tsx`,
  `core/admin/ui/commerce/components/CommerceEditorSections.tsx`,
  `core/admin/ui/commerce/components/CommerceContextPanel.tsx`,
  `core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx`,
  `core/admin/ui/commerce/commerceEditorModel.ts` (read-only — types/transforms must
  NOT change shape).
- **Source-of-truth docs:** prototype editor
  `_docs/_PROTOTYPE/src/pages/advanced/CommerceEditorPreview.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard}.tsx`; prototype
  primitives `_docs/_PROTOTYPE/src/components/ui/{card,input,textarea,select,label,switch,separator,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`; the
  shared `EditorShell` restyled in TASK-479-06.
- **Out of scope:** No change to `commerceEditorModel.ts` (the `CommerceProductDraft`
  shape, `draftFromCommerceProduct`, `toCommerceProductInput`), the variants model,
  the `commerceClient` calls, `cachePolicy`/`cacheKeys`, or the create/update/publish
  navigation. NO new schema fields — the prototype's "Track inventory" Switch and
  numeric "Price" inputs are reproduced only over the EXISTING draft fields
  (`stockState`/`stockQuantity`, `pricingAmount` in minor units, `pricingCompareAtAmount`);
  do not introduce a boolean track flag or change the minor-units contract. NO new
  media uploader — the media tiles bind to the existing `mediaIdsText` field. The
  list restyle is L01. Tokens/shell land in TASK-479-05/06 and are consumed here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

The editor is wired through `EditorShell` (leftPanel = `CommerceContextPanel`,
rightPanel = `CommerceCollectionsPanel`, with mobile `Sheet`s). Keep that structure
and the `EditorShell` slots; restyle the regions and the section cards that fill
them. Do NOT alter the `productId`/`isCreateMode` resolution, the draft/snapshot
clone logic, the `subscribeCacheEvents(cacheKeys.commerceProductsList)` guard, or the
mobile `Sheet` open/close props.

```tsx
// 1) CommerceEditorPage.tsx header — port the prototype PageHeader + chrome:
//    keep breadcrumbs via the canonical EditorShell `breadcrumbs` prop
//    (["Coderso","Commerce", title]) and keep the REAL Back / Discard /
//    publish-toggle / Save handlers (handleDiscard, handleSave(publishTargetStatus),
//    handleSave()) and their disabled gating (disabled={!hasUnsavedChanges} on
//    Discard, disabled={isSaving} on Save). Restyle to the ghost+outline+primary
//    (violet) button set; render an unsaved-changes soft Badge from the existing
//    `hasUnsavedChanges` flag. No handler edits, no new state.

// 2) Keep the EditorShell 3-pane (main center column + left context rail + right
//    settings rail) — do NOT add a parallel `lg:grid-cols-[1fr_320px]` inline
//    sidebar inside the center column. EditorShell already renders leftPanel /
//    rightPanel as `hidden ... lg:flex` rails, so a second inline column re-rendering
//    the same panel content would DOUBLE it on lg+ (the collision to avoid). Instead:
//      - restyle the center column (drop the max-w-5xl framing for the prototype
//        card-stack spacing) to hold the main SectionCards (step 3);
//      - restyle the EXISTING right rail (CommerceCollectionsPanel) to BE the
//        prototype settings sidebar (Status / Organization / Price summary, step 4)
//        — it renders exactly once via the EditorShell rightPanel slot.
//    The existing mobile Sheets (mobileContextOpen / mobileDetailsOpen) stay the
//    small-screen fallback for those SAME rails — keep both Sheets, their triggers,
//    and the SAME leftPanel / rightPanel component instances (no forked copy, no
//    divergent state).

// 3) CommerceEditorSections.tsx — keep all controls + their bindings; reskin the
//    three Cards to the prototype SectionCard (rounded-2xl border bg-card shadow-card,
//    title + optional description, p-5). Re-label/group to the prototype:
//      - "Identity" -> "Details" (Title Input, Description Textarea). Slug/Excerpt/
//        Status stay bound but may move: Status -> the sidebar (step 4); slug +
//        excerpt remain in Details. EVERY value/onChange stays wired to onChange()
//        -> patchDraft (no field dropped).
//      - "Pricing": Amount (minor units) + Currency + Compare-at -> prototype 3-col
//        grid. Keep inputMode="numeric" and the minor-units placeholder/contract.
//      - "Stock" -> "Inventory": stockState Select + stockQuantity Input. The
//        prototype "Track inventory" Switch is decorative-over-real-data: bind it to
//        a DERIVED value (checked = draft.stockState !== "out_of_stock") and on
//        toggle call onChange({ stockState: next ? "in_stock" : "out_of_stock" }) —
//        i.e. it is sugar over the EXISTING stockState field, NOT a new schema field.
//    Media: add a "Media" SectionCard whose tiles bind to the EXISTING mediaIdsText
//    (currently edited in CommerceCollectionsPanel). Render the comma-separated ids
//    as thumbnail tiles with a "+ Add" tile; keep a text Input/Textarea fallback for
//    raw id entry so the field stays fully editable. onChange({ mediaIdsText }) only.

// 4) Settings sidebar = the EditorShell RIGHT RAIL (restyle CommerceCollectionsPanel
//    into the prototype Status / Organization / Price summary stack; it renders once
//    via the rightPanel slot + the mobile Sheet, NOT a duplicated inline column):
//      - "Status": status Select (draft.status, onChange -> patchDraft) + a publish
//        Button calling the existing handleSave(publishTargetStatus). Keep the
//        publishButtonLabel ("Publish" / "Move to draft") logic.
//      - "Organization": collections live in CommerceCollectionsPanel — restyle its
//        collection checkboxes to soft Badge/checkbox rows; keep onToggleCollection
//        + selectedIds wiring intact.
//      - "Price summary": render-time derivation from draft pricing (amount /
//        compare-at / discount %) using the existing minor-units values. Pure
//        display, writes no state. Use the prototype <dl>/<Separator> shape.

// 5) CommerceContextPanel.tsx: restyle lifecycle/context rows (created/updated,
//    unsaved indicator) to soft muted cards; keep the props (isCreateMode, draft,
//    product, hasUnsavedChanges). Replace its local amber statusStyles map with the
//    same shared StatusBadge as L01 (archived→secondary, NOT amber/warning) so the
//    status pill matches the list. Otherwise class swap only.
```

**Data flow:** `CommerceEditorPage` resolves `productId`/`isCreateMode` →
hydrates from cache (`getCachedCommerceProduct`) + `getCommerceProductCached(force)`
→ `draftFromCommerceProduct` seeds `draft` + `snapshot` → controls call
`patchDraft`/`toggleCollection` (set `hasUnsavedChanges`) → `handleSave` runs
`toCommerceProductInput(draft)` through `createCommerceProduct`/`updateCommerceProduct`
→ `applyProduct` resets snapshot + dirty. The restyle touches only JSX/classNames in
these render trees; the model transforms and client calls are untouched.

**Dirty-state (preserve):** Do not change when the editor marks dirty
(`patchDraft`/`toggleCollection` → `setHasUnsavedChanges(true)`), the
`handleDiscard` snapshot restore, or the `cacheBus` guard that skips background
refresh while `hasUnsavedChanges`. The restyle must not remount the form (no `key`
churn) or convert controlled inputs to uncontrolled — keep the same component
identities and the `value`/`onChange` controlled pattern so React preserves edit
state and the dirty flag. The new "Track inventory" Switch and "Price summary" are
derived at render — they add NO new source of truth.

**Schema constraint (preserve):** All inputs keep writing the EXISTING
`CommerceProductDraft` fields; `toCommerceProductInput` still produces the same
`CommerceProductInput` (title/slug/status/excerpt/description, pricing in minor
units, stock state+quantity, mediaIds, collectionIds, variants, metadata, data). No
field is added, dropped, or re-typed; reject-unknown-fields behavior at the client
schema boundary is unaffected.

**Navigation/href constraint (preserve):** Breadcrumbs, Back-to-list, and any links
must keep routing through `EditorShell` breadcrumbs / `AdminLink` / `adminPaths` /
the existing `navigate("/advanced/commerce/...")` calls. Do not hand-build hrefs
while restyling.

**React-hooks rules:** No new sync `setState` in effects. The derived Switch state
and price summary are computed at render (or `useMemo`), not stored. Respect the
existing `matchMedia`/Sheet logic in `EditorShell`; do not duplicate it.

**Error handling:** The editor `error`/`success` `Alert`s and the loading
placeholder keep their current copy and conditions; they inherit the new card/token
styling. No new error surfaces.

**Regression-test shape:** see L03 — render `CommerceEditorPage` in EDIT mode (push
an edit route + seed the cached product before mount, else it resolves create mode);
assert the main column renders the Details/Pricing/Inventory section cards with
`rounded-2xl`/`shadow-card`, the right-rail sidebar renders the Status Select still
bound to the draft, the header exposes Save + the publish toggle, editing the Title
input flips `hasUnsavedChanges` (Save enabled / Discard enabled), and toggling the
Inventory Switch flips `stockState` between `in_stock`/`out_of_stock` (behavioral
guard that the restyle did not sever schema wiring).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/commerce-editor-restyle.test.tsx`
  (new suite in L03)
- Re-run the existing Commerce suites to confirm no behavioral regression (model +
  client + schema must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts tests/vitest/validation/commerceSchemas.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-19-L02`.
- If the two-column editor layout or the derived Switch/price-summary treatment sets
  a pattern reused by other editors (e.g. Listings/Entries), record the decision in
  the editor/design notes touched by TASK-479-06 so the family stays consistent.
