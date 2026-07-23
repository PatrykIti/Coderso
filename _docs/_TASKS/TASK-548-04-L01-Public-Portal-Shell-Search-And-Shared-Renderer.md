# TASK-548-04-L01: Public Portal Shell, Search and Shared Renderer
# FileName: TASK-548-04-L01-Public-Portal-Shell-Search-And-Shared-Renderer.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-04
**Priority:** High
**Category:** Public Docs UI / Static App / Search
**Estimated Effort:** Large
**Dependencies:** TASK-548-03-L03
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

- Header: Coderso Docs identity, product version selector, actual locale
  selector, search, theme control, and link to the product site.
- Desktop: persistent documentation navigation + article + on-page TOC without
  covering content.
- Mobile: keyboard-accessible disclosure/dialog navigation with focus trap,
  close/restore, and no horizontal overflow.
- Article: shared `DocsDocumentRenderer`; sanitized local visuals/examples;
  previous/next and related docs derived only from the explicit `public-docs`
  projection's ordering.
- Search: shared `createDocsSearchIndex`/`searchDocs`; scoped to selected
  version+locale and called with exact target `public-docs`; title/section/
  snippet results; empty-state suggestions; query reflected in bounded URL
  state by L02 route helpers once available.
- Locale fallback is explicit. Selector lists only shipped locales and labels
  English fallback; it never presents a full Polish experience unless the
  selected record exists.
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
export type DocsPortalPublicProjectionV1 = {
  publicationTarget: "public-docs";
  bundle: DocsDistributionBundleV2;
  selected: DocsDocumentSelection;
};

export type DocsPortalShellProps = {
  publicDocs: DocsPortalPublicProjectionV1;
  productVersion: string;
  navigation: DocsPortalNavigation;
};

export function DocsPortalShell(props: DocsPortalShellProps) {
  const publicDocs = assertDocsPortalPublicProjectionV1(props.publicDocs);
  const searchIndex = createDocsSearchIndex(publicDocs.bundle, {
    publicationTarget: publicDocs.publicationTarget,
  });
  const [query, setQuery] = usePortalSearchQuery();
  const results = searchDocs(searchIndex, {
    query,
    version: props.productVersion,
    locale: publicDocs.selected.locale,
  });

  return (
    <PortalLandmarks>
      <PortalHeader versions={props.navigation.versions} locales={props.navigation.locales} />
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
- actual locale/version selectors only and explicit English fallback;
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
bunx vite build --config packages/docs-portal/vite.config.ts
bun run precommit:check
find packages/docs-portal/src/app packages/docs-portal/src/search \
  packages/docs-portal/src/styles \
  -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} +
wc -l packages/docs-portal/vite.config.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx
git diff --check
```

Every count must be at most 1,000. Re-run named failures alone before
classification.

## Acceptance Criteria

- The portal workspace compiles with the current repo stack and no unnecessary
  dependency/framework.
- Shell/search consume the exact shared renderer and exact compiled bundle.
- Wide/narrow, keyboard/focus, theme, reduced-motion, real locale fallback, and
  empty/error states are accessible and tested.
- Search/article rendering creates no remote runtime dependency or unsafe
  markup.
- Root `package.json` and `bun.lock` remain untouched under the exclusive
  TASK-548-02-L03 ownership, as do both documentation workspace manifests.

## Documentation Updates Required

Hand the frozen-workspace assertion, portal shell, local-search, renderer, and
bundle-boundary contract to TASK-548-07; this leaf edits no shared closeout
documentation.
