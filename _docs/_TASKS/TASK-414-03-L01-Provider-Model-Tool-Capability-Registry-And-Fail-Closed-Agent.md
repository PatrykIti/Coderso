# TASK-414-03-L01: Provider/Model/Tool Capability Registry and Fail-Closed Agent
# FileName: TASK-414-03-L01-Provider-Model-Tool-Capability-Registry-And-Fail-Closed-Agent.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-03
**Priority:** Critical
**Category:** AI Providers / Agent Runtime / Tool Security / Limits
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-02-L01; terminal TASK-548-03-L03
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414 closure only)

---

## Overview

Replace model-name inference, optimistic provider defaults, expanding limit
math, and deterministic Agent fallback with a strict capability-evidence
registry and bounded server tool runtime. Agent and Designer generation must be
reported available only when an explicitly configured provider and exact model
have fresh, verified evidence for the requested operation.

Guide is not part of this runtime. Its TASK-548 docs retrieval and read-only
answers remain provider-free and continue to work when every Agent/Designer
capability is unavailable.

## Sub-Tasks

None; this is an executable leaf.

## Exclusive File Ownership

Re-read the terminal TASK-548/TASK-414-02 paths before implementation. This leaf
is the sole writer of the provider/tool/runtime contract and focused tests:

- `core/services/assistant/providers/providerTypes.ts`;
- `core/services/assistant/providers/index.ts`;
- `core/services/assistant/providers/openAiProvider.ts`;
- `core/services/assistant/providers/openRouterProvider.ts`;
- `core/services/assistant/modelCapabilities.ts` (replace heuristic behavior;
  keep a compatibility re-export only when current callers require it);
- `core/services/assistant/promptLimits.ts`;
- `core/services/assistant/providerPlanningContext.ts`;
- new `core/services/network/outboundHttpPolicy.ts`;
- new `core/services/network/pinnedOutboundTransport.ts`;

> **Cross-stream land order (recorded with TASK-567):** `outboundHttpPolicy.ts`
> is the SINGLE shared server-side egress/SSRF policy for ALL webhook/egress
> paths. TASK-567 (`_docs/_TASKS/TASK-567_Outbound_Webhook_Egress_Policy_SSRF_Hardening.md`,
> changelog 1289, active stream) creates that path FIRST with the shared
> `EgressProvider` union (`slack/zapier/login-alert/webhook/openai/openrouter/sentry`)
> + `validateOutboundUrl` + `fetchWithEgressPolicy` + `validateSentryDsn`.
> This leaf then EXTENDS it with agent-purpose policies and creates
> `pinnedOutboundTransport.ts`; its consumers (`TASK-414-04-L01:170`,
> `TASK-414-06-L05:165`) keep their existing references to the module. Do NOT
> create a second module under `core/services/outboundEgress/`. `openAiProvider.ts` /
> `openRouterProvider.ts` remain EXCLUSIVE to this leaf (TASK-567 must not edit
> them; it only defines the provider allowlist policy in the shared module).
- `core/services/assistant/assistantService.ts` only to isolate Guide from Agent
  provider execution and remove Agent-success fallback;
- `core/services/assistant/actionPlannerService.ts`, which must be split by
  cohesive responsibility because the current file exceeds 1,000 physical
  lines; preserve required public imports through a thin facade;
- new `core/services/assistant/actionPlanner/actionPlanBuilders.ts` for ready,
  refinement, blueprint, clarification, docs, and inspection plan builders;
- new `core/services/assistant/actionPlanner/actionFollowUpPlanner.ts` for the
  existing-site follow-up resolution path;
- new `core/services/assistant/actionPlanner/actionLocalPolicyPlanner.ts` for
  prompt policy, content-type field, and local recovery planning;
- new `core/services/assistant/actionPlanner/actionProviderDraftPlanner.ts` for
  strict provider response parsing, request limits, metadata, and provider/local
  orchestration; the facade retains only stable public entry points;
