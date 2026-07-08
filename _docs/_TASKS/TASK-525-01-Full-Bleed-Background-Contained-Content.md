# TASK-525-01: Full-Bleed Background + Width-Constrained Centered Content

# FileName: TASK-525-01-Full-Bleed-Background-Contained-Content.md

**Parent Task:** TASK-525
**Priority:** High
**Category:** Site Render / Content (Pages) / Schema (JSON model) / Admin UI
**Estimated Effort:** Medium
**Status:** ✅ Done
**Depends on:** TASK-523 (branch-point). Lands FIRST inside TASK-525.

---

## Goal

Make a full-width section paint its background/section box edge-to-edge (100vw
bleed) while wrapping its CONTENT in a centered container capped at
`section.layout.maxWidth` — decoupling the two so the author gets a full-bleed
background WITH contained, centered content (the reference `.container` inside a
full-bleed section). Fixes the owner report: *"full width dla tła się udał ale
wszystko jest teraz rozsunięte a chcę aby było dla pewnej szerokości."*

Root cause (grounded on `feature/tasks-fixes`): the section background, the content
grid, AND the max-width cap all live on ONE content `<div>`
(`PageSectionContent`), and `toPageSectionStyle` (`pageRendererV2.tsx:404`) sets
`maxWidth: template.variant === "full-width" ? "none" : …` — so the full-width
variant drops the content cap and content spreads with the bleed.

## Approach (minimal)

- **Prefer reusing `section.layout.maxWidth`** for the content cap (already an
  editor control, `pageEditorControlRegistry.ts:237`, clamped 320..1920) + a
  minimal bleed mechanism (a centered inner content wrapper independent of the
  full-bleed section box). Reuse the `3eac13f9` bleed helper if one exists.
- **Add a present-only `style.fullBleed?: boolean` ONLY** if grounding concludes
  ANY section (not just the `full-width` variant) should bleed its background with
  contained content (525-01-L02, conditional).

## Sole-writer file ownership

- `core/services/pages/pageRendererV2.tsx` — `toPageSectionStyle` + section
  content-wrapper region in `toPageSectionRenderProps` / `PageSectionContent`
  (525-01-L01). DISJOINT from 525-02's block-frame / reveal region.
- `core/services/pages/pageDocumentV2.ts` — `PageSectionStyleV2` + section-style
  allowlist/schema/normalizer, ONLY IF `fullBleed` flag taken (525-01-L02).
- `core/services/pages/pageEditorControlRegistry.ts` — section `fullBleed` control,
  ONLY IF flag taken (525-01-L02).
- `tests/vitest/pages/page-renderer-v2.test.tsx` — new tests + OWNED old
  full-width width-assertion rebaseline (525-01-L03).

## Leaves (land order)

| Leaf | Title | Notes |
|------|-------|-------|
| 525-01-L01 | Decouple full-bleed background from content max-width (centered inner content wrapper) | render-only; keys off `template.variant === "full-width"` (extend to `|| style.fullBleed` after L02) |
| 525-01-L02 | (Conditional) `style.fullBleed` model + allowlist + schema + normalizer + control | implement ONLY if an any-section bleed flag is needed; else SKIP |
| 525-01-L03 | Full-bleed render tests + owned old full-width width-test rebaseline | OWNS the `maxWidth:"none"` → capped rebaseline |

## Hard Invariants

1. Full-bleed background decoupled from content cap (section box 100vw; content
   centered at `section.layout.maxWidth`).
2. Non-full-width path byte-identical to post-523.
3. Present-only if `fullBleed` flag taken (omitted when false/unset).
4. No schemaVersion bump, no migration, no dependency; `100vw`/centering are fixed
   literals; `section.layout.maxWidth` emitted as `${n}px` unchanged.
5. Old full-width `maxWidth:"none"` test rebaselined (owned, not drift).
