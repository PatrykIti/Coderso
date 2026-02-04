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
- location (primary|footer)
- created_at

`menu_items`
- id (uuid, pk)
- menu_id (fk menus)
- label
- href
- page_id (fk pages, nullable)
- order_index
- parent_id (fk menu_items, nullable)

Zasady:
- `menus.location` unikalny, gdy ustawiony (np. primary, footer).
- `menu_items` musi miec dokladnie jedno z `href` lub `page_id`.
- `parent_id` referencjonuje element w tym samym menu.

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
