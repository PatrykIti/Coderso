# RAPORT: Timeline Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #3 (Timeline Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `timeline-audit` (oddzielna od innych agentów)

---

## Status po TASK-291, TASK-299, i TASK-256-01 (2026-05-22)

- Timeline follow-up execution is complete for every widget-local row owned by
  the `TASK-291` family.
- Exact out-of-family owners now exist for the remaining shared rows:
  `NEW -> TASK-256-01`, `W7 -> TASK-299`.
- No live Playwright replay was run in this isolated worktree because
  `http://localhost:5173/admin` and `http://localhost:3000` were not booted
  during this rollout. Closure evidence below comes from targeted Timeline
  validation and final repo commands:
  `git diff --check`, `bun --cwd core lint`, `bun --cwd core lint:types`,
  `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`,
  `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`,
  `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`,
  `bun test tests/unit/widgets/validator.test.ts`, `bun run lint`,
  `bun run gates:coderso`, and `bun run precommit`.
- `bun run scan:security:strict` did not finish green in this environment:
  `bun audit` ran, but `semgrep` and `trivy` were missing from `PATH`, and the
  installed `gitleaks` binary did not support the repo's `git` / `dir`
  subcommands.

| Finding | Final status | Owner | Evidence |
|---|---|---|---|
| NEW | task-256-physical-owner | TASK-256-01 | Shared atomic block updates now prevent Timeline mode/variant clobbering; the Timeline Visual editor wave keeps `mode=alternating` while switching the compatibility variant to `cards`. |
| C1 | fixed | TASK-291-01 | Wizard now renders and edits the full normalized `3-8` step set instead of slicing after the first four entries. |
| C2 | fixed | TASK-291-01 | Wizard now authors step status directly and does not force `upcoming` as the only practical path. |
| C3 | fixed | TASK-291-01 | Wizard now supports explicit per-step removal with a confirmation flow and min-step guard. |
| C4 | fixed | TASK-291-01 | Wizard now exposes beginner-safe icon and accent fields for every authored step. |
| C5 | fixed | TASK-291-03 | Horizontal milestone connectors now size from spacing-aware layout output instead of a fixed `4rem` width. |
| W1 | fixed | TASK-291-05 | Timeline now owns bounded `style.titleWeight` tokens for step headings. |
| W2 | fixed | TASK-291-02 | Visual now supports drag reorder while preserving button-based step movement. |
| W3 | fixed | TASK-291-04 | Per-step accents now fall back to the existing global `style.markerColor` contract instead of demanding repeated local values. |
| W4 | deferred | TASK-291-04 | Per-step `labelPosition` stays out of the live schema because only the global `layout.labelPosition` token remains deterministic across axis, chronology, alternating, and compact layouts. |
| W5 | fixed | TASK-291-05 | Timeline now owns bounded section padding and outer section spacing tokens instead of hardcoded container spacing only. |
| W6 | fixed | TASK-291-04 | Marker rendering now supports bounded `dot`, `number`, and `icon` display modes. |
| W7 | shared-physical-owner | TASK-299 | Shared contrast advisories now cover Timeline line, marker, text, and background color surfaces in the editor. |
| W8 | deferred | TASK-291-06 | Timeline remains intentionally static; no motion schema or runtime animation classes were added because the report ask implied scroll-triggered behavior outside the current widget contract. |
| W9 | fixed | TASK-291-05 | Timeline now owns bounded `layout.maxWidth` tokens instead of a single hardcoded `max-w-6xl` container. |
| W10 | fixed | TASK-291-04 | Steps now support optional safe whole-step links and suppress them whenever a CTA exists so nested anchors never render. |
| W11 | fixed | TASK-291-05 | Date/dateLabel metadata now renders in axis/milestone layouts, so horizontal milestones can stay date-aware without forcing chronology mode. |
| W12 | fixed | TASK-291-05 | Timeline now owns optional widget-level header title and description fields. |
| U1 | fixed | TASK-291-02 | Visual now exposes mode preview cards instead of relying on a mode-only dropdown. |
| U2 | fixed | TASK-291-02 | Visual now explains how mode changes map to compatibility variants. |
| U3 | fixed | TASK-291-02 | Date fields now provide strict `YYYY-MM-DD` guidance while preserving editorial `dateLabel` copy. |
| U4 | fixed | TASK-291-02 | Raw step fields now include helper text instead of relying on placeholders alone. |
| U5 | fixed | TASK-291-02 | Visual status selectors now expose an explicit `No status` option that clears persisted badges. |
| U6 | fixed | TASK-291-04 | Visual/runtime now support icon-in-marker rendering plus marker background and icon color controls. |
| U7 | fixed | TASK-291-01 | Wizard now warns when `titleSize: none` hides step titles. |
| U8 | fixed | TASK-291-02 | Marker and accent controls are now grouped per step in Visual. |
| U9 | fixed | TASK-291-02 | Spacing controls now include readable token-effect helper copy. |
| R1 | fixed | TASK-291-03 | Alternating layout now keeps date metadata visible on mobile instead of hiding it behind `hidden md:block`. |
| R2 | fixed | TASK-291-03 | Chronology now uses a clamped date column instead of a fixed `10rem` width. |
| R3 | fixed | TASK-291-03 | Horizontal milestones now use overflow-safe axis rendering instead of uncontrolled multi-row wrapping. |
| R4 | fixed | TASK-291-03 | Current steps now render `aria-current="step"`. |
| R5 | fixed | TASK-291-03 | Timeline step lists now expose an accessible name. |
| R6 | fixed | TASK-291-03 | Timeline sections now expose a readable `aria-label`/`aria-labelledby` contract. |
| R7 | fixed | TASK-291-03 | Decorative step icons and marker glyphs are now hidden from assistive technology by default. |
| R8 | fixed | TASK-291-03 | Connector sizing now follows the same spacing-aware milestone fix that closed C5. |
| R9 | fixed | TASK-291-03 | `lineStyle` now styles the guide/axis treatment instead of changing card borders. |
| R10 | fixed | TASK-291-03 | Short timelines now keep a denser, bounded presentation instead of looking empty on sparse data. |

