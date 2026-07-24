# TASK-551-09-L01: Warm Public Read Models and Zero-Query Hits
# FileName: TASK-551-09-L01-Warm-Public-Read-Models-And-Zero-Query-Hits.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-09
**Priority:** Critical
**Category:** Public Runtime / Cache / Performance / Security
**Estimated Effort:** Large
**Dependencies:** TASK-551-08-L03; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Replace the current pre-hit DB work with typed safe public read models and a
cache-first HTML path. Preserve TASK-517 gating and the one mandatory uncached
`getSecuritySettings` read before request security/rate middleware. A safely
eligible warm request executes exactly one total PostgreSQL query (security) and
zero domain/render/cache reads. Page/home, post, and content-entry detail/list
requests execute exactly two total queries (security plus one narrow point or
bounded membership/version gate) and zero additional reads on a warm hit.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-09.

## Exclusive Ownership

Sole writer of:

- existing `core/server/publicSite.tsx`;
- existing `core/site/cache/siteCache.ts` as a temporary compatibility facade
  over the new runtime (no independent value `Map` remains);
- new `core/server/publicSiteRenderer.tsx` for the cohesive split required to
  leave `publicSite.tsx` and the extracted module each below 1,000 lines;
- new `core/server/publicSiteCacheReadModels.ts`;
- new `core/server/publicSiteRenderDependencies.ts`;
- new `core/services/content/publicContentVisibilityGateRead.ts` for the sole
  page/post/content-entry point and bounded-list narrow indexed gate queries
  (never a body/password-hash loader);
- new `tests/vitest/site/public-site-cache-read-models.test.ts`;
- existing `tests/unit/site/cache.test.ts` for compatibility-facade adoption
  assertions;
- new `tests/integration/runtime/public-site-cache-query-budget.test.ts`;
- new `tests/integration/runtime/public-site-cache-eligibility.test.ts`.
- new `tests/integration/runtime/public-content-visibility-cache-gate.test.ts`.
- new `tests/integration/runtime/public-content-list-membership-cache-gate.test.ts`.
- terminal TASK-517 regression suites
  `tests/vitest/content/entry-visibility-gate.test.ts`,
  `tests/vitest/content/entry-unlock-token.test.ts`,
  `tests/integration/server/entry-access-password-hash.test.ts`,
  `tests/integration/runtime/entry-visibility-gate.test.ts`,
  `tests/integration/runtime/entry-password-gate.test.ts`, and
  `tests/integration/runtime/entry-visibility-cache.test.ts`, only for preserving
  their final visibility/unlock/access/password/cache assertions during adoption.
- existing dispatcher regressions `tests/unit/server/publicBookingApi.test.ts`,
  `tests/unit/server/publicFormsApi.test.ts`,
  `tests/integration/routes/bookingRoutes.test.ts`,
  `tests/integration/routes/forms.test.ts`,
  `tests/integration/server/formsWriteMounts.test.ts`,
  `tests/integration/routes/publicAnalytics.test.ts`, and
  `tests/security/analyticsBeacon.test.ts`, only for preserving the complete
  pre-cache API-surface dispatch and each handler-owned security flow.

Re-read post-TASK-493/TASK-517 bytes immediately before editing. Preserve the
sitemap/indexing additions plus all private/password prompt/body and
authenticated-list cache exclusions and their tests.
Forbidden: TASK-517 task/docs, domain mutation services owned by L02/L03,
settings security/Admin files, 07/08 code, TASK-493/511, migrations/packages and
shared docs/tasks.

## Read-Model and Render Contract

- Before cache-specific request normalization or any cache read, inspect only the
  bounded request method and parsed URL needed by the existing booking, Forms and
  analytics route dispatcher. Preserve that dispatch registration order exactly
  and classify each entire existing API surface, not only writes: every method and
  path under `/api/booking`, including `GET /api/booking/slots`; each exact
  `/forms/:id/submissions|uploads` surface regardless of method; and the analytics
  beacon path regardless of method. Those surfaces invoke their existing handlers
  before cache normalization, so booking slots retains its own `public_read`,
  session/API-key access evaluation and `slotsToken`; booking reservations and
  Forms retain their access/session/CSRF/rate/nonce/HMAC/CAPTCHA flow; analytics
  retains its DNT/rate/nonce behavior; and existing unsupported-method/path status,
  body and headers remain byte-compatible. Each dispatch performs exactly one
  uncached authoritative `getSecuritySettings` read. A Forms surface for which the
  current handler returns `null` continues through the existing authoritative
  method/not-found behavior, never HTML cache. Only an unmatched surviving
  GET/HEAD request is normalized for cache use; it then performs the
  same one `getSecuritySettings` read and applies current security/rate middleware.
  `SecuritySettings`, decrypted values, request-header policy and rate-limit
  policy never enter this snapshot, any cache envelope, Redis or process memory.
  Query-count assertions instrument the complete request, including this read.
