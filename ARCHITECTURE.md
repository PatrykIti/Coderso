# WordPress-like CMS na Bun + React (core build + runtime pluginy)

## CEL PROJEKTU

Zbudować nowoczesny CMS / sklep internetowy z doświadczeniem developerskim jak Next.js
oraz doświadczeniem użytkownika jak WordPress.

### Założenia

- React + TypeScript
- shadcn/ui
- Tailwind CSS
- instalacja pluginów z panelu (bez rebuilda core)
- brak redeployu przy instalacji pluginów
- core budowany produkcyjnie (client + SSR)
- pluginy dostarczane jako prebuilt paczki ze store

### Czego NIE używamy

- Next.js
- PHP jako runtime
- Vite dev server w produkcji
- runtime-build całej aplikacji

### Czego używamy

- Bun (runtime)
- Vite (dev + build)
- React

---

## KLUCZOWA DECYZJA ARCHITEKTONICZNA (WYBRANY MODEL)

Hybryda:

- Core ma klasyczny build produkcyjny (Vite SSR: client + server).
- Pluginy są prebuilt po stronie dev/store i ładowane runtime.
- Instalacja pluginu = download + verify + unpack + register + load.
- Brak rebuilda core i brak redeployu przy instalacji pluginów.

To zachowuje UX WordPressa (plugin działa od razu), bez uruchamiania Vite w prod.

---

## WYSOKOPOZIOMOWA ARCHITEKTURA (PROD)

Browser
↓
Bun HTTP Server
↓
SSR Renderer (dist/server z buildu core)
↓
Plugin Loader (runtime)
↓
Dynamic import ESM (dist/server.mjs)
↓
Module Cache (ESM cache)

Statyczne zasoby:

- dist/client (core)
- dist/* pluginów (client + CSS)

---

## TRYB DEV

- Vite dev server w middleware mode dla core (HMR).
- Pluginy w dev budowane lokalnie przez autora (nie przez core).

---

## STRUKTURA REPOZYTORIUM

/core
  /server
    app.ts
    router.ts
    hooks.ts
    plugin-loader.ts

  /admin
    AdminApp.tsx
    menu.ts
    registry.ts

  /ui
    components/
    blocks/

/themes
  /default

/plugins-runtime      (NIE W GIT!)
  /seo-boost
    /1.0.0
  /payments-stripe
    /2.3.1

/data
  plugins.db

---

## PLUGIN = PREBUILT PACZKA ZE STORE

Plugin nie jest częścią repozytorium.
Plugin jest publikowany w store jako gotowe artefakty.

### Struktura paczki pluginu

/plugin.json
/dist/
  server.mjs
  client.mjs
  style.css
/public/ (opcjonalnie)

---

## PLUGIN MANIFEST

plugin.json

{
  "name": "seo-boost",
  "version": "1.0.0",
  "apiVersion": "1",
  "entry": {
    "server": "dist/server.mjs",
    "client": "dist/client.mjs",
    "styles": "dist/style.css"
  },
  "permissions": [
    "content:read",
    "content:write",
    "admin:ui"
  ],
  "integrity": {
    "sha256": "..."
  }
}

Podpis i metadane zaufania są dostarczane przez store (nie przez sam plugin).

---

## BUILD PLUGINU (PO STRONIE DEV/STORE)

- Dev buduje plugin do ESM (server + client + CSS).
- Artefakty są publikowane w store.
- Store wykonuje skany (SAST, CVE, licencje), podpisuje paczkę i wystawia hash.
- Core nie buduje pluginu, tylko weryfikuje i ładuje gotowe pliki.

---

## INSTALACJA PLUGINU (BEZ REBUILD CORE)

1. Admin wybiera plugin w zakładce Store.
2. Core pobiera paczkę (server-side).
3. Weryfikacja podpisu i checksum.
4. Rozpakowanie do /plugins-runtime/<name>/<version>.
5. Zapis w DB:
   - enabled = true
   - version
   - permissions
   - entrypointy
   - hash/signature
6. Runtime ładuje moduł serwera:

await import("file:///plugins-runtime/seo-boost/1.0.0/dist/server.mjs")

7. Plugin rejestruje hooki i rozszerzenia UI.

Brak restartu.
Brak rebuilda core.
Brak redeployu.

---

## RUNTIME LOADER (SERVER)

- Loader wykonuje import ESM na `dist/server.mjs`.
- Moduły są cache’owane przez ESM cache.
- Wyłączenie pluginu = usunięcie z registry (moduł zostaje w cache, ale hooki nie są wywoływane).
- Zmiana wersji = nowa ścieżka w import (cache per wersja).

---

## SYSTEM HOOKÓW (WORDPRESS STYLE)

Core udostępnia:

addAction(name, fn)
addFilter(name, fn)

Przykłady:

addAction("content:save", fn)
addFilter("render:html", fn)
addAction("admin:menu", fn)

Plugin w server.mjs:

export default function register() {
  addAction("content:save", onSave)
}

---

## ADMIN UI (PLUGINY)

Plugin może:

- dodać pozycję menu
- dodać stronę ustawień
- dodać widget dashboardu

API core:

registerAdminPage({ path, title, component })
registerDashboardWidget(...)
registerSettingsSection(...)

Loader UI:

- dynamic import `dist/client.mjs`
- dołączenie `dist/style.css`

---

## BLOKI / KOMPONENTY TREŚCI

Edytor oparty o JSON schema.

Plugin rejestruje blok:

registerBlock({
  type: "seo/meta",
  schema,
  render,
  editor
})

Blok pojawia się natychmiast w CMS.

---

## TAILWIND CSS – WAŻNE

Tailwind NIE jest generowany per request.

Zasada:
- plugin dostarcza skompilowany CSS w dist/style.css
- core nie przebudowuje Tailwinda przy instalacji pluginu

---

## BEZPIECZEŃSTWO (TRUST BY CURATION)

- Store wykonuje skany bezpieczeństwa i CVE przed publikacją.
- Paczki są podpisane, core weryfikuje podpis i hash.
- Brak sandboxu: plugin działa w tym samym procesie co core.
- Permissions w manifestach są warstwą logiczną, nie izolacją.
- Mechanizm revocation: lista zablokowanych wersji pluginów.

---

## DEPLOY

Core aplikacji:
- deploy przez Git / CI
- build produkcyjny (Vite SSR)

Pluginy:
- pobierane runtime ze store
- trzymane na persistent storage (plugins-runtime)
- brak redeployu po instalacji

Po deployu:
- registry pluginów ładowane z DB
- runtime ładuje aktywne pluginy z /plugins-runtime

---

## PODSUMOWANIE

TAK:
- pluginy prebuilt
- instalacja w panelu
- runtime load (bez rebuilda core)
- UX jak WordPress

NIE:
- klasyczny Next.js
- Vite dev server w produkcji
- runtime-build core

To jest realna architektura do zbudowania
WordPressa 2.0 w świecie Reacta.
