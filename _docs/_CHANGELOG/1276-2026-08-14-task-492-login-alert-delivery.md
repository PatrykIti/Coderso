# 1276 - TASK-492 Login Alert Delivery (Email + Webhook) & Recipient Settings

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-492, TASK-492-01, TASK-492-01-L01, TASK-492-01-L02, TASK-492-02, TASK-492-02-L01, TASK-492-02-L02, TASK-492-03, TASK-492-03-L01, TASK-492-03-L02

## Key Changes

### Security (login alerts)
- Login alerts now DELIVER, not just audit: new-device/new-location logins email the account owner + configured recipients and POST a signed webhook (`core/services/auth/loginAlertDeliveryService.ts`, HMAC via the shared webhook signing util, masked PII in payload).
- Delivery is FIRE-AND-FORGET: `void sendLoginAlert(...)` detached in `POST /auth/login` — never awaited inline, never blocks/fails the 200; 8s AbortController bounds the detached task only.
- Settings contract extended in `securitySettings.ts`: `recipients` (≤10, lowercase/trim/dedupe), `webhookUrl` (HTTPS, HTTP only for loopback, SSRF private-IP reject), `webhookSecret` (encrypted at rest, API exposes only `{ configured }`), `deliveryError` (service-writable, sanitized ≤240 chars, absent from client schema).
- `mapSettingsRouteError` now maps `security_settings_invalid` to 400 (was an unmapped 500); assistant operation policy redacts the new secret/PII fields.
- Admin UI: Login Alerts page gains recipients editor + Email/Webhook channel toggles + webhook URL/secret + deliveryError status, additive only (brute-force/admin-only placeholders stay no-ops).

## Validation
- `bun --cwd core lint` + `lint:types` green; Bun 46/46 (securitySettings, delivery, auth routes, settings routes, security gate); Vitest 28/28 (schema, assistant policy, UI).
- Runtime smoke (wf492smoke, 5 scenarios): login, Login Alerts page controls, webhook enable + URL/secret fields, edit+save (PATCH 200, secret encrypted at rest, only `{configured}` exposed), dark-mode parity; 0 feature-related console errors. Screenshot `_docs/_workflows/_smoke/492-01-login-alerts-dark.png`.