- `PublicCacheRuntimeSnapshot` contains only normalized non-secret public cache
  TTL/policy, active theme/profile/routes identity, bounded content-route
  routing metadata and the generation inputs needed before DB dispatch. It is a
  strict family-owned read model loaded through the fixed positive
  `public-runtime` bootstrap policy; that policy is independent of the authored
  public HTML TTL. It excludes security/provider values, authored private bodies,
  rendered fragments and any field capable of authorizing content access.
- Obtain the already-started coordinator only as
  `getServerCacheRuntime().cache`, after 08-L03's composed lifecycle registration.
  L01 never constructs, starts, closes or substitutes a `ServerCache`, store,
  memory adapter or Redis client.
- Cache lookup order is: minimal method+URL whole booking/Forms/analytics API
  dispatch → reject/handle other non-GET/HEAD methods authoritatively → normalize
  only the unmatched surviving GET/HEAD
  path/query → perform the one authoritative security-settings DB read → request security/rate middleware →
  load the strict non-secret bootstrap snapshot → classify the dynamic route →
  run any required point/list gate → prove eligibility → read manifest/HTML →
  only on miss resolve authoritative DB models and render. The bootstrap is the
  only cached value permitted before classification/gating.
- `loadPublicCacheRuntimeBootstrap(cache, request)` returns either a strictly
  decoded snapshot plus the exact current routing-generation digest, or
  `{ state: "authoritative_bypass", reason }`. Then
  `classifyPublicCacheRoute(request, snapshot)` returns exactly
  `safe_non_mutable`, `mutable_content_detail`, `mutable_content_list`, or
  `authoritative_bypass`, together with the normalized identity/predicate needed
  by its branch. Missing/corrupt/expired bootstrap data, generation mismatch,
  unknown route kind, ambiguous overlap, stale classification evidence or an
  unbounded predicate returns `authoritative_bypass`. That branch performs no
  manifest/HTML/content value lookup and uses authoritative routing/DB. A
  bootstrap snapshot may cause a miss or bypass but never authorizes content or
  upgrades an ambiguous path to a lower query budget.
- Every page/home, post, and `content_entry` detail route is
  `mutable_content_detail` and performs exactly one family-specific narrow
  indexed gate before any manifest/HTML/content value read. The exact page
  projection is `id,status,publishedAt,hasPublishedData,updatedAt`, where
  `hasPublishedData` is derived in SQL and no document is selected. The exact
  post projection is `id,status,publishedAt,updatedAt`. The exact content-entry
  projection is `id,status,publishedAt,visibility,hasPassword,updatedAt`, where
  `hasPassword` is derived in SQL and the password hash is never selected. A page
  continues only for `status=published`, non-null `publishedAt`, and
  `hasPublishedData=true`; a post only for published/non-null publishedAt; an
  entry only for published/non-null publishedAt/public/password-free. Missing,
  unpublished, absent-current-representation, private/password or malformed
  rows fail closed. The lowercase SHA-256 digest of the strict discriminated
  projection joins canonical input, so raw identity never enters a key. The warm
  request is then exactly two total DB queries: security plus this gate.
- A `mutable_content_list` performs exactly one bounded family-specific indexed
  public-membership/version query from the normalized predicate and stable
  ordering. Page rows use the page projection above, post rows the post
  projection, and entry rows the entry projection. It returns at most validated
  page limit plus one ordered projections and never selects a body, document,
  password hash or unbounded relation. The lowercase SHA-256 digest of the strict
  ordered discriminated projection joins canonical input. Unknown/malformed
  results fail closed; unpublish, missing published representation, private/
  password transition, removal, membership/order or version change derives a
  different key and cannot return a primed item. A warm list is exactly two total
  DB queries: security plus this gate, with zero additional reads. Only routes
  proven structurally unable to contain mutable content use `safe_non_mutable`.
