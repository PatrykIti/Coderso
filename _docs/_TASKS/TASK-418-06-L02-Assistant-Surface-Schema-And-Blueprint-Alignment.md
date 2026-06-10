# TASK-418-06-L02: Assistant Surface Schema And Blueprint Alignment
# FileName: TASK-418-06-L02-Assistant-Surface-Schema-And-Blueprint-Alignment.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Assistant / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-02-L02, TASK-418-03, TASK-418-05-L01, TASK-418-06-L01
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Align assistant Page active surfaces, action schemas, blueprint emitters,
solution-kit plan emitters, executor, dry-run diff, and policy gates with the
same Page block control/runtime capabilities. Assistant must emit responsive
deltas through the Page v2 cascade, use the full supported Page vocabulary, and
must not emit rich props or block/section types that the Pages owner drops or
runtime cannot render. Existing `collection`, `form`, and `embed` outputs may
remain before TASK-418-06-L04 only while public runtime rendering stays inert
and non-leaking. Existing `gallery` output may remain because TASK-418-06-L01
added a real static public renderer, but this leaf must not promote `gallery`
to broad assistant exposure until its editor controls and authoring contract are
ready.

---

## Implementation Pseudocode

```ts
function buildPageActiveSurface(document, selection) {
  return {
    schemaVersion: 2,
    selectedSectionId: selection.sectionId ?? null,
    selectedBlockId: selection.kind === "block" ? selection.blockId : null,
    selectedBlockPath: selection.kind === "block" ? selection.blockPath : null,
    sections: summarizeSectionsWithNestedBlocks(document.sections, {
      includeCapabilities: true,
      maxDepth: PAGE_BLOCK_MAX_TREE_DEPTH
    })
  };
}

function normalizeAssistantPageAction(action) {
  const document = normalizePageDocumentWrite(action.document);
  assertAllEmittedBlocksRuntimeReady(document, pageBlockCapabilities);
  assertResponsiveDeltasAreSparse(document);
  assertSectionAndBlockVocabularyIsSupported(document);
  return { ...action, document };
}
```

Expected data flow:

- Active surface summarizes selected section/block and nested slots.
- `selectedBlockPath` is a server-revalidated active-surface field: hydration
  must derive or confirm it from the normalized current Page document and drop
  stale client-supplied section/block/path context before planning or patch
  mapping.
- Assistant schemas use the same block prop allowlists/capabilities as editor
  and must not advertise blocks whose `assistantEmittable` capability is false.
- Blueprint emitters produce only runtime-real Page blocks, existing `gallery`
  static output, or the parent-approved L04-deferred inert
  `collection`/`form`/`embed` data-bound output.
- Blueprint emitters produce sparse mobile/tablet deltas where layout requires
  responsive changes instead of copying whole documents.
- Executor normalizes through `pageDocumentV2` before persistence.

Error handling:

- Provider/blueprint output with unsupported props fails closed in dry-run with
  actionable bounded errors.
- Unsupported target selection asks for clarification instead of patching the
  wrong block.
- Stale `selectedBlockId`/`selectedBlockPath` combinations are rejected or
  cleared during hydration rather than trusted from browser state.

Regression-test shape:

- Assistant cannot emit unsupported Page block props.
- Assistant emits supported section/block vocabulary and sparse responsive
  deltas.
- Collection/form/embed emitted by blueprints remain explicitly L04-deferred and
  inert until scoped public binding lands; gallery emitted by existing
  blueprints/solution kits renders publicly but remains gated from general
  assistant insertion.
- Selected nested block path is preserved in active surface and patch mapping.
- Stale selected block id/path is removed when it no longer exists in the current
  normalized document.

---

## Security Contract

- **Endpoint visibility:** assistant admin endpoints remain internal.
- **Auth model:** existing admin session and assistant availability gates.
- **RBAC:** existing assistant and content permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing assistant/provider quota and admin buckets.
- **Validation:** action schemas reject unknown fields and normalize Page docs
  through the Pages owner.
- **Anti-abuse controls:** provider output remains bounded by schemas, policy
  gates, redaction, local executor validation, and no public write endpoint.

---

## Testing Requirements

- Vitest assistant schema/policy/blueprint tests.
- Bun assistant executor tests for dry-run/execute persistence.
- Public runtime smoke for assistant-generated Page documents.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md` if action payload docs change.

---

## Completion Notes

- Added shared Page active-surface summaries with nested block paths,
  server-revalidated `selectedBlockPath`, and Page capability metadata.
- Planning hydration now rebuilds active Page sections from the normalized
  current Page document and clears stale selected section/block/path context.
- Assistant `page.upsert.sections[]` now normalizes through `pageDocumentV2`
  and rejects Page section/block output outside the capability-aligned
  assistant vocabulary, with explicit staged exceptions for existing static
  `gallery` output and L04-deferred inert `collection`/`form`/`embed` output.
- Promoted `container`, `columns`, and `group` to assistant-emittable now that
  recursive runtime rendering and nested path validation are in place.
- Converted the full-service assistant shell navigation section from the
  boundary `navigation` section type to a static `content` Page section.
- Claude pre-implementation audit was attempted with the repo-approved
  read-only command, but the CLI did not return output and was terminated. A
  local pre-implementation audit found one contract ambiguity around existing
  data-bound/gallery outputs; the task contract was corrected before source
  edits.
- Final local post-implementation drift check compared the L02 task contract,
  parent/board status, changelog, docs, code gates, and validation evidence; no
  unresolved L02 drift remained.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-runtime-capabilities.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant.test.ts tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts tests/unit/assistant/actionExecutorService.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`
