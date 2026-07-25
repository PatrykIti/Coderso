# TASK-547-01: Full-Site Package Contract and Reference Graph
# FileName: TASK-547-01-Full-Site-Package-Contract-And-Reference-Graph.md

**Parent Task:** TASK-547
**Priority:** Critical
**Category:** Solution Kits / Schema / Security
**Estimated Effort:** Large
**Dependencies:** None
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — final validation was invalidated by fresh drift findings;
implementation remains present, but this contract must pass the current audit and
gate cycle before closure.

---

## Overview

Own the strict Bun-free package schema, canonical normalizer, typed symbolic
references, resource registry, dependency graph and deterministic install order.
The contract wraps native domain payloads without duplicating their schemas.

**Single-writer production ownership:** new cohesive modules under
`core/services/kits/fullSitePackage/`; only this child changes the public package
types/schema/ref graph. Split files before any reaches 1,000 lines.

## Contract

Root shape:

```ts
type FullSitePackageV1 = {
  schemaVersion: 1;
  key: string;
  metadata: { name: string; locale: string; description?: string };
  resources: {
    contentTypes: ContentTypeSeed[];
    forms: FormSeed[];
    pageTemplates: PageTemplateSeed[];
    listingTemplates: ListingTemplateSeed[];
    entries: EntrySeed[];
    listingQueries: ListingQuerySeed[];
    detailPages: DetailPageSeed[];
    pages: PageSeed[];
    menus: MenuSeed[];
    settings: SettingSeed[];
  };
  compatibility?: { unresolvedVisuals: VisualResidual[] };
  verification?: VerificationPlan;
};
type PackageRef = { ref: PackageResourceKind; key: string };
type ResourceSeed<TDesired> = { key: string; desired: TDesired };
type VerificationPlan = { scenarioIds: string[] };
type VisualResidual = {
  id: string;
  prototypeEvidence: string;
  cmsConstraint: string;
  installedApproximation: string;
  userVisibleDifference: string;
  impact: {
    functional: false;
    accessibility: false;
    data: false;
    security: false;
    testIntegrity: false;
  };
  postInstallRemediation: string;
};
```

All ten resource collections use the same strict seed envelope
`{ key, desired }`; the JSON package never carries a database ID beside `key` or
inside package-owned seed metadata. `desired` is the complete native-domain
write snapshot, including lifecycle state only where the owning native schema
supports it, ordered children where supported, and other domain-owned state.
Snapshot/equality compare the canonical normalized
`desired` value, not selected fields. Unknown seed-envelope keys are rejected.

Non-setting seed keys, package keys, `PackageRef.key` and verification scenario
IDs use the exact canonical grammar
`^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$` (1..128 characters).
Setting seed keys deliberately do **not** use that grammar: they must equal one
of `site.name`, `site.locale`, `site.homepageId`,
`site.navigationMenuId`, `site.footerTemplateId`, `site.contentRoutes` or
`design.tokens`. `VerificationPlan` is strict (`scenarioIds` only), accepts at
most 100 canonical IDs, preserves declaration order and collapses later
duplicates by first occurrence.

`PackageRef` is frozen exactly as `{ ref, key }`, with no third key and the
canonical key grammar above. Reference substitution is allowed only by L02's
closed registry:

- entry `contentTypeId`, listing-query
  `query.sourceConfig.contentTypeId`, detail `contentTypeId`, and
  detail `related[*].listingQueryId` when that property is present;
- optional Page/Page Template `document.settings.collectionLink`: its
  `contentTypeId` is a required content-type ref when the object is present,
  while `listingQueryId`/`listingTemplateId` are nullable refs when present;
- recursively walk Page/Page Template root and native-slot child blocks in
  deterministic native slot order. After checking each `block.type`, inspect
  base `props`, then `responsive.tablet.props`, then `responsive.mobile.props`:
  `collection` permits nullable `contentTypeId/queryId/templateId`, `filters`
  permits nullable `queryId`, and `form` permits nullable `formId`, only when
  each property is present. Import native Page capability/breakpoint owners and
  reject rather than clip depth 5, a `slots` member at depth 4, child 25,
  unknown/non-native slots and slots on atom blocks for both source kinds.
  For overlapping failures, first match wins in this order: max-depth `slots`,
  non-slot-capable block, unknown slot key, then per-slot child cap;