- Freeze every existing booking/Forms/analytics API dispatch, including GET and
  method-not-allowed cases, before any cache-specific normalization,
  bootstrap/cache read, or cache write. The minimal URL parser is dispatch-only
  and cannot construct a cache key or read a generation. Existing handlers retain
  their current route-registration order and exact access/session/API-key/CSRF/
  DNT/nonce/HMAC/CAPTCHA/token semantics plus exactly-once family-owned rate-limit
  behavior. Only an unmatched public GET/HEAD request can enter the HTML-cache
  branch.
- Mutable publication/visibility decisions are never cached, including
  affirmative decisions. Every page/home, post, or content-entry detail/list
  request repeats its one point or bounded membership DB gate before any
  manifest/HTML/content value read; this is the required public→unpublished/
  private/password fence.
- `PublicHtmlRenderResult` gains deduplicated exact dependency tags and retains
  `html`, `cacheable`, and cache mode. Dependencies include actual page/entry/
  post, list/content type, active profile/routes, shell/menu/footer, settings,
  SEO, redirect and form/list/detail configuration consumed, but map only to the
  finite L01 site/family tag union. Record ids/slugs/paths never create Redis
  generation keys.
- `PublicHtmlRenderDependencyAuditV1` recursively walks the final render input and
  proves every dynamic dependency is exactly `tagged`, `content_gated`, or
  `cache_excluded`. The exact v1 exclusions are `commerce_product_data`,
  `form_submission_nonce`, `booking_submission_nonce`, `booking_slots_token`,
  `analytics_beacon_nonce`, `request_scoped_token`, and
  `unknown_dynamic_dependency`. A non-empty exclusion set forces
  `cacheable=false`; no manifest or HTML conditional-write entry is constructed.
  Exclusion telemetry contains only the finite reason, never token/product data.
  This leaf does not edit `commerceService`; commerce blocks are deliberately
  no-fill in v1.
- Avoid a circular value-key dependency with a strict
  `PublicHtmlDependencyManifestV1`: a stable path/query/profile digest under the
  global site generation maps to the last rendered normalized tag set. On a
  warm read, load this bounded manifest first, read those generations, then
  derive the HTML value key. Missing/corrupt/expired manifest is a miss. A render
  publishes the HTML value plus manifest only through the typed public wrapper's
  `ServerCache.getOrLoad(request)` calls defined by 07-L01/L02. The consumer never
  creates a conditional write or invokes `writeIfGenerationsMatch`/
  `putIfGenerationsAndLeaseOwned`. `ServerCache` converts the loader's primary
  plus branded companion into both-or-neither publication: memory uses the
  internal generation-only write, while a distributed lease owner uses 08-L03's
  atomic generation-plus-lease write. More than L01's tag cap is never truncated:
  collapse the manifest to `site:all`, and every dependency-set/routing change
  bumps that generation.
- Export this exact immutable pre-loader fence for both manifest-primary and
  HTML-primary loads:

  ```ts
  const PUBLIC_HTML_FILL_FENCE_TAGS = [
    "site:all", "site:runtime", "site:html", "site:redirects", "site:shell",
    "site:pages", "site:entries", "site:posts", "site:listings", "site:forms",
    "site:settings", "site:themes",
  ] as const satisfies readonly CacheTag[];
  ```

  It deliberately excludes `settings:security`. `ServerCache` captures all these
  finite generations before running either loader, while each primary key still
  uses only its policy tags. No loader may add a dependency outside the captured
  fence; an unexpected/excluded dependency returns authoritative output with no
  manifest/HTML fill through L01's typed `no_fill` result.
- HTML key uses normalized path, L01 bounded query signature, policy/profile
  identity, mutable-content point or ordered-list membership/version digest when
  applicable, and generation digest. Configured public HTML TTL is an integer
  `0..600 s`. It is decoded from the independently cached fixed-policy runtime
  snapshot; zero bypasses before constructing any `public-html-manifest` or
  `public-html` policy and before reading generations or touching either store
  for those two families. It does not disable the fixed `public-runtime`
  bootstrap policy. Positive values normalize to L01 `PositiveCacheTtlMs`
  `1..600_000`. Filtered variants retain the current
  `min(configured, 30_000 ms)` cap.
