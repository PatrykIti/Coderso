# TASK-414-05-L05: Strict Action Contribution Registry and Closed-Union Split
# FileName: TASK-414-05-L05-Strict-Action-Contribution-Registry-And-Closed-Union-Split.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-05
**Priority:** Critical
**Category:** Agent / Action Contracts / Schema / Modularity / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-02-L01 terminal; TASK-414-03-L02 terminal;
TASK-548-03-L03 terminal; TASK-551-09-L02 terminal; TASK-554 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Split the oversized closed Assistant action type/schema/family modules and add
one strict, statically composed action-contribution registry so later TASK-414
Post and capability-pack actions can enter the existing
plan -> normalize -> permission -> dry-run -> reviewed execute pipeline without
editing another central switch or weakening the current action union.

This leaf changes no native CMS behavior and adds no new executable action by
itself. It converts the existing action set to the new seam byte/behavior-
compatibly, freezes every current action as a legacy contribution, and hands the
typed registry to TASK-414-05-L04/L01 and TASK-414-06.

## Sub-Tasks

None; this executable infrastructure leaf lands first inside TASK-414-05.

## Verified Baseline and Mandatory Split

At contract authoring:

- `core/services/assistant/actionPlanTypes.ts` is 1,517 lines;
- `core/services/assistant/actionPlanSchema.ts` is 2,307 lines;
- `core/services/assistant/actionFamilyContracts.ts` is 989 lines and cannot
  accept another family safely; and
- `assistantActionTypes`, the plan parser, permission collection, dry-run,
  executor dispatch, cache invalidation, planner/mappers, provider contracts,
  routes, tests, and UI narrowings assume the current closed union.

Before behavior changes, use definition/call-graph plus exact text inventory to
record every producer and consumer. Split by action domain, preserve stable
public import paths through thin facades below 1,000 lines, and keep every new
module/test independently runnable and below 1,000 lines. Do not move arbitrary
line ranges or create `utils.ts`, `types2.ts`, a declaration-merging escape, an
`any`-typed input, or a second action pipeline.

## Exact Single-Writer Ownership

This leaf is the sole TASK-414 writer for:

- `core/services/assistant/actionPlanTypes.ts` as a compatibility facade;
- `core/services/assistant/actionPlanSchema.ts` as a compatibility facade;
- `core/services/assistant/actionFamilyContracts.ts` as a compatibility facade;
- `core/services/assistant/actionRegistry.ts`;
- new `core/services/assistant/actionContracts/actionContribution.ts`;
- new `core/services/assistant/actionContracts/actionContractRegistry.ts`;
- new `core/services/assistant/actionContracts/actionPlanBase.ts`;
- new
  `core/services/assistant/actionContracts/assistantActionRouteInjection.ts` —
  the focused pure injection helper
  `applyAssistantActionRegistry(router, deps, registry)` consumed read-only by
  TASK-414-09-L03's single terminal `assistantRoutes.ts` edit; this leaf does
  NOT edit `assistantRoutes.ts` itself;
- new cohesive domain modules under
  `core/services/assistant/actionContracts/families/`:
  `contentActions.ts`, `screenListingActions.ts`, `formEntryActions.ts`,
  `menuSeoMediaActions.ts`, `pageTemplateActions.ts`, and
  `siteKitCompatibilityActions.ts`;
- new `core/services/assistant/actionContracts/legacyActionContributions.ts`;
- `core/services/assistant/actionPermissionService.ts` for registry dispatch
  instead of type switches;
- focused existing action-plan/schema/family/registry tests and new
  `tests/vitest/assistant/actionContractRegistry.test.ts`;
- new `tests/integration/assistant/actionContributionPipeline.test.ts`; and
- new `tests/unit/assistant/actionClosedUnionInventory.test.ts`.

If the verified inventory shows another direct closed-union consumer, amend
this allowlist before editing it. This leaf must not edit native domain
services, Post action implementations, TASK-554 files, DB schema/migrations,
provider adapters, TASK-414-05-L04 executor modules, TASK-414-06 capability
implementations, shared route mounts, `core/server/routes/assistantRoutes.ts`
(its single terminal family edit belongs to TASK-414-09-L03), Admin UI, tasks,
or changelog.

## Canonical Contribution Contract

The pure owner exports:

