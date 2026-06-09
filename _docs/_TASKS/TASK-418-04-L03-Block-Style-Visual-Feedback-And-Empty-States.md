# TASK-418-04-L03: Block Style Visual Feedback And Empty States
# FileName: TASK-418-04-L03-Block-Style-Visual-Feedback-And-Empty-States.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Admin UI / Pages / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-418-04-L01, TASK-418-03-L02
**Status:** ⏳ To Do

---

## Overview

Render block styles and editor states honestly on the canvas: selection rings,
empty placeholders, visibility ghosts, width/alignment, color/background,
opacity, border/radius/shadow, spacing, and type-specific preview content.

---

## Implementation Pseudocode

```tsx
function BlockCanvas({ block, selection, breakpoint }) {
  const resolved = resolvePageBlockForBreakpoint(block, breakpoint);
  const style = toBlockStyle(resolved.style);
  return (
    <div
      data-page-editor-block={resolved.type}
      data-block-id={resolved.id}
      data-selected={isSelected(selection, resolved.id) || undefined}
      className={joinClasses("relative", blockWidthClass(resolved.style), blockSelectionClass(selection))}
      style={style}
    >
      <BlockEditorChrome />
      {resolved.visibility.visible ? renderPageBlockContent(resolved, "admin") : <HiddenBlockGhost />}
    </div>
  );
}
```

Expected data flow:

- Block universal controls patch `block.style`/`block.visibility`.
- Canvas resolves breakpoint overrides and applies visible styles.
- Empty blocks use useful, clickable placeholders without pretending to be final
  public content.

Error handling:

- Unsupported public blocks remain clearly marked until runtime parity closes.
- Bad media/embed values render safe placeholders in admin.

Regression-test shape:

- Block width/alignment/background/opacity/radius changes are visible.
- Hidden block remains selectable in admin and omitted or hidden in public
  runtime as defined by the renderer contract.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** block style values normalize through Pages owner.
- **Anti-abuse controls:** embed/media/html placeholders must not execute
  untrusted code in admin canvas.

---

## Testing Requirements

- Vitest UI tests for selected block visual feedback.
- Vitest UI tests for block style changes on canvas.
- Bun public runtime tests for corresponding public style where applicable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if block style contract changes.
