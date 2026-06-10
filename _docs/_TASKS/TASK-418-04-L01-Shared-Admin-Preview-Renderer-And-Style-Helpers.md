# TASK-418-04-L01: Shared Admin Preview Renderer And Style Helpers
# FileName: TASK-418-04-L01-Shared-Admin-Preview-Renderer-And-Style-Helpers.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Admin UI / Runtime / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-02-L04, TASK-418-03
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09

---

## Overview

Eliminate renderer drift between `PageEditor` canvas preview, runtime preview,
and public frontend. TASK-418 must introduce one shared section/block renderer
for normalized Pages v2 documents. The admin canvas may wrap that renderer with
editor chrome, selection rings, and insertion affordances, but it must not keep
a second content renderer such as the current `SectionCanvas`/`BlockPreview`
path.

---

## Implementation Pseudocode

```tsx
export function resolvePageRenderTree(document, breakpoint) {
  return resolvePageDocumentForBreakpoint(document, breakpoint);
}

export function toPageSectionRenderProps(section) {
  return {
    className: sectionGridClass(section.layout.columns),
    style: toSectionStyle(section),
    dataAttrs: { type: section.type, id: section.id }
  };
}

export function renderPageBlockContent(block, mode) {
  switch (block.type) {
    case "heading": return <HeadingBlock block={block} mode={mode} />;
    case "button": return <ButtonBlock block={block} mode={mode} />;
    default: return <SupportedBlockRenderer block={block} mode={mode} />;
  }
}

export function renderPageSectionContent(section, mode) {
  const variantRenderer = getSectionVariantRenderer(section.type, section.variant);
  return variantRenderer({
    section,
    mode,
    renderBlock: (block) => renderPageBlockContent(block, mode)
  });
}
```

Expected data flow:

- Runtime, preview, and admin canvas import the shared pure renderer.
- Admin canvas wraps rendered sections/blocks with selection chrome instead of
  reimplementing content markup.
- Public runtime remains Bun-compatible and does not import admin-only modules.
- Delete or retire the dead static editor mockup path
  `core/admin/ui/pages/{CanvasFrame,InspectorPanel,BlockLibrary,BlockToolbar}.tsx`
  and its scoped test once the shared renderer replaces it, unless a file is
  demonstrably reconnected to the live editor.

Error handling:

- Unsupported blocks render explicit editor-safe placeholders only when they are
  not insertable or not yet runtime-ready.
- Shared helpers must stay Bun-free/pure so Vitest can import them.

Regression-test shape:

- Admin canvas and public runtime render the same section/block markup for the
  same normalized document, excluding editor-only chrome.
- Public SSR keeps the shared renderer's section/block data attributes and
  style output for a normalized v2 document.
- No scoped test remains green by exercising only a disconnected mockup component.
- Helper imports do not pull admin UI into runtime or Bun adapters into Vitest.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session/preview token boundaries.
- **RBAC:** existing Pages permissions.
- **CSRF:** not changed.
- **Rate-limit bucket:** not changed.
- **Validation:** render helpers accept normalized Pages v2 data.
- **Anti-abuse controls:** shared renderers must preserve sanitizer and media
  trust boundaries.

---

## Testing Requirements

- Vitest pure helper tests for style/class output.
- Vitest render comparison proving admin-preview section/block content and
  runtime section/block content come from the same shared renderer output,
  excluding editor-only chrome.
- Vitest import-boundary test or targeted UI import smoke.
- Bun runtime smoke for public rendering after helper extraction, including
  shared section/block data attributes and style/class output.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` for the renderer ownership move from
  `core/site/pageRuntimeV2.tsx` into the shared Pages v2 render helper module,
  even when style behavior remains unchanged.

---

## Closeout

- `core/services/pages/pageRendererV2.tsx` now owns shared Pages v2 section
  style helpers, block rendering, section rendering, and breakpoint render-tree
  resolution without admin, runtime adapter, DB, settings, or API-client imports.
- `core/site/pageRuntimeV2.tsx` delegates the public runtime shell to the shared
  renderer, while `PageEditor` uses `PageSectionContent` for admin canvas content
  and keeps only editor chrome/selection wrappers locally.
- The disconnected static page-editor mockup files
  `core/admin/ui/pages/{CanvasFrame,InspectorPanel,BlockLibrary,BlockToolbar}.tsx`
  were removed. Their dead scoped tests were removed while live `PageList`
  delegation coverage remains.
- Pre-implementation audit `019eaebd-5afa-7841-8426-067475e4a269` found medium
  contract drift around renderer ownership docs, runtime smoke specificity, and
  section-registry follow-up boundaries. The task contract was corrected first.
- Fresh read-only audit `019eaec2-57f3-7133-ae8f-c75774ef88c7` reported no
  High, Medium, or Low drift after those corrections and before source edits.
- Post-implementation drift audit `019eaece-b8b8-7751-9f87-0fa9e34618e2` found
  one low editor-only issue: shared renderer button anchors could navigate when
  clicked in the admin canvas. The editor block wrapper now prevents default
  canvas click behavior while still selecting the block, and regression coverage
  clicks the rendered anchor directly.
- Covered by changelog `1149`.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-leaf-components.test.tsx tests/vitest/ui-integration/pageBuilder.test.tsx` (46 tests)
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts` (10 tests)
- Drift fix rerun: `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx` (26 tests)
- Drift fix rerun: `bun --cwd core lint:types`
- Drift fix rerun: `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
