# RAPORT: Hero Widget — audyt wyczerpujący (domknięcie luk) — Wizard / Visual / Advanced + Front

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z katalogu 28-05-2026 — przebieg „gap-close", świadomie domykający rodziny kontrolek, które poprzednio nie były w pełni przeklikane)
> **Sesja przeglądarki:** `claude-29-05-hero-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin (302→login) · http://localhost:3000
> **Fixture admin:** page id `1216108b-7cc2-4ed9-956e-afa97351aca5` (breadcrumb „Contract Test - hero")
> **Route public:** `http://localhost:3000/homepage` (tytuł „HomePage")
> **Pliki źródłowe:** `core/widgets/core/hero.tsx` (model + renderer + normalizacja + kontrakt), `core/widgets/core/clearableStyle.ts` (`resolveClearableStyleValue`), `core/admin/ui/widgets/editors/HeroEditors.tsx` (edytory Wizard/Visual/Advanced + `HeroColorField`/`GradientField`/`HeroOverlayField`/`HeroMediaSourceFields`), `core/admin/ui/widgets/editors/LinkDestinationField.tsx`, `core/admin/ui/widgets/editors/ClearableFields.tsx`, `core/admin/ui/media/MediaPicker.tsx`.

> **Czym różni się ten przebieg.** Cel zadania: domknąć rodziny kontrolek, które wcześniej nie
> zostały w pełni klikalnie zweryfikowane — **rozmiar przycisku secondary, content width, height,
> bleed, hide media on mobile, media radius/border, pozostałe rozmiary i wagi tekstu, destynacje
> badge/primary/secondary, wszystkie Clear/„Use transparent" kolorów, overlay media + jego siła,
> gradient start/end, picker media i picker tła**. Każda opcja była **realnie klikana** w UI i
> weryfikowana w **wyrenderowanym Hero** w canvasie admina. Przy okazji domknięcia ujawniono
> **nowy, niezgłoszony wcześniej defekt** overlaya tła z jawnym obrazem (§4.3).

> **Metodyka.** Zdarzenia UI przez Playwright (`run-code`): kliknięcia triggerów Radix `Select`
> (`role=combobox`) i opcji (`role=option`), przełączniki `role=switch`, kliki kart wariantu i
> przycisków (`Clear`, `Use transparent`, palety, „Browse media", „Done"), oraz — dla natywnych
> `input[type=color]`/`input[type=range]`, których nie da się obsłużyć systemowym dialogiem OS —
> programowe ustawienie wartości natywnym setterem `value` + `input`/`change` (ścieżka tożsama z
> realną zmianą z punktu widzenia React). Efekt czytany z faktycznego renderu:
> `div.relative.w-full.overflow-hidden.border.px-6` (klasy Tailwind, inline-style, `data-widget-part`,
> `data-hero-*-overlay`, struktura `h1`/`p`/`a`, ramka media). Kontrolki identyfikowane przez
> `data-widget-control` / `data-widget-control-ownership`.

> **Uwaga o zrzutach.** Zrzuty PNG poniżej to **wyłącznie lokalne etykiety** przechwyceń Playwright.
> Cały wzorzec `*.png` jest ignorowany przez Git (reguła `*.png` w `.gitignore`, potwierdzone
> `git check-ignore`), więc **nie stanowią evidence w repo**. Lista w §12.

> **Zastrzeżenie o stanie fixture.** Audyt zostawił „Contract Test - hero" jako **wersję roboczą**
> (Save draft, NIE Publish) z licznymi edycjami audytowymi (m.in. realnie przypięty obraz inline i
> obraz tła z Media Library, badge włączony, paleta zmieniana). Trasa `/homepage` to **inna,
> opublikowana strona** — patrz §9. Save draft był wykonany świadomie wyłącznie po to, by
> potwierdzić defekt trwałości „Single CTA" (§4.1).

