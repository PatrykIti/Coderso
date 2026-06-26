# TASK-475-01: Toolbar Selection Snapshot And Input Focus Fix
# FileName: TASK-475-01-Toolbar-Selection-Snapshot-And-Input-Focus.md

**Parent Task:** TASK-475
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-471-03 (per-fragment color marks + inline toolbar), TASK-472-05 (bold/italic/link/highlight marks)
**Status:** ✅ Done
**Completed:** 2026-06-25

> **Completion note (2026-06-25):** Implemented in `PageAuthoringCanvas.tsx`
> (PageEditor.tsx needed no change). Bug #2 (link URL input focus) confirmed
> broken before and fixed after — verified live. Bug #1: the selection snapshot
> on toolbar mousedown makes mark application authoritative against the live DOM
> selection; live tracing confirmed marks are written to `block.props.marks` on
> real-input clicks and render after exiting edit. A `relatedTarget` blur guard +
> post-link refocus were added so the URL input does not commit-and-unmount the
> toolbar mid-interaction. Note: applied marks stay invisible while editing
> (plain-text-during-edit, `:221`) — a deliberate limitation, tracked as a
> follow-up, not part of this fix. Lint/types/Vitest green; live smoke passed.

---

## Overview

Make the inline mark toolbar work with **real** mouse/keyboard input. Two bugs,
one shared root cause, fixed together in
`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` (component
`InlineEditableCanvasText`). No API routes, schema, DB, or renderer changes.

## Root cause (verified live + by code trace)

The toolbar is an `absolute` **sibling** of the contentEditable node (inline
branch `:375-382`, block branch `:365-373`). A real `mousedown/mouseup/click` on
a swatch bubbles `swatch → toolbar wrapper → frame` and **never through the
editable**, so the editable's `onMouseUp`/`onKeyUp` → `updateSelectionRange`
(`:156-192`) do not fire during the swatch interaction. The controls therefore
read the asynchronously-cached `selectionRange` state (`:144`), which can be
null/stale at click time — and the gate `if (!selectionRange) return`
(`:291` color; also `:244` bold, `:266` italic, `:316` highlight, `:349` link)
early-returns, so `onApplyTextMark` is never called. The live DOM selection is
provably still valid at click time (preserved by the wrapper's `onMouseDown`
`preventDefault`), but the code never reads it. Synthetic tests dodge this with
`flushSync`.

The same wrapper `onMouseDown` `preventDefault()` (`:228-231`) is inherited by
the link `<input aria-label="Inline link URL">` (`:331-338`), which has no own
`onMouseDown`; `preventDefault` on `mousedown` cancels the browser focus
transfer, so the input never becomes `document.activeElement` and cannot be
typed into.

### Ruled out (do not re-investigate)
- No document/native outside-mousedown listener resets the selection
  (`PageEditor.tsx` only has `keydown` `:2109` and conditional drag
  `pointermove/up` `:1963-1964`).
- `applyInlineTextMark` (`PageEditor.tsx:1380-1407`) / `applyTextMark`
  (`:583-607`) are not the no-op: block found, `marks ∈ pageBlockPropKeys.heading`
  (`pageDocumentV2.ts:592`), and the `JSON.stringify` no-op guard (`:1392`) does
  not fire for a fresh valid mark.

## Current State (verified)

- `PageAuthoringCanvas.tsx:74-84` `focusInlineEditableNode` — stable ref callback
  (focuses on mount, collapses caret to end; guarded by `document.activeElement
  === node`). Wired at `:162` `ref: editing ? focusInlineEditableNode : undefined`.
- `:105-115` `readInlineTextSelectionRange(root)` — returns `{from,to}` from the
  live DOM Selection, or `null` for collapsed/out-of-root. Reusable as-is.
- `:144` `const [selectionRange, setSelectionRange] = useState<…|null>(null)`.
- `:228-231` toolbar wrapper `onMouseDown` → `preventDefault()` + `stopPropagation()`.
- `:244/266/291/316/349` control `onClick` gates use `if (!selectionRange) return`.
- `:331-338` link URL `<input>` (no own `onMouseDown`).

## Implementation pseudocode

### 1. Capture the editable node + a synchronous selection snapshot

```tsx
const editableRef = useRef<HTMLElement | null>(null);
const selectionSnapshotRef = useRef<InlineTextSelectionRange | null>(null);

// Stable composed ref: keep the existing focus-on-mount behavior AND expose the node.
const setEditableNode = useCallback((node: HTMLElement | null) => {
  editableRef.current = node;
  focusInlineEditableNode(node); // unchanged; its activeElement guard prevents re-collapsing
}, []);
```
Wire it: `ref: editing ? setEditableNode : undefined` (replaces `:162`).
(Stable `useCallback` ⇒ React invokes it only on mount/unmount, matching today's
behavior; no extra focus/selection churn. No `setState` in an effect body —
complies with AGENTS.md React-hooks rules.)

