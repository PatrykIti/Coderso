# RBAC Spec (v1)

Role Based Access Control dla panelu admina i admin API.

## Permission naming

Format: `domain:action`

Przyklady:
- content:read
- content:write
- content:publish
- media:read
- media:write
- menus:read
- menus:write
- settings:read
- settings:write
- plugins:read
- plugins:manage
- store:browse
- users:read
- users:write
- roles:read
- roles:write
- audit:read
- themes:read
- themes:write

## Default roles

Admin:
- wszystkie permissions

Editor:
- content:read
- content:write
- content:publish
- media:read
- media:write
- menus:read
- menus:write
- settings:read

Theme access:
- themes:read (admin only by default)
- themes:write (admin only)

Viewer:
- content:read
- media:read
- menus:read
- settings:read

Notes:
- `audit:read` tylko dla Admin.
- Role sa konfigurowalne w panelu admina.
- RBAC dotyczy uzytkownikow admina (nie publicznych).

## UI mapping (v1)

- Pages: content:read/write/publish
- Media: media:read/write
- Menus: menus:read/write
- Settings: settings:read/write
- Plugins/Store: plugins:read/manage + store:browse
- Users/Roles: users:read/write + roles:read/write
- Audit: audit:read

UI behavior:
- Admin UI buduje `can(permission)` z redacted `permissionSnapshot` zwracanego
  przez `GET /auth/me`; brak lub malformed snapshot fail-closed.
- Sidebar i admin route guards uzywaja tego samego helpera, a API 403 pozostaje
  defense-in-depth i wyzwala odswiezenie permission snapshotu.
- Globalne odczyty Admin shell rowniez musza sprawdzac snapshot przed fetch:
  settings (`settings:read`), admin theme (`themes:read`), custom-screen
  shortcuts (`content:read`) i solution-kit nav context (`solution-kits:read`).
- `/admin/users` jest dostepne przy `users:read` albo `roles:read`; bez obu
  uprawnien UI nie wykonuje fetchy Users/Roles.
- `users:read`-only pokazuje liste users bez role filter/details; `roles:read`
  -only pokazuje role cards/catalog bez tabeli users i invite.
- Widoki Users/Roles wylaczaja akcje edycji bez odpowiedniego write
  permission, a stale 403 wymusza odswiezenie permission snapshotu.
- Ostatni admin nie moze zostac usuniety ani pozbawiony roli admin.
- Destrukcyjne akcje Users/Roles wymagaja confirm dialogu. Re-aktywacja usera
  wymaga confirm, gdy role sa high-risk albo UI nie ma `roles:read` i nie moze
  potwierdzic ryzyka. Duplicate role wymaga confirm dla `*`, wildcard scopes i
  high-risk permissions (`roles:write`, `users:write`, `settings:write`,
  `plugins:manage`, `backups:write`, `themes:write`, `solution-kits:write`,
  `audit:read`).

## Enforcement

- Middleware `auth` sprawdza session.
- Middleware `rbac` sprawdza permission per route.
- UI ukrywa sekcje bez odpowiedniego permission.

## Plugin permissions

- Plugin permissions sa niezalezne od RBAC.
- Core gate dla plugin API sprawdza permissions z `plugin.json`.
