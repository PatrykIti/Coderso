# TASK-539-05: Renderer Behavior and Geometry Corrections

# FileName: TASK-539-05-Renderer-Behavior-And-Geometry-Corrections.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Public Renderer / Geometry
**Estimated Effort:** Very Large
**Dependencies:** TASK-539-01 through TASK-539-04; TASK-478 collision boundary resolved
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Make the Page renderer consume the landed model, sanitizer and composition contracts:
magnetic/transform hooks, canonical gallery, valid split backgrounds, one marquee
rail, actual grid-item spans, stable tilt/layer width, and correct timeline endpoints.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-05-L01 | Sole renderer source change | ⏳ To Do |
| TASK-539-05-L02 | Renderer structure, safety, and geometry proof | ⏳ To Do |

## Ownership and collision guard

L01 is the sole TASK-539 writer of `core/services/pages/pageRendererV2.tsx`, owns
compatibility/changed-behavior updates in both named renderer suites before its source
gate, and may not start while TASK-478 is active. L02 owns only additive
geometry/cross-effect cases and cannot re-baseline L01 assertions.
No `siteShell.tsx`, runtime, responsive CSS, model, sanitizer, or editor file is
edited here.

## Security Contract

Public rendering remains read-only. Every gallery URL/category and background paint
is revalidated at render. Data hooks use normalized IDs/enums only. No raw author
HTML/script/style is added, and no unsafe fallback is allowed.

## Acceptance

- A magnetic document renders the runtime selector.
- Combined transform effects preserve every channel and layer geometry.
- Gallery consumes canonical items and retains defense-in-depth checks.
- Background color never appears inside `background-image`.
- Marquee, glow click path, span target, tilt width, divider and timeline DOM match
  their declared visible behavior.
- Unauthored documents retain rendered-byte identity.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/task-534-interactivity-render.test.tsx
git diff --check
```
