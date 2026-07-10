# TASK-539-02: Grid and Background Sanitizer Corrections

# FileName: TASK-539-02-Grid-And-Background-Sanitizer-Corrections.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / CSS Security / Pure Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-539-01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Keep all author-controlled Page CSS behind one positive grammar: unitless grid
lengths are zero-only, and safe background layers are parsed into image layers plus
an optional final color before any renderer emits them.

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
- Existing safe single-layer values retain their serialized bytes.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts
git diff --check
```
