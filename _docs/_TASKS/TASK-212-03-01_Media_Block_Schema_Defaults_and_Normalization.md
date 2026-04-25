# TASK-212-03-01: Media Block Schema Defaults and Normalization
# FileName: TASK-212-03-01_Media_Block_Schema_Defaults_and_Normalization.md

**Priority:** Medium
**Category:** CMS/Posts + Block Editor + Domain Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-212-03
**Status:** To Do

---

## Overview

Add the domain contract for accepted media block types before exposing them in
the UI.

This leaf owns block type enums, default block creation, attrs/content
normalization, transforms, and document-level tests. UI labels must wait until
this contract exists.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/admin/ui/posts/editor/postEditorStore.ts`
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts`
- `tests/vitest/posts/postBlockDocument.test.ts`
- `tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts`
- `tests/vitest/posts/post-block-transforms.test.ts`

## Implementation Direction

Accepted starter shape:

```ts
type PostVideoBlockAttrs = {
  mediaId: string | null;
  url: string;
  caption?: string;
  controls: boolean;
  autoplay: false;
};

type PostGalleryBlockAttrs = {
  mediaIds: string[];
  columns: 2 | 3 | 4;
  captions: boolean;
};

type PostAudioBlockAttrs = {
  mediaId: string | null;
  url: string;
  caption?: string;
  controls: true;
};

type PostFileBlockAttrs = {
  mediaId: string | null;
  label: string;
  showSize: boolean;
  newTab: boolean;
};
```

Keep exact field names aligned with the existing media service and runtime
renderer before coding. Prefer media-library `mediaId` references over raw URLs
where the current media API supports the asset type.

## Security Contract

- Visibility: internal block document write contract plus public read runtime
  after rendering.
- Auth/RBAC/CSRF/rate-limit: unchanged post mutation paths.
- Reject-unknown validation:
  - enum additions are explicit;
  - attrs normalize to bounded defaults;
  - arrays such as gallery media ids are capped;
  - unsupported MIME/provider details are not persisted as trusted runtime
    instructions.
- Anti-abuse:
  - no active HTML/script attributes;
  - no executable file rendering;
  - no unbounded gallery arrays or captions;
  - unsafe raw URLs are blanked or routed through existing safe embed handling.

## Testing Requirements

- `POST_BLOCK_TYPES` contains the accepted media types.
- `createPostBlock` returns deterministic defaults for each accepted type.
- Normalizer clamps gallery columns/item count and string lengths.
- Unknown attrs/content are bounded.
- Existing `image` and `embed` fixtures remain backward compatible.

## Documentation Updates Required

- `_docs/CMS_API.md` if the block document contract examples are updated.
- `_docs/CMS_SPEC.md` if product-facing media block scope changes.

## Acceptance Criteria

1. Domain accepts the new media block types safely.
2. No UI catalog entry is required to prove this leaf; it only unlocks the next
   leaf.
3. Existing post documents remain backward compatible.
