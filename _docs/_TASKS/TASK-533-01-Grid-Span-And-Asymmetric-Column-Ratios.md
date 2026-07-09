# TASK-533-01: Grid Row/Col Span + Asymmetric Column Ratios

# FileName: TASK-533-01-Grid-Span-And-Asymmetric-Column-Ratios.md

**Parent Task:** TASK-533
**Priority:** High
**Category:** Schema (JSON model) / Site Render / Admin UI / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Extend the section/block layout so (a) a section can express an ASYMMETRIC column
ratio via a present-only, strict-sanitized `PageSectionStyleV2.columnTemplate?:
string` (e.g. `"1.15fr .85fr"`, `"1fr 1.2fr"`) emitted as inline
`gridTemplateColumns` overriding the symmetric grid class, and (b) a block can SPAN
columns/rows via present-only clamped `PageBlockStyleV2.colSpan?: number` /
`rowSpan?: number` emitted as `gridColumn:"span N"` / `gridRow:"span N"` on the block
frame. Reproduces `.project-card.large{grid-row:span 2}` + the intro (1/1.2fr) and
realizacje (1.15/.85fr) grids. All additive, present-only, reject-unknown,
fail-soft. NO migration / NO schemaVersion bump / NO npm dep.

Land FIRST inside 533 — it establishes the `// --- TASK-533 … ---` labelled regions
+ the shared clamps (`PAGE_BLOCK_SPAN_CLAMP`, and 533-02's
`PAGE_SECTION_BORDER_WIDTH_CLAMP` may be co-located or added by 02) that 533-02/03
append to.

## Leaves (strict land order)

| Leaf | Title | Owns |
|------|-------|------|
| 533-01-L01 | Model + allowlist + JSON schema + normalize + sanitizer | `pageDocumentV2.ts` (block+section style additions), `pageAuthoringSanitizers.ts` (`sanitizeAuthoringGridTemplate`) |
| 533-01-L02 | Render emit (span on frame + `columnTemplate` inline grid) | `pageRendererV2.tsx` (`toPageBlockRenderProps` + `toPageSectionRenderProps`) |
| 533-01-L03 | Editor controls | `pageEditorControlRegistry.ts` |
| 533-01-L04 | Tests | `tests/vitest/pages/page-document-v2.test.ts` + `page-renderer-v2.test.tsx` + sanitizer test |

## Coordination / collision guards

- All additions go in APPENDED `// --- TASK-533 … ---` regions (see parent
  "Coordination / collision guards"); no shared line rewritten so 531/532/534 merge
  additively.
- `columnTemplate` lives on `PageSectionStyleV2`; `colSpan`/`rowSpan` on
  `PageBlockStyleV2` — DISJOINT allowlists/schemas/normalizers.
- Does NOT touch `isSafeAuthoringCssGradient` / `isSingleGradientLayer` /
  `sanitizeAuthoringCssBackground` in `pageAuthoringSanitizers.ts` (531's surface).
- rg misdetects `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary — use
  `Read`/`grep -an`.

## Security note

See the parent Security Contract §1 (`colSpan`/`rowSpan` bounded ints → `span N`
literal) and §2 (`columnTemplate` STRING → the NEW strict-allowlist
`sanitizeAuthoringGridTemplate`; rejection ⇒ omit; the only author string reaching a
CSS value position). Every field joins its reject-unknown allowlist +
`additionalProperties:false` schema in lockstep (fail-closed read trap).
