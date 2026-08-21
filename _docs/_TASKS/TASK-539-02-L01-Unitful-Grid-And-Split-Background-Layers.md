# TASK-539-02-L01: Unitful Grid and Split Background Layers

# FileName: TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md

**Parent Subtask:** TASK-539-02
**Priority:** High
**Category:** Pages / CSS Security / Pure Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-539-02, TASK-541
**Status:** ✅ Done
**Completed:** 2026-08-20
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Scope and ownership

Sole source writer:
`core/services/pages/pageAuthoringSanitizers.ts`.

This leaf also owns compatibility/changed-behavior updates in
`tests/vitest/pages/page-authoring-sanitizers.test.ts`.

Do not edit any consumer, TASK-541 file/test, model file, route, the L02 security
corpus, parent/index/changelog, scanner configuration, DDL, or dependency.

## Single-color delegation

Import `parseCssColorValue` from
`core/services/theme/cssColorContract.ts`. Preserve the existing export names while
widening input only as needed for raw delegation:

```ts
function parsePageAuthoringColor(value: unknown): string | null {
  const parsed = parseCssColorValue(value, "authoring"); // untouched raw value
  if (!parsed) return null;
  if (parsed.kind !== "token") return parsed.normalized;
  return isAuthoringColorToken(parsed.normalized) ? parsed.normalized : null;
}

export const sanitizeAuthoringCssColor = (value: unknown): string | null =>
  parsePageAuthoringColor(value);

export const isSafeAuthoringCssColor = (value: string): boolean =>
  parsePageAuthoringColor(value) !== null;
```

Neither adapter nor an internal caller may trim, lowercase, regex-test, coerce, or
length-check before TASK-541. Delete the Page-local hex/named/functional color grammar.
After parsing, Page's only additional rule is the exact existing seven-token allowlist:

```text
var(--color-primary)
var(--color-secondary)
var(--color-accent)
var(--color-bg)
var(--color-surface)
var(--color-text)
var(--color-border)
```

Other valid TASK-541 tokens reject. Non-token authoring colors use TASK-541 canonical
bytes.

## Structured background parser

Export:

```ts
export type AuthoringCssBackgroundPaint = {
  image: string | null;
  color: string | null;
};

export function parseAuthoringCssBackgroundPaint(
  value: unknown
): AuthoringCssBackgroundPaint | null;
```

Use one internal bounded parser/range walk for the structured parser and compatibility
helpers. The internal result carries both public paint and compatibility cardinality:

```ts
type AuthoringCssBackgroundAnalysis = {
  paint: AuthoringCssBackgroundPaint;
  layerCount: number;
};

function analyzeAuthoringCssBackgroundPaint(
  value: unknown
): AuthoringCssBackgroundAnalysis | null;

const unicodeWhitespaceCodePointPattern = /^\p{White_Space}$/u;

function hasForbiddenAuthoringCssRawCodePoint(raw: string): boolean {
  for (const char of raw) {
    const codePoint = char.codePointAt(0)!;
    const isControl =
      codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
    const isNonAsciiWhitespace =
      char !== " " &&
      (unicodeWhitespaceCodePointPattern.test(char) || codePoint === 0xfeff);
    if (isControl || isNonAsciiWhitespace) return true;
  }
  return false;
}
```

Its data flow is exact:

```text
reject non-string, empty, or > PAGE_CSS_VALUE_MAX_LENGTH
before any trim/split/regex/walk, scan the entire raw string and reject:
  every C0/C1 control code point (U+0000..U+001F, U+007F..U+009F)
  every Unicode/ECMAScript whitespace code point other than ASCII space U+0020,
    including BOM U+FEFF
apply the existing whole-value unsafe function/protocol/at-rule tripwire
walk once, tracking balanced parentheses and top-level comma source offsets
reject imbalance, empty layers, or > PAGE_BG_MAX_LAYERS total layers
for each original source slice:
  validate its separately located trimmed bounds as one safe gradient; or
  pass the untouched original slice to parsePageAuthoringColor
  permit exactly one color and only in the final layer
  reject every other layer
require at least one gradient or color
image = null when no gradients, otherwise the exact source slice from the first
        gradient's trimmed start through the last gradient's trimmed end
color = the final color's TASK-541 canonical bytes or null
return {paint:{image,color}, layerCount:number of validated top-level layers}
```

