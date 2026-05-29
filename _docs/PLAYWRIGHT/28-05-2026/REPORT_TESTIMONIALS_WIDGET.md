# RAPORT: Testimonials Widget — audyt wyczerpujący (Wizard / Visual / Advanced + Front)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z 2026-05-28)
> **Sesja przeglądarki:** `claude-29-05-testimonials-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `4c0e301f-1c64-48e2-b6b5-791201a8d66c` (breadcrumb „Contract Test - testimonials"), blok `blk-1`
> **Route public:** `http://localhost:3000/test-testimonials-0516` (tytuł „TEST-TESTIMONIALS-0516")
> **Pliki źródłowe:** `core/widgets/core/testimonials.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` (edytory Wizard/Visual/Advanced), `core/admin/ui/media/MediaPicker.tsx`, `core/admin/ui/widgets/editors/ClearableFields.tsx`, `LinkDestinationField.tsx`.

> **Metodologia (różnica względem poprzedniej wersji):** Ten pass jest świadomie *wyczerpujący*, a nie reprezentatywny.
> Dla każdej obecnej w fixture rodziny kontrolek przeklikałem **wszystkie dyskretne opcje** (a nie próbkę): warianty,
> wszystkie pozycje selectów, oba stany przełączników, dodawanie/usuwanie/przestawianie pozycji, przyciski „Clear"
> dla wszystkich pól koloru, media-pickery (avatar + tło) oraz picker destynacji CTA. Każdą zmianę weryfikowałem
> inspekcją atrybutów `data-testimonials-*` / `data-testimonial-*`, klas i computed-style faktycznie wyrenderowanego
> elementu w canvas. Wyjątek (świadomie udokumentowany w sekcji 6): kontrolki będące **ciągłym zakresem liczbowym**
> (count 2–24, page size 2–12) próbkowałem na granicach + wartościach środkowych, bo każdy krok to tylko inna liczba
> kart, nie odrębny stan UI.

> **Uwaga o zrzutach:** Nazwy plików PNG w sekcji 9 to **wyłącznie lokalne etykiety** przechwyceń Playwright.
> Same pliki nie są wymaganym evidence i nie są commitowane do repo.

---

## 1. Przegląd widgetu

**Typ:** `testimonials` · **Kategoria:** content
**Opis (z definicji):** „Social proof quotes with ratings, author identity, and conversion CTA."
**Warianty:** `grid` (domyślnie 3 pozycje), `spotlight` (2), `slider-static` (3).
**Ograniczenia:** liczba pozycji min 2 / max 24; page size paginacji min 2 / max 12; rating 0–5.

**Tryby edytora (`testimonialsEditorContract`, `editorCapabilities.visualOwnsVariantSelection: true`):**
- **Wizard** — 1 sekcja „Section copy" (rola `setup`), `writablePaths: []`, `readOnlyPaths: ["variant", "testimonials.count"]`.
- **Visual** — 7 sekcji edytowalnych (Variant/layout, Header copy, Testimonials content & ratings, Section surface & typography, Colors & emphasis, CTA & conversion, Pagination & load more).
- **Advanced** — 3 sekcje diagnostyczne (rola `diagnostics`, wszystkie `writablePaths: []`).

