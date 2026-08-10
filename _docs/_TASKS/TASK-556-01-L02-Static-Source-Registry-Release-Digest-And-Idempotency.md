# TASK-556-01-L02: Static Source Registry Release Digest and Idempotency
# FileName: TASK-556-01-L02-Static-Source-Registry-Release-Digest-And-Idempotency.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-01
**Priority:** High
**Category:** Designer / Pure Contract / Static Registry
**Estimated Effort:** Medium
**Dependencies:** TASK-556 external terminal gate; TASK-556-01-L01
**Start Receipt:** TASK-556-01-L01 reviewed landed diff, green commands, and line-count receipt
**Completion Receipt:** Reviewed owned diff plus every command below green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Own the pure frozen registry, registry-authored terminal `DesignerBriefV1`,
its terminal canonical `designerBriefDigest`, separate digest domains, strict
binding/request normalizers, and Transaction-A classification policy. Real
asynchronous TASK-555 release loading belongs to 02-L01; this leaf uses injected
immutable fixtures.

## Sub-Tasks

None; this is an executable leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- `core/services/designer/staticSources/staticSourceContract.ts`;
- `core/services/designer/staticSources/staticSourceDigest.ts`;
- `core/services/designer/staticSources/staticSourceRegistry.ts`;
- `core/services/designer/staticSources/staticSourceIdempotency.ts`;
- exact additive regions in `core/services/designer/materializationSourceContract.ts`
  and `core/services/designer/materializationSourceRegistry.ts`;
- `tests/vitest/designer/designer-static-source-contract.test.ts`;
- `tests/vitest/designer/designer-static-source-registry.test.ts`;
- `tests/vitest/designer/designer-static-source-digest.test.ts`;
- `tests/vitest/designer/designer-static-source-idempotency.test.ts`.

Forbidden paths: 01-L01-owned DB/migration files; all `core/services/kits/**`,
`core/services/designer/*Compiler*`, `*Stage*`, `*Receipt*`, `core/server/**`,
`core/admin/**`, `core/services/assistant/action*`, `scripts/runtime-smoke*`,
task/changelog indexes, root config, `AGENTS.md`, `_TMP*`, and non-TASK-556 tasks.

## Identity and Registry Contract

Registry contributions are literal server imports, deeply frozen, duplicate
rejecting, and cannot come from HTTP, provider, plugin, environment, DB,
directory scan, dynamic path, or arbitrary callback.

```text
artifactSha256           = TASK-555 exact artifact-byte digest (input only)
packageFingerprint       = TASK-547 normalized-package fingerprint (input only)
releaseDescriptorDigest  = TASK-555 descriptor digest (input only)

designerBriefDigest = terminal canonical digest of
  normalizeDesignerBriefForWrite(FORMADOM_DESIGNER_BRIEF_LITERAL_V1)

bindingDigest = sha256(domain "coderso.designer-static-binding@v1",
  bindingSchema, sourceId, releaseKey, releaseVersion, artifactSha256, packageFingerprint,
  releaseDescriptorDigest, designerBriefDigest, contributionVersion, registryVersion,
  compilerVersion)

seedRequestDigest = sha256(domain "coderso.designer-static-seed-request@v1",
  sourceId, expectedReleaseDescriptorDigest)
```

All tuples are UTF-8, length-delimited and canonical. The three upstream digest
domains are `artifactSha256`, `packageFingerprint`, and
`releaseDescriptorDigest`; the three Designer domains are
`designerBriefDigest`, `bindingDigest`, and `seedRequestDigest`. Designer
contribution, registry, or compiler version changes only `bindingDigest`; it must not
recompute or alter any upstream digest or the unchanged literal brief digest.
Actor and the in-memory idempotency key are lookup scopes, not request-digest
fields; persistence receives only its lowercase SHA-256 digest.

```ts
export type CodeOwnedStaticSourceBindingV1 = Readonly<{
  kind: "code_owned_static";
  sourceId: "formadom-studio";
  bindingSchema: "coderso.designer-code-owned-static-binding@v1";
  releaseKey: "formadom-studio@1.0.0";
  releaseVersion: "1.0.0";
  artifactSha256: Sha256Hex;
  packageFingerprint: Sha256Hex;
  releaseDescriptorDigest: Sha256Hex;
  designerBriefDigest: Sha256Hex;
  contributionVersion: string;
  registryVersion: string;
  compilerVersion: string;
  bindingDigest: Sha256Hex;
}>;

export type StaticSeedRequestIdentityV1 = Readonly<{
  sourceId: "formadom-studio";
  expectedReleaseDescriptorDigest: Sha256Hex;
  seedRequestDigest: Sha256Hex;
}>;

export type CodeOwnedStaticSourceContributionV1 = Readonly<{
  sourceId: "formadom-studio";
  releaseKey: "formadom-studio@1.0.0";
  contributionVersion: string;
  designerBrief: DesignerBriefV1;
  designerBriefDigest: Sha256Hex;
}>;
```

