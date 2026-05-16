# RAPORT: Section Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #3 (Section Widget)  
> **Środowisko:** http://localhost:5173/admin | http://localhost:3000

---

## 1. Przegląd widgetu

**Typ:** Atomic  
**Moduł:** Layout  
**Audience:** Advanced  
**Warianty:** `default`, `contained`, `bleed`  
**Slot:** `region` — powtarzalny (min 1, max 8 regionów)

Section widget jest bazowym kontenerem układu strony. Odpowiada za: semantyczny element HTML (section/div), nagłówek sekcji (label + title + description), szerokość kontenera, padding, tło (kolor / gradient / overlay), obramowanie i zaokrąglenie. Wewnątrz zawiera powtarzalne sloty `region`, do których wstawiamy inne widgety.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Heading** | `label`, `title`, `description` |
| **Layout** | `containerWidth` (content/wide/full), `maxWidth` (none/4xl–7xl), `paddingBlock` (sm/md/lg/xl), `paddingInline` (none/sm/md/lg) |
| **Semantics** | `element` (section/div), `anchorId`, `ariaLabel` |
| **Style** | `backgroundColor`, `gradientFrom`, `gradientTo`, `gradientAngle`, `borderColor`, `borderWidth` (0–3px), `radius` (none/lg/xl/2xl), `overlayColor`, `overlayOpacity` |

### 2.2 Tryby edytora

- **Wizard** — szybki start: wariant (dropdown), tytuł, opis, kolor tła
- **Visual** — pełna kontrola: wariant (karty), heading, semantics, szerokość/padding, surface/borders
- **Advanced** — tokeny techniczne: anchorId, ariaLabel, gradient angle, overlay opacity, raw JSON snapshot

### 2.3 Renderowanie

- Zewnętrzny element: `<section>` lub `<div>` (sterowany przez `semantics.element`)
- Regiony: `<div data-section-region="...">` z listą widgetów
- Puste regiony: placeholder „Empty region."
- Overlay: absolute div z opacity i backgroundColor
- Heading: `<header>` z `<p>` (label), `<h3>` (title), `<p>` (description)

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (blokują podstawowe scenariusze użycia)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | Brak kontroli wysokości sekcji (min-height) — nie można zrobić sekcji fullscreen (100vh) | Layout |
| C2 | Brak obsługi tła jako obrazu/wideo — wyłącznie kolor i gradient | Styl |
| C3 | Brak kontroli koloru i rozmiaru tekstu nagłówka sekcji — hardcoded `h3 text-2xl`, `text-xs`, `text-sm` | Typografia |
| C4 | Brak poziomu semantycznego nagłówka (h1–h6) — zawsze `<h3>`, ryzyko błędów SEO i dostępności | Dostępność / SEO |
| C5 | Brak układu poziomego regionów — regiony zawsze w kolumnie (flex-col); brak opcji grid/row | Layout |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | Brak presetów dla sekcji — każda konfiguracja od zera | Workflow |
| W2 | Brak cieni (box-shadow) dla powierzchni sekcji | Styl |
| W3 | Brak animacji/przejść (scroll effects, fade-in) | Efekty |
| W4 | Brak niestandardowych nazw regionów — wszystkie jako generyczne „Region" | UX struktury |
| W5 | Brak kontroli alignmentu nagłówka (zawsze left-aligned) | Typografia |
| W6 | Brak responsywnych wariantów paddingu (inny padding na mobile/desktop) | Responsywność |
| W7 | Brak kontroli odstępu między nagłówkiem a regionami (hardcoded `gap-4`) | Layout |
| W8 | Brak kontroli odstępu między regionami (hardcoded: default=gap-6, contained=gap-4, bleed=gap-8) | Layout |
| W9 | Gradient nie ma przycisku Clear — nie można łatwo usunąć gradientu po ustawieniu (brak onClear dla gradientFrom/gradientTo) | UX edytora |
| W10 | Brak walidatora anchorId — można wpisać spacje i znaki specjalne (niepoprawne HTML id) | Walidacja |
| W11 | Brak kontroli z-index dla warstw (overlay, treść) | Styl |

