# TASK-547-04-L01: Seven Page v2 Documents
# FileName: TASK-547-04-L01-Seven-Page-V2-Documents.md

**Parent Subtask:** TASK-547-04
**Priority:** High
**Category:** Pages / Reference Example
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-03
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — current builders contain non-source copy and facts;
the corrected implementation and fresh validation are pending.

## Overview

Build the seven static Page v2 documents as a native CMS reproduction of the
pinned FormaDom prototype. This leaf is the sole writer for:

- `scripts/projekty-domow/pages/home.ts`
- `scripts/projekty-domow/pages/offer.ts`
- `scripts/projekty-domow/pages/projects.ts`
- `scripts/projekty-domow/pages/process.ts`
- `scripts/projekty-domow/pages/pricing.ts`
- `scripts/projekty-domow/pages/about.ts`
- `scripts/projekty-domow/pages/contact.ts`
- `scripts/projekty-domow/pages/index.ts`
- `scripts/projekty-domow/pages/shared.ts`
- `core/services/pages/pageDocumentV2.ts`
- new `core/services/pages/pageDocumentV2Types.ts`
- new `core/services/pages/pageDocumentV2Contract.ts`
- new `core/services/pages/pageBlockJsonSchemaV2.ts`
- new `core/services/pages/pageDocumentV2Schema.ts`
- new `core/services/pages/pageDocumentV2Normalization.ts`
- new `core/services/pages/pageTextMarksV2.ts`
- new `core/services/pages/pageSectionNormalizerV2.ts`
- new `core/services/pages/pageBlockNormalizerV2.ts`
- new `core/services/pages/pageDocumentV2Normalizer.ts`
- `core/services/pages/pageRendererV2.tsx`
- new `core/services/pages/pageRendererV2Contract.ts`
- new `core/services/pages/pageSectionRenderStyles.ts`
- new `core/services/pages/pageBlockRenderStyles.ts`
- new `core/services/pages/pageStaticBlockRenderers.tsx`
- new `core/services/pages/pageDataBlockRenderers.tsx`
- new `core/services/pages/pageLayoutBlockRenderer.tsx`
- new `core/services/pages/pageSectionRendererV2.tsx`
- new `core/services/pages/pageDocumentRenderState.ts`
- `core/services/pages/pageRuntimeBindingContract.ts`
- `core/services/pages/pageEditorControlRegistry.ts`
- new `core/services/pages/pageEditorControlDefinition.ts`
- new `core/services/pages/pageEditorSectionControls.ts`
- new `core/services/pages/pageEditorBlockStyleControls.ts`
- new `core/services/pages/pageEditorBlockControlRegistry.ts`
- `core/services/pages/pageEditorMutationActions.ts`
- `tests/vitest/kits/projekty-domow-pages.test.ts`
- new `tests/vitest/pages/page-switcher-aria-label-contract.test.ts`
- new `tests/vitest/pages/page-switcher-aria-label-render.test.tsx`
- new `tests/vitest/pages/page-switcher-aria-label-editor.test.ts`
- new `tests/vitest/pages/page-data-block-presentation.test.tsx`
- new `tests/vitest/pages/page-renderer-v2-module-boundaries.test.ts`

L02/L03 may import `buildFormaDomPages` and shared constants read-only. This leaf
does not edit TASK-547-03 resources, shell/package builders, public-server
modules or the canonical JSON. TASK-547-06 retains sole ownership of
`tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx` and its installed
accessibility/runtime test; L01 sends it the exact switcher assertion instead of
editing that file.

Each seed is exactly `{ key, desired }`, contains no DB ID, carries target
`status:"published"`, and includes the complete normalized Page document in
`desired`. Installer draft staging/publish-last remains TASK-547-02 behavior.

## Required Page-Core Split

The Page prop corrections must touch three legacy modules that
currently exceed the repository's 1,000-line limit: `pageDocumentV2.ts` (4,676),
`pageRendererV2.tsx` (4,003) and `pageEditorControlRegistry.ts` (1,813). L01 must
split all three by responsibility before adding the field; extracting one tiny
helper while leaving a touched facade oversized fails the leaf.

The frozen module map is:

| Owner module | Cohesive responsibility |
| --- | --- |
| `pageDocumentV2Types.ts` | vocabulary, clamps, structural types and the single `PageDocumentError` identity |
| `pageDocumentV2Contract.ts` | defaults, prop allowlists, slots and capability registries |
| `pageBlockJsonSchemaV2.ts` | strict block/style/props/slot schema builders |
| `pageDocumentV2Schema.ts` | section/responsive/root JSON schema and exported `pageDocumentV2JsonSchema` |
| `pageDocumentV2Normalization.ts` | shared record/array/mode/bounded-value normalization primitives |
| `pageTextMarksV2.ts` | text-mark normalization and public mark mutations |
| `pageSectionNormalizerV2.ts` | settings/effects/section layout/style/visibility normalization |
| `pageBlockNormalizerV2.ts` | block style/props/responsive/list/filter/gallery normalization |
| `pageDocumentV2Normalizer.ts` | block/section trees, legacy adapter, factories, public normalization, breakpoint and publication helpers |
| `pageRendererV2Contract.ts` | public/internal render types, context callbacks and primitive readers |
| `pageSectionRenderStyles.ts` | section style/class/render-prop projection and reveal CSS |
| `pageBlockRenderStyles.ts` | block layout/typography/style/data-attribute projection |
| `pageStaticBlockRenderers.tsx` | safe SVG and non-data-bound leaf render helpers |
| `pageDataBlockRenderers.tsx` | collection/filter/form/embed render helpers and inert boundaries |
| `pageLayoutBlockRenderer.tsx` | recursive slots/layout hosts/frame composition via injected block-content callback |
| `pageSectionRendererV2.tsx` | section templates, media split and section DOM via injected callback |
| `pageDocumentRenderState.ts` | pure document render-tree/effect/spotlight state derivation |
| `pageEditorControlDefinition.ts` | control metadata types and constructors |
| `pageEditorSectionControls.ts` | universal and type-specific section controls |
| `pageEditorBlockStyleControls.ts` | universal block, typography and composition controls |
| `pageEditorBlockControlRegistry.ts` | per-block registry, lookup, capabilities and responsive projections |

