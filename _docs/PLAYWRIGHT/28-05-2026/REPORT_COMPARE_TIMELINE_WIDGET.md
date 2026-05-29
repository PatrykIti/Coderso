# RAPORT: Compare Timeline Widget — audyt bieżącego stanu (28-05-2026)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-compare-timeline` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - compare-timeline (`9ad7e86e-e732-4d17-9ea9-07c5bfb32cca`)
> **Trasa publiczna:** `/test-compare-timeline-0516`
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Poprzedni raport:** `_docs/PLAYWRIGHT/27-05-2026/REPORT_COMPARE_TIMELINE_WIDGET.md` (wówczas clean smoke `passed`, tylko visual/advanced)

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI
edytora (klikanie kart wariantów, przełączanie selectów, wpisywanie tekstu,
przełączniki) oraz na inspekcji DOM/`eval` na żywym podglądzie admin i na trasie
publicznej. Każdą zmianę kontrolki sprawdzano przez atrybuty `data-compare-*`,
klasy CSS i `computed style` w podglądzie.

**Co faktycznie przetestowano:** logowanie, otwarcie fixtury, tryb Wizard (cały),
tryb Visual (reprezentatywny, ale szeroki przekrój wszystkich 7 sekcji), tryb
Advanced (diagnostyka read-only + normalizacja), oraz statyczny render SSR trasy
publicznej z kontrolą a11y, segmentów, markerów, konsoli i responsywności (375px).

**Czego NIE testowano (świadomie):**
- **Nie zapisywano** zmian (`Save draft` / `Publish`) — aby nie zmutować
  współdzielonej fixtury dla innych agentów. Wszystkie eksperymenty w admin były
  w pamięci edytora.
- **Pól linkowania** `Step destination` i `Segment destination` (komponent
  `LinkDestinationField`) — wymagają wskazania istniejącej strony docelowej;
  nie wybierałem celu, więc linkowania kroków/segmentów nie zweryfikowano end-to-end.
- Przycisków **`Remove step`** i **`Remove segment`** (testowano tylko dodawanie:
  `Add step`, `Add segment`).
- **Każdego** pola koloru z osobna — `Marker color` przetestowano w pełni (zmiana +
  `Clear`); pozostałe pola koloru (highlight, track label, step label, muted, guide,
  track background) są strukturalnie identyczne i nie były klikane pojedynczo.
- **Wszystkich** opcji typografii — przetestowano `Track label size`; pozostałe
  (step/segment label size, 3× font weight) używają tego samego wzorca selecta.
- Stylów `Soft badge` (highlight) oraz kształtów `Circle`/`Check mark` (testowano
  `Filled`/`Outlined` oraz `Rounded`/`Numbered`).
