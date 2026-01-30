# TASK-020-09: Security Settings UI Wiring
# FileName: TASK-020-09_Security_Settings_UI_Wiring.md

**Priority:** High
**Category:** Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-020-02, TASK-006-18, TASK-006-36
**Status:** To Do

---

## Overview

Wire Admin UI security screens to real security settings API. All request-pipeline protections must be configurable from the dashboard.

## Goals

- Read/write security settings via `/settings/security`.
- Keep UI consistent with existing Settings shell and sections.
- Apply changes without server restart.

## UI Scope

- Extend **Settings → Security** to include:
  - Request ID toggle + header name.
  - CSRF toggle + token TTL + header name.
  - CORS allowlist + allow credentials + allowed headers/methods.
  - Rate limit toggles for auth/admin buckets.
  - Security headers toggles + CSP/HSTS fields.
  - Input validation strictness toggle.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/settingsClient.ts` | `getSecuritySettings`, `updateSecuritySettings` |
| `core/admin/ui/settings/SecuritySettingsPage.tsx` | Load/save security settings, bind form state |
| `core/admin/ui/settings/IpAllowlistTable.tsx` | Keep existing; no changes required |
| `core/admin/ui/settings/SecurityPolicyCard.tsx` | Reuse for new sections |
| `core/admin/ui/settings/*` | Add small helper components for chips / list inputs |

### UX notes

- Show "Applied instantly" message (no restart required).
- Validate numeric inputs (min/max) client-side.
- For list inputs (origins/headers), use chips or newline-separated textarea.
- Prevent saving when unchanged.

## Testing Requirements

- [ ] `tests/integration/ui/security-settings.test.tsx` loads settings into UI.
- [ ] `tests/integration/ui/security-settings.test.tsx` sends PATCH on save.
- [ ] `tests/unit/ui/settingsInput.test.tsx` list parsing helper works.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add admin UI settings section.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-settings-ui.md`
