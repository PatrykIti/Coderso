# RAPORT: CTA Banner Widget — audyt wyczerpujący (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-29 (re-audyt domykający luki raportu z 28-05-2026)
> **Sesja przeglądarki:** `claude-29-05-cta-banner-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `94e844e2-9287-4aa4-949e-c2ea9d28ca4f` (breadcrumb „Contract Test - cta-banner")
> **Route public:** `http://localhost:3000/test-cta-banner-0516` (tytuł „TEST-CTA-BANNER-0516")
> **Pliki źródłowe:** `core/widgets/core/ctaBanner.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten re-audyt został przeprowadzony „od zera" w żywej aplikacji i celowo
> domyka luki poprzedniej sesji (media picker, nie wszystkie clear-y kolorów / destynacji, nie wszystkie
> rodziny opcji). Każdą kontrolkę faktycznie klikałem, a efekt weryfikowałem przez inspekcję realnie
> wyrenderowanego CTA Banner w canvasie admina (`section[data-cta-banner-outer]` → `div[data-cta-banner-variant]`
> → przyciski `[data-cta-button]`, badge `[data-cta-banner-badge]`) — odczyt klas Tailwind, `inline-style`
> oraz `getComputedStyle`. Sprawdziłem też trwałość po `Save draft → reload`, akcje Advanced
> (Normalize / Reset z dialogami) oraz render na publicznej trasie (DOM, konsola, overflow 1280/375).

> **Uwaga o zrzutach:** Nazwy plików PNG w tym raporcie są wyłącznie lokalnymi etykietami przechwyceń
> Playwright. Pliki PNG są ignorowane przez Git (reguła `*.png` w `.gitignore`, potwierdzona `git check-ignore`)
> i nie są wymaganym evidence w repo.

---

## 1. Przegląd widgetu

**Typ:** `cta-banner` · **Kategoria:** content
**Opis (z definicji):** „Compact conversion strip with headline and CTA actions."
**Warianty:** `centered`, `split`, `with-badge`.
**Sloty:** brak (widget bez zagnieżdżonych regionów).
**Capabilities:** `editorCapabilities.visualOwnsVariantSelection: true` (wariant wybierany w Visual, nie w Wizard).

**Model danych (skrót, `CtaBannerData`):**

| Grupa | Pola |
|-------|------|
| Treść | `content.{badge, title, description, showDescription}` |
| Akcje | `actions.{primaryCta, secondaryCta, tertiaryCta}` — każda: `{label, href, enabled, openInNewTab, icon}` |
| Style | `style.{background, text, border, borderWidth, radius, padding, badgeBackground, badgeText, primaryButton*, secondaryButton*, buttonRadius, primaryButtonSize, secondaryButtonSize}` |
| Tło | `background.{color, gradient, media.{type, source, assetId, src, fit, position}}` |
| Ruch | `motion.preset` (none / fade-in / slide-up) |

**Tryby edytora wg kontraktu (`ctaBannerEditorContract`, version 2):**
- **Wizard** — 1 sekcja `setup`: „Starter conversion" (`writablePaths: []`, `readOnlyPaths: ["variant","content.title"]`).
- **Visual** — 5 sekcji edytowalnych: „Variant and layout structure", „Content copy", „Actions", „Colors and Borders", „Background and motion".
- **Advanced** — 3 sekcje read-only: „Style diagnostics" (diagnostics), „Normalization and safeguards" (summary — 2 akcje), „Runtime summary" (diagnostics).

---

## 2. Co było faktycznie testowane (pełny zakres realnych interakcji)

Wszystkie poniższe interakcje wykonano w żywej aplikacji na fixture „Contract Test - cta-banner".
W odróżnieniu od poprzedniej sesji **wyczerpano wszystkie rodziny opcji** (każda karta wariantu, każda
wartość selecta, każdy przycisk Clear, picker mediów, fit/position na realnym obrazie).

- **Logowanie** do admina (e-mail/hasło) + otwarcie fixture page.
- **Wariant (3/3):** Centered, Split, With Badge — sprawdzone klasy wrappera i kontenera akcji.
- **Padding (5/5):** None, Compact, Default, Spacious, Extra spacious — sprawdzony atrybut `data-cta-banner-padding` i klasy `p-*`.
- **Content:** badge, title, description, przełącznik „Show description" off→on.
- **Actions — wszystkie 3 CTA, wszystkie rodziny:**
  - **Ikona (4/4 × Primary)** + po jednej weryfikacji dla Secondary i Tertiary: None, Arrow right, Chevron right, External link.
  - **„Open in new tab" (3/3 CTA):** primary, secondary, tertiary — sprawdzony `target=_blank` + `rel`.
  - **„Clear destination" (3/3 CTA):** primary, secondary, tertiary — sprawdzone zniknięcie przycisku po wyczyszczeniu href.
  - **Destination page-picker:** otwarcie listy stron i wybór (HomePage / Pricing Review Temp) — przywrócenie linków.
- **Colors and Borders — wyczerpująco:**
  - **Palety (3/3):** Light, Dark, Brand — sprawdzone wszystkie zapisane hexy (kontener, badge, przyciski).
  - **Clear (10/10 pól koloru):** text, badge background, badge text, primary button bg/text/border, secondary button bg/text/border, border color.
  - **„Use transparent" (Colors + Background):** secondary button background oraz background color.
  - **Color input onChange (programowo):** ustawienie wartości `input[type=color]` przez natywny setter — render zaktualizowany.
  - **Border width (4/4):** 0/1/2/3 px. **Banner radius (5/5):** None..2XL. **Button radius (8/8):** Default, Match banner radius, None, Medium, Large, Extra large, 2XL, Pill. **Primary button size (4/4)** i **Secondary button size (4/4):** None, Small, Medium, Large.
- **Background and motion — wyczerpująco:**
  - **Background color:** „Use transparent" + „Clear".
  - **Gradient:** suwak kąta (90°→45°), kolor start (`#112233`), kolor end (`#abcdef`), „Clear".
  - **Media type → Image:** odsłonięcie pól; **MediaPicker** → „Browse media" → wybór realnego assetu z Media Library (przypięty URL); **Image fit (2/2):** Cover/Contain; **Image position (3/3):** Center/Top/Bottom (na realnym obrazie); **„Clear image".**
  - **Entrance motion (3/3):** Static, Fade in, Slide up.
