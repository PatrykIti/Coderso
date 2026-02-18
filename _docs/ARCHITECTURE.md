# WordPress-like CMS na Bun + React (core build + runtime pluginy)

Dokument jest wzorcem technicznym. Na jego podstawie rozpisujemy taski
dla core, store i pluginow.

## Cel projektu

Zbudowac nowoczesny CMS / sklep internetowy z doswiadczeniem developerskim
jak Next.js oraz doswiadczeniem uzytkownika jak WordPress.

## Zakres i nie-cele

Zakres:
- Core SSR + admin w React.
- Admin UI: shadcn/ui + Tailwind v4.
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
- Konfiguracje biznesowe (np. baseUrl, TTL) trzymamy w settings i ustawiamy z UI,
  bez restartu serwera. ENV zostaje tylko dla krytycznych wartosci infrastrukturalnych
  (np. `DATABASE_URL`, `MEDIA_SECRET_MASTER_KEY`).
- Ustawienia security middleware (CORS/CSRF/rate-limit/headers) konfigurowalne
  z Admin UI i stosowane runtime (bez restartu).

## Pierwsze uruchomienie (Setup Wizard)

Po pierwszym logowaniu admin otrzymuje prosty Setup Wizard, aby ustawic:
- `site.publicBaseUrl` (publiczny URL, potrzebny m.in. do preview i linkow w mailach)
- `site.locale`, `site.name`
- `auth.sessionTtlDays` i `auth.resetTtlMinutes`

Wizard zapisuje dane do settings (DB) i oznacza konfiguracje jako zakonczona
przez `setup.completed=true`.

## Coderso admin IA (TASK-054)

- W admin sidebar jest jeden nadrzedny modul: `Coderso`.
- Domyslne moduly v1 (widoczne w sidebar):
  - `Engine` (`/admin/coderso/engine`) - content model builder (content types + schema).
  - `Entries` (`/admin/coderso/entries`) - wpisy rekordow typow z Engine.
  - `Widgets` (`/admin/coderso/widgets`) - biblioteka widgetow i template editor.
  - `Forms` (`/admin/coderso/forms`) - lista i edytor formularzy.
  - `Posts` (`/admin/coderso/posts`) - dedykowany workflow edytorski (TASK-055).
- Pelny katalog modulow v1-v3 (Core Builder, Business Builder, Growth Builder)
  jest utrzymywany w rejestrze `core/admin/ui/navigation/codersoModules.ts`
  i opisany w `_docs/CODERSO_MODULES.md`.
- Sidebar Coderso jest budowany z rejestru przez
  `buildDefaultNavSections(flags)` + `buildCodersoNavItems(flags)`,
  co pozwala wlaczac przyszle moduly przez feature flags bez przepisywania menu.
- Legacy sciezki admina sa wspierane przez aliasy i normalizowane do canonical routes
  (np. `/admin/content-types` -> `/admin/coderso/engine`).
- Alias dziala rowniez dla nested routes (np. `/admin/content-types/:id/schema`).
- Logika canonicalizacji jest centralna w `core/admin/utils/adminPaths.ts` i jest wspolna dla:
  - renderowania linkow admin (`resolveAdminHref`),
  - route matchingu (`resolveAdminRoutePath`),
  - prefetch (`core/admin/utils/adminPrefetch.ts`).

## Assistant Doc Navigator (Phase A + A2)

Aktualny fundament asystenta (bez LLM) sklada sie z warstw:
- `core/services/assistant/docsIndexService.ts` (filesystem index + fallback)
- `core/services/assistant/docsRetriever.ts` (filesystem BM25-like retrieval)
- `core/services/assistant/docsIngestService.ts` (ingest `_docs/_internal` -> DB + ingest runs)
- `core/services/assistant/docsDbRetriever.ts` (DB-backed ranking/search)
- `core/services/assistant/docsAnswerComposer.ts` (deterministic answer templates)
- `core/services/assistant/assistantService.ts` (orchestrator backend selection + fallback)