> **Remediation status (TASK-343-01, 2026-05-30).** Trzy defekty funkcjonalne z §4 są zamknięte w
> kodzie: zapisany brak `secondaryCta` jest zachowywany dla niepustych zapisanych bloków Hero, zmiana
> siły overlaya zachowuje kolor z RGBA, a overlay jawnego obrazu tła renderuje się jako poprawna
> warstwa `linear-gradient(color, color)` nad gradientem i `url(...)`. Pokrycie regresji:
> `bun test tests/unit/widgets/validator.test.ts`,
> `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`,
> `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`.

---

## 1. Przegląd widgetu

**Typ:** `hero` · **Kategoria:** layout · **Opis:** „Top-of-page hero section with CTA."
**Warianty:** `centered`, `split` (etykieta „Media Right"), `media-left`, `media-center` — wybierane
**kartami** (nie comboboxem), `editorCapabilities.visualOwnsVariantSelection: true`.
**Sloty:** `content` („Hero Content").

**Tryby edytora (`heroEditorContract`, version 2):**
- **Wizard** — 3 sekcje `setup` (Goal seed + 2 read-only podsumowania, `writablePaths: []`).
- **Visual** — 11 sekcji edytowalnych (Variant/Presets, Badge+headline, CTA, Rich copy+social proof,
  Media, Layout+spacing, Typography, Appearance, Colors+Borders, Background) — w tym przebiegu
  naliczono **53 kontrolki widgetu** `data-widget-control` (+ kontrolki page-buildera poza zakresem).
- **Advanced** — 6 sekcji `diagnostics`/`summary`, wszystkie read-only (§8).

---

## 2. Co zostało przetestowane W TYM przebiegu (realne kliknięcia + inspekcja renderu)

| Rodzina kontrolek | Opcje realnie przeklikane | Pokrycie |
|---|---|---|
| **Secondary button size** | None, sm, md, lg (przy renderującym się secondary CTA) | ✅ 4/4 |
| **Content width** | None, sm, md, lg, xl (w wariancie media-center) | ✅ 5/5 |
| **Max width** | None, sm, md, lg, xl, 2xl | ✅ 6/6 |
| **Height** | auto, large, screen | ✅ 3/3 |
| **Bleed** | Contained, Full bleed | ✅ 2/2 |
| **Hide media on mobile** (switch) | on → off | ✅ 2/2 |
| **Media border width** | 0, 1, 2, 3 | ✅ 4/4 |
| **Media radius** | None, lg, xl, 2xl, 3xl | ✅ 5/5 |
| **Headline size** | None, 2xl, 3xl, 4xl, 5xl | ✅ 5/5 |
| **Subhead size** | None, base, lg, xl, 2xl | ✅ 5/5 |
| **Body size** | None, sm, base, lg, xl (po wpisaniu treści body) | ✅ 5/5 |
| **Headline weight / Body weight** | normal, medium, semibold, bold | ✅ 4/4 + 4/4 |
| **Primary destination** (picker) | 50 opcji; wybór strony → href; „Clear destination" | ✅ |
| **Secondary destination** (picker) | 51 opcji (z „Saved custom destination"); wybór → href | ✅ |
| **Badge destination** (picker) | 50 opcji; wybór → `<a>`; „Clear destination" → `<span>` | ✅ |
| **Badge: enable / label / tone / placement** | switch + wpis + 4 tone + 2 placement | ✅ |
| **Kolory — set + Clear** (11 pól) | text, subhead, body, card border, primary bg/text/border, secondary bg/text/border, media border | ✅ 11/11 |
| **„Use transparent"** | primaryButtonBorder, secondaryButtonBg, background.color | ✅ 3/3 |
| **Gradient** | start, end, kąt (slider), Clear | ✅ |
| **Media type** / **Background media type** | No media, Image, Video | ✅ 3/3 + 3/3 |
| **Media picker** (MediaPicker) | „Browse media" → Media Library (5 obrazów) → wybór → inline `<img>` | ✅ |
| **Background media picker** | wybór → `background-image: url(...)`, `cover` | ✅ |
| **Media ratio** | 16:9, 4:3, 1:1, 3:4 | ✅ 4/4 |
| **Media overlay** (kolor + siła) | set koloru + zmiana siły (slider) + Clear | ✅ (defekt §4.2) |
| **Background media overlay** | set koloru + Clear (model przyjmuje) | ✅ (defekt §4.3) |
| **Card / Media / Button shadow** | None, soft, medium, strong | ✅ 4/4 ×3 |
| **Font family** | Inherit, sans, serif, mono | ✅ 4/4 |
| **Motion** | None, Fade in, Slide up | ✅ 3/3 |
| **Card border width / radius** | 0–3 · None/lg/xl/2xl/3xl | ✅ 4/4 + 5/5 |
| **Padding top / bottom** | none, xs, sm, md, lg, xl, 2xl | ✅ 7/7 ×2 |
| **Alignment** | left, center, right | ✅ 3/3 |
| **CTA layout** | Single CTA, Dual CTA | ✅ 2/2 (defekt trwałości §4.1) |
| **Palety** | Light, Dark, Brand | ✅ 3/3 |
| **Contrast guidance** | stan „warning" / czytelny / „unknown" | ✅ 3/3 |
| **Warianty (karty)** | Media Right (split), Media Center | ⚠️ 2/4 klikane w tym przebiegu |
| **Advanced** | 49 wierszy read-only + baner read-only | ✅ |
| **Front** | render + overflow 1280/375 + konsola | ✅ |

> Pełne, kompletne pokrycie **wszystkich** opcji każdej z rodzin wymienionych jako luki zadania.
> Wariant: w tym przebiegu fizycznie kliknięto karty **Media Right** i **Media Center**
> (Media Left/Centered nie były klikane w tej sesji — patrz §6).

---

## 3. Co DZIAŁA (potwierdzone realnymi kliknięciami i renderem)

### 3.1 Layout / spacing — wszystkie opcje
- **Max width:** None→(brak), sm→`max-w-3xl`, md→`max-w-4xl`, lg→`max-w-5xl`, xl→`max-w-6xl`, 2xl→`max-w-7xl`.
- **Content width** (poza split): None→(brak), sm→`max-w-sm`, md→`max-w-md`, lg→`max-w-lg`, xl→`max-w-xl`.
- **Height:** auto→(brak), large→`min-h-[80vh]`, screen→`min-h-screen`.
- **Bleed:** Contained→bez nadpisań; Full bleed→`width:100vw` + `margin-left/right: calc(50% - 50vw)`.
- **Padding top/bottom:** none/xs/sm/md/lg/xl/2xl → 0/0.5/1/1.5/2/3/4 rem (oba pełne 7/7).
- **Hide media on mobile:** on → wrapper media dostaje `hidden md:block`; off → usunięte.
- **Alignment:** left→`text-left`, center→`text-center`, right→`text-right` (w split tylko text-align — patrz §5).

### 3.2 Typography / Appearance — wszystkie opcje
- Headline size 5/5 (`text-2xl…5xl`, None→brak), Subhead 5/5 (`text-base…2xl`), Body 5/5 (`text-sm…xl`).
- Headline/Body weight 4/4: `font-normal/medium/semibold/bold`.
- Card/Media/Button shadow 4/4/4: none→brak, soft→`shadow-sm`, medium→`shadow-md`, strong→`shadow-xl`.
- Font family: Inherit→brak, sans/serif/mono→`font-sans/serif/mono`.
- Motion: None→brak; Fade in→`motion-safe:fade-in-0`; Slide up→`+ motion-safe:slide-in-from-bottom-2`.

### 3.3 Colors / Borders — wszystkie 11 pól + Clear + 3× transparent
- **Set custom (rgb) + Clear** zweryfikowane dla 11 pól, każde mapuje na właściwy element:
  - textColor→`h1` `color`; subheadColor→subhead `<p>`; bodyColor→body `<p>`; borderColor→root `border-color`;
  - primaryButtonBg/Text/Border→styl primary CTA; secondaryButtonBg/Text/Border→styl secondary CTA;
  - mediaBorderColor→ramka media `border-color`.
  - **Clear** w każdym przypadku przywraca wartość domyślną (`var(--color-text)` / `var(--color-border)` itd.).
- **„Use transparent"** (tylko 3 pola): `primaryButtonBorder`→`border-color: transparent` (i `border-width:0px`),
  `secondaryButtonBg`→`background: transparent`, `background.color`→`background-color: transparent`; po Clear pole
  jest usuwane z modelu (brak `background-color` w stylu po wyczyszczeniu tła).
- **Niuans modelu (potwierdzony):** ustawienie `primaryButtonBorder` na realny kolor przełącza
  `border-width` przycisku z `0px` na `1px` (zgodnie z rendererem).
- **Card border width** 0/1/2/3 → 0/1/2/3 px; **Card radius** None→brak, lg/xl/2xl/3xl → `rounded-*`;
  **Media border width / Media radius** identycznie (w wariantach z media).

### 3.4 Gradient (Background)
- Start `#ff0000` → `linear-gradient(135deg, rgb(255,0,0), rgb(71,85,105))` (end domyślny);
  End `#0000ff` → `…, rgb(0,0,255))`; suwak kąta 45 → `linear-gradient(45deg, …)`; **Clear** → brak.
- Gradient bez obrazu renderuje się jako `background-image` roota.

### 3.5 Destynacje (badge / primary / secondary) — pickery i Clear
- **Primary:** 50 opcji („No primary destination" + 49 opublikowanych stron). Wybór „Pricing Review Temp"
  → `href=/pricing-review-temp`. „Clear destination" usuwa href → ponieważ CTA wymaga **label + href**,
  **cały przycisk primary znika** z renderu (zachowanie modelu).
- **Secondary:** 51 opcji (dodatkowa pozycja „Saved custom destination" dla bieżącego `#`). Wybór
  „Testimonials Review 0527" → `href=/testimonials-review-0527`.
- **Badge:** 50 opcji („No badge destination" + 49 stron). Wybór „HomePage" → badge zmienia się ze `<span>`
  w `<a href="/homepage">`; „Clear destination" przywraca `<span>`.

### 3.6 Badge — enable / tone / placement
- „Show badge" odsłania pola; tone ×4 daje rozłączne klasy: neutral `border-border/80 bg-background/80`,
  primary `bg-[var(--color-primary)]/15`, success `bg-emerald-500/15`, warning `bg-amber-500/15`.
- placement: „Above headline" → badge przed `<h1>` (`badgeInH1=false`); „Inline headline" → badge **wewnątrz** `<h1>` (`badgeInH1=true`).

### 3.7 CTA — rozmiary obu przycisków
- **Secondary button size** (domknięta luka): None→brak klas rozmiaru, sm→`px-3 py-1.5 text-xs`,
  md→`px-4 py-2 text-sm`, lg→`px-5 py-2.5 text-base` — zweryfikowane **przy realnie renderującym się
  secondary CTA** (label + href ustawione). Primary analogicznie.
- CTA layout: Single → w canvasie tylko primary; Dual → pola secondary wracają (puste, patrz §5.2 i §4.1).

### 3.8 Media + Background media — pickery realnie sięgalne
- **Media picker** (`MediaPicker`): przycisk „Browse media" otwiera dialog „Media library" z **5 obrazami**;
  wybór assetu + „Done" → inline `<img src="http://localhost:3000/media/2026/02/…png">` w ramce media,
  placeholder „Add media URL" znika.
- **Background media picker:** wybór assetu → root `background-image: url("…png")` + `background-size: cover`.
- **Media ratio** ×4: 16:9→`aspect-video`, 4:3→`aspect-[4/3]`, 1:1→`aspect-square`, 3:4→`aspect-[3/4]`.

### 3.9 Palety i contrast guidance
- **Light:** bg `#ffffff`, headline `#111827`, primary bg `#2563eb`. **Dark:** bg `#0f172a`, headline `#f8fafc`,
  primary `#38bdf8`. **Brand:** bg `#eff6ff`, headline `#1e3a8a`, primary `#1d4ed8` — wszystkie zgodne z presetami.
- **Contrast guidance** (3 stany): tło solidne + niski kontrast (`#f2f2f2` na bieli) →
  **„Configured colors may be hard to read together."**; para czytelna (`#111111` na bieli) → notyfikacja znika;
  tło niesolidne (media/gradient/transparent) → **„Contrast depends on inherited theme or transparent colors."**
  (stan „unknown" — zgodny z `resolveHeroSolidBackgroundForContrast`, który zeruje się przy `background.media ≠ none`).

---

## 4. Defekty funkcjonalne z audytu i status remediacji

### 4.1 „Single CTA" nie utrzymuje się po zapisie (potwierdzony w tym przebiegu)
- Ustawienie **CTA layout → Single CTA** poprawnie usuwa secondary z canvasu (w canvasie zostaje tylko primary „Jedyne CTA").
- **Bezpośrednio po „Save draft" (bez reloadu)** w canvasie pojawia się ponownie drugie CTA **„Learn more" → `#`**.
- **Po reloadzie** stan jest taki sam: dwa CTA (`Jedyne CTA` /homepage + `Learn more` `#`).
- Mechanizm: round-trip zapisu re-merguje `heroDefaults.secondaryCta = { label: "Learn more", href: "#" }`.
  **Z perspektywy użytkownika nie da się trwale zapisać Hero z jednym CTA.** Realny błąd trwałości.
- **Status TASK-343-01:** naprawione. `createHeroWidget` oznacza `secondaryCta` jako absent-default key,
  a `normalizeWidgetBlock` zachowuje jego brak dla zapisanych niepustych danych. Regresja w
  `tests/vitest/widgets/hero.test.tsx` potwierdza, że zapisany Hero z jednym CTA nie odzyskuje
  domyślnego „Learn more".

### 4.2 Overlay media: zmiana „siły" kasuje wybrany kolor na czarny (potwierdzony na żywo)
- Media overlay: kolor `#ff0000` → `rgba(255, 0, 0, 0.2)` (domyślna siła 20%).
- **Zmiana suwaka „Overlay strength" na 70% → `rgba(0, 0, 0, 0.7)`** — czerwień zniknęła (reset do czerni).
- Ponowne ustawienie koloru `#ff0000` → `rgba(255, 0, 0, 0.7)` (kolor wraca, przy nowej sile).
- Przyczyna: overlay przechowywany jako `rgba(...)` z alfą; `resolveColorPickerValue` zwraca fallback
  `#000000` dla wartości z alfą („nie round-trip-uje przez `input[type=color]`"), więc `HeroOverlayField`
  przy zmianie siły odbudowuje kolor z czerni. Skutek UX: **nie da się wyregulować przezroczystości
  kolorowego overlaya bez utraty koloru** — kolor trzeba ustawiać jako ostatni krok. Dotyczy też overlaya tła.
- **Status TASK-343-01:** naprawione. `HeroOverlayField` odczytuje RGB z zapisanego `rgba(...)` dla
  wartości color inputa, więc zmiana siły zachowuje hue. Regresja w
  `tests/vitest/ui/hero-editor-wave.test.tsx` potwierdza przejście `rgba(255, 0, 0, 0.20)` →
  `rgba(255, 0, 0, 0.70)`.

### 4.3 [NOWE] Background media overlay z jawnym obrazem (warianty inne niż centered) — nie renderuje się i potrafi wykasować obraz
- Scenariusz: wariant `split` (lub media-left/media-center), `background.media.type = image` z przypiętym
  obrazem, następnie ustawienie **„Background media overlay"** na kolor (np. `#0000ff`).
- **Model przyjmuje wartość** (przycisk „Clear" overlaya jest aktywny → `hasClearableFieldValue` = true),
  ale **w renderze nie pojawia się żaden overlay**: `background-image` roota pozostaje samym `url("…png")`,
  i **nie ma** osobnego `[data-hero-background-overlay]` (taki div renderuje się tylko dla
  centered+image albo wideo tła).
- Przyczyna (renderer `hero.tsx`): dla jawnego obrazu tła overlay jest **doklejany do `background-image`**
  jako warstwa: `[overlay, gradient, url(...)].join(", ")`. Surowy `rgba(...)` **nie jest poprawnym
  `<image>`**, więc cała deklaracja `background-image` jest nieprawidłowa.
- **Dowód CSS (izolowany element)**: ustawienie `background-image: rgba(0,0,255,0.25), url("…")` w jednym
  kroku (świeży mount) → `getComputedStyle` zwraca **`none`** (znika cały obraz). Ustawienie tej samej
  wartości po wcześniejszym poprawnym `url(...)` (żywy edytor) → przeglądarka **ignoruje** błędną zmianę i
  zostawia poprzedni `url(...)` (dlatego w edytorze obraz zostaje, ale overlay nie działa).
- **Skutek:** overlay tła z jawnym obrazem jest funkcjonalnie martwy w wariantach innych niż centered;
  co gorsza, **przy świeżym renderze** (publiczna strona po zapisaniu / po reloadzie) ta sama
  konfiguracja daje `background-image: none` — **znika również obraz tła**. (Overlay inline media — §4.2 —
  to osobna, działająca ścieżka renderowana jako `<div>` z `rgba`, gdzie `rgba` jest poprawne.)
- **Status TASK-343-01:** naprawione. Renderer opakowuje overlay w warstwę
  `linear-gradient(color, color)` przed gradientem i `url(...)`, dzięki czemu deklaracja
  `background-image` pozostaje poprawna. Regresja w `tests/vitest/widgets/hero.test.tsx`
  potwierdza obecność `url(/hero-bg.jpg)` i brak surowego `background-image: rgba(...)`.

---

## 5. Niuanse UX/UI i dostępności

1. **Korzeń Hero to zwykły `<div>` bez landmarku** (`role` = null, tag `DIV`) — w adminie i na froncie.
   Brak `role`/`aria-label`/`<section>`; strukturę daje tylko `<h1>`.
2. **Single → Dual CTA gubi treść secondary.** Przełączenie na Single ustawia `secondaryCta: undefined`
   (treść secondary przepada); powrót na Dual daje **puste** pola secondary (`{label:"", href:""}`) → secondary
   nie renderuje się, dopóki użytkownik nie wpisze ponownie label + destynacji. (Zachowanie zgodne z kodem, ale myli.)
3. **Badge / social-proof włączone, lecz puste, nie renderują nic** (`normalizeHeroBadge` / `normalizeHeroSocialProof` → `undefined`).
4. **Overlay swatch dla wartości z alfą** był czarny w oryginalnym audycie. TASK-343-01 naprawia
   `HeroOverlayField`, aby pokazywał hue z zapisanego RGBA; szersze zachowanie zwykłych pól koloru
   pozostaje własnością shared color-state tasków.
5. **Alignment ignorowane w media-center** (`effectiveAlign` wymusza `center`); w `split` z kolei klasy
   pozycjonowania (`mr-auto`/`mx-auto`/`ml-auto`) nie są dodawane — działa tylko `text-*`.
6. **Media-center duplikuje klasy** kolumny treści: `space-y-4 text-center max-w-xl mx-auto mx-auto text-center`
   (podwójne `mx-auto` i `text-center`) — kosmetyczne, bez wpływu wizualnego.
7. **Etykiety Radix `Select` ≠ wartości modelu**: kapitalizowane są `none→None`, `inherit→Inherit`,
   `contained/full-bleed→Contained/Full bleed`, `fade-in/slide-up→Fade in/Slide up`. (Uwaga operacyjna: klik
   opcji wymaga etykiety, nie wartości — pomyłka „none" zamiast „None" zostawia otwarty dropdown blokujący kolejne kliknięcia.)
8. **Dialog `MediaPicker` emituje ostrzeżenie a11y** w konsoli admina: *„Missing `Description` or
   `aria-describedby={undefined}` for {DialogContent}"* — **jedyne** ostrzeżenie konsoli (0 błędów).
   **Status TASK-343-31 (2026-05-30):** zamknięte w shared `MediaPicker`.
   Dialog `Media library` ma teraz `DialogDescription` podłączone przez Radix
   `aria-describedby`, a regresja otwiera shared picker z dwóch pól widgetowych
   bez ostrzeżenia `Missing Description`.
9. **Dwa przyciski „Dark" w adminie** (globalny przełącznik motywu + paleta Hero). Paletę trzeba kierować
   do grupy „Hero palettes", inaczej `.first()` trafia w motyw admina.
10. **Wyczyszczenie destynacji CTA usuwa cały przycisk** (CTA wymaga label + href jednocześnie).

---

## 6. Czego NIE dało się w pełni zweryfikować (i dlaczego)

- **Inline wideo (`media.type = video`) — render niemożliwy do potwierdzenia.** Media Library z filtrem
  `video/*` zwraca **„No media assets found."** (0 zasobów wideo), a edytor **nie ma pola na ręczny URL**
  (autoring tylko przez `MediaPicker`). To samo dotyczy **wideo tła** oraz **postera wideo** (poster
  renderuje się dopiero na elemencie `<video>`). Konkretne nie-do-zweryfikowania: `hero.media.assetId`
  (typ Video), `hero.background.media.assetId` (typ Video), `hero.media.posterAssetId`.
- **Diagnostyka sanitizera rich-text („Formatting adjusted").** Pojawia się tylko przy wklejeniu
  niedozwolonego HTML (`<img>`/`<script>`/nieobsługiwane tagi/atrybuty); przez zwykłe wpisywanie i toolbar
  nie da się jej wywołać w headless. Kontrolki `hero.richHeadline` / `hero.richBody` są obecne i edytowalne.
- **Natywny systemowy dialog `input[type=color]`.** Nie da się obsłużyć w headless. Ścieżkę zapisu kolorów
  zweryfikowano programowym setterem `value` + zdarzeniami `input`/`change`, paletami, „Use transparent" i
  „Clear" — wszystkie odbiły się w renderze. `HeroColorField` **nie ma** pola tekstowego na hex (brak
  ścieżki wpisania wartości brzegowych/nie-hex).
- **Karty wariantu Media Left / Centered.** W tym przebiegu klikano karty **Media Right** i **Media Center**;
  pozostałych dwóch wariantów nie klikano w tej sesji (logika layoutu spójna z modelem i poprzednim przebiegiem).
- **Publish / round-trip na front.** Wykonano wyłącznie „Save draft"; edycje audytu **nie trafiły** na trasę
  publiczną. Front zweryfikowano pod kątem renderu opublikowanego Hero, nie round-tripu edycji.

---

## 7. Persistencja (Save draft → reload)

- „Save draft" zapisuje wersję roboczą; większość pól przeżywa zapis (z poprzedniego i bieżącego przebiegu
  potwierdzono trwałość wariantu, headline, typografii, tła, ramek, full-bleed, height itd.).
- Oryginalnie potwierdzony wyjątek trwałości CTA layout **Single → po zapisie wraca Dual** z secondary
  „Learn more" → `#` (§4.1) został zamknięty w TASK-343-01 przez zachowanie braku `secondaryCta`
  podczas normalizacji zapisanych danych.

---

## 8. Tryb Advanced — read-only

- Baner **„Advanced mode is read-only…"** obecny. **49 wierszy `readonly`**, **0 interaktywnych kontrolek
  widgetu** w panelu Advanced. Jedyny interaktywny element w `main` to wyszukiwarka page-buildera
  („Find components…") — **nie** jest kontrolką widgetu (`closest('[data-widget-control]') = null`).

---

## 9. Front (`http://localhost:3000/homepage`)

- HTTP **200 OK**, **0 błędów i 0 ostrzeżeń konsoli**.
- **Osobna, opublikowana strona** (NIE edytowany fixture). Jeden widget Hero:
  - `<h1>` „Twój wymarzony dom zaczyna się tutaj" (semantyczny, tag `H1`),
  - badge `<span data-widget-part="hero.badge">` „Premium Architecture" (bez `href` → nieklikalny),
  - 2 CTA: „View Projects" → `/signup`, „Free Consulatation" → `/examples`.
- **Brak poziomego overflow:** 1280px (`scrollWidth==clientWidth==1280`) i 375px (`==375`).
- Korzeń Hero to `<div>` bez `role` (§5.1). Literówka „Free Consulatation" to **content opublikowanej strony**, nie błąd widgetu.
- _Zrzuty (etykiety lokalne):_ `hero-front-desktop-29-05-gap.png`, `hero-front-mobile-375-29-05-gap.png`.

---

## 10. Podsumowanie

| Obszar | Wynik |
|---|---|
| **Domknięte luki** (secondary size, content width, height, bleed, hide-media, media border/radius, text sizes/weights, destynacje, kolory Clear/transparent, overlay+siła, gradient, pickery media/tła) | ✅ Wszystkie opcje realnie przeklikane i potwierdzone w renderze |
| **Visual — pozostałe rodziny** (warianty, badge, CTA, typografia, cienie, fonty/motion, palety, ratio, padding, alignment, contrast) | ✅ Działają i aktualizują render |
| **Defekty funkcjonalne** | ✅ 3/3 zamknięte w TASK-343-01: Single CTA persystuje (§4.1) · overlay zachowuje kolor przy zmianie siły (§4.2) · background-media-overlay z obrazem renderuje valid layered CSS (§4.3) |
| **Nie-do-zweryfikowania** | wideo inline/tła/poster (brak assetów video + brak pola URL), diagnostyka sanitizera (wymaga wklejenia HTML), systemowy dialog koloru, karty Media Left/Centered (nieklikane w tej sesji) |
| **Advanced** | ✅ 49 read-only, 0 interaktywnych kontrolek widgetu |
| **Front `/homepage`** | ✅ HTTP 200, 0 błędów konsoli, brak overflow (1280/375), render semantyczny `<h1>` |

**Werdykt.** W zakresie **wszystkich rodzin wymienionych jako luki** widget `hero` jest spójny między
edytorem a rendererem — każda dyskretna opcja (rozmiary, szerokości, wysokości, bleed, ramki, typografia,
kolory z Clear/transparent, gradient, pickery media i tła, ratio, destynacje) działa i poprawnie aktualizuje
canvas. **Trzy realne defekty z audytu zostały zamknięte w TASK-343-01:** (1) „Single CTA" utrzymuje się
po zapisie dzięki zachowaniu braku `secondaryCta`, (2) zmiana siły overlaya zachowuje wybrany kolor, oraz
(3) overlay tła z jawnym obrazem w wariantach innych niż centered renderuje poprawną warstwę CSS zamiast
kasować `background-image`. Najważniejsze pozostałe niuanse a11y/UX: brak
landmarku na korzeniu Hero oraz mylące czyszczenie secondary CTA przy Single→Dual.

---

## 11. Środowisko i powtarzalność

- Sesja izolowana: `claude-29-05-hero-gap-close`. Admin: 302→login (zalogowano podanym kontem); 0 błędów
  konsoli (historycznie 1 ostrzeżenie a11y `DialogContent`, zamknięte przez
  `TASK-343-31`; 1 info React DevTools).
- Wszystkie zmiany wykonane realnymi zdarzeniami UI; wartości natywnych `color`/`range` ustawiane setterem
  + `input`/`change` (równoważne realnej interakcji dla React), bo systemowych dialogów OS nie da się
  obsłużyć w headless.

---

## 12. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `hero-front-desktop-29-05-gap.png` | Front `/homepage`, 1280px (Hero „Twój wymarzony dom…", brak overflow) |
| `hero-front-mobile-375-29-05-gap.png` | Front `/homepage`, 375px (brak overflow) |

> Pliki PNG są ignorowane przez Git (reguła `*.png`) i stanowią wyłącznie lokalne etykiety przechwyceń —
> nie są wymaganym evidence w repo.
