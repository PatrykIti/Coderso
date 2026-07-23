# TASK-548-01-L01: Strict Manifest Schemas and Stable Identity
# FileName: TASK-548-01-L01-Strict-Manifest-Schemas-And-Stable-Identity.md

**Parent Subtask:** TASK-548-01
**Priority:** Critical
**Category:** Documentation Platform / Schema / Security
**Estimated Effort:** Large
**Dependencies:** None
**Status:** ⏳ To Do

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

The discriminator and field names above are exact. Root and nested schemas use
`additionalProperties: false`. IDs use one documented lowercase kebab-case
pattern. `docId` is corpus-global; `sectionId` is unique within a document;
`visualId` and `exampleId` are corpus-global. Canonical sort order is locale,
docId, section order, then visual/example ID.

`publicationTargets` is non-empty, unique and sorted in exact
`assistant`, `embedded-help`, `public-docs` order. It is an enforceable
distribution boundary: downstream assistant, Help and portal consumers must
select only their matching target and must never treat target absence as a
fallback.

`DocsPermissionRequirementV1.permissions` is non-empty, unique and sorted by
canonical permission ID. `allOf` authorizes only when the current fail-closed
snapshot contains every listed permission; `anyOf` authorizes when it contains
at least one. A null requirement means no document-level restriction beyond
the authenticated Admin shell and is valid even when `adminPath` is non-null,
matching live routes with neither `permission` nor `anyPermissions`, including
`/preview`. Unknown modes, empty arrays, wildcard, unknown catalog entries,
malformed snapshots and partial `allOf` matches fail closed.

`capabilityIds` contains at most 32 unique sorted IDs. Each ID matches
`^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$` and exists in the new code-owned
`docsCapabilityCatalog.ts`; an empty array is valid only for general
orientation content. Compiler, assistant ingest/retrieval, local search and
TASK-548-06 coverage use this exact field and may not derive alternate
capability labels.

In the final corpus each Markdown frontmatter record contains
`schema: "coderso.docs-document@v2"` and the document fields except
`sourcePath`, `sections`, `visuals` and `examples`, which the compiler derives.
Until TASK-548-06 finishes the mechanical source migration, TASK-548-01-L02 may
adapt the existing legacy frontmatter into this exact output shape; the adapter
is compatibility input, not a second v2 contract.
Visual/example placement is declared by their strict sidecar `sectionId`;
authors do not write arbitrary asset paths or derived Help/public URLs.

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
graph and returns `{ sectionId, headingOccurrence, level, heading,
bodyMarkdown }[]`. `serializeNativeDocsSectionDirectiveV1({ sectionId,
headingOccurrence })` emits the exact single directive line. The compiler strips
the directive before the closed safe-Markdown parser and before `bodyMarkdown`
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
```

Callout source syntax is a fenced `:::note|info|warning [optional title]`
block closed by `:::`. Callouts and tables cannot nest either construct.
Tables use one pipe-header row, one delimiter row and bounded body rows; each
row must have the same bounded cell count. Cells accept only the closed inline
token subset. Inline recursion depth, block/list/callout nesting, list item
count, table rows/columns/cells, token count and aggregate text bytes have named
constants in `docsCorpusLimits.ts`; no recursive branch can bypass them.
Unclosed directives, unknown tones/languages, ragged/oversized tables,
block/raw HTML, unsafe links and recursive constructs fail closed. The shared
renderer imports these owner types and never defines a parallel token union.

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
  const sections = sectionSources.map((section) => ({
    ...section,
    ...parseSafeMarkdownSection(section.bodyMarkdown),
  }));
  assertStableIds(meta, sections);
  return {
    ...meta,
    permissionRequirement,
    capabilityIds,
    sourcePath: input.sourcePath,
    sections,
  };
}
```

**Data flow:** unknown JSON/Markdown → byte/depth caps → strict frontmatter →
BCP-47/SemVer/path/permission/capability validation → closed Markdown AST →
normalized plain text and stable sections. Raw HTML, Markdown images, unknown
syntax, unsafe schemes or unresolved IDs return no partial document.

**Error handling:** emit bounded `docs_corpus_invalid`,
`docs_corpus_unknown_field`, `docs_corpus_duplicate_id`,
`docs_corpus_locale_invalid`, `docs_corpus_version_invalid`,
`docs_corpus_path_invalid`, `docs_corpus_permission_invalid` and
`docs_corpus_markdown_unsafe` diagnostics with source path and field only.

**Regression-test shape:** table-test every unknown field and unsafe construct;
accept canonical locale/SemVer/path/permission records; reject duplicate IDs,
aliases, traversal, raw HTML, `javascript:`/`data:`/`file:` links, Markdown or
remote images, oversized/deep input and secret-like examples. Prove normalization
idempotence, exact publication-target ordering and multi-target round trips.
Round-trip every valid native directive through the exact serializer/parser;
reject missing/orphan/duplicate/unknown markers, non-contiguous ordinals, raw
HTML substitutes, Setext headings and independently reordered markers. Reorder
whole marker+heading pairs only after assigning new contiguous ordinals and
prove stable section IDs remain attached to their headings.
Test null plus authenticated empty-snapshot success, an invalid empty non-null
permission list, empty/partial protected snapshots, full `allOf`, every
`anyOf` branch, unknown
modes/permissions, capability format/catalog/order failures, and capability
round trips. Cover every token variant plus unclosed, nested, ragged, oversized
and malicious inline variants.

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