Przeplyw runtime:
1. `assistantService` czyta `assistant.docs.backend` (`filesystem` lub `db`).
2. Dla `db`: bierze status z tabel ingest, wykonuje retrieval na `assistant_doc_chunks`.
3. Gdy DB nie jest gotowe lub niedostepne, asystent fallbackuje do filesystem index.
4. `docsAnswerComposer` sklada odpowiedz (`location_answer`, `how_to_answer`, `missing_answer`) i zawsze zwraca zrodla.

Przeplyw reindex:
1. `POST /assistant/reindex` dla backendu `db` uruchamia ingest z `assistant.docs.sourceRoot` (domyslnie `_docs/_internal`).
2. Wyniki ingest trafiaja do `assistant_docs`, `assistant_doc_chunks`, `assistant_doc_ingest_runs`.
3. Dla backendu `filesystem` reindex przebudowuje cache in-memory na bazie `assistant.docs.paths`.

Zasady runtime:
- Boot reindex (`assistant.docs.reindexOnBoot=true`) dziala dla obu backendow.
- Cache filesystem index trzymany jest w pamieci procesu.
- Przy braku trafienia system zwraca `missing_answer` (bez halucynacji).

## Assistant LLM mode + Admin UI integration (Phase B)

Rozszerzenie `llm-rag` korzysta z provider abstraction:
- `core/services/assistant/providers/providerTypes.ts`
- `core/services/assistant/providers/openRouterProvider.ts`
- `core/services/assistant/providers/index.ts`
- `core/services/assistant/assistantQuota.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/assistantRedaction.ts`

Zasady:
- provider jest uruchamiany tylko gdy retrieval zwroci snippets,
- brak konfiguracji providera albo blad requestu powoduje fallback do `docs-only`,
- odpowiedz API zawiera `llm` metadata (`provider`, `model`, `providerRequestId`, `usage`) lub `null`.
- quota layer egzekwuje request limits (`per-user` + optional global) oraz optional token budget dla `llm-rag`.
- observability layer zapisuje metryki: request/error/fallback/no-hit/latency.
- audit events rejestruja fallback mode i provider failures bez wycieku sekretow.

Warstwa Admin UI:
- `core/admin/ui/layouts/AdminShell.tsx` montuje globalny trigger asystenta.
- `core/admin/ui/assistant/AssistantPanel.tsx` renderuje drawer czatu.
- `core/admin/ui/assistant/AssistantModeSwitch.tsx` obsluguje `docs-only`/`llm-rag`.
- `core/admin/ui/assistant/AssistantMessage.tsx` pokazuje fallback badge, confidence i sources.
- `core/admin/ui/assistant/AssistantAvatar.tsx` renderuje opcjonalna warstwe avatara z fallback 2D.
- `core/admin/services/assistantClient.ts` obsluguje `/assistant/status`, `/assistant/chat`, `/assistant/reindex`.
- preferencje usera (`assistant.mode`, `assistant.ui.enabled`, `assistant.ui.avatarEnabled`, `assistant.ui.avatarAsset`) sa trzymane w `user_settings`.

## Terminologia

- Core: glowna aplikacja (SSR + admin).
- Plugin: rozszerzenie funkcji core (server + admin).
- Store: serwis dystrybucji pluginow, skanow i podpisow.
- Registry: stan zainstalowanych pluginow w DB.
- Runtime storage: katalog `plugins-runtime` z paczkami pluginow.

## Dokumentacja SDK

Szczegoly API dla autorow pluginow znajduja sie w osobnym dokumencie:
`SDK_SPEC.md`. To jest jedyny dozwolony interfejs integracji pluginu z core.

## Dokumentacja Store

Specyfikacja store, pipeline publikacji i wymagania bezpieczenstwa
znajduja sie w `STORE_SPEC.md`.

## Dokumentacja CMS

Zakres CMS, model danych, auth i security opisane sa w:
- `CMS_SPEC.md`
- `CMS_API.md`
- `CONTENT_TYPES_SPEC.md`
- `DATA_MODEL.md`
- `DESIGN_TOKENS.md`
- `MEDIA_SPEC.md`
- `ORM_SPEC.md`
- `PAGE_MODEL.md`
- `PREVIEW_SPEC.md`
- `AUTH_SPEC.md`
- `RBAC_SPEC.md`
- `THEMES_SPEC.md`
- `SEARCH_SPEC.md`
- `AUDIT_SPEC.md`
- `SECURITY_SPEC.md`

