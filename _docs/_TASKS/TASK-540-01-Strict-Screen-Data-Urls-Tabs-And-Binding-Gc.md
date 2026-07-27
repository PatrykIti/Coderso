# TASK-540-01: Strict Screen Data, URLs, Tabs, and Binding GC

# FileName: TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Schema / Security / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-498, TASK-500, TASK-505
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Historical Implementation Complete:** 2026-07-14 — original assigned work completed before later repair cycles.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Current Repair State:** The verified R01 audit set of two MEDIUM behavior defects and three test-integrity LOW gaps is implemented at the validated HEAD. The separate 2026-07-19 stored-read hardening named in `Fix Reason` and the later shared-selector follow-up in commit `f8e916b9255677352a2ed2fef9bd73093dec5683` are both covered by the leaf's current selector-inclusive `Revalidation Passed` plus this child's canonical `Implementation Complete`. Earlier generation/token and pre-split receipts remain historical evidence only. The clean family post-audit, full validation, smoke, changelog, and closure remain pending.
**Current Selector Implementation Evidence:** 2026-07-19 — `screenMediaIdentity.ts` now owns `firstScreenMediaAssetUuid`, and the existing media-identity declaration covers its scalar/array, first-valid, malformed, and exact-casing behavior without adding a test declaration. Commit `f8e916b9255677352a2ed2fef9bd73093dec5683` is implementation provenance, not a generation/token receipt.
**Current Selector Receipt State:** The leaf's exact selector-inclusive owner gate passed on 2026-07-19 before the dependent R03/L03/L04/L01 gates. Its current `Revalidation Passed` is the sole active R01 owner-gate receipt and claims no clean family post-audit, full validation, smoke, changelog, or closure result.
**Repair Started:** 2026-07-16
**Fix Started:** 2026-07-19
**Fix Reason:** A stored-read post-audit reproduced that the legacy block-type alias map was read by bare indexing, so a stored `type` equal to an inherited `Object.prototype` member name resolved to a function and collapsed the entire `editorView` read into the empty fallback. TASK-540-01-L01 owns the runtime-frozen, own-property-only alias map; the pinned prototype-named-type read outcome (unrepaired legacy placeholder, byte-stable `data`, surviving bindings); and removal of the duplicated `publish`/`custom` Button rewrite from the read-repair pass. `screenDocumentDataNormalizer.ts` remains the sole owner: write rejects a present non-`link` Button action, while stored-read coerces it to `link` and drops `href`.
**Implementation Complete:** 2026-07-19 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Contract Correction:** 2026-07-19 — the orchestrator independently verified and adopted this minimal post-audit contract after rejecting the fixer's unauthorized task-prose edits; the exact active repair metadata was preserved through the matching successful owner gate.
**Repair Reason:** The final TASK-540 workflow audits reproduced route/direct-normalizer identity drift, ambiguous legacy ID generation, whole-document stored-read collapse when one binding was malformed, and an optional-ID Assistant composer with its own ambiguous tuple fallback. TASK-540-01-L01 owns the strict three-mode contract, per-binding stored-read rejection, one V4 legacy membership pass, the shared framed-tuple ID builder, explicit-ID-only composer input, duplicate stored-ID fail-closed proof, and registered metadata-PATCH preservation.
**Repair Revalidated:** 2026-07-16 — against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus the five dirty R01 owner paths named by the leaf, core/root static gates passed; changed Vitest passed 81/81; exact six-file R01 Vitest passed 176/176; DB preflight was reachable; route/Assistant Bun passed 93/93 with 576 expectations; isolated route passed 20/20 with 118 expectations; document ops passed 11/11; workflow self-tests and diff checks passed. This is pre-modularity-split evidence only. No post-audit, full validation, smoke, changelog, or closure pass is claimed.
**Prior R01 Revalidation:** 2026-07-16 — before the composer and duplicate stored-read test findings, the then-three dirty R01 owner paths passed core/root static gates, five-file Vitest 168/168, reachable DB preflight, route/Assistant Bun 92/92 with 568 expectations, isolated route 19/19 with 110, document-op 11/11, and `git diff --check` against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77`.
**Previous Assistant Repair Started:** 2026-07-14
**Historical Assistant Repair Reason:** Repository-wide Bun validation confirmed one stale Assistant test fixture crossing the strict V4 Screen write boundary with unsupported `hero`/`rich-text-section` kinds. TASK-540-01-L01 owned only that fixture and its sibling-preservation assertions; production/schema contracts stayed strict.
**Historical Completion:** 2026-07-14
**Historical Corrective Revalidation:** 2026-07-14 — TASK-540-01-L01 passed 75/75 exact Vitest, 15/15 DB routes (82 expectations), core lint/typecheck, `git diff --check`, and a fresh zero-finding post-audit
**Previous Fix Started:** 2026-07-14
**Previous Fix Reason:** TASK-540-01-L01 must reject ASCII control characters before the shared URL helper can reinterpret TAB/LF/CR-confused protocol-relative values.
**Prior Corrective Revalidation:** 2026-07-14 — TASK-540-01-L01 passed `core lint:types`, `core lint`, 74/74 exact Vitest, 15/15 DB routes (82 expectations), `git diff --check`, and a fresh read-only post-audit with zero findings before the control-character contract was added
**Previous Revalidation:** 2026-07-14 — TASK-540-01-L01 passed its exact core static, 72/72 Vitest, and 15/15 DB route gates (82 expectations)
**Previous Completion:** 2026-07-14
**Previous Reopened:** 2026-07-14 (Screen URL control-character repair)
**Historical Reopened:** 2026-07-14 (Assistant Custom Screen block-patch fixture compatibility)
**Reopened:** 2026-07-16 (strict identity, scoped stored-read recovery, legacy/Assistant ID generation, duplicate fail-closed proof, and metadata-PATCH preservation)
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Make the existing Custom Screen V4 write boundary exact for every fixed data-oriented
block kind (`heading`, `text`, `stat`, `divider`, `image`, `related-list`, `tabs`,
and `button`). Tabs receive strict nested items and slot identity, Button writes support
only the implemented `link` action, Button/image URLs use the shared authoring URL
policy, and binding GC also removes ghosts from an empty document. Stored legacy
`publish`/`custom` buttons remain readable through a deterministic, non-persisting
safe-disabled adapter.

No endpoint, schema version, database migration, action API, or new URL policy is
introduced.

The current repair also applies the hard repository modularity gate without changing
behavior: every touched human-authored production module and test file must finish at
or below 1,000 complete physical lines, including comments and blanks. The existing
Custom Screen schema facade remains the stable public import surface, while cohesive
normalization/schema responsibilities move behind it. The DB route suite is divided by
contract and shares only a state-isolated, exact-ID cleanup harness. This limit is a
blocking gate and cannot be deferred to TASK-9999.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-01-L01 | Reject unknown, sanitize URLs, unique Tabs, and prune ghosts | strict Screen schema/service/route owner; cohesive schema facade; seven schema suites/fixture; isolated definition-integrity route suite/harness; stable document-ops facade plus five owners; explicit-ID composer; twelve-suite/73-name Assistant executor family plus five support owners; read-only Assistant plan/catalog consumers | 🚧 In Progress |

## Current audit and modularity closure contract

### Landed 2026-07-19 selector-owner correction

The latest family post-audit assigned the first step of the corrective chain to R01.
Commit `f8e916b9255677352a2ed2fef9bd73093dec5683` appended the sole Bun-free
`firstScreenMediaAssetUuid(value: unknown): string | null` implementation below the
existing predicate. It accepts a scalar UUID or returns the first valid UUID from an
array, preserves the selected UUID bytes and casing, and returns `null` for every other
shape. The parameter is an untrusted-value boundary and must be narrowed immediately;
production and tests may not introduce `any`, an assertion cast, or a second selector.

The existing `TASK-540-01 media identity predicate has one exact UUID contract` test in
`custom-screen-stored-read-repair.test.ts` gains the scalar/array/first-valid/malformed
selector assertions inside that same declaration. No new test declaration is allowed:
the seven schema suites remain exactly
`18+9+10+13+11+5+11 = 77`. The stable facade continues to re-export
`isScreenMediaAssetUuid` exactly as before; the new internal selector is imported
directly by R03 and L03 and does not change the pinned 62-runtime/39-type facade
manifest. The dependency order was preserved by the landed commits, and the exact
selector-inclusive R01 owner gate subsequently passed. This paragraph records
implementation provenance plus focused revalidation, not family closure.

The current R01 implementation resolves two verified MEDIUM findings. First, stored
V1/V2/V3 binding normalization no longer treats one malformed binding as a whole-array
failure that discards the editor payload: per-item recovery drops only that binding and
preserves sibling sections, blocks, data, and valid bindings through a metadata-only
PATCH. Second, duplicate stored V4 editor IDs may still fail closed to an empty editor,
but that editor-scoped recovery can no longer reset an independently valid, non-default
normalized `listView`.

It also closes three verified test-integrity LOW gaps: the full write-versus-legacy
separator/case collision matrix for generated binding IDs, malformed row-template
binding recovery without document/sibling loss, and the Assistant composer conflict
case where distinct inputs normalize to the same explicit ID and must retain
`assistant_blueprint_binding_duplicate_id`. These implemented claims were revalidated by
the final post-split owner gate and its canonical receipt. None is eligible for
TASK-9999 because each protects persistence, reliability, or test-integrity behavior.

The historical pre-split R01 over-limit evidence was exactly
`screenDocumentOps.ts` = 1,030 lines / SHA-256
`dc20fc963c6fcc6e4c7ef647284fd0ee3ee174302f9ba196e869f40eaae0b69b` and
`actionExecutorService.test.ts` = 6,577 lines / SHA-256
`41bd0ec9f0a0042ca87bc7f688206b391671788176b13bac0b525ce677f6c62b`, both owned
by TASK-540-01-L01. The leaf's final receipt covers every extant extracted schema,
schema-test, route-test, document-operation, Assistant suite, and support path as
`{ path, owner, lines, sha256 }`, with every human-authored file at `<= 1000`.

TASK-540-01-L01 preserved those behaviors while replacing the historical 3,539-line
`customScreenSchemas.ts` implementation with an explicit-export facade over cohesive
submodules and partitioning the historical 3,436-line schema suite without dropping or
weakening any of its 75 existing tests; exact public-facade export/identity and
prototype-safe stored-read alias regressions were added. The Bun route split moved the seven existing TASK-540-01
definition-integrity cases out of the historical 1,239-line mixed route suite and added
one injected cleanup fault-path regression there. The final gate independently measured
each resulting production module and test file, including both route suites and their
support harness, at no more than 1,000 physical lines and returned this child to the
source-owner-complete closure frontier.

External production consumers continue to import `customScreenSchemas.ts`; only the
cycle-breaking type-only import in `bindingResolver.ts` targets the extracted contract
module directly. The facade must preserve the exact existing runtime/type export
surface, one `CustomScreenDefinitionError` constructor identity, one shared Ajv `$defs`
owner, lazy widget registration, and all write/stored-read byte-identity guarantees.
The facade gate pins exactly 62 runtime and 39 type exports and reference identity with
the single owning modules; internal-only split helpers must not leak.
The route harness creates no shared singleton state: each calling suite owns its exact
UUID trackers and its own `afterEach(cleanup)` lifecycle. Cleanup may delete only exact
tracked composite override scopes and exact tracked UUID rows; prefix, pattern,
predicate-wide, table-wide, and truncating cleanup are forbidden.
An injected-dependency regression must prove cleanup continues through every later
independent exact resource after earlier failures and then propagates the failure.

For workflow reconciliation, the seven schema suites preserve 75 existing names plus
the facade and prototype-safe alias regressions in the exact
`18+9+10+13+11+5+11` partition, the two route suites preserve their 13+8 partition,
and the twelve Assistant executor suites preserve exactly 73 fully expanded names. The
schema 77 and route 21 are separately count-protected by their owner gates; only the Assistant
Executor's 73 names from this child participate in the protected ten-monolith global
347-name multiset. After every owner split is reconciled, the family target is exactly
64 Vitest plus 18 Bun = 82 distinct test files: 81 source-owner/read-only paths and one
closure-owner flow. This changes neither pinned changelog 1252 nor closure ownership.

## Contract

- Write-time Tabs items are exact `{ id, label }` records. IDs are non-empty,
  bounded, grammar-safe, unique inside the block, and equal the block's slot-key
  set; labels are trimmed, non-empty, and at most 120 characters. Route-schema
  failures (including unknown nested keys, missing items, bad primitive shapes,
  and grammar/length failures) retain the existing `validation_error` 400. Semantic
  duplicate-ID and tab/slot-set failures use `custom_screen_definition_invalid` 400.
- The stored-read adapter repairs only known legacy drift deterministically. It
  never writes to storage. Duplicate legacy tab IDs retain the first matching
  slot; later repaired tabs receive stable suffixed IDs and empty slots rather
  than duplicated content.
- Button write data accepts `action:"link"` only. During the same recursive stored-read
  repair that removes/reorders legacy Tabs slots, the adapter records provenance on the
  exact repaired `button`/`actions` node whenever its own present action is anything
  other than the exact string `link`. After normalization assigns the final block ID,
  that structural provenance—not an independently flattened raw position—selects only
  the matching `propPath:"href"` binding for pruning in editor and row-template
  documents. Removed orphan slots cannot empty the whole document, reordered slots
  cannot transfer provenance to another Button, and unsupported generated-ID Buttons
  remain safely disabled.
- This canonical `link` plus absent href pair is the parent's reserved safe-
  disabled read representation; `"disabled"` is not a second persisted action.
- `sanitizeScreenAuthoringUrl` is the sole Screen URL-policy entry point for Button
  href and image src. Before trimming or calling a shared helper it rejects every ASCII
  control (`U+0000..U+001F` and `U+007F`) anywhere in the submitted string, plus every
  backslash. This prevents TAB/LF/CR protocol-relative confusion without modifying the
  Page-owned helpers. The existing
  `normalizeScreenImageSrc` export is retained as a compatibility alias that delegates to
  `sanitizeScreenAuthoringUrl(value, "media")` and returns `""` for `null`. TASK-540-02
  migrated the Inspector and TASK-540-03 migrated the renderer, so no Screen consumer
  imports the alias or either Page helper directly; the alias now has zero production
  consumers and is retained solely to keep the pinned 62-runtime facade manifest
  byte-stable.
- Binding pruning uses membership in the live ID set without a non-empty-set
  exception. Create and update each pass a warning sink and expose the existing
  transient warning shape in their successful response; stored read passes a discard
  sink, prunes silently, and never fabricates a persisted warning. Existing
  `binding_block_removed` code/field order/de-duplication remains stable.
- `screenBlockV1Schema` gains per-kind discriminated data schemas instead of a
  generic object for all eight fixed data kinds. Every allowed nested key, required
  member, enum, clearable/absent label behavior, and numeric/string bound is frozen in
  the leaf's exact table. Recursive sections retain `maxItems:120`; section blocks,
  block `children`, and every named-slot array retain `maxItems:500`. Image `ratio`
  remains a permissive, uncoerced optional string so legacy `"16:9"`, `""`, and other
  stored strings remain byte-stable. The enumerated legacy/plugin kinds retain only
  their documented compatibility arm. Create/update schemas are built from one shape
  owner but use root-local `$defs`/`#/$defs/...` refs with no repeated nested `$id`;
  both compile orders are tested through the real shared Ajv validator.
