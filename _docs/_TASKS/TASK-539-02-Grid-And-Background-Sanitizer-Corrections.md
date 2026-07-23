# TASK-539-02: Grid and Background Sanitizer Corrections

# FileName: TASK-539-02-Grid-And-Background-Sanitizer-Corrections.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / CSS Security / Pure Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-539-01, TASK-541
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Keep all author-controlled Page CSS behind one positive grammar: unitless grid
lengths are zero-only, and safe background layers are parsed into image layers plus
an optional final color before any renderer emits them.

For every single-color layer, import TASK-541's Bun-free authoring parser and then
apply Page's narrower seven-token allowlist. Do not add a Page-local rgb/hsl/hex
parser or accept an arbitrary `--color-*` token merely because TASK-541 accepts it.
Pass the original final-layer source slice directly to that parser before Page-side
trimming, lowercasing, or classification so TASK-541 remains the sole raw-length
and whitespace authority.

The existing exported `sanitizeAuthoringCssColor` and
`isSafeAuthoringCssColor` are part of this handoff: both delegate their original
raw argument to the shared parser and then the same Page token filter. They do not
retain a local grammar or pretrim. Background final-layer parsing calls that exact
adapter/primitive, while validated image-layer bytes remain outside color
canonicalization and preserve raw-image identity after whole-value outer trim.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-02-L01 | Sole sanitizer implementation | ⏳ To Do |
| TASK-539-02-L02 | Grid/background security corpus | ⏳ To Do |

## Ownership

- L01 is the sole TASK-539 writer of
  `core/services/pages/pageAuthoringSanitizers.ts` and owns required
  compatibility/changed-behavior updates in
  `tests/vitest/pages/page-authoring-sanitizers.test.ts` before its source gate.
- L02 owns only additive exhaustive/property/security cases in that suite; it reruns
  L01 assertions read-only and cannot re-baseline them.
- Renderer and responsive leaves import `parseAuthoringCssBackgroundPaint`; they
  must not mirror layer splitting or tripwires.
- TASK-541 source/tests are read-only dependencies. L01 imports their public
  helper and reruns the canonical color suites; it never edits/rebaselines them.

## Security Contract

No route or public write is added. Existing strict Page writes remain authenticated,
RBAC/CSRF protected, and rate-limited. This pure module is a load-bearing CSS
validation boundary: retain length caps, balanced-parenthesis checks, top-level
splitting, layer cap, unsafe-function/protocol tripwire, and positive per-layer
validation. No scanner exception is allowed.

## Acceptance and validation

- `minmax(0,1fr)` remains valid; nonzero unitless bounds fail.
- Gradient stacks and a single final safe color parse deterministically.
- A color before/between gradients, multiple colors, URL/functions, unbalanced or
  oversized input fail closed.
- The parser returns the exact validated, outer-trimmed image-layer source substring,
  preserving function spelling and internal separator whitespace. A gradient-only
  `sanitizeAuthoringCssBackground` result is therefore trimmed-byte-identical.
  Already-canonical single colors retain their bytes; accepted noncanonical final
  colors are deliberately reconstructed to TASK-541 canonical bytes. Consumers
  place the optional final color in `background-color` rather than treating it as
  an image layer.
- Original TASK-541 corpus inputs reach the Page adapter unchanged. Exact-cap ASCII
  padding canonicalizes, cap + 1/control/Unicode-space inputs reject, and arbitrary
  otherwise-valid color tokens still fail Page's seven-token policy.
- The immutable corpus exercises both exported single-color adapters and the same
  inputs embedded as final background layers; no path pretrims or bypasses the
  second token filter.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts
git diff --check
```
