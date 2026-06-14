# TASK-417-02-L01: Document Types Defaults And Atomic Catalog
# FileName: TASK-417-02-L01-Document-Types-Defaults-And-Atomic-Catalog.md

**Parent Subtask:** TASK-417-02
**Priority:** High
**Category:** Pages / Domain
**Estimated Effort:** Large
**Dependencies:** TASK-417-01
**Status:** ✅ Done

---

## Overview

Introduce a Bun-free Pages v2 document owner with explicit types, defaults, and
the first atomic block catalog. This module must not import widget runtime,
database, settings, or server adapters.

---

## Security Contract

- **Endpoint visibility:** no route registration in this leaf.
- **Auth model:** not applicable at this layer.
- **RBAC:** not applicable at this layer.
- **CSRF:** not applicable at this layer.
- **Rate-limit bucket:** not applicable at this layer.
- **Validation:** owned schema rejects unknown v2 document, section, block, and
  props fields before persistence.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [x] Create the Pages v2 domain module at
  `core/services/pages/pageDocumentV2.ts`.
- [x] Define `PageDocumentV2`, `PageSectionV2`, `PageBlockV2`, breakpoints,
  layout/style/spacing/visibility contracts, and atomic block props.
- [x] Define the initial Pages v2 section catalog:
  `hero`, `content`, `feature-grid`, `media-split`, `gallery`, `collection`,
  `lead-form`, `faq`, `testimonials`, `cta`, `embed`, `custom`.
- [x] Define allowed variant ids per section type and default section
  composition for every section type.
- [x] Define defaults for an empty document, new section, and every atomic block.
- [x] Cover the initial atomic block catalog:
  `heading`, `text`, `button`, `image`, `video`, `gallery`, `form`, `list`,
  `card`, `collection`, `embed`, `divider`, `spacer`.
- [x] Define block-level responsive override storage. Section overrides live
  under `section.responsive[bp].layout/style/spacing/visibility`, while block
  overrides live under `section.responsive[bp].blocks[blockId].props/style`.

---

## Implementation Pseudocode

```ts
export const PAGE_DOCUMENT_SCHEMA_VERSION = 2;

export type PageBlockType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "video"
  | "gallery"
  | "form"
  | "list"
  | "card"
  | "collection"
  | "embed"
  | "divider"
  | "spacer";

export type PageSectionKind =
  | "hero"
  | "content"
  | "feature-grid"
  | "media-split"
  | "gallery"
  | "collection"
  | "lead-form"
  | "faq"
  | "testimonials"
  | "cta"
  | "embed"
  | "custom";

export function createDefaultPageDocumentV2(input?: { template?: string }): PageDocumentV2 {
  return {
    schemaVersion: 2,
    seo: {},
    settings: normalizePageSettingsV2({ template: input?.template }),
    sections: [],
  };
}

export function createPageSectionV2(kind: PageSectionKind): PageSectionV2 {
  return {
    id: createStablePageId("sec"),
    type: kind,
    name: titleForSection(kind),
    variant: defaultVariantForSection(kind),
    layout: defaultSectionLayout,
    style: defaultSectionStyle,
    spacing: defaultSectionSpacing,
    visibility: defaultSectionVisibility,
    responsive: {},
    blocks: defaultBlocksForSection(kind),
  };
}

export function defaultBlocksForSection(kind: PageSectionKind): PageBlockV2[] {
  switch (kind) {
    case "hero":
      return [createPageBlockV2("heading"), createPageBlockV2("text"), createPageBlockV2("button")];
    case "lead-form":
      return [createPageBlockV2("heading"), createPageBlockV2("form")];
    default:
      return [createPageBlockV2("heading"), createPageBlockV2("text")];
  }
}

export function createPageBlockV2(type: PageBlockType): PageBlockV2 {
  return {
    id: createStablePageId("blk"),
    type,
    props: defaultPropsByBlockType[type],
  };
}
```

Expected data flow:

- Admin UI, assistant, service, and runtime import v2 types/defaults from
  `core/services/pages/pageDocumentV2.ts`.
- Widgets remain imported only by non-Page surfaces.
- Responsive edits use sparse section overrides and block-id keyed block
  overrides; they do not create per-breakpoint document copies.

Error handling:

- Unknown block or section types return `page_document_invalid`.
- Unknown props are rejected instead of silently persisted.
- Unknown section variants and unknown responsive block ids are rejected.

Regression-test shape:

- Vitest asserts default document shape, unique stable ids, every catalog block
  default, every section default composition, variant validation, block-level
  responsive override shape, and no Bun/db import side effects.

---

## Testing Requirements

- Targeted Vitest suite for the new Pages v2 document owner.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
