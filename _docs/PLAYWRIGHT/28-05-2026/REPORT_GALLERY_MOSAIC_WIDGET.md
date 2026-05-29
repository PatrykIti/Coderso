# RAPORT: Gallery Mosaic Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade wcześniejszego raportu z 28-05-2026)
> **Sesja Playwright:** `claude-29-05-gallery-mosaic-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/5b42d115-258d-4967-9936-e3ca11972a14` (strona „Contract Test - gallery-mosaic"). UWAGA: ta strona zawiera **wiele** widgetów na canvasie (m.in. Hero, Testimonials, Logo Cloud); po czystym przeładowaniu domyślnie zaznaczony jest **Gallery Mosaic**, ale każde kliknięcie innego bloku na canvasie zmienia zaznaczenie i podmienia edytor po prawej.
> **Fixture public:** http://localhost:3000/gallery-mosaic-test-0516
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/galleryMosaic.tsx` (renderer + typy + normalizacja + runtime lightbox) · `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/LinkDestinationField.tsx` · `core/admin/ui/media/MediaPicker.tsx`

> **Metodologia (różnica względem poprzedniej wersji raportu):** ten przebieg jest **wyczerpujący**, nie „reprezentatywny". Dla każdej rodziny kontrolek widocznej w tym fixture przeszedłem **przez wszystkie dyskretne opcje przynajmniej raz**, jeśli było to wykonalne. Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją w UI **oraz** inspekcją DOM (atrybuty `data-gallery-mosaic-*`, `data-gallery-item-*`, `data-gallery-lightbox-*`, klasy Tailwind, inline `style`, ARIA, liczba triggerów/dialogów, treść inputów). Sweepy enumów wykonano realnymi kliknięciami Radix-comboboxów (open trigger → klik opcji), a nie podmianą stanu Reacta.

> **Uwaga o screenshotach:** główna weryfikacja w tym przebiegu opierała się **wyłącznie o inspekcję DOM** (a nie o zrzuty). Ewentualne pliki PNG (`.playwright-cli/`) są **wyłącznie lokalnymi etykietami** w katalogu ignorowanym przez Git — nie są dołączone do repo ani do żadnego pliku źródłowego i nie były wymaganym evidence.

---

## 1. Przegląd widgetu

**Typ:** `gallery-mosaic` · **Kategoria:** `content` · **Opis:** „Media gallery layouts for visual storytelling sections."

**Warianty:**

| Wariant | Charakterystyka | Siatka (density `auto`) |
|---------|-----------------|--------------------------|
| `mosaic` (domyślny) | Asymetryczny układ; **pierwszy kafelek** dostaje `lg:col-span-2 lg:row-span-2` (wyróżniony lead) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `uniform-grid` | Równe kafelki w czystej siatce | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `feature-left` | Duży lead po lewej + kolumna wspierająca po prawej (osobna logika `featureLeftLayoutDensityMap`) | `grid-cols-1 lg:grid-cols-3` (lead `lg:col-span-2`) |

**Model danych (`GalleryMosaicData`):** `header{title,description}` · `items[]{id,image,video,alt,poster,caption,href,objectPosition,ratio}` · `interaction{mode,zoom}` · `style{ratio,gap,radius,overlay,captionPosition,layoutDensity,motionPreset}`.

**Ograniczenia:** min 1 / max **16** kart (`galleryMosaicItemMin=1`, `galleryMosaicItemMax=16` — potwierdzone realnie: combobox liczby kart oferuje dokładnie 1–16). Liczba renderowanych kafelków zależy od **długości tablicy `items`**.

**Renderowanie:** `<section class="mx-auto w-full max-w-6xl px-4 py-8">` z opcjonalnym wyśrodkowanym `<header>` (`<h3>` + `<p>`) i siatką `figure`-kafelków. Każdy kafelek: **video > image > placeholder**. Caption jako `<figcaption>`: `inside`/`hover` = overlay absolutny na dole (z tłem `overlay`), `below` = `<figcaption class="mt-2 …">` pod kafelkiem. Interakcja per-kafelek: `href` → `<a>` (link wygrywa zawsze), inaczej `lightbox` (gdy `mode=lightbox` i są media) → `<button data-gallery-lightbox-trigger>` + `<div role="dialog">`, inaczej `none`. Lightbox sterowany **wstrzykiwanym skryptem runtime** (`dangerouslySetInnerHTML`).

---

## 2. Architektura trybów edytora

Panel edytora po prawej ma **dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się przyciskiem **„Run setup again"** (po setupie panel pokazuje *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*); Wizard kończy przycisk **„Finish setup and open Visual"**.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | „Starter media": karty wariantu + read-only „Section title" + select „Initial media count" (1–16) + read-only „Configured media" + tekst. Dodatkowo własny panel **„Live preview"** (współdzielony renderer). |
| **Visual** | zakładka „Visual" | **7 sekcji**: (1) Variant and media structure, (2) Header copy, (3) Media items and links, (4) Interaction, (5) Overlay and caption controls, (6) Layout style, (7) Density and motion. |
| **Advanced** | zakładka „Advanced" | **4 read-only sekcje**: Runtime summary, Style summary, Accessibility diagnostics, Contract summary. **Zero kontrolek edytowalnych** (potwierdzone: w panelu Advanced nie ma żadnego `combobox/textbox/checkbox/slider`). |

---

## 3. Pełna mapa rodzin kontrolek i status pokrycia

| Rodzina | Kontrolka | Liczba dyskretnych opcji | Pokrycie w tym przebiegu |
|---------|-----------|--------------------------|--------------------------|
| Karty wariantu (radio cards) | Variant (Wizard + Visual) | 3 | **Wszystkie 3** (mosaic / uniform-grid / feature-left), w Wizardzie i w Visual |
| Combobox | Initial media count (Wizard) | 16 | **Wszystkie 16** (1→16) |
| Combobox | Items count (Visual) | 16 + dialog redukcji | wartość + **dialog redukcji (dismiss + accept)** |
| Combobox | Interaction mode | 2 | **Obie** (none / lightbox) |
| Combobox | Lightbox zoom | 2 | **Obie** (fit / fill) + stan `disabled` |
| Combobox | Caption position | 3 | **Wszystkie 3** (inside / below / hover) |
| Combobox | Ratio (sekcja) | 4 | **Wszystkie 4** (1:1 / 4:3 / 16:9 / 3:4) |
| Combobox | Gap | 4 | **Wszystkie 4** (none / sm / md / lg) |
| Combobox | Radius | 4 | **Wszystkie 4** (none / md / lg / xl) |
| Combobox | Layout density | 4 | **Wszystkie 4** × **wszystkie 3 warianty** (12 kombinacji) |
| Combobox | Motion preset | 3 | **Wszystkie 3** (none / fade / slide-up) |
| Combobox (per-item) | Focus point | 5 | **Wszystkie 5** (center/top/bottom/left/right) |
| Combobox (per-item) | Item ratio | 5 | **Wszystkie 5** (inherit/1:1/4:3/16:9/3:4) |
| Destination picker (per-item) | Destination page | wybór strony + „No destination" + Clear | wybór („HomePage") + „Clear destination" + feedback |
| Media picker (per-item) | Browse media (modal) | — | otwarcie modala + **realny wybór assetu** + „Clear media and poster" |
| Media picker (per-item) | Poster image | — | **NIE testowalne** (patrz §6 — brak assetów wideo) |
| Color clear | Overlay color + „Clear" | swatch / Clear / alpha | swatch z zachowaniem alfy + Clear (disabled) + swatch po Clear |
| Repeatable | Add item / Remove / Move up / Move down / drag handle / Alt+Strzałki | — | **wszystkie** ścieżki |
| Switch / toggle | — | — | **Brak takich kontrolek w tym widgecie** (wszystko to comboboxy/karty) |
| Import / Export config | — | — | **Brak kontrolki UI** (funkcje istnieją w kodzie, ale nieeksponowane) |

---

## 4. Co DZIAŁA — szczegóły z dowodami z DOM

### 4.1 Wizard

- **Karty wariantu** — przełączanie działa dla **wszystkich trzech** opcji i **synchronicznie** aktualizuje główny canvas **oraz** panel „Live preview" (potwierdzone: w Wizardzie istnieją dwie sekcje `[data-gallery-mosaic-variant]` i obie reagują identycznie):
  - Uniform Grid → `variant=uniform-grid`, siatka `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, lead **traci** span (pusta klasa wrappera).
  - Feature Left → `variant=feature-left`, lead `lg:col-span-2`, kontener `grid grid-cols-1 grid grid-cols-1 lg:grid-cols-3 gap-4` (duplikat klas — patrz N6).
  - Mosaic → `variant=mosaic`, lead `lg:col-span-2 lg:row-span-2`.
- **„Initial media count" — przetestowane WSZYSTKIE 16 wartości (1→16)**. Dla każdej wartości N **oba** rendery (canvas + Live preview) pokazały dokładnie N kafelków (`data-gallery-mosaic-count=N`, `figure.length=N`). Zero rozjazdów. W Wizardzie zwiększanie/zmniejszanie **nie pyta** o potwierdzenie (osobny od Visual kod `setItemCount`).
- **Read-only „Section title"** i **„Configured media"** wiernie odzwierciedlają stan („Gallery highlights", „5 of 5 items currently have media").
- **„Finish setup and open Visual"** wraca do Visual i przywraca komunikat „Setup complete". ✓

### 4.2 Visual — sweepy enumów (każda opcja kliknięta i zweryfikowana w DOM)

**Caption position** (3/3):
| Opcja | `data-…-caption-position` | klasy `figcaption` | rodzic |
|------|---------------------------|--------------------|--------|
| Inside tile | `inside` | `pointer-events-none absolute …` | FIGURE (overlay) |
| Below tile | `below` | `mt-2 …` | FIGURE (pod kafelkiem) |
| On hover | `hover` | `… opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100` | FIGURE |

**Ratio sekcji** (4/4): `1:1`→`aspect-square`, `4:3`→`aspect-[4/3]`, `16:9`→`aspect-video`, `3:4`→`aspect-[3/4]`.

**Gap** (4/4): `None`→`gap-0`, `Compact`→`gap-2`, `Default`→`gap-4`, `Spacious`→`gap-6` (potwierdzone na klasie kontenera siatki).

**Radius** (4/4): `None`→brak klasy `rounded-*`, `Medium`→`rounded-md`, `Large`→`rounded-lg`, `Extra large`→`rounded-xl` (na `figure`).

**Layout density** (4/4) — przetestowane **dla wszystkich 3 wariantów** (12 kombinacji), zgodne z mapami w kodzie:

| Wariant | auto | compact | balanced | dense |
|---------|------|---------|----------|-------|
| mosaic (grid) | `sm:grid-cols-2 lg:grid-cols-4` | `sm:grid-cols-2 lg:grid-cols-3` | `sm:grid-cols-2 lg:grid-cols-4` | `sm:grid-cols-3 lg:grid-cols-5` |
| uniform-grid (grid) | `sm:grid-cols-2 lg:grid-cols-3` | `sm:grid-cols-2 lg:grid-cols-2` | `sm:grid-cols-2 lg:grid-cols-3` | `sm:grid-cols-3 lg:grid-cols-4` |
| feature-left (kontener / lead) | `lg:grid-cols-3` / lead `lg:col-span-2` | `lg:grid-cols-2` / lead pusty | `sm:grid-cols-2 lg:grid-cols-3` / lead `sm:col-span-2 lg:col-span-2` | `sm:grid-cols-2 lg:grid-cols-4` / lead `sm:col-span-2 lg:col-span-2` |

> We wszystkich wariantach `feature-left` kontener ma zduplikowane `grid grid-cols-1 grid grid-cols-1 …` (N6) — bez wpływu na render, brzydkie w DOM.

**Motion preset** (3/3): `No motion`→`motion=none` (brak klas animacji), `Fade in`→`motion=fade` + `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:transform-none motion-reduce:transition-none`, `Slide up`→`motion=slide-up` + `… motion-safe:slide-in-from-bottom-2 …` (oba presety zawierają warianty `motion-reduce:*` — respekt dla reduced-motion na poziomie klas).

**Focus point per-item** (5/5, item 1) — inline `object-position`: `Center`→`center center`, `Top`→`center top`, `Bottom`→`center bottom`, `Left`→`left center`, `Right`→`right center`.

**Item ratio per-item** (5/5, item 1) — na `figure`: `Inherit section ratio`→dziedziczy ratio sekcji (`aspect-[4/3]`), `1:1`→`aspect-square`, `4:3`→`aspect-[4/3]`, `16:9`→`aspect-video`, `3:4`→`aspect-[3/4]`. Override per-kafelek wygrywa nad ratio sekcji.

**Items count w Visual + dialog redukcji**:
- redukcja 5→4 wywołuje natywny `confirm`: **„Reducing the item count will remove the last 1 gallery item. Continue?"** (poprawna liczba pojedyncza „item" dla 1 elementu);
- **dismiss zachowuje** stan (count=5), **accept redukuje** (count=4). ✓

