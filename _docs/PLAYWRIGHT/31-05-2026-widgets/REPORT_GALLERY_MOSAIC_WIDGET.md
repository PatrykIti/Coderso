# RAPORT: Gallery Mosaic Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Gallery Mosaic`
> **Admin page id:** `84734c4a-a364-4915-9b7f-11ec0e983c4d`
> **Public route:** `/audit-31-05-gallery-mosaic`
> **Playwright session:** `codex-31-05-ui-gallery-mosaic`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Remediation status (2026-06-01)

TASK-379 closes the three report findings:

- GM-31-05-01: Advanced now uses the widget-owned lightbox eligibility helper
  and reports `Lightbox selected; no media tiles currently open` when selected
  lightbox mode has zero effective triggers.
- GM-31-05-02: widget smoke now treats Gallery Mosaic as a media-fixture widget,
  uploads a deterministic image fixture through the authenticated admin media
  API, defines a video fixture for environments whose storage policy allows
  `video/mp4`, and adds a browser proof that selects the image through
  MediaPicker, publishes, and opens/closes public lightbox.
- GM-31-05-03: per-item Remove now uses `ConfirmActionDialog` cancel/accept
  flow instead of native `window.confirm`.

## Metoda

Test byl prowadzony od UI na swiezej stronie audytowej. Efekt sprawdzano w
admin live preview po `data-gallery-mosaic-*`, `data-gallery-item-*`, linkach,
caption markup, lightbox markup, inline overlay styles, Advanced summaries oraz
publicznym SSR pod `http://localhost:3000/audit-31-05-gallery-mosaic`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Po sesji publiczny route nadal renderowal domyslne `Gallery highlights`.

## Pokrycie UI

Przetestowane:

- warianty: Mosaic, Uniform Grid, Feature Left,
- header title/description,
- count reduction cancel/accept z ConfirmActionDialog,
- Add item i regrow po redukcji,
- per-item caption, alt text, destination picker, focus point, item ratio,
- Move down/up,
- Clear media and poster,
- Interaction mode: Static tiles / Open lightbox on click,
- Lightbox zoom: Fill dialog frame,
- linked-item precedence nad lightbox,
- caption position: Inside, Below, On hover,
- overlay color i Clear,
- ratio, gap, radius, layout density, motion preset,
- Remove cancel/accept,
- Advanced read-only summaries,
- public SSR baseline,
- targeted Vitest suites dla renderera, lightbox runtime i edytora.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Mosaic | Stan poczatkowy | `data-gallery-mosaic-variant="mosaic"`, `count=5`, pierwszy tile ma `lg:col-span-2 lg:row-span-2`. | Public baseline renderuje Mosaic. | Dziala | Renderer mapuje `mosaic` na grid `lg:grid-cols-4` i lead span. | Brak. |
| Variant: Feature Left | Klik `Feature Left` | `variant=feature-left`, container `grid grid-cols-1 lg:grid-cols-3`, 5 itemow. | Nie publikowano tej zmiany. | Dziala | Feature-left branch renderuje lead + support tylko gdy sa support items. | Brak. |
| Feature Left + 1 item | Redukcja count do 1 | Root `count=1`; edytor pokazuje warning `Feature Left works best...`. | Nie publikowano tej zmiany. | Dziala | Visual liczy warning przy `variant=feature-left && items.length === 1`. | Brak. |
| Variant: Uniform Grid | Klik `Uniform Grid` | `variant=uniform-grid`, grid `sm:grid-cols-2 lg:grid-cols-3`. | Nie publikowano tej zmiany. | Dziala | Renderer wybiera `layoutDensityGridClassMap["uniform-grid"]`. | Brak. |
| Header copy | Fill title/description | Header pokazuje `31-05 Gallery Mosaic Audit` i opis z Visual. | Public baseline ma domyslny header. | Dziala | `updateHeader` patchuje `header.*`; renderer uzywa heading + `aria-labelledby`. | Brak. |
| Count reduction dialog | Select `1` przy 5 authored media | Dialog: `Reducing the gallery to 1 item removes 4 saved items...`; Cancel trzyma `count=5`. | Nie dotyczy. | Dziala | `resolvePendingCountReduction` + `ConfirmActionDialog` blokuje destrukcyjna redukcje. | Brak. |
| Count reduction accept | Klik `Reduce items` | `count=1`; pozostaje pierwszy image tile. | Nie publikowano tej zmiany. | Dziala | `setItemCount` normalizuje liste do nowego rozmiaru. | Brak. |
| Add item / regrow | Klik `Add item`, potem ustaw count 5 | Count wraca do 5; nowe pozycje sa placeholderami `Media 2`, `Story frame`, `Portfolio item`, `Campaign shot`. | Nie publikowano tej zmiany. | Dziala zgodnie z copy dialogu | Usuniete authored content nie jest przywracane; regrow tworzy placeholdery. | Brak, jezeli kontrakt ma byc destrukcyjny. |
| Media library | Otwarta sekcja `Media library` | Picker obecny, ale `/admin/api/media?limit=10` zwrocil `[]`. | Public baseline korzysta z domyslnych remote images. | Naprawione w smoke harnessie | TASK-379 dodaje Gallery Mosaic do media fixture bootstrapu. Image seed jest wymagany; video seed jest definiowany i uploadowany, gdy storage policy pozwala na `video/mp4`. | Brak dla harnessu. Live env z domyslnym `MEDIA_ALLOWED_MIME=image/*,application/pdf` moze odrzucic optional video bez blokowania image/lightbox proof. |
| Clear media and poster | Klik `Clear media and poster` na lead item | Lead zmienia `data-gallery-media-type="placeholder"`; `lightboxRoot` znika, bo nie ma juz media tiles. | Nie publikowano tej zmiany. | Dziala | `clearItemMedia` zeruje `image`, `video`, `poster`; renderer daje placeholder i usuwa lightbox triggers. | Brak. |
| Caption | Fill `Audit lead caption` | Caption w tile i editor list zmienione; lightbox aria label uzywa caption po wlaczeniu lightbox. | Nie publikowano tej zmiany. | Dziala | `items.caption` idzie do `figcaption` i lightbox title fallback. | Brak. |
| Alt text | Fill `Audit lead alt text` | Image `alt="Audit lead alt text"`. | Nie publikowano tej zmiany. | Dziala | `resolveGalleryMosaicAltText` preferuje explicit alt przed caption. | Brak. |
| Destination page | Wybierz `Audit 31-05 Hero` | Tile renderuje `<a href="/audit-31-05-hero">`; interaction staje sie `link`. | Nie publikowano tej zmiany. | Dziala | `resolveGalleryMosaicInteractionType` daje link precedence nad lightbox. | Brak. |
| Focus point | Select `Top` | Image style `object-position: center top`. | Nie publikowano tej zmiany. | Dziala | `objectPositionStyleMap.top` mapuje na `center top`. | Brak. |
| Item ratio | Select `16:9` | Lead figure ma `aspect-video`, mimo global ratio `4:3`. | Nie publikowano tej zmiany. | Dziala | Per-item `ratio` nadpisuje section ratio, gdy nie jest `inherit`. | Brak. |
| Move down/up | Move down lead, potem Move up | Kolejnosc captionow: `Audit lead caption` przechodzi na poz. 2 i wraca na poz. 1. | Nie publikowano tej zmiany. | Dziala | `moveItem` uzywa `reorderItemsById`; UI ma buttony i drag handle. | Brak. |
| Interaction: Static tiles | Stan poczatkowy | `interaction=none`, brak lightbox root/dialogs. | Public baseline ma `interaction=none`. | Dziala | Default `interaction.mode` normalizuje sie do `none`. | Brak. |
| Interaction: Lightbox, linked item | Wlacz `Open lightbox on click` przy item z destination | Root `interaction=lightbox`, ale lead nadal `data-gallery-item-interaction="link"`; edytor pokazuje warning o linked item. | Nie publikowano tej zmiany. | Dziala | Link precedence jest celowy: linked tiles zachowuja navigation. | Brak. |
| Lightbox po wyczyszczeniu linku | Clear destination | Root dostaje `data-gallery-lightbox-root="1"`, `lightboxCount=1`, lead ma trigger `Open Audit lead caption`, dialog `zoom=fill`. | Nie publikowano tej zmiany. | Dziala | `resolveGalleryMosaicInteractionType` zwraca `lightbox` tylko dla media bez `href`. | Brak. |
| Admin lightbox click | Klik trigger w admin preview | Dialog zostal `hidden=true`; focus nie przeszedl na close button. | Nie dotyczy. | Dziala zgodnie z copy admin | UI wprost informuje: admin preview pokazuje lightbox markup jako static; public pages binduja script. | Brak dla admin preview. Nie interpretowac tego jako public bug. |
| Public lightbox runtime | Targeted Vitest runtime | `tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts` passed; renderer test potwierdza script i triggers. | Public baseline nie ma lightbox, bo fixture default to static. | Naprawione w smoke harnessie | TASK-379 admin proof wybiera seeded image, ustawia `interaction.mode=lightbox`, publikuje fixture i klika publiczny trigger/close button. | Uruchomic live smoke, gdy admin/frontend/auth sa dostepne. Dry-run i unit tests potwierdzaja harness contract. |
| Caption position: Below | Select `Below tile` | Figcaption traci absolute overlay; `captionInside=null`, style pusty. | Nie publikowano tej zmiany. | Dziala | `renderCaption` branch `below` renderuje caption pod tile. | Brak. |
| Caption position: Hover | Select `On hover` | Figcaption wraca inside z hover classes; static/no-link tiles maja keyboard focus fallback w rendererze. | Nie publikowano tej zmiany. | Dziala | Renderer dodaje hover/focus classes i `tabIndex` dla static hover captions. | Brak. |
| Overlay color | Ustaw `#ff0000` | Overlay zachowuje opacity: `rgba(255, 0, 0, 0.35)`. | Nie publikowano tej zmiany. | Dziala | `applyColorWithExistingAlpha` zachowuje alpha z poprzedniego `rgba`. | Brak. |
| Overlay Clear | Klik `Clear` | Caption style znika, Advanced pokazuje `Overlay cleared`, editor status `Theme default`. | Nie publikowano tej zmiany. | Dziala | `clearStyleField` usuwa `style.overlay`; renderer nie dodaje `background`. | Brak. |
| Ratio | Select `1:1` | Root `ratio=1:1`; placeholder tiles maja `aspect-square`, per-item lead zostaje `aspect-video`. | Nie publikowano tej zmiany. | Dziala | Section ratio dziala dla itemow `inherit`; per-item ratio nadal wygrywa. | Brak. |
| Gap | Select `Spacious` | Root `gap=lg`, grid class `gap-6`. | Nie publikowano tej zmiany. | Dziala | `gapClassMap.lg` daje `gap-6`. | Brak. |
| Radius | Select `Extra large` | Figure classes `rounded-xl`. | Nie publikowano tej zmiany. | Dziala | `radiusClassMap.xl`. | Brak. |
| Layout density | Select `Dense` | Root `density=dense`, Uniform Grid uzywa dense grid (`sm:grid-cols-3 lg:grid-cols-4`). | Nie publikowano tej zmiany. | Dziala | `layoutDensityGridClassMap["uniform-grid"].dense`. | Brak. |
| Motion preset | Select `Slide up` | Root `motion=slide-up`; figures maja `motion-safe:slide-in-from-bottom-2` i reduced-motion classes. | Nie publikowano tej zmiany. | Dziala | `motionPresetClassMap["slide-up"]`. | Brak. |
| Remove cancel | Klik Remove, confirm `false` | Przechwycony native confirm; count zostal 5. | Nie dotyczy. | Naprawione | TASK-379 przenosi per-item Remove na `ConfirmActionDialog`; cancel zamyka dialog bez mutacji i zachowuje item order/media. | Brak. |
| Remove accept | Klik Remove, confirm `true` | Count 5 -> 4. | Nie dotyczy. | Naprawione | `removeItem` jest teraz czysta mutacja bez browser-globali; akceptacja dialogu rozpoznaje pending item po id i dopiero wtedy usuwa. | Brak. |
| Advanced read-only | Klik `Advanced` | `rootCount=1`, `writableControls=0`, `formControls=0`, sekcje runtime/style/accessibility/contract obecne. | Nie dotyczy. | Dziala | Advanced editor renderuje tylko `ReadonlyWidgetSummaryRow`. | Brak. |
| Advanced interaction summary po wyczyszczeniu mediow | Po clear media przy `interaction.mode=lightbox` | Root nie ma lightbox root/triggers, ale Advanced nadal pisze `Interaction Lightbox, fill zoom` i `Link and lightbox behavior Lightbox, fill zoom`. | Nie dotyczy. | Naprawione | `describeGalleryInteractionSummary` uzywa owner helpera `countGalleryMosaicEligibleLightboxItems`, tego samego warunku co renderer lightbox root. | Pokryte regresja Advanced zero-media/lightbox i renderer helper testem. |

