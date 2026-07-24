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
bounded set-based dependency validator) and zero additional reads on a warm hit,
including nested `contentList`, `postsFeed`, and `entryTeaser` content.

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
- new `tests/integration/runtime/public-nested-content-cache-gate.test.ts`.
- terminal TASK-517 regression suites
  `tests/vitest/content/entry-visibility-gate.test.ts`,
  `tests/vitest/content/entry-unlock-token.test.ts`,
  `tests/integration/server/entry-access-password-hash.test.ts`,
  `tests/integration/runtime/entry-visibility-gate.test.ts`,
  `tests/integration/runtime/entry-password-gate.test.ts`, and
  `tests/integration/runtime/entry-visibility-cache.test.ts`, only for preserving
  their final visibility/unlock/access/password/cache assertions during adoption.
- existing dispatcher regressions `tests/unit/server/publicBookingApi.test.ts`,
  `tests/integration/routes/bookingRoutes.test.ts`,
  `tests/integration/routes/forms.test.ts`,
  `tests/integration/routes/publicAnalytics.test.ts`, and
  `tests/security/analyticsBeacon.test.ts`, only for preserving the complete
  pre-cache API-surface dispatch and each handler-owned security flow.
- delete legacy 2,038-line `tests/unit/server/publicFormsApi.test.ts` after
  moving shared builders/mocks only to
  `tests/unit/server/publicFormsApiTestFixtures.ts` and assertions exactly to
  `publicFormsApi-routing-errors.test.ts`,
  `publicFormsApi-public-access-rate.test.ts`,
  `publicFormsApi-internal-auth.test.ts`,
  `publicFormsApi-payload-descriptors.test.ts`, and
  `publicFormsApi-database.test.ts` in that directory;
- delete legacy 1,052-line
  `tests/integration/server/formsWriteMounts.test.ts` after moving DB setup/
  mount builders only to `formsWriteMountsTestFixtures.ts` and assertions exactly
  to `formsWriteMounts-routing.test.ts`,
  `formsWriteMounts-upload-errors.test.ts`, and
  `formsWriteMounts-auth-media.test.ts` in that directory.

Re-read post-TASK-493/TASK-517 bytes immediately before editing. Preserve the
sitemap/indexing additions plus all private/password prompt/body and
authenticated-list cache exclusions and their tests.
Forbidden: TASK-517 task/docs, domain mutation services owned by L02/L03,
settings security/Admin files, 07/08 code, TASK-493/511, migrations/packages and
shared docs/tasks.

The split is assertion-complete and cohesive: public routing/nonmatch/error
redaction belongs to `routing-errors`; public preparation/publication/sentinel/
rate identity to `public-access-rate`; cookie/session/API-key/RBAC/CSRF ordering
to `internal-auth`; multipart/body/descriptor limits to `payload-descriptors`;
and real-DB submission/nonce/bearer/payload mapping to `database`. Mount routing
owns root/stripped-admin executor parity, magic names, malformed targets and
wrapper selection; upload-errors owns descriptor/media/publication/unknown-error
parity; auth-media owns internal RBAC/audit and canonical `/media` fallback.
Fixture modules contain no `test(...)`; every suite imports only the fixture,
runs independently, and remains below 1,000 lines. Both legacy files must be
absent, not retained as aggregators, at leaf completion.

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
  load only the strict safe metadata manifest → run its one required set-based
  dependency validator → prove eligibility → read cached HTML →
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
- Every page/home, post, and `content_entry` detail/list route is mutable. Its
  safe metadata manifest names the root detail or bounded list proof plus every
  rendered nested page/post/entry discovered recursively from `contentList`,
  `postsFeed`, `entryTeaser`, template/slot composition, or another dynamic
  renderer. The projections are exact: page
  `id,status,publishedAt,hasPublishedData,updatedAt`; post
  `id,status,publishedAt,updatedAt`; entry
  `id,status,publishedAt,visibility,hasPassword,updatedAt`. Derived booleans are
  computed in SQL; bodies/documents/data and password hashes are never selected.
  Public requires published/non-null `publishedAt`, plus published page data or
  public/password-free entry as applicable.
