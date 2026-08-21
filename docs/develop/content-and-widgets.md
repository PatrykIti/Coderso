# Content Models, Sections, Blocks & Dashboard Widgets

This is where Coderso earns its "WordPress user experience, Next.js developer
experience" tagline. The **content engine** lets you model data without writing a
migration, while editor-owned **sections and blocks** turn bounded JSON into
rendered UI. Product widgets are limited to the configurable Admin Dashboard;
the historical `core/widgets` directory is retained runtime compatibility code,
not a general authoring model.

## The content engine

The content engine is the WordPress-style modeling layer that sits above Pages. Everything is DB-backed and edited from the Admin UI, so new models go live with no restart and no schema migration.

| Concept | What it is | Where it lives |
| --- | --- | --- |
| **Content Type** | A schema definition (a "Custom Post Type"), stored as JSON Schema in JSONB. Has real `draft`/`published` status; `name`/`slug` are unique. | `content_types` |
| **Content Entry** | A data record validated against its type's schema. Statuses `draft`/`published`, with revisions per entry. | `content_entries` / `content_revisions` |
| **Custom Screen** | An admin surface (List View / Editor View) built against a chosen content type. Editor View stores screen-owned sections, blocks, and bindings. | `custom_screens` |
| **Listing** | A saved query/facet config over entries that listing/collection blocks consume. | (DB-backed) |

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
- **Entries** (`/admin/advanced/entries`) — the generic workflow for *your own*
  content types, feeding listings and section/block render surfaces.

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

Other active editors follow the same product vocabulary with their own bounded
owners. Custom Screens V4 store screen-owned `document.sections[].blocks[]` plus
bindings; Posts store their post block document; Detail/Page templates compose
the section/block contracts owned by those domains. A historical data adapter may
still read an older widget-shaped record, but new authoring must not route through
that adapter or persist a new widget document.

### Page v2 authoring and runtime behavior

Page v2 additions stay owned by the Page editor contract (strict schema,
normalizer, editor controls, renderer, and tests), never a generic widget
surface:

- **Gallery controls.** The gallery block authors canonical rows with a bounded
  media URL, alt text, and caption, plus optional category tokens (1 to 12
  kebab tokens per item). The editor uses dedicated gallery items and category
  token controls; stored legacy rows keep reading through non-destructive
  aliases.
- **Grid placement.** One shared Bun-free classifier decides where a
  section-root block actually paints: default block frame,
  section-template-wrapper (timeline/gallery/FAQ/testimonials), or none (nested
  children, per-column composition, non-default media-split). Editor span
  controls, the renderer, and responsive span CSS all consume the same
  classification.
- **Responsive typography, spans, and layers.** Per-device custom font sizes
  and explicit `text-transform: none` resets project to the public CSS, spans
  emit on the placement-gated grid hook, and responsive layers carry only
  present `x/y/z` offsets.
- **Full-bleed paint.** Backgrounds are parsed into validated image layers plus
  an optional final color; responsive paint targets the section root for
  full-bleed sections and section content otherwise. Glow overlays never
  capture pointer events.
- **Transform custom properties.** One fixed transform host composes reveal,
  decoration, hover, tilt, and magnetic channels through eleven custom
  properties; layer anchors use the independent `translate` property.
- **Marquee.** A seamless marquee duplicates content only when the child
  subtree is replica-safe; `form`, `filters`, `collection`, `video`, `embed`,
  and nested marquees always render one canonical segment, so a form plus
  paired filters/collection under one marquee keeps exactly one nonce, one
  listing runtime script, and one resolved surface set.
- **Effects runtime.** One reusable per-root controller scans main and footer
  output, binds each element once per effect, and never duplicates globals.
  Switcher/gallery filtering stays functional under reduced motion; reveal,
  parallax, spotlight, tilt, and magnetic stay neutral.

## Extending an editor

New editor-facing work extends the owning section/block schema rather than a
global widget registry:

1. Add the section or block key/type to its domain-owned schema and exact
   reject-unknown allowlist.
2. Add deterministic normalization, including present-only behavior for optional
   fields and a non-destructive read adapter only when legacy data requires one.
3. Add the editor control through that editor's section/block control registry.
4. Render through the same domain renderer used by preview and the final runtime.
5. Add round-trip, unknown-key, editor, render, and real-flow tests in the lane
   owned by that domain.

Do not add a non-dashboard widget type, Wizard/Visual/Advanced widget editor,
`coreWidgetMetadata` entry, module-pack entry, widget preset, or widget-template
authoring route as a shortcut. If an old runtime helper is useful, consume it
behind the new section/block adapter without widening the legacy product surface.

### Custom Screen implementation boundaries

Custom Screens keep `definition.schemaVersion: 4` and a Screen-owned
`ScreenDocumentV1` (`schemaVersion: 1`). Fixed block kinds have discriminated,
reject-unknown `data` schemas; Tabs items and their slot keys are one exact
identity set. The active Button contract is Link-only. Stored legacy
`publish`/`custom` actions use a non-persisting disabled read adapter instead of
an expanded action API.

