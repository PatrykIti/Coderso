# TASK-414-08-L01: Designer Brief, Provider Run, and Multimodal Input Contract
# FileName: TASK-414-08-L01-Designer-Brief-Provider-Run-And-Multimodal-Input-Contract.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-08
**Priority:** Critical
**Category:** Designer / Provider Boundary / Inputs
**Estimated Effort:** Large
**Dependencies:** TASK-414-07 terminal; TASK-414-03-L01 provider/model
capabilities terminal; TASK-414-04 private attachment quarantine/extraction
leaves terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Define one strict Designer brief, select bounded scanned multimodal projections,
claim a generation run, invoke only an explicitly capable provider/model, and
normalize its response into an untrusted package-draft envelope for the backend
compiler. Reopening or inspecting an existing draft never requires a provider.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for:

- `core/services/designer/briefContract.ts`
- `core/services/designer/providerDraftContract.ts`
- `core/services/designer/multimodalInputContract.ts`
- `core/services/designer/designerProviderBridge.ts`
- `core/services/designer/providerRunService.ts`
- `core/services/designer/providerRunPrompt.ts`
- `tests/vitest/designer/designer-brief-contract.test.ts`
- `tests/vitest/designer/designer-provider-draft.test.ts`
- `tests/vitest/designer/designer-provider-run.test.ts`
- `tests/integration/designer/designer-provider-run.test.ts`

It imports the terminal provider capability resolver and private
attachment/quarantine projection owner. It must not edit shared Agent provider
contracts, infer capabilities from model names, create another attachment
table or scanner, accept public Media URLs as private inputs, edit
`FullSitePackageV1`, compile/materialize stage rows, mount routes, or edit
task/changelog files.

## Brief and Input Contract

`DesignerBriefV1` is a strict, versioned, bounded record of user intent. It may
contain site purpose, audiences, locales, brand facts, tone, required page and
content concepts, navigation intent, accessibility/content constraints,
functional requirements, and references to authorized scanned projections.
It cannot contain raw CSS/HTML/JavaScript, credentials, arbitrary URLs,
canonical IDs, permissions, route mounts, provider/model IDs, workflow state,
or approval facts.

Limits are explicit for object depth, page/concept/reference counts, each
string, aggregate characters/tokens, input count, per-kind projection bytes,
and aggregate projected bytes. The normalizer trims/canonicalizes strings,
sorts only order-insensitive sets, preserves authored semantic order, and is
idempotent.

Multimodal references resolve only to owner-scoped records rooted at the
current Designer workspace (or explicitly consumed through an owner-matched
Agent handoff) that have
passed the TASK-414-04 quarantine, malware scan, type sniff, decompression/
document bomb limits, extraction, and privacy policy. Designer receives a
bounded normalized projection by default. Native image/file forwarding occurs
only when the exact fresh model profile supports that file kind and all
provider/privacy policy gates permit it. Remote URL fetches are forbidden.

## Provider Contract

A generation run requires the currently configured server-side Designer
provider and exact model plus a fresh explicit capability profile with strict
structured output and all needed input modalities. Unknown, stale, malformed,
or unsupported facts are false. Context, output, file, tool, timeout, and cost
limits use the smallest applicable configured/provider/model/product ceiling.
Raw requests/briefs forbid provider IDs, model IDs, credentials, adapter names,
and capability assertions; there is no caller-selected or fallback model.

The provider receives a backend-owned system contract, normalized brief,
bounded input projections, terminal TASK-547 package-kind vocabulary, and
opaque stable symbolic-key rules. It returns only a strict
`DesignerProviderDraftV1`; that object remains untrusted. Provider-supplied
digests, validation results, permissions, native IDs, storage paths, URLs,
workflow states, or executable operation names are rejected as unknown fields.

Raw provider request/response bodies are transient. Durable run evidence stores
L01's complete strict `ProviderExecutionBindingV1`, bounded
usage/timing, input brief/projection digests, normalized draft digest, and a
safe result/error code. No prompt/provider body enters logs or backups.

## Implementation Pseudocode

