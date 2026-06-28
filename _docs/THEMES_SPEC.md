# Themes Spec (v1)

Cel: elastyczne themy, profile i szybkie przelaczanie wygladu strony.

## Definicje

- Theme: paczka wygladu (templates, styles, token defaults).
- Theme profile: konfiguracja theme (tokeny, ustawienia, route mapping).

## Struktura theme (core)

`/themes/<name>/`
- `theme.json` (meta, token defaults, supported features)
- `templates/` (page, content type, error)
- `styles/` (base css)

Przykladowy `theme.json`:
```json
{
  "name": "default",
  "version": "1.0.0",
  "templates": ["page", "content", "error"],
  "tokens": {
    "colors": { "primary": "#111111" },
    "neutrals": { "bg": "#ffffff" }
  },
  "description": "Core default theme"
}
```

## Theme profiles (v1) – Site themes

Profil zawiera:
- `name` (np. "testowy front 1")
- `theme` (nazwa theme)
- `tokens` (override CSS variables)
- `settings` (global UI, np. header/footer)
- `routes` (mapowanie path -> page_id)

Zasada:
- aktywny jest jeden profil naraz.
- zmiana profilu przelacza wyglad calosc strony.

## Token pipeline

- Theme dostarcza domyslne tokeny z `theme.json`.
- Globalne override z `settings.design.tokens`.
- Profil theme moze nadpisac tokeny na poziomie profilu.

Kolejnosc merge:
1. Theme defaults (`theme.json`)
2. Global overrides (`design.tokens`)
3. Profile overrides (`theme_profiles.tokens`)

## Page routing per profile

- `/` moze wskazywac na inna strone w kazdym profilu.
- To pozwala tworzyc "front 1" i "front 2" bez nadpisywania contentu.
- Profile nie kopiuja danych stron - wskazuja na istniejace pages.

Przyklad:
- Profil A: `/` -> page_id=homeA, `/kontakt` -> page_id=contactA
- Profil B: `/` -> page_id=homeB, `/kontakt` -> page_id=contactB

Domyslne route mapping:
- `/` (home)
- `/blog` (content type index)
- `/blog/:slug` (content entry)

## Template resolution order

1. Theme template
2. Plugin view (jesli dostepny)
3. Core default

### Page template file naming

Page templates use `type = "page"` and follow these conventions:

- Default page template: `themes/<theme>/templates/page.tsx`
- Keyed page template: `themes/<theme>/templates/page-<key>.tsx`

`<key>` comes from `page.data.settings.template` (see `_docs/PAGE_MODEL.md`) and is normalized to a safe string (default: `landing`).

Conflict rules:
- Theme template zawsze wygrywa (explicit override).
- Plugin view uzywane, gdy theme nie dostarcza template.
- Core default jest fallbackiem.

## Admin UI

To dotyczy **Site Themes** (front):

- Lista themes (installed).
- Lista profili + aktywacja profilu.
- Edycja tokenow i route mapping.

## Admin UI Theme (v1)

Admin panel ma **osobny** system themingu, niezalezny od frontu.

### Model

- **Admin Theme Template** = zestaw granularnych tokenow UI (kolory tła, bordery, hover, inputy itd.).
- **Admin Theme Profile** = nazwa + opis + wskazanie template + status aktywny.
- Profile **nie** ma override tokenow (v1).

### Storage

DB tables:
- `admin_theme_templates` (name, description, tokens)
- `admin_theme_profiles` (name, description, template_id, is_active)

`admin_theme_templates.tokens` is a **`jsonb`** column; the token SHAPE is
enforced in the application layer (`assertAdminThemeTokens`), not by DB columns —
so the TASK-479-05 token additions (`primarySoft`, `state.info`/`*Foreground`/
`*Soft`, `sidebar.muted`/`accent`/`accentForeground`/`border`, `effects` shadows)
need **no schema migration**.

### Default seed (TASK-479-05-L04)

`core/db/seed.ts` seeds an idempotent **"Soft Violet"** admin theme template (the
violet/soft "Soft & Friendly" default) so the look is discoverable and editable
from **Visual → Admin UI Theme** on a fresh install. The seed:
- inserts the template only when missing (upsert by unique `name`) and never
  overwrites an operator-edited template of the same name;
- activates a `"Default"` profile **only** when no active profile exists, so an
  operator's chosen active profile is never deactivated.

The seeded token VALUES are the single source of truth
`DEFAULT_ADMIN_THEME_TOKENS`; when no profile is active the resolver falls back
to the same constant, so the DB row and the code default agree. Dark mode is a
shared code-side constant `DEFAULT_ADMIN_THEME_TOKENS_DARK` (no DB row,
per-template dark is a deferred follow-up). The front `themes/admin-default/
theme.json` (a separate site/front `DesignTokens` template) is independently
re-paletted to the same violet/warm palette for brand consistency.

### UI

Sekcja: **Visual → Admin UI Theme**
- Templates: lista + create/edit (pickery, bez JSON na żywo).
- Profiles: lista + create/edit + activate.
- JSON tylko dla eksport/import.

### API (admin)

```
GET    /admin/api/admin-theme-templates
POST   /admin/api/admin-theme-templates
PATCH  /admin/api/admin-theme-templates/:id
DELETE /admin/api/admin-theme-templates/:id

GET    /admin/api/admin-theme-profiles
POST   /admin/api/admin-theme-profiles
PATCH  /admin/api/admin-theme-profiles/:id
POST   /admin/api/admin-theme-profiles/:id/activate
```

## API (admin)

- `GET /themes`
- `GET /theme-profiles`
- `GET /theme-profiles/:id`
- `POST /theme-profiles`
- `PATCH /theme-profiles/:id`
- `POST /theme-profiles/:id/activate`
- `PUT /theme-profiles/:id/routes`
