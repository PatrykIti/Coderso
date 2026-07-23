# TASK-541-01-L02: Prove Canonical Color Corpus

# FileName: TASK-541-01-L02-Prove-Canonical-Color-Corpus.md

**Parent Subtask:** TASK-541-01
**Priority:** High
**Category:** Shared Styling / Vitest / Security Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-541-01-L01
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Ownership

Create and solely own these additive files:

- `tests/vitest/services/css-color-contract-corpus.test.ts`
- `tests/vitest/services/cssColorCorpus.ts`

The fixture exports one exact immutable case model for later consumer tests; it
contains data only. Its only permitted production import is
`CSS_COLOR_VALUE_MAX_LENGTH` from
`core/services/theme/cssColorContract.ts`; it must not import the parser,
schema patterns, profiles, types, or any other production helper. This single
constant import prevents the fixture from repeating the numeric `128` cap while
leaving every expected parser and structural result fixed in test data. Do not edit
`core/services/theme/cssColorContract.ts` or L01's
`tests/vitest/services/css-color-contract.test.ts`; the direct source-gate assertions are
an immutable input to this leaf, not a rebaseline target.

## Exact data-only export contract

`cssColorCorpus.ts` imports only `CSS_COLOR_VALUE_MAX_LENGTH` from the production
owner and defines these names exactly. It may not import the production parser,
schema patterns, or other helpers to derive expected results:

```ts
export const CSS_COLOR_CORPUS_PROFILES = [
  "authoring",
  "inherited-render",
] as const;
export type CssColorCorpusProfile = (typeof CSS_COLOR_CORPUS_PROFILES)[number];
export type CssColorCorpusKind = "hex" | "rgb" | "hsl" | "token" | "keyword";
export type CssColorCorpusRgb = Readonly<{
  red: number;
  green: number;
  blue: number;
}>;
export type CssColorCorpusExpectation =
  | Readonly<{
      kind: "hex" | "rgb" | "hsl";
      normalized: string;
      baseHex: string;
      alpha: number;
      rgb: CssColorCorpusRgb;
    }>
  | Readonly<{
      kind: "token";
      normalized: string;
    }>
  | Readonly<{
      kind: "keyword";
      normalized: "transparent" | "currentColor" | "inherit";
    }>;
export type CssColorCorpusCase = Readonly<{
  id: string;
  input: unknown;
  parser: Readonly<
    Record<CssColorCorpusProfile, CssColorCorpusExpectation | undefined>
  >;
  structural: Readonly<Record<CssColorCorpusProfile, boolean>>;
}>;

export const CSS_COLOR_CORPUS_CASES: readonly CssColorCorpusCase[];
export const CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS: readonly string[];
```

The arrays, every case, both profile maps, each expectation, and each RGB object
are created frozen (`Object.freeze`) as well as typed `Readonly`; IDs are unique
and stable. `CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS` is the exact frozen list of
cases whose anchored profile regex is intentionally `true` while semantic parsing
is `undefined` (for example an out-of-range channel). There are no unlabelled
pattern/parser disagreements. Later consumer tests import
`CSS_COLOR_CORPUS_CASES` unchanged and select by stable ID; they do not copy or
recompute expected canonical bytes. The discriminated expectation union mirrors
`ParsedCssColor` exactly: every literal `hex`/`rgb`/`hsl` expectation requires all
metadata, while token and keyword expectations cannot carry meaningless metadata.

## Implementation Pseudocode

### Additive Generated Test Shape

No property-test dependency exists, so generate deterministic nested tables from the
shared fixture/helpers:

- Hex 3/4/6/8 casing, alpha endpoints, malformed lengths/chars.
- RGB number channels around `0, 0.49, 0.5, 1, 254.5, 255, 256` and percentages
  around `0, 0.1, 49.8, 50, 99.9, 100, 100.1`; cover exact integer-byte rounding
  and mixed number/percent channels accepted by the declared grammar. Negative
  examples prove signs are syntactically rejected rather than range-clamped.
