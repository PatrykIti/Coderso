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
inside package-owned seed metadata. `desired` is the complete adapter-domain
target: native create/update fields plus package lifecycle state where the
adapter owns draft staging or publish-last, ordered children where supported,
and other domain-owned state. Lifecycle-only fields never enter a strict native
create/update payload.
For Page v2, that snapshot owns `data` and never aliases it to `document`; for
Page Template, it owns `document` and never aliases it to `data`. The graph
registry preserves those native roots rather than translating between them.
Snapshot/equality compare the canonical normalized
`desired` value, not selected fields. Unknown seed-envelope keys are rejected.
Every package-owned array and every recursive `desired` array must be dense: an
absent own numeric index is non-JSON and rejects rather than materializing as
`null`, even though `JSON.stringify` would serialize both shapes identically.

Non-setting seed keys, package keys, `PackageRef.key` and verification scenario
IDs use the exact canonical grammar
`^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$` (1..128 characters).
Setting seed keys deliberately do **not** use that grammar: they must equal one
of `site.name`, `site.locale`, `site.homepageId`,
`site.navigationMenuId`, `site.footerTemplateId`, `site.contentRoutes` or
`design.tokens`. `VerificationPlan` is strict (`scenarioIds` only), accepts at
most 100 canonical IDs, preserves declaration order and collapses later
duplicates by first occurrence. Package, non-setting resource, setting,
verification-scenario, residual and reference identities are never trimmed.
Validation exports no mutable authority: package kind/collection tuples, the
collection-to-kind map, limits and the seven setting values are runtime-frozen;
root and setting membership sets stay module-private behind pure checks.
L02 recursively freezes its compatibility-exported fixed reference-path array,
rows and segment arrays. At module initialization it derives a private,
recursively frozen Page reference-authority snapshot from the native exported
block types, breakpoints and per-type slot arrays; every graph decision uses the
snapshot, so later mutation of an imported owner cannot change acceptance or
ordering.

L01 owns the only canonical text comparator:
`left < right ? -1 : left > right ? 1 : 0`. It is UTF-16 code-unit order and is
used for resource keys, residual IDs and L02 lexical identity/dependency ties;
canonical package/graph code must not use `localeCompare`, `Intl` or a host
locale. L01's object-key comparator reuses only ECMAScript array-index
classification and ordering: canonical array-index strings `0..4294967294` sort
numerically first. Every non-index key is deliberately sorted by the custom
UTF-16 text comparator. Free-form JSON objects reconstruct in that order before
`JSON.stringify`; schema-owned root/envelope objects are named exceptions in
their declared order, including root `schemaVersion,key,metadata,resources`, then
present optionals, and the fixed resource-collection tuple. Desired arrays and
first-occurrence verification order remain authored. Resource arrays/residuals
sort by canonical identity. Residual IDs use the exact hyphen-only
grammar `^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$`, are unique and reject
duplicates. Metadata/residual prose trims outer whitespace and preserves
interior code units; locale trims outer whitespace, validates
`^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$` and preserves case. Desired strings are
byte-preserved; finite `-0` canonicalizes to positive `0`.
After trimming, scan metadata `name`/optional `description` and all five residual
prose fields through L01's carrier-independent value policy. Their diagnostics
use only their exact schema-owned paths, including the original input residual
array index before canonical sorting; residual IDs and supplied values never
enter diagnostics. Locale and identity fields retain their stricter grammars.
Bare canonical Base64 text stays valid in prose because those fixed descriptive
fields are not binary carriers, while binary values, credential-shaped
Basic/Bearer authorization, private-key PEM, Base64 data URLs and
credential-bearing URLs reject.

`PackageRef` is frozen exactly as `{ ref, key }`, with no third key and the
canonical key grammar above. Reference substitution is allowed only by L02's
closed registry:

- required entry/detail `contentTypeId`;
- listing-query `query.sourceConfig.contentTypeId` and detail
  `related[*].listingQueryId` only when each property is present;
- inside `desired`, optional Page v2 `data.settings.collectionLink` and Page
  Template `document.settings.collectionLink`: `contentTypeId` is a required
  content-type ref when the object is present, while
  `listingQueryId`/`listingTemplateId` are nullable refs when present;
