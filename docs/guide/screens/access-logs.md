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
- `Export CSV`,
- filters for:
  user, date range, status, and search,
- a table with:
  user, IP address, device/browser, timestamp, status, actions,
- a right-side `Access Log Details` drawer,
- an export dialog scoped to the current filters.

# Medium

Use Access Logs when the question is about who accessed the system, from what
device, at what time, and with what outcome. The current route is designed for:
- filtering recent access activity quickly,
- separating success and failure patterns,
- inspecting one access event in more detail,
- exporting the current slice for operational or security follow-up.

This is not a general audit surface. It is focused on access/session-style
events and their operational security context.

# Instruction

1. Open `Access Logs`.
2. Start with the filter row at the top.
3. Use the search field when you already know a likely user or IP clue.
4. Use `All users` to narrow by role when needed.
5. Use the date-range selector to keep the review inside the right incident
   window.
6. Use the status selector to separate:
   - `Success`
   - `Failed`
7. Review the table columns in order:
   - user,
   - IP address,
   - device / browser,
   - timestamp,
   - status.
8. Open the row action to inspect one event more deeply.
9. In `Access Log Details`, review:
   - user identity,
   - status code,
   - IP address,
   - device,
   - timestamp,
   - request,
   - duration,
   - location & risk signal.
10. Use `View full session` when one event is not enough context.
11. Use `Revoke access` when the security response requires it.
12. Use `Export CSV` only after the current filters match the right scope.
13. In the export dialog, review:
   - file format,
   - included fields,
   - filename,
   - reminder that export follows the current filters.

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
- Successful and failed access events both matter. Repeated failures can be as
  important as a successful login from the wrong context.

# Troubleshooting

- There are too many access events:
  start with date range and status before scanning row by row.
- A user looks suspicious but the table is still noisy:
  combine the search field with the role/user filter.
- One event looks odd:
  open `Access Log Details` and review request, duration, and device before
  escalating.
- Export feels too broad:
  refine the filters first because the export uses the current filtered view.

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
- `Revoke access` is a real security action and should be used with deliberate
  operational intent.
