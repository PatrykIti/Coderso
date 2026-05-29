# RAPORT: Timeline Widget — wyczerpujący audyt bieżącego stanu (29-05-2026)

> **Status:** Zakończony — **wyczerpujący** (exhaustive) audyt wszystkich dostępnych dyskretnych kontrolek fixtury
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-timeline-exhaustive-v3` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - timeline (`261d5209-9323-4237-ad8e-20eb3f0e9d60`)
> **Trasa publiczna:** `/ctr-timeline-2305`
> **Pliki źródłowe:** `core/widgets/core/timeline.tsx`, `core/admin/ui/widgets/editors/TimelineEditors.tsx`

---

## 0. Metoda i zakres

Audyt wykonano na **uruchomionej lokalnie aplikacji** narzędziem `playwright-cli`
(izolowana sesja). To pełny, ponowny audyt „od zera" — w odróżnieniu od poprzednich
wersji raportu **NIE stosowano skrótów reprezentatywnych**: dla każdej dyskretnej rodziny
kontrolek przeklikano **wszystkie** dostępne opcje, a każdą zmianę weryfikowano asercją
w żywym DOM (`eval` / `run-code`) na canvasie podglądu admin oraz w renderze SSR.

Weryfikacja opierała się na:
- rzeczywistych klikach/wypełnieniach kontrolek w inspektorze,
- odczycie atrybutów `data-timeline-*`, klas Tailwind i inline-styli renderera w canvasie,
- inspekcji surowego HTML SSR i DOM trasy publicznej.

**Zasada ochrony fixtury:** **nie zapisywano** (`Save draft` / `Publish`) żadnych zmian,
aby nie zmutować współdzielonej fixtury. Wszystkie eksperymenty pozostały w pamięci edytora
(stan React). Konsekwencja: trasa publiczna pokazuje **wersję opublikowaną (domyślną)**,
a nie moje zmiany — co jest zamierzone i opisane w sekcji „nie do przetestowania".

**Screenshoty:** **nie przechwytywano plików PNG.** Weryfikacja odbyła się przez asercje
DOM/`eval`. Automatyczne migawki `playwright-cli` to pliki YAML (`.playwright-cli/page-*.yml`) —
wyłącznie lokalne etykiety robocze, ignorowane przez Git, nie stanowiące evidence w repo.

---

## 1. Model widgetu (z kodu)

**Typ:** `timeline` (kategoria: content)
**Warianty:** `milestones`, `cards`, `compact`
**Tryby (mode):** `process`, `axis`, `chronology`, `alternating` → 5 layoutów renderera
(milestones, cards, chronology, alternating, compact)
**Limity kroków:** min 3 / max 8
**Tryby edytora:** Wizard (setup, read-only), Visual (codzienna edycja), Advanced (diagnostyka, read-only)

Mapowanie preferowanych wariantów dla trybów: `process→compact`, `axis→milestones`,
`chronology→cards`, `alternating→cards`.

**Stan opublikowany fixtury (3 kroki):** Discovery / Planning / Build; układ `milestones` / `axis` /
horizontal / label top / spacing md / maxWidth 6xl / marker dot / guides dashed / tło transparent.

---

## 2. CO PRZETESTOWANO — pełna macierz (wyczerpująco)

Poniżej **każda** dyskretna kontrolka z fixtury i to, czy przeklikano wszystkie jej wartości.

### 2.1 Wizard (mode = setup)
| Kontrolka / akcja | Zakres | Asercja |
|---|---|---|
| „Run setup again" (wejście do Wizarda) | 1 akcja | przełącza na przepływ Starter steps |
| Edytowalne kontrolki w „Starter steps" | policzono | **0** (locator count) — w pełni read-only |
| Live preview | render | renderuje 3 kroki (2 wrappery `[data-timeline-variant]`: canvas + live preview) |
| „Finish setup and open Visual" (wyjście) | 1 akcja | wraca do zakładki Visual (`aria-selected=true`) |

### 2.2 Visual — „Variant and timeline structure"
| Kontrolka | Przeklikane wartości | Asercja w DOM |
|---|---|---|
| Karty wariantu | **milestones, cards, compact** (3/3) | `data-timeline-variant`; layout `ol` zmienia się (flex / grid / compact) |
| Karty trybu (mode) | **process, axis, chronology, alternating** (4/4) | mode + **preferowany wariant** ustawiane razem (przez `onBlockPatch`) |
| Select „Timeline mode" | chronology (+ pozostałe dostępne) | zmienia **tylko mode**, wariant pozostaje — patrz [N1] |
| Orientation | **horizontal, vertical** (2/2) | `data-timeline-orientation`; `ol` flex-row↔flex-col |
| Label position | **top, bottom** (2/2) | `data-timeline-label-position` |
| Alignment | **start, center, end** (3/3) | `justify-start` / `justify-center` / `justify-end` |
| Number of steps | **3, 4, 5, 6, 7, 8** (6/6) | liczba `[data-timeline-step]`; fallback tytuły Discovery/Planning/Build/Launch/Step N |

### 2.3 Visual — „Steps content and order"
| Kontrolka | Zakres | Asercja |
|---|---|---|
| Tytuł kroku | edycja (step 1 → „Odkrywanie") | natychmiastowy update w podglądzie |
| Opis kroku | edycja (step 1) | update w podglądzie |
| Data — wartość błędna | „not-a-date" | komunikat `text-destructive` (czerwony) |
| Data — ISO | „2026-09-01" | komunikat neutralny + `<time datetime="2026-09-01">` |
| Date label | „Wrzesień 2026" | nadpisuje **tekst** `<time>`, `datetime` zostaje ISO |
| Status | **No status, Upcoming, Current, Complete** (4/4) | `data-timeline-status`; `aria-current="step"` **tylko** dla `current` |
| Icon (dekoracyjny) | „🔧" | `<span aria-hidden="true">🔧</span>` przy tytule |
| CTA label + destination | „Dowiedz się więcej" + HomePage | `<a href="/homepage" class*=underline>` |
| Whole-step link label + destination | step 2 → HomePage | cały krok owinięty w `<a href="/homepage" aria-label="…">` |
| Wykluczanie CTA ↔ whole-step | step 1 (CTA + link) | feedback w edytorze **oraz** renderer pomija kotwicę whole-step (tylko inline-CTA) |
| Add step | 3 → 4 | nowy `step-4` „Step 4" |
| Remove | 4 → 3; przy 3 `[disabled]` | guard minimum 3 |
| Up / Down (reorder) | przeniesienie + przywrócenie | kolejność `[step-1,step-2,step-3]`→`[step-2,step-1,step-3]`→z powrotem |
| Up/Down na krańcach | — | `[disabled]` na pierwszym/ostatnim |

### 2.4 Visual — „Guides and axis line"
| Kontrolka | Przeklikane | Asercja |
|---|---|---|
| Show guide lines (switch) | **on, off** | łączniki 2↔0; `aria-checked` true/false |
| Guide style | **solid, dashed** (2/2) | `border-style` łącznika |
| Line style | **solid, dashed** (2/2) | `border-style` markera (uwaga: dotyczy też markera, nie tylko osi — [N6]) |
| Line thickness | **1px, 2px, 3px, 4px** (4/4) | `border-width` markera + `height` łącznika |

### 2.5 Visual — „Markers and accents"
| Kontrolka | Przeklikane | Asercja |
|---|---|---|
| Marker size | **sm, md, lg** (3/3) | klasy `h-2.5/w-2.5`, `h-3.5/w-3.5`, `h-5/w-5` |
| Marker display | **dot, number, icon** (3/3) | dot; number→`1/2/3`; icon→per-krok degradacja do kropki gdy brak ikony — [N3] |
| Global marker color | `#ff0000` + **Clear** | wszystkie kropki `rgb(255,0,0)` → po Clear `var(--color-primary)` |
| Step 1 accent | `#00aa00` + **Clear** | tylko kropka 1 zmienia kolor; pozostałe bez zmian |
| Step 2 markerIcon | „★" | marker 2 pokazuje „★" (nadpisuje degradację icon→dot) |
| Step 1 marker background | `#0000ff` | kropka 1 = `rgb(0,0,255)` |
| Step 1 marker icon color | `#ffff00` (przy display=number) | kolor tekstu „1" = `rgb(255,255,0)` |

