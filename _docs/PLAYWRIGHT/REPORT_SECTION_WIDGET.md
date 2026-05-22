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
| **Heading** | `label`, `title`, `description`, `level` (`h1`-`h6`), `align`, size tokens, optional clearable text colors |
| **Layout** | `containerWidth` (content/wide/full), `maxWidth` (none/4xl–7xl), `paddingBlock` (sm/md/lg/xl), `paddingInline` (none/sm/md/lg), `minHeight` (none/compact/hero/screen), `regionFlow` (stack/row/grid), `regionColumns` (1–8 when grid), `headingGap`, optional `regionGap` |
| **Semantics** | `element` (section/div), `anchorId`, `ariaLabel` |
| **Style** | `backgroundColor`, `gradientFrom`, `gradientTo`, `gradientAngle`, `borderColor`, `borderWidth` (0–3px), `radius` (none/lg/xl/2xl), optional `shadow`, `motion`, `overlayColor`, `overlayOpacity`, `backgroundMedia` |

### 2.2 Tryby edytora

- **Wizard** — szybki start: quick presets, ten sam card UI wariantów co Visual, label, tytuł, opis, kolor tła
- **Visual** — pełna kontrola: quick presets, wariant (karty), heading copy/level/alignment/size/color, semantics, szerokość/padding, surface/borders, shadow/motion, i derived surface preview
- **Advanced** — tokeny techniczne: anchorId, ariaLabel, raw JSON snapshot; `gradientAngle` i `overlayOpacity` nadal są zdublowane z Visual i pozostają shared drift ownerem `TASK-326`

### 2.3 Renderowanie

- Zewnętrzny element: `<section>` lub `<div>` (sterowany przez `semantics.element`)
- Regiony: `<div data-section-region="...">` z listą widgetów
- Puste regiony: placeholder „Empty region.” renderuje się już tylko w editor/admin preview po shared TASK-256 gating; nie jest bieżącym frontend defectem.
- Overlay: absolute div z opacity i backgroundColor
- Heading: `<header>` z `<p>` (label), bezpiecznym domyślnym `<h2>` (title), `<p>` (description) oraz bounded `h1`–`h6`, alignmentem, rozmiarami i opcjonalnymi clearable color fields zamkniętymi w TASK-283-03.

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (blokują podstawowe scenariusze użycia)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | Zamknięte (2026-05-21, TASK-283-01): Section ma bounded `minHeight` (`none` / `compact` / `hero` / `screen`) zamiast braku kontroli wysokości | Layout |
| C2 | Zamknięte (2026-05-21, TASK-283-02): Section ma bounded dekoracyjne tło image/video z bezpiecznym fail-closed dla nieobsługiwanych URL-i | Styl |
| C3 | Zamknięte (2026-05-21, TASK-283-03): Section ma bounded kolory i rozmiary tekstu nagłówka dla label/title/description | Typografia |
| C4 | Zamknięte (2026-05-21, TASK-283-03): Section ma bounded poziom semantyczny nagłówka `h1`–`h6` z domyślnym bezpiecznym `h2` | Dostępność / SEO |
| C5 | Zamknięte (2026-05-21, TASK-283-01): regiony mają bounded `stack` / `row` / `grid` flow z clampowanymi kolumnami grid do limitu 8 | Layout |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | Zamknięte (2026-05-21, TASK-283-04): Section ma lokalne presety `Standard content`, `Framed panel`, `Edge-to-edge`, `Hero band`, i `Two-column region group`, które zachowują heading copy i region slot content | Workflow |
| W2 | Zamknięte (2026-05-21, TASK-283-05-01): Visual ma `Surface shadow` z `Match variant` fallbackiem i tokenami `none/sm/md/lg/xl`; `contained` zachowuje legacy `shadow-sm` dopóki autor nie wybierze override | Styl |
| W3 | Zamknięte (2026-05-21, TASK-283-05-01): W3 domknięto jako bounded CSS-only reveal (`none` / `fade` / `slide-up`) z `motion-safe` / `motion-reduce`; scroll observers i parallax nie wchodzą do kontraktu Section | Efekty |
| W4 | Zamknięte (2026-05-22, TASK-283-07): Section ma editor-only custom region labels keyed by stable `region:<id>` instances; Visual structure controls, canvas slot headers, i insert-target selector pokazują nazwy autora bez public runtime leakage | UX struktury |
| W5 | Zamknięte (2026-05-21, TASK-283-03): Section ma bounded `left` / `center` / `right` alignment dla nagłówka | Typografia |
| W6 | Zamknięte (2026-05-22, TASK-283-06): Section ma bounded `mobilePaddingBlock` / `mobilePaddingInline` / `desktopPaddingBlock` / `desktopPaddingInline` z `Match base` fallbackiem i automatycznym `md` restore do base tokenu | Responsywność |
| W7 | Zamknięte (2026-05-21, TASK-283-01): odstęp nagłówek → regiony jest kontrolowany przez `layout.headingGap` zamiast hardcoded `gap-4` | Layout |
| W8 | Zamknięte (2026-05-21, TASK-283-01): `layout.regionGap` pozwala ustawić jawny token, a brak pola zachowuje legacy spacing wariantu | Layout |
| W9 | Zamknięte w aktualnym baseline (potwierdzone 2026-05-21): pola `gradientFrom` i `gradientTo` mają już przycisk Clear, a TASK-283-04 dopisał fokusowy test, więc wcześniejszy raport był stale drift | UX edytora |
| W10 | Zamknięte (2026-05-17, TASK-256-05-01): `anchorId` jest sanitizowany przed persistence/render i nie jest już aktywnym ownerem TASK-283 | Walidacja |
| W11 | Zamknięte (2026-05-21, TASK-283-02): Section ma bounded `media-under-overlay` / `overlay-under-media` ordering dla warstw dekoracyjnych | Styl |

