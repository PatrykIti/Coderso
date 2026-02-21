# TASK-058-02: Shared Dedupe Cache for Global Admin Reads
# FileName: TASK-058-02_Shared_Dedupe_Cache_for_Global_Admin_Reads.md

**Priority:** High  
**Category:** Frontend Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-058-01  
**Status:** To Do

---

## Overview
Ujednolicic odczyty globalne admina (`user-settings`, `assistant/status`, `admin-theme-profiles`, opcjonalnie `me`) tak, aby mialy wspolny cache + in-flight dedupe i nie byly odpalane wielokrotnie przez wiele komponentow naraz.

## Security Contract
- **Visibility:** `internal` (bez nowych publicznych endpointow)
- **Auth path:** istniejace sesje admin + RBAC (bez zmian)
- **Rate-limit bucket:** istniejace `admin_read` / `admin_write` (bez zmian)
- **Contract change:** brak zmian API payload; tylko polityka klienta i cache

## Scope
1. Dodac wspolny helper `createReadThroughCache` dla read-only endpointow.
2. Podlaczyc helper do:
   - `getUserSettings`,
   - `getAssistantStatus`,
   - `listAdminThemeProfiles`.
3. Dodac jawne invalidatory cache:
   - po `setUserSetting`,
   - po aktywacji motywu,
   - po eventach, ktore realnie zmieniaja dane.
4. Utrzymac zgodnosc z cacheBus (cross-tab), bez triggerowania petli.

## Sub-Tasks
1. Zaimplementowac generyczny read-through cache helper.
2. Podlaczyc helper do globalnych read clients.
3. Dodac invalidatory po akcjach write.
4. Dodac testy dedupe/in-flight/ttl/invalidate.

## Files to Create / Change
- `core/admin/utils/readThroughCache.ts` (new)
- `core/admin/services/userSettingsClient.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/services/adminThemeClient.ts`
- `tests/unit/admin/read-through-cache.test.ts` (new)
- `tests/unit/services/user-settings-cache.test.ts` (new)
- `tests/unit/services/assistant-status-cache.test.ts` (new)

## Pseudocode
```ts
const cachedGetUserSettings = readThroughCache({
  key: "user-settings",
  ttlMs: 10_000,
  loader: () => apiRequest("/user-settings"),
})

setUserSetting(key, value):
  await apiRequest(...)
  cachedGetUserSettings.invalidate()
```

## Acceptance Criteria
1. Wielokrotne mounty komponentow nie duplikuja globalnych read requestow.
2. In-flight dedupe blokuje rownolegle identyczne fetch-e.
3. Invalidacja odswieza dane po zapisach.

## Testing Requirements
- Unit: hit/miss/ttl/in-flight/invalidate.
- Integration: dwa komponenty czytajace ten sam endpoint -> jeden request.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (global reads matrix)
