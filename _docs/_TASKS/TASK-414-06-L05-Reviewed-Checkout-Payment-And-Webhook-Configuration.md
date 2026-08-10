# TASK-414-06-L05: Reviewed Checkout, Payment, and Webhook Configuration
# FileName: TASK-414-06-L05-Reviewed-Checkout-Payment-And-Webhook-Configuration.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-06
**Priority:** Critical
**Category:** Agent / Designer / Commerce / External Configuration
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-04-L01 terminal; TASK-414-05-L04 terminal;
TASK-414-06-L02 terminal; TASK-547 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Restore the reviewed checkout/payment/webhook configuration scope from the
original TASK-414 while keeping money movement and external delivery outside
autonomous Agent/Designer execution. The Agent may inspect safe readiness,
select an already installed/configured checkout adapter, create a disabled
webhook from a server-owned destination profile, update the event set of one
existing webhook, or separately enable/disable it after a fresh high-impact
approval. It never receives or changes credentials, raw destination URLs, or
webhook secrets.

Designer may stage the same strict configuration references as an inert part of
`DesignerSiteBundleV1`. Preview shows status/readiness without contacting a
payment provider or webhook. Promotion may select a ready checkout adapter only
when the exact configuration is visibly included in the reviewed approval
tuple; webhook records materialize disabled and require a separate post-
promotion enable approval. Reject/expiry removes staged intent with zero live
configuration effect.

This leaf does not charge/refund money, create carts/checkouts/orders, access
customer data, send a webhook/test delivery, register provider code, provision
credentials, or claim that an unconfigured plugin is ready.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

This leaf is the sole TASK-414 writer for:

- new `core/services/commerce/checkoutConfigurationContract.ts`;
- new `core/services/commerce/checkoutConfigurationService.ts`;
- existing `core/services/commerce/checkoutRegistry.ts`, only to consume the
  validated configured adapter key in its two runtime resolution methods;
- existing `core/services/settings/settingsService.ts`, only to add the strict
  nullable `commerce.checkout.adapterKey` setting/normalizer/read projection
  and call the exact transaction-aware settings mutation hook below;
- new `core/services/settings/settingsMutationGuard.ts`, owning one fail-closed,
  code-registered hook consumed by `setSetting`, `setSettings`, and
  `setSettingsTx` without changing their public signatures;
- new `core/services/webhooks/webhookConfigurationContract.ts`;
- new `core/services/webhooks/webhookDestinationRegistry.ts`;
- new `core/services/webhooks/webhookConfigurationService.ts`;
- existing `core/services/webhooks/deliveryService.ts`, only to adopt the
  shared outbound-network policy before every request/redirect;
- new `core/services/assistant/capabilities/externalConfigurationCapabilityPack.ts`;
- new `core/services/assistant/capabilities/externalConfigurationActionContracts.ts`;
- new `core/services/assistant/capabilities/externalConfigurationActionAdapter.ts`;
- new `core/services/assistant/capabilities/externalConfigurationApprovalService.ts`;
- new `core/services/assistant/capabilities/externalConfigurationDesignerContribution.ts`;
- new `core/server/validation/assistantExternalConfigurationSchemas.ts`;
- new `core/server/routes/assistantExternalConfigurationRoutes.ts`;
- focused tests under `tests/vitest/assistant/`, `tests/unit/commerce/`,
  `tests/unit/webhooks/`, `tests/security/`, `tests/integration/assistant/`, and
  `tests/integration/routes/` named for `externalConfiguration`,
  `checkoutConfiguration`, or `webhookConfiguration`.

`core/services/webhooks/webhooksService.ts`, webhook Admin routes/UI, checkout
adapter contract/plugin code, commerce product/order data, DB schema/migrations,
credentials/integration settings, payment provider SDKs, TASK-547 source,
shared Agent executor/route mounts, and docs/tasks/changelog are forbidden.
`settingsService.ts` is 917 lines at refreshed HEAD
`963733cae23456622bea1eef1b734723aaab2350`, leaving at most 83 physical lines
before the mandatory limit. Recount immediately before implementation. If the
complete focused delta cannot fit inside that verified headroom, first split its
pure defaults/normalizers into a cohesively named settings-domain module, keep
the existing public imports/signatures stable, add that extracted module and its
focused tests to this leaf's ownership list, and only then add behavior. A
partial extraction, arbitrary line-range split, or closure above 1,000 lines is
forbidden.

