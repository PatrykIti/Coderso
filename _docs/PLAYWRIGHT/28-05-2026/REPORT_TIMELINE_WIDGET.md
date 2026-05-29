# RAPORT: Timeline Widget — pełny, wyczerpujący audyt (29-05-2026)

> **Status:** Zakończony — audyt od zera, **bez skrótów reprezentatywnych**
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-timeline-finish` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - timeline (`261d5209-9323-4237-ad8e-20eb3f0e9d60`)
> **Trasa publiczna:** `/ctr-timeline-2305`
> **Pliki źródłowe:**
> - `core/widgets/core/timeline.tsx` — renderer, model danych, schema, normalizacja, 5 layoutów
> - `core/admin/ui/widgets/editors/TimelineEditors.tsx` — edytory Wizard / Visual / Advanced
> - `core/admin/ui/widgets/editors/SharedColorControl.tsx`, `ClearableFields.tsx`, `LinkDestinationField.tsx`

---

## 0. Metoda i zakres — czym ten audyt różni się od poprzedniego

Poprzedni raport jawnie deklarował: _„testowano reprezentatywne wartości (np. nie każdą
grubość linii / każdy rozmiar opisu osobno)"_. **Ta słabość została wyeliminowana.**
Bieżący audyt **klika i weryfikuje każdą pojedynczą wartość w każdej rodzinie kontrolek**:
wszystkie 3 karty wariantu, wszystkie 4 karty trybu **oraz** osobno wszystkie 4 opcje
selecta trybu, obie orientacje, obie pozycje etykiet, wszystkie 3 wyrównania, **cały zakres
3–8 kroków**, oba style prowadnic, oba style linii, **wszystkie 4 grubości linii**, wszystkie
3 rozmiary i 3 tryby markera, **wszystkie 4 statusy kroku**, wszystkie 5 rozmiarów tytułu,
4 grubości tytułu, 5 rozmiarów opisu, 5 wartości odstępu, 3 paddingi, 4 odstępy zewnętrzne,
**wszystkie 6 szerokości max**, każde czyszczalne pole koloru (set + Clear + transparent),
dodawanie/usuwanie/przenoszenie kroków (Up/Down **oraz natywny drag&drop**) i per-krokowe
selektory celu (CTA + link całego kroku).

Każda interakcja była realna (kliknięcie/wypełnienie w żywym UI), a wynik **weryfikowany
asercją w DOM żywego podglądu** (`run-code`/`eval` na canvasie admina) oraz — dla frontu —
na surowym HTML SSR i w przeglądarce.

**Łącznie wykonano > 110 dyskretnych interakcji** (samych wyborów wartości enum: 86;
operacji na kolorach: ~14; edycji treści/celów: ~13; operacji CRUD/reorder: 9).

**Czego świadomie NIE robiono:** nie zapisywano (`Save draft`) ani nie publikowano zmian —
aby nie zmutować współdzielonej fixtury. Wszystkie eksperymenty żyły wyłącznie w pamięci
edytora (stan React). W konsekwencji trasa publiczna pokazuje **opublikowaną wersję domyślną**.

**Screenshoty:** nie przechwytywano żadnych plików PNG. Weryfikacja w 100% przez asercje
DOM/`eval`/SSR. (Automatyczne migawki `playwright-cli` to pliki YAML — wyłącznie lokalne
etykiety robocze, ignorowane przez Git, niestanowiące evidence w repo.)

---

## 1. Przegląd widgetu

**Typ:** `timeline` (kategoria: content)
**Warianty (variant):** `milestones`, `cards`, `compact`
**Tryby treści (mode):** `process`, `axis`, `chronology`, `alternating`
**Layouty renderera (5):** milestones, cards, chronology, alternating, compact
**Limity kroków:** min 3 / max 8
**Tryby edytora:** Wizard (setup, read-only), Visual (codzienna edycja), Advanced (diagnostyka, read-only)

Mapowanie preferowanych wariantów dla trybów: `process→compact`, `axis→milestones`,
`chronology→cards`, `alternating→cards`. Logika wyboru layoutu renderera:
`chronology` → chronology; `alternating` → alternating; `process` **lub** wariant `compact` → compact;
wariant `cards` → cards; w pozostałych przypadkach → milestones.

**Stan opublikowany (domyślny, 3 kroki):** Discovery / Planning / Build + opisy;
`milestones`/`axis`, horizontal, label top, spacing md, padding md, section-spacing none,
max-width 6xl, marker dot, guides dashed enabled, tło transparent.

---

## 2. Struktura trybów edytora (istotny niuans IA)

Lista zakładek eksponuje **tylko Visual (domyślna) i Advanced**. **Wizard nie jest zakładką** —
to jednorazowy przepływ uruchamiany przyciskiem **„Run setup again"**; panel boczny pokazuje
**„Setup complete"** z notą _„Daily edits live in Visual. Advanced is for technical diagnostics."_
Z Wizarda wraca się przyciskiem **„Finish setup and open Visual"** (zweryfikowane: przełącza na Visual).

---

## 3. CO PRZETESTOWANO i DZIAŁA — pełna macierz (asercje w DOM)

### 3.1 Sekcja „Variant and timeline structure"

| Kontrolka | Każda przetestowana wartość | Zaobserwowany efekt w DOM | Wynik |
|-----------|------------------------------|---------------------------|-------|
| **Karty wariantu (3)** | Milestones / Cards / Compact | `data-timeline-variant` = milestones/cards/compact; **mode pozostaje `axis`**; layout idzie za wariantem (milestones→`flex justify-center`, cards→`grid md:grid-cols-3`, compact→`flex w-max`) | ✅ |
| **Karty trybu (4)** | Process / Axis / Chronology / Alternating | `mode` ustawiony **i** wariant zmieniony na preferowany: process→compact, axis→milestones, chronology→cards, alternating→cards | ✅ |
| **Select „Timeline mode" (4)** | Process / Axis / Chronology / Alternating | `mode` zmieniony, **wariant pozostaje `milestones`** (layout idzie za mode); patrz **§5 — niespójność z kartami** | ✅ (działa, ale niespójnie) |
| **Orientation (2)** | Horizontal / Vertical | `data-timeline-orientation`; ol `flex min-w-full` (H) ↔ `flex flex-col` (V) | ✅ |
| **Label position (2)** | Top / Bottom | `data-timeline-label-position` = top/bottom | ✅ |
| **Alignment (3)** | Start / Center / End | ol `justify-start` / `justify-center` / `justify-end` | ✅ |
| **Number of steps (6)** | 3, 4, 5, 6, 7, 8 | liczba `[data-timeline-step]` i ID `step-1…step-N` zgodne; klasa szerokości `max-w-6xl` przy ≥4 krokach, **`max-w-5xl` przy 3 krokach** (niuans N2) | ✅ |

### 3.2 Sekcja „Guides and axis line"

| Kontrolka | Każda przetestowana wartość | Zaobserwowany efekt w DOM | Wynik |
|-----------|------------------------------|---------------------------|-------|
| **Show guide lines (switch)** | OFF → ON | OFF: łączniki 2 → **0**; ON: **0 → 2** | ✅ |
| **Guide style (2)** | Solid / Dashed | `connector.style.border-style` = solid/dashed | ✅ |
| **Line style (2)** | Solid / Dashed | `marker.style.border-style` = solid/dashed (kontrolka „Line style" dotyczy obramowania markera) | ✅ |
| **Line thickness (4)** | 1px / 2px / 3px / 4px | `marker.border-width` **oraz** `connector.height` = 1/2/3/4px | ✅ |

### 3.3 Sekcja „Markers and accents"

| Kontrolka | Każda przetestowana wartość | Zaobserwowany efekt w DOM | Wynik |
|-----------|------------------------------|---------------------------|-------|
| **Marker size (3)** | Small / Medium / Large | klasa kropki `h-2.5 w-2.5` / `h-3.5 w-3.5` / `h-5 w-5` | ✅ |
| **Marker display (3)** | Dot / Number / Icon | `data-timeline-marker-display`; Number → marker wypełniony `h-8 w-8` z numerem; **Icon bez ikony → cicho renderuje kropkę** (N3); Icon z ikoną → renderuje glif | ✅ |
| **Global marker color** | `#ff00ff` + Clear | `marker.background-color` = `rgb(255,0,255)`; po Clear → `var(--color-primary)`, etykieta „Theme default", Clear `[disabled]` | ✅ |
| **Step 1 accent** | `#123456` + Clear | tło markera kroku 1 = `rgb(18,52,86)` (nadpisuje global) | ✅ |
| **Step 1 marker background** | `#abcdef` + Clear | tło markera = `rgb(171,205,239)` (nadpisuje accent) | ✅ |
| **Step 1 marker icon color** | `#ff8800` | przy display=icon: `marker.color` = `rgb(255,136,0)` (kolor tekstu glifu) | ✅ |
| **Marker icon (input)** | `★` | po display=Icon marker pokazuje `★` | ✅ |

