# TASK-149: Security Settings Admin UI Assistant Documentation Refresh
# FileName: TASK-149_Security_Settings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Security Settings surface
based on a real authenticated walkthrough of the local admin UI. The goal is to
replace the old generic security summary with guidance that matches the shipped
section-based policy screen on `/admin/settings/security`.

## Scope

1. Review the current Security Settings assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/security`
   with an authenticated session and record actual behavior.
3. Rewrite `docs/screens/security-settings.md` using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the section navigation flow:
   - auth protection,
   - rate limits,
   - CSRF,
   - CORS,
   - security headers,
   - sessions,
   - IP allowlist.
2. Capture the current policy cards and toggles:
   - bot protection,
   - login throttle,
   - password safety,
   - preset-driven rate limits,
   - session and login-alert controls,
   - header/CORS/CSRF controls.
3. Capture the save/autosave behavior and inline error/success messaging.
4. Rewrite the doc without pretending the route is only a high-level policy
   summary; it is a detailed operational hardening screen.

## Acceptance Criteria

1. Security Settings describes the current shipped UI rather than the old
   generic security summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about section navigation, policy controls, rate-limit
   presets, sessions, and save behavior.
4. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Security Settings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/security-settings.md`
- `_docs/_TASKS/TASK-149_Security_Settings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Security
  Settings UI on `/admin/settings/security`.
- The walkthrough confirmed:
  - section rail navigation,
  - auth protection section,
  - rate limits presets and buckets,
  - CSRF section,
  - CORS section,
  - security headers section,
  - sessions section,
  - inline IP allowlist section.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/SecuritySettingsPage.tsx`
  - `core/admin/ui/settings/SecurityPolicyCard.tsx`
  - `core/admin/ui/settings/LoginAlertsCard.tsx`
  - `core/admin/services/settingsClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
