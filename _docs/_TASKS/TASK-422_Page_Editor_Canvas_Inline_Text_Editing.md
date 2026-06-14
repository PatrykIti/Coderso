# TASK-422: Page Editor Canvas Inline Text Editing
# FileName: TASK-422_Page_Editor_Canvas_Inline_Text_Editing.md

**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** None (coordinates with TASK-421 on the shared floating-panel text path and with TASK-424 on the typography group)
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement in-place text editing on the Page Editor V2 canvas. This is the
owner's explicitly prioritized requirement ("Path A" of the two-way editing
vision): clicking text on the canvas must allow editing it directly in place,
in addition to the floating-panel "T"/Content fields ("Path B", owned by
TASK-421/TASK-424). Source audit: `_docs/AUDIT/_cross-canvas-inline-typography-2026-06-10.md`
and `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.4 (HIGH).

Audit findings this family fixes:

- Clicking a text block on the canvas only selects it (`data-selected=true`,
  ring); `contenteditable` count inside blocks is 0, double-click does not enter
  edit mode, and typing on the canvas never changes content.
- The only `contenteditable` reference in `core/admin/ui/pages/PageEditor.tsx`
  is the keyboard guard at lines ~492–493, not an editing path.
- Text is editable only through the floating-panel "Primary text" field.

Target behavior:

- Single click keeps the current behavior (select block, show floating
  toolbar).
- Double-click on a selected text-bearing block (or Enter while it is
  selected) enters inline edit mode with a focused caret.
- Inline edits write through the **same** block-prop update cycle the floating
  panel uses (`updateSelectedBlockControl` → `updatePageBlockAtPath` →
  `patchBlockControlForDevice`/`patchBlockPropsForDevice` in
  `core/admin/ui/pages/PageEditor.tsx`, device-scoped), so canvas and panel
  edits share one source of truth and the dirty-state/autosave behavior is
  unchanged.
- Escape or blur commits; editor hotkeys must not fire while typing (reuse the
  existing `contenteditable` keyboard guard).
- Committed text is sanitized to the block contract (plain text for
  `heading`/`button.label`/`statistic` fields/`quote.cite`; respect
  `text.format` for the `text` block).

In-scope blocks (text-bearing leaves): `heading`, `text`, `quote` (text +
cite), `statistic` (value/label/caption), `button` (label), `list` (items).
Per-block verification closure is owned by the per-block families
TASK-437..TASK-450.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes; existing internal admin page
  save/autosave routes only.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged admin write behavior.
- **Rate-limit bucket:** unchanged.
- **Validation:** committed text flows through the existing
  `normalizePageDocumentV2ForWrite` schema path; inline editing must not
  introduce any HTML injection vector (commit plain text / sanitized rich
  content only, never raw `innerHTML` into props).
- **Anti-abuse controls:** not applicable (no public surface).

---

## Sub-Tasks

- [x] TASK-422-01: Inline edit contract and text commit model.
- [x] TASK-422-02: Canvas inline editing implementation.
- [x] TASK-422-03: Validation live smoke and closure.

---

## Implementation Pseudocode

```tsx
// PageEditor.tsx canvas leaf wrapper (shared admin preview renderer slot)
function InlineEditableText({ block, path, value, commit }) {
  const [editing, setEditing] = useState(false);
  return (
    <span
      contentEditable={editing}
      suppressContentEditableWarning
      data-page-editor-inline-edit={editing ? "active" : "idle"}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.currentTarget.blur(); }
      }}
      onBlur={(event) => {
        setEditing(false);
        commit(sanitizeInlineText(block, path, event.currentTarget.textContent ?? ""));
      }}
    >
      {value}
    </span>
  );
}

// domain helper (Bun-free module so Vitest can own it)
export function sanitizeInlineText(block: PageBlockV2, propPath: string, raw: string): string {
  const text = raw.replace(/ /g, " ");
  if (block.type === "text" && block.props.format === "rich") {
    return sanitizeRichTextSubset(text);
  }
  return collapseControlCharacters(text).trim();
}
```

Expected data flow:

- Entry: dblclick or Enter on the selected block → `editing=true`, caret focus.
- While editing: editor keyboard shortcuts are suppressed via the existing
  guard (`target.closest("[contenteditable='true']")`, PageEditor.tsx ~492).
- Commit: blur/Escape → sanitize → the same `updateSelectedBlockControl` →
  `updatePageBlockAtPath` + `patchBlockPropsForDevice` path (PageEditor.tsx
  ~1051–1068, device-scoped) the "Primary text" panel field drives → dirty
  state + autosave as today.
- The floating panel field re-renders from the same document state, so panel
  and canvas can never diverge.

Error handling:

- Empty committed text falls back to the schema default or keeps the previous
  value per block contract decided in TASK-422-01 (no silent block pruning).
- Sanitization rejects markup; unknown props are never written.

Regression-test shape:

- Vitest UI tests: dblclick enters edit mode, typing + blur updates the panel
  field value, Escape commits, hotkeys (Delete, Ctrl+K) do not fire while
  editing, sanitization strips markup.
- Live `playwright-cli` smoke: edit heading on canvas → save → publish → front
  shows the new text.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- New Vitest suite for the sanitize/commit helpers (Bun-free lane).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Real browser smoke through `coderso-dev-core-host` and `playwright-cli`.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if the editing contract description changes.
- `docs/guide/` page editor docs (inline editing is user-facing).
- `_docs/_TASKS/README.md` board sync, `_docs/_CHANGELOG/` entry on completion.

---

## Completion Notes

Family completed 2026-06-11. Inline canvas editing works end to end: dblclick/Enter on a selected text-bearing block enters contenteditable edit, commit flows through the same panel update path (single source of truth), hotkeys suppressed while editing, fail-closed target map (no contentEditable on image/divider/spacer). Live smoke: typed heading text reached the panel field, survived Delete-while-editing, and rendered on the published front. Evidence: .tmp/phase1/phase1-smoke.md scenario B.
