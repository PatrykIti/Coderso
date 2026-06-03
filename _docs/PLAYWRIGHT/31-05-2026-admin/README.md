# Audyt sekcji Admin UI - 31-05-2026

## Cel

Pogłębiony, klikany audyt sekcji **Admin** w panelu CMS, na żywej lokalnej
instancji, z `playwright-cli`, `claude` i przeglądem kodu. Nacisk: realnie
przeklikać kontrolki, a dla akcji destrukcyjnych używać kontrolowanych
fixture'ów albo jasno opisać, dlaczego dana akcja nie była wyzwalana.

To nie jest smoke-report. Każdy raport dokumentuje:

- co było faktycznie kliknięte w UI,
- co działało,
- co nie działało,
- dlaczego problem występuje według kodu,
- jak to naprawić.

## Zakres

Sekcja Admin (sidebar): **Users, Roles Matrix, Audit Logs, Access Logs,
Settings**.

Podstrony Settings: **General, Assistant, Site, Security, API Keys, Webhooks,
Email, Storage, Integrations** + podtrasy Security: **Sessions, Login Alerts,
IP Allowlist**.

## Środowisko i metoda

- Data: 2026-05-31 oraz uzupełnienia 2026-06-01 i 2026-06-02.
- Admin: `http://coderso-a.localhost:5173/admin/`.
- Frontend: `http://coderso-a.localhost:3000`.
- Sesje Playwright: `codex-31-05-admin-audit`, `codex-01-06-admin-e2e`,
  `codex-01-06-admin-rbac-user`, `codex-01-06-settings-cache`,
  `codex-02-06-admin-final`, `codex-02-06-admin-final-areas`,
  `codex-02-06-physical` i `claude-02-06-admin-physical`.
- Serwer lokalny: helper `coderso-dev-core-host`.
- Narzędzia: `playwright-cli`, `claude`, subagenci do równoległego source
  review, ręczny przegląd `core/admin/ui/**`.
- Security/session setup: zgodnie z instrukcją testową ustawiono
  **Max sessions per user = 30** i zapisano ustawienie w UI. Późniejsze
  ostrzeżenie dashboardu o zbyt permisywnej polityce sesji jest oczekiwane.
  QA override pozostaje świadomie w tej lokalnej instancji audytu z datą
  2026-06-02, ownerem `TASK-360-07 / Admin UI Playwright QA` i powodem:
  ograniczenie churnu sesji podczas długiego, wieloagentowego smoke'a.

Pierwsza fala klikała wyłącznie kontrolki bezpieczne: search, filtry,
otwieranie dialogów/drawerów, menu wierszy, export dialog bez finalnego
eksportu, toggle RBAC z `Cancel`, formularze bez zapisu. Druga fala dodała
kontrolowany fixture: testową rolę i testowego usera, login tym userem,
pozytywne zapisy admina oraz negatywne próby RBAC jako restricted user. Akcje
destrukcyjne wykonano tylko na fixture i posprzątano po teście.

Trzecia fala doprecyzowała Settings: kliknięto wszystkie opcje Settings przez
lokalny sidebar, zmierzono requesty/cache behavior, wykonano odwracalne zapisy
General/Site/Security i sprawdzono martwe kontrolki typu logo upload oraz
Storage `Test Connection`.

Końcowa fala 2026-06-02 potwierdziła status po implementacji `TASK-359-04`
through `TASK-359-07` i `TASK-360-07`: Users/Roles/Audit/Access zostały
przeklikane w smoke'u obszarowym, a wszystkie Settings subpages zostały
sprawdzone pod kątem disabled/unavailable states, review/confirm dialogs i
cancel-safe paths. Obie końcowe sesje miały 0 console errors i 0 warnings.
Dodatkowy pass po prośbie o commit uruchomił lokalny serwer ponownie i
przeklikał Admin UI w sesji `codex-02-06-physical`; niezależny pass Claude
użył sesji `claude-02-06-admin-physical`, fizycznie kliknął te same główne
route'y oraz wszystkie Settings subroute'y, anulował działania ryzykowne i
zwrócił PASS. W obu passach konsola miała 0 errors i 0 warnings; requesty po
loginie wracały `200`.

## Zawartość

- `REPORT_ADMIN_UI_AUDIT.md` - skrót całej fali i lista priorytetów.
- `REPORT_ADMIN_USERS.md` - Users i role w widoku Users & Roles.
- `REPORT_ADMIN_ROLES_MATRIX.md` - Roles Matrix i edycja uprawnień.
- `REPORT_ADMIN_AUDIT_LOGS.md` - Audit Logs.
- `REPORT_ADMIN_ACCESS_LOGS.md` - Access Logs.
- `REPORT_ADMIN_SETTINGS.md` - Settings: General, Assistant, Site, Security,
  Sessions, Login Alerts, IP Allowlist, API Keys, Webhooks, Email, Storage,
  Integrations.

## Akcje świadomie nie wyzwolone albo ograniczone

Nie klikano finalnie: revoke session / revoke all, create/rotate/revoke API
key, send test email, test webhook, zmiany CORS/CSRF/rate-limit/security
headers/admin path/IP allowlist. To są realne mutacje albo działania zewnętrzne;
w raportach opisano je na podstawie kodu i bezpiecznego otwarcia UI.

W Settings kliknięto i przywrócono tylko pola niskiego ryzyka: General
`Site name`, Site `Cache TTL (seconds)` i Security
`Password reset TTL (minutes)`. Nie zmieniano sekretów, providerów storage,
maili, webhooków, admin path, CORS/CSRF ani IP allowlist.

Kliknięto finalnie na fixture: create role, invite user, edit user, deactivate
user, activate user, save Roles Matrix, duplicate role, delete user i delete
role. Cleanup potwierdził brak pozostałych testowych rekordów.

## Uwaga o Claude

Claude był użyty w obu falach. W drugiej fali próba niezależnego UI pass przez
Claude uruchomiła własny Playwright daemon, ale przekroczyła timeout 240 sekund
i nie zwróciła raportu. Krótka próba review evidence/source przez Claude
zwróciła niezależne potwierdzenie głównych wniosków RBAC. W trzeciej fali
Claude został uruchomiony w węższym zakresie Settings source/UX i potwierdził
brak cache layera dla wartości Settings oraz listę UI-only controls.

W końcowej fali 2026-06-02 Claude był najpierw użyty jako source-only reviewer
po implementacji. Po dodatkowej prośbie o końcowe fizyczne przeklikanie Claude
został uruchomiony ponownie jako UI reviewer w sesji
`claude-02-06-admin-physical`. Ten pass użył `playwright-cli`, kliknął
Dashboard, Users, Roles Matrix, Audit Logs, Access Logs, Settings oraz
General, Assistant, Site, Security, Sessions, Login Alerts, IP Allowlist, API
Keys, Webhooks, Email, Storage i Integrations. Wynik: PASS, 0 console
errors/warnings, wszystkie requesty po loginie `200`, ryzykowne akcje otwarte
i anulowane bez finalnej mutacji.

## Uwaga o evidence

Raporty nie zawierają cookies, sekretów ani dumpów sesji. Weryfikacja była
żywa, ale do repo trafiają tylko wnioski i ścieżki źródłowe.
