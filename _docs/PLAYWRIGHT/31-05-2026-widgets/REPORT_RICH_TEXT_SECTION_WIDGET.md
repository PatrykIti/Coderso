# RAPORT: Rich Text Section Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Rich Text Section`
> **Admin page id:** `aea7ae01-ded8-47f9-9adb-66c39f31d450`
> **Public route:** `/audit-31-05-rich-text-section`
> **Playwright session:** `codex-31-05-ui-richtext`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Remediacja 2026-06-01

TASK-381 zamknal trzy findingi z tego raportu:

- body sanitizer diagnostics nie sa juz kasowane przez czysta edycje
  structured block,
- nietkniete domyslne `body.html` i `body.blocks` maja ten sam efektywny tekst,
  wiec source-drift warning nie pojawia sie na pristine widgetcie,
- widget smoke bootstrap dodaje deterministyczny image i document fixture dla
  Rich Text Section oraz browser proof dla MediaPicker, unsafe link command i
  raw iframe paste sanitizer.

Live Playwright replay tej remediacji nie zostal uruchomiony w tym srodowisku,
bo `http://localhost:5173/admin` i `http://localhost:3000` zwracaly HTTP `000`,
a `.env` nie zawieral `CODERSO_PLAYWRIGHT_EMAIL` ani
`CODERSO_PLAYWRIGHT_PASSWORD`. Targeted Vitest, Bun helper tests i smoke
dry-run dla `rich-text-section` przeszly.

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
| Domyslny source drift | Stan poczatkowy | Visual nie powinien pokazywac drift warning na pristine widgetcie. | Public render nadal poprawny, bo source=html. | Naprawione (TASK-381-02) | Defaults maja teraz ten sam plain text w `body.html` i `body.blocks`; regresja sprawdza `resolveRichTextSourceDrift(richTextSectionDefaults).hasDrift === false`. | Zamkniete. |
| Variant: Two Column | Klik `Two Column` | `variant=two-column`, layout `lg:grid-cols-3`. | Nie publikowano tej zmiany. | Dziala | Renderer branch Two Column tworzy TOC kolumne + body kolumne. | Brak. |
| Show table of contents | Toggle on | Root `data-rich-text-toc="true"`, TOC ma 2 linki do body H2/H3; section title nie jest w TOC. | Nie publikowano tej zmiany. | Dziala | `data-rich-text-toc-scope="body-headings"` i `injectHeadingAnchors` generuja anchors tylko z body. | Brak. |
| Variant: Article | Klik `Article` | Root `variant=article`, content renderuje w `article`. | Nie publikowano tej zmiany. | Dziala | Article branch opakowuje content w `<article>`. | Brak. |
| Content max width | Select `Full width` | Root `data-rich-text-max-width="full"`, header/content class `max-w-none`. | Nie publikowano tej zmiany. | Dziala | `maxWidthClassMap.full`. | Brak. |
| Eyebrow / title | Fill `Audit editorial`, `31-05 Rich Text Audit` | Header pokazuje oba teksty; root `aria-labelledby` wskazuje title id. | Public baseline ma domyslny title. | Dziala | Title block renderuje header i section label. | Brak. |
| Title heading level | Select `H1` | Title tag zmienil sie z `h2` na `h1`; root `data-rich-text-title-level="1"`. | Nie publikowano tej zmiany. | Dziala | `resolveRichTextTitleHeadingLevel` ogranicza do H1-H3. | Brak. |
| Rich text body sanitizer | Wstawiono H1, H2, unsafe href, iframe, script | Runtime usuwa aktywne/niebezpieczne elementy; H2 zostaje, unsafe link dostaje bezpieczny placeholder, Visual pokazuje sanitizer guidance. | Nie publikowano tej zmiany w oryginalnej sesji. | Dziala; smoke dodany (TASK-381-03) | Sanitizer chroni output, a smoke harness ma teraz browser proof dla unsafe link command i raw iframe paste path. | Zamkniete w helperze; live replay wymaga dzialajacego admin/front i credentials. |
| Source preference: blocks only | Select `Use structured blocks only` | Root `data-rich-text-output-mode="blocks"`, `renderedSource=blocks`; body renderuje structured blocks. | Nie publikowano tej zmiany. | Dziala | `resolveRichTextRenderedSource` przelacza source na blocks. | Brak. |
| Structured text block heading/content | Fill heading, select H4, edit rich block content | Root ma H4 `Audit block heading`; body zawiera rich HTML `<strong>`. | Nie publikowano tej zmiany. | Dziala | Text block render path sanitizuje `contentHtml` i zachowuje heading level 2-4. | Brak. |
| Move block down/up | Klik Move down, potem Move up | TOC/order zmienil sie zgodnie z ruchem i wrocil. | Nie dotyczy. | Dziala | `handleMoveBlock` przestawia tablice blocks. | Brak. |
| Image block controls | Add image block, fill alt/caption/link, width Full, alignment Right, decorative on | Edytor przyjmuje pola; smoke harness wybiera deterministic image przez MediaPicker i sprawdza admin/public `<img>`. | Public proof jest w smoke harness; live replay env-blocked. | Naprawione (TASK-381-03) | Renderer nadal celowo omija image block bez public `src`, ale fixture bootstrap tworzy public image media dla proof. | Zamkniete w helperze; live replay wymaga dzialajacego admin/front i credentials. |
| Attachment block controls | Add attachment block, fill label/description/MIME/size | Edytor przyjmuje pola; smoke harness wybiera deterministic PDF document przez MediaPicker i sprawdza admin/public attachment link. | Public proof jest w smoke harness; live replay env-blocked. | Naprawione (TASK-381-03) | Attachment renderer nadal wymaga safe public `src`, ale fixture bootstrap tworzy non-image document fixture dla proof. | Zamkniete w helperze; live replay wymaga dzialajacego admin/front i credentials. |
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
| Advanced sanitizer diagnostics po body + block edit | Najpierw body sanitizer pokazal guidance, potem edytowano structured block i otwarto Advanced | Advanced zachowuje body sanitizer event po czystej edycji structured block i pokazuje `Latest editor events: 1`. | Nie dotyczy. | Naprawione (TASK-381-01) | `handleBlockRichTextChange` merge'uje bounded block diagnostics z zapisanymi body diagnostics zamiast nadpisywac je pusta lista. | Zamkniete; regresja UI sprawdza body sanitizer event -> clean block edit -> Advanced nadal pokazuje body event. |

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