### 3.3 Błędy logiczne i normalizacja (wykryte w kodzie)

| # | Problem | Lokalizacja |
|---|---------|-------------|
| B1 | `resolveSectionBorderWidth`: wartość niestandardowa daje `"1"` (fallback), ale default to `"0"` — niespójność | `section.tsx:181` |
| B2 | `resolveSectionRadius`: wartość niestandardowa daje `"2xl"` zamiast `"none"` (brak spójności z defaults) | `section.tsx:185` |
| B3 | `containerWidth: "content"` i `"wide"` generują identyczne klasy CSS (`mx-auto w-full`) — różnica tylko w intencji, brak wizualnego efektu | `section.tsx:149` |
| B4 | `gradientAngle` i `overlayOpacity` są zduplikowane w Visual i Advanced edytorze — podwójne pola dla tej samej wartości | `SectionEditors.tsx:669,826` |
| B5 | `borderColor` akceptuje CSS zmienne (np. `var(--color-border)`) ale color picker nadpisuje je hexem — utrata zmiennych | `SectionEditors.tsx:689` |

### 3.4 Ulepszenia UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | Wizard ma „Section title" + „Description" ale brak pola „Label" (dostępne tylko w Visual) — asymetria | Wizard editor |
| U2 | Gradient angle i overlay opacity są tylko polami numerycznymi — brak suwaka / wizualnego selectora kąta | Edytor |
| U3 | `maxWidth` podaje tylko techniczne nazwy Tailwind (4xl, 5xl, 6xl, 7xl) zamiast wartości px (896px, 1024px...) | Edytor |
| U4 | Brak informacji o tym, że gradient nadpisuje kolor tła — potencjalne zdezorientowanie użytkownika | Edytor |
| U5 | Brak podglądu gradientu / overlay przed zastosowaniem | Edytor |
| U6 | Wariant wybrany w Wizard (dropdown) vs Visual (karty) — różny UI dla tego samego ustawienia | Spójność |
| U7 | Brak walidacji URL/formatu kolorów w polach tekstowych | Walidacja |
| U8 | Brak komunikatu kiedy region jest pusty na froncie — ditto admin, tylko w admin jest „Empty region." | Frontend UX |

---

## 4. Testy Playwright — Admin UI

> **Status:** Zakończony

### 4.1 Środowisko testowe

- **URL:** http://localhost:5173/admin
- **Login:** patryk.ciechanski@patrykiti.pl
- **Strona testowa:** `Section Widget Test` (nowa, dedykowana strona)
- **Sesja Playwright:** `section-widget-test` (izolowana)

### 4.2 Wyniki testów

#### 4.2.1 Edytor — Wizard

| Test | Wynik | Uwagi |
|------|-------|-------|
| Wariant — dropdown (Default / Contained / Bleed) | ✅ Działa | Poprawnie synchronizuje się z Visual |
| Pole „Section title" | ✅ Działa | Renderuje jako `<h3>` w canvas |
| Pole „Description" | ✅ Działa | Renderuje jako `<p class="text-sm">` |
| Pole „Background color" (+ Clear) | ✅ Działa | Clear poprawnie kasuje wartość |
| Brak pola „Label" | ❌ Asymetria | Label dostępne tylko w Visual — Wizard jest niekompletny |
| Przycisk „Continue to layout and styling" | ✅ Działa | Przełącza na zakładkę Visual |

#### 4.2.2 Edytor — Visual

