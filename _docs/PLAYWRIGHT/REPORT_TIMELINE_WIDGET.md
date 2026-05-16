# RAPORT: Timeline Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #3 (Timeline Widget)  
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000

---

## 1. Przegląd widgetu

**Typ:** Composite  
**Moduł:** Content  
**Audience:** Intermediate  
**Warianty:** `milestones`, `cards`, `compact`  
**Tryby (mode):** `process`, `axis`, `chronology`, `alternating`  
**Ograniczenia kroków:** min 3 / max 8  

Timeline widget służy do prezentacji kroków procesu, kamieni milowych, wydarzeń chronologicznych oraz przeplatających się narracji. Obsługuje orientację poziomą i pionową, oznaczenia statusu kroków, daty, ikony, akcenty kolorów per krok oraz linki CTA per krok.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Tryb** | `mode` — `process` / `axis` / `chronology` / `alternating` |
| **Kroki (steps)** | `id`, `title` (wymagane), `description`, `icon`, `accent`, `date`, `dateLabel`, `status`, `cta.label`, `cta.href` |
| **Layout** | `orientation` (H/V), `align` (start/center/end), `spacing` (5 opcji), `labelPosition` (top/bottom) |
| **Guides** | `enabled`, `style` (solid/dashed) |
| **Style** | `lineStyle`, `thickness` (1–4px), `markerSize` (sm/md/lg), `lineColor`, `markerColor`, `titleColor`, `descriptionColor`, `titleSize`, `descriptionSize` |
| **Tło** | `background.color` |

### 2.2 Layouty renderera

| Layout | Tryb/Wariant | Opis |
|--------|-------------|------|
| `TimelineMilestonesLayout` | mode=`axis`, variant=`milestones` | Markery wzdłuż osi z etykietami |
| `TimelineCardsLayout` | variant=`cards` | Kroki jako karty w gridzie |
| `TimelineChronologyLayout` | mode=`chronology` | Data po lewej, karta po prawej |
| `TimelineAlternatingLayout` | mode=`alternating` | Karty naprzemiennie lewo/prawo |
| `TimelineCompactLayout` | mode=`process` / variant=`compact` | Minimalna listwa procesu |

### 2.3 Tryby edytora

- **Wizard** — minimalny onboarding: wariant, tryb, liczba kroków, orientacja, guides, szybka edycja tytułów (tylko pierwsze 4 kroki!)
- **Visual** — pełny inspektor w sekcjach: wariant, struktura, treść kroków, guides/oś, markery/akcenty, kolory, typografia
- **Advanced** — techniczne tokeny layoutu (orientacja, wyrównanie, pozycja etykiet) + normalizacja danych

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **Wizard pokazuje tylko pierwsze 4 kroki** — przy 5–8 krokach reszta jest niewidoczna w Wizard mode (kod: `steps.slice(0, 4)`) | Edytor Wizard |
| C2 | **Brak pola `status` w Wizard** — użytkownik musi wchodzić do Visual aby ustawić status kroku (upcoming/current/complete) | Edytor Wizard |
| C3 | **Brak przycisku usunięcia kroku w Wizard** — można dodawać (przez liczbę kroków) ale nie można zidentyfikować który krok usunąć | Edytor Wizard |
| C4 | **Brak pola `icon` i `accent` na poziomie Wizard** — podstawowe wizualne wyróżnienie kroku wymaga przejścia do Visual | Edytor Wizard |
| C5 | **Connector guide w `TimelineMilestonesLayout` (horizontal) ma stałą szerokość 4rem** — nie rozciąga się proporcjonalnie, guide nie łączy markerów przy różnych spacingach | Renderer |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak `font-weight` dla tytułów kroków** — tylko rozmiar, brak pogrubienia / normal / light | Typografia |
| W2 | **Brak kontroli kolejności kroków przez drag & drop** — tylko przyciski Up/Down w Visual | UX edytora |
| W3 | **Brak globalnego koloru akcentu per krok z dziedziczeniem** — każdy krok musi mieć ręcznie ustawiony accent lub dziedzicz globalny `markerColor`; brak inteligentnego preview | Kolory |
| W4 | **Brak `labelPosition` per krok** — wszystkie kroki mają tę samą pozycję etykiety (top/bottom dotyczy całego widgetu, nie każdego kroku osobno) | Layout |
| W5 | **Brak sekcji padding/margin** — widget ma stałe `px-4 py-8` bez możliwości konfiguracji z edytora | Layout |
| W6 | **Brak opcji `numbered markers`** — markery są tylko kołami (kropkami), brak numerowania kroków (1, 2, 3...) | Styl wizualny |
| W7 | **Brak walidacji kontrastu kolorów** — użytkownik może ustawić nieczytelne kombinacje bez ostrzeżenia | Dostępność |
| W8 | **Brak kontroli animacji/przejść** — timeline statyczny, brak scroll-triggered animation, brak fade-in kroków | Efekty |
| W9 | **Brak maksymalnej szerokości kontenera (maxWidth)** — `max-w-6xl` (1152px) jest hardcoded, nie konfigurowalne | Layout |
| W10 | **Brak opcji klikalnych kroków** — CTA jest tylko per krok jako link, brak możliwości zrobienia całego kroku jako link | UX |
| W11 | **Brak trybu `milestones` + `chronology` jednocześnie** — chronologia wymaga trybu `chronology`, nie można mieć osi poziomej z datami po lewej | Layout |
| W12 | **Brak pola `headerTitle` / `headerDescription` dla całego widgetu** — brak możliwości dodania nagłówka nad timeline bez osobnego widgetu | Treść |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Brak wizualnego preview wyboru trybu** — tylko lista dropdown, brak ikonograficznej reprezentacji jak będzie wyglądał tryb | Edytor |
| U2 | **Brak informacji co się dzieje po zmianie trybu** — zmiana `mode` automatycznie zmienia `variant` (kod: `preferredVariantForMode`) bez widocznego komunikatu | Edytor |
| U3 | **`date` i `dateLabel` to zwykłe pola tekstowe bez walidatora formatu** — użytkownik może wpisać dowolny string, brak date pickera | Edytor |
| U4 | **Brak podpowiedzi przy polach bez opisów** — np. pole `icon` ma tylko placeholder "Icon text or emoji" bez info gdzie go szukać | Edytor |
| U5 | **Status wybierany z dropdown z wartością domyślną `upcoming`** — nie jest jasne że to pole opcjonalne; każdy krok "ma" status nawet jeśli nie chcemy go pokazywać | Edytor |
| U6 | **Brak ostrzeżenia przy `titleSize: none`** — tytuł przestaje być widoczny, bez żadnej wskazówki | Edytor |
| U7 | **Brak grupowania kolorów per krok w sekcji "Markers and accents"** — kolory akcentów kroków renderują się jeden pod drugim w siatce, bez etykiet Step 1 / Step 2 bezpośrednio przy kolorze (są jako label w `ClearableFieldHeader`) | Edytor |
| U8 | **Brak tooltipów przy opcjach spacing** — "Compact", "Default", "Spacious", "Extra spacious" nie informują o konkretnych wartościach `gap` | Edytor |

