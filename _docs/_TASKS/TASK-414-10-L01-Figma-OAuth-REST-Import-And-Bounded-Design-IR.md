# TASK-414-10-L01: Figma OAuth, REST Import, and Bounded Design IR
# FileName: TASK-414-10-L01-Figma-OAuth-REST-Import-And-Bounded-Design-IR.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-10
**Priority:** High
**Category:** Designer / Figma / OAuth / REST / Design IR / Security
**Estimated Effort:** Large
**Dependencies:** TASK-414-03-L01 through L03, including L02's durable Figma
grant/import-lease tables; TASK-414-07, TASK-414-08,
TASK-414-09-L01, TASK-414-09-L02, TASK-414-09-L04, and TASK-547 terminal;
TASK-414-10 contract audit clean
**Status:** ⏳ To Do
**Target:** Later delivery phase, disabled by default, but required before
TASK-414 family closure
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Implement the route-independent backend foundation for Figma import:

1. a pure strict `DesignIRV1` contract;
2. encrypted, installation-scoped Figma OAuth credential/state storage;
3. official fixed-origin OAuth and REST clients;
4. a bounded Figma-response-to-IR adapter; and
5. one backend-only import service that returns a canonical IR plus temporary
   private raster handles for TASK-414-10-L02.

This leaf does not register routes, render Admin UI, compile a Designer brief or
package, create a Designer revision, issue a preview, promote anything, or write
canonical CMS data. L02 is the only route/orchestration consumer. Figma provider
bytes remain untrusted until every schema, cap, egress, image, and canonical
normalization check in this leaf succeeds.


## Sub-Tasks

- TASK-414-10-L01 (this leaf): pure `DesignIRV1` plus the Figma type/export
  owner (`Required Public Exports` below).
- TASK-414-10-L03: Figma OAuth/credential lifecycle, REST/egress and raster
  runtime seam contract; lands after this leaf and before TASK-414-10-L02.
- TASK-414-10-L02: IR-to-Designer orchestration, routes, and UI; consumes the
  L01 exports and the L03 seam contract.

**Land order:** `TASK-414-10-L01 -> TASK-414-10-L03 -> TASK-414-10-L02`.

## Dependency Re-Verification Gate

Before source edits, re-read terminal TASK-414-03/07/08/09 and TASK-547 bytes,
the current integration row/secret-store contract, active worktrees, and current
diff. Confirm that:

- the installation-scoped `integrations` row can store a strict encrypted Figma config
  without a schema change; this leaf owns the exact successor regions in
  `core/services/integrations/registry.ts` and `integrationsService.ts` that
  add the `designer-figma` backend-only allowlist entry and its encrypted
  config read/redaction — verify those regions are free of another writer
  before editing;
- the terminal Designer private-asset API accepts temporary owner/workspace/
  attempt-scoped assets and can prove adoption or purge;
- TASK-414-03-L01's shared outbound policy/transport exports are terminal and
  accept closed fixed-origin Figma OAuth/REST/raster purpose contributions;
- no terminal owner already defines `DesignIRV1` or a Figma adapter; and
- the exact files below remain free of another TASK-414 writer.

If any premise is false, stop and correct/re-audit this task contract. This leaf
must not add a migration: TASK-414-03-L02 is the sole family migration writer.

## Exact Exclusive Ownership

Only this leaf may add or modify these implementation files:

| Area | Exact file |
| --- | --- |
| Pure IR owner | `core/services/designer/imports/designIrContract.ts` |
| Figma wire/limit contracts | `core/services/designer/imports/figma/figmaContracts.ts` |
| Machine errors | `core/services/designer/imports/figma/figmaErrors.ts` |
| Encrypted credential/state store | `core/services/designer/imports/figma/figmaCredentialStore.ts` |
| OAuth lifecycle | `core/services/designer/imports/figma/figmaOAuthService.ts` |
| Official REST/image egress | `core/services/designer/imports/figma/figmaRestClient.ts` |
| Provider projection | `core/services/designer/imports/figma/figmaDesignIrAdapter.ts` |
| Import orchestration | `core/services/designer/imports/figma/figmaImportService.ts` |
| Attempt-scoped temporary raster seam | `core/services/designer/imports/figma/figmaTemporaryAssetAttempt.ts` |
| Transactional source verifier | `core/services/designer/imports/figma/figmaMaterializationSource.ts` |
| Runtime factory (mint-only) | `core/services/designer/imports/figma/figmaRuntimeFactory.ts` |
| Test-only runtime harness | `core/services/designer/imports/figma/testing/figmaTestRuntimeHarness.ts` |
| Integration storage successor regions | `core/services/integrations/registry.ts` (exact `designer-figma` backend-only allowlist entry and its validation), `core/services/integrations/integrationsService.ts` (exact encrypted config read/redaction successor region for the `designer-figma` row only; the generic Admin integration projection must never emit `clientId`/`clientSecret`/config keys) |
| Integration storage focused tests | `tests/vitest/integrations/designerFigmaIntegrationConfig.test.ts` (new; row allowlist, encrypted keys, generation, projection redaction, unknown-key rejection) plus the focused existing integration registry/service suites |
| Pure contract tests | `tests/vitest/designer/designIrContract.test.ts` |
| Pure adapter tests | `tests/vitest/designer/figmaDesignIrAdapter.test.ts` |
| Limits test matrix | `tests/vitest/designer/figmaImportLimitsMatrix.test.ts` (new; single table-driven suite over every `FIGMA_IMPORT_LIMITS_V1` ceiling with exact-boundary accepted and one-over-boundary rejected rows) |
| Temporary-raster seam tests | `tests/vitest/designer/figmaTemporaryAssetAttempt.test.ts` |
| Runtime factory tests | `tests/vitest/designer/figmaRuntimeFactory.test.ts` |
| Runtime OAuth/import tests | `tests/integration/runtime/figmaImportService.test.ts` |
| Egress/secret security tests | `tests/security/figmaImportSecurity.test.ts` |

Forbidden ownership includes `core/db/schema.ts`, `core/db/tables/*`, migration
artifacts, `core/server/routes/*`, `core/server/validation/*`, Admin UI/client
files, terminal TASK-547/Designer source, canonical CMS services, shared route or
navigation registries, task/board/changelog files, and every file owned by
another TASK-414 leaf. L02 may import the exports below but may not redefine or
weaken them.

