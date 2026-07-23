# TASK-548-06-L02: Coverage, Link, Route and Publication Reconciliation
# FileName: TASK-548-06-L02-Coverage-Link-Route-And-Publication-Reconciliation.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-06
**Priority:** High
**Category:** Documentation / Coverage / Quality Gates
**Estimated Effort:** Large
**Dependencies:** TASK-545 is `✅ Done` and TASK-547 is terminal; the TASK-548
parent names and serializes every literal final TASK-547-overlapping path before
any implementation; TASK-548-06-L01 plus final TASK-548-01-L02
handback and read-only packaged-bundle verification; TASK-548-03-L01 Bun-free
route-snapshot handoff
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Prove the native corpus covers the shipped product and generate the human-readable
coverage matrix from machine-validated facts. Reconcile the compiled bundle with
the canonical Admin route registry, permission catalog, stable links, examples,
reviewed visuals, and all three publication targets. A hand-edited row or broad
“covered” label cannot satisfy this gate.

## Exclusive Ownership

This leaf is the only writer for:

- new `core/services/documentation/coverage/docsCoverage.ts`;
- new `scripts/docs/generate-coverage-matrix.ts`;
- generated `docs/guide/_COVERAGE_MATRIX.md`;
- generated `core/generated/docs/coderso-docs-coverage-v2.json`;
- new `tests/vitest/documentation/docs-coverage-reconciliation.test.ts`;
- focused fixtures below `tests/fixtures/documentation/coverage/`.

It must not edit Guide prose/metadata/examples/visuals, the Admin route registry,
permission catalog, compiler/visual tooling, portal/release source, root
package/lock/workflows, tasks, or changelog. Findings return to the owning leaf;
tests never paper over source defects.

`docsCoverage.ts` remains Bun/runtime-free. In both `--write` and `--check`
mode, the CLI first calls the read-only
`assertNoDocsWorkspaceArtifactPromotionHazardsV1()`, then
`loadPackagedDocsDistributionBundleV2()`. It never calls workspace recovery or
the migration-only pair loader. The normal clean-checkout input is the tracked
bundle with no `.tmp` report; a valid linked authoring pair is also accepted by
the inspector. Both modes pass the strict packaged bundle into the pure
reconciler; `--write` mutates only this leaf's two coverage outputs and
`--check` mutates nothing. Production runtime never runs this generator and
never requires `.tmp`, the migration report, journal, or frozen migration
baseline.

## Bun-Free Route Snapshot Handoff

This leaf consumes only the exact TASK-548-03 pure owner modules:

```text
core/admin/app/adminRouteDescriptorContract.ts
core/admin/app/routes/core.admin-route-descriptor.ts
core/admin/app/routes/help.admin-route-descriptor.ts
```

It imports `AdminRouteDescriptorV1`, the generic plural
`normalizeAdminRouteDescriptorsV1`, and the named canonical constants
`CORE_ADMIN_ROUTE_DESCRIPTORS_V1` and `HELP_ADMIN_ROUTE_DESCRIPTORS_V1`.
It does not require or invent a TASK-548-03-owned coverage loader or parity
assertion. This leaf may define only this local composition helper inside its
owned `docsCoverage.ts`:

```ts
export function loadCanonicalAdminRouteCoverageSnapshot():
  readonly AdminRouteDescriptorV1[] {
  return normalizeAdminRouteDescriptorsV1([
    ...CORE_ADMIN_ROUTE_DESCRIPTORS_V1,
    ...HELP_ADMIN_ROUTE_DESCRIPTORS_V1,
  ]);
}
```

Each exact descriptor preserves discriminator, stable route/module IDs and
orders, canonical pattern, visibility, exact
`permissionRequirement: null | { mode: "allOf" | "anyOf"; permissions:
string[] }`, and sorted catalog-backed `capabilityIds`. TASK-548-03-L01/L02
registry-pair tests remain the authority proving the pure descriptors match the
eager Vite render bindings. This leaf adds an exact file/export inventory test
that fails on a missing or unexpected `*.admin-route-descriptor.ts` module or
descriptor constant. Importing `.tsx`, React, `import.meta.glob`, parsing source
text into a route list, or maintaining duplicate route metadata fails.

## Coverage Contract

The strict generated report records stable IDs and reasons, not prose copies:

- every active native English document, section, example, visual, promotion
  receipt, canonical BCP-47 locale, version range, exact `permissionRequirement`,
  `capabilityIds`, admin path, and publication target;
- every canonical active Admin route pattern/capability and its route-owned
  exact `permissionRequirement` and `capabilityIds`;
