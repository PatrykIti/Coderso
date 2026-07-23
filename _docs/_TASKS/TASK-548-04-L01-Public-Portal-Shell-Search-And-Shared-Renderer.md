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
receives an unfiltered or filtered pseudo-bundle. TASK-548-04-L02 supplies the
exact renderer-owned `DocsPublicationProjectionV1` and member key to a
build-only static shell. The branded projection, document records, renderer
props, evidence and article tree never cross the hydration boundary.

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
- server-only `packages/docs-portal/src/app/DocsPortalStaticShell.tsx`,
  client-only `packages/docs-portal/src/app/hydrateDocsPortalIslandsV1.tsx`,
  and their shared client-safe island-components module; neither entry may
  import the other;
- exact pure client contract
  `packages/docs-portal/src/app/docsPortalSiteIndexV1.ts` for the cumulative
  published-version index consumed by both the shell and TASK-548-05-L02;
- exact canonical/hash-bound
  pure `packages/docs-portal/src/app/docsPortalHydrationPayloadV1.ts` with no
  React/server/renderer/projection import plus the sole hostile normalizer;
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
  resolved only after a projection-global `visualId` joins its exact owner
  `(docId, locale, sectionId)`;
  previous/next and related docs derived only from the explicit `public-docs`
  projection's ordering.
- The build-only shell passes every required `DocsRendererProps` member with no
  default: exact branded projection/member key, strict public link context,
  verified confined PNG asset map, and explicit copy handler. It renders
  article, desktop navigation and TOC to static HTML; those nodes are never a
  hydration root.
- Search: L02 supplies one shared `buildDocsSearchIndexV1(projection)` result
  and calls renderer-owned `projectDocsClientSearchRankingV1` for the current
  version+locale. The island strictly normalizes and searches that exact
  lossless score projection through `@coderso/docs-renderer/client-search`;
  portal code owns no scorer, weights, ranking schema or document normalizer.
- Locale fallback is explicit. Selector lists only shipped locales and labels
  English fallback; it never presents a full Polish experience unless the
  selected record exists.
- The server-rendered shell embeds current-version navigation only. The header
  island
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
- Hydration is limited to exactly four sibling roots: header, search, theme and
  mobile navigation. Article, desktop navigation and the renderer-owned single
  TOC remain outside them. One strict `DocsPortalHydrationPayloadV1` normalizer
  runs before any root hydrates. Server and client call the same island element
  factory with the same normalized initial models and stable identifier prefix.
  A test-only `onRecoverableError` observer is injectable; production reports a
  bounded non-content diagnostic. Example-copy enhancement delegates from the
  manifest-bound static article DOM and reads only the exact adjacent escaped
  `<code>` text after a trusted activation; it hydrates no article component
  and accepts no serialized document props.

## Shared Renderer/Search Invariant

Portal imports the `packages/docs-renderer` package; it does not copy source or
wrap it with a permissive HTML path. L02 calls the exact renderer-owned
`createDocsPublicationProjectionV1({ sourceBundle, publicationTarget:
"public-docs" })` and `buildDocsSearchIndexV1(projection)` once per build.
Route graph, static shell, renderer, link resolver and evidence resolver reuse
that same private-branded projection object. They select articles only through
`resolveDocsPublicationDocumentV1(projection, { docId, locale })`; no portal
bundle/document/projection normalizer, structural cast or per-route brand
exists.

This preserves Help/portal parity for the same normalized target records while
keeping `sourceHash` as full-corpus provenance. Target absence, incomplete
target-internal link/evidence/reference closure, or an
`assistant`/`embedded-help`-only record fails in the shared constructor before
route/search/render. `docId` remains a translation-family identity; exact
`(docId, locale)` is unique and visual/example resolution retains exact
`(docId, locale, sectionId)` ownership.

Only `src/build/**` and build-only static-shell modules may import
`@coderso/docs-renderer/projection`, `DocsPublicationProjectionV1`,
`DocsDocumentV2`, generated corpus modules or `DocsDocumentRenderer`. The Vite
client graph and a static import guard reject those symbols/paths from every
hydration entry and transitive dependency. The only renderer subpath allowed
in the client graph is Bun-free `@coderso/docs-renderer/client-search`; islands
otherwise import only strict site-index/payload contracts and shared components.