## Public baseline

`curl http://localhost:3000/audit-31-05-gallery-mosaic` zwrocil HTTP 200 i SSR
HTML z:

- `data-gallery-mosaic-variant="mosaic"`,
- `data-gallery-mosaic-gap="md"`,
- `data-gallery-mosaic-ratio="4:3"`,
- `data-gallery-mosaic-count="5"`,
- `data-gallery-mosaic-caption-position="inside"`,
- `data-gallery-mosaic-interaction="none"`,
- `data-gallery-mosaic-zoom="fit"`,
- `data-gallery-mosaic-layout-density="auto"`,
- `data-gallery-mosaic-motion="none"`,
- heading `Gallery highlights`,
- 5 image figures z Unsplash URLs,
- pierwszy item `data-gallery-media-type="image"` i `data-gallery-item-interaction="none"`.

To potwierdza, ze swieza strona audytowa publikuje domyslny Gallery Mosaic.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny.

## Ograniczenia fixture

Pierwotnie Media API w tym srodowisku zwrocilo `[]`, dlatego klikany pass nie
mogl uczciwie potwierdzic wyboru nowego image/video assetu ani poster image
przez MediaPicker. TASK-379 przeniosl ten brak do deterministycznego harnessu:
Gallery Mosaic image fixture jest uploadowany przez admin media API przed
proba, a video fixture jest zdefiniowany i uploadowany tam, gdzie storage policy
pozwala na `video/mp4`.

