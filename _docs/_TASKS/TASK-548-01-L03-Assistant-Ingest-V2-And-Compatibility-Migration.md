# TASK-548-01-L03: Assistant Ingest V2 and Compatibility Migration
# FileName: TASK-548-01-L03-Assistant-Ingest-V2-And-Compatibility-Migration.md

**Parent Subtask:** TASK-548-01
**Priority:** Critical
**Category:** Assistant / Database / Migration / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-01-L02
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Switch the existing DB-only assistant reindex from runtime Markdown parsing to
the packaged `DocsDistributionBundleV2`. Enrich `assistant_docs` and
`assistant_doc_chunks` with stable identity, locale/version/route/permission and
capability/visual/example references, then atomically replace one complete
corpus snapshot. Binary assets remain packaged files and are never stored in
PostgreSQL.

Preserve existing assistant readiness, retrieval and support behavior during the
migration. The v1 database rows remain readable until the first successful v2
reindex; a failed migration/reindex must leave the prior complete corpus
available. Do not add a runtime filesystem fallback, external docs request or
new API route.

Production owns the exact loader
`loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>`.
It lives in
`core/services/documentation/packagedDocsDistributionBundleV2.ts`, derives the
fixed Core app root from `import.meta.url`, and reads only
`core/generated/docs/coderso-docs-v2.json` shipped beside that module. Its
signature has no path/options parameter; no caller value, environment variable
or `process.cwd()` participates in resolution. It performs one bounded
canonical-JSON parse and one strict normalization. Persistence independently
re-normalizes the returned object, while the L02 Help/portal projection
constructor independently re-normalizes at its own boundary; neither causes a
second filesystem read. There is no second production `loadFixed*`/byte-loader
service seam. The loader neither knows about nor reads the repository-only
migration report, workspace promotion journal, staging paths, backups or
`.tmp`. Explicit repository write tools own
workspace-pair recovery through
`recoverDocsWorkspaceArtifactPromotionV1()` or `bun run docs:recover`.
Read-only checks use L02's hazard inspector and return
`docs_compile_recovery_required` instead of recovering. Production startup and
reindex never call either workspace helper.
The module-private URL confinement helper requires the exact lexical app-root
child, then performs an inode-held no-follow capability walk from the filesystem
root through every parent component and the final file. Each directory handle
stays open while its child is opened relative to that handle; every hop uses
`O_NOFOLLOW`, directory hops also use `O_DIRECTORY`, and the final regular-file
handle is the only handle used for the bounded read. On the supported Linux
Node/Bun runtime, the narrow adapter uses `/proc/self/fd/<parent-fd>/<component>`
as the held-directory capability path, accepts one prevalidated path component
only, and fails closed if that facility is unavailable; it never falls back to
an ordinary pathname walk. Before/after `fstat` checks cover the held parent
handles and final handle, which close in reverse order. There is no
`lstat`/`realpath`/validate-then-reopen sequence. A missing, linked, replaced,
non-regular, concurrently mutated or differently cased component maps to
`assistant_docs_bundle_invalid` without fallback.
The loader module is import-time side-effect-free and compatible with both Node
and Bun: it uses `node:fs/promises`, `URL` and `import.meta.url`, imports only
the Bun-free corpus normalizer/limits, and contains zero `Bun.*`, DB, settings,
server-adapter or assistant-runtime coupling. This permits the exact same loader
to run from `core/vite.config.ts`; Vite must not receive a second copy. This
leaf owns the loader but does not edit the later L02-owned Vite configuration.

## Storage Contract

At implementation start allocate the next free migration number after reading
`core/db/migrations/meta/_journal.json`; do not preselect `0070` because other
streams may land first. Ship the SQL file, matching `meta/*_snapshot.json` and
`meta/_journal.json` entry together.

The normalized schema must persist, under one immutable snapshot identity:

- document: `docId`, stable `slug`, BCP-47 locale, corpus version, product
  version range, nullable canonical admin path, exact nullable
  `DocsPermissionRequirementV1`, bounded `capabilityIds`, publication targets,
  `sourcePath`, canonical document checksum and existing title/summary/audience/
  product area;
- section/evidence: stable `sectionId`, heading/level, ordered complete bounded
  `DocsVisualV1` metadata and ordered complete bounded `DocsExampleV1` records,
  including their exact localized owner. PNG bytes remain packaged, but the DB
  keeps every confined asset path/hash/dimension/alt/caption needed to project a
  grounded visual card without reopening the corpus bundle;
- chunk: stable `sectionId`, deterministic chunk index/lines/text;
- link inputs: the exact targets, slug, locale, admin path and permission
  requirement needed to derive Help, official and CMS actions without a bundle
  join; authors still cannot persist arbitrary consumer URLs;
- ingest run/active pointer: exact `snapshotId`, monotonic generation, bundle
  `sourceHash`, corpus version and outcome needed to audit which complete
  bundle is active.

The DB owner exposes one recursively strict
`AssistantDocsLocalizedEvidenceV2` projection. It contains the same
`snapshotId`, generation, `sourceHash` and corpus version; exact
`(docId, locale, sectionId, chunkIndex)`; bounded source/title/heading/snippet;
the normalized permission/capability/link inputs; and the complete ordered
visual/example records for that localized section. Unknown fields, cross-owner
records, mixed snapshot identities or mismatched source hashes fail closed.
This is the only per-question Guide enrichment source. It may contain confined
packaged asset metadata, but never PNG bytes, provider data, arbitrary HTML or
an authored URL.

