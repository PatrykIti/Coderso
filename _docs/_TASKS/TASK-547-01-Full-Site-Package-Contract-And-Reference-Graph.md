# TASK-547-01: Full-Site Package Contract and Reference Graph
# FileName: TASK-547-01-Full-Site-Package-Contract-And-Reference-Graph.md

**Parent Task:** TASK-547
**Priority:** Critical
**Category:** Solution Kits / Schema / Security
**Estimated Effort:** Large
**Dependencies:** None
**Status:** ⏳ To Do

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

Each resource carries a stable `key`. Reference substitution is allowed only on
an explicit field-path registry. Raw `$ref`-like objects in arbitrary content
are rejected rather than recursively rewritten.

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
  embedded Page/Menu/Form/Content/Listing/Detail payloads delegate to their owner.
- **Anti-abuse/complexity:** loader byte cap, root/resource count caps, bounded
  reference edges/depth/string lengths and bounded diagnostic count. Exceeding a
  limit returns `site_package_too_large` or `site_package_too_complex`.
- **Secrets:** reject forbidden setting namespaces, provider keys, cookies,
  authorization values, raw bytes/base64 and credential-bearing URLs.
- **CSS/HTML:** package metadata never becomes a raw CSS/HTML/JS sink.

## Implementation Pseudocode

```ts
export function normalizeFullSitePackageForWrite(input: unknown): FullSitePackageV1 {
  const root = assertStrictPackageRoot(input);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  const resources = normalizeResourceArrays(root.resources, packageAwareValidators);
  const registry = buildPackageResourceRegistry(resources); // duplicate kind:key => error
  const graph = buildPackageReferenceGraph(resources, ALLOWED_REFERENCE_PATHS);
  assertAllReferencesResolve(graph, registry);
  assertAcyclic(graph);
  assertAllowedSettings(resources.settings);
  return canonicalizePackage({ ...root, resources });
}

export function planPackageOrder(pkg: FullSitePackageV1): PlannedResource[] {
  return stableTopologicalSort(buildPackageReferenceGraph(pkg.resources));
}
```

**Data flow:** bounded parse → package-aware structural validation (allowing refs
only at registered paths) → index stable keys → extract refs → reject
dangling/ambiguous/cyclic graph → canonical sort. Native strict write
normalization runs only after installer reference substitution; ref-free embedded
documents may be normalized during generation.

**Error handling:** machine-readable `site_package_invalid`,
`site_package_ref_missing`, `site_package_ref_ambiguous`,
`site_package_ref_cycle`, `site_package_setting_forbidden` with safe paths only.

**Regression-test shape:** accept canonical full graph; reject every unknown key,
duplicate key, bad ref kind/path, dangling ref, cycle, secret-like setting, raw
bytes, over-byte/over-count/over-edge/over-depth input and invalid embedded
document; prove normalize(normalize(x)) identity and deterministic order.

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
