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

# Basic

Security Settings is the policy hub for protecting the admin and public
surfaces. It is where you configure sign-in protection, rate limits, CSRF, CORS,
security headers, session behavior, login alerts, and the inline admin IP
allowlist.

In the current UI, this screen includes:
- a security section rail:
  `Auth protection`, `Rate limits`, `CSRF`, `CORS`, `Security headers`,
  `Sessions`, `IP allowlist`
- policy cards and toggles for each section,
- a shared auto-save toggle,
- `Save changes`.

Use these screens when adjusting policy, troubleshooting blocked requests, or
hardening an environment before production launch.

# Medium

The current route is more than a generic checklist. It is a section-based
hardening workspace that lets you move between:
- auth protection:
  reCAPTCHA, login throttle, password safety
- rate limits:
  presets plus explicit admin/public/assistant buckets
- request protections:
  CSRF, CORS, headers
- access continuity:
  sessions, login alerts, IP allowlist

It is the right place when you need to answer questions such as:
- should sign-in protection be tightened,
- are rate limits too strict or too loose,
- are preview/admin requests protected correctly,
- how should session lifetime and alerts behave,
- should admin access be limited to trusted networks.

# Instruction

1. Open `Settings > Security`.
2. Start with the section rail on the left instead of changing fields randomly.
3. In `Auth protection`, review:
   - `Enable reCAPTCHA v3`
   - site key / secret key
   - login, reset, and public-write thresholds
   - `Enforce on localhost`
   - login throttle
   - password pepper status
4. In `Rate limits`, start with `Smart presets` before editing raw bucket values.
5. Review rate-limit areas in order:
   - admin usage
   - public site usage
   - assistant usage
6. In `CSRF`, review whether admin actions are protected with the expected
   header name and token TTL.
7. In `CORS`, review:
   - allowed origins
   - allowed methods
   - allowed headers
   - max age
   - credential behavior
8. In `Security headers`, review browser-facing protections such as:
   - frame options
   - content type options
   - referrer policy
   - permissions policy
   - CSP
   - HSTS
9. In `Sessions`, review:
   - session TTL
   - auth session TTL
   - password reset TTL
   - max sessions per user
   - single-session mode
   - login alerts toggles
10. In `IP allowlist`, review:
    - current restrictions table
    - `Add IP Range`
    - propagation note
11. Use the shared auto-save toggle intentionally.
12. Use `Save changes` when you want an explicit save after reviewing the full
    policy set.
13. Risky policy edits open `Review security policy changes` before the save is
    applied. The dialog lists the affected policy areas and requires typing
    `APPLY` for lockout-prone security changes.

Use this safe hardening order when you want fewer lockout mistakes:
1. Review auth protection.
2. Review rate limits.
3. Review CSRF/CORS/headers.
4. Review sessions and alerts.
5. Review IP allowlist last.
6. Save only after the whole policy shape is coherent.

# Advanced

- The section rail matters because these controls are interdependent. Changing
  rate limits without checking auth, sessions, or IP allowlist can create
  accidental lockouts.
- `Smart presets` for rate limits are a safer starting point than raw bucket
  editing when you need broad posture changes quickly.
- The assistant bucket lives alongside admin and public buckets, which means the
  assistant is treated as a first-class operational surface in security policy.
- Password pepper status is a runtime signal, not a casual badge. It reflects an
  environment hardening decision outside the form itself.
- The IP allowlist section is inline here, but it still represents a high-impact
  access control change that should be treated carefully.
- High-impact saves, including rate limits, CSRF/CORS, security headers,
  session policy, bot protection, plugin policy, and allowlist-related changes,
  require an explicit review instead of silent auto-save.

# Troubleshooting

- Sign-in suddenly feels too strict:
  review reCAPTCHA thresholds and login throttle together, not in isolation.
- Admin actions start failing unexpectedly:
  inspect CSRF and CORS settings before assuming the application code is broken.
- Users complain about frequent sign-outs:
  review session TTL and single-session mode.
- The environment feels locked down too hard:
  check rate-limit presets and IP allowlist before changing multiple unrelated
  security values.
- IP allowlist changes do not seem instant:
  the current UI notes that propagation can take up to 2 minutes globally.

# Decision Guide

- Choose preset vs custom rate limits:
  start with a preset when the overall posture needs to change; use custom only
  when you already know the exact bucket values required.
- Choose single-session mode vs multiple sessions:
  use single-session mode when stricter session control matters more than device
  flexibility.
- Choose alerting vs enforcement:
  login alerts increase visibility; IP allowlist and strict rate limits enforce
  access restrictions directly.

# Checklist

1. Confirm the active security section you are editing.
2. Confirm related controls are reviewed together.
3. Confirm rate limits and auth protection do not conflict with real workflow.
4. Confirm session and alert settings are intentional.
5. Confirm access restrictions such as IP allowlist are deliberate.
6. Save only after checking the whole policy set.

# Navigation And Drafts

- Settings section links use in-app navigation on desktop and mobile.
- If this screen has unsaved edits, moving to another Settings section,
  browser Back/Forward, or refresh/close prompts before the draft is discarded.
- Choose cancel/keep editing when you need to preserve the current draft.
- Overly aggressive settings can lock out legitimate users; overly relaxed
  settings can expose the environment. Changes here require deliberate review.
- Auto-save does not silently apply risky security-policy drafts. Those drafts
  require the same review dialog as manual save.

# Security

- Security Settings is an authenticated admin surface and should only be used by
  high-trust administrators responsible for environment protection.
- These controls affect authentication, public write protection, assistant
  runtime, and admin reachability, so they should be treated as operationally
  sensitive configuration.
