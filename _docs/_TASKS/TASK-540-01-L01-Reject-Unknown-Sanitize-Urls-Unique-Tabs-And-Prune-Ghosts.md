# TASK-540-01-L01: Reject Unknown, Sanitize URLs, Enforce Unique Tabs, and Prune Ghosts

# FileName: TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-01
**Priority:** High
**Category:** Custom Screens / Schema / Security
**Estimated Effort:** Medium
**Dependencies:** None inside TASK-540
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Historical Implementation Complete:** 2026-07-14 — original assigned work completed before the later repair cycles.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Current Repair State:** The two verified MEDIUM repairs and three verified test-integrity LOW regressions described below are implemented at the validated HEAD. The separate 2026-07-19 stored-read hardening named in `Fix Reason` and the later shared-selector follow-up in commit `f8e916b9255677352a2ed2fef9bd73093dec5683` are both covered by the current selector-inclusive R01 revalidation below. Earlier generation/token and pre-split receipts remain historical evidence only. The clean family post-audit, full validation, smoke, changelog, and closure remain pending.
**Current Selector Implementation Evidence:** 2026-07-19 — the Bun-free owner now exports `firstScreenMediaAssetUuid`, and the existing protected media-identity declaration covers scalar/array, first-valid, malformed, and exact-casing behavior without changing the 77-name partition. Commit `f8e916b9255677352a2ed2fef9bd73093dec5683` is implementation provenance, not a generation/token receipt.
**Current Selector Receipt State:** The exact selector-inclusive R01 owner gate passed on 2026-07-19 after commit `f8e916b9255677352a2ed2fef9bd73093dec5683`; the current `Revalidation Passed` field below is the sole active owner-gate receipt. It claims no clean family post-audit, full validation, smoke, changelog, or closure result.
**Repair Started:** 2026-07-16
**Fix Started:** 2026-07-19
**Fix Reason:** Post-audit reproduced that the stored-read legacy block-type alias map was consulted with a bare index read, so a stored `type` equal to an inherited `Object.prototype` member name resolved to a function and collapsed the whole `editorView` read into the empty fallback. R01 owns the runtime-frozen, own-property-only alias map that keeps all twelve inherited names as unrepaired legacy placeholders with byte-stable `data` and surviving bindings. R01 also removes the duplicated `publish`/`custom` Button rewrite from the read-repair pass so `screenDocumentDataNormalizer.ts` remains the sole owner: write rejects a present non-`link` action, while stored-read coerces it to `link` and drops `href`. No schema is loosened, no compatibility kind is added, and no assertion is weakened.
**Implementation Complete:** 2026-07-19 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Historical Stored-Read Revalidation:** generation 28bd5c90c7fd485eabc0c611d5e34752 / token 0237fd1a85b54c7e80e46c0eaac5477d / gate green
**Revalidation Passed:** 2026-07-19 — evidence-backed manual checkpoint receipt for the current selector-inclusive R01 owner gate: core lint/types and root TypeScript checks; schema partitions 18+9+10+13+11+5+11 = 77/77; document-operation partitions 12+19+12 = 43/43; exact fourteen-file Vitest matrix 210/210; reachable DB preflight; registered route partitions 13+8 = 21/21; Assistant family 73/73; combined route/Assistant Bun matrix 94/94; document-facade, schema/test-name, route/action-name, physical-line, workflow, and diff checks. This is not a transition-generated generation/token or hash receipt and claims no clean family post-audit, full validation, smoke, changelog, or closure result.
**Contract Correction:** 2026-07-19 — the orchestrator independently verified and adopted this execution contract after rejecting the fixer's unauthorized task-prose edits; the exact repair token remained unchanged through the matching successful `Revalidation Passed` transition.
**Repair Reason:** The final TASK-540 workflow audits reproduced strict identity drift plus three data-integrity gaps: one malformed stored binding could collapse a whole V4 editor before a metadata-only PATCH; id-less V1/V2/V3 bindings used an ambiguous local slug seed; and the pre-V4 Assistant composer still exposed an optional ID plus the same ambiguous fallback while feeding `custom-screen.upsert`. R01 owns per-binding stored-read rejection with document/sibling preservation, one V4 legacy membership pass, the shared framed-tuple binding-ID builder, and an explicit-ID-only Assistant composer boundary. The registered metadata PATCH proves repaired document persistence; the stored-read duplicate-ID regression keeps uniqueness fail-closed outside the per-item catch.
**Prior R01 Revalidation:** 2026-07-16 — before the Assistant composer and stored-read duplicate-test findings, HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus the then-three dirty R01 owner paths passed core/root static gates, five-file Vitest 168/168, reachable DB preflight, Custom Screens route plus Assistant executor Bun 92/92 with 568 expectations, isolated route 19/19 with 110, document-op 11/11, and `git diff --check`. This evidence is historical for the expanded contract.
**Previous Assistant Repair Started:** 2026-07-14
**Historical Assistant Repair Reason:** Repository-wide Bun validation confirmed that the Assistant Custom Screen block-patch test still constructed unsupported `hero` and `rich-text-section` blocks at the strict V4 write boundary. R01 owned a fixture-only update to canonical fixed kinds and data paths while preserving the selected block's sibling data and the untouched sibling block; production/schema behavior did not loosen.
**Historical Assistant Revalidation:** generation 18cd43dd8f0f89cff684d430e2f38b9d / token 1b3e7a821edc208050497e6675544347 / gate green
**Historical Completion:** 2026-07-14
**Historical Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact schema/image Vitest matrix (75/75), the DB-backed Custom Screens route suite (15/15; 82 expectations), and `git diff --check`
**Historical Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings for the original-string ASCII-control repair and its exact five-value regression matrix
**Previous Fix Started:** 2026-07-14
**Previous Fix Reason:** Final closure audit reproduced that TAB/LF/CR and other ASCII controls can survive the Screen wrapper and be reinterpreted at a URL sink; the wrapper must reject them before Page-helper delegation.
**Prior Corrective Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact schema/image Vitest matrix (74/74), the DB-backed Custom Screens route suite (15/15; 82 expectations), and `git diff --check`, before the control-character contract was added
**Prior Corrective Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings on the provenance-corrected working tree before the control-character corpus was added
**Previous Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact schema/image Vitest matrix (72/72), and the DB-backed Custom Screens route suite (15/15; 82 expectations)
**Previous Completion:** 2026-07-14
**Previous Reopened:** 2026-07-14 (Screen URL control-character repair)
**Historical Reopened:** 2026-07-14 (Assistant Custom Screen block-patch fixture compatibility)
**Reopened:** 2026-07-16 (strict identity, scoped stored-read recovery, legacy and Assistant ID generation, duplicate fail-closed proof, and metadata-PATCH preservation)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/assistant/blueprints/blueprintBindingComposer.ts`, only to make
  `BlueprintBindingContribution.id` required and reject absent/null/blank runtime IDs
  without a generated fallback; existing explicit-ID normalization and duplicate
  fail-closed behavior remain unchanged
- the stable public facade `core/services/customScreens/customScreenSchemas.ts` and
  these cohesive extracted owners, all exclusively R01-owned for the current split:
  `customScreenContracts.ts`, `customScreenNormalizationPrimitives.ts`,
  `screenMediaIdentity.ts`, `screenDocumentDataNormalizer.ts`,
  `screenDocumentNormalizer.ts`, `screenDocumentReadNormalizer.ts`,
  `customScreenBindingNormalizer.ts`, `customScreenLegacyAdapters.ts`,
  `customScreenListViewNormalizer.ts`, `customScreenEditorViewNormalizer.ts`,
  `customScreenDefinitionNormalizer.ts`, and `customScreenJsonSchemas.ts`
- `core/services/customScreens/bindingResolver.ts`, only to move its
  `CustomScreenBinding`, `CustomScreenListColumn`, `CustomScreenListRowTemplate`, and
  `ScreenFieldBinding` type-only import from the facade to
  `customScreenContracts.ts`; no resolver behavior changes
- `core/services/customScreens/screenDocumentOps.ts`, only to replace its local
  binding-ID construction with the schema-domain-owned `buildScreenFieldBindingId`
  in block factories and binding duplication, and to perform the mandatory stable-facade
  extraction into `screenDocumentContracts.ts`, `screenDocumentFactories.ts`,
  `screenDocumentTree.ts`, `screenDocumentMutations.ts`, and
  `screenDocumentBindingOps.ts`; all document-operation behavior and public imports
  remain unchanged
- `core/services/customScreens/customScreenService.ts`, only to give create the same
  warning-sink/build-response flow already used by update; do not refactor DB access
- `core/server/routes/customScreenRoutes.ts`, only to remove the route-local error
  carrier, import/re-export the domain-owned carrier, and preserve
  `mapCustomScreenError` code/status/message plus bounded `details.fields`
- compatibility updates and the mandatory no-loss partition required by this source
  gate in `tests/vitest/admin/custom-screen-schema-fixtures.ts`,
  `tests/vitest/admin/custom-screen-schemas.test.ts`,
  `tests/vitest/admin/custom-screen-document-contract.test.ts`,
  `tests/vitest/admin/custom-screen-block-style.test.ts`,
  `tests/vitest/admin/custom-screen-section-style-and-binding-gc.test.ts`,
  `tests/vitest/admin/custom-screen-fixed-block-contract.test.ts`,
  `tests/vitest/admin/custom-screen-binding-contract.test.ts`,
  `tests/vitest/admin/custom-screen-stored-read-repair.test.ts`,
  `tests/vitest/assistant/blueprint-binding-composer.test.ts`,
  `tests/vitest/customScreens/screenDocumentOps.test.ts`,
  `tests/vitest/customScreens/screen-document-image-src.test.ts`,
  `tests/integration/routes/customScreensRoutes.test.ts`,
  `tests/integration/routes/customScreensDefinitionIntegrityRoutes.test.ts`, and
  `tests/integration/routes/support/customScreensRouteHarness.ts`
- direct Assistant consumer gates, read-only for the current correction:
  `tests/vitest/assistant/action-plan-schema.test.ts` and
  `tests/vitest/assistant/catalogBlueprintEngine.test.ts`
- fixture-only compatibility update in
  `tests/unit/assistant/actionExecutorCustomScreens.test.ts`, limited behaviorally to the
  existing `executeAssistantActionPlan patches custom screen block data` case, plus the
  mandatory no-loss partition of the historical
  `tests/unit/assistant/actionExecutorService.test.ts` 73-test name multiset into the 12
  named Bun suites and five support modules below; that partition source itself now
  retains only positions 1-6

### Current selector-owner correction (landed before R03; revalidated)

The 2026-07-19 post-audit found equivalent `firstMediaAssetUuid` implementations in the
R03 renderer model and L03 Entry presentation-media owner. The earlier L03-only attempt
was reverted after correctly proving that a pure L03 module may not import an admin/UI
renderer model. R01 therefore owns the shared implementation in
`screenMediaIdentity.ts`; commit `f8e916b9255677352a2ed2fef9bd73093dec5683`
landed it before the R03 and L03 consumer commits. The exact selector-inclusive R01
owner gate then passed and is recorded by the current receipt above.

Implementation shape:

```ts
// Keep isScreenMediaAssetUuid at line 4 for the existing TASK-9999 evidence anchor.
const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