- new `core/services/assistant/providerCapabilities/providerCapabilitySchema.ts`;
- new `core/services/assistant/providerCapabilities/providerCapabilityRegistry.ts`;
- new `core/services/assistant/providerCapabilities/effectiveProviderLimits.ts`;
- new `core/services/assistant/agentRuntime/agentAvailability.ts`;
- new `core/services/assistant/agentRuntime/agentToolRegistry.ts`;
- new `core/services/assistant/agentRuntime/agentRunBudget.ts`;
- new `core/services/assistant/agentRuntime/providerActionPlanner.ts`;
- new
  `tests/vitest/assistant/provider-capabilities/providerCapabilitySchema.test.ts`,
  `providerCapabilityRegistry.test.ts`, and
  `effectiveProviderLimits.test.ts` in that same directory;
- new `tests/vitest/assistant/agent-runtime/agentAvailability.test.ts`,
  `agentToolRegistry.test.ts`, `agentRunBudget.test.ts`, and
  `providerActionPlanner.test.ts` in that same directory;
- existing `tests/vitest/assistant/model-capabilities.test.ts`,
  `tests/vitest/assistant/providerResolver.test.ts`,
  `tests/vitest/assistant/openAiProvider.test.ts`,
  `tests/vitest/assistant/openRouterProvider.test.ts`,
  `tests/vitest/assistant/provider-planning-context.test.ts`, and
  `tests/unit/assistant/assistantService.test.ts`.
- new `tests/security/outboundHttpPolicy.test.ts` and
  `tests/security/assistantProviderEgress.security.test.ts`;
- `tests/vitest/assistant/actionPlannerService.test.ts` must be reduced below
  1,000 lines by cohesive scenario ownership, with extracted independently
  runnable suites under `tests/vitest/assistant/action-planner/` named
  `blueprint-and-classification.test.ts`, `resource-actions.test.ts`,
  `follow-up-planning.test.ts`, `provider-drafts.test.ts`, and
  `redaction-and-policy.test.ts`. Do not move arbitrary line ranges or weaken
  assertions; the retained file owns only facade/import compatibility and
  cross-slice integration cases.

This leaf does not edit `core/server/routes/assistantRoutes.ts`, DB/schema/
migration files, Admin clients/UI/cache, persistence repositories, Guide corpus
or generated coverage, Designer workspace services, task-board rows, or
changelog files. L03 is the only route consumer/writer and must remove its
legacy route-local `Math.max`/provider resolver when adopting these services.

No production/test module touched by this leaf may exceed 1,000 physical lines.
Extract provider prompt assembly, strict response parsing, deterministic native
policy validation, and orchestration into named modules; do not move arbitrary
line ranges into generic helpers.

## Shared Outbound Policy and Provider Credential Audience

This leaf creates the single reusable server-side outbound URL/DNS/peer/
redirect policy and approved-address transport later consumed read-only by web
research, webhook delivery, and Figma import. Consumers register closed,
code-owned purpose policies; they cannot pass callbacks or request options that
weaken forbidden address classes, peer verification, redirect authorization,
proxy bypass, credential forwarding, timeout, content-type, or wire/decoded
byte limits.

Provider adapters use exact purposes for completion, model metadata, native
file upload/read/delete, and any provider-owned asset fetch. OpenAI and
OpenRouter default to their fixed official HTTPS origins and path allowlists.
A custom base URL is unavailable unless an administrator selects an explicitly
approved HTTPS provider-proxy profile with a code-owned policy ID/version; a raw
URL, userinfo, IP literal, nonstandard port, query-carried credential, private/
reserved/metadata target, or browser/model-selected host can never become an
audience. The decrypted credential is bound to exact provider ID, policy ID,
canonical origin, and configuration generation before request construction.

For every connection, the shared transport strictly canonicalizes the host,
resolves A/AAAA through an injected bounded resolver, rejects if any answer is
loopback/private/link-local/multicast/unspecified/reserved/documentation/
benchmark/carrier-grade-NAT/metadata or forbidden IPv4-mapped IPv6, connects to
an approved address while preserving TLS SNI/Host, and verifies the actual peer
belongs to the approved set. It ignores ambient `HTTP_PROXY`, `HTTPS_PROXY`,
`ALL_PROXY`, and `NO_PROXY` behavior. Provider requests reject redirects by
default; a future cross-origin redirect needs a separately registered purpose
and never inherits `Authorization`, provider cookies, or private request bytes.
There is no uncontrolled second DNS lookup.

