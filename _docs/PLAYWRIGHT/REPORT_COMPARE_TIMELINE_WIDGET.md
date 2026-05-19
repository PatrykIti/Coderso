# RAPORT: Compare Timeline Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #N (Compare Timeline Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `compare-timeline-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetu

**Typ:** Composite
**Moduł:** Content
**Audience:** Advanced
**Warianty:** `dual-track`, `dual-track-highlight`
**Ograniczenia kroków osi:** min 3 / max 6

Compare Timeline widget służy do wizualnego porównania dwóch procesów (ścieżek) względem wspólnej osi kroków. Obsługuje aktywne markery per krok per ścieżkę, segmenty wyróżnienia (highlight) na wybranej ścieżce, przewodniki (guides) z konfigurowalnymi kolorami i stylami, oraz szerokie możliwości konfiguracji kolorów i typografii.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Oś (axis)** | `steps[]` — każdy krok: `id` (opcjonalne), `label` (wymagane), `description` (opcjonalne); min 3 / max 6 kroków |
| **Ścieżki (tracks)** | Dokładnie 2 ścieżki (id: `a`, `b`): `label`, `markers[]` (tablica indeksów aktywnych kroków), `segments[]` (opcjonalne: `from`, `to`, `label`) |
| **Przewodniki (guides)** | `enabled` (bool), `style` (`solid`/`dashed`) |
| **Layout** | `trackSpacing` (`none`/`sm`/`md`/`lg`/`xl`), `labelPosition` (`top`/`bottom`) |
| **Highlight** | `targetTrackId` — ID ścieżki do wyróżnienia (tylko w wariancie `dual-track-highlight`) |
| **Style** | `highlightColor`, `highlightLabelStyle` (`solid`/`outline`/`subtle`), `markerColor`, `trackLabelColor`, `stepLabelColor`, `mutedStepColor`, `guideColor`, `trackLabelSize` (`none`/`sm`/`base`/`lg`), `stepLabelSize` (`none`/`xs`/`sm`/`base`), `segmentLabelSize` (`none`/`xs`/`sm`/`base`) |

### 2.2 Renderery

| Komponent | Opis |
|-----------|------|
| `CompareAxisRow` | Wiersz osi — kroki w gridzie (grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3) |
| `CompareTrackRow` | Wiersz ścieżki — kroki z markerami, podświetleniem segmentów, etykietami segmentów |
| `CompareTimelineBlock` | Główny kontener — łączy oś i ścieżki, zarządza pozycją etykiet (top/bottom) |

### 2.3 Tryby edytora

