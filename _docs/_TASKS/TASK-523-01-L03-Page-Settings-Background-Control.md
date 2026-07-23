# TASK-523-01-L03: Page-Settings "Page background" Control (`settings.background`, live draft)

# FileName: TASK-523-01-L03-Page-Settings-Background-Control.md

**Parent Task:** TASK-523
**Parent Subtask:** TASK-523-01
**Priority:** High
**Category:** Admin UI (Pages)
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the `PageSettingsSubpanel` region of
`core/admin/ui/pages/PageEditor.tsx` (`:4955`): adds a "Page background"
**solid-color** control writing `settings.background`, mirroring the Effects
`ColorSwatchControl` (`:5049`) — using the TASK-519 alpha-capable
`ColorSwatchControl`. **Panel scope is color-only:** `ColorSwatchControl`
(`core/admin/ui/pages/editorControls/ColorSwatchControl.tsx:22-39`) has NO
`allowGradient` prop, and its custom-value commit runs input through
`normalizeAdminColorValue` (`ColorSwatchControl.tsx:96-99` →
`core/admin/ui/shared/colorValue.ts:157-163`), which returns `undefined` (rejects +
reverts) for anything that is not a keyword/token/hex/rgba/hsla — a
`linear-gradient(...)` string cannot be typed into this widget. The `settings.background`
MODEL still accepts a safe color OR gradient (via `sanitizeAuthoringCssBackground`,
523-01-L01/L02), so gradients remain author-able by model/import, but this PANEL
leaf ships the color half only. **Persistence: the LIVE document draft** via `setDocumentDraft`
(the same path `updateEffects` `:2283` uses), NOT the explicit-save-only
`handleSettingsSave` payload — per the parent's grounded write-path decision (a
canvas background persists on every save/publish, like the spotlight color it sits
next to). Disjoint from the Effects section region.

## Grounded anchors

`PageSettingsSubpanel` (`:4955`, props destructured `:4956-4986`; hosts title/slug/
show-in-nav/revision-retention via the explicit-save `onSave` `:4966`/`:5031` AND the
Effects section `:5035-5067`). The Effects color control precedent
`<ColorSwatchControl label="Spotlight color" value={effects?.spotlightColor ??
"var(--primary)"} palette={palette} onChange={(color) => onEffectsChange({
spotlightColor: color ?? undefined })} />` (`:5049-5054`). Panel mount site
(`:3307-3323`): `template={pageDocument.settings.template}` (`:3319`),
`effects={pageDocument.settings.effects}` (`:3320`),
`onEffectsChange={updateEffects}` (`:3321`), `palette={sitePalette}` (`:3323`). The
live-draft writer precedent `updateEffects` (`useCallback` `:2283-2302`, writes
`setDocumentDraft((doc) => …)` present-only). `setDocumentDraft` (`:1107-1118`) wraps
`setPageDocument` and layers on `cloneDocument`, `documentsEqual` dirty-tracking, and
undo-history snapshotting — so background edits participate in undo + dirty detection
like every other live-draft edit. `ColorSwatchControl` imported (`:131`), props =
`{ label, value, onChange, palette, allowCustom, allowTransparent, disabled, tone }`
(`ColorSwatchControl.tsx:22-39`) — color-only, no `allowGradient`.

## Implementation pseudocode

