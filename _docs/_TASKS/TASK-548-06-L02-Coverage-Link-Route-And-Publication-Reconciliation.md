# TASK-548-06-L02: Coverage, Link, Route and Publication Reconciliation
# FileName: TASK-548-06-L02-Coverage-Link-Route-And-Publication-Reconciliation.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-06
**Priority:** High
**Category:** Documentation / Coverage / Quality Gates
**Estimated Effort:** Large
**Dependencies:** TASK-548-06-L01; TASK-548-03-L01 Bun-free route-snapshot handoff
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
  receipt, locale, version range, exact `permissionRequirement`,
  `capabilityIds`, admin path, and publication target;
- every canonical active Admin route pattern/capability and its route-owned
  exact `permissionRequirement` and `capabilityIds`;
- the document/section covering each route or non-route capability;
- Help deep link, contextual CMS destination eligibility, and derived public
  version/latest link eligibility without persisting hand-built URLs;
- explicit code-owned exclusions for auth callbacks, transient redirects,
  internal technical routes, aliases, and retired compatibility-only surfaces.

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
  section close exactly once.

`docs/guide/_COVERAGE_MATRIX.md` is deterministically rendered from this report
with generated-file warning, corpus/source hash, route/capability, owning
document/section, targets, permission summary, visual/example status, and
exclusion reason. Manual changes make `--check` fail.

## Locale and TASK-547 Contract

Coverage labels English as complete only after all active English sources/routes
close. Schema support for BCP-47/`pl` is “ready”, not a translation claim:
missing Polish documents create no fake routes, hreflang, search indexes, or
coverage percentage.

Re-read TASK-547's final shipped state after its declared guide-path handoff.
If TASK-547 has not shipped, planned paths/capabilities are absent rather than
excluded as active. If it has shipped, its actual Admin paths and Guide owner
must reconcile. Detect concurrent byte changes to the serialized Guide path and
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
  return normalizeAndSortDocsCoverageReport(graph);
}

export async function generateCoverageMatrix(options: GenerateOptions) {
  const report = reconcileDocsCoverage(await loadCoverageInputs(options));
  const markdown = renderDeterministicCoverageMatrix(report);
  return options.check
    ? assertExistingBytesEqual(markdown)
    : atomicWriteCoverageOutputs(report, markdown);
}
```

**Data flow:** native bundle + exact pure route descriptors/capability catalog +
scenario/receipt graph → strict joins/exclusions → route/permissionRequirement/
capability/link/ref/target assertions → canonical JSON report → generated
Markdown matrix or read-only byte check.

**Error handling:** emit bounded `docs_coverage_route_missing`,
`docs_coverage_exclusion_invalid`, `docs_coverage_permission_mismatch`,
`docs_coverage_link_invalid`, `docs_coverage_ref_orphan`,
`docs_coverage_publication_mismatch`, `docs_coverage_locale_false_claim`,
`docs_coverage_route_handoff_missing`, `docs_coverage_route_parity_failed`,
`docs_coverage_task547_collision`, and `docs_coverage_generated_stale`. No partial
report replaces the last valid output.

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
- manual matrix/report edit makes `--check` fail without mutation;
- run
  `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-coverage-reconciliation.test.ts`;
- run `bun scripts/docs/generate-coverage-matrix.ts --check`,
  `bun run docs:check`, `bun run docs:visual:check -- --all`,
  `bun --cwd core lint:types`, `bun --cwd core lint`, touched-file line counts,
  and `git diff --check`.

## Documentation Updates Required

Pass the exact descriptor-module/constants inventory, local loader, inherited
registry-pair parity evidence, report hash, complete/excluded inventories,
locale statement, and TASK-547 serialization result to TASK-548-07. This leaf
owns no changelog or task status update.
