# TASK-360-06: Admin Server-Side Query and Pagination Conventions
# FileName: TASK-360-06_Admin_Server_Side_Query_and_Pagination_Conventions.md

**Priority:** High
**Category:** Admin API + Query Conventions + Pagination + UX Truthfulness
**Estimated Effort:** Large
**Dependencies:** TASK-360
**Status:** To Do

---

## Overview

Define shared query, filter-label, date-range, and pagination conventions for
Admin logs surfaces so Audit Logs and Access Logs do not invent totals, expose
inert page buttons, or label filters inaccurately.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- Area adoption tasks: TASK-357 and TASK-358

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Shared admin query helper/types | Add conventions for strict query schemas, clamped limits, cursor metadata, truthful count copy, and label/source checks. |
| Audit/Access query tests | Consume shared conventions or mirror them through area-specific helpers. |
| Docs | Document fake-total ban, custom range input requirement, and filter-label truthfulness. |

## Implementation Pseudocode

```ts
type AdminQueryField =
  | { kind: "query"; label: "Query"; value: string }
  | { kind: "user"; label: "User"; userId: string }
  | { kind: "role"; label: "Role"; roleId: string }
  | { kind: "dateRange"; label: "Date range"; from: string; to: string };

function assertFilterLabelMatchesSource(field: AdminQueryField) {
  if (field.kind === "role" && field.label !== "Role") {
    throw new Error("admin_filter_label_mismatch");
  }
  if (field.kind === "user" && field.label !== "User") {
    throw new Error("admin_filter_label_mismatch");
  }
}

function buildCursorPageState<TQuery>(query: TQuery, response: CursorResponse) {
  return {
    query,
    rows: response.items,
    nextCursor: response.nextCursor ?? null,
    countCopy: resolveTruthfulCountCopy(response),
  };
}
```

Data flow:

- Surface owns typed filter state with source labels.
- Query serializer rejects label/source mismatches in tests.
- Server validates query params and returns cursor metadata.
- UI renders count copy only from response metadata.
- Custom date range option must expose real date inputs before applying.

Error handling:

- Invalid custom date range blocks submit locally and maps server
  `*_query_invalid` to field errors.
- Invalid/expired cursor resets to first page with non-destructive copy.
- Unknown query params map through centralized `map*Error` helpers.
- Fake totals and static pagination controls are forbidden.

## Security Contract

- Endpoint visibility: conventions apply to internal admin query routes.
- Auth model: authenticated admin session.
- RBAC: route-specific read permission, e.g. `audit:read`.
- CSRF: none for read-only queries.
- Rate-limit bucket: `admin_read`.
- Reject unknown validation: strict schemas, clamped limits, validated
  date/cursor params.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Privacy/redaction: label/query helpers must not expose hidden user PII.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Unit tests for truthful count copy, label/source mismatch, cursor page state,
  and date range validation.
- Area tests in TASK-357/TASK-358 prove conventions are adopted.
- If conventions become release-gated, update gate script/workflow/docs and run
  `bun run gates:coderso`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/CMS_API.md` or admin API conventions docs
- `_docs/CODERSO_RELEASE_GATES.md` if gated
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Audit/Access tasks have a shared convention for strict query and pagination.
- Fake totals/static pagination are explicitly forbidden.
- Filter labels must match their actual data source.
