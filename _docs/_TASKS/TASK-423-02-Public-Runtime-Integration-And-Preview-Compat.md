# TASK-423-02: Public Runtime Integration And Preview Compat
# FileName: TASK-423-02-Public-Runtime-Integration-And-Preview-Compat.md

**Parent Task:** TASK-423
**Priority:** High
**Category:** Pages / Public Runtime / Preview
**Estimated Effort:** Large
**Dependencies:** TASK-423-01
**Status:** ⏳ To Do

---

## Overview

Integrate the responsive CSS contract into the real public runtime while
preserving the current preview-device behavior. Public visitors must receive one
cacheable HTML response that contains desktop-resolved markup plus scoped media
queries. Admin preview and device-specific editor checks must keep their current
single-breakpoint flattening so operators still see one explicit device truth at
a time.

---

## Implementation Pseudocode

```tsx
const previewDevice = options?.previewDevice;
const prepared = await preparePageRuntimeDocument(document, {
  breakpoint: (previewDevice ?? "desktop") as PageBreakpoint,
});

const responsiveCss = previewDevice
  ? ""
  : buildResponsiveCss(prepared.sourceDocument);

return renderPublicPageRuntimeHtml({
  document: prepared.document,
  responsiveCss,
  previewDevice,
});
```

Expected data flow:

- Public requests keep desktop as the base document and add CSS overrides.
- Preview requests keep explicit flattening and skip responsive CSS emission.
- Cache keys remain device-agnostic for public pages.
- Runtime renderers continue using shared `data-section-id` / `data-block-id`
  hooks for selector scoping.

Error handling:

- CSS builder failures degrade to desktop-only markup plus diagnostics, never
  malformed HTML.
- Preview keeps working even when no public CSS is emitted.

Regression-test shape:

- Bun runtime tests cover public HTML containing scoped `@media` rules, preview
  flattening without those rules, and stable cacheability semantics.

---

## Security Contract

- **Endpoint visibility:** existing public page GET routes and preview token
  route only.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** not applicable.
- **Rate-limit bucket:** unchanged.
- **Validation:** source documents stay normalized through the Pages owner
  before render.
- **Anti-abuse controls:** preview token rules remain unchanged.

---

## Testing Requirements

- Targeted Bun runtime tests for public pages and preview HTML.
- `bun run test:bun`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/PAGE_MODEL.md`

