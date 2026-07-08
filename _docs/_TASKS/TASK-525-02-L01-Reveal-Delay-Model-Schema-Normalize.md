# TASK-525-02-L01: `revealDelay` Model + Allowlist + JSON Schema + Normalizer

# FileName: TASK-525-02-L01-Reveal-Delay-Model-Schema-Normalize.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-02
**Priority:** High
**Category:** Schema (JSON model) / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Four lockstep edits in `core/services/pages/pageDocumentV2.ts`, all in the
block-style regions: (1) add `revealDelay?: number` to `PageBlockStyleV2`; (2) add
`"revealDelay"` to `pageBlockStyleKeys`; (3) add `revealDelay: numericSchema(min,max)`
to the block-style JSON schema properties; (4) normalize `revealDelay` present-only
via `readNumber` (clamp) — emitting it only when the input is defined; omitting
otherwise (never `null`, never `0`-as-present when unset). NO schemaVersion bump, NO
migration.

Define a clamp constant `PAGE_REVEAL_DELAY_CLAMP = { min: 0, max: 4000 }` (ms —
same bound as `PAGE_DECORATION_DELAY_CLAMP`; adjust max to taste but keep bounded).

## Grounded anchors (RE-GREP at implement time — 523 shifts lines)

- **`PageBlockStyleV2`** (`pageDocumentV2.ts:570-631`) — carries the present-only
  522 fields (`decoration?`, `tilt?`, `layer?`, `surfacePreset?`, `hoverEffect?`,
  `marquee?`, `composition?`, `:585-630`). Add `revealDelay?: number` adjacent
  (e.g. after `composition`).
- **`pageBlockStyleKeys`** (`as const` list, `:705-735`, ending `"marquee",
  "composition"`) — the reject-unknown allowlist fed to `assertKnownKeys`. Add
  `"revealDelay"`.
- **Block-style JSON schema properties** — the `$defs/pageBlockStyle` object
  (props `:1421-1453`, `additionalProperties:false`, closing `:1454`). The
  `decoration.delay` schema uses `numericSchema(PAGE_DECORATION_DELAY_CLAMP.min,
  PAGE_DECORATION_DELAY_CLAMP.max)` (`:1423`). Add
  `revealDelay: numericSchema(PAGE_REVEAL_DELAY_CLAMP.min, PAGE_REVEAL_DELAY_CLAMP.max)`.
- **Block-style normalizer** (`normalizeBlockStyle` region; 522 fields normalize
  `:2705-2815`, function closes `Object.keys(result).length > 0 ? result :
  undefined` `:2816`). `readNumber` (`:1879`) = `Number.isFinite` guard + clamp.
  `decoration.delay` is a model of the exact call (`:2718`). Add the `revealDelay`
  block alongside the 522 fields.

## Implementation pseudocode

```ts
// clamp constant (near PAGE_DECORATION_DELAY_CLAMP):
export const PAGE_REVEAL_DELAY_CLAMP = { min: 0, max: 4000 } as const; // ms

// (1) PageBlockStyleV2 — present-only number:
export type PageBlockStyleV2 = {
  /* …surfacePreset, hoverEffect, marquee, composition… */
  /** Per-block scroll-reveal stagger (ms, clamped). Emits --reveal-delay consumed
   *  by the reveal transition-delay so a revealing section's children cascade.
   *  Present-only: omitted when unset. TASK-525-02-L01. */
  revealDelay?: number;
};

// (2) pageBlockStyleKeys — reject-unknown allowlist:
const pageBlockStyleKeys = [ /* …existing… */,
  "marquee", "composition",
  "revealDelay",           // TASK-525-02-L01 per-block staggered reveal (present-only)
] as const;

// (3) block-style JSON schema properties (additionalProperties:false stays):
{ /* …marquee, composition… */
  revealDelay: numericSchema(PAGE_REVEAL_DELAY_CLAMP.min, PAGE_REVEAL_DELAY_CLAMP.max),
}

// (4) normalizer — present-only via readNumber (clamp; omit when unset).
if (input.revealDelay !== undefined) {
  result.revealDelay = readNumber(
    input.revealDelay, 0, PAGE_REVEAL_DELAY_CLAMP.min, PAGE_REVEAL_DELAY_CLAMP.max
  );
}
// NOTE: present-only — the key is emitted ONLY when input.revealDelay is defined.
// An unset block never carries revealDelay (byte-identical). A NaN/Infinity/out-of-
// range value clamps fail-soft (readNumber → fallback 0 for non-finite, else min/max
// clamp). Unlike a color, no null path — the field is `number` (present-only).
```

## Security note

`revealDelay` is a NUMBER constrained ONLY through `readNumber` (`Number.isFinite`
+ min/max clamp) at the write boundary — a NaN/Infinity/±1e9/negative value clamps
to the bounded range (fail-soft), never a raw value. It is later emitted ONLY as
the `--reveal-delay` CSS custom property (`${n}ms`, 525-02-L02) consumed by a fixed
`transition-delay` declaration — never a raw CSS declaration, markup, or URL.
Present-only (omitted when unset) so the reject-unknown allowlist +
`additionalProperties:false` schema close the fail-closed read trap. No string, no
interpolation of author text into CSS.

## Vitest test lane

- `tests/vitest/pages/page-document-v2.test.ts` (block-style normalize/round-trip
  suite the 522 fields use) — round-trip, reject-unknown, present-only, clamp
  (NaN/out-of-range). Authored in 525-02-L04.

## Regression / breaking-test ownership

- No breaking-test change: `revealDelay` is purely ADDITIVE + present-only, so
  every existing byte-identity / round-trip test for blocks WITHOUT `revealDelay`
  passes unchanged. 525-02-L04 adds the new coverage.

## Hard Invariants

1. Present-only: `revealDelay` emitted ONLY when input is defined; omitted (not
   `null`, not implicit `0`) otherwise — no-delay blocks byte-identical.
2. Allowlist + JSON schema + normalizer move in ONE lockstep land (a forgotten
   allowlist entry silently drops the key on read).
3. Number ONLY via `readNumber` (clamped `PAGE_REVEAL_DELAY_CLAMP`); no
   schemaVersion bump (`:29` stays `2`), no migration.
