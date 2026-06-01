# TASK-354-01: Admin Tools Empty State and Action Availability Standard
# FileName: TASK-354-01_Admin_Tools_Empty_State_and_Action_Availability_Standard.md

**Priority:** High
**Category:** Admin Tools + UX Consistency + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353
**Status:** To Do

---

## Overview

Create an enforceable standard for Tools empty states and visible actions. The
reports repeatedly found buttons that looked actionable but did nothing, plus
empty states that did not tell users the cause or next step.

This leaf defines the shared rule and applies it to the final Tools state after
per-tool families land.

## Sub-Tasks

- Define a lightweight Tools UX checklist: cause, next action, disabled reason,
  accessible label, controlled payload option, and no-op prohibition.
- Identify repeated empty/action components that can be shared without forcing a
  broad design-system refactor.
- Add tests that fail when known Tools buttons are clickable no-ops.
- Ensure each per-tool implementation maps its local empty states to the shared
  rule.
- Ensure SEO audit checks, Backup include options, and Import / Export include
  options either alter submitted payloads or are disabled/removed as static copy.
- Add report notes that classify intentional unavailable controls separately
  from bugs.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/search/SearchPage.tsx` | Apply standard to Search no-results/category/suggestions after TASK-348. |
| `core/admin/ui/seo/SeoManagerPage.tsx` | Apply standard to pre-scan/empty table/filter button after TASK-349. |
| `core/admin/ui/analytics/AnalyticsPage.tsx` | Apply standard to no-data Analytics after TASK-350. |
| `core/admin/ui/import-export/ImportExportPage.tsx` | Apply standard to Activity Log/export options after TASK-352. |
| `core/admin/ui/redirects/RedirectsTable.tsx` | Apply standard to empty create CTA/pagination after TASK-353. |
| `core/admin/ui/backups/BackupsTable.tsx` | Apply standard to action disabled reasons after TASK-351. |
| `tests/vitest/ui/*` | Add per-screen assertions for no clickable no-op controls and cause-specific empty states. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Record shared standard and per-tool adoption status. |

## Implementation Pseudocode

```ts
type ToolActionState =
  | { kind: "enabled"; label: string; onAction: () => void }
  | { kind: "disabled"; label: string; reason: string };

type ToolEmptyState = {
  cause: "no-data" | "no-match" | "filtered-out" | "not-run" | "unavailable";
  title: string;
  description: string;
  action?: ToolActionState;
};

function assertNoClickableNoop(button: HTMLElement) {
  expect(button).toBeDisabledOrHaveObservableEffect();
}
```

Data flow:

- Each Tools page derives empty/action state from its own data.
- Components render enabled actions only with real handlers and disabled actions
  with visible/accessibility reason.
- Tests click or inspect each known action from the report.

Error handling:

- Do not replace real errors with generic empty states.
- Disabled controls must not call placeholder handlers.
- If a feature is out of scope, state that in UI/docs and keep tests aligned.

Regression-test shape:

- Search `Try:` fallback and no-match states.
- SEO filter button disabled or opens panel.
- SEO audit checkbox toggles affect the audit payload or are unavailable.
- Analytics export disabled or downloads.
- Import / Export Activity Log disabled or opens route/modal.
- Import / Export include checkboxes affect export payload or are unavailable.
- Redirects empty CTA opens create drawer.
- Backups include checkboxes affect create payload or are unavailable.
- Backups disabled actions expose reason.
- Backups pagination is hidden/disabled when unavailable or emits page
  state/API params with observable row changes.

## Security Contract

No route changes are required by the shared standard.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: empty/action state copy must not reveal secret or privileged
  configuration details.

## Testing Requirements

- Relevant per-screen Vitest suites from TASK-348 through TASK-353.
- Focused Playwright pass across all six Tools routes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Tools overview report with shared action/empty-state rule.
- Per-tool reports where adoption changes classification.

## Acceptance Criteria

- No report-listed Tools control remains a clickable no-op.
- No report-listed checkbox group remains uncontrolled payload theater.
- Empty states across Tools name cause and next action.
- Disabled/unavailable controls are accessible and intentional.