- `ScreenTabItem`, `SCREEN_TAB_ID`, `SCREEN_TABS_MIN`, `SCREEN_TABS_MAX`,
  `SCREEN_TAB_LABEL_MAX`, and `isScreenMediaAssetUuid` are exported by the Bun-free
  schema owner. Inspector/renderer and the later override contract import only the
  members they consume; no local bound or UUID-regex mirror is permitted.
- Structural section/block IDs and binding `blockId`/`propPath`/`field` share one strict
  max-160 path contract; binding IDs share canonical slug grammar and max 120. Fresh V4
  writes reject non-canonical/overlong values. Stored read deterministically shortens
  safe overlong paths with a full-value hash suffix, preserving exact editor and
  row-template binding references, input bytes, and read/write idempotence. A
  metadata-only PATCH persists that repaired base definition without losing local Tabs,
  slots, siblings, or bindings. Legacy V1/V2/V3 editor migrations map first and then use
  that same V4 stored-read pass, so their max-160/max-120 identities become strict-write
  valid without remigrating list views or dropping sibling data.
- Binding normalization has exact `write`, `compatibility-write`, and `stored-read`
  modes. Strict V4 accepts only `blockId`; the public Assistant helper keeps a narrowly
  typed compatibility write that requires exactly one of `blockId|widgetId`, defaults
  only absent source/mode, and rejects ambiguous or malformed values. Stored read keeps
  its historical fail-soft alias adapter and emits canonical `blockId`.
