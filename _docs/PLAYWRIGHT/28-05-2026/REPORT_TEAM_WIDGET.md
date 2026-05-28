# RAPORT: Team Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-team` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/fb31e030-07df-4dce-9243-a3c8904d3269` (breadcrumb „Contract Test - team", status `Draft`)
> **Fixture public:** http://localhost:3000/test-team-0516
> **Pliki źródłowe:** `core/widgets/core/team.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/TeamEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-team-*`, klasy Tailwind, ARIA, inline
> `style`, atrybuty `href`/`rel`/`target` linków), a nie tylko zliczeniem widocznych
> sekcji. Sekcje 4–8 jasno oddzielają: co działa, co nie działa / jest mylące, co
> faktycznie przetestowano i czego NIE testowano.

> Uwaga o screenshotach: w tym audycie weryfikację oparłem **wyłącznie o inspekcję
> DOM** (`eval`) — nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy
> byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/`
> (ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do repo.

> Uwaga o trwałości: świadomie **nie** klikałem „Save draft" ani „Publish", aby nie
> nadpisać współdzielonego fixture. Wszystkie edycje w adminie pozostały
> niezapisane. W konsekwencji trwałość/propagacja moich edycji na front **nie** była
> weryfikowana (patrz sekcja 7).

---

## 1. Przegląd widgetu

**Typ:** `team` · **Kategoria:** `content` · **Opis:** „Member section with profile cards, roles, and social links."

**Warianty:** `cards` (domyślny — responsywna siatka kart), `compact-list` (pionowy stos wierszy z avatarem obok treści, `flex flex-col`), `spotlight` (jeden wyróżniony profil w `lg:col-span-2` + pozostali w bocznej kolumnie).

**Model danych (`TeamData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `eyebrow`, `title`, `description`, `align` (left/center/right), `titleSize` (xl/2xl/3xl) |
| **members[]** | `id`, `name`, `role`, `bio`, `photo`, `socialLinks[]` (`id`, `label`, `url`) |
| **spotlightLeadId** | id członka wyróżnionego w wariancie spotlight |
| **cta** | `label`, `url` |
| **style** | `columns` (1–4), `gap` (none/sm/md/lg), `sectionBackground`, `cardSurface`, `cardBorder` (3 kolory clearable), `cardBorderWidth` (0/1/2/3), `radius` (none/md/lg/xl), `compactMobileBio` (show/hide) |

