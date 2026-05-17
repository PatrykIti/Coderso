# TASK-274-03: Logo Cloud Item Management and Reorder

# FileName: TASK-274-03_Logo_Cloud_Item_Management_and_Reorder.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Admin UI + Repeated Item UX
**Estimated Effort:** Large
**Dependencies:** TASK-274, TASK-274-02
**Status:** To Do

---

## Overview

Improve Logo Cloud repeated-item lifecycle controls so users can manage up to 24
logos without accidental destructive edits or excessive Move button clicks.

Source report findings:

- UX-02 remove logo without confirm or undo
- UX-08 missing drag-and-drop reorder

Explicitly out of scope:

- Adding a global document undo stack.
- Adding a confirmation-dialog remove flow; this leaf uses inline Undo instead.
- Removing existing Move up / Move down controls; they remain the keyboard and
  deterministic fallback.
- Reusing menu/tree nesting behavior; Logo Cloud owns a flat list only.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add inline undo remove behavior, drag handle reorder, drag state, drop targets, and stable metadata for logo item actions. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover inline undo, drag reorder, Move fallback, min/max count boundaries, and no accidental deletion. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document repeated-item management behavior. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for UX-02/UX-08. |

## Implementation Pseudocode

```tsx
type PendingLogoRemoval = {
  logo: LogoCloudLogo;
  index: number;
  editVersion: number;
} | null;

type LogoDragState = {
  logoId: string;
  fromIndex: number;
  editVersion: number;
} | null;

function LogoCloudVisualEditor(props: LogoCloudEditorProps) {
  const [pendingRemoval, setPendingRemoval] = useState<PendingLogoRemoval>(null);
  const [dragState, setDragState] = useState<LogoDragState>(null);
  const editVersionRef = useRef(0);

  function commitLogoEdit(updater: (current: LogoCloudData) => LogoCloudData) {
    const current = normalizeValue(value);
    const next = updater(current);
    if (next === current) return;
    editVersionRef.current += 1;
    setPendingRemoval(null);
    onChange(normalizeValue(next));
  }
}

function removeLogoWithUndo(index: number) {
  const editVersion = editVersionRef.current + 1;
  commitLogoEdit((current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    const removed = logos[index];
    if (!removed || logos.length <= 1) return current;
    editVersionRef.current = editVersion;
    setPendingRemoval({ logo: removed, index, editVersion });
    return { ...current, logos: normalizeLogoCloudLogos(logos.filter((_, i) => i !== index), logos.length - 1) };
  });
}

function restoreRemovedLogo() {
  if (!pendingRemoval) return;
  if (pendingRemoval.editVersion !== editVersionRef.current) {
    setPendingRemoval(null);
    return;
  }
  updateValue(value, onChange, (current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    const nextLogos = [...logos];
    nextLogos.splice(Math.min(pendingRemoval.index, nextLogos.length), 0, pendingRemoval.logo);
    return { ...current, logos: normalizeLogoCloudLogos(nextLogos, nextLogos.length) };
  });
  editVersionRef.current += 1;
  setPendingRemoval(null);
}

function LogoRemovalUndoNotice() {
  if (!pendingRemoval) return null;
  return (
    <div role="status" data-widget-control="logo-cloud-remove-undo">
      <span>{pendingRemoval.logo.name || "Logo removed"}</span>
      <Button type="button" onClick={restoreRemovedLogo}>Undo</Button>
      <Button type="button" onClick={() => setPendingRemoval(null)}>Dismiss</Button>
    </div>
  );
}

function handleLogoDragStart(index: number, logo: LogoCloudLogo) {
  setDragState({ logoId: logo.id, fromIndex: index, editVersion: editVersionRef.current });
}

function handleLogoDrop(toIndex: number) {
  if (!dragState || dragState.editVersion !== editVersionRef.current) return;
  commitLogoEdit((current) => {
    const logos = normalizeLogoCloudLogos(current.logos);
    const fromIndex = logos.findIndex((item) => item.id === dragState.logoId);
    if (fromIndex < 0 || fromIndex === toIndex || toIndex < 0 || toIndex >= logos.length) return current;
    const nextLogos = [...logos];
    const [item] = nextLogos.splice(fromIndex, 1);
    if (!item) return current;
    nextLogos.splice(toIndex, 0, item);
    return { ...current, logos: nextLogos };
  });
  setDragState(null);
}
```

Editor data flow:

1. Keep `moveLogo` as the button fallback. Drag/drop may reuse its move logic,
   but it must route through `commitLogoEdit` so pending Undo state is
   invalidated.
2. Add a drag handle per logo card with `draggable`, `aria-label`, and stable
   `data-widget-control` metadata.
3. Store only transient id/version-based drag and pending-removal state in
   `LogoCloudVisualEditor` local state; persisted order changes flow through
   `onChange` once a valid drop occurs.
4. Use immediate remove with inline Undo that restores the exact removed item at
   its previous index. Do not also add a confirmation dialog in this leaf.
5. Route every non-restore logo edit through `commitLogoEdit`, which clears
   pending removal and increments `editVersionRef`.
6. Preserve `logos.length >= 1` and `logos.length <= logoCloudLogoMax`.

Error handling:

- Ignore drops with missing, same, out-of-range, or stale indices.
- Do not normalize duplicate IDs into a different item until final persisted
  value passes through the existing normalizer.
- Keep the existing order if remove is attempted while only one logo remains.
- Restore button must no-op safely after another edit invalidates the pending
  removal.

Regression-test shape:

- Removing a logo shows one inline Undo notice and immediately removes the item
  from the emitted value.
- Clicking Undo restores the exact logo at its previous index when no later edit
  invalidated the pending removal.
- A later logo edit, add, move, drag/drop, or second removal clears the pending
  removal; a stale Undo click no-ops.
- Removing the only remaining logo no-ops and does not show an Undo notice.
- Happy-dom/event-level drag tests move logo A after logo C and assert the
  emitted `logos[]` order changes once on drop.
- Invalid drag/drop tests cover same-index drops, out-of-range targets, missing
  drag payloads, and stale drag state without changing order.
- Move up / Move down fallback tests remain alongside drag tests so keyboard
  reorder behavior stays covered.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page/template save flow.
- Reject-unknown validation: no new persisted schema field is required.
- Anti-abuse: drag state and undo state remain editor-local. No raw HTML,
  scripts, class names, credentials, or untrusted external payloads are stored.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx` if
  normalization/order behavior changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Removing a logo is recoverable through inline Undo before data loss becomes
  irreversible.
- Drag reorder works for long logo lists and keeps Move buttons as fallback.
- Min/max logo count protections remain intact.
- Editor tests prove reorder/remove behavior without relying on browser-only
  Playwright evidence.
