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

## Media

`media`
- id (uuid, pk)
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

## Settings

`settings`
- key (pk)
- value (jsonb)
- updated_at

## Plugins

`plugins`
- id
- name
- version
- api_version
- enabled
- status
- permissions (json)
- entry (json)
- integrity (json)
- signature (text)
- installed_at
- updated_at
- last_error

`plugin_settings`
- plugin_name
- key
- value

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
- media.created_at
- menu_items.menu_id
- sessions.user_id
