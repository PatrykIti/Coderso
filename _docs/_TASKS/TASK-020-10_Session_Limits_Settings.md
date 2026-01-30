# TASK-020-10: Session Limits in Security Settings
# FileName: TASK-020-10_Session_Limits_Settings.md

**Priority:** High  
**Category:** Core/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020-01, TASK-020-02, TASK-020-09, TASK-004  
**Status:** Done (2026-01-30)

---

## Overview

Move session TTL and session concurrency limits into **Security Settings** so they are fully configurable from the Admin UI.

Defaults requested:
- `session.ttlDays = 7`
- `session.maxPerUser = 3`
- `session.singleSession = false`

## Goals

- Allow admins to control session TTL and concurrency without restarts.
- Enforce max sessions per user (and optional single-session mode).
- Keep behavior consistent with existing auth routes.

## API Surface

Extend `/settings/security` with:

```json
{
  "session": {
    "ttlDays": 7,
    "maxPerUser": 3,
    "singleSession": false
  }
}
```

Rules:
- `ttlDays` must be >= 1
- `maxPerUser` must be >= 1 (use 0/null to disable limit if we decide later)
- `singleSession = true` overrides `maxPerUser`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/settings/securitySettings.ts` | Add `session` section (defaults + merge/validation) |
| `core/server/validation/settingsSchemas.ts` | Add schema for `session.ttlDays`, `session.maxPerUser`, `session.singleSession` |
| `core/services/auth/sessionService.ts` | Read session policy from security settings; enforce TTL and limits |
| `core/server/routes/authRoutes.ts` | Use new TTL from settings (via sessionService) |
| `core/admin/services/settingsClient.ts` | Extend types for `session` |
| `core/admin/ui/settings/SecuritySettingsPage.tsx` | Add “Session Limits” card with fields |
| `core/admin/ui/settings/securitySettingsUtils.ts` | Reuse numeric parsing helpers |

### Enforcement logic

Add a helper in `sessionService.ts`:

- Load security settings once per `createSession`.
- If `singleSession` → `revokeAllSessions(userId)` before creating a new one.
- Else enforce `maxPerUser`:
  - Count active sessions (`revokedAt IS NULL` and `expiresAt > now`).
  - If `count >= maxPerUser`, revoke the **oldest** sessions to make room (order by `createdAt ASC`).

### TTL logic

Replace constant TTL with settings-driven value:

```ts
const ttlDays = input.ttlDays ?? settings.session.ttlDays;
```

Keep `DEFAULT_SESSION_TTL_DAYS` only as fallback if settings are unavailable.

## UI Scope

In **Settings → Security**, add a “Session Limits” card:
- **Session TTL (days)** (number input)
- **Max sessions per user** (number input)
- **Single session mode** (switch)

UX notes:
- Display “Single session overrides max per user.”
- Validation: show inline errors for invalid numbers.

## Testing Requirements

- `tests/unit/auth/sessionService.test.ts`
  - Creates session using settings TTL.
  - Enforces max per user by revoking oldest sessions.
  - Single session mode revokes previous sessions.
- `tests/unit/security/securitySettings.test.ts`
  - `session` defaults and validation.
- `tests/unit/ui/security-settings.test.tsx`
  - Renders Session Limits card.
- `tests/integration/routes/securitySettings.test.ts`
  - Accepts `session` fields on PATCH.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add session limits section.
- `_docs/CMS_API.md` include `session` fields in security settings payload.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-session-limits-settings.md`