`pageDocumentV2.ts` and `pageEditorControlRegistry.ts` become explicit-export
compatibility facades; do not use `export *`, change existing consumer import
paths or let an internal module import its facade. `pageRendererV2.tsx` remains
a real composition root below 1,000 lines, not an empty barrel: the existing
5,696-line read-only renderer suite source-scans that exact path. It must retain
the adjacent real `customSvg` then `switcher` cases, calls to `buildSafeSvgTree`
and `renderSafeSvgNode`, and the exact trusted
`ANIMATED_ICON_KEYFRAMES_CSS`/`PAGE_EFFECTS_RUNTIME_SOURCE`
`dangerouslySetInnerHTML` expressions. The new boundary suite rejects facade
cycles, DB/server/settings imports in pure support modules and moved trusted
sinks. Every facade, extracted module and new test must close at no more than
1,000 physical lines.

## Switcher Accessible-Name Contract

The pinned home prototype defines `aria-label="Wybór stylu domu"` on its
tablist (`index.html:136`). English `Content tabs` under `<html lang="pl">` is a
real accessibility defect, not a visual residual. Add one generic present-only
Page prop:

```ts
export const PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH = 160;
export const PAGE_SWITCHER_DEFAULT_ARIA_LABEL = "Content tabs";

// allowlist only; pageBlockDefaultProps.switcher MUST NOT seed ariaLabel
pageBlockPropKeys.switcher = ["tabs", "activeIndex", "variant", "ariaLabel"];
```

- Base `switcher.props.ariaLabel` accepts only a string, trims it, stores 1–160
  characters and round-trips unchanged after trimming. Blank/whitespace is an
  explicit clear and is omitted. Wrong-type or overlong fresh writes fail with
  `page_document_invalid`; malformed stored values are omitted without
  truncation or degrading the remaining document.
- The nested strict schema allowlists exactly this key with `minLength:1` and
  `maxLength:160`. Responsive overrides reject it: one tablist has one stable
  accessible name across devices.
- When the key is absent/cleared, normalized document JSON and rendered markup
  remain byte-identical to the legacy path, including exact fallback
  `aria-label="Content tabs"`.
- At render, independently type-check, trim and bound the stored value; invalid
  data falls back to `PAGE_SWITCHER_DEFAULT_ARIA_LABEL`. Pass the string through
  React's `aria-label` attribute only, so quotes/tags are escaped once and never
  become markup.
- Add one base-only text editor control with id
  `block.switcher.props.ariaLabel`, label `Tab list label`, path
  `["props","ariaLabel"]`, Content panel, `responsive:false` and no fallback.
  Clearing the input deletes the key; the editor must never seed the English
  runtime fallback into stored data.
- `patchBlockControlForDevice` owns generic `responsive:false` mutation
  semantics: it writes the desktop/base path even while the editor previews
  tablet or mobile and never creates a responsive override. For a text control
  with no fallback, a blank/whitespace commit removes the leaf and recursively
  compacts now-empty authored parent objects. This is the mutation boundary
  used by `ariaLabel`; `PageEditor.tsx` remains read-only and may continue to
  pass the active preview device.
- `home.ts` authors the exact Polish value `Wybór stylu domu`. No other Page is
  forced to author it, and no multilingual routing contract is introduced.

## Data-Block Presentation Bridges

Project-card CTA visibility and Form presentation belong to their native
renderers, not listing-template/Form persisted data. L01 owns strict
present-only Page props and maps them into the existing Content List/Form Embed
contracts:

```ts
import {
  FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../widgets/core/formEmbedContract";

// allowlists only; pageBlockDefaultProps MUST NOT seed these present-only keys
pageBlockPropKeys.collection = [
  "contentTypeId", "queryId", "limit", "templateId",
  "paginationMode", "pageSize", "showCta",
];
pageBlockPropKeys.form = [
  "formId", "title", "textareaRows", "showSelectPrompt",
  "loadingLabel", "successBehavior",
];
```

- `collection.props.showCta` and `form.props.showSelectPrompt` are booleans;
  `form.props.textareaRows` is an integer bounded by the imported
  `FORM_EMBED_TEXTAREA_ROWS_LIMITS`; `form.props.loadingLabel` is a trimmed
  non-empty string bounded by imported
  `FORM_EMBED_LOADING_LABEL_MAX_LENGTH`; and
  `form.props.successBehavior` uses imported
  `FORM_EMBED_SUCCESS_BEHAVIORS`. Fresh unknown/wrong-type/out-of-range/blank
  values fail with `page_document_invalid`; malformed stored values are omitted.
  These presentation props are base-only and rejected in responsive overrides.
- Absence emits no normalized JSON key and preserves legacy Page JSON and SSR
  bytes. `mapPageCollectionBlockToContentListData` maps authored `showCta` to
  `ContentListData.fields.showCta`; semantic item href resolution remains
  unchanged. The Form renderer groups `textareaRows`/`showSelectPrompt` into
  `FormEmbedData.fields` and `loadingLabel`/`successBehavior` into
  `FormEmbedData.submitBehavior`, emitting neither nested object when no member
  is authored. Invalid stored input takes the native legacy defaults.
- Add base-only Content-panel controls:
  `block.collection.props.showCta` (`Show card action`, toggle);
  `block.form.props.textareaRows` (`Textarea rows`, integer 2–20);
  `block.form.props.showSelectPrompt` (`Show select prompt`, toggle);
  `block.form.props.loadingLabel` (`Loading label`, text); and
  `block.form.props.successBehavior` (`After successful submission`, select
  options `Hide form`, `Reset form`, `Keep form`). Displayed native fallbacks
  are not written until changed; reset deletes only the selected key.
- The projects Page authors `props.showCta:false`. The contact Page authors
  `textareaRows:5`, `showSelectPrompt:false`,
  `loadingLabel:PROJECT_BRIEF_LOADING_LABEL`, and
  `successBehavior:"show-message-keep-form"`. TASK-547-03 owns/re-exports the
  Form Embed limits/enum and Polish constant; the referenced Form owns only its
  fields/theme/action data and persists none of these Page props.
- `page-data-block-presentation.test.tsx` pins strict allowlists/schema/bounds/
  enums, write/read round trips, responsive rejection, malformed stored
  omission, absent JSON/SSR byte identity, both renderer mappings, semantic
  href preservation, exact editor metadata/reset and FormaDom values. Existing
  `tests/vitest/widgets/formRuntimeScript.test.ts` remains read-only and proves
  that the native keep-form branch leaves controls visible.

## Package Page Reference Contract

Page package references are not native Page values until the installer resolves
them. L01 therefore owns one package-only document boundary:

