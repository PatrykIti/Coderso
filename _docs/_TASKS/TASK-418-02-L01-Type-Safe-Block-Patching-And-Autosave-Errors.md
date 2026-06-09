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
- **Validation:** block patches must be allowlist-bound, strict
  reject-unknown-safe, and normalized through the Pages v2 owner before
  persistence.
- **Anti-abuse controls:** no public write endpoint; error feedback must be
  bounded and must not leak raw server internals.

---

## Breakpoint-Aware Block Patching (Merged From TASK-419 Audit)

The allowlist-bound block patch helper MUST be breakpoint-aware to avoid a
verified silent data-corruption bug: today `updateFirstBlockProps`
(`core/admin/ui/pages/PageEditor.tsx:426-436`) has **no `device` branch** and
always writes `blocks[0].props`, while the section helper `updateSectionGroup`
(`:398-424`) correctly branches `device === "desktop"` (base) vs
`section.responsive[device]` (override). Result: switching the `DeviceSwitcher`
to tablet/mobile and editing block content **overwrites the desktop base**
instead of creating a per-breakpoint override — contradicting the spec §8
cascade contract.

The replacement `updateBlock(blockId, group, patch)` helper must mirror the
section helper: on `desktop` write `block[group]`; on tablet/mobile write
`block.responsive[device][group]` (`group ∈ {props, style, visibility}`), the
override channel the model already defines (`PageBlockResponsiveOverrideV2`,
`core/services/pages/pageDocumentV2.ts:134-138`). Desktop base must never be
mutated by a non-desktop edit.

---

## Testing Requirements

- Vitest PageEditor test for heading edit without invalid `label`.
- Vitest regression test: editing a block on tablet/mobile writes
  `block.responsive[device]` and leaves the desktop base block unchanged.
- Vitest PageEditor test for button edit with valid `label`/`href`.
- Vitest client/UI test for autosave error feedback.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md` closeout note.
