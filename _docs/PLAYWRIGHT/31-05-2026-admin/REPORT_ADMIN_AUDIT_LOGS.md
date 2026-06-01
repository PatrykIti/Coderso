# Admin Audit Logs - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/audit`. Źródła: `core/admin/ui/audit/AuditList.tsx`,
`AuditFilters.tsx`, `AuditTable.tsx`, `AuditDetailsDrawer.tsx`,
`core/admin/ui/shared/ExportDialog.tsx`.

## Co faktycznie kliknięto

### Druga fala E2E - 2026-06-01

- Zalogowano restricted usera z rolą zawierającą `audit:read`.
- Wejście w `/admin/audit` działało bez `Forbidden`.
- Tabela pokazała 200 wierszy przy limicie UI/API.
- Search `Auth` zawęził widok do 153 wierszy.
- `Export CSV` otworzył dialog `Export Audit Logs`.

### TASK-357-01 verification - 2026-06-01

- Playwright CLI zalogował tymczasowego restricted usera z rolą `audit:read`.
- `/admin/audit` załadowało się bez `Forbidden`.
- Date range `Last 30 days` był aktywny i wysłał `from`/`to` do
  `/admin/api/audit`.
- Event type `Authentication`, severity `Warning` i search `auth` wysłały
  odpowiednio `category=authentication`, `severity=warning` i `q=auth`.
- Widok nie pokazał dawnego placeholdera `2,459 logs`; count copy bazowało na
  załadowanych wierszach.
- Screenshot: `.tmp/task-357-01-audit-query.png`.

### TASK-357-02 verification - 2026-06-01

- `Copy JSON` w menu wiersza i drawerze uzywa tego samego handlera Clipboard API.
- Kopiowany JSON zawiera stabilne `createdAt`, kontekst widoczny w UI oraz
  redacted payload.
- Drawer payload renderuje ten sam zredagowany payload, wiec legacy/raw sekrety
  nie sa wyswietlane ani kopiowane.
- Brak Clipboard API albo odmowa zapisu pokazuje toast bledu.
- `Export entry`, `Share Log` i `Report` pozostaja disabled z jawna informacja,
  ze workflow jest niedostepny; page-level export pozostaje w `TASK-357-03`.
- Screenshot: `.tmp/task-357-02-copy-json.png`.

### TASK-357-03 verification - 2026-06-01

- Playwright CLI zalogowal tymczasowego restricted usera z rola `audit:read`.
- Search po unikalnym request/target id zwezil widok do jednego wiersza.
- `Export` otworzyl dialog `Export Audit Logs` bez dawnego komunikatu
  `not wired`.
- W dialogu wlaczono kolumne `Payload` i uruchomiono realny export CSV.
- Request trafil do `/admin/api/audit/export` z aktywnym `filters.query`,
  formatem `csv` i allowlistowanymi kolumnami, w tym `payload`.
- Pobrany plik `audit-logs-2026-06-01-search.csv` zawieral safe payload value,
  ale nie zawieral password, CSRF tokenu ani API key z fixture.
- Screenshot: `.tmp/task-357-03-audit-export.png`; CSV proof:
  `.tmp/task-357-03-export.csv`.

### TASK-357-04 verification - 2026-06-01

- Playwright CLI utworzyl 55 logow z unikalnym markerem i zalogowal
  tymczasowego restricted usera z rola `audit:read`.
- Pierwsza strona `/admin/audit` pokazala 50 wierszy, `Previous` byl disabled,
  a `Next` byl aktywny tylko dlatego, ze API zwrocilo `nextCursor`.
- Klik `Next` wyslal request do `/admin/api/audit` z `cursor=...` oraz
  aktywnymi filtrami `q`, `from` i `to`.
- Druga strona pokazala pozostale 5 wierszy, `Next` byl disabled, a
  `Previous` byl aktywny.
- Klik `Previous` wrocil na pierwsza strone requestem bez `cursor`, zachowujac
  aktywne filtry.
- Widok nie pokazal hard-coded `2,459 logs` ani dawnego no-op statusu dla
  `Next`.
- Screenshot: `.tmp/task-357-04-audit-pagination.png`.

### Pierwsza fala - 2026-05-31

- Wejście w `Audit Logs`.
- Search `auth`; tabela pokazała wyniki związane z auth.
- Klik wiersza; otworzył się drawer `Event Details`.
- Odczyt JSON payload w readonly textarea.
- Menu wiersza; widoczne `View details`, `Copy JSON`, `Export entry`.
- `Export CSV`; otworzył się export dialog z formatem i checkboxami pól.
- `Next` w export dialogu / próba zmiany formatu bez finalnego eksportu.

