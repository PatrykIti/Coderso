# TASK-418-06-L02: Assistant Surface Schema And Blueprint Alignment
# FileName: TASK-418-06-L02-Assistant-Surface-Schema-And-Blueprint-Alignment.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Assistant / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-02-L02, TASK-418-03, TASK-418-05-L01, TASK-418-06-L01
**Status:** ⏳ To Do

---

## Overview

Align assistant Page active surfaces, action schemas, blueprint emitters,
solution-kit plan emitters, executor, dry-run diff, and policy gates with the
same Page block control/runtime capabilities. Assistant must not emit rich props
or block types that the Pages owner drops or runtime cannot render.

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
      maxDepth: PAGE_BLOCK_MAX_DEPTH
    })
  };
}

function normalizeAssistantPageAction(action) {
  const document = normalizePageDocumentWrite(action.document);
  assertAllEmittedBlocksRuntimeReady(document, pageBlockCapabilities);
  return { ...action, document };
}
```

Expected data flow:

- Active surface summarizes selected section/block and nested slots.
- Assistant schemas use the same block prop allowlists/capabilities as editor.
- Blueprint emitters produce only runtime-ready Page blocks.
- Executor normalizes through `pageDocumentV2` before persistence.

Error handling:

- Provider/blueprint output with unsupported props fails closed in dry-run with
  actionable bounded errors.
- Unsupported target selection asks for clarification instead of patching the
  wrong block.

Regression-test shape:

- Assistant cannot emit unsupported Page block props.
- Collection/form/gallery emitted by blueprints render publicly or are gated.
- Selected nested block path is preserved in active surface and patch mapping.

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
