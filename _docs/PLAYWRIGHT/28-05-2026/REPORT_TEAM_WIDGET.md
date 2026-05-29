# RAPORT: Team Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony (upgrade domykający luki: MediaPicker + twarde limity)
> **Data:** 2026-05-29 (poprzednia wersja: 2026-05-28)
> **Sesja Playwright:** `claude-29-05-team-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/fb31e030-07df-4dce-9243-a3c8904d3269` (widget „Team", status `Draft`)
> **Fixture public (z zadania):** http://localhost:3000/team-audit-0516 — **zwraca 404** (patrz 5 i 7)
> **Fixture public (działający):** http://localhost:3000/test-team-0516 — audyt frontu wykonano tutaj
> **Pliki źródłowe:** `core/widgets/core/team.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/TeamEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/media/MediaPicker.tsx` (modal biblioteki mediów) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kontrolki kolorów)

> **Cel tego upgrade'u.** Poprzedni audyt (28-05) zostawił dwie konkretne luki:
> *(1)* ścieżka **MediaPicker / wybór zdjęcia z biblioteki** była potwierdzona tylko
> z kodu (testowany był wyłącznie „Clear photo"), oraz *(2)* **twarde limity** (12
> członków, 5 linków, min 1) były potwierdzone tylko z kodu, bez doklikania do
> granic. W tej sesji obie luki domknąłem realną interakcją w UI, a dodatkowo
> wykonałem brakujące gałęzie: realny kolor obramowania karty, gałąź „custom"
> destynacji społecznościowej oraz pełny cykl destynacji CTA (ustaw → wyczyść).

> **Metodologia.** Każde „działa / nie działa" zweryfikowane realną interakcją w UI
> + inspekcją DOM (atrybuty `data-team-*`, inline `style`, `href`/`rel`/`target`,
> computed styles, ARIA). Sekcje 4–8 jasno oddzielają: **przetestowano /
> działa / błędne-mylące / nie-do-przetestowania / niuanse UX.**

> **Screenshoty.** W tym audycie weryfikację oparłem o inspekcję DOM (`eval`) oraz
> snapshoty struktury (YAML w `.playwright-cli/`, katalog ignorowany przez Git). **Nie**
> zapisywałem zrzutów PNG. Ewentualne pliki PNG byłyby **wyłącznie lokalnymi
> etykietami** przechwyceń, nie są wymaganym evidence i nie są dołączone do repo.

> **Trwałość.** Świadomie **nie** klikałem „Save draft" ani „Publish", aby nie
> nadpisać współdzielonego fixture. Wszystkie edycje admina pozostały niezapisane;
> trwałość/propagacja na front **nie** była weryfikowana (sekcja 7). Wszystkie
> interakcje w tej sesji były niezapisane i nie wpływają na zaseedowany stan.

---

## 1. Przegląd widgetu

**Typ:** `team` · **Kategoria:** `content` · **Opis:** „Member section with profile cards, roles, and social links."

**Warianty:** `cards` (responsywna siatka kart), `compact-list` (pionowy stos wierszy z avatarem obok treści, `flex flex-col`), `spotlight` (jeden wyróżniony profil w `lg:col-span-2` + pozostali w bocznej kolumnie z `spotlightRestColumnsClassMap`).

