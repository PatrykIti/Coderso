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
robots, content hashes, and host-neutral header/redirect metadata.

Hosting/upload/release integrity is TASK-548-05. This leaf produces immutable
bytes and prebuilt mutable candidates that release automation can verify and
copy without reconstructing the route graph or rendering article HTML.

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
  selectDocumentsForPublicationTarget,
} from "@coderso/docs-renderer";
import {
  assertDocsPortalDocumentSelectionV1,
  assertDocsPortalPublicProjectionV1,
  type DocsPortalDocumentSelectionV1,
  type DocsPortalPublicProjectionV1,
} from "../app/DocsPortalShell";

// packages/docs-portal/src/routes/docsPortalOutput.ts
resolveDocsPortalOutputPath(publicPath: string): string;

// packages/docs-portal/src/build/buildDocsPortal.ts
// Imported from the TASK-548-01-L02 owner module; never reimplemented here.
recoverDocsWorkspaceArtifactPromotionV1(): Promise<
  DurablePairRecoveryResultV1
>;
loadAndValidateRecoveredDocsArtifactPair(input: {
  bundlePath: "core/generated/docs/coderso-docs-v2.json";
  reportPath: ".tmp/docs-corpus/migration-report-v1.json";
}): Promise<{
  bundle: DocsDistributionBundleV2;
  report: DocsMigrationReportV1;
}>;
type DocsPortalBuildConfigV1 = {
  currentVersion: string;
  publicOrigin: string;
  publicBasePath: string;
  sourceDateEpoch: number;
};
readDocsPortalBuildConfigV1FromEnvironment(
  environment: Record<string, string | undefined>
): DocsPortalBuildConfigV1;
buildDocsPortalPublicProjectionV1(
  bundle: DocsDistributionBundleV2,
  selected: DocsPortalDocumentSelectionV1
): DocsPortalPublicProjectionV1;
buildDocsPortal(
  input: DocsPortalBuildConfigV1
): Promise<DocsPortalBuildReceipt>;
```

L01 owns and exports the exact projection type/assertion; TASK-548-03-L02
re-exports the TASK-548-01-L01-owned exact target selector through
`@coderso/docs-renderer`. L02 imports both contracts and is the sole producer of
`DocsPortalPublicProjectionV1`. It must not copy either type or selection logic.
The producer filters the validated bundle to `public-docs`, requires the selected
document to join exactly once to that filtered bundle, requires both the selected
record and every projected record to carry `public-docs`, and then invokes the
L01 assertion. Shell, search and renderer receive only the resulting projection,
never the input bundle.

Locked output root is `packages/docs-portal/dist`.

The build entry accepts only strict non-artifact configuration, never artifact
paths, preloaded bundle/report objects, or bytes. Its implementation owns the
two fixed paths shown above, calls the exact TASK-548-01-L02 owner recovery
helper, and only then opens both finals without following symlinks. The loader
validates both strict schemas, exact `bundleSourceHash`/`bundleSha256` linkage
and the absence of a live recovery hazard before returning either value. A
caller cannot bypass, replace, or reorder this boundary.
This explicit A-owner workspace recovery is allowed because portal build writes
`dist`. The portal neither invokes compiler `--check` nor treats that read-only
check as a recovery command.

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
   prove byte identity;
2. build the existing TASK-548-02-L03-owned Dockerfile and thereby execute its
   frozen workspace install plus existing Admin and site builds;
3. run the resulting image with its entrypoint overridden, resolve
   `@coderso/docs-renderer` from core, assert the required renderer/target
   selector exports, parse the packaged
   `/app/core/generated/docs/coderso-docs-v2.json` as
   `coderso.docs-corpus@v2`, and prove the Admin/site build outputs exist; and
4. inspect the resulting image for the forbidden `.tmp`, promotion journal,
   member-temp, staged, or backup artifacts.

This is a read-only downstream validation of `Dockerfile`, the workspace
manifests, root lockfile, and core dependency. L02 does not edit those files
and does not own a Docker contract test; its only new tests remain the three
portal files listed above. TASK-548-05 may repeat this already-landed image
validation as a release gate without changing ownership.

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
  No hard-coded root-relative article/asset/search link is allowed.
- Static route selection comes from the validated bundle/route graph and never
  guesses a nearest document; portal route code does not add a second public
  URL resolver.
- Every visual reference resolves only when its bundle-global `visualId` has
  exactly one asset record owned by the selected
  `(docId, locale, sectionId)`. A locale-mismatched owner, duplicate global id,
  or cross-section substitution fails before HTML or asset output.
- Latest maps to exactly the configured current published version. Missing
  locale/slug emits a typed static 404 with real alternatives.

Physical output:

```text
dist/v/<version>/<locale>/<slug>/index.html
dist/latest/<locale>/<slug>/index.html
dist/search/<version>/<locale>.json
```

Alias HTML renders the same safe article as a host-independent fallback but
uses versioned canonical metadata and `noindex,follow`.
`dist/deployment/redirects.json` declares 308 alias → canonical mappings for
TASK-548-05-capable hosts.

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
- `deployment/redirects.json`: latest aliases only, no open redirects;
- `deployment/site-index.json`: strict deterministic single-release navigation
  candidate derived from the same route graph. It is not the cumulative public
  index and is never copied over retained history directly;
- version+locale search index: public-safe text/ids/paths only with checksum;
- `docs-portal-manifest.json`: the exact detached
  `DocsPortalManifestV1` control record for every route/hash and the input digest.

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
  path: string;
  bytes: number;
  sha256: string;
};

type DocsPortalVisualAssetRecordV1 = {
  visualId: string;
  docId: string;
  locale: string;
  sectionId: string;
  path: string;
  bytes: number;
  sha256: string;
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
  docId: string;
  locale: string;
  slug: string;
  exactPath: string;
  latestPath: string;
};

type DocsPortalSiteIndexCandidateV1 = {
  schema: "coderso.docs-site-index-candidate@v1";
  productVersion: string;
  sourceHash: string;
  routes: DocsPortalSiteIndexCandidateRouteV1[];
};

normalizeDocsPortalSiteIndexCandidateV1(
  value: unknown
): DocsPortalSiteIndexCandidateV1;
serializeDocsPortalSiteIndexCandidateV1(
  value: DocsPortalSiteIndexCandidateV1
): Uint8Array;
```

