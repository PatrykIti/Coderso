# RAPORT: FAQ Accordion Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-faq-accordion` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/639e28ec-1203-4fbe-8273-bf3fd0bba203` (status `Draft`)
> **Fixture public:** http://localhost:3000/test-faq-accordion-0516
> **Pliki źródłowe:** `core/widgets/core/faqAccordion.tsx` (renderer + normalizacja + markdown + JSON-LD + runtime script) · `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-faq-*`, klasy Tailwind, ARIA, natywny
> stan `<details>`, inline `style`, treść `<script type="application/ld+json">`),
> a nie tylko zliczeniem widocznych sekcji. Sekcje 4–8 jasno oddzielają: co działa,
> co nie działa / jest mylące, co faktycznie przetestowano i czego NIE testowano.

> Uwaga o screenshotach: w tym audycie weryfikację oparłem **wyłącznie o inspekcję
> DOM** (eval) — nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy
> byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/`
> (ignorowany przez Git), nie są wymaganym evidence w repo.

---

## 1. Przegląd widgetu

**Typ:** `faq-accordion` · **Kategoria:** `content` · **Opis:** „Expandable list of questions and answers for objection handling."

**Warianty:** `single-column` (domyślny, pojedyncza kolumna), `two-column` (`grid-cols-1 lg:grid-cols-2` — dwie kolumny dopiero od breakpointu `lg`), `compact` (mniejszy tekst `text-sm`, wymuszone paddingi summary `px-4 py-3`).

**Model danych (`FaqAccordionData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `title`, `description` |
| **items[]** | `id`, `question` (max 180), `answer` (max 2000), `answerFormat` (`plain`/`markdown`), `icon` (max 16) |
| **options** | `allowMultipleOpen` (bool), `defaultOpenIndex` (int, min −1; −1 = wszystkie zwinięte) |
| **style** | `surface`, `border`, `divider`, `questionTextColor`, `answerTextColor`, `headerTitleColor`, `headerDescriptionColor` (7 kolorów clearable), `spacing` (none/sm/md/lg), `maxWidth` (sm/md/lg/xl/full), `headerAlign` (left/center/right), `sectionPaddingX`/`sectionPaddingY` (none/sm/md/lg), `panelRadius` (none/sm/md/lg/xl), `borderWidth` (0/1/2/3), `headerTitleSize` (auto/sm/md/lg/xl), `motion` (none/smooth) |
| **seo** | `emitFaqJsonLd` (bool) |

**Ograniczenia:** min 1 / max 12 itemów (`faqAccordionItemMin=1`, `faqAccordionItemMax=12`). **Kluczowy niuans:** liczba itemów jest sterowana danymi (tablica `items` + kontrolka „Questions count"), a NIE systemem slotów — w przeciwieństwie do widgetów `accordion`/`tabs`. Zmiana licznika realnie dodaje/ucina elementy tablicy (potwierdzone, patrz 4.2).

**Renderowanie:** każdy item to natywny `<details>` + `<summary>` (progressive enhancement bez JS), z `role="region"` na panelu treści i wzajemnym `aria-controls`/`aria-labelledby`. Tryb single-open używa natywnego atrybutu `name` na `<details>` (grupa wzajemnie wykluczająca się). Wstrzykiwany skrypt runtime (`data-coderso-faq='1'`) synchronizuje `aria-expanded` po każdym `toggle`. Przy `seo.emitFaqJsonLd=true` i istnieniu poprawnych par Q/A emitowany jest `<script type="application/ld+json">` ze schematem `FAQPage`. Odpowiedzi w trybie `markdown` są parsowane do bezpiecznego podzbioru (bold/italic/code/link/listy), a linki zewnętrzne dostają `target="_blank" rel="noopener noreferrer"`.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie widoczny jest komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `accordion` i `tabs`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Jedna sekcja „FAQ layout": karty wariantu (`VariantCards`) + select „Questions count" (1–12) + tekst pomocniczy „Use Visual to write…". **Brak osobnego Live preview** (inaczej niż w `accordion`). |
| **Visual** | zakładka „Visual" | 7 sekcji: **Variant and layout structure** (karty + count), **Header copy** (title/description), **Questions and answers** (per-item: checkbox, ↑/↓, ✕, icon, answer mode, question, answer; Add item; Delete selected; drag&drop), **Display behavior** (allow multiple open, default open item), **Layout and typography** (max width, header align, title size, padding X/Y, motion), **Colors and panel style** (palety Light/Dark/Brand, 7 pól koloru z „Clear", panel radius, border width, contrast guidance), **Search visibility** (JSON-LD switch). Dodatkowo współdzielone sekcje wrappera: Block layout, Device visibility. |
| **Advanced** | zakładka „Advanced" | 5 sekcji **w pełni read-only**: Runtime summary, Style summary, Accessibility diagnostics, Contract summary, Saved data status + współdzielone Block layout summary i Visibility summary. **Brak jakichkolwiek edytowalnych kontrolek.** |