### 3.3 Błędy logiczne i normalizacja (wykryte w kodzie)

| # | Problem | Lokalizacja |
|---|---------|-------------|
| B1 | `resolveSectionBorderWidth`: wartość niestandardowa daje `"1"` (fallback), ale default to `"0"` — niespójność | `section.tsx:515` |
| B2 | `resolveSectionRadius`: wartość niestandardowa daje `"2xl"` zamiast `"none"` (brak spójności z defaults) | `section.tsx:520` |
| B3 | `containerWidth: "content"` i `"wide"` generują identyczne klasy CSS (`mx-auto w-full`) — różnica tylko w intencji, brak wizualnego efektu | `section.tsx:254` |
| B4 | `gradientAngle` i `overlayOpacity` są zduplikowane w Visual i Advanced edytorze — podwójne pola dla tej samej wartości | `SectionEditors.tsx:1473,1564,1868,1887` |
| B5 | `borderColor` akceptuje CSS zmienne (np. `var(--color-border)`), ale shared color swatch nadal nadpisuje je hexem przy zmianie pickera — reopened owner `TASK-327` | `SectionEditors.tsx:1493` |

### 3.4 Ulepszenia UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | Zamknięte (2026-05-21, TASK-283-03): Wizard ma teraz także pole `Label`, więc heading model jest kompletny bez przechodzenia do Visual | Wizard editor |
| U2 | Otwarte: `gradientAngle` i `overlayOpacity` nadal są numeric-only; finalny slider/stepper owner przechodzi do `TASK-283-05-02` po shared cleanup w `TASK-326` | Edytor |
| U3 | Zamknięte (2026-05-21, TASK-283-04): `maxWidth` pokazuje przyjaźniejsze etykiety (`4XL (56rem / 896px)` ... `7XL (80rem / 1280px)`) bez zmiany zapisanych tokenów | Edytor |
| U4 | Zamknięte (2026-05-21, TASK-283-04): Visual wyjaśnia, że dwa gradient stop-y stają się widoczną powierzchnią, a kolor tła pozostaje fallbackiem po wyczyszczeniu gradientu | Edytor |
| U5 | Zamknięte (2026-05-21, TASK-283-05-01): Visual ma teraz derived `Surface preview`, który pokazuje gradient, overlay, border, radius, i effective shadow bez dodatkowego persisted state | Edytor |
| U6 | Zamknięte (2026-05-21, TASK-283-04): Wizard i Visual używają już tego samego card UI dla wariantów, a Wizard dodatkowo pokazuje quick presets | Spójność |
| U7 | Brak walidacji URL/formatu kolorów w polach tekstowych | Walidacja |
| U8 | Zamknięte (2026-05-17, TASK-256-03 + TASK-256-05-01): placeholder „Empty region.” jest już ograniczony do editor/admin preview i nie jest aktywnym frontend defectem | Frontend UX |

---

## 4. Testy Playwright — Admin UI

