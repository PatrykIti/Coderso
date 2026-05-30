# RAPORT: FAQ Accordion Widget — audyt gap-close (limity, walidacja, ordered-list, pełne rodziny stylów + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-29 (upgrade audytu z 2026-05-28 — domknięcie luk)
> **Sesja Playwright:** `claude-29-05-faq-accordion-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/639e28ec-1203-4fbe-8273-bf3fd0bba203`
> **Fixture public:** http://localhost:3000/test-faq-accordion-0516
> **Pliki źródłowe:** `core/widgets/core/faqAccordion.tsx` (renderer + normalizacja + parser markdown + JSON-LD + skrypt runtime) · `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Cel tego upgrade'u:** poprzedni raport (28-05) zostawił luki: limity/walidacja brzegowa,
> gałąź listy uporządkowanej (`ordered-list`), budżety parsera markdown, pełne pokrycie rodzin
> stylów oraz operacje add/remove/reorder/bulk. Ten audyt **domyka te luki** realną interakcją
> w UI i inspekcją DOM (atrybuty `data-faq-*`, klasy Tailwind, inline `style`, ARIA, natywny stan
> `<details>`, treść `<script application/ld+json>`). Sekcje jasno oddzielają: **przetestowane /
> działa / nie działa / nie-do-zweryfikowania / niuanse UX**.

> **Metodyka i bezpieczeństwo fixture:** weryfikacja oparta **wyłącznie o inspekcję DOM** (`eval`)
> w żywym edytorze Visual. **Nie** klikałem „Save draft" ani „Publish" — wszystkie edycje to
> ulotny stan React w sesji (nie mutują współdzielonego fixture). Izolację potwierdziłem osobno
> (sekcja 4.7). Zrzutów PNG **nie** zapisywałem; ewentualne pliki byłyby **wyłącznie lokalnymi
> etykietami** w `.playwright-cli/` (katalog ignorowany przez Git), nie są evidence w repo.
>
> **Remediacja TASK-343-05 (2026-05-30):** N1 i N2 są zamknięte. Visual ma
> teraz realny select `Spacing` dla `style.spacing`, Advanced pokazuje tę samą
> wartość jako read-only summary, a statyczny SSR/admin preview nie emituje
> `aria-expanded`; publiczny runtime ustawia i synchronizuje ten atrybut po
> zbindowaniu.

---

## 1. Przegląd widgetu (skrót)

**Typ:** `faq-accordion` · **Kategoria:** `content`. **Warianty:** `single-column`, `two-column` (`grid-cols-1 lg:grid-cols-2`), `compact` (`text-sm` + wymuszony padding `px-4 py-3`).

**Limity (kod):** itemy min 1 / max 12 (`faqAccordionItemMax=12`); `question` ≤ 180; `answer` ≤ 2000; `icon` ≤ 16; link href ≤ 500; budżety markdown: tokeny inline ≤ 80, węzły ≤ 120, pozycje listy **na blok** ≤ 12; JSON-LD tekst ≤ 900. Liczba itemów jest **data-driven** (tablica + „Questions count"), nie sloty.

**Render:** każdy item = natywny `<details>`/`<summary>`, `role="region"` na panelu, wzajemne `aria-controls`/`aria-labelledby`. Single-open = natywny atrybut `name` (grupa wykluczająca). Skrypt runtime (`data-coderso-faq='1'`) synchronizuje `aria-expanded` po `toggle`. `seo.emitFaqJsonLd=true` + poprawne pary Q/A → `<script application/ld+json>` typu `FAQPage`. Markdown w odpowiedziach → bezpieczny podzbiór (bold/italic/code/link/listy), linki zewnętrzne z `target="_blank" rel="noopener noreferrer"`.

**Architektura edytora:** prawy panel ma dwie zakładki **Visual** i **Advanced**; **Wizard** to nie zakładka — wchodzi się przez „Run setup again", wychodzi „Finish setup and open Visual". Advanced jest **w 100% read-only**.

---

## 2. Stan fixture w momencie audytu (istotna obserwacja: Draft ≠ published)

| Atrybut | Admin canvas (Draft) | Frontend (published) |
|---------|----------------------|----------------------|
| `data-faq-variant` | `single-column` | `two-column` |
| `data-faq-spacing` | `md` | `none` |
| `data-faq-count` | `3` | `3` |
| `data-faq-default-open` | `0` | `-1` (wszystkie zwinięte) |
| `data-faq-motion` | `none` | `none` |
| JSON-LD | brak | brak (`emitFaqJsonLd=false`) |

**Obserwacja (nie bug):** **wersja Draft w adminie i wersja opublikowana na froncie są rozjechane.** Draft trzyma w zasadzie domyślne wartości widgetu (single-column, spacing `md`, defaultOpen 0), a opublikowana strona ma własne wartości (two-column, spacing `none`, defaultOpen −1, najpewniej zaseedowane). To normalne zachowanie draft/publish CMS-a, ale **istotne dla audytu**: edycje w edytorze nie wpływają na live page do czasu publikacji, a obie wersje danych żyją niezależnie. Każdy kto porównuje admin↔front musi mieć to na uwadze.

`renderCount=1` w adminie (jeden canvas) — brak kolizji grupy `name`. Canvas `data-coderso-faq-bound` = **unset** (potwierdza N2 — skrypt runtime nie wykonuje się w edytorze).

---

## 3. Co przetestowano w tym audycie (zakres interakcji)

**Frontend (public):** render zapisanego stanu, bound skryptu runtime, single-open (wzajemne wykluczanie), collapse-all, synchronizacja `aria-expanded` po każdym toggle, klawiatura (focus summary + Enter), kompletne ARIA, responsywność 375 px (overflow + zwinięcie kolumn), konsola, brak JSON-LD, izolacja niezapisanych edycji.

**Limity/walidacja (NOWE):** ucinanie `question`→180, `answer`→2000, `icon`→16 (UTF-16), fallback przy pustym question/answer, trim białych znaków na żywo, twardy max 12 (Add disabled), zakres selecta licznika (1–12), guard min 1, clamping `defaultOpenIndex`.

**Markdown / ordered-list (NOWE):** render listy uporządkowanej (`<ol> list-decimal`), cap pozycji listy (12 na blok → rozbicie na drugi blok), rozbicie list mieszanych (UL+OL), budżet tokenów inline (80), spłaszczenie ordered-list+markdown w JSON-LD.

**Rodziny stylów (NOWE, wyczerpująco):** wszystkie wartości maxWidth (5), headerAlign (3), headerTitleSize (5) + gałąź `auto` w compact, sectionPaddingX (4), sectionPaddingY (4), panelRadius (5), borderWidth (4), motion (2). Potwierdzenie braku kontrolki `spacing` (N1).

**Kolory (NOWE, wyczerpująco):** palety Light i Brand (+ Dark z poprzedniego audytu), Clear na Surface/Border/Question (mechanizm wspólny dla 7 pól), niuans N3 (surface→transparent), bezpośredni picker, kolizja etykiet N4.

**Operacje na itemach (NOWE):** Add do 12, reorder przyciskiem, Remove ✕ z dialogiem, bulk select + Delete selected z guardem „nie usuwaj wszystkich", allowMultipleOpen.

**Wizard / Advanced:** karty wariantu + licznik + „Finish", oraz pełny odczyt read-only Advanced wiernie odbijający edycje z Visual.

---

## 4. Co DZIAŁA — szczegóły zweryfikowane w DOM

### 4.1 Frontend (public `/test-faq-accordion-0516`)

| Test | Wynik |
|------|-------|
| Bound skryptu runtime | `data-coderso-faq-bound="true"` ✓ |
| Single-open | otwarcie item 2 → item 1 `open=false` (natywna grupa `name`) ✓ |
| Collapse-all | ponowny klik zamyka, `anyOpen=false` ✓ |
| `aria-expanded` sync | po każdym toggle `aria-expanded` == `details.open` ✓ |
| Klawiatura | focus `<summary>` + `Enter` → `open=true`, `aria-expanded="true"`; ponowny Enter zamyka ✓ |
| ARIA | `summary.aria-controls` == panel `id`; panel `role="region"` + `aria-labelledby` == `summary.id`; sekcja `aria-labelledby` → `<h3>` ✓ |
| Mobile 375 px | `scrollWidth==clientWidth==375` (brak overflow); two-column → **jedna** kolumna (`grid-template-columns` jeden track `343px`) ✓ |
| Konsola | **0 błędów, 0 ostrzeżeń** ✓ |
| JSON-LD | brak (zgodnie z fixture `emitFaqJsonLd=false`) ✓ |

### 4.2 Limity i walidacja brzegowa (NOWE — luka domknięta)

| Kontrola | Test | Efekt |
|----------|------|-------|
| `question` max 180 | wpis 253 znaków z markerem „END" | input **i** canvas = 180 znaków, „END" ucięty ✓ |
| `answer` max 2000 | wpis 2504 znaków z markerem „TAIL" | input + canvas = 2000, „TAIL" ucięty ✓ |
| `icon` max 16 | „🚀×10 + ABCDEFGHIJ" | ucięte do 16 **jednostek UTF-16** (= 8 emoji); input i canvas = 16 ✓ |
| Puste question | wyczyszczenie pola | natychmiastowy powrót do fallbacku „How long does setup take?" (input **i** canvas) ✓ |
| Puste answer | wyczyszczenie pola | powrót do fallbacku „Most teams configure…" ✓ |
| Trim białych znaków | „`   Spaced Question   `" | live trim → „Spaced Question" (len 15) ✓ |
| Twardy max 12 | Add item × wiele | przy 12: „Add item" **disabled**, „12/12 items configured" ✓ |
| Zakres licznika | otwarcie selecta „Questions count" | dokładnie opcje **1–12** (brak 0, brak 13) ✓ |
| Guard min 1 | licznik → 1 | jedyny „Remove" **disabled**, „Delete selected" disabled, `count=1` ✓ |
| Clamping `defaultOpenIndex` | defaultOpen=Item 3 (idx 2), potem licznik 3→2 | `data-faq-default-open` zaciska się 2→**1**, otwarty item 2 ✓ |

**Niuans (kluczowy, sklasyfikowany w 5):** ucinanie i trim dzieją się **na każdym keystroke** (normalizacja w `updateValue`), więc pusty `question`/`answer` natychmiast „odbija" do tekstu fallback — patrz U1.

### 4.3 Markdown: gałąź ordered-list i budżety parsera (NOWE — luka domknięta)

| Test | Efekt |
|------|-------|
| Lista uporządkowana `1. … 2. … 3. …` | `<ol class="space-y-1 pl-5 list-decimal">`, 3× `<li>`, prefiksy „1." usunięte ✓ |
| Lista nieuporządkowana `* …` | `<ul class="… list-disc">` ✓ (potwierdzono też przy liście mieszanej) |
| **Cap pozycji listy = 12 (na blok)** | lista 15-pozycyjna → **pierwszy `<ol>` 12 pozycji**, a pozycje 13–15 trafiają do **drugiego, osobnego `<ol>`** (patrz U2 — drugi `<ol>` restartuje numerację od 1) ✓ |
| Listy mieszane | `* a / * b / 1. c / 2. d` → rozbicie na `UL(list-disc)` + `OL(list-decimal)` ✓ |
| **Budżet tokenów inline = 80** | 100× `**b**` → **dokładnie 80** `<strong>`, reszta zostaje literalnym tekstem „`**b**`" ✓ |
| JSON-LD: spłaszczenie ordered-list + markdown | „`1. First **bold** step` / `2. Second [link](https://example.com) step`" → tekst odpowiedzi w `FAQPage` = „**First bold step Second link step**" (numery usunięte, bold rozpakowany, etykieta linku zachowana, URL pominięty) ✓ |

### 4.4 Rodziny stylów — pełne pokrycie wartości (NOWE — luka domknięta)

| Kontrolka | Wartości → efekt w canvas |
|-----------|---------------------------|
| **Max width** | Narrow→`max-w-3xl` · Medium→`max-w-4xl` · Wide→`max-w-5xl` · Extra wide→`max-w-6xl` · Full width→`max-w-none` (5/5) ✓ |
| **Header alignment** | Left→`mr-auto text-left` · Center→`mx-auto text-center` · Right→`ml-auto text-right` (3/3) ✓ |
| **Header title size** | Auto→`text-2xl` (=lg, bo single-column) · Small→`text-lg` · Medium→`text-xl` · Large→`text-2xl` · Extra large→`text-3xl` (5/5) ✓ |
| **Header title size — gałąź compact/auto** | wariant `compact` + Auto → `text-xl` (=md); summary `text-sm`; padding paneli `px-4 py-3` ✓ |
| **Horizontal padding** | None→`px-0` · Tight→`px-2` · Default→`px-4` · Roomy→`px-6` (4/4) ✓ |
| **Vertical padding** | None→`py-0` · Tight→`py-4` · Default→`py-8` · Roomy→`py-12` (4/4) ✓ |
| **Panel radius** | Square→(brak `rounded`) · Small→`rounded-md` · Medium→`rounded-lg` · Large→`rounded-xl` · Extra large→`rounded-2xl` (5/5) ✓ |
| **Border width** | 0/1/2/3 px → inline `border-width: Npx` (4/4) ✓ |
| **Motion** | none → brak rotacji chevrona, brak wrappera; smooth → chevron `group-open:rotate-180` + animowany wrapper `grid grid-rows-[0fr]→group-open:grid-rows-[1fr]` (2/2) ✓ |

### 4.5 Kolory — pełne pokrycie palet i Clear (NOWE — luka domknięta)

| Test | Efekt |
|------|-------|
| Paleta **Light** | 7 jawnych kolorów = preset (surface `#ffffff`, border `#e2e8f0`, question `#0f172a`, answer `#334155`, divider `#e2e8f0`, hTitle `#0f172a`, hDesc `#475569`) ✓ |
| Paleta **Brand** | 7 jawnych kolorów = preset (surface `#eff6ff`, border `#93c5fd`, question `#1e3a8a`, answer `#1d4ed8`, divider `#bfdbfe`, hTitle `#1e40af`, hDesc `#1d4ed8`) ✓ |
| Paleta **Dark** | (zweryfikowana w audycie 28-05) — komplet 3 palet działa ✓ |
| **Clear — Panel border** | inline `border-color` → `var(--color-border)` (fallback motywu), badge „Theme default", Clear disabled ✓ |
| **Clear — Question text** | inline `color` → puste (brak), badge „Theme default", Clear disabled ✓ |
| **Clear — Panel surface (N3)** | inline `background-color` → **puste/transparent** (BEZ fallbacku `var(--color-bg)`) — patrz N3 |
| Picker bezpośredni | Question text → `#00ff00` → `rgb(0, 255, 0)` ✓ |
| Spójność „Clear" | wszystkie 7 pól dzielą `ColorField`; Clear disabled gdy wartość == theme default, aktywny po palecie/własnym kolorze ✓ |

### 4.6 Operacje na itemach (NOWE — luka domknięta)

| Operacja | Wynik |
|----------|-------|
| **Add item** | licznik rośnie aż do 12, potem przycisk disabled ✓ |
| **Reorder (Move down)** | kolejność summary zmienia się w edytorze i canvas jednocześnie ✓ |
| **Remove ✕** | dialog „**Remove FAQ item?**" („…keeps the minimum one-item guard."), Cancel/Remove item; po potwierdzeniu `count` 2→1 ✓ |
| **Bulk: guard „nie usuwaj wszystkich"** | zaznaczenie **wszystkich** 3 → „Delete selected" **disabled**; odznaczenie jednego (2 z 3) → **enabled** ✓ |
| **Bulk: usunięcie** | dialog „**Delete selected FAQ items?**" („Delete 2 selected items? This cannot remove the final remaining FAQ row."), po potwierdzeniu usuwa 2, zostaje 1 ✓ |
| **allowMultipleOpen** | toggle on → `data-faq-multiple-open="true"`, atrybut `name` znika ze **wszystkich** `<details>` (null) → możliwe 2 panele naraz ✓ |