Nie klikano: finalny export jako rzeczywiste pobranie, share/report jako akcja
zewnętrzna.

## Co działało

- Lista logów renderuje dane z API.
- Search działa po event/resource/actor.
- Po `TASK-357-01` search, date range presets, event type/category i severity
  sa wysylane jako strict server query params (`q`, `from`, `to`, `category`,
  `severity`) zamiast filtrowac lokalny top-200 sample.
- Po `TASK-357-01` API zwraca `nextCursor`, a count copy opiera sie na liczbie
  zaladowanych wierszy i dostepnosci cursora, bez placeholdera `2,459 logs`.
- Po `TASK-357-04` `Next` i `Previous` realnie uzywaja cursor metadata z API,
  a zmiana search/date/type/severity resetuje page state do pierwszej strony.
- Drawer szczegółów pokazuje request/resource/status/payload.
- Export dialog otwiera się i ma poprawny title/description.
- Uprawnienie `audit:read` wystarcza do odczytu Audit Logs w restricted session.

## Co nie działało / co jest mylące

| Problem | Dowód z kodu | Skutek | Status |
| --- | --- | --- | --- |
| Date range nie wpływa na wyniki | `dateRange` jest state i propem do `AuditFilters`, ale `filteredLogs` używa tylko query/type/severity | user wybiera datę, a lista zostaje filtrowana bez daty | Zamknięte w `TASK-357-01` |
| `Copy JSON` nie kopiuje | pozycja menu i button w drawerze nie mają handlera | aktywna akcja bez efektu | Zamknięte w `TASK-357-02` |
| `Export entry`, `Share Log`, `Report` są UI-only | brak `onClick` w `AuditTable`/`AuditDetailsDrawer` | user widzi funkcje compliance, które nie działają | Zamknięte w `TASK-357-02`: akcje są disabled/unavailable; page-level export zamknięty w `TASK-357-03` |
| Export dialog nie generuje pliku | `ExportDialog` finalnie tylko `onOpenChange(false)` | wygląda jak export, ale tylko zamyka dialog | Zamknięte w `TASK-357-03`: export pobiera redacted CSV/JSON przez `/admin/api/audit/export` |
| Paginacja/table count jest placeholderem | table pokazywal `Showing 1 to X of 2,459 logs`, `Next` bez realnego page state | mylący obraz rozmiaru danych | Zamkniete w `TASK-357-04`: count copy jest metadata-driven, a Prev/Next uzywa realnego cursor state |

## Dlaczego

Widok ma UI dla pełnego compliance workflow, ale część zachowań była jeszcze
mockowana lokalnie. Przed `TASK-357-01` API ładowało limit 200 i filtrowało
część danych po stronie klienta. Po `TASK-357-01` listowanie jest
server-side dla search/date/category/severity i zwraca cursor metadata; export
i interaktywna paginacja zostaly rozbite na osobne leafy. Po `TASK-357-02`
row/drawer `Copy JSON` kopiuje zredagowany JSON z feedbackiem, a pozostale
akcje entry sa jawnie niedostepne zamiast wygladac jak dzialajace. Po
`TASK-357-03` page-level export jest realnym flow CSV/JSON z redakcja payloadu.
Po `TASK-357-04` interaktywna paginacja korzysta z `nextCursor` i stosu
poprzednich cursorow zamiast placeholdera UI.

## Jak naprawić

- Przenieść date range, type, severity i pagination do server-side query albo
  jawnie oznaczyć filtr jako lokalny. Status: query/date/type/severity i
  cursor metadata zamkniete w `TASK-357-01`; interaktywne page controls zostaja
  w `TASK-357-04`.
- `Copy JSON`: Clipboard API, toast success/error i redaction helper. Status:
  zamkniete w `TASK-357-02`.
- `Export entry`/`Share`/`Report`: implementować lub disable z tooltipem.
  Status: disabled/unavailable zamkniete w `TASK-357-02`; page-level export
  zamkniety w `TASK-357-03`.
- `ExportDialog`: przyjmować `onExport(payload)` i generować plik przez API.
  Status: zamkniete w `TASK-357-03`; page-level export uzywa
  `/admin/api/audit/export`, allowlisty kolumn i redacted CSV/JSON.
- Paginacja: zastąpić hard-coded count i `Next` realnym cursor/page state.
  Status: zamkniete w `TASK-357-04`; Playwright potwierdzil first/next/previous
  dla 55-logowej fixture i restricted `audit:read` usera.
