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
- dashboard:write

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
- Dashboard: content:read for viewing the Dashboard/read-model; dashboard:write
  for saving/resetting the current user's Dashboard layout. `dashboard:write`
  is not classified as high-risk.

UI behavior:
- Admin UI buduje `can(permission)` z redacted `permissionSnapshot` zwracanego
  przez `GET /auth/me`; brak lub malformed snapshot fail-closed.
- Sidebar i admin route guards uzywaja tego samego helpera, a API 403 pozostaje
  defense-in-depth i wyzwala odswiezenie permission snapshotu.
- Globalne odczyty Admin shell rowniez musza sprawdzac snapshot przed fetch:
  settings (`settings:read`), admin theme (`themes:read`), custom-screen
  shortcuts (`content:read`) i solution-kit nav context (`solution-kits:read`).
- `/admin/settings/**` wymaga `settings:read` do renderowania Settings shell.
  Bez `settings:read` UI renderuje shared access denied przed globalnym
  `getSettings()` i przed section-specific Settings fetchami; Settings linki,
  w tym breadcrumbi z innych admin areas, nie moga kierowac do Settings.
- `/admin/users` jest dostepne przy `users:read` albo `roles:read`; bez obu
  uprawnien UI nie wykonuje fetchy Users/Roles.
- `users:read`-only pokazuje liste users bez role filter/details; `roles:read`
  -only pokazuje role cards/catalog bez tabeli users i invite.
- `/admin/roles` wymaga `roles:read` do odczytu macierzy. Bez `roles:read` UI
  renderuje access denied przed roles/catalog fetch. `roles:read` bez
  `roles:write` pokazuje searchable read-only matrix, ale nie aktywuje Add Role,
  bulk toggles, checkbox toggles ani Save changes. Stale 403 z odczytu albo
  zapisu wymusza odswiezenie permission snapshotu.
- `/admin/roles` zapisuje matrix przez review-first flow: footer pokazuje
  liczbe zmienionych rol oraz dodanych/usunietych permissions, `Review changes`
  otwiera role-by-role diff modal, Cancel nie wysyla zadnego PATCH, a Confirm
  PATCHuje tylko role z faktycznym diffem. Partial failure zostawia failed role
  dirty z role-specific error. Stale role conflicts (`409`/`412`,
  `role_conflict`, `role_stale`) blokuja retry do czasu jawnego odswiezenia
  rol.
- RoleEditor i Roles Matrix uzywaja tego samego high-risk taxonomy. Granty
  full-access (`*` albo kompletny katalog permissions), wildcard/write/security
  scopes i inne high-risk additions wymagaja osobnego confirm dialogu przed
  mutacja draftu albo finalnym zapisem. Read-only scopes takie jak `roles:read`
  nie sa high-risk same w sobie.
- Role create/duplicate/update/delete writes emit audit metadata with role
  id/name, sorted stored permission snapshots, and `fullAccess`. Role update
  events additionally include sorted `addedPermissions` and
  `removedPermissions`; diff semantics expand stored `*` to the current
  permission catalog while keeping the snapshot literal.
- Widoki Users/Roles wylaczaja akcje edycji bez odpowiedniego write
  permission, a stale 403 wymusza odswiezenie permission snapshotu.
- Ostatni admin nie moze zostac usuniety ani pozbawiony roli admin.
- Destrukcyjne akcje Users/Roles wymagaja confirm dialogu. Re-aktywacja usera
  wymaga confirm, gdy role sa high-risk albo UI nie ma `roles:read` i nie moze
  potwierdzic ryzyka. Duplicate role wymaga confirm dla `*`, wildcard scopes i
  high-risk permissions (`roles:write`, `users:write`, `settings:write`,
  `sessions:write`, `api-keys:write`, `plugins:manage`, `backups:write`,
  `themes:write`, `solution-kits:write`, `audit:read`).

## Enforcement

- Middleware `auth` sprawdza session.
- Middleware `rbac` sprawdza permission per route.
- UI ukrywa sekcje bez odpowiedniego permission.

### Permission requirement i snapshot transakcyjny (TASK-537)

- Legacy string jest normalizowany do zamrozonej listy z jednym wymaganiem.
  Kazda niepusta tablica ma semantyke all-of; pusta tablica zawsze fail-closed
  jako `forbidden`, rowniez dla aktora z wildcardem. `*` spelnia kazde
  wymaganie z niepustej listy.
- Brak aktora jest odrzucany przed zapytaniem. Snapshot laczy `user_roles` z
  `roles` w jednym SELECT i projektuje tylko `id`, `name` oraz `permissions`.
  Nie wolno dzielic decyzji na dwa zapytania, bo nie stanowilyby jednego
  snapshotu.
- Zablokowane mutacje content entry przekazuja executor swojej transakcji do
  guarda. Po `SELECT ... FOR UPDATE` guard wykonuje ten jeden JOIN na tym samym
  polaczeniu, co zachowuje kolejnosc decyzji i nie wymaga drugiego polaczenia z
  puli.
- Przy izolacji READ COMMITTED zmiany rol/user-role zatwierdzone przed startem
  tego statementu sa widoczne. Zmiany zatwierdzone po rozpoczeciu jego snapshotu
  nie zmieniaja wstecznie biezacej decyzji; zobaczy je kolejny guard.

## Plugin permissions

- Plugin permissions sa niezalezne od RBAC.
- Core gate dla plugin API sprawdza permissions z `plugin.json`.