### 4.7 Wizard, Advanced i izolacja

- **Wizard:** karty wariantu (Single→Two Column → `data-faq-variant="two-column"`), select „Questions count", tekst pomocniczy, przycisk „**Finish setup and open Visual**" wraca poprawnie na zakładkę Visual (`aria-selected="true"`). ✓
- **Advanced (read-only):** wiernie odbija wszystkie moje edycje z Visual — „Allow multiple: Enabled", „Default open: Item 1", „Questions: 3/12", „Answer formats: Markdown, Plain text", „Search: Enabled", surface/border „Theme default" (po Clear), divider/question/answer/header „Selected color", „Layout: **Full width · Right · Default**", „Panel style: Extra large corners · 3 px border · Auto title", „Markdown answers enabled", „Native summary/details disclosure", podział kontraktu Wizard/Visual/Advanced, „Saved FAQ data is already clean.". ✓ **Brak edytowalnych kontrolek.**
  - Po TASK-343-05 wiersz „Layout" nadal pozostaje read-only, ale odbija już spacing ustawiony z Visual, bo kontrolka `Spacing` istnieje w sekcji „Layout and typography".
- **Izolacja edycji:** po wszystkich niezapisanych zmianach w Visual front (`/test-faq-accordion-0516`, świeża karta) nadal pokazuje **stan zapisany** (two-column, spacing none, count 3, single-open, defaultOpen −1, JSON-LD off). Żadna edycja nie wyciekła. ✓
- **Konsola admina:** 0 błędów / 0 ostrzeżeń (tylko info React DevTools). ✓

