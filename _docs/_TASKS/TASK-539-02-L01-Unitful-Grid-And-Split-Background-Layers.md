# TASK-539-02-L01: Unitful Grid and Split Background Layers

# FileName: TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md

**Parent Subtask:** TASK-539-02
**Priority:** High
**Category:** Pages / CSS Security / Pure Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-539-02, TASK-541
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Scope and ownership

Sole source writer: `core/services/pages/pageAuthoringSanitizers.ts`. Current grid
drift is around `:369-457`; background splitting/validation is around `:107-215`.
This leaf also owns the existing-expectation updates required before its source gate in
`tests/vitest/pages/page-authoring-sanitizers.test.ts`. Do not edit any consumer.

## Implementation Pseudocode

Export:

```ts
export type AuthoringCssBackgroundPaint = {
  image: string | null;
  color: string | null;
};

export function parseAuthoringCssBackgroundPaint(
  value: unknown
): AuthoringCssBackgroundPaint | null;

function parsePageAuthoringColor(value: unknown): string | null {
  // `value` is the original layer source slice. Do not trim/lowercase it here.
  const parsed = parseCssColorValue(value, "authoring");
  if (!parsed) return null;
  if (parsed.kind !== "token") return parsed.normalized;
  return isAuthoringColorToken(parsed.normalized) ? parsed.normalized : null;
}

export const sanitizeAuthoringCssColor = (value: unknown): string | null =>
  parsePageAuthoringColor(value);

export const isSafeAuthoringCssColor = (value: unknown): boolean =>
  sanitizeAuthoringCssColor(value) !== null;
```

These two exported adapters receive the caller's raw input unchanged. They must
not trim, lowercase, regex-classify, or maintain a compatibility grammar before
`parsePageAuthoringColor`; their only Page-specific step is the exact seven-token
filter after TASK-541 parsing. Internal gradient/background code uses these same
semantics without recursive adapter calls.

Pseudocode:

```ts
if value is not a string, empty, or over PAGE_CSS_VALUE_MAX_LENGTH: return null
run the whole-value unsafe function/protocol/at-rule tripwire
split at top-level commas with balanced parenthesis tracking
reject empty layers or more than PAGE_BG_MAX_LAYERS
retain source start/end offsets for every layer and delimiter
for each layer (retain its original source slice and separately locate trimmed
bounds for structural gradient validation):
  if safe gradient: remember its validated source range, but reject any gradient after finalColor
  else if parsePageAuthoringColor(originalSourceSlice) succeeds and it is the last
       layer and finalColor
       is unset: set its canonical bytes as finalColor
  else: return null
require at least one image layer or one color
if image layers exist:
  image := exact substring from first image start through last image end,
           with only whole-value outer ASCII spaces removed
return { image, color: finalColor }
```

`finalColor` is always `parsed.normalized` from TASK-541. Consumers never append it
to `background-image`; they emit it to `background-color`. `image` is the exact
validated image-stack substring, including original function casing/spacing and
the original separators between image layers; it is not `imageLayers.join(", ")`.
For a gradient-only input it equals the whole outer-trimmed input. If a persistence
or diagnostic seam needs a combined spelling, return `image` for image-only,
`color` for color-only, or `${image}, ${color}` for a split image+color result.
Never retain or emit an unparsed whole input as a second authority. A canonical
final color must not cause `image` reconstruction: the validated outer-trimmed
image substring remains raw-image byte-identical.
The final-color source slice reaches `parseCssColorValue` unchanged before any
consumer-side trim/lowercase/regex classification. TASK-541 therefore measures the
raw slice length and rejects controls/non-ASCII whitespace; Page applies only its
seven-token policy to the successful parsed result.

Keep `sanitizeAuthoringCssBackground` as the persistence-compatible wrapper:
gradient-only values stay trimmed-byte-identical; an image stack plus final color
preserves the image substring and canonicalizes only that final color; a single
color comes from TASK-541's shared canonical parser. Exported boolean helpers
delegate exactly as shown above; no consumer may maintain a second grammar. Avoid
recursion between wrapper and parser.

The Page token filter remains exactly the seven `authoringColorTokenNames`
(`primary`, `secondary`, `accent`, `bg`, `surface`, `text`, `border`) after shared
parsing. Named colors and arbitrary `var(--color-*)` values reject. TASK-541 files
and its current Page control gates are read-only here; the future gallery-control
suite is unrelated and must not be used as color-contract evidence.

Correct both `GRID_LEN` and `GRID_TRACK` with this exact grammar:

```text
ZERO       := 0 | 0.0 | 0.00...       (canonical output remains the trimmed spelling)
NUMBER     := digits[.digits] | .digits
UNITFUL    := NUMBER(fr|px|%|rem|em)
GRID_LEN   := ZERO | UNITFUL | auto
GRID_TRACK := ZERO | UNITFUL | auto | minmax(GRID_LEN,GRID_LEN)
              | repeat(integer 1..12, GRID_LEN)
```

Only numeric zero may be unitless, including as a standalone track. Reject bare `%`,
`rem`, `em`, or any other unit; reject every nonzero unitless number, including inside
`minmax`/`repeat`. Accept exact examples `0`, `0.0`, `0px`, `.85fr`, `50%`, `1rem`,
`1em`, `minmax(0, 1fr)`, and `repeat(3, 1fr)`. Preserve repeat bounds, track-count bounds,
metacharacter rejection, and canonical whitespace output.

## Errors and compatibility

- All invalid input returns `null`; do not throw from these sanitizer helpers.
- Never weaken URL/function tripwires to make a corpus pass.
- Single/stacked gradient image substrings, already-canonical safe colors, absent
  values, and pre-existing valid grid templates keep their output bytes after outer
  trim. Accepted noncanonical final colors change only to the shared canonical
  spelling. Multi-layer consumers receive a structured validated split, not raw
  author material in the wrong CSS property.

## Gate test ownership and validation

Update existing assertions in `page-authoring-sanitizers.test.ts` for the exact grammar
above before this source gate. TASK-539-02-L02 adds the exhaustive hostile/property
corpus afterward and must not re-baseline this leaf's positive/negative examples.
This source gate includes a compact raw-input ordering set derived from
`CSS_COLOR_VALUE_MAX_LENGTH`: original ASCII-padded final-color slices at the exact
cap and cap + 1, plus C0/C1-control and Unicode-whitespace cases. Exact-cap input
canonicalizes; all others reject without consumer preprocessing. Do not repeat the
numeric cap as a literal. Run the same compact set directly through both exported
single-color adapters and as the final layer of `parseAuthoringCssBackgroundPaint`.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/pages/page-authoring-sanitizers.test.ts
git diff --check
```

Rerun the named file alone on failure.