```tsx
// (1) A live-draft writer for the background, MIRRORING updateEffects (:2283) —
//     writes onto the document settings via setDocumentDraft (NOT raw setPageDocument),
//     present-only (clear ⇒ drop the key). setDocumentDraft (:1107) is the undo/dirty-
//     tracking wrapper updateEffects itself uses, so background edits get undo-history +
//     dirty detection. The server normalizeSettings (523-01-L01) is the authority; this
//     client cleanup is convenience. Defined near updateEffects:
const updateBackground = useCallback(
  (value: string | null | undefined) => {
    setDocumentDraft((doc) => {
      if (!value) {
        // present-only: clearing drops the key ⇒ byte-identical draft
        const { background: _drop, ...restSettings } = doc.settings;
        return { ...doc, settings: restSettings };
      }
      return { ...doc, settings: { ...doc.settings, background: value } };
    });
  },
  [setDocumentDraft]
);

// (2) Thread through the panel mount (:3307) alongside effects/palette:
<PageSettingsSubpanel
  /* …existing props… */
  effects={pageDocument.settings.effects}
  onEffectsChange={updateEffects}
  background={pageDocument.settings.background}
  onBackgroundChange={updateBackground}
  palette={sitePalette}
/>

// (3) Panel props (:4956-4986) — add:
//   background: string | undefined;
//   onBackgroundChange: (value: string | null | undefined) => void;

// (4) The control — add a "Design" (or reuse the existing settings body) section in
//     PageSettingsSubpanel, ABOVE or beside the Effects section (:5035), mirroring the
//     spotlight-color ColorSwatchControl (:5049). ColorSwatchControl is color-only
//     (519 alpha input via allowCustom; no allowGradient prop exists — see
//     ColorSwatchControl.tsx:22-39). The panel authors the SOLID-color half of
//     settings.background; gradients stay model/import-only (523-01-L01/L02):
<ColorSwatchControl
  label="Page background"
  value={background ?? ""}
  palette={palette}
  allowCustom                                     // 519 alpha-capable custom color input
  allowTransparent                                // "no background" is a first-class swatch
  onChange={(value) => onBackgroundChange(value ?? undefined)}
/>
```

**Present-only + single path:** `updateBackground` drops the key on clear so a page
that never set a background stays byte-identical, and it writes onto the document
draft via `setDocumentDraft` (not a side-channel), so EVERY save/publish carries it
AND the edit joins undo-history + dirty-tracking (parent Acceptance 3).
The server `normalizeSettings` (523-01-L01) re-validates via
`sanitizeAuthoringCssBackground`; the client control is convenience only. Do NOT
merge `background` into the `handleSettingsSave` (`:2244`) payload — that is the
explicit "Save settings" button only, so the value would be LOST on a normal
draft-save/publish without that click (the same reasoning 521-05-L02 applied to
`effects`).

## Security

The control writes a candidate string; the AUTHORITY is server `normalizeSettings`
via `sanitizeAuthoringCssBackground` (523-01-L01) AND the render re-sanitize
(523-01-L02). The client never bypasses those boundaries — an author-typed unsafe
value is dropped server-side (fail-soft) and never rendered raw. No color/gradient
reaches CSS except through `sanitizeAuthoringCssBackground` (write + render).

## Vitest test lane

`tests/vitest/admin/pageSettingsPanel.test.tsx` (RTL; **line 1 MUST be
`// @vitest-environment happy-dom`** — `vitest.config.ts` is `environment:"node"`
globally, DOM files opt in per-file, matching `tests/vitest/admin/adminApp.test.tsx:1`).
Delegated to 523-01-L04; asserted here.

## Regression-test shape (delegated to L04, asserted here)

- Setting a "Page background" color mutates `pageDocument.settings.background`
  (assert on the document draft, NOT a side-state); clearing it drops the `background`
  key (present-only).
- The value survives a normal draft-save AND publish (the live-draft path), NOT only
  the explicit "Save settings" button.
- Reload rehydrates the control from `pageDocument.settings.background`.

## Hard Invariants

1. Writes `pageDocument.settings.background` via `setDocumentDraft` (the live draft
   undo/dirty wrapper `updateEffects` uses) — the SINGLE authoritative path every
   save/publish serializes; NO `handleSettingsSave`-only merge (mirrors the parent
   write-path decision + 521-05-L02).
2. Present-only (clear drops the key ⇒ byte-identical draft).
3. Reuse the shared `ColorSwatchControl` (519 alpha-capable, color-only — no
   `allowGradient` prop exists) — no bespoke widget; disjoint from the Effects
   section. Gradients stay model/import-only (523-01-L01/L02), not panel-authored.