TASK-414-09-L04 later treats these services as immutable native owners and does
not reopen files owned here. It contributes the generation-aware implementation
through this leaf's terminal `settingsMutationGuard.ts` registration seam. The
hook accepts the supplied transaction handle, normalized changed keys,
actor/context, and native write callback; it cannot open a second transaction,
bypass validation, or become an optional no-op after activation readiness.
Before activation readiness, the explicitly registered legacy pass-through
policy preserves current behavior. Unknown, duplicate, late, or missing
registration fails closed.

## Checkout and Payment Readiness Contract

`CheckoutConfigurationDescriptorV1` is a static server/plugin contribution
keyed to an existing `CommerceCheckoutAdapter.key`. It exposes only safe label,
capabilities, plugin/source ID, contract version, readiness resolver ID, and
required configuration-field IDs—not values. Its server resolver returns:

```ts
type CheckoutAdapterReadinessV1 = Readonly<{
  adapterKey: string;
  state: "ready" | "unconfigured" | "disabled" | "unavailable";
  capabilityDigest: string;
  safeReason: string | null;
  checkedAt: string;
}>;
```

Readiness is resolved on the backend from the current installed adapter and
encrypted provider configuration. It never returns secret presence names,
credential fragments, account/customer IDs, balances, endpoints, or provider
error bodies. Unknown, `internal_noop`, unconfigured, disabled, stale-contract,
or capability-mismatched adapters cannot be selected as a live payment path.

`commerce.checkout.adapter.select` carries exact adapter key, capability digest,
current nullable setting value/`updatedAt`, plan/action hashes, and approval ID.
It requires an individual five-minute approval and executes through L04's
`transaction_owned_single` lane. Inside that transaction it re-resolves
readiness, CASes `commerce.checkout.adapterKey`, writes activation/cache outbox,
audit, approval settlement, and complete action result. Existing checkout
runtime resolution reads this validated setting when the caller supplies no
explicit server-owned key. A stale/missing/unready adapter fails before changing
the current selection.

This is selection/configuration, not payment execution. The Agent cannot call
`addToCart`, `createCheckoutUrl`, provider SDKs, payment intents, charges,
refunds, orders, or customer reads. Designer preview uses only readiness DTOs.

## Webhook Configuration Contract

Agent actions are exactly:

- `webhook.destination.create-disabled` — exact server-owned destination
  profile ID/version, bounded event IDs, name; always stores `enabled: false`;
- `webhook.events.update` — one server-resolved webhook, expected `updatedAt`,
  exact allowlisted event IDs; preserves URL, secret, and enabled state;
- `webhook.enable` — separate approval, exact expected state/destination-policy
  digest/current event set; and
- `webhook.disable` — separate approval because disabling can interrupt an
  integration.

`WebhookDestinationProfileV1` is code/plugin-owned and contains a stable ID,
safe label, exact HTTPS destination held backend-only, allowed event IDs,
outbound policy ID/version, optional server-generated secret policy, and safe
readiness resolver. The model/browser receives only profile ID/label and event
catalog. It cannot submit a URL, headers, secret, payload template, retry
configuration, proxy, certificate override, or arbitrary event. Existing
webhooks without a matching current safe profile/policy may be listed as
`manual_only` but cannot be enabled or destination-edited by Agent/Designer.

The tx-aware native service selects only required columns and uses the supplied
transaction for expected-`updatedAt` lock/CAS, event normalization and native
create/update only. It returns bounded cache/audit/undo/approval facts to the
TASK-414-05-L04 executor; L04 alone persists approval/result settlement, audit,
outbox, undo and execution ledger with its one event key. Secret decryption and
external I/O are forbidden in configuration transactions.

