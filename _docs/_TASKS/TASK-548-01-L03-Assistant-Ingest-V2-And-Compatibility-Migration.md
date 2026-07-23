# TASK-548-01-L03: Assistant Ingest V2 and Compatibility Migration
# FileName: TASK-548-01-L03-Assistant-Ingest-V2-And-Compatibility-Migration.md

**Parent Subtask:** TASK-548-01
**Priority:** Critical
**Category:** Assistant / Database / Migration / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-01-L02
**Status:** ⏳ To Do

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
`loadPackagedDocsDistributionBundleV2()`. It reads and validates only the
packaged `core/generated/docs/coderso-docs-v2.json` bytes shipped in the runtime
image. It neither knows about nor reads the repository-only migration report,
workspace promotion journal, staging paths, backups or `.tmp`. Explicit
repository write tools own workspace-pair recovery through
`recoverDocsWorkspaceArtifactPromotionV1()` or `bun run docs:recover`.
Read-only checks use L02's hazard inspector and return
`docs_compile_recovery_required` instead of recovering. Production startup and
reindex never call either workspace helper.

## Storage Contract

At implementation start allocate the next free migration number after reading
`core/db/migrations/meta/_journal.json`; do not preselect `0070` because other
streams may land first. Ship the SQL file, matching `meta/*_snapshot.json` and
`meta/_journal.json` entry together.

The normalized schema must persist:

- document: `docId`, stable `slug`, BCP-47 locale, corpus version, product
  version range, nullable canonical admin path, exact nullable
  `DocsPermissionRequirementV1`, bounded `capabilityIds`, publication targets,
  source/checksum and existing title/audience/product area;
- chunk: stable `sectionId`, deterministic chunk index/lines/text and strict
  JSON arrays of `visualIds` and `exampleIds`;
- ingest run: bundle `sourceHash`, corpus version and snapshot outcome needed to
  audit which complete bundle is active.

`docId` is translation-family identity, so the same value is valid in multiple
locales. Use exact document uniqueness on `(docId, locale)` and exact chunk
uniqueness on `(docId, locale, sectionId, chunkIndex)`; reject only duplicate
pairs/tuples, not a cross-locale `docId`. Do not store PNG bytes, arbitrary
HTML, authored external URLs or provider data.
Every retrieval hit and Guide-facing source/evidence projection carries
`docId`, canonical `locale`, `sectionId` and `chunkIndex`; it must never reduce
that identity to `docId + sectionId`. Visual/example IDs remain bundle-global
but resolve only after the exact localized document/section join succeeds.

Only documents whose exact `publicationTargets` contains `assistant` may be
persisted, chunked or returned by assistant retrieval. `embedded-help`-only and
`public-docs`-only records remain in the shared bundle but never enter the
assistant snapshot.

## File-Size and Ownership Gate

`core/db/schema.ts` is already above 1,000 physical lines. Before adding v2
columns, split it by cohesive domain into files under `core/db/schema/`, move
assistant tables into an assistant-owned module and retain stable barrel
exports; every resulting human-authored module must be at most 1,000 lines.

`core/services/assistant/docsIngestService.ts` is 847 lines at task authoring.
Extract bundle loading/validation and DB persistence into focused modules before
new behavior would push it over the limit. Do not modify the already oversized
`tests/integration/routes/assistant.test.ts`; add focused independent test files.

This leaf is also the exclusive TASK-548 writer for the existing
`mapAssistantError` switch in `core/server/routes/assistantRoutes.ts:177` and
its new focused reindex mapping tests. It may add only the four v2 ingest
branches described below; TASK-548-03-L03 must not reopen this mapper.

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
  Never expose a protected document/source/visual/example when its non-null
  requirement is unsatisfied.
- **Capability context:** persist `capabilityIds` exactly and apply bounded,
  deterministic capability filtering/ranking before optional provider work.
- **Secrets/privacy:** do not store/log image bytes, credentials, source bodies
  in errors or external provider data.

## Implementation Pseudocode

```ts
export async function ingestDocsDistributionBundleV2(
  bundleBytes: Uint8Array,
  input: { actorId: string | null; expectedSourceHash?: string }
) {
  const bundle = parseAndNormalizeDocsDistributionBundleV2(bundleBytes);
  assertBundleAssetRefsArePackaged(bundle);
  assertExpectedSourceHash(bundle.sourceHash, input.expectedSourceHash);
  const assistantDocuments = selectDocumentsForPublicationTarget(
    bundle.documents,
    "assistant"
  );
  let runId: string | null = null;
  try {
    const run = await createDocsIngestRun(bundle, input.actorId);
    const allocatedRunId = run.id;
    runId = allocatedRunId;
    const result = await db.transaction(async (tx) => {
      const snapshotId = await upsertCorpusSnapshot(tx, bundle);
      await upsertDocsV2(tx, snapshotId, assistantDocuments);
      await replaceChunksV2(tx, snapshotId, buildChunks(assistantDocuments));
      await pruneRowsOutsideSnapshot(tx, snapshotId);
      await activateCorpusSnapshot(tx, snapshotId);
      const summary = summarizeSnapshot(snapshotId, bundle, assistantDocuments);
      await finishDocsIngestRun(tx, allocatedRunId, "success", summary);
      return summary;
    });
    return result;
  } catch (error) {
    const domainError = normalizeDocsIngestError(error);
    const diagnosticPersistence =
      runId === null
        ? { status: "not-allocated" as const }
        : await settleDocsIngestDiagnostic(() =>
            finishDocsIngestRun(
              db,
              runId,
              "failed",
              toSafeIngestDiagnostic(domainError)
            )
          );
    attachSafeDiagnosticPersistenceEvidence(domainError, diagnosticPersistence);
    throw domainError;
  }
}
```

