# RAPORT: Feature Grid Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-feature-grid` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/a06fb6e2-3b58-44c5-87e9-32125f572461` (strona „Contract Test - feature-grid", status `Draft`)
> **Fixture public:** http://localhost:3000/featuregridtest
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/featureGrid.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-feature-grid-*`, klasy Tailwind, inline
> `style`, ARIA), a nie tylko zliczeniem widocznych sekcji. Sekcje 4–7 jasno
> oddzielają: co działa, co nie działa / jest mylące, co faktycznie przetestowano
> oraz czego NIE testowano.

> Uwaga o screenshotach: ewentualne pliki PNG (sekcja 9) są **wyłącznie lokalnymi
> etykietami** przechwyceń Playwright w katalogu `.playwright-cli/` (ignorowanym
> przez Git). Nie są wymaganym evidence i nie zostały dołączone do żadnego pliku
> źródłowego. Główna weryfikacja opierała się o inspekcję DOM, nie o zrzuty.

---

## 1. Przegląd widgetu

**Typ:** `feature-grid` · **Kategoria:** `content` · **Opis:** „Card grid for value propositions and product highlights."

**Warianty:**

| Wariant | Domyślna liczba kart | Kolumny | Charakterystyka |
|---------|----------------------|---------|-----------------|
| `cards-3` (domyślny) | 3 | 3 (`sm:grid-cols-2 lg:grid-cols-3`) | Trzy zrównoważone karty, zwięzły przekaz |
| `cards-4` | 4 | 4 (`sm:grid-cols-2 lg:grid-cols-4`) | Cztery karty, szersze pokrycie wartości |
| `highlight-first` | 4 | **zablokowane na 3** (`md:grid-cols-3`) | Pierwsza karta wyróżniona (`md:col-span-2`, `loading="eager"`) |

**Model danych (`FeatureGridData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `eyebrow`, `title`, `description` |
| **items[]** | `id`, `icon`, `image`, `imageAlt`, `title`, `description`, `descriptionMode` (`plain`/`rich`), `ctaEnabled`, `ctaLabel`, `ctaHref`, `ctaTarget` (`same-tab`/`new-tab`) |
| **style** | `columns` (2/3/4), `gap` (none/sm/md/lg), `surfaceColor` (clearable), `sectionBackground` (clearable), `borderColor` (clearable), `borderWidth` (0/1/2/3), `radius` (none/md/lg/xl), `textAlign` (left/center/right), `cardPadding` (compact/default/spacious), `mediaSize` (sm/md/lg), `cardLayout` (vertical/horizontal), `maxWidth` (5xl/6xl/7xl/full), `headerSize` (sm/md/lg), `cardTitleSize` (sm/md/lg), `hoverEffect` (none/lift/border) |

**Ograniczenia:** min 1 / max 8 kart (`featureGridItemMin=1`, `featureGridItemMax=8`). W przeciwieństwie do widgetów slotowych (accordion/tabs) liczba renderowanych kart jest sterowana **długością tablicy `items` w danych**, a nie liczbą slotów — dlatego kontrolka „Cards count" realnie zmienia render (patrz 4.2).

**Renderowanie:** `<section>` (`mx-auto w-full px-4 py-8` + klasa `max-w-*`) z opcjonalnym wyśrodkowanym `<header>` (eyebrow `<p>`, tytuł `<h3>`, opis `<p>`) i siatką `article`-kart. Medium karty: **obraz > ikona > pasek-placeholder** (jeśli ustawiony obraz i ikona — wygrywa obraz). Opis: tryb `plain` → `<p>`, tryb `rich` → sanitizowany HTML (`sanitizeRichTextHtml`). CTA: `<a>` z bezpiecznym href (`resolveWidgetLinkAttrs`, dozwolone relative/hash/http).

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje komunikat *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w widgetach `tabs` i `accordion`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Sekcja „Starter setup": select „Feature grid style" (wariant) + read-only wiersz „Cards count" + tekst informacyjny. Dodatkowo własny panel „Live preview" renderujący widget przez współdzielony renderer. |
| **Visual** | zakładka „Visual" | 6 sekcji widgetowych (patrz niżej) + współdzielone sekcje wrappera: „Block layout" i „Device visibility". Łącznie **8 widocznych regionów** (zgodne ze smoke 27-05: „visible sections 8"). |
| **Advanced** | zakładka „Advanced" | 4 read-only sekcje podsumowań: „Layout summary", „Content summary", „Presentation summary", „Authoring boundaries" + współdzielone „Block layout summary" i „Visibility summary". **Brak jakichkolwiek edytowalnych kontrolek.** |