- recursively walk Page v2 root blocks at `data.sections[*].blocks[*]` and Page
  Template root blocks at `document.sections[*].blocks[*]`, then each block's
  native `slots.<slot-key>[*]` children. Before `block.type` can grant authority
  or stop traversal, derive a facts-only bounds preflight from the block's own
  `slots`, current depth, array child counts and indexed object children; it
  emits no diagnostic and registers no reference. Reject rather than clip depth
  5, a `slots` member at depth 4 and child 25 for both source kinds regardless of
  the discriminator. A valid discriminator inspects base `props`, then
  `responsive.tablet.props`, then
  `responsive.mobile.props`: `collection` permits nullable
  `contentTypeId/queryId/templateId`, `filters` permits nullable `queryId`, and
  `form` permits nullable `formId`, only when each property is present. It then
  traverses native slots in native order, with structural first match
  max-depth `slots` → non-slot-capable block → unknown slot key →
  per-slot child cap. A malformed discriminator remains native-validation-owned
  and grants no reference authority anywhere below it; its bounds-only walker
  instead enforces depth then child count and visits every array-valued own slot
  in L01 canonical object-key order, preserving each object child's original
  array index. General malformed slot/value/child shapes remain native-owned;
- menu `items[*].pageId` → Page when present and non-null; menu
  `desired.document.items` is not a native menu-item collection and is not a
  reference path;
- homepage, navigation-menu and footer-template setting values → Page, Menu and
  Page Template; content-route `detailPageId` → Detail Page, with the route's
  literal content-type slug cross-checked against a unique package content type.
  TASK-547-01-L02 then requires every present non-null route detail target's own
  resolved `contentTypeId` target to equal that route-selected content-type
  identity before lazy DB acquisition or the first write. The comparison runs
  only after the route row, detail ref, unique literal-type selection and detail
  page's required content-type ref all validate. A mismatch returns exactly one
  `content_route_detail_content_type_mismatch` at the trusted route
  `detailPageId` path, mapped to top-level `site_package_ref_bad_path`, without
  exposing either identity, key or slug. Invalid/null/missing/ambiguous
  prerequisites retain their existing outcome and never gain a mismatch; the
  mismatch joins the fixed global bad-path → missing → ambiguous priority.

No other path accepts `PackageRef`. Any other object shaped like a reference,
including raw `$ref`-like objects in arbitrary content, is rejected rather than
recursively rewritten. A nullable path contributes no edge when absent or
`null`; a non-null value must be an exact `PackageRef`. Diagnostics contain only
sanitized bounded paths and L02's closed
`ReferenceGraphDiagnosticReason` codes; raw keys, slugs, values, payloads, target
identities and cycle members are never echoed.
Registered reference paths and structurally blocked prefixes are keyed by the
source resource ordinal plus the exact relative segment array. Authority from
one resource therefore never suppresses generic forbidden-path scanning at the
same relative path in another resource.
Each structural rejection emits exactly one diagnostic at the block's `slots`
path, adds one source-ordinal-scoped blocked prefix and stops only that rejected
subtree. The generic ref-like scan skips that prefix to prevent duplicate child
diagnostics, but still catches every ref-like descendant elsewhere in a
malformed branch and continues through siblings, so no branch is clipped into
acceptance. Sanitization never discloses the malformed discriminator, untrusted
slot key, ref value or descendant payload.