---

## 5. Znaleziska i status po remediacji

| # | Obszar | Obserwacja | Status |
|---|--------|-----------|--------|
| **N1 — brak kontrolki `style.spacing` + mylący opis (realna luka funkcjonalna)** | Visual / kontrakt | Token `style.spacing` steruje JEDNOCZEŚNIE odstępem między panelami (`spacingClassMap` gap-0…gap-4) **i** wewnętrznym paddingiem paneli (`panelPaddingClassMap`). Historycznie w sekcji „Layout and typography" nie było żadnego selecta „Spacing"/„Gap", mimo że kontrakt deklarował `style.spacing` jako `writablePath`, opis sekcji obiecywał spacing, a Advanced podsumowywał spacing w wierszu „Layout". | Zamknięte w TASK-343-05: Visual ma realny select `Spacing`, który zapisuje `style.spacing`; renderer testuje gap i padding, a Advanced summary pokazuje wybraną etykietę. |
| **N2 — `aria-expanded` nie synchronizuje się w canvas adminowym** | Renderer / a11y (admin-only) | Skrypt runtime jest wstrzykiwany przez `dangerouslySetInnerHTML`, którego React **nie wykonuje** w edytorze (canvas `data-coderso-faq-bound` = *unset*). Historycznie SSR emitował początkowe `aria-expanded`, które mogło zostać stale po ręcznym toggle w admin canvas. | Zamknięte w TASK-343-05: statyczny SSR/admin preview nie emituje `aria-expanded`; publiczny runtime nadal ustawia i synchronizuje atrybut po zbindowaniu. |
| **N3 — „Clear" na Panel surface = brak tła, nie kolor motywu** | Visual / colors | Po „Clear" na „Panel surface" kontener traci inline `background-color` całkowicie (transparent), zamiast wracać do `var(--color-bg)`. Inaczej niż „Panel border", który po Clear wraca do `var(--color-border)`. Badge mówi „Theme default", ale panel staje się przezroczysty (przepuszcza tło sekcji). Subtelnie mylące. | Pozostaje poza zakresem TASK-343-05. |
| **N4 — kolizja etykiet palet z przełącznikiem wyglądu admina** | Visual / colors (automatyzacja) | Na stronie istnieją **dwa** przyciski o accessible name „Dark" (przełącznik wyglądu admina + paleta FAQ). Dla realnego użytkownika nieistotne; problem tylko dla automatyzacji/lokatorów po nazwie (trzeba scope'ować do sekcji „FAQ palettes"). Po zescope'owaniu paleta działa bez zarzutu. Drobny niuans. | Pozostaje niuansem automatyzacji. |
| **N5 — brak kontrolki gęstości także w Wizard** | Wizard | Wizard = wariant + liczba pytań. Po TASK-343-05 gęstość jest świadomie własnością Visual, a Wizard pozostaje minimalnym setupem. | Zamknięte jako niespójność: spacing jest edytowalny w Visual. |
| **U1 — pusty `question`/`answer` natychmiast „odbija" do fallbacku; live-trim białych znaków (NOWE)** | Walidacja / UX | Normalizacja na każdym keystroke powoduje, że gdy pole `question`/`answer` stanie się puste, input **natychmiast** wypełnia się tekstem fallback (np. „How long does setup take?"). Edytor próbujący „wyczyścić i napisać od nowa" zobaczy odbijający tekst — trzeba zaznaczyć-wszystko-i-nadpisać. Analogicznie leading/trailing spacje są **ścinane na żywo** (nie da się wpisać spacji wiodącej). Nie jest to bug danych (gwarantuje niepuste, przycięte wartości), ale **realny tarcie UX**. | Pozostaje poza zakresem TASK-343-05. |
| **U2 — listy >12 pozycji rozbijają się na osobne bloki; ordered-list restartuje numerację (NOWE)** | Renderer / markdown | Cap pozycji listy (`faqAccordionMarkdownListItemMax=12`) działa **per blok**, nie globalnie. Lista 15-pozycyjna renderuje się jako `[<ol> 1–12][<ol> 13–15]`. Ponieważ drugi `<ol>` to nowy element `list-decimal`, **numeracja restartuje od 1** — wizualnie wygląda jak „1…12, 1, 2, 3". Dla długich list numerowanych mylące. (Listy nieuporządkowane też się rozbijają, ale brak widocznej numeracji czyni to mniej dotkliwym.) | Pozostaje poza zakresem TASK-343-05. |

