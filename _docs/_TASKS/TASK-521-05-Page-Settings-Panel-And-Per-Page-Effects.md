# TASK-521-05: Page-Settings Compact Side-Inspector Panel + Per-Page Effects

# FileName: TASK-521-05-Page-Settings-Panel-And-Per-Page-Effects.md

**Parent Task:** TASK-521
**Priority:** High
**Category:** Admin UI (Pages) / Site Render / Accessibility
**Estimated Effort:** Large
**Status:** ✅ Done
**Depends on:** TASK-521-01 (settings.effects model + `PAGE_EFFECTS_RUNTIME_SOURCE`),
TASK-521-02 (front section render — the page-root marker gates its reveal CSS),
TASK-521-04 (icon block — so the smoke covers all effects on one page).

---

## Scope

Two owner deliverables: (D1) relocate page settings out of the full-height
slide-out drawer into a **compact panel in the SAME right side-inspector rail** as
section/block settings, triggered by a button next to the section-panel icon
(reuse `Settings2`), with a new **Effects** section; and (D2) the per-page ambient
effect (cursor-follow spotlight) persisted to `currentData.settings.effects`
(521-01-L02) and rendered on the page shell.

**Single-writer:** `core/admin/ui/pages/PageEditor.tsx` (521-05 only — L01
panel-relocation region + L02 Effects-section region, disjoint intra-file).
`pageRendererV2.tsx` is a DOCUMENTED ADDITIVE SEAM — 521-05 owns ONLY the
`PageDocumentRender` page-root region (`:2324-2370`), disjoint from 521-02
(section) and 521-04 (block-content), landing LAST.

## Leaves

| Leaf | Title | File / region |
|------|-------|---------------|
| TASK-521-05-L01 | Compact page-settings side panel relocation | `PageEditor.tsx` — panel shell + trigger (`:675` panelOpen, `:729` settingsOpen, `:3048` trigger, `:4876` SettingsSheet) |
| TASK-521-05-L02 | Effects section + persistence | `PageEditor.tsx` — Effects controls wired to `pageDocument.settings.effects` (`:2237` settings write) |
| TASK-521-05-L03 | Page-shell effects render + cursor-spotlight | `pageRendererV2.tsx` — `PageDocumentRender` page-root (`:2324`) + emit `PAGE_EFFECTS_RUNTIME_SOURCE` |
| TASK-521-05-L04 | Page-effects tests | Vitest only — `tests/vitest/pages/page-renderer-v2.test.tsx` + `tests/vitest/admin/pageSettingsPanel.test.tsx` + `tests/vitest/content/cursorSpotlight.test.tsx` (`PageDocumentRender` SSR lives under `tests/vitest/pages/`; `tests/unit/pages/` is Bun DB/service + Ajv `validation.test.ts` only) |

**Land order:** L01 → L02 → L03 → L04.

## Coordination

- `PageEditor.tsx` = 521-05 ONLY; the compact panel reuses the existing
  side-inspector chrome (`ToolbarSubpanel`-style) — do NOT touch section/block
  descriptors (521-02/04 own those in the registry).
- `pageRendererV2.tsx` page-root region ONLY (`PageDocumentRender`). 521-05 stamps
  the FRONT-ONLY `data-page-motion` root marker (gates 521-02's reveal CSS) + the
  `data-page-spotlight` overlay + emits `PAGE_EFFECTS_RUNTIME_SOURCE` once.
- Import `PAGE_EFFECTS_RUNTIME_SOURCE` / `PAGE_EFFECTS_RUNTIME_ID` /
  `PAGE_SPOTLIGHT_SIZE_CLAMP` read-only from 521-01.

## Hard Invariants

1. Page settings live in the COMPACT rail panel (not the full-height
   `SheetContent`); the old drawer is removed/replaced, its fields preserved.
2. Per-page effects present-only; a page with no effects renders NO spotlight, NO
   `data-page-spotlight`, NO runtime script; `data-page-motion` marker emitted
   only when a section effect OR page effect is present (else byte-identical).
3. Runtime emitted front-only (via `PageDocumentRender` used by the front shell);
   reduced-motion + coarse-pointer disable the spotlight (521-01 runtime guards).
4. Settings persist through save/publish round-trip (`settings.effects`).

## Definition of done

Page settings open in the compact side panel with an Effects section; cursor
spotlight (+ color/size) persists and follows the cursor on the front; the
front-only `data-page-motion` marker enables 521-02 reveal; reduced-motion/touch
disable motion; no-effect pages byte-identical; tests green.
