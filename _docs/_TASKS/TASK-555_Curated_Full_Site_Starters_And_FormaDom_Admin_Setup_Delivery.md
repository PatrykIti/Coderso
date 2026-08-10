# TASK-555: Curated Full-Site Starters and FormaDom Admin/Setup Delivery
# FileName: TASK-555_Curated_Full_Site_Starters_And_FormaDom_Admin_Setup_Delivery.md

**Priority:** High
**Category:** Solution Kits / Setup / Full-Site Packages / Admin UX / Security
**Estimated Effort:** Very Large
**Dependencies:** terminal TASK-545 workflow/evidence authority; terminal TASK-548
source/generator handoff; terminal rewritten TASK-489; terminal TASK-547; terminal
TASK-551 base TASK-489 retention/cache/query receipts; terminal TASK-554 shared
security handoff; terminal TASK-414-02-L01 pure capability-schema/source-adapter
receipt with the exact contribution discriminators consumed below. If those
discriminators are absent, capability contribution is an external TASK-414 blocker,
not permission to invent a TASK-555 schema. TASK-489's completion receipt must also
prove terminal TASK-414-03-L03 route transport. TASK-555-06-L01 is the serialized
post-migration owner of curated lineage retention; TASK-551 is not required to preserve
rows/tables that do not yet exist.
**Related Tasks:** TASK-414, TASK-489, TASK-545, TASK-547, TASK-548, TASK-551, TASK-554, TASK-556
**Status:** ⏳ To Do
**Changelog:** 1269 pinned (closure only)

---

## Overview

Ship one provider-free curated-starter product surface that lets an authenticated
administrator discover, review, preview, install, validate, inspect, and roll back
both the existing catalog Solution Kits and the terminal TASK-547 FormaDom full-site
package. FormaDom is a fixed server-selected package, not a
`SolutionKitDefinition`, provider action, prompt result, URL import, path import, or
browser-supplied package.

The same strict, bounded read model and domain service feed both the Solution Kits
Admin page and Setup Wizard. Installation always starts from a server registry ID,
requires a fresh actor-bound preview, replans against the live baseline, and records
its provider/release provenance in the existing Solution Kit run ledger. TASK-489's
terminal run-history and source-run rollback surface remains the operational history
owner; TASK-555 widens its safe projection to curated full-site runs rather than
creating another lifecycle ledger. After TASK-555 lands, both the curated rollback
routes and TASK-489's generic exact-run route call one server-verified composite:
curated lineage members must pass active-head/reservation coordination, while sources
with no curated evidence alone may use TASK-489's engine-only dispatcher.

TASK-555 consumes TASK-414-02-L01's pure capability schema and TASK-414-03-L03's
transport through TASK-489. Both leaves are authored (`⏳ To Do`) in the parallel
TASK-414 worktree but are not yet terminal; they must be terminal before TASK-555
implementation dispatch, and this family carries an explicit external blocker for
them. TASK-555 does not wait for a later TASK-414 product leaf beyond those two.
TASK-555 owns the product-neutral optional Admin route metadata and
curated-starter capability contribution that the remaining TASK-414 program
consumes after TASK-555 is terminal. TASK-556 is the explicit post-terminal
bridge that consumes both terminal products. TASK-555 is fully usable when every LLM/provider is
disabled or offline and must not import, call, or depend on Agent, Designer, assistant
planning, provider credentials, or model availability. Natural-language requests to
create a bespoke full site remain Designer-only; selecting a fixed curated starter is
a normal Admin action with no model.

## Verified Baseline at Authoring HEAD

Authoring correction was grounded at
`b70e0fe3c2e19f63c75cd31213de6cb19a05dd09`. Owner-requested root
`AGENTS.md`/`.gitignore` changes and unrelated `_TMP-*` handoffs were present and are
outside this family's ownership.

- `core/services/kits/solutionKitTypes.ts` owns six server IDs, including
  `local-service-business`; `core/admin/services/solutionKitsClient.ts` and
  `solutionKitSelection.ts` duplicate only five and reject the valid sixth item.
- `StarterContentStep.tsx` offers `blog-starter`, `business-starter`, and
  `portfolio-starter`, none of which is accepted by the server catalog.
- `starterContentClient.ts` expects preview/apply DTOs with labels/items and
  `createdCount`, while `setupRoutes.ts` currently returns the install summary and
  `{runId,summary}`. The current flow is therefore contract-drifted.
- `AdminApp.completeSetup` resends `toBasicSettingsPayload(values)`, so stale wizard
  defaults can overwrite FormaDom's effective `site.name="FormaDom Studio"` and
  `site.locale="pl"` after a successful starter apply.
- The checked-in FormaDom package is
  `_docs/_DEMO/projekty-domow.site.json`; its current bytes are 288,066 with SHA-256
  `307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870`.
  The production Docker image copies `core`, `docs`, `packages`, `themes`, and
  `store`, but not `_docs` or `scripts`, so the package is unavailable to production
  runtime code.
- `SolutionKitsPage.tsx` describes installation as an LLM Guide handoff even though a
  fixed curated install needs no model. TASK-489 must first land its rewritten,
  terminal history/rollback UI; TASK-555 then preserves that UI while correcting the
  install path and copy.
- Four identities are distinct and MUST NOT be conflated: artifact byte SHA-256
  `307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870`,
  terminal TASK-547 normalized `packageFingerprint`
  `418691434dcb4bc8044bad3789a031a59e71e8fb3783503522e1b30554f0a470`,
  twelve-file reference-source digest
  `d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`, and
  TASK-555's domain-separated `releaseDescriptorDigest`.
- TASK-547 truthfully declares exactly seven visual residual IDs. TASK-555 exposes
  them unchanged; it does not add media, favicon, theme-color, arbitrary CSS, or a
  new package resource kind to conceal them.

## Product Boundaries

### In Scope

- One immutable runtime-shipped FormaDom release artifact and strict release
  manifest with semantic release version, compatible core range, byte count, and
  lowercase SHA-256 digest.
- One closed curated-starter registry representing all six legacy catalog kit IDs
  through a `solution-kit` provider variant and FormaDom through a
  `full-site-package` provider variant.
- One shared strict DTO/normalizer family for list, option, detail, preview, apply,
  installed status, validation receipt, rollback result, resources, residuals, and
  effective settings.
- Internal Admin list/detail/options, preview/apply, status/validate, and rollback
  routes under the existing `/admin/api/solution-kits/*` and
  `/admin/api/setup/starter-content/*` families.
- Retirement of the legacy `POST /solution-kits/:id/apply` HTTP/client mutation so
  none of the six catalog starters can bypass the mandatory curated preview proof.
  Legacy list/detail/navigation and deterministic plan remain read-only contracts.
- Actor-bound ten-minute previews tied to starter ID, provider kind, release
  version/digest, package fingerprint, plan fingerprint, and live-baseline
  fingerprint. A preview ID is required for apply and is never persisted in browser
  storage.
- Apply-side replan, stale-preview rejection before writes, explicit settings
  takeover, deterministic actor/starter/preview/idempotency run identity,
  committed-success preservation
  across post-commit cache/audit failures, and effective `site.name`/`site.locale`
  response values.
- TASK-489 run-history and exact source-run rollback handoff for both provider
  variants, including prior shell/settings restoration, exact
  `success|failed|recovery_required` results, and one shared route composite that
  prevents generic-route lineage bypass.
