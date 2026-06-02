# Admin Settings - raport klikany (31-05-2026)

## Zakres i źródła

Trasy: `/admin/settings`, `/admin/settings/general`,
`/admin/settings/assistant`, `/admin/settings/site`,
`/admin/settings/security`, `/admin/settings/security/sessions`,
`/admin/settings/security/login-alerts`,
`/admin/settings/security/ip-allowlist`, `/admin/settings/api-keys`,
`/admin/settings/webhooks`, `/admin/settings/email`,
`/admin/settings/storage`, `/admin/settings/integrations`.

Główne źródła: `core/admin/ui/settings/**`, `core/admin/ui/site/**`,
`core/admin/ui/security/**`, `core/admin/ui/shared/ExportDialog.tsx`,
`_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.

## Co faktycznie kliknięto

### Piąta fala - 2026-06-02: TASK-359-02 SPA navigation, dirty guard i mobile

- Kliknięto realne linki Settings z UI bez `page.goto`: Assistant, Site,
  Security, Email, Storage i Integrations.
- W trakcie tych przejść utrzymano marker JS w `window`, co potwierdziło SPA
  navigation bez remountu dokumentu.
- Request-budget evidence dla fazy kliknięć: `authMeRequests: 0`,
  `documentLoadEvents: 0`, `auth429Responses: 0`, `loginRedirected: false`.
- Dirty guard: na General wpisano draft `Site name`, kliknięto Security,
  zobaczono confirm `Discard unsaved settings?`, wybrano `Keep editing`,
  pozostano na General i draft został zachowany.
- Dirty confirm: ponowne kliknięcie Security i `Discard changes` przeniosło do
  `/admin/settings/security`.
- Browser Back evidence: po wejściu z Security do General, wpisaniu draftu i
  użyciu `window.history.back()` guard pokazał ten sam confirm, cancel zachował
  draft i URL General, a confirm przeniósł z powrotem do Security.
- Mobile viewport 390x844 miał widoczne linki Settings: General, Assistant,
  Site, Security, Sessions, Login Alerts, IP Allowlist, API Keys, Webhooks,
  Email, Storage, Integrations.
- Mobile click do Storage także zachował marker JS i miał
  `documentLoadEvents: 0`.
- Screenshot evidence:
  `.tmp/task-359-02-settings-desktop.png` i
  `.tmp/task-359-02-settings-mobile.png`.
- Claude read-only review wskazał, żeby nie dodawać settings cache prefetch w
  tym leafie; `AdminLink prefetch` pozostaje zgodny z helperem, a realny cache
  Settings jest właścicielem `TASK-359-03`.
- Subagent review po implementacji wykrył drifty: raw admin anchors w Site,
  guard tylko w sidebarze, brak Back/Forward ochrony i niepełną mobile
  reachability dla Security subroutes. Zostały zamknięte przez router blocker,
  `AdminLink` w Site i rozszerzenie Settings sidebaru o Sessions/Login
  Alerts/IP Allowlist.

### Czwarta fala - 2026-06-01: TASK-359-01 RBAC verification

- Zalogowano tymczasowego usera z rolą `roles:read` bez `settings:read`.
- Na `/admin/roles` sprawdzono, że nie ma żadnego linku
  `href="/admin/settings"` ani w głównym sidebarze, ani w breadcrumbach.
- Playwright wykrył drift: `Roles Matrix` i `Users & Roles` używały breadcrumbu
  `Settings`, który shared breadcrumbs zamieniał na link do `/admin/settings`.
  Breadcrumbi zostały zmienione na `Admin / Permissions Matrix` i
  `Admin / Users & Roles`.
- Claude final review wykrył ten sam drift w wariancie `audit:read`: `Audit
  Logs` i `Access Logs` używały breadcrumbu `Security`, który shared
  breadcrumbs mapował do `/admin/settings/security`. Breadcrumbi zostały
  zmienione na `Admin / Audit Logs` i `Admin / Access Logs`.
- Dodatkowo zalogowano tymczasowego usera z rolą `audit:read` bez
  `settings:read`; na `/admin/audit` i `/admin/access-logs` nie było żadnego
  linku do `/admin/settings`.
- Direct hit w `/admin/settings` wyrenderował shared `Access denied` z kopią
  `Your account does not have permission to open this admin area.`
- Network log z całego smoke'a miał `settingsRequests: []` i
  `settingsResponses: []`; nie wystąpił normal-UX `GET /admin/api/settings`
  403 loop.
- `GET /admin/api/auth/me` po zalogowaniu zwrócił permission snapshot wyłącznie
  z `["roles:read"]`; nie było `429`.
- Screenshot evidence: `.tmp/task-359-01-settings-rbac.png`.
- Audit-only screenshot evidence: `.tmp/task-359-01-audit-rbac.png`.

### Trzecia fala - 2026-06-01: Settings cache i realne zapisy

- Kliknięto wewnętrzne linki Settings sidebaru, bez `page.goto`: General,
  Assistant, Site, Security, API Keys, Webhooks, Email, Storage, Integrations.
- Każde przejście wykonało ponowny odczyt `GET /admin/api/auth/me` i
  `GET /admin/api/settings`. Dodatkowo: Site pobrał `pages` i
  `content-types`, Security pobrał `settings/security` i `ip-allowlist`,
  a API Keys/Webhooks/Email/Storage/Integrations pobrały swoje endpointy.
- Liczba requestów na klik: Assistant 2, Site 4, Security 4, API Keys 3,
  Webhooks 3, Email 3, Storage 3, Integrations 3, General 2.
- Przy szybszym pełnym przejściu przez te same trasy część requestów
  `auth/me` trafiła w `429`, a UI chwilowo przeniosło sesję na login.
- Kontrolowany zapis General: zmieniono `Site name`, zapisano przez UI
  (`PATCH /admin/api/settings = 200`), zweryfikowano persisted state i
  przywrócono wartość pierwotną (`PATCH = 200`).
- Kontrolowany zapis Site: zmieniono `Cache TTL (seconds)`, zapisano przez UI
  (`PATCH /admin/api/settings = 200`), zweryfikowano persisted state i
  przywrócono wartość pierwotną (`PATCH = 200`).
- Kontrolowany zapis Security: zmieniono `Password reset TTL (minutes)`,
  zapisano przez UI (`PATCH /admin/api/settings/security = 200` oraz
  `PATCH /admin/api/settings = 200`), zweryfikowano persisted state i
  przywrócono wartość pierwotną.
- Kliknięcie `Upload site logo` nie otworzyło file choosera.
- Kliknięcie `Storage -> Test Connection` nie wykonało żadnego requestu API.
- Zweryfikowano source dla dodatkowych placeholderów: General `Timezone`,
  Site `Performance`, Login Alerts recipients/channels/brute-force slider oraz
  Sessions `Change Password` / `Security Settings`.
- Claude został użyty jako niezależny source/UX reviewer dla Settings i
  potwierdził brak cache layera dla wartości Settings oraz listę UI-only
  controls.
- Subagent read-only potwierdził te same wnioski i dodał dwa ryzyka UX:
  brak dirty-state guard przy raw-link navigation oraz brak lokalnej nawigacji
  Settings na mobile.

### Druga fala E2E - 2026-06-01

- Zalogowano restricted usera z rolą bez `settings:read`.
- Sidebar nadal pokazywał link `Settings`.
- Wejście w `/admin/settings` pokazało UI Settings z defaultową treścią oraz
  inline alert `Settings error / Forbidden`.
- Backend poprawnie odrzucił odczyt `/admin/api/settings`, ale frontend nie
  zablokował trasy jako całości.

### Pierwsza fala - 2026-05-31

- Przejście przez wszystkie Settings subpages z sidebaru.
- `Security -> Sessions`: ustawiono `Max sessions per user` na **30** i
  zapisano. UI potwierdził zapis toastem/stanem saved.
- `Security`: klikane sekcje Auth protection, Rate limits, CSRF, CORS,
  Security headers, Sessions, IP allowlist bez ryzykownych zapisów.
- `Sessions`: otwarto stronę i sprawdzono tabelę; revoke nie klikano.
- `Login Alerts`: przejście przez taby i kontrolki lokalne bez finalnego zapisu
  poza bezpiecznym odczytem.
- `IP Allowlist`: otwarcie add drawer i walidacja pustego CIDR; bez dodawania.
- `API Keys`: otwarcie create dialog i menu akcji; bez create/rotate/revoke.
- `Webhooks`: otwarcie create/edit drawer; bez test connection i delete.
- `Email`: wypełnienie pól testowych bez zapisu, otwarcie delivery logs; bez
  wysłania maila.
- `Storage`: przełączanie provider cards i wypełnienie pól bez zapisu;
  `Test Connection` kliknięte jako bezpieczny UI-only check.
- `Integrations`: search/category chips, request dialog, connect/config drawer;
  bez zapisu sekretów.

## Co działało

- Routing Settings i SettingsSidebar działały dla wszystkich subpages.
- General `Site name` zapisuje się realnie przez UI i da się przywrócić.
- Site `Cache TTL (seconds)` zapisuje się realnie przez UI i da się przywrócić.
- Security `Password reset TTL (minutes)` zapisuje się realnie przez UI; save
  wykonuje oba wymagane patche: security payload i runtime settings payload.
- Security settings realnie zapisują `session.maxPerUser`.
- Dashboard poprawnie ostrzegł po ustawieniu 30 sesji/user: to oczekiwany
  security signal, nie bug.
- API Keys create dialog i one-time secret dialog mają poprawny DialogTitle i
  DialogDescription.
- Integration request dialog ma poprawny DialogTitle/DialogDescription.
- Webhook drawer waliduje brak nazwy/URL/eventów przed save.
- Email test wymaga recipienta przed wysłaniem.
- Storage pokazuje ostrzeżenie, że zmiana drivera nie migruje istniejących
  plików.
- `TASK-359-01`: restricted user bez `settings:read` nie widzi linków do
  `/admin/settings`, direct URL pokazuje pełnoekranowe `Access denied`, a
  globalny Settings bootstrap nie wykonuje `GET /admin/api/settings`.
  Zweryfikowano warianty `roles:read` i `audit:read` bez `settings:read`.
- `TASK-359-02`: Settings section links są SPA transitions przez `AdminLink`,
  bez document reloadu i bez ponownego `auth/me` podczas szybkiego
  przeklikania sekcji.
- `TASK-359-02`: dirty Settings drafts są chronione dla sidebar links,
  bezpośrednich `AdminLink`, browser Back/Forward i refresh/close; cancel
  zachowuje draft, a discard przechodzi dalej.
- `TASK-359-02`: mobile Settings navigation pokazuje wszystkie główne Settings
  sekcje oraz Security subroutes: Sessions, Login Alerts i IP Allowlist.

## Co nie działało / co jest ryzykowne

| Obszar | Problem | Dlaczego |
| --- | --- | --- |
| Settings navigation | Zamknięte w `TASK-359-02`: kliknięcia między opcjami Settings są SPA transitions i nie refetchują `auth/me` w fazie przejść | `SettingsSidebar.tsx` używa `AdminLink`, a shared router blocker pilnuje dirty navigation |
| Settings cache | Wartości Settings nie są cache'owane/hydratowane jak listy/editor pages | `settingsClient.ts` i `siteSettingsClient.ts` używają bezpośrednio `apiRequest`; brak cache keys/cacheBus w `_docs/ADMIN_CACHE.md` |
| Settings dirty state | Zamknięte w `TASK-359-02`: Settings drafts wymagają confirmu przy sidebar/direct SPA navigation, Back/Forward i refresh/close | boolean-only dirty guard nie serializuje sekretów; cancel zachowuje draft |
| Settings mobile | Zamknięte w `TASK-359-02`: mobile ma lokalną Settings nawigację z top-level sekcjami i Security subroutes | `SettingsShell.tsx` renderuje Settings sidebar także poniżej `lg` |
| General | Logo upload, favicon upload/remove wyglądają aktywnie, ale nie mają file input/handlera | `LogoUploadCard.tsx` renderuje buttony bez akcji |
| General | Timezone wygląda jak ustawienie, ale nie jest podłączony do save payloadu | `BrandingCard.tsx` używa `defaultValue`, bez state i bez `onSave` mappingu |
| Assistant | `Run reindex` jest realną mutacją indeksu dokumentów | działa, ale wymaga osobnego potwierdzenia/dry-run w QA |
| Site | Admin path/base URL/homepage/cache zmieniają zachowanie całej instancji | cache TTL zapisano pozytywnie, ale admin path/base URL są wysokiego ryzyka lockoutu/routingu |
| Site | `Performance` jest jawnie placeholderem | sekcja renderuje tekst `No performance settings yet` |
| Security | `Clear stored secret` dla bot protection nie ma confirm | można wyczyścić sekret zbyt łatwo |
| Sessions | `Revoke` i `Revoke All Other Sessions` wołają API bez confirm | wysokie ryzyko odcięcia aktywnych sesji |
| Sessions | `Change Password` i `Security Settings` wyglądają jak linki/akcje, ale nie mają handlera | renderowane jako buttony bez `onClick` |
| Login Alerts | dolny sticky `Discard`/`Save Changes`, brute-force slider, recipients i channel switches są lokalne/statyczne | tylko topbar save zapisuje trzy pola `loginAlerts` |
| IP Allowlist | Add drawer nie ma semantycznego `SheetTitle`; remove entry nie ma confirm | a11y + ryzyko lockoutu |
| API Keys | Rotate/Revoke wykonują mutacje bez confirm | utrata/rotacja sekretu jest nieodwracalna dla integracji |
| Webhooks | Delete i Test Connection są bez dodatkowego potwierdzenia | delete jest destrukcyjny, test może wysłać zewnętrzny request |
| Webhooks/Email/Integrations | Sheet drawers mają title wizualny, ale brakuje `SheetDescription`/`aria-describedby` | warningi Radix w konsoli |
| Email | `Send Test Email` jest realną akcją zewnętrzną, a `Export Logs` jest UI-only | jedno jest side effectem, drugie tylko wygląda jak export |
| Storage | `Test Connection` jest UI-only | button nie ma `onClick`, więc nie testuje providerów |
| Integrations | Secret fields są dobrze maskowane, ale save sekretów wymaga ostrożnego confirm/audit | to realne credentiale, nie powinny trafiać do cache/logów |
| RBAC route gating | Zamknięte w `TASK-359-01`: restricted user bez `settings:read` nie widzi Settings linków, direct URL kończy w `Access denied` i nie wykonuje `GET /admin/api/settings` | route guard, shared sidebar filter, gated settings bootstrap oraz breadcrumb cleanup usunęły dawny shell `Forbidden`; backend 403 pozostaje defense-in-depth |

## Dlaczego

Settings jest mieszanką produkcyjnych kontraktów i placeholderów. Część kart ma
realne API (`SecuritySettingsPage`, `EmailSettingsPage`, `StorageSettingsPage`,
`ApiKeysPage`), a część tylko wizualny shell (`LogoUploadCard`, część drawers,
shared `ExportDialog`). UI nie rozróżnia tego wystarczająco wyraźnie.

Settings nie zachowuje się jak admin resource objęty shared cache contract.
`_docs/ADMIN_CACHE.md` wymienia cache keys dla list/detail zasobów i globalny
read-through cache dla `getUserSettings`, `getAssistantStatus`,
`listAdminThemeProfiles` i `resolveAuthBootstrap`, ale nie dla `getSettings`.
`_docs/ADMIN_CACHE_MAP.md` mapuje przy Site settings tylko pomocnicze
`listPagesCached` i `listContentTypesCached`. Same wartości Settings idą przez
bezpośrednie `GET /settings`, `GET /settings/security`, `GET /settings/storage`,
`GET /settings/email` itd.

Navigation w Settings zostało zamknięte w `TASK-359-02`: `SettingsSidebar`
renderuje `AdminLink`, Settings shell ma mobile nav, a shared admin router
obsługuje settings-scoped dirty blocker dla SPA navigation i Back/Forward.
Evidence z piątej fali pokazuje `authMeRequests: 0`,
`documentLoadEvents: 0`, brak `429` i brak redirectu na login podczas fazy
kliknięć sekcji. Redukcja requestów endpointów danej sekcji pozostaje osobnym
cache kontraktem `TASK-359-03`.

Druga fala pokazała też problem przekrojowy RBAC: `AdminApp.tsx` pobierał
settings globalnie po samym `authState === "authenticated"`, bez sprawdzenia
`settings:read`. `TASK-359-01` zamknął ten konkretny drift: Settings routes
fail-closed przez shared permission snapshot, bootstrap `getSettings()` jest
pomijany bez `settings:read`, a dodatkowy breadcrumb drift w Users/Roles nie
linkuje już do `/admin/settings`.

## Jak naprawić

- Zamknięte w `TASK-359-01`: route guard dla `/admin/settings/**` na
  `settings:read`, ukrycie Settings linków i shared `Access denied` dla direct
  URL bez uprawnień.
- Zamknięte w `TASK-359-01`: globalny `getSettings()` nie uruchamia się po
  logowaniu, jeśli bieżący user nie ma `settings:read`.
- Zamknięte w `TASK-359-02`: `SettingsSidebar` używa `AdminLink` z canonical
  hrefami i `prefetch`.
- Zamknięte w `TASK-359-02`: dirty-state guard dla Settings forms obejmuje
  przejścia sekcji, bezpośrednie `AdminLink`, browser Back/Forward i
  refresh/close.
- Zamknięte w `TASK-359-02`: mobile Settings navigation jest dostępna poniżej
  `lg` i zawiera Security subroutes.
- Rozdzielić cache policy dla Settings: cache'ować tylko bezpieczne, redacted
  wartości bez sekretów; credential/config sekretów nie wkładać do
  localStorage. Dodać cache keys/TTLs, cached wrappers, invalidation i cacheBus
  zgodnie z `_docs/ADMIN_CACHE.md`.
- W `SiteSettingsPage` nie wymuszać `listPagesCached({ force: true })` i
  `listContentTypesCached({ force: true })` na każdym mount, jeśli cache jest
  świeży.
- General: dodać realny media/file picker dla logo/favicon albo disable buttony.
- General: podłączyć Timezone do schema/save albo oznaczyć jako niedostępny.
- Site: ukryć `Performance` albo zamienić w realny zestaw ustawień z zapisem.
- Security/Sessions/API Keys/Webhooks/IP Allowlist: confirm modal dla każdej
  destrukcyjnej lub lockout-prone akcji; test cancel/confirm.
- Login Alerts: usunąć dolny sticky action bar albo podłączyć go do tych samych
  handlerów co topbar; brute-force slider, recipients i channel switches
  zapisywać albo oznaczyć jako preview/disabled.
- Sessions: podłączyć `Change Password` i `Security Settings` albo usunąć
  martwe buttony.
- Drawers: dodać `SheetTitle`/`SheetDescription`; dla niewidocznych opisów użyć
  `VisuallyHidden`.
- Storage: podłączyć `Test Connection` do backendu albo ukryć. Wynik musi mieć
  success/error toast.
- Email: `Export Logs` podłączyć do API albo disable; `Send Test Email` powinien
  mieć jasny recipient preview i najlepiej confirm w środowisku produkcyjnym.
- Assistant reindex: dodać dry-run/review mode albo confirm z liczbą docs/chunks.
- Po tym audycie przywrócić `Max sessions per user` z 30 do wartości docelowej,
  jeżeli 30 było wyłącznie ustawieniem QA.