Requests and responses have separate encoded-wire and decoded-body caps,
streaming deadlines, exact content-type/encoding allowlists, and abort on first
overflow. Model metadata, completion, and native-file paths all use this same
transport. Logs/errors expose only safe provider/purpose/policy IDs, counters,
timings, and reason codes—never origin credentials, DNS answers, peer addresses,
headers, prompts, attachment bytes, or raw responses.

## Capability Evidence Contract

### Exact evidence shape

Capability evidence is strict and keyed by normalized exact `(providerId,
modelId, adapterVersion)`:

```ts
type ProviderModelCapabilityEvidenceV1 = {
  schema: "coderso.provider-model-capabilities@v1";
  providerId: "openai" | "openrouter" | ProviderAdapterId;
  modelId: string;
  adapterVersion: string;
  provenance: {
    sources: readonly CapabilityProvenanceSourceV1[];
    factSources: Readonly<Record<ProviderCapabilityFactId, readonly Sha256Digest[]>>;
    evidenceDigest: Sha256Digest;
  };
  capabilities: {
    textInput: boolean;
    textOutput: boolean;
    strictJsonSchema: boolean;
    strictToolCalls: boolean;
    parallelToolCalls: boolean;
    imageInput: boolean;
    fileInput: boolean;
  };
  inputPolicy: {
    acceptedMimeTypes: string[];
    nativeForwardMimeTypes: string[];
    normalizedProjectionMimeTypes: string[];
    maxItems: number | false;
    maxItemBytes: number | false;
    maxAggregateBytes: number | false;
    transport: "inline" | "provider-upload" | "either" | false;
    providerUploadCleanup: "synchronous" | "bounded-async" | false;
  };
  limits: {
    contextTokens: number | false;
    maxOutputTokens: number | false;
    maxRequestBytes: number | false;
    maxImageBytes: number | false;
    maxFileBytes: number | false;
  };
};

type ProviderExecutionBindingV1 = {
  schema: "coderso.provider-execution-binding@v1";
  providerId: "openai" | "openrouter" | ProviderAdapterId;
  modelId: string;
  adapterVersion: string;
  configGeneration: string;
  evidenceDigest: Sha256Digest;
  inputPolicyDigest: Sha256Digest;
};

type ExactModelCapabilityProfileV1 = {
  evidence: ProviderModelCapabilityEvidenceV1;
  evidenceDigest: Sha256Digest;
  effectiveInputPolicy: ProviderModelCapabilityEvidenceV1["inputPolicy"];
  executionBinding: ProviderExecutionBindingV1;
  freshnessAnchorAt: string;
  expiresAt: string;
};

type CapabilityProvenanceSourceV1 =
  | {
      kind: "provider-api";
      endpointId: string;
      observedAt: string;
      expiresAt: string;
      responseDigest: Sha256Digest;
    }
  | {
      kind: "primary-source-review";
      sourceUrl: string;
      sourceRevision: string;
      reviewedAt: string;
      expiresAt: string;
      contentSha256: Sha256Digest;
    };

type ProviderCapabilityFactId =
  | "capabilities.textInput" | "capabilities.textOutput"
  | "capabilities.strictJsonSchema" | "capabilities.strictToolCalls"
  | "capabilities.parallelToolCalls" | "capabilities.imageInput"
  | "capabilities.fileInput" | "inputPolicy"
  | "limits.contextTokens" | "limits.maxOutputTokens"
  | "limits.maxRequestBytes" | "limits.maxImageBytes"
  | "limits.maxFileBytes";

type EffectiveAgentRunLimitsV1 = {
  contextTokens: number;
  outputTokens: number;
  requestBytes: number;
  responseBytes: number;
  attachmentCount: number;
  attachmentItemBytes: number;
  attachmentAggregateBytes: number;
  rounds: number;
  actions: number;
  elapsedMs: number;
};

export async function requireFreshExactProfile(input: {
  operationId: string;
  requestedInputMimeTypes?: readonly string[];
}): Promise<ExactModelCapabilityProfileV1>;
```

