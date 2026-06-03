# Admin UI - raport zbiorczy (31-05-2026)

Źródło: live Playwright na sesjach `codex-31-05-admin-audit`,
`codex-01-06-admin-e2e` i `codex-01-06-admin-rbac-user`, przegląd scope/risk
przez `claude`, subagenci do source audit oraz ręczna weryfikacja kodu w
`core/admin/ui/**`.

---

## Co działało

- Druga fala E2E utworzyła testową rolę i testowego użytkownika, zalogowała się
  tym userem i zweryfikowała realny RBAC UI/API. Fixture został usunięty po
  teście.
- Admin routes renderowały się po zalogowaniu: Users, Roles Matrix, Audit Logs,
  Access Logs oraz wszystkie Settings subpages.
- Search działał w Users, Roles Matrix, Audit Logs i Access Logs.
- Dialogi/drawery otwierały się: Invite User, Create Role/Add Role, Edit User,
  Audit details, Access Log details, export dialogi, Settings drawers.
- Roles Matrix poprawnie pokazywał dirty state po kliknięciu checkboxa i
  `Cancel` przywracał stan bez zapisu.
- Roles Matrix pozytywnie zapisał zmianę uprawnień dla admina, a następnie
  przywrócił pierwotny stan.
- Backend RBAC poprawnie odrzucił restricted userowi write requests:
  `POST /admin-users`, `POST /admin-roles`, `PATCH /admin-roles/:id`.
- Security settings pozwoliły zmienić i zapisać `Max sessions per user = 30`,
  a dashboard później pokazał oczekiwany warning o zbyt permisywnej polityce.
- Trzecia fala Settings potwierdziła realne zapisy odwracalne przez UI:
  General `Site name`, Site `Cache TTL (seconds)` i Security
  `Password reset TTL (minutes)`.

## Co nie działało lub jest mylące

| Priorytet | Obszar | Problem | Dlaczego |
| --- | --- | --- | --- |
| Wysoki | RBAC UI | Zamknięte w `TASK-360-01` i obszarowych leafach: frontend propaguje redacted permission snapshot do route/menu/components | `AuthUser` ma `permissionSnapshot`, `AdminApp` używa shared `can(permission)`, a Users/Roles/Settings konsumują ten sam kontrakt; API 403 zostaje defense-in-depth |
| Wysoki | Users/Roles Matrix | Zamknięte w `TASK-355-01` i `TASK-356-01`: restricted user nie dostaje aktywnych write controls bez write permission | `UsersRolesPage` i `PermissionsMatrixPage` konsumują permission snapshot, wspierają read-only/partial-read modes i odświeżają snapshot po stale 403 |
| Wysoki | Settings | Zamknięte w `TASK-359-01`: user bez `settings:read` nie widzi Settings linków, direct URL pokazuje `Access denied` i nie odpala `GET /admin/api/settings` | shared permission snapshot gate, settings bootstrap guard i breadcrumb cleanup zastąpiły dawny shell `Forbidden`; backend 403 zostaje defense-in-depth |
| Wysoki | Settings navigation | Zamknięte w `TASK-359-02`: przejścia między opcjami Settings są SPA transitions bez document reloadu, `auth/me` refetchy, 429 i login redirectu | `SettingsSidebar` używa `AdminLink`, a settings-scoped router blocker chroni dirty navigation |
| Wysoki | Settings cache | Zamknięte w `TASK-359-03`: Settings ma redacted cache dla nie-sekretnych wartości, cacheBus i selector-cache hydration dla Site | `settings:redacted` przechowuje tylko allowlistę, testy denylist skanują nested keys, a Site nie force-refetchuje świeżych `pages:list`/`contentTypes:list` na każdym mount |
| Wysoki | Access Logs | Zamknięte w `TASK-358-02`: `Revoke access` ma permission gate, typed confirm, CSRF-backed revoke i self-lockout protection | finalny smoke otworzył detail i potwierdził current-session protection |
| Wysoki | Sessions/API Keys/Webhooks/IP Allowlist/Users | Zamknięte w `TASK-355-03`, `TASK-359-05` i `TASK-359-06`: destrukcyjne/lockout-prone akcje mają confirm albo są disabled | Playwright i Vitest pokrywają cancel/confirm dla obszarów |
| Średni | Users | Zamknięte w `TASK-355-02`: `Reset password` wysyła set-password flow i nie zwraca tokenu do browsera | UI no-op został usunięty |
| Średni | Users | Zamknięte w `TASK-355-02`: invite/create-mode używa login-capable set-password email zamiast admin-set password field | hasło nie trafia do admin HTTP payloadu |
| Średni | Audit Logs | Zamknięte w `TASK-357-02` i `TASK-357-03`: `Copy JSON` działa z redakcją, unsupported entry actions są disabled, page export pobiera CSV/JSON | finalny smoke potwierdził widoczny export i filtry bez console errors |
| Średni | Access Logs | Zamknięte w `TASK-358-01` through `TASK-358-04`: paginacja, session detail/revoke, filtry i export są realne albo truthfully unavailable | finalny smoke potwierdził advanced filters i session detail |
| Średni | Settings | Zamknięte w `TASK-359-04` through `TASK-359-07`: Settings placeholdery są disabled/truthful albo wymagają confirmu | finalny Settings pass z 2026-06-02 pokrył wszystkie podstrony |
| Średni | Settings mobile/draft | Zamknięte w `TASK-359-02`: mobile ma Settings nav dla top-level sekcji i Security subroutes, a dirty drafts wymagają confirmu przy linkach, Back/Forward i refresh/close | boolean-only dirty guard zachowuje draft po cancel i nie serializuje sekretów |
| Średni | A11y | Zamknięte w `TASK-360-05`: audited sheets/drawers mają `SheetTitle`/`SheetDescription` i warning-free regression gate | finalne smoke'i nie miały console warnings |
| Niski | Testowalność | Część Radix Selectów jest krucha dla locatorów po accessible name | brakuje stabilnych `aria-label`/test ids |

