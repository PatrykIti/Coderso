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
  `{image:null,color}`, multiple gradients to the exact outer-trimmed source image
  substring (including deliberately irregular internal comma whitespace/casing),
  and gradients plus one final color to split fields while canonicalizing only the
  color member.
- Reject a color before/between gradients, two colors, unsafe function/protocol,
  unbalanced parentheses, empty layer, layer-count overflow, and oversized input.
- Pin that `sanitizeAuthoringCssBackground` is trimmed-byte-identical for every
  gradient-only input; for image+color input it preserves the exact validated image
  substring and reconstructs only the delimiter before the canonical final color;
  for color-only input it returns canonical color bytes. It rejects exactly the
  parser's rejected corpus.
- Pin parser determinism and no mutation of input strings.
- Import the immutable TASK-541 `cssColorCorpus.ts` fixture. Pass each relevant
  `case.input` unchanged through both exported adapters
  (`sanitizeAuthoringCssColor` and `isSafeAuthoringCssColor`) and through
  `parseAuthoringCssBackgroundPaint` with that same untouched input as the final
  color layer. Compare all three results with the corpus expectation plus Page's
  second policy: all non-token authoring colors follow TASK-541 canonical bytes,
  exactly `primary`, `secondary`, `accent`, `bg`, `surface`, `text`, and `border`
  tokens accept, and every arbitrary otherwise-valid `var(--color-*)` token rejects
  in all three paths. Do not pre-normalize corpus input or copy its acceptance table.
- Build final-layer exact-cap and cap+1 ASCII-padding cases from
  `CSS_COLOR_VALUE_MAX_LENGTH`, and include C0/C1 controls plus Unicode whitespace.
  Run each original case directly through both exported adapters and as a final
  background layer. Exact-cap canonicalizes; cap+1/control/Unicode-space values
  reject even though local trimming could expose a valid terminal.
- For every accepted multi-image case, assert `image` equals the exact source
  substring between the first image's trimmed start and last image's trimmed end,
  including original function casing, internal whitespace, and delimiters; only the
  outer whole-value ASCII spaces and the split final-color slice are excluded.
  Assert separately that changing only the final color spelling/canonical bytes
  never changes that image substring (raw-image identity).

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
The strict scan must run and its exit code is reported truthfully. Only the sole,
unchanged TASK-545-owned workflow finding may be recorded as an external non-green
result after a clean touched-path scan; any TASK-539/new/additional finding or tool
failure blocks this leaf. Do not add a suppression or call a nonzero scan green.
