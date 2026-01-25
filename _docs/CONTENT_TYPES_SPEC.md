# Content Types Spec (v1)

Cel: wspierac kolekcje danych poza Pages (np. blog, case studies).

## Model

- Content Type (definicja schematu).
- Content Entry (rekord danych).
- Revisions dla entries.
- Content types sa tworzone i edytowane w panelu admina.
- Schema jest zapisywana w DB (JSONB) bez migracji tabel.

## Default content types (core)

Przykladowy zestaw dla stron firmowych, blogowych i parafii:
- Blog post / News
- Events
- Services
- Case study
- Team member
- Testimonials
- FAQ
- Gallery
- Locations
- Sermons (parafia)
- Mass schedule (parafia)

## Content Type fields

Fields sa definiowane jako JSON schema.
Przyklady typow:
- text, richtext, number, boolean
- select, multiselect
- image, file
- relation (do innego typu)
 - date, datetime
 - seo (title, description)

## Example schema (summary)

```json
{
  "name": "Blog Post",
  "slug": "blog",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "body", "type": "richtext" },
    { "name": "cover", "type": "image" },
    { "name": "tags", "type": "multiselect", "options": ["a","b"] }
  ]
}
```

## Entry status

- draft
- published

## Rendering (v1)

- Core dostarcza bazowe widoki listy i szczegolu.
- Theme moze nadpisac wyglad per content type.
- Page builder moze osadzac listy entries jako blok.

## API

Admin API w `CMS_API.md`:
- `/content-types`
- `/content/:type/entries`

## Plugins

Plugin moze rejestrowac nowe content types (v1.1).
Plugin moze dodac wlasne field types (v1.1).