export function firstScreenMediaAssetUuid(value: unknown): string | null {
  if (isScreenMediaAssetUuid(value)) return value;
  if (!isUnknownArray(value)) return null;
  return value.find(isScreenMediaAssetUuid) ?? null;
}
```

`unknown` is permitted only at this untrusted value boundary and is narrowed before
use. Do not add `any`, an assertion cast, normalization, lower-casing, or a fallback.
Do not re-export this internal selector from `customScreenSchemas.ts`: its pinned public
manifest and the existing predicate export stay byte-compatible. Extend the existing
`TASK-540-01 media identity predicate has one exact UUID contract` declaration in
`custom-screen-stored-read-repair.test.ts` with scalar, mixed scalar/array, first-valid,
all-invalid, and exact-casing selector assertions. Add no test declaration; the R01
schema family remains exactly 77 in partition `18+9+10+13+11+5+11`. The task workflow,
not this prose edit, creates and consumes the canonical repair receipt.
Load the internal selector with a callback-local dynamic import inside that existing
test; do not change module-scope imports or any other declaration.
Immediately before the owner gate, the orchestrator alone may re-pin the changed
declaration-body SHA in `task-540-test-name-contract.mjs`. Its capture must prove the
same files/order, 77 names/declarations, global name hash, partition counts, and
per-file name hashes; normalization against `HEAD` must prove that no byte outside the
four explicitly allowlisted corrective SHA fields changed. Its test-source projection
permits only this named call expression to differ from `HEAD` and requires every
pre-existing callback statement to remain an ordered subsequence. The leaf agent never
owns or edits that workflow file.

For the completed control-character correction, the exact writable implementation set was
`core/services/customScreens/customScreenSchemas.ts` plus
`tests/vitest/customScreens/screen-document-image-src.test.ts`. The other historical
owner files and named gate suites are read-only unless a separately verified finding
reopens their contract. Audit repair authority then uses this leaf's full declared owner
set; the historical Assistant executor path remains conditionally fixture-only and is mechanically guarded
byte-for-byte whenever it is touched. The Page-owned sanitizer module remains read-only.

For the historical Assistant fixture repair, the only behaviorally writable test region
was the existing block-patch case in `tests/unit/assistant/actionExecutorService.test.ts`. It
replaced the unsupported Screen `hero`/`rich-text-section` fixture and matching action
identifiers, type, path, and assertions with canonical fixed-kind equivalents. It used
a `heading` block patched at `dataPath: ["text"]` and an independent `text` sibling,
then asserted the patched heading text, another unchanged property on that same heading,
and the untouched text sibling's content. Shared test helpers, other Assistant cases,
production Assistant code, the Screen schema/normalizer, and compatibility arms remained
unchanged. The strict V4 boundary remains authoritative and receives no fallback for
stale fixtures. During the mandatory modular split, that fixture-only authority is
conditional: complete unchanged test declarations and their required setup/assertions
may move to the exact owning suite, and shared setup may move to the five named support
modules. No test body, assertion, name, error code, production behavior, or fixture
outside the already-approved fixed-kind case may change. The pre/post sorted test-name
multiset must remain byte-identical.

Status authority is phase-aware: before changelog 1252 covers the family, a landed,
gated source sibling remains `🚧 In Progress` with its `Implementation Complete`
receipt; after 1252 covers that physical ID, it may be `✅ Done` with `Completed`.
R01 now carries canonical `Implementation Complete` plus one current selector-inclusive
`Revalidation Passed`; its prior generation/token receipt remains preserved under the
dedicated historical field. TASK-540-04-L03's prior scoped receipt and
TASK-540-06-L01's exact pre-closure receipt also remain preserved as historical or
reserved evidence. The five-owner corrective chain was re-gated in dependency order
R01 → R03 → L03 → L04 → L01 before the clean post-audit. No receipt is duplicated or
treated as smoke/closure evidence. `_docs/_workflows/task-540-implement.mjs`
owns this phase-aware restart invariant and exposes `--self-test-repair-siblings` as
its executable projection.

The older blanket `screenDocumentOps.ts` exclusion is superseded only for the
corrective binding-ID builder handoff described above. It does not grant R01 authority
over insertion, movement, duplication shape, GC, or any other document operation.
`ScreenBlockInspector.tsx` and its extracted `screenBlockInspectorModel.ts` remain
exclusively owned by TASK-540-02-L01: that leaf's `createScreenFieldBinding` helper now
lives in the model module and calls the same domain builder there, with the Inspector and
`hooks/useCustomScreenDocumentActions.ts` as its consumers. R01 must not edit the
Inspector, its model, or its UI tests.

Do not edit route registration/handlers, `ScreenBlockLibrary.tsx`, renderer/UI files,
task indexes, or changelogs in this leaf. Update the named existing behavior tests
before running this leaf's gate; TASK-540-06 may add aggregate coverage later but must
not re-baseline this leaf's assertions.

`tests/vitest/customScreens/customScreenService.test.ts` is read-only here. Importing
its production module has immediate `db/client` coupling, so this leaf does not add or
move persistence assertions into that Vitest suite. Create/update response and stored
row behavior are proved in the existing Bun route integration lane with uniquely scoped
fixtures and owned-row cleanup.

## Current verified audit repair and revalidated receipt

The following five findings are repaired in the landed implementation. They
remain part of R01, and the completed post-split gate proved them again from the
extracted owners. Symbol and test names are authoritative; mutable pre-split line
numbers are intentionally not used.

1. **MEDIUM — legacy whole-array binding failure.** Stored V1/V2/V3 binding
   normalization previously retried/fell back at whole-array scope, so one malformed
   binding could discard the entire editor payload. The legacy binding-read path now
   catches only the known domain-invalid error per item, drops only that malformed
   binding, preserves sibling sections/blocks/data/valid bindings, performs one V4
   membership pass, and leaves duplicate normalized IDs outside the item catch. The
   V1/V2/V3 malformed-binding schema matrix and the legacy V3 metadata-only PATCH route
   case own the regression.
2. **MEDIUM — duplicate V4 editor failure leaked into list recovery.** Duplicate
   stored editor binding IDs must remain fail-closed, but an editor-normalization
   failure previously allowed the broader fallback to replace a valid non-default
   `listView`. Recovery is now editor-scoped: the editor becomes the canonical empty V4
   editor while the independently normalized list view is preserved byte-for-byte.
   The duplicate-editor-ID schema regression owns that boundary.
3. **LOW / test integrity — incomplete generated-ID collision matrix.** The prior
   tests did not cover the complete write-versus-legacy separator and case collision
   matrix. The schema gate now runs `(a-b,c)` versus `(a,b-c)` and `(A,value)` versus
   `(a,value)` through strict writes and id-less V1/V2/V3 reads, proving distinct,
   canonical, bounded, stable IDs and exact binding references.
4. **LOW / test integrity — missing malformed row-template recovery proof.** The
   stored-read matrix now includes the list row-template scope and proves that one
   malformed binding is dropped locally without losing its document, valid sibling
   binding, editor scope, input immutability, or read/write idempotence.
5. **LOW / test integrity — missing normalized duplicate composer conflict.** The
   Assistant composer suite now supplies two different contributions whose explicit IDs
   normalize to the same value and pins the exact
   `assistant_blueprint_binding_duplicate_id` error. Missing/null/blank IDs continue to
   fail with `assistant_blueprint_binding_invalid`; field/secret precedence remains
   unchanged.

None of these findings is eligible for TASK-9999: the MEDIUM findings affect persisted
data and reliability, while the three LOW findings are explicitly test-integrity gaps.
The pre-split receipt above is retained as history and was not promoted into the final
receipt after files, imports, test ownership, and route harnesses changed; the separate
canonical post-split receipt records the completed owner gate.

## Completed production-module split (historical plan; maximum 1,000 physical lines)

At the verified pre-split baseline,
`core/services/customScreens/customScreenSchemas.ts` contained 3,539 physical lines. The
completed repair converted it to an explicit public facade. External production and test
consumers continue to import that path. The facade must explicitly re-export the same 62 runtime
members and the same 39-member type surface; `export *` is forbidden because it could
expose cross-module implementation helpers. The split uses this exact responsibility
map:

| New owner | Pre-split symbol/range ownership | Result bound |
|---|---|---:|
| `customScreenContracts.ts` | public enums/types (`:17-206`); `defaultScreenSectionId` (`:227`); the sole `screenBlockDataAllowedKeys` / `compatibilityScreenBlockTypes` / `FixedScreenBlockType` descriptors (`:512-532`); Tabs/document constants (`:534-540`); block-style values/types/allowed keys (`:567-585`); section-style values/types/template/allowed keys (`:641-684`); warning contracts (`:710-725`) | `<=1000` |
| `customScreenNormalizationPrimitives.ts` | version/path/hash/context/error primitives (`:208-451`, excluding contract-owned `defaultScreenSectionId` at `:227` and including the sole generic `normalizeJsonValue`) plus the extracted `normalizeUniqueIds` (`:2058-2065`); sole `CustomScreenDefinitionError` and `buildScreenFieldBindingId` definitions | `<=1000` |
| `screenMediaIdentity.ts` | private UUID pattern (`:541`), public `isScreenMediaAssetUuid` (`:548-550`) retained at final line 4, and the internal first-valid scalar/array selector appended below it | `<=1000` |
| `screenDocumentDataNormalizer.ts` | screen-data/style/URL/fixed-kind/Tabs normalization and slot equality (`:505-510`, `:543-546`, `:552-561`, `:587-635`, `:686-708`, `:727-997`); imports generic `normalizeJsonValue` and every contract-owned descriptor/value | `<=1000` |
| `screenDocumentNormalizer.ts` | strict recursive block/section/document writes (`:1030-1217`) plus the sole shared `visitScreenBlocks`, `collectScreenDocumentBlockIds`, and `assertScreenFieldBindingsTargetDocument` implementations consolidated from `:2067-2097` and `:2275-2300` | `<=1000` |
| `screenDocumentReadNormalizer.ts` | Tabs/actions repair, structural provenance, generated-ID repair, unsupported-Button collection, and stored document reads (`:1227-1546`) | `<=1000` |
| `customScreenBindingNormalizer.ts` | the three binding modes, per-item stored recovery, legacy binding reads, uniqueness, and binding conversions (`:1553-1665`, `:1720-1730`, `:1739-1747`, `:1787-1844`, `:2409-2432`) | `<=1000` |
| `customScreenLegacyAdapters.ts` | retired WidgetBlock reads, widget/screen type adapters, legacy document projection, and public editor compatibility projections (`:453-503`, `:999-1028`, `:1667-1718`, `:1731-1737`, `:1749-1785`) | `<=1000` |
| `customScreenListViewNormalizer.ts` | list defaults, columns/filters, row templates, strict writes, and stored reads (`:1863-2239`, excluding shared-helper source `:2058-2097`; plus `:2471-2544`) | `<=1000` |
| `customScreenEditorViewNormalizer.ts` | legacy/V4 editor write/read normalization and editor-scoped empty recovery (`:2241-2407`, excluding duplicate traversal source `:2275-2300`; plus `:2434-2469`) | `<=1000` |
| `customScreenDefinitionNormalizer.ts` | V1 normalization, migrations, top-level write/read dispatch, sidebar, and collection metadata (`:1846-1861`, `:2546-2975`) | `<=1000` |
| `customScreenJsonSchemas.ts` | binding/legacy/V2/V3/V4/fixed-block and create/update JSON schemas (`:2977-3539`) | `<=1000` |
| `customScreenSchemas.ts` | explicit compatibility facade only | `<=1000` |

The allowed import direction is acyclic:

```text
contracts -> normalization primitives -> document data
          -> document write -> document read
          -> bindings -> legacy adapters
          -> list view -> editor view -> definition normalizer
