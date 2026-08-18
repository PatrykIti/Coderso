# TASK-567: Outbound Webhook Egress Policy (SSRF Hardening)

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1289 (pinned)
**Priority:** High
**Size:** Large

# FileName: TASK-567_Outbound_Webhook_Egress_Policy_SSRF_Hardening.md

**Parent Task:** none
**Source Findings:** M-491-01, H-492-01, M-492-02 + supplementary NAT64/mapped-IPv6 findings (docs-only finding from the 2026-08-17 TASK-560 audit sweep; audit reports removed by owner 2026-08-18, evidence re-anchored at HEAD `6ca20b38`)

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
  (`core/services/integrations/errorMonitoring.ts:83-91`); only
  `healthEvaluator.ts:52` gates it with
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
  check. **Module reconciliation with TASK-414-03-L01:** the open TASK-414
  family already contracts the same shared role at `core/services/network/outboundHttpPolicy.ts`
  (`TASK-414-03-L01-...md:44` creates it; `TASK-414-06-L05:165` and
  `TASK-414-04-L01:170` consume it). TASK-567 is the SINGLE initial creator of
  that path (active stream, changelog 1289, lands FIRST); TASK-414-03-L01 then
  EXTENDS it with agent-purpose policies + `pinnedOutboundTransport.ts` and its
  consumers keep their existing references. Do NOT create a second
  `core/services/outboundEgress/` module. Land order pinned: TASK-567 before
  TASK-414-03-L01 (recorded in both contracts).
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

Own a single `outboundHttpPolicy` module in the domain contract layer (pure,
no DB imports) exporting:

```ts
// core/services/network/outboundHttpPolicy.ts (new, Bun-free; single owner TASK-567
// creates it, TASK-414-03-L01 extends it after TASK-567 lands)
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
- `errorMonitoring.ts` — `validateSentryDsn` before SDK init; reject
  non-Sentry hosts fail-closed.
- **NOT edited by TASK-567:** `openAiProvider.ts` / `openRouterProvider.ts` are
  EXCLUSIVE files of TASK-414-03-L01 (`TASK-414-03-L01-...md:38-39`). TASK-567
  defines the provider allowlist policy in the shared module (EgressProvider
  union incl. `openai`/`openrouter`); TASK-414-03-L01 wires the provider files
  to it after TASK-567 lands. Recorded dependency; do not touch those files
  here.

## Security Contract

- Endpoint visibility unchanged: `internal` admin update routes require
  `settings:write` (integrations, custom webhooks); configured webhook (login
  alerts) and form-action webhooks are validated at config time and delivery
  time; assistant provider config changes require `settings:write` (wired by
  TASK-414-03-L01 after this task); Sentry
  init follows the existing secrets/settings path.
- Validation is server-side and fail-closed; invalid destinations are rejected
  at configuration time AND at delivery time (defense in depth).
- Redirect errors and log lines carry no raw URL/secret/error internals;
  `webhookDeliveries.lastError` stays machine-readable without the URL.
- No new public write surface; public form submission only triggers delivery to
  previously validated destinations.
- Custom webhooks are an admin-configured surface (`internal`), not a public
  one; their URLs are validated on save and on every delivery.

## Single-Writer Collision Guards (cross-stream)

TASK-567 edits the following files that open leaves also claim. Land order and
ownership are pinned here so exactly ONE writer owns each file at a time:

- `core/services/settings/securitySettings.ts` + `tests/unit/security/securitySettings.test.ts`:
  TASK-551-09-L04 (`...md:52,83`) and TASK-414-09-L03 (`...md:97`, rate-limit
  buckets) also claim them. TASK-567 edits ONLY `normalizeLoginWebhookUrl`
  (`:416-441`) and the egress validator wiring there; it must NOT touch cache
  hardening, rate-limit buckets, or other settings logic. Land order: TASK-567
  lands first; 551-09-L04 / 414-09-L03 land after and build on the change.
- `core/services/webhooks/webhooksService.ts`, `core/services/webhooks/deliveryService.ts`,
  `core/server/validation/webhookSchemas.ts`: TASK-551-03-L03 owns these
  (`...md:33,34,36`; `:67` "No other files may be edited") and
  TASK-414-06-L05 claims `deliveryService.ts` for the shared policy
  (`...md:60`). TASK-567 edits them ONLY for egress validation + redirect
  policy + sanitized lastError (no list pagination, no set-based batches, no
  unrelated changes). Land order: TASK-567 first; 551-03-L03 / 414-06-L05 land
  after and converge on the same shared module.
- Forbidden paths for TASK-567: `openAiProvider.ts`, `openRouterProvider.ts`
  (TASK-414-03-L01 exclusive), `core/services/network/pinnedOutboundTransport.ts`
  (TASK-414-03-L01 creates it), and any analytics/kit/assistant-service files
  outside the list above.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Bun-free Vitest suite for the validator matrix (mapped IPv6, NAT64, redirects,
  per-provider allowlist, custom-webhook blocklist, sentry DSN) in
  `tests/vitest/network/outboundHttpPolicy.test.ts` + delivery tests with fake
  fetch for
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
