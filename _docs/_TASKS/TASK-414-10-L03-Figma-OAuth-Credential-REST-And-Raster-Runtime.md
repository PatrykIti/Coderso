# TASK-414-10-L03: Figma OAuth, Credential, REST, and Raster Runtime
# FileName: TASK-414-10-L03-Figma-OAuth-Credential-REST-And-Raster-Runtime.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-10
**Priority:** High
**Category:** Designer / Figma / OAuth / Credential / REST / Raster / Security
**Estimated Effort:** Large
**Dependencies:** TASK-414-10-L01 (read-only); terminal TASK-414-03-L02 (schema/persistence)
**Followed By:** TASK-414-10-L02 (consumer)
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned)

---

## Overview

This leaf owns the Figma runtime seam contract that originally lived in
TASK-414-10-L01: the exact `## Credential and OAuth Contract` and
`## REST, Egress, and Raster Contract` sections below (credential/OAuth
lifecycle, fixed-origin REST egress, temporary-raster attempt/adoption
seam, exact v1 limits, strict route DTO ownership, six route-envelope
schema exports, one limits test matrix). TASK-414-10-L01 remains the
type/export owner of its `Required Public Exports`; this leaf consumes
them read-only, and TASK-414-10-L02 consumes both surfaces for route
orchestration and UI. Runtime contract facts are authoritative here.

## Sub-Tasks

None; this is an executable leaf.

## Testing Requirements

Run the focused test shape owned by TASK-414-10-L01: the pure Vitest suites
(design IR contract, Figma adapter, integration config, temporary-raster seam,
runtime factory), the Bun runtime/security suites (`figmaImportService.test.ts`,
`figmaImportSecurity.test.ts`), and the unavailable-contract zero-I/O fixtures
described in L01's `## Regression-Test Shape` and `## Testing Requirements`
sections. The limits test matrix contract and its single-owner statement are
already in the moved `### One limits test matrix` section below; no second
matrix exists, and route tests must keep importing the sole owner constant.

## Documentation Updates Required

No shared docs beyond TASK-414-10's Figma docs; runtime contract facts are
owned here.

## Credential and OAuth Contract

Use one strict config in the existing `integrations` row with ID
`designer-figma`. The config allowlist is versioned and contains only encrypted
access/refresh token envelopes, exact requested scope, expiry, optional Figma
`user_id_string` returned by the token endpoint,
monotonic credential generation, safe status metadata, one pending OAuth
transaction, and one bounded refresh lease. Unknown keys or malformed legacy
bytes are `figma_credential_invalid`; they are never treated as connected.
Source grants and import leases never live in this config. Their durable
single-use/CAS/TTL state is owned by TASK-414-03-L02's
`assistant_figma_source_grants` and `assistant_figma_import_leases` tables; this
leaf consumes those tx-aware repositories read-only and adds no migration.

OAuth requirements:

- generate independent 256-bit random state and PKCE verifier; send only the
  state and S256 challenge to the browser/provider;
- store only the state digest and an encrypted verifier, bound to actor,
  authenticated-session digest, exact redirect URI, optional return workspace,
  creation time, and five-minute expiry;
- issue only one pending transaction installation-wide; replacement requires an explicit
  new start and invalidates the previous transaction through CAS;
- request exactly `file_content:read`; persist it as the OAuth transaction's
  immutable `requestedScope`. Figma's token response is not required or trusted
  to return `scope`, so status/UI/docs must not call it “granted scope”;
- build the authorization request only from fixed server configuration with
  `client_id`, exact `redirect_uri`, `scope=file_content:read`, opaque `state`,
  `response_type=code`, and the PKCE S256 challenge/method;
- consume state once in a short transaction before token exchange and return the
  pending transaction ID plus its expected credential generation/fence. Do not retry
  an authorization code after an uncertain/failed exchange, and require the
  Admin SPA to submit the callback immediately because Figma documented a
  30-second authorization-code lifetime at the authoring baseline;
- the authorization-code exchange contract is independently confirmed: when
  the integration gate is available, send one bounded
  `application/x-www-form-urlencoded` POST to fixed
  `https://api.figma.com/v1/oauth/token` with server-owned HTTP Basic client
  credentials and exact `grant_type=authorization_code`, redirect URI, code,
  and PKCE verifier;