contracts + primitives -> JSON schemas
all public owners -> explicit customScreenSchemas facade
```

`screenBlockDataAllowedKeys`, `compatibilityScreenBlockTypes`, and
`FixedScreenBlockType` are contract descriptors, not normalizer implementation. Both
`screenDocumentDataNormalizer.ts` and `customScreenJsonSchemas.ts` import them from
`customScreenContracts.ts`; neither module imports the other. This keeps the JSON
schema branch and semantic normalizer byte-aligned without introducing a reverse edge
or duplicating fixed-kind values.

Shared helper ownership is exact. `customScreenNormalizationPrimitives.ts` exports the
single internal `normalizeJsonValue` and `normalizeUniqueIds` implementations.
`screenDocumentNormalizer.ts` exports the internal `visitScreenBlocks`,
`collectScreenDocumentBlockIds`, and `assertScreenFieldBindingsTargetDocument`
implementations. The current later `collectScreenBlockIds` duplicate is removed;
document-read, list-view, and editor-view owners import the shared traversal/live-ID
helpers, while document/data owners import the two primitives. None of these
internal-only helpers joins the 62/39 public facade manifest.

`bindingResolver.ts` breaks the only relevant back-edge by importing its four schema
types directly from `customScreenContracts.ts`; its runtime behavior stays unchanged.
`customScreenLegacyAdapters.ts` imports the two binding conversion helpers from
`customScreenBindingNormalizer.ts`; it does not redefine them or create a reverse
binding-to-legacy import.
Every other current consumer retains the facade import unless it is one of the new
internal modules. The extraction must preserve one error-class identity, one shared
schema object/`$defs` owner, current import-time behavior, lazy widget registration,
strict reject-unknown semantics, stored-read repair order, object key order, and all
present-only/byte-identity behavior. Moving code does not authorize renaming a public
member, widening a type/schema, introducing a fallback, or duplicating an enum, bound,
regex, normalizer, hash, or error carrier.

Because `isScreenMediaAssetUuid` moves to `screenMediaIdentity.ts`, the final workflow
and TASK-9999-01-L01 evidence must be re-anchored to that symbol after extraction; a
stale `customScreenSchemas.ts` line number cannot remain authoritative. This is an
evidence-path update only and does not execute, close, or expand the deferred leaf.

## Completed schema-test split (historical plan; 75 tests preserved + two regressions)

At the verified pre-split baseline, the Vitest file contained 3,436 lines. The completed
repair partitioned it by behavior without weakening or silently omitting an assertion or
test name. The 75 existing tests remain exact and two focused regressions were added,
for final cardinality
`18 + 9 + 10 + 13 + 11 + 5 + 11 = 77`. Shared builders move only to the named fixture
module; every `.test.ts` remains independently runnable in the existing Vitest lane.

| Test owner | Pre-split tests | Count | Result bound |
|---|---|---:|---:|
| `custom-screen-schemas.test.ts` | current `:1-846`, minus shared builders; payloads, base definition writes/reads and legacy migrations; one exact public-facade export/identity regression | 18 | `<=1000` |
| `custom-screen-document-contract.test.ts` | current `:847-1211`; V4 document/row-template/default and compatibility behavior | 9 | `<=1000` |
| `custom-screen-block-style.test.ts` | current `:1212-1404`; sidebar plus block-style contract | 10 | `<=1000` |
| `custom-screen-section-style-and-binding-gc.test.ts` | current `:1405-1696`; section style and binding-GC/warning behavior | 13 | `<=1000` |
| `custom-screen-fixed-block-contract.test.ts` | current `:1749-2201`; exact fixed kinds, recursion, bounds, Tabs and local stored repair | 11 | `<=1000` |
| `custom-screen-binding-contract.test.ts` | current `:2202-2914`; strict/compatibility/stored binding identity and the current repair matrix | 5 | `<=1000` |
| `custom-screen-stored-read-repair.test.ts` | current `:2915-3436`; Button/Tabs provenance, ghosts, byte identity, Ajv order, media identity and prototype-safe aliases | 11 | `<=1000` |

`custom-screen-schema-fixtures.ts` owns only `buildV4WithBlocks`,
`fixedKindDataCases`, and `fixedKindBlock`. It contains no test and no mutable shared
state. Helpers used by only one partition stay local to that test file. The combined
gate and seven isolated reruns must all pass; file splitting cannot rely on Vitest file
order or cross-file mutable state.

The new facade regression parses `customScreenSchemas.ts` as TypeScript, rejects
`export *`, and compares the exact explicit export manifest with the current 62 runtime
and 39 type names. It imports the facade plus every owning module and asserts that each
runtime member is the same value/object/function/class identity as its single owner;
in particular `CustomScreenDefinitionError`, the three mutation/definition schemas,
all enum arrays/clamp objects/regexes, and every public normalizer must not be cloned or
wrapped. This test is Bun-free and remains inside the existing schema suite matrix.

The sorted runtime manifest is exact:

```text
CUSTOM_SCREEN_ERROR_FIELDS_MAX, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX,
CustomScreenDefinitionError, SCREEN_BLOCK_COLLECTION_MAX,
SCREEN_BLOCK_MIN_HEIGHT_CLAMP, SCREEN_DOCUMENT_SECTIONS_MAX,
SCREEN_SECTION_COLUMN_GAP_CLAMP, SCREEN_TABS_MAX, SCREEN_TABS_MIN, SCREEN_TAB_ID,
SCREEN_TAB_LABEL_MAX, buildDefaultListRowTemplate, buildDefaultListViewDefinition,
buildScreenFieldBindingId, customScreenBindingModes, customScreenBindingSchema,
customScreenCollectionRoleValues, customScreenCreateModes, customScreenCreateSchema,
customScreenDefinitionSchema, customScreenListColumnSources,
customScreenListFilterOperators, customScreenListFormatters, customScreenRowClickModes,
customScreenSortDirections, customScreenStatusValues, customScreenUpdateSchema,
defaultScreenSectionId, getCustomScreenEditorViewBindings,
getCustomScreenEditorViewBlocks, getCustomScreenEditorViewCompat,
isScreenMediaAssetUuid, migrateV1DefinitionToV3, migrateV1DefinitionToV4,
migrateV2DefinitionToV3, migrateV2DefinitionToV4, migrateV3DefinitionToV4,
normalizeCustomScreenBindings, normalizeCustomScreenBlocks,
normalizeCustomScreenCollectionLink, normalizeCustomScreenDefinition,
normalizeCustomScreenDefinitionForRead, normalizeCustomScreenDefinitionForWrite,
normalizeCustomScreenEditorViewDefinition, normalizeCustomScreenEditorViewDefinitionV4,
normalizeCustomScreenEditorViewDefinitionV4ForRead,
normalizeCustomScreenListViewDefinition, normalizeCustomScreenSchemaVersion,
normalizeCustomScreenSidebarConfig, normalizeCustomScreenV1Definition,
normalizeScreenDocumentV1, normalizeScreenDocumentV1ForRead,
normalizeScreenFieldBindings, normalizeScreenImageSrc, sanitizeScreenAuthoringUrl,
screenBlockAligns, screenBlockBoxSides, screenBlockWidths, screenImageRatios,
screenSectionColumnPresets, screenSectionColumnTemplate, withCustomScreenEditorViewCompat
```

The sorted type manifest is exact:

```text
CustomScreenBinding, CustomScreenBindingMode, CustomScreenBindingWarning,
CustomScreenCollectionLink, CustomScreenCollectionRole, CustomScreenDefinition,
CustomScreenDefinitionContext, CustomScreenDefinitionV1, CustomScreenDefinitionV2,
CustomScreenDefinitionV3, CustomScreenDefinitionV4, CustomScreenDefinitionVersion,
CustomScreenEditorViewDefinition, CustomScreenEditorViewDefinitionV4,
CustomScreenLegacyDefinition, CustomScreenListColumn, CustomScreenListColumnSource,
CustomScreenListFilter, CustomScreenListFilterOperator, CustomScreenListFormatter,
CustomScreenListRowTemplate, CustomScreenListViewDefinition,
CustomScreenListViewDefinitionV2, CustomScreenSidebarConfig, CustomScreenSortDirection,
CustomScreenStatus, ScreenBindingWarningSink, ScreenBlockAlign,
ScreenBlockBoxSpacingV1, ScreenBlockStyleV1, ScreenBlockV1, ScreenBlockWidth,
ScreenDocumentV1, ScreenFieldBinding, ScreenImageRatio, ScreenSectionColumnPreset,
ScreenSectionStyleV1, ScreenSectionV1, ScreenTabItem
```

## Completed Custom Screens route-test split and exact cleanup (historical plan)

At the verified pre-split baseline, the 1,239-line `customScreensRoutes.test.ts` had 20
Bun/DB tests. The completed split preserved all 20, added one cleanup fault-path
regression, and moved the existing definition-integrity region (pre-split support/test
range `:729-1218`) without weakening its assertions into
`customScreensDefinitionIntegrityRoutes.test.ts`. That R01 suite owns these eight tests:

1. metadata-only V4 Tabs/overlong-ID repair;
2. metadata-only legacy V3 sibling preservation with malformed-binding drop;
3. rejection of fresh `publish`/`custom` Button actions;
4. recursive fixed-kind unknown-key rejection;
5. unsupported block types at root, child, and slot depths;
6. bounded, non-echoing unsafe-URL/duplicate-Tabs/tab-slot error mapping; and
7. empty-document ghost pruning, warning de-duplication, and warning-free subsequent
   GET; and
8. harness cleanup continuation after injected failures, with exact-ID-only attempts
   and final failure propagation.

The original route file retains its other 13 tests, including registration/error
mapping, TASK-503/505 route/style/binding behavior, both TASK-540-04 direct-image
override tests, and unknown presentation-override envelope rejection. Expected sizes
after extraction are approximately 550 lines for the original suite, 530 for the new
definition-integrity suite, and 230 for the support module; the hard requirement for
each remains `<=1000`.

`tests/integration/routes/support/customScreensRouteHarness.ts` owns the reusable
stateless route helpers `makeRouter`, `findRoute`, `runRoute`, and `buildDefinition`,
plus `createCustomScreenRouteHarness()`. The factory accepts optional test-only cleanup
dependency overrides while defaulting every dependency to the current real helper; it
does not accept caller-selected cleanup predicates or identifiers. Each calling suite creates its own factory
instance and registers `afterEach(harness.cleanup)`; no exported singleton tracker or
shared cleanup state is permitted. The returned harness owns private per-suite
`Set`/`Map` state and exposes only `cleanup`, `seedBoundScreen`, `patchScreen`,
`patchScreenDefinition`, `postScreen`, and these exact-ID trackers:
`trackScreenId`, `trackContentTypeId`, `trackEntryId`, `trackUserId`, and
`trackOverrideScope`.

Trackers accept only the exact UUIDs returned by that suite's fixture creation/read
proof; no slug/prefix or caller-selected wildcard becomes cleanup authority. Cleanup
continues independent exact resources in this order:

1. delete each tracked presentation override by its exact `(screenId, entryId)` tuple;
2. delete each exact tracked screen UUID;
3. delete each exact tracked entry UUID;
4. delete each exact tracked content-type UUID through `deleteContentType`, with only an
   exact-same-ID fallback when required by the existing helper contract;
5. delete each exact tracked user UUID; and
6. clear only that harness instance's local trackers.

It reuses `tests/utils/db.ts::canConnect`. Truncation, whole-table deletion,
prefix/pattern deletion, broad predicates, cross-suite trackers, and cleanup of any row
not acquired by the calling suite are forbidden. A cleanup error must still attempt
independent later resources and fail the owning test rather than silently leaking them.
The eighth definition-integrity test injects deterministic failures in early cleanup
dependencies, tracks one exact fixture-shaped ID for every resource family, and proves
that all later independent exact IDs are attempted in the required order, trackers are
cleared, and the original/aggregate cleanup error is rethrown. It also asserts that no
untracked or prefix-derived identifier reaches any dependency.

## Full-family line-gate provenance

The line-limit baseline for this family is commit
`e5f15a567`. Every added or modified human-authored production/test path is measured
from that commit through the final working tree; HEAD changes, staging, and intermediate
owner commits do not reset or narrow the scope. The verified baseline and last
pre-extraction working-tree blockers are:

| Path | Baseline `e5f15a567` | Verified pre-extraction tree | Why it is in the gate |
|---|---:|---:|---|
| `core/services/customScreens/customScreenSchemas.ts` | 2,596 | 3,539 | R01 source changed |
| `tests/vitest/admin/custom-screen-schemas.test.ts` | 1,366 | 3,436 | R01 assertions changed |
| `tests/integration/routes/customScreensRoutes.test.ts` | 522 | 1,239 | R01 route evidence changed |
| `core/services/customScreens/screenDocumentOps.ts` | 1,037 | 1,030 | R01 binding-ID producer changed |
| `tests/unit/assistant/actionExecutorService.test.ts` | 6,577 | 6,577 | R01 replaced ten fixture lines |

The last file remains the same total size because the approved fixture repair replaced
ten lines with ten lines; byte change, not net line growth, establishes touched-file
scope. `core/services/assistant/actionExecutorService.ts` is byte-identical to the
baseline and remains read-only, so this task does not refactor that unrelated legacy
production monolith.

## Completed document-operations module split (historical plan)

The historical touched 1,030-line `screenDocumentOps.ts` became the stable explicit
facade over five cohesive owners. Existing production/test consumers retain their import path.
The facade exports the exact existing 26 runtime members and six type members as the
same references; `export *`, wrappers, renamed exports, and duplicate implementations
are forbidden.

| Owner | Sole responsibility and symbols | Post-format budget |
|---|---|---:|
| `screenDocumentContracts.ts` | `ScreenBlockKind`, `ScreenBlockPatch`, `ScreenSectionPatch`, `ScreenInsertTarget`, `ScreenBlockLocation`, and `ScreenBindingReconcileResult` | `<=180` |
| `screenDocumentFactories.ts` | the sole node-ID allocator, `screenBlockLabels`, `createScreenSection`, `createScreenBlock`, and the private read-binding factory using `buildScreenFieldBindingId` | `<=420` |
| `screenDocumentTree.ts` | recursive immutable traversal/read helpers: `visitBlocks`, `visitDocumentBlocks`, `findScreenBlockLocation`, `collectScreenBlockIds`, `collectScreenDocumentBlocks`, `findScreenSectionById`, `findScreenBlockById`, and `getFirstScreenBlockId` | `<=320` |
| `screenDocumentMutations.ts` | insert-list resolution, index clamp/same-list/cycle guards, section/block add-update-rename-move-remove/duplicate operations, and the single internal clone-with-ID-map primitive | `<=700` |
| `screenDocumentBindingOps.ts` | `duplicateScreenBlockWithBindings`, `removeScreenBindingsForBlock`, `removeScreenBindingsForBlockTree`, and `reconcileScreenBindings`; consumes the mutation owner's clone result and never mirrors traversal or ID generation | `<=260` |
| `screenDocumentOps.ts` | explicit compatibility re-exports only | `<=100` |

The exact runtime facade is `screenBlockLabels`, `createScreenSection`,
`createScreenBlock`, `findScreenBlockLocation`, `addScreenBlockAt`,
`moveScreenBlockTo`, `addScreenBlock`, `updateScreenBlock`, `updateScreenSection`,
`addScreenSection`, `renameScreenSection`, `moveScreenSection`,
`removeScreenSection`, `appendScreenBlockToSection`, `removeScreenBlock`,
`collectScreenBlockIds`, `collectScreenDocumentBlocks`, `findScreenSectionById`,
`findScreenBlockById`, `getFirstScreenBlockId`, `duplicateScreenBlock`,
`duplicateScreenBlockWithBindings`, `moveScreenBlock`,
`removeScreenBindingsForBlock`, `removeScreenBindingsForBlockTree`, and
`reconcileScreenBindings`. The exact type facade is the six contracts in the first
table row. A facade regression compares this manifest and runtime reference identity
against each owner.

The import graph is one-way:

```text
customScreenContracts -> screenDocumentContracts
customScreenContracts + customScreenNormalizationPrimitives
  + screenDocumentContracts -> screenDocumentFactories
