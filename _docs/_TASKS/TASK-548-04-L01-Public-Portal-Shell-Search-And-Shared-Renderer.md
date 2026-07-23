# TASK-548-04-L01: Public Portal Shell, Search and Shared Renderer
# FileName: TASK-548-04-L01-Public-Portal-Shell-Search-And-Shared-Renderer.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-04
**Priority:** High
**Category:** Public Docs UI / Static App / Search
**Estimated Effort:** Large
**Dependencies:** TASK-548-03-L03; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Use the private `packages/docs-portal` workspace precreated and lock-pinned by
TASK-548-02-L03 with the repo's current React/Vite/TypeScript/Bun stack. Build
the accessible public shell and
version+locale search experience by importing the exact
`packages/docs-renderer` implementation from TASK-548-03-L02 and the exact
`DocsDistributionBundleV2` contract/output from TASK-548-01/02. The shell never
receives the unfiltered bundle directly: TASK-548-04-L02 supplies an explicit
validated `public-docs` projection.

Do not add Next.js, Astro, Docusaurus, an MDX/Markdown renderer, a search SaaS,
or another UI/content pipeline. If the current stack cannot satisfy a verified
requirement, stop and reconcile dependency, license, integrity, and
security-scan evidence with TASK-548-02-L03, the root lock owner, before adding
a package.

## Exclusive Ownership

This leaf is the only writer for:

- `packages/docs-portal/tsconfig.json`;
- `packages/docs-portal/vite.config.ts`;
- portal shell, navigation, search UI, hydration entry, styles, and static brand
  assets under `packages/docs-portal/src/app/**`,
  `packages/docs-portal/src/search/**`, and
  `packages/docs-portal/src/styles/**`;
- exact pure client contract
  `packages/docs-portal/src/app/docsPortalSiteIndexV1.ts` for the cumulative
  published-version index consumed by both the shell and TASK-548-05-L02;
- new `tests/vitest/docs-portal/portal-shell.test.tsx`;
- new `tests/vitest/docs-portal/portal-search.test.tsx`.

L02 exclusively owns `src/build/**`, `src/routes/**`, `src/seo/**`, and all
static output shaping. L01 gates the shell with typecheck/Vitest/Vite client
build and does not claim the final static generator until L02.

TASK-548-02-L03 is the sole writer of
`packages/docs-portal/package.json`, `packages/docs-renderer/package.json`, root
`package.json`, and `bun.lock`; this leaf must not create or reopen any of them.
Before implementation, assert the frozen lock already contains both workspace
records and the local portal commands. TASK-548-05 must not edit portal source;
it consumes L02 output through the predeclared package command.

## Shell Contract

- Header: Coderso Docs identity, product version selector backed by the strict
  same-origin cumulative site index, actual locale selector, search, theme
  control, and link to the product site.
- Desktop: persistent documentation navigation + article + on-page TOC without
  covering content.
- Mobile: keyboard-accessible disclosure/dialog navigation with focus trap,
  close/restore, and no horizontal overflow.
- Article: shared `DocsDocumentRenderer`; sanitized local visuals/examples
  resolved only after a bundle-global `visualId` joins its exact owner
  `(docId, locale, sectionId)`;
  previous/next and related docs derived only from the explicit `public-docs`
  projection's ordering.
- Search: shared `createDocsSearchIndex`/`searchDocs`; scoped to selected
  version+locale and called with exact target `public-docs`; title/section/
  snippet results; empty-state suggestions; query reflected in bounded URL
  state by L02 route helpers once available.
- Locale fallback is explicit. Selector lists only shipped locales and labels
  English fallback; it never presents a full Polish experience unless the
  selected record exists.
- The server-rendered shell embeds current-version navigation only. Hydration
  fetches the base-path-safe, same-origin `/site-index.json`, strictly
  normalizes its cumulative retained-version inventory, and replaces only the
  version-navigation model. A network, offline, size, schema, hash, or
  cross-origin failure keeps the current-only model. Selecting a version keeps
  the same `(docId, locale)` or shows explicit unavailability; it never chooses
  another article.
