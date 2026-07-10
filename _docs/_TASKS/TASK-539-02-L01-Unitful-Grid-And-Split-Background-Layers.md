# TASK-539-02-L01: Unitful Grid and Split Background Layers

# FileName: TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md

**Parent Subtask:** TASK-539-02
**Priority:** High
**Category:** Pages / CSS Security / Pure Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-539-02
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
```

Pseudocode:

```ts
if value is not a string, empty, or over PAGE_CSS_VALUE_MAX_LENGTH: return null
run the whole-value unsafe function/protocol/at-rule tripwire
split at top-level commas with balanced parenthesis tracking
reject empty layers or more than PAGE_BG_MAX_LAYERS
for each layer:
  if safe gradient: append to imageLayers, but reject any gradient after finalColor
  else if safe color and it is the last layer and finalColor is unset: set finalColor
  else: return null
require at least one image layer or one color
return { image: imageLayers.length ? imageLayers.join(", ") : null, color: finalColor }
```

Keep `sanitizeAuthoringCssBackground` as the persistence-compatible wrapper: return
the trimmed original string only when the canonical parser succeeds. Existing
exported boolean helpers may delegate to the parser/internal primitives, but no
consumer may maintain a second grammar. Avoid recursion between wrapper and parser.

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
- Single gradients, single safe colors, and pre-existing valid grid templates keep
  their output bytes. Multi-layer consumers receive a structured split, not raw
  author material in the wrong CSS property.

## Gate test ownership and validation

Update existing assertions in `page-authoring-sanitizers.test.ts` for the exact grammar
above before this source gate. TASK-539-02-L02 adds the exhaustive hostile/property
corpus afterward and must not re-baseline this leaf's positive/negative examples.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts
git diff --check
```

Rerun the named file alone on failure.