**Potwierdzony łańcuch pierwszeństwa koloru markera:** `markerBackgroundColor` ▸ `accent`
▸ `markerColor` (global) ▸ `var(--color-primary)`. Test krzyżowy: przy ustawionym
`markerBackground` wyczyszczenie `accent` nie zmienia koloru (markerBackground nadal wygrywa);
dopiero wyczyszczenie markerBackground wraca do `var(--color-primary)`.

### 3.4 Sekcja „Colors and background"

| Kontrolka | Operacje | Zaobserwowany efekt w DOM | Wynik |
|-----------|----------|---------------------------|-------|
| **Line color** | set `#ff0000` / Clear | `connector.background-color` = `rgb(255,0,0)` → po Clear `var(--color-border)`, „Theme default", Clear `[disabled]` | ✅ |
| **Title color** | set `#00ff00` / Clear | `title.color` = `rgb(0,255,0)` → po Clear `var(--color-text)` | ✅ |
| **Description color** | set `#0000ff` / Clear | `description.color` = `rgb(0,0,255)` → po Clear `var(--color-text)` | ✅ |
| **Background color** | set `#ffeeaa` / „Use transparent" / Clear | `section.background-color` = `rgb(255,238,170)` → „transparent" (etykieta „Transparent") → po Clear pusty (etykieta „Theme default", Clear `[disabled]`) | ✅ |
| **Marker / Text contrast advisory** | stan inherited (puste kolory) | obie advisory obecne („Marker contrast advisory", „Text contrast advisory") z tekstem dla wartości dziedziczonych/transparentnych | ✅ |