- `buildScreenFieldBindingId(blockId, propPath)` is owned by the Bun-free schema domain.
  Every generated ID is a bounded readable slug prefix followed by `-` and the exact
  13-character base36 hash of `JSON.stringify([blockId, propPath])`, even when the
  readable prefix is short. The result is deterministic, canonical, and at most 120
  characters; separator/case variants remain distinct. A valid explicit binding ID is
  validated and returned unchanged rather than being replaced with a generated ID.
  The schema normalizer and `screenDocumentOps` factories/duplication use it under R01;
  TASK-540-02-L01 owns the Inspector consumer. The older blanket `screenDocumentOps`
  exclusion is superseded only for this helper handoff.
- The pre-V4 Assistant composer is a separate `CustomScreenBinding` boundary, not a
  `ScreenFieldBinding` generator. Its contribution type requires `id: string`; runtime
  missing, null, or blank IDs reject with `assistant_blueprint_binding_invalid` and no
  local tuple fallback exists. Current catalog callers already provide explicit IDs;
  action-plan/catalog consumers remain read-only, while the composer and its focused
  Vitest suite are R01-owned for this correction.

## Security Contract

- **Visibility:** existing internal `/admin/api/custom-screens*` routes only.
- **Auth/RBAC:** Custom Screen Admin routes remain session-cookie-only with existing
  `content:read` / `content:write` checks; no API-key authentication path is present or
  added.