`docId` is translation-family identity, so the same value is valid in multiple
locales. Use exact document uniqueness on `(docId, locale)` and exact chunk
uniqueness on `(docId, locale, sectionId, chunkIndex)`; reject only duplicate
pairs/tuples, not a cross-locale `docId`. Do not store PNG bytes, arbitrary
HTML, authored external URLs or provider data.
Every retrieval hit and Guide-facing source/evidence projection carries
`snapshotId`, generation, `sourceHash`, `docId`, canonical `locale`,
`sectionId` and `chunkIndex`; it must never reduce that identity to
`docId + sectionId`. The internal hit carries the exact normalized
`permissionRequirement`, `capabilityIds`, link inputs and complete ordered
visual/example records required for server re-authorization and response
projection; only authorized browser responses may omit the requirement.
Visual/example IDs remain bundle-global but are materialized only after the
exact localized document/section join succeeds during ingest.

Only documents whose exact `publicationTargets` contains `assistant` may be
persisted, chunked or returned by assistant retrieval. `embedded-help`-only and
`public-docs`-only records remain in the shared bundle but never enter the
assistant snapshot.

Activation, the active-pointer generation change, successful-run finalization
and a durable `assistant_docs_snapshot_activated` outbox record commit in the
same DB transaction. The recursively strict payload is exactly
`{ snapshotId, generation, sourceHash }`. Retrieval selects through the active
pointer and requires every joined row to match that identity; cache keys include
all three fields. After commit, the server-only
`AssistantDocsServerCacheInvalidatorV2` consumes the durable outbox and retries
until acknowledged. It is distinct from and must not import, publish to or be
adapted through the browser/admin `cacheBus`. A missing/delayed invalidation
cannot expose an old result under the new key, and failed activation exposes
neither new rows nor an invalidation event. Thus each query sees one complete
old or new snapshot, never mixed metadata. `force: false` may no-op only when
the active pointer's `sourceHash` equals the strictly loaded bundle hash;
`force: true` may create a new generation with the same hash but cannot weaken
validation.

## Cross-Process Ingest and Server Cache Contract

Startup and the authenticated manual reindex call the same
`ingestPackagedAssistantDocsV2` entrypoint and acquire the same PostgreSQL
session advisory lock before bundle load, run allocation or an ingest
transaction. The exact signed 64-bit key is
`ASSISTANT_DOCS_INGEST_ADVISORY_LOCK_KEY_V2 = 0x434f444552534f32n`.
Acquisition uses `pg_try_advisory_lock` on one dedicated connection. A false
result maps to `assistant_docs_reindex_conflict` and performs no filesystem or
DB mutation. The lock is held across fixed-bundle load, persistence and
post-commit scheduling, then `pg_advisory_unlock` runs in `finally`; an
ambiguous/false unlock discards the connection rather than returning it locked
to the pool. No process-local mutex is an authority and no startup-only or
route-only lock key exists. If the owner process dies, closing its dedicated
session releases the PostgreSQL lock; a later startup/manual call must then be
able to acquire the same key.

Every ingest run is allocated as `pending`, and every success, unchanged or
failed transition is conditional on that state. A lost/error COMMIT response is
not proof of rollback. While the advisory lock is still held, the ingest opens a
fresh PostgreSQL connection and reconciles the run, active pointer and outbox in
one read-only snapshot. A coherent committed activation requires the run's exact
`{ snapshotId, generation, sourceHash }`, the identical active pointer and
exactly one outbox row for that `ingestRunId` with the identical payload; a
committed unchanged result requires its exact run result and the still-matching
active identity with no activation outbox for that run. Either committed result
is reconstructed and proceeds to the same no-throw post-commit delivery kick.
Only a still-pending run plus proven absence of a committed result/outbox for
that run is `not_committed` and may transition pending → failed. Contradictory or
unreadable evidence remains pending, returns a bounded
`assistant_docs_ingest_failed` outcome-unknown diagnostic and is never rewritten
as failed or allowed to trigger a second generation under the held lock.

The outbox table stores a unique `eventId`, its owning `ingestRunId`, literal
event type, the exact payload, `attemptCount`, `availableAt`, nullable
`leaseToken`/`leaseExpiresAt`, `createdAt`, nullable `acknowledgedAt`, nullable
bounded `lastErrorCode` and nullable `quarantinedAt`. Claiming is a short
transaction using
`FOR UPDATE SKIP LOCKED`, a bounded batch and an expiring lease; it increments
the attempt count and returns only the strict minimal
`{ eventId, leaseToken }` envelope before any cache call. Each envelope is
settled independently under one batch `Promise.allSettled`; one poison row can
never prevent a later valid row from being delivered. Ack, retry and quarantine
updates are conditional on the same event ID plus unpredictable lease token.
Ack is idempotent; transient failure clears/lets expire the lease and applies
capped exponential backoff without an attempt ceiling. Process death at every
claim/invalidate/ack boundary therefore leaves the event claimable.
Insert and per-row post-claim load apply one recursively reject-unknown
normalizer to the exact event row and exact three-field payload. The claim
boundary intentionally selects and normalizes only the minimal envelope, so a
malformed payload cannot abort its batch. An unknown event type, payload/row key,
malformed timestamp/counter/token or identity mismatch is never delivered or
acknowledged. After a valid envelope identifies it, the worker atomically clears
its lease and quarantines it with only
`assistant_docs_outbox_malformed`, a capped next-review/backoff timestamp and no
raw payload; automatic claims exclude quarantined rows until an explicit
operator repair/requeue. If retry/quarantine persistence fails, lease expiry
still permits recovery. Operator-visible recovery never silently discards or
acknowledges the row.

The exact cache-family map is owned server-side:

