# TASK-474-02: Copy/Paste Blocks And Sections
# FileName: TASK-474-02-Copy-Paste-Blocks-And-Sections.md

**Parent Task:** TASK-474
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Editing UX
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Add copy/paste for blocks and sections (`Cmd+C` / `Cmd+V` + command-palette
commands), including across pages. Today only `Cmd+D` (in-place duplicate)
exists. Paste must treat the clipboard as untrusted input and re-normalize before
insertion.

---

## Current State (verified)

- Duplicate exists: `duplicatePageBlockTreeWithNewIds` (~`PageEditor.tsx` line
  133 import) + `Cmd+D` in the keyboard effect (~line 1723); insertion uses the
  existing target/insert flow (command palette / `movePageBlockToTarget`).
- No copy/paste, no clipboard serialization, no cross-page transfer.
- `isEditableShortcutTarget` (~line 455) guards shortcuts in text fields.

---

## Sub-Tasks

- [ ] `Cmd+C` (and a palette "Copy" command): serialize the selected block or
      section to a namespaced clipboard payload (Clipboard API with
      `sessionStorage` fallback), tagged with kind + a schema marker.
- [ ] `Cmd+V` (and "Paste"): parse the payload, **re-normalize/sanitize** it
      through the standard document normalize path, regenerate ids
      (`duplicate*WithNewIds`), and insert at the current target.
- [ ] Guard both shortcuts with `isEditableShortcutTarget` so native text
      copy/paste still works inside inputs.
- [ ] Reject foreign/malformed payloads gracefully (no crash, no partial
      insert); enforce nesting depth / children caps on paste.
- [ ] Add coverage: copy→paste round-trips a block and a section with new ids;
      cross-context paste re-normalizes; malformed/oversized payloads rejected.

---

## Implementation Pseudocode

```ts
const CLIP = "coderso/page-fragment@v1";

function copySelection(sel): void {
  const payload = sel.kind === "section"
    ? { clip: CLIP, kind: "section", data: sel.section }
    : { clip: CLIP, kind: "block", data: sel.block };
  clipboard.write(JSON.stringify(payload));            // sessionStorage fallback
}

function paste(target): void {
  const p = safeParse(clipboard.read());
  if (p?.clip !== CLIP) return;                        // ignore foreign data
  const normalized = p.kind === "section"
    ? normalizePageSection(p.data)                     // reject-unknown, sanitize
    : normalizePageBlock(p.data);
  if (!normalized) return;
  const fresh = duplicateWithNewIds(normalized);       // regenerate ids
  insertAtTarget(target, fresh);                       // existing insert flow + caps
}
```

Regression-test shape:
- Copy a block → paste → inserted with fresh ids, content preserved.
- Copy a section → paste into another page draft → re-normalized + inserted.
- Foreign clipboard / malformed JSON / oversized tree → no insert, no throw.
- Typing context: `Cmd+C`/`Cmd+V` falls through to native text behavior.

---

## Security Contract

- No new endpoints. **Clipboard is untrusted**: paste runs the full
  normalize/sanitize path (reject-unknown, color/url/HTML sanitizers) before
  insertion; ids are regenerated; nesting depth + children caps enforced. No
  secrets are written to the clipboard. Admin session + existing perms/CSRF.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- Editor docs (clipboard behavior + safety).
- `_docs/_TASKS/TASK-474*.md` (status), `_docs/_CHANGELOG/` on task closure.