- **Wizard** — onboarding: przełącznik highlight mode, liczba kroków osi, etykiety ścieżek, markery per ścieżkę
- **Visual** — 6 sekcji: wariant, oś/etykiety, markery/segmenty, highlight/guides, kolory/typografia, spacing/layout
- **Advanced** — techniczne tokeny layoutu, raw metadata (step IDs, descriptions), highlight target ID, normalizacja danych

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **Segment editor dostępny TYLKO dla target track** — w wariancie `dual-track-highlight` segmenty można edytować wyłącznie dla ścieżki wskazanej jako `targetTrackId`. Ścieżka A (gdy target=B) nie ma kontrolek segmentów w Visual edytorze. Schemat JSON i renderer obsługują segmenty na obu ścieżkach, ale edytor je ukrywa. | Edytor Visual |
| C2 | **Brak segmentów w wariancie `dual-track`** — zmiana wariantu na `dual-track` usuwa `SegmentEditor` całkowicie z edytora, choć renderer nie renderuje segmentów w dual-track. Dane segmentów pozostają w modelu ale są niewidoczne i nie usuwane — po powrocie do `dual-track-highlight` segmenty wracają. Brak informacji dla użytkownika o tej zależności. | Edytor Visual |
| C3 | **Wizard nie ma kontrolki segmentów** — użytkownik w Wizard może ustawić highlight mode (variant=dual-track-highlight) ale nie może konfigurować żadnych segmentów — musi przełączyć się do Visual. | Edytor Wizard |
| C4 | **Brak możliwości dodania/usunięcia kroków osi przez przyciski +/– w Visual edytorze** — jedyna kontrolka to dropdown "step count". Brak intuicyjnych przycisków Add/Remove step w sekcji "Axis steps and track labels". Przyciski Add/Remove step istnieją tylko w Advanced edytorze. | Edytor Visual |
| C5 | **Brak opisu step (`description`) w Wizard i Visual edytorze** — pole `description` per krok jest dostępne wyłącznie przez Advanced editor (Textarea per step). W Visual edytorze sekcja "Axis steps" ma tylko etykiety kroków, brak pola opisu. Renderer wyświetla `description` gdy istnieje, ale użytkownik nie może go dodać z Wizard/Visual. | Edytor |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak możliwości wyróżnienia obu ścieżek jednocześnie** — `targetTrackId` wskazuje jedną ścieżkę; nie można wyróżnić segmentów na obu. | Logika |
| W2 | **Brak `font-weight` dla etykiet** — tylko rozmiary tekstów, brak kontroli grubości czcionki | Typografia |
| W3 | **Brak kontroli padding/margin sekcji** — `px-4 py-8` w `CompareTimelineBlock` hardcoded, brak edytowalnych tokenów | Layout |
| W4 | **Brak `maxWidth` kontenera** — `max-w-6xl` (1152px) hardcoded; brak opcji full-width lub custom width | Layout |
| W5 | **Brak pola nagłówka widgetu** — brak `title`/`subtitle` nad całym blokiem porównania; wymaga osobnego widgetu | Treść |
| W6 | **Ograniczony zakres kroków osi (3–6)** — dla złożonych procesów potrzeba może być 7–10 kroków | Dane |
| W7 | **Brak walidacji kontrastu kolorów** — użytkownik może ustawić markerColor identyczny z tłem bez ostrzeżenia | Dostępność |
| W8 | **Brak kontroli animacji/przejść** — porównanie statyczne, brak scroll-triggered reveal per krok | Efekty |
| W9 | **Brak kontrolek reorder ścieżek** — ścieżka A zawsze na górze, B na dole; brak możliwości zamiany kolejności | UX |
| W10 | **Brak opcji klikalnych kroków** — segmenty mają label, ale nie ma CTA/linku per krok ani per segment | UX |
| W11 | **`color-mix(in oklab, ...)` bez fallback** — highlight segment background używa `color-mix`, co nie działa w starszych przeglądarkach (Safari 15 i starsze) | Kompatybilność |
| W12 | **Brak ikony/emoji per krok** — kroki osi mają tylko label i description; brak pola ikony dla wzbogacenia wizualnego | Treść |
| W13 | **Brak `trackColor` (tło ścieżki)** — ścieżka ma border (guide), ale tło jest zawsze `transparent`; brak możliwości ustawienia tła per ścieżkę | Styl wizualny |
| W14 | **Brak `markerShape`** — markery to prostokąty (rounded-md border); brak opcji okrągłych, checkmark, lub numerowanych markerów | Styl wizualny |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Brak wizualnego preview wariantów** — karty wariantów (`VariantCards`) mają tylko tekst; brak miniaturki/ikonografiki pokazującej jak wygląda dual-track vs dual-track-highlight | Edytor Visual |
| U2 | **Brak informacji o skutku przełączenia wariantu** — zmiana z `dual-track-highlight` na `dual-track` sprawia, że segmenty "znikają" bez komunikatu "segmenty zostaną zachowane, ale ukryte" | Edytor Visual |
| U3 | **`SegmentEditor` — pola "From" i "To" nie chronią przed from > to** — UI pozwala wybrać `from: 3, to: 1`; normalizacja naprawia to przy zapisie, ale brak feedbacku dla użytkownika w trakcie edycji | Edytor Visual |
| U4 | **Brak "None" w opcjach `trackLabelSize`** — można ustawić `none` (usuwa klasy CSS, ale etykieta nadal renderuje się z domyślnym rozmiarem) — wartość "none" nie działa jako "ukryj" bo brak `display:none`; może być mylące | Edytor Visual |
| U5 | **ColorField dla `trackLabelColor` i `stepLabelColor` nie mają przycisku Clear (onClear)** — w kodzie brak `onClear` prop dla tych dwóch pól. W odróżnieniu od `highlightColor`, `markerColor`, `guideColor` — te dwa nie mają możliwości wyczyszczenia do wartości domyślnej | Edytor Visual |
| U6 | **Brak podpodzi formatowania segmentów** — segment wyświetla fallback `Steps ${from+1}-${to+1}` gdy brak label, ale edytor nie informuje użytkownika o tym fallbacku w placeholder | Edytor Visual |
| U7 | **MarkerToggleGrid nie ma stanu "none"** — gdy user kliknie wszystkie markery wyłącza je, ścieżka staje się "pusta" bez informacji o konsekwencjach wizualnych | Edytor |
| U8 | **Advanced editor — Target track ID wyświetla raw IDs** (`a`, `b`) zamiast etykiet ścieżek — mało intuicyjne dla użytkownika | Edytor Advanced |
| U9 | **Brak tooltipów przy opcjach `trackSpacing`** — "none", "sm", "md", "lg", "xl" bez wyjaśnienia wartości gap (np. "0px", "12px", ...) | Edytor |
| U10 | **Duplikacja sekcji Layout/Spacing między Visual a Advanced** — obie edytory mają identyczne kontrolki `trackSpacing` i `labelPosition`; dezorientujące dla użytkownika co jest "ostatecznym" miejscem konfiguracji | Edytor |

