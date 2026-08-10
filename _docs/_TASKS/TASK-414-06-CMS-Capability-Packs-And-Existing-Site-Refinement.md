# TASK-414-06: CMS Capability Packs And Existing Site Refinement
# FileName: TASK-414-06-CMS-Capability-Packs-And-Existing-Site-Refinement.md

**Parent Task:** TASK-414
**Priority:** High
**Category:** Agent / CMS Capabilities / Existing-Site Refinement
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-05 terminal; TASK-414-02-L01; TASK-414-03 terminal; TASK-547 terminal; TASK-548 terminal; TASK-551-03-L02 terminal; TASK-551-09-L02 terminal
**Related Tasks:** TASK-406, TASK-410, TASK-414-01
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Close the remaining bounded Agent capability gaps recorded by the historical
TASK-414 contract without reviving a whole-site Agent builder. Add explicit
capability packs for native content structure, nested/slot edits, brand/theme,
trusted media, installed-site refinement, booking, commerce, and prompt-specific
copy/media refinement.

Each capability pack is a strict L01-typed source contribution later compiled
by TASK-414-02-L02 into the one `CmsCapabilityManifestV1`, and an input to
TASK-414-05-L03's per-resource Agent proposal registry. A pack names its native schema/service owner, exact action families,
permissions, optimistic conflict tokens, limits, provider/tool requirements,
Guide evidence, Designer aggregate adapter relationship, and tests. A label is
not support: missing schema, service, conflict strategy, action handler, policy,
review UI, or evidence makes the capability unavailable.

Agent and Designer boundaries are explicit:

- **Agent:** one supported native resource, one directly owned nested structure,
  or one manifest-bounded same-kind batch; reviewed typed actions only.
- **Designer:** aggregate site/package graph adapters from terminal TASK-547 and
  TASK-414-07+; no aggregate adapter is assignable to Agent.

Whole-site or multi-domain refinement continues to return the TASK-414-05-L03
Designer handoff with zero Agent actions. Existing `site-kit.*` behavior is not
an Agent capability pack.

## Capability Coverage

The terminal child must cover or explicitly fail closed for:

- Page, Post, content entry, Content Type, Menu, and Form resources;
- Page section/block nested and named-slot edits with stable IDs/paths;
- entry bulk-draft and field patch plus menu/form structure patches;
- one theme profile's bounded design tokens, explicit activation, brand media,
  and trusted Media references with source/license/provenance;
- server-hydrated refinement of resources installed by a terminal TASK-547 run,
  without duplicate creation or browser-owned installer context;
- booking resources/services/resource assignment/schedules, excluding customer
  reservations and private submission data;
- commerce draft products/collections/associations; separately reviewed
  selection of an already configured checkout/payment adapter and disabled/
  explicitly enabled webhook configuration; still excluding cart/checkout
  execution, charges, orders/refunds, test deliveries, credentials, customer
  data, or autonomous publication;
- native Page image-gallery plus sibling video-block composition using existing
  Page playback fields, trusted Media/curated/staged provenance, and honest
  empty output when no
  semantically matched licensed asset exists;
- prompt-specific copy patches over exact native text fields/node IDs and media
  selection by trusted IDs only; and
- generated registry parity across manifest, action contributions, native
  policies, Agent proposal adapters, Designer package adapters, Guide evidence,
  Admin review surfaces, and tests.

## Sub-Tasks

| Order | ID | Exclusive responsibility | Status |
|---:|---|---|---|
| 1 | TASK-414-06-L01 | Content structure, nested/slot, installed-site, brand/theme, and trusted Media packs | ⏳ To Do |
| 2 | TASK-414-06-L02 | Booking and commerce typed per-resource packs and transactional exclusions | ⏳ To Do |
| 3 | TASK-414-06-L04 | Existing Page gallery/video composition with trusted curated/native/staged media; historical Gallery Mosaic excluded | ⏳ To Do |
| 4 | TASK-414-06-L05 | Reviewed ready-checkout selection and disabled/approved webhook configuration, never transaction execution | ⏳ To Do |
| 5 | TASK-414-06-L03 | Prompt-specific copy/media refinement, cross-industry fixtures, descriptor-local parity handoff and negative tests | ⏳ To Do |

Land strictly in the displayed order. Each leaf owns only its contribution/
native files. L03 reads L01/L02/L04/L05 outputs and owns the descriptor-local
inventory/parity preflight plus its handoff receipt; it does not emit or write
the final CMS capability artifact, TASK-548 composition sources, or generated
Guide outputs. TASK-414-02-L02 is their sole post-extension compiler/gate
writer after all TASK-414-03..10 contributions land. L03 does not rewrite the
other pack records or central oversized legacy action modules. TASK-414-09-L03
later mounts shared route/UI contributions. TASK-414-02-L02 owns capability
cookbooks, Assistant developer docs, Guide corpus, and generated docs parity;
TASK-414-11-L01 owns only its enumerated non-corpus closeout docs, status,
changelog, and complete runtime acceptance.

## Shared Pack Contract

```ts
export type AgentCapabilityPackV1 = Readonly<{
  capabilityId: string;
  resourceKind: CmsResourceKind;
  scope: "single-resource" | "owned-nested-structure" | "same-kind-batch";
  actionTypes: readonly string[];
  permissions: Readonly<{ read: readonly string[]; execute: readonly string[] }>;
  bounds: Readonly<Record<string, number>>;
  expectedState: readonly ("version" | "updatedAt" | "digest")[];
  mediaPolicy: "none" | "trusted-library-id" | "curated-catalog-id";
  designerAggregateAdapterId: string | null;
  evidenceIds: readonly string[];
}>;
```

