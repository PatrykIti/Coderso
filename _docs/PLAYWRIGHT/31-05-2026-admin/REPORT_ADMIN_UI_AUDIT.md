# Admin UI - raport zbiorczy (31-05-2026)

Źródło: live Playwright na sesji `codex-31-05-admin-audit`, ukończony
przegląd scope/risk przez `claude`, subagenci do source audit oraz ręczna
weryfikacja kodu w `core/admin/ui/**`.

---

## Co działało

- Admin routes renderowały się po zalogowaniu: Users, Roles Matrix, Audit Logs,
  Access Logs oraz wszystkie Settings subpages.
- Search działał w Users, Roles Matrix, Audit Logs i Access Logs.
- Dialogi/drawery otwierały się: Invite User, Create Role/Add Role, Edit User,
  Audit details, Access Log details, export dialogi, Settings drawers.
- Roles Matrix poprawnie pokazywał dirty state po kliknięciu checkboxa i
  `Cancel` przywracał stan bez zapisu.
- Security settings pozwoliły zmienić i zapisać `Max sessions per user = 30`,
  a dashboard później pokazał oczekiwany warning o zbyt permisywnej polityce.

## Co nie działało lub jest mylące

| Priorytet | Obszar | Problem | Dlaczego |
| --- | --- | --- | --- |
| Wysoki | Access Logs | `Revoke access` wygląda jak destrukcyjna akcja, ale nie ma handlera | `AccessLogDetailsDrawer.tsx` renderuje button bez `onClick` |
| Wysoki | Sessions/API Keys/Webhooks/IP Allowlist/Users | Część akcji destrukcyjnych wykonuje mutację bez potwierdzenia | handlery wywołują API bez confirm modal |
| Średni | Users | `Reset password` jest aktywne wizualnie, ale jest no-op | `UsersRolesPage.tsx` przekazuje `onResetPassword={() => undefined}` |
| Średni | Audit Logs | `Copy JSON`, `Export entry`, `Share Log`, `Report` są UI-only | brak handlerów w menu/drawerze |
| Średni | Access Logs | Paginacja, `View full session`, część filtrów i export są niepełne | twarde page buttons, brak handlerów, export dialog tylko zamyka modal |
| Średni | Settings | Storage `Test Connection`, Email `Export Logs`, część General uploadów są UI-only | aktywne kontrolki nie mają backendowego działania |
| Średni | A11y | Kilka Sheet/Drawer powoduje warningi Radix o brakującym opisie, a IP Allowlist nie ma semantycznego `SheetTitle` | komponenty używają tekstu wizualnego zamiast `SheetTitle`/`SheetDescription` |
| Niski | Testowalność | Część Radix Selectów jest krucha dla locatorów po accessible name | brakuje stabilnych `aria-label`/test ids |

## Jak naprawić

1. Dla każdego UI-only buttona wybrać jedno: realny handler + test, albo
   `disabled`/ukrycie z czytelnym tooltipem. Najpierw `Reset password`,
   `Revoke access`, Audit actions, Storage test i Email export.
2. Dodać confirm modal do każdej akcji destrukcyjnej lub lockout-prone:
   revoke sessions, revoke all, delete/deactivate user, delete role, rotate/revoke
   API key, delete webhook, remove IP allowlist entry, save high-risk security
   policy.
3. Dodać `SheetTitle` i `SheetDescription` albo `VisuallyHidden` title/desc do
   Settings drawers i mobile user drawer; potem dodać Playwright assertion na
   brak Radix console errors/warnings.
4. Podłączyć prawdziwe server-side filters/pagination/export dla Audit i Access
   Logs. Jeżeli nie jest gotowe, UI powinno pokazywać stan "not available",
   nie aktywne przyciski.
5. Po audycie przywrócić `Max sessions per user` do wartości bezpiecznej
   (domyślnie 3) albo zostawić świadomie jako QA override z osobną notatką.

Szczegóły per obszar są w raportach obok tego pliku.