Use `sanitizeScreenAuthoringUrl` for authored Button links and image sources,
and repeat the check at the render sink. Direct-image presentation overrides
and bound media-field values remain media UUIDs; the host may resolve the
winning ID to an ephemeral safe URL map, but must not replace the stored
field/override value with a URL. An unbound image block may instead persist its
separately sanitized static `data.src` URL.

Builder document/binding state and entry content/presentation state are separate
dirty channels. Both use the shared navigation/`beforeunload` guard, and cache
hydration must consult current dirty refs and route/request generations before it
commits. Related-entry and media reads clear only their exact pending promise so
failure remains retryable and older requests cannot publish over newer work.

The entry-only `showFieldMetadata` preference uses the existing authenticated
user-settings key `customScreens.entry.preferences` with the strict value
`{version:1, showFieldMetadata:boolean}`. It is isolated from the aggregate
user-settings cache and browser storage; auth-identity epochs cancel queued work
for a previous user. The Screen canvas keeps narrow gutters, applies desktop
panel clearance only at `lg`, and exposes its labelled floating panel as an ARIA
region.

## Color values across domain boundaries

Consumers enrolled in the Bun-free canonical contract use
`core/services/theme/cssColorContract.ts`. Its `authoring` profile accepts the
bounded supported literals, `transparent`, and `var(--color-*)` references; the
explicit `inherited-render` profile additionally accepts canonical
`currentColor` and `inherit`. For those consumers, JSON Schema patterns provide
an early structural guard, but the owning write/render boundary still calls the
semantic parser for ranges, function arity, and canonical output. TASK-541 adds
no defaults: existing sparse fields remain present-only, while retained empty or
explicit default sentinels stay byte-compatible with their owning domain.

Page v2 effects runtime contract (TASK-539): one static dependency-free IIFE
per render. Main and footer each emit a copy; the shared per-root controller
(`window.__codersoPageEffectsV2` + `init(document)`) deduplicates through
binder-specific `WeakSet`s, so the parser-order rescan handles a footer that
renders after main with no `MutationObserver`. Listener passivity is per-event:
`keydown` binds `{passive:false}` because switcher/gallery arrow-key roving
calls `preventDefault`; all other listeners stay passive. Do not regress to a
blanket `{passive:true}` — it surfaces the passive-listener console error and
breaks keyboard roving.

Domain policy remains explicit. The landed Page admin control uses the shared
`authoring` profile, while the current Page backend still uses its independent
legacy sanitizer. That sanitizer has the exact token allowlist (`primary`,
`secondary`, `accent`, `bg`, `surface`, `text`, `border`) but also retains its
historical alphabetic named-value branch, including current backend handling of
`currentColor` and `inherit`. TASK-539 owns the future backend parser handoff
without removing the seven-token filter; until then, do not treat the admin
adapter as server enforcement. Form theme colors are the TASK-516 exception that
use `inherited-render` consistently from write normalization through builder
preview and public Form rendering.

Historical `core/widgets` read/render adapters opt into inherited keywords only
for their enumerated direct CSS-property fields. A nested gradient or overlay
stop may accept `currentColor` while rejecting `inherit`; its owning composite
parser remains authoritative. These compatibility rules support existing domain
callers and do not create a generic widget surface.

## Dashboard widgets

Configurable widgets are an Admin Dashboard feature. Dashboard layout and widget
data are owned by `core/services/dashboard`, dashboard routes, and the per-user
`dashboard_layouts` contract. They are not Page Builder blocks and are not part
of `core/widgets/*`. Dashboard contributions remain internal/admin-only and must
follow their dashboard schema, RBAC, caching, and user-preference contracts.

## Historical `core/widgets` compatibility

`core/widgets` and `tests/vitest/widgets` remain real filesystem paths because
legacy render adapters and migrated surfaces still depend on them. Examples
include compatibility renderers used behind existing Form, listing, contact, or
newsletter block/section flows. Names such as `form-embed` describe an internal
runtime seam; they do not define a selectable product widget.

Maintenance in this namespace is limited to security, correctness, compatibility,
and migration work for an existing caller. Keep its schemas strict, preserve safe
legacy reads, test the current caller, and avoid registering new authoring
capabilities. `_docs/WIDGETS.md` and `_docs/_WIDGETS/*` are historical
implementation references for that maintenance, not a roadmap for new
non-dashboard widgets.

Changes to core runtime compatibility code still ship through CI and a redeploy.
They are not runtime-installable like plugins; see
[./runtime-model.md](./runtime-model.md) for the live-versus-build-time boundary.

## Where to go deeper

- `_docs/CONTENT_TYPES_SPEC.md` — the content engine spec.
- `_docs/PAGE_MODEL.md` — the Page v2 section/block JSON model in detail.
- `_docs/CMS_API.md` — Custom Screen section/block and Dashboard widget API
  ownership.
- `_docs/WIDGETS.md` — historical runtime compatibility internals when an
  existing adapter must be maintained.
- Sibling pages: [./architecture.md](./architecture.md) for the big picture and
  [./testing.md](./testing.md) for dependency-shaped test lanes.
