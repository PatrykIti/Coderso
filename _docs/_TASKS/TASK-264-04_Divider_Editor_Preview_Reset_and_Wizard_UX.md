# TASK-264-04: Divider Editor Preview Reset and Wizard UX

# FileName: TASK-264-04_Divider_Editor_Preview_Reset_and_Wizard_UX.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-05-03, TASK-264-01, TASK-264-02, TASK-264-03
**Status:** To Do

---

## Overview

Add Divider-specific editor preview, Wizard comfort controls, and reset actions
from `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.

This leaf covers:

- U3: inline Divider preview inside editor modes;
- U4: Wizard access to common color and spacing decisions after shared token and
  color behavior is fixed;
- W12: reset/normalize actions for Divider fields.

## Scope Boundary

This leaf is editor-only except for consuming already-landed Divider schema
fields. It must not add production fallbacks only for preview. The preview must
render through the same Divider renderer or a pure preview helper that receives
normalized data.

Shared Advanced no-op, shared custom spacing, and shared CSS variable picker
repairs remain TASK-256 scope. Do not hide those repairs inside this leaf.

## Sub-Tasks

- [ ] Add a compact inline preview component that renders the normalized Divider
  with the active variant and current data.
- [ ] Show the preview in Visual and Advanced, and decide whether Wizard gets
  the same preview or a smaller read-only preview row.
- [ ] Add Wizard controls for the highest-value Divider decisions that do not
  overload first-run setup: line color/tone, width mode, and top/bottom spacing
  only after TASK-256 shared controls are available.
- [ ] Add reset actions for style, spacing, label, and all Divider data using a
  single normalized defaults source.
- [ ] Add tests proving reset does not change variant unless the explicit
  all-reset action is selected.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Add `DividerPreview`, Wizard comfort controls, and reset/normalize actions. |
| `core/widgets/core/divider.tsx` | Export pure helpers only if the preview needs them; do not add preview-only runtime behavior. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Add preview render, Wizard control, and reset action assertions. |
| `tests/vitest/widgets/divider.test.tsx` | Update only if a pure exported helper or default contract changes. |
| `_docs/_WIDGETS/DIVIDER.md` | Document editor mode ownership and reset behavior. |

## Implementation Pseudocode

```tsx
function DividerPreview({ value, variant }: { value: DividerData; variant: string }) {
  const normalized = normalizeDividerData(value);
  return (
    <div aria-label="Divider preview" className="rounded-md border bg-muted/30 p-3">
      <DividerBlock data={normalized} variant={variant} />
    </div>
  );
}

function resetDividerSection(section: "label" | "style" | "spacing" | "all") {
  updateValue(value, onChange, (current) => {
    if (section === "label") return { ...current, label: dividerDefaults.label };
    if (section === "spacing") {
      return {
        ...current,
        marginTop: dividerDefaults.marginTop,
        marginBottom: dividerDefaults.marginBottom,
      };
    }
    if (section === "style") {
      return pickDefaultStyleFields(current, dividerDefaults);
    }
    return dividerDefaults;
  });
}
```

Error handling:

- Preview must tolerate invalid persisted values by rendering normalized data.
- Reset actions must not erase unrelated fields unless their button explicitly
  says it resets all Divider data.
- Wizard must remain short; if controls become dense, keep them in Visual and
  document the deferral in TASK-264-06.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless this leaf consumes new fields
  from previous TASK-264 leaves.
- Anti-abuse: preview renders normalized plain React output; no raw HTML,
  script, iframe, external fetch, or privileged diagnostics.
- Secret handling: preview and reset UI must not expose secrets or raw preview
  tokens.

## Git Scope Safeguards

- Work in a dedicated TASK-264 branch or worktree when implementation runs
  alongside other widget-report agents.
- Re-read `_docs/_TASKS/README.md` immediately before editing the board because
  it is a shared hotspot.
- Stage only this leaf's Divider owner files plus required Divider docs, report,
  changelog, and task-board updates.
- Verify `git diff --cached --name-only` before every commit so unrelated
  widget task families stay out of scope.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx` only if
  runtime/default helpers change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit` before any manual commit or leaf closure

## Documentation Updates Required

- Update `_docs/_WIDGETS/DIVIDER.md`.
- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` rows U3, U4, and W12 after
  validation.

## Changelog Policy

- Covered by the TASK-264 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Divider editors show a truthful inline preview based on normalized current
  data.
- Wizard exposes only compact, high-value controls and does not duplicate shared
  broken token/color behavior.
- Reset actions are explicit, tested, and preserve variant unless the selected
  reset action intentionally changes all data.