- One DB-authoritative curated-starter lineage/reservation row per starter, with a
  positive version, active head, fenced pending apply/rollback identity, and exact
  source/predecessor relation. Run-history events are evidence, not uniqueness state.
- One crash-safe legacy curated coordinator that keeps the source run nonterminal
  through core resources, templates, and three-key shell CAS before one terminal
  finalization transaction.
- One requested-owner full-site finalization seam whose transaction callback owns
  terminal run success, lineage advancement/clear, and backend-specific invalidation
  receipt atomically; its separate failure callback may clear apply reservation only
  after proving exact zero net mutation. Partial or unprovable settlement retains the
  same reservation for reconciliation.
- Installed release, three-way drift, same-release reapply/update policy, bounded
  validation receipt, serialized lineage-aware retention, explicit historical
  FormaDom reconciliation, Admin status UI, Setup flow, docs, and shared runtime smoke.
- Separate terminal TASK-414-compatible route, Admin-control, native, cache, smoke, and
  feature source-adapter descriptors plus exact Guide atomic-control, workflow, and
  section-binding source relations. Routes/controls are never fields invented inside
  `CmsFeatureCapabilityV1`; remaining TASK-414 work later composes the descriptors into
  the final CMS capability inventory.

### Out of Scope

- Provider/model calls, LLM Guide actions, Agent/Designer implementation, prompt
  routing, natural-language full-site generation, or provider-backed copy/media.
- Any public starter endpoint or public starter write. No public nonce, HMAC, or
  reCAPTCHA contract is introduced because the entire starter API remains internal.
- Browser-supplied package JSON, package paths, filesystem paths, module paths,
  URLs, artifact digests, release manifests, provider kinds, or arbitrary blueprint
  bodies.
- Persisting package bytes, package documents, preview proofs, live snapshots,
  before/after snapshots, or validation internals in `localStorage`, session storage,
  IndexedDB, URL state, debug handles, screenshots, or reports.
- Media import, favicon installation, document-head theme color, raw SVG/CSS/JS,
  new full-site package resource kinds, or modifications to TASK-547's seven
  residual claims. These remain explicit product gaps, not schema hacks.
- A second install ledger, second rollback engine, second runtime-smoke lifecycle,
  or replacement of TASK-489 run history.
- Migration of the current internal Assistant `site-kit.install` service-call path.
  TASK-555 retires bypass only on its Admin Solution Kits and Setup HTTP/client/UI
  surfaces; terminal TASK-414 later migrates the Assistant path before TASK-556.
- Editing or regenerating
  `core/generated/cms/coderso-cms-capabilities-v1.json`; that final projection remains
  a later TASK-414 owner. TASK-555 owns only its pure contribution, Guide source
  relations, and TASK-548-generated documentation bytes.

## Locked Architecture

### Curated registry and release identity

The persisted registry source-identity union is closed:

```ts
type CuratedStarterSourceV1 =
  | { kind: "solution-kit"; kitId: SolutionKitId }
  | {
      kind: "full-site-package";
      releaseKey: "formadom-studio@1.0.0";
    };
```

The registry contains exactly the six current `solutionKitIds` plus
`formadom-studio`. Registry lookup is the only way to select a provider. The
FormaDom descriptor points to a literal module-owned artifact location; neither a
request value nor environment variable can choose a path. The release manifest is
strict, immutable, and pinned to:

- `starterId`: `formadom-studio`;
- `releaseVersion`: `1.0.0`;
- `coreCompatibility`: `>=1.0.0 <2.0.0`;
- `packageSchemaVersion`: `1`;
- `packageKey`: `formadom-studio`;
- `artifactBytes`: `288066`;
- `artifactSha256`:
  `307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870`.

The manifest also pins terminal TASK-547 `packageFingerprint`
`418691434dcb4bc8044bad3789a031a59e71e8fb3783503522e1b30554f0a470` and
provenance-only `referenceSourceDigest`
`d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`.
All descriptor digests use the exact frame
`u32be(domainUtf8.length)||domainUtf8||u64be(payloadUtf8.length)||payloadUtf8`.
`releaseDescriptorDigest` is lowercase SHA-256 with domain
`coderso.curated-starter.release-descriptor.v1` over one provider-discriminated
canonical recursively-key-sorted JSON preimage. A `solution-kit` preimage has exactly
`starterId,providerKind,releaseVersion,coreCompatibility,catalogDefinitionDigest`.
A `full-site-package` preimage has exactly
`starterId,providerKind,releaseVersion,coreCompatibility,packageSchemaVersion,
packageKey,artifactBytes,artifactSha256,packageFingerprint`. No field from one arm is
optional or legal in the other arm.
Each catalog definition digest uses the same frame, domain
`coderso.curated-starter.catalog-definition.v1`, and the owner-normalized
`SolutionKitDefinition`. None substitutes for another identity.

The six catalog releases all pin `releaseVersion: "1.0.0"` and
`coreCompatibility: ">=1.0.0 <2.0.0"`. Their checked-in definition and release
descriptor digests are literal contract values:

| Starter | `catalogDefinitionDigest` | `releaseDescriptorDigest` |
|---|---|---|
| `automotive-workshop` | `772c0232574d918a00bbd9b199d08bf1c4b2fe12c5cc54ef7abc9d9f29fac31d` | `c308a0f9a2a4603eb1983daae5c567ab9425f80c2979319e0a65a62fc79f36e8` |
| `medical-clinic` | `15294fdb293f1adbb9d13b81aca14c835f2dc2a6f4663a8aaba43f7234be3136` | `b72d220ad79bdf8be22e2e0004f427b345d8357d6b552bc37365ddbeb09359aa` |
| `beauty-salon` | `9685c13d36c216a90ef3ce4fce98b64e0013ec21c647a1d798c1bde5efa1213f` | `6b75fc86e71f2e7dac065eadf676f978c728773255463d55ca1940745678b60d` |
| `local-service-business` | `a0af5ba4d23fd69f1d00a2670c8baeee250d6f04edea7fa45c972bc666bfe2e8` | `d4a7cf0c3f7006926d7f25301b1edc8b903aad9ba10136efacbae05720e96f80` |
| `services-directory` | `bc5ef2572c36bb4aa7eb7ee47228438541beb154c0e1ae1e887616498050eaa7` | `a82120f20ac35a1cde9cac7e67cd7b9a9c8762d0849d74aeb034b2edb46770e7` |
| `small-ecommerce` | `9e68e824c13a3ed4bb037444ee7bd8b8c01d7e7ee67e69e316610369f74af13b` | `fc3713425238440a35d77a2961b881c1a89a47a9f920e64fc85aa05b260a2c69` |

FormaDom's descriptor digest is
`a4a98f5c462b65c18200c2c97d84b7c86b440454068c6be6bf172ed9502e6952`.
Changing any owner-normalized catalog definition or the FormaDom descriptor requires
an intentional release bump and regenerated literal; computing expected and actual
from the same mutable runtime object is not an integrity check.

Generation remains development tooling. Runtime artifact and compatibility mirror
writes are independently atomic and then pair-consistency checked; they are not one
atomic filesystem transaction. Runtime reads the checked-in artifact,
verifies byte cap/count/digest/core compatibility, parses strict JSON, normalizes it
through the TASK-547 package owner, and verifies package fingerprint/registry
identity before migrations or any DB access. Runtime never generates a package and has no fallback
to `_docs`, `scripts`, a URL, or a caller path.

