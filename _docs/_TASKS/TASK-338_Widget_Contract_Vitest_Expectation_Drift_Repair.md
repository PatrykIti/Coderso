# TASK-338: Widget Contract Vitest Expectation Drift Repair

# FileName: TASK-338_Widget_Contract_Vitest_Expectation_Drift_Repair.md

**Priority:** High
**Category:** QA + Widgets + Admin UI + Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-336-04, TASK-336-09, TASK-336-19, TASK-337
**Status:** Done (2026-05-27)

---

## Overview

Repair the failing full `bun run test:vitest` lane after the widget contract and
editor-ownership cleanup by aligning stale Vitest expectations with the current
owner contracts for Template Section, Content List, Hero, Footer, Newsletter,
Section, and Split Layout.

The current failures are regression-test drift, not fresh runtime type or lint
errors. The fix must preserve the current product contract instead of restoring
retired section titles, raw diagnostic payload expectations, or legacy social
labels.

## Source Findings

- `bun run test:vitest` currently fails with `7` tests across `4` files.
- `TemplateSection` Visual/Advanced no longer surface raw payload diagnostics or
  Wizard-only template-loading errors in daily editing modes.
- `ContentList` Visual variant selection is card-based, so the old select-based
  test interaction no longer exercises `onVariantChange`.
- `Hero` badge destination now uses the shared `LinkDestinationField` id
  `hero.badge.href`.
- `Footer` default social links now render `X` rather than `Twitter`.
- Block settings coverage for `Newsletter`, `Section`, and `SplitLayout` still
  expects earlier section titles instead of the current source-of-truth Visual
  sections.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `tests/vitest/ui/widget-editors-wave-1.test.tsx` | Align Template Section expectations with the current read-only diagnostics contract and update Content List variant interaction to the live card-based control. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update Newsletter, Section, and SplitLayout block-settings section-title assertions to the current Visual contract. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Update the shared badge destination field assertion to the live `LinkDestinationField` id. |
| `tests/vitest/widgets/renderer.test.tsx` | Update the footer social-label expectation from `Twitter` to the current `X` label. |
| `_docs/_TASKS/TASK-338_Widget_Contract_Vitest_Expectation_Drift_Repair.md` | Track status, validation, and closure notes. |
| `_docs/_TASKS/README.md` | Keep task board counts and rows synchronized during execution and closure. |

## Implementation Pseudocode

```tsx
// Template Section: assert the current read-only diagnostics, not retired raw payload UI.
expect(view.container.textContent).toContain("Active template");
expect(view.container.textContent).toContain("Resolved template");
expect(view.container.textContent).toContain("No resolution problem detected.");
expect(view.container.textContent).not.toContain("Template load failed");
expect(view.container.textContent).not.toContain("Resolved payload");

// Content List: variant is now a visual card/button control.
const compactVariantButton = findButtonByText(view.container, "Compact");
compactVariantButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
expect(onVariantChange).toHaveBeenCalledWith("compact");

// Block settings: assert the live section titles from the owning editors.
expect(html).toContain("Connection status");
expect(html).toContain("Section link and accessibility");
expect(html).toContain("Phone behavior");

// Footer social label: the default saved platform is X.
expect(html).toContain('aria-label="X (opens in new tab)"');
```

Data flow:

- Tests must follow the current owner modules rather than preserving historical
  section names or Wizard/Advanced overlaps.
- Variant-selection coverage should use the same UI control shape the product
  now renders.
- Read-only diagnostics assertions should verify the current summary contract
  and explicitly avoid reintroducing raw payload expectations.

Error handling:

- Do not reintroduce deprecated UI copy or raw diagnostics to satisfy stale
  tests.
- Do not weaken assertions into generic smoke checks; keep them contract-level.
- Keep expectations scoped to live editor/runtime behavior so future contract
  drift is intentional and reviewable.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schemas and editor contracts.
- Anti-abuse: no new public-write surfaces or browser-stored secrets.
- Secret handling: no raw runtime payloads or hidden technical connection data
  are reintroduced into daily editor assertions.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/widget-editors-wave-1.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest`

## Documentation Updates Required

- Update this task file with final status and validation notes.
- Update `_docs/_TASKS/README.md` on status changes.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` if the task is
  completed in this work session.

## Acceptance Criteria

- Full `bun run test:vitest` is green again.
- Template Section, Content List, Hero, Footer, Newsletter, Section, and Split
  Layout tests all reflect the current contract owners.
- No production widget contract is weakened only to satisfy stale tests.


## Completion Notes (2026-05-27)

- Full `bun run test:vitest` is green again.
- `TemplateSection`, `Hero`, `Footer`, `Newsletter`, `Section`, and
  `SplitLayout` expectations now match the live widget-contract/UI ownership
  model.
- The broad `widget-editors-wave-1` smoke no longer duplicates `PostsFeed` and
  `ContentList` variant callback ownership that is already covered by the
  dedicated editor-wave suites.
- Validation passed:
  - `bun run test:vitest -- tests/vitest/ui/widget-editors-wave-1.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/renderer.test.tsx`
  - `bun run test:vitest`
