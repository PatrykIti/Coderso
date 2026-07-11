# Widgets Spec (v1)

> **Current product boundary:** configurable widgets are an Admin Dashboard-only
> surface owned by `_docs/DASHBOARD_WIDGETS_SPEC.md`. Page, menu, form, and custom-screen
> editors author sections and blocks. The `core/widgets/**` namespace and the historical
> catalog below document compatibility renderers retained for existing content; they do
> not authorize new non-dashboard widget types, Wizard/Visual/Advanced editors, presets,
> registry entries, or module-pack expansion. New work on those editors belongs to their
> section/block contracts.

The remainder of this document is the historical core-renderer configuration contract
kept for maintenance and stored-content compatibility. Plugin/addon guidance applies only
where a currently supported plugin contract explicitly references it.

## Cele

- Latwy start dla nietechnicznych uzytkownikow.
- Spolny UX konfiguracji dla wszystkich widgetow.
- Wersja v1 core pozwala zbudowac pelnoprawna strone.

---

## Design Philosophy (Idioto-odpornosc + Power User)

System widgetow zostal zaprojektowany, aby rozwiazac odwieczny konflikt miedzy "latwym" a "elastycznym".

1. **Wizard-First**: Uzytkownik nietechniczny NIE moze zepsuc layoutu. Odpowiada tylko na proste pytania (np. "Gdzie ma byc zdjecie?").
2. **Visual Feedback**: Decyzje podejmowane sa na podstawie tego co widac, a nie abstrakcyjnych nazw ustawien.
3. **Progressive Disclosure**: Opcje zaawansowane (marginesy, paddingi) sa ukryte, dopoki uzytkownik swiadomie ich nie zazada. To chroni UI przed "rozjechaniem" przez przypadkowe klikniecia.
4. **Consistency**: Wymuszamy ten sam model konfiguracji na pluginach, aby uzytkownik nie musial uczyc sie obslugi kazdego widgetu od nowa.

---

## Historical core renderer catalog (v1)

Wymagane:
- Section (layout wrapper z repeatable regions)
- Template section (reusable widget templates as sections)
- Grid/Columns (layout primitive z responsywnym podzialem kolumn)
- Stack (flow layout primitive dla sekwencyjnych grup widgetow)
- Split Layout (dwu-kolumnowy layout z kontrola proporcji i collapse mobile)
- Spacer (kontrolowany pionowy rytm i odstepy miedzy sekcjami)
- Divider (wizualny separator sekcji z opcjonalnym podpisem)
- Hero section
- Timeline (proces, milestones, i datowane wydarzenia na osi)
- Compare timeline (porownanie dwoch procesow na jednej osi)
- Newsletter signup
- Kontakt (formularz + dane kontaktowe)
- FAQ Accordion (pytania i odpowiedzi)
- CTA Banner (kompaktowy pasek konwersyjny)
- Logo Cloud (sekcja wiarygodnosci z logotypami)
- Gallery Mosaic (wizualna sekcja mediow)
- Stats KPI (sekcja metryk i proof points)
- Team (profile zespolu z rolami i social links)
- Rich Text Section (dluzszy blok tresci z bezpiecznym HTML)
- Content List (dynamiczna lista wpisow z Content Types)
- Entry Teaser (dynamiczny teaser pojedynczego wpisu)
- Menu/Nawigacja
- Stopka (linki, dane, social)

---

## Historical compatibility configuration model

Pierwotny renderer contract wymagal trzech trybow konfiguracji. Te tryby nie
sa wymaganiem dla nowych sekcji/blokow ani dla Admin Dashboard widgets:

1) Wizard (kreator)
- Pytania prowadza uzytkownika do wyboru wariantu (auto).
- Minimalna liczba pol.
- Na koncu zapis do wspolnego modelu danych widgetu.

2) Visual (warianty + podglad)
- Uzytkownik wybiera wariant na podstawie podgladu.
- To jest glowny tryb codziennej edycji:
  - content i CTA przez przyjazne pola oraz pickery stron/linkow
  - media przez biblioteke mediow i czytelne stany zastap/wyczysc
  - typography
  - colors/borders/background
- Widget moze przejac kontrole nad selektorem wariantu (bez generycznego duplikatu)
  przez `editorCapabilities.visualOwnsVariantSelection = true`.
- Core widgets `hero`, `navigation`, `footer`, `timeline`, `section`, `tabs`,
  `accordion`, `toggle-block`, `grid-columns`, `split-layout`, `stack`,
  `spacer`, `divider`, `template-section`, `feature-grid`, `testimonials`,
  `pricing-plans`, `faq-accordion`, `cta-banner`, `logo-cloud`,
  `gallery-mosaic`, `stats-kpi`, `team`, `rich-text-section`, `compare-timeline`,
  `content-list`, `posts-feed`, `entry-teaser`, `product-gallery`,
  `product-compare`, `product-table`, `listing-filters`, `search-box`,
  `newsletter`, `booking-calendar`, `appointment-form`, `form-embed`, and
  `contact` already render sectioned Visual IA instead of the generic variant
  list.

3) Advanced
- Tryb ekspercki/techniczny:
  - diagnostyka, znormalizowany payload i techniczne podsumowania
  - bez widocznego proszenia nietechnicznego uzytkownika o CSS, klasy, tokeny
    albo inne webdeveloperskie wartosci tekstowe
  - bez duplikowania podstawowych pol content/style/layout z Visual.
- Tryb zaawansowany dostepny zawsze po wstepnej konfiguracji.

Zasady:
- Kazdy tryb mapuje do tego samego modelu danych.
- Uzytkownik moze w kazdej chwili przelaczyc sie na Advanced.
- Przejscie do Advanced nie resetuje danych.
- Prawy inspector utrzymuje kompaktowy naglowek zaznaczonego widgetu; stale
  helper copy nad zakladkami jest zastapione ikonami `Info`, a duze karty
  informacyjne sa zarezerwowane dla blokujacych ostrzezen.