### Shared read model

Public-to-Admin DTOs expose only bounded summaries. They may include safe starter
identity, provider kind, release version/digest/core range, locale, feature/module
labels, resource counts and safe labels, the exact seven residual descriptions,
post-install checklist entries, operation counts, run IDs, timestamps, effective
name/locale, public paths, status, machine-readable warning codes, and TASK-489's
bounded rollback `packageKey`/`safeErrorCode`. They never
include a `FullSitePackageV1`, `SolutionKitDefinition.resourceBlueprint`, filesystem
location, raw desired documents, before/after snapshots, rollback actions, package
bytes, actor ID, or settings values other than the explicitly returned effective
name/locale.

Release identity is provider-discriminated. A `solution-kit` release carries
`catalogDefinitionDigest` and has `packageFingerprint/artifactSha256: null`; a
`full-site-package` release carries `packageFingerprint/artifactSha256` and has
`catalogDefinitionDigest: null`. Both carry their own
`releaseDescriptorDigest`; no shared field is populated with a differently
defined digest merely to satisfy one DTO shape.

### Lineage and reservation authority

TASK-555 adds `curated_starter_lineages`, initialized with exactly one row for each of
the seven registry starters and these typed columns: `starter_id` primary key; positive
`version`; nullable `active_head_run_id`; nullable pending operation
`apply|rollback`; deterministic `pending_reservation_id`; nullable
`pending_preview_run_id`, `pending_requested_run_id`, `pending_engine_run_id`,
`pending_source_run_id`, and `pending_predecessor_run_id`; `lease_token`, positive
`lease_fence`, `lease_expires_at`; and `created_at`/`updated_at`. Active, preview,
requested, engine, source, and predecessor run references use the existing
`solution_kit_install_runs` relation whenever non-null. Named checks enforce positive
versions/fences, the operation enum, and operation-specific pending shapes. Apply has
non-null preview/requested-run ownership, null source/engine, and an exact predecessor
equal to the expected active head or null for a first install. Rollback has null
preview/requested-run, an exact source equal to the active head, a predecessor that may
be null, and an engine run that transitions from null to the verified TASK-489 relation.
Unique partial indexes protect non-null active/requested/engine run ownership. A lease
expiry never authorizes blind takeover: recovery first proves the reserved relation has
no unresolved committed phase.

For apply, provider replan occurs while its writer fence is held; deterministic
requested-run insert-or-verify, preview JSONB claim CAS, and lineage predecessor/head
reservation occur in one DB transaction. Full-site consumes terminal TASK-551's
cohesive `legacyInstallRunPersistence/lockLifecycle.ts` and L02 extracts only its
package-lock responsibility into
`core/services/kits/legacyInstallRunPersistence/packageLockReservation.ts`:
after the existing global/package locks are acquired, a server-only requested-owner
callback performs exact requested-run insert/verify, preview claim CAS, and lineage reserve
inside the package-lock reservation transaction before provider work. Generic TASK-547/
TASK-489 calls omit that callback and retain their behavior. The 1,075-line
predecessor facade is split by terminal TASK-551 (to be landed before this family
starts); TASK-555 does not reopen its root barrel or TASK-489's `ledgerAdapter.ts`.
`lockLifecycle.ts` retains owner-lease/direct-
session behavior and stable package-lock re-exports while the new module becomes the
sole package-lock/requested-owner implementation; both remain below 1,000 lines. The table, not a latest-event
heuristic, is the branch/active-head authority. For rollback, one transaction locks
the lineage row and reserves the exact active source/head and predecessor before any
TASK-489 call; it creates no wrapper/requested install run. Its deterministic
reservation ID uses the same framed SHA-256-to-UUID conversion with domain
`coderso.curated-starter.rollback-reservation.v1` over exact-order
`starterId,sourceRunId,predecessorRunId,lineageVersion`. Replay first reads the
reserved engine relation, or discovers and verifies TASK-489's exact source relation,
then persists/resumes it; it never blindly invokes the rollback dispatcher again.

Before preview is persisted, L06 performs a bounded read-only resulting-chain check.
The apply claim transaction then locks all seven lineage rows in `starter_id` order and
repeats the authoritative check before preview CAS or requested-run insert: appending
the proposed successor must leave its starter depth at most `512` and the deduplicated
aggregate across all seven chains at most `3_584`. A gap, cycle, duplicate cross-starter
owner, depth `513`, or aggregate `3_585` throws
`curated_starter_lineage_limit_exceeded` with zero preview-claim/run/reservation write.
The retention caps are therefore creation-time invariants as well as prune-time guards.

The migration includes the exact seven-row seed, SQL, schema export, snapshot, and
journal update allocated from the live terminal journal, plus the exact indexed
historical-candidate predicate. It is transactional: the new table/indexes take their
normal creation locks, the candidate index takes a bounded `SHARE` lock on the existing
run table, there is no existing-heap rewrite or data backfill, and only seven seed rows
are inserted. Deploy order is migration -> compatible application -> optional fixed
reconciliation command -> smoke. A pre-product failure rolls the migration back; after
any non-seed lineage/audit state exists, recovery is forward-fix only rather than a
destructive down migration.

L06 owns the typed repository, the serialized successor update to
`solutionKitRetentionService.ts`, and one explicit internal FormaDom reconciliation
command/service. That command holds the current writer fence, locks the initialized
null-head row, accepts only one exact successful terminal TASK-547 package-key/
fingerprint candidate with complete bounded evidence, and adopts it while calling
TASK-489's deterministic `logAuditOnceTx` in the same transaction. It stores no
imaginary reconciliation-receipt column: idempotent replay verifies the existing head
and exact audit identity/metadata. Zero/two candidates, a current writer, pending state,
or changed evidence fails closed; status GET remains read-only. More than one eligible
historical head, a missing predecessor, cycle, depth/aggregate cap breach, or an
inconsistent chain is `unknown`/recovery-required and is never selected by recency.

After migration, TASK-555-06-L01 is the retention authority for every non-null active
or pending lineage run and the complete transitive `supersedesRunId` predecessor chain.
It composes those roots with TASK-551's base TASK-489 anchors, walks at most 512 links
per starter/3,584 total, and fails with zero delete on a gap, cycle, or overflow. Every
delete batch reacquires the current writer fence, locks/rechecks all seven lineage rows,
and rebuilds the bounded root set before child-first deletion. There is no future
handback to TASK-551 and no unbounded predecessor walk.

### Preview and apply

Preview is a persisted `dry_run` in the existing run ledger because planning reads
live resources and records an auditable operation trace. Its strict run options carry
a bounded `curatedStarter` envelope, not package bytes:

