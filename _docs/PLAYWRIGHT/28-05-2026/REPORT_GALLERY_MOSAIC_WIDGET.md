# RAPORT: Gallery Mosaic Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-gallery-mosaic` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/5b42d115-258d-4967-9936-e3ca11972a14` (strona „Contract Test - gallery-mosaic", status `Draft`)
> **Fixture public:** http://localhost:3000/gallery-mosaic-test-0516
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/galleryMosaic.tsx` (renderer + typy + normalizacja + runtime lightbox) · `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-gallery-mosaic-*`, `data-gallery-item-*`,
> `data-gallery-lightbox-*`, klasy Tailwind, inline `style`, ARIA), a nie tylko
> zliczeniem widocznych sekcji. Sekcje 4–7 jasno oddzielają: co działa, co nie
> działa / jest mylące, co faktycznie przetestowano oraz czego NIE testowano.

> Uwaga o screenshotach: ewentualne pliki PNG (sekcja 9) są **wyłącznie lokalnymi
> etykietami** przechwyceń Playwright w katalogu `.playwright-cli/` (ignorowanym
> przez Git). Nie są wymaganym evidence i nie zostały dołączone do żadnego pliku
> źródłowego. Główna weryfikacja opierała się o inspekcję DOM, nie o zrzuty.

---

## 1. Przegląd widgetu

**Typ:** `gallery-mosaic` · **Kategoria:** `content` · **Opis:** „Media gallery layouts for visual storytelling sections."

**Warianty:**

| Wariant | Charakterystyka | Siatka (density `auto`) |
|---------|-----------------|--------------------------|
| `mosaic` (domyślny) | Asymetryczny układ; **pierwszy kafelek** dostaje `lg:col-span-2 lg:row-span-2` (wyróżniony lead) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `uniform-grid` | Równe kafelki w czystej siatce | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `feature-left` | Duży lead po lewej + kolumna wspierająca po prawej (osobna logika `featureLeftLayoutDensityMap`) | `grid-cols-1 lg:grid-cols-3` (lead `lg:col-span-2`) |

**Model danych (`GalleryMosaicData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `title`, `description` |
| **items[]** | `id`, `image`, `video`, `alt`, `poster`, `caption`, `href`, `objectPosition` (center/top/bottom/left/right), `ratio` (inherit/1:1/4:3/16:9/3:4) |
| **interaction** | `mode` (none/lightbox), `zoom` (fit/fill) |
| **style** | `ratio` (1:1/4:3/16:9/3:4), `gap` (none/sm/md/lg), `radius` (none/md/lg/xl), `overlay` (clearable), `captionPosition` (inside/below/hover), `layoutDensity` (auto/compact/balanced/dense), `motionPreset` (none/fade/slide-up) |

**Ograniczenia:** min 1 / max **16** kart (`galleryMosaicItemMin=1`, `galleryMosaicItemMax=16` — potwierdzone realnie: dropdown liczby kart oferuje 1–16). Liczba renderowanych kafelków jest sterowana **długością tablicy `items`**, a nie liczbą slotów (jak feature-grid, w przeciwieństwie do accordion/tabs).

