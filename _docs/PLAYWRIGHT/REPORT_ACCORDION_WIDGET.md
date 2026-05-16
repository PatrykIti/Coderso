# RAPORT: Accordion Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #8 (Accordion Widget)  
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000  
> **Sesja przeglądarki:** `accordion-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetów

Projekt zawiera **dwa oddzielne widgety akordeonowe** z różnymi modelami danych i przeznaczeniami:

### 1.1 Accordion Widget (layout)

**Typ:** Layout / Composite (repeatable slots)  
**Kategoria:** `layout`  
**Warianty:** `soft`, `bordered`, `compact`  
**Ograniczenia elementów:** min 2 / max 8  
**Plik renderera:** `core/widgets/core/accordion.tsx`  
**Plik edytora:** `core/admin/ui/widgets/editors/AccordionEditors.tsx`

Accordion to ogólny widget layoutowy z zagnieżdżonymi slotami — każdy item może zawierać dowolne inne widgety. Oparty na natywnych elementach HTML `<details>/<summary>`.

### 1.2 FAQ Accordion Widget (content)

**Typ:** Content (standalone, bez slotów)  
**Kategoria:** `content`  
**Warianty:** `single-column`, `two-column`, `compact`  
**Ograniczenia elementów:** min 1 / max 12  
**Plik renderera:** `core/widgets/core/faqAccordion.tsx`  
**Plik edytora:** `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`

FAQ Accordion to specjalistyczny widget do sekcji FAQ — pary pytanie/odpowiedź. Zawiera sekcję nagłówkową, opcjonalny układ dwukolumnowy oraz kontrolę spacingu.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych — Accordion

| Sekcja | Pola |
|--------|------|
| **Elementy** | `id`, `title`, `description` (na każdy item) |
| **Opcje** | `openMode` (single/multiple), `defaultOpenIds[]`, `collapsible`, `initiallyOpenId`, `allowMultiple` |
| **Styl** | `surfaceColor`, `borderColor`, `summaryTextColor` |

### 2.2 Model danych — FAQ Accordion

| Sekcja | Pola |
|--------|------|
| **Nagłówek** | `header.title`, `header.description` |
| **Elementy** | `id`, `question`, `answer` (na każdy item) |
| **Opcje** | `allowMultipleOpen`, `defaultOpenIndex` |
| **Styl** | `surface`, `border`, `divider`, `spacing` (none/sm/md/lg) |

### 2.3 Tryby edytora

#### Accordion
- **Wizard** — wariant + structure (count, initially-open, title/description per item)
- **Visual** — Wizard + BehaviorSection (openMode, collapsible, default open, kolory)
- **Advanced** — Visual + Diagnostics (JSON snapshot)

#### FAQ Accordion
- **Wizard** — wariant (select), section title, count, Q&A list
- **Visual** — VariantCards, count, header copy, Q&A z Move/Remove/Add, behavior, colors/spacing
- **Advanced** — Open-state controls, token inputs, Normalize/Reset buttons, JSON snapshot

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| C1 | **`allowMultipleOpen` nie działa w rendererze FAQ** — mimo włączenia opcji, renderer używa wyłącznie `defaultOpenIndex` (single index). Efekt: zawsze tylko jeden item otwarty przy załadowaniu strony, nawet gdy `allowMultipleOpen=true` | FAQ Accordion | Renderer |
| C2 | **`collapsible=false` nie jest egzekwowane** — natywny element `<details>` nie obsługuje zakazu zwijania bez JavaScriptu. Opcja jest przechowywana w danych ale nie ma żadnego efektu w rendererze | Accordion | Renderer |
| C3 | **Brak wskaźnika expand/collapse (chevron/arrow)** — `<summary>` renderuje sam tekst bez żadnej ikony toggle. Użytkownik nie ma wizualnej wskazówki, że panel jest klikalny | Oba | Renderer |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| W1 | **Brak kontroli animacji/przejść** — natywny `<details>` nie animuje otwierania/zamykania. Brak opcji `transition-duration`, `animation` | Oba | Renderer |
| W2 | **Brak ikony/emoji per item** — nie można dodać ikony do tytułu elementu akordeonowego | Accordion | Dane/Renderer |
| W3 | **Brak koloru tekstu treści (body/description)** — `text-[var(--color-text)]/70` hardcoded, nieedytowalne | Accordion | Styl |
| W4 | **Brak koloru tekstu pytania w FAQ** — brakuje `questionTextColor`; tylko panel surface/border/divider | FAQ Accordion | Styl |
| W5 | **Brak kontroli padding panelu** — hardcoded per variant (`px-4 py-3.5` dla soft, `px-3 py-2` dla compact) | Accordion | Layout |
| W6 | **Brak kontroli border-radius** — radius hardcoded per variant (`rounded-xl`, `rounded-lg`, `rounded-md`) | Accordion | Styl |
| W7 | **Brak opcji `maxWidth`** — widget rozciąga się na pełną szerokość kontenera bez możliwości ograniczenia | Oba | Layout |
| W8 | **Brak kontroli wyrównania nagłówka FAQ** — `text-center` hardcoded, brak opcji left/right | FAQ Accordion | Layout |
| W9 | **Brak padding/margin sekcji FAQ** — `px-4 py-8` hardcoded w `FaqAccordionBlock` | FAQ Accordion | Layout |
| W10 | **Brak pola koloru tekstu nagłówka FAQ** (header title + description) | FAQ Accordion | Styl |
| W11 | **Brak opcji "none open by default" w Accordion** — `initiallyOpenId` zawsze wskazuje na jakiś item; nie ma możliwości uruchomienia z wszystkimi zamkniętymi (np. gdy `collapsible=true`) | Accordion | Opcje |
| W12 | **Brak font-size/weight dla tytułu elementu** — rozmiar i pogrubienie `summary` hardcoded per variant | Oba | Typografia |
| W13 | **Brak opcji SEO schema (FAQPage JSON-LD)** — FAQ Accordion to idealne miejsce dla `FAQPage` structured data | FAQ Accordion | SEO |
| W14 | **Brak opcji max-items dynamicznego** — stałe granice min 2 / max 8 (Accordion), min 1 / max 12 (FAQ) bez możliwości konfiguracji | Oba | Dane |
| W15 | **Brak linkowania w treści Q&A** — pola `answer` to plain text, brak markdown/HTML | FAQ Accordion | Treść |

### 3.3 Problemy UX edytora

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| U1 | **Eksponowanie `slot id` w edytorze** — `"Item 1 (slot id: 1)"` widoczne dla redaktora; techniczna etykieta nie powinna być widoczna w UI | Accordion | Edytor |
| U2 | **Dwa zduplikowane pola `initiallyOpenId` i `defaultOpenIds`** — oba kontrolują to samo; `initiallyOpenId` jest legacy, ale nadal widoczne w edytorze StructureSection ("Initially open item") oraz BehaviorSection ("Default open item") | Accordion | Edytor |
| U3 | **Brak walidacji duplikatów `defaultOpenIds`** — w trybie multiple można wybrać te same items wielokrotnie (chroniona przez `Set`, ale UI tego nie sygnalizuje) | Accordion | Edytor |
| U4 | **Switch "Allow all closed" ma niejasny opis** — `"Keep disclosure state collapsible after the default open state"` — zbyt techniczne dla redaktora treści | Accordion | Edytor |
| U5 | **Brak podglądu wyboru wariantu** — tylko karty z tekstem; brak miniaturek wizualnych reprezentacji wariantów | Oba | Edytor |
| U6 | **Brak przycisków Move Up/Down w Accordion editor** — można zmienić liczbę items selektem, ale nie można przestawiać kolejności itemów w edytorze | Accordion | Edytor |
| U7 | **Brak przycisku "Add item"** w Accordion Wizard/Visual — zmiana liczby przez dropdown, nie przez przycisk dodawania/usuwania | Accordion | Edytor |
| U8 | **Brak ClearableFieldHeader dla `borderColor` i `summaryTextColor`** w Accordion editor — tylko `surfaceColor` ma przycisk clear; pozostałe pola kolorów nie można wyczyścić | Accordion | Edytor |
| U9 | **Color inputs w Accordion są plain text** — w FAQ Accordion jest `<input type="color">` + text pole; w Accordion edytorze tylko text field | Accordion | Edytor |
| U10 | **Brak potwierdzenia przy usunięciu itemu FAQ** — `removeItem` działa natychmiast bez confirmation dialog | FAQ Accordion | Edytor |
| U11 | **`defaultOpenIndex=-1` (all collapsed) niedostępne w Advanced FAQ** — wartość jest poprawna w kodzie, ale input `min={-1}` nie informuje użytkownika o semantyce wartości `-1` | FAQ Accordion | Edytor |

### 3.4 Problemy renderera (frontend)

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| R1 | **Brak `aria-label` na `<details>`** — każdy panel akordeonowy nie ma etykiety dla screen readera | Oba | Dostępność |
| R2 | **Brak `role="region"` na treści `<details>`** — treść panelu powinna mieć `role="region"` z `aria-labelledby` wskazującym na `<summary>` | Oba | Dostępność |
| R3 | **`<summary>` bez `aria-expanded`** — natywny element obsługuje expanded state, ale `aria-expanded` nie jest dodawane | Oba | Dostępność |
| R4 | **Brak `aria-label` / `aria-labelledby` na kontenera widgetu** — div `data-nextless-accordion` bez semantycznej roli | Accordion | Dostępność |
| R5 | **`<section>` FAQ bez `aria-label` / `aria-labelledby`** — wrapper sekcji bez opisu | FAQ Accordion | Dostępność |
| R6 | **Pusty accordion item** — gdy brak bloków w slocie, pokazuje "Add widgets to this accordion item." — tekst placeholder widoczny na froncie | Accordion | Renderer |
| R7 | **`name` attribute dla `openMode=single`** — `detailsGroupName` bazuje na `resolvedItems[0].instanceId` (np. `nextless-accordion-1`). Przy zmianie kolejności lub ID, name się zmienia, psując grupowanie | Accordion | Logika |
| R8 | **Spacing `"none"` i `spacingClassMap`** — `gap-0` dla none vs inline item spacing — brak wizualnego separatora między items gdy spacing=none | FAQ Accordion | Renderer |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=accordion-audit`  
> **Data testu:** 2026-05-16

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 5. Testy na froncie (localhost:3000)

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 6. Porównanie Admin Preview vs Frontend

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **`allowMultipleOpen` nie działa — zawsze single open** | Kluczowa funkcja FAQ Accordion nie działa na froncie |
| 🔴 KRYTYCZNY | C2 | **`collapsible=false` ignorowane przez renderer** | Opcja zachowuje się jak `true` zawsze |
| 🔴 KRYTYCZNY | C3 | **Brak wskaźnika expand/collapse (chevron)** | Użytkownik nie wie że element jest klikalny |
| 🟠 WYSOKI | R6 | **Placeholder "Add widgets..." widoczny na froncie** | Zawartość developerska na produkcji |
| 🟠 WYSOKI | U1 | **Slot id widoczny w edytorze** | Confusing UX dla redaktora treści |
| 🟠 WYSOKI | U2 | **Zduplikowane pola `initiallyOpenId`/`defaultOpenIds`** | Dezorientacja — dwa miejsca ustawiania tego samego |
| 🟠 WYSOKI | R1–R5 | **Brak ARIA** | Niedostępność dla screen readerów |
| 🟡 ŚREDNI | W1 | **Brak animacji** | Wrażenie statyczności UI |
| 🟡 ŚREDNI | U6, U7 | **Brak reorder / add/remove per item** | Ograniczona kontrola kolejności elementów |
| 🟡 ŚREDNI | U9 | **Brak color pickera w Accordion** | Spójność edytora — FAQ ma picker, Accordion nie |
| 🟡 ŚREDNI | W3, W4 | **Brak koloru body/description i tekstu pytania** | Niepełna kontrola typografii |
| 🟡 ŚREDNI | W8, W9 | **Wyrównanie i padding FAQ hardcoded** | Ograniczony wachlarz konfiguracyjny |
| 🟢 NISKI | W13 | **Brak SEO FAQ schema** | Utracona szansa SEO |
| 🟢 NISKI | W15 | **Plain text w Q&A** | Brak formatowania/linków w odpowiedziach |

---

*Raport w toku — sekcje 4–6 uzupełniane po testach Playwright.*