### 2. Toolbar `onMouseDown`: snapshot the live selection; don't steal input focus

```tsx
onMouseDown={(event) => {
  event.stopPropagation();
  // BUG #2: let focusable fields (the link URL input) receive focus + typing.
  if (event.target instanceof HTMLInputElement) return;
  // BUG #1: snapshot the still-live DOM selection now, before preventDefault,
  // because the editable's mouseup/keyup will not fire for this sibling toolbar.
  if (canApplyTextMarks && editableRef.current) {
    const live = readInlineTextSelectionRange(editableRef.current);
    if (live) {
      selectionSnapshotRef.current = live;
      setSelectionRange(live); // keep the `disabled` bindings honest too
    }
  }
  event.preventDefault(); // preserve selection/focus for button/swatch clicks
}}
```

### 3. Every control reads the snapshot first

For each of the 5 control `onClick` handlers (bold `:244`, italic `:266`, color
`:291`, highlight `:316`, link `:349`) replace the gate:

```tsx
const range = selectionSnapshotRef.current ?? selectionRange;
if (!range) return;
onApplyTextMark({ blockId: block.id, propPath, type, from: range.from, to: range.to, /* color | href */ });
```
The ref write in step 2 is synchronous and runs on the same physical click before
`onClick`, so the range is always the user's true selection even if React has not
re-committed `selectionRange`.

## Data flow (after fix)

real mousedown on swatch → toolbar `onMouseDown`: snapshot live range into
`selectionSnapshotRef` → real click → control `onClick`: `range = snapshot ??
state` → `onApplyTextMark` → `applyInlineTextMark` (`PageEditor.tsx:1391`) →
`applyTextMark` → `setDocumentDraft({marks})` → renderer paints
`<span data-page-text-mark>` after edit exits (existing path, unchanged).

real mousedown on link input → `onMouseDown` returns early (no preventDefault) →
input focuses → typing fires input `onChange` → `setLinkHref` → link button
`onClick` applies `{type:'link', href: linkHref, ...range}`.

## Error handling / invariants preserved

- `readInlineTextSelectionRange` returns `null` for collapsed/out-of-root
  selection; controls keep `if (!range) return` (no throw, no empty-range mark).
- Color/href sanitization unchanged: fail-closed `sanitizeAuthoringCssColor`
  (normalize + reject-on-write) and the neutral href sanitizer still run in
  `applyTextMark`/normalizers. No new sink, no `dangerouslySetInnerHTML`.
- `disabled={!selectionRange}` bindings still work (now also kept in sync by the
  snapshot `setSelectionRange`).
- Selection-preservation for buttons unchanged (`preventDefault` still runs for
  non-input targets); undo/redo history and `mouseup`/`keyup` capture untouched.

## Regression-test shape

Lane: **Vitest** (Bun-free admin/UI) — extend
`tests/vitest/ui/page-authoring-canvas.test.tsx`. Tests must reproduce the real
ordering and must NOT use `flushSync` to pre-sync state (that is what masked the
bug today).

- **Test A — swatch applies to selection without prior keyup state:** render the
  editable in editing mode with known text; set a non-collapsed DOM Selection
  over a fragment; do **not** fire the editable `mouseup`/`keyup` (so
  `selectionRange` state stays null, like the real sibling-toolbar case); fire
  `mouseDown` on the toolbar wrapper, then `click` a color swatch. Assert
  `onApplyTextMark` was called once with `{type:'color', from, to, color}`
  matching the fragment. (Fails on current code — gate returns; passes after the
  snapshot fix.) Repeat once for the link button using a typed href.
- **Test B — link input focusable/typable:** render editing; fire `mouseDown` on
  the link `<input>` and assert `event.defaultPrevented === false`; set its value
  via change and assert it round-trips to the applied `{type:'link', href}` (i.e.
  `preventDefault` no longer blanket-runs over the input).
- Keep/adjust the existing `:270` test so it still asserts the
  selection→swatch→`onApplyTextMark` contract.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx`
  (plus `tests/vitest/services/page-renderer-v2*` / `page-document-v2*` if touched
  — they should not be).
- Live smoke (`coderso-dev-core-host` + `playwright-cli`, **real** clicks): on a
  throwaway page, double-click a heading, select a fragment, click a swatch →
  only that fragment recolors; type a URL in the link field + apply → fragment
  becomes a sanitized anchor; clean up (Undo / discard draft). Do not publish.

## Security note

No route/auth/RBAC/CSRF surface is touched. Color and href values continue to
flow through the existing fail-closed authoring sanitizers before persistence and
render; this change only fixes which selection range the (already-sanitized)
mark is applied to and lets the link input receive focus.
