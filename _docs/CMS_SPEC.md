# CMS Spec (v1)

Dokument opisuje zakres i filozofie CMS. Szczegoly modelu danych i auth
znajduja sie w osobnych plikach (linki ponizej).

## Zakres CMS v1

- Pages + page builder (widgety/bloki).
- Media library (upload, metadata).
- Menus (nawigacja, stopka).
- Settings (globalne i per widget).
- Users + roles.
- Revisions i publish workflow (draft/published).
- Plugin registry i settings.
- Plugin store (browse, install/update, enable/disable, update policy).

Poza zakresem v1:
- Multi-site.
- Localization.
- Zaawansowany e-commerce (jako plugin).

## Dokumenty powiazane

- `DATA_MODEL.md`
- `CONTENT_TYPES_SPEC.md`
- `DESIGN_TOKENS.md`
- `MEDIA_SPEC.md`
- `PAGE_MODEL.md`
- `PREVIEW_SPEC.md`
- `ORM_SPEC.md`
- `AUTH_SPEC.md`
- `RBAC_SPEC.md`
- `CMS_API.md`
- `SEARCH_SPEC.md`
- `AUDIT_SPEC.md`
- `SECURITY_SPEC.md`
- `WIDGETS.md`

---

## Page builder (blokowy)

Model:
- Strona sklada sie z blokow (widgetow).
- Kazdy blok ma `type` (np. `hero`, `timeline`, `compare-timeline`) i `data`.
- `data` jest walidowane przez JSON schema danego widgetu.

Przechowywanie:
- Biezacy stan strony trzymany w `pages.current_data` (JSONB).
- Historia zmian w `page_revisions.data` (JSONB).

---

## Publishing

Statusy:
- draft
- published

Zasady:
- publikacja kopiuje dane z draft do published.
- publikacja tworzy revision.
- rollback do revision przywraca dane.
- v2: rozwazyc pruning starych rewizji i/lub kompresje JSONB.

---

## Media library

Zakres v1:
- upload plikow (obrazy, pdf).
- metadata: alt, title, caption.
- foldery logiczne (tagowanie) opcjonalnie.

Storage:
- domyslnie lokalny filesystem.
- mozliwosc przelaczenia na external storage (S3/Azure).
- szczegoly: `MEDIA_SPEC.md`.

---

## Menus

- menu locations (np. `primary`, `footer`).
- menu items z nestingiem.
- menu item moze wskazywac na page lub URL.

---

## Content types (kolekcje)

- Definicje schematow danych dla kolekcji (np. blog).
- Entries z statusami draft/published.
- Szczegoly: `CONTENT_TYPES_SPEC.md`.
- Content types sa tworzone w panelu admina (schema builder).
- Brak migracji tabel, dane w JSONB.

---

## Preview (draft)

- Podglad draft bez publikacji.
- Tokenized preview URL z TTL.
- Szczegoly: `PREVIEW_SPEC.md`.

---

## Search / indexing

- Wyszukiwanie w adminie (pages, entries, media).
- Wykorzystanie indeksow Postgres.
- Szczegoly: `SEARCH_SPEC.md`.

---

## Audit logs

- Minimalne logowanie kluczowych zdarzen admina.
- Szczegoly: `AUDIT_SPEC.md`.

---

## Design tokens

- Wspolny system tokenow dla core i pluginow.
- Szczegoly: `DESIGN_TOKENS.md`.

---

## Themes

- Theme definiuje szablony i wyglad.
- Theme profile pozwala zapisac rozne warianty wygladu (front 1, front 2).
- Aktywny jest jeden profil na raz.
- Szczegoly: `THEMES_SPEC.md`.

---

## Settings

Typy:
- global (site-wide)
- widget (per widget instance)
- plugin (per plugin)

Storage:
- `settings` (global)
- `plugin_settings` (plugin)
- widget settings w `pages.current_data`

Global settings (v1):
- `site.name`, `site.locale`
- `design.tokens` (override tokenow UI)

---

## Plugin integration

- Plugin rejestruje bloki, admin pages, routes.
- Core przechowuje stan pluginow w `plugins` i `plugin_settings`.
- Admin UI zawiera sklep pluginow + zarzadzanie zainstalowanymi pluginami
  (update policy domyslnie `auto-security`).

---

## Users (admin vs public)

- V1 dotyczy uzytkownikow panelu admina (admin/editor/viewer).
- Publiczni uzytkownicy (np. portal klienta) beda realizowani przez pluginy
  lub jako modul v1.1+.

---

## Admin UX

Role:
- admin (full)
- editor (content)
- viewer (read-only)

Widoki:
- Pages list + editor
- Media library
- Menus
- Settings
- Plugins store

UI ma byc spojne z modelem Wizard/Visual/Advanced dla widgetow.
Admin UI bazuje na shadcn/ui + Tailwind v4.

---

## API strategy

- REST admin API (`/admin/api`).
- Internal service layer w core (moduly serwisowe, bez publicznego endpointu).
- Admin UI komunikuje sie po HTTPS w ramach tej samej domeny
  (session cookie + CSRF).
