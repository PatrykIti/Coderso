# Content Models & Widgets

This is where Coderso earns its "WordPress user experience, Next.js developer experience" tagline. Two systems work together here: a **content engine** that lets you model your own data without writing a migration, and a **page/widget model** that turns JSON into rendered UI. Get these right and editors get safe, friendly building blocks while you keep full control of the schema.

## The content engine

The content engine is the WordPress-style modeling layer that sits above Pages. Everything is DB-backed and edited from the Admin UI, so new models go live with no restart and no schema migration.

| Concept | What it is | Where it lives |
| --- | --- | --- |
| **Content Type** | A schema definition (a "Custom Post Type"), stored as JSON Schema in JSONB. Has real `draft`/`published` status; `name`/`slug` are unique. | `content_types` |
| **Content Entry** | A data record validated against its type's schema. Statuses `draft`/`published`, with revisions per entry. | `content_entries` / `content_revisions` |
| **Custom Screen** | An admin surface (List View / Editor View) built against a chosen content type. Home of admin-only `screen-*` widgets. | `custom_screens` |
| **Listing** | A saved query/facet config over entries that listing widgets consume. | (DB-backed) |

### Modeling fields

Content Type fields are JSON Schema entries that carry extra UI metadata. The validator ignores the `x*` meta — it is purely for the admin editor:

- `xFieldType` — `text`, `richtext`, `number`, `boolean`, `select`, `media`, or `relation`.
- `xFieldConfig` — relation target/multiple, media accept/maxItems, select options, number format/min/max/step, and layout hints (tab/section/width/display).

A few rules worth internalizing:

- Field `name` must be **kebab-case**.
- Required fields must declare a `defaultValue`.
- Media fields store **media IDs** (`{ "hero-image": "media-id" }` or arrays); relations store **entry-ID arrays**.
- Taxonomies (categories = single-select, tags = multi-select) are entry metadata, **not** schema fields. Tags also mirror to `content_entries.tags` for search.
- A content type can't be deleted while entries, screens, taxonomies, or listings still reference it.

### Posts vs. Entries

These are two workflows over the same engine, and the distinction matters:

- **Posts** (`/admin/posts`, the reserved `post` type) — the editorial blog workflow with a Gutenberg-like block editor.
- **Entries** (`/admin/advanced/entries`) — the generic workflow for *your own* content types, feeding custom widgets and listings.

Content can render through theme/plugin/core templates (`content-<typeSlug>-list.tsx`, `content-<typeSlug>-detail.tsx`, with fallbacks) or through Detail Templates (a `DetailPageDocument` plus `bindings`, resolved by `resolveDetailPageBlocks`).

## The page model

A page is a JSON document stored in `pages.current_data` (draft) and `pages.published_data` (live). TASK-417 moved Pages to a v2 sections-and-atomic-blocks document. The root shape is:

```json
{ "schemaVersion": 2, "seo": {}, "sections": [], "settings": {} }
```

`settings` controls routing and lifecycle: `settings.template`, `settings.showInNav`, `settings.revisionRetention` (default 10, range 1–100), and optional `settings.collectionLink` metadata for assistant/catalog no-duplicate matching.

### Sections And Atomic Blocks

Each section owns layout, spacing, style, visibility, responsive overrides, and
an ordered list of atomic blocks:

```json
{
  "id": "sec_hero",
  "type": "hero",
  "layout": {},
  "style": {},
  "spacing": {},
  "visibility": {},
  "responsive": {},
  "blocks": [
    { "id": "blk_heading", "type": "heading", "props": {}, "visibility": {} }
  ]
}
```

- Core section types include `hero`, `content`, `collection`, `lead-form`,
  `navigation`, `filters`, `cta`, and `custom`.
- Core block types include `heading`, `text`, `button`, `image`, `form`,
  `list`, `card`, `collection`, `divider`, `spacer`, and `quote`.
- Fresh writes reject unknown fields and reject legacy/versionless `blocks[]`
  Page documents. Stored legacy Pages reset to an empty v2 document on read and
  render paths.

### Render pipeline

