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

Create the Bun-free source of truth for documentation v2. Own new focused
modules under `core/services/documentation/` for types, schemas, normalization,
source limits and safe Markdown parsing. Update `docs/guide/_TEMPLATE.md` and
add `docs/guide/corpus.manifest.json`; do not edit `docs/guide/README.md`,
assistant routes, DB schema, visual capture tooling or portal UI.
TASK-548-07-L01 is the sole writer of the Guide README and receives this leaf's
verified authoring-contract handoff.

## Exact Shared Shapes

```ts
type DocsPublicationTarget = "assistant" | "embedded-help" | "public-docs";

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
  documents: DocsDocumentV2[];
};
```

The sole bundle-normalizer owner is
`core/services/documentation/docsCorpusNormalizer.ts`, which exports:

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
canonicalizes visual/example record order; revalidates safe Markdown/plain-text
parity and closes every local section/evidence reference. It never derives
compiled fields from authoring Markdown.

`normalizeDocsDistributionBundleV2` recursively rejects unknown root keys,
composes the exact manifest and document normalizers, validates the exact SHA-256
`sourceHash`, locale membership, canonical ordering, localized identity
uniqueness and bundle-global reference closure, and returns a newly normalized
bundle. It never routes an already compiled document through the Markdown
authoring parser. Compiler, Help and portal consumers import this exact named
owner export; `assertDistributionBundle` and local assertion/normalizer aliases
do not exist.

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
fallback.

This leaf owns the exact target selector before any assistant, Help, renderer
or portal consumer lands:

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

The exact owner is
`core/services/documentation/docsCapabilityCatalog.ts`. It exports only the
following catalog surface:

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
in TASK-548-03 imports this function and these owner types and never defines a
parallel parser or token union.

## Security Contract

- **Endpoint/auth/RBAC/CSRF/rate limit:** no endpoint; pure local contract.
- **Reject unknown:** every manifest/frontmatter/sidecar object is strict,
  including nested arrays and optional values. Native heading directives use
  only the exact compiler-owned grammar above and are removed before rendering.
- **Path/URL policy:** source paths must remain below `docs/guide`; `adminPath`
  is `null` or a default-base canonical `/admin...` path without query/hash,
  alias, traversal or protocol. Markdown links allow local anchors/relative docs
  and HTTPS only. Images are allowed only through `DocsVisualV1`.
- **Permissions:** every non-wildcard permission must exist in
  `core/services/admin/permissionsCatalog.ts`; `*` is forbidden in docs.
  Normalize only the exact `DocsPermissionRequirementV1` shape and apply the
  locked `allOf`/`anyOf` semantics.
- **Capabilities:** every `capabilityIds` entry matches the locked format,
  exists in `docsCapabilityCatalog.ts`, and is bounded, unique and sorted.
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
    productVersionRange: parsed.productVersionRange,
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
  assertDocumentsUseSupportedLocales(documents, manifest.supportedLocales);
  assertCanonicalDocumentOrder(documents);
  assertStableDocumentIdentityPairs(documents);
  assertCompleteBundleReferenceClosure(documents);
  return {
    ...manifest,
    sourceHash: assertExactSha256(parsed.sourceHash),
    documents,
  };
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
before sidecar joins.
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
orientation exception consumed by L02. Cover every token variant plus
unclosed, nested, ragged, oversized and malicious inline variants.

## Sub-Tasks

- [ ] Add `docsCorpusTypes.ts`, `docsCorpusSchemas.ts`,
  `docsCorpusNormalizer.ts`, `docsMarkdownParser.ts`,
  `docsMarkdownTokens.ts`, `docsSectionDirectives.ts`,
  `docsCapabilityCatalog.ts` and
  `docsCorpusLimits.ts`, each below 1,000 lines and without DB/runtime imports.
- [ ] Add the v2 root manifest and update only the author template with stable
  IDs, locale/version/path/permission/capability/publication rules and one safe
  example; hand the README wording to TASK-548-07-L01.
- [ ] Add `tests/vitest/documentation/docs-corpus-contract.test.ts` and
  `docs-markdown-policy.test.ts`; keep fixtures in focused support files.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-corpus-contract.test.ts tests/vitest/documentation/docs-markdown-policy.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `wc -l` for every added/modified production and test file

## Documentation Updates Required

This leaf owns `docs/guide/_TEMPLATE.md` and
`docs/guide/corpus.manifest.json`, not `docs/guide/README.md`. Send the final
exact type, capability, permission and safety contract to TASK-548-07-L01 for
the sole closeout documentation edit.