customScreenContracts + screenDocumentContracts -> screenDocumentTree
screenDocumentContracts + screenDocumentFactories + screenDocumentTree
  -> screenDocumentMutations
screenDocumentContracts + screenDocumentTree + screenDocumentMutations
  -> screenDocumentBindingOps
all public owners -> explicit screenDocumentOps facade
```

The new internal owners import schema types/constants/builders from their actual
`customScreenContracts` / `customScreenNormalizationPrimitives` owners rather than
creating a facade back-edge; external consumers keep both stable facades. Factories
remain the only producer of fresh block/section IDs and factory bindings;
BindingOps is the sole duplicate-binding producer, and both delegate binding identity
to `buildScreenFieldBindingId`. Mutations may
consume the internal node-ID/clone primitive but may not import the facade. Tree helpers
never import mutations or binding operations. Binding operations reuse tree traversal
and the mutation clone/ID map; they do not reconstruct either. Preserve fail-soft
unknown insert targets, first-section fallback, clamped indices, cycle prevention,
same-sibling downward index correction, referential no-ops, the last-section rule,
recursive slot/children ordering, block identity on move, fresh identity on duplicate,
binding remapping, source ordering, idempotent orphan GC, and every existing return
shape.

`tests/vitest/customScreens/screenDocumentOps.test.ts` preserves its 11 existing tests
and adds one separate facade manifest/reference-identity regression, for 12/12. The new
test is named
`screenDocumentOps facade preserves the exact public manifest and owner reference identity`.
It imports every focused owner plus the facade, rejects `export *`, compares the exact
26-runtime/six-type manifest, and proves every runtime value is the owning export by
reference rather than a wrapper or clone. The unchanged insertion and section suites
remain 19/19 and 12/12; the three-file document-operations gate is therefore 43/43.

## Completed Assistant executor Bun-test split (historical plan)

The production executor remains read-only. The historical touched 6,577-line Bun suite
was split into five focused support modules plus 12 independently runnable suites. The exact 73
test names are preserved with no additions, removals, renames, or assertion weakening;
their JSON-serialized sorted pre-split name multiset has SHA-256
`4502969fecf5a82f5da3b1b1e648fa435d6b79a4dc070cf73e853eb9d31ef48c` at both
baseline `e5f15a567` and the current repaired tree.

Support ownership is exact:

| Support owner | Sole responsibility | Post-format budget |
|---|---|---:|
| `tests/unit/assistant/support/actionExecutorFixtures.ts` | pure page/custom-screen/plan builders, projection/read helpers, fixed timestamps, and site-kit inputs; no mutable resource registry | `<=250` |
| `tests/unit/assistant/support/actionExecutorTestState.ts` | typed in-memory records/maps and a fresh per-test state factory; no production calls or shared singleton state | `<=350` |
| `tests/unit/assistant/support/actionExecutorContentDeps.ts` | dependency implementations over one supplied state for settings, content types, Custom Screens, listings/templates, pages/detail pages, and widgets | `<=750` |
| `tests/unit/assistant/support/actionExecutorEngagementDeps.ts` | dependency implementations over one supplied state for forms/actions, entries, menus/items, SEO, media, and site-kit | `<=750` |
| `tests/unit/assistant/support/actionExecutorTestDeps.ts` | composes one fresh state plus content/engagement and audit dependencies into the exact executor dependency type; exports only the test-deps factory/result type | `<=150` |

The support import direction is
`{actionExecutorFixtures, actionExecutorTestState} ->
{actionExecutorContentDeps, actionExecutorEngagementDeps} ->
actionExecutorTestDeps`. Fixtures and State are independent base owners. The two
dependency modules are siblings and never import each other; suites import the final
factory and only the specific pure fixtures they exercise. No suite imports another
suite, and no mutable state survives one test.

| Bun suite | Exact pre-split test-name positions | Count | Post-format budget |
|---|---:|---:|---:|
| retained `actionExecutorService.test.ts` | current `:1208-1581`, positions 1-6 | 6 | `<=450` |
| `actionExecutorCustomScreens.test.ts` | current `:1582-2278`, positions 7-14 | 8 | `<=750` |
| `actionExecutorPages.test.ts` | current `:2279-2714`, positions 15-20 | 6 | `<=500` |
| `actionExecutorListingsAndWidgets.test.ts` | current `:2715-3284`, positions 21-27 | 7 | `<=650` |
| `actionExecutorForms.test.ts` | current `:3285-3514`, positions 28-31 | 4 | `<=300` |
| `actionExecutorMenusAndSeo.test.ts` | current `:3515-4098`, positions 32-38 | 7 | `<=650` |
| `actionExecutorContentUpdates.test.ts` | current `:4099-4561`, positions 39-43 | 5 | `<=550` |
| `actionExecutorAutomationBlueprints.test.ts` | current `:4562-4721`, positions 44-46 | 3 | `<=250` |
| `actionExecutorIdempotencyAndSiteKit.test.ts` | current `:4722-4984`, positions 47-54 | 8 | `<=350` |
| `actionExecutorCatalogBlueprints.test.ts` | current `:4985-5335`, positions 55-60 | 6 | `<=450` |
| `actionExecutorSupportingPageLinks.test.ts` | current `:5336-5974`, positions 61-68 | 8 | `<=750` |
| `actionExecutorDetailPages.test.ts` | current `:5975-6577`, positions 69-73 | 5 | `<=700` |

Positions refer to the current source-order test-name list and are stable split
authority, not permission to cut arbitrary line ranges. Move each complete declaration
with its setup and assertions. The already-approved Custom Screen fixed-kind fixture is
position 14 and therefore lands in `actionExecutorCustomScreens.test.ts`; all other
assertion bodies remain behaviorally read-only.

## Completed split implementation pseudocode

```ts
// customScreenSchemas.ts — stable public seam, no implementation and no export *
export { /* exact existing runtime names */ } from "./customScreenContracts";
export type { /* exact existing public types */ } from "./customScreenContracts";
export { /* explicit public normalizers/schemas only */ } from "./ownedModule";

// bindingResolver.ts — type-only cycle break
import type {
  CustomScreenBinding,
  CustomScreenListColumn,
  CustomScreenListRowTemplate,
  ScreenFieldBinding,
} from "./customScreenContracts";

// legacy stored binding recovery — domain-invalid item only
for (const item of storedBindings) {
  try {
    append(normalizeStoredBinding(item));
  } catch (error) {
    if (!isCustomScreenDefinitionInvalidError(error)) throw error;
  }
}
assertUniqueIdsOutsideItemCatch();

// V4 top-level read — list and editor recovery are independent
const listView = normalizeListViewForRead(raw.listView, context);
let editorView;
try {
  editorView = normalizeEditorViewForRead(raw.editorView, context);
} catch (error) {
  if (!isCustomScreenDefinitionInvalidError(error)) throw error;
  editorView = createEmptyCustomScreenEditorViewV4();
}
return { schemaVersion: 4, listView, editorView };

// tests — move complete test declarations, never copy partial setup ranges
export const buildV4WithBlocks = /* immutable shared builder */;
// each .test.ts imports only its contract and is runnable in isolation

// route suites — one isolated harness instance per file
const harness = createCustomScreenRouteHarness();
afterEach(async () => harness.cleanup());
const screenId = harness.trackScreenId(await createOwnedScreen());
// cleanup uses only exact UUID equality / exact composite override equality

// screenDocumentOps.ts — explicit compatibility facade, no export *
export { createScreenBlock, createScreenSection } from "./screenDocumentFactories";
export { findScreenBlockById, collectScreenDocumentBlocks } from "./screenDocumentTree";
export { addScreenBlockAt, moveScreenBlockTo } from "./screenDocumentMutations";
export { duplicateScreenBlockWithBindings } from "./screenDocumentBindingOps";
export type { ScreenBlockKind, ScreenInsertTarget } from "./screenDocumentContracts";

// binding-aware duplicate consumes the sole structural clone+ID map
const { document: nextDocument, idMap } = duplicateScreenBlockWithIdMap(document, blockId);
const duplicatedBindings = bindings.flatMap((binding) => {
  const nextBlockId = idMap.get(binding.blockId);
  return nextBlockId
    ? [{ ...binding, id: buildScreenFieldBindingId(nextBlockId, binding.propPath),
         blockId: nextBlockId }]
    : [];
});

// Assistant suites — one fresh dependency graph per test
const { deps, state } = createActionExecutorTestDeps();
const result = await executeAssistantActionPlan(input, deps);
// Assert only through this test's state/result; no cross-file singleton or suite order.