```ts
export type AssistantDocsSnapshotActivatedOutboxEventV2 = Readonly<{
  eventId: string;
  ingestRunId: string;
  eventType: "assistant_docs_snapshot_activated";
  payload: AssistantDocsActivatedCacheIdentityV2;
  attemptCount: number;
  availableAt: Date;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  lastErrorCode: AssistantDocsOutboxSafeCodeV2 | null;
  quarantinedAt: Date | null;
}>;
export type AssistantDocsOutboxSafeCodeV2 =
  | "assistant_docs_outbox_delivery_failed"
  | "assistant_docs_outbox_malformed";
export function normalizeAssistantDocsSnapshotActivatedOutboxEventV2(
  value: unknown
): AssistantDocsSnapshotActivatedOutboxEventV2;
export type AssistantDocsOutboxClaimEnvelopeV2 = Readonly<{
  eventId: string;
  leaseToken: string;
}>;
export function normalizeAssistantDocsOutboxClaimEnvelopeV2(
  value: unknown
): AssistantDocsOutboxClaimEnvelopeV2;
export type ClaimedAssistantDocsSnapshotActivatedOutboxEventV2 = Readonly<
  Omit<AssistantDocsSnapshotActivatedOutboxEventV2,
    "leaseToken" | "leaseExpiresAt"> & { leaseToken: string; leaseExpiresAt: Date }
>;
export function normalizeClaimedAssistantDocsSnapshotActivatedOutboxEventV2(
  value: unknown
): ClaimedAssistantDocsSnapshotActivatedOutboxEventV2;

export type AssistantDocsServerCacheFamilyV2 =
  | "assistant-docs-active-pointer"
  | "assistant-docs-search"
  | "assistant-docs-localized-evidence";
export type AssistantDocsActivatedCacheIdentityV2 = Pick<
  AssistantDocsSnapshotIdentityV2,
  "snapshotId" | "generation" | "sourceHash"
>;

export interface AssistantDocsServerCacheInvalidatorV2 {
  invalidateActivatedSnapshot(input: Readonly<{
    identity: AssistantDocsActivatedCacheIdentityV2;
    families: readonly AssistantDocsServerCacheFamilyV2[];
  }>): Promise<void>;
}

export const ASSISTANT_DOCS_SNAPSHOT_ACTIVATED_CACHE_FAMILIES_V2 = [
  "assistant-docs-active-pointer",
  "assistant-docs-search",
  "assistant-docs-localized-evidence",
] as const;
```

Invalidation is idempotent and maps only the activation event to that sorted
complete family list. The startup lifecycle drains expired/pending claims once
before enabling the periodic worker; a bounded drain failure is logged only as
a safe event ID/code and leaves readiness safe because every value cache is
identity-keyed. The ongoing worker and post-commit kick call the same
`drainAssistantDocsSnapshotActivatedOutboxV2` implementation.
The post-commit kick is only a no-throw wake-up optimization: its failure cannot
enter ingest failure handling, rewrite a committed run or active pointer, or
acknowledge/drop the event. Startup drain is the durable correctness path.

## Server Permission Filtering Contract

This leaf owns the Bun-free/server-only permission snapshot normalizer and
evaluator in a focused
`core/services/assistant/docsPermissionSnapshot.ts` module. It also owns the
required permission-aware signature and implementation of
`searchAssistantDocsDb` in `docsDbRetriever.ts`. TASK-548-03-L03 later wires the
authenticated route and service to these pure exports; no browser-supplied
context is a trusted permission source.

The exact exported contract is:

```ts
export type AssistantDocsPermissionSnapshotV1 = {
  state: "ready";
  permissions: readonly string[];
};

export function normalizeAssistantDocsPermissionSnapshotV1(
  value: unknown
): AssistantDocsPermissionSnapshotV1;

export function satisfiesAssistantDocsPermissionRequirementV1(
  requirement: DocsPermissionRequirementV1 | null,
  snapshot: AssistantDocsPermissionSnapshotV1
): boolean;

export type AssistantDocsSnapshotIdentityV2 = Readonly<{
  snapshotId: string;
  generation: number;
  sourceHash: string;
  corpusVersion: string;
}>;

export type AssistantDocsLocalizedEvidenceV2 = Readonly<{
  schema: "coderso.assistant-docs-localized-evidence@v2";
  snapshot: AssistantDocsSnapshotIdentityV2;
  document: Pick<
    DocsDocumentV2,
    | "docId" | "locale" | "slug" | "title" | "summary" | "sourcePath"
    | "productVersionRange" | "adminPath" | "permissionRequirement"
    | "capabilityIds" | "publicationTargets"
  > & { documentSha256: string };
  section: Pick<DocsSectionV2, "sectionId" | "heading" | "level">;
  chunk: { chunkIndex: number; text: string };
  visuals: readonly (DocsVisualV1 & { docId: string; locale: string })[];
  examples: readonly (DocsExampleV1 & { docId: string; locale: string })[];
}>;

export type AssistantDocsDbSearchOptionsV2 = {
  topK?: number;
  minScore?: number;
  permissionSnapshot: AssistantDocsPermissionSnapshotV1;
};

export type AssistantDocsDbSearchResultV2 = Readonly<{
  snapshot: AssistantDocsSnapshotIdentityV2;
  records: readonly AssistantDocsLocalizedEvidenceV2[];
}>;

export function normalizeAssistantDocsSnapshotIdentityV2(
  value: unknown
): AssistantDocsSnapshotIdentityV2;

export function normalizeAssistantDocsLocalizedEvidenceV2(
  value: unknown
): AssistantDocsLocalizedEvidenceV2;

export function assertEveryEvidenceMatchesSnapshotIdentityV2(
  records: readonly AssistantDocsLocalizedEvidenceV2[],
  snapshot: AssistantDocsSnapshotIdentityV2
): void;

export function searchAssistantDocsDb(
  query: string,
  options: AssistantDocsDbSearchOptionsV2
): Promise<AssistantDocsDbSearchResultV2>;
```

