# TASK-548-04-L02: Versioned Static Routes, Deep Links and SEO
# FileName: TASK-548-04-L02-Versioned-Static-Routes-Deep-Links-And-SEO.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-04
**Priority:** High
**Category:** Static Generation / Versioning / SEO
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-03-L02 and TASK-548-04-L01; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Turn the L01 portal shell into a deterministic, base-path-safe static site for
all public bundle routes. Generate canonical versioned documents, derived
`latest` aliases, search indexes, SEO/structured-data artifacts, sitemap,
robots, content hashes, host-neutral header/redirect metadata, and the exact
top-level Cloudflare Pages `_headers` plus `404.html` deployment bytes.

Hosting/upload/release integrity is TASK-548-05. This leaf produces immutable
bytes and prebuilt mutable candidates that release automation can verify and
copy without reconstructing the route graph or rendering article HTML.
Every route renders article/navigation/TOC statically from the same server-side
projection. Only header/search/theme/mobile-navigation islands receive the
L01-owned canonical, domain-separated-hash-bound hydration payload; no branded
projection or full document is serialized.

## Exclusive Ownership

This leaf is the only writer for:

- `packages/docs-portal/src/build/**`;
- exact frozen-manifest entry
  `packages/docs-portal/src/build/buildDocsPortal.ts` (never `.tsx`);
- `packages/docs-portal/src/routes/**`;
- `packages/docs-portal/src/seo/**`;
- new `tests/vitest/docs-portal/portal-routes.test.ts`;
- new `tests/vitest/docs-portal/portal-build.test.tsx`;
- new `tests/vitest/docs-portal/portal-seo.test.ts`.

It must not edit L01 shell/search/package/root/lock files, L03 validator/tests,
TASK-548-05 workflows, or `packages/docs-renderer`.

Canonical public path/href construction is imported from
`packages/docs-renderer`; this leaf must not redefine it:

```ts
import {
  buildDocsPublicHref,
  buildDocsPublicPath,
  buildDocsSearchIndexV1,
} from "@coderso/docs-renderer";
import {
  createDocsPublicationProjectionV1,
  type DocsPublicationProjectionV1,
} from "@coderso/docs-renderer/projection";
import {
  projectDocsClientSearchRankingV1,
} from "@coderso/docs-renderer/client-search";
import {
  renderDocsPortalStaticShell,
} from "../app/DocsPortalStaticShell";
import {
  createDocsPortalHydrationPayloadV1,
} from "../app/docsPortalHydrationPayloadV1";
import {
  loadPackagedDocsDistributionBundleV2,
} from "../../../../core/services/documentation/packagedDocsDistributionBundleV2";

// packages/docs-portal/src/routes/docsPortalOutput.ts
resolveDocsPortalArtifactRelativePath(publicPath: string): string;

// packages/docs-portal/src/build/buildDocsPortal.ts
// Imported from TASK-548-01 owners; never reimplemented here.
assertNoDocsWorkspaceArtifactPromotionHazardsV1(): Promise<
  DocsWorkspaceArtifactStablePrestateV1
>;
loadPackagedDocsDistributionBundleV2(): Promise<DocsDistributionBundleV2>;
type DocsPortalBuildConfigV1 = {
  currentVersion: string;
  publicOrigin: string;
  publicBasePath: string;
  sourceDateEpoch: number;
};
readDocsPortalBuildConfigV1FromEnvironment(
  environment: Record<string, string | undefined>
): DocsPortalBuildConfigV1;
buildDocsPortal(
  input: DocsPortalBuildConfigV1
): Promise<DocsPortalBuildReceipt>;
```

`createDocsPublicationProjectionV1()` and
`buildDocsSearchIndexV1()` are the exact TASK-548-03-L02 owners. L02 calls each
exactly once per build with literal `public-docs`; the constructor alone
normalizes the complete hostile bundle, filters already-normalized records and
proves full target link/evidence/reference closure. Its distinct private-
branded shape retains the original full-corpus `sourceHash` and never
masquerades as `DocsDistributionBundleV2`.

The route graph, search emitters and every static route reuse that same
projection and search-index object. Routes carry only exact
`DocsPublicationDocumentKeyV1` keys; shared member resolution verifies them
without a per-route projection/brand/document normalizer. L02 defines no local
bundle, document, target, selection or projection assertion. The projection
subpath is build-only: Vite/client static guards reject it, full document
records and `DocsDocumentRenderer` from every hydration entry.

`emitVerifiedPortalVisualAssetsV1()` is build-only and runs once over the
already normalized full bundle plus branded projection. Without another schema
normalizer it joins each selected opaque `outputKey` to its full-source
`assetPath`, opens bounded PNG bytes no-follow, verifies ownership/hash, writes
one content-addressed staged asset and returns only a deeply frozen per-document
`DocsLocalVisualAssetV1[]` (`outputKey`, same-origin `href`, `mediaType`,
`sha256`). Each key is exactly
`docs-png-sha256-<lowercase 64-hex sha256>`. Static shell/render calls receive that safe array as
`emittedVisualAssets`; source/output paths and bytes never cross the boundary.

Locked output root is `packages/docs-portal/dist`.

The build entry accepts only strict non-artifact configuration, never artifact
paths, a preloaded bundle/report object, or bytes. It first calls the exact
TASK-548-01-L02 read-only hazard inspector, then the TASK-548-01-L03 strict
cwd-independent zero-argument `loadPackagedDocsDistributionBundleV2()` import.
L02 contains no bundle path constant/read/parse/normalizer or cwd-derived
fallback. A caller cannot bypass, replace, or reorder this boundary. The
ignored migration report is never opened or required.
The targeted gate runs read-only `docs:check` immediately before the portal
build so canonical bundle bytes and `sourceHash` are recomputed and compared.
The portal never invokes recovery or treats `docs:check` as a recovery command.

The executable entry reads exactly these configuration mappings:

| Environment variable | `DocsPortalBuildConfigV1` field |
|---|---|
| `DOCS_PRODUCT_VERSION` | `currentVersion` |
| `DOCS_PUBLIC_ORIGIN` | `publicOrigin` |
| `DOCS_PUBLIC_BASE_PATH` | `publicBasePath` |
| `SOURCE_DATE_EPOCH` | `sourceDateEpoch` |

All four are required. There is no alternate name, default, wall-clock value,
or command-line override. `SOURCE_DATE_EPOCH` is canonical unsigned decimal
for a bounded non-negative safe integer; whitespace, sign, fraction, exponent,
or normalization-only input rejects. Unrelated operating-system environment
keys are not copied into the build config. Local and reproducibility runs use
exactly `0.0.0-test`, `https://docs.example.invalid`, `/docs`, and `0`.
Release uses the exact semantic-release version, normalized configured origin
and base path, and the target commit epoch.

## First Complete Workspace and Image Gate

This leaf lands after TASK-548-03-L02 has created and activated
`@coderso/docs-renderer`, and after TASK-548-04-L01 has created the portal
shell plus TypeScript/Vite configuration. It is therefore the first land point
at which both the exact portal build entrypoint and the complete Docker
workspace can be executed. The targeted gate must:

1. run the manifest-owned portal build with exactly
   `DOCS_PRODUCT_VERSION=0.0.0-test`,
   `DOCS_PUBLIC_ORIGIN=https://docs.example.invalid`,
   `DOCS_PUBLIC_BASE_PATH=/docs`, and `SOURCE_DATE_EPOCH=0`, then repeat it and
   prove full page plus Vite JS/CSS/asset/receipt byte identity;
2. build the existing TASK-548-02-L03-owned Dockerfile and thereby execute its
   frozen workspace install plus existing Admin and site builds;
3. run the resulting image with its entrypoint overridden, resolve
   `@coderso/docs-renderer` from core, assert the required renderer/target
   selector exports, parse the packaged
   `/app/core/generated/docs/coderso-docs-v2.json` as
   `coderso.docs-corpus@v2`, and prove the Admin/site build outputs exist; and
4. normalize Admin `coderso.docs-help-assets@v1` through the exact 03-L02
   owner, require only byte/path-free `{ outputKey, href, mediaType, sha256 }`
   records, and verify source/hash/file closure against emitted PNGs using
   build-only `core/admin/ui/help/helpBuildAssetVerification.ts` owner and call
   `resolveEmbeddedHelpBuildAssetFileV1({ clientRoot, outputKey, href })`, which
   returns only `Readonly<{ bytes: Uint8Array; sha256: string }>` after a
   bounded `O_NOFOLLOW` open, pre/post-read `fstat` identity check and same-
   handle read. It rejects non-same-origin/non-asset hrefs, traversal, symlinks,
   output-key/href drift and any mapping outside the exact client root; no path
   is returned, reopened, serialized or logged. Then inspect for forbidden `.tmp`,
   promotion journal,
   member-temp, staged, or backup artifacts.

This is a read-only downstream validation of `Dockerfile`, the workspace
manifests, root lockfile, and core dependency. L02 does not edit those files
and does not own a Docker contract test; its only new tests remain the three
portal files listed above. TASK-548-05 may repeat this already-landed image
validation as a release gate without changing ownership.

## Atomic Client Assets and Dist Publication Contract

L02 owns the only complete portal build transaction. It creates a
task-scoped, no-follow sibling staging root with separate `vite/` and `dist/`
directories while the previous `packages/docs-portal/dist` remains untouched.
It then executes this order exactly:

1. run Vite programmatically with L01's frozen config, literal client entry
   `src/app/hydrateDocsPortalIslandsV1.tsx`, explicit base path, staging
   `outDir`, `emptyOutDir: true`, and
   `build.manifest: "client-manifest.json"`;
2. strictly parse the staged Vite manifest, require exactly that entry, walk
   its complete `imports`/`dynamicImports`/`css`/`assets` closure, and reject
   unknown keys, cycles, missing/orphan/symlink/path-escaping/source-map files
   or any server-shell/renderer/projection module in the client graph;
3. read and hash every closed JS/CSS/asset byte, copy each exactly once into
   final staging, and emit canonical
   `deployment/client-assets.json` sorted by `manifestPath`; L02 is the sole
   owner of its strict schema, normalizer, serializer, and inventory builder;
4. inject every required sorted stylesheet and the one module entry into every
   canonical, latest and typed-404 HTML page using only
   `buildDocsPortalClientAssetHrefV1(publicBasePath, manifestPath)`;
5. render all static content/SEO/search/deployment files, close every client
   byte and `client-assets.json` through `DocsPortalManifestV1.files`, validate
   the complete staged tree, fsync it, then perform the journaled atomic
   `dist` directory swap.

`buildDocsPortalClientAssetHrefV1` accepts only a normalized deployment base
and a confined manifest path; it emits a same-origin base-prefixed href and
never uses route depth, root assumptions, origin input or string
concatenation. JS imports and CSS asset references remain Vite content-hashed
and base-safe. HTML contains no inline executable/style content.

The dist swap has an exclusive lock and a durable phase journal binding the
old/staged tree hashes. Recovery exposes either the complete old tree or the
complete new tree, never a mixture; any pre-swap failure removes only the
validated task-scoped staging root. Recovery validates exact real paths and
hashes before rename/removal, and no code recursively deletes an unresolved,
shared or broad path. A repeated identical build compares the full tree,
including Vite JS/CSS/assets, client receipt and injected tags, byte-for-byte.

