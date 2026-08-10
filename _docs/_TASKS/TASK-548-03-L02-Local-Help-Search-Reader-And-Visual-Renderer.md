# TASK-548-03-L02: Local Help Search, Reader and Visual Renderer
# FileName: TASK-548-03-L02-Local-Help-Search-Reader-And-Visual-Renderer.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-03
**Priority:** High
**Category:** Admin Help / Documentation UI / Accessibility
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-02-L02 (sole owner of the package manifests and
ALL dependency-bearing toolchain bytes — see its file); TASK-548-03-L01;
TASK-547 terminal (parent literal-overlap amendment per the parent handoff)
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Implement a complete local `/admin/help` experience from the exact validated
`DocsDistributionBundleV2` produced by TASK-548-01/02. In this same leaf, add
the Help route module and replace the external footer `Docs` link with the
working local route.

Build reusable, Bun-free search and safe React rendering primitives under
`packages/docs-renderer`. TASK-548-04 consumes that exact package for the
official portal; no content/rendering fork is allowed. Import the L01-owned
`selectDocumentsForPublicationTarget` function and re-export it through
`@coderso/docs-renderer`; this leaf must not redefine its filter or ordering.
This leaf also owns one branded `DocsPublicationProjectionV1` boundary: it must never be cast or reconstructed as `DocsDistributionBundleV2`. It contains only
strict browser-safe records for one literal publication target while retaining
the full source bundle's `sourceHash` as provenance. Search, links, evidence
and rendering consume this projection and never normalize a filtered
pseudo-bundle or receive source/asset filesystem paths.

## Exclusive Ownership

This leaf is the only writer for:

- new `packages/docs-renderer/src/**` and
  `packages/docs-renderer/tsconfig.json`; the package manifest is frozen by
  TASK-548-02-L02;
- new Bun-free
  `core/admin/app/routes/help.admin-route-descriptor.ts`;
- new Bun-free
  `core/admin/app/routes/help.admin-control-descriptor.ts`;
- new `core/admin/app/routes/help.admin-route.tsx`;
- new `core/admin/ui/help/**`, including build-only `helpBuildAssetVerification.ts`;
- new `core/services/documentation/help/embeddedHelpVitePlugin.ts` plus exact docs-plugin registration and image-root `server.fs.allow` orchestration in `core/vite.config.ts`;
- `core/admin/ui/navigation/sidebarConfig.ts`;
- new `tests/vitest/docs/docs-renderer.test.tsx`;
- new `tests/vitest/docs/docs-search.test.ts`;
- new `tests/vitest/docs/docs-public-links.test.ts`;
- new `tests/vitest/ui-integration/docs-help-host-adapter.test.ts`;
- new `tests/vitest/docs/help-visual-asset-registry.test.ts`;
- new `tests/unit/documentation/helpBuildAssetVerification.test.ts` and `tests/unit/documentation/embeddedHelpVitePlugin.test.ts`;
- new `tests/vitest/ui-integration/help-center.test.tsx`;
- Help-specific assertions in `tests/vitest/ui/admin-shell-nav.test.tsx`.

It must not edit L01's `adminRouteRegistry.tsx`, `AdminApp.tsx`,
`adminPaths.ts`, or core route module. The new Help descriptor is discovered by
the stable L01 registry seam. TASK-548-02-L02 is the sole writer of
`packages/docs-renderer/package.json`, `packages/docs-portal/package.json`, root
`package.json`, root `bun.lock` and the Dockerfile (plus all other
dependency-bearing toolchain bytes); this leaf must not create or reopen them.

## Renderer Workspace Activation Gate

TASK-548-02-L02 deliberately validated only the renderer manifest, frozen
workspace install, dependency declaration, and Docker preinstall wiring because
this source package did not exist at that earlier land point. After this leaf
has created all `packages/docs-renderer/src/**` files and its `tsconfig.json`,
it is the first leaf allowed to execute the frozen manifest contract.

The targeted gate must run exactly:

```bash
bun --cwd packages/docs-renderer check
bun --cwd core --eval 'const renderer = await import("@coderso/docs-renderer"); const projection = await import("@coderso/docs-renderer/projection"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.buildDocsSearchIndexV1 !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function" || typeof projection.createDocsPublicationProjectionV1 !== "function") throw new Error("docs_renderer_exports_invalid")'
```

The first command exercises the exact pre-existing manifest `check` script.
The second resolves the workspace package from core and imports two required
public exports through `@coderso/docs-renderer`, not through a relative source
path. `tests/vitest/docs/docs-renderer.test.tsx`, which this leaf solely owns,
also pins those named exports and their usable behavior. No command here builds
the future portal or the final Docker image, and this runtime validation grants
no write ownership of TASK-548-02-L02's manifests, lockfile, core dependency,
or Dockerfile.

The Core-only `core/admin/ui/help/docsHelpHostAdapter.ts` owns canonical Admin
path resolution and RBAC evaluation. `@coderso/docs-renderer` may import only
`@coderso/docs-contracts`; it never imports Core, `adminPaths`, auth state or the
live permission catalog and receives only an already-resolved safe host action.

The pure Help file exports exactly:

```ts
export const HELP_ADMIN_ROUTE_DESCRIPTORS_V1 = [{
  schema: "coderso.admin-route-descriptor@v1",
  routeId: "help.home",
  moduleId: "help",
  moduleOrder: 900,
  routeOrder: 0,
  pattern: "/help",
  visibility: "authenticated",
  permissionRequirement: null,
  capabilityIds: ["docs.area.getting-started"],
}] as const satisfies readonly AdminRouteDescriptorV1[];
```

The paired pure control file exports exactly
`HELP_ADMIN_CONTROL_DESCRIPTORS_V1` with stable controls
`docs.control.help.search` (`controlIdInRoute: "search"`) and
`docs.control.help.open-section` (`controlIdInRoute: "open-section"`), both
joined to `help.home`, `docs.area.getting-started`, null route permission, and
their exact documentation feature-source IDs. It imports L01's control
contract, contains no React/labels/prose, and is consumed by the same final
composition/coverage inventory as the core control export.

`docs.area.getting-started` is the reviewed existing exact TASK-548-01
capability-catalog member for this route. The descriptor normalizer and coverage
gate must require exact catalog membership and reject any invented alias; this
task does not expand the catalog.
The discovered `help.admin-route.tsx` module exports only the named
`descriptors` and `bindings` values required by L01's exact eager-module shape.
It has no default export or other module key.

## Help UX Contract

- Route: canonical `/admin/help`, authenticated by the existing Admin shell,
  with no additional permission requirement.