- Tryby `Visual` i `Advanced` preferuja jedna opcje na linie. Responsywne
  wielokolumnowe grupy kontroli sa redukowane do jednego stosu, aby etykiety i
  inputy nie nachodzily na siebie w prawym inspectorze.
- Tryby edytora emituja stabilne metadane automatyzacyjne:
  `data-widget-editor`, `data-widget-editor-mode`,
  `data-widget-editor-section`, `data-widget-editor-section-role`,
  `data-widget-control`, `data-widget-control-path`,
  `data-widget-control-ownership`, i `data-widget-control-readonly`.
- `data-widget-control-path` oznacza sciezke persisted danych tylko wtedy, gdy
  row realnie ja edytuje albo pokazuje jako read-only summary. Playwright i
  Vitest licza writable ownership po `data-widget-control-path` z
  `data-widget-control-readonly != "true"`.
- Widgety z `slots` lub nested content przenosza kontrole struktury do nazwanej
  sekcji `Visual` albo `Advanced`; nie wracamy do top-of-panel slot banners nad
  zakladkami.
- Deklaratywny `editorContract.version = 2` opisuje wspolny kontrakt
  `wizard` / `visual` / `advanced`: lista sekcji, role IA, sciezki zapisu,
  sciezki read-only i tymczasowe dopuszczenia duplikatow. Kontrakt nie
  zastepuje komponentow `editor.*`, tylko jest testowalnym ownerem UX i danych.
  W trakcie TASK-336 brak kontraktu jest dopuszczony w trybie migracyjnym, ale
  walidacja strict musi byc wlaczona przed zamknieciem programu.
- Powtarzalne kolekcje moga uzywac wildcard segmentu w kontrakcie, np.
  `items.*.label`, podczas gdy DOM konkretnego kontrolera emituje indeksowana
  sciezke `items.0.label`. Wildcard jest dozwolony tylko jako caly segment
  sciezki.
- `Wizard` nie powinien byc wlascicielem sciezek stylu/layoutu; `Visual`
  wlada contentem i wygladem, a `Advanced` ogranicza sie do technicznych,
  layoutowych i diagnostycznych ustawien. Sekcje diagnostyczne w `Advanced` sa
  read-only.
- Shared block-level `layout.*` i `visibility.devices.*` sa codziennymi
  kontrolami w `Visual`, z wlasnym `data-widget-control-path`. `Advanced`
  pokazuje dla nich tylko read-only summaries, zeby nie tworzyc drugiego
  edytora layout/visibility pod diagnostyka.
- `Wizard` jest one-time setup surface. Nowy lub jawnie ponownie otwarty widget
  startuje w `Wizard`; po ukonczeniu setupu shell pokazuje read-only summary
  `Setup complete`, codzienne zakladki `Visual` i `Advanced`, oraz akcje
  `Run setup again`. `Wizard` nie jest stalym peer tabem po completion, a
  ponowne uruchomienie setupu nie resetuje danych widgetu.
- Persisted legacy blocks without `editor` state are normalized as setup
  complete and open in daily `Visual`; only newly inserted widgets or explicit
  `wizardCompleted=false` blocks enter `Wizard`.
- Layout widgets (`section`, `grid-columns`, `split-layout`, `stack`, `spacer`,
  `divider`) stosuja po TASK-336-14 zaostrzona polityke: `Wizard` jest
  setup-only, `Visual` wlada codziennymi layout/style controls przez presety,
  swatche, selecty i slidery, a `Advanced` pokazuje read-only summaries oraz
  bezpieczne support summaries. Po TASK-336-19 `split-layout` nie pokazuje juz
  widocznych developer-facing saved-data snapshots ani runtime implementation
  labels w `Advanced`. Dopuszczalne legacy compatibility hooks musza byc
  `hidden`, `aria-hidden`, bez tab focusu i nie moga byc widocznym kontraktem
  UX.
- `tabs` po TASK-336-19 stosuje ten sam beginner-safe kontrakt: Visual kolory
  sa swatch-only bez widocznych raw CSS/token text inputs, Advanced pokazuje
  tylko human summaries zamiast JSON/ID/suffix payloadow, a legacy
  `triggerOverflow: "scroll"` normalizuje sie do zawijania, bo Tabs nie sa
  zatwierdzonym publicznym regionem poziomego scrolla.
- `accordion` po TASK-336-19 stosuje ten sam kontrakt: Visual nie nadpisuje
  Wizard-owned `defaultOpenIds` przy zmianie trybu otwierania, kolory sa
  swatch-only bez raw token inputow, a Advanced pokazuje behavior/item/display
  summaries zamiast JSON payloadow i technicznych DOM id suffixow.
- `content-list` po TASK-336-19 ma page-first `View all` destination picker,
  truthful helper-search metadata, swatch-only color controls, Visual-owned
  daily filters/presentation/pagination, oraz Advanced-only human summaries
  bez raw JSON, runtime payloadow, internal IDs lub raw path guidance.
- `search-box` po TASK-336-19 nie pokazuje juz endpointow, query-param names,
  raw CSS/token inputs ani JSON runtime payloadow zwyklemu autorowi. Wizard
  wybiera source i page-first results destination, Visual zarzadza copy,
  interaction i swatches, a Advanced pokazuje human support diagnostics bez
  raw provider/query values.
- `listing-filters` po TASK-336-19 usuwa raw facet ID, field path, option
  value, sort value, raw CSS/token inputs i JSON runtime payload z normalnego
  authoringu. Wizard wybiera listing query, facet kind, query field i sort
  direction przez pickery; option/data match values oraz hierarchy keys sa
  support-owned. Visual edytuje labels/layout/presentation/swatches, a Advanced
  pokazuje human runtime/source summaries.
- `product-table` po TASK-336-19 ma wykrywalne `data-widget-control-path`
  metadata na prawdziwych kontrolkach Wizard/Visual, Wizard preview jest
  osobna sekcja kontraktu, a Advanced pokazuje human runtime/source summaries
  zamiast raw query JSON lub payload dumpow.
