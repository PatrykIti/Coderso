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
- date (TASK-513-02) — input `type="date"`, ISO string
- slug (TASK-513-02) — slugified text input, opcjonalny `source` (derive-from) + `editable`

`date`/`slug` mapuja sie na JSON-Schema `type:"string"` z `xFieldType:"date"|"slug"` i **bez
`format`** (ajv `strict:true` rzuca na nieznanym `format` → typ nie do zapisania). Kolejne typy
(datetime, seo) planowane v1.1+ lub przez pluginy.

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
  - `date.includeTime` (present-only) — TASK-513-02,
  - `slug.source` (pole źródłowe) i `slug.editable` (present-only) — TASK-513-02,
  - `unique` (deklaratywna flaga unikalności, present-only) — TASK-513-02, NIE egzekwowana per-entry,
  - `order` — całkowita, per-property kolejność pola (0-based). Zapisywana dla KAŻDEGO pola
    (nie present-only), bo jsonb kanonizuje klucze obiektu; `fieldsFromSchema` re-sortuje po niej,
    dzieki czemu kolejnosc pól przetrwa Save→reload. Schematy legacy bez `order` zachowuja
    kolejnosc `Object.entries` (brak regresji odczytu) — TASK-513-02.
  - przyszłe: reguły mediów, richtext, walidatory.
- `xRelationTarget` jest wspierane dla kompatybilności wstecznej.

Te pola sa ignorowane przez walidator danych wpisu.

## Content-type config (TASK-513-01)

`content_types.config` (jsonb, DEFAULT `'{}'`, migracja `0068`) to konfiguracja na poziomie
typu, normalizowana serwerowo (`core/services/content/contentTypeConfig.ts`, present-only +
reject-unknown), rides na istniejacych envelope'ach `POST /content-types` +
`PATCH /content-types/:id` (`content:write`, brak nowego endpointu/RBAC):

- `singularName` / `pluralName` (string, trim ≤120) — nazwy w karcie "Type settings",
- `draftsEnabled` (bool, default `true`; zapisywane tylko gdy `false`),
- `versioning` (bool, default `false`; zapisywane tylko gdy `true`) — deklaratywne,
- `permissions` (`{ [roleKey]: { read?, create?, update?, delete?, publish? } }`) — macierz
  rola×capability, trzymane tylko `true`, puste role odrzucone. **Deklaratywne** — nie bramkuje
  samo w sobie autoryzacji `contentEntryRoutes` (egzekwowanie = follow-up).

Nieznany klucz top-level lub capability → `content_type_config_invalid` (HTTP 400); złe skalary
fail-soft (pomijane). Typ bez własnej konfiguracji serializuje `{}` (wiersze legacy czytane
byte-identycznie). Slug kolumny = **API ID** w edytorze (mono input).

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
| `image` | `label`, `fit`, `ratio`, `field`, `src` | `fit ∈ cover\|contain`; bound → propPath `src`, `mode:"read"`; static `src` OPTIONAL + scheme-validated (TASK-500-04, see below) |
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

## Custom Screen entry-view builder — sections, insertion targeting & static image src (TASK-500)

TASK-500 makes the screen builder's **behaviour** author-directed on top of TASK-498's
look parity. All ops live in `core/services/customScreens/screenDocumentOps.ts`
(Bun-free, pure) and mutate the in-memory `editorView.document` client-side; persistence
stays the EXISTING custom-screen definition PATCH under existing RBAC. **No new public
endpoint, no RBAC change, no DB migration, no `ScreenDocumentV1.schemaVersion` bump
(stays `1`), definition stays v4.** Editor-path ops FAIL-SOFT (unknown ids no-op or fall
back — they never throw); the strict reject-unknown normalizers on SAVE remain the hard
gate.

### Section CRUD ops (TASK-500-01)

Sections are first-class, top-level only (sections cannot nest):

- `addScreenSection(document, { label?, atIndex? }) → { document, sectionId }` — creates
  a real, empty, named top-level section via `createScreenSection` (stable
  `createId("section")` id, seeds `data.title` from the label); `atIndex` clamps to
  `[0, sections.length]`, default appends.
- `renameScreenSection(document, sectionId, label) → document` — sets **both** `label`
  and `data.title` (the renderer prefers `data.title`); blank label falls back to
  `"Section"`; unknown id no-ops.
