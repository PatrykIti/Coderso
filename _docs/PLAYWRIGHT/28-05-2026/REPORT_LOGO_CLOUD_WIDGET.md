# RAPORT: Logo Cloud Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z 2026-05-28 — pełne przeklikanie wszystkich opcji)
> **Sesja Playwright:** `claude-29-05-logo-cloud-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/5958b461-fd78-4b65-b154-64692c0fa474` (strona „Contract Test - logo-cloud", status `Draft`)
> **Fixture public:** http://localhost:3000/test-logo-cloud-0516
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/logoCloud.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` + `ClearableFields.tsx` (kontrolki kolorów)

> **Uwaga metodologiczna (różnica względem poprzedniego raportu).** Ten przebieg jest
> celowo wyczerpujący, a nie „reprezentatywny". Dla każdej rodziny kontrolek
> **przeklikałem osobno KAŻDĄ dostępną opcję** (wszystkie pozycje selectów, obie
> wartości toggle, karty wariantów, oba targety CTA, granice „Logo count" 1 i 24),
> a efekt każdej zmiany weryfikowałem inspekcją DOM na żywym canvasie: atrybuty
> `data-logo-cloud-*`, klasy Tailwind listy/kafelka/nagłówka, inline `style`,
> `href`/`rel`/`target`/`aria-label`, stan `disabled` kontrolek oraz teksty badge.
> Tam, gdzie czegoś NIE dało się zweryfikować przez UI, jest to jawnie nazwane w
> sekcji 7 wraz z powodem.

> **Uwaga o screenshotach.** W trakcie audytu wykonano jeden zrzut frontendu jako
> **wyłącznie lokalną etykietę** (`logo-cloud-frontend-published-2905.png`). Plik
> **nie** jest wymaganym evidence — został usunięty z drzewa roboczego po
> przechwyceniu. Cała weryfikacja w tym raporcie opiera się o inspekcję DOM, nie o
> zrzuty. Niczego nie zapisywano ani nie publikowano (patrz sekcja 7).

---

## 1. Przegląd widgetu

**Typ:** `logo-cloud` · **Kategoria:** `content` · **Opis:** „Partner and customer logo section for trust building."

**Warianty (3):**

| Wariant | Klasa listy (zweryfikowana w DOM) | Charakterystyka |
|---------|-----------------------------------|-----------------|
| `grid` (domyślny) | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` | Zrównoważona siatka (2/3/4 kolumny responsywnie) |
| `strip` | `flex flex-wrap items-center` (wrap) **/** `flex w-full flex-nowrap items-center overflow-x-auto pb-2` (single-row) **/** `.logo-cloud-marquee` + `.logo-cloud-marquee-track` (marquee) | Poziomy pasek z trybami wiersza i ruchu |
| `dense` | `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6` | Gęsta matryca (do 6 kolumn) |

**Model danych (`LogoCloudData`):** header (`eyebrow`/`title`/`description`), cta (`enabled`/`label`/`href`/`target`), logos[] (`id`/`name`/`alt`/`image`/`href`), style (`logoHeight`, `grayscale`, `hoverColor`, `gap`, `alignment`, `sectionBackground`, `tileBackground`, `tileBorderColor`, `headerAlign`, `headerSize`, `rowMode`, `motionMode`, `tileRadius`, `tileBorderWidth`, `openLinksInNewTab`).

**Ograniczenia:** min 1 / max 24 logotypy (`logoCloudLogoMin=1`, `logoCloudLogoMax=24`). Liczba kafelków jest sterowana **długością tablicy `logos`** (select „Logo count" deterministycznie ustala długość — patrz 4.3).

**Renderowanie:** `<section class="mx-auto w-full max-w-6xl px-4 py-8">` z opcjonalnym `<header>` (eyebrow `<p>`, tytuł `<h2>`, opis `<p>`) i kontenerem listy. Kafelek: `image` → `<img loading="lazy">` (z `grayscale`/`group-hover:grayscale-0`), inaczej tekst `name` w `<span>`. `href` → kafelek jest `<a>` (bezpieczny href przez `resolveWidgetLinkAttrs`), inaczej `<div>`. Marquee duplikuje listę (`[...logos, ...logos]`). CTA renderowane pod listą wyłącznie gdy `enabled && label && bezpieczny href`.

**Dostępność (pozytyw):** `<section aria-labelledby>` wskazuje na `<h2>`, gdy tytuł istnieje; fallback `aria-label="Partner logos"` przy braku tytułu. (Lepiej niż `contact`/`feature-grid`, które nie miały nazwy sekcji.)

---

## 2. Architektura trybów edytora (niuans UX)

Panel po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie komunikat *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się **„Finish setup and open Visual"**. To ten sam wzorzec, co w `feature-grid`/`tabs`/`accordion`.

| Tryb | Jak otworzyć | Zawartość | Edytowalne kontrolki? |
|------|--------------|-----------|------------------------|
| **Wizard** | „Run setup again" | „Starter overview" (read-only: Current layout, Logo count) + własny panel **„Live preview"** | **0** (potwierdzone: `writablePaths: []`) |
| **Visual** | zakładka „Visual" | 5 sekcji widgetu + współdzielone „Block layout" / „Device visibility" | Wszystkie (patrz 3) |
| **Advanced** | zakładka „Advanced" | 4 read-only sekcje podsumowań | **0** (potwierdzone) |

Liczbę widocznych kontrolek `writable` w Wizard i Advanced sprawdzono programowo (`querySelectorAll('[data-widget-control-ownership="writable"]')` filtrowane po widoczności) → **pusta lista w obu trybach**.

---

## 3. Pełna mapa kontrolek Visual (co przeklikano)

Sekcja Visual ma 5 bloków. Poniżej komplet kontrolek i liczba dostępnych dyskretnych opcji, z których **każda** została kliknięta co najmniej raz:

| Sekcja Visual | Kontrolka | Typ | Opcje przeklikane |
|---------------|-----------|-----|-------------------|
| Variant and layout structure | Wariant | karty (radio) | **Grid, Strip, Dense** (3/3) |
| Variant and layout structure | Logo count | select 1–24 | **1, 2, 6, 12, 24** (granice + środek) |
| Header copy | Eyebrow / Title | input | wpisany tekst |
| Header copy | Description | textarea | wpisany tekst |
| Logos list and links | Name / Accessible description | input | wpisany tekst |
| Logos list and links | Media library | MediaPicker + „Clear image" | wybór assetu + Clear |
| Logos list and links | Logo destination | picker stron | „No destination" → „HomePage" |
| Logos list and links | Drag / Move up / Move down / Remove / Add logo / Undo | przyciski | wszystkie (Drag — patrz 7) |
| Section CTA | Enable CTA | switch | on/off |
| Section CTA | CTA label | input | wpisany tekst |
| Section CTA | CTA destination | picker stron | „HomePage" |
| Section CTA | CTA target | select | **Same tab, New tab** (2/2) |
| Display style | Logo height | select | **None, Small, Medium, Large, Extra large** (5/5) |
| Display style | Gap | select | **None, Compact, Default, Spacious** (4/4) |
| Display style | Alignment | select | **Start, Center, End** (3/3) |
| Display style | Header alignment | select | **Start, Center, End** (3/3) |
| Display style | Header size | select | **Small, Medium, Large** (3/3) |
| Display style | Strip row behavior | select (tylko Strip) | **Wrapped rows, Single row scroll** (2/2) |
| Display style | Strip motion | select (tylko Strip) | **Static, Marquee** (2/2) |
| Display style | Tile radius | select | **None, Small, Medium, Large, Extra large, Full** (6/6) |
| Display style | Tile border width | select | **None, Standard, Heavy** (3/3) |
| Display style | Open logo links in new tab | switch | on/off |
| Display style | Grayscale logos | switch | on/off |
| Display style | Colorize on hover | switch (zależny od grayscale) | on/off |
| Display style | Section background | SharedColorControl | pick + Clear |
| Display style | Tile background | SharedColorControl | pick + Clear |
| Display style | Tile border | SharedColorControl | pick + Clear |

---

## 4. Co DZIAŁA — szczegóły z weryfikacją DOM

### 4.1 Wizard (read-only)

- „Starter overview": „Current layout: Grid", „Logo count: 6 logos" + tekst kierujący do Visual. ✓
- „Live preview" renderuje widget przez współdzielony renderer — w DOM znaleziono **2** elementy `[data-logo-cloud-variant]` (canvas + live preview), a preview ma **6 kafelków** (`[data-logo-cloud-item]`). ✓
- „Finish setup and open Visual" wraca do Visual (komunikat „Setup complete"). ✓
- **0** widocznych kontrolek `writable` (zgodnie z kontraktem). ✓

### 4.2 Visual — warianty i kontrolki strip-only

| Akcja | Efekt w DOM (zweryfikowany) |
|-------|------------------------------|
| Wariant **Grid** | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`; selecty Strip `disabled`. ✓ |
| Wariant **Strip** | `flex flex-wrap items-center`; selecty „Strip row behavior" i „Strip motion" **odblokowane** (`disabled=false`). ✓ |
| Wariant **Dense** | `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6`; selecty Strip znów `disabled`. ✓ |
| Strip row → **Single row scroll** | `flex w-full flex-nowrap items-center overflow-x-auto pb-2 …`, `data-row-mode=single-row`. ✓ |
| Strip row → **Wrapped rows** | `flex flex-wrap items-center …`, `data-row-mode=wrap`. ✓ |
| Strip motion → **Marquee** | `data-motion=marquee`; render wymuszony **single-row**; `.logo-cloud-marquee-track` z **12 kafelkami** (6×2, duplikacja); `getComputedStyle(track).animationName = "logo-cloud-marquee"` (realna animacja CSS); select „Strip row behavior" staje się `disabled` (zablokowany). ✓ |
| Strip motion → **Static** | `data-motion=static`, track znika, select row znów aktywny. ✓ |

### 4.3 Visual — Logo count (granice włącznie)

| Wartość | `data-count` | Wyrenderowanych kafelków | „Add logo" | „Remove" (1. kafelek) |
|---------|--------------|--------------------------|------------|------------------------|
| 2 | 2 | 2 | aktywny | aktywny |
| 12 | 12 | 12 | aktywny | aktywny |
| **24 (max)** | 24 | 24 | **`disabled`** ✓ | aktywny |
| **1 (min)** | 1 | 1 | aktywny | **`disabled`** ✓ |
| 6 | 6 | 6 | aktywny | aktywny |

Limit min/max jest egzekwowany blokadą przycisków (czego poprzedni raport nie zweryfikował). ✓

### 4.4 Visual — selecty „Display style" (każda opcja osobno)

Każdą opcję kliknięto i odczytano odpowiedni atrybut `data-logo-cloud-*` na canvasie:

- **Logo height:** None→`none`, Small→`sm`, Medium→`md`, Large→`lg`, Extra large→`xl` (5/5). Klasa obrazu potwierdzona m.in. `h-14` przy `xl` (mapowanie: none=`h-auto max-h-16`, sm=`h-8`, md=`h-10`, lg=`h-12`, xl=`h-14`). ✓
- **Gap:** None→`none`, Compact→`sm`, Default→`md`, Spacious→`lg` (4/4). Klasa listy potwierdzona `gap-6` przy Spacious (none=`gap-0`, sm=`gap-2`, md=`gap-4`, lg=`gap-6`). ✓
- **Alignment:** Start→`start`, Center→`center`, End→`end` (3/3). Na siatce: Start=`justify-items-start`, End=`justify-items-end`, Center=brak klasy (potwierdzone `justify-items-end` przy End). ✓
- **Header alignment:** Start→`start`, Center→`center`, End→`end` (3/3). Klasa `<header>` potwierdzona `items-end text-right` przy End (start=`items-start text-left`, center=`items-center text-center`). ✓
- **Header size:** Small→`sm`, Medium→`md`, Large→`lg` (3/3). Klasa `<h2>` potwierdzona `text-3xl` przy Large (sm=`text-xl`, md=`text-2xl`). ✓
- **Tile radius:** None→`none`, Small→`sm`, Medium→`md`, Large→`lg`, Extra large→`xl`, Full→`full` (6/6). Klasa kafelka potwierdzona `rounded-full` przy Full. ✓
- **Tile border width:** None→`none`, Standard→`sm`, Heavy→`md` (3/3). Klasa kafelka potwierdzona `border-2` przy Heavy (none=`border-0`, sm=`border`). ✓

### 4.5 Visual — przełączniki (switche)

| Switch | Test | Efekt (DOM) |
|--------|------|-------------|
| Grayscale logos | on→off→on | `data-grayscale` przełącza się; **przy off** efektywny `data-hover-color=false` i switch „Colorize on hover" staje się `disabled` (a jego zapisana wartość `aria-checked` pozostaje, patrz N4). ✓ |
| Colorize on hover | off→on (przy grayscale on) | `data-hover-color` przełącza się. ✓ |
| Open logo links in new tab | off→on→off | `data-open-in-new-tab` przełącza się; na podlinkowanym kafelku **on** → `target="_blank" rel="noopener noreferrer"`, **off** → `target=null rel=null`. ✓ |

### 4.6 Visual — lista logo (repeatable items)

- **Name (logo 1) → „Moja Firma":** tekst kafelka aktualizuje się. ✓
- **Accessible description (alt) → „Logo Mojej Firmy":** staje się `aria-label` podlinkowanego kafelka oraz `alt` obrazu. ✓
- **Logo destination:** picker istniejących stron (opcje: „No destination", „HomePage", „Pricing Review Temp", … — listy stron, **nie** wolne pole tekstowe). Wybór „HomePage" → kafelek `<a href="/homepage">`. ✓
- **Open-in-new-tab + link:** z włączonym new-tab kafelek = `<a href="/homepage" target="_blank" rel="noopener noreferrer" aria-label="Logo Mojej Firmy">Moja Firma</a>`; po wyłączeniu → bez `target`/`rel`. ✓
- **Move down / Move up:** kolejność zmienia się natychmiast i wraca (Moja Firma idx0→idx1→idx0). ✓
- **Remove (logo 2):** **miękkie** usunięcie — notka `role="status"` „North Labs removed. Undo is available." z „Undo"/„Dismiss". ✓
- **Undo:** przywraca logo na **pierwotną pozycję** (index 1). ✓
- **Add logo:** dopisuje „Logo 7" na końcu (`count` 6→7). ✓
- **Media library → wybór `cos1.png`:** kafelek → `<img src="http://localhost:3000/media/…">`, `loading="lazy"`, klasa `… h-14 grayscale … group-hover:grayscale-0`, `data-has-image=true`. **Ręcznie wpisany `alt` („Logo Mojej Firmy") został zachowany** i NIE nadpisany altem assetu (zgodnie z `alt: latestLogo.alt?.trim() ? latestLogo.alt : next.alt`). ✓
- **Clear image:** kafelek wraca do tekstu „Moja Firma", `data-has-image=false`. ✓

### 4.7 Visual — Section CTA (kompletność reguły render)

| Krok | CTA w DOM |
|------|-----------|
| Enable CTA (bez label/href) | CTA **nie renderuje się**; select „CTA destination" przestaje być `disabled`. ✓ |
| + CTA label „Dołącz teraz" (wciąż bez href) | CTA **nadal się nie renderuje**. ✓ |
| + CTA destination „HomePage" (target Same tab) | `<a href="/homepage" data-logo-cloud-cta>Dołącz teraz</a>`, bez `target`/`rel`. ✓ |
| CTA target → **New tab** | `target="_blank" rel="noopener noreferrer"`. ✓ |
| CTA target → **Same tab** | `target=null rel=null`. ✓ |

Potwierdza regułę „Only complete and safe CTA links render in the public widget." (oba targety przeklikane).

### 4.8 Visual — kontrolki kolorów (3× SharedColorControl)

Konfiguracja logo-cloud używa `showValueInput={false}` i **nie** ustawia `allowTransparent` — więc **nie ma** ani wolnego pola wartości, ani przycisku „Use transparent"; jest tylko **swatch (`<input type=color>`)**, badge stanu i **„Clear"** (w `ClearableFieldHeader`).

| Kontrolka | Stan początkowy (badge / Clear) | Pick koloru | Clear |
|-----------|----------------------------------|-------------|-------|
| **Section background** | „Theme default" / Clear `disabled` | `#123456` → inline `background-color: rgb(18,52,86)`, badge „Selected color" ✓ | badge wraca „Theme default", inline `style` usunięty ✓ |
| **Tile background** | **„Saved custom color"** / Clear **aktywny** (inline `var(--color-bg)`) — patrz N1 | `#abcdef` → `rgb(171,205,239)`, „Selected color" ✓ | inline usunięty, „Theme default" ✓ |
| **Tile border** | **„Saved custom color"** / Clear **aktywny** (inline `color-mix(in srgb, var(--color-border) 60%, transparent)`) — N1 | `#ff0000` → `rgb(255,0,0)`, „Selected color" ✓ | inline usunięty, „Theme default" ✓ |

> Uwaga techniczna: „Clear" usuwa wartość ze stylu, więc po wyczyszczeniu kafelka znika **cały** inline `background-color`/`border-color` (także domyślny `var(...)`), a renderer schodzi do klas CSS. To realna zmiana renderu, nie kosmetyka.

### 4.9 Advanced (read-only, żywe lustro stanu roboczego)

Advanced sprawdzono **dwukrotnie**: przy stanie domyślnym oraz po szeregu edycji w Visual. W obu przypadkach wiernie odzwierciedlał **bieżący niezapisany stan** roboczy:

- Stan domyślny: „Layout: Grid", „Logos: 6 logos", „Logo height: Medium", „Spacing: Default", „Header: Configured", „Logo images: No logo images selected yet", „Logo destinations: Logo tiles are not linked", „Section CTA: Hidden", „Alignment: Center", „Header style: Center / Medium", „Strip behavior: Wrapped rows / Static", „Tile shape: Large corners, Standard border", „Logo filter: Grayscale with color on hover", „Colors: Section: Theme default, tile: **Saved custom color**, border: **Saved custom color**" (N1).
- Stan po edycjach: „Logo height: Extra large", „Spacing: Spacious", „Logo destinations: 1 logo link opens in the same tab", „Section CTA: Visible, opens in the same tab", „Alignment: End", „Header style: End / Large", „Tile shape: Full corners, Heavy border", „Strip behavior: **Wrapped rows / Marquee**" (mimo że wariant to **Grid** — N3), „Colors: Section: Theme default, tile: **Theme default**, border: **Theme default**" (po Clear). ✓
- **0** kontrolek `writable`. ✓

### 4.10 Frontend (public)

Trasa `/test-logo-cloud-0516`:

- **HTTP 200** (curl). ✓
- Render **zapisanego (opublikowanego)** stanu: `variant=grid`, `count=6`, gap/height/align = domyślne. To **inny** stan niż mój draft w adminie — moje niezapisane edycje **nie wyciekły** na front. ✓
- Tytuł `<h2>` „Trusted by teams worldwide". **Wszystkie 6 kafelków to `<a href="#">`** (zapis: logotypy podlinkowane do hash), `rel=null`, `target=null` (hash + `openLinksInNewTab=false` → poprawnie bez nowej karty). ✓
- **Logo 1 ma realny obraz:** `<img src="https://upload.wikimedia.org/.../Amazon_logo.svg/1200px-Amazon_logo.svg.png">`, `alt="Acme"` (fallback z `name`), `loading="lazy"`, klasa `h-10 grayscale group-hover:grayscale-0 object-contain`. Zewnętrzny obraz https renderuje się. ✓ Logo 2–6 jako tekst.
- **ARIA:** `aria-labelledby` `<section>` = `id` `<h2>` (`match=true`), `aria-label=null` (bo tytuł istnieje). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** `scrollWidth == clientWidth == 375` (brak poziomego overflow), siatka schodzi do **2 kolumn** (`grid-template-columns` = 2). ✓

---

## 5. Co NIE działa / jest mylące (niuanse UX/UI)

| # | Obszar | Obserwacja (zweryfikowana w tym przebiegu) |
|---|--------|--------------------------------------------|
| **N1 — Domyślne kolory motywu jako „Saved custom color"** | Visual / kolory + Advanced | Domyślne `tileBackground = var(--color-bg)` i `tileBorderColor = color-mix(in srgb, var(--color-border) 60%, transparent)` to wartości niepuste i nie-hex, więc badge pokazuje **„Saved custom color"**, a **„Clear" jest aktywny** już na czystym fixture — mimo że autor niczego nie ustawił. Potwierdzone na badge (Visual) i w Advanced („tile/border: Saved custom color"). Mylące: sugeruje istnienie zapisanego niestandardowego koloru, którego nie ma. Sekcja „Section background" jest tu spójna („Theme default", Clear `disabled`), bo nie ma wartości domyślnej — asymetria między trzema polami koloru. |
| **N2 — Redukcja „Logo count" po cichu obcina (asymetria względem Remove)** | Visual / struktura | Zmniejszenie liczby selectem „Logo count" (np. 24 → 1) **bez potwierdzenia** usuwa nadmiarowe logotypy (truncacja). Tymczasem usunięcie przyciskiem „Remove" jest **miękkie** (notka + „Undo"). Ten sam destrukcyjny efekt jest raz odwracalny, a raz cichy i nieodwracalny w UI. Niespójna ochrona przed utratą danych. |
| **N3 — „Strip row behavior" i Advanced pokazują wartość zapisaną, nie efektywną** | Visual / Strip + Advanced | Przy Marquee select „Strip row behavior" pozostaje na „Wrapped rows" (zapis w `style.rowMode`), choć render jest single-row (`disabled` + tekst „Marquee always uses a single horizontal track, so row behavior stays locked."). Dodatkowo Advanced pokazał „Strip behavior: Wrapped rows / **Marquee**" **przy wariancie Grid**, gdzie te wartości nie mają żadnego efektu. Prezentacja stanu **zapisanego**, nie **efektywnego**. |
| **N4 — Grayscale off: switch „Colorize on hover" zachowuje zapisaną wartość, ale jest efektywnie wyłączony** | Visual / filtr | Po wyłączeniu „Grayscale" efektywny `hover-color=false`, a switch „Colorize on hover" staje się `disabled` — ale jego `aria-checked` nadal odzwierciedla zapisaną wartość (true). To kolejny przypadek „zapisane vs efektywne" (jak N3); drobny, ale autor widzi „włączony, lecz wyszarzony" przełącznik. Tekst pomocniczy poprawnie ostrzega: „Requires grayscale mode…". |
| **N5 — Ostrzeżenie a11y z modala Media Library (poza widgetem)** | Shared MediaPicker | Po „Browse media" w konsoli pojawia się React-warning: „Missing `Description` or `aria-describedby={undefined}` for {DialogContent}". Dotyczy **współdzielonego** Radix Dialog, nie renderera logo-cloud (front widgetu: 0/0). Odnotowane, bo występuje w przepływie autorskim tego widgetu. |
| **N6 — `alt` bez efektu dla logo tekstowych bez linku** | Renderer (z założenia) | „Accessible description" (`alt`) wpływa na `alt` obrazu i `aria-label` podlinkowanego kafelka, ale dla logo **bez obrazu i bez linku** (czysty tekst w `<div>`) nie jest renderowane nigdzie. Wynika z modelu (tekstowy `name` jest treścią), lecz autor wpisujący alt przy logo tekstowym bez linku nie zobaczy efektu. |