- Dynamicznego przeliczania **contrast advisory** (zaobserwowano tylko stan
  „unknown" przy domyślnym przezroczystym tle ścieżki).

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja odbyła się przez
asercje DOM/`eval`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi
etykietami, ignorowanymi przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**
- `core/widgets/core/compareTimeline.tsx` — renderer, model danych, normalizacja, schema, SSR
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` — edytory Wizard / Visual / Advanced

---

## 1. Przegląd widgetu

**Typ:** `compare-timeline` (kategoria: content)
**Warianty:** `dual-track` (Dual Track), `dual-track-highlight` (Dual Track Highlight)
**Tryby edytora:** Wizard (read-only setup), Visual (codzienna edycja), Advanced (diagnostyka read-only)

Widget renderuje dwutorowe (dwie ścieżki: „a" i „b") porównanie procesu na wspólnej
osi kroków (3–10 kroków). Każda ścieżka ma etykietę i zestaw aktywnych markerów na
osi. Wariant `dual-track-highlight` dodatkowo eksponuje **segmenty** (zakresy kroków)
oraz mechanizm **highlight targets** (która ścieżka / obie są podświetlone). Renderer
jest w pełni server-side (SSR), z bogatym zestawem `data-compare-*` atrybutów, klas
Tailwind oraz inline-style dla kolorów/typografii.

**Model danych (skrót):**

| Sekcja | Pola |
|--------|------|
| `header` | `title`, `subtitle` |
| `axis.steps[]` | `id`, `label`, `description`, `icon`, `href` (3–10 kroków) |
| `tracks[]` (dokładnie 2) | `id`, `label`, `markers[]`, `segments[]` |
| `guides` | `enabled`, `style` (solid/dashed) |
| `layout` | `trackSpacing`, `labelPosition`, `maxWidth`, `padding`, `trackOrder`, `motion` |
| `highlight` | `targetTrackId`, `targetTrackIds[]` |
| `style` | kolory (7), rozmiary etykiet (3), font weights (3), `highlightLabelStyle`, `markerShape` |

---

## 2. Struktura trybów edytora — istotny niuans IA

Analogicznie do innych dojrzałych widgetów (np. product-table), lista zakładek
trybu eksponuje **tylko dwie** zakładki: **Visual** (domyślnie zaznaczona) oraz
**Advanced**. **Tryb Wizard NIE jest równorzędną zakładką** — jest jednorazowym
przepływem konfiguracji uruchamianym przyciskiem **„Run setup again"**. Panel boczny
nad zakładkami pokazuje status **„Setup complete"** z opisem:
_„Daily edits live in Visual. Advanced is for technical diagnostics."_

Aby przetestować Wizard, kliknąłem „Run setup again". Wyjście z Wizarda następuje
przyciskiem **„Finish setup and open Visual"**, który poprawnie przełącza z powrotem
na zakładkę Visual (zweryfikowane). To świadoma decyzja IA (Wizard = onboarding/setup),
nie defekt.

---

## 3. Tryb Wizard — wynik: DZIAŁA (świadomie read-only)

Wizard zawiera **wyłącznie podsumowanie read-only** (zgodnie z kontraktem edytora:
sekcja `compare-timeline.wizard.starter-comparison` ma `writablePaths: []`):

- Sekcja **„Quick setup"** z opisem _„Set comparison baseline without deep styling controls."_
- Wiersz read-only **„Highlight mode"** → `Disabled` (bo fixtura startuje w `dual-track`)
- Wiersz read-only **„Axis step count"** → `3 steps`
- Notka: _„Visual owns axis wording, track labels, marker mapping, and highlight
  segment editing after setup."_
- Przycisk **„Finish setup and open Visual"**
- Żywy panel **„Live preview"** renderujący widget przez współdzielony renderer

| Test | Akcja | Wynik | Status |
|------|-------|-------|--------|
| Wejście do Wizarda | „Run setup again" | Wizard otwiera się, pokazuje summary + live preview | ✅ działa |
| Brak edytowalnych pól | inspekcja sekcji | potwierdzone — same wiersze summary, brak inputów/selectów | ✅ zgodne z kontraktem |
| Wyjście | „Finish setup and open Visual" | przełączenie na zakładkę Visual | ✅ działa |

**Wniosek:** Wizard działa zgodnie z intencją — jest celowo „cienki" i deklaruje
wprost, że całe modelowanie porównania mieszka w Visual. Nie ma tu nic do
„zepsucia", bo nie ma kontrolek zapisujących.

---

## 4. Tryb Visual — wynik: DZIAŁA w całości (przetestowany zakres)

Visual deklaruje 7 sekcji: Variant, Section heading, Axis steps and track labels,
Markers and segment mapping, Highlight and guide styles, Colors and typography,
Spacing and layout. Przetestowano szeroki, reprezentatywny przekrój — **każda
testowana kontrolka aktualizowała podgląd na żywo** i utrzymywała stan w UI.

### 4.1 Co przetestowano i działa

| Sekcja | Kontrolka | Test | Zweryfikowany efekt w podglądzie | Status |
|--------|-----------|------|----------------------------------|--------|
| Variant | Karty wariantu | `Dual Track` → `Dual Track Highlight` | `data-compare-variant="dual-track-highlight"`; odsłonięcie kontrolek highlight (targets, segmenty, highlight color, segment size/weight, highlight label style) | ✅ |
| Section heading | Section title | „Porównanie procesów" | render jako `<h2 id="compare-timeline-heading">` ORAZ `section[aria-labelledby="compare-timeline-heading"]` | ✅ |
| Section heading | Subtitle | „Tradycyjny proces kontra nasz" | render jako `<p>` pod tytułem | ✅ |
| Axis | Add step | 3 → 4 kroki | dodano 4. komórkę osi „Optimize" (fallback label); `data-compare-axis` ma 4 dzieci | ✅ |
| Axis | Step 1 label | „Plan" → „Planowanie" | etykieta kroku w osi i w obu ścieżkach | ✅ |
| Axis | Step 1 icon | „🚀" | ikona renderowana w komórce osi | ✅ |
| Axis | Step 1 description | „Etap wstępny" | opis renderowany pod etykietą | ✅ |
| Axis | Track 1 label | „Traditional" → „Tradycyjny" | etykieta ścieżki w podglądzie + dynamiczne etykiety w „Track order" („Tradycyjny first") | ✅ |
| Markers | Toggle markera | „Optimize" ON na ścieżce A | `aria-label` komórki: „...Optimize, active marker" | ✅ |
| Markers | Wyczyszczenie markerów | wszystkie OFF na ścieżce B | pojawia się ostrzeżenie (amber): „This track currently has no active markers, so the runtime row will look empty." | ✅ |
| Markers | Highlight targets | `With us` → `Both tracks` | `data-compare-target-tracks="a,b"`; renderują się **oba** kontenery segmentów (Long approvals + Accelerated execution) | ✅ |
| Markers | Segment label | „Long approvals" → „Długie zatwierdzenia" | tekst badge segmentu zmieniony | ✅ |
| Markers | Add segment | nowy segment na ścieżce A | dodany segment z fallback label „Steps 1-2" (range 0-1) | ✅ |
| Highlight/guides | Highlight label style | `Filled` → `Outlined badge` | badge segmentu: tło `transparent`, border+text = highlight color (`rgb(245,158,11)`) | ✅ |
| Highlight/guides | Show guides | toggle OFF | border ścieżki: `style: none`, kolor `transparent` (przed: `dashed`, `#e2e8f0`) | ✅ |
| Highlight/guides | Guide style | `Dashed` → `Solid` | `border-top-style: solid` na ścieżce | ✅ |
| Colors | Marker color (swatch) | `#1d4ed8` → `#ff0000` | tło aktywnego markera → `rgb(255,0,0)` | ✅ |
| Colors | Marker color → Clear | klik „Clear" | tło aktywnego markera wraca do motywu (`var(--color-primary)` = `rgb(226,177,39)`); przycisk „Clear" przechodzi w `[disabled]` | ✅ |
| Colors | Marker shape | `Rounded` → `Numbered` | `data-compare-marker-shape="numbered"`; badge'y markerów pokazują „1","2","3","4" zamiast „•" | ✅ |
| Typography | Track label size | `Default` → `Large` | klasa etykiety ścieżki `text-sm` → `text-base` | ✅ |
| Spacing/layout | Track order | `Tradycyjny first` → `With us first` | `data-compare-track-order="b-first"`; kolejność DOM ścieżek odwrócona na `[b, a]` | ✅ |
| Spacing/layout | Max width | `Wide` → `Compact width` | `data-compare-max-width="4xl"` + klasa `max-w-4xl` | ✅ |
| Spacing/layout | Section padding | `Comfortable` → `Spacious padding` | `data-compare-padding="lg"`; klasa sekcji `px-6 py-10` | ✅ |
| Spacing/layout | Motion | `No animation` → `Slide in` | `data-compare-motion="slide"`; wrapper ścieżek dostaje `slide-in-from-bottom` (motion-safe) | ✅ |
| Spacing/layout | Axis label position | `Above axis` → `Below axis` | `data-compare-label-position="bottom"`; wiersz osi przesuwa się z [HEADING, AXIS, TRACKS] na [HEADING, TRACKS, AXIS] | ✅ |
| Spacing/layout | Track spacing | `Comfortable` → `Extra spacious` | wrapper ścieżek dostaje klasę `space-y-8` | ✅ |

### 4.2 Zachowania warunkowe (conditional rendering) — działają poprawnie

- Sekcja **Highlight targets**, edytory **segmentów**, **Highlight color**,
  **Highlight label style**, **Segment label size/weight** są widoczne **tylko**
  w wariancie `dual-track-highlight`. W `dual-track` są ukryte, a zamiast nich pojawia
  się komunikat: _„Segment mapping is hidden in Dual Track. Saved segments are
  preserved and will reappear in Dual Track Highlight."_ — co potwierdza, że
  segmenty są **zachowywane**, nie kasowane, przy przełączeniu wariantu.
- Hint na ścieżce niebędącej celem highlight: _„Saved segments stay on this track
  but render only after you include it in Highlight targets."_ — i faktycznie segment
  ścieżki A nie renderował się, dopóki nie ustawiłem `Both tracks` (wówczas pojawił
  się w podglądzie). Zgodne, prawdziwe zachowanie.
- Przyciski `Remove step` / `Add step` poprawnie się dezaktywują na granicach
  zakresu (`Remove step` `[disabled]` przy 3 krokach — minimum).

### 4.3 Niuanse UX zaobserwowane w Visual (nie są to defekty)

| # | Niuans | Obszar |
|---|--------|--------|
| V1 | Etykiety rozmiarów typografii nie odwzorowują 1:1 tokenów: „Default" → token `base` → klasa `text-sm`, a „Large" → token `lg` → klasa `text-base`. Czytelne dla autora (Default/Large), ale token≠klasa może zmylić przy debugowaniu. | Colors and typography |
| V2 | **Contrast advisory** pokazuje stan „Contrast depends on inherited theme or transparent colors" (status „unknown"), ponieważ domyślny `Track background color` jest niewypełniony (przezroczysty), więc kontrastu nie da się policzyć. To poprawne (defensywne), ale komunikat jest mało akcjonowalny, dopóki autor nie ustawi tła. | Colors and typography |
| V3 | `Track background color` ma przycisk „Clear" domyślnie `[disabled]` (brak zapisanej wartości custom) — spójne z resztą pól koloru po wyczyszczeniu. | Colors |
| V4 | Etykiety „Track order" są dynamiczne i biorą bieżące nazwy ścieżek (po zmianie „Traditional"→„Tradycyjny" opcja zmieniła się na „Tradycyjny first") — dobry UX. | Spacing/layout |

