# TASK-423-02-L01: Inject Responsive Css Into Public Runtime And Preserve Preview Flattening
# FileName: TASK-423-02-L01-Inject-Responsive-Css-Into-Public-Runtime-And-Preserve-Preview-Flattening.md

**Parent Subtask:** TASK-423-02
**Priority:** High
**Category:** Pages / Public Runtime / Preview
**Estimated Effort:** Large
**Dependencies:** TASK-423-02, TASK-423-01-L01
**Status:** ⏳ To Do

---

## Overview

Integrate responsive CSS emission into the public Page runtime while preserving
the current preview-device flattening behavior and cache semantics.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
const previewDevice = options?.previewDevice;
const prepared = await preparePageRuntimeDocument(document, {
  breakpoint: (previewDevice ?? "desktop") as PageBreakpoint,
});

return renderPublicPageRuntimeHtml({
  document: prepared.document,
  responsiveCss: previewDevice ? "" : buildResponsiveCss(prepared.sourceDocument),
});
```

Owner files:

- `core/server/publicSite.tsx`
- `core/services/pages/pageRendererV2.tsx`
- `core/site/renderPublicPage.tsx`

Validation commands:

- `bun run test:vitest`
- `bun run test:bun`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Public requests get desktop-resolved markup plus responsive CSS.
- Preview requests keep single-device flattening and skip public CSS emission.
- Cached public HTML stays device-agnostic.

Error handling:

- CSS-builder failure degrades to desktop-only markup without breaking preview.
- Preview-token behavior remains unchanged.

Regression-test shape:

- Bun runtime coverage for public HTML, preview HTML, and shared cache behavior.

---

## Security Contract

- **Endpoint visibility:** existing public page and preview routes only.
- **Auth model:** published pages stay anonymous; preview stays token-gated.
- **RBAC:** unchanged.
- **CSRF:** not applicable.
- **Rate-limit bucket:** existing public and preview buckets.
- **Validation:** source documents stay normalized through the Pages owner.

---

## Testing Requirements

- Relevant Bun runtime and preview tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