### 4.3 Interaction + Lightbox

| Stan | interaction | zoom | lbRoot | lbCount | triggers | dialogs | `<script>` | zoom select |
|------|-------------|------|--------|---------|----------|---------|-----------|-------------|
| Static (none) | `none` | `fit` | — | — | 0 | 0 | brak | **disabled** ✓ |
| Lightbox on | `lightbox` | `fit` | `1` | (= liczba mediów bez href) | = lbCount | = lbCount | wstrzyknięty | enabled |
| Zoom Fill | `lightbox` | `fill` | `1` | … | … | … | … | dialog `data-…-zoom=fill`, media `h-[min(80vh,42rem)] w-full object-cover` |
| Zoom Fit | `lightbox` | `fit` | `1` | … | … | … | … | dialog `data-…-zoom=fit`, media `max-h-[80vh] w-full object-contain` |

- **Wyjątek dla linkowanego kafelka:** po ustawieniu `Destination page = HomePage` na kafelku 1 i włączeniu lightboxa, kafelek 1 **zachowuje** `data-gallery-item-interaction=link`, a kafelki 2–4 (media, bez href) stają się `lightbox`. `lbCount` spadło z 4 do **3**. ✓
- **Ostrzeżenie (Visual)** pojawia się dokładnie jako: **„1 linked item still use navigation. Clear each destination to open that tile in the lightbox instead."** — uwaga na agramatyzm „1 linked item still **use**" (powinno „uses") — patrz N2.
- **Feedback w polu Destination** (przy lightboxie + href): „This item keeps link navigation. Clear the destination to open it in the lightbox instead." ✓
- Po **„Clear destination"** kafelek 1 wraca do `lightbox`, `lbCount=4`, `triggers=4`, `dialogs=4` (multi-trigger potwierdzony). ✓

**Runtime lightbox — silne potwierdzenie logiki (nowość względem poprzedniego raportu):**
- W canvas admina React **nie wykonuje** wstrzykniętego `<script>` przy montażu (`root.dataset.galleryLightboxBound === undefined`, dialogi pozostają `hidden`, klik triggera **nie** otwiera) — to znana cecha `dangerouslySetInnerHTML` (N1).
- **Wykonałem ten sam skrypt ręcznie** (eval treści `<script>`) na żywym DOM canvasu i w jednym przebiegu sprawdziłem pełen cykl:
  - po bind: `data-gallery-lightbox-bound=true`, `data-gallery-lightbox-open=false`;
  - **klik triggera → otwarcie**: właściwy dialog (`…-lightbox-gallery-2`) dostaje `data-state=active`, `aria-hidden=false`, root `…-open=true`;
  - **Escape → zamknięcie**: `…-open=false`, brak widocznych dialogów;
  - **klik w backdrop → zamknięcie**: `…-open=false`, brak widocznych dialogów.
- Wniosek: **logika runtime jest poprawna i działa** (open/Escape/backdrop/focus). Jedyny realny brak to brak **auto-wykonania** skryptu w CSR-owym podglądzie admina (N1); na SSR froncie skrypt wykonałby się normalnie.

### 4.4 Header copy, captiony, alt, destination

- **Header Title** → „Galeria realizacji" (aktualizuje `header > h3` na żywo). **Description** → „Wybrane projekty i kampanie wizualne." (`header > p`). ✓
- **Caption (item 1)** → „Nowy podpis testowy" (`figcaption`). ✓
- **Alt text (item 1)** → „Alternatywny opis obrazka" — alt **nadpisuje** caption jako `img[alt]` i jako accessible name (oraz `aria-label` linku). ✓
- **Destination page (item 1)** → „HomePage": kafelek owinięty w `<a href="/homepage">`, `data-gallery-item-interaction=link`, `aria-label` z alt-tekstu. Link **wewnętrzny** nie dostaje `rel/target` (poprawnie — `noopener noreferrer` jest tylko dla zewnętrznych, patrz front §4.6). „Clear destination" usuwa href. ✓

### 4.5 Overlay color (color clear / alpha)

- Stan domyślny: `figcaption` ma `background: rgba(15, 23, 42, 0.35)`, badge **„Selected color"** (poprawny rgba → nie pokazuje mylącego „Saved custom color").
- **Swatch z zachowaniem alfy:** zmiana swatcha na `#ff0000` przy istniejącej alfie `0.35` → `background: rgba(255, 0, 0, 0.35)` — **alfa zachowana** (`applyColorWithExistingAlpha` działa). Badge dalej „Selected color", przycisk „Clear" aktywny. ✓ (poprzedni raport tego nie weryfikował realnie).
- **„Clear":** usuwa overlay (`background` znika → brak tła), badge → **„Theme default"**, przycisk „Clear" → **`disabled`**. ✓
- **Swatch po Clear (brak alfy):** zmiana swatcha na `#00ff00` → `background: rgb(0, 255, 0)` — **pełna nieprzezroczystość** (brak alfy do zachowania). To potwierdza niuans N3: po wyczyszczeniu autor traci „miękkość" 35% i dostaje kolor lity.