**Data flow:** packaged bytes → strict v2 validation → expected-source-hash
comparison before run/transaction → exact `assistant` target filter → complete
in-memory chunk plan → transaction writes inactive snapshot → prune within that
snapshot → activation plus successful run finalization in the same commit.
Readers use only the active assistant-target snapshot. Startup compares the
packaged bundle hash, not a Markdown-only filesystem fingerprint.
Every startup/reindex calls `loadPackagedDocsDistributionBundleV2()`, validates
the packaged bundle independently, and has no access to the repository
bundle/report transaction. A runtime package containing the valid bundle and no
`.tmp`, migration report, workspace journal, staging file or backup must start,
hash-check and reindex successfully.

**Compatibility:** migration adds nullable/backfilled fields first, maps current
rows to a legacy snapshot, and keeps v1 retrieval readable. A successful v2
reindex promotes strict non-null v2 identity for the active snapshot. Remove the
legacy adapter only after tests prove restart and rollback behavior; never
destructively rewrite source Markdown during runtime.

**Error handling:** map invalid/missing/tampered bundle to
`assistant_docs_bundle_invalid`, DB failure to
`assistant_docs_ingest_failed`, lock conflict to
`assistant_docs_reindex_conflict` and unavailable DB to
`assistant_docs_db_unavailable`. `normalizeDocsIngestError` preserves exactly
those four typed machine errors; unknown storage errors normalize only to
`assistant_docs_ingest_failed`. Extend the existing centralized
`mapAssistantError` only in this leaf: packaged bundle invalid → 500, conflict
→ 409, DB unavailable → 503 and ingest failure → 500, each with its same
machine code and a bounded public message. Never return internal paths or SQL
details. Failed-run diagnostic persistence is settled separately and cannot
mask the normalized domain error. Run allocation is inside that normalization
boundary; when allocation itself fails, `runId` remains null and no fictional
failure update is attempted. Because activation and success finalization share
one transaction, a committed active snapshot is never reclassified as failed.

**Regression-test shape:** verify full round-trip of every new field, migration
from v1 rows, exact duplicate `(docId, locale)` rejection, same-`docId`
different-locale acceptance, permission/capability metadata,
locale-bearing hit/source evidence and localized asset refs, startup hash
skip/reindex, stale-row pruning, concurrent reindex
serialization, rollback after mid-write failure and continued reads from the
previous snapshot. Test null plus authenticated empty-snapshot success, invalid
empty non-null requirements, empty/partial protected snapshots, full `allOf`,
every `anyOf` branch, exact `["*"]` full access, duplicate/mixed wildcard
rejection and capability round trips/filtering. Route coverage must
prove permission, valid `{}`,
`{ force: true }` and `{ force: false }` request bodies, unknown/non-boolean
rejection, CSRF expectation, all four centralized mappings and unchanged route
registration/rate bucket. Add target-leak fixtures proving assistant and
multi-target documents persist/retrieve while `embedded-help`-only and
`public-docs`-only documents never create rows, chunks, hits or evidence cards.
Use two locale rows sharing `docId` and `sectionId` to prove retrieval,
visual/example enrichment and emitted evidence never cross-join.
Inject activation/success-finalization/failed-diagnostic failures and prove the
previous active snapshot plus typed error/status invariants. Fail run allocation
with DB-unavailable and unknown storage errors; assert exact normalized codes,
null run identity, zero diagnostic write and no masking. Exercise mutating
workspace promotion recovery only in repository write/recovery fixtures and the
read-only hazard inspector in `--check` fixtures. Build a production
package fixture that deliberately omits `.tmp`, the migration report, journal,
staging and backup files; prove startup/hash-skip/reindex succeeds from the
packaged bundle alone and no runtime call attempts workspace recovery. Tamper
or remove that packaged bundle and prove `assistant_docs_bundle_invalid`
without a Markdown, report, journal or network fallback.

## Sub-Tasks

- [ ] Split the legacy DB schema coherently and add complete next-free migration
  artifacts.
- [ ] Extract bundle loader/persistence modules and make reindex/startup ingest
  the packaged v2 bundle atomically through
  `loadPackagedDocsDistributionBundleV2()` without workspace transaction
  dependencies.
- [ ] Extend retriever row mapping for stable IDs and permission/visual/example
  metadata plus exact capability IDs without exposing unauthorized hits.
- [ ] Extend only `mapAssistantError` in
  `core/server/routes/assistantRoutes.ts` with the four v2 reindex mappings and
  cover them in the focused route suite.
- [ ] Add
  `tests/integration/server/assistantDocsIngestV2.test.ts`,
  `tests/integration/routes/assistant-reindex-v2.test.ts` and focused Vitest
  coverage; use uniquely scoped DB fixtures and delete only owned rows.

## Testing Requirements

- Before DB tests: `set -a && source .env && set +a`
- `bunx vitest run --config vitest.config.ts tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/documentation`
- `bun test tests/integration/server/assistantDocsIngestV2.test.ts tests/integration/routes/assistant-reindex-v2.test.ts` when `DATABASE_URL` is reachable
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- migration generation/drift verification, restart smoke and touched-file line
  counts
- production-package smoke with the bundle present and every `.tmp`/report/
  journal/staging/backup artifact absent; startup and reindex must still pass

## Documentation Updates Required

Send verified schema, migration, startup and reindex behavior to TASK-548
closure for `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md` and
`docs/develop/assistant.md`.