## Jak naprawić

1. Zamknięte w `TASK-360-01` i area tasks: jeden backendowy/current-user
   mechanizm `can(permission)` zasila sidebar, route guardy, Users, Roles Matrix
   i Settings. API 403 zostaje defense-in-depth, nie pierwszym feedbackiem UI.
2. Zamknięte w `TASK-355`, `TASK-357`, `TASK-358`, `TASK-359` i `TASK-360-04`:
   audited controls mają realny handler + test albo disabled/unavailable state
   z czytelną kopią.
3. Zamknięte w `TASK-355-03`, `TASK-356-03`, `TASK-358-02`, `TASK-359-05` i
   `TASK-359-06`: destrukcyjne albo lockout-prone akcje używają confirmu albo
   są disabled.
4. Zamknięte w `TASK-359-02` i `TASK-359-03`: `SettingsSidebar` używa
   `AdminLink`, Settings ma dirty-state guard, mobilną nawigację sekcji oraz
   redacted/non-secret cache bez sekretów w localStorage.
5. Zamknięte w `TASK-360-05`: audited sheets/drawers mają `SheetTitle` i
   `SheetDescription` albo właściwe ukryte semantics oraz gate na brak Radix
   warningów.
6. Zamknięte w `TASK-357` i `TASK-358`: Audit i Access Logs mają server-side
   filters/pagination/export albo wyraźnie niedostępne entry-only actions.
7. Zamknięte w `TASK-359-05`/`TASK-360-07`: `Max sessions per user = 30`
   zostaje jako dated QA override z ownerem i reason w raportach.

## Status napraw - 2026-06-01

- `TASK-360-01` jest zaimplementowany: `/auth/me` zwraca redacted
  `permissionSnapshot`, Admin UI ma wspolny `can(permission)`, sidebar i route
  guards korzystaja z jednego helpera, a stale permission 403 odswieza snapshot.
- `TASK-360-02` jest zaimplementowany: shared confirm dialog ma typed
  confirmation, internal pending/error state i zachowana kompatybilnosc callsites.