- `form-embed` po TASK-336-19 zachowuje Wizard-only form selection, ale Visual
  pokazuje form preview jako summary, kolory sa swatch-only bez raw CSS/token
  inputow, a Advanced zastapil normalized payload snapshot human runtime,
  security, authoring i contract summaries bez raw endpointow/form ID/API
  scope copy.
- `booking-calendar` i `appointment-form` po TASK-336-19 nie prosza juz autora
  o wpisywanie flow key, endpointow, raw URL-i ani BCP-47 locale tekstem.
  Wizard wybiera/paruje booking flow pickerem, Visual uzywa presetow jezyka,
  swatch-only kolorow i page-first destination pickerow, a Advanced pokazuje
  read-only route/security/runtime summaries. Domyslne style nie seeduja juz
  CSS-tokenow do danych; runtime korzysta z theme fallbackow do czasu wyboru
  konkretnych swatchy.
- Remaining page-builder widgets covered by TASK-336-18 (`toggle-block`,
  `feature-grid`, `testimonials`, `pricing-plans`, `faq-accordion`,
  `cta-banner`, `logo-cloud`, `gallery-mosaic`, `rich-text-section`,
  `entry-teaser`, `product-gallery`, `product-compare`, `timeline`,
  `compare-timeline`, `newsletter`, `contact`, `navigation`, `footer`) now
  export v2 contracts. The contract target is beginner-safe: Wizard is
  setup-only, Visual owns daily content/appearance/behavior controls, and
  Advanced diagnostics are read-only. Known UI drift where legacy editors still
  expose raw CSS/JSON/HTML/IDs/technical URLs or writable Advanced controls is
  routed to TASK-336-19 rather than hidden behind broad allowlists.
- Normal media/image authoring in Wizard/Visual uses asset pickers instead of
  raw image URL text inputs. Legacy external image URLs may remain in persisted
  data for backward compatibility, but the editor presents them as read-only
  replace/clear state and asks the user to pick a Media Library asset for
  future changes.
- Normal link destination authoring in Wizard/Visual is page-first. Navigation,
  CTA Banner, Logo Cloud, Feature Grid, and Testimonials use the shared
  destination picker to select published CMS pages while preserving existing
  `href` strings. Legacy custom, hash, or external destinations remain
  backward-compatible read-only replace/clear state in beginner modes instead
  of editable raw URL/path inputs.
- Contact map/social authoring follows the same beginner-safe rule. Visual asks
  for a public map location/address or a known social profile name/handle and
  builds the stored string destination itself; legacy custom sources remain
  replace/clear state, and Advanced reports map metadata read-only.
- Advanced cleanup slices convert second-editor controls into diagnostics.
  FAQ Accordion Advanced is now read-only human runtime/style/saved-data
  summaries with no raw payload snapshot or repair mutation. Newsletter Wizard
  is now one-time/read-only after setup, Visual owns daily copy/Form/style
  authoring with swatch-only colors, and Advanced reports human signup
  readiness/authoring-boundary summaries with no payload normalization action.
  Navigation layout/sticky/collapse controls live in Visual and
  Advanced reports summaries only. CTA Banner style-token controls and Stats
  KPI runtime style summaries are read-only diagnostics in Advanced, while
  Visual uses swatch-only color controls plus clear actions where values are
  clearable.
- Feature Grid follows the same TASK-336-19 contract: Wizard stays setup-only,
  Visual owns card copy/media/actions/layout and swatch-only colors with
  explicit control-path metadata, and Advanced shows read-only layout/content/
  presentation summaries without raw JSON payloads or normalization actions.
- Logo Cloud follows the same TASK-336-19 contract: Wizard is now read-only
  overview for current layout/count; Visual owns layout changes, logo images,
  accessible descriptions, destinations, CTA, motion, tile presentation, and
  swatch-only colors; Advanced shows read-only human diagnostics without raw
  JSON payloads, CSS-token text inputs, or normalize/reset mutations.
- Newsletter Visual follows the beginner-safe integration rule: Coderso Forms
  are chosen from a Form picker, field mapping is selected from Form fields or
  shown as safe defaults, and older external signup-service metadata is
  summarized rather than edited as raw technical text. It also uses color
  swatches plus clear/saved-custom summaries instead of raw CSS/token text
  inputs.
- Historical Commerce renderer controls followed the same picker-first rule.
  Product Gallery and Product Compare used collection/product/page pickers in
  the retired Wizard/Visual flows; raw product IDs, fallback collection IDs, route-prefix
  strings, minor-unit price wording, raw color token inputs, raw media-ID
  hints, and raw query JSON are not beginner-mode inputs. Existing saved
  technical values remain backward-compatible and are summarized in Advanced
  diagnostics.
- Publiczny runtime nie moze ukrywac overflow globalnym clippingiem ani
  dowolnym `data-overflow-intentional`. Celowy poziomy scroll jest dozwolony
  tylko dla zatwierdzonych regionow produktowych z widoczna wskazowka,
  focusowalnym kontenerem i allowlista w Playwright smoke. Obecnie zatwierdzone
  sa: `testimonials` slider, `pricing-plans` comparison rows,
  `product-compare` table i `product-table` table. Pozostale overflow jest
  traktowane jako regresja layoutu.

### Layout widget Advanced token policy

| Widget | Visual owns | Advanced shows |
|---|---|---|
| `section` | variant, heading, semantics/anchor, width, spacing, surface, borders, background media | read-only layout/surface/semantics summaries and normalized payload |
| `grid-columns` | variant, column structure/labels/spans, gaps, cardized surface, per-column behavior | read-only span totals, slot drift, cardized state, override summary, normalized payload |
| `split-layout` | starter layout, pane ratio, phone layout, spacing, alignment, slot guidance | read-only human split/phone/spacing/alignment diagnostics and saved layout summary without developer-facing implementation labels |
| `stack` | guidance-only Wizard slot framing; preset choice plus responsive direction, spacing, alignment, distribution, and wrapping in Visual | read-only runtime stack and support summaries without raw payload snapshots |
| `spacer` | height presets and editor guide | read-only runtime spacing and support summaries without raw payload snapshots |
| `divider` | variant/label, line, width presets, color swatch, spacing presets | read-only runtime divider and support summaries without raw payload snapshots |

