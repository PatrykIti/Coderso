# Admin Access Logs - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/access-logs`. Źródła:
`core/admin/ui/security/AccessLogsPage.tsx`, `AccessLogsTable.tsx`,
`AccessLogDetailsDrawer.tsx`, `core/admin/ui/shared/ExportDialog.tsx`.

## Co faktycznie kliknięto

### TASK-358-04 verification - 2026-06-01

- Przygotowano restricted usera z rolą `audit:read` oraz kontrolowany access
  log `POST` z markerem w request path i IP `127.0.4.44`.
- Po zalogowaniu weszliśmy w `/admin/access-logs`, ustawiliśmy search po
  markerze i exact `User ID`; tabela pokazała `TASK 358-04 Advanced Filters`
  oraz `Matched request path`.
- Kliknięto ikonowy przycisk `Advanced access log filters`; otworzył się realny
  panel `Advanced access filters`.
- Wpisano `post` w `HTTP method` i `127.0.4` w `IP contains`, a następnie
  kliknięto `Apply filters`.
- Zarejestrowany request listy zawierał aktywne filtry `q`, exact `userId`,
  `method=POST`, `ip=127.0.4`, `limit=50` oraz `from`; nie używał dodatkowego
  directory/user lookup.
- UI pokazało aktywne chipsy `User ID: <id>`, `Method: POST` i
  `IP contains: 127.0.4`; nie pojawił się żaden chip `Role:`.
- Kliknięto chip clear dla `Method: POST`; kolejny request usunął `method`, ale
  zachował `q`, `userId` i `ip=127.0.4`.
- Podczas całego passu nie wystąpiły requesty do `/admin/api/users` ani
  `/admin/api/roles`, więc advanced filters nie rozszerzają PII poza aktualny
  access-log contract.
- Dowód screenshot: `.tmp/task-358-04-advanced-filters.png`.

### TASK-358-03 verification - 2026-06-01

- Przygotowano restricted usera z rolą `audit:read` oraz kontrolowany failed
  access log z markerem w request path i sekretami w `path`/`userAgent`
  (`token`, `Cookie`, `Authorization`, `password`).
- Po zalogowaniu weszliśmy w `/admin/access-logs`, ustawiliśmy search po
  markerze, exact `User ID` i status `Failed`; tabela pokazała
  `TASK 358-03 Access Export` oraz `Matched request path`.
- Kliknięto `Export`, otwarto `Export Access Logs`, zaznaczono opt-in pola
  `Path` i `User agent`, a następnie wykonano realny submit do
  `POST /admin/api/access-logs/export`.
- CSV file contract zwrócił
  `access-logs-2026-06-01-failed-search-user.csv` z kolumnami
  `user`, `ip`, `timestamp`, `status`, `path`, `userAgent`; content został
  zapisany jako `.tmp/task-358-03-access-export.csv`.
- Ponownie otwarto dialog, przełączono format na `JSON` i wykonano drugi realny
  submit do tego samego endpointu. JSON file contract zwrócił
  `access-logs-2026-06-01-failed-search-user.json`; content został zapisany jako
  `.tmp/task-358-03-access-export.json`.
- Oba payloady eksportu zawierały aktywne filtry `limit`, `query`, `userId`,
  `status`, `from` i nie zawierały `cursor`.
- Oba pliki zawierały marker publicznego path, ale nie zawierały surowych
  sekretów; `token`, `Cookie`, `Authorization` i `password` były zastąpione
  `[REDACTED]`.
- Playwright pass wykrył dwa drifty, które zostały naprawione w tym liściu:
  dialog nie wystawiał pola `User agent` mimo backendowej allowlisty, a shared
  export dialog przy większej liczbie pól wypychał przycisk `Export` poza
  viewport zamiast przewijać środek.
- Dowody: `.tmp/task-358-03-access-export.png`,
  `.tmp/task-358-03-access-export.csv`,
  `.tmp/task-358-03-access-export.json`.

### TASK-358-02 verification - 2026-06-01

- Przygotowano restricted usera z rolą `audit:read` oraz drugiego usera z
  `audit:read`, `settings:read`, `settings:write`.
