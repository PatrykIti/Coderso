# TASK-539-03: Gallery Controls, Gating, and Responsive Canvas

# FileName: TASK-539-03-Gallery-Controls-Gating-And-Responsive-Canvas.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Admin Editor / Responsive UX
**Estimated Effort:** Large
**Dependencies:** TASK-539-01, TASK-539-02; TASK-478/TASK-481 collision boundary resolved
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Expose only reachable Page controls, give gallery items a canonical media-aware
editor, keep z-index UI equal to the model clamp, and preserve a usable Page canvas
on 320–480px viewports.

## Leaves

| Leaf | Source/test seam | Status |
|---|---|---|
| TASK-539-03-L01 | Registry and UI-model vocabulary/gates | ⏳ To Do |
| TASK-539-03-L02 | Gallery items and reusable media URL controls | ⏳ To Do |
| TASK-539-03-L03 | PageEditor wiring and Page-local responsive clearance | ⏳ To Do |
| TASK-539-03-L04 | Control, authoring, and narrow-canvas proof | ⏳ To Do |

## Collision and ownership contract

This subtask is not implemented concurrently with TASK-478 or TASK-481. It must read
their landed `PageEditor.tsx`, `pageEditorControlUiModel.ts`, and editor-control state
before editing. It may not edit `PageAuthoringCanvas.tsx`, shared
`CanvasEditor.tsx`, any Custom Screen file, source renderers, model/sanitizer files,
or foreign tests.

## Security Contract

No route changes. Gallery values flow through the existing authenticated/RBAC/CSRF
Page save boundary and TASK-539-01 strict normalizer. The control stores a sanitized
asset URL, never an asset ID or privileged media record. Conditional visibility is
UX only and does not replace server-side normalization.

## Acceptance

- Gallery items can add/remove and edit image, alt, caption, and valid categories.
- Divider/parallax/filter controls are hidden when their values cannot render.
- Layer z UI imports the model's 0..20 clamp.
- Page canvas retains usable width at 320/390/480px without changing shared Screen
  canvas behavior.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-gallery-items-control.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```
