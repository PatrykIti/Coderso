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

Universal:
- News / Blog
- Announcements
- Events
- Documents
- FAQ
- Gallery
- Locations
- Schedules

Business/Services:
- Services
- Case Study
- Team Member
- Testimonials

Community/Church:
- Sermons
- Mass Schedule
- Donations
- Staff

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

## Example schemas (v1)

### Universal

News:

```json
{
  "name": "News",
  "slug": "news",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "summary", "type": "text" },
    { "name": "body", "type": "richtext" },
    { "name": "cover", "type": "image" },
    { "name": "publishedAt", "type": "datetime" }
  ]
}
```

Announcements:

```json
{
  "name": "Announcement",
  "slug": "announcements",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "body", "type": "richtext" },
    { "name": "publishedAt", "type": "datetime" },
    { "name": "priority", "type": "select", "options": ["low","normal","high"] }
  ]
}
```

Events:

```json
{
  "name": "Event",
  "slug": "events",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "startAt", "type": "datetime", "required": true },
    { "name": "endAt", "type": "datetime" },
    { "name": "location", "type": "text" },
    { "name": "description", "type": "richtext" },
    { "name": "cover", "type": "image" }
  ]
}
```

Documents:

```json
{
  "name": "Document",
  "slug": "documents",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "file", "type": "file", "required": true },
    { "name": "category", "type": "select", "options": ["forms", "reports", "policies", "other"] },
    { "name": "publishedAt", "type": "date" },
    { "name": "summary", "type": "text" }
  ]
}
```

FAQ:

```json
{
  "name": "FAQ",
  "slug": "faq",
  "fields": [
    { "name": "question", "type": "text", "required": true },
    { "name": "answer", "type": "richtext", "required": true },
    { "name": "order", "type": "number" }
  ]
}
```

Gallery items:

```json
{
  "name": "Gallery Item",
  "slug": "gallery",
  "fields": [
    { "name": "title", "type": "text" },
    { "name": "image", "type": "image", "required": true },
    { "name": "category", "type": "text" },
    { "name": "order", "type": "number" }
  ]
}
```

Locations:

```json
{
  "name": "Location",
  "slug": "locations",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "address", "type": "text" },
    { "name": "city", "type": "text" },
    { "name": "mapUrl", "type": "text" },
    { "name": "phone", "type": "text" }
  ]
}
```

Schedules:

```json
{
  "name": "Schedule",
  "slug": "schedules",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "day", "type": "select", "options": ["mon","tue","wed","thu","fri","sat","sun"] },
    { "name": "startAt", "type": "time" },
    { "name": "endAt", "type": "time" },
    { "name": "location", "type": "text" },
    { "name": "note", "type": "text" }
  ]
}
```

### Business/Services

Services:

```json
{
  "name": "Service",
  "slug": "services",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "summary", "type": "text" },
    { "name": "body", "type": "richtext" },
    { "name": "icon", "type": "image" },
    { "name": "features", "type": "richtext" },
    { "name": "order", "type": "number" }
  ]
}
```

Case studies:

```json
{
  "name": "Case Study",
  "slug": "case-studies",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "client", "type": "text" },
    { "name": "industry", "type": "text" },
    { "name": "challenge", "type": "richtext" },
    { "name": "solution", "type": "richtext" },
    { "name": "results", "type": "richtext" },
    { "name": "cover", "type": "image" }
  ]
}
```

Team members:

```json
{
  "name": "Team Member",
  "slug": "team",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "title", "type": "text" },
    { "name": "bio", "type": "richtext" },
    { "name": "photo", "type": "image" },
    { "name": "email", "type": "text" }
  ]
}
```

Testimonials:

```json
{
  "name": "Testimonial",
  "slug": "testimonials",
  "fields": [
    { "name": "author", "type": "text", "required": true },
    { "name": "role", "type": "text" },
    { "name": "quote", "type": "richtext", "required": true },
    { "name": "avatar", "type": "image" }
  ]
}
```

### Community/Church

Sermons:

```json
{
  "name": "Sermon",
  "slug": "sermons",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "speaker", "type": "text" },
    { "name": "date", "type": "date" },
    { "name": "audio", "type": "file" },
    { "name": "notes", "type": "richtext" }
  ]
}
```

Mass schedule:

```json
{
  "name": "Mass Schedule",
  "slug": "mass-schedule",
  "fields": [
    { "name": "day", "type": "select", "options": ["mon","tue","wed","thu","fri","sat","sun"] },
    { "name": "time", "type": "text" },
    { "name": "location", "type": "text" },
    { "name": "note", "type": "text" }
  ]
}
```

Donations:

```json
{
  "name": "Donation",
  "slug": "donations",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "goal", "type": "number" },
    { "name": "collected", "type": "number" },
    { "name": "description", "type": "richtext" },
    { "name": "ctaLabel", "type": "text" },
    { "name": "ctaUrl", "type": "text" }
  ]
}
```

Staff:

```json
{
  "name": "Staff",
  "slug": "staff",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "role", "type": "text" },
    { "name": "photo", "type": "image" },
    { "name": "email", "type": "text" },
    { "name": "phone", "type": "text" }
  ]
}
```

## Entry status

- draft
- published

## Rendering (v1)

- Core dostarcza bazowe widoki listy i szczegolu.
- Theme moze nadpisac wyglad per content type.
- Plugin moze dostarczyc wlasny view (opcjonalnie).
- Page builder moze osadzac listy entries jako blok.

Resolution order:
1. Theme template
2. Plugin view (jesli dostepny)
3. Core default

## API

Admin API w `CMS_API.md`:
- `/content-types`
- `/content/:type/entries`

## Plugins

Plugin moze rejestrowac nowe content types (v1.1).
Plugin moze dodac wlasne field types (v1.1).
Plugin moze dodac automatyzacje (workflow hooks) powiazane z content types (v1.1).
