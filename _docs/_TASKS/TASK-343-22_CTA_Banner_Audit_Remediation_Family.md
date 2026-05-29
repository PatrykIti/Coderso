# TASK-343-22: CTA Banner Audit Remediation Family

# FileName: TASK-343-22_CTA_Banner_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + CTA Banner + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close CTA Banner truthfulness drift where the `With Badge` variant is visually
indistinguishable from `Centered`, CTA destination requirements can make actions
disappear without inline guidance, and Advanced repair actions do not provide
visible feedback.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_CTA_BANNER_WIDGET.md:204-227`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `core/widgets/core/ctaBanner.tsx`

## Sub-Tasks

- [ ] Make `With Badge` visually distinct or remove/rename the variant so it no
  longer promises a different layout.
- [ ] Add inline guidance when a CTA label exists but no safe destination is
  configured.
- [ ] Add completion feedback for `Normalize now` and `Reset to defaults`.
- [ ] Keep safe-link/new-tab behavior unchanged.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Fix variant/action feedback and repair-action toasts/inline state. |
| `core/widgets/core/ctaBanner.tsx` | Align variant output and missing-destination rendering. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Cover variant distinctness and CTA missing-destination output. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover action feedback and repair action confirmation. |

## Implementation Pseudocode

```ts
function resolveCtaBannerVariant(variant: CtaBannerVariant, badgeEnabled: boolean) {
  if (variant === "with-badge" && !badgeEnabled) return { mode: "centered", notice: "badge_disabled" };
  return { mode: variant, notice: undefined };
}

function resolveCtaActionState(action: CtaAction) {
  if (action.label && !action.href) return { render: "disabled_hint", reason: "missing_destination" };
  return { render: "link" };
}
```

## Regression Test Shape

- `With Badge` differs from `Centered` or reports why it cannot.
- Missing CTA destination yields editor/runtime guidance, not silent removal.
- Repair actions produce observable success/no-op feedback.

## Security Contract

No API routes are added. Safe-link, target, and `rel` policies stay unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_CTA_BANNER_WIDGET.md`.
- Update `_docs/_WIDGETS/CTA_BANNER.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- CTA Banner variants and actions no longer promise invisible behavior.
- Repair actions give clear feedback without weakening link safety.
