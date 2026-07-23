# TASK-548-03-L02: Local Help Search, Reader and Visual Renderer
# FileName: TASK-548-03-L02-Local-Help-Search-Reader-And-Visual-Renderer.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-03
**Priority:** High
**Category:** Admin Help / Documentation UI / Accessibility
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-02-L03 and TASK-548-03-L01
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
official portal; no content or rendering fork is allowed.
Import the exact TASK-548-01-L01-owned
`selectDocumentsForPublicationTarget` function and re-export it through
`@coderso/docs-renderer`; this leaf must not redefine its filter or ordering.
This leaf also owns the one distinct, branded
`DocsPublicationProjectionV1` boundary. A projection is not, and must never be
cast or reconstructed as, `DocsDistributionBundleV2`: it contains only
already-normalized records for one literal publication target while retaining
the full source bundle's `sourceHash` as provenance. Search, link resolution,
evidence resolution and rendering consume this projection and never normalize
a filtered pseudo-bundle.

## Exclusive Ownership

This leaf is the only writer for:

- new `packages/docs-renderer/src/**` and
  `packages/docs-renderer/tsconfig.json`; the package manifest is frozen by
  TASK-548-02-L03;
- new Bun-free
  `core/admin/app/routes/help.admin-route-descriptor.ts`;
- new `core/admin/app/routes/help.admin-route.tsx`;
- new `core/admin/ui/help/**`;
- `core/admin/ui/navigation/sidebarConfig.ts`;
- new `tests/vitest/docs/docs-renderer.test.tsx`;
- new `tests/vitest/docs/docs-search.test.ts`;
- new `tests/vitest/docs/docs-public-links.test.ts`;
- new `tests/vitest/docs/docs-admin-actions.test.ts`;
- new `tests/vitest/ui-integration/help-center.test.tsx`;
- Help-specific assertions in `tests/vitest/ui/admin-shell-nav.test.tsx`.

It must not edit L01's `adminRouteRegistry.tsx`, `AdminApp.tsx`,
`adminPaths.ts`, or core route module. The new Help descriptor is discovered by
the stable L01 registry seam. TASK-548-02-L03 is the sole writer of
`packages/docs-renderer/package.json`, `packages/docs-portal/package.json`, root
`package.json`, and `bun.lock`; this leaf must not create or reopen them.

## Renderer Workspace Activation Gate

TASK-548-02-L03 deliberately validated only the renderer manifest, frozen
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
no write ownership of TASK-548-02-L03's manifests, lockfile, core dependency,
or Dockerfile.

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
  | "embedded-help"
  | "public-docs";

export type DocsPublicationDocumentKeyV1 = {
  docId: string;
  locale: string;
};

const docsPublicationProjectionBrandV1: unique symbol =
  Symbol("coderso.docs-publication-projection@v1");

export type DocsPublicationProjectionV1<
  T extends DocsPublicationSurfaceTargetV1 = DocsPublicationSurfaceTargetV1
> = Readonly<{
  schema: "coderso.docs-publication-projection@v1";
  publicationTarget: T;
  corpusVersion: string;
  defaultLocale: string;
  supportedLocales: readonly string[];
  sourceHash: string;
  documents: readonly DocsDocumentV2[];
  readonly [docsPublicationProjectionBrandV1]: true;
}>;

export function createDocsPublicationProjectionV1<T extends
  DocsPublicationSurfaceTargetV1>(value: {
  sourceBundle: unknown;
  publicationTarget: T;
}): DocsPublicationProjectionV1<T>;

export function resolveDocsPublicationDocumentV1(
  projection: DocsPublicationProjectionV1,
  key: DocsPublicationDocumentKeyV1
): DocsDocumentV2;

