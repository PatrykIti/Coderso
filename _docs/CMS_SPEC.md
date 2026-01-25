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

Poza zakresem v1:
- Multi-site.
- Localization.
- Zaawansowany e-commerce (jako plugin).

## Dokumenty powiazane

- `DATA_MODEL.md`
- `ORM_SPEC.md`
- `AUTH_SPEC.md`
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

---

## Media library

Zakres v1:
- upload plikow (obrazy, pdf).
- metadata: alt, title, caption.
- foldery logiczne (tagowanie) opcjonalnie.

---

## Menus

- menu locations (np. `primary`, `footer`).
- menu items z nestingiem.
- menu item moze wskazywac na page lub URL.

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

---

## Plugin integration

- Plugin rejestruje bloki, admin pages, routes.
- Core przechowuje stan pluginow w `plugins` i `plugin_settings`.

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
