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
- Drawer szczegółów pokazuje request/resource/status/payload.
- Export dialog otwiera się i ma poprawny title/description.
- Uprawnienie `audit:read` wystarcza do odczytu Audit Logs w restricted session.

## Co nie działało / co jest mylące

| Problem | Dowód z kodu | Skutek | Status |
| --- | --- | --- | --- |
| Date range nie wpływa na wyniki | `dateRange` jest state i propem do `AuditFilters`, ale `filteredLogs` używa tylko query/type/severity | user wybiera datę, a lista zostaje filtrowana bez daty | Zamknięte w `TASK-357-01` |
| `Copy JSON` nie kopiuje | pozycja menu i button w drawerze nie mają handlera | aktywna akcja bez efektu | Otwarte w `TASK-357-02` |
| `Export entry`, `Share Log`, `Report` są UI-only | brak `onClick` w `AuditTable`/`AuditDetailsDrawer` | user widzi funkcje compliance, które nie działają | Otwarte w `TASK-357-02` |
| Export dialog nie generuje pliku | `ExportDialog` finalnie tylko `onOpenChange(false)` | wygląda jak export, ale tylko zamyka dialog | Otwarte w `TASK-357-03` |
| Paginacja/table count jest placeholderem | table pokazuje `Showing 1 to X of 2,459 logs`, `Next` bez realnego page state | mylący obraz rozmiaru danych | Count copy zamkniete w `TASK-357-01`; interaktywne Prev/Next zostaje w `TASK-357-04` |

## Dlaczego

Widok ma UI dla pełnego compliance workflow, ale część zachowań była jeszcze
mockowana lokalnie. Przed `TASK-357-01` API ładowało limit 200 i filtrowało
część danych po stronie klienta. Po `TASK-357-01` listowanie jest
server-side dla search/date/category/severity i zwraca cursor metadata; export
i interaktywna paginacja nadal sa osobnymi leafami.

## Jak naprawić

- Przenieść date range, type, severity i pagination do server-side query albo
  jawnie oznaczyć filtr jako lokalny. Status: query/date/type/severity i
  cursor metadata zamkniete w `TASK-357-01`; interaktywne page controls zostaja
  w `TASK-357-04`.
- `Copy JSON`: użyć Clipboard API, toast success/error, test Playwright z
  mockiem clipboard.
- `Export entry`/`Share`/`Report`: implementować lub disable z tooltipem.
- `ExportDialog`: przyjmować `onExport(payload)` i generować plik przez API;
  dopisać test formatu i pól.
- Paginacja: zastąpić hard-coded count i `Next` realnym cursor/page state.