- Po zalogowaniu restricted usera dosiano aktywną sesję i access log z
  `session_id`; wejście w `/admin/access-logs` i filtr po markerze/userId
  pokazały rekord.
- Otworzono `Access Log Details`; drawer pokazał `Active session`, ale
  `View full session` i `Revoke access` były disabled, `sessionId` nie był
  widoczny w UI, a żaden request `/revoke` nie został wysłany.
- Po zalogowaniu usera z settings permissions wyszukano ten sam access log
  należący do innego usera.
- Kliknięto `View full session`; UI przeszło do
  `/admin/settings/security/sessions?sessionId=<id>&userId=<targetUserId>` i
  pokazało `Showing the active session selected from access logs.` oraz
  `Selected from access log`.
- Wrócono do access loga, kliknięto `Revoke access`, wpisano `REVOKE` w
  confirm dialogu i potwierdzono destructive action.
- Zarejestrowano dokładnie jeden request
  `POST /admin/api/access-logs/<accessLogId>/revoke`.
- Po refetchu drawer pokazał `Session already revoked`, a revoke button był
  disabled.
- Dowód screenshot: `.tmp/task-358-02-session-revoke.png`.

### TASK-358-01 verification - 2026-06-01

- Przygotowano restricted usera z rolą zawierającą `audit:read` oraz 55
  kontrolowanych wpisów access log dla jednego userId.
- Zalogowano się na restricted usera i wejście w `/admin/access-logs` działało
  bez `Forbidden`.
- Wpisano query dopasowane do emaila użytkownika; tabela pokazała etykiety
  `Matched user email`, więc dopasowanie ukrytego pola jest wyjaśnione.
- Uzupełniono dokładny `User ID` i custom range `2026-06-01` -
  request zawierał `limit=50`, `q`, `userId`, `from` i `to`.
- Kliknięto `Next`; kolejny request zawierał opaque `cursor`.
- Kliknięto `Previous`; widok wrócił do pierwszej strony bez `cursor`.
- Dowód screenshot: `.tmp/task-358-01-access-pagination.png`.

### Druga fala E2E - 2026-06-01

- Zalogowano restricted usera z rolą zawierającą `audit:read`.
- Wejście w `/admin/access-logs` działało bez `Forbidden`.
- Tabela pokazała 200 wierszy przy domyślnym limicie.
- Search po testowym emailu usera zwrócił 61 wierszy, ale email nie był
  widoczny w samych komórkach wyników, więc dopasowanie query jest dla usera
  mało wyjaśnialne.
- `Export CSV` otworzył dialog `Export Access Logs`.
- Kliknięcie ikonowego sliders/advanced filters buttona nie otworzyło żadnego
  dialogu ani panelu.

### Pierwsza fala - 2026-05-31

- Wejście w `Access Logs`.
- Search `Patryk`; tabela pokazała logi pasujące do zapytania.
- Klik akcji wiersza; otworzył się drawer `Access Log Details`.
- Odczyt pól request/status/device/IP/user agent.
- `Export CSV`; otworzył się export dialog z pięcioma checkboxami pól.
- Próba paginacji: `Previous` był disabled, widoczne były strony 1/2/3.

W pierwszej fali nie klikano: `Revoke access`, finalny export, zewnętrzne akcje
sesji. Po TASK-358-02 realnie kliknięto view session i revoke.

## Co działało

- Lista pobiera dane z API z limitem 50 w UI i strict server query contract.
- Search buduje query i przeładowuje listę przez `q`.
- Status filter, exact `User ID`, date range
  `last-7-days`/`last-30-days`/`this-month`, custom `from`/`to` oraz `cursor`
  są mapowane do requestu API.
- Advanced filters panel jest realny: `HTTP method` normalizuje metodę do
  uppercase, `IP contains` filtruje po IP substring, a active chips pokazują
  dokładny scope.
- Details drawer otwiera się z realnymi danymi rekordu.
- `Previous` na pierwszej stronie jest disabled.
- `Next` jest sterowany przez backend `nextCursor`, a `Previous` wraca do
  poprzedniego cursor stack.
- Search pokazuje `matchContext.label`, np. `Matched user email`, gdy wynik
  pasuje po polu niewidocznym w głównej komórce.