### 4.6 Media picker (Browse media)

- „Browse media" otwiera **Radix Dialog** „Media library" z polem wyszukiwania i siatką assetów + przyciskiem „Done".
- **Realny wybór assetu:** kliknięcie kafelka w siatce **podmieniło** obraz kafelka 1 z `https://images.unsplash.com/…` na lokalny `http://localhost:3000/media/2026/02/…png`, `data-gallery-media-type` pozostał `image`, **dialog zamknął się automatycznie**, brak błędu. ✓
- **„Clear media and poster"** → kafelek 1 staje się `placeholder` (brak `<img>`, placeholder pokazuje caption). ✓
- Biblioteka Mediów w tym środowisku zawiera **5 assetów, wszystkie PNG** (`cos1.png`, `image.png` ×4) — brak wideo (istotne dla §6).

### 4.7 Repeatable items (add / remove / reorder)

- **Add item:** 4→5, nowy „Media 5" jako `placeholder` dopisany na końcu. ✓
- **Remove (z confirm):** komunikat **„Remove item 5? This action cannot be undone."**; **dismiss** zachowuje (count=5), **accept** usuwa (count=4). ✓
- **Move down / Move up:** reorder działa w obu kierunkach (zweryfikowane na kolejności captionów: `Move down` item1 i `Move up` item3 przesuwają element o jedną pozycję). ✓
- **Drag-and-drop uchwytem `[data-gallery-drag-handle]`:** zweryfikowane realnymi zdarzeniami HTML5 (`dragstart`/`dragover`/`drop` ze wspólnym `DataTransfer`) — **kolejność się zmienia** (handlery `onDragStart/onDragOver/onDrop` + `moveItem` działają). *Uwaga narzędziowa:* wbudowany `drag` Playwrighta (myszą) **nie** napędza natywnego HTML5 DnD — użyłem syntetycznych `DragEvent`.
- **Klawiaturowy reorder Alt+Strzałki** na uchwycie: **Alt+ArrowDown** przesuwa element w dół, **Alt+ArrowUp** w górę — oba kierunki potwierdzone na kolejności captionów. ✓

