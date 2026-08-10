# TASK-548-01-L01: Strict Manifest Schemas and Stable Identity
# FileName: TASK-548-01-L01-Strict-Manifest-Schemas-And-Stable-Identity.md

**Parent Subtask:** TASK-548-01
**Priority:** Critical
**Category:** Documentation Platform / Schema / Security
**Estimated Effort:** Large
**Dependencies:** None
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Create the Bun-free, dependency-neutral source of truth for documentation v2
with `packages/docs-contracts/tsconfig.json` and exactly this L01 source
allowlist:

```text
src/index.ts
src/docsCorpusTypes.ts
src/docsCorpusSchemas.ts
src/docsCorpusNormalizer.ts
src/docsCorpusLimits.ts
src/docsProductVersionRange.ts
src/docsMarkdownParser.ts
src/docsMarkdownTokens.ts
src/docsSectionDirectives.ts
src/docsPublicationTargets.ts
src/docsPublicationDtos.ts
src/docsCanonicalJsonHash.ts
src/docsCapabilityCatalog.ts
src/docsCapabilityComposition.ts
src/docsPermissionCatalogSnapshot.generated.ts
```

Own types, schemas, normalization, limits, target selection, browser-safe
publication DTOs and safe Markdown parsing there. L02 owns pure private
`src/docsMigrationReport.ts` plus server-only `src/nodeFixedWorkspace.ts` and
`src/nodeArtifactGuard.ts`; L03 owns `src/nodeLoader.ts`. L01 must not edit,
barrel-export or import those four files.
Keep the existing
`core/services/documentation/docsCorpus*`, Markdown-token/parser, section,
limit and capability module paths as thin named re-export shims whose only
runtime edge is `core -> docs-contracts`; no contracts module may
import Core, React, Bun, DB, settings, server or runtime adapters. Update
`docs/guide/_TEMPLATE.md` and add `docs/guide/corpus.manifest.json`; do not edit
`docs/guide/README.md`, assistant routes, DB schema, visual capture tooling or
portal UI.
TASK-548-07-L01 is the sole writer of the Guide README and receives this leaf's
verified authoring-contract handoff.

TASK-548-02-L02 later creates the package manifest and performs the only
workspace/lock/Docker reconciliation (it owns ALL dependency-bearing toolchain
bytes: root/core package manifests, root bun.lock, Dockerfile, all three
documentation workspace manifests, root docs scripts, exact `@playwright/cli`
and diff pins (`@playwright/cli: 0.1.18`/`pixelmatch: 7.2.0`), the one lock-producing `bun install --lockfile-only` reconciliation plus the separate `bun install --frozen-lockfile` verification, the repo-local-only dispatcher resolver
and the Chromium install/verify; it lands and gates terminally before its
pilots; TASK-548-02-L03 consumes those bytes read-only). Until then this leaf
typechecks the
source through its direct `tsconfig.json`; it does not create a package manifest
or edit the lock.

Because workspace activation occurs only in TASK-548-02-L02, every L01-owned
shim under exact `core/services/documentation/` permanently uses the confined
repo-relative target `../../../packages/docs-contracts/src/index.ts` (or the
exact owner module below that same root), with named re-exports only. Static
tests resolve the real target below that root and assert reference identity.
No later leaf rewrites these shims. Their source targets are limited to the L01
allowlist above; L02/L03 zero-input wrappers own the Node source edges.
Direct consumers landing after 02-L02 use
`@coderso/docs-contracts` through the activated manifest/dependency instead.

## Exact Shared Shapes

```ts
type DocsPublicationTarget = "assistant" | "embedded-help" | "public-docs";
type DocsPublicationSurfaceTargetV1 = "embedded-help" | "public-docs";

type DocsPermissionRequirementV1 = {
  mode: "allOf" | "anyOf";
  permissions: string[];
};

type DocsCorpusManifestV2 = {
  schema: "coderso.docs-corpus@v2";
  corpusVersion: string; // exact SemVer
  defaultLocale: string; // canonical BCP-47
  supportedLocales: string[]; // unique, default included
};

type DocsSectionV2 = {
  sectionId: string;
  heading: string;
  level: 1 | 2 | 3 | 4;
  bodyMarkdown: string;
  plainText: string;
  visualIds: string[];
  exampleIds: string[];
};

type NativeDocsSectionSourceV1 = {
  sectionId: string;
  headingOccurrence: number;
  level: 1 | 2 | 3 | 4;
  heading: string;
  bodyMarkdown: string;
};

type DocsVisualV1 = {
  visualId: string;
  sectionId: string;
  assetPath: string;
  mediaType: "image/png";
  sha256: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  scenarioStepSearchText: string[];
};

type DocsExampleV1 = {
  exampleId: string;
  sectionId: string;
  title: string;
  language: "json" | "typescript" | "bash" | "text";
  body: string;
  explanation: string;
};

type DocsExampleSidecarV1 = {
  schema: "coderso.docs-example@v1";
  docId: string;
  locale: string;
  sectionId: string;
  exampleId: string;
  title: string;
  language: "json" | "typescript" | "bash" | "text";
  body: string;
  explanation: string;
};

type DocsDocumentV2 = {
  schema: "coderso.docs-document@v2";
  docId: string;
  sourcePath: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  audience: ("admin" | "editor" | "developer")[];
  productArea: string;
  productVersionRange: string;
  adminPath: string | null;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  capabilityIds: string[];
  publicationTargets: DocsPublicationTarget[];
  keywords: string[];
  sections: DocsSectionV2[];
  visuals: DocsVisualV1[];
  examples: DocsExampleV1[];
};

type DocsDistributionBundleV2 = {
  schema: "coderso.docs-corpus@v2";
  corpusVersion: string;
  defaultLocale: string;
  supportedLocales: string[];
  sourceHash: string;
  capabilityComposition: DocsCapabilityCompositionCatalogV1;
  documents: DocsDocumentV2[];
};

type DocsPublicationVisualV1 = {
  visualId: string;
  sectionId: string;
  outputKey: string;
  mediaType: "image/png";
  sha256: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  scenarioStepSearchText: string[];
  assetPath?: never; // compile-time absence guard; never serialized
};

type DocsPublicationDocumentV1 = {
  schema: "coderso.docs-publication-document@v1";
  docId: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  audience: ("admin" | "editor" | "developer")[];
  productArea: string;
  productVersionRange: string;
  adminPath: string | null;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  capabilityIds: string[];
  publicationTargets: DocsPublicationTarget[];
  keywords: string[];
  sections: DocsSectionV2[];
  visuals: DocsPublicationVisualV1[];
  examples: DocsExampleV1[];
  sourcePath?: never; // compile-time absence guard; never serialized
};

type DocsPublicationPayloadV1<T extends DocsPublicationSurfaceTargetV1> = {
  schema: "coderso.docs-publication-payload@v1";
  body: {
    publicationTarget: T;
    corpusVersion: string;
    defaultLocale: string;
    supportedLocales: string[];
    sourceHash: string;
    documents: DocsPublicationDocumentV1[];
  };
  bodySha256: string;
};
```

