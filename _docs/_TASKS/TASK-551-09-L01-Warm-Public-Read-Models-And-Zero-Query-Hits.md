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
cache-first HTML path. Preserve TASK-517 gating and make the second eligible
non-visibility-gated request execute exactly zero PostgreSQL queries. Mutable-
visibility generic entry routes execute one mandatory narrow gate query and zero
additional queries on a warm public hit.

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
- new `core/services/content/publicEntryVisibilityGateRead.ts` for the sole
  narrow indexed gate query (never a body/password-hash loader);
- new `tests/vitest/site/public-site-cache-read-models.test.ts`;
- new `tests/integration/runtime/public-site-zero-query-cache.test.ts`;
- new `tests/integration/runtime/public-site-cache-eligibility.test.ts`.
- new `tests/integration/runtime/public-entry-visibility-cache-gate.test.ts`.

Re-read post-TASK-493/TASK-517 bytes immediately before editing. Preserve the
sitemap/indexing additions plus all private/password prompt/body and
authenticated-list cache exclusions and their tests.
Forbidden: TASK-517 task/docs, domain mutation services owned by L02/L03,
settings security/Admin files, 07/08 code, TASK-493/511, migrations/packages and
shared docs/tasks.

## Read-Model and Render Contract

- `PublicCacheRuntimeSnapshot` contains only normalized non-secret public cache
  TTL/policy, active theme/profile/routes identity, bounded content-route
  routing metadata and the generation inputs needed before DB dispatch. It is a
  strict family-owned read model loaded through `ServerCache`; it excludes
  security/provider values and authored private bodies.
- Cache lookup order for safely non-visibility-gated routes is: normalize
  request/path/query → request security/rate middleware → resolve strict safe
  snapshot from cache → prove eligibility → read HTML → only on miss resolve
  DB models and render.
- A generic `content_entries` route whose visibility can change to
  private/password is classified without consuming a public cached value, then
  performs exactly one narrow indexed DB gate selecting only entry id,
  visibility, derived `hasPassword` boolean, and the authoritative
  `updated_at` visibility-version value. Unknown/missing/malformed rows fail
  closed. Only `visibility="public" && hasPassword=false` may continue to
  snapshot/manifest/HTML lookup, with the gate's version token included in
  canonical input; the token is lowercase SHA-256 over the strict
  id/visibility/hasPassword/updated-at projection, so raw identity never enters
  a key. It then executes zero additional DB queries on a warm hit.
  Private/password/unlocked/authenticated variants bypass every shared value and
  use TASK-517's authoritative flow. If route classification cannot identify
  the narrow indexed gate without cached state, bypass shared cache entirely.
- Freeze every existing non-GET/HEAD dispatch before any cache normalization,
  read or write. Booking, Forms and analytics public-write handlers retain their
  current route-registration order, access evaluator, nonce/HMAC/CAPTCHA and
  exactly-once `public_write` rate-limit behavior. Only existing public GET/HEAD
  requests can enter the HTML-cache branch.
- Mutable entry visibility decisions are never cached, including affirmative
  decisions. Every such request repeats the one narrow DB gate before any
  public value-cache read; this is the required public→private/password fence.
- `PublicHtmlRenderResult` gains deduplicated exact dependency tags and retains
  `html`, `cacheable`, and cache mode. Dependencies include actual page/entry/
  post, list/content type, active profile/routes, shell/menu/footer, settings,
  SEO, redirect and form/list/detail configuration consumed, but map only to the
  finite L01 site/family tag union. Record ids/slugs/paths never create Redis
  generation keys.
- Avoid a circular value-key dependency with a strict
  `PublicHtmlDependencyManifestV1`: a stable path/query/profile digest under the
  global site generation maps to the last rendered normalized tag set. On a
  warm read, load this bounded manifest first, read those generations, then
  derive the HTML value key. Missing/corrupt/expired manifest is a miss. A render
  publishes the HTML value plus manifest through the exact
  `ServerCache.writeIfGenerationsMatch` handoff defined by 07-L01/L02 and
  implemented atomically for Redis by 08-L01; it writes both or neither after
  comparing all generations. More than L01's tag cap is never truncated:
  collapse the manifest to `site:all`, and every dependency-set/routing change
  bumps that generation.
- HTML key uses normalized path, L01 bounded query signature, policy/profile
  identity, mutable-entry visibility-version when applicable, and generation
  digest. Configured public HTML TTL is an integer `0..600 s`: zero disables and
  bypasses before constructing any `CachePolicy` or touching cache state;
  positive values normalize to L01 `PositiveCacheTtlMs` `1..600_000`. Filtered
  variants retain the current `min(configured, 30_000 ms)` cap.
- L01 owns this exact v1 cached-read policy table; no caller invents a policy:

  | Family | schemaVersion | Positive TTL | maxValueBytes | Tags | negativeTtlMs | Eligibility | stalePolicy |
  |---|---:|---:|---:|---|---:|---|---|
  | `public-runtime` | `1` | `30_000 ms` | `262_144` | `site:all` | `null` | strict non-secret public GET/HEAD snapshot | `forbid` |
  | `public-html-manifest` | `1` | effective HTML TTL `1..600_000 ms` | `32_768` | `site:all` | `null` | strict eligible request; entry gate already public | `forbid` |
  | `public-html` | `1` | effective HTML TTL `1..600_000 ms` | `2_000_000` | exact manifest finite tags, collapsing over-cap to `site:all` | `10_000 ms` only for an explicitly proven public not-found; otherwise `null` | successful cacheable public response; entry gate already public | `forbid` |

  Encoded envelope plus UTF-8 key must still fit the normalized total entry cap.
  Manifest and HTML use the same effective TTL in one conditional publication.
  No server-cache policy may exceed `3_600_000 ms`.
