---
title: "Security Settings"
audience: "admin"
productArea: "security"
language: "en"
keywords:
  - security
  - rate limits
  - sessions
  - login alerts
---

# What Is It

Security Settings cover request security, rate limits, session behavior, login
alerts, bot protection, and related operational safeguards for the admin and
public surfaces.

# When To Use

Use these screens when adjusting policy, troubleshooting blocked requests, or
hardening an environment before production launch.

# Step By Step

1. Review CSRF, request ID, and header policies.
2. Validate rate-limit buckets against real usage expectations.
3. Inspect session, login alert, and bot-protection settings.
4. If needed, use the related security sub-screens for IP allowlists, active
   sessions, and login alert history.

# Examples

- An operations team tightens admin write limits before granting access to more
  users.
- A security review checks whether assistant, public write, and auth buckets
  still match current traffic.
- A support owner investigates unusual login behavior through session and alert
  surfaces.

# Common Mistakes

- Changing one security value without understanding the related bucket or alert
  behavior.
- Using overly strict policies that block legitimate admin workflows.
- Ignoring the difference between visibility, alerting, and enforcement.
