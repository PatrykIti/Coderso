# RAPORT: Logo Cloud Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-logo-cloud` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/5958b461-fd78-4b65-b154-64692c0fa474` (strona „Contract Test - logo-cloud", status `Draft`)
> **Fixture public:** http://localhost:3000/test-logo-cloud-0516
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/logoCloud.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI (klik, wpisanie tekstu, wybór opcji, przełącznik) oraz inspekcją DOM
> (atrybuty `data-logo-cloud-*`, klasy Tailwind, inline `style`, `href`/`rel`/`target`,
> ARIA), a nie tylko zliczeniem widocznych sekcji. Sekcje 4–7 jasno oddzielają:
> co działa, co nie działa / jest mylące, co faktycznie przetestowano oraz czego
> NIE testowano.

> Uwaga o screenshotach: w trakcie audytu wykonano jeden zrzut frontendu jako
> **wyłącznie lokalną etykietę** (`logo-cloud-frontend-published.png`). Plik nie
> jest wymaganym evidence — został usunięty z drzewa roboczego po przechwyceniu,
> a główna weryfikacja w całym raporcie opierała się o inspekcję DOM, nie o zrzuty.
> Nie zapisywano ani nie publikowano fixture (patrz sekcja 7).

---

## 1. Przegląd widgetu

**Typ:** `logo-cloud` · **Kategoria:** `content` · **Opis:** „Partner and customer logo section for trust building."

**Warianty:**

| Wariant | Klasa listy (siatki) | Charakterystyka |
|---------|----------------------|-----------------|
| `grid` (domyślny) | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` | Zrównoważona siatka logo (2/3/4 kolumny responsywnie) |
| `strip` | `flex flex-wrap items-center` (wrap) **lub** `flex flex-nowrap overflow-x-auto` (single-row) **lub** `.logo-cloud-marquee` (marquee) | Poziomy pasek; dostępne tryby wiersza i ruchu |
| `dense` | `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6` | Gęsta matryca (do 6 kolumn) dla dużych list |

**Model danych (`LogoCloudData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `eyebrow`, `title`, `description` |
| **cta** | `enabled` (bool), `label`, `href`, `target` (`same-tab`/`new-tab`) |
| **logos[]** | `id`, `name`, `alt`, `image`, `href` |
| **style** | `logoHeight` (none/sm/md/lg/xl), `grayscale` (bool), `hoverColor` (bool), `gap` (none/sm/md/lg), `alignment` (start/center/end), `sectionBackground` (clearable), `tileBackground` (clearable), `tileBorderColor` (clearable), `headerAlign` (start/center/end), `headerSize` (sm/md/lg), `rowMode` (wrap/single-row), `motionMode` (static/marquee), `tileRadius` (none/sm/md/lg/xl/full), `tileBorderWidth` (none/sm/md), `openLinksInNewTab` (bool) |