- The compatibility `siteCache` exports delegate to generation invalidation and
  canonical helpers; they do not parse `|`, scan all entries or retain a second
  store. L02/L03 remove domain dependence on the facade.
- On miss, `ServerCache` single-flight encompasses snapshot-dependent render.
  Generation is rechecked before fill; dependency change discards the write.
- Public generation propagation is bounded-eventual, not linearizable. Healthy
  polling/delivery targets come from 08. Locally visible outbox age above
  `5_000 ms` or store incoherence forces runtime value-cache bypass: skip Redis
  GET/manifest/HTML fill until 08-L03 proves recovery. Policy TTL is the hard
  ceiling only for an ambiguity not locally known as degraded. Admin preview
  and explicit read-after-write requests bypass until event observation.

## Implementation Pseudocode

```ts
async function handlePublicRequest(req) {
  const request = normalizePublicCacheRequest(req);
  const visibility = request.isMutableEntryRoute
    ? await loadNarrowPublicEntryVisibilityVersion(request.entryIdentity)
    : null;
  if (request.isMutableEntryRoute && !visibility?.isStrictlyPublic) {
    return handleThroughTask517WithoutSharedCache(request, visibility);
  }
  const keyInput = withVisibilityVersion(request.keyInput, visibility?.version);
  const snapshot = await getPublicCacheRuntimeSnapshot(request);
  const eligibility = await resolvePublicCacheEligibility(request, snapshot);
  if (eligibility.cacheable) {
    const manifest = await publicHtmlCache.getDependencyManifest(keyInput);
    const hit = manifest && await publicHtmlCache.get(
      policyForTags(manifest.tags), keyInput
    );
    if (hit) return buildHtmlResponse(hit.html);
  }
  const result = await renderPublicRequestOnMiss(request, snapshot);
  if (eligibility.cacheable && result.cacheable) {
    const input: CacheConditionalWrite | null =
      await buildPublicHtmlConditionalWrite(keyInput, result);
    if (input) await publicHtmlCache.writeIfGenerationsMatch(input);
  }
  return buildHtmlResponse(result.html);
}
```

Cache timeout/corruption/snapshot uncertainty calls the existing DB/render path.
Loader errors/5xx are never cached. Preview/auth/private/password/nonce-bearing
or unknown query requests bypass read and write. A hit must be byte-identical to
the cold response and cannot skip security/rate middleware.

## Security Contract

- **Visibility:** cache adoption is existing public GET/HEAD only; existing
  booking, Forms and analytics public writes remain dispatched before it and no
  route registration changes.
- **Auth/RBAC:** TASK-517 visibility and authenticated-list rules are preserved;
  protected variants bypass before shared read/write. Mutable-entry public
  requests always execute the narrow indexed DB gate before any shared value.
- **CSRF/rate limits:** CSRF unchanged; public-read limit/security middleware
  still executes on cache hits.
- **Validation:** strict snapshot/dependency/query/path/status/TTL bounds.
- **Secrets/privacy:** snapshot/HTML key contains no security settings, cookie,
  unlock token, nonce, raw URL/query or PII.
- **Anti-abuse:** unknown/high-cardinality query input is non-cacheable; nonce
  forms remain excluded.

## Testing Requirements

Instrument real DB calls from TASK-551-02. Prove cold render behavior and a
second safely eligible homepage/page/list request has byte parity and exactly
zero PostgreSQL queries. A generic public entry must execute exactly one narrow
indexed visibility/version query and zero additional DB queries on the warm
hit; 1/10/50 such callers each gate once while cacheable miss rendering remains
single-flight. Prime a public entry, mutate it to private and password, and prove
the next request gates before any value GET and never returns the primed body;
unknown/missing gates fail closed. Test `|` paths, query allowlist/order, TTL
0/1/30/600 where zero invokes no policy/store, each exact policy row/max+1,
corrupt/oversize/outage/forced-bypass and recovery,
preview, authenticated list, private/password locked/unlocked, nonce form and
generation-changing fill plus atomic value/manifest publication. Re-run all
TASK-493 sitemap/current-SEO and TASK-517 runtime tests unchanged. Exercise
non-GET/HEAD booking, Forms and analytics routes through their real registration
and prove cache refactoring preserves nonce/HMAC/CAPTCHA/access-evaluator and
rate-limit failures.

```bash
set -a && source .env && set +a
bun run test:vitest -- tests/vitest/site/public-site-cache-read-models.test.ts
SERVER_CACHE_BACKEND=memory bun test \
  tests/integration/runtime/public-site-zero-query-cache.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-entry-visibility-cache-gate.test.ts \
  tests/integration/runtime/entry-visibility-cache.test.ts \
  tests/integration/runtime/entry-visibility-gate.test.ts \
  tests/integration/runtime/entry-password-gate.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-09-l01 bun test \
  tests/integration/runtime/public-site-zero-query-cache.test.ts \
  tests/integration/runtime/public-site-cache-eligibility.test.ts \
  tests/integration/runtime/public-entry-visibility-cache-gate.test.ts
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
  core/services/content/publicEntryVisibilityGateRead.ts \
  core/site/cache/siteCache.ts \
  tests/vitest/site/public-site-cache-read-models.test.ts \
  tests/integration/runtime/public-site-*.test.ts
```

## Documentation Updates Required

Both split production modules and all tests must be below 1,000 lines. Docs go
to 10-L02.
