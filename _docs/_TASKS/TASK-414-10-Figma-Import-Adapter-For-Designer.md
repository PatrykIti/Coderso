# TASK-414-10: Figma Import Adapter for Designer
# FileName: TASK-414-10-Figma-Import-Adapter-For-Designer.md

**Parent Task:** TASK-414
**Priority:** Medium
**Category:** Designer / Figma / OAuth / Import Adapter / Security
**Estimated Effort:** Large
**Dependencies:** TASK-414-03, TASK-414-07, TASK-414-08,
TASK-414-09-L01, TASK-414-09-L02, TASK-414-09-L04, and TASK-547 terminal
**Followed By:** TASK-414-09-L03 integration landing
**Status:** ⏳ To Do
**Target:** Later delivery phase and disabled by default, but required before
TASK-414 family closure
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Add one optional later-phase Figma source adapter to Designer. The adapter uses
Figma's official OAuth and REST APIs, requests only `file_content:read`, imports
a bounded design selection into a provider-neutral `DesignIRV1`, and then uses
the same Designer brief, strict `DesignerSiteBundleV1` compiler, staging,
validation, revision, and preview contracts owned by TASK-414-07 through
TASK-414-09.

Figma is an input source, never an executor or alternate CMS runtime. No Figma
document, node, component, plugin payload, provider response, or image URL may
become HTML, CSS, JavaScript, a `FullSitePackageV1`, sidecar,
`DesignerSiteBundleV1`, native CMS document, or canonical CMS write directly.
The only legal flow is:

`official Figma REST bytes -> strict adapter -> DesignIRV1 -> DesignerBriefV1
-> terminal DesignerSiteBundleV1 compiler -> private staged revision -> digest-bound preview
-> existing explicit approval/promotion path`

The feature is disabled by default. A disabled or disconnected Figma adapter
does not affect Guide, Agent, provider-free Designer draft reopening, or normal
Designer prompt generation. No webhook, public write, Figma plugin, scraping,
browser automation, unofficial API, or arbitrary remote URL import is included.

## Product and Trust Boundary

| Concern | Required contract | Forbidden contract |
| --- | --- | --- |
| Provider access | Official `https://www.figma.com/oauth` and `https://api.figma.com/v1/*` only | scraping, browser automation, plugin bridge, unofficial SDK endpoint, configurable API base URL |
| Scope | Exact least-privilege OAuth scope `file_content:read` | comments, projects, variables, dev resources, write scopes, implicit broad scope |
| Credential | One installation-scoped connection, encrypted backend access/refresh tokens, safe status projection | browser/localStorage token, raw token in JSON/log/audit/cache/evidence |
| Source | `settings:write` plus exact workspace access creates one ten-minute actor/workspace/credential-generation-bound grant from a strict Figma file key or official URL and its bounded node/depth selection; Designer import under `designer:write` accepts only the already-issued opaque grant ID. V1 uses the minimal same-actor contract: the grant creator must also hold `designer:write` plus exact workspace access to import that grant; no cross-actor recipient flow exists | raw key/URL/node/depth in Designer import, cross-actor grant use, arbitrary URL fetch, webhook, public upload/write |
| Execution binding | Pending Designer claim stores source grant + selection digest; L01 CAS-attaches the exact grant/selection/credential-generation/import-lease binding before external I/O; the static verifier rechecks it under materialization lock | fake AI provider binding, caller callback/verifier, stale grant/credential/lease, unregistered source fallback |
| Intermediate | Canonical, provider-neutral `DesignIRV1` plus private staged image handles | raw Figma JSON persisted as authority, SVG/script payload, expiring CDN URL persisted |
| Designer handoff | Existing brief/bundle compiler/staging/revision/preview services | direct core/sidecar/bundle construction in a route, canonical CMS row, publish/promote action |
| Failure | Typed fail-closed error and zero new Designer revision when the import is incomplete | partial package, silently dropped critical content, provider fallback |