- Theme uses system preference plus an optional non-sensitive local preference.
  No corpus/query/analytics/provider/auth data enters browser storage.
- All controls have names, focus-visible states, hit targets, disabled states,
  and reduced-motion behavior.

## Shared Renderer/Search Invariant

Portal imports the `packages/docs-renderer` package; it does not copy source or
wrap it with a more permissive HTML path. The exact bundle identity/search
algorithm must produce the same document selection and safe Markdown rendering as
embedded Help for the same version/locale/query. Portal-only chrome may differ,
but article content, visual/example resolution, and URL safety do not. L02
filters the validated bundle to documents containing `public-docs` and supplies
the exact projection below. L01 revalidates that every projected document and
the selected document contain that target; target absence or an
`assistant`/`embedded-help`-only record fails closed before search or render.
`docId` is the stable translation-family identity. The unique row key is exact
`(docId, locale)`, so the same `docId` may occur once in each actually shipped
locale but never twice in one locale.
Visual resolution additionally requires exact `(docId, locale, sectionId)`
ownership while `visualId` remains unique across the whole distribution bundle.

## Security Contract

- **Endpoint visibility:** public static read-only UI; no runtime API.
- **Auth/RBAC/CSRF/rate limit:** not applicable. Build-time
  `publicationTargets` filtering is mandatory.
- **Validation:** accept only strict `DocsDistributionBundleV2`; no direct
  Markdown or unchecked JSON path.
- **Anti-abuse:** no public writes; nonce/HMAC/reCAPTCHA are not applicable.
- **Content:** shared renderer forbids raw HTML/scripts/unsafe URLs. Search
  highlights must use React text nodes, never injected markup.
- **Privacy:** no tracking by default; only theme preference may persist.
  Search query and corpus stay memory/URL local and are never sent remotely.
- **Supply chain:** no new framework/dependency. Any verified dependency need
  requires contract reconciliation with the TASK-548-02-L03 root lock owner
  before this leaf starts, plus license, integrity, and security-scan evidence.

## Implementation Pseudocode

