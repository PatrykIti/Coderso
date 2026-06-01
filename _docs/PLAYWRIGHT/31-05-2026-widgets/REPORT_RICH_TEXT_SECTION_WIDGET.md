# RAPORT: Rich Text Section Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Rich Text Section`
> **Admin page id:** `aea7ae01-ded8-47f9-9adb-66c39f31d450`
> **Public route:** `/audit-31-05-rich-text-section`
> **Playwright session:** `codex-31-05-ui-richtext`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na swiezej stronie audytowej. Efekt sprawdzano w
admin live preview po `data-rich-text-*`, naglowkach, TOC anchors, rendered
source, sanitizer copy, structured-block renderze, linkach, stylach inline,
Advanced summaries oraz publicznym SSR pod
`http://localhost:3000/audit-31-05-rich-text-section`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Po sesji publiczny route nadal renderowal domyslne `Long-form content section`.

## Pokrycie UI

Przetestowane:

- warianty: Single Column, Two Column, Article,
- Content max width,
- title eyebrow/title/heading level,
- Source preference: body-first, blocks fallback, blocks-only,
- rich-text body sanitization,
- structured text block heading/content/heading level,
- Move down/up,
- image block controls without media asset,
- attachment block controls without media asset,
- embed block URL/title and disabled aspect ratio explanation,
- Blocks count reduction dialog + undo,
- Remove block dialog cancel,
- dropcap, TOC,
- font scale, line height, spacing,
- text/background color + Clear,
- Advanced read-only summaries,
- public SSR baseline,
- targeted Vitest suites dla renderera i edytora.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Single Column | Stan poczatkowy | `data-rich-text-variant="single-column"`, `outputMode=blocks-fallback`, `renderedSource=html`, `toc=false`. | Public baseline renderuje Single Column. | Dziala | Domyslny render uzywa HTML body, bo body nie jest puste. | Brak. |
| Domyslny source drift | Stan poczatkowy | Visual pokazuje drift warning: body HTML i blocks maja rozny tekst. | Public render nadal poprawny, bo source=html. | UX debt | Defaults maja dodatkowy paragraf w `body.html`, ktorego nie ma w `body.blocks`. | Albo zrownac defaults HTML/blocks, albo zmienic copy ostrzezenia, zeby nie wygladalo jak blad na nietknietym widgetcie. |
| Variant: Two Column | Klik `Two Column` | `variant=two-column`, layout `lg:grid-cols-3`. | Nie publikowano tej zmiany. | Dziala | Renderer branch Two Column tworzy TOC kolumne + body kolumne. | Brak. |
| Show table of contents | Toggle on | Root `data-rich-text-toc="true"`, TOC ma 2 linki do body H2/H3; section title nie jest w TOC. | Nie publikowano tej zmiany. | Dziala | `data-rich-text-toc-scope="body-headings"` i `injectHeadingAnchors` generuja anchors tylko z body. | Brak. |
| Variant: Article | Klik `Article` | Root `variant=article`, content renderuje w `article`. | Nie publikowano tej zmiany. | Dziala | Article branch opakowuje content w `<article>`. | Brak. |
| Content max width | Select `Full width` | Root `data-rich-text-max-width="full"`, header/content class `max-w-none`. | Nie publikowano tej zmiany. | Dziala | `maxWidthClassMap.full`. | Brak. |
| Eyebrow / title | Fill `Audit editorial`, `31-05 Rich Text Audit` | Header pokazuje oba teksty; root `aria-labelledby` wskazuje title id. | Public baseline ma domyslny title. | Dziala | Title block renderuje header i section label. | Brak. |
| Title heading level | Select `H1` | Title tag zmienil sie z `h2` na `h1`; root `data-rich-text-title-level="1"`. | Nie publikowano tej zmiany. | Dziala | `resolveRichTextTitleHeadingLevel` ogranicza do H1-H3. | Brak. |
| Rich text body sanitizer | Wstawiono H1, H2, unsafe href, iframe, script | Runtime usunal aktywne/niebezpieczne elementy; H2 zostal, unsafe link renderuje `href="#"`, Visual pokazal sanitizer guidance dla H1. | Nie publikowano tej zmiany. | Dziala czesciowo | Sanitizer chroni output, ale direct DOM injection nie przechwycil wszystkich copy paths typu unsafe href/raw iframe. | Dla prawdziwego paste/link-command warto dodac browser smoke, ale nie traktowac tego selectorowego injection jako pelnego user-path wyniku. |
| Source preference: blocks only | Select `Use structured blocks only` | Root `data-rich-text-output-mode="blocks"`, `renderedSource=blocks`; body renderuje structured blocks. | Nie publikowano tej zmiany. | Dziala | `resolveRichTextRenderedSource` przelacza source na blocks. | Brak. |
| Structured text block heading/content | Fill heading, select H4, edit rich block content | Root ma H4 `Audit block heading`; body zawiera rich HTML `<strong>`. | Nie publikowano tej zmiany. | Dziala | Text block render path sanitizuje `contentHtml` i zachowuje heading level 2-4. | Brak. |
| Move block down/up | Klik Move down, potem Move up | TOC/order zmienil sie zgodnie z ruchem i wrocil. | Nie dotyczy. | Dziala | `handleMoveBlock` przestawia tablice blocks. | Brak. |
| Image block controls | Add image block, fill alt/caption/link, width Full, alignment Right, decorative on | Edytor przyjal pola i pokazal `Pick a public image...`; preview nie renderuje figure bez `src`. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Renderer celowo omija image block bez public media `src`; media API lokalnie zwrocilo `[]`. | Dodac seed image do UI audytu, zeby potwierdzic MediaPicker selection i public figure render browserowo. |
| Attachment block controls | Add attachment block, fill label/description/MIME/size | Edytor przyjal pola i pokazal `Pick a public document...`; preview nie renderuje card bez `src`. | Nie publikowano tej zmiany. | Dziala w granicach fixture | Attachment renderer wymaga safe public `src`; media API lokalnie zwrocilo `[]`. | Dodac seed non-image media/document do UI audytu. |
| Embed block URL/title | Add embed block, set YouTube URL/title | Preview renderuje link-card `YouTube`, `Audit video link`, safe external target/rel. | Nie publikowano tej zmiany. | Dziala | `normalizeAllowedRichTextEmbedUrl` + `renderRichTextEmbedBlockAsHtml` renderuja provider link card. | Brak. |
| Embed aspect ratio | Embed block aktywny | Aspect ratio select jest disabled; copy mowi, ze to legacy metadata bez visual effect. | Nie dotyczy. | Dziala / truthful | UI nie pozwala zmieniac inertnego pola, dopoki embed renderuje link card. | Brak. |
| Blocks count reduction | Select `1` przy 5 blocks | Dialog `Reduce blocks from 5 to 1...`; po `Reduce` zostal 1 block i pokazal sie `Undo`. | Nie dotyczy. | Dziala | `ConfirmActionDialog` + `pendingUndo` zachowuje poprzednia liste. | Brak. |
| Blocks count undo | Klik `Undo` | Wrocilo 5 blocks, embed card ponownie renderuje. | Nie dotyczy. | Dziala | `handleUndo` przywraca `pendingUndo.blocks`. | Brak. |
| Remove block cancel | Klik Remove na embed block, Escape | Dialog `Remove Audit video link?`; po cancel embed zostal. | Nie dotyczy. | Dziala | `pendingRemoveBlockId` + `ConfirmActionDialog`. | Brak. |
| Dropcap | Toggle on | Root `data-rich-text-dropcap="true"` i body class ma first-letter classes; copy mowi, ze dropcap dotyczy blocks source. | Nie publikowano tej zmiany. | Dziala | `resolveRichTextDropcapStatus` sprawdza aktywny source i paragraph presence. | Brak. |
| Font scale | Select `Large` | Root `data-rich-text-font-scale="lg"`, body class `text-lg`. | Nie publikowano tej zmiany. | Dziala | `fontScaleClassMap.lg`. | Brak. |
| Line height | Select `Relaxed` | Root `data-rich-text-line-height="relaxed"`, body class `leading-8`. | Nie publikowano tej zmiany. | Dziala | `lineHeightClassMap.relaxed`. | Brak. |
| Spacing density | Select `Spacious` | Root `data-rich-text-spacing="lg"`, body class `space-y-8`. | Nie publikowano tej zmiany. | Dziala | `spacingClassMap.lg`. | Brak. |
| Text color | Set `#111827` | Body style `color: rgb(17, 24, 39)`. | Nie publikowano tej zmiany. | Dziala | SharedColorControl zapisuje picker color; renderer uzywa `resolveClearableStyleValue`. | Brak. |
| Background color | Set `#f8fafc` | Section style `background-color: rgb(248, 250, 252)`. | Nie publikowano tej zmiany. | Dziala | Section style bierze `style.background`. | Brak. |
| Clear text/background colors | Klik Clear dla obu | Section style pusty; body style wraca do `color: var(--color-text)`; editor pokazuje Theme default. | Nie publikowano tej zmiany. | Dziala | `clearStyleField` usuwa override. | Brak. |
| Advanced read-only | Klik `Advanced` | `rootCount=1`, `writableControls=0`, `formControls=0`; sekcje output/sanitizer/saved/contract obecne. | Nie dotyczy. | Dziala | Advanced editor renderuje diagnostyke bez mutujacych controls. | Brak. |
| Advanced sanitizer diagnostics po body + block edit | Najpierw body sanitizer pokazal guidance, potem edytowano structured block i otwarto Advanced | Advanced pokazal `Diagnostics: 0`, `Latest editor events: 0`, mimo ze Visual body sanitizer pokazal H1 guidance w tej samej sesji. | Nie dotyczy. | Do poprawy: diagnostics loss | `handleBlockRichTextChange` nadpisuje `body.sanitizerDiagnostics` diagnostyka aktualnego bloku, zamiast zachowac/rozroznic body diagnostics. | Rozdzielic body/block diagnostics albo merge'owac bounded latest events bez utraty body events; dodac test: body sanitizer event -> edit clean block -> Advanced nadal pokazuje body event. |