export function buildDocsSearchIndexV1(
  projection: DocsPublicationProjectionV1
): DocsSearchIndexV1;
```

The constructor accepts only exact
`{ sourceBundle, publicationTarget }` keys, calls the TASK-548-01-L01-owned
`normalizeDocsDistributionBundleV2(sourceBundle)` exactly once, applies the
exact shared target selector once, and copies normalized records into the
distinct displayed shape. It preserves the complete source bundle's metadata
and exact `sourceHash`; that hash is provenance for the full corpus, never a
digest of the filtered document array.

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

`resolveDocsPublicationDocumentV1` validates the branded projection and exact
canonical key, then requires exactly one member without re-normalizing it.
`buildDocsSearchIndexV1` is a pure deterministic projection-to-index function:
it validates the private brand, reads only projection members and never calls a
bundle/document normalizer or selector. Embedded Help constructs one projection
and one search index in trusted module memory per installed bundle identity.
The portal constructs them once in its build/SSR process and never serializes
or hydrates the brand. Portal build code imports the constructor through exact
`@coderso/docs-renderer/projection`; its Vite boundary must reject that subpath,
the brand, or any `DocsDocumentV2` corpus import from every portal hydration
client entry.

## Local Search Contract

Build an immutable in-memory index once per projection identity. Rank only the
verified projection members, using stable deterministic signals:

- exact title/keyword/admin-screen phrase;
- normalized title and section-heading token coverage;
- body, caption/alt, and example-label matches;
- current Admin route/product-area prior;
- exact bounded `capabilityIds` context match/prior;
- selected locale/version compatibility;
- stable total tie-break by `locale`, then `docId`, then `sectionId`.

Normalize Unicode, casing, diacritics, and whitespace without executing regex
from corpus data. Clamp query length, result count, snippet length, and token
budgets. Empty query returns curated navigation, not every body chunk. Search
does not call the database, assistant route, provider, official portal, or any
remote analytics endpoint.

The Help bootstrap requests literal `embedded-help`. Target absence fails
closed. A multi-target document is eligible when it contains `embedded-help`;
`assistant`-only and `public-docs`-only documents are neither indexed nor
directly renderable in Help. TASK-548-04 is the sole portal consumer of a
literal `public-docs` projection.

## Safe Renderer and Link Policy

The renderer accepts only a branded `DocsPublicationProjectionV1` plus an exact
member key. It resolves the already-normalized `DocsDocumentV2`/
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
- hash the local PNG bytes against `DocsVisualV1.sha256` before constructing a
  card. Only the matching confined `assetPath`, `image/png` bytes and verified
  local href may reach `<img>`; require non-empty alt text and render the exact
  caption;
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

This leaf exports one required, recursively strict discriminated link context:

```ts
export type DocsLinkContextV1 =
  | {
      surface: "embedded-help";
      publicationTarget: "embedded-help";
      locale: string;
      adminBasePath: string;
      officialDocs:
        | {
            state: "configured";
            origin: string;
            basePath: string;
            version: string;
          }
        | { state: "unavailable" };
    }
  | {
      surface: "public-docs";
      publicationTarget: "public-docs";
      locale: string;
      productVersion: string;
      publicBasePath: string;
    };

export type DocsResolvedLinkV1 =
  | { kind: "anchor"; href: string; prefetch: false }
  | { kind: "admin"; href: string; prefetch: true }
  | { kind: "public-docs"; href: string; prefetch: false }
  | { kind: "external-https"; href: string; prefetch: false };

export function normalizeDocsLinkContextV1(
  value: unknown
): DocsLinkContextV1;

export function resolveSafeDocsLink(input: {
  href: string;
  projection: DocsPublicationProjectionV1;
  documentKey: DocsPublicationDocumentKeyV1;
  sectionId: string;
  context: DocsLinkContextV1;
}): DocsResolvedLinkV1;
```

There is no default surface, locale, base path, version or target. Context
target must equal `projection.publicationTarget`, context locale must equal the
resolved document locale, and the selected document/section must be an exact
projection member. Unknown keys, unbranded projections or mismatched
discriminants fail closed.

For `embedded-help`, anchors remain local and relative documentation links
resolve only to exact `embedded-help` members through `adminHelpPath` plus the
validated Admin base; the result is an `AdminLink`-compatible prefetched admin
link. An official link is possible only from a configured HTTPS context and a
destination also targeted to `public-docs`. For `public-docs`, relative docs
links resolve only to exact `public-docs` members at the same explicit product
version through `buildDocsPublicPath` plus the validated public base path.
Neither surface silently crosses to the other. Already-authored absolute links
must be canonical HTTPS without credentials; unsafe schemes, protocol-relative
forms, traversal and unknown destinations fail closed.

The same package exports the exact local-asset/copy types and verified map
builder:

```ts
export type DocsPackagedLocalVisualAssetV1 = {
  assetPath: string;
  href: string;
  mediaType: "image/png";
  bytes: Uint8Array;
};