---

> **Uwaga:** Sekcje 1-8 poniżej zachowują historyczny snapshot audytu z
> 2026-05-16. Nie opisują już bieżącego stanu wdrożenia; aktualne rozstrzygnięcia
> dla każdego findingu znajdują się wyłącznie w matrycy statusów powyżej.

## 1. Historyczny przegląd widgetu

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

## 3. Historyczne braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **Wizard pokazuje tylko pierwsze 4 kroki** — przy 5–8 krokach reszta jest niewidoczna w Wizard mode (kod: `steps.slice(0, 4)`, TimelineEditors.tsx:960) | Edytor Wizard |
| C2 | **Brak pola `status` w Wizard** — użytkownik musi wchodzić do Visual aby ustawić status kroku (upcoming/current/complete) | Edytor Wizard |
| C3 | **Brak przycisku usunięcia kroku w Wizard** — można zmieniać liczbę kroków ale nie wskazać który usunąć | Edytor Wizard |
| C4 | **Brak pola `icon` i `accent` na poziomie Wizard** — podstawowe wizualne wyróżnienie wymaga przejścia do Visual | Edytor Wizard |
| C5 | **Connector guide w `TimelineMilestonesLayout` (horizontal) ma stałą szerokość 4rem** — nie rozciąga się proporcjonalnie do spacingu | Renderer |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak `font-weight` dla tytułów kroków** — tylko rozmiar, brak pogrubienia / normal / light | Typografia |
| W2 | **Brak kontroli kolejności kroków przez drag & drop** — tylko przyciski Up/Down w Visual | UX edytora |
| W3 | **Brak globalnego koloru akcentu per krok z dziedziczeniem** — każdy krok musi mieć ręcznie ustawiony accent lub dziedziczy globalny `markerColor` | Kolory |
| W4 | **Brak `labelPosition` per krok** — wszytkie kroki mają tę samą pozycję etykiety | Layout |
| W5 | **Brak sekcji padding/margin** — widget ma stałe `px-4 py-8` bez możliwości konfiguracji z edytora | Layout |
| W6 | **Brak opcji `numbered markers`** — markery są tylko kołami (kropkami), brak numerowania kroków (1, 2, 3...) | Styl wizualny |
| W7 | **Brak walidacji kontrastu kolorów** — użytkownik może ustawić nieczytelne kombinacje bez ostrzeżenia | Dostępność |
| W8 | **Brak kontroli animacji/przejść** — timeline statyczny, brak scroll-triggered animation | Efekty |
| W9 | **Brak maksymalnej szerokości kontenera (maxWidth)** — `max-w-6xl` (1152px) hardcoded | Layout |
| W10 | **Brak opcji klikalnych kroków** — CTA tylko per krok jako link; brak możliwości zrobienia całego kroku jako link | UX |
| W11 | **Brak trybu `milestones` + `chronology` jednocześnie** — chronologia wymaga mode=chronology, brak osi poziomej z datami | Layout |
| W12 | **Brak pola `headerTitle` / `headerDescription` dla całego widgetu** — brak nagłówka nad timeline bez osobnego widgetu | Treść |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Brak wizualnego preview wyboru trybu** — tylko lista dropdown, brak ikonograficznej reprezentacji | Edytor |
| U2 | **Brak informacji co się dzieje po zmianie trybu** — zmiana `mode` automatycznie zmienia `variant` bez widocznego komunikatu | Edytor |
| U3 | **`date` i `dateLabel` to zwykłe pola tekstowe** — brak date pickera, brak walidacji formatu | Edytor |
| U4 | **Brak podpowiedzi przy polach bez opisów** — np. pole `icon` ma tylko placeholder | Edytor |
| U5 | **Brak opcji "brak statusu" w dropdownie statusu** — dostępne wartości to `upcoming`, `current`, `complete`, ale nie ma opcji wyczyszczenia/usunięcia statusu. Raz ustawiony badge statusu jest zawsze widoczny; nie można go skasować bez wejścia w JSON. Brakuje pozycji „— None —" lub przycisku kasowania na tym polu. | Edytor |
| U6 | **Brak możliwości ustawienia ikony wewnątrz markera (koła) oraz koloru tła koła** — pole `icon` na kroku renderuje ikonę/emoji obok tytułu, a nie *wewnątrz* markera. W trybie poziomym bez dat (np. flow procesu) użytkownik chciałby umieścić ikonę bezpośrednio w kole markera i niezależnie kontrolować kolor tła koła oraz kolor ikony, by dostosować wygląd do globalnego design systemu strony. Aktualnie marker to zwykła kropka z jednolitym kolorem — brak warstwy ikony i brak `iconBackgroundColor` / `iconColor` per krok. | Edytor / Renderer |
| U7 | **Brak ostrzeżenia przy `titleSize: none`** — tytuł staje się niewidoczny bez wskazówki | Edytor |
| U8 | **Brak grupowania kolorów per krok w "Markers and accents"** | Edytor |
| U9 | **Brak tooltipów przy opcjach spacing** — "Compact", "Default", "Spacious" nie informują o wartościach gap | Edytor |