**Nie wykryto** żadnego twardego buga renderowania ani błędu konsoli na froncie. Wszystkie realnie klikalne kontrolki Visual aktualizują podgląd na żywo; Wizard i Advanced są poprawnie read-only; frontend jest responsywny (375 px bez overflow), bez błędów konsoli i poprawny semantycznie.

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-logo-cloud-0516`) | Zgodność |
|--------|----------------------|-------------------------------------|----------|
| Renderer | żywy `LogoCloudBlock`, atrybuty `data-logo-cloud-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo po edycji | tak (canvas + Wizard Live preview) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu: **defaulty** (tekst, `<div>`, bez obrazów/linków) | **opublikowana** konfiguracja (logo 1 z obrazem Amazon, 6× `<a href="#">`) | ⚠ rozjazd (N7 w sek. 7) |
| Linki logo (safe href, rel/target) | te same reguły (`resolveWidgetLinkAttrs`); zweryfikowane new-tab on/off | hash `#` → `rel=null`, `target=null` | ✓ |
| Obraz logo | render po wyborze z Media Library (`localhost:3000/media/…`) | render zewnętrznego https (`upload.wikimedia.org`) | ✓ |
| Semantyka `section`/`h2` + `aria-labelledby` | obecna | obecna (`match=true`) | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |
| Konsola | 1 warning (modal Media — N5) | 0/0 | ✓ (widget czysty) |
| Responsywność 375 px | n/d (testowane na froncie) | 2 kolumny, brak overflow | ✓ |

