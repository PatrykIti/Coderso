# TASK-339-02: Navigation Hero Parity and Contract Truthfulness

# FileName: TASK-339-02_Navigation_Hero_Parity_and_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01, TASK-336-19
**Status:** Done (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Bring `navigation` up to the `hero` daily-authoring baseline.

Navigation still has both kinds of drift the audit is targeting: its real daily
IA is too coarse (`Visual=2`, `Advanced=1`), and its color controls still show
raw daily value inputs instead of the `hero` swatch-first surface.

## Source Findings

- `core/.tmp/widget_audit_all.jsonl` reports `navigation` renders
  `Visual=2`, `Advanced=1`, with `10` raw daily color value inputs.
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` uses
  `SharedColorControl` without `showValueInput={false}`.
- `core/widgets/core/navigation.tsx` still declares the same coarse two-section
  `Visual` split and single-section `Advanced` split.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Expand `Visual` / `Advanced` into named hero-like sections and remove raw daily color value inputs. |
| `core/widgets/core/navigation.tsx` | Make `editorContract` match the final rendered section ids, titles, and roles. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Cover the new section IA, swatch-only color behavior, and stable metadata. |
| `tests/vitest/widgets/navigation.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/shared-color-control.test.tsx` | Keep shared swatch-only behavior aligned with the updated Navigation usage. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations for the `BlockSettings` shell. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document the final hero-parity section ownership. |

## Implementation Pseudocode

```tsx
<WidgetEditorSection id="navigation.visual.brand" role="content" ... />
<WidgetEditorSection id="navigation.visual.links" role="content" ... />
<WidgetEditorSection id="navigation.visual.behavior" role="layout" ... />
<WidgetEditorSection id="navigation.visual.surface" role="visual" ... />
<WidgetEditorSection id="navigation.visual.colors" role="visual" ... />

<SharedColorControl showValueInput={false} ... />

export const navigationEditorContract = {
  version: 2,
  sections: [
    // wizard
    // visual brand / links / behavior / surface / colors
    // advanced runtime / layout / style / authoring boundaries
  ],
};
```

Data flow:

- Keep page/menu pickers and existing persisted paths unchanged.
- Move only the daily IA and color-authoring surface.

Error handling:

- Do not reintroduce raw daily color textboxes.
- Do not widen `Advanced` into a second editable style panel.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `navigation` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/NAVIGATION.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Navigation no longer exposes raw daily color value inputs.
- Navigation `Visual` / `Advanced` use a clearer hero-like section split.
- The rendered section ids/titles/roles match `core/widgets/core/navigation.tsx`.

## Completion Notes (2026-05-27)

- Navigation now uses hero-style section ownership in the actual editor DOM:
  `Variant and Structure`, `Brand and Logo`, `Navigation Links`,
  `CTA and Right Actions`, `Mobile Behavior`, `Colors, Borders, Typography`,
  and `Surface and Runtime Behavior` are each rendered as real
  `WidgetEditorSection` owners instead of two coarse buckets.
- Daily Navigation colors are now swatch-first with no visible raw value
  inputs, matching the current practical `hero` authoring shape.
- `core/widgets/core/navigation.tsx` now declares truthful `wizard` / `visual`
  / `advanced` sections that match the rendered ids, titles, and roles.
- Claude Playwright review was completed from browser snapshots only after
  unblocking local admin access with a temporary local reviewer account. Claude
  initially flagged the swatch controls as raw hex textboxes, but the finding
  was rejected after a direct hero-vs-navigation snapshot comparison showed
  the same `input[type=color]` accessibility mapping in Hero. Final Claude
  result: `NO BLOCKERS`.
- Targeted widget smoke kept `public` green for `/homepage`, while the legacy
  widget-contract smoke harness still reports `admin_unreachable` on
  `http://localhost:5173/admin/` even though browser-driven Playwright review
  succeeds on the same dev server. That harness reachability false-negative was
  recorded as environment drift, not a Navigation regression.
- Validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