```ts
type CuratedStarterRunContextV1 = {
  schemaVersion: 1;
  starterId: CuratedStarterId;
  providerKind: "solution-kit" | "full-site-package";
  releaseVersion: string;
  releaseDescriptorDigest: string;
  catalogDefinitionDigest: string | null;
  packageFingerprint: string | null;
  baselineFingerprint: string;
  planFingerprint: string;
  previewId: string | null;
  supersedesRunId: string | null;
  expiresAt: string | null;
  claim: null | {
    state: "available" | "claimed";
    applyRunId: string | null;
    scopeDigest: string | null;
    claimedAt: string | null;
  };
  settingsTakeoverKeys: string[];
  managedLineage: null | {
    schemaVersion: 1;
    items: Array<{
      position: number;
      resourceIdentity: string;
      currentId: string;
      inheritedManagedBaseDigest: string | null;
      targetReleaseDigest: string;
      liveAfterDigest: string;
      disposition: "create" | "update" | "noop" | "preserve";
    }>;
  };
  settingTransitions: Array<{
    key: "site.homepageId" | "site.navigationMenuId" | "site.footerTemplateId";
    before: { present: false } | { present: true; value: JsonValue };
    after: { present: false } | { present: true; value: JsonValue };
  }>;
  postCommit: null | {
    schemaVersion: 1;
    validationReceipt: CuratedStarterValidationReceiptV1 | null;
    audit: {
      eventId: string;
      payloadDigest: string;
      state: "pending" | "complete" | "deferred";
    };
    invalidation:
      | null
      | {
          backend: "redis";
          eventKey: string;
          planDigest: string;
          state: "pending" | "durable" | "applied";
        }
      | {
          backend: "memory";
          receiptId: string;
          planDigest: string;
          committedPlan: CuratedStarterInvalidationPlanV1;
          state: "committed" | "applied";
        };
    warningCodes: CuratedStarterWarningCode[];
  };
  effectiveSettings: { siteName: string; siteLocale: string } | null;
};
```

The context is recursively strict and at most 512 KiB canonical UTF-8. Lineage
contains only bounded identities, digests, and dispositions, never package
documents or resource snapshots. `settingTransitions` stores only actual
provider-specific changes. Legacy may store only the three shell keys shown above;
each transition preserves own-property absence separately from a present `null`.
Full-site settings remain entirely TASK-547 engine-owned, so a full-site curated run
stores an empty transition array and TASK-555 never restores those settings itself.
All transitions and post-commit internals remain server-only and are excluded from
every safe DTO.
`currentId` is the exact provider-native resource ID recaptured under the writer
fence; `resourceIdentity` remains the canonical logical provider identity and cannot
substitute for it.

`managedLineage.items[].disposition:"preserve"` is curated evidence, not a supported
native engine operation. L06-L02's internal decision vocabulary is exactly
`disposition:"preserve_live"` plus `releaseTargetDigest`; the persistence boundary maps
those names explicitly to `disposition:"preserve"` plus `targetReleaseDigest`. L02 then
maps that decision through an exact provider bridge: legacy skips its resource handler;
full-site supplies a verified live target to `preparedSaga.ts`. Both recapture the live
owner under the writer fence, emit only native/ledger `noop`, and retain target/live
digests in managed lineage. They never pass `operation:"preserve"` to a provider,
initialization plan, or install-item row, never pretend user-edited live bytes equal
release bytes, and never promote the live digest into the inherited release base.

Preview TTL is exactly ten minutes. Apply requires route starter ID, preview run ID,
a 16..128-character idempotency key, and explicit
`confirmSettingsTakeover:boolean`. The server loads the preview by UUID, requires the
same authenticated actor without revealing cross-actor existence, reloads the current
release, replans under the provider's mutation coordination boundary, and requires
release/package/plan/live-baseline/takeover equality before the first resource write.

The preview claim remains strict replay evidence inside its run `options` JSONB, but
it is no longer the active-head or branch authority. TTL is exactly `600000` ms and
same-actor validation precedes claim disclosure. Under the same fenced transaction
that creates/verifies the requested run and reserves the lineage row, one conditional
JSONB CAS changes `available/null` to `claimed/applyRunId/scopeDigest/claimedAt`; the
same scope replays and another scope conflicts. The raw key never persists.
`scopeDigest` uses the frame above, domain
`coderso.curated-starter.apply-idempotency.v1`, and canonical JSON fields in exact
order `actorId,starterId,previewId,idempotencyKey`. `runId` takes digest bytes
0..15, sets byte 6 to `(byte6 & 0x0f) | 0x50`, byte 8 to
`(byte8 & 0x3f) | 0x80`, then formats lowercase RFC-4122 text. Only digest/run ID
persist. The existing `solution_kit_install_runs.id` primary key remains requested-run
idempotency authority, while `curated_starter_lineages` is active-head/reservation
authority; neither replaces the install ledger. Duplicate requests load and verify
the exact run plus reservation/fence, then resume recovery or replay the authoritative
result. They do not rerun provider/resource writes.

Apply returns the effective site name and locale plus the full bounded validation
receipt read from authoritative committed run context. Setup immediately patches
those values into current wizard state. Its settlement barrier returns the
authoritative post-settlement values, or Finish reads the controller's latest snapshot
after awaiting it; Finish never captures `current` before the await.

The legacy provider has one `legacyCuratedApplyCoordinator` and always forces
`continueOnError:false`. Its requested source run remains nonterminal while core
resources, template operations, and the presence-aware three-key shell CAS complete.
It persists each phase and recovery/compensation receipt. One transaction then marks
the source run terminal, installs managed lineage, advances/clears the fenced lineage
  reservation, and persists the backend-specific server-cache invalidation receipt
  when actual writes changed at least one terminal TASK-551 cache tag; otherwise it
  persists strict `invalidation:null`. A crash or
partial commit resumes exact completed phases; failure compensates exact mutations or
returns failed/reconciliation-required without reporting success or advancing the
head. Actual committed compensation/finalization mutations emit their actual
invalidation plan.

The full-site requested-owner object has three transaction-scoped callbacks. Reservation
claims preview/run/lineage before provider work. Terminal success replaces generic owner
finalization and, in one transaction, verifies the native owner/fence and curated
reservation, computes the run summary, finalizes the install run, installs managed
  lineage, advances/clears the lineage row, and persists the backend-specific server-
  cache invalidation receipt or strict null under the same actual-tag rule. The failure
  settlement callback may mark the run failed, leave the active head
at its exact predecessor, and clear reservation only after locked owner/item/native-
state evidence proves zero net apply mutation. TASK-551 engine transactions retain
their actual compensation invalidation receipts. Partial compensation, fence loss, or any unresolved state invokes
neither terminal callback and retains the same run/reservation as
`curated_starter_reconciliation_required`. Crash-before-commit leaves every member
pending; crash-after-commit replay verifies the complete atomic tuple and performs zero
provider mutation.

Post-commit identities are deterministic. Audit uses one deterministic UUID inserted
through a narrow successor helper over `audit_logs.id`; conflict loads and verifies
the exact sanitized identity instead of writing another random row. The full bounded
  `CuratedStarterValidationReceiptV1`, audit identity/digest, and nullable server-cache
  invalidation identity/digest persist in strict run context. Same-key apply replay first resumes validation,
audit, and invalidation recovery, then projects the result. It performs zero provider/
resource writes but may perform required idempotent receipt-recovery writes. Status GET
is read-only.

When at least one actual mutation maps to a terminal TASK-551 server `CacheTag`, Redis
mode writes exactly one durable outbox plan in the terminal mutation transaction and
awaits immediate `applyAfterCommit`; its worker/fence recovers a transport failure.
Memory mode writes no outbox row: the same transaction persists the committed bounded
plan in run context, then the service awaits in-process `applyAfterCommit`; replay
applies an unapplied committed plan idempotently. A lineage/status/run-history-only or
all-noop result stores `invalidation:null` and creates no speculative server tag/outbox;
the strict Admin result still drives TASK-555-04-L01's browser invalidation. Cache
transport failure never reverses committed success, but remains a bounded recoverable
warning.