- no refresh request is currently authorized. The live OAuth instructions name
  `/v1/oauth/refresh` with only `refresh_token`, while the official 2025-05-16
  changelog directs clients to `/v1/oauth/token` without giving one matching
  current body contract. Do not choose, probe, retry, or fall back between
  them, and do not assume `grant_type=refresh_token` from generic OAuth lore;
- validate token type, token/refresh lengths, expiry bounds, and optional
  `user_id_string` before encrypted persistence. Accept Figma's documented
  deprecated optional numeric `user_id` only as a known finite nonnegative JSON
  number and discard it immediately; never stringify, convert, compare,
  persist, expose, log, or use it for identity. Reject every other unknown field
  or structurally ambiguous response and never infer scope from token shape;
- after external exchange, persist encrypted tokens only with CAS on both the
  consumed OAuth transaction ID and its expected credential generation. A
  concurrent disconnect or explicit newer OAuth start increments generation;
  the stale response is discarded and cannot reconnect the integration;
- retain the DB-backed refresh lease/generation schema for a future verified
  contract, but keep refresh dispatch and the complete Figma route contribution
  unavailable until one authoritative current endpoint/body is pinned by a
  dated contract amendment and focused fixture; and
- disconnect deletes token/pending/refresh-lease material, increments credential
  generation, revokes every unconsumed source grant, atomically marks every
  older active import lease aborted, signals its in-process abort controller,
  and emits no token/source identity to audit. A newer OAuth start also
  invalidates older grants/leases through the same generation fence.

Every Figma REST and raster request receives the import lease's abort signal and
calls `requireCurrentFigmaImportLease` immediately before dispatch. The same
recheck is mandatory before raster staging, prepared-adoption freeze, and L02
materialization. A disconnect/generation change between any two steps aborts
the request, purges attempt-owned temporary bytes, and settles
`figma_import_aborted`; it can never produce an IR, ready revision, or preview.

Figma client ID/secret and fixed redirect configuration are backend settings,
not fields accepted from the browser. The Figma OAuth client secret, access
token, refresh token, authorization code, raw state, and PKCE verifier are
redacted at source and never enter exception messages.

### Figma backend configuration contract (exact owner, keys, and projection)

The Figma backend configuration has exactly one owner and one module/file set:

- `core/services/designer/imports/figma/figmaContracts.ts` owns the pure
  `FigmaBackendConfigV1` shape, its strict allowlist schema, bounds, and the
  `FIGMA_BACKEND_CONFIG_KEYS_V1` literal set;
- `core/services/designer/imports/figma/figmaCredentialStore.ts` owns
  `resolveFigmaBackendConfigV1(settings, deps)` (reads the encrypted
  installation-scoped config from the existing `integrations` row with ID
  `designer-figma`, validates it strictly, and returns the typed config or
  `figma_credential_invalid`) and `projectFigmaBackendConfigV1(config)` (the
  browser-safe projection); this function is called exactly once, inside
  `resolveAndCreateFigmaImportRuntimeV1` — no other module reads the config;
  and
- focused tests in `tests/security/figmaImportSecurity.test.ts` pin the exact
  keys, encryption/redaction, redirect derivation, generation, safe projection,
  and every invalid-config negative.

```ts
export type FigmaBackendConfigV1 = Readonly<{
  integrationId: "designer-figma";           // exact existing integrations row ID
  clientId: string;                           // 1..128 ASCII; never browser-visible
  clientSecretEncrypted: string;              // encrypted at rest; never decrypted for the browser
  redirectUri: string;                        // derived, never accepted from the browser
  credentialGeneration: number;               // monotonic; >= 1
  requestedScope: readonly ["file_content:read"];
  refreshContractStatus: typeof FIGMA_REFRESH_CONTRACT_STATUS_V1;
  statusMetadata: Readonly<{ connected: boolean; tokenExpiresAt: string | null; accountId: string | null }>;
}>;

export function resolveFigmaBackendConfigV1(
  settings: SettingsReadModelV1,
  deps: FigmaConfigDepsV1,
): Result<FigmaBackendConfigV1, FigmaConfigErrorV1>;

export function projectFigmaBackendConfigV1(
  config: FigmaBackendConfigV1,
): FigmaConfigProjectionV1; // safe status only: connected, requestedScope, tokenExpiresAt, accountId?
```

