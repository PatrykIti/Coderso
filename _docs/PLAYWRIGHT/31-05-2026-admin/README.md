# Audyt sekcji Admin UI - 31-05-2026

## Cel

Pogłębiony, klikany audyt sekcji **Admin** w panelu CMS, na żywej lokalnej
instancji, z `playwright-cli`, `claude` i przeglądem kodu. Nacisk: realnie
przeklikać bezpieczne kontrolki, a dla akcji destrukcyjnych sprawdzić kod i
opisać, dlaczego nie były wyzwalane na żywo.

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

- Data: 2026-05-31.
- Admin: `http://coderso-a.localhost:5173/admin/`.
- Frontend: `http://coderso-a.localhost:3000`.
- Sesja Playwright: `codex-31-05-admin-audit`.
- Serwer lokalny: helper `coderso-dev-core-host`.
- Narzędzia: `playwright-cli`, `claude`, subagenci do równoległego source
  review, ręczny przegląd `core/admin/ui/**`.
- Security/session setup: zgodnie z instrukcją testową ustawiono
  **Max sessions per user = 30** i zapisano ustawienie w UI. Późniejsze
  ostrzeżenie dashboardu o zbyt permisywnej polityce sesji jest oczekiwane.

Klikane były wyłącznie kontrolki bezpieczne: search, filtry, otwieranie
dialogów/drawerów, menu wierszy, export dialog bez finalnego eksportu, toggle
RBAC z `Cancel`, formularze bez zapisu. Akcje destrukcyjne i akcje wysyłające
ruch zewnętrzny były oceniane z kodu.

## Zawartość

- `REPORT_ADMIN_UI_AUDIT.md` - skrót całej fali i lista priorytetów.
- `REPORT_ADMIN_USERS.md` - Users i role w widoku Users & Roles.
- `REPORT_ADMIN_ROLES_MATRIX.md` - Roles Matrix i edycja uprawnień.
- `REPORT_ADMIN_AUDIT_LOGS.md` - Audit Logs.
- `REPORT_ADMIN_ACCESS_LOGS.md` - Access Logs.
- `REPORT_ADMIN_SETTINGS.md` - Settings: General, Assistant, Site, Security,
  Sessions, Login Alerts, IP Allowlist, API Keys, Webhooks, Email, Storage,
  Integrations.

## Akcje świadomie nie wyzwolone

Nie klikano finalnie: revoke session / revoke all, delete/deactivate user,
zapis RBAC, create/rotate/revoke API key, send test email, test webhook, zmiany
CORS/CSRF/rate-limit/security headers/admin path/IP allowlist. To są realne
mutacje albo działania zewnętrzne; w raportach opisano je na podstawie kodu i
bezpiecznego otwarcia UI.

## Uwaga o evidence

Raporty nie zawierają cookies, sekretów ani dumpów sesji. Weryfikacja była
żywa, ale do repo trafiają tylko wnioski i ścieżki źródłowe.
