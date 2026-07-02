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

## API

Admin API w `CMS_API.md`:
- `/content-types`
- `/content/:type/entries`

## Plugins

Plugin moze rejestrowac nowe content types (v1.1).
Plugin moze dodac wlasne field types (v1.1).
Plugin moze dodac automatyzacje (workflow hooks) powiazane z content types (v1.1).