```ts
type FormaDomPageBinding =
  | { sectionId: string; blockId: string; blockType: "collection";
      prop: "contentTypeId" | "queryId" | "templateId"; value: PackageRef }
  | { sectionId: string; blockId: string; blockType: "filters";
      prop: "queryId"; value: PackageRef }
  | { sectionId: string; blockId: string; blockType: "form";
      prop: "formId"; value: PackageRef };
```

The builder first creates and strictly normalizes a native Page document with
syntactically valid placeholder IDs. It then clones that normalized document and
inserts `PackageRef` objects only at the five direct root-block bindings used by
this package:

1. `projects-browser/projects-filters/props.queryId` →
   `{ ref:"listing_query", key:"published-projects" }`;
2. `projects-browser/projects-collection/props.contentTypeId` →
   `{ ref:"content_type", key:"house-project" }`;
3. `projects-browser/projects-collection/props.queryId` →
   `{ ref:"listing_query", key:"published-projects" }`;
4. `projects-browser/projects-collection/props.templateId` →
   `{ ref:"listing_template", key:"project-cards" }`;
5. `contact-form-section/contact-form/props.formId` →
   `{ ref:"form", key:"project-brief" }`.

Each insertion must find exactly one declared section and direct root block,
match the frozen block-type/property pair above and receive the expected
reference kind. Missing, duplicate, nested-slot, wrong-type, wrong-property or
extra bindings, or any declared placeholder left unresolved, fail package
generation. The helper never recursively searches or substitutes by string
value. In particular, ordinary copy, IDs, links and metadata that happen to
equal a resource key or placeholder remain byte-for-byte unchanged. Ref-free
Pages return the native normalized document directly; ref-bearing Page documents
are not passed through the native Page normalizer again until TASK-547-02
resolves these allowlisted refs to IDs.

## Shared Page Palette Contract

This leaf solely owns `scripts/projekty-domow/pages/shared.ts`, so it replaces
the stale scaffold palette before any Page seed lands:

```ts
export const FORMA_DOM_PAGE_PALETTE = {
  background: "#07111f",
  backgroundSecondary: "#0b1628",
  text: "#f7fbff",
  muted: "#a8b5c7",
  mutedQuiet: "#7e8ba0",
  line: "rgba(255,255,255,.14)",
  aqua: "#8ee8ff",
  mint: "#adffd8",
  violet: "#c7b7ff",
  warm: "#ffd7a8",
  danger: "#ff9fba",
} as const;
```

Every Page builder consumes these constants rather than retyping colors. The
pricing highlight uses the source aqua/mint treatment. Generator tests assert
the intended values and reject stale `#13233a`, `#d8ff7a`, `#b9c9da` and every
other legacy lime/purple scaffold value. L02 consumes this mapping read-only;
it cannot repair palette drift in L01-owned files.

## Source And Route Matrix

All source paths below are relative to the pinned `projekty-domow-wow-site`
directory validated by TASK-547-07. Public copy is literal; curly quotes,
punctuation, capitalization, spaces in prices and item order are contract data.

| Order | Page key | Route | Source | SEO title |
| ---: | --- | --- | --- | --- |
| 1 | `home` | `/` | `index.html` | `Nowoczesne projekty domów — FormaDom Studio` |
| 2 | `oferta` | `/oferta` | `oferta.html` | `Oferta — FormaDom Studio` |
| 3 | `projekty` | `/projekty` | `projekty.html` | `Projekty domów — FormaDom Studio` |
| 4 | `proces` | `/proces` | `proces.html` | `Proces projektowy — FormaDom Studio` |
| 5 | `cennik` | `/cennik` | `cennik.html` | `Cennik — FormaDom Studio` |
| 6 | `o-nas` | `/o-nas` | `o-nas.html` | `O nas — FormaDom Studio` |
| 7 | `kontakt` | `/kontakt` | `kontakt.html` | `Kontakt — FormaDom Studio` |

Every Page `document.seo.description` is exactly:

`Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.`

`scripts/projekty-domow/pages/shared.ts::buildPageSeed` owns the separate
`seoTitle` and `seoDescription` inputs and writes them into the Page document.
L02 only asserts they survived assembly. Dynamic Aurora SEO is TASK-547-03-L02.

Public anchor translation is closed: `#intro`, `#indywidualne`, `#adaptacje`
and `#wizualizacje` are the only anchors present in the prototype. Do not invent
`#zakres`, `#katalog`, `#etapy`, `#pakiety`, `#podejscie` or `#formularz`.

## Exact Home Matrix (`index.html`)

Visible groups render in this order; groups 1 and 2 are the two columns of one
hero section, not separate public sections:

1. **Hero.** Eyebrow `Pracownia projektów domów przyszłości`; H1 `Dom, który
   wygląda jak przyszłość — i czuje się jak Ty.`; lead `Projektujemy domy
   jednorodzinne z efektem „wow”: czyste bryły, światło, funkcjonalny układ i
   wizualizacje, które pozwalają poczuć przestrzeń zanim powstanie pierwszy
   fundament.` Buttons: `Zaprojektujmy Twój dom` → `/kontakt`, then `Zobacz
   projekty` → `/projekty`. Trust items, in order: `Projekty indywidualne`,
   `Wizualizacje 3D`, `Proces online`.
2. **Hero blueprint content.** Top line `Concept 07 / Modern Barn` and `142 m²`;
   chips `+ duże przeszklenia`, `A++ ready`, `VR / 3D`; metrics `3` / `warianty
   układu`, `21 dni` / `koncepcja`, `96%` / `światło dzienne`. Use safe native
   SVG/gradient/composition primitives. Author exactly one visible Page
   button/link `Przewiń do treści` with `href:"#intro"` and `target:"self"`.
   Do not add a `scrollHint`: its native renderer has no href and always exposes
   a separate screen-reader label, so pairing it with the link would create a
   false second cue. The source's icon-only anchor/pill/dot versus this visible
   text link is bounded explicitly by
   `prototype-css-art-and-motion-approximated`; never use a transparent or
   zero-size click overlay.
3. **Intro strip**, public anchor `intro`: `Nie robimy katalogowych „pudełek”.
   Tworzymy domy, które dobrze wyglądają, dobrze działają i dobrze się starzeją.`
   Ticker items: `minimalizm`, `światło`, `komfort`, `technologia`, `natura`.
