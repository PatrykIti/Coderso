# WordPress-like CMS na Bun + React (core build + runtime pluginy)

Dokument jest wzorcem technicznym. Na jego podstawie rozpisujemy taski
dla core, store i pluginow.

## Cel projektu

Zbudowac nowoczesny CMS / sklep internetowy z doswiadczeniem developerskim
jak Next.js oraz doswiadczeniem uzytkownika jak WordPress.

## Zakres i nie-cele

Zakres:
- Core SSR + admin w React.
- Pluginy instalowane runtime bez rebuilda core.
- Store z prebuilt paczkami pluginow.
- Curation + skany bezpieczenstwa po stronie store.

Nie-cele:
- Uruchamianie nieufnego kodu w sandboxie (brak izolacji procesowej).
- Vite dev server w produkcji.
- Runtime-build calej aplikacji.

## Zalozenia techniczne i operacyjne

- Hosting typu VM/container z mozliwoscia zapisu na dysk.
- Persistent storage dla `plugins-runtime`.
- Dostep do sieci z core do store (download paczek).
- Core budowany w CI/CD (dist/client + dist/server).
- Pluginy dostarczane jako ESM bundlowane paczki (bez TS/TSX w runtime).

## Terminologia

- Core: glowna aplikacja (SSR + admin).
- Plugin: rozszerzenie funkcji core (server + admin).
- Store: serwis dystrybucji pluginow, skanow i podpisow.
- Registry: stan zainstalowanych pluginow w DB.
- Runtime storage: katalog `plugins-runtime` z paczkami pluginow.

---

## Kluczowe decyzje architektoniczne

- Core budowany produkcyjnie (Vite SSR: client + server).
- Pluginy prebuilt po stronie dev/store.
- Instalacja pluginu = download + verify + unpack + register + load.
- Brak rebuilda core i brak redeployu przy instalacji pluginow.
- Trust by curation: store skanuje i podpisuje paczki.
- Brak sandboxu: plugin dziala w tym samym procesie co core.

---

## Schematy

### 1) Kontekst systemu (prod)

[Browser]
   |
   v
[Bun HTTP Server]
   |-- SSR renderer (dist/server)
   |-- Admin UI (dist/client)
   |-- Plugin loader (registry)
   |-- Static assets (dist/client + plugins dist)
   v
[DB] <-> [plugins-runtime]
   ^
   |
[Store API] (list, download, signature, revocation)

### 2) Build pipeline

Core (CI/CD):
source -> vite build (client) -> dist/client
source -> vite build --ssr -> dist/server

Plugin (dev/store):
source -> build (server ESM + client ESM + CSS) -> paczka ZIP
store -> skany + podpis -> publikacja

### 3) Lifecycle pluginu

Install:
store list -> download -> verify -> unpack -> register -> load

Update:
download nowej wersji -> verify -> unpack obok -> switch version -> (opcjonalny rollback)

Disable:
wylaczenie w registry -> hooki nieaktywne -> UI ukryte

Uninstall:
usuniecie z registry -> usuniecie katalogu -> cleanup assets

---

## Struktura repozytorium (docelowa)

/core
  /server               (Bun HTTP, SSR, routing)
  /admin                (Admin app)
  /ui                   (shared UI)
  /sdk                  (publiczny SDK dla pluginow)
  /plugins              (loader, registry, permissions)
  /store                (klient store + weryfikacja podpisu)
  /schemas              (JSON schema manifestu)
  /db                   (migracje, modele)
  /config               (konfiguracja + defaulty)

/themes
  /default

/dist                   (output build)
  /client
  /server

/plugins-runtime        (NIE W GIT!)
  /seo-boost/1.0.0
  /payments-stripe/2.3.1

/data
  plugins.db

---

## Core build (Vite SSR)

Wymagane outputy:
- dist/client: assety klienta (admin + public).
- dist/server: entry SSR dla Bun.

Oczekiwana konfiguracja build:
- `vite build --outDir dist/client`
- `vite build --outDir dist/server --ssr src/entry-server.tsx`

Core nie kompiluje pluginow w runtime.

---

## Specyfikacja paczki pluginu

Format: ZIP

Wymagane pliki:
/plugin.json
/dist/server.mjs          (ESM, server runtime)
/dist/client.mjs          (ESM, admin/editor UI)
/dist/style.css           (CSS pluginu)

Opcjonalne:
/public/                  (statyczne assety pluginu)

Wymagania build:
- ESM, bez TS/TSX w runtime.
- Wszelkie zaleznosci zewnatrz bundlowane.
- Dozwolone externale (v1):
  - react
  - react-dom
  - @core/sdk
- Brak `node_modules` w paczce.

---

## Manifest pluginu (plugin.json)

{
  "name": "seo-boost",
  "version": "1.0.0",
  "apiVersion": "1",
  "coreVersion": ">=0.1.0 <0.2.0",
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
  "metadata": {
    "title": "SEO Boost",
    "description": "Meta tagi i sitemap",
    "author": "Acme",
    "homepage": "https://example.com"
  },
  "integrity": {
    "sha256": "..."
  }
}

Weryfikacja:
- core sprawdza `apiVersion`, `coreVersion`, `integrity`.
- podpis i metadane zaufania dostarcza store (oddzielnie od plugin.json).

---

## Store i pipeline publikacji

Pipeline po stronie store:
1. Dev publikuje paczke ZIP.
2. Store wykonuje skany (SAST, CVE, licencje).
3. Store podpisuje paczke i publikuje metadata.

Minimalne API store:
- GET /plugins (lista)
- GET /plugins/:name (detale)
- GET /plugins/:name/versions/:version/metadata
- GET /plugins/:name/versions/:version/download
- GET /revocations.json

