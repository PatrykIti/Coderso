# TASK-418-06-L01: Public Runtime Real Renderers For Insertable Blocks
# FileName: TASK-418-06-L01-Public-Runtime-Real-Renderers-For-Insertable-Blocks.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-418-03-L02, TASK-418-04-L04
**Status:** ⏳ To Do

---

## Overview

Ensure every section/block type available in the Page editor or emitted by
assistant and solution kits has honest public runtime rendering. If a block or
section layout cannot be rendered yet, it must be marked not
insertable/emittable until complete. Data-bound public renderers for
`collection`, `form`, and `embed` are security-sensitive and are owned by
TASK-418-06-L04. Section type/variant layout rendering is owned by
TASK-418-04-L04; this leaf consumes that registry and focuses on public runtime
parity for insertable block capabilities.

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
    case "collection": return <CollectionBlockPlaceholderUntilDataBindingLands block={block} />;
    case "form": return <FormBlockPlaceholderUntilDataBindingLands block={block} />;
    case "embed": return <SafeEmbedBlockPlaceholderUntilDataBindingLands block={block} />;
    case "icon": return <IconBlock block={block} />;
    default: return renderExistingAtomicBlock(block);
  }
}
```

Expected data flow:

- Capability metadata controls inserter and assistant emission.
- Runtime implements real renderers for insertable block types and consumes the
  section type/variant template registry from TASK-418-04-L04.
- Placeholder-only block types or section variants are hidden or marked
  unsupported.

Error handling:

- Collection/form renderers must handle missing referenced resources with
  bounded public fallback.
- Embed rendering must remain sanitized and safe.
- Runtime must not crash on normalized but incomplete optional props.

Regression-test shape:

- `gallery` and `icon` no longer render generic placeholder boxes when
  insertable; `collection`, `form`, and `embed` are gated on TASK-418-06-L04
  before becoming insertable/emittable.
- Section type/variant integration consumes the TASK-418-04-L04 registry and
  preserves `data-page-section` plus `data-page-variant`; detailed variant
  markup coverage stays in TASK-418-04-L04.
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
