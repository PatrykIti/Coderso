# TASK-533-02: Per-Edge Section Border (border-block)

# FileName: TASK-533-02-Per-Edge-Section-Border.md

**Parent Task:** TASK-533
**Priority:** High
**Category:** Schema (JSON model) / Site Render / Admin UI / Security
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Add a present-only per-edge section border to `PageSectionStyleV2` — at minimum
top/bottom (`border-block`), full four-edge preferred — with per-edge color
(`sanitizeAuthoringCssColor`), numeric width (`PAGE_SECTION_BORDER_WIDTH_CLAMP`), and
style enum. Emit fixed `border-{edge}-{color|width|style}` declarations in
`toPageSectionStyle`. Reproduces `.intro-strip{border-block:1px solid …}` and
`.dark-panel-section:before{…border-block:1px solid …}`. All additive, present-only,
reject-unknown, fail-soft. NO migration / NO schemaVersion bump / NO npm dep.

Lands AFTER 533-01 (reads the on-disk section-style allowlist/schema/normalizer after
01's `columnTemplate` land, then APPENDS the disjoint `border` region).

## Leaves (strict land order)

| Leaf | Title | Owns |
|------|-------|------|
| 533-02-L01 | Model + `PageSectionBorderV2` type + allowlist + JSON schema + normalize | `pageDocumentV2.ts` |
| 533-02-L02 | Render emit (per-edge border on the section box) | `pageRendererV2.tsx` (`toPageSectionStyle`) |
| 533-02-L03 | Per-edge section border controls | `pageEditorControlRegistry.ts` |
| 533-02-L04 | Tests | `tests/vitest/pages/page-document-v2.test.ts` + `page-renderer-v2.test.tsx` |

## Coordination / collision guards

- DISJOINT from 533-01: 01 owns block-style `colSpan`/`rowSpan` + section
  `columnTemplate`; 02 owns the section `border` OBJECT (distinct type + allowlist
  entry + schema object + normalizer branch). Additions in APPENDED `TASK-533`
  regions.
- The `border` shape is PER-EDGE and does NOT reuse the UNIFORM block border keys
  (`PageBlockStyleV2.borderColor/borderWidth/borderStyle`, `pageDocumentV2.ts:619-621`)
  — different structure, different owner.
- rg misdetects `pageDocumentV2.ts` / `pageRendererV2.tsx` as binary — use
  `Read`/`grep -an`.

## Security note

See parent Security Contract §3 — per-edge `color` via `sanitizeAuthoringCssColor`
(through `readOptionalSafeColor`), `width` via `readOptionalClampedNumber` +
`PAGE_SECTION_BORDER_WIDTH_CLAMP {0,16}`, `style` via `normalizeEnum` against a fixed
enum. Emitted as fixed `border-{edge}-{prop}` declarations — no author string in a
free CSS position. Joins the section-style allowlist + `additionalProperties:false`
schema in lockstep (fail-closed read trap).