- menu `items[*].pageId` → Page when present and non-null; menu
  `desired.document.items` is not a native menu-item collection and is not a
  reference path;
- homepage, navigation-menu and footer-template setting values → Page, Menu and
  Page Template; content-route `detailPageId` → Detail Page, with the route's
  literal content-type slug cross-checked against a unique package content type.

No other path accepts `PackageRef`. Any other object shaped like a reference,
including raw `$ref`-like objects in arbitrary content, is rejected rather than
recursively rewritten. A nullable path contributes no edge when absent or
`null`; a non-null value must be an exact `PackageRef`. Diagnostics contain only
sanitized bounded paths and L02's closed
`ReferenceGraphDiagnosticReason` codes; raw keys, slugs, values, payloads, target
identities and cycle members are never echoed.

TASK-547-01-L02 owns this exact identity export:

```ts
export type PackageResourceIdentity = `${PackageResourceKind}:${string}`;
```

Each accepted ref becomes exactly
`Readonly<{path:readonly (string|number)[];targetIdentity:PackageResourceIdentity}>`.
`PlannedPackageResource` is exactly the frozen
`{identity,kind,collection,key,ordinal,seed:{key,desired},dependencies,references}`
record frozen by L02: `desired` is recursive readonly JSON, `dependencies` is
unique direct target identities in lexical order, and `references` preserves
occurrence discovery order. Every accepted ref occurrence counts as an edge;
duplicates collapse only in `dependencies`. A content-route literal `type` adds
a counted validation-only edge/direct dependency to its unique content type but
no descriptor and is never rewritten. The outer plan is topologically ordered
with dependencies first and stable ties by package ordinal then identity; every
nested snapshot/array is deep-cloned and frozen. L02 exports
`resolvePlannedPackageResourceRefs(resource, resolvedIds)`: it clones desired,
replaces only those recorded paths, verifies each source ref still matches its
descriptor and never rescans/rebuilds the graph. The planner and pre-run
preparer consume this same frozen plan/helper; neither owns a second ref walker.

Exact package-owned resource kinds are:
`content_type | form | page_template | listing_template | content_entry |
listing_query | detail_page | page | menu | setting`. Form fields/actions are
nested in the owning `form` snapshot, while `site.contentRoutes` is one
allowlisted `setting` value. Exact root mapping:
`contentTypes→content_type`, `forms→form`, `pageTemplates→page_template`,
`listingTemplates→listing_template`, `entries→content_entry`,
`listingQueries→listing_query`, `detailPages→detail_page`, `pages→page`,
`menus→menu`, `settings→setting`.

`VisualResidual` is also strict (`additionalProperties:false`), length-bounded and
canonical. A residual is admissible only when every non-visual impact flag is
literally `false`; otherwise it is an implementation gap and blocks closure.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit:** n/a; pure contract only.
- **Validation:** `additionalProperties:false` at every package-owned object;
  TASK-547-01 validates the package envelope/JSON and graph, not native-domain
  write validity.
- **Anti-abuse/complexity:** the in-memory value's `JSON.stringify` UTF-8 form
  is capped at 8 MiB and returns `site_package_too_large`; this is distinct from
  TASK-547-05's raw-file cap and `site_package_file_invalid`. Other exact limits
  are 512 resources total, 256 per collection, 4,096 reference edges, graph/JSON
  depth 64, 100 diagnostics, 100 verification scenarios, 128-character keys/
  residual IDs, metadata lengths 200/35/2,000, residual text length 2,000 and
  arbitrary JSON string length 100,000. Native owners retain stricter limits.
  Count/serialized-size overflow is `site_package_too_large`; edge/depth/
  diagnostic/scenario overflow is `site_package_too_complex`.
  The existing exported name `PACKAGE_LIMITS.fileBytes` remains the permanent
  8 MiB cap for the in-memory value's serialized JSON bytes. Despite its historic
  name it is never a raw-source-file limit; TASK-547-05 owns a separate,
  distinctly named raw-source constant.
- **Secrets:** reject forbidden setting namespaces, provider keys, cookies,
  authorization values, raw bytes/base64 and credential-bearing URLs.
- **CSS/HTML:** package metadata never becomes a raw CSS/HTML/JS sink.

## Implementation Pseudocode

