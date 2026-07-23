# TASK-548-04: Official Versioned Documentation Portal
# FileName: TASK-548-04-Official-Versioned-Documentation-Portal.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Public Documentation / Static Portal / SEO
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-03, TASK-545
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Build the official public Coderso documentation portal as a deterministic static
artifact. Before its build boundary reads either generated documentation final,
it invokes the exact TASK-548-01-L02-owned
`recoverDocsArtifactPromotionV1()`, then loads and cross-validates the recovered
bundle/report pair. It applies the exact
`selectDocumentsForPublicationTarget(..., "public-docs")` selector and asks
TASK-548-04-L02 to produce the exact L01-owned
`DocsPortalPublicProjectionV1`. Only that `public-docs` projection may reach
portal shell, search or rendering. The portal reuses the
`packages/docs-renderer` target selector plus search/render/link safety
implementation shipped by TASK-548-03. It must never maintain a second authored
corpus, parse source Markdown independently or pass an unfiltered bundle to a
public consumer.

Canonical public article routes are:

```text
/v/<product-version>/<locale>/<slug>
```

The build also derives:

```text
/latest/<locale>/<slug>
```

`latest` is an alias of the selected current release, never an independent
document version. The canonical URL always points at the versioned route.

This task owns portal source, static generation, accessibility/security
validation, and browser gates. TASK-548-05 alone owns artifact packaging,
publication, hosting/CDN configuration, deployment credentials, origin selection,
release workflow integration, rollback, and bounded post-deploy availability
verification.

## Grounded Baseline and Constraints

- The repo has no public documentation application/workspace today; the Admin
  footer hard-codes `https://coderso.dev/docs` in
  `core/admin/ui/navigation/sidebarConfig.ts:167-170`.
- Root workspaces already include `packages/*`, and the current React 19, Vite
  8, TypeScript 6, and Bun stack is sufficient. Do not add a portal framework or
  Markdown renderer.
- TASK-548-02-L03 precreates and solely owns both documentation workspace package
  manifests plus root `package.json`/`bun.lock`. Portal leaves consume that frozen
  workspace state and never reopen a manifest or the lock.
- Existing public React SSR patterns and canonical head tags are visible in
  `core/site/renderPublicPage.tsx:117-137` and
  `core/site/renderPublicEntry.tsx:184-201`, but the docs portal is a separate
  static artifact rather than a CMS Page runtime.
- `docs/guide` is the single complete English end-user corpus. Locale support
  must be ready for Polish records but may emit `pl` routes/hreflang only for
  translations that actually exist.
- `docs/develop`, `_docs/`, task files, changelog, audit/smoke artifacts,
  provider configuration, Admin-only data, and internal-only developer notes
  are outside the current bundle and must never be published by this task.

## Static Artifact Contract

Workspace and command:

```text
packages/docs-portal/
bun --cwd packages/docs-portal build
```

Deterministic output:

```text
packages/docs-portal/dist/
  v/<product-version>/<locale>/<slug>/index.html
  latest/<locale>/<slug>/index.html
  assets/<content-hash>.<ext>
  search/<product-version>/<locale>.json
  sitemap.xml
  robots.txt
  docs-portal-manifest.json
  deployment/headers.json
  deployment/redirects.json
  deployment/site-index.json
```

`DocsPortalManifestV1` has exact discriminator `coderso.docs-portal@v1` and
records corpus/product versions, the distribution bundle's exact `sourceHash`,
locales, normalized public origin/base path, canonical route inventory, content
hashes, search/artifact hashes, build-input digest, and a deterministic build
epoch. `docs-portal-manifest.json` is a detached control file: it is the sole
emitted file excluded from its own sorted `files[]`; every other `dist` byte is
enumerated and SHA-256 hashed. TASK-548-04-L03 parses it separately and returns
an exact `DocsPortalValidationReceiptV1` whose externally computed
`manifestSha256` and root-closure facts bind the file without adding a
self-field. TASK-548-05 consumes that receipt and binds the manifest in
`docs-release-manifest-v1.json`.

TASK-548-05 packages the prebuilt mutable candidates without rendering them
again under the exact retained subtree:

```text
/release-metadata/<version>/publication-capsule/
```

The capsule contains both manifests, byte-identical `latest/**`,
`routing/{redirects,headers}.json`, global sitemap/robots/site-index candidates,
and canonical search/asset hash receipts. Publication and rollback only
verify/copy those bytes; the portal handoff never asks release code to rebuild
routes or HTML.

Build output is derived and is not an authored source of truth. The exact
commit/distribution hash must reproduce the same bytes when the deterministic
build epoch is held constant.

## Product and SEO Contract