Both `POST /solution-kits/runs/:runId/rollback` and the curated Solution Kits/Setup
aliases call `rollbackServerVerifiedSolutionKitRun`. It first classifies exact source
membership from the locked lineage/run evidence. Any active, pending, reconciled, or
predecessor-chain curated source stays on the curated branch; an older non-head rejects
before engine work. Only a source with no curated evidence may delegate directly to
TASK-489's engine-only dispatcher.

The curated branch transactionally reserves only the lineage table's active head and
delegates resource rollback to terminal TASK-489 after reservation. A retry resumes the
persisted reservation and exact engine relation. TASK-555 consumes TASK-489's exact
`success|failed|recovery_required` result union. After `success`, TASK-489 has already
completed its dispatcher-owned legacy Setup settings CAS or full-site engine
restoration; TASK-555 performs no second settings restore. Both `failed` and
`recovery_required` preserve exact `packageKey` and non-null `safeErrorCode`. A terminal
`failed` result is HTTP 200 and, under repaired TASK-489 semantics, proves zero net
rollback mutation. TASK-555 therefore atomically clears the matching pending rollback
reservation while leaving the active head unchanged; a later user action may claim a
fresh exact retry and must not resume the terminal failed owner. `recovery_required`
remains HTTP 202 with exact `summary:null`; it retains the same reservation, source, and
engine owner because terminal ownership or net state is unresolved. Both expose no
effective settings. Recovery is never a signal to dispatch again. Success atomically
advances the head to the exact predecessor (or null), clears the reservation, and
persists no TASK-551 server plan for lineage/status-only state. TASK-489
remains the sole writer of centralized rollback audit and actual-resource/history
invalidation; TASK-555 never reuses its apply audit helper for rollback.

### Installed state and drift

Installed identity comes from `curated_starter_lineages.active_head_run_id`, joined to
one successful, non-rolled-back authoritative run and its bounded items,
not natural-key matching, browser selection, or `listLatest...3`. Existing TASK-547
FormaDom runs with the exact package key/fingerprint are visible only as read-only
reconciliation candidates until the fixed internal reconciliation command adopts one
unique candidate under the current writer fence. Ambiguous or mismatched rows remain
`unknown`, never silently adopted. Each
successful reapply names the reserved predecessor through `supersedesRunId`;
inconsistent table/run evidence, gaps, cycles, or a missing retained predecessor fail
`unknown`. Successful rollback of the reserved active head returns to its predecessor
or `not-installed` deterministically.

Before product exposure, the legacy provider must use the landed native writer fence,
perform preview CAS while fenced, and require landed managed-evidence safety; a
preflight-only check is insufficient. Three-way comparison is whole-resource and
deterministic. The inherited managed-base digest comes from lineage, not from a prior
`preserve` run's live after-state:

1. base = exact installed after-state from the source run;
2. live = current native owner projection;
3. target = current curated release desired state.

Same-release reapply and upgrades automatically touch only unchanged/converged
resources. User-only changes are preserved. Conflicting user+release changes, missing
managed IDs, unmanaged collisions, or stale previews block before writes. The sole
exception is a provider-owned allowlisted setting collision classified as an explicit
takeover candidate: preview records exact presence/value and apply must confirm the
identical sorted key set. Legacy permits only its three shell keys; full-site setting
eligibility remains TASK-547-owned. Non-setting unmanaged collisions always fail.
This family
ships one server release, so downgrade is unreachable and no downgrade promise, UI,
route, or error ships. A future multi-release task must define it. Exact TASK-489
source-run rollback remains available.

### Capability and Guide handoff

After terminal TASK-414-02-L01 and terminal TASK-548, TASK-555 owns six sibling pure
descriptor/source identities:

| Kind | Stable ID |
|---|---|
| route | `core:solution-kits/curated-starter-routes` |
| Admin control | `core:solution-kits/curated-starter-controls` |
| native | `core:solution-kits/curated-starter-domain` |
| browser cache | `core:solution-kits/curated-starter-admin-cache` |
| runtime smoke | `core:solution-kits/curated-starter-runtime-smoke` |
| feature/source adapter | `core:solution-kits/curated-starter-lifecycle` |

The route source owns the exact fourteen API facts below; the control source owns the
twelve exact terminal `AdminControlDescriptorV1` facts declared by 03-L03; native,
cache, and smoke sources name only their landed owner IDs/families/nine scenario IDs.
`CURATED_STARTER_CAPABILITY_SOURCE_CONTRIBUTIONS_V1` is a frozen tuple of exact
terminal TASK-414 discriminated source-adapter contribution rows. One row projects the
exact `CmsFeatureCapabilityV1`: feature ID
`core:solution-kits/curated-starter-lifecycle`, Guide area
`docs.area.solution-kits`, and the exact Guide refs below. Separate contribution rows
reference the other five descriptor IDs. Neither a feature nor wrapper gains invented
`descriptorRefs`, `routes`, `controls`, cache, smoke, or another unknown field.
Capability output is descriptive and no route/RBAC module imports it for authorization.
If the terminal TASK-414 handoff lacks any required discriminator/type, this
contribution and TASK-555 closure remain externally blocked on TASK-414; TASK-555 does
not add a compatibility discriminator, local wrapper schema, or widened feature row.

TASK-555-07-L01 authors two new native Guide sections with these immutable localized
identities and exact section directives:

| Surface | `{docId, locale, sectionId}` |
|---|---|
| Solution Kits | `{ docId: "coderso-solution-kits", locale: "en", sectionId: "reviewed-curated-starter-install" }` |
| Setup | `{ docId: "getting-started-site-setup-and-first-publish", locale: "en", sectionId: "reviewed-curated-starter-setup" }` |

It then adds only TASK-555's canonically sorted records to all three terminal TASK-548
sources, preserving every prior record byte-for-byte. `atomic-controls.v1.json` carries
the following exact control IDs; each uses `docs.area.solution-kits`, its 03-L03 exact
route ID/control key/permission descriptor, and the section shown by surface:

- Solution Kits: `docs.control.solution-kits.curated-starter-select`,
  `docs.control.solution-kits.curated-starter-preview`,
  `docs.control.solution-kits.curated-starter-apply`,
  `docs.control.solution-kits.curated-starter-validate`,
  `docs.control.solution-kits.curated-starter-open-site`, and
  `docs.control.solution-kits.curated-starter-rollback`.
- Setup: `docs.control.setup.curated-starter-select`,
  `docs.control.setup.curated-starter-preview`,
  `docs.control.setup.curated-starter-apply`,
  `docs.control.setup.curated-starter-validate`,
  `docs.control.setup.finish`, and `docs.control.setup.curated-starter-rollback`.

`composed-workflows.v1.json` adds exactly these two workflows, each with at least two
actual atoms and no invented umbrella atom:

- `docs.workflow.solution-kits.curated-starter-reviewed-install` orders Solution Kits
  `select -> preview -> apply -> validate -> open-site`; its exact expected outcome is
  a reviewed, validated, openable curated install. The section documents exact active-
  source rollback as the conditional recovery control, not an unconditional happy-path
  step.