## Detail Template Content Bindings

Detail templates moga mapowac wybrane sciezki propsow widgetu do danych wpisu
przez `DetailPageDocument.bindings`. Prawy inspector detail template ma zakladke
`Data`, ktora zapisuje bindingi dla zaznaczonego bloku.

Detail template tworzy sie z workspace kolekcji:
`Advanced -> Engine -> <content type> -> Collection -> Canonical resources`.
Z edytora content type (`/admin/advanced/engine/:id`) prowadzi tam akcja
`Collection workspace`.
Karta `Detail page` pokazuje akcje `Create detail template`, gdy kolekcja nie
ma jeszcze route-linked detail template. Akcja tworzy draft `DetailPageDocument`,
podpina go do `site.contentRoutes.detailPageId`, odswieza workspace i otwiera
ten sam builder-style edytor co route-linked detail template. Usuniecie z tej
karty najpierw odpina `detailPageId` z route, a potem usuwa dokument.

Zasady:

- literalne `block.data` pozostaje defaultem i fallbackiem widocznym w edytorze;
- runtime publicznego detail page nadpisuje tylko te propsy, ktore maja binding
  w `document.bindings`;
- zrodlem moga byc pola content type, bezpieczne entry meta (`title`, `slug`,
  `publishedAt`, `author`) albo istniejace computed resolvery detail-page;
- bindingi sa obslugiwane przez istniejacy `resolveDetailPageBlocks`, bez
  osobnej warstwy runtime dla widgetow;
- zwykle Pages nie dostaja automatycznego content-type bindingu w tym kontrakcie.

---

## Motion And Interaction Effects (TASK-521)

Two widget-facing motion options join the Pages v2 effects family (see
`_docs/PAGE_MODEL.md` § Motion And Interaction Effects for the full contract —
present-only, reject-unknown, `prefers-reduced-motion`-safe, no npm dependency):

- **Hero mouse-tilt** — `hero.style.tilt` (`"none" | "subtle" | "strong"`,
  `heroTilts`) adds a 3D parallax-on-hover to the hero card/media via CSS
  `perspective` + a tiny dependency-free `mousemove` runtime. Present-only and
  fail-soft (`resolveHeroTilt` falls back to `"none"`, never throws). Disabled for
  reduced-motion and coarse/touch pointers. `"none"`/unset is byte-identical to
  pre-521 hero output.
- **Animated-icon block** — the Page v2 `icon` block (previously a non-functional
  placeholder) is now a real, insertable, runtime-rendered block built from a
  curated **inline-SVG + CSS-keyframes** set (`core/services/pages/animatedIconGlyphs.tsx`)
  — no Lottie, no npm dependency, CSP-safe. Props: `name` (allowlist glyph,
  `animatedIconNames`), `animation` (`none`/`spin`/`pulse`/`bounce`/`draw`), `size`
  (16..160 px), `color` (`readSafeColor`, alpha OK), `speed` (400..4000 ms via
  `--anim-speed`). This is a PAGE block implemented through a renderer `case`, NOT a
  new composite widget — `core/widgets/registry.ts` / `modulePackMatrix.ts` are
  unchanged and the widget-pack matrix gains no row.

## Composable Hero Toolkit & Premium Effects (TASK-522)

TASK-522 delivers a composable TOOLKIT — not a one-off hero widget — to build a rich
premium hero (a layered glass card with floating badges, drifting orbs, a pulsing
ring, a tilt-on-pointer card + a drawn line-SVG, plus hover glow/lift and a ticker)
inside Page Editor v2 (see `_docs/PAGE_MODEL.md` § Composable Hero Toolkit & Premium
Effects for the full contract — present-only, reject-unknown,
`prefers-reduced-motion`-safe, no npm dependency, no migration):

- **Custom-SVG block** (`customSvg`, the ONE new `pageBlockType`) — paste an
  arbitrary inline SVG that is **sanitized by an allowlist sanitizer**
  (`core/services/pages/svgSanitizer.ts`) at write AND render, with an optional stroke
  **draw-in** animation. This is a PAGE block implemented through a renderer `case`,
  NOT a composite widget — `core/widgets/registry.ts` / `modulePackMatrix.ts` are
  unchanged and the widget-pack matrix (`_docs/WIDGET_PACK_MATRIX.md`) gains no row.
- **Floating-drift decoration** (`block.style.decoration`) — turns any block into a
  layered decoration (`float`/`drift`/`pulse`/`radiate`/`orbit`).
- **Tilt-on-any-block** (`block.style.tilt` + `tiltGlare`) — generalizes 521's hero
  tilt to any card/block via a `[data-block-tilt]` runtime binding.
- **Layered canvas** (`section.style.composition` / layout-block
  `style.composition:"layered"` + per-child `style.layer`) — absolute, z-indexed,
  per-device children so a hero composes from SVG + badges + cards + orbs.
- **Glass/glow surface presets** (`style.surfacePreset`) + **hover-effect presets**
  (`block.style.hoverEffect`) — the premium look + interactivity in one click.
- **Ticker / marquee** (`group` block `style.marquee`) — a horizontal auto-scrolling
  strip with an optional seamless loop.

