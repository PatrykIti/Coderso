# TASK-479-20-L02: Popup Editor Restyle
# FileName: TASK-479-20-L02-Popup-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done
**Parent Subtask:** TASK-479-20
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Overview

Restyle the real Popup **editor** to match the prototype: a redesigned `PageHeader`
(breadcrumbs + status badge + Save/Publish actions) and an editor frame with a
**left content rail**, a **center live popup preview** rendered from the real draft,
and a **right inspector** of grouped trigger/targeting/frequency/display settings.
This is the fully-functional editor (NOT the non-functional preview) — every config
field stays bound to the real `PopupEditorDraft` and the save/publish/discard flow
is preserved exactly.

- **Goal:** `core/admin/ui/popups/PopupEditorPage.tsx` +
  `core/admin/ui/popups/components/PopupEditorForm.tsx` look like
  `_docs/_PROTOTYPE/src/pages/advanced/PopupEditorPreview.tsx` (soft `rounded-2xl`
  editor frame, violet accents, a live centered popup card preview) while keeping
  every field wired through `onPatch` and the existing cache/dirty-state logic.
- **Owning module/service:** `core/admin/ui/popups/PopupEditorPage.tsx`,
  `core/admin/ui/popups/components/PopupEditorForm.tsx`, and (consumed, not changed)
  `core/admin/ui/popups/popupEditorModel.ts`. Optionally compose the shared editor
  shell / `CanvasEditor` floating-panel pattern from TASK-479-06-L05/L06 if it fits
  cleanly; otherwise restyle in place.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/advanced/PopupEditorPreview.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,EditorPreviewFrame}.tsx`
  (`EditorRailGroup`/`EditorRailItem`) and ui
  `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,input,select,switch}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `popupsClient`, the cache contract
  (`getCachedPopup`/`getPopupCached`/`cacheKeys.popupsList`/`cacheBus`), the
  `PopupRecord`/`PopupCreateInput` schema, the `toPopupInput`/`draftFromPopup`
  normalizers, or RBAC. No new editor features and no real overlay injection on the
  storefront — the center preview is an in-editor visual mock of the draft only.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the controller logic in `PopupEditorPage.tsx`: the
`resolvePopupId` parse, the lazy `getCachedPopup` init for `popup`/`draft`/
`snapshot`, the `getPopupCached({force:true})` hydrate effect, the
`subscribeCacheEvents(cacheKeys.popupsList)` revalidation **guarded by
`hasUnsavedChanges`** (no dirty-state overwrite), `patchDraft`, `handleDiscard`,
`handleSave(statusOverride?)`, and the `publishButtonLabel`/`publishTargetStatus`
derivation. Keep all handlers; only swap the layout/classes and re-skin
`PopupEditorForm` into the three-region frame.