// mandatory pre-closure gate
for (const path of everyAddedOrModifiedProductionModuleAndTestFile) {
  const lines = countCompletePhysicalLines(await readStableUtf8File(path));
  if (lines > 1000) throw new Error(`${path}: ${lines} physical lines`);
}
```

The line-count gate includes comments and blank lines, handles a final line without a
newline, and covers every added or modified human-authored production module and test
file in the R01 owner set. Generated artifacts are not created by this split. A result
above 1,000 is a failed gate, never a LOW finding or TASK-9999 candidate.

## Current corrective contract: strict identities and compatibility writes

This correction is part of R01 rather than a new task surface. It closes the difference
between the route schema, direct service normalization, legacy stored reads, Assistant
plan normalization, and authoring-time binding factories.

### Structural and binding boundaries

- One schema-domain `SCREEN_PATH_MAX = 160` owns every V4 structural section ID,
  recursive block ID, binding `blockId`, binding `propPath`, binding `field`, and the
  existing fixed-kind path fields. A fresh write accepts only an already canonical,
  non-empty `^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$` string whose dot-separated segments exclude
  `__proto__`, `prototype`, and `constructor`; it does not trim or truncate submitted
  write values. Ajv and direct normalization reject whitespace drift, unsafe segments,
  or length 161 with their existing 400/domain error ownership.
- One `SCREEN_BINDING_ID_MAX = 120` plus
  `^[a-z0-9]+(?:-[a-z0-9]+)*$` owns explicit and generated binding IDs. A present ID on
  either fresh-write entry point must already be canonical and at most 120 characters;
  it is returned unchanged. An absent ID is generated by the shared builder below and
  always ends in `-<13-character framed-tuple hash>`, including for short readable
  prefixes. Duplicate resulting binding IDs still fail closed through the existing
  uniqueness check.
- Stored read may trim otherwise safe legacy paths and deterministically shorten an
  overlong structural/binding path. It keeps the largest prefix that fits together with
  `-<13-character base36 hash>`, where the hash is the existing stable unsigned 64-bit
  FNV-1a-style accumulator over the full normalized pre-shortening value. The same raw
  block ID therefore yields the same repaired document ID and binding reference, while
  two long values with a shared prefix retain distinct hash suffixes. Input storage is
  not mutated. The returned editor and row-template documents are write-valid, retain
  their exact binding-to-block references, and are idempotent under both another stored
  read and a strict write.
- This repair is identity-preserving, not a general fail-open adapter. Invalid grammar,
  unsafe path segments, duplicate canonical IDs, unsupported source/mode values, and
  unrepairable document shapes retain their existing fail-closed/fallback behavior.

### Exact three-mode binding policy

`normalizeScreenFieldBinding` has one explicit internal mode union:

```ts
type ScreenNormalizeMode = "write" | "stored-read";
type ScreenBindingNormalizeMode = ScreenNormalizeMode | "compatibility-write";
```

| Mode | ID-key contract | `source` / `mode` contract | Callers |
|---|---|---|---|
| `write` | `blockId` only; `widgetId` is an unknown key; all paths and any explicit ID are already canonical and bounded | `source` is required and exactly `"entry"`; absent `mode` becomes `"readwrite"`, otherwise it must be one of the domain modes | V4 editor and list-row writes, including service POST/PATCH |
| `compatibility-write` | exactly one own key of `blockId` or legacy `widgetId`; both, neither, or an own undefined alias reject; output always uses `blockId` | `source` may be absent but, when present, is exactly `"entry"`; `mode` may be absent but every present value must be an exact domain mode | exported `normalizeScreenFieldBindings`, retained for public Assistant action-plan/catalog construction |
| `stored-read` | reads historical `blockId` or `widgetId`; a non-nullish `blockId` wins, while an absent/nullish `blockId` falls back to `widgetId`; a malformed non-nullish `blockId` does not fall back; output drops `widgetId`, emits only canonical `blockId`, and applies deterministic safe-path repair | preserves the legacy fail-soft coercion: absent, null, blank/whitespace, or non-string source/mode values receive `"entry"`/`"readwrite"`; a non-empty string is trimmed and must resolve to exact `"entry"` or a domain mode, otherwise it fails | editor and list-row stored-read adapters only |

The exact-one and strict present source/mode rules intentionally belong to new `write`
and `compatibility-write` payloads. They prevent an ambiguous Assistant payload while
retaining the consciously documented fail-soft stored-read coercion for historical
rows. That read adapter never widens the strict V4 route/service write shape.
`tests/vitest/assistant/action-plan-schema.test.ts` and
`tests/vitest/assistant/catalogBlueprintEngine.test.ts` prove this public compatibility
as read-only dependency gates: neither file may be edited or re-baselined by R01.

### Domain-owned binding-ID builder and ownership handoff

`customScreenNormalizationPrimitives.ts` is the sole implementation owner of the pure
helper, and `customScreenSchemas.ts` explicitly re-exports it through the stable public
surface. Every generated
ID consists of a bounded readable slug prefix derived from `blockId + "-" + propPath`,
then `-`, then the exact 13-character base36 hash of the framed tuple
`JSON.stringify([blockId, propPath])`. The suffix is present for short and long tuples,
not only overflow. The hash seed is never the ambiguous visible concatenation, so
`(a-b,c)` cannot collide with `(a,b-c)` and case differences remain represented in the
hash seed even though the slug prefix is lowercase:

```ts
export function buildScreenFieldBindingId(blockId: string, propPath: string): string {
  const slugSeed = `${blockId}-${propPath}`;
  const hashSeed = JSON.stringify([blockId, propPath]);
  const hash = stableScreenPathHash(hashSeed); // exact 13-character base36 value
  const maxPrefixLength = SCREEN_BINDING_ID_MAX - hash.length - 1;
  const readablePrefix = slugify(slugSeed) || "binding";
  const boundedPrefix =
    readablePrefix.slice(0, maxPrefixLength).replace(/-+$/g, "") || "binding";
  return `${boundedPrefix}-${hash}`; // canonical grammar, max 120
}
```

The schema normalizer uses it when `binding.id` is absent. As the sole corrective
exception to the older ops exclusion, `screenDocumentOps.ts` imports it for every
factory/duplication path that creates a binding ID; its existing Vitest suite remains
the owning regression gate. TASK-540-02-L01, not R01, owns the Inspector change that
imports the same helper for `createScreenFieldBinding`. No `ScreenFieldBinding` producer
keeps a local slug or binding-ID mirror. The pre-V4 Assistant `CustomScreenBinding`
composer remains outside this helper's output contract, but R01 now makes its separate
stable-ID boundary truthful: `id` is required in the TypeScript contribution type and
absent, null, or blank runtime values fail with `assistant_blueprint_binding_invalid`.
There is no tuple fallback. Existing catalog callers already provide explicit IDs and
remain byte-identical; duplicate explicit IDs retain the existing equality/dedupe and
conflict rejection behavior.

```ts
export type BlueprintBindingContribution = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode?: CustomScreenBindingMode | null;
};

const normalizeStableId = (value: unknown) => {
  const explicit = normalizeText(value) ?? fail();
  const id = slugify(explicit);
  if (!id || !stableKeyPattern.test(id)) fail();
  return id;
};

const id = normalizeStableId(binding.id); // no generated fallback
```

### Read/patch data flow and exact regression shape

1. Stored editor and row-template documents normalize their sections/blocks first.
   Bindings normalize through `stored-read`, so each overlong `blockId` reference is
   shortened from the same full value as its target block. Both scopes then run the
   existing live-block membership and unsupported-Button binding filters.
2. Legacy V1/V2/V3 editor migration first maps its historical blocks and bindings to a
   V4 editor, then passes that mapped editor exactly once through the same V4
   stored-read normalizer. That one pass applies the same unconditional live-block
   membership and unsupported-Button-href filters as a native V4 read, so impossible
   block-orphan bindings are removed even when the document has no live blocks. V1 and
   V2 converge through the V3 migrator; list views keep their existing separate
   normalization and are not remigrated. The pass preserves block data and valid sibling
   bindings while closing the old max-160/max-120 bypass.
3. A metadata-only registered PATCH loads the stored definition through
   `normalizeCustomScreenDefinitionForRead`, then passes that repaired base definition
   through the strict write normalizer before persistence. The metadata update and the
   repaired definition land atomically; Tabs slot content, sibling blocks, binding
   references, and unrelated data are not dropped.
4. `custom-screen-binding-contract.test.ts` pins 160/161 structural and binding-path boundaries,
   120/121 explicit/generated binding-ID boundaries, all three modes, exact-one legacy
   alias handling for compatibility writes, non-nullish `blockId` precedence plus
   nullish alias fallback on stored reads, scoped rejection of one malformed stored
   binding without document or valid-sibling loss, duplicate stored IDs still reaching
   the outer fail-closed empty-editor fallback, source/mode coercion and rejection,
   the mandatory hash suffix on every generated ID, and framed-tuple separator/case
   separation for both short and long tuples. The short separator and case pairs run
   through the full write normalizer and the id-less legacy migration path, returning
   schema-valid, distinct, bounded, idempotent IDs without collapsing the editor; valid
   explicit IDs stay unchanged. The suite also proves generated-ID determinism/
   uniqueness, editor+row reference equality, and unchanged input bytes plus
   read→read/read→write idempotence.
   The legacy migration cases retained in `custom-screen-schemas.test.ts` separately
   prove V1/V2/V3 editor repair, exact binding references, primary/sibling data
   preservation, and per-item malformed-binding recovery. The row-template malformed
   binding case stays in the binding-contract partition.
5. `screenDocumentOps.test.ts` covers builder-backed factory and duplication output.
   `customScreensDefinitionIntegrityRoutes.test.ts` seeds an owned malformed legacy row
   and proves a metadata-only PATCH persists the local Tabs repair, distinct bounded
   structural IDs, the exact repaired sibling binding reference, and no document loss.
6. `blueprint-binding-composer.test.ts` pins that missing, null, and blank runtime IDs
   fail closed without a tuple fallback and that two distinct explicit IDs normalizing
   to the same ID retain exact duplicate-conflict rejection. Existing missing-field and
   secret-field fixtures receive explicit IDs so they keep proving their original error
   precedence.
   The catalog caller and the two action-plan/catalog Vitest suites remain unchanged,
   read-only compatibility consumers.

Every failure in these strict/compatibility-write paths remains
`custom_screen_definition_invalid` at the domain boundary (or the existing Ajv
`validation_error` at the registered route boundary). No submitted identifier or value
is added to error details, and this correction adds no route, public write, migration,
or persistence fallback.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named files, symbols, and regression suites in this contract rather than mutable line
numbers. Every `customScreenSchemas.ts` offset below addresses the historical 3,539-line
monolith, not the 121-line facade now at that path, so those offsets must not be resolved
against the current file; the current owners follow this snapshot list.

- Per-kind allowlist and normalizer:
  `customScreenSchemas.ts:399-415,608-669`.
- Unsafe prefix-only image policy: `:592-605`.
- Block/slot normalization: `:703-769`.
- Read-only legacy repair: `:841-910`.
- Empty-document binding exceptions:
  `:1379-1413,1587-1606,1647-1651`.
- Generic block-data JSON schema: `:2413-2442`.
- Shared pure URL owners:
  `pageAuthoringSanitizers.ts:238-266`.
- Existing route-local `CustomScreenDefinitionError` and mapper:
  `customScreenRoutes.ts:21-64`; now the imported domain carrier at `:20`, its re-export
  at `:22`, and `mapCustomScreenError` at `:38`.
- Create/update warning flow:
  `customScreenService.ts:24-57,190-204,258-313`; now `buildBindingWarnings` at `:47-56`,
  the create sink at `:196`, the update read base at `:252`, and the update sink at
  `:265`.
- Existing Ajv error ownership: `schemaValidator.ts:15-50`.

Current owners after the completed split:

- Per-kind allowlist descriptor: `customScreenContracts.ts:212-232`; per-kind data
  normalizer: `screenDocumentDataNormalizer.ts:299`; Ajv per-kind data schemas:
  `customScreenJsonSchemas.ts:317-418`.
- Screen URL policy: `screenDocumentDataNormalizer.ts:158-194`.
- Read-only legacy repair: `screenDocumentReadNormalizer.ts:31-47,158-350`.
- Binding GC: write-path sink prune and strict throw at
  `customScreenEditorViewNormalizer.ts:92-107` and
  `customScreenListViewNormalizer.ts:251-260`; stored-read prune with unsupported-Button
  `href` pruning at `customScreenEditorViewNormalizer.ts:157-162` and
  `customScreenListViewNormalizer.ts:288-295`.

Re-grep these symbols before editing; line numbers may shift.

## Security Contract

- **Visibility:** existing internal `/admin/api/custom-screens*` routes only; the narrow
  route edit changes only the shared definition-error import/re-export and mapper.
- **Auth/RBAC:** Custom Screen Admin routes remain session-cookie-only with existing
  `content:read` / `content:write` permission checks; no API-key authentication path is
  present or added.
- **CSRF/rate limit:** session writes retain shared CSRF and `admin_write`; internal
  reads retain the existing admin-read bucket. No limiter is added, moved, or skipped.
- **Validation:** create/update envelopes and every nested fixed-kind/slot object reject
  unknown keys before persistence through the existing Ajv `validation_error` 400.
  Semantic unsafe-URL and duplicate-tab/tab-slot failures use
  `custom_screen_definition_invalid` 400. Mapper details contain at most eight
  implementation-generated paths of at most 240 characters each, never submitted
  values or rejected unknown-key names.
- **Anti-abuse/secrets:** this leaf adds no public write, so nonce/captcha are not
  applicable. It adds no token, secret, browser storage, logging, or debug payload.

## Historical fixture-repair pseudocode

Keep the existing
`test("executeAssistantActionPlan patches custom screen block data", async () => ...)`
and its existing `createNativeTestCustomScreenDefinition(blocks, bindings?)` helper.
Change only that test's native Screen fixture, the exact plan summary/action title and
matching action coordinates shown below, and the final preservation assertions. Every
other existing plan/action envelope field and value remains byte-identical:

```ts
const screen = await deps.createCustomScreen({
  // Keep the existing name/content-type/status/sidebar fields unchanged.
  definition: createNativeTestCustomScreenDefinition([
    {
      id: "heading-1",
      type: "heading",
      data: { text: "Old headline", label: "Keep label" },
    },
    {
      id: "text-1",
      type: "text",
      data: { content: "Keep sibling" },
    },
  ]),
});

const plan: AssistantActionPlan = {
  // Keep every omitted existing plan/action envelope field byte-identical.
  summary: "Patch screen heading text.",
  actions: [
    {
      title: "Patch heading",
      type: "custom-screen.block.patch",
      input: {
        id: screen.id,
        name: "Projects Screen",
        expectedStatus: "draft",
        blockId: "heading-1",
        expectedBlockType: "heading",
        dataPath: ["text"],
        value: "New headline",
      },
    },
  ],
};

