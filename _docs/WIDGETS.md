# Widgets Spec (v1)

Specyfikacja bazowych widgetow core i modelu konfiguracji, ktory musi byc
stosowany rowniez przez widgety z pluginow i addonow.

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

## Lista widgetow w core v1

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

## Model konfiguracji (obowiazkowy)

Kazdy widget musi wspierac 3 tryby konfiguracji:

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
  FAQ Accordion and Newsletter keep only confirm-gated normalization support
  actions in Advanced; Navigation layout/sticky/collapse controls live in
  Visual and Advanced reports summaries only. CTA Banner style-token controls
  and Stats KPI runtime style summaries are read-only diagnostics in Advanced,
  while Visual uses swatch-only color controls plus clear actions where values
  are clearable.
- Newsletter Visual follows the beginner-safe integration rule: Coderso Forms
  are chosen from a Form picker, field mapping is selected from Form fields or
  shown as safe defaults, and external provider action URL/method/webhook
  metadata is summarized rather than edited as raw technical text.
- Commerce widget authoring follows the same picker-first rule. Product Gallery
  and Product Compare use collection/product/page pickers for normal
  Wizard/Visual flows; raw product IDs, fallback collection IDs, route-prefix
  strings, and minor-unit price wording are not beginner-mode inputs. Existing
  saved technical values remain backward-compatible and are summarized in
  Advanced diagnostics.
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
| `stack` | responsive direction, gap, align, justify, wrap | read-only breakpoint flow summaries and normalized payload |
| `spacer` | height presets/tokens and editor guide | read-only computed desktop/tablet/mobile heights and normalized payload |
| `divider` | variant/label, line, width presets, color swatch, spacing tokens | read-only line/width/spacing/label summaries, normalization note, normalized payload |

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
| Layout gap/spacing/padding | `stack.gap.*`, `splitLayout.gap`, `gridColumns.layout.gapX/gapY`, `gridColumns.style.columnPadding`, `screenTwoColumn.gap`, `statsKpi.style.spacing`, `featureGrid.style.gap`, `contentList.style.gap`, `postsFeed.style.gap`, `galleryMosaic.style.gap`, `pricingPlans.style.spacing`, `faqAccordion.style.spacing`, `team.style.gap`, `testimonials.style.spacing`, `contact.style.spacing`, `newsletter.style.spacing`, `ctaBanner.style.padding`, `logoCloud.style.gap`, `richTextSection.style.spacing`, `timeline.layout.spacing/padding/sectionSpacing`, `compareTimeline.layout.trackSpacing` |
| Vertical utility rhythm | `divider.marginTop/marginBottom`, `spacer.height.desktop/tablet/mobile` |
| Radius | `hero.style.borderRadius/mediaRadius`, `entryTeaser.style.radius`, plus existing radius fields on `section`, `ctaBanner`, `featureGrid`, `galleryMosaic`, `pricingPlans`, `team`, and `gridColumns` |
| Width and size | `hero.layout.maxWidth/contentWidth`, `navigation.layout.maxWidth`, `footer.layout.maxWidth`, `formEmbed.layout.width`, `timeline.layout.maxWidth`, `logoCloud.style.logoHeight`, `formEmbed.style.inputSize`, `hero.style.primaryButtonSize/secondaryButtonSize` |
| Typography | `hero.style.headlineSize/subheadSize/bodySize`, `navigation.style.fontSize/fontWeight`, `footer.style.fontSize`, `richTextSection.style.fontScale/lineHeight`, `timeline.style.titleSize/titleWeight/descriptionSize`, `compareTimeline.style.trackLabelSize/stepLabelSize/segmentLabelSize` |

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
  - `custom-screen-builder`
  - `admin-list-view`
  - `admin-editor-view`

## Surface scoping

Widget registry nie jest juz jedna plaska lista dla wszystkich surface'ow.

Zasady:
- public/page widgets domyslnie naleza do `page-builder` + `widget-library`,
- screen-only widgets moga nalezec do `custom-screen-builder`,
  `admin-list-view`, i `admin-editor-view` zalezne od realnej surface
  odpowiedzialnosci,
- tylko jawnie dopuszczone prymitywy layoutowe moga byc wspoldzielone miedzy wszystkimi surface'ami,
- `Advanced/Widgets` pokazuje tylko surface `widget-library`,
- `Coderso/Screens` pokazuje tylko surface `custom-screen-builder`.

Uwaga:
- `Widget Library` nie sluzy do tworzenia nowych realnych widget types z admin UI.
- nowe widget types nadal sa code/plugin-authored i musza byc zarejestrowane w widget registry,
- z poziomu admina user moze tworzyc `widget templates` przez flow `New Template`.

## Widget Library Admin UX

`/admin/advanced/widgets` follows the shared Pages-style list contract:
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

Minimalny screen widget pack dla admin UI:
- `screen-record-header`
- `screen-field-value`
- `screen-field-group`
- `screen-two-column`

Current intent for that pack:
- `screen-record-header` is a selected-entry summary surface with widget-owned
  binding targets for `eyebrow`, `title`, `subtitle`, `description`, and
  `badge`; those props can participate in write-capable record editing again.
- `screen-field-value` is the record-row/card primitive that can stay read-only
  or become inline-editable when its widget-owned `value` target points at a
  writable field; `label` and `helper` remain read-only binding targets.
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

## Registry API (core/widgets/registry.ts)