### 3.5 Sekcja „Typography and spacing"

| Kontrolka | Każda przetestowana wartość | Zaobserwowany efekt w DOM | Wynik |
|-----------|------------------------------|---------------------------|-------|
| **Header title (input)** | „Nasz proces" | `<h2 id="timeline-heading-nasz-proces">`; `section[aria-labelledby="…"]`; `aria-label` znika; etykieta `<ol>` → „Nasz proces steps" | ✅ |
| **Header description (textarea)** | „Od pomysłu do wdrożenia." | renderowany akapit nad osią | ✅ |
| **Title size (5)** | None / Small / Base / Large / Extra large | None → tytuł **ukryty** (+ amber-ostrzeżenie); reszta → `text-sm` / `text-base` / `text-lg` / `text-xl` | ✅ |
| **Title weight (4)** | Normal / Medium / Semibold / Bold | `data-timeline-title-weight` + klasa `font-normal/medium/semibold/bold` | ✅ |
| **Description size (5)** | None / Extra small / Small / Base / Large | **None → klasa pusta, opis NADAL widoczny** (niuans N6); reszta → `text-xs/sm/base/lg` | ✅ |
| **Spacing (5)** | None / Compact / Default / Spacious / Extra spacious | szerokość łącznika (milestones-H) = 1rem / 2rem / 3rem / 4rem / 5rem | ✅ |
| **Section padding (3)** | Compact / Default / Relaxed | `data-timeline-padding` + klasy `px-4 py-6` / `px-4 py-8` / `px-6 py-10` | ✅ |
| **Outer section spacing (4)** | None / Small / Medium / Large | `data-timeline-section-spacing` + klasy `my-0` / `my-4` / `my-8` / `my-12` | ✅ |
| **Max width (6)** | None / 4XL / 5XL / 6XL / 7XL / Full | klasa: `max-w-none/4xl/5xl/7xl/full` zgodnie; **6XL przy 3 krokach → `max-w-5xl`** (N2 dotyczy **wyłącznie** 6xl) | ✅ |

