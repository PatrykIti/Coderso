# TASK-472-03-L02: Copy/Paste Blocks And Sections
# FileName: TASK-472-03-L02-Copy-Paste-Blocks-And-Sections.md

**Parent Subtask:** TASK-472-03
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Editing UX
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Add copy/paste for blocks and sections (`Cmd+C` / `Cmd+V` + palette), including
across pages. Today only `Cmd+D` (in-place duplicate) exists. Paste treats the
clipboard as untrusted and re-normalizes before insertion.

## Current State (verified)

- Duplicate: `duplicatePageBlockTreeWithNewIds` (defined in `pageBlockPaths.ts:659`,
  imported in `PageEditor.tsx:134`) + `Cmd+D` (keyboard handler ~line 1781);
  insertion via the existing target/insert flow.
- No exported per-node normalizer: `normalizeBlock`/`normalizeSection` are
  **internal** to `pageDocumentV2.ts`; the exported entry is `normalizePageDocumentV2`.
- No copy/paste / serialization / cross-page transfer.
- `isEditableShortcutTarget` (~line 455) guards shortcuts in text fields.

## Sub-Tasks

- [ ] `Cmd+C` (+ palette "Copy"): serialize selected block/section to a namespaced
      clipboard payload (Clipboard API + `sessionStorage` fallback), tagged with
      kind + schema marker.
- [ ] `Cmd+V` (+ "Paste"): parse → **re-normalize/sanitize** via the document
      normalize path → regenerate ids (`duplicate*WithNewIds`) → insert at target.
      No exported per-node normalizer exists today: either re-normalize via a
      synthetic doc (`normalizePageDocumentV2({ sections: [wrap(p.data)] })` then
      extract) or export thin `normalizePageBlock`/`normalizePageSection` wrappers
      around the internal `normalizeBlock`/`normalizeSection`.
- [ ] Guard both with `isEditableShortcutTarget` (native text copy/paste intact).
- [ ] Reject foreign/malformed payloads gracefully; enforce nesting depth /
      children caps on paste.
- [ ] Coverage: copy→paste round-trips block + section with new ids; cross-context
      re-normalizes; malformed/oversized rejected.

## Implementation Pseudocode

```ts
const CLIP = "coderso/page-fragment@v1";

function copySelection(sel) {
  const payload = sel.kind === "section"
    ? { clip: CLIP, kind: "section", data: sel.section }
    : { clip: CLIP, kind: "block", data: sel.block };
  clipboard.write(JSON.stringify(payload));            // sessionStorage fallback
}

function paste(target) {
  const p = safeParse(clipboard.read());
  if (p?.clip !== CLIP) return;                        // ignore foreign data
  // No exported per-node normalizer: normalizeBlock/normalizeSection are internal.
  // Re-normalize via a synthetic doc (reject-unknown + clamp), then extract:
  const doc = normalizePageDocumentV2(wrapFragmentInDoc(p));  // or new exported wrappers
  const normalized = extractFragment(doc, p.kind);
  if (!normalized) return;
  insertAtTarget(target, duplicateWithNewIds(normalized));  // regenerate ids + caps
}
```

Regression-test shape:
- Copy a block → paste → fresh ids, content preserved.
- Copy a section → paste into another draft → re-normalized + inserted.
- Foreign/malformed/oversized payload → no insert, no throw.
- Typing context: `Cmd+C`/`Cmd+V` falls through to native.

## Security Contract

- No new endpoints. **Clipboard is untrusted**: paste runs the full
  normalize/sanitize path (reject-unknown, color/url/HTML sanitizers) before
  insertion; ids regenerated; nesting depth + children caps enforced. No secrets
  written to the clipboard. Admin session + existing perms/CSRF.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- Editor docs (clipboard behavior + safety).
- `_docs/_TASKS/TASK-472-03*.md` status; changelog rolled up by TASK-472-06.