- L01 owns this exact v1 table for L01-owned cached-read policies; later leaves
  must declare an equally exact table for any additional family they adopt and
  no caller invents a policy:

  | Family | schemaVersion | Positive TTL | maxValueBytes | Tags | negativeTtlMs | Eligibility | stalePolicy |
  |---|---:|---:|---:|---|---:|---|---|
  | `public-runtime` | `1` | fixed `30_000 ms` | `262_144` | `site:all`, `site:runtime`, `site:themes`, `site:settings`, `site:redirects` | `null` | strict non-secret public GET/HEAD bootstrap snapshot; excludes all `SecuritySettings`, header and rate-limit policy; independent of configured HTML TTL | `forbid` |
  | `public-html-manifest` | `1` | effective HTML TTL `1..600_000 ms` | `32_768` | `site:all` | `null` | strict current classification; required detail/list gate already public | `forbid` |
  | `public-html` | `1` | effective HTML TTL `1..600_000 ms` | `2_000_000` | exact manifest finite tags, collapsing over-cap to `site:all` | `null` | successful cacheable public response; strict classification and required detail/list gate already public | `forbid` |

  Encoded envelope plus UTF-8 key must still fit the normalized total entry cap.
  Manifest and HTML use the same configured effective policy ceiling, but L02
  independently samples each entry's shortening-only jitter, so one conditional
  publication may carry unequal actual TTLs. No server-cache policy may exceed
  `3_600_000 ms`.
- The compatibility `siteCache` exports delegate to generation invalidation and
  canonical helpers; they do not parse `|`, scan all entries or retain a second
  store. L02/L03 remove domain dependence on the facade.
- On miss, `ServerCache`'s eligibility-scope-bound fill-attempt registry encompasses
  snapshot-dependent render only for a strict branded proof whose digest covers
  the complete normalized public context. It stores no `Response`/`TResult`.
  The manifest-primary loader renders inside `getOrLoad`, returning the manifest
  as a positive cache value, the HTTP response as caller-only `returnValue`, and
  HTML as its one branded companion. On a manifest hit followed by an HTML miss, the
  nested HTML-primary `getOrLoad` renders and returns HTML as primary plus a
  refreshed manifest companion. Generation is rechecked before the one-or-two-
  entry fill; dependency change discards it. Both HTML loaders return only
  `fillKind:"positive"` or `kind:"no_fill"`; they never emit a negative fill.
  After rendering, commerce, any finite nonce/token exclusion, unknown dynamic
  dependency, non-cacheable status or failed audit returns the authoritative
  owner's response as `no_fill` before encoding either entry. `returnValue` is
  never cached or placed in the registry; every joiner of a `no_fill` or other
  non-published outcome renders independently and receives its own response. Only
  a successfully conditional-written positive primary lets joiners invoke their
  own `resolveCached`. Ineligible/missing-proof requests bypass the registry.
- Public generation propagation is bounded-eventual, not linearizable. Healthy
  polling/delivery targets come from 08. Locally visible outbox age above
  `5_000 ms` or store incoherence forces runtime value-cache bypass: skip Redis
  GET/manifest/HTML fill until 08-L03 proves recovery. Policy TTL is the hard
  ceiling only for an ambiguity not locally known as degraded. Admin preview
  and explicit read-after-write requests bypass until event observation.

## Implementation Pseudocode

