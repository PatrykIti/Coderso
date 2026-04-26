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
the UI. The current Media tab is still `Image` + `Embed`; this leaf must not
turn missing `Video`, `Gallery`, `Audio`, or `File` labels into accepted payloads
until editor and runtime support are ready in the same closure slice.

This leaf owns the domain draft for block type enums, default block creation,
attrs/content normalization, transforms, and document-level tests. UI labels
must wait until this contract exists.

Important: adding a value to `POST_BLOCK_TYPES` is not a harmless internal-only
step. The Posts API validation schema imports that enum directly, so a new value
becomes accepted by persisted post payloads as soon as the enum changes. Do not
mark this leaf Done, merge it, or claim the new media type is accepted unless
`TASK-212-03-02` lands in the same implementation slice with editor/runtime
support and tests.

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

Before changing `POST_BLOCK_TYPES`, inspect the current media asset contract and
picker support:

- single-media blocks should use a stable `mediaId` reference when available;
- gallery must define ordering, maximum item count, and missing-item behavior;
- audio/video/file must not persist trusted runtime instructions derived only
  from browser-selected MIME labels;
- any required `MediaPicker` extension belongs in `TASK-212-03-02`, not in a
  domain-only enum commit.

Dependency guard:

- It is acceptable to sketch local types/default helpers in this leaf first, but
  a real `POST_BLOCK_TYPES` addition must be paired with `TASK-212-03-02` before
  closure.
- If implementation needs to split commits, keep the enum-accepting commit and
  the runtime/editor commit on the same branch and do not publish the enum-only
  state as a completed task.

## Security Contract

- Visibility: internal block document write contract plus public read runtime
  after rendering.
- Auth/RBAC/CSRF/rate-limit: unchanged post mutation paths.
- Reject-unknown validation:
  - enum additions are explicit and release-atomic with editor/runtime support;
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
- If `POST_BLOCK_TYPES` changes, also run the `TASK-212-03-02` runtime/editor
  suites before marking this leaf complete.

## Documentation Updates Required

- `_docs/CMS_API.md` if the block document contract examples are updated.
- `_docs/CMS_SPEC.md` if product-facing media block scope changes.

## Acceptance Criteria

1. Domain defaults and normalization for the candidate media types are explicit
   and safe.
2. A new `POST_BLOCK_TYPES` value is not considered accepted until
   `TASK-212-03-02` proves editor insertion and public runtime rendering in the
   same closure slice.
3. Existing post documents remain backward compatible.
4. No enum-only state is merged or documented as complete.