**6 sekcji Visual:** (1) „Variant and layout structure" — karty wariantu, Columns, Card gap, Cards count; (2) „Header copy" — Eyebrow, Title, Description; (3) „Feature cards and actions" — per-karta: Title, Description (Plain/Rich), Icon, Feature image (MediaPicker + alt), CTA (toggle/label/destination/target), Move up/down, Drag, Remove + przycisk „Add card"; (4) „Card layout and density" — Card layout, Text align, Card padding, Media size; (5) „Colors and borders" — Card background, Card border color, Border width, Corner radius; (6) „Section typography and container" — Section background, Container width, Header size, Card title size, Hover effect.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonano w sesji `claude-28-05-feature-grid` i zweryfikowano inspekcją DOM:

- **Wizard:** zmiana „Feature grid style" Cards 3 → Cards 4 → Highlight First → powrót Cards 3 (weryfikacja: read-only „Cards count", realny render w głównym canvas oraz w „Live preview"); „Finish setup and open Visual".
- **Visual / struktura:** Card gap → Spacious; Columns → 2; Cards count → 5 i z powrotem → 3 (sprawdzenie realnej liczby renderowanych kart i zachowania przy redukcji).
- **Visual / Header copy:** Eyebrow → „FUNKCJE", Title → „Nasze najważniejsze funkcje".
- **Visual / karty:** Title karty 1 → „Szybkie wdrożenie"; Icon (pole tekstowe) → „🎯"; szybkie przyciski emoji (próba kliknięcia myszą — patrz N1); Description mode Plain → Rich → Plain; CTA toggle off/on; CTA target → New tab; Move down (reorder); Add card (3→4); Remove + dialog potwierdzenia → 3.
- **Visual / Card layout and density:** Card layout → Horizontal; Text align → Center; Card padding → Spacious; Media size → Large.
- **Visual / Colors and borders:** Card background → `#ff0000`/`#00ff00` + przycisk „Clear"; Border width → 3px; Corner radius → None.
- **Visual / Section typography:** Section background → `#123456`; Container width → Full; Header size → Large; Hover effect → Lift.
- **Advanced:** odczyt wszystkich 4 sekcji podsumowań i porównanie z edycjami z Visual.
- **Frontend (public):** status HTTP, render zapisanego stanu, atrybuty kart/linków, semantyka/ARIA, konsola, responsywność 375 px, brak wycieku niezapisanych edycji.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Select „Feature grid style"** — zmiana wariantu działa dla wszystkich trzech opcji i **synchronicznie aktualizuje liczbę kart i kolumny** zarówno w głównym canvas, jak i w „Live preview":
  - Cards 4 → `data-feature-grid-variant=cards-4`, `columns=4`, `count=4` (oba rendery).
  - Highlight First → `variant=highlight-first`, `columns=3` (zablokowane), `count=4`, pierwsza karta `data-feature-grid-highlighted="true"`.
  - powrót Cards 3 → `variant=cards-3`, `count=3`.
- **Read-only wiersz „Cards count"** poprawnie odzwierciedla stan („4 cards" / „3 cards").
- **„Finish setup and open Visual"** wraca do zakładki Visual i przywraca komunikat „Setup complete". ✓
- **Live preview** renderuje widget przez współdzielony renderer i pozostaje w pełnej zgodzie z głównym canvas (oba rendery aktualizują się jednocześnie).