- URL state: bounded `docId`, canonical BCP-47 `locale`, `sectionId`, and `q`
  query parameters produced by L01 helpers. Back/forward restores the exact
  localized article, section, and query; a bare `docId + sectionId` is never a
  document selector.
- Layout: search, categorized results, article navigation/TOC, readable content,
  visual/example cards, version/locale indicator, and related links.
- Keyboard: skip link, semantic landmarks, visible focus, search/result/TOC
  traversal, Escape for dismissible visual detail, and focus restoration.
- Responsive: useful at narrow and wide Admin breakpoints; visuals never force
  horizontal page overflow. Light/dark use current Admin tokens.
- Locale: prefer requested available locale; otherwise fall back explicitly to
  English with a visible language notice. Never advertise a missing Polish
  translation.

## Verified Publication Projection Contract

`packages/docs-renderer/src/publicationProjection.ts` exclusively owns these
exports:

```ts
export type DocsPublicationSurfaceTargetV1 =
  import("@coderso/docs-contracts").DocsPublicationSurfaceTargetV1;
export type DocsPublicationDocumentKeyV1 = { docId: string; locale: string };
export type DocsPublicationLinkResolutionV1 = Readonly<{
  sourceDocId: string; sourceLocale: string; sourceSectionId: string; rawHref: string;
  targetDocId: string; targetLocale: string;
  targetSectionId: string | null; fragment: string | null;
}>;
const docsPublicationProjectionBrandV1: unique symbol =
  Symbol("coderso.docs-publication-projection@v1");
export type DocsPublicationProjectionV1<
  T extends DocsPublicationSurfaceTargetV1 = DocsPublicationSurfaceTargetV1
> = Readonly<{
  schema: "coderso.docs-publication-projection@v1"; publicationTarget: T;
  corpusVersion: string; defaultLocale: string; supportedLocales: readonly string[];
  sourceHash: string;
  documents: readonly DocsPublicationDocumentV1[];
  linkResolutions: readonly DocsPublicationLinkResolutionV1[];
  readonly [docsPublicationProjectionBrandV1]: true;
}>;
export type DocsPublicationProjectionPayloadV1<
  T extends DocsPublicationSurfaceTargetV1
> = Readonly<{
  schema: "coderso.docs-publication-projection-payload@v1";
  publication: DocsPublicationPayloadV1<T>;
  linkResolutions: readonly DocsPublicationLinkResolutionV1[];
  projectionSha256: string;
}>;
export function createDocsPublicationProjectionV1<
  T extends DocsPublicationSurfaceTargetV1
>(value: { sourceBundle: unknown; publicationTarget: T }):
  DocsPublicationProjectionV1<T>;
export function serializeDocsPublicationProjectionV1<T extends
  DocsPublicationSurfaceTargetV1>(
  projection: DocsPublicationProjectionV1<T>
): DocsPublicationProjectionPayloadV1<T>;
export function createDocsPublicationProjectionFromPayloadV1<T extends
  DocsPublicationSurfaceTargetV1>(
  value: unknown, expectedTarget: T
): DocsPublicationProjectionV1<T>;
export function resolveDocsPublicationDocumentV1(projection:
  DocsPublicationProjectionV1, key: DocsPublicationDocumentKeyV1):
  DocsPublicationDocumentV1;
export function listDocsPublicationDocumentKeysV1(
  projection: DocsPublicationProjectionV1
): readonly DocsPublicationDocumentKeyV1[];
export function buildDocsSearchIndexV1(projection: DocsPublicationProjectionV1):
  DocsSearchIndexV1;
```

The full-source constructor accepts only exact
`{ sourceBundle, publicationTarget }` keys, calls the TASK-548-01-L01-owned
`normalizeDocsDistributionBundleV2(sourceBundle)` exactly once, applies the
exact shared selector once, verifies source closure, then calls the contracts-
owned projector to structurally omit every document `sourcePath` and visual
`assetPath`, replacing each asset path with its deterministic opaque
`outputKey`. Before those paths are discarded it parses the selected sections
once and builds the exact path-free link table below. It preserves full-bundle
metadata and `sourceHash`; that hash is full-corpus provenance.

Before adding its non-enumerable module-private symbol and deeply freezing the
result, the constructor proves all of the following over the filtered records:
exact selector completeness and order; target membership; unique
`(docId, locale)` and global evidence ids; document/section/visual/example
ownership; ordered `visualIds`/`exampleIds`; and complete internal
link/evidence/reference closure inside the same target projection. A relative
reference to a document omitted by target filtering is a construction error,
not a cross-target fallback. The private brand symbol and brand factory are not
exported; structural lookalikes, serialized/deserialized objects, spread
copies, foreign brands and mutated values fail at every consumer boundary.

Serialization calls contracts-owned `createDocsPublicationPayloadV1`, wraps it
with the link table, then calls the same package's
`hashDocsCanonicalJsonBodyV1(DOCS_PUBLICATION_PROJECTION_BODY_HASH_DOMAIN_V1,
body)`. Thus projection hash bytes use L01's exact RFC-8785/no-LF/domain+NUL+
u64-length framing and fixed `{}` vector; renderer defines no hash fork. It emits
no brand/corpus/path/non-target record. Publication visuals carry the
compiler-derived `scenarioStepSearchText`; the search index consumes only that
compiled field, and no raw scenario bytes enter the projection or Admin
chunks. The browser recursively normalizes once,
rechecks both hashes/target/order/closure and brands safe DTOs. Exact-key tests
reject full-source/path rows plus domain/length/body/final-LF mutations.

`resolveDocsPublicationDocumentV1` and the key-list helper validate the brand;
the resolver also requires one canonical member without re-normalizing it.
`buildDocsSearchIndexV1` is a pure deterministic projection-to-index function:
it validates the private brand, reads only projection members and never calls a
bundle/document normalizer or selector. Embedded Help constructs one projection
and one search index in trusted module memory per installed bundle identity.
The portal constructs them once in its build/SSR process and never serializes
or hydrates the brand. Portal build code imports the constructor through exact
`@coderso/docs-renderer/projection`; its Vite boundary must reject that subpath,
the brand, full source types or contracts normalizers from every hydration
client entry. Renderer/search/portal consume only the branded safe projection.

## Local Search Contract

Build one immutable index per projection identity. The renderer exclusively
owns Bun-free `packages/docs-renderer/src/clientSearch.ts`, exported only as
`@coderso/docs-renderer/client-search`. It has no React, Bun, DB, bundle,
document, projection-brand, generated-corpus, runtime or provider import and
exports:

```ts
export type DocsClientSearchRankingRecordV1 = {
  docId: string; locale: string; slug: string; sectionId: string;
  publicPath: string;
  titleTokens: string[]; keywordTokens: string[];
  adminScreenPhraseTokens: string[]; canonicalAdminPath: string | null;
  headingTokens: string[];
  bodyTokens: string[]; visualCaptionAltTokens: string[];
  scenarioStepTokens: string[]; exampleLabelTokens: string[]; productArea: string;
  capabilityIds: string[]; curatedOrder: number | null;
  localeCompatibility: "selected" | "english-fallback";
  versionCompatibility: "exact" | "range";
  tieBreak: { locale: string; docId: string; sectionId: string };
};
export type DocsClientSearchRankingProjectionV1 = {
  schema: "coderso.docs-client-search-ranking@v1";
  productVersion: string; locale: string;
  records: DocsClientSearchRankingRecordV1[];
};
export function projectDocsClientSearchRankingV1(
  index: DocsSearchIndexV1, scope: { productVersion: string; locale: string }
): DocsClientSearchRankingProjectionV1;
export function normalizeDocsClientSearchRankingProjectionV1(value: unknown):
  DocsClientSearchRankingProjectionV1;
export function searchDocsClientSearchRankingV1(
  index: DocsClientSearchRankingProjectionV1, input: DocsSearchInput
): readonly DocsSearchResult[];
```

The projection retains every public score input used by `searchDocs`: exact
title/keyword/admin-screen phrase; normalized title/heading/body;
caption+alt, compiler-derived scenario-step and example-label tokens;
product-area and bounded exact `capabilityIds`
context; exact locale/version compatibility; and total
`locale, docId, sectionId` tie break. It contains no Markdown/full record/
private path/brand/raw scenario DSL or fixture bytes. Both APIs call one shared
scorer; the client cannot omit or
reweight a signal. Unicode/case/diacritic/whitespace normalization and query/
result/snippet/token clamps are shared. Empty query returns curated navigation.
Search calls no DB, Assistant, provider, portal, analytics or network service.
`scenarioStepTokens` is derived only from the compiled
`visual.scenarioStepSearchText` projection in the publication records; the
search index never reads scenario files and never re-derives tokens from the
scenario DSL, so locators, `fixtureValueRef`, expected values and watch paths
can never become searchable or leak into the client projection.

The Help bootstrap requests literal `embedded-help`. Target absence fails
closed. A multi-target document is eligible when it contains `embedded-help`;
`assistant`-only and `public-docs`-only documents are neither indexed nor
directly renderable in Help. TASK-548-04 is the sole portal consumer of a
literal `public-docs` projection.

## Safe Renderer and Link Policy

The renderer accepts only a branded `DocsPublicationProjectionV1` plus an exact
member key. It resolves the already-normalized `DocsPublicationDocumentV1`/
`DocsSectionV2` internally, parses each exact `bodyMarkdown` through the shared
TASK-548-01 closed Markdown parser, and maps its safe internal token stream to
React elements. The token stream is an implementation detail, not a second
persisted docs schema. It must:

- never use `dangerouslySetInnerHTML`;
- import the sole owner parser export `parseSafeMarkdownSection` from
  TASK-548-01-L01; never define an alias parser or alternate parse path;
- import and render the exact owner `DocsInlineTokenV1`,
  `DocsBlockTokenV1`, `DocsCalloutTokenV1`, and `DocsTableTokenV1` unions;
  never define a parallel token shape;
- treat `section.visualIds` and `section.exampleIds` as the only ordered
  evidence-card inputs. Markdown image syntax and raw/inline HTML remain
  forbidden parser input, so a visual or example can never emerge implicitly
  from a Markdown token;
- resolve every listed visual only inside the projection through the exact
  `{ docId, locale, sectionId, visualId }` owner and every listed example only
  through `{ docId, locale, sectionId, exampleId }`. The localized document,
  section list, nested record and projection-global ID index must agree exactly;
  a cross-document, cross-locale, cross-section, duplicate, missing, unlisted or
  orphan record fails closed;
- hash PNG bytes only at portal/server or Help Vite build trust boundaries.
  Only byte-free `{ outputKey, href, mediaType, sha256 }` reaches the
  renderer/`<img>`; require non-empty alt and exact caption;
- reject unsupported Markdown syntax, missing asset hashes, path traversal,
  `data:`, `javascript:`, protocol-relative, inline SVG/HTML, arbitrary
  iframe/media, and event/style payloads;
- resolve local Help links with L01 helpers, Admin actions with
  `resolveAdminHref`/`AdminLink`, and official links with a validated HTTPS base
  origin plus version/locale/slug;
- render examples only as React-escaped, inert text/structured-data cards with
  a `type="button"` copy action for the exact body. Never evaluate, execute,
  preview, submit or turn an example into a CMS mutation control.

### Exact section heading, TOC and deep-link contract

The shared renderer renders every normalized section; it may not collapse the
stored section heading into body Markdown. For each section, the DOM heading
`id` is the exact validated `section.sectionId`, its text is the exact stored
`section.heading`, and its native element is selected by an exhaustive static
switch over stored `section.level` (`1 -> h1`, `2 -> h2`, `3 -> h3`,
`4 -> h4`). No corpus string becomes a JSX tag/component name and no generic
dynamic heading tag is allowed. The heading precedes the parsed body and all
ordered visual/example evidence for that section.

`buildDocsTableOfContentsV1(document)` returns one item per section in source
order with exact `{ sectionId, heading, level, href: "#" + sectionId }`. The
renderer emits those exact hrefs and stored labels in an `aria-label="On this
page"` navigation before article sections. Compiler/renderer validation rejects
duplicate document-local section IDs before any DOM is returned, so heading IDs
and TOC targets are unique.

The package also exports
`focusDocsLocalizedSectionDeepLinkV1({ root, document, docId, locale,
sectionId, behavior })`. It strictly validates the localized
`(docId, locale, sectionId)` against the selected normalized document, resolves
the exact heading with `root.ownerDocument.getElementById(sectionId)`, verifies
that it is inside `root` and carries the same document/locale/section data
attributes, then calls `scrollIntoView({ block: "start", behavior })` and
`focus({ preventScroll: true })`. Headings use `tabIndex={-1}` to make this
programmatic focus deterministic without adding them to normal Tab order.
Malformed identity fails closed; a valid identity absent from the mounted
localized article returns `false` without focusing a same-ID heading elsewhere.
Help calls the helper after initial navigation, TOC activation and popstate;
TASK-548-04's portal calls the same helper for its versioned localized deep
links. Both pass `"auto"` when reduced motion is requested.