- `moveScreenSection(document, sectionId, "up" | "down") → document` — reorders one
  step; a move past a boundary is a NO-OP; unknown id no-ops.
- `removeScreenSection(document, sectionId) → { document, removed }` — returns the
  removed `ScreenSectionV1` so the host can prune its block bindings
  (`removeScreenBindingsForBlockTree` per removed block). **LAST-SECTION RULE:** with
  only one section left this NO-OPS (`removed: null`) — the document never reaches zero
  sections, so the canvas always has an insertion target.
- `appendScreenBlockToSection(document, sectionId | null, block) → document` — 500-01's
  minimal targeting foundation (append to the NAMED section, fail-soft to the first);
  superseded by `addScreenBlockAt` for interactive insertion.

### Insertion-target contract (TASK-500-02)

One deterministic target union replaces "always append to `sections[0]`":

```ts
export type ScreenInsertTarget =
  | { kind: "section-end"; sectionId: string }                              // selected section
  | { kind: "section-index"; sectionId: string; index: number }             // before/after a top-level block
  | { kind: "slot-end"; sectionId: string; parentId: string; slotId: string }        // into a nested slot
  | { kind: "slot-index"; sectionId: string; parentId: string; slotId: string; index: number };
```

- `addScreenBlockAt(document, block, target) → document` — resolves the sibling list the
  target names (section top-level or a nested container slot at arbitrary depth —
  `field-group.content` / `columns.left|right` / `tabs.tab-N`), clamps the index to
  `[0, len]`, splices the block in. Unresolvable `sectionId`/`parentId`/`slotId` ⇒
  FAIL-SOFT fallback to `section-end` of the first section (never throws).
- `moveScreenBlockTo(document, blockId, target) → document` — removal-first cross-section
  / cross-slot MOVE that re-inserts the SAME node (**move-not-clone**: the block id is
  preserved, so bindings keyed by `blockId` stay valid with no rewrite). **CYCLE GUARD:**
  a slot target inside the moved block's own subtree returns the ORIGINAL document
  (referential no-op). Same-sibling-list downward moves decrement the PRE-removal index
  inside the op — callers must NOT pre-subtract.
- `findScreenBlockLocation(document, blockId) → { sectionId, parentId, slotId, index } | null`
  — deterministic pre-order walk (section blocks, then each block's slots in key order,
  then `children[]`); powers before/after affordances and the cycle guard.
- Legacy `addScreenBlock` / `moveScreenBlock` remain exported as NON-DESTRUCTIVE shims
  (the Bun-lane assistant `actionExecutorService.ts` still imports them). The no-target
  `addScreenBlock` delegates to `addScreenBlockAt` (first-section end); the
  `{ parentId, slotId }` branch keeps legacy semantics verbatim (the assistant detects
  "target not found" via deep-equality on the returned document, so it must NOT adopt
  the fail-soft fallback).

Creation surface: ONE canonical kind vocabulary = the 9 `ScreenBlockLibrary` chips
(Heading/Text/Field/Stat/Divider/Image/Related list/Tabs/Button) PLUS the
container/composite kinds (`field-group`, `columns`, `record-header`, `rich-text`). The
command palette mirrors that full set + "Add section" (which CREATES a section); only
the redundant per-field FIELDS group was removed (a field = the Field chip + inspector
bind).

### Image static `src` (TASK-500-04)

The image kind's `data` allow-list gains an OPTIONAL `src`
(`["label","fit","ratio","field","src"]`), making image consistent with the other
static kinds. `normalizeScreenImageSrc` accepts only relative paths (`/…`) and
`http://`/`https://` URLs; everything else (`javascript:`, `data:`, `blob:`, `file:`,
bare tokens, non-strings) normalizes to `""` (dropped, never throws) — reject-unknown on
other keys stays intact, and a stored V4 image WITHOUT `src` round-trips byte-stable.
Renderer resolution order on entry/preview (override-first precedence preserved):
per-entry media/presentation override → bound `field` src → static `data.src` → labeled
placeholder. The rejected alternative — marking image "requires a bound field"
(builder-only affordance, no schema change) — was declined because it would keep image
the single kind unable to carry authored static content.

## Custom Screen entry-view builder — block style channel, clearable labels & entry presentation (TASK-503)

