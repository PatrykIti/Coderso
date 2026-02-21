# TASK-058-05: Admin Shell Global Request Minimization
# FileName: TASK-058-05_Admin_Shell_Global_Request_Minimization.md

**Priority:** High  
**Category:** App Shell/State Management  
**Estimated Effort:** Large  
**Dependencies:** TASK-058-02, TASK-058-03  
**Status:** Done (2026-02-21)

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

## Completion Notes (2026-02-21)
- `AdminApp` auth bootstrap switched to cached single-shot flow:
  - replaced route-coupled `me()` effects with `resolveAuthBootstrap()` orchestration,
  - removed repeated protected/public path-driven auth calls.
- `AdminApp` theme refresh flow minimized:
  - switched to cached clients (`listAdminThemeTemplatesCached`, `listAdminThemeProfilesCached`),
  - `theme:updated` scope reduced to theme refresh only (no settings refresh cascade).
- `AssistantPanel` moved to lazy runtime load:
  - runtime state loads on first panel open,
  - added runtime snapshot cache + in-flight dedupe:
    - `loadAssistantRuntimeStateCached`
    - `clearAssistantRuntimeStateCache`
    - `shouldLoadAssistantRuntimeState`
- `AdminThemeSwitcher` switched to cached list reads:
  - now uses `listAdminThemeProfilesCached`,
  - loads profiles on dropdown open instead of every topbar mount.
- Added tests:
  - `tests/unit/ui/assistant-panel-lazy-load.test.tsx`
  - `tests/integration/ui/admin-shell-request-budget.test.tsx`
  - updated `tests/unit/admin/adminApp.test.tsx` with theme refresh-scope assertion.
- Verified checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/admin/adminApp.test.tsx tests/unit/ui/assistant-panel.test.tsx tests/unit/ui/assistant-panel-lazy-load.test.tsx tests/unit/ui/theme-switcher.test.tsx tests/integration/ui/admin-shell-request-budget.test.tsx`
