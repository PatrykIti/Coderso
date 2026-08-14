# TASK-532-01-L02: Heavier Weights + `textTransform` + Eyebrow-Divider Model

# FileName: TASK-532-01-L02-Weight-Enum-Text-Transform-And-Eyebrow-Divider-Model.md

**Parent Task:** TASK-532
**Parent Subtask:** TASK-532-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-07-09

---

## Scope

Executable leaf. Three disjoint model additions in `pageDocumentV2.ts`, all inside
the labelled `TASK-532` region: (2) extend `pageTypographyFontWeights` +
`pageTypographyFontWeightCssValues` with `extrabold`(800)/`black`(900); (3) add a
present-only `style.textTransform?: PageTypographyTextTransform` enum
(`none`/`uppercase`/`lowercase`/`capitalize`); (4) extend the EXISTING `divider`
block with present-only `width` / `align` / `gradient` props (the decorative
eyebrow rule — reuse, not a new block type). **This leaf owns the enum-membership
test re-baseline** (4→6 weights).

## Grounded anchors (SYMBOL names authoritative; RE-GREP at implement time)

- `pageTypographyFontWeights = ["normal","medium","semibold","bold"]` (`:242`);
  `pageTypographyFontWeightCssValues` (`:453`, `{normal:"400"…bold:"700"}`);
  `PageTypographyFontWeight` type (`:380`, `(typeof pageTypographyFontWeights)[number]`
  — grows automatically). `fontWeight?` field (`:627`); `pageBlockStyleKeys`
  `"fontWeight"` (`:764`); `normalizeBlockStyle` fontWeight branch (`:2768`,
  `normalizeNullableEnum`); JSON schema `fontWeight:nullableEnumSchema(...)` (`:1451`).
- `PageBlockStyleV2` (`:596`); allowlist (`:746`); normalize (`:2661`); the SINGLE
  `pageBlockStyleJsonSchema` `$defs` object (`:1424`, `additionalProperties:false` at
  `:1426`), `$ref`-shared by both the inline (`:1574`) and responsive-override (`:1547`)
  paths via `pageBlockStyleJsonSchemaRef` (`:1513`). **No `partialBlockStyleJsonSchema`** —
  one edit covers both.
- `divider`: `pageBlockPropKeys.divider = ["tone","thickness"]` (`:863`);
  `pageBlockDefaultProps.divider = {tone:"neutral",thickness:1}` (`:1123`);
  `blockPropJsonSchemaForType` divider branch (`:1339`); `normalizeBlockProp` divider
  branch (`:3256`, `type==="divider" && key==="tone"` → `normalizeEnum(...,pageDividerTones,...)`);
  `pageDividerTones = ["neutral","muted","accent"]` (`:166`); render `case "divider"`
  (`pageRendererV2.tsx:2187`).
- Helpers: `normalizeEnum` / `normalizeNullableEnum` (`:1962`), `readNumber`,
  `assertKnownKeys`, `nullableEnumSchema`, `sanitizeAuthoringCssColor`
  (`pageAuthoringSanitizers.ts:93`).

## Implementation pseudocode

```ts
// ── (2) HEAVIER WEIGHTS — extend enum + css map (append inside TASK-532 fence) ──
export const pageTypographyFontWeights =
  ["normal","medium","semibold","bold","extrabold","black"] as const;
export const pageTypographyFontWeightCssValues: Record<PageTypographyFontWeight, string> = {
  normal:"400", medium:"500", semibold:"600", bold:"700", extrabold:"800", black:"900",
};
// No normalize/allowlist/schema change: fontWeight already flows via
// normalizeNullableEnum(pageTypographyFontWeights) (:2768) + nullableEnumSchema(...)
// (:1451) — both read the enum by reference, so extending it is sufficient.

// ── (3) TEXT-TRANSFORM — new enum + field (TASK-532 fence) ──
export const pageTypographyTextTransforms =
  ["none","uppercase","lowercase","capitalize"] as const;
export type PageTypographyTextTransform = (typeof pageTypographyTextTransforms)[number];
// PageBlockStyleV2 (:596): textTransform?: PageTypographyTextTransform;   (present-only)
// pageBlockStyleKeys (:746): append "textTransform".
// normalizeBlockStyle (:2661), append after the typography branches:
if (input.textTransform !== undefined) {
  const t = normalizeEnum(input.textTransform, pageTypographyTextTransforms,
    "none", `${path}.textTransform`, mode);
  if (t !== "none") result.textTransform = t;      // present-only: "none" resets/omits
}
// JSON schema (the SINGLE pageBlockStyleJsonSchema $defs object, :1424 — its $ref covers
// both inline and responsive; no partial): textTransform: { enum: [...pageTypographyTextTransforms] }

// ── (4) EYEBROW DIVIDER — extend divider props (TASK-532 fence) ──
// pageBlockPropKeys.divider (:863): ["tone","thickness","width","align","gradient"]
// pageBlockDefaultProps.divider (:1123): keep {tone:"neutral",thickness:1}
//   (width/align/gradient are OMIT-when-unauthored ⇒ NOT default-seeded, so legacy
//    divider docs stay byte-identical — mirrors the customSvg drawSpeed precedent).
export const pageDividerAligns = ["left","center","right"] as const;   // NEW (TASK-532)
export const PAGE_DIVIDER_WIDTH_CLAMP = { min: 8, max: 400 } as const;  // px short-rule length
// normalizeBlockProp (:3256) — append divider branches to the flat dispatch chain:
if (type === "divider" && key === "width")
  return readNumber(value, 34, PAGE_DIVIDER_WIDTH_CLAMP.min, PAGE_DIVIDER_WIDTH_CLAMP.max);
if (type === "divider" && key === "align")
  return normalizeEnum(value, pageDividerAligns, "left", path, mode);   // fail-closed
if (type === "divider" && key === "gradient")
  return value === true;                                                // boolean coerce
// blockPropJsonSchemaForType divider (:1339) — add per-prop schema:
//   width:    { type: "number", minimum: 8, maximum: 400 }
//   align:    { type: "string", enum: [...pageDividerAligns] }
//   gradient: { type: "boolean" }
```