export type DocsLocalVisualAssetV1 = DocsPackagedLocalVisualAssetV1 & {
  sha256: string;
};

export type DocsExampleCopyActivationV1 = {
  kind: "trusted-user-activation";
  isTrusted: true;
};

export type DocsCopyExampleBodyV1 = (input: {
  body: string;
  activation: DocsExampleCopyActivationV1;
}) => void | Promise<void>;

export function buildVerifiedDocsLocalVisualAssetMapV1(input: {
  projection: DocsPublicationProjectionV1;
  documentKey: DocsPublicationDocumentKeyV1;
  packagedAssets: readonly DocsPackagedLocalVisualAssetV1[];
}): ReadonlyMap<string, DocsLocalVisualAssetV1>;
```

The builder validates the private projection brand, resolves exact localized
membership without a bundle/document normalizer, requires exactly
one confined packaged local PNG for every visual of the selected article,
rejects duplicate/unknown/traversing/remote/data/blob hrefs and missing/extra
selected-article assets, hashes the bytes, compares exact SHA-256, and returns a
read-only map keyed by `assetPath`. Unrelated asset entries are accepted only
when their path is another known projection visual and are never added to this
article map. It performs no fetch.

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

### Exact Admin action resolver

This leaf exclusively owns
`packages/docs-renderer/src/adminActions.ts` and these exact exports:

```ts
export type DocsAdminPermissionSnapshotV1 =
  | { state: "ready"; permissions: readonly string[] }
  | { state: "missing" | "malformed" };

export type DocsAdminActionResolutionV1 = {
  href: string;
  linkKind: "admin";
  prefetch: true;
};