> W odróżnieniu od `accordion`/`tabs` nie zaobserwowano rozjazdu „kontrolka liczby vs realny render" — bo feature-grid liczy karty z tablicy `items`, a nie ze slotów.

### 4.2 Visual

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Card gap | → Spacious | `data-feature-grid-gap=lg`; siatka dostaje `gap-7`. ✓ |
| Columns | → 2 | `data-feature-grid-columns=2`; siatka → `sm:grid-cols-2` (znika `lg:grid-cols-3`). ✓ |
| Cards count | → 5 | `count=5`, **realnie 5 kart** (nowe karty z tytułami fallback: „Content workflows", „Feature 5"). ✓ |
| Cards count | → 3 (redukcja) | `count=3`, treść 3 pierwszych kart zachowana. Brak dialogu potwierdzenia (patrz N2). ✓ (truncacja działa) |
| Eyebrow | → „FUNKCJE" | `header > p` aktualizuje się natychmiast. ✓ |
| Title | → „Nasze najważniejsze funkcje" | `header > h3` aktualizuje się natychmiast. ✓ |
| Card title (karta 1) | → „Szybkie wdrożenie" | `article h4` aktualizuje się. ✓ |
| Icon — pole tekstowe (karta 1) | → „🎯" | `span[aria-hidden]` w karcie aktualizuje się. ✓ |
| Description mode (karta 1) | Plain → Rich | montuje się edytor rich-text (`contenteditable`); powrót do Plain przywraca `<textarea>`. ✓ |
| CTA toggle (karta 1) | off | link CTA znika z canvas; pola „CTA label"/„CTA destination"/„CTA target" stają się `disabled`; pojawia się tekst „CTA copy and URL stay stored while the action is disabled."; on → CTA wraca. ✓ |
| CTA target (karta 1) | → New tab | link dostaje `target="_blank"` + `rel="noopener noreferrer"`. ✓ |
| Move down (karta 1) | reorder | kolejność w canvas zmienia się natychmiast (Card 1 ↔ Card 2). ✓ |
| Add card | dodanie | `count` 3→4, nowa karta „Feature 4" na końcu. ✓ |
| Remove (ostatnia karta) | usunięcie | otwiera `ConfirmActionDialog` („Remove Feature 4? This cannot be undone."); po „Remove" → `count=3`. ✓ |
| Card layout | → Horizontal | karta → `flex-col sm:flex-row sm:items-start` (zamiast `flex-col`). ✓ |
| Text align | → Center | kontener treści → `items-center text-center`. ✓ |
| Card padding | → Spacious | karta → `p-6`. ✓ |
| Media size | → Large | `span` ikony → `h-12 w-12 text-xl`. ✓ |
| Card background | → `#ff0000`/`#00ff00` | karta dostaje inline `background-color: rgb(...)`; badge → „Selected color". ✓ |
| Card background „Clear" | wyczyszczenie | usuwa inline `background-color`; badge → „Theme default"; przycisk wraca do stanu `disabled`. ✓ |
| Border width | → 3px | karta → inline `border-width: 3px`. ✓ |
| Corner radius | → None | karta traci wszelkie klasy `rounded-*`. ✓ |
| Section background | → `#123456` | element `<section>` dostaje inline `background-color: rgb(18,52,86)` (celuje w sekcję, nie kartę). ✓ |
| Container width | → Full | `<section>` → `max-w-none` (z `max-w-6xl`). ✓ |
| Header size | → Large | `header h3` → `text-3xl`. ✓ |
| Hover effect | → Lift | karty dostają `hover:-translate-y-1` (+ `motion-reduce:transform-none`, `hover:shadow-md`). ✓ |

**Spójność „Clear" w kolorach:** zarówno „Card background", jak i „Card border color" mają działający przycisk „Clear" (a także „Section background"). To **lepiej** niż w widgecie `contact`, gdzie `borderColor` nie miał „Clear" (U2 z raportu Contact). Przycisk „Clear" jest poprawnie `disabled`, gdy pole jest puste (np. domyślnie nieustawione „Section background").

**Highlight First — blokada kolumn:** dla wariantu `highlight-first` select „Columns" jest poprawnie `disabled` i pokazuje tekst pomocniczy „Highlight First uses a fixed spotlight layout, so columns stay locked…". Działa zgodnie z intencją.

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only i **wiernie** odzwierciedla mój bieżący (niezapisany) stan z sesji Visual:

- **Layout summary:** „Layout: Cards 3", „Cards: 3 cards", „Desktop rhythm: 2 column layout" (mój override kolumn), „Card spacing: Spacious". ✓
- **Content summary:** „Header: Configured", „Media: 3 cards use icon fallbacks." (brak obrazów, same ikony), „Card actions: 3 card actions enabled." ✓
- **Presentation summary:** „Card layout: Horizontal", „Density: Spacious", „Card background: Theme default" (po „Clear"), „Border: 3px border, None corners, Saved custom color", „Section background: Selected swatch" (mój `#123456`). ✓
- **Authoring boundaries:** statyczne komunikaty o tym, że daily editing żyje w Visual, a Wizard tylko w „Run setup again". ✓