- `registerWidget(def)` – rejestruje widget
- `getWidget(type)` – zwraca definicje
- `listWidgets()` – lista wszystkich
- `clearWidgets()` – tylko dla testow

Naming rules:
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

## UI Wiring (Page Builder)

- Widget library czyta `listWidgets()` i pokazuje liste.
- Dodanie widgetu tworzy blok z `defaults`.
- Panel Wizard/Visual/Advanced renderuje `definition.editor.*`.
- Zmiana wariantu aktualizuje `block.variant`.

## Admin Widget Surfaces

Widget availability is surface-scoped:

- `page-builder` - public page builder canvas.
- `widget-library` - reusable widget/template catalog.
- `custom-screen-builder` - legacy Custom Screens surface kept for V1
  compatibility.
- `admin-list-view` - Custom Screens `List View` configuration surface.
- `admin-editor-view` - Custom Screens `Editor View` canvas and screen-owned
  inline record editing surface.

Admin-only widgets may declare `dataAccess` metadata:

- `source: "selected-content-type"` for widgets that need the assigned content
  type schema.
- `source: "selected-entry"` for widgets that read or write the active record.
- `modes: ["read"]`, `["write"]`, or `["read", "write"]` describe the expected
  data direction.
- `bindingTargets` let a selected-entry widget own the prop paths surfaced in
  Custom Screens `Data`; they define labels, descriptions, and per-prop read vs
  write capability instead of leaving the panel to infer paths from defaults.
- Existing `screen-record-header`, `screen-field-value`, `screen-field-group`,
  and `screen-two-column` widgets can be reused in `admin-editor-view` for
  screen-owned inline editing when their bindings target writable entry fields.

`listWidgetsForSurfaceContext()` filters selected-entry and selected-content-type
widgets until the current Custom Screen has a resolved content type. This keeps
public widgets out of admin record editors and prevents schema-bound controls
from rendering against missing context.

### Screen widget editor parity

The `screen-*` family now follows the same three-mode editor bundle contract as
the mature public widgets:

- `wizard` owns variant choice plus the primary structure/content fields.
- `visual` owns the day-to-day content controls. For
  `screen-record-header` and `screen-field-value`, Visual mode can use
  `WidgetEditorContext` to show binding-state badges and jump directly into the
  existing `Data` tab card for a specific `propPath`.
- The `Data` tab renders prop-centric cards from widget-owned binding targets
  instead of ordinal binding rows. Compatibility rows keep already-saved custom
  prop paths visible, but only declared write-capable targets count toward
  `supportsDedicatedEditor` and `writableBindingFields`.
- `advanced` owns alignment, tone, spacing, and clearable chrome tokens. Clear
  actions remove the nested style key instead of writing `transparent` or other
  sentinel strings.

Custom Screens preview and the read-only portions of the inline record editor
reuse one shared screen-widget render bridge for nested `screen-field-group`
and `screen-two-column` layouts. The editable record canvas can still swap a
bound `screen-field-value` into an inline field control when the `value`
binding targets a writable schema or system field.

---

## Widget Catalog API

Admin UI pobiera katalog widgetow z API:

- `GET /widgets` zwraca liste core widgetow + templatek (source: `core` / `template`).
- Templateki sa zarzadzane przez `GET/POST/PATCH/DELETE /widgets/templates`
  (alias: `/widget-templates`).
- Templateki mozna duplikowac przez `POST /widgets/templates/:id/duplicate`
  (alias: `/widget-templates/:id/duplicate`). Duplicate jest service-owned:
  serwer laduje source template, klonuje dozwolone `blocks/settings`, tworzy
  draft i nadaje jawna nazwe typu `Copy of ...`.
- Create/update odrzucaja case-insensitive duplicate names kodem
  `widget_template_name_conflict`.

Katalog zawiera podstawowe metadata:
`id`, `name`, `description`, `category`, `variants`, `status`.

---

## Widget Library (Preview konfiguracji)

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

## Template Preview (Admin)

- Podglad template renderuje bloki przez runtime `WidgetRenderer` (server-side).
- Podglad jest read-only i pokazuje ostatnia zapisana wersje template.
- Wynik zwracany jako HTML do iframe w edytorze template.

---

## Template Revisions (Admin)

- Kazdy zapis template tworzy rewizje (metadata + bloki).
- Restore przywraca wybrana rewizje i zapisuje nowy snapshot po przywroceniu.
- Rewizje pokazuja autora, status i liczbe blokow.

---

## Template Categories (Admin)

- Kategorie template sa zarzadzane przez ustawienia `widgets.templateCategories`.
- Template zapisuje nazwe kategorii (match case-insensitive na UI).
- Biblioteka templates filtruje po nazwie kategorii.
- Edit/delete kategorii zachowuje kontekst wiersza i pokazuje osobny tryb
  edycji/usuwania zamiast cicho zastepowac kategorie niejednoznacznym stanem.

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

## Authoring Guide (plugin widgets)

- Definiuj wlasne `schema` i `defaults`.
- Trzymaj dane kompatybilne z JSON schema.
- Uzywaj design tokens zamiast hardcode kolorow.
- Stosuj Wizard/Visual/Advanced zgodnie ze standardem core.

---

## UX i spojnosc

- Nazewnictwo i uklad pol spojne w kazdym widgetcie.
- Minimalna liczba pol w Wizard.
- Visual pokazuje realny preview (miniatury lub skeletony).
- Advanced zapewnia kontrole nad spacing i typografia.
- Widgety powinny uzywac design tokens (`DESIGN_TOKENS.md`).