## Public baseline

`curl http://localhost:3000/audit-31-05-rich-text-section` zwrocil HTTP 200 i
SSR HTML z:

- `data-rich-text-variant="single-column"`,
- `data-rich-text-font-scale="md"`,
- `data-rich-text-line-height="normal"`,
- `data-rich-text-spacing="md"`,
- `data-rich-text-dropcap="false"`,
- `data-rich-text-toc="false"`,
- `data-rich-text-max-width="lg"`,
- `data-rich-text-output-mode="blocks-fallback"`,
- `data-rich-text-rendered-source="html"`,
- title `Long-form content section`,
- body headings `Clear structure for readable content` i `What works best`,
- no CTA/media/embed output w baseline.

To potwierdza, ze swieza strona audytowa publikuje domyslny Rich Text Section.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny.

## Ograniczenia fixture

Media API w tym srodowisku zwrocilo `[]`, dlatego image i attachment MediaPicker
selection nie mogly zostac uczciwie klikniete browserowo. Zweryfikowane sa:
obecnosc pickerow, empty-media guidance, bezpieczne pomijanie image/attachment
bez public `src`, embed link-card oraz targeted Vitest z mockowanym media flow.

## Kod-owner

- `core/widgets/core/richTextSection.tsx`
  - defaults HTML/blocks drift: okolice linii 299-329,
  - image/attachment/embed block render: okolice linii 1002-1126,
  - source drift and sanitizer report helpers: okolice linii 1239-1277,
  - root attrs, TOC, variants, styles: okolice linii 1323-1505.
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
  - body rich text sanitizer handler: okolice linii 744-753,
  - block rich text sanitizer handler nadpisujacy diagnostics: okolice linii 755-804,
  - structured block UI and media/embed controls: okolice linii 1144-1737,
  - reader/style controls and dialogs: okolice linii 1739-1900,
  - Advanced diagnostics: okolice linii 1905-2048.