### 3.4 Problemy renderera (frontend)

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **Grid `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3` nie skaluje się do liczby kroków** — przy 3 krokach układ to `grid-cols-3` na lg, ale przy 4–6 krokach nadal `grid-cols-3` — ostatni wiersz niepełny. Brak `grid-cols-4`, `grid-cols-5`, `grid-cols-6`. | Responsywność |
| R2 | **Brak `aria-label` / `aria-labelledby` na `<section>`** — wrapper sekcji nie ma semantycznego opisu dla technologii asystujących | Dostępność |
| R3 | **Brak `role` lub `aria-label` na kontenerze ścieżki** — każdy `CompareTrackRow` to `<div>` bez semantyki; screen reader nie informuje o przejściu między ścieżkami | Dostępność |
| R4 | **Aktywny marker (`markerActive`) nie ma `aria-pressed` ani `aria-selected`** — czysto wizualne wyróżnienie koloru, brak semantyki stanu | Dostępność |
| R5 | **Brak `aria-label` na segmentach** — `<span data-compare-segment>` z etykietą segmentu nie ma roli ani aria atrybutu wyjaśniającego znaczenie | Dostępność |
| R6 | **`color-mix(in oklab, ...)` — brak polyfill/fallback** — tło zaznaczonego segmentu używa `color-mix` w CSS; nie działa w Chrome < 111, Safari < 16.2, Firefox < 113 | Kompatybilność |
| R7 | **Brak min-height dla kontenerów ścieżki** — przy minimalnej konfiguracji (brak markerów, brak segmentów) ścieżka wygląda pusto bez wizualnych wskazówek | Layout |
| R8 | **`guidStyle` ma błąd logiczny** — `borderStyle: guides.enabled ? guides.style : "solid"` — gdy `guides.enabled = false` border jest zawsze `solid`, a nie `none`; guides faktycznie nigdy nie znikają (zawsze jest solid border) | Logika/Bug |
| R9 | **Brak `overflow-hidden` na track container** — przy długich etykietach segmentów i małym ekranie może dojść do overflow | Layout |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=compare-timeline-audit`
> **Strona testowa:** TEST-COMPARE-TIMELINE-0516 (ID: e3c0ee69-90ea-47f7-90d4-7d971a723169)
> **Data testu:** 2026-05-16

### 4.1 Potwierdzony bug R8: guides.enabled=false nie usuwa border

Wyłączono switch "Show guides" (e1279) w sekcji "Highlight and guide styles".

**DOM po wyłączeniu guides:**
```json
{
  "inlineStyle": "border-style: solid; border-color: var(--color-border);",
  "computedBorderStyle": "solid"
}
```

Oba track divi nadal mają `border-style: solid`. Logika w kodzie (`borderStyle: guides.enabled ? guides.style : "solid"`) zawsze ustawia `borderStyle` — nigdy `none`. Border jest zawsze widoczny.

### 4.2 Potwierdzony bug R1: Grid 3-kolumnowy przy 6 krokach

Ustawiono 6 kroków osi. Oś (`data-compare-axis`) ma 6 dzieci ale `gridTemplateColumns: "119.953px 119.953px 119.953px"` (3 kolumny).

Wynik: 6 kroków w układzie 2×3, zamiast 1×6. Hardcoded `grid-cols-3` na lg.

### 4.3 Potwierdzony bug C1: Segment editor tylko dla target track

W sekcji "Markers and segment mapping" z wariantem `dual-track-highlight`:
- Ścieżka "Traditional" (track a): tylko `MarkerToggleGrid` — brak SegmentEditor
- Ścieżka "With us" (track b = target): `MarkerToggleGrid` + pełny `SegmentEditor` + Add segment button

Schemat JSON i renderer obsługują segmenty na obu ścieżkach, ale edytor je ukrywa.

### 4.4 Potwierdzony C4: Brak przycisków +/– w Visual edytorze

Sekcja "Axis steps and track labels" w Visual edytorze zawiera wyłącznie:
- Combobox "Axis step count" (dropdown 3-6)
- Textboxy etykiet osi
- Textboxy etykiet ścieżek

Brak przycisków "Add step" / "Remove step". Dostępne tylko w Advanced edytorze (e1457, e1458).

### 4.5 Potwierdzony bug U5: Brak Clear dla 3 pól kolorów

Analiza sekcji "Colors and typography":

| Pole | Przycisk Clear |
|------|----------------|
| Highlight color | ✅ Clear (e1297) |
| Marker color | ✅ Clear (e1304) |
| Track label color | ❌ Brak Clear |
| Step label color | ❌ Brak Clear |
| Muted step color | ❌ Brak Clear |
| Guide color | ✅ Clear (e1329) |

### 4.6 Potwierdzony C2: Brak informacji o zachowaniu segmentów przy zmianie wariantu

Przełączenie z `dual-track-highlight` → `dual-track` pokazuje komunikat:
> _"Segment mapping is available only in the Dual Track Highlight variant."_

Brak informacji że segmenty są zachowane w modelu i wrócą po powrocie do dual-track-highlight. Dla użytkownika może wyglądać jak utrata danych.

### 4.7 Potwierdzony U3: Brak walidacji from > to w SegmentEditor

Ustawiono segment: From = Review (indeks 5), To = Deliver (indeks 2).
- UI nie pokazuje żadnego błędu ani ostrzeżenia
- Preview: `data-compare-segment="2-5"` (normalizacja zamieniła automatycznie)
- Edytor nadal pokazuje From=Review, To=Deliver

Użytkownik nie wie że dane zostały zmienione za kulisami. Brak feedbacku.

### 4.8 Potwierdzony U8: Raw IDs w Advanced edytorze

Sekcja "Highlight target track ID" w Advanced edytorze pokazuje raw `b` zamiast "With us".

### 4.9 Potwierdzony U10: Duplikacja kontrolek Layout

- **Visual editor** — sekcja "Spacing and layout preview hints": Track spacing + Label position
- **Advanced editor** — sekcja "Layout tokens": Track spacing token + Label position token

Identyczne kontrolki w obu edytorach.

### 4.10 ARIA — brak atrybutów

```json
{
  "sectionAriaLabel": null,
  "sectionAriaLabelledby": null,
  "firstTrackRole": null,
  "firstTrackAriaLabel": null,
  "segmentAriaLabel": null
}
```

Potwierdzono R2, R3, R5.

### 4.11 color-mix — działa w Chrome, ryzyko na starszych przeglądarkach

```
inline: "background-color: color-mix(rgb(245, 158, 11) 18%, transparent)"
computed: "oklab(0.768595 0.0561344 0.154817 / 0.18)"
```

Chrome poprawnie przetwarza `color-mix(in oklab, ...)` — obliczona wartość to `oklab(...)`. Potwierdza R6 jako ryzyko kompatybilności (Chrome < 111, Safari < 16.2, Firefox < 113).

---

## 5. Testy na froncie (localhost:3000)

> **URL:** http://localhost:3000/test-compare-timeline-0516
> **Data testu:** 2026-05-16

### 5.1 Widget dual-track na froncie (pierwsze opublikowanie)

```json
{
  "variant": "dual-track",
  "labelPosition": "top",
  "targetTrack": "b",
  "trackBorders": ["border-style:solid;border-color:var(--color-border)", "..."],
  "axisChildCount": 6,
  "axisGridCols": "325.328px 325.328px 325.344px"
}
```

Wyniki identyczne z admin preview — bugi R8 i R1 obecne.

### 5.2 Widget dual-track-highlight na froncie (drugie opublikowanie)

```json
{
  "variant": "dual-track-highlight",
  "labelPosition": "top",
  "targetTrack": "b",
  "sectionAriaLabel": null,
  "trackBorders": ["border-style:dashed;border-color:var(--color-border)", "..."],
  "segmentCount": 1,
  "segments": ["2-5"],
  "colorMixCount": 3,
  "axisChildCount": 6,
  "axisGridCols": "325.328px 325.328px 325.344px"
}
```

Segment "2-5" wyświetla się poprawnie. Guides dashed widoczne (guides były włączone). 3 komórki z `color-mix` background — step 2, 3, 4 (step 5 = "Review" ma marker aktywny, więc kolor markera zamiast color-mix).

### 5.3 Mobile (390x844)

Grid osi: 1 kolumna `gridCols: "358px"` — poprawne, single-column na mobile.

Nie ma problemu R1 na mobile (grid-cols-1 poprawnie stosowane).

---

## 6. Porównanie Admin Preview vs Frontend

| Aspekt | Admin Preview | Frontend | Zgodność |
|--------|--------------|----------|----------|
| Variant rendering | ✅ dual-track / dual-track-highlight | ✅ dual-track / dual-track-highlight | ✅ Zgodne |
| Grid kroków osi (6 kroków) | 3 kolumny lg (bug R1) | 3 kolumny lg (bug R1) | ✅ Zgodne (oba błędne) |
| Guides disabled → border | border-style: solid (bug R8) | border-style: solid (bug R8) | ✅ Zgodne (oba błędne) |
| ARIA attributes | Brak | Brak | ✅ Zgodne (oba błędne) |
| color-mix rendering | oklab computed (Chrome OK) | oklab computed (Chrome OK) | ✅ Zgodne |
| Segment rendering | data-compare-segment="2-5" ✅ | data-compare-segment="2-5" ✅ | ✅ Zgodne |
| Mobile layout | N/A (canvas) | Single column ✅ | ✅ OK |

**Wnioski:** Admin preview i frontend renderują widget identycznie. Wszystkie bugi są w warstwie renderera (`compareTimeline.tsx`) i edytora (`CompareTimelineEditors.tsx`) — brak rozbieżności środowiskowych.

**Przyczyna braku rozbieżności:** Widget renderowany po stronie serwera lub hydrowany z tymi samymi danymi — brak transformacji specyficznych dla środowiska.

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | R8 | **Bug: `guides.enabled=false` nadal renderuje border** | Użytkownik wyłącza guides ale border zawsze widoczny |
| 🔴 KRYTYCZNY | C1 | **Segment editor tylko dla target track** | Segmenty na ścieżce A niedostępne przez edytor |
| 🔴 KRYTYCZNY | C4 | **Brak przycisków +/– kroków osi w Visual** | Zmiana liczby kroków tylko przez dropdown, niewidoczna w kontekście treści |
| 🟠 WYSOKI | C5 | **Brak `description` per krok w Wizard/Visual** | Opis kroków dostępny tylko przez Advanced |
| 🟠 WYSOKI | R1 | **Grid nie skaluje się do liczby kroków (>3)** | Niepełne wiersze przy 4–6 krokach |
| 🟠 WYSOKI | R2, R3, R4, R5 | **Brak ARIA** | Niedostępność dla screen readerów |
| 🟠 WYSOKI | U5 | **Brak Clear dla `trackLabelColor` i `stepLabelColor`** | Brak resetu do wartości domyślnej tych pól |
| 🟡 ŚREDNI | R6, W11 | **`color-mix` bez fallback** | Błąd wizualny w starszych przeglądarkach |
| 🟡 ŚREDNI | U10 | **Duplikacja Layout/Spacing w Visual i Advanced** | Dezorientacja co jest "ostatecznym" miejscem konfiguracji |
| 🟡 ŚREDNI | U3 | **from > to brak walidacji w UI** | Mylące UX podczas edycji segmentów |
| 🟡 ŚREDNI | W3, W4 | **Brak kontroli padding i maxWidth** | Layout ograniczony do hardcoded wartości |
| 🟡 ŚREDNI | W5 | **Brak nagłówka widgetu** | Wymaga osobnego widgetu dla tytułu sekcji |
| 🟢 NISKI | W2, W8, W12, W13, W14 | Rozszerzenie konfiguracji stylu | Komfort użytkowania i warianty wizualne |

---

## 8. Sugerowane naprawy

### 8.1 Naprawa R8 (guides.enabled=false nie usuwa border)

**Plik:** `core/widgets/core/compareTimeline.tsx`

Problem w `CompareTrackRow`:
```jsx
// Aktualnie:
borderStyle: guides.enabled ? guides.style : "solid",
// guides.enabled=false → borderStyle="solid" → border ZAWSZE widoczny