Oryginalny UI pass mial `[]` z Media API, dlatego image i attachment
MediaPicker selection nie mogly zostac uczciwie klikniete browserowo.
TASK-381 dodal deterministic image/document bootstrap do
`playwright-widget-contract-smoke.ts` oraz Rich Text media/sanitizer proof.
Live replay pozostaje zalezne od dostepnego admin/front i credentials.

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

1. Zamkniete w TASK-381-01: Advanced zachowuje body sanitizer diagnostics po
   czystej edycji structured block.
2. Zamkniete w TASK-381-02: defaults HTML/blocks sa zrownane plain-textowo.
3. Zamkniete w TASK-381-03: smoke harness seeduje jeden image i jeden public
   document/file dla Rich Text Section.
4. Zamkniete w TASK-381-03: smoke harness ma browser-level proof dla unsafe
   link command i raw iframe paste sanitizer.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-richtext run-code --filename .tmp/playwright-richtext-compact.js` — passed.
- Admin console po przebiegu: `Errors: 0`, `Warnings: 0`.
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx` — passed, 12 tests.
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx` — passed, 5 tests.
- `curl http://localhost:3000/audit-31-05-rich-text-section` — HTTP 200, public baseline unchanged.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.

## Walidacja remediacji 2026-06-01

- Focused regressions failed przed poprawka dla default source drift, body
  diagnostics retention i Rich Text media fixture bootstrap.
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx` — passed, 18 tests.
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts` — passed, 25 tests.
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget rich-text-section --output-json .tmp/task-381-rich-text-section-smoke-dry-run.json --output-md .tmp/task-381-rich-text-section-smoke-dry-run.md` — passed, zero failures/gaps.
- Live Rich Text Playwright media/sanitizer replay not run: admin HTTP `000`,
  frontend HTTP `000`, and no `CODERSO_PLAYWRIGHT_EMAIL` /
  `CODERSO_PLAYWRIGHT_PASSWORD` values in `.env`.
- Claude CLI read-only review was attempted after implementation context but
  timed out without output in this environment.