const preview = await dryRunAssistantActionPlan({ plan }, deps);
expect(preview.changes[0]?.operation).toBe("update");

await executeAssistantActionPlan(
  {
    plan,
    actorId: "user-1",
    idempotencyKey: "assistant-custom-screen-block-patch-1",
  },
  deps
);

expect(deps.__state.customScreens[0]?.blocks[0]?.data.text).toBe("New headline");
expect(deps.__state.customScreens[0]?.blocks[0]?.data.label).toBe("Keep label");
expect(deps.__state.customScreens[0]?.blocks[1]?.data.content).toBe("Keep sibling");
```

The data flow remains preview → execute → inspect the persisted in-memory projection.
Do not add a catch, compatibility fallback, normalizer exception, or production change;
an invalid fixture must fail rather than be silently repaired.

## Implementation Pseudocode

```ts
type ScreenNormalizeMode = "write" | "stored-read";
type ScreenBindingNormalizeMode = ScreenNormalizeMode | "compatibility-write";
type ScreenFieldPathToken =
  | "definition"
  | "editorView"
  | "listView"
  | "rowTemplate"
  | "document"
  | "sections"
  | "blocks"
  | "children"
  | "slots"
  | "data"
  | "tabs"
  | "id"
  | "action"
  | "href"
  | "src";
type ScreenFieldPathSegment = ScreenFieldPathToken | number;

export const CUSTOM_SCREEN_ERROR_FIELDS_MAX = 8;
export const CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX = 240;

type GeneratedScreenFieldPath = string & { readonly __generated: unique symbol };

// Call only with fixed contract tokens and traversal indexes. Never pass a submitted
// value, block/slot ID, rejected key name, or URL segment to this helper.
function generatedFieldPath(
  ...segments: ReadonlyArray<ScreenFieldPathToken | number>
): GeneratedScreenFieldPath {
  const path = segments.join(".").slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX);
  return path as GeneratedScreenFieldPath;
}

function boundGeneratedFields(fields: readonly GeneratedScreenFieldPath[]): string[] {
  return [...new Set(fields)]
    .slice(0, CUSTOM_SCREEN_ERROR_FIELDS_MAX)
    .map((field) => field.slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX));
}

export class CustomScreenDefinitionError extends Error {
  readonly code = "custom_screen_definition_invalid" as const;
  readonly fields: string[];

  constructor(fields: readonly GeneratedScreenFieldPath[] = []) {
    super("custom_screen_definition_invalid");
    this.fields = boundGeneratedFields(fields);
  }
}

function invalid(...fields: readonly GeneratedScreenFieldPath[]): never {
  throw new CustomScreenDefinitionError(fields);
}

export type ScreenTabItem = Readonly<{ id: string; label: string }>;
export const SCREEN_TAB_ID = /^[a-z][a-z0-9_-]{0,63}$/;
export const SCREEN_TABS_MIN = 1;
export const SCREEN_TABS_MAX = 24;
export const SCREEN_TAB_LABEL_MAX = 120;
const SCREEN_MEDIA_ASSET_UUID: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sole Bun-free owner of the Screen media-asset identity shape. Renderer,
// override-contract, service, and admin-client consumers import this predicate.
export function isScreenMediaAssetUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_MEDIA_ASSET_UUID.test(value);
}

export function sanitizeScreenAuthoringUrl(
  value: unknown,
  kind: "link" | "media"
): string | null {
  if (typeof value !== "string") return null;
  if (/[\u0000-\u001F\u007F]/.test(value) || value.includes("\\")) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return kind === "link"
    ? sanitizeAuthoringLinkHref(trimmed)
    : sanitizeAuthoringMediaUrl(trimmed);
}

// Retained delegating compatibility export after the Inspector (02) and renderer (03)
// migrated to sanitizeScreenAuthoringUrl directly; no production consumer remains.
export const normalizeScreenImageSrc = (value: unknown): string =>
  sanitizeScreenAuthoringUrl(value, "media") ?? "";

// customScreenRoutes.ts imports/re-exports this exact domain class, deletes its local
// duplicate, and keeps this exact public mapping:
// new ApiError(
//   "custom_screen_definition_invalid",
//   "Custom screen definition is invalid",
//   400,
//   fields.length > 0 ? { fields } : undefined
// );
// Ajv ApiError instances bypass this mapper unchanged.

function normalizeScreenUrl(
  value: unknown,
  kind: "link" | "media",
  mode: ScreenNormalizeMode,
  path: GeneratedScreenFieldPath
): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === null || typeof value !== "string") {
    if (mode === "write") invalid(path);
    return undefined; // stored-read compatibility may fail soft on malformed legacy values
  }
  const safe = sanitizeScreenAuthoringUrl(value, kind);
  if (safe !== null) return safe;
  if (mode === "write") invalid(path); // custom_screen_definition_invalid
  return undefined; // stored-read compatibility only
}

function normalizeTabsForWrite(
  raw: unknown,
  blockPath: readonly ScreenFieldPathSegment[]
): ScreenTabItem[] {
  if (
    !Array.isArray(raw) ||
    raw.length < SCREEN_TABS_MIN ||
    raw.length > SCREEN_TABS_MAX
  ) invalid(generatedFieldPath(...blockPath, "data", "tabs"));
  const seen = new Set<string>();
  return raw.map((item, index) => {
    assertExactRecord(item, ["id", "label"]);
    const id = requireTrimmedString(item.id, { max: 64 });
    const label = requireTrimmedString(item.label, { max: SCREEN_TAB_LABEL_MAX });
    if (!SCREEN_TAB_ID.test(id) || seen.has(id)) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index, "id"));
    }
    seen.add(id);
    return { id, label };
  });
}

function assertTabSlots(
  block: ScreenBlockV1,
  blockPath: readonly ScreenFieldPathSegment[]
): void {
  if (block.type !== "tabs") return;
  const tabIds = block.data.tabs.map((tab) => tab.id);
  const slotIds = Object.keys(block.slots ?? {});
  if (!sameSet(tabIds, slotIds)) {
    invalid(
      generatedFieldPath(...blockPath, "data", "tabs"),
      generatedFieldPath(...blockPath, "slots")
    );
  }
}

function normalizeButtonData(
  data,
  mode: ScreenNormalizeMode,
  path: readonly ScreenFieldPathSegment[]
) {
  if (mode === "write") {
    assertKnownKeys(data, ["label", "action", "variant", "href", "field"]);
    if (data.action !== undefined && data.action !== "link") {
      invalid(generatedFieldPath(...path, "data", "action"));
    }
  }
  const href = normalizeScreenUrl(
    data.href,
    "link",
    mode,
    generatedFieldPath(...path, "data", "href")
  );
  return compact({
    ...normalizedKnownFields,
    ...(data.action !== undefined ? { action: "link" } : {}),
    href,
  });
}

function normalizeImageData(
  data,
  mode: ScreenNormalizeMode,
  path: readonly ScreenFieldPathSegment[]
) {
  assertKnownKeys(data, fixedImageKeys);
  return compact({
    ...normalizedKnownImageFields,
    src: normalizeScreenUrl(
      data.src,
      "media",
      mode,
      generatedFieldPath(...path, "data", "src")
    ),
  });
}

// The exported legacy alias map is runtime-frozen and consulted by own-property lookup only, so an
// inherited `Object.prototype` member name can never resolve to a function.
export const READ_REPAIR_BLOCK_TYPE = Object.freeze({ actions: "button" } as const) satisfies Readonly<
  Record<string, string>
>;

const isReadRepairBlockType = (value: string): value is keyof typeof READ_REPAIR_BLOCK_TYPE =>
  Object.prototype.hasOwnProperty.call(READ_REPAIR_BLOCK_TYPE, value);

// Inside repairLegacyScreenRecordForRead, the alias is resolved through that predicate.
// A stored `constructor`/`toString`/`hasOwnProperty`/`valueOf` type is NOT an alias: it
// stays unrepaired and falls through to the neutral legacy placeholder arm.
const repairedType =
  typeof node.type === "string" && isReadRepairBlockType(node.type)
    ? READ_REPAIR_BLOCK_TYPE[node.type]
    : undefined;

function repairDocumentAndBindingsForRead(rawDocument, rawBindings) {
  // One repair context follows the exact recursive objects that survive Tabs repair.
  // Mark any button/repaired-actions node with an own, present action !== exact "link"
  // before action/type coercion. Do not flatten the unrepaired raw tree. The repair pass
  // marks provenance and repairs type/Tabs identity only; Button action/href coercion
  // belongs solely to `normalizeScreenBlockData` and is never duplicated here.
  const context = { unsupportedButtonNodes: new WeakSet<object>() };
  const repaired = repairLegacyScreenRecordForRead(rawDocument, context);
  const document = normalizeRepairedDocumentForRead(repaired);

  // Traverse the repaired and normalized trees in the same structural order. Removed
  // orphan slots are absent from both; renamed/reordered slots carry their original
  // repaired node identity. Pairing therefore maps provenance to the final generated
  // or authored normalized ID without transferring it to a sibling.
  const repairedBlocks = collectRepairedBlocksInReadOrder(repaired);
  const normalizedBlocks = collectNormalizedBlocksInReadOrder(document);
  assertSameLength(repairedBlocks, normalizedBlocks);
  const unsupportedButtonIds = new Set(
    repairedBlocks.flatMap((node, index) =>
      context.unsupportedButtonNodes.has(node) ? [normalizedBlocks[index].id] : []
    )
  );

  const bindings = normalizeBindingsForRead(rawBindings).filter(
    (binding) =>
      !(unsupportedButtonIds.has(binding.blockId) && binding.propPath === "href")
  );

  // The adapter returns an in-memory read model only. It does not persist a disabled
  // bit/action or write the pruned binding back by itself.
  return { document, bindings };
}

function pruneBindings(blockIds: Set<string>, bindings, sink) {
  for (const binding of bindings) {
    if (blockIds.has(binding.blockId)) kept.push(binding);
    else sink?.removedBlockOrphans.push(binding.field);
  }
  return kept;
}

