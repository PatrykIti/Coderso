# TASK-053-07: Admin Cache Layer (WordPress-like)
# FileName: TASK-053-07_Admin_Cache_Layer.md

**Priority:** High  
**Category:** Admin/UI + Core/Platform  
**Estimated Effort:** Large  
**Dependencies:** TASK-053-02  
**Status:** Planned  

---

## Goal
Provide WordPress-like admin performance by caching list/editor data across tabs, hydrating instantly from cache, and revalidating in the background with automatic cross-tab refresh.

## Requirements
1. **Cross-tab cache**: use `localStorage` with TTL and validation.
2. **Auto refresh**: updates in one tab should refresh other tabs automatically.
3. **Safe editing**: do not overwrite unsaved changes in editors; show a "remote update" hint instead.
4. **Consistency**: all lists + editors should use the same caching primitives.
5. **No security regression**: do not cache sensitive/auth-only data beyond existing session scope.

---

## Architecture

### 1) Cache Utilities
Create shared helpers in `core/admin/utils/`:

- `storageCache.ts`
  - `readStorageCache(key, ttlMs, validator, storage)`
  - `writeStorageCache(key, value, storage)`
  - `clearStorageCache(key, storage)`

- `cacheBus.ts`
  - `broadcastCacheEvent({ key, action, payload? })`
  - `subscribeCacheEvents(handler)`
  - use `BroadcastChannel` with `storage` event fallback

### 2) Cache Policy
New `core/admin/services/cachePolicy.ts`:
- per-resource TTLs (default 5 min)
- example keys:
  - `pages:list`
  - `pages:detail:<id>`
  - `entries:list:<typeSlug>`
  - `entries:detail:<typeSlug>:<id>`
  - `contentTypes:list`
  - `contentTypes:detail:<id>`
  - `widgetTemplates:list`
  - `widgetTemplates:detail:<id>`
  - `media:list`

### 3) Service Clients (cache + invalidation)
Add cached wrappers for each API resource:

- `pagesClient.ts`
  - `listPagesCached`, `getPageCached`
  - update cache + broadcast on create/update/delete/publish

- `entriesClient.ts`
  - `listEntriesCached(typeSlug)`, `getEntryCached(typeSlug, id)`
  - update cache + broadcast on create/update/delete/publish

- `contentTypesClient.ts`
  - refactor to new cache utils (localStorage, not session)

- `widgetTemplatesClient.ts` or hook layer
  - cached list/detail + broadcast

- `mediaClient.ts`
  - cached list + broadcast

### 4) UI Integration

#### Lists
- Hydrate immediately from cache, then revalidate in background.
- On cache event, auto-refresh list if no local action in progress.

#### Editors
- Hydrate from cache.
- Background revalidate.
- If `hasUnsavedChanges`, do not overwrite.
- Show hint: "Updated in another tab" with a manual refresh button.

### 5) Tests
- Unit tests for cache utilities (read/write/ttl).
- Client tests for cached list/detail + invalidation.
- UI tests to confirm immediate render when cache present.

### 6) Docs
- `_docs/ADMIN_CACHE.md` (policy, TTL, invalidation, safety rules)
- Changelog entry for this task.

---

## Acceptance Criteria
1. Admin lists render instantly when cache exists.
2. Editors hydrate instantly when cache exists.
3. Edits in one tab refresh other tabs automatically.
4. Unsaved changes are never overwritten.
5. No sensitive data cached beyond local user session.

---

## Implementation Checklist

| Area | File(s) | Action |
| --- | --- | --- |
| Cache utils | `core/admin/utils/storageCache.ts` | add generic localStorage cache helpers |
| Cache bus | `core/admin/utils/cacheBus.ts` | BroadcastChannel + storage fallback |
| Policy | `core/admin/services/cachePolicy.ts` | TTL + keys |
| Pages | `core/admin/services/pagesClient.ts` | cached list/detail + invalidation |
| Entries | `core/admin/services/entriesClient.ts` | cached list/detail + invalidation |
| Content types | `core/admin/services/contentTypesClient.ts` | refactor to shared cache helpers |
| Templates | `core/admin/services/widgetTemplatesClient.ts` + hooks | cached list/detail |
| Media | `core/admin/services/mediaClient.ts` | cached list |
| UI lists | `PageListPage`, `EntryListPage`, `ContentTypeList`, etc. | hydrate from cache, revalidate |
| UI editors | `PageEditor`, `EntryEditor`, `ContentTypeEditor` | cache hydrate + unsaved guard |
| Tests | `tests/unit/admin/*`, `tests/unit/ui/*` | cache coverage |
| Docs | `_docs/ADMIN_CACHE.md` | new spec |

---

## Notes
- Use **localStorage** for cross-tab persistence.
- Keep cache TTL modest (default 5 min).
- Prefer background revalidation to keep UI snappy.