## Present-only nuance (divider)

`pageBlockDefaultProps.divider` is NOT extended, so `width`/`align`/`gradient` appear
in a persisted doc ONLY when authored (the generic `normalizeBlockProps` loops the
`pageBlockPropKeys.divider` list but only writes keys whose `input[key] !== undefined`).
A legacy `divider` block (`{tone,thickness}`) round-trips byte-identical. The RENDER
(L05) treats an absent `gradient` as the legacy `<hr>` path.

## Regression / owned-breaking-test notes

- **OWNED BREAKING TESTS (exactly TWO — corrected 2026-07-09; was wrongly "ONE"):**
  growing `pageTypographyFontWeights` 4→6 breaks TWO assertions on disk:
  1. **`tests/vitest/pages/page-editor-control-ui-model.test.ts:139-143`** — a HARDCODED
     4-member literal `resolveById("block.style.fontWeight").toMatchObject({
     kind:"segmented", options:["normal","medium","semibold","bold"], labels:{...} })`;
     `toMatchObject` matches arrays by exact length+elements, so the 6-member resolved
     `options` FAILS. Update that literal to
     `["normal","medium","semibold","bold","extrabold","black"]` and add the weight-css map
     entries `extrabold:"800"`/`black:"900"` wherever asserted.
  2. **`tests/vitest/pages/page-document-v2.test.ts:785-789`** — the "JSON schema accepts
     typography tokens plus nulls and rejects unknown tokens" block uses the LITERAL string
     `style = { fontWeight: "black" }` as its INVALID token and asserts
     `expect(validate(unknownToken)).toBe(false)`, relying on `"black"` being rejected by
     the shared `pageBlockStyleJsonSchema` (`fontWeight: nullableEnumSchema(pageTypographyFontWeights)`
     at `:1451`). Once this leaf adds `"black"` (900) to the enum, Ajv ACCEPTS it,
     `validate()` returns `true`, and `.toBe(false)` FAILS. Re-baseline the invalid-token
     fixture to a token that stays OUTSIDE the 6-member enum (e.g. `fontWeight: "ultra"`),
     preserving the reject-unknown-token intent.
  The two files previously claimed non-breaking: `page-editor-control-registry.test.ts:669`
  compares `options: pageTypographyFontWeights` BY REFERENCE (grows with the enum) — still
  non-breaking; but the earlier "`page-document-v2.test.ts` has NO weight pin (grep returns
  nothing)" claim is WRONG — that file pins membership via the LITERAL string `"black"` at
  `:787`, which a `grep pageTypographyFontWeights` misses (see item 2). **Do NOT rely on
  `grep pageTypographyFontWeights` alone: ALSO grep the literal weight strings (`"black"`,
  `"extrabold"`, and each existing member used as an invalid-token fixture) across
  `tests/vitest/**` before landing.** `labels` auto-humanizes (`getPageEditorOptionLabel` →
  `humanizeOptionToken` → "Extrabold"/"Black"), so NO `pageEditorOptionLabelCatalog` edit is
  needed and the `labels` subset match is unaffected. Re-baseline ONLY these two assertions
  for the intended growth — never weaken a behavior assertion.
- **New round-trip assertions (delegated to 532-01-L06):** `fontWeight:"extrabold"` /
  `"black"` round-trip and map to `800`/`900`; `fontWeight:"ultra"` throws
  `PageDocumentError` (write mode). `textTransform:"uppercase"` round-trips;
  `"none"`/unset omitted; `"rotate"` throws. A `divider` with `width:34`/`align:"left"`/
  `gradient:true` round-trips; `width:9999` clamps to 400; `align:"skew"` throws;
  legacy `{tone,thickness}` divider byte-identical; unknown divider prop
  (`divider.props.foo`) throws.
- **Lane:** Vitest `tests/vitest/pages/page-document-v2.test.ts` (model + divider
  round-trip); the enum-membership re-baseline touches the registry/ui-model tests
  named above.

## Security note

`fontWeight` (6 members now), `textTransform`, and divider `align` are
`normalizeEnum`/`normalizeNullableEnum`-guarded → an invalid VALUE throws
`PageDocumentError` in write mode (fail-closed, matching every existing page enum).
`width` is `readNumber`-clamped (fail-soft). `gradient` is a boolean coerce. These
reach CSS only as fixed keywords, a fixed weight-map value (`"800"`/`"900"`), or a
bounded px number — never string interpolation. The eyebrow gradient COLOR itself is
NOT a divider prop here — the gradient rule uses the existing `divider.tone` →
`pageDividerToneBorderColor` mapping plus a static reference-aqua gradient in the L05
render (author color retint via the divider's frame `style.background` /
`sanitizeAuthoringCssBackground` if wired, out of this leaf's model scope).

## Hard Invariants

1. Present-only; extending the weight enum adds members only (no default change);
   divider `width`/`align`/`gradient` omit-when-unauthored (legacy divider
   byte-identical).
2. Enums fail-closed; `width` clamps; unknown prop/key rejects.
3. Weight-enum growth mirrored into the css map; the SINGLE `pageBlockStyleJsonSchema`
   `$defs` object updated (`textTransform` + divider props) — its `$ref` covers both inline
   and responsive-override (no `partialBlockStyleJsonSchema`), `additionalProperties:false`.
4. Owned enum-membership tests re-baselined for 4→6; all edits inside a labelled
   `TASK-532` region.
