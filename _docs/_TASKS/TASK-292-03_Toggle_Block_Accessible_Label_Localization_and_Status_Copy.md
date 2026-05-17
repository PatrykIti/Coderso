# TASK-292-03: Toggle Block Accessible Label Localization and Status Copy

# FileName: TASK-292-03_Toggle_Block_Accessible_Label_Localization_and_Status_Copy.md

**Priority:** High
**Category:** Widgets + Accessibility + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-292, TASK-256-04, TASK-256-05-04
**Status:** To Do

---

## Overview

Expose Toggle Block-owned accessible copy so the radiogroup label and selected
state announcement are not hardcoded English strings.

This leaf owns configurable copy only after TASK-256 structural ARIA work lands
or TASK-256-08 confirms the label-localization row as Toggle Block product
scope. TASK-256 still owns the structural ARIA relationship repairs,
instance-safe IDs, and runtime binding.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:87-89` reports
  `aria-label="Toggle content view"` as hardcoded and not localizable.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:199-205` verifies current
  radiogroup/live-status behavior while noting the label is hardcoded.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:244` lists the hardcoded
  radiogroup label as a medium-priority issue.

## Scope

- Add a schema-backed `labels.ariaLabel` field or similarly named accessible
  label field.
- Add selected-state announcement copy if needed, for example a template or a
  bounded suffix such as `"selected"`.
- Derive accessible defaults from current English copy so legacy payloads keep
  rendering correctly.
- Add editor controls in Visual/Advanced; Wizard may show only a concise
  accessibility summary unless UX requires direct editing.
- Keep screen-reader copy plain text only.

## Out of Scope

- Instance-safe IDs and ARIA relationship fixes; TASK-256 owns them.
- General i18n infrastructure, translation files, or locale negotiation.
- Rich text, HTML, script execution, or arbitrary templates in accessible copy.
- Public API routes or server-side translation services.

## Sub-Tasks

- [ ] Add schema/default/normalizer support for Toggle Block accessible copy.
- [ ] Render the radiogroup label and selected-state announcement from
  normalized plain-text values.
- [ ] Add editor controls in Visual/Advanced and a Wizard-safe summary if
  needed.
- [ ] Add runtime/editor/validator tests for default, custom, empty, and invalid
  accessible-copy paths.
- [ ] Update widget docs and report evidence without claiming TASK-256 ARIA
  relationship fixes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/toggleBlock.tsx` | Extend labels schema/defaults/normalizer and render the configured radiogroup/status copy. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Add accessible-label controls and diagnostics coverage. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover default and custom accessible labels/status text, plus fallback behavior. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Cover editor updates and diagnostics output for accessible copy. |
| `tests/unit/widgets/validator.test.ts` | Cover schema changes for new label fields. |
| `_docs/_WIDGETS/TOGGLE_BLOCK.md` | Document accessible copy fields and localization expectations. |
| `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | Mark hardcoded-label row fixed/deferred after implementation. |

## Implementation Pseudocode

```ts
type ToggleBlockLabels = {
  primary?: string;
  secondary?: string;
  helper?: string;
  ariaLabel?: string;
  selectedSuffix?: string;
};

function normalizeToggleBlockLabels(labels: unknown): Required<ToggleBlockLabels> {
  const current = isRecord(labels) ? labels : {};
  return {
    primary: toTrimmedString(current.primary) ?? "View A",
    secondary: toTrimmedString(current.secondary) ?? "View B",
    helper: normalizeHelperThroughTask256(current.helper),
    ariaLabel: toTrimmedString(current.ariaLabel) ?? "Toggle content view",
    selectedSuffix: toTrimmedString(current.selectedSuffix) ?? "selected",
  };
}

function resolveSelectedAnnouncement(labels: Required<ToggleBlockLabels>, state: ToggleBlockStateId) {
  const activeLabel = state === "secondary" ? labels.secondary : labels.primary;
  return `${activeLabel} ${labels.selectedSuffix}`;
}
```

Data flow:

1. Normalize new accessible copy next to existing labels.
2. Render `aria-label` from normalized data.
3. Render live status from normalized state label plus selected copy.
4. Keep editor controls in the labels/accessibility section and avoid hidden
   duplicated state outside the normalized payload.

Error handling:

- Empty accessible-label values fall back to defaults.
- Very long labels should be clamped or treated with existing text input limits
  if the repo has a local pattern.
- Plain text only; no HTML interpolation.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model, RBAC, CSRF, and rate limits: unchanged.
- Reject-unknown validation: schema must reject unknown label fields.
- Anti-abuse: accessible copy is plain text only and must not render raw HTML or
  user-authored scripts.
- Secret handling: no secrets in widget data, diagnostics, DOM labels, reports,
  or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` with accessible-copy fields.
- Update `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` with fixed evidence
  for the hardcoded label row.

## Acceptance Criteria

- Runtime no longer hardcodes the radiogroup label when custom copy is provided.
- Live status copy remains readable and localized through widget data.
- TASK-256 remains the owner for structural ARIA/ID repairs.
- Tests cover default, custom, and invalid accessible-copy paths.