> **Status:** Zakończony

### 4.1 Środowisko testowe

- **URL:** http://localhost:5173/admin
- **Login:** admin test account (redacted)
- **Strona testowa:** `Section Widget Test` (nowa, dedykowana strona)
- **Sesja Playwright:** `section-widget-test` (izolowana)

### 4.2 Wyniki testów

#### 4.2.1 Edytor — Wizard

| Test | Wynik | Uwagi |
|------|-------|-------|
| Quick presets (`Standard content`, `Framed panel`, `Edge-to-edge`, `Hero band`, `Two-column region group`) | ✅ Działa | Zachowują heading copy i region slot content, a preset `Hero band` oraz `Two-column region group` potwierdzają wielopolowe patche Section-owned tokenów |
| Wariant — karty (Default / Contained / Bleed) | ✅ Działa | Wizard i Visual używają już tego samego card UI |
| Pole „Section title" | ✅ Działa | W sesji 2026-05-16 renderowało się jako `<h3>`; bieżący baseline po TASK-256-05-01 używa bezpiecznego `<h2>` |
| Pole „Description" | ✅ Działa | Renderuje jako `<p class="text-sm">` |
| Pole „Background color" (+ Clear) | ✅ Działa | Clear poprawnie kasuje wartość |
| Pole „Label" | ✅ Działa | Zamknięte przez TASK-283-03; Wizard jest kompletny względem heading copy |
| Przycisk „Continue to layout and styling" | ✅ Działa | Przełącza na zakładkę Visual |

#### 4.2.2 Edytor — Visual

| Test | Wynik | Uwagi |
|------|-------|-------|
| Variant cards (Default / Contained / Bleed) | ✅ Działa | Natychmiastowy efekt w canvas; ten sam card UI co w Wizard |
| Quick presets | ✅ Działa | Te same preset cards co w Wizard; preset `Two-column region group` ustawia grid 2-col, a `Hero band` centruje heading bez utraty copy |
| Label / Title / Description | ✅ Działa | W aktualnym baseline renderuje jako p/h2/p; sesja 2026-05-16 miała jeszcze historyczne p/h3/p przed TASK-256-05-01 |
| Element (section / div) | ✅ Działa | Zmienia outer HTML element |
| Anchor ID | Historyczne | W sesji 2026-05-16 brakowało walidacji; bieżący baseline po TASK-256-05-01 sanitizuje `anchorId` przed persistence/render |
| Aria label | ✅ Działa | Poprawnie dodawane jako `aria-label` |
| Container width (Content / Wide / Full) | ⚠️ Problem | „Content" i „Wide" dają IDENTYCZNE klasy CSS (`mx-auto w-full`) — brak wizualnej różnicy |
| Max width (4xl–7xl) | ✅ Działa | Friendly labels pokazują rem/px, ale zapisane tokeny pozostają `4xl`–`7xl` |
| Vertical padding (sm/md/lg/xl) | ✅ Działa | |
| Side padding (none/sm/md/lg) | ✅ Działa | |
| Background color (+ Clear) | ✅ Działa | |
| Gradient start / end | ✅ Działa | Pola mają Clear; guidance wyjaśnia, że aktywny gradient staje się widoczną powierzchnią nad background color |
| Gradient angle (number input) | ✅ Działa | Domyślnie 180deg (top→bottom); finalny slider/stepper owner pozostaje w `TASK-283-05-02` po `TASK-326` |
| Border color | ⚠️ Problem | Color picker nadpisuje CSS zmienną `var(--color-border)` hexem `#e2e8f0` |
| Border width (0/1/2/3px) | ✅ Działa | Poprawnie aplikowane |
| Corner radius | ✅ Działa | |
| Surface shadow | ✅ Działa | `Match variant` zachowuje legacy `contained -> shadow-sm`, a explicit override obsługuje `none/sm/md/lg/xl` |
| Overlay color | ✅ Działa | |
| Overlay opacity (%) | ✅ Działa | Sprawdzono: `opacity: 0.5` w DOM przy 50%; slider UX pozostaje w `TASK-283-05-02` po `TASK-326` |
| Surface motion | ✅ Działa | `none` / `fade` / `slide-up`; CSS-only `motion-safe` / `motion-reduce`, bez scroll observerów |
| Surface preview | ✅ Działa | Derived swatch pokazuje gradient, overlay, border, radius, i effective shadow bez dodatkowego persisted state |
| Add Region / Remove Region | ✅ Działa | Poprawny limit min=1, max=8 |
| Add Region — disabled przy max=8 | ✅ Działa | Przycisk staje się `disabled` |
| Remove — ukryte przy min=1 | ✅ Działa | Przycisk nie pojawia się przy 1 regionie |

