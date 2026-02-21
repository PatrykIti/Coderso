# TASK-058-05: Admin Shell Global Request Minimization
# FileName: TASK-058-05_Admin_Shell_Global_Request_Minimization.md

**Priority:** High  
**Category:** App Shell/State Management  
**Estimated Effort:** Large  
**Dependencies:** TASK-058-02, TASK-058-03  
**Status:** To Do

---

## Overview
Ograniczyc globalne requesty wykonywane przez shell/topbar (np. `me`, `assistant/status`, `user-settings`, `admin-theme-profiles`) przy kazdej nawigacji i mountach komponentow.

## Security Contract
- **Visibility:** `internal` (bez nowych endpointow)
- **Auth path:** bez zmian (admin session)
- **Rate-limit bucket:** bez zmian (`admin_read`)
- **Contract change:** brak zmian payload/API; optymalizacja klienta i cyklu zycia komponentow

## Scope
1. `AdminApp`:
   - ograniczyc `me()` do stabilnego auth bootstrap flow,
   - usunac zaleznosci powodujace ponowne `me()` przy kazdej zmianie sciezki.
2. `AssistantPanel`:
   - lazy-load status/settings przy otwarciu panelu (lub single-shot cache),
   - brak stalego odpytywania przy kazdym mount.
3. `AdminThemeSwitcher`:
   - korzystac z cached client (`listAdminThemeProfilesCached`) zamiast surowego fetch.
4. Event `theme:updated`:
   - odswiezac tylko to, co konieczne (bez lawiny refreshy settings + theme).

## Sub-Tasks
1. Zmienic auth bootstrap w `AdminApp` na single-shot flow.
2. Przeniesc `AssistantPanel` na lazy-load state.
3. Zmienic `AdminThemeSwitcher` na cached read client.
4. Ograniczyc scope `theme:updated` do minimalnego refresh.
5. Dodac testy request budget dla shell/topbar.

## Files to Create / Change
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/shared/AdminThemeSwitcher.tsx`
- `core/admin/services/authClient.ts` (jesli potrzebny cache bootstrap)
- `tests/integration/ui/admin-shell-request-budget.test.tsx` (new)
- `tests/unit/ui/assistant-panel-lazy-load.test.tsx` (new)

## Pseudocode
```ts
AdminApp.boot():
  if (isProtectedRoute) await ensureAuthOnce()
  if (authOk) loadSettingsOnce()

AssistantPanel.onOpen():
  if (!loadedYet) loadRuntimeStateCached()

onThemeUpdated():
  refreshAdminThemeOnly()
```

## Acceptance Criteria
1. Nawigacja miedzy ekranami nie wywoluje wielokrotnych globalnych odczytow.
2. `AssistantPanel` nie pobiera statusu dopoki uzytkownik go nie otworzy (lub ma dedupe cache).
3. `AdminThemeSwitcher` nie spamuje endpointa przy kazdym mount.

## Testing Requirements
- Integration: route transitions (`entries -> pages -> menus -> entries`) z limitem global reads.
- Unit: lazy-load panelu asystenta i dedupe przy ponownym otwarciu.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (global shell reads)