---

## Public runtime rendering (pages)

- Public rendering i runtime preview korzystaja z tego samego pipeline w `core/server/publicSite.tsx`.
- Pipeline: resolve danych strony (published vs draft) -> normalizacja template key -> resolver theme/plugin/core -> render runtime page shell.
- Navigation runtime hydration rozstrzyga `linksSource` (manual/menu/pages) przed renderem; tryb `pages` respektuje `settings.showInNav`.

## SEO Manager (v1)

- Metadane SEO i wyniki audytu przechowywane w `seo_documents`.
- Admin UI korzysta z endpointów `/seo` oraz `/seo/audit`.
- Entry Editor zapisuje opis SEO do `seo_documents` (targetType = `entry`), niezaleznie od danych `content_entries.data`.

## Admin Users & Roles (v1)

- Uzytkownicy trzymani sa w tabeli `users`, role w `roles`, mapowanie w `user_roles`.
- Endpointy `/admin-users` i `/admin-roles` obsluguja CRUD + role assignment.
- Katalog permissions jest dostarczany z API i wykorzystywany w macierzy uprawnien.

## Redirects (v1)

- Przekierowania trzymane w tabeli `redirects` z kodami 301/302/307/308.
- Admin UI zarzadza redirectami przez `/redirects`.

## Forms (v1)

- Definicje formularzy sa w tabeli `forms`, pola w `form_fields`.
- `forms` przechowuje fallback submission (success message + redirect URL) oraz `submission_access` (public/internal).
- Submissions trafiaja do `form_submissions` (payload JSONB, ip, userAgent).
- Automatyzacje formularza sa trzymane w `form_actions` (ordered pipeline per form).
- Historia wykonania akcji jest trzymana w `form_action_runs` (success/failed/skipped + retry link).
- Admin UI buduje formularze w `/forms` i zapisuje pola przez `/forms/:id/fields`.
- Admin UI zarzadza pipeline przez `/forms/:id/actions` i logami przez `/forms/:id/action-runs`.
- Publiczny submit odbywa sie przez `POST /forms/:id/submissions`.
- Runner `formAutomationRunner` wykonuje akcje po zapisie submission:
  - `email`, `webhook`, `entry_sync`, `redirect`, `success_message`,
  - warunki `always|equals|not_equals|exists|not_exists`,
  - retry failed runs przez `POST /forms/action-runs/:runId/retry`.

## Coderso Listings engine (v1 beta)

- Listings to warstwa query + template do budowy dynamicznych list bez custom kodu.
- Admin API (internal, session/RBAC) udostepnia:
  - `/listings/queries/*` (saved query presets + preview),
  - `/listings/templates/*` (reusable output contracts).
- Query contract jest deklaratywny i walidowany (`listingSchemas`, `queryBuilderService`):
  - source: `entries | posts | users | taxonomies`,
  - allowlisted filters/sort/fields,
  - hard caps dla limit/offset/filter budget.
- Template contract (`listingTemplatesService`) jest data-only:
  - `fields`, `itemActions`, `emptyState`, `style`,
  - warunki widocznosci `conditions` per field binding.
- Runtime widgets (`content-list`, `entry-teaser`) konsumują tylko resolved payload:
  - `source.mode=legacy` (dotychczasowy content-type flow),
  - `source.mode=listing` (listing query/template flow),
  - back-compat: brak `mode` + `listingQueryId` => tryb listing.
- Security:
  - endpoints Listings sa internal (`content:read/write`), bez public write API,
  - public runtime dla entries/posts wymusza `includeDrafts=false` poza preview.

## Coderso Filters & Search (v2 beta)

- Filtry runtime bazuja na URL-tokenach `lq.<queryId>.*` i sa parsowane przez `filterEngine`.
- `listing-filters` i `search-box` dzialaja SSR-first:
  - serwer hydratuje stan filtrowania i metryki facetow,
  - klient synchronizuje URL i robi partial HTML refresh listing blockow.