- `TASK-360-03` jest zaimplementowany: shared export dialog nie moze juz
  aktywnie zamykac sie bez handlera, `xlsx` nie jest oferowany jako no-op, a
  Audit/Access Logs pokazuja explicit unavailable copy do czasu TASK-357-03 i
  TASK-358-03.
- `TASK-360-04` jest zaimplementowany: znane aktywnie wygladajace no-op controls
  z Users, Audit Logs, Access Logs i Settings sa teraz disabled/unavailable z
  jawnym powodem oraz Vitest gate po `data-no-op-control`.
- `TASK-360-05` jest zaimplementowany: mobile user sheet, Audit details, Access
  Log details oraz Settings drawers (IP Allowlist, Webhooks, Email Logs,
  Integrations) maja `SheetTitle`/`SheetDescription` i wspolny Vitest gate na
  brak Radix title/description warnings.
- `TASK-360-06` jest zaimplementowany: Audit/Access maja wspolne konwencje
  strict query, limit clamp, date-range validation, cursor/count-copy helpers i
  area-specific `*_query_invalid` errors. Pelna adopcja cursor UI zostaje w
  TASK-357/TASK-358.
- `TASK-358` jest zaimplementowany: Access Logs maja strict server query,
  cursor pagination, exact `User ID`, custom range, match labels, real session
  view/revoke z permission gatingiem, CSV/JSON export oraz realny advanced
  method/IP filters panel bez dodatkowych user/role directory lookupow.
- `TASK-359-01` jest zaimplementowany: `/admin/settings/**` fail-closed dla
  userow bez `settings:read`, Settings linki znikaja z UI, Users/Roles
  oraz Audit/Access breadcrumbi nie linkuja juz do Settings, a restricted
  Playwright passy dla `roles:read` i `audit:read` nie wykonaly zadnego
  `GET /admin/api/settings`.
- `TASK-359-02` jest zaimplementowany: Settings links przechodza przez
  `AdminLink`, shared router blocker chroni dirty drafts przy sidebar/direct
  links, Back/Forward i refresh/close, a mobile Settings nav pokazuje General,
  Assistant, Site, Security, Sessions, Login Alerts, IP Allowlist, API Keys,
  Webhooks, Email, Storage i Integrations. Playwright pass mial
  `authMeRequests: 0`, `documentLoadEvents: 0`, `auth429Responses: 0` podczas
  fazy klikniec sekcji.
- `TASK-359-03` jest zaimplementowany: `settings:redacted` hydratuje safe
  Settings values, mutacje settings/site/security emituja `cacheBus`, testy
  potwierdzaja brak secret-like keys w cache, a Site Settings nie wymusza juz
  odswiezenia `pages` i `content-types` przy swiezym cache selectorow.
  Playwright `task-359-03-settings-cache` mial cached General -> Site
  `settings: 1`, `pages: 0`, `contentTypes: 0`, `authMe: 0`,
  `markerPreserved: true` i `unsafeSettingsCachePaths: []`.
- `TASK-355-01` jest zaimplementowany: Users UI konsumuje shared permission
  snapshot, nie hardcoduje write permissions i wspiera partial
  `users:read`/`roles:read` bez pobocznych fetchy.
- `TASK-355-02` jest zaimplementowany: Users `Reset password` nie jest juz
  no-opem, invite/create-mode wysylaja set-password email, admin HTTP
  `password` field jest odrzucony, a tokeny resetu sa TTL-bound, single-use i
  nie sa zwracane do browsera.
- `TASK-355-03` jest zaimplementowany: Users/Roles destructive actions uzywaja
  shared confirm dialogu, role duplicate ma high-risk confirm i source-role
  audit context, a user/role destructive routes emituja redacted audit events.
- `TASK-355-04` jest zaimplementowany: Users advanced filter icon jest
  truthful disabled/unavailable, a notification switches sa read-only managed
  states objete shared no-op gate.
- `TASK-355-05` jest zaimplementowany: Users mobile details sheet ma
  `SheetTitle`/`SheetDescription` i warning-free drawer a11y regression gate.
