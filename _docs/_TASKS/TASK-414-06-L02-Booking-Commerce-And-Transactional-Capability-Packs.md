# TASK-414-06-L02: Booking Commerce And Transactional Capability Packs
# FileName: TASK-414-06-L02-Booking-Commerce-And-Transactional-Capability-Packs.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-06
**Priority:** Critical
**Category:** Agent / Booking / Commerce / Transaction Safety
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-06-L01; TASK-414-05 terminal; TASK-414-02-L01; TASK-551-03-L02 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Add typed, reviewed Agent adapters for bounded booking configuration and
commerce drafts. These are per-resource configuration capabilities, not
transaction-processing tools. Agent cannot read or mutate reservations,
customers, private form submissions, carts, checkouts, payments, orders,
refunds, webhooks, provider credentials, or autonomous publication.

Booking and commerce full-site/package intent remains Designer work. A missing
native optimistic/transactional service contract is an unavailable capability,
not permission to perform a preflight-read then unsafe last-writer-wins update.

TASK-551-03-L02 must first split the oversized booking service into
`bookingReadService.ts`, `bookingMutationService.ts`,
`bookingScheduleService.ts`, and the compatibility facade, with bounded lists/
assignments. This leaf edits only the terminal mutation/schedule owners. It must
not append to the old 1,163-line facade.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole TASK-414 writer for:

- new `core/services/assistant/capabilities/bookingCapabilityPack.ts`;
- new `core/services/assistant/capabilities/bookingActionContracts.ts`;
- new `core/services/assistant/capabilities/bookingActionAdapter.ts`;
- new `core/services/assistant/capabilities/commerceCapabilityPack.ts`;
- new `core/services/assistant/capabilities/commerceActionContracts.ts`;
- new `core/services/assistant/capabilities/commerceActionAdapter.ts`;
- new `core/services/assistant/capabilities/transactionalCapabilityPolicy.ts`;
- new
  `core/services/assistant/capabilities/bookingCommerceDesignerSidecarContributions.ts`
  with pure strict Designer sidecar descriptors;
- new `tests/vitest/assistant/bookingCapabilityPack.test.ts`;
- new `tests/vitest/assistant/bookingActionContracts.test.ts`;
- new `tests/vitest/assistant/commerceCapabilityPack.test.ts`;
- new `tests/vitest/assistant/commerceActionContracts.test.ts`;
- new `tests/vitest/assistant/transactionalCapabilityPolicy.test.ts`;
- new `tests/unit/assistant/bookingActionAdapter.test.ts`;
- new `tests/unit/assistant/commerceActionAdapter.test.ts`;
- new `tests/integration/assistant/agentBookingCapabilities.test.ts`;
- new `tests/integration/assistant/agentCommerceCapabilities.test.ts`;
- new `tests/integration/assistant/agentTransactionalCapabilityExclusions.test.ts`.

Forbidden: `core/services/booking/bookingService.ts`, booking read/query/Admin/
public route files, reservations/nonce/access/form submission services,
checkout/registry/runtime/webhook/payment/order code, commerce routes, DB schema/
migrations, existing oversized assistant action modules/registry, TASK-414-02
manifest owner, L01 files, TASK-547/Designer package code, shared route/Admin
mounts, shared docs/tasks/changelog, and every other leaf file.

If terminal native mutation/transaction seams are absent, mark that exact
support phase unavailable and amend its dependency owner; do not edit native
services also owned by TASK-414-09-L04. Any edited production/test file must
remain at most 1,000 lines; split cohesively first when required.

## Booking Capability Contract

Leaf-owned action contributions are exactly:

- `booking.resource.configure` — create an inactive resource or update an
  existing resource without accepting `status`; expected `updatedAt` on update;
- `booking.service.configure` — create an inactive service or update an existing
  service without accepting `status`/public access change; expected `updatedAt`;
- `booking.service-resources.set` — one service, at most 100 exact resource IDs,
  expected service `updatedAt`, atomic replacement; and
- `booking.schedule.replace` — one resource, at most 100 windows, expected
  resource `updatedAt`, atomic replacement.

