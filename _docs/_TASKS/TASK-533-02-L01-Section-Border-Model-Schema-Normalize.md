# TASK-533-02-L01: Section Border Model + `PageSectionBorderV2` Type + Allowlist + JSON Schema + Normalize

# FileName: TASK-533-02-L01-Section-Border-Model-Schema-Normalize.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-02
**Priority:** High
**Category:** Schema (JSON model) / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Add a present-only `PageSectionStyleV2.border?: PageSectionBorderV2` (per-edge
color+width+style), its type, its clamp, its allowlist entry, its JSON schema object,
and its normalizer branch — all in labelled `TASK-533` regions. NO schemaVersion
bump, NO migration, NO dependency.

## Grounded anchors (RE-GREP at implement time — sibling bundles + 533-01 shift lines)

- **`PageSectionStyleV2`** — `pageDocumentV2.ts:534-571` (last field appended by
  533-01 is `columnTemplate?`; before it `fullBleed?` `:570`). Append `border?`.
- **`PageBoxSpacingV2`** — `pageDocumentV2.ts:589-594` (`{top?,right?,bottom?,left?}`)
  is the SHAPE PRECEDENT for a per-edge object; `PageSectionBorderV2` mirrors its
  four-optional-edges structure with a per-edge `{color?,width?,style?}` value.
- **`pageBoxSpacingJsonSchema`** — the per-edge JSON schema precedent (grep
  `pageBoxSpacingJsonSchema`) used by `padding`/`margin` (`pageBlockStyleJsonSchema`
  `:1447-1448`). Model the `border` schema object after it (nested
  `additionalProperties:false`).
- **`normalizeBlockBoxSpacing`** — the per-edge normalizer precedent (grep
  `normalizeBlockBoxSpacing`, used at `:2744-2750`) — omit-when-empty behavior to
  mirror.
- **Section-style allowlist** — INLINE `assertKnownKeys([...])` in
  `normalizeSectionStyle` `:2495-2514` (after 533-01 also carries `"columnTemplate"`).
  Append `"border"`.
- **`partialSectionStyleJsonSchema`** — `:1629` + the full non-partial section-style
  schema mirror (grep the paired `radius`/`shadow` props) — add `border` object to
  BOTH.
- **`normalizeSectionStyle`** — `:2488`. Add a present-only `border` branch.
- **Clamp** — add `PAGE_SECTION_BORDER_WIDTH_CLAMP = {min:0,max:16} as const` in the
  `TASK-533` clamp region (near `PAGE_BLOCK_SPAN_CLAMP` from 533-01-L01 / the block
  border clamp `:249`).
- **Border-style enum** — REUSE `pageBlockBorderStyles` (grep — the block border
  style enum, used at `:1446`/`:2735-2742`) if it fits (`"none"|"solid"|"dashed"|…`);
  else add a section border-style enum in the `TASK-533` region.
- **Helpers** — `readOptionalSafeColor` (`:1908` → `sanitizeAuthoringCssColor`),
  `readOptionalClampedNumber` (`:1997`), `normalizeEnum`.

## Implementation pseudocode