**Nie wykryto** żadnego błędu konsoli (admin i front: 0/0), żadnego twardego buga renderowania ani rozjazdu między wspólnie testowanymi opcjami w obrębie sesji. Po TASK-343-05 kontrolki Wizard/Visual z zakresu `style.spacing` są spójne z kontraktem.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend | Zgodność |
|--------|--------------|----------|----------|
| Atrybuty `data-faq-*` | żywy `FaqAccordionBlock` | identyczna mechanika | ✓ (renderer wspólny) |
| Dane Draft vs published | defaults (single/md/0) | seed (two-col/none/−1) | ⚠ Draft ≠ published (sekcja 2) |
| Otwieranie/zamykanie `<details>` | działa natywnie | działa + skrypt runtime | ✓ |
| Single-open (`name`) | działa natywnie | działa natywnie | ✓ |
| `aria-expanded` po ręcznym toggle | brak statycznego atrybutu do desyncu | ✓ sync po zbindowaniu runtime | ✓ po TASK-343-05 |
| Liczba renderów | 1 (brak kolizji `name`) | 1 | ✓ |
| Markdown / ordered-list / budżety | render bezpieczny | kod współdzielony | ✓ |
| JSON-LD `FAQPage` | wstrzykiwany przy włączeniu | fixture off → brak | ✓ logika spójna |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** (stan zapisany) | ✓ poprawna izolacja |

