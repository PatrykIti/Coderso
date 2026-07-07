# TASK-521-01-L01: Section-Style Scroll-Effect Model

# FileName: TASK-521-01-L01-Section-Style-Effects-Model.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the section-style region of
`core/services/pages/pageDocumentV2.ts`: the `PageSectionStyleV2` type (`:380-387`),
`normalizeSectionStyle` (`:2052-2100`), the `defaultStyle` object (`:559`), and the
`sections[].style` block of `pageDocumentV2JsonSchema` (`:1342`). Adds the enum +
clamp declared in the 521-01 shared-vocabulary block. Disjoint from L02
(settings) and L03 (block types).

## Grounded anchors

`PageSectionStyleV2` `:380-387` (no motion today); `normalizeSectionStyle`
`:2052` with `assertKnownKeys(input, ["background","backgroundType","backgroundImage","accent","radius","shadow"], …)`
(`:2059`, partial-aware `!partial || input.x !== undefined`); helpers
`readNumber` (`:1549`), `normalizeEnum` (`:1554`); `defaultStyle` `:559`;
`PageSectionResponsiveOverrideV2.style?: Partial<PageSectionStyleV2>` (`:472`) — so
the new keys ride the existing per-breakpoint override channel for free.

## Implementation pseudocode

```ts
// (1) Shared vocabulary (top-of-file const region, near other page enums):
export const pageSectionScrollEffects = ["none","reveal-fade","reveal-up","parallax"] as const;
export type PageSectionScrollEffect = (typeof pageSectionScrollEffects)[number];
export const PAGE_PARALLAX_INTENSITY_CLAMP = { min: 0, max: 40 } as const;

// (2) Type (present-only — do NOT add to defaultStyle unless we want it emitted;
//     scrollEffect is present-only so leave it OUT of defaultStyle):
export type PageSectionStyleV2 = {
  background: string; backgroundType: PageBackgroundType; backgroundImage?: string | null;
  accent: string; radius: number; shadow: PageShadowToken;
  scrollEffect?: PageSectionScrollEffect;   // present-only
  parallaxIntensity?: number;               // present-only; meaningful only for "parallax"
};

// (3) normalizeSectionStyle — extend the allowlist + add partial-aware branches:
assertKnownKeys(input,
  ["background","backgroundType","backgroundImage","accent","radius","shadow",
   "scrollEffect","parallaxIntensity"], path, mode);
// … existing branches …
if (input.scrollEffect !== undefined) {
  const effect = normalizeEnum(input.scrollEffect, pageSectionScrollEffects, "none",
    `${path}.scrollEffect`, mode);
  if (effect !== "none") result.scrollEffect = effect;   // present-only: omit "none"
}
if (input.parallaxIntensity !== undefined) {
  const n = readNumber(input.parallaxIntensity, 20,
    PAGE_PARALLAX_INTENSITY_CLAMP.min, PAGE_PARALLAX_INTENSITY_CLAMP.max);
  result.parallaxIntensity = n;                          // present-only (only stored if authored)
}
// NOTE: because these are optional/present-only, the full-style branch
// `{ ...defaultStyle, ...result }` (:2096) must NOT seed them (defaultStyle
// omits them) — so an un-authored section serializes byte-identically.
```

**Present-only discipline:** `scrollEffect:"none"` is treated as absence (omitted),
so toggling an effect on then back to none returns the doc to byte-identity.
`parallaxIntensity` is stored only when the author sets it (partial-aware branch);
the renderer (521-02) defaults it to a sane value when `scrollEffect==="parallax"`
and intensity is absent.

## JSON-schema mirror

In `pageDocumentV2JsonSchema` (`:1342`), the `sections.items.properties.style`
object (`additionalProperties:false`) gains:
```jsonc
scrollEffect: { type: "string", enum: [...pageSectionScrollEffects] },
parallaxIntensity: { type: "number", minimum: 0, maximum: 40 },
```
(Mirror the same keys in any `responsive[bp].style` partial schema if one exists,
so per-breakpoint overrides validate.)

## Regression-test shape (delegated to L05, asserted here)

- Round-trip: a section with `scrollEffect:"reveal-up"` + `parallaxIntensity:24`
  normalizes → serializes → re-normalizes to the SAME object; `scrollEffect:"none"`
  is omitted; unknown key `style.wobble` throws `PageDocumentError`; a legacy
  section (no keys) is byte-identical.

## Hard Invariants

1. Present-only (`"none"` omitted; `defaultStyle` unchanged).
2. Allowlist + JSON-schema updated in lockstep.
3. Bad enum/number fail-soft (fallback/clamp), unknown key rejects.
