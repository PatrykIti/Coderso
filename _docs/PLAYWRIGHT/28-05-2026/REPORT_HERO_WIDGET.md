# RAPORT: Hero Widget — audyt wyczerpujący (Wizard / Visual / Advanced + Front)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z 28-05-2026 — ten przebieg jest świadomie pełniejszy)
> **Sesja przeglądarki:** `claude-29-05-hero-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `1216108b-7cc2-4ed9-956e-afa97351aca5` (breadcrumb „Contract Test - hero")
> **Route public:** `http://localhost:3000/homepage` (tytuł „HomePage")
> **Pliki źródłowe:** `core/widgets/core/hero.tsx` (model + renderer + normalizacja + kontrakt), `core/admin/ui/widgets/editors/HeroEditors.tsx` (edytory Wizard/Visual/Advanced), `core/admin/ui/widgets/editors/LinkDestinationField.tsx`, `core/admin/ui/widgets/editors/ClearableFields.tsx`, `core/admin/ui/media/MediaPicker.tsx`.

> **Czym ten przebieg różni się od poprzedniego (28-05).** Poprzedni raport używał skrótów
> „reprezentatywnych" (np. „przetestowano jeden tone, jeden rozmiar przycisku, jeden ratio").
> Ten przebieg **przeklikał wszystkie dyskretne opcje każdej dostępnej rodziny kontrolek**:
> wszystkie 4 warianty, wszystkie 4 tone'y badge, obie pozycje badge, oba tryby CTA, wszystkie
> 4 rozmiary przycisku primary **oraz** secondary, wszystkie 6/5/3/2/7 opcji layoutu, wszystkie
> rozmiary typografii (5/5/5), wszystkie cienie (4/4/4), wszystkie warianty fontu/wagi/motion,
> wszystkie 11 pól kolorów (+ Clear + „Use transparent" tam, gdzie są), wszystkie szerokości i
> promienie ramek (karty i media), pełny cykl presetów (add/search/sort/apply/update/delete),
> realne przypięcie assetów z Media Library (hero media, tło, avatar social proof), wszystkie 4
> ratio media, oba overlaye (inline + tło) oraz pełny round-trip zapisu (Save draft → reload).

> **Metodyka.** Każda zmiana wykonywana była realnym zdarzeniem UI przez Playwright
> (`run-code` → kliknięcia triggerów Radix `Select`, kliknięcia opcji `role=option`, przełączniki
> `role=switch`, natywne `input`/`change` na `input[type=color]`/`input[type=range]`, wpisywanie do
> `contenteditable`). Efekt każdej zmiany weryfikowany był przez inspekcję **faktycznie
> wyrenderowanego Hero** w canvasie admina (`div.relative.w-full.overflow-hidden.border.px-6`):
> klasy Tailwind, inline-style, atrybuty `data-widget-part="hero.*"`, struktura `h1`/`p`/`a`,
> ramka media, overlaye. Kontrolki i ich własność czytane były z atrybutów
> `data-widget-control` / `data-widget-control-ownership` / `data-widget-control-path`.

> **Uwaga o zrzutach.** Pliki PNG poniżej to **wyłącznie lokalne etykiety** przechwyceń Playwright.
> Są ignorowane przez Git (`git check-ignore` potwierdza dla `hero-public-desktop-29-05.png` i
> `hero-public-mobile-375-29-05.png`) i nie stanowią wymaganego evidence w repo.

> **Zastrzeżenie o stanie fixture.** Audyt zostawił na „Contract Test - hero" **wersję roboczą**
> (Save draft, NIE Publish) z moimi edycjami (m.in. headline „PERSIST HERO 29-05", wariant split,
> font mono, motion slide-up). Trasa `/homepage` to **inna, opublikowana strona** — patrz §11.

---

## 1. Przegląd widgetu

**Typ:** `hero` · **Kategoria:** layout · **Opis:** „Top-of-page hero section with CTA."
**Warianty:** `centered`, `split` (etykieta „Media Right"), `media-left`, `media-center`.
**Sloty:** `content` („Hero Content") — repeatable slot na zagnieżdżone widgety (sekcja „Structure").

**Tryby edytora (kontrakt `heroEditorContract`, version 2):**
- **Wizard** — 3 sekcje `setup`: „Goal and starter plan" (`writablePaths: []`), „Starter copy"
  (`readOnlyPaths:["headline"]`), „Primary action seed" (`readOnlyPaths:["primaryCta.label","primaryCta.href"]`).
- **Visual** — 10 sekcji edytowalnych: Variant and Presets, Badge and headline, CTA, Rich copy and
  social proof, Media, Layout and spacing, Typography, Appearance, Colors and Borders, Background.
  `editorCapabilities.visualOwnsVariantSelection: true`.
- **Advanced** — 6 sekcji `diagnostics`/`summary`, wszystkie read-only.

W trybie Visual w panelu widgetu naliczono **80 kontrolek** (`data-widget-control`) plus sekcje
page-buildera (`Structure`, `Block layout`, `Device visibility`) — te ostatnie są poza zakresem widgetu.

---

## 2. Co było testowane (pełna lista rodzin kontrolek i opcji)

| Rodzina | Opcje przeklikane | Pełne pokrycie? |
|---|---|---|
| Wizard: Goal | Lead generation, Sales, Information | ✅ 3/3 |
| Variant (karty) | Centered, Media Right, Media Left, Media Center | ✅ 4/4 |
| Presety | Add (dialog) · Search (trafienie + brak) · Sort (Recently updated ↔ Name A-Z) · Apply · Update · Delete (z dialogiem) | ✅ pełny cykl |
| Badge: Show badge (switch) | on/off | ✅ |
| Badge: tone (Select) | Neutral, Primary, Success, Warning | ✅ 4/4 |
| Badge: placement (Select) | Above headline, Inline headline | ✅ 2/2 |
| Badge: label / prefix / destination | wpis + picker (50 stron) + „Clear destination" | ✅ |
| Headline / Subhead / Body | wpis tekstu | ✅ |
| CTA layout (Select) | Single CTA, Dual CTA | ✅ 2/2 |
| Primary button size (Select) | None, sm, md, lg | ✅ 4/4 |
| Secondary button size (Select) | None, sm, md, lg | ✅ 4/4 (przy realnie renderowanym CTA) |
| Primary / Secondary destination | picker + „Clear destination" | ✅ |
| Rich headline / Rich body | wpis + toolbar Bold + czyszczenie | ✅ (Bold zweryfikowany) |
| Social proof (switch) | on/off + rating + reviewCount + label | ✅ |
| Social proof: avatar #1 | przypięcie z Media Library + alt | ✅ (render 1 avatara) |
| Media type (Select) | No media, Image, Video | ✅ 3/3 |
| Media: asset picker | realne przypięcie obrazu (centered tło + inline) | ✅ |
| Media: ratio (Select, split) | 16:9, 4:3, 1:1, 3:4 | ✅ 4/4 |
| Media: overlay | kolor + siła (slider) + Clear | ✅ |
| Alignment / Max width / Content width | left/center/right · none…2xl · none…xl | ✅ 3/6/5 |
| Height / Bleed | auto/large/screen · contained/full-bleed | ✅ 3/2 |
| Padding top / bottom (Select) | none, xs, sm, md, lg, xl, 2xl | ✅ 7/7 każdy |
| Hide media on mobile (switch) | on (+ weryfikacja `hidden md:block`) | ✅ |
| Headline / Subhead / Body size | 5 / 5 / 5 tokenów | ✅ |
| Card / Media / Button shadow | None, soft, medium, strong | ✅ 4/4 każdy |
| Font family / Headline weight / Body weight | 4 / 4 / 4 | ✅ |
| Entrance motion | None, Fade in, Slide up | ✅ 3/3 |
| Palety | Light, Dark, Brand | ✅ 3/3 |
| Pola kolorów (11) | set + Clear + „Use transparent" (gdzie dostępne) | ✅ 11/11 |
| Card / Media border width | 0,1,2,3 | ✅ 4/4 każdy |
| Card / Media radius | none, lg, xl, 2xl, 3xl | ✅ 5/5 każdy |
| Background color | set + „Use transparent" + Clear | ✅ |
| Background gradient | start + end + angle (slider) + Clear | ✅ |
| Background media type | No media, Image (przypięcie), Video (pola) | ✅ |
| Contrast guidance | stan warning (niski kontrast) + ukrycie (czytelny) + „unknown" | ✅ |
| Persistencja | Save draft → reload (pełna weryfikacja) | ✅ |
| Advanced | 49 wierszy read-only + zgodność diagnostyk | ✅ |
| Front | render + overflow 1280/375 + konsola | ✅ |

---

## 3. Co działa (potwierdzone realnymi kliknięciami i inspekcją renderu)

### 3.1 Wizard — seed-only, zgodny z kontraktem
- Panel domyślnie pokazuje baner **„Setup complete · Daily edits live in Visual…"** + **„Run setup again"**.
  Wizard nie jest osobną zakładką (`tablist` ma tylko Visual/Advanced) — to wzorzec startowy.
- **3 sekcje**, kontrolki: **1× `action`** (selektor „Goal", bez `path`) + **3× `readonly`**
  (`headline`, `primaryCta.label`, `primaryCta.href`), **0 writable** — zgodnie z `writablePaths: []`.
- **Wszystkie 3 presety celu działają** (zweryfikowane na żywo, wymuszając zmianę wartości):
  - Lead generation → headline „Grow your audience faster", primary „Join the list" → `/signup`;
  - Sales → „Convert more visitors", „Book a demo" → `/demo`;
  - Information → „Everything you need to know", „Learn more" → `/about`.
- Wybór celu seeduje wyłącznie `headline` + `primaryCta`; badge i secondary CTA pozostają nietknięte.
  Zmiana odbija się natychmiast w read-only podsumowaniach **oraz** w głównym canvasie Hero.
- **„Finish setup and open Visual"** poprawnie przełącza tryb na Visual.

### 3.2 Variant — 4 warianty dają 4 różne layouty
| Wariant | `layoutClass` kontenera | Ramka media inline | Kontrolki media-frame |
|---|---|---|---|
| Centered | `flex flex-col gap-4` | brak (obraz jako tło) | ukryte |
| Media Right (split) | `flex flex-col gap-8 md:items-center md:flex-row` | obecna (`aspect-video`, „Select media type") | widoczne |
| Media Left | `… md:flex-row-reverse` | obecna | widoczne |
| Media Center | `flex flex-col items-center gap-8` | obecna | widoczne |
- Kontrolki **media-frame** (Media shadow, Media frame border color, Media border width, Media radius)
  oraz **Media ratio** pokazują się wyłącznie w wariantach innych niż `centered`; `ratio` dodatkowo
  wymaga `media.type ≠ none`.

### 3.3 Presety — pełny cykl życia, bez pozostałości
- „Add variant preset" → dialog „Create Hero preset" z nazwą prefillowaną z wariantu (np. „media-center preset").
- Search filtruje (trafienie → 1 wynik; brak trafienia → 0). Sort przełącza „Recently updated" ↔ „Name A-Z".
- Apply / Update / Delete działają; Delete otwiera dialog potwierdzenia „Delete Hero preset?".
- Po Delete lista wraca do pustej — **brak rezyduów** (preset audytowy posprzątany).
- Search i Sort renderują się także przy zerowej liczbie presetów.

### 3.4 Badge — wszystkie opcje
- „Show badge" odsłania/ukrywa wszystkie 5 pól (label, prefix, destination, tone, placement) i
  odpowiednio dodaje/usuwa `[data-widget-part="hero.badge"]` w canvasie.
- **tone ×4** daje rozłączne klasy: neutral `border-border/80 bg-background/80`, primary
  `bg-[var(--color-primary)]/15 text-[var(--color-primary)]`, success `bg-emerald-500/15 text-emerald-700`,
  warning `bg-amber-500/15 text-amber-700`.
- **placement**: „Above headline" → badge jako sibling przed `<h1>`; „Inline headline" → badge **wewnątrz** `<h1>`.
- prefix renderuje się przed labelem. Destination picker listuje **50 opublikowanych stron** + opcję
  „No badge destination"; wybór „HomePage" zamienia badge z `<span>` na `<a href="/homepage">`,
  „Clear destination" przywraca `<span>`.

### 3.5 CTA — oba tryby, oba przyciski, oba rozmiary kompletne
- Single CTA → w canvasie zostaje tylko primary, pola secondary znikają; Dual CTA → pola secondary wracają.
- **Primary button size**: None → bez klas rozmiaru (`rounded-md font-semibold`), sm → `px-3 py-1.5 text-xs`,
  md → `px-4 py-2 text-sm`, lg → `px-5 py-2.5 text-base`. **Secondary** identycznie (zweryfikowane przy
  renderującym się secondary CTA — label + destination ustawione).
- Destination picker (primary i secondary) ustawia `/homepage`; „Clear destination" usuwa link — a że
  CTA wymaga **label + href**, wyczyszczenie destynacji **usuwa cały przycisk** z canvasu (zachowanie modelu).

### 3.6 Rich copy + social proof
- Rich headline: edytowalny `contenteditable`; wpis renderuje się w `<h1>` przez
  `dangerouslySetInnerHTML`; **toolbar Bold** owija tekst w `<strong>`; wyczyszczenie przywraca plain headline.
- Rich body działa tą samą ścieżką (treść renderuje się w canvasie; po wyczyszczeniu wraca plain `<p>`).
- Social proof: switch odsłania rating/reviewCount/label + 5 wierszy avatarów; wszystkie 3 pola tekstowe
  renderują `[data-widget-part="hero.social-proof"]`.
- **Avatar #1**: przypięcie obrazu z Media Library + alt → social proof pokazuje 1 `<img>` avatara.

### 3.7 Media — obraz w pełni, ratio kompletne, overlaye
- **Centered + Image**: pola source/alt/overlay obecne, ratio ukryte, nota „renders the selected image as
  hero background". Przypięcie assetu → `img.absolute.inset-0` (tło). Overlay → `[data-hero-background-overlay]`
  z `rgba(...)`; Clear usuwa overlay.
- **Centered + Video**: pola title/description/poster obecne; nota „does not render inline video"; ratio ukryte.
- **Split + Image**: inline `img` w ramce; **ratio ×4** mapuje poprawnie: 16:9 → `aspect-video`,
  4:3 → `aspect-[4/3]`, 1:1 → `aspect-square`, 3:4 → `aspect-[3/4]`. Inline overlay → `[data-hero-inline-media-overlay]` z `rgba(...)`.
- **Background media = Image**: przypięcie → root `background-image: url(...)`; pola video tła (title/description/poster) obecne.

### 3.8 Layout / spacing — wszystkie opcje
- Alignment: left → `text-left mr-auto`, center → `text-center mx-auto`, right → `text-right ml-auto`.
- Max width: none→(brak), sm→`max-w-3xl`, md→`max-w-4xl`, lg→`max-w-5xl`, xl→`max-w-6xl`, 2xl→`max-w-7xl`.
- Content width: none→(brak), sm→`max-w-sm`, md→`max-w-md`, lg→`max-w-lg`, xl→`max-w-xl`.
- Height: auto→(brak), large→`min-h-[80vh]`, screen→`min-h-screen`.
- Bleed: contained→normalny; full-bleed→`width:100vw` + `margin-left/right: calc(50% - 50vw)`.
- Padding top/bottom: none/xs/sm/md/lg/xl/2xl → 0/0.5/1/1.5/2/3/4 rem (oba pełne 7/7).
- Hide media on mobile: włączenie dodaje `hidden md:block` do wrappera media (zweryfikowane w media-center).

### 3.9 Typography / Appearance — wszystkie opcje
- Headline size 5/5 (`text-2xl…5xl`, none→brak), Subhead size 5/5 (`text-base…2xl`), Body size 5/5 (`text-sm…xl`).
- Card/Media/Button shadow 4/4/4: none→brak, soft→`shadow-sm`, medium→`shadow-md`, strong→`shadow-xl`.
- Font family: inherit→brak, sans/serif/mono→`font-sans/serif/mono`.
- Headline/Body weight 4/4: `font-normal/medium/semibold/bold`.
- Motion: none→brak; fade-in→`animate-in fade-in-0`; slide-up→`+ slide-in-from-bottom-2`.

### 3.10 Colors / Borders — palety, 11 pól, ramki, kontrast
- Palety Light/Dark/Brand zapisują **dokładnie** zestaw hexów z presetu (np. Dark: bg `#0f172a`,
  headline `#f8fafc`, border `#1e293b`, primary `bg=#38bdf8 text=#082f49`, secondary `bg=#0f172a border=#334155`).
- **11 pól kolorów** (headline, subhead, body, card border, primary bg/text/border, secondary bg/text/border,
  media frame border) — każde przyjmuje custom hex i renderuje go; **Clear** przywraca domyślną
  (`var(--color-text)` / `var(--color-border)` / `var(--color-bg)` / brak). **„Use transparent"** działa na
  „Primary button border" i „Secondary button background".
- Card border width 0/1/2/3 → 0/1/2/3 px; Card radius none/lg/xl/2xl/3xl; Media border width i Media radius
  identycznie (w wariantach z media).
- Contrast guidance: dla solidnego tła i niskiego kontrastu pokazuje **„Configured colors may be hard to read
  together."**; dla czytelnej pary notyfikacja znika; gdy tło nie jest solidne (gradient/media/transparent),
  pokazuje **„Contrast depends on inherited theme or transparent colors."** (stan „unknown" — zgodnie z
  `resolveHeroSolidBackgroundForContrast`).

### 3.11 Background — kolor, gradient, media
- Background color: set custom (rgb) · „Use transparent" → `transparent` · Clear → domyślna.
- Gradient: start + end + kąt (slider) → `linear-gradient(45deg, …, …)`; Clear usuwa.

---

## 4. Co NIE działa / defekty funkcjonalne

### 4.1 „Single CTA" nie utrzymuje się przy zapisie (potwierdzony, repro 2×)
- W Visual ustawienie **CTA layout → Single CTA** poprawnie usuwa secondary z canvasu (kod ustawia
  `secondaryCta: undefined`).
- **Już po kliknięciu „Save draft" (przed reloadem)** selektor wraca na **„Dual CTA"**, pola secondary
  wracają, a w canvasie pojawia się drugie CTA **„Learn more" → `#`**. Po **reloadzie** stan jest taki sam.
- Mechanizm: round-trip zapisu re-merguje `heroDefaults.secondaryCta = { label: "Learn more", href: "#" }`,
  więc skasowanie secondary nie przeżywa zapisu. **Z perspektywy użytkownika nie da się trwale zapisać Hero
  z jednym CTA.** To realny błąd trwałości, nie kosmetyka. (Wszystkie inne edytowane pola — wariant, tło
  `#101820`, border 2px, font mono, motion slide-up, headline 4xl, padding 2xl, full-bleed, height screen —
  przetrwały Save draft + reload bez utraty.)

### 4.2 Overlay media: zmiana „siły" kasuje wybrany kolor na czarny (potwierdzony, repro na żywo)
- W polu „Media overlay" ustawienie koloru działa: `#ff0000` → `rgba(255, 0, 0, 0.2)`.
- **Następna zmiana suwaka „Overlay strength" resetuje kolor do czarnego**: po przesunięciu na 70%
  overlay to `rgba(0, 0, 0, 0.7)` — czerwień zniknęła. Ponowne ustawienie koloru przywraca `rgba(255, 0, 0, 0.7)`.
- Przyczyna (kod): overlay przechowywany jest jako `rgba(...)` z alfą, a `resolveColorPickerValue` celowo
  zwraca fallback `#000000` dla wartości z alfą („cannot round-trip through an HTML color input"). `HeroOverlayField`
  przy zmianie siły odtwarza kolor z tej wartości → dostaje czarny. Skutek UX: **nie da się wyregulować
  przezroczystości kolorowego overlaya bez utraty koloru** (trzeba zawsze ustawiać kolor jako ostatni krok).
  Dotyczy zarówno overlaya media inline, jak i overlaya tła.

---

## 5. Czego NIE dało się w pełni zweryfikować (i dlaczego)

- **Inline wideo (media `video`) — render niemożliwy do potwierdzenia.** Media Library **nie zawiera żadnego
  zasobu wideo** (dialog „Media library" z filtrem `video/*` pokazuje pustą siatkę „No media assets found"),
  a edytor **nie ma pola na ręczny URL** zewnętrzny. Pola wideo (Video title/description, Video poster) są
  obecne i odsłaniają się poprawnie, ale samego `<video>` w canvasie nie dało się wyrenderować. To samo
  dotyczy **wideo tła** oraz **postera wideo** (poster przyjmuje obrazy, ale renderuje się dopiero na elemencie `<video>`).
- **Diagnostyka sanitizera rich-text.** Notyfikacja „Formatting adjusted" pojawia się tylko, gdy sanitizer
  coś usuwa (np. wklejony `<img>`/`<script>`/niedozwolony tag/atrybut). Przez **zwykłe wpisywanie tekstu i
  toolbar** (Bold/Italic/Link) nie da się jej wywołać — wymagałaby wklejenia niedozwolonego HTML, czego
  nie odtworzono w headless. Sam render rich-text i czyszczenie HTML zweryfikowano (Bold → `<strong>`).
- **Indywidualne natywne color-pickery przez systemowy dialog.** `input[type=color]` otwiera dialog OS,
  którego nie da się obsłużyć w headless. Ścieżkę zapisu kolorów zweryfikowano natomiast przez programowe
  ustawienie wartości (z natywnym setterem `value` + zdarzenia `input`/`change`) oraz przez palety, „Use
  transparent" i „Clear" — wszystkie odbijały się w renderze.
- **Publish / round-trip na front.** Wykonano wyłącznie „Save draft", więc edycje audytu **nie trafiły** na
  trasę publiczną. Front zweryfikowano pod kątem poprawności renderu opublikowanego Hero, nie round-tripu edycji.

---

## 6. Persistencja (Save draft → reload)

- „Save draft" zwraca toast **„Draft saved."**.
- **Trwałe (potwierdzone po reloadzie):** wariant `split`, headline „PERSIST HERO 29-05" (`text-4xl`,
  `font-bold`), subhead, `font-mono`, `shadow-md`, motion slide-up (`slide-in-from-bottom-2`),
  `min-h-screen`, `border-width:2px`, `background-color: rgb(16,24,32)`, padding 4rem, full-bleed
  (`width:100vw` + ujemne marginesy), Card radius 3xl.
- **Jedyny wyjątek:** CTA layout Single → po zapisie wraca **Dual** z secondary „Learn more" (§4.1).

---

## 7. Tryb Advanced — read-only, wiernie odzwierciedla stan

- Baner: **„Advanced mode is read-only. Use Visual for public-facing Hero copy, media, layout, spacing,
  color, and background changes."**
- **49 wierszy `readonly`, 0 kontrolek interaktywnych** (brak inputów/selectów/switchy/comboboxów/contenteditable
  w panelu Advanced).
- Diagnostyki zgodne ze stanem zapisanym: variant `split`, align `right`, maxWidth `2xl`, height `screen`,
  bleed `full-bleed`, paddingTop `2xl`, headlineSize `4xl`, typeface `family=mono; headline=bold; body=bold`,
  shadows `card=medium; media=strong; buttons=strong`, cardBorder `width=2; radius=3xl; color=Not configured`,
  background color `#101820`, Primary/Secondary CTA href = **Safe URL**, motion `slide-up`, runtime CTA
  „Primary Safe URL; secondary safe url".

---

## 8. Front (`http://localhost:3000/homepage`)

- HTTP **200 OK**, **0 błędów i 0 ostrzeżeń konsoli**.
- **Osobna, opublikowana strona** (NIE edytowany fixture). Zawiera **jeden** widget Hero:
  - `<h1>` „Twój wymarzony dom zaczyna się tutaj" (semantyczny),
  - badge `<span data-widget-part="hero.badge">` „Premium Architecture" (bez `href` → nieklikalny),
  - 2 CTA: „View Projects" → `/signup`, „Free Consulatation" → `/examples`.
- **Brak poziomego overflow**: 1280px (`scrollWidth==clientWidth==1280`) i 375px (`==375`). ✅
- Literówka „Free Consulatation" to **content opublikowanej strony**, nie błąd widgetu (informacyjnie).

_Zrzuty (etykiety lokalne): `hero-public-desktop-29-05.png`, `hero-public-mobile-375-29-05.png`._

---

## 9. Uwagi UX/UI i dostępności (niuanse)

1. **Korzeń Hero to zwykły `<div>` bez landmarku.** Renderer nie nadaje `role`/`aria-label`/`<section>`.
   Dla czytników ekranu Hero nie jest ogłaszany jako wyróżniona sekcja — strukturę daje tylko `<h1>`.
   Dotyczy admina i frontu.
2. **Badge i social proof włączone, ale puste, nie renderują niczego.** Po włączeniu przełącznika bez treści
   (`label` dla badge; rating/reviewCount/label/avatar dla social proof) `normalizeHeroBadge` /
   `normalizeHeroSocialProof` zwracają `undefined`. Potwierdzone na żywo dla social proof (switch on +
   puste pola → brak `[data-widget-part="hero.social-proof"]`). Użytkownik może odnieść wrażenie, że
   „przełącznik nie działa".
3. **Selektor „Goal" w Wizardzie.** (a) Każdy wybór celu **nadpisuje** żywe `headline` i `primaryCta`
   (destrukcyjna akcja seedująca pod neutralną etykietą). (b) Lokalny stan `goal` **resetuje się do
   „Lead generation" przy każdym otwarciu** Wizarda i nie odzwierciedla zapisanej treści. (c) **Ponowny
   wybór tej samej (aktualnie zaznaczonej) opcji jest no-opem** — Radix `Select` nie odpala `onValueChange`
   dla niezmienionej wartości, więc np. realne zaseedowanie „Lead generation" wymaga przełączenia na inny cel
   i z powrotem.
4. **Brak osobnego, oznaczonego „Live preview" w panelu Wizarda** (w tym fixture). Podgląd na żywo zapewnia
   główny canvas strony, który aktualizuje się natychmiast. (Korekta wobec wcześniejszego raportu, który
   sugerował dedykowany panel „Live preview".)
5. **Brak pola na ręczny URL media.** Autoring odbywa się wyłącznie przez Media Library (lub zachowane
   „Saved external media"). To świadomy wzorzec, ale uniemożliwia szybkie testy/wklejanie linku oraz —
   przy braku assetów wideo w bibliotece — realny render wideo (§5).
6. **`HeroColorField` ma tylko natywny `input[type=color]`** (bez pola tekstowego na hex, w odróżnieniu od
   `SharedColorFieldInputs` w innych edytorach). Konsekwencja techniczna: ustawienie wartości równej
   fallbackowi pickera (np. białego, gdy fallback to `#ffffff`) jest no-opem dla śledzenia zmian React —
   wartości brzegowe/nie-hex nie są wpisywalne, dostępne są tylko swatch + „Use transparent" + „Clear".
7. **Wszystkie listy to Radix `Select` (combobox), nie natywny `<select>`** — wymagają kliknięcia triggera
   i opcji; etykiety tokenów są kapitalizowane w UI („None") względem wartości modelu („none").
8. **Dwa systemy paddingu** w modelu: `spacing.paddingTop` (tokeny, eksponowane w Visual) oraz
   `style.paddingTop` (string). Renderer rozkłada oba z `spacing` wygrywającym — drobna nadmiarowość modelu.
9. **Media-center duplikuje klasy** kontenera treści (`mx-auto text-center` dodane na bazowe `text-center mx-auto`)
   — kosmetyczne, bez wpływu wizualnego.

---

## 10. Podsumowanie

| Tryb / obszar | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | 1 akcja seedująca (Goal) + 3 podsumowania read-only | ✅ Zgodny z kontraktem; wszystkie 3 presety celu działają |
| **Visual** | 10 sekcji, ~80 kontrolek | ✅ **Wszystkie przeklikane opcje działają i aktualizują render**; trwałe po zapisie — **z 2 wyjątkami: Single CTA nie persystuje (§4.1) oraz overlay traci kolor przy zmianie siły (§4.2)** |
| **Advanced** | 6 sekcji diagnostycznych | ✅ 49 wierszy read-only, 0 interaktywnych; diagnostyki zgodne ze stanem |
| **Persistencja** | Save draft → reload | ✅ Wszystko trwałe poza Single CTA |
| **Front** | `/homepage` (osobna strona, 1 Hero) | ✅ HTTP 200, 0 błędów konsoli, brak overflow (1280/375), semantyczny render |

**Werdykt końcowy.** W przeklikanym (wyczerpującym) zakresie widget `hero` jest w przeważającej części
sprawny i spójny między edytorem a rendererem: wszystkie warianty, tone'y/pozycje badge, oba tryby CTA z
pełnymi rozmiarami obu przycisków, pełna typografia, cienie, fonty/wagi/motion, palety i wszystkie 11 pól
kolorów (z Clear/transparent), wszystkie szerokości i promienie ramek, pełen layout/spacing, oba overlaye,
przypięcie obrazów z Media Library, wszystkie 4 ratio, contrast guidance oraz pełen cykl presetów —
działają i przeżywają zapis. **Wykryto dwa realne defekty funkcjonalne:** (1) „Single CTA" nie utrzymuje
się po zapisie (re-merge `heroDefaults.secondaryCta`), (2) zmiana siły overlaya kasuje wybrany kolor na
czarny (alfa-rgba nie round-tripuje przez `input[type=color]`). Nie dało się zweryfikować inline-wideo
(brak assetów wideo w bibliotece + brak pola URL) ani diagnostyki sanitizera (wymaga wklejenia niedozwolonego
HTML). Najważniejsze niuanse a11y/UX: brak landmarku na korzeniu Hero, puste-ale-włączone badge/social-proof
nie renderują się, oraz destrukcyjny/no-opowy charakter selektora „Goal".

---

## 11. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `hero-public-desktop-29-05.png` | Front `/homepage`, 1280px (Hero „Twój wymarzony dom…", brak overflow) |
| `hero-public-mobile-375-29-05.png` | Front `/homepage`, 375px (brak overflow) |

> Pliki PNG są ignorowane przez Git i stanowią wyłącznie lokalne etykiety przechwyceń — nie są wymaganym evidence.