// Naprawa:
borderStyle: guides.enabled ? guides.style : undefined,
borderColor: guides.enabled ? guideColor : "transparent",
// lub
border: guides.enabled ? `1px ${guides.style} ${guideColor}` : "none",
```

### 8.2 Naprawa C4 (brak przycisków +/– w Visual edytorze)

**Plik:** `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`

W sekcji "Axis steps and track labels" dodać:
```jsx
<div className="flex items-center gap-2">
  <Button type="button" variant="ghost" size="sm" 
    onClick={() => removeAxisStep(value, onChange)}
    disabled={normalized.axis.steps.length <= compareAxisStepMin}>
    Remove step
  </Button>
  <Button type="button" variant="ghost" size="sm"
    onClick={() => addAxisStep(value, onChange)}
    disabled={normalized.axis.steps.length >= compareAxisStepMax}>
    Add step
  </Button>
</div>
```

### 8.3 Naprawa R1 (grid nie skaluje się do kroków)

**Plik:** `core/widgets/core/compareTimeline.tsx`

```jsx
// Aktualnie:
className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"

// Naprawa — dynamiczny grid oparty o liczbę kroków:
const gridClass = steps.length <= 3 ? "grid-cols-3" 
  : steps.length === 4 ? "grid-cols-4"
  : steps.length === 5 ? "grid-cols-5"
  : "grid-cols-6";

