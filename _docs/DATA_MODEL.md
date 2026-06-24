# Data Model (v1)

Opis docelowego modelu danych CMS. Typy sa pogladowe.

## Users and Auth

`users`
- id (uuid, pk)
- email (unique)
- password_hash
- name
- status (active|disabled)
- created_at
- updated_at
- last_login_at

`roles`
- id (uuid, pk)
- name (unique)
- permissions (jsonb string[])
- created_at

`user_roles`
- user_id (fk users)
- role_id (fk roles)

`sessions`
- id (uuid, pk)
- user_id (fk users)
- token_hash
- ip
- user_agent
- created_at
- expires_at
- revoked_at

## Pages

`pages`
- id (uuid, pk)
- slug (unique)
- title
- status (draft|published)
- current_data (jsonb)
- published_data (jsonb, nullable)
- created_at
- updated_at
- published_at

`page_revisions`
- id (uuid, pk)
- page_id (fk pages)
- version (int)
- data (jsonb)
- created_at
- created_by (fk users)

Note (v2+):
- `page_revisions` z duzymi JSONB moze szybko rosnac. Warto dodac pruning
  starych rewizji i/lub kompresje danych.

## Content types

`content_types`
- id (uuid, pk)
- name
- slug (unique)
- schema (jsonb)
- created_at
- updated_at

`content_entries`
- id (uuid, pk)
- type_id (fk content_types)
- author_id (fk users, nullable)
- slug
- title
- status (draft|published|scheduled|archived)
- tags (jsonb, default [])
- data (jsonb)
- created_at
- updated_at
- published_at
- scheduled_at

Visitor listing indexes (TASK-459-04):

- `content_entries_type_status_published_idx` btree on
  `(type_id, status, published_at)` keeps published-scope list scans bounded.
- `content_entries_data_gin_idx` GIN on `data jsonb_path_ops` supports
  allowlisted containment-style visitor filters. The project deliberately does
  not ship per-field expression indexes in the static migration because field
  paths are content-type authored and not globally known; hot deployments can
  add site-specific expression indexes later without changing the generic
  schema contract.

`content_revisions`
- id (uuid, pk)
- entry_id (fk content_entries)
- version (int)
- data (jsonb)
- created_at
- created_by (fk users)

`content_taxonomies`
- id (uuid, pk)
- type_id (fk content_types)
- name
- slug
- kind (category|tag)
- created_at
- updated_at

`content_terms`
- id (uuid, pk)
- taxonomy_id (fk content_taxonomies)
- name
- slug
- created_at
- updated_at

`content_term_assignments`
- entry_id (fk content_entries)
- term_id (fk content_terms)
- created_at

Note:
- Nazwy tagow sa rowniez zapisywane w `content_entries.tags` dla wyszukiwania.

Note (v2+):
- `content_revisions` z duzymi JSONB moze szybko rosnac. Warto dodac pruning
  starych rewizji i/lub kompresje danych.

## Custom Screens

`custom_screens`
- id (uuid, pk)
- content_type_id (fk content_types)
- name
- status (draft|active|archived)
- schema_version (int, default 4)
- definition (jsonb, not null)
- show_in_sidebar (boolean)
- sidebar_label (nullable)
- collection_role (nullable)
- composition_key (nullable)
- created_at
- updated_at

Rules:
- `definition.schemaVersion=4` is the source of truth for Custom Screens.
- `definition.listView` owns records-list columns, filters, default sort, and
  bulk-action visibility.
- `definition.editorView.document` owns `ScreenDocumentV1.sections[]`; it is
  not a Page v2 document.
- `definition.editorView.bindings` maps `blockId + propPath` to content entry
  fields or allowlisted system fields.
- Legacy `blocks` and `bindings` columns were removed by TASK-468 after the V4
  backfill; older payloads are migration inputs only, not active storage.

`custom_screen_entry_presentation_overrides`
- screen_id (fk custom_screens, cascade delete)
- entry_id (fk content_entries, cascade delete)
- block_id (text)
- prop_path (text)
- value (jsonb)
- updated_by (fk users, set null)
- created_at
- updated_at

Indexes:
- unique `(screen_id, entry_id, block_id, prop_path)` keeps each record/block
  presentation target deterministic.
- `(screen_id, entry_id)` supports scoped override reads and replace writes.
- `entry_id`, `updated_by`, and `updated_at` support cleanup/audit queries.

Rules:
- Overrides store presentation only, never content field values and never
  provider credentials or protected settings.
- Allowed `prop_path` values are bounded by the service contract:
  `image`, `mediaAssetId`, `textSize`, `textEmphasis`, and `tone`.
- Media override values are media asset UUIDs and must target media field
  blocks; text/style values use bounded enum tokens.
- Screen and entry deletes are handled by FK cascade.
- Block/field drift is handled defensively at read time by skipping unresolved
  rows, with cleanup helpers available to remove stale targets after definition
  or schema changes.

## Preview

`preview_tokens`
- id (uuid, pk)
- target_type (page|content)
- target_id (uuid)
- token_hash
- expires_at
- created_at

## Media

`media`
- id (uuid, pk)
- key (storage key)
- url
- type (image|file)
- mime_type
- size
- width
- height
- alt
- title
- caption
- created_at
- created_by (fk users)

## Menus

`menus`
- id (uuid, pk)
- name
- location (nullable string theme/runtime slot key, e.g. primary or footer)
- status (draft|published)
- published_at (nullable)
- created_at
- settings (nullable jsonb; appearance envelope, TASK-458-02)

