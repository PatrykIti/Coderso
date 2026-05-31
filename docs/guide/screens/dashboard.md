---
title: "Dashboard"
audience: "admin"
productArea: "dashboard"
language: "en"
keywords:
  - dashboard
  - health
  - overview
  - status
---

# Basic

Dashboard is the operational overview for the admin workspace. It is where you
check high-level counts, scan recent edits, review site health, and spot
security issues before jumping into specialist screens.

In the current UI, this screen includes:
- a `Refresh` action,
- stat cards:
  `Pages`, `Entries`, `Storage Used`,
- `Recent Edits`,
- `Site Health`,
- `Security Status`.

Use Dashboard at the start of a work session, after a deployment, or when you
need a quick answer to the question, "What changed and what needs action?"

# Medium

The current route is more than a welcome page. It is a triage surface that
helps you answer:
- how big the current content footprint is,
- what changed recently,
- whether site health looks normal,
- whether security checks still pass.

The dashboard is strongest when used as:
- a first-look operational summary,
- a release/post-change confidence check,
- a navigation aid into the next specific admin surface.

# Instruction

1. Open `Dashboard`.
2. Start with the stat cards:
   - `Pages`
   - `Entries`
   - `Storage Used`
3. Treat the cards as summary signals, not as the final investigation surface.
4. Move to `Recent Edits`.
5. Review each row for:
   - document,
   - author,
   - status,
   - last edited.
6. Use `Recent Edits` to decide whether the next stop should be Pages, Media,
   Posts, or another specialist area.
7. Move to `Site Health`.
8. Review:
   - storage usage,
   - security checks passing state.
9. Move to `Security Status`.
10. Review the detailed checks currently visible in the UI:
    - CSRF protection
    - rate limiting
    - security headers
    - session policy
11. Use `Refresh` after meaningful system or content changes when you want a new
    overview snapshot.
12. Treat Dashboard as the place to decide where to go next, not as the place to
    perform deep edits.

Use this safe dashboard-reading order when you want faster triage:
1. Stat cards first.
2. Recent edits second.
3. Health and security third.
4. Only then jump into a specialist route.

# Advanced

- `Storage Used` is especially useful when it includes a note like `No quota
  configured`, because it tells you not just the size but also the current limit
  posture.
- `Recent Edits` is a real cross-surface signal. It may include pages, posts, or
  media-style items and helps explain why another part of the system changed.
- `Site Health` and `Security Status` overlap intentionally: one is the broader
  health signal, the other is the more explicit security breakdown.
- `Refresh` should be treated as a post-change verification tool, not as random
  clicking.
- Dashboard is not a full reporting suite. Its strength is fast operational
  orientation.

# Troubleshooting

- Something feels wrong but you do not know where to start:
  use Dashboard first before diving into one specialist screen.
- The content totals look fine but behavior still feels off:
  inspect `Recent Edits` and `Security Status` before assuming the issue is in
  content only.
- Storage looks odd:
  read both the value and its context, especially when quota notes are present.
- A security issue is suspected:
  use `Security Status` as the quick signal, then move into Audit Logs, Access
  Logs, or Security Settings for the deeper follow-up.

# Decision Guide

- Choose Dashboard vs a specialist screen:
  use Dashboard for triage; use a specialist screen when you already know the
  exact area that needs work.
- Choose `Refresh` vs static reading:
  refresh after deployments or major edits; static reading is enough for quick
  orientation during stable periods.
- Choose Recent Edits vs Security Status as your next clue:
  use Recent Edits for content/change context; use Security Status for policy or
  hardening context.

# Checklist

1. Review the summary cards.
2. Review recent edits.
3. Review site health.
4. Review security status.
5. Decide the next specialist screen intentionally.

# Security

- Dashboard is an authenticated admin surface and should only be used by users
  with admin workspace access.
- It surfaces condensed operational and security signals, so it should be read
  as a summary layer rather than exported or quoted without context.
- When a security signal looks wrong on Dashboard, treat it as a prompt for
  deeper investigation, not as the final evidence by itself.
