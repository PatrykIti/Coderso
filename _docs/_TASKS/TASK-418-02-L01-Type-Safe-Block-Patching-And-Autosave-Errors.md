# TASK-418-02-L01: Type Safe Block Patching And Autosave Errors
# FileName: TASK-418-02-L01-Type-Safe-Block-Patching-And-Autosave-Errors.md

**Parent Subtask:** TASK-418-02
**Priority:** High
**Category:** Admin UI / Pages / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-418-01
**Status:** ⏳ To Do

---

## Overview

Replace generic first-block content patching with block-type-aware helpers that
cannot write props rejected by the Pages v2 normalizer. Surface autosave errors
with bounded UI feedback instead of silently failing in the background.

---

## Implementation Pseudocode

```ts
type PageEditorSelection =
  | { kind: "none" }
  | { kind: "section"; sectionId: string }
  | { kind: "block"; sectionId: string; blockPath: BlockPath };

function patchSelectedBlockProps(document, selection, patch) {
  const block = getSelectedBlock(document, selection);
  if (!block) return document;
  const allowed = getAllowedBlockPropKeys(block.type);
  const nextProps = pickKnownKeys({ ...block.props, ...patch }, allowed);
  return replaceBlockAtPath(document, selection.blockPath, {
    ...block,
    props: normalizeBlockPropsForEditor(block.type, nextProps)
  });
}

async function autosaveWithFeedback(pageId, document) {
  try {
    await autosavePage(pageId, { data: document });
    clearAutosaveError();
  } catch (error) {
    setAutosaveError(resolvePageEditorMutationError("autosave", error));
  }
}
```

Expected data flow:

- Toolbar controls call typed patch helpers for the selected block or section.
- Patch helpers consult the Pages v2 domain owner/metadata before writing.
- Autosave reuses existing page client, but records bounded failure state.

Error handling:

- Reject unsupported patch keys in the editor helper before save.
- Keep server-side strict validation as the final gate.
- Show retryable autosave/save feedback without raw driver/provider messages.

Regression-test shape:

- Editing a heading never writes `label`.
- Editing a button writes `label` and `href`.
- Save/autosave reports a bounded error when the server rejects a payload.

---

## Security Contract

- **Endpoint visibility:** existing internal `/admin/api/pages*` write routes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages write permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** block patches must be allowlist-bound and normalized through
  the Pages v2 owner before persistence.
- **Anti-abuse controls:** no public write endpoint; error feedback must be
  bounded and must not leak raw server internals.

---

## Testing Requirements

- Vitest PageEditor test for heading edit without invalid `label`.
- Vitest PageEditor test for button edit with valid `label`/`href`.
- Vitest client/UI test for autosave error feedback.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_GAP_AUDIT.md` closeout note.