export function resolvePermittedAdminAction(input: {
  adminPath: string | null;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  permissionSnapshot: DocsAdminPermissionSnapshotV1;
}): DocsAdminActionResolutionV1 | null;
```

It recursively validates the exact input, rejects unknown snapshot states,
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
cards import this function and result type from the package index. No consumer
duplicates the permission evaluator.

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
  document: DocsDocumentV2;
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
// packages/docs-renderer/src/adminActions.ts
export function resolvePermittedAdminAction(input: {
  adminPath: string | null;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  permissionSnapshot: DocsAdminPermissionSnapshotV1;
}): DocsAdminActionResolutionV1 | null {
  const normalized = normalizeDocsAdminActionInput(input);
  if (normalized.adminPath === null || normalized.permissionSnapshot.state !== "ready") {
    return null;
  }
  if (!satisfiesDocsPermissionRequirement(
    normalized.permissionRequirement,
    normalized.permissionSnapshot.permissions
  )) {
    return null;
  }
  return { href: normalized.adminPath, linkKind: "admin", prefetch: true };
}

// packages/docs-renderer/src/publicationProjection.ts
export function createDocsPublicationProjectionV1(value: {
  sourceBundle: unknown;
  publicationTarget: DocsPublicationSurfaceTargetV1;
}): DocsPublicationProjectionV1 {
  const input = assertExactObjectKeys(value, [
    "sourceBundle",
    "publicationTarget",
  ]);
  const publicationTarget =
    assertDocsPublicationSurfaceTargetV1(input.publicationTarget);
  const source = normalizeDocsDistributionBundleV2(input.sourceBundle);
  const documents = selectDocumentsForPublicationTarget(
    source.documents,
    publicationTarget
  );
  const projection = {
    schema: "coderso.docs-publication-projection@v1" as const,
    publicationTarget,
    corpusVersion: source.corpusVersion,
    defaultLocale: source.defaultLocale,
    supportedLocales: source.supportedLocales,
    sourceHash: source.sourceHash,
    documents,
  };
  assertCompleteDocsPublicationProjectionClosureV1(projection, source);
  return deepFreezeWithPrivateBrand(
    projection,
    docsPublicationProjectionBrandV1
  );
}

export function resolveDocsPublicationDocumentV1(
  projection: DocsPublicationProjectionV1,
  key: DocsPublicationDocumentKeyV1
): DocsDocumentV2 {
  requireDocsPublicationProjectionBrandV1(projection);
  const normalizedKey = normalizeDocsPublicationDocumentKeyV1(key);
  return resolveExactlyOneProjectionDocument(projection, normalizedKey);
}

// packages/docs-renderer/src/search.ts
export function buildDocsSearchIndexV1(
  projection: DocsPublicationProjectionV1
): DocsSearchIndexV1 {
  requireDocsPublicationProjectionBrandV1(projection);
  return deepFreeze(indexPublishedSections(projection.documents, {
    text: ["title", "keywords", "heading", "body", "visualAlt", "exampleLabel"],
    stableTieBreak: ["locale", "docId", "sectionId"],
  }));
}

export function searchDocs(
  index: DocsSearchIndexV1,
  input: DocsSearchInput
): readonly DocsSearchResult[] {
  const query = normalizeBoundedQuery(input.query);
  return rankLocalMatches(index, query, input)
    .filter(isVersionLocaleCompatible)
    .slice(0, clampResultLimit(input.limit));
}

// packages/docs-renderer/src/evidenceCards.ts
export type DocsPackagedLocalVisualAssetV1 = {
  assetPath: string;
  href: string;
  mediaType: "image/png";
  bytes: Uint8Array;
};
export type DocsLocalVisualAssetV1 = DocsPackagedLocalVisualAssetV1 & {
  sha256: string;
};
export function buildVerifiedDocsLocalVisualAssetMapV1(input: {
  projection: DocsPublicationProjectionV1;
  documentKey: DocsPublicationDocumentKeyV1;
  packagedAssets: readonly DocsPackagedLocalVisualAssetV1[];
}): ReadonlyMap<string, DocsLocalVisualAssetV1> {
  requireDocsPublicationProjectionBrandV1(input.projection);
  const document = resolveDocsPublicationDocumentV1(
    input.projection,
    input.documentKey
  );
  const expected = collectExactDocumentVisuals(document);
  return toReadonlyMap(
    expected.map((visual) => {
      const asset = resolveExactlyOneConfinedPackagedAsset(
        input.packagedAssets,
        visual.assetPath,
        input.projection
      );
      const sha256 = sha256Bytes(asset.bytes);
      if (asset.mediaType !== "image/png" || sha256 !== visual.sha256) {
        throw new Error("docs_renderer_asset_integrity_invalid");
      }
      return [
        visual.assetPath,
        { ...asset, href: assertRootRelativeLocalAssetHref(asset.href), sha256 },
      ] as const;
    })
  );
}

export type DocsSectionEvidenceCardsV1 = {
  visualCards: readonly DocsAccessibleVisualCardV1[];
  exampleCards: readonly DocsInertExampleCardV1[];
};

export function resolveDocsSectionEvidenceCards(input: {
  projection: DocsPublicationProjectionV1;
  documentKey: DocsPublicationDocumentKeyV1;
  section: DocsSectionV2;
  localVisualAssets: ReadonlyMap<string, DocsLocalVisualAssetV1>;
}): DocsSectionEvidenceCardsV1 {
  const document = resolveDocsPublicationDocumentV1(
    input.projection,
    input.documentKey
  );
  const section = resolveExactDocumentSection(document, input.section.sectionId);
  assertSameNormalizedSection(section, input.section);
  return {
    visualCards: section.visualIds.map((visualId) =>
      toAccessibleVisualCard(resolveStrictOwnedVisual(input.projection, {
      docId: document.docId,
      locale: document.locale,
      sectionId: section.sectionId,
      visualId,
      }), input.localVisualAssets)
    ),
    exampleCards: section.exampleIds.map((exampleId) =>
      toInertExampleCard(resolveStrictOwnedExample(input.projection, {
      docId: document.docId,
      locale: document.locale,
      sectionId: section.sectionId,
      exampleId,
      }))
    ),
  };
}

// packages/docs-renderer/src/DocsDocumentRenderer.tsx
export type DocsRendererProps = {
  projection: DocsPublicationProjectionV1;
  documentKey: DocsPublicationDocumentKeyV1;
  linkContext: DocsLinkContextV1;
  localVisualAssets: ReadonlyMap<string, DocsLocalVisualAssetV1>;
  copyExampleBody: DocsCopyExampleBodyV1;
};
export type DocsTableOfContentsItemV1 = {
  sectionId: string;
  heading: string;
  level: 1 | 2 | 3 | 4;
  href: string;
};
export function buildDocsTableOfContentsV1(
  document: DocsDocumentV2
): readonly DocsTableOfContentsItemV1[] {
  const sections = assertUniqueNormalizedDocumentSections(document);
  return sections.map((section) => ({
    sectionId: section.sectionId,
    heading: section.heading,
    level: section.level,
    href: `#${section.sectionId}`,
  }));
}