- Shared shell: product/version/locale navigation, search, article/TOC, related
  links, responsive navigation, theme preference, and clear route back to the
  product site.
- Shared renderer/search: import `packages/docs-renderer`; do not fork Markdown
  rendering, ranking, URL policy, or visual/example behavior.
- Version selection never silently changes the article. Missing version/locale
  combinations show bounded alternatives or a real static 404.
- `latest` alias pages are host-independent static fallbacks with canonical
  versioned metadata; `deployment/redirects.json` additionally declares
  permanent redirects for hosts that support them.
- Every canonical page emits unique title/description, canonical, only-real
  hreflang alternates, OpenGraph metadata, breadcrumb/article JSON-LD,
  accessible landmarks, and stable heading anchors.
- Sitemap contains canonical indexable versioned routes only. Alias/404/search
  states are excluded or `noindex,follow`.
- All paths and assets are base-path safe. The build accepts one validated HTTPS
  origin and normalized base path; browser code does not guess either.
- Search is a version+locale static index. It has no dynamic API, user account,
  analytics requirement, provider request, or CMS connection.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-04-L01 | Create `packages/docs-portal`, accessible shell, version/locale search UI, and shared-renderer integration using the existing pinned root toolchain | ⏳ To Do |
| TASK-548-04-L02 | Implement deterministic route/static generation, latest aliases, SEO/structured data, manifest/hashes, sitemap/robots, and host-neutral deployment metadata | ⏳ To Do |
| TASK-548-04-L03 | Add artifact/security/accessibility validators and at least five real Playwright portal flows with screenshots and zero console errors | ⏳ To Do |

**Land order:** `TASK-548-04-L01 → TASK-548-04-L02 → TASK-548-04-L03`.
TASK-548-03 must land first so the portal imports the exact shared renderer.
Each source/test file has one leaf writer. L03 reports source defects back to
the owning L01/L02 fixer; it does not create a second implementation in a test
helper.

L03's targeted browser gate remains mandatory, but its task-local candidates
stay below `.tmp`. TASK-548-07 is the sole writer of final canonical TASK-545
evidence and `manifest.json` under
`_docs/_workflows/_smoke/evidence/task-548/`; at closure it reruns L03's seven
stable portal scenarios against the final tree and writes their exact disjoint
`portal/*.png` files before the canonical phase-1 checkpoint.

## Security Contract

- **Endpoint visibility:** public read-only static files. No runtime server/API
  endpoint and no public write.
- **Auth/RBAC:** none for public-safe documentation. Publication filtering is
  build-time and requires `publicationTargets` to include `public-docs`.
- **CSRF/rate limit:** not applicable to a static read artifact. TASK-548-05
  owns optional CDN read-rate/abuse policy.
- **Validation:** strict reject-unknown distribution, route, locale, version,
  metadata, link, visual, search, manifest, header, and redirect schemas.
- **Anti-abuse:** nonce, HMAC write signing, and reCAPTCHA are not applicable
  because there is no write. Artifact signing/distribution integrity belongs to
  TASK-548-05.
- **Content security:** no raw HTML, arbitrary iframe, inline event/style
  payload, unsafe scheme, path traversal, external runtime image, or executable
  example. CSP forbids `unsafe-inline`/`unsafe-eval`; any structured-data block
  uses exact escaped bytes and a generated hash.
- **Privacy/secrets:** no user tracking by default and no internal paths,
  prompts, provider keys, cookies, tokens, PII, source maps, build-host paths, or
  Admin permission data in output.

## Implementation Pseudocode

```tsx
export async function buildDocsPortal(
  input: DocsPortalBuildInput
): Promise<DocsPortalBuildReceipt> {
  const config = normalizePortalBuildInputWithoutReadingDocsArtifacts(input);
  await recoverDocsArtifactPromotionV1();
  const recovered = await loadAndValidateRecoveredDocsArtifactPair({
    bundlePath: "core/generated/docs/coderso-docs-v2.json",
    reportPath: ".tmp/docs-corpus/migration-report-v1.json",
  });
  const inputBundles = [assertDistributionBundle(recovered.bundle)];
  assertBundleReportLinkage(inputBundles[0], recovered.report);
  const publicBundles = inputBundles.map((bundle) => ({
    ...bundle,
    documents: selectDocumentsForPublicationTarget(
      bundle.documents,
      "public-docs"
    ),
  }));
  const routes = buildCanonicalPortalRoutes(
    publicBundles,
    config.currentVersion
  );
  const projections = routes.canonical.map((route) => ({
    route,
    publicDocs: buildDocsPortalPublicProjectionV1(
      requireInputBundleForRoute(inputBundles, route),
      route.selection
    ),
  }));
  const writer = createDeterministicArtifactWriter(config.outputRoot);

  for (const { route, publicDocs } of projections) {
    const page = renderPortalDocument(route, {
      publicDocs,
      renderer: DocsDocumentRenderer,
      origin: config.origin,
      basePath: config.basePath,
    });
    await writer.writeHtml(route.outputPath, page);
  }

  await writeLatestAliases(writer, routes.aliases);
  await writeSearchIndexes(writer, projections);
  await writeSeoAndDeploymentArtifacts(writer, routes);
  return writer.finalizeManifest();
}
```

