# TASK-524-02-L01: `surfaceTint` Model + Allowlist + JSON Schema + Normalizer

# FileName: TASK-524-02-L01-Surface-Tint-Model-Schema-Normalize.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-02
**Priority:** High
**Category:** Schema (JSON model) / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Four lockstep edits in `core/services/pages/pageDocumentV2.ts`, all in the
block-style regions: (1) add `surfaceTint?: string` to `PageBlockStyleV2`; (2) add
`"surfaceTint"` to the block-style allowlist `pageBlockStyleKeys`; (3) add
`surfaceTint: { type: "string" }` to the block-style JSON schema properties; (4)
normalize `surfaceTint` present-only via `readOptionalSafeColor`
(`sanitizeAuthoringCssColor`-backed, alpha-capable) — OMITTING it when unset or when
the color is invalid (never `null`). NO schemaVersion bump, NO migration.

## Grounded anchors (RE-GREP at implement time — 522/523 shift lines)

- **`PageBlockStyleV2`** (`:586-631`) — carries `textColor?: string | null` (`:586`),
  `background?: string | null`, and the 522 present-only fields
  (`surfacePreset?`, `hoverEffect?`, `decoration?`, `tilt?`, `layer?`, `marquee?`,
  `composition?`, `:616-630`). Add `surfaceTint?: string` adjacent to `surfacePreset`.
- **`pageBlockStyleKeys`** (`as const` list, the 522 fields end at `:735` with
  `"surfacePreset","hoverEffect","marquee","composition"`) — the reject-unknown
  allowlist fed to `assertKnownKeys`. Add `"surfaceTint"`.
- **Block-style JSON schema properties** — the object whose props include
  `surfacePreset: { type: "string", enum: [...pageSurfacePresets] }` (`:1442`),
  `hoverEffect` (`:1443`), `layer` (`:1432`), `marquee` (`:1445`), closing at `:1454`;
  `textColor: { type: ["string","null"] }` sits at `:1389`. Add
  `surfaceTint: { type: "string" }` (present-only STRING — no `null`, unlike
  `textColor`, because `surfaceTint` is omitted-when-unset).
- **Block-style normalizer** — the `normalizeBlockStyle`-family region where
  `textColor` normalizes at `:2606-2608`
  (`result.textColor = readOptionalSafeColor(input.textColor) ?? null;`) and the 522
  fields normalize at `:2702-2811`. `readOptionalSafeColor` (`:1849`) returns
  `undefined` for undefined, `null` for null, else `sanitizeAuthoringCssColor(value)`
  (which returns a validated color or `undefined`). Add the present-only `surfaceTint`
  block right after `textColor`/`background`.

## Implementation pseudocode

```ts
// (1) PageBlockStyleV2 — add present-only surfaceTint (adjacent to surfacePreset):
export type PageBlockStyleV2 = {
  /* …textColor, background, …522 fields… */
  /** Independent glass/glow tint (alpha-capable), seeds --surface-glow etc.
   *  INDEPENDENT of `background`. Present-only: omitted when unset. */
  surfaceTint?: string;
  surfacePreset?: PageSurfacePreset;
  /* …hoverEffect, decoration, tilt, layer, marquee, composition… */
};

// (2) pageBlockStyleKeys — add to the reject-unknown allowlist:
const pageBlockStyleKeys = [ /* …existing… */,
  "surfaceTint",           // TASK-524-02-L01 independent glass tint (present-only)
  "surfacePreset", "hoverEffect", "marquee", "composition",
] as const;

// (3) block-style JSON schema properties — present-only string (no null):
{
  /* …surfacePreset, hoverEffect, layer, marquee… */
  surfaceTint: { type: "string" },   // additionalProperties:false stays; sanitized at normalize
}

// (4) normalizer — present-only via readOptionalSafeColor (sanitizeAuthoringCssColor).
//     Emit ONLY when a VALID color survives sanitization; omit otherwise (never null/"" ).
if (input.surfaceTint !== undefined) {
  const c = readOptionalSafeColor(input.surfaceTint);   // undefined | null | sanitized-string
  if (typeof c === "string" && c.length > 0) result.surfaceTint = c;  // present-only: only emit a real color
}
// NOTE (vs textColor): textColor stores `?? null` because its type is `string | null`.
// surfaceTint is `string` (present-only) → NEVER assign null; omit the key entirely so a
// no-tint / bad-tint block stays byte-identical. A malformed color (expression(...), url(js:))
// → sanitizeAuthoringCssColor returns undefined → key omitted → CSS literal fallback (fail-soft).
```

## Security note

`surfaceTint` is a COLOR string constrained ONLY through `sanitizeAuthoringCssColor`
(via `readOptionalSafeColor`) at the write boundary — accepts
hex/hex8/`rgb[a]()`/`hsl[a]()`/`var(--…)`/`transparent`; rejects everything else
(returns undefined → key omitted). Raw stored input never reaches the model. Present-only
(omitted when unset/invalid, never `null`) so the reject-unknown allowlist +
`additionalProperties:false` schema close the fail-closed read trap. No new markup,
URL, or interpolation surface.

## Vitest test lane

- `tests/vitest/pages/page-document-v2.test.ts` (or the existing page-document
  normalize/round-trip suite the 522 style fields use) — round-trip, reject-unknown,
  present-only, sanitize-fallback. (Authored in 524-02-L04.)

## Regression / breaking-test ownership

- No breaking-test change: `surfaceTint` is purely ADDITIVE + present-only, so every
  existing byte-identity / round-trip test for blocks WITHOUT `surfaceTint` still
  passes unchanged. 524-02-L04 adds the new coverage.

## Hard Invariants

1. Present-only: `surfaceTint` emitted ONLY for a valid sanitized color; omitted (not
   `null`, not `""`) otherwise — no-tint blocks byte-identical.
2. Allowlist + JSON schema + normalizer move in ONE lockstep land (a forgotten
   allowlist entry silently drops the key on read).
3. Color ONLY via `sanitizeAuthoringCssColor` (`readOptionalSafeColor`); no
   schemaVersion bump (`:29` stays `2`), no migration.
</content>
