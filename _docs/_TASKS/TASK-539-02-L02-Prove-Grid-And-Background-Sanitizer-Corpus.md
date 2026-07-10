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

Own only `tests/vitest/pages/page-authoring-sanitizers.test.ts`.

## Implementation Pseudocode

### Test Shape

Use deterministic table-driven cases:

- Accept `0`, `0.0`, `0px`, `.85fr`, `1fr`, `50%`, `1rem`, `1em`, `auto`, canonical
  `minmax(0,1fr)`, and bounded `repeat` combinations.
- Reject bare `%`, `rem`, and `em`, `minmax(5,1fr)`, `repeat(3,2)`,
  negative/unitless nonzero, over-count
  repeat/tracks, nested/unbalanced functions, rule metacharacters, URL and expression.
- Parse one gradient to `{image,color:null}`, one safe color to
  `{image:null,color}`, multiple gradients to a joined image, and gradients plus one
  final color to split fields.
- Reject a color before/between gradients, two colors, unsafe function/protocol,
  unbalanced parentheses, empty layer, layer-count overflow, and oversized input.
- Pin that `sanitizeAuthoringCssBackground` preserves the trimmed spelling of every
  accepted input and rejects exactly the parser's rejected corpus.
- Pin parser determinism and no mutation of input strings.

TASK-539-02-L01 has already updated and passed the exact existing grammar expectations.
This leaf owns only additive exhaustive/property/security cases in the same suite and
must not weaken or re-baseline those landed examples. The corpus must include closing-style-tag/rule-breakout strings used by the raw
responsive `<style>` threat model without documenting an exploitable payload in task
closeout beyond a redacted category name.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
```

If the test fails, rerun this file alone before classification.