function DocsSectionHeading(props: {
  document: DocsDocumentV2;
  section: DocsSectionV2;
}) {
  const exactProps = {
    id: props.section.sectionId,
    tabIndex: -1,
    "data-docs-document-id": props.document.docId,
    "data-docs-locale": props.document.locale,
    "data-docs-section-id": props.section.sectionId,
  } as const;
  switch (props.section.level) {
    case 1:
      return <h1 {...exactProps}>{props.section.heading}</h1>;
    case 2:
      return <h2 {...exactProps}>{props.section.heading}</h2>;
    case 3:
      return <h3 {...exactProps}>{props.section.heading}</h3>;
    case 4:
      return <h4 {...exactProps}>{props.section.heading}</h4>;
    default:
      return assertNeverDocsSectionLevel(props.section.level);
  }
}

export function focusDocsLocalizedSectionDeepLinkV1(input: {
  root: HTMLElement;
  document: DocsDocumentV2;
  docId: string;
  locale: string;
  sectionId: string;
  behavior: "auto" | "smooth";
}): boolean {
  const identity = normalizeExactLocalizedSectionDeepLinkV1(input);
  const section = resolveExactLocalizedSectionIdentity(
    input.document,
    identity
  );
  const heading = input.root.ownerDocument.getElementById(identity.sectionId);
  if (
    heading === null ||
    !input.root.contains(heading) ||
    heading.tagName !== `H${section.level}` ||
    heading.textContent !== section.heading ||
    heading.tabIndex !== -1 ||
    heading.dataset.docsDocumentId !== identity.docId ||
    heading.dataset.docsLocale !== identity.locale ||
    heading.dataset.docsSectionId !== identity.sectionId
  ) {
    return false;
  }
  heading.scrollIntoView({ block: "start", behavior: input.behavior });
  heading.focus({ preventScroll: true });
  return true;
}

export function DocsDocumentRenderer(props: DocsRendererProps) {
  const projection = requireDocsPublicationProjectionBrandV1(props.projection);
  const document = resolveDocsPublicationDocumentV1(
    projection,
    props.documentKey
  );
  const linkContext = normalizeDocsLinkContextV1(props.linkContext);
  const sections = assertUniqueNormalizedDocumentSections(document);
  const tableOfContents = buildDocsTableOfContentsV1(document);
  assertRendererSurfaceTargetAndLocale({
    linkContext,
    publicationTarget: projection.publicationTarget,
    locale: document.locale,
  });
  return <DocsArticle
    document={document}
    tableOfContents={tableOfContents}
    renderSection={(section) => <DocsSection
      heading={<DocsSectionHeading document={document} section={section} />}
      tokens={parseSafeMarkdownSection(section.bodyMarkdown).tokens}
      resolveLink={(href) => resolveSafeDocsLink({
        href,
        projection,
        documentKey: props.documentKey,
        sectionId: section.sectionId,
        context: linkContext,
      })}
      evidence={resolveDocsSectionEvidenceCards({
        projection,
        documentKey: props.documentKey,
        section,
        localVisualAssets: props.localVisualAssets,
      })}
      copyExampleBody={props.copyExampleBody}
    />}
  />;
}

// core/admin/app/routes/help.admin-route.tsx
import {
  HELP_ADMIN_ROUTE_DESCRIPTORS_V1
} from "./help.admin-route-descriptor";