Dodatkowo widoczne współdzielone sekcje wrappera: „Block layout summary" i „Visibility summary".

> Advanced to **żywe lustro stanu roboczego w pamięci**, nie stanu zapisanego — odzwierciedlał moje niezapisane edycje z Visual.

### 4.4 Frontend (public)

Trasa `/featuregridtest` zwraca **HTTP 200** i renderuje **zapisany (opublikowany) stan fixture** — który różni się od domyślnego widgetu i od stanu draftu w adminie (patrz N5):

- `variant=cards-4`, `columns=2`, `gap=lg`, `count=3`, `max-w-6xl`, siatka `grid grid-cols-1 sm:grid-cols-2 gap-7`.
- Karty (zapisana kolejność): **„Composable widgets" (🚀, CTA „View widgets" → `http://example.com/feature1`)**, „Fast setup" (⚡, CTA „Explore setup" → `#`), „Conversion ready" (📈, CTA „See examples" → `#`).
- **Semantyka:** `<section>` → `<header>` → `<h3>` + 3× `<h4>` (tytuły kart); ikony jako `<span aria-hidden="true">`. ✓
- **Linki CTA:** zewnętrzny link `http://example.com/feature1` dostaje `rel="noopener noreferrer"` (mimo `target=null`/same-tab) — dobre zabezpieczenie; linki `#` mają `rel=null`, `target=null` (poprawnie). ✓
- **Konsola:** **0 błędów i 0 ostrzeżeń.** ✓
- **Responsywność (375 px):** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka schodzi do **jednej kolumny** (`grid-cols-1`), karty stackują się pionowo. ✓
- **Izolacja:** moje niezapisane edycje z Visual/Wizard **nie wyciekły** na front. ✓

### 4.5 Admin canvas (podgląd)