4. **Co projektujemy.** Eyebrow `Co projektujemy`; H2 `Architektura, która od
   pierwszego spojrzenia mówi: to mój dom.`; lead `Prowadzimy Cię spokojnie,
   krok po kroku — od pierwszego zachwytu, przez poczucie, że jesteś w dobrych
   rękach, aż po jasny plan działania.` Three cards:
   - `01`, `Projekty indywidualne`, `Dom od zera dopasowany do działki, światła,
     stylu życia i budżetu inwestora.`, `Poznaj zakres` →
     `/oferta#indywidualne`;
   - `02`, `Adaptacje gotowych projektów`, `Modernizacja gotowego projektu tak,
     żeby nie wyglądał jak kompromis.`, `Sprawdź adaptacje` →
     `/oferta#adaptacje`;
   - `03`, `Wizualizacje 3D`, `Fotorealistyczne ujęcia, animacje bryły i
     materiały, które budują emocje.`, `Zobacz możliwości` →
     `/oferta#wizualizacje`.
5. **Style switcher.** Eyebrow `Interaktywne doświadczenie`; H2 `Wybierz klimat,
   w którym czujesz się jak u siebie.`; copy `Dotknij stylu, a bryła i nastrój
   zmienią się w rytm Twoich upodobań. To mały test wyobraźni, zanim zaczniemy
   projektować naprawdę.` The native switcher authors exact
   `props.ariaLabel:"Wybór stylu domu"`, is a keyboard-operable tablist and changes
   visible label/copy/art state:
   - tab `Nowoczesna stodoła` → label `Modern Barn`, copy `Prosta, elegancka
     bryła, wysoki salon, naturalne materiały i duże przeszklenia otwierające dom
     na ogród.`;
   - tab `Miejska willa` → label `Urban Villa`, copy `Horyzontalna kompozycja,
     reprezentacyjne wejście, prywatne patio i wyważony luksus bez krzykliwych
     detali.`;
   - tab `Dom eko` → label `Eco Soft`, copy `Ciepła architektura, zielone
     rozwiązania, kompaktowa forma i materiały, które budują przyjazny
     mikroklimat.`
6. **Wybrane realizacje.** Eyebrow `Wybrane realizacje`; H2 `Domy, które chce się
   oglądać jak ulubiony album z architekturą.`; `Pełne portfolio` → `/projekty`.
   Cards in order: `Dom Aurora` / `Nowoczesna stodoła · 142 m² · ogród
   południowy` → `/projekty/aurora`; `Dom Linea` / `Minimalistyczna willa ·
   188 m²` → `/projekty`; `Dom Nova` / `Parterowy premium · 121 m²` →
   `/projekty`.
7. **Proces bez chaosu.** Eyebrow `Proces bez chaosu`; H2 `Od pierwszej rozmowy
   do gotowego projektu.`; lead `Każdy etap ma prosty cel, jasne decyzje i
   materiały wizualne, które ułatwiają wybór.` Four ordered steps:
   - `01` / `Brief i działka` / `Analiza potrzeb, ograniczeń, stron świata i
     potencjału widokowego.`;
   - `02` / `Koncepcja wow` / `Układ funkcjonalny, bryła, nastrój i pierwsze
     wizualizacje.`;
   - `03` / `Projekt budowlany` / `Dokumentacja techniczna i koordynacja
     branżowa.`;
   - `04` / `Wsparcie` / `Konsultacje materiałowe, zmiany i przygotowanie do
     budowy.`
8. **Final CTA.** Eyebrow `Gotowy na własny dom?`; H2 `Zaprojektujmy dom, do
   którego codziennie chce się wracać.`; copy `Napisz kilka słów o działce i
   stylu, który lubisz — odezwiemy się z pierwszym pomysłem na Twój dom.`;
   `Umów konsultację` → `/kontakt`.

Do not replace these sections with proof metrics, a company-history section or
other authored claims. The exact handcrafted blueprint/house/card art and motion
may use the named L02 visual residual, but all visible source text and native
state changes remain required.

## Exact Offer Matrix (`oferta.html`)

1. Hero: eyebrow `Zakres współpracy`; H1 `Od pierwszej koncepcji po dokumentację
   gotową do budowy.`; lead `Prowadzimy Cię przez cały proces — od pierwszego
   szkicu po dokumentację gotową do budowy. Wybierz zakres, który pasuje do
   miejsca, w którym teraz jesteś.`
2. Five service cards in order:
   - anchor `indywidualne`, number `01`, `Projekt indywidualny domu`, copy
     `Najlepszy wybór, gdy działka, styl życia albo oczekiwany efekt wymagają
     czegoś więcej niż gotowiec.`, items `analiza działki i stron świata`;
     `układ funkcjonalny dopasowany do rodziny`; `bryła, elewacje i materiały`;
     `projekt budowlany i wykonawczy jako opcja`; CTA `Zapytaj o projekt` →
     `/kontakt`.
   - anchor `adaptacje`, number `02`, `Adaptacja projektu gotowego`, copy
     `Dostosowanie gotowego projektu do działki, przepisów i realnych potrzeb
     inwestora.`, items `zmiany układu pomieszczeń`; `korekta elewacji`;
     `dopasowanie do warunków lokalnych`.
   - anchor `wizualizacje`, number `03`, `Wizualizacje i animacje 3D`, copy
     `Materiały, które pomagają zobaczyć proporcje domu, światło i klimat jeszcze
     przed budową.`, items `ujęcia zewnętrzne`; `spacer po bryle`; `plansze
     materiałowe`.
   - no public anchor, number `04`, `Konsultacja działki`, copy `Szybka ocena
     potencjału działki przed zakupem lub przed startem projektu.`, items
     `usytuowanie domu`; `dojazd i widoki`; `ryzyka formalne`.
   - no public anchor, number `05`, `Projekt wnętrz jako rozszerzenie`, copy
     `Spójny styl domu od fasady po salon, kuchnię i prywatne strefy.`, items
     `moodboard`; `układ funkcjonalny`; `materiały i oświetlenie`.
3. Comparison: eyebrow `Jak wybrać?`; H2 `Nie sprzedajemy pakietu na siłę —
   dobieramy zakres do etapu inwestora.` Rows: `Masz tylko pomysł?` / `Konsultacja
   + koncepcja.`; `Masz działkę?` / `Analiza + projekt indywidualny.`; `Masz
   gotowiec?` / `Adaptacja + lifting elewacji.`

Only the first service card has a source CTA. Do not add per-card results,
caretakers, package comparisons or a final offer CTA absent from the source.

## Exact Projects Matrix (`projekty.html`)

1. Hero: eyebrow `Portfolio`; H1 `Domy, w których łatwo wyobrazić sobie własne
   życie.`; lead `Przeglądaj po klimacie, metrażu albo stylu i znajdź projekt,
   przy którym pomyślisz: „właśnie o czymś takim marzyłem”.`