### 4.8 Advanced (read-only) — żywe lustro draftu

Advanced jest w 100% read-only (brak jakiejkolwiek kontrolki edytowalnej) i **wiernie** odzwierciedlił mój bieżący (niezapisany) stan roboczy:

- **Runtime summary:** Variant `mosaic`, Media items `4 items`, Configured media `3 items with media` (kafelek 1 wyczyszczony do placeholdera → 3/4 z mediami), Linked items `0 destinations` (po „Clear destination"), Interaction `Static tiles`. ✓
- **Style summary:** Layout style `4:3 · md · lg`, Caption position `inside`, Overlay `Overlay configured`, Density `auto`, Motion `none`. ✓
- **Accessibility diagnostics:** Section heading `Galeria realizacji` (mój edytowany tytuł), Helper copy configured, Alt text coverage `0/3 media items have custom alt text` (kafelek z moim alt-tekstem jest teraz placeholderem, więc wypada z liczenia), Poster coverage `No video items configured`. ✓
- **Contract summary:** jasny podział własności Wizard/Visual/Advanced. ✓

### 4.9 Frontend (public `/gallery-mosaic-test-0516`)

Trasa zwraca **HTTP 200** i renderuje **opublikowaną** kuratorowaną konfigurację — **inną** niż mój draft (izolacja zachowana):

- `variant=mosaic`, `ratio=4:3`, `gap=md`, `radius=md` (`rounded-md`), `count=5`, `caption-position=hover`, `interaction=none`, `density=auto`, `motion=none`, `lightbox-root=null`, `scriptInjected=false`.
- Header: **„Mosaic — hover caption"** / „Hover na kafelku pokazuje caption".
- 5 kafelków `image`, captiony „Caption item 1…5", overlay captionów `rgba(0, 0, 0, 0.3)`.
- **Kafelek 1 = link zewnętrzny:** `href="https://example.com/item1"`, **`rel="noopener noreferrer"`** mimo `target=null` (poprawne zabezpieczenie, `resolveWidgetLinkAttrs`), `aria-label="Caption item 1"`. Figura linku **nie** ma `tabindex` (bo opakowuje ją `<a>`).
- **Hover-caption a11y:** kafelki statyczne (2–5, `interaction=none`) w trybie `hover` dostają **`tabindex="0"` + `aria-label`**, a `figcaption` ma `group-hover`/`group-focus-within` → caption dostępny także z klawiatury (focus). ✓
- **Semantyka:** `SECTION` → `header` → `H3` + 5× `figure` z `figcaption`; wszystkie `img` z `loading="lazy"`. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** `scrollWidth == clientWidth == 375` (brak poziomego overflow), siatka schodzi do **jednej kolumny** (`grid-template-columns: 343px`, kafelek 343 px). ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Lightbox nieaktywny w podglądzie admina** | Renderer / runtime | Markup + ARIA + `<script>` są poprawne, ale React **nie wykonuje** skryptu z `dangerouslySetInnerHTML` przy montażu (`galleryLightboxBound` niezdefiniowany; klik triggera nie otwiera dialogu). **Potwierdziłem jednak, że sama logika runtime jest poprawna** — po ręcznym wykonaniu skryptu open/Escape/backdrop działają bezbłędnie. Brak dotyczy wyłącznie **auto-wiązania w CSR adminie**; na SSR froncie skrypt by się wykonał. |
| **N2 — Agramatyzm liczby pojedynczej w komunikatach o linkach** | Visual ostrzeżenie + Advanced summary | Dla 1 linkowanego kafelka: „1 linked item still **use** navigation" (Visual, zaobserwowane wprost) oraz analogicznie „…1 linked item **keep** navigation" (Advanced, w kodzie). Rzeczownik odmieniany poprawnie (`item`/`items`), ale czasownik zahardkodowany w liczbie mnogiej (powinno „uses"/„keeps"). Kosmetyka copy. |
| **N3 — Picker overlay ukrywa kanał alfa** | Visual / overlay | `<input type="color">` operuje tylko na hex; zapisana przezroczystość (domyślnie `0.35`) **nie jest widoczna** w UI (brak pola tekstowego z surowym `rgba`). Potwierdzone realnie: zmiana swatcha **przy** istniejącej alfie zachowuje ją (`rgba(255,0,0,0.35)`), ale zmiana swatcha **po** „Clear" daje kolor lity (`rgb(0,255,0)`). Logika poprawna, ale dla autora nieprzejrzysta. |
| **N4 — `<section>` bez `aria-label`/`aria-labelledby`** | Renderer / a11y | Główny kontener `<section data-gallery-mosaic-variant>` nie ma dostępnej nazwy (`aria-label=null`) — potwierdzone w adminie i na froncie. Reszta semantyki dobra. |
| **N5 — Rozjazd: draft (defaulty) vs opublikowany front (kuratorowana konfiguracja)** | Dane / publish | Przy wejściu canvas draftu renderuje **domyślny widget** (mosaic, 5 kart, „Gallery highlights", media Unsplash, overlay 0.35, radius lg), a publiczna trasa serwuje **inną** zapisaną konfigurację (hover caption, „Mosaic — hover caption", radius md, overlay `rgba(0,0,0,0.3)`, Item 1 = link zewnętrzny). Nie zapisywałem/publikowałem. Pozytyw: niezapisane edycje **nie wyciekają** na front. |
| **N6 — Duplikacja klas siatki (feature-left)** | Renderer | Kontener `feature-left` dostaje zduplikowane `grid grid-cols-1 grid grid-cols-1 …` (sklejanie bazy `joinClasses` z klasą density). Potwierdzone we **wszystkich 4** wartościach density. Bez wpływu na render. |
| **N7 — Redukcja liczby kart jest destrukcyjna i nieodwracalna przez ponowne zwiększenie** | Visual / Wizard count | Zejście np. do 1 kafelka, a potem powrót do 5, **nie odtwarza** oryginalnych mediów kafelków 2–5 — `normalizeGalleryMosaicItems` tworzy świeże placeholdery z fallback-captionami („Visual detail", „Story frame", …). To zachowanie zgodne z modelem (count trymuje od końca), ale **utrata danych** jest cicha przy zwiększaniu (confirm jest tylko przy redukcji). Potwierdzone w trakcie sweepu count. |
| **N8 — Wizard ukryty za „Run setup again"** | UX nawigacji | Tryb Wizard nie jest równorzędną zakładką — dla szukającego „kreatora" nie jest to oczywiste. |
| **N9 — Strona-fixture jest wielowidgetowa** | UX audytu (nie bug) | `/admin/pages/5b42d115…` zawiera wiele widgetów; zaznaczenie łatwo zmienić klikając canvas, co podmienia edytor po prawej. Dla audytu trzeba pilnować, by zaznaczony pozostał Gallery Mosaic (czysty reload domyślnie go zaznacza). |

**Nie wykryto** błędów konsoli na froncie, twardego buga renderowania, ani rozjazdu render admin↔front dla wspólnie testowanych opcji (poza celową izolacją niezapisanych zmian i N5). Wszystkie przetestowane kontrolki Visual/Wizard aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan roboczy; front jest responsywny, bez błędów konsoli i poprawny semantycznie (poza N4). **Jedyny realny brak funkcjonalny** to N1 (auto-wiązanie lightboxa w CSR adminie).

---

## 6. Czego NIE udało się w pełni zweryfikować (dokładnie która kontrolka i dlaczego)

- **Poster image (per-item media picker dla wideo)** — kontrolka renderuje się **wyłącznie** dla kafelków z wideo (`item.video`). Jedyny sposób ustawienia wideo to wybór assetu wideo w „Browse media", a **Biblioteka Mediów w tym środowisku nie zawiera żadnego assetu wideo** (5 assetów, same PNG). W konsekwencji **nie dało się utworzyć kafelka wideo**, więc sekcja „Poster image", „Clear poster", komunikat „Poster images only display when this item uses a video asset" oraz ścieżka błędu `gallery_mosaic_poster_media_invalid` **są niedostępne do kliknięcia w tym fixture**. Zablokowane przez **zawartość biblioteki**, nie przez bug.
- **Realne auto-wykonanie lightboxa na SSR froncie** — opublikowany fixture ma `interaction=none` (brak markupu lightboxa, `scriptInjected=false`), a CSR admin nie auto-wykonuje skryptu (N1). Nie istnieje więc opublikowana strona z lightboxem, na której można by zaobserwować **automatyczne** związanie skryptu w przeglądarce. *Mitygacja:* logikę runtime potwierdziłem wykonując skrypt ręcznie (open/Escape/backdrop — §4.3).
- **Zapis i publikacja** — świadomie **nie** klikałem „Save draft"/„Publish" (by nie modyfikować współdzielonego fixture). Stąd: trwałość edycji po przeładowaniu niezweryfikowana (potwierdzona tylko w obrębie sesji edytora — Advanced wiernie podsumował draft). Przy przeładowaniach admin **ostrzegał** natywnym dialogiem `beforeunload` o niezapisanych zmianach (pozytyw) — akceptowałem go, by przeładować.
- **Pełna lista stron w destination pickerze** — wybrałem realnie „HomePage" i wyczyściłem; **nie** klikałem każdej z ~50 opublikowanych stron osobno (to lista danych, nie zbiór dyskretnych trybów — wszystkie używają tej samej ścieżki `resolvePageDestinationHref`). Zweryfikowałem wybór strony + „Clear destination" + feedback.
- **Realna nawigacja po kliknięciu linku na froncie** — nie klikałem zewnętrznego `example.com` (by nie opuszczać strony); sprawdziłem atrybuty `href`/`rel`/`target`/`aria-label`.
- **`prefers-reduced-motion` (efekt wizualny)** — klasy `motion-reduce:*` są obecne w obu presetach ruchu (potwierdzone w DOM), ale faktycznego zatrzymania animacji pod włączoną redukcją ruchu nie mierzyłem (efekt czysto CSS-owy).
- **Import/Export konfiguracji** — `exportGalleryMosaicConfig`/`importGalleryMosaicConfig` istnieją w kodzie, ale **żaden tryb edytora nie eksponuje kontrolki UI** do tych funkcji — niedostępne do przetestowania w UI.
- **Ostrzeżenie feature-left dla 1 kafelka** (`items.length===1` → „Feature Left works best with one lead tile plus at least one supporting item.") — nie wyzwolone w tym przebiegu (wymagałoby redukcji feature-left do 1 kafelka).

---

## 7. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/gallery-mosaic-test-0516`) | Zgodność |
|--------|----------------------|-----------------------------------------|----------|
| Renderer | żywy `GalleryMosaicBlock`, atrybuty `data-gallery-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo | tak (canvas + Wizard Live preview, oba synchronicznie) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu: **defaulty**; potem: niezapisany draft | **opublikowana** kuratorowana konfiguracja | ⚠ rozjazd (N5) |
| Link kafelka (safe href, rel) | te same reguły (link wewn. → bez rel) | `rel="noopener noreferrer"` dla zewn. linku | ✓ |
| Semantyka `section/header/h3/figure/figcaption` | obecna | obecna | ✓ |
| `aria-label` na `<section>` | brak | brak | ⚠ oba (N4) |
| Hover-caption a11y (tabindex/aria) | obecne (gdy interaction none) | obecne (kafelki 2–5: `tabindex=0`) | ✓ |
| **Lightbox — interaktywność** | markup TAK; auto-JS NIE (N1); **logika potwierdzona ręcznie** | brak (fixture `interaction=none`) | ⚠ N1 |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |
| Responsywność 375 px | n/d | single-column, brak overflow | ✓ |

---

## 8. Podsumowanie

- **Gallery Mosaic jest w bardzo dobrym stanie funkcjonalnym.** W tym przebiegu przeszedłem realnie **przez wszystkie dyskretne opcje każdej dostępnej rodziny kontrolek**: 3 warianty (Wizard+Visual), **wszystkie 16** wartości liczby kart, dialog redukcji (dismiss+accept), interaction (2) + zoom (2, ze stanem disabled), caption position (3), ratio (4), gap (4), radius (4), **density (4) × 3 warianty = 12 kombinacji**, motion (3), focus point (5), item ratio (5), destination (wybór + clear + feedback), media picker (realny wybór + clear), overlay (swatch + alpha + clear + opaque-po-clear) oraz **pełny zestaw repeatable** (add / remove z confirm / move up / move down / drag-and-drop / Alt+Strzałki). Wszystkie aktualizują podgląd na żywo, a Advanced (read-only) wiernie je podsumowuje.
- **Najmocniejszy nowy wynik:** runtime lightboxa **działa** — open/Escape/backdrop potwierdzone przez ręczne wykonanie wstrzykniętego skryptu na żywym DOM. Jedyny realny brak (N1) to to, że React **nie auto-wykonuje** tego skryptu w CSR-owym podglądzie admina (`dangerouslySetInnerHTML`); na SSR froncie wykonałby się.
- **Niedostępne w tym fixture (uczciwie):** Poster image (brak assetów wideo w bibliotece), auto-lightbox na SSR (opublikowany fixture ma `interaction=none`), Import/Export (brak UI), zapis/publikacja (świadomie pominięte).
- **Niespójności / kosmetyka:** agramatyzm „1 linked item use/keep" (N2), ukryty kanał alfa overlay (N3), brak `aria-label` na `<section>` (N4), duplikacja klas siatki feature-left (N6), destrukcyjna i cicha utrata mediów przy zwiększaniu count po wcześniejszej redukcji (N7).
- **Plusy:** działający „Clear" overlay z `disabled`-state i poprawnym zachowaniem alfy, badge „Selected color" zamiast mylącego „Saved custom color" dla domyślnej rgba, bezpieczne linki (`rel=noopener noreferrer` dla zewnętrznych, brak zbędnego rel dla wewnętrznych), per-kafelek override ratio, **potwierdzenie przy redukcji liczby kart**, dostępny hover-caption (tabindex/aria), `loading=lazy`, animacje `motion-reduce`-safe, ostrzeżenie `beforeunload`, oraz pełna synchronizacja canvas ↔ Wizard Live preview.

---

## 9. Screenshoty (lokalne etykiety)

> W tym przebiegu weryfikacja opierała się **w całości o inspekcję DOM** (atrybuty, klasy, ARIA, treść inputów, liczba triggerów/dialogów), a nie o zrzuty ekranu — dlatego **nie dołączono żadnych PNG**. Gdyby jakiekolwiek przechwycenia zostały zrobione, byłyby **wyłącznie lokalnymi etykietami** w `.playwright-cli/` (katalog ignorowany przez Git), nieobecnymi w repo i niebędącymi wymaganym evidence.
