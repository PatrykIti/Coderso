# TASK-291-02: Timeline Editor Mode Preview Date Guidance and Reorder UX

# FileName: TASK-291-02_Timeline_Editor_Mode_Preview_Date_Guidance_and_Reorder_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Timeline Editor
**Estimated Effort:** Large
**Dependencies:** TASK-291, TASK-256-01, TASK-291-01
**Status:** To Do

---

## Overview

Improve Timeline Visual editor clarity for mode selection, date editing,
reordering, and dense step controls.

This leaf owns U1-U4, U8, U9, and W2 from
`REPORT_TIMELINE_WIDGET.md`. It must use TASK-256-01's atomic update path when
mode changes also update the preferred variant.

## Sub-Tasks

- [ ] Replace or supplement the mode dropdown with preview cards/icons for
  `process`, `axis`, `chronology`, and `alternating`.
- [ ] Add mode-change messaging that explains the preferred variant side effect
  without dropping current data.
- [ ] Add date input guidance: date picker when possible, format validation, and
  preserved `dateLabel` for non-ISO copy.
- [ ] Add concise helper text for icon, accent, date, spacing, and marker
  controls that currently rely on placeholders only.
- [ ] Group per-step marker/accent controls so long timelines remain scannable.
- [ ] Add drag reorder for pointer users while preserving existing Up/Down
  keyboard fallback and stable IDs.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Add mode preview cards, mode-change copy, date validation helpers, grouped marker controls, spacing help, and optional drag reorder. |
| `core/widgets/core/timeline.tsx` | Add schema/default support only if editor changes introduce persisted fields. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover mode previews, mode side-effect copy, date validation, grouped marker UI, spacing help, and reorder fallback. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Run when this leaf touches atomic VisualPanel behavior through TASK-256-01 integration. |

## Implementation Pseudocode

```tsx
function updateTimelineMode(nextMode: TimelineMode) {
  const nextVariant = preferredVariantForMode(nextMode);
  const nextData = { ...value, mode: nextMode };

  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextData,
    }));
    return;
  }

  onVariantChange?.(nextVariant);
  onChange(nextData);
}

function validateDateInput(date: string) {
  if (!date) return { valid: true };
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? { valid: true }
    : { valid: false, message: "Use YYYY-MM-DD or move prose into Date label." };
}
```

Data flow:

1. Mode selection computes the preferred variant and Timeline data patch
   together.
2. The editor uses the atomic block patch when available, otherwise keeps the
   legacy callback fallback for non-shared hosts.
3. Date validation is advisory in the editor; the normalizer preserves existing
   date/dateLabel fields unless a schema rule is intentionally tightened.
4. Drag reorder updates the same `moveStep()` flow used by Up/Down buttons.

Error handling:

- Unsupported mode IDs are ignored and do not rewrite the block.
- Invalid date text shows inline feedback but does not destroy `dateLabel`.
- Drag reorder failures keep the previous step order and stable IDs.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless persisted mode/date metadata is
  extended.
- Anti-abuse: no public write path. Date/helper text stays plain text.
- Secret handling: no secrets in editor helper copy or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` when
  atomic VisualPanel integration changes
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx` if schema or
  normalizer behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TIMELINE.md` with final Visual mode/date/reorder
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed/deferred
  status for U1-U4, U8, U9, and W2.

## Acceptance Criteria

- Visual mode selection is understandable before a user changes data.
- Mode changes preserve Timeline mode and preferred variant together after
  TASK-256-01 lands.
- Date fields provide actionable feedback without destroying existing labels.
- Reorder supports pointer users and keeps keyboard button fallback.
