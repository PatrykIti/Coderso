# Admin Access Logs - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/access-logs`. Źródła:
`core/admin/ui/security/AccessLogsPage.tsx`, `AccessLogsTable.tsx`,
`AccessLogDetailsDrawer.tsx`, `core/admin/ui/shared/ExportDialog.tsx`.

## Co faktycznie kliknięto

- Wejście w `Access Logs`.
- Search `Patryk`; tabela pokazała logi pasujące do zapytania.
- Klik akcji wiersza; otworzył się drawer `Access Log Details`.
- Odczyt pól request/status/device/IP/user agent.
- `Export CSV`; otworzył się export dialog z pięcioma checkboxami pól.
- Próba paginacji: `Previous` był disabled, widoczne były strony 1/2/3.

Nie klikano: `Revoke access`, finalny export, zewnętrzne akcje sesji.

## Co działało

- Lista pobiera dane z API z limitem 200.
- Search buduje query i przeładowuje listę.
- Status filter i date range `last-7-days`/`last-30-days`/`this-month`
  są mapowane do requestu API.
- Details drawer otwiera się z realnymi danymi rekordu.
- `Previous` na pierwszej stronie jest disabled.

## Co nie działało / co jest mylące

| Problem | Dowód z kodu | Skutek |
| --- | --- | --- |
| `View full session` nie ma handlera | button w `AccessLogDetailsDrawer.tsx` bez `onClick` | user oczekuje przejścia do sesji, nic się nie dzieje |
| `Revoke access` nie ma handlera | destructive button bez `onClick` | najgorszy typ martwego UI: destrukcyjny wygląd, brak działania |
| User filter ma hard-coded role, nie użytkowników | select zawiera `Admin`, `Editor`, `Viewer`, a query dokleja tekst filtra | filtr nie jest zgodny z etykietą "User" |
| `Custom range` nie pokazuje pickera | `resolveDateRange("custom")` zwraca pusty obiekt | user wybiera custom, ale nie ma gdzie podać dat |
| Sliders button nie ma handlera | ghost icon button bez `onClick` | wygląda jak advanced filters |
| Paginacja jest statyczna | `pageButtons = ["1","2","3"]`, brak page state | page 2/3 nie są realną paginacją |
| Export dialog nie eksportuje | shared `ExportDialog` tylko zamyka modal | brak pliku i brak feedbacku |

## Dlaczego

Widok ma już sensowny API client dla listy, ale UI wyprzedza backend contract:
szczegóły sesji, revoke, custom range, zaawansowane filtry, paginacja i export
nie mają jeszcze kontraktu wykonawczego.

## Jak naprawić

- Usunąć albo disable `View full session` i `Revoke access` do czasu realnych
  endpointów. Przy revoke dodać confirm modal i audit event.
- Zamienić user filter na dynamiczną listę użytkowników albo zmienić etykietę
  na `Role/query filter`.
- Dodać custom date picker z walidacją `from <= to`.
- Wprowadzić server-side pagination/cursor i prawdziwy active page state.
- Podłączyć export do API lub ukryć finalny button.
