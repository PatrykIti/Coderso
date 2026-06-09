# TASK-418-04-L01: Shared Admin Preview Renderer And Style Helpers
# FileName: TASK-418-04-L01-Shared-Admin-Preview-Renderer-And-Style-Helpers.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Admin UI / Runtime / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-03
**Status:** ⏳ To Do

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

Error handling:

- Unsupported blocks render explicit editor-safe placeholders only when they are
  not insertable or not yet runtime-ready.
- Shared helpers must stay Bun-free/pure so Vitest can import them.

Regression-test shape:

- Admin canvas and public runtime render the same section/block markup for the
  same normalized document, excluding editor-only chrome.
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
- Vitest import-boundary test or targeted UI import smoke.
- Bun runtime smoke for public rendering after helper extraction.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if helper behavior exposes new public style contract.