Every pack and action schema recursively rejects unknown fields and uses only
stable native IDs/enums/normalizers. Provider output remains
`CmsOperationDraft`; server target/policy/pack resolution creates reviewed
actions. Pack outputs never accept raw SQL, HTML, CSS, JavaScript, template
code, arbitrary URLs, filesystem paths, credentials, permission lists, action
handlers, or native documents supplied directly by the provider.

Installed-site context comes from server queries and terminal TASK-547 run
ledger/resource keys. Browser hints are advisory. Missing/stale run ownership,
ambiguous resource key, changed native version, or unsupported adapter returns
needs-input/conflict with zero actions.

## Security Contract

- **Visibility:** capabilities execute only through internal authenticated
  Agent plan/dry-run/execute routes and native internal Admin services. No new
  public Agent write is added; existing booking/forms/commerce public routes
  retain their own separate security contracts.
- **Auth:** authenticated Admin session. Actor, current resources,
  capabilities, installed-run ownership, model/tool facts, permissions, and
  provenance are server-resolved; browser/provider context is untrusted.
- **RBAC:** every pack requires `assistant:use`, native read permission for
  plan/dry-run, and exact native write/activate/publish permission for execute.
  Theme, Media, booking, commerce, content, forms, and menus do not inherit one
  another's permissions. Designer adapters require separate Designer RBAC.
- **CSRF:** every internal plan/dry-run/execute or future pack mutation POST is
  CSRF protected. Existing public booking/form/checkout writes retain their
  nonce/HMAC/CAPTCHA/session/API-key policies and are not called by these packs.
- **Rate limits:** existing `assistant` plan/dry-run/execute budgets plus native
  domain mutation limits and per-pack action/record/byte ceilings. Attempts and
  idempotent replays count.
- **Validation:** recursive reject-unknown schemas, stable IDs/enums, native
  normalizers, expected version/`updatedAt`/digest, bounded collection counts,
  exact provenance/license records, and generated registry/handler/policy parity.
- **Anti-abuse:** no new public write, so nonce/HMAC/reCAPTCHA are not applicable
  to Agent endpoints. Durable idempotency, optimistic conflict checks, bounded
  transactions, no partial truncation, and native public-write hardening remain.
- **Secrets/privacy:** no credentials, provider output, permission snapshot,
  customer/reservation/order/form submission, private attachment text, arbitrary
  URL, unpublished body, or driver error in browser storage/cache, provider
  context beyond bounded redacted projections, logs, audits, screenshots, or
  error payloads.

## Fail-Closed Rules

- A manifest record with no exact action contribution/handler is unavailable.
- An executable action with no exact manifest/native policy/review evidence
  fails parity and cannot ship.
- A per-resource Agent adapter cannot import or emit a TASK-547 aggregate
  package/site-kit operation.
- A Designer aggregate adapter cannot be exposed through Agent's provider/tool
  context or action registry view.
- Unknown capability/resource/action/field/block/slot/media/license/booking/
  commerce values are rejected, not passed through.
- Over-limit work returns needs-input or Designer handoff; it is never silently
  truncated into a misleading partial success.
- Missing optimistic native support keeps a mutation capability unavailable
  until the native service owner lands it.

## Acceptance Criteria

- All named resource areas have explicit supported or machine-readable
  unavailable records; UI/provider wording never overclaims support.
- Existing-site refinement reuses exact server-owned resources/run keys and
  detects current-version conflicts/no-duplicate behavior.
- Nested/slot and same-kind batch actions are bounded and native-normalizer
  backed, with old documents remaining byte-compatible when untouched.
- Brand/theme changes use bounded token/profile actions; no arbitrary CSS.
- Media is selected/imported only through trusted library/curated IDs with
  durable attribution/provenance evidence; Agent attachments are never silently
  promoted to Media.
- Booking cannot read/write reservations/customer private data. Commerce/
  external configuration cannot execute payment/order/refund/webhook delivery,
  access credentials/customer data, or implicitly publish; only exact ready
  adapter and reviewed safe webhook configuration is supported.
- Gallery/video output uses only authorized native Media, exact licensed
  curated assets, or scanned Designer staging; unmatched media intent produces
  an explicit empty/needs-input result rather than an unrelated fallback.
- Copy refinement changes only exact text fields/nodes and keeps unrelated bytes
  identical; media refinement never accepts provider/raw remote URLs.
- Registry parity fails on every one-sided capability/action/policy/adapter/docs/
  review/test change and accepts intentional unsupported declarations.
- Whole-site intent still produces zero Agent/site-kit actions.
- Every touched production/test file is at most 1,000 physical lines.

## Testing Requirements

Each leaf runs its focused commands. Child integration additionally runs:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run scan:security:strict
bun run gates:coderso
git diff --check
```

Runtime smoke after integration covers at least five distinct real flows across
multiple industries: existing Page nested copy/media edit, Content Type/entry
refinement, Menu/Form structure edit, theme/brand trusted-media change,
booking configuration, commerce draft, and full-site Designer handoff. Every
flow asserts visible public/Admin effect or explicit fail-closed UI, light/dark,
responsive geometry where relevant, publish→front parity when publication is
in scope, zero console errors, and scoped cleanup.

## Documentation Updates Required

This child writes no shared documentation. TASK-414-02-L02 consumes its
capability receipts and solely writes `docs/develop/assistant.md`, the extension
cookbook, booking/commerce/theme Guide pages, composition registries, and
generated docs/capability artifacts. TASK-414-11-L01 consumes architecture/API/
media/security runtime receipts only for its enumerated non-corpus closeout
documents and alone edits task statuses/board and changelog 1266.