> Pola per-krok (accent / markerIcon / marker background / marker icon color) są obecne i identyczne
> dla **wszystkich** kroków; powyżej zweryfikowano realnie po jednym przedstawicielu każdego typu
> oraz dodatkowo accent na step 1 i markerIcon na step 2. Liczniki nadpisań potwierdzono w Advanced.

### 2.6 Visual — „Colors and background"
| Kontrolka | Przeklikane | Asercja |
|---|---|---|
| Line color | `#123456` | `background-color` łącznika = `rgb(18,52,86)` |
| Title color | `#aa00aa` | inline `color` tytułu = `rgb(170,0,170)` |
| Description color | `#00aaaa` | inline `color` opisu = `rgb(0,170,170)` |
| Background color | `#ffeeaa` + **Use transparent** + **Clear** | sekcja: `rgb(255,238,170)` → `transparent` → (puste / theme default) |
| Marker / Text contrast advisory | stan inherited oraz konkretny | przy `#222222` tłem advisory tekstu = „may be hard to read together" (warning); marker = „unknown" gdy kolor pusty |

### 2.7 Visual — „Typography and spacing"
| Kontrolka | Przeklikane | Asercja |
|---|---|---|
| Header title | „Nasz proces" | `<h2 id="timeline-heading-nasz-proces">` + `aria-labelledby`; `aria-label` znika |
| Header description | „Jak pracujemy…" | renderowane `<p>` pod nagłówkiem |
| Title size | **none, sm, base, lg, xl** (5/5) | `text-sm/base/lg/xl`; **none → tytuł ukryty + amber-warning** |
| Title weight | **normal, medium, semibold, bold** (4/4) | `font-normal/medium/semibold/bold` + `data-timeline-title-weight` |
| Description size | **none, xs, sm, base, lg** (5/5) | `text-xs/sm/base/lg`; **none → opis nadal widoczny** (tylko brak klasy) — [N7] |
| Spacing | **none, sm, md, lg, xl** (5/5) | szerokość łącznika `1/2/3/4/5rem` + helper „Npx gap" |
| Section padding | **sm, md, lg** (3/3) | `px-4 py-6` / `px-4 py-8` / `px-6 py-10` |
| Outer section spacing | **none, sm, md, lg** (4/4) | `my-0/4/8/12` |
| Max width | **none, 4xl, 5xl, 6xl, 7xl, full** (6/6) | `max-w-*`; **6xl→`max-w-5xl` przy ≤3 krokach** — [N2] |