```ts
type DocsPortalClientAssetRecordV1 = {
  kind: "entry-js" | "chunk-js" | "css" | "asset";
  manifestPath: string; publicHref: string; bytes: number; sha256: string;
};
type DocsPortalClientAssetsManifestV1 = {
  schema: "coderso.docs-portal-client-assets@v1";
  entry: string; styles: string[]; files: DocsPortalClientAssetRecordV1[];
};
type DocsPortalClientAssetTagsV1 = {
  moduleScriptHref: string; stylesheetHrefs: string[];
};
normalizeDocsPortalClientAssetsManifestV1(
  value: unknown
): DocsPortalClientAssetsManifestV1;
serializeDocsPortalClientAssetsManifestV1(
  value: DocsPortalClientAssetsManifestV1
): Uint8Array;
buildDocsPortalClientAssetTagsV1(
  value: DocsPortalClientAssetsManifestV1
): DocsPortalClientAssetTagsV1;
async function buildStagedDocsPortalClientV1(input: {
  stagingRoot: string;
  publicBasePath: string;
}): Promise<DocsPortalClientAssetsManifestV1>;
async function promoteValidatedDocsPortalDistV1(input: {
  stagingDist: string;
  receipt: DocsPortalBuildReceipt;
}): Promise<void>;
```

`entry` names exactly one `kind: "entry-js"` record, every `styles[]` member
names exactly one `kind: "css"` record, and `files[]` is the complete, unique,
canonically sorted Vite closure with no orphan. Each `publicHref` must byte-
equal the base-safe helper output for its `manifestPath`; record bytes/hash
must match the copied staged file. The detached portal manifest closes every
record plus `deployment/client-assets.json` itself. One deeply frozen
`DocsPortalClientAssetTagsV1` is derived once and passed unchanged to canonical,
alias, and 404 render helpers; no helper accepts the broader client manifest.

## Route Contract

Canonical:

```text
/v/<product-version>/<locale>/<slug>
```

Alias:

```text
/latest/<locale>/<slug>
```

- `product-version` is normalized strict SemVer without path separators.
- Locale is a manifest-enumerated bounded BCP-47 value; output path uses its
  normalized lowercase form.
- `docId` is a translation-family identity. Exact `(docId, locale)` is unique
  in the input and built graph; two actually built locales may share one
  `docId`, while a duplicate pair fails before route generation.
- Slug comes from strict corpus metadata, is unique within version+locale, and
  contains only safe normalized path segments. Dot segments, encoded slash,
  duplicate separator, control character, and traversal reject.
- `buildDocsPublicPath(route)` from the shared renderer owns root-relative
  canonical version/latest path construction.
  `buildDocsPublicHref({ origin, basePath, route })` owns the external base-path
  prefix. Portal code maps the validated root-relative public path, without the
  deployment base path, to its confined static output path.
  `resolveDocsPortalArtifactRelativePath` returns only a confined relative path;
  the staging-bound writer rejects absolute/out-of-root values. No route helper
  can name live `dist`, and no hard-coded article/asset/search link is allowed.
- Static route selection comes from the validated bundle/route graph and never
  guesses a nearest document; portal route code does not add a second public
  URL resolver.
- Every visual reference resolves only when its projection-global `visualId` has
  exactly one asset record owned by the selected
  `(docId, locale, sectionId)`. A locale-mismatched owner, duplicate global id,
  or cross-section substitution fails before HTML or asset output.
- Latest maps to exactly the configured current published version. Missing
  locale/slug emits a typed static 404 with real alternatives.

Physical output:

```text
dist/404.html
dist/_headers
dist/v/<version>/<locale>/<slug>/index.html
dist/latest/<locale>/<slug>/index.html
dist/search/<version>/<locale>.json
```

Alias HTML renders the same safe article as a host-independent fallback but
uses versioned canonical metadata and `noindex,follow`.
`dist/deployment/redirects.json` declares 308 alias → canonical mappings for
TASK-548-05-capable hosts.

`dist/404.html` is one canonical, typed not-found document for the complete
artifact. It returns no reflected request path or guessed document, uses the
L01 `page.kind: "not-found"` payload, and renders only route-graph-derived
documentation-home, locale, version, and bounded popular-document
alternatives. It has `noindex,follow`, no canonical claiming a missing URL,
base-safe internal links/assets, and the exact shared client tags/four islands.
Cloudflare Pages must serve these exact bytes with HTTP 404 for an unmatched
path under the configured base path; SPA-style 200 fallback, redirect to home,
or host-generated replacement content fails the deployment gate.

The alias renderer has one exact boundary; parent pseudocode and tests import
this owner rather than reconstructing its arguments:

```ts
renderAliasFallback(input: {
  alias: DocsPortalLatestAliasV1;
  canonical: DocsPortalCanonicalRouteV1;
  canonicalStaticPage: RenderedDocsPortalPageV1;
  publicOrigin: string;
  publicBasePath: string;
  clientAssetTags: DocsPortalClientAssetTagsV1;
}): Uint8Array;
```

It verifies the canonical page belongs to `canonical`, derives only canonical/
robots/alias metadata from the same graph, and embeds the exact supplied tags.
Because aliases are `noindex`, it intentionally omits canonical-page JSON-LD
while preserving the same safe article fallback; 404 also emits no JSON-LD.
Passing `clientAssets`, rebuilding tags, or looking up a canonical page inside
the renderer is not an alternate overload.

## SEO and Structured Data Contract

Each canonical article emits:

- unique bounded `<title>` and meta description from validated corpus metadata;
- absolute HTTPS canonical URL;
- `hreflang` only for translations of the same stable `docId` that exist in the
  built route graph; add `x-default` only when an English route exists;
- OpenGraph type/title/description/url/locale and a sanitized local visual or
  generic local brand image;
- BreadcrumbList + TechArticle JSON-LD using stable ids/route labels;
- index/follow robots directive, while alias/search/404 are noindex as defined;
- stable section anchors compatible with embedded Help deep links.

Structured JSON is canonicalized, escapes `<`, `>`, `&`, `/`, U+2028, and
U+2029, and never passes through `dangerouslySetInnerHTML`. The build calculates
exact CSP hashes for unavoidable non-executable structured-data blocks. All
executable JS/CSS/assets are external content-hashed same-origin files;
`unsafe-inline` and `unsafe-eval` are forbidden.

Global artifacts:

- `sitemap.xml`: canonical indexable versioned routes only, stable sort, valid
  last-modified release value (not wall-clock now);
- `robots.txt`: sitemap reference and explicit exclusion of search/build
  metadata paths where appropriate;
- `deployment/headers.json`: CSP, MIME/nosniff, referrer, frame, permissions,
  caching, and immutable asset policy in a host-neutral strict schema;
- `_headers`: exact canonical LF Cloudflare Pages materialization of that same
  policy at the artifact root. It includes the normalized public base path in
  route patterns, per-page CSP hashes where required, shared deny policies,
  immutable caching for versioned/search/content-hashed bytes, and revalidation
  for latest/404/site-index/sitemap/robots. Unknown, duplicate, shadowed or
  over-host-limit rules reject rather than being reordered;
- `deployment/redirects.json`: latest aliases only, no open redirects;
- `deployment/client-assets.json`: the L02-owned exact Vite closure and tag
  source described above;
- `deployment/site-index.json`: strict deterministic single-release navigation
  candidate derived from the same route graph. It is not the cumulative public
  index and is never copied over retained history directly;
- version+locale search index: public-safe text/ids/paths only with checksum;
- `docs-portal-manifest.json`: the exact detached
  `DocsPortalManifestV1` control record for every route/hash and the input digest.

`serializeCloudflarePagesHeadersV1()` is the sole `_headers` serializer. It
normalizes the deployment prefix to `/*` for `/` or
`<publicBasePath>/*` otherwise, emits LF plus one final newline, and renders
exactly these effective security values for the base catch-all and root 404:

```text
Content-Security-Policy: default-src 'none'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self'; manifest-src 'self'; media-src 'none'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
X-Frame-Options: DENY
Cache-Control: public, max-age=0, must-revalidate
```

The serializer emits that full policy for the base catch-all and root
`/404.html`, so a missing request inherits revalidation by its requested path.
For each canonical article only, one exact route rule detaches the inherited
CSP and replaces it with the same policy plus that page's unique sorted JSON-LD
SHA-256 sources. Alias/404 pages contain no JSON-LD and inherit `script-src
'self'`. It then emits unique most-specific base-prefixed rules in raw UTF-8 order for
`/v/*`, `/search/*`, `/assets/*`, and `/release-metadata/*`; each uses the
Cloudflare removal directive for the inherited `Cache-Control` before setting
`public, max-age=31536000, immutable`. Latest/site-index/sitemap/robots and all
other reads retain the catch-all revalidation value. The top-level `_headers`
control path is not content. Generation validates Cloudflare Pages rule/line/
file limits and simulated rule-merge results before staged write.
`deployment/headers.json` and `_headers` must produce identical effective
values; neither claims GitHub Pages applies response headers.

The strict manifest shapes are:

```ts
type DocsPortalRouteRecordV1 = {
  kind: "canonical" | "latest";
  docId: string;
  productVersion: string;
  locale: string;
  slug: string;
  publicPath: string;
  outputPath: string;
  canonicalPath: string;
  indexable: boolean;
};

type DocsPortalFileRecordV1 = {
  path: string; bytes: number; sha256: string;
};

type DocsPortalVisualAssetRecordV1 = {
  visualId: string; docId: string; locale: string; sectionId: string;
  path: string; bytes: number; sha256: string;
};

type DocsPortalManifestV1 = {
  schema: "coderso.docs-portal@v1";
  productVersion: string;
  corpusVersion: string;
  sourceHash: string;
  publicOrigin: string;
  publicBasePath: string;
  sourceDateEpoch: number;
  buildInputSha256: string;
  locales: string[];
  routes: DocsPortalRouteRecordV1[];
  visualAssets: DocsPortalVisualAssetRecordV1[];
  files: DocsPortalFileRecordV1[];
};

type DocsPortalSiteIndexCandidateRouteV1 = {
  docId: string; locale: string; slug: string;
  exactPath: string; latestPath: string;
};

type DocsPortalSiteIndexCandidateV1 = {
  schema: "coderso.docs-site-index-candidate@v1";
  productVersion: string;
  sourceHash: string;
  notFoundSha256: string;
  cloudflareHeadersSha256: string;
  clientAssetsManifestSha256: string;
  routes: DocsPortalSiteIndexCandidateRouteV1[];
};

normalizeDocsPortalSiteIndexCandidateV1(
  value: unknown
): DocsPortalSiteIndexCandidateV1;
serializeDocsPortalSiteIndexCandidateV1(
  value: DocsPortalSiteIndexCandidateV1
): Uint8Array;
```

`sourceHash` is byte-for-byte the validated full
`DocsDistributionBundleV2.sourceHash`: immutable whole-corpus source
provenance, not a digest or integrity proof of the filtered public projection.
It is never recomputed from rendered output. `locales`, `routes`,
`visualAssets`, and `files` are unique and canonically sorted. Route records
sort by kind, product version, locale, slug, then `docId`; visual assets sort by
`(visualId, locale, docId, sectionId, path)` and require projection-global unique
`visualId`; file records sort by normalized relative `path`. Every visual asset
joins one manifest file record by identical path/bytes/hash and one exact
localized section owner. All nested shapes reject unknown keys. Versions,
hashes, origin/base path, epoch, routes, output paths, byte counts, visual
ownership, and locale inventory are bounded and strictly normalized.

The candidate discriminator and displayed keys are exact and recursively
reject unknown. It contains exactly the current product version and distribution
`sourceHash`, copies the exact three deployment hashes from the corresponding
portal-manifest file records, has `1..50,000` routes, and its routes are unique and sorted by
`(locale, slug, docId)`. Each `exactPath` is the canonical
`/v/<productVersion>/<locale>/<slug>` path and each `latestPath` is its matching
`/latest/<locale>/<slug>` alias. Its serializer uses displayed key order,
canonical route order, LF, and one final newline; the normalizer rejects
noncanonical input order rather than silently sorting it. TASK-548-05-L02
imports these exact functions, hashes the candidate bytes, verifies them
against the detached portal manifest, and maps them into the L01-owned
cumulative `DocsPortalSiteIndexV1`; portal generation never reads retained
history.

