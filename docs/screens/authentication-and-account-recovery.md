---
title: "Authentication and Account Recovery"
audience: "admin"
productArea: "auth"
language: "en"
keywords:
  - login
  - 2fa
  - reset
  - recovery
---

# What Is It

Authentication and Account Recovery covers the screens used to sign in, confirm
two-factor authentication, request password resets, and finish account recovery
flows.

# When To Use

Use these screens when onboarding a user, troubleshooting access, rotating
credentials, or validating that security policies still allow legitimate
admins to sign in.

# Step By Step

1. Sign in on the Login screen with a valid admin account.
2. Complete the 2FA screen if the account requires second-factor confirmation.
3. Use the reset flow if the user cannot authenticate with an existing
   password.
4. Complete the confirmation screen to set the new password and restore access.

# Examples

- A new admin signs in for the first time and confirms a second factor before
  reaching the dashboard.
- An operations user loses their password and uses the reset flow to regain
  access without manual database changes.
- A security review verifies that recovery flows still behave correctly after
  TTL or policy changes.

# Common Mistakes

- Treating a 2FA challenge as a login failure instead of the next expected step.
- Forgetting that reset and session TTL policies can affect how long recovery
  links remain valid.
- Testing recovery flows without considering rate limits and bot-protection
  rules on the security side.