---

## 7. Czego NIE testowano / czego NIE dało się zweryfikować (uczciwe ograniczenia)

- **Natywne drag-and-drop logotypów (uchwyt „Drag") — NIETESTOWALNE PRZEZ AUTOMATYZACJĘ.** Próbowałem dwóch dróg: (a) `playwright dragTo` (symulacja myszą) oraz (b) ręczne dyspozycje zdarzeń HTML5 `dragstart`/`dragover`/`drop`/`dragend` z `DataTransfer` przez `run-code`. **Żadna nie zmieniła kolejności.** Powód jest w implementacji: `dropLogoAtIndex` czyta `dragState` z domknięcia, a `startLogoDrag` ustawia go asynchronicznie (`setState`) — przy realnym przeciąganiu (ruch myszy między `dragstart` a `drop`) React zdąży przerenderować i `drop` widzi aktualny `dragState`, ale przy syntetycznych zdarzeniach w jednym ticku `dragState` pozostaje `null` i handler kończy wcześnie. **To ograniczenie automatyzacji, a nie potwierdzony bug** — ta sama logika reorderu (`moveLogoInData`) jest wykonywana przez „Move up"/„Move down", które **działają** (zweryfikowane). Dla pewności zachowania drag&drop konieczny jest test manualny lub `@playwright/test` z natywnym DnD.
- **Walidacja niebezpiecznych/niepoprawnych URL (`getLogoCloudLinkFeedback` / `getLogoCloudImageFeedback`):** w Visual „Logo destination" i „CTA destination" to **pickery stron** (brak wolnego pola tekstowego), a obraz wybiera się przez MediaPicker. Ścieżki feedbacku ostrzegającego o niebezpiecznym linku/obrazie uruchamiają się tylko dla wartości **wcześniej zapisanych w JSON**, niemożliwych do wpisania z Visual — nie udało się ich wywołać przez UI.
- **Zapis i publikacja:** świadomie **nie** klikałem „Save"/„Publish", aby nie modyfikować współdzielonego fixture. W konsekwencji nie zweryfikowano trwałości edycji po przeładowaniu (potwierdzono tylko trwałość w obrębie sesji edytora — Advanced wiernie podsumował edycje z Visual). Frontend otwierałem w **nowej karcie**, by zachować stan edytora.
- **N7 — Rozjazd draft (defaulty) vs opublikowany front (bogatsza konfiguracja):** przy wejściu canvas adminowego draftu renderował **czysty widget domyślny**, a publiczna trasa serwuje **inną, zapisaną konfigurację** (logo 1 z obrazem Amazon, 6× `<a href="#">`). Nie rozstrzygnąłem przyczyny (normalna separacja draft/publish vs niespójny seeding fixture) bez zapisu/publikacji — odnotowuję jako fakt.
- **`prefers-reduced-motion` dla Marquee:** CSS deklaruje „reduced-motion-safe" track, ale nie testowałem zachowania przy włączonej redukcji ruchu.
- **Realna nawigacja po kliknięciu linku logo/CTA na froncie:** linki to `#`/`/homepage`; sprawdziłem atrybuty `href`/`rel`/`target`, nie wykonywałem nawigacji.
- **Tekstowo nieprzeklikane warianty:** dla pól tekstowych (Eyebrow/Title/Description, Name/alt, CTA label) wpisano wartości; nie testowano osobno każdego znaku/długości — mechanizm `updateHeader`/`updateCta`/`commitLogoPatch` jest wspólny i zweryfikowany.

---

## 8. Podsumowanie

- **logo-cloud jest w bardzo dobrym stanie funkcjonalnym.** W tym przebiegu **przeklikano każdą dyskretną opcję każdej dostępnej kontrolki Visual**: 3 warianty, Logo count z granicami 1/24 (blokady „Add"/„Remove" działają), wszystkie wartości 8 selectów „Display style" + CTA target (oba) + strip row/motion (z realną animacją marquee i duplikacją 6×2), 3 switche (z zależnością grayscale→hover), pełen cykl listy logo (name/alt/destination/move/remove+undo/add/media+clear), pełen przepływ CTA (gate „complete & safe") oraz 3 kontrolki koloru (pick + Clear). Każdy efekt potwierdzono w DOM.
- **Wizard i Advanced** są poprawnie read-only (0 kontrolek `writable`); Advanced jest żywym lustrem **niezapisanego** stanu roboczego (zweryfikowane przy defaultach i po edycjach).
- **Frontend** zwraca 200, renderuje opublikowany stan bez błędów konsoli (0/0), jest responsywny (375 px bez overflow, grid→2 kolumny), poprawny semantycznie z **działającym `aria-labelledby`**, a linki mają bezpieczne `rel`/`target`. Zewnętrzny obraz logo renderuje się.
- **Najważniejsze niuanse (nie twarde bugi):** N1 (domyślne kolory motywu jako „Saved custom color" z aktywnym Clear), N2 (cicha truncacja „Logo count" vs odwracalny Remove), N3 (select row behavior + Advanced pokazują zapis, nie efekt — także w Grid), N4 (switch „Colorize on hover" zachowuje zapis przy grayscale off), N5 (a11y warning współdzielonego modala Media), N6 (`alt` bez efektu dla logo tekstowych bez linku).
- **Jedyna pozycja nieweryfikowalna przez UI:** natywne drag&drop uchwytem „Drag" (ograniczenie automatyzacji, nie bug — równoważny reorder przez Move up/down działa). Walidacja niebezpiecznych URL jest niedostępna z Visual (tylko pickery).
- **Plusy względem innych widgetów:** semantyczna nazwa sekcji (`aria-labelledby`/fallback `aria-label`), miękkie usuwanie z „Undo", działające „Clear" dla wszystkich trzech pól kolorów, bezpieczne linki (`rel="noopener noreferrer"` dla nowej karty), deterministyczna liczba logo sterowana danymi.

---

## 9. Screenshoty (lokalne etykiety)

> Poniższa nazwa to **wyłącznie lokalna etykieta** przechwycenia Playwright. Plik
> **nie** jest wymaganym evidence i **został usunięty** z drzewa roboczego po
> przechwyceniu. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM.

| Plik (lokalny, nietrwały) | Opis |
|---------------------------|------|
| `logo-cloud-frontend-published-2905.png` | Publiczna trasa `/test-logo-cloud-0516` (375 px) — opublikowany stan fixture (logo 1 z obrazem, 6× `<a href="#">`, siatka 2-kolumnowa) |