---

## 5. Tryb Advanced — wynik: DZIAŁA (read-only zgodnie z kontraktem)

Advanced zawiera wyłącznie diagnostykę read-only (kontrakt: 3 sekcje, wszystkie
`writablePaths: []`). Co istotne — **wiernie odzwierciedlał moje niezapisane zmiany
z Visual**:

- **Runtime layout diagnostics:** „Guide lines: Enabled · Solid", „Highlight target:
  Both tracks", „Layout: Spacing The most generous track spacing. · Labels Below axis
  · Width Compact width", „Motion and order: Slide in · With us first" — wszystko
  zgodne z tym, co ustawiłem w Visual. ✅
- **Metadata diagnostics:** „Track references: Tradycyjny, With us", „Axis step count:
  4 steps · supported range 3-10", lista kroków z opisami (Planowanie → „Etap wstępny",
  reszta → „No optional description configured."). Rozwijane **„Show internal support
  references"** ujawnia ID: „Tracks: Tradycyjny: a, With us: b" oraz „Steps: Planowanie:
  step-1, Build: step-2, Deliver: step-3, Optimize: step-4". ✅
- **Normalization support:** „Current axis steps: 4. Runtime rules enforce 3-10 steps,
  stable IDs, and clamped marker/segment ranges." + przycisk **„Normalize compare payload"**.

