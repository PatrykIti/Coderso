# 1289 - TASK-567 Outbound Webhook Egress Policy SSRF Hardening

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-567

## Key Changes

### Network / Egress
- New Bun-free `core/services/network/outboundHttpPolicy.ts` owns the egress
  policy contract: `validateOutboundUrl` (scheme allowlist, per-provider
  host allowlist, redirect blocking, IPv4/IPv6/NAT64 handling),
  `fetchWithEgressPolicy` (DNS rebinding re-check at delivery time through an
  injected fetch seam), and `validateSentryDsn` (https-only).
- Form-action webhook execution and login-alert delivery now route through
  `fetchWithEgressPolicy` (delivery-time re-check; the injected `fetchFn`
  seam is preserved for tests).
- Slack/Zapier custom-webhook URLs are validated at config time in
  `integrationsService.ts` (`integration_url_invalid` on a non-allowlisted
  destination); Sentry DSNs require `https:`.
- `defaultDnsResolver` fails closed when the delivery DNS re-check cannot
  resolve (`egress_dns_recheck_unavailable`, added to `EgressErrorCode`) with
  a single retry; a failed re-check is an error, never a bypass.

## Validation
- `bun --cwd core lint` + `lint:types` green;
  `tests/vitest/network/outboundHttpPolicy.test.ts` (validator matrix + fake
  fetch delivery) and the Bun-owned delivery suites (slack/zapier/
  login-alert/retryPost, assistant provider, Sentry init) green.
- `tests/unit/security/securitySettings.test.ts` +
  `tests/integration/routes/publicSiteAnalytics.test.ts` stay green.
- Runtime smoke: webhook channel configuration UI covered by the existing
  `wf560-492smoke` suite (login alerts + webhook enable/save/dark parity).