| Test | Wynik | Uwagi |
|------|-------|-------|
| Variant cards (Default / Contained / Bleed) | ✅ Działa | Natychmiastowy efekt w canvas |
| Label / Title / Description | ✅ Działa | Renderuje jako p/h3/p w canvas |
| Element (section / div) | ✅ Działa | Zmienia outer HTML element |
| Anchor ID | ⚠️ Problem | Brak walidacji — akceptuje spacje i `!@#` — generuje nieprawidłowe `id` w HTML |
| Aria label | ✅ Działa | Poprawnie dodawane jako `aria-label` |
| Container width (Content / Wide / Full) | ⚠️ Problem | „Content" i „Wide" dają IDENTYCZNE klasy CSS (`mx-auto w-full`) — brak wizualnej różnicy |
| Max width (4xl–7xl) | ✅ Działa | Poprawnie aplikuje max-width |
| Vertical padding (sm/md/lg/xl) | ✅ Działa | |
| Side padding (none/sm/md/lg) | ✅ Działa | |
| Background color (+ Clear) | ✅ Działa | |
| Gradient start / end | ⚠️ Problem | **Brak przycisku Clear** — po ustawieniu nie można łatwo wyczyścić gradientu |
| Gradient angle (number input) | ✅ Działa | Domyślnie 180deg (top→bottom) |
| Border color | ⚠️ Problem | Color picker nadpisuje CSS zmienną `var(--color-border)` hexem `#e2e8f0` |
| Border width (0/1/2/3px) | ✅ Działa | Poprawnie aplikowane |
| Corner radius | ✅ Działa | |
| Overlay color | ✅ Działa | |
| Overlay opacity (%) | ✅ Działa | Sprawdzono: `opacity: 0.5` w DOM przy 50% |
| Add Region / Remove Region | ✅ Działa | Poprawny limit min=1, max=8 |
| Add Region — disabled przy max=8 | ✅ Działa | Przycisk staje się `disabled` |
| Remove — ukryte przy min=1 | ✅ Działa | Przycisk nie pojawia się przy 1 regionie |

#### 4.2.3 Edytor — Advanced

| Test | Wynik | Uwagi |
|------|-------|-------|
| Anchor ID | ✅ Działa | Pole zsynchronizowane z Visual |
| Aria label | ✅ Działa | |
| Gradient angle (duplikat z Visual) | ❌ Bug | To samo pole co w Visual — zbędna duplikacja |
| Overlay opacity (duplikat z Visual) | ❌ Bug | To samo pole co w Visual — zbędna duplikacja |
| Raw payload snapshot | ✅ Działa | JSON poprawnie odzwierciedla aktualny stan |
| Layout (Container, Padding top/bottom, Margin top/bottom) | ✅ Działa | Globalny system layoutu strony — oddzielny od Section's własnego layoutu |
| Visibility (Desktop/Tablet/Mobile toggle) | ✅ Działa | Globalne przełączniki widoczności — nie ma w `SectionData` |

**Nowe odkrycie:** Advanced editor zawiera DODATKOWE sekcje (`Layout`, `Visibility`) których NIE MA w kodzie `SectionAdvancedEditor.tsx`. Te kontrolki pochodzą z globalnego wrappera edytora i działają dla wszystkich widgetów, nie tylko Section.

#### 4.2.4 Zachowanie wariantów w canvas

| Wariant | Klasy outer elementu | Shadow | Odstęp między regionami | Uwagi |
|---------|---------------------|--------|------------------------|-------|
| `default` | `mx-auto w-full [maxWidth] [paddingInline]` | brak | `gap-6` | |
| `contained` | `mx-auto w-full [maxWidth] [paddingInline]` | `shadow-sm` | `gap-4` | Shadow widoczne w canvas |
| `bleed` + `full container` | `w-full [maxWidth]` | brak | `gap-8` | Uwaga: bez `mx-auto` i bez `paddingInline` |
| `bleed` + `content container` | `mx-auto w-full [maxWidth] [paddingInline]` | brak | `gap-8` | Mylące: variant "bleed" bez zmian w containerWidth nie daje efektu bleed |

**Problem Bleed:** Wariant `bleed` opisany jako „Full-width section for edge-to-edge layouts" wymaga DODATKOWO ustawienia `containerWidth: full` i `maxWidth: none`, żeby faktycznie być edge-to-edge. Sama zmiana wariantu na „bleed" nie powoduje pełnej szerokości — to jest mylące dla użytkownika.

#### 4.2.5 Weryfikacja DOM