- **Persistencja:** ustawienie deterministycznego stanu → „Save draft" (toast „Draft saved.") → reload → pełna re-weryfikacja.
- **Advanced:** odczyt 9 wierszy diagnostyki; „Normalize now" (dialog → potwierdzenie); „Reset to defaults" (dialog → potwierdzenie + weryfikacja powrotu do defaultów).
- **Front:** `/test-cta-banner-0516` — DOM, konsola (0/0), overflow 1280 i 375, a11y, potwierdzenie wariantu.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard

- W stanie domyślnym panel pokazuje baner **„Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics."** z przyciskiem **„Run setup again"**. Wizard nie jest osobną zakładką w `tablist` (są tylko `Visual`/`Advanced`) — to celowy wzorzec startowy.
- Wizard zawiera **dokładnie 1 sekcję „Starter conversion"** z dwoma wierszami read-only („Banner layout" = mapowany `variant`, „Headline" = `content.title`) i statycznym hintem kierującym do Visual.
- **Programowo potwierdzony kontrakt:** 2 wiersze read-only, 0 kontrolek writable — zgodnie z `writablePaths: []`. **„Finish setup and open Visual"** wraca do Visual.
- **Werdykt:** Wizard działa zgodnie z kontraktem — czysto read-only podsumowanie + podgląd, bez kontrolki edytowalnej ani akcji seedującej.

### 3.2 Tryb Visual — warianty, padding, treść

| Sekcja | Kontrolka | Wartości przetestowane | Efekt w renderze (zweryfikowany) | Wynik |
|---|---|---|---|---|
| Variant | Karty wariantu | **Centered** | wrapper `flex flex-col items-center gap-4 text-center` | ✅ |
| Variant | Karty wariantu | **Split** | wrapper `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`; akcje `…md:justify-end` | ✅ |
| Variant | Karty wariantu | **With Badge** | `data-cta-banner-variant=with-badge`, ale wrapper **identyczny jak Centered** | ⚠ patrz 4.1 |
| Variant | Padding (Select) | **None / Compact / Default / Spacious / Extra spacious** | `p-0` / `px-4 py-4` / `px-5 py-5` / `px-6 py-6` / `px-7 py-7` (+ `data-cta-banner-padding`) | ✅ 5/5 |
| Content | Badge / Title / Description | tekst | `[data-cta-banner-badge]` / `<h3>` / `<p>` aktualizują tekst | ✅ |
| Content | Show description (switch) | Off → On | `<p>` opisu znika / wraca | ✅ |

