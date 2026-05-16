# TASK-256-05-03: Spacer and Divider Token Control Findings

# FileName: TASK-256-05-03_Spacer_and_Divider_Token_Control_Findings.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-05
**Status:** To Do

---

## Overview

Repair spacer and divider report findings around token clarity, variant-aware
Advanced controls, custom pixel UX, and divider accessibility.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:150-171,193-211,264-274` covers
  duplicate none/zero choices, fixed/responsive Advanced mismatch, and custom
  token UX.
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:71-73,96,110-113,142-148` covers
  inert Advanced variant select, CSS variable destruction, duplicate none/zero
  choices, renderer issues, and test requirements.

## Sub-Tasks

- [ ] Normalize spacer `none`/`0` and custom-pixel UI through TASK-256-02.
- [ ] Make spacer Advanced controls reflect the active fixed/responsive variant.
- [ ] Remove or wire the divider Advanced variant select.
- [ ] Preserve CSS variable/custom token strings when color pickers cannot
  represent them.
- [ ] Add divider separator semantics according to decorative vs labelled
  variants.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | 46-52, 157-205 | Single visible zero/off choice, custom token state, and variant-aware Advanced controls. |
| `core/widgets/core/spacer.tsx` | renderer and normalizer | Preserve explicit `none` semantics and deterministic height output. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | 61-69, 179-217, 433-445 | Remove inert controls, preserve CSS variable values, and expose clear/custom token state truthfully. |
| `core/widgets/core/divider.tsx` | separator render | Add `role="separator"` or `aria-hidden` according to the rendered divider type. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | existing suite | Add variant-aware Advanced and token regressions. |
| `tests/vitest/widgets/spacer.test.tsx` | existing suite | Add height/token output regressions. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | existing suite | Add no-op select and CSS variable regressions. |
| `tests/vitest/widgets/divider.test.tsx` | existing suite | Add separator ARIA and token output regressions. |

## Implementation Pseudocode

```tsx
function renderSpacerAdvancedControls(variant: SpacerVariantId, data: SpacerData) {
  if (variant === "fixed") {
    return <FixedHeightControls value={data.fixed} />;
  }
  return <ResponsiveHeightControls value={data.responsive} />;
}

function handleDividerColorPicker(nextHex: string) {
  updateDividerStyle({
    color: canRepresentAsHex(value.style?.color) ? nextHex : value.style?.color,
    colorPickerPreview: nextHex,
  });
}
```

Error handling:

- CSS variables and raw custom tokens must not be overwritten by picker fallback
  values unless the user explicitly selects a new value.
- Unsupported spacer/divider variants normalize to defaults while retaining
  safe style fields.
- Decorative dividers should not receive misleading accessible names.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: no user-authored scripts or unsafe attributes in style output.
- Secret handling: no secrets in widget payloads or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- Run `tests/vitest/widgets/styleNoneTokens.test.tsx` when token semantics
  change.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` and
  `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.
- Update `_docs/_WIDGETS/SPACER.md` and `_docs/_WIDGETS/DIVIDER.md` when
  behavior changes.
- Update `_docs/WIDGETS.md` only if shared token semantics change.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Spacer Advanced controls match the active variant.
- Divider Advanced no longer contains inert controls.
- CSS variables/custom values are not silently destroyed by color pickers.
- Divider output has correct accessibility semantics.