`menu_items`
- id (uuid, pk)
- menu_id (fk menus)
- label
- href
- page_id (fk pages, nullable)
- order_index
- parent_id (fk menu_items, nullable)

Zasady:
- `menus.location` unikalny, gdy ustawiony; wartosc jest slot key uzywanym
  przez theme/runtime navigation, nie zamknietym enumem.
- Runtime navigation uzywa tylko menu ze statusem `published`.
- `menu_items` musi miec dokladnie jedno z `href` lub `page_id`.
- `parent_id` referencjonuje element w tym samym menu.
- `menus.settings` to nullowalna koperta
  `{ appearance?: MenuAppearance; extras?: PageBlockV2[]; published?: { appearance?: MenuAppearance; extras?: PageBlockV2[] } }`
  (TASK-458-02/03). Top-level `appearance`/`extras` to draft edytora designu;
  `published` to publiczny snapshot kopiowany przez `publishMenu`.
  `appearance` waliduje `normalizeMenuAppearance` (reject-unknown, zacisniete
  liczby, tokenowe kolory); `extras` (bloki nav extras: tylko `button` i
  `image`, limit slotu) waliduje `normalizeMenuNavExtras` przez schemat
  blokow Page v2 (`menu_nav_extras_invalid`). `updateMenu` merguje draft per
  klucz (aktualizacja jednego klucza nie kasuje drugiego) i przy pierwszej
  edycji opublikowanego menu zachowuje obecny publiczny snapshot. Publiczny
  shell czyta `published` przez `resolvePublishedMenuAppearance` /
  `resolvePublishedMenuNavExtras`; starsze koperty bez `published` zachowuja
  kompatybilny fallback do top-level. `null` lub pusty snapshot = wyglad
  legacy i brak slotu extras.

## Widgets & Templates

`widget_templates`
- id (uuid, pk)
- name
- description (nullable)
- category (string)
- status (draft|published)
- blocks (jsonb)
- created_at
- updated_at

`widget_template_revisions`
- id (uuid, pk)
- template_id (fk widget_templates)
- version (int)
- name
- description (nullable)
- category (string)
- status (draft|published)
- blocks (jsonb)
- created_at
- created_by (fk users, nullable)

## Coderso Solution Kits Install Runs

`solution_kit_install_runs`
- id (uuid, pk)
- kit_id
- mode (`dry_run|apply|rollback`)
- status (`running|success|failed`)
- actor_id (fk users, nullable)
- rollback_of_run_id (fk solution_kit_install_runs, nullable)
- options (jsonb)
- summary (jsonb)
- error (nullable)
- created_at
- updated_at
- finished_at (nullable)

`solution_kit_install_items`
- id (uuid, pk)
- run_id (fk solution_kit_install_runs, cascade delete)
- position (int)
- resource_type (`content_type|form|page|menu`)
- resource_key (slug/location key)
- operation (`create|update|noop|delete|restore`)
- status (`planned|success|failed|skipped`)
- before_snapshot (jsonb, nullable)
- after_snapshot (jsonb, nullable)
- rollback_action (jsonb, nullable)
- error (nullable)
- created_at
- updated_at

Note:
- Install traceability jest per-run i per-resource.
- `before_snapshot`/`after_snapshot` wspieraja rollback best-effort oraz audyt.

## Themes

Theme'y sa dostarczane z `/themes` (foldery na dysku). W bazie trzymamy tylko
profile oraz mapowanie tras.

`theme_profiles`
- id (uuid, pk)
- name
- description
- theme_name (string, name z `theme.json`)
- tokens (jsonb)
- is_active (bool)
- created_at
- updated_at

`theme_routes`
- id (uuid, pk)
- profile_id (fk theme_profiles)
- path
- page_id (fk pages)

## Settings

`settings`
- key (pk)
- value (jsonb)
- updated_at

Przykładowe klucze:
- `site.name`, `site.locale`
- `site.adminBaseUrl`, `site.publicBaseUrl`
- `site.adminPath`, `site.adminRedirectEnabled`
- `site.homepageId`, `site.notFoundPageId`
- `site.previewEnabled`
- `site.cacheTtlSeconds`
- `site.contentRoutes`
- `design.tokens`
- `search.categoryOverrides`
- `widgets.templateCategories`

`user_settings`
- user_id (fk users)
- key
- value (jsonb)
- updated_at

## Audit logs

`audit_logs`
- id (uuid, pk)
- actor_id (fk users)
- action (string)
- target_type (string)
- target_id (string)
- metadata (jsonb)
- created_at

## Plugins

`plugins`
- id
- name
- version
- api_version
- core_version
- enabled
- status
- permissions (json)
- entry (json)
- integrity (json)
- signature (text)
- installed_at
- updated_at
- last_error
- error_count

`plugin_settings`
- plugin_name
- key
- value
- updated_at

## Optional (v1.1+)

`form_submissions`
- id
- form_type (contact|newsletter)
- payload (jsonb)
- created_at

---

## Indeksy (minimum)

- pages.slug
- pages.status
- content_entries.slug
- content_entries.status
- media.created_at
- menu_items.menu_id
- theme_profiles.theme_name
- theme_routes.profile_id
- sessions.user_id
- audit_logs.created_at
- preview_tokens.token_hash
- preview_tokens.target_type
- preview_tokens.target_id