The redirect URI is derived server-side exactly once from the configured public
base URL, the canonical Admin base path, and the exact callback suffix
`/designer/imports/figma/oauth/callback` owned by the pre-React callback scrub
seam; it is never taken from a request, header, or
stored browser value. `clientId`/`clientSecretEncrypted` are never present in
any route response, browser payload, cache, log, audit, error, screenshot, or
evidence; `projectFigmaBackendConfigV1` emits only the safe status projection.
Unknown config keys, malformed legacy bytes, a missing/duplicated key, a
non-numeric or non-positive generation, and an unsafe redirect derivation all
fail closed as `figma_credential_invalid` and are never treated as connected.

**Single config source.** There is exactly one config read and one generation
type. `credentialGeneration: number` (monotonic, >= 1) is the one generation
type used consistently by the config, the OAuth transaction/credential CAS,
and the `available` descriptor branch.
`resolveAndCreateFigmaImportRuntimeV1` is the sole single-read owner: its input
carries only `featureEnabled`, server `settings`, `configDeps`, and
`runtimeDeps`; inside the factory it calls
`resolveFigmaBackendConfigV1(settings, configDeps)` exactly once, maps a
`Result` error to the `unavailable`/`config_invalid` branch (zero
construction), imports `FIGMA_REFRESH_CONTRACT_STATUS_V1` internally, and only
then mints. `Task414IntegrationDeps` carries no
pre-resolved `config.figmaBackend` field and the final composer never reads
config or status separately — it calls `resolveAndCreateFigmaImportRuntimeV1`
once. No other
module reads or re-resolves the backend config.

**Exact integration row storage (existing owner seam).** The `designer-figma`
row is an existing `integrations` row, not a new table. This leaf is the
successor writer of the exact bounded regions in
`core/services/integrations/registry.ts` and
`core/services/integrations/integrationsService.ts` that add the
`designer-figma` backend-only allowlist entry and its encrypted config
read/redaction; it adds no migration and no other integration behavior. The
row's strict config allowlist is versioned and stores exactly these
backend-only keys (each unknown key rejects the whole row as
`figma_credential_invalid` and is never treated as connected):

| Key | Type/bounds | Handling |
| --- | --- | --- |
| `clientId` | 1..128 ASCII | encrypted at rest; never in any Admin/generic integration projection |
| `clientSecret` | 1..512 chars | encrypted at rest with the backend secret store; decrypted only inside the server OAuth client; never in any projection/log/error |
| `credentialGeneration` | integer >= 1, monotonic | one generation type; CAS guard for every credential write |
| `requestedScope` | `["file_content:read"]` | immutable transaction-bound scope label |
| `refreshContractStatus` | `FIGMA_REFRESH_CONTRACT_STATUS_V1` literal | audited status owner |
| `statusMetadata` | `{ connected, tokenExpiresAt, accountId? }` | safe status facts only; no token material |

The generic Admin integrations projection (list/detail) must redact the whole
`designer-figma` config envelope to the safe `projectFigmaBackendConfigV1`
status projection; `clientId` and `clientSecret` are backend-only keys that
must never surface through the generic projection, cache, logs, audit,
browser payloads, or evidence. Focused tests
(`tests/vitest/integrations/designerFigmaIntegrationConfig.test.ts`) prove the
allowlist entry, encrypted round-trip, generation monotonicity, redaction of
both secret keys from the generic projection, and unknown-key rejection.

The 2026-08-08 verification is explicitly unresolved: Figma's current OAuth
instructions and official migration changelog contradict one another on refresh
endpoint/body. Export
`FIGMA_REFRESH_CONTRACT_STATUS_V1 = "unavailable_official_docs_conflict_2026_08_08"`
from `figmaContracts.ts` as the sole status/type owner. While that literal is current, even
`CODERSO_DESIGNER_FIGMA_ENABLED=true` yields the typed
`figma_unavailable` descriptor, OAuth start/callback/refresh/import routes are
not mounted, and no token/provider I/O occurs. Re-read both official sources
immediately before implementation; enable only through an audited contract
amendment that identifies one consistent endpoint, exact form body, auth, and
response. Never probe multiple endpoints or add a configurable fallback.

`figmaContracts.ts` owns the pure safe availability descriptor state; the
runtime factory module owns the one authoritative resolution+mint:

```ts
// figmaContracts.ts — pure structural descriptor state only; never authorizes I/O
export type FigmaUnavailableReasonV1 =
  | "feature_disabled"
  | "refresh_contract_unavailable"
  | "config_invalid";

export type FigmaAvailableDescriptorV1 = Readonly<{
  state: "available";
  credentialGeneration: number;
}>;

export type FigmaRuntimeAvailabilityV1 =
  | FigmaAvailableDescriptorV1
  | Readonly<{ state: "unavailable"; reason: FigmaUnavailableReasonV1 }>;

// figmaRuntimeFactory.ts — the one closed resolution union; the runtime is
// WeakSet-minted only in the available branch and is never a parameter
export type FigmaRuntimeResolutionV1 =
  | Readonly<{ state: "unavailable"; reason: FigmaUnavailableReasonV1; runtime: null }>
  | Readonly<{
      state: "available";
      availability: FigmaAvailableDescriptorV1; // exact available descriptor only, never the unavailable branch
      runtime: FigmaImportRuntimeV1;            // WeakSet-verified; never forgeable
    }>;
```

The availability and proof concepts are intentionally split: the descriptor
state is structural and forgeable (it is a safe descriptor, used only for the
browser-safe slot projection and `availabilityBySource`); the runtime is
mint-only. There is no exported proof type and no proof-accepting constructor,
so no descriptor state, boolean, cast, or caller callback can authorize I/O:
the callable services and the `figma` materialization-source contribution are
constructed only inside `resolveAndCreateFigmaImportRuntimeV1` from the
module-private WeakSet mint-and-verify capability described above.

`available` requires all three facts resolved inside the factory: the explicit
feature flag is true, the
audited refresh status (imported internally as
`FIGMA_REFRESH_CONTRACT_STATUS_V1`, never caller-supplied) is a future
supported literal introduced by a contract
amendment, and the strict backend config (read internally by the single
`resolveFigmaBackendConfigV1` call) is valid. No consumer may gate on
the flag alone, supply a status literal, or recompute this conjunction; the
composer receives only the
closed resolution union. With the current conflict literal,
the factory always returns the `unavailable` branch with reason
`refresh_contract_unavailable`; route registration,
materialization-verifier installation, OAuth/token/REST clients, raster fetch,
scanner, temporary storage, and provider I/O all remain uncalled.
The final composer calls
`resolveAndCreateFigmaImportRuntimeV1` exactly once with
`{ featureEnabled, settings, configDeps, runtimeDeps }` and does not read
config or status separately; an invalid config is handled inside the factory
as the `unavailable`/`config_invalid` branch with zero construction. Every
callable OAuth/REST/import/materialization
service and the `figma` materialization-source contribution are constructed
only inside that call and only in the `available` branch; a boolean, cast,
descriptor
state, caller-supplied config/status, forged structural runtime, caller
callback, or direct contribution
import cannot construct them. Before consuming any runtime, the composer and
the route-mount builder must call `isFigmaImportRuntimeV1` (WeakSet
membership); a failed check is treated exactly like the `unavailable` branch.

## REST, Egress, and Raster Contract

`figmaRestClient.ts` consumes TASK-414-03-L01's shared outbound policy and
pinned transport through a dependency-injected adapter for tests; it does not
implement another DNS/peer/redirect/proxy lifecycle. Its code-owned purposes
hardcode the official HTTPS API/token origins in production. It must:

- serialize a validated file key as one path segment and selected IDs/depth as
  bounded query parameters; no arbitrary URL or base URL is accepted;
- set authorization only for exact `api.figma.com` requests and strip it from
  raster downloads;
- disable redirects, enforce DNS/public-IP checks, connection/body/deadline
  limits, and abort on cap breach;
- validate status/content type before parsing, stream-count bytes, parse once,
  and recursively validate only the response projection the adapter consumes;
- honor `Retry-After` only for idempotent GET, at most twice and inside the same
  60-second deadline; token exchange and mutations are not automatically
  replayed;
- treat a provider selection as untrusted because Figma can include ancestors,
  components, styles, or canvases beyond requested IDs; apply all caps to the
  complete returned graph; and
- request raster output only, validate every returned URL against the response
  that produced it, resolve/pin only public network targets, reject redirects,
  stream under per/aggregate limits into TASK-414-04's shared private-input
  quarantine, and bind the raw SHA-256 before any complex decode;
- fence raster bytes with a capture-once + bounded-recheck immutable
  file-version strategy, never a per-fetch before/after GET pair. The images
  endpoint response carries NO version field, so the contract never reads one
  from it: capture the authoritative immutable `version` from the file/nodes
  response exactly once per import run (the single initial file/nodes GET that
  produced the selection inventory), then fetch each bounded per-asset image,
  recheck the fence with at most one bounded authoritative file-version GET per
  8 fetched assets (4 rechecks for a full 32-asset import), and issue one final
  file-version GET immediately before prepared-adoption freeze/promotion. Every
  recheck asserts equality with the captured version plus the current import
  lease; a version change, missing version, or drift between any read aborts the
  request, purges the attempt-owned temporary bytes, and settles
  `figma_adoption_binding_mismatch`; it can never produce an IR, ready revision,
  or preview;
