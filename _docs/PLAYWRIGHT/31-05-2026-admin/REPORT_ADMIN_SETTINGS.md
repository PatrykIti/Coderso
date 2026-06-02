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

### Siódma fala - 2026-06-02: TASK-359-04..07 i TASK-360-07 closure

- Playwright session `codex-02-06-admin-final` przeszła Settings UI po
  końcowych poprawkach. Zalogowano admina, sprawdzono dashboard warning dla
  QA override `Max sessions per user = 30`, a potem klikano bezpieczne ścieżki
  cancel/disabled bez wykonywania destrukcyjnych mutacji.
- Dodatkowa końcowa sesja `codex-02-06-physical` została uruchomiona po prośbie
  o commit. Ponownie przeklikano Admin routes oraz Settings subroutes na
  świeżo odpalonym serwerze; konsola miała 0 errors i 0 warnings, a requesty po
  loginie wracały `200` (pre-login `401 /admin/api/auth/me` był oczekiwany).
- General: `Timezone`, `Upload site logo`, `Upload new` favicon i `Remove`
  favicon są disabled z jawną kopią właściciela `TASK-359-04`.
- Site: zmiana `Admin access path` otworzyła `Review site routing changes` z
  targetem `Admin access path`; `Cancel` nie wykonał PATCH i draft został
  przywrócony. Performance jest jawnie przyszłym/nieaktywnym obszarem.
- Security: zmiana auth rate-limit `Attempts per window` otworzyła
  `Review security policy changes`, pokazała target `Rate limit policy` i
  wymagała wpisania `APPLY`; `Cancel` nie zapisał zmiany.
- Sessions: nieaktywne taby `General`, `Audit Log`, `Two-Factor Auth` są
  disabled, `Active Sessions` jest aktywny. Current session pokazuje
  `Cannot Revoke`; row `Revoke` otwiera confirm i `Cancel` nie wykonuje revoke.
  `Change Password` oraz `Security Settings` są disabled.
- Login Alerts: nieaktywne taby są disabled, a brute-force threshold,
  admin-only/custom recipients, email/webhook channels oraz sticky
  discard/save są disabled/unavailable. Obsługiwane alert toggles pozostają
  aktywne.
- IP Allowlist: pusty fixture pokazuje `No IP ranges currently allowlisted`;
  remove nie był klikany w live UI, bo nie było wiersza. Vitest pokrywa
  remove cancel/confirm i widoczny lockout warning.
- API Keys: dla istniejącego klucza otwarto menu, kliknięto `Rotate key` i
  `Revoke key`; oba pokazały confirm dialogs, a `Cancel` nie wykonał mutacji.
- Webhooks: live fixture był pusty, więc sprawdzono create drawer i disabled
  test connection w create mode. Vitest pokrywa delete cancel/confirm, edit
  save confirm oraz existing-webhook test confirm.
- Email: wypełniono recipienta `qa@example.com`, `Send Test Email` otworzył
  `Send test email?`, a `Cancel` nie wysłał maila. Delivery Logs pokazały empty
  state, a `Export Logs` był disabled.
- Integrations: w OpenAI drawer wpisano draft sekretu, `Save Changes` otworzył
  `Review integration secrets` z targetem `OpenAI: API Key`; dialog nie
  powtarzał wartości sekretu i `Cancel` nie zapisał konfiguracji.
- Assistant: live UI miał assistant disabled, więc `Run reindex` było disabled.
  Vitest pokrywa enabled confirm/cancel path.
- Storage: kliknięto Local, Amazon S3 i Azure Blob provider cards bez zapisu.
  Każdy provider pokazuje disabled `Test Connection` z kopią
  `Storage connection testing is not wired yet. TASK-359-06 owns provider test
  feedback.` S3/Azure secret fields są maskowane jako `••••••••`; security
  summary pokazuje tylko configured/missing state.
