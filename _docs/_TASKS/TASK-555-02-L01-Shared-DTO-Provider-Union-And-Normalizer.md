# TASK-555-02-L01: Shared DTO Provider Union and Normalizer
# FileName: TASK-555-02-L01-Shared-DTO-Provider-Union-And-Normalizer.md

**Parent Subtask:** TASK-555-02
**Priority:** High
**Category:** Domain Contract / DTO / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-555-01-L03 plus terminal TASK-551's base Solution Kit
retention/cache receipts and the tracked-workflow start receipts. Lineage-aware
retention is a TASK-555-06-L01 successor contract, not a TASK-551 prerequisite.
**Status:** ⏳ To Do

---

## Overview

Own the single Bun-free curated-starter contract imported by server domain code and
Admin clients. Define the closed provider adapter union and strict bounded DTOs for
options/list/detail/preview/apply/status/validation/rollback. Normalize every external
or browser-facing value through one exact-key parser. FormaDom's package and legacy
catalog definitions remain internal provider inputs and never become DTO fields.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/services/kits/curatedStarters/contracts.ts` (new);
- `core/services/kits/curatedStarters/providerTypes.ts` (new);
- `core/services/kits/curatedStarters/readModel.ts` (new);
- `core/services/kits/curatedStarters/normalize.ts` (new); and
- `tests/vitest/kits/curated-starter-contract.test.ts` (new).

These modules have no DB, server router, filesystem, settings, provider SDK, Bun API,
or Admin client import.

## Dependencies and Land Order

First TASK-555-02 leaf. It consumes the release registry and is authoritative for all
later domain, route, client, UI, and Setup type names/shapes. L02/L03 may not add a
parallel DTO or provider discriminator.

## Forbidden Paths

- TASK-414/489/545/547/548/551/554 task files, all
  changelog/index/workflow/smoke paths, and the read-only tracked TASK-555 workflow;
- release registry/artifacts, DB/schema/migrations, full-site/legacy executors, routes,
  Admin/Setup source, and other leaf tests;
- owner dirty root files and unrelated handoffs.

## Security Contract

- **Endpoint visibility:** none; pure contract consumed by later internal routes.
- **Auth/RBAC/CSRF/rate limit:** not applicable here.
- **Validation:** direct plain objects only, exact own keys recursively, closed enums,
  finite integer/string/array budgets, UUID/date/digest/SemVer shapes, and deep copies.
- **Anti-abuse:** no public input or nonce/CAPTCHA; parser bounds all future API data.
- **Secrets/privacy:** package/resource documents, paths, snapshots, actor IDs, raw
  settings, raw idempotency keys, credentials, and form data are not representable.

## Exact Contract Shape

Pin these limits in `CURATED_STARTER_LIMITS`: registry items `32`, resource kinds
`10`, safe labels per kind `24`, residuals `16`, operations `512`, warnings `16`,
validation checks `64`, public paths `32`, checklist items `32`, generic label `160`,
description `2_000`, and diagnostic text `240` characters.

```ts
type CuratedStarterProviderKind = "solution-kit" | "full-site-package";
type CuratedStarterProviderDisposition = "create" | "update" | "noop" | "preserve";
type CuratedStarterWarningCode =
  | "curated_starter_validation_warning"
  | "curated_starter_cache_invalidation_deferred"
  | "curated_starter_audit_deferred"
  | "curated_starter_post_commit_recovery_required"
  | "curated_starter_reconciliation_required";
type CuratedStarterRollbackWarningCode = Extract<
  CuratedStarterWarningCode,
  | "curated_starter_cache_invalidation_deferred"
  | "curated_starter_post_commit_recovery_required"
  | "curated_starter_reconciliation_required"
>;

type CuratedStarterProviderAdapter =
  | Readonly<{
      kind: "solution-kit";
      plan(input: CuratedStarterPlanInput): Promise<CuratedStarterProviderPlan>;
      apply(input: CuratedStarterProviderApplyInput): Promise<CuratedStarterProviderResult>;
    }>
  | Readonly<{
      kind: "full-site-package";
      plan(input: CuratedStarterPlanInput): Promise<CuratedStarterProviderPlan>;
      apply(input: CuratedStarterProviderApplyInput): Promise<CuratedStarterProviderResult>;
    }>;