```ts
async function handlePublicRequest(req) {
  const dispatchUrl = parseBoundedUrlForExistingPublicDispatch(req.url);
  const apiDispatch = classifyExistingPublicApiSurface(req.method, dispatchUrl);
  if (apiDispatch) {
    const security = await getSecuritySettings();
    return dispatchExistingPublicApiWithUnchangedSemantics({
      req,
      dispatchUrl,
      apiDispatch, // booking -> Forms -> analytics; whole surface, every method
      security,
    });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    const security = await getSecuritySettings();
    return handleExistingNonCacheMethod(req, dispatchUrl, security);
  }
  const request = normalizePublicCacheRequest(req); // surviving GET/HEAD only
  const security = await getSecuritySettings(); // one mandatory DB read
  const middlewareResponse = await enforcePublicReadSecurityAndRate(request, security);
  if (middlewareResponse) return middlewareResponse;
  const cache = getServerCacheRuntime().cache;
  const bootstrap = await loadPublicCacheRuntimeBootstrap(cache, request);
  if (bootstrap.state !== "ready") {
    return handleThroughAuthoritativeRoutingAndDb(request, bootstrap.reason);
  }
  const classification = classifyPublicCacheRoute(request, bootstrap.snapshot);
  if (classification.kind === "authoritative_bypass") {
    return handleThroughAuthoritativeRoutingAndDb(request, classification.reason);
  }
  const contentGate = classification.kind === "mutable_content_detail"
    ? await loadNarrowPublicContentPublicationVersion({
        family: classification.contentFamily,
        identity: classification.contentIdentity,
      })
    : classification.kind === "mutable_content_list"
      ? await loadBoundedPublicContentMembershipVersions({
          family: classification.contentFamily,
          predicate: classification.normalizedListPredicate,
          order: classification.stableListOrder,
          limit: classification.pageLimitPlusOne,
        })
      : null;
  if (classification.requiresContentGate && !contentGate?.isStrictlyPublishedPublic) {
    return handleThroughAuthoritativeRoutingAndDb(request, contentGate);
  }
  const keyInput = withPublicRouteProofs(request.keyInput, {
    routingGenerationDigest: bootstrap.routingGenerationDigest,
    classificationDigest: classification.digest,
    contentGateDigest: contentGate?.digest,
  });
  const snapshot = bootstrap.snapshot;
  if (snapshot.publicHtmlTtlMs === 0) {
    return renderPublicRequestWithoutHtmlCache(request, snapshot);
  }
  const eligibility = await resolvePublicCacheEligibility(
    request,
    snapshot,
    classification,
    contentGate,
  );
  if (!eligibility.cacheable) {
    return renderPublicRequestWithoutHtmlCache(request, snapshot);
  }
  // eligibility.context is complete and normalized; the L01 policy converts all
  // of it into the branded share-scope proof (never a bare boolean/identity).
  return publicHtmlCache(cache).getOrLoadResponse({
    keyInput,
    request,
    snapshot,
    eligibility,
    fillFenceTags: PUBLIC_HTML_FILL_FENCE_TAGS,
  });
}

async function getOrLoadResponse(input): Promise<Response> {
  return cache.getOrLoad({
    policy: publicHtmlManifestPolicy(input.snapshot),
    input: manifestKeyInput(input),
    context: input.eligibility.context,
    fillFenceTags: PUBLIC_HTML_FILL_FENCE_TAGS,
    resolveCached: (manifest) => loadHtmlFromManifest(input, manifest),
    loader: async ({ companion }) => {
      const rendered = await renderAndAuditEligiblePublicRequest(input);
      const publication = classifyManifestAndHtmlPublication(rendered, input);
      if (publication.kind === "no_fill") {
        return {
          kind: "no_fill",
          returnValue: buildHtmlResponse(rendered.html),
          reason: publication.reason,
        };
      }
      return {
        kind: "fill",
        fillKind: "positive",
        cacheValue: publication.manifest,
        returnValue: buildHtmlResponse(rendered.html),
        companion: companion({
          policy: policyForTags(publication.manifest.tags),
          input: htmlKeyInput(input, publication.manifest),
          context: input.eligibility.context,
          value: publication.html,
        }),
      };
    },
  });
}

async function loadHtmlFromManifest(input, manifest): Promise<Response> {
  return cache.getOrLoad({
    policy: policyForTags(manifest.tags),
    input: htmlKeyInput(input, manifest),
    context: input.eligibility.context,
    fillFenceTags: PUBLIC_HTML_FILL_FENCE_TAGS,
    resolveCached: async (html) => buildHtmlResponse(html),
    loader: async ({ companion }) => {
      const rendered = await renderAndAuditEligiblePublicRequest(input);
      const refreshed = classifyManifestAndHtmlPublication(rendered, input);
      if (refreshed.kind === "no_fill") {
        return {
          kind: "no_fill",
          returnValue: buildHtmlResponse(rendered.html),
          reason: refreshed.reason,
        };
      }
      return {
        kind: "fill",
        fillKind: "positive",
        cacheValue: refreshed.html,
        returnValue: buildHtmlResponse(rendered.html),
        companion: companion({
          policy: publicHtmlManifestPolicy(input.snapshot),
          input: manifestKeyInput(input),
          context: input.eligibility.context,
          value: refreshed.manifest,
        }),
      };
    },
  });
}
```