Before any delivery attempt—including existing manually configured hooks—
`deliveryService.ts` calls TASK-414-03-L01's shared outbound policy for HTTPS,
canonical host/port, DNS/IP, redirect, peer-IP, timeout, response-byte, and
credential/header rules. Loopback, RFC1918/private/link-local/metadata,
multicast, unspecified, forbidden IPv6, userinfo, unsafe port, downgrade,
DNS-rebinding, and proxy-environment bypass fail closed. The policy runs again
for every redirect and pins the approved address. This leaf does not invoke a
delivery or test endpoint during Agent/Designer work.

## Designer Staging Contract

The pure sidecar contains only:

```ts
type DesignerExternalConfigurationV1 = Readonly<{
  checkoutAdapter: Readonly<{
    adapterKey: string;
    capabilityDigest: string;
  }> | null;
  disabledWebhooks: readonly Readonly<{
    stableKey: string;
    destinationProfileId: string;
    destinationProfileVersion: string;
    eventIds: readonly string[];
    label: string;
  }>[];
}>;
```

Staging stores references only, normal CMS/settings/webhook lists do not expose
them, and preview makes no external request. Package validation binds current
readiness/policy versions. Promotion rechecks them and may atomically select the
ready checkout adapter as part of the exact approval/native permission union;
all webhook rows are created disabled. A visible follow-up explains that each
hook needs a separate Agent or Settings enable approval. No promotion path
creates a delivery row.

## Implementation Pseudocode

```ts
export async function selectCheckoutAdapterTx(
  tx: ProductTransaction,
  input: ApprovedCheckoutSelectionV1,
  deps: CheckoutConfigurationDeps,
): Promise<TransactionOwnedNativeReceipt<CheckoutSelectionResultV1>> {
  const generation = await deps.settings.lockCurrentCheckoutDescriptorGenerationTx(
    tx,
    {
      adapterKey: input.adapterKey,
      descriptorVersion: input.descriptorVersion,
      readinessGeneration: input.readinessGeneration,
    },
  );
  const descriptor = deps.registry.resolveExactCurrentDescriptor(
    input.adapterKey,
    input.descriptorVersion,
  );
  const readiness = await deps.readiness.resolveFromLockedGenerationTx(
    tx,
    descriptor,
    generation,
  );
  assertExactReadyAdapter(readiness, input.capabilityDigest);
  const current = await deps.settings.lockCheckoutSelectionTx(tx);
  assertExpectedSetting(current, input.expectedCurrent);
  const selected = await deps.settings.setCheckoutSelectionTx(tx, input.adapterKey);
  return {
    value: projectSafeCheckoutSelection(selected, readiness),
    cacheFacts: buildCheckoutConfigurationCacheFacts(selected),
    auditFacts: buildSafeCheckoutConfigurationAuditFacts(selected),
    undoFacts: buildCheckoutConfigurationUndoFacts(current, selected),
    approvalSettlement: { approvalId: input.approvalId, state: "consumed" },
  };
}

export async function createDisabledWebhookFromProfileTx(
  tx: ProductTransaction,
  input: ApprovedWebhookDraftV1,
  deps: WebhookConfigurationDeps,
): Promise<TransactionOwnedNativeReceipt<WebhookSafeSummaryV1>> {
  const generation = await deps.destinations.lockCurrentWebhookProfileGenerationTx(
    tx,
    {
      profileId: input.profileId,
      profileVersion: input.profileVersion,
      readinessGeneration: input.readinessGeneration,
    },
  );
  const profile = deps.destinationRegistry.resolveExactCurrentProfile(
    input.profileId,
    input.profileVersion,
  );
  const readiness = await deps.destinations.resolveReadinessFromLockedGenerationTx(
    tx,
    profile,
    generation,
  );
  assertDestinationReadyAndEventsAllowed(readiness, profile, input.eventIds);
  const webhook = await deps.webhooks.insertDisabledFromProfileTx(tx, {
    name: input.name,
    destination: profile.backendDestination,
    eventIds: normalizeWebhookEventIds(input.eventIds),
    secretPolicy: profile.secretPolicy,
  });
  return {
    value: projectWebhookSafeSummary(webhook),
    cacheFacts: buildWebhookConfigurationCacheFacts(webhook),
    auditFacts: buildSafeWebhookConfigurationAuditFacts(webhook),
    undoFacts: buildWebhookConfigurationUndoFacts(webhook),
    approvalSettlement: { approvalId: input.approvalId, state: "consumed" },
  };
}
```