```ts
export type AssistantActionExecutionModeV1 =
  | "legacy_reviewed"
  | "transaction_owned_single";

export type AssistantActionContributionBaseV1<
  TType extends string,
  TInput,
> = Readonly<{
  type: TType;
  family: AssistantActionContractFamily;
  parseInput(value: unknown): TInput;
  requiredPermissions(input: TInput): readonly PermissionId[];
  previewAdapterId: string;
}>;

// Status-discriminated union: the two branches have disjoint shapes, so a
// contract-only row cannot carry executor/approval fields at all.
export type ExecutableAssistantActionContributionV1<
  TType extends string,
  TInput,
> = AssistantActionContributionBaseV1<TType, TInput> & Readonly<{
  status: "executable";
  executionMode: AssistantActionExecutionModeV1;
  executeAdapterId: string;
  approvalKind: AssistantActionApprovalKindV1 | null;
  cacheFactKinds: readonly FiniteNativeCacheFactKindV1[];
}>;

export type ContractOnlyAssistantActionContributionV1<
  TType extends string,
  TInput,
> = AssistantActionContributionBaseV1<TType, TInput> & Readonly<{
  status: "contract-only";
  executionMode: null;
  executeAdapterId: null;
  approvalKind: null;
  cacheFactKinds: readonly [];
}>;

export type AssistantActionContributionV1<TType extends string, TInput> =
  | ExecutableAssistantActionContributionV1<TType, TInput>
  | ContractOnlyAssistantActionContributionV1<TType, TInput>;

// Separate closed type sets derived by the registry:
export type ExecutableAssistantActionTypeV1 = string & Readonly<{ __executable?: never }>;
export type ContractOnlyAssistantActionTypeV1 = string & Readonly<{ __contractOnly?: never }>;
// The registry exports `executableActionTypes` and `allActionTypes` as two
// separate frozen sets; executable-only consumers type against the first.

export type NormalizedRegisteredAssistantActionV1 = Readonly<{
  id: string;
  type: string;
  contribution: VerifiedAssistantActionContributionHandleV1;
  // NOTE: no `input` field. Parsed input is retained only inside the registry
  // closure (a WeakMap keyed by the opaque handle) and is returned exclusively
  // through registry methods that immediately invoke that contribution's
  // parser, permission resolver, preview adapter, or executor binding.
}>;

// Executable canonical serialization seam. The parsed `TInput` lives only in
// the registry WeakMap; every serialized projection (plan JSON, normalized
// plan hash, dry-run diff, browser DTO bytes) is produced by this seam over a
// strict copy. The opaque handle never serializes.
export type AssistantActionPlanInputJsonV1 = Readonly<{
  schemaVersion: 1;
  actionType: string;
  normalized: unknown;
}>;

export function serializeAssistantActionPlanInputV1(
  input: unknown,
): AssistantActionPlanInputJsonV1;
export function parseAssistantActionPlanInputV1(
  json: AssistantActionPlanInputJsonV1,
): unknown;

export function createAssistantActionContractRegistryV1(input: {
  legacy: readonly AssistantActionContributionV1<string, unknown>[];
  extensions?: readonly AssistantActionContributionV1<string, unknown>[];
}): AssistantActionContractRegistryV1;
```

Closure-based input erasure: the parsed `TInput` never exists as a stored
`unknown` field on a record that can escape the registry. `normalizeAction`
parses the candidate input through the contribution's strict parser inside the
registry closure and keeps the result in a module-private `WeakMap` keyed by
the opaque verified handle; callers receive only the handle and must go back
through registry methods (`requiredPermissions`, `executionDescriptor`,
`normalizeForDryRun`, `bindForExecute`, `serializeActionInputV1`) that close
over the parsed input. No caller casts, switches on arbitrary provider text, or
receives a raw `unknown` input value.

One executable canonical serialization seam exists: the registry retains the
parsed input ONLY in the `WeakMap`, and every serialized projection (plan JSON,
normalized plan hash, dry-run diff, browser DTO bytes) goes through
`serializeAssistantActionPlanInputV1` -> `parseAssistantActionPlanInputV1` on a
strict copy derived from that closure-held value. The seam is recursively
browser-safe — it rejects functions, symbols, class instances, and unknown
fields before allocation — and it is deterministic, so equal inputs serialize
to byte-equal JSON. The opaque handle and the `WeakMap` itself never serialize.

The registry:

- recursively normalizes every contribution before construction;
- rejects duplicate/unknown/empty type/family/schema/permission/adapter data;
- sorts only non-semantic contribution sets and freezes after construction;
- derives `assistantActionTypes`, input parsing, family metadata, permission
  collection, execution mode, approval requirements, and adapter lookup from
  the same records;
- exposes exactly one serialization seam (`serializeActionInputV1`) that
  returns the strict `AssistantActionPlanInputJsonV1` copy and never the
  handle;
- has no runtime `register()` mutator, directory scan, plugin hook, string-
  keyed fallback, `any`, declaration merging, or “unknown action” executor;
- accepts TASK-414 additions only through an explicit static contribution array
  assembled by the final TASK-414-09-L03 owner; and
- preserves a default legacy-only registry for existing callers until that
  final composition lands.

The legacy adapter transcribes every current `assistantActionTypes` member once
and proves exact bidirectional equality against the pre-split type/schema/family
inventory. Existing action plan JSON, normalized plan hash, dry-run diff,
required permissions, execution behavior, cache invalidation, idempotency, undo,
and browser DTO bytes remain unchanged; every one of those serialized
projections is now produced exclusively through
`serializeAssistantActionPlanInputV1`/`parseAssistantActionPlanInputV1` on the
strict closure-held copy, so the split stays behavior/byte-compatible.

## Plan and Route Integration

`normalizeAssistantActionPlanV1(value, registry)` parses the strict plan root,
then calls `registry.normalizeAction()` for every action. Unknown types, missing
contributions, parser errors, contract-only actions, duplicate action IDs, and
unknown nested input keys fail before permission collection or service work.

The existing `/assistant/actions/plan`, `/dry-run`, and `/execute` routes receive
one server-composed frozen registry dependency. A client/provider cannot select,
extend, or describe a contribution. Plan output remains recursively strict and
browser-safe; the opaque handle never serializes. Plan JSON, the normalized plan
hash, dry-run diffs, and browser DTO bytes are produced only through the
serialize/parse seam (`serializeAssistantActionPlanInputV1` ->
`parseAssistantActionPlanInputV1`) over the WeakMap-held strict copy. On
dry-run/execute, the server renormalizes the supplied plan through the same
current registry and requires the same plan/action hash before native work.

Provider operation drafts remain untrusted and cannot emit arbitrary action
objects. Local policy/mappers may request only a contribution type present in
the current registry; they pass candidate input through that contribution's
strict parser before a plan exists. Contract-only families remain non-
executable and cannot be promoted by a contribution with a reused type.

TASK-414-05-L01 supplies exactly the three Post contributions. TASK-414-06
supplies only its explicitly declared bounded capability actions. L04 consumes
the execution-mode/approval/adapter records and remains the sole executor
orchestrator. TASK-414-09-L03 statically assembles the final array after all
contributors are terminal; no later leaf edits this registry owner.

**Executor narrowing has exactly one owner.** TASK-414-05-L04 is the one actual
owner of executor dispatch narrowing: its `actionExecutorService.ts` resolves
the executor solely from the contribution's `executionDescriptor` record
(executor adapter ID, execution mode, approval kind) returned by this registry,
and it narrows only over the executable set (`executableActionTypes`). This
contract does not forbid every owner from narrowing; it assigns the single
narrowing to L04 and requires every other leaf to consume the registry's typed
descriptors instead of switching on action types. The registry itself carries no
executor and no "unknown action" executor; plan normalization and route
dispatch reject unknown/contract-only types before any native work.

## Implementation Pseudocode