async function createCustomScreen(input: CustomScreenCreateInput) {
  const sink: ScreenBindingWarningSink = {
    removedFieldOrphans: [],
    removedBlockOrphans: [],
  };
  const definition = normalizeCustomScreenDefinitionForWrite(rawDefinition, context, sink);
  const row = await insertNormalizedDefinition(definition);
  const warnings = buildBindingWarnings(sink);
  return {
    ...mapRow(row, context),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
```

The ASCII-control check is performed against the original string, before `trim()` and
before either imported Page helper. It is not reduced to whitespace or prefix checks:
all code points `U+0000..U+001F` and `U+007F` fail closed wherever they occur. This leaf
does not change the Page-owned helper because that policy has consumers outside Custom
Screens.

Replace every `blockIds.size === 0 || blockIds.has(...)` and every
`blockIds.size > 0 && orphan` gate with unconditional membership semantics.
Apply the same policy to editor view, list-row template, strict write, and stored
read. Keep the existing field-orphan policy unchanged (sink-backed write/read cleanup
versus the existing no-sink failure); this change only removes the empty-live-set
exception for impossible block IDs. `createCustomScreen` and `updateCustomScreen` each
allocate one sink before normalization, persist only the normalized definition, and
attach de-duplicated warnings to their successful response after persistence.
Stored-read normalization supplies its own discard sink and emits no warning on
GET/list responses; read repair itself never writes storage.

### Exact fixed-kind data contract

Define one `fixedScreenBlockDataSchemas` map for the eight kinds below. Every data
object has `type:"object"` and `additionalProperties:false`; properties not named in
its row are rejected. Except for `tabs.tabs`, fixed-kind data properties remain
optional for stored-V4 compatibility. In particular, factory-seeded `data.label` is
not retroactively required: absent means the renderer's existing fallback, while an
explicit `""` (or whitespace string) retains the established clearable-label behavior.
When present, `data.label` is a string with no new min/max; it is not defaulted or
trimmed by this leaf. The existing outer block/section label bounds remain unchanged and
must not be confused with clearable `data.label`.

| Kind | Exact allowed properties and write constraints | Required |
|---|---|---|
| `heading` | `label`: common clearable label; `text`: string, empty allowed; `level`: integer `1..3`; `align`: `"left" \| "center" \| "right"`; `field`: non-empty path string, max 160, `^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$` | none |
| `text` | `content`: string, empty allowed; `tone`: `"default" \| "muted"`; `label`: common clearable label | none |
| `stat` | `label`: common clearable label; `format`: `"number" \| "percent" \| "money"`; `trend`: `"auto" \| "up" \| "down" \| "flat"`; `deltaField`: empty or path string, max 160; `field`: non-empty path string, max 160 | none |
| `divider` | `variant`: `"line" \| "space" \| "label"`; `label`: common clearable label | none |
| `image` | `label`: common clearable label; `fit`: `"cover" \| "contain"`; `ratio`: any string, empty allowed, no enum/coercion/default; `field`: non-empty path string, max 160; `src`: string handled semantically by the media URL profile, empty means omit | none |
| `related-list` | `label`: common clearable label; `target`: empty or path string, max 160; `displayField`: empty or path string, max 160; `variant`: `"checklist" \| "activity" \| "cards"`; `limit`: integer `1..50`; `field`: non-empty path string, max 160 | none |
| `tabs` | `label`: common clearable label; `tabs`: array `1..24`; every item is exact `{id,label}` with both required, `id` matching `^[a-z][a-z0-9_-]{0,63}$`, and `label` trimmed/non-empty/max 120 | `tabs` |
| `button` | `label`: common clearable label; `action`: enum containing only `"link"`; `variant`: `"primary" \| "secondary" \| "ghost"`; `href`: string handled semantically by the link URL profile, empty means omit; `field`: non-empty path string, max 160 | none |

For the empty-or-path fields, the schema uses
`^(?:[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)?$`; non-empty path fields use
`^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$`. Both schemas also reject the existing unsafe path
segments `__proto__`, `prototype`, and `constructor` through an exact segment-aware
`not` pattern, `(^|\\.)(?:__proto__|prototype|constructor)(?:\\.|$)`; the normalizer
reuses `normalizePath` rather than duplicating this rule. General labels, text, URL, and
ratio properties deliberately receive no new arbitrary length cap in this remediation
because the current data normalizer has none; this task must not reject previously
valid stored strings by inventing one. A tab item's label is the intentional exception:
its schema uses `minLength:1`, `maxLength:SCREEN_TAB_LABEL_MAX`, and `pattern:"\\S"`,
while the normalizer trims and rechecks non-empty/max-120. `ratio` specifically
preserves canonical `"16/9"`, legacy `"16:9"`, `""`, and unknown stored strings
byte-for-byte on both read and write. Only the Inspector writes the canonical
`screenImageRatios` values.

The write normalizer uses the same property map, enum arrays, numeric bounds, path
patterns, `SCREEN_TAB_ID`, `SCREEN_TAB_LABEL_MAX`, and Tabs min/max constants. Direct
service calls therefore cannot bypass the route contract. Stored-read mode may apply
only the explicitly described legacy repairs/coercions; valid input is unchanged. In
particular, a present `href` or `src` must be a string on write: `null`, arrays, objects,
numbers, and booleans throw `CustomScreenDefinitionError` for direct service calls just
as Ajv rejects them at the route. Only stored-read mode may fail soft by omitting such a
malformed legacy URL value. `undefined` and the explicit empty string remain the only
write-time omission forms.

The Bun-free `screenMediaIdentity.ts` owner defines `isScreenMediaAssetUuid` from one
private UUID pattern, and the stable facade explicitly re-exports it. Tests pin valid
mixed-case UUIDs and reject malformed, URL-shaped, blank, and non-string values. Keep
the predicate's existing prefix exactly as follows so deferred-LOW evidence remains
anchored at `screenMediaIdentity.ts:4`; file length is no longer exclusive because the
shared selector is appended after this prefix:

```ts
const SCREEN_MEDIA_ASSET_UUID: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isScreenMediaAssetUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_MEDIA_ASSET_UUID.test(value);
}
```

TASK-540-03 imports the predicate and the direct internal selector for direct-image
binding resolution; TASK-540-04's strict override normalizer imports the predicate and
L03 imports the selector rather than mirroring the regex or selection algorithm.

Select the matching fixed schema through exact-`const` type branches inside one
recursive `$defs` graph per validation root. The shared validator owns one global Ajv
instance and lazily compiles both mutation schemas, so do **not** put the same nested
`$id` in create and update: Ajv can register the first ID and fail when the opposite
schema compiles. A single factory/constant owner builds byte-equivalent definition
shapes for create, update, and the standalone exported definition schema, while each
root owns its own local definitions and `#/$defs/...` references:

```ts
const localScreenBlockRef = { $ref: "#/$defs/customScreenV4ScreenBlock" };
const localScreenDocumentRef = { $ref: "#/$defs/customScreenV4ScreenDocument" };
const localScreenDefinitionRef = { $ref: "#/$defs/customScreenV4Definition" };

function screenBlockBranch(type: string, dataSchema: object) {
  return {
    type: "object",
    required: ["id", "type", "data"],
    properties: {
      ...existingStrictBlockStructuralProperties,
      type: { const: type },
      data: dataSchema,
      // Keep the existing recursive collection bounds.
      children: { type: "array", maxItems: 500, items: localScreenBlockRef },
      slots: {
        type: "object",
        additionalProperties: {
          type: "array",
          maxItems: 500,
          items: localScreenBlockRef,
        },
      },
    },
    additionalProperties: false,
  } as const;
}

function screenSectionSchemaUsing(blockRef: object) {
  return {
    ...existingStrictSectionShape,
    properties: {
      ...existingStrictSectionShape.properties,
      blocks: { type: "array", maxItems: 500, items: blockRef },
    },
  } as const;
}

function buildCustomScreenV4Defs() {
  return {
    customScreenV4ScreenBlock: {
      oneOf: [
        ...buildFixedKindBranches(screenBlockBranch),
        ...buildExplicitCompatibilityKindBranches(screenBlockBranch),
      ],
    },
    customScreenV4ScreenDocument: {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "sections"],
      properties: {
        schemaVersion: { const: 1 },
        sections: {
          type: "array",
          maxItems: 120,
          items: screenSectionSchemaUsing(localScreenBlockRef),
        },
      },
    },
    customScreenV4Definition: {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "listView", "editorView"],
      properties: {
        schemaVersion: { const: 4 },
        listView: listViewSchemaUsing(localScreenDocumentRef),
        editorView: editorViewSchemaUsing(localScreenDocumentRef),
      },
    },
  } as const;
}

function buildCustomScreenMutationSchema(kind: "create" | "update") {
  const $defs = buildCustomScreenV4Defs();
  return {
    type: "object",
    $defs,
    required: kind === "create" ? ["name", "contentTypeId"] : [],
    properties: {
      ...buildExistingMutationProperties(kind),
      definition: localScreenDefinitionRef,
    },
    additionalProperties: false,
  } as const;
}

function buildStandaloneCustomScreenDefinitionSchema() {
  const $defs = buildCustomScreenV4Defs();
  return { ...$defs.customScreenV4Definition, $defs } as const;
}

export const customScreenDefinitionSchema = buildStandaloneCustomScreenDefinitionSchema();
export const customScreenCreateSchema = buildCustomScreenMutationSchema("create");
export const customScreenUpdateSchema = buildCustomScreenMutationSchema("update");
```

No nested `$id` or absolute ref is introduced. `customScreenCreateSchema` and
`customScreenUpdateSchema` each carry one locally resolvable `$defs` graph built by the
same owner, so both list-row and editor documents reference an identical recursive
shape without cross-root registration.
Root section blocks, every `children` item, and every item in every named slot must reach
that same discriminated definition. Each block branch has
`additionalProperties:false` for structural keys, and each fixed-kind `data` branch has
`additionalProperties:false`. Keep a separate, explicit stored-read/legacy compatibility
arm for `field`, `field-group`, `record-header`, `columns`, `rich-text`, and
`legacy-widget`; that arm does not pretend arbitrary legacy/plugin data is a new strict
fixed-kind write contract. No generic `{type:"object"}` arm may allow a fixed kind at
any depth to bypass its schema. `normalizeScreenBlockData` uses the same kind map and
exported min/max/ID constants, so route AJV and service normalization agree on required
fields, limits, enums, and URL/action policy.

## Error and compatibility flow

- Ajv remains the route-schema owner. Unknown keys at any recursive depth, missing
  required members, wrong primitive types, invalid tab ID/label shape, structural
  array overflows, and the unsupported Button action enum return the existing
  `validation_error`, message `Invalid payload`, and status 400. They do not get
  remapped to a Custom Screen domain error.
- Semantic checks that JSON Schema cannot express here—duplicate tab IDs, tab/slot set
  mismatch, and a non-empty unsafe URL—throw `CustomScreenDefinitionError`. The route
  mapper imports this sole class, removes its duplicate, and preserves exact code
  `custom_screen_definition_invalid`, message `Custom screen definition is invalid`,
  and status 400. No second route-local carrier remains.
- Domain `details.fields` is stable-order/de-duplicated, at most eight entries, and
  each entry is at most 240 characters. Paths are assembled only from fixed contract
  tokens plus traversal indexes. Submitted URLs, values, IDs, slot names, and unknown
  key names never enter the error. Zero fields omits `details`.
- Stored-read repair is deterministic and non-destructive. Unrepairable malformed
  documents continue through the existing fail-closed legacy path.
- The legacy block-type alias map (`READ_REPAIR_BLOCK_TYPE`, exactly `{ actions: "button" }`)
  is exported as a runtime-frozen object and resolved by own-property lookup only. A stored
  `type` equal to any of the twelve own names on `Object.prototype` is not an alias: it reads
  back as an unrepaired legacy placeholder of that same type with byte-stable `data`, its
  bindings survive, and it must never resolve to an inherited function that collapses the
  whole document read into the empty-editor fallback.
- Button `action`/`href` policy has exactly one owner, `normalizeScreenBlockData` in
  `screenDocumentDataNormalizer.ts`: write rejects every present non-`link` action, while
  stored-read coerces it to `link` and drops `href`. The read-repair pass must not restate that
  policy for any action literal; it only marks unsupported-Button provenance and repairs
  legacy type/Tabs identity.
- A non-empty unsafe URL on a write throws `custom_screen_definition_invalid` with the
  exact `.href` or `.src` path before persistence. Only stored-read compatibility may
  omit that URL; it never substitutes an executable fallback. Error details never
  contain the rejected URL value.
- ASCII controls are unsafe before trimming or shared-helper delegation. In particular,
  `"/\t/evil.example/x"`, `"/\n/evil.example/x"`, and `"/\r/evil.example/x"`
  cannot survive as relative strings that a URL sink could reinterpret as protocol-
  relative. NUL (`"/\u0000/evil.example/x"`) and DEL
  (`"/\u007F/evil.example/x"`) are rejected by the same range check.
- Valid legacy/no-override documents preserve object and emitted-byte identity,
  including absent/empty fixed-kind labels and image ratio `"16:9"`/`""` strings.
- Do not add `disabled`, `publish`, or `custom` to the write enum. Safe-disabled
  compatibility is represented by the reserved read pair: supported `link` plus
  absent href plus absence of that block's href binding. The adapter performs this
  independently in editor and row-template documents before returning their read
  models; it persists no marker and preserves unrelated bindings.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- The seven schema partitions named in the split table collectively retain all 75
  existing tests and add the facade plus prototype-safe alias regressions for 77 total.
  `custom-screen-fixed-block-contract.test.ts` owns exact schema and
  one unknown-key rejection/valid round-trip for every fixed data kind, including the same rejection
  at root, two-level `children`, and two-level named-slot positions; preserve sections
  `120`, section-block/children/slot-array `500`, optional/empty labels, and image ratio
  `"16:9"`/`""`; nested Tabs limits, label trim/non-empty/max-120, duplicate/blank IDs,
  slot mismatch, link-only write, deterministic legacy read, empty-document binding
  warnings, and byte-stable round-trip. Legacy `button` and repaired `actions` fixtures
  carry href bindings in both editor and row-template views; read repair removes only
  those bindings and yields write-valid disabled Buttons without a persisted marker.
  Two compositional regressions run in both views. The first gives the removed orphan
  slot a missing/null-ID Button with an own non-`link` action plus a binding targeting
  its would-be generated ID; duplicate-Tab repair must preserve survivor sections/slot
  content, prune only that unsupported href binding, avoid empty-document fallback, and
  return a write-valid model. The second keeps equal block counts while slot repair
  reverses traversal order; it must not transfer provenance to a safe Button or preserve
  the generated unsupported Button's bound href. Both results re-read and write-normalize
  deterministically. `custom-screen-stored-read-repair.test.ts` owns the compositional
  Button/Tabs provenance cases, byte identity, fresh-validator order, media identity, and
  the prototype-member alias regression. That regression stores one block for each of the
  twelve inherited `Object.prototype` names beside a repairable `actions` block in both editor and
  row documents. It pins the frozen alias-map contract, exact unchanged legacy type/data and
  binding values, promotion of only `actions` to `button`, serialized input byte identity,
  deterministic re-read, and strict write/schema rejection of the legacy placeholders.
  Using fresh module instances of the real shared `schemaValidator`, validate valid
  create then update payloads and, in a second fresh instance, update then create; both
  orders must compile and pass, proving there is no duplicate schema-ID registration.
- `custom-screen-binding-contract.test.ts` owns the current correction's 160-character section/block/
  binding-path boundary, 120-character binding-ID boundary, strict/compatibility-write/
  stored-read mode matrix, exact-one `blockId|widgetId` compatibility contract,
  source/mode rejection, the exact generated-ID shape of bounded readable prefix plus
  `-` plus 13-character framed-tuple hash, and deterministic framed-tuple separation.
  Full write-normalizer cases cover short separator and case variants, preserve valid
  explicit IDs byte-for-byte, and retain editor+row binding references, unchanged stored
  input, and read/write idempotence. `custom-screen-schemas.test.ts` retains legacy
  migration/per-item recovery; `custom-screen-document-contract.test.ts`,
  `custom-screen-block-style.test.ts`, and
  `custom-screen-section-style-and-binding-gc.test.ts` retain their focused document,
  block-style, section-style, and binding-GC contracts.
- `tests/vitest/customScreens/screenDocumentOps.test.ts`: every binding-producing block
  factory and binding duplication path delegates to `buildScreenFieldBindingId`; bounded
  deterministic IDs preserve the existing block/propPath/field/mode semantics. No
  unrelated document-operation assertion is re-baselined.
- `tests/vitest/customScreens/screen-document-image-src.test.ts`: shared safe and
  hostile URL corpus, including relative/absolute backslash confusion and the exact
  TAB/LF/CR protocol-relative-confusion strings below, plus NUL/DEL, all rejected before
  delegation for both link and media profiles:

  ```ts
  const controlConfusedUrls = [
    "/\t/evil.example/x",
    "/\n/evil.example/x",
    "/\r/evil.example/x",
    "/\u0000/evil.example/x",
    "/\u007F/evil.example/x",
  ];
  ```

  For every value, call `sanitizeScreenAuthoringUrl` directly and expect `null`; direct
  Button/Image write normalization must throw with the exact generated `.href`/`.src`
  path and no submitted-value echo; stored-read normalization must omit the field; and
  `normalizeScreenImageSrc(value)` must return `""`, proving the compatibility alias
  delegates to the corrected wrapper. Existing safe, hostile, idempotence, non-string,
  and backslash assertions remain intact. A non-empty unsafe write reports the exact
  `.src`/`.href` path, while the stored-read adapter alone omits it. Direct write-normalizer cases also prove that
  `null` and every non-string present value throw rather than bypassing the Ajv contract,
  while stored-read compatibility omits those malformed legacy values. It pins the
  delegating compatibility contract
  `normalizeScreenImageSrc(value) === (sanitizeScreenAuthoringUrl(value, "media") ??
  "")`. TASK-540-02 and TASK-540-03 have migrated both consumers, so the alias has no
  production consumer left: only the facade re-export, this delegation regression, the
  pinned facade manifest fixture, and the Inspector suite's negative assertion name it.
- `tests/vitest/assistant/action-plan-schema.test.ts` and
  `tests/vitest/assistant/catalogBlueprintEngine.test.ts`: direct Assistant action-plan
  and catalog-blueprint consumers of the changed exported Custom Screen write normalizer
  remain dependency-shaped R01 gates. They are not edited or re-baselined for this
  correction; their existing curated plan normalization assertions must stay green.
- `tests/vitest/assistant/blueprint-binding-composer.test.ts`: the owned composer suite
  proves missing, null, and blank IDs reject with
  `assistant_blueprint_binding_invalid`, explicit IDs preserve current output, and the
  normalized duplicate-conflict plus existing field/secret failures retain their exact
  codes and precedence.
- `tests/integration/routes/customScreensDefinitionIntegrityRoutes.test.ts` (Bun/DB): nested fixed-kind
  unknown keys beneath both `children` and `slots` return `validation_error`/`Invalid
  payload`/400 and leave the owned fixture unchanged. Unsafe Button/Image URLs and
  duplicate-tab/tab-slot semantic failures return
  `custom_screen_definition_invalid`/`Custom screen definition is invalid`/400; assert
  `details.fields` count/length bounds and that neither submitted values nor unknown
  keys are echoed.
- The same definition-integrity Bun route suite creates a uniquely scoped screen whose editor and row
  template bindings point at absent block IDs. POST succeeds with ordered/de-duplicated
  `binding_block_removed` warning fields, persists only the pruned bindings, and a
  subsequent GET contains no transient warning. PATCH retains the existing equivalent
  proof. Cleanup deletes only rows created by this suite.
- `tests/integration/routes/customScreensRoutes.test.ts` remains in the R01 Bun command
  to prove shared route registration/error mapping and harness parity after extraction;
  its retained TASK-540-04 direct-image cases do not move into R01's new suite or widen
  R01 source authority.
- `tests/unit/assistant/actionExecutorCustomScreens.test.ts` (Bun): the existing Custom
  Screen block-patch case uses only strict V4 fixed kinds and their owned data paths. The
  action patches `heading.data.text`, preserves another property on the selected heading,
  and preserves the independent `text.data.content` sibling. No expectation may normalize,
  accept, or silently repair `hero`, `rich-text-section`, `headline`, or another stale
  Screen authoring shape; those names may remain in unrelated Page/Widget tests whose
  contracts legitimately own them.

`tests/vitest/customScreens/customScreenService.test.ts` is not changed or run as a
source-owned gate here. It may continue to run in the repository-wide suite, but the
leaf makes no new claim that the DB-importing service is Bun-free.

The expectation changes above were applied before the final leaf validation. TASK-540-06
may add cross-leaf flows after source gates are green; it must preserve these exact
write-versus-stored-read assertions.

R01's schema split adds six Vitest files, its route split adds one Bun file, and its
Assistant split adds 11 Bun files. Its total delta from the original monolith inventory
is therefore exactly `+6 Vitest / +12 Bun`; the already-pinned 51-Vitest/7-Bun
intermediate matrix includes the schema/route `+6/+1`, so this second repair wave adds
the remaining 11 Bun files. After every modular stream is reconciled, the final
TASK-540 family matrix is exactly
64 Vitest files plus 18 Bun files = 82 distinct test files: 81 source-owner/read-only
files and one closure-owner flow. Newly created unstaged test paths are explicitly
pinned into tracked-test authority; broad discovery of all untracked files is forbidden.

## Completed exact R01 modularity land order

1. Finished and gated the schema-domain production owners plus the stable schema facade.
2. Landed `screenDocumentContracts` → `screenDocumentFactories` → `screenDocumentTree`
   → `screenDocumentMutations` → `screenDocumentBindingOps` → the explicit ops facade.
3. Partitioned and independently gated the seven schema suites.
4. Landed the route harness, retained route suite, and definition-integrity route suite.
5. Landed Assistant support in the declared import order, then moved suites in the exact
   1-73 partition order from retained through Detail Pages.
6. Ran every isolated count, the combined R01 gates, and the hard owner-scoped line gate
   before writing the canonical `Modularity Repair Revalidated` receipt. That receipt
   proves only the targeted static/test/line contract; the mandatory fresh family
   post-audit and runtime smoke remain prerequisites for closure.

No later closure step may edit a preceding source owner merely to make a moved test pass;
fix a real source drift at its sole owner, rerun its gate, and then resume downstream.

## Validation

```bash
node _docs/_workflows/task-540-implement.mjs --check-r01-line-limit
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/admin/custom-screen-document-contract.test.ts \
  tests/vitest/admin/custom-screen-block-style.test.ts \
  tests/vitest/admin/custom-screen-section-style-and-binding-gc.test.ts \
  tests/vitest/admin/custom-screen-fixed-block-contract.test.ts \
  tests/vitest/admin/custom-screen-binding-contract.test.ts \
  tests/vitest/admin/custom-screen-stored-read-repair.test.ts \
  tests/vitest/assistant/action-plan-schema.test.ts \
  tests/vitest/assistant/blueprint-binding-composer.test.ts \
  tests/vitest/assistant/catalogBlueprintEngine.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/screenDocumentOps.test.ts \
  tests/vitest/customScreens/screen-document-insertion.test.ts \
  tests/vitest/customScreens/screen-document-sections.test.ts
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); if (!reachable) process.exit(1); process.exit(0)'
bun test tests/integration/routes/customScreensRoutes.test.ts \
  tests/integration/routes/customScreensDefinitionIntegrityRoutes.test.ts \
  tests/unit/assistant/actionExecutorService.test.ts \
  tests/unit/assistant/actionExecutorCustomScreens.test.ts \
  tests/unit/assistant/actionExecutorPages.test.ts \
  tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts \
  tests/unit/assistant/actionExecutorForms.test.ts \
  tests/unit/assistant/actionExecutorMenusAndSeo.test.ts \
  tests/unit/assistant/actionExecutorContentUpdates.test.ts \
  tests/unit/assistant/actionExecutorAutomationBlueprints.test.ts \
  tests/unit/assistant/actionExecutorIdempotencyAndSiteKit.test.ts \
  tests/unit/assistant/actionExecutorCatalogBlueprints.test.ts \
  tests/unit/assistant/actionExecutorSupportingPageLinks.test.ts \
  tests/unit/assistant/actionExecutorDetailPages.test.ts
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-implement.mjs --self-test-file-line-limit
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
git diff --check
```

`--check-r01-line-limit` must read the exact R01 production/test owner set, count complete
physical lines including comments, blanks, and an unterminated final line, print only
path/count pairs, and exit non-zero for any result above 1,000. Its self-test must prove
1,000 passes, 1,001 fails, generated/exempt categories are not accidentally admitted,
and a newly created explicitly authorized R01 test is counted before staging. This is a
mechanical gate, not a replacement for lint, typecheck, targeted tests, DB preflight,
post-audit, full validation, or smoke.

If a named test fails, rerun that exact file once in isolation before classifying
the failure. This leaf adds no DB migration and no public/security gate exception.
Before accepting the combined Bun result, run each of the 12 Assistant files once by
itself and record the exact per-file counts `6, 8, 6, 7, 4, 7, 5, 3, 8, 6, 8, 5` in
the table order above. Their combined result must be 73/73, and the sorted test-name
multiset/hash must match the pre-split receipt. Run `screenDocumentOps.test.ts`,
`screen-document-insertion.test.ts`, and `screen-document-sections.test.ts` both
independently for 12/12, 19/19, and 12/12, then together for 43/43, so no extracted
module relies on file order.

## Historical corrective completion and fixture repair

The structural-provenance implementation and its 74/74 Vitest plus 15/15 DB route
evidence remain historical metadata. The later repair landed the original-string
ASCII-control guard and direct sanitizer/write/stored-read/compatibility-alias matrix,
then passed the final 75/75 Vitest and 15/15 DB route gates plus a fresh zero-finding
post-audit before this leaf returned to Done. That evidence remains historical and is
not invalidated as schema/source evidence. The later narrow Assistant fixture repair
also passed the exact schema/image Vitest, Custom Screens route, Assistant Bun, static,
and diff gates before its then-current repair ownership ended. Those pre-split repair
transitions are historical. The current 2026-07-19 stored-read hardening remains
`🚧 In Progress` with canonical `Implementation Complete` and the matching exact
`Revalidation Passed` generation/token recorded above. The earlier module, schema-test,
route-test, document-operations, and Assistant splits retain their separate canonical
`Modularity Repair Revalidated` evidence. The later five-lens audit found no defect in
the already-landed stored-read repair, but it did find the missing shared selector now
owned by R01. That selector and its R03/L03 consumers are landed, and the exact owner
re-gates completed in dependency order R01 → R03 → L03 → L04 → L01. The executable
remaining order is smoke-host-only Vite 8.1.5 repin/readiness revalidation → bridge and
remaining helpers → final pins → exact helper tracking → combined targeted gate → clean
post-audit → full gates → smoke → closure; none of those later results is claimed here.
TASK-540-04-L03 keeps
one canonical `Revalidation Passed` successor and no `Repair Pending`; the closure leaf
TASK-540-06-L01 has no current `Implementation Complete`, `Revalidation Passed`, or
current closure receipt. Its exact reserved pre-closure evidence is historical
provenance only and must not be duplicated. Family
changelog 1252, full validation, and live smoke still remain closure-owned.