**Renderowanie:** `<section class="mx-auto w-full max-w-6xl px-4 py-8">` z opcjonalnym wyśrodkowanym `<header>` (`<h3>` + opis `<p>`) i siatką `figure`-kafelków. Każdy kafelek: **video > image > placeholder** (priorytet wideo nad obrazem, placeholder gdy brak mediów). Caption renderowany jako `<figcaption>`: tryb `inside`/`hover` = overlay absolutny na dole (z tłem `overlay`), tryb `below` = `<figcaption class="mt-2 …">` pod kafelkiem. Interakcja per-kafelek: `href` → `<a>` (link wygrywa zawsze), inaczej `lightbox` (gdy `mode=lightbox` i są media) → `<button data-gallery-lightbox-trigger>` + `<div role="dialog">`, inaczej `none`. Lightbox jest sterowany **wstrzykiwanym skryptem runtime** (`dangerouslySetInnerHTML`).

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje komunikat *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `feature-grid`, `tabs`, `accordion` (patrz N8).

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Sekcja „Starter media": karty wariantu + read-only „Section title" + select „Initial media count" (1–16) + read-only „Configured media" + tekst informacyjny. Dodatkowo własny panel **„Live preview"** renderujący widget przez współdzielony renderer. |
| **Visual** | zakładka „Visual" | **7 sekcji widgetowych** (patrz niżej) + współdzielone sekcje wrappera („Block layout", „Device visibility"). |
| **Advanced** | zakładka „Advanced" | **4 read-only sekcje**: „Runtime summary", „Style summary", „Accessibility diagnostics", „Contract summary" + współdzielone podsumowania wrappera. **Brak jakichkolwiek edytowalnych kontrolek.** |

**7 sekcji Visual:** (1) „Variant and media structure" — karty wariantu + „Items count"; (2) „Header copy" — Title, Description; (3) „Media items and links" — per-kafelek: preview, MediaPicker „Browse media", Caption, Alt text, Destination page, Focus point, Item ratio, (warunkowo) Poster image; Reorder (drag/Move up/Move down/Remove); „Add item"; (4) „Interaction" — Interaction mode, Lightbox zoom; (5) „Overlay and caption controls" — Caption position, Overlay color (+Clear); (6) „Layout style" — Ratio, Gap, Radius; (7) „Density and motion" — Layout density, Motion preset.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonano w sesji `claude-28-05-gallery-mosaic` i zweryfikowano inspekcją DOM:

