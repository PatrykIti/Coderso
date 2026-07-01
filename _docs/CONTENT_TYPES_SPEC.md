# Content Types Spec (v1)

Cel: wspierac kolekcje danych poza Pages (np. blog, case studies).

## Model

- Content Type (definicja schematu).
- Content Entry (rekord danych).
- Revisions dla entries.
- Content types sa tworzone i edytowane w panelu admina.
- Schema jest zapisywana w DB (JSONB) bez migracji tabel.
- Content Type ma realny status `draft` / `published`; nowe typy startuja jako
  `draft`, a migracja TASK-202 zachowuje istniejace rekordy jako `published`.
- `name` i `slug` sa unikalne w kontrakcie serwisu. Nazwy w stylu
  `Screen <uuid>` sa odrzucane, aby generatorzy nie tworzyli nieczytelnych
  typow.
- Usuniecie content type przechodzi przez guard serwisowy i jest blokowane,
  gdy typ ma entries, custom screens, taxonomie albo listings. Wpisy
  `site.contentRoutes` dla usuwanego sluga sa czyszczone automatycznie, bo
  panel Site Settings tworzy je jako route placeholders dla content types.

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

Business/Media:
- Pricing
- Jobs/Careers
- Press/Media

## Content Type fields

Fields sa definiowane jako JSON schema.
Typy dostepne w UI v1:
- text, richtext, number, boolean
- select (single lub multi-select)
- media (image/file w jednym typie)
- relation (do innego typu)

Pozostale typy (date/datetime, seo) planowane v1.1+ lub przez pluginy.

### Schema meta (v1)

UI zapisuje dodatkowe meta‑pola w definicji schematu, aby po zapisie/odczycie
nie tracic typu pola:

- `xFieldType` — typ pola z UI (np. `relation`, `media`, `select`).
- `xFieldConfig` — konfiguracja zależna od typu, np.:
  - `relation.target` (slug typu docelowego),
  - `relation.multiple` (multi‑relation → `type: "array"`),
  - `media.accept` (MIME whitelist),
  - `media.maxItems` (limit dla multi‑media),
  - `select.options` (lista `{ label, value }`) i `select.multiple`,
  - `number.format/min/max/step` mapowane na JSON Schema
    `type: "integer" | "number"`, `minimum`, `maximum`, `multipleOf`,
  - `layout.tab/section/width/display` (uklad pola w edytorze wpisu),
  - przyszłe: reguły mediów, richtext, walidatory.
- `xRelationTarget` jest wspierane dla kompatybilności wstecznej.

Te pola sa ignorowane przez walidator danych wpisu.

## Admin UI rules (v1)

- `name` pola musi byc unikalny i w kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- Nowe pola generuja `name` z etykiety dopoki uzytkownik recznie nie edytuje
  klucza.
- Etykiety odczytane ze starych schematow sa humanizowane, gdy byly identyczne
  z technicznym kluczem (`featuredImage` -> `Featured Image`).
- Required field musi miec `defaultValue` (UI blokuje brak defaultu).
- Relation field wymaga `target` (slug typu docelowego).
- Relation field może byc single lub multi (multi zapisuje tablice entry IDs).
- Select field zapisuje stabilne wartosci i czytelne etykiety; multi-select
  zapisuje tablice wartosci.
- Number field moze wymusic integer/decimal, min, max i step.
- UI generuje formularz entry dynamicznie z pola `schema`.
- Layout pola (tab/sekcja/szerokosc) jest zapisywany w `xFieldConfig.layout`.
- Draft/publish/preview + autosave draft w edytorze wpisu.
- Content Type Editor pokazuje status badge, zapisuje draft/published, pozwala
  duplikowac schemat bez entries i wymaga potwierdzenia przed usunieciem typu
  albo pola.

## Taxonomie (Categories/Tags)

- Kategorie i tagi sa konfigurowane per Content Type (toggla `Enable Categories`, `Enable Tags`).
- Kategorie to single‑select (jedna na wpis), tagi to multi‑select.
- Termy (category/tag) sa edytowane z poziomu edytora wpisu.
- Tagi sa zapisywane rowniez w `content_entries.tags` dla wyszukiwania.