TASK-503 polishes the screen builder on top of TASK-498/500 **without** a schema
version bump: `ScreenDocumentV1` stays `schemaVersion: 1`, the custom-screen
definition stays `v4`, and a stored V4 screen round-trips **byte-stable**. All five
changes below are additive or entry-mode-only; builder/preview renderer output is
byte-identical to pre-503.

### Block style channel — `ScreenBlockStyleV1` (TASK-503-01)

`ScreenBlockV1` gains an OPTIONAL, validated `style` member (block-level layout).
The block-level allow-list (`normalizeScreenBlock`) gains exactly `"style"`; every
other block key is unchanged; `variant` **stays accepted** on read/write (only its
dead inspector "Background" control was removed — decision 1).

```ts
export const screenBlockWidths = ["auto", "full", "half", "third", "two-thirds"] as const;
export const screenBlockAligns = ["start", "center", "end", "stretch"] as const;
export const SCREEN_BLOCK_MIN_HEIGHT_CLAMP = { min: 0, max: 640 } as const;
// box sides = top/right/bottom/left, each clamped to PAGE_BLOCK_BOX_SPACING_CLAMP
// ({min:0,max:240}) — imported read-only from services/pages/pageDocumentV2
// (the allowed services→services precedent set by menuDocumentV2; the Bun-free
//  boundary bans only @/ui/pages, not this constant import).
export type ScreenBlockBoxSpacingV1 = Partial<Record<"top"|"right"|"bottom"|"left", number>>;
export type ScreenBlockStyleV1 = {
  width?: (typeof screenBlockWidths)[number];
  minHeight?: number;                 // clamped int px, 0..640
  margin?: ScreenBlockBoxSpacingV1;   // per-side clamped ints, 0..240
  padding?: ScreenBlockBoxSpacingV1;
  align?: (typeof screenBlockAligns)[number];
};
```

Validation is schema-first and matches the screen module's split discipline:
**unknown KEYS throw** `custom_screen_definition_invalid` (both an unknown
`style.*` key and an unknown box side), while **invalid VALUES coerce/clamp** and
never throw (`width:"huge"→"auto"`, `align:7→"start"`, `minHeight:9999→640`,
`minHeight:-4→0`, `margin.top:3.7→3` floor, non-number → clamp min). The channel is
**sparse and self-pruning**: only present keys are emitted, an empty `style: {}` or
`style: { margin: {} }` prunes to NO `style` member, and an **absent `style` key
stays absent** after normalize (spread-emit-only-when-present) so no-style documents
are byte-stable. The same rules apply on the READ path
(`normalizeScreenDocumentV1ForRead`), so stored screens are never mutated. A
mirrored Ajv schema (`screenBlockStyleV1Schema`, `additionalProperties:false`,
integer ranges) at the route validation layer rejects an unknown/out-of-range/junk
style at the edge with `validation_error` **before** the service normalizer runs —
raw stored input can never reach the renderer's inline `style={}` except as a
clamped number or a mapped Tailwind class.

Renderer emission (`ScreenRuntimeRenderer.wrap()`, ONE path for
builder/preview/entry): `style.width`→width class (`w-1/2`, `w-1/3`, `w-2/3`,
`w-full`; `auto`→none), `style.align`→align class (`mr-auto`/`mx-auto`/`ml-auto`;
`stretch`→`w-full`), `minHeight`+per-side `margin*`/`padding*`→inline CSS.
**Deterministic precedence:** the align class is suppressed when an explicit
horizontal margin (`margin.left`/`margin.right`) is set, so inline margins win over
the align preset with no inline-vs-class fight.

### Clearable labels (renderer semantics, TASK-503-02)

The old `readText(...) || fallback` made an explicitly-cleared label (`""`)
indistinguishable from never-set. Fixed to the divider model: a `string` label is
treated as explicit (trimmed `""` = **no label**, the `<p>` is not rendered);
an **absent** label key keeps today's default chain
(`field.label → systemFieldLabels → fieldName → "Field"`; stat default `"Stat"`),
so stored screens render identically. The builder keeps a field-name stand-in
**inside** the `{{ token }}` so a cleared-label binding stays visible on the canvas.
Applies to `field` and `stat` kinds.