Every object recursively rejects unknown fields. IDs, versions, timestamps,
arrays, MIME values, and evidence payloads are bounded. MIME lists are unique,
canonically sorted exact values; wildcards such as `image/*` cannot authorize
forwarding. `nativeForwardMimeTypes` and `normalizedProjectionMimeTypes` are
subsets of `acceptedMimeTypes`. A file operation requires known positive item,
per-item, and aggregate limits plus an explicit transport; provider-side upload
also requires an explicit cleanup mode. Missing facts mean unsupported, and
generic `fileInput: true` cannot authorize an unknown MIME or unbounded upload.
Every finite `ProviderCapabilityFactId` has a non-empty, unique, sorted source-
digest list; a source may authorize only facts its strict payload actually
contains. Contradictory sources reject rather than selecting the optimistic
value. `evidenceDigest` covers canonical non-secret facts, full provenance/fact
mapping, and exact provider/model/version; it never covers or stores credentials.

Only these sources are valid:

- **provider-api:** metadata fetched through the credential-bound shared
  outbound transport, parsed by a provider-specific strict schema, matched back
  to the exact model, and recorded with endpoint ID/time/digest provenance; and
- **primary-source-review:** exact-model metadata shipped by the concrete
  adapter only after a pinned review of a primary provider source, recording
  canonical source URL, provider/source revision, review timestamp, content
  digest, and expiry. No wildcard, regex, family, prefix, suffix, or substring
  match is allowed.

Provider-API evidence TTL is at most 1 hour. A primary-source review is valid
for at most 90 days and its `reviewedAt`/`expiresAt` are immutable adapter bytes:
runtime startup/cache access cannot mint a new timestamp over unchanged facts.
All evidence is invalidated immediately on provider/model/config/adapter-version
change or adapter-health failure. Each source expiry must follow its own
observation/review timestamp and stay within its maximum; the effective profile
expires at the earliest contributing source. At `now >= expiresAt`, it is
expired. Clock-invalid evidence rejects.

Immediately before implementation and whenever an exact model registration is
added/changed, re-verify OpenAI capability facts against the official model
catalog (`https://developers.openai.com/api/docs/models`) and availability
against its Models API. The OpenAI Models API's basic ID/owner record cannot by
itself authorize modality/tool/file facts. Re-verify OpenRouter against its
official `GET /api/v1/models` contract
(`https://openrouter.ai/docs/api/api-reference/models/get-models`), whose strict
model record may support only the fields actually returned, such as input/output
modalities and supported parameters. Stale/unavailable primary sources keep the
affected exact model unavailable; they never refresh `reviewedAt` automatically.

An absent, omitted, `null`, malformed, contradictory, unmatched, expired, or
unverified value means `false`; it never inherits a default capability. Limits
that are absent/unknown become `false` and make operations needing that limit
unavailable. There is no `source: "default"` success path.

`modelCapabilities.ts` must not inspect model names. Add a regression source
guard for family-name fragments/pattern matching and behavior fixtures where
misleading model IDs cannot alter capabilities.

### Registry lifecycle

The registry is server-only and accepts adapter registrations at startup. Each
registration names exact supported provider/model pairs or exposes a bounded
verified metadata fetcher. Cache keys include provider ID, model ID, adapter
version, and a non-secret configuration generation. Cache entries expire at
evidence TTL and are invalidated on settings/integration generation changes.

This owner exports the exact names `ProviderExecutionBindingV1`,
`ExactModelCapabilityProfileV1`, `EffectiveAgentRunLimitsV1`, and
`requireFreshExactProfile`. TASK-414-04 and
TASK-414-08 import those names directly; aliases or independently redefined
profiles are drift. The helper resolves the currently configured exact
provider/model server-side for the requested operation and never trusts a
browser/session assertion as provider truth.

`executionBinding` is the only persisted/compared provider claim. It is a strict
canonical projection of the exact provider/model/adapter/config generation,
capability evidence, and effective input policy used for admission. Its
`inputPolicyDigest` covers the complete canonical effective policy after every
server-side clamp; it cannot be supplied by a route, browser, model, or queued
payload. Agent and Designer persist all six fields plus the schema discriminator
and compare the whole binding byte-for-byte after a fenced claim and immediately
before any provider, attachment, research, tool, native, or materialization I/O.