Weryfikacja podpisu:
- core posiada publiczny klucz store.
- signature dostarczana jako plik lub header (standard do ustalenia).

---

## Instalacja pluginu (core)

Algorytm:
1. Pobranie paczki do temp.
2. Weryfikacja signature + sha256.
3. Rozpakowanie do temp.
4. Walidacja manifestu (schema + wersje).
5. Atomowy move do /plugins-runtime/<name>/<version>.
6. Rejestracja w DB (enabled=true).
7. Runtime load (import server.mjs).

Zasady:
- Instalacja nie przebudowuje core.
- W razie bledu -> cleanup i status "failed".

---

## Runtime loader (server)

Zachowanie:
- Loader importuje `dist/server.mjs` dla kazdego aktywnego pluginu.
- ESM cache utrzymuje moduły per wersja.
- Zmiana wersji = zmiana sciezki -> nowy import.
- Disable = usuniecie z registry (hooki nie sa wywolywane).

Kontrakt pluginu (server):
- eksport `default function register(ctx)`.
- brak efektow ubocznych przy imporcie (logika tylko w register).

---

## Admin UI loader (client)

Zachowanie:
- dynamiczny import `dist/client.mjs` tylko dla aktywnych pluginow.
- dolaczenie `dist/style.css` do strony admina.

Kontrakt pluginu (client):
- eksport `registerAdmin(ctx)` oraz `registerBlocks(ctx)` (v1).

---

## System hookow (server)

API core:
- addAction(name, fn)
- addFilter(name, fn)

Przyklady:
- addAction("content:save", fn)
- addFilter("render:html", fn)
- addAction("admin:menu", fn)

---

## Admin UI (pluginy)

API core (SDK):
- registerAdminPage({ path, title, component })
- registerDashboardWidget(...)
- registerSettingsSection(...)

Plugin moze:
- dodac pozycje menu
- dodac strone ustawien
- dodac widget dashboardu

---

## Bloki / komponenty tresci

Edytor oparty o JSON schema.

Plugin rejestruje blok:

registerBlock({
  type: "seo/meta",
  schema,
  render,
  editor
})

Blok pojawia sie natychmiast w CMS.

---

## Routing pluginow (server)

Wersja v1:
- Pluginy rejestruja endpointy pod prefiksem
  `/api/plugins/<plugin-name>/*`.
- Rejestracja przez SDK:
  registerRoute({ method, path, handler })

Cel:
- webhooki (platnosci, integracje).
- brak kolizji z core.

---

## Public assets pluginu

- `/plugins-runtime/<name>/<version>/public` mapowane na
  `/plugins/<name>/<version>/...`
- Cache-Control dla assetow statycznych (long cache).

---

## Tailwind CSS

- Tailwind NIE jest generowany per request.
- Plugin dostarcza skompilowany CSS w `dist/style.css`.
- Core nie przebudowuje Tailwinda przy instalacji pluginu.

---

## Bezpieczenstwo (trust by curation)

- Store wykonuje skany bezpieczenstwa i CVE.
- Paczki sa podpisane, core weryfikuje podpis i hash.
- Brak sandboxu: plugin dziala w tym samym procesie co core.
- Permissions w manifestach sa warstwa logiczna, nie izolacja.
- Revocation: lista zablokowanych wersji pluginow.

---

## Model uprawnien (v1)

Przyklady:
- content:read
- content:write
- admin:ui
- payments:write
- settings:read
- settings:write

Zasady:
- Plugin deklaruje permissions w manifest.
- Admin akceptuje permissions przy instalacji.
- Core moze blokowac wywolania API bez zgody.

---

## Dane i schema (DB)

Tabela `plugins` (przykladowa):
- id
- name
- version
- apiVersion
- enabled
- status (installed|enabled|disabled|failed)
- permissions (json)
- entry (json)
- integrity (json)
- signature (text)
- installedAt
- updatedAt
- lastError

Tabela `plugin_settings`:
- pluginName
- key
- value

---

## Konfiguracja (env)

Przykladowe zmienne:
- PLUGINS_DIR=/plugins-runtime
- STORE_BASE_URL=https://store.example.com
- STORE_PUBLIC_KEY=...
- PLUGIN_MAX_SIZE_MB=50
- PLUGIN_DOWNLOAD_TIMEOUT_MS=30000
- PLUGIN_VERIFY_STRICT=true

---

## Observability

Wymagane:
- logi instalacji (download, verify, unpack, load).
- logi bledow pluginow z wersja i nazwa.
- metryki: czas instalacji, czas load, liczba failed.

---

## Performance

- Load pluginow przy starcie lub lazy (on-demand).
- CSS pluginow ladowany tylko w adminie.
- Cache assets pluginow z długim TTL.
- Importy per wersja (ESM cache).

---

## Deploy

Core:
- deploy przez Git/CI
- build produkcyjny (Vite SSR)

Pluginy:
- pobierane runtime ze store
- trzymane na persistent storage (plugins-runtime)
- brak redeployu po instalacji

Po deployu:
- registry pluginow ladowane z DB
- runtime laduje aktywne pluginy z /plugins-runtime

---

## Znane ryzyka

- Plugin w tym samym procesie co core (brak izolacji).
- Bledy w pluginie moga psuc requesty (potrzebne defensive coding).
- Koniecznosc stabilnego SDK i wersjonowania API.

---

## Decyzje do potwierdzenia (taski arch)

- Standard podpisu (np. ed25519) i sposob dostarczania signature.
- Dokladna lista externali do bundlowania pluginow.
- Polityka update (auto/manual, rollback).
- Strategia load (eager vs lazy).
