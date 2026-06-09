# TASK-418-06-L01: Public Runtime Real Renderers For Insertable Blocks
# FileName: TASK-418-06-L01-Public-Runtime-Real-Renderers-For-Insertable-Blocks.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-418-03-L02, TASK-418-04
**Status:** ⏳ To Do

---

## Overview

Ensure every block type available in the Page editor or emitted by assistant and
solution kits has honest public runtime rendering. If a block cannot be rendered
yet, it must be marked not insertable/emittable until complete.

---

## Implementation Pseudocode

```ts
type PageBlockRuntimeCapability = {
  insertable: boolean;
  assistantEmittable: boolean;
  runtimeRenderer: "real" | "placeholder" | "unsupported";
};

function assertInsertableBlockRuntimeParity() {
  for (const type of pageBlockTypes) {
    const capability = pageBlockCapabilities[type];
    if (capability.insertable || capability.assistantEmittable) {
      assert(capability.runtimeRenderer === "real");
    }
  }
}

function renderAtomicBlock(block) {
  switch (block.type) {
    case "gallery": return <GalleryBlock block={block} />;
    case "collection": return <CollectionBlock block={block} />;
    case "form": return <FormBlock block={block} />;
    case "embed": return <SafeEmbedBlock block={block} />;
    case "icon": return <IconBlock block={block} />;
    default: return renderExistingAtomicBlock(block);
  }
}
```

Expected data flow:

- Capability metadata controls inserter and assistant emission.
- Runtime implements real renderers for insertable block types.
- Placeholder-only block types are hidden or marked unsupported.

Error handling:

- Collection/form renderers must handle missing referenced resources with
  bounded public fallback.
- Embed rendering must remain sanitized and safe.
- Runtime must not crash on normalized but incomplete optional props.

Regression-test shape:

- `gallery`, `collection`, `form`, `embed`, and `icon` no longer render generic
  placeholder boxes when insertable.
- Unsupported blocks are absent from editor inserter and assistant catalogs.

---

## Security Contract

- **Endpoint visibility:** public rendering remains read-only.
- **Auth model:** public reads unchanged; preview token for preview reads.
- **RBAC:** not applicable to public render.
- **CSRF:** not applicable to read-only render.
- **Rate-limit bucket:** existing public/preview buckets.
- **Validation:** runtime consumes normalized v2 blocks only.
- **Anti-abuse controls:** embed/html/form integrations must preserve sanitizer,
  trusted route, CSRF, nonce/captcha, and existing public-write protections
  where those underlying systems already require them.

---

## Testing Requirements

- Bun public runtime tests for each insertable block type.
- Vitest capability test that insertable/emittable blocks have real renderers.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`