### Image `ratio` enum (TASK-503-01/02) — NO schema coercion

`screenImageRatios = ["auto","1/1","4/3","16/9","3/2"]` (canonical **slash** tokens).
Per decision 3 the schema keeps `ratio` **permissive and UNCOERCED** (the image
`data` allow-list is unchanged) so a stored legacy free-text ratio (e.g. `"16:9"`)
round-trips **byte-identical on BOTH read and write** — a coercion would also run on
the read path (`normalizeScreenDocumentV1ForRead`) and mutate stored reads. The enum
is consumed only by the renderer class-map and the inspector EnumRow:
`1/1→aspect-square`, `4/3→aspect-[4/3]`, `16/9→aspect-video`, `3/2→aspect-[3/2]`;
`auto`/absent/unknown/legacy-colon → NO aspect class (today's exact `<img>` markup,
no wrapper — byte-parity). The inspector EnumRow shows colon LABELS
(`auto/1:1/4:3/16:9/3:2`) but WRITES the slash enum value.

### Exported `normalizeScreenImageSrc` (TASK-503-01) — enforced write + preview + save

`normalizeScreenImageSrc` is now EXPORTED and is the single source of truth for the
`src` prefix filter (`/`, `http://`, `https://` allowed; everything else → `""`,
never throws). It runs on the save path (as before) AND the inspector write path
(raw text stays in a local input draft so typing `https://…` character-by-character
is not destroyed) AND the builder preview — so a `javascript:`/`data:` src can never
reach `<img src>` at any point in the authoring session.

### Entry-view presentation (`showFieldMetadata`, TASK-503-03)

The published-screen **entry** canvas is clean by default. Three gated changes,
**entry-mode-only** (builder/preview chrome unchanged, byte-parity preserved):

- **Metadata badges** (binding "Editable/Read/Unbound" + the uppercase field-type
  badge) are gated by a new `showFieldMetadata` prop (default **false**). The two
  badges have different current gates and are gated **separately**: the field-type
  badge (no mode gate historically) STAYS in builder + preview and is gated only in
  entry; the binding badge stays builder-absent. `entryChromeVisible = mode ===
  "preview" || (mode === "entry" && showFieldMetadata)`.
- **Flat surface:** the entry block wrapper recolors to opaque `bg-card rounded-xl`
  **while retaining `selectionBorder`** (the TASK-498 selection ring the
  presentation-override panel is scoped to — load-bearing, NOT stripped), the entry
  section carries `bg-transparent`, and the entry canvas scroller drops `bg-dotted`.
  The section's 2-way fork was forked into 3 so builder keeps `bg-background/60`.
- **Preference:** `useScreenEntryPreferences` (`usePostEditorPreferences` pattern) —
  localStorage-only, key `coderso.screens.entry.preferences.v1`, default
  `{ showFieldMetadata: false }`; junk / non-boolean / parse errors swallow to the
  default. Surfaced as a "Show field metadata" Switch
  (`[data-screen-entry-metadata-toggle]`) in the entry-canvas sub-toolbar
  (reachable on a fresh record view with no block selected — NOT the Presentation
  panel, which is null until a presentation-capable block is selected).

### Drag-handle contract (TASK-503-02) — `data-screen-drag-handle`

The whole builder card used to be the native-DnD source, so nested draggable
children shadowed their container. `draggable` + `onDragStart` + `onDragEnd` now
live on the corner type Badge (`data-screen-drag-handle={block.id}`, builder-only);
ALL drop wiring (`onDragOver`/`onDrop`/card drop targets) and keyboard/a11y move
flows stay on the card (which keeps `data-screen-block-id`). Insertion-targeting
tests that simulate `dragstart`/`dragend` fire on the handle; drop/read queries stay
on the wrapper.

### Legacy record-header copy — authoring note (decision 2, NO read-path repair)

The "RECORD OVERVIEW" eyebrow / "Preview the primary content fields in one place."
subtitle on migrated screens are STORED `screenRecordHeader` widget-migration DATA,
not code defaults. They are cleared via the record-header eyebrow/subtitle inspector
rows (record-header renders `null` for empty values). There is deliberately **NO
read-path mutation** — that would break stored-V4 byte-stability and could discard
copy the author kept intentionally.

