---
title: "Email Settings"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - email settings
  - smtp
  - test email
  - delivery logs
  - sender info
---

# Basic

Email Settings is the SMTP configuration surface for outbound system email. It
is where you define the SMTP server, sender defaults, send a test email, review
connection status, and inspect delivery logs.

In the current UI, this route includes:
- SMTP server configuration,
- default sender info,
- a test email card,
- a connection-status panel,
- a delivery-logs drawer,
- a security note,
- an auto-save toggle and `Save changes`.

# Medium

Use Email Settings when the system needs to send outbound mail reliably and the
SMTP configuration or sender identity needs review. The current route is
designed for:
- defining host, port, encryption, and authentication,
- controlling whether the stored SMTP password should be updated,
- setting the default sender name and address,
- sending a test message to a real recipient,
- checking whether the connection looks operational or incomplete.

This is not a generic messaging page. It is a delivery-configuration and
validation workspace for SMTP-backed email.

# Instruction

1. Open `Settings > Email`.
2. Start with the status badge in the top area:
   `Connected` or `Needs setup`.
3. In `SMTP Server Configuration`, review:
   - SMTP host,
   - port,
   - encryption protocol,
   - username,
   - password state.
4. Use the password update toggle only when the stored password really needs to
   change.
5. In `Default Sender Info`, review:
   - from name,
   - from email.
6. Move to `Test Email`.
7. Enter a real recipient address that can verify the result.
8. Use `Send Test Email` only after the SMTP values and sender defaults are
   coherent.
9. Review the `Connection Status` card for:
   - overall operational/pending state,
   - host configured state,
   - authentication state.
10. Use `View delivery logs` when you need recent SMTP activity context.
11. In `Delivery Logs`, review:
    - whether logs exist,
    - delivery status,
    - export path.
12. Read the `Security Note` before finalizing production setup.
13. Use `Save changes` when you want an explicit save instead of relying only on
    auto-save.

Use this safe email-setup order when you want fewer delivery mistakes:
1. Configure SMTP first.
2. Configure sender info second.
3. Review connection status.
4. Send a test email.
5. Review delivery logs if needed.
6. Save deliberately.

# Advanced

- SMTP password handling is intentionally separate from the normal text fields,
  which helps avoid casual credential overwrites.
- `Needs setup` in the status area is an operational signal, not just a warning
  badge. It tells you outbound email should not yet be assumed reliable.
- `Send Test Email` is a verification step, not a substitute for correct SMTP
  setup.
- Delivery logs matter even when empty, because the empty state still tells you
  no recent SMTP attempts have been recorded.
- The built-in security note reflects a real deliverability trade-off:
  production-grade email often needs a dedicated provider rather than a generic
  SMTP server.

# Troubleshooting

- Email is not working:
  review host, port, encryption, and credentials before changing sender info.
- The password is stored but mail still fails:
  confirm that the password update toggle and current credential state match the
  real server expectation.
- Test email cannot be trusted yet:
  check connection status and then review delivery logs.
- The route still says `Needs setup`:
  confirm both host and authentication are configured, not just one of them.

# Decision Guide

- Choose update password vs keep current:
  update it only when the stored SMTP secret should really change.
- Choose test email vs save only:
  save when configuration is draft-only; send a test email when delivery needs
  real validation now.
- Choose generic SMTP vs dedicated provider:
  use the dedicated provider path when production deliverability matters more
  than convenience.

# Checklist

1. Confirm SMTP host, port, and encryption are correct.
2. Confirm authentication state is correct.
3. Confirm sender name and sender email are correct.
4. Send a real test email when validation is needed.
5. Review delivery logs if anything feels uncertain.
6. Save changes deliberately.

# Security

- Email Settings is an authenticated admin surface and should only be used by
  high-trust administrators responsible for outbound delivery configuration.
- SMTP credentials are security-sensitive and should be handled as protected
  infrastructure secrets.
- Sender identity and delivery logs can affect trust, compliance, and incident
  review, so they should be managed carefully.
