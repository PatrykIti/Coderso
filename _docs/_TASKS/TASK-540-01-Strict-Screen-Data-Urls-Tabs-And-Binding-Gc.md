# TASK-540-01: Strict Screen Data, URLs, Tabs, and Binding GC

# FileName: TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Schema / Security / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-498, TASK-500, TASK-505
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Fix Started:** 2026-07-14
**Fix Reason:** TASK-540-01-L01 post-audit fail-closed Button read-adapter repair.
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
| TASK-540-01-L01 | Reject unknown, sanitize URLs, unique Tabs, and prune ghosts | `core/services/customScreens/customScreenSchemas.ts`; narrow create-warning seam in `core/services/customScreens/customScreenService.ts`; narrow error-carrier import/mapping seam in `core/server/routes/customScreenRoutes.ts` | 🚧 In Progress |

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
- Button write data accepts `action:"link"` only. Before stored-read normalization,
  the adapter collects the IDs of `button`/repaired `actions` blocks carrying
  `publish`/`custom`; it then maps them to `link`, removes static `href`, and prunes
  only each matching `propPath:"href"` binding from both editor and row-template
  bindings. The supported model therefore renders them disabled even when the legacy
  record had a bound href, and an unrelated later save remains valid.
- This canonical `link` plus absent href pair is the parent's reserved safe-
  disabled read representation; `"disabled"` is not a second persisted action.
- `sanitizeScreenAuthoringUrl` is the sole Screen URL-policy entry point for Button
  href and image src. It rejects every backslash before internally delegating to the
  shared Page helpers. During sequential rollout, the existing
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
  relative, backslash-confused, executable, data/blob/file, and unsupported
  schemes fail closed under the owning profile.
- Strict write rejects legacy unsupported actions, while stored read remains
  deterministic and disabled in both editor and row-template documents even when the
  repaired legacy button had an href binding. No disabled marker is persisted.

## Completion

The sole implementation leaf is complete and independently re-audited. Its targeted
type, lint, pure-domain/UI, and DB route gates are green; aggregate TASK-540 validation
and runtime smoke remain owned by TASK-540-06.
