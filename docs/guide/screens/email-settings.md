---
title: "Email Settings"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - email settings
  - smtp
  - resend
  - test email
  - delivery logs
  - sender info
---

# Basic

Email Settings is the outbound email provider surface for system email. It is
where you choose Manual SMTP or Resend, define sender defaults, send a test
email, review connection status, and inspect delivery logs.

In the current UI, this route includes:
- email provider selection,
- SMTP server configuration when Manual SMTP is active,
- Resend configured state when Resend is active,
- default sender info,
- a test email card,
- a connection-status panel,
- a delivery-logs drawer,
- a security note,
- an auto-save toggle and `Save changes`.

# Medium

Use Email Settings when the system needs to send outbound mail reliably and the
active provider or sender identity needs review. The current route is
designed for:
- selecting Manual SMTP or Resend,
- defining host, port, encryption, and authentication,
- controlling whether the stored SMTP password should be updated,
- setting the default sender name and address,
- sending a test message to a real recipient,
- checking whether the connection looks operational or incomplete.

This is not a generic messaging page. It is a delivery-configuration and
validation workspace for provider-backed email.

# Instruction

1. Open `Settings > Email`.
2. Start with the status badge in the top area:
   `Connected` or `Needs setup`.
3. In `Email Provider`, choose:
   - Manual SMTP when using host/port credentials,
   - Resend when using the encrypted Resend integration key.
4. If Manual SMTP is selected, review `SMTP Server Configuration`:
   - SMTP host,
   - port,
   - encryption protocol,
   - username,
   - password state.
5. Use the password update toggle only when the stored password really needs to
   change.
6. If Resend is selected, confirm the Resend provider panel shows a stored API
   key. Use `Configure Resend` to open Settings > Integrations when it needs
   setup.
7. In `Default Sender Info`, review:
   - from name,
   - from email.
8. Move to `Test Email`.
9. Enter a real recipient address that can verify the result.
10. Use `Send Test Email` only after the active provider and sender defaults are
   coherent.
11. Review the `Send test email?` confirmation. Cancel does not send mail;
   confirm sends a real test email through the configured provider.
12. Review the `Connection Status` card for:
   - overall operational/pending state,
   - SMTP host/authentication state for Manual SMTP,
   - Resend API key and sender state for Resend.
13. Use `View delivery logs` when you need recent provider activity context.
14. In `Delivery Logs`, review:
    - whether logs exist,
    - delivery status,
    - provider label,
    - export path.
15. `Export Logs` is disabled until the delivery-log export contract is wired.
16. Read the `Security Note` before finalizing production setup.
17. Use `Save changes` when you want an explicit save instead of relying only on
    auto-save.

Use this safe email-setup order when you want fewer delivery mistakes:
1. Select the provider first.
2. Configure SMTP credentials or the Resend integration key second.
3. Configure sender info third.
4. Review connection status.
5. Send a test email.
6. Review delivery logs if needed.
7. Save deliberately.

# Advanced

- SMTP password handling is intentionally separate from the normal text fields,
  which helps avoid casual credential overwrites.
- `Needs setup` in the status area is an operational signal, not just a warning
  badge. It tells you outbound email should not yet be assumed reliable.
- `Send Test Email` is a verification step, not a substitute for correct provider
  setup, and it requires a confirmation because it is an external side effect.
- Delivery logs matter even when empty, because the empty state still tells you
  no recent provider attempts have been recorded.
- Resend API keys are configured in Integrations. Email Settings only selects
  the provider and sender identity.

# Troubleshooting

- Email is not working:
  review the active provider, connection status, and sender info before changing
  unrelated fields.
- The password is stored but mail still fails:
  confirm that the password update toggle and current credential state match the
  real server expectation.
- Resend is selected but still pending:
  open `Configure Resend` and save a valid API key in Integrations.
- Test email cannot be trusted yet:
  check connection status and then review delivery logs.
- The route still says `Needs setup`:
  confirm the selected provider has its required credential and sender state,
  not just one of them.

# Decision Guide

- Choose update password vs keep current:
  update it only when the stored SMTP secret should really change.
- Choose test email vs save only:
  save when configuration is draft-only; send a test email when delivery needs
  real validation now.
- Choose Manual SMTP vs Resend:
  use Manual SMTP for host/port credentials; use Resend when the encrypted
  Resend API key is configured in Integrations.

# Checklist

1. Confirm the correct provider is selected.
2. Confirm SMTP credentials or Resend API key state is correct.
3. Confirm sender name and sender email are correct.
4. Send a real test email when validation is needed.
5. Review provider-labeled delivery logs if anything feels uncertain.
6. Save changes deliberately.

# Navigation And Drafts

- Settings section links use in-app navigation on desktop and mobile.
- If this screen has unsaved edits, moving to another Settings section,
  browser Back/Forward, or refresh/close prompts before the draft is discarded.
- Choose cancel/keep editing when you need to preserve the current draft.

# Security

- Email Settings is an authenticated admin surface and should only be used by
  high-trust administrators responsible for outbound delivery configuration.
- SMTP credentials and Resend API keys are security-sensitive and should be
  handled as protected infrastructure secrets.
- Sender identity and delivery logs can affect trust, compliance, and incident
  review, so they should be managed carefully.