- Niezależny Claude pass `claude-02-06-admin-physical` fizycznie kliknął
  wszystkie Settings subroutes przez `playwright-cli`. Potwierdził risky
  dialog cancel dla Site i Security, Sessions revoke, API key rotate/revoke,
  create Webhook drawer, Integration secret update gate, Storage Local/S3/Azure
  disabled `Test Connection` i secret masking. Dla pustego IP allowlist fixture
  potwierdził brak wiersza remove; dla pustego webhook fixture test/delete/edit
  były niewykonalne poza create drawer. Wynik Claude: PASS, 0 console
  errors/warnings, wszystkie requesty po loginie `200`.
- Console evidence dla sesji finalnej: 0 errors, 0 warnings. Request evidence:
  oczekiwane pre-login `401`, udane `200` po loginie oraz kilka
  `net::ERR_ABORTED` dla settings GET przerwanych przejściem/nawigacją; brak
  blokujących runtime błędów i brak destrukcyjnych mutacji po cancel.
- Subagent UI-click smoke `codex-02-06-admin-final-areas` potwierdził Users,
  Roles Matrix, Audit Logs i Access Logs z 0 console errors/warnings; szczegóły
  są dopisane w raportach obszarowych.
- Claude został uruchomiony jako source-only reviewer po implementacji, a
  następnie jako fizyczny UI reviewer w `claude-02-06-admin-physical`. Source
  review nie wykrył blocking issues; UI-click pass zwrócił PASS.

### Szósta fala - 2026-06-02: TASK-359-03 redacted Settings cache

- Dodano `settings:redacted` jako jedyny browser-cache owner dla wartości
  Settings. Cache trzyma tylko allowlistę non-secret: General, runtime,
  Assistant non-secret, Site oraz boolean-only security configured flags.
- Vitest potwierdził, że payload `/settings` zawierający fake
  `password`/`apiKey`/`accessKey`/`secretKey` nie zapisuje tych wartości ani
  unsafe key paths w `localStorage`.
- `getSettingsCached()` i `getSiteSettingsCached()` hydratują z
  `settings:redacted`; `updateSettings()` i `updateSiteSettings()` primują
  cache z odpowiedzi serwera i broadcastują `settings:redacted`.
- `updateSecuritySettings()` patchuje wyłącznie safe configured flags, a kiedy
  nie ma redacted cache entry, emituje invalidate zamiast cache'ować raw
  security payload.
- `SiteSettingsPage` hydratuje Settings, pages i content types z cache. Przy
  świeżych `pages:list` i `contentTypes:list` mount Site nie wykonuje już
  force-refetchy tych selectorów; Settings revaliduje się w tle.
- Cache-bus update dla czystego formularza Site odświeża widoczne wartości ze
  storage-first cache, ale dirty draft nie zostaje nadpisany.
- Prefetch `/settings/site` ogrzewa `settings:redacted`, `pages:list` i
  `contentTypes:list` raz, z `{ force: false }`.
- Realny Playwright UI pass `task-359-03-settings-cache` potwierdził:
  pierwsze wejście Site wykonało `settings: 1`, `pages: 1`,
  `contentTypes: 1`, `authMe: 0`; drugie przejście General -> Site przy
  świeżym cache wykonało `settings: 1`, `pages: 0`, `contentTypes: 0`,
  `authMe: 0`.
- Ten sam UI pass potwierdził `markerPreserved: true`,
  `unsafeSettingsCachePaths: []`, obecne `pages:list` i `contentTypes:list`,
  clean cacheBus TTL refresh zastosowany do pola oraz dirty TTL draft
  zachowany po kolejnym cacheBus update. Screenshot evidence:
  `.tmp/task-359-03-settings-cache.png`.
- Claude read-only review zakwestionował zbyt wąską 4-polową pseudostrukturę z
  taska; finalna implementacja używa szerszej allowlisty potrzebnej do
  hydratacji General/Assistant/Site, ale nadal odrzuca secret-like key names.
- Subagent read-only potwierdził drift: Site Settings wcześniej force-refetchował
  pages/content types i nie miał redacted cache contract. Ten drift został
  zamknięty kodem, testami i dokumentacją.

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
- `TASK-359-03`: redacted Settings cache hydratuje safe Settings values i Site
  selectors bez sekretów w `localStorage`; mutacje Settings/Site/Security
  synchronizują `settings:redacted` przez cacheBus.