type CuratedStarterOptionV1 = Readonly<{
  schemaVersion: 1;
  id: CuratedStarterId;
  title: string;
  providerKind: CuratedStarterProviderKind;
  releaseVersion: string;
  locale: string;
}>;

type CuratedStarterPreviewV1 = Readonly<{
  schemaVersion: 1;
  previewId: string;
  starter: CuratedStarterSummaryV1;
  release: CuratedStarterReleaseViewV1;
  expiresAt: string;
  baselineFingerprint: string;
  planFingerprint: string;
  operationSummary: CuratedStarterOperationSummaryV1;
  operations: readonly CuratedStarterOperationV1[];
  settingsTakeover: Readonly<{ required: boolean; keys: readonly string[] }>;
  residuals: readonly CuratedStarterResidualV1[];
}>;

type CuratedStarterApplyResultV1 = Readonly<{
  schemaVersion: 1;
  starterId: CuratedStarterId;
  providerKind: CuratedStarterProviderKind;
  releaseVersion: string;
  releaseDescriptorDigest: string;
  previewId: string;
  runId: string;
  replayed: boolean;
  status: "success";
  operationSummary: CuratedStarterOperationSummaryV1;
  validation: CuratedStarterValidationReceiptV1;
  effectiveSettings: Readonly<{ siteName: string; siteLocale: string }>;
  publicPaths: readonly string[];
  warnings: readonly CuratedStarterWarningCode[];
}>;
```

The production file spells out every field, exact own-key set, nullability, bound, and
enum for summary, detail, list/options envelopes, installed status, validation receipt,
rollback result, release, resource, residual, operation, takeover, effective settings,
warnings, checklist, and checks. No DTO is left as prose or `Record<string,unknown>`.
All use `releaseDescriptorDigest`. Resource summaries are exactly
`{kind,count,labels}`. Checks may contain optional validated relative `publicPath`, and
apply may contain `publicPaths`; these safe route fields do not permit artifact,
filesystem, reference-source paths, or URLs.

```ts
type CuratedStarterReleaseViewV1 =
  | Readonly<{
      providerKind: "solution-kit"; version: string;
      releaseDescriptorDigest: string; coreCompatibility: string;
      catalogDefinitionDigest: string; packageFingerprint: null;
      artifactSha256: null;
    }>
  | Readonly<{
      providerKind: "full-site-package"; version: string;
      releaseDescriptorDigest: string; coreCompatibility: string;
      catalogDefinitionDigest: null; packageFingerprint: string;
      artifactSha256: string;
    }>;