`sourceHash` is byte-for-byte the validated `DocsDistributionBundleV2.sourceHash`;
it is never recomputed from rendered output. `locales`, `routes`,
`visualAssets`, and `files` are unique and canonically sorted. Route records
sort by kind, product version, locale, slug, then `docId`; visual assets sort by
`(visualId, locale, docId, sectionId, path)` and require bundle-global unique
`visualId`; file records sort by normalized relative `path`. Every visual asset
joins one manifest file record by identical path/bytes/hash and one exact
localized section owner. All nested shapes reject unknown keys. Versions,
hashes, origin/base path, epoch, routes, output paths, byte counts, visual
ownership, and locale inventory are bounded and strictly normalized.

The candidate discriminator and displayed keys are exact and recursively
reject unknown. It contains exactly the current product version and distribution
`sourceHash`, has `1..50,000` routes, and its routes are unique and sorted by
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
SEO file and deployment candidate, appears exactly once with bytes and SHA-256.
The manifest carries normalized `publicOrigin` and `publicBasePath`; it is parsed
and schema-validated separately. A second exclusion, manifest self-record,
untracked output or orphan record fails. TASK-548-05 hashes the detached
manifest externally in its release manifest.

The release handoff maps byte-for-byte into
`/release-metadata/<version>/publication-capsule/`: `latest/**`,
`routing/{redirects,headers}.json`,
`global/{sitemap.xml,robots.txt,site-index.json}`, and the detached portal
manifest. The capsule's `global/site-index.json` remains this immutable
single-release candidate. TASK-548-05-L01 adds the release manifest and is sole
owner of strict canonical `DocsSearchPublicationReceiptV1` and
`DocsAssetsPublicationReceiptV1` bytes at
`receipts/{search.json,assets.json}`, projected from the detached manifest's
search file and localized `visualAssets` records.
TASK-548-05-L02 merges the verified candidate with the retained cumulative
branch index without rebuilding old pages; publication never invokes this route
builder.

## Determinism and Publication Filter

The public build boundary accepts only strict `DocsPortalBuildConfigV1`. Only
the internal post-recovery helper receives the already validated linked pair
and its `DocsDistributionBundleV2`; no caller can provide a bundle, report,
artifact path, bytes, or output root. That helper creates a filtered public
bundle with the exact shared
`selectDocumentsForPublicationTarget(bundle.documents, "public-docs")`
selector. The route graph is built only from those filtered records. For every
canonical selection L02 consumes L01's exact
`DocsPortalDocumentSelectionV1`, constructs `DocsPortalPublicProjectionV1`,
validates selection membership, version range and target presence, and passes
only that projection to shell, search and rendering. An eligible record omitted
from the projection, or an `assistant`-only, `embedded-help`-only or
missing-target record included anywhere, fails closed.

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
  slug, base path, origin, URL, manifest, headers, redirects, and search schemas.
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