### 3.3 Tryb Visual — Actions (wszystkie 3 CTA, wszystkie rodziny)

| Kontrolka | Wartości | Efekt w renderze | Wynik |
|---|---|---|---|
| Primary — ikona (Select) | None / Arrow right / Chevron right / External link | brak `<svg>` / `lucide-arrow-right` / `lucide-chevron-right` / `lucide-external-link` | ✅ 4/4 |
| Secondary — ikona | External link | `lucide-external-link` w przycisku secondary | ✅ |
| Tertiary — ikona | Chevron right | `lucide-chevron-right` w linku tertiary | ✅ |
| Primary — „Open in new tab" | On | `target=_blank` + `rel="noopener noreferrer"` | ✅ |
| Secondary — „Open in new tab" | On | `target=_blank` + `rel="noopener noreferrer"` | ✅ |
| Tertiary — „Open in new tab" | On | `target=_blank` + `rel="noopener noreferrer"` | ✅ |
| Primary — „Clear destination" | Klik | href→pusty ⇒ **przycisk primary znika** z podglądu | ✅ |
| Secondary — „Clear destination" | Klik | href→pusty ⇒ **przycisk secondary znika** | ✅ |
| Tertiary — „Clear destination" | Klik | href→pusty ⇒ **link tertiary znika** | ✅ |
| Destination — page-picker | wybór „HomePage" / „Pricing Review Temp" | render linku `href="/homepage"` / `/pricing-review-temp` (przycisk wraca) | ✅ |

> **Generalizacja względem poprzedniego raportu:** wyczyszczenie destynacji **dowolnego** z trzech CTA usuwa
> ten przycisk z renderu, bo `resolveWidgetLinkAttrs("")` zwraca `null` (gating `has{Primary|Secondary|Tertiary}`
> wymaga prawidłowego href). To nie tylko tertiary — wszystkie trzy CTA znikają przy pustym href.

### 3.4 Tryb Visual — Colors and Borders (wyczerpująco)

**Palety (3/3) — każda zapisuje jawne hexy (zweryfikowane `getComputedStyle`):**

| Paleta | Tło | Text | Border | Badge bg | Primary btn bg | Secondary btn border |
|---|---|---|---|---|---|---|
| **Light** | `#f8fafc` | `#0f172a` | `#e2e8f0` | `#1d4ed8` | `#1d4ed8` | `#e2e8f0` |
| **Dark** | `#0f172a` | `#f8fafc` | `#334155` | `#38bdf8` | `#38bdf8` | `#334155` |
| **Brand** | `#eff6ff` | `#1e3a8a` | `#93c5fd` | `#1d4ed8` | `#1d4ed8` | `#93c5fd` |

**Przyciski „Clear" (10/10):** po wyczyszczeniu pole wraca do tokenu motywu:
- 9 pól → status **„Theme default"** + inline-style na `var(--color-*)` (text → `var(--color-text)`, border → `var(--color-border)` itd.),
- **primary button border** → status **„Transparent"** (domyślną wartością tego pola jest `transparent`, nie token — pole nie jest „clearable" do pustego).
- **„Use transparent"** (secondary button bg, background color) → wartość `transparent`, render `rgba(0,0,0,0)`, status „Transparent".

**Selecty (wszystkie rodziny):**

| Select | Wartości | Efekt w renderze | Wynik |
|---|---|---|---|
| Border width | 0px / 1px / 2px / 3px | `data-cta-banner-border-width` + `border-width`; **0px usuwa klasę `border`** | ✅ 4/4 |
| Banner radius | None / Medium / Large / Extra large / 2XL | brak / `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` | ✅ 5/5 |
| Button radius | Default / Match banner radius / None / Medium / Large / Extra large / 2XL / Pill | `rounded-md` / **`rounded-2xl` (= radius kontenera)** / brak / `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-full` | ✅ 8/8 |
| Primary button size | None / Small / Medium / Large | brak / `px-3 py-1.5 text-xs` / `px-4 py-2 text-sm` / `px-5 py-2.5 text-base` | ✅ 4/4 |
| Secondary button size | None / Small / Medium / Large | jw. (na przycisku secondary) | ✅ 4/4 |