`classifyExistingPublicApiSurface` is a strict bounded path-family classifier,
not a security implementation: it returns booking for every `/api/booking...`
method/path, Forms for each structurally exact submission/upload surface even
when the method is unsupported, analytics for the beacon path at every method,
or `null`. The dispatcher calls the existing handlers in their current order and
preserves their response exactly; it does not duplicate their session, access,
rate, nonce, token, DNT or CAPTCHA decisions. A matched surface never falls into
`normalizePublicCacheRequest`, bootstrap, generation, manifest or HTML access.

`classifyManifestAndHtmlPublication` returns either a complete positive manifest/
HTML pair or `{ kind:"no_fill", reason }`. Any commerce product data/block, form
or booking submission nonce, booking `slotsToken`, analytics beacon nonce, other
request-scoped token or unknown dynamic dependency deterministically selects
`cache_excluded_dependency`; a non-cacheable response/status selects
`response_not_cacheable`. These are authoritative successful no-fill results,
not exceptions, and neither manifest nor HTML is encoded or published.

Cache timeout/corruption, bootstrap generation mismatch, stale/ambiguous route
classification or snapshot uncertainty calls the existing authoritative routing/
DB/render path before any manifest/HTML/content value lookup. Loader errors/5xx
are never cached. Preview/auth/unpublished/private/password, commerce-bearing,
nonce/token-bearing, unknown-dynamic-dependency or unknown-query output bypasses
write; excluded output creates neither manifest nor HTML envelope. A hit must be
byte-identical to the cold response and cannot skip the one authoritative
security-settings read or security/rate middleware.

## Security Contract

- **Visibility:** cache adoption is unmatched public GET/HEAD only; the complete
  existing booking, Forms and analytics API surfaces (including booking slots
  GET and every existing unsupported-method response) remain dispatched before
  it and no route registration changes.
- **Auth/RBAC:** TASK-517 visibility and authenticated-list rules are preserved;
  protected variants bypass before shared read/write. Every mutable page/home,
  post or content-entry detail/list request executes its point or bounded
  membership indexed DB gate before any manifest/HTML/content value. The
  bootstrap snapshot cannot authorize data.
- **CSRF/rate limits:** CSRF unchanged; every hit first performs exactly one
  authoritative security-settings read and executes current public-read security/
  rate middleware. No rate/header policy is cached in the bootstrap.
- **Validation:** strict bootstrap state/routing-generation/classification union,
  discriminated page/post/content-entry gate projections, render-dependency
  disposition, snapshot/dependency/query/path/status/TTL bounds.
- **Secrets/privacy:** snapshot/HTML key contains no security settings, cookie,
  unlock token, nonce, raw URL/query or PII.
- **Anti-abuse:** unknown/high-cardinality query input is non-cacheable; commerce-
  bearing output and every form/booking/analytics/request-scoped nonce or token
  are exact no-manifest/no-envelope-fill exclusions.

## Testing Requirements

Instrument real DB calls from TASK-551-02 across the complete request. Prove cold
render behavior and that the second safely eligible structurally non-mutable
request has byte parity and exactly one total PostgreSQL query: the uncached
security-settings read, with zero domain/render/cache reads. Page/home, post and
content-entry details execute exactly two total queries: security plus their one
narrow point gate. Every mutable-content list executes exactly two: security plus
one family-specific bounded membership/version query with `pageLimit + 1` as its
maximum and stable ordering. For 1/10/50 callers, each request reads security once
and gates once; when the cacheable positive fill is conditionally written,
rendering invokes exactly one render per process and every local joiner builds its
own response through `resolveCached` from the published primary. No shared
`Response`/`TResult` exists. In two spawned
Redis processes whose winner finishes inside the wait budget, prove exactly one
distributed render wins, both manifest/HTML entries publish atomically, waiters
resolve the correct HTML, and the losing process invokes neither generation-only
nor owned fill. Pin manifest-primary miss and manifest-hit/HTML-miss companion
directions, `returnValue` non-encoding, changed-generation both-or-neither discard,
and proof that no public facade calls a conditional-write primitive.

