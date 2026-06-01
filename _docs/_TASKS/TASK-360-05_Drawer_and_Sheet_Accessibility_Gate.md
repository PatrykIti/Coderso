# TASK-360-05: Drawer and Sheet Accessibility Gate
# FileName: TASK-360-05_Drawer_and_Sheet_Accessibility_Gate.md

**Priority:** High
**Category:** Admin UI + Accessibility + QA Gates
**Estimated Effort:** Medium
**Dependencies:** TASK-360
**Status:** To Do

---

## Overview

Add a reusable assertion for audited Admin drawers/sheets so opening them does
not produce Radix missing title/description warnings and each dialog has a
valid accessible name/description.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- `core/admin/ui/audit/AuditDetailsDrawer.tsx`
- `core/admin/ui/security/AccessLogDetailsDrawer.tsx`
- Settings drawers for IP allowlist, webhook, email logs, integrations, and
  related shared sheet primitives

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Admin UI a11y test helper | Add console-warning capture and title/description assertion helper. |
| Users/Settings drawer tests | Open audited drawers and assert warning-free semantics. |
| Shared drawer/sheet primitives if needed | Make required title/description pattern easier for callsites. |

## Implementation Pseudocode

```ts
async function expectNoRadixDialogDescriptionWarnings(openDrawer: () => Promise<void>) {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await openDrawer();
  expect(warnings.filter((text) => text.includes("DialogContent"))).toEqual([]);
}
```

Data flow:

- Test opens each audited drawer/sheet through real UI interactions.
- Console warnings are captured during the open path.
- Test asserts no Radix title/description warnings.
- Test also checks accessible name/description when the test runner can inspect
  the dialog role.
- Audited drawer triggers and icon-only open controls expose stable accessible
  names and/or test ids so the warning regression is not locator-fragile.

Error handling:

- Loading, empty, and not-found drawer states still need title/description.
- Visually hidden title/description is acceptable when visible headings already
  exist.
- Warnings from unrelated console sources must be filtered but not swallowed if
  they are dialog accessibility warnings.

## Security Contract

- Endpoint visibility: none unless drawer tests need existing reads.
- Auth model: unchanged; drawer tests use the authenticated admin/restricted
  fixture required by the adopting surface.
- RBAC: unchanged; adopting drawer reads must keep their route-level
  permissions.
- CSRF/rate-limit: unchanged.
- Reject unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: accessible titles/descriptions must use redacted labels and
  never include raw tokens, cookies, API keys, or secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest or Playwright a11y assertions for mobile user details, Audit details,
  Access Log details, IP allowlist, webhook, email logs, integrations, and
  touched shared drawers.
- Console-warning regression proves Radix dialog warnings are gone.
- Area tests from TASK-355-05 and TASK-359-06 consume this helper.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- Admin UI accessibility contributor docs if present
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Audited Admin drawers open without Radix title/description warnings.
- Each drawer has an accessible title and description in all states.
- Shared helper is available to future drawer tests.