```tsx
export type DocsPortalDocumentSelectionV1 = {
  document: DocsDocumentV2;
  locale: string;
  productVersion: string;
};

export type DocsPortalPublicProjectionV1 = {
  publicationTarget: "public-docs";
  bundle: DocsDistributionBundleV2;
  selected: DocsPortalDocumentSelectionV1;
};

export type DocsPortalShellProps = {
  publicDocs: DocsPortalPublicProjectionV1;
  navigation: DocsPortalNavigation;
};

export const DOCS_PORTAL_SITE_INDEX_MAX_VERSIONS = 256 as const;
export const DOCS_PORTAL_SITE_INDEX_MAX_ROUTES_PER_VERSION = 50_000 as const;
export const DOCS_PORTAL_SITE_INDEX_MAX_BYTES = 8_388_608 as const;

export type DocsPortalSiteIndexRouteV1 = {
  docId: string;
  locale: string;
  slug: string;
  exactPath: string;
};

export type DocsPortalSiteIndexVersionV1 = {
  productVersion: string;
  sourceHash: string;
  portalManifestSha256: string;
  releaseManifestSha256: string;
  siteIndexCandidateSha256: string;
  routes: DocsPortalSiteIndexRouteV1[];
};

export type DocsPortalSiteIndexV1 = {
  schema: "coderso.docs-site-index@v1";
  latestVersion: string;
  versions: DocsPortalSiteIndexVersionV1[];
};

export function normalizeDocsPortalSiteIndexV1(
  value: unknown
): DocsPortalSiteIndexV1;

export function serializeDocsPortalSiteIndexV1(
  value: DocsPortalSiteIndexV1
): Uint8Array;

export function assertDocsPortalDocumentSelectionV1(
  value: unknown,
  bundle: DocsDistributionBundleV2
): DocsPortalDocumentSelectionV1 {
  const selection = assertExactObjectKeys(value, [
    "document",
    "locale",
    "productVersion",
  ]);
  const document = assertDocsDocumentV2(selection.document);
  const locale = assertCanonicalBcp47(selection.locale);
  const productVersion = assertExactSemVer(selection.productVersion);
  const matches = bundle.documents.filter(
    (candidate) =>
      candidate.docId === document.docId &&
      candidate.locale === locale
  );
  if (
    document.locale !== locale ||
    matches.length !== 1 ||
    !sameNormalizedDocument(matches[0], document) ||
    !document.publicationTargets.includes("public-docs") ||
    !productVersionSatisfiesRange(
      productVersion,
      document.productVersionRange
    )
  ) {
    throw new Error("docs_portal_selection_invalid");
  }
  return { document, locale, productVersion };
}

export async function loadDocsPortalVersionNavigationV1(input: {
  current: DocsPortalVersionNavigation;
  publicBasePath: string;
  currentDocId: string;
  currentLocale: string;
}): Promise<DocsPortalVersionNavigation> {
  try {
    const url = buildSameOriginSiteIndexUrl(input.publicBasePath);
    const bytes = await fetchBoundedSameOriginBytes(
      url,
      DOCS_PORTAL_SITE_INDEX_MAX_BYTES
    );
    const index = normalizeDocsPortalSiteIndexV1(parseJson(bytes));
    return resolveSameDocumentVersionNavigation(index, {
      docId: input.currentDocId,
      locale: input.currentLocale,
    });
  } catch {
    return input.current;
  }
}

export function DocsPortalShell(props: DocsPortalShellProps) {
  const publicDocs = assertDocsPortalPublicProjectionV1(props.publicDocs);
  const searchIndex = createDocsSearchIndex(publicDocs.bundle, {
    publicationTarget: publicDocs.publicationTarget,
  });
  const [query, setQuery] = usePortalSearchQuery();
  const results = searchDocs(searchIndex, {
    query,
    version: publicDocs.selected.productVersion,
    locale: publicDocs.selected.locale,
  });
  const versionNavigation = useHydratedDocsPortalVersionNavigationV1({
    current: props.navigation.versionNavigation,
    publicBasePath: props.navigation.linkContext.publicBasePath,
    currentDocId: publicDocs.selected.document.docId,
    currentLocale: publicDocs.selected.locale,
    loader: loadDocsPortalVersionNavigationV1,
  });

  return (
    <PortalLandmarks>
      <PortalHeader
        versions={versionNavigation.versions}
        locales={props.navigation.locales}
      />
      <PortalNavigation items={props.navigation.items} />
      <main id="main-content">
        <PortalSearchResults query={query} results={results} />
        <DocsDocumentRenderer
          bundle={publicDocs.bundle}
          document={publicDocs.selected.document}
          publicationTarget={publicDocs.publicationTarget}
          linkContext={props.navigation.linkContext}
        />
      </main>
      <PortalTableOfContents sections={publicDocs.selected.document.sections} />
    </PortalLandmarks>
  );
}
```

Both assertions are recursively reject-unknown. The selection assertion
delegates the nested document to the exact `DocsDocumentV2` normalizer, requires
canonical locale and SemVer bytes, and proves exact normalized membership in the
supplied projection bundle by `(docId, locale)`. The projection assertion owns
only the displayed three keys, calls this selection assertion, and rejects a
selected version outside `document.productVersionRange`.

The site-index normalizer is also recursively reject-unknown. It accepts
`1..256` unique versions sorted by descending SemVer precedence, requires
`latestVersion` to match exactly one entry, lowercase SHA-256 fields, and
`1..50,000` routes per version sorted by `(locale, slug, docId)`. Route
`(docId, locale)` pairs and `exactPath` values are unique within a version;
every path is the canonical base-free `/v/<that-version>/<locale>/<slug>` path.
The canonical serializer preserves the displayed key order, canonical nested
order, LF, and one final newline. It does not normalize malformed order into an
accepted remote response. TASK-548-05-L02 imports these exact functions for its
sole-writer cumulative merge rather than duplicating the schema.