## Required Public Exports

### Pure Design IR owner

`designIrContract.ts` must export exactly:

```ts
export const DESIGN_IR_SCHEMA = "coderso.design-ir@v1" as const;
export const DESIGN_IR_LIMITS: Readonly<DesignIRLimitsV1>;
export const designIrV1Schema: object;

export type DesignIRV1 = Readonly<{
  schema: typeof DESIGN_IR_SCHEMA;
  source: DesignIRSourceV1;
  roots: readonly string[];
  nodes: readonly DesignIRNodeV1[];
  assets: readonly DesignIRAssetV1[];
  diagnostics: readonly DesignIRDiagnosticV1[];
}>;

export function normalizeDesignIRV1(value: unknown): DesignIRV1;
export function canonicalDesignIRBytes(value: DesignIRV1): Uint8Array;
export function digestDesignIR(value: DesignIRV1): string;
```

`DESIGN_IR_LIMITS` is a zero-literal identity projection: it is built only from
`FIGMA_IMPORT_LIMITS_V1` fields imported from `figmaContracts.ts` and contains
no numeric/byte literal of its own. `FIGMA_IMPORT_LIMITS_V1` is the sole
literal owner; its exact frozen property list and values are declared in
TASK-414-10-L03's `### Exact v1 limits` section, and pseudocode and tests
consume that constant
directly.

#### Exact `DesignIRV1` shapes, enums, clamps, and ordering

```ts
export type DesignIRSourceV1 = Readonly<{
  adapterId: "figma";                 // closed source adapter identity
  sourceIdentitySha256: string;       // lowercase 64-hex; hashed provider source identity
  sourceVersion: string;              // immutable provider version; bounded 1..128 ASCII
  selectedRootSha256: readonly string[]; // ordered selected-root digests, 1..64
  contentSha256: string;              // canonical content digest
}>;

export type DesignIRNodeKindV1 =
  | "canvas" | "container" | "text" | "shape" | "image" | "instance";

export type DesignIRSemanticRoleV1 =
  | "banner" | "navigation" | "main" | "complementary" | "contentinfo"
  | "section" | "article" | "figure" | "generic";

export type DesignIRLayoutModeV1 = "none" | "horizontal" | "vertical" | "grid";
export type DesignIRAlignmentV1 = "start" | "center" | "end" | "stretch";
export type DesignIRVisibilityV1 = "visible" | "hidden";
export type DesignIRTextAlignV1 = "start" | "center" | "end" | "justify";
export type DesignIRFillKindV1 = "none" | "solid" | "image";

export type DesignIRNodeV1 = Readonly<{
  nodeKey: string;                    // stable lowercase SHA-256-derived key; unique
  kind: DesignIRNodeKindV1;
  role: DesignIRSemanticRoleV1;
  layoutMode: DesignIRLayoutModeV1;
  alignment: DesignIRAlignmentV1;
  visibility: DesignIRVisibilityV1;
  opacity: number;                    // finite, clamped [0, 1]
  x: number; y: number;               // finite, clamped [-8192, 8192]
  width: number; height: number;      // finite, clamped [0, 8192]
  spacing: number;                    // finite, clamped [0, 4096]
  cornerRadius: number;               // finite, clamped [0, 4096]
  childKeys: readonly string[];       // ordered; every child exists; acyclic; depth <= 24
  text: DesignIRTextV1 | null;
  image: DesignIRImageRefV1 | null;   // references one DesignIRAssetV1 by assetKey
  style: DesignIRStyleV1;
}>;

export type DesignIRTextV1 = Readonly<{
  content: string;                    // Unicode NFC; <= 32 KiB UTF-8 per node
  textAlign: DesignIRTextAlignV1;
  fontSize: number;                   // finite, clamped [1, 512]
  fontWeight: number;                 // 100..900 in 100 steps (100|200|...|900)
  lineHeight: number;                 // finite, clamped [1, 4]
  letterSpacing: number;              // finite, clamped [-64, 64]
  color: DesignIRColorV1;
}>;

export type DesignIRColorV1 = Readonly<{
  r: number; g: number; b: number; a: number; // each finite, clamped [0, 1]
}>;

export type DesignIRImageRefV1 = Readonly<{
  assetKey: string;                   // exact DesignIRAssetV1.assetKey
  fill: DesignIRFillKindV1;           // "image"
}>;

export type DesignIRStyleV1 = Readonly<{
  fill: DesignIRFillKindV1;
  fillColor: DesignIRColorV1 | null;
  strokeColor: DesignIRColorV1 | null;
  strokeWidth: number;                // finite, clamped [0, 256]
}>;

export type DesignIRAssetV1 = Readonly<{
  assetKey: string;                   // stable lowercase SHA-256-derived key; unique
  sha256: string;                     // lowercase 64-hex over canonical bytes
  mime: "image/png" | "image/jpeg" | "image/webp"; // sniffed, allowlisted
  byteLength: number;                 // integer, clamped [1, 8 MiB]
  width: number; height: number;      // integers, clamped [1, 8192]; pixels <= 20 MP
  usedByNodeKeys: readonly string[];  // sorted (non-semantic set); every node exists
}>;

export type DesignIRDiagnosticSeverityV1 = "info" | "warning" | "error";

export type DesignIRDiagnosticV1 = Readonly<{
  code: string;                       // stable lowercase-ASCII diagnostic code
  severity: DesignIRDiagnosticSeverityV1;
  nodeKey: string | null;             // hashed node key when applicable
  message: string;                    // bounded safe message; <= 256 Unicode scalars
}>;
```

**Numeric/float rules:** every numeric field must be a finite IEEE-754 double;
`NaN` and `±Infinity` reject the whole document. Values are clamped to the exact
ranges above before validation (clamping is deterministic; negative zero
normalizes to `0`). Counts (byteLength, width, height, pixels, child count)
must be integers. Canonical serialization uses shortest round-trip JSON number
representation, so two semantically equal documents serialize byte-identically.

**Ordering rules:** `childKeys` and `selectedRootSha256` preserve provider/
authoring order (semantic). `roots`, `nodes`, and `assets` are ordered
semantically: roots in provider order, nodes in stable dependency order
(children before parents), assets in first-reference order. `usedByNodeKeys`,
and any other non-semantic set are sorted ascending byte-wise. Canonical object
keys are sorted recursively; arrays keep their declared order.