### 3.4 Problemy renderera (frontend)

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **`TimelineAlternatingLayout` ukrywa datę na mobile** (`hidden md:block`) — data/dateLabel kroków niewidoczna na urządzeniach mobilnych | Responsywność |
| R2 | **`TimelineChronologyLayout` — kolumna daty jest stała (`10rem`)** — przy długich datach/labelach dochodzi do overflow | Layout |
| R3 | **`TimelineMilestonesLayout` (horizontal) — brak responsywności** — przy małych ekranach `flex-wrap` powoduje łamanie rzędów nieestetycznie | Responsywność |
| R4 | **Brak `aria-current="step"` na aktywnym kroku** — status `current` tylko dodaje klasę CSS, brak semantyki ARIA dla screen readerów | Dostępność |
| R5 | **`<ol>` bez `aria-label`** — lista kroków nie ma żadnego opisu dla technologii asystujących | Dostępność |
| R6 | **`<section>` bez `aria-label` / `aria-labelledby`** — wrapper sekcji nie ma semantycznego opisu | Dostępność |
| R7 | **Brak `role="listitem"` — `<li>` jest OK, ale ikona emoji (`step.icon`) renderuje się jako plain tekst** bez `aria-hidden="true"`, przez co screen reader ją odczytuje | Dostępność |
| R8 | **Connector guide w `TimelineMilestonesLayout` (horizontal) ma stałą szerokość 4rem** — nie łączy wizualnie markerów przy dużym spacingu | Renderer |
| R9 | **`TimelineCardsLayout` — `borderStyle` jest aplikowany na border karty** zamiast oddzielnej osi — zmiana `lineStyle` zmienia obramowanie kart, nie oś | Logika |
| R10 | **Brak `min-h` dla sekcji** — przy 3 krokach z krótką treścią timeline wygląda bardzo płasko i pusto | Layout |

---

## 4. Testy w Admin UI Preview

> **Status:** Oczekuje na wykonanie (Playwright)

---

## 5. Testy na froncie (localhost:3000)

> **Status:** Oczekuje na wykonanie (Playwright)

---

## 6. Porównanie Admin Preview vs Frontend

> **Status:** Oczekuje na wykonanie (Playwright)

---

## 7. Podsumowanie priorytetów

| Priorytet | Problem | Wpływ |
|-----------|---------|-------|
| 🔴 KRYTYCZNY | C1: Wizard pokazuje tylko 4/8 kroków | UX edytora — użytkownik nie może edytować kroków 5–8 w Wizard |
| 🔴 KRYTYCZNY | R1: Data niewidoczna na mobile w Alternating | Treść ginie na urządzeniach mobilnych |
| 🟠 WYSOKI | R4, R5, R6: Brak ARIA | Dostępność — a11y |
| 🟠 WYSOKI | R9: lineStyle aplikowany na border kart | Błąd logiki — zmiana stylu osi zmienia border kart |
| 🟠 WYSOKI | R8: Connector guide stała szerokość | Wizualny błąd renderowania na dużym spacingu |
| 🟡 ŚREDNI | W5: Brak kontroli padding | Layout ograniczony |
| 🟡 ŚREDNI | W6: Brak numerowanych markerów | Ograniczenie wizualne |
| 🟡 ŚREDNI | U3: date bez date pickera | Podatność na błędy danych |
| 🟡 ŚREDNI | U5: Status zawsze "upcoming" domyślnie | Mylące UX |
| 🟢 NISKI | W1, W8, W12 | Rozszerzenie konfiguracji |

---

*Raport będzie uzupełniany po testach w przeglądarce.*