The shared raw code-point scan is whole-value and precedes outer trimming, layer
slicing, the gradient regex, and TASK-541 delegation. It therefore rejects TAB/LF/CR
and every other C0 control, all C1 controls, NBSP, BOM, and the remaining
Unicode/ECMAScript whitespace even when they occur only at an outer edge or between
otherwise legal gradient tokens. ASCII space remains the sole legal whitespace.

The final color slice includes its original leading/trailing spaces from the top-level
split when passed to TASK-541. This makes TASK-541's 128-character raw cap,
ASCII-space rule, and control/non-ASCII rejection authoritative.

`image` is never reconstructed with `join`. It preserves function casing, internal
spacing, and the exact separators between gradient layers; only whole-value outer
ASCII spaces and the final color delimiter/slice are excluded. A gradient-only result
therefore has `image` equal to the whole outer-ASCII-trimmed input. Color
canonicalization must never alter `image`.

Preserve compatibility exports with no second grammar or second walk:

```ts
export const parseAuthoringCssBackgroundPaint = (
  value: unknown
): AuthoringCssBackgroundPaint | null =>
  analyzeAuthoringCssBackgroundPaint(value)?.paint ?? null;

export const isSafeAuthoringCssBackgroundLayers = (value: string): boolean => {
  const analysis = analyzeAuthoringCssBackgroundPaint(value);
  return analysis !== null && analysis.layerCount >= 2;
};

export const sanitizeAuthoringCssBackground = (value: unknown): string | null => {
  const analysis = analyzeAuthoringCssBackgroundPaint(value);
  if (!analysis) return null;
  const { paint } = analysis;
  if (paint.image && paint.color) return `${paint.image}, ${paint.color}`;
  return paint.image ?? paint.color;
};
```

The analysis already rejects more than `PAGE_BG_MAX_LAYERS`, so the boolean expression
preserves exactly the historical 2..max cardinality. A valid single color or single
gradient still parses and sanitizes but returns `false` from
`isSafeAuthoringCssBackgroundLayers`. The boolean helper does not compare or
reclassify paint members and does not own another grammar.

Keep `isSafeAuthoringCssGradient`, URL/rich-text/font/grid exports, layer/whole-value
caps, and non-background behavior stable. Do not recurse between wrappers.

## Zero-only unitless grid grammar

Retain the existing positive metacharacter, length, track-count, repeat-count, and
top-level-tokenizer guards. Replace only the numeric grammar:

```text
ZERO       := 0 | 0.0 | 0.00...
NUMBER     := digits[.digits] | .digits
UNITFUL    := NUMBER(fr|px|%|rem|em)
GRID_LEN   := ZERO | UNITFUL | auto
GRID_TRACK := GRID_LEN
            | minmax(GRID_LEN, GRID_LEN)
            | repeat(integer 1..12, GRID_LEN)
```

The outer list remains 1..12 tracks. Units/function names remain lowercase as today.
Accept `0`, `0.0`, `0.00`, `0px`, `.85fr`, `50%`, `1rem`, `1em`,
`minmax(0, 1fr)`, and `repeat(3, 1fr)`. Reject bare nonzero numbers everywhere,
including `5`, `minmax(5,1fr)`, and `repeat(3,2)`, as well as negative values, bare
units, unsupported units, nested functions, or multiple repeat inner tracks.

Preserve the trimmed spelling of bare accepted tracks. Continue canonicalizing
top-level whitespace to one space and function comma spacing to
`minmax(0,1fr)` / `repeat(3,1fr)`.