**Model danych (`TeamData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `eyebrow`, `title`, `description`, `align` (left/center/right), `titleSize` (xl/2xl/3xl) |
| **members[]** | `id`, `name`, `role`, `bio`, `photo`, `socialLinks[]` (`id`, `label`, `url`) |
| **spotlightLeadId** | id członka wyróżnionego w wariancie spotlight |
| **cta** | `label`, `url` |
| **style** | `columns` (1–4), `gap` (none/sm/md/lg), `sectionBackground`, `cardSurface`, `cardBorder` (3 kolory clearable), `cardBorderWidth` (0/1/2/3), `radius` (none/md/lg/xl), `compactMobileBio` (show/hide) |

**Ograniczenia (twarde limity):** min 1 / max 12 członków (`teamMemberMin=1`, `teamMemberMax=12`); max 5 linków społecznościowych na członka (`teamSocialLinksMax=5`). Liczba członków jest **data-driven** (tablica `members` + kontrolka „Members count"), NIE systemem slotów — zmiana licznika realnie dodaje/ucina elementy tablicy. **W tej sesji wszystkie trzy limity zostały doklikane do granicy i potwierdzone w UI (4.5).**

**Renderowanie:** `<section>` z `aria-label` (= tytuł nagłówka lub fallback „Team section") i kompletem atrybutów `data-team-*`. Każdy członek to `<article>` z `aria-label` „Imię, Rola". Avatar: `<img loading="lazy">` z bezpiecznym `src` (przez `normalizeWidgetSafeHref`) albo fallback inicjału w `<span aria-hidden="true">`. Linki społecznościowe jako `<ul><li><a>`, wyłącznie gdy URL przejdzie walidację (`resolveWidgetLinkAttrs`); linki zewnętrzne dostają `target="_blank" rel="noopener noreferrer"`. CTA renderuje się tylko gdy JEDNOCZEŚNIE istnieje etykieta i bezpieczny URL. **Widget jest w pełni statyczny — zero skryptu runtime**, więc nie ma problemu desync canvas↔front znanego z FAQ/accordion.

---

## 2. Architektura trybów edytora

Panel edytora ma **dwie zakładki: `Visual` i `Advanced`**. **Wizard nie jest równorzędną zakładką** — wchodzi się przyciskiem **„Run setup again"** (widoczny komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Ten sam wzorzec, co w `faq-accordion`, `accordion`, `tabs`, `stats-kpi`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | Sekcja „Starter team": Select „Team layout" (cards/compact-list/spotlight) + **read-only** „Members count" + tekst kierujący do Visual. |
| **Visual** | zakładka „Visual" | 4 sekcje Team: **Variant and member structure**, **Header copy and CTA**, **Members content and order**, **Section and card style** + wspólne **Block layout**, **Device visibility**. |
| **Advanced** | zakładka „Advanced" | 4 sekcje Team **w pełni read-only**: Layout summary, Surface summary, Content summary, Contract summary + wspólne podsumowania. **Zero edytowalnych kontrolek.** |

**Dane fixture:** strona admina (status początkowy) to wariant `cards`, 3 członków (Anna Kowalska, Marek Nowak, Ewa Zielinska) z realnymi URL-ami LinkedIn/X — zgodne z `teamDefaults`. Strona publiczna `test-team-0516` to wariant `spotlight`, 3 członków, linki społecznościowe z `href="#"`. To **dwa niezależnie zaseedowane** zestawy danych tego samego typu widgetu (to nie jest błąd).

---

## 3. Co faktycznie przetestowano w tej sesji (zakres interakcji)

Wszystkie interakcje w sesji `claude-29-05-team-gap-close`, zweryfikowane inspekcją DOM:

**Nowe w tym upgrade (domknięte luki):**
- **MediaPicker (pełny flow):** „Browse media" → modal „Media library" (lista realnych assetów: `cos1.png`, `tratata`, kilka `image.png`) → wybór „Placeholder hero image" → podmiana zdjęcia Anny w canvas + stan podglądu „picked" → usunięcie wybranego mediów przyciskiem X w pickerze → fallback do inicjału.
- **Twarde limity (doklikane do granic):** Members count 3→11→**12** (Add member disabled), redukcja 12→3 i 3→**1** z dialogami confirm, social links Anny 2→**5** (Add link disabled), przy **1** członku Remove/Move up/Move down disabled (min-1).
- **Realny kolor obramowania karty:** Card border ustawiony pickerem na `#ff0000` (wcześniej tylko „Clear") → realny efekt + obserwacja semantyki „Clear".
- **Gałąź „custom" destynacji społecznościowej:** wymuszona zmianą etykiety na nieznaną platformę („Portfolio") → render gałęzi custom → powrót do znanej platformy (GitHub).
- **Pełny cykl destynacji CTA:** label-only (guard) → picker stron (HomePage, render `/homepage`) → „No destination" (CTA znika).
- **Re-weryfikacja defektu N1:** LinkedIn→GitHub przekłamuje handle (`github.com/in`), naprawialne czystym handle.