- Hue around `-1, 0, 1, 359.9, 360, 360.1`; saturation/lightness around
  `-1, 0, 100, 100.1`; bare/`deg`/case variants normalize to unitless hue.
- Mismatched legacy function aliases at both arities prove the canonical name is
  `rgb`/`hsl` for three channels and `rgba`/`hsla` when alpha is present.
- Alpha number/percent endpoints, leading dot, overflow, NaN/infinity-like text.
- Unsigned decimal rules: redundant leading/trailing zero canonicalization, rejected
  signs/trailing dots/exponents/hex numbers, and a long small decimal that remains
  ordinary decimal text rather than exponent notation.
- U+0020-only surrounding/internal whitespace, function/keyword case, canonical
  comma spacing, and normalize→normalize idempotence. Tabs, newlines, C0/C1 controls,
  NBSP/other Unicode whitespace, comments, and rule fragments stay rejected even
  where `String.trim()` would otherwise hide them.
- Exact lowercase custom-property grammar; case-insensitive `VAR` function name
  canonicalizes while uppercase/underscore token names and fallback arguments reject.
  Cover transparent and the profile difference for currentColor/inherit.
- Named colors, color-mix/unlisted functions, unsafe fragments, rule/comment/control
  characters, arbitrary var names, and empty input. Build two raw-length cases
  from one short valid terminal (for example `transparent`) plus only surrounding
  ASCII U+0020 padding, deriving both lengths from
  `CSS_COLOR_VALUE_MAX_LENGTH`: at exactly the cap both profiles parse to the
  terminal's canonical expectation and both structural decisions are `true`; at
  cap + 1 both parser expectations are `undefined` even though ASCII-space
  removal exposes the same terminal, while both structural decisions remain
  `true` because `CSS_COLOR_SCHEMA_PATTERNS` is only the regex component and the
  schema's `maxLength` is separate. The stable max+1 case ID therefore appears in
  `CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS`; the exact-cap case does not.
  Add a separate exactly-at-cap functional case whose canonical comma spacing,
  arity-derived function name, and leading alpha zero would exceed the cap. Both
  parser expectations are `undefined`, both structural decisions are `true`, and
  its stable ID is also present in `CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS`.
  This case is distinct from the padded short terminal: successful canonical
  output must itself fit the cap so normalize→normalize remains defined and
  idempotent.
  Never repeat the numeric `128` literal in this fixture or suite.
- Literal metadata expected in the data file pins hex expansion/alpha, numeric and
  percent RGB rounding, HSL-to-RGB primary/secondary colors, and hue 360 metadata
  equality with hue 0 without changing canonical HSL text.
- Structural schema patterns may admit an out-of-range structurally valid function,
  the deliberately overlength-but-otherwise-valid padded terminal, and the
  exactly-at-cap function whose canonical output would be overlength, but semantic
  parse must reject them. Assert every pattern decision against each
  case's `structural` map. For every case and profile, assert first that
  `parseCssColorValue(case.input, profile)` deep-equals the complete fixture value
  in `case.parser[profile]` (including `undefined` and every metadata field); do not
  compare a selected subset of the parsed result. Every semantic acceptance implies
  structural acceptance, and the complete mismatch-ID set equals
  `CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS` exactly.
- Separately, after that fixture-equality assertion, for every accepted value assert
  that its expected normalized bytes equal `normalizeCssColorValue`, parsing those
  normalized bytes deep-equals the same complete expectation, and normalization is
  idempotent. `cssColorProfiles` must equal
  `CSS_COLOR_CORPUS_PROFILES` exactly, preventing a silent profile addition.
- Assert the runtime freeze contract for the top-level arrays and every nested case,
  expectation, profile map, and RGB metadata object.

Do not use browser CSS acceptance as an oracle; the repository policy is intentionally
narrower and deterministic. The corpus suite imports the landed owner directly and adds
coverage only; it must not weaken, delete, snapshot-update, or duplicate L01's compact
direct assertions.

## Validation

```bash
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts \
  tests/vitest/services/css-color-contract-corpus.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Rerun this file alone on failure.