Główny canvas renderuje żywy `FeatureGridBlock` z tymi samymi atrybutami `data-feature-grid-*`, co front. Podgląd aktualizuje się na żywo po każdej edycji Visual/Wizard. Przy wejściu na stronę canvas renderował **domyślną konfigurację widgetu** (cards-3, 3 karty, domyślne copy i CTA) — patrz N5.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Szybkie przyciski emoji (ikona) zasłonięte przez MediaPicker (realny bug layoutu)** | Visual / sekcja kart | W sekcji „Feature cards and actions" pole „Icon" zawiera rząd szybkich emoji (⚡🧩📈🔒🚀✨💬🎯) w lewej kolumnie gridu `sm:grid-cols-2`, a sąsiednia prawa kolumna to blok „Feature image"/MediaPicker. Przy viewport **1280 px** precyzyjny hit-test pokazał, że środek przycisku emoji (np. 🧩, rect x≈1011–1054, y≈360) jest **zasłonięty** przez `<div>` MediaPickera („Select a single asset…", `data-widget-control="feature-grid.visual.items.0.image"`). Skutek: **realne kliknięcie myszą w przyciski emoji jest przechwytywane** przez blok obrazu (Playwright `click` przekracza timeout, `elementFromPoint` zwraca element MediaPickera, nie przycisk). Sam handler **działa** — natywne `element.click()` (synthetic) poprawnie ustawia ikonę w canvas, a **pole tekstowe „Icon" działa bez zarzutu** (wpisanie „🎯" zaktualizowało podgląd). To znaczy: logika jest poprawna, ale szybkie przyciski emoji są praktycznie nieklikalne myszą przy tej szerokości panelu — realna usterka UI (nakładanie się kolumn). Może zależeć od szerokości viewportu. |
| **N2 — Redukcja „Cards count" bez potwierdzenia** | Visual / struktura | Zmniejszenie liczby kart przez select „Cards count" (np. 5 → 3) **po cichu obcina** tablicę `items` (usuwa nadmiarowe karty) **bez żadnego dialogu potwierdzenia**, podczas gdy usunięcie pojedynczej karty przyciskiem „Remove" pokazuje `ConfirmActionDialog`. Niespójność: ten sam destrukcyjny efekt (utrata kart) jest raz chroniony potwierdzeniem, raz nie. |
| **N3 — Domyślne kolory z motywu etykietowane jako „Saved custom color"** | Visual / kolory | Domyślne wartości `surfaceColor=var(--color-bg)` i `borderColor=var(--color-border)` są wartościami CSS-variable (nie pustymi i nie hex), więc kontrolka koloru pokazuje badge **„Saved custom color"** oraz tekst pomocniczy **„A saved custom color is configured. Pick a swatch to replace it, or clear the field."** — mimo że użytkownik **niczego nie ustawił**, to czysty default motywu. Dodatkowo przycisk „Clear" jest dla tych defaultów aktywny. Mylące: sugeruje istnienie „zapisanego niestandardowego koloru", którego nie ma. (Analogiczne do `describeColor` z widgetu `contact`.) |
| **N4 — Niespójne nazewnictwo etykiet koloru: „Selected color" vs „Selected swatch"** | Visual ↔ Advanced | Dla wartości hex badge w Visual (`SharedColorControl`) pokazuje **„Selected color"**, natomiast podsumowanie w Advanced dla tej samej wartości hex pokazuje **„Selected swatch"**. Dwie różne etykiety dla tego samego stanu — drobna niespójność copy. |
| **N5 — Rozjazd: draft w adminie (defaulty) vs opublikowany front (bogata konfiguracja)** | Dane / publish | Przy wejściu główny canvas adminowego draftu renderował **domyślny widget** (cards-3, 3 karty, domyślne copy/CTA, domyślna kolejność), natomiast publiczna trasa serwuje **inną, zapisaną konfigurację** (cards-4, 2 kolumny, gap lg, przestawione karty, CTA karty 1 → `http://example.com/feature1`). Nie ustaliłem przyczyny (normalna separacja draft/publish vs niespójny seeding fixture) i **nie zapisywałem/publikowałem**, by tego rozstrzygnąć — odnotowuję jako fakt do dalszej weryfikacji. Pozytyw: niezapisane edycje nie wyciekają na front (poprawna izolacja). |
| **N6 — `<section>` bez `aria-label`/`aria-labelledby`** | Renderer / a11y | Główny kontener `<section data-feature-grid-variant>` nie ma dostępnej nazwy (`aria-label=null`). Brak semantycznego opisu sekcji dla czytników ekranu (analogiczne do R1 z raportu Contact). Pozostała semantyka jest poprawna (`<header>`, `<h3>`, `<h4>`, ikona `aria-hidden`). |
| **N7 — Wizard ukryty za „Run setup again"** | UX nawigacji | Tryb Wizard nie jest równorzędną zakładką — dla osoby szukającej „kreatora" nie jest to oczywiste (spójne z `tabs`/`accordion`, ale warte odnotowania). |
| **N8 — „Wiszący" otwarty Radix Select blokuje edytor (obserwacja narzędziowa)** | Visual | Gdy otwarty `Select` zostanie pozostawiony bez wyboru opcji (np. przerwana interakcja), jego portal-overlay przykrywa cały panel edytora i przechwytuje kliknięcia aż do zamknięcia (Escape). W normalnym przepływie (klik trigger → klik opcja) zamyka się poprawnie; odnotowuję głównie jako artefakt testowy, ale to potencjalna pułapka przy nietypowych interakcjach. |

