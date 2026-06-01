# RAPORT: Section Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Section`
> **Admin page id:** `b9cb534f-1400-45b9-ba53-c3a27bad46a5`
> **Public route:** `/audit-31-05-section`
> **Dodatkowe runtime routes:** `/audit-31-05-section-rich`, `/audit-31-05-section-div`, `/audit-31-05-section-unsafe`, `/audit-31-05-section-unsafe-strings`
> **Playwright sessions:** `section-fixture-31`, `section-admin-31`, `section-admin-advanced-31`, `section-public-31`
> **Claude:** lokalny CLI nadal blokuje wspolprace: `401 Invalid authentication credentials`. Raport opiera sie na Playwright + audycie kodu Codex.

## Metoda

Test byl prowadzony od UI na stronie audytowej z blokiem `section`.
Przed testem przeczytano `_docs/_WIDGETS/SECTION.md`, taski `TASK-283`,
`TASK-318`, `TASK-326`, `TASK-256-05-01`, implementacje
`core/widgets/core/section.tsx`, edytory
`core/admin/ui/widgets/editors/SectionEditors.tsx` oraz testy
`tests/vitest/widgets/section.test.tsx` i
`tests/vitest/ui/section-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano kontrolowane strony:

- `/audit-31-05-section-rich` - bleed/full width, heading `h4`, grid 2 regions,
  responsive padding, gradient, overlay, image background, shadow/motion,
  custom editor-only region labels,
- `/audit-31-05-section-div` - contained `div`, dirty anchor input, row flow,
  contained shadow fallback,
- `/audit-31-05-section-unsafe` - invalid enum payload to prove public schema
  rejection path,
- `/audit-31-05-section-unsafe-strings` - valid enums plus unsafe style/media
  strings to test renderer fail-closed behavior.

Admin UI pass objal Wizard, Visual, Advanced, quick presets, variant cards,
heading, section link/accessibility, width/spacing, surface controls,
background media, regions and shared block controls. Public runtime sprawdzono
realnym DOM-em: element type, anchors, labels/headings, data markers, slot
regions, background layers, overlay, unsafe strings, empty placeholders and
overflow.

## Pokrycie UI

Przetestowane:

- Wizard read-only starter summary,
- Visual: presets, variants, heading copy/level/alignment/sizes/colors,
  section link/accessibility, width, min-height, region flow/columns/gaps,
  responsive padding, gradient/overlay sliders, border/radius/shadow/motion,
  background media controls and region controls,
- Advanced: technical tokens/support/boundary summaries jako read-only,
- public runtime: default empty section, rich bleed section, `div` semantics,
  strict invalid payload fallback, unsafe style/media string payload.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-section` i zaznaczony blok | Canvas pokazuje pusty Section; Visual root istnieje. | HTTP 200, `<section data-section-variant="default">`, `regions=1`, brak `Empty region.`. | Dziala | Public placeholder jest gated przez render context. | Brak. |