**Istotne:** w trybie Visual istnieje **tylko JEDEN** render canvas (`renderCount=1`). Nie występuje tu kolizja dwóch jednoczesnych renderów dzielących natywną grupę `name` (problem N2 znany z raportu `accordion`). Front też jest bezpieczny (jeden render, `name` oparty na UUID bloku).

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonane w sesji `claude-28-05-faq-accordion`, zweryfikowane inspekcją DOM:

- **Public (frontend):** render początkowy, single-open (wzajemne wykluczanie), collapse-all, synchronizacja `aria-expanded` przez skrypt runtime, klawiatura (Enter na summary), kompletne ARIA (aria-controls↔content, role=region, aria-labelledby↔summary, section→h3), brak overflow na 375 px (oraz zwinięcie two-column do 1 kolumny poniżej `lg`), brak błędów/ostrzeżeń w konsoli, brak skryptu JSON-LD (fixture ma `emitFaqJsonLd=false`).
- **Wizard:** karta wariantu (single→two-column), select „Questions count" (3→2, data-driven), przycisk „Finish setup and open Visual".
- **Visual / Variant:** wszystkie 3 karty (single ↔ two-column ↔ compact) z odczytem klas grid/typografii.
- **Visual / Header copy:** edycja tytułu i opisu, oraz przypadek brzegowy „oba puste" (ukrycie `<header>` + fallback `aria-label`).
- **Visual / Questions:** edycja question/answer (live), ikona (renderuje się przed pytaniem), answer mode → Markdown (bold/italic/lista/link/code), Questions count (3→5→3, data-driven), Add item, Remove item (dialog potwierdzenia), bulk select + Delete selected (dialog), guard „nie usuwaj wszystkich", guard „min 1", Move up/Move down.
- **Visual / Display behavior:** Allow multiple items open (usuwa `name`, dwa panele otwarte naraz), Default open item → „None (all collapsed)" oraz konkretny item.
- **Visual / Layout and typography:** Max width (Narrow→`max-w-3xl`), Header alignment (Left), Header title size (Extra large→`text-3xl`), Horizontal padding (Roomy→`px-6`), Vertical padding (None→`py-0`), Motion (Smooth→rotacja chevrona + animowany wrapper `grid-rows`).
- **Visual / Colors:** paleta Dark (zapis 7 jawnych kolorów do canvas), „Clear" na Panel surface (powrót do braku tła), bezpośrednia zmiana koloru pickerem (`#ff0000`), Panel radius (Square→brak `rounded`), Border width (3 px→`borderWidth: 3px`).
- **Visual / Search visibility:** włączenie JSON-LD (wstrzyknięcie `FAQPage` z 3 pytaniami), spłaszczenie markdown do plain text w JSON-LD.
- **Advanced:** odczyt wszystkich 5 sekcji read-only i porównanie z edycjami z Visual.
- **Admin↔front:** brak bindowania skryptu runtime w canvas adminowym (desync `aria-expanded` po ręcznym toggle), izolacja niezapisanych edycji (front pokazuje stan zapisany), guard `beforeunload` przy opuszczaniu strony z niezapisanymi zmianami.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Karta wariantu** — klik „Two Column" natychmiast zmienia `data-faq-variant` w canvas (`single-column`→`two-column`). Ścieżka `variant` współdzielona z Visual. ✓
- **Select „Questions count"** — ustawienie 2 realnie renderuje 2 itemy w canvas (`data-faq-count="2"`, 2× `[data-faq-item]`). **Data-driven, nie sloty.** ✓
- **„Finish setup and open Visual"** — poprawnie wraca do zakładki Visual (`aria-selected=true` na „Visual"). ✓
- Tekst pomocniczy jasno komunikuje podział ról (Wizard = seed, Visual = codzienna edycja).

### 4.2 Visual — kontrolki i efekt w canvas (zweryfikowane w DOM)

