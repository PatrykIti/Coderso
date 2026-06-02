---
title: "Sessions"
audience: "admin"
productArea: "security"
language: "en"
keywords:
  - sessions
  - active sessions
  - revoke session
  - account security
  - session monitoring
---

# Basic

Sessions is the account-session monitoring surface for seeing where you are
signed in and revoking other active sessions when needed. It is where you
review device context, current-session state, and suspicious access response
actions.

In the current UI, this route includes:
- `Revoke All Other Sessions`,
- local security tabs:
  `General`, `Active Sessions`, `Audit Log`, `Two-Factor Auth`,
- an active-session count badge,
- the sessions table,
- a security response block with quick follow-up actions.

# Medium

Use Sessions when the question is about where your account is still active, not
about broad security policy. The current route is designed for:
- seeing the current session vs other active sessions,
- checking device and rough location context,
- revoking unknown or stale sessions,
- escalating into password/security follow-up when access looks suspicious.

This route is narrower than the main Security Settings page. It is about live
session footprint and response actions, not about global security policy
configuration.

# Instruction

1. Open `Settings > Security > Sessions`.
2. Start with `Revoke All Other Sessions` only if you already know the current
   account should be reset across devices.
3. Review the local security tabs so you understand where you are in the wider
   account-security flow.
4. In `Where you're signed in`, review:
   - device / OS,
   - location,
   - last active,
   - status,
   - revoke action.
5. Identify the `Current session` first.
6. Do not treat the current session the same way as other rows:
   it cannot be revoked from this screen.
7. Review other active rows for:
   - unfamiliar device,
   - unexpected timing,
   - unexpected location context.
8. Use row-level `Revoke` when one session should be removed.
9. Use `Revoke All Other Sessions` when the whole non-current footprint should
   be cleared.
10. Read the security guidance block at the bottom when anything looks
    suspicious.
11. Use `Change Password` when the issue looks account-level, not only
    session-level.
12. Use `Security Settings` when the problem points back to broader policy
    configuration rather than just one active session.

Use this safe session-review order when you want fewer lockout mistakes:
1. Confirm the current session.
2. Review all other active sessions.
3. Revoke specific suspicious sessions first.
4. Use revoke-all only when broader reset is needed.
5. Change password if the risk feels account-wide.

# Advanced

- The distinction between `Current session` and `Active` matters operationally.
  This screen is designed to protect the user from revoking the session they are
  using right now.
- Device and last-active context are the most useful first-pass signals on this
  route, even when detailed geo information is not present.
- `Revoke All Other Sessions` is a strong containment action and should be
  treated as such, not as casual cleanup.
- The local tab strip makes this route part of a wider account-security cluster,
  but its own job is specifically session footprint review.
- The bottom guidance block is not decorative. It tells the user what to do when
  session anomalies imply a deeper account risk.

# Troubleshooting

- You see more active sessions than expected:
  confirm which one is current before revoking anything.
- A session looks unfamiliar:
  revoke it first, then consider changing the password.
- The current session cannot be revoked:
  that is expected in the current UI.
- The issue looks broader than one device:
  use `Revoke All Other Sessions` and then continue into password/security
  follow-up.

# Decision Guide

- Choose row revoke vs revoke all:
  revoke one session when the issue is isolated; revoke all others when trust in
  the whole session footprint is gone.
- Choose session action vs password change:
  use session actions for immediate containment; change the password when the
  risk may involve credential compromise.
- Choose Sessions vs Security Settings:
  use Sessions for active session review; use Security Settings for broader
  policy changes.

# Checklist

1. Confirm which session is current.
2. Review all other active sessions.
3. Revoke only the sessions that should end.
4. Use revoke-all only when the broader reset is intentional.
5. Change password if the session anomaly suggests deeper account risk.

# Navigation And Drafts

- Settings section links use in-app navigation on desktop and mobile.
- Session review itself is read-only until a revoke action is chosen, but
  leaving other dirty Settings screens prompts before a draft is discarded.

# Security

- Sessions is an authenticated admin surface and should only be used by the
  account owner or a high-trust admin with session-management permissions.
- Session revocation is a real containment action and should be treated as such.
- Session details can expose security context about devices and access timing, so
  they should be handled as sensitive account information.
