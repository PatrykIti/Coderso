# RAPORT: Timeline Widget — audyt bieżącego stanu (29-05-2026)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-timeline` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - timeline (`261d5209-9323-4237-ad8e-20eb3f0e9d60`)
> **Trasa publiczna:** `/ctr-timeline-2305`
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Poprzednie raporty:** `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md`, `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_TIMELINE_WIDGET.md`

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja `claude-29-05-timeline`). Weryfikacja opierała się na rzeczywistych
interakcjach z UI edytora oraz inspekcji DOM (`eval`) na żywym podglądzie admin
i na trasie publicznej (SSR + render w przeglądarce).

**Co faktycznie przetestowano (z asercją w DOM):**
- Logowanie do admin, otwarcie fixtury widgetu.
- **Wizard** — wejście („Run setup again"), zawartość read-only, wyjście („Finish setup and open Visual").
- **Visual** — warianty, tryby (mode), orientacja, liczba kroków, edycja treści kroku,
  walidacja daty, status, ikona markera, tryb markera, kolor tła + Clear, nagłówek sekcji,
  rozmiar tytułu (w tym „None"), reorder kroków, dodawanie kroku, przełącznik prowadnic,
  CTA + wzajemne wykluczanie z linkiem całego kroku, niuans `maxWidth`.
- **Advanced** — diagnostyka read-only (odzwierciedlenie niezapisanego stanu Visual).
- **Trasa publiczna** — render SSR (surowy HTML), struktura a11y, responsywność 375px, konsola.

**Czego NIE testowano (świadomie):**
- **Nie zapisywano** zmian (`Save draft` / `Publish`) — aby nie zmutować współdzielonej
  fixtury dla innych agentów. Wszystkie eksperymenty w admin pozostały w pamięci edytora
  (stan React), nie zostały utrwalone. W konsekwencji trasa publiczna pokazuje
  **opublikowaną wersję domyślną**, a nie moje zmiany.
- Pełnego wyboru każdego koloru ze swatcha (background testowano realnie z `#ffeeaa` + Clear;
  pozostałe pola kolorów potwierdzono jako obecne i opisane, ale nie wypełniano każdego).
- Każdej pojedynczej wartości w każdym combobox — testowano reprezentatywne wartości
  (np. nie każdą grubość linii / każdy rozmiar opisu osobno).
- Drag & drop reorderingu kroków metodą natywnego przeciągania (przetestowano reorder
  przyciskami Up/Down; przyciski „Drag" są obecne i `draggable`, ale samego gestu DnD
  nie symulowałem — handlery `onDragStart`/`onDrop` są w kodzie).
- Per-krokowych kolorów akcentu / tła markera / koloru ikony (pola obecne i opisane;
  zweryfikowałem tylko, że Advanced liczy 0 nadpisań, gdy ich nie ustawiono).

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja odbyła się przez asercje
DOM/`eval`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi etykietami,
ignorowanymi przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**
- `core/widgets/core/timeline.tsx` — renderer, model danych, schema, normalizacja, 5 layoutów (milestones/cards/chronology/alternating/compact)
- `core/admin/ui/widgets/editors/TimelineEditors.tsx` — edytory Wizard / Visual / Advanced

---

## 1. Przegląd widgetu

**Typ:** `timeline` (kategoria: content)
**Warianty:** `milestones`, `cards`, `compact`
**Tryby treści (mode):** `process`, `axis`, `chronology`, `alternating`
**Limity kroków:** min 3 / max 8 (`timelineStepMin` / `timelineStepMax`)
**Tryby edytora:** Wizard (setup read-only), Visual (codzienna edycja), Advanced (diagnostyka read-only)

Widget renderuje oś czasu kroków/kamieni milowych. Wariant to preset osi wizualnej,
a `mode` decyduje o faktycznym layoutcie renderera. Powiązanie wariant↔mode jest miękkie:
zmiana trybu (mode) „preferuje" odpowiedni wariant i go ustawia, ale wybór wariantu
nie zmienia trybu. Mapowanie preferowanych wariantów: `process→compact`, `axis→milestones`,
`chronology→cards`, `alternating→cards`.

**Dane fixtury (stan opublikowany, 3 kroki):**
- Discovery — „Define goals and context."
- Planning — „Align scope and milestones."
- Build — „Deliver and iterate."
- Domyślny układ: `milestones` / `axis` / horizontal / labelPosition top / spacing md / maxWidth 6xl / marker dot / guides dashed enabled / tło transparent.

---

## 2. Struktura trybów edytora — istotny niuans IA

Lista zakładek trybu w inspektorze eksponuje **tylko dwie** zakładki: **Visual**
(domyślnie zaznaczona) oraz **Advanced**. **Tryb Wizard NIE jest równorzędną zakładką** —
to jednorazowy przepływ konfiguracji uruchamiany przyciskiem **„Run setup again"**.
Panel boczny pokazuje status **„Setup complete"** z opisem:
_„Daily edits live in Visual. Advanced is for technical diagnostics."_

To świadoma, spójna z innymi widgetami decyzja IA (Wizard = onboarding/setup, nie codzienny
tryb). Z Wizarda wraca się przyciskiem **„Finish setup and open Visual"**, który poprawnie
przełącza na zakładkę Visual. Przejścia w obie strony działały bez problemu.

---

## 3. Tryb Wizard — wynik: DZIAŁA (z założenia w pełni read-only)

Sekcja **„Starter steps"** z opisem: _„Wizard summarizes the saved timeline story.
Visual owns variant changes, daily status, marker accents, guides, layout, and destination
changes."_ Pod spodem żywy **„Live preview"** renderujący oś czasu przez współdzielony renderer.

**Zawartość (wszystko read-only, jako `ReadonlyWidgetSummaryRow`):**
- Timeline style: `Milestones`
- Header title / Header description: `No header title yet` / `No header description yet`
- Number of steps: `3 steps`
- Nota: _„Visual owns daily step details such as status, icons, accents, dates, and destinations."_
- Step 1/2/3: tytuł + opis (read-only)

| Test | Wynik | Status |
|------|-------|--------|
| Liczba edytowalnych kontrolek w sekcji „Starter steps" | `0` (potwierdzone przez `eval`) | ✅ zgodne z kontraktem |
| Jedyny przycisk akcji | `Finish setup and open Visual` | ✅ |
| Live preview | renderuje 3 kroki przez wspólny renderer | ✅ |
| Wyjście do Visual | przełącza na zakładkę Visual | ✅ |

**Wniosek:** Wizard jest **celowo nieedytowalny** — to wierne podsumowanie zapisanej
„historii" osi czasu (zgodne z kontraktem `writablePaths: []` i `readOnlyPaths`).
Nie jest to defekt — to model „Contract Truthfulness": Wizard nic nie obiecuje, czego
nie potrafi zapisać. Cała codzienna edycja należy do Visual.

---

## 4. Tryb Visual — wynik: DZIAŁA (0 defektów funkcjonalnych w przetestowanym zakresie)

Visual ma 6 sekcji (zgodnie z kontraktem): „Variant and timeline structure", „Steps content
and order", „Guides and axis line", „Markers and accents", „Colors and background",
„Typography and spacing". Dodatkowo widoczna jest współdzielona sekcja „Block layout".

### 4.1 Co przetestowano i działa (z asercją w canvas/preview)

| Sekcja | Kontrolka | Test | Wynik (DOM) | Status |
|--------|-----------|------|-------------|--------|
| Struktura | Wariant `Cards` | klik karty | `data-timeline-variant=cards` (mode pozostaje `axis`) | ✅ |
| Struktura | Mode `Process` | klik karty | `mode=process` **oraz** `variant=compact` (preferowany) | ✅ |
| Struktura | Mode `Chronology` | klik karty | `mode=chronology` + `variant=cards` | ✅ |
| Struktura | Mode `Alternating` | klik karty | `mode=alternating` + `variant=cards` | ✅ |
| Struktura | Mode `Axis` | klik karty | `mode=axis` + `variant=milestones` | ✅ |
| Struktura | Orientation → Vertical | combobox | `data-timeline-orientation=vertical` | ✅ |
| Struktura | Number of steps → 5 | combobox | 5 kroków; tytuły fallback `Discovery/Planning/Build/Launch/Step 5` | ✅ |
| Treść | Edycja tytułu kroku 1 → „Odkrywanie" | input | preview natychmiast pokazuje „Odkrywanie" | ✅ |
| Treść | Data nieprawidłowa „not-a-date" | input | komunikat błędu w klasie `text-destructive` (czerwony) | ✅ |
| Treść | Data ISO „2026-09-01" | input | komunikat „Machine-readable date looks good…" | ✅ |
| Treść | Status → Current | combobox | badge `data-timeline-status=current` „Current" + `aria-current="step"` na `<li>` | ✅ |
| Treść | Render daty | — | `<time datetime="2026-09-01">2026-09-01</time>` w preview | ✅ |
| Treść | Reorder krok 1 „Down" | przycisk | kolejność `[step-1,step-2,step-3]` → `[step-2,step-1,step-3]` | ✅ |
| Treść | Add step | przycisk | 3 → 4 kroki | ✅ |
| Treść | Remove (przy 3 krokach) | przycisk | `[disabled]` — guard minimum 3 kroków | ✅ |
| Treść | Up (krok 1) / Down (ostatni krok) | przyciski | `[disabled]` na krańcach — poprawnie | ✅ |
| Prowadnice | „Show guide lines" off | switch | łączniki znikają (4 kroki: 3 łączniki → 0); `aria-checked=false` | ✅ |
| Prowadnice | „Show guide lines" on | switch | łączniki wracają (3 dla 4 kroków) | ✅ |
| Markery | Marker display → Number | combobox | markery pokazują `1`,`2`,`3`; `data-timeline-marker-display=number` | ✅ |
| Markery | Marker display → Icon (bez ikony) | combobox | `data-timeline-marker-display=icon`, ale marker **renderuje się jako dot** (fallback per-krok) | ✅ (patrz N3) |
| Markery | Marker icon kroku 1 → „★" | input | po ustawieniu ikony marker pokazuje „★" | ✅ |
| Kolory | Background → `#ffeeaa` | swatch | `<section>` dostaje `background-color: rgb(255,238,170)` | ✅ |
| Kolory | Background → Clear | przycisk | inline-bg wyczyszczone, przycisk → `[disabled]`, etykieta „Theme default" | ✅ |
| Typografia | Header title → „Nasz proces" | input | `<h2 id="timeline-heading-nasz-proces">` + `<section aria-labelledby>` na to id, `aria-label` znika | ✅ |
| Typografia | Title size → None | combobox | amber-ostrzeżenie „Step titles are currently hidden…" + tytuły znikają z preview | ✅ |
| Treść | CTA label + destynacja „HomePage" | input + combobox | `<a href="/homepage">Dowiedz się więcej</a>` w preview | ✅ |
| Treść | Link całego kroku przy aktywnym CTA | — | komunikat „Whole-step links are disabled when a CTA link is configured to avoid nested anchors." | ✅ |

### 4.2 Walidacja i podpowiedzi (UX pozytywny)

- **Walidacja daty w czasie rzeczywistym:** rozróżnia poprawny `YYYY-MM-DD` (komunikat
  neutralny) od prozy (komunikat błędu w czerwieni + sugestia przeniesienia do „Date label").
  Pole „Date label" ma osobny opis, że to opcjonalna kopia redakcyjna i przetrwa nawet
  przy pustej dacie.
- **Ostrzeżenie o ukrytych tytułach:** wybór „Title size = None" pokazuje wyraźny amber-box.
- **Wzajemne wykluczanie CTA ↔ link całego kroku:** edytor jawnie informuje, że link całego
  kroku jest wyłączony, gdy skonfigurowano CTA (renderer odrzuca link całego kroku, jeśli
  istnieje CTA — `resolveStepLink` zwraca `undefined`, by uniknąć zagnieżdżonych kotwic).
- **Mode preview cards:** każda karta trybu pokazuje preferowany wariant (badge) i opis +
  zdanie kontekstowe „Switching to X keeps your step content but prefers the Y visual variant."
- **Guard minimum kroków:** przy 3 krokach „Remove" jest `[disabled]` (nie da się zejść poniżej 3).
- **Contrast advisories:** sekcja kolorów pokazuje „Marker contrast advisory" i „Text contrast
  advisory" (przy kolorach inherited/transparent: „Contrast depends on inherited theme or
  transparent colors.").

### 4.3 Niuanse uwarunkowane logiką (NIE są to bugi — warto je znać)

| # | Obserwacja | Wyjaśnienie |
|---|-----------|-------------|
| N1 | **Wybór wariantu nie zmienia trybu (mode), ale wybór trybu zmienia wariant** | Asymetria z założenia. Karty wariantu wołają tylko `onVariantChange`; karty trybu wołają `updateMode`, które ustawia też preferowany wariant. Dla autora może być nieoczywiste, że klik „Cards" przy `mode=axis` nadal renderuje layout kart, a klik trybu „Process" zmienia jednocześnie wariant na compact. |
| N2 | **`maxWidth=6XL` przy ≤3 krokach renderuje faktycznie `max-w-5xl`** | Renderer: `steps.length <= 3 && maxWidth === "6xl" ? "5xl" : maxWidth`. Atrybut `data-timeline-max-width` raportuje `6xl`, ale realnie zastosowana klasa to `max-w-5xl`. Combobox pokazuje „6XL", więc autor widzi węższą oś niż sugeruje wybór (tylko dla dokładnie wartości domyślnej 6xl i ≤3 kroków). |
| N3 | **Marker display „Icon" bez ikony cicho degraduje do kropki** | `markerDisplay === "icon" && !(markerIcon ?? icon) ? "dot"`. Zmiana na „Icon" nie daje **żadnego widocznego efektu**, dopóki krok nie ma `markerIcon`/`icon`. Edytor nie ostrzega o tym — autor może uznać, że „tryb ikony nie działa". |
| N4 | **Swatch koloru pokazuje kolor fallback, choć wartość = „Theme default"** | `Global marker color` (i per-krokowe pola) pokazują w pickerze `#1d4ed8` / `#ffffff`, mimo że wartość jest pusta (etykieta „Theme default", Clear `[disabled]`). Wizualnie wygląda, jakby niebieski był aktywny, podczas gdy faktycznie kolor jest dziedziczony z motywu. |
| N5 | **Dwa zestawy kontrolek szerokości/odstępów** | Widget ma własną sekcję „Typography and spacing" (Spacing, Section padding, Outer section spacing, Max width) ORAZ współdzieloną sekcję „Block layout" (Content width, Top/Bottom padding, Top/Bottom margin). Częściowo nakładające się pojęcia (szerokość, padding) w dwóch miejscach — potencjalnie mylące dla autora. |

---

## 5. Tryb Advanced — wynik: DZIAŁA (read-only zgodnie z kontraktem)

Advanced jasno deklaruje: _„Advanced mode is read-only. Use Visual for public-facing timeline
steps, layout, guides, markers, colors, background, and typography changes."_
Liczba edytowalnych kontrolek w panelu inspektora Advanced: **0** (potwierdzone `eval`,
po prawidłowym zawężeniu do panelu „Runtime summary").

**Sekcje (read-only):**
- **Runtime summary:** Variant, Mode, Steps.
- **Layout diagnostics:** Layout (jedno zdanie), Guides, Style, Line/Marker/Title/Description
  color (opis „Theme default" / „Selected swatch" / „Saved custom color"), Background,
  oraz liczniki nadpisań per-krok (accents / marker backgrounds / marker icon colors).
- **Data normalization:** licznik kroków + reguły (`3-8` kroków, unikalne stabilne ID),
  „Step CTA links" / „Whole-step links" (pokrycie bezpiecznych linków), oraz macierz
  własności (Wizard / Visual / Advanced owns …).
- (współdzielone) **Block layout summary**, **Visibility summary**.

| Test | Wynik | Status |
|------|-------|--------|
| Odzwierciedlenie niezapisanego stanu Visual | Steps: „4 configured steps."; Layout: „Orientation: **Vertical**…"; Style: „Marker: **Icon** / Medium"; Guides: „Enabled, Dashed style." | ✅ |
| Pokrycie CTA | „Step CTA links: **1 safe CTA destination**" (po ustawieniu CTA HomePage) | ✅ |
| Whole-step links | „Not configured" | ✅ |
| Liczniki nadpisań | accents/backgrounds/icon-colors = „0 overrides" (ustawiłem tylko `markerIcon`, który nie jest liczony w tych trzech) | ✅ |
| Brak edytowalnych pól | potwierdzony (0 kontrolek) | ✅ |

**Wniosek:** Advanced jest żywym, czytelnym lustrem stanu edytora i kontraktu normalizacji.
Diagnostyka aktualizuje się natychmiast wraz ze zmianami w Visual (testowane na niezapisanym
stanie).

---

## 6. Trasa publiczna (frontend) — wynik: DZIAŁA (statyczny render SSR)

URL: `http://localhost:3000/ctr-timeline-2305` → **HTTP 200**.
Render jest **server-side** — surowy HTML z serwera już zawiera oś czasu z atrybutami
`data-timeline-*` i treścią kroków.

### 6.1 Render opublikowanej konfiguracji (domyślnej)

- `data-timeline-variant=milestones`, `mode=axis`, `orientation=horizontal`,
  `label-position=top`, `padding=md`, `section-spacing=none`, `max-width=6xl`,
  `marker-display=dot`, `title-weight=semibold`.
- 3 kroki (`step-1/2/3`): Discovery / Planning / Build + opisy.
- 3 markery (kropki), łączniki prowadnic obecne (style inline width + background-color).
- **0 linków** i **0 badge'y statusu** — opublikowana wersja domyślna nie ma CTA/linków/statusów.

> Uwaga: trasa publiczna pokazuje **opublikowaną wersję domyślną**. Moje zmiany w Visual
> były wyłącznie w pamięci edytora i **nie zostały zapisane/opublikowane**, więc świadomie
> NIE są widoczne na froncie.

### 6.2 Dostępność (a11y) — pozytywnie

- `<section aria-label="Timeline">` — fallback `aria-label`, bo brak opublikowanego nagłówka
  (gdy nagłówek jest ustawiony, w admin potwierdzono przełączenie na `aria-labelledby`).
- Lista kroków jako `<ol aria-label="Timeline steps">`.
- Każdy krok to `<li data-timeline-step>`; krok bieżący dostawałby `aria-current="step"`
  (potwierdzone w admin po ustawieniu statusu Current).
- Daty renderowane jako semantyczny `<time datetime>` (potwierdzone w admin).
- Tekst markera owijany w `aria-hidden="true"` (dekoracyjny), co jest poprawne.

### 6.3 Responsywność (mobile 375px) — pozytywnie

- Pozioma oś czasu (`milestones` horizontal) przewija się **wewnątrz kontenera**
  `overflow-x-auto` (scrollWidth 484 > clientWidth 343).
- **Brak poziomego przepełnienia całej strony** (`pageScrollWidth == clientWidth == 375`) —
  overflow jest świadomie ograniczony do regionu osi czasu, layout strony nie pęka.

### 6.4 Konsola — czysto

Brak błędów i ostrzeżeń w konsoli na trasie publicznej (0/0). Również w admin podczas
całej sesji edycji Visual: 0 błędów, 0 ostrzeżeń (poza standardowym info React DevTools).

---

## 7. Admin (canvas) vs Frontend (published) — porównanie

| Aspekt | Admin canvas (stan początkowy, przed edycją) | Public (published) |
|--------|----------------------------------------------|--------------------|
| Wariant / mode | milestones / axis | milestones / axis |
| Liczba kroków | 3 (Discovery/Planning/Build) | 3 (identyczne) |
| Markery | dot ×3 | dot ×3 |
| Prowadnice | enabled, dashed | enabled, dashed |
| Linki / statusy | brak | brak |

**Interpretacja:** stan początkowy canvasu admin (przed moją edycją) był **identyczny**
z wersją opublikowaną — brak rozbieżności draft/published na starcie. Wszystkie różnice,
które wprowadziłem w Visual, pozostały niezapisane (w pamięci edytora), więc frontend ich
nie odzwierciedla — co jest oczekiwane i zamierzone.

---

## 8. Dodatkowe niuanse UX/UI

| # | Niuans | Obszar |
|---|--------|--------|
| U1 | Wizard to przepływ „setup" (przycisk „Run setup again"), w pełni read-only; tylko Visual i Advanced są zakładkami | IA edytora |
| U2 | Asymetria wariant↔mode (N1) — wybór wariantu nie zmienia trybu, wybór trybu zmienia wariant | Visual / struktura |
| U3 | `maxWidth=6XL` przy ≤3 krokach renderuje 5xl (N2) — combobox nie sygnalizuje auto-zwężenia | Visual / renderer |
| U4 | „Icon" marker bez ustawionej ikony nie daje efektu (N3) — brak ostrzeżenia (kontrast do wyraźnego ostrzeżenia przy „Title size = None") | Visual / markery |
| U5 | Swatch koloru pokazuje kolor fallback mimo „Theme default" (N4) — może sugerować, że kolor jest aktywny | Shared color control |
| U6 | Dublujące się kontrolki szerokości/odstępów: widget („Typography and spacing") vs współdzielony „Block layout" (N5) | Visual / IA |
| U7 | Współdzielona „Visibility summary" (Advanced) pokazała „Shown on: **Hidden on all devices**", podczas gdy trasa publiczna renderuje widget na desktopie. Nie zmieniałem widoczności; to pole współdzielonego inspektora bloku, nie logika samego timeline. **Prawdopodobnie mylące etykietowanie** podsumowania widoczności (pusta konfiguracja widoczności = tekst „Hidden on all devices"), a nie realne ukrycie — front renderuje poprawnie. Wymaga osobnej weryfikacji poza zakresem tego widgetu. | Shared block inspector |

---

## 9. Podsumowanie

**Ocena ogólna:** widget `timeline` jest w **dobrym, dojrzałym stanie**. Wszystkie faktycznie
przetestowane kontrolki w Visual **działają** — aktualizują podgląd na żywo, utrzymują stan
w UI i poprawnie odzwierciedlają się w diagnostyce Advanced oraz w renderze SSR. Wizard
i Advanced są **z założenia read-only** i zachowują się zgodnie z kontraktem.

**Co działa (potwierdzone testem):**
- Wizard: czytelne read-only podsumowanie + live preview + przejście do Visual.
- Visual: warianty (3), tryby (4) z preferowanym wariantem, orientacja, liczba kroków,
  edycja tytułu/opisu, walidacja daty (ISO vs proza, czerwony błąd), status (badge +
  `aria-current` + `<time>`), reorder Up/Down, Add step, guard minimum 3 kroków,
  przełącznik prowadnic, tryb markera (dot/number/icon z fallbackiem), ikona markera,
  kolor tła + Clear, nagłówek sekcji (h2 + `aria-labelledby`), „Title size = None" z
  ostrzeżeniem, CTA → link + wzajemne wykluczanie z linkiem całego kroku.
- Advanced: żywa diagnostyka read-only (0 edytowalnych pól), odzwierciedla niezapisany stan.
- Frontend: SSR (3 kroki, atrybuty, łączniki), a11y (`<ol aria-label>`, `<section aria-label>`,
  `<time>`, `aria-current`), responsywność (overflow ograniczony do osi, brak page-overflow),
  czysta konsola.

**Co NIE działa / wymaga świadomości:**
- **Brak jednoznacznych defektów funkcjonalnych** w przetestowanym zakresie.
- Niuanse N1–N5 (sekcja 4.3) to zachowania zgodne z kodem, ale potencjalnie mylące UX —
  zwłaszcza N3 (cicha degradacja „Icon"→dot) i N2 (`6XL`→`5xl` przy ≤3 krokach).
- U7: współdzielona „Visibility summary" pokazała „Hidden on all devices" mimo że front
  renderuje — prawdopodobnie mylące etykietowanie pola współdzielonego inspektora, nie defekt
  timeline; pozostawione jako obserwacja do osobnej weryfikacji.

**Czego nie zdołano/nie chciano przetestować (uczciwie):**
- Nie zapisywano ani nie publikowano zmian (ochrona współdzielonej fixtury) — runtime'owego
  efektu moich zmian na froncie nie weryfikowano (świadomie). Render statyczny opublikowanej
  wersji i odzwierciedlenie zmian w Advanced/preview zweryfikowano pozytywnie.
- Natywnego gestu drag&drop kroków (testowano reorder przyciskami; handlery DnD obecne w kodzie).
- Per-krokowych kolorów akcentu/tła/ikony markera (pola obecne; potwierdzono tylko liczniki
  „0 overrides" w Advanced).
- Wariantów `cards` / `chronology` / `alternating` / `compact` zweryfikowano na poziomie
  atrybutów `data-timeline-*` (przełączanie działa); szczegółowego renderu każdego layoutu
  pikselowo nie audytowano.

---

## 10. Statystyki testu

| Kategoria | Wartość |
|-----------|---------|
| Tryby przetestowane | 3 (Wizard, Visual, Advanced) |
| Kontrolki Visual potwierdzone jako działające | 27+ (reprezentatywny, szeroki przekrój) |
| Defekty funkcjonalne | 0 (w przetestowanym zakresie) |
| Niuanse logiki/UX (N1–N5) | 5 |
| Dodatkowe niuanse UX/UI (U1–U7) | 7 |
| Trasa publiczna | HTTP 200, SSR, 3 kroki, 0 błędów konsoli |
| Edytowalne kontrolki w Wizard / Advanced | 0 / 0 (zgodnie z kontraktem) |
| Zrzuty PNG | 0 (weryfikacja przez DOM/eval; nazwy zrzutów byłyby wyłącznie lokalnymi etykietami) |
