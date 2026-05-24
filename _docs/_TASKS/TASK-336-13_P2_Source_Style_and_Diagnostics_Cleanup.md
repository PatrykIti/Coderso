# TASK-336-13: P2 Source Style and Diagnostics Cleanup

# FileName: TASK-336-13_P2_Source_Style_and_Diagnostics_Cleanup.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Shared Cleanup
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-336-04, TASK-336-05, TASK-336-06, TASK-336-07, TASK-336-08, TASK-336-09, TASK-336-10, TASK-336-11, TASK-336-12
**Status:** Done (2026-05-24)

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

Scope is limited to the four named widgets. Additional P2 findings from the
TASK-336-03 harness must become new physical leaf tasks rather than being
silently absorbed here.

## Ownership Decision

- Source binding and required first-time setup belong to Wizard.
- Public copy, labels, layout, and surface style belong to Visual.
- Runtime/debug/source summaries in Advanced are read-only unless a field is
  explicitly technical-only.

## Sub-Tasks

- [x] Run the Playwright smoke harness and registry contract report for P2
  widgets before editing.
- [x] Add or update `editorContract` metadata for each in-scope widget.
- [x] Move style/surface controls out of Wizard.
- [x] Move source/setup controls out of Visual unless they are daily content
  authoring controls.
- [x] Convert Advanced diagnostics to read-only summaries.
- [x] Replace local section/control markup with shared primitives where touched.
- [x] Add focused Vitest UI tests for each widget with changed ownership.
- [x] Update the Playwright report with the final P2 status.

## Completion Notes

Done (2026-05-24):

- `content-list`, `booking-calendar`, `appointment-form`, and `product-table`
  now expose strict v2 editor contracts.
- Wizard owns setup/source only for the in-scope widgets; Visual owns daily
  presentation and variant controls; Advanced diagnostics are read-only except
  explicit technical endpoint overrides.
- Visual surface controls for these widgets use swatches/clear actions instead
  of asking nontechnical editors to type CSS variables or design-token strings.
- Appointment phone validation moved from raw regex input to bounded presets.
- Product Table source selection hides raw collection-ID fallback in Wizard and
  uses collection checkboxes when collections are available.
- Booking and appointment runtime endpoint normalization remains same-origin
  relative, with nonce/token diagnostics redacted to presence-only summaries.

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

Validation completed (2026-05-24):

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/server/publicBookingApi.test.ts tests/unit/booking/bookingAccess.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-task-336-13 --widget content-list --output-json _docs/PLAYWRIGHT/widget-contract-smoke-content-list-2026-05-24.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-content-list-2026-05-24.md` (`adminFailures=0`, `publicFailures=0`, `fixtureGaps=1`, `metadataGaps=0`)
- `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-task-336-13 --widget booking-calendar --output-json _docs/PLAYWRIGHT/widget-contract-smoke-booking-calendar-2026-05-24.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-booking-calendar-2026-05-24.md` (`adminFailures=0`, `publicFailures=0`, `fixtureGaps=1`, `metadataGaps=0`)
- `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-task-336-13 --widget appointment-form --output-json _docs/PLAYWRIGHT/widget-contract-smoke-appointment-form-2026-05-24.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-appointment-form-2026-05-24.md` (`adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, `metadataGaps=0`)
- `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-task-336-13 --widget product-table --output-json _docs/PLAYWRIGHT/widget-contract-smoke-product-table-2026-05-24.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-product-table-2026-05-24.md` (`adminFailures=0`, `publicFailures=0`, `fixtureGaps=2`, `metadataGaps=0`)

Regression-test shape:

- Wizard has no visual-only style owners.
- Visual has no hidden technical diagnostics owners.
- Advanced diagnostics are read-only.
- Public-write security behavior remains unchanged.

## Documentation Updates Required

- Update affected per-widget docs.
- Append a dated TASK-336-13 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Update security docs only if a security contract actually changes.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- All P2 source/style/diagnostic drift for the four in-scope widgets is fixed,
  and any additional smoke-harness drift is routed to a new physical follow-up
  task with evidence.
- In-scope widgets have v2 editor contracts and focused tests.
- No security-sensitive widget exposes private runtime details in diagnostics.