```ts
// (clamp, TASK-533 region)
/** TASK-533-02 per-edge section border width bounds (px). */
export const PAGE_SECTION_BORDER_WIDTH_CLAMP = { min: 0, max: 16 } as const;

// (type, TASK-533 region)
export type PageSectionBorderEdgeV2 = {
  color?: string | null;
  width?: number;
  style?: PageBlockBorderStyle;   // reuse the block border-style enum
};
export type PageSectionBorderV2 = {
  top?: PageSectionBorderEdgeV2;
  right?: PageSectionBorderEdgeV2;
  bottom?: PageSectionBorderEdgeV2;
  left?: PageSectionBorderEdgeV2;
};

// (PageSectionStyleV2 — append)
export type PageSectionStyleV2 = {
  /* …fullBleed?, columnTemplate?… */
  // --- TASK-533-02 per-edge section border (present-only) ---
  /** Per-edge border (`border-block` = top+bottom). Present-only: omitted when no
   *  edge is authored. Colors via sanitizeAuthoringCssColor, widths clamped. */
  border?: PageSectionBorderV2;
};

// (section-style allowlist — append)
"border",

// (JSON schema — border object, additionalProperties:false at every level)
const pageSectionBorderEdgeJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    color: { type: ["string", "null"] },
    width: numericSchema(PAGE_SECTION_BORDER_WIDTH_CLAMP.min, PAGE_SECTION_BORDER_WIDTH_CLAMP.max),
    style: { type: "string", enum: [...pageBlockBorderStyles] },
  },
};
const pageSectionBorderJsonSchema = {
  type: "object", additionalProperties: false,
  properties: { top: pageSectionBorderEdgeJsonSchema, right: pageSectionBorderEdgeJsonSchema,
                bottom: pageSectionBorderEdgeJsonSchema, left: pageSectionBorderEdgeJsonSchema },
};
// add `border: pageSectionBorderJsonSchema` to partialSectionStyleJsonSchema AND the full mirror

// (normalizeSectionStyle — append present-only branch)
if (input.border !== undefined) {
  const border = normalizeSectionBorder(input.border, mode, `${path}.border`);
  if (border) result.border = border;   // omit when every edge normalized away
}

// normalizeSectionBorder: for each of top/right/bottom/left present in input,
//   assertKnownKeys(edge, ["color","width","style"]) then build an edge with:
//     color: readOptionalSafeColor(edge.color) (drop when null/invalid)
//     width: readOptionalClampedNumber(edge.width, PAGE_SECTION_BORDER_WIDTH_CLAMP)
//     style: normalizeEnum(edge.style, pageBlockBorderStyles, "solid", …)
//   include the edge ONLY if it has at least one meaningful prop (color or width>0);
//   return undefined if NO edge survives (present-only whole-object omit).
```

- **Present-only:** unset `border` (or all-empty edges) ⇒ omitted ⇒ byte-identical to
  post-530.
- **`border-block` reproduction:** authoring `{top:{color,width:1},bottom:{color,width:1}}`
  draws top+bottom hairlines (533-02-L02 emits `border-top-*` + `border-bottom-*`).

## Security note

Per-edge `color` normalized via `readOptionalSafeColor` → `sanitizeAuthoringCssColor`
(the ONLY sanctioned color path); a bad color (`"javascript:"`, `"url(x)"`,
`"expression("`) is dropped. `width` via `readOptionalClampedNumber` +
`PAGE_SECTION_BORDER_WIDTH_CLAMP {0,16}`; `style` via `normalizeEnum` against the
fixed `pageBlockBorderStyles` enum. No author string reaches a free CSS position —
533-02-L02 emits fixed `border-{edge}-{prop}` declarations. `border` joins the
section-style allowlist + nested `additionalProperties:false` schema in lockstep
(fail-closed read trap); unknown edge/prop keys throw `PageDocumentError`.

## Vitest test lane (authored in 533-02-L04)

`tests/vitest/pages/page-document-v2.test.ts` — round-trip, reject-unknown (unknown
edge key + unknown prop key), present-only (unset + all-empty edges omitted), clamp
(`width:99→16`), bad-color-dropped, style enum.

## Regression / breaking-test ownership

Purely additive + present-only; every existing section-style test passes unchanged.
533-02-L04 adds coverage.

## Hard Invariants

1. Present-only whole-object omit: unset / all-empty ⇒ no `border` key ⇒
   byte-identical to post-530.
2. Nested `additionalProperties:false` at edge + border level; unknown keys reject.
3. Colors via `sanitizeAuthoringCssColor`, widths clamped, style enum-validated.
4. Allowlist + schema + normalizer land in lockstep; no schemaVersion bump
   (`:29` stays `2`), no migration, no dependency; additions in labelled `TASK-533`
   regions (additive merge).