**Stan startowy fixture:** blok `blk-1` zawierał zapisany draft z poprzedniego audytu (variant slider-static, tytuł
„Zaufały nam zespoły AUDYT-0528", accent czerwony itd.). Audyt prowadziłem na żywym stanie, przeklikując wszystkie opcje
niezależnie od punktu wyjścia.

---

## 2. Co było faktycznie testowane (pełny zakres interakcji)

**Wizard:** wejście „Run setup again", odczyt obu wierszy read-only i obu boksów pomocniczych, policzenie kontrolek edytowalnych, powrót „Finish setup and open Visual".

**Visual — przeklikane do końca rodziny kontrolek:**
- Variant cards: **wszystkie 3** (Grid / Spotlight / Slider Static).
- Testimonials count (2–24): próbka 2 / 4 / 10 / 24.
- Card spacing: **wszystkie 4** (None / Compact / Default / Spacious).
- Slider navigation: **oba** (Dots / None).
- Rating zero display: **wszystkie 3** (Hide empty / No rating label / Show empty stars) — na karcie z rating=0.
- Header: eyebrow, title, description.
- Per-karta: Quote (textarea), **Formatted quote** (rich-text + Bold), Author, Role, Source label, **Rating 0–5 (wszystkie 6)**, Avatar (Browse media → wybór → Clear avatar).
- Reorder: **Move up / Move down** (+ stany disabled na granicach), **Set spotlight** (wariant spotlight).
- **Add testimonial** (+ guard max 24), **Remove + ConfirmActionDialog** (Cancel oraz Remove, + guard min 2).
- Section surface: Background gradient **(4)**, Background tone **(3)**, Header alignment **(3)**, Title size **(3)**, Card radius **(5)**, Card border width **(3)**, **Background image** (Browse → wybór → Clear image).
- Colors: **wszystkie 4** pola koloru + **Section background** — każde set + **Clear**; oba **ColorContrastNotice** (warning + unknown).
- CTA: visibility **(2)**, label, destination (picker stron + „No destination" + „Clear destination"), target **(2)**, style **(3)**.
- Pagination: mode **(2)**, page size (2 / 4 / 12), button label.

**Persistencja:** „Save draft" → toast → reload → pełne porównanie atrybutów 1:1.

**Advanced:** odczyt 3 sekcji, policzenie kontrolek edytowalnych, sprawdzenie braku przycisków akcji, weryfikacja zgodności ze stanem.

**Front:** status HTTP, konsola, semantyka/a11y, nawigacja dot, overflow przy 1280 i 375.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Wizard
- Baner „Setup complete…" + przycisk **„Run setup again"** otwiera Wizard.
- Dokładnie **jedna** sekcja „Section copy" z **dwoma** wierszami read-only:
  - „Testimonials style: **Slider Static**" (`variant`),
  - „Testimonials count: **3 testimonials**" (`testimonials.count`).
  - Oba wiersze odzwierciedlają **żywy** stan (nie zahardkodowane defaulty) — `data-widget-control-readonly="true"`.
- Dwa boksy pomocnicze („Use Visual to write…", „Visual owns testimonial style, count…").
- **„Finish setup and open Visual"** wraca do Visual.
- **0 edytowalnych kontrolek widgetu** w Wizard. ✅

### 3.2 Visual — wszystkie rodziny kontrolek działają i aktualizują podgląd live

**Variant & layout**

| Opcja | Efekt w renderze (zweryfikowany) |
|---|---|
| Grid | `variant=grid`, count→**3**, lista `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Spotlight | `variant=spotlight`, count→**2**, `grid-cols-1 lg:grid-cols-2`, **1 karta** `data-testimonial-highlighted=true` |
| Slider Static | `variant=slider-static`, count→**3**, `flex overflow-x-auto snap-x snap-mandatory`, `tabindex=0`, hint przewijania, `data-overflow-intentional=true` |
| Count 2 / 4 / 10 / 24 | renderuje dokładnie 2 / 4 / 10 / 24 karty (granice min/max OK) |
| Spacing None/Compact/Default/Spacious | `gap-0` / `gap-3` / `gap-5` / `gap-7` |
| Slider nav Dots / None | 2 kropki / 0 kropek (`data-…-slider-navigation=dots|none`) |
| Rating display Hide empty / No rating label / Show empty stars | na karcie rating=0: brak / tekst „No rating" / puste gwiazdki (`aria-label="Rating 0 out of 5"`) |

- **Synchronizacja wariant↔liczba** działa (grid 3 / spotlight 2 / slider-static 3) — patrz niuans 5.1.

**Header copy** — eyebrow, title (zmienia też `aria-label` sekcji), description: wszystkie live. ✅

**Per-karta (Testimonials content & ratings)**

| Kontrolka | Efekt |
|---|---|
| Quote (textarea) | tekst cytatu live (`data-testimonial-quote-mode="plain"`) |
| Formatted quote (rich-text) | wpisanie tekstu + **Bold** → karta przełącza się na `quote-mode="html"` z `<strong>…</strong>` (sanitizacja dopuszcza p/br/strong/em/a) |
| Author / Role / Source label | live; alt awatara składa się z author+role+sourceLabel |
| Rating 0–5 (wszystkie 6) | `data-testimonial-rating` + `aria-label="Rating N out of 5"` |
| Set spotlight (spotlight) | ustawia spotlight; render przenosi pozycję na początek + podświetla |
| Move up / Move down | przestawia kolejność; przyciski disabled na granicach (góra pierwszej / dół ostatniej) |
| Add testimonial | count+1, dokł. „Customer N"; **disabled przy 24** |
| Remove + ConfirmActionDialog | dialog „Remove testimonial N? This action cannot be undone."; **Cancel** zachowuje, **Remove** kasuje; oba przyciski Remove **disabled przy 2** |

**Avatar (media picker)** — „Browse media" otwiera „Media library" (5 assetów), wybór kafelka ustawia awatar
(`<img>` z poprawnym alt „Photo of Jan Audytowy, Tester QA, Firma Audyt Sp. z o.o."), **Clear avatar** usuwa go i
przywraca inicjał. ✅ (uwaga interakcyjna — patrz niuans 5.9).

**Section surface & typography**

| Kontrolka | Wszystkie opcje → render |
|---|---|
| Background gradient | none→brak / soft→`linear-gradient(... rgba(37,99,235,.08) ...)` / warm→amber / cool→cyan-indygo |
| Background tone | plain→brak shadow/ring / soft→`shadow-sm ring-1 …/35` / contrast→`shadow-lg ring-1 …/50` |
| Header alignment | left→`items-start text-left` / center→`items-center text-center` / right→`items-end text-right` |
| Title size | sm→`text-xl sm:text-2xl` / md→`text-2xl sm:text-3xl` / lg→`text-3xl sm:text-4xl` |
| Card radius | none→`rounded-none` / sm→`rounded-md` / md→`rounded-xl` / lg→`rounded-2xl` / xl→`rounded-[1.75rem]` |
| Card border width | none→`border-0` / sm→`border` / md→`border-2` |
| Background image | wybór z biblioteki → `data-…-has-background-image=true` + `url(...)` w tle (`background-size: auto, cover` przy współistniejącym gradiencie); **Clear image** usuwa |

**Colors & emphasis** — każde pole set + Clear potwierdzone:

| Pole | Set → render | Clear → swatch fallback |
|---|---|---|
| Section background | `#102030` → `rgb(16,32,48)` | tło → transparent, swatch `#ffffff` |
| Card background | `#fafad2` → `rgb(250,250,210)` | karta → transparent, swatch `#ffffff` |
| Card border | `#ff6600` → `rgb(255,102,0)` | swatch `#e2e8f0` |
| Text color | `#7711cc` → kolor powierzchni `rgb(119,17,204)` | swatch `#0f172a` |
| Accent color | `#00aa00` → gwiazdki **i** source label `rgb(0,170,0)` | render wraca do tokenu motywu `rgb(226,177,39)`, swatch fallback `#1d4ed8` |

- **ColorContrastNotice**: przy niskim kontraście (tekst/accent na białym) → **amber warning** „Text/Accent contrast advisory: Configured colors may be hard to read together."; po Clear → wyciszony „…: Contrast depends on inherited theme or transparent colors.". ✅

**CTA & conversion**

| Kontrolka | Efekt |
|---|---|
| Visibility Disabled / Enabled | brak `<a data-testimonials-cta>` / renderuje się link |
| Label | tekst linku live |
| Destination (LinkDestinationField) | picker stron (m.in. HomePage) → `href=/homepage`; „No destination" → CTA znika (brak ważnego href); „Clear destination" obecny i aktywny |
| Target New tab / Same tab | `target="_blank" rel="noopener noreferrer"` / brak target+rel |
| Style Primary / Secondary / Link | `bg-[var(--color-text)]` / `border border-[var(--color-border)]` / `px-0 underline underline-offset-4` |

**Pagination & load more**

| Kontrolka | Efekt (count=6) |
|---|---|
| Mode No pagination / Load more | 1 lista, 6 kart, brak `<details>` / `<details data-testimonials-load-more>` + 2 listy |
| Page size 2 / 4 / 12 | 2 widoczne + 4 w overflow / 4 + 2 / 6 + 0 (details znika, bo overflow pusty) |
| Button label | tekst `<summary>` = wpisana etykieta („Pokaż więcej opinii 29-05") |

### 3.3 Persistencja (Save draft → reload)
„Save draft" → toast **„Draft saved."** (0 błędów konsoli). Po reloadzie edytor wraca z blokiem zaznaczonym, a pełny
zrzut stanu jest **bit w bit identyczny** z przedzapisowym (`diff` = IDENTICAL): wszystkie atrybuty sekcji
(variant grid, spacing lg, count 6, header-align right, title-size lg, card-radius xl, card-border-width md,
slider-nav none, rating-display stars, pagination load-more, tone contrast, gradient cool), header copy,
**sanityzowany HTML cytatu karty 1** (`<strong>`), **wszystkie 6 autorów** (w tym dodane „Customer 5"/„Customer 6"),
CTA (style link, href /homepage), etykieta load-more. ✅

### 3.4 Advanced — read-only, wiernie odzwierciedla stan
- **0 edytowalnych kontrolek widgetu** — wszystkie 12 wierszy `testimonials.advanced.*` ma `data-widget-control-readonly="true"`. Dodatkowe 4 kontrolki page-buildera (`builder.advanced.layout.*`, `builder.advanced.visibility.devices`) — także read-only.
- **Brak jakichkolwiek przycisków akcji** w sekcjach diagnostycznych widgetu (czysta diagnostyka, bez „normalize").
- Wartości zgodne z zapisanym stanem Visual:
  - **Runtime summary:** Variant `grid`; Testimonials `6 configured`; Spotlight item `testimonial-1`.
  - **Display settings:** spacing `lg`; empty rating `stars`; slider navigation `none (inactive outside slider-static)`; pagination `load-more`; visible `2`; load more label „Pokaż więcej opinii 29-05".
  - **Content health:** Avatars `0 of 6 configured`; Ratings `6 of 6 configured`; CTA „Przejdź do historii 29-05".

### 3.5 Front (`/test-testimonials-0516`)
- HTTP **200**, tytuł „TEST-TESTIMONIALS-0516", **0 błędów i 0 ostrzeżeń konsoli**.
- **1** opublikowany widget w wariancie **slider-static** (3 karty) — to stan **opublikowany**, nie mój draft (patrz 6).
- **A11y / semantyka:** `<section>` z `aria-label="Trusted by teams that ship fast"` + `aria-labelledby`; `<nav aria-label="Testimonials navigation">` z 3 kropkami jako `<a href="#…-testimonial-N">` (scoped instance id); 3 × `<article aria-label="Testimonial N: Autor">`; lista `tabindex=0` + `aria-describedby` → hint; `data-overflow-intentional=true`.
- **Nawigacja kropkami:** klik kropki #2 ustawia `location.hash` na scoped anchor `…-testimonial-2`. ✅
- **Overflow:** brak poziomego overflow strony przy **1280** i **375** (`scrollWidth == clientWidth`); lista slider-static przewija się **wewnętrznie** (zamierzone). ✅

---

## 4. Co NIE działa / problemy

- **Nie wykryto defektów funkcjonalnych w przeklikanym, pełnym zakresie kontrolek.** Każda dyskretna opcja każdej
  rodziny kontrolek realnie zmieniała render, a stan przetrwał Save draft → reload 1:1. Wizard i Advanced zachowują
  kontrakt (setup-only / read-only diagnostics). Front renderuje się bez błędów konsoli i bez poziomego overflow strony.
- **Element graniczny (borderline)** — patrz niuans **5.6**: „wyczyszczenie" sformatowanego cytatu przez zaznacz-wszystko+Delete
  zostawia samotny `<br>`, co utrzymuje tryb HTML i renderuje **pusty** cytat (ukrywa fallback plain-quote). To najbliższe
  zachowanie do błędu, jakie zaobserwowałem — formalnie zaliczam je do niuansów treści, bo nie powoduje crashu ani błędu
  konsoli, ale efekt (znikający widoczny cytat) może zaskoczyć redaktora.

> Uczciwe zastrzeżenie: „brak defektów" dotyczy zakresu z sekcji 2. Obszary z sekcji 6 nie były klikane.

---

## 5. Uwagi UX/UI i dostępności (niuanse)

1. **Zmiana wariantu resetuje liczbę pozycji do domyślnej wariantu.** Ustawiłem count=5/6, po przełączeniu wariantu
   liczba wraca do defaultu (grid 3 / spotlight 2 / slider-static 3) — `buildVariantSyncedTestimonialsValue` celowo
   synchronizuje liczbę, ale dla użytkownika wcześniej dobrana lista może „uciąć" się bez ostrzeżenia.
2. **„Set spotlight": render ≠ kolejność edytora.** Gdy spotlight nie jest pierwszą pozycją listy edytora, render
   przenosi ją na początek i podświetla, a lista w edytorze zachowuje pierwotną kolejność. Potwierdzone: ustawienie
   spotlightu na pozycję 2 (Marek) → w renderze Marek jako pierwsza, podświetlona karta; w edytorze nadal 2.
3. **„Slider navigation" jest edytowalny także poza slider-static.** Pojawia się tylko nota „This option only affects
   the slider-static variant.", ale Select nie jest wyszarzony — można zmieniać wartość bez efektu w renderze.
4. **Swatch koloru pokazuje statyczny `pickerFallback` dla tokenów motywu.** Accent `#1d4ed8`, Card border `#e2e8f0`,
   Text `#0f172a`, Section/Card bg `#ffffff`. Po „Clear" render wraca do realnego tokenu motywu (np. accent →
   `rgb(226,177,39)`), ale swatch dalej pokazuje fallback hex, a nie faktyczny kolor tokenu — sygnał „token vs własny
   kolor" jest mylący. (`showValueInput=false`, więc nie ma też pola tekstowego z wartością.)
5. **„Rating zero display" dotyczy wyłącznie kart z rating=0.** Dla kart z rating>0 wszystkie 3 opcje wyglądają
   identycznie — różnicę widać tylko na karcie zerowej.
6. **(NOWE) „Wyczyszczenie" Formatted quote zostawia `<br>` i renderuje pusty cytat.** Zaznacz-wszystko+Delete w
   rich-text edytorze zostawia `<br>`. Renderer (sanitizacja dopuszcza `<br>`) utrzymuje `quote-mode="html"` i pokazuje
   **pusty** cytat — **fallback do plain-quote nie zadziała**, dopóki pole HTML jest niepuste. Żeby przywrócić zwykły
   cytat, trzeba opróżnić rich-text do końca (sam `<br>` to dla widgetu „treść HTML"). Zaobserwowane na żywym renderze.
7. **CTA enabled + label, ale „No destination" → CTA nie renderuje się.** Bez ważnego href link znika; brak inline-hintu
   dla pustej destynacji (ostrzeżenie `getCtaHrefFeedback` pojawia się tylko dla **niebezpiecznych** URL, nie dla pustych).
8. **Radix Select vs natywny select.** Wszystkie comboboxy (count, spacing, nav, rating display, gradient/tone/align/
   size/radius/border, CTA target/style, pagination, destination) to Radix — wymagają kliknięcia triggera i opcji;
   programowa komenda `select` nie działa. Niuans harnessu, nie błąd widgetu.
9. **Media picker — interakcja w headless.** Trigger „Browse media" ma nad sobą nakładający się `div.space-y-2`
   (`elementFromPoint` zwraca overlay, nie przycisk), więc zwykły klik Playwright nie trafia (nieskończone „retrying
   click") — trzeba wywołać bezpośredni DOM-click. **Wewnątrz** dialogu realne kliki na kafelki działają i od razu
   aplikują wybór; DOM-`.click()` na kafelku **nie** aktualizuje stanu React pickera (trzeba realnego kliku albo
   potwierdzenia „Done"). Sam mechanizm pickera działa end-to-end — to niuans harnessu/interakcji, ale warto go znać.
10. **Front audytowałem w osobnej karcie**, by uniknąć dialogu `beforeunload` przy opuszczaniu edytora (znanego z
    poprzedniej sesji). Nie weryfikowałem ponownie samego `beforeunload` w tej sesji.

---

## 6. Czego NIE testowałem / świadome decyzje próbkowania

- **Count (2–24) i Page size (2–12)** — ciągłe zakresy liczbowe. Zweryfikowałem granice (min/max) + wartości środkowe
  (count: 2/4/10/24; page size: 2/4/12), bo każdy krok to tylko inna liczba kart, nie odrębny stan UI. To **nie** są
  rodziny dyskretnych opcji w rozumieniu pkt. 3 zadania.
- **Wolny URL (free-text) w CTA destination** — pole LinkDestinationField wystawiło picker stron (+ „No destination" +
  „Saved custom destination" jako bieżąca wartość niestandardowa). Nie zlokalizowałem w bieżącym trybie surowego pola
  tekstowego na własny URL; zweryfikowałem wybór strony, „No destination" i „Clear destination".
- **Walidacja niebezpiecznych URL** (avatar/background/CTA — `isValid…`/`normalize…`) — używałem bezpiecznych assetów z
  biblioteki i stron z pickera, nie wstrzykiwałem niebezpiecznych adresów.
- **Publikacja (Publish)** — wykonałem wyłącznie **Save draft** (zgodnie z polityką bezpiecznych akcji i metodyką z
  poprzedniego raportu). Moje edycje **nie trafiły na front**.
- **Round-trip moich edycji na trasę publiczną** — `/test-testimonials-0516` to **inna, opublikowana** strona niż
  edytowany draft. Front pokazuje treść opublikowaną (slider-static, kopie angielskie, accent `#1d4ed8`), a nie mój
  niezopublikowany draft (grid, kopie PL). Front zweryfikowałem więc pod kątem **poprawności renderu + a11y**, nie
  odzwierciedlenia moich edycji.
- **Wpływ „Device visibility: Hidden on all devices"** (page-builder) bloku fixture na opublikowanej trasie — read-only
  w Advanced, efekt nieweryfikowany.

---

## 7. Admin Preview vs Frontend — porównanie

| Aspekt | Admin (canvas, mój draft) | Frontend (opublikowana strona) | Uwaga |
|---|---|---|---|
| Wariant | grid (po edycji) | slider-static | front = osobna publikacja |
| Treść nagłówka | „Tytuł audytu 29-05" | „Trusted by teams that ship fast" | front = treść opublikowana |
| Accent | clear → token motywu `rgb(226,177,39)` | `rgb(29,78,216)` = `#1d4ed8` | różne stany danych |
| Spacing / radius / align | lg / xl / right | (opublikowane) | różne stany danych |
| Renderer | `TestimonialsBlock` | `TestimonialsBlock` | **ten sam komponent** |
| A11y (section/nav/article/list) | — | poprawne (sekcja 3.5) | — |

**Wniosek:** admin i front używają tego samego renderera; rozbieżność wartości wynika wyłącznie z tego, że testowałem
**draft** w adminie, a front serwuje **opublikowaną** wersję osobnej strony. Brak rozjazdu na poziomie komponentu renderującego.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only podsumowanie (styl + liczba) + przejście do Visual | ✅ Zgodny z kontraktem (0 pól edycji), wiersze odzwierciedlają żywy stan |
| **Visual** | Główny edytor (7 sekcji) | ✅ **Wszystkie** dyskretne opcje wszystkich rodzin kontrolek działają, aktualizują podgląd i są trwałe po zapisie |
| **Advanced** | 3 sekcje diagnostyczne | ✅ 12 wierszy read-only (0 edycji, 0 przycisków akcji); wartości wierne |
| **Front** | `/test-testimonials-0516` (slider-static, 1 widget) | ✅ HTTP 200, 0 błędów konsoli, poprawne a11y, nawigacja dot, brak overflow strony (1280/375) |

**Werdykt końcowy:** W **wyczerpująco** przeklikanym zakresie widget `testimonials` jest sprawny i spójny między
edytorem a rendererem. Przeszedłem przez wszystkie 3 warianty, wszystkie pozycje wszystkich selectów, oba stany
przełączników, pełen cykl add/remove/reorder/spotlight z guardami min2/max24 i dialogiem potwierdzenia, wszystkie
4 pola koloru + Section background z przyciskami Clear, oba media-pickery (avatar + tło) z Clear, picker destynacji CTA,
rich-text z formatowaniem oraz pełną paginację load-more. Wszystko zmienia render i przetrwało Save draft → reload 1:1.
Nie wykryto defektów funkcjonalnych. Najistotniejsza obserwacja jakościowa to niuans **5.6** (puste sformatowane cytaty
zostawiają `<br>` i ukrywają plain-quote). Pozostałe punkty sekcji 5 to znane niuanse UX (reset liczby przy zmianie
wariantu, render≠kolejność edytora, aktywny Select nav poza slider-static, swatch z fallback-hex, CTA bez destynacji).
Obszary niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 9. Zrzuty (etykiety lokalne — pliki PNG nie są commitowane)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `testimonials-admin-wizard-29-05.png` | Admin, Wizard — read-only „Section copy" |
| `testimonials-admin-visual-29-05.png` | Admin, Visual po pełnym przeklikaniu kontrolek |
| `testimonials-admin-advanced-29-05.png` | Admin, Advanced — diagnostyka read-only |
| `testimonials-public-desktop-1280-29-05.png` | Front `/test-testimonials-0516`, 1280px (slider-static, brak overflow strony) |
| `testimonials-public-mobile-375-29-05.png` | Front `/test-testimonials-0516`, 375px (brak overflow strony) |
