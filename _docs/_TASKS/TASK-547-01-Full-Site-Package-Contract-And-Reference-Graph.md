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

`PackageRef` is frozen exactly as `{ ref, key }`. Reference substitution is
allowed only by this closed field-path table:

- entry, listing-query and detail desired payloads → content type;
- detail desired payload → listing query;
- Page collection/filter/form bindings → content type, listing query, listing
  template and form respectively;
- menu item → Page;
- homepage, navigation-menu and footer-template settings → Page, Menu and Page
  Template respectively;
- content route → literal content-type slug plus Detail Page ID.

No other path accepts `PackageRef`. Any other object shaped like a reference,
including raw `$ref`-like objects in arbitrary content, is rejected rather than
recursively rewritten.

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
  reference edges/depth/string lengths and bounded diagnostic count. Exact
  package limits are 8 MiB per file, 512 resources total, 256 resources in any
  single collection, 4,096 reference edges, graph depth 64 and at most 100
  diagnostics. Native desired payloads retain every stricter domain-owned
  limit. Exceeding a limit returns `site_package_too_large` or
  `site_package_too_complex`.
- **Secrets:** reject forbidden setting namespaces, provider keys, cookies,
  authorization values, raw bytes/base64 and credential-bearing URLs.
- **CSS/HTML:** package metadata never becomes a raw CSS/HTML/JS sink.

## Implementation Pseudocode

```ts
export function normalizeFullSitePackageForWrite(input: unknown): FullSitePackageV1 {
  const root = assertStrictPackageRoot(input);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  const resources = normalizeResourceArrays(root.resources);
  assertAllowedSettings(resources.settings);
  return canonicalizePackage({ ...root, resources });
}

export function buildReferencePlan(pkg: FullSitePackageV1): PlannedPackageResource[] {
  const registry = indexUniqueKindKeys(pkg.resources); // duplicate kind:key => error
  const edges = collectRefsAtAllowedPaths(registry);
  return stableTopologicalSort(registry, edges);
}
```

`normalizeFullSitePackageForWrite` owns package shape, limits, canonicalization
and the setting allowlist; it does not certify reference placement or
resolution. Every full-package consumer executes the two existing exports in
this exact order:

```ts
const pkg = normalizeFullSitePackageForWrite(rawPackage);
buildReferencePlan(pkg);
// Only now may the consumer acquire its existing lazy DB-backed dependency.
```

Do not add a wrapper helper or alternate validation path. A structurally accepted
ref-shaped value is not a valid consumer package until `buildReferencePlan`
accepts it. Thus bad reference paths, duplicate keys, dangling/ambiguous
references and cycles fail before any lazy database import or access.

**Data flow:** bounded parse → package-owned structural normalization → index
stable keys → scan only allowlisted reference paths → reject
bad-path/dangling/ambiguous/cyclic graph → stable topological sort → lazy DB
acquisition. Native strict `desired` validation runs after reference
substitution but before any ledger or domain write; ref-free embedded documents
may be normalized during generation.

**Error handling:** machine-readable `site_package_invalid`,
`site_package_ref_missing`, `site_package_ref_ambiguous`,
`site_package_ref_cycle`, `site_package_setting_forbidden` with safe paths only.

**Regression-test shape:** accept canonical full graph and all ten strict
`{key,desired}` seed kinds; reject DB IDs in package JSON, every unknown key,
duplicate key, bad ref kind/path, dangling ref, cycle, secret-like setting, raw
bytes, each exact over-limit boundary, more than 100 bounded diagnostics and
invalid embedded document; prove normalize(normalize(x)) identity, complete
desired-snapshot equality and deterministic order. A structural-schema test may
accept a ref-shaped value solely to exercise shape/edge limits, while the full
consumer contract must prove that the same bad path is rejected by
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
