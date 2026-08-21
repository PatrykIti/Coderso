# CMS Spec (v1)

Dokument opisuje zakres i filozofie CMS. Szczegoly modelu danych i auth
znajduja sie w osobnych plikach (linki ponizej).

## Zakres CMS v1

- Pages + Page builder (sekcje/bloki) oraz Page Templates.
- Media library (upload, metadata).
- Menus (nawigacja, stopka).
- Settings (globalne, per plugin oraz per-user Dashboard widget layout).
- Users + roles.
- Revisions i publish workflow (draft/published).
- Plugin registry i settings.
- Plugin store (browse, install/update, enable/disable, update policy).
- Commerce v1 preview (internal admin CRUD): produkty, warianty i kolekcje.

Poza zakresem v1:
- Multi-site.
- Localization.
- Zaawansowany e-commerce (checkout/cart/payments, jako plugin) — katalog
  (produkty, warianty, kolekcje) jest w v1 jako wewnetrzny admin CRUD.

## Dokumenty powiazane

- `DATA_MODEL.md`
- `CONTENT_TYPES_SPEC.md`
- `CONTENT_MODELING_COOKBOOK.md`
- `CONTENT_EDITOR_UX.md`
- `DESIGN_TOKENS.md`
- `MEDIA_SPEC.md`
- `PAGE_MODEL.md`
- `PREVIEW_SPEC.md`
- `ORM_SPEC.md`
- `AUTH_SPEC.md`
- `RBAC_SPEC.md`
- `CMS_API.md`
- `SEARCH_SPEC.md`
- `AUDIT_SPEC.md`
- `SECURITY_SPEC.md`
- `WIDGETS.md`

---

## Page builder (blokowy)

Model:
- Strona v2 sklada sie z top-level `sections[]`, a kazda sekcja z domenowo
  walidowanych `blocks[]` i opcjonalnych bounded layout slots.
- Sekcje i bloki maja jawne `type`, scisly reject-unknown schema, deterministyczna
  normalizacje oraz wlasne kontrolki Page Editora.
- Page builder korzysta z biblioteki sekcji/blokow. Reusable composition nalezy do
  Page Templates i po wstawieniu otrzymuje swieze section/block IDs.
- Puste sloty otwieraja ten sam Page-owned insert surface z zachowanym slot context;
  nie istnieje drugi generic widget library ani Widget Wizard.
- Pages v2 keep sections as top-level bands. Flexible composition inside a
  section uses bounded Page layout blocks (`container`, `columns`, `group`) with
  named `slots`, max depth 4, and max 24 children per slot. Other slot-owner
  block families require explicit contract extensions before they can be
  inserted or rendered.
- Public and preview Pages v2 rendering recurses through those layout-block
  slots and resolves responsive overrides for nested children. Assistant Page
  active surfaces now expose bounded server-revalidated nested block paths and
  capability summaries, so layout blocks can be emitted through the assistant
  Page vocabulary.
- Page template inputs are explicitly Page v2 documents:
  `pageTemplateBoundary` resolves `kind: "page-v2"` with
  `documentContract: "page-v2-section-block-contract"`. Custom Screens V4,
  Posts, Forms, Menus, and detail-template surfaces use their own section/block
  contracts and must not receive a generic widget-template payload. Historical
  widget-shaped rows are read compatibility only.
- Page block runtime parity is capability-gated. Current runtime-real editor
  blocks include the atomic content blocks plus `container`, `columns`, and
  `group`; `gallery` has a real static public renderer for emitted kit data but
  remains hidden from author insertion until controls ship. `collection`,
  `form`, and `embed` now have scoped public runtime rendering and
  `publicDataBinding: "scoped-read-only"` while staying hidden from editor
  insertion and assistant emission until focused controls ship.

Przechowywanie:
- Biezacy stan strony trzymany w `pages.current_data` (JSONB).
- Historia zmian i settings autosave trzymane w `page_revisions`:
  - `kind = publish` dla snapshotow publikacji,
  - `kind = autosave` dla najnowszego niezatwierdzonego Page Settings snapshot.

Model v2 additions (TASK-539) belong to the Page editor contract — strict
schema, normalizer, editor controls, renderer, and tests — never a generic
widget surface:

- Gallery rows are canonical `{ src, alt, caption, category? }` objects with
  bounded lengths (120 rows; 2048/500/2000-char src/alt/caption; category token
  stack of 1..12 kebab tokens). Stored legacy gallery aliases read
  non-destructively; the page editor owns the gallery items/media/category
  controls.
- One shared grid-placement classification (`block-frame`,
  `section-template-wrapper`, `none`) drives editor span controls, the public
  renderer, and responsive span CSS from a single Bun-free owner.
- Responsive typography (custom font size, `text-transform` reset), responsive
  grid spans and `x/y/z` layer offsets, parsed background paint with full-bleed
  surface targeting, and the transform/marquee/timeline/effects surfaces are
  all Page v2 model behavior owned by the page editor.
- Public Page rendering stays read-only: TASK-539 adds no public write surface.
  Saved listing queries are consumed by the Page `filters`/`collection` blocks
  through the existing listing runtime, and an unsafe marquee subtree degrades
  to one canonical segment so scripts, nonces, and listing binders never
  duplicate.

## Pages runtime parity (v1)

- Public rendering i runtime preview korzystaja z tego samego pipeline.
- `page.data.settings.template` wybiera page template przez resolver theme -> plugin -> core (fallback `landing`).
- Navigation block/runtime compatibility may source published Pages and filters by
  `settings.showInNav` (fallback to manual links when required).
- Pages v2 public/runtime preview output uses the shared renderer for sections,
  atomic blocks, nested layout slots, static galleries, and scoped data-bound
  `collection`/`form`/`embed` blocks. Public collection output is published-only,
  form output reuses the existing forms runtime security projection, and embed
  output is limited to hardened provider iframes or sanitized inline markup.
- Page v2 responsive delivery reflects the normalized model (TASK-539): custom
  font size and explicit `text-transform: none`, placement-gated grid spans,
  present-key layer offsets, parsed paint with full-bleed surface targeting,
  and one canonical segment per unsafe marquee subtree. No-effect documents
  stay byte-identical.
- Page effects runtime: one static IIFE per render, main and footer emit their
  own copy and the shared per-root controller deduplicates through binder
  `WeakSet`s (parser-order rescan, no `MutationObserver`). Switcher and gallery
  stay keyboard-functional under reduced motion with a fixed per-event listener
  passivity contract (`keydown` non-passive so arrow-key roving can
  `preventDefault`; all other listeners passive).
- Page Templates (TASK-420-03) is the reusable-template surface: Page v2
  `sections[]` documents stored in `page_templates`, authored with the shared
  Page Editor v2 surface at `/advanced/page-templates`, previewed through
  `type=page-template` tokens, and inserted into pages by instantiating
  sections with fresh ids. TASK-460 keeps `/advanced/page-templates` as the
  technical admin route but exposes the visible entry point from the Pages list
  header. The legacy Advanced Widgets widget-template editor, routes, preview target,
  cache keys, and non-dashboard Widget Library authoring surface are retired/deleted.

---

## Publishing

Statusy:
- draft
- published

Zasady:
- publikacja kopiuje dane z draft do published.
- publikacja tworzy revision.
- rollback do revision przywraca dane.
- retain policy: `settings.revisionRetention` (default 10) controls how many publish revisions are kept per page.
- oldest revisions are pruned on publish when limit is exceeded.
- zamkniecie Page Settings z niezapisanymi zmianami tworzy jeden autosave snapshot (`title`, `slug`, `data`).
- autosave nie jest traktowany jak publikowana rewizja i moze byc osobno `restore` albo `discard`.
- Page Settings copy should describe this as keeping one draft version in
  history, not expose `autosave snapshot` jargon.

---

## Media library

Zakres v1:
- upload plikow (obrazy, pdf).
- metadata: alt, title, caption.
- foldery logiczne (tagowanie) opcjonalnie.

Storage:
- domyslnie lokalny filesystem.
- mozliwosc przelaczenia na external storage (S3/Azure).
- szczegoly: `MEDIA_SPEC.md`.

---

## Menus

- menu locations jako nullable theme/runtime slot keys (np. `primary`,
  `footer`), bez zamknietego enumu.
- menu lifecycle `draft` / `published`; runtime navigation uzywa tylko
  opublikowanych menu.