**Re-audyt bazowy (potwierdzony ponownie):** trzy warianty, members count data-driven, nagłówek/align/title size, edycja name/role/bio, Advanced read-only, render frontu, semantyka/ARIA, konsola, responsywność 375 px.

---

## 4. Co DZIAŁA — szczegóły (z evidence z DOM)

### 4.1 MediaPicker / wybór zdjęcia z biblioteki (LUKA DOMKNIĘTA) ✓

Pełny flow przetestowany na członku „Anna Kowalska":

| Krok | Akcja | Efekt (DOM evidence) |
|------|-------|----------------------|
| Otwarcie biblioteki | klik „Browse media" | otwiera się modal `dialog "Media library"` z polem wyszukiwania i siatką realnych assetów (m.in. „Placeholder hero image / cos1.png / 5.8 KB", „tratata / image.png / 18 KB", kilka „image.png"). ✓ |
| Stan bazowy canvas | — | avatar Anny = `https://images.unsplash.com/photo-1487412720507-e7ab37603c6f` (zaseedowany). |
| Wybór obrazu | klik „Placeholder hero image" | modal zamyka się; **avatar Anny w canvas zmienia się na** `http://localhost:3000/media/2026/02/652f0989-…-8c3edc4a9005.png`; `alt` pozostaje poprawny „Photo of Anna Kowalska, Head of Product". ✓ |
| Stan podglądu w edytorze | — | komunikat podglądu zmienia się na **„Using the selected media-library image for this member."** (= kind `picked`); picker pokazuje wybraną kartę „cos1.png / 5.8 KB" z przyciskiem X. ✓ |
| Usunięcie z pickera | klik X na karcie | `onChange(null)` → photo czyszczone → **canvas wraca do inicjału „A"** w `<span aria-hidden="true">`; przycisk „Clear photo" staje się **disabled**. ✓ |

**Wniosek:** ścieżka MediaPicker (`empty → picked → empty`) działa end-to-end; podmiana propaguje na żywo do canvas, a stan podglądu i etykiety przełączają się poprawnie. To była główna luka z 28-05 i jest domknięta.

### 4.2 Twarde limity (LUKA DOMKNIĘTA) ✓

| Limit | Test (UI) | Efekt |
|-------|-----------|-------|
| **Max 12 członków** | Members count 3→11 (Add member **enabled**) → klik „Add member" → `data-team-count="12"` | przy 12 **oba** przyciski „Add member" (górny i dolny) są `[disabled]`. Lista wyboru „Members count" oferuje wartości tylko 1–12. ✓ |
| **Redukcja z confirm** | Members count 12→3 | natywny `window.confirm` „Reducing the member count will remove the last **9** profiles. Continue?" — komunikat poprawnie liczy 9 usuwanych; accept → `data-team-count="3"`. ✓ |
| **Max 5 linków społ.** | Anna: Add link 2→3→4→5 | przy 5 linkach (`data-team-social-count="5"`) przycisk „Add link" jest `[disabled]`. ✓ |
| **Min 1 członek** | Members count 3→1 | confirm „remove the last **2** profiles" → accept → 1 członek; przy 1 członku **Remove**, **Move up** i **Move down** są `[disabled]` (guard min-1 + brzegi reorderingu). ✓ |

**Wniosek:** wszystkie trzy twarde limity działają i są poprawnie blokowane w UI przy granicach — wcześniej potwierdzone tylko z kodu, teraz doklikane.

### 4.3 Kolory karty/sekcji — w tym realny Card border (LUKA DOMKNIĘTA) ✓