All are STYLE fields (plus one block type); everything is dependency-free (hand-rolled
SVG sanitizer + inline CSS keyframes + 521's runtime) and composes the reference
wow-site hero without a new dependency or migration.

## Declarative Interactivity — Tabs/Switcher, Filterable Gallery, Polish (TASK-534)

TASK-534 (Bundle D; absorbs TASK-527) adds a cohesive family of DECLARATIVE
interactivity closing `_TMP-cms-ograniczenia.md` §1 ("Brak interaktywności JS"). See
`_docs/PAGE_MODEL.md` § Declarative Interactivity for the full contract — everything is
present-only, reject-unknown, `prefers-reduced-motion` + keyboard safe, rides the ONE
existing `pageEffectsRuntime.ts` `<script>`, and needs no npm dependency, no migration,
no `PAGE_DOCUMENT_SCHEMA_VERSION` bump, no route/RBAC:

- **Segmented `switcher` / tabs block** (the ONE new `pageBlockType`; absorbs TASK-527)
  — N labelled panels in six `panel:1..panel:6` slots rendered as a real
  `role="tablist"`/`role="tab"`/`role="tabpanel"` set (roving tabindex, arrow/Home/End
  keyboard, `hidden` inactive panels for no-JS). Tab labels are escaped TEXT nodes. This
  is a PAGE block implemented through a renderer `case`, NOT a composite widget —
  `core/widgets/registry.ts` / `modulePackMatrix.ts` are unchanged and the widget-pack
  matrix (`_docs/WIDGET_PACK_MATRIX.md`) gains no row.
- **Filterable gallery** — present-only `filterable`/`filterCategories` on the EXISTING
  `gallery` block plus an optional per-item single-token `category`; a `role="tablist"`
  chip bar toggles item visibility via a token-split runtime match. The `gallery` block
  is now editor-insertable (its `gallery-editor-controls-pending` reason cleared).
- **`scrollHint` block** (the second new `pageBlockType`) — a CSS-keyframe-only
  `aria-hidden` dot/chevron with an optional `sr-only` label; no runtime.
- **Noise/grain overlay** (`PageEffectsV2.noiseOverlay` page + `PageSectionStyleV2.noiseOverlay`
  section) — a static self-generated SVG-turbulence layer (no asset, no author color).
- **Magnetic button** (`block.style.magnetic`) — a pointer-attraction runtime clause
  (transforms only, rAF, clamped ±14px, `pointer:fine` + reduced-motion gated).

Toggle interactions (switcher, filter) sit BEFORE the runtime reduced-motion
early-return so they work for reduce users; the magnetic MOTION clause sits after it.
Only runtime-bearing surfaces (switcher / filterable gallery / magnetic) widen the
single-`<script>` emit predicate; scrollHint + noise are CSS/static.

## Dokumentacja widgetow

Szczegoly dla kazdego widgetu znajduja sie w `_docs/_WIDGETS/`:

- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/_WIDGETS/TEAM.md`
- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/_WIDGETS/PRODUCT_TABLE.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/_WIDGETS/SEARCH_BOX.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`
- `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`
- `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/_WIDGETS/TEMPLATE_SECTION.md`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/TABS.md`
- `_docs/_WIDGETS/ACCORDION.md`
- `_docs/_WIDGETS/TOGGLE_BLOCK.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`

---

## Visual Off Tokens

TASK-242 adds a consistent `none` token for off-capable visual presets. Editors
show this value as `None`, schemas accept it only for approved visual fields, and
renderers map it through fixed class/style maps instead of accepting arbitrary
class names.

Use `none` only for visual styling controls that can be disabled:

| Token family | Widgets and fields |
|---|---|
| Layout gap/spacing/padding | `stack.gap.*`, `splitLayout.gap`, `gridColumns.layout.gapX/gapY`, `gridColumns.style.columnPadding`, `screenTwoColumn.gap`, `statsKpi.style.spacing`, `featureGrid.style.gap`, `contentList.style.gap`, `postsFeed.style.gap`, `galleryMosaic.style.gap`, `pricingPlans.style.spacing`, `faqAccordion.style.spacing`, `team.style.gap`, `testimonials.style.spacing`, `contact.style.spacing`, `newsletter.style.spacing`, `ctaBanner.style.padding`, `logoCloud.style.gap`, `richTextSection.style.spacing`, `timeline.spacing.gap/padding/sectionSpacing`, `compareTimeline.layout.trackSpacing` |
| Vertical utility rhythm | `divider.marginTop/marginBottom`, `spacer.height.desktop/tablet/mobile` |
| Radius | `hero.style.borderRadius/mediaRadius`, `entryTeaser.style.radius`, plus existing radius fields on `section`, `ctaBanner`, `featureGrid`, `galleryMosaic`, `pricingPlans`, `team`, and `gridColumns` |
| Width and size | `hero.layout.maxWidth/contentWidth`, `navigation.layout.maxWidth`, `footer.layout.maxWidth`, `formEmbed.layout.width`, `timeline.spacing.maxWidth`, `logoCloud.style.logoHeight`, `formEmbed.style.inputSize`, `hero.style.primaryButtonSize/secondaryButtonSize` |
| Typography | `hero.style.headlineSize/subheadSize/bodySize`, `navigation.style.fontSize/fontWeight`, `footer.style.fontSize`, `richTextSection.style.fontScale/lineHeight`, `timeline.typography.titleSize/titleWeight/descriptionSize`, `compareTimeline.style.trackLabelSize/stepLabelSize/segmentLabelSize` |

Legacy numeric zero values remain backward compatible where they already existed
and continue to render as zero spacing. Do not add `none` to structural choices
such as variants, ratios, columns, spans, alignments, sources, statuses, or media
type modes that already use `none` for content semantics.

## Visual Clear Controls

TASK-244 adds `Clear` actions for configured visual surface fields such as
background colors, gradients, overlays, card surfaces, table shells, CTA button
backgrounds, and framed custom-screen surfaces. `Clear` is an editor action, not
a saved token. It removes the owning field from widget data so the renderer does
not emit a forced inline style or fallback shell solely because the field was
cleared.

`Clear` is separate from TASK-242 `None` token semantics:

| Action/value | Saved payload | Runtime contract |
|---|---|---|
| `Clear` on a surface field | property omitted from the owning object | no forced background, gradient, overlay, card, table, or panel style for that field |
| `none` visual token | literal `none` value on approved token fields | fixed zero/empty output for spacing, size, radius, typography, or other approved token maps |
| deliberate color value such as `transparent` | literal string chosen by the user | render the configured color because it is user-authored data, not a clear sentinel |

Widget editors must remove keys for clear actions and must not serialize
`transparent` or an empty string as an off-state sentinel. Renderers should
normalize clearable surface values through the shared clearable-style helpers and
compact omitted style keys before output.

Shared clearable inputs may also emit bounded undo feedback when the helper can
restore the exact prior value. That undo path is editor-only feedback and must
not persist extra sentinel state into widget JSON.

---

## Kontrakty widgetu (v1)

Kazdy widget powinien zdefiniowac:
- `variants`: lista wariantow (np. hero: centered, split, media-left).
- `schema`: JSON schema danych widgetu.
- `defaults`: bezpieczne domyslne wartosci.
- `fields`: pola widoczne w Wizard/Visual/Advanced.
- `surfaces`: gdzie widget moze byc widoczny:
  - `page-builder`
  - `widget-library`
  - `custom-screen-builder` (retired Custom Screens migration metadata only)
  - `admin-list-view`
  - `admin-editor-view`

## Surface scoping

Widget registry nie jest juz jedna plaska lista dla wszystkich surface'ow.

Historyczne zasady metadata (nie stosowac do nowego authoringu):
- dawne public/page renderer ids nalezaly do `page-builder` + `widget-library`,
- screen-only widgets are retired from active registration after TASK-468; old
  `custom-screen-builder`, `admin-list-view`, and `admin-editor-view` metadata
  may appear only in migration docs or stored legacy payloads,
- tylko jawnie dopuszczone prymitywy layoutowe moga byc wspoldzielone miedzy wszystkimi surface'ami,
- `Advanced/Widgets` is hidden from default navigation as of TASK-461; the
  direct compatibility route still shows only surface `widget-library`,
- `Coderso/Screens` builds active V4 editor blocks from the screen document
  owner, not from a widget registry surface.

Uwaga:
- `Widget Library` i flow `New Template` sa wycofane jako powierzchnie
  authoringu.
- Nie tworzy sie nowych non-dashboard widget types w kodzie ani pluginie.
  Pages, Forms, Menus, Posts, Custom Screens i templates rozszerzaja swoje
  sekcje/bloki; pluginowe configurable widgets dotycza tylko Admin Dashboard.
- Istniejace registry/template rows sa utrzymywane jedynie dla
  niedestrukcyjnego odczytu, runtime compatibility i migracji.

## Historical Widget Library Admin UX (retired record)

Ponizsze punkty opisuja zamkniety etap implementacji i nie sa instrukcja
authoringu ani kontraktem dla nowych funkcji.

`/admin/advanced/widgets` is a hidden/direct compatibility route after
TASK-461 and follows the shared Pages-style list contract when opened:
- `All Items` opens by default in table view.
- The old library rail is represented by one section dropdown in the filter bar:
  `All Items`, `Favorites`, `Templates`, `All Widgets`, `Layout`, `Content`,
  `Forms`, `Navigation`, and `Media`.
- Table and grid use the same section-aware row model, shared pagination, and
  visible-row selection trimming.
- Grid cards remain selectable and core widget card clicks still open the
  existing `WidgetDetailsDrawer`.
- Row and card actions use one three-dot menu. Core widget rows expose Preview
  placeholder, Configure, Insert, and favorite actions. Template rows use
  template-safe Edit/favorite actions, while Duplicate/Delete are available only
  in the `Templates` section.
- Favorites remain stored per user under `widgets.favorites` and keep the
  existing max-50 behavior. Bulk favorite add/remove operates only on currently
  visible selected rows.
- Template destructive actions continue through `ConfirmActionDialog`,
  `deleteWidgetTemplate`, partial-failure feedback, and cache refresh.

Retired screen widget pack dla Custom Screens migration compatibility:
- `screen-record-header`
- `screen-field-value`
- `screen-field-group`
- `screen-two-column`

Current compatibility intent for that pack:
- `screen-record-header` is a legacy selected-entry summary input migrated to a
  V4 `record-header` screen block. It is not registered for active authoring.
- `screen-field-value` is the legacy migration input for a V4 `field` screen
  block. Active V4 entry editing now reads `ScreenFieldBinding` directly and
  does not rely on this widget at runtime.
- `screen-field-group` is the fixed-slot section wrapper for related field
  widgets and keeps its `selected-content-type` layout contract without
  selected-entry binding cards.
- `screen-two-column` is the left/right layout shell for primary vs supporting
  record content and keeps its `selected-content-type` layout contract without
  selected-entry binding cards.
- Detailed per-widget docs live in `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`,
  `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`,
  `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md`, and
  `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`.

---

## Model danych bloku (Page Builder)

Kazdy widget zapisany jest jako blok w `page.data.blocks`:

```ts
type WidgetBlock = {
  id: string;
  type: string;    // registry key
  variant: string; // wariant widgetu
  data: Record<string, unknown>;
  layout?: {
    container?: "default" | "narrow" | "full" | "inherit";
    padding?: { top?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit"; bottom?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit" };
    margin?: { top?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit"; bottom?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit" };
    background?: { color?: string; image?: string | null };
  };
  visibility?: {
    enabled?: boolean;
    devices?: ("desktop" | "tablet" | "mobile")[];
  };
  editor?: {
    mode?: "wizard" | "visual" | "advanced";
  };
  slots?: Record<string, WidgetBlock[]>; // fixed ids and repeatable instance ids (e.g. "column:1")
  children?: WidgetBlock[]; // legacy
};
```

Uwaga: pole `editor` jest usuwane przy publikacji (`pageService.toPublishedData`).
`children` jest legacy — mapujemy je do `slots.default`, jesli `slots` nie wystepuje.

---

## Kontrakt definicji widgetu

Minimalna struktura definicji:

```ts
type WidgetDefinition<T = Record<string, unknown>> = {
  type: string;
  title: string;
  description?: string;
  category: "layout" | "content" | "forms" | "navigation" | "media";
  surfaces?: (
    | "page-builder"
    | "widget-library"
    | "custom-screen-builder"
    | "admin-list-view"
    | "admin-editor-view"
  )[];
  dataAccess?: {
    source: "none" | "selected-content-type" | "selected-entry";
    modes: ("read" | "write")[];
  };
  canHaveChildren?: boolean;
  slots?: {
    id: string;
    label: string;
    kind?: "fixed" | "repeatable";
    minItems?: number; // repeatable only
    maxItems?: number; // fixed: max children in slot, repeatable: max instances
    allowedTypes?: string[];
  }[];
  variants: { id: string; label: string; description?: string }[];
  schema: Record<string, unknown>; // JSON schema (draft-07)
  defaults: T;
  editor: {
    wizard: React.ComponentType<WidgetEditorProps<T>>;
    visual: React.ComponentType<WidgetEditorProps<T>>;
    advanced: React.ComponentType<WidgetEditorProps<T>>;
  };
  editorCapabilities?: {
    visualOwnsVariantSelection?: boolean;
  };
  render: React.ComponentType<{
    data: T;
    variant: string;
    slots?: Record<string, WidgetBlock[]>;
    previewDevice?: DeviceTarget;
    pageDefaults?: WidgetLayoutDefaults;
    blockId?: string;
  }>;
};
```

### Slot kinds (fixed vs repeatable)

- `fixed` (default): stable slot id (`content`, `right`, `bottom`).
- `repeatable`: dynamic slot instances with deterministic keys in `slots` map:
  - format: `<slotId>:<instanceId>` (example: `column:1`, `column:2`)
  - `minItems` i `maxItems` kontroluja liczbe instancji.

Normalization rules:
- Legacy key `slots.<slotId>` dla repeatable jest migrowany do pierwszej instancji.
- Przy brakujacych instancjach dodawane sa automatycznie instancje do `minItems`.
- Nadmiarowe instancje ponad `maxItems` sa odcinane deterministycznie.

### WidgetEditorProps

```ts
type WidgetEditorProps<T> = {
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
  context?: WidgetEditorContext;
};

type WidgetEditorContext = {
  surface: WidgetSurface;
  jumpToBindingPropPath?: (propPath: string) => void;
  getBindingState?: (propPath: string) => "literal" | "bound" | "mixed";
};
```

---

## Historical registry API (`core/widgets/registry.ts`)

This API remains for stored-data/runtime compatibility and tests. Do not
register a new non-dashboard type. Plugin content extensions use domain blocks;
configurable plugin widgets use the Admin Dashboard contract.

- `registerWidget(def)` – rejestruje widget
- `getWidget(type)` – zwraca definicje
- `listWidgets()` – lista wszystkich
- `clearWidgets()` – tylko dla testow

Retained naming rules:
- Core: `hero`, `timeline`, `compare-timeline`, `newsletter`, `contact`, `navigation`, `footer`
- Pluginy: `<plugin>.<widget>` (np. `seo-boost.hero`)

---

## Walidacja i defaults

Flow:
1) Pobierz definicje z registry
2) Sprawdz `variant`
3) `data = { ...defaults, ...data }`
4) Waliduj przez AJV (JSON schema)

---

## Render pipeline

- `WidgetRenderer` wybiera definicje po `type`.
- Brak widgetu → `MissingWidget`.
- Stosuje `layout` + `visibility`.
- Dla tokenow `inherit` renderer bierze wartosci z `page.settings.layout.sections.defaults`.
- Renderuje komponent `def.render`.
- Jesli widget **nie** definiuje `slots`, renderer wyswietla legacy `children`
  (lub `slots.default`) wewnatrz kontenera sekcji.
- Jesli widget ma `slots`, to on odpowiada za renderowanie tych blokow
  w odpowiednich miejscach UI.
- Przykład: `hero` renderuje `slots.content` pod sekcją CTA.
- Przykład: `navigation` renderuje `slots.right` w prawym obszarze akcji paska.
- Przykład: `footer` renderuje `slots.column-1/2/3` w kolumnach i `slots.bottom`
  w dolnym pasku legal/actions.

## Navigation widget (runtime links)

- `linksSource` wspiera `manual`, `menu`, `pages`.
- `pages` buduje linki z opublikowanych stron z `page.data.settings.showInNav = true`.
- Gdy wynik (menu/pages) ma 0 linkow, runtime fallbackuje do manual `items`.
- Szczegolowy kontrakt: `_docs/_WIDGETS/NAVIGATION.md`.

## Inheritance and page defaults

- `page.settings.layout.sections.defaults` definiuje fallback dla blokow z
  `layout.container/padding/margin = "inherit"`.
- `page.settings.layout.applyDefaultsToNewBlocks = true` powoduje, ze nowo
  dodane bloki w edytorze strony dostaja domyslne layout tokens z page settings.
- Runtime preview i published output korzystaja z tych samych zasad dziedziczenia.

---

## Historical Page/Screen wiring (retired record)

The former Page Widget Library, Wizard/Visual/Advanced panels, surface-scoped
registry insertion, and selected-entry widget binding metadata are not active
authoring contracts. Pages use Page-owned sections/blocks. Custom Screens V4
use `definition.listView`, screen-owned `sections[].blocks[]`, and explicit
field bindings. Retained surface ids and `listWidgetsForSurfaceContext()` exist
only to decode/support legacy records and must not gain new consumers.

### Retired Screen Widget Editor Parity

The old `screen-*` family is retained only as documented migration input. It is
not registered in active widget catalogs, and V4 Custom Screens do not expose
the old widget Wizard/Visual/Advanced editor bundle.

Custom Screens preview and the inline record editor now render
`ScreenDocumentV1` through the screen runtime, not through `WidgetRenderer` or
the screen-widget render bridge. V4 entry mode is field-editing-only: the
canvas may open the floating `Value` panel for writable bindings, but it must
not expose section/block builder actions in the record editor. V4 Editor View
authoring uses screen-owned sections/blocks through `ScreenAuthoringCanvas` and
neutral authoring UI primitives rather than inserting `screen-*` widgets from
the widget registry.

---

## Retained catalog API (support/read compatibility)

- `GET /widgets` may expose the historical core renderer catalog to hidden
  support tooling; it is not a Page/Screen/Form/Menu/Post inserter.
- Every `/widget-templates*`, `/widgets/templates*`, and template-category CRUD,
  preview, revision, restore, and duplicate route is deleted. Current reusable
  Page authoring uses `/page-templates` and Page v2 sections/blocks.
- No new write path may persist a widget-template row through this catalog.

---

## Historical Widget Library preview (retired record)

- Drawer szczegolow widgetu pokazuje ten sam zestaw paneli (Wizard/Visual/Advanced),
  ktory jest uzywany po wstawieniu widgetu.
- Core widget cards sa configuration-first: karta otwiera konfiguracje, a
  wlasciwa mutacja insertu idzie przez dialog placement/target.
- Udany insert pokazuje shared admin toast z akcja otwarcia edytora targetu;
  blad insertu zostawia dialog otwarty i pokazuje bounded error.
- Zmiany wykonane w podgladzie NIE zapisuja sie automatycznie; zapis nastepuje
  dopiero po wstawieniu widgetu do strony lub template.

### Favorites

- Ulubione widgety sa zapisywane per uzytkownik w `user_settings` pod kluczem
  `widgets.favorites`.
- Limit: max 50 pozycji.
- Favorite button ma dynamiczne `aria-label`, `title` i `aria-pressed`; zmiana
  stanu daje bounded feedback przez Admin UI.
- Hero variant presets sa zapisywane per uzytkownik w `user_settings` pod kluczem
  `widgets.hero.presets` (limit: 24).

---

## Widget Templates (retired surface — TASK-420-03)

- The Advanced Widgets reusable-template editor, its routes
  (`/widget-templates*`, `/widgets/templates*`, template categories), preview
  target (`type=widget-template`), revisions flow, cached admin clients, and
  the Templates section of the Widget Library are deleted. Reusable templates
  are now the Page Templates surface (`/page-templates` routes,
  `/advanced/page-templates` admin UI) documented in `_docs/PAGE_MODEL.md` and
  `_docs/CMS_API.md`.
- The widget catalog (`GET /widgets`) is core-widget-only.
- Boundary guards stay permanent in both directions: fresh Page v2
  `sections[]` payloads into legacy widget surfaces reject
  (`legacy_widget_surface_page_v2_document_invalid`), and legacy
  `WidgetBlock[]` payloads into Page Templates reject
  (`page_template_legacy_widget_blocks_invalid`).
- Ring 2 residue (recorded by TASK-420-03 verification): `widget_templates` +
  `widget_template_revisions` tables stay because live consumers remain
  (solution-kit template seeding via `templateInstaller`, the
  `template-section` core widget on custom screens/detail pages, and existing
  rows in production data). `widgetTemplateService`,
  `widgetTemplateRevisionService`, `widgetTemplateCategoryService`,
  `widgetTemplateSettings`, and `templateSectionRuntime` remain as data-layer
  modules for those consumers only; they no longer have any admin product
  surface. The storage drop is an explicit follow-up task, not silent scope.
- The `template-section` widget keeps rendering already stored rows
  (fail-closed placeholders for unresolvable ids). Its admin editors are
  read-only for template selection; presentational metadata stays editable.

## Wizard QA contracts

- Radix Select nie moze uzywac `value=""`; puste/none stany musza byc
  UI-only sentinelami mapowanymi na `undefined`/brak wartosci przed zapisem.
- Listing-query-backed widgets musza rozroznic `loading`, `empty`, `ready` i
  `error`; po zakonczonym fetchu nie wolno zostawiac copy `Loading...`.
- Count selectors w Wizard musza odpowiadac liczbie widocznych repeatable rows
  albo jawnie ograniczac zakres quick setup.
- Routine rich text setup uzywa structured `body.blocks` i sanitizer-owned
  output mode; raw HTML nie jest authoringiem w Advanced, a dzienna edycja
  przechodzi przez Visual rich-text/structured controls.
- Product widget collection selection korzysta z cached collection picker, z
  fallbackiem na jawne collection IDs tylko dla technicznej kompatybilnosci.
- Media picker w Gallery Mosaic zapisuje tylko schema-owned, public-runtime-safe
  dane, a nie prywatne rekordy admin cache.
- Gallery Mosaic Visual uses media/page pickers for image, video, poster, and
  destination authoring. Saved legacy URLs remain visible only as
  replace-or-clear compatibility state; new defaults must not seed fake
  destinations such as `href: "#"`.
- Pricing Plans Wizard and Visual use page-first destination pickers for plan
  CTAs and swatch-first color controls for pricing surfaces/highlights.
  Defaults must not seed fake CTA destinations such as `href: "#"`.

---

## Maintenance guide for retained compatibility renderers

- Nie dodawaj nowych non-dashboard widget types, presets, module-pack entries
  ani Wizard/Visual/Advanced editors.
- Zmieniaj legacy schema/default/normalizer tylko dla istniejacych zapisanych
  danych i zachowuj niedestrukcyjny odczyt oraz testy regresji.
- Nowe editor-facing zachowanie dodawaj do section/block contract wlasciciela
  domeny. Nowe Admin Dashboard widgets stosuja osobny kontrakt z
  `_docs/DASHBOARD_WIDGETS_SPEC.md`.

---

## UX i spojnosc

- Nazewnictwo i uklad pol spojne w kazdym widgetcie.
- Minimalna liczba pol w Wizard.
- Visual pokazuje realny preview (miniatury lub skeletony).
- Advanced zapewnia kontrole nad spacing i typografia.
- Widgety powinny uzywac design tokens (`DESIGN_TOKENS.md`).