- menu items z nestingiem.
- menu item moze wskazywac na page lub URL.
- Admin UI jest list-first:
  - `/admin/menus` pokazuje liste menu i create entrypoint,
  - `/admin/menus/:id` edytuje tylko jedno wybrane menu.
  - edytor pokazuje `Discard`, `Save changes`, oraz `Publish` /
    `Move to Draft` dla aktualnie wybranego menu.

---

## Content types (kolekcje)

- Definicje schematow danych dla kolekcji (np. blog).
- Entries z statusami draft/published.
- Szczegoly: `CONTENT_TYPES_SPEC.md`.
- Content types sa tworzone w panelu admina (schema builder).
- Brak migracji tabel, dane w JSONB.
- Schema zawiera meta‑pola UI (`xFieldType`, `xFieldConfig`) dla stabilnego round‑trip.
- Entries admin follows the same confidence rules as Pages/Posts list/editor
  surfaces: visible feedback for mutations, app-dialog destructive confirms,
  cache-safe duplicate/delete flows, and dirty-state protection for unsaved
  content or metadata edits.
- Generic `content_entries` previews stay on the content entry runtime path even
  when the content type slug is `post` or `posts`; dedicated Posts storage is
  used only for real posts.

### Custom Screens authoring and records

- Custom Screens are admin-only workspaces bound to one Engine content type.
- `definition.schemaVersion=4` owns `listView` plus `editorView`.
- Fresh create/update requests accept V4 `definition` only; legacy
  `blocks`/`bindings` writes are rejected with
  `custom_screen_legacy_write_unsupported`.
- `editorView.document` is `ScreenDocumentV1`: `sections[]` contains
  `ScreenSectionV1` objects with nested `blocks[]`; it is not a Page v2
  document and strict writes reject flat block arrays.
- Read migration may wrap older flat V4 block arrays into a default section
  without destructive persistence.
- `definition.listView.rowTemplate` is an additive V4 row document + bindings
  contract for real records-list cells. Legacy list definitions are read with a
  default row template derived from visible columns; generated builder preview
  rows remain read-only.
- The List View builder uses the neutral canvas shell with one floating bottom
  toolbar. Elements, column controls, hidden columns, list settings, and screen
  settings live in attached toolbar panels instead of permanent left/right rails
  or mobile sheets.
- `Editor View` uses a neutral authoring canvas shell through a screen adapter:
  insert, layers, content, binding, style, and screen settings are floating
  panels attached to the floating toolbar, not permanent Editor View rails. The
  command palette is a focus-trapped dialog and advanced style controls open in
  modals while simple controls stay inline.
- Custom Screens own this bounded section/block contract directly. They do not
  create or select configurable product widgets; those remain exclusive to the
  Admin Dashboard. Fresh V4 writes validate every fixed block kind through a
  discriminated reject-unknown schema, while stored legacy rows use only the
  deterministic non-destructive read adapters required for compatibility.
- Button authoring supports only the implemented Link action. Static and bound
  links pass through the sole Screen URL owner,
  `sanitizeScreenAuthoringUrl`: it rejects original-string ASCII controls
  (`U+0000..U+001F` and `U+007F`) and backslashes before trim/delegation, so
  protocol-relative, control-confused, executable, and unsupported forms fail closed
  at write and render boundaries. `normalizeScreenImageSrc` remains only a delegating
  compatibility alias, not a second policy owner. Unsupported stored
  `publish`/`custom` actions read as disabled and are never promoted into a new action
  API. Tabs keep their item IDs and slot IDs in lockstep and render as functional,
  keyboard-operable, root-scoped ARIA tabs.
- Record detail mode reuses the same neutral canvas shell but exposes only
  record-editing controls. It does not show builder add, move, duplicate,
  delete, library, settings controls, or a detached Value panel. Writable bound
  record-header/field text edits inline on the canvas; read-only or unbound
  values expose no editable affordance.
- Records workspace row editing reuses existing internal entry update routes
  and cache invalidation. No new public write endpoint is introduced.
- Per-record presentation overrides for Custom Screen records are stored outside
  `content_entries.data` in the dedicated
  `custom_screen_entry_presentation_overrides` table. The foundation API
  supports bounded presentation targets only: media asset id, text size, text
  emphasis, and text/style tone. Content field values still persist through the
  existing entry draft path; presentation overrides load, render, save, reload,
  and clear through the internal Custom Screen override API. The record detail
  presentation panel is selection-scoped, hidden for unsaved records, and keeps
  presentation dirty/remote-update state separate from entry content dirty
  state.