- **CSRF/rate limit:** session writes retain CSRF and `admin_write`; internal
  reads retain the existing admin-read bucket. No public nonce/captcha applies.
- **Validation:** reject unknown envelope and nested fields before persistence;
  unsupported actions and unsafe URLs never reach storage or DOM. Ajv failures retain
  `validation_error`; semantic URL/tab-slot failures use the byte-frozen
  `custom_screen_definition_invalid` response with at most eight generated field paths
  of at most 240 characters each and no submitted values.
- **Anti-abuse/secrets:** no public write, secret, token, or browser persistence
  surface is added.

## Acceptance

- Valid V4 documents round-trip byte-stably when none of the repaired cases is
  present.
- Empty documents return zero bindings and name every pruned field in the
  existing warning sink. POST and PATCH responses surface the transient warning;
  stored-read cleanup is silent.
- Safe relative/HTTP(S)/supported navigation URLs survive canonically; protocol-
  relative, ASCII-control-confused, backslash-confused, executable, data/blob/file, and unsupported
  schemes fail closed under the owning profile.
- Strict write rejects legacy unsupported actions, while stored read remains
  deterministic and disabled in both editor and row-template documents even when the
  repaired legacy button had an href binding. No disabled marker is persisted.
- Every absent binding ID normalizes through the domain builder to
  `<bounded-readable-prefix>-<13-character-framed-tuple-hash>`; present canonical IDs
  remain byte-identical. Full write-normalizer regressions, not helper-only assertions,
  prove that the short separator pair `(a-b,c)` / `(a,b-c)` and short case pair
  `(A,value)` / `(a,value)` produce distinct schema-valid IDs and round-trip unchanged.