`DesignerMaterializationSourceBindingV1` gains exactly the
`CodeOwnedStaticSourceBindingV1` branch. A
`CodeOwnedStaticBoundDesignerGenerationClaimV1` is the terminal
`BoundDesignerGenerationClaim` whose `preparedSourceBindStatus` is `bound` and
whose projected `sourceExecutionBinding` is rebuilt only from the exact matching
static run/claim columns. The generic persisted provider/prepared-private source-
execution and source-lease columns remain null for this branch.

The contribution owns exactly one code literal
`FORMADOM_DESIGNER_BRIEF_LITERAL_V1`, builds `designerBrief` once through terminal
`normalizeDesignerBriefForWrite`, computes the terminal canonical
`designerBriefDigest` once from those normalized bytes, rejects canonical UTF-8
brief bytes above 512 KiB, then deep-freezes both.
The brief contains no prompt, provider/model ID, user data, package bytes,
canonical IDs, or workflow state. Host/browser data cannot patch or replace the
brief or digest. Transaction A writes the same normalized brief into the
generation run's exact `static_brief` JSONB and compatible immutable seed
revision, while static run/claim/binding evidence carries the matching digest;
receipt construction
later consumes that exact digest.

## Claim Classification and Budgets

`classifyStaticSeedClaim` receives the locked binding/workspace/original static
seed run/current static attempt/claim plus a separately loaded request alias.
Only the binding's original/current static run IDs can satisfy static
in-progress/takeover policy; a later `prompt_ai`/Figma run never can. The closed
outcomes remain `new | replay_ready | replay_failed | reopen | retry_failed |
fork_promoted | takeover | in_progress` or an imported typed error.

The bounded preflight and authoritative Transaction A return a compilation-facts
projection with the stored normalized generation-run `static_brief`, canonical brief digest,
contribution/registry/compiler versions, and complete binding identity for
`takeover` and `retry_failed`. Those outcomes never read, compare, or substitute
current registry facts. Current frozen contribution/registry/compiler facts are
resolved lazily only for `new` and `fork_promoted`; after a unique-race rollback,
a same-key alias classifies that immutable historical run before reading the
binding, while an alias-absent live winner returns in-progress without making its
candidate durable.

Alias classification happens before current-binding classification:

- same owner/key/request resolves the alias's immutable historical run, never the
  binding's newer root;
- retained receipt-bound success returns `replay_ready` only when that historical
  workspace is currently in `generating | ready | promotion_pending | failed |
  promoted`; retained deterministic failure returns `replay_failed` in that same
  navigable subset, including after a later retry changed the current state;
- a matching live nonterminal alias returns `in_progress` with no fence; an
  expired/nonterminal same-key alias returns
  `designer_static_seed_idempotency_conflict` with bounded fresh-key guidance and
  never rotates or redispatches that key;
- a fresh-key live collision also returns `in_progress` but inserts no alias and
  consumes no terminal-reopen cap. After DB-clock expiry, a fresh key may insert
  one dispatch alias only together with the fenced takeover rotation;
- the initial dispatch and each successful takeover consume one of exactly eight
  locked per-run dispatch attempts. Collision losers consume none. A would-be
  ninth attempt returns terminal `designer_reconciliation_required` with no
  alias/fence/dispatch;
- same key/different `seedRequestDigest` conflicts; missing, contradictory, or
  partial receipt evidence delegates to `designer_reconciliation_required`.
  For either terminal result, `draft`/`restoring` first return
  `designer_workspace_state_invalid`, `rejected`/`expired`/`deleting`/`deleted`
  first return `designer_workspace_terminal`, and `reconciliation_required`
  returns that terminal reconciliation error.

For a fresh key, the terminal Designer-state matrix is exhaustive:

| Current state | Exact fresh-key disposition |
|---|---|
| `draft` | `designer_workspace_state_invalid`; a static root is born `generating`, so this is inconsistent. |
| `generating` | Current static claim live -> `in_progress`; current static claim expired -> rotate that run's fence and `takeover`; retained successful static seed plus a later provider claim -> `reopen`; all other evidence -> `designer_reconciliation_required`. |
| `ready` | Exact successful static receipt -> `reopen`; otherwise `designer_reconciliation_required`. |
| `promotion_pending` | Exact successful static receipt -> `reopen` with zero lifecycle write; otherwise `designer_reconciliation_required`. |
| `promoted` | Exact successful static receipt -> `fork_promoted`, creating one new private root and CAS-advancing all binding root/digest fields; otherwise `designer_reconciliation_required`. |
| `failed` | Original deterministic static failure with no retry -> `retry_failed`, creating exactly one immutable retry revision/run/claim; terminal retry failure -> `replay_failed` with no second retry; successful static seed plus a later failed provider revision -> `reopen`; otherwise `designer_reconciliation_required`. |
| `rejected`, `expired`, `deleting`, `deleted` | `designer_workspace_terminal`; no reopen, retry, takeover, or fork. |
| `restoring` | `designer_workspace_state_invalid`; no automatic resume. |
| `reconciliation_required` | `designer_reconciliation_required`; no automatic repair. |