```ts
export function createAssistantActionContractRegistryV1(input) {
  const contributions = normalizeAndFreezeContributionArray([
    ...input.legacy,
    ...(input.extensions ?? []),
  ]);
  assertUniqueActionTypes(contributions);
  const byType = new Map(contributions.map((row) => [row.type, row]));
  const parsedInputs = new WeakMap<VerifiedAssistantActionContributionHandleV1, unknown>();
  const executableTypes = Object.freeze(
    contributions.filter((row) => row.status === "executable").map((row) => row.type),
  );
  return Object.freeze({
    types: Object.freeze(contributions.map((row) => row.type)),
    executableActionTypes: executableTypes,
    allActionTypes: Object.freeze([...contributions.map((row) => row.type)]),
    normalizeAction(value: unknown) {
      const base = normalizeStrictActionEnvelope(value);
      const contribution = byType.get(base.type);
      if (!contribution || contribution.status !== "executable") {
        throw new Error("assistant_action_type_invalid");
      }
      const input = contribution.parseInput(base.input); // inside the closure only
      const handle = mintVerifiedHandle(contribution, base);
      parsedInputs.set(handle, input); // erased: never stored on the record
      return brandNormalizedRegisteredAction({ ...base }, handle);
    },
    requiredPermissions(action) {
      const { contribution, input } = requireMatchingVerifiedHandle(action, parsedInputs);
      return normalizePermissionUnion(contribution.requiredPermissions(input));
    },
    executionDescriptor(action) {
      const { contribution } = requireMatchingVerifiedHandle(action, parsedInputs);
      return projectExecutionDescriptor(contribution); // executable-only narrowing happens in L04
    },
    serializeActionInputV1(action) {
      const { input } = requireMatchingVerifiedHandle(action, parsedInputs);
      return serializeAssistantActionPlanInputV1(input); // strict browser-safe copy; handle never serializes
    },
  });
}

export function normalizeAssistantActionPlanV1(
  value: unknown,
  registry: AssistantActionContractRegistryV1,
): AssistantActionPlan {
  const root = normalizeStrictActionPlanEnvelope(value);
  const actions = root.actions.map((value) => registry.normalizeAction(value));
  assertUniqueActionIds(actions);
  return finalizeNormalizedPlan(root, actions);
}

export async function collectActionPermissionsV1(plan, registry) {
  return normalizePermissionUnion(
    plan.actions.flatMap((action) => registry.requiredPermissions(action)),
  );
}
```

**Data flow:** untrusted plan/provider draft -> strict root envelope -> current
frozen type lookup -> contribution-owned recursive input parser (result held in
the registry closure only) -> opaque normalized action handle -> contribution-owned permission/preview/execution
metadata -> serialize/parse seam for every serialized projection (plan JSON,
normalized plan hash, dry-run diff, browser DTO bytes) -> existing reviewed
pipeline.

**Error handling:** unknown/duplicate/malformed contributions fail startup as
`assistant_action_registry_invalid`; unknown/contract-only plan types fail as
`assistant_action_type_invalid`; nested input failures preserve the existing
bounded family error where safe; handle/registry generation mismatch fails
`assistant_action_registry_stale`. No error returns plan input, provider text,
permissions, native IDs, or internal module paths.

## Security Contract

- **Endpoint visibility:** no new endpoint. Existing internal
  `/admin/api/assistant/actions/*` routes remain the only plan/dry-run/execute
  surface.
- **Auth/RBAC:** existing Admin session and `assistant:use`; every contribution
  returns exact native permission IDs, rechecked at dry-run and execute. A
  contribution cannot grant or infer permissions.
- **CSRF:** unchanged and required for dry-run/execute writes through existing
  unsafe-method middleware.
- **Rate limit:** existing Assistant/action buckets, unchanged. Contributions
  cannot select or weaken a bucket.
- **Reject unknown:** contribution records, plan root/actions, every nested
  action input, permission lists, execution descriptors, and serialized output
  (including every `AssistantActionPlanInputJsonV1` produced by the seam)
  reject unknown fields and are bounded before allocation.
- **Anti-abuse:** no public write; nonce/HMAC/CAPTCHA are not applicable.
  Review, idempotency, approval, conflict, transaction, and native anti-abuse
  contracts remain authoritative.
- **Secrets/privacy:** registries, errors, logs, audits, tests, and browser DTOs
  contain no provider secrets, raw prompts, session/CSRF values, permission
  snapshots, private documents, DB errors, or opaque contribution handles.

## Regression-Test Shape

- Inventory proves every pre-split action type has exactly one legacy
  contribution and every contribution has type/schema/family/permission/
  preview coverage, with executor/approval coverage on the executable rows only
  and the two derived type sets (`executableActionTypes`/`allActionTypes`)
  matching the status-discriminated branches.
- Golden fixtures normalize every current action to byte-identical plan/hash and
  preserve current permission, dry-run, execute, idempotency, undo, cache, and
  route behavior; plan JSON, normalized plan hash, dry-run diff, and browser DTO
  bytes are asserted byte-identical exclusively through the serialize/parse
  seam, and round-trip fixtures prove reject-unknown, function/symbol/class-
  instance rejection, and determinism.