type CuratedStarterSummaryV1 = Readonly<{
  schemaVersion: 1; id: CuratedStarterId; title: string; description: string;
  providerKind: CuratedStarterProviderKind; locale: string;
  release: CuratedStarterReleaseViewV1; featureLabels: readonly string[];
}>;
type CuratedStarterResourceSummaryV1 = Readonly<{
  kind: CuratedStarterResourceKind; count: number; labels: readonly string[];
}>;
type CuratedStarterResidualV1 = Readonly<{
  id: CuratedStarterResidualId; label: string; description: string; impact: "visual";
}>;
type CuratedStarterChecklistItemV1 = Readonly<{
  code: string; label: string; status: "ready" | "attention";
}>;
type CuratedStarterDetailV1 = Readonly<{
  schemaVersion: 1; starter: CuratedStarterSummaryV1;
  resources: readonly CuratedStarterResourceSummaryV1[];
  residuals: readonly CuratedStarterResidualV1[];
  checklist: readonly CuratedStarterChecklistItemV1[];
}>;
type CuratedStarterListEnvelopeV1 = Readonly<{
  schemaVersion: 1; items: readonly CuratedStarterSummaryV1[];
}>;
type CuratedStarterOptionsEnvelopeV1 = Readonly<{
  schemaVersion: 1; items: readonly CuratedStarterOptionV1[];
}>;
type CuratedStarterOperationSummaryV1 = Readonly<{
  total: number; create: number; update: number; noop: number; preserve: number;
}>;
type CuratedStarterOperationV1 = Readonly<{
  position: number; resourceKind: CuratedStarterResourceKind;
  resourceKey: string; operation: CuratedStarterProviderDisposition;
}>;
type CuratedStarterInstalledStatusV1 = Readonly<{
  schemaVersion: 1; starterId: CuratedStarterId;
  state: "not-installed" | "installed" | "drifted" | "unknown";
  sourceRunId: string | null; release: CuratedStarterReleaseViewV1 | null;
  drift: Readonly<{ unchanged: number; releaseOnly: number; userOnly: number;
    converged: number; conflicts: number; missing: number }>;
  checklist: readonly CuratedStarterChecklistItemV1[];
  warnings: readonly CuratedStarterWarningCode[];
}>;
type CuratedStarterValidationCheckV1 = Readonly<{
  code: string; status: "passed" | "warning" | "failed"; label: string;
  publicPath?: string;
}>;
type CuratedStarterValidationReceiptV1 = Readonly<{
  schemaVersion: 1; starterId: CuratedStarterId; sourceRunId: string;
  status: "passed" | "warning" | "failed"; checkedAt: string;
  checks: readonly CuratedStarterValidationCheckV1[];
}>;
type CuratedStarterRollbackSummaryV1 = Readonly<{
  total: number; success: number; failed: number; planned: number; skipped: number;
  operations: Readonly<{
    create: number; update: number; noop: number; delete: number; restore: number;
  }>;
}>;
type CuratedStarterRollbackResultV1 =
  | Readonly<{
      schemaVersion: 1; starterId: CuratedStarterId; sourceRunId: string;
      rollbackRunId: string; packageKey: string; engine: "legacy" | "full_site";
      status: "failed"; safeErrorCode: string;
      summary: CuratedStarterRollbackSummaryV1;
      effectiveSettings: null; warnings: readonly CuratedStarterRollbackWarningCode[];
    }>
  | Readonly<{
      schemaVersion: 1; starterId: CuratedStarterId; sourceRunId: string;
      rollbackRunId: string; packageKey: string; engine: "legacy" | "full_site";
      status: "recovery_required"; safeErrorCode: string;
      summary: null;
      effectiveSettings: null; warnings: readonly CuratedStarterRollbackWarningCode[];
    }>
  | Readonly<{
      schemaVersion: 1; starterId: CuratedStarterId; sourceRunId: string;
      rollbackRunId: string; packageKey: string; engine: "legacy" | "full_site";
      status: "success"; safeErrorCode: null;
      summary: CuratedStarterRollbackSummaryV1;
      effectiveSettings: Readonly<{ siteName: string; siteLocale: string }>;
      warnings: readonly CuratedStarterRollbackWarningCode[];
    }>;
```

Rollback does not invent an engine or latest-run lookup: terminal TASK-489 remains
authoritative for engine execution. TASK-555's typed lineage reservation is
authoritative for curated replay, so repeated requests resume the persisted
reservation/engine relation before any dispatcher call. The adapter consumes and
preserves TASK-489's exact closed statuses `success|failed|recovery_required`, exact
`packageKey`, and `safeErrorCode`. `failed` preserves every terminal summary counter;
`recovery_required` preserves TASK-489's exact `summary:null` because its owner is not
proven terminal. Under repaired TASK-489 semantics, terminal `failed` also proves zero
net rollback mutation: TASK-555 clears the exact pending reservation while keeping the
head unchanged, so a later request may claim a fresh engine owner. Recovery keeps the
same reservation/engine owner and is a safe nonterminal handoff, not an exception or
permission to dispatch again. Both keep settings unavailable. A successful result exposes
effective settings only after TASK-489's dispatcher-owned Setup settings restore and
TASK-555's lineage finalization/post-commit recovery are complete. TASK-555 never emits
`running`, never performs a second settings restore, and never inserts a second
rollback audit for any of the three statuses.

`CuratedStarterProviderDisposition` is a curated-layer disposition, not a widening of
either native engine's ledger operation union. L02 must map persisted `preserve` through the
provider-specific exact live-target bridge. L06's decision
`preserve_live/releaseTargetDigest` becomes this DTO/persisted lineage vocabulary only
at the boundary as `preserve/targetReleaseDigest`; the native ledger records a verified
`noop`, while server-only managed-lineage evidence retains the immutable release target
digest and exact live-after digest. Passing the string `preserve` to a
legacy resource handler, `FullSiteInstallOperation`, initialization plan, or persisted
ledger `operation` is invalid.

The production contract also spells out the recursively strict server-only
`CuratedStarterRunContextV1` from the parent. Its `settingTransitions` accepts only
actual legacy changes to `site.homepageId`, `site.navigationMenuId`, and
`site.footerTemplateId`, with exact presence-aware `before`/`after` states; the
full-site provider requires `[]`. Its `postCommit` contains the full bounded
`CuratedStarterValidationReceiptV1`, deterministic audit UUID/payload digest, and one
nullable exact backend-discriminated server-cache invalidation receipt:

```ts
type CuratedStarterInvalidationReceiptV1 =
  | Readonly<{
      backend: "redis"; eventKey: string; planDigest: string;
      state: "pending" | "durable" | "applied";
    }>
  | Readonly<{
      backend: "memory"; receiptId: string; planDigest: string;
      committedPlan: CuratedStarterInvalidationPlanV1;
      state: "committed" | "applied";
    }>;