```tsx
// PopupEditorPage.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader: keep isCreateMode title + description + the full actions cluster
//    (status Badge, Back to list, Discard[disabled=!hasUnsavedChanges],
//    Publish/Move-to-draft -> handleSave(publishTargetStatus), Save -> handleSave()).
//    Restyle to the prototype header (breadcrumbs already provided by AdminShell;
//    keep the existing breadcrumbs array). Buttons keep handlers + disabled states.

// 2) Replace the stacked <PopupEditorForm> cards with an EditorPreviewFrame-style
//    three-region layout. Build it from restyled primitives (or reuse the shared
//    EditorShell from TASK-479-06-L05). Pass the SAME `draft` + `onPatch={patchDraft}`
//    down so every control stays bound. Suggested shape:
<EditorFrame
  title="Popup editor"
  toolbar={<Badge variant="outline">{draft.name || "Untitled"} · {draft.status}</Badge>}
  left={/* Content rail: Heading / Text / Input / Button / Image rail items — these
           are presentational section affordances; clicking scrolls/focuses the
           matching content field. They do NOT add new model fields. */}
  canvas={<PopupPreview draft={draft} />}
  right={<PopupInspector draft={draft} onPatch={patchDraft} />}
/>

// 3) PopupPreview — render a CENTERED popup card from the REAL draft (live):
function PopupPreview({ draft }: { draft: PopupEditorDraft }) {
  return (
    <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-muted p-6">
      {draft.showOverlay ? <DimmedBackdrop /> : null}            {/* settings.showOverlay */}
      <Card className={previewPlacementClass(draft.placement) /* center | bottom_right | top_banner */}>
        <h3 className="font-display text-xl font-semibold">{draft.title || "Popup title"}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{draft.body || "Popup body copy…"}</p>
        {draft.ctaLabel ? <Button className="mt-4 w-full">{draft.ctaLabel}</Button> : null}
        {draft.dismissible ? <button className="mt-3 text-xs text-muted-foreground">No thanks</button> : null}
      </Card>
    </div>
  );
}
// Preview is READ-ONLY: it reflects draft fields, it does NOT mutate them and does
// NOT submit anything. No real network/overlay side effects.

// 4) PopupInspector — re-skin PopupEditorForm fields into the right rail, GROUPED:
//    Trigger (triggerType + conditional delaySeconds/percent/selector),
//    Targeting (include/exclude paths, audience),
//    Frequency (strategy + cooldownMinutes),
//    Content (title/body/templateId/ctaLabel/ctaHref),
//    Display (placement, dismissible, showOverlay).
//    EVERY control keeps value={draft.X} + onChange/onValueChange/onCheckedChange ->
//    onPatch({ X }). Do NOT drop a field, do NOT change enum option values
//    (time_delay/scroll_depth/exit_intent/cta_click, all/logged_in/logged_out,
//    always/session_once/daily_once, center/bottom_right/top_banner) — those map
//    1:1 to toPopupInput()/draftFromPopup() and the wire schema.
//    NOTE: triggerType/audience/frequencyStrategy/placement/status are the shadcn
//    Radix `Select` (`@/components/ui/select`), driven by `onValueChange` — NOT a
//    native `<select>`. Tests must seed `draft` or drive the Radix trigger+item, not
//    `selectOptions` (see L03).
```

**Data flow:** `getCachedPopup` lazy init → `getPopupCached({force:true})` hydrate →
`patchDraft` (sets `hasUnsavedChanges=true`, clears success) → `handleSave` calls
`toPopupInput(draft)` then `createPopup`/`updatePopup` → `applyPopup` resets
snapshot + clears dirty. The restyle changes none of these edges; the preview reads
`draft`, the inspector writes via `patchDraft`, exactly as today.

**Navigation/href constraint (preserve):** "Back to list" keeps
`navigate("/advanced/popups")`; the post-create redirect keeps
`navigate(`/advanced/popups/${encodeURIComponent(created.id)}`)`. Do NOT hand-build
hrefs; route through the existing `useAdminRouter().navigate` / canonical helpers.

**Error handling:** keep the loading card (`Loading popup editor…`), the destructive
`Alert` (`Popup editor error` for `error`), and the success `Alert` (`Saved`) with
existing copy/conditions; only their containers inherit the new tokens. Save/Publish
disabled states (`disabled={isSaving}`, `disabled={!hasUnsavedChanges}`) are
unchanged.

**React-hooks/cache rules:** the live preview is derived purely from `draft` at
render — no effect, no sync `setState` in an effect. Do NOT add a mount effect that
re-fetches or that overwrites `draft` while `hasUnsavedChanges` is true; the existing
hydrate effect + the dirty-guarded cacheBus subscription are the only data effects
and must stay intact (no refetch loop, no dirty-state overwrite).

**Regression-test shape:** see L03 — render `PopupEditorPage` (create + edit modes)
with a seeded `getCachedPopup`, assert: header actions present, the three-region
frame + live preview reflect `draft.title`/`draft.body`/`draft.ctaLabel`, typing a
title flips the dirty indicator and updates the preview, the conditional trigger field
matches the seeded `triggerType` (the trigger control is a Radix `Select` driven by
`onValueChange`, so prove the swap by seeding two `triggerType` states — NOT
`selectOptions`), toggling `showOverlay` updates the backdrop, and Save calls
`updatePopup` with a payload equal to `toPopupInput(draft)`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/popup-editor-restyle.test.tsx`
  (new suite in L03)
- Re-run the existing popups suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/popups-page.test.tsx tests/vitest/ui/popup-defaults.test.ts tests/vitest/admin/popupsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-20-L02`.
- If the shared `EditorShell`/`CanvasEditor` floating-panel pattern from
  TASK-479-06 is reused here, note the reuse in the shell design notes so other
  editor screens follow the same composition.