- `TASK-359-04` jest zaimplementowany: General logo/favicon/timezone są
  disabled z jasną kopią, Site Performance nie jest aktywnym placeholderem, a
  ryzykowne Site routing changes otwierają `Review site routing changes`.
- `TASK-359-05` jest zaimplementowany: Security high-risk saves, Sessions
  revoke/revoke-all, API key rotate/revoke, webhook delete i IP allowlist remove
  mają cancel-safe confirms; current session/current IP lockout copy pozostaje
  widoczna.
- `TASK-359-06` jest zaimplementowany: Email test, webhook test/edit save,
  integration secret save i assistant reindex wymagają confirmu albo są
  truthfully unavailable; Storage test connection i Email export logs są
  disabled z owning-task copy.
- `TASK-359-07` jest zaimplementowany: Login Alerts unsupported tabs/advanced
  controls/sticky actions oraz Sessions link-buttons są disabled i objęte
  no-op gate.
- `TASK-360-07` jest zamknięty dokumentacyjnie: sześć raportów zostało
  uzupełnionych końcowym smoke evidence, QA override `Max sessions per user =
  30` ma dated owner/reason, a końcowe Claude evidence obejmuje fizyczny
  `playwright-cli` pass `claude-02-06-admin-physical`.

## Finalny re-audyt - 2026-06-02

- Subagent Playwright smoke `codex-02-06-admin-final-areas` kliknął Users,
  Roles Matrix, Audit Logs i Access Logs. Users delete confirm cancel nie
  wysłał mutacji; Roles Matrix bez zmian miało disabled `Review changes`;
  Audit filters/export były widoczne; Access Logs advanced filters i details
  drawer działały. Final console: 0 errors, 0 warnings.
- Główny Playwright smoke `codex-02-06-admin-final` kliknął wszystkie Settings
  podstrony. Potwierdzono disabled/unavailable controls, review/confirm dialogs
  i cancel-safe paths dla Site, Security, Sessions, Login Alerts, IP Allowlist,
  API Keys, Webhooks, Email, Storage, Integrations i Assistant. Final console:
  0 errors, 0 warnings.
- Dodatkowy finalny pass `codex-02-06-physical` po prośbie o commit ponownie
  kliknął Admin routes i Settings subroutes na świeżo odpalonym serwerze.
  Console: 0 errors, 0 warnings; po loginie requesty admin API wracały `200`.
- Claude final UI pass `claude-02-06-admin-physical` kliknął Dashboard, Users,
  Roles Matrix, Audit Logs, Access Logs, Settings oraz wszystkie Settings
  subroutes. Claude otworzył i anulował risky dialogs, potwierdził disabled
  states i secret masking, zamknął sesję Playwright i zwrócił PASS. Console:
  0 errors, 0 warnings; po loginie 711/711 requestów wróciło `200`.
- QA override: `Max sessions per user = 30` pozostaje intencjonalnie w lokalnej
  instancji audytu z datą 2026-06-02 i ownerem `TASK-360-07 / Admin UI
  Playwright QA`, żeby uniknąć churnu sesji podczas wielu równoległych sesji.
  Dashboard warning jest oczekiwany.

## Uwaga o Claude - 2026-06-01

Claude został uruchomiony także w drugiej fali. Próba samodzielnego przejścia
UI przez Claude z własną sesją `claude-01-06-admin-review` przekroczyła timeout
240 sekund i nie zwróciła raportu, mimo że uruchomiła Playwright daemon. Druga,
krótka próba Claude jako niezależny review evidence/source potwierdziła główne
wnioski: backend RBAC działa, a luka jest po stronie propagacji permissions i
gatingu UI. Trzecia próba Claude, zawężona do Settings source/UX, zwróciła
konkretny wynik: Settings nie mają cache layera dla wartości ustawień, a
aktywnie wyglądające placeholdery wymagają podłączenia albo wyłączenia.

Szczegóły per obszar są w raportach obok tego pliku.