Graph validation is globally phased: per-`desired` JSON-depth preflight, unique
identities, one mixed reference/path/target discovery stream and its finalizer
(diagnostic overflow, accepted occurrence-edge overflow, then semantic
findings), cycle detection, then dependency-depth validation. JSON `desired`
root is level 1; every property value/array item, including a scalar or `null`,
adds one; 64 is accepted and 65 returns only
`{path:"$.resources",reason:"json_depth_exceeded"}`. Raw normalization owns the
same guard before it calls the graph, so depth wins over duplicate errors at both
raw and typed boundaries.
Semantic discovery/finalization must succeed before either graph-shape check. In
the finalized acyclic direct-dependency graph, a root/resource with no dependency
has dependency depth 0 and every directed dependency edge adds one. The limit
therefore accepts a longest path of exactly 64 edges (65 resources) and rejects
65 edges (66 resources) with exactly
`{path:"$.resources",reason:"dependency_depth_exceeded"}`. Cycle detection runs
first, so a cyclic graph that also contains an independent over-depth path
reports `reference_cycle`, never dependency depth.
The 101st attempted diagnostic across duplicate or mixed semantic categories
discards the partial list for one `diagnostic_limit_exceeded` singleton. For
1..100 mixed semantic findings, return all in discovery order and choose the
top-level code by fixed `bad_path` then `missing` then `ambiguous` priority.
L01 `schema.ts` owns and exports the sole generic bounded collector factory;
L02's terminating duplicate phase and semantic phase each instantiate it and
may add only graph-specific tagging/finalization, never another array, counter
or overflow rule.
Inline ambiguity throws and per-code collectors are forbidden. Dynamic desired-
object keys never enter diagnostic paths: registry-owned path segments may be
shown, the first untrusted segment becomes `[redacted]`, and depth remains the
static resource path above.

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
no descriptor and is never rewritten. Its detail/content-type identity check
reuses the two resolved route targets and adds no edge or descriptor. The outer
plan is topologically ordered with dependencies first and stable ties by package
ordinal then identity; every nested snapshot/array is deep-cloned and frozen.
L02 exports
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
  write validity. After the depth preflight, exact own desired-object keys
  `__proto__`, `prototype` and `constructor` emit only
  `prototype_key_forbidden` at the static redacted desired path, skip that key's
  value branch and never expose its supplied key or value.
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
  authorization values, raw bytes, encoded values in explicit binary carriers
  and credential-bearing URLs. Classify desired keys by camelCase/separator
  tokens and exact whole-token compact aliases, never substring matching. Reject
  terminal credential material/pairs and their exact material suffixes while
  allowing descriptive near misses such as `tokenizedCopy`, `cookieBanner` and
  `apiKeyDescription`. Recognize explicit `base64|bytes|binary|blob` carriers
  plus exact `content|data|payload|value` compound roles. Only values under those
  explicit carriers receive bounded
  Base64-family scanning: strip exactly U+0009 through U+000D and U+0020 (HT,
  LF, VT, FF, CR and SPACE) for detection and reject canonical or noncanonical
  variants, including missing or correct padding, mixed standard/URL alphabets,
  internal padding, wrong or excess terminal padding and nonzero-pad-bit aliases.
  Bare desired fields, package prose and carrier-key near misses remain outside
  that scan. Every bounded free-form package string—each `desired` string and
  all seven package-prose surfaces—also receives a fixed bounded classifier
  pipeline over one detection-only ECMAScript-trimmed view. Independent
  monotonic authorization and PEM passes plus a URL/data-URL discovery pass that
  never jumps a prior span prevent any safe span from masking another candidate
  and together remain O(n). URL discovery keeps only numeric offsets, visits
  every code unit, parses each candidate at most once and fails closed with the
  static credential-URL reason if cumulative overlapping URL span input exceeds
  four times the trimmed string length; query/fragment decoding remains exactly
  once. The pipeline preserves reason
  precedence, emits at most one finding per string, and never retains or emits
  candidate text. Safe prose near misses and arbitrary other header-like copy
  remain valid. A finding uses only the surface's existing static redacted path
  and reason and discloses no header, URL, decoded parameter, credential or
  surrounding prose.
  Standards-parse every absolute-scheme
  (`^[A-Za-z][A-Za-z0-9+.-]*:`), protocol-relative and exact `/`, `./`, `../`,
  `?`, `#` relative URL candidate (the relative forms use one fixed inert base),
  rejecting parsed userinfo including special-scheme forms without `//` and any
  nonempty, exactly-once-decoded credential/signature query or fragment
  parameter. A decoded parameter name whose full untrimmed string
  ASCII-case-folds exactly to `code` also rejects when its decoded value has
  nonzero length without trimming; this is URL-only and does not add `code` to
  the global desired-key grammar, so descriptive multi-token names such as
  `status_code`, `promoCode` and `code_type` remain valid. Basic authorization
  uses a bounded pure decoder and decoded-colon detection rather than canonical
  decode/re-encode identity, so padding and nonzero-pad-bit variants reject while
  bare `Basic Plan` and `Basic analytics` remain valid. Inside the exact
  `Authorization:` wrapper, every nonempty bounded field value rejects regardless
  of authorization scheme or token grammar; Basic decoding and Bearer heuristics
  apply only to bare prose. Credential-shaped bare Bearer values, private-key PEM
  and Base64 data URLs reject; ordinary bare Bearer copy remains valid. The complete
  carrier-independent binary-class table is
  `ArrayBuffer`, `Uint8Array` (representative `ArrayBufferView`), `DataView`
  (representative `ArrayBufferView`) and `Blob`. Every row rejects at bare
  desired placement, with representative nested-array, nested-object and
  explicit-carrier coverage; binary receives first value-reason precedence as
  `binary_value_forbidden` at the fixed redacted desired path. Secret diagnostics
  use that path or one of seven exact package-prose paths and never echo input.