- `docs.workflow.setup.curated-starter-reviewed-install` orders Setup
  `select -> preview -> apply -> validate -> finish`; its exact expected outcome is a
  reviewed curated install whose authoritative starter settings survive Finish. The
  section documents exact active-source rollback as conditional recovery.

`section-bindings.v1.json` binds every Solution Kits atom and its workflow to the first
localized tuple, and every Setup atom and its workflow to the second. A missing tuple,
atom, workflow, reordered workflow, title/path heuristic, or cross-surface binding fails
closed. No relation points to Assistant, Agent, Designer, a provider, the retired
legacy apply route, or a service-call bypass. L01 runs terminal TASK-548's exact
unchanged recovery/write/check transaction and validates generated docs before smoke.
Remaining TASK-414 later imports these exact relations/source adapter and alone owns
the final CMS capability JSON.

## Internal API Matrix

All paths below are mounted under `/admin/api`; route factories register the shown
prefixless paths.

| Method | Path | Purpose | RBAC |
|---|---|---|---|
| GET | `/solution-kits/starters` | bounded curated starter list | `solution-kits:read` |
| GET | `/solution-kits/starters/options` | compact option read model | `solution-kits:read` |
| GET | `/solution-kits/starters/:starterId` | bounded detail/resources/residuals | `solution-kits:read` |
| POST | `/solution-kits/starters/:starterId/preview` | actor-bound persisted preview | `solution-kits:write` |
| POST | `/solution-kits/starters/:starterId/apply` | preview-bound fixed apply | `solution-kits:write` + `settings:write` |
| GET | `/solution-kits/starters/:starterId/status` | authoritative installed release/drift summary | `solution-kits:read` |
| POST | `/solution-kits/starters/:starterId/validate` | bounded live validation receipt | `solution-kits:write` |
| POST | `/solution-kits/starters/:starterId/rollback` | server-verified active-head rollback through shared composite | `solution-kits:write` + `settings:write` |
| GET | `/setup/starter-content/options` | same compact option read model | `solution-kits:read` |
| POST | `/setup/starter-content/preview` | wizard preview by registry ID | `solution-kits:write` |
| POST | `/setup/starter-content/apply` | wizard preview-bound apply | `solution-kits:write` + `settings:write` |
| GET | `/setup/starter-content/status` | wizard status by strict `starterId` query | `solution-kits:read` |
| POST | `/setup/starter-content/validate` | wizard validation by source run | `solution-kits:write` |
| POST | `/setup/starter-content/rollback` | wizard alias of shared active-head rollback composite | `solution-kits:write` + `settings:write` |

Existing `GET /solution-kits`, `GET /solution-kits/:id`, and
`POST /solution-kits/plan` remain the legacy catalog/navigation/planner contract and
are not used by fixed curated installation. TASK-555 does not reclassify their
transport security. The legacy `POST /solution-kits/:id/apply` route and matching
Admin client are removed, so TASK-555's Solution Kits and Setup HTTP/UI surfaces have
no non-preview mutation path. The current internal Assistant `site-kit.install`
service path remains explicit read-only scope for later terminal TASK-414 migration;
TASK-555 does not claim global direct-installer retirement. Existing TASK-489
`/solution-kits/runs*` routes remain the
history owner. Static routes (`starters`, `runs`, `plan`) register before the legacy
`/:id` route, and `starters/options` registers before `starters/:starterId`.

## Security Contract

- **Visibility:** every new/changed starter route is internal under `/admin/api`.
  No public read or write is added.
- **Auth:** authenticated Admin session only. This task does not enable an API-key
  mode for starter installation.
- **RBAC:** reads use `solution-kits:read`; persisted preview and explicit validation
  use `solution-kits:write`; apply/rollback use one authorization snapshot containing
  both `solution-kits:write` and `settings:write` because shell/settings state changes.
  Two independently queried permission guards are forbidden. Server middleware is
  authoritative; UI gating is only defense in depth.
- **CSRF/rate limits:** every new mutation POST requires CSRF and `admin_write`;
  GET reads use `admin_read`. The unchanged legacy planner retains whatever
  terminal shared transport policy is actually landed; TASK-555 neither grants
  it a no-CSRF exception nor changes its permission/rate classification.
- **Validation:** every params/query/body/envelope schema rejects unknown fields.
  IDs are enums from the server registry. Apply accepts only preview ID,
  idempotency key, and explicit takeover boolean. No body accepts provider kind,
  release path/version/digest override, package, blueprint, URL, or filesystem path.
  Every new TASK-555 curated lifecycle JSON descriptor uses terminal
  `parseErrorCode: "invalid_json"`; the shared transport owns wire-cap rejection
  before strict schema/domain work. The inherited generic TASK-489 exact-rollback
  descriptor remains byte-contract compatible at `maxBytes:64` with
  `parseErrorCode:"solution_kit_rollback_body_invalid"`; TASK-555 changes only its
  handler dependency.
- **Anti-abuse:** no public nonce/HMAC/reCAPTCHA applies. Internal protections are
  session, RBAC, CSRF, admin rate limits, ten-minute actor-bound previews, bounded
  list/plan/validation sizes, package byte limits, per-key idempotency, and server-only
  artifact selection.
- **Privacy/secrets:** responses, browser caches, logs, audit metadata, runtime-smoke
  reports, and screenshots exclude package bytes, snapshots, raw idempotency keys,
  actor/session/CSRF data, provider credentials, form submissions, and settings
  payloads. Safe audit metadata is starter ID, provider kind, release digest/version,
  preview/source/apply run IDs, outcome counts, and warning codes only.

## Collision and Sequencing Guard

- TASK-555 implementation may start only when rewritten TASK-489, TASK-547, and
  TASK-554 are terminal on the implementation HEAD, after terminal TASK-548.
  TASK-489's receipt must prove TASK-551's base TASK-489 anchors and the terminal
  shared route transport. TASK-555-06-L01 is the serialized successor that extends
  retention to the later-created curated lineage table; absence of a hypothetical
  TASK-551 curated-table amendment is not a blocker.
- Terminal TASK-414-02-L01 supplies the pure feature/source-adapter schema and terminal
  TASK-414-03-L03 supplies route transport. The remaining TASK-414 program starts
  after TASK-555 and consumes its sibling descriptors, exact Guide relations, and
  feature source adapter. Missing contribution discriminators are the explicit external
  TASK-414 blocker described above. Shared order is `TASK-548 -> TASK-489 -> TASK-555 ->
  remaining TASK-414 -> TASK-556`; no later TASK-414 product leaf is a prerequisite.
- After terminal TASK-545 and before `01-L01`, the orchestrator must land the exact
  tracked regular non-symlink `_docs/_workflows/task-555-implement.mjs` bootstrap,
  pass terminal static/import checks, and prove its worktree bytes equal `git show
  HEAD`. Product dispatch stops if that HEAD-identical authority is absent; no ignored
  or untracked workflow is accepted. The terminal receipt must also support canonical
  per-session evidence plus strict manifest/report/checkpoint and two-phase owner
  review; if it does not, stop for a TASK-545 predecessor amendment.
- Shared route/smoke/docs writers wait for every currently active serialized owner,
  including TASK-554 when it has not yet landed, then reread the actual shared files.
  No stale global writer order from this contract overrides a newer terminal handoff.