`docs-portal-manifest.json` is the sole file excluded from its own sorted
`files[]`. Every other emitted file, including every alias, search index, asset,
SEO file, `404.html`, `_headers`, client-assets manifest and deployment
candidate, appears exactly once with bytes and SHA-256.
The manifest carries normalized `publicOrigin` and `publicBasePath`; it is parsed
and schema-validated separately. A second exclusion, manifest self-record,
untracked output or orphan record fails. TASK-548-05 hashes the detached
manifest externally in its release manifest.

The release handoff maps byte-for-byte into
`/release-metadata/<version>/publication-capsule/`: `latest/**`,
`runtime/{404.html,_headers}`, `routing/{redirects,headers,client-assets}.json`,
`global/{sitemap.xml,robots.txt,site-index.json}`, and the detached portal
manifest. The capsule's `global/site-index.json` remains this immutable
single-release candidate. TASK-548-05-L01 adds the release manifest and is sole
owner of strict canonical `DocsSearchPublicationReceiptV1` and
`DocsAssetsPublicationReceiptV1` bytes at
`receipts/{search.json,assets.json}`, projected from the detached manifest's
search file and localized `visualAssets` records.
TASK-548-05-L02 merges the verified candidate with the retained cumulative
branch index without rebuilding old pages; publication never invokes this route
builder. Its version entry copies the exact `404.html`, `_headers`, and
`deployment/client-assets.json` file hashes into `notFoundSha256`,
`cloudflareHeadersSha256`, and `clientAssetsManifestSha256`; rollback verifies
them before copying the capsule runtime/routing bytes.

## Determinism and Publication Filter

The public build boundary accepts only strict `DocsPortalBuildConfigV1`. Only
the internal post-inspection helper receives the already validated packaged
`DocsDistributionBundleV2`; no caller can provide a bundle, report, artifact
path, bytes, or output root. The valid clean-checkout state is a tracked bundle
with no ignored report. The exact shared projection constructor normalizes the
full bundle once, applies the shared `public-docs` selector, proves projection
completeness plus target-internal link/evidence/reference closure, and returns a
distinct deeply frozen private-branded shape with the full source-set hash as
provenance. One pure search-index build follows. The route graph and every
static route reuse both objects; route member resolution uses exact
`(docId, locale)` keys and version-range checks without another normalizer. An
eligible record omitted from the projection, or an `assistant`-only,
`embedded-help`-only or missing-target record included anywhere, fails closed.

`docs/guide` records may publish to all three targets. The current compiler
deliberately excludes `docs/develop`; adding a separate public-only developer
feed requires a later explicit compiler contract and must never make it
assistant-retrievable. Internal-only records, `_docs`, task/changelog/audit/
workflow/smoke content, drafts and unverified visuals fail closed.

Stable sorting, canonical JSON, normalized line endings, fixed compression
settings, content hashes, and explicit `SOURCE_DATE_EPOCH`/release timestamp
make output reproducible. The manifest must not contain build time from
`Date.now()`, temp paths, machine names, or nondeterministic object order.

## Security Contract

- **Endpoint visibility:** public static reads only; no route handler/API/write.
- **Auth/RBAC/CSRF/rate limit:** not applicable. Publication target validation
  replaces runtime authorization for public-safe content.
- **Validation:** strict reject-unknown inputs and outputs; safe SemVer, locale,
  slug, base path, origin, URL, manifest, headers, redirects, search, and
  hydration-payload schemas; client islands mount only after canonical-byte and
  domain-separated body-hash verification.
- **Anti-abuse:** no public write; nonce/HMAC/reCAPTCHA are not applicable.
- **Origin/redirects:** HTTPS origin only, no credentials/query/hash; redirect
  destination is generated from the same route graph, never user input.
- **Content/CSP:** no raw HTML, unsafe schemes, external runtime media, inline
  executable content, `unsafe-inline`, or `unsafe-eval`.
- **Privacy:** output rejects secrets/PII/internal paths/source maps/build-host
  paths and includes no telemetry endpoint.

## Implementation Pseudocode