**Ograniczenia:** min 1 / max 24 logotypy (`logoCloudLogoMin=1`, `logoCloudLogoMax=24`). Liczba renderowanych kafelków jest sterowana **długością tablicy `logos`** (kontrolka „Logo count" deterministycznie ustala długość — patrz 4.2).

**Renderowanie:** `<section>` (`mx-auto w-full max-w-6xl px-4 py-8`) z opcjonalnym `<header>` (eyebrow `<p>`, tytuł `<h2>`, opis `<p>`) i kontenerem listy. Kafelek logo: jeśli `image` jest ustawione → `<img loading="lazy">` (z `grayscale`/`group-hover:grayscale-0`), w przeciwnym razie tekst `name` w `<span>`. Jeśli logo ma `href` → kafelek jest `<a>` (bezpieczny href przez `resolveWidgetLinkAttrs`), inaczej `<div>`. Marquee duplikuje listę (`[...logos, ...logos]`) i renderuje w `.logo-cloud-marquee-track`. Opcjonalne CTA renderowane pod listą tylko gdy `enabled && label && bezpieczny href`.

**Dostępność (pozytyw):** `<section>` ma `aria-labelledby` wskazujący na `<h2>`, gdy tytuł istnieje; gdy tytułu brak — fallback `aria-label="Partner logos"`. To **lepiej** niż w widgetach `contact`/`feature-grid`, które nie miały żadnej nazwy dostępnej sekcji.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje komunikat *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `feature-grid`/`tabs`/`accordion`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Jedna sekcja „Starter overview": **read-only** wiersze „Current layout" i „Logo count" + tekst kierujący do Visual. Dodatkowo własny panel **„Live preview"** renderujący widget przez współdzielony renderer. **Brak jakichkolwiek edytowalnych kontrolek.** |
| **Visual** | zakładka „Visual" | 5 sekcji widgetowych (niżej) + współdzielone „Block layout" i „Device visibility". |
| **Advanced** | zakładka „Advanced" | 4 read-only sekcje podsumowań: „Layout summary", „Content summary", „Presentation summary", „Authoring boundaries" + współdzielone „Block layout" / „Device visibility". **Brak jakichkolwiek edytowalnych kontrolek.** |

**5 sekcji Visual:** (1) „Variant and layout structure" — karty wariantu (Grid/Strip/Dense) + select „Logo count" (1–24); (2) „Header copy" — Eyebrow, Title, Description (textarea); (3) „Logos list and links" — per-logo: Drag, Move up/down, Remove; Name, podgląd obrazu, „Media library" (MediaPicker + „Clear image"), status „Current image", „Accessible description" (alt), „Logo destination" (picker stron); przycisk „Add logo"; notka „undo" po usunięciu; (4) „Section CTA" — Enable CTA, CTA label, CTA destination (picker stron), CTA target; (5) „Display style" — Logo height, Gap, Alignment, Header alignment, Header size, Strip row behavior (tylko Strip), Strip motion (tylko Strip), Tile radius, Tile border width, „Open logo links in new tab" (toggle), „Grayscale logos" (toggle), „Colorize on hover" (toggle, zależny od grayscale), Section background, Tile background, Tile border (3× `SharedColorControl` z „Clear").

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonano w sesji `claude-28-05-logo-cloud` i zweryfikowano inspekcją DOM:

- **Wizard:** odczyt „Starter overview" (Current layout = Grid, Logo count = 6 logos), potwierdzenie obecności „Live preview", powrót „Finish setup and open Visual".
- **Visual / wariant:** Grid → Strip → Dense → powrót Grid (weryfikacja klas listy i `data-logo-cloud-variant`).
- **Visual / Strip:** Strip motion Static → **Marquee** (i z powrotem Static); Strip row behavior Wrapped → **Single row scroll**; weryfikacja blokady kontrolek w Grid/Dense oraz blokady „row behavior" przy Marquee.
- **Visual / Logo count:** 6 → **8** (nowe logo „Nova", „Horizon"); 8 → **3** (truncacja).
- **Visual / Header copy:** Eyebrow → „NASI PARTNERZY", Title → „Zaufali nam najlepsi"; Header size → Large; Header alignment → Start.
- **Visual / Logos:** Name logo 1 → „Moja Firma"; Accessible description (alt) → „Logo Mojej Firmy"; Logo destination → **HomePage** (`/homepage`); Move down (reorder); **Remove + Undo** (przywrócenie na pierwotną pozycję); **Add logo** (3→4); **Browse media** → wybór realnego assetu (`cos1.png`) → render `<img>`; **Clear image** (powrót do tekstu).
- **Visual / CTA:** Enable CTA on; CTA label → „Dołącz teraz"; CTA destination → HomePage; CTA target → **New tab**.
- **Visual / Display style:** „Open logo links in new tab" on; „Grayscale" off→on (zależność „Colorize on hover"); Gap → Spacious; Alignment → Start; Tile radius → Full; Section background → `#123456`; Tile background → **Clear**.
- **Advanced:** odczyt wszystkich 4 sekcji podsumowań i porównanie z bieżącym (niezapisanym) stanem z Visual.
- **Frontend (public):** status HTTP, render zapisanego stanu, atrybuty kafelków/linków/obrazu, semantyka/ARIA (`aria-labelledby`↔`<h2>`), konsola, responsywność 375 px.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- Sekcja **„Starter overview"** jest w 100% read-only i poprawnie odzwierciedla stan: „Current layout: Grid", „Logo count: 6 logos" + tekst „Use Visual to change layout, adjust logo count…". ✓
- **„Live preview"** renderuje widget przez współdzielony renderer (region „Trusted by teams worldwide" z `<h2>` i 6 kafelkami) — w pełnej zgodzie z głównym canvas. ✓
- **„Finish setup and open Visual"** wraca do zakładki Visual i przywraca komunikat „Setup complete". ✓
- Zgodnie z kontraktem (`writablePaths: []`) Wizard **nie ma** żadnej edytowalnej kontrolki — to świadomy, podsumowujący ekran startowy.

### 4.2 Visual

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Wariant Grid | domyślny | lista `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. ✓ |
| Wariant Strip | → Strip | lista `flex flex-wrap items-center …`; odblokowane „Strip row behavior" i „Strip motion". ✓ |
| Wariant Dense | → Dense | lista `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6`; kontrolki Strip ponownie `disabled`. ✓ |
| Strip motion | → Marquee | `data-logo-cloud-motion=marquee`, `row-mode` auto-`single-row`; `.logo-cloud-marquee-track` z **12 kafelkami** (6×2, duplikacja); realna animacja CSS `animation-name: logo-cloud-marquee`, `24s`. ✓ |
| Strip row behavior | → Single row scroll | lista `flex w-full flex-nowrap items-center overflow-x-auto pb-2 …`. ✓ |
| Logo count | → 8 | `count=8`, nowe kafelki z fallback-nazwami „Nova", „Horizon". ✓ |
| Logo count | → 3 (redukcja) | `count=3`, zachowane 3 pierwsze (Acme/North Labs/BlueRiver), **bez dialogu** (patrz N2). ✓ (truncacja działa) |
| Eyebrow | → „NASI PARTNERZY" | `header > p` (eyebrow) renderuje się natychmiast. ✓ |
| Title | → „Zaufali nam najlepsi" | `header > h2` aktualizuje się natychmiast. ✓ |
| Header size | → Large | `h2` → `text-3xl`. ✓ |
| Header alignment | → Start | `header` → `items-start text-left`. ✓ |
| Logo name (1) | → „Moja Firma" | tekst kafelka 1 aktualizuje się. ✓ |
| Logo alt (1) | → „Logo Mojej Firmy" | po dodaniu linku staje się `aria-label` kafelka-`<a>` (oraz `alt` obrazu). ✓ |
| Logo destination (1) | → HomePage | kafelek 1 staje się `<a href="/homepage">`. ✓ |
| Move down (logo 1) | reorder | kolejność w canvas zmienia się natychmiast (Logo1 ↔ Logo2). ✓ |
| Remove (logo 1) | usunięcie | **nie ma** dialogu blokującego; pojawia się notka „North Labs removed. Undo is available." (Undo/Dismiss). ✓ |
| Undo | przywrócenie | logo wraca na **pierwotną pozycję** (index 0). ✓ |
| Add logo | dodanie | `count` 3→4, nowy „Logo 4" na końcu. ✓ |
| Browse media (logo 1) | wybór `cos1.png` | kafelek → `<img src=…/media/…png>` z `alt` z mediów, klasy `h-10 grayscale group-hover:grayscale-0 object-contain`, `loading="lazy"`; `data-logo-cloud-has-image=true`. ✓ |
| Clear image (logo 1) | wyczyszczenie | kafelek wraca do tekstu, `has-image=false`. ✓ |
| Enable CTA | on | CTA **jeszcze się nie renderuje** (puste href) — poprawnie; pole „CTA destination" przestaje być `disabled`. ✓ |
| CTA label | → „Dołącz teraz" | wartość zapamiętana. ✓ |
| CTA destination | → HomePage | CTA renderuje się: `<a href="/homepage" data-logo-cloud-cta>Dołącz teraz</a>`. ✓ |
| CTA target | → New tab | CTA dostaje `target="_blank"` + `rel="noopener noreferrer"`. ✓ |
| Open logo links in new tab | on | linkowany kafelek dostaje `target="_blank"` + `rel="noopener noreferrer"`. ✓ |
| Grayscale | off | `data-grayscale=false`, **efektywny** `hover-color=false`; switch „Colorize on hover" staje się `disabled` z tekstem „Requires grayscale mode…". ✓ |
| Gap | → Spacious | lista dostaje `gap-6` (`data-gap=lg`). ✓ |
| Alignment | → Start | lista dostaje `justify-items-start`. ✓ |
| Tile radius | → Full | kafelek → `rounded-full`. ✓ |
| Section background | → `#123456` | `<section>` dostaje inline `background-color: rgb(18,52,86)`. ✓ |
| Tile background „Clear" | wyczyszczenie | usuwa inline `background-color` z kafelka; badge → „Theme default"; „Clear" → `disabled`; pojawia się komunikat live-region „Tile background cleared." ✓ |

**CTA — kompletność:** CTA renderuje się **wyłącznie** gdy `enabled && label && bezpieczny href` — zgodnie z tekstem pomocniczym „Only complete and safe CTA links render in the public widget." (zweryfikowane: po samym włączeniu, bez href, CTA nie pojawia się).

**Picker stron jako destynacja:** zarówno „Logo destination" jak i „CTA destination" to **selecty istniejących stron** (np. HomePage → `/homepage`), nie pola tekstowe. Tekst pomocniczy potwierdza: „Custom destinations stay read-only in Wizard and Visual modes." — czyli dowolnych/niebezpiecznych URL nie da się wpisać z Visual (to ogranicza powierzchnię błędu, ale i uniemożliwia ustawienie zewnętrznego linku z poziomu Visual).

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only i **wiernie** odzwierciedlał mój bieżący (niezapisany) stan z sesji Visual:

- **Layout summary:** „Layout: Grid", „Logos: 4 logos", „Logo height: Medium", „Spacing: Spacious" (mój gap→Spacious). ✓
- **Content summary:** „Header: Configured", „Logo images: No logo images selected yet" (po Clear image), „Logo destinations: 1 logo link opens in new tabs" (logo 1 + new-tab), „Section CTA: Visible, opens in a new tab". ✓
- **Presentation summary:** „Alignment: Start", „Header style: Start / Large", „Strip behavior: Single row scroll / Static", „Tile shape: Full corners, Standard border", „Logo filter: Grayscale with color on hover", „Colors: Section: Selected swatch, tile: Theme default, border: Saved custom color". ✓
- **Authoring boundaries:** statyczne komunikaty „Daily editing → Visual", „Starter setup → Wizard tylko przez Run setup again". ✓

> Advanced to **żywe lustro stanu roboczego w pamięci**, nie stanu zapisanego — odzwierciedlał moje niezapisane edycje z Visual.

### 4.4 Frontend (public)

Trasa `/test-logo-cloud-0516` zwraca **HTTP 200** i renderuje **zapisany (opublikowany) stan fixture**, który różni się od domyślnego widgetu i od stanu draftu w adminie (patrz N5):

- `variant=grid`, `count=6`, gap/height/align = wartości domyślne; siatka `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`.
- Tytuł `<h2>` „Trusted by teams worldwide" + opis (domyślny). Eyebrow pusty.
- **Wszystkie 6 kafelków to `<a href="#">`** (zapisany stan: logotypy podlinkowane do hash). `rel=null`, `target=null` (`openLinksInNewTab=false`, hash → bez nowej karty — poprawnie).
- **Logo 1 ma realny obraz** (`<img src="https://upload.wikimedia.org/.../Amazon_logo.svg/...png">`, `alt="Acme"` — fallback z `name`, brak `alt`), klasy `h-10 grayscale group-hover:grayscale-0 object-contain`, `loading="lazy"`. Potwierdza, że zewnętrzne obrazy http(s) renderują się.
- Logotypy 2–6 jako tekst (North Labs, BlueRiver, Orbit, Pixel Forge, Stonegrid).
- **Semantyka/ARIA:** `<section aria-labelledby>` wskazuje dokładnie na `id` nagłówka `<h2>` (zweryfikowane `match=true`). CTA brak (`enabled=false` w zapisie). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność (375 px):** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka schodzi do **2 kolumn** (`grid-cols-2`), brak ukrytych elementów. ✓

### 4.5 Admin canvas (podgląd)

Główny canvas renderuje żywy `LogoCloudBlock` z tymi samymi atrybutami `data-logo-cloud-*`, co front, i aktualizuje się na żywo po każdej edycji Visual/Wizard. **Przy wejściu na stronę canvas renderował czystą konfigurację domyślną** widgetu (6 kafelków-tekst, `<div>`, bez obrazów i bez linków) — co różni się od stanu opublikowanego na froncie (patrz N5).

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Domyślne kolory motywu etykietowane jako „Saved custom color"** | Visual / kolory + Advanced | Domyślne `tileBackground = var(--color-bg)` oraz `tileBorderColor = color-mix(in srgb, var(--color-border) 60%, transparent)` to wartości niepuste i nie-hex, więc `describeLogoCloudColor()` zwraca **„Saved custom color"**, a kontrolka pokazuje tekst „A saved custom color is configured. Pick a swatch to replace it, or clear the field." oraz **aktywny** „Clear" — mimo że autor niczego nie ustawił (to czysty default motywu, wstrzyknięty jako inline `style` na kafelku). Mylące: sugeruje istnienie zapisanego niestandardowego koloru, którego nie ma. Potwierdzone też w Advanced („border: Saved custom color"). Analogiczne do N3 z `feature-grid` i `describeColor` z `contact`. |
| **N2 — Redukcja „Logo count" po cichu obcina logotypy (asymetria względem Remove)** | Visual / struktura | Zmniejszenie liczby przez select „Logo count" (np. 8 → 3) **bez żadnego potwierdzenia** usuwa nadmiarowe logotypy (truncacja od końca). Tymczasem usunięcie pojedynczego logo przyciskiem „Remove" jest **miękkie** — pokazuje notkę z „Undo". Ten sam destrukcyjny efekt (utrata logotypów) jest raz odwracalny (Remove→Undo), a raz cichy i nieodwracalny w UI (redukcja count). Niespójna ochrona przed utratą danych. |
| **N3 — Kontrolka „Strip row behavior" pokazuje wartość zapisaną, nie efektywną** | Visual / Strip | Przy włączonym Marquee select „Strip row behavior" wyświetla nadal „Wrapped rows" (wartość przechowywana w `style.rowMode`), choć render jest wymuszony na single-row (kontrolka `disabled` + tekst „Marquee always uses a single horizontal track, so row behavior stays locked."). Dodatkowo w Advanced wiersz „Strip behavior" pokazuje zapisany `rowMode` (np. „Single row scroll") **nawet gdy wariant to Grid**, gdzie nie ma on żadnego efektu. Advanced/kontrolka prezentują stan **zapisany**, nie **efektywny** — drobna pułapka interpretacyjna. |
| **N4 — Rozjazd: draft w adminie (defaulty) vs opublikowany front (bogatsza konfiguracja)** | Dane / publish | Przy wejściu główny canvas adminowego draftu renderował **czysty widget domyślny** (6 kafelków-tekst, `<div>`, bez obrazów, bez linków), natomiast publiczna trasa serwuje **inną, zapisaną konfigurację** (logo 1 z zewnętrznym obrazem Amazon, wszystkie 6 logotypów jako `<a href="#">`). Nie ustaliłem przyczyny (normalna separacja draft/publish vs niespójny seeding fixture) i **nie zapisywałem/publikowałem**, by tego rozstrzygnąć — odnotowuję jako fakt do dalszej weryfikacji. Pozytyw: niezapisane edycje z Visual nie wyciekły na front. |
| **N5 — Ostrzeżenie a11y z modala Media Library (poza widgetem)** | Shared MediaPicker | Po otwarciu „Browse media" w konsoli pojawia się React-warning: „Missing `Description` or `aria-describedby={undefined}` for {DialogContent}". To dotyczy **współdzielonego** komponentu MediaPicker (Radix Dialog), nie renderera logo-cloud. Sam widget nie generuje żadnych błędów/ostrzeżeń (front 0/0). Odnotowane, bo wpojawia się w przepływie autorskim tego widgetu. |
| **N6 — `alt` logo nie ma efektu dla kafelków tekstowych** | Renderer (zachowanie z założenia) | Pole „Accessible description" (`alt`) wpływa na `alt` obrazu oraz `aria-label` linkowanego kafelka, ale dla logo **bez obrazu i bez linku** (czysty tekst w `<div>`) nie jest renderowane nigdzie. To zachowanie wynikające z modelu (tekstowy `name` jest sam w sobie treścią), ale autor wpisujący „Accessible description" przy logo tekstowym bez linku nie zobaczy żadnego efektu — potencjalnie mylące. |