- `TASK-359-04`: General/Site placeholdery są truthful unavailable albo
  confirmowane. Logo/favicon/timezone są disabled, Performance nie jest aktywnym
  placeholderem, a admin/public routing changes wymagają `Review site routing
  changes`.
- `TASK-359-05`: Security high-risk policy saves, session revoke/revoke-all,
  API key rotate/revoke, webhook delete i IP allowlist remove mają cancel-safe
  confirms. Current session/current IP lockout copy pozostaje widoczna, a API
  key secrets są one-time/redacted.
- `TASK-359-06`: Email test, webhook test/edit save, integration secret save i
  assistant reindex wymagają confirmu albo są disabled, Storage test connection
  i Email export logs są truthfully unavailable.
- `TASK-359-07`: Login Alerts unsupported tabs/advanced controls/sticky actions
  oraz Sessions link-buttons są disabled z no-op gate coverage.

## Co nie działało / co jest ryzykowne

| Obszar | Problem | Dlaczego |
| --- | --- | --- |
| Settings navigation | Zamknięte w `TASK-359-02`: kliknięcia między opcjami Settings są SPA transitions i nie refetchują `auth/me` w fazie przejść | `SettingsSidebar.tsx` używa `AdminLink`, a shared router blocker pilnuje dirty navigation |
| Settings cache | Zamknięte w `TASK-359-03`: safe Settings values hydratują z redacted cache, a Site selectors nie force-refetchują przy świeżym cache | `settings:redacted` ma strict allowlistę, secret denylist tests, cached wrappers, cacheBus update/invalidate i prefetch `/settings/site` |
| Settings dirty state | Zamknięte w `TASK-359-02`: Settings drafts wymagają confirmu przy sidebar/direct SPA navigation, Back/Forward i refresh/close | boolean-only dirty guard nie serializuje sekretów; cancel zachowuje draft |
| Settings mobile | Zamknięte w `TASK-359-02`: mobile ma lokalną Settings nawigację z top-level sekcjami i Security subroutes | `SettingsShell.tsx` renderuje Settings sidebar także poniżej `lg` |
| General | Zamknięte w `TASK-359-04`: logo upload, favicon upload/remove i timezone są disabled z jawną kopią niedostępności | Vitest/no-op gate i live Playwright potwierdzają disabled state |
| Assistant | Zamknięte w `TASK-359-06`: `Run reindex` jest disabled, gdy assistant jest wyłączony, a enabled path wymaga confirmu | Vitest pokrywa cancel/confirm; live fixture potwierdza disabled state |
| Site | Zamknięte w `TASK-359-04`: admin path/base URL/homepage/404/preview/content routes wymagają `Review site routing changes` | Playwright potwierdził cancel-safe admin path review; Vitest pokrywa no duplicate auto-save |
| Site | Zamknięte w `TASK-359-04`: `Performance` nie jest aktywnym placeholderem | UI pokazuje future runtime optimization copy, bez aktywnych submit controls |
| Security | Zamknięte w `TASK-359-05`: high-risk policy save wymaga `Review security policy changes` i typed `APPLY` | Playwright i Vitest potwierdzają cancel/confirm oraz brak duplicate auto-save |
| Sessions | Zamknięte w `TASK-359-05`/`TASK-359-07`: revoke/revoke-all mają confirm, current session jest chroniona, link-buttons są disabled | Vitest i Playwright potwierdzają cancel-safe flow oraz disabled destinations |
| Login Alerts | Zamknięte w `TASK-359-07`: unsupported tabs, brute-force slider, recipients, channels i sticky actions są disabled/unavailable | No-op gate obejmuje disabled controls; top supported toggles nadal zapisują realny payload |
| IP Allowlist | Zamknięte w `TASK-359-05`/`TASK-359-06`: drawer ma semantics, remove ma confirm i lockout warning | Live fixture nie miał wiersza remove; Vitest pokrywa cancel/confirm |
| API Keys | Zamknięte w `TASK-359-05`: rotate/revoke mają cancel-safe confirm, a one-time secret nie trafia do cache | Playwright kliknął cancel; Vitest pokrywa confirm path i secret cleanup |
| Webhooks | Zamknięte w `TASK-359-05`/`TASK-359-06`: delete, existing-webhook test i edit save wymagają confirmu | Live fixture pusty; Vitest pokrywa delete/test/edit confirms |
| Webhooks/Email/Integrations | Zamknięte w `TASK-360-05` i utrzymane w `TASK-359-06`: drawers mają `SheetTitle`/`SheetDescription` | Drawer a11y gate jest green |
| Email | Zamknięte w `TASK-359-06`: `Send Test Email` wymaga confirmu, `Export Logs` jest disabled | Playwright kliknął cancel; Vitest pokrywa send confirm |
| Storage | Zamknięte w `TASK-359-06`: `Test Connection` jest disabled z właścicielem taska, a provider secrets są maskowane | Playwright potwierdził Local/S3/Azure disabled test copy i masked secrets |
| Integrations | Zamknięte w `TASK-359-06`: edited secret fields wymagają confirmu z labelami, bez wartości sekretu | Playwright i Vitest potwierdzają cancel-safe secret review |
| RBAC route gating | Zamknięte w `TASK-359-01`: restricted user bez `settings:read` nie widzi Settings linków, direct URL kończy w `Access denied` i nie wykonuje `GET /admin/api/settings` | route guard, shared sidebar filter, gated settings bootstrap oraz breadcrumb cleanup usunęły dawny shell `Forbidden`; backend 403 pozostaje defense-in-depth |