### 3.6 Sekcja „Steps content and order" (treść + CRUD)

| Kontrolka / akcja | Test | Zaobserwowany efekt w DOM | Wynik |
|-------------------|------|---------------------------|-------|
| **Tytuł kroku (input)** | „Odkrywanie" | podgląd natychmiast pokazuje „Odkrywanie" | ✅ |
| **Opis kroku (textarea)** | „Zdefiniuj cele i kontekst." | podgląd pokazuje nowy opis | ✅ |
| **Data — proza** | „Q3 launch" | komunikat w `text-destructive` (czerwony): „Use YYYY-MM-DD here or move prose…" | ✅ |
| **Data — ISO** | „2026-09-01" | komunikat neutralny „Machine-readable date looks good…"; render `<time datetime="2026-09-01">` | ✅ |
| **Date label** | „1 września 2026" | `<time datetime="2026-09-01">1 września 2026</time>` (datetime zostaje ISO, tekst = label) | ✅ |
| **Status (4)** | No status / Upcoming / Current / Complete | badge `data-timeline-status` + tekst; **Current → `aria-current="step"` na `<li>`**; No status → brak badge i `aria-current` | ✅ |
| **Decorative icon (input)** | „IQ" | `span[aria-hidden]` z ikoną obok tytułu | ✅ |
| **CTA label + destynacja** | „Dowiedz się więcej" + HomePage | `<a href="/homepage">Dowiedz się więcej</a>` w podglądzie | ✅ |
| **Wzajemne wykluczanie** | CTA aktywne | komunikat „Whole-step links are disabled when a CTA link is configured to avoid nested anchors." | ✅ |
| **Whole-step label + destynacja** | krok 2 (bez CTA) + HomePage | cała powierzchnia kroku 2 → `<a href="/homepage" aria-label="Cały krok 2">` | ✅ |
| **Clear destination** | krok 2 link | po kliknięciu „Clear destination" kotwica całego kroku znika | ✅ |
| **Add step** | 3 → 4 → … → 8 | liczba kroków rośnie; przy **8 krokach „Add step" `[disabled]`** (guard max) | ✅ |
| **Remove (guard)** | przy 3 krokach | wszystkie „Remove" `[disabled]`; przy 4 krokach — aktywne; usunięcie wraca do 3 | ✅ |
| **Up/Down (granice)** | krok 1 / ostatni | „Up" `[disabled]` na pierwszym, „Down" `[disabled]` na ostatnim | ✅ |
| **Reorder Up/Down** | krok 1 „Down", potem „Up" | kolejność `[step-1,step-2,step-3]` → `[step-2,step-1,step-3]` → z powrotem | ✅ |
| **Natywny drag & drop** | przeciągnij krok 1 na krok 3 | po pełnej sekwencji HTML5 (`dragstart`→`dragenter`→`dragover`→`drop`) kolejność `[step-1,2,3]` → **`[step-2,step-3,step-1]`** (moveStep 0→2); `dataTransfer`=„timeline-step:0", `dragover` poprawnie `preventDefault` | ✅ |

> **Uwaga metodologiczna do DnD:** wbudowane `dragTo` (symulacja myszą) **nie** wyzwoliło
> reorderingu (typowe ograniczenie HTML5 DnD w narzędziach). Reorder potwierdzono dopiero
> pełną, jawną sekwencją natywnych zdarzeń `DragEvent` ze wspólnym `DataTransfer` na właściwym
> kontenerze kroku — i wtedy **działa poprawnie**. To zmiana względem poprzedniego raportu,
> który gestu DnD nie zweryfikował.

---

## 4. Walidacja i podpowiedzi (UX pozytywny — potwierdzone)