- **Card border (realny kolor):** picker `type="color"` ustawiony na `#ff0000` → karta w canvas dostaje inline `border-color: rgb(255,0,0)` (computed = `rgb(255,0,0)`); status w edytorze zmienia się z „Theme default" na **„Selected color"**; przycisk „Clear" staje się aktywny. ✓ (wcześniej testowany był tylko „Clear")
- **Card border → Clear:** inline `border-color` zostaje **całkowicie usunięte**; computed border-color spada do **domyślnego koloru klasy Tailwind `border`** (`rgb(240,232,213)`), a **nie** do tokenu `var(--color-border)` (`rgb(29,23,15)`). Status pokazuje „Theme default", lecz realnie to fallback utility, nie token motywu — patrz niuans N3. ✓ (zachowanie clearable, spójne z Card/Section background)
- Z poprzedniej sesji (nadal aktualne): Section background `#1e293b`, Card background `#fef3c7` + Clear (→ transparent), advisory kontrastu, „Use transparent" dla tła sekcji/karty.

### 4.4 Gałęzie destynacji — social „custom" + CTA (LUKA DOMKNIĘTA) ✓

**Gałąź „custom" linku społecznościowego (osiągalna w UI):**
- Wymuszenie: zmiana **Public label** istniejącego linku (pusty URL) na nieznaną platformę „Portfolio" → `resolveTeamSocialPlatform` zwraca `custom` (host brak + label nierozpoznana).
- Render: Platform combobox pokazuje **„Custom saved destination"**; pojawia się przerywany blok **„Profile destination"** z tekstem *„Pick a known platform to create a safe destination from a profile name. Saved custom destinations stay compatible and can be cleared here."*
- Ponieważ URL jest **pusty**, **NIE** ma przycisku „Clear saved destination" ani ostrzeżenia o niebezpiecznym URL-u (te pod-gałęzie wymagają zapisanej destynacji — patrz sekcja 7).
- Lista platform w gałęzi custom: pozycja „Custom saved destination" jest `[disabled]` (tylko wskaźnik), a 6 znanych platform (LinkedIn/X/GitHub/Instagram/Facebook/YouTube) jest wybieralnych.
- **Powrót z custom:** wybór „GitHub" → gałąź custom znika, wraca pole **„Profile name"** (placeholder „ada-lovelace"), label „GitHub". ✓

**Cykl destynacji CTA (pełny):**
- **label-only:** ustawiony „CTA label" bez destynacji → guard **„CTA requires both a label and a safe destination."**; w canvas **brak** `[data-team-cta]`. ✓
- **picker destynacji:** „CTA destination" otwiera listę stron serwisu (No destination, HomePage, Pricing Review Temp, …); wybór **„HomePage"** → CTA renderuje się: tekst „Zobacz zespół", `href="/homepage"`, link wewnętrzny → **bez** `target`/`rel`. ✓
- **wyczyszczenie:** wybór „No destination" → CTA **znika** z canvas (label zostaje, ale brak bezpiecznej destynacji → guard wraca). ✓

### 4.5 Pozostałe kontrolki Visual (re-weryfikacja, działa)

- 3 karty wariantu (cards/compact-list/spotlight) — `data-team-variant` + klasa layoutu.
- Members count data-driven (dochodzą „Team Member N" jako fallback).
- Eyebrow/Title/Description live (tytuł aktualizuje `aria-label` sekcji).
- Header alignment, Title size, Columns, Gap, Card radius, Card border width, Compact-list mobile bio — wszystkie aktualizują `data-team-*` / klasy / inline-style w canvas.
- Edycja name/role/bio, czyszczenie bio (pominięcie `<p>`), Add/Remove/Move członków (in-panel confirm), Add/Remove linku (in-panel confirm), Set spotlight lead.
- Budowanie bezpiecznego `href` dla social: czysty handle → `https://github.com/octocat`, `rel="noopener noreferrer" target="_blank"` dla zewnętrznych. ✓

### 4.6 Advanced (read-only)

Tryb Advanced jest w 100% read-only (0 edytowalnych kontrolek) i wiernie odzwierciedla stan z sesji Visual: Layout summary, Surface summary (`describeTeamColor`: „Selected swatch" / „Theme default" / „Saved custom color"), Content summary (członkowie, social links, spotlight, CTA, heading, photo coverage), Contract summary (podział Wizard/Visual/Advanced).

### 4.7 Frontend (public `test-team-0516`)

> **Uwaga:** route z zadania `team-audit-0516` zwraca **404** (sekcja 5/7). Audyt frontu wykonałem na działającym fixture `test-team-0516`, jawnie odnotowując tę rozbieżność.

Strona zwraca `200`, tytuł „TEST-TEAM-0516", renderuje zapisany stan: wariant `spotlight`, 3 członków, `data-team-*` komplet (variant spotlight, count 3, columns 3, gap md, radius lg, header center, title 2xl, border 1, compact-mobile-bio show).

- **Struktura spotlight poprawna** — lider = Anna Kowalska (`data-team-spotlight-lead="true"`), Marek + Ewa jako supporting (`false`). ✓
- **Semantyka/ARIA:** `<section aria-label="Meet the team">`; 3× `<article>` z `aria-label` „Imię, Rola"; avatary `<img loading="lazy">` z poprawnym `alt` „Photo of {imię}, {rola}"; linki w `<ul><li>`. ✓
- **Hierarchia nagłówków:** `H2` (tytuł) → `H4` (nazwy członków) — **brak `H3`** (niuans N4). 
- **Linki społecznościowe:** wszystkie `href="#"` (placeholder fixture), bez `target`/`rel` (hash traktowany jak wewnętrzny). ✓ (mechanika poprawna; brak realnych destynacji to cecha danych — N6)
- **CTA:** brak (fixture bez CTA). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓

---

## 5. Co NIE działa / jest błędne lub mylące (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N0 — Publiczny route z zadania `team-audit-0516` zwraca 404** | Środowisko / fixture | Wskazany w zadaniu adres `http://localhost:3000/team-audit-0516` **nie istnieje** — serwer zwraca `404 Not Found` (w DOM tylko „Not Found", brak `[data-team-variant]`; w konsoli 404 na zasób). Jedyny działający publiczny fixture Team to `http://localhost:3000/test-team-0516` (`200`). To blokada środowiska/danych, nie błąd renderera (patrz też sekcja 7). |
| **N1 — Zmiana platformy społecznościowej z LinkedIn przekłamuje handle** | Visual / Members / social | **Re-potwierdzone w tej sesji.** LinkedIn trzyma profil jako `in/handle`. Po przełączeniu LinkedIn→GitHub edytor czyta `in/anna-kowalska` i bierze pierwszy segment ścieżki → powstaje błędny `https://github.com/in`, a „Profile name" pokazuje samo `in`. **Realny defekt fidelity danych.** Odwracalny: wpisanie czystego handle („octocat") naprawia URL do `https://github.com/octocat` (z `rel`/`target` dla zewnętrznych). Dotyczy kierunku **z** LinkedIn (jego profil ma prefiks `in/`); przełączenia między platformami z gołym handle są bezpieczne. |
| **N2 — Wizard: wybór Spotlight przy >6 członkach ucina do 3 BEZ potwierdzenia** | Wizard / asymetria z Visual | W Wizard przy >6 członkach wybór „Spotlight" po cichu redukuje listę do 3 (bez dialogu), podczas gdy redukcja licznika w Visual **zawsze** pyta `window.confirm`, a zmiana wariantu na spotlight w Visual w ogóle NIE ucina. Ta sama intencja („przejdź na spotlight") zachowuje się różnie zależnie od trybu → ryzyko cichej utraty danych. (weryfikacja z 28-05; logika `handleVariantChange` w `TeamWizardEditor` niezmieniona) |
| **N3 — „Clear" koloru = przezroczystość / fallback utility, nie token motywu** | Visual / colors | **Doprecyzowane dla Card border w tej sesji.** Po „Clear" na Card border inline `border-color` znika całkowicie, a computed spada do domyślnego koloru klasy Tailwind `border` (`rgb(240,232,213)`), **nie** do `var(--color-border)` (`rgb(29,23,15)`). Analogicznie Card/Section background po „Clear" stają się transparentne. Status „Theme default" jest więc subtelnie mylący (to fallback, nie token). Zgodne z semantyką clearable, ale wizualnie myli. |
| **N4 — Pominięcie poziomu nagłówka H3 (H2 → H4)** | Renderer / a11y (front i admin) | Sekcja używa `<h2>` na tytuł i `<h4>` na nazwy członków — **brak `<h3>`** (potwierdzone na froncie: kolejność `H2, H4, H4, H4`). Drobny skok hierarchii nagłówków. Niski priorytet. |
| **N5 — Mylący tekst „Add members from the top"** | Visual / Members | Helper sugeruje wstawianie u góry, ale `addMember` **zawsze dopisuje na końcu** tablicy. Tekst odnosi się do pozycji *przycisku* (jest u góry i u dołu sekcji), nie do miejsca wstawienia — łatwe do nieporozumienia. |
| **N6 — Linki społecznościowe na froncie prowadzą do `#`** | Frontend / dane fixture | Wszystkie linki społecznościowe na `test-team-0516` mają `href="#"` (placeholder). Renderują się jako klikalne, ale skaczą na górę strony. Cecha **zaseedowanych danych**, nie błąd widgetu (renderer poprawnie respektuje `allowHash`). |

**Nie wykryto** żadnego błędu konsoli (admin: 0 błędów; front `test-team-0516`: 0/0), żadnego twardego buga renderowania, ani rozjazdu wspólnego renderera admin↔front. Poza N1 wszystkie przetestowane kontrolki działają i aktualizują podgląd na żywo.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/test-team-0516`) | Zgodność |
|--------|--------------|------------------------------|----------|
| Atrybuty `data-team-*` | ✓ żywy `TeamBlock` | ✓ identyczny zestaw | ✓ wspólny renderer |
| Warianty (cards/compact/spotlight) | ✓ live wg edycji | ✓ wg zapisu (spotlight) | ✓ |
| Avatary (img/inicjał) + `alt` | ✓ (w tym podmiana z MediaPicker) | ✓ `loading=lazy`, `alt="Photo of …"` | ✓ |
| Linki społ. (safe href + rel/target) | ✓ realne URL-e po edycji | ✓ `href="#"` (dane fixture) | ✓ mechanika, dane różne |
| CTA (label + safe URL) | ✓ renderuje po destynacji, znika po „No destination" | (fixture bez CTA) | ✓ logika spójna |
| Semantyka (`section`/`article`/`ul`/`li`/aria) | ✓ | ✓ kompletna | ✓ |
| Skrypt runtime / JS | brak (statyczny) | brak | ✓ (brak desync) |
| Zapisane dane | `cards` (stan wyjściowy) | `spotlight` | ⚠ różne, niezależne fixture |
| Niezapisane edycje z sesji | widoczne w edytorze | nieobecne | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i spójny — różnice admin↔front wynikają z **różnych zapisanych danych**, nie z rozbieżności kodu. Brak problemów synchronizacji ARIA/skryptu (widget statyczny).

---

## 7. Czego NIE dało się przetestować (uczciwe ograniczenia z nazwą kontrolki i przyczyną)

Po domknięciu luk MediaPicker i twardych limitów, **nie-do-przetestowania w tym fixture/środowisku** pozostają następujące, ściśle nazwane ścieżki:

- **Publiczny fixture `team-audit-0516` (route z zadania).** Powód: serwer zwraca **404** — strona nie istnieje w tym środowisku. Audyt frontu wykonano na zastępczym `test-team-0516`. Kontrolka/zasób: cały publiczny render pod tym adresem.
- **Stan zdjęcia `invalid`** (`resolveTeamPhotoState` → kind `invalid`, komunikat „The saved photo cannot be used…"). Powód: UI ustawia `photo` wyłącznie przez MediaPicker (zawsze poprawny `media.url`) albo „Clear" (undefined) — **nie ma pola tekstowego na surowy URL**, więc nie da się wstrzyknąć niebezpiecznego/uszkodzonego `photo` bez danych seedowych. Potwierdzone z kodu.
- **Social: „Clear saved destination" + ostrzeżenie „The saved destination is unsafe and will not render publicly" w gałęzi `custom`.** Powód: te pod-gałęzie pojawiają się tylko gdy link `custom` ma **zapisaną** destynację (`hasSavedDestination`/`hasUnsafeDestination`). Edytor buduje URL-e wyłącznie dla **znanych** platform, więc custom-z-zapisanym-URL-em wymaga legacy danych seedowych. Gałąź custom bez URL-a przetestowałem (4.4).
- **Social: legacy box „A saved destination is still stored…"** (`hasLegacyDestination`: znana platforma, ale ścieżka nie parsuje się do profilu, np. `linkedin.com/` bez `in/handle`). Powód: nie da się utworzyć takiej destynacji w UI (builder zawsze produkuje poprawną ścieżkę) — wymaga legacy seed.
- **CTA: feedback „The saved CTA destination is unsafe and will not render publicly".** Powód: pole CTA destination to picker stron (`LinkDestinationField`); ostrzeżenie wymaga **ręcznie wpisanego** (legacy) niebezpiecznego URL-a, którego nie da się wprowadzić przez picker.
- **Zapis i publikacja (Save draft / Publish).** Powód: świadomie pominięte, aby nie nadpisać współdzielonego fixture; trwałość i propagacja na front nie były weryfikowane. Zweryfikowana została spójność w obrębie sesji (Visual→Advanced→canvas) i izolacja (front = osobny zapisany stan).
- **Drag & drop reorderingu członków.** Powód: Team **nie ma** D&D — tylko przyciski Move up/Move down (przetestowane, w tym brzegowe disabled). Nie ma czego testować.
- **`prefers-reduced-motion`.** Nie dotyczy — Team nie ma animacji.

---

## 8. Podsumowanie

- **Obie luki z 28-05 domknięte realną interakcją w UI:**
  - **MediaPicker** — pełny flow `Browse media → wybór assetu → podmiana avatara w canvas + stan „picked" → usunięcie z pickera → fallback do inicjału` działa end-to-end (4.1).
  - **Twarde limity** — 12 członków (Add member disabled), 5 linków (Add link disabled), min 1 (Remove/Move disabled), z poprawnymi dialogami confirm liczącymi usuwane profile (4.2).
- **Dodatkowo domknięte:** realny kolor Card border (4.3), gałąź `custom` destynacji społecznościowej z powrotem do znanej platformy (4.4), pełny cykl destynacji CTA (label-only → HomePage → No destination) (4.4).
- **Najważniejsze realne znaleziska:**
  - **N0** — publiczny route z zadania `team-audit-0516` **zwraca 404**; audyt frontu wykonano na `test-team-0516` z jawną adnotacją rozbieżności.
  - **N1** — przełączenie platformy społecznościowej **z** LinkedIn przekłamuje handle (`github.com/in`); odwracalne, lecz to defekt fidelity (re-potwierdzone).
  - **N2** — w Wizard wybór Spotlight przy >6 członkach po cichu ucina do 3 bez potwierdzenia (niespójność z Visual).
- **Drobniejsze niuanse:** „Clear" koloru daje fallback utility/transparent zamiast tokenu motywu (N3, doprecyzowane dla Card border); skok hierarchii H2→H4 (N4); mylący helper „Add members from the top" (N5); placeholderowe `href="#"` na froncie (N6).
- **Plus widgetu:** w pełni **statyczny** (brak desync ARIA/skryptu), **data-driven** licznik członków, spójne i bezpieczne budowanie linków (handle → safe URL + `rel`/`target`), spójne „Clear" dla 3 kolorów, sensowne guardy (confirm przy redukcji count, in-panel confirm przy usuwaniu, disabled przy limitach), MediaPicker poprawnie spina się z podglądem i canvas.
- **Nie znaleziono** żadnego błędu renderowania ani rozbieżności admin↔front na poziomie kodu — różnice to wyłącznie efekt różnych zaseedowanych danych dwóch niezależnych fixture'ów.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — weryfikację oparłem o inspekcję
> DOM (`eval`) oraz snapshoty struktury (YAML w `.playwright-cli/`, katalog ignorowany
> przez Git). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami**
> przechwyceń, nie są wymaganym evidence i nie zostały dołączone do repo.