Fetch is single-flight and timeout bounded. A fetch failure does not reuse
expired evidence and does not turn stale data into `true`; return a safe
unavailable reason and bounded operator diagnostic. Raw provider metadata is
not written to browser payloads, logs, metrics, or DB session records.

## Fail-Closed Availability

`resolveAgentAvailability` evaluates in this order:

1. exact product request and manifest feature/mode/phase support;
2. authenticated server-side provider setting exists and is enabled;
3. exact non-empty model setting exists;
4. integration configuration and credential decrypt successfully;
5. concrete adapter resolves and passes health/config validation;
6. exact fresh capability evidence resolves;
7. operation-required capabilities and limits are explicitly true/known;
8. effective budgets remain positive after overhead reservation.

Any failure returns `{ available: false, reason }`. It does not call Guide,
`docsAnswerComposer`, local action heuristics, blueprint fallback, or a
deterministic planner and does not return a synthetic Agent answer.

The browser-safe status may expose provider ID, exact model display ID,
availability, capability booleans, safe limits, evidence source, observed/
expires timestamps, and reason. It must not expose Settings permission, full
settings/integration objects, API keys, auth headers, base URLs containing
credentials, raw metadata, or internal error messages.

Guide composition/retrieval may retain its own `fallbackUsed` semantics for
documentation backends under TASK-548; rename/isolate types where needed so
that value can never be mistaken for Agent availability or provider success.

## Effective Limits Are Ceilings

All configured values are operator ceilings, never desired minimums:

```ts
effective.contextTokens = minPositive(
  configured.maxInputTokens,
  evidence.limits.contextTokens,
  SERVER_AGENT_HARD_LIMITS.contextTokens,
);
effective.outputTokens = minPositive(
  configured.maxOutputTokens,
  evidence.limits.maxOutputTokens,
  SERVER_AGENT_HARD_LIMITS.outputTokens,
);
effective.requestBytes = minPositive(
  configured.maxRequestBytes,
  evidence.limits.maxRequestBytes,
  SERVER_AGENT_HARD_LIMITS.requestBytes,
);
```

Missing/non-positive/non-integer/unknown members do not participate as infinity;
they make the required operation unavailable. Reserve system prompt, strict
schema, selected CMS context, tool descriptors, and protocol margin before
allocating user/provider tokens. Reject when the reserve consumes the ceiling;
never truncate schemas or permission evidence to force a request through.

The exact server hard maxima are:

| Dimension | Hard maximum |
| --- | ---: |
| context per provider request | 128,000 tokens |
| output per provider request | 8,192 tokens |
| encoded provider request | 2 MiB |
| encoded provider response | 1 MiB |
| provider call timeout | 60,000 ms |

Provider/model/configured ceilings may make these smaller. Tests must prove
monotonicity: lowering any input ceiling never raises any effective limit.

## Structured Output Contract

Allowed provider response modes are explicit:

- `text` for non-mutating conversational Agent output only;
- `json_schema_strict` when the provider verifies exact strict JSON Schema;
- `tool_call_strict` when the provider verifies strict tool-call argument schema.

`json_object`, prompt-only JSON, best-effort parsing, markdown fences, repair,
or post-hoc coercion cannot authorize a mutation or any Designer generation,
validation, or promotion plan. For those operations, evidence must explicitly
support `strictJsonSchema` or `strictToolCalls`, the request must send the exact
strict schema, and the response must pass the same reject-unknown schema before
planning or persistence. Invalid output is a failed run with zero native side
effects.

A deterministic local policy may validate, clamp, order, or reject a strict
provider plan. It may never synthesize missing provider actions and report them
as provider-backed Agent success.

## Server Tool Registry

### Registration

Each immutable `AgentToolDefinitionV1` declares:

- exact `toolId`, schema version, owner, and manifest adapter ID;
- allowed product (`agent` or `designer`) and operation modes;
- strict input/output schemas with `additionalProperties: false` semantics;
- exact product and native permission IDs;
- target resource kinds and owner-resolution function;
- read/write class, idempotency key policy, and transaction/action adapter;
- redaction/audit policy and safe result projection;
- per-call time/token/byte bounds no greater than run hard caps.

Registration rejects duplicate/unsafe IDs, schema/version mismatch, missing
manifest adapter, unknown permission, over-limit definition, or mutable
definition objects. Extensions register through the verified L01 manifest
adapter; plugin metadata alone cannot add a tool.

