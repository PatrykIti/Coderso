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
core/server/dev.ts        # dev bootstrap (start HTTP + optional Vite proxy)
```

---

## Implementation Checklist

## Implementation Order (recommended)

1) `core/server/routes/index.ts` – agregacja routow.\n
2) `core/server/router.ts` – matchowanie sciezek + params.\n
3) `core/server/httpServer.ts` – Bun.serve + wykonanie routow.\n
4) `core/admin/index.html`, `core/admin/main.tsx`, `core/admin/app/AdminApp.tsx`.\n
5) `core/vite.config.ts` + `core/package.json` + `core/server/dev.ts`.\n
6) Testy: `routeMatcher`, `errorHandler`, integracyjne route tests.\n

## RouteContext contract (explicit)

**Source of truth:** `core/server/router.ts` + `core/server/httpServer.ts`.

Minimalny kontrakt, ktory musi byc wypelniony przez HTTP handler:

```ts
type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: { id: string; email?: string; name?: string | null };
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  setCookie?: (name: string, value: string, options: CookieOptions) => void;
  clearCookie?: (name: string) => void;
};

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
};
```

**Wypelnianie pola:**
- `params`: wynik `matchRoute`.\n
- `query`: mapowanie z `URLSearchParams` (tylko pierwsza wartosc).\n
- `body`: JSON dla POST/PATCH/PUT, `undefined` dla GET/DELETE.\n
- `headers`: lowercase keys (`req.headers` -> obiekt).\n
- `cookies`: z parsowania `Cookie` header.\n
- `ip`: `req.headers.get("x-forwarded-for")` lub `req.ip`.\n
- `userAgent`: `req.headers.get("user-agent")`.\n
- `user` + `sessionId`: ustawiane przez `attachUserFromSession(ctx)`.\n

---

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

**Cookies:**
- Dodaj parser `Cookie` header -> `{ [key]: value }`.
- `setCookie` i `clearCookie` zwracaja `Set-Cookie` na response.
- Utrzymuj `httpOnly`, `secure`, `sameSite`, `path`, `maxAge`.

**Body parsing:**
- Dla `Content-Type: application/json` zparsuj JSON i obsluz error 400.
- Dla innych typow zwracaj `undefined` (uploady maja osobny handler).

**Static assets:**
- `/admin/assets/*` oraz `/admin/favicon.ico` serwuj z `core/dist/client`.\n
- W prod: `Bun.file()` + `Response` z poprawnym `Content-Type`.\n
- W dev: jesli ustawione `VITE_DEV_SERVER_URL`, proxy `/admin/*` do Vite.\n

**SPA fallback:**
- Wszystkie sciezki `/admin/*` ktore nie sa statycznym assetem -> `index.html`.\n
- To pozwala na client-side routing w `AdminApp`.\n

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

**Match rules:**
- Porownuj liczbe segmentow.\n
- `:param` zawsze pasuje.\n
- Dopuszczaj trailing slash (`/admin/` == `/admin`).\n

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

**Routing pomocniczy:**
- Dodaj helper `matchPath(path, pattern)` (np. `\"/admin/pages/:id\"`).
- `PageEditor` dostaje `id` z params (moze byc jako prop).
- Normalizuj `path` (usun trailing slash i query string).

**entry-server.tsx**
- `export function render(path: string)` -> `renderToString(<AdminApp path={path} />)`.
- Uzyj `import { renderToString } from "react-dom/server"`.\n

---

### 5) Vite config + dev script

**File:** `core/vite.config.ts`
- `root: path.resolve(__dirname, "./admin")`
- `build.outDir: path.resolve(__dirname, "./dist/client")`
- SSR build: `build.ssr` + `entry-server.tsx`.
- `base: "/admin/"` dla poprawnych sciezek assetow w prod.

**File:** `core/package.json`
- `dev` uruchamia:
  - Bun HTTP server (np. `bun run server/dev.ts`).
  - Vite dev server dla admina (np. `vite --config vite.config.ts`).

**File:** `core/server/dev.ts`
- startuje `httpServer.ts`
- w dev moze proxy `/admin` do Vite (np. `VITE_DEV_SERVER_URL`).

---

## Dev flow vs SSR (explicit)

**Opcja A (zalecana na start): Vite dev server + proxy**\n
- Uruchom Vite z `core/admin` jako root.\n
- `httpServer.ts` proxy `GET /admin/*` do `VITE_DEV_SERVER_URL`.\n
- API (`/admin/api/*`) obslugiwane lokalnie przez Bun.\n
- Szybszy dev feedback, brak SSR w dev.\n

**Opcja B (SSR w Bun):**\n
- `httpServer.ts` importuje `entry-server.tsx` i renderuje HTML.\n
- `dist/client` dostarcza assety klienta.\n
- Wymaga `vite build --ssr` + `vite build`.\n
- Uzywaj w produkcji lub w testach integracyjnych SSR.\n

**Env flags:**\n
- `VITE_DEV_SERVER_URL` (np. `http://localhost:5173`) -> proxy `/admin/*`.\n
- `ADMIN_SSR=1` -> wymusza SSR w Bun.\n
- `ADMIN_SSR=0` -> zawsze SPA (index.html).\n

---

## UI Routing Map (Auth vs Admin)

**Public (bez sesji):**\n
- `/admin/login`\n
- `/admin/2fa`\n
- `/admin/reset`\n
- `/admin/reset/confirm`\n

**Protected (wymaga sesji):**\n
- `/admin`\n
- `/admin/pages` + `/admin/pages/:id`\n
- `/admin/menus`\n
- `/admin/media`\n
- `/admin/users`\n
- `/admin/settings`\n
- `/admin/store`\n

**Routing rules:**\n
1) Brak sesji + wejscie na protected -> redirect do `/admin/login`.\n
2) Sesja aktywna + wejscie na `/admin/login` -> redirect do `/admin`.\n
3) `/admin/2fa` uzywane po loginie, jesli backend zwroci info o MFA.\n

**Skad sesja?**\n
- `GET /admin/api/auth/me` zwraca `{ user }` lub 401.\n
- AdminApp moze zrobic lightweight `me()` i ustawic `isAuthenticated`.\n

---

## Reference snippets (for implementation)

### A) `matchRoute()` / `matchPath()` (example)

```ts
export function normalizePath(input: string) {
  const url = input.split(\"?\")[0] ?? input;
  if (url.length > 1 && url.endsWith(\"/\")) return url.slice(0, -1);
  return url;
}

export function matchRoute(pattern: string, path: string) {
  const normalizedPattern = normalizePath(pattern);
  const normalizedPath = normalizePath(path);

  const patternParts = normalizedPattern.split(\"/\").filter(Boolean);
  const pathParts = normalizedPath.split(\"/\").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { matched: false, params: {} as Record<string, string> };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    const value = pathParts[i];
    if (part.startsWith(\":\")) {
      params[part.slice(1)] = decodeURIComponent(value ?? \"\");
      continue;
    }
    if (part !== value) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}
```

### B) `AdminApp` (pseudo‑router)

```tsx
const routes = [
  { pattern: \"/admin\", element: <DashboardPage /> },
  { pattern: \"/admin/login\", element: <LoginPage /> },
  { pattern: \"/admin/2fa\", element: <TwoFactorPage /> },
  { pattern: \"/admin/reset\", element: <ResetPasswordPage /> },
  { pattern: \"/admin/reset/confirm\", element: <SetPasswordPage /> },
  { pattern: \"/admin/pages\", element: <PageListPage /> },
  { pattern: \"/admin/pages/:id\", element: <PageEditor pageId={params.id} /> },
  { pattern: \"/admin/media\", element: <MediaLibraryPage /> },
  { pattern: \"/admin/menus\", element: <MenuEditorPage /> },
  { pattern: \"/admin/users\", element: <UsersRolesPage /> },
  { pattern: \"/admin/settings\", element: <SettingsPage /> },
  { pattern: \"/admin/store\", element: <PluginStorePage /> },
];

export function AdminApp({ path }: { path: string }) {
  const normalized = normalizePath(path);
  for (const route of routes) {
    const result = matchRoute(route.pattern, normalized);
    if (result.matched) return route.element;
  }
  return <NotFound />;\n
}
```

### C) `handleApi(req)` (Bun server outline)

```ts
async function handleApi(req: Request, url: URL) {
  const { router } = buildRouter(); // registerAllRoutes
  const path = url.pathname.replace(\"/admin/api\", \"\") || \"/\";

  for (const route of router.routes) {
    if (route.method !== req.method) continue;
    const match = matchRoute(route.path, path);
    if (!match.matched) continue;

    const ctx: RouteContext = {
      params: match.params,
      query: Object.fromEntries(url.searchParams.entries()),
      body: await parseJson(req),
      headers: Object.fromEntries(req.headers.entries()),
      cookies: parseCookies(req.headers.get(\"cookie\")),
      ip: req.headers.get(\"x-forwarded-for\") ?? undefined,
      userAgent: req.headers.get(\"user-agent\") ?? undefined,
      setCookie: (name, value, options) => pushSetCookie(resHeaders, name, value, options),
      clearCookie: (name) => pushSetCookie(resHeaders, name, \"\", { maxAge: 0, ... }),
    };

    await attachUserFromSession(ctx);

    try {
      let result: unknown = undefined;
      for (const handler of route.handlers) {
        const out = await handler(ctx);
        if (out !== undefined) result = out;
      }
      return jsonResponse(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  }

  return new Response(\"Not Found\", { status: 404 });
}
```

---

## New Files to Create

- `core/server/httpServer.ts`
- `core/server/routes/index.ts`
- `core/admin/index.html`
- `core/admin/main.tsx`
- `core/admin/entry-server.tsx`
- `core/admin/app/AdminApp.tsx`
- `core/server/dev.ts`
- `tests/unit/server/routeMatcher.test.ts`
- `tests/unit/server/errorHandler.test.ts`

---

## Testing Requirements

- [ ] `tests/unit/server/routeMatcher.test.ts` (param matching, 404).
- [ ] `tests/unit/server/errorHandler.test.ts` (mapowanie error -> JSON).
- [ ] `tests/integration/routes/*.test.ts` nadal przechodza.
- [ ] `tests/integration/routes/auth.test.ts` działa po uruchomieniu serwera.

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (sekcja o HTTP server + entrypoints)
- `_docs/CMS_SPEC.md` (admin UI bootstrap / dev run)
- `_docs/README.md` (jak uruchomic core dev)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-core-http-server-admin-ui.md`
- Notes: Bun HTTP server + Admin UI bootstrap.

---

## Additional Docs

- `_docs/AUTH_SPEC.md`
- `_docs/SECURITY_SPEC.md`