2. The filter controls and collection use native Page bindings to the
   TASK-547-03 content type, query and listing template refs. `projects.ts`
   imports TASK-547-03's `PROJECT_CATEGORY_FILTERS` rather than retyping it.
   The collection authors present-only `props.showCta:false`; the shared Page
   mapper forwards it to `ContentListData.fields.showCta`, suppressing only
   visible CTA chrome while retaining the semantic card anchor.
   Visitor-visible controls are exactly ordered as `all` / `Wszystkie`; `barn` /
   `Nowoczesna stodoła`; `villa` / `Wille`; `single` / `Parterowe`; `eco` /
   `Energooszczędne`, but their native representation is intentionally split:
   - the imported `all` entry becomes a Page button/link labelled `Wszystkie`
     with `href:"/projekty"` and `target:"self"`; it clears the listing query by
     navigation and is never serialized as a category, facet option or query
     parameter;
   - the remaining four imported entries become one native `radio` facet in
     exact order, with `field:"data.categories"` and `op:"eq"`;
   - the Filters block sets `showSearch:false`, `showCount:false`,
     `autoApply:false` and exact `applyLabel:"Pokaż projekty"`.

   Selecting one category and activating `Pokaż projekty` filters the bound
   collection; activating `Wszystkie` returns to the unfiltered `/projekty`
   state. `showCount:false` hides only the outer result count. The existing
   localized native renderer necessarily also shows heading `Filtruj wyniki`,
   description `Zawęź wyniki za pomocą dostępnych filtrów.`, legend `Kategoria`
   and resolved counts `2`, `2`, `2`, `3` beside the four source-ordered options.
   After one choice it shows `1 aktywny filtr`, `Wyczyść wszystko` and
   `Kategoria: <wybrana etykieta>`. These exact, source-absent native labels and
   the reset-link/radio/explicit-apply presentation are the bounded difference
   in `portfolio-filter-and-card-chrome-approximated`; filtering, correct derived
   counts, source option labels/order, reset semantics, published-only data and
   safe query handling are not residuals.
3. Default source order and card text is: `Dom Aurora` / `142 m² · stodoła ·
   eko`, `Dom Linea` / `188 m² · miejska willa`, `Dom Nova` / `121 m² ·
   parterowy`, `Dom Mono` / `156 m² · czarna elewacja`, `Dom Vista` / `206 m² ·
   willa z patio`, `Dom Calm` / `98 m² · kompaktowy`. Aurora links to
   `/projekty/aurora`; the remaining prototype cards link back to `/projekty`.
   The listing template's semantic `href` binding consumes TASK-547-03's
   `data.cardHref`, which wins before the generic detail-route fallback.
   TASK-547-03-L01 owns these fixture values; L01 verifies that the Page binding
   renders them rather than duplicating static project data. The whole rendered
   card is the link and no visible `Zobacz szczegóły` or other CTA label is
   emitted.

Do not introduce style/storey/energy controls, catalogue-year badges, proof
metrics, per-card CTA copy or a closing CTA absent from `projekty.html`.

## Exact Process Matrix (`proces.html`)

1. Hero: eyebrow `Jak pracujemy`; H1 `Spokojna droga od pierwszej rozmowy do
   gotowego projektu.`; lead `Bez chaosu i niedomówień. Na każdym etapie wiesz,
   co się dzieje, jaką decyzję podejmujemy i co będzie dalej.`
2. Five timeline items in order:
   - `01` / `Rozmowa startowa` / `Rozumiemy potrzeby, budżet, styl życia,
     inspiracje i ograniczenia inwestycji.`;
   - `02` / `Analiza działki` / `Sprawdzamy strony świata, dojazd, widoki,
     sąsiedztwo i potencjał bryły.`;
   - `03` / `Koncepcja` / `Tworzymy układ, bryłę, klimat materiałowy i pierwsze
     wizualizacje.`;
   - `04` / `Decyzje projektowe` / `Porównujemy warianty i wybieramy rozwiązania,
     które najlepiej pasują do domu.`;
   - `05` / `Dokumentacja` / `Przygotowujemy projekt budowlany, a następnie
     opcjonalnie wykonawczy i wnętrzarski.`
3. CTA: H2 `Masz działkę? Możemy zacząć od analizy.`; copy `To najprostszy
   sposób, żeby sprawdzić potencjał domu przed dużymi decyzjami.`; `Zacznij od
   briefu` → `/kontakt`.

Do not add result statistics, coordination promises or hidden-stage claims.

## Exact Pricing Matrix (`cennik.html`)

1. Hero: eyebrow `Pakiety`; H1 `Jasne zasady od pierwszej rozmowy — bez ukrytych
   kosztów.`; lead `Poniższe kwoty to orientacyjny punkt wyjścia. Ostateczną
   wycenę zawsze dopasowujemy do Twojej działki, zakresu i marzeń.`
2. Three cards in order:
   - label `Start`; title `Konsultacja działki`; price `od 900 zł`; items
     `analiza możliwości`, `rekomendacje ustawienia domu`, `notatka z
     konsultacji`; CTA `Wybieram start` → `/kontakt`.
   - highlighted label `Najczęściej wybierane`; title `Koncepcja premium`; price
     `od 6 900 zł`; items `2 warianty układu`, `bryła i elewacje`, `wizualizacja
     3D`, `konsultacja online`; CTA `Zapytaj o termin` → `/kontakt`.
   - label `Kompleksowo`; title `Projekt indywidualny`; price `wycena
     indywidualna`; items `pełny proces projektowy`, `koordynacja branżowa`,
     `projekt budowlany`, `opcjonalny wykonawczy`; CTA `Poproś o wycenę` →
     `/kontakt`.

There are no extra included-items or final CTA sections. Prices such as
`4 900 zł`, `38 000 zł` or `52 000 zł` are contract violations.

## Exact About Matrix (`o-nas.html`)

1. Hero: eyebrow `Pracownia`; H1 `Łączymy architekturę, technologię i emocje
   pierwszego wrażenia.`; lead `Jesteśmy niewielką pracownią, która projektuje z
   uważnością — tak, by Twój dom był piękny, wygodny i dobrze się starzał przez
   lata.`
