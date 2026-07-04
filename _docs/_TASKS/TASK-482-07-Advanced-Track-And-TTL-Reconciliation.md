# TASK-482-07: Advanced track steps + session-TTL reconciliation
# FileName: TASK-482-07-Advanced-Track-And-TTL-Reconciliation.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-04
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

The optional Advanced track surfaces email, storage, security, and assistant
configuration inside the wizard by adapting the **existing** dedicated settings
endpoints — it does not re-implement their validation or storage. It also
reconciles the long-standing duplicate session-TTL sources
(`auth.sessionTtlDays` vs `security.session.ttlDays`) so the wizard writes one
canonical value and the precedence is explicit.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-07-L01 | Advanced step adapters over email/storage/security/assistant | Large | ⏳ To Do |
| TASK-482-07-L02 | Session-TTL reconciliation (single canonical source + precedence) | Medium | ⏳ To Do |

## Dependencies

- TASK-482-04 (step framework). Reuses the existing settings routes/services for
  email (`/settings/email`), storage (`/settings/storage`), security
  (`/settings/security`), and assistant.

## Testing Requirements

- L01: Vitest ui-integration for the adapter steps + a Bun route-integration
  smoke that the wizard's writes hit the existing endpoints with secret redaction
  intact.
- L02: Vitest service lane asserting `resolveSessionTtlDaysFromSources`
  precedence and that the wizard writes a single canonical TTL.