### Exact link, local-asset and copy contracts

Relative documentation links remain executable after `sourcePath` is removed.
At projection construction, the trusted full-source edge parses every selected
section with `parseSafeMarkdownSection`, resolves relative links against its
normalized POSIX `sourcePath`, then emits one path-free row per unique exact
`{ sourceDocId, sourceLocale, sourceSectionId, rawHref }`; pure `#sectionId`
anchors remain same-document anchors outside this table.

Reject backslashes, roots/protocol-relative paths, queries, encoded separators
or dot segments, ambiguous decoding, root escape, missing/non-target targets,
and non-section fragments. Resolve only the exact authored target locale; an
explicit cross-locale file is allowed only as an exact selected member, never
via fallback. No fragment means both nullable target fields are null; otherwise
`fragment` is `#` plus the encoded exact `targetSectionId`. Sort by source tuple
then raw UTF-8 href. Equal repetitions dedupe only to a byte-identical target;
a divergent duplicate key is fatal.

`resolveSafeDocsLink` looks up that exact table key and never reparses a path or
joins a slug. Help maps stable identity through complete `localDocumentHrefs`;
public docs uses the versioned route helper. Missing/extra/duplicate/mismatched
rows block the affected article instead of guessing.

This leaf exports one required, recursively strict discriminated link context:

```ts
export type DocsResolvedHelpHostLinkV1 = {
  docId: string; locale: string; href: string; prefetch: true;
};
export type DocsLinkContextV1 =
  | {
      surface: "embedded-help"; publicationTarget: "embedded-help"; locale: string;
      localDocumentHrefs: readonly DocsResolvedHelpHostLinkV1[];
      officialDocs: { state: "configured"; origin: string; basePath: string;
        version: string } | { state: "unavailable" };
    }
  | {
      surface: "public-docs"; publicationTarget: "public-docs"; locale: string;
      productVersion: string; publicBasePath: string;
    };
export type DocsResolvedLinkV1 =
  | { kind: "anchor"; href: string; prefetch: false }
  | { kind: "admin"; href: string; prefetch: true }
  | { kind: "public-docs"; href: string; prefetch: false }
  | { kind: "external-https"; href: string; prefetch: false };
export function normalizeDocsLinkContextV1(value: unknown): DocsLinkContextV1;
export function resolveSafeDocsLink(input: {
  href: string; projection: DocsPublicationProjectionV1;
  documentKey: DocsPublicationDocumentKeyV1; sectionId: string;
  context: DocsLinkContextV1;
}): DocsResolvedLinkV1;
```

There is no default surface, locale, base path, version or target. Context
target must equal `projection.publicationTarget`, context locale must equal the
resolved document locale, and the selected document/section must be an exact
projection member. Unknown keys, unbranded projections or mismatched
discriminants fail closed.

For `embedded-help`, anchors remain local and relative documentation links
resolve only to exact `embedded-help` members by matching the Core adapter's
complete keyed `localDocumentHrefs`; the renderer neither imports nor
reconstructs `adminHelpPath`. The result is an `AdminLink`-compatible prefetched
link. An official link is possible only from a configured HTTPS context and a
destination also targeted to `public-docs`. For `public-docs`, relative docs
links resolve only to exact `public-docs` members at the same explicit product
version through `buildDocsPublicPath` plus the validated public base path.
Neither surface silently crosses to the other. Already-authored absolute links
must be canonical HTTPS without credentials; unsafe schemes, protocol-relative
forms, traversal and unknown destinations fail closed.

The package exports only byte/path-free local-asset and copy contracts:

```ts
export type DocsLocalVisualAssetV1 = {
  outputKey: string; href: string; mediaType: "image/png"; sha256: string;
};
export type DocsExampleCopyActivationV1 = {
  kind: "trusted-user-activation"; isTrusted: true;
};
export type DocsCopyExampleBodyV1 = (input: {
  body: string; activation: DocsExampleCopyActivationV1;
}) => void | Promise<void>;
export function buildVerifiedDocsLocalVisualAssetMapV1(input: {
  projection: DocsPublicationProjectionV1; documentKey: DocsPublicationDocumentKeyV1;
  emittedAssets: readonly DocsLocalVisualAssetV1[];
}): ReadonlyMap<string, DocsLocalVisualAssetV1>;
```

The builder validates the private projection brand, resolves exact localized
membership without a normalizer, requires exactly one emitted same-origin URL
for each selected visual `outputKey`, compares receipt/media/SHA-256 metadata,
and returns a read-only map keyed by that opaque key. Duplicate/unknown or
selected-missing entries and unsafe hrefs fail; known other-article entries are
validated but excluded. It performs no fetch and receives no path/bytes. The Core Vite build verifier
alone holds normalized `assetPath` values and PNG bytes transiently.

### Embedded Help build-asset registry

Help adds no API/runtime filesystem loader and does not duplicate PNG bytes in
browser JS. A narrow `coderso-embedded-help-assets-v1` plugin owned in
`core/vite.config.ts` reads the tracked packaged bundle through the common
cwd-independent loader, follows no symlinks, and statically walks only the
literal `docs/guide/assets/images/**/*.png` root. During build and dev startup
it invokes the full projection constructor, uses the normalized full source to
read/verify required PNG bytes, then discards those paths/bytes and emits
canonical `coderso.docs-help-assets@v1` `docs-help-assets-v1.json` plus one
virtual module containing only the hash-bound target payload/URL receipt.

The emitted renderer wrapper is
`coderso.docs-publication-projection-payload@v1`: it contains the exact nested
contracts-owned publication payload, the strict link-resolution table and a
domain-separated `projectionSha256`. It retains literal `embedded-help`,
target locale metadata and full-corpus `sourceHash`, but excludes every
non-target document, corpus envelope, resolved path, `sourcePath` and
`assetPath`. Renderer-root-only
`createDocsPublicationProjectionFromPayloadV1(unknown, "embedded-help")` is
the sole browser boundary: one strict wrapper and nested-payload normalization
plus target/hash/link/closure proof precedes branding. Receipt normalization joins only opaque
`outputKey`/href/media/SHA-256 records; source paths, output filesystem paths,
bytes and full-corpus records never enter Admin chunks. It builds one index.
Dev allows only the exact real image root. Missing/tampered receipt/target/URL/
asset blocks build/dev before Help.
It makes zero fetch/XHR/API/provider calls; normal same-origin loading of
Vite-emitted PNGs is the only image I/O.

### Server-only receipt file boundary

This leaf's build-only Core `helpBuildAssetVerification.ts` exports exactly:

```ts
export type DocsEmbeddedHelpAssetReceiptV1 = Readonly<{
  schema: "coderso.docs-help-assets@v1"; publicationTarget: "embedded-help";
  sourceHash: string; assets: readonly DocsLocalVisualAssetV1[]; receiptSha256: string;
}>;
export type DocsEmbeddedHelpAssetReceiptBodyV1 = Omit<
  DocsEmbeddedHelpAssetReceiptV1, "receiptSha256"
>;
export function hashEmbeddedHelpAssetReceiptBodyV1(
  body: DocsEmbeddedHelpAssetReceiptBodyV1
): string;
export function normalizeEmbeddedHelpAssetReceiptV1(value: unknown):
  DocsEmbeddedHelpAssetReceiptV1;
export async function resolveEmbeddedHelpBuildAssetFileV1(input: {
  clientRoot: string; outputKey: string; href: string;
}): Promise<Readonly<{ bytes: Uint8Array; sha256: string }>>;
```

`receiptSha256` is the lowercase-hex SHA-256 of this exact framed byte string:
ASCII `coderso.docs-help-assets@v1`, one NUL byte, the unsigned 64-bit
big-endian byte length of the canonical body, then the UTF-8 canonical body.
The body is exactly `{ schema, publicationTarget, sourceHash, assets }`, omits
`receiptSha256`, uses RFC 8785 canonical JSON, and requires assets in strictly
increasing `outputKey` order (ties/duplicates reject). Thus object keys are
recursively sorted by the canonical serializer while array order is fixed by
the contract. The normalizer recursively rejects unknown keys, validates every
field/outputKey↔SHA relation, recomputes this digest, and constant-time compares
it; it never trusts or includes the supplied self field in the digest input.

The resolver rejects unknown input keys, confines the canonical same-origin Vite asset href
below real `clientRoot`, binds it to `outputKey`, opens `O_NOFOLLOW`, fstats
before/after one bounded same-handle read, then hashes those bytes. It returns
no path and never reopens by pathname; traversal, encoded separators, query/
hash, symlink, swap, non-regular/oversized/missing file or mapping/hash drift
fails closed. Browser imports only the pure normalizer, never the resolver/Node
edge; L03's server registry calls that normalizer once at runtime construction,
and Docker/runtime consumes verified bytes/hash without a path.

`DocsRendererProps.copyExampleBody` is required. The renderer invokes it only
inside a trusted click/keyboard activation after checking
`event.nativeEvent.isTrusted`; it is never called during render, hydration,
effects or article selection. Surface handlers copy only the exact bounded body
to the clipboard, expose accessible success/failure status, and issue no
network, analytics, execution or CMS mutation. Tests may inject an explicit
trusted activation adapter; production code may not fabricate one.

## Permission and Offline Behavior

Help prose and screenshots are public-safe. `Open in CMS` is a convenience
action, not an authorization boundary:

- evaluate the exact
  `permissionRequirement: DocsPermissionRequirementV1 | null` against the
  authenticated fail-closed Admin permission snapshot;
- allow null even with an empty permission array, require every permission for
  `allOf`, require at least one for `anyOf`, and omit/disable the action only
  for an unsatisfied non-null or malformed requirement;
- treat the live ready snapshot `permissions: ["*"]` as full access, matching
  `canAdmin`; keep `*` forbidden in authored requirements and reject duplicate,
  mixed (`["*", "users:read"]`) or otherwise malformed wildcard snapshots;
- route the action through `AdminLink` with prefetch and canonical aliases;
- rely on destination route/API RBAC as defense in depth.

The bundle and search index stay in module memory. No corpus, permission
snapshot, provider metadata, or search history is persisted to localStorage.
The official portal link is optional and exists only when the selected
`embedded-help` document also contains `public-docs`; a Help-only document
renders no official action. A blocked/offline portal never affects local search,
article rendering, examples, or visuals.

### Exact Core Help host adapter

This leaf exclusively owns Core-only
`core/admin/ui/help/docsHelpHostAdapter.ts`. It imports canonical Admin paths
and the live permission catalog; renderer stays Core-free. It exports exactly:

```ts
export type DocsAdminPermissionSnapshotV1 =
  | { state: "ready"; permissions: readonly string[] }
  | { state: "missing" | "malformed" };

export type DocsAdminActionResolutionV1 = {
  href: string; linkKind: "admin"; prefetch: true;
};

export function buildDocsHelpHostLinksV1(input: {
  projection: DocsPublicationProjectionV1<"embedded-help">;
}): readonly DocsResolvedHelpHostLinkV1[];

export function resolvePermittedAdminAction(input: {
  adminPath: string | null;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  permissionSnapshot: DocsAdminPermissionSnapshotV1;
}): DocsAdminActionResolutionV1 | null;
```

The link builder validates the private brand and derives one canonical
`adminHelpPath` per exact localized member; duplicate, alias or incomplete
coverage fails before renderer props.
The action resolver validates exact input, rejects unknown snapshot states,
duplicate/unknown permissions and non-canonical paths, and returns null when
`adminPath` is null or the snapshot is missing/malformed. The only non-catalog
live snapshot value is the exact sole-member `["*"]` full-access sentinel;
authored `DocsPermissionRequirementV1` continues to reject `*`. A ready
snapshot plus null requirement succeeds even with zero permissions; `["*"]`
satisfies every valid non-null requirement; otherwise `allOf` requires every
canonical permission and `anyOf` requires at least one. A duplicate or
wildcard-plus-catalog snapshot is malformed and fails closed. Success returns
the validated default-base Admin href unchanged with `linkKind: "admin"` and
`prefetch: true`; `AdminLink` owns custom-base resolution. Help and L03 Guide
cards import this Core adapter. No renderer/portal module imports `adminPaths`,
evaluates RBAC or duplicates either resolver.

## Shared Public Documentation URL Contract

This leaf's `packages/docs-renderer/src/publicLinks.ts` exclusively owns these
exact safe helpers:

```ts
type DocsPublicRouteV1 =
  | { kind: "version"; version: string; locale: string; slug: string }
  | { kind: "latest"; locale: string; slug: string };
export function buildDocsPublicPath(route: DocsPublicRouteV1): string;
export function buildDocsPublicHref(input: {
  origin: string;
  basePath: string;
  route: DocsPublicRouteV1;
}): string;

export function resolveOptionalHelpOfficialHref(input: {
  document: DocsPublicationDocumentV1;
  origin: string;
  basePath: string;
  version: string;
}): string | null;
```

