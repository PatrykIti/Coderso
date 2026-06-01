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
| Wysoki | RBAC UI | Frontend nie propaguje efektywnych uprawnień usera do route/menu/components | `authClient.AuthUser` ma tylko `id/email/name`; `AdminApp` renderuje Users/Roles/Settings bez `can(permission)` |
| Wysoki | Users/Roles Matrix | Restricted user widzi i może kliknąć write controls, dopiero API odpowiada 403 | `UsersRolesPage` ma default `users/roles` read+write, `PermissionsMatrixPage` nie ma permission prop |
| Wysoki | Settings | User bez `settings:read` widzi Settings shell/default content i inline `Forbidden` | `getSettings()` odpala się globalnie po auth, bez route guard |
| Wysoki | Settings navigation | Przejścia między opcjami Settings robią pełny reload i ponowny `auth/me` + `settings` fetch | `SettingsSidebar` używa raw `<a>` zamiast `AdminLink`, więc omija SPA router/prefetch |
| Wysoki | Settings cache | Settings nie są cache'owane/hydratowane jak inne admin zasoby | brak settings cache keys/wrappers/cacheBus; klienty używają bezpośredniego `apiRequest` |
| Wysoki | Access Logs | `Revoke access` wygląda jak destrukcyjna akcja, ale nie ma handlera | `AccessLogDetailsDrawer.tsx` renderuje button bez `onClick` |
| Wysoki | Sessions/API Keys/Webhooks/IP Allowlist/Users | Część akcji destrukcyjnych wykonuje mutację bez potwierdzenia | handlery wywołują API bez confirm modal |
| Średni | Users | `Reset password` jest aktywne wizualnie, ale jest no-op | `UsersRolesPage.tsx` przekazuje `onResetPassword={() => undefined}` |
| Średni | Users | Invite User nie pozwala ustawić hasła, mimo że API/service wspiera `password` | UI ma tylko name/email/role, więc pełny login testowego usera wymaga API fixture albo reset flow |
| Średni | Audit Logs | `Copy JSON`, `Export entry`, `Share Log`, `Report` są UI-only | brak handlerów w menu/drawerze |
| Średni | Access Logs | Paginacja, `View full session`, część filtrów i export są niepełne | twarde page buttons, brak handlerów, export dialog tylko zamyka modal |
| Średni | Settings | Storage `Test Connection`, Email `Export Logs`, General uploady/timezone, Site Performance, część Login Alerts i Sessions link-buttons są UI-only | aktywne kontrolki nie mają backendowego działania |
| Średni | Settings mobile/draft | Lokalna nawigacja Settings znika na mobile, a raw-link navigation nie ma dirty-state guard | `SettingsShell` ukrywa sidebar poniżej `lg`; auto-save toggle nie chroni niezapisanych draftów |
| Średni | A11y | Kilka Sheet/Drawer powoduje warningi Radix o brakującym opisie, a IP Allowlist nie ma semantycznego `SheetTitle` | komponenty używają tekstu wizualnego zamiast `SheetTitle`/`SheetDescription` |
| Niski | Testowalność | Część Radix Selectów jest krucha dla locatorów po accessible name | brakuje stabilnych `aria-label`/test ids |

## Jak naprawić

1. Wprowadzić jeden backendowy/current-user mechanizm `can(permission)` i użyć
   go w sidebarze, route guardach, Users, Roles Matrix i Settings. API 403 ma
   zostać defense-in-depth, nie pierwszym feedbackiem UI.
2. Dla każdego UI-only buttona wybrać jedno: realny handler + test, albo
   `disabled`/ukrycie z czytelnym tooltipem. Najpierw `Reset password`,
   `Revoke access`, Audit actions, Storage test, Email export, General
   logo/favicon/timezone, Site Performance, Sessions link-buttons i Login
   Alerts placeholder controls.
3. Dodać confirm modal do każdej akcji destrukcyjnej lub lockout-prone:
   revoke sessions, revoke all, delete/deactivate user, delete role, rotate/revoke
   API key, delete webhook, remove IP allowlist entry, save high-risk security
   policy.
4. Przenieść `SettingsSidebar` na `AdminLink`, dodać dirty-state guard dla
   Settings i mobilną nawigację podsekcji. Osobno zaprojektować cache tylko dla
   redacted/non-secret settings, bez sekretów w localStorage.
5. Dodać `SheetTitle` i `SheetDescription` albo `VisuallyHidden` title/desc do
   Settings drawers i mobile user drawer; potem dodać Playwright assertion na
   brak Radix console errors/warnings.
6. Podłączyć prawdziwe server-side filters/pagination/export dla Audit i Access
   Logs. Jeżeli nie jest gotowe, UI powinno pokazywać stan "not available",
   nie aktywne przyciski.
7. Po audycie przywrócić `Max sessions per user` do wartości bezpiecznej
   (domyślnie 3) albo zostawić świadomie jako QA override z osobną notatką.

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
- Pozostale pozycje z raportu pozostaja przypisane do rodzin TASK-355..360.
  Część no-opow jest teraz jawnie niedostepna albo zaimplementowana, ale
  Settings cache/navigation, Audit/Access funkcje i finalny re-audyt UI nadal
  wymagaja osobnych implementacji w taskach obszarowych.

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
