# RAPORT: Logo Cloud Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Logo Cloud`
> **Admin page id:** `1eeeab72-9d96-440f-8687-1ff8e616608b`
> **Public route:** `/audit-31-05-logo-cloud`
> **Playwright session:** `codex-31-05-ui-logo-cloud`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.
> **TASK-378 follow-up:** smoke harness dodaje teraz deterministyczny obraz
> Logo Cloud przez `/admin/api/media` i wykonuje `mediaProof` przez realny
> MediaPicker, gdy wybrany jest `logo-cloud`.

## Metoda

Test byl prowadzony od UI na swiezej stronie audytowej. Efekt sprawdzano w
admin live preview po `data-logo-cloud-*`, klasach listy, linkach, stylach
inline, undo notice, Advanced summaries oraz publicznym SSR pod
`http://localhost:3000/audit-31-05-logo-cloud`.

Natywny `window.confirm` dla redukcji liczby logotypow przechwycono w stronie,
bo `playwright-cli` zostawial modal w stanie niespojnym. Sprawdzono osobno
wariant `false` i `true` dla potwierdzenia.

## Pokrycie UI

Przetestowane:

- warianty: Grid, Strip, Dense,
- Strip row behavior: Single row scroll,
- Strip motion: Marquee,
- header eyebrow/title/description,
- logo name, accessible description, destination picker,
- logo count reduce cancel/accept, Add logo,
- Move up/down, drag/drop reorder, Remove + Undo,
- CTA enable, label, destination, target,
- logo height, gap, alignment, header alignment/size,
- tile radius, tile border width,
- global logo links new-tab toggle,
- grayscale + hover-color truthfulness,
- section/tile/tile-border colors i Clear,
- Advanced read-only summaries,
- public SSR baseline.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Grid | Klik `Grid` | `data-logo-cloud-variant="grid"`, 5/6 itemow, grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. | Public baseline renderuje Grid z 6 logo. | Dziala | Renderer mapuje `grid` na klasy grid i `row-mode=wrap`, `motion=static`. | Brak. |
| Variant: Strip | Klik `Strip` | `variant=strip`; saved strip controls staja sie aktywne. | Nie publikowano tej zmiany. | Dziala | Visual wlacza row/motion tylko dla Strip. | Brak. |
| Strip: Single row scroll | Select `Single row scroll` | `data-logo-cloud-row-mode="single-row"`, list ma `flex-nowrap overflow-x-auto`. | Nie publikowano tej zmiany. | Dziala | `resolvedRowMode` bierze saved row mode tylko dla Strip. | Brak. |
| Strip: Marquee | Select `Marquee` | `data-logo-cloud-motion="marquee"`, renderuje 10 itemow przy 5 logo, czyli zdublowany tor. | Nie publikowano tej zmiany. | Dziala | `LogoCloudBlock` duplikuje `logos` w `.logo-cloud-marquee-track`, gdy logo count > 1. | Brak. |
| Variant: Dense | Klik `Dense` po zapisaniu Strip marquee | `variant=dense`, `row-mode=wrap`, `motion=static`; summary pokazuje saved Strip settings. | Nie publikowano tej zmiany. | Dziala | Grid/Dense pokazuja efektywny stan, a zapisane Strip ustawienia sa zachowane i nieaktywne. | Brak. |
| Header copy | Fill eyebrow/title/description | Header pokazuje `31-05 trust proof`, `31-05 Logo Cloud Audit`, opis z Visual. | Public baseline ma domyslny header. | Dziala | `updateHeader` patchuje `header.*`; renderer uzywa `h2` i `aria-labelledby`. | Brak. |
| Logo name + accessible description | Fill Logo 1 name/alt | Text fallback zmienia sie na `Audit Partner`; link aria-label bierze alt `Audit partner accessible logo`. | Nie publikowano tej zmiany. | Dziala | `LogoCloudItem` wybiera label z `alt || name`. | Brak. |
| Logo destination | Wybierz `Audit 31-05 Hero` | Logo 1 renderuje sie jako `<a href="/audit-31-05-hero">`. | Public baseline nie ma linkow logo. | Dziala | `LinkDestinationField` + `resolveWidgetLinkAttrs`. | Brak. |
| Media library | Sprawdzono API `/admin/api/media?limit=10` | API zwrocilo `[]`; preview pokazuje placeholder `No image selected yet`. | Public baseline renderuje text fallback, `data-logo-cloud-has-image="false"`. | Fixture gap resolved in TASK-378 harness | Brak assetow w lokalnej bibliotece, wiec nie bylo czego wybrac w pickerze podczas pierwotnego audytu. | `scripts/playwright-widget-contract-smoke.ts` seeduje teraz `widget-fixture-logo-cloud-acme.svg` przez admin `/api/media` z CSRF, wybiera go przez MediaPicker, publikuje fixture i sprawdza publiczny `<img>` alt/grayscale/hover. |
| Logo count cancel | Select 4 przy 6 logo, confirm return `false` | Przechwycony komunikat: `Reduce logo count to 4?... Pixel Forge, Stonegrid...`; count zostal 6. | Nie dotyczy. | Dziala | `confirmLogoCountReduction` blokuje truncation przy cancel. | Brak. |
| Logo count accept | Select 4 przy 6 logo, confirm return `true` | Count zmienia sie na 4; usuniete sa koncowe logo. | Nie publikowano tej zmiany. | Dziala | `setLogoCountInData` normalizuje liste do nowej dlugosci. | Brak. |
| Add logo | Klik `Add logo` | Count 4 -> 5, dodaje `Logo 5`. | Nie publikowano tej zmiany. | Dziala | `addLogoToData` dodaje do max 24. | Brak. |
| Move up/down | Move down Logo 1, potem Move up | Kolejnosc edytora zmienia sie i wraca: `Audit Partner` przesuwa sie na poz. 2, potem na poz. 1. | Nie publikowano tej zmiany. | Dziala | `moveLogoInData` przestawia tablice. | Brak. |
| Drag/drop reorder | Drag handle Logo 1 -> karta 3 | Kolejnosc zmienia sie `Audit Partner` z poz. 1 na poz. 3. | Nie publikowano tej zmiany. | Dziala | `onDragStart` ustawia `dragState`, `onDrop` wywoluje `dropLogoAtIndex`. | Brak. |
| Remove + Undo | Remove Logo 5, potem Undo | Count spada 5 -> 4, pokazuje status undo; po Undo wraca 5. | Nie dotyczy. | Dziala | `removeLogoWithUndo` zapisuje `pendingRemoval`; `restoreRemovedLogo` przywraca. | Brak. |
| CTA enable/destination/target | Enable CTA, label, destination Hero, target New tab | CTA renderuje `href="/audit-31-05-hero"`, `target="_blank"`, `rel="noopener noreferrer"`. | Public baseline ma CTA hidden. | Dziala | `LogoCloudCtaLink` renderuje tylko enabled + label + safe href. | Brak. |
| Logo links new tab | Toggle global new-tab dla logo links | Logo 1 link dostaje/usuwa `target="_blank"` i `rel="noopener noreferrer"` niezaleznie od CTA targetu. | Nie publikowano tej zmiany. | Dziala | `LogoCloudItem` przekazuje `openLinksInNewTab` do `resolveWidgetLinkAttrs`; CTA ma osobny target. | Brak. |
| Logo height | Select `None`, potem `Extra large` | Root `data-logo-cloud-height="none"` potem `xl`; output nadal ma bounded klasy, bez niekontrolowanej wysokosci. | Public baseline ma `md`. | Dziala | `logoHeightClassMap` i runtime safety dla `none`. | Brak. |
| Gap/alignment/header style | Select `Spacious`, `End`, `Start`, `Large` | Root ma `gap=lg`, `alignment=end`, `header-align=start`, `header-size=lg`; klasy listy ida w `justify-items-end`. | Nie publikowano tej zmiany. | Dziala | `gapClassMap`, `alignmentClassMap`, `headerAlignClassMap`. | Brak. |
| Tile radius/border width | Select `Full`, `Heavy` | Item ma klasy `rounded-full border-2`. | Nie publikowano tej zmiany. | Dziala | `tileRadiusClassMap` i `tileBorderWidthClassMap`. | Brak. |
| Grayscale off | Toggle off | Root `data-logo-cloud-grayscale="false"`, `hover-color="false"`; hover-color switch jest disabled. | Nie publikowano tej zmiany. | Dziala | Visual clearuje `hoverColor` przy grayscale off; renderer liczy `hoverColor = grayscale && hoverColor`. | Brak. |
| Hover color on | Toggle grayscale on, hover on | Root `grayscale=true`, `hover-color=true`; obrazki dostalyby klase hover-color, gdy sa assety. | Public baseline ma `true/true`, ale bez obrazow. | Dziala dla stanu; efekt wizualny wymaga obrazow | Renderer stosuje hover class tylko na `img`; aktualny fixture ma text fallback. | Dodac image fixture, jesli chcemy potwierdzic pikselowo grayscale/hover. |
| Section/tile/tile-border colors | Ustaw `#f5f5dc`, `#e0ffff`, `#663399` | Section ma `background-color: rgb(245,245,220)`; item ma tile bg i border color. | Nie publikowano tej zmiany. | Dziala | `SharedColorControl` + `compactStyle` aplikuja inline styles. | Brak. |
| Clear colors | Clear trzy kolory | Inline section/item styles wracaja do pustych lub tokenowych fallbackow; Advanced mowi Theme default. | Nie publikowano tej zmiany. | Dziala | `clearStyle` usuwa pola ze `style`. | Brak. |
| Advanced | Klik `Advanced` | `0` writable controls; summary pokazuje Grid, 5 logos, Extra large, Spacious, link/CTA/media summaries, Strip saved settings, colors. | Nie dotyczy. | Dziala | Advanced jest read-only diagnostics. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-logo-cloud` zwrocil HTTP 200 i SSR HTML
z:

- `data-logo-cloud-variant="grid"`,
- `data-logo-cloud-gap="md"`,
- `data-logo-cloud-height="md"`,
- `data-logo-cloud-count="6"`,
- `data-logo-cloud-alignment="center"`,
- `data-logo-cloud-grayscale="true"`,
- `data-logo-cloud-hover-color="true"`,
- `data-logo-cloud-header-align="center"`,
- `data-logo-cloud-header-size="md"`,
- `data-logo-cloud-row-mode="wrap"`,
- `data-logo-cloud-motion="static"`,
- 6 text fallback logo tiles,
- `data-logo-cloud-has-image="false"` dla kazdego logo.

To potwierdza, ze swieza strona audytowa publikuje domyslny Logo Cloud.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny.

## Ograniczenie fixture

Media Library w tym srodowisku zwrocila pusta liste (`[]`), dlatego nie da sie
uczciwie potwierdzic wyboru realnego obrazka przez MediaPicker. Sprawdzone sa:
placeholder preview, text fallback, safe link, alt jako accessible label dla
linku oraz Advanced summary `No logo images selected yet`.

### Follow-up TASK-378 (2026-06-01)

LC-31-05-01 zostal zamkniety po stronie smoke harnessu. Dla wybranych case'ow
`logo-cloud` skrypt `scripts/playwright-widget-contract-smoke.ts`:

- wykrywa potrzebe seedowania mediów przez `selectedCasesNeedMediaFixtures`,
- pobiera istniejace media przez uwierzytelnione `/admin/api/media`,
- pobiera CSRF przez `/admin/api/auth/csrf`,
- uploaduje `widget-fixture-logo-cloud-acme.svg` jako `image/svg+xml` przez
  `/admin/api/media`, jesli poprawny obraz jeszcze nie istnieje,
- aktualizuje tylko metadane (`alt`, `title`, `caption`) dla poprawnego,
  istniejacego obrazu,
- wykonuje `mediaProof`: otwiera Logo Cloud Visual, wybiera seedowany asset
  przez realny MediaPicker, sprawdza admin preview
  `data-logo-cloud-has-image="true"`, publikuje fixture page i sprawdza
  publiczny `<img>` z oczekiwanym `alt`, `grayscale` oraz
  `group-hover:grayscale-0`.

W tej sesji nie wykonano pelnego live browser replay, bo lokalne serwery
`localhost:5173` i `localhost:3000` nie byly uruchomione, a `.env` nie zawieral
`CODERSO_PLAYWRIGHT_EMAIL` ani `CODERSO_PLAYWRIGHT_PASSWORD`. Dry-run smoke dla
`--widget logo-cloud` przeszedl walidacje inventory bez gapow; unit coverage
sprawdza admin media API, cookie sesji, CSRF, `FormData` upload i JSON PATCH
metadanych.

## Kod-owner

- `core/widgets/core/logoCloud.tsx`
  - item link/image fallback: okolice linii 522-596,
  - CTA link: okolice linii 598-625,
  - root data attrs i effective strip/marquee: okolice linii 627-793.
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
  - logo count confirm: okolice linii 1080-1109,
  - header controls: okolice linii 1112-1158,
  - logo list, drag, move, remove/undo: okolice linii 1160-1268,
  - CTA controls: okolice linii 1270-1350,
  - display style controls: okolice linii 1352-1715,
  - Advanced summaries: okolice linii 1720-1871.

## Rekomendacje

1. Brak wymaganej poprawki produkcyjnej dla aktualnego kontraktu.
2. Fixture/media seed i browser `mediaProof` dla audytow Playwright zostaly
   dodane w TASK-378. Kolejny live replay wymaga uruchomionych serwerow i
   `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD`.
3. Przy kolejnych automatach unikac natywnego `window.confirm` w `playwright-cli`
   albo przechwytywac `confirm` w stronie; CLI potrafi zostawic modal w stanie,
   ktory blokuje snapshot.

## Console / srodowisko

- Admin console po finalnym przebiegu: `Errors: 0`, `Warnings: 0`.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
