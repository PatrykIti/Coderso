# TASK-521-05-L02: Effects Section + Persistence (`settings.effects`)

# FileName: TASK-521-05-L02-Effects-Section-And-Persistence.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-05
**Priority:** High
**Category:** Admin UI (Pages)
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the Effects-controls region of
`core/admin/ui/pages/PageEditor.tsx` (the `effectsSlot` mounted inside the compact
panel from L01): an **Effects** section with a cursor-spotlight toggle, spotlight
color (519 alpha control), and spotlight size slider, all reading/writing
`pageDocument.settings.effects` (`PageEffectsV2`, 521-01-L02) as a **LIVE DRAFT on
the document itself** via `setPageDocument` — so effects are carried by EVERY
save/publish path (this is the SINGLE authoritative persistence path, matching
521-05-L01's statement that the Effects section is a live-draft persisted through
`currentData.settings.effects` on the normal draft-save path). Disjoint from L01's
shell region.

## Grounded anchors

**Document mutation (the persistence path):** `const [pageDocument, setPageDocument]
= useState<PageDocumentV2>(…)` (`PageEditor.tsx:662`); document edits mutate the
draft via `setPageDocument(current => …)` (the same setter used across all block/
section edits, e.g. `:1101`, and threaded as `updateDocument` `:2962`) — the draft
`pageDocument` is what the normal draft-save AND publish paths serialize/promote, so
writing `settings.effects` here makes it survive save → reload → publish WITHOUT
depending on the explicit `handleSettingsSave` button. `pageDocument.settings` shape
includes the new `effects?` (521-01-L02). **Do NOT hold effects in a separate
`useState` merged only into the `handleSettingsSave` payload (`:2237`) — that path
is the explicit "Save settings" button only, so effects would be LOST on a normal
draft-save/publish without that click.** Color control: the 519
`SharedColorControl`/`ColorSwatchControl` (`editorControls/ColorSwatchControl.tsx`)
or the page palette control (`PageEditorColorPaletteContext`); slider:
`SliderControl` (`editorControls/SliderControl.tsx`). `PAGE_SPOTLIGHT_SIZE_CLAMP`
from 521-01.

## Implementation pseudocode

```tsx
// (1) NO separate effects state. The Effects section reads `pageDocument.settings.
//     effects` directly and writes back into the DOCUMENT draft via setPageDocument,
//     so the value lives on the document every save/publish path serializes.
//     A tiny local helper keeps the settings.effects update present-only:
const effects = pageDocument.settings.effects;                 // read the live draft
function updateEffects(patch: Partial<PageEffectsV2>): void {
  setPageDocument((doc) => {
    const next = { ...(doc.settings.effects ?? {}), ...patch };
    // present-only: drop falsy/empty so an untouched page stays byte-identical
    const cleaned: PageEffectsV2 = {};
    if (next.cursorSpotlight) cleaned.cursorSpotlight = true;
    if (next.cursorSpotlight && next.spotlightColor) cleaned.spotlightColor = next.spotlightColor;
    if (next.cursorSpotlight && next.spotlightSize != null) cleaned.spotlightSize = next.spotlightSize;
    const hasAny = Object.keys(cleaned).length > 0;
    return {
      ...doc,
      settings: hasAny
        ? { ...doc.settings, effects: cleaned }
        : (({ effects: _drop, ...rest }) => ({ ...doc, settings: rest }))(doc.settings),
    };
  });
}

// (2) The Effects section UI (inside the compact panel effectsSlot):
<section aria-label="Effects">
  <ToggleSwitch label="Cursor spotlight"
    checked={!!effects?.cursorSpotlight}
    onChange={(on) => updateEffects({ cursorSpotlight: on })} />
  {effects?.cursorSpotlight && (
    <>
      <ColorSwatchControl label="Spotlight color"
        value={effects?.spotlightColor ?? "var(--primary)"}
        onChange={(c) => updateEffects({ spotlightColor: c })} />
      <SliderControl label="Spotlight size" min={120} max={900} step={20} suffix="px"
        value={effects?.spotlightSize ?? 400}
        onChange={(n) => updateEffects({ spotlightSize: n })} />
    </>
  )}
</section>
// (3) NO effects merge into the handleSettingsSave payload (:2237): effects already
//     live on `pageDocument.settings`, so the normal draft-save AND publish paths
//     carry them. The explicit "Save settings" button (page-meta title/slug, L01)
//     needs no effects awareness. This is the SINGLE authoritative persistence path.
```

**Present-only + single path:** the write helper drops empty effects so a page that
never used them stays byte-identical, and it writes onto the document draft (not a
side-channel), so EVERY save/publish carries the current effects (satisfies parent
Acceptance 5 "settings persist through save → reload → publish"). The server
`normalizeEffects` (521-01-L02) is the authority — the client cleanup is convenience
only; invalid values are re-validated/clamped server-side.

## Regression-test shape (delegated to L04, asserted here)

- Toggling cursor spotlight + setting color/size mutates `pageDocument.settings.
  effects` (assert on the document draft, not a side state); disabling + clearing
  drops the `effects` key (present-only); the values survive a normal draft-save AND
  publish (NOT only the explicit "Save settings" button); reload rehydrates the
  controls from `pageDocument.settings.effects`.

## Hard Invariants

1. Effects persist by writing onto `pageDocument.settings.effects` via
   `setPageDocument` (the document draft) — the SINGLE authoritative path that every
   save/publish serializes; NO separate side-state, NO `handleSettingsSave`-only
   merge (reconciled with 521-05-L01).
2. Present-only (empty effects dropped ⇒ byte-identical document).
3. Reuse shared controls (`ColorSwatchControl` 519, `SliderControl`,
   `ToggleSwitch`) — no bespoke widgets.
