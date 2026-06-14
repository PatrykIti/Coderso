# TASK-417-05-L03: Responsive Overrides Save Preview History
# FileName: TASK-417-05-L03-Responsive-Overrides-Save-Preview-History.md

**Parent Subtask:** TASK-417-05
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-417-05-L01, TASK-417-05-L02
**Status:** ✅ Done

---

## Overview

Finish editor integration for breakpoint-context editing, save draft, preview,
publish, settings, autosave, revisions, and history on top of the v2 document.

---

## Security Contract

- **Endpoint visibility:** existing internal `/admin/api/pages*` client calls.
- **Auth model:** existing admin session.
- **RBAC:** `content:read`, `content:write`, `content:publish` through routes.
- **CSRF:** existing admin client write behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** client submits v2 documents only; server remains authoritative.
- **Anti-abuse controls:** preview generation still asks the server for a token
  and never accepts arbitrary preview URLs from browser input.

---

## Sub-Tasks

- [x] Wire breakpoint switcher to canvas width and edit context.
- [x] Save non-desktop edits as sparse responsive overrides.
- [x] Add reset-inheritance actions.
- [x] Preserve Page Settings, autosave, revisions, restore, discard, preview,
  publish, toasts, and session-expired handling.
- [x] Update PageEditor's active assistant surface publisher to sections.
  TASK-417-06-L01 owns assistant-side schema/consumer changes.

---

## Implementation Pseudocode

```ts
function patchSelectedAtBreakpoint(
  document: PageDocumentV2,
  selection: PageSelection,
  breakpoint: PageBreakpoint,
  patch: PageEditorPatch
) {
  if (breakpoint === "desktop") {
    return applyBasePatch(document, selection, patch);
  }
  return applyResponsiveOverride(document, selection, breakpoint, patch);
}

async function handlePreview() {
  if (state.dirty) await updatePage(pageId, { data: state.document });
  return previewPage(pageId, { probe: true });
}
```

Expected data flow:

- Desktop edits mutate base section/block fields.
- Tablet/mobile edits mutate only responsive override keys.
- Preview sync writes `currentData` only before requesting a token.
- Publish writes sanitized v2 `publishedData`.

Error handling:

- Session-expired messages stay action-specific.
- Failed preview does not clear dirty state unless draft sync succeeded.
- Restore re-normalizes v2 and preserves selection where possible.

Regression-test shape:

- Vitest UI tests cover breakpoint override write paths, reset inheritance,
  save/publish/preview payloads, settings autosave, revisions restore/discard,
  and assistant active surface update.

---

## Testing Requirements

- Targeted Vitest page-editor suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior
  changes.
