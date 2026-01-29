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

## Theme profiles (v1)

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

Conflict rules:
- Theme template zawsze wygrywa (explicit override).
- Plugin view uzywane, gdy theme nie dostarcza template.
- Core default jest fallbackiem.

## Admin UI

- Lista themes (installed).
- Lista profili + aktywacja profilu.
- Edycja tokenow i route mapping.

## API (admin)

- `GET /themes`
- `GET /theme-profiles`
- `GET /theme-profiles/:id`
- `POST /theme-profiles`
- `PATCH /theme-profiles/:id`
- `POST /theme-profiles/:id/activate`
- `PUT /theme-profiles/:id/routes`