| Kontrolka | Test | Efekt w canvas |
|-----------|------|----------------|
| Karty wariantu | single / two-column / compact | `data-faq-variant` + klasa listy: two-column→`grid-cols-1 lg:grid-cols-2`; compact→`text-sm` summary + wymuszone `px-4 py-3`. ✓ |
| Header title | „Najczęstsze pytania" | `<h3>` aktualizuje się live; `id` h3 == `aria-labelledby` sekcji. ✓ |
| Header description | edycja | `<p>` opisu aktualizuje się live. ✓ |
| Header **pusty** (title+desc) | wyczyszczenie obu | `<header>` znika, sekcja przechodzi na `aria-label="Frequently asked questions"`, `aria-labelledby` usuwane. ✓ |
| Question / Answer | edycja item 1 | tekst summary i panelu treści (`role=region`) aktualizuje się live. ✓ |
| Icon | „🚀" | ikona renderowana jako `<span aria-hidden="true">` przed pytaniem. ✓ |
| Answer mode → Markdown | bold/italic/lista/link/code | render: `<strong>`, `<em>`, `<ul><li>`, `<a target="_blank" rel="noopener noreferrer">`, `<code>`. ✓ (bezpieczny podzbiór) |
| Questions count | 3→5→3 | data-driven; przy 5 dochodzą fallbackowe pytania („Can I reuse this on multiple pages?", „Question 5"); redukcja ucina tablicę. ✓ |
| Add item | +1 | `data-faq-count` rośnie, nowy „Question N". ✓ |
| Remove item (✕) | dialog „Remove FAQ item?" | po potwierdzeniu item znika; **guard min 1** (przycisk ✕ disabled przy 1 itemie). ✓ |
| Delete selected (bulk) | dialog z listą | usuwa zaznaczone; **guard „nie usuwaj wszystkich"** (przycisk disabled, gdy zaznaczono komplet); min-1 zachowany. ✓ |
| Move up / Move down | reorder | kolejność zmienia się w edytorze i canvas jednocześnie. ✓ |
| Allow multiple items open | on | `data-faq-multiple-open=true`, atrybut `name` znika ze wszystkich `<details>` → potwierdzone otwarcie 2 paneli naraz. ✓ |
| Default open item → None | „None (all collapsed)" | `data-faq-default-open="-1"`, wszystkie zwinięte. ✓ |
| Default open item → konkretny | „Item 2" | `data-faq-default-open="1"`, otwarty item 2. ✓ |
| Max width | Narrow | root `max-w-3xl` (z `max-w-6xl`). ✓ |
| Header alignment | Left | header `mr-auto text-left` (z `mx-auto text-center`). ✓ |
| Header title size | Extra large | `<h3>` → `text-3xl`. ✓ |
| Horizontal padding | Roomy | root `px-6` (z `px-4`). ✓ |
| Vertical padding | None | root `py-0` (z `py-8`). ✓ |
| Motion | Smooth | `data-faq-motion=smooth`, chevron `group-open:rotate-180`, panel owinięty animowanym wrapperem `grid-rows-[0fr]→group-open:grid-rows-[1fr]`. ✓ |
| Paleta Dark | klik | 7 kolorów zapisanych do canvas: panel `bg rgb(15,23,42)`, border `rgb(51,65,85)`, question `rgb(248,250,252)`; pickery pokazują hexy palety. ✓ |
| Clear (Panel surface) | po palecie | usuwa inline `background-color` (panel staje się przezroczysty), picker wraca do `#ffffff`, badge „Theme default". ✓ |
| Picker koloru (bezpośrednio) | `#ff0000` | panel `background-color: rgb(255,0,0)`. ✓ |
| Panel radius | Square | brak klasy `rounded-*` (`panelRadiusClassMap.none=""`). ✓ |
| Border width | 3 px | inline `border-width: 3px`. ✓ |
| Search visibility (JSON-LD) | on | wstrzyknięty `<script type="application/ld+json">` typu `FAQPage`, `mainEntity` = 3 pytania; treść markdown spłaszczona do plain text (`**pogrubiona**`→`pogrubiona`, link bez URL). ✓ |

**Spójność „Clear" w kolorach:** wszystkie **7 pól** (Panel surface, Panel border, Divider, Question text, Answer text, Header title, Header description) mają działający przycisk „Clear" (poprawnie disabled, gdy wartość == theme default; aktywny po ustawieniu własnego koloru lub palety). To spójniejsze niż w `tabs`/`contact`.

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only i **wiernie** odzwierciedlał stan z mojej sesji edycji w Visual:

- **Runtime summary:** „Allow multiple items open: Disabled", „Default open item: Item 2: Question 2", „Questions: 3/12", „Answer formats: Markdown, Plain text", „Search enhancement: Enabled". ✓
- **Style summary:** wszystkie 7 kolorów = „Selected color" (po palecie Dark + picker), „Layout: Narrow · Left · Default", „Panel style: Square corners · 3 px border · Extra large title". ✓
- **Accessibility diagnostics:** „Section heading: Najczęstsze pytania", „Helper copy: No helper description configured." (opis był wyczyszczony), „Answer rendering: Markdown answers enabled", „Disclosure pattern: Native summary/details disclosure". ✓
- **Contract summary:** poprawny podział Wizard/Visual/Advanced. ✓
- **Saved data status:** „Saved FAQ data is already clean." ✓

Dodatkowo widoczne współdzielone „Block layout summary" i „Visibility summary".

### 4.4 Frontend (public)

Strona `/test-faq-accordion-0516` zwraca `200` i renderuje **zapisany** stan fixture: variant `two-column`, spacing `none`, `max-w-6xl`, defaultOpen `-1` (wszystkie zwinięte), single-open, motion `none`, header domyślny, JSON-LD **wyłączony**.

- **Skrypt runtime zadziałał** — root `data-coderso-faq-bound="true"`. ✓
- **Single-open:** otwarcie itemu 2 automatycznie zamyka item 1 (natywna grupa `name`). ✓
- **Collapse-all:** ponowny klik otwartego itemu zamyka go (`anyOpen=false`). ✓
- **`aria-expanded` synchronizuje się** po każdym toggle (skrypt runtime). ✓
- **Klawiatura:** `<summary>` natywnie fokusowalne; `Enter` otwiera panel. ✓
- **Dostępność:** `aria-controls` summary == `id` panelu; panel `role="region"` + `aria-labelledby` == `id` summary; sekcja `aria-labelledby` → `<h3>` nagłówka. ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); two-column zwija się do **jednej** kolumny poniżej `lg`. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **JSON-LD:** brak (zgodnie z `emitFaqJsonLd=false` w fixture). ✓

### 4.5 Izolacja i bezpieczeństwo edycji