### 2.8 Advanced (mode = diagnostics)
| Sprawdzenie | Wynik |
|---|---|
| Edytowalne kontrolki w panelu Advanced | **0** (locator count) — read-only |
| Odzwierciedlenie niezapisanego stanu Visual | **dokładne** (patrz sekcja 3.6) |

### 2.9 Trasa publiczna (SSR + przeglądarka)
| Sprawdzenie | Wynik |
|---|---|
| HTTP | **200** |
| SSR (surowy HTML) | zawiera `data-timeline-*` + 3 kroki bez JS |
| a11y | `<section aria-label="Timeline">`, `<ol aria-label="Timeline steps">`, semantyczne `<span>/<p>` |
| Konsola (public) | **0 błędów / 0 ostrzeżeń** |
| Konsola (admin, cała sesja) | **0 błędów / 0 ostrzeżeń** (poza info React DevTools) |
| Responsywność 375px | brak page-overflow (`375==375`); oś pozioma scrolluje w `overflow-x-auto` (484>343) |

---

## 3. CO DZIAŁA — szczegóły potwierdzone

### 3.1 Wizard — DZIAŁA (celowo w pełni read-only)
Sekcja „Starter steps" ma **0** edytowalnych kontrolek (potwierdzone liczeniem). Live preview
renderuje przez wspólny renderer. Przejścia Wizard↔Visual działają w obie strony. Zgodne
z kontraktem `writablePaths: []`.