Create forces `status: "inactive"`. Update preserves the existing status and
public access mode; changing/activating/deactivating a service/resource is not
part of v1. Editing an already active resource/service is allowed only when the
review explicitly labels public booking impact and the current optimistic token
still matches. If native product UX cannot preview that impact, the pack marks
active-target update unsupported.

Service input is an exact projection of native name/slug/description/duration/
buffers/price/currency and allowlisted non-secret settings. Resource input is
exact name/slug/type/timezone/capacity and allowlisted non-secret settings.
Schedule windows use native day/minute/timezone/isAvailable, are sorted,
deduplicated, non-overlapping, and bounded. Resource assignment IDs are loaded
in one set-based query under `booking:read`; missing, duplicate, wrong-kind, or
out-of-reviewed-result IDs fail before mutation. The single-installation API
accepts no caller-supplied `siteId`/`tenantId` discriminator.

Agent cannot list/read/create/update/cancel reservations, customer name/email/
phone/notes, submission payload, slot token, nonce, CAPTCHA, API-key access,
blackouts tied to customer operations, or automation/webhook settings. Those
types are absent from provider context, schemas, adapters, results, and audit.

## Commerce Capability Contract

Leaf-owned action contributions are exactly:

- `commerce.product.draft.create` — force `status: "draft"`;
- `commerce.product.draft.update` — only a currently draft product, expected
  `updatedAt`, no status/publishedAt field;
- `commerce.collection.create` — one collection;
- `commerce.collection.update` — expected `updatedAt`, allowed only when it is
  not currently referenced by a published product; and
- `commerce.product-collections.set` — one draft product, expected `updatedAt`,
  at most 50 exact collection IDs, atomic replacement.

Product input copies exact native title/slug/excerpt/description, one normalized
money/currency value, bounded stock representation, at most 20 trusted Media
IDs, at most 20 variants, and allowlisted public metadata/data fields. Unknown
metadata/data keys, secret-like keys, raw URLs, arbitrary JSON, provider product
IDs, and private attachment IDs fail. Every Media ID passes L01 provenance and
`media:read`; raw provider/remote image URLs are never accepted.

No action publishes/unpublishes a product, changes a published product, executes
checkout, chooses a payment provider, creates an order, charges/refunds money,
changes credentials/webhooks/tax/shipping secrets, performs inventory side
effects, or reads customer/cart/order data. Such intent returns
`assistant_commerce_transaction_unsupported` or Designer/needs-input with zero
actions. A future publish/payment capability requires a separate explicit
approval and native transaction/security contract.

## Transaction And Conflict Contract

Every update/replace action carries the exact parent's `expectedUpdatedAt` and,
where the terminal service exposes it, version/digest. The native mutation
checks the token in the same transaction/conditional SQL that writes. A
preflight read is review UX only and cannot authorize a later unconditional
write.

Multi-row assignments/schedules/product-collection operations use one
transaction and its provided `tx` for all reads/deletes/inserts/parent timestamp
updates. Uniqueness/FK/check constraints remain authoritative and map through
central native/Agent error helpers. External I/O/cache publication occurs after
commit only. Rollback produces no action-execution success, audit mutation, or
cache event. Idempotent replay returns the original result; a different current
token returns conflict rather than replaying stale intent.

Pack dry-run loads narrow authorized summaries only—never reservation/customer/
submission/order bodies—and shows exact before/after configuration, affected
resource counts, public impact, required permissions, and unsupported omitted
operations.

## Per-Resource Versus Designer Adapters

`BookingAgentProposalAdapterV1` and `CommerceAgentProposalAdapterV1` implement
TASK-414-05's per-resource interface only. They cannot implement or be assigned
to TASK-547's aggregate package adapter type. A prompt for a booking website,
store, catalog plus pages/menu/theme/forms, or complete booking/commerce setup
returns a Designer handoff and zero Agent actions. Designer package adapters may
later call the same native domain services under their own staged/promotion
contract; they do not become Agent tools.