**Residual follow-ups (documented, not silent gaps):** a future validated
`ScreenBlockStyleV1.background` enum (the additive successor to the removed free-text
`variant` "Background" row); `useScreenEntryPreferences` is local-only v1, with
`userSettingsClient` cross-device sync deferred.

## Custom Screen section column layout & binding integrity (TASK-505)

TASK-505 adds section columns and a binding-integrity GC on top of TASK-498/500/503
**without** a schema migration: document `schemaVersion` stays `1`, the editor-view
definition stays **v4**, and stored-V4 docs round-trip **byte-identically**. No new
endpoint, RBAC bucket, or persisted column is introduced.

### Section style channel — `ScreenSectionStyleV1` (TASK-505-01)

A **new** dedicated `style?: ScreenSectionStyleV1` channel on `ScreenSectionV1`
(precedent: the TASK-503 block `style` channel). The dead `section.layout`
(`WidgetLayout`) field is left **untouched** — retyping it to a reject-unknown enum
shape would throw `custom_screen_definition_invalid` on legacy docs that carry a
`WidgetLayout` object, so a new channel is used instead.

```ts
export type ScreenSectionStyleV1 = {
  columns?: ScreenSectionColumnPreset; // absent → vertical stack (unchanged)
  columnGap?: number;                  // clamped int px 0..64 (SCREEN_SECTION_COLUMN_GAP_CLAMP)
};

export const screenSectionColumnPresets = [
  "1", "2", "3", "4",
  "1-1", "1-2", "2-1", "1-3", "3-1", "2-3", "3-2",
  "1-1-1", "1-1-1-1",
] as const;
```

