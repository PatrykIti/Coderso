# TASK-054-22-07: Custom Screens Admin Sidebar Shortcuts
# FileName: TASK-054-22-07_Custom_Screens_Admin_Sidebar_Shortcuts.md

**Priority:** High  
**Category:** Admin/UI + Navigation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-22-03, TASK-054-22-05  
**Status:** Done (2026-03-06)

---

## Overview

Rozszerzyc custom screens tak, aby wybrane ekrany mogly pojawiac sie jako szybkie skróty
w lewym menu admin UI, bez wchodzenia najpierw w liste `Screens`.

Cel UX:
- uzytkownik tworzy ekran np. `Katalog domow`,
- oznacza go jako sidebar shortcut,
- od tej chwili ma bezposredni link w lewym menu, zaraz po grupie `Coderso`,
- klik prowadzi do dedykowanego workflow rekordow tego ekranu.

---

## Security Contract

- **Visibility:** internal (`/admin/*`, `/admin/api/custom-screens*`)
- **Auth model:** authenticated admin session / internal admin API key scopes
- **Rate-limit bucket:** `admin_read` / `admin_write`
- **Anti-abuse controls:** brak publicznych endpointow; mutacje dalej przez CSRF + RBAC; nonce/HMAC/reCAPTCHA nie dotyczy

---

## Scope

1. Dodac metadata screena dla sidebar shortcut:
   - `showInSidebar`
   - opcjonalny `sidebarLabel`
2. Rozszerzyc custom screen builder o konfiguracje tego shortcutu.
3. Renderowac aktywne shortcuty po grupie `Coderso` w lewym menu admina.
4. Shortcut ma prowadzic do `/admin/coderso/custom-screens/:screenId/entries`.
5. Utrzymac aktualizacje nav po create/update/delete custom screena.

## Non-Goals

1. Osobne uprawnienia per shortcut.
2. Zagniezdzanie custom screens wewnatrz grupy `Coderso`.
3. Public runtime links lub zmiana zachowania public pages.

## Files to Create / Change

- `core/db/schema.ts`
- `core/db/migrations/*`
- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/server/validation/customScreenSchemas.ts`
- `core/admin/services/customScreensClient.ts`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/shared/SidebarNav.tsx`
- `core/admin/utils/adminPaths.ts`
- `tests/unit/customScreens/*`
- `tests/unit/ui/*nav*`
- `tests/unit/admin/admin-prefetch-policy.test.ts`

## Pseudocode

```ts
const shortcutItems = listCustomScreensCached()
  .filter((screen) => screen.status === "active" && screen.showInSidebar)
  .map((screen) => ({
    label: screen.sidebarLabel ?? screen.name,
    href: `/admin/coderso/custom-screens/${screen.id}/entries`,
  }));

mainSection.itemsAfterGroups = shortcutItems;
```

## Acceptance Criteria

1. Custom screen moze byc oznaczony jako sidebar shortcut w builderze.
2. Po zapisie aktywny screen pojawia sie w lewym menu po grupie `Coderso`.
3. Shortcut prowadzi do dedykowanego records workflow tego screena.
4. Zmiana nazwy / label / wlaczenia / usuniecia screena odswieza nav bez reloadu.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- unit: schema/service/client dla sidebar metadata
- unit: nav enrichment / sidebar render
- integration: custom screen builder + nav shortcut visibility

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
