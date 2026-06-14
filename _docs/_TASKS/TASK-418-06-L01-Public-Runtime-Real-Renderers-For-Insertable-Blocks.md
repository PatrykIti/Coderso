# TASK-418-06-L01: Public Runtime Real Renderers For Insertable Blocks
# FileName: TASK-418-06-L01-Public-Runtime-Real-Renderers-For-Insertable-Blocks.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-418-03-L02, TASK-418-04-L04
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Ensure every section/block type available in the Page editor or emitted by
assistant and solution kits has honest public runtime rendering. If a block or
section layout cannot be rendered yet, it must be marked not
insertable/emittable until complete.

Current emitter drift is explicit scope for this leaf:

- `gallery` is emitted by solution-kit conversion today and is not a
  security-sensitive data-bound block, so this leaf must replace its generic
  public placeholder with a real static gallery renderer before close.
- `collection`, `form`, and `embed` are security-sensitive and their scoped
  public data binding is owned by TASK-418-06-L04. This leaf must not make them
  editor-insertable or assistant-emittable, but existing assistant/solution-kit
  outputs may remain only if public runtime rendering is an explicitly tested
  fail-closed inert state with no raw data, unsafe HTML, internal ids, or stack
  leakage.
- `icon` has no current Page editor/assistant/solution-kit emitter and may stay
  gated. If this leaf makes it insertable/emittable, the same increment must add
  its renderer, controls, and runtime tests.

Section type/variant layout rendering is owned by TASK-418-04-L04; this leaf
consumes that registry and focuses on public runtime parity for currently
insertable block capabilities plus the non-data-bound emitted `gallery` gap.

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
    if (capability.editorInsertable || capability.insertable || capability.assistantEmittable) {
      assert(capability.runtimeRenderer === "real");
    }
  }
}

function assertEmitterRuntimeParity(document) {
  for (const block of walkPageBlocks(document)) {
    const capability = pageBlockCapabilities[block.type];
    if (["collection", "form", "embed"].includes(block.type)) {
      assert(rendersFailClosedInertState(block));
      continue;
    }
    assert(capability.runtimeRenderer === "real");
  }
}

function renderAtomicBlock(block) {
  switch (block.type) {
    case "gallery": return <GalleryBlock block={block} />;
    case "collection": return <CollectionBlockInertUntilDataBindingLands block={block} />;
    case "form": return <FormBlockInertUntilDataBindingLands block={block} />;
    case "embed": return <SafeEmbedBlockInertUntilDataBindingLands block={block} />;
    case "icon": return blockIsRuntimeReady(block) ? <IconBlock block={block} /> : null;
    default: return renderExistingAtomicBlock(block);
  }
}
```

Expected data flow:

- Capability metadata controls inserter and assistant emission.
- Runtime implements real renderers for insertable block types and consumes the
  section type/variant template registry from TASK-418-04-L04.
- Placeholder-only block types or section variants are hidden or marked
  unsupported unless this leaf documents and tests a temporary fail-closed inert
  renderer for a known existing emitter.
- `gallery` receives a real runtime renderer before any capability or emitter
  can rely on it.
- `collection`, `form`, and `embed` capability flips must be coordinated with
  TASK-418-06-L04 in the same validation increment: do not make them
  editor-insertable or assistant-emittable here. Existing assistant/solution-kit
  emissions are allowed only through an explicitly fail-closed inert public
  renderer covered by tests.

Error handling:

- Collection/form inert renderers must not resolve, expose, or imply protected
  resource data before TASK-418-06-L04 adds scoped public binding.
- Embed inert rendering must not inject raw HTML and must not render unsafe URLs.
- Runtime must not crash on normalized but incomplete optional props.

Regression-test shape:

- `gallery` no longer renders a generic placeholder box for solution-kit output;
  it renders bounded image/card markup for normalized item data and a clear empty
  state for empty arrays.
- `icon` stays absent from editor/assistant catalogs until a real renderer,
  controls, and tests ship in the same increment.
- `collection`, `form`, and `embed` are gated on TASK-418-06-L04 before becoming
  insertable/emittable; until then existing emitted documents render only
  explicit fail-closed inert states.
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
- Bun public runtime tests for solution-kit/emitter parity: `gallery` renders
  real static markup, while `collection`, `form`, and `embed` render safe inert
  states until TASK-418-06-L04.
- Vitest capability test that editor-insertable/insertable/assistant-emittable
  blocks have real renderers.
- Vitest emitter parity test that assistant/solution-kit Page block outputs are
  either runtime-real or explicitly in the TASK-418-06-L04 data-bound deferral
  set.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`

---

## Completion Notes

- Read-only pre-implementation audit
  `019eafab-3bba-7023-9477-3a8870ec8914` found real contract drift: existing
  assistant/solution-kit emitters produced `collection`, `form`, and `gallery`
  blocks while the task did not distinguish L04-deferred data-bound blocks from
  non-data-bound gallery output. The task and parent contract were corrected
  before source edits. A fresh audit on the corrected contract found no high or
  medium drift and one low implementation choice, resolved by keeping `gallery`
  runtime-real but editor/assistant-gated until controls ship.
- `pageRendererV2` now renders `gallery` as bounded static markup for normalized
  item data and empty arrays. `collection`, `form`, and `embed` render explicit
  fail-closed inert public states that do not resolve resources, inject raw
  HTML, or leak internal identifiers.
- `pageBlockCapabilities` now decouples `runtimeRenderer: "real"` from
  editor/assistant exposure for `gallery`; currently exposed block capabilities
  still require real public runtime rendering.
- Added Vitest capability/emitter parity coverage and Bun public runtime matrix
  coverage for every currently insertable block type plus `gallery` and
  L04-deferred data-bound inert states.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-runtime-capabilities.test.ts` (38 tests), `bun run
  test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx` (33 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (12 tests, 119 assertions),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
- Post-implementation drift audit
  `019eafab-3bba-7023-9477-3a8870ec8914` first found a medium coverage gap:
  direct registered assistant business blueprint pack `page.upsert.sections`
  payloads were not included in the emitter parity test. The test now enumerates
  `listBusinessBlueprintPacks()` for those direct Page section outputs, and the
  fresh drift audit found no remaining material drift.
