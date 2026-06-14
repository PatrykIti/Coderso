# TASK-418-05-L03: Recursive Runtime Renderer And Responsive Cascade
# FileName: TASK-418-05-L03-Recursive-Runtime-Renderer-And-Responsive-Cascade.md

**Parent Subtask:** TASK-418-05
**Priority:** High
**Category:** Pages / Runtime / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-418-05-L01, TASK-418-05-L02, TASK-418-04-L01
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Render nested container/slot blocks publicly and in preview. Responsive cascade
must resolve recursively for every nested block, not only top-level section
blocks.

This leaf closes the temporary TASK-418-05-L02 staging state for
`container`, `columns`, and `group`: once recursive public/admin-preview
rendering and responsive cascade are implemented, their
`pageBlockCapabilities` entries may move from `editorInsertable: true` with
`insertable: false`/`runtimeRenderer: "placeholder"` to runtime-ready
`insertable: true` and `runtimeRenderer: "real"`. Assistant emission remains
gated until TASK-418-06-L02 validates nested active-surface paths and blueprint
alignment.

The L03 capability matrix for those three layout blocks is explicit:

- `editorInsertable: true`
- `insertable: true`
- `runtimeRenderer: "real"`
- `assistantEmittable: false`
- `publicDataBinding: "none"`
- no pending `reason`

Do not derive `assistantEmittable` only from runtime readiness for this task.
Assistant emitters, blueprints, and nested active-surface path hydration remain
owned by TASK-418-06-L02.

`collection`, `form`, `embed`, `gallery`, and `icon` remain outside this leaf's
runtime-readiness transition unless their own runtime/security contracts are
implemented in the same scope. In particular, recursive rendering must not
execute embed/html content while embed remains sanitizer-runtime-pending.

## Slot Rendering Contract

Runtime and admin preview render slots in domain-owned order:

- `container`: render only `children`.
- `group`: render only `children`.
- `columns`: render active slots only, derived from normalized `props.count`,
  in ascending order `column:1` through `column:N`.

Dormant `columns` slots beyond `props.count` remain preserved in stored data but
are not rendered in runtime or admin preview. Each active slot renders a stable
slot wrapper even when empty so columns keep their configured layout. Children
inside every active slot render in stored order.

Slot wrappers must expose stable data attributes for tests and future chrome,
including the owner block id and slot key. The recursive renderer must continue
to omit hidden nested blocks from public output while allowing admin preview to
opt into hidden block frames as ghost chrome.

## Admin Preview Frame Contract

The shared renderer's block-frame callback must carry recursive identity
metadata in addition to `{ block, content, renderProps }`:

- section-scoped `blockPath`,
- `depth` where top-level blocks are depth `1`,
- `slotKey` for nested slot children,
- optional `parentBlock`.

PageEditor canvas chrome must consume this metadata instead of reconstructing
paths from top-level `section.blocks[]`, so nested blocks rendered by L03 can be
selected and display responsive/visibility chrome consistently. Assistant
active-surface publishing still exposes only `selectedBlockId` until
TASK-418-06-L02.

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

function renderBlock(block, context) {
  if (!block.visibility.visible) return null;
  if (isContainerBlock(block.type)) {
    return (
      <ContainerBlock block={block}>
        {renderActiveSlots(block, context.blockPath)}
      </ContainerBlock>
    );
  }
  return renderAtomicBlock(block);
}
```

Expected data flow:

- `resolvePageDocumentForBreakpoint` resolves sections and all nested blocks.
- Runtime renders container/group/columns active slots in the stable order
  defined above.
- Admin preview uses the same recursive resolution and receives recursive frame
  metadata for editor chrome.
- Layout-block capability metadata is updated through the domain owner, with
  assistant emission explicitly remaining false for this leaf.

Error handling:

- Unknown/unsupported slot-capable blocks are hidden from inserter or render a
  safe placeholder until complete.
- Recursive renderer must not execute embed/html content unless sanitizer
  contracts allow it.
- Dormant populated `columns` slots are preserved but not rendered while
  inactive.

Regression-test shape:

- Nested columns/container render children in correct order.
- `columns` renders only active `props.count` slots and hides dormant populated
  slots beyond the active count.
- Mobile override on nested child applies only for mobile.
- Hidden nested block is omitted from public runtime.
- Admin preview frame callback receives `blockPath`, `depth`, and slot metadata
  for nested blocks, and PageEditor canvas can select a rendered nested block.
- Layout block capabilities become runtime-real/insertable while
  `assistantEmittable` remains false.
- Embed/form/collection placeholders remain safe and gated.

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
- Vitest pure tests for recursive responsive resolver, capability matrix, slot
  ordering/count semantics, hidden nested blocks, and renderer frame metadata.
- Vitest UI coverage for PageEditor canvas nested selection/chrome through
  recursive frame metadata.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/PREVIEW_SPEC.md` if preview output semantics change.

---

## Closeout Notes

- `pageDocumentV2` now resolves responsive overrides recursively through nested
  slot children, not only top-level `section.blocks`.
- `container`, `columns`, and `group` are runtime-real and product insertable
  while staying assistant-gated: `assistantEmittable: false`,
  `publicDataBinding: "none"`, and no pending runtime reason.
- The shared Pages renderer now renders `container.children`, `group.children`,
  and active `columns` slots recursively. Columns render only
  `column:1..column:N` from normalized `props.count`; dormant populated slots
  remain preserved but hidden while inactive.
- Slot wrappers expose stable runtime/admin-preview data attributes, and the
  shared block-frame callback now carries recursive `blockPath`, `depth`,
  `slotKey`, and `parentBlock` metadata.
- PageEditor canvas chrome consumes renderer frame metadata, so nested rendered
  blocks can be selected from the canvas while assistant active surface output
  remains limited to `selectedBlockId` until TASK-418-06-L02.
- Embed/form/collection/gallery/icon remain gated placeholder surfaces outside
  this leaf.
- Pre-implementation audit `019eaf8b-ad5e-7543-aff5-6a8cdc793a84` found real
  contract drift around assistant gating, active column slot semantics, and
  recursive frame metadata. The contract was corrected; fresh audit
  `019eaf91-1a4d-7d93-a0ae-88de67e334da` found no material drift before source
  edits.
- Post-implementation drift audit `019eafa0-e436-7e41-9cab-9a65a089db65`
  found no high or medium material implementation, runtime, security, docs,
  changelog, or test-coverage drift. Its only low finding was that the TASK-418
  umbrella checklist still marked TASK-418-05 incomplete; that checklist is now
  corrected. Follow-up drift audit `019eafa4-8fe5-7260-b301-6910907cecc8`
  found no remaining findings.
- Validation passed:
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-renderer-v2.test.tsx`
  (35 tests),
  `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  (33 tests),
  `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
  (11 tests),
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-block-paths.test.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
  (73 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