#### 4.2.3 Edytor — Advanced

| Test | Wynik | Uwagi |
|------|-------|-------|
| Anchor ID | ✅ Działa | Pole zsynchronizowane z Visual |
| Aria label | ✅ Działa | |
| Gradient angle (duplikat z Visual) | ❌ Shared drift | To samo pole co w Visual — zbędna duplikacja, owner `TASK-326` |
| Overlay opacity (duplikat z Visual) | ❌ Shared drift | To samo pole co w Visual — zbędna duplikacja, owner `TASK-326` |
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

**Problem Bleed:** Rzeczywisty edge-to-edge nadal wymaga DODATKOWO ustawienia `containerWidth: full` i `maxWidth: none`. TASK-283-04 urealnił copy edytora do `Expanded section band. Pair with Full-width wrapper + No max width for true edge-to-edge.`, ale bazowa semantyka `content` / `wide` / `bleed` pozostaje shared ownerem `TASK-326`.

#### 4.2.5 Weryfikacja DOM

```
Struktura HTML (historyczna sesja 2026-05-16 — Default variant):
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
- Heading title było hardcoded `<h3>` w sesji 2026-05-16; baseline został zamknięty w TASK-256-05-01, a otwarte pozostaje dopiero konfigurowalne `h1`–`h6` z TASK-283-03.
- Regiony były zawsze `flex flex-col` w sesji 2026-05-16; issue C5 jest zamknięte od 2026-05-21 przez TASK-283-01.
- Anchor ID z nieprawidłowymi znakami był akceptowany w sesji 2026-05-16; issue W10 jest zamknięte od 2026-05-17 przez TASK-256-05-01.
- `content` i `wide` containerWidth — identyczne klasy CSS ← Potwierdzone Issue B3

---

## 5. Testy Playwright — Frontend

> **Status:** Zakończony

### 5.1 Środowisko testowe

- **URL:** http://localhost:3000
- **Strona testowa:** `Section Widget Test` (`/section-widget-test`) — UUID: `0426f80c-46d1-4200-8b8c-9fa89187dad8`
- **Konfiguracja widgetu:** variant `default`, gradient `#3b82f6 → #8b5cf6` (180°), border 2px, title „Test Section Title", description, 1 pusty region
- **Uwaga:** W poprzedniej sesji testowej napotkano **401 Unauthorized** spowodowany przekroczeniem limitu aktywnych sesji per user w ustawieniach CMS-a. Limit zwiększony do 30 — bieżąca sesja przeszła bez błędów.

### 5.2 Wyniki testów

#### 5.2.1 Renderowanie strony — weryfikacja podstawowa

| Test | Wynik | Szczegóły |
|------|-------|-----------|
| Strona `/section-widget-test` dostępna | ✅ | HTTP 200, tytuł „Section Widget Test" |
| Element `[data-section-variant]` obecny w DOM | ✅ | `data-section-variant="default"` |
| Element HTML outer — `section` vs `div` | ✅ | `<section>` — zgodnie z ustawieniem `semantics.element = section` |
| Gradient renderuje się na froncie | ✅ | `background-image: linear-gradient(180deg, #3b82f6, #8b5cf6)` obecny w `style` |
| Border 2px renderuje się na froncie | ✅ | `border-width: 2px; border-style: solid` |
| Nagłówek sekcji widoczny | ✅ | W sesji 2026-05-16 był to `<h3>`; aktualny baseline po TASK-256-05-01 używa bezpiecznego `<h2>` |
| Opis sekcji widoczny | ✅ | `<p class="text-sm">This is a test description...</p>` obecny |

#### 5.2.2 Weryfikacja DOM — szczegóły struktury