2. Approach: H2 `Nasze podejście`; paragraphs `Dobry dom nie zaczyna się od
   modnej elewacji. Zaczyna się od rozmowy o codzienności: porannej kawie, ciszy,
   pracy, dzieciach, ogrodzie i świetle.` and `Technologię traktujemy jako
   narzędzie: wizualizacje, modele i animacje mają pomagać podejmować lepsze
   decyzje, a nie robić pokaz dla samego pokazu.` Values: `01` / `Proste bryły`;
   `02` / `Naturalne światło`; `03` / `Funkcjonalne układy`; `04` / `Efekt
   premium bez przesady`.
3. Team cards are role-only, with no names or initials: `Architekt prowadzący` /
   `Koncepcja, bryła, funkcja i kontakt z inwestorem.`; `Projektant wnętrz` /
   `Materiały, światło, klimat i spójność przestrzeni.`; `Modelarz 3D` /
   `Wizualizacje, animacje i prezentacje premium.`

Do not add biographies, named team members, company-age metrics or final CTA.

## Exact Contact Matrix (`kontakt.html`)

1. Hero: eyebrow `Zacznij projekt`; H1 `Opowiedz nam o działce, marzeniu albo
   pomyśle na dom.`; lead `Nie musisz mieć gotowego planu ani wiedzy technicznej.
   Wystarczy kilka zdań — resztę spokojnie ustalimy razem.`
2. One real Form block binds to `{ ref:"form", key:"project-brief" }` and sets
   `props.title:PROJECT_BRIEF_FORM_TITLE`, `props.textareaRows:5`,
   `props.showSelectPrompt:false`,
   `props.loadingLabel:PROJECT_BRIEF_LOADING_LABEL`, and
   `props.successBehavior:"show-message-keep-form"`. The Page imports the
   TASK-547-03-owned title/loading constants rather than duplicating them, so
   the native required heading/pending state is deterministic. Public rendering
   must preserve this source field/options order:
   - `Imię i nazwisko`, placeholder `Jan Kowalski`;
   - `E-mail`, placeholder `jan@email.pl`;
   - `Na jakim jesteś etapie?`, options `Mam działkę`, `Szukam działki`, `Mam
     gotowy projekt do adaptacji`, `Chcę tylko konsultację`;
   - `Krótki opis`, placeholder `Napisz, jaki dom Ci się marzy, gdzie jest
     działka i jaki styl lubisz.`, exactly five visible rows;
   - submit label `Wyślij brief`;
   - success message `Dziękujemy! Odezwiemy się z pierwszym pomysłem na Twój dom
     — do usłyszenia.`

   TASK-547-03-L03 stores imported `PROJECT_BRIEF_INITIAL_NOTE` (`Odpisujemy
   zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej
   presji.`) as the Form's present-only `theme.submit.supportingText`. The native
   Form Embed renders it inside the form body immediately after the submit
   control. L01 must not add a sibling Page text block or copy the literal into
   Page data. The Form resource description stays null, so the note is neither
   duplicated nor moved above the fields. On successful native submission the
   `show-message-keep-form` behavior replaces the note with
   `PROJECT_BRIEF_SUCCESS_MESSAGE` while preserving the visible controls,
   matching the pinned handler. The initial supporting text is not shown beside
   the success message, and the form body is never hidden.
   The select has exactly those four substantive options, initially
   `Mam działkę`, with no synthetic blank/English prompt. Pending submit shows
   exact Polish `Wysyłanie...`; reference-defined success behavior remains as
   below. TASK-547-03 owns these constants/fields/actions and may append the native
   required consent/security affordance without replacing source copy. The
   native Form block's extra visible `Zacznij projekt` title is covered only by
   `native-form-heading-approximated`; it cannot justify field/copy/state drift.
3. Direct contact card: H2 `Kontakt bezpośredni`;
   `kontakt@formadom.studio` → `mailto:kontakt@formadom.studio`;
   `+48 500 100 200` → `tel:+48500100200`; `Warszawa / projekty online w całej
   Polsce`.
4. Abstract map: accessible label `Abstrakcyjna mapa lokalizacji`, visible label
   `Studio`. Use native safe gradient/composition primitives only.

Do not add a street address, opening hours, response duration, call length,
metro, parking, district or follow-up timeline absent from the source.

## Native Interaction And Responsive Contract

- Home switcher must change visible panel content and expose correct tablist,
  selected-state, roving-tabindex and panel visibility semantics. Native
  accessibility improvements do not alter source copy.
- The sole `Przewiń do treści` Page link targets the real `#intro`. No
  `scrollHint` is authored because it would expose a second accessible cue with
  no target. Source CTAs use exact routes above.
- Magnetic is present only on source magnetic CTAs. Exact pointer math/timing is
  a visual residual, not a reason to remove the visible effect.
- The Projects reset link removes the category parameter. The native radio
  group exposes checked state, and `Pokaż projekty` changes visible results;
  loading/error/empty states remain accessible through the listing contract.
- Tablet/mobile overrides preserve source section order and readable geometry.
  Coderso device boundaries replace only the exact 1060/700 px trigger values.
- Every visible Page effect and layout claim must be tested through rendered
  DOM/ARIA/computed state, not only serialized property presence.

## Page Editor Runtime Smoke Handoff

This leaf owns only the production Page/control contracts and their normal test
lanes. TASK-547-06-L01 solely owns the tracked smoke registry, scenario files,
standalone smoke tests and evidence. Its canonical registry must preserve these
ordered handoff IDs:

14. `page-editor-switcher-author-light` (`1440x1000`);
15. `page-editor-switcher-tablet-reset` (`1024x1366`);
16. `page-editor-collection-cta-dark` (`1440x1000`);
17. `page-editor-form-presentation-save-reload` (`1440x1000`);
18. `page-editor-publish-front-parity` (`390x844`).

Each ID is one independently runnable tracked scenario and one independently
runnable matching test under `scripts/task-547-runtime-smoke/` and
`tests/unit/workflows/task547RuntimeSmoke/scenarios/`. It owns its complete
arrange/act/assert flow, starts from the canonical installed state, uses a fresh
close/open cycle for exact session `wf547pageeditor`, proves material
DOM/ARIA/computed-style/geometry or save/reload/publish-front effects, records
zero console and page errors, restores exact state, and produces only its own
validated `result.json` plus byte-distinct viewport PNG after cleanup succeeds.
No scenario may import or depend on predecessor state. The tracked registry and
scenario modules, not this production leaf, own their selectors, assertion IDs,
normalized live Page URLs and detailed smoke lifecycle.

## Security Contract

No endpoint. Only strict Page v2 primitives and sanitizer-owned inline SVG are
allowed; no raw HTML, JavaScript, CSS or remote-fetch URL. Ref-bearing projects
and contact documents pass package-aware validation before ref substitution and
native strict normalization. Links use sanitized canonical paths/schemes.