- require a current clean ClamAV receipt for those exact raw bytes, then decode
  in the isolated bounded image worker, reject polyglots/bombs, and re-encode to
  canonical PNG/JPEG/WebP bytes. Bind raw hash, clean-scan receipt, decoded
  dimensions, canonical-byte hash, and private object identity in one immutable
  adoption receipt; scanner unavailable/timeout/error fails the entire import;
  and
- stage only the post-scan canonical raster through the terminal private
  Designer asset seam. Neither provider URL nor unscanned raw bytes may be
  adopted, forwarded to a model, rendered, or persisted as a ready asset.

Worst-case outbound-call arithmetic for the raster version fence: 1 initial
file/nodes GET (captures the version) + 32 per-asset image fetches + 4 periodic
rechecks (at most 1 recheck per 8 assets) + 1 final pre-promotion recheck =
38 outbound calls, which fits `FIGMA_IMPORT_LIMITS_V1.outboundCalls` (40) with
2 calls of headroom. No per-fetch before/after version GET pair is ever issued,
so this budget holds for every accepted import; the import lease is asserted
immediately before each image dispatch and at every recheck.

### Exact temporary-raster attempt/adoption seam

`figmaTemporaryAssetAttempt.ts` is the exact, explicitly L01-owned focused
implementation seam for the previously undefined
`temporaryDesignerAssets`/`sharedPrivateInputClamAv` references. It exports:

```ts
export type FigmaTemporaryAssetStoreV1 = Readonly<{
  beginAttempt(owner: AttemptOwnerV1): Promise<FigmaTemporaryAssetAttemptV1>;
  purgeAttempt(attemptId: string): Promise<void>; // store-owned removal by exact id
}>;

export type FigmaTemporaryAssetAttemptV1 = Readonly<{
  attemptId: string;
  scanDecodeAndCanonicalizeRasters(
    rawRasters: readonly FigmaRawRasterV1[],
    deps: FigmaRasterProcessDepsV1,
  ): Promise<readonly CanonicalRasterV1[]>;
  stageValidatedRasters(
    rasters: readonly CanonicalRasterV1[],
  ): Promise<readonly FigmaTemporaryAssetHandleV1[]>;
  freezePreparedAdoption(input: FreezePreparedAdoptionInputV1): Promise<PreparedDesignerAssetAdoptionV1>;
  purgeAndProveAbsent(): Promise<void>;
}>;

export type FigmaTemporaryAssetHandleV1 = Readonly<{
  schema: "coderso.figma-temporary-asset-handle@v1";
  handleId: string;                   // opaque backend-only brand id; 1..128 ASCII
  attemptId: string;                  // exact owning FigmaTemporaryAssetAttemptV1.attemptId
  assetKey: string;                   // exact DesignIRAssetV1.assetKey this handle adopts
  rawSha256: string;                  // lowercase 64-hex over the exact scanned raw bytes
  canonicalSha256: string;            // lowercase 64-hex over the canonical re-encoded bytes; equals the joined DesignIRAssetV1.sha256
  mime: "image/png" | "image/jpeg" | "image/webp"; // sniffed allowlisted MIME
  byteLength: number;                 // canonical bytes; integer, clamped [1, 8 MiB]
  width: number; height: number;      // decoded dimensions; integers, clamped [1, 8192]
  storageLocator: string;             // backend-only opaque locator; never serialized into DesignIRV1, a route response, audit, or evidence
}>;

export type PreparedDesignerAssetAdoptionEntryV1 = Readonly<{
  assetKey: string;                   // exact symbolic binding to DesignIRAssetV1.assetKey
  rawSha256: string;                  // lowercase 64-hex over the exact scanned raw bytes
  canonicalSha256: string;            // lowercase 64-hex over the canonical re-encoded bytes
  cleanScanReceiptVersion: string;    // exact ClamAV receipt/version that passed for these bytes
  byteLength: number;                 // canonical length; integer, clamped [1, 8 MiB]
  mime: "image/png" | "image/jpeg" | "image/webp";
  width: number; height: number;      // decoded dimensions; integers, clamped [1, 8192]
  privateObjectIdentity: string;      // backend-only private object identity; never exposed outside the backend
}>;

export type PreparedDesignerAssetAdoptionV1 = Readonly<{
  schema: "coderso.prepared-designer-asset-adoption@v1";
  owner: AttemptOwnerV1;              // exact (ownerId, workspaceId, importAttemptId) ownership
  designIRSha256: string;             // exact bound canonical IR digest
  assets: readonly PreparedDesignerAssetAdoptionEntryV1[]; // one entry per adopted handle
}>;
```

