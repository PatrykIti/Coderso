# RAPORT: CTA Banner Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-cta-banner` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `94e844e2-9287-4aa4-949e-c2ea9d28ca4f` (breadcrumb „Contract Test - cta-banner")
> **Route public:** `http://localhost:3000/test-cta-banner-0516` (tytuł „TEST-CTA-BANNER-0516")
> **Pliki źródłowe:** `core/widgets/core/ctaBanner.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026. Realnie klikałem w kontrolki i po każdej zmianie weryfikowałem faktycznie
> wyrenderowany element CTA Banner w canvasie admina przez inspekcję DOM (klasy Tailwind,
> inline-style, atrybuty `data-cta-banner-*`, `data-cta-button`). Sprawdziłem trwałość
> po zapisie (Save draft → reload), zachowanie akcji w trybie Advanced (Normalize / Reset
> + dialogi potwierdzające) oraz render na publicznej trasie (DOM, konsola, overflow 1280/375).

> **Uwaga o zrzutach:** Nazwy plików PNG w tym raporcie są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Pliki PNG są ignorowane przez Git (`git check-ignore` potwierdza,
> exit 0) i nie są wymaganym evidence w repo.

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
- **Advanced** — 3 sekcje read-only widgetu: „Style diagnostics" (diagnostics), „Normalization and safeguards" (summary — 2 przyciski akcji), „Runtime summary" (diagnostics).

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie poniższe interakcje wykonano w żywej aplikacji na fixture „Contract Test - cta-banner".
Efekt każdej zmiany weryfikowałem przez inspekcję realnie wyrenderowanego CTA Banner w canvasie
(`section[data-cta-banner-outer]` → `div[data-cta-banner-variant]` → przyciski `[data-cta-button]`),
a trwałość przez ponowny odczyt po reloadzie.

- Logowanie do admina (formularz e-mail/hasło) + otwarcie fixture page.
- **Wizard:** wejście przez „Run setup again", odczyt sekcji „Starter conversion", programowe policzenie kontrolek (`data-widget-control-ownership`), powrót przez „Finish setup and open Visual".
- **Visual:** warianty Centered / Split / With Badge; padding → Spacious(lg); badge/title/description; toggle „Show description"; Primary CTA (label, „Open in new tab", ikona Arrow right); Secondary CTA „Enabled" off/on; Tertiary CTA „Enabled" on + label + wybór strony jako destination; paleta „Dark"; border width → 3px; button radius → Pill; primary button size → Large; motion → Fade in; gradient (suwak kąta → 90°); background media type → Image (odsłonięcie pól) → z powrotem None.
- **Persistencja:** „Save draft" → reload → ponowna pełna weryfikacja stanu.
- **Advanced:** odczyt sekcji diagnostycznych; „Normalize now" (z dialogiem) → potwierdzenie; „Reset to defaults" (z dialogiem) → potwierdzenie + weryfikacja przywrócenia defaultów; sprawdzenie guardu `beforeunload` przy niezapisanym reset.
- **Front:** `http://localhost:3000/test-cta-banner-0516` — inspekcja DOM, konsola, overflow przy 1280 i 375, potwierdzenie wariantu i a11y.

> **Zastrzeżenie:** „Save draft" zostawił na fixture „Contract Test - cta-banner" wersję
> roboczą z moimi edycjami audytowymi (NIE opublikowaną). Trasa publiczna
> `/test-cta-banner-0516` to osobna, opublikowana strona z własną, domyślną treścią —
> patrz sekcja 6.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard

- W stanie domyślnym panel pokazuje baner **„Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics."** z przyciskiem **„Run setup again"**. Wizard nie jest osobną zakładką w `tablist` (są tylko `Visual`/`Advanced`) — to celowy wzorzec startowy (identyczny jak w Hero/Section/Divider).
- Wizard zawiera **dokładnie 1 sekcję „Starter conversion"** z **dwoma wierszami read-only**:
  - **„Banner layout"** = „Centered" (mapowane z `variant`),
  - **„Headline"** = aktualny `content.title`,
  - oraz statyczny hint: „Use Visual for CTA labels, destinations, visibility toggles, button styling, background media, and motion."
- Panel ma własny **„Live preview"** renderowany przez współdzielony renderer.
- **Programowo potwierdzony kontrakt:** w panelu Wizard są **2 wiersze `data-widget-control-ownership=readonly`** (`variant`, `content.title`) i **0 kontrolek writable** — zgodnie z `writablePaths: []`.
- **„Finish setup and open Visual"** poprawnie wraca do trybu Visual.
- **Werdykt:** Wizard działa zgodnie z kontraktem — to czysto read-only podsumowanie + podgląd, **bez żadnej kontrolki edytowalnej ani akcji seedującej** (inaczej niż Hero, który ma selektor „Goal").

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Sekcja | Kontrolka | Akcja testowa | Efekt w renderze (zweryfikowany) | Wynik |
|---|---|---|---|---|
| Variant | Karty wariantu | Split | wrapper → `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`; actions → `md:justify-end` | ✅ |
| Variant | Karty wariantu | Centered | wrapper → `flex flex-col items-center gap-4 text-center` | ✅ |
| Variant | Karty wariantu | With Badge | `data-cta-banner-variant=with-badge`, ale klasy **identyczne jak Centered** | ⚠ patrz 4.1 |
| Variant | Padding (Select) | Spacious | `data-cta-banner-padding=lg`, klasy `px-6 py-6` | ✅ |
| Content | Badge | „AUDYT 28-05" | `[data-cta-banner-badge]` aktualizuje tekst | ✅ |
| Content | Title | „Tytuł audytowy CTA" | `<h3 id=…-cta-title>` aktualizuje tekst | ✅ |
| Content | Description | „Opis audytowy…" | `<p>` opisu aktualizuje tekst | ✅ |
| Content | Show description (switch) | Off → On | `<p>` opisu znika / wraca | ✅ |
| Actions | Primary label | „Rozpocznij teraz" | `[data-cta-button=primary]` aktualizuje label | ✅ |
| Actions | Primary „Open in new tab" | On | `target="_blank"` + `rel="noopener noreferrer"` | ✅ (bezpieczny rel) |
| Actions | Primary ikona | Arrow right | render `<svg class="lucide lucide-arrow-right">` w przycisku | ✅ |
| Actions | Secondary „Enabled" | Off | przycisk secondary znika z podglądu | ✅ |
| Actions | Secondary „Enabled" | On | przycisk secondary wraca | ✅ |
| Actions | Tertiary „Enabled" + label + destination | On / „Nie, dziękuję" / strona „HomePage" | renderuje się jako link tekstowy `href="/homepage"` | ✅ (po ustawieniu destination — patrz 4.2) |
| Colors | Paleta „Dark" | Klik | bg `#0f172a`, text `#f8fafc`, border `#334155`, badge `#38bdf8/#082f49`, przyciski z jawnymi hexami | ✅ |
| Colors | Border width (Select) | 3px | `data-cta-banner-border-width=3`, inline `border-width: 3px` | ✅ |
| Colors | Button radius (Select) | Pill | przyciski → `rounded-full` | ✅ |
| Colors | Primary button size (Select) | Large | przycisk primary → `px-5 py-2.5 text-base` | ✅ |
| Background | Entrance motion (Select) | Fade in | outer → klasy `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none` + inline `animation-duration: 500ms`, `data-cta-banner-motion=fade-in` | ✅ |
| Background | Gradient — suwak kąta | 90° | inner → `background-image: linear-gradient(90deg, #0f172a, #475569)` | ✅ |
| Background | Background media type (Select) | Image | odsłonięcie pól: MediaPicker + „Clear image" + „Image fit" + „Image position" | ✅ (UI warunkowe) |

- **Warunkowe odsłanianie pól działa:** pola tła obrazu (MediaPicker, fit, position) pojawiają się dopiero po wyborze „Image"; przy „None" są ukryte. Tertiary destination jest **disabled** dopóki tertiary nie jest „Enabled".
- **Paleta „Dark" zapisuje jawne kolory** — po kliknięciu wszystkie sprawdzone inline-style (kontener, badge, przyciski) zgadzały się z presetem.

### 3.3 Persistencja (Save draft → reload)

„Save draft" + reload — **cały sprawdzony stan wrócił z bazy bez utraty**:

- `variant=centered`, `padding=lg`, `border-width=3px`, kolory z palety Dark (`bg #0f172a`, `text #f8fafc`, `border #334155`), `background-image: linear-gradient(90deg, …)`, `motion=fade-in`;
- treść: badge „AUDYT 28-05", title „Tytuł audytowy CTA";
- akcje: primary „Rozpocznij teraz" (`target=_blank` + ikona arrow-right), secondary „Contact sales", tertiary „Nie, dziękuję" → `/homepage`;
- przyciski: `rounded-full` (pill), primary `text-base` (large).

✅ **Brak defektów trwałości w przetestowanym zakresie.** W szczególności wyłączenie/utrzymanie tertiary oraz tryb pill/large przetrwały zapis (to inny obraz niż defekt „Single CTA" w raporcie Hero — tutaj nie wykryto regresji re-merge defaultów).

_Zrzut (lokalny): stan zweryfikowany programowo (bez dedykowanego zrzutu admina)._

### 3.4 Tryb Advanced — read-only diagnostyka + akcje serwisowe

- **„Style diagnostics"** (`<dl>` read-only) wiernie odzwierciedlał stan: Background `#0f172a`, Text `#f8fafc`, Border `#334155`, Primary button border `transparent`, Secondary button border `#334155`.
- **„Runtime summary"** (read-only): Variant `centered`, Actions `3 configured`, Background media `Not configured`, Motion `fade-in` — zgodne ze stanem.
- **„Normalization and safeguards"** — 2 przyciski:
  - **„Normalize now"** → otwiera dialog „Normalize CTA banner data?" („Apply schema-owned fallbacks…") z Cancel/Normalize now. Po potwierdzeniu stan pozostał niezmieniony (dane były już znormalizowane) — akcja zadziałała bez błędu.
  - **„Reset to defaults"** → otwiera dialog „Reset CTA banner to defaults?" z Cancel/Reset. Po potwierdzeniu **podgląd poprawnie wrócił do defaultów** (padding `md`, border `1`, motion `none`, badge „Limited offer", title „Ready to launch your next campaign?", tło `var(--color-surface)`, tylko 2 CTA).
- **Guard niezapisanych zmian:** po (niezapisanym) Reset próba reloadu wywołała natywny dialog `beforeunload`. Po jego akceptacji i przeładowaniu wrócił **zapisany draft** (stan audytowy), co potwierdza, że Reset działa wyłącznie in-memory dopóki nie klikniemy „Save draft".
- Advanced zawiera dodatkowo współdzielone panele blokowe **„Block layout summary"** i **„Visibility summary"** — to nie są kontrolki widgetu (patrz 6).
- **Werdykt:** Advanced realizuje deklarowany kontrakt diagnostyczny (zero edycji pól) + dwie deterministyczne akcje serwisowe, które realnie działają.

### 3.5 Front (`http://localhost:3000/test-cta-banner-0516`)

- Strona ładuje się, **0 błędów i 0 ostrzeżeń konsoli**.
- To **osobna, opublikowana strona** (NIE edytowany fixture). Zawiera **jeden** widget CTA Banner z **domyślną treścią**:
  - `variant=with-badge`, `padding=md`, `border-width=1px`, `motion=none`, tło/teksty na tokenach motywu (`var(--color-surface)`, `var(--color-text)`, `var(--color-border)`);
  - badge „Limited offer", `<h3>` „Ready to launch your next campaign?";
  - 2 przyciski: primary „Get started" → `#`, secondary „Contact sales" → `#` (bez ikon, bez `target`).
- **Dostępność:** `section` ma `aria-labelledby="…-cta-title"` wskazujące na `<h3>` (poprawny landmark z nazwą).
- **Brak poziomego overflow** przy 1280px (`scrollWidth==clientWidth==1280`) i 375px (`==375`). ✅
- **Potwierdzenie 4.1 na froncie:** wariant `with-badge` renderuje wrapper `flex flex-col items-center gap-4 text-center` — **identycznie jak `centered`**.

_Zrzuty (lokalne): `cta-banner-public-desktop-28-05.png`, `cta-banner-public-mobile-375-28-05.png`._

---

## 4. Co NIE działa / problemy

### 4.1 Wariant „With Badge" jest wizualnie nieodróżnialny od „Centered" (potwierdzony, admin + front)

- Renderer rozróżnia **tylko** `split` vs reszta:
  ```ts
  const wrapperClassName =
    resolvedVariant === "split" ? "…md:flex-row…" : "flex flex-col items-center gap-4 text-center";
  ```
- Dla `with-badge` `resolvedVariant` to „with-badge", ale klasy wrappera i akcji są **dokładnie takie same jak dla `centered`**. Badge i tak renderuje się nad nagłówkiem również w `centered` (jeśli `content.badge` niepusty).
- Zmiana wariantu na „With Badge" zmienia **wyłącznie atrybut** `data-cta-banner-variant`, nie zmienia żadnego widocznego elementu układu.
- Potwierdzone w adminie (klik karty „With Badge" → identyczne klasy jak Centered) **oraz** na froncie (opublikowana strona używa `with-badge` i renderuje `flex flex-col items-center gap-4 text-center`).
- **Skutek dla użytkownika:** opis karty obiecuje „Highlights badge above CTA heading", ale wybór tej opcji nie daje żadnej wizualnej różnicy względem „Centered" z włączonym badge. To **mylący wariant** — albo brak implementacji dedykowanego układu, albo nadmiarowy wariant.

### 4.2 Tertiary CTA nie pojawia się po samym włączeniu + etykiecie (UX trap, działa zgodnie z kodem)

- Włączenie przełącznika „Enabled" dla Tertiary CTA i wpisanie etykiety **nie powoduje** renderu przycisku.
- Powód: renderer wymaga ważnego href (`hasTertiary = enabled && label && tertiaryLinkAttrs`). Domyślny `tertiaryCta.href` to pusty string `""`, więc `tertiaryLinkAttrs` jest puste i link się nie renderuje. Primary/secondary mają default `"#"`, więc renderują się od razu.
- Dopiero po wybraniu strony w polu „Destination" (np. „HomePage" → `/homepage`) tertiary pojawia się jako link tekstowy.
- **Skutek dla użytkownika:** sekwencja „Enabled = on + wpisz label" wygląda na kompletną, ale w podglądzie nic się nie pojawia, dopóki nie ustawi się destynacji. Brak inline-hintu „ten CTA wymaga celu". Nie jest to defekt renderera (spójny z modelem), ale realna pułapka UX.

### 4.3 Brak feedbacku po „Normalize now" / „Reset to defaults"

- Po potwierdzeniu w dialogu akcja wykonuje się, ale **nie ma żadnego toast/inline** informującego, czy i co się zmieniło (przy Normalize, gdy dane były już poprawne, użytkownik nie wie, czy cokolwiek się stało). Ta sama rodzina uwagi co U7 w raporcie Contact.

### 4.4 Brak regresji smoke

- Brak regresji renderera, ładowania edytora ani trasy publicznej. Front: HTTP OK, 0 błędów konsoli.

---

## 5. Uwagi UX/UI i dostępności (niuanse, nie zawsze defekty)

1. **Pole „Destination" to page-picker (`LinkDestinationField`), nie wolny input.** Dla primary/secondary domyślne `"#"` pokazuje się jako „Saved custom destination" z notką „A custom destination is already configured. Choose a site page to replace it or clear the destination." W Visual **nie da się wpisać** dowolnego hash/relative/URL — można tylko wybrać istniejącą stronę lub wyczyścić. To celowy, bezpieczny wzorzec autoringu, ale ogranicza szybkie linki kotwiczne (`#sekcja`).
2. **Indywidualne color-pickery to natywny `input[type=color]`** (potwierdzone: `tag=INPUT`, `type=color`). Otwierają systemowy dialog, którego nie da się obsłużyć w headless. Ścieżkę zapisu kolorów zweryfikowałem przez **paletę „Dark"** (zapisuje jawne hexy) oraz odczyt w diagnostyce Advanced. To niuans harnessu, nie defekt.
3. **Gradient:** edytowalny realnie tylko **suwak kąta** (range). Kolory start/end to natywne `input[type=color]` (systemowy dialog). Zmiana kąta od razu emituje pełny `linear-gradient(...)`.
4. **Sprzężenie „Background color" ↔ `style.background`.** `updateSurfaceColor` zapisuje jednocześnie `background.color` i `style.background`, a pole czyta `background.color ?? style.background`. Drobna nadmiarowość modelu (dwa pola na kolor powierzchni), bez widocznego problemu w UI.
5. **Pozytyw dostępności:** korzeń widgetu to `<section>` z `aria-labelledby` (gdy jest title) lub fallback `aria-label="Call to action"` (gdy brak title). To **lepiej** niż Hero (zwykły `<div>` bez landmarku) i Contact (R1: brak `aria-label`). Tytuł renderuje się jako `<h3>`.
6. **Pozytyw bezpieczeństwa:** „Open in new tab" dodaje `rel="noopener noreferrer"`; motion jest `motion-reduce`-safe.
7. **Wizard bez akcji.** W odróżnieniu od Hero (selektor „Goal" seedujący treść), Wizard CTA Bannera jest czysto informacyjny (2 wiersze read-only + preview). Dla użytkownika oczekującego „kreatora" może być zaskakująco pusty — to świadomy wybór kontraktu.
8. **Wszystkie listy wyboru to Radix `Select` (combobox), nie natywny `<select>`** — wymagają kliknięcia triggera i opcji; etykiety w UI bywają kapitalizowane/opisowe („Spacious", „Extra spacious") względem wartości modelu (`lg`, `xl`). Niuans harnessu.
9. **Tertiary destination** ma inną notkę niż primary/secondary, gdy href pusty: „Choose an existing site page. Custom destinations stay read-only in Wizard and Visual modes." — spójne z bezpiecznym autoringiem.

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Załączenie realnego assetu z Media Library** dla tła obrazu (dialog `MediaPicker`) — testowałem tylko zmianę typu media na „Image" i odsłonięcie pól, nie przypięcie pliku ani `fit`/`position` na realnym obrazie.
- **Indywidualne color-pickery** (natywny systemowy dialog) — kolory weryfikowałem przez paletę „Dark" + diagnostykę, nie przez ręczne otwarcie pickerów. Dotyczy też **kolorów start/end gradientu**.
- **Przyciski „Clear"** przy poszczególnych polach kolorów oraz **„Clear destination"** dla primary/secondary — nie klikałem każdego z osobna (model clearable potwierdzony pośrednio przez paletę + Reset).
- **Wariant `split` na froncie** — opublikowana strona używa `with-badge`; `split` testowany tylko w adminie.
- **Reprezentatywnie nieklikane kontrolki:** Secondary button size, Banner radius, ikony Chevron/External-link, „Open in new tab" dla secondary/tertiary, ikony tertiary, paleta „Light"/„Brand", motion „Slide up", `fit`/`position` obrazu tła.
- **Publikacja (Publish)** — wykonałem wyłącznie „Save draft", więc moje edycje nie trafiły na front. **Trasa `/test-cta-banner-0516` to inna, opublikowana strona** (jeden CTA Banner o domyślnej treści), więc front zweryfikowałem pod kątem poprawności renderu, a nie round-tripu moich edycji.
- **Współdzielone panele blokowe** w Advanced („Block layout summary", „Visibility summary") — poza zakresem edytora widgetu. Odnotowuję jedynie, że fixture ma w „Visibility summary" wpis „Hidden on all devices" (ustawienie blokowe, nie widgetowe) — to nie wpływa na osobną trasę publiczną.

---

## 7. Porównanie Admin Preview vs Frontend

| Funkcjonalność | Admin Preview | Frontend (`/test-cta-banner-0516`) | Zgodność |
|---|---|---|---|
| Renderowanie `centered` | ✅ `flex flex-col items-center gap-4 text-center` | n/d (strona używa with-badge) | — |
| Renderowanie `with-badge` | ✅ identyczne z centered | ✅ identyczne z centered | ✅ zgodne (oba „puste") |
| Renderowanie `split` | ✅ `md:flex-row …` | n/d (nietestowane na froncie) | — |
| Badge / title / description | ✅ render warunkowy | ✅ badge + `<h3>` | ✅ OK |
| Przyciski CTA jako `<a>` | ✅ | ✅ primary/secondary jako `<a>` | ✅ OK |
| `aria-labelledby` na `section` | ✅ `…-cta-title` | ✅ `…-cta-title` | ✅ OK |
| `target=_blank` + `rel` | ✅ (po włączeniu) | brak (default off) | ✅ zgodne z konfiguracją |
| Overflow 1280 / 375 | n/t (canvas) | ✅ brak overflow | ✅ OK |

**Wniosek:** renderer zachowuje się spójnie między adminem a frontem. Wszystkie zaobserwowane różnice treści wynikają z tego, że front to osobna opublikowana strona z domyślną zawartością, a nie edytowany fixture.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | 1 sekcja read-only („Banner layout" + „Headline") + Live preview | ✅ Działa zgodnie z kontraktem (0 kontrolek writable, 2 readonly; bez akcji seedującej) |
| **Visual** | 5 sekcji edytowalnych | ✅ Wszystkie testowane kontrolki działają, aktualizują podgląd i są trwałe po zapisie. **Jeden mylący wariant (With Badge ≈ Centered)** i **jedna pułapka UX (tertiary wymaga destination)** |
| **Advanced** | 3 sekcje diagnostyczne read-only + 2 akcje serwisowe | ✅ Diagnostyka wiernie odzwierciedla stan; Normalize i Reset realnie działają (z dialogami); brak feedbacku po akcji |
| **Front** | `/test-cta-banner-0516` (osobna, opublikowana strona, 1 CTA Banner) | ✅ Ładuje się, 0 błędów konsoli, poprawny render i a11y (`aria-labelledby`), brak overflow (1280/375) |

**Werdykt końcowy:** W przetestowanym zakresie widget `cta-banner` jest w przeważającej części
sprawny i spójny między edytorem a rendererem. Visual poprawnie obsługuje warianty (Centered/Split),
padding, treść, trzy CTA (label / nowa karta z `rel` / ikona / widoczność / destination), paletę i jawne
kolory, ramkę, promień, rozmiary i promień przycisków, motion (reduced-motion-safe) oraz tło
(kolor / gradient / typ media z warunkowym odsłanianiem). **Cały sprawdzony stan jest trwały po
Save draft → reload — nie wykryto defektu trwałości.** Wizard i Advanced realizują zadeklarowany
kontrakt (read-only summary / diagnostyka + akcje serwisowe), a guard `beforeunload` chroni
niezapisane zmiany.

**Najważniejsze ustalenia negatywne (oba realne, oba potwierdzone):**
1. **Wariant „With Badge" nie ma własnego układu** — renderuje się identycznie jak „Centered" (admin i front). Mylący/nadmiarowy wariant.
2. **Tertiary CTA wymaga ustawienia destination, by się pojawić** — samo „Enabled" + label nie wystarcza; brak inline-hintu. Pułapka UX (spójna z kodem).

**Niuanse:** brak feedbacku po Normalize/Reset; „Destination" to page-picker bez wolnego inputu (brak szybkich linków kotwiczących); natywne color-pickery i kolory gradientu nieobsługiwalne w headless (weryfikacja przez paletę). Obszary niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 9. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `cta-banner-public-desktop-28-05.png` | Front `/test-cta-banner-0516`, 1280px (CTA Banner with-badge, brak overflow) |
| `cta-banner-public-mobile-375-28-05.png` | Front `/test-cta-banner-0516`, 375px (brak overflow) |

> Pliki PNG są wyłącznie lokalnymi etykietami i są ignorowane przez Git.