The publication DTO schemas above are the only browser/public serialization
contract. Their recursive exact-key validators reject `sourcePath`,
`assetPath`, unknown keys and a full `DocsDocumentV2`/`DocsVisualV1` value.
`outputKey` is exactly `docs-png-sha256-<lowercase 64-hex visual.sha256>`: an
opaque domain-tagged content key with no filename or directory segment.
`scenarioStepSearchText` is the compiler-derived safe scenario-step search
projection: at most 16 tokens, each 1..24 UTF-8 bytes, aggregate at most 512
UTF-8 bytes, unique after exact-match dedupe, deterministic first-DSL-
occurrence order, and every token matches `^[a-z][a-z0-9-]{0,23}$`. Selector,
URL, fixture and secret-bearing punctuation (for example `#`, `.`, `[`, `]`,
`/`, `\`, `:`, `*`, `@`, `=`, `%`, `$`, `{`, `}`, `<`, `>`, the backtick,
double and single quotes) and `key=value` patterns are rejected. The exact derivation table
is owned by TASK-548-01-L02; this schema enforces shape, bounds, dedupe,
order and charset, and both normalizers round-trip the projection
byte-identically. An empty array is valid only when the visual has no
compiled scenario.
The optional-`never` members are type-only absence guards and are never emitted.
Compile-time assertions prove neither full source type is assignable to its
publication type; runtime exact-key tests prove spread/cast values still fail.
`normalizeDocsPublicationPayloadV1(unknown)` and the full-source-to-safe DTO
projector are owned by `@coderso/docs-contracts`; neither brands a renderer
projection nor performs filesystem I/O.

`packages/docs-contracts/src/docsCanonicalJsonHash.ts` is the sole owner of the
shared publication/projection hash framing and exports exactly:

```ts
export const DOCS_PUBLICATION_BODY_HASH_DOMAIN_V1 =
  "coderso.docs-publication-body@v1" as const;
export const DOCS_PUBLICATION_PROJECTION_BODY_HASH_DOMAIN_V1 =
  "coderso.docs-publication-projection-body@v1" as const;
export function hashDocsCanonicalJsonBodyV1(
  domain: typeof DOCS_PUBLICATION_BODY_HASH_DOMAIN_V1 |
    typeof DOCS_PUBLICATION_PROJECTION_BODY_HASH_DOMAIN_V1,
  normalizedBody: unknown
): string;
export function createDocsPublicationPayloadV1<T extends
  DocsPublicationSurfaceTargetV1>(body: DocsPublicationPayloadV1<T>["body"]):
  DocsPublicationPayloadV1<T>;
```

The helper applies RFC 8785 to the already recursively normalized body and hashes
exactly `UTF8(domain) || 0x00 || u64be(canonicalUtf8.length) || canonicalUtf8`.
There is no BOM, JSON whitespace, trailing LF or implicit separator; length is
unsigned 64-bit big-endian. `createDocsPublicationPayloadV1` normalizes the exact
safe body, rejects source/path-bearing values, and uses only the publication
domain. `normalizeDocsPublicationPayloadV1` recomputes through that same helper
and constant-time compares lowercase 64-hex. The framing helper's `{}` golden
vectors are publication
`ee37c8f781a7a7d74a53fbe85a75e14315a06c51eb80baa14d59ab84f365747c`
and projection
`e6e4c1771c5e6cd951cf524bb6e9eb2b34c48b4eda93c627f070df8859493065`.
Independent creator/normalizer tests pin both vectors, canonical-key equivalence,
domain substitution, length/body mutation and final-LF rejection.

The sole bundle-normalizer implementation owner is
`packages/docs-contracts/src/docsCorpusNormalizer.ts`, which exports:

```ts
export function normalizeDocsDocumentV2(
  input: unknown
): DocsDocumentV2;

export function normalizeDocsDistributionBundleV2(
  input: unknown
): DocsDistributionBundleV2;
```

`normalizeDocsDocumentV2` is the canonical compiled-object boundary. It
recursively rejects unknown document/section/visual/example keys; normalizes
locale, version range, target, permission and capability contracts; preserves
section and ordered evidence-reference order; requires exact levels `1..4`;
canonicalizes visual/example record order; normalizes every visual's
`scenarioStepSearchText` (exact-token dedupe, first-occurrence order,
token/aggregate bounds, allowed charset; unsafe punctuation and unknown keys
fail closed); revalidates safe Markdown/plain-text
parity and closes every local section/evidence reference. It never derives
compiled fields from authoring Markdown.

`normalizeDocsDistributionBundleV2` recursively rejects unknown root keys,
composes the exact manifest and document normalizers, validates the exact SHA-256
`sourceHash`, locale membership, canonical ordering, localized identity
uniqueness and bundle-global reference closure, and returns a newly normalized
bundle. It never routes an already compiled document through the Markdown
authoring parser. Pre-activation Core/compiler code imports the stable relative
named shim; post-activation Help/portal consumers import this exact owner via
`@coderso/docs-contracts`. Both resolve the same function by reference, without
a wrapper. `assertDistributionBundle` and local aliases do not exist.

The discriminator and field names above are exact. Root and nested schemas use
`additionalProperties: false`. IDs use one documented lowercase kebab-case
pattern. `docId` is stable translation-family identity and may repeat across
locales; exact document uniqueness is `(docId, locale)`. `sectionId` is unique
within one localized document; `visualId` and `exampleId` are bundle-global.
Canonical sort order is locale, `docId`, section order, then visual/example ID.
The bundle-global IDs do not replace localized ownership:
`DocsExampleSidecarV1` and every visual scenario/receipt bind the exact
`(docId, locale, sectionId)` owner.

`publicationTargets` is non-empty, unique and sorted in exact
`assistant`, `embedded-help`, `public-docs` order. It is an enforceable
distribution boundary: downstream assistant, Help and portal consumers must
select only their matching target and must never treat target absence as a
fallback. Assistant consumer eligibility is the conjunction `assistant` AND
`embedded-help`; `selectDocumentsForPublicationTarget` remains the raw
per-target selector, and Guide ingest applies the conjunction after selecting
`assistant` (see TASK-548-01-L03).

This leaf owns the exact target selector before any assistant, Help, renderer
or portal consumer lands, at
`packages/docs-contracts/src/docsPublicationTargets.ts`:

```ts
export function selectDocumentsForPublicationTarget(
  documents: readonly DocsDocumentV2[],
  target: DocsPublicationTarget
): readonly DocsDocumentV2[];
```

It accepts only normalized documents and an exact target, preserves canonical
input order, and includes a document only when its validated
`publicationTargets` contains that target. Missing/unknown targets and
unnormalized input fail closed. TASK-548-03-L02 re-exports this owner function
through `@coderso/docs-renderer`; it must not reimplement the selection rule.

### Canonical product-version range grammar

There is exactly ONE canonical range grammar in the whole contract, owned by
`packages/docs-contracts/src/docsProductVersionRange.ts` (added to this leaf's
allowlist):

```text
>=MAJOR.MINOR.PATCH <MAJOR.MINOR.PATCH
```

Exact grammar rules: both bounds are ASCII decimal `MAJOR.MINOR.PATCH` with
each component `0..2147483647`, no leading zeros except the single component
`0`, no prerelease/build metadata (`-`/`+` suffixes are rejected), no extra
whitespace, one literal ASCII space separates the two bounds, and the lower
bound must be strictly less than the upper bound (lexicographic
`(major, minor, patch)` tuple comparison). The source string is canonical and
is preserved byte-for-byte for display/round-trip; the parsed six integer
bounds (inclusive lower, exclusive upper) are the machine form.

The owner exports exactly:

```ts
type DocsProductVersionRangeV1 = Readonly<{
  source: string; // canonical `>=MAJOR.MINOR.PATCH <MAJOR.MINOR.PATCH`
  lower: Readonly<{ major: number; minor: number; patch: number }>;
  upper: Readonly<{ major: number; minor: number; patch: number }>;
}>;
export function normalizeDocsProductVersionRangeV1(value: unknown):
  DocsProductVersionRangeV1;
export function parseDocsProductVersionRangeV1(source: string):
  DocsProductVersionRangeV1;
export function assertDocsProductVersionRangeContainsV1(
  range: DocsProductVersionRangeV1,
  version: Readonly<{ major: number; minor: number; patch: number }>
): boolean;
```

`normalizeDocsProductVersionRangeV1` accepts the canonical source string
directly; `parseDocsProductVersionRangeV1` is the single parser both use. Both
fail closed with `docs_corpus_version_invalid` on malformed input (leading
zeros, prerelease/build metadata, extra whitespace, missing `>=`/`<` bounds,
non-ASCII decimals, overflow above 2,147,483,647, or lower >= upper).
`normalizeDocsDocumentV2` validates every `DocsDocumentV2.productVersionRange`
through this exact owner — there is no second SemVer-range parser anywhere in
the contracts, compiler, ingest, search context or SQL. TASK-548-01-L03
persists the six parsed bound integers on `assistant_docs_v2_documents` and
uses the same three-integer parse of `searchContext.productVersion` for its
parameterized lexicographic tuple predicates (see its exact product-version
range persistence and filtering section).

Tests table-drive the grammar: lower/upper boundary tuples (for example
`>=0.0.0 <1.0.0`, `>=1.0.0 <2.0.0`, `>=2147483647.0.0 <2147483647.0.1` —
the valid three-component maximum-int boundary pair),
malformed inputs (leading zeros such as `>=01.0.0 <2.0.0`, prerelease/build
such as `>=1.0.0-beta <2.0.0` or `>=1.0.0+build <2.0.0`, extra whitespace,
missing bound, `>=1.0.0 <1.0.0`, `>=2.0.0 <1.0.0`, overflow above
2,147,483,647 such as `>=2147483648.0.0 <2147483649.0.0` — the `2147483648`
negative fixtures stay),
byte-identical source round-trip, and the containment helper on every
boundary.

### Acyclic package and live-catalog contract

The frozen dependency graph is
`docs-contracts -> []`, `docs-renderer -> docs-contracts`,
`core -> docs-contracts + docs-renderer`, and
`docs-portal -> docs-contracts + docs-renderer`. Static import tests reject
every reverse edge, including a type-only or dynamic import from contracts or
renderer into Core. Core-owned Admin path/RBAC code is not moved into this
package and is never called by the shared renderer.
The only Core deep-source exception is the exact L01-owned named-re-export shim
path above; traversal, another contracts subroot, wrapper logic, default export
or any second Core deep import fails the edge gate.

The live Admin permission catalog remains Core-owned. To keep strict
documentation normalization dependency-neutral, this leaf owns a deterministic
tracked, IDs-only
`packages/docs-contracts/src/docsPermissionCatalogSnapshot.generated.ts` plus
`scripts/docs/generate-docs-permission-catalog-snapshot.ts`. The generator reads
the live catalog only in the authoring/test process and emits canonical sorted
IDs with a domain-separated hash; the contracts package imports only those
generated bytes. A regenerate-and-diff parity gate fails whenever the live
catalog and tracked snapshot differ. The Core Help host adapter later rechecks
the current live catalog before exposing an Admin action, so stale or unknown
permissions fail closed at both compilation and use.

For renderer integration only that Core host adapter may import `adminPaths`,
`AdminLink` helpers, live catalog or authenticated permission state. Contracts owns only
the strict permission-requirement shape/snapshot parity bytes; renderer accepts
already-resolved safe host results and never evaluates RBAC or canonicalizes an
Admin route.

`DocsPermissionRequirementV1.permissions` is non-empty, unique and sorted by
canonical permission ID. `allOf` authorizes only when the current fail-closed
snapshot contains every listed permission; `anyOf` authorizes when it contains
at least one. A null requirement means no extra catalog permission and is valid
when `adminPath` is non-null. Registry visibility/authentication remains a
separate contract: `/preview` stays public and token-gated, while `/help` is
authenticated; both descriptors normalize to null. Unknown modes, empty
arrays, authored wildcard and unknown catalog entries fail closed. Permission
consumers separately accept only the live ready snapshot `["*"]` as full
access; duplicate/mixed wildcard and other malformed snapshots fail closed, as
do partial `allOf` matches.

`capabilityIds` contains at most 32 unique sorted IDs. Each ID matches
`^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$` and exists in the new code-owned
`docsCapabilityCatalog.ts`; an empty array is valid only for the explicitly
enumerated compatibility source below. Compiler, assistant ingest/retrieval,
local search and TASK-548-06 coverage use this exact field and may not derive
alternate capability labels.

The exact implementation owner is
`packages/docs-contracts/src/docsCapabilityCatalog.ts`; the stable Core module
is a named re-export shim. It exports only the following catalog surface:

```ts
export const DOCS_CAPABILITY_CATALOG_V1 = {
  "docs.area.access-control": "access-control",
  "docs.area.analytics": "analytics",
  "docs.area.assistant": "assistant",
  "docs.area.audit": "audit",
  "docs.area.auth": "auth",
  "docs.area.backups": "backups",
  "docs.area.coderso-authoring": "coderso-authoring",
  "docs.area.coderso-booking": "coderso-booking",
  "docs.area.coderso-commerce": "coderso-commerce",
  "docs.area.coderso-custom-screens": "coderso-custom-screens",
  "docs.area.coderso-engagement": "coderso-engagement",
  "docs.area.coderso-engine": "coderso-engine",
  "docs.area.coderso-entries": "coderso-entries",
  "docs.area.coderso-forms": "coderso-forms",
  "docs.area.coderso-listings": "coderso-listings",
  "docs.area.coderso-pages": "coderso-pages",
  "docs.area.coderso-posts": "coderso-posts",
  "docs.area.dashboard": "dashboard",
  "docs.area.getting-started": "getting-started",
  "docs.area.integrations": "integrations",
  "docs.area.media": "media",
  "docs.area.menus": "menus",
  "docs.area.operations": "operations",
  "docs.area.pages": "pages",
  "docs.area.playbooks": "playbooks",
  "docs.area.redirects": "redirects",
  "docs.area.search": "search",
  "docs.area.security": "security",
  "docs.area.seo": "seo",
  "docs.area.settings": "settings",
  "docs.area.solution-kits": "solution-kits",
  "docs.area.store": "store",
  "docs.area.themes": "themes",
} as const;

export type DocsCapabilityIdV1 =
  keyof typeof DOCS_CAPABILITY_CATALOG_V1;

export function listDocsCapabilityIdsV1(): readonly DocsCapabilityIdV1[];
export function assertDocsCapabilityIdV1(value: unknown): DocsCapabilityIdV1;
export function docsAreaCapabilityIdV1(
  productArea: string
): DocsCapabilityIdV1;
```

`DocsCapabilityIdV1` remains the exact original area catalog. Its 33 keys and
the legacy `capabilityIds` frontmatter/projection stay byte-compatible; atomic
controls and workflows do not expand that union.

The separate Bun-free `docsCapabilityComposition.ts` owns strict schemas and
normalizers for one generated relation object:

```ts
type DocsCapabilitySectionIdentityV1 = Readonly<{
  docId: string;
  locale: string;
  sectionId: string;
}>;

type DocsAtomicControlIdV1 = `docs.control.${string}`;
type DocsComposedWorkflowIdV1 = `docs.workflow.${string}`;

type DocsAtomicControlRelationV1 = Readonly<{
  controlId: DocsAtomicControlIdV1;
  productAreaCapabilityId: DocsCapabilityIdV1;
  routeId: string;
  controlIdInRoute: string;
  sections: readonly DocsCapabilitySectionIdentityV1[];
}>;

type DocsComposedWorkflowRelationV1 = Readonly<{
  workflowId: DocsComposedWorkflowIdV1;
  productAreaCapabilityId: DocsCapabilityIdV1;
  expectedOutcome: string;
  orderedAtomicControlIds: readonly DocsAtomicControlIdV1[];
  sections: readonly DocsCapabilitySectionIdentityV1[];
}>;

type DocsCapabilityCompositionCatalogV1 = Readonly<{
  schema: "coderso.docs-capability-composition@v1";
  atomicControls: readonly DocsAtomicControlRelationV1[];
  composedWorkflows: readonly DocsComposedWorkflowRelationV1[];
}>;
```

The exact tracked catalog is compiled by TASK-548-01-L02 before the distribution
bundle from three L02-owned tracked sources:
`docs/guide/capabilities/atomic-controls.v1.json`,
`docs/guide/capabilities/composed-workflows.v1.json`, and
`docs/guide/capabilities/section-bindings.v1.json`. L02 verifies those sources
against the current pure Admin route/control descriptors, explicit shipped
workflow identities, and exact localized document sections; there is no
prose/title/path heuristic. The ALREADY-LANDED exact compiler CLI refreshes
these sources during the already-declared post-pilot/final
native-corpus generated-artifact-only checkpoints (no agent writer, no
human-authored source/task/status edit) before compiling the bundle.
TASK-548-06-L02 only validates and projects the catalog already inside the
final bundle into its coverage outputs. Unknown
controls, workflows without an eligible section, missing atoms, duplicate/
reordered relations, cycles, cross-area references without an explicit owner,
and stale inventory fail closed. The relation carries no path, URL, prose,
permission grant, or publication override; Guide reauthorizes matching active
DB evidence before use. `DocsDocumentV2`, frontmatter, and publication DTOs gain
no key. The normalized distribution bundle carries the catalog once as a
separate root object so ingest, Help, Guide, portal, and coverage consume
identical relation bytes. TASK-414-02 consumes this exact separate object.
After TASK-548 closure, exact post-terminal source/output successors are
serialized as TASK-489, TASK-555, TASK-414-02-L02, then TASK-556. The first two
own only their Solution Kits/curated-starter source and relation deltas;
TASK-414-02-L02 owns final Agent/Designer/Figma reconciliation and the first CMS
capability artifact; TASK-556 owns its later static-starter delta. Every
successor uses these unchanged schemas plus landed compiler/output transactions
and closes with current generated bytes. Runtime-installed packs use a DB/runtime
overlay and never write these tracked files.

`listDocsCapabilityIdsV1()` returns exact UTF-8 byte-order sorted keys.
`docsAreaCapabilityIdV1(productArea)` accepts only an exact catalog value and
returns its unique key; it never manufactures a new ID. Adding, removing or
renaming a product area/capability is a schema-contract change that updates the
catalog, the frozen legacy projection and coverage together. The only current
empty-array compatibility exception is explicitly owned by TASK-548-01-L02 for
`docs/guide/getting-started/admin-orientation.md`; no title, keyword or
directory heuristic may create another exception.

In the final corpus each Markdown frontmatter record contains
`schema: "coderso.docs-document@v2"` and the document fields except
`sourcePath`, `sections`, `visuals` and `examples`, which the compiler derives.
Until TASK-548-06 finishes the mechanical source migration, TASK-548-01-L02 may
adapt the existing legacy frontmatter into this exact output shape; the adapter
is compatibility input, not a second v2 contract.
Example placement is authored only at
`docs/guide/examples/<docId>/<locale>/<exampleId>.json`. The recursively strict
`DocsExampleSidecarV1` envelope must agree with those normalized path segments,
normalize `locale` through the corpus canonical BCP-47 normalizer, and join
exactly one document and section by `(docId, locale, sectionId)`. The compiler
projects its content fields to nested `DocsExampleV1`; it never persists a
second document identity inside that nested output. Visual placement uses the
equivalent locale-bearing scenario/image/receipt paths owned by TASK-548-02.
Authors do not write arbitrary asset paths or derived Help/public URLs.

## Native Section Identity Directive

Native v2 Markdown owns section identity in the body, never in frontmatter.
Immediately before every level 1–4 ATX heading, with no blank line, write exactly:

```text
[[coderso-section:<ordinal>:<section-id>]]
## Heading text
```

The complete directive grammar is
`^\[\[coderso-section:([1-9][0-9]{0,3}):([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\]\]$`.
`ordinal` is the one-based ATX-heading occurrence and directives must form the
contiguous sequence `1..N` in source order. `section-id` uses the canonical
lowercase kebab ID pattern and is unique within the document. The next line must
be exactly one ATX heading with 1–4 `#` characters followed by one ASCII space
and non-empty bounded text. Setext headings are unsupported.

`parseNativeDocsSectionDirectivesV1(markdown)` validates the complete directive
graph and returns `NativeDocsSectionSourceV1[]`.
`serializeNativeDocsSectionDirectiveV1({ sectionId, headingOccurrence })` emits
the exact single directive line. `headingOccurrence` is parser-only validation
state and must never spread into `DocsSectionV2`. The compiler strips the
directive before the closed safe-Markdown parser and before `bodyMarkdown`
enters `DocsSectionV2`, so Help/portal/Guide never render marker text.

Native v2 rejects a missing/unknown/malformed directive, raw HTML marker,
non-contiguous/repeated ordinal, duplicate ID, orphan directive, directive not
immediately followed by its heading, heading without a directive, and markers
reordered independently from headings. Legacy input contains no directives;
L02 derives its transitional IDs and the migration writes these exact native
directives from the report. `sections` remains excluded from frontmatter.

## Safe Markdown Token Contract

The Bun-free parser owns these complete exact unions:

```ts
type DocsCodeLanguageV1 =
  | "bash"
  | "css"
  | "html"
  | "javascript"
  | "json"
  | "sql"
  | "text"
  | "tsx"
  | "typescript";

type DocsInlineTokenV1 =
  | { type: "text"; value: string }
  | { type: "emphasis"; children: DocsInlineTokenV1[] }
  | { type: "strong"; children: DocsInlineTokenV1[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: DocsInlineTokenV1[] };

type DocsListItemTokenV1 = {
  children: DocsBlockTokenV1[];
};

type DocsCalloutTokenV1 = {
  type: "callout";
  tone: "note" | "info" | "warning";
  title: string | null;
  children: DocsBlockTokenV1[];
};

type DocsTableTokenV1 = {
  type: "table";
  align: ("left" | "center" | "right" | null)[];
  header: DocsInlineTokenV1[][];
  rows: DocsInlineTokenV1[][][];
};

type DocsBlockTokenV1 =
  | { type: "paragraph"; children: DocsInlineTokenV1[] }
  | {
      type: "heading";
      level: 1 | 2 | 3 | 4;
      anchor: string;
      children: DocsInlineTokenV1[];
    }
  | {
      type: "list";
      ordered: boolean;
      start: number | null;
      items: DocsListItemTokenV1[];
    }
  | { type: "codeBlock"; language: DocsCodeLanguageV1; value: string }
  | DocsCalloutTokenV1
  | DocsTableTokenV1;

type ParsedSafeMarkdownSectionV1 = {
  tokens: DocsBlockTokenV1[];
  plainText: string;
};

export function parseSafeMarkdownSection(
  bodyMarkdown: string
): ParsedSafeMarkdownSectionV1;
```

Callout source syntax is a fenced `:::note|info|warning [optional title]`
block closed by `:::`. Callouts and tables cannot nest either construct.
Tables use one pipe-header row, one delimiter row and bounded body rows; each
row must have the same bounded cell count. Cells accept only the closed inline
token subset. Inline recursion depth, block/list/callout nesting, list item
count, table rows/columns/cells, token count and aggregate text bytes have named
constants in `docsCorpusLimits.ts`; no recursive branch can bypass them.
Unclosed directives, unknown tones/languages, ragged/oversized tables,
block/raw HTML, unsafe links and recursive constructs fail closed.
`parseSafeMarkdownSection` is the one parser export name. The shared renderer
in TASK-548-03 imports this function and these owner types from
`@coderso/docs-contracts` and never defines a parallel parser or token union.

## Security Contract

- **Endpoint/auth/RBAC/CSRF/rate limit:** no endpoint; pure local contract.
- **Reject unknown:** every manifest/frontmatter/sidecar object is strict,
  including nested arrays and optional values. Native heading directives use
  only the exact compiler-owned grammar above and are removed before rendering.
- **Version range:** every `productVersionRange` is validated through the ONE
  canonical `>=MAJOR.MINOR.PATCH <MAJOR.MINOR.PATCH` grammar owner
  (`docsProductVersionRange.ts`); leading zeros, prerelease/build metadata,
  extra whitespace, overflow and lower >= upper fail closed. There is no
  second range parser anywhere.
- **Path/URL policy:** source paths must remain below `docs/guide`; `adminPath`
  is `null` or a default-base canonical `/admin...` path without query/hash,
  alias, traversal or protocol. Markdown links allow local anchors/relative docs
  and HTTPS only. Images are allowed only through `DocsVisualV1`.
- **Permissions:** every non-wildcard permission must exist in the hash-bound
  generated snapshot, whose gate must equal
  `core/services/admin/permissionsCatalog.ts`; `*` is forbidden in docs.
  Normalize only the exact `DocsPermissionRequirementV1` shape and apply the
  locked `allOf`/`anyOf` semantics. Core rechecks the live catalog before use.
- **Capabilities:** every `capabilityIds` entry matches the locked format,
  exists in `docsCapabilityCatalog.ts`, and is bounded, unique and sorted.
  Atomic/workflow keys additionally close over the frozen control/workflow
  inventory and ordered relation exports; classification never grants a CMS
  permission or executable action.
- **Scenario projection:** `scenarioStepSearchText` carries only the bounded
  allowlisted DSL-derived tokens above. Locators, `fixtureValueRef`, expected
  values, watch paths, route, viewport, theme and `alt`/`caption` never enter
  it; selector/secret-bearing punctuation and out-of-bounds tokens fail
  closed.
- **Localized sidecars:** reject a noncanonical locale, a path/envelope
  mismatch, an absent/duplicate `(docId, locale)` owner, an absent/duplicate
  section within that owner, or a bundle-global example/visual ID collision.
- **Anti-abuse:** cap documents, sections, nesting, arrays, string/body bytes,
  code-fence bytes and total diagnostics. No nonce/HMAC/CAPTCHA applies.
- **Secrets/privacy:** run secret-like key/value and credential-URL checks over
  metadata/examples; never include raw source bodies in errors.

## Implementation Pseudocode

```ts
export function normalizeDocsCorpusManifestV2(value: unknown): DocsCorpusManifestV2 {
  const parsed = assertStrictJsonSchema(value, docsCorpusManifestV2Schema);
  return {
    schema: "coderso.docs-corpus@v2",
    corpusVersion: assertExactSemVer(parsed.corpusVersion),
    defaultLocale: canonicalizeBcp47(parsed.defaultLocale),
    supportedLocales: uniqueSortedLocales(parsed.supportedLocales),
  };
}

export function normalizeDocsDocumentV2(
  input: unknown
): DocsDocumentV2 {
  const parsed = assertStrictJsonSchema(input, docsDocumentV2Schema);
  const meta = normalizeStrictDocumentMeta({
    schema: parsed.schema,
    docId: parsed.docId,
    locale: parsed.locale,
    slug: parsed.slug,
    title: parsed.title,
    summary: parsed.summary,
    audience: parsed.audience,
    productArea: parsed.productArea,
    productVersionRange: normalizeDocsProductVersionRangeV1(
      parsed.productVersionRange
    ).source,
    adminPath: parsed.adminPath,
    permissionRequirement: parsed.permissionRequirement,
    capabilityIds: parsed.capabilityIds,
    publicationTargets: parsed.publicationTargets,
    keywords: parsed.keywords,
  });
  assertConfinedGuidePath(parsed.sourcePath);
  const sections = normalizeCompiledDocsSectionsV2(parsed.sections, {
    allowedLevels: [1, 2, 3, 4],
    preserveOrder: true,
  });
  const document = {
    ...meta,
    sourcePath: parsed.sourcePath,
    sections,
    visuals: normalizeCompiledDocsVisualsV1(parsed.visuals, sections),
    examples: normalizeCompiledDocsExamplesV1(parsed.examples, sections),
  };
  assertSafeMarkdownPlainTextParity(document.sections);
  assertCanonicalDocumentEvidenceOrder(document);
  assertCompleteDocumentReferenceClosure(document);
  return document;
}

export function normalizeDocsDistributionBundleV2(
  input: unknown
): DocsDistributionBundleV2 {
  const parsed = assertStrictJsonSchema(input, docsDistributionBundleV2Schema);
  const manifest = normalizeDocsCorpusManifestV2({
    schema: parsed.schema,
    corpusVersion: parsed.corpusVersion,
    defaultLocale: parsed.defaultLocale,
    supportedLocales: parsed.supportedLocales,
  });
  const documents = parsed.documents.map(normalizeDocsDocumentV2);
  const capabilityComposition = normalizeDocsCapabilityCompositionCatalogV1(
    parsed.capabilityComposition,
  );
  assertDocumentsUseSupportedLocales(documents, manifest.supportedLocales);
  assertCanonicalDocumentOrder(documents);
  assertStableDocumentIdentityPairs(documents);
  assertCompleteBundleReferenceClosure(documents);
  assertCompositionSectionBindingsCloseOverDocuments(
    capabilityComposition,
    documents,
  );
  return {
    ...manifest,
    sourceHash: assertExactSha256(parsed.sourceHash),
    capabilityComposition,
    documents,
  };
}

export function projectDocsPublicationDocumentV1(
  document: DocsDocumentV2
): DocsPublicationDocumentV1 {
  // Internal only: caller already supplied the once-normalized bundle member.
  assertCompleteDocumentReferenceClosure(document);
  return deepFreeze({
    schema: "coderso.docs-publication-document@v1",
    ...copyExactBrowserSafeDocumentFields(document),
    visuals: document.visuals.map(({ assetPath: _omitted, ...visual }) => ({
      ...visual,
      outputKey: createOpaqueDocsVisualOutputKeyV1({
        sha256: visual.sha256,
      }),
    })),
  });
}

export function normalizeDocsPublicationPayloadV1(
  input: unknown
): DocsPublicationPayloadV1<DocsPublicationSurfaceTargetV1> {
  const payload = assertStrictJsonSchema(input, docsPublicationPayloadV1Schema);
  const body = normalizeExactPublicationBodyAndSafeDocuments(payload.body);
  constantTimeAssertSha256(payload.bodySha256,
    hashDocsCanonicalJsonBodyV1(DOCS_PUBLICATION_BODY_HASH_DOMAIN_V1, body));
  assertTargetMembershipOrderAndSafeReferenceClosure(body);
  return deepFreeze({ ...payload, body });
}

export function parseDocsDocumentV2(input: {
  sourcePath: string;
  markdown: string;
}): Omit<DocsDocumentV2, "visuals" | "examples"> {
  assertConfinedGuidePath(input.sourcePath);
  const { frontmatter, body } = parseStrictFrontmatter(input.markdown);
  const meta = normalizeStrictDocumentMeta(frontmatter);
  const permissionRequirement = normalizeDocsPermissionRequirementV1(
    meta.permissionRequirement
  );
  const capabilityIds = normalizeDocsCapabilityIds(meta.capabilityIds);
  const sectionSources = parseNativeDocsSectionDirectivesV1(body);
  const sections = sectionSources.map((source): DocsSectionV2 => {
    const parsedBody = parseSafeMarkdownSection(source.bodyMarkdown);
    return {
      sectionId: source.sectionId,
      heading: source.heading,
      level: source.level,
      bodyMarkdown: source.bodyMarkdown,
      plainText: parsedBody.plainText,
      visualIds: [],
      exampleIds: [],
    };
  });
  assertStableSectionIds(sections);
  return {
    ...meta,
    permissionRequirement,
    capabilityIds,
    sourcePath: input.sourcePath,
    sections,
  };
}

export function assertStableDocumentIdentityPairs(
  documents: readonly DocsDocumentV2[]
): void {
  assertUniqueBy(documents, (document) => [document.docId, document.locale]);
  assertBundleGlobalIds(documents, "visualId");
  assertBundleGlobalIds(documents, "exampleId");
}
```

**Data flow:** unknown JSON/Markdown → byte/depth caps → strict frontmatter →
BCP-47/SemVer/path/permission/capability validation → closed Markdown AST →
explicit projection from parser-only `NativeDocsSectionSourceV1` into exact
`DocsSectionV2` → empty visual/example joins for the later strict sidecar join →
normalized plain text and stable sections. `headingOccurrence` and parser
tokens never enter the persisted section object. Raw HTML, Markdown images,
unknown syntax, unsafe schemes or unresolved IDs return no partial document.

**Error handling:** emit bounded `docs_corpus_invalid`,
`docs_corpus_unknown_field`, `docs_corpus_duplicate_id`,
`docs_corpus_locale_invalid`, `docs_corpus_version_invalid`,
`docs_corpus_path_invalid`, `docs_corpus_permission_invalid`,
`docs_corpus_capability_invalid` and
`docs_corpus_markdown_unsafe` diagnostics with source path and field only.

**Regression-test shape:** table-test every unknown field and unsafe construct;
accept canonical locale/SemVer/path/permission records; reject an exact duplicate
`(docId, locale)` pair while accepting the same translation-family `docId` in
two supported locales; reject bundle-global visual/example duplicates, aliases,
traversal, raw HTML, `javascript:`/`data:`/`file:` links, Markdown or remote
images, oversized/deep input and secret-like examples. Prove normalization
idempotence, exact locale-then-`docId` and publication-target ordering, and
multi-target round trips. Assert native parsing drops `headingOccurrence`,
initializes both join arrays empty, and exposes only exact `DocsSectionV2` keys
before sidecar joins. Table-drive the ONE canonical product-version range
grammar owner (`docsProductVersionRange.ts`): lower/upper boundary tuples,
malformed inputs (leading zeros, prerelease/build metadata, extra whitespace,
missing bounds, lower >= upper, overflow above 2,147,483,647), byte-identical
source round-trip through `normalizeDocsDocumentV2`, the parsed six integer
bounds, and the containment helper on every boundary; prove no second range
parser exists in the contracts graph.
Import both exact named compiled-object normalizers in the owner contract test;
prove their compile-time `unknown -> DocsDocumentV2` and
`unknown -> DocsDistributionBundleV2` signatures, idempotence, recursive
root/document/section/visual/example unknown-key rejection, nested normalizer
composition and the absence of `assertDistributionBundle`. Mutate every
document identity/locale/version/target/permission/capability field, each
section level/order and ordered visual/example ref, each nested record order and
owner, Markdown/plain-text parity, orphan/missing/duplicate refs and
bundle-global collision. Each invalid variant fails without falling back to
`parseDocsDocumentV2`; valid compiled round trips preserve section/evidence
order.
Round-trip `DocsExampleSidecarV1` through its canonical
`examples/<docId>/<locale>/<exampleId>.json` path. Use two locales with the same
`docId` and `sectionId` to prove a sidecar joins only its explicit locale;
reject path/envelope locale drift and noncanonical BCP-47 bytes.
Round-trip `scenarioStepSearchText` on visual fixtures through both compiled
normalizers: prove byte-identical projection output, exact-token dedupe,
first-DSL-occurrence order, the 16/24/512 bounds, charset rejection of
selector/URL/fixture/secret punctuation, and empty-array validity; negative
fixtures seed locator, `fixtureValueRef`, expected-value and watch-path bytes
and prove none normalize into the projection.
Round-trip every valid native directive through the exact serializer/parser;
reject missing/orphan/duplicate/unknown markers, non-contiguous ordinals, raw
HTML substitutes, Setext headings and independently reordered markers. Reorder
whole marker+heading pairs only after assigning new contiguous ordinals and
prove stable section IDs remain attached to their headings.
Test null plus authenticated empty-snapshot success, an invalid empty non-null
permission list, empty/partial protected snapshots, exact live `["*"]` full
access, duplicate/mixed wildcard snapshot rejection, full `allOf`, every
`anyOf` branch, authored wildcard rejection, unknown
modes/permissions, capability format/catalog/order failures, and capability
round trips. Pin all 33 exact capability IDs, product-area reverse lookup,
sorted enumeration, unknown product area rejection, and the single current
orientation exception consumed by L02. The separate composition tests reject
missing atoms, duplicate/order drift, cycles, stale control or workflow
inventory, a workflow documented only by its area key, cross-locale section
ownership, and target/permission-ineligible mappings while preserving
byte-compatible lookup of all original area IDs. Cover every token variant plus
unclosed, nested, ragged, oversized and malicious inline variants.
Regenerate the permission snapshot in memory and require byte/hash identity;
mutate either side and prove the parity gate fails. Import every stable Core
shim and assert reference identity with the contracts export, then statically
reject Core/React/Bun/DB/settings imports from the L01 graph, pin its exact
source allowlist, reserve all four later-owner files to L02/L03, and reject every other
relative/deep contracts import from Core.
Add compile-time non-assignability assertions for full source document/visual
 types versus publication DTOs, runtime exact-key/source-path/asset-path
 canaries, deterministic opaque-output-key fixtures, both fixed framed-hash
 vectors and creator/normalizer safe-payload round trips.

## Sub-Tasks

- [ ] Add dependency-neutral `packages/docs-contracts/src/docsCorpusTypes.ts`,
  `docsCorpusSchemas.ts`,
  `docsCorpusNormalizer.ts`, `docsProductVersionRange.ts`,
  `docsMarkdownParser.ts`,
  `docsMarkdownTokens.ts`, `docsSectionDirectives.ts`,
  `docsPublicationTargets.ts`, `docsPublicationDtos.ts` strict schema/projector,
  `docsCanonicalJsonHash.ts`,
  `docsCapabilityCatalog.ts`, `docsCapabilityComposition.ts`, generated permission snapshot and
  `docsCorpusLimits.ts`, each below 1,000 lines, plus Core named re-export shims
  and `index.ts` exactly; exclude all four later-owner files and reverse dependencies.
- [ ] Add the v2 root manifest and update only the author template with stable
  IDs, locale/version/path/permission/capability/publication rules and one safe
  example; hand the README wording to TASK-548-07-L01.
- [ ] Add `tests/vitest/documentation/docs-corpus-contract.test.ts` and
  `docs-markdown-policy.test.ts`; keep fixtures in focused support files.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-corpus-contract.test.ts tests/vitest/documentation/docs-markdown-policy.test.ts`
- `tsc -p packages/docs-contracts/tsconfig.json --noEmit`
- regenerate-and-diff permission snapshot parity plus exact L01 allowlist/four-
  file exclusion, package-edge and Core-export-reference-identity gates
- publication DTO compile-time non-assignability, runtime exact-key and
  source/asset-path canary gates
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- the canonical NUL-safe line-count gate over the leaf write set (identical
  contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  with `exit 1`, including a non-newline final line):

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

## Documentation Updates Required

This leaf owns `docs/guide/_TEMPLATE.md` and
`docs/guide/corpus.manifest.json`, not `docs/guide/README.md`. Send the final
exact type, capability, permission and safety contract to TASK-548-07-L01 for
the sole closeout documentation edit.