Before assigning `const raw = value.trim()`, running the metacharacter regex, or
calling `gridTopLevelTracks`, scan the untouched input through
`hasForbiddenAuthoringCssRawCodePoint(value)` and return `null` on any match. This is
an exact raw guard: reject all C0/C1 controls and every Unicode/ECMAScript whitespace
code point other than ASCII space, with an explicit `U+FEFF` check because it is not
covered by Unicode `White_Space`. Do not let `.trim()` erase a leading/trailing
forbidden character, and do not let the current `/\s/` tokenizer reinterpret one as
an ordinary separator. The numeric grammar and existing ASCII-space
canonicalization then run unchanged.

## Error and compatibility behavior

- Sanitizers return `null`/`false`; they do not throw.
- No unsafe string reaches output merely to preserve old bytes.
- Existing gradient image bytes and canonical color bytes remain stable within the
  corrected grammar. Accepted noncanonical colors deliberately become TASK-541
  canonical bytes.
- No route, schema version, consumer, DDL, dependency, or scanner-policy change.

## Implementation Pseudocode

```text
edit only pageAuthoringSanitizers.ts and its owned compatibility test file
parsePageAuthoringColor(value):
  pass the untouched value to parseCssColorValue(value, "authoring")
  return null on parser rejection or a non-Page token
  otherwise return the TASK-541 normalized bytes

analyzeAuthoringCssBackgroundPaint(value):
  reject wrong type/empty/oversize, forbidden raw code points, and whole-value tripwire
  walk the original bytes once to identify balanced top-level layer source ranges
  reject empty/over-cap layers
  classify each original slice as a safe gradient or untouched TASK-541 color input
  permit one color only as the final layer; preserve the exact gradient image range
  return {paint:{image,color},layerCount}; return null on every invalid branch

parseAuthoringCssBackgroundPaint / sanitizeAuthoringCssBackground /
isSafeAuthoringCssBackgroundLayers:
  delegate once to the shared analysis and project only the locked public result

sanitizeAuthoringGridTemplate(value):
  reject forbidden raw code points before trim/tokenization
  apply the existing structural guards and the zero-or-unitful grammar
  return canonical ASCII-space/function-comma bytes, or null without throwing

run the owned compatibility, byte-identity, cap, raw-guard, token, and grid matrices;
then run every exact validation gate below and enforce the family line limit
```

## L01 test shape

Update the existing sanitizer suite for:

- all preserved export names and delegation to the single analysis, including the
  exact exported signatures `sanitizeAuthoringCssColor(value: unknown)` and
  `isSafeAuthoringCssColor(value: string): boolean`;
- exact one/two/six-gradient image substrings with irregular casing/spacing;
- gradient+final-color split, color-only, canonical reconstruction, and raw-image
  identity under different equivalent final color spellings;
- parser/sanitizer acceptance for one legal color and one legal gradient while
  `isSafeAuthoringCssBackgroundLayers` is false for each; boolean `true` at valid two
  and `PAGE_BG_MAX_LAYERS` layers and `false` above the cap;
- colors before/between gradients, two colors, URL/image functions, tripwires,
  imbalance, empty layers, layer/length overflow;
- direct raw color adapters and final-layer parsing at
  `CSS_COLOR_VALUE_MAX_LENGTH`, cap+1, and whole-background guards that reject every
  C0/C1 control and non-ASCII Unicode whitespace before normalization, including
  outer-edge and inside-gradient cases;
- exact seven-token acceptance and arbitrary valid token rejection;
- every accepted/rejected zero-only grid position and canonical ASCII-space output;
- the grid raw guard at leading, trailing, between-track, function-interior, and
  comma-adjacent positions, covering every C0/C1 range category, every
  Unicode/ECMAScript whitespace code point other than ASCII space, and `U+FEFF`,
  with deterministic rejection before trim/tokenization.

L02 adds only its new exhaustive corpus; do not place L02 cases here.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

The line gate uses the verified pre-TASK-539 baseline and every touched
production/test path through the final tree; each must be `<=1000`. Rerun a named
failing file alone before classification.
