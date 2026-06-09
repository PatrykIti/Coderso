# TASK-418-05-L03: Recursive Runtime Renderer And Responsive Cascade
# FileName: TASK-418-05-L03-Recursive-Runtime-Renderer-And-Responsive-Cascade.md

**Parent Subtask:** TASK-418-05
**Priority:** High
**Category:** Pages / Runtime / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-418-05-L01
**Status:** ⏳ To Do

---

## Overview

Render nested container/slot blocks publicly and in preview. Responsive cascade
must resolve recursively for every nested block, not only top-level section
blocks.

---

## Implementation Pseudocode

```tsx
function resolvePageBlockForBreakpoint(block, breakpoint) {
  const resolved = applyBlockOverride(block, breakpoint);
  const slots = mapValues(resolved.slots, (children) =>
    children.map((child) => resolvePageBlockForBreakpoint(child, breakpoint))
  );
  return slots ? { ...resolved, slots } : resolved;
}

function renderBlock(block) {
  if (!block.visibility.visible) return null;
  if (isContainerBlock(block.type)) {
    return (
      <ContainerBlock block={block}>
        {renderSlots(block.slots)}
      </ContainerBlock>
    );
  }
  return renderAtomicBlock(block);
}
```

Expected data flow:

- `resolvePageDocumentForBreakpoint` resolves sections and all nested blocks.
- Runtime renders container block slots in stable order.
- Admin preview uses the same recursive resolution.

Error handling:

- Unknown/unsupported slot-capable blocks are hidden from inserter or render a
  safe placeholder until complete.
- Recursive renderer must not execute embed/html content unless sanitizer
  contracts allow it.

Regression-test shape:

- Nested columns/container render children in correct order.
- Mobile override on nested child applies only for mobile.
- Hidden nested block is omitted from public runtime.

---

## Security Contract

- **Endpoint visibility:** public rendering remains read-only; admin writes
  remain internal.
- **Auth model:** public reads unchanged; preview token for preview reads.
- **RBAC:** not applicable to public render; existing Pages permissions for
  writes.
- **CSRF:** not applicable to public read-only render paths.
- **Rate-limit bucket:** existing public/preview buckets.
- **Validation:** runtime consumes normalized recursive v2 documents.
- **Anti-abuse controls:** max depth/size enforced before render; sanitizer
  boundaries preserved for embed/html/media blocks.

---

## Testing Requirements

- Bun runtime tests for nested containers and responsive nested overrides.
- Vitest pure tests for recursive responsive resolver.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/PREVIEW_SPEC.md` if preview output semantics change.