### Lookup and authorization order

The required order is security-sensitive:

```ts
export async function invokeAgentTool(input: UnknownToolInvocation, ctx: RunContext) {
  const safeToolId = parseBoundedToolIdOnly(input.toolId);
  const tool = registry.get(safeToolId);
  if (!tool) throw agentError("assistant_tool_unknown");

  ctx.budget.reserveToolInvocation(tool.bounds); // no resource work yet
  const args = tool.inputSchema.parseStrict(input.arguments);
  const required = collectKnownToolPermissions(tool, args);
  await authorizeExactPermissions(ctx.identity, required);
  const ownedTargets = await resolveAuthorizedTargets(tool, args, ctx.identity);
  return executeAndProjectKnownTool(tool, args, ownedTargets, ctx);
}
```

Unknown lookup happens before permission collection, target loading, extension
lookup, provider argument logging, or audit details. An unknown tool response
contains only the generic code. Known forbidden tools map to
`assistant_tool_forbidden` without listing the caller's missing permissions.

## Run Budget Contract

One server-side budget object is created at run start and atomically accounts
for every provider/tool step. Exact absolute maxima:

| Run dimension | Absolute maximum |
| --- | ---: |
| provider/tool rounds | 8 |
| total proposed/executed tool actions | 24 |
| wall-clock elapsed time | 120,000 ms |
| cumulative provider input | 256,000 tokens |
| cumulative provider output | 32,000 tokens |
| tool argument bytes, per call / total | 128 KiB / 512 KiB |
| projected tool output bytes, per call / total | 1 MiB / 4 MiB |
| attachment projection bytes supplied to provider, total | 4 MiB |
| persisted provider/result bytes, total | 4 MiB |

The effective budget is the element-wise minimum of these maxima, configured
ceilings, provider evidence, manifest/tool bounds, quota remainder, and request
scope. Bytes are measured from encoded UTF-8/binary payloads, not JavaScript
character counts. Token usage uses provider-reported usage when valid and a
conservative tokenizer/estimator reservation before the call; reconcile actual
usage without releasing budget to another already-started action.

Reserve before each provider call/tool execution. If reservation or elapsed-time
check fails, cancel the run, abort pending provider requests where supported,
prevent new native effects, and persist a bounded terminal reason through L02.
Parallel calls count independently and can never race past the total action/byte
budget. Retry attempts consume rounds, time, and tokens.

## Security Contract

- **Endpoint visibility:** this leaf adds server-only services, not routes. L03
  exposes only internal authenticated Admin endpoints. There is no public
  provider metadata, availability, prompt, tool, or Designer generation route.
- **Auth model:** runtime resolution uses the authenticated Admin identity passed
  by L03. Provider credentials come only from the existing encrypted server
  integration service; API keys/public bearer tokens cannot invoke Agent tools.
- **RBAC:** availability does not authorize use. Agent requires
  `assistant:use`; research requires `assistant:research`; Designer generation
  requires `designer:write`; every known tool additionally requires exact native
  permissions from its immutable definition. Settings permissions are neither
  required for ordinary use nor exposed to the user.
- **CSRF:** no route exists here. L03 must apply shared CSRF to every provider/run/
  tool start, retry, cancel, and Designer generation write. GET status is
  side-effect free.
- **Rate-limit bucket:** L03 maps baseline Agent provider/tool-run operations to
  `assistant`. Downstream research and Designer route owners map their operations
  to the dedicated research/upload/generation/preview/promotion buckets declared
  by those leaves, in addition to these budgets and stricter native buckets.
- **Reject unknown:** capability evidence, provider metadata projections,
  response contracts, tool definitions, invocation arguments/results, budget
  inputs, and availability outputs recursively reject unknown keys and enforce
  limits before expensive work.
- **Anti-abuse:** no public write exists, so nonce, signature/HMAC, and
  reCAPTCHA are not applicable. Internal defense is layered with session auth,
  CSRF, RBAC, provider/tool quotas, strict schemas, owner checks, timeouts,
  cancellation, redaction, and audit.
