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
TASK-548-02-L02 with the repo's current React/Vite/TypeScript/Bun stack. Build
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
security-scan evidence with TASK-548-02-L02, the root lock owner, before adding
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

TASK-548-02-L02 is the sole writer of
`packages/docs-portal/package.json`, `packages/docs-renderer/package.json`, root
`package.json`, root `bun.lock` and the Dockerfile; this leaf must not create or
reopen any of them.
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
  A test-only `onRecoverableError` observer is injectable. The production
  observer emits exactly the console error code
  `docs_portal_hydration_recoverable_error` plus the bounded root ID, never the
  raw error, component stack, payload, or content; browser gates treat any such
  event as failure. Example-copy enhancement delegates from the
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
  requires contract reconciliation with the TASK-548-02-L02 root lock owner
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
  emittedVisualAssets: readonly DocsLocalVisualAssetV1[];
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
  notFoundSha256: string;
  cloudflareHeadersSha256: string;
  clientAssetsManifestSha256: string;
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

export type DocsPortalHydrationPageV1 =
  | {
      kind: "article";
      productVersion: string;
      docId: string;
      locale: string;
      publicBasePath: string;
    }
  | {
      kind: "not-found";
      productVersion: string;
      locale: string;
      publicBasePath: string;
    };

export type DocsPortalHydrationBodyV1 = {
  page: DocsPortalHydrationPageV1;
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

export const DOCS_PORTAL_HYDRATION_BODY_HASH_DOMAIN_V1 =
  "coderso.docs-portal-hydration-body@v1" as const;
export function hashDocsPortalHydrationBodyV1(
  body: DocsPortalHydrationBodyV1
): string;

export function createDocsPortalHydrationPayloadV1(
  value: unknown
): DocsPortalHydrationPayloadV1 {
  const body = normalizeDocsPortalHydrationBodyV1(value);
  return deepFreeze({
    schema: "coderso.docs-portal-hydration@v1",
    body,
    bodySha256: hashDocsPortalHydrationBodyV1(body),
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
    hashDocsPortalHydrationBodyV1(body)
  );
  return deepFreeze({ ...payload, body });
}

export function hashDocsPortalHydrationBodyV1(body: DocsPortalHydrationBodyV1) {
  const canonical = serializeCanonicalDocsPortalHydrationBodyV1(body);
  return sha256LowerHex(concat(utf8(DOCS_PORTAL_HYDRATION_BODY_HASH_DOMAIN_V1),
    nul(), u64be(canonical.length), canonical));
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

export function createBoundedProductionHydrationObserverV1():
  DocsPortalHydrationObserverV1 {
  return {
    onRecoverableError({ rootId }) {
      console.error("docs_portal_hydration_recoverable_error", { rootId });
    },
  };
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

// packages/docs-portal/src/app/DocsPortalStaticShell.tsx (server-only)
function prepareDocsPortalStaticShellV1(props: DocsPortalStaticShellProps) {
  const document = resolveDocsPublicationDocumentV1(
    props.projection,
    props.documentKey
  );
  const hydrationPayload =
    requireCreatedDocsPortalHydrationPayloadV1(props.hydrationPayload);
  assertHydrationPayloadMatchesStaticPageV1(
    requireArticleHydrationPageV1(hydrationPayload.body.page),
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
    emittedAssets: props.emittedVisualAssets,
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
`hashDocsPortalHydrationBodyV1` is the sole hash owner and consumes those exact
serialized bytes, including the final LF. It hashes
`UTF8(DOCS_PORTAL_HYDRATION_BODY_HASH_DOMAIN_V1) || 0x00 ||
u64be(canonicalBytes.length) || canonicalBytes`, with unsigned big-endian length,
no other separator/BOM, and lowercase output. The framing test for canonical
bytes `{}\n` is
`63d0ad7fe1678435b0769f16711eedda94712e86915ebc353306f208fbaa2f2c`.
Independent build creator and browser normalizer tests pin this vector, the
synchronous browser-safe SHA-256 implementation against Node/WebCrypto vectors,
and reject domain/length/body/escaping/final-LF mutations before any mount.
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

The `not-found` page kind is reserved for L02's one deterministic root
`404.html`; it carries no requested URL or synthetic `docId`. Its four islands
receive the same bounded current-version header/search/theme/mobile models and
client assets as article pages, while same-document version resolution is
disabled. The static 404 body owns route-graph-derived locale, version, and
documentation-home alternatives; client code never guesses or reflects an
untrusted missing path.

Every emitted visual uses the contracts-owned opaque key exactly
`docs-png-sha256-<lowercase 64-hex sha256>`; the key contains no source/output
path and must match the record's `sha256` byte-for-byte.

The site-index normalizer is also recursively reject-unknown. It accepts
`1..256` unique versions sorted by descending SemVer precedence, requires
`latestVersion` to match exactly one entry, lowercase SHA-256 fields, and
`1..50,000` routes per version sorted by `(locale, slug, docId)`. Route
`(docId, locale)` pairs and `exactPath` values are unique within a version;
every path is the canonical base-free `/v/<that-version>/<locale>/<slug>` path.
The canonical serializer preserves the displayed key order, canonical nested
order, LF, and one final newline. It does not normalize malformed order into an
accepted remote response. TASK-548-05-L02 imports these exact functions for its
sole-writer cumulative merge rather than duplicating the schema. Each
version's `notFoundSha256`, `cloudflareHeadersSha256`, and
`clientAssetsManifestSha256` must join those three exact detached portal-
manifest file records. Publication and rollback copy the bound bytes; they
never infer or rebuild these identities.

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
  unsafe paths and every body-hash mutation; canonical bytes and the fixed
  creator/browser framing vector reproduce exactly;
  the strict page union accepts only article-with-`docId` or not-found-without-
  `docId`/requested path, and not-found disables same-document resolution;
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
  identity fields plus exact 404, `_headers`, and client-manifest hashes;
- localized visuals join the selected document and section by
  `(docId, locale, sectionId)` and reject a projection-global `visualId` reused by
  another owner;
- renderer integration supplies all five exact required props; strict public
  link context rejects Help discriminant/target, locale/version/base mismatch
  and unsafe links without defaults;
- emitted-asset fixtures prove only `{ outputKey, href, mediaType, sha256 }`
  reaches the shell, with confined local href/SHA-256 verification,
  read-only map construction and selected-article failure for missing/extra/
  duplicate/unknown/wrong-media/tampered assets with zero remote fetch;
- delegated copy accepts only trusted keyboard/click activation, copies exact
  adjacent escaped code text, announces success/failure, and never hydrates or
  serializes the article;
- mobile navigation open/close/focus restore, narrow/wide no overflow;
- theme/reduced-motion behavior without sensitive storage;
- no raw HTML/search-highlight injection or network calls;
- standalone Vite gate writes only to a validated task-scoped `outDir`, closes
  its manifest, and proves a pre-existing or absent live `dist` is unchanged;
- all touched source/test files at most 1,000 lines.

## Sub-Tasks

- [ ] Verify the precreated frozen portal workspace, then add no manifest/lock
  mutation.
- [ ] Build accessible shell/navigation around the renderer-owned sole TOC.
- [ ] Integrate shared renderer and deterministic version/locale search through
  the exact validated `public-docs` projection, strict link context, verified
  path/byte-free emitted local-asset map and user-event-only copy handler.
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
task548_l01_vite_parent="$(realpath "${TMPDIR:-/tmp}")"
task548_l01_vite_tmp="$(
  mktemp -d "$task548_l01_vite_parent/coderso-task548-l01-vite.XXXXXX"
)"
task548_l01_vite_real="$(realpath "$task548_l01_vite_tmp")"
case "$task548_l01_vite_real" in
  "$task548_l01_vite_parent"/coderso-task548-l01-vite.*) ;;
  *) exit 1 ;;
esac
task548_l01_live_state="absent"
if test -d packages/docs-portal/dist; then
  task548_l01_live_state="present"
  mkdir "$task548_l01_vite_real/live-before"
  cp -R packages/docs-portal/dist/. \
    "$task548_l01_vite_real/live-before/"
elif test -e packages/docs-portal/dist; then
  exit 1
fi
task548_l01_vite_cleanup() {
  case "$task548_l01_vite_real" in
    "$task548_l01_vite_parent"/coderso-task548-l01-vite.*)
      rm -rf -- "$task548_l01_vite_real" ;;
  esac
}
trap task548_l01_vite_cleanup EXIT
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bunx vite build --config packages/docs-portal/vite.config.ts \
    --outDir "$task548_l01_vite_real/vite" --emptyOutDir
test -f "$task548_l01_vite_real/vite/client-manifest.json"
if test "$task548_l01_live_state" = "present"; then
  diff -qr "$task548_l01_vite_real/live-before" \
    packages/docs-portal/dist
else
  test ! -e packages/docs-portal/dist
fi
bun run precommit:check
git diff --check
```

- the canonical NUL-safe line-count gate over the leaf write set (identical
  contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  with `exit 1`, including a non-newline final line; the baseline spans the
  full task/family dirty scope and commits/staging do not narrow it):

  ```bash
  # Canonical NUL-safe line-count gate over the leaf write set (identical
  # contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  # with exit 1, including a non-newline final line). The verified pre-family
  # baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
  # commits/staging cannot narrow the measured scope.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```

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
  TASK-548-02-L02 ownership, as do all three documentation workspace manifests.

## Documentation Updates Required

Hand the frozen-workspace assertion, portal shell, local-search, renderer, and
bundle-boundary contract to TASK-548-07; this leaf edits no shared closeout
documentation.