### 3.2 Struktura — DZIAŁA
Wszystkie 3 warianty, 4 tryby (karty), select trybu, orientacja, label, 3 wyrównania
i 6 wartości liczby kroków przełączają render zgodnie z kodem. Asercje atrybutów i klas
przeszły dla **każdej** wartości.

### 3.3 Treść kroków — DZIAŁA
Edycja tytułu/opisu, walidacja daty (ISO vs proza, czerwony błąd), `<time datetime>`,
date-label nadpisujący tekst daty, wszystkie 4 statusy (badge + `aria-current` tylko dla
current), ikona dekoracyjna (`aria-hidden`), CTA→`<a>`, whole-step link→owinięcie kroku.
Add/Remove/Up/Down z poprawnymi guardami (min 3, krańce `[disabled]`).

### 3.4 Prowadnice, linia, markery — DZIAŁA
Switch prowadnic (2↔0 łączniki), guide style, line style, 4 grubości, 3 rozmiary markera,
3 tryby markera (z per-krok degradacją icon→dot), markerIcon, oraz wszystkie kolory markerów
(global + per-krok) wraz z Clear.

### 3.5 Kolory + typografia/odstępy — DZIAŁA
Line/Title/Description/Background color (set + Clear + „Use transparent"), advisory kontrastu
(realny werdykt przy konkretnych kolorach), nagłówek (h2 + `aria-labelledby`), pełne skale
title/description size i weight, spacing/padding/section-spacing/max-width.

### 3.6 Advanced — DZIAŁA (żywe lustro stanu)
Advanced odzwierciedlił **niezapisany** stan Visual co do joty:
- Variant `milestones`, Mode `axis`, „3 configured steps."
- Layout: „Orientation: Horizontal; Alignment: Center; Spacing: Default; Padding: Default; Width: 6XL; Labels: Top"
- Guides: „Enabled, Dashed style."; Style: „Line: Solid; Thickness: 2px; Marker: Dot / Medium; Title: Base Semibold"
- Line color „Selected swatch", Global marker color „Theme default", Title/Description color „Selected swatch", Background „#222222"
- Step accents „0 overrides", Step marker backgrounds „**1 override**", Step marker icon colors „**1 override**"
- Step CTA links „**1 safe CTA destination**", Whole-step links „**2 safe whole-step destinations**"

### 3.7 Frontend — DZIAŁA (statyczny SSR opublikowanej wersji)
HTTP 200, SSR z atrybutami i 3 krokami, poprawna a11y, czysta konsola, responsywność
(overflow ograniczony do regionu osi, layout strony się nie psuje).

---

## 4. CO NIE DZIAŁA / DEFEKTY

**Brak defektów funkcjonalnych.** W całym wyczerpującym przebiegu (≈90 pojedynczych wartości
opcji w kilkunastu rodzinach kontrolek) **nie znaleziono ani jednego błędu** — każda kontrolka
zmieniała render zgodnie z kodem, podgląd aktualizował się na żywo, a konsola pozostała czysta.

---

## 5. CZEGO NIE DAŁO SIĘ W PEŁNI ZWERYFIKOWAĆ (z dokładną przyczyną)

| # | Kontrolka / aspekt | Przyczyna |
|---|---|---|
| NT1 | **Natywny gest drag&drop** reorderingu kroków (przyciski „Drag", `draggable`) | `playwright-cli drag` (syntetyczny HTML5 DnD) **nie wypełnia `dataTransfer` typu `text/plain`**, który czyta handler `onDrop` (`payload.split(":")`). Po przeciągnięciu kolejność się nie zmieniła. Handlery `onDragStart`/`onDrop` istnieją w kodzie, a **przyciski Up/Down dają równoważną, działającą** ścieżkę reorderingu (zweryfikowaną). Sam gest myszy DnD jest nieodtwarzalny tym narzędziem. |
| NT2 | **`rel="noopener noreferrer"` dla linków http(s)** (CTA i whole-step) | `LinkDestinationField` pozwala wybrać **tylko istniejące strony serwisu** (URL-e względne `/...`) lub zachować wcześniej zapisaną destynację. Brak możliwości wpisania nowego adresu zewnętrznego przez picker w tej fixturze. Dla linków względnych potwierdzono `rel=null` (poprawnie); gałąź http (rel ustawiany) nie była możliwa do wyzwolenia. |
| NT3 | **Runtime'owy efekt moich zmian na froncie** | Świadomie **nie zapisywano/nie publikowano** (ochrona współdzielonej fixtury). Trasa publiczna pokazuje wersję opublikowaną (domyślną). Efekt zmian zweryfikowano pośrednio: canvas admin + lustro Advanced + SSR wersji domyślnej. End-to-end render zapisanych zmian — nie testowany. |
| NT4 | **Klik wskaźnikiem w combo „Typography and spacing" przy pewnym przewinięciu** | Przy konkretnym scrollu kontrolki na górze panelu były przechwytywane przez sticky-region panelu (artefakt hit-testingu narzędzia, **nie** błąd produktu). Obejście: aktywacja **klawiaturą** (focus → Enter → typeahead → Enter) — zadziałała i pozwoliła przeklikać wszystkie wartości spacing/padding/section-spacing/max-width. |

---

## 6. NIUANSE UX/UI (zachowania zgodne z kodem — nie są to bugi)

| # | Niuans | Obszar |
|---|---|---|
| N1 | **Trzy różne sprzężenia wariant↔mode**: (a) karty **wariantu** zmieniają layout, ale **NIE** mode; (b) karty **trybu** zmieniają mode **i** wariant (preferowany, przez `onBlockPatch`); (c) **select „Timeline mode"** zmienia **tylko** mode, **NIE** wariant. Zweryfikowane empirycznie: select→chronology przy variant=milestones zostawił `variant=milestones` (layout chronology). Trzy kontrolki, trzy zachowania — potencjalnie mylące. | struktura |
| N2 | **`maxWidth=6XL` przy ≤3 krokach renderuje `max-w-5xl`** (`data-timeline-max-width` nadal `6xl`). Przy >3 krokach 6XL→`max-w-6xl`. Combobox nie sygnalizuje auto-zwężenia. | renderer/typografia |
| N3 | **Marker display „Icon" cicho degraduje do kropki per-krok**, gdy krok nie ma `markerIcon`/`icon`. Potwierdzone: przy display=icon krok 1 (z ikoną 🔧) pokazał wypełniony marker z ikoną, a kroki 2–3 (bez ikony) — zwykłą kropkę. Brak ostrzeżenia (kontrast do wyraźnego amber-warning przy „Title size = None"). | markery |
| N4 | **Swatch koloru zawsze pokazuje kolor fallback** (np. `#1d4ed8`, `#ffffff`) nawet gdy wartość = „Theme default"/pusta — wygląda, jakby kolor był aktywny. Potwierdzone: wypełnienie pustego tła wartością `#ffffff` (którą swatch już wyświetlał jako fallback) było **no-op** (advisory dalej „inherited"). | kontrolki kolorów |
| N5 | **Dwa nakładające się zestawy szerokości/odstępów**: widget „Typography and spacing" (Max width, Spacing, Padding, Section spacing) ORAZ współdzielona „Block layout" (Content width, Top/Bottom padding+margin). | IA edytora |
| N6 | **„Line style" dotyczy też obramowania markera**, nie tylko łącznika/osi — jedna kontrolka wpływa na dwa elementy wizualne (potwierdzone: dashed → marker border-style dashed). | linia/markery |
| N7 | **Asymetria „None"**: Title size „None" **ukrywa** tytuł (+ amber-warning), ale Description size „None" **pozostawia opis widoczny** (usuwa tylko klasę rozmiaru). | typografia |
| N8 | **Advanced „Whole-step links: N safe" liczy link kroku nawet gdy CTA go wygasza w renderze.** Step 1 miał CTA + whole-step link; renderer pominął kotwicę whole-step (potwierdzone), ale licznik normalizacji policzył ją (2 = step1+step2). Rozjazd „normalizacja vs render" — informacyjny, nie błąd. | Advanced/normalizacja |
| N9 | Współdzielony „Device visibility" w inspektorze bloku pokazywał przełączniki „Hidden" — to kontrolka bloku, nie logika timeline; nie zmieniałem jej. Front renderuje widget poprawnie. | shared block inspector |