- After reading that metadata manifest—but before any HTML/content value GET—run
  exactly one parameterized statement
  `validatePublicHtmlDependencies(manifest.validation)`. Bounded `VALUES`/CTEs
  perform all root membership and nested point checks set-wise by family and
  return one aggregate validation row. A list CTE retains its normalized
  predicate, stable unique order and `pageLimit + 1`; dependency point CTEs use
  primary keys. The statement compares exact counts, identities, ordering and
  projection digest to the manifest. Any missing/duplicate/changed/unpublished/
  private/password/malformed dependency returns `invalid`; DB error/timeout is
  stable internal `public_cache_dependency_validation_unavailable`. Both paths
  use authoritative render with `no_fill` and perform zero HTML GET/fill.
- Export exact caps: at most 128 dependency tuples, 128 UTF-8 bytes per UUID-like
  identity, 16,384 canonical validation bytes, list limit at most 100 plus one,
  and the existing 32,768-byte encoded manifest ceiling. Reject unknown fields,
  family mixing, duplicate identity, over-cap nesting, and digest mismatch before
  SQL/HTML. Sanitized EXPLAIN evidence must prove PK lookup for dependency arms
  and the existing/planned predicate+order index for each root list at small and
  large scale; an absent usable index blocks acceptance rather than permitting an
  unindexed growing-table validator. A valid warm mutable route is therefore
  exactly two total queries: security plus this one statement. Only output proven
  structurally unable to contain mutable content uses `safe_non_mutable` and one
  total security query.
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
  request reads only the bounded metadata manifest, then repeats its one set-
  based authoritative validator before any HTML/content value read; this is the
  required root-and-nested public→unpublished/private/password fence.
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
  global site generation maps to the last rendered normalized tag set plus the
  safe validation descriptor above. It contains no body/document/data, title,
  secret, hash, cookie, token, nonce, raw query, authorization decision, or
  rendered fragment. On a warm mutable read, load this bounded metadata first,
  validate every descriptor set-wise, then read generations and derive the HTML
  key. A true store miss means L01's exact loader trigger is `store_absent`; it
  runs the authoritative audited manifest-primary loader and may positive-fill
  the atomic manifest+HTML pair after the generation fence. A provider-TTL
  expiry that has already removed the key is necessarily an absence and may
  rebuild.
  A decoded cached manifest that is corrupt/expired/over-cap/invalid is evicted
  best-effort, arrives as coarse `store_value_rejected`, and renders
  authoritatively as `no_fill`, never permission to read cached HTML and never a
  same-request refill. Every `fill_disabled` trigger is likewise no-fill. A render
  publishes the HTML value plus manifest only through the typed public wrapper's
  `ServerCache.getOrLoad(request)` calls defined by 07-L01/L02. The consumer never
  creates a conditional write or invokes `writeIfGenerationsMatch`/
  `putIfGenerationsAndLeaseOwned`. `ServerCache` converts the loader's primary
  plus branded companion into both-or-neither publication: memory uses the
  internal generation-only write, while a distributed lease owner uses 08-L03's
  atomic generation-plus-lease write. More than L01's tag cap is never truncated:
  collapse the manifest to `site:all`, and every dependency-set/routing change
  bumps that generation.
- `public-html-manifest` is explicitly non-authorizing metadata. Its family-
  specific eligibility context always carries
  `mutableVisibilityGate: "not_required"`, including for mutable routes; a
  manifest proof/context is never reused for `public-html`. Reading or filling a
  manifest alone cannot authorize an HTML value GET, body-cache access, render
  publication, or access decision. For a mutable route, only
  `public-html` receives `mutableVisibilityGate:{state:"strictly_public",
  versionToken}` and only after this request's bounded current root+nested
  validator returns its valid digest. Safe non-mutable output alone may use the
  HTML family's `"not_required"` branch. Invalid/unavailable/missing validation
  reaches authoritative routing/render as `no_fill`; it cannot be bypassed by a
  manifest hit or a manifest-primary cold render.
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
  | `public-html-manifest` | `1` | effective HTML TTL `1..600_000 ms` | `32_768` | `site:all` | `null` | non-authorizing safe metadata only; family-specific `mutableVisibilityGate:"not_required"` is mandatory and can never substitute for HTML visibility proof | `forbid` |
  | `public-html` | `1` | effective HTML TTL `1..600_000 ms` | `2_000_000` | exact manifest finite tags, collapsing over-cap to `site:all` | `null` | safe non-mutable uses `"not_required"`; every mutable route requires this request's valid bounded root+nested receipt and `mutableVisibilityGate:{state:"strictly_public",versionToken}` before value GET/fill | `forbid` |

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
  const keyInput = withPublicRouteProofs(request.keyInput, {
    routingGenerationDigest: bootstrap.routingGenerationDigest,
    classificationDigest: classification.digest,
  });
  const snapshot = bootstrap.snapshot;
  if (snapshot.publicHtmlTtlMs === 0) {
    return renderPublicRequestWithoutHtmlCache(request, snapshot);
  }
  const manifestEligibility = resolveSafeMetadataManifestEligibility(
    request, snapshot, classification,
  );
  if (!manifestEligibility.cacheable ||
      manifestEligibility.context.mutableVisibilityGate !== "not_required") {
    return renderPublicRequestWithoutHtmlCache(request, snapshot);
  }
  return publicHtmlCache(cache).getOrLoadResponse({
    keyInput,
    request,
    snapshot,
    manifestEligibility,
    fillFenceTags: PUBLIC_HTML_FILL_FENCE_TAGS,
  });
}