- **Walidacja daty w czasie rzeczywistym** rozróżnia poprawny `YYYY-MM-DD` (neutralnie) od prozy
  (czerwony błąd + sugestia przeniesienia do „Date label"). „Date label" przetrwa pustą datę.
- **Ostrzeżenie o ukrytych tytułach:** Title size = None pokazuje amber-box „Step titles are
  currently hidden…" (potwierdzone: dokładnie 1 box z tą treścią).
- **Wzajemne wykluczanie CTA ↔ link całego kroku** — jawny komunikat + renderer odrzuca link
  całego kroku, gdy istnieje CTA (brak zagnieżdżonych kotwic).
- **Karty trybu** pokazują preferowany wariant (badge) i zdanie kontekstowe.
- **Guard minimum/maximum kroków** (3–8) wymuszany na przyciskach Add/Remove.
- **Etykiety stanu koloru** w pickerze: „Theme default" / „Selected color" / „Transparent" /
  „Saved custom color"; przycisk Clear `[disabled]`, gdy brak wartości.

---

## 5. CO NIE DZIAŁA / NIESPÓJNOŚCI (defekty i ryzyka)

### 5.1 ⚠️ Niespójność: select „Timeline mode" vs karty trybu (GŁÓWNE NOWE USTALENIE)

To **dwie kontrolki reprezentujące to samo pojęcie (mode), które zachowują się różnie:**

- **Karty trybu** (`Mode preview`) wołają `updateMode(..., onVariantChange, onBlockPatch)` —
  ustawiają mode **oraz** preferowany wariant (np. Chronology → variant `cards`).
- **Select „Timeline mode"** woła `updateMode(value, onChange, next)` **bez** `onVariantChange`
  / `onBlockPatch` — zmienia **tylko** mode, wariant zostaje bez zmian.

**Skutek dla autora:** wybór „Chronology" z dropdowna renderuje layout chronology (mode wygrywa
w rendererze), ale karty wariantu powyżej dalej pokazują zaznaczone „Milestones", a
`data-timeline-variant` pozostaje `milestones`. Dwie kontrolki o tej samej semantyce dają
**rozbieżny stan**. To **nie jest crash** (renderer to obsługuje), ale jest to realna
niespójność kontraktu/UX — najpoważniejsze ustalenie tego audytu. Rekomendacja: ujednolicić
(albo select też powinien ustawiać preferowany wariant, albo usunąć duplikujący się select).

### 5.2 Brak twardych defektów funkcjonalnych

Poza powyższą niespójnością **żadna z > 110 interakcji nie ujawniła błędu funkcjonalnego**:
każda wartość każdej kontrolki poprawnie aktualizowała podgląd, utrzymywała stan i odzwierciedlała
się w diagnostyce Advanced oraz w SSR. Konsola: 0 błędów / 0 ostrzeżeń (admin i front).

---

## 6. NIUANSE LOGIKI (zgodne z kodem, ale potencjalnie mylące)