- **Preset → `grid-template-columns` fr map** (`screenSectionColumnTemplate`, the single
  source of truth exported by `customScreenSchemas.ts`; the renderer imports it):
  `"1"`→`1fr`, `"2"`→`1fr 1fr`, `"3"`→`1fr 1fr 1fr`, `"4"`→`1fr 1fr 1fr 1fr`,
  `"1-1"`→`1fr 1fr`, `"1-2"`→`1fr 2fr`, `"2-1"`→`2fr 1fr`, `"1-3"`→`1fr 3fr`,
  **`"3-1"`→`3fr 1fr`** (the owner's `3/4 : 1/4`), `"2-3"`→`2fr 3fr`, `"3-2"`→`3fr 2fr`,
  `"1-1-1"`→`1fr 1fr 1fr`, `"1-1-1-1"`→`1fr 1fr 1fr 1fr`.
- **`normalizeScreenSectionStyle`** mirrors `normalizeScreenBlockStyle`: **coerce-not-throw
  VALUES** (junk `columns` → `"1"` = single-column stack; `columnGap` clamped/floored to
  0..64), **reject-unknown KEY throws** `custom_screen_definition_invalid`, and
  **prune-empty → `undefined`** (an empty / all-junk style persists nothing). Mirrored in
  the Ajv `screenSectionV1Schema` `style` sub-schema (`additionalProperties:false`,
  `columns` = preset enum, `columnGap` = integer 0..64). `"style"` is added to the
  `normalizeScreenSection` allow-list and to `ScreenSectionPatch`.
- **Auto-flow cell assignment (TASK-505-02).** The one shared renderer block-list
  container becomes `display:grid` with `gridTemplateColumns` = the preset template and
  `gap` = `columnGap ?? 16`px. **Each block = one grid cell**, filled left-to-right in DOM
  order — zero new per-block state. In the builder the **inter-block** insert-gap
  interleave is **suppressed** when gridded; only the section-start/end insert-gaps remain,
  each a **full-row** `grid-column: 1 / -1` affordance that never steals a cell. The
  gridded-builder branch still passes per-card `dropTargets`, so card-midpoint DnD survives.
- **Absent-style byte-stability.** An unset `columns` keeps the exact `space-y-4` vertical
  stack — **byte-identical DOM to pre-505**, no inline `grid` style, no `style` key injected
  on normalize.
- **Per-block `width` stays a within-cell fraction.** TASK-503 `style.width` (`w-1/2` etc.)
  is half of the **cell**, never a column span (no double meaning). Per-block
  `columnSpan`/`columnStart` is **deferred**.
- **The "Bathrooms: 2" recipe.** Section `columns: "3-1"` + a Text block "Bathrooms" (a 503
  clearable label) + the bound field-value block; auto-flow places them label-left /
  value-right on one row. No new block kind, no binding change.

### Binding-integrity GC (TASK-505-01, Item B)

A screen whose bindings referenced a **deleted content-type field** (field-orphan) or a
**removed block** (block-orphan) was previously a permanently **un-saveable** dead-end —
`normalizeScreenFieldBinding` threw `custom_screen_definition_invalid` and the route mapped
it to an opaque static 400 with no field name. TASK-505 makes it **recoverable**:

- **Decision (recorded): a missing-content-type-field binding is PRUNED + per-field-flagged
  (recoverable), NOT a hard 400.** On the write/normalize path, field-orphans are collected
  into a mutable **sink** (`normalizeScreenFieldBinding`/`normalizeScreenFieldBindings`) and
  pruned instead of thrown; block-orphans are pruned **inline** against the already-computed
  live-block-id set in both `normalizeCustomScreenEditorViewDefinitionV4` and the separate
  `normalizeCustomScreenListRowTemplate` (the list-row template's independent binding set —
  the SECOND dead-end). The `ForRead` twins prune silently via a discard sink (correctness
  cleanup: preserve the authored document instead of discarding the whole editor view).
- **Field-name surfacing on the SUCCESS path.** The pruned names ride the PATCH **200**
  response body as a transient `warnings` array
  (`[{ code: "binding_field_removed", fields: [...] }, { code: "binding_block_removed", fields: [...] }]`),
  computed at normalize time and **never persisted** (stored-V4 bytes unaffected). The
  editor renders it as a clear per-field notice ("Removed bindings for deleted field(s): …").
  The `custom_screen_definition_invalid` 400 branch and `mapCustomScreenError`'s exact-message
  switch stay **byte-unchanged** — field names are NOT injected into `error.message`; the
  residual 400 fires only for **structurally-malformed** bindings (non-record, no `blockId`,
  bad `source`/`mode`), which carry no field name.
- **`reconcileScreenBindings` (`screenDocumentOps.ts`)** — a **pure, deterministic,
  idempotent, non-destructive** helper that prunes bindings whose `blockId` matches no live
  block, preserving source order of survivors and returning `{ bindings, removedBlockOrphans }`.
  It is shipped as an available helper for a future delete-site adopter; **delete-site wiring
  is DEFERRED** (adopted by no 505 subtask). The saveability guarantee is the **normalize-time
  write safety-net** above, which prunes block-orphans on every Save regardless of which delete
  handler ran. The narrow `removeScreenBindingsForBlockTree` helper is retained. To avoid a
  `schemas→ops→schemas` circular import, `reconcileScreenBindings` is **not** imported into
  `customScreenSchemas.ts`; the schema-file prune is an inline filter over the block-id set
  already in scope.
- **Sink-only signature discipline.** `normalizeCustomScreenDefinitionForWrite` and
  `normalizeCustomScreenEditorViewDefinitionV4` **keep their existing return types**; the sink
  is threaded as an optional final parameter (no return-type widening) so the three assistant
  callers and the internal read/assistant caller compile unchanged (verified by root `tsc`).

**Deferred residuals (recorded, not silent gaps):** per-block `columnSpan`/`columnStart`
(a later `ScreenBlockStyleV1.span`/`start`); a visual column-ratio picker / SegmentedControl
(v1 uses the plain `EnumRow`); custom (non-preset) fr ratios; responsive per-breakpoint
column counts; nested-section grids; `reconcileScreenBindings` delete-site wiring.

## Menu Design tab — brand style & per-level styling authoring (TASK-504)

The menuDocumentV2 Design tab (`core/admin/ui/menus/MenuDesignEditor.tsx`) adds a
deep-styling authoring surface on the EXISTING validated `PATCH /menus/:id`
document write path (no new endpoint/RBAC/migration; no `schemaVersion` bump). The
document contract + CSS emission are specified in `PAGE_MODEL.md` (menuDocumentV2
section); this is the authoring/UX surface.

- **Mode-gated brand style controls.** The brand block panel exposes style controls
  gated by `block.props.mode`: text mode ⇒ `fontSize`/`fontWeight`/`color`/
  `textTransform`/`letterSpacing`; image mode ⇒ `height`/`maxWidth` (reusing
  `ColorSwatchControl`/`SliderControl`/`SegmentedControl`). Writes merge into
  `brand.props.style` via the flat `patchBlock` helper, leaving `mode`/`href`/`text`
  intact. Image-mode brand renders a real resolved `<img>` (defect B1 fix) on both
  canvas and front.
- **Level SegmentedControl (0 / 1 / 2).** At the top of the nav-items panel a Level
  control REBINDS the SAME control set to the selected level's record: Level 0 writes
  the existing nav base (`props` scalars, NO `levelStyles`); Level 1/2 write
  `props.levelStyles[N]` (link typography/state + submenu container chrome). A
  **Base / Override / Inherited** badge (reusing the `MenuResponsiveControlShell`
  badge pattern) reads "Base" at Level 0, "Inherited (inherits level N-1)" for a level
  with no own value, and "Override" once a field is set — matching the pure-CSS-cascade
  inheritance (level 1 inherits level 0, level 2 inherits level 1 where unset).
- **Device-forked writes + per-breakpoint Reset.** Both brand AND level controls fork
  on Tablet AND Mobile (Desktop ⇒ base; Tablet/Mobile ⇒ a SPARSE
  `responsive.{device}` override), following the Pages cascade (mobile ≠ tablet). The
  underlying mutators are dedicated helpers (`patchMenuBrandStyleForDevice` /
  `clearMenuBrandStyleOverride` for brand; a nested-path `patchMenuSectionForDevice`
  variant + nested raw-read for `navProps.levelStyles[N][field]`) — the flat/
  visibility-only helpers cannot reach these paths. The `data-menu-responsive-reset`
  Reset prunes the stored responsive record verbatim (DEEP prune chain), flipping the
  badge back to Inherited. All writes fire from event handlers (no setState-in-effect).
- **Canvas force-open preview.** Selecting a Level ≥1 threads the selected level into
  `MenuDocumentCanvas → buildMenuDocumentPreviewCss`, which force-opens the WHOLE
  ancestor chain up to that depth (levels 1..N, appended LAST) so the author SEES the
  level they are styling; selecting Level 0 clears it. The font-size slider is
  DISPLAY-only for the inherited value (shows `16` as inherited/base, distinct from an
  explicit `15`, and writes nothing on mount). The Menu editor header items badge shows
  the TOTAL nested item count with correct plural.

## Menu Design tab — base reset, visible defaults & 5 modern bundles (TASK-506)

TASK-506 extends the same Design tab with the two owner-reported UX foundations and
five modern styling bundles (same EXISTING `PATCH /menus/:id` write path; no new
endpoint/RBAC/migration; no `schemaVersion` bump). Document contract + CSS emission
are in `PAGE_MODEL.md` (menuDocumentV2 section); this is the authoring surface.

- **F1 — "Reset to default" on every control with an explicit own value.** The
  `MenuResponsiveControlShell` Reset button (`data-menu-responsive-reset`) now renders
  whenever the control's OWN record carries an explicit value — on the DESKTOP BASE as
  well as tablet/mobile overrides (before, it showed ONLY for a device override, so a
  desktop-base value could never be cleared). Tooltip copy forks per branch ("Reset to
  default" on base vs "Remove the {device} override…" on a device). The base branch
  calls the model base-clear (`clearMenu*Base`) which deletes the field and prunes
  empty records so the doc returns byte-identical to a never-authored doc; the device
  branch keeps pruning the responsive record. `hasBaseValue` is derived from the RAW
  own record (never the resolved value), so an inherited-but-unset control shows NO
  Reset. `mobileMode`/`dropdownDirection` are out of the base-reset surface.
- **F2 — visible resolved default under every control.** A single reusable
  `<ControlDefaultHint data-menu-control-default>` renders under every unset
  numeric/enum/color control, showing the RESOLVED effective value + its SOURCE
  ("Inherited from theme (16px)", "Inherits level 0 (14px)", "Default 8px",
  "Inherited from desktop", or "Default (Right)"/"Default (On)" for the modern
  enum/bool fields) — never the misleading `range.min`. The hint reads
  `resolveMenuControlDefault` from the model, never a hardcoded editor constant, so a
  change to the shell/link defaults flows through automatically.
- **The 5 modern bundles** (per-level 0/1/2 + per-device tablet/mobile, gated by
  level): **B1** separator controls (show toggle / color swatch / width slider / style
  segmented) — orientation-aware, vertical on the top bar, horizontal in dropdowns;
  **B2** indicator (segmented none|underline|overline / color / thickness / grow toggle
  / hover-underline toggle / transition slider / hover-lift slider); **B3** caret
  (show toggle / rotate-on-open toggle / flyout-animation segmented none|fade|slide —
  levels ≥ 1 only); **B4** pill controls (`navPillBackground`/`Radius`/`PaddingX`/
  `PaddingY`) ONLY on the Level-0 (nav-base) panel writing `navChrome`, plus dropdown
  container padding (`containerPaddingX/Y`) on Level 1/2; **B5** `submenuPlacement`
  segmented (right|bottom|left) ONLY on Level 2. Clamp ranges: divider width `1..8`,
  indicator thickness `1..6`, transition `0..400ms`, hover-lift `0..8`, container/pill
  padding `0..40`/`0..32`, pill radius `0..40`. All controls fork per device (Desktop ⇒
  base, Tablet/Mobile ⇒ a SPARSE override) and expose F1 Reset + F2 hint; selecting a
  Level ≥ 1 threads the force-open level into the canvas so the depth is visible.

## Menu Design tab — nesting forms: centering, perceptible flyout, direction & accordion (TASK-508)

TASK-508 closes three owner-reported gaps on the same Design tab, all present-only and
doc-scoped (no `schemaVersion` bump; `buildSiteShellCss(null)` + no-override docs
byte-identical):

- **Corrected container default hints (R1a).** The dropdown-container controls
  (`minWidth`, `containerPaddingX`, `containerPaddingY`) now surface the REAL effective
  base-sheet defaults — **"Default 180px"** / **"Default 6px"** — and the slider thumbs
  sit at 180 / 6, instead of the misleading `undefined`/`0`/`range.min` they showed
  before. The level-0 pill sliders (`navPillRadius`/`navPillPaddingX`/`navPillPaddingY`)
  stay hint-gated (the pill has no base-sheet default). Hint/thumb-only — no CSS change.
- **Link alignment (R1b).** A per-level `linkAlign` segmented control (`left|center|right`)
  on the dropdown levels (1/2) emits `text-align` on the link. Because the link fills the
  ≥180px container, `center` centers the label — the "auto-padding to center" the owner
  asked for. Per-device (Desktop ⇒ base, Mobile/Tablet ⇒ a SPARSE override), per-level.
- **Perceptible flyout (R2).** The `flyoutAnimation` fade/slide now ACTUALLY animates on
  open AND close (visibility+opacity+transform reveal), replacing the previously inert
  `allow-discrete`/`@starting-style` approach; keyboard `:focus-within` still opens the
  sublist and its links stay fully interactive.
- **Unified submenu direction (R3a).** ONE nav-global `submenuDirection` segmented control
  (`right|down|up|left`, now including **up**) in the Level-0 (nav-base) panel, applied
  CONSISTENTLY across ALL nested depths — choosing "down" yields one cohesive downward
  column. **Base-only** (one switch drives every device ≥640, NO per-device fork; a
  granular level-2 `submenuPlacement` still wins).
- **Accordion inline mode (R3b).** A nav-global `submenuMode` segmented control
  (`flyout|accordion`) in the Level-0 panel. Accordion renders the whole menu as one
  in-flow vertical block (`position:static`, indented, pushing siblings/content down),
  keyboard-reachable; flyout is the default and a flyout-mode doc emits ZERO accordion
  bytes. **Base-only**, no per-device fork.

`submenuDirection`/`submenuMode` live on `navChrome` (nav-global, base-only, rendered as
unwrapped SegmentedControls with no device fork / Reset badge); `linkAlign` lives on
`NavLevelStyle` (per-level, per-device). Enums are validated schema-first (reject-unknown
key ⇒ 400 with path; bad enum value fails soft).

## API

Admin API w `CMS_API.md`:
- `/content-types`
- `/content/:type/entries`

## Plugins

Plugin moze rejestrowac nowe content types (v1.1).
Plugin moze dodac wlasne field types (v1.1).
Plugin moze dodac automatyzacje (workflow hooks) powiazane z content types (v1.1).