The snapshot normalizer is recursively exact-key and accepts only the displayed
`state: "ready"` object. It validates permissions against
`listPermissionIds()` from the canonical permission catalog, rejects unknown
values, duplicates, missing/malformed arrays, unknown keys and every wildcard
mix, and returns a unique sorted array. The exact sole-member `["*"]` is the
only wildcard form. Ready `[]` is valid. A missing/malformed input throws the
typed machine error `assistant_docs_permission_snapshot_invalid` before any DB
query, hit, source, visual or example lookup.

The evaluator first normalizes the exact owner
`DocsPermissionRequirementV1 | null`. Null succeeds for a ready empty snapshot;
the normalized non-null shape is exactly
`{ mode: "allOf" | "anyOf"; permissions: string[] }`. Mode `allOf` requires
every entry in `permissions`; mode `anyOf` requires at least one; and sole
`["*"]` satisfies either non-null form. The owner normalizer rejects an unknown
mode before evaluation. Empty authored non-null arrays, unknown permissions and
authored `*` remain invalid.

Retrieval has no permissionless overload or default snapshot. It first
normalizes the required snapshot, then reads only active `assistant`-target
document IDs plus their permission requirements, evaluates authorization, and
only then queries chunk text/metadata for the authorized IDs. Unauthorized
title/body/chunk/source/visual/example fields never enter ranking or response
projection. Every later server enrichment helper must accept the same explicit
snapshot and re-check the persisted localized document requirement before
projecting evidence. It must not open or accept a distribution bundle.

## File-Size and Ownership Gate

`core/db/schema.ts` is already above 1,000 physical lines. Before adding v2
columns, split it by cohesive domain into files under `core/db/schema/`, move
assistant tables into an assistant-owned module and retain stable barrel
exports; every resulting human-authored module must be at most 1,000 lines.

`core/services/assistant/docsIngestService.ts` is 847 lines at task authoring.
Extract bundle loading/validation and DB persistence into focused modules before
new behavior would push it over the limit. Do not modify the already oversized
`tests/integration/routes/assistant.test.ts`; add focused independent test files.

This leaf exclusively owns the side-effect-free packaged loader, pure DB
ingest/retriever/schema migration, `docsPermissionSnapshot.ts`, the five typed
`assistant_docs_*` domain errors, and their pure/integration tests. It must not
edit `core/vite.config.ts`,
`core/server/routes/assistantRoutes.ts`,
`core/services/assistant/assistantService.ts`, or route-level error-map tests.
After this dependency lands, TASK-548-03-L03 is the sole TASK-548 writer of
both existing orchestration modules and maps this leaf's typed errors once.
That serialized land order removes all shared-file ownership.

## Security Contract

- **Endpoint visibility:** unchanged internal admin
  `POST /admin/api/assistant/reindex` route family (`/assistant/reindex` inside
  the admin router); no public docs endpoint.
- **Auth/RBAC:** authenticated admin session and `settings:write`, unchanged.
- **CSRF:** required for the POST through existing admin unsafe-method
  middleware/client behavior.
- **Rate limit:** existing `assistant` bucket, unchanged.
- **Validation:** preserve the live strict request contract
  `{ force?: boolean }` from
  `core/server/validation/assistantSchemas.ts:29-35`.
  `additionalProperties: false` remains mandatory, client `{}` remains valid,
  and `force` must be boolean when present. Independently verify bundle schema,
  sourceHash, referential integrity, limits and packaged asset confinement
  before a DB transaction.
- **Anti-abuse:** nonce/HMAC and CAPTCHA are not applicable to this internal
  session write. Enforce bundle/doc/chunk/asset-ref caps and one guarded reindex
  at a time.
- **RBAC retrieval:** persist exact
  `permissionRequirement: DocsPermissionRequirementV1 | null`. Null has no
  document-level restriction, so an authenticated session with an empty
  permission snapshot still satisfies null. `allOf` requires every listed
  permission and `anyOf` requires at least one; empty/partial snapshots deny
  only an unsatisfied non-null requirement. The exact live ready snapshot
  `["*"]` satisfies every valid requirement; duplicate/mixed wildcard or other
  malformed snapshots fail closed. Authored requirements continue to forbid
  `*`.
  The required server snapshot is normalized through
  `normalizeAssistantDocsPermissionSnapshotV1` before a DB query. Never expose
  a protected document/title/chunk/source/visual/example when its non-null
  requirement is unsatisfied.
- **Capability context:** persist `capabilityIds` exactly and apply bounded,
  deterministic capability filtering/ranking before optional provider work.
- **Secrets/privacy:** do not store/log image bytes, credentials, source bodies
  in errors or external provider data.

## Implementation Pseudocode