Pages render through `core/site/pageRuntimeV2.tsx`, not through
`WidgetRenderer`. The renderer resolves responsive overrides, renders section
containers, and renders atom blocks directly.

Widget rendering remains the contract for non-Page surfaces: widget templates,
custom screens, detail pages, and post/content block runtimes.

## The widget contract

A widget is a single module at `core/widgets/core/<name>.tsx` that exports a `create<Name>Widget(editors)` factory returning a `WidgetDefinition<T>`. It's registered through `core/widgets/core/index.ts` (`createCoreWidgetDefinitions` → `registerCoreWidgets`), which also attaches `coreWidgetMetadata` per type. See `core/widgets/core/entryTeaser.tsx` for a full worked example.

### Required surface

Defined in `core/widgets/types.ts`, every `WidgetDefinition<T>` must provide:

| Field | Notes |
| --- | --- |
| `type` | Core widgets are kebab-case (`hero`); plugin widgets are `<plugin>.<widget>`. |
| `title`, `category` | Category is `layout \| content \| forms \| navigation \| media`. |
| `variants` | At least one `{ id, label, description? }`. |
| `schema` + `defaults` | A draft-07 JSON Schema and a complete `defaults: T`. |
| `editor` | All three of `{ wizard, visual, advanced }` React components. |
| `render` | Receives `{ data, variant, slots?, previewDevice?, pageDefaults?, blockId?, renderContext?, renderBlock? }`. |

Optional but contract-relevant fields include `complexity` (`composite | atomic`), `audience` (`beginner | intermediate | advanced`), `module`, `requires[]`, `surfaces[]`, `dataAccess` (admin data binding), `bindingTargets[]` (selected-entry only), `slots[]` (+ `repeatableSlotSync`), `editorCapabilities`, and `editorContract` (v2). The registry applies sensible fallbacks (e.g. `layout → atomic`, `composite → beginner`, `module → category`).

### `normalize*` helpers

Two layers of normalization keep saved data valid:

- **`validator.normalizeWidgetBlock`** resolves the variant, merges `data = { ...defaults, ...data }`, applies `preserveAbsentDefaultKeys`, AJV-validates with `strict: true` (throwing `widget_schema_invalid` on failure), and normalizes the slot map (legacy `children` → `slots.default`, repeatable backfill to `minItems`, truncation past `maxItems`). `normalizeWidgetBlocks` recurses into slots.
- **Per-widget `normalize<Name>Data`** (e.g. `normalizeEntryTeaserData`) backfills nested defaults and is called from both editors and `render`, so partial saved data stays safe.

### The three editors

Every widget ships Wizard, Visual, and Advanced editors that all map to the **same data model**:

- **Wizard** — one-time setup only. New blocks (and `wizardCompleted = false`) open here; legacy blocks without `editor` state normalize as setup-complete and open in Visual. Wizard must **not** own style or layout paths.
- **Visual** — the daily driver: content, appearance, and behavior. Page-first link pickers, Media Library asset pickers, swatch-only colors, plus the shared block-level `layout.*` and `visibility.devices.*`.
- **Advanced** — technical/diagnostic, and largely **read-only** summaries. No raw CSS/JSON/HTML/IDs/endpoints are exposed to authors.

Editors emit stable automation metadata: `data-widget-control-path`, `data-widget-control-ownership`, `data-widget-control-readonly`, and friends. Writable ownership = paths where `readonly != "true"`.

### `editorContract` (v2)

`core/widgets/editorContract.ts` is the declarative, testable owner of the UX/data contract:

```ts
{ version: 2, sections: [{ mode, id, title, role, writablePaths, readOnlyPaths?, allowedDuplicateWritablePaths? }] }
```

Roles are `setup | source | content | visual | layout | technical | diagnostics | summary`. Validation enforces unique section ids, known modes/roles, no duplicate writable paths, **Advanced sections must not be writable** (`editor_contract_advanced_writable_diagnostic`), and **Wizard must not own style/layout paths** (`editor_contract_wizard_style_owner`). Wildcards are allowed only as a whole segment (`items.*.label`).

### Composite-first and the module pack matrix