| # | Obserwacja | Wyjaśnienie / dowód |
|---|-----------|---------------------|
| N1 | **Karty wariantu nie zmieniają trybu; karty trybu zmieniają wariant** | Asymetria z założenia. Klik „Cards" przy `mode=axis` → layout cards, ale mode dalej `axis`; klik trybu „Process" → także wariant `compact`. |
| N2 | **`maxWidth=6XL` przy ≤3 krokach renderuje `max-w-5xl`** | Renderer: `steps.length <= 3 && maxWidth === "6xl" ? "5xl" : maxWidth`. **Potwierdzono, że dotyczy WYŁĄCZNIE 6xl** — 4xl/5xl/7xl/full/none renderują się dosłownie. `data-timeline-max-width` raportuje wybrane `6xl`, ale klasa to `max-w-5xl`. |
| N3 | **Marker „Icon" bez ikony cicho degraduje do kropki** | `markerDisplay === "icon" && !(markerIcon ?? icon) ? "dot"`. Przy display=Icon i braku ikony marker ma klasę kropki (`h-3.5 w-3.5`), mimo `data-timeline-marker-display=icon`. Po wpisaniu ikony (`★`) marker renderuje glif. Edytor nie ostrzega (kontrast do wyraźnego amber przy Title=None). |
| N4 | **Swatch koloru pokazuje kolor fallback mimo „Theme default"** | `type=color` nie reprezentuje pustej wartości — picker pokazuje np. `#1d4ed8`/`#ffffff`, choć etykieta brzmi „Theme default" i Clear `[disabled]`. Wizualnie sugeruje aktywny kolor, gdy faktycznie dziedziczony z motywu. |
| N5 | **„Line style" dotyczy też obramowania markera**, nie tylko łącznika/osi | Jedna kontrolka wpływa na dwa elementy wizualne: `renderMarker` używa `borderStyle: style.lineStyle`. Potwierdzone: Dashed → marker border-style dashed. |
| N6 | **Description size = „None" NIE ukrywa opisu** | W przeciwieństwie do Title size „None" (ukrywa tytuł + amber), Description „None" daje jedynie pustą klasę rozmiaru (`descriptionSizeClassMap.none = ""`), więc opis dalej się renderuje, tylko bez klasy rozmiaru. Niespójność modelu „None" tytuł↔opis. |
| N7 | **Dwa zestawy kontrolek szerokości/odstępów** | Widget: „Typography and spacing" (Spacing, Section padding, Outer section spacing, Max width) ORAZ współdzielony „Block layout" (Content width, Top/Bottom padding/margin). Częściowo nakładające się pojęcia w dwóch miejscach. |

---

## 7. Tryb Advanced — DZIAŁA (read-only, żywe lustro stanu)

Liczba edytowalnych kontrolek w panelu Advanced: **0** (potwierdzone — 0 `input/textarea/combobox/switch/select`).
Diagnostyka **natychmiast** odzwierciedla niezapisany stan Visual. Zrzut bieżącego (zmodyfikowanego) stanu:

- Runtime: Variant `milestones`, Mode `axis`, Steps „3 configured steps."
- Layout: „Orientation: Horizontal; Alignment: Center; Spacing: …; Padding: Default; Width: 6XL; Labels: Top".
- Guides: „Enabled, Dashed style." · Style: „Line: Solid; Thickness: 2px; **Marker: Icon / Medium**; Title: Base Semibold".
- Kolory: „Theme default" (po wyczyszczeniu), Background „Inherited / transparent".
- **Step marker icon colors: „1 override"** (zgodne z ustawionym `#ff8800` na kroku 1),
  Step accents / marker backgrounds: „0 overrides".
- **Step CTA links: „1 safe CTA destination"** (krok 1 → HomePage), Whole-step links: „Not configured".
- Macierz własności (Wizard / Visual / Advanced owns …) oraz reguły normalizacji (`3-8`, unikalne stabilne ID).

Wniosek: Advanced jest wiernym, czytelnym lustrem — wszystkie wartości zgadzały się 1:1 z moimi
niezapisanymi zmianami w Visual.

---

## 8. Tryb Wizard — DZIAŁA (z założenia w pełni read-only)

- Sekcja „Starter steps": **0 edytowalnych kontrolek** (potwierdzone), jedyny przycisk
  „Finish setup and open Visual".