- Uprawnienie `audit:read` wystarcza do odczytu Access Logs w restricted
  session.
- Session state w drawerze jest deterministyczny: aktywna sesja pokazuje
  dostępne akcje tylko wtedy, gdy użytkownik ma wymagane settings permissions.
- `View full session` jest podpięte do Settings Security Sessions i działa
  także dla aktywnej sesji innego usera przez query `sessionId` + `userId`.
- `Revoke access` używa typed confirm, CSRF-backed POST i po sukcesie odświeża
  drawer do `Session already revoked`.
- Restricted `audit:read` user nie widzi raw `sessionId` i nie może odpalić
  revoke.
- `Export` wysyła CSV/JSON z aktywnymi filtrami i selected allowlisted fields do
  `POST /admin/api/access-logs/export`, zwraca shared file contract oraz
  redaguje secret-bearing `path` i `userAgent`.

## Co nie działało / co jest mylące

| Problem | Stan po TASK-358-01 | Skutek / dalszy owner |
| --- | --- | --- |
| `View full session` nie ma handlera | zamknięte: aktywne/current sesje z `settings:read` przechodzą do Settings Sessions z `sessionId` i gated `userId`; audit-only dostaje disabled unavailable state | brak dalszego ownera dla podstawowego view session |
| `Revoke access` nie ma handlera | zamknięte: `settings:write` + CSRF + typed confirm wykonuje jeden POST revoke, blokuje current session i odświeża row state | brak dalszego ownera dla podstawowego revoke |
| User filter ma hard-coded role, nie użytkowników | zamknięte: static role select zastąpiony exact `User ID`, aktywny chip pokazuje exact user-id semantics, a role filtering jest celowo nieobecny bez historycznych role snapshots | brak dalszego ownera dla podstawowego user-filter truthfulness |
| `Custom range` nie pokazuje pickera | zamknięte: custom range pokazuje start/end date inputs i waliduje kompletność/kolejność | brak dalszego ownera dla podstawowego custom range |
| Sliders button nie ma handlera | zamknięte: otwiera realny `Advanced access filters` panel z method/IP filters, walidacją i chipsami | brak dalszego ownera dla podstawowych advanced filters |
| Paginacja jest statyczna | zamknięte: brak page 1/2/3, jest backend `nextCursor` i Previous/Next | brak dalszego ownera dla podstawowej paginacji |
| Search result match jest niewyjaśniony | zamknięte: row pokazuje `Matched user email`/inne match labels | brak dalszego ownera dla podstawowego wyjaśnienia wyników |
| Export dialog nie eksportuje | zamknięte: CSV/JSON export używa `/admin/api/access-logs/export`, aktywnych filtrów, allowlisty kolumn, CSRF i redakcji sekretów | brak dalszego ownera dla podstawowego exportu |

## Dlaczego

Pierwotnie widok miał sensowny API client dla listy, ale UI wyprzedzał backend
contract: szczegóły sesji, revoke, custom range, zaawansowane filtry,
paginacja i export nie miały kontraktu wykonawczego. Po TASK-358-01 część
listowa ma server-side contract i realną paginację. Po TASK-358-02 kontrakt
sesji/revoke jest wykonawczy. Po TASK-358-03 podstawowy CSV/JSON export jest
wykonawczy. Po TASK-358-04 advanced filters i user-filter truthfulness też są
wykonawcze bez dodatkowego user/role directory lookup.

## Jak naprawić

- TASK-358-02: zamknięte przez `access_logs.session_id`, realny session focus,
  confirm modal, CSRF, `settings:write`, self-lockout guard, audit event i
  unavailable copy dla rows bez aktywnej sesji.
- TASK-358-03: zamknięte przez `/admin/api/access-logs/export`, shared export
  helper, CSV/JSON file contract, allowlistę pól, redakcję sekretów,
  `access_logs.export` audit event i realny Playwright UI export pass.
- TASK-358-04: zamknięte przez realny `Advanced access filters` panel,
  method/IP validation, active chips, exact `User ID` semantics i brak
  dodatkowych `/users`/`/roles` lookupów dla restricted `audit:read`.
