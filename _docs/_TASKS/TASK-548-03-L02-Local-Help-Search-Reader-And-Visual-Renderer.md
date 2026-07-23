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
bun --cwd core --eval 'const renderer = await import("@coderso/docs-renderer"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function") throw new Error("docs_renderer_exports_invalid")'
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
  capabilityIds: ["documentation.help"],
}] as const satisfies readonly AdminRouteDescriptorV1[];
```

`documentation.help` must exist in the TASK-548-01 capability catalog.
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

## Local Search Contract

Build an immutable in-memory index once per bundle identity. Rank only validated
records whose exact `publicationTargets` contains `embedded-help`, using stable
deterministic signals:

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

Target absence fails closed. A multi-target document is eligible when it
contains `embedded-help`; `assistant`-only and `public-docs`-only documents are
neither indexed nor directly renderable in Help. TASK-548-04 remains the sole
`public-docs` portal consumer.

## Safe Renderer and Link Policy

The renderer accepts normalized `DocsDocumentV2`/`DocsSectionV2` values only,
parses each exact `bodyMarkdown` through the shared TASK-548-01 closed Markdown
parser, and maps its safe internal token stream to React elements. The token
stream is an implementation detail, not a second persisted docs schema. It
must:

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
- resolve every listed visual only through the exact
  `{ docId, locale, sectionId, visualId }` owner and every listed example only
  through `{ docId, locale, sectionId, exampleId }`. The localized document,
  section list, nested record and bundle-global ID index must all agree exactly;
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

// packages/docs-renderer/src/search.ts
export function createDocsSearchIndex(
  bundle: DocsDistributionBundleV2,
  input: {
    publicationTarget: "embedded-help" | "public-docs";
  }
): DocsSearchIndex {
  assertDistributionBundle(bundle);
  const targetDocuments = selectDocumentsForPublicationTarget(
    bundle.documents,
    input.publicationTarget
  );
  return indexPublishedSections(targetDocuments, {
    text: ["title", "keywords", "heading", "body", "visualAlt", "exampleLabel"],
    stableTieBreak: ["locale", "docId", "sectionId"],
  });
}

export function searchDocs(
  index: DocsSearchIndex,
  input: DocsSearchInput
): readonly DocsSearchResult[] {
  const query = normalizeBoundedQuery(input.query);
  return rankLocalMatches(index, query, input)
    .filter(isVersionLocaleCompatible)
    .slice(0, clampResultLimit(input.limit));
}

// packages/docs-renderer/src/evidenceCards.ts
export type DocsLocalVisualAssetV1 = {
  assetPath: string;
  href: string;
  bytes: Uint8Array;
};

export type DocsAccessibleVisualCardV1 = {
  kind: "visual";
  visualId: string;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export type DocsInertExampleCardV1 = {
  kind: "example";
  exampleId: string;
  title: string;
  language: "json" | "typescript" | "bash" | "text";
  body: string;
  explanation: string;
};

export type DocsSectionEvidenceCardsV1 = {
  visualCards: readonly DocsAccessibleVisualCardV1[];
  exampleCards: readonly DocsInertExampleCardV1[];
};

export function resolveDocsSectionEvidenceCards(input: {
  bundle: DocsDistributionBundleV2;
  document: DocsDocumentV2;
  section: DocsSectionV2;
  localVisualAssets: ReadonlyMap<string, DocsLocalVisualAssetV1>;
}): DocsSectionEvidenceCardsV1 {
  const document = resolveExactBundleDocument(input.bundle, {
    docId: input.document.docId,
    locale: input.document.locale,
  });
  assertSameNormalizedDocument(document, input.document);
  const section = resolveExactDocumentSection(document, input.section.sectionId);
  assertSameNormalizedSection(section, input.section);

  const visualCards = section.visualIds.map((visualId) => {
    const visual = resolveStrictOwnedVisual(input.bundle, {
      docId: document.docId,
      locale: document.locale,
      sectionId: section.sectionId,
      visualId,
    });
    const asset = resolveHashedLocalVisual(input.localVisualAssets, {
      assetPath: visual.assetPath,
      expectedSha256: visual.sha256,
      mediaType: "image/png",
    });
    return {
      kind: "visual" as const,
      visualId: visual.visualId,
      src: asset.href,
      alt: visual.alt,
      caption: visual.caption,
      width: visual.width,
      height: visual.height,
    };
  });
  const exampleCards = section.exampleIds.map((exampleId) => {
    const example = resolveStrictOwnedExample(input.bundle, {
      docId: document.docId,
      locale: document.locale,
      sectionId: section.sectionId,
      exampleId,
    });
    return {
      kind: "example" as const,
      exampleId: example.exampleId,
      title: example.title,
      language: example.language,
      body: example.body,
      explanation: example.explanation,
    };
  });
  return { visualCards, exampleCards };
}

// packages/docs-renderer/src/DocsDocumentRenderer.tsx
export type DocsRendererProps = {
  bundle: DocsDistributionBundleV2;
  document: DocsDocumentV2;
  publicationTarget: "embedded-help" | "public-docs";
  linkContext: DocsLinkContextV1;
  localVisualAssets: ReadonlyMap<string, DocsLocalVisualAssetV1>;
  copyExampleBody: (body: string) => void | Promise<void>;
};

export function DocsDocumentRenderer(props: DocsRendererProps) {
  assertDocumentHasPublicationTarget(
    props.document,
    props.publicationTarget
  );
  return props.document.sections.map((section) => {
    const evidence = resolveDocsSectionEvidenceCards({
      bundle: props.bundle,
      document: props.document,
      section,
      localVisualAssets: props.localVisualAssets,
    });
    return (
      <DocsSection
        key={section.sectionId}
        tokens={parseSafeMarkdownSection(section.bodyMarkdown).tokens}
        resolveLink={(link) => resolveSafeDocsLink(link, props.linkContext)}
        visualCards={evidence.visualCards}
        exampleCards={evidence.exampleCards}
        renderVisualCard={(card) => (
          <figure key={card.visualId}>
            <img
              src={card.src}
              alt={card.alt}
              width={card.width}
              height={card.height}
              loading="lazy"
            />
            <figcaption>{card.caption}</figcaption>
          </figure>
        )}
        renderExampleCard={(card) => (
          <article key={card.exampleId} aria-labelledby={`${card.exampleId}-title`}>
            <h4 id={`${card.exampleId}-title`}>{card.title}</h4>
            <pre><code data-language={card.language}>{card.body}</code></pre>
            <p>{card.explanation}</p>
            <button
              type="button"
              aria-label={`Copy ${card.title}`}
              onClick={() => void props.copyExampleBody(card.body)}
            >
              Copy
            </button>
          </article>
        )}
      />
    );
  });
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

**Data flow:** recovered embedded validated distribution → one in-memory index
→ `(docId, locale, sectionId)` URL/query selection → strict localized
document/section → ordered `visualIds`/`exampleIds` → exact localized ownership
joins → visual byte/hash verification plus strict example projection → explicit
accessible visual cards and inert copyable example cards beside the safe
Markdown-token React renderer → optional canonical Help/Admin links and
target-gated official link. Markdown image/HTML tokens have no evidence-card
path.
The shared package requires an explicit `embedded-help | public-docs` consumer
target and has no default. Admin Help always passes `embedded-help`; TASK-548-04
is the only owner allowed to pass `public-docs`.

**Error handling:** malformed bundle blocks the Help surface with a local,
non-sensitive integrity error; invalid query params are ignored/replaced;
missing doc/section returns search/404 guidance; a cross-document, cross-locale,
cross-section, duplicate, missing, unlisted, orphan or tampered visual/example
reference blocks the affected article with a bounded integrity error before
render; a verified image that later fails browser decoding retains its visible
caption/alt fallback. Unavailable official origin hides the external action;
Help-only target omits it; malformed permissions fail closed.

**Regression-test shape:**

- deterministic ranking and tie order across repeated builds;
- route/product/locale/version priors, locale-first total tie order and English
  fallback notice;
- exact capability-ID ranking and stable tie behavior;
- no network call during search/read;
- target-leak fixtures prove `embedded-help` and multi-target documents index
  and render, while `assistant`-only and `public-docs`-only documents produce no
  result, direct render or Help navigation;
- all exact owner Markdown token variants, with Markdown image/HTML input
  rejected and no token able to synthesize an evidence card;
- `section.visualIds` and `section.exampleIds` preserve authored order and emit
  explicit accessible visual cards plus inert React-escaped copy-only example
  cards; same-`docId`/same-`sectionId` records in two locales cannot cross;
- reject cross-document, cross-locale, cross-section, duplicate, missing,
  unlisted and orphan visual/example refs, wrong local asset paths/media types,
  absent/mismatched SHA-256, tampered PNG bytes and forged card props;
- example copy copies only the exact body and never executes, previews, submits
  or invokes an Admin mutation;
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

- [ ] Build the shared closed renderer/link-policy package.
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
bun --cwd core --eval 'const renderer = await import("@coderso/docs-renderer"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function") throw new Error("docs_renderer_exports_invalid")'
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
- Renderer/search primitives are reusable by TASK-548-04 without forking
  content, search rules, or safety policy.
- Unsafe content/URLs/assets fail closed; raw HTML is never rendered.
- `Open in CMS` is canonical and permission-aware; official docs are optional
  and version/locale aware.
- Light/dark, narrow/wide, keyboard, focus, and reduced-motion behavior is
  usable and tested.
- No persistent Help cache or secret/PII leakage is introduced.

## Documentation Updates Required

Hand Help search, renderer, offline, link, and accessibility behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