**Canonical serialization and digest vectors:** `canonicalDesignIRBytes` is
UTF-8 canonical JSON (sorted object keys, shortest round-trip numbers, LF line
endings, no trailing whitespace, exactly one final `\n`). `digestDesignIR` is
lowercase SHA-256 over those exact bytes. The pure contract tests pin at least
two digest vectors: a minimal empty-graph fixture and a full multi-node/
multi-asset fixture, each with its exact canonical bytes and digest asserted
byte-for-byte, so any serialization change breaks the vectors.

`DesignIRSourceV1` contains only `adapterId`, `sourceIdentitySha256`,
`sourceVersion`, ordered `selectedRootSha256`, and `contentSha256`. Timestamps,
raw file keys, raw node IDs, tokens, URLs, and actor/workspace IDs do not enter
canonical IR bytes.

`DesignIRNodeV1` is a flat, uniquely keyed graph with ordered child keys. Its
closed enums cover only the provider-neutral node kinds, semantic roles, layout
mode, alignment, visibility, text align, and fill kinds above. Unknown provider
node kinds or critical unsupported layout semantics cannot become arbitrary
extension data; they fail `figma_semantics_unsupported` or emit a bounded
diagnostic exactly as specified in Normalization Rules.

`DesignIRAssetV1` identifies one raster by stable IR asset key, SHA-256, sniffed
MIME, byte length, width, height, and the node keys that use it. It contains no
bytes, URL, storage key, signed handle, alt text inferred from a file name, or
canonical Media ID. `DesignIRDiagnosticV1` has only a stable code, severity,
hashed node key when applicable, and bounded safe message; it never embeds raw
provider JSON or source content.

### Figma adapter exports

The Figma modules must export these exact seams:

```ts
export type FigmaSourceGrantV1 = Readonly<{
  schema: "coderso.figma-source-grant@v1";
  grantId: string;
  purpose: "designer_import";
  workspaceId: string;
  credentialGeneration: number; // one generation type: monotonic integer >= 1
  selectionSha256: string;
  expiresAt: string;
}>;

export type FigmaImportSelectionV1 = Readonly<{
  sourceGrantId: string;
}>;

export type FigmaImportExecutionBindingV1 = Readonly<{
  schema: "coderso.figma-import-execution-binding@v1";
  sourceGrantId: string;
  sourceIdentitySha256: string;
  selectionSha256: string;
  credentialGeneration: number; // one generation type: monotonic integer >= 1
  importLeaseId: string;
  importFence: number;
}>;

export type FigmaImportBundleV1 = Readonly<{
  designIR: DesignIRV1;
  designIRSha256: string;
  temporaryAssets: readonly FigmaTemporaryAssetHandleV1[];
  preparedAssetAdoption: PreparedDesignerAssetAdoptionV1;
  sourceVersion: string;
  executionBinding: FigmaImportExecutionBindingV1;
  boundGenerationClaim: BoundDesignerGenerationClaim;
}>;

export type FigmaImportRuntimeV1 = Readonly<{
  createSourceGrant(input: CreateFigmaSourceGrantInput): Promise<FigmaSourceGrantV1>;
  beginOAuth(input: BeginFigmaOAuthInput): Promise<FigmaOAuthStart>;
  exchangeOAuthCode(input: ExchangeFigmaOAuthInput): Promise<FigmaConnectionStatus>;
  connectionStatus(): Promise<FigmaConnectionStatus>;
  disconnect(input: DisconnectFigmaInput): Promise<void>;
  describeOwnedSourceGrantForClaim(
    input: DescribeOwnedSourceGrantForClaimInput,
  ): Promise<FigmaSourceGrantMetadataV1>;
  importFigmaDesignIR(input: ImportFigmaDesignIRInput): Promise<FigmaImportBundleV1>;
  requireCurrentImportLease(
    claim: BoundDesignerGenerationClaim,
    binding: FigmaImportExecutionBindingV1,
  ): Promise<void>;
  releaseImportLeaseAndPurgeConsumedSource(
    claim: BoundDesignerGenerationClaim,
    binding: FigmaImportExecutionBindingV1,
  ): Promise<void>;
  materializationSourceContribution: DesignerMaterializationSourceContributionV1;
}>;

// The one runtime verifier. Runtime identity is established by a real
// module-private mint-and-verify capability, never by an ambient structural
// brand (which any module could forge with a cast or object literal).
export function isFigmaImportRuntimeV1(
  value: unknown,
): value is FigmaImportRuntimeV1;

// The ONE exported constructor. It is the sole single-read owner: the input
// carries only the feature flag and server dependencies. There is no
// caller-supplied refreshContractStatus and no prevalidated structural config;
// inside the factory it calls resolveFigmaBackendConfigV1(settings,
// configDeps) exactly once (invalid -> unavailable/config_invalid), imports
// FIGMA_REFRESH_CONTRACT_STATUS_V1 internally, and only then mints.
// The available runtime is minted inside this module, registered in the
// module-private WeakSet, and never constructible by any caller.
export function resolveAndCreateFigmaImportRuntimeV1(input: Readonly<{
  featureEnabled: boolean;
  settings: SettingsReadModelV1;
  configDeps: FigmaConfigDepsV1;
  runtimeDeps: FigmaRuntimeFactoryDepsV1;
}>): FigmaRuntimeResolutionV1;

export function parseFigmaImportSelection(value: unknown): FigmaImportSelectionV1;

// Exact consumer views over the runtime. Route consumers and the L02 import
// orchestrator never receive the full runtime; each Pick<> stays in sync with
// the single full-runtime parity test pinned once in L01's own test suite.
export type FigmaImportRouteConsumerV1 = Pick<
  FigmaImportRuntimeV1,
  | "createSourceGrant"
  | "beginOAuth"
  | "exchangeOAuthCode"
  | "connectionStatus"
  | "disconnect"
>;

export type FigmaImportServiceConsumerV1 = Pick<
  FigmaImportRuntimeV1,
  | "describeOwnedSourceGrantForClaim"
  | "importFigmaDesignIR"
  | "requireCurrentImportLease"
  | "releaseImportLeaseAndPurgeConsumedSource"
>;
```