## Locked `DesignIRV1` Contract

TASK-414-10-L01 exclusively owns the pure `DesignIRV1` contract and normalizer
in `core/services/designer/imports/designIrContract.ts`; the Figma
OAuth/credential, REST/egress, and raster runtime seam contract is owned by
TASK-414-10-L03. The discriminator is
`coderso.design-ir@v1`. The shape is provider-neutral: it models bounded visual
structure and semantic hints, while provider-specific node types and raw Figma
fields stop at the adapter boundary.

The canonical document contains only:

- `schema`, `source`, `roots`, `nodes`, `assets`, and `diagnostics` root keys;
- source provenance as adapter ID, hashed source identity, immutable upstream
  version, selected-root digests, and canonical-import digest;
- stable hashed node keys, parent/child relationships, semantic role, bounded
  text, intrinsic dimensions, layout mode, spacing, alignment, visibility,
  opacity, fills, strokes, corner radii, and typography primitives;
- content-addressed raster descriptors with MIME, byte length, dimensions, and
  digest, while opaque temporary private handles remain in a separate
  backend-only import bundle; and
- bounded machine diagnostics for lossy but safe projection.

The contract excludes provider tokens, raw Figma IDs/names used as authority,
raw URLs, plugin data, comments, branches, variables, dev resources, vector path
geometry, executable code, arbitrary CSS values, arbitrary attributes, raw
provider JSON, canonical CMS IDs, and publication state.

### Exact import ceilings

These product ceilings are stricter than any provider allowance and apply after
all dependency expansion in the returned response. A Figma selection parameter
does not prove that the response is bounded.

| Limit | Ceiling |
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
| Diagnostics / safe message Unicode scalars | 256 / 256 |

TASK-414-10-L01 exports the frozen `FIGMA_IMPORT_LIMITS_V1` constant as the
single limits type owner; the exact v1 limits runtime contract section in
TASK-414-10-L03 freezes these values authoritatively. Every Figma route schema
and test imports that constant instead of redefining a ceiling.
Any ceiling breach rejects the whole import. Raster assets are limited to
sniffed PNG, JPEG, or WebP bytes and enter Designer's private staged asset path;
SVG, PDF, HTML, XML, scriptable image content, unknown MIME, decompression bombs,
redirects, and dimension/byte mismatches fail closed.

## Official API Surface

The adapter may call only the currently verified official endpoints below and
must re-verify their bytes against Figma's current primary documentation before
implementation:

- OAuth authorization at `GET https://www.figma.com/oauth` with PKCE `S256`,
  opaque state, exact redirect URI, `response_type=code`, and only
  `file_content:read`;
- authorization-code exchange at
  `POST https://api.figma.com/v1/oauth/token`; refresh has no authorized
  endpoint/body while the official OAuth page and changelog disagree, so the
  complete route contribution remains unavailable and performs no OAuth/REST
  I/O until an audited amendment resolves that conflict;
- file reads at `GET https://api.figma.com/v1/files/:key`;
- selected-node reads at `GET https://api.figma.com/v1/files/:key/nodes`;
- bounded raster rendering at `GET https://api.figma.com/v1/images/:key`; and
- bounded file-image references at
  `GET https://api.figma.com/v1/files/:key/images`.

The initial adapter does not request `geometry=paths`. It honors provider
`Retry-After` within the local deadline, uses product-owned rate/concurrency
ceilings rather than treating Figma limits as capacity, and never retries a
possibly consumed authorization code. Any URL returned for a raster is a
one-import capability: validate it against the same authenticated response,
resolve only public IPs, pin the resolved target, reject redirects, stream under
the byte limit, sniff/re-encode through the private image path, and discard the
URL immediately.

## Internal Route Contract