className={`grid gap-2 grid-cols-1 sm:grid-cols-2 lg:${gridClass}`}
```

### 8.4 Naprawa U5 (brak onClear dla trackLabelColor i stepLabelColor)

**Plik:** `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`

```jsx
// Dodać onClear do ColorField dla trackLabelColor:
<ColorField
  label="Track label color"
  value={normalized.style?.trackLabelColor}
  onChange={(next) => updateStyle(value, onChange, { trackLabelColor: next })}
  onClear={() => clearStyle(value, onChange, "trackLabelColor")}  // ← dodać
  placeholder="#0f172a"
  pickerFallback="#0f172a"
/>

// Dodać onClear do ColorField dla stepLabelColor:
<ColorField
  label="Step label color"
  value={normalized.style?.stepLabelColor}
  onChange={(next) => updateStyle(value, onChange, { stepLabelColor: next })}
  onClear={() => clearStyle(value, onChange, "stepLabelColor")}  // ← dodać
  placeholder="#0f172a"
  pickerFallback="#0f172a"
/>
```

### 8.5 Naprawa R2, R3 (brak ARIA)

**Plik:** `core/widgets/core/compareTimeline.tsx`

```jsx
// CompareTimelineBlock:
<section className="px-4 py-8" aria-label="Compare Timeline">

