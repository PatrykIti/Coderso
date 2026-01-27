# TASK-004-01: Core HTTP Server and Admin UI Bootstrap
# FileName: TASK-004-01_Core_HTTP_Server_and_Admin_UI_Bootstrap.md

**Priority:** High
**Category:** Core/Platform
**Estimated Effort:** Large
**Dependencies:** TASK-001, TASK-024
**Status:** To Do

---

## Overview

Uruchomienie realnego serwera HTTP dla core (Bun) oraz bootstrapping Admin UI
(Vite entry + minimalny router). Bez tego nie da sie wejsc na `/admin` ani
wywolywac `/admin/api/*`.

**Goals:**
- `Bun.serve` obsluguje `/admin/api/*` oraz `/admin/*`.
- Admin UI ma `index.html` + `main.tsx` + `AdminApp`.
- Router HTTP mapuje `/admin/api` na `core/server/routes/*`.
- W dev: `bun --cwd core dev` uruchamia serwer + Vite.

---

## Architecture

```
core/server/
  httpServer.ts           # Bun.serve + API router
  router.ts               # route matching + params
  routes/index.ts         # registerAllRoutes
  errorHandler.ts         # ApiError + toErrorResponse
  middleware/
    auth.ts
    rbac.ts

core/admin/
  index.html              # Vite entry
  main.tsx                # hydrateRoot/createRoot
  entry-server.tsx        # SSR render
  app/
    AdminApp.tsx          # minimalny router oparty o pathname

core/vite.config.ts       # root=admin, outDir=dist/client, SSR entry
core/package.json         # dev script
```

---

## Implementation Checklist

### 1) HTTP server (Bun)

**File:** `core/server/httpServer.ts`

- Zaimplementuj `Bun.serve({ fetch })`.
- Dla `/admin/api/*`:
  - wybierz route w `router.routes`.
  - zbuduj `RouteContext` z:
    - `params` (dopasowanie z `:id`, `:type`, itp.)
    - `query` (z URLSearchParams)
    - `body` (JSON tylko dla POST/PATCH/PUT, inaczej `undefined`)
    - `headers`, `cookies`, `ip`, `userAgent`
    - `setCookie` / `clearCookie` (response helpers)
  - odpal `attachUserFromSession(ctx)` przed handlerami.
  - wykonaj `handlers` sekwencyjnie (jak middleware). Ostatni zwraca data.
  - bledy mapuj przez `toErrorResponse` + status code.

**Minimalny error mapping (serwer):**
- `auth_required` => 401
- `forbidden` => 403
- `validation_error` => 400
- inne => 500

**JSON response:**
- domyslnie `200` + `application/json` + `JSON.stringify(payload)`.

---

### 2) Route matching w routerze

**File:** `core/server/router.ts`

Dodaj helpery:
- `matchRoute(pathPattern: string, path: string)` -> `{ matched, params }`.
- Obsłuż segmenty `:id`, `:type`, `:revisionId`.

**Przyklad logiki:**
- split `/pages/:id` i `/pages/123` po `/`.
- segment `:id` -> `params.id = "123"`.
- liczba segmentow musi pasowac.

Dodaj test:
- `tests/unit/server/routeMatcher.test.ts`.

---

### 3) Rejestracja routow

**File:** `core/server/routes/index.ts`

- `export function registerAllRoutes(router, deps)`.
- Zarejestruj:
  - `authRoutes`
  - `pageRoutes`
  - `mediaRoutes`
  - `menuRoutes`
  - `settingsRoutes`
  - `contentTypeRoutes`
  - `contentEntryRoutes`
  - `searchRoutes`
  - `auditRoutes`

**Deps:**
- `requireAuth` (z `middleware/auth.ts`)
- `requirePermission` (z `middleware/rbac.ts`)
- `validate` (docelowo z `TASK-020`)

---

### 4) Admin UI bootstrap

**Files:**
- `core/admin/index.html`
- `core/admin/main.tsx`
- `core/admin/app/AdminApp.tsx`
- `core/admin/entry-server.tsx`

**index.html**
```html
<div id="root"></div>
<script type="module" src="/main.tsx"></script>
```

**main.tsx**
- `createRoot` lub `hydrateRoot`.
- `render(<AdminApp path={window.location.pathname} />)`.

**AdminApp.tsx**
- Minimalny router (switch po `path`):
  - `/admin` -> `DashboardPage`
  - `/admin/login` -> `LoginPage`
  - `/admin/2fa` -> `TwoFactorPage`
  - `/admin/reset` -> `ResetPasswordPage`
  - `/admin/reset/confirm` -> `SetPasswordPage`
  - `/admin/pages` -> `PageListPage`
  - `/admin/pages/:id` -> `PageEditor`
  - `/admin/media` -> `MediaLibraryPage`
  - `/admin/menus` -> `MenuEditorPage`
  - `/admin/users` -> `UsersRolesPage`
  - `/admin/settings` -> `SettingsPage`
  - `/admin/store` -> `PluginStorePage`
- dla nieznanych sciezek: fallback “Not found”.

**entry-server.tsx**
- `export function render(path: string)` -> `renderToString(<AdminApp path={path} />)`.

---

### 5) Vite config + dev script

**File:** `core/vite.config.ts`
- `root: path.resolve(__dirname, "./admin")`
- `build.outDir: path.resolve(__dirname, "./dist/client")`
- SSR build: `build.ssr` + `entry-server.tsx`.

**File:** `core/package.json`
- `dev` uruchamia:
  - Bun HTTP server (np. `bun run server/dev.ts`).
  - Vite dev server dla admina (np. `vite --config vite.config.ts`).

---

## New Files to Create

- `core/server/httpServer.ts`
- `core/server/routes/index.ts`
- `core/admin/index.html`
- `core/admin/main.tsx`
- `core/admin/entry-server.tsx`
- `core/admin/app/AdminApp.tsx`
- `tests/unit/server/routeMatcher.test.ts`
- `tests/unit/server/errorHandler.test.ts`

---

## Testing Requirements

- [ ] `tests/unit/server/routeMatcher.test.ts` (param matching, 404).
- [ ] `tests/unit/server/errorHandler.test.ts` (mapowanie error -> JSON).
- [ ] `tests/integration/routes/*.test.ts` nadal przechodza.

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (sekcja o HTTP server + entrypoints)
- `_docs/CMS_SPEC.md` (admin UI bootstrap / dev run)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-core-http-server-admin-ui.md`
- Notes: Bun HTTP server + Admin UI bootstrap.

---

## Additional Docs

- `_docs/AUTH_SPEC.md`
- `_docs/SECURITY_SPEC.md`