`figmaRuntimeFactory.ts` is the one exact runtime factory and the only module
that can mint. `resolveAndCreateFigmaImportRuntimeV1` is the sole single-read
owner: inside the factory it calls `resolveFigmaBackendConfigV1(settings,
configDeps)` exactly once (invalid config maps to the
`unavailable`/`config_invalid` branch with zero construction), imports
`FIGMA_REFRESH_CONTRACT_STATUS_V1` from `figmaContracts.ts` itself (the caller
cannot supply a status literal), and strictly resolves the three facts
(explicit feature flag, audited refresh-contract status literal, strict
backend config) before it mints. No caller-supplied
`refreshContractStatus`, prevalidated config, or proof can influence the
resolution. The mint-and-verify capability is real,
not ambient: the module declares a private
`const FIGMA_RUNTIME_IDENTITY = Symbol("coderso.figma-runtime-v1")` and a
private `WeakSet<object>`; the factory constructs every callable OAuth/token/
REST/raster/import service and the closed `figma` materialization-source
contribution only inside that module, attaches the identity symbol, registers
the runtime object in the WeakSet, and returns the frozen runtime inside the
`available` branch of the closed resolution union. No caller can invoke the
mint, pass a proof, or influence the resolution: there is no exported proof
type, no proof-accepting constructor, no exported availability resolver, and
no config/status parameter on the constructor.
`isFigmaImportRuntimeV1` is the only verifier and checks WeakSet membership —
a forged structural runtime, a cast, an object literal, or a reconstructed
symbol can never join the WeakSet, so it can never authorize I/O. Safe
availability descriptors (`FigmaRuntimeAvailabilityV1`,
`figmaDesignerSourceDescriptor`,
`figmaDesignerImportContribution`) remain structural and browser-safe, but
they can never authorize I/O: only a WeakSet-minted runtime can construct
services, and only the factory mints. `figmaOAuthService.ts`,
`figmaRestClient.ts`, `figmaImportService.ts`, and
`figmaMaterializationSource.ts` export no bypassable directly callable I/O
function or contribution; an `unavailable` resolution never constructs
services, so zero service/contribution construction and zero I/O occur.
Safe pure schemas, normalizers, types, and `parseFigmaImportSelection` remain
direct exports.

**Isolated test-only harness.** Successful-path tests must run while the
official refresh contract remains unavailable. A dedicated harness module
`core/services/designer/imports/figma/testing/figmaTestRuntimeHarness.ts`
exports `createTestFigmaImportRuntimeV1(deps)`; it receives the mint capability
through the factory module's explicit test-only export
`__mintFigmaImportRuntimeForTesting(deps)` (documented test-only; no production
module may import it — there is no other mint or proof bypass). A source-level
guard test pins that no
module outside `core/services/designer/imports/figma/testing/` and the owned
test files imports the harness or the test-only mint, and that production
composition (`Task414RuntimeFacade` and every `core/server/**` module) imports
only `resolveAndCreateFigmaImportRuntimeV1` and `isFigmaImportRuntimeV1`. With
the current conflict literal, `resolveAndCreateFigmaImportRuntimeV1` always
returns the `unavailable` branch and the production
factory never mints regardless of the harness.

Every member above is a factory-only member of `FigmaImportRuntimeV1`. The
route OAuth/status/grant methods (`createSourceGrant`, `beginOAuth`,
`exchangeOAuthCode`, `connectionStatus`, `disconnect`) and
`materializationSourceContribution` are joined by the four proof-bound methods
L02's `importFigmaIntoDesigner` invokes through its `FigmaImportServiceConsumerV1`
(`describeOwnedSourceGrantForClaim`, `importFigmaDesignIR`,
`requireCurrentImportLease`, and `releaseImportLeaseAndPurgeConsumedSource`).
L01 pins the FULL runtime member set exactly once in its own type-level parity
test (it types the consumer `Pick<>` views against the full runtime and asserts
every member name, so any rename or removal breaks the parity test); L02 never
re-pins the full set.

The only browser-safe connection fields are `connected`, exact
transaction-bound `requestedScope`, token expiry, and safe provider account ID
only when `user_id_string` is present in the official token response. It is not
an attested granted-scope claim and this task makes no `/v1/me` or other identity
request. No export returns a token, refresh token, PKCE verifier, raw stored
config, raw REST response, private asset URL, or raw file key after import.
The raw Figma file key or supported official URL plus exact selected node IDs and
depth are accepted only by `createFigmaSourceGrant` from the internal
Settings-owned source-grant route under `settings:write` plus exact workspace
access. Designer import under `designer:write` never accepts these raw fields:
a `designer:write`-only actor imports only an already-issued opaque grant and
cannot inspect or change Settings. That service normalizes one exact
file/selection identity, encrypts the file key and provider node IDs as one
bounded source-selection envelope, binds
it to the authenticated actor, exact workspace, current credential generation,
purpose, ten-minute hard expiry, and single use, then returns only the opaque
grant projection and `selectionSha256` above. It never exposes integration
settings or connection identity. The import service accepts no file key, URL,
node ID, or depth: it receives only the grant ID, claims the owner/workspace-
bound grant and an abortable import lease, and fails closed if actor, workspace,
purpose, generation, exact selection digest, TTL, or state differs.
The grant-claim transaction transfers its encrypted source-selection envelope
into the attempt-scoped lease and erases the grant copy atomically;
release/abort erases the lease copy. No plaintext source reference or node ID is
persisted, returned, cached, evidenced, or logged.
Its input also carries the already committed pending Figma generation claim.
After claiming the grant/lease and before the first provider, raster, scanner,
or storage-attempt I/O, the service CAS-attaches the exact canonical execution
binding to that claim. The pending request's source ID, source grant ID, and
selection digest must match; a stale generation fence releases the import lease
and performs no external I/O.
`FigmaTemporaryAssetHandleV1` is an opaque backend-only branded handle plus
attempt/asset/content digests and bounded raster metadata. Its storage locator
is never serializable into `DesignIRV1`, a route response, audit, or evidence.

## OAuth, REST, and Raster Runtime Seam

The exact `## Credential and OAuth Contract` and `## REST, Egress, and Raster Contract` (temporary-raster attempt/adoption seam, exact v1 limits, strict route DTO ownership, six exact route-envelope schema exports, one limits test matrix) are owned by `TASK-414-10-L03` and are authoritative there. This leaf's Required Public Exports below remain the type/export owner; L03 consumes them read-only.