export const descriptors = HELP_ADMIN_ROUTE_DESCRIPTORS_V1;
export const bindings = {
  "help.home": ({ authPermissionSnapshot }) => (
    <HelpPage permissionSnapshot={authPermissionSnapshot} />
  ),
} satisfies Readonly<Record<string, AdminRouteRender>>;
```

**Data flow:** recovered distribution → one exact projection constructor/full
bundle normalization/target filter/closure proof → one branded
`embedded-help` projection and pure search index in module memory →
`(docId, locale, sectionId)` URL selection → exact projection member → confined
asset byte/hash map → surface link context + trusted copy handler → shared safe
renderer. Markdown image/HTML tokens have no evidence-card path.
The TOC and article are built from the same unique localized section array.
Initial navigation, exact TOC/hash activation and popstate use the shared
localized scroll/focus helper before body/evidence interaction.
The constructor requires an explicit `embedded-help | public-docs` target.
Admin Help requests `embedded-help`; TASK-548-04 alone requests `public-docs`.

**Error handling:** malformed bundle blocks the Help surface with a local,
non-sensitive integrity error; invalid query params are ignored/replaced;
missing doc/section returns search/404 guidance; a cross-document, cross-locale,
cross-section, duplicate, missing, unlisted, orphan or tampered visual/example
reference blocks the affected article with a bounded integrity error before
render; a verified image that later fails browser decoding retains its visible
caption/alt fallback. Unavailable official origin hides the external action;
Help-only target omits it; malformed permissions fail closed. The strict shared
renderer has no omit-invalid-evidence flag: only Guide's separate, already
authorization-filtered enrichment projection may omit an unresolved optional
card while retaining grounded text/source evidence.
An invalid heading level or duplicate section ID blocks the complete article
before partial TOC/heading/body output; a valid deep link cannot focus an
element outside the selected localized article.

**Regression-test shape:**

- deterministic projection/search bytes and ranking across repeated builds;
- compile-time import coverage pins L01's exact
  `normalizeDocsDistributionBundleV2` and target-selector owners; constructor
  spies prove one full-bundle normalization/selection, exact target
  completeness, unchanged full-corpus `sourceHash`, and no pseudo-bundle;
- structural/spread/serialized/foreign projections fail private-brand checks;
  link/evidence/reference closure rejects a cross-target destination before
  index, asset resolution, link resolution or render;
- route/product/locale/version priors, locale-first total tie order and English
  fallback notice;
- exact capability-ID ranking and stable tie behavior;
- the Help descriptor round-trips only the exact existing
  `["docs.area.getting-started"]` capability and descriptor/coverage validation
  rejects a missing, unknown or invented capability without adding a catalog
  entry;
- no network call during search/read;
- target-leak fixtures prove `embedded-help` and multi-target documents index
  and render, while `assistant`-only and `public-docs`-only documents produce no
  result, direct render or Help navigation;
- all exact owner Markdown token variants, with Markdown image/HTML input
  rejected and no token able to synthesize an evidence card;
- in both embedded Help and the portal consumer, pin every stored heading's
  exact text, native `h1`/`h2`/`h3`/`h4` level and exact `id=sectionId`, with
  body/evidence after it; pin source-order TOC labels/levels/exact `#sectionId`
  hrefs and reject duplicate IDs before any partial render;
- exercise localized initial links, TOC activation and back/forward deep links
  through `focusDocsLocalizedSectionDeepLinkV1`; assert the exact scroll target,
  `tabIndex=-1`, programmatic keyboard focus, no cross-locale/same-ID focus, and
  reduced-motion `"auto"` behavior in Help and portal fixtures;
- `section.visualIds` and `section.exampleIds` preserve authored order and emit
  explicit accessible visual cards plus inert React-escaped copy-only example
  cards; same-`docId`/same-`sectionId` records in two locales cannot cross;
- the collision fixture `exampleId="x"` plus legal `sectionId="x-title"` keeps
  the sole DOM id on the section, the exact TOC/focus target, and the example's
  accessible name without any example-owned id;
- reject cross-document, cross-locale, cross-section, duplicate, missing,
  unlisted and orphan visual/example refs, wrong local asset paths/media types,
  absent/mismatched SHA-256, tampered PNG bytes and forged card props;
- exact `DocsLinkContextV1` tests cover both discriminants, required target/
  locale/base/version fields, Help/public relative-link behavior, target
  mismatch, unknown keys, traversal, unsafe schemes and no implicit defaults;
- Help and portal pass the exact projection, member key, link context, asset
  map and copy handler; missing/undefined members fail validation;
- verified-map fixtures use confined packaged bytes, prove exact SHA-256 and
  reject missing/extra selected-article, duplicate/unknown, remote/blob/data,
  wrong-media and tampered assets without a fetch;