- **Niezapisane edycje NIE wyciekają na front** — po wszystkich zmianach w Visual front nadal pokazuje stan zapisany (two-column, count 3, defaultOpen −1, „Frequently asked questions", „How long does setup take?"). ✓
- **Guard `beforeunload`** — próba opuszczenia strony admina z niezapisanymi zmianami wywołuje natywny dialog „unsaved changes" (musiałem go zaakceptować, żeby przejść na front). ✓ Dobry mechanizm ochronny.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — `style.spacing` bez kontrolki w edytorze (realny brak funkcjonalny)** | Visual / model danych | Token `style.spacing` (none/sm/md/lg) steruje **JEDNOCZEŚNIE** odstępem między panelami (`spacingClassMap`: gap-0…gap-4) **oraz** wewnętrznym paddingiem paneli (`panelPaddingClassMap`: dla `none` to `px-0 py-0`, dla `md` `px-5 py-4`). Mimo to **nie istnieje żadna kontrolka** „Spacing"/„Gap" w Visual ani Wizard — `spacingOptions` w kodzie edytora są użyte wyłącznie w podsumowaniu Advanced (`describeFaqLayout`) i w logice repair, nigdy jako Select. Co gorsza, **opis sekcji „Layout and typography" obiecuje** „Control FAQ width, header alignment, **spacing**, title scale, and motion." — słowo „spacing" jest mylące, bo edytowalne są tylko paddingi sekcji (X/Y), a NIE `style.spacing`. Skutek: użytkownik nie może z UI zmienić gęstości listy ani paddingu paneli; domyślnie zawsze `md`. Fixture publiczny ma `spacing=none` (gap-0 + `px-0 py-0` w panelach), co dało się ustawić tylko przez bezpośredni seed danych, nie przez edytor. **To realna luka funkcjonalna + mylący opis.** |
| **N2 — `aria-expanded` nie synchronizuje się w canvas adminowym** | Renderer / a11y (admin-only) | Skrypt runtime jest wstrzykiwany przez `dangerouslySetInnerHTML`, którego **React nie wykonuje** w edytorze (canvas `data-coderso-faq-bound` = *unset*). Skutek: po **ręcznym** toggle itemu w canvas natywny `open` się zmienia, ale `aria-expanded` zostaje na wartości początkowej — zaobserwowano `open=true` przy `aria-expanded="false"` (i odwrotnie). Stan początkowy jest poprawny; rozjazd pojawia się dopiero po interakcji w canvas. **Na froncie problem nie występuje** (skrypt działa, aria się synchronizuje). Niski priorytet (tylko preview adminowy), ale warto odnotować. Identyczne zjawisko jak N3 z raportu `accordion`. |
| **N3 — „Clear" na Panel surface = brak tła, nie kolor motywu** | Visual / colors | Po „Clear" na „Panel surface" kontener traci inline `background-color` całkowicie (transparent), zamiast wracać do `var(--color-bg)`. Badge pokazuje „Theme default", ale wizualnie panel staje się przezroczysty (przepuszcza tło sekcji). Zgodne z semantyką „clearable", lecz subtelnie mylące. (To samo zachowanie co N7 w raporcie `accordion`.) |
| **N4 — Kolizja etykiet palet z kontrolką wyglądu admina** | Visual / colors (drobne) | Przyciski palet „Light"/„Dark"/„Brand" mają etykiety kolidujące po **accessible name** z osobnym przełącznikiem wyglądu w UI admina (na stronie istnieją **dwa** przyciski o nazwie „Dark"). Dla realnego użytkownika klikającego widoczny przycisk to nieistotne; problem dotyczy głównie automatyzacji/lokatorów po nazwie (trzeba scope'ować do sekcji „FAQ palettes"). Po poprawnym zescope'owaniu paleta Dark działa bez zarzutu (zapis 7 kolorów). Klasyfikuję jako drobny niuans, nie bug produktowy. |
| **N5 — Brak osobnej kontrolki gęstości w Wizard** | Wizard | Wizard ogranicza się do wariantu + liczby pytań. To zgodne z intencją „seed → Visual", ale w połączeniu z N1 oznacza, że gęstość/odstępy listy nie są edytowalne na żadnym etapie (Wizard ani Visual). |

**Nie wykryto** żadnych błędów konsoli (admin i front: 0 błędów / 0 ostrzeżeń), żadnego twardego buga renderowania, ani rozjazdu między wspólnie testowanymi opcjami admin↔front. Wszystkie kontrolki Wizard i Visual, które przetestowałem (poza brakującą kontrolką `spacing` — N1), działają i aktualizują podgląd na żywo; Advanced wiernie i poprawnie podsumowuje stan; frontend jest w pełni interaktywny, dostępny i wolny od overflow.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/test-faq-accordion-0516`) | Zgodność |
|--------|--------------|---------------------------------------|----------|
| Atrybuty `data-faq-*` | ✓ żywy `FaqAccordionBlock` | ✓ identyczne atrybuty | ✓ |
| Otwieranie/zamykanie (natywny `<details>`) | ✓ działa bez skryptu | ✓ działa + skrypt runtime | ✓ |
| Single-open (`name`) | ✓ działa natywnie | ✓ działa natywnie | ✓ |
| `aria-expanded` po ręcznym toggle | ✗ nie synchronizuje (N2) | ✓ synchronizuje (skrypt) | ⚠ tylko front poprawny |
| Liczba jednoczesnych renderów | 1 (brak kolizji `name`) | 1 | ✓ |
| Markdown w odpowiedziach | ✓ render bezpieczny | ✓ (kod współdzielony) | ✓ |
| JSON-LD `FAQPage` | ✓ wstrzykiwany przy włączeniu | (fixture ma off → brak) | ✓ logika spójna |
| Dostępność (role/aria-controls/labelledby) | ✓ obecna i kompletna | ✓ obecna i kompletna | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny; canvas i front zachowują się spójnie dla testowanych opcji. Jedyna różnica admin↔front (N2 — synchronizacja `aria-expanded`) wynika z niewykonywania skryptu runtime w trybie edytora i jest specyficzna dla admina; front jest czysty.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture (próba nawigacji wywołała guard `beforeunload`, który zaakceptowałem bez zapisu). W związku z tym:
  - moje edycje w Visual/Wizard **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front;
  - zweryfikowana została natomiast **spójność w obrębie sesji** (Visual → Advanced wiernie podsumowuje) oraz **izolacja** (front pokazuje stan zapisany, nie moje edycje).
- **Drag & drop reordering itemów:** kontrolki `draggable` + `onDragStart/onDrop` są obecne, ale **NIE udało się potwierdzić** reorderingu metodami automatycznymi — ani `dragTo` (syntetyczne zdarzenia myszy), ani ręczny dispatch natywnych `DragEvent` nie zmieniły kolejności. Najpewniej to ograniczenie symulacji DnD (timing stanu React w handlerze przy programowym dispatchu), a nie bug aplikacji — **ta sama funkcja `moveItem`** uruchamiana przyciskami ↑/↓ działa poprawnie. Realny drag użytkownika prawdopodobnie zadziała, ale **tego nie mogę potwierdzić** w tym audycie.
- **Limity i walidacja:** nie testowałem ucinania `icon` do 16 znaków, `question` do 180, `answer` do 2000, ani budżetów parsera markdown (80 tokenów / 120 węzłów / limit pozycji list). Sprawdziłem listę **nieuporządkowaną**; listy **uporządkowanej** (`1.`) nie testowałem osobno (kod wspólny).
- **Max 12 itemów / min 1:** sprawdziłem guard min 1 (przy usuwaniu) i działanie licznika do 5; nie dochodziłem do twardego maksimum 12.
- **Pozostałe pola kolorów (zmiana + Clear):** realnie testowałem zmianę i „Clear" na **Panel surface**; dla pozostałych 6 potwierdziłem mechanizm pośrednio (paleta Dark ustawiła wszystkie 7 → badge „Selected color" + aktywne „Clear", wszystkie dzielą ten sam komponent `ColorField`).
- **`prefers-reduced-motion`:** dla motion=smooth obecne są klasy animacji, ale nie testowałem zachowania pod włączoną redukcją ruchu.
- **Współdzielone sekcje wrappera (Block layout, Device visibility):** poza zakresem audytu FAQ. Przypadkowo przełączyłem jeden switch device-visibility, ale **przywróciłem go** do stanu pierwotnego (wszystkie trzy `false`) i niczego nie zapisałem.

---

## 8. Podsumowanie

- Widget **faq-accordion jest w bardzo dobrym stanie funkcjonalnym**. Praktycznie wszystkie przetestowane kontrolki Wizard i Visual (warianty, nagłówek, treść Q/A, ikony, markdown, licznik pytań data-driven, add/remove/bulk-delete z dialogami i guardami, reorder przyciskami, allow-multiple-open, default-open, max width, alignment, title size, paddingi, motion, palety, 7 kolorów + Clear, panel radius, border width, JSON-LD) **działają i aktualizują podgląd na żywo**; Advanced wiernie podsumowuje stan; frontend jest w pełni interaktywny i dostępny (natywne `<details>`, klawiatura, kompletne ARIA, synchronizacja `aria-expanded`), bez błędów konsoli i bez overflow na mobile.
- **Najważniejsze realne znalezisko (N1):** token `style.spacing` (odstęp między panelami **i** padding paneli) **nie ma żadnej kontrolki** w edytorze, a opis sekcji „Layout and typography" mylnie obiecuje sterowanie „spacing". To luka funkcjonalna + mylący tekst — gęstość listy jest nieedytowalna z UI (domyślnie `md`; fixture z `none` powstał przez seed danych).
- **Niuans admin-only (N2):** brak synchronizacji `aria-expanded` w canvas adminowym po ręcznym toggle (skrypt runtime nie wykonuje się w edytorze). Front działa poprawnie.
- **Drobne kwestie:** „Clear" na Surface daje przezroczystość zamiast koloru motywu (N3); kolizja etykiet palet „Light/Dark" z przełącznikiem wyglądu admina — istotna tylko dla automatyzacji (N4); brak kontrolki gęstości także w Wizard (N5).
- **Plus względem innych widgetów:** licznik itemów jest **data-driven** (realnie zmienia tablicę), więc nie ma rozjazdu „licznik vs render" znanego z `accordion`/`tabs` (N1 tamtych raportów). W Visual jest tylko jeden render canvas, więc nie ma kolizji grupy `name` (N2 z `accordion`). Spójne „Clear" dla **wszystkich 7** kolorów. Bezpieczny render markdown (linki zewnętrzne z `rel="noopener noreferrer"`) i poprawny, spłaszczony JSON-LD `FAQPage`. Guard `beforeunload` chroni przed utratą edycji.
- Nie znaleziono żadnego błędu renderowania ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji; jedyna różnica (N2) wynika z braku wykonywania skryptu runtime w adminie.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o
> inspekcję DOM (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi
> etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git),
> nie są wymaganym evidence i nie zostały dołączone do repo.