- Direct-image presentation overrides and bound media-field values store media
  UUIDs, never resolved URLs. An unbound image block may separately persist a
  sanitized static `data.src` URL. For UUID-backed values, the entry host
  resolves only the winning asset through the existing media read and the
  renderer revalidates the resolved URL at the DOM boundary; missing or unsafe
  winners show a placeholder without falling through to a lower-priority
  source.
- Builder document/binding drafts and record content/presentation drafts use the
  shared navigation and `beforeunload` guards. Cache events and background
  revalidation may update clean state but cannot overwrite a dirty draft;
  failures remain visible and retryable and stale route/request completions are
  ignored.
- The Screen authoring panel is an accessible labelled region. Narrow canvases
  retain their normal gutters instead of reserving desktop panel width. The
  entry-only `showFieldMetadata` preference is stored under the existing
  authenticated per-user settings key `customScreens.entry.preferences`; it is
  never stored in a global browser key or shared across users.
- TASK-473 ships storage, service validation, routes, stale target cleanup, and
  record detail panel/cache/render wiring. Text and media overrides merge at
  render time only and never mutate `content_entries.data`, entry drafts, screen
  definitions, or field bindings.

### Posts admin authoring contract

- Posts list wspiera visible-scope bulk actions (`Publish`, `Move to Draft`,
  `Delete`) i resource-specific search copy.
- Posts editor zachowuje writing-first shell, ale daje jawny feedback dla
  publish/update i autosave failures. Unexpected autosave failures map to
  bounded browser-facing copy (`post_autosave_failed`) and do not expose raw
  driver messages.
- Publish/update feedback przechodzi przez shared admin action-toast adapter;
  shell nie wywoluje Sonnera bezposrednio i nie ukrywa odrzuconych mutacji.
- Post inspector:
  - wybiera kategorie z taxonomy overview,
  - pokazuje retryable friendly fallback, gdy taxonomy overview/settings read
    nie moze sie zaladowac,
  - wybiera featured image przez shared media picker (`image/*` only),
  - pokazuje SEO completion summary i slug route context bez zmiany stored slug
    semantics.
- Revisions drawer ma accessible description i pokazuje bounded fallback
  metadata dla rewizji bez extractable preview text.
- Create New Post drawer ma realny `SheetDescription` powiazany przez
  `aria-describedby`.
- Block inserter search jest category-scoped; copy i aria-label odzwierciedlaja
  aktywna kategorie zamiast sugerowac globalne wyniki.
- Media block capability dla posts jest release-atomic: `Image`, `Embed`,
  `Video`, `Gallery`, `Audio`, i `File` sa widoczne tylko wtedy, gdy block type,
  defaults, normalizer, editor canvas/inspector, media picker, runtime mapper,
  runtime renderer i testy sa obecne w tym samym zakresie.

---

## Preview (draft)

- Podglad draft bez publikacji.
- Tokenized preview URL z TTL.
- Szczegoly: `PREVIEW_SPEC.md`.

---

## Search / indexing

- Wyszukiwanie w adminie (pages, entries, media).
- Wykorzystanie indeksow Postgres.
- Szczegoly: `SEARCH_SPEC.md`.

---

## Audit logs

- Minimalne logowanie kluczowych zdarzen admina.
- Szczegoly: `AUDIT_SPEC.md`.

---

## Design tokens

- Wspolny system tokenow dla core i pluginow.
- Szczegoly: `DESIGN_TOKENS.md`.

---

## Themes

- Theme definiuje szablony i wyglad.
- Theme profile pozwala zapisac rozne warianty wygladu (front 1, front 2).
- Aktywny jest jeden profil na raz.
- Szczegoly: `THEMES_SPEC.md`.

---

## Settings

Typy:
- global (site-wide)
- dashboard widget layout/preferences (per admin user; Dashboard-only)
- plugin (per plugin)

Storage:
- `settings` (global)
- `plugin_settings` (plugin)
- `dashboard_layouts` (Dashboard widget instances/preferences)
- Page/Form/Menu/Post/Screen section/block settings in the owning domain document,
  never a generic per-widget settings contract