> **„Match banner radius" (inherit)** poprawnie odzwierciedla bieżący promień banera: przy radius kontenera = 2XL przycisk dostał `rounded-2xl`, zgodnie z `radiusClassMap[containerRadius]`.

### 3.5 Tryb Visual — Background and motion (wyczerpująco, z mediami)

| Kontrolka | Akcja | Efekt w renderze | Wynik |
|---|---|---|---|
| Background color | „Use transparent" | `background-color: transparent` (`rgba(0,0,0,0)`) | ✅ |
| Background color | „Clear" | inline `background-color` usuwany (Theme default); kasuje też `style.background` | ✅ |
| Gradient | suwak kąta 90→45 | `linear-gradient(45deg, …)` | ✅ |
| Gradient | kolor start `#112233` | `linear-gradient(45deg, rgb(17,34,51), …)` | ✅ |
| Gradient | kolor end `#abcdef` | `linear-gradient(135deg, …, rgb(171,205,239))` | ✅ |
| Gradient | „Clear" | `background-image` usuwany | ✅ |
| **Media type → Image** | Select | odsłonięcie pól: MediaPicker („Browse media") + „Clear image" + Image fit + Image position | ✅ |
| **MediaPicker** | „Browse media" → wybór assetu z Media Library | `background-image: url("http://localhost:3000/media/2026/02/…png")`, `source=library`, `assetId` + `src` zapisane | ✅ **(luka domknięta)** |
| Image fit | Cover / Contain | `background-size: cover` / `contain` | ✅ 2/2 |
| Image position | Center / Top / Bottom | `background-position: center center` / `center top` / `center bottom` | ✅ 3/3 |
| „Clear image" | Klik | `background-image` usuwany, „No media selected yet.", przycisk disabled | ✅ |
| Media type → None | Select | pola mediów chowane (render warunkowy działa w obie strony) | ✅ |
| Entrance motion | Static | brak klas motion, `data-cta-banner-motion=none`, brak inline `animation-duration` | ✅ |
| Entrance motion | Fade in | `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none` + inline `500ms` | ✅ |
| Entrance motion | Slide up | jw. + `motion-safe:slide-in-from-bottom-2` (reduced-motion-safe) | ✅ |

### 3.6 Persistencja (Save draft → reload)

Ustawiłem deterministyczny stan (paleta Dark + padding Spacious + border 2px + radius XL + button radius Pill +
primary size Large + motion Fade in + 3 CTA z ikonami, `_blank` i destynacjami stron) → „Save draft" (toast
**„Draft saved."**) → reload. **Cały stan wrócił z bazy bez utraty:**

- `variant=centered`, `padding=lg`, `border-width=2`, `radius=rounded-xl`, `motion=fade-in`, `bg #0f172a`;
- przyciski: `rounded-full` (pill), primary `px-5 py-2.5 text-base` (large);
- 3 CTA: primary `/homepage`, secondary `/pricing-review-temp`, tertiary `/homepage` — **każdy** z `target=_blank` i ikoną;
- treść: badge „AUDYT 28-05", title „Tytuł audytowy CTA".

✅ **Brak defektu trwałości w pełnym przetestowanym zakresie** (w tym wyłączeń/ikon/destynacji/rozmiarów/promieni).

_Zrzut (lokalny): stan zweryfikowany programowo (bez dedykowanego zrzutu admina)._

### 3.7 Tryb Advanced — diagnostyka + akcje serwisowe

- **„Style diagnostics"** (read-only `<dl>`) wiernie odzwierciedlał zapisany stan: Background `#0f172a`, Text `#f8fafc`, Border `#334155`, Primary button border `transparent`, Secondary button border `#334155`.
- **„Runtime summary"** (read-only): Variant `centered`, Actions `3 configured`, Background media `Not configured`, Motion `fade-in` — zgodne ze stanem.
- **„Normalize now"** → dialog „Normalize CTA banner data?" (Cancel / Normalize now). Po potwierdzeniu stan pozostał niezmieniony (dane już znormalizowane) — akcja bez błędu.
- **„Reset to defaults"** → dialog „Reset CTA banner to defaults?" (Cancel / Reset to defaults). Po potwierdzeniu **podgląd wrócił do defaultów**: `padding=md`, `border-width=1`, `radius=xl`, `motion=none`, tło `var(--color-surface)`, badge „Limited offer", title „Ready to launch your next campaign?", **tylko 2 CTA** (primary/secondary → `#`, tertiary domyślnie wyłączony).
- Reset działa **in-memory** (nie zapisany) — pozostawiłem go niezapisanym, więc zapisany draft to stan z 3.6.
- **Werdykt:** Advanced realizuje kontrakt diagnostyczny (0 edycji pól) + 2 deterministyczne akcje, które realnie działają.

### 3.8 Front (`http://localhost:3000/test-cta-banner-0516`)

- Strona ładuje się, **0 błędów i 0 ostrzeżeń konsoli**.
- To **osobna, opublikowana strona** (NIE edytowany fixture) z **domyślną treścią**: `variant=with-badge`, `padding=md`, `border-width=1`, `motion=none`; badge „Limited offer", `<h3>` „Ready to launch your next campaign?"; 2 przyciski primary/secondary jako `<a>` → `#` (bez ikon, bez `target`).
- **Dostępność:** `<section>` z `aria-labelledby` wskazującym na `<h3>` (poprawny landmark z nazwą).
- **Brak poziomego overflow** przy 1280px (`scrollWidth==clientWidth==1280`) i 375px (`==375`). ✅
- **Potwierdzenie 4.1 na froncie:** wariant `with-badge` renderuje wrapper `flex flex-col items-center gap-4 text-center` — identycznie jak `centered`.

_Zrzuty (lokalne): `cta-banner-public-desktop-29-05.png`, `cta-banner-public-mobile-375-29-05.png`._

---

## 4. Co NIE działa / problemy

### 4.1 Wariant „With Badge" jest wizualnie nieodróżnialny od „Centered" (potwierdzony, admin + front)

- Renderer rozróżnia **tylko** `split` vs reszta:
  ```ts
  const wrapperClassName =
    resolvedVariant === "split" ? "…md:flex-row…" : "flex flex-col items-center gap-4 text-center";
  ```
- Dla `with-badge` `resolvedVariant` to „with-badge", ale klasy wrappera i akcji są **dokładnie takie same jak dla `centered`**. Zmiana wariantu zmienia **wyłącznie atrybut** `data-cta-banner-variant`. Badge i tak renderuje się nad nagłówkiem również w `centered`.
- Potwierdzone w adminie (klik karty → identyczne klasy) **oraz** na froncie (opublikowana strona używa `with-badge` i renderuje klasy Centered).
- **Skutek dla użytkownika:** opis karty obiecuje „Highlights badge above CTA heading", ale wybór tej opcji nie daje żadnej wizualnej różnicy względem „Centered" z włączonym badge. **Mylący/nadmiarowy wariant.**

### 4.2 Każdy CTA wymaga prawidłowej destynacji, by się wyrenderować (pułapka UX, spójna z kodem)

- Wyczyszczenie „Destination" (lub brak href) dla **dowolnego** z trzech CTA powoduje, że przycisk **nie renderuje się** w podglądzie — bo `resolveWidgetLinkAttrs("")` zwraca `null`, a `has{Primary|Secondary|Tertiary}` wymaga prawidłowego href.
- Szczególnie myli to przy **Tertiary**: domyślnie `tertiaryCta.href === ""`, więc samo „Enabled = on" + wpisanie etykiety **nie pokazuje** przycisku, dopóki nie wybierze się strony w „Destination". Primary/Secondary mają default `"#"`, więc renderują się od razu — ale po kliknięciu „Clear destination" znikają identycznie.
- Brak inline-hintu „ten CTA wymaga celu". Nie jest to defekt renderera (spójny z modelem), lecz realna pułapka UX.

### 4.3 Brak feedbacku po „Normalize now" / „Reset to defaults"

- Po potwierdzeniu w dialogu akcja wykonuje się, ale **nie ma żadnego toast/inline** informującego, czy i co się zmieniło. Przy „Normalize", gdy dane były już poprawne, użytkownik nie wie, czy cokolwiek się stało. (Dla kontrastu — „Save draft" pokazuje toast „Draft saved.")

### 4.4 Brak regresji smoke

- Brak regresji renderera, ładowania edytora ani trasy publicznej. Front: HTTP OK, 0 błędów/ostrzeżeń konsoli, brak overflow.

---

## 5. Czego NIE dało się w pełni zweryfikować (środowisko / fixture)

Wszystkie pozycje to ograniczenia harnessu/środowiska, **nie** defekty widgetu — podaję dokładną kontrolkę i powód:

1. **Natywny systemowy dialog `input[type=color]`** — pola koloru oraz kolory start/end gradientu to `input[type=color]`. **Sam popup wyboru koloru OS** nie da się otworzyć/obsłużyć w trybie headless. **Ścieżkę zapisu (`onChange`) zweryfikowałem programowo** (ustawienie `value` natywnym setterem + `input`/`change` → render zaktualizowany na `#ff0000`) oraz przez palety (jawne hexy) i diagnostykę Advanced. Klikalny pozostaje cały UI poza samym natywnym próbnikiem.
2. **Round-trip „Publish" na front** — wykonałem wyłącznie „Save draft" (świadomie, by nie publikować edycji audytowych). Trasa `/test-cta-banner-0516` to **osobna, opublikowana strona** z domyślną treścią, więc front zweryfikowałem pod kątem poprawności renderu/a11y/overflow, a nie round-tripu moich edycji.
3. **Wariant `split` na froncie** — opublikowana strona używa `with-badge`; `split` testowany tylko w adminie (na froncie nieweryfikowalny bez publikacji).
4. **Reset to defaults pozostawiony niezapisany** — potwierdziłem powrót do defaultów in-memory; nie zapisywałem go, by zachować sensowny draft. Guard `beforeunload` przy niezapisanych zmianach był weryfikowany w poprzedniej sesji i nie był ponownie wymuszany w tej.
5. **Współdzielone panele blokowe** (Block layout / Visibility summary) — poza zakresem edytora widgetu, nie testowane jako kontrolki CTA.

---

## 6. Uwagi UX/UI i dostępności (niuanse, nie zawsze defekty)

1. **Kolizja nazw w testach:** w nagłówku admina istnieje przycisk **„Dark"** (przełącznik motywu), o tej samej nazwie co paleta „Dark". To niuans automatyzacji (trzeba targetować paletę po kontenerze/ref), ale też potencjalna drobna niejednoznaczność a11y nazw — dwie różne akcje „Dark" na jednym ekranie.
2. **„Destination" to page-picker (`LinkDestinationField`), nie wolny input.** Primary/secondary z defaultem `"#"` pokazują „Saved custom destination" z notką „A custom destination is already configured…". W Visual **nie da się wpisać** dowolnego hash/relative/URL — można tylko wybrać istniejącą stronę lub wyczyścić. Tertiary z pustym href ma inną notkę („Choose an existing site page. Custom destinations stay read-only…"). Celowy, bezpieczny wzorzec autoringu, który jednak ogranicza szybkie linki kotwiczne (`#sekcja`).
3. **Indywidualne color-pickery i kolory gradientu** to natywny `input[type=color]` (systemowy dialog) — patrz 5.1.
4. **Pole „Primary button border" nie jest „clearable" do pustego** — jego Clear przywraca `transparent` (default pola), więc status zostaje „Transparent". Inne pola kolorów po Clear wracają do tokenu motywu („Theme default"). Drobna niespójność oczekiwań, spójna z kodem (`resolveString` vs `resolveClearableStyleValue`).
5. **Sprzężenie „Background color" ↔ `style.background`.** `updateSurfaceColor` zapisuje jednocześnie `background.color` i `style.background`; Clear background color kasuje oba. Drobna nadmiarowość modelu (dwa pola na kolor powierzchni), bez widocznego problemu w UI.
6. **Pozytyw dostępności:** korzeń widgetu to `<section>` z `aria-labelledby` (gdy jest title) lub fallback `aria-label="Call to action"` (gdy brak title). Tytuł renderuje się jako `<h3>`.
7. **Pozytyw bezpieczeństwa:** „Open in new tab" dodaje `rel="noopener noreferrer"` dla wszystkich trzech CTA; motion jest `motion-reduce`-safe.
8. **Wszystkie listy wyboru to Radix `Select` (combobox), nie natywny `<select>`** — etykiety w UI bywają opisowe/kapitalizowane („Spacious", „Extra spacious", „Match banner radius") względem wartości modelu (`lg`, `xl`, `inherit`). Niuans harnessu.
9. **Wizard bez akcji** — czysto informacyjny (2 wiersze read-only + preview). Dla użytkownika oczekującego „kreatora" może być zaskakująco pusty — świadomy wybór kontraktu.

---

## 7. Porównanie Admin Preview vs Frontend

| Funkcjonalność | Admin Preview | Frontend (`/test-cta-banner-0516`) | Zgodność |
|---|---|---|---|
| Renderowanie `centered` | ✅ `flex flex-col items-center gap-4 text-center` | n/d (strona używa with-badge) | — |
| Renderowanie `with-badge` | ✅ identyczne z centered | ✅ identyczne z centered | ✅ zgodne (oba „puste") |
| Renderowanie `split` | ✅ `md:flex-row …` | n/d (nieopublikowany na froncie) | — |
| Badge / title / description | ✅ render warunkowy | ✅ badge + `<h3>` | ✅ OK |
| Przyciski CTA jako `<a>` | ✅ (3 CTA) | ✅ primary/secondary | ✅ OK |
| Tło: obraz z Media Library | ✅ `url(.../media/…png)` + fit/position | n/d (default = brak mediów) | ✅ (admin) |
| `aria-labelledby` na `section` | ✅ `…-cta-title` | ✅ `…-cta-title` | ✅ OK |
| `target=_blank` + `rel` | ✅ (po włączeniu, 3/3 CTA) | brak (default off) | ✅ zgodne z konfiguracją |
| Overflow 1280 / 375 | n/t (canvas) | ✅ brak overflow | ✅ OK |

**Wniosek:** renderer zachowuje się spójnie między adminem a frontem. Różnice treści wynikają z tego, że front to osobna opublikowana strona z domyślną zawartością, a nie edytowany fixture.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | 1 sekcja read-only + Live preview | ✅ Działa zgodnie z kontraktem (0 writable, 2 readonly; bez akcji seedującej) |
| **Visual** | 5 sekcji edytowalnych | ✅ **Wszystkie rodziny opcji przeklikane i zweryfikowane** (3 warianty, 5 paddingów, 3 CTA × ikony/new-tab/clear, 3 palety, 10 clear-ów kolorów, transparent, border/radius/button-radius/size, gradient, **media picker + fit/position + clear image**, 3 motion). **Jeden mylący wariant (With Badge ≈ Centered)** i **jedna pułapka UX (każdy CTA wymaga href)** |
| **Advanced** | 3 sekcje diagnostyczne + 2 akcje | ✅ Diagnostyka wierna; Normalize i Reset realnie działają (z dialogami); brak feedbacku po akcji |
| **Front** | `/test-cta-banner-0516` (osobna, opublikowana strona) | ✅ Ładuje się, 0 błędów konsoli, poprawny render i a11y, brak overflow (1280/375) |

**Werdykt końcowy:** Widget `cta-banner` jest w przeważającej części sprawny i spójny między edytorem a
rendererem. Po tej sesji **domknięto wszystkie luki poprzedniego raportu**: media picker przypina realny
asset z Media Library (render `url(...)` + `cover/contain` + `center/top/bottom`), wszystkie 10 przycisków
Clear kolorów oraz wszystkie 3 „Clear destination" działają, a wszystkie rodziny selectów i ikon zostały
przeklikane. **Cały sprawdzony stan jest trwały po Save draft → reload — nie wykryto defektu trwałości.**

**Najważniejsze ustalenia negatywne (oba realne, oba potwierdzone admin + render):**
1. **Wariant „With Badge" nie ma własnego układu** — renderuje się identycznie jak „Centered" (admin i front). Mylący/nadmiarowy wariant.
2. **Każdy CTA wymaga prawidłowej destynacji, by się wyrenderować** — wyczyszczenie href usuwa przycisk (najbardziej myli przy Tertiary, którego default href jest pusty). Brak inline-hintu. Pułapka UX (spójna z kodem).

**Niuanse:** brak feedbacku po Normalize/Reset; „Destination" to page-picker bez wolnego inputu; „Primary button border" Clear wraca do `transparent`, nie do tokenu; natywny próbnik koloru OS nieobsługiwalny w headless (ścieżka `onChange` zweryfikowana programowo). Obszary niezweryfikowane wymieniono jawnie w sekcji 5.

---

## 9. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `cta-banner-public-desktop-29-05.png` | Front `/test-cta-banner-0516`, 1280px (CTA Banner with-badge, brak overflow) |
| `cta-banner-public-mobile-375-29-05.png` | Front `/test-cta-banner-0516`, 375px (brak overflow) |

> Pliki PNG są wyłącznie lokalnymi etykietami i są ignorowane przez Git (reguła `*.png`).