## Dlaczego

Settings jest mieszanką produkcyjnych kontraktów i placeholderów. Część kart ma
realne API (`SecuritySettingsPage`, `EmailSettingsPage`, `StorageSettingsPage`,
`ApiKeysPage`), a część tylko wizualny shell (`LogoUploadCard`, część drawers,
shared `ExportDialog`). UI nie rozróżnia tego wystarczająco wyraźnie.

Settings cache drift został zamknięty w `TASK-359-03`: `_docs/ADMIN_CACHE.md`
ma teraz `settings:redacted`, `settingsClient.ts` i `siteSettingsClient.ts`
mają cached wrappers, a Site Settings przestał force-refetchować selector
resources, kiedy cache jest świeży. Credential-bearing endpoints nadal nie są
cache'owane w browser storage, bo ich raw payloady mogą zawierać sekrety albo
configured-secret material.

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
- Zamknięte w `TASK-359-03`: Settings cache policy cache'uje tylko bezpieczne,
  redacted wartości bez sekretów, z cache keys/TTLs, cached wrappers,
  invalidation i cacheBus zgodnie z `_docs/ADMIN_CACHE.md`.
- Zamknięte w `TASK-359-03`: `SiteSettingsPage` nie wymusza
  `listPagesCached({ force: true })` i
  `listContentTypesCached({ force: true })` na każdym mount, jeśli cache jest
  świeży.
- Zamknięte w `TASK-359-04`: logo/favicon/timezone są disabled z jawną kopią,
  Site Performance nie ma aktywnych controls, a routing/base URL/homepage/404/
  preview/content-route saves wymagają review confirm.
- Zamknięte w `TASK-359-05`: destructive albo lockout-prone Settings actions
  mają cancel-safe confirms; current session/current IP cases są chronione.
- Zamknięte w `TASK-359-06`: external-action controls albo wymagają confirmu
  (`email_test`, `webhook_test`, `assistant_reindex`, `integration_secret`,
  `webhook_edit`) albo są truthfully unavailable (`storage_test`,
  `email_logs_export`).
- Zamknięte w `TASK-359-07`: Login Alerts/Sessions placeholders są disabled
  albo routed through supported handlers, a no-op gate obejmuje ich stable ids.
- QA note 2026-06-02: `Max sessions per user = 30` zostaje świadomie w tej
  lokalnej instancji jako override dla długiego, wieloagentowego audytu
  Playwright. Owner: Admin UI Playwright QA / `TASK-360-07`. Reason: uniknięcie
  churnu sesji podczas wielu równoległych sesji klikanych. Dashboard warning o
  zbyt permisywnej polityce jest oczekiwany; środowiska produkcyjne powinny
  wrócić do bezpieczniejszego defaultu poza tym shared QA setupem.