Publiczny route audytowy zostal zostawiony w domyslnym stanie static podczas
oryginalnego passu. TASK-379 dodaje smoke `mediaProof`, ktory w live replayu
publikuje fixture po wyborze seeded image i wlaczeniu lightboxa, a potem
sprawdza publiczne otwarcie i zamkniecie dialogu.

## Kod-owner

- `core/widgets/core/galleryMosaic.tsx`
  - schema/defaults/editor contract: okolice linii 191-425,
  - count reduction summary i normalization: okolice linii 581-668,
  - captions/alt/link/lightbox interaction: okolice linii 883-1254,
  - root attrs i wariant layoutu: okolice linii 1256-1448.
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
  - Advanced interaction summary helper: okolice linii 499-510,
  - count/add/remove/move helpers: okolice linii 549-640,
  - media picker/clear poster logic: okolice linii 838-955,
  - Visual media item cards: okolice linii 1121-1383,
  - interaction controls i preview notice: okolice linii 1385-1470,
  - count reduction ConfirmActionDialog: okolice linii 1473-1492,
  - overlay/layout/density/motion controls: okolice linii 1494-1709,
  - Advanced diagnostics: okolice linii 1714-1877.

## Rekomendacje

1. Zamkniete w TASK-379: Advanced interaction summary rozroznia selected
   `mode=lightbox` od realnych lightbox triggers.
2. Zamkniete w TASK-379: per-item `Remove` uzywa `ConfirmActionDialog`.
3. Zamkniete w TASK-379 dla image/lightbox proof: harness seeda Gallery Mosaic
   image i definiuje optional video seed dla storage policies dopuszczajacych
   `video/mp4`.
4. Zamkniete w TASK-379: browser-level public lightbox open/close proof jest w
   widget smoke `mediaProof`.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-gallery-mosaic run-code --filename .tmp/playwright-gallery-mosaic-compact.js` — passed.
- Admin console po przebiegu: `Errors: 0`, `Warnings: 0`.
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts` — passed, 1 test.
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx` — passed, 17 tests.
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` — passed, 4 tests.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- TASK-379 follow-up: focused regressions failed before fix for missing helper,
  native Remove, and stale Advanced summary; after fix
  `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
  passed, 24 tests.
- TASK-379 follow-up: `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
  passed, 23 tests.
- TASK-379 follow-up: `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget gallery-mosaic --output-json .tmp/task-379-gallery-mosaic-smoke-dry-run.json --output-md .tmp/task-379-gallery-mosaic-smoke-dry-run.md`
  passed with `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  `metadataGaps=0`.