`reopen` performs no lifecycle transition, revision allocation, compiler pass, or
stage write and returns the current authoritative workspace version/active
revision/state. A fresh key may rotate an expired initial or sole retry static
claim fence, but never creates a second retry run. Only a fully terminal-pruned
binding can be recreated with current versions.

Source/release/`seedRequestDigest` must always match. A retained successful root
reopens under its recorded `bindingDigest`/compiler versions even when the current
registry version has advanced; reopen does not compare against or rewrite current
registry facts. Static takeover and the one retry must use the recorded normalized
run `static_brief`, binding identity, and contribution/registry/compiler versions. A promoted
fork is the only retained-root path that builds a new binding from current
contribution/registry/compiler versions and atomically advances
the pointer.

The static registry owns no capability-state/evidence schema. 04-L01 maps
seed/reopen from the already landed exact route, two Admin controls, and Guide
atomic/composed-workflow registries into terminal `CmsCapabilityManifestV1`.
Agent `inspect/research/plan/mutate` are unavailable with
`product_not_applicable`, while Designer `stage/preview/validate/promote` reuse
byte-for-byte the terminal supported adapter IDs, permission IDs, and bounds for
the package resources. Provider-free static lifecycle is proved by runtime
import/call tests; a later explicit AI revision retains terminal Designer
provider policy. No new schema/compiler/generator or runtime authorization import
is created.

Pure normalization/digest/lookup supports at most 32 contributions, 128-byte IDs,
64-byte versions, and 64 lowercase hex digests; target <=2 ms p95 per composition
and <=1 ms p95 lookup on the fixed registry. Brief canonical UTF-8 bytes are at
most 512 KiB. The persistence owner exports
`MAX_STATIC_DISPATCH_ATTEMPTS_PER_RUN = 8` and checks it under the run lock; this
pure leaf duplicates neither the counter nor lock. No I/O, retry, lock, or timer exists.

## Implementation Pseudocode

```ts
export function buildStaticBinding(upstream, contribution, versions) {
  assertDistinctVerifiedUpstreamIdentities(upstream);
  assertCanonicalDesignerBriefDigest(
    contribution.designerBrief,
    contribution.designerBriefDigest,
  );
  const identity = {
    ...projectUpstreamIdentity(upstream),
    designerBriefDigest: contribution.designerBriefDigest,
    ...versions,
  };
  return deepFreeze({
    ...identity,
    bindingDigest: digestBinding(identity),
  });
}

export function selectStaticCompilationFacts(outcome, persisted, getCurrent) {
  switch (outcome) {
    case "new":
    case "fork_promoted":
      return requireCanonicalCurrentCompilationFacts(getCurrent());
    case "takeover":
    case "retry_failed":
      return requireCanonicalPersistedCompilationFacts(persisted);
    default:
      return null; // replay/reopen/in-progress never compiles
  }
}

export function classifyStaticSeedClaim(existing, request, requestAlias) {
  if (!existing) return "new";
  if (requestAlias) {
    assertEqual(requestAlias.seedRequestDigest, request.seedRequestDigest);
    const historical = requireExactAliasRun(existing, requestAlias);
    assertHistoricalAliasReplayState(historical.workspaceState);
    switch (historical.result.kind) {
      case "receipt_bound_success":
        return "replay_ready";
      case "deterministic_failure":
        return "replay_failed";
      case "nonterminal":
        if (historical.claim.isLiveAt(request.now)) return "in_progress";
        throw staticError("designer_static_seed_idempotency_conflict");
      case "inconsistent":
        throw designerError("designer_reconciliation_required");
      default:
        return assertNever(historical.result);
    }
  }

  assertExactSourceReleaseAndSeedRequest(existing, request);
  switch (existing.workspaceState) {
    case "draft":
    case "restoring":
      throw designerError("designer_workspace_state_invalid");
    case "generating":
      return classifyGeneratingStaticOrLaterProvider(existing, request.now);
    case "ready":
    case "promotion_pending":
      assertExactSuccessfulStaticReceipt(existing);
      return "reopen";
    case "promoted":
      assertExactSuccessfulStaticReceipt(existing);
      return "fork_promoted";
    case "failed":
      return classifyFailedOriginalRetryOrLaterProvider(existing);
    case "rejected":
    case "expired":
    case "deleting":
    case "deleted":
      throw designerError("designer_workspace_terminal");
    case "reconciliation_required":
      throw designerError("designer_reconciliation_required");
    default:
      return assertNever(existing.workspaceState);
  }
}
```

