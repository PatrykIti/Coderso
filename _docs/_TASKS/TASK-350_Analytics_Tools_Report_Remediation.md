# TASK-350: Analytics Tools Report Remediation
# FileName: TASK-350_Analytics_Tools_Report_Remediation.md

**Priority:** Medium
**Category:** Admin Tools + Analytics + API + UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-347
**Status:** To Do

---

## Overview

Close every Analytics finding from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_ANALYTICS.md` plus Analytics-specific
Claude UX feedback from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.

The report proves Analytics can load, change date ranges, and surface a real
published page in Top Content. The unresolved contract gaps are:

- Top Content drawer `Export` only closes the drawer.
- Empty analytics data is rendered as `0`/`0%`, which does not distinguish
  "no data yet" from "no change".
- Empty sections do not tell users how to create meaningful analytics.

## Source Findings

| Area | Current evidence | Owner files |
|---|---|---|
| Drawer export | `TopContentDrawer` wires Export to `onOpenChange(false)`; no client call or download exists. | `core/admin/ui/analytics/TopContentDrawer.tsx`, `core/admin/services/analyticsClient.ts`, `core/server/routes/analyticsRoutes.ts` |
| Baseline semantics | `AnalyticsPage.calcChange` returns `0%` or `100%` when previous period is zero. | `core/admin/ui/analytics/AnalyticsPage.tsx`, `core/admin/ui/analytics/KpiCards.tsx` |
| Empty guidance | Top Content empty copy says "No activity for this period" / "No content activity yet" without next action. | `core/admin/ui/analytics/TopContentTable.tsx`, `core/admin/ui/analytics/TopContentDrawer.tsx` |

## Sub-Tasks

- [ ] TASK-350-01: Analytics Export Contract and Download Flow
- [ ] TASK-350-02: Analytics Empty Data Semantics and Guidance
- [ ] TASK-350-03: Analytics QA, Docs, and Closure

## Implementation Order

1. Decide whether export is supported now. If yes, add API/client/download
   behavior; if not, disable/remove the button with truthful copy.
2. Fix no-data/baseline semantics so KPI and Top Content states explain
   absence of analytics data.
3. Close with route/UI tests, Playwright evidence, and report updates.

## Security Contract

Analytics routes remain internal admin read routes:

- Endpoint visibility: internal admin under `/admin/api/analytics*`.
- Auth model: existing session cookie.
- RBAC: `content:read` unless a future export contains privileged data and the
  leaf raises this explicitly.
- CSRF: not required for GET export; required only if a leaf chooses POST.
- Rate-limit bucket: `admin_read` for GET.
- Reject-unknown validation: query params must be strictly validated with
  clamped `rangeDays`, `limit`, and explicit export formats.
- Anti-abuse: no public write; nonce/HMAC/reCAPTCHA not applicable.
- Data handling: export must not include secrets, draft-only payloads, or user
  PII beyond what the current Analytics UI already exposes.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/analytics.test.ts`
- `bun test tests/unit/analytics/analyticsService.test.ts`
- `bun run test:vitest -- tests/vitest/admin/analyticsClient.test.ts tests/vitest/ui/analytics.test.tsx`
- Focused Playwright pass for `/admin/analytics` export/no-data/top-content

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_ANALYTICS.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- Analytics user guide if export/no-data semantics change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Export is either a real download with error/loading states or not presented as
  clickable.
- Empty analytics data is visibly different from zero change.
- Users get a clear next action for empty analytics.
- Top Content with real fixtures still renders and opens the drawer.