- the document/section covering each route or non-route capability;
- Help deep link, Guide evidence/card, contextual CMS destination eligibility,
  and derived public version/latest link eligibility, all carrying the owning
  `{ docId, locale, sectionId }` without persisting hand-built URLs;
- explicit code-owned exclusions for auth callbacks, transient redirects,
  internal technical routes, aliases, and retired compatibility-only surfaces.

`core/services/documentation/coverage/docsCoverage.ts` exports these exact
discriminated shapes and constants. `DocsPermissionRequirementV1` and
`DocsPublicationTarget` are imported from the TASK-548-01 owner; they are not
redeclared with alternate semantics.

```ts
export const DOCS_COVERAGE_SCHEMA_V2 = "coderso.docs-coverage@v2" as const;

export const DOCS_COVERAGE_LIMITS_V2 = {
  maxJsonBytes: 16_777_216,
  maxDocuments: 4_096,
  maxRoutes: 2_048,
  maxLinks: 65_536,
  maxAssets: 32_768,
  maxExclusions: 2_048,
  maxConsumerDocuments: 4_096,
  maxIdLength: 160,
  maxPathLength: 1_024,
  maxReasonLength: 1_000,
  maxArrayItemsPerRecord: 4_096,
} as const;

export type DocsCoverageDocumentIdentityV2 = {
  docId: string;
  locale: string;
};

export type DocsCoverageDocumentRecordV2 = {
  docId: string;
  locale: string;
  slug: string;
  productVersionRange: string;
  adminPath: string | null;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  capabilityIds: string[];
  publicationTargets: DocsPublicationTarget[];
  sectionIds: string[];
  exampleIds: string[];
  visualIds: string[];
};

export type DocsCoverageRouteRecordV2 = {
  routeId: string;
  moduleId: string;
  moduleOrder: number;
  routeOrder: number;
  pattern: string;
  visibility: "authenticated" | "public";
  permissionRequirement: DocsPermissionRequirementV1 | null;
  capabilityIds: string[];
  document: DocsCoverageDocumentIdentityV2 | null;
  sectionId: string | null;
  exclusionId: string | null;
};

export type DocsCoverageLinkRecordV2 = {
  sourceDocument: DocsCoverageDocumentIdentityV2;
  sourceSectionId: string;
  kind:
    | "guide-anchor"
    | "guide-relative"
    | "admin-route"
    | "public-version"
    | "public-latest"
    | "external-https";
  targetDocument: DocsCoverageDocumentIdentityV2 | null;
  targetSectionId: string | null;
  targetRouteId: string | null;
  externalHref: string | null;
  status: "resolved" | "not-applicable";
};

export type DocsCoverageAssetRecordV2 = {
  kind: "example" | "visual" | "promotion-receipt";
  assetId: string;
  document: DocsCoverageDocumentIdentityV2;
  sectionId: string;
  relativePath: string;
  sha256: string;
  sourceSha256: string | null;
};

export type DocsCoverageExclusionRecordV2 = {
  exclusionId: string;
  subjectKind: "route" | "capability";
  subjectId: string;
  owner: string;
  classification:
    | "non-user-facing"
    | "alias"
    | "transient"
    | "retired-compatibility";
  reason: string;
  testId: string;
};

export type DocsCoverageConsumerProjectionV2 = {
  target: DocsPublicationTarget;
  documents: DocsCoverageDocumentIdentityV2[];
};

export type DocsCoverageReportV2 = {
  schema: typeof DOCS_COVERAGE_SCHEMA_V2;
  corpusVersion: string;
  sourceHash: string;
  documents: DocsCoverageDocumentRecordV2[];
  routes: DocsCoverageRouteRecordV2[];
  links: DocsCoverageLinkRecordV2[];
  assets: DocsCoverageAssetRecordV2[];
  exclusions: DocsCoverageExclusionRecordV2[];
  consumerProjections: DocsCoverageConsumerProjectionV2[];
};

export function normalizeDocsCoverageReportV2(
  value: unknown
): DocsCoverageReportV2;

export function serializeDocsCoverageReportV2(
  value: DocsCoverageReportV2
): Uint8Array;

export function parseDocsCoverageReportV2(
  bytes: Uint8Array
): DocsCoverageReportV2;
```