## Security Contract

- **Endpoint visibility:** public static read-only UI; no runtime API.
- **Auth/RBAC/CSRF/rate limit:** not applicable. Build-time
  `publicationTargets` filtering is mandatory.
- **Validation:** build accepts only the strict branded publication projection;
  the client accepts only one recursively strict hash-verified hydration
  payload. No direct Markdown or unchecked JSON path exists.
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
export type DocsPortalPublicLinkContextV1 = Extract<
  DocsLinkContextV1,
  { surface: "public-docs" }
>;

export type DocsPortalStaticShellProps = {
  projection: DocsPublicationProjectionV1<"public-docs">;
  documentKey: DocsPublicationDocumentKeyV1;
  navigation: DocsPortalNavigation & {
    linkContext: DocsPortalPublicLinkContextV1;
  };
  packagedVisualAssets: readonly DocsPackagedLocalVisualAssetV1[];
  hydrationPayload: DocsPortalHydrationPayloadV1;
};

export const DOCS_PORTAL_SITE_INDEX_MAX_VERSIONS = 256 as const;
export const DOCS_PORTAL_SITE_INDEX_MAX_ROUTES_PER_VERSION = 50_000 as const;
export const DOCS_PORTAL_SITE_INDEX_MAX_BYTES = 8_388_608 as const;
export const DOCS_PORTAL_HYDRATION_MAX_BYTES = 8_388_608 as const;

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

// The portal neither defines nor wraps these renderer-owned exports.
import {
  normalizeDocsClientSearchRankingProjectionV1,
  projectDocsClientSearchRankingV1,
  searchDocsClientSearchRankingV1,
  type DocsClientSearchRankingProjectionV1,
} from "@coderso/docs-renderer/client-search";

export type DocsPortalHydrationBodyV1 = {
  page: {
    productVersion: string;
    docId: string;
    locale: string;
    publicBasePath: string;
  };
  header: DocsPortalHeaderClientModelV1;
  search: DocsClientSearchRankingProjectionV1;
  theme: {
    storageKey: "coderso.docs.theme";
    initialMode: "system";
  };
  mobileNavigation: DocsPortalMobileNavigationClientModelV1;
};

export type DocsPortalHydrationPayloadV1 = {
  schema: "coderso.docs-portal-hydration@v1";
  body: DocsPortalHydrationBodyV1;
  bodySha256: string;
};

export function createDocsPortalHydrationPayloadV1(
  value: unknown
): DocsPortalHydrationPayloadV1 {
  const body = normalizeDocsPortalHydrationBodyV1(value);
  return deepFreeze({
    schema: "coderso.docs-portal-hydration@v1",
    body,
    bodySha256: sha256DomainSeparated(
      "coderso.docs-portal-hydration-body@v1",
      serializeCanonicalDocsPortalHydrationBodyV1(body)
    ),
  });
}

export function serializeDocsPortalHydrationPayloadV1(
  value: DocsPortalHydrationPayloadV1
): Uint8Array;

export function normalizeDocsPortalHydrationPayloadV1(
  value: unknown
): DocsPortalHydrationPayloadV1 {
  const payload = normalizeRecursivelyExactHydrationEnvelope(value);
  const body = normalizeDocsPortalHydrationBodyV1(payload.body);
  assertEqual(
    payload.bodySha256,
    sha256DomainSeparated(
      "coderso.docs-portal-hydration-body@v1",
      serializeCanonicalDocsPortalHydrationBodyV1(body)
    )
  );
  return deepFreeze({ ...payload, body });
}

// packages/docs-portal/src/app/DocsPortalIslandElementsV1.tsx
export const DOCS_PORTAL_ISLAND_ROOT_IDS_V1 = [
  "docs-header-island",
  "docs-search-island",
  "docs-theme-island",
  "docs-mobile-nav-island",
] as const;
export type DocsPortalIslandRootIdV1 =
  typeof DOCS_PORTAL_ISLAND_ROOT_IDS_V1[number];