- Installer/query/index work consumes landed implementation receipts for
  TASK-551-03-L03, TASK-551-05-L01, TASK-551-06-L01, TASK-551-08, and
  TASK-551-09-L04 and rereads their final files. Client/cache work consumes the
  landed TASK-551-09-L04 FINAL authority receipt. Intra-family status text is not a
  receipt. TASK-555-06-L01 is the sole family DDL/schema/migration and post-migration
  curated-retention writer; TASK-555-02-L02 is the serialized package-lock facade
  split/callback writer.
- Forbidden throughout this family: `_docs/_TASKS/TASK-414*`, `TASK-489*`,
  `TASK-545*`, `TASK-547*`, `TASK-548*`, `TASK-551*`, `TASK-554*`; changelogs `1260`, `1263`, `1266`,
  `1267`, and any externally reserved `1268`; every other task's workflow/smoke
  evidence; and all unrelated dirty files.
- Only TASK-555-07-L03 may edit task/changelog indexes and TASK-555 statuses. It
  owns changelog 1269 only and reads both indexes fresh immediately before closure.
- Shared runtime-smoke registration is a serialized seam. TASK-555-07-L02 must
  obtain the current writer handoff, preserve every landed suite, and never run in
  parallel with another registry writer.
- TASK-555-05-L03 hoists Setup controller ownership above the route switch and owns
  the product-neutral optional route metadata
  `setupAccess: "requires-complete" | "review"` with default
  `"requires-complete"`, plus one memory-only `SetupReviewContinuationV1` seam. It
  tests review behavior through an injected synthetic protected-route descriptor;
  no TASK-414 product route is needed. It preserves dirty
  Setup state while a terminal protected review route is open, fails closed on
  reload/auth change/manual URL entry, and is the only navigation handoff
  reserved for TASK-556; it does not import Designer or complete Setup.

## Sub-Tasks

| Order | Subtask | Title | Leaves | Status |
|---|---|---|---:|---|
| 1 | TASK-555-01 | Runtime Curated Artifact and Release Registry | 3 | ⏳ To Do |
| 2 | TASK-555-02 | Unified Starter Domain Preview Apply and Validation | 3 | ⏳ To Do |
| 3 | TASK-555-03 | Internal Starter API Security and Error Mapping | 3 | ⏳ To Do |
| 4 | TASK-555-04 | Solution Kits FormaDom Discovery Review and Install UI | 3 | ⏳ To Do |
| 5 | TASK-555-05 | Setup Wizard Starter Contract and FormaDom Flow | 3 | ⏳ To Do |
| 6 | TASK-555-06 | Installed Release Drift Update and Validation | 3 | ⏳ To Do |
| 7 | TASK-555-07 | Acceptance Smoke Documentation and Closure | 3 | ⏳ To Do |

Implementation order is exactly `01-L01 -> 01-L02 -> 01-L03 -> 02-L01 -> 06-L01 ->
06-L02 -> 02-L02 -> 02-L03 -> 03-L01 -> 03-L02 -> 03-L03 -> 04-L01 -> 04-L02 ->
04-L03 -> 05-L01 -> 05-L02 -> 05-L03 -> 06-L03 -> 07-L01 -> 07-L02 -> 07-L03`.
Landed implementation/test receipts, not intra-family terminal statuses, authorize
the next leaf. Installed-state/validation/drift policy therefore exists before
preview/apply and lifecycle routes. `06-L01` first owns schema, reconciliation, and the
serialized curated-retention successor; `02-L02` then extracts the package-lock
reservation callback before extending the oversized persistence facade. `03-L03`
lands the shared rollback route composite and sibling capability descriptors. `04`
owns strict client/cache and host-neutral components, `05` owns Setup reducer/late-
response/Finish safety, and `06-L03` alone composes the additive Solution Kits host
slots while preserving terminal TASK-489 history. `07-L01` alone writes exact Guide
relations and runs the terminal TASK-548 successor transaction before smoke.
`05-L03` owns the reusable route metadata and synthetic descriptor test. Remaining
TASK-414 later marks its real review route and TASK-556 later consumes both terminal
families; there is no reverse TASK-555 dependency.

## Required Runtime Smoke

Register exactly one new shared suite, `task-555`, with identical scenario IDs and
visible assertions in `fast` and `certification`. Certification must execute exactly
these nine distinct real flows:

1. `discovery-light` - all seven server starters, FormaDom release/provider badge,
   and `local-service-business` visible in light mode.
2. `discovery-dark` - same catalog/detail/residual truth and readable contrast in
   dark mode, including reviewed mutation/status regions at narrow width.
3. `preview-takeover-review` - preview lists bounded safe operation rows and seven
   residuals; Apply remains blocked until the settings-takeover confirmation is
   completed, in both themes across the profile matrix.
4. `apply-and-open-public-routes` - fixed apply succeeds, Open site works, and all
   eight FormaDom public routes produce visible nonzero content geometry.
5. `setup-finish-preserves-formadom` - Setup apply returns FormaDom name/locale and
   Finish preserves those effective values rather than stale wizard defaults.
6. `contact-form-public-submit` - installed `/kontakt` uses the real public Form
   nonce/rate/validation path and displays the success effect without leaking data.
7. `rollback-restores-prior-shell` - exact TASK-489/source-run rollback restores the
   prior presence/value of shell/settings and removes only owned resources.
8. `stale-preview-and-drift-rejection` - a scoped live-baseline change invalidates
   preview/apply before starter writes; the fixture is restored.
9. `provider-offline-curated-availability` - with provider/model availability
   deliberately absent, list/detail/preview remain available and no provider request
   occurs.

Use the shared runtime-smoke entry point, lifecycle, supervised host, persistent
bounded worker, database batches, browser transport, condition polling, repository
guard, redaction, timing, reporting, and cleanup. Do not copy TASK-547's adapter or
create another runner. Every scenario records a valid task-scoped screenshot, zero
console/page errors, visible effects rather than control presence, and independently
addressable failure. One owned fixture is cleaned through exact source-run rollback
and scoped form-submission deletion; no shared table truncation is allowed.
Evidence for each named session is canonical only under
`_docs/_workflows/_smoke/evidence/task-555/<session>/` and follows terminal TASK-545's
strict `manifest.json`, `report.json`, and immutable `resume-checkpoint.json`
protocol. Phase 1 returns `owner_action_required`; only after the owner reviews and
stages that exact session directory may the HEAD-identical workflow resume with exact
run/checkpoint identity and tracked parity. Exactly the nine IDs above may appear.

## Acceptance Criteria

- Production Docker contains and integrity-checks the exact FormaDom release bytes;
  deleting, changing, truncating, symlinking, or mismatching manifest/artifact bytes
  fails closed before DB work.
- Generator output, runtime artifact, compatibility mirror, byte count, and digest
  are byte-stable; changing package content requires a new immutable release version
  and manifest rather than mutating `1.0.0` in place.
- Registry list is exactly the six server catalog IDs plus `formadom-studio`, with no
  duplicate client union and no invalid Setup IDs.
- FormaDom remains a `full-site-package` provider; no conversion to
  `SolutionKitDefinition` or raw package request exists.