**Data flow:** strict fixture/upstream identities -> separate verification -> one
normalized literal brief + terminal `designerBriefDigest` -> Designer-only
binding digest including the version triple -> frozen registry -> strict request
digest -> alias-first, state-exhaustive classification -> persisted compilation
facts from run `static_brief` for takeover/retry or lazy current facts for new/promoted-fork ->
Transaction A.

**Errors:** `designer_static_source_invalid`, `designer_static_source_unknown`,
`designer_static_source_duplicate`, `designer_static_source_mutable`,
`designer_static_release_descriptor_stale`, `designer_static_source_digest_mismatch`,
`designer_static_seed_idempotency_conflict`, `designer_static_seed_in_progress`,
`designer_static_binding_version_conflict`, `designer_static_seed_request_limit`.
Terminal `designer_workspace_state_invalid`, `designer_workspace_terminal`, and
`designer_reconciliation_required` are imported from the terminal Designer error
owner rather than added to this union. Diagnostics expose only safe
source/version/code.

## Tests

- Deep immutability, duplicate/missing/unknown/schema/version/hostile object failures.
- Golden domains for all three upstream and three Designer digests; every one-
  field mutation; brief mutation changes `designerBriefDigest` and
  `bindingDigest`, each contribution/registry/compiler version mutation changes
  binding only, and
  timestamps/process/path never contribute.
- Exact alias replay/resume/reopen/key conflict/live-lease/expired-takeover/fence/
  deterministic-failure/new-key retry/promoted-fork/pruned-reseed and binding-version evolution
  matrix over all 12 terminal Designer states; no generic fallback; concurrent
  same-key callers receive one dispatch fence, exact same-key aliases never
  redispatch, and later provider claims never classify as the static claim.
- Unique-race policy reads owner/key alias first after savepoint rollback: a
  winner that reaches ready before the loser re-read yields exact historical
  replay; only alias absence permits current-binding classification.
- Fresh-key live-collision races insert no aliases or consume the terminal-reopen
  cap; a 33-key cap-exhaustion attempt still permits one fresh-key takeover after
  expiry. Same-key expired remains conflict/fresh-key guidance, while terminal
  reopen aliases retain the separate exact 32/33 disposition.
- Initial dispatch plus seven takeovers reach the exact locked attempt cap of 8;
  every ninth attempt is reconciliation-required with zero alias/fence/dispatch,
  including an eighth/ninth concurrency race, while collision losers do not count.
- Registry/brief/compiler evolution tests prove takeover and sole retry return the
  persisted normalized run `static_brief`, digest, version triple, and binding identity;
  current facts are called exactly for new/promoted-fork and never for those
  persisted paths.
- Registry has no capability-state/provider-requirement union and no runtime
  authorization import; provider-free static source boundaries are frozen here.
  The later 04-L01 test owns terminal `CmsCapabilityManifestV1`, landed
  route/control/workflow evidence, Designer supported facts, and Agent
  `inspect/research/plan/mutate = unavailable/product_not_applicable`.
- One literal normalized `DesignerBriefV1`, terminal stable
  `designerBriefDigest`, exact 512 KiB boundary/overflow, hostile mutation
  rejection, and zero browser/provider/package-derived fields.
- Existing prompt/private materialization fixtures remain byte-identical.
- Complete import graph forbids filesystem selection, provider, Agent, direct/
  canonical installer, route callback, and dynamic registry contribution.
- Numeric contribution/length/latency budgets.

## Security Contract

- **Visibility:** pure Bun-free server contract; no endpoint.
- **Authentication/RBAC:** n/a; digest/registry facts never authorize.
- **CSRF/rate:** n/a; route-owned later.
- **Validation:** strict plain objects, reject unknown, bounded work, deep freeze, domain-separated digests.
- **Anti-abuse/privacy:** no public write/I/O; no package body/path/provider/actor leakage.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer/designer-static-source-contract.test.ts tests/vitest/designer/designer-static-source-registry.test.ts tests/vitest/designer/designer-static-source-digest.test.ts tests/vitest/designer/designer-static-source-idempotency.test.ts
bun run check:admin-boundary
git diff --check
```

Run terminal materialization registry regressions and TASK-547 fingerprint tests
read-only. Run `wc -l` on all touched human-authored production/test files and
fail above 1,000.

## Documentation Updates Required

Record exact schemas, digest domains/goldens, limits, classification and errors
for TASK-556-04-L02. Edit no shared docs/metadata here.