**Data flow:** strict compiled bundle → L02 exact `public-docs` projection →
L01 projection revalidation → shared search index/renderer with explicit
`public-docs` target → semantic static/hydratable React output.

**Error handling:** invalid bundle blocks build/render; missing selected article
uses a typed not-found shell supplied by L02; missing visual uses shared alt/
caption fallback; unavailable locale shows actual alternatives; search failure
leaves article/navigation usable.

**Regression-test shape:**

- imports shared renderer/search entry (static guard against copied
  implementation);
- semantic landmarks, skip link, heading/TOC order, focus and labels;
- same query/bundle yields parity with embedded search;
- `public-docs` and multi-target records may enter the projection, while
  `assistant`-only, `embedded-help`-only, missing-target, and a selected
  out-of-projection document fail before search/render;
- exact selection fixtures reject root/nested unknown keys, duplicate
  `(docId, locale)`, locale/document mismatch, non-member document, invalid or
  out-of-range product version, and missing `public-docs`; the same `docId`
  across two real locales remains valid;
- actual locale selectors and embedded current-version navigation; a bounded
  same-origin cumulative two-version index adds only exact same-document links,
  while offline, 404, oversized, malformed, hash-invalid, and cross-origin
  responses retain the current-only fallback;
- site-index fixtures pin the discriminator, exact key sets, bounds, descending
  SemVer and route order, unique `(docId, locale)`, canonical bytes, and all five
  hash/identity fields;
- localized visuals join the selected document and section by
  `(docId, locale, sectionId)` and reject a bundle-global `visualId` reused by
  another owner;
- mobile navigation open/close/focus restore, narrow/wide no overflow;
- theme/reduced-motion behavior without sensitive storage;
- no raw HTML/search-highlight injection or network calls;
- all touched source/test files at most 1,000 lines.

## Sub-Tasks

- [ ] Verify the precreated frozen portal workspace, then add no manifest/lock
  mutation.
- [ ] Build accessible responsive shell/navigation/article/TOC.
- [ ] Integrate shared renderer and deterministic version/locale search through
  the exact validated `public-docs` projection.
- [ ] Add theme/reduced-motion and locale-fallback UX.
- [ ] Add focused shell/search tests without editing root package/lock files.

## Testing Requirements

```bash
bun install --frozen-lockfile
tsc -p packages/docs-renderer/tsconfig.json --noEmit
tsc -p packages/docs-portal/tsconfig.json --noEmit
bunx vitest run --config vitest.config.ts \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bunx vite build --config packages/docs-portal/vite.config.ts
bun run precommit:check
find packages/docs-portal/src/app packages/docs-portal/src/search \
  packages/docs-portal/src/styles \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \
  -o -name '*.json' -o -name '*.svg' \) -exec wc -l {} +
wc -l packages/docs-portal/tsconfig.json \
  packages/docs-portal/vite.config.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx
git diff --check
```

Inventory every L01-owned human-authored text file, including TS, TSX, CSS,
configuration and text brand assets; every count must be at most 1,000.
Re-run named failures alone before classification.

## Acceptance Criteria

- The portal workspace compiles with the current repo stack and no unnecessary
  dependency/framework.
- Shell/search consume the exact shared renderer and exact compiled bundle.
- Wide/narrow, keyboard/focus, theme, reduced-motion, real locale fallback, and
  empty/error states are accessible and tested.
- The selector consumes the cumulative same-origin retained-version index
  online and remains current-only offline without silently changing the
  selected `(docId, locale)`.
- Search/article rendering creates no remote runtime dependency or unsafe
  markup.
- Root `package.json` and `bun.lock` remain untouched under the exclusive
  TASK-548-02-L03 ownership, as do both documentation workspace manifests.

## Documentation Updates Required

Hand the frozen-workspace assertion, portal shell, local-search, renderer, and
bundle-boundary contract to TASK-548-07; this leaf edits no shared closeout
documentation.