export function buildDocsPortalPublicProjectionV1(
  bundle: DocsDistributionBundleV2,
  selected: DocsPortalDocumentSelectionV1
): DocsPortalPublicProjectionV1 {
  const documents = selectDocumentsForPublicationTarget(
    bundle.documents,
    "public-docs"
  );
  assertNoEligiblePublicDocumentWasOmitted(bundle.documents, documents);
  assertEveryDocumentHasPublicationTarget(documents, "public-docs");
  const publicBundle = assertDistributionBundle({
    ...bundle,
    documents,
  });
  const exactSelection = assertDocsPortalDocumentSelectionV1(
    selected,
    publicBundle
  );
  return assertDocsPortalPublicProjectionV1({
    publicationTarget: "public-docs",
    bundle: publicBundle,
    selected: exactSelection,
  });
}

export function resolveDocsPortalOutputPath(publicPath: string): string {
  const normalized = assertDocsPublicPath(publicPath);
  return resolveConfinedIndexHtmlPath(
    "packages/docs-portal/dist",
    normalized
  );
}

export async function buildDocsPortal(
  input: DocsPortalBuildConfigV1
): Promise<DocsPortalBuildReceipt> {
  const config = normalizeDocsPortalBuildConfigV1(input);
  await recoverDocsWorkspaceArtifactPromotionV1();
  const recovered = await loadAndValidateRecoveredDocsArtifactPair({
    bundlePath: "core/generated/docs/coderso-docs-v2.json",
    reportPath: ".tmp/docs-corpus/migration-report-v1.json",
  });
  return buildRecoveredDocsPortal(config, recovered);
}

if (import.meta.main) {
  await buildDocsPortal(
    readDocsPortalBuildConfigV1FromEnvironment(process.env)
  );
}

async function buildRecoveredDocsPortal(
  config: DocsPortalBuildConfigV1,
  recovered: Awaited<
    ReturnType<typeof loadAndValidateRecoveredDocsArtifactPair>
  >
): Promise<DocsPortalBuildReceipt> {
  assertBundleReportLinkage(recovered.bundle, recovered.report);
  const inputBundles = [recovered.bundle];
  const publicBundles = inputBundles.map((bundle) => ({
    ...bundle,
    documents: selectDocumentsForPublicationTarget(
      bundle.documents,
      "public-docs"
    ),
  }));
  const graph = buildPublicRouteGraph(publicBundles, config.currentVersion);
  const verifiedProjections = graph.canonicalRoutes.map((route) => ({
    route,
    publicDocs: buildDocsPortalPublicProjectionV1(
      requireInputBundleForRoute(inputBundles, route),
      route.selection
    ),
  }));
  const writer = createHashedDeterministicWriter(
    "packages/docs-portal/dist"
  );

  for (const { route, publicDocs } of verifiedProjections) {
    const publicPath = buildDocsPublicPath(route.publicRoute);
    const canonicalHref = buildDocsPublicHref({
      origin: config.publicOrigin,
      basePath: config.publicBasePath,
      route: route.publicRoute,
    });
    const outputFile = resolveDocsPortalOutputPath(publicPath);
    await writer.write(
      outputFile,
      renderStaticPortalPage(route, {
        publicDocs,
        canonicalHref,
        publicOrigin: config.publicOrigin,
        publicBasePath: config.publicBasePath,
      })
    );
  }
  for (const alias of graph.latestAliases) {
    const publicPath = buildDocsPublicPath(alias.publicRoute);
    const publicDocs = requireCanonicalProjection(verifiedProjections, alias);
    await writer.write(
      resolveDocsPortalOutputPath(publicPath),
      renderAliasFallback(alias, {
        publicDocs,
        publicOrigin: config.publicOrigin,
        publicBasePath: config.publicBasePath,
      })
    );
  }

  await emitSearchIndexes(writer, verifiedProjections, {
    publicOrigin: config.publicOrigin,
    publicBasePath: config.publicBasePath,
  });
  await emitSeoAndDeploymentArtifacts(writer, graph, {
    publicOrigin: config.publicOrigin,
    publicBasePath: config.publicBasePath,
  });
  await emitCurrentReleaseSiteIndexCandidateV1(writer, graph);
  return writer.finalizeDetachedManifestAndVerifyAllOtherFiles(graph);
}
```

**Data flow:** config-only entry → exact owner recovery → strict linked
bundle/report load → shared exact `public-docs` selector → filtered public
bundle → safe route graph → L02 exact projection producer plus membership/target
validation → projection-only shared shell/search/renderer → canonical HTML and
static search/assets → SEO/deployment metadata → hash closure manifest.

**Error handling:** a crash in `prepared`, `member-0-promoted`, or
`member-1-promoted` restores and verifies the previous pair; `verified-commit`
retains and verifies the new pair. Mixed finals, tampered journal/backup/staging/
final bytes, missing recovery material, or any attempted pre-recovery read fail
before target selection and leave portal output untouched. Duplicate
doc/slug/route, unsafe origin/path, unresolved internal ref, missing asset/hash/
alt, false locale alternate, private record, non-reproducible output, redirect
escape, or manifest mismatch aborts and cleans only the task-scoped temp build.
Never delete a broad or unresolved output path; atomically replace the validated
exact `packages/docs-portal/dist` target.

**Regression-test shape:**

- exact canonical/alias/base-path paths and traversal rejects;
- fresh-process portal entry tests for every owner promotion journal phase and
  final rename; old-pair restoration before commit, new-pair retention after
  commit, idempotent recovery, and fail-closed mixed/tampered/missing material;
- static ordering guard proving no bundle/report open, target selector, route
  builder, renderer or output writer is reachable before owner recovery passes;
- public-entry fixtures accept only the four exact configuration keys and reject
  unknown `bundle`, `report`, artifact-path, bytes, or output-root inputs before
  recovery; only the internal post-recovery helper receives the validated pair;
- executable-entry fixtures pin all four environment-to-field mappings, reject
  every missing/empty/alternate variable and malformed epoch, and prove the
  local profile maps to exact `0.0.0-test`,
  `https://docs.example.invalid`, `/docs`, and `0`;
