# TASK-330: Tabs Shared Accessibility Residuals After TASK-256

# FileName: TASK-330_Tabs_Shared_Accessibility_Residuals_After_TASK-256.md

**Priority:** High
**Category:** Widgets + Accessibility + Shared Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-256-04, TASK-256-05-04, TASK-288
**Status:** To Do

---

## Overview

Close the shared Tabs accessibility residuals rediscovered during the TASK-288
audit after the TASK-256 family was already marked `Done`.

Current branch evidence shows that `core/widgets/core/tabs.tsx` still renders a
`role="tablist"` without an accessible name and `role="tabpanel"` without
`tabIndex="0"`, even though the historical TASK-256 contract claimed the shared
interactive accessibility adoption was complete.

This task exists so TASK-288 does not silently patch a shared contract drift
inside a widget-local product family.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:74-75,103-107,287`
- `_docs/_TASKS/TASK-256-04_Interactive_Runtime_Instance_and_Accessibility_Contract.md:15-21,177-183`
- `_docs/_TASKS/TASK-256-05-04_Tabs_Accordion_and_Toggle_Block_Structural_Residuals.md:15-23,167-170`
- `core/widgets/core/tabs.tsx` currently renders `role="tablist"` without
  `aria-label` and `role="tabpanel"` without `tabIndex`.

## Scope Boundary

This task owns only the shared interactive accessibility residual for Tabs:

- stable accessible naming for the Tabs tablist;
- keyboard reachability for tabpanels that may otherwise contain only static
  content;
- regression coverage and report/task evidence proving the shared contract is
  actually adopted on the branch.

This task does not own:

- admin preview activation, runtime script de-duplication, or React preview
  state (`TASK-288-03`);
- Tabs product fields such as icon metadata, disabled tabs, layout, motion, or
  visual/editor IA (`TASK-288-*`);
- any new API route or user-configurable accessibility field.

## Sub-Tasks

- [ ] Add a deterministic accessible name to the Tabs `role="tablist"` output
  without introducing a new widget data field.
- [ ] Add `tabIndex="0"` to `role="tabpanel"` so a text-only panel remains
  keyboard reachable.
- [ ] Update Tabs widget Vitest coverage for the shared ARIA contract.
- [ ] Update the Tabs Playwright report and task routing so shared rows no
  longer point at the closed TASK-256 family.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/tabs.tsx` | Add the shared tablist accessible name and tabpanel `tabIndex` adoption. |
| `tests/vitest/widgets/tabs.test.tsx` | Add or refresh SSR assertions for the shared ARIA contract. |
| `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` | Route shared accessibility rows to TASK-328 with final fixed/deferred evidence once the code lands. |
| `_docs/_WIDGETS/TABS.md` | Document the shared accessibility contract after implementation. |
| `_docs/_TASKS/TASK-288*.md` | Keep TASK-288 routing aligned with the extracted shared task. |

## Implementation Pseudocode

```tsx
const defaultTablistLabel = "Content tabs";

function renderTabsTablist(orientation: TabsOrientation) {
  return (
    <div
      role="tablist"
      aria-label={defaultTablistLabel}
      aria-orientation={orientation}
    >
      {/* triggers */}
    </div>
  );
}

function renderTabsPanel(panel: ResolvedTabPanel, isActive: boolean, triggerId: string) {
  return (
    <div
      role="tabpanel"
      tabIndex={0}
      aria-labelledby={triggerId}
      hidden={!isActive}
    >
      {/* panel body */}
    </div>
  );
}
```

Error handling:

- The accessible name must be deterministic and source-controlled; do not depend
  on user-authored HTML or raw runtime diagnostics.
- `tabIndex="0"` must not make inactive panels reachable while `hidden=true`.
- Tests must cover both public SSR output and any widget-preview render path
  that shares the same renderer.

## Regression Test Shape

- `tests/vitest/widgets/tabs.test.tsx`: assert `role="tablist"` exposes the
  shared accessible name and active tabpanels render `tabIndex="0"` while
  inactive ones remain hidden.
- Re-read the Tabs report/task routing to ensure shared accessibility rows no
  longer point at the closed TASK-256 family.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged because no widget data shape changes.
- Anti-abuse: no new script content, HTML injection, or user-authored DOM IDs.
- Secret handling: no secrets in ARIA labels, DOM markers, diagnostics, or
  report notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md`.
- Update `_docs/_WIDGETS/TABS.md`.
- Update `_docs/_TASKS/README.md` if task status changes.

## Changelog Policy

- Covered by the final changelog entry only after implementation lands and the
  report/task routing is synchronized.

## Acceptance Criteria

- Tabs tablists expose a deterministic accessible name in shared renderer
  output.
- Tabs tabpanels are keyboard reachable when active, even if they only contain
  static text.
- Tabs shared accessibility rows are no longer incorrectly routed to the closed
  TASK-256 family.
