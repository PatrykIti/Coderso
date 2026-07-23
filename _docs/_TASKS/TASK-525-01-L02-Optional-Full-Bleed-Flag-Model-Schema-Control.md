# TASK-525-01-L02: (Conditional) `style.fullBleed` Model + Allowlist + JSON Schema + Normalizer + Control

# FileName: TASK-525-01-L02-Optional-Full-Bleed-Flag-Model-Schema-Control.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-01
**Priority:** Medium
**Category:** Schema (JSON model) / Admin UI / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

**CONDITIONAL leaf.** Implement ONLY if 525-01-L01's grounding concludes ANY
section (not just the `"full-width"` template variant) should be able to bleed its
background with contained content. If reusing the existing `full-width` variant is
sufficient (the recommended minimal change), this leaf is a NO-OP — record the
decision in the closure and SKIP. If taken: add a present-only
`PageSectionStyleV2.fullBleed?: boolean` (reject-unknown allowlist + JSON schema +
normalize) plus a "Full-bleed background" section control, and 525-01-L01's render
extends its bleed condition to `template.variant === "full-width" ||
section.style.fullBleed`.

NO schemaVersion bump, NO migration, NO dependency.

## Grounded anchors (RE-GREP at implement time — 523 shifts lines)

- **`PageSectionStyleV2`** — the SECTION style type in
  `core/services/pages/pageDocumentV2.ts` (carries `background`, `backgroundType`,
  `accent`, `radius`, `shadow`, `scrollEffect`, `parallaxIntensity`,
  `surfacePreset`). Add `fullBleed?: boolean` adjacent. (Grep `PageSectionStyleV2 =`
  / `scrollEffect?:` to locate; distinct from `PageBlockStyleV2:570`.)
- **Section-style allowlist** — the `as const` key list fed to `assertKnownKeys`
  in the section-style normalizer (distinct from `pageBlockStyleKeys:705`). Add
  `"fullBleed"`.
- **Section-style JSON schema properties** — the section-style object in the JSON
  schema (`additionalProperties:false`); add `fullBleed: booleanSchema` (mirror
  `tiltGlare: booleanSchema`, `pageDocumentV2.ts:1431`).
- **Section-style normalizer** — the `normalizeSectionStyle`-family region (mirror
  `scrollEffect` / `parallaxIntensity` normalization). Add present-only boolean:
  emit ONLY when `=== true`; omit otherwise (mirror `tiltGlare`,
  `pageDocumentV2.ts:2740` — `if (input.tiltGlare === true) result.tiltGlare =
  true`).
- **Section control** — `pageEditorControlRegistry.ts` section controls
  (`section.layout.maxWidth:237`, `section.layout.stackVertical:386`); add a
  `section.style.fullBleed` toggle mirroring an existing `input:"toggle"` /
  boolean section control (`stackVertical:386`).

## Implementation pseudocode

```ts
// (1) PageSectionStyleV2 — present-only boolean:
export type PageSectionStyleV2 = {
  /* …background, backgroundType, accent, radius, shadow, scrollEffect… */
  /** Paint the section background edge-to-edge (100vw) while content stays capped
   *  at layout.maxWidth. Present-only: omitted when false. TASK-525-01-L02. */
  fullBleed?: boolean;
};

// (2) section-style allowlist — reject-unknown:
const pageSectionStyleKeys = [ /* …existing… */, "fullBleed" ] as const;

// (3) section-style JSON schema properties (additionalProperties:false stays):
{ /* … */ fullBleed: booleanSchema }   // mirrors tiltGlare

// (4) section-style normalizer — present-only true-only (mirror tiltGlare):
if (input.fullBleed === true) result.fullBleed = true;
// omit otherwise (never false, never null) → no-effect sections byte-identical.

// (5) control (pageEditorControlRegistry.ts, section controls):
control({
  id: "section.style.fullBleed",
  panel: "style", target: "section",
  label: "Full-bleed background",
  path: ["style", "fullBleed"],
  input: "toggle", responsive: false,   // match the existing boolean section control input
});

// (6) 525-01-L01 render extends its bleed condition (single owned edit there):
//   const isFullBleed = template.variant === "full-width" || section.style.fullBleed === true;
```

- Present-only: a `fullBleed:false`/unset section normalizes + renders
  byte-identically to today (the key is omitted entirely).
- Do NOT alter `section.layout.maxWidth` (the content cap stays the same field).

## Security note

`fullBleed` is a plain BOOLEAN normalized present-only (`=== true` → `true`, else
omitted). It only toggles FIXED render structure (the 100vw bleed literal + the
centered inner wrapper in 525-01-L01) — no author-controlled value reaches CSS, no
markup accepting author strings, no URL. Joins the section-style allowlist +
`additionalProperties:false` schema in lockstep (fail-closed read trap); an unknown
section-style key still throws `PageDocumentError`.

## Vitest test lane

- `tests/vitest/pages/page-document-v2.test.ts` (section-style normalize/round-trip
  suite) — round-trip, reject-unknown, present-only (`false`/unset omitted). And
  `tests/vitest/pages/page-renderer-v2.test.tsx` — `fullBleed:true` on a
  non-`full-width` section produces the full-bleed structure. Authored in
  525-01-L03.

## Regression / breaking-test ownership

- No breaking change: `fullBleed` is purely ADDITIVE + present-only; every
  existing section-style byte-identity / round-trip test passes unchanged.
  525-01-L03 adds the new coverage.

## Hard Invariants

1. CONDITIONAL — implement ONLY if 525-01-L01 needs an any-section bleed flag;
   else SKIP (record in closure).
2. Present-only boolean: emitted ONLY when `true`; omitted otherwise (never
   `false`/`null`) → byte-identical when unset.
3. Allowlist + JSON schema + normalizer move in ONE lockstep land.
4. No schemaVersion bump (`:29` stays `2`), no migration, no dependency.