- API:
  - internal preview: `POST /admin/api/filters/preview` (RBAC),
  - public search: `GET /api/search` (published-only index dla pages/entries/posts).
- Cache policy:
  - odpowiedzi HTML z query parametrami sa pomijane przez page cache, aby uniknac stale filtrowanych widokow.

## Backups (v1)

- Backupy w v1 to **metadata-only** zapisane w tabeli `backups`.
- Harmonogram trzymany jest w `backup_schedules` i konfigurowany z Admin UI.
- Storage driver dla backupu jest brany z ustawien storage (local/s3/azure).
- Faktyczne tworzenie/restore plikow backupu realizuje przyszly worker/plugin.

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

### 4) Polityka update i rollback (v1)

Update mode (default: auto-security):
- manual: update tylko po akcji admina
- auto-security: auto update tylko dla patch z flaga security
- auto-all: auto update dla kazdej zgodnej wersji
  - auto-security wymaga `release.type=security` w metadata

Update (manual/auto):
- download nowej wersji do temp
- verify podpisu + checksum
- unpack do nowego katalogu wersji
- check: apiVersion, coreVersion, revocations
- smoke-load: import `dist/server.mjs` w try/catch
- switch aktywnej wersji atomowo w registry

Rollback:
- automatyczny rollback do poprzedniej wersji, jesli smoke-load fail
- manualny rollback z panelu admina

Retention:
- domyslnie trzymamy 2 ostatnie wersje (configurable)
- starsze wersje usuwane po udanym update

Pinning:
- admin moze "pin" wersje, aby blokowac auto update

---

### 5) Strategia ladowania pluginow (v1)

Server:
- domyslnie eager load wszystkich aktywnych pluginow przy starcie
- opcjonalny lazy load przez `PLUGINS_LOAD_STRATEGY=lazy`
  (ladowanie przy pierwszym uzyciu hooka/route)

Client:
- lazy load UI pluginu przy wejscu na jego strone admina
- CSS pluginu dolaczany tylko gdy UI pluginu jest aktywne

---

## Struktura repozytorium (docelowa)

/core
  /server               (Bun HTTP, SSR, routing)
  /admin                (Admin app)
  /ui                   (shared UI)
  /plugins              (loader, registry, permissions)
  /store                (klient store + weryfikacja podpisu)
  /schemas              (JSON schema manifestu)
  /db                   (migracje, modele)
  /config               (konfiguracja + defaulty)

/packages
  /sdk                  (publiczny SDK dla pluginow)

/store                  (backend Store)
  /server
  /db
  /services

/themes
  /default
  /<theme-name>

Theme registry:
- Core skanuje `/themes` przy starcie i laduje `theme.json`.
- Meta (name/version/tokens/templates) trzymane w memory cache.

Admin UI themes:
- **Admin UI Theme** jest osobnym systemem (nie korzysta z `/themes`).
- Template'y i profile admina sa trzymane w DB (`admin_theme_templates`, `admin_theme_profiles`).
- Admin UI korzysta z granularnych tokenow (`--admin-*`) mapowanych do shadcn vars w `core/admin/styles/globals.css`.
- UI: **Visual → Admin UI Theme** (pickery + export/import JSON).

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
  - react/jsx-runtime
  - react/jsx-dev-runtime
  - @core/sdk/server
  - @core/sdk/client
  - @core/sdk/shared
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

## Wersjonowanie SDK i kompatybilnosc

- `apiVersion` w manifest mapuje sie na major `@core/sdk`.
- `coreVersion` definiuje zakres kompatybilnych wersji core.
- Core odrzuca pluginy z niekompatybilnym `apiVersion` lub `coreVersion`.
- Szczegoly: `SDK_SPEC.md`.

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
- GET /plugins/:name/versions/:version/metadata.sig
- GET /plugins/:name/versions/:version/download
- GET /revocations.json

Weryfikacja podpisu:
- core posiada publiczny klucz store.
- signature dostarczana jako `metadata.sig` (ed25519, base64).
- szczegoly podpisu: `STORE_SPEC.md`.

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
- W razie bledu -> cleanup i status "error".

---

## Runtime loader (server)

