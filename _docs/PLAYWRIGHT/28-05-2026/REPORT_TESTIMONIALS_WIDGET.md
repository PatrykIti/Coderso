# RAPORT: Testimonials Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-testimonials` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `4c0e301f-1c64-48e2-b6b5-791201a8d66c` (breadcrumb „Contract Test - testimonials"), blok `blk-1`
> **Route public:** `http://localhost:3000/test-testimonials-0516` (tytuł „TEST-TESTIMONIALS-0516")
> **Pliki źródłowe:** `core/widgets/core/testimonials.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026. Realnie klikałem w kontrolki i weryfikowałem zmianę w żywym podglądzie
> przez inspekcję atrybutów `data-testimonials-*` / `data-testimonial-*` na faktycznie
> wyrenderowanym elemencie w canvas, sprawdzałem trwałość po zapisie (Save draft →
> reload → ponowny odczyt) oraz render na publicznej trasie. Sekcja 6 jawnie wymienia
> czego NIE testowałem.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są
> commitowane do repo.

---

## 1. Przegląd widgetu

**Typ:** `testimonials` · **Kategoria:** content
**Opis (z definicji):** „Social proof quotes with ratings, author identity, and conversion CTA."
**Warianty:** `grid` (3 domyślne pozycje), `spotlight` (2), `slider-static` (3).
**Ograniczenia liczby pozycji:** min 2 / max 24. **Page size paginacji:** min 2 / max 12.

**Model danych (skrót, `TestimonialsData`):**

| Grupa | Pola |
|-------|------|
| `header` | `eyebrow`, `title`, `description` |
| `testimonials[]` | `id`, `quote`, `quoteHtml` (sanityzowany), `author`, `role`, `avatar`, `rating` (0–5), `sourceLabel` |
| `cta` | `enabled`, `label`, `href`, `target` (same-tab/new-tab), `style` (primary/secondary/link) |
| `layout` | `spotlightItemId` |
| `behavior` | `sliderNavigation` (none/dots), `ratingDisplay` (stars/hide-empty/label-empty) |
| `pagination` | `mode` (none/load-more), `pageSize`, `loadMoreLabel` |
| `style` | `sectionBackground`, `sectionGradient` (none/soft/warm/cool), `backgroundTone` (plain/soft/contrast), `backgroundImage`, `cardSurface`, `cardBorder`, `textColor`, `accentColor`, `spacing` (none/sm/md/lg), `headerAlign` (left/center/right), `titleSize` (sm/md/lg), `cardRadius` (none/sm/md/lg/xl), `cardBorderWidth` (none/sm/md) |

**Tryby edytora wg kontraktu (`testimonialsEditorContract`, `editorCapabilities.visualOwnsVariantSelection: true`):**
- **Wizard** — 1 sekcja „Section copy" (rola `setup`), `writablePaths: []`, `readOnlyPaths: ["variant", "testimonials.count"]`.
- **Visual** — 7 sekcji edytowalnych: „Variant and layout structure", „Header copy", „Testimonials content and ratings", „Section surface and typography", „Colors and emphasis", „CTA and conversion follow-up", „Pagination and load more".
- **Advanced** — 3 sekcje diagnostyczne (rola `diagnostics`, wszystkie `writablePaths: []`): „Runtime summary", „Display settings", „Content health".

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie poniższe interakcje wykonano w żywej aplikacji. Efekt weryfikowałem przez
inspekcję atrybutów `data-testimonials-*` / `data-testimonial-*`, klas i computed-style
faktycznie wyrenderowanego elementu w canvas, a trwałość przez ponowny odczyt po reloadzie.

- Logowanie do admina (`patryk.ciechanski@…`) + otwarcie fixture page i zaznaczenie bloku `blk-1`.
- **Wizard:** wejście przez „Run setup again", odczyt 2 wierszy read-only + dwóch boksów pomocniczych, policzenie kontrolek edytowalnych, powrót przez „Finish setup and open Visual".
- **Visual:** header (eyebrow/title/description), przełączenie wariantu na Spotlight i Slider Static, „Set spotlight" na pozycji 2, liczba pozycji (count = 5), Card spacing = Compact, Slider navigation = None, Rating zero display = No rating label, per-card Rating = 0/5, Card radius = None, Header alignment = Left, Background tone = Contrast, CTA enabled + label + style = Primary, Pagination = Load more + page size = 2, Accent color = `#ff0000` (przez swatch).
- **Persistencja:** „Save draft" → toast „Draft saved." → reload → ponowny odczyt całego stanu (porównanie 1:1).
- **Advanced:** odczyt 3 sekcji diagnostycznych, policzenie kontrolek edytowalnych, weryfikacja zgodności podsumowań ze stanem zapisanym w Visual.
- **Front:** otwarcie `/test-testimonials-0516`, status HTTP, konsola, struktura semantyczna/a11y, klik nawigacji dot (anchor), overflow przy 1280 i 375.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard
- W stanie domyślnym panel pokazuje baner **„Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics."** z przyciskiem **„Run setup again"**; przycisk ten otwiera Wizard (analogicznie jak w widgecie Divider/Section).
- Wizard zawiera **dokładnie jedną** sekcję **„Section copy"** z dwoma wierszami read-only:
  - **„Testimonials style: Grid"** (ścieżka `variant`),
  - **„Testimonials count: 3 testimonials"** (ścieżka `testimonials.count`),
  oraz dwoma boksami pomocniczymi („Use Visual to write the section eyebrow, title, description, quotes…" i „Visual owns testimonial style, count, the testimonial list, quote formatting…").
- Przycisk **„Finish setup and open Visual"** poprawnie wraca do Visual.
- **Programowo potwierdzono 0 edytowalnych kontrolek widgetu** w panelu Wizard — obie kontrolki mają `data-widget-control-readonly="true"`.
- **Werdykt:** Wizard działa zgodnie z kontraktem — to wyłącznie afordancja startowa/podsumowanie, bez pól edycji; wariant i liczba pozycji są tu read-only.

_Zrzut (lokalny): `testimonials-admin-wizard-28-05.png`_

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Kontrolka | Akcja testowa | Efekt w renderze (zweryfikowany) | Wynik |
|---|---|---|---|
| Header → Eyebrow | Wpis „AUDYT eyebrow" | pierwszy `<p>` w `<header>` zmienia treść | ✅ |
| Header → Title | Wpis „Zaufały nam zespoły AUDYT-0528" | `<h2>` **oraz** `aria-label` sekcji zmieniają się live | ✅ |
| Header → Description | Wpis „Opis testowy audytu 0528." | akapit opisu w `<header>` zmienia treść | ✅ |
| Karty wariantu | Klik „Spotlight" | `data-testimonials-variant=spotlight`; `count` zsynchronizowany do **2**; 1 karta `data-testimonial-highlighted=true` | ✅ |
| Karty wariantu | Klik „Slider Static" | `variant=slider-static`; `count` zsynchronizowany do **3**; lista z `overflow-x-auto`, `data-overflow-intentional=true`, hint „Scroll horizontally…" | ✅ |
| Set spotlight | Klik na pozycji 2 (Marek) | render reorderuje spotlight na pierwszą pozycję i podświetla go (`data-testimonial-highlighted`) | ✅ |
| Testimonials count | Wybór „5" | `data-testimonials-count=5`; w renderze 5 pozycji | ✅ |
| Card spacing | Wybór „Compact" | `data-testimonials-spacing=sm`; klasa listy `gap-3` | ✅ |
| Slider navigation | Wybór „None" | `data-testimonials-slider-navigation=none`; znikają kropki nawigacji (0) | ✅ |
| Rating zero display | Wybór „No rating label" | `data-testimonials-rating-display=label-empty`; karta z `rating=0` renderuje tekst „No rating" | ✅ |
| Per-card Rating | Wybór „0 / 5" | `data-testimonial-rating=0` na danej karcie; brak gwiazdek (przy hide-empty) | ✅ |
| Card radius | Wybór „None" | `data-testimonials-card-radius=none`; klasa karty `rounded-none` | ✅ |
| Header alignment | Wybór „Left" | `data-testimonials-header-align=left`; klasa header `items-start text-left` | ✅ |
| Background tone | Wybór „Contrast" | `data-testimonials-background-tone=contrast` | ✅ |
| CTA visibility | Wybór „Enabled" | renderuje się `<a data-testimonials-cta>` (domyślnie ukryty) | ✅ |
| CTA label | Wpis „Zobacz historie AUDYT" | tekst linku CTA zmienia się live | ✅ |
| CTA style | Wybór „Primary" | `data-testimonials-cta-style=primary`; klasa `bg-[var(--color-text)]` | ✅ |
| Pagination mode | „Load more" + page size „2" (przy count=5) | `data-testimonials-pagination=load-more`; **2** pozycje widoczne + **3** w `<details data-testimonials-load-more>` z summary „Load more testimonials" | ✅ |
| Accent color (swatch) | Ustawienie `#ff0000` | gwiazdki ratingu **oraz** source label renderują się w `rgb(255,0,0)` | ✅ |

- **Synchronizacja wariant↔liczba pozycji działa:** zmiana wariantu ustawia liczbę pozycji na domyślną dla wariantu (grid 3 / spotlight 2 / slider-static 3) — patrz niuans 5.1.
- **Warunkowy hint przy Slider navigation** pojawia się, gdy aktywny wariant nie jest `slider-static` („This option only affects the slider-static variant.").

### 3.3 Persistencja (Save draft → reload)
„Save draft" zwraca toast **„Draft saved."**. Po reloadzie i ponownym zaznaczeniu bloku
**wszystkie** zmiany wróciły z bazy bez utraty (porównanie pełnego zrzutu atrybutów
przed zapisem i po reloadzie dało **zerową różnicę**):
`variant=slider-static`, `count=3`, `spacing=sm`, `header-align=left`, `card-radius=none`,
`slider-navigation=none`, `rating-display=label-empty`, `pagination=load-more`,
`background-tone=contrast`, tytuł „Zaufały nam zespoły AUDYT-0528", CTA „Zobacz historie AUDYT",
kolor gwiazdki `rgb(255,0,0)`. ✅

_Zrzut (lokalny): `testimonials-admin-visual-28-05.png`_

### 3.4 Tryb Advanced — read-only, wiernie odzwierciedla stan
- **Programowo potwierdzono 0 edytowalnych kontrolek widgetu** — wszystkie 12 kontrolek `testimonials.advanced.*` ma `data-widget-control-readonly="true"`. Dodatkowe 4 kontrolki to ustawienia page-buildera bloku (`builder.advanced.layout.*`, `builder.advanced.visibility.devices`), również read-only.
- Trzy sekcje diagnostyczne wiernie pokazały stan zapisany w Visual:
  - **Runtime summary:** Variant **slider-static**; Testimonials **3 configured**; Spotlight item **testimonial-2** (poprawnie — ustawiłem spotlight na pozycję Marka).
  - **Display settings:** Card spacing **sm**; Empty rating display **label-empty**; Slider navigation **none**; Pagination **load-more**; Visible before load more **2**; Load more label **Load more testimonials**.
  - **Content health:** Avatars **0 of 3 configured**; Ratings **2 of 3 configured** (jedna pozycja ma rating 0); CTA **Zobacz historie AUDYT**.
- **Brak jakiejkolwiek akcji** (w odróżnieniu od np. Contact, Advanced nie ma przycisku „normalization" — jest czysto diagnostyczny).
- **Werdykt:** Advanced realizuje zadeklarowany kontrakt diagnostyczny — zero edycji, podsumowania spójne ze stanem.

_Zrzut (lokalny): `testimonials-admin-advanced-28-05.png`_

### 3.5 Front (`/test-testimonials-0516`)
- HTTP **200 OK**, tytuł „TEST-TESTIMONIALS-0516", **0 błędów i 0 ostrzeżeń konsoli**.
- Strona zawiera **jeden** opublikowany widget testimonials w wariancie **slider-static** (3 karty).
- **A11y / semantyka (poprawne):**
  - `<section>` z `aria-label="Trusted by teams that ship fast"` (oraz `aria-labelledby` na nagłówek gdy tytuł niepusty),
  - `<nav aria-label="Testimonials navigation">` z 3 kropkami, każda jako `<a>` z `href="#…-testimonial-N"` (scoped instance id),
  - 3 × `<article aria-label="Testimonial N: <Autor>">`,
  - lista slider-static ma `tabindex=0` i `aria-describedby` wskazujące na hint przewijania,
  - tryb cytatu wszystkich kart: `plain` (brak skonfigurowanego HTML).
- **Nawigacja kropkami działa:** klik kropki #2 ustawia `location.hash` na anchor `…-testimonial-2`. ✅
- **Overflow:** strona **nie** overflowuje poziomo ani przy 1280, ani przy 375 (`documentElement.scrollWidth == clientWidth`). Lista slider-static przewija się **wewnętrznie** (scrollWidth 1649 > clientWidth 928) — to **zamierzony** poziomy scroll (`data-overflow-intentional=true` + hint). ✅
- Awatary: brak skonfigurowanych → fallback inicjałów (np. „A").

_Zrzuty (lokalne): `testimonials-public-desktop-28-05.png`, `testimonials-public-mobile-375-28-05.png`_

---

## 4. Co NIE działa / problemy

- **Nie znaleziono błędów funkcjonalnych** w przetestowanym zakresie. Każda kontrolka,
  którą kliknąłem w Visual, realnie zmieniała render i przetrwała zapis draftu; Wizard
  i Advanced zachowują się dokładnie tak, jak deklaruje kontrakt (odpowiednio: setup-only
  oraz read-only diagnostics). Front renderuje się bez błędów konsoli i bez poziomego
  overflow strony.

> Uczciwe zastrzeżenie: „brak błędów" dotyczy **przetestowanego** zakresu z sekcji 2.
> Obszary z sekcji 6 nie były klikane i nie mogę ich potwierdzić ani zaprzeczyć na
> podstawie tej sesji. Punkty z sekcji 5 to niuanse UX/UI, nie defekty funkcjonalne.

---

## 5. Uwagi UX/UI i dostępności (niuanse, nie błędy funkcjonalne)

1. **Zmiana wariantu resetuje liczbę pozycji do domyślnej wariantu.** Ustawiłem `count=5`,
   a po przełączeniu na Slider Static liczba wróciła do **3** (domyślna dla slider-static).
   Logika `buildVariantSyncedTestimonialsValue` celowo synchronizuje liczbę przy zmianie
   wariantu — ale dla użytkownika, który wcześniej dobrał liczbę pozycji, przełączenie
   wariantu może niespodziewanie „uciąć"/zmienić listę. Brak ostrzeżenia o tym efekcie.
2. **„Set spotlight" zmienia kolejność render, ale nie kolejność w edytorze.** Po ustawieniu
   spotlightu na pozycję 2, render przenosi tę pozycję na początek (i podświetla), natomiast
   lista kart w edytorze zachowuje pierwotną kolejność (Testimonial 1 = Anna, Testimonial 2
   = Marek). Render ≠ kolejność edytora może lekko dezorientować.
3. **Kontrolka „Slider navigation" jest aktywna także poza slider-static.** Poza wariantem
   slider-static pojawia się tekst pomocniczy „This option only affects the slider-static
   variant.", ale sam Select nie jest wyszarzony — można zmieniać wartość, która nie ma
   wtedy efektu w renderze (`navigationEnabled` wymaga slider-static + dots + >1 pozycji).
4. **Swatch koloru pokazuje fallback hex dla tokenów motywu.** Pola koloru (`showValueInput=false`)
   prezentują swatch z `pickerFallback` (Accent `#1d4ed8`, Card border `#e2e8f0`, Text `#0f172a`,
   Section/Card bg `#ffffff`). Dla wartości domyślnych będących tokenami motywu swatch pokazuje
   stały hex fallback, a nie sygnał „token motywu" — ta sama rodzina niuansu „token-jako-kolor-własny"
   co w raportach Divider/Section. (Nie testowałem dogłębnie semantyki przycisków „Clear".)
5. **„Rating zero display" dotyczy wyłącznie pozycji z `rating=0`.** Dla kart z ratingiem >0
   wszystkie trzy opcje (Hide empty / No rating label / Show empty stars) wyglądają tak samo —
   różnicę widać dopiero gdy któraś pozycja ma rating 0. Nazewnictwo jest jasne, ale efekt
   bywa „niewidoczny" w typowych danych.
6. **Blok fixture ma page-buildera „Device visibility: Hidden on all devices".** Advanced pokazuje
   wiersz „Shown on: Hidden on all devices" — to ustawienie page-buildera bloku (nie część edytora
   widgetu). Nie weryfikowałem jego wpływu na opublikowaną trasę (front to osobna, opublikowana
   strona — patrz 6).
7. **Radix Select vs natywny `select`.** Wszystkie comboboxy (count, spacing, navigation, rating
   display, gradient/tone/align/size/radius/border, CTA target/style, pagination) to komponenty
   Radix — w teście wymagają kliknięcia triggera i opcji; programowa komenda `select` na nich nie
   działa. To niuans harnessu, **nie** błąd widgetu.
8. **Natywny swatch koloru jest tu sterowalny.** W tej sesji udało się ustawić `Accent color`
   przez `fill` na swatchu (`#ff0000`) i propagacja do renderu zadziałała (gwiazdki + source label).
   To różni się od doświadczenia z raportu Divider (tam swatch był nieobsługiwalny headless) — tutaj
   zmianę koloru potwierdziłem realnie.
9. **`beforeunload` przy wyjściu z admina.** Po zapisaniu draftu i nawigacji na front pojawił się
   natywny dialog „beforeunload" — mimo zapisanego draftu edytor nadal ostrzega o opuszczeniu strony.
   Drobny niuans, nie defekt.

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Pozostałe pola koloru i ich „Clear":** Card background, Card border, Text color oraz przyciski
  Clear / Section background — testowałem realnie tylko Accent color.
- **Pozostałe comboboxy stylu:** Background gradient (Soft/Warm/Cool), Title size (Small/Large),
  Card border width (Heavy) — z tej grupy kliknąłem reprezentatywnie Card radius, Header alignment
  i Background tone.
- **Media pickery:** Background image (sekcja Surface) oraz Avatar per karta (MediaPicker /
  „Browse media") — nie wybierałem żadnego assetu z biblioteki mediów.
- **Treść per karta poza ratingiem:** Quote (textarea), Formatted quote (rich-text
  `PostRichTextAdapter`), Author, Role, Source label — nie edytowałem tych pól bezpośrednio
  (kolejność/ratingi tak, treść tekstowa nie).
- **Move up / Move down** reordering kart — testowałem wyłącznie „Set spotlight".
- **Add testimonial / Remove testimonial** + `ConfirmActionDialog` (oraz guardy min 2 / max 24).
- **CTA destination** (`LinkDestinationField`) i **CTA target** (same-tab/new-tab) — testowałem
  tylko enable/label/style.
- **Load more button label** (input) i `Visible before load more` w innych wartościach.
- **Notice'y kontrastu** (`ColorContrastNotice`) przy kolorach.
- **Walidacja niebezpiecznych URL** (avatar/background/CTA href — `isValid…`/`normalize…`).
- **Publikacja (Publish)** — wykonałem wyłącznie „Save draft", więc moje zmiany **nie trafiły na front**.
- **Round-trip moich edycji na trasę publiczną** — `/test-testimonials-0516` to **inna, opublikowana
  strona** niż edytowany fixture admin: front pokazuje treść **opublikowaną** (domyślne kopie
  angielskie, slider-static, dots, accent `#1d4ed8`, spacing md), a **nie** mój niezopublikowany draft.
  Front zweryfikowałem więc pod kątem **poprawności renderu** widgetu (slider-static), a nie
  odzwierciedlenia moich konkretnych edycji.
- **Wpływ „Device visibility: Hidden on all devices"** bloku fixture na froncie (ustawienie
  page-buildera) — nie weryfikowałem.

---

## 7. Admin Preview vs Frontend — porównanie

| Aspekt | Admin (canvas, mój draft) | Frontend (opublikowana strona) | Uwaga |
|---|---|---|---|
| Wariant | slider-static (po edycji) | slider-static | zbieżne, ale front to osobna publikacja |
| Treść nagłówka | „Zaufały nam zespoły AUDYT-0528" | „Trusted by teams that ship fast" | front = treść opublikowana, nie mój draft |
| Accent | `rgb(255,0,0)` (mój draft) | `rgb(29,78,216)` = `#1d4ed8` | front = domyślny token |
| Spacing / radius / align / tone | sm / none / left / contrast | md / lg / center / plain | front = stan opublikowany |
| Render mechanizm | ten sam komponent `TestimonialsBlock` | ten sam komponent | brak rozbieżności renderera |
| A11y (section/nav/article/list) | — | poprawne (sekcja 3.5) | — |

**Wniosek:** Admin i front używają tego samego renderera; rozbieżność wartości wynika wyłącznie
z tego, że testowałem **draft** w adminie, a front serwuje **opublikowaną** wersję osobnej strony.
Nie stwierdziłem rozjazdu na poziomie komponentu renderującego.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only podsumowanie (styl + liczba) + przejście do Visual | ✅ Działa zgodnie z kontraktem (0 pól edycji) |
| **Visual** | Główny edytor (7 sekcji edytowalnych) | ✅ Wszystkie testowane kontrolki działają, aktualizują podgląd i są trwałe po zapisie |
| **Advanced** | 3 sekcje diagnostyczne read-only | ✅ 0 kontrolek edytowalnych; podsumowania wiernie odzwierciedlają stan |
| **Front** | `/test-testimonials-0516` (opublikowany, 1 widget slider-static) | ✅ HTTP 200, 0 błędów konsoli, poprawne a11y, brak overflow strony (1280/375) |

**Werdykt końcowy:** W przetestowanym zakresie widget `testimonials` jest sprawny i spójny między
edytorem a rendererem. Nie wykryto błędów funkcjonalnych. Wizard i Advanced realizują zadeklarowany
kontrakt (setup-only / read-only diagnostics), a Visual poprawnie obsługuje szeroką konfigurację
(wariant + synchronizacja liczby pozycji, spotlight, header copy, spacing, nawigacja slidera,
wyświetlanie ratingu, rating per karta, radius/align/tone, CTA, paginacja load-more, kolor akcentu)
z live-podglądem i trwałym zapisem draftu. Najważniejsze niuanse UX (sekcja 5): reset liczby pozycji
przy zmianie wariantu, render ≠ kolejność edytora przy spotlight, aktywny Select „Slider navigation"
poza slider-static oraz swatch pokazujący fallback hex dla tokenów. Obszary niezweryfikowane wymieniono
jawnie w sekcji 6.

---

## 9. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `testimonials-admin-wizard-28-05.png` | Admin, tryb Wizard — read-only „Section copy" |
| `testimonials-admin-visual-28-05.png` | Admin, tryb Visual po edycjach (stan zapisany draftem, po reloadzie) |
| `testimonials-admin-advanced-28-05.png` | Admin, tryb Advanced — diagnostyka read-only |
| `testimonials-public-desktop-28-05.png` | Front `/test-testimonials-0516`, 1280px (slider-static, brak overflow strony) |
| `testimonials-public-mobile-375-28-05.png` | Front `/test-testimonials-0516`, 375px (brak overflow strony) |