`serializeDocsCoverageReportV2(value)` is the sole report-to-bytes boundary.
It does not trust the compile-time type: it first calls
`normalizeDocsCoverageReportV2(value)`, recursively rejecting every unknown,
missing, invalid, or non-normalizable runtime field. It then projects the
normalized report in the exact root and nested key order declared above,
preserves the canonical array order below, emits deterministic two-space JSON
with LF line endings and no trailing whitespace, and returns UTF-8 bytes with
exactly one final LF and no BOM. A valid unordered input is normalized into
canonical order; it is never serialized in caller order.

`parseDocsCoverageReportV2(bytes)` is the sole bytes-to-report boundary. It
rejects a non-`Uint8Array`, zero bytes, or `bytes.byteLength >
DOCS_COVERAGE_LIMITS_V2.maxJsonBytes` before UTF-8 decoding or `JSON.parse`,
rejects invalid UTF-8/JSON, and then calls
`normalizeDocsCoverageReportV2(value)`. The normalizer owns the recursively
strict object contract: it rejects unknown/missing keys and non-finite/unsafe
integers, applies all record/string/count limits above, validates canonical
ID/path/hash/BCP-47/SemVer-range/HTTPS forms, and delegates permission/target
normalization to their owner contracts. Relative paths are
repository-confined with no backslash, traversal, query, fragment, absolute
prefix, or symlink escape. Route mapping requires exactly one of
`document` plus `sectionId`, or `exclusionId`; link nullable fields obey their
exact `kind`; asset IDs/paths/hashes close to the bundle/scenario/receipt graph;
exclusions point to one real route/capability and one concrete test.

The exact document identity everywhere is `(docId, locale)`. The same `docId`
may intentionally group translations, but the pair is unique. No route, link,
asset, consumer projection, sort, or deduplication may collapse records by bare
`docId`. Every example/visual/promotion-receipt record and every Guide
evidence/Help/CMS/public action reference retains the full owning
`{ docId, locale, sectionId }`. `exampleId` and `visualId` are bundle-global;
global uniqueness never permits discarding or inferring their owning locale.

Canonical ordering is exact: documents by `(locale, docId)` while identity
remains `(docId, locale)`; each nested
ID array unique/sorted and targets in owner target order; routes by
`(moduleOrder, routeOrder, routeId)`; links by
`(sourceDocument.docId, sourceDocument.locale, sourceSectionId, kind,
targetDocument?.docId ?? "", targetDocument?.locale ?? "",
targetSectionId ?? "", targetRouteId ?? "", externalHref ?? "")`; assets by
`(kind, assetId)`; exclusions by `(subjectKind, subjectId, exclusionId)`; and
consumer projections in `assistant`, `embedded-help`, `public-docs` order with
unique documents sorted by `(locale, docId)`. Serialize only the normalized
object. For canonical bytes,
`serializeDocsCoverageReportV2(parseDocsCoverageReportV2(bytes))` is
byte-identical; for any valid runtime value,
`serialize(parse(serialize(value)))` is byte-identical to the first
serialization.

An exclusion has stable ID, source owner, bounded reason, test, and classification
(`non-user-facing`, `alias`, `transient`, or `retired-compatibility`). There is no
generic wildcard or undocumented ignore. Parameterized route patterns compare in
canonical registry form; example IDs never stand in for real route coverage.

For each document:

- local anchors and relative Guide references resolve to one stable target;
- HTTPS external links are allowlisted/checkable without becoming a runtime
  dependency; unsafe schemes, redirectors, fragments, and locale/version drift
  fail;
- `adminPath` is canonical/default-base, resolves through `adminPaths`, and its
  `permissionRequirement` preserves null/allOf/anyOf semantics and cannot
  understate the destination's descriptor contract. Formally, no catalog-valid
  permission snapshot may satisfy the document requirement while failing the
  route requirement;
- document `capabilityIds` and route `capabilityIds` resolve in the same
  code-owned catalog; every active catalog capability is covered or carries one
  exact tested exclusion, and no alternate label is derived;
- `embedded-help`, `assistant`, and `public-docs` targets reconcile with content
  safety and generated consumers; public URLs exist only when `public-docs` is
  present. Each consumer projection contains exactly records carrying its target;
  cross-target inclusion and omission both fail;
- visual/example IDs, image hashes, receipts, captions/alt text, and owning
  `{ docId, locale, sectionId }` close exactly once; a same-`docId` translation
  cannot satisfy, render, or action another locale's reference.

`docs/guide/_COVERAGE_MATRIX.md` is deterministically rendered from this report
with generated-file warning, corpus/source hash, route/capability, owning
document/section, targets, permission summary, visual/example status, and
exclusion reason. Manual changes make `--check` fail.

## Locale and TASK-547 Contract