`bookingCommerceDesignerSidecarContributions.ts` separately declares strict
`booking` and `commerce` sidecars for `DesignerSiteBundleV1`: exact schema/
normalizer/serializer IDs, stable keys/references, bounds, native stage/preview/
promote/read-generation adapter versions, permissions, and evidence. It excludes
reservations/customers/submissions/carts/orders/payments/refunds/credentials and
arbitrary JSON. TASK-414-08/09 consume these descriptors. No Agent action type
is assignable to a sidecar or aggregate Designer adapter.

## Security Contract

- **Visibility:** service/action contributions execute only through internal
  Agent plan/dry-run/execute routes. Existing public booking/form/commerce/
  checkout routes are neither called nor modified.
- **Auth:** authenticated Admin session. Actor/site/current resources, settings,
  permissions, targets, and Media provenance are server-resolved; provider/
  browser payloads are untrusted.
- **RBAC:** `assistant:use`; booking plan/dry-run `booking:read`, execute
  `booking:write`; commerce plan/dry-run `commerce:read`, execute
  `commerce:write`; trusted Media references additionally require `media:read`.
  No Agent action can use public session/API-key access as Admin authority.
- **CSRF:** internal plan/dry-run/execute mutations remain CSRF protected.
  Existing public booking/form/checkout nonce/HMAC/CAPTCHA policies are
  unchanged and not reused.
- **Rate limit:** `assistant` plus native booking/commerce mutation policies and
  strict resource/service/window/association/variant/media counts. Attempts and
  replays consume quota.
- **Validation:** recursive reject-unknown action inputs; exact enums/money/
  currency/timezone/minutes/IDs; native normalizers; expected parent state;
  set-based FK validation; transaction-only replacement; secret-key rejection.
- **Anti-abuse:** no new public write, so nonce/HMAC/reCAPTCHA are not applicable
  to Agent. Idempotency, optimistic CAS, bounded transactions, constraints, and
  no partial truncation are mandatory.
- **Secrets/privacy:** no reservations, customer/contact data, submissions,
  carts/orders/refunds, payment/webhook credentials, private attachments,
  provider output, permission snapshots, or driver errors in provider/browser
  state, cache, logs, audits, screenshots, or error DTOs.

## Implementation Pseudocode

```ts
export async function configureBookingService(
  raw: unknown,
  ctx: AuthorizedAgentContext,
  deps: BookingActionDeps
): Promise<BookingServiceSafeResultV1> {
  const action = normalizeBookingServiceConfigureActionV1(raw);
  return action.serviceId
    ? deps.mutations.updateServiceIfCurrent({
        id: action.serviceId,
        expectedUpdatedAt: action.expectedUpdatedAt,
        patch: projectBookingServicePatchWithoutStatusOrAccess(action.patch),
        actorId: ctx.actorId,
      })
    : deps.mutations.createService({
        ...projectBookingServiceCreate(action.create),
        status: "inactive",
        actorId: ctx.actorId,
      });
}

export async function replaceBookingSchedule(
  raw: unknown,
  deps: BookingActionDeps
): Promise<BookingScheduleSafeResultV1> {
  const action = normalizeBookingScheduleReplaceActionV1(raw);
  return deps.schedules.replaceIfParentCurrent({
    resourceId: action.resourceId,
    expectedUpdatedAt: action.expectedUpdatedAt,
    windows: normalizeAndBoundScheduleWindows(action.windows, 100),
  });
}

export async function updateCommerceDraft(
  raw: unknown,
  ctx: AuthorizedAgentContext,
  deps: CommerceActionDeps
): Promise<CommerceProductSafeResultV1> {
  const action = normalizeCommerceProductDraftUpdateActionV1(raw);
  const media = await deps.media.requireTrustedBatch(action.patch.mediaIds, ctx.actorId, 20);
  return deps.commerce.updateDraftIfCurrent({
    id: action.productId,
    expectedUpdatedAt: action.expectedUpdatedAt,
    patch: projectStrictCommerceDraftPatch(action.patch, media),
  });
}
```

## Data Flow