Approval and action payloads carry only stable IDs, exact contract/profile
versions, expected non-secret configuration generation digests, target/current
tokens and action hashes—never a prevalidated descriptor/readiness/profile
object. Inside the supplied product transaction, each handler first locks and
reads the current non-secret generation, resolves the exact current code-owned
descriptor/profile, and derives readiness from that locked projection before
the first mutation. A changed deployment/profile/settings/credential-readiness
generation fails with zero write. These checks perform no network/provider or
secret-returning call. These handlers perform only native tx reads/
writes and return L04's strict facts receipt. They never allocate an event key,
settle approval, write audit/undo/outbox/execution rows, build/persist/apply a
postcommit plan, or call the cache runtime. L04 is the sole cross-cutting writer
and recovery owner.

`registerAssistantExternalConfigurationRoutes(router, deps)` registers only the
prefixless route
`POST /assistant/agent/sessions/:sessionId/external-configuration-approvals`.
The shared server composer applies `/admin/api` exactly once; the full external
HTTP path is documented as
`POST /admin/api/assistant/agent/sessions/:sessionId/external-configuration-approvals`
but is never passed to the factory. No factory may inspect or prepend an ambient
base prefix.
Its recursive reject-unknown body binds session/run/plan/action/target/current
tokens/idempotency and never contains a provider key credential, webhook URL,
secret, or payload. TASK-414-09-L03 mounts this contribution once.

## Machine-Readable Errors

- `assistant_checkout_configuration_invalid`
- `assistant_checkout_adapter_unavailable`
- `assistant_checkout_adapter_unconfigured`
- `assistant_checkout_configuration_conflict`
- `assistant_webhook_configuration_invalid`
- `assistant_webhook_destination_manual_only`
- `assistant_webhook_destination_forbidden`
- `assistant_webhook_event_invalid`
- `assistant_webhook_configuration_conflict`
- `assistant_external_configuration_approval_required`
- `assistant_external_configuration_approval_invalid`
- `assistant_external_transaction_unsupported`

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | One internal Admin approval POST plus internal Agent actions and private Designer staging. Existing public checkout remains native; no public Assistant/Designer write is added. |
| Authentication | Valid Admin session and server-derived actor/session/workspace. Adapter/profile/action/approval IDs are references, never credentials. |
| RBAC | Inspect: `assistant:use` plus `commerce:read` or `settings:read`; checkout selection: `commerce:write` + `settings:write`; webhook proposal: `settings:read`; create/update/enable/disable: `settings:write`. Designer additionally uses `designer:write/promote` and exact native union. |
| CSRF | Approval and every internal mutation POST require shared CSRF. Workers and runtime checkout/webhook delivery gain no Admin mutation path. |
| Rate limit | `assistant` planning/execute plus `assistant-external-config` approval; one action per transaction, five-minute approval, per-actor/install daily bounds, webhook event/destination limits, and native delivery limits. Replays count. |
| Validation | Recursive reject-unknown; exact installed descriptor/profile/version/digest/current tokens; safe event catalog; tx-aware CAS; strict setting key; no URL/secret/payload fields. |
| Anti-abuse | No public write. Session + CSRF + RBAC + separate approval + actor-scoped idempotency + current readiness + tx CAS + outbound SSRF policy prevent confused-deputy external configuration. |

No safe DTO/log/audit/provider context/screenshot contains encrypted/plain
credentials, webhook secret/URL, account/customer/order data, payment response,
raw provider/tool output, SQL, private IP/DNS details, approval value, or stack.

## Regression-Test Shape

- Descriptor/setting/action schemas reject unknowns, model/client readiness,
  `internal_noop`, credentials, URLs, headers, payloads, secrets, payment/order/
  refund operations, and mixed/multi-action execution before service I/O.
