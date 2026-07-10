# TASK-539-06: Responsive CSS Parity

# FileName: TASK-539-06-Responsive-Css-Parity.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Responsive CSS / Public Front
**Estimated Effort:** Large
**Dependencies:** TASK-539-01 through TASK-539-05
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Make public breakpoint CSS match the editor/model for custom typography, explicit
text-transform reset, real grid-item spans, present-key layer overrides, split
background paint, and full-bleed surface targeting.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-06-L01 | Sole responsive CSS implementation | ⏳ To Do |
| TASK-539-06-L02 | CSS plan, diagnostics, and parity proof | ⏳ To Do |

## Ownership

L01 is the sole TASK-539 writer of `core/services/pages/pageResponsiveCss.ts` and owns
compatibility/changed-behavior updates in
`tests/vitest/pages/page-responsive-css.test.ts` before its source gate. L02 owns only
additive cross-device/property cases, reruns L01 assertions read-only, and cannot
re-baseline them. Consumers must use the model/sanitizer/renderer hook names exactly
and may not duplicate their grammar.

## Security Contract

The generated raw `<style>` remains a public read-only projection of strictly
normalized data. IDs/selectors retain conservative escaping, and free-text CSS is
revalidated by the shared sanitizers before interpolation. No route/auth/write
surface changes.

## Acceptance

- Advertised typography and spans produce effective breakpoint CSS.
- Layer preview and public CSS share present-key merge semantics.
- Full-bleed paint follows the outer section at every breakpoint.
- Final background color is never emitted as an image.
- Unsupported structural placement produces deterministic diagnostics rather than
  inert CSS.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts
git diff --check
```