The store owns attempt creation/removal; the attempt owns only
scan/stage/freeze/purge — there is no self-recursive member and no
attempt-created attempt. `figmaTemporaryAssetStore` (the module instance) is
the only caller of `beginAttempt` in the import service; `purgeAttempt` is the
store-owned cleanup path used by abort/cleanup/recovery.

- `FigmaRasterProcessDepsV1` carries the scanner/storage dependencies by exact
  injection: `scanner` is the terminal TASK-414-04 shared ClamAV client seam
  (exact landed export re-verified at implementation; INSTREAM Unix socket,
  `no-new-privileges`, 25 MiB/30 s stream budget) and `storage` is the
  attempt-scoped private object store rooted at `(ownerId, workspaceId,
  importAttemptId)` with private/cache-ineligible semantics.
- Attempt rows/objects are owned by `(ownerId, workspaceId, importAttemptId)`,
  are private/cache-ineligible, and import
  `ASSISTANT_RETENTION_POLICY_V1.figma-and-designer-temporary-assets`: hard 24
  hours from attempt creation with immediate abort/failure cleanup. The seam
  performs no DB transaction around external I/O; every failure path purges the
  exact attempt and proves absence (`purgeAndProveAbsent`) before the import
  error is returned.
- The attempt contract is also the reusable scanned-raster attempt/adoption
  contract for any future built-in import source: it binds raw hash, clean-scan
  receipt, decoded dimensions, canonical-byte hash, and private object identity
  in one immutable `PreparedDesignerAssetAdoptionV1` and never exposes a storage
  locator outside the backend.

Temporary assets are owned by `(ownerId, workspaceId, importAttemptId)`, are
private/cache-ineligible, and import
`ASSISTANT_RETENTION_POLICY_V1.figma-and-designer-temporary-assets`: hard 24
hours from attempt creation with immediate abort/failure cleanup. L01 returns one immutable
server-only `PreparedDesignerAssetAdoptionV1` whose exact raw/canonical digests,
clean-scan receipt/version, lengths, MIME, dimensions, owner, and symbolic
bindings are rechecked by TASK-414-08-L02. That owner
adopts the asset/input-binding rows in the same transaction as the complete
stage graph and `ready` CAS. A failed L01 import purges its own attempt before
returning an error; a later rollback leaves the attempt cleanup/recovery
eligible and can never leave a ready revision pointing at unadopted bytes.

### Exact v1 limits

`figmaContracts.ts` freezes one recursively strict `FIGMA_IMPORT_LIMITS_V1`.
Its import ceilings equal the parent TASK-414-10 contract exactly:

| Limit | Exact value |
| --- | ---: |
| Request JSON | 16 KiB |
| File key | 128 ASCII characters |
| Selected node IDs | 64, each at most 128 ASCII characters |
| Requested REST `depth` | 1-12 |
| REST JSON body | 12 MiB per response |
| Normalized nodes | 4,000 |
| Normalized tree depth | 24 |
| Children per node | 256 |
| Text per node / aggregate UTF-8 text | 32 KiB / 512 KiB |
| Raster assets | 32 |
| Raster bytes per asset / aggregate | 8 MiB / 64 MiB |
| Raster dimensions / pixels | 8,192 px per side / 20 megapixels |
| Canonical serialized `DesignIRV1` | 8 MiB |
| Outbound calls / concurrent binary fetches | 40 / 4 |
| Import elapsed time | 60 seconds |
| Automatic retries | 2, idempotent GET only, before the same deadline |
| OAuth/token response bytes | 64 KiB |
| diagnostics / safe message Unicode scalars | 256 / 256 |

Counts apply to the complete provider-expanded graph and all attempts, not only
requested roots or successful outputs. Every cap is checked before allocation
grows beyond it; unknown enums/fields, NaN/infinite values, over-depth graphs,
oversized strings, integer overflow, and aggregate-budget overflow fail closed.