// CompareTrackRow — dodać role i label na kontenerze:
<div
  className="rounded-lg border p-4"
  role="region"
  aria-label={`Track: ${track.label}`}
  style={{ ... }}
>

// Marker aktywny — dodać aria-label:
<div
  key={...}
  className="rounded-md border px-3 py-2"
  role="img"
  aria-label={`${step.label}: ${markerActive ? "active" : "inactive"}`}
  style={{ ... }}
>
```

---

*Raport zakończony. Wszystkie testy wykonane 2026-05-16.*

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Compare Timeline is classification only.
  Compare Timeline-owned widget behavior and closure continue through the
  `TASK-260` family.
- Shared rows that match existing TASK-256 mechanisms still route through
  `TASK-256-01`, `TASK-256-02`, `TASK-256-04`, or `TASK-256-06-01`, but
  TASK-256 ships no Compare Timeline-specific code from this report. The later
  widget family `TASK-260` plus shared follow-ups `TASK-299` and `TASK-300`
  are now landed.

## Status po TASK-260, TASK-299, i TASK-300 (2026-05-19)

- Compare Timeline follow-up execution is complete for all rows owned by the
  `TASK-260` family.
- Exact out-of-family owners now exist for every remaining non-implemented row:
  `U4 -> TASK-256-02`, `W7 -> TASK-299`, `W8 -> TASK-300`.
- No live Playwright replay was run in this isolated worktree because the
  report environments (`http://localhost:5173/admin`, `http://localhost:3000`)
  were not booted during this rollout. Closure evidence below comes from
  targeted SSR/editor-wave/renderer validation:
  `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx`,
  `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`,
  and `bun test tests/unit/widgets/validator.test.ts`.