- **CSS/HTML:** package metadata never becomes a raw CSS/HTML/JS sink.

## Implementation Pseudocode

```ts
export function normalizeFullSitePackageForWrite(input: unknown): FullSitePackageV1 {
  assertPackageByteSize(input); // serialized in-memory JSON, not source-file bytes
  const root = assertStrictPackageRoot(input);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  const normalized = normalizePackageOwnedShapesAndScanSecrets(root);
  assertExactAllowedSettingKeys(normalized.resources.settings);
  assertUniqueResidualIds(normalized.compatibility);
  return canonicalize(normalized, {
    identities: compareFullSitePackageText,
    objectKeys: compareFullSitePackageObjectKeys,
  });
}

export function buildReferencePlan(pkg: FullSitePackageV1): readonly PlannedPackageResource[] {
  assertReferenceGraphJsonDepth(pkg.resources); // desired=1; static level-65 error.
  const registry = indexUniqueKindKeys(pkg.resources); // duplicate kind:key => error
  const { edges, descriptorsByIdentity, diagnostics } = collectRefsAtAllowedPaths(registry);
  const batch = diagnostics.read();
  if (batch.overflowed) throwDiagnosticLimitSingleton();
  if (edges.length > PACKAGE_LIMITS.referenceEdges) throwReferenceEdgesSingleton();
  throwGraphDiagnostics(batch);
  const ordered = stableTopologicalSort(registry, edges); // Cycle, then longest-path edge depth.
  return freezePlan(ordered, descriptorsByIdentity);
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
each build exactly one private plan with zero
`normalizeFullSitePackageForWrite` calls; three-argument planning and saga
preparation consume the same supplied frozen plan with zero builds. The CLI and
service intentionally build independently at their separate
trust boundaries; no caller-supplied plan crosses into service input/deps. Do not
add a wrapper helper or alternate validation path. Bad reference paths,
duplicate keys, dangling/ambiguous references and cycles fail before the
applicable lazy database import/access.

**Data flow:** unknown in-memory value → serialized-size/package-owned structural
normalization → index stable keys → discriminator-independent Page bounds
preflight → valid-type allowlisted discovery plus malformed-branch bounds-only
walking → generic ref-like scan → reject bad-path/dangling/ambiguous/cyclic
graph → stable topological sort → consumer boundary. Post-substitution
native-domain validation is owned and tested by TASK-547-02, not certified by
this task. Its strict adapter envelope receives the complete target after only
descriptor-recorded ID substitution; the Page document owner validates `data`,
native Page create/update receives only `title`/`slug`/`data`, and `status`
drives lifecycle operations. No adapter translates Page `data` to `document` or
Page Template `document` to `data`.

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
shape/count/ID grammar plus first-occurrence dedupe, immutable root/setting
membership, at most 100 bounded
diagnostics, normalize(normalize(x)) identity, complete desired-snapshot equality
and deterministic custom object-key order. The boundary regression must prove
that `"4294967294"` is the last array-index key while `"4294967295"`, `"01"`
and `"text"` are non-index keys, producing the exact combined order
`4294967294,01,4294967295,text`; also pin `-0` → `0`.
`full-site-package-{schema,canonicalization,security}.test.ts` must each run
independently through shared `fullSitePackageTestSupport.ts`; moved assertions or
builders are not copied. The security suite constructs each exact prototype-
sensitive own key through `JSON.parse` and pins its structural reason, fixed
redacted path, skipped value branch and complete key/value non-disclosure. It
also table-tests `ArrayBuffer`, `Uint8Array`, `DataView` and `Blob` at bare
desired placement, plus representative nested-array, nested-object and explicit-
carrier placements at arbitrary supported depth, with binary as the first value
reason and no type/byte/value disclosure. The suite pins all seven package-prose
surfaces, compact/suffixed credential aliases, compound binary carriers,
userinfo and signed query/fragment URL markers, plus exact ASCII-case-insensitive
`code` in both query and fragment with exactly-once decoding and empty/nonempty
duplicate behavior. It accepts descriptive multi-token code names and other safe
near misses. Explicit-carrier cases cover direct, inherited-array and nested-
object values; all six stripped ASCII whitespace characters; canonical,
missing/correct padding; mixed standard/URL alphabets; internal, wrong and excess
padding; nonzero pad bits; and bare-field/carrier-key near misses. Basic cases
pin canonical and padding/pad-bit alias credentials plus safe bare `Basic Plan`/
`Basic analytics`. Modular bare/nested desired-string and all-seven-prose cases
independently pin embedded authorization-header, credential-bearing URL and
Base64 data-URL candidates, candidate-order-independent precedence, bounded-
linear extraction, URL-span swallowing in both candidate orders,
leading/trailing ECMAScript whitespace, the fixed overlapping-span budget, safe
prose near misses, static redacted diagnostics and complete candidate/context
non-disclosure. Overlaps assert the single-finding precedence sensitive key →
binary → authorization → private-key PEM → credential URL → Base64 data URL →
explicit-carrier Base64 family, with complete non-disclosure of keys,
URLs/decoded parameters, authorization, encoded/decoded bytes, residual IDs and
values. An
unsorted multi-residual fixture proves
diagnostic paths keep their original input indexes after canonical residual
sorting. Graph tests are
likewise split into independently
runnable `full-site-package-references-{core,page,diagnostics,plan}.test.ts`
through focused `fullSitePackageReferenceTestSupport.ts`. They cover every
discriminator/nullability row,
reject the non-native menu `document.items` path, reject malformed ref keys
without echoing them, pin L02's exact closed reasons, plan/reference shapes,
occurrence-edge versus direct-dependency ordering, and content-route validation-
only edge. Focused L02 content-route cases independently pin a matching non-null
detail target with exactly its substitution and literal-type route edges, a
null detail target with only the literal-type edge, and a mismatched target with
the exact static bad-path outcome before lazy dependency acquisition or any
write. Missing/invalid/ambiguous prerequisites must retain their own outcome and
add no mismatch; mixed fixtures pin the global priority and complete
key/slug/identity non-disclosure. For both Page-backed kinds they accept depth
4/24 children and reject depth 5/25, non-native slots and atom slots without
clipping; valid-type overlap cases pin depth → atom → unknown slot →
child-count precedence. Independently
pin native-root ownership: accept and substitute Page v2 references at
`data.settings.collectionLink` and recursively below
`data.sections[*].blocks[*]`, reject the equivalent Page `document` paths,
accept and substitute Page Template references at the corresponding `document`
paths, and reject Page Template `data` paths. TASK-547-02's post-substitution
native-validation regressions additionally reject a Page `document` root and a
Page Template `data` root even when neither carries a ref-like value.
Independently
for `page` and `page_template`, a malformed discriminator with depth-4 `slots`
and a depth-5 child, with or without a ref-like descendant, yields one depth
diagnostic with no duplicate forbidden diagnostic; an in-bounds ref-like
descendant yields exactly one generic forbidden diagnostic and no authority,
edge or descriptor. Prove prefix behavior through observable suppression and
two-resource source-ordinal isolation without exposing the private collector.
For each Page-backed kind, a reverse-authored same-resource malformed-sibling
case combines four structurally blocked subtrees with one in-bounds ref-like
sibling and requires four canonical-order structural diagnostics followed by
exactly one generic forbidden diagnostic; this rejects ancestor-wide or other
overbroad prefixes. Malformed branches also pin 25 children → child-count, depth
plus 25 → depth, canonical own-slot order, original child indexes and complete
non-disclosure. Prove frozen
descriptor-only substitution with no second traversal or plan mutation. Pin
exact JSON level 64/65, mixed bad-path/missing/ambiguity priority and complete
discovery-order diagnostics, plus global semantic and duplicate 100/101
overflow. Focused dependency-depth tests accept a 64-edge/65-resource longest
path and reject a 65-edge/66-resource path with the exact static
`dependency_depth_exceeded` diagnostic. Separate precedence fixtures combine an
over-depth path with a semantic finding and combine an independent over-depth
branch with a cycle: the first reports the semantic result, while the second
reports `site_package_ref_cycle` with `reference_cycle`. This task proves only
its local raw normalize→graph call order; planner, typed-apply/preparer and CLI
call counts belong to TASK-547-02-L01, 02-L02 and 05-L01. A structural-schema
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
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate`

The line gate measures the verified baseline-to-final touched production/test
scope and rejects every human-authored file above 1,000 physical lines.

## Documentation Updates Required

Provide exact documentation deltas to TASK-547-06. TASK-547-06 is the sole writer
of shared source-of-truth and example docs. Its `_docs/DATA_MODEL.md` handoff
must document the text-backed install-ledger `resource_type` domain as all ten
exact full-site kinds (`content_type`, `form`, `page_template`,
`listing_template`, `content_entry`, `listing_query`, `detail_page`, `page`,
`menu`, `setting`), retain every existing legacy value and state explicitly that
this documentation/domain expansion requires no DDL migration.
