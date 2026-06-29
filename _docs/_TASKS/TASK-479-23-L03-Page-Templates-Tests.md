# TASK-479-23-L03: Page Templates Tests
# FileName: TASK-479-23-L03-Page-Templates-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced (Page Templates) / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-23-L01, TASK-479-23-L02
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-23

---

## Overview

Add and adjust Vitest render coverage for the restyled Page Templates screens: assert
the templates list renders its new structure across states (loading / cached / empty)
with the propagation note and honest scope/section presentation, and that the template
editor still reuses the shared floating-panel `PageEditor` through the
`page-template` host seam with the restyled settings sheet — while keeping every
pre-existing page-template and shared page-editor suite green.

- **Goal:** Lock the L01/L02 visual-structure changes behind Vitest so the redesign
  cannot silently regress, and protect the host-seam reuse (template editor IS the
  shared editor) and the honesty guards (no fabricated scope/usage).
- **Owning module/service:** `tests/vitest/ui/page-templates-surface.test.tsx`
  (extend the existing host-seam suite) plus a new
  `tests/vitest/ui/page-templates-list.test.tsx` for the list-structure assertions.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest is the Bun-free
  admin/UI lane; do not move runtime tests here for coverage), `_docs/PAGE_MODEL.md` /
  `_docs/PREVIEW_SPEC.md` for behavior invariants the tests must not contradict.
- **Out of scope:** No new product code, no runtime (Bun) tests, no E2E beyond the
  optional real-input playwright check inherited from L02. Reuse the existing
  `renderAdminUi` SSR-string harness and the established `pageTemplatesClient`
  `vi.mock` + `PageEditor` stub pattern already in `page-templates-surface.test.tsx`;
  add no network mocks that exercise real endpoints.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests assert presentation/structure and the
preserved routing/cache/host-seam hooks only; they introduce no new auth or network
surface.

---

## Implementation Pseudocode

```tsx
// tests/vitest/ui/page-templates-list.test.tsx  (NEW)
import { expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
// Reuse the pageTemplatesClient vi.mock shape from page-templates-surface.test.tsx
// (getCachedPageTemplates -> [summary], listPageTemplatesCached, etc.).
import { PageTemplatesPage } from "../../../core/admin/ui/pages/templates/PageTemplatesPage";

test("PageTemplatesPage renders restyled header + propagation note + entries", () => {
  const html = renderAdminUi(<PageTemplatesPage />);
  expect(html).toContain("Page Templates");                 // header title
  expect(html).toContain("New template");                   // CTA
  // propagation note (port from prototype) — assert stable copy, not classes:
  expect(html).toMatch(/every page (using|that uses) it/i);
  // a seeded template renders with its real fields (name + section count):
  expect(html).toContain("Landing stack");
  expect(html).toMatch(/section/i);
  // Row/open affordance: navigation is `onClick={() => navigate(...)}`, so the route
  // string is NOT emitted by SSR `renderToString` — assert the emitted DOM hook
  // instead (do NOT `toContain("/advanced/page-templates/tpl-1")`, unsatisfiable here):
  expect(html).toContain('data-page-template-row="tpl-1"');
});

test("PageTemplatesPage shows NO fabricated scope/usage", () => {
  const html = renderAdminUi(<PageTemplatesPage />);
  // honesty guard: the mock-only prototype copy must NOT leak into the real screen.
  expect(html).not.toContain("Used on 24 pages");
  expect(html).not.toMatch(/Site-wide/);   // unless a REAL scope field exists
});

test("PageTemplatesPage cached render does not show the loading state", () => {
  // cachedTemplates is seeded by the shared vi.mock -> isLoading starts false;
  // assert "Loading page templates" is absent and the seeded name is present.
  const html = renderAdminUi(<PageTemplatesPage />);
  expect(html).not.toContain("Loading page templates");
});
```

```tsx
// tests/vitest/ui/page-templates-surface.test.tsx  (extend the existing suite)
// KEEP the existing host-seam assertions (captured host mode/cache/preview) and add:
test("Template editor reuses the shared PageEditor via the page-template host", () => {
  // The suite already stubs PageEditor and captures `host`. Assert the editor is the
  // SHARED one (not a forked template canvas) and the gating is intact:
  expect(capturedHosts.at(-1)?.mode).toBe("page-template");
  expect(capturedHosts.at(-1)?.assistantSurface).toBe(false);
  expect(capturedHosts.at(-1)?.detailCacheKey("tpl-1")).toBe("pageTemplates:detail:tpl-1");
});

test("Template settings sheet renders restyled fields + status control", () => {
  // render the settings sheet via the host's renderSettings(props) with the inline
  // Sheet stand-in already used in this file; assert:
  //  - name/slug/description/category fields present
  //  - the status SegmentedControl (Draft | Published) + data-page-template-status-control
  //  (the propagation note is NOT here — it lives in the always-visible canvasChrome
  //   banner asserted in the next test, mirroring the L02 placement decision)
  expect(html).toContain("Draft");
  expect(html).toContain("Published");
  expect(html).toContain('data-page-template-status-control="true"');
});

test("Template editor surfaces an always-visible propagation note via canvasChrome", () => {
  // The propagation note is rendered by the host `canvasChrome` seam (above the canvas
  // sections), NOT buried in the settings sheet. The shared PageEditor is stubbed here,
  // so verify the note through the seam directly (like renderSettings is exercised):
  const host = capturedHosts.at(-1);
  expect(host?.canvasChrome).toBeTypeOf("function");
  const html = renderAdminUi(
    <>{host?.canvasChrome?.({ document: { schemaVersion: 2, sections: [] }, device: "desktop" })}</>,
    { path: "/admin/advanced/page-templates/tpl-1" }
  );
  expect(html).toMatch(/every page (using|that uses) it/i);
  // honesty guard: generic copy, never a fabricated page count:
  expect(html).not.toMatch(/updates \d+ pages/i);
});
```

**Data flow:** tests use the existing `renderAdminUi` SSR-string harness and the
established `pageTemplatesClient` `vi.mock` + `PageEditor` stub + inline `Sheet`
stand-in already present in `page-templates-surface.test.tsx`; no new harness.
Assertions target stable text / `data-*` / route hooks, never Tailwind class strings
(which change with the restyle).

**Error handling:** none added; deterministic render/state assertions only. If the SSR
harness cannot exercise an interaction (e.g. opening the create dialog or toggling a
tab), assert the default-render structure and document the gap rather than introducing
a flaky interaction test.

**Regression-test shape:**
- List: header + "New template" + propagation note; a seeded template's name + real
  section count + the `data-page-template-row={id}` open hook (SSR emits no `onClick`
  route string — do not assert `/advanced/page-templates/:id`); honesty guards (no
  "Used on N pages", no fabricated "Site-wide"); cached-vs-loading branch.
- Editor: shared `PageEditor` reused via `mode === "page-template"` host with
  `assistantSurface === false` and the real `pageTemplateDetail` cache key; the
  always-visible propagation note is asserted by direct-rendering the host's
  `canvasChrome` (not via the stubbed editor, not the settings sheet); the settings
  sheet renders restyled fields + `SegmentedControl` status; existing host-seam +
  shared `page-editor-v2-flow`/`page-authoring-canvas` suites stay green.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-templates-list.test.tsx tests/vitest/ui/page-templates-surface.test.tsx`
- Full reused-editor sweep before closure:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx`
- State clearly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-479-23-L03**
  (and note the new `page-templates-list` suite).
- No contract-doc changes (test-only leaf).
