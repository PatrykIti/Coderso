# TASK-190-05-03-02: Detail Page Bindings and Field Resolver
# FileName: TASK-190-05-03-02_Detail_Page_Bindings_and_Field_Resolver.md

**Priority:** High
**Category:** Assistant/Core + Runtime Binding
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-04-01
**Status:** To Do

---

## Overview

Implement safe binding resolution from content entries to detail page widget
props. This lets one detail page document render many entries without copying
entry data into page blocks.

This leaf should reuse the existing binding path semantics already used by
custom screens. Do not invent a separate array-path DSL for detail pages if the
current dot-path contract can cover the same business need.

The binding/domain owner stays under `core/services/content/*`. Blueprint
composition may consume this resolver, but it must not introduce a second
binding contract under `assistant/blueprints`.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/content/detailPageBindingResolver.ts`
- Add `core/services/content/detailPageRuntimeResolver.ts`
- Extract shared safe binding-path helpers if the current
  `core/services/customScreens/bindingResolver.ts` logic needs to be reused by
  both surfaces.
- Add `tests/vitest/content/detailPageBindingResolver.test.ts`
- Add `tests/unit/content/detailPageRuntimeResolver.test.ts` if resolver imports
  DB/runtime dependencies.

## Binding Semantics

Supported sources:

```ts
type DetailPageBindingSource =
  | { kind: "entry-field"; field: string }
  | { kind: "entry-meta"; field: "title" | "slug" | "publishedAt" | "author" }
  | { kind: "computed"; resolver: "detailHref" | "relatedItems" | "formContext" };
```

Resolution pseudocode:

```ts
export const resolveDetailPageBlocks = ({ document, entry, contentType }) => {
  const blocks = cloneBlocks(document.blocks);
  const schemaFields = readContentTypeFields(contentType.schema);

  for (const binding of document.bindings) {
    assertBindingAllowed(binding, schemaFields);
    const value = resolveBindingValue(binding.source, entry, { contentType });
    const normalized = applyBindingTransform(value, binding.transform, binding.fallback);
    setBlockProp(blocks, binding.blockId, binding.propPath, normalized);
  }

  return blocks;
};
```

Rules:

- Missing required field returns a typed resolver error.
- Missing optional field uses fallback.
- `propPath` uses the current safe dot-path string model, not a new parallel
  path format.
- Secret-like fields cannot bind to public blocks.
- Gallery/image transforms normalize media-like payloads.
- Currency/area/list transforms are deterministic and locale-safe.

## Security Contract

- Visibility: internal resolver and public read rendering.
- Auth model: no auth changes.
- RBAC: no permission grant; data access follows existing public entry runtime.
- CSRF: not applicable.
- Rate-limit bucket: public runtime remains `public_read`.
- Reject-unknown validation: binding source and transforms are strict enums.
- Anti-abuse: no arbitrary object path reads outside entry data/meta.
- Secret handling: secret-like fields are blocked from public binding.

## Testing Requirements

- Entry field binding writes widget prop.
- Entry meta binding writes title/slug/publishedAt.
- Missing required binding returns machine-readable error.
- Missing optional binding uses fallback.
- Secret-like field binding rejects.
- Shared dot-path helpers stay compatible with current custom-screen binding
  behavior.
- Related items resolver clamps limits and filters published-only for public
  runtime.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