---

## 7. Czego NIE dało się zweryfikować (uczciwe ograniczenia)

- **Drag & drop reordering itemów — NIE-DO-ZWERYFIKOWANIA.** Dokładna kontrola: kontener pozycji w sekcji „Questions and answers" z atrybutem `draggable` + `data-faq-drag-item` (handlery `onDragStart`/`onDragOver`/`onDrop`). Komenda `playwright-cli drag [data-faq-drag-item='faq-3'] [data-faq-drag-item='faq-4']` wykonała się **bez błędu, ale kolejność się NIE zmieniła**. Powód: harness nie symuluje pełnego przepływu HTML5 Drag-and-Drop (`dataTransfer` + sekwencja `dragstart→dragover→drop`), więc stan React w handlerach nie jest aktualizowany. **To ograniczenie środowiska testowego, nie aplikacji** — ta sama funkcja `moveItem` wywoływana przyciskami ↑/↓ działa poprawnie (4.6). Realny drag użytkownika prawdopodobnie zadziała, ale **nie mogę tego potwierdzić**.
- **Save draft / Publish — świadomie pominięte**, by nie mutować współdzielonego fixture. W konsekwencji **nie** zweryfikowano trwałości edycji po przeładowaniu ani propagacji na front. (Zweryfikowano natomiast spójność w obrębie sesji Visual→Advanced oraz izolację względem frontu.)
- **Budżet węzłów = 120 w izolacji.** Bezpośrednio potwierdziłem cap tokenów inline (80) i pozycji listy (12 na blok); cap 120 węzłów był osiągany tylko pośrednio (nie wymusiłem czystego scenariusza „120 węzłów").
- **`prefers-reduced-motion`** — dla `motion=smooth` obecne są klasy animacji, ale nie testowałem pod włączoną redukcją ruchu.
- **Cięcie ikony na granicy pary surogatów** — przy limicie 16 trafiłem na granicę parzystą (8 pełnych emoji), więc nie wymusiłem rozcięcia pary surogatów w połowie (potencjalny edge, nie zweryfikowany).
- **Artefakt harnessu (nie bug aplikacji):** `fill` z treścią zaczynającą się od „`- `" jest interpretowane jako flaga CLI i cicho nie wchodzi — listy nieuporządkowane testowałem więc bulletami „`*`". Odnotowane, by nie pomylić z błędem appki.
- **Współdzielone sekcje wrappera (Block layout, Device visibility):** poza zakresem audytu FAQ; nie modyfikowane trwale.

---

## 8. Podsumowanie

- **faq-accordion jest w bardzo dobrym stanie funkcjonalnym.** Domknięcie luk z 28-05 potwierdziło, że **limity i walidacja działają poprawnie i na żywo**: ucinanie question/answer/icon (180/2000/16), fallback przy pustych polach, live-trim, twardy max 12 + guard min 1, zakres licznika 1–12, clamping `defaultOpenIndex`.
- **Gałąź ordered-list i budżety markdown** działają zgodnie z projektem: `<ol> list-decimal`, cap pozycji 12 na blok, rozbicie list mieszanych, cap tokenów 80, oraz poprawne spłaszczenie ordered-list+markdown do plain textu w JSON-LD `FAQPage`.
- **Pełne rodziny stylów** (maxWidth, headerAlign, titleSize + gałąź compact/auto, paddingX/Y, panelRadius, borderWidth, motion) zmapowane co do jednej wartości na poprawne klasy/inline. **Trzy palety** (Light/Brand/Dark) i **spójny „Clear"** dla wszystkich 7 kolorów.
- **Operacje na itemach** (Add do 12, reorder przyciskiem, Remove z dialogiem, bulk-delete z guardem „nie usuwaj wszystkich", allowMultipleOpen) działają z poprawnymi dialogami i guardami. **Wizard** i **read-only Advanced** spójne; Advanced wiernie odbija stan Visual.
- **TASK-343-05 zamknął najważniejsze realne znaleziska N1/N2:** `style.spacing`
  jest edytowalne w Visual i runtime-owned `aria-expanded` nie driftuje w
  statycznym admin preview.
- **Nowe niuanse UX:** U1 (puste pole odbija do fallbacku + live-trim — tarcie przy edycji), U2 (listy >12 pozycji rozbijają się na osobne bloki, ordered-list restartuje numerację). Pozostałe: N3 (surface Clear → transparent), N4 (kolizja etykiet — automatyzacja), N5 (Wizard pozostaje minimalnym setupem; spacing jest Visual-owned).
- **Obserwacja:** Draft (admin) i wersja opublikowana (front) są rozjechane — istotne przy każdym porównaniu admin↔front.
- **Nie-do-zweryfikowania:** drag&drop reorder (ograniczenie symulacji HTML5 DnD w harnessie; funkcja bazowa `moveItem` potwierdzona przyciskami) oraz trwałość po zapisie (świadomie nie zapisywano).
- Front: w pełni interaktywny, dostępny, bez overflow na 375 px, 0 błędów/ostrzeżeń konsoli; niezapisane edycje admina nie wyciekają.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję DOM
> (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń w
> `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence i nie zostały
> dołączone do repo.