### 3.4 Problemy renderera (frontend)

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **`TimelineAlternatingLayout` ukrywa datę na mobile** (`hidden md:block`) — data/dateLabel kroków niewidoczna na urządzeniach mobilnych | Responsywność |
| R2 | **`TimelineChronologyLayout` — kolumna daty stała (`10rem` = 160px)** — przy długich datach/labelach dochodzi do overflow | Layout |
| R3 | **`TimelineMilestonesLayout` (horizontal) — brak responsywności** — przy małych ekranach `flex-wrap` powoduje nieestetyczne łamanie rzędów | Responsywność |
| R4 | **Brak `aria-current="step"` na aktywnym kroku** — status `current` tylko dodaje klasy CSS, brak semantyki ARIA | Dostępność |
| R5 | **`<ol>` bez `aria-label`** — lista kroków nie ma opisu dla technologii asystujących | Dostępność |
| R6 | **`<section>` bez `aria-label` / `aria-labelledby`** — wrapper sekcji nie ma semantycznego opisu | Dostępność |
| R7 | **Ikona emoji bez `aria-hidden="true"`** — renderuje się jako plain tekst, screen reader ją odczytuje | Dostępność |
| R8 | **Connector guide w `TimelineMilestonesLayout` (horizontal): stała szerokość 4rem** — nie łączy wizualnie markerów przy dużym spacingu (potwierdzono: gap=36px, connector=64px) | Renderer |
| R9 | **`TimelineCardsLayout` — `borderStyle` aplikowany na border karty** zamiast osi — zmiana `lineStyle` zmienia obramowanie kart, nie oś | Logika |
| R10 | **Brak `min-h` dla sekcji** — przy 3 krokach z krótką treścią timeline wygląda pusto | Layout |