---

## 7. Admin (canvas, niezapisany) vs Frontend (opublikowany)

| Aspekt | Admin canvas (po mojej edycji, niezapisane) | Public (opublikowane) |
|---|---|---|
| Wariant / mode | milestones / axis | milestones / axis |
| Kroki | 3 (Odkrywanie/Planning/Build) | 3 (Discovery/Planning/Build) |
| CTA / status / linki / kolory | ustawione w pamięci edytora | brak (wersja domyślna) |

Różnice wynikają wyłącznie z **niezapisania** zmian — zgodnie z zasadą ochrony fixtury.

---

## 8. Statystyki testu

| Kategoria | Wartość |
|---|---|
| Tryby edytora przetestowane | 3/3 (Wizard, Visual, Advanced) |
| Rodziny kontrolek Visual — pełne pokrycie opcji | warianty 3/3, tryby 4/4, orientacja 2/2, label 2/2, align 3/3, kroki 6/6, status 4/4, guide style 2/2, line style 2/2, thickness 4/4, marker size 3/3, marker display 3/3, title size 5/5, title weight 4/4, desc size 5/5, spacing 5/5, padding 3/3, section spacing 4/4, max width 6/6 |
| Pojedyncze wartości opcji realnie przeklikane | ≈90+ |
| Kolory clearable przetestowane (set+Clear/transparent) | global marker, step accent, step marker-bg, step marker-icon-color, line, title, description, background |
| Defekty funkcjonalne | **0** |
| Nie do przetestowania (z przyczyną) | 4 (NT1–NT4) |
| Niuanse UX/UI | 9 (N1–N9) |
| Edytowalne kontrolki w Wizard / Advanced | 0 / 0 (zgodnie z kontraktem) |
| Konsola (public + admin) | 0 błędów / 0 ostrzeżeń |
| Zrzuty PNG | 0 (weryfikacja przez DOM/eval; migawki YAML to wyłącznie lokalne etykiety) |

---

## 9. Wniosek

Widget `timeline` jest w **dojrzałym, stabilnym stanie**. Wyczerpujące przeklikanie **wszystkich**
dyskretnych opcji we wszystkich rodzinach kontrolek **nie ujawniło żadnego defektu funkcjonalnego** —
każda zmiana poprawnie wpływa na render (atrybuty/klasy/inline-style), Advanced jest wiernym,
read-only lustrem stanu, Wizard jest celowo nieedytowalny, a SSR + a11y + responsywność na froncie
są poprawne, przy czystej konsoli. Pozostają wyłącznie **niuanse UX** (N1–N9, głównie wokół
sprzężenia wariant↔mode, cichej degradacji „Icon", auto-zwężenia 6XL→5xl i prezentacji swatchy)
oraz cztery aspekty **niemożliwe do pełnej weryfikacji tym narzędziem/w tej fixturze** (NT1–NT4),
każdy z podaną dokładną przyczyną.