```ts
export function normalizeFullSitePackageForWrite(input: unknown): FullSitePackageV1 {
  assertPackageByteSize(input); // serialized in-memory JSON, not source-file bytes
  const root = assertStrictPackageRoot(input);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  const resources = normalizeResourceArrays(root.resources);
  assertExactAllowedSettingKeys(resources.settings);
  return canonicalizePackage({ ...root, resources });
}

export function buildReferencePlan(pkg: FullSitePackageV1): readonly PlannedPackageResource[] {
  const registry = indexUniqueKindKeys(pkg.resources); // duplicate kind:key => error
  const { edges, descriptorsByIdentity } = collectRefsAtAllowedPaths(registry);
  return freezePlan(stableTopologicalSort(registry, edges), descriptorsByIdentity);
}

export function resolvePlannedPackageResourceRefs(
  resource: PlannedPackageResource,
  resolvedIds: ReadonlyMap<PackageResourceIdentity, string>,
): JsonObject;
```

`normalizeFullSitePackageForWrite` is the sole `unknown` boundary and owns
package shape, limits, canonicalization and the setting allowlist; it does not
certify reference placement or resolution. A raw consumer executes:

```ts
const pkg = normalizeFullSitePackageForWrite(rawPackage);
buildReferencePlan(pkg);
// Only now may the consumer acquire its existing lazy DB-backed dependency.
```

Each call occurs exactly once. Typed service/planner boundaries accept only an
already-normalized `FullSitePackageV1`: service apply and two-argument planning
each build exactly one private plan with zero normalizer calls; three-argument
planning and saga preparation consume the same supplied frozen plan with zero
builds. The CLI and service intentionally build independently at their separate
trust boundaries; no caller-supplied plan crosses into service input/deps. Do not
add a wrapper helper or alternate validation path. Bad reference paths,
duplicate keys, dangling/ambiguous references and cycles fail before the
applicable lazy database import/access.

**Data flow:** unknown in-memory value → serialized-size/package-owned structural
normalization → index stable keys → discriminator-aware scan of only allowlisted
reference paths → reject bad-path/dangling/ambiguous/cyclic graph → stable
topological sort → consumer boundary. Post-substitution native-domain validation
is owned and tested by TASK-547-02, not certified by this task.

**Error handling:** machine-readable `site_package_invalid`,
`site_package_too_large`, `site_package_too_complex`,
`site_package_setting_forbidden`, `site_package_ref_duplicate`,
`site_package_ref_missing`, `site_package_ref_ambiguous`,
`site_package_ref_cycle` and `site_package_ref_bad_path`, with only the bounded
path/static-reason diagnostics above.

**Regression-test shape:** accept canonical full graph and all ten strict
`{key,desired}` seed kinds; reject DB IDs in package JSON, every unknown key,
duplicate key, bad ref kind/path, dangling ref, cycle, secret-like setting, raw
bytes and each exact over-limit boundary; prove exact setting allowlist behavior
without applying the package-key regex to setting keys, strict verification
shape/count/ID grammar plus first-occurrence dedupe, at most 100 bounded
diagnostics, normalize(normalize(x)) identity, complete desired-snapshot equality
and deterministic order. Graph tests cover every discriminator/nullability row,
reject the non-native menu `document.items` path, reject malformed ref keys
without echoing them, pin L02's exact closed reasons, plan/reference shapes,
occurrence-edge versus direct-dependency ordering, and content-route validation-
only edge. For both Page-backed kinds they accept depth 4/24 children and reject
depth 5/25, non-native slots and atom slots without clipping. Prove frozen
descriptor-only substitution with no second traversal or plan mutation. This
task proves only its local raw normalize→graph call order; planner, typed-apply/
preparer and CLI call counts belong to TASK-547-02-L01, 02-L02 and 05-L01. A
structural-schema
test may accept a ref-shaped value solely to exercise shape/edge limits, while
the full consumer contract must prove that the same bad path is rejected by
`buildReferencePlan` before lazy DB acquisition.

## Sub-Tasks

- [ ] **TASK-547-01-L01** — package schema, normalizer, bounded complexity and
  malicious-input tests.
- [ ] **TASK-547-01-L02** — closed reference registry, graph planner and contract
  tests.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package*.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide exact documentation deltas to TASK-547-06. TASK-547-06 is the sole writer
of shared source-of-truth and example docs.
