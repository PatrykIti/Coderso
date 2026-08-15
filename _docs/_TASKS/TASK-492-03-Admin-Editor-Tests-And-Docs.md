# TASK-492-03: Admin Editor Wiring, Tests & Docs

# FileName: TASK-492-03-Admin-Editor-Tests-And-Docs.md

**Parent Task:** TASK-492
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-01, TASK-492-02
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** 2026-07-05
**Completed:** `<YYYY-MM-DD>`

## Overview

Make the feature usable end-to-end and lock it down. The TASK-479 reskin already
rendered the recipients input and email/webhook channel toggles on
`core/admin/ui/settings/LoginAlertsPage.tsx` as disabled `data-no-op-control`
placeholders (lines 285/332/368/381). This subtask wires those controls to the
real `loginAlerts` contract through the existing admin client
(`getSecuritySettings` / `updateSecuritySettings` in
`core/admin/services/settingsClient.ts`), surfaces the last `deliveryError`, adds
the cross-cutting security gate assertions (secret/PII never leaks to client
cache or logs), and updates the source-of-truth docs.

## Sub-Tasks

| ID                 | Title                                            | Effort | Status     |
| ------------------ | ------------------------------------------------ | ------ | ---------- |
| TASK-492-03-L01    | Wire recipients/webhook/channel admin controls   | Small  | ⏳ To Do   |
| TASK-492-03-L02    | Security-gate tests + docs (SECURITY/AUTH/CMS_API)| Small  | ⏳ To Do   |

## Dependencies
- Depends on TASK-492-01 (admin client `SecuritySettingsResponse` /
  `SecuritySettingsUpdate` types must carry the new fields) and TASK-492-02
  (so `deliveryError` is produced).
- L02 may run in parallel with L01 but must validate the final committed shape.

## Testing Requirements
- L01: **Vitest** ui-integration extending `tests/vitest/ui/login-alerts.test.tsx`
  (or a new `tests/vitest/ui-integration/login-alerts.test.tsx`) — controls
  enabled, edits captured, save calls `updateSecuritySettings` with the new
  fields, `deliveryError` rendered read-only, no raw `webhookSecret` in DOM.
- L02: **Bun** security gate (`tests/security/codersoSecurityGate.test.ts`) —
  public settings projection and admin redacted cache never include
  `webhookSecret`/raw recipients; docs updated.