`buildDocsPublicPath(route)` emits only the root-relative
`/v/<version>/<locale>/<slug>` or `/latest/<locale>/<slug>`.
`buildDocsPublicHref({ origin, basePath, route })` emits the validated HTTPS
origin plus normalized base path (`/` or a safe path prefix) plus that exact
root-relative route. Version, BCP-47 locale, stable slug, and base path are
normalized and encoded by segment; origin must be an HTTPS origin with no
credentials, path, query or hash. Traversal, encoded separators, control
characters, protocol-relative input and unknown keys fail closed. TASK-548-04
later imports these exact helpers; it does not rebuild public routes.
`resolveOptionalHelpOfficialHref` first requires both `embedded-help` and
`public-docs` on the document; it returns null before URL construction when
`public-docs` is absent and delegates eligible links to `buildDocsPublicHref`.

## Security Contract

- **Endpoint visibility:** adds only internal authenticated SPA route
  `/admin/help`; no server/API endpoint.
- **Auth:** existing Admin session gate.
- **RBAC:** no permission required to read public-safe Help. Contextual Admin
  actions require the document permission snapshot and destination defense in
  depth.
- **CSRF/rate limit:** no request is issued for Help search/read, so neither is
  applicable. Existing Admin prefetch behavior remains read-only.
- **Validation:** `coderso.docs-corpus@v2` bundle and every ids/link/asset/block
  reference are strict reject-unknown and hash-checked before render.
- **Anti-abuse:** no public write; nonce/HMAC/reCAPTCHA are not applicable.
- **Privacy:** no secrets, user data, permission snapshot, query telemetry, or
  remote image request. Sanitized screenshots may not contain real PII/tokens.

## Implementation Pseudocode