```ts
export function readDocsPortalBuildConfigV1FromEnvironment(
  environment: Record<string, string | undefined>
): DocsPortalBuildConfigV1 {
  return normalizeDocsPortalBuildConfigV1({
    currentVersion: requireEnvironmentValue(
      environment,
      "DOCS_PRODUCT_VERSION"
    ),
    publicOrigin: requireEnvironmentValue(
      environment,
      "DOCS_PUBLIC_ORIGIN"
    ),
    publicBasePath: requireEnvironmentValue(
      environment,
      "DOCS_PUBLIC_BASE_PATH"
    ),
    sourceDateEpoch: parseCanonicalSourceDateEpoch(
      requireEnvironmentValue(environment, "SOURCE_DATE_EPOCH")
    ),
  });
}

export function resolveDocsPortalArtifactRelativePath(
  publicPath: string
): string {
  const normalized = assertDocsPublicPath(publicPath);
  return resolveConfinedRelativeIndexHtmlPath(normalized);
}

export async function buildDocsPortal(
  input: DocsPortalBuildConfigV1
): Promise<DocsPortalBuildReceipt> {
  const config = normalizeDocsPortalBuildConfigV1(input);
  await assertNoDocsWorkspaceArtifactPromotionHazardsV1();
  const bundle = await loadPackagedDocsDistributionBundleV2();
  return buildValidatedDocsPortal(config, bundle);
}

if (import.meta.main) {
  await buildDocsPortal(
    readDocsPortalBuildConfigV1FromEnvironment(process.env)
  );
}

async function buildValidatedDocsPortal(
  config: DocsPortalBuildConfigV1,
  bundle: DocsDistributionBundleV2
): Promise<DocsPortalBuildReceipt> {
  const transaction = await createDocsPortalDistTransactionV1();
  try {
  const clientAssets = await buildStagedDocsPortalClientV1({
    stagingRoot: transaction.viteRoot,
    publicBasePath: config.publicBasePath,
  });
  const projection: DocsPublicationProjectionV1<"public-docs"> =
    createDocsPublicationProjectionV1({
      sourceBundle: bundle,
      publicationTarget: "public-docs",
    });
  const searchIndex = buildDocsSearchIndexV1(projection);
  const graph = buildPublicRouteGraph(
    projection,
    config.currentVersion
  );
  const clientSearchByLocale = buildExactLocaleMap(graph.locales, (locale) =>
    projectDocsClientSearchRankingV1(searchIndex, {
      productVersion: config.currentVersion, locale,
    })
  );
  const writer =
    createHashedDeterministicWriter(transaction.stagingDist);
  await copyAndRecordClientAssetClosureV1(writer, clientAssets);
  const emittedVisualAssetsByDocument =
    await emitVerifiedPortalVisualAssetsV1({
      sourceBundle: bundle, projection, writer,
    });
  const clientAssetTags = deepFreeze(
    buildDocsPortalClientAssetTagsV1(clientAssets)
  );
  const renderedCanonicalPages =
    new Map<DocsPublicationDocumentKeyV1, RenderedDocsPortalPageV1>();

  for (const route of graph.canonicalRoutes) {
    const document = resolveVersionedProjectionMemberV1(
      projection,
      route.documentKey,
      config.currentVersion
    );
    const publicPath = buildDocsPublicPath(route.publicRoute);
    const canonicalHref = buildDocsPublicHref({
      origin: config.publicOrigin,
      basePath: config.publicBasePath,
      route: route.publicRoute,
    });
    const hydrationPayload = createDocsPortalHydrationPayloadV1({
      page: buildPortalHydrationPageModel(config, document),
      header: buildPortalHeaderClientModel(graph, route, config),
      search: requireLocaleClientSearch(clientSearchByLocale, document.locale),
      theme: { storageKey: "coderso.docs.theme", initialMode: "system" },
      mobileNavigation: buildPortalMobileClientModel(graph, route),
    });
    const outputFile = resolveDocsPortalArtifactRelativePath(publicPath);
    const renderedPage = renderStaticPortalPage(route, {
        shellHtml: renderDocsPortalStaticShell({
          projection,
          documentKey: route.documentKey,
          navigation: buildPortalNavigation(graph, route, config),
          emittedVisualAssets: requireEmittedPortalVisualAssetsV1(
            emittedVisualAssetsByDocument, route.documentKey
          ),
          hydrationPayload,
        }),
        canonicalHref,
        publicOrigin: config.publicOrigin,
        publicBasePath: config.publicBasePath,
        clientAssetTags,
      });
    await writer.write(outputFile, renderedPage.bytes);
    renderedCanonicalPages.set(route.documentKey, renderedPage);
  }
  for (const alias of graph.latestAliases) {
    const publicPath = buildDocsPublicPath(alias.publicRoute);
    const canonical = requireCanonicalRoute(graph, alias);
    await writer.write(
      resolveDocsPortalArtifactRelativePath(publicPath),
      renderAliasFallback({
        alias,
        canonical,
        canonicalStaticPage: requireRenderedCanonicalPageV1(
          renderedCanonicalPages,
          canonical.documentKey
        ),
        publicOrigin: config.publicOrigin,
        publicBasePath: config.publicBasePath,
        clientAssetTags,
      })
    );
  }

  const notFoundPage = renderTypedPortalNotFoundPageV1({
    model: buildDocsPortalNotFoundModelV1(graph, config),
    hydrationPayload: createDocsPortalHydrationPayloadV1(
      buildNotFoundHydrationBodyV1(graph, clientSearchByLocale, config)
    ),
    clientAssetTags,
    robots: "noindex,follow",
  });
  await writer.write("404.html", notFoundPage.bytes);

  await emitSearchIndexes(writer, projection, searchIndex, {
    publicOrigin: config.publicOrigin,
    publicBasePath: config.publicBasePath,
  });
  const deployment = await emitSeoAndDeploymentArtifacts(writer, graph, {
    publicOrigin: config.publicOrigin,
    publicBasePath: config.publicBasePath,
  });
  await writer.write("deployment/client-assets.json",
    serializeDocsPortalClientAssetsManifestV1(clientAssets));
  await writer.write("_headers", serializeCloudflarePagesHeadersV1({
    publicBasePath: config.publicBasePath,
    headers: deployment.headers,
    structuredDataHashesByRoute:
      collectExactStructuredDataHashesByRouteV1(renderedCanonicalPages),
  }));
  await emitCurrentReleaseSiteIndexCandidateV1(writer, graph, {
    notFoundPath: "404.html",
    cloudflareHeadersPath: "_headers",
    clientAssetsManifestPath: "deployment/client-assets.json",
  });
  const receipt =
    await writer.finalizeDetachedManifestAndVerifyAllOtherFiles(graph);
  await validateCompleteStagedPortalV1(transaction.stagingDist, receipt);
  await promoteValidatedDocsPortalDistV1({
    stagingDist: transaction.stagingDist, receipt,
  });
  return receipt;
  } catch (error) {
    await discardOnlyValidatedUnpublishedPortalStageV1(transaction);
    throw mapDocsPortalBuildErrorV1(error);
  }
}
```

**Data flow:** `docs:check` equality → config → hazard inspection → common
cwd-independent packaged-loader normalization → isolated Vite client stage/
strict manifest closure → independent projection-constructor normalization and
target proof → one search index → one lossless client ranking projection per
locale → route/member graph → shared server shell/renderer → hash-bound four-
island payload → base-safe client injection + HTML/search/assets/SEO →
complete hash closure → journaled atomic dist swap.