async function getOrLoadResponse(input): Promise<Response> {
  return cache.getOrLoad({
    policy: publicHtmlManifestPolicy(input.snapshot),
    input: manifestKeyInput(input),
    context: input.manifestEligibility.context,
    fillFenceTags: PUBLIC_HTML_FILL_FENCE_TAGS,
    resolveCached: (manifest) => validateManifestThenLoadHtml(input, manifest),
    loader: async ({ companion, trigger }) => {
      const rendered = await renderAndAuditEligiblePublicRequest(input);
      if (trigger.kind !== "store_absent") {
        return {
          kind: "no_fill",
          returnValue: buildHtmlResponse(rendered.html),
          reason: "authoritative_only",
        };
      }
      const publication = await classifyAndValidateManifestAndHtmlPublication(
        rendered,
        input,
      );
      if (publication.kind === "no_fill") {
        return {
          kind: "no_fill",
          returnValue: buildHtmlResponse(rendered.html),
          reason: publication.reason,
        };
      }
      if (!sameManifestMetadataScope(
        publication.manifestEligibility,
        input.manifestEligibility,
      )) {
        return authoritativeNoFillResponse(rendered, "authoritative_only");
      }
      return {
        kind: "fill",
        fillKind: "positive",
        cacheValue: publication.manifest,
        returnValue: buildHtmlResponse(rendered.html),
        companion: companion({
          policy: policyForTags(publication.manifest.tags),
          input: htmlKeyInput(input, publication.manifest),
          context: publication.htmlEligibility.context,
          value: publication.html,
        }),
      };
    },
  });
}

const authoritativeNoFillResponse = (rendered, reason) => ({
  kind: "no_fill",
  returnValue: buildHtmlResponse(rendered.html),
  reason,
});

async function validateManifestThenLoadHtml(input, manifest): Promise<Response> {
  const validation = manifest.validation.kind === "not_required"
    ? { kind: "valid", digest: null }
    : await validatePublicHtmlDependencies(manifest.validation); // one SQL statement
  if (validation.kind !== "valid") {
    await bestEffortEvictManifestOnly(input, manifest);
    return renderPublicRequestAsNoFill(input, validation.stableCode);
  }
  const htmlEligibility = resolveValidatedHtmlEligibility(
    input,
    manifest,
    validation.digest,
  );
  if (!htmlEligibility.cacheable ||
      (manifest.validation.kind !== "not_required" &&
       htmlEligibility.context.mutableVisibilityGate === "not_required")) {
    return renderPublicRequestAsNoFill(input);
  }
  return cache.getOrLoad({
    policy: policyForTags(manifest.tags),
    input: htmlKeyInput(input, manifest),
    context: htmlEligibility.context,
    fillFenceTags: PUBLIC_HTML_FILL_FENCE_TAGS,
    resolveCached: async (html) => buildHtmlResponse(html),
    loader: async ({ companion, trigger }) => {
      const rendered = await renderAndAuditEligiblePublicRequest(input);
      if (trigger.kind !== "store_absent") {
        return {
          kind: "no_fill",
          returnValue: buildHtmlResponse(rendered.html),
          reason: "authoritative_only",
        };
      }
      const refreshed = await classifyAndValidateManifestAndHtmlPublication(
        rendered,
        input,
      );
      if (refreshed.kind === "no_fill") {
        return {
          kind: "no_fill",
          returnValue: buildHtmlResponse(rendered.html),
          reason: refreshed.reason,
        };
      }
      if (!sameValidatedHtmlPublicationScope(
        refreshed.htmlEligibility,
        htmlEligibility,
      )) {
        return authoritativeNoFillResponse(rendered, "authoritative_only");
      }
      return {
        kind: "fill",
        fillKind: "positive",
        cacheValue: refreshed.html,
        returnValue: buildHtmlResponse(rendered.html),
        companion: companion({
          policy: publicHtmlManifestPolicy(input.snapshot),
          input: manifestKeyInput(input),
          context: refreshed.manifestEligibility.context,
          value: refreshed.manifest,
        }),
      };
    },
  });
}

