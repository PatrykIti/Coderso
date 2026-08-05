# TASK-539-02-L02: Prove Grid and Background Sanitizer Corpus

# FileName: TASK-539-02-L02-Prove-Grid-And-Background-Sanitizer-Corpus.md

**Parent Subtask:** TASK-539-02
**Priority:** High
**Category:** Pages / Vitest / Security Proof
**Estimated Effort:** Small
**Dependencies:** TASK-539-02-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Create only:

`tests/vitest/pages/page-authoring-sanitizers-security-corpus.test.ts`

Do not edit `page-authoring-sanitizers.test.ts`, production, consumers, TASK-541
files/tests, routes, parents/indexes/changelogs, scanner config/allowlists, DDL, or
dependencies. This additive suite must be independently runnable and at most 1,000
physical lines.

TASK-539-01-L01 owns the Page model-suite split and canonicalizes its existing
TASK-541 color fixtures before this leaf lands. This leaf treats every split Page
model suite as read-only and reruns all of them in its final gate; it must not edit or
rebaseline a model assertion to accommodate the sanitizer.

## Immutable deterministic corpus

Use frozen table-driven fixtures and explicit expected objects; never snapshots or
random fuzz without a fixed seed.

### Grid matrix

- Accept exact zero spellings (`0`, `0.0`, longer all-zero decimals), unitful zero,
  leading-dot/unitful lengths, `auto`, all allowed units, `minmax` with zero/unitful
  positions, bounded `repeat`, and 1/12 outer-track and repeat-count boundaries.
- Reject nonzero unitless values in standalone, either `minmax` argument, and repeat
  body; negatives; bare units; unsupported/case-changed units; zero-like malformed
  values; 0/13 repeat; 13 tracks; nested/unbalanced functions; multiple repeat body
  tracks; metacharacters; URL/expression; controls; non-ASCII whitespace; and
  oversized input.
- Table-drive the untouched raw grid value through every C0/C1 range category and
  every Unicode/ECMAScript whitespace code point other than ASCII space, explicitly
  including `U+FEFF`. Place cases at leading/trailing edges, between tracks, inside a
  grid function, and adjacent to its comma. Pin fail-closed rejection before
  `.trim()` or top-level tokenization; ASCII space alone remains legal and
  canonicalizes deterministically.
- Assert canonical top-level/function whitespace and deterministic second-pass output.

### Background/image-byte matrix

- Assert color-only, one gradient, irregular multi-gradient, and gradients plus one
  final color return exact `{image,color}` values.
- For every accepted image stack, derive the expected image literal in the fixture and
  compare exact bytes, including function casing, inner whitespace, and top-level
  separators. Assert changing only final-color spelling never changes `image`.
- Assert `sanitizeAuthoringCssBackground` returns exact image-only bytes, canonical
  color-only bytes, or exact image plus the one canonical `, ` delimiter and color.
- Assert the structured parser accepts one legal color and one legal gradient, while
  `isSafeAuthoringCssBackgroundLayers` is `false` for each single-layer form. Assert
  the helper is `true` for valid 2..`PAGE_BG_MAX_LAYERS` gradient/final-color stacks
  and `false` for invalid input or a stack above the cap. This pins historical
  cardinality while proving parser and predicate delegate to one analysis rather than
  retaining separate grammars.
- Reject color before/between gradients, multiple colors, empty layers, layer 7,
  imbalance, non-gradient image/fetch functions, unsafe protocols/at-rules/functions,
  rule/style-tag breakout categories, controls/non-ASCII whitespace, and whole-value
  overflow. Keep exploit strings in test fixtures; task closeout names only redacted
  attack categories.
- Table-drive the raw whole-value guard across every C0/C1 range category and every
  ECMAScript Unicode whitespace code point other than ASCII space, including
  `U+FEFF`, leading/trailing positions, a gradient interior, a top-level separator,
  and a final color slice. Pin that rejection occurs without trimming or other
  preprocessing.
- Freeze inputs/expected records and assert the parser never mutates them.

### TASK-541 raw-input parity

Import `CSS_COLOR_CORPUS_CASES` from the immutable
`tests/vitest/services/cssColorCorpus.ts` owner. Pass each `case.input` unchanged
through:

1. `sanitizeAuthoringCssColor`,
2. `isSafeAuthoringCssColor`, and
3. `parseAuthoringCssBackgroundPaint` as a color-only/final-color candidate where a
   string can be embedded without preprocessing.

Expected Page policy is TASK-541 authoring acceptance plus the second token filter:
all non-token accepted colors use `parsed.normalized`; only the seven Page tokens
accept; every other otherwise-valid token rejects. Do not copy the corpus acceptance
table or call `.trim()`/`.toLowerCase()` in the test adapter.

Build exact-cap/cap+1 ASCII-padding cases from `CSS_COLOR_VALUE_MAX_LENGTH` rather than
a numeric mirror. Include C0, C1, non-breaking space, and other Unicode whitespace.
Pin the untouched raw argument behavior in both single-color adapters and final-color
background parsing.

## Implementation Pseudocode

```text
create page-authoring-sanitizers-security-corpus.test.ts only
define deeply frozen, deterministic tables with explicit expected values

for each grid case:
  call the public grid sanitizer with the untouched input
  assert exact canonical bytes for acceptance or null for fail-closed rejection
  feed accepted output through a second pass and assert deterministic identity

for each background case:
  call parser, sanitizer, and layer predicate with the untouched input
  assert exact {image,color}, reconstruction bytes, and historical cardinality
  assert invalid/security cases reject and frozen fixtures remain unchanged

for each CSS_COLOR_CORPUS_CASES entry:
  pass case.input unchanged through both Page color adapters and the embeddable
  background color path; derive expectations from TASK-541 plus the seven-token filter

run this new suite independently, rerun every locked compatibility/model suite, run
lint/types, family line-limit and strict security gates, and report every exit code
```

## Security Contract

This is a pure boundary test; no route or public write changes. It proves the values
that may later reach inline and raw responsive CSS. Do not add a suppression or
scanner exception. Any nonzero strict security scan, tool failure, or new/touched-path
finding blocks this leaf and must be fixed before closure.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers-security-corpus.test.ts tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-tree-and-capabilities.test.ts tests/vitest/pages/page-document-v2-listing-and-settings.test.ts tests/vitest/pages/page-document-v2-style-contracts.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
bun run scan:security:strict
git diff --check
```

Report every exit code truthfully. Rerun a named failing test file alone once before
classification.