Coverage labels English as complete only after all active English sources/routes
close. Schema support for BCP-47/`pl` is “ready”, not a translation claim:
missing Polish documents create no fake routes, hreflang, search indexes, or
coverage percentage.

TASK-545 must be `✅ Done` and TASK-547 must be terminal before implementation.
After TASK-547 is terminal, the TASK-548 parent must name every literal final
overlapping user/developer/shared-doc path and serialize ownership. Re-read
TASK-547's final shipped state and those paths after that handoff. Its actual
Admin paths and Guide owner must reconcile; planned paths/capabilities are never
represented as active. Detect concurrent byte changes to a serialized path and
fail with an ownership diagnostic instead of merging both versions.

## Security Contract

- **Endpoint/auth/RBAC/CSRF/rate limit:** no endpoint; pure build/check tooling.
- **Reject unknown:** report, exclusions, route snapshots, refs, generated matrix
  input, and CLI options are strict and bounded.
- **Authorization:** permission comparison is fail closed; unknown/missing/
  wildcard permissions and a document that understates its destination reject.
- **Link/path safety:** confined source/assets, canonical Admin paths, local
  anchors/relative refs, and HTTPS external URLs only; no credentials/query
  secrets, traversal, unsafe schemes, or arbitrary redirects.
- **Anti-abuse:** no public write, nonce/HMAC/CAPTCHA. Bound routes, documents,
  links, diagnostics, external-check concurrency/retries/timeouts, and output.
- **Privacy:** generated artifacts contain stable IDs/paths and public-safe
  summaries only, never content bodies, tokens, real user data, or internal
  build-host paths.

## Implementation Pseudocode

```ts
export function reconcileDocsCoverage(
  input: DocsCoverageInput
): DocsCoverageReportV2 {
  const corpus = normalizeDocsDistributionBundleV2(input.bundle);
  const routes = loadCanonicalAdminRouteCoverageSnapshot();
  assertExactCanonicalDescriptorModuleInventory();
  const graph = joinDocsRoutesPermissionsTargetsAndAssets(corpus, routes, input);
  assertEveryActiveRouteOrCapabilityCoveredOrExplicitlyExcluded(graph);
  assertAllLinksRefsReceiptsAndPublicationsClose(graph);
  return normalizeDocsCoverageReportV2(graph);
}

export async function generateCoverageMatrix(options: GenerateOptions) {
  const mode = requireExactlyOneCoverageMode(options, ["write", "check"]);
  await assertNoDocsWorkspaceArtifactPromotionHazardsV1();
  const bundle = await loadPackagedDocsDistributionBundleV2();
  const report = reconcileDocsCoverage(
    await loadCoverageInputs(options, bundle)
  );
  const json = serializeDocsCoverageReportV2(report);
  assertBytesEqual(
    serializeDocsCoverageReportV2(parseDocsCoverageReportV2(json)),
    json
  );
  const markdown = renderDeterministicCoverageMatrix(report);
  if (mode === "check") {
    const existing = await readExistingCoverageOutputs();
    parseDocsCoverageReportV2(existing.jsonBytes);
    return assertExistingCoverageBytesEqual(existing, { json, markdown });
  }
  return atomicWriteCoverageOutputs({ json, markdown });
}
```

**Data flow:** final read-only `docs:check` canonical-byte/`sourceHash` equality
gate → exact coverage write or check command → read-only workspace hazard
inspection → strict packaged-bundle load with the ignored report optional/absent
→ native bundle + exact pure route descriptors/capability catalog +
scenario/receipt graph → strict joins/exclusions → route/permissionRequirement/
capability/link/ref/target assertions keyed by
`{ docId, locale, sectionId }` where section-scoped, otherwise by exact
`(docId, locale)` document identity → canonical
normalized report → stable-key-order UTF-8 JSON with LF and exactly one final
newline → parse/serialize byte-identity assertion → generated Markdown
matrix/byte comparison.

**Error handling:** emit bounded `docs_coverage_route_missing`,
`docs_coverage_exclusion_invalid`, `docs_coverage_permission_mismatch`,
`docs_coverage_link_invalid`, `docs_coverage_ref_orphan`,
`docs_coverage_publication_mismatch`, `docs_coverage_locale_false_claim`,
`docs_coverage_route_handoff_missing`, `docs_coverage_route_parity_failed`,
`docs_coverage_task547_collision`, and `docs_coverage_generated_stale`. No partial
report replaces the last valid output. A live/tampered transaction, report-only
state, invalid linked pair, missing/tampered packaged bundle, preceding
`docs:check` canonical-byte/source mismatch, recursive unknown field, cap
breach, non-normalizable runtime shape, noncanonical serialized bytes, or nested
record/hash/path tampering fails before either generated output is written.

