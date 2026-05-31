---
title: "Audit Logs"
audience: "admin"
productArea: "audit"
language: "en"
keywords:
  - audit logs
  - audit
  - event log
  - compliance
  - export csv
---

# Basic

Audit Logs is the traceability surface for reviewing who did what, where, and
when inside the admin workspace. It is where you filter events, inspect a full
event row, open detailed metadata, and export the current audit slice for
compliance or investigation work.

In the current UI, this screen includes:
- `Export CSV`,
- filters for:
  search, date range, event type, severity,
- an audit table with:
  event, actor, resource, IP address, timestamp, status, actions,
- a right-side `Event Details` drawer,
- an export dialog for field selection and file format.

# Medium

Use Audit Logs when you need evidence and traceability rather than assumptions.
The current route is designed for:
- filtering large event history down to a relevant slice,
- reviewing actor and resource context quickly in the table,
- opening one event for deeper metadata and payload inspection,
- exporting the currently filtered view for external review.

This screen is not just a passive log dump. It is an operational investigation
workspace with:
- query-based narrowing,
- category and severity filters,
- row-level details,
- payload inspection,
- structured export.

# Instruction

1. Open `Audit Logs`.
2. Start with the top filters:
   - search field,
   - date range,
   - event type,
   - severity.
3. Use the search field when you know a likely event, actor, or resource path.
4. Narrow by `Event type` when you already know the investigation area:
   - `Authentication`
   - `Content`
   - `System`
5. Narrow by `Severity` when the incident or review is scoped by impact.
6. Review the table columns in order:
   - event and category,
   - actor,
   - resource,
   - IP address,
   - timestamp,
   - status.
7. Open a row when you need more than the summary table gives you.
8. In `Event Details`, review:
   - event title and description,
   - resource label,
   - actor,
   - timestamp,
   - IP address,
   - request ID,
   - severity,
   - event type,
   - JSON payload.
9. Use `Copy JSON` when the raw payload is the important artifact.
10. Use `Share Log` or `Report` when the event needs escalation or handoff.
11. Use `Export CSV` when the current filtered view needs to leave the page.
12. In the export dialog, review:
   - file format,
   - included fields,
   - export filename,
   - reminder that export uses the current filters.
13. Export only after confirming the filter scope is correct.

Use this safe audit-review order when you want fewer false conclusions:
1. Narrow the log set first.
2. Review the summary table.
3. Open the exact event.
4. Inspect metadata and JSON payload.
5. Export only when the slice is already correct.

# Advanced

- The search field is most useful when combined with type and severity filters.
  Treat it as one layer of narrowing, not the only tool.
- Relative timestamps are useful for scanning, but the exact timestamp label in
  the drawer is the real reference when events must be compared precisely.
- `Event Details` matters because the payload and request metadata often carry
  the evidence that the table alone cannot show.
- Export should be treated as a filtered evidence snapshot, not as a substitute
  for narrowing the view properly first.
- Audit Logs helps with both security review and operational debugging; the same
  surface serves more than one kind of investigation.

# Troubleshooting

- The table looks overwhelming:
  start with event type and severity before reading row by row.
- Too many events look similar:
  search by resource path or actor name, then open only the most relevant row.
- The summary row is not enough:
  use `Event Details` and inspect the JSON payload.
- Export feels too broad:
  refine the filters first because export follows the current filtered scope.

# Decision Guide

- Choose table scan vs details drawer:
  use the table for pattern recognition; use the drawer for evidence and exact
  metadata.
- Choose search vs filter selectors:
  use search when you know a specific clue; use selectors when you need to
  narrow by class of event.
- Choose on-screen review vs export:
  keep review in the UI for quick checks; export only when audit evidence needs
  to be shared or archived externally.

# Checklist

1. Confirm the current filters match the investigation scope.
2. Confirm the selected row is the right event.
3. Review metadata and payload before drawing conclusions.
4. Export only after checking the export scope and fields.
5. Treat the audit slice as evidence, not only as a convenience list.

# Security

- Audit Logs is an authenticated admin surface and should only be used by users
  with security, compliance, or operational review permissions appropriate for
  event history access.
- Audit exports can contain sensitive operational metadata, so they should be
  handled as controlled evidence rather than casual downloads.
- JSON payloads may expose more context than the table view, so review and share
  them carefully.