- **Secrets/privacy:** never log/cache/return credentials, auth headers, raw
  settings, raw provider metadata, hidden system prompts, unredacted CMS/private
  attachment content, tool schemas containing privileged details, or provider
  request bodies. Metrics use safe IDs, counts, durations, reason codes, and
  rounded usage only.

## Implementation Pseudocode

```ts
export async function resolveProviderModelCapabilities(input: {
  providerId: string;
  modelId: string;
  configGeneration: string;
  now: Date;
}): Promise<Result<VerifiedCapabilityEvidence, AgentCapabilityError>> {
  const adapter = registry.resolveExactProvider(input.providerId);
  if (!adapter) return err("assistant_provider_unsupported");
  const cached = cache.get(exactEvidenceKey(input, adapter.version));
  if (cached && cached.expiresAt > input.now) return ok(cached);

  const transport = await outboundPolicy.requireApprovedProviderTransport({
    providerId: input.providerId,
    purpose: "provider-model-metadata",
    configGeneration: input.configGeneration,
  });
  const evidence = await adapter.getExactModelCapabilities(input.modelId, transport);
  const parsed = strictEvidenceSchema.safeParse(evidence);
  if (!parsed.success || parsed.data.modelId !== input.modelId) {
    return err("assistant_capability_unknown");
  }
  const verified = verifyProvenanceTtlAndDigest(parsed.data, input.now);
  cache.setUntilExpiry(exactEvidenceKey(input, adapter.version), verified);
  return ok(verified);
}

export async function planProviderBackedAgentRun(input: AgentPlanInput) {
  const availability = await resolveAgentAvailability(input.operation);
  if (!availability.available) throw agentError(availability.reason);
  const budget = createAgentRunBudget(minAllCeilings(availability, input));
  const contract = requireStrictContractForMutationOrDesigner(input.operation);
  const transport = await requireCredentialBoundProviderTransport(
    availability.safeCredentialAudience,
    "provider-completion"
  );
  const response = await callProviderWithReservation(input, contract, budget, transport);
  const strictPlan = parseExactProviderOutput(response, contract);
  const validated = validatePlanAgainstManifestAndNativePolicy(strictPlan);
  return { source: "provider", evidenceDigest: availability.evidenceDigest, validated };
  // No catch branch returns a local/docs/fallback plan as Agent success.
}
```

Data flow:

`encrypted server config + exact provider/model` → concrete adapter → fresh
strict evidence → manifest intersection → minimum effective limits → run budget
→ bounded provider call → strict response parse → deterministic native policy
validation → known-tool lookup → exact RBAC/owner resolution → native adapter.

Provider I/O stays outside DB transactions. L02 receives safe lifecycle events
and encrypted/redacted payload references through an injected interface; this
leaf does not import DB modules.

## Machine-Readable Errors

Use bounded domain errors `{ code, retryable, safeDetail? }`. Required codes:

- `assistant_provider_not_configured`;
- `assistant_provider_unsupported`;
- `assistant_provider_unavailable`;
- `assistant_model_not_configured`;
- `assistant_model_unavailable`;
- `assistant_capability_unknown`;
- `assistant_capability_expired`;
- `assistant_capability_provenance_invalid`;
- `assistant_capability_limit_unknown`;
- `assistant_effective_limit_exhausted`;
- `assistant_structured_output_required`;
- `assistant_provider_output_invalid`;
- `assistant_provider_failed`;
- `assistant_tool_unknown`;
- `assistant_tool_definition_invalid`;
- `assistant_tool_input_invalid`;
- `assistant_tool_output_invalid`;
- `assistant_tool_forbidden`;
- `assistant_budget_exceeded`;
- `assistant_run_timed_out`;
- `assistant_run_cancelled`.

`safeDetail` is a closed enum/field name, never provider text, a credential,
permission list, target identifier, model payload, stack, or driver error. L03
owns centralized HTTP mapping.

## Regression-Test Shape

Focused tests must prove:

- exact adapter/API evidence with valid digest and TTL enables only explicitly
  true capabilities; omitted/unknown/malformed/expired/mismatched evidence is
  false;
- provider API TTL >1h and primary-source review TTL >90 days reject or clamp
  fail-closed as specified, review expiry follows the 90-day maximum without
  runtime timestamp reminting, and config/model/adapter changes invalidate cache;