export function createDocsPortalIslandElementsV1(
  body: DocsPortalHydrationBodyV1
) {
  return {
    header: <PortalHeaderIsland model={body.header} page={body.page} />,
    search: <PortalSearchIsland index={body.search} page={body.page} />,
    theme: <PortalThemeIsland model={body.theme} />,
    mobileNavigation:
      <PortalMobileNavigationIsland model={body.mobileNavigation} />,
  } as const;
}

export type DocsPortalHydrationObserverV1 = {
  onRecoverableError(input: {
    rootId: DocsPortalIslandRootIdV1;
    error: unknown;
    componentStack: string | null;
  }): void;
};

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

// packages/docs-portal/src/app/DocsPortalStaticShell.tsx (server-only)
function prepareDocsPortalStaticShellV1(props: DocsPortalStaticShellProps) {
  const document = resolveDocsPublicationDocumentV1(
    props.projection,
    props.documentKey
  );
  const hydrationPayload =
    requireCreatedDocsPortalHydrationPayloadV1(props.hydrationPayload);
  assertHydrationPayloadMatchesStaticPageV1(
    hydrationPayload.body.page,
    document,
    props.navigation
  );
  const linkContext = normalizeDocsLinkContextV1(
    props.navigation.linkContext
  );
  assertPortalRendererLinkContext({
    linkContext,
    locale: document.locale,
    publicationTarget: props.projection.publicationTarget,
  });
  const localVisualAssets = buildVerifiedDocsLocalVisualAssetMapV1({
    projection: props.projection,
    documentKey: props.documentKey,
    packagedAssets: props.packagedVisualAssets,
  });
  return { document, hydrationPayload, linkContext, localVisualAssets };
}

function DocsPortalStaticFrameV1(input: {
  props: DocsPortalStaticShellProps;
  prepared: DocsPortalPreparedStaticShellV1;
}) {
  const { props, prepared } = input;
  return (
    <PortalStaticLandmarks>
      <ExactEmptySiblingIslandSlots ids={DOCS_PORTAL_ISLAND_ROOT_IDS_V1} />
      <PortalNavigation items={props.navigation.items} />
      <main id="main-content">
        <DocsDocumentRenderer
          projection={props.projection}
          documentKey={props.documentKey}
          linkContext={prepared.linkContext}
          localVisualAssets={prepared.localVisualAssets}
          copyExampleBody={rejectCopyInvocationDuringStaticRenderV1}
        />
      </main>
      <CanonicalJsonPayloadScript
        id="docs-hydration-payload"
        bytes={serializeDocsPortalHydrationPayloadV1(
          prepared.hydrationPayload
        )}
      />
    </PortalStaticLandmarks>
  );
}

export function DocsPortalStaticShell(props: DocsPortalStaticShellProps) {
  return <DocsPortalStaticFrameV1
    props={props}
    prepared={prepareDocsPortalStaticShellV1(props)}
  />;
}

export function renderDocsPortalStaticShell(
  props: DocsPortalStaticShellProps
): string {
  const prepared = prepareDocsPortalStaticShellV1(props);
  const elements = createDocsPortalIslandElementsV1(
    prepared.hydrationPayload.body
  );
  const frame = renderToStaticMarkup(
    <DocsPortalStaticFrameV1 props={props} prepared={prepared} />
  );
  return injectExactlyFourTrustedHydratableIslandFragmentsV1(frame, {
    header: renderToString(elements.header, {
      identifierPrefix: "docs-header-",
    }),
    search: renderToString(elements.search, {
      identifierPrefix: "docs-search-",
    }),
    theme: renderToString(elements.theme, {
      identifierPrefix: "docs-theme-",
    }),
    mobileNavigation: renderToString(elements.mobileNavigation, {
      identifierPrefix: "docs-mobile-nav-",
    }),
  });
}

