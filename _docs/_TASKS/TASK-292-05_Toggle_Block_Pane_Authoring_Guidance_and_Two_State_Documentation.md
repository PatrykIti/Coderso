# TASK-292-05: Toggle Block Pane Authoring Guidance and Two-State Documentation

# FileName: TASK-292-05_Toggle_Block_Pane_Authoring_Guidance_and_Two_State_Documentation.md

**Priority:** Medium
**Category:** Widgets + Page Builder + Admin UI + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-292, TASK-256-03, TASK-256-05-04
**Status:** To Do

---

## Overview

Improve Toggle Block pane authoring guidance and document the intentional
two-state product boundary.

The Playwright report asks for clearer empty-pane guidance and questions
whether Toggle Block should support more than two states. This leaf keeps the
current two-pane model explicit and improves builder-facing guidance without
changing public placeholder safety, which remains TASK-256 scope.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:64-68` notes that three or
  more states are unsupported and asks whether that is an intentional product
  decision.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:126-128` reports that empty
  pane placeholders do not explain how to add content.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:238` lists empty pane CTA as
  high-priority product polish.
- `_docs/_WIDGETS/TOGGLE_BLOCK.md` currently documents fixed `primary` and
  `secondary` slots but does not explain the product boundary or authoring flow.

## Scope

- Add builder-facing guidance for empty `primary` and `secondary` panes using
  existing slot insertion UI patterns.
- Add an Insert Dialog entry point only if an existing page-builder owner
  already exposes a safe, reusable API for slot insertion.
- Document that Toggle Block is intentionally limited to two panes in v1.
- Route 3+ state requirements to Tabs or a future separate task instead of
  broadening this family.
- Ensure public runtime does not leak admin-only guidance after TASK-256
  placeholder gating lands.

## Out of Scope

- Public placeholder gating; TASK-256-03 and TASK-256-05-04 own it.
- New repeatable-slot infrastructure or arbitrary dynamic pane counts.
- Replacing Tabs with Toggle Block or merging their contracts.
- Adding API routes.

## Sub-Tasks

- [ ] Audit the current builder slot insertion owner before adding any pane CTA.
- [ ] Add Toggle Block pane guidance that uses user-facing pane labels instead
  of technical slot IDs.
- [ ] Keep public runtime placeholder output aligned with TASK-256 placeholder
  gating.
- [ ] Document the fixed two-pane v1 contract and route 3+ states outside
  TASK-292.
- [ ] Add runtime/editor/page-builder tests only for the owners touched.
- [ ] Update widget docs and report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/toggleBlock.tsx` | Render only safe authoring guidance in editor/preview context after TASK-256 placeholder gating is available. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Add concise pane authoring guidance and two-pane model copy if editor context owns it. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Touch only if reusing an existing slot insertion CTA owner is required. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover public/runtime absence of admin-only guidance and preview-safe guidance if renderer changes. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Cover pane guidance and two-state copy in editor modes. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Run and update only if slot insertion controls change. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Run and update only if visual panel slot actions change. |
| `_docs/_WIDGETS/TOGGLE_BLOCK.md` | Document fixed two-state contract and pane authoring flow. |
| `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | Record fixed/deferred status for empty pane and 3+ state rows. |

## Implementation Pseudocode

```tsx
function ToggleBlockPaneEmptyState({
  paneLabel,
  canOpenInsertDialog,
  onInsert,
}: {
  paneLabel: string;
  canOpenInsertDialog: boolean;
  onInsert?: () => void;
}) {
  if (!canOpenInsertDialog) {
    return <p>Add widgets to the {paneLabel.toLowerCase()} pane from the page builder.</p>;
  }

  return (
    <button type="button" onClick={onInsert} data-toggle-block-pane-insert>
      Add widget to {paneLabel}
    </button>
  );
}

function assertTwoStateToggleBlock(states: ToggleBlockState[]) {
  return states.filter((state) => state.id === "primary" || state.id === "secondary").slice(0, 2);
}
```

Data flow:

1. Keep pane slots fixed as `primary` and `secondary`.
2. Render authoring guidance only where builder/editor context permits it.
3. If no safe Insert Dialog callback exists, document guidance without adding a
   fake CTA.
4. Keep public runtime empty slots governed by TASK-256 placeholder rules.

Error handling:

- Missing slot controls fall back to non-interactive guidance.
- Unknown extra slots remain ignored by the fixed two-state renderer.
- Guidance copy must not expose technical slot IDs to end users.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model, RBAC, CSRF, and rate limits: unchanged.
- Reject-unknown validation: unchanged unless schema fields are added.
- Anti-abuse: no admin-only controls in public runtime, no unsafe inline
  handlers, no user-authored scripts, and no arbitrary routes.
- Secret handling: no secrets in guidance, diagnostics, reports, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  only if page-builder slot controls change
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` only
  if visual-panel slot action rendering changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` with fixed pane slots, authoring flow,
  and the explicit two-state boundary.
- Update `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` with fixed/deferred
  evidence for empty pane guidance and 3+ state rows.

## Acceptance Criteria

- Authors can understand how to add content to each pane without seeing raw slot
  IDs.
- Public runtime does not expose admin-only placeholder instructions.
- The two-pane model is documented as intentional for v1.
- 3+ state requirements are routed outside TASK-292.