- shared `buildDocsPublicPath`/`buildDocsPublicHref` parity and a static guard
  against a portal-owned public URL builder;
- stable translation-family `docId`, exact `(docId, locale)` uniqueness,
  hreflang over only same-`docId` actually built locales, and no fake PL;
- canonical/robots/OG/JSON-LD/anchors for a complete fixture;
- alias canonical/noindex plus same-graph redirect;
- sitemap/search/header/redirect/manifest schema and hash closure;
- detached-manifest sole-exclusion and exact reject-unknown single-release
  site-index candidate closure/order/hash;
- visual manifest records require globally unique `visualId`, exact
  `(docId, locale, sectionId)` ownership, one matching file record, and reject
  locale/cross-section substitution; fixtures are consumable by the
  TASK-548-05-L01 asset-receipt projector;
- exact `coderso.docs-portal@v1` reject-unknown shape, source-hash identity,
  canonical route/file sorting, and no manifest self-field;
- projection fixtures prove every eligible public record is retained exactly
  once, the selected document joins exactly once, and omission plus
  `assistant`-only, `embedded-help`-only or missing-target leakage fails before
  shell/search/render;
- a static call-boundary guard proves shell/search/render receive only
  `DocsPortalPublicProjectionV1`, never an input/full bundle;
- internal/publication-target/secret/unsafe URL fixtures fail;
- two builds with same epoch are byte-identical;
- changed document affects only expected route/search/manifest hashes;
- output files and tests stay below line limit where human-authored.

## Sub-Tasks

- [ ] Implement strict route/base/version/locale/slug graph helpers.
- [ ] Build deterministic static renderer/writer and latest aliases.
- [ ] Emit SEO, structured data, sitemap, robots, search, headers, redirects.
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
bun run docs:compile
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
  'const renderer = await import("@coderso/docs-renderer"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function") throw new Error("docs_renderer_exports_invalid"); const bundleFile = Bun.file("/app/core/generated/docs/coderso-docs-v2.json"); if (!(await bundleFile.exists())) throw new Error("docs_bundle_missing"); const bundle = await bundleFile.json(); if (bundle.schema !== "coderso.docs-corpus@v2") throw new Error("docs_bundle_schema_invalid"); for (const path of ["/app/core/dist/admin/index.html", "/app/core/dist/site/manifest.json"]) if (!(await Bun.file(path).exists())) throw new Error(`docker_build_output_missing:${path}`);'
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
- SEO, JSON-LD, sitemap, robots, search, CSP headers, redirects, and manifest
  validate and close through hashes.
- The detached manifest is the only self-excluded control file and externally
  bound by the release manifest.
- Same inputs/epoch reproduce byte-identical output.
- TASK-548-05 receives one immutable self-describing artifact and does not need
  portal source knowledge.

## Documentation Updates Required

Hand exact/latest routes, locale/base-path rules, detached-manifest convention,
capsule candidate mapping, SEO, deployment metadata, and build contracts to
TASK-548-05/07; this leaf edits no shared closeout documentation.