// packages/docs-portal/src/app/hydrateDocsPortalIslandsV1.tsx (client-only)
function hydrateExactIslandV1(
  root: Document,
  rootId: DocsPortalIslandRootIdV1,
  element: ReactElement,
  identifierPrefix: string,
  observer: DocsPortalHydrationObserverV1
): void {
  hydrateRoot(requireExactSiblingIsland(root, rootId), element, {
    identifierPrefix,
    onRecoverableError(error, info) {
      observer.onRecoverableError({
        rootId, error, componentStack: info.componentStack ?? null,
      });
    },
  });
}

export function hydrateDocsPortalIslandsV1(
  root: Document,
  serializedPayload: Uint8Array,
  observer: DocsPortalHydrationObserverV1 =
    createBoundedProductionHydrationObserverV1()
): void {
  const raw = parseBoundedCanonicalJson(
    serializedPayload,
    DOCS_PORTAL_HYDRATION_MAX_BYTES
  );
  // The sole hostile-input normalizer runs before any hydrateRoot call.
  const payload = normalizeDocsPortalHydrationPayloadV1(raw);
  assertBytesEqual(
    serializedPayload,
    serializeDocsPortalHydrationPayloadV1(payload)
  );
  const elements = createDocsPortalIslandElementsV1(payload.body);
  hydrateExactIslandV1(root, "docs-header-island", elements.header,
    "docs-header-", observer);
  hydrateExactIslandV1(root, "docs-search-island", elements.search,
    "docs-search-", observer);
  hydrateExactIslandV1(root, "docs-theme-island", elements.theme,
    "docs-theme-", observer);
  hydrateExactIslandV1(root, "docs-mobile-nav-island",
    elements.mobileNavigation, "docs-mobile-nav-", observer);
  installStaticDocsExampleCopyDelegationV1(root);
}
```

The static shell requires the exact shared private brand and exact member key;
it performs no projection/bundle/document normalization. Only the server/build
graph imports that constructor or full records. The client graph parses one
bounded canonical payload, runs one recursive reject-unknown normalizer and
verifies its domain-separated `bodySha256` before any island mounts. The
canonical serializer uses displayed key order, normalized nested order, LF and
one final newline and escapes `<`, `>`, `&`, `/`, U+2028 and U+2029 before
hashing/embedding. Its schema excludes Markdown, sections, visual/example
records, asset bytes, renderer props and a projection/document object.
The hydration-body normalizer delegates its `search` field exactly once to
`normalizeDocsClientSearchRankingProjectionV1`; all other nested keys are
validated in that same call. Build code calls renderer-owned
`projectDocsClientSearchRankingV1` over the shared index. Its output retains
every scorer signal and the client calls the same renderer-owned pure scorer,
so portal code cannot fork Help semantics.

`docsPortalHydrationPayloadV1.ts` is the pure schema/creator/serializer/
normalizer owner. L02 imports its creator directly, never through the
server-only shell. `DocsPortalStaticShell.tsx` imports projection/renderer and
never enters the Vite client graph. `hydrateDocsPortalIslandsV1.tsx` imports
only the pure payload owner, client-search subpath and shared island elements;
it cannot import the static shell. Each island is server-rendered with
`renderToString` and its exact identifier prefix, then hydrated with the same
element/model/prefix. Fixed-slot insertion requires each empty sibling slot
exactly once and accepts only trusted React output, never corpus/raw HTML.

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

**Data flow:** L02's one shared branded `public-docs` projection + search index
→ exact member key → build-only static shell/link/assets/shared renderer →
static article/navigation/TOC HTML; separately, projection-derived bounded
header/search/theme/mobile models → canonical body bytes + domain-separated
hash → strict serialized payload → one client normalizer → four island roots.
Neither the projection nor any article/evidence props enter that payload.

**Error handling:** invalid projection blocks build/render; missing member
uses a typed not-found shell supplied by L02. A missing/unlisted/orphan/
cross-owner/tampered visual/example or asset/hash mismatch fails the selected
article build before shared render; it is never downgraded to a successful
text-only article. Only a verified image's later browser decode failure may
show its shared alt/caption fallback. Unavailable locale shows actual
alternatives. Malformed, oversized, noncanonical or hash-mismatched hydration
bytes mount zero islands and leave the complete static article/navigation/TOC
usable. Same-origin version/search failure keeps bounded current-build state.

**Regression-test shape:**

- build imports shared renderer/projection/search entries; Vite client graph
  rejects projection constructor/brand, `DocsDocumentV2`, generated corpus,
  renderer and build/static-shell imports transitively, allowing exactly
  `@coderso/docs-renderer/client-search`;
- static import tests pin pure payload → shared island → client entry and
  server-only shell as split graphs; L02 imports the creator from the pure owner;
- semantic landmarks, skip link, focus and exactly one renderer-owned static
  heading/TOC tree; no portal-owned TOC exists;
- every text/context/range/tie signal yields exact Help/client ranking parity;
- `public-docs` and multi-target records may enter the projection, while
  `assistant`-only, `embedded-help`-only, missing-target, and a selected
  out-of-projection document fail before search/render;
- shared projection fixtures reject structural/spread/serialized/foreign
  brands, non-member keys, target leakage and incomplete closure; the same
  `docId` across real locales remains valid; static shell invokes no schema
  normalizer and L02 pins one projection/search build plus identical object
  identity across every route;
- hydration schema tests reject root/nested unknown keys, wrong discriminator,
  order/encoding/size violations, duplicate navigation/search identities,
  unsafe paths and every body-hash mutation; canonical bytes reproduce exactly;
  a spy proves one hostile normalizer before any of exactly four hydrate calls,
  and invalid input causes zero calls;
- SSR fixtures prove four sibling slots, `renderToString` per island, identical
  server/client component/model/prefix, exactly four mounts, and zero observer
  calls; built-page browser evidence captures zero React hydration mismatch,
  recovery, console error or DOM replacement;
- payload allowlist/static HTML tests prove it contains no projection brand,
  Markdown, sections, visual/example records, asset bytes, renderer props,
  secret or internal path; article/nav/TOC nodes stay outside hydration roots;
- actual locale selectors and embedded current-version navigation; a bounded
  same-origin cumulative two-version index adds only exact same-document links,
  while offline, 404, oversized, malformed, hash-invalid, and cross-origin
  responses retain the current-only fallback;
- site-index fixtures pin the discriminator, exact key sets, bounds, descending
  SemVer and route order, unique `(docId, locale)`, canonical bytes, and all five
  hash/identity fields;
- localized visuals join the selected document and section by
  `(docId, locale, sectionId)` and reject a projection-global `visualId` reused by
  another owner;
- renderer integration supplies all five exact required props; strict public
  link context rejects Help discriminant/target, locale/version/base mismatch
  and unsafe links without defaults;
- packaged-asset fixtures prove confined local href, byte/SHA-256 verification,
  read-only map construction and selected-article failure for missing/extra/
  duplicate/unknown/wrong-media/tampered assets with zero remote fetch;
- delegated copy accepts only trusted keyboard/click activation, copies exact
  adjacent escaped code text, announces success/failure, and never hydrates or
  serializes the article;
- mobile navigation open/close/focus restore, narrow/wide no overflow;
- theme/reduced-motion behavior without sensitive storage;
- no raw HTML/search-highlight injection or network calls;
- all touched source/test files at most 1,000 lines.

## Sub-Tasks

- [ ] Verify the precreated frozen portal workspace, then add no manifest/lock
  mutation.
- [ ] Build accessible shell/navigation around the renderer-owned sole TOC.
- [ ] Integrate shared renderer and deterministic version/locale search through
  the exact validated `public-docs` projection, strict link context, verified
  packaged local-asset map and user-event-only copy handler.
- [ ] Add canonical hash-bound hydration payload and one pre-mount hostile
  normalizer; split pure payload/server shell/client entry and use identical
  hydratable server/client elements for exactly four sibling roots.
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
- Static shell/search consume the exact shared renderer projection/index.
- The portal supplies every non-optional renderer prop and never uses an
  implicit link, asset or copy fallback.
- Article/navigation and the sole renderer-owned TOC remain static; exactly four
  sibling roots hydrate identical SSR/client elements with zero recoverable
  mismatch, and no branded/full-document state enters client bundle/payload.
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