```

`CuratedStarterInvalidationPlanV1` is exact `{eventKey,tags}` with terminal TASK-551
finite-tag and byte/count bounds. It contains no resource IDs, setting keys, slugs,
paths, secrets, or arbitrary payload. Redis receipt cannot carry `committedPlan` and
memory receipt cannot claim an outbox/durable state. All post-commit fields remain
unrepresentable in browser DTOs except the already-bounded validation result and
warning codes.
The parent context field is `CuratedStarterInvalidationReceiptV1 | null`. Null is
required when committed changes affect only run/history/curated status/lineage browser
state or every provider resource is noop/byte-equal; those selectors are handled after
the strict response by L04 and never become TASK-551 server tags. A non-null receipt is
required only when actual committed mutations map to at least one existing TASK-551
`CacheTag`.

`CuratedStarterDomainErrorCode` is the closed union of
`curated_starter_not_found`, `curated_starter_preview_not_found`,
`curated_starter_run_not_found`, `curated_starter_preview_expired`,
`curated_starter_preview_consumed`, `curated_starter_preview_stale`,
`curated_starter_settings_takeover_required`, `curated_starter_idempotency_invalid`,
`curated_starter_idempotency_conflict`, `curated_starter_apply_in_progress`,
`curated_starter_recovery_required`, `curated_starter_reservation_conflict`,
`curated_starter_lineage_limit_exceeded`,
`curated_starter_reconciliation_required`, `curated_starter_drift_conflict`,
`curated_starter_rollback_invalid_source`, `curated_starter_core_incompatible`,
`curated_starter_artifact_invalid`, `curated_starter_artifact_integrity_failed`,
`curated_starter_provider_mismatch`, `curated_starter_release_invalid`,
`curated_starter_release_drift`, `curated_starter_registry_invalid`,
`curated_starter_response_invalid`, `curated_starter_apply_failed`,
`curated_starter_validation_invalid`,
`curated_starter_post_commit_recovery_required`,
`curated_starter_audit_identity_conflict`,
`curated_starter_installed_state_unknown`,
`curated_starter_reconciliation_candidate_not_found`,
`curated_starter_reconciliation_ambiguous`,
`curated_starter_lineage_missing`,
`solution_kit_retention_recovery_required`.

`curated_starter_reconciliation_candidate_not_found` and
`curated_starter_reconciliation_ambiguous` are raised by TASK-555-06-L01's
reconciliation flow and map to HTTP `409` (matching
`curated_starter_reconciliation_required`). `curated_starter_lineage_missing` is
raised by TASK-555-06-L01's lineage/reapply flow and maps to HTTP `409` (the
status DTO's `warnings` field carries the human-readable detail; the code itself
is a domain error). `solution_kit_retention_recovery_required` is raised by
TASK-555-06-L01's serialized retention successor (a TASK-551-06-L01 policy
consumer) when a missing link, malformed context, cycle, depth overflow, or
aggregate overflow blocks retention; it maps to HTTP `409` and is a member of
this union.

## Implementation Pseudocode

```ts
export function normalizeCuratedStarterPreview(value: unknown): CuratedStarterPreviewV1 {
  const root = requireExactRecord(value, PREVIEW_KEYS);
  return deepFreeze({
    schemaVersion: requireLiteral(root.schemaVersion, 1),
    previewId: requireUuid(root.previewId),
    starter: normalizeCuratedStarterSummary(root.starter),
    release: normalizeReleaseView(root.release),
    expiresAt: requireIsoDate(root.expiresAt),
    baselineFingerprint: requireSha256(root.baselineFingerprint),
    planFingerprint: requireSha256(root.planFingerprint),
    operationSummary: normalizeOperationSummary(root.operationSummary),
    operations: normalizeBoundedArray(root.operations, LIMITS.operations, normalizeOperation),
    settingsTakeover: normalizeTakeover(root.settingsTakeover),
    residuals: normalizeBoundedArray(root.residuals, LIMITS.residuals, normalizeResidual),
  });
}