- provider metadata may authorize only fields it actually carries; OpenAI basic
  model-list records cannot infer modalities/tools, OpenRouter strict modality/
  parameter fields map only to their exact facts, contradictory per-fact sources
  fail, and a stale source disables the exact model;
- misleading model names (`gpt`, `claude`, `llama`, etc.) cannot change results,
  and source code has no model-family substring inference;
- provider metadata fetch failure never reuses expired evidence or a default;
- `ProviderExecutionBindingV1` round-trips only the exact seven keys (schema plus
  six fields); independently mutate provider/model/adapter/config generation,
  evidence digest and effective-input-policy digest to require mismatch, and
  prove no queued/browser/provider payload can override the server projection;
- no configured provider/model/credential means Agent unavailable while Guide
  fixtures still answer through the provider-free path;
- effective limits equal the minimum input ceiling, reserve overhead, reject an
  unknown ceiling, and satisfy monotonic property tests; route-level inflated
  limits are removed when L03 adopts the service;
- mutation and every Designer operation reject text, JSON-object, prompt-only
  JSON, unknown keys, malformed strict output, and unsupported schema/tool mode
  before side effects;
- provider exceptions/invalid output never return `planner: "local"` or
  `planner: "fallback"` as Agent success;
- tool unknown rejects before permission collector/target loader/audit callback
  mocks are invoked; known forbidden rejects before execution;
- duplicate/mismatched extension tools and unknown permissions reject at
  registration;
- rounds/actions/time/token/byte boundaries pass at exactly the effective limit,
  fail one unit over, count retries/parallel reservations, cancel remaining
  work, and prevent additional native effects;
- provider/browser-safe projections and diagnostics contain no settings,
  credentials, raw metadata, prompt bodies, private payloads, or permission
  discovery;
- completion/metadata/native-file egress rejects arbitrary/custom base URLs,
  userinfo/IP/private/reserved/metadata/rebinding targets, peer mismatch,
  ambient proxy variables, redirect/downgrade/credential forwarding, wrong
  path/MIME/encoding, timeout, and wire/decoded overflow before secret/private
  bytes reach an unauthorized origin;
- split planner/service files remain independently runnable and every touched
  production/test file is at or below 1,000 physical lines.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/assistant/provider-capabilities tests/vitest/assistant/agent-runtime
bunx vitest run tests/vitest/assistant/model-capabilities.test.ts tests/vitest/assistant/providerResolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-planner
bun test tests/unit/assistant/assistantService.test.ts
set -a && source .env && set +a && bun test \
  tests/security/outboundHttpPolicy.test.ts \
  tests/security/assistantProviderEgress.security.test.ts
bun run gates:coderso
git diff --check
wc -l core/services/assistant/actionPlannerService.ts core/services/assistant/actionPlanner/*.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-planner/*.test.ts
```

Also run the exact provider-adapter tests for OpenAI/OpenRouter discovered in
the current test inventory and a physical line-count check for every touched
production/test file. If terminal TASK-548 renamed Guide service tests, use its
documented owning lane and record the command.

## Documentation Updates Required

Produce a bounded documentation receipt for the family closure owner describing
exact evidence sources, TTL/invalidation, unknown=false behavior, effective
minimum ceilings, strict structured-output matrix, tool lookup order, hard run
budgets, safe diagnostics, the no-Agent-fallback rule, and an operator
troubleshooting table keyed by machine errors. This implementation leaf does not
edit shared internal/developer/user docs.

L03 adds the Agent route/client facts to that handoff; downstream research and
Designer leaves add their own facts. Do not edit documentation, task contracts,
task-board rows, changelog files, or pinned changelog 1266.

## Done Criteria

- Provider/model support is based only on fresh exact verified evidence with
  provenance and TTL; model-name inference/default support is gone.
- Agent/Designer availability fails closed and effective limits are minimum
  ceilings with reserved overhead.
- Mutation/Designer provider output is strict-schema only.
- Unknown tools reject before permission collection and every run is bounded by
  exact round/action/time/token/byte caps.
- Agent provider failure never becomes Guide/deterministic fallback success.
- Focused tests, typecheck, lint, release gates, diff check, and line counts pass.
