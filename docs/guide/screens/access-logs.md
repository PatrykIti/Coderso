---
title: "Access Logs"
audience: "admin"
productArea: "security"
language: "en"
keywords:
  - access logs
  - login monitoring
  - security events
  - session review
  - export csv
---

# Basic

Access Logs is the session-activity surface for reviewing authentication and
request access patterns across the admin workspace. It is where you filter login
and request records, inspect one access event in detail, and export the current
slice for security review.

In the current UI, this screen includes:
- `Export`,
- filters for:
  user ID, date range, status, and search,
- a table with:
  user, IP address, device/browser, timestamp, status, actions,
- cursor-backed Previous/Next navigation,
- a right-side `Access Log Details` drawer,
- per-row session state with session detail/revoke actions when the linked
  session is active and permissions allow it,
- an export dialog scoped to the current filters, with CSV/JSON format and
  allowlisted fields.

# Medium

Use Access Logs when the question is about who accessed the system, from what
device, at what time, and with what outcome. The current route is designed for:
- filtering recent access activity quickly,
- separating success and failure patterns,
- moving through large result sets with cursor-backed navigation,
- inspecting one access event in more detail,
- exporting the current slice for operational or security follow-up.

This is not a general audit surface. It is focused on access/session-style
events and their operational security context.

# Instruction

1. Open `Access Logs`.
2. Start with the filter row at the top.
3. Use the search field when you already know a likely user or IP clue.
4. Use `User ID` only when you know the exact actor/user id to filter.
5. Use the date-range selector to keep the review inside the right incident
   window. Choose `Custom range` when you need exact start and end dates.
6. Use the status selector to separate:
   - `Success`
   - `Failed`
7. Use `Next` and `Previous` when the current filter scope has more rows than
   the loaded page. Changing search, user ID, date range, or status starts from
   the first page again.
8. Review the table columns in order:
   - user,
   - IP address,
   - device / browser,
   - timestamp,
   - status.
9. Open the row action to inspect one event more deeply.
10. In `Access Log Details`, review:
   - user identity,
   - status code,
   - IP address,
   - device,
   - timestamp,
   - request,
   - duration,
   - location & risk signal,
   - session state.
11. Use `View full session` only when the row shows an active/current linked
    session and your account has session settings access. The target opens
    `Security Sessions` focused on that session, including another user's
    active session when your permissions allow it.
12. Use `Revoke access` only when the row shows an active linked session and
    your account has the required high-risk settings write permission. Confirm
    the destructive action before revoking.
13. Use `Export` only after the current filters match the right scope.
14. In the export dialog, review:
   - file format,
   - included fields,
   - filename,
   - reminder that export follows the current filters.
15. Start the export. The downloaded CSV or JSON file contains only the selected
    allowlisted fields from the current filtered slice.

Use this safe access-review order when you want fewer wrong conclusions:
1. Narrow the time window.
2. Filter by user or status.
3. Read the table.
4. Open the exact access event.
5. Export only after the scope is already correct.

# Advanced

- Access Logs is strongest when used as a session and authentication review
  surface, not as a replacement for broader audit history.
- Device labels are a practical signal in this page because they help separate
  expected admin usage from suspicious access patterns.
- `Location & risk` is guidance, not a final verdict. It should inform review,
  not replace it.
- Export should be treated as a filtered evidence snapshot rather than a default
  first step.
- Export supports CSV and JSON. CSV escapes spreadsheet formula prefixes and
  quoted values; JSON includes export metadata, selected columns, sanitized
  filter summary, row count, and redacted rows.
- Count copy describes loaded rows and cursor availability. It should not be
  read as an exact total unless the UI explicitly shows response-provided total
  metadata.
- Search results can show match labels such as `Matched user email` when the
  query matched a field that is not otherwise obvious in the row.
- Session action availability is row-specific. Historical rows, failed attempts
  without a session, expired sessions, already-revoked sessions, and the current
  admin session show unavailable copy instead of firing a hidden request.
- Successful and failed access events both matter. Repeated failures can be as
  important as a successful login from the wrong context.

# Troubleshooting

- There are too many access events:
  start with date range and status before scanning row by row.
- A user looks suspicious but the table is still noisy:
  combine the search field with a date range, status, or exact user ID.
- A custom range fails:
  confirm both start and end dates are present and that the start date is not
  after the end date.
- One event looks odd:
  open `Access Log Details` and review request, duration, device, and session
  state before escalating.
- `View full session` is disabled:
  confirm the row has an active linked session and that your account can read
  security session settings.
- `Revoke access` is disabled:
  confirm the linked session is active, is not your current session, and that
  your account has the required settings write permission.
- Export feels too broad:
  refine the filters first because the export uses the current filtered view.
- An export is rejected:
  reduce the requested row limit, remove unsupported fields, or confirm your
  account still has access-log review permission.

# Decision Guide

- Choose table scan vs details drawer:
  use the table for pattern recognition; use the drawer for one-event analysis.
- Choose success vs failed filter:
  use success when validating actual access; use failed when investigating
  attempted or blocked access patterns.
- Choose on-screen review vs export:
  keep review on-screen for quick triage; export when the access slice must be
  shared or archived.

# Checklist

1. Confirm the current filters match the access-review scope.
2. Confirm the selected row is the right event.
3. Review device, request, and timestamp before making a judgment.
4. Export only after checking the export scope and included fields.
5. Treat the selected slice as security evidence, not just a convenience list.

# Security

- Access Logs is an authenticated admin surface and should only be used by users
  with security or high-trust review permissions.
- Access-log exports can contain sensitive user and infrastructure context, so
  they should be handled as controlled security artifacts.
- Exports redact cookies, authorization headers, CSRF/reset/session tokens, API
  keys, passwords, and secret-like values from request-oriented fields before
  the file is returned.
- `Revoke access` is a real security action and should be used with deliberate
  operational intent. It requires a stronger permission than `audit:read` and
  is protected by CSRF plus a confirmation step.