## Sub-Tasks

- [ ] Implement strict route/link/permission/target reconciliation and exclusions.
- [ ] Generate deterministic JSON coverage and Markdown matrix outputs.
- [ ] Add stale-output, collision, locale, orphan, and security regression tests.
- [ ] Verify TASK-547 serialization against shipped—not planned—state.

## Testing Requirements

- one fixture for complete mapping plus mutations for uncovered/duplicate route,
  stale alias, bad parameter pattern, invalid exclusion, null/allOf/anyOf
  permission understatement, capability drift, broken anchor/link, orphan
  example/visual/receipt, hash mismatch, and target leak;
- strict `DocsCoverageReportV2` tests prove
  `serialize(parse(serialize(value)))` byte identity and canonical-byte
  `serialize(parse(bytes))` identity; serializer output uses exact declared key
  order, deterministic two-space JSON, UTF-8 without BOM, LF-only line endings,
  no trailing whitespace, and exactly one final LF. Root and every nested record
  reject unknown/missing/non-normalizable runtime fields before bytes are
  emitted; each exact count/string/path/reason/aggregate-byte limit has boundary
  and overflow coverage; shuffled valid input canonicalizes to the specified
  order; permission, target, route branch, exclusion owner/test, asset
  path/hash, and link kind/nullability tampering fail;
- `parseDocsCoverageReportV2(bytes)` rejects zero/oversized/invalid UTF-8 bytes
  before `JSON.parse`, delegates valid decoded JSON only to the strict
  normalizer, and has exact byte-cap boundary/overflow spies;
- tuple-identity fixtures prove two translations may share one `docId`, remain
  distinct by `(docId, locale)`, and cannot be collapsed or ambiguously linked,
  routed, assigned an asset, or projected by a bare ID; their sections may reuse
  a `sectionId`, but Guide evidence, Help/CMS/public actions, examples, visuals,
  and receipts must remain bound to the owning
  `{ docId, locale, sectionId }`;
- generator-order spies prove both modes run
  `assertNoDocsWorkspaceArtifactPromotionHazardsV1()` before
  `loadPackagedDocsDistributionBundleV2()` and neither invokes a workspace
  recovery or migration-pair loader; `--check` invokes no
  write/rename/delete/fsync path, while `--write` may replace only the two owned
  coverage outputs after reconciliation succeeds;
- a clean-clone fixture with the tracked bundle and no `.tmp` tree/report passes
  both coverage modes. Live/tampered transaction material, report-only state,
  invalid linked pair, tampered packaged bytes, or a preceding stale
  `docs:check` result performs no coverage write; packaged runtime imports
  neither recovery nor `.tmp`;
- import the two exact descriptor modules/constants and prove the complete
  `*.admin-route-descriptor.ts` inventory plus TASK-548-03 registry-pair parity
  suites; a missing/extra module or constant fails;
- prove only real translations count and no fake Polish public/search/hreflang
  record is emitted;
- independently project `assistant`, `embedded-help`, and `public-docs`
  consumers; prove eligible records appear exactly once and any missing,
  cross-target, local-to-public, or public-to-assistant leak fails;
- prove planned TASK-547 state is absent, shipped state joins, and concurrent
  serialized-path drift fails;
- generate twice under different roots/order/timezone and compare JSON/Markdown;
- consume the seventh exact root script owned by TASK-548-02-L03 and run
  read-only `bun run docs:check`, then
  `bun run docs:coverage -- --write`, immediately followed by
  `bun run docs:coverage -- --check`; this leaf never edits root
  `package.json`. The CLI rejects missing, simultaneous,
  duplicate, or unknown modes/options, and manual matrix/report edits make the
  check fail without mutation; filesystem-mutator spies prove clean, stale and
  hazard-rejected `--check` cases stay read-only and direct operators to
  `bun run docs:recover`;
- run
  `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-coverage-reconciliation.test.ts`;
- run `bun run docs:visual:check -- --all`, `bun --cwd core lint:types`,
  `bun --cwd core lint`;
- audit every added/modified human-authored production and test file from the
  pre-task baseline with `wc -l`; any result above 1,000 fails; then run
  `git diff --check`.

## Documentation Updates Required

Pass the exact descriptor-module/constants inventory, local loader, inherited
registry-pair parity evidence, report hash, complete/excluded inventories,
locale statement, and TASK-547 serialization result to TASK-548-07. This leaf
owns no changelog or task status update.
