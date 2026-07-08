# TASK-523-01: Page Canvas Background (Model + Schema + Normalize + Root Emit + Panel Control)

# FileName: TASK-523-01-Page-Canvas-Background.md

**Parent Task:** TASK-523
**Priority:** High
**Category:** Schema (JSON model) / Site Render / Admin UI (Pages) / Security
**Estimated Effort:** Medium
**Status:** ✅ Done
**Depends on:** TASK-521-05 (the `settings.effects` sub-object precedent, the compact
`PageSettingsSubpanel`, the `PageDocumentRender` `rootStyle`/`spotlightOn` emit),
TASK-522-01-L02 (`sanitizeAuthoringCssBackground` — the safe color-OR-gradient path,
already imported in both `pageDocumentV2.ts:22` and `pageRendererV2.tsx:80`).

---

## Scope

Add a present-only per-page canvas background — a NEW sibling key
`settings.background` (safe color OR gradient) — across the four page-v2 surfaces:
the model type + normalize allowlist/wire + JSON schema (`pageDocumentV2.ts`), the
`PageDocumentRender` root emit (`pageRendererV2.tsx`), and the compact page-settings
panel control (`PageEditor.tsx`), plus tests. Colors/gradients flow ONLY through
`sanitizeAuthoringCssBackground` at WRITE and RENDER. No migration, no schema-version
bump, no dependency.

**Single-writer per file:** L01 owns the `pageDocumentV2.ts` model/schema/normalize
region (disjoint from the `effects`/`menuAppearance` sub-objects); L02 owns the
`pageRendererV2.tsx` `rootStyle`/`<Root>` region (`:2847-2861`, disjoint from
523-02's `PAGE_SPOTLIGHT_CSS`/overlay); L03 owns the `PageEditor.tsx`
`PageSettingsSubpanel` control (disjoint from the Effects section); L04 = Vitest only.

## Leaves

| Leaf | Title | File / region |
|------|-------|---------------|
| TASK-523-01-L01 | Model + JSON schema + normalize allowlist | `pageDocumentV2.ts` — `PageDocumentSettingsV2` (`:464`), `normalizeSettings` allowlist (`:2351`) + wire (`:2364`), `settings` JSON schema (`:1669`) |
| TASK-523-01-L02 | Root emit (present-only, re-sanitize at render) | `pageRendererV2.tsx` — `PageDocumentRender` `rootStyle` (`:2847`) + `<Root>` (`:2856`) |
| TASK-523-01-L03 | Page-settings "Page background" control | `PageEditor.tsx` — `PageSettingsSubpanel` (`:4955`), mirroring the Effects `ColorSwatchControl` (`:5049`, color-only); live-draft write via `setDocumentDraft` |
| TASK-523-01-L04 | Tests (round-trip / reject-unknown / gradient-safe / injection / byte-identity) | Vitest — `tests/vitest/pages/page-document-v2.test.ts` + `tests/vitest/pages/page-renderer-v2.test.tsx` + panel descriptor test |

**Land order:** L01 → L02 → L03 → L04.

## Coordination

- `pageDocumentV2.ts` = 523-01-L01 ONLY. Extend the `PageDocumentSettingsV2` type,
  the `normalizeSettings` `assertKnownKeys` allowlist + return spread, and the
  `settings` JSON-schema `properties` — in lockstep. Do NOT touch the `effects` or
  `menuAppearance` sub-normalizers/schemas. `defaultSettings` (`:740`) stays
  `{ template, showInNav }` (present-only ⇒ NO `background` default).
- `pageRendererV2.tsx` = 523-01-L02 owns `rootStyle`/`<Root>` (`:2847-2861`) ONLY —
  a DISJOINT sub-region from 523-02's `PAGE_SPOTLIGHT_CSS` (`:2700`) + overlay
  (`:2879`). Thread a re-sanitized `settings.background` into `rootStyle`
  present-only.
- `PageEditor.tsx` = 523-01-L03 owns the "Page background" control inside
  `PageSettingsSubpanel` ONLY (disjoint from the Effects section). Writes the live
  document draft (`pageDocument.settings.background`) via `setDocumentDraft` (the
  undo/dirty-tracking wrapper) — the same path `updateEffects` uses (the write-path
  decision in the parent). The panel control is color-only (`ColorSwatchControl` has
  no `allowGradient` prop); gradients stay model/import-only.

## Hard Invariants

1. Present-only: `settings.background` omitted when unset ⇒ document AND `<Root>`
   byte-identical vs post-522 (`defaultSettings` unchanged; `rootStyle` stays
   `undefined` when neither spotlight nor background is present).
2. Reject-unknown: `assertKnownKeys` allowlist + `additionalProperties:false`
   updated in lockstep; unknown `settings` key rejects; bad `background` fails soft
   (`sanitizeAuthoringCssBackground` → `null` ⇒ key omitted).
3. Colors/gradients ONLY via `sanitizeAuthoringCssBackground` — WRITE
   (`normalizeSettings`) AND RENDER (`PageDocumentRender`, defence-in-depth). No raw
   stored string reaches a CSS declaration.
4. No migration, no `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), no npm dep.
5. The panel control writes the live document draft (`setDocumentDraft`, the
   undo/dirty wrapper), persisted on every save/publish (mirrors the spotlight color),
   NOT a `handleSettingsSave`-only side-state. The panel authors color only; the
   model/render still accept a safe color OR gradient.

## Definition of done

`settings.background` (color OR gradient) round-trips, rejects unknowns, fails soft
on injection, renders present-only on the `<Root>` (overriding `bg-white`), and its
color half is authored in the compact panel on the live draft (gradients are
model/import-only — the panel widget is color-only); no-background pages
byte-identical; tests + gates green.