```
Struktura HTML (Default variant):
<section data-section-variant="default"
         data-section-container-width="full"
         data-section-max-width="6xl"
         data-section-regions="1"
         data-section-element="section"
         class="w-full max-w-6xl px-6">
  <div class="relative w-full overflow-hidden py-6 rounded-xl"
       style="background-color: transparent;
              border-color: var(--color-border);
              border-style: solid;
              border-width: 2px;
              background-image: linear-gradient(rgb(59,130,246), rgb(139,92,246));">
    <div class="pointer-events-none absolute inset-0 z-[0]"
         style="background-color: rgb(0,0,0); opacity: 0.5;"></div>
    <div class="relative z-[1] flex flex-col gap-4">
      <header class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/70">Featured Content</p>
        <h3 class="text-2xl font-semibold text-[var(--color-text)]">Test Section Title</h3>
        <p class="text-sm text-[var(--color-text)]/75">This is a test description...</p>
      </header>
      <div class="flex flex-col gap-6">   ← ZAWSZE flex-col, brak opcji row/grid
        <div data-section-region="region:1" class="space-y-4">
          <div class="rounded-md border border-dashed ...">Empty region.</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Potwierdzenia z DOM:**
- Heading title zawsze `<h3>` (hardcoded) ← Potwierdzone Issue C4
- Regiony zawsze `flex flex-col` (bez opcji layout) ← Potwierdzone Issue C5
- Anchor ID `"my section anchor with spaces and !@#"` akceptowany bez walidacji ← Potwierdzone Issue W10
- `content` i `wide` containerWidth — identyczne klasy CSS ← Potwierdzone Issue B3

---

## 5. Testy Playwright — Frontend

> **Status:** Ograniczony — problemy z autentykacją

### 5.1 Środowisko testowe

- **URL:** http://localhost:3000

### 5.2 Wyniki testów

#### 5.2.1 Przyczyna ograniczonego testu

Podczas testów napotkano **401 Unauthorized** przy próbach:
- `POST /admin/api/pages/{id}` (Save draft)
- `POST /admin/api/pages/{id}/publish` (Publish)
- Wbudowany Preview w edytorze (Runtime preview — "Not authenticated")

Strona testowa `Section Widget Test` nie mogła zostać opublikowana/zapisana, więc nie jest dostępna pod `http://localhost:3000/section-widget-test`.

#### 5.2.2 Sprawdzone istniejące strony

Sprawdzono wszystkie dostępne strony na froncie (`/`, `/homepage`, `/ux-audit-scratch-0516`, `/fsdsfsdf`, `/examples`) — żadna nie zawiera widgetów Section (`[data-section-variant]`). Brak możliwości pełnego testu porównawczego Admin ↔ Frontend.

#### 5.2.3 Wnioski z porównania kodu

Na podstawie analizy kodu (`SectionBlock` w `section.tsx`) i renderowania w admin canvas:

| Aspekt | Admin Canvas | Frontend |
|--------|-------------|---------|
| Renderowanie widgetu | ✅ Identyczny komponent `SectionBlock` | ✅ Identyczny komponent `SectionBlock` |
| CSS klasy | ✅ Tailwind (identyczne) | ✅ Tailwind (identyczne) |
| Inline styles | ✅ Identyczne | ✅ Identyczne |
| „Empty region." placeholder | ✅ Widoczny w admin | ❓ **Prawdopodobnie też widoczny na froncie** — brak warunkowego ukrycia na produkcji |

**Potencjalny problem na froncie (P1):** Placeholder „Empty region." jest renderowany przez `SectionBlock` zawsze gdy region nie ma widgetów. Nie ma warunkowego kodu ukrywającego ten placeholder na produkcji. Oznacza to, że pusta sekcja na opublikowanej stronie wyświetla tekst „Empty region." użytkownikom końcowym.

---

## 6. Porównanie Admin ↔ Frontend

> **Status:** Częściowy (ograniczony autentykacją)

### 6.1 Zachowanie identyczne

- Komponent renderujący `SectionBlock` jest współdzielony — brak rozdwojenia logiki
- CSS (Tailwind klasy + inline style) identyczny w obu środowiskach
- Gradient, border, radius, overlay — renderowanie takie same

### 6.2 Różnice i potencjalne problemy na froncie