```ts
import { constants } from "node:fs";
import { open, type FileHandle } from "node:fs/promises";

const CODERSO_CORE_APP_ROOT_V1 = new URL("../../", import.meta.url);
const PACKAGED_DOCS_DISTRIBUTION_BUNDLE_V2_URL = new URL(
  "generated/docs/coderso-docs-v2.json",
  CODERSO_CORE_APP_ROOT_V1
);

async function readPackagedDocsBundleBytesAtModuleUrlV2():
  Promise<Uint8Array> {
  const absoluteComponents = assertExactFixedBundleUrlChildV2({
    root: CODERSO_CORE_APP_ROOT_V1,
    candidate: PACKAGED_DOCS_DISTRIBUTION_BUNDLE_V2_URL,
    expected: "generated/docs/coderso-docs-v2.json",
  });
  const traversal = await openPinnedNoFollowTraversalV2(absoluteComponents);
  try {
    const before = await snapshotPinnedTraversalV2(traversal);
    assertEveryPinnedParentIsDirectoryV2(before.parents);
    assertRegularSingleLinkAndBoundedSizeV2(
      before.file, DOCS_DISTRIBUTION_BUNDLE_MAX_BYTES
    );
    const bytes = await readFileHandleBoundedV2(
      traversal.file, DOCS_DISTRIBUTION_BUNDLE_MAX_BYTES + 1
    );
    const after = await snapshotPinnedTraversalV2(traversal);
    assertSamePinnedTraversalIdentitiesV2(before, after);
    if (bytes.byteLength > DOCS_DISTRIBUTION_BUNDLE_MAX_BYTES) {
      throw new Error("assistant_docs_bundle_invalid");
    }
    return bytes;
  } finally {
    await closePinnedTraversalInReverseV2(traversal);
  }
}

async function openPinnedNoFollowTraversalV2(
  absoluteComponents: readonly string[]
): Promise<{ parents: readonly FileHandle[]; file: FileHandle }> {
  assertAbsoluteExactCaseComponentsV2(absoluteComponents);
  const held: FileHandle[] = [
    await open("/", constants.O_RDONLY | constants.O_DIRECTORY |
      constants.O_NOFOLLOW),
  ];
  try {
    for (const [index, component] of absoluteComponents.entries()) {
      assertSingleSafePathComponentV2(component);
      const isFile = index === absoluteComponents.length - 1;
      const parent = held[held.length - 1];
      const child = await openPinnedProcFdChildV2({
        parent,
        component,
        flags: constants.O_RDONLY | constants.O_NOFOLLOW |
          (isFile ? 0 : constants.O_DIRECTORY),
      });
      held.push(child);
    }
    return { parents: held.slice(0, -1), file: held[held.length - 1] };
  } catch (error) {
    await closeFileHandlesInReverseV2(held);
    throw error;
  }
}

export async function loadPackagedDocsDistributionBundleV2():
  Promise<DocsDistributionBundleV2> {
  try {
    const bundleBytes = await readPackagedDocsBundleBytesAtModuleUrlV2();
    return normalizeDocsDistributionBundleV2(
      parseBoundedCanonicalJson(bundleBytes)
    );
  } catch (error) {
    throw normalizePackagedDocsBundleErrorV2(error);
  }
}

type AssistantDocsIngestOutcomeReconciliationV2 =
  | { state: "committed"; result: AssistantDocsIngestResult }
  | { state: "not_committed" }
  | { state: "indeterminate"; safeCode: "assistant_docs_ingest_failed" };

declare function reconcileAssistantDocsIngestOutcomeV2(input: {
  connection: PgConnection;
  ingestRunId: string;
  expectedSourceHash: string;
}): Promise<AssistantDocsIngestOutcomeReconciliationV2>;

export async function ingestDocsDistributionBundleV2(
  inputBundle: DocsDistributionBundleV2,
  input: { actorId: string | null; force: boolean }
) {
  // This independent trust boundary deliberately normalizes a second time.
  const bundle = normalizeDocsDistributionBundleV2(inputBundle);
  assertBundleAssetRefsArePackaged(bundle);
  const assistantDocuments = selectDocumentsForPublicationTarget(
    bundle.documents,
    "assistant"
  );
  const plan = buildAssistantDocsSnapshotPlanV2({
    bundle,
    documents: assistantDocuments,
  });
  assertCompleteLocalizedEvidenceClosureV2(plan);
  const run = await createPendingDocsIngestRunV2(bundle, input.actorId)
    .catch((error) => { throw normalizeDocsIngestError(error); });
  let committedResult: AssistantDocsIngestResult;
  try {
    committedResult = await db.transaction(async (tx) => {
      const active = await lockActiveAssistantDocsSnapshotV2(tx);
      if (!input.force && active?.sourceHash === bundle.sourceHash) {
        return finishPendingDocsIngestRunUnchangedV2(tx, run.id, active);
      }
      const identity = await allocateInactiveDocsSnapshotV2(tx, {
        sourceHash: bundle.sourceHash,
        corpusVersion: bundle.corpusVersion,
        previousGeneration: active?.generation ?? 0,
      });
      await insertAssistantDocsSnapshotPlanV2(tx, identity, plan);
      await assertPersistedAssistantDocsSnapshotClosureV2(tx, identity);
      const summary = summarizeSnapshot(identity, plan);
      await finishPendingDocsIngestRunSuccessV2(tx, run.id, summary);
      await enqueueAssistantDocsSnapshotActivatedV2(tx, {
        ingestRunId: run.id,
        identity,
      });
      await activateCorpusSnapshotV2(tx, identity);
      await retainBoundedPreviousSnapshotsV2(tx, identity);
      return summary;
    });
  } catch (error) {
    const domainError = normalizeDocsIngestError(error);
    const resolution = await settleAssistantDocsIngestOutcomeReconciliationV2(
      () => withFreshPgConnectionV2((connection) =>
        reconcileAssistantDocsIngestOutcomeV2({
          connection,
          ingestRunId: run.id,
          expectedSourceHash: bundle.sourceHash,
        })
      )
    );
    if (resolution.state === "committed") {
      committedResult = resolution.result;
    } else {
      if (resolution.state === "not_committed") {
        const diagnosticPersistence = await settleDocsIngestDiagnostic(() =>
          finishPendingDocsIngestRunFailedV2(
            run.id,
            toSafeIngestDiagnostic(domainError)
          )
        );
        attachSafeDiagnosticPersistenceEvidence(
          domainError, diagnosticPersistence
        );
      } else {
        attachSafeIngestOutcomeUnknownEvidence(domainError);
      }
      throw domainError;
    }
  }
  const outboxDelivery = await settleAssistantDocsOutboxKickV2(() =>
    scheduleAssistantDocsSnapshotOutboxDeliveryV2()
  );
  return attachPostCommitOutboxEvidence(committedResult, outboxDelivery);
}

export async function ingestPackagedAssistantDocsV2(input: {
  actorId: string | null;
  force?: boolean;
}): Promise<AssistantDocsIngestResult> {
  const request = normalizePackagedAssistantDocsIngestInputV2(input);
  return withAssistantDocsIngestAdvisoryLockV2(async () => {
      const packaged = await loadPackagedDocsDistributionBundleV2();
      return ingestDocsDistributionBundleV2(packaged, {
        actorId: request.actorId,
        force: request.force ?? false,
      });
  });
}

export async function withAssistantDocsIngestAdvisoryLockV2<T>(
  use: () => Promise<T>
): Promise<T> {
  const connection = await acquireDedicatedPgConnectionV2();
  let locked = false;
  try {
    locked = await tryPgSessionAdvisoryLockV2(
      connection, ASSISTANT_DOCS_INGEST_ADVISORY_LOCK_KEY_V2
    );
    if (!locked) throw new Error("assistant_docs_reindex_conflict");
    return await use();
  } finally {
    await unlockOrDiscardDedicatedPgConnectionV2({
      connection, key: ASSISTANT_DOCS_INGEST_ADVISORY_LOCK_KEY_V2, locked,
    });
  }
}

export async function drainAssistantDocsSnapshotActivatedOutboxV2() {
  const rawEnvelopes = await claimPendingAssistantDocsOutboxBatchV2();
  const outcomes = await Promise.allSettled(rawEnvelopes.map(async (raw) => {
    let envelope: AssistantDocsOutboxClaimEnvelopeV2;
    try {
      envelope = normalizeAssistantDocsOutboxClaimEnvelopeV2(raw);
    } catch {
      recordSafeOutboxWorkerCodeV2("assistant_docs_outbox_claim_invalid");
      return;
    }
    let rawClaim: unknown;
    try {
      rawClaim = await loadAssistantDocsOutboxClaimV2(envelope);
    } catch (error) {
      await retryAssistantDocsOutboxClaimV2(
        envelope, toSafeOutboxCodeV2(error)
      );
      return;
    }
    let claim: ClaimedAssistantDocsSnapshotActivatedOutboxEventV2;
    try {
      claim = normalizeClaimedAssistantDocsSnapshotActivatedOutboxEventV2(
        rawClaim
      );
    } catch {
      await quarantineAssistantDocsOutboxClaimV2(
        envelope, "assistant_docs_outbox_malformed"
      );
      return;
    }
    try {
      await assistantDocsServerCacheInvalidatorV2.invalidateActivatedSnapshot({
        identity: normalizeAssistantDocsActivatedCacheIdentityV2(claim.payload),
        families: ASSISTANT_DOCS_SNAPSHOT_ACTIVATED_CACHE_FAMILIES_V2,
      });
      await acknowledgeAssistantDocsOutboxClaimV2(envelope);
    } catch (error) {
      await retryAssistantDocsOutboxClaimV2(
        envelope, toSafeOutboxCodeV2(error)
      );
    }
  }));
  return summarizeSettledOutboxBatchV2(outcomes);
}

export function normalizeAssistantDocsPermissionSnapshotV1(
  value: unknown
): AssistantDocsPermissionSnapshotV1 {
  const record = assertExactObjectKeys(value, ["state", "permissions"]);
  if (record.state !== "ready" || !Array.isArray(record.permissions)) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  const permissions = assertBoundedStringArray(record.permissions);
  assertNoDuplicates(permissions);
  const known = new Set(listPermissionIds());
  if (
    permissions.includes("*")
      ? permissions.length !== 1
      : permissions.some((permission) => !known.has(permission))
  ) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  return {
    state: "ready",
    permissions: permissions[0] === "*" ? ["*"] : [...permissions].sort(),
  };
}

export function satisfiesAssistantDocsPermissionRequirementV1(
  requirement: DocsPermissionRequirementV1 | null,
  inputSnapshot: AssistantDocsPermissionSnapshotV1
): boolean {
  const snapshot = normalizeAssistantDocsPermissionSnapshotV1(inputSnapshot);
  const normalized = normalizeDocsPermissionRequirementV1(requirement);
  if (normalized === null || snapshot.permissions[0] === "*") return true;
  const granted = new Set(snapshot.permissions);
  if (normalized.mode === "allOf") {
    return normalized.permissions.every((permission) => granted.has(permission));
  }
  return normalized.permissions.some((permission) => granted.has(permission));
}

export async function searchAssistantDocsDb(
  query: string,
  options: AssistantDocsDbSearchOptionsV2
): Promise<AssistantDocsDbSearchResultV2> {
  const permissionSnapshot = normalizeAssistantDocsPermissionSnapshotV1(
    options.permissionSnapshot
  );
  return db.transaction(
    { isolationLevel: "repeatable read", readOnly: true },
    async (tx) => {
      const active = await requireActiveAssistantDocsSnapshotV2(tx);
      const authorizationRows =
        await selectActiveAssistantDocAuthorizationRowsV2(tx, active);
      const authorizedDocIds = authorizationRows
        .filter((row) =>
          satisfiesAssistantDocsPermissionRequirementV1(
            row.permissionRequirement,
            permissionSnapshot
          )
        )
        .map((row) => row.id);
      const rows = await selectLocalizedEvidenceForAuthorizedDocsV2(
        tx,
        active,
        authorizedDocIds
      );
      const hits = rankAssistantDocsDbRows(rows, query, {
        topK: options.topK,
        minScore: options.minScore,
      }).map(normalizeAssistantDocsLocalizedEvidenceV2);
      assertEveryEvidenceMatchesSnapshotIdentityV2(hits, active);
      return { snapshot: active, records: hits };
    }
  );
}
```

