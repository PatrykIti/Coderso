# TASK-567: Outbound Webhook Egress Policy (SSRF Hardening)

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1289 (pinned)
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
- **Custom webhooks are a fully unguarded third surface:** the URL is accepted
  as any string (`core/server/validation/webhookSchemas.ts:6`), normalized with
  trim only (`core/services/webhooks/webhooksService.ts:153-167`), and fetched
  with no scheme/host/SSRF/redirect guard (`deliveryService.ts:50` →
  `retryPost.ts:68-73`) — same class as M-491-01.
- **Assistant LLM providers** accept a user-configured `baseUrl` with no
  validation or redirect guard (`openAiProvider.ts:162-183`,
  `openRouterProvider.ts:261-280`).
- **Sentry init** passes the raw DSN straight to the SDK
  (`errorMonitoring.ts:100-108`); only `healthEvaluator.ts:52` gates it with
  `isParseableSentryDsn`.
- **Form-action webhooks are a fourth, most public-amplified surface:**
  `formAutomationRunnerCore.ts:213,230-238` fetches admin-configured action
  URLs with no scheme/host/SSRF/redirect guard (same class as M-491-01), the
  URL is accepted as any string (`formActionsContract.ts:196-219`), and it is
  triggered by PUBLIC form submissions (`publicFormsApi.ts:131` → runner
  `executeAction` at `:416`), so an attacker-controlled redirect/SSRF chain is
  public-amplified. Not owned by any other task; must be in scope.

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
  `redirect: "error"`), `core/services/settings/securitySettings.ts:416-441`
  (`normalizeLoginWebhookUrl` config-time normalization — no validator today),
  `core/services/forms/formAutomationRunnerCore.ts:213,230-238` (public-triggered
  action fetch, no guard), `core/services/forms/formActionsContract.ts:196-219`
  (action URL accepted as any string), `core/server/publicFormsApi.ts:131`
  (public submission → runner).
- TASK-492 contract `TASK-492-01-L01-...md:117-123` (explicit private/loopback/
  link-local block).

## Scope

- One shared outbound URL validator used by ALL webhook/egress paths
  (integrations, login alerts, custom webhooks, form-action webhooks, assistant
  LLM providers, Sentry DSN, any future webhook), not an ad-hoc per-adapter
  check.
- Validate per provider: HTTPS required; Slack/Zapier host allowlists; custom
  webhooks get the full blocklist policy (HTTPS + private/loopback/link-local/
  CGNAT/reserved/multicast IPv4 and IPv6, including IPv4-mapped IPv6 and NAT64
  prefixes; DNS-resolved private destinations with rebinding-aware resolution;
  `redirect: "error"`); no host allowlist by design for custom webhooks.
- Assistant provider policy: OpenAI/OpenRouter allowlist their official hosts
  (`api.openai.com`, `openrouter.ai`) and reject custom `baseUrl` overrides
  unless an explicit owner decision permits a custom endpoint with full
  blocklist validation (record the decision in the task handoff).
- Sentry policy: validate the DSN at init (`isParseableSentryDsn` +
  `host === "ingest.sentry.io"` or Sentry-owned host allowlist) before passing
  to the SDK; reject others fail-closed.
- Form-action webhook policy: same blocklist class as custom webhooks (HTTPS +
  private/loopback/mapped/NAT64 block, `redirect: "error"`, no host allowlist
  by design; customer endpoints). Validate at form-action configuration time
  (`formActionsContract.ts:196-219` save path) AND at every delivery
  (`formAutomationRunnerCore.ts:213,230-238`), fail-closed. This is the
  public-amplified surface; add the negative matrix explicitly.
- Block redirects (`redirect: "error"`) in every delivery path; sanitize the
  redirect error to the existing machine-readable delivery error at the
  `retryPost` boundary so the URL never persists into
  `webhookDeliveries.lastError` (`retryPost.ts:81` → `deliveryService.ts:62`).
- Consciously resolve the localhost-HTTP dev seam: the pinned
  `securitySettings.ts:431` localhost-http exception exists for local dev; the
  validator must keep it reachable through an explicit, documented
  `NODE_ENV !== "production"` escape while production stays HTTPS-only (guard
  with tests; see `securitySettings.test.ts:188-205`).
- Add negative tests: literal private host, mapped IPv6 spellings, NAT64
  prefix, private destination after redirect, correct host for each provider.
- Log hygiene for the delivery transport is scoped to `retryPost` timer cleanup
  only. `publicHeadTags` raw error logging is NOT in scope — TASK-568 is the
  single writer for `core/server/publicHeadTags.ts`.