- Both Admin and Setup consume the same bounded DTOs and server registry options.
- Preview is same-actor, ten-minute, release/package/plan/baseline-bound and mandatory
  before apply. Cross-actor, expired, stale, altered, unknown, and replay-mismatched
  previews fail before writes.
- Apply replans, requires exact settings takeover, is idempotent across concurrent and
  repeated requests, preserves successful committed results across cache/audit
  failures, and returns authoritative effective name/locale plus validation receipt.
  A failed apply clears reservation only in the same transaction that proves exact zero
  net mutation; unresolved/partial settlement remains
  `curated_starter_reconciliation_required`.
- Legacy apply never terminalizes before core, templates, and shell CAS; partial
  commits compensate or remain explicit reconciliation. Active lineage and pending
  apply/rollback ownership come from the typed table, not three recent events.
- The package-lock callback atomically inserts/verifies the requested run, CAS-claims
  the preview, and reserves lineage under existing locks. Its requested-owner terminal callback
  atomically finalizes success + managed lineage + head + invalidation receipt; its
  separate proven-zero-net failure callback leaves head unchanged and clears pending
  apply. The extracted package-lock module and reduced legacy persistence facade both
  close below 1,000 lines.
- Historical FormaDom state changes only through the fixed fenced reconciliation
  command after one exact candidate is proven; head adoption and one deterministic
  `logAuditOnceTx` audit are atomic, replay verifies both, no receipt column is invented,
  status GET stays read-only, and zero/two candidates fail closed.
- Retention preserves all seven active/pending roots and complete predecessor chains
  within the 512-per-starter/3,584-total cap, rechecks under the writer fence before
  every delete batch, and deletes nothing on a gap, cycle, overflow, or conflict.
  Preview checks and apply transactionally rechecks the resulting 512/3,584 limits
  before claim; overflow maps to `curated_starter_lineage_limit_exceeded` with zero write.
- Migration has the stated bounded locks/index build, seven-row seed, no heap rewrite or
  backfill, migration-first deploy order, and pre-use rollback versus post-use
  forward-fix recovery contract.
- Validation, deterministic audit identity, and backend-specific invalidation receipts
  recover before replay projection. Memory mode has no outbox; Redis mode has one
  durable outbox plan.
- Setup Finish never overwrites FormaDom values with stale defaults; explicit user
  edits after apply remain the user's latest intent.
- TASK-489 history shows safe package/engine/run summaries without browser-stored
  snapshots. Generic and curated routes use one server-verified composite: direct DB
  route tests prove `C -> B -> A -> null`, older non-head rejection before engine work,
  and engine-only fallback solely for sources with no curated evidence. Exact
  terminal failed results retain code/counters, prove zero net mutation, clear pending
  reservation with head unchanged, and permit a fresh exact retry. Recovery retains the
  same reservation/owner, code, and `summary:null`. Both have null effective settings
  and no TASK-555 second restore, resource/history invalidation, or audit; recovery also
  has no second dispatch.
- Installed state comes from the typed lineage head joined to exact ledger evidence;
  three-way policy preserves user edits across at least three successive reapplies
  through explicit managed lineage and blocks conflicts/stale baselines. No downgrade
  contract exists with one release.
- Curated decision `preserve_live/releaseTargetDigest` maps exactly to persisted
  `preserve/targetReleaseDigest` and native `noop`; neither provider operation union nor
  persisted native ledger accepts `"preserve"` as its operation.
- The strict feature row has no route/control/cache/smoke extensions. Five sibling
  descriptors plus one source adapter, twelve exact atomic control relations, two
  exact five-atom workflows, and both localized section tuples pass terminal TASK-414/
  TASK-548 schema and generated-doc parity checks. Missing contribution discriminators
  remain an external TASK-414 blocker and never trigger a local compatibility schema.
- All seven TASK-547 residual IDs remain visible and byte-truthful. Favicon,
  theme-color, media, and broader visual expansion remain out of scope.
- Fixed curated actions work with all providers offline and do not touch assistant
  plan/execute endpoints.
- The exact nine runtime scenarios pass with visible proof, zero console/page errors,
  valid screenshots, exact cleanup, and prior shell/settings restoration.
- Every touched human-authored production/test file is at most 1,000 physical lines.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- targeted Vitest suites for artifact generation, manifests, registry, strict DTOs,
  provider union, fingerprints, drift policy, clients, caches, and React UI
- targeted Bun suites for filesystem/runtime loading, Docker artifact checks, DB
  preview/apply/idempotency/rollback, route registration/error mapping, and security
- before DB-backed commands:
  `set -a && source /home/coder/project/Coderso/.env && set +a`, then verify the DB
  is reachable without printing environment values
- deterministic requested-run primary-key collision/replay, lineage reservation
  plus success/zero-net-failure terminal transactions through the extracted package-lock
  callbacks, crash-before/after-commit proof, live migration SQL/snapshot/journal and
  deployment contract, fixed audited FormaDom reconciliation, proactive lineage limits,
  bounded retention, and bounded head-query evidence
- direct generic/curated route DB proof for `C -> B -> A -> null`, older non-head
  rejection, non-curated engine fallback, and all three rollback result statuses with
  exact zero-second-side-effect assertions
- terminal TASK-548 exact source/recovery/write/check transaction proving all three
  relation files, twelve atoms, two ordered workflows, two localized section tuples,
  generated-doc parity, and no final CMS capability artifact write
- sanitized small/large `EXPLAIN (ANALYZE, BUFFERS)` plus fixed query/row/cardinality/
  latency budgets for lineage/head/item reads, historical candidate selection, and the
  complete set-based owner validator
- `bun run test`
- `bun run precommit:check`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- Docker build/image boot and production API proof when Docker is available; otherwise
  record that CI remains the image gate and do not claim a local image result
- `bun scripts/runtime-smoke.ts run --suite task-555 --profile fast --session wf555fast`
- final gate:
  `bun scripts/runtime-smoke.ts run --suite task-555 --profile certification --session wf555final`
- baseline-to-final line counts for every touched human-authored production/test file
- `git diff --check` and exact forbidden-path/status review

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`, `_docs/CMS_API.md`, `_docs/CMS_SPEC.md`,
  `_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md`, and
  `_docs/RELEASE_PROCESS.md`
- `_docs/CODERSO_RELEASE_GATES.md` for the curated reliability/security gate entries
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`
- `docs/develop/full-site-packages.md`, `docs/develop/runtime-smoke-cookbook.md`,
  and the developer docs index where needed
- `docs/guide/coderso/solution-kits.md`, the solution-kit selection playbook, and
  getting-started truth; reindex evidence if the Guide corpus changes
- terminal TASK-548 Guide capability sources
  `docs/guide/capabilities/atomic-controls.v1.json`,
  `docs/guide/capabilities/composed-workflows.v1.json`, and
  `docs/guide/capabilities/section-bindings.v1.json`, followed by its exact unchanged
  recovery/write/check transaction and owned generated documentation bytes; never
  hand-edit generated output and never edit the final CMS capability JSON
- root/docs README statements that currently imply model-only starter installation
- changelog 1269 and both indexes at closure only
- all 29 TASK-555 family files, terminalized descendants first and parent last
- a closeout note recording the now-terminal provider-free fixed-starter accessor
  and stable Solution Kits/Setup host anchors for post-terminal TASK-556, without
  editing TASK-414 or TASK-556 files
