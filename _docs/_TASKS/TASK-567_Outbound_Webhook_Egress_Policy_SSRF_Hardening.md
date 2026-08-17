# TASK-567: Outbound Webhook Egress Policy (SSRF Hardening)

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** High
**Size:** Large

# FileName: TASK-567_Outbound_Webhook_Egress_Policy_SSRF_Hardening.md

**Parent Task:** none
**Source Findings:** M-491-01, H-492-01, M-492-02 + supplementary NAT64/mapped-IPv6 findings (audits `_TMP-audit-task-491-integrations.md`, `_TMP-audit-task-492-login-alerts.md`, verified at HEAD `4e3dab15`)

## Purpose

Outbound webhook destinations are a privileged network egress surface without a
coherent destination/SSRF policy:

- Slack/Zapier webhook URLs are accepted as arbitrary text and passed directly
  to `fetch` with no protocol/host allowlist and no redirect blocking
  (M-491-01); public form submissions amplify this egress (supplementary).
- The login-alert SSRF checker misses IPv4-mapped IPv6 (`::ffff:127.0.0.1`)
  (H-492-01) and NAT64-prefixed (`64:ff9b::7f00:1`) plus alternate mapped
  spellings (supplementary); delivery follows redirects without re-validation
  (M-492-02).

A user with `settings:write` can force a server-side request to loopback/private
network/metadata via literal or mapped addresses or via a redirect chain.

## Evidence

- `core/server/routes/integrationsRoutes.ts:53-69` (accepts arbitrary URL),
  `core/server/validation/integrationsSchemas.ts:1-10` (no host/protocol
  validation), `core/services/integrations/integrationsService.ts:191-233`
  (normalize only), `slackDelivery.ts:27-40`, `zapierDelivery.ts:24-37`,
  `core/services/webhooks/retryPost.ts:50-96` (direct fetch, `:68-73` no
  redirect guard).
- `core/services/settings/securitySettings.ts:375-440`
  (`isLoginWebhookPrivateHost` misses `::ffff:` and `64:ff9b::` mapped forms),
  `core/services/auth/loginAlertDeliveryService.ts:147-155` (fetch without
  `redirect: "error"`).
- TASK-492 contract `TASK-492-01-L01-...md:117-123` (explicit private/loopback/
  link-local block).

## Scope

- One shared outbound URL validator used by ALL webhook/egress paths
  (integrations, login alerts, any future webhook), not an ad-hoc per-adapter
  check.
- Validate per provider: HTTPS required; Slack/Zapier host allowlists; reject
  private/loopback/link-local/CGNAT/reserved/multicast IPv4 and IPv6, including
  IPv4-mapped IPv6 and NAT64 prefixes; reject DNS-resolved private destinations
  (with rebinding-aware resolution where feasible).
- Block redirects (`redirect: "error"`) in every delivery path; sanitize the
  redirect error to the existing machine-readable delivery error.
- Add negative tests: literal private host, mapped IPv6 spellings, NAT64
  prefix, private destination after redirect, correct host for each provider.
- Fold in log hygiene for the delivery transport (`retryPost` timer cleanup,
  `publicHeadTags` raw error logging) as part of the same transport change where
  the anchors overlap.

## Fix Strategy

Own a single `outboundEgress` module in the domain contract layer (pure, no DB
imports) exporting `validateOutboundUrl(url, { provider })` and
`fetchWithEgressPolicy(...)`; routes/services import the owner instead of
duplicating checks. Wire `redirect: "error"` into `retryPost.ts` and
`loginAlertDeliveryService.ts`.

## Security Contract

- Endpoint visibility unchanged: `internal` admin update routes require
  `settings:write` (integrations) / configured webhook (login alerts).
- Validation is server-side and fail-closed; invalid destinations are rejected
  at configuration time AND at delivery time (defense in depth).
- Redirect errors and log lines carry no raw URL/secret/error internals.
- No new public write surface; public form submission only triggers delivery to
  previously validated destinations.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest/Bun tests for the validator matrix (mapped IPv6, NAT64, redirects,
  per-provider allowlist) + delivery tests with fake fetch.
- Route registration + `map*Error` coverage for the affected routes.
- Security scan per `_docs/SECURITY_SPEC.md` when feasible.

## Notes

- M-491-01 blocks closure of the TASK-491 security surface; H-492-01/M-492-02
  block TASK-492. This family unifies both under one egress policy.