- Ready configured adapter can be selected; stale/unconfigured/removed/disabled
  adapter leaves the prior setting and runtime behavior unchanged.
- Approval-to-transaction races change checkout descriptor/profile version,
  non-secret readiness/config/credential generation and webhook destination
  policy immediately before the handler lock; each stale identifier fails with
  zero setting/webhook/ledger effect. Schemas reject embedded prevalidated
  readiness/profile/destination objects.
- Runtime no-explicit-key resolution consumes the validated setting; explicit
  server-owned overrides remain compatible. No test executes provider methods.
- Webhook creation is disabled, events are exact/bounded, event update preserves
  secret/URL/enabled, and separate enable/disable approval is mandatory.
- Concurrent CAS/idempotency and crash boundaries prove native config, approval,
  audit/outbox, and complete result are all-or-nothing through L04.
- Import/dependency spies prove these handlers cannot call approval settlement,
  audit/undo/outbox/event-key/invalidation/cache-runtime/global-DB owners and that
  their finite facts produce byte-identical L04 ledger/outbox plans.
- A recording-router test pins the factory's one literal prefixless path. A
  full HTTP test mounts the shared `/admin/api` prefix once and proves the
  documented external path resolves while `/admin/api/admin/api/**` and the
  unprefixed network path return not found.
- SSRF tests cover IPv4/IPv6 private/metadata/rebinding/redirect/downgrade/
  userinfo/port/proxy cases and allowed pinned HTTPS delivery with bounded
  response; no Agent/Designer test sends a webhook.
- Designer preview performs zero external calls; promotion selects only exact
  ready checkout config, creates hooks disabled, reject leaves live config byte-
  identical, and follow-up activation is visible.
- Existing manual webhook/checkout behavior remains compatible and every
  touched production/test file is <=1,000 lines.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/externalConfiguration*.test.ts
bun test \
  tests/unit/commerce/checkoutConfiguration*.test.ts \
  tests/unit/webhooks/webhookConfiguration*.test.ts
set -a && source .env && set +a
bun test tests/integration/assistant/agentExternalConfiguration.test.ts \
  tests/integration/routes/assistantExternalConfigurationApproval.test.ts
bun test tests/security/webhookOutboundPolicy.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
wc -l core/services/settings/settingsService.ts \
  core/services/settings/settingsMutationGuard.ts \
  core/services/commerce/checkoutRegistry.ts \
  core/services/commerce/checkoutConfigurationContract.ts \
  core/services/commerce/checkoutConfigurationService.ts \
  core/services/webhooks/deliveryService.ts \
  core/services/webhooks/webhookConfigurationContract.ts \
  core/services/webhooks/webhookDestinationRegistry.ts \
  core/services/webhooks/webhookConfigurationService.ts \
  core/services/assistant/capabilities/externalConfigurationCapabilityPack.ts \
  core/services/assistant/capabilities/externalConfigurationActionContracts.ts \
  core/services/assistant/capabilities/externalConfigurationActionAdapter.ts \
  core/services/assistant/capabilities/externalConfigurationApprovalService.ts \
  core/services/assistant/capabilities/externalConfigurationDesignerContribution.ts \
  core/server/routes/assistantExternalConfigurationRoutes.ts \
  core/server/validation/assistantExternalConfigurationSchemas.ts
```

## Done Criteria

- Agent can configure only exact ready checkout and safe webhook settings with
  separate approval; it cannot perform payment/order/refund/delivery work.
- Designer can stage and review external configuration without live effects;
  promotion creates hooks disabled and reject is clean.
- Credentials, raw destinations, secrets, customer/payment data, and provider
  methods never enter model/browser/preview/config action paths.
- Webhook delivery adopts the shared fail-closed outbound policy.
- Atomic result/idempotency and all security/runtime gates pass.

## Documentation Updates Required

Provide TASK-414-11-L01 with support/exclusion/readiness/approval, checkout
selection, disabled-webhook staging, activation, SSRF, operator diagnostics,
Guide pages, and extension-cookbook receipts. This leaf edits no shared docs,
task board/status, or changelog.