## Normalization Rules

`figmaDesignIrAdapter.ts` must perform a two-pass conversion:

1. inventory and validate the complete selected/provider-expanded graph,
   references, depth, counts, text, dimensions, supported node kinds, raster
   dependencies, and aggregate budgets without allocating persistent assets;
2. derive stable SHA-256 node/asset keys, normalize supported primitives,
   preserve provider child order, sort non-semantic sets, stage validated
   rasters, build the flat IR graph, run `normalizeDesignIRV1`, serialize
   canonical bytes, and verify the final size/digest.

Stable keys derive from the hashed source identity, immutable Figma version, and
raw provider identity inside the adapter only. Raw provider IDs never become CMS
IDs or browser evidence. Hidden nodes remain explicit with `visibility: "hidden"`
only when their bounded structure is necessary for reference integrity; otherwise
they are omitted with a diagnostic. Unsupported decorative effects may produce
a bounded warning. Unsupported structure that changes hierarchy, text, raster
identity, sizing, or reading/navigation order is fatal
`figma_semantics_unsupported`, not a lossy success.

## Implementation Pseudocode

```ts
async function beginFigmaOAuth(input: BeginFigmaOAuthInput) {
  requireExactServerOAuthConfig();
  const binding = normalizeOAuthBinding(input);
  const state = randomBytes(32);
  const verifier = randomBytes(32);

  await figmaCredentialStore.replacePendingOAuthAtomically({
    stateSha256: sha256(state),
    encryptedVerifier: encryptSecret(base64url(verifier)),
    binding,
    requestedScope: ["file_content:read"],
    expiresAt: addMinutes(now(), 5),
  }); // allocates transaction ID and increments/stores expected generation in one CAS

  return buildFixedFigmaAuthorizationUrl({
    state: base64url(state),
    codeChallenge: sha256Base64Url(verifier),
    scope: ["file_content:read"],
  });
}

async function exchangeFigmaOAuthCode(input: ExchangeFigmaOAuthInput) {
  const request = normalizeExchangeInput(input);
  const pending = await figmaCredentialStore.consumePendingOAuth({
    stateSha256: sha256(request.state),
    actorId: request.actorId,
    sessionSha256: request.sessionSha256,
  });

  // The one-time state is already consumed; never replay this code.
  const token = await figmaRestClient.exchangeCode({
    code: request.code,
    verifier: decryptSecret(pending.encryptedVerifier),
  });
  const normalized = normalizeFigmaTokenResponse(token, {
    requestedScope: pending.requestedScope,
  });
  await figmaCredentialStore.storeEncryptedTokensIfCurrent({
    oauthTransactionId: pending.oauthTransactionId,
    expectedCredentialGeneration: pending.expectedCredentialGeneration,
    normalized,
  }); // stale after disconnect/new start => discard and typed conflict
  return figmaCredentialStore.readSafeStatus();
}

async function createFigmaSourceGrant(input: CreateFigmaSourceGrantInput) {
  // Settings-owned route only: `settings:write` plus exact workspace access.
  const command = normalizeSettingsAuthorizedFigmaSourceGrantInput(input);
  const credential = await resolveCurrentFigmaCredentialGeneration();
  const source = parseRawFigmaFileKeyOrOfficialUrl(command.source);
  const selection = normalizeExactFigmaSourceSelection({
    fileKey: source.fileKey,
    selectedNodeIds: command.selectedNodeIds,
    depth: command.depth,
  });
  return figmaSourceGrants.createSingleUse({
    actorId: command.actorId,
    workspaceId: command.workspaceId,
    purpose: "designer_import",
    credentialGeneration: credential.generation,
    encryptedSourceSelection: encryptSecret(canonicalSelectionBytes(selection)),
    sourceIdentitySha256: sha256(source.fileKey),
    selectionSha256: digestFigmaSourceSelection(selection),
    expiresAt: addMinutes(now(), 10),
  });
}

async function importFigmaDesignIR(input: ImportFigmaDesignIRInput) {
  const request = normalizeImportInput(input);
  const execution = await figmaSourceGrants.claimGrantAndImportLease({
    grantId: request.selection.sourceGrantId,
    actorId: request.generationClaim.actorId,
    workspaceId: request.generationClaim.workspaceId,
    generationRunId: request.generationClaim.runId,
    purpose: "designer_import",
  }); // atomically transfers encrypted source reference grant -> lease
  const executionBinding = projectFigmaImportExecutionBinding(execution, {
    selectionSha256: execution.selectionSha256,
  });
  let attempt: FigmaTemporaryAssetAttemptV1 | null = null;
  let handedOff = false;

  try {
    const boundGenerationClaim =
      await designerGenerationClaims.bindPreparedPrivateSourceExecutionIfCurrent({
        claim: request.generationClaim,
        sourceId: "figma",
        expectedSourceGrantId: request.selection.sourceGrantId,
        expectedRequestBindingDigest: executionBinding.selectionSha256,
        bindingSchema: executionBinding.schema,
        bindingDigest: digestFigmaImportExecutionBinding(executionBinding),
        sourceLeaseId: executionBinding.importLeaseId,
        sourceLeaseFence: executionBinding.importFence,
      }); // committed before provider/raster/scanner/storage-attempt I/O
    attempt = await figmaTemporaryAssetStore.beginAttempt(
      boundGenerationClaim.temporaryAssetOwner,
    );
    const credential = await resolveFreshFigmaCredentialForImportLease(execution);
    await requireCurrentFigmaImportLease(execution);
    const response = await figmaRestClient.readBoundedSelection(
      decryptGrantedSourceSelection(execution),
      credential,
      { signal: execution.abortSignal },
    );
    const inventory = inventoryAndValidateFigmaGraph(response, FIGMA_IMPORT_LIMITS_V1);
    const immutableSourceVersion = requireImmutableFigmaVersion(inventory); // authoritative file/nodes version; captured once per import run
    await requireCurrentFigmaImportLease(execution);
    const rawRasters = await figmaRestClient.readBoundedRasters(inventory, {
      signal: execution.abortSignal,
      recheckVersionEveryAssets: 8, // bounded periodic version recheck: at most 1 authoritative GET per 8 assets (4 for a full 32-asset import)
      onVersionRecheck: async () => {
        await requireCurrentFigmaImportLease(execution);
        await assertFigmaImmutableVersionMatches(immutableSourceVersion); // bounded authoritative version GET; no per-fetch before/after pair
      },
    }); // any version drift aborts the lease and purges the attempt
    const rasters = await attempt.scanDecodeAndCanonicalizeRasters(rawRasters, {
      scanner: deps.scanner, // terminal TASK-414-04 shared ClamAV client seam
      storage: deps.attemptStorage, // (ownerId, workspaceId, importAttemptId)-rooted private store
      requireExactRawDigestReceipt: true,
    });
    const projected = projectFigmaGraphToDesignIR(inventory, rasters);
    const designIR = normalizeDesignIRV1(projected);
    await requireCurrentFigmaImportLease(execution);
    const temporaryAssets = await attempt.stageValidatedRasters(rasters);
    assertExactAssetDigestJoin(designIR.assets, temporaryAssets);
    await requireCurrentFigmaImportLease(execution);
    await assertFigmaImmutableVersionMatches(immutableSourceVersion); // final pre-promotion recheck before adoption freeze
    const preparedAssetAdoption = await attempt.freezePreparedAdoption({
      assets: temporaryAssets,
      expectedDesignIRSha256: digestDesignIR(designIR),
    });

    const bundle = Object.freeze({
      designIR,
      designIRSha256: digestDesignIR(designIR),
      temporaryAssets,
      preparedAssetAdoption,
      sourceVersion: designIR.source.sourceVersion,
      executionBinding,
      boundGenerationClaim,
    });
    handedOff = true;
    return bundle;
  } catch (error) {
    if (attempt) await attempt.purgeAndProveAbsent();
    throw normalizeFigmaImportError(error);
  } finally {
    if (!handedOff) {
      await figmaSourceGrants.releaseImportLeaseAndPurgeConsumedSource(execution);
    }
  }
}
```

