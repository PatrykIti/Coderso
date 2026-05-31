# RAPORT: Logo Cloud Widget — wyczerpujący re-audyt „gap-close" (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (pełny re-audyt od zera; zamyka luki poprzedniego przebiegu: limit 24, pozostałe selecty, krawędzie Add/Remove/reorder, gałęzie link/destination, clear/use kolorów)
> **Sesja Playwright:** `claude-29-05-logo-cloud-gap-close-v2` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/5958b461-fd78-4b65-b154-64692c0fa474` (strona „Contract Test - logo-cloud")
> **Fixture public:** http://localhost:3000/test-logo-cloud-0516
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/logoCloud.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` + `ClearableFields.tsx` (kolory) · `core/admin/ui/widgets/editors/LinkDestinationField.tsx` (picker stron) · `core/site/styles/site.css` (animacja marquee)

> **Status TASK-343-24 (2026-05-30):** N2/N3/N4 są zamknięte. Redukcja
> `Logo count` potwierdza destrukcyjną truncację przed zapisem, Visual i
> Advanced rozdzielają efektywne zachowanie Grid/Dense od zapisanych ustawień
> Strip row/motion, a wyłączenie grayscale czyści i odznacza nieaktywny
> `Colorize on hover`.

> **Metodologia.** Przebieg jest **wyczerpujący, nie reprezentatywny**. Dla każdej
> rodziny kontrolek **kliknąłem osobno KAŻDĄ dyskretną opcję** (wszystkie pozycje
> 10 selectów, obie wartości 3 toggle, 3 karty wariantów, oba targety CTA, granice
> „Logo count" **1** i **24**), a efekt każdej zmiany weryfikowałem **inspekcją DOM
> na żywym canvasie**: atrybuty `data-logo-cloud-*`, klasy Tailwind listy/kafelka/
> nagłówka, inline `style`, `href`/`rel`/`target`/`aria-label`, stan `disabled`
> kontrolek, teksty badge i podsumowań. Tam, gdzie czegoś NIE dało się zweryfikować
> przez UI, jest to jawnie nazwane w sekcji **„Nietestowalne"** wraz z powodem.

> **Najważniejsza zmiana względem poprzedniego raportu.** Natywne **drag&drop
> logotypów DZIAŁA** i zostało zweryfikowane (sekcja 4.7). Poprzedni raport oznaczał
> je jako „nietestowalne / możliwy bug" — to było **błędne**: problemem było jedynie
> tempo zdarzeń w automatyzacji, nie logika produktu.

> **Screenshoty.** W tym przebiegu **nie wykonano żadnych zrzutów** — cała
> weryfikacja opiera się o inspekcję DOM/CSS na żywym drzewie. Niczego nie
> zapisywano ani nie publikowano (patrz „Nietestowalne").

---

## 1. Przegląd widgetu

**Typ:** `logo-cloud` · **Kategoria:** `content` · **Opis:** „Partner and customer logo section for trust building."

**Warianty (3) — klasy listy zweryfikowane w DOM:**

| Wariant | Klasa listy | Charakterystyka |
|---------|-------------|-----------------|
| `grid` (domyślny) | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` | Siatka 2/3/4 kolumny responsywnie |
| `strip` | `flex flex-wrap items-center` (wrap) **/** `flex w-full flex-nowrap items-center overflow-x-auto pb-2` (single-row) **/** `.logo-cloud-marquee` + `.logo-cloud-marquee-track` (marquee) | Pasek z trybami wiersza i ruchu |
| `dense` | `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6` | Gęsta matryca do 6 kolumn |

**Model danych (`LogoCloudData`):** header (`eyebrow`/`title`/`description`), cta (`enabled`/`label`/`href`/`target`), logos[] (`id`/`name`/`alt`/`image`/`href`), style (`logoHeight`, `grayscale`, `hoverColor`, `gap`, `alignment`, `sectionBackground`, `tileBackground`, `tileBorderColor`, `headerAlign`, `headerSize`, `rowMode`, `motionMode`, `tileRadius`, `tileBorderWidth`, `openLinksInNewTab`).

**Ograniczenia:** min 1 / max 24 logotypy (`logoCloudLogoMin=1`, `logoCloudLogoMax=24`). Liczba kafelków = **długość tablicy `logos`** (select „Logo count" deterministycznie ją ustawia — patrz 4.2).

**Render:** `<section class="mx-auto w-full max-w-6xl px-4 py-8">` z opcjonalnym `<header>` (eyebrow `<p>`, tytuł `<h2>`, opis `<p>`) i kontenerem listy. Kafelek: `image` → `<img loading="lazy">` (z `grayscale`/`group-hover:grayscale-0`), inaczej tekst `name` w `<span>`. `href` → kafelek jest `<a>` (bezpieczny href przez `resolveWidgetLinkAttrs`), inaczej `<div>`. Marquee duplikuje listę (`[...logos, ...logos]`). CTA renderowane pod listą **tylko** gdy `enabled && label && bezpieczny href`.

**Dostępność (pozytyw):** `<section aria-labelledby>` wskazuje na `<h2>`, gdy tytuł istnieje (`ariaMatch=true` zweryfikowane); fallback `aria-label="Partner logos"` przy braku tytułu.

---

## 2. Architektura trybów edytora (niuans UX)

Panel ma **dwie zakładki-taby: `Visual` i `Advanced`** (`role=tab`). **Wizard nie jest równorzędnym tabem** — wchodzi się do niego przyciskiem **„Run setup again"**. Wizard kończy się **„Finish setup and open Visual"** (po nim komunikat *„Setup complete…"*). To ten sam wzorzec, co w `feature-grid`/`tabs`/`accordion`.

| Tryb | Jak otworzyć | Zawartość | Kontrolki `writable` widoczne |
|------|--------------|-----------|-------------------------------|
| **Wizard** | „Run setup again" | „Starter overview" (read-only) + własny panel **„Live preview"** | **0** (zweryfikowane programowo) |
| **Visual** | tab „Visual" | 5 sekcji widgetu + „Block layout" / „Device visibility" | wszystkie (sekcja 3) |
| **Advanced** | tab „Advanced" | 4 read-only sekcje podsumowań | **0** (zweryfikowane programowo) |

Liczbę widocznych kontrolek `writable` zmierzono `querySelectorAll('[data-widget-control-ownership="writable"]')` filtrowane po widoczności → **0 w Wizard i 0 w Advanced**, **65 w Visual**.

---

## 3. Pełna mapa kontrolek Visual (co przeklikano)

| Sekcja Visual | Kontrolka | Typ | Opcje przeklikane |
|---------------|-----------|-----|-------------------|
| Variant and layout structure | Wariant | karty | **Grid, Strip, Dense** (3/3) |
| Variant and layout structure | Logo count | select 1–24 | **1, 6, 7, 24** (granice + środek) |
| Header copy | Eyebrow / Title | input | n/d w tym przebiegu (mechanizm wspólny, patrz 7) |
| Logos list and links | Name / Accessible description | input | wpisany tekst |
| Logos list and links | Media library | MediaPicker + „Clear image" | wybór assetu + Clear |
| Logos list and links | Logo destination | picker stron + „Clear destination" | „No destination" → „HomePage" → Clear |
| Logos list and links | Drag / Move up / Move down / Remove / Add logo / Undo / Dismiss | przyciski | **wszystkie** (Drag — patrz 4.7) |
| Section CTA | Enable CTA | switch | on/off |
| Section CTA | CTA label | input | wpisany tekst |
| Section CTA | CTA destination | picker stron | „HomePage" |
| Section CTA | CTA target | select | **Same tab, New tab** (2/2) |
| Display style | Logo height | select | **None, Small, Medium, Large, Extra large** (5/5) |
| Display style | Gap | select | **None, Compact, Default, Spacious** (4/4) |
| Display style | Alignment | select | **Start, Center, End** (3/3) |
| Display style | Header alignment | select | **Start, Center, End** (3/3) |
| Display style | Header size | select | **Small, Medium, Large** (3/3) |
| Display style | Strip row behavior | select (strip-only) | **Wrapped rows, Single row scroll** (2/2) |
| Display style | Strip motion | select (strip-only) | **Static, Marquee** (2/2) |
| Display style | Tile radius | select | **None, Small, Medium, Large, Extra large, Full** (6/6) |
| Display style | Tile border width | select | **None, Standard, Heavy** (3/3) |
| Display style | Open logo links in new tab | switch | on/off |
| Display style | Grayscale logos | switch | on/off |
| Display style | Colorize on hover | switch (zależny od grayscale) | on/off |
| Display style | Section background / Tile background / Tile border | 3× SharedColorControl | pick + Clear (każdy) |

---

## 4. TESTOWANE + CO DZIAŁA — szczegóły z weryfikacją DOM

### 4.1 Warianty i kontrolki strip-only

| Akcja | Efekt w DOM (zweryfikowany) |
|-------|------------------------------|
| Wariant **Grid** | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`; selecty Strip `disabled=true`. ✓ |
| Wariant **Strip** | `flex flex-wrap items-center …`; selecty „Strip row behavior" i „Strip motion" **odblokowane** (`disabled=false`). ✓ |
| Wariant **Dense** | `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6`. ✓ |
| Strip row → **Single row scroll** | `flex w-full flex-nowrap items-center overflow-x-auto pb-2 …`, `data-row-mode=single-row`, kafelek dostaje `shrink-0`. ✓ |
| Strip row → **Wrapped rows** | `flex flex-wrap items-center …`, `data-row-mode=wrap`. ✓ |
| Strip motion → **Marquee** | `data-motion=marquee`; render **single-row**; `.logo-cloud-marquee-track` z **12 kafelkami** (6×2 duplikacja); `getComputedStyle(track).animationName="logo-cloud-marquee"`, `animationDuration=24s`; select „Strip row behavior" staje się `disabled`. ✓ |
| Strip motion → **Static** | track znika, select row znów aktywny. ✓ |
| Wyjście ze Strip do Grid | selecty Strip **znów `disabled`**. ✓ |

**Marquee — zachowanie ruchu (zweryfikowane na żywo):**
- `prefers-reduced-motion: reduce` → `animationName` zmienia się na **`none`** (animacja wyłączona). ✓
- Hover na `.logo-cloud-marquee` → `animationPlayState` przechodzi **`running` → `paused`**. ✓

### 4.2 Logo count (granice włącznie)

| Wartość | Wyrenderowanych kafelków | „Add logo" | „Remove" |
|---------|--------------------------|------------|----------|
| 7 (po „Add logo") | 7 | aktywny | aktywny |
| **24 (max)** | 24 | **`disabled`** ✓ | aktywny |
| **1 (min)** | 1 | aktywny | **`disabled`** ✓ |
| 6 | 6 | aktywny | aktywny |

Limit min/max egzekwowany blokadą przycisków. „Add logo" dopisuje „Logo N" na końcu. ✓

### 4.3 Selecty „Display style" (każda opcja osobno, atrybut + klasa)

- **Logo height** (5/5): None→`none` (`h-auto max-h-16`), Small→`sm` (`h-8`), Medium→`md` (`h-10`), Large→`lg` (`h-12`), Extra large→`xl` (`h-14`). ✓
- **Gap** (4/4): None→`gap-0`, Compact→`gap-2`, Default→`gap-4`, Spacious→`gap-6`. ✓
- **Alignment** (3/3, na siatce): Start→`justify-items-start`, End→`justify-items-end`, Center→brak klasy. ✓
- **Header alignment** (3/3): Start→`items-start text-left`, Center→`items-center text-center`, End→`items-end text-right`. ✓
- **Header size** (3/3): Small→`text-xl`, Medium→`text-2xl`, Large→`text-3xl`. ✓
- **Tile radius** (6/6): None→`rounded-none`, Small→`rounded-sm`, Medium→`rounded-md`, Large→`rounded-lg`, Extra large→`rounded-xl`, Full→`rounded-full`. ✓
- **Tile border width** (3/3): None→`border-0`, Standard→`border`, Heavy→`border-2`. ✓

### 4.4 Przełączniki (switche)

| Switch | Test | Efekt (DOM) |
|--------|------|-------------|
| Open logo links in new tab | on→off | `data-open-in-new-tab` przełącza się. ✓ |
| Grayscale logos | on→off→on | `data-grayscale` przełącza się; **przy off** efektywny `data-hover-color=false` i switch „Colorize on hover" → `disabled` (jego `aria-checked` zostaje `true` — patrz N4). ✓ |
| Colorize on hover | on→off→on (przy grayscale on) | `aria-checked` i efektywny `data-hover-color` przełączają się. ✓ |

### 4.5 Lista logo (repeatable items)

- **Name (logo 1) → „Moja Firma":** tekst kafelka aktualizuje się natychmiast. ✓
- **Accessible description (alt) → „Logo Mojej Firmy":** staje się `aria-label` podlinkowanego kafelka oraz `alt` obrazu. ✓
- **Logo destination (picker stron):** opcje = „No destination" + lista **opublikowanych** stron (m.in. „HomePage"); to **picker**, nie wolne pole. „No destination" → „HomePage" → kafelek `<a href="/homepage">`. ✓
- **Open-in-new-tab + link:** on → `target="_blank" rel="noopener noreferrer"`; off → `target=null rel=null`. ✓
- **Clear destination:** wraca do „No destination", kafelek z powrotem `<div>` (bez `href`). ✓
- **Move down / Move up:** kolejność zmienia się natychmiast i wraca (Moja Firma idx0→idx1→idx0). ✓
- **Remove (miękkie):** notka `role="status"` „North Labs removed. Undo is available." z „Undo"/„Dismiss"; `count` spada. ✓
- **Undo:** przywraca logo na **pierwotną pozycję** (index 1). ✓
- **Dismiss:** notka znika, usunięcie **pozostaje** (count nie wraca) — trwałe. ✓
- **Add logo:** dopisuje „Logo N" na końcu (`count` +1). ✓
- **Media Library → `cos1.png`:** kafelek → `<img src="http://localhost:3000/media/2026/02/….png">`, `loading="lazy"`, klasa `… h-14 grayscale … group-hover:grayscale-0`, `data-has-image=true`. **Ręcznie wpisany `alt` („Logo Mojej Firmy") zachowany**, NIE nadpisany altem assetu (zgodnie z `alt: latestLogo.alt?.trim() ? latestLogo.alt : next.alt`). ✓
- **Clear image:** kafelek wraca do tekstu „Moja Firma", `data-has-image=false`. ✓

### 4.6 Section CTA (kompletność reguły render)

| Krok | CTA w DOM |
|------|-----------|
| CTA off | **nie renderuje się**; select „CTA destination" `disabled`. ✓ |
| Enable CTA (label domyślny „Get started", brak href) | **nie renderuje się**; „CTA destination" przestaje być `disabled`. ✓ |
| + CTA label „Dołącz teraz" (wciąż brak href) | **nadal nie renderuje się**. ✓ |
| + CTA destination „HomePage" (Same tab) | `<a href="/homepage" data-logo-cloud-cta>Dołącz teraz</a>`, bez `target`/`rel`. ✓ |
| CTA target → **New tab** | `target="_blank" rel="noopener noreferrer"`. ✓ |
| CTA target → **Same tab** | `target=null rel=null`. ✓ |
| Disable CTA (przy poprawnym href) | CTA **znika** (gate działa w obie strony). ✓ |

Potwierdza regułę „Only complete and safe CTA links render in the public widget."

### 4.7 Drag & drop logotypów — **DZIAŁA** (pełna weryfikacja)

To kluczowa korekta poprzedniego raportu. Wynik bezpośredni:

- **Wysokopoziomowe `dragTo` (symulacja myszą) — NIE zmienia kolejności.** Powód: zdarzenia HTML5 lecą zbyt szybko (w jednym tasku), zanim React zdąży opróżnić `setDragState`, więc handler `dropLogoAtIndex` czyta jeszcze `dragState=null` i kończy wcześnie.
- **Ręczne zdarzenia HTML5 z odstępem (`dragstart` → 250 ms tick → `dragover`+`drop`) — REORDER DZIAŁA.** Po `dragstart` karta dostaje aktywny styl `border-primary` (`dragState` ustawione), a po `drop` kolejność zmienia się poprawnie: **„Moja Firma" idx0 → idx2** (`["Moja Firma","North Labs","Orbit",…]` → `["North Labs","Orbit","Moja Firma",…]`). ✓

**Wniosek:** logika reorderu drag&drop jest **poprawna**, nie jest bugiem. Realny użytkownik zawsze ma render-tick między chwyceniem a upuszczeniem (ruch myszy), więc dla niego działa. „Niewidoczny" efekt występuje **wyłącznie** przy zsynchronizowanej symulacji bez tika — to artefakt automatyzacji. Reorder potwierdzony też niezależnie przez „Move up"/„Move down".

### 4.8 Kontrolki kolorów (3× SharedColorControl)

Konfiguracja używa `showValueInput={false}` i **nie** ustawia `allowTransparent` → **brak** wolnego pola wartości i brak „Use transparent"; jest **swatch (`<input type=color>`)**, badge stanu i **„Clear"**.

| Kontrolka | Stan początkowy | Pick koloru | Clear |
|-----------|-----------------|-------------|-------|
| **Section background** | „Theme default" / Clear **`disabled`** / brak inline | `#123456` → inline `rgb(18,52,86)`, badge **„Selected color"**, Clear aktywny ✓ | „Theme default", inline usunięty, Clear `disabled` ✓ |
| **Tile background** | **„Saved custom color"** / Clear **aktywny** / inline `var(--color-bg)` (N1) | `#abcdef` → `rgb(171,205,239)`, **„Selected color"** ✓ | „Theme default", inline **całkowicie usunięty** ✓ |
| **Tile border** | **„Saved custom color"** / Clear **aktywny** / inline `color-mix(in srgb, var(--color-border) 60%, transparent)` (N1) | `#ff0000` → `rgb(255,0,0)`, **„Selected color"** ✓ | „Theme default", inline usunięty ✓ |

> „Clear" usuwa wartość ze stylu — po wyczyszczeniu znika **cały** inline `background-color`/`border-color` (także domyślny `var(...)`), a renderer schodzi do klas CSS. Realna zmiana renderu.

### 4.9 Wizard (read-only)

- „Starter overview": **„Current layout: Grid"**, **„Logo count: 6 logos"** + tekst kierujący do Visual. ✓
- **„Live preview"** renderuje widget przez wspólny renderer — w DOM **2** elementy `[data-logo-cloud-variant]` (canvas + live preview), preview ma **6 kafelków**. ✓
- **„Finish setup and open Visual"** wraca do Visual; w treści pojawia się **„Setup complete…"**. ✓
- **0** widocznych kontrolek `writable`. ✓

### 4.10 Advanced (read-only, żywe lustro stanu roboczego)

- **0** widocznych kontrolek `writable`. ✓
- Wiernie odzwierciedla **bieżący niezapisany** stan roboczy. Snapshot po edycjach: „Layout: Grid", „Logos: 6 logos", „Logo height: Extra large", „Spacing: Spacious", „Header: Configured", „Logo images: No logo images selected yet", „Logo destinations: Logo tiles are not linked", „Section CTA: Hidden", „Alignment: Center", „Header style: Center / Medium", **„Strip behavior: Wrapped rows / Marquee"** (przy wariancie **Grid** — N3), „Tile shape: Full corners, Heavy border", „Logo filter: Grayscale with color on hover", „Colors: Section: Theme default, tile: Theme default, border: Theme default" (po Clear). ✓
- Po ustawieniu hex w „Tile background": wiersz „Colors" pokazuje **„tile: Selected swatch"** — inny tekst niż badge w Visual („Selected color"). Patrz N8. ✓

### 4.11 Frontend (public) — `/test-logo-cloud-0516`

- **HTTP 200** (curl) ✓
- Render **opublikowanego** stanu: `variant=grid`, `count=6`, gap/height/align domyślne. To **inny** stan niż mój draft — niezapisane edycje **nie wyciekły** na front. ✓
- Tytuł `<h2>` „Trusted by teams worldwide". **Wszystkie 6 kafelków = `<a href="#">`** (`rel=null`, `target=null` — hash + `openLinksInNewTab=false`). ✓
- **Logo 1 ma realny obraz:** `<img src="https://upload.wikimedia.org/.../Amazon_logo.svg/1200px-Amazon_logo.svg.png">`, `alt="Acme"` (fallback z `name`), `loading="lazy"`, klasa `h-10 grayscale group-hover:grayscale-0 object-contain`. Logo 2–6 jako tekst. ✓
- **ARIA:** `aria-labelledby` `<section>` = `id` `<h2>` (`ariaMatch=true`), `aria-label=null`. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** `scrollWidth == clientWidth == 375` (brak poziomego overflow), siatka → **2 kolumny**. ✓

---

## 5. CO NIE DZIAŁA / TWARDE BUGI

**Brak.** W tym przebiegu **nie wykryto** żadnego twardego buga renderowania ani błędu konsoli na froncie (0/0). Wszystkie realnie klikalne kontrolki Visual aktualizują podgląd na żywo; Wizard i Advanced są poprawnie read-only; frontend jest responsywny, semantyczny i bez błędów. Drag&drop, wbrew poprzedniej hipotezie, **działa** (4.7).

---

## 6. NIETESTOWALNE / ŚWIADOMIE NIEWYKONANE (uczciwe ograniczenia)

- **Walidacja niebezpiecznych/niepoprawnych URL i obrazów (`getLogoCloudLinkFeedback` / `getLogoCloudImageFeedback`) — NIEOSIĄGALNA Z VISUAL.** „Logo destination" i „CTA destination" to **pickery opublikowanych stron** (zawsze bezpieczne), a obraz wybiera się z MediaPicker (zawsze bezpieczny). Gałęzie ostrzeżeń odpalają się **tylko dla wartości już zapisanych w JSON**, których nie da się wpisać z Visual. *Pośrednio* potwierdzone: opublikowany fixture ma `href="#"`, co w pickerze ujawniłoby się jako disabled opcja „**Saved custom destination**" — stan, którego nie można utworzyć przez Visual.
- **Zapis i publikacja — ŚWIADOMIE POMINIĘTE.** Nie klikałem „Save"/„Publish", aby nie modyfikować współdzielonego fixture. W efekcie **nie** zweryfikowano trwałości edycji po przeładowaniu (potwierdzono tylko spójność w obrębie sesji — Advanced wiernie podsumowuje edycje z Visual). Frontend otwierałem w **nowej karcie**, by zachować stan edytora.
- **Realna nawigacja po kliknięciu linku logo/CTA na froncie** — sprawdziłem `href`/`rel`/`target`, nie wykonywałem nawigacji.
- **Pola tekstowe Eyebrow/Title/Description** — w tym przebiegu nie wpisywałem (mechanizm `updateHeader` jest wspólny z Name/CTA label, które przetestowano i działają). Nie jest to twarde ograniczenie środowiska, lecz świadomy priorytet dla luk „gap-close".

---

## 7. NIUANSE UX/UI (nie twarde bugi)

| # | Obszar | Obserwacja (zweryfikowana w tym przebiegu) |
|---|--------|--------------------------------------------|
| **N1** | Visual / kolory + Advanced | **Domyślne kolory motywu jako „Saved custom color".** `tileBackground=var(--color-bg)` i `tileBorderColor=color-mix(…)` są niepuste i nie-hex, więc badge pokazuje **„Saved custom color"**, a **„Clear" jest aktywny** już na czystym fixture — mimo że autor niczego nie ustawił. „Section background" jest spójne („Theme default", Clear `disabled`) bo nie ma wartości domyślnej — **asymetria** między trzema polami koloru. |
| **N2** | Visual / struktura | **Cicha truncacja „Logo count".** Zmniejszenie selectem (np. 24 → 1) **bez potwierdzenia** ucina nadmiarowe logotypy. Tymczasem „Remove" jest **miękkie** (notka + Undo). Ten sam destrukcyjny efekt jest raz odwracalny, raz cichy i nieodwracalny w UI. |
| **N3** | Visual / Strip + Advanced | **Wartość ZAPISANA vs EFEKTYWNA.** Po ustawieniu Marquee w Strip i przejściu do Grid: render jest statyczny (brak tracka), ale select „Strip motion" nadal pokazuje „Marquee" (`disabled`), a Advanced pokazuje **„Strip behavior: Wrapped rows / Marquee"** — wartości bez żadnego efektu w Grid. Prezentacja **zapisu**, nie **efektu**. |
| **N4** | Visual / filtr | **Grayscale off — switch „Colorize on hover" zachowuje zapis, ale jest efektywnie off.** Po wyłączeniu Grayscale efektywny `hover-color=false`, switch staje się `disabled`, ale jego `aria-checked` zostaje `true`. Tekst pomocniczy poprawnie ostrzega („Requires grayscale mode…"). |
| **N5** | Shared MediaPicker | **a11y warning z modala Media Library.** Po „Browse media" w konsoli: „Missing `Description` or `aria-describedby={undefined}` for {DialogContent}". Dotyczy **współdzielonego** Radix Dialog, **nie** renderera logo-cloud (front widgetu: 0/0). Odnotowane, bo występuje w przepływie autorskim widgetu. |
| **N6** | Renderer (z założenia) | **`alt` bez efektu dla logo tekstowych bez linku.** „Accessible description" wpływa na `alt` obrazu i `aria-label` podlinkowanego kafelka, ale dla logo **bez obrazu i bez linku** (czysty tekst w `<div>`) nie jest renderowane nigdzie. |
| **N7** | Draft vs publish | **Rozjazd: admin canvas (defaulty) vs opublikowany front (bogatsza konfiguracja).** Draft renderuje czysty widget domyślny (tekst, `<div>`), a publiczna trasa serwuje inną zapisaną konfigurację (logo 1 z obrazem Amazon, 6× `<a href="#">`). Bez zapisu/publikacji nie rozstrzygam przyczyny (normalna separacja draft/publish vs niespójny seeding) — odnotowuję jako fakt. |
| **N8** | Visual vs Advanced | **Niespójne etykiety stanu koloru.** Dla tej samej wartości hex Visual pokazuje badge **„Selected color"**, a Advanced w wierszu „Colors" — **„Selected swatch"**. Drobna niespójność nazewnictwa między dwoma powierzchniami. |

> **Status TASK-343-30 (2026-05-30):** N1 jest zamknięte przez wspólny
> `SharedColorControl`: wartości `var(--color-bg)` i `color-mix(...)` są
> `Theme token`/fallback preview zamiast `Saved custom color`. N8 pozostaje
> tylko drobną różnicą nazwy hex w podsumowaniu Advanced.

> **Status TASK-343-31 (2026-05-30):** N5 jest zamknięte przez shared
> `MediaPicker`: `Media library` zawiera `DialogDescription`, więc Radix ma
> stabilne `aria-describedby` dla Logo Cloud i pozostałych widgetowych wejść.

> **Status TASK-343-24 (2026-05-30):** N2/N3/N4 są zamknięte lokalnie w Logo
> Cloud: count reduction is confirmed, saved Strip settings are labelled
> inactive outside Strip, and hover-color state is cleared/unchecked when
> grayscale is off.

---

## 8. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-logo-cloud-0516`) | Zgodność |
|--------|----------------------|-------------------------------------|----------|
| Renderer | żywy `LogoCloudBlock`, `data-logo-cloud-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo | tak (canvas + Wizard Live preview) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu: **defaulty** | **opublikowana** konfiguracja (logo 1 Amazon, 6× `<a href="#">`) | ⚠ rozjazd (N7) |
| Linki (safe href, rel/target) | te same reguły; zweryfikowane new-tab on/off | hash `#` → `rel=null`, `target=null` | ✓ |
| Obraz logo | render po wyborze z Media Library (`localhost:3000/media/…`) | render zewnętrznego https (`upload.wikimedia.org`) | ✓ |
| Semantyka `section`/`h2` + `aria-labelledby` | obecna (`ariaMatch=true`) | obecna (`ariaMatch=true`) | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ izolacja |
| Konsola | 1 warning (modal Media — N5) | **0/0** | ✓ (widget czysty) |
| Responsywność 375 px | n/d | 2 kolumny, brak overflow | ✓ |

---

## 9. Podsumowanie

- **logo-cloud jest w bardzo dobrym stanie funkcjonalnym.** Przeklikano **każdą dyskretną opcję każdej dostępnej kontrolki Visual**: 3 warianty, Logo count z granicami **1/24** (blokady „Add"/„Remove" działają), wszystkie pozycje 8 selectów „Display style" + CTA target (oba) + strip row/motion (z realną animacją marquee 6×2, pauzą na hover i wyłączeniem przy `prefers-reduced-motion`), 3 switche (z zależnością grayscale→hover), pełny cykl listy logo (name/alt/destination/clear-destination/move/remove+undo/remove+dismiss/add/media+clear) oraz 3 kontrolki koloru (pick + Clear). Każdy efekt potwierdzono w DOM.
- **Drag & drop DZIAŁA** (4.7) — korekta poprzedniego raportu. Niewidoczny efekt w `dragTo` to artefakt tempa automatyzacji, nie bug; reorder potwierdzony zdarzeniami HTML5 z render-tickiem oraz równoważnie przez „Move up/down".
- **Wizard i Advanced** poprawnie read-only (0 kontrolek `writable`); Advanced jest żywym lustrem **niezapisanego** stanu roboczego.
- **Frontend** zwraca 200, renderuje opublikowany stan bez błędów (0/0), responsywny (375 px bez overflow, grid→2 kol.), semantyczny z **działającym `aria-labelledby`**, linki z bezpiecznym `rel`/`target`, zewnętrzny obraz https renderuje się.
- **Niuanse (nie bugi):** N1 (domyślne kolory jako „Saved custom color" + aktywny Clear), N2 (cicha truncacja „Logo count"), N3 (zapis vs efekt — także w Advanced/Grid), N4 (switch hover przy grayscale off), N5 (a11y warning modala Media), N6 (`alt` bez efektu dla logo tekstowego bez linku), N7 (rozjazd draft/publish), N8 (etykiety „Selected color" vs „Selected swatch").
- **Nieosiągalne z UI:** walidacja niebezpiecznych URL/obrazów (tylko pickery i media). **Świadomie pominięte:** Save/Publish (ochrona współdzielonego fixture).
- **Plusy:** semantyczna nazwa sekcji, miękkie usuwanie z Undo, działające „Clear" dla wszystkich 3 pól kolorów, bezpieczne linki, deterministyczna liczba logo, marquee zgodne z `prefers-reduced-motion` i z pauzą na hover/focus.

---

## 10. Screenshoty

**Brak.** W tym przebiegu nie wykonano żadnych zrzutów — weryfikacja w 100% przez inspekcję DOM/CSS na żywym drzewie. Nie zapisano żadnego pliku evidence.
