---
title: "API Keys"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - api keys
  - integration token
  - key rotation
  - scopes
  - machine access
---

# Basic

API Keys is the token-management surface for controlled machine access to the
system. It is where you create scoped keys for integrations, review existing
keys, rotate credentials, revoke access, and handle one-time secret visibility.

In the current UI, this route includes:
- `Create API Key`,
- an API keys table,
- a create dialog with scope selection,
- post-create secret handling through a dedicated one-time secret dialog.

# Medium

Use API Keys when an external integration, automation job, or internal service
needs authenticated access without using a human session. The current route is
designed for:
- creating keys with explicit scopes,
- tracking key lifecycle status,
- reviewing when a key was created or last used,
- rotating or revoking keys when trust changes.

The current local walkthrough shows an empty table state, which is still useful
because it makes the creation workflow the primary starting point. The broader
lifecycle contract for copy/rotate/revoke is confirmed in the shipped UI source.

# Instruction

1. Open `Settings > API Keys`.
2. Start by checking whether keys already exist in the table.
3. Use `Create API Key` when a new integration credential is needed.
4. In the create dialog, provide a clear key name that reflects ownership or
   purpose.
5. Review scopes carefully before saving.
6. The current shipped scopes include:
   - `Content Read`
   - `Content Write`
   - `Media Read`
   - `Media Manage`
   - `Forms Submit`
   - `Booking Submit`
   - `Settings Read`
   - `Settings Write`
7. Prefer the narrowest scope set that still solves the real integration need.
8. Create the key only after the selected scopes are intentional.
9. After creation, treat the secret as a one-time visible credential.
10. Copy it immediately and store it securely, because the current contract
    explicitly states it will not be shown again.
11. If the secret is lost later, rotate the key instead of expecting to reopen
    the original value.
12. For existing rows, review:
    - key name,
    - prefix,
    - scopes,
    - created date,
    - last used,
    - status.
13. Use lifecycle actions intentionally:
    - `Copy key` only when the current UI still allows one-time copy,
    - `Rotate key` when a fresh secret is required,
    - `Revoke key` when the integration should no longer be trusted.
14. Rotation and revocation both require confirmation. Cancel does not call the
    mutation. A rotated secret is still shown only in the one-time secret dialog.

Use this safe API key workflow when you want fewer access mistakes:
1. Name the key clearly.
2. Choose the narrowest scopes.
3. Create the key.
4. Copy and store the secret immediately.
5. Rotate or revoke when the trust model changes.

# Advanced

- Scope choice is the most important design decision on this screen. The route
  is built for least-privilege thinking, not for broad default access.
- Prefix display is useful operationally because it lets you identify a key
  without exposing the full secret.
- One-time secret visibility is a deliberate security boundary, not a UI
  limitation.
- Rotation should be treated as the normal recovery path when a secret might be
  exposed or lost, and it requires confirmation because existing integrations
  must switch to the new credential.
- Revocation is stronger than “not using the key anymore”; it is an explicit
  trust-ending action and requires confirmation.

# Troubleshooting

- No keys are listed:
  that simply means no API keys have been created yet in this environment.
- You forgot to copy the key:
  use rotation to generate a new secret instead of expecting the old one to be
  shown again.
- An integration has too much access:
  review the selected scopes and create a narrower replacement key if needed.
- A key should no longer work:
  revoke it explicitly instead of assuming it will stop being used on its own.

# Decision Guide

- Choose create vs rotate:
  create for a new integration; rotate when an existing key needs a fresh
  secret.
- Choose rotate vs revoke:
  rotate when the integration should continue with new credentials; revoke when
  trust in that integration should end.
- Choose broad vs narrow scopes:
  choose the narrowest scope set that still satisfies the real use case.

# Checklist

1. Confirm the key name reflects ownership or purpose.
2. Confirm the scopes are minimal and intentional.
3. Copy the secret immediately after creation.
4. Store it securely outside the UI.
5. Rotate or revoke when the access model changes.

# Security

- API Keys is an authenticated admin surface and should only be used by
  high-trust administrators responsible for machine-to-machine access.
- Secrets shown after key creation are sensitive credentials and should be
  treated like passwords.
- Scope selection, rotation, and revocation are all operational security
  controls, not convenience actions.
