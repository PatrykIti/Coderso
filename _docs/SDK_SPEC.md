# SDK Spec (v1)

Specyfikacja publicznego SDK dla autorow pluginow. Dokument opisuje
kontrakt miedzy pluginem a core. Jest to jedyny dozwolony interfejs
integracji z core.

## Cele

- Stabilny, wersjonowany kontrakt API dla pluginow.
- Jeden wspolny SDK dla server i client.
- Typy TypeScript dostarczane przez core.

## Nie-cele

- Sandbox dla nieufnego kodu.
- Bezposredni dostep do wewnetrznej bazy core.
- Wsparcie dla CommonJS (ESM only).

---

## Wersjonowanie i kompatybilnosc

- `SDK_API_VERSION = "1"`.
- `plugin.json` musi deklarowac `apiVersion`.
- Core odrzuca pluginy z niekompatybilnym `apiVersion`.
- Zmiany breaking -> nowa wartosc `apiVersion`.
- `@core/sdk` jest wersjonowane semverem razem z core.
- Major `@core/sdk` mapuje sie na `apiVersion`.
- Minor/patch musza byc wstecznie kompatybilne.
- `react` i `react-dom` musza pasowac do wersji core (ten sam major).

---

## Sciezki importow

ESM only:
- `@core/sdk/server`
- `@core/sdk/client`
- `@core/sdk/shared` (typy wspolne)

SDK dostarczane przez core jako dependency runtime (externals).

---

## External dependencies (must be external)

Plugin bundle nie moze zawierac ponizszych paczek (external):
- react
- react-dom
- react/jsx-runtime
- react/jsx-dev-runtime
- @core/sdk/server
- @core/sdk/client
- @core/sdk/shared

Zasady:
- plugin deklaruje je jako `peerDependencies`.
- core dostarcza runtime implementacje.
- w `peerDependencies` uzywamy pakietu `@core/sdk` (subpath exports).
- wersje peerDependencies musza byc zgodne z wersja core.

Przyklad `package.json` (skrot):

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@core/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@core/sdk": "^1.0.0"
  }
}
```

---

## Kontrakty entrypointow pluginu

Server entrypoint (`dist/server.mjs`):

- eksport `default` funkcji `register(ctx)`
- brak efektow ubocznych na poziomie importu

Client entrypoint (`dist/client.mjs`):

- opcjonalny eksport `registerAdmin(ctx)`
- opcjonalny eksport `registerBlocks(ctx)`

---

## Helpery SDK

Server:

```ts
import { definePlugin } from "@core/sdk/server";

export default definePlugin((ctx) => {
  ctx.hooks.addAction("content:save", onSave);
  ctx.routes.register({
    method: "POST",
    path: "/sync",
    handler: async (req) => new Response("ok"),
  });
});

function onSave(payload, hookCtx) {
  const userId = hookCtx.user?.id;
  // Use hookCtx for request/user context.
}
```

Client:

```ts
import { defineAdmin } from "@core/sdk/client";

export const registerAdmin = defineAdmin((ctx) => {
  ctx.ui.registerAdminPage({
    path: "/settings/seo",
    title: "SEO",
    component: SeoSettings,
  });
});
```

---

## Server SDK

### ServerContext

Minimalny kontrakt:

```ts
export interface ServerContext {
  apiVersion: "1";
  plugin: {
    name: string;
    version: string;
  };
  logger: Logger;
  config: ConfigAPI;
  hooks: HooksAPI;
  routes: RoutesAPI;
  assets: AssetsAPI;
  permissions: PermissionsAPI;
  settings: SettingsAPI;
  storage: StorageAPI;
}
```

### HooksAPI

```ts
export interface HookContext {
  requestId: string;
  method?: string;
  path?: string;
  locale?: string;
  session?: { id: string; userId: string };
  user?: { id: string; email: string; roles: string[] };
  ip?: string;
  userAgent?: string;
}

Locale rules:
- primary z ustawien core (site locale)
- fallback z `Accept-Language` (jesli ustawienie nie istnieje)
- ostatecznie `en`
```

```ts
export interface HooksAPI {
  addAction<T>(name: string, fn: (payload: T, ctx: HookContext) => void): void;
  addFilter<T>(name: string, fn: (value: T, ctx: HookContext) => T): void;
  removeAction<T>(name: string, fn: (payload: T, ctx: HookContext) => void): void;
  removeFilter<T>(name: string, fn: (value: T, ctx: HookContext) => T): void;
}
```

### RoutesAPI

```ts
export interface RoutesAPI {
  register(input: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string; // bez prefiksu, core doda /api/plugins/<name>
    handler: (req: Request) => Response | Promise<Response>;
  }): void;
}
```

### PermissionsAPI

```ts
export interface PermissionsAPI {
  has(permission: string): boolean;
  require(permission: string): void; // rzuca error jesli brak
}
```

### SettingsAPI

```ts
export interface SettingsAPI {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}
```

### StorageAPI

```ts
export interface StorageAPI {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}
```

---

## Client SDK

### ClientContext

```ts
export interface ClientContext {
  apiVersion: "1";
  plugin: {
    name: string;
    version: string;
  };
  ui: AdminUIAPI;
  blocks: BlocksAPI;
  assets: AssetsAPI;
  permissions: PermissionsAPI;
  settings: SettingsAPI;
  http: HttpAPI;
}
```

### AdminUIAPI

```ts
export interface AdminUIAPI {
  registerAdminPage(input: {
    path: string;
    title: string;
    component: React.ComponentType<any>;
  }): void;
  registerDashboardWidget(input: {
    id: string;
    title: string;
    component: React.ComponentType<any>;
  }): void;
  registerSettingsSection(input: {
    id: string;
    title: string;
    component: React.ComponentType<any>;
  }): void;
}
```

### BlocksAPI

```ts
export interface BlocksAPI {
  registerBlock(input: {
    type: string;
    schema: Record<string, any>;
    render: React.ComponentType<any>;
    editor: React.ComponentType<any>;
  }): void;
}
```

### HttpAPI

```ts
export interface HttpAPI {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}
```

### AssetsAPI

```ts
export interface AssetsAPI {
  getUrl(path: string): string;
  getPublicPath(path: string): string;
}
```

Usage:

```ts
const iconUrl = ctx.assets.getUrl("icon.png");
const iconPath = ctx.assets.getPublicPath("icon.png");
```

---

## Kontrakty runtime

- `register(ctx)` powinno byc idempotentne.
- Import modulu nie powinien wykonywac logiki (tylko deklaracje).
- Wszystkie rejestracje powinny korzystac z SDK.
- Hook handlers zawsze dostaja `HookContext` jako drugi argument.

---

## Kontrakty stylow

- Plugin CSS dostarczony w `dist/style.css`.
- Plugin nie powinien modyfikowac globalnych styli core bez prefixu.
- Zalecany prefix klas pluginu: `.plugin-<name>-*`.

---

## Dostep do danych

- Plugin nie ma bezposredniego dostepu do DB core.
- Dostep odbywa sie przez API SDK (SettingsAPI, StorageAPI, i endpointy core).

---

## Error handling

- Bledy w pluginie logowane z nazwa i wersja.
- Core powinien izolowac bledy pluginu w hookach i routach.

---

## Zakres SDK do rozszerzenia (v1+)

- UI components z core (design system).
- Integracje ecommerce (payments, shipping).
- Webhook helpers.