---

## 4. Historyczne testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=timeline-audit`
> **Strona testowa:** UX Audit Scratch 0516 (ID: 6ece9868)
> **Data testu:** 2026-05-16

### 4.1 KRYTYCZNY BUG: Race condition przy zmianie trybu w Visual editor

**Opis:** W `VisualPanel.tsx:98`:
```js
onVariantChange={(next) => onChange({ ...block, variant: next })}
```

Gdy użytkownik wybiera tryb z comboboxa w Visual editor, wywołuje się `updateMode`:
```js
onChange({ ...value, mode: nextMode });  // zmiana mode
onVariantChange?.(preferredVariantForMode(nextMode)); // zmiana variant
```

Oba wywołania używają tej samej starej referencji `block` z closury. Drugie wywołanie (`onVariantChange`) **nadpisuje** zmianę z pierwszego (`onChange`) bo spread operator używa `block.data` (stary), nie zaaktualizowany `data` z pierwszego onChange.

**Wynik:**
- Variant zmienia się poprawnie (potwierdzone: `compact Selected` po wybraniu `Process`)
- Mode NIE jest persystowany — zawsze wraca do poprzedniej wartości ("Axis")
- Combobox zawsze pokazuje "Axis" po wybraniu dowolnego innego trybu w Visual editor

**Potwierdzenie:**
- Wybrano Process mode → combobox nadal pokazuje "Axis", variant zmieniony na "compact"
- Wybrano Alternating mode → combobox pokazuje "Axis", variant "cards"
- Wybrano Chronology mode → "Axis" w combobox
- **TYLKO Advanced editor pozwala poprawnie zmienić tryb** (nie wywołuje `onVariantChange`)
- Po zapisaniu: `data-timeline-mode="axis"`, variant="compact" (mode NIE zapisany)

**Lokalizacja błędu:** `VisualPanel.tsx:98`
**Naprawa:** Użyć functional update lub połączyć obie zmiany w jednym `onChange`:
```js
// Fix option: combine both changes in one update
onVariantChange={(next) => onChange({ ...block, variant: next })}
// Should be triggered AFTER onChange with the updated block
```

### 4.2 Potwierdzony bug C1: Wizard shows only 4/8 steps

Wybrano 6 kroków w Wizard. Wyświetlają się tylko 4 pola tekstowe (Step 1–4). Kroki 5 i 6 widoczne w podglądzie bloku ale nie można ich edytować w Wizard.

**Kod:** `TimelineEditors.tsx:960` — `steps.slice(0, 4)`

### 4.3 Potwierdzony bug R9: lineStyle na borderze kart

W wariancie `cards`, zmiana `lineStyle` na `dashed` powoduje:
- `borderStyle: "dashed"` na elemencie `<li>` każdej karty
- Wygląd: przerywane obramowania kart zamiast przerywana oś

DOM potwierdza: `{ borderStyle: "dashed", borderWidth: "2px" }` na `li[data-timeline-...]`

### 4.4 Potwierdzony bug R4, R5, R6: Brak ARIA

DOM check:
```json
{
  "sectionAriaLabel": null,
  "sectionAriaLabelledby": null,
  "olAriaLabel": null,
  "statusBadgeAriaCurrent": null
}
```