Zachowanie:
- Loader importuje `dist/server.mjs` dla kazdego aktywnego pluginu.
- ESM cache utrzymuje moduly per wersja.
- Zmiana wersji = zmiana sciezki -> nowy import.
- Disable = usuniecie z registry (hooki nie sa wywolywane).
- Safe mode (`PLUGINS_SAFE_MODE=1`) uruchamia core bez pluginow.
- Auto-disable po przekroczeniu progu bledow (default: 3, `PLUGIN_ERROR_THRESHOLD`).
- Licznik bledow i `last_error` przechowywane w registry.

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
- addAction("content:save", (payload, ctx) => {})
- addFilter("render:html", (html, ctx) => html)
- addAction("admin:menu", (payload, ctx) => {})

Hook handler zawsze dostaje `ctx` (request/session/user) jako drugi argument.

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

## Dashboard aggregate service (TASK-099-01)

Cel:
- uniezaleznic ekran Dashboard od mockow i zasilic go jednym payloadem backendowym.

Warstwa:
- `core/services/dashboard/dashboardTypes.ts`:
  - kontrakt DTO (`DashboardPayload`) dla API i UI.
- `core/services/dashboard/dashboardService.ts`:
  - agreguje `totals` (pages/entries/media/users),
  - buduje `recentEdits` przez merge: pages + content_entries + media,
  - oblicza summary storage (`usedBytes`, optional percent),
  - buduje summary security na bazie `security.settings`.

Uwagi:
- `recentEdits` sortowane globalnie malejaco po czasie po merge.
- MVP nie dodaje osobnego subsystemu telemetry ruchu (visitors/pageviews).

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

## Widgety (core v1)

Pierwsza wersja core musi zawierac podstawowe widgety, ktore pozwalaja
zbudowac pelnoprawna, zaawansowana strone (np. typu mabudo.pl):

- hero section
- timeline (bez dat; etapy/proces w formie osi)
- compare timeline (porownanie dwoch procesow na jednej osi)
- newsletter
- kontakt
- menu/nawigacja
- stopka

Wymagany model konfiguracji (dla wszystkich widgetow, pluginow i addonow):
- Wizard: kreator pytan, wybor wariantu i szybka konfiguracja.
- Visual: glowny tryb edycji content/style, warianty + sekcje wizualne;
  widget moze przejac wariant selector (`visualOwnsVariantSelection`).
- Advanced: tryb techniczny (spacing/layout/responsive + pola eksperckie),
  bez duplikowania podstawowych pol z Visual.
- Zawsze mozna przejsc do Advanced po wstepnej konfiguracji.

Szczegoly: `WIDGETS.md`.

---

## Routing pluginow (server)

Wersja v1:
- Pluginy rejestruja endpointy pod prefiksem
  `/api/plugins/<plugin-name>/*`.
- Rejestracja przez SDK:
  registerRoute({ method, path, handler, permission? })

Cel:
- webhooki (platnosci, integracje).
- brak kolizji z core.

---

## Public assets pluginu

- `/plugins-runtime/<name>/<version>/public` mapowane na
  `/plugins/<name>/<version>/...`
- Cache-Control dla assetow statycznych (long cache).
- Plugin powinien generowac URL przez `ctx.assets.getUrl("...")` zamiast
  hardcode sciezek.
- Dla pracy po stronie servera: `ctx.assets.getPublicPath("...")` zwraca
  bezpieczna sciezke do assetu.

---

## Tailwind CSS

- Tailwind NIE jest generowany per request.
- Plugin dostarcza skompilowany CSS w `dist/style.css`.
- Core nie przebudowuje Tailwinda przy instalacji pluginu.
- Watcher Tailwinda dziala po stronie autora pluginu (dev) lub store (build).
- Safelist w konfiguracji pluginu zapewnia klasy dynamiczne (np. `bg-${color}-500`).
- W prod core nie uruchamia tailwindcss.
- Design tokens sa preferowanym sposobem stylowania w pluginach.

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
- status (installed|disabled|error)
- permissions (json)
- entry (json)
- integrity (json)
- signature (text)
- installedAt
- updatedAt
- lastError
- errorCount

