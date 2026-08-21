# TASK-542-01: Strict Deterministic Menu Documents

# FileName: TASK-542-01-Strict-Deterministic-Menu-Documents.md

**Parent Task:** TASK-542
**Priority:** High
**Category:** Menus / Domain Model / Validation / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-541
**Status:** ✅ Done
**Completed:** 2026-08-21
**Changelog:** 1319 (pinned; closure only)

---

## Scope

Make MenuDocumentV2 writes exact and structurally unambiguous, while replacing
random stored-read ID repair with a deterministic structural-path adapter. The
landed TASK-541 color contract remains the only color parser. No route, schema
version, migration, or automatic persistence rewrite is added.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-542-01-L01 | Require unique IDs, topology, and stable legacy reads | `core/services/menus/menuDocumentV2.ts` | ✅ Done |

## Fixed contract

- Top level permits exactly `schemaVersion` and `sections`; non-empty and empty
  writes both require the current marker.
- New writes require bounded grammar-safe non-empty IDs. Section and block IDs
  are globally unique in the document.
- Valid topology is one first `menu-bar`, followed by at most one
  `menu-drawer`. Duplicate bars/drawers, drawer-first/drawer-only, extra sections,
  or incompatible blocks reject with a precise `MenuDocumentError.path`.
- Preserve the existing explicit clear sentinel (`null` at the route or an empty
  document normalized before persistence). Every persisted non-empty document
  must satisfy the topology above.
- Stored read preserves valid IDs. Missing/duplicate legacy IDs derive from the
  section/block structural path and deterministic suffix allocation. Repeating
  the same read yields deeply equal bytes.
- Ambiguous topology and unknown/future keys remain fail-closed; the adapter does
  not guess or persist a rewrite.
- Export a pure effective-device helper used later to decide whether any device
  authors a sticky scrolled variant.

## Security Contract

Existing internal Menu writes only: session/API-key behavior, `menus:write`,
CSRF, admin-write rate limiting, strict route envelope, and `mapMenuError` remain.
Nested validation rejects unknown data before persistence. No public write,
nonce/captcha, secret, or scanner exception is introduced.
