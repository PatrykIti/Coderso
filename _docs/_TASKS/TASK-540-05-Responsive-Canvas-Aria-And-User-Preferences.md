# TASK-540-05: Responsive Canvas, ARIA, and User Preferences

# FileName: TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md

**Parent Task:** TASK-540
**Priority:** Medium
**Category:** Custom Screens / Responsive UI / Accessibility / User Settings
**Estimated Effort:** Medium
**Dependencies:** TASK-540-04
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Remove unconditional 300 px Screen-canvas clearance at narrow widths, give the
shared labelled panel a valid landmark role, and move Screen entry preferences
from a global localStorage key to the existing authenticated per-user settings
service without a migration or endpoint.

## Leaves and order

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-05-L01 | Keep Screen canvas usable and ARIA-valid | `ScreenAuthoringCanvas.tsx`, `CanvasEditor.tsx` | ⏳ To Do |
| TASK-540-05-L02 | Scope Screen preferences through user settings | exact Bun-free preference contract + user-settings service/client + Screen hook | ⏳ To Do |

## Security Contract

Canvas changes are local UI only. Preference reads/writes reuse existing internal
`/admin/api/user-settings*` routes: authenticated session owner, self-scoped
`userId`, PATCH CSRF, existing admin rate limit, and strict `{value}` envelope.
Preference data is a non-secret boolean/version record. No public write, RBAC
widening, nonce/captcha, localStorage content, or migration is added.

## Acceptance

- At 320/390/480 px an open right panel fits its viewport and the canvas remains
  usable; 300 px clearance appears only where the viewport can accommodate it.
- The panel's accessible name is attached to `role="region"`.
- Preference state follows the authenticated server user; switching users cannot
  inherit another user's flag. Unauthenticated/unavailable service falls back to
  in-memory defaults for the session and writes no global browser key.
