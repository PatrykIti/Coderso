# RAPORT: Hero Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-hero` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `1216108b-7cc2-4ed9-956e-afa97351aca5` (breadcrumb „Contract Test - hero")
> **Route public:** `http://localhost:3000/homepage` (tytuł „HomePage")
> **Pliki źródłowe:** `core/widgets/core/hero.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/HeroEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026 (`../27-05-2026/REPORT_HERO_WIDGET.md`), który był jedynie clean smoke
> (status `passed`, liczba sekcji edytora). Tutaj realnie klikałem w kontrolki i
> weryfikowałem każdą zmianę przez inspekcję faktycznie wyrenderowanego elementu Hero
> w canvasie admina (klasy Tailwind, inline-style, atrybuty `data-widget-part="hero.*"`),
> sprawdziłem trwałość po zapisie (Save draft → reload) oraz render na publicznej trasie.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Pliki PNG są ignorowane przez Git (`git check-ignore` potwierdza)
> i nie są wymaganym evidence w repo.

---

## 1. Przegląd widgetu

**Typ:** `hero` · **Kategoria:** layout
**Opis (z definicji):** „Top-of-page hero section with CTA."
**Warianty:** `centered`, `split` (etykieta „Media Right"), `media-left`, `media-center`.
**Sloty:** `content` („Hero Content") — repeatable slot na zagnieżdżone widgety.

**Model danych (skrót, `HeroData`):**

| Grupa | Pola |
|-------|------|
| Treść | `headline`, `subhead`, `body`, `richHeadline`, `richBody` |
| Badge | `badge.{enabled,label,prefix,href,tone,placement}` |
| CTA | `primaryCta.{label,href}`, `secondaryCta.{label,href}` |
| Social proof | `socialProof.{enabled,rating,reviewCount,label,avatars[≤5]}` |
| Media | `media.{type,source,assetId,src,alt,posterSrc,title,description,ratio,overlay}` |
| Layout | `layout.{align,maxWidth,contentWidth,height,bleed}` |
| Spacing | `spacing.{paddingTop,paddingBottom}` (tokeny none…2xl) |
| Style | `style.*` (rozmiary tekstu, kolory, przyciski, ramki, cienie, font, waga, motion) |
| Tło | `background.{color,gradient,image,media}` |
| Responsywność | `responsive.hideMediaOnMobile` |

**Tryby edytora wg kontraktu (`heroEditorContract`, version 2):**
- **Wizard** — 3 sekcje role `setup`: „Goal and starter plan" (`writablePaths: []`), „Starter copy" (`readOnlyPaths: ["headline"]`), „Primary action seed" (`readOnlyPaths: ["primaryCta.label","primaryCta.href"]`).
- **Visual** — 10 sekcji edytowalnych: Variant and Presets, Badge and headline, CTA, Rich copy and social proof, Media, Layout and spacing, Typography, Appearance, Colors and Borders, Background. `editorCapabilities.visualOwnsVariantSelection: true`.
- **Advanced** — 6 sekcji `diagnostics`/`summary`, wszystkie read-only: Layout summary, Style token summary, Media diagnostics, Accessibility diagnostics, Runtime summary, Contract summary.

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie poniższe interakcje wykonano w żywej aplikacji na fixture „Contract Test - hero".
Efekt każdej zmiany weryfikowałem przez inspekcję realnie wyrenderowanego Hero w canvasie
(`div.relative.w-full.overflow-hidden.border.px-6`), a trwałość przez ponowny odczyt po reloadzie.

- Logowanie do admina (już zalogowany) + otwarcie fixture page.
- **Wizard:** wejście przez „Run setup again", odczyt 3 sekcji, programowe policzenie kontrolek, zmiana selektora „Goal" → Sales (seed), powrót przez „Finish setup and open Visual".
- **Visual:** wszystkie 4 warianty; badge (toggle + label + tone Primary + placement Inline headline); headline/subhead/body; CTA layout → Single; primary button size → lg; social proof (toggle + rating + label); media type → Image → none; alignment → left; max width → 2xl; padding top → None; headline size → 5xl; card shadow → strong; font family → serif; entrance motion → Fade in; paleta „Dark"; card border width → 3; background color (text) → `#123456`; gradient angle → 90°.
- **Persistencja:** „Save draft" → toast „Draft saved." → reload → ponowna weryfikacja całego stanu (dwa przebiegi, w tym czysty repro dla CTA).
- **Advanced:** odczyt wszystkich 6 sekcji diagnostycznych, programowe potwierdzenie 0 kontrolek edytowalnych i zgodności podsumowań ze stanem zapisanym w Visual.
- **Front:** `http://localhost:3000/homepage` — inspekcja DOM Hero, status HTTP, konsola, overflow przy 1280 i 375.

> **Zastrzeżenie:** zapis „Save draft" zostawił na fixture „Contract Test - hero"
> wersję roboczą z moimi edycjami audytowymi (NIE opublikowaną). Trasa publiczna
> `/homepage` to osobna, opublikowana strona — patrz sekcja 6.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard

- W stanie domyślnym panel pokazuje baner **„Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics."** z przyciskiem **„Run setup again"**, który otwiera Wizard. Sam Wizard nie jest osobną zakładką w `tablist` (są tylko `Visual`/`Advanced`) — to celowy wzorzec startowy (identyczny jak w widgecie Divider/Section).
- Wizard zawiera **dokładnie 3 sekcje**:
  - **„Goal and starter plan"** — selektor **„Goal"** (Lead generation / Sales / Information) + tekst „Visual owns Hero layout, media position, spacing, typography…".
  - **„Starter copy"** — read-only **„Headline seed"**.
  - **„Primary action seed"** — read-only **„Primary CTA label"** i **„Primary CTA destination"**.
- Panel ma własny **„Live preview"** renderowany przez współdzielony renderer.
- **Programowo potwierdzono kontrakt:** w panelu Wizard są 4 wiersze kontrolek o `data-widget-control-ownership` = **1× `action`** (selektor Goal, bez `path`) oraz **3× `readonly`** (`headline`, `primaryCta.label`, `primaryCta.href`). **Zero kontrolek writable** — zgodnie z `writablePaths: []`.
- **Selektor „Goal" działa jako seed:** wybór **Sales** ustawił `headline` → „Convert more visitors", `primaryCta.label` → „Book a demo", `primaryCta.href` → „/demo". Zmiana odbiła się natychmiast w: read-only podsumowaniach Wizarda, „Live preview" Wizarda **oraz** w głównym canvasie Hero.
- **„Finish setup and open Visual"** poprawnie wraca do trybu Visual.
- **Werdykt:** Wizard działa zgodnie z kontraktem — to afordancja startowa (1 akcja seedująca + 3 podsumowania read-only), bez bezpośredniej edycji ścieżek.

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Sekcja | Kontrolka | Akcja testowa | Efekt w renderze (zweryfikowany) | Wynik |
|---|---|---|---|---|
| Variant | Karty wariantu | Centered | `flex flex-col gap-4`, brak inline-media, chip canvas `centered` | ✅ |
| Variant | Karty wariantu | Media Right (split) | `md:flex-row` + ramka media („Select media type") | ✅ |
| Variant | Karty wariantu | Media Left | `md:flex-row-reverse` + ramka media | ✅ |
| Variant | Karty wariantu | Media Center | `flex flex-col items-center gap-8`, chip `media-center` | ✅ |
| Badge | Show badge (switch) | Włącz | Odsłonięcie pól Badge label/prefix/destination/tone/placement | ✅ (UI warunkowe) |
| Badge | Badge label | „NOWOŚĆ" | Badge renderuje się jako `<span data-widget-part="hero.badge">` (tone neutral) | ✅ |
| Badge | Badge tone | Primary | Klasy → `border-transparent bg-[var(--color-primary)]/15 text-[var(--color-primary)]` | ✅ |
| Badge | Badge placement | Inline headline | Badge wskakuje **do** `<h1>`; h1 → `flex flex-wrap items-center gap-3` | ✅ |
| Badge i nagłówek | Headline | „HERO AUDIT 2026" | `h1` natychmiast aktualizuje tekst | ✅ |
| Badge i nagłówek | Subhead | „Audyt podglądu na żywo" | `<p>` subheadu aktualizuje tekst | ✅ |
| Badge i nagłówek | Body | „Treść body…" | `<p>` body pojawia się/aktualizuje | ✅ |
| CTA | CTA layout | Single CTA | Sekundarne CTA znika z podglądu (zostaje tylko „Book a demo") | ✅ podgląd (⚠ nie persystuje — sekcja 4) |
| CTA | Primary button size | lg | Klasa przycisku → `px-5 py-2.5 text-base` | ✅ |
| Social proof | Show social proof + Rating + Label | „4.9/5", „Zaufało nam 2000+ firm" | Render `[data-widget-part="hero.social-proof"]` z treścią | ✅ |
| Media | Media type | Image | Odsłonięcie Media source/asset/alt/ratio/overlay | ✅ (UI warunkowe) |
| Layout | Alignment | left | Kontener treści → `text-left … mr-auto` (z `text-center mx-auto`) | ✅ |
| Layout | Max width | 2xl | Wrapper → `max-w-7xl` (z `max-w-6xl`) | ✅ |
| Layout | Hero content padding top | None | Inline `padding-top: 0rem` (z `3rem`) | ✅ |
| Typography | Headline size | 5xl | `h1` → `text-5xl` | ✅ |
| Appearance | Card shadow | strong | Outer → `shadow-xl` | ✅ |
| Appearance | Font family | serif | Outer → `font-serif` | ✅ |
| Appearance | Entrance motion | Fade in | Outer → klasy `motion-safe:animate-in motion-safe:fade-in-0 …` | ✅ |
| Colors | Paleta „Dark" | Klik | bg `#0f172a`, headline `#f8fafc`, border `#1e293b`, kolory przycisków zapisane jawnie | ✅ |
| Colors | Card border width | 3 | Inline `border-width: 3px` | ✅ |
| Background | Background color (pole tekstowe) | `#123456` | Outer `background-color: rgb(18,52,86)` | ✅ |
| Background | Gradient angle (slider) | 90° | Outer `background-image: linear-gradient(90deg, …)` | ✅ |

- **Warunkowe odsłanianie pól działa:** pola Badge pojawiają się dopiero po włączeniu „Show badge"; pola Social proof po „Show social proof"; pola Media (alt/ratio/overlay) po wyborze typu Image; ramka media inline tylko dla wariantów `split`/`media-left`/`media-center` (dla `centered` obraz jest tłem, nie inline — zgodnie z copy sekcji).

### 3.3 Persistencja (Save draft → reload)

„Save draft" zwraca toast **„Draft saved."**. Po reloadzie **prawie cały** stan wrócił z bazy bez utraty:

- `variant=centered`; headline „HERO AUDIT 2026" z **inline badge** „NOWOŚĆ" w `<h1>`; subhead/body; social proof „4.9/5 / Zaufało nam 2000+ firm";
- `h1` → `text-5xl`, kolor `#f8fafc`;
- outer: `background-color:#123456` + `background-image: linear-gradient(90deg, #0f172a, #475569)`, `padding-top:0`, `padding-bottom:3rem`, `border-width:3px`, `border-color:#1e293b`, `rounded-3xl`, `shadow-xl`, `font-serif`, klasy motion fade-in;
- layout: `max-w-7xl`, alignment left, padding top none.

✅ Wszystkie powyższe pola są trwałe. **Jedyny wyjątek to CTA layout Single — patrz sekcja 4.**

_Zrzut (lokalny): brak dedykowanego zrzutu admina w tej sesji — stan zweryfikowany programowo._

### 3.4 Tryb Advanced — read-only, wiernie odzwierciedla stan

- Baner: **„Advanced mode is read-only. Use Visual for public-facing Hero copy, media, layout, spacing, color, and background changes."**
- **Programowo potwierdzono: 49 wierszy `readonly`, 0 kontrolek edytowalnych** w panelu widgetu Advanced.
- Wszystkie 6 sekcji diagnostycznych zgadzało się z zapisanym stanem:
  - **Layout summary:** variant=centered, alignment=left, maxWidth=2xl, contentWidth=lg, height=auto, bleed=contained, paddingTop=none, paddingBottom=xl, hideMediaOnMobile=Disabled.
  - **Style token summary:** headlineSize=5xl, kolory `#f8fafc`/`#e2e8f0`/`#cbd5e1`, primary button `bg=#38bdf8; text=#082f49; size=lg`, secondary `bg=#0f172a; text=#f8fafc; border=#334155; size=md`, card border `color=#1e293b; width=3; radius=3xl`, shadows `card=strong`, typeface `family=serif`.
  - **Media diagnostics:** media type none, background color `#123456`, background gradient `linear-gradient(90deg, #0f172a, #475569)`.
  - **Accessibility diagnostics:** Headline „HERO AUDIT 2026", Primary/Secondary CTA href = **Safe URL**, rich headline/body „Plain … used", motion `fade-in`.
  - **Runtime summary:** Layout Centered, CTA readiness „Primary Safe URL; secondary safe url", Media readiness „No foreground media", Rich copy „Plain copy renders".
  - **Contract summary:** poprawny podział własności Wizard/Visual/Advanced.
- **Werdykt:** Advanced realizuje zadeklarowany kontrakt diagnostyczny — zero edycji, podsumowania spójne ze stanem (łącznie z poprawnym pokazaniem hexów palety i gradientu).

_Zrzut (lokalny): brak — stan zweryfikowany programowo._

### 3.5 Front (`http://localhost:3000/homepage`)

- HTTP **200 OK**, **0 błędów i 0 ostrzeżeń konsoli**.
- To **osobna, opublikowana strona** (NIE edytowany fixture). Zawiera **jeden** widget Hero:
  - `h1` „Twój wymarzony dom zaczyna się tutaj" (`text-5xl`, semantyczny `<H1>`),
  - badge `<span data-widget-part="hero.badge">` „Premium Architecture" (bez `href` — wariant nieklikalny),
  - 2 CTA jako `<a>`: „View Projects" → `/signup`, „Free Consulatation" → `/examples`,
  - tło `transparent`, `border-width:0px`, `rounded-3xl`.
- **Brak poziomego overflow** przy 1280px (`scrollWidth==clientWidth==1280`) i 375px (`==375`). ✅

_Zrzuty (lokalne): `hero-public-desktop-28-05.png`, `hero-public-mobile-375-28-05.png`._

---

## 4. Co NIE działa / problemy

### 4.1 Defekt funkcjonalny — „Single CTA" nie persystuje (potwierdzony, repro ×2)

- W Visual zmiana **CTA layout → Single CTA** poprawnie usuwa sekundarne CTA z **podglądu** (w canvasie zostaje tylko przycisk primary). Kod ustawia `secondaryCta: undefined`.
- **Jednak po „Save draft" + reload sekundarne CTA wraca** („Learn more"), a selektor „CTA layout" ponownie pokazuje **„Dual CTA"**. Powtórzone w czystym, izolowanym przebiegu (sama zmiana na Single → zapis → reload).
- Najbardziej prawdopodobny mechanizm: `heroDefaults.secondaryCta = { label: "Learn more", href: "#" }` jest re-mergowane przy wczytaniu widgetu, więc skasowanie sekundarnego CTA (ustawienie `undefined`) nie utrzymuje się — z perspektywy użytkownika **nie da się trwale zapisać Hero z jednym CTA**.
- Skutek dla użytkownika: usunięcie drugiego CTA wygląda na udane (podgląd), ale „odżywa" po przeładowaniu/edycji ponownej. To realny błąd UX trwałości, nie tylko niuans.

> Honest scope: to **jedyny** defekt funkcjonalny wykryty w przetestowanym zakresie.
> Wszystkie pozostałe kliknięte kontrolki Visual realnie zmieniały render i przetrwały
> zapis; Wizard i Advanced zachowują się dokładnie tak, jak deklaruje kontrakt
> (odpowiednio: setup/seed-only oraz read-only).

### 4.2 Brak regresji smoke

- Brak regresji względem smoke-reportu z 27-05 (status `passed`). Renderer, ładowanie edytora i trasa publiczna działają.

---

## 5. Uwagi UX/UI i dostępności (niuanse, nie zawsze defekty)

1. **Toggle „Show badge" / „Show social proof" nie daje natychmiastowego efektu wizualnego.** Po włączeniu przełącznika nic się nie renderuje, dopóki nie wpiszesz treści (badge wymaga niepustego `label`; social proof wymaga `rating`/`reviewCount`/`label`/avatara — `normalizeHeroBadge`/`normalizeHeroSocialProof` zwracają `undefined` dla pustej zawartości). Użytkownik może odnieść wrażenie, że przełącznik „nie działa".
2. **Selektor „Goal" w Wizardzie nadpisuje żywą treść także po „Setup complete".** Każdy wybór celu nadpisuje `headline` i `primaryCta` (subhead/body zostają nietknięte). Stan `goal` jest lokalny i **resetuje się do „Lead generation"** przy każdym otwarciu Wizarda — nie odzwierciedla zapisanego celu ani aktualnego nagłówka. Ponowny wybór tego samego celu ponownie nadpisuje treść presetem. To destrukcyjna akcja seedująca pod neutralną etykietą „Goal".
3. **Korzeń Hero to zwykły `<div>` bez landmarku.** Renderer nie nadaje kontenerowi `role`/`aria-label` (ani `<section>`/`role="region"`/`banner`). Dla czytników ekranu Hero nie jest ogłaszany jako wyróżniona sekcja — strukturę daje jedynie `<h1>`. Dotyczy zarówno admina, jak i frontu. (Ta sama rodzina uwagi co R1 w raporcie Contact.)
4. **Brak pola tekstowego na zewnętrzny URL media.** W sekcji Media (po wyborze Image/Video) dostępny jest tylko picker Media Library oraz ścieżka „Saved external media" (zachowanie istniejącego zewnętrznego `src`). Nie ma inputu na wpisanie URL ręcznie — to świadomy wzorzec (autoring przez bibliotekę), ale ogranicza szybkie testy/wklejanie linku.
5. **Indywidualne color-pickery to natywny `input[type=color]`.** Otwierają systemowy dialog, którego nie da się obsłużyć w headless. Ścieżkę zapisu kolorów zweryfikowałem przez paletę „Dark" (zapisuje jawne hexy) oraz **edytowalne pole tekstowe „Background color"** (`#123456` → render). To niuans harnessu, nie defekt.
6. **Wszystkie listy wyboru to Radix `Select` (combobox), nie natywny `<select>`.** W teście wymagają kliknięcia triggera i opcji; etykiety tokenów są kapitalizowane w UI („None") względem wartości modelu („none"). Niuans harnessu.
7. **Dwa równoległe systemy paddingu.** Model ma `spacing.paddingTop` (tokeny) oraz `style.paddingTop` (string). Renderer rozkłada oba z `spacing` wygrywającym; edytor Visual eksponuje wariant tokenowy. Drobna nadmiarowość modelu, bez widocznego problemu w UI.
8. **Treść publiczna:** literówka „Free Consulatation" na `/homepage` to **content opublikowanej strony**, nie błąd widgetu — odnotowane wyłącznie informacyjnie.

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Załączanie zasobów z Media Library** (dialog `MediaPicker`) dla obrazu/wideo Hero, **poster wideo**, **avatary social proof**, **media tła** (image/video) — testowałem tylko zmianę typu media i odsłonięcie pól, nie realne przypięcie assetu.
- **Edytory rich-text** „Styled headline" / „Styled body" — nie wpisywałem treści sformatowanej; nie wywołałem diagnostyki sanitizera.
- **Zapis/zastosowanie/aktualizacja/usuwanie presetów** („Add variant preset" + dialog) — niedotknięte.
- **Pojedyncze kontrolki, których nie kliknąłem reprezentatywnie:** Secondary button size, Content width, Height (large/screen), Bleed (full-bleed), Hide media on mobile, Media radius/border, Subhead size, Body size, Headline/Body weight, Badge prefix/href, pełna ścieżka `LinkDestinationField` (Primary/Secondary CTA destination — wybór strony i „Clear destination"), Subhead/Body color picker, Media overlay/strength, gradient start/end (kolory natywne).
- **Indywidualne color-pickery przez systemowy dialog** — użyłem palety i pól tekstowych zamiast otwierania natywnego dialogu.
- **Publikacja (Publish)** — wykonałem wyłącznie „Save draft", więc moje edycje nie trafiły na front. **Trasa `/homepage` to inna, opublikowana strona** niż edytowany fixture (jeden Hero o zupełnie innej treści), więc front zweryfikowałem pod kątem **poprawności renderu Hero**, a nie round-tripu moich edycji.
- **Wpływ ustawień page-buildera** (Block layout / Device visibility) na froncie — poza zakresem edytora widgetu.

---

## 7. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | „Run setup again" → 1 akcja seedująca (Goal) + 3 podsumowania read-only + Live preview | ✅ Działa zgodnie z kontraktem (0 kontrolek writable; Goal seeduje headline+primaryCta) |
| **Visual** | Główny edytor, 10 sekcji | ✅ Wszystkie testowane kontrolki działają i aktualizują podgląd; trwałe po zapisie — **z jednym wyjątkiem: Single CTA nie persystuje** |
| **Advanced** | 6 sekcji diagnostycznych read-only | ✅ 49 wierszy readonly, 0 kontrolek edytowalnych; podsumowania wiernie odzwierciedlają stan |
| **Front** | `/homepage` (osobna, opublikowana strona, 1 Hero) | ✅ HTTP 200, 0 błędów konsoli, brak overflow (1280/375), poprawny render (h1, badge, 2 CTA-linki) |

**Werdykt końcowy:** W przetestowanym zakresie widget `hero` jest w przeważającej części
sprawny i spójny między edytorem a rendererem. Visual poprawnie obsługuje warianty, badge
(z inline-headline), treść, social proof, layout, typografię, wygląd (cień/font/motion),
kolory (paleta + pola), ramki i tło (kolor + gradient), z warunkowym odsłanianiem pól
i trwałym zapisem. Wizard i Advanced realizują zadeklarowany kontrakt (seed-only / read-only).
**Wykryto jeden realny defekt funkcjonalny: tryb „Single CTA" nie utrzymuje się po zapisie+reloadzie
— sekundarne CTA wraca (re-merge z `heroDefaults`).** Pozostałe punkty z sekcji 5 to niuanse
UX/a11y (najważniejsze: brak landmarku na korzeniu Hero oraz toggmany badge/social-proof bez
natychmiastowego efektu przy pustej treści). Obszary niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 8. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `hero-public-desktop-28-05.png` | Front `/homepage`, 1280px (Hero „Twój wymarzony dom…", brak overflow) |
| `hero-public-mobile-375-28-05.png` | Front `/homepage`, 375px (brak overflow) |
