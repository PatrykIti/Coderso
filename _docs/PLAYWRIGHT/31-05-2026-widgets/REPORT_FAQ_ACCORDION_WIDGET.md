# RAPORT: FAQ Accordion Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 FAQ Accordion`
> **Admin page id:** `4926b078-71c2-425b-8c39-a7f4501ea3e7`
> **Public route:** `/audit-31-05-faq-accordion`
> **Playwright sessions:** `codex-31-05-ui-faq`, `codex-31-05-public-faq`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI:

1. Otworzono swieza strone `/audit-31-05-faq-accordion`.
2. Zaznaczono blok w page builderze i klikano kontrolki Visual/Advanced.
3. Efekt sprawdzano w admin live preview po `data-faq-*`, `details.open`,
   klasach, inline styles i tekstach diagnostycznych.
4. Public route sprawdzono w przegladarce Playwright, z wykonaniem klientowego
   skryptu FAQ.
5. Dla dryftu admin/public wykonano audyt kodu w `faqAccordion.tsx`.

## Pokrycie UI

Przetestowane:

- warianty: Single Column, Two Column, Compact,
- item count, Add item, Move down, Remove z confirm dialogiem,
- header copy, question, answer, icon, Markdown answer,
- allow multiple open, default all collapsed, klikanie disclosure,
- max width, spacing, header alignment, title size, padding, motion,
- paleta Dark, wszystkie glowne kolory, radius, border width, Clear,
- search enhancement / JSON-LD,
- Advanced summaries,
- public runtime `aria-expanded` sync.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Single Column | Domyslny stan / powrot | `data-faq-variant="single-column"`, list `grid grid-cols-1 gap-3`. | Public baseline renderuje single-column SSR. | Dziala | Renderer wybiera single-column, gdy wariant nie jest `two-column`/`compact`. | Brak. |
| Variant: Two Column | Klik `Two Column` | `data-faq-variant="two-column"`, list `lg:grid-cols-2`. | Nie publikowano tej zmiany. | Dziala | `listClassName` dodaje `lg:grid-cols-2`. | Brak. |
| Variant: Compact | Klik `Compact` | Header `text-xl`, summary `text-sm`, answer `text-xs`, padding `px-4 py-3`. | Nie publikowano tej zmiany. | Dziala | `compact` przelacza klasy header/summary/answer. | Brak. |
| Questions count | Select `5` | `data-faq-count="5"` i 5 paneli. | Nie publikowano tej zmiany. | Dziala | `setItemCount` normalizuje tablice items. | Brak. |
| Add item | Klik `Add item` | Count rosnie do 6. | Nie publikowano tej zmiany. | Dziala | `addItem` respektuje `faqAccordionItemMax`. | Brak. |
| Move item down | Klik move down dla pierwszego itemu | Pierwszy panel zmienia sie na poprzedni drugi item. | Nie publikowano tej zmiany. | Dziala | `moveItem` zmienia kolejnosc tablicy. | Brak. |
| Remove item | Klik remove, potem confirm | Dialog `Remove FAQ item?`; po confirm count spada do 5. | Nie publikowano tej zmiany. | Dziala | `pendingDeleteId` + `ConfirmActionDialog`. | Brak. |
| Header copy | Fill title/description | Header pokazuje `31-05 FAQ Audit` i nowy helper. | Nie publikowano tej zmiany. | Dziala | `updateHeader` aktualizuje `header.*`. | Brak. |
| Question / answer / icon | Fill pierwszego itemu | Preview pokazuje nowa question/answer; ikona z pola icon renderuje sie przed pytaniem. | Nie publikowano tej zmiany. | Dziala | `updateItem` aktualizuje item; renderer pokazuje `icon`, gdy niepusty. | Brak. |
| Answer mode Markdown | Select `Markdown`, wpis `**Bold answer** with [link](/audit-31-05-hero).` | Answer renderuje `Bold answer with link.` jako sformatowana tresc; link jest bezpieczny. | Nie publikowano tej zmiany. | Dziala | `renderFaqMarkdownAnswer` renderuje ograniczony markdown i safe href. | Brak. |
| Allow multiple open | Toggle on | `data-faq-multiple-open="true"`; po kliknieciu dwa `details` moga byc otwarte naraz. | Nie publikowano tej zmiany. | Dziala | Renderer usuwa `name` z `details`, gdy multiple open jest true. | Brak. |
| Default open item: None | Select `None (all collapsed)` | `data-faq-default-open="-1"` i wszystkie `details.open=false` przed kliknieciem. | Nie publikowano tej zmiany. | Dziala | `resolveDefaultOpenIndex` akceptuje `-1`. | Brak. |
| Admin disclosure click | Klik pierwsze i drugie summary | `details.open` zmienia sie poprawnie (`true,true,...` przy multiple open). `summary[aria-expanded]` zostaje `null`. | Public runtime synchronizuje `aria-expanded`, patrz nizszy wiersz. | **Czesciowo** | W admin React preview dynamicznie wstawiony `<script>` z widgetu nie wykonuje sie tak jak parser HTML na public SSR. Sam disclosure dziala, ale atrybut a11y nie jest dosynchronizowany w adminie. | Jesli admin preview ma byc pelnym runtime mirror, uruchamiac runtime scripts po renderze canvasu albo dodac preview-only effect dla FAQ. |
| Public disclosure `aria-expanded` | Otworz public route w Playwright i kliknij drugi summary | Initial: `["true","false","false"]`; po kliknieciu: `["false","true","false"]`; root ma `data-coderso-faq-bound="true"`. | Dziala. | Dziala publicznie | `faqRuntimeClientScript` binduje root i synchronizuje summary atrybuty po `toggle`. | Brak dla public. |
| Spacing | Select `Spacious` | `data-faq-spacing="lg"`, list `gap-4`, summary/answer padding `px-6 py-5`. | Nie publikowano tej zmiany. | Dziala | `spacingClassMap` i `panelPaddingClassMap` sa spiete. | Brak. |
| Layout/typography | Select Full width, Right, Extra large title, Roomy padding, Smooth motion | Root `max-w-none px-6 py-12`; heading `text-3xl`; `motion=smooth`; answer wrapper uzywa smooth classes. | Nie publikowano tej zmiany. | Dziala | Mapy max width, padding, title size i motion dzialaja. | Brak. |
| Palette: Dark | Klik `Dark` | Panele zmieniaja surface/border na ciemne RGB. | Nie publikowano tej zmiany. | Dziala | Preset zapisuje jawne `style.*`. | Brak. |
| Kolory i panel style | Ustaw surface/border/divider/question/answer/header kolory, radius XL, border 3px | Panele `rounded-2xl`, `border-width: 3px`, kolory w preview aktualizuja sie; labels `Selected color`. | Nie publikowano tej zmiany. | Dziala | `ColorField`, `panelRadius`, `borderWidth` aktualizuja style renderer. | Brak. |
| Surface Clear | Klik `Clear` dla panel surface | `background-color` znika z inline style; border zostaje. | Nie publikowano tej zmiany. | Dziala | `clearStyleField` usuwa `style.surface`; renderer uzywa clearable style. | Brak. |
| Search enhancement | Toggle on | Advanced pokazuje `Search enhancement Enabled`; preview zawiera JSON-LD script w rendered output. | Nie publikowano tej zmiany. | Dziala | `seo.emitFaqJsonLd` wlacza `buildFaqAccordionJsonLd`. | Brak. |
| Advanced summaries | Klik `Advanced` | Runtime/style/a11y/contract/saved-data summaries sa read-only i zgodne z ustawieniami. | Nie dotyczy. | Dziala | `FaqAccordionAdvancedEditor` ma tylko summary rows. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-faq-accordion` zwrocil HTTP 200.
W publicznym Playwright po wykonaniu skryptu:

- root mial `data-coderso-faq-bound="true"`,
- initial `summary[aria-expanded]`: `["true", "false", "false"]`,
- po kliknieciu drugiego summary: `["false", "true", "false"]`.

To potwierdza, ze publiczny runtime FAQ synchronizuje disclosure state.

## Kod-owner dla dryftu admin/public

- `core/widgets/core/faqAccordion.tsx`
  - `faqRuntimeClientScript` okolice linii 152-180 synchronizuje
    `aria-expanded`.
  - `FaqAccordionBlock` renderuje `<script dangerouslySetInnerHTML=...>` przy
    koncu sekcji.
- Admin preview/canvas renderuje Reactowy widget dynamicznie; w takim trybie
  wstawione `<script>` nie zachowuje sie tak jak parser HTML na public SSR.

## Rekomendowana poprawka

Jesli wymagamy pelnej zgodnosci admin preview z public runtime:

1. Dodac wspolny mechanizm uruchamiania widget runtime scripts po renderze
   admin canvasu, albo
2. Dodac FAQ preview effect, ktory po renderze admin preview wywoluje ten sam
   sync logic dla `[data-coderso-faq='1']`.

Do tego regresja UI: w admin preview klikniecie summary powinno aktualizowac
`aria-expanded`, tak jak public runtime.

## Console / srodowisko

- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- `data-faq-item-open` w adminie jest statycznym atrybutem renderu
  default-open, nie zmienia sie po kliknieciu `details`; dynamiczny stan nalezy
  czytac z `details.open`.