Coderso delivers UI in layers: **Kits → Composite widgets → Atomic widgets**. Composites are business-ready sections and the beginner default; atomics are layout primitives aimed at advanced users.

`core/widgets/modulePackMatrix.ts` enforces a per-module minimum:

- `1` page preset
- `2` section presets
- `3` composite widgets

`content`, `forms`, `listings`, and `commerce` are `strict` modules (fail fast with `module_pack_invalid:<module>`); others are `advisory`. Composite references must exist and be registered as `complexity = "composite"`. Screen-only widgets (`custom-screen-builder`) are excluded from the matrix. Runtime helpers: `listModulePackStatus` and `validateModulePackMatrix({ strictOnly })`.

## Add a widget: the checklist

Follow this order — it matches the contract and keeps the registry and tests happy.

1. **Place the module** at `core/widgets/core/<name>.tsx` and define `type <Name>Data = {...}`.
2. **Write `<name>Schema`** (draft-07, AJV strict-compatible) and **`<name>Defaults: <Name>Data`** — complete, safe defaults (no fake `href: "#"`, no seeded CSS tokens).
3. **Add `normalize<Name>Data`** to backfill nested defaults; call it from editors and `render`.
4. **Define `variants`** (≥1) and pick `category`; decide `complexity`/`audience`/`module`, `requires[]`, `surfaces[]`, and (admin-only) `dataAccess` + `bindingTargets`.
5. **Declare `slots[]`** if the widget nests blocks (fixed vs. repeatable with `minItems`/`maxItems`/`allowedTypes`); add `repeatableSlotSync` if a repeatable slot mirrors a data array.
6. **Build the render component** — consume `data`/`variant`/`slots`/`previewDevice`/`pageDefaults`, emit your own slots if `slots` is set, use design tokens and the `none`/`Clear` semantics.
7. **Build the three editors** (Wizard / Visual / Advanced) against the same data model; emit `data-widget-control-path` + ownership/readonly metadata.
8. **Author `editorContract` (v2)** sections matching the editors' real writable/read-only paths and roles — Advanced non-writable, Wizard free of style paths.
9. **Set `editorCapabilities`** as needed (`visualOwnsVariantSelection`, `supportsPreviewState`).
10. **Export `create<Name>Widget(editors)`** and wire it into `core/widgets/core/index.ts` (add to `CoreWidgetEditors`, `createCoreWidgetDefinitions`, and a `coreWidgetMetadata[<type>]` entry).
11. **If it joins a module pack,** register it in `modulePackMatrix.ts` so `validateModulePackMatrix` coverage holds; composites must be `complexity: "composite"`.
12. **Add a per-widget doc** at `_docs/_WIDGETS/<NAME>.md` (linked from `WIDGETS.md`).
13. **Add tests** at `tests/vitest/widgets/<name>.test.tsx`: defaults render, inherit/spacing fallback, schema acceptance, contract section ids/order, Advanced read-only paths — and make sure the contract smoke test passes.
14. **Check assistant compatibility.** If the assistant can propose, configure, or generate this widget/variant, update the backend-owned assistant option registry or solution-kit mapping, keep shared ids in one owner, and add strict-schema plus `normalizeWidgetBlock` regressions. If the change is user-facing docs knowledge, update `docs/guide` and reindex the corpus. See [assistant.md](./assistant.md#keeping-assistant-capabilities-in-sync).

Because widgets are core source, changes ship through CI (`vite build` → `dist/client` + `dist/server`) and a redeploy — they are **not** runtime-installable the way plugins are. See [./runtime-model.md](./runtime-model.md) for what's live vs. build-time.

## Where to go deeper

- `_docs/WIDGETS.md` — the full widget catalog and contract (the authoritative reference).
- `_docs/WIDGET_PACK_MATRIX.md` and `_docs/WIDGETS_COMPOSITE_STRATEGY.md` — composite-first delivery and module coverage.
- `_docs/CONTENT_TYPES_SPEC.md` — the content engine spec.
- `_docs/PAGE_MODEL.md` — the page/block JSON model in detail.
- Sibling pages: [./architecture.md](./architecture.md) for the big picture, [./testing.md](./testing.md) for the widget test lanes.