export function projectCuratedStarterDetail(
  definition: InternalCuratedStarterDefinition,
): CuratedStarterDetailV1 {
  return normalizeCuratedStarterDetail(buildSafeBoundedProjection(definition));
}
```

Every normalizer validates then creates fresh arrays/objects and freezes output. It
does not return or retain the caller object.

## Data Flow

Internal registry/provider result -> bounded safe projection -> strict shared
normalizer -> frozen DTO -> route/Admin client/UI. Malformed API responses follow the
same parser in browser tests.

## Error Handling

- Any malformed/unknown/missing/oversized value throws
  `curated_starter_response_invalid` without including the value.
- Unknown registry IDs throw `curated_starter_not_found` only at registry/service
  lookup; a DTO parser never widens its ID union.
- NaN/infinite/negative counts, duplicate IDs/paths/check codes, unsafe public paths,
  invalid dates/digests/versions, and prototype-bearing objects fail closed.

## Regression Tests

- Round-trip every DTO variant for all seven IDs and both provider kinds.
- Exact own-key rejection at every nested object; inherited/proxy/getter/cyclic,
  sparse/oversized arrays, duplicate IDs, long strings, bad paths/dates/digests,
  NaN/infinity, and mutation-after-parse negatives.
- FormaDom detail has exactly ten resource-kind slots at most and exactly seven
  residual IDs; list/options contain no package/resource document.
- Legacy releases require catalog digest with null package/artifact identities;
  FormaDom requires package/artifact identities with null catalog digest. Every
  cross-populated or substituted identity fails.
- Preview operations are ordered, bounded safe rows and contain no desired/current
  document, snapshot, rollback action, URL, or arbitrary JSON.
- Strict server-context round trips pin complete validation receipts, deterministic
  post-commit identities, Redis-vs-memory exclusivity, three-key-only legacy setting
  transitions, empty full-site transitions, and the 512 KiB canonical-byte cap.
- Rollback DTO tests accept exactly `success|failed|recovery_required`, require exact
  `packageKey`, branch-specific `safeErrorCode` nullability, all TASK-489 counters for
  terminal success/failed, and exact `summary:null` for recovery; reject
  `running|reconciliation_required` and prove no second settings-restore or rollback-
  audit state is representable. Both non-success branches require
  `effectiveSettings:null`; terminal failed settlement clears reservation and permits a
  fresh exact retry, while recovery requires the bounded recovery warning and same-owner
  reservation retention. Rollback
  warnings reject validation/audit-deferred values because TASK-489 is the sole
  rollback audit owner.
- Curated disposition tests pin the exact
  `preserve_live/releaseTargetDigest -> preserve/targetReleaseDigest -> noop` boundary
  and prove `preserve` is unrepresentable in both providers' native operation inputs
  and persisted initialization-plan operation unions.
- Domain-code exhaustiveness includes `curated_starter_lineage_limit_exceeded`; unknown
  near-matches remain rejected.
- Static type negatives prove `full-site-package` cannot carry `kitId` and
  `solution-kit` cannot carry `releaseKey/package`.
- Scan every normalized/browser DTO for forbidden keys such as `package`, `desired`,
  `beforeSnapshot`, `afterSnapshot`, `rollbackAction`, `artifactPath`,
  `filesystemPath`, `sourcePath`, `url`, `actorId`,
  `idempotencyKey`, `secret`, and `token`.

## Testing Requirements

```bash
NODE_ENV=test vitest run --config vitest.config.ts \
  tests/vitest/kits/curated-starter-contract.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run `wc -l` on all five human-authored files and fail if any exceeds 1,000.

## Documentation Updates Required

None. TASK-555-07-L01 documents the final DTO after route/client validation; L03 is
closure metadata only.