- example copy copies only the exact body after trusted click/keyboard
  activation and never fires on render/hydration/effect/untrusted dispatch,
  executes, previews, submits, sends telemetry or invokes an Admin mutation;
- hostile HTML/script/URL/path/asset fixtures rejected or rendered as text;
- Help route renders for authenticated empty-permission snapshot;
- null action allowed for authenticated empty snapshot; exact live `["*"]`
  satisfies every valid requirement; invalid empty non-null, missing/malformed
  snapshot, duplicate/mixed wildcard, partial/full `allOf`, and every `anyOf`
  branch;
- Admin action hidden without a satisfied non-null requirement and
  canonical/prefetched with the exact result object when allowed; direct tests
  import the named `adminActions.ts` export and prove Help uses it;
- public path/href exact-version/latest, encoding and malicious-origin/path
  tests; Help-only omits official action, public-only cannot enter Help, and
  embedded+public emits the exact official href;
- footer changes to local `/admin/help` only after route exists;
- keyboard/focus/TOC/back-forward, responsive, light/dark DOM/style assertions;
- every touched source/test file at most 1,000 lines.

## Sub-Tasks

- [ ] Build the distinct private-branded publication projection, pure search
  index, and shared closed renderer/link-policy package.
- [ ] Render exact stored section headings through the static semantic-level
  switch, unique stable anchors, a source-order TOC and the shared localized
  scroll/focus helper consumed by Help and portal.
- [ ] Export the surface-discriminated link context, projection-only asset-map
  builder and trusted copy contract; permit no optional/default renderer prop.
- [ ] Add the exact Bun-free `adminActions.ts` resolver and direct permission/
  path/result tests; Help and Guide consume the named export.
- [ ] Build deterministic local search and URL-state helpers.
- [ ] Implement exact shared public path/href helpers and hostile-input tests.
- [ ] Add the pure named Help descriptor array plus paired binding module whose
  only `descriptors` alias has reference identity with that array, and the
  responsive accessible Admin page.
- [ ] Replace the footer Docs link atomically and preserve Support.
- [ ] Add security, accessibility, route, and no-network regression suites.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs/docs-public-links.test.ts \
  tests/vitest/docs/docs-admin-actions.test.ts \
  tests/vitest/ui-integration/help-center.test.tsx \
  tests/vitest/ui/admin-shell-nav.test.tsx \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts
bun --cwd packages/docs-renderer check
bun --cwd core --eval 'const renderer = await import("@coderso/docs-renderer"); const projection = await import("@coderso/docs-renderer/projection"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.buildDocsSearchIndexV1 !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function" || typeof projection.createDocsPublicationProjectionV1 !== "function") throw new Error("docs_renderer_exports_invalid")'
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun --cwd core build:admin
bun run check:admin-bundle
find packages/docs-renderer core/admin/ui/help \
  -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} +
wc -l core/admin/app/routes/help.admin-route.tsx \
  core/admin/app/routes/help.admin-route-descriptor.ts \
  core/admin/ui/navigation/sidebarConfig.ts \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/ui-integration/help-center.test.tsx
git diff --check
```

All counts must be at most 1,000. Re-run named failures alone before
classification.

## Acceptance Criteria

- `/admin/help` and the local footer link land together and work for any
  authenticated Admin user.
- Search, reader, TOC, examples, screenshots, and local deep links use only the
  installed compiled distribution and issue no per-query network request.
- Every renderer/search/evidence/link consumer receives the exact branded
  target projection; no filtered value masquerades as a distribution bundle.
- Renderer/search primitives are reusable by TASK-548-04 without forking
  content, search rules, or safety policy.
- Help and portal render identical stored heading text/levels/IDs, exact TOC
  anchors and localized keyboard-focusable deep links through the shared
  package.
- Help and portal provide explicit surface link context, verified confined local
  asset bytes/map and user-event-only copy behavior to the same renderer.
- Unsafe content/URLs/assets fail closed; raw HTML is never rendered.
- `Open in CMS` is canonical and permission-aware; official docs are optional
  and version/locale aware.
- Light/dark, narrow/wide, keyboard, focus, and reduced-motion behavior is
  usable and tested.
- No persistent Help cache or secret/PII leakage is introduced.

## Documentation Updates Required

Hand Help search, renderer, offline, link, and accessibility behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