**Data flow:** config-only input → exact owner recovery → recovered and linked
bundle/report bytes → shared exact `public-docs` selector → L02-produced and
membership-validated `DocsPortalPublicProjectionV1` records →
version/locale/slug route graph → projection-only shell/search/shared renderer →
deterministic static bytes → checksummed manifest → TASK-548-05 publish.

**Error handling:** a pre-commit recovery phase restores and verifies the prior
pair; a verified-commit phase retains and verifies the new pair. Mixed finals,
tampered journal/backup/staging/final bytes, or unrecoverable material fail
before bundle/report load, target selection, route construction, or output
write. Duplicate/malformed route or hash mismatch aborts the build; missing
translation emits no fake locale route; broken internal ref, unsafe URL,
private publication target, non-HTTPS origin, path traversal, nondeterministic
output, or manifest/file mismatch is a hard failure. One bad document cannot be
silently omitted.

**Regression-test shape:** same bundle produces byte-identical output; terminate
at every owner journal phase/final rename and prove portal entry recovery selects
only the verified old/new pair; mixed finals, tampered journal/recovery material,
and pre-recovery reads fail with zero portal output. Every manifest route/file/
hash closes; route/base-path/SemVer/locale traversal cases reject; actual
translations alone produce hreflang; latest maps to current version; shared
renderer/search parity; omission of a `public-docs` record and inclusion of an
`assistant`-only, `embedded-help`-only or missing-target record in any projection
fail before shell/search/render; hostile corpus does not create markup or links;
sitemap/robots/canonical/OG/JSON-LD correctness; keyboard/mobile/dark/
reduced-motion/offline static flows; no console/network/security violations.

## Testing Requirements

```bash
tsc -p packages/docs-renderer/tsconfig.json --noEmit
tsc -p packages/docs-portal/tsconfig.json --noEmit
bun test tests/unit/documentation/docsCorpusPromotionRecovery.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx \
  tests/vitest/docs-portal/portal-routes.test.ts \
  tests/vitest/docs-portal/portal-build.test.tsx \
  tests/vitest/docs-portal/portal-seo.test.ts \
  tests/vitest/docs-portal/portal-security.test.ts \
  tests/vitest/docs-portal/portal-accessibility.test.tsx
bun run docs:compile
bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts \
  packages/docs-portal/dist
bun --cwd core lint:types
bun --cwd core lint
bun run precommit:check
bun run scan:security
git diff --check
```

Run each named failure alone before classification. Count every touched
human-authored source/test file and fail any result above 1,000 lines.

## Acceptance Criteria

- One compiled corpus produces embedded Help/Guide metadata and the public
  portal; no duplicated source or Markdown parsing path exists.
- Canonical versioned routes, derived latest aliases, version/locale search,
  visuals/examples, and base-path-safe navigation render as static files.
- English is complete; only real translations create locale routes or hreflang.
- Portal metadata, sitemap, robots, OpenGraph, JSON-LD, manifest hashes,
  redirects, and CSP artifacts are deterministic and validated.
- Public output contains no unsafe content, internal material, secret/PII,
  runtime external dependency, or write endpoint.
- Portal build never reads a bundle/report pair before owner recovery and never
  writes output from mixed, tampered, or crash-incomplete artifact finals.
- At least five distinct Playwright flows assert visible behavior in wide,
  narrow, light, dark, keyboard, reduced-motion, version/locale, and offline
  conditions with zero console errors.
- TASK-548-07 reruns all seven stable portal flows on the final tree and is the
  sole canonical TASK-545 evidence/manifest writer.
- TASK-548-05 can publish/rollback the immutable `dist` artifact without editing
  portal source or reconstructing routes.
- TASK-548-05 verifies the deployed exact/latest routes, retained manifests and
  one hashed asset read-only after Pages reports success.

## Documentation Updates Required

The TASK-548 closure owner must update the public documentation architecture,
authoring/release handbook, security model, README/documentation hub, and
operator instructions. TASK-548-05 owns capsule layout, hosting/release,
post-deploy health and rollback documentation.
Changelog 1261 and board/status changes remain closure-only.