```ts
export async function createDesignerGenerationIntent(
  command: StartDesignerGenerationCommand,
  deps: DesignerProviderRunDeps
): Promise<SafeQueuedDesignerGenerationV1> {
  const brief = normalizeDesignerBriefForWrite(command.brief);
  const authorization = await deps.authorization.resolveCurrentDesignerGeneration({
    actor: command.actor,
    workspaceId: command.workspaceId,
    operationId: "designer.generate-site",
    inputIds: brief.inputIds,
    requiredCapabilities: requiredDesignerCapabilities(brief),
  });
  const intent = await deps.workspaces.createQueuedGenerationIntent({
    workspaceId: command.workspaceId,
    expectedVersion: command.expectedVersion,
    expectedState: command.expectedState,
    revisionId: command.revisionId,
    actor: command.actor,
    brief,
    providerExecutionBinding: authorization.profile.executionBinding,
    inputBindingDigest: authorization.inputBindingDigest,
  });
  deps.dispatcher.dispatchAfterCommit(intent.runId);
  return projectSafeQueuedDesignerGeneration(intent);
}

export async function processClaimedDesignerGeneration(
  claim: FencedDesignerGenerationClaim,
  deps: DesignerProviderRunDeps,
): Promise<UntrustedDesignerDraft> {
  try {
    const authorization = await deps.authorization.resolveCurrentDesignerGeneration({
      actorId: claim.actorId,
      workspaceId: claim.workspaceId,
      revisionId: claim.revisionId,
      operationId: "designer.generate-site",
      inputIds: claim.inputIds,
      requiredCapabilities: claim.requiredCapabilities,
    });
    assertExactProviderExecutionBinding(
      claim.providerExecutionBinding,
      authorization.profile.executionBinding,
    );
    assertCurrentDesignerClaimOwnershipPermissionsInputsAndFence(
      claim,
      authorization,
    );
    const inputs = await deps.inputs.materializeAlreadyAuthorizedScannedProjections({
      claim,
      authorization,
    });
    const raw = await deps.provider.generateStructured({
      model: authorization.profile.evidence.modelId,
      schema: DESIGNER_PROVIDER_DRAFT_SCHEMA,
      prompt: buildDesignerProviderPrompt(claim.brief, inputs),
      limits: smallestDesignerRunLimits(authorization.profile, deps.policy),
    }); // external I/O: never inside a DB transaction
    const draft = parseUntrustedDesignerProviderDraft(raw);
    await deps.runs.recordNormalizedDraft(claim, safeDraftEvidence(draft, raw.usage));
    return { claim, brief: claim.brief, inputs, draft };
  } catch (error) {
    await deps.runs.failClaimIfCurrentFence(claim, mapSafeProviderFailure(error));
    throw mapDesignerProviderError(error);
  }
}
```

Run claims are bounded and version/revision-specific; their cross-replica
exclusivity consumes (read-only) TASK-414-05-L04's durable execution lease
contract by exact name (`assistant_action_execution_leases`, fence
compare-and-swap) instead of a vague lease-like primitive or a process-local
mutex, while this leaf keeps its own run-claim bounds and claim fence on top
of that durable lease. All current
profile, RBAC, workspace ownership, input binding/state/digest, and claim-fence
resolution occurs inside the settlement `try`, after the claim and immediately
before the first provider/input materialization I/O. Any mismatch settles the
current fence with zero provider call and zero staged write. A retry uses
a new run ID and explicit user action; it does not silently reuse provider
output. Completion/failure checks the claim fence so a late provider response
cannot overwrite a newer revision or run.

## Data Flow

```text
strict API command + server actor
  -> DesignerBriefV1 normalization/digest
  -> authorized scanned input projections
  -> exact fresh provider/model capability profile + immutable execution binding
  -> committed queued intent -> CAS generation claim
  -> fresh post-claim profile/RBAC/ownership/input/fence reauthorization
  -> bounded external structured generation
  -> strict reject-unknown untrusted draft
  -> safe run evidence + TASK-414-08-L02 compiler input
```

No provider call begins before ownership, scan state, limits, capability, and
generation claim pass. No database transaction spans external I/O.

## Machine-Readable Errors