`ingestPackagedAssistantDocsV2` is the sole runtime/reindex dependency. Its
strict input is only `{ actorId, force? }`; `force` may reingest identical
packaged bundle but never bypasses the single-ingest lock. It calls the exact
zero-argument packaged loader once and passes that returned normalized bundle
directly to the ingest core; it never accepts/reads settings, `sourceRoot`,
repository Markdown, provider/model state, a caller-supplied path/bytes, an
environment path override, or `process.cwd()`.

**Data flow:** actor/force metadata → the shared cross-process advisory lock →
the one fixed packaged loader performs
bounded canonical parsing and strict v2 normalization → the ingest persistence
boundary independently revalidates that normalized bundle → exact `assistant`
target filter → complete in-memory document/section/chunk/evidence plan →
transaction writes and closure-checks an inactive snapshot → activation,
success finalization and durable server-cache invalidation outbox commit
together. Readers
select only through one active `{ snapshotId, generation, sourceHash }`; the
outbox drives cache invalidation, while identity-keyed caches prevent stale/new
aliasing even before delivery. Startup compares the packaged bundle hash, not a
Markdown-only filesystem fingerprint. Every startup/reindex calls
`loadPackagedDocsDistributionBundleV2()` exactly once and has no access to the
repository bundle/report transaction. A runtime package containing the valid
bundle and no `.tmp`, migration report, workspace journal, staging file or
backup must start, hash-check and reindex successfully.
For a query, unknown server snapshot → exact snapshot/catalog normalization
before DB access → metadata-only active-document authorization → authorized
localized DB evidence query/ranking → source, visual/example and action-input
projection from that same snapshot. There is no permissionless retrieval,
filesystem/bundle load, Markdown parse, projection-constructor call or external
docs request in the per-query path.