Provider operation draft → terminal L01 source-registry/native target resolution → strict
booking/commerce proposal → narrow authorized current state → bounded dry-run
diff/public-impact/exclusions → explicit review → expected-state native
transaction → post-commit cache/audit → safe result. Aggregate site/package or
transactional customer/payment intent exits with zero actions.

## Machine-Readable Errors

- `assistant_booking_action_invalid`, `assistant_booking_target_not_found`,
  `assistant_booking_conflict`, `assistant_booking_limit`,
  `assistant_booking_customer_data_forbidden`,
  `assistant_booking_reservation_unsupported`;
- `assistant_commerce_action_invalid`, `assistant_commerce_target_not_found`,
  `assistant_commerce_conflict`, `assistant_commerce_limit`,
  `assistant_commerce_published_resource_unsupported`,
  `assistant_commerce_transaction_unsupported`,
  `assistant_commerce_secret_forbidden`;
- native safe booking/commerce/constraint errors through centralized mappers.

Unsupported/customer/payment behavior is 403/422 with zero actions; stale
state is 409; unexpected driver/domain errors are redacted 500.

## Regression-Test Shape

- Strict schemas mutate every key/enum/count/ID/money/currency/timezone/minute/
  status/access/private/secret field and reject before service I/O.
- Booking create forces inactive; update preserves status/access; active-target
  public-impact review is mandatory or unsupported. Assignment/schedule 100
  succeeds, 101 fails without partial replacement.
- Reservation/customer/submission/nonce/slot token/blackout automation types are
  absent and fail at provider context, schema, adapter, result, and audit layers.
- Commerce create forces draft; update requires current draft; published product
  or published-linked collection fails; status/publishedAt/payments/orders/
  refunds/webhooks/credentials/private data cannot enter.
- Trusted Media IDs/provenance pass; raw/provider URLs and private attachment IDs
  fail. Variant/media/collection limits are exact.
- Concurrent updates/replacements return one success/one typed conflict; inject
  FK/unique/rollback/cache failures and prove transaction handle use, no partial
  association/schedule state, and post-commit-only effects.
- Per-resource adapter compile/runtime tests reject TASK-547 aggregate adapters;
  whole booking/store prompts produce Designer handoff and zero actions.
- Re-run terminal TASK-551 booking bounded-list/100-row parent-cap suites for
  every edited service path.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/bookingCapabilityPack.test.ts \
  tests/vitest/assistant/bookingActionContracts.test.ts \
  tests/vitest/assistant/commerceCapabilityPack.test.ts \
  tests/vitest/assistant/commerceActionContracts.test.ts \
  tests/vitest/assistant/transactionalCapabilityPolicy.test.ts
set -a && source .env && set +a
bun test tests/unit/assistant/bookingActionAdapter.test.ts \
  tests/unit/assistant/commerceActionAdapter.test.ts \
  tests/integration/assistant/agentBookingCapabilities.test.ts \
  tests/integration/assistant/agentCommerceCapabilities.test.ts \
  tests/integration/assistant/agentTransactionalCapabilityExclusions.test.ts \
  tests/integration/routes/bookingRoutes.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
wc -l core/services/assistant/capabilities/{bookingCapabilityPack,bookingActionContracts,bookingActionAdapter,commerceCapabilityPack,commerceActionContracts,commerceActionAdapter,transactionalCapabilityPolicy}.ts \
  core/services/booking/{bookingMutationService,bookingScheduleService}.ts \
  core/services/commerce/commerceService.ts \
  tests/vitest/assistant/{bookingCapabilityPack,bookingActionContracts,commerceCapabilityPack,commerceActionContracts,transactionalCapabilityPolicy}.test.ts \
  tests/unit/assistant/{bookingActionAdapter,commerceActionAdapter}.test.ts \
  tests/integration/assistant/{agentBookingCapabilities,agentCommerceCapabilities,agentTransactionalCapabilityExclusions}.test.ts
```

## Documentation Updates Required

Hand exact support/exclusion/action/RBAC/transaction/conflict/runtime receipts to
TASK-414-11-L01 for booking, commerce, security, Agent, capability cookbook, and
user docs. This leaf edits no shared docs, public routes, task board/status, or
changelog.