**Nie wykryto** żadnych błędów konsoli na froncie, żadnego twardego buga renderowania ani rozjazdu render między wspólnie testowanymi opcjami admin↔front (poza celową izolacją niezapisanych zmian). Wszystkie przetestowane kontrolki Visual aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan roboczy; frontend jest responsywny, bez błędów konsoli i poprawny semantycznie (poza N6).

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/featuregridtest`) | Zgodność |
|--------|----------------------|-------------------------------|----------|
| Renderer | żywy `FeatureGridBlock`, atrybuty `data-feature-grid-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo po edycji | tak (canvas + Wizard Live preview) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu: **defaulty**; potem: moje niezapisane edycje | **opublikowana** konfiguracja (cards-4/2/lg/przestawione) | ⚠ rozjazd (N5) |
| Linki CTA (safe href, rel) | te same reguły | `rel="noopener noreferrer"` dla zewnętrznego linku | ✓ |
| Semantyka (`header`/`h3`/`h4`, ikona aria-hidden) | obecna | obecna | ✓ |
| `aria-label` na `<section>` | brak | brak | ⚠ oba (N6) |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |
| Responsywność 375 px | n/d (testowane na froncie) | single-column, brak overflow | ✓ |

**Wniosek:** renderer jest wspólny i spójny. Jedyny istotny rozjazd to N5 (draft=defaulty vs opublikowany front), którego źródła nie rozstrzygałem bez zapisu/publikacji. Pozostałe różnice są celowe (izolacja niezapisanych zmian) lub wynikają z braku semantycznej etykiety sekcji (N6, dotyczy obu).

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie modyfikować współdzielonego fixture. W związku z tym:
  - trwałość moich edycji po przeładowaniu **nie** została zweryfikowana (potwierdziłem jedynie trwałość w obrębie sesji edytora — Advanced wiernie podsumował edycje z Visual);
  - nie rozstrzygnąłem rozjazdu N5 (czy zapis draftu nadpisałby stan opublikowany).
  - Przy próbie opuszczenia admina pojawił się natywny dialog „unsaved changes" (beforeunload) — czyli admin **ostrzega** przed utratą niezapisanych zmian (pozytyw); zaakceptowałem go, by przejść na front.
