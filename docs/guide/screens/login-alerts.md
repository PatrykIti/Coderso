---
title: "Login Alerts"
audience: "admin"
productArea: "security"
language: "en"
keywords:
  - login alerts
  - suspicious login
  - brute force protection
  - security notifications
  - notification channels
---

# Basic

Login Alerts is the notification-policy surface for suspicious sign-in activity.
It is where you decide whether security alerts are enabled, what should trigger
them, who receives them, and which channels should be used.

In the current UI, this route includes:
- top actions:
  `Discard`, `Save changes`
- local security tabs:
  `General`, `Active Sessions`, `Login Alerts`, `Audit Log`, `Two-Factor Auth`
- alert toggles,
- a disabled brute-force threshold card,
- disabled recipients settings,
- disabled notification channels.

# Medium

Use Login Alerts when the question is about who should be notified about unusual
sign-in behavior and how sensitive that alerting should be. The current route is
designed for:
- enabling or disabling suspicious-login alerts,
- deciding whether new device and new location changes matter,
- setting a failed-attempts threshold,
- choosing recipients and channels for the notifications.

This route is about security visibility and response, not about broad access
policy. It complements sessions and main security settings instead of replacing
them.

# Instruction

1. Open `Settings > Security > Login Alerts`.
2. Start with the page status and top actions:
   - `Discard`
   - `Save changes`
3. Review the local tab strip so you understand this route’s place in the wider
   account-security flow.
4. In `Suspicious Login Alerts`, decide whether alerting should be enabled at
   all.
5. Review the two main triggers:
   - `Alert on new device`
   - `Alert on new location`
6. The local tab strip is read-only outside `Login Alerts`; the other tab labels
   are disabled placeholders.
7. Move to `Brute Force Protection`.
8. Review the failed-attempts threshold and its lockout behavior. In the current
   UI this slider is disabled until persistence is wired.
9. Treat the threshold as a balance between security and false positives, not as
   a decorative slider.
10. Move to `Recipients`.
11. Review:
    - `Admin-only alerts`
    - `Custom Email List`
12. These recipient controls are disabled in the current UI until persistence is
    wired.
13. Move to `Notification Channels`.
14. Review which channels should be active:
    - `Email`
    - `Webhook`
15. These channel controls are disabled in the current UI until persistence is
    wired.
16. Use `Save changes` only after the supported alert toggles are coherent
    together.
17. Use `Discard` when the draft alert policy should not be kept.

Use this safe alert-policy order when you want fewer noisy or weak alerts:
1. Confirm alerting is enabled intentionally.
2. Confirm the right triggers are on.
3. Confirm the brute-force threshold is appropriate.
4. Confirm recipients are correct.
5. Confirm channels are correct.
6. Save deliberately.

# Advanced

- New-device and new-location alerts solve slightly different trust problems, so
  they should not automatically be treated as one toggle mentally.
- Brute-force threshold tuning is a security/usability trade-off. Too low can
  create false positives; too high weakens the warning value.
- Recipient design matters as much as trigger design. Alert quality drops when
  the wrong people receive too many messages.
- The route’s unsaved-changes notice is important because this screen controls
  security signaling, not just UI preference.
- Webhook support means the route can feed broader incident tooling, not only
  email inboxes, once the disabled channel controls are wired.

# Troubleshooting

- Alerts feel noisy:
  review trigger toggles and the brute-force threshold together.
- Real alerts are going to the wrong people:
  custom recipient persistence is unavailable in the current UI, so keep
  admin-only supported settings clear and defer custom lists until wired.
- The policy is unclear after editing:
  use `Discard` before saving a half-decided configuration.
- The route looks related to sessions:
  that is expected. Sessions tells you where access exists; Login Alerts decides
  how suspicious access should be reported.

# Decision Guide

- Choose admin-only vs broader recipients:
  keep admin-only when the alert should stay tightly scoped; add custom emails
  only when the security response team really needs them.
- Choose email vs webhook:
  use email for direct human notification; use webhook when alerts should enter a
  wider automation or incident pipeline.
- Choose strict vs lighter threshold:
  tighten the threshold for higher-risk environments; relax only when false
  positives are clearly hurting legitimate use.

# Checklist

1. Confirm suspicious-login alerts should be enabled.
2. Confirm the right triggers are active.
3. Confirm the brute-force threshold is intentional.
4. Confirm recipients and channels are correct.
5. Save changes deliberately.

# Security

- Login Alerts is an authenticated admin surface and should only be used by
  high-trust administrators responsible for security signaling.
- Recipient lists and webhook channels define where security evidence goes, so
  they should be treated as operationally sensitive configuration.
- Weak alerting can hide compromise signals; overly noisy alerting can train the
  team to ignore real problems.
