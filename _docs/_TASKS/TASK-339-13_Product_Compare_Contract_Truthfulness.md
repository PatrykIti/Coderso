# TASK-339-13: Product Compare Contract Truthfulness

# FileName: TASK-339-13_Product_Compare_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** Done (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `product-compare` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows all three modes drift:
  Wizard renders `2` sections vs contract `1`, Visual renders `9` sections vs
  contract `2`, and Advanced uses different ids/roles than the contract owner.
- The current richer UI should remain the source of truth; the contract and
  stable metadata need to catch up.
- Browser review also confirmed the old shared wrapper still owned the variant
  chooser instead of the widget-owned Visual IA.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` | Add truthful section ids/roles that match the live Wizard / Visual / Advanced UI. |
| `core/widgets/core/productCompare.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/product-compare-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/ui/product-compare-admin-preview.test.tsx` | Keep preview-status behavior green if section ownership moves. |
| `tests/vitest/widgets/productCompare.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/PRODUCT_COMPARE.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
wizard:
  comparison source
  limit guidance

visual:
  compared products
  section copy
  attribute rows
  labels
  product columns
  formatting
  layout
  empty state
  surfaces
```

Data flow:

- Preserve the current richer UI and preview-state behavior.
- Align the contract and stable DOM metadata to that UI.
- Keep Hero-style ownership boundaries:
  - Wizard owns source setup,
  - Visual owns the variant and daily comparison presentation,
  - Advanced stays read-only diagnostics only.

Error handling:

- Keep Advanced read-only.
- Do not collapse the UI back to `Rows and labels / Presentation`.
- Do not leave the shared wrapper as the owner of the Product Compare variant
  chooser once the widget-owned Visual IA is restored.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-compare-admin-preview.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `product-compare` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/PRODUCT_COMPARE.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Progress Notes

- 2026-05-27: Product Compare now exports truthful section ids and roles across
  Wizard, Visual, and Advanced instead of the old coarse contract.
- 2026-05-27: Variant ownership moved into a widget-owned `Variant and
  structure` Visual section and the shared wrapper no longer owns the Product
  Compare variant picker.
- 2026-05-27: Advanced now includes a Hero-style read-only banner plus a
  contract summary while preserving preview refresh as a diagnostics-only
  action.
- 2026-05-27: Focused validation is green:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-compare-admin-preview.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- 2026-05-27: Final Claude Playwright snapshot review returned
  `VERDICT: NO BLOCKERS`.

## Acceptance Criteria

- Product Compare keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly across all three modes.