| Wizard | `Run setup again` | Wizard pokazuje read-only `Section layout: Default`; `writablePaths=[]`, `readonlyPaths=["variant"]`. | Nie dotyczy. | Dziala | Wizard jest summary-only zgodnie z docs. | Brak. |
| Visual sections | Otwarcie Visual | Sekcje: Variant/structure, Heading, Link/accessibility, Width/spacing, Surface, Background media, Regions, shared layout/visibility. | Rich fixture odzwierciedla ustawienia. | Dziala | Section Visual jest single ownerem daily editing. | Region metadata gap w `SC-31-05-03`. |
| Advanced | Klik Advanced | `writablePaths=[]`, `rawControlCount=0`; summaries: layout, surface, semantics, heading, media, visual effects, boundaries. | Nie dotyczy. | Dziala | `SectionAdvancedEditor` ma tylko `ReadonlyWidgetSummaryRow`. | Brak. |
| Quick presets | Visual preset cards | Karty Standard, Framed, Edge-to-edge, Hero band, Two-column region group widoczne z Apply. | Nie dotyczy bez zapisu. | Dziala UI | Presety batch-applikuja wariant i tokeny. | Brak; duplicate paths sa jawnie allowance dla presetow. |
| Variant `default` | Baseline | Default selected. | Public marker `data-section-variant="default"`, wrapper `max-w-6xl px-6`. | Dziala | `resolveSectionVariant()` fallbackuje do default. | Brak. |
| Variant `bleed` + full width | Rich fixture | Visual copy tlumaczy, ze true edge-to-edge wymaga Full width + No max width. | Public marker `bleed`, `containerWidth=full`, `maxWidth=none`, class `w-full`. | Dziala | Layout i variant sa osobne, ale copy jest truthful. | Brak. |
| Variant `contained` | Div fixture | Contained variant dostepny. | Public marker `contained`, radius `rounded-lg`, shadow fallback `shadow-sm`, border 1px. | Dziala | `resolveRenderedSectionShadow()` daje contained fallback. | Brak. |
| Heading copy/level | Rich/div fixtures | Heading controls dla label/title/description/level/align/sizes/colors. | Rich renderuje `H4`, div renderuje `H3`, default title level bez override zostaje `H2`. | Dziala | `resolveSectionHeadingLevel()` ogranicza `h1`-`h6`, domyslnie `h2`. | Brak. |
| Heading colors | Rich fixture | Swatch controls i clear buttons. | Public H4 ma `style="color:var(--color-primary)"`; label/description maja ustawione kolory. | Dziala dla safe values | Kolory ida do inline style po `resolveClearableStyleValue`. | Unsafe strings w `SC-31-05-01`. |
| Section link / anchor | Div fixture z ` Bad Anchor !! ` | Visual helper mowi, ze spacje/punctuation sa konwertowane. | Public `id="Bad-Anchor"`, brak raw punctuation; unsafe strings route `id="unsafe-strings-anchor"`. | Dziala | `sanitizeSectionAnchorId()` usuwa/normalizuje niebezpieczne znaki. | Brak. |
| Element type | Div fixture | Select `Page section / Generic div`. | Public root tag `DIV`, marker `data-section-element="div"`, aria label zachowany. | Dziala | `Element = semantics.element === "div" ? "div" : "section"`. | Brak. |
| Width and max width | Rich/div fixtures | Friendly labels, `Wide alias` guidance. | Rich `full/none`; div `wide/7xl` nadal `mx-auto w-full max-w-7xl`. | Dziala/truthful | Docs i Visual copy mowia, ze `wide` jest aliasem wrappera. | Brak. |
| Min height | Rich fixture | Select Minimum height. | Public `data-section-min-height="hero"`, class `min-h-[70vh]`. | Dziala | Bounded class map. | Brak. |
| Region flow / columns | Rich/div fixtures | Grid columns disabled until flow=Grid; row/grid controls widoczne. | Rich `regionFlow=grid`, `regionColumns=2`; div `regionFlow=row`. | Dziala | Normalizer ustawia columns only for grid. | Brak. |
| Regions / slots | Rich fixture | Regions section z Add Region i Region label. | Public ma `region:1`, `region:2`, oba z child spacer; editor-only labels nie leakujace do body. | Dziala runtime | Public uzywa slot ids, nie label text. | Metadata gap w `SC-31-05-03`. |
| Empty public region | Baseline | Canvas moze pokazywac editor placeholder. | Public nie zawiera `Empty region.` mimo pustego regionu. | Dziala | `renderEditorPlaceholder()` ukrywa placeholder poza editor-preview. | Brak. |
| Responsive padding | Rich fixture | Mobile/desktop padding selects. | Public class `py-4 md:py-10`, potwierdza mobile override + desktop restore. | Dziala | `resolveResponsiveSpacingClass()` sklada base/desktop class maps. | Brak. |
| Gradient and overlay | Rich fixture | Slider/stepper dla angle i opacity. | Public decorative surface ma `linear-gradient(135deg...)`; overlay layer count 1. | Dziala dla safe values | Surface layer jest oddzielony od content flow. | Unsafe strings w `SC-31-05-01`. |
| Background media image | Rich fixture | Background media controls dostepne. | Public `data-section-background-media="image"`, media layer `url(/media/section-audit.jpg)`, opacity 0.55, blend multiply. | Dziala dla safe image URL | `resolveRenderableSectionMediaSrc()` dopuszcza safe image patterns. | Unsafe style strings w `SC-31-05-01`; unsafe media URL fail-closed. |
| Unsafe media URL | Unsafe strings fixture | Nie dotyczy UI; legacy/import edge. | Root marker `backgroundMedia=none`, brak media node z `javascript:`. | Dziala | Media src jest filtrowane. | Brak dla media URL. |
| Invalid enum payload | Unsafe fixture | Nieosiagalne przez normalne UI; odtworzone przez admin API. | Public HTTP 200, ale widget zamieniony na `Invalid widget data (...) heading/level`. | Czesciowo nie dziala w route contract | Save/publish przyjal invalid widget JSON, public renderer odrzucil dopiero przy renderze. | Patrz `SC-31-05-02`. |
| Unsafe style strings | Unsafe strings fixture | Legacy/import edge; UI swatche nie tworza takich wartosci. | Public inline style zawiera raw `url(javascript:alert(1))`, `linear-gradient(... javascript:alert(1) ...)`, `expression(alert(1))`. | Nie dziala | Style normalizacja tylko trimmuje stringi. | Patrz `SC-31-05-01`. |
| Sticky child containment | Code/runtime DOM | Nie testowano sticky motion przez brak CSS assets, ale DOM structure widoczny. | Content flow nie ma starego `relative w-full overflow-hidden`; clipping siedzi w decorative layer `absolute inset-0 overflow-hidden`. | Dziala kontrakt HTML | TASK-318 wrapper split jest obecny. | Brak. |

## Znaleziska do poprawy

### SC-31-05-01 - Unsafe style/color strings przechodza do public inline style

**Objaw:** `/audit-31-05-section-unsafe-strings` ma poprawne enumy, ale
niebezpieczne stringi w polach stylu. Public DOM:

```json
{
  "path": "/audit-31-05-section-unsafe-strings",
  "hasRawUnsafe": true,
  "clippedStyle": "background-color:url(javascript:alert(1));background-image:linear-gradient(360deg, javascript:alert(1), #ffffff);border-color:expression(alert(1));border-style:solid;border-width:1px",
  "attrs": { "backgroundMedia": "none" }
}
```

Media URL `javascript:` jest fail-closed, ale surface color, gradient stops,
border color i overlay color nie sa filtrowane przed serializacja inline CSS.

**Dlaczego:**

- `resolveClearableStyleValue()` tylko trimuje string:
  `core/widgets/core/clearableStyle.ts:3-7`.
- Section przekazuje te wartosci bez runtime color normalizer:
  `core/widgets/core/section.tsx:1087-1093`,
  `core/widgets/core/section.tsx:1229-1233`,
  `core/widgets/core/section.tsx:1319`.
- Schema dla tych pol to zwykly `type: "string"`:
  `core/widgets/core/section.tsx:372-381`.

**Jak naprawic:**

1. Dodac Section/shared render color normalizer dla `backgroundColor`,
   `gradientFrom`, `gradientTo`, `borderColor`, `overlayColor` i heading color.
2. Dopuszczac tylko bezpieczne wartosci: hex, `var(--token)`, `rgb/rgba`,
   `hsl/hsla`, `transparent/currentColor/inherit` i ewentualnie nazwane kolory.
3. Zachowac replace-or-clear kompatybilnosc w editorze, ale runtime powinien
   omitowac unsafe custom strings.
4. Dodac test: unsafe `url(...)`, `javascript:`, `expression(...)` nie pojawia
   sie w HTML, a safe `var(--color-primary)` i hex nadal renderuja sie.

### SC-31-05-02 - Admin save/publish przyjmuje invalid widget payload, public odrzuca dopiero render

**Objaw:** `/audit-31-05-section-unsafe` zapisano przez admin API z
`heading.level="h8"`, `borderWidth="9"` i `radius="circle"`. Save/publish
przeszedl, a public route zwrocila HTTP 200 z invalid widget placeholder:

```html
Invalid widget data (widget_schema_invalid: data/heading/level must be equal to one of the allowed values): section
```

**Dlaczego:**

- Public `WidgetRenderer` waliduje schema przed renderem i poprawnie blokuje
  invalid enum.
- Admin page save/publish path pozwolil jednak zapisac payload, ktory public
  renderer uznaje za niezgodny ze schema.
- Normalizer ma fallbacki dla czesci invalid wartosci, ale nie zdazy sie
  wykonac, gdy `normalizeWidgetBlock()` odrzuca schema na granicy renderera.

**Jak naprawic:**

1. Walidowac widget blocks przy admin save/publish/import/assistant mutation
   tym samym kontraktem, ktorego uzywa public renderer.
2. Dla legacy danych wybrac jedna strategie: strict reject na write albo
   non-destructive migration/normalization przed persist.
3. Dodac route/service test: invalid Section enum payload nie moze zostac
   opublikowany jako public invalid widget.

### SC-31-05-03 - Region controls dzialaja, ale metadata dla builder-owned akcji i labela jest niepelne

**Objaw:** Visual probe pokazal `unwrappedControls` dla `Add Region`, a
`Region 1` label input ma `path=null` i `ownership="action"` mimo ze modyfikuje
Section-owned `regions[]` metadata:

```json
{
  "unwrappedControls": [{ "tag": "BUTTON", "text": "Add Region" }],
  "sampleControls": [
    { "text": "Region 1", "path": null, "ownership": "action" }
  ]
}
```

Public runtime dziala, a labels nie leakujace do body, ale automatyzacja i
kontrakt docs mowia o stable `data-widget-control` metadata dla shared inspector
rows.

**Dlaczego:**

- Region count i slot actions sa renderowane przez shared builder controls w
  `section.regions`, a nie przez Section-local `WidgetControlRow`.
- Section docs mowia, ze Section owns optional editor-only region labels keyed
  by stable slot instance id, ale DOM row nie mapuje label inputu do np.
  `regions` / `regions.<id>.label`.

**Jak naprawic:**

1. Opakowac `Add Region` jako action-owned `data-widget-control`, tak jak inne
   shared slot actions.
2. Nadac region label inputs stabilny path (`regions` albo
   `regions.<instanceId>.label`) oraz read/write ownership zgodny z persisted
   data.
3. Dodac test DOM metadata dla Section Regions: no unwrapped action button i
   region label ma path.

## Co dziala

- Wizard jest read-only i nie mutuje Section.
- Visual ma kompletna IA i wiekszosc kontrolek ma stabilne
  `data-widget-control-path`.
- Public runtime nie leakujacy `Empty region.` ani editor-only region labels.
- Anchor sanitizer, bounded heading levels, div/section element switch,
  region flow, responsive padding, background media URL filtering, clipping
  wrapper split i Advanced read-only summaries dzialaja.

## Walidacja

Do wykonania po zapisie raportu:

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SECTION_WIDGET.md _docs/PLAYWRIGHT/31-05-2026-widgets/README.md`
