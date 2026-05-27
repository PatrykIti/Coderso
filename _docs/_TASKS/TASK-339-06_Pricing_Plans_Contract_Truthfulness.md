# TASK-339-06: Pricing Plans Contract Truthfulness

# FileName: TASK-339-06_Pricing_Plans_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `pricing-plans` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `pricing-plans` renders
  `Visual=6`, `Advanced=3` while the contract still declares `Visual=2`,
  `Advanced=1`.
- Several rendered sections still have anonymous or local-only metadata rather
  than stable widget-owned ids and roles.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/pricingPlans.tsx` | Replace the stale two-section contract with the true rendered section inventory. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
// Keep the current richer IA, but make it truthful.
variant and plan structure
header copy
billing toggle
plans, features, and actions
layout and notes
colors and emphasis
```

Data flow:

- Preserve the existing richer UI.
- Move the contract and section metadata up to that truth.

Error handling:

- Do not regress back to the older `Header and plans / Behavior and style` UI.
- Keep `Advanced` read-only.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `pricing-plans` against the `hero` baseline

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/PRICING_PLANS.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Pricing Plans keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