## Fix Strategy

Own a single `outboundEgress` module in the domain contract layer (pure, no DB
imports) exporting:

```ts
// core/services/outboundEgress/outboundEgress.ts (new, Bun-free)
export type EgressProvider =
  | "slack" | "zapier" | "login-alert" | "webhook" | "openai" | "openrouter" | "sentry";
export function validateOutboundUrl(url: string, opts: { provider: EgressProvider; env?: NodeJS.ProcessEnv }): { ok: true; url: URL } | { ok: false; code: "egress_invalid_scheme" | "egress_host_forbidden" | "egress_redirect_forbidden" | ... };
export async function fetchWithEgressPolicy(input: string | URL, init: RequestInit, opts: { provider: EgressProvider }): Promise<Response>;
export function validateSentryDsn(dsn: string): { ok: true } | { ok: false; code: "sentry_dsn_invalid" };
```

Flow per delivery:
1. `validateOutboundUrl(url, { provider })` — scheme (HTTPS; localhost-http
   exception only when `env.NODE_ENV !== "production"`), host allowlist for
   allowlisted providers, blocklist (private/loopback/link-local/CGNAT/
   reserved/multicast, IPv4-mapped IPv6, NAT64) for blocklist providers, plus
   DNS resolution re-check where feasible.
2. Reject fail-closed at configuration time AND at delivery time
   (defense in depth).
3. `fetchWithEgressPolicy` passes `redirect: "error"` and maps a redirect
   rejection to the existing machine-readable delivery error code — no raw URL
   in the message or persisted error.

Wire the owner into:
- `slackDelivery.ts`, `zapierDelivery.ts` (allowlist + redirect).
- `loginAlertDeliveryService.ts:147-155` (blocklist + redirect) AND
  `securitySettings.ts:416-441` (`normalizeLoginWebhookUrl` gains the same
  validator at CONFIG time so the promised config-time AND delivery-time
  rejection both hold; in production `http://localhost` must not persist).
- `webhooksService.ts:153-167` + `deliveryService.ts:50` (custom webhooks:
  HTTPS + full blocklist + redirect, no host allowlist).
- `formAutomationRunnerCore.ts:213,230-238` + `formActionsContract.ts:196-219`
  (form-action webhooks: config-time + delivery-time blocklist, redirect).
- `retryPost.ts:68-81` — validate before fetch, `redirect: "error"`, sanitize
  the rejection so `webhookDeliveries.lastError` never contains the URL; keep
  timer cleanup.
- Assistant providers: `openAiProvider.ts` / `openRouterProvider.ts` reject
  custom `baseUrl` outside the allowlist at configuration/resolution time
  (fail-closed, no fetch).
- `errorMonitoring.ts` — `validateSentryDsn` before SDK init; reject
  non-Sentry hosts fail-closed.

## Security Contract

- Endpoint visibility unchanged: `internal` admin update routes require
  `settings:write` (integrations, custom webhooks) / configured webhook (login
  alerts); assistant provider config changes require `settings:write`; Sentry
  init follows the existing secrets/settings path.
- Validation is server-side and fail-closed; invalid destinations are rejected
  at configuration time AND at delivery time (defense in depth).
- Redirect errors and log lines carry no raw URL/secret/error internals;
  `webhookDeliveries.lastError` stays machine-readable without the URL.
- No new public write surface; public form submission only triggers delivery to
  previously validated destinations.
- Custom webhooks are an admin-configured surface (`internal`), not a public
  one; their URLs are validated on save and on every delivery.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Bun-free Vitest suite for the validator matrix (mapped IPv6, NAT64, redirects,
  per-provider allowlist, custom-webhook blocklist, sentry DSN) in
  `tests/vitest/outbound-egress/` + delivery tests with fake fetch for
  `slackDelivery`, `zapierDelivery`, `loginAlertDeliveryService`,
  `retryPost`/`deliveryService` (Bun lane where DB-backed), assistant provider
  resolution, and Sentry init.
- Route registration + `map*Error` coverage for the affected routes
  (integrations, webhooks, security settings).
- Run `bun test tests/unit/security/securitySettings.test.ts` and
  `tests/integration/routes/publicSiteAnalytics.test.ts` (existing suites
  touching the guarded contract) to confirm the localhost seam and GA head path
  stay green.
- Security scan per `_docs/SECURITY_SPEC.md` when feasible.

## Notes

- M-491-01 blocks closure of the TASK-491 security surface; H-492-01/M-492-02
  block TASK-492. This family unifies both under one egress policy.