TASK-414-07-L03 already owns the closed generic import registry, strict
disabled-by-default config, and neutral Admin slot. TASK-414-10-L02 exports one
strict Figma route/source contribution, while TASK-414-10-L01 owns the
type/export surface (including the `figma` materialization-source verifier
exports) accepted by TASK-414-08-L02; TASK-414-10-L03 owns the
OAuth/credential, REST/egress, and raster runtime seam contract that gates that
verifier. TASK-414-09-L03,
which lands after this child, statically wires them through the shared runtime
facade and provider-neutral Designer import seam. L01/L02 must not edit
`core/server/routes/index.ts`, `integrationsRoutes.ts`, rate-policy files,
Admin route aliases/navigation, or the aggregate cache mount owned by L03.

| Method | Internal path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/api/settings/integrations/figma` | safe connection/scope/expiry status only |
| `POST` | `/admin/api/settings/integrations/figma/oauth/start` | issue one-time state + PKCE and return the fixed official authorization URL |
| `POST` | `/admin/api/settings/integrations/figma/oauth/exchange` | consume code/state after the Admin SPA redirect and store encrypted tokens |
| `DELETE` | `/admin/api/settings/integrations/figma/connection` | revoke local credential state and invalidate pending imports |
| `POST` | `/admin/api/settings/integrations/figma/workspaces/:workspaceId/source-grants` | Settings-owned: bind one raw key/official URL plus exact node/depth selection to a ten-minute actor/workspace/purpose/credential-generation grant |
| `POST` | `/admin/api/designer/workspaces/:workspaceId/imports/figma` | Designer-owned: accepts only an already-issued opaque grant ID and imports one bounded selection into a new private Designer revision only; the Admin UI then invokes the existing separate preview-create/bind flow (TASK-414-08-L03) |

The fixed OAuth redirect target is derived server-side exactly once as
`site.publicBaseUrl + adminBasePath + /designer/imports/figma/oauth/callback`
(the canonical relative Admin suffix `/designer/imports/figma/oauth/callback`
resolved under the configured Admin base path). The SPA
handles the browser secret only as follows: OAuth `state` may exist in the
browser only inside the one-time authorization and callback URLs, and
`code`/`state` only in the immediate exchange request body. The generic
pre-React callback scrub seam (TASK-414-03-L03: `oauthCallbackScrub.ts` +
`core/admin/main.tsx`) runs `captureAndScrubOAuthCallbackBeforeBootstrap()`
synchronously before `createRoot` and strips them from the address bar via
`history.replaceState`; the slot then consumes the once-only value through
`takeScrubbedOAuthCallbackOnce()` and submits the exchange POST. They are never persisted to storage,
logs, cache, screenshots, or evidence. No mutating GET, public callback API,
webhook, or public import endpoint is created.

## Security Contract

- **Endpoint visibility:** every API above is internal under `/admin/api/*`.
  The OAuth redirect lands on the authenticated Admin SPA; there is no public
  write, webhook, bearer import endpoint, API-key variant, or front-runtime
  route.
- **Auth model:** existing authenticated Admin session, actor, and current
  session binding. OAuth state also binds the actor, session digest, exact
  redirect URI, and optional return workspace.
- **RBAC:** status requires `settings:read`; connect/exchange/disconnect
  require `settings:write`; Settings-owned source-grant creation requires
  `settings:write` plus exact workspace access. Import requires
  `designer:write` plus exact workspace
  access and accepts only an already-issued opaque grant; a
  `designer:write`-only actor can import but cannot submit raw file/URL/node/
  depth selection or inspect/change Settings. `designer:write` never reveals
  tokens or grants Settings access. The grant is actor/workspace/
  generation/purpose-bound and single-use, and v1 requires the same actor to
  hold both `settings:write` plus workspace access (grant creation) and
  `designer:write` plus workspace access (import); no cross-actor recipient
  flow exists in v1. Native CMS permissions remain deferred to
  the existing promotion contract.
- **CSRF:** every POST and DELETE requires the standard valid Admin CSRF token.
  OAuth state and PKCE supplement CSRF and do not replace it. GET status is
  read-only and cache-ineligible.
- **Rate-limit bucket:** status reads use `admin_read`; OAuth, source-grant,
  and import mutations use the dedicated `designer-figma` bucket, keyed by
  actor with installation-wide ceilings and separate OAuth/import costs, and
  import additionally charges the terminal `designer-generation` bucket. At
  most one import may be active per actor/workspace and two installation-wide.
  Provider `Retry-After` cannot extend the local 60-second deadline.
- **Reject unknown:** path, query, body, provider response, token response,
  stored credential object, `DesignIRV1`, diagnostics, and browser-safe result
  schemas recursively reject unknown fields and enforce the exact limits above.
- **Anti-abuse:** no public write exists, so nonce, HMAC/signature, and reCAPTCHA
  are not applicable. OAuth uses 256-bit random one-time state, PKCE `S256`, a
  five-minute local transaction TTL, exact redirect allowlist, one-time consume,
  and bounded authorization-code exchange. Arbitrary URL/DNS/redirect fetch is
  forbidden.
- **Secrets/privacy:** access/refresh tokens and PKCE verifier are encrypted at
  rest with the backend secret store; only minimal safe connection metadata may
  reach the browser. Logs, audit, cache, tests, screenshots, errors, and reports
  contain no token, code, verifier, raw file key, raw provider response, source
  image URL, private staged URL, or customer design content.
- **External I/O and transactions:** no REST/OAuth/image call runs inside a DB
  transaction. Token/state/refresh-lease updates use short CAS transactions;
  private staging commits only after all bounded external reads and strict
  normalization succeed. The source grant and abortable import lease bind the
  credential generation through every REST/raster request and transactional
  materialization; disconnect/new OAuth generation aborts stale leases and
  produces no ready revision. Figma has no provider/model binding: its exact
  source-grant/selection/credential-generation/lease binding is a distinct
  closed branch of the Designer materialization-source contract.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
| --- | --- | --- |
| TASK-414-10-L01 | Pure `DesignIRV1`; encrypted installation-scoped Figma credential/OAuth state; official REST/image client; Figma-to-IR adapter; bounded import service; pure/runtime/security tests | ⏳ To Do |
| TASK-414-10-L02 | IR-to-Designer-brief mapping; existing compiler/staging/revision/preview orchestration; internal routes and safe registration; generic Designer import UI handoff; route/UI/integration tests and Figma docs | ⏳ To Do |
| TASK-414-10-L03 | Figma OAuth/credential lifecycle, REST/egress and raster runtime seam, exact v1 limits, route DTO/envelope exports and limits test-matrix contract | ⏳ To Do |

**Land order:** `TASK-414-10-L01 -> TASK-414-10-L03 -> TASK-414-10-L02 -> TASK-414-09-L03`.

L01 is the only writer of Design IR and the Figma type/export surface, and L03
owns the OAuth/credential, REST/egress, and raster runtime seam contract; L02
imports those exact exports and is the only writer of the Figma-to-Designer
orchestration and route registration. None of the 10 leaves may edit a
migration/schema artifact, TASK-547 package owners, terminal Designer
source, shared route/navigation mounts, canonical CMS services, task board, or
changelog. Any missing terminal extension seam is task-contract drift to repair
before implementation, not permission to take another leaf's file.

## Acceptance Criteria

- Figma is disabled by default and visibly marked as a later-phase optional
  source, while this family is not closed until the disabled-by-default adapter
  contract and tests are complete.
- At the 2026-08-08 baseline the current official refresh instructions are
  contradictory, so the fixed source descriptor is
  `figma_unavailable`, no Figma route is mounted, and enabled configuration
  still causes zero OAuth/token/import I/O. This unavailable result is the
  required acceptance state unless a fresh audited amendment pins one
  consistent official endpoint and exact request body before implementation.
- OAuth authorization requests exactly `file_content:read`, stores that value as
  transaction-bound `requestedScope` because Figma's token response does not
  attest scope, uses state + PKCE `S256`, and keeps every token/verifier
  backend-only and encrypted.
- Only officially verified fixed Figma REST/OAuth endpoints may be used; there is no webhook,
  public write, plugin, scraping, browser automation, or configurable egress
  origin.
- Oversized, too-deep, too-many-node, too-many-image, malformed, redirected,
  private-address, unsupported-MIME, rate-limited, expired, or partial imports
  fail closed with zero new Designer revision.
- The same accepted source bytes always produce byte-identical canonical
  `DesignIRV1` and digest.
- Figma-specific IDs and fields stop at the adapter; downstream Designer code
  consumes only the provider-neutral IR and private asset handles.
- A pending Figma generation claim cannot compile. L01 must CAS-bind the exact
  source grant, normalized selection digest, credential generation, import
  lease ID, and fence before external/storage-attempt I/O; L02 and the stage
  transaction recheck that same binding through the statically composed
  verifier, with no provider/model placeholder or fallback.
- An accepted import uses the terminal Designer brief/`DesignerSiteBundleV1`
  compiler/staging/revision/preview path and creates no canonical Page, Post,
  Menu, Form, entry, settings, Media-library, search, cache, or public-runtime
  visibility.
- Revising, rejecting, approving, promoting, conflict handling, and recovery
  remain owned by the same Designer contracts as prompt-generated revisions.
- No imported bytes can become direct HTML, CSS, JavaScript, SVG, native CMS,
  core-package, sidecar, bundle, or canonical CMS writes.

## Testing Requirements

- L01: pure schema/normalizer/canonical-byte fixtures; unavailable-contract
  routing with zero OAuth/provider calls; OAuth state/PKCE/token-rotation and
  fixed-host egress fixtures remain dormant contract tests unless a fresh
  amendment authorizes them; `Retry-After`, response/graph/image/deadline caps,
  SSRF/redirect/MIME/decompression negatives, deterministic Design IR, and
  exact-boundary/one-over rejection for every `FIGMA_IMPORT_LIMITS_V1` ceiling.
- L02: strict route/RBAC/CSRF/rate/reject-unknown mapping; same Designer compiler
  invocation as prompt intake; staged invisibility; digest-bound preview;
  revision/conflict/idempotency; generic Admin import visible effects; route
  schemas/tests import `FIGMA_IMPORT_LIMITS_V1` from the L01 owner only and pin
  exact/one-over boundaries.
- Deterministic recorded Figma fixtures contain synthetic design data and no
  live token, authorization code, customer content, raw private URL, or provider
  response dump. Live OAuth is opt-in operator evidence, never a required CI
  secret.
- Each leaf runs `bun --cwd core lint:types`, `bun --cwd core lint`, its targeted
  Vitest/Bun/security lanes, touched production/test line counts, and
  `git diff --check`.
- TASK-414-11-L01 owns the final shared runtime-smoke Figma scenario: it proves
  visible unavailable/zero-I/O isolation at the current baseline, or the
  amended enabled flow only if one consistent official refresh contract was
  pinned before implementation. This child does not create a task-local
  Playwright or lifecycle harness.

## Documentation Updates Required

TASK-414-10-L02 hands the closure leaf the final route/permission/error matrix,
connection and least-scope behavior, caps, import diagnostics, staged-only
behavior, disconnect/recovery semantics, screenshots, and focused validation
receipts (implementation facts only; L02 edits no docs itself).
TASK-414-02-L02 is the sole writer of `docs/develop/assistant.md`, relevant
`docs/guide/` corpus pages, and generated TASK-548/CMS capability bytes.
TASK-414-11-L01 owns only its assigned non-corpus Figma amendments to
`_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, `_docs/PREVIEW_SPEC.md`,
`_docs/MEDIA_SPEC.md`, and `_docs/ASSISTANT_SITE_BUILDER.md`, plus task/board
state and pinned changelog 1266. Final docs state that no webhook or public
write exists.