**Nie wykryto** żadnego twardego buga renderowania ani błędu konsoli na froncie. Wszystkie przetestowane kontrolki Visual aktualizują podgląd na żywo; Wizard i Advanced są poprawnie read-only i wiernie podsumowują stan; frontend jest responsywny (375 px bez overflow), bez błędów konsoli i poprawny semantycznie (z działającym `aria-labelledby`).

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-logo-cloud-0516`) | Zgodność |
|--------|----------------------|-------------------------------------|----------|
| Renderer | żywy `LogoCloudBlock`, atrybuty `data-logo-cloud-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo po edycji | tak (canvas + Wizard Live preview) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu: **defaulty** (tekst, `<div>`, bez obrazów/linków) | **opublikowana** konfiguracja (logo 1 z obrazem, 6× `<a href="#">`) | ⚠ rozjazd (N4) |
| Linki logo (safe href, rel) | te same reguły (`resolveWidgetLinkAttrs`) | hash `#` → `rel=null`, `target=null` (poprawnie) | ✓ |
| Obraz logo (http zewnętrzny) | renderuje się po wyborze z Media Library | renderuje się (`<img>` Amazon) | ✓ |
| Semantyka (`section`/`h2`, ikona aria) | obecna; `aria-labelledby`↔`h2` | obecna; `aria-labelledby`↔`h2` (`match=true`) | ✓ |
| `aria-label`/`aria-labelledby` na `<section>` | obecne | obecne | ✓ (lepiej niż contact/feature-grid) |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |
| Konsola | 1 warning (modal Media — N5) | 0/0 | ✓ (widget czysty) |
| Responsywność 375 px | n/d (testowane na froncie) | 2 kolumny, brak overflow | ✓ |

