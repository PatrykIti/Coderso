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

## Enforcement

- Middleware `auth` sprawdza session.
- Middleware `rbac` sprawdza permission per route.
- UI ukrywa sekcje bez odpowiedniego permission.

## Plugin permissions

- Plugin permissions sa niezalezne od RBAC.
- Core gate dla plugin API sprawdza permissions z `plugin.json`.