## Praktyczne wzorce

Gotowe schematy i powiazania znajdziesz w `CONTENT_MODELING_COOKBOOK.md`.

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

Pricing:

```json
{
  "name": "Pricing",
  "slug": "pricing",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "price", "type": "text" },
    { "name": "period", "type": "text" },
    { "name": "features", "type": "richtext" },
    { "name": "ctaLabel", "type": "text" },
    { "name": "ctaUrl", "type": "text" }
  ]
}
```

Jobs/Careers:

```json
{
  "name": "Job",
  "slug": "jobs",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "location", "type": "text" },
    { "name": "type", "type": "select", "options": ["full-time","part-time","contract","internship"] },
    { "name": "description", "type": "richtext" },
    { "name": "applyUrl", "type": "text" },
    { "name": "publishedAt", "type": "date" }
  ]
}
```

Press/Media:

```json
{
  "name": "Press Item",
  "slug": "press",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "source", "type": "text" },
    { "name": "link", "type": "text" },
    { "name": "publishedAt", "type": "date" },
    { "name": "summary", "type": "text" }
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
- Page builder moze osadzac listy entries jako blok. Od TASK-457 blok
  `collection` jest wstawialny w Page Editorze v2: autor wybiera content type
  (combobox), opcjonalnie zapisane listing query (przefiltrowane do wybranego
  typu; zmiana typu czysci referencje query), limit i listing template. Od
  TASK-459-03 limit ma JEDEN spojny zakres 1..24 (`contentListLimitMax` —
  schema edytora, suwaki i runtime czytaja te sama granice; zapisane
  dokumenty z wartosciami 25..50 normalizuja sie przy odczycie do 24, czyli
  dokladnie tego, co i tak renderowaly). Blok ma tez paginacje dla
  odwiedzajacych: `paginationMode` (`none` domyslnie — istniejace strony
  renderuja sie bez zmian, `paged` — numerowany pager z licznikiem wynikow i
  Previous/Next na tokenach `lq.<queryId>.__page` lub `cl.<blockId>.page`,
  `load-more` — pojedynczy odnosnik) oraz nullable `pageSize` (puste =
  podaza za `limit`). Zwiazany listing template styluje liste (kolumny 1..6,
  gap, wariant karty) i dostarcza tresc pustego stanu. Publiczny runtime
  rozwiazuje wpisy przez scoped read-only binding
  (`statusScope: "published"`); szczegoly kontraktu autorskiego w
  `_docs/PAGE_MODEL.md`.
- Od TASK-459-02 dostepny jest tez blok `filters` (Page Editor v2): widoczny
  dla odwiedzajacych panel facetow powiazany z TYM SAMYM zapisanym listing
  query co sasiedni blok `collection`. Kontrakt filtrowania odwiedzajacego
  jest w pelni generyczny i oparty o pola schematu (zaden facet nie jest
  branzowy): facety `checkbox`/`radio`/`taxonomy`/`range`/`date-range`
  wskazuja sciezke pola (`data.*` lub dozwolone pola systemowe) z operatorem,
  facet `sort` definiuje opcje sortowania `pole:kierunek`, a opcjonalny wiersz
  wyszukiwania mapuje sie na token `__q`. Formularz to zwykly GET — parametry
  `lq.<queryId>.<pole>.<operator>` / `__sort` / `__q` filtruja, sortuja i
  przeszukuja liste rowniez bez JavaScriptu, bo serwer waliduje kazdy token
  przez allowlist zapisanego query (nieznane tokeny sa odrzucane, statusy
  tylko `published`). Z JavaScriptem wspolny skrypt runtime listingu podmienia
  wyniki przez fetch-swap i `history.pushState` (URL pozostaje udostepnialny).
  Blok renderuje takze licznik wynikow (`total` egzekucji query; pelne
  wartosci korpusowe dostarcza TASK-459-04). Szczegoly kontraktu autorskiego
  w `_docs/PAGE_MODEL.md`.
- Automatyczne strony list (content route z `listPath`) od TASK-459-03
  konsumuja `searchParams`: `?page=N` stronicuje opublikowane wpisy w paczkach
  po 24 (`contentListLimitMax`; strona 1 ma kanoniczny URL bez parametru,
  strony spoza zakresu sa przycinane do zakresu zamiast 404), a
  `?sort=<ContentListSort>` (np. `title-asc`, `published-desc`) sortuje przez
  ten sam walidowany enum co blok `collection` (nieznane wartosci wracaja do
  domyslnego porzadku). Domyslny template listy i template motywu
  `content-list` renderuja wspolny numerowany pager (`ContentListPager`) z
  licznikiem wynikow oraz jawny pusty stan.
- Polityka wiszacych linkow (zamrozona w TASK-459-01, wdrozona w
  TASK-459-03): gdy typ wpisu NIE ma wlaczonego content route, resolver list
  nie buduje juz linkow z fallbackowego wzorca `/<typeSlug>/:slug` (matcher
  nigdy go nie dopasuje — kazdy taki link to gwarantowane 404). Zamiast tego
  linki kart sa TLUMIONE: karty renderuja sie bez `<a>`, z nota „links
  unavailable until a detail route is configured", a dane rozwiazane niosa
  `cardLinkMode: "missing-route"`. Wlaczenie route w Site Settings przywraca
  linki przy kolejnym renderze. Linki dostarczane przez listing template
  (akcje, pola `href`) pozostaja nietkniete.

Resolution order:
1. Theme template
2. Plugin view (jesli dostepny)
3. Core default

Nazewnictwo template’ów (type: `content`):
- `content-<typeSlug>-list.tsx`
- `content-<typeSlug>-detail.tsx`
- `content-list.tsx`
- `content-detail.tsx`
- `content.tsx` (fallback)

## Admin Workspace Defaults

Custom Screens workspace builder V2 can derive default `List View` and
`Editor View` behavior from a selected content type schema:

- default list columns use approved system fields plus selected schema fields
  such as `name`, `summary`, and `projectStatus`;
- default filters use schema-backed status/select-like fields when available;
- create/edit drafts initialize writable `Editor View` fields from schema
  defaults and safe type fallbacks; screens without writable bindings stay
  read-only and must not fall back to editing the whole content type schema;
- persisted Custom Screen definitions validate field references against the
  selected content type schema when that context is available.

The content type schema remains the source of truth. Custom Screens do not store
their own `contentTypeId` inside `definition`; they reference the record-level
`custom_screens.content_type_id`.

## Custom Screen entry-view builder — data-oriented block kinds (TASK-498)

The Custom Screen **entry-view builder** is a data-oriented, graphical-schema editor.
Blocks are stored inside the V4 definition's `editorView.document` (`ScreenDocumentV1`,
`schemaVersion: 1`); this is **unchanged** by TASK-498 — no `ScreenDocumentV1`
schema-version bump, no definition version bump (stays `4`), and no DB migration. Bound
blocks reference schema/system fields through `ScreenFieldBinding` (allow-list +
`blockId ∈ document`), resolved by `resolveBlockBinding` / `readBindingPathValue`. In
**builder** mode a bound block renders a muted mono `{{ Field }}` token; in **entry** /
**preview** mode it resolves the real value.

### Per-kind `data` schema (schema-first, reject-unknown)

`normalizeScreenBlockData(type, data)` enforces a per-kind, **reject-unknown** allow-list
for the data-oriented kinds. Unknown keys within a new kind's `data` throw
`custom_screen_definition_invalid`; **legacy** kinds (`field`, `record-header`,
`field-group`, `columns`, `rich-text`, `legacy-widget`) keep their permissive
normalization, so stored V4 screens read back byte-stable. `"label"` is allow-listed for
every new kind (the base factory always seeds `data.label`). Enums are coerced to their
allow-list; out-of-range/invalid values fall back to the listed default.

| Kind | `data` keys (allow-list) | Enums / bound propPath |
|------|--------------------------|------------------------|
| `heading` | `label`, `text`, `level`, `align`, `field` | `level ∈ 1\|2\|3` (def 2); `align ∈ left\|center\|right`; bound → propPath `text` |
| `text` | `content`, `tone`, `label` | `tone ∈ default\|muted` |
| `stat` | `label`, `format`, `trend`, `deltaField`, `field` | `format ∈ number\|percent\|money`; `trend ∈ auto\|up\|down\|flat`; bound → propPath `value`, `mode:"read"` |
| `divider` | `variant`, `label` | `variant ∈ line\|space\|label` |
| `image` | `label`, `fit`, `ratio`, `field` | `fit ∈ cover\|contain`; bound → propPath `src`, `mode:"read"` |
| `related-list` | `label`, `target`, `displayField`, `variant`, `limit`, `field` | `variant ∈ checklist\|activity\|cards`; `limit` clamped `1..50`; bound → propPath **`items`**, `mode:"read"` |
| `tabs` | `label`, `tabs` | `tabs = [{ id, label }]` with ids matching `slots` keys |
| `button` | `label`, `action`, `variant`, `href`, `field` | `action ∈ link\|publish\|custom`; `variant ∈ primary\|secondary\|ghost`; bound → propPath `href` |

`field` and `record-header` remain the writable kinds (bind `mode:"readwrite"` — inline
write-back stays on `title`/`slug`/schema fields only); every other bound kind binds
`mode:"read"` (display-only). The pre-TASK-498 `actions` placeholder is promoted to
`button`; a stored `actions` block is remapped to a usable `button` on the **read path only**
(`normalizeScreenDocumentV1ForRead`, data intersected with the button allow-list) — the write
path is untouched (no visual-repair on save).

### Related-list relation-resolution contract

The `related-list` block resolves a relation field's stored target-entry IDs into real
related entries. Resolution is **read-only** and **host-precomputed**, so the renderer stays
a pure function:

- `resolveRelatedEntries({ ids, target, displayField, limit, readEntries })` coerces the
  relation value (`ID[]` for a multiple relation, a bare `ID` string for a single relation,
  or null/empty) to an id list, fetches the whole target-type list via the injected
  `readEntries`, then **filters to the requested ids** and returns them in the relation's
  **stored id order** (unknown ids skipped, clamped by `limit`). It returns
  `RelatedEntrySummary[]` = `{ id, title, status?, displayValue?, updatedAt? }` where
  `displayValue` resolves `displayField` against `row.data` (schema field) with a top-level
  fallback, and `updatedAt` is surfaced from `row.updatedAt` (the activity variant's time source).
- Admin hosts inject `readEntries = (t) => listEntriesCached(t)` — the **existing** admin
  entries-read (the same read `FieldRenderer` uses for relation pickers), under the existing
  session auth + RBAC. **No new endpoint, write path, permission, or RBAC change.**
- The renderer receives a precomputed `relatedEntries?: Record<blockId, RelatedEntrySummary[]>`
  prop; builder mode renders skeleton rows, entry/preview render the resolved rows
  (checklist / activity / cards variants), and an unresolved/undefined map renders the
  skeleton. The resolver `target` is derived authoritatively from the bound relation field's
  `relation.target` (stored `data.target` is only a fallback). Host precompute effects MUST
  feed a stable/memoized value source and diff-guard `setState`
  (`relatedEntriesMapEqual`) to avoid a resolve→setState loop.
- The **published entries list** (`CustomScreenEntriesTable`, a native column table) is out of
  scope — related-list renders only in the entry + preview surfaces.

## API

Admin API w `CMS_API.md`:
- `/content-types`
- `/content/:type/entries`

## Plugins

Plugin moze rejestrowac nowe content types (v1.1).
Plugin moze dodac wlasne field types (v1.1).
Plugin moze dodac automatyzacje (workflow hooks) powiazane z content types (v1.1).
