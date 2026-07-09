# TASK-534-01-L02: Magnetic Block Flag + Noise-Overlay Section/Page Flags (Style-Key Model)

# FileName: TASK-534-01-L02-Magnetic-And-Noise-Overlay-Style-Keys-Model.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the STYLE-KEY region of
`core/services/pages/pageDocumentV2.ts` (all inside labelled `// ── TASK-534 ──`
fences, DISJOINT from L01's block-type/prop region). Adds three present-only
boolean flags: `PageBlockStyleV2.magnetic` (magnetic-hover — report §1
"`.button.magnetic`"), `PageSectionStyleV2.noiseOverlay` (section grain), and
`PageEffectsV2.noiseOverlay` (page-root grain — report § Hero/Proces washes). Each
joins its allowlist + normalizer + BOTH relevant JSON-schema objects in lockstep.

## Grounded anchors

- `PageBlockStyleV2` type `:596-672` (present-only fields `decoration`/`tilt`/
  `surfaceTint`/`hoverEffect`/… `:641-671` — the ADD precedent).
- `pageBlockStyleKeys` allowlist array `:746` (add `"magnetic"` here); block-style
  normalizer `normalizeBlockStyle` `:2661`, its `assertKnownKeys(input,
  pageBlockStyleKeys, …)` `:2669`.
- `pageBlockStyleJsonSchema` (`$defs/pageBlockStyle`, hoisted `$ref`) `:1424`,
  `additionalProperties:false` `:1426` (mirror `magnetic` here).
- `PageSectionStyleV2` type `:534-571` (present-only `scrollEffect`/`surfacePreset`/
  `fullBleed` `:547-570` — precedent); `normalizeSectionStyle` `:2488`, its inline
  `assertKnownKeys([…])` `:2495-2514` (add `"noiseOverlay"`); BOTH section-style
  schemas: inline `sections.items.properties.style` AND
  `partialSectionStyleJsonSchema` (`:1629`, `additionalProperties:false` `:1631`).
- `PageEffectsV2` type `:510-514` (`cursorSpotlight`/`spotlightColor`/`spotlightSize`);
  its normalizer (search `effects` normalize near settings normalize) + its JSON
  schema (`cursorSpotlight`/`spotlightColor` at `:1765-1766`). Add `noiseOverlay`
  to the effects allowlist + effects JSON schema.
- `readBoolean` helper (used by existing boolean flags e.g. `fullBleed`).

## Implementation pseudocode

```ts
// ── TASK-534 ── PageBlockStyleV2 (:596) — magnetic (present-only)
/** Magnetic pointer-attract on hover (runtime clause; pointer:fine + reduce OFF). */
magnetic?: boolean;

// ── TASK-534 ── pageBlockStyleKeys allowlist (:746)
const pageBlockStyleKeys = [ /* …existing… */ "magnetic" ] as const;

// ── TASK-534 ── normalizeBlockStyle (:2661) — present-only branch
if (input.magnetic !== undefined) {
  if (readBoolean(input.magnetic, false)) result.magnetic = true;   // omit false
}

// ── TASK-534 ── pageBlockStyleJsonSchema (:1424, additionalProperties:false)
magnetic: { type: "boolean" },

// ── TASK-534 ── PageSectionStyleV2 (:534) — noiseOverlay (present-only)
/** Static self-generated SVG-turbulence grain over the section surface. */
noiseOverlay?: boolean;

// ── TASK-534 ── normalizeSectionStyle allowlist (:2495) + branch
assertKnownKeys(input, [ /* …existing… */ "noiseOverlay" ], path, mode);
if (input.noiseOverlay !== undefined) {
  if (readBoolean(input.noiseOverlay, false)) result.noiseOverlay = true;  // omit false
}
// BOTH section-style schemas gain: noiseOverlay: { type: "boolean" }
//   (inline sections.items.properties.style AND partialSectionStyleJsonSchema:1629)

// ── TASK-534 ── PageEffectsV2 (:510) — noiseOverlay (page root)
export type PageEffectsV2 = {
  cursorSpotlight?: boolean; spotlightColor?: string; spotlightSize?: number;
  noiseOverlay?: boolean;    // ── TASK-534 ── present-only page-root grain
};
// effects normalizer: assertKnownKeys(+"noiseOverlay"); present-only branch (omit false).
// effects JSON schema (near :1765): noiseOverlay: { type: "boolean" }.
```

**Present-only discipline:** `false`/unset ⇒ the key is OMITTED (never stored
`false`), so toggling on→off returns the doc to byte-identity; `defaultStyle` /
`defaultSettings` are NOT seeded with these keys.

## Security note

All three are BOOLEANS coerced by `readBoolean` — NO string reaches CSS/markup.
`magnetic` reaches the render only as a `data-magnetic` toggle attribute selected
by presence (534-02); `noiseOverlay` reaches render only as a `data-noise-overlay`
attribute gating a STATIC self-generated SVG-turbulence background (534-02/534-03) —
the overlay data-URI is a compile-time literal with NO author input, so there is no
color/CSS-injection surface (no `sanitizeAuthoringCssBackground` relaxation here —
that is 531). Each key joins its `assertKnownKeys` allowlist + JSON schema
(`additionalProperties:false`) in lockstep: an unknown key (`style.wobble`,
`effects.glow`) throws `PageDocumentError`. Bad boolean input coerces fail-soft.

## Test lane

**Vitest** (`tests/vitest/pages/`) — pure model round-trip. Delegated to
534-01-L04, asserted here: a block with `style.magnetic:true` round-trips and is
present; `magnetic:false` is OMITTED (byte-identity); a section with
`style.noiseOverlay:true` round-trips + validates against BOTH section-style
schemas (inline + partial responsive-override); `settings.effects.noiseOverlay:true`
round-trips + validates the effects schema; unknown key `style.wobble` /
`effects.glow` throws `PageDocumentError`; a legacy doc is byte-identical.

## Regression / owned-breaking-test notes

- No exhaustive-record break (these are optional style fields, not new
  block-type/enum members). Byte-identity tests hold (unauthored ⇒ omitted).
- If a `pageBlockStyleKeys` completeness/count assertion exists
  (`tests/vitest/pages/*`), it OWNS a `+1` update for `magnetic` — update in this
  commit.

## Hard Invariants

1. Present-only (`false`/unset omitted; defaults not seeded).
2. Reject-unknown: allowlist + JSON schema (block-style `$def`; BOTH section-style
   schemas; effects schema) in lockstep with each normalizer.
3. Booleans only — no color/CSS-injection surface (noise overlay is a static
   author-free data-URI literal; NO `sanitizeAuthoringCssBackground` relaxation).
4. No schemaVersion bump; no migration.