**Wniosek:** renderer jest wspólny i spójny. Jedyny istotny rozjazd to N4 (draft=defaulty vs opublikowany front), którego źródła nie rozstrzygałem bez zapisu/publikacji. Pozostałe różnice są celowe (izolacja niezapisanych zmian).

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save"/„Publish", aby nie modyfikować współdzielonego fixture. W konsekwencji:
  - trwałość moich edycji po przeładowaniu **nie** została zweryfikowana (potwierdziłem tylko trwałość w obrębie sesji edytora — Advanced wiernie podsumował edycje z Visual);
  - nie rozstrzygnąłem rozjazdu N4 (czy zapis draftu nadpisałby stan opublikowany).
  - Frontend otworzyłem w **nowej karcie**, aby zachować stan edytora — nie wywoływałem `beforeunload`.
- **Drag-and-drop logotypów (uchwyt „Drag"):** reorder testowałem przyciskami „Move up/down"; natywnego drag&drop uchwytem nie wykonywałem.
- **Limit 24 logotypów:** doszedłem do 8 przez „Logo count"; nie sprawdzałem zachowania przy 24 ani `disabled` na „Add logo" przy limicie.
- **Walidacja niebezpiecznych URL (`getLogoCloudLinkFeedback` / `getLogoCloudImageFeedback`):** w Visual „Logo destination" i „CTA destination" to **pickery stron** (brak wolnego pola tekstowego), a obraz wybiera się przez MediaPicker — dlatego ścieżki feedbacku ostrzegającego o niebezpiecznym/nieprawidłowym URL uruchamiają się tylko dla wartości **wcześniej zapisanych w JSON**, niemożliwych do wpisania z Visual. Nie udało się ich więc wywołać przez UI.
- **Pojedyncze pozostałe wartości selectów:** przetestowałem reprezentatywne wartości; **nie** klikałem osobno każdej opcji dla: Header description (textarea — ten sam mechanizm `updateHeader`), Logo height jako select (efekt `h-10`/`md` potwierdziłem przez obraz), Tile border width, Gap `none`/`compact`, Alignment `end`/`center` (po Start), Header align `center`/`end`, Tile radius `sm`/`md`/`xl`. Wszystkie używają identycznego mechanizmu `updateStyle`/Radix-Select, zweryfikowanego na wielu innych polach.
- **`prefers-reduced-motion` dla Marquee:** tekst pomocniczy i CSS deklarują „reduced-motion-safe" track, ale nie testowałem zachowania przy włączonej redukcji ruchu.
- **Realna nawigacja po kliknięciu linku logo na froncie:** linki to `#`; nie klikałem ich (sprawdziłem tylko atrybuty `href`/`rel`/`target`).
- **Wybór obrazu z `alt`/`name` z mediów + ich nadpisywanie:** wybrałem asset z gotowym `alt`; nie testowałem ścieżki, gdzie autor ręcznie nadpisuje `alt`/`name` przed/po wyborze mediów.

---

## 8. Podsumowanie

- Widget **logo-cloud jest w bardzo dobrym stanie funkcjonalnym**. Wszystkie realnie przetestowane kontrolki Visual (wariant Grid/Strip/Dense, tryby Strip: row behavior + motion/marquee, liczba logo, copy nagłówka, nazwa/alt/destynacja logo, reorder, Remove+Undo, Add, wybór i czyszczenie obrazu z Media Library, CTA enable/label/destination/target, open-links-new-tab, grayscale + zależny hover, gap, alignment, tile radius, kolory + Clear) **działają i aktualizują podgląd na żywo**. Marquee realnie duplikuje logotypy i uruchamia animację CSS (`logo-cloud-marquee`, 24s) oraz poprawnie blokuje powiązane kontrolki. Wizard i Advanced są poprawnie read-only — Wizard podsumowuje + ma Live preview, Advanced wiernie odzwierciedla stan roboczy.
- **Frontend** zwraca 200, renderuje się bez błędów konsoli (0/0), jest responsywny (375 px bez overflow), poprawny semantycznie z **działającym `aria-labelledby`** (lepsza dostępność sekcji niż w `contact`/`feature-grid`), a linki logotypów mają bezpieczne `rel`/`target`. Zewnętrzny obraz logo renderuje się poprawnie.
- **Najważniejsze niuanse (nie twarde bugi):**
  - N1 — domyślne kolory motywu opisane jako „Saved custom color" (mylące, dotyczy Visual i Advanced);
  - N2 — redukcja „Logo count" po cichu obcina logotypy, podczas gdy „Remove" jest odwracalne (asymetryczna ochrona danych);
  - N3 — „Strip row behavior" i Advanced pokazują wartość zapisaną, nie efektywną;
  - N4 — rozjazd draft (defaulty) vs opublikowany front (bogatsza konfiguracja) — nie rozstrzygnięty bez zapisu;
  - N5 — ostrzeżenie a11y pochodzące z modala Media Library (współdzielony komponent, nie widget);
  - N6 — `alt` bez efektu dla logo tekstowych bez linku.
- **Plusy względem innych widgetów:** semantyczna nazwa sekcji (`aria-labelledby`/fallback `aria-label`), miękkie usuwanie z „Undo" zamiast twardego dialogu, działające „Clear" dla wszystkich trzech pól kolorów (z komunikatem live-region), bezpieczne linki (`rel="noopener noreferrer"` dla nowej karty), deterministyczna liczba logo sterowana danymi (brak rozjazdu „slot vs render").

---

## 9. Screenshoty (lokalne etykiety)

> Poniższa nazwa to **wyłącznie lokalna etykieta** przechwycenia Playwright. Plik
> nie jest wymaganym evidence i **został usunięty** z drzewa roboczego po
> przechwyceniu. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM.

| Plik (lokalny, nietrwały) | Opis |
|---------------------------|------|
| `logo-cloud-frontend-published.png` | Publiczna trasa `/test-logo-cloud-0516` (1280 px) — opublikowany stan fixture (logo 1 z obrazem, 6× `<a href="#">`) |