Pin every exact page/post/content-entry projection and digest. Prime detail/list
output, then cover page/post/entry published→draft/unpublish, page missing
published data, post/entry missing publishedAt, entry private/password, list
removal, membership change and reorder; the next request gates before HTML GET
and never returns the primed item. Unknown/missing/malformed gates fail closed.
Assert `PublicCacheRuntimeSnapshot` and all cache bytes contain no
`SecuritySettings`, decrypted value, rate-limit or header policy. Test `|`
paths, query allowlist/order, TTL 0/1/30/600 where zero still permits only the
fixed `public-runtime` bootstrap policy but invokes no manifest/HTML policy/store,
each exact policy row/max+1,
corrupt/oversize/outage/forced-bypass and recovery. Inject missing, corrupt,
expired, generation-mismatched and semantically stale bootstrap routing plus
ambiguous/overlapping dynamic routes; assert exact classification and that every
unprovable case reaches authoritative routing/DB with zero manifest/HTML/content
value reads. Prove a stale bootstrap can only miss/bypass and cannot serve a
primed unpublished/private/password body. Render commerce product gallery/table/
compare data, a form or booking submission nonce, booking `slotsToken`, analytics
beacon nonce, a synthetic request-scoped token and an unknown dynamic dependency;
assert each loader returns the typed finite `no_fill` branch (never throws or
returns a fill), creates zero manifest entries, zero HTML envelopes/store writes,
and emits zero secret/token telemetry bytes. Pin both positive loader directions
as `fillKind:"positive"` and prove no HTML loader can return `negative`. Pin the invariant that every discovered
dynamic dependency is tagged, content-gated, or exactly excluded. Also cover
preview, authenticated list, private/password locked/unlocked and generation-
changing fill plus atomic value/manifest publication. Preserve TASK-493 source
behavior for L02's exact backend-suite receipt and re-run the literal TASK-517
suites below unchanged.
For 1/10/50 same-key/full-share-scope requests with a successful positive write,
prove one render and per-caller `resolveCached`. For each commerce/nonce/token/
unknown `no_fill` case, run concurrent callers carrying distinct synthetic
response tokens and prove every caller renders once for itself and receives only
its own token. Repeat with distinct auth/preview/query/visibility-version contexts
and missing/forged eligibility proof; assert zero registry joins and no cross-
context response/error reuse. Generation-changed, lease-lost, timeout/unavailable/
closed and malformed shared outcomes likewise require one authoritative render
per waiting caller and zero shared `Response` values.
Exercise the entire booking, Forms and analytics surfaces through their real
registration: `GET /api/booking/slots`, booking reservation POST, unsupported
booking paths/methods, exact Forms submission/upload paths at supported and
unsupported methods, and analytics beacon at POST and method-not-allowed methods.
Prove each match happens before cache normalization/read while preserving status/
headers/body and nonce/HMAC/CAPTCHA/session/API-key/access/token/DNT/rate failures.
Specifically assert booking slots performs its one handler-owned `public_read`
charge and can never invoke cache request normalization, bootstrap, generation,
manifest, HTML read, render or fill spies.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/site/public-site-cache-read-models.test.ts \
  tests/vitest/content/entry-visibility-gate.test.ts \
  tests/vitest/content/entry-unlock-token.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/unit/site/cache.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/server/entry-access-password-hash.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l01 bun test \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
bun test tests/unit/server/publicBookingApi.test.ts \
  tests/unit/server/publicFormsApi.test.ts \
  tests/integration/routes/bookingRoutes.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/integration/routes/publicAnalytics.test.ts \
  tests/security/analyticsBeacon.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/server/publicSite.tsx core/server/publicSiteRenderer.tsx \
  core/server/publicSiteCacheReadModels.ts core/server/publicSiteRenderDependencies.ts \
  core/services/content/publicContentVisibilityGateRead.ts \
  core/site/cache/siteCache.ts \
  tests/unit/site/cache.test.ts \
  tests/vitest/site/public-site-cache-read-models.test.ts \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/vitest/content/entry-visibility-gate.test.ts \
  tests/vitest/content/entry-unlock-token.test.ts \
  tests/integration/server/entry-access-password-hash.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts \
  tests/unit/server/publicBookingApi.test.ts \
  tests/unit/server/publicFormsApi.test.ts \
  tests/integration/routes/bookingRoutes.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/integration/routes/publicAnalytics.test.ts \
  tests/security/analyticsBeacon.test.ts
```

## Documentation Updates Required

Both split production modules and all tests must be below 1,000 lines. Docs go
to 10-L02.
