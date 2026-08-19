# TASK-481-01-L03: Content-Scope / Chrome-Isolation Characterization Tests

# FileName: TASK-481-01-L03-Content-Scope-Characterization-Tests.md

**Parent Subtask:** TASK-481-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-01-L01, TASK-481-01-L02
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-19
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Lock the structural invariants introduced by L01 + L02 with
characterization/guard tests so a later emission leaf (TASK-481-02) — and any future
canvas refactor or TASK-479-08-L02 restyle — cannot silently fuse chrome back into
the content scope or drop the admin re-assertion.

**Owning module(s) to create-or-extend:**
- `tests/vitest/ui/page-authoring-canvas.test.tsx` (extend the existing suite).

**Source-of-truth docs:**
- `_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`, `_docs/THEMES_SPEC.md`.

**Out-of-scope:** Asserting any SITE brand VALUE resolves (that needs the emission
of TASK-481-02; covered by 481-02-L02 + 481-04-L01). This leaf asserts STRUCTURE +
the admin re-assertion only.

## Security Contract

Not a route/auth/data leaf — N/A (test-only). No endpoint/auth/RBAC/CSRF/rate-limit
surface; no validation owner change; no secrets/PII.

## Implementation Pseudocode

```tsx
// tests/vitest/ui/page-authoring-canvas.test.tsx
// Extend the EXISTING suite. It runs under `// @vitest-environment happy-dom` and
// renders with the project's own helpers — NOT @testing-library/react (the repo has
// no RTL / jest-dom / user-event). The suite already provides:
//   - `renderToStaticMarkup` (react-dom/server) for HTML-string assertions, and
//   - a local `mount(node)` helper (createRoot + flushSync) returning
//     `{ container, cleanup }` for live-DOM querying.
// Reuse the existing `baseCanvasProps` (vi.fn() callbacks) plus the already-imported
// createPageSectionV2 / createPageBlockV2 fixtures (define sectionWithBrandBlockProps
// from those). Each `mount(...)` must be paired with its `cleanup()`.
import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";

test("wraps rendered block content in a single data-page-editor-content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const frame = mounted.container.querySelector("[data-page-editor-block-id]");
  const scope = frame!.querySelector(":scope > [data-page-editor-content]");
  expect(scope).not.toBeNull();
  mounted.cleanup();
});

test("keeps chrome OUTSIDE the content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const scope = mounted.container.querySelector("[data-page-editor-content]");
  // selection ring / outline classes live on the frame, not inside the scope:
  expect(scope!.querySelector("[data-page-editor-ghost='add-block-beside']")).toBeNull();
  expect(scope!.className).not.toMatch(/ring-primary|outline-primary/);
  // override badge + add-beside are siblings under the frame, outside the scope.
  mounted.cleanup();
});

test("co-locates block brand visual style with the content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const scope = mounted.container.querySelector("[data-page-editor-content]");
  // block.style.textColor = "var(--color-accent)" => color on the content scope
  expect(scope!.getAttribute("style")).toContain("var(--color-accent)");
  // frame keeps layout only (padding/margin/textAlign), no brand color
  mounted.cleanup();
});

test("re-asserts admin brand on section + block + nested chrome (TASK-481-01-L02)", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const section = mounted.container.querySelector("[data-page-editor-section]");
  const blockFrame = mounted.container.querySelector("[data-page-editor-block-id]");
  expect(section!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  // a child block frame (columns slot) also carries the admin re-assertion
  mounted.cleanup();
});

test("does not regress TASK-477-02 neutral emission on the canvas frame", () => {
  // canvasSiteTokenVariables neutral map still present on data-page-editor-canvas-frame;
  // assert via renderToStaticMarkup(...) HTML-string or the mounted container, as the suite does.
});
```

Notes for the implementer:
- Reuse the existing suite's harness exactly: it runs under
  `// @vitest-environment happy-dom` and renders via `renderToStaticMarkup`
  (HTML-string assertions) plus the file's local `mount()` helper (createRoot +
  flushSync → `{ container, cleanup }`) for live-DOM querying. Mock `SectionCanvas`
  callback props as the file already does (reuse `baseCanvasProps` / vi.fn()). Do NOT
  add `@testing-library/react` (the repo has no RTL / jest-dom / user-event) and do
  not introduce a new test file.
- Prefer attribute/`style`-string assertions over computed-color assertions (happy-dom
  does not resolve CSS custom properties); colour-resolution behavior is asserted by
  the Playwright real-input smoke in TASK-481-04-L01.
- Keep assertions resilient to TASK-479-08-L02 chrome restyle: assert on
  `data-page-editor-*` hooks and the presence of brand-var declarations, not on
  exact Tailwind class strings where avoidable.

## Testing Requirements

- Vitest lane only: `tests/vitest/ui/page-authoring-canvas.test.tsx`.
- Green gate: `bun run` the project's vitest target for this file (project standard
  vitest run); no Bun-lane runtime test.
- No DB migration artifacts.

## Line gate / page-authoring-canvas.test.tsx split

`tests/vitest/ui/page-authoring-canvas.test.tsx` is 1,138 lines. Split it cohesively
into four independently-runnable suites plus a shared harness, mirroring the
`PageAuthoringCanvas.tsx` split from TASK-481-01-L01:

- `tests/vitest/ui/pageAuthoringCanvasHarness.tsx` (new, shared) — `baseCanvasProps`
  (vi.fn() callbacks), the local `mount()` helper (createRoot + flushSync →
  `{ container, cleanup }`), `renderToStaticMarkup`, and the
  `createPageSectionV2`/`createPageBlockV2` fixtures (`sectionWithBrandBlockProps`).
- `tests/vitest/ui/page-authoring-canvas.test.tsx` (retained facade suite) — `SectionCanvas`
  chrome/ghost/inline-edit structure tests plus the brand-map/live-repaint and
  end-to-end brand-WYSIWYG cases added by TASK-481-02-L02 / TASK-481-04-L01.
- `tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx` (new) — inline color/
  highlight swatch application, live-selection snapshot, custom picker, and toolbar
  mousedown focusability.
- `tests/vitest/ui/page-authoring-link-toolbar.test.tsx` (new) — link URL seed/unlink/
  remove.
- `tests/vitest/ui/page-authoring-toolbar-dock.test.tsx` (new) — dock toggle/placement
  and owner-controlled dock.

Each suite runs independently under the existing `happy-dom` harness (no RTL /
jest-dom / user-event); extract by behavior, not arbitrary ranges. Post-split
receipt: every suite `<=1000` lines; verify with `wc -l` and `git diff --check`.