Global settings (v1):
- `site.name`, `site.locale`, `site.timezone`
- `site.publicBaseUrl`
- `auth.sessionTtlDays`, `auth.resetTtlMinutes`
- `setup.completed`
- `design.tokens` (override tokenow UI)

### First-run setup lifecycle

Dwufazowy onboarding (TASK-482): swiezy operator przechodzi od pustej DB do
skonfigurowanej, zaseedowanej contentem strony bez dotykania env ani seed
scriptu.

**Faza 1 — pre-login installer (tylko swieza instalacja).** Gdy DB nie ma zadnego
usera (`isFirstRun`), Admin App renderuje publiczny installer PRZED redirectem
unauthenticated → `/login`. Installer tworzy pierwszego admina przez
`POST /auth/install/admin`, po czym przekazuje do `/login`. Self-disable'uje sie
trwale, gdy jakikolwiek user istnieje. Szczegoly + model bezpieczenstwa: patrz
`AUTH_SPEC.md` → „First-run installer” i `SECURITY_SPEC.md` → „Pre-auth first-run
installer”.

**Faza 2 — post-login wizard (gdy `setup.completed=false`).** Po zalogowaniu
Admin App renderuje multi-track Setup Wizard (step registry, per-step walidacja,
resume/dirty, toggle Basic/Advanced):

- **Basic track:** branding/identity/locale/timezone + publiczny/admin URL
  (`site.name`, `site.locale`, `site.timezone`, `site.publicBaseUrl`), opcjonalny
  starter content przez Solution Kit installer.
- **Advanced track (opcjonalny):** email / storage / security / assistant przez
  istniejace `/settings/*` surface'y; sesyjny TTL rozstrzygany jednym resolverem
  (`auth.sessionTtlDays`, patrz `AUTH_SPEC.md`).

- Basic submit wykonuje bulk `PATCH /settings`; starter content idzie przez
  `POST /setup/starter-content/preview` + `.../apply` (patrz `CMS_API.md`).
- Finalize ustawia `setup.completed=true` (install-lock); po sukcesie wizard
  znika i nie jest ponownie pokazywany (stan z DB).

---

## Plugin integration

- Plugin rejestruje bloki, admin pages, routes.
- Core przechowuje stan pluginow w `plugins` i `plugin_settings`.
- Admin UI zawiera sklep pluginow + zarzadzanie zainstalowanymi pluginami
  (update policy domyslnie `auto-security`).

---

## Users (admin vs public)

- V1 dotyczy uzytkownikow panelu admina (admin/editor/viewer).
- Publiczni uzytkownicy (np. portal klienta) beda realizowani przez pluginy
  lub jako modul v1.1+.

---

## Admin UX

Role:
- admin (full)
- editor (content)
- viewer (read-only)

Widoki:
- Pages list + editor
- Media library
- Menus
- Settings
- Plugins store

Page, Form, Menu, Post, Screen i template UI korzystaja z sekcji/blokow oraz
kontrolek nalezacych do danej domeny. Historyczne komponenty
Wizard/Visual/Advanced pod `core/widgets/**` sa maintenance/read compatibility i
nie moga byc rozszerzane jako produktowy authoring. Konfigurowalne widgety
Dashboardu maja osobny kontrakt w `DASHBOARD_WIDGETS_SPEC.md`.

## Dashboard runtime data

- Dashboard admina korzysta z jednego modelu agregowanego zwracanego przez backend.
- Kontrakt payload obejmuje:
  - `totals` (pages, entries, media, users),
  - `recentEdits` (merge page/entry/media, sort malejaco po czasie),
  - `storage` (used bytes + optional limit/percent),
  - `security` (status + checki: csrf/rateLimit/headers/sessionPolicy).
- Zrodlem danych sa tabele CMS i runtime `security.settings`.
- W ramach MVP brak metryk ruchu publicznego (np. visitors/page views z zewnetrznej analityki).
- Admin UI dashboard renderuje loading/error/retry states i mapuje sekcje KPI/Recent Edits/Security z jednego payloadu API.
Admin UI bazuje na shadcn/ui + Tailwind v4.

---

## API strategy

- REST admin API (`/admin/api`).
- Internal service layer w core (moduly serwisowe, bez publicznego endpointu).
- Admin UI komunikuje sie po HTTPS w ramach tej samej domeny
  (session cookie + CSRF).
