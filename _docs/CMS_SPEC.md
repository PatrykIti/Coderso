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
- `CONTENT_MODELING_COOKBOOK.md`
- `CONTENT_EDITOR_UX.md`
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
- Page builder posiada zakladki Widgets/Templates; template sections renderuja widget templates jako bloki.

Przechowywanie:
- Biezacy stan strony trzymany w `pages.current_data` (JSONB).
- Historia zmian i settings autosave trzymane w `page_revisions`:
  - `kind = publish` dla snapshotow publikacji,
  - `kind = autosave` dla najnowszego niezatwierdzonego Page Settings snapshot.

## Pages runtime parity (v1)

- Public rendering i runtime preview korzystaja z tego samego pipeline.
- `page.data.settings.template` wybiera page template przez resolver theme -> plugin -> core (fallback `landing`).
- Navigation widget moze zrodlo `linksSource = "pages"` i filtruje po `settings.showInNav` (fallback do manual przy zbyt malej liczbie linkow).

---

## Publishing

Statusy:
- draft
- published

Zasady:
- publikacja kopiuje dane z draft do published.
- publikacja tworzy revision.
- rollback do revision przywraca dane.
- retain policy: `settings.revisionRetention` (default 10) controls how many publish revisions are kept per page.
- oldest revisions are pruned on publish when limit is exceeded.
- zamkniecie Page Settings z niezapisanymi zmianami tworzy jeden autosave snapshot (`title`, `slug`, `data`).
- autosave nie jest traktowany jak publikowana rewizja i moze byc osobno `restore` albo `discard`.

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
- Admin UI jest list-first:
  - `/admin/menus` pokazuje liste menu i create entrypoint,
  - `/admin/menus/:id` edytuje tylko jedno wybrane menu.

---

## Content types (kolekcje)

- Definicje schematow danych dla kolekcji (np. blog).
- Entries z statusami draft/published.
- Szczegoly: `CONTENT_TYPES_SPEC.md`.
- Content types sa tworzone w panelu admina (schema builder).
- Brak migracji tabel, dane w JSONB.
- Schema zawiera meta‑pola UI (`xFieldType`, `xFieldConfig`) dla stabilnego round‑trip.

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
- `site.publicBaseUrl`
- `auth.sessionTtlDays`, `auth.resetTtlMinutes`
- `setup.completed`
- `design.tokens` (override tokenow UI)

### First-run setup lifecycle

- Po pierwszym logowaniu (gdy `setup.completed=false`) Admin App renderuje Setup Wizard.
- Wizard zbiera minimalny zestaw runtime/security:
  - `site.name`, `site.locale`, `site.publicBaseUrl`
  - `auth.sessionTtlDays`, `auth.resetTtlMinutes`
- Submit wykonuje jeden bulk `PATCH /settings` i ustawia `setup.completed=true`.
- Po sukcesie wizard znika i nie jest ponownie pokazywany (stan z DB).

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

UI ma byc spojne z modelem Wizard/Visual/Advanced dla widgetow:
- Wizard: minimal onboarding i bezpieczne defaulty.
- Visual: glowny tryb content + style editing.
- Advanced: techniczne ustawienia layout/responsive bez duplikacji pol Visual.

## Dashboard runtime data

- Dashboard admina korzysta z jednego modelu agregowanego zwracanego przez backend.
- Kontrakt payload obejmuje:
  - `totals` (pages, entries, media, users),
  - `recentEdits` (merge page/entry/media, sort malejaco po czasie),
  - `storage` (used bytes + optional limit/percent),
  - `security` (status + checki: csrf/rateLimit/headers/sessionPolicy).
- Zrodlem danych sa tabele CMS i runtime `security.settings`.
- W ramach MVP brak metryk ruchu publicznego (np. visitors/page views z zewnetrznej analityki).
- Admin UI dashboard renderuje loading/error/retry states i mapuje sekcje KPI/Recent Edits/Security z jednego payloadu API.
Admin UI bazuje na shadcn/ui + Tailwind v4.

---

## API strategy

- REST admin API (`/admin/api`).
- Internal service layer w core (moduly serwisowe, bez publicznego endpointu).
- Admin UI komunikuje sie po HTTPS w ramach tej samej domeny
  (session cookie + CSRF).