```tsx
// core/admin/ui/help/docsHelpHostAdapter.ts
export function buildDocsHelpHostLinksV1(
  input: { projection: DocsPublicationProjectionV1<"embedded-help"> }
): readonly DocsResolvedHelpHostLinkV1[] {
  return requireCompleteUniqueLocalizedLinks(
    listDocsPublicationDocumentKeysV1(input.projection).map((key) => ({
      ...key, href: adminHelpPath(key), prefetch: true as const,
    }))
  );
}
export function resolvePermittedAdminAction(
  input: DocsPermittedAdminActionInputV1
): DocsAdminActionResolutionV1 | null {
  const normalized = normalizeDocsAdminActionInput(input);
  if (normalized.adminPath === null ||
      normalized.permissionSnapshot.state !== "ready") return null;
  if (!satisfiesDocsPermissionRequirement(normalized.permissionRequirement,
      normalized.permissionSnapshot.permissions)) return null;
  return { href: normalized.adminPath, linkKind: "admin", prefetch: true };
}
// packages/docs-renderer/src/publicationProjection.ts
export function createDocsPublicationProjectionV1(
  value: CreateDocsPublicationProjectionInputV1
): DocsPublicationProjectionV1 {
  const input = assertExactObjectKeys(value, ["sourceBundle", "publicationTarget"]);
  const publicationTarget = assertDocsPublicationSurfaceTargetV1(input.publicationTarget);
  const source = normalizeDocsDistributionBundleV2(input.sourceBundle);
  const documents = selectDocumentsForPublicationTarget(
    source.documents, publicationTarget
  );
  assertCompleteSourceProjectionClosureV1(documents, source);
  const linkResolutions = buildStrictPublicationLinkResolutionsV1({
    documents, parseSection: parseSafeMarkdownSection,
  }); // trusted sourcePath use ends here
  const projection = {
    schema: "coderso.docs-publication-projection@v1" as const, publicationTarget,
    corpusVersion: source.corpusVersion, defaultLocale: source.defaultLocale,
    supportedLocales: source.supportedLocales, sourceHash: source.sourceHash,
    documents: documents.map(projectDocsPublicationDocumentV1),
    linkResolutions,
  };
  assertCompleteSafePublicationProjectionClosureV1(projection);
  return deepFreezeWithPrivateBrand(projection, docsPublicationProjectionBrandV1);
}
export function serializeDocsPublicationProjectionV1<T extends
  DocsPublicationSurfaceTargetV1>(projection: DocsPublicationProjectionV1<T>
): DocsPublicationProjectionPayloadV1<T> {
  requireDocsPublicationProjectionBrandV1(projection);
  const publication = createDocsPublicationPayloadV1(copyExactPublicationBodyV1(projection));
  const body = { publication, linkResolutions: projection.linkResolutions };
  return deepFreeze({
    schema: "coderso.docs-publication-projection-payload@v1", ...body,
    projectionSha256: hashDocsCanonicalJsonBodyV1(DOCS_PUBLICATION_PROJECTION_BODY_HASH_DOMAIN_V1, body),
  });
}
export function createDocsPublicationProjectionFromPayloadV1<T extends
  DocsPublicationSurfaceTargetV1>(
  value: unknown, expectedTarget: T
): DocsPublicationProjectionV1<T> {
  const payload = normalizeDocsPublicationProjectionPayloadEnvelopeV1(value);
  const publication = normalizeDocsPublicationPayloadV1(payload.publication);
  assertProjectionPayloadHashesTargetAndLinkTableV1(payload, publication,
    expectedTarget);
  assertCompleteSafePublicationProjectionClosureV1({
    ...publication.body, linkResolutions: payload.linkResolutions,
  });
  return deepFreezeWithPrivateBrand(toUnbrandedProjection(
    publication.body, payload.linkResolutions), docsPublicationProjectionBrandV1);
}
// packages/docs-renderer/src/search.ts
export function buildDocsSearchIndexV1(projection: DocsPublicationProjectionV1) {
  requireDocsPublicationProjectionBrandV1(projection);
  return deepFreeze(indexEveryRankingSignal(projection.documents));
}
export function searchDocs(index: DocsSearchIndexV1, input: DocsSearchInput) {
  return scoreDocsSearchRecords(index.records, normalizeDocsSearchInput(input));
}
// packages/docs-renderer/src/clientSearch.ts
export function projectDocsClientSearchRankingV1(
  index: DocsSearchIndexV1, scope: DocsClientSearchScopeV1
) {
  return deepFreeze(projectAllPublicScoreFields(index, normalizeScope(scope)));
}
export function searchDocsClientSearchRankingV1(
  index: DocsClientSearchRankingProjectionV1, input: DocsSearchInput
) {
  const normalized = normalizeDocsClientSearchRankingProjectionV1(index);
  return scoreDocsSearchRecords(normalized.records, normalizeDocsSearchInput(input));
}
// packages/docs-renderer/src/evidenceCards.ts
export function buildVerifiedDocsLocalVisualAssetMapV1(input: {
  projection: DocsPublicationProjectionV1; documentKey: DocsPublicationDocumentKeyV1;
  emittedAssets: readonly DocsLocalVisualAssetV1[];
}): ReadonlyMap<string, DocsLocalVisualAssetV1> {
  requireDocsPublicationProjectionBrandV1(input.projection);
  const document = resolveDocsPublicationDocumentV1(
    input.projection, input.documentKey
  );
  const expected = collectExactDocumentVisuals(document);
  return verifyAndFreezeExactOpaqueAssetMap(expected, input.emittedAssets);
}
export function resolveSafeDocsLink(input: ResolveSafeDocsLinkInputV1) {
  const { projection, document, section } = requireExactLinkSource(input);
  if (isSameDocumentAnchor(input.href))
    return resolveExactSectionAnchor(document, input.href);
  const row = requireUniquePublicationLinkResolutionV1(projection.linkResolutions, {
    sourceDocId: document.docId, sourceLocale: document.locale,
    sourceSectionId: section.sectionId, rawHref: input.href,
  });
  return renderResolvedLinkFromStableTargetV1(row, input.context);
}
export function resolveDocsSectionEvidenceCards(
  input: ResolveDocsSectionEvidenceCardsInputV1
): DocsSectionEvidenceCardsV1 {
  const document = resolveDocsPublicationDocumentV1(
    input.projection, input.documentKey
  );
  const section = resolveExactDocumentSection(document, input.section.sectionId);
  assertSameNormalizedSection(section, input.section);
  return resolveOrderedStrictOwnedEvidence(input, document, section);
}
// core/admin/ui/help/helpBuildAssets.ts
type DocsEmbeddedHelpBuildPayloadV1 =
  DocsPublicationProjectionPayloadV1<"embedded-help">;
export function loadEmbeddedHelpBuildAssetsV1(): EmbeddedHelpBuildAssetsV1 {
  const emitted = normalizeEmbeddedHelpVirtualModuleV1(
    embeddedHelpViteModuleUnknown
  );
  const projection = createDocsPublicationProjectionFromPayloadV1(
    emitted.targetPayload, "embedded-help"
  );
  const receipt = normalizeEmbeddedHelpAssetReceiptV1(emitted.assetReceipt);
  assertEqual(receipt.sourceHash, projection.sourceHash);
  assertBuildReceiptExactlyMatchesProjectionV1(receipt.assets, projection);
  return deepFreeze({
    projection, emittedAssets: receipt.assets,
    searchIndex: buildDocsSearchIndexV1(projection),
  });
}
export function hashEmbeddedHelpAssetReceiptBodyV1(body: ReceiptBodyV1) {
  const normalized = normalizeExactSortedReceiptBodyV1(body);
  const canonical = utf8(serializeRfc8785(normalized));
  return sha256LowerHex(concat(ascii("coderso.docs-help-assets@v1"), nul(),
    u64be(canonical.length), canonical));
}
// core/services/documentation/help/embeddedHelpVitePlugin.ts
export function codersoEmbeddedHelpAssetsV1(): Plugin {
  return failClosedVirtualAssetPlugin({
    id: "virtual:coderso-embedded-help-assets-v1",
    async buildReceipt(ctx) {
      const bundle = await loadPackagedDocsDistributionBundleV2();
      const projection = createDocsPublicationProjectionV1({
        sourceBundle: bundle, publicationTarget: "embedded-help",
      });
      const files = await walkExactPngRootNoFollow(DOCS_GUIDE_IMAGE_ROOT);
      const verified = await verifySourcePathsAndPngBytesV1({
        bundle, projection, files,
      });
      return emitPathFreeEmbeddedHelpPayloadV1(ctx, {
        payload: serializeDocsPublicationProjectionV1(projection), verified,
      });
    },
  });
}
// core/vite.config.ts: orchestration only; no duplicate build logic.
plugins: [...existingPlugins, codersoEmbeddedHelpAssetsV1()], server: { fs: { allow: [...existingAllow, DOCS_GUIDE_IMAGE_ROOT] } },
// packages/docs-renderer/src/DocsDocumentRenderer.tsx
export type DocsRendererProps = {
  projection: DocsPublicationProjectionV1; documentKey: DocsPublicationDocumentKeyV1;
  linkContext: DocsLinkContextV1;
  localVisualAssets: ReadonlyMap<string, DocsLocalVisualAssetV1>;
  copyExampleBody: DocsCopyExampleBodyV1;
};
export function buildDocsTableOfContentsV1(
  document: DocsPublicationDocumentV1
): readonly DocsTableOfContentsItemV1[] {
  const sections = assertUniqueNormalizedDocumentSections(document);
  return sections.map((section) => ({
    sectionId: section.sectionId, heading: section.heading,
    level: section.level, href: `#${section.sectionId}`,
  }));
}
function DocsSectionHeading(props: DocsSectionHeadingPropsV1) {
  const exactProps = {
    id: props.section.sectionId, tabIndex: -1,
    "data-docs-document-id": props.document.docId,
    "data-docs-locale": props.document.locale,
    "data-docs-section-id": props.section.sectionId,
  } as const;
  switch (props.section.level) {
    case 1: return <h1 {...exactProps}>{props.section.heading}</h1>;
    case 2: return <h2 {...exactProps}>{props.section.heading}</h2>;
    case 3: return <h3 {...exactProps}>{props.section.heading}</h3>;
    case 4: return <h4 {...exactProps}>{props.section.heading}</h4>;
    default: return assertNeverDocsSectionLevel(props.section.level);
  }
}
export function focusDocsLocalizedSectionDeepLinkV1(
  input: DocsLocalizedSectionDeepLinkInputV1
): boolean {
  const identity = normalizeExactLocalizedSectionDeepLinkV1(input);
  const section = resolveExactLocalizedSectionIdentity(input.document, identity);
  const heading = input.root.ownerDocument.getElementById(identity.sectionId);
  if (!isExactHeadingInsideLocalizedArticle(input.root, heading, section, identity))
    return false;
  heading.scrollIntoView({ block: "start", behavior: input.behavior });
  heading.focus({ preventScroll: true });
  return true;
}
export function DocsDocumentRenderer(props: DocsRendererProps) {
  const projection = requireDocsPublicationProjectionBrandV1(props.projection);
  const document = resolveDocsPublicationDocumentV1(projection, props.documentKey);
  const linkContext = normalizeDocsLinkContextV1(props.linkContext);
  const sections = assertUniqueNormalizedDocumentSections(document);
  const tableOfContents = buildDocsTableOfContentsV1(document);
  assertRendererSurfaceTargetAndLocale(
    linkContext, projection.publicationTarget, document.locale
  );
  return <DocsArticle document={document} tableOfContents={tableOfContents}
    renderSection={(section) => renderStrictDocsSection({
      section, document, projection, linkContext, props,
    })}
  />;
}
// core/admin/app/routes/help.admin-route.tsx
import { HELP_ADMIN_ROUTE_DESCRIPTORS_V1 } from "./help.admin-route-descriptor";
export const descriptors = HELP_ADMIN_ROUTE_DESCRIPTORS_V1;
export const bindings = {
  "help.home": ({ authPermissionSnapshot }) =>
    <HelpPage permissionSnapshot={authPermissionSnapshot} />,
} satisfies Readonly<Record<string, AdminRouteRender>>;
```

**Data flow:** build/dev normalization → target constructor → hash-bound
embedded-only payload/link table + byte-free receipt → browser brand → index →
localized member → verified URL map → link/copy context → safe renderer. No
non-target/full-bundle/PNG bytes enter Admin chunks; one section array owns
TOC/article and the shared focus helper owns initial/TOC/popstate navigation.

**Error handling:** malformed payload/receipt blocks Help with a bounded local
integrity error; invalid query state is replaced and missing content gets 404
guidance. Cross-owner/locale/section, duplicate, missing, orphan or tampered
evidence blocks that article before render; decode failure retains caption/alt.
Unavailable official origin hides its action, Help-only omits it, and malformed
permissions fail closed. Only Guide's separate authorized projection may omit
an unresolved optional card. Invalid heading/duplicate section blocks the whole
article, and a deep link cannot focus outside its selected localized article.

**Regression-test shape:**

- deterministic projection/search bytes and ranking; spies prove exactly one
  full normalization/selection, complete target order and unchanged source hash;
- compile-time full→publication document/visual non-assignability, runtime
  exact-key/spread/cast rejection, private-brand forgery rejection and no
  pseudo-bundle reconstruction;
- build/dev and Admin-chunk fixtures seed distinct non-target, `sourcePath`,
  `assetPath`, corpus/PNG/resolver/Node-edge canaries; only target safe DTOs plus
  opaque output-key/href/hash receipts survive, and forged receipts fail;
- exact package-edge tests pin `renderer -> contracts`, reject every renderer
  Core/RBAC/adminPaths import, and prove the Core adapter returns complete
  canonical Help links plus correct null/empty/`["*"]`/`allOf`/`anyOf` actions;
- closure/evidence fixtures reject cross-target/document/locale/section,
  duplicate, missing, unlisted, orphan, wrong-media/hash/bytes and forged props;
- every search signal, locale/version state and total tie break has byte-identical
  server/client results; target leaks yield no result/render/navigation;
- scenario-step fixtures prove terms present only in the compiled
  `scenarioStepSearchText` projection return the correct localized section,
  tokens are bounded/deduped/deterministic, and locator/`fixtureValueRef`/
  expected-value/watch-path bytes seeded into scenario files never become
  searchable or reach the client projection (no scenario-file reads at index
  or search time);
- all Markdown token variants render safely; image/HTML tokens cannot synthesize
  evidence, examples remain escaped/copy-only after trusted activation;
- Help and portal pin stored heading level/text/id, TOC order/hrefs, localized
  focus/scroll/popstate/reduced-motion behavior and collision isolation;
- link-context tests cover exact discriminants/host maps, version/locale/base,
  official-target eligibility and no defaults; link-table tests cover repeated-
  equal dedupe, divergent-key collision, traversal/encoding/query rejection,
  explicit cross-locale exact targets, missing/non-target destinations, exact
  fragment/section checks, stable ordering and zero resolved path bytes;
- receipt tests cover opaque-key/SHA closure, missing/unknown-extra/duplicate/
  remote/blob/data/no-fetch, fixed digest vectors, field/asset/order tampering,
  self-field exclusion and self-reference rejection; build-only tests pin
  traversal/symlink/swap rejection, same-handle fstat/read and hash mismatch;
- descriptor/catalog, any-auth route, footer atomicity, keyboard/focus,
  responsive light/dark, no-network and touched-file <=1,000 gates.

## Sub-Tasks

- [ ] Build branded projection payloads/link table, shared/client search, Vite
  target registry, receipt verifier and closed renderer package.
- [ ] Render stored semantic headings, stable anchors/TOC and shared localized
  focus helper; expose exact link, asset-map and trusted-copy contracts.
- [ ] Add the Core-only Help host adapter with permission/path/coverage tests;
  Help and Guide consume it while renderer receives safe results only.
- [ ] Build deterministic local search and URL-state helpers.
- [ ] Implement exact shared public path/href helpers and hostile-input tests.
- [ ] Add the named descriptor/identity-preserving binding and accessible page.
- [ ] Replace the footer Docs link atomically and preserve Support.
- [ ] Add security, accessibility, route, and no-network regression suites.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/docs/docs-renderer.test.tsx tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs/docs-public-links.test.ts tests/vitest/docs/help-visual-asset-registry.test.ts \
  tests/vitest/ui-integration/docs-help-host-adapter.test.ts tests/vitest/ui-integration/help-center.test.tsx \
  tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts
bun test tests/unit/documentation/helpBuildAssetVerification.test.ts tests/unit/documentation/embeddedHelpVitePlugin.test.ts
bun --cwd packages/docs-renderer check
bun --cwd core --eval 'const renderer = await import("@coderso/docs-renderer"); const projection = await import("@coderso/docs-renderer/projection"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.buildDocsSearchIndexV1 !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function" || typeof projection.createDocsPublicationProjectionV1 !== "function") throw new Error("docs_renderer_exports_invalid")'
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun --cwd core build:admin
bun run check:admin-bundle
git diff --check
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

All counts must be at most 1,000. Re-run named failures alone before
classification.

## Acceptance Criteria

- `/admin/help` and the local footer link land together and work for any
  authenticated Admin user.
- Search/reader/TOC/examples/screenshots/deep links use the installed corpus
  only, with no per-query network request.
- Every consumer receives the exact branded target projection; shared renderer/
  search/link rules remain reusable by TASK-548-04 without a content fork.
- Help/portal share stored heading/TOC/localized-focus behavior, explicit link
  context, verified byte-free assets and user-event-only copy behavior.
- Unsafe content/URLs/assets fail closed; raw HTML is never rendered.
- CMS links are canonical/permission-aware; official links are optional and
  version/locale aware; light/dark, responsive, keyboard/focus and reduced
  motion behavior is usable and tested.
- No persistent Help cache or secret/PII leakage is introduced.

## Documentation Updates Required

Hand Help search, renderer, offline, link, and accessibility behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