Status "Current" na `<span>` nie ma `aria-current` — potwierdzono przez ustawienie kroku na status=current w edytorze.

### 4.5 Potwierdzony bug R8: Connector guide stała szerokość

```json
{ "width": "4rem", "height": "2px" }  // każdy connector
```

Przy spacing XL (gap=36px), connector (64px) rozciąga się poza gap do wnętrza następnego elementu, powodując nakładanie.

### 4.6 Status kroku — zawsze "upcoming" jako default

Każdy krok ma domyślnie "upcoming" w dropdown statusu w Visual editor. Brak możliwości "brak statusu" — user zawsze musi świadomie usunąć status. Nieskojarzone UX — badge statusu pojawia się zawsze zamiast wtedy, gdy user świadomie go doda.

---

## 5. Historyczne testy na froncie (localhost:3000)

**URL:** http://localhost:3000/ux-audit-scratch-0516
**Strona opublikowana:** Tak (opublikowano podczas testu)

### 5.1 Widget na froncie

DOM frontendu:
```json
{ "mode": "chronology", "variant": "cards" }
```

Widget poprawnie wyrenderowany — dane dotarły z admin po publishes.

### 5.2 Chronology — kolumna daty (R2 potwierdzone)

```json
{ "gridTemplateColumns": "160px 139.578px" }
```

Stała szerokość 160px (10rem) niezależnie od treści. Na mobile (390px) kolumna spada do single-column (poprawne zachowanie responsywne).

### 5.3 ARIA na froncie (R4, R5, R6 potwierdzone)

```json
{
  "sectionAriaLabel": null,
  "sectionAriaLabelledby": null,
  "olAriaLabel": null,
  "statusBadgeAriaCurrent": null
}
```

Identyczne jak w admin preview — błędy ARIA są w rendererze (`timeline.tsx`), nie w środowisku.

### 5.4 Mobile (390x844)

Chronology layout: single column na mobile — poprawne.
Alternating: `hidden md:block` na elementach daty — R1 zadziała gdy daty będą ustawione.

---

## 6. Historyczne porównanie Admin Preview vs Frontend

| Aspekt | Admin Preview | Frontend | Zgodność |
|--------|--------------|----------|----------|
| Mode rendering | chronology | chronology | ✅ Zgodne |
| Variant rendering | cards | cards | ✅ Zgodne |
| ARIA attributes | Brak | Brak | ✅ Zgodne (oba błędne) |
| Chronology date column | 160px fixed | 160px fixed | ✅ Zgodne |
| lineStyle bug R9 | ✅ Potwierdzony | ✅ Potwierdzony | ✅ Zgodne |
| Status badges | ✅ Widoczne | ✅ Widoczne | ✅ Zgodne |
| Mobile responsive | N/A (canvas) | Single column | ✅ OK |

**Wnioski:** Admin preview i frontend renderują widget identycznie. Wszystkie bugi są w warstwie renderera (`timeline.tsx`) i edytora — nie ma rozbieżności środowiskowych.

**Przyczyna braku rozbieżności:** Widget jest renderowany po stronie serwera (SSR) lub hydrowany z tymi samymi danymi — brak specyficznych dla środowiska transformacji danych.

---