- Stored-read per-item recovery drops an individually malformed binding but never catches
  duplicate resulting IDs; a focused regression pins the outer fail-closed editor
  fallback. Composer runtime tests pin required explicit IDs without weakening existing
  duplicate, missing-field, or secret-field failures.

## Historical corrective completion and fixture repair

The structural-provenance correction and its green gates remain historical evidence.
The subsequent Screen-wrapper repair added original-string ASCII-control rejection
before shared-helper delegation, then passed the leaf's final 75/75 Vitest and 15/15 DB
route gates plus a fresh zero-finding post-audit before this subtask returned to Done.
The later historical reopen changed only the stale Assistant block-patch fixture to
canonical `heading.data.text` plus an independent `text.data.content` sibling and
retained explicit same-block and sibling-block preservation assertions. No production
or schema fallback was permitted. Its leaf passed the expanded exact gate including
`tests/unit/assistant/actionExecutorService.test.ts`, and that pre-split repair/Done
transition is historical. The current 2026-07-19 stored-read hardening keeps this
subtask `🚧 In Progress` with canonical `Implementation Complete`; its leaf carries one
current selector-inclusive `Revalidation Passed` while the older generation/token is
retained under a historical field. The mandatory
schema, document-operations, route, and Assistant executor splits retain their separate
canonical `Modularity Repair Revalidated` receipt. The later five-lens audit found no
defect in the already-landed stored-read repair, but it did find the missing shared
selector now owned by R01. The five exact owner re-gates completed in dependency order
R01 → R03 → L03 → L04 → L01. The remaining executable order is smoke-host-only Vite
8.1.5 repin/readiness revalidation → bridge and remaining helpers → final pins → exact
helper tracking → combined targeted gate → clean post-audit → full gates → smoke →
closure; none of those later results is claimed here.
TASK-540-04-L03 retains one current `Revalidation Passed`; the closure leaf
TASK-540-06-L01 has no current `Implementation Complete`, `Revalidation Passed`, or
current closure receipt. Its exact deterministic `pre-closure remediation / fix-started
2026-07-15 / gate green` reserved pre-closure evidence is historical provenance only.
The post-audit intervention's five owner re-gates are complete; the fresh clean
post-audit follows the remaining implementation frontier and combined targeted gate.
Changelog 1252, full
validation, and live smoke remain closure-owned.