- `tests/vitest/widgets/richTextSection.test.tsx`
  - source drift and sanitizer report coverage: okolice linii 333-361.
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
  - Visual editor coverage: okolice linii 478-630,
  - media/embed coverage: okolice linii 672-749,
  - Advanced read-only coverage: okolice linii 839-906.

## Rekomendacje

1. Naprawic utrate sanitizer diagnostics po edycji structured block. To jest
   najwazniejszy Rich Text finding z tej rundy, bo Advanced przestaje mowic
   prawde o zdarzeniach, ktore Visual przed chwila pokazal.
2. Rozstrzygnac domyslny source drift: albo zrownac defaults HTML/blocks, albo
   zmienic initial warning, zeby nietkniety widget nie wygladal jak konflikt.
3. Dodac media seed dla UI audytow: jeden image i jeden public document/file.
4. Dodac browser-level paste/link sanitizer smoke dla realnej sciezki unsafe
   href/raw iframe, bo direct DOM injection potwierdza ochronny output, ale nie
   przechodzi przez wszystkie user-path eventy adaptera.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-richtext run-code --filename .tmp/playwright-richtext-compact.js` — passed.
- Admin console po przebiegu: `Errors: 0`, `Warnings: 0`.
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx` — passed, 12 tests.
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx` — passed, 5 tests.
- `curl http://localhost:3000/audit-31-05-rich-text-section` — HTTP 200, public baseline unchanged.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