- **MediaPicker „Browse media":** nie otwierałem Biblioteki Mediów (modal) ani nie wybierałem realnego obrazu; pole „alt" obrazu istnieje, ale go nie wypełniałem. Tym samym ścieżka „image > icon" w renderze (obraz wygrywa z ikoną) nie została wykonana na żywym medium.
- **Drag-and-drop kart (uchwyt „Drag card"):** reorder testowałem przyciskami „Move up/down"; natywnego drag&drop uchwytem nie wykonywałem.
- **CTA destination (`LinkDestinationField`, picker strony):** nie zmieniałem wartości destynacji ani nie wpisywałem własnego CTA label tekstem (potwierdziłem tylko działanie toggle/target).
- **Pojedyncze pozostałe wartości selectów:** przetestowałem reprezentatywne wartości; **nie** klikałem każdej opcji osobno dla: „Card title size", „Header description" (pole), gap `none`, radius `md`/`xl`, border width `0`/`1`/`2`, media size `sm`/`md`, header size `sm`/`md`, hover effect `border`. Wszystkie używają identycznego mechanizmu `updateStyle`/select, który zweryfikowałem na wielu innych polach.
- **`borderColor` (zmiana wartości):** potwierdziłem obecność i działanie „Clear" oraz badge, ale nie ustawiałem własnego koloru obramowania (zmianę wartości + „Clear" przetestowałem realnie na „Card background" i „Section background").
- **`descriptionMode=rich` na froncie:** przełączenie Plain→Rich zweryfikowałem w edytorze (montaż edytora rich-text), ale nie renderowałem sanitizowanego HTML opisu na publicznej trasie.
- **`prefers-reduced-motion`:** klasy `motion-reduce:*` przy „Lift" są obecne, ale nie testowałem zachowania pod włączoną redukcją ruchu.
- **Realna nawigacja po kliknięciu CTA na froncie:** nie klikałem linku zewnętrznego (`example.com`), by nie opuszczać strony — sprawdziłem tylko atrybuty `href`/`rel`/`target`.
- **Limit kart (max 8):** dodałem jedną kartę (3→4); nie dochodziłem do limitu 8 ani nie weryfikowałem `disabled` na „Add card" przy 8.

---

## 8. Podsumowanie

- Widget **feature-grid jest w bardzo dobrym stanie funkcjonalnym**. Wszystkie przetestowane kontrolki Visual (wariant, kolumny, gap, liczba kart, copy nagłówka, treść kart, tryb opisu Plain/Rich, CTA toggle/target, reorder, add/remove, layout/density, kolory + Clear, border, radius, container width, header size, hover effect) **działają i aktualizują podgląd na żywo**. Tryb Wizard poprawnie synchronizuje wariant z liczbą kart i kolumnami w canvas i w Live preview. Advanced wiernie i poprawnie (read-only) podsumowuje stan roboczy. Frontend zwraca 200, jest responsywny (375 px bez overflow), bez błędów konsoli i poprawny semantycznie.
- **Najważniejszy realny bug (N1):** szybkie przyciski emoji w polu „Icon" są przy 1280 px **zasłonięte przez sąsiedni blok MediaPickera** i praktycznie nieklikalne myszą (handler i pole tekstowe „Icon" działają — to usterka layoutu/nakładania kolumn, nie logiki).
- **Niespójności UX:** redukcja „Cards count" bez potwierdzenia (N2, w przeciwieństwie do „Remove"); domyślne kolory motywu etykietowane jako „Saved custom color" (N3); „Selected color" vs „Selected swatch" między Visual a Advanced (N4).
- **Do wyjaśnienia (N5):** draft w adminie startuje z defaultów, a front serwuje bogatszą opublikowaną konfigurację — źródła nie rozstrzygałem bez zapisu/publikacji.
- **A11y (N6):** brak `aria-label` na `<section>`; reszta semantyki poprawna.
- **Plusy względem innych widgetów:** spójne, działające przyciski „Clear" dla **wszystkich trzech** pól kolorów (lepiej niż `contact`), bezpieczne linki CTA (`rel=noopener noreferrer` dla zewnętrznych, safe-href), realne sterowanie liczbą kart z poziomu danych (brak rozjazdu „slot vs render" znanego z `accordion`/`tabs`), oraz ostrzeżenie beforeunload o niezapisanych zmianach.

---

## 9. Screenshoty (lokalne etykiety)

> Poniższe nazwy to **wyłącznie lokalne etykiety** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie są wymaganym evidence i nie są dołączone do
> repo. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM, nie o zrzuty.

| Plik (lokalny) | Opis |
|----------------|------|
| `feature-grid-frontend-published.png` | Publiczna trasa `/featuregridtest` (1280 px) — opublikowany stan fixture (cards-4, 2 kolumny, gap lg, przestawione karty) |