A successful bundle transfers the still-live import lease and exact bound
generation claim to L02; it does not release authorization at the service
return boundary. L02 must use that returned claim (never the earlier pending
claim), recheck the execution binding before mapping and compiler entry, pass it
inside the prepared-adoption receipt, require its grant/selection/credential-
generation/lease fence under the materialization transaction lock, and release
it in `finally` after ready/fail settlement. Only failure before handoff is
released here.

The runtime's `materializationSourceContribution` member is the only `figma`
verifier accepted by TASK-414-08-L02's static source registry and is obtainable
only from the `available` branch of `resolveAndCreateFigmaImportRuntimeV1`;
it is never exported or imported
directly. Its pre-materialization read and transaction-lock methods compare the
full strict binding, current credential generation, unrevoked consumed grant,
live import lease/fence, bound generation claim, and exact prepared-adoption
digest. It never accepts a caller callback or trusts binding fields from a
route/provider payload.

No catch converts a provider, cap, credential, storage, or normalization failure
into a partial IR. Cleanup failure is surfaced as `figma_import_cleanup_failed`
and preserves enough backend ownership metadata for bounded recovery without
exposing it to the browser.

## Machine-Readable Errors

`FigmaImportError` owns one stable code, safe message, optional bounded retry
seconds, and non-sensitive details. L02 maps only these expected codes:

| Code | Intended route status | Meaning |
| --- | ---: | --- |
| `figma_unavailable` | 503 | feature/config/connection unavailable |
| `figma_oauth_state_invalid` | 400 | state/binding/TTL/replay check failed |
| `figma_oauth_code_invalid` | 400 | provider rejected or expired one-time code |
| `figma_oauth_exchange_failed` | 502 | bounded provider exchange failure |
| `figma_scope_invalid` | 403 | exact `file_content:read` contract absent |
| `figma_credential_invalid` | 503 | stored token/config failed closed |
| `figma_token_refresh_conflict` | 409 | another refresh generation won |
| `figma_token_refresh_failed` | 502 | refresh failed without exposing response |
| `figma_source_invalid` | 400 | Settings-only file URL/key or bounded grant selection invalid |
| `figma_source_grant_not_found` | 404 | opaque grant absent or wrong actor/workspace |
| `figma_source_grant_expired` | 410 | source grant expired or was revoked |
| `figma_source_grant_consumed` | 409 | single-use source grant already claimed |
| `figma_import_aborted` | 409 | disconnect/new credential generation aborted the import lease |
| `figma_file_not_found` | 404 | provider reports no authorized file |
| `figma_file_forbidden` | 403 | provider denies file access |
| `figma_rate_limited` | 429 | local/provider limit with bounded retry hint |
| `figma_response_invalid` | 502 | status/MIME/schema/provider response invalid |
| `figma_response_too_large` | 413 | provider response or canonical IR output byte cap exceeded (output-only; a route's wire-input cap breach returns the shared `payload_too_large`, never this code) |
| `figma_design_too_deep` | 422 | normalized depth cap exceeded |
| `figma_node_limit_exceeded` | 422 | node/children/text cap exceeded |
| `figma_image_limit_exceeded` | 422 | image count/byte/dimension cap exceeded |
| `figma_image_invalid` | 422 | raster URL/network/MIME/content invalid |
| `figma_image_malicious` | 422 | scanner rejected the exact raw raster bytes |
| `figma_scanner_unavailable` | 503 | required scanner is unavailable; no adoption |
| `figma_scanner_timeout` | 504 | bounded scanner deadline expired; no adoption |
| `figma_temporary_storage_unavailable` | 503 | private attempt storage unavailable before write |
| `figma_temporary_storage_failed` | 500 | private attempt write/finalize failed safely |
| `figma_adoption_binding_mismatch` | 409 | raw/canonical/scan/lease/adoption/file-version binding drift |
| `figma_semantics_unsupported` | 422 | critical structure cannot map safely |
| `design_ir_invalid` | 422 | canonical IR schema/reference/digest invalid |
| `figma_import_cleanup_failed` | 500 | owned temporary state not proven absent |

Unknown exceptions become a generic internal error at the route boundary; raw
driver, HTTP, provider, token, DNS, file, and storage messages are not returned.

## Security Contract

- **Endpoint visibility:** this leaf registers no route. Its L02 consumers are
  internal `/admin/api/*` only; no public import/write, callback API, webhook,
  API-key path, or front endpoint is permitted.
- **Auth model:** services require explicit server dependencies carrying the
  authenticated Admin actor, session digest, and workspace owner context.
  They never infer authorization from a file key or OAuth account.
- **RBAC:** L02 must enforce `settings:read` for Settings status,
  `settings:write` for OAuth connect/exchange/disconnect, and `settings:write`
  plus exact workspace access for Settings-owned source-grant creation.
  Import requires `designer:write` plus exact workspace access and accepts
  only an already-issued opaque grant; a
  `designer:write`-only actor can import but cannot submit raw file/URL/node/
  depth selection or inspect/change Settings. The Settings-owned grant route
  may consume transient raw file/node selection but returns only the opaque
  actor/workspace-bound grant. Native permissions remain promotion-owned.
  **Same initial grant/import actor:** v1 requires the minimal same-actor
  contract. The actor who creates a source grant must possess `settings:write`
  plus exact workspace access AND `designer:write` plus exact workspace access
  to import that grant; the grant is actor/workspace/credential-generation/
  purpose-bound, single-use, and ten-minute-expiring, so no other actor can
  consume it and no cross-actor recipient flow exists. A secure recipient flow
  (grant created by a Settings-only actor and imported by a Designer-only actor)
  would require its own separately audited contract and is not reserved or
  partially implemented here.
- **CSRF:** L02's POST/DELETE routes require standard Admin CSRF. OAuth state and
  PKCE are additional bindings. This leaf cannot expose a mutation through GET.
- **Rate-limit bucket:** status reads charge `admin_read`; every mutation and
  import call arrives after L02 charges the dedicated `designer-figma` bucket,
  with import additionally charging `designer-generation`. The service
  additionally enforces one active import per actor/workspace, two
  installation-wide, the 60-second deadline, and provider `Retry-After` bounds.
- **Reject unknown:** all inputs, Figma projections, token/config objects, IR,
  diagnostics, and returned bundles use strict schemas/allowlists with exact
  byte/count/depth limits. Unknown fields never survive by object spread.
- **Anti-abuse:** no public write means nonce, HMAC/signature, and reCAPTCHA are
  not applicable. OAuth uses one-time state, PKCE `S256`, exact redirect/host,
  short TTL, session binding, CAS consume, fixed egress, public-IP pinning, no
  redirects, MIME sniffing, and bounded streaming.
- **Secrets/privacy:** credentials/verifier are encrypted backend-only. Codes,
  state, tokens, source keys, provider JSON, customer text, raster URLs/bytes,
  private handles, cookies, session/CSRF material, and DNS/HTTP diagnostics are
  excluded from logs, audit metadata, cache, errors, snapshots, and evidence.

## Regression-Test Shape

### Pure Vitest

- strict root/nested reject-unknown, enum, finite-number, clamp, unique-key,
  root/reference/DAG, asset-reference, diagnostic, count/depth/text/byte tests;
- pinned canonical serialization/digest vectors (minimal and full fixtures)
  asserting exact canonical bytes and lowercase SHA-256;
- the single limits matrix covers exact-boundary and one-over-boundary rejection
  for every `FIGMA_IMPORT_LIMITS_V1` ceiling, imported from the single
  `figmaContracts.ts` owner and mirrored by L02 route schemas/tests;
- two normalizations of semantically identical synthetic Figma fixtures produce
  byte-identical canonical IR and digest;
- provider map covers supported frame/group/text/shape/image/instance semantics,
  preserves ordered children, and emits only allowlisted diagnostics;
- unknown critical node/layout/text/image semantics fail
  `figma_semantics_unsupported`; decorative unsupported effects remain bounded
  diagnostics;
- the exact `FigmaBackendConfigV1` allowlist round-trips, the redirect derivation
  is deterministic from fixed inputs, and the safe projection emits no client
  ID/secret/generation; and
- no fixture output contains raw file/node IDs, URLs, HTML/CSS/JS/SVG, plugin
  data, provider extension fields, or canonical CMS IDs.

### Bun runtime/security

- table-driven resolution tests cover every flag/status/config combination.
  In particular, `featureEnabled:true` plus the current conflict literal returns
  the `unavailable`/`refresh_contract_unavailable` branch and records zero
  route, verifier, OAuth, token,
  REST, raster, scanner, temporary-storage, or provider calls;
- `resolveAndCreateFigmaImportRuntimeV1` returns the `available` branch (with a
  WeakSet-minted `FigmaImportRuntimeV1` and an exact
  `FigmaAvailableDescriptorV1`, never the unavailable branch) only when the
  feature flag, the internally imported audited refresh literal, and the
  internally validated config all pass; the input carries only
  `featureEnabled`, `settings`, `configDeps`, and `runtimeDeps`, the factory
  performs the single `resolveFigmaBackendConfigV1` read (invalid ->
  `config_invalid` branch with zero construction), and no caller-supplied
  `refreshContractStatus`, prevalidated config, proof parameter, or exported
  availability resolver exists, so a caller cannot request construction with a
  forged structural proof or influence the audited status/config validation;
  forged structural runtimes,
  casts, object literals, and direct imports of
  `figmaOAuthService`/`figmaRestClient`/`figmaImportService`/
  `figmaMaterializationSource` I/O or contribution exports construct zero
  services and perform zero I/O; `isFigmaImportRuntimeV1` returns `false` for
  every forged value because the module-private `WeakSet` never contains it; an
  `unavailable` branch never constructs, so zero service/contribution
  construction and zero I/O occur; the composer and route-mount builder call
  `isFigmaImportRuntimeV1` before consuming any runtime and treat a failed
  check exactly like the `unavailable` branch;
- the isolated test-only harness `createTestFigmaImportRuntimeV1` mints a
  WeakSet-verified runtime for successful-path tests, and the source-level guard
  test pins that no production module (including `Task414RuntimeFacade` and
  every `core/server/**` module) imports the harness or the test-only mint;
- a type-level consumer parity test pins the FULL `FigmaImportRuntimeV1` member
  set exactly once (all route OAuth/status/grant methods, the four proof-bound
  methods, and `materializationSourceContribution`) against the
  `FigmaImportRouteConsumerV1`/`FigmaImportServiceConsumerV1` Pick<> views;
  every member is factory-only and any rename or removal fails the parity
  test;
- every route DTO (params/query/body/content-type/response) rejects unknown
  fields, empty query/body contracts are exact, `returnWorkspaceId` is the
  only optional body field, and absent-body semantics are exact; the strict
  DTOs are consumed by L02's six route-envelope schemas;
- OAuth start/state/PKCE/session/actor/redirect/TTL/replay and exact requested-
  scope tests, including concurrent start and one-time exchange; token responses
  with no `scope` remain valid while UI never labels scope provider-granted;
  both `user_id_string` and documented deprecated numeric `user_id` responses
  parse, but only the string form may enter the safe account projection and the
  numeric field is proven absent from persistence/logs/results;
- exchange-versus-disconnect and exchange-versus-new-start races prove the
  expected-generation CAS discards stale provider responses and never resurrects
  a connection; no `/v1/me` or other identity call occurs;
- token encryption at rest, browser-safe projection, generation CAS, refresh
  lease winner/loser/crash-expiry, disconnect invalidation, and no secret logs;
- source-grant tests prove only `settings:write` plus exact workspace access can
  submit a transient raw file key/URL/node/depth selection on the Settings-owned
  source-grant route, while OAuth and disconnect remain Settings-only and import
  under `designer:write` rejects every raw source field and accepts only the
  opaque grant ID; a `designer:write`-only actor can import an already-issued
  grant but cannot create one or inspect/change Settings; actor/workspace/
  purpose/generation/selection-digest/TTL/single-use binding, no raw source/node
  in an import body/response/persistence/log, and non-enumerating cross-actor
  rejection;
- grant/lease acquisition followed by a stale or mismatched Designer generation
  claim releases the lease and performs zero provider/raster/scanner/storage-
  attempt I/O; every mutation of grant ID, selection digest, credential
  generation, lease ID, or lease fence fails closed;
- disconnect/new-start races at every REST, raster, staging, adoption-freeze,
  and L02 materialization boundary abort the generation-bound lease, purge
  temporary bytes, and leave no ready revision or stale credential use;
- the static Figma materialization contribution rechecks the exact binding both
  before compiler entry and under the stage transaction lock, while an
  unregistered or caller-supplied verifier is rejected;
- fixed-host/path/query/header tests; DNS private/reserved/rebind, redirects,
  wrong MIME, oversized stream/JSON, decompression/dimension mismatch, timeout,
  abort, `Retry-After`, and no non-idempotent replay;
- provider-expanded ancestors/dependencies still count toward all caps;
- EICAR, polyglot, scanner unavailable/timeout/error, raw-digest mismatch,
  decode bomb, dimension mismatch, and canonical re-encode digest cases prove no
  model/render/adoption before an exact clean-scan receipt;
- the capture-once + bounded-recheck immutable file-version fence: the image
  response itself carries no version (never read from it); the version is
  captured once from the file/nodes response per import run; a periodic recheck
  (at most one bounded authoritative file-version GET per 8 fetched assets) or
  the single final pre-promotion recheck that differs from the captured version
  aborts and purges the attempt and settles
  `figma_adoption_binding_mismatch` with no IR/revision/preview; no per-fetch
  before/after GET pair is ever issued, and the limits matrix pins the exact
  worst-case outbound budget (1 initial + 32 fetches + 4 rechecks + 1 final =
  38 <= `outboundCalls` 40);
- temporary asset adoption/purge ownership and exact absence after every failure;
  no public Media or canonical CMS row is written; and
- a simulated uncertain external failure never runs inside a DB transaction and
  never causes an automatic token-code/import mutation replay.

Synthetic fixtures must be minimal and generated/hand-authored; do not commit a
customer Figma export or an extensive copyrighted provider sample.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designIrContract.test.ts \
  tests/vitest/designer/figmaDesignIrAdapter.test.ts \
  tests/vitest/designer/figmaTemporaryAssetAttempt.test.ts \
  tests/vitest/designer/figmaImportLimitsMatrix.test.ts \
  tests/vitest/designer/figmaRuntimeFactory.test.ts \
  tests/vitest/integrations/designerFigmaIntegrationConfig.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/runtime/figmaImportService.test.ts \
  tests/security/figmaImportSecurity.test.ts
bun run scan:security:strict
wc -l \
  core/services/designer/imports/designIrContract.ts \
  core/services/designer/imports/figma/figmaContracts.ts \
  core/services/designer/imports/figma/figmaErrors.ts \
  core/services/designer/imports/figma/figmaCredentialStore.ts \
  core/services/designer/imports/figma/figmaOAuthService.ts \
  core/services/designer/imports/figma/figmaRestClient.ts \
  core/services/designer/imports/figma/figmaDesignIrAdapter.ts \
  core/services/designer/imports/figma/figmaImportService.ts \
  core/services/designer/imports/figma/figmaTemporaryAssetAttempt.ts \
  core/services/designer/imports/figma/figmaMaterializationSource.ts \
  core/services/designer/imports/figma/figmaRuntimeFactory.ts \
  core/services/designer/imports/figma/testing/figmaTestRuntimeHarness.ts \
  core/services/integrations/registry.ts \
  core/services/integrations/integrationsService.ts \
  tests/vitest/designer/designIrContract.test.ts \
  tests/vitest/designer/figmaDesignIrAdapter.test.ts \
  tests/vitest/designer/figmaTemporaryAssetAttempt.test.ts \
  tests/vitest/designer/figmaImportLimitsMatrix.test.ts \
  tests/vitest/designer/figmaRuntimeFactory.test.ts \
  tests/vitest/integrations/designerFigmaIntegrationConfig.test.ts \
  tests/integration/runtime/figmaImportService.test.ts \
  tests/security/figmaImportSecurity.test.ts
git diff --check
```

Every added/modified production or test file must be at most 1,000 physical
lines. Record the exact targeted receipts for L02 and closure; do not update
task status or changelog from this implementation leaf.

## Documentation Updates Required

L01 makes no human-facing documentation or task/changelog edits. Its completion
receipt must hand L02 the exact exported names, limits, OAuth scope/endpoints,
credential/config version, error table, safe status shape, the exact
`resolveAndCreateFigmaImportRuntimeV1` factory and `FigmaImportRuntimeV1` members,
recorded synthetic fixture provenance, and validation commands. L02 hands the
Figma API/security/Designer/user implementation facts listed in its contract to
the closure leaf;
TASK-414-11-L01 owns final
family docs reconciliation, statuses, board, and changelog 1266.