- **Wizard:** zmiana wariantu Mosaic → Uniform Grid → Feature Left → powrót Mosaic (weryfikacja: główny canvas + „Live preview" aktualizują się jednocześnie; znikanie/pojawianie klasy lead-tile, kontener feature-left); „Initial media count" → 8 (oba rendery rosną, nowe karty z fallback captions) → powrót 5; „Finish setup and open Visual".
- **Visual / struktura:** „Items count" → 6 (bez dialogu) → 5 (z dialogiem `confirm`, najpierw dismiss = zachowano, potem accept = zredukowano).
- **Visual / Header copy:** Title → „Galeria realizacji", Description → „Wybrane projekty i kampanie wizualne."
- **Visual / kafelki:** Caption (Item 1) → „Nowy podpis testowy"; Alt text (Item 1) → „Alternatywny opis obrazka"; Focus point (Item 1) → Top; Item ratio (Item 1) → 1:1; Destination page (Item 1) → „HomePage"; Move down (Item 1, reorder); Add item (5→6); Remove (Item 6, dismiss + accept).
- **Visual / Interaction:** Interaction mode → „Open lightbox on click" (sprawdzenie roots/triggers/dialogs/skryptu + wyjątku dla linkowanego kafelka + włączenia selectu zoom + ostrzeżenia).
- **Visual / Overlay i caption:** Caption position Inside → Below → Hover; Overlay color → `#ff0000` (przez Playwright `fill`) + „Clear".
- **Visual / Layout style:** Ratio → 16:9; Gap → Spacious; Radius → None.
- **Visual / Density and motion:** Layout density → Dense; Motion preset → Fade in. Dodatkowo zmiana wariantu na Feature Left przy density Dense.
- **Advanced:** odczyt wszystkich 4 sekcji read-only i porównanie z moimi edycjami z Visual.
- **Frontend (public):** status HTTP, render zapisanego stanu, atrybuty linków/figur, semantyka/ARIA, dostępność hover-caption (tabindex), konsola, responsywność 375 px, izolacja niezapisanych edycji.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Karty wariantu** — przełączanie działa dla wszystkich trzech opcji i **synchronicznie** aktualizuje główny canvas oraz panel „Live preview":
  - Uniform Grid → `data-gallery-mosaic-variant=uniform-grid`, pierwszy kafelek **traci** klasę `lg:col-span-2 lg:row-span-2`.
  - Feature Left → `variant=feature-left`, kontener density `grid grid-cols-1 lg:grid-cols-3 gap-4`.
  - powrót Mosaic → `variant=mosaic`, lead-tile odzyskuje span.
- **„Initial media count"** (1–16) — zmiana na 8 powiększa **oba** rendery do 8 kafelków; nowe karty dostają fallback captions zgodnie z rendererem: „Behind the scenes" (poz. 6), „Media 7", „Media 8". Powrót do 5 działa.
- **Read-only „Section title"** i **„Configured media"** wiernie odzwierciedlają stan („Gallery highlights", „5 of 5 items currently have media").
- **„Finish setup and open Visual"** wraca do zakładki Visual i przywraca komunikat „Setup complete". ✓
- **Live preview** używa współdzielonego renderera i pozostaje w pełnej zgodzie z głównym canvas (oba rendery aktualizują się jednocześnie).

### 4.2 Visual

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Karty wariantu | → Feature Left (przy density Dense) | `variant=feature-left`; kontener `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` (z `featureLeftLayoutDensityMap.dense`). ✓ (patrz N6 — kosmetyczna duplikacja klas) |
| Items count | → 6 (zwiększenie) | `count=6`, realnie 6 kafelków, **bez dialogu** (zwiększanie nie pyta). ✓ |
| Items count | → 5 (redukcja) | pojawia się `confirm`: „Reducing the item count will remove the last 1 gallery item. Continue?"; **dismiss zachowuje** (count=6), **accept redukuje** (count=5). ✓ |
| Header Title | → „Galeria realizacji" | `header > h3` aktualizuje się natychmiast. ✓ |
| Header Description | → „Wybrane projekty…" | `header > p` aktualizuje się natychmiast. ✓ |
| Caption (Item 1) | → „Nowy podpis testowy" | `figcaption` kafelka aktualizuje się. ✓ |
| Alt text (Item 1) | → „Alternatywny opis obrazka" | `img[alt]` aktualizuje się; alt **nadpisuje** caption jako accessible name (i `aria-label` linku). ✓ |
| Focus point (Item 1) | → Top | `img` dostaje inline `object-position: center top`. ✓ |
| Item ratio (Item 1) | → 1:1 | kafelek 1 → `aspect-square`, kafelek 2 (inherit) zachowuje `aspect-[4/3]` sekcji. ✓ (override per-kafelek) |
| Destination page (Item 1) | → „HomePage" | kafelek owinięty w `<a href="/homepage">`, `data-gallery-item-interaction=link`, `aria-label` z alt-tekstu. ✓ |
| Move down (Item 1) | reorder | kolejność zmienia się natychmiast; override 1:1 **podąża za kafelkiem** (po reorderze ląduje na pozycji 2 jako `aspect-square`). ✓ |
| Add item | dodanie | `count` 5→6, nowy kafelek „Media 6", `data-gallery-media-type=placeholder`. ✓ |
| Remove (Item 6) | usunięcie | `confirm`: „Remove item 6? This action cannot be undone."; dismiss zachowuje, accept usuwa (count=5). ✓ |
| Interaction mode | → Lightbox | `data-gallery-mosaic-interaction=lightbox`, `data-gallery-lightbox-root=1`, `data-gallery-lightbox-count=4`; 4× `[data-gallery-lightbox-trigger]` + 4× `[role=dialog]` + wstrzyknięty `<script>`. Kafelek z `href` **zachowuje** `interaction=link` (wyjątek). Select „Lightbox zoom" **przestaje być disabled**; pojawia się ostrzeżenie o linkowanym kafelku. ✓ |
| Caption position | Inside → Below | `figcaption` zmienia klasę na `mt-2 text-xs …` (pod kafelkiem), znika atrybut `data-gallery-caption-inside`. ✓ |
| Caption position | → Hover | `figcaption` dostaje `opacity-0 … group-hover:opacity-100 group-focus-within:opacity-100`. ✓ |
| Overlay color | → `#ff0000` (Playwright `fill`) | `figcaption` dostaje inline `background: rgb(255, 0, 0)`; badge → „Selected color". ✓ |
| Overlay „Clear" | wyczyszczenie | usuwa inline `background`; badge → „Theme default"; przycisk „Clear" staje się `disabled`. ✓ |
| Ratio (sekcja) | → 16:9 | `data-gallery-mosaic-ratio=16:9`; kafelki **inherit** → `aspect-video`; kafelek z override 1:1 zostaje `aspect-square`. ✓ |
| Gap | → Spacious | `gap=lg`; siatka dostaje `gap-6`. ✓ |
| Radius | → None | kafelek traci wszelkie klasy `rounded-*`. ✓ |
| Layout density | → Dense | `density=dense`; siatka (mosaic) → `sm:grid-cols-3 lg:grid-cols-5`. ✓ |
| Motion preset | → Fade in | `motion=fade`, kafelek → `motion-safe:animate-in motion-safe:fade-in-0 … motion-reduce:transform-none motion-reduce:transition-none` (respektuje reduced-motion). ✓ |

**Spójność „Clear" overlay:** przycisk „Clear" jest poprawnie `disabled` gdy overlay pusty i aktywny gdy ustawiony; po wyczyszczeniu badge wraca do „Theme default". Działa prawidłowo.

**Domyślny overlay nie jest mylący:** domyślna wartość `rgba(15, 23, 42, 0.35)` jest poprawnym wzorcem rgb/rgba, więc badge pokazuje „Selected color" (a **nie** mylące „Saved custom color" znane z niektórych innych widgetów). To plus.

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only i **wiernie** odzwierciedlił mój bieżący (niezapisany) stan roboczy z sesji Visual:

- **Runtime summary:** „Variant: feature-left", „Media items: 5 items", „Configured media: 5 items with media", „Linked items: 1 destination", „Interaction: Lightbox on unlinked items; 1 linked item keep navigation". ✓
- **Style summary:** „Layout style: 16:9 · lg · none" (ratio/gap/radius), „Caption position: hover", „Overlay: Overlay configured", „Density: dense", „Motion: fade". ✓
- **Accessibility diagnostics:** „Section heading: Galeria realizacji" (mój edytowany tytuł), „Helper copy: Helper description is configured.", „Alt text coverage: 1/5 media items have custom alt text" (ustawiłem alt na 1 kafelku), „Poster coverage: No video items configured". ✓
- **Contract summary:** jasny podział własności — Wizard („One-time layout seed and starter item count."), Visual („Header copy, media items, links, interaction, overlay, layout style, density, and motion."), Advanced („Read-only runtime diagnostics…"). ✓

> Advanced to **żywe lustro stanu roboczego w pamięci**, nie stanu zapisanego — odzwierciedlił wszystkie moje niezapisane edycje z Visual (łącznie z wariantem feature-left, ratio 16:9, density dense, motion fade, hover caption, overlay, linkiem i alt-tekstem).

### 4.4 Frontend (public)

Trasa `/gallery-mosaic-test-0516` zwraca **HTTP 200** i renderuje **zapisaną (opublikowaną) konfigurację fixture** — kuratorowany stan demonstracyjny, **inny** niż domyślny widget i inny niż mój niezapisany draft (patrz N5):

- `variant=mosaic`, `ratio=4:3`, `gap=md`, `count=5`, `caption-position=hover`, `interaction=none`, `density=auto`, `motion=none`, `lightbox-root=null`.
- Header: **„Mosaic — hover caption"** / „Hover na kafelku pokazuje caption".
- 5 kafelków typu `image`, captions „Caption item 1…5". **Item 1 ma `interaction=link`** (zewnętrzny href).
- **Semantyka:** `<section>` → `<header>` → `<h3>` + 5× `<figure>` z `<figcaption>`. ✓
- **Link Item 1:** `href="https://example.com/item1"`, **`rel="noopener noreferrer"`** mimo `target=null` — dobre zabezpieczenie zewnętrznego linku (`resolveWidgetLinkAttrs`); `aria-label="Caption item 1"`. ✓
- **Hover-caption a11y:** statyczne kafelki (interaction `none`) w trybie `hover` dostają **`tabindex="0"` + `aria-label`** (np. Item 2: tabindex=0, aria „Caption item 2"), a `figcaption` ma klasy `group-hover`/`group-focus-within` — czyli caption jest dostępny także z klawiatury (focus). ✓
- **Obrazy:** `alt` = caption (fallback gdy brak własnego alt), `loading="lazy"`. ✓
- **Konsola:** **0 błędów i 0 ostrzeżeń.** ✓
- **Responsywność (375 px):** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka schodzi do **jednej kolumny** (`grid-cols-1`, kafelek 343 px). ✓
- **Izolacja:** moje niezapisane edycje z Visual/Wizard **nie wyciekły** na front. ✓

### 4.5 Admin canvas (podgląd)

Główny canvas renderuje żywy `GalleryMosaicBlock` z tymi samymi atrybutami `data-gallery-mosaic-*` i `data-gallery-item-*`, co front. Podgląd aktualizuje się na żywo po każdej edycji Visual/Wizard. Przy wejściu na stronę canvas renderował **domyślną konfigurację widgetu** (mosaic, 5 kart, „Gallery highlights", domyślne media Unsplash) — patrz N5.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Lightbox NIE jest interaktywny w podglądzie admina** | Renderer / runtime | Po włączeniu `interaction=lightbox` renderer poprawnie generuje całą strukturę lightboxa (triggery `[data-gallery-lightbox-trigger]`, dialogi `[role=dialog][data-gallery-lightbox-dialog]`, backdrop, przyciski Close) **oraz** wstrzykuje skrypt runtime przez `<script dangerouslySetInnerHTML>`. **Ale** w canvas admina skrypt **nie wykonuje się** (`root.dataset.galleryLightboxBound === undefined`, brak `data-gallery-lightbox-open`). To znana cecha React: tagi `<script>` wstrzykiwane przez `dangerouslySetInnerHTML` **nie są wykonywane** przy montażu. Skutek: w podglądzie admina kliknięcie kafelka-lightboxa **nie otwiera dialogu** (dialogi pozostają `hidden`). Markup i ARIA są poprawne, brakuje tylko związania zdarzeń. Realne otwieranie/zamykanie należy weryfikować na froncie SSR (patrz sekcja 7 — nie udało się tego przetestować na żywym runtime, bo opublikowany fixture ma `interaction=none`). |
| **N2 — Gramatyka liczby pojedynczej w komunikatach o linkach** | Visual ostrzeżenie + Advanced summary | Dla 1 linkowanego kafelka komunikat brzmi „**1 linked item still use navigation**" (Visual) oraz „…1 linked item **keep** navigation" (Advanced). Rzeczownik jest poprawnie odmieniany (`item`/`items`), ale czasownik jest zahardkodowany w liczbie mnogiej — powinno być „uses"/„keeps". Drobna usterka copy (kosmetyczna). |
| **N3 — Picker overlay ukrywa kanał alfa** | Visual / overlay | Kontrolka „Overlay color" to natywny `<input type="color">`, który operuje **tylko na hex** — zapisana przezroczystość (domyślnie `0.35`) **nie jest widoczna** w UI (brak pola tekstowego z surową wartością `rgba`). Informację o tym niesie wyłącznie tekst pomocniczy („…keep the saved overlay opacity when one exists. The default overlay strength is 35%."). Zmiana swatcha gdy alfa nie istnieje (np. po „Clear") daje kolor w pełni nieprzezroczysty (`rgb(...)`). Logika jest poprawna, ale dla autora nieprzejrzysta. |
| **N4 — `<section>` bez `aria-label`/`aria-labelledby`** | Renderer / a11y | Główny kontener `<section data-gallery-mosaic-variant>` nie ma dostępnej nazwy (`aria-label=null`). Brak semantycznego opisu sekcji dla czytników (analogiczne do feature-grid N6 / contact R1). Pozostała semantyka jest dobra (`<header>`, `<h3>`, `<figure>/<figcaption>`, ikona-less, hover-caption z tabindex/aria). |
| **N5 — Rozjazd: draft w adminie (defaulty) vs opublikowany front (kuratorowana konfiguracja)** | Dane / publish | Przy wejściu główny canvas draftu renderował **domyślny widget** (mosaic, 5 kart, „Gallery highlights", media Unsplash), a publiczna trasa serwuje **inną, zapisaną konfigurację** (mosaic, hover caption, „Mosaic — hover caption", Item 1 = link zewnętrzny). Nie ustaliłem przyczyny i **nie zapisywałem/publikowałem**, by tego rozstrzygnąć. Pozytyw: niezapisane edycje nie wyciekają na front (poprawna izolacja). Analogiczne do feature-grid N5. |
| **N6 — Kosmetyczna duplikacja klas siatki (feature-left)** | Renderer | Dla `feature-left` kontener dostaje zduplikowane `grid grid-cols-1` (np. `"grid grid-cols-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"`), bo `joinClasses` skleja bazowe `"grid grid-cols-1"` z klasą kontenera density, która też zaczyna się od `"grid grid-cols-1"`. Bez wpływu na render (Tailwind ignoruje duplikaty), ale brzydkie w DOM. |
| **N7 — Draft „Hidden on all devices" vs publiczny render** | Wrapper / device visibility | Współdzielone podsumowanie wrappera w Advanced pokazało **„Shown on: Hidden on all devices"** dla draftu, mimo to **opublikowany widget renderuje się publicznie** (HTTP 200, sekcja widoczna). To rozjazd na poziomie **wrappera bloku** (shared infrastructure, nie gallery-mosaic), prawdopodobnie różnica stan-draft vs stan-opublikowany. Warte odnotowania, ale nie blokuje renderu galerii. |
| **N8 — Wizard ukryty za „Run setup again"** | UX nawigacji | Tryb Wizard nie jest równorzędną zakładką — dla osoby szukającej „kreatora" nie jest to oczywiste (spójne z feature-grid/tabs/accordion, ale warte odnotowania). |

**Nie wykryto** żadnych błędów konsoli na froncie, żadnego twardego buga renderowania, ani rozjazdu render między wspólnie testowanymi opcjami admin↔front (poza celową izolacją niezapisanych zmian). Wszystkie przetestowane kontrolki Visual aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan roboczy; frontend jest responsywny, bez błędów konsoli i poprawny semantycznie (poza N4). **Jedyny realny brak funkcjonalny** to N1 (lightbox nieaktywny w podglądzie admina przez ograniczenie React `dangerouslySetInnerHTML`).

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/gallery-mosaic-test-0516`) | Zgodność |
|--------|----------------------|-----------------------------------------|----------|
| Renderer | żywy `GalleryMosaicBlock`, atrybuty `data-gallery-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo po edycji | tak (canvas + Wizard Live preview) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu: **defaulty**; potem: moje niezapisane edycje | **opublikowana** kuratorowana konfiguracja | ⚠ rozjazd (N5) |
| Link kafelka (safe href, rel) | te same reguły | `rel="noopener noreferrer"` dla zewnętrznego linku | ✓ |
| Semantyka (`section`/`header`/`h3`/`figure`/`figcaption`) | obecna | obecna | ✓ |
| `aria-label` na `<section>` | brak | brak | ⚠ oba (N4) |
| Hover-caption a11y (tabindex/aria na statycznych kafelkach) | obecne (gdy interaction none) | obecne (Item 2: tabindex=0) | ✓ |
| **Lightbox — interaktywność** | **markup TAK, JS NIE** (skrypt nie wiąże się) | nie do sprawdzenia (fixture `interaction=none`) | ⚠ N1 |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |
| Responsywność 375 px | n/d (testowane na froncie) | single-column, brak overflow | ✓ |

**Wniosek:** renderer jest wspólny i spójny. Istotne rozjazdy to N5 (draft=defaulty vs opublikowany front) oraz N1 (lightbox bez wiązania JS w podglądzie admina). Pozostałe różnice są celowe (izolacja) lub wynikają z braku semantycznej etykiety sekcji (N4) — dotyczą obu środowisk.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie modyfikować współdzielonego fixture. W związku z tym:
  - trwałość moich edycji po przeładowaniu **nie** została zweryfikowana (potwierdziłem trwałość tylko w obrębie sesji edytora — Advanced wiernie podsumował edycje z Visual);
  - nie rozstrzygnąłem rozjazdu N5 (czy zapis draftu nadpisałby stan opublikowany) ani N7 (device visibility).
  - Przy próbie opuszczenia admina pojawił się natywny dialog „unsaved changes" (beforeunload) — admin **ostrzega** przed utratą niezapisanych zmian (pozytyw); zaakceptowałem go, by przejść na front.
- **Realne otwieranie/zamykanie lightboxa (open/Escape/backdrop/focus-return):** **nie zostało wykonane na żywym runtime.** W podglądzie admina skrypt runtime się nie wiąże (N1), a opublikowany fixture ma `interaction=none` (brak lightboxa). Zweryfikowałem jedynie: poprawny markup dialogów, atrybuty ARIA (`role=dialog`, `aria-modal`, `aria-controls`, `aria-labelledby`, `aria-describedby`), liczbę triggerów/dialogów oraz obecność wstrzykniętego `<script>`. Logika skryptu (open/close/Escape/focus-trap) jest obecna w kodzie, ale **nie wykonana** w tej sesji.
- **MediaPicker „Browse media" (modal Biblioteki Mediów):** **nie otwierałem** modala ani nie wybierałem realnego assetu. W konsekwencji **nie** przetestowano realnie: podmiany obrazu, ścieżki obraz↔wideo (priorytet wideo), kontrolek **Poster image** (widoczne tylko dla kafelków wideo — brak kafelków wideo w fixture), przycisku „Clear media and poster" z realnym medium ani obsługi błędów MediaPickera (`itemMediaPickerErrors`).
- **Overlay — kanał alfa:** zmianę koloru potwierdziłem przez Playwright `fill` (działa). **Nie** testowałem ścieżki zachowania zapisanej przezroczystości (`applyColorWithExistingAlpha` przy istniejącym `rgba` + zmianie swatcha). Próba sterowania `<input type=color>` przez syntetyczne zdarzenia DOM zawiodła (artefakt narzędzia/React controlled input), dopiero natywny `fill` zadziałał — to **nie** jest bug widgetu.
- **Drag-and-drop reorder + klawiaturowy Alt+Strzałki:** reorder testowałem przyciskiem „Move down". **Nie** wykonałem natywnego drag&drop uchwytem `[data-gallery-drag-handle]` ani skrótu Alt+ArrowUp/Down.
- **Pojedyncze pozostałe wartości enumów:** przetestowałem reprezentatywne wartości; **nie** klikałem każdej osobno dla: gap `none`/`sm`, radius `md`/`lg`/`xl`, density `compact`/`balanced`, motion `slide-up`, focus point `bottom`/`left`/`right`, item ratio `4:3`/`16:9`/`3:4`, zoom `fill`, uniform-grid w różnych density. Wszystkie używają tego samego mechanizmu `updateStyle`/`updateItem`/`updateInteraction`, zweryfikowanego na wielu innych polach.
- **Import/Export konfiguracji:** kod eksponuje `exportGalleryMosaicConfig`/`importGalleryMosaicConfig`, ale **nie znalazłem** kontrolki UI dla tych funkcji w żadnym z trybów edytora — nie były więc dostępne do przetestowania w UI.
- **Ostrzeżenie feature-left dla 1 kafelka** (`items.length===1`): obecne w kodzie („Feature Left works best with one lead tile plus at least one supporting item."), ale **nie** wyzwolone (wymagałoby redukcji do 1 kafelka przez kolejne dialogi confirm).
- **Realna nawigacja po kliknięciu linku na froncie:** nie klikałem zewnętrznego linku (`example.com`), by nie opuszczać strony — sprawdziłem tylko atrybuty `href`/`rel`/`target`/`aria-label`.
- **`prefers-reduced-motion`:** klasy `motion-reduce:*` przy „Fade in" są obecne, ale nie testowałem zachowania pod włączoną redukcją ruchu.

---

## 8. Podsumowanie

- Widget **gallery-mosaic jest w bardzo dobrym stanie funkcjonalnym po stronie edytora i renderera SSR.** Wszystkie przetestowane kontrolki Visual (wariant, liczba kart z potwierdzeniem redukcji, copy nagłówka, per-kafelek caption/alt/focus point/item ratio/destination, reorder, add/remove, tryb interakcji + lightbox markup, caption position, overlay + Clear, ratio/gap/radius, density, motion) **działają i aktualizują podgląd na żywo**. Tryb Wizard synchronizuje wariant i liczbę kart w canvas i w „Live preview". Advanced wiernie i poprawnie (read-only) podsumowuje stan roboczy. Frontend zwraca 200, jest responsywny (375 px bez overflow), bez błędów konsoli, poprawny semantycznie i z bezpiecznymi linkami.
- **Najważniejszy realny brak (N1):** lightbox jest w pełni wyrenderowany (markup + ARIA + skrypt), ale w **podglądzie admina skrypt runtime się nie wiąże** (ograniczenie React `dangerouslySetInnerHTML`), więc kliknięcie nie otwiera dialogu w adminie. Realnego open/close na żywym froncie **nie udało się przetestować**, bo opublikowany fixture ma `interaction=none`.
- **Niespójności / kosmetyka UX:** gramatyka „1 linked item use/keep" (N2), ukryty kanał alfa overlay w pickerze (N3), brak `aria-label` na `<section>` (N4), duplikacja klas siatki feature-left (N6).
- **Do wyjaśnienia (bez zapisu):** rozjazd draft-defaulty vs opublikowany front (N5) oraz „Hidden on all devices" w draftcie mimo publicznego renderu (N7).
- **Plusy:** poprawny i działający przycisk „Clear" overlay (z disabled-state), badge „Selected color" zamiast mylącego „Saved custom color" dla domyślnej rgba, bezpieczne linki (`rel=noopener noreferrer` dla zewnętrznych), per-kafelek override ratio podążający za kafelkiem przez reorder, **potwierdzenie przy redukcji liczby kart** (lepsze niż „cicha" truncacja w feature-grid), dostępny hover-caption (tabindex/aria na statycznych kafelkach), `loading=lazy` na obrazach, reduced-motion-safe animacje, oraz ostrzeżenie beforeunload o niezapisanych zmianach.

---

## 9. Screenshoty (lokalne etykiety)

> Poniższe nazwy to **wyłącznie lokalne etykiety** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie są wymaganym evidence i nie są dołączone do
> repo. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM, nie o zrzuty.

| Plik (lokalny) | Opis |
|----------------|------|
| `gallery-mosaic-frontend-published.png` | Publiczna trasa `/gallery-mosaic-test-0516` (1280 px) — opublikowany stan fixture („Mosaic — hover caption", mosaic, 5 kafelków, Item 1 = link zewnętrzny) |