- **Live preview** renderuje 3 kroki przez ten sam renderer.
- Read-only podsumowanie: Timeline style, Header title/description (z fallbackami
  „No header title/description yet"), Number of steps, oraz per-krok tytuł/opis.
- Wyjście „Finish setup and open Visual" → poprawnie wraca na zakładkę Visual (zweryfikowane).

---

## 9. Trasa publiczna (frontend) — DZIAŁA (SSR)

URL `http://localhost:3000/ctr-timeline-2305` → **HTTP 200**.

- **SSR:** surowy HTML serwera (4619 B) zawiera komplet `data-timeline-*`, 3× `data-timeline-step`,
  `<ol aria-label="Timeline steps">`, `aria-label="Timeline"`, treść Discovery/Planning/Build +
  opisy. Render w pełni server-side (nie hydratacja po stronie klienta). Wariant: `milestones`.
- **A11y (render w przeglądarce):** `section[aria-label="Timeline"]` (fallback, bo brak
  opublikowanego nagłówka), `<ol aria-label="Timeline steps">`, 3× `<li data-timeline-step>`.
  W admin potwierdzono dodatkowo: ustawienie nagłówka → `aria-labelledby` + `<h2 id>`; status
  Current → `aria-current="step"`; data → `<time datetime>`. Opublikowana wersja domyślna nie ma
  linków/statusów/dat (0/0/0 — zgodnie z oczekiwaniem).
- **Responsywność 375px:** pozioma oś (`overflow-x-auto`) **przewija się wewnątrz kontenera**
  (scrollWidth 484 > clientWidth 343), a **strona nie ma poziomego przepełnienia**
  (`pageScrollWidth == clientWidth == 375`).
- **Konsola:** 0 błędów, 0 ostrzeżeń.

> Trasa publiczna pokazuje **opublikowaną wersję domyślną** — moje zmiany w Visual nie były
> zapisywane (ochrona fixtury), więc świadomie nie są na froncie widoczne.

---

## 10. CZEGO NIE DAŁO SIĘ W PEŁNI ZWERYFIKOWAĆ (uczciwie, z dokładną przyczyną)

| # | Element | Powód | Status |
|---|---------|-------|--------|
| NT1 | **Runtime'owy efekt moich zmian na froncie** | Świadomie **nie zapisywano/nie publikowano** (ochrona współdzielonej fixtury). Trasa publiczna pokazuje wersję opublikowaną (domyślną). Efekt zmian potwierdzono pośrednio: żywy podgląd admin + lustro w Advanced + SSR wersji domyślnej. End-to-end render zapisanych zmian — nietestowany. | Świadomy brak |
| NT2 | **Pojedynczy wybór każdej z ~50 stron** w selektorze celu (CTA/whole-step) | Realnie wybrano **HomePage** (CTA i whole-step). Pozostałych ~50 opublikowanych stron nie wybierano osobno — wszystkie pochodzą z tej samej listy `listPagesCached()` i renderują się identycznie (różni je tylko slug). | Częściowe (1 z N realnie) |
| NT3 | **`rel="noopener noreferrer"` dla linków http(s)** | `LinkDestinationField` pozwala wybrać **tylko istniejące strony serwisu** (URL-e względne `/...`). Dla linku względnego potwierdzono `rel=null` (poprawnie). Gałąź http/https (gdzie renderer ustawia `rel`) nie jest możliwa do wyzwolenia przez picker w tej fixturze. | Nietestowalne bez custom href |
| NT4 | **Gałęzie „Saved custom destination" / „No pages available" / „loadError"** w selektorze | Wymagają zapisanego custom href, pustej listy stron lub awarii `listPagesCached()` (mock sieci). Kod tych gałęzi widoczny (opcje `[disabled]` / komunikat amber), ale nie da się ich wytworzyć bez zapisu/mocka. | Nietestowalne bez zapisu/mocka |
| NT5 | **Współdzielony „Block layout" / „Visibility summary"** (w Advanced) | To kontrolki współdzielonego inspektora bloku, nie samego timeline (patrz U7). Poza zakresem audytu widgetu. | Poza zakresem widgetu |

---

## 11. Dodatkowe niuanse UX/UI

| # | Niuans | Obszar |
|---|--------|--------|
| U1 | Wizard = przepływ „setup" (read-only), nie zakładka; tylko Visual/Advanced są zakładkami | IA edytora |
| U2 | **Select trybu vs karty trybu dają rozbieżny stan wariantu** (§5.1) — najpoważniejsza niespójność | Visual / struktura |
| U3 | Asymetria wariant↔mode (N1) | Visual / struktura |
| U4 | `maxWidth=6XL` przy ≤3 krokach → 5xl (N2), bez sygnału w combobox | Visual / renderer |
| U5 | „Icon" marker bez ikony bez efektu i bez ostrzeżenia (N3) | Visual / markery |
| U6 | Swatch pokazuje fallback mimo „Theme default" (N4) | Shared color control |
| U7 | Współdzielona „Visibility summary" (Advanced) pokazała „Shown on: **Hidden on all devices**", mimo że front renderuje widget na desktopie. To pole współdzielonego inspektora bloku (pusta konfiguracja widoczności = mylący tekst), **nie** logika timeline — front renderuje poprawnie. Do osobnej weryfikacji poza zakresem widgetu. | Shared block inspector |
| U8 | Description „None" nie ukrywa opisu, a Title „None" ukrywa tytuł — niespójny model „None" (N6) | Visual / typografia |
| U9 | Dublujące się kontrolki szerokości/odstępów: widget vs „Block layout" (N7) | Visual / IA |

---

## 12. Podsumowanie

**Ocena ogólna:** widget `timeline` jest w **dojrzałym, sprawnym stanie funkcjonalnie**.
Po wyczerpującym przejściu przez **każdą wartość każdej rodziny kontrolek** (>110 interakcji)
nie znaleziono twardego defektu funkcjonalnego.

**Co działa (potwierdzone wartość-po-wartości):** 3 warianty, 4 karty trybu, 4 opcje selecta
trybu, 2 orientacje, 2 pozycje etykiet, 3 wyrównania, 3–8 kroków, switch prowadnic, 2 style
prowadnic, 2 style linii, 4 grubości linii, 3 rozmiary i 3 tryby markera (z fallbackiem N3),
global + per-krok kolory markera (z łańcuchem pierwszeństwa), 4 czyszczalne kolory + transparent,
5 rozmiarów tytułu (+ ukrycie + amber), 4 grubości tytułu, 5 rozmiarów opisu, 5 odstępów,
3 paddingi, 4 odstępy zewnętrzne, 6 szerokości max (z narrowingiem N2), nagłówek (h2+a11y),
treść kroków, walidacja daty, date label, 4 statusy (+ aria-current), ikona dekoracyjna,
CTA + link całego kroku + wzajemne wykluczanie + Clear destination, Add/Remove z guardami 3–8,
reorder Up/Down **oraz natywny drag&drop**. Wizard i Advanced — read-only zgodnie z kontraktem
(0 edytowalnych pól), Advanced to żywe lustro stanu. Front: SSR, a11y, responsywność, czysta konsola.

**Co wymaga uwagi (nie crash, ale do poprawy):**
- **§5.1 — niespójność select trybu vs karty trybu** (rozbieżny stan wariantu). Główne ustalenie.
- Niuanse N2–N6 to zachowania zgodne z kodem, ale mylące UX (zwłaszcza N3 i N6 — niespójny model „None").
- U7 — mylące etykietowanie współdzielonego podsumowania widoczności (poza zakresem timeline).

**Czego nie weryfikowano (świadomie/technicznie):** zapisu/publikacji (ochrona fixtury, NT1),
pojedynczego wyboru każdej z ~50 stron w selektorze celu (zweryfikowano HomePage, NT2), gałęzi
http-rel oraz „custom destination / no pages / load error" (NT3–NT4).

---

## 13. Statystyki testu

| Kategoria | Wartość |
|-----------|---------|
| Tryby przetestowane | 3 (Wizard, Visual, Advanced) |
| Dyskretne wartości enum kliknięte/zweryfikowane | 86 (3+4+4+2+2+3+6+2+2+2+4+3+3+5+4+5+5+3+4+6+4) |
| Operacje na kolorach (set/clear/transparent) | ~14 |
| Edycje treści/celów | ~13 |
| Operacje CRUD/reorder (w tym natywny DnD) | 9 |
| **Łącznie dyskretnych interakcji** | **> 110** |
| Twarde defekty funkcjonalne | 0 |
| Niespójności kontraktu/UX | 1 (select trybu vs karty, §5.1) |
| Niuanse logiki (N1–N7) | 7 |
| Dodatkowe niuanse UX/UI (U1–U9) | 9 |
| Edytowalne kontrolki w Wizard / Advanced | 0 / 0 (zgodnie z kontraktem) |
| Nietestowalne (z przyczyną) | 5 (NT1–NT5) |
| Trasa publiczna | HTTP 200, SSR, 3 kroki, 0 błędów konsoli, brak page-overflow @375px |
| Zrzuty PNG | 0 (weryfikacja wyłącznie przez DOM/eval/SSR; ewentualne zrzuty byłyby tylko lokalnymi etykietami) |