- `designer_brief_invalid`
- `designer_brief_too_large`
- `designer_input_not_found`
- `designer_input_not_ready`
- `designer_input_unsupported`
- `designer_input_too_large`
- `designer_model_capability_stale`
- `designer_model_unsupported`
- `designer_provider_unavailable`
- `designer_provider_output_invalid`
- `designer_generation_conflict`
- `designer_generation_in_progress`
- `designer_generation_limit_exceeded`
- `designer_generation_timeout`

Only bounded safe paths, limits, retry-after values, and provider-neutral codes
may reach route mapping. Provider text, raw schema errors, input content,
credentials, URLs, or capability payloads are never returned.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Service-only leaf consumed by the internal generation/input endpoints from TASK-414-07-L02. No provider or input endpoint is public. |
| Authentication | A trusted actor context from a valid Admin session is mandatory before input resolution or provider selection. Actor/provider identity is not accepted from raw provider output. |
| RBAC | Input and generation callers require `designer:write`; reading provider settings remains governed by existing backend settings policy without exposing credentials. |
| CSRF | Route callers require shared CSRF on input upload/delete and generation POST before this service runs. |
| Rate limits | Generation uses `designer-generation`, one bounded active run per workspace, per-actor/workspace concurrency (cross-replica exclusivity through TASK-414-05-L04's durable execution lease `assistant_action_execution_leases`), provider daily budgets, and hard token/time/byte ceilings. Raw private upload remains TASK-414-04's shared `private-input-upload` operation; Designer binding uses `admin_write`. |
| Validation | Briefs, input references/projections, capability profiles, provider draft, usage metadata, and safe evidence use recursive reject-unknown schemas and aggregate complexity limits. MIME/type/scan facts come only from the quarantine owner. |
| Anti-abuse | Session + CSRF + RBAC + ownership + scan gates + CAS/fenced run claim + durable execution lease/fence (`assistant_action_execution_leases`) apply. No public write, nonce/HMAC, or reCAPTCHA surface exists. Remote fetches and arbitrary tool/provider operations are forbidden. |

## Regression-Test Shape

Vitest tests cover brief canonicalization/idempotence, every scalar and
aggregate limit, unknown/forbidden fields, stable authored ordering, safe
digesting, input projection selection, exact capability truth table, smallest-
ceiling math, strict provider-draft parsing, and redacted error/evidence maps.

Bun integration tests use injected fake provider and real persistence to prove:

- unknown/stale model capabilities produce zero provider calls;
- caller-supplied provider/model/capability fields are rejected and changing
  current server configuration is observed immediately before the run;
- cross-owner, unscanned, quarantined, unsupported, oversized, and remote inputs
  produce zero provider calls;
- provider I/O occurs outside transactions;
- one workspace has at most one current fenced generation claim;
- late output after revision/version change is discarded and cannot stage;
- malformed/unknown-key/oversized provider output fails safely;
- raw prompt/input/provider bodies never enter durable rows, logs, or backups;
- failed runs leave a retryable bounded code and no partial stage graph.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-brief-contract.test.ts \
  tests/vitest/designer/designer-provider-draft.test.ts \
  tests/vitest/designer/designer-provider-run.test.ts
set -a && source .env && set +a && bun test tests/integration/designer/designer-provider-run.test.ts
git diff --check
wc -l core/services/designer/briefContract.ts \
  core/services/designer/providerDraftContract.ts \
  core/services/designer/multimodalInputContract.ts \
  core/services/designer/designerProviderBridge.ts \
  core/services/designer/providerRunService.ts \
  core/services/designer/providerRunPrompt.ts \
  tests/vitest/designer/designer-brief-contract.test.ts \
  tests/vitest/designer/designer-provider-draft.test.ts \
  tests/vitest/designer/designer-provider-run.test.ts \
  tests/integration/designer/designer-provider-run.test.ts
```

## Documentation Updates Required

Provide final brief fields/limits, supported input policy, exact provider/model
requirements, quota/error UX, and privacy/retention notes to the closure leaf.
Do not edit provider setup docs, task indexes, or changelog 1266 here.