| Test | Wynik | Status |
|------|-------|--------|
| Odzwierciedlenie stanu Visual | wszystkie 4 panele diagnostyczne pokazały moje niezapisane zmiany | ✅ |
| „Show internal support references" | rozwija się, pokazuje ID ścieżek i kroków | ✅ |
| „Normalize compare payload" | otwiera dialog potwierdzenia „Normalize compare timeline" (Cancel / Normalize) | ✅ |
| Potwierdzenie normalizacji | dialog zamyka się; podgląd pozostaje spójny (4 kroki, 2 ścieżki) — wizualny no-op, bo dane były już znormalizowane | ✅ |

**Niuans:** poza 3 sekcjami widgetowymi Advanced renderuje też **współdzielone
panele blokowe** (nie należące do widgetu): **„Block layout summary"** (Content width:
default, Padding: Top MD bottom MD, Margin: None) oraz **„Visibility summary"**
(„Shown on: Hidden on all devices"). Patrz §7 — `Visibility summary` ma znaczenie dla
zrozumienia rozbieżności draft/published.

---

## 6. Trasa publiczna (frontend) — wynik: DZIAŁA (statyczny render SSR)

URL: `http://localhost:3000/test-compare-timeline-0516` → **HTTP 200**.
Render jest **server-side** — surowy HTML z serwera (`curl`) zawiera już
`data-compare-variant="dual-track-highlight"`, więc widget nie zależy od hydracji.

### 6.1 Render opublikowanej konfiguracji

Opublikowana konfiguracja **różni się od draftu w admin** (patrz §7) — na froncie:

- Wariant: **`dual-track-highlight`**
- Oś: **6 kroków** — Plan, Build, Deliver, Optimize, Scale, Review
- Ścieżki: „Traditional" / „With us"
- Highlight target: `b` (`data-compare-target-tracks="b"`)
- Layout: `maxWidth=6xl`, `padding=md` (sekcja `px-4 py-8`), `trackOrder=a-first`,
  `motion=none`, `markerShape=rounded`, `labelPosition=top`
- Markery ścieżki A: Plan/Build/Deliver **active**, Optimize/Scale/Review inactive
- Markery ścieżki B: Plan **active**, Build inactive, Deliver **active**, reszta inactive
- Segment ścieżki B: „Accelerated execution", zakres `2-5` — komórki Deliver/Optimize/Scale/Review
  poprawnie oznaczone w `aria-label` jako „...highlighted segment"

### 6.2 Dostępność (a11y) — pozytywnie

- Kontener to semantyczny **`<section>`**; **brak opublikowanego nagłówka**, więc
  użyty jest fallback **`aria-label="Compare Timeline"`** (`aria-labelledby` = null) —
  zgodnie z logiką renderera ✅
- Każda ścieżka to region z `aria-label`: „Traditional track" / „With us track" ✅
- Każda komórka markera ma opisowy `aria-label` ze stanem markera i informacją o
  highlight (np. „With us: Deliver, active marker, highlighted segment") ✅
- Badge segmentu ma `aria-label="With us segment Accelerated execution"` ✅
- Ikona markera ma `aria-hidden="true"` ✅

### 6.3 Responsywność (mobile 375px) — pozytywnie

- **Brak poziomego przepełnienia strony** (`scrollWidth == clientWidth == 375`,
  `pageHorizontalOverflow: false`) ✅
- Siatka osi (`grid-cols-1 sm:grid-cols-2 lg:[var(--compare-grid-columns)]`) poprawnie
  zwija się do **jednej kolumny** na 375px (`grid-template-columns: 343px`) ✅

### 6.4 Linki kroków/segmentów

- Na froncie `0` linków w osi i segment nie jest linkiem (`isLink: false`) — w
  opublikowanej konfiguracji **żaden `href` kroku/segmentu nie jest ustawiony**.
  To zgodne z danymi (nie testowałem linkowania, bo nie było skonfigurowanej trasy).

### 6.5 Konsola — czysto

Brak błędów i ostrzeżeń w konsoli na trasie publicznej (`Errors: 0, Warnings: 0`).
W admin również `Errors: 0, Warnings: 0`.

---

## 7. Admin (draft) vs Frontend (published) — zaobserwowana rozbieżność

| Aspekt | Admin canvas (draft, stan początkowy przed moimi edycjami) | Public (published) |
|--------|------------------------------------------------------------|--------------------|
| Wariant | `dual-track` | `dual-track-highlight` |
| Liczba kroków osi | 3 (Plan, Build, Deliver) | 6 (Plan, Build, Deliver, Optimize, Scale, Review) |
| Highlight / segmenty | brak (dual-track) | aktywne (segment „Accelerated execution" 2-5) |
| `Visibility summary` (Advanced) | „Hidden on all devices" | widget **renderuje się** na publicznej stronie |

**Interpretacja:** zapisany **draft** i wersja **opublikowana** są rozbieżne. To
**stan zastany** — NIE wynik tej sesji (nie zapisywałem żadnych zmian; pierwszy
snapshot canvas przed jakąkolwiek edycją pokazywał `dual-track` / 3 kroki). Dodatkowo
panel `Visibility summary` w draft pokazuje „Hidden on all devices", a mimo to
publiczna strona renderuje widget — co potwierdza, że publiczna widoczność/konfiguracja
pochodzi z innej (opublikowanej) migawki niż bieżący draft. Rozbieżność draft/published
jest normalnie możliwa w CMS, ale tu jest wyraźna — warto, by autor wiedział, że
publiczny render NIE odzwierciedla aktualnego draftu do czasu ponownej publikacji.
`Block layout summary` i `Visibility summary` to **współdzielone** funkcje blokowe
(page builder), nie kontrolki własne widgetu.

---

## 8. Dodatkowe niuanse UX/UI (zbiorczo)

| # | Niuans | Obszar |
|---|--------|--------|
| U1 | Wizard to przepływ „setup" (przycisk „Run setup again"), a nie równorzędna zakładka — zakładkami są tylko Visual i Advanced. | IA edytora |
| U2 | Wizard jest w pełni read-only: cała edycja (oś, etykiety, markery, segmenty, highlight, styl, layout) mieszka w Visual — deklarowane wprost w UI. | IA edytora |
| U3 | Przełączenie wariantu na `dual-track` **nie kasuje** segmentów — są zachowane i wracają w `dual-track-highlight` (potwierdzony komunikat + zachowanie). | Visual |
| U4 | Segmenty ścieżki renderują się dopiero, gdy ścieżka jest w „Highlight targets" — edytor jawnie o tym informuje (hint). | Visual / runtime |
| U5 | Etykiety tokenów typografii (Default/Large) ≠ wartości tokenów (base/lg) ≠ klasy (text-sm/text-base). Bez wpływu na użytkownika, ale subtelne dla debugu. (V1) | Typografia |
| U6 | Contrast advisory pozostaje „unknown", dopóki tło ścieżki jest przezroczyste — komunikat mało akcjonowalny w stanie domyślnym. (V2) | Colors |
| U7 | Advanced miesza diagnostykę widgetu z współdzielonymi panelami blokowymi (Block layout / Visibility) — dla nietechnicznego autora granica „co jest widgetu, a co bloku" może być nieoczywista. | Advanced |
| U8 | `Visibility summary: Hidden on all devices` w draft sąsiaduje z faktem, że publiczny render działa — potencjalnie mylące przy diagnozie „dlaczego coś się (nie) pokazuje". | Advanced / shared |

---

## 9. Podsumowanie

**Ocena ogólna:** widget `compare-timeline` jest w **dobrym, dojrzałym stanie**.
W przetestowanym (szerokim) zakresie **wszystkie kontrolki Visual działają** —
aktualizują podgląd na żywo, utrzymują stan w UI i poprawnie odwzorowują się w
atrybutach `data-compare-*`, klasach i stylach. Wizard i Advanced działają zgodnie z
ich (read-only) kontraktami, a frontend renderuje poprawnie po stronie serwera, z
solidną dostępnością i bez przepełnienia na mobile.

**Co działa (potwierdzone testem):**
- **Wizard:** wejście („Run setup again"), read-only summary, powrót („Finish setup and open Visual").
- **Visual:** przełączanie wariantów, nagłówek (h2 + aria-labelledby + subtitle), liczba
  kroków (Add step), etykieta/ikona/opis kroku, etykiety ścieżek, toggling markerów,
  ostrzeżenie o braku markerów, highlight targets (single/both), edycja i dodawanie
  segmentów, highlight label style (outline), toggling i styl guides, kolor markera +
  Clear (powrót do tokenu motywu), kształt markera (numbered), rozmiar etykiety ścieżki,
  track order (odwrócenie), max width, padding, motion, label position, track spacing.
- **Advanced:** wierna diagnostyka read-only stanu Visual, ujawnianie wewnętrznych ID,
  dialog normalizacji (potwierdzenie → bezpieczny no-op).
- **Frontend:** SSR render `dual-track-highlight` (6 kroków, segment 2-5), a11y
  (semantyczny `<section>` + aria-label fallback, regiony ścieżek, opisy markerów/segmentów),
  responsywność (single-column na 375px, brak overflow), 0 błędów konsoli.

**Co NIE działa / wymaga świadomości:**
- **Brak jednoznacznych defektów funkcjonalnych** w przetestowanym zakresie — wszystko,
  co kliknąłem, zadziałało.
- Rozbieżność **draft vs published** (stan zastany, nie defekt renderera) — patrz §7.
- `Visibility summary: Hidden on all devices` w draft współistnieje z działającym
  renderem publicznym — warto, by autor był tego świadomy.
- Niuanse UX (V1/V2/U5–U8) to drobne kwestie czytelności, nie błędy.

**Czego nie zdołano przetestować (uczciwie):** zapisu (Save/Publish — celowo, by nie
mutować współdzielonej fixtury), linkowania kroków/segmentów end-to-end (brak wybranej
trasy docelowej), przycisków Remove step/segment, pozostałych pól koloru pojedynczo,
pełnej macierzy rozmiarów/wag typografii, stylu „Soft badge" oraz kształtów Circle/Check,
a także dynamicznego przeliczania contrast advisory przy ustawionym tle.

---

## 10. Statystyki testu

| Kategoria | Wartość |
|-----------|---------|
| Tryby przetestowane | 3 (Wizard, Visual, Advanced) |
| Kontrolki Visual potwierdzone jako działające | 24 (reprezentatywny, szeroki przekrój 7 sekcji) |
| Defekty funkcjonalne | 0 (w przetestowanym zakresie) |
| Rozbieżności środowiskowe (draft vs published) | 1 (wariant + liczba kroków + visibility) |
| Niuanse UX/UI | 8 (U1–U8, w tym V1–V4) |
| Trasa publiczna | HTTP 200, SSR, dual-track-highlight, 6 kroków, 0 błędów konsoli |
| Mobile 375px | brak page overflow, oś single-column |
| Zrzuty PNG | 0 (weryfikacja przez DOM/eval; nazwy zrzutów byłyby tylko lokalnymi etykietami) |
