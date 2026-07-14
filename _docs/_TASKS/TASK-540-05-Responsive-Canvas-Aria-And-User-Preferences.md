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

Remove unconditional 300 px Screen-canvas clearance at narrow widths while
preserving the scroller's existing `p-6 lg:p-8` gutters, give the shared labelled
panel a valid landmark role, and move Screen entry preferences from a global
localStorage key to the existing authenticated per-user settings service without
a migration or new endpoint. The existing central HTTP error boundary must map
the user-settings service's two machine-readable validation errors to deterministic
400 responses instead of the generic 500 fallback.

## Leaves and order

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-05-L01 | Keep Screen canvas usable and ARIA-valid | `ScreenAuthoringCanvas.tsx`, `CanvasEditor.tsx` | ⏳ To Do |
| TASK-540-05-L02 | Scope Screen preferences through user settings | exact Bun-free preference contract + user-settings service/client + Screen hook + narrow central HTTP error mapping | ⏳ To Do |

## Security Contract

Canvas changes are local UI only. Preference reads/writes reuse existing internal
`/admin/api/user-settings*` routes: the authenticated session supplies the sole
`userId`, PATCH retains CSRF and the `admin_write` rate-limit bucket, and validation
keeps the strict `{value}` envelope. `user_settings_key_invalid` and
`user_settings_value_invalid` preserve those exact response codes and map to HTTP
400 at the central boundary. Preference data is a non-secret boolean/version
record. No public write, RBAC widening, nonce/captcha, localStorage content, or
migration is added.

## Acceptance

- At 320/390/480 px the scroller keeps `24px` left/right padding whether the
  panel is open or closed, the open panel remains inside the viewport, and the
  canvas has non-zero usable content geometry.
- At 1024 px and wider the closed right padding is `32px`; the open class is
  `lg:pr-[332px]`, so the border-box stays fixed and the content box loses
  exactly `300px` (within 1 CSS px) when the panel opens.
- The panel's accessible name is attached to `role="region"`.
- Preference state follows the authenticated server user; switching users cannot
  inherit another user's flag. Returning to the same user in one mounted session
  may reuse only that user's keyed in-memory value while authoritative revalidation
  runs. An unchanged per-user write generation lets that read replace stale same-user
  optimism; a local toggle made after the read began increments the generation and
  wins over the delayed response. Unauthenticated/unavailable service falls back to
  in-memory defaults for the session and writes no global browser key.
- Real HTTP tests prove session-derived self-scope, strict envelope rejection,
  PATCH CSRF, `admin_write` bucket selection, and deterministic 400 mapping for
  both user-settings validation codes.
