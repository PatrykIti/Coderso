# TASK-540-01: Strict Screen Data, URLs, Tabs, and Binding GC

# FileName: TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Schema / Security / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-498, TASK-500, TASK-505
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Started:** 2026-07-16
**Repair Reason:** The final TASK-540 workflow audit reproduced route/direct-normalizer drift for structural and binding identities, ambiguous public compatibility bindings, collision-prone generated binding IDs, and stored-read repair during metadata-only PATCH. TASK-540-01-L01 owns the strict three-mode contract and the shared domain binding-ID builder: every generated ID now carries a bounded readable prefix plus the 13-character hash of its framed JSON tuple, while valid explicit IDs remain unchanged and V4 writes do not widen.
**Repair Revalidated:** 2026-07-16 — TASK-540-01-L01 passed `core lint:types`, `core lint`, its exact five-file Vitest gate 168/168, reachable DB preflight, the exact route/Assistant Bun gate 92/92 with 564 expectations, isolated document-op 11/11, and `git diff --check`; no full-suite, post-audit, smoke, changelog, or closure pass is claimed.
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
**Reopened:** 2026-07-16 (strict identity, compatibility-write, and shared binding-ID correction)
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

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-01-L01 | Reject unknown, sanitize URLs, unique Tabs, and prune ghosts | strict Screen schema/service/route owner; narrow shared binding-ID handoff in `screenDocumentOps.ts`; schema/image/document-op gates; read-only Assistant plan/catalog consumers; DB route proof; and narrow fixture-only compatibility seam in `tests/unit/assistant/actionExecutorService.test.ts` | 🚧 In Progress |

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
  Page-owned helpers. During sequential rollout, the existing
  `normalizeScreenImageSrc` export remains as a compatibility alias that delegates to
  `sanitizeScreenAuthoringUrl(value, "media")` and returns `""` for `null`. TASK-540-02
  migrates the Inspector and TASK-540-03 migrates the renderer; after those leaves no
  Screen consumer imports the alias or either Page helper directly.
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

## Historical corrective completion and fixture repair

The structural-provenance correction and its green gates remain historical evidence.
The subsequent Screen-wrapper repair added original-string ASCII-control rejection
before shared-helper delegation, then passed the leaf's final 75/75 Vitest and 15/15 DB
route gates plus a fresh zero-finding post-audit before this subtask returned to Done.
The later historical reopen changed only the stale Assistant block-patch fixture to
canonical `heading.data.text` plus an independent `text.data.content` sibling and
retained explicit same-block and sibling-block preservation assertions. No production
or schema fallback was permitted. Its leaf passed the expanded exact gate including
`tests/unit/assistant/actionExecutorService.test.ts`, and that repair/Done transition is
historical. The current 2026-07-16 strict identity/binding-ID correction keeps this
subtask `🚧 In Progress` with the leaf's exact current `Revalidation Passed` receipt.
R01 source and targeted gates are complete; workflow/final audit and closure remain
separate. TASK-540-04-L03 keeps its canonical
`Revalidation Passed` successor and no `Repair Pending`; the closure leaf remains
landed with its exact pre-closure evidence. Family changelog 1252, full validation, and
live smoke remain closure-owned.