- Unknown type, duplicate type/ID, contract-only action, unknown nested input,
  parser throw, missing permission/adapter, stale registry handle, and mixed
  registry generations fail before native work.
- Synthetic Post and capability contributions traverse normalization ->
  permission collection -> dry-run -> reviewed execute through injected fakes,
  proving no central switch edit is required. Product behavior remains owned by
  L01/L04/L06 tests.
- Static import/call inventory proves no production consumer directly switches
  on the old union outside the compatibility family modules and no `any`,
  declaration merge, dynamic registry mutation, or provider-controlled
  contribution path exists.
- Every facade/new production/test module remains at or below 1,000 physical
  lines; old import paths compile unchanged.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/actionPlanSchema.test.ts \
  tests/vitest/assistant/actionFamilyContracts.test.ts \
  tests/vitest/assistant/actionContractRegistry.test.ts
set -a && source .env && set +a && bun test \
  tests/unit/assistant/actionClosedUnionInventory.test.ts \
  tests/integration/assistant/actionContributionPipeline.test.ts \
  tests/integration/routes/assistant-actions.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run lint:repo:types
bun run scan:security:strict
git diff --check
wc -l core/services/assistant/actionPlanTypes.ts \
  core/services/assistant/actionPlanSchema.ts \
  core/services/assistant/actionFamilyContracts.ts \
  core/services/assistant/actionRegistry.ts \
  core/services/assistant/actionPermissionService.ts \
  core/services/assistant/actionContracts/actionContribution.ts \
  core/services/assistant/actionContracts/actionContractRegistry.ts \
  core/services/assistant/actionContracts/actionPlanBase.ts \
  core/services/assistant/actionContracts/assistantActionRouteInjection.ts \
  core/services/assistant/actionContracts/families/contentActions.ts \
  core/services/assistant/actionContracts/families/screenListingActions.ts \
  core/services/assistant/actionContracts/families/formEntryActions.ts \
  core/services/assistant/actionContracts/families/menuSeoMediaActions.ts \
  core/services/assistant/actionContracts/families/pageTemplateActions.ts \
  core/services/assistant/actionContracts/families/siteKitCompatibilityActions.ts \
  core/services/assistant/actionContracts/legacyActionContributions.ts \
  tests/vitest/assistant/actionPlanSchema.test.ts \
  tests/vitest/assistant/actionFamilyContracts.test.ts \
  tests/vitest/assistant/actionContractRegistry.test.ts \
  tests/unit/assistant/actionClosedUnionInventory.test.ts \
  tests/integration/assistant/actionContributionPipeline.test.ts \
  tests/integration/routes/assistant-actions.test.ts
```

## Documentation Updates Required

Exact handoff docs (implementation facts only; this leaf edits none of them):

- TASK-414-05-L04 and TASK-414-05-L01 — the frozen registry contract, the
  `AssistantActionContributionV1` shape, execution-mode/approval/adapter
  records, and the legacy-contribution inventory so the executor and Post
  contributions consume the terminal seam;
- TASK-414-11-L01 — implementation facts for `_docs/ASSISTANT_SITE_BUILDER.md`
  and `_docs/CMS_API.md` only where the frozen registry changes the documented
  action contract surface (behavior remains byte-compatible in this leaf).

Explicit `None`: this leaf adds no end-user or contributor prose, and it does
not update `docs/guide/`, `_docs/RBAC_SPEC.md`, `_docs/SECURITY_SPEC.md`, or
`_docs/CODERSO_PLUGIN_CONTRACT.md`. Do not edit TASK-414/TASK-548/TASK-551/
TASK-554 task files, task-board rows, changelog files, or changelog 1266 during
this leaf.

## Acceptance Criteria

- Every current action remains strict and behavior/byte-compatible through one
  frozen contribution registry.
- TASK-414 Post/capability actions can join through leaf-owned contributions
  without editing an oversized type/schema/family switch or adding a second
  executor path.
- Provider/browser input cannot register a contribution, choose an adapter,
  bypass strict nested parsing, or weaken native permission/review/idempotency/
  transaction policy.
- Every serialized projection (plan JSON, normalized plan hash, dry-run diff,
  browser DTO bytes) is produced exclusively through the strict browser-safe
  serialize/parse seam; the opaque handle never serializes.
- All closed-union consumers are migrated or explicitly compatibility-facaded,
  and every touched human-authored production/test module is at most 1,000
  physical lines.
