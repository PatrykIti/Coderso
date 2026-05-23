# TASK-336-13: P2 Source Style and Diagnostics Cleanup

# FileName: TASK-336-13_P2_Source_Style_and_Diagnostics_Cleanup.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Shared Cleanup
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-336-04, TASK-336-05, TASK-336-06, TASK-336-07, TASK-336-08, TASK-336-09, TASK-336-10, TASK-336-11, TASK-336-12
**Status:** To Do

---

## Overview

Clean the remaining P2 source/style/diagnostic ownership drift after the P0 and
P1 widgets are fixed.

This task covers widgets that are not the highest-risk duplicates but still
need a correct v2 contract: source controls must not hide in visual styling,
Wizard must not become a style panel, and Advanced diagnostics must not mutate
daily presentation by accident.

## Widgets in Scope

- `content-list`
- `booking-calendar`
- `appointment-form`
- `product-table`
- Any additional widget flagged by the smoke harness as P2 source/style drift
  before this task starts.

## Ownership Decision

- Source binding and required first-time setup belong to Wizard.
- Public copy, labels, layout, and surface style belong to Visual.
- Runtime/debug/source summaries in Advanced are read-only unless a field is
  explicitly technical-only.

## Sub-Tasks

- [ ] Run the Playwright smoke harness and registry contract report for P2
  widgets before editing.
- [ ] Add or update `editorContract` metadata for each in-scope widget.
- [ ] Move style/surface controls out of Wizard.
- [ ] Move source/setup controls out of Visual unless they are daily content
  authoring controls.
- [ ] Convert Advanced diagnostics to read-only summaries.
- [ ] Replace local section/control markup with shared primitives where touched.
- [ ] Add focused Vitest UI tests for each widget with changed ownership.
- [ ] Update the Playwright report with the final P2 status.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Add/update contract and preserve runtime behavior. |
| `core/widgets/core/bookingCalendar.tsx` | Add/update contract and preserve booking security/runtime behavior. |
| `core/widgets/core/appointmentForm.tsx` | Add/update contract and preserve public write protections. |
| `core/widgets/core/productTable.tsx` | Add/update contract and preserve product table runtime behavior. |
| `core/admin/ui/widgets/editors/*Editors.tsx` | Fix mode ownership for in-scope widgets. |
| `tests/vitest/ui/*editor-wave.test.tsx` | Add focused mode ownership tests for touched widgets. |
| `tests/vitest/widgets/*test.tsx` | Add pure widget contract/normalize tests where touched. |

## Implementation Pseudocode

```ts
const p2Widgets = ["content-list", "booking-calendar", "appointment-form", "product-table"] as const;

for (const widgetType of p2Widgets) {
  const definition = getWidgetDefinition(widgetType);
  const report = validateWidgetEditorContract(definition, { requireContract: true });
  if (!report.ok) {
    routeErrorsToWidgetEditorFix(widgetType, report.errors);
  }
}
```

Data flow:

- Start from contract validation output, not manual visual inspection only.
- Fix each widget by moving existing controls to the correct mode or converting
  them to read-only.
- Keep schema/default/normalize ownership in each widget module.
- Use editor UI tests to prove final mode behavior.

Error handling:

- Appointment/public form related widgets must preserve nonce/captcha/rate-limit
  and reject-unknown validation.
- Booking widgets must not expose private availability or integration secrets
  in Advanced diagnostics.
- Product/content widgets must not expose draft/private content in public
  frontend fixtures.

## Security Contract

No API routes are added by default.

- Endpoint visibility: unchanged.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve strict widget and public-write schemas.
- Anti-abuse: preserve existing booking/form nonce, captcha, HMAC/signature, and
  rate-limit protections where applicable.
- Secret handling: no provider secrets, API keys, private availability payloads,
  or draft data in diagnostics, screenshots, or public fixtures.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Focused Vitest UI suites for each touched P2 widget.
- Focused widget/domain suites for each touched P2 widget.
- Existing booking/form security suites if any public-write-adjacent code is
  touched.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for touched P2 widgets.

Regression-test shape:

- Wizard has no visual-only style owners.
- Visual has no hidden technical diagnostics owners.
- Advanced diagnostics are read-only.
- Public-write security behavior remains unchanged.

## Documentation Updates Required

- Update affected per-widget docs.
- Update `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md`.
- Update security docs only if a security contract actually changes.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- All P2 source/style/diagnostic drift from the smoke harness is either fixed or
  explicitly routed to a follow-up task with evidence.
- In-scope widgets have v2 editor contracts and focused tests.
- No security-sensitive widget exposes private runtime details in diagnostics.