## Implementation Pseudocode

```ts
export function normalizeSwitcherAriaLabel(
  value: unknown,
  mode: "write" | "stored-read",
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    if (mode === "write") throw pageDocumentInvalid("switcher.props.ariaLabel");
    return undefined;
  }
  const label = value.trim();
  if (label.length === 0) return undefined; // explicit editor clear
  if (label.length > PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH) {
    if (mode === "write") throw pageDocumentInvalid("switcher.props.ariaLabel");
    return undefined;
  }
  return label;
}

export const resolveSwitcherAriaLabel = (value: unknown): string => {
  const label = typeof value === "string" ? value.trim() : "";
  return label.length > 0 && label.length <= PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH
    ? label
    : PAGE_SWITCHER_DEFAULT_ARIA_LABEL;
};

// In the real switcher branch retained in pageRendererV2.tsx:
<div role="tablist" aria-label={resolveSwitcherAriaLabel(block.props.ariaLabel)} />;

const switcherAriaLabelControl = control({
  id: "block.switcher.props.ariaLabel",
  panel: "content",
  target: "block",
  label: "Tab list label",
  path: ["props", "ariaLabel"],
  input: "text",
  responsive: false,
});

const effectiveMutationDevice = (
  device: PageBreakpoint,
  control: PageEditorControlDefinition,
): PageBreakpoint => control.responsive === false ? "desktop" : device;

const normalizeOptionalTextCommit = (
  control: PageEditorControlDefinition,
  value: unknown,
): unknown | typeof DELETE_PATH =>
  control.input === "text" &&
  control.fallback === undefined &&
  typeof value === "string" &&
  value.trim().length === 0
    ? DELETE_PATH
    : value;

// patchBlockControlForDevice uses effectiveMutationDevice and recursively
// deleteNestedPathValue(...), including empty-parent compaction.

type StaticSeo = { title: string; description: string };

export function buildPageSeed(input: {
  key: FormaDomPageKey;
  route: string;
  seo: StaticSeo;
  sections: PageSectionV2[];
  bindings?: readonly FormaDomPageBinding[];
}): ResourceSeed {
  assertExactSectionMatrix(input.key, input.sections);
  const nativeDocument = normalizePageDocumentV2ForWrite({
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: input.seo,
    settings: buildFormaDomPageSettings(),
    sections: input.sections,
  });
  const document = input.bindings?.length
    ? attachPackageRefsAtAllowedPageBlockPaths(nativeDocument, input.bindings)
    : nativeDocument;
  return {
    key: input.key,
    desired: {
      title: input.seo.title,
      slug: input.route,
      status: "published",
      document,
    },
  };
}

const PAGE_BINDING_PLACEHOLDERS = {
  projectContentType: "00000000-0000-4000-8000-000000000561",
  projectListingQuery: "00000000-0000-4000-8000-000000000562",
  projectListingTemplate: "00000000-0000-4000-8000-000000000563",
  projectBriefForm: "00000000-0000-4000-8000-000000000564",
} as const;

function buildProjectControls(): PageBlockV2[] {
  const [reset, ...categories] = PROJECT_CATEGORY_FILTERS;
  assertExactReset(reset, { value: "all", label: "Wszystkie" });
  return [
    pageButton(reset.label, "/projekty", { target: "self" }),
    pageFilters({
      id: "projects-filters",
      queryId: PAGE_BINDING_PLACEHOLDERS.projectListingQuery,
      showSearch: false,
      showCount: false,
      autoApply: false,
      applyLabel: "Pokaż projekty",
      facets: [{
        id: "category",
        kind: "radio",
        label: "Kategoria",
        field: "data.categories",
        op: "eq",
        options: categories,
      }],
    }),
    pageCollection({
      id: "projects-collection",
      contentTypeId: PAGE_BINDING_PLACEHOLDERS.projectContentType,
      queryId: PAGE_BINDING_PLACEHOLDERS.projectListingQuery,
      templateId: PAGE_BINDING_PLACEHOLDERS.projectListingTemplate,
      showCta: false,
    }),
  ];
}

const projectBindings = (
  refs: FormaDomPageRefs,
): readonly FormaDomPageBinding[] => [
  { sectionId: "projects-browser", blockId: "projects-filters",
    blockType: "filters", prop: "queryId", value: refs.listingQuery },
  { sectionId: "projects-browser", blockId: "projects-collection",
    blockType: "collection", prop: "contentTypeId", value: refs.contentType },
  { sectionId: "projects-browser", blockId: "projects-collection",
    blockType: "collection", prop: "queryId", value: refs.listingQuery },
  { sectionId: "projects-browser", blockId: "projects-collection",
    blockType: "collection", prop: "templateId", value: refs.listingTemplate },
];

function buildHomeScrollControl(): PageBlockV2 {
  return pageButton("Przewiń do treści", "#intro", { target: "self" });
}

function buildContactForm(): PageBlockV2 {
  // Supporting text is already owned by the referenced Form theme.
  return pageForm({
    id: "contact-form",
    formId: PAGE_BINDING_PLACEHOLDERS.projectBriefForm,
    title: PROJECT_BRIEF_FORM_TITLE,
    textareaRows: 5,
    showSelectPrompt: false,
    loadingLabel: PROJECT_BRIEF_LOADING_LABEL,
    successBehavior: "show-message-keep-form",
  });
}

const contactBindings = (form: PackageRef): readonly FormaDomPageBinding[] => [{
  sectionId: "contact-form-section",
  blockId: "contact-form",
  blockType: "form",
  prop: "formId",
  value: form,
}];

// buildProjectsPage/buildContactPage create native sections with the placeholder
// controls above, then pass projectBindings(refs)/contactBindings(form) to
// buildPageSeed({ ..., bindings }); PackageRef never enters native normalization.
export const buildFormaDomPages = (refs: FormaDomPageRefs): ResourceSeed[] =>
  [
    buildHomePage(),
    buildOfferPage(),
    buildProjectsPage({ controls: buildProjectControls(), bindings: projectBindings(refs) }),
    buildProcessPage(),
    buildPricingPage(),
    buildAboutPage(),
    buildContactPage({ form: buildContactForm(), bindings: contactBindings(refs.form) }),
  ];
```