| Problem | Opis | Priorytet |
|---------|------|-----------|
| „Empty region." widoczne na froncie | Placeholder nie jest ukrywany na produkcji — użytkownik końcowy widzi techniczny tekst | **P1** |
| Brak `mx-auto` dla `containerWidth: "full"` na froncie | Gdy strona ma globalne margin auto layout, sekcja może wyglądać inaczej niż w admin canvas | Do weryfikacji |
| Admin canvas vs site theme | Canvas używa admin theme (zmienne CSS admin), frontend używa site theme — kolory mogą wyglądać inaczej | Oczekiwane |

---

## 7. Priorytetyzacja rekomendacji

| Priorytet | Problem | Nakład | Wpływ |
|-----------|---------|--------|-------|
| **P0** | B4 — usunąć zduplikowane `gradientAngle` + `overlayOpacity` z Advanced editora | Niski | Czytelność UI |
| **P0** | B1/B2 — naprawić fallback w `resolveSectionBorderWidth` i `resolveSectionRadius` | Niski | Poprawność normalizacji |
| **P0** | W10 — walidacja Anchor ID (brak spacji, tylko `[a-zA-Z0-9-_]`) | Niski | Poprawność HTML |
| **P0** | Sekcja 6.2 — ukryć „Empty region." na froncie (conditional render) | Niski | UX użytkownika końcowego |
| **P1** | C4 — poziom nagłówka (h1-h6) jako konfigurowalny — zamiast hardcoded `h3` | Niski–Średni | SEO / Dostępność |
| **P1** | B3 — rozróżnienie lub usunięcie opcji „Wide" (duplikat „Content" w CSS) | Niski | Spójność UI |
| **P1** | W9 — przycisk Clear dla `gradientFrom`/`gradientTo` | Niski | UX edytora |
| **P1** | U1 — dodać pole „Label" do edytora Wizard | Niski | Kompletność Wizard |
| **P1** | Bleed variant — auto-ustawienie `containerWidth: full` przy wyborze wariantu bleed | Niski–Średni | UX / zgodność opisu |
| **P1** | C1 — min-height / fullscreen sekcja (100vh) | Średni | Layout |
| **P1** | C5 — układ poziomy regionów (grid/row option) | Wysoki | Layout |
| **P2** | C3 — kolory i rozmiar tekstu nagłówka sekcji | Średni | Styl |
| **P2** | U3 — przyjazne nazwy maxWidth z wartościami px | Niski | UX edytora |
| **P2** | U2 — suwak dla opacity/angle zamiast number input | Niski | UX edytora |
| **P2** | C2 — obraz/wideo jako tło sekcji | Wysoki | Styl |
| **P2** | W1 — presety sekcji | Średni | Workflow |
| **P3** | W6 — responsywny padding (mobile vs desktop) | Wysoki | Responsywność |
| **P3** | W2 — cienie (box-shadow) dla sekcji | Niski | Styl |
| **P3** | W4 — niestandardowe nazwy regionów | Średni | UX struktury |

---

## 8. Podsumowanie sesji testowej

### Co działa poprawnie ✅

- Wszystkie 3 warianty (default, contained, bleed) przełączają się poprawnie
- Regiony: dodawanie (max 8), usuwanie (min 1), limit enforcement
- Synchronizacja stanu między zakładkami Wizard / Visual / Advanced
- Gradient, overlay, border, radius — renderowanie i DOM zgodne z konfiguracją
- Raw JSON snapshot w Advanced pokazuje poprawny, znormalizowany stan
- Element section/div — poprawna zmiana semantyki
- Padding block / inline / max-width — poprawnie aplikowane jako klasy Tailwind

### Co wymaga poprawy ❌

- **Bleed variant**: opisany jako full-width ale wymaga 2 dodatkowych ustawień (containerWidth + maxWidth) — dezorientuje
- **Anchor ID**: brak walidacji formatu — nieprawidłowe id w HTML
- **Gradient fields**: brak Clear button — trudne do wyczyszczenia
- **Advanced editor**: duplikuje pola z Visual — zbędny szum
- **Heading level**: zawsze h3 — problem SEO/dostępności
- **Regiony**: zawsze flex-col — brak opcji layoutu poziomego
- **„Empty region."**: widoczny na froncie dla użytkownika końcowego
- **Container width „Content" vs „Wide"**: identyczne CSS — brak realnej różnicy