- `bun run scan:security:strict` was executed but could not finish green in this
  workspace because `semgrep` failed with `ca-certs: empty trust anchors` and
  `bun audit` returned `ConnectionRefused`. The remaining strict-scan lanes
  (`trivy` vuln/config/secret and `gitleaks` history/worktree) passed.

| Finding | Final status | Owner | Evidence |
|---|---|---|---|
| C1 | fixed | TASK-260-02 | Visual and Wizard now expose segment editors on both tracks; editor-wave covers both-track segment edits. |
| C2 | fixed | TASK-260-02 | Dual Track now keeps preserved segment copy instead of implying data loss. |
| C3 | fixed | TASK-260-02 | Wizard now includes highlight target + segment authoring when highlight mode is enabled. |
| C4 | fixed | TASK-260-03 | Visual owns `Add step` / `Remove step` buttons with min/max guard rails. |
| C5 | fixed | TASK-260-03 | Wizard and Visual both edit rendered step descriptions. |
| W1 | fixed | TASK-260-02 | `highlight.targetTrackIds` supports one-track or both-track highlighting while preserving legacy `targetTrackId`. |
| W2 | fixed | TASK-260-04 | Track/step/segment font-weight controls now exist in widget schema/editor/runtime. |
| W3 | fixed | TASK-260-04 | Compare Timeline now owns bounded section padding tokens instead of hardcoded padding only. |
| W4 | fixed | TASK-260-04 | Compare Timeline now owns bounded max-width tokens instead of hardcoded `max-w-6xl` only. |
| W5 | fixed | TASK-260-04 | Optional section heading + subtitle fields now render above the compare block. |
| W6 | fixed | TASK-260-03 | Axis step range now normalizes through `3-10` across schema/editor/runtime/tests. |
| W7 | fixed | TASK-299 | Shared contrast advisories now cover Compare Timeline color surfaces in the editor. |
| W8 | fixed | TASK-300 | Compare Timeline now exposes bounded motion presets with reduced-motion-safe runtime output. |
| W9 | fixed | TASK-260-04 | Render order is now configurable through `layout.trackOrder` without mutating stored track IDs. |
| W10 | fixed | TASK-260-03 | Axis steps and segment badges now support safe links through widget-safe href normalization. |
| W11 | fixed | TASK-260-01 | Highlighted segment background now renders a fallback color before the `color-mix(...)` enhancement. |
| W12 | fixed | TASK-260-03 | Axis steps now support bounded plain-text icon/emoji metadata. |
| W13 | fixed | TASK-260-04 | Track background color is now configurable through Compare Timeline-owned style fields. |
| W14 | fixed | TASK-260-04 | Marker shape tokens now support rounded, circle, numbered, and check treatments. |
| U1 | fixed | TASK-260-04 | Variant cards now include mini visual previews instead of text-only selection. |
| U2 | fixed | TASK-260-02 | Dual Track explains that hidden segments are preserved and return in highlight mode. |
| U3 | fixed | TASK-260-02 | Segment editor now surfaces a normalization warning when `from > to`. |
| U4 | task-256-physical-owner | TASK-256-02 | Shared `none` token semantics remain outside Compare Timeline-local closure. |
| U5 | fixed | TASK-260-04 | Compare Timeline now consumes the landed shared clear controls for label/background colors. |
| U6 | fixed | TASK-260-02 | Segment label placeholder/help now makes the fallback `Steps X-Y` copy explicit. |
| U7 | fixed | TASK-260-02 | Marker grids now warn when a track has no active markers. |
| U8 | fixed | TASK-260-02 | Advanced highlight target selector now shows label + stable ID and a `Both tracks` option. |
| U9 | fixed | TASK-260-04 | Visual spacing controls now show token-effect helper copy. |
| U10 | fixed | TASK-260-04 | Visual owns layout/spacing controls; Advanced no longer duplicates those controls. |
| R1 | fixed | TASK-260-01 | Desktop axis/track grids now follow the normalized step count instead of hardcoded three columns. |
| R2 | fixed | TASK-260-01 | The compare section now exposes a readable `aria-label`/`aria-labelledby` contract. |
| R3 | fixed | TASK-260-01 | Track rows now expose readable labels instead of unlabeled generic containers. |
| R4 | fixed | TASK-260-01 | Marker cells now expose readable static state labels instead of color-only state. |
| R5 | fixed | TASK-260-01 | Segment badges now expose readable labels in runtime output. |
| R6 | fixed | TASK-260-01 | Highlighted segment backgrounds now include a browser-compatible fallback. |
| R7 | fixed | TASK-260-01 | Track rows and step cells now keep a minimum visible height in sparse states. |
| R8 | fixed | TASK-260-01 | `guides.enabled=false` now removes borders instead of falling back to solid borders. |
| R9 | fixed | TASK-260-01 | Track rows and step cells now use overflow-safe rendering for long labels. |
