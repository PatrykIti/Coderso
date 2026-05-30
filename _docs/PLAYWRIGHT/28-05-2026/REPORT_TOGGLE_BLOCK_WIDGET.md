# RAPORT: Toggle Block Widget — wyczerpujący audyt current-state (Visual / Wizard / Advanced + frontend)

> **Status:** Zakończony (pogłębiona iteracja „gap-close")
> **Data:** 2026-05-29 (upgrade audytu z 2026-05-28 — domknięcie luk)
> **Sesja Playwright:** `claude-29-05-toggle-block-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/12d1d6fb-2aeb-46db-8775-088e87d8b70b` (strona „Contract Test - toggle-block")
> **Fixture public:** http://localhost:3000/test-toggle-block-0516
> **Pliki źródłowe:** `core/widgets/core/toggleBlock.tsx` (renderer + normalizacja + skrypt runtime) · `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kontrolka kolorów)

> **Cel tej iteracji:** poprzedni raport (28-05) był szerokim przebiegiem bez wyczerpującego
> standardu. NIE było w pełni przećwiczone: (a) **wszystkie** wartości enumów kart paneli
> (surface/padding/radius/borderEmphasis × oba panele), (b) gałąź **motion „fade"**, (c) komplet
> klawiszy klawiatury, (d) niezależność edycji obu paneli, (e) rewersja **wszystkich czterech**
> przycisków „Clear" w Theme, (f) zaostrzona analiza doradcy kontrastu i warunku wyzwalającego
> defekt N1. W tym przebiegu **KAŻDA wartość każdego enuma została kliknięta**, a efekt
> zweryfikowany inspekcją DOM (atrybuty `data-coderso-toggle-*`, klasy Tailwind, inline `style`,
> `getComputedStyle`, ARIA). Tam, gdzie kontrolka jest nietestowalna w tym fixture, podana jest
> dokładna nazwa kontrolki i powód.

> **Metodyka i bezpieczeństwo fixture:** weryfikacja oparta **wyłącznie o inspekcję DOM** (`eval`)
> w żywym edytorze. **Nie** klikałem „Save draft" ani „Publish" — wszystkie edycje to ulotny stan
> React w sesji (nie mutują współdzielonego fixture). Zrzutów PNG **nie** zapisywałem; ewentualne
> pliki byłyby **wyłącznie lokalnymi etykietami** w `.playwright-cli/` (katalog ignorowany przez
> Git) i nie są evidence dołączonym do repo (sekcja 12).

---

## 1. Przegląd widgetu

**Typ:** `toggle-block` · **Kategoria:** `layout` · **Opis:** „Switch between two alternate content panes."

**Warianty:** `switch` (domyślny — kompaktowy segmentowy przełącznik, pigułki `rounded-full`, kontener `rounded-xl p-4`) oraz `cards` (większe karty selektora `rounded-xl`, kontener `rounded-2xl p-5 shadow-sm`, siatka triggerów `grid grid-cols-1 gap-3 sm:grid-cols-2`).

**Model danych (`ToggleBlockData`):**

| Sekcja | Pola |
|--------|------|
| **labels** | `primary`, `secondary`, `helper` (clearable→ukrywany), `ariaLabel`, `selectedSuffix` |
| **options** | `defaultState` (primary/secondary), `motion` (none/fade/slide) |
| **style** | `surfaceColor`, `borderColor`, `accentColor`, `accentContrastColor` (wszystkie clearable) + `panes.{primary,secondary}` z polami `surface` (default/soft/contrast), `padding` (compact/comfortable/spacious), `radius` (sm/md/lg), `borderEmphasis` (subtle/strong) |

**Sloty:** dwa **stałe** sloty — `primary` („Primary Pane") i `secondary` („Secondary Pane"). Widget z założenia ograniczony do dwóch paneli (sekcja Structure nie ma „Add panel", przyciski „Move up/down" są wyłączone). Sloty NIE są repeatable (inaczej niż Tabs).

**Renderowanie:** kontener `[data-coderso-toggle-block='1']` → `role=radiogroup` z dwoma `role=radio`, ukryty `aria-live=polite` status (sr-only), opcjonalny helper i dwa panele `role=region`. Interaktywność na froncie zapewnia wstrzykiwany skrypt runtime (mysz + klawiatura). **W trybie admin (canvas/preview) skrypt runtime NIE jest wstrzykiwany** (`previewMode` → `runtimeScript = null` — patrz N4).

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"**, a wychodzi **„Finish setup and open Visual"** (powrót na zakładkę Visual potwierdzony, `aria-selected=true`). Ten sam wzorzec co w Tabs/FAQ.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | **Wyłącznie read-only.** Jedna sekcja „Step 1: Variant" z wierszem „Toggle surface" (Switch/Cards) + statyczna notka. **Zero edytowalnych kontrolek** (jedyny `data-widget-control` to read-only `toggle-block.wizard.variant-summary`). Towarzyszy panel „Live preview" — patrz N6. |
| **Visual** | zakładka „Visual" | 7 sekcji widgetu: Variant, Labels, Experience, Accessibility, Theme, Pane cards, Pane authoring. Plus współdzielone sekcje wrappera: Structure (sloty), Block layout, Device visibility. |
| **Advanced** | zakładka „Advanced" | 3 sekcje read-only widgetu: Runtime summary, Style diagnostics, Support summary. **0 kontrolek `writable`.** Plus współdzielone podsumowania wrappera (Block layout / Visibility — patrz N8). |

---

## 3. Zakres faktycznie przećwiczonych interakcji (current-state)

Wszystkie wykonane w sesji `claude-29-05-toggle-block-gap-close`, każda zweryfikowana inspekcją DOM.

**Variant (2/2):** switch ↔ cards (klasy kontenera, grupy triggerów, triggera).

**Labels:** edycja Primary („Miesięcznie"), Secondary („Rocznie"), Helper („Wybierz okres rozliczeniowy.") + przycisk **Clear** przy Helper (ukrycie `<p>`).

**Experience — Default state (2/2):** Primary/Secondary (stan canvas, aktywny trigger, panele, status, notka). **Motion (3/3, w tym `fade`):** none/fade/slide — klasy panelu + opis.

**Accessibility:** edycja „Toggle group label" i „Selected announcement" + **Clear** na obu (rewersja do wartości domyślnej).

**Theme (4/4 kolory):** ustawienie Surface (#fef9c3), Border (#2563eb), Accent (#ff0000), Accent contrast (#00ff00, potem #ff0000, potem para navy/white) — weryfikacja inline `style`/zmiennych CSS/`getComputedStyle`; **oba branche doradcy kontrastu** (warning + brak warning); **Clear na wszystkich 4** (rewersja do motywu).

**Pane cards (komplet enumów × oba panele):** Secondary — Surface (3/3: Inherited/Soft/Contrast), Padding (3/3: Compact/Comfortable/Spacious), Radius (3/3: Small/Medium/Large), Border emphasis (2/2: Subtle/Strong); Primary — ustawiony na rozłączny zestaw (Soft/Compact/Small/Strong) dla testu niezależności. Reprodukcja N7 (Contrast + Strong).

**Pane authoring:** weryfikacja, że podsumowanie odzwierciedla edytowane etykiety.

**Wizard:** „Run setup again", odczyt read-only summary, test interaktywności „Live preview" (klik primary przy stanie secondary), „Finish setup and open Visual".

**Advanced:** odczyt wszystkich 14 wierszy podsumowań, porównanie ze stanem Visual, weryfikacja 0 kontrolek `writable`.

**Frontend (public):** render początkowy, 2 instancje, mysz, klawiatura (ArrowRight/Left/Up/Down/Home/End), ARIA, runtime bound, liczba skryptów, brak wycieku placeholdera, niezależność instancji, defekt N1 na żywym fixture, konsola, overflow na 375 px.

---

## 4. CO DZIAŁA — zweryfikowane w DOM

### 4.1 Frontend (public `/test-toggle-block-0516`)

Strona zwraca `200` i renderuje **dwie niezależne instancje**:
- **#0** — wariant `cards`, etykiety „Primary Tab"/„Secondary Tab", `defaultState=secondary`, zapisany accent `#0000ff`.
- **#1** — wariant `switch`, etykiety „View A"/„View B", `defaultState=primary`, accent = `var(--color-text)`.

| Test | Wynik |
|------|-------|
| Runtime bound | obie instancje `data-coderso-toggle-bound="true"`; **1** współdzielony skrypt runtime w DOM ✓ |
| Przełączanie myszą | klik „View B" → `data-coderso-toggle-state=secondary`, `aria-checked` true/false, `tabindex` 0/-1, panele `hidden`, status „View B selected" ✓ |
| Klawiatura (6/6) | ArrowLeft/ArrowUp → poprzedni, ArrowRight/ArrowDown → następny, Home → pierwszy, End → ostatni; każdy klawisz **jednocześnie przenosi focus i aktywuje** (wzorzec „automatic activation") ✓ |
| Niezależność instancji | przełączenie #0 na primary **nie** zmienia #1 (pozostaje secondary) ✓ |
| ARIA | `radiogroup[aria-label]`; każdy `role=radio` ma `aria-checked` + roving `tabindex` + `aria-controls` → panel; każdy panel `role=region` + `aria-labelledby` → trigger; status `aria-live=polite` aktualizuje się ✓ |
| Placeholder edytora | „Use the page builder to add widgets…" **nie wycieka** na front (panele puste, 0 dzieci) ✓ |
| Mobile 375 px | `scrollWidth==clientWidth==375` (brak overflow); wariant cards → **jedna** kolumna (`grid-template-columns` jeden track 333px) ✓ |
| Konsola | **0 błędów, 0 ostrzeżeń** ✓ |

### 4.2 Visual / Variant (2/2)

| Wariant | Kontener | Grupa triggerów | Trigger |
|---------|----------|-----------------|---------|
| switch | `space-y-4 border rounded-xl p-4` | `flex flex-wrap items-center gap-2` | `rounded-full border px-3 py-1.5 text-sm font-semibold …` ✓ |
| cards | `space-y-4 border rounded-2xl p-5 shadow-sm` | `grid grid-cols-1 gap-3 sm:grid-cols-2` | `min-h-14 rounded-xl border bg-[var(--color-bg)] px-4 py-3 …` ✓ |

### 4.3 Visual / Labels

- Primary/Secondary → etykiety triggerów, `data-coderso-toggle-status-label`, status sr-only aktualizują się natychmiast („Miesięcznie selected"). ✓
- Helper → `<p>` aktualizuje się; **Clear** → `<p>` znika z DOM, input pusty. ✓

### 4.4 Visual / Experience

- **Default state** (2/2): Secondary → `data-coderso-toggle-state=secondary`, secondary trigger `aria-checked=true`/`tabindex=0`, panel primary `hidden`, panel secondary widoczny, status „Rocznie selected", notka „Secondary pane opens first in preview and runtime: Rocznie." ✓
- **Motion** (3/3 — w tym gałąź **fade**):

| Wartość | Klasy aktywnego panelu | Opis |
|---------|------------------------|------|
| none | (brak klas motion) | „Swap panes immediately." ✓ |
| fade | `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none` | „Fade the active pane in." ✓ |
| slide | jw. + `motion-safe:slide-in-from-bottom-2` | „Fade and lift the active pane." ✓ |

`data-coderso-toggle-motion` na kontenerze i panelu zgodny z wyborem.

### 4.5 Visual / Accessibility

- „Toggle group label" → `radiogroup[aria-label]` = „Przełącznik cennika"; „Selected announcement" → `data-coderso-toggle-selected-suffix` + status „Rocznie aktywne". ✓
- **Clear** na obu polach → rewersja do **wartości domyślnej** („Toggle content view" / „selected"), status „Rocznie selected". ✓ (niuans: Clear tu **resetuje do domyślnej**, nie czyści — patrz N7-clear).

### 4.6 Visual / Theme — wszystkie 4 kolory + Clear

Ustawione: Surface #fef9c3, Border #2563eb, Accent #ff0000, Accent contrast #00ff00.

| Kontrolka | Cel w canvas (zweryfikowany) | „Clear" |
|-----------|------------------------------|---------|
| Surface color | kontener `background-color` = `rgb(254,249,195)` | **Tak** — po Clear `background-color` znika (transparent) ✓ |
| Border color | kontener **oraz** oba panele **oraz** triggery `border-color` = `rgb(37,99,235)` | **Tak** ✓ |
| Accent color | `--nextless-toggle-accent` = `#ff0000`; tło aktywnego triggera `rgb(255,0,0)` | **Tak** ✓ (ale patrz B1/B2) |
| Accent contrast color | `--nextless-toggle-accent-contrast` = `#00ff00` (zmienna **poprawnie** ustawiona) | **Tak** ✓ (bez wpływu na render — patrz B2) |

- **Spójność „Clear" (pozytyw):** wszystkie 4 pola mają „Clear" **wyłączony** gdy wartość = motyw, **włączający się** po ustawieniu koloru, i **wracający** do `disabled` po rewersji. Pełna rewersja całej czwórki do `var(--color-…)` potwierdzona w inline `style`.
- **Doradca kontrastu — oba branche:** dla accent=#ff0000/contrast=#00ff00 oraz #ff0000/#ff0000 → ostrzeżenie „Active trigger contrast advisory: Configured colors may be hard to read together."; dla navy/white → **brak** ostrzeżenia (patrz N3 — to właśnie tam advisory się myli).

### 4.7 Visual / Pane cards — komplet enumów × oba panele

**Secondary pane (widoczny, wszystkie wartości klikane):**

| Kontrolka | Wartości → klasa/inline panelu |
|-----------|--------------------------------|
| Surface | Inherited→(brak bg) · Soft surface→`bg-[var(--color-bg)]` · Contrast surface→`bg-[var(--color-surface)] shadow-sm` (3/3) ✓ |
| Padding | Compact→`p-3` · Comfortable→`p-4` · Spacious→`p-6` (3/3) ✓ |
| Radius | Small→`rounded-md` · Medium→`rounded-lg` · Large→`rounded-xl` (3/3) ✓ |
| Border emphasis | Subtle→`border-width:1px`, brak shadow · Strong→`border-width:2px` + `shadow-sm` (2/2) ✓ |

**Primary pane (ukryty, czytany przez className):** ustawiony niezależnie na Soft/Compact/Small/Strong (`p-3 rounded-md bg-[var(--color-bg)] shadow-sm`, bw 2px), podczas gdy Secondary trzymał Contrast/Spacious/Large/Strong — **panele są w pełni niezależne**. ✓

### 4.8 Visual / Pane authoring + Structure

- Podsumowanie: „Add widgets to the **Miesięcznie** and **Rocznie** panes from the page builder." + statyczna notka „Toggle Block stays intentionally limited to two panes. Use Tabs or a future task for 3+ views." — aktualizuje się na żywo. ✓
- **Structure (współdzielony wrapper):** dwa **stałe** sloty „Primary Pane slot"/„Secondary Pane slot", każdy „0 items", „Move up"/„Move down" **disabled**, **brak „Add panel"** — potwierdza widget o stałych dwóch panelach. ✓

### 4.9 Advanced — w 100% read-only i wiernie odzwierciedla stan z Visual

**0 kontrolek `writable`** w sekcjach `toggle-block.advanced.*`. Po moich edycjach:

- **Runtime summary:** Variant „Switch", Opening pane „Rocznie (secondary)", Motion „None", Pane labels „Miesięcznie / Rocznie", Helper copy „Hidden" (po Clear), Accessibility announcement „Toggle content view · suffix: selected" (po Clear → defaulty).
- **Style diagnostics:** Surface/Border/Accent/Accent contrast „Theme default" (po Clear całej czwórki), Primary pane card „Surface: Soft surface · Padding: Compact · Radius: Small · Border: Strong", Secondary pane card „Surface: Contrast surface · Padding: Spacious · Radius: Large · Border: Strong". **Pełna zgodność z edycjami.**
- **Support summary:** „Fixed two-pane widget: primary and secondary slots" + „Wizard seeds setup, Visual owns daily editing, Advanced is read-only." (statyczne).

### 4.10 Wizard

- „Run setup again" otwiera tryb; „Finish setup and open Visual" wraca na zakładkę Visual (`aria-selected=true`). ✓
- Read-only „Toggle surface: Switch" zgodny z bieżącym wariantem. ✓
- **Brak jakichkolwiek edytowalnych kontrolek** (patrz N5).

---

## 5. CO NIE DZIAŁA / jest martwe (twarde ustalenia)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **B1 — etykieta aktywnego triggera niewidoczna przy ustawionym Accent color (defekt renderera)** | Renderer / Theme | Renderer nakłada inline `style={{ color: style.accentColor }}` na **każdy** trigger (`triggerStyle`). Aktywny trigger ma jednocześnie tło `var(--nextless-toggle-accent)` (= accentColor) i — z klasy — tekst `var(--nextless-toggle-accent-contrast)`. **Inline `color` ma wyższą specyficzność niż klasa**, więc tekst aktywnego triggera przyjmuje **kolor accentu = identyczny z tłem**. Zweryfikowane na żywym froncie (`getComputedStyle`): instancja cards → tekst i tło `rgb(0,0,255)` (niebieski na niebieskim), instancja switch → `rgb(15,23,42)` (ciemny na ciemnym). Reprodukcja w admin canvas: accent=#ff0000 → tekst i tło `rgb(255,0,0)`; navy → `rgb(0,0,128)` na `rgb(0,0,128)`. **Warunek wyzwalający (doprecyzowany):** defekt pojawia się **wyłącznie gdy `style.accentColor` jest ustawiony** (dowolny, także literalny `var(--color-text)`); przy **wyczyszczonym** accencie inline `color` nie jest renderowany (`style=""`) i klasa kontrastu działa poprawnie. Tak więc **samo ustawienie własnego Accent color psuje czytelność aktywnej etykiety.** |
| **B2 — „Accent contrast color" jest martwą kontrolką, gdy accent jest ustawiony (sprzężone z B1)** | Renderer / Theme | Pole „Accent contrast color" istnieje, by zapewnić czytelny tekst na aktywnym triggerze, i **poprawnie aktualizuje** zmienną `--nextless-toggle-accent-contrast` (zweryfikowano: #00ff00 trafia do zmiennej) oraz stan „Clear". Jednak z powodu B1 inline `color: accentColor` zawsze wygrywa, więc accent contrast **nie ma żadnego wpływu** na realny render aktywnego triggera. Test: accent=#ff0000, contrast=#00ff00 → zmienna zielona, ale realny `color` aktywnego triggera = czerwony. Kontrolka jest de facto „martwa" dokładnie w scenariuszu, w którym ma największe znaczenie. |
| **B3 — zduplikowana klasa `shadow-sm` (kosmetyka)** | Renderer | Kombinacja Pane surface „Contrast surface" + Border emphasis „Strong" daje na panelu `… shadow-sm shadow-sm` (zweryfikowane: `shadowCount=2`), bo klasę dokłada zarówno `paneSurfaceClassMap.contrast`, jak i `paneBorderClassMap.strong`. Bez wpływu wizualnego — drobny zapach w generowaniu klas. |

> **Status TASK-343-10 (2026-05-30):** B1/B2/B3 zamknięte w kodzie.
> Renderer nie nadaje już inline `color: accentColor` aktywnemu triggerowi,
> więc tekst aktywnego stanu przechodzi przez
> `--nextless-toggle-accent-contrast`. Nieaktywny trigger może nadal używać
> `accentColor` jako koloru tekstu. Kompozycja klas deduplikuje powtarzane
> utility, więc Contrast surface + Strong border emituje pojedyncze
> `shadow-sm`. Pokrycie: `tests/vitest/widgets/toggleBlock.test.tsx`.

> Poza B1/B2/B3 **nie wykryto** twardych bugów renderowania: wszystkie enumy Visual aktualizują canvas, Advanced wiernie podsumowuje, frontend jest interaktywny i dostępny, konsola admina i frontu: **0 błędów / 0 ostrzeżeń**.

---

## 6. CZEGO NIE DA SIĘ W PEŁNI ZWERYFIKOWAĆ (nazwane kontrolki + powód)

| # | Kontrolka / ścieżka | Powód nietestowalności |
|---|---------------------|------------------------|
| **NT1 — „Save draft" / „Publish" (trwałość i propagacja)** | całość | Świadomie **nie** klikałem, by nie mutować współdzielonego fixture. Trwałość edycji po przeładowaniu i propagacja na front nie były testowane. Zweryfikowana została natomiast spójność w obrębie sesji edytora (Visual→Advanced→Wizard) oraz izolacja względem frontu (front pokazuje wcześniej zapisany stan). |
| **NT2 — render dzieci paneli (`slots.primary` / `slots.secondary`)** | canvas / front | Oba panele są **puste** (0 dzieci); nie dodawałem zagnieżdżonych widgetów, więc renderowanie zawartości paneli i ich propagacja na front nie zostały wykonane. Dodanie widgetu trwale mutowałoby fixture. |
| **NT3 — wizualne animacje `fade` / `slide`** | front / canvas | Potwierdziłem **obecność klas** animacji w DOM (sekcja 4.4), ale animacja jest zdarzeniem czasowym uruchamianym przy realnym przełączeniu — nie obserwowałem jej jako ruchu klatka-po-klatce. |
| **NT4 — `prefers-reduced-motion`** | front | Klasy `motion-safe:` (warunkujące animację) i `motion-reduce:animate-none` są obecne dla fade/slide, ale **nie wymuszałem** redukcji ruchu w przeglądarce, więc realnego zachowania pod włączoną redukcją nie potwierdziłem. |
| **NT5 — admin canvas: interaktywne przełączenie panelu** | canvas | Niemożliwe **z założenia** — w trybie admin runtime nie jest wstrzykiwany (`bound=unset`), więc kliknięcie triggera nie przełącza paneli (patrz N4). Drugiego panelu nie da się obejrzeć w podglądzie bez zmiany „Default state". |

> **Uwaga o automatyzacji kolorów (nie bug aplikacji):** komenda `fill` na `input[type=color]` **nie** aktualizowała stanu React (przyciski „Clear" pozostawały `disabled`). Skuteczne okazało się ustawienie wartości natywnym setterem + zdarzenia `input`+`change`. To artefakt sterowania programowego, nie defekt produktowy — realny wybór z color-pickera (event `change`) działa.

---

## 7. NIUANSE UX/UI (świadome decyzje i obserwacje, nie twarde bugi)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1-coupling — Accent color jest jednocześnie kolorem tekstu WSZYSTKICH triggerów** | Renderer | `triggerStyle.color = style.accentColor` jest aplikowany do **każdego** triggera (aktywnego i nieaktywnego), nie tylko jako tło aktywnego. Na froncie instancji #0 nieaktywny trigger ma `color: rgb(0,0,255)` (niebieski) na jasnym tle (`bg-[var(--color-bg)]`) — czytelny, ale to znaczy, że accent **podwójnie** pełni rolę „koloru tekstu wszystkich zakładek". Brak osobnej kontrolki „inactive text color"; to sprzężenie jest źródłem defektu B1 dla aktywnego triggera. |
| **N3 — doradca kontrastu opisuje intencję, nie realny render** | Theme | „Active trigger contrast advisory" liczy kontrast między `accentContrastColor` (fg) a `accentColor` (bg). Test zaostrzony: accent=#000080 (navy), contrast=#ffffff (white) → **advisory NIE pokazuje ostrzeżenia** (zakłada czytelne biały-na-navy), podczas gdy realny render to navy-na-navy (`rgb(0,0,128)` tekst i tło — niewidoczne, przez B1). Advisory daje więc **fałszywe poczucie bezpieczeństwa** dokładnie w przypadku, gdy render jest zepsuty. |
| **N4 — admin canvas/preview jest NIEINTERAKTYWNY** | UX podglądu | `previewMode` → `runtimeScript = null`; renderer nie ma reactowego stanu podglądu przełączania (brak odpowiednika `previewActiveId` z Tabs). `data-coderso-toggle-bound`=unset; klik triggera w canvas **nic nie przełącza** (zweryfikowano: stan przed=po). Autor nie obejrzy drugiego panelu w podglądzie — musi zmienić „Default state". |
| **N5 — Wizard nie jest równorzędnym trybem i nic nie konfiguruje** | UX nawigacji | Wizard ukryty za „Run setup again"; jego cała zawartość to read-only „Toggle surface" + notka. **Zero edytowalnych kontrolek** (mniej niż w Tabs, gdzie Wizard miał select liczby zakładek). Dla osoby szukającej „kreatora startowego" to raczej ekran informacyjny niż wizard. |
| **N6 — „Live preview" w Wizardzie jest statyczny mimo nazwy** | Wizard | W trybie Wizard istnieje render „Live preview" (`bound=unset`). Klik triggera primary przy stanie secondary **nie przełącza** widoku (przed=po=secondary). Spójne z N4 (brak runtime), ale nazwa „Live preview" sugeruje interaktywność, której nie ma. |
| **N7-clear — „Clear" na ariaLabel/selectedSuffix RESETUJE do domyślnej, nie czyści** | Accessibility | „Clear" przy „Toggle group label"/„Selected announcement" usuwa klucz, a normalizacja zwraca **wartość domyślną** („Toggle content view"/„selected") — pole nie staje się puste. Inaczej niż „Clear" przy Helper, który ustawia `""` i **ukrywa** `<p>`. Dwa pola z tą samą etykietą przycisku zachowują się różnie (reset vs ukrycie). |
| **N8 — „Visibility summary: Hidden on all devices" przy renderującym się widgecie (współdzielony wrapper)** | Wrapper (poza Toggle Block) | W Advanced współdzielona sekcja pokazuje „Shown on: Hidden on all devices", podczas gdy wszystkie 3 przełączniki Device visibility są **odznaczone** (`aria-checked=false`, etykiety „Desktop/Tablet/Mobile Hidden"), a widget **renderuje się** (front desktop + canvas). Sformułowanie wygląda na odwrócone/mylące. To kontrolka **współdzielonego wrappera** (obecna we wszystkich widgetach), nie element Toggle Block — odnotowuję jako obserwację. |

> **Routing po TASK-343-10 (2026-05-30):** N3 jest zamknięte razem z
> B1/B2, bo doradca opisuje teraz realną parę aktywny tekst/tło i nie ma już
> inline override psującego render. N4/N6 są opisane w edytorze: preview w
> Wizard/Visual jest statyczne, a klik/klawiatura są montowane na publicznych
> stronach. N8 pozostaje w `TASK-343-21`, a wspólna semantyka kolorów/Clear z
> N7-clear pozostaje w `TASK-343-30`.

**Pozytyw spójności:** wszystkie 4 pola kolorów w Theme mają spójny, poprawnie włączany/wyłączany „Clear" (lepiej niż w części innych widgetów); Advanced w 100% read-only i dokładny; ARIA na froncie kompletna; placeholder edytora nie wycieka na front.

---

## 8. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-toggle-block-0516`) | Zgodność |
|--------|----------------------|--------------------------------------|----------|
| Markup i atrybuty `data-coderso-toggle-*` | ✓ ten sam renderer | ✓ identyczne | ✓ (wspólny renderer) |
| Przełączanie paneli | ✗ brak (brak runtime, brak stanu podglądu) | ✓ runtime (mysz + klawiatura) | ✗ różnica celowa (N4) |
| Skrypt runtime | nie wstrzykiwany (`bound=unset`) | wstrzyknięty i powiązany (`bound=true`, 1 skrypt) | ✗ różnica celowa |
| Placeholder pustego panelu | „Use the page builder…" (tryb edytora) | brak (nie wyciekł) | ✓ poprawne rozróżnienie |
| ARIA (role/aria) | obecna w markupie | obecna i działająca (roving tabindex, aria-live) | ✓ |
| Defekt B1/B2 (niewidoczna etykieta aktywnego triggera) | Zamknięty przez TASK-343-10: aktywny tekst używa `--nextless-toggle-accent-contrast` | Zamknięty przez wspólny renderer | ✓ |

**Wniosek:** renderer jest wspólny; markup admin↔front spójny. Jedyne celowe różnice to warstwa interaktywności (front ma runtime, admin nie ma — N4) i placeholder. TASK-343-10 zamknął kontrast aktywnego triggera we wspólnym rendererze, więc poprawka obejmuje admin preview i frontend.

---

## 9. Podsumowanie

- **Toggle Block jest w dobrym stanie funkcjonalnym po stronie konfiguracji i frontu.** W tej iteracji domknięto luki: **wszystkie** wartości wariantu, default state, **motion (w tym fade)**, oraz **komplet enumów kart paneli** (surface/padding/radius/borderEmphasis × oba panele) kliknięte i zweryfikowane w DOM; niezależność paneli potwierdzona; **wszystkie 4 kolory Theme** ustawione i zrewertowane przez „Clear"; oba branche doradcy kontrastu; komplet klawiszy klawiatury na froncie.
- **Najważniejszy realny defekt (B1/B2):** TASK-343-10 zamknął regresję. Ustawienie własnego **Accent color** nie nadaje już aktywnemu triggerowi inline `color: accentColor`; „Accent contrast color" ponownie steruje tekstem aktywnego stanu.
- **N3 (sprzężony):** doradca kontrastu opisuje teraz realną parę aktywny tekst/tło po poprawce renderera; ostrzeżenie nie jest już fałszywie bezpieczne przez inline override.
- **Najważniejszy niuans UX (N4/N6):** podgląd w admin (canvas i Wizard) pozostaje **nieinteraktywny** z założenia, ale edytor explicite opisuje statyczny preview i publiczny runtime click/keyboard.
- **Wizard (N5):** ekran wyłącznie informacyjny (read-only), bez edytowalnych kontrolek.
- **Drobne:** B3 zamknięte przez deduplikację klas; N7-clear pozostaje routingiem do `TASK-343-30`, N8 do `TASK-343-21`; nieaktywny trigger może nadal używać `accentColor` jako tekstu (świadome sprzężenie po usunięciu aktywnego override).
- **Nietestowalne (nazwane):** trwałość po zapisie/publikacji (NT1), render dzieci paneli (NT2), wizualne animacje (NT3), `prefers-reduced-motion` (NT4), interaktywne przełączanie w admin (NT5 — niemożliwe z założenia).
- **Higiena fixture:** żadnych „Save"/„Publish"; edycje to ulotny stan sesji; konsola admina i frontu **0/0**.

---

## 10. Matryca priorytetów (sugestia)

| # | Problem | Priorytet | Obszar |
|---|---------|-----------|--------|
| B1 | Zamknięte przez TASK-343-10: aktywny trigger nie dostaje inline `color: accentColor` | KRYTYCZNY | Renderer |
| B2 | Zamknięte przez TASK-343-10: „Accent contrast color" steruje aktywnym tekstem | KRYTYCZNY | Renderer |
| N3 | Zamknięte przez TASK-343-10: doradca opisuje realną parę aktywnego triggera | WYSOKI | Edytor |
| N4 | Wyjaśnione przez TASK-343-10 copy: admin preview jest statyczny, public runtime interaktywny | WYSOKI | Edytor / preview |
| N6 | Wyjaśnione przez TASK-343-10 copy: Wizard/setup preview nie montuje runtime | ŚREDNI | Wizard |
| N5 | Wizard bez edytowalnych kontrolek (ekran informacyjny) | ŚREDNI/NISKI | Wizard / UX |
| N7-clear | Niespójne „Clear" (reset do domyślnej vs ukrycie) | NISKI | Edytor |
| B3 | Zamknięte przez TASK-343-10: Contrast + Strong emituje pojedyncze `shadow-sm` | NISKI (kosmetyka) | Renderer |
| N8 | „Visibility summary: Hidden on all devices" mylące (współdzielony wrapper) | NISKI / poza Toggle Block | Wrapper |

---

## 11. Czego NIE testowano poza powyższym (uczciwe ograniczenia)

- Współdzielony wrapper (Block layout / Device visibility) poza odnotowaniem N8 nie był audytowany głębiej — nie należy do Toggle Block.
- Token Pane surface „Soft surface" zweryfikowano w admin canvas; na froncie fixture nie używa tej wartości (ten sam mechanizm mapowania klas, więc bez ryzyka rozjazdu).

---

## 12. Screenshoty (lokalne etykiety)

> W tym przebiegu **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję DOM
> (`eval`, `getComputedStyle`, atrybuty). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi
> etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git); nie są wymaganym
> evidence i nie zostały dołączone do żadnego pliku źródłowego.

| Etykieta (lokalna, niewygenerowana) | Opis |
|-------------------------------------|------|
| `toggle-block-29-public-two-instances.png` | Publiczna trasa — dwie instancje (cards/secondary + switch/primary), defekt B1 (blue-na-blue) |
| `toggle-block-29-admin-theme-accent-bug.png` | Edytor Visual / Theme — accent #ff0000 + contrast #00ff00, aktywny trigger red-na-red |
| `toggle-block-29-admin-pane-cards.png` | Visual / Pane cards — niezależne style panelu primary vs secondary |
