# Admin Audit Logs - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/audit`. Źródła: `core/admin/ui/audit/AuditList.tsx`,
`AuditFilters.tsx`, `AuditTable.tsx`, `AuditDetailsDrawer.tsx`,
`core/admin/ui/shared/ExportDialog.tsx`.

## Co faktycznie kliknięto

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
- Severity i event type są podpięte w filtrze klienta.
- Drawer szczegółów pokazuje request/resource/status/payload.
- Export dialog otwiera się i ma poprawny title/description.

## Co nie działało / co jest mylące

| Problem | Dowód z kodu | Skutek |
| --- | --- | --- |
| Date range nie wpływa na wyniki | `dateRange` jest state i propem do `AuditFilters`, ale `filteredLogs` używa tylko query/type/severity | user wybiera datę, a lista zostaje filtrowana bez daty |
| `Copy JSON` nie kopiuje | pozycja menu i button w drawerze nie mają handlera | aktywna akcja bez efektu |
| `Export entry`, `Share Log`, `Report` są UI-only | brak `onClick` w `AuditTable`/`AuditDetailsDrawer` | user widzi funkcje compliance, które nie działają |
| Export dialog nie generuje pliku | `ExportDialog` finalnie tylko `onOpenChange(false)` | wygląda jak export, ale tylko zamyka dialog |
| Paginacja/table count jest placeholderem | table pokazuje `Showing 1 to X of 2,459 logs`, `Next` bez realnego page state | mylący obraz rozmiaru danych |

## Dlaczego

Widok ma UI dla pełnego compliance workflow, ale część zachowań jest jeszcze
mockowana lokalnie. API ładuje limit 200 i filtruje część danych po stronie
klienta; export/paginacja nie są spięte z backendem.

## Jak naprawić

- Przenieść date range, type, severity i pagination do server-side query albo
  jawnie oznaczyć filtr jako lokalny.
- `Copy JSON`: użyć Clipboard API, toast success/error, test Playwright z
  mockiem clipboard.
- `Export entry`/`Share`/`Report`: implementować lub disable z tooltipem.
- `ExportDialog`: przyjmować `onExport(payload)` i generować plik przez API;
  dopisać test formatu i pól.
- Paginacja: zastąpić hard-coded count i `Next` realnym cursor/page state.