Tabela `plugin_settings`:
- pluginName
- key
- value
- updatedAt

---

## Konfiguracja (env)

Przykladowe zmienne:
- PLUGINS_RUNTIME_DIR=/plugins-runtime
- PLUGINS_SAFE_MODE=1
- PLUGIN_ERROR_THRESHOLD=3
- PLUGIN_TIMEOUT_MS=5000
- STORE_BASE_URL=https://store.example.com
- STORE_PUBLIC_KEY=...
- PLUGIN_MAX_SIZE_MB=50
- PLUGIN_DOWNLOAD_TIMEOUT_MS=30000
- PLUGIN_VERIFY_STRICT=true
- PLUGINS_LOAD_STRATEGY=eager
- PLUGIN_KEEP_VERSIONS=2
- PLUGIN_UPDATE_MODE=auto-security

---

## Observability

Wymagane:
- logi instalacji (download, verify, unpack, load).
- logi update/rollback (version switch, failure reason).
- logi bledow pluginow z wersja i nazwa.
- metryki: czas instalacji, czas load, liczba error.

---

## Performance

- Server: eager load aktywnych pluginow (default), lazy opcjonalnie.
- Client: lazy load UI pluginu na zadanie.
- CSS pluginow ladowany tylko w adminie.
- Cache assets pluginow z dlugim TTL.
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

## Znane ryzyka i mitygacje

### 1. React Dependency Hell (Singleton Problem)
Ryzyko:
- Plugin laduje wlasna kopie `react` lub `react-dom` w `node_modules`.
- Powoduje to blad "Invalid Hook Call Warning" lub bledy kontekstu (Context API).
- Core i plugin musza wspoldzielic DOKLADNIE te sama instancje Reacta.

Mitygacja:
- Rygorystyczne `externals` w konfiguracji bundlera pluginu (zdefiniowane w `SDK_SPEC.md`).
- Linting w Store: odrzucenie paczki, jesli zawiera `react` w bundle.
- Runtime check: core sprawdza, czy plugin nie nadpisuje globalnych symboli Reacta.

### 2. Stabilnosc procesu (Shared Process)
Ryzyko:
- Plugin dziala w tym samym watku/procesie co Core (brak izolacji V8/WASM).
- `while(true)` lub wyciek pamieci w pluginie "zabija" caly serwer.
- Nieobsluzony wyjatek w `render()` pluginu moze polozyc caly SSR.

Mitygacja:
- **Safe Mode**: Uruchomienie serwera z flaga `--safe` wylacza ladowanie pluginow, umozliwiajac wejscie do panelu i wylaczenie wadliwego pluginu.
- **Error Boundaries**: Core owija widgety i strony pluginow w React Error Boundary, aby blad renderowania nie sypal calym UI.
- **Timeouts**: Limity czasu na wykonanie hookow server-side (jesli mozliwe bez workerow).
- **Auto-disable**: Po przekroczeniu progu bledow plugin jest automatycznie wylaczany (z logiem i audytem).
- **Watchdog**: Monitoruje timeouts/wyjatki i oznacza plugin jako unhealthy.

### 3. Ograniczenia stylowania (Tailwind JIT)
Ryzyko:
- Plugin uzywa klasy `bg-[#123abc]`, ktora nie istnieje w CSS Core.
- Tailwind JIT dziala tylko w czasie budowania Core.

Mitygacja:
- Plugin musi dostarczyc wlasny CSS (`dist/style.css`) dla niestandardowych stylow.
- Plugin powinien uzywac systemu stylow/zmiennych Core (Design Tokens) zamiast hardcodowanych wartosci.
- Safelisting: Autor pluginu musi zadbac o wygenerowanie uzywanych klas w swoim CSS buildzie.

### 4. Bezpieczenstwo danych
Ryzyko:
- Plugin ma dostep do `globalThis` i moze teoretycznie czytac pamiec procesu (env vars, keys).

Mitygacja:
- Model "Trust by Curation" (Store).
- Audyt kodu (manual/automated) przed publikacja.
- Brak sandboxu to swiadomy trade-off dla wydajnosci i DX w v1.
