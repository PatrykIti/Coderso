# Admin Access Logs - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/access-logs`. Źródła:
`core/admin/ui/security/AccessLogsPage.tsx`, `AccessLogsTable.tsx`,
`AccessLogDetailsDrawer.tsx`, `core/admin/ui/shared/ExportDialog.tsx`.

## Co faktycznie kliknięto

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

Nie klikano: `Revoke access`, finalny export, zewnętrzne akcje sesji.

## Co działało

- Lista pobiera dane z API z limitem 50 w UI i strict server query contract.
- Search buduje query i przeładowuje listę przez `q`.
- Status filter, exact `User ID`, `method`, `ip`, date range
  `last-7-days`/`last-30-days`/`this-month`, custom `from`/`to` oraz `cursor`
  są mapowane do requestu API.
- Details drawer otwiera się z realnymi danymi rekordu.
- `Previous` na pierwszej stronie jest disabled.
- `Next` jest sterowany przez backend `nextCursor`, a `Previous` wraca do
  poprzedniego cursor stack.
- Search pokazuje `matchContext.label`, np. `Matched user email`, gdy wynik
  pasuje po polu niewidocznym w głównej komórce.
- Uprawnienie `audit:read` wystarcza do odczytu Access Logs w restricted
  session.

## Co nie działało / co jest mylące

| Problem | Stan po TASK-358-01 | Skutek / dalszy owner |
| --- | --- | --- |
| `View full session` nie ma handlera | nadal niezamknięte | TASK-358-02 musi dodać realny session detail albo deterministyczny unavailable state |
| `Revoke access` nie ma handlera | nadal niezamknięte | TASK-358-02 musi dodać confirm/RBAC/audit albo deterministyczny unavailable state |
| User filter ma hard-coded role, nie użytkowników | zamknięte częściowo: static role select zastąpiony exact `User ID`, który wysyła `userId` | TASK-358-04 może dodać dynamiczny user picker/chips bez dodatkowego PII dla restricted `audit:read` |
| `Custom range` nie pokazuje pickera | zamknięte: custom range pokazuje start/end date inputs i waliduje kompletność/kolejność | brak dalszego ownera dla podstawowego custom range |
| Sliders button nie ma handlera | nadal niezamknięte, jawnie oznaczone jako unavailable `TASK-358-04` | TASK-358-04 musi dodać drawer albo usunąć przycisk |
| Paginacja jest statyczna | zamknięte: brak page 1/2/3, jest backend `nextCursor` i Previous/Next | brak dalszego ownera dla podstawowej paginacji |
| Search result match jest niewyjaśniony | zamknięte: row pokazuje `Matched user email`/inne match labels | brak dalszego ownera dla podstawowego wyjaśnienia wyników |
| Export dialog nie eksportuje | nadal niezamknięte | TASK-358-03 musi podłączyć CSV/JSON export do API lub pokazać unavailable state |

## Dlaczego

Pierwotnie widok miał sensowny API client dla listy, ale UI wyprzedzał backend
contract: szczegóły sesji, revoke, custom range, zaawansowane filtry,
paginacja i export nie miały kontraktu wykonawczego. Po TASK-358-01 część
listowa ma już server-side contract i realną paginację; nadal brakuje kontraktu
sesji/revoke, exportu i advanced filters.

## Jak naprawić

- TASK-358-02: dodać session relation/realny session detail i revoke z
  confirm modal, CSRF, RBAC silniejszym niż `audit:read`, self-lockout guard i
  audit event; historyczne rows bez session relation muszą mieć unavailable
  copy.
- TASK-358-03: podłączyć export do API z aktywnymi filtrami, allowlistą kolumn,
  redakcją sekretów i download feedbackiem albo pokazać jawnie unavailable.
- TASK-358-04: podłączyć sliders/advanced filters drawer i ewentualny dynamiczny
  user picker/chips, zachowując privacy dla restricted `audit:read`.
