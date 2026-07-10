# TASK-541-01-L02: Prove Canonical Color Corpus

# FileName: TASK-541-01-L02-Prove-Canonical-Color-Corpus.md

**Parent Subtask:** TASK-541-01
**Priority:** High
**Category:** Shared Styling / Vitest / Security Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-541-01-L01
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

---

## Ownership

Create and solely own these additive files:

- `tests/vitest/services/css-color-contract-corpus.test.ts`
- `tests/vitest/services/cssColorCorpus.ts`

The fixture exports immutable accepted/rejected/profile-boundary cases for later
consumer tests; it contains data only and imports no production boundary. Do not edit
`core/services/theme/cssColorContract.ts` or L01's
`tests/vitest/services/css-color-contract.test.ts`; the direct source-gate assertions are
an immutable input to this leaf, not a rebaseline target.

## Implementation Pseudocode

### Additive Generated Test Shape

No property-test dependency exists, so generate deterministic nested tables from the
shared fixture/helpers:

- Hex 3/4/6/8 casing, alpha endpoints, malformed lengths/chars.
- RGB number channels around `-1, 0, 1, 254, 255, 256` and percentages around
  `-1, 0, 1, 99.9, 100, 100.1`; cover mixed number/percent channels accepted by the
  declared grammar.
- Hue around `-1, 0, 1, 359.9, 360, 360.1`; saturation/lightness around
  `-1, 0, 100, 100.1`.
- Alpha number/percent endpoints, leading dot, overflow, NaN/infinity-like text.
- Whitespace/case/canonical comma spacing and normalize→normalize idempotence.
- Exact token grammar, transparent, and profile difference for currentColor/inherit.
- Named colors, color-mix/unlisted functions, unsafe fragments, rule/comment/control
  characters, arbitrary var names, empty input, a syntactically valid token generated
  at exactly `CSS_COLOR_VALUE_MAX_LENGTH`, and the same shape at max+1.
- Structural schema patterns may admit an out-of-range structurally valid function,
  but semantic parse must reject it; pin this distinction explicitly.
- For every accepted value, parsed normalized bytes equal `normalizeCssColorValue` and
  parse again to the same kind/value.

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
