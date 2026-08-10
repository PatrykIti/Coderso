# TASK-555-06-L02: Whole-Resource Drift Reapply and Update Policy
# FileName: TASK-555-06-L02-Whole-Resource-Drift-Reapply-And-Update-Policy.md

**Parent Subtask:** TASK-555-06
**Priority:** High
**Category:** Reliability / Drift Policy / Data Integrity
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-06-L01 receipt

---

## Overview

Define the whole-resource three-way policy that preserves user-only edits and
blocks ambiguous or conflicting managed writes before preview/apply. Freeze enough
target/live evidence for L02's two provider bridges; do not emit an operation value
that either native engine cannot execute or persist.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Own pure three-way drift and managed-evidence mutation policy. Sole writer:
`core/services/kits/curatedStarters/driftPolicy.ts`,
`core/services/kits/curatedStarters/driftService.ts`,
`tests/vitest/kits/curated-starter-drift-policy.test.ts`, and
`tests/unit/kits/curatedStarterDriftService.test.ts`.

## Forbidden Paths

Repositories/routes/UI/Setup/provider executors/artifacts, all named forbidden task
families, indexes/changelogs/workflows/smokes/root/TMP paths.

## Security Contract

No route. Inputs are strict owner-normalized snapshots from L01, never browser JSON.
Whole-resource digests are bounded/domain-separated. No recursive arbitrary JSON merge,
force flag, downgrade, secret, or snapshot appears in DTO/logs. Conflicts fail closed.

## Implementation Pseudocode

```ts
type CuratedManagedWriteDecisionV1 =
  | Readonly<{ disposition: "managed_write"; classification:
      "unchanged" | "release_only" | "converged" }>
  | Readonly<{ disposition: "preserve_live"; classification: "user_only";
      inheritedManagedBaseDigest: string; releaseTargetDigest: string;
      liveAfterDigest: string; currentId: string }>;

type PersistedManagedLineageDecisionV1 = Readonly<{
  disposition: "preserve";
  inheritedManagedBaseDigest: string;
  targetReleaseDigest: string;
  liveAfterDigest: string;
  currentId: string;
}>;

switch (classify(baseDigest, liveDigest, targetDigest)) {
  case "unchanged": case "release_only": case "converged":
    return { disposition: "managed_write", classification };
  case "user_only":
    return exactPreserveDecision({ inheritedManagedBaseDigest: baseDigest,
      releaseTargetDigest: targetDigest, liveAfterDigest: liveDigest, currentId });
  default: throw code("curated_starter_drift_conflict");
}

function toPersistedManagedLineageDecision(
  decision: Extract<CuratedManagedWriteDecisionV1, { disposition: "preserve_live" }>,
): PersistedManagedLineageDecisionV1 {
  return {
    disposition: "preserve",
    inheritedManagedBaseDigest: decision.inheritedManagedBaseDigest,
    targetReleaseDigest: decision.releaseTargetDigest,
    liveAfterDigest: decision.liveAfterDigest,
    currentId: decision.currentId,
  };
}

if (isUnmanagedCollision(input)) {
  if (input.kind !== "setting" || !isProviderOwnedTakeoverKey(input.provider, input.key)) {
    throw code("curated_starter_drift_conflict");
  }
  return exactSettingTakeoverCandidate(input.key, input.present, input.valueDigest);
}
```

L01's DB-authoritative active-head `managedLineage.items[].inheritedManagedBaseDigest`
together with the live owner projection and current target -> per-resource
classification -> next lineage item and bounded status/
apply eligibility. A `preserve_live` disposition carries its inherited managed base forward;
it never promotes the user's live digest into the release baseline. Missing managed IDs,
ambiguous evidence, non-setting unmanaged natural-key collisions, and user+release edits
block. A provider-owned allowlisted setting collision becomes a takeover candidate
only with exact presence/value baseline and sorted key identity; apply still requires
explicit matching confirmation. Legacy may produce transitions only for
`site.homepageId`, `site.navigationMenuId`, and `site.footerTemplateId`, and only when
their exact before/after states differ. Full-site comparison delegates setting items
to TASK-547 and emits no TASK-555 setting transition. One release exists, so no
downgrade branch/error/UI promise is representable.

The decision is the sole handoff to TASK-555-02-L02's
`providerPreserveBridge.ts`. The internal policy retains
`disposition:"preserve_live"` and `releaseTargetDigest`; exactly
`toPersistedManagedLineageDecision` renames them to persisted
`disposition:"preserve"` and `targetReleaseDigest`. Both providers map the engine-facing
operation to verified `noop`. Legacy skips its resource handler; full-site uses the
exact live-target bridge in `preparedSaga.ts`. This leaf does not widen
`SolutionKitInstallItemOperation`, `FullSiteInstallOperation`, initialization plans, or
DB operation rows with `preserve`. A bridge that fails either rename, drops the release
target, promotes `liveAfterDigest` into the inherited base, or sends
`operation:"preserve"` is a contract failure.

## Error Handling

Malformed inputs fail `curated_starter_validation_invalid`; conflicts fail
`curated_starter_drift_conflict`; no fallback merge or force path exists.

## Testing Requirements

Exhaustive truth table, ordering/determinism, whole-resource byte identity, table-owned
head/version input, three successive reapplies with user-only preservation,
inherited-base carry-forward, converged state, missing ID, legacy three-key transition
presence/value, empty TASK-555 full-site transition list, allowlisted setting takeover, rejected
non-setting unmanaged collision, stale preview, malformed/oversized input, and source
scan proving no downgrade/force merge. Pin exact preserve-decision target/live/current
evidence for both provider handoffs, byte-exact
`preserve_live/releaseTargetDigest -> preserve/targetReleaseDigest -> noop` mapping, and
compile-time/source negatives proving neither native operation union accepts
`preserve`; TASK-555-02-L02 owns executable bridge tests.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/curated-starter-drift-policy.test.ts
bun test tests/unit/kits/curatedStarterDriftService.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/kits/curatedStarters/driftPolicy.ts core/services/kits/curatedStarters/driftService.ts tests/vitest/kits/curated-starter-drift-policy.test.ts tests/unit/kits/curatedStarterDriftService.test.ts
```

All files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 owns the documentation/generated-output handoff; L03 is closure
metadata only.