async function classifyAndValidateManifestAndHtmlPublication(rendered, input) {
  const candidate = classifyManifestAndHtmlPublication(rendered, input);
  if (candidate.kind === "no_fill") return candidate;
  const manifestEligibility = resolveRefreshedManifestEligibility(
    input,
    candidate.manifest,
  );
  if (!manifestEligibility.cacheable ||
      manifestEligibility.context.mutableVisibilityGate !== "not_required") {
    return { kind: "no_fill", reason: "authoritative_only" };
  }
  const validation = candidate.manifest.validation.kind === "not_required"
    ? { kind: "valid", digest: null }
    : await validatePublicHtmlDependencies(candidate.manifest.validation);
  if (validation.kind !== "valid") {
    return { kind: "no_fill", reason: "authoritative_only" };
  }
  const htmlEligibility = resolveValidatedHtmlEligibility(
    input,
    candidate.manifest,
    validation.digest,
  );
  if (!htmlEligibility.cacheable ||
      (candidate.manifest.validation.kind !== "not_required" &&
       htmlEligibility.context.mutableVisibilityGate === "not_required")) {
    return { kind: "no_fill", reason: "authoritative_only" };
  }
  return { ...candidate, manifestEligibility, htmlEligibility };
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

`classifyManifestAndHtmlPublication` produces only the audited candidate;
`classifyAndValidateManifestAndHtmlPublication` returns a complete positive
manifest/HTML pair plus two distinct eligibility results, or
`{ kind:"no_fill", reason }`. Its manifest result is always the non-authorizing
`"not_required"` context. Its mutable HTML result exists only after the fresh
validator receipt and is `strictly_public`; it also rejects a refreshed
manifest/key/scope that differs from the captured request.
`sameManifestMetadataScope` and `sameValidatedHtmlPublicationScope` compare every
normalized eligibility field plus the captured manifest/HTML key-input digest;
they are not mutable-gate-only comparisons. Any commerce product data/block, form
or booking submission nonce, booking `slotsToken`, analytics beacon nonce, other
request-scoped token or unknown dynamic dependency deterministically selects
`cache_excluded_dependency`; a non-cacheable response/status selects
`response_not_cacheable`. These are authoritative successful no-fill results,
not exceptions, and neither manifest nor HTML is encoded or published.
`validatePublicHtmlDependencies` is the only mutable cache-path domain gate. It
accepts only the decoded bounded metadata descriptor, executes one set-based
statement, and returns a strict `valid|invalid|unavailable` union with a digest;
it never returns content. `invalid|unavailable`, cap failure, or a manifest with
an omitted nested dependency evicts metadata best-effort and renders
authoritatively as `no_fill`, with zero cached HTML read/publication.

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
  post or content-entry detail/list request decodes only safe manifest metadata,
  then executes one bounded indexed set-based root+nested validator before any
  HTML/content value. The bootstrap/manifest cannot authorize data.
- **CSRF/rate limits:** CSRF unchanged; every hit first performs exactly one
  authoritative security-settings read and executes current public-read security/
  rate middleware. No rate/header policy is cached in the bootstrap.
- **Validation:** strict bootstrap state/routing-generation/classification union,
  discriminated page/post/content-entry dependency projections, exact counts/
  ordering/digest, 128-item/16,384-byte validator caps, render-dependency
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
content-entry detail/list hits execute exactly two total queries: security plus
one set-based root+nested dependency validator; lists retain `pageLimit + 1` and
stable ordering inside that statement. For 1/10/50 callers, each request reads
security once and validates once; when the cacheable positive fill is conditionally written,
rendering invokes exactly one render per process and every local joiner builds its
own response through `resolveCached` from the published primary. No shared
`Response`/`TResult` exists. In two spawned
Redis processes whose winner finishes inside the wait budget, prove exactly one
distributed render wins, both manifest/HTML entries publish atomically, waiters
resolve the correct HTML, and the losing process invokes neither generation-only
nor owned fill. Pin manifest-primary miss and manifest-hit/HTML-miss companion
directions, `returnValue` non-encoding, changed-generation both-or-neither discard,
and proof that no public facade calls a conditional-write primitive.
For both manifest-primary and HTML-primary paths, distinguish loader triggers:
backend null/`store_absent` plus valid audited render may publish, while returned
expired/wrong-generation/oversized/invalid bytes are evicted and produce an
authoritative `no_fill` with zero same-request refill. Provider-expired keys
already absent follow the true-miss case. Every fill-disabled trigger is also
no-fill. Pin memory and Redis behavior and prove no raw rejected bytes/reason
detail reaches response, logs or telemetry.
Pin the family-specific mutable gate: every manifest request and refreshed
manifest companion carries exactly `mutableVisibilityGate:"not_required"`, while
every mutable HTML request/companion carries `strictly_public` with the current
root+nested validator digest. A `not_required` manifest context must never be
reused as HTML eligibility. With ordered spies, prove a manifest hit/miss alone
cannot authorize access, no HTML value GET/body-cache access or primary/companion
publication occurs before the current validator succeeds, and invalid/unavailable
validation cannot be bypassed by a manifest hit or cold render. On the HTML-
primary direction, assert the companion receives the distinct refreshed manifest
context—not `htmlEligibility.context`. Return a valid positive candidate under
every rejected/fill-disabled trigger and prove neither manifest nor HTML fills;
only `store_absent` may publish either positive direction.

Pin every exact page/post/content-entry projection and digest. Render nested
`contentList`, `postsFeed`, `entryTeaser`, template and slot combinations across
all three families, assert the complete deduplicated metadata descriptor, and
prove one validator statement for 1/128 dependencies. At 129 dependencies,
16,385 canonical bytes, duplicate/unknown family, malformed identity/digest, DB
timeout or missing usable plan index, assert authoritative typed `no_fill`, zero
HTML GET/fill and redacted errors. Prime detail/list output, then cover page/post/entry published→draft/unpublish, page missing
published data, post/entry missing publishedAt, entry private/password, list
removal, membership change and reorder; the next request gates before HTML GET
and never returns the primed item. Unknown/missing/malformed validation fails closed.
Delay generation/outbox delivery, mutate only a nested dependency from public to
draft/private/password, and prove the next request reads safe metadata, validates,
and never reads/returns primed HTML. Repeat root/nested removal/version change in
memory and two-process Redis lanes.
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
Run every named replacement alone and together; source guards prove assertion
group ownership, fixture files contain zero tests, legacy paths are absent, the
default Bun lane discovers every replacement, and `wc -l` is `<=1,000` for all
fixtures/suites.

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
  tests/integration/runtime/public-nested-content-cache-gate.test.ts \
  tests/integration/server/entry-access-password-hash.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l01 bun test \
  tests/integration/runtime/public-site-cache-query-budget.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-content-visibility-cache-gate.test.ts \
  tests/integration/runtime/public-content-list-membership-cache-gate.test.ts \
  tests/integration/runtime/public-nested-content-cache-gate.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
bun test tests/unit/server/publicBookingApi.test.ts \
  tests/unit/server/publicFormsApi-routing-errors.test.ts \
  tests/unit/server/publicFormsApi-public-access-rate.test.ts \
  tests/unit/server/publicFormsApi-internal-auth.test.ts \
  tests/unit/server/publicFormsApi-payload-descriptors.test.ts \
  tests/unit/server/publicFormsApi-database.test.ts \
  tests/integration/routes/bookingRoutes.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMounts-routing.test.ts \
  tests/integration/server/formsWriteMounts-upload-errors.test.ts \
  tests/integration/server/formsWriteMounts-auth-media.test.ts \
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
  tests/integration/runtime/public-nested-content-cache-gate.test.ts \
  tests/vitest/content/entry-visibility-gate.test.ts \
  tests/vitest/content/entry-unlock-token.test.ts \
  tests/integration/server/entry-access-password-hash.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts \
  tests/unit/server/publicBookingApi.test.ts \
  tests/unit/server/publicFormsApiTestFixtures.ts \
  tests/unit/server/publicFormsApi-*.test.ts \
  tests/integration/routes/bookingRoutes.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMountsTestFixtures.ts \
  tests/integration/server/formsWriteMounts-*.test.ts \
  tests/integration/routes/publicAnalytics.test.ts \
  tests/security/analyticsBeacon.test.ts
```

## Documentation Updates Required

Both split production modules and all tests must be below 1,000 lines. Docs go
to 10-L02.