**Compatibility:** migration adds nullable/backfilled fields first, maps current
rows to a legacy snapshot, and keeps v1 retrieval readable. A successful v2
reindex promotes strict non-null v2 identity for the active snapshot. Remove the
legacy adapter only after tests prove restart and rollback behavior; never
destructively rewrite source Markdown during runtime.

**Error handling:** normalize invalid/missing/tampered bundle to
`assistant_docs_bundle_invalid`, DB failure to
`assistant_docs_ingest_failed`, lock conflict to
`assistant_docs_reindex_conflict` and unavailable DB to
`assistant_docs_db_unavailable`; malformed trusted permission input is
`assistant_docs_permission_snapshot_invalid`. `normalizeDocsIngestError`
preserves the first four typed machine errors; the permission normalizer owns
the fifth. Unknown storage errors normalize only to
`assistant_docs_ingest_failed`. TASK-548-03-L03 alone maps them at the existing
route boundary after this leaf lands. Never return internal paths, permission
inventories or SQL details. Run allocation creates only `pending`; allocation
failure has no fictional diagnostic update. Every terminal write is a
pending-only compare-and-set. After a transaction error, fresh-connection
reconciliation is settled separately and cannot mask the normalized domain
error: coherent committed evidence reconstructs success, proven non-commit may
write failed, and unreadable/contradictory evidence stays pending with only a
bounded outcome-unknown diagnostic. A committed active snapshot is therefore
never reclassified as failed, including when the COMMIT response is lost.
The post-commit outbox kick is outside that `try/catch` and passes through a
no-throw settler; failure leaves the durable event pending for the shared
startup/worker drain and adds bounded delivery evidence only. No browser
`cacheBus` event participates.