## 7. Historyczne podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | NEW | **Race condition w Visual editor: mode nie jest persystowany** | Użytkownik NIE MOŻE zmienić trybu z Visual editora — kluczowa funkcja edytora nie działa |
| 🔴 KRYTYCZNY | C1 | **Wizard pokazuje tylko 4/8 kroków** | Kroki 5–8 niewidoczne/niedostępne w trybie Wizard |
| 🔴 KRYTYCZNY | R1 | **Data niewidoczna na mobile w Alternating** | Treść ginie na urządzeniach mobilnych |
| 🟠 WYSOKI | R9 | **lineStyle aplikowany na border kart zamiast osi** | Zmiana stylu linii daje inny efekt niż oczekiwany |
| 🟠 WYSOKI | R4, R5, R6 | **Brak ARIA** | Niedostępność dla screen readerów |
| 🟠 WYSOKI | R8 | **Connector guide stała szerokość 4rem** | Wizualna niespójność — guide nie łączy markerów |
| 🟡 ŚREDNI | R2 | **Stała szerokość kolumny daty (10rem)** | Overflow przy długich datach |
| 🟡 ŚREDNI | U5 | **Status zawsze "upcoming" domyślnie** | Mylące UX — badge pojawia się zawsze |
| 🟡 ŚREDNI | W5 | **Brak kontroli padding/margin** | Layout ograniczony |
| 🟡 ŚREDNI | W6 | **Brak numerowanych markerów** | Ograniczenie wizualne |
| 🟡 ŚREDNI | U3 | **date bez date pickera** | Podatność na błędy danych |
| 🟢 NISKI | W1, W8, W12 | Rozszerzenie konfiguracji | Komfort użytkowania |

---

## 8. Historyczne sugerowane naprawy

### 8.1 Naprawa race condition (KRYTYCZNE)

**Plik:** `core/admin/ui/pages/builder/VisualPanel.tsx:96-98`

Problem:
```js
onChange={(data) => onChange({ ...block, data })}
onVariantChange={(next) => onChange({ ...block, variant: next })}
```

Gdy oba są wywoływane synchronicznie, `onVariantChange` nadpisuje `data` ze starego `block`.

Naprawa — opcja 1 (w `updateMode`):
```js
// TimelineEditors.tsx - zamiast wywoływać dwie callback, wyemituj jedną zmianę
// Przekazać combined update handler do edytora, który może zmienić i data i variant jednocześnie
```

Naprawa — opcja 2 (w VisualPanel.tsx):
```js
// Użyj funkcjonalnego update pattern w onVariantChange
// lub przekaż aktualny blok przez ref/callback
```

Naprawa — opcja 3 (minimalna):
```js
// W updateMode: najpierw wyemituj variant change, potem data change
// Albo połącz w jeden combined onChange który aktualizuje oba jednocześnie
```

### 8.2 Naprawa C1 (Wizard - tylko 4 kroki)

**Plik:** `TimelineEditors.tsx:960`

```js
// Zmienić:
{steps.slice(0, 4).map((step, index) => (

// Na:
{steps.map((step, index) => (
```

### 8.3 Naprawa R4, R5, R6 (ARIA)

**Plik:** `timeline.tsx`

```jsx
// Section:
<section className="px-4 py-8" aria-label="Timeline" style={backgroundStyle}>

// OL:
<ol aria-label="Timeline steps" className={...}>

// Status badge - dodać na <span> zawierający cały krok:
{step.status === "current" ? <li aria-current="step" ...> : <li ...>}

// Icon emoji:
{step.icon ? <span className="text-sm leading-none" aria-hidden="true">{step.icon}</span> : null}
```

### 8.4 Naprawa R9 (lineStyle na kartach)

**Plik:** `timeline.tsx` — `TimelineCardsLayout`

```jsx
// Usunąć borderStyle/borderWidth z li:
<li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
// Dodać dedykowaną oś jako oddzielny element lub usunąć zależność
```

### 8.5 Naprawa R8 (connector guide)

**Plik:** `timeline.tsx` — `TimelineMilestonesLayout` horizontal

```jsx
// Zamiast stałej szerokości:
style={{ width: "4rem", ... }}

// Użyć flex-grow lub min-width bazowanej na spacingu:
style={{ flexGrow: 1, minWidth: "1rem", maxWidth: "6rem", ... }}
```

---

## Status po TASK-256 (2026-05-17)

- Full Timeline widget closure is intentionally outside this umbrella and
  continues through the `TASK-291` family.
- Current TASK-256 ownership is limited to shared prerequisites already handled
  in `TASK-256-01` (atomic editor patch path) and `TASK-256-04`
  (interactive-runtime accessibility policy). Timeline-specific editor and
  renderer rows remain with `TASK-291-01` through `TASK-291-03`.

*Raport zakończony. Wszystkie testy wykonane 2026-05-16.*