```
Struktura HTML (historyczna sesja 2026-05-16 — Frontend Default variant):
<section class="mx-auto w-full max-w-6xl px-6"
         data-section-variant="default"
         data-section-container-width="content"
         data-section-max-width="6xl"
         data-section-regions="1"
         data-section-element="section">
  <div class="relative w-full overflow-hidden py-6"
       style="background-color: transparent;
              background-image: linear-gradient(180deg, #3b82f6, #8b5cf6);
              border-color: var(--color-border);
              border-style: solid;
              border-width: 2px;">
    <div class="relative z-[1] flex flex-col gap-4">
      <header class="space-y-2">
        <h3 class="text-2xl font-semibold text-[var(--color-text)]">Test Section Title</h3>
        <p class="text-sm text-[var(--color-text)]/75">This is a test description for Section Widget.</p>
      </header>
      <div class="flex flex-col gap-6">
        <div class="space-y-4" data-section-region="region:1">
          <div class="rounded-md border border-dashed ...">Empty region.</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

#### 5.2.3 Wariant „contained" — weryfikacja shadow

Zmieniono wariant na `contained`, opublikowano i sprawdzono frontend:

| Aspekt | Wynik | Szczegóły |
|--------|-------|-----------|
| Outer element classes | ✅ Identyczne | `mx-auto w-full max-w-6xl px-6` — takie same jak default |
| Inner element shadow | ✅ Działa | Dodana klasa `shadow-sm` — widoczny cień ramy sekcji |
| Gradient i border | ✅ Zachowane | Bez zmian względem default |

#### 5.2.4 Potwierdzone problemy z frontendu

| Problem | Wynik | Szczegóły |
|---------|-------|-----------|
| „Empty region.” widoczny na froncie | Historyczne | Potwierdzone w sesji 2026-05-16; zamknięte od 2026-05-17 przez TASK-256-03 + TASK-256-05-01 |
| Hardcoded `<h3>` dla headingu | Historyczne | Potwierdzone w sesji 2026-05-16; baseline zamknięty w TASK-256-05-01, a otwarty owner dotyczy już tylko konfigurowalnego poziomu z TASK-283-03 |
| Regiony zawsze `flex flex-col` | Historyczne | Potwierdzone w sesji 2026-05-16; zamknięte od 2026-05-21 przez TASK-283-01 |

#### 5.2.5 Responsywność — mobile (375px)

| Test | Wynik | Szczegóły |
|------|-------|-----------|
| Sekcja wypełnia pełną szerokość | ✅ | `sectionWidth: 375px`, `sectionLeft: 0` |
| Brak poziomego overflow | ✅ | `scrollWidth ≤ innerWidth` |
| Padding boczny zachowany | ✅ | Opublikowana próbka bez responsive override dalej ma `padding-left: 24px / padding-right: 24px` (`px-6`); od 2026-05-22 `TASK-283-06` dodaje jawne mobile/desktop overrides, gdy autor je wybierze |
| Gradient widoczny | ✅ | Renderuje się poprawnie na mobile |
| „Empty region.” widoczny | Historyczne | Potwierdzone na mobile w sesji 2026-05-16; zamknięte od 2026-05-17 przez shared TASK-256 placeholder gating |

---

## 6. Porównanie Admin ↔ Frontend

> **Status:** Zakończony

### 6.1 Zachowanie identyczne

| Aspekt | Admin Canvas | Frontend | Wynik |
|--------|-------------|---------|-------|
| Komponent renderujący | `SectionBlock` | `SectionBlock` | ✅ Identyczny |
| Outer element tag | `<section>` | `<section>` | ✅ Identyczny |
| Outer element klasy CSS | `mx-auto w-full max-w-6xl px-6` | `mx-auto w-full max-w-6xl px-6` | ✅ Identyczne |
| Inline styles (gradient, border) | `linear-gradient(180deg, #3b82f6, #8b5cf6)`, `border-width: 2px` | Identyczne | ✅ |
| Heading tag | Historyczne `<h3 class="text-2xl font-semibold">`; obecny baseline po TASK-256-05-01 używa bezpiecznego `<h2>` | Taki sam obecny baseline | ✅ Identyczny |
| Regiony układ | Historyczna sesja 2026-05-16 miała `flex flex-col gap-4` + `flex flex-col gap-6`; obecny baseline po TASK-283-01 pozwala już na `stack` / `row` / `grid` | Identyczny owner/runtime | ✅ |
| data-atrybuty HTML | `data-section-variant`, `data-section-regions`, itd. | Identyczne | ✅ |
| Contained variant shadow | `shadow-sm` na inner div | `shadow-sm` na inner div | ✅ Identyczny |

### 6.2 Różnice i potwierdzone problemy

| Problem | Admin Canvas | Frontend | Priorytet | Status |
|---------|-------------|---------|-----------|--------|
| „Empty region.” widoczny | ✅ Widoczny (oczekiwane w admin) | Historyczne potwierdzenie sesji 2026-05-16 | Shared TASK-256 | Zamknięte 2026-05-17 |
| CSS zmienne — `--color-text` | Puste (admin nie ustawia) | `#0f172a` (dark navy, site theme) | Oczekiwane | Potwierdzone |
| CSS zmienne — `--color-bg` | Puste | `#ffffff` (white, site theme) | Oczekiwane | Potwierdzone |
| CSS zmienne — `--color-border` | `#1d170f` (dark admin border) | `#e2e8f0` (light gray, site theme) | Oczekiwane | Potwierdzone |
| Admin theme zmienne | `--admin-base-bg: #000000`, `--admin-base-text: #f0e8d5` | Brak `--admin-*` zmiennych | Oczekiwane | Potwierdzone |

**Wnioski do sekcji 6.2:**
- **„Empty region.”** — historyczny P0 z sesji 2026-05-16; zamknięty od 2026-05-17 przez TASK-256-03 + TASK-256-05-01 i nie jest już aktywnym ownerem TASK-283.
- **Kolory CSS zmiennych** — `var(--color-border)` na froncie = `#e2e8f0` (jasny), w admin canvas = `#1d170f` (ciemny). Sekcja z `borderColor: var(--color-border)` będzie wyglądała inaczej w obu środowiskach — to zachowanie oczekiwane, ale potencjalnie dezorientujące podczas edycji.
- **Brak `mx-auto` dla `containerWidth: "full"` na bleed** — potwierdzone w kodzie (sekcja 4.2.4), niesprawdzone wizualnie na froncie (brak opublikowanej strony z bleed+full variant). Logika kodu jest taka sama po obu stronach, więc zachowanie powinno być identyczne.

---

## 7. Priorytetyzacja rekomendacji

| Priorytet | Problem | Nakład | Wpływ |
|-----------|---------|--------|-------|
| **P0** | TASK-326 — domknąć shared truthfulness drift: fallback `borderWidth` / `radius`, dublowanie `gradientAngle` / `overlayOpacity`, oraz obecne semantyki `content` / `wide` / `bleed` | Niski–Średni | Poprawność normalizacji / Truthfulness UI |
| **P1** | TASK-283-05-02 — po `TASK-326` zamienić pozostałe numeric-only pola `gradientAngle` / `overlayOpacity` na finalny slider/stepper UX bez dublowania ownera | Średni | UX edytora / Truthfulness |
| **P1** | TASK-327 — domknąć shared color-swatch token drift, żeby `SharedColorFieldInputs` nie zamieniał CSS-variable/custom token text na hex przy zmianie swatcha | Średni | Shared editor truthfulness |
| **P3** | TASK-283-08 — zsynchronizować końcowe report/docs/changelog/board po domknięciu wszystkich owner leaves | Niski | Evidence hygiene |

## 8. Podsumowanie sesji testowej

### Co działa poprawnie ✅

- Wszystkie 3 warianty (default, contained, bleed) przełączają się poprawnie
- Regiony: dodawanie (max 8), usuwanie (min 1), limit enforcement
- Custom region labels są zamknięte przez `TASK-283-07`: autor może nazwać regiony bez zmiany `region:<id>` slot ids, a Visual/canvas/insert-target surfaces pokazują te nazwy tylko w adminie
- Synchronizacja stanu między zakładkami Wizard / Visual / Advanced
- Gradient, overlay, border, radius — renderowanie i DOM zgodne z konfiguracją
- Surface shadow / motion / preview są zamknięte przez `TASK-283-05-01`: contained zachowuje legacy `shadow-sm`, autor może wybrać bounded `none/sm/md/lg/xl`, a motion pozostaje CSS-only (`none` / `fade` / `slide-up`)
- Raw JSON snapshot w Advanced pokazuje poprawny, znormalizowany stan
- Element section/div — poprawna zmiana semantyki
- Padding block / inline / max-width — poprawnie aplikowane jako klasy Tailwind
- Quick presets i spójne Wizard/Visual variant cards są zamknięte przez TASK-283-04; preset workflows zachowują heading copy i region slot content
- Friendly max-width labels oraz gradient/background guidance są obecne w bieżącym edytorze po TASK-283-04
- Background media: dekoracyjne image/video tła, poster dla video, bounded blend/layer ordering, i fail-closed dla nieobsługiwanych źródeł są zamknięte przez TASK-283-02
- Heading controls: Wizard `Label`, bounded `h1`–`h6`, alignment, size tokens, i clearable heading colors są zamknięte przez TASK-283-03
- Responsive spacing: Section ma teraz bounded mobile/desktop padding overrides z `Match base` fallbackiem; mobile-only override wraca do base tokenu od `md` wzwyż bez raw CSS

### Co wymaga poprawy ❌

- **Bleed variant**: rzeczywisty edge-to-edge nadal wymaga dodatkowo `containerWidth: full` i `maxWidth: none`; shared owner `TASK-326` ma domknąć bazową semantykę kontrolek.
- **Shared truthfulness**: obecne Section owner nadal ma błędne fallback defaults, zdublowane `gradientAngle` / `overlayOpacity`, oraz obecne semantyki `content` / `wide` / `bleed`; to zostało wycięte do `TASK-326` zamiast lokalnej łaty w `TASK-283`.
- **Shared color-swatch token drift**: `SharedColorFieldInputs` nadal zapisuje hex przez domyślny `onChange`, gdy aktywny jest CSS variable/custom token; ownerem jest `TASK-327`, nie Section-local leaf.
- **Angle/opacity UX**: finalne slider/stepper controls czekają na `TASK-283-05-02` po domknięciu shared owner drift w `TASK-326`.
- **Container width „Content" vs „Wide"**: identyczne CSS — shared truthfulness drift ownerem jest `TASK-326`, nie lokalny leaf TASK-283.

### Uwagi do sesji testowej

- Sesja Playwright #3 (Admin UI) była ograniczona błędem 401 spowodowanym limitem sesji per user w CMS — limit zwiększony do 30.
- Sesja Playwright #3b (Frontend) — zakończona w pełni: strona `Section Widget Test` opublikowana, przetestowana na desktop i mobile (375px).
- Kluczowy wynik historycznej sesji 2026-05-16: potwierdziła ona trzy ważne baseline defects (`Empty region.`, hardcoded `<h3>`, `flex-col`), ale dwa pierwsze zostały już zamknięte w TASK-256, a layout flow został zamknięty w TASK-283-01.

---

## Status po shared baseline i kolejnych leafach (audit 2026-05-22)

- `TASK-256-03` + `TASK-256-05-01`: public runtime no longer renders the
  editor-only `Empty region.` placeholder. Builder affordances are now gated by
  the shared render-context path and stay visible only in editor/admin preview.
- `TASK-256-05-01`: anchor IDs are now sanitized before persistence/render, and
  the default section heading level moved off the hardcoded `<h3>` path.
- `TASK-283-01`: Section now owns bounded `minHeight`, `regionFlow`,
  `regionColumns`, `headingGap`, and optional `regionGap`, so report findings
  C1, C5, W7, and W8 are no longer active.
- `TASK-283-04`: Section editors now ship local presets, friendly width
  labels, consistent Wizard/Visual variant cards, and explicit
  gradient/background guidance; the focused editor suite also proves current
  gradient Clear buttons are present, closing stale report row W9.
- `TASK-283-05-01`: Section now owns optional shadow tokens with
  match-variant fallback, CSS-only reduced-motion-safe `fade` / `slide-up`
  surface motion, and a derived preview swatch, so W2, W3, and U5 are no
  longer active while U2 stays in `TASK-283-05-02` after `TASK-326`.
- `TASK-283-06`: Section now owns bounded mobile/desktop padding overrides with
  `Match base` fallback and deterministic `md` restore to the base token.
- `TASK-283-07`: Section now stores editor-only `regions[]` metadata keyed by
  stable region instance ids, so Visual rename controls, canvas slot headers,
  and insert-target selectors can show author labels without changing public
  runtime output.
- Targeted evidence for the current 2026-05-22 audit:
  - `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/ui/widgetInsertUtils.test.ts` passed.
  - `bunx vitest run --config vitest.config.ts tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx` passed.
  - `bun test tests/unit/widgets/validator.test.ts`, `bun --cwd core lint`, `bun --cwd core lint:types`, and `set -a && source .env && set +a && bun run gates:coderso` passed during the latest TASK-283-07 implementation pass.
  - `bun run scan:security:strict` still exits non-zero only because local `semgrep`, `trivy`, and `gitleaks` executables are missing; `bun audit` ran successfully inside the command.