**Error handling:** a live/tampered journal, journal temp, backup/staging
artifact, report-only state, invalid packaged bundle, invalid linked pair,
`docs:check` canonical-byte/source mismatch, or any attempted pre-inspection
read fails before target selection and leaves portal output untouched. A valid
tracked-bundle-only clean checkout is accepted. Duplicate
doc/slug/route, unsafe origin/path, unresolved internal ref, missing asset/hash/
alt, false locale alternate, private record, client manifest/closure/tag error,
non-reproducible output, redirect escape, or hash mismatch aborts and cleans
only a verified unpublished stage. Swap recovery keeps/restores a complete
tree. Never delete a broad/unresolved path or partial live `dist`.

**Regression-test shape:**

- exact canonical/alias/404/base-path paths and traversal rejects;
- clean-clone/tag portal entry with the tracked bundle and no `.tmp` tree/report
  passes; every owner promotion journal phase, report-only state, invalid linked
  pair, and tampered transaction or packaged-bundle bytes fail read-only;
- static ordering guard proving no packaged-bundle open, target selector, route
  builder, renderer or output writer is reachable before owner hazard inspection
  passes; every writer path is relative to the verified stage and spies prove
  zero live-`dist` open/write/remove before the final promotion;
- public-entry fixtures accept only the four exact configuration keys and reject
  unknown `bundle`, `report`, artifact-path, bytes, or output-root inputs before
  inspection; only the internal post-inspection helper receives the validated
  packaged bundle;
- executable-entry fixtures pin all four environment-to-field mappings, reject
  every missing/empty/alternate variable and malformed epoch, and prove the
  local profile maps to exact `0.0.0-test`,
  `https://docs.example.invalid`, `/docs`, and `0`;
- shared `buildDocsPublicPath`/`buildDocsPublicHref` parity and a static guard
  against a portal-owned public URL builder;
- stable translation-family `docId`, exact `(docId, locale)` uniqueness,
  hreflang over only same-`docId` actually built locales, and no fake PL;
- canonical/robots/OG/JSON-LD/anchors for a complete fixture;
- alias canonical/noindex plus same-graph redirect; one shared frozen
  `clientAssetTags` object reaches canonical, the exact owner alias helper and
  typed 404, while a broader client manifest or helper-local tag build rejects;
- root 404 is deterministic, `noindex,follow`, base-safe, contains only real
  alternatives and no reflected requested path, uses four typed islands, and
  is closed by the detached manifest; a preview/Cloudflare fixture returns its
  exact bytes with HTTP 404 rather than SPA 200/redirect/replacement;
- sitemap/search/header/redirect/client-assets/manifest schema and hash closure;
- `_headers` exact LF syntax, normalized-base route patterns, host limits,
  host-neutral JSON parity and effective CSP/X-Frame-Options/nosniff/referrer/
  permissions/cache values; missing, duplicate, shadowed, tampered, unsupported
  or GitHub-Pages-assumed header materialization rejects;
- detached-manifest sole-exclusion and exact reject-unknown single-release
  site-index candidate closure/order/hash, including exact 404, `_headers` and
  client-assets-manifest hashes;
- visual manifest records require globally unique `visualId`, exact
  `(docId, locale, sectionId)` ownership, one matching file record, and reject
  locale/cross-section substitution; fixtures are consumable by the
  TASK-548-05-L01 asset-receipt projector; the one build-only emitter reads
  source bytes no-follow but returns only exact path/byte-free
  `DocsLocalVisualAssetV1` records to every shell call;
- exact `coderso.docs-portal@v1` reject-unknown shape, source-hash identity,
  canonical route/file sorting, and no manifest self-field;
- projection fixtures prove every eligible public record is retained exactly
  once and every route member key resolves to one exact record; omission plus
  `assistant`-only, `embedded-help`-only or missing-target leakage fails before
  shell/search/render; hostile constructor keys, structural/spread/serialized/
  foreign brands, locale/non-member keys, malformed/out-of-range versions,
  target absence and incomplete target closure reject;
- spies prove the common packaged loader performs exactly one normalization and
  returns its object to exactly one `createDocsPublicationProjectionV1()`,
  whose constructor performs one separate normalization/target selection;
  exactly one `buildDocsSearchIndexV1()`, no path/filtered-bundle/per-route
  normalizer, identical projection/index references and unchanged `sourceHash`;
- a static call-boundary guard proves shell/search/renderer receive the exact
  projection/member-key pair, while portal client entries contain no
  projection constructor/brand, full document/corpus, server shell or renderer
  import; only the exact client-search subpath is allowed;
- client ranking fixtures prove one renderer-owned lossless projection per
  locale retains every scorer signal and returns exact Help parity;
- Vite fixtures pin one hydration entry, strict recursive manifest closure,
  base-path-safe hashed JS/CSS on every HTML page, canonical client receipt and
  detached-manifest coverage; its sole owner normalizer rejects wrong entry,
  styles, record order/kind/path/href/bytes/hash or orphan closure. Orphan/
  missing/cycle/traversal/source-map/server-
  graph assets fail before any live-dist write;
- inject failures after every client-build/copy/render/finalize/swap phase and
  crash-recover; the prior or new complete dist is byte-identical and no mixed
  tree, stale stage, backup or journal is accepted;
- each canonical/alias page embeds canonical
  `DocsPortalHydrationPayloadV1` bytes bound by `bodySha256`; mutations,
  unknown keys, noncanonical encoding/order and oversized payloads cause zero
  island mounts. Snapshot/import tests prove article/navigation/TOC are static
  and payload keys contain only header/search/theme/mobile-nav state;
- internal/publication-target/secret/unsafe URL fixtures fail;
- two builds with same epoch are byte-identical including all client bytes,
  Vite closure receipt and injected tags;
- changed document affects only expected route/search/manifest hashes;
- output files and tests stay below line limit where human-authored.

## Sub-Tasks

- [ ] Implement strict route/base/version/locale/slug graph helpers.
- [ ] Build/validate/copy the Vite client closure, inject base-safe hashed tags,
  then render routes only into the transaction's confined staging writer.