**Ograniczenia:** min 1 / max 12 członków (`teamMemberMin=1`, `teamMemberMax=12`); max 5 linków społecznościowych na członka (`teamSocialLinksMax=5`). **Kluczowy niuans:** liczba członków jest sterowana danymi (tablica `members` + kontrolka „Members count"), NIE systemem slotów — zmiana licznika realnie dodaje/ucina elementy tablicy (potwierdzone, 4.2).

**Renderowanie:** sekcja `<section>` z `aria-label` (= tytuł nagłówka lub fallback „Team section"), zestaw atrybutów `data-team-*` (variant, count, columns, gap, radius, header-align, title-size, border-width, compact-mobile-bio). Każdy członek to `<article>` z `aria-label` w formacie „Imię, Rola". Avatar: `<img loading="lazy">` z bezpiecznym `src` (przez `normalizeWidgetSafeHref`) albo fallback inicjału w `<span aria-hidden="true">`. Linki społecznościowe renderowane jako `<ul><li><a>` i wyłącznie gdy URL przejdzie walidację bezpieczeństwa (`resolveWidgetLinkAttrs`); linki zewnętrzne dostają `target="_blank" rel="noopener noreferrer"`. CTA renderuje się tylko gdy istnieje JEDNOCZEŚNIE etykieta i bezpieczny URL. **Widget jest w pełni statyczny — nie wstrzykuje żadnego skryptu runtime** (brak interaktywności wymagającej JS), więc nie występuje tu problem desynchronizacji canvas↔front znany z FAQ/accordion.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie widoczny komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `faq-accordion`, `accordion`, `tabs`, `stats-kpi`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Jedna sekcja „Starter team": Select „Team layout" (cards/compact-list/spotlight) + **read-only** wiersz „Members count" + tekst pomocniczy kierujący do Visual. |
| **Visual** | zakładka „Visual" | 4 sekcje Team: **Variant and member structure**, **Header copy and CTA**, **Members content and order**, **Section and card style**. Dodatkowo wspólne sekcje wrappera: **Block layout**, **Device visibility**. |
| **Advanced** | zakładka „Advanced" | 4 sekcje Team **w pełni read-only**: Layout summary, Surface summary, Content summary, Contract summary + wspólne Block layout summary i Visibility summary. **Zero edytowalnych kontrolek** (potwierdzone: 0 inputów/combo/buttonów w panelu). |

**Ważna obserwacja o danych fixture:** strona admina (`Contract Test - team`) i strona publiczna (`test-team-0516`) są **osobno zaseedowanymi** fixture'ami tego samego typu widgetu, z **różnymi** danymi zapisanymi:
- admin (stan początkowy): wariant `cards`, 3 członkowie z realnymi URL-ami LinkedIn/X,
- public (stan zapisany): wariant `spotlight`, 3 członkowie, linki społecznościowe z `href="#"` (placeholder).

To nie jest błąd — to dwa niezależne zestawy danych. Należy o tym pamiętać przy porównaniu admin↔front (sekcja 6).

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonane w sesji `claude-28-05-team`, zweryfikowane inspekcją DOM:

- **Wizard:** Select wariantu (Cards→Compact List→Spotlight, live update canvas), read-only „Members count" (3), „Finish setup and open Visual", oraz **redukcja przy Spotlight** (8 członków → automatycznie 3, bez dialogu).
- **Visual / Variant i count:** 3 karty wariantu (cards/compact-list/spotlight), Members count (3→5 data-driven, 5→3 z dialogiem confirm — ścieżka dismiss i accept).
- **Visual / Header i CTA:** edycja eyebrow/title/description (live + aktualizacja `aria-label`), Header alignment (Left), Title size (3XL), CTA label, CTA destination (picker stron → HomePage), tekst-guard „CTA requires both a label and a safe destination".
- **Visual / Members:** edycja name/role/bio, wyczyszczenie bio (pominięcie w karcie), wyczyszczenie zdjęcia (fallback do inicjału), social: zmiana profilu LinkedIn (rebuild href + rel/target), zmiana platformy LinkedIn→GitHub, Add link, Remove social link (in-panel confirm), Add member, Move down, Remove member (in-panel confirm), ustawienie Spotlight lead.
- **Visual / Section i card style:** Columns (4), Gap (Spacious), Card radius (None), Card background (`#fef3c7` + Clear → transparent), Card border width (3px), Section background (`#1e293b`), Compact-list mobile bio (Hide → `sr-only`).
- **Advanced:** odczyt wszystkich 4 sekcji read-only i porównanie ze stanem z mojej sesji Visual; potwierdzenie braku jakichkolwiek edytowalnych kontrolek.
- **Public (frontend):** render zapisanego stanu (spotlight), struktura spotlight (lead + supporting), avatary/alt, linki społecznościowe (`href="#"`), semantyka (`section`/`article`/`ul`/`li`/`img loading=lazy`), poziomy nagłówków, brak overflow na 375 px, konsola (0 błędów / 0 ostrzeżeń).

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard („Starter team")

- **Select „Team layout"** — Cards→Compact List→Spotlight natychmiast zmienia `data-team-variant` w canvas (compact-list → `flex flex-col gap-5`; spotlight → lead w `lg:col-span-2`). ✓
- **„Members count"** — to **read-only** wiersz podsumowania („3 members"); zgodnie z kontraktem Wizard NIE pozwala zmienić liczby (to własność Visual). ✓ (oczekiwane)
- **„Finish setup and open Visual"** — poprawnie wraca do zakładki Visual (`aria-selected=true` na „Visual"). ✓
- Tekst pomocniczy jasno komunikuje podział ról (Wizard = seed layoutu; Visual = codzienna edycja treści, count, zdjęć, social, CTA, spotlight lead).

### 4.2 Visual — kontrolki i efekt w canvas (zweryfikowane w DOM)

| Kontrolka | Test | Efekt w canvas |
|-----------|------|----------------|
| Karty wariantu | cards / compact-list / spotlight | `data-team-variant` + klasa layoutu: cards→`grid ... lg:grid-cols-N`, compact-list→`flex flex-col`, spotlight→lead `lg:col-span-2` (h4 `text-2xl`, `p-6`) + reszta w bocznej siatce. ✓ |
| Members count (↑) | 3 → 5 | **data-driven**: dochodzą „Team Member 4/5" (fallback), `data-team-count="5"`. ✓ |
| Members count (↓) | 5 → 3 | natywny `window.confirm` „Reducing the member count will remove the last 2 profiles. Continue?" — **dismiss** zostawia 5, **accept** ucina do 3. Komunikat poprawnie liczy usuwane profile. ✓ |
| Eyebrow / Title / Description | edycja | `<p>` eyebrow, `<h2>` tytuł, `<p>` opis aktualizują się live. **Tytuł aktualizuje też `aria-label` sekcji.** ✓ |
| Header alignment | Left | header `items-start text-left`, `data-team-header-align="left"`. ✓ |
| Title size | 3XL | `<h2>` → `text-3xl sm:text-4xl`, `data-team-title-size="3xl"`. ✓ |
| CTA label (samo) | „Zobacz oferty" | CTA **nie** renderuje się; pojawia się guard „CTA requires both a label and a safe destination." ✓ |
| CTA destination | picker → HomePage | po dodaniu destynacji CTA renderuje się: `href="/homepage"`, link wewnętrzny → **bez** `target`/`rel`; wrapper wyrównany do `align` (`justify-start`). ✓ |
| Member name | „Anna Nowak-Test" | `<h4>` i `aria-label` artykułu („Anna Nowak-Test, Head of Product") live. ✓ |
| Member bio (wyczyszczone) | puste | karta **pomija** `<p>` bio (zgodnie z help „Clear the bio if you want the runtime card to omit it"). ✓ |
| Clear photo | usunięcie zdjęcia Anny | `<img>` znika, pojawia się inicjał „A" w `<span aria-hidden="true">`. ✓ |
| Social: profile name | LinkedIn „ada-lovelace" | href przebudowany: `https://www.linkedin.com/in/ada-lovelace`, `rel="noopener noreferrer"`, `target="_blank"`. ✓ |
| Social: Add link | +1 | dodaje pusty link „LinkedIn" (url puste), `data-team-social-count` rośnie. ✓ |
| Social: Remove (in-panel) | confirm | „Remove this social link from Marek Nowak?" + Confirm/Cancel; po Confirm link znika. ✓ |
| Add member | +1 | `data-team-count` rośnie, „Team Member N" **dopisany na końcu** listy. Dwa przyciski „Add member" (góra+dół). ✓ |
| Move up / Move down | reorder | kolejność zmienia się w edytorze i canvas (Anna ↓ → Marek, Anna, Ewa). ✓ |
| Remove member (in-panel) | confirm | „Remove this member profile and all of its photo, bio, and social-link content?" + Confirm/Cancel; po Confirm count maleje. **Guard min 1** (przycisk Remove disabled przy 1 członku — weryfikacja kodu). ✓ |
| Spotlight lead | „Set as spotlight lead" na Ewie | `data-team-spotlight-lead="true"` przeskakuje na Ewę, badge „Spotlight Lead" przy liderze; nielider ma przycisk „Set as spotlight lead". Domyślny lider = pierwszy członek. ✓ |
| Columns | 4 | `data-team-columns="4"`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. ✓ |
| Gap | Spacious | `data-team-gap="lg"`, `gap-7`. ✓ |
| Card radius | None | `data-team-radius="none"`, brak klasy `rounded-*` na karcie. ✓ |
| Card background | `#fef3c7` | inline `background-color: rgb(254,243,199)`; advisory kontrastu zmienia się na „Configured colors look readable". ✓ |
| Card background → Clear | clear | inline `background-color` **usunięte całkowicie** (karta przezroczysta), zostają tylko właściwości border. ✓ (semantyka clearable) |
| Card border width | 3px | `data-team-border-width="3"`, inline `border-width: 3px`. ✓ |
| Section background | `#1e293b` | inline `background-color: rgb(30,41,59)` na `<section>`. ✓ |
| Compact-list mobile bio | Hide | `data-team-compact-mobile-bio="hide"`; w wariancie compact-list bio dostaje klasy `sr-only sm:not-sr-only sm:block` (ukryte wizualnie na mobile, dostępne dla AT). ✓ |

**Spójność „Clear" w kolorach:** wszystkie 3 pola koloru (Section background, Card background, Card border) mają przycisk „Clear", poprawnie **disabled** gdy wartość == domyślna (np. Section background w stanie wyjściowym), **enabled** po ustawieniu własnego koloru. Section/Card background mają `allowTransparent`; Card background/border traktują `var(--color-bg)` / `var(--color-border)` jako „Theme default".

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only (**0 edytowalnych kontrolek, 0 przycisków akcji** w panelu — potwierdzone) i **wiernie** odzwierciedlał stan z mojej sesji Visual:

- **Layout summary:** Variant „spotlight", Columns „4 columns", Gap „Spacious", Card radius „None", Card border width „3px", Compact mobile bio „Hidden visually on mobile". ✓
- **Surface summary:** Section background „Selected swatch" (po `#1e293b`), Card background „Theme default" (po Clear), Card border „Theme default". ✓
- **Content summary:** Members „3 members", Social links „4 configured", Spotlight lead „Configured", CTA „Configured", Section heading „Poznaj nasz zespół", Helper copy „Helper description is configured.", Photo coverage „2/3 members with photos" (po wyczyszczeniu zdjęcia Anny). ✓
- **Contract summary:** poprawny podział własności Wizard/Visual/Advanced. ✓

Każda zmiana w Visual była natychmiast i poprawnie odzwierciedlana w podsumowaniach Advanced.

### 4.4 Frontend (public `test-team-0516`)

Strona zwraca `200`, tytuł „TEST-TEAM-0516" i renderuje **zapisany** stan fixture (niezależny od admina): wariant `spotlight`, 3 członków (Anna/Marek/Ewa) z realnymi zdjęciami, nagłówek domyślny „Meet the team", brak CTA.

- **Struktura spotlight poprawna** — lider = Anna Kowalska (pierwszy członek; brak jawnego `spotlightLeadId`), w `lg:col-span-2`, większy nagłówek `text-2xl`, padding `p-6`; Marek + Ewa jako supporting (`text-lg`, `p-4`). ✓
- **Semantyka i dostępność:** `<section>` z `aria-label="Meet the team"`; każdy członek to `<article>` z `aria-label` „Imię, Rola"; linki społecznościowe w `<ul><li>`; avatary `<img loading="lazy">` z poprawnym `alt` „Photo of {imię}, {rola}". ✓
- **Bezpieczne linki:** linki społecznościowe mają `href="#"` (placeholder fixture) — `#` jest dozwolony jako hash, więc renderują się jako klikalne, lecz bez `target`/`rel` (traktowane jak wewnętrzne). ✓ (mechanika poprawna; brak realnej destynacji to cecha danych fixture, nie błąd renderera)
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Zmiana platformy społecznościowej z LinkedIn gubi/przekłamuje handle** | Visual / Members / social | LinkedIn przechowuje profil w formacie `in/handle`. Po przełączeniu platformy LinkedIn → inna (np. GitHub) edytor bierze odczytany profil `in/ada-lovelace` i buduje URL biorąc pierwszy segment ścieżki → powstaje **błędny** `https://github.com/in`, a pole „Profile name" pokazuje samo `in`. **Realny defekt fidelity danych.** Jest odwracalny: ponowne wpisanie czystego handle („ada-lovelace") naprawia URL do `https://github.com/ada-lovelace`. Dotyczy wyłącznie kierunku **z** LinkedIn (jego profil ma prefiks `in/`); przełączenia między pozostałymi platformami (gołe handle) są bezpieczne. |
| **N2 — Wizard: wybór Spotlight przy >6 członkach ucina do 3 BEZ potwierdzenia** | Wizard / asymetria z Visual | W Wizard przy 8 członkach wybór „Spotlight" **po cichu** redukuje listę do 3 (zachowuje pierwsze 3), bez żadnego dialogu confirm. Tymczasem w Visual identyczna redukcja licznika („Members count" ↓) **zawsze** pyta `window.confirm`. Co więcej, zmiana wariantu na spotlight **w Visual** (przez karty) w ogóle NIE ucina członków. Efekt: ta sama operacja „przejdź na spotlight" zachowuje się różnie zależnie od trybu, a wariant z Wizard powoduje ciche usunięcie danych. **Mylące + ryzyko utraty danych bez ostrzeżenia.** |
| **N3 — „Clear" na kolorze tła = przezroczystość, nie kolor motywu** | Visual / colors | Po „Clear" na „Card background" karta traci inline `background-color` całkowicie (transparent), zamiast wracać do `var(--color-bg)`. Badge mówi „Theme default", ale wizualnie karta przepuszcza tło sekcji. Zgodne z semantyką „clearable", lecz subtelnie mylące (to samo zachowanie co w FAQ/contact). |
| **N4 — Pominięcie poziomu nagłówka H3 (H2 → H4)** | Renderer / a11y (front i admin) | Sekcja używa `<h2>` na tytuł i `<h4>` na nazwy członków — **brak `<h3>` pomiędzy**. Skok poziomu nagłówków jest drobnym niuansem dostępności (hierarchia nagłówków powinna być ciągła). Niski priorytet, ale warto odnotować. |
| **N5 — Mylący tekst „Add members from the top"** | Visual / Members | Helper przy liście („Add members from the top when the list gets long. The secondary action stays at the bottom…") sugeruje wstawianie u góry, ale `addMember` **zawsze dopisuje na końcu** tablicy (sprawdzone: nowy „Team Member N" pojawia się na dole). Tekst odnosi się do pozycji *przycisku* (jest jeden u góry i jeden u dołu sekcji), nie do miejsca wstawienia — łatwe do nieporozumienia. |
| **N6 — Linki społecznościowe na froncie prowadzą do `#`** | Frontend / dane fixture | Wszystkie linki społecznościowe na `test-team-0516` mają `href="#"` (placeholder). Renderują się jako klikalne, ale nie prowadzą nigdzie (skok na górę strony). To cecha **zaseedowanych danych fixture**, nie błąd widgetu (renderer poprawnie respektuje `allowHash`). Warto jednak wiedzieć, że publiczny fixture nie demonstruje realnych destynacji społecznościowych. |

**Nie wykryto** żadnych błędów konsoli (admin i front: 0 błędów / 0 ostrzeżeń poza infem React DevTools), żadnego twardego buga renderowania, ani rozjazdu między wspólnie testowanym rendererem admin↔front. Wszystkie kontrolki Wizard i Visual, które przetestowałem (poza niuansem N1), działają i aktualizują podgląd na żywo; Advanced wiernie i poprawnie podsumowuje stan; frontend jest semantyczny, dostępny i wolny od overflow.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/test-team-0516`) | Zgodność |
|--------|--------------|------------------------------|----------|
| Atrybuty `data-team-*` | ✓ żywy `TeamBlock` | ✓ identyczny zestaw atrybutów | ✓ (wspólny renderer) |
| Renderowanie wariantów (cards/compact/spotlight) | ✓ live wg edycji | ✓ wg stanu zapisanego (spotlight) | ✓ logika spójna |
| Avatary (img / inicjał) + `alt` | ✓ | ✓ `loading=lazy`, `alt="Photo of …"` | ✓ |
| Linki społecznościowe (bezpieczne href + rel/target) | ✓ realne URL-e (po edycji) | ✓ `href="#"` (dane fixture) | ✓ mechanika, dane różne |
| CTA (label + safe URL) | ✓ renderuje po dodaniu destynacji | (fixture bez CTA → brak) | ✓ logika spójna |
| Semantyka (`section`/`article`/`ul`/`li`/aria-label) | ✓ obecna | ✓ obecna i kompletna | ✓ |
| Skrypt runtime / interaktywność JS | brak (widget statyczny) | brak | ✓ (brak desync jak w FAQ) |
| Zapisane dane | wariant `cards` (stan wyjściowy) | wariant `spotlight` | ⚠ **różne fixture** (zaseedowane niezależnie) |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** (front = osobny stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i zachowuje się spójnie — różnice między admin a frontem wynikają wyłącznie z **różnych danych zapisanych** w dwóch niezależnie zaseedowanych stronach, a nie z rozbieżności kodu. Ponieważ Team jest widgetem statycznym, nie ma tu żadnych problemów synchronizacji ARIA/skryptu znanych z widgetów interaktywnych.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie nadpisać współdzielonego fixture. W związku z tym trwałość moich edycji po przeładowaniu oraz propagacja na front **nie** zostały zweryfikowane. Zweryfikowana została natomiast **spójność w obrębie sesji** (Visual → Advanced wiernie podsumowuje) oraz **izolacja** (front pokazuje swój własny stan zapisany, nie moje niezapisane edycje).
- **Wybór realnego obrazu z biblioteki mediów (MediaPicker):** testowałem tylko „Clear photo" (usunięcie → fallback do inicjału). Pełnego flow wyboru obrazu z modala biblioteki mediów nie uruchamiałem; stany podglądu zdjęcia (empty/invalid/saved/picked) potwierdzone wyłącznie z kodu.
- **Zmiana koloru „Card border":** potwierdziłem obecność kontrolki i działający przycisk „Clear"; nie zmieniałem samej wartości pickerem (mechanizm wspólny z Card/Section background, które przetestowałem).
- **Twardy limit 12 członków / `Add member` disabled przy 12:** zweryfikowany z kodu (`disabled={members.length >= teamMemberMax}`); nie dochodziłem klikaniem do 12. Analogicznie min-1 (Remove disabled przy 1) — weryfikacja kodu, nie klik.
- **Limit 5 linków społecznościowych / `Add link` disabled przy 5:** weryfikacja z kodu (`disabled={socialLinks.length >= teamSocialLinksMax}`), nie dochodziłem do 5.
- **Obsługa „custom" (legacy) destynacji społecznościowej:** fixture nie zawierał linku z niestandardowym/legacy URL-em, więc ścieżki „Custom saved destination" + „Clear saved destination" + ostrzeżenie o niebezpiecznym URL-u nie testowałem na żywo (tylko z kodu).
- **Drag & drop reorderingu członków:** Team **nie ma** drag-and-drop — oferuje wyłącznie przyciski Move up/Move down (inaczej niż np. Stats KPI z uchwytem „Drag"). Nie ma więc czego testować w tym zakresie.
- **`prefers-reduced-motion`:** nie dotyczy — Team nie ma animacji/motion.
- **Wspólne sekcje wrappera (Block layout, Device visibility):** poza zakresem audytu Team; nie modyfikowałem.

---

## 8. Podsumowanie

- Widget **Team jest w bardzo dobrym stanie funkcjonalnym.** Praktycznie wszystkie przetestowane kontrolki Wizard i Visual (3 warianty, data-driven licznik członków z dialogiem confirm przy redukcji, nagłówek + alignment + title size, CTA z walidacją label+URL i bezpiecznym href, edycja name/role/bio z pomijaniem pustego bio, zdjęcia z fallbackiem do inicjału, linki społecznościowe z budowaniem bezpiecznego href i rel/target, add/remove/move członków oraz linków z in-panel confirm, wybór spotlight lead, kolumny/gap/radius/border-width, 3 kolory z „Clear", compact-mobile-bio) **działają i aktualizują podgląd na żywo.** Advanced jest w 100% read-only i wiernie podsumowuje stan. Frontend jest semantyczny (section/article/ul/li, aria-label, lazy img), dostępny, bez błędów konsoli i bez overflow na mobile.
- **Najważniejsze realne znaleziska:**
  - **N1** — przełączenie platformy społecznościowej **z** LinkedIn przekłamuje handle (powstaje `github.com/in`); odwracalne, ale to defekt fidelity danych.
  - **N2** — w Wizard wybór Spotlight przy >6 członkach **po cichu ucina listę do 3 bez potwierdzenia**, podczas gdy redukcja licznika w Visual zawsze pyta, a zmiana wariantu w Visual w ogóle nie ucina — niespójność + ryzyko cichej utraty danych.
- **Drobniejsze niuanse:** „Clear" tła daje przezroczystość zamiast koloru motywu (N3); pominięcie poziomu H3 w hierarchii nagłówków (N4); mylący tekst „Add members from the top" przy faktycznym dopisywaniu na końcu (N5); publiczny fixture ma placeholderowe linki `href="#"` (N6, cecha danych, nie kodu).
- **Plus względem innych widgetów:** Team jest w pełni **statyczny** (brak skryptu runtime), więc nie ma problemów synchronizacji ARIA/`name` znanych z FAQ/accordion/tabs; licznik członków jest **data-driven** (realnie zmienia tablicę), więc nie ma rozjazdu „licznik vs render"; spójne i bezpieczne budowanie linków (handle → safe URL, `rel="noopener noreferrer"` dla zewnętrznych); spójne „Clear" dla wszystkich 3 kolorów; sensowne dialogi/guardy (confirm przy redukcji count, in-panel confirm przy usuwaniu członków i linków, min-1 guard).
- Nie znaleziono żadnego błędu renderowania ani rozbieżności admin↔front na poziomie kodu — jedyne różnice wynikają z **różnych danych** dwóch niezależnie zaseedowanych fixture'ów (admin: cards z realnymi URL-ami; public: spotlight z `#`).

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o
> inspekcję DOM (`eval`) oraz snapshoty struktury (YAML w `.playwright-cli/`,
> katalog ignorowany przez Git). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi
> etykietami** przechwyceń, nie są wymaganym evidence i nie zostały dołączone do repo.
