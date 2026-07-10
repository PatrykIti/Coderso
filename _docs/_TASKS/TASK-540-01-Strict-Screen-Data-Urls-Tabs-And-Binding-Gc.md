# TASK-540-01: Strict Screen Data, URLs, Tabs, and Binding GC

# FileName: TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Schema / Security / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-498, TASK-500, TASK-505
**Status:** ⏳ To Do
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
| TASK-540-01-L01 | Reject unknown, sanitize URLs, unique Tabs, and prune ghosts | `core/services/customScreens/customScreenSchemas.ts`; narrow error-carrier import/mapping seam in `core/server/routes/customScreenRoutes.ts` | ⏳ To Do |

## Contract

- Write-time Tabs items are exact `{ id, label }` records. IDs are non-empty,
  bounded, grammar-safe, unique inside the block, and equal the block's slot-key
  set. Unknown nested keys, missing items, duplicate IDs, and mismatched slots
  reject with `custom_screen_definition_invalid`.
- The stored-read adapter repairs only known legacy drift deterministically. It
  never writes to storage. Duplicate legacy tab IDs retain the first matching
  slot; later repaired tabs receive stable suffixed IDs and empty slots rather
  than duplicated content.
- Button write data accepts `action:"link"` only. Stored `publish`/`custom`
  actions read as `link` with no href, so the supported model can render them
  disabled and an unrelated later save remains valid.
- This canonical `link` plus absent href pair is the parent's reserved safe-
  disabled read representation; `"disabled"` is not a second persisted action.
- `sanitizeScreenAuthoringUrl` is the sole Screen URL-policy entry point for Button
  href and image src. It rejects every backslash before internally delegating to the
  shared Page helpers. All Screen write/render consumers import this wrapper; none
  imports `sanitizeAuthoringLinkHref` or `sanitizeAuthoringMediaUrl` directly.
  TASK-540-03 reuses the wrapper for render-boundary checks.
- Binding pruning uses membership in the live ID set without a non-empty-set
  exception. Existing `binding_block_removed` warning data remains stable.
- `screenBlockV1Schema` gains per-kind discriminated data schemas instead of a
  generic object for all eight fixed data kinds. Every allowed nested key is
  represented in the route schema and round-trip tests; the enumerated legacy/plugin
  kinds retain only their documented stored-read compatibility arm.
- `ScreenTabItem`, `SCREEN_TAB_ID`, `SCREEN_TABS_MIN`, and `SCREEN_TABS_MAX` are exported by the schema
  owner and imported verbatim by inspector and renderer consumers.

## Security Contract

- **Visibility:** existing internal `/admin/api/custom-screens*` routes only.
- **Auth/RBAC:** existing session/API-key handling and `content:read` /
  `content:write` checks remain unchanged.
- **CSRF/rate limit:** session writes retain CSRF and `admin_write`; internal
  reads retain the existing admin-read bucket. No public nonce/captcha applies.
- **Validation:** reject unknown envelope and nested fields before persistence;
  unsupported actions and unsafe URLs never reach storage or DOM.
- **Anti-abuse/secrets:** no public write, secret, token, or browser persistence
  surface is added.

## Acceptance

- Valid V4 documents round-trip byte-stably when none of the repaired cases is
  present.
- Empty documents return zero bindings and name every pruned field in the
  existing warning sink.
- Safe relative/HTTP(S)/supported navigation URLs survive canonically; protocol-
  relative, backslash-confused, executable, data/blob/file, and unsupported
  schemes fail closed under the owning profile.
- Strict write rejects legacy unsupported actions, while stored read remains
  deterministic and disabled.