- [ ] Build deterministic static renderer/writer, latest aliases and typed root
  404; validate and journal-swap the complete dist atomically.
- [ ] Emit SEO, structured data, sitemap, robots, search, exact `_headers`,
  host-neutral headers, redirects and client-assets inventory.
- [ ] Close all bytes through the artifact manifest and reproducibility tests.

## Testing Requirements

```bash
bun --cwd packages/docs-portal check
bun test tests/unit/documentation/docsCorpusPromotionRecovery.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx \
  tests/vitest/docs-portal/portal-routes.test.ts \
  tests/vitest/docs-portal/portal-build.test.tsx \
  tests/vitest/docs-portal/portal-seo.test.ts \
  tests/vitest/docs/docs-renderer.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run docs:check
task548_portal_tmp="$(mktemp -d "${TMPDIR:-/tmp}/coderso-task548-portal.XXXXXX")"
task548_portal_real="$(realpath "$task548_portal_tmp")"
case "$task548_portal_real" in */coderso-task548-portal.*) ;; *) exit 1 ;; esac
task548_docker_image=""
task548_l02_cleanup() {
  if [[ "$task548_docker_image" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    docker image rm "$task548_docker_image" >/dev/null 2>&1 || true
  fi
  rm -rf -- "$task548_portal_real"
}
trap task548_l02_cleanup EXIT
mkdir "$task548_portal_real/first"
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bun --cwd packages/docs-portal build
test -z "$(find "$task548_portal_real/first" -mindepth 1 -print -quit)"
cp -R packages/docs-portal/dist/. "$task548_portal_real/first/"
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bun --cwd packages/docs-portal build
diff -qr "$task548_portal_real/first" packages/docs-portal/dist
docker build --build-arg APP_VERSION=0.0.0-test \
  --iidfile "$task548_portal_real/docker-image-id" .
task548_docker_image="$(tr -d '\r\n' < "$task548_portal_real/docker-image-id")"
[[ "$task548_docker_image" =~ ^sha256:[0-9a-f]{64}$ ]]
docker run --rm --entrypoint bun "$task548_docker_image" --eval \
  'const renderer = await import("@coderso/docs-renderer"); const projection = await import("@coderso/docs-renderer/projection"); const helpAssets = await import("/app/core/admin/ui/help/helpBuildAssetVerification.ts"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.buildDocsSearchIndexV1 !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function" || typeof projection.createDocsPublicationProjectionV1 !== "function" || typeof helpAssets.resolveEmbeddedHelpBuildAssetFileV1 !== "function") throw new Error("docs_renderer_exports_invalid"); const bundleFile = Bun.file("/app/core/generated/docs/coderso-docs-v2.json"); if (!(await bundleFile.exists())) throw new Error("docs_bundle_missing"); const bundle = await bundleFile.json(); if (bundle.schema !== "coderso.docs-corpus@v2") throw new Error("docs_bundle_schema_invalid"); for (const path of ["/app/core/dist/client/index.html", "/app/core/dist/site/manifest.json"]) if (!(await Bun.file(path).exists())) throw new Error(`docker_build_output_missing:${path}`); const helpReceiptFile = Bun.file("/app/core/dist/client/docs-help-assets-v1.json"); if (!(await helpReceiptFile.exists())) throw new Error("help_asset_receipt_missing"); const helpReceipt = helpAssets.normalizeEmbeddedHelpAssetReceiptV1(await helpReceiptFile.json()); if (helpReceipt.sourceHash !== bundle.sourceHash) throw new Error("help_asset_receipt_invalid"); for (const asset of helpReceipt.assets) { const opened = await helpAssets.resolveEmbeddedHelpBuildAssetFileV1({ clientRoot: "/app/core/dist/client", outputKey: asset.outputKey, href: asset.href }); const observed = new Bun.CryptoHasher("sha256").update(opened.bytes).digest("hex"); if (opened.sha256 !== asset.sha256 || observed !== opened.sha256) throw new Error(`help_asset_invalid:${asset.outputKey}`); }'
docker run --rm --entrypoint sh "$task548_docker_image" -ceu \
  'test -z "$(find /app -type d -name ".tmp" -print -quit)"
   test -z "$(find /app/core/generated/docs -type f \( -name "*.tmp*" -o -name "*.staged*" -o -name "*.backup*" -o -name "*promotion-transaction*" \) -print -quit)"'
docker image rm "$task548_docker_image"
task548_docker_image=""
find packages/docs-portal/src/build packages/docs-portal/src/routes \
  packages/docs-portal/src/seo \
  -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} +
wc -l tests/vitest/docs-portal/portal-routes.test.ts \
  tests/vitest/docs-portal/portal-build.test.tsx \
  tests/vitest/docs-portal/portal-seo.test.ts
git diff --check
```

The trap removes the exact validated `mktemp -d` result and, only when it
matches the strict SHA-256 image ID read from this build's task-scoped
`--iidfile`, that newly built image. Never substitute a fixed/shared path,
tag, or unresolved variable. Every human-authored count must be at most 1,000.
Re-run failures alone.

## Acceptance Criteria

- Canonical/version/latest/base-path routes are strict, deterministic, and
  deep-linkable.
- Static pages and all metadata use the same shared renderer/bundle identity as
  embedded Help.
- Only real translations produce routes/hreflang; English completeness is
  preserved without a false full-Polish claim.
- SEO, JSON-LD, sitemap, robots, search, typed 404, client inventory, exact
  Cloudflare CSP headers, redirects, and manifest validate and close through
  hashes.
- The detached manifest is the only self-excluded control file and externally
  bound by the release manifest.
- Same inputs/epoch reproduce byte-identical output.
- TASK-548-05 receives one immutable self-describing artifact and does not need
  portal source knowledge.

## Documentation Updates Required

Hand exact/latest routes, locale/base-path rules, detached-manifest convention,
capsule candidate mapping, SEO, deployment metadata, and build contracts to
TASK-548-05/07; this leaf edits no shared closeout documentation.
