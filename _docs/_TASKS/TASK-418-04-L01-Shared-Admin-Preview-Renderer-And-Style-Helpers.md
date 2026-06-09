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

Reduce drift between `PageEditor` canvas preview and `pageRuntimeV2` by sharing
style/class helpers and, where safe, renderer primitives. The admin canvas may
keep editor chrome, but content rendering and style resolution should follow the
same normalized contract as public runtime.

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
```

Expected data flow:

- Runtime and admin preview import shared pure helpers.
- Admin canvas wraps rendered sections/blocks with selection chrome.
- Public runtime remains Bun-compatible and does not import admin-only modules.

Error handling:

- Unsupported blocks render explicit editor-safe placeholders only when they are
  not insertable or not yet runtime-ready.
- Shared helpers must stay Bun-free/pure so Vitest can import them.

Regression-test shape:

- Admin canvas and public runtime use the same section style helper.
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