**Regression-test shape:** verify full round-trip of every new field, migration
from v1 rows, exact duplicate `(docId, locale)` rejection, same-`docId`
different-locale acceptance, permission/capability metadata,
locale-bearing hit/source evidence, complete visual/example/link/provenance
records and localized asset refs, startup hash
skip/reindex, stale-row pruning, concurrent reindex
serialization, rollback after mid-write failure and continued reads from the
previous snapshot. Test the exact snapshot normalizer and required retriever
signature: null plus ready empty-snapshot success, ready empty denial for every
non-null requirement, invalid empty non-null requirements, partial/full
`{ mode: "allOf", permissions }`, every
`{ mode: "anyOf", permissions }` branch, exact sole `["*"]` full access, and
rejection of unknown requirement mode plus missing/malformed/unknown-key/
unknown-permission/duplicate/mixed-wildcard snapshots before the first DB query.
Prove unauthorized rows never reach chunk selection, ranking, hits,
sources or evidence metadata. Route/security/error-map coverage belongs only
to the later TASK-548-03-L03 writer. Add target-leak fixtures proving assistant and
multi-target documents persist/retrieve while `embedded-help`-only and
`public-docs`-only documents never create rows, chunks, hits or evidence cards.
Use two locale rows sharing `docId` and `sectionId` to prove retrieval,
visual/example enrichment and emitted evidence never cross-join.
Inject activation, outbox enqueue, success-finalization, server invalidation and
failed-diagnostic failures. Prove activation/outbox are atomic, a delayed
delivery is safely retryable, every cache key includes the exact active
identity, and each query returns only one complete old/new `sourceHash`. Make
the post-commit scheduler throw and prove the snapshot/run remain successful,
no failed-run diagnostic write occurs, and startup retry drains the event.
Drop the transaction connection immediately before COMMIT, after PostgreSQL
commits but before the client receives its response, and after an unchanged-run
COMMIT. Under the still-held advisory lock, prove a fresh connection reconciles
the exact run/active/outbox identity: committed activation/unchanged results are
returned and enter the no-throw scheduler, while only a pending row with proven
absence may compare-and-set to failed. Contradictory/unreadable evidence stays
pending and cannot allocate a second generation. Fail run allocation with
DB-unavailable and unknown storage errors; assert exact normalized codes, zero
diagnostic write and no masking. Exercise mutating
workspace promotion recovery only in repository write/recovery fixtures and the
read-only hazard inspector in `--check` fixtures. Build a production
package fixture that deliberately omits `.tmp`, the migration report, journal,
staging and backup files; prove startup/hash-skip/reindex succeeds from the
packaged bundle alone and no runtime call attempts workspace recovery. Tamper
remove, symlink or differently-case that packaged bundle and prove
`assistant_docs_bundle_invalid` without a Markdown, report, journal or network
fallback. At every absolute parent hop and final-file hop, replace the pathname
with a directory, regular file or symlink before and after its handle is opened,
then mutate the final path during the capped read. The loader must reject or
return only complete bytes from the one inode-held traversal and final handle,
never escape through a replaced ancestor, validate one inode and read another,
follow a link or return mixed bytes. Pin parent device/inode/type plus final
device/inode/mode/link-count/size/mtime/ctime and prove all handles close in
reverse order. An unavailable `/proc/self/fd` adapter fails closed without an
ordinary-path fallback.
For `{ force: false }` and `{ force: true }`, spies prove the exact packaged
ingest API invokes only
`loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>`
once, passes its returned object to the independently normalizing ingest core,
and never resolves a second loader, runtime settings, source roots, Markdown or
a provider. Pass a malformed value cast as `DocsDistributionBundleV2` directly
to the ingest core and prove it rejects before run allocation or any DB call.
Run the exact packaged-loader test with initial working directories at the
repository root, `core/`, and `packages/docs-portal/`; all must resolve identical
bytes/hash through the same `import.meta.url` constant. Repeat inside the final
Docker layout, with an unrelated working directory and no path environment
variable. Spy that `process.cwd()` is never read, no caller override exists,
and the L02 publication-projection constructor independently normalizes the
loader result at its own boundary without causing another file read.
Run a Node-environment import/read fixture with `globalThis.Bun` absent and
assert zero DB/settings/server imports; after L02 wires the consumer,
`bun --cwd core build:admin` must execute `core/vite.config.ts` with this exact
module and identical `sourceHash`.
Run two real processes/connections racing startup and manual reindex against
both an empty database and an already-populated active snapshot. Prove the same
pinned advisory key and acquisition order, exactly one winner, conflict before
bundle read/run allocation/DB mutation, release after success/error/process
death, later acquisition, and one complete active snapshot without duplicate
generation/run artifacts. Crash the outbox worker after claim, invalidation and
before ack;
advance the lease clock and prove startup drain reclaims, invalidates the exact
three server families idempotently and conditionally acknowledges, while an
old lease token cannot ack/retry and browser `cacheBus` remains untouched.
Round-trip the exact outbox row/payload and independently alter every key,
literal, identity, timestamp, counter and token. Put a malformed row first and
a valid row second in one claimed batch: per-row `Promise.allSettled` must
quarantine the first with only the bounded safe code/backoff, deliver and ack
the second, expose no raw payload, and after restart leave the quarantined row
operator-visible without starving new valid rows.

## Sub-Tasks

- [ ] Split the legacy DB schema coherently and add complete next-free migration
  artifacts.
- [ ] Extract bundle loader/persistence modules and make reindex/startup ingest
  the packaged v2 bundle atomically through the sole exact
  `loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>`
  seam; independently re-normalize its
  result at the ingest persistence boundary without another load/read or
  workspace transaction dependency.
- [ ] Extend retriever row mapping for stable IDs and permission/visual/example
  source/link/provenance metadata plus exact capability IDs; add the exact
  required server permission snapshot normalizer/evaluator and active-identity
  authorized retrieval without exposing unauthorized content or reading the
  packaged corpus per question.
- [ ] Commit active-pointer generation, success and durable server-cache
  invalidation outbox atomically; reconcile ambiguous COMMIT responses from a
  fresh connection with pending-only transitions, implement per-row settled
  claim/lease/ack/retry/quarantine/startup drain, key caches by
  `{ snapshotId, generation, sourceHash }`, and never use browser `cacheBus`.
- [ ] Guard startup and manual ingest with the one pinned PostgreSQL session
  advisory lock, using conflict-before-work and release/discard semantics.
- [ ] Export all five typed `assistant_docs_*` errors for the serialized
  TASK-548-03-L03 route/service writer; do not edit either orchestration module.
- [ ] Add
  `tests/integration/server/assistantDocsIngestV2.test.ts` and focused Vitest
  ingest/retriever coverage plus
  `tests/vitest/assistant/docsPermissionSnapshot.test.ts`; use uniquely scoped
  DB fixtures and delete only owned rows.

## Testing Requirements

- Before DB tests: `set -a && source .env && set +a`
- `bunx vitest run --config vitest.config.ts tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/docsPermissionSnapshot.test.ts tests/vitest/documentation`
- fixed-loader cwd matrix from repo root, `core/`, and
  `packages/docs-portal/`, Node/Vite-config import fixture, plus the final
  Docker smoke from an unrelated cwd
- `bun test tests/integration/server/assistantDocsIngestV2.test.ts` when
  `DATABASE_URL` is reachable
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- migration generation/drift verification, restart smoke and touched-file line
  counts
- production-package smoke with the bundle present and every `.tmp`/report/
  journal/staging/backup artifact absent; from an unrelated working directory,
  startup and reindex must still pass through the fixed module-relative loader
- adversarial every-component no-follow handle swap matrix, two-process
  advisory-lock race, lost-COMMIT-response reconciliation, and durable outbox
  malformed-first/valid-second claim/lease/ack/retry/quarantine/restart matrix

## Documentation Updates Required

Send verified schema, migration, startup and reindex behavior to TASK-548
closure for `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md` and
`docs/develop/assistant.md`. Document the active-identity cache/outbox contract
in `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`.