**Data flow:** strict present-only Page-core schema/normalizer/editor/renderer →
Page collection/Form props mapped into Content List/Form Embed contracts →
frozen source constants → page-specific builders → L01-owned shared Page/SEO
helper → exact direct-root-block package-ref insertion → closed graph validation
→ ordered seeds consumed by L02.
Ref-free documents may normalize natively immediately; ref-bearing Page
documents normalize natively only after installer substitution.

**Error handling:** throw on unknown/invalid/overlong fresh switcher fields,
wrong-type collection CTA visibility, invalid Form presentation value,
missing/extra section, duplicate block/section ID, copy/order mismatch, unknown
route/anchor, unsafe link, missing/duplicate/wrong-kind/wrong-path package
binding, incorrect SEO pair or invented public claim. Never transform an
ordinary string merely because it equals a resource key or placeholder. Stored
malformed accessible names/presentation props fail soft to omission/native
fallback without degrading the Page; required FormaDom source content is never
silently pruned.

## Regression Tests

`tests/vitest/kits/projekty-domow-pages.test.ts` must stay modular and under
1,000 physical lines. If the exact-copy matrix outgrows one focused suite, split
it by page family into independently runnable Vitest files and update single-
writer/workflow ownership before appending.

The five new Page-core suites are independently runnable and each remains below
1,000 lines:

- `page-switcher-aria-label-contract.test.ts`: strict allowlist/schema, exact
  Polish write/read round trip, blank clear/omission, wrong-type/overlong write
  rejection, malformed stored-read omission, responsive rejection and absent
  normalized-JSON byte identity;
- `page-switcher-aria-label-render.test.tsx`: exact Polish accessible name,
  unchanged unauthored `Content tabs` SSR bytes, defence-in-depth fallback and
  React-escaped hostile-looking text;
- `page-switcher-aria-label-editor.test.ts`: exactly one base-only control with
  the frozen id/path/panel/input and no fallback/default; tablet/mobile commits
  mutate only the desktop/base value, never create overrides, and a blank commit
  deletes the key with empty-parent compaction;
- `page-data-block-presentation.test.tsx`: strict present-only collection/Form
  allowlists, owner bounds/enums, round trips, responsive rejection, malformed
  stored omission, absent JSON/SSR byte identity, both renderer bridges,
  semantic href preservation, exact control/reset metadata and FormaDom values;
- `page-renderer-v2-module-boundaries.test.ts`: explicit facade surface,
  one `PageDocumentError` owner, acyclic direct internal imports, no server/DB/
  settings coupling, all renderer support modules below 1,000 lines, and the
  trusted source-scan sinks retained in the composition root.

Do not append to the existing oversized `page-document-v2.test.ts` (3,279),
`page-renderer-v2.test.tsx` (5,696) or
`page-editor-control-registry.test.ts` (1,893). They stay read-only regression
gates; weakening/source-rebaselining their security assertions is forbidden.

The tests assert:

- exact seven-seed order, route/status/envelope shape and static SEO pairs;
- full per-page section/copy/list/link/anchor order above, including source
  prices/contact/team and absence of known fabricated strings;
- home switcher stores exact `ariaLabel:"Wybór stylu domu"` while every
  unauthored switcher omits the key;
- projects/form refs at only allowlisted paths and no embedded DB IDs;
- exactly the five package Page bindings listed above, with rejection of
  missing/duplicate/nested/wrong-block/wrong-property/wrong-kind bindings; an
  ordinary string equal to every resource key and placeholder is never
  transformed;
- imported `PROJECT_CATEGORY_FILTERS` decomposes without retyping into one
  `Wszystkie` reset link plus exactly four serialized radio options; `all` is
  absent from facet/query data; initial DOM pins localized heading/description,
  `Kategoria`, exact counts `2/2/2/3` and `Pokaż projekty`; selected DOM pins
  `1 aktywny filtr`, `Wyczyść wszystko` and the exact selected public label;
  every rendered card href equals its strict `data.cardHref` source value and
  `props.showCta:false` maps to `fields.showCta:false`, so no visible
  project-card CTA copy is emitted;
- Form block title exactly equal to imported `PROJECT_BRIEF_FORM_TITLE`, whose
  frozen value is `Zacznij projekt`, with no blank, `Zapytaj o projekt` or
  resource-name fallback; it maps exact `textareaRows:5`,
  `showSelectPrompt:false`, Polish loading label and
  `show-message-keep-form`, while an unauthored Page Form preserves all native
  default JSON/SSR bytes;
- the Form resource contributes no visible description, its owned
  `theme.submit.supportingText` equals `PROJECT_BRIEF_INITIAL_NOTE`, and the Page
  document contains no sibling copy of that note;
- the visible scroll link is the only scroll cue, owns exact `#intro` navigation
  and the Page contains no `scrollHint`; functional switcher/magnetic/facet
  behavior and mobile/tablet render state through DOM/ARIA, not
  serialized-presence-only checks;
- no deprecated widget template, raw code, remote media or invented anchors;
- deterministic output and line-count compliance;
- exact shared source palette use, source aqua/mint pricing highlight and
  rejection of stale scaffold colors.

## Sub-Tasks

- [ ] Split the Page document, renderer and editor registry into the frozen
  cohesive module map while preserving public imports and trusted sinks.
- [ ] Add the strict present-only switcher accessible-name contract, editor
  control and exact Polish FormaDom value.
- [ ] Add strict present-only collection/Form presentation props, renderer
  bridges and editor controls; author only the exact FormaDom values.
- [ ] Correct all seven Page v2 documents, static SEO, source copy, links,
  anchors and native interaction bindings.
- [ ] Add the five focused Page-core suites and pass the source-fidelity,
  renderer/editor regression and line-count gates.

## Testing Requirements

- named Page generator and five focused Page-core Vitest suites above;
- read-only existing Page v2 schema/renderer/editor/interactivity/responsive
  suites, including TASK-534 model/render and all three oversized legacy suites;
- TASK-547-06's owned
  `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx` must assert the
  rendered home tablist name, and its separate
  `tests/integration/kits/projektyDomowInstalledAccessibility.test.ts` must
  repeat it through the real `handlePublicRequest`; neither file moves to L01;
- `bun --cwd core lint` and `bun --cwd core lint:types`;
- `wc -l` on every touched production/test file, with 1,000 as a hard maximum;
- L01 runtime-visible scenario coverage handed to TASK-547-06 final smoke,
  where `home-desktop-effects/home-switcher-accessible-name` observes the
  tablist's exact accessible name `Wybór stylu domu`.

## Documentation Updates Required

Send the final route/section/SEO matrix and verified visual-residual inputs to
TASK-547-06; do not edit shared docs or changelog from this leaf.