`FIGMA_IMPORT_LIMITS_V1` carries exactly this frozen property list (one key per
table row above; the tabulated values are the authoritative literals):

```ts
export type FigmaImportLimitsV1 = Readonly<{
  maxRequestJsonBytes: number;         // 16 KiB request JSON
  maxFileKeyChars: number;             // 128 ASCII
  maxSelectedNodeIds: number;          // 64
  maxSelectedNodeIdChars: number;      // 128 ASCII per selected node id
  maxRestDepth: number;                // 12 (requested REST depth range 1..12)
  maxRestResponseBytes: number;        // 12 MiB per response
  maxNodes: number;                    // 4,000 normalized nodes
  maxTreeDepth: number;                // 24
  maxChildrenPerNode: number;          // 256
  maxTextBytesPerNode: number;         // 32 KiB UTF-8
  maxAggregateTextBytes: number;       // 512 KiB
  rasterAssets: number;                // 32
  maxAssetBytes: number;               // 8 MiB per raster asset
  maxRasterBytes: number;              // 64 MiB aggregate raster bytes
  maxRasterDimensionPx: number;        // 8,192 px per side
  maxRasterPixels: number;             // 20 megapixels
  maxImportedFileBytes: number;        // 8 MiB canonical serialized DesignIRV1
  outboundCalls: number;               // 40
  concurrentBinaryFetches: number;     // 4
  maxImportElapsedSeconds: number;     // 60
  maxAutomaticRetries: number;         // 2, idempotent GET only
  maxOAuthTokenResponseBytes: number;  // 64 KiB
  maxDiagnostics: number;              // 256
  maxDiagnosticMessageScalars: number; // 256
}>;

export const FIGMA_IMPORT_LIMITS_V1: Readonly<FigmaImportLimitsV1> = Object.freeze({
  maxRequestJsonBytes: 16 * 1024,
  maxFileKeyChars: 128,
  maxSelectedNodeIds: 64,
  maxSelectedNodeIdChars: 128,
  maxRestDepth: 12,
  maxRestResponseBytes: 12 * 1024 * 1024,
  maxNodes: 4_000,
  maxTreeDepth: 24,
  maxChildrenPerNode: 256,
  maxTextBytesPerNode: 32 * 1024,
  maxAggregateTextBytes: 512 * 1024,
  rasterAssets: 32,
  maxAssetBytes: 8 * 1024 * 1024,
  maxRasterBytes: 64 * 1024 * 1024,
  maxRasterDimensionPx: 8_192,
  maxRasterPixels: 20_000_000,
  maxImportedFileBytes: 8 * 1024 * 1024,
  outboundCalls: 40,
  concurrentBinaryFetches: 4,
  maxImportElapsedSeconds: 60,
  maxAutomaticRetries: 2,
  maxOAuthTokenResponseBytes: 64 * 1024,
  maxDiagnostics: 256,
  maxDiagnosticMessageScalars: 256,
});

export function normalizeFigmaImportLimitsV1(value: unknown): FigmaImportLimitsV1;
// Strict validate/normalize helper: recursively rejects unknown keys,
// non-finite/non-integer/non-positive values, and any value not identical to
// the frozen FIGMA_IMPORT_LIMITS_V1 literal; it returns the frozen literal or
// fails closed with a typed pure error (never partial limits). The single
// limits test matrix covers every mismatch row plus the exact-boundary rows.
```

This constant is the single owner of every ceiling: L02's
`designerFigmaSchemas.ts` route schemas and every Figma route/import/security
test import `FIGMA_IMPORT_LIMITS_V1` from `figmaContracts.ts` and never
redefine a limit. Tests assert both the exact boundary (accepted) and the
one-over boundary (rejected) for every byte, count, depth, dimension, pixel,
concurrency, deadline, and retry limit above.

### Strict route DTO ownership

`figmaContracts.ts` owns the pure domain DTOs below with exact fields and
bounds; L02's `designerFigmaSchemas.ts` imports them and owns only the six
per-route envelope schema exports. Every DTO recursively rejects unknown fields
and enforces the exact ceilings above; empty query/body contracts are explicit:

| DTO | Exact shape and bounds |
| --- | --- |
| `FigmaStatusViewV1` | `{ connected: boolean, requestedScope: readonly ["file_content:read"], tokenExpiresAt: string \| null, accountId?: string }` — `accountId` present only when `user_id_string` exists in the official token response; 1..128 ASCII; no token/secret |
| `FigmaOAuthStartBodyV1` | `{}` or `{ returnWorkspaceId?: string }` — `returnWorkspaceId` 1..128 bounded; empty body valid; only optional field in the whole DTO set |
| `FigmaOAuthStartViewV1` | `{ authorizationUrl: string, oauthTransactionId: string }` — fixed official origin URL; no raw state/verifier |
| `FigmaOAuthExchangeBodyV1` | `{ code: string, state: string }` — both 1..4096 ASCII, bounded; exist only in this immediate body |
| `FigmaOAuthExchangeViewV1` | `FigmaStatusViewV1` — safe connection status |
| `FigmaDisconnectBodyV1` | `{}` — exact empty body |
| `FigmaSourceGrantBodyV1` | `{ source: string, selectedNodeIds: readonly string[], depth: number }` — `source` is a Figma file key or official URL, 1..128 ASCII; `selectedNodeIds` 1..64 entries each 1..128 ASCII; `depth` integer 1..12 |
| `FigmaSourceGrantViewV1` | `{ grantId: string, selectionSha256: string, expiresAt: string }` — opaque projection only |
| `FigmaImportBodyV1` | `{ expectedState: string, expectedVersion: number, idempotencyKey: string, sourceGrantId: string }` — state 1..64, version integer >= 1, idempotency key 16..128, grant ID 1..128; no raw source fields |
| `FigmaImportViewV1` | safe ready-revision binding — workspace/revision identity + digests authorized for the workspace view; no preview claim |

All six routes additionally pin exact empty query contracts (`{}`) and, for
body routes, `application/json` content type; unknowns in params/query/body/
response fail closed. Absent-body semantics are exact: a body route with a
missing or empty body parses as `{}` only when the contract is `{}` (disconnect,
status); any body route whose contract requires fields rejects a missing body
as `figma_source_invalid`/`designer_figma_request_invalid` before service work.
DELETE returns `204` with no body.

`FigmaImportViewV1` has exactly this shape (safe ready-revision binding:
workspace/revision identity + digests authorized for the workspace view; no
preview claim):

```ts
export type FigmaImportViewV1 = Readonly<{
  schema: "coderso.figma-import-view@v1";
  workspaceId: string;        // exact owning workspace id; 1..128 ASCII
  revisionId: string;         // exact ready private Designer revision id; 1..128 ASCII
  designIRSha256: string;     // lowercase 64-hex canonical DesignIRV1 digest
  sourceVersion: string;      // immutable Figma version captured once from the file/nodes response; 1..128 ASCII
  adoptedAssetCount: number;  // integer, clamped [0, FIGMA_IMPORT_LIMITS_V1.rasterAssets]
}>;
```

It contains no preview session, URL, bind secret, claim that preview creation
succeeded, raw source identity, token, or storage handle.

### Six exact route-envelope schema exports

`designerFigmaSchemas.ts` owns exactly these six envelope exports (one per
route), each exporting strict `{ params, query, body, contentType }` schemas;
L02's route factory and tests consume them by name and never redefine a shape:

```ts
export const figmaStatusRouteSchemasV1;      // GET /settings/integrations/figma
export const figmaOAuthStartRouteSchemasV1;  // POST .../oauth/start
export const figmaOAuthExchangeRouteSchemasV1;// POST .../oauth/exchange
export const figmaDisconnectRouteSchemasV1;  // DELETE .../connection
export const figmaSourceGrantRouteSchemasV1; // POST .../workspaces/:workspaceId/source-grants
export const figmaImportRouteSchemasV1;      // POST /designer/workspaces/:workspaceId/imports/figma
```

### One limits test matrix

L01 owns the single limits test matrix (`tests/vitest/designer/figmaImportLimitsMatrix.test.ts`,
new): one table-driven suite covers every `FIGMA_IMPORT_LIMITS_V1` ceiling with
exact-boundary (accepted) and one-over-boundary (rejected) rows, importing the
constant from `figmaContracts.ts`. L02's route tests import the same matrix and
assert parity identity against the sole owner constant; they retest only the
route-relevant ceilings and never define a second matrix. The matrix also pins
the raster version-fence outbound budget: a full 32-asset import issues exactly
1 initial file/nodes GET, 32 per-asset image fetches, 4 periodic version
rechecks, and 1 final pre-promotion recheck (38 outbound calls, at or under
`outboundCalls` = 40), with no per-fetch before/after version GET pair.
