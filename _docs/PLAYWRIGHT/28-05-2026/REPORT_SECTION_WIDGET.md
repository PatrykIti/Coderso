# RAPORT: Section Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-section` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `d37f900c-e8c2-4608-a71e-4a038300a048`
> **Fixture public:** `http://localhost:3000/section-widget-test`
> **Pliki źródłowe:** `core/widgets/core/section.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/SectionEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026 (`../27-05-2026/REPORT_SECTION_WIDGET.md`), który był jedynie clean
> smoke (status `passed`, liczba sekcji edytora). Tutaj realnie klikałem w kontrolki
> i weryfikowałem zmiany w podglądzie (canvas), trwałość po zapisie oraz render na
> froncie.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są
> commitowane do repo.

---

## 1. Przegląd widgetu

**Typ:** `section` · **Kategoria:** layout
**Opis:** „Semantic layout wrapper with repeatable region slots" — semantyczny kontener sekcji z powtarzalnymi slotami regionów (min 1 / max 8).
**Warianty:** `default`, `contained`, `bleed`.

**Model danych (skrót):**

| Sekcja | Pola |
|--------|------|
| `heading` | label, title, description, level (h1-h6), align, labelSize, titleSize, descriptionSize, labelColor, titleColor, descriptionColor |
| `semantics` | element (section/div), anchorId, ariaLabel |
| `layout` | containerWidth, maxWidth, paddingBlock/Inline, mobile/desktop padding overrides, minHeight, regionFlow (stack/row/grid), regionColumns (1-8), headingGap, regionGap |
| `style` | backgroundColor, gradientFrom/To/Angle, borderColor/Width, radius, shadow, motion, overlayColor/Opacity, backgroundMedia (image/video + fit/position/blend/layerOrder/opacity/poster) |
| `regions` | metadane slotów (id + label) |

**Tryby edytora wg kontraktu:**
- **Wizard** — 1 sekcja (read-only summary), zero pól edytowalnych.
- **Visual** — 6 sekcji edytora widgetu (Variant and structure, Heading and intro, Section link and accessibility, Width and spacing, Surface and borders, Background media and layers) + blokowa sekcja „Regions".
- **Advanced** — 3 sekcje read-only (Technical tokens, Support diagnostics, Authoring boundaries) + blokowe podsumowania (Block layout summary, Visibility summary).

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie poniższe interakcje wykonano w żywej aplikacji i weryfikowano przez
inspekcję atrybutów `data-section-*` na realnie wyrenderowanym elemencie w canvas
oraz przez ponowny odczyt po reloadzie.

- Logowanie do admina + otwarcie fixture page.
- **Wizard:** wejście przez „Run setup again", odczyt zawartości, powrót przez „Finish setup and open Visual".
- **Visual:** zmiana wariantu (Contained), wpisanie label/title/description, zmiana heading level (H3), heading alignment (Center), typu sekcji (Neutral wrapper = div), anchor id, accessibility name, Max width (4XL), Minimum height (Hero), Region flow (Grid), Grid columns (2), Clear dla Background color, Overlay opacity (stepper +5% ×3 = 15%), Surface shadow (Large), Background media type (Image — odsłonięcie pól warunkowych), preset „Hero band" (batch apply).
- **Persistencja:** „Save draft" → reload strony → ponowna weryfikacja stanu.
- **Advanced:** odczyt wszystkich 3 sekcji diagnostycznych + policzenie kontrolek edytowalnych.
- **Front:** otwarcie `/section-widget-test`, inspekcja DOM, sprawdzenie overflow desktop (1280) i mobile (375), odczyt konsoli.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard
- Tryb otwiera się przyciskiem **„Run setup again"** (w stanie domyślnym widoczny jest baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics.").
- Zawiera dokładnie jedną sekcję **„Section setup"** z **read-only** podsumowaniem „Section layout: Default" (odzwierciedla aktualny wariant) oraz tekstem pomocniczym „Wizard is one-time starter setup. Use Visual to change the section wrapper, write the label, title, description...".
- Przycisk **„Finish setup and open Visual"** poprawnie przełącza do trybu Visual.
- Panel „Live preview" renderuje stan przez współdzielony renderer.
- **Werdykt:** Wizard działa zgodnie z projektem — to wyłącznie afordancja startowa/podsumowanie, bez własnych pól edycji. Wariant jest tu read-only (zgodnie z kontraktem `readOnlyPaths: ["variant"]`).

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Kontrolka | Akcja testowa | Efekt w canvas | Wynik |
|---|---|---|---|
| Quick presets (5 kart) | Apply „Hero band" | variant→`bleed`, containerWidth→`full`, maxWidth→`none`, regionFlow→`stack`, cols→`1`, minHeight→`hero`, headingGap→`xl`, align→`text-center`, treść nagłówka zachowana | ✅ batch apply |
| Section layout (karty Default/Contained/Bleed) | Klik „Contained" | `data-section-variant=contained`, cień auto → `shadow-sm` | ✅ |
| Label / Title / Description | Wpisanie tekstu | Nagłówek renderuje się live (label uppercase, title w tagu nagłówka, description) | ✅ |
| Heading level (H1–H6) | Wybór H3 | Tag tytułu `H2` → `H3` | ✅ |
| Heading alignment | Wybór Center | `header` klasa → `text-center` | ✅ |
| Section type (section/div) | Wybór „Neutral wrapper" | Element renderowany `SECTION` → `DIV`, `data-section-element=div` | ✅ |
| Section link name (anchorId) | Wpisanie „Strefa Cennika!!" | Sanityzacja live → `Strefa-Cennika` (w polu i w `id` elementu) | ✅ |
| Accessibility name (ariaLabel) | Wpisanie „Sekcja cennika" | `aria-label="Sekcja cennika"` na elemencie | ✅ |
| Max width | Wybór 4XL | `data-section-max-width=4xl`, wrapper `max-w-4xl` | ✅ |
| Minimum height | Wybór Hero | `data-section-min-height=hero`, frame `min-h-[70vh]` | ✅ |
| Region flow | Wybór Grid | `data-section-region-flow=grid`; **odblokowuje** select „Grid columns" | ✅ |
| Grid columns | Wybór 2 (po włączeniu Grid) | `data-section-region-columns=2`, kontener regionów `md:grid-cols-2` | ✅ (warunkowe włączanie działa) |
| Background color — Clear | Klik „Clear" | Usunięcie inline `backgroundColor`, helper → „Theme default", przycisk Clear → disabled | ✅ |
| Surface shadow | Wybór Large | `data-section-shadow=lg`, frame `shadow-lg` (nadpisuje auto `sm` z wariantu contained) | ✅ |
| Overlay opacity (stepper +5%) | 3× „+5%" | Wartość 15%, w canvas pojawia się warstwa `data-section-background-overlay` z `opacity:0.15`; panel „Surface preview" aktualizuje się do „OVERLAY 15%" | ✅ |
| Background media type | Wybór Image | Odsłonięcie pól warunkowych: „Browse media" (MediaPicker), Media fit, Media position, Blend mode, Layer order, Media opacity | ✅ (UI warunkowe) |

- **Panel „Surface preview"** (mini-podgląd w sekcji Surface and borders) aktualizuje się live, pokazując m.in. „Shadow Soft · Motion None" i status nakładki/gradientu — działa.
- **Sekcja „Regions"** (blokowa): przycisk „Add Region", lista regionów z polem zmiany nazwy („Region label"), Move up/down (wyłączone przy jednym regionie), licznik „0 items", komunikat pustego slotu. Render zgodny z kontraktem slotu (min 1, max 8).

### 3.3 Bezpieczne renderowanie media bez źródła
Po wybraniu typu media = Image, ale bez wskazania assetu, canvas utrzymuje
`data-section-background-media=none`. To poprawne zachowanie — renderer
(`resolveRenderableSectionMediaSrc`) renderuje warstwę dopiero przy prawidłowym,
zgodnym typowo URL-u. Brak „pustej ramki".

### 3.4 Persistencja (Save draft → reload)
„Save draft" zwraca feedback („Draft saved"). Po reloadzie **wszystkie** zmiany
przetrwały i wróciły z bazy:
`tag=DIV`, `variant=bleed`, `maxWidth=none`, `containerWidth=full`,
`minHeight=hero`, `id=Strefa-Cennika`, `aria-label=Sekcja cennika`, `shadow=lg`,
pełna treść nagłówka (label/title/description). ✅

_Zrzut (lokalny): `section-admin-visual-28-05.png`_

### 3.5 Tryb Advanced — read-only, ale wiernie odzwierciedla stan
- **Zero kontrolek edytowalnych** w panelu widgetu Advanced (0 inputów, 0 buttonów — potwierdzone programowo).
- Trzy sekcje:
  - **Technical tokens** → Layout: „full wrapper, none max width, xl vertical padding"; Surface: „Inherited background, none radius, lg shadow"; Semantics: „div type, link name Strefa-Cennika, accessibility name Sekcja cennika".
  - **Support diagnostics** → Heading: „h3 heading, center aligned, title set"; Background media: „No decorative background media"; Visual effects: „Gradient angle 180 degrees, overlay 15%, motion none".
  - **Authoring boundaries** → opis ownershipu Wizard/Visual/Advanced.
- Dodatkowo blokowe podsumowania read-only: „Block layout summary" (Content width / Padding / Margin) i „Visibility summary".
- Wszystkie podsumowania **zgadzały się** z faktycznym stanem ustawionym w Visual. ✅

_Zrzut (lokalny): `section-admin-advanced-28-05.png`_

### 3.6 Front (`/section-widget-test`)
- HTTP `200`, brak błędów w konsoli (0 errors).
- Renderuje 1 widget section: semantyczny `<section>`, nagłówek `H2` „Test Section Title" + opis „This is a test description for Section Widget.", 1 region (pusty).
- Pusty region na froncie renderuje się jako pustka (placeholder „Empty region." jest wyłącznie kontekstem edytora) — poprawnie.
- **Brak poziomego overflow** zarówno na 1280px, jak i 375px (scrollWidth == clientWidth). ✅

_Zrzuty (lokalne): `section-public-desktop-28-05.png`, `section-public-mobile-375-28-05.png`_

---

## 4. Co NIE działa / problemy

- **Nie znaleziono błędów funkcjonalnych** w testowanym zakresie. Każda kontrolka, którą kliknąłem w trybie Visual, realnie zmieniała podgląd i przetrwała zapis; Wizard i Advanced zachowują się dokładnie tak, jak deklaruje kontrakt (odpowiednio: tylko-setup oraz tylko-do-odczytu).
- Brak regresji względem smoke-reportu z 27-05 (który również był `passed`).

> Uczciwe zastrzeżenie: „brak błędów" dotyczy **przetestowanego** zakresu z sekcji 2.
> Obszary z sekcji 6 nie były klikane i nie mogę potwierdzić ani zaprzeczyć ich
> poprawności na podstawie tej sesji.

---

## 5. Uwagi UX/UI (niuanse, nie błędy)

1. **Wizard jest de facto pusty.** Poza read-only podsumowaniem wariantu i przyciskiem przejścia do Visual nie ma tu nic do skonfigurowania. To celowe („one-time starter setup"), ale użytkownik wchodzący w „setup" nie znajdzie żadnej akcji konfiguracyjnej.
2. **Przezroczyste tło pokazywane jako biała próbka.** Tło ustawione na `transparent` renderuje swatch koloru jako biały (`#ffffff`) z etykietą „Saved custom color. Use the swatch to replace it, or Clear to inherit." — może sugerować, że zapisano biel, podczas gdy faktycznie tło jest przezroczyste/dziedziczone.
3. **Język deweloperski w tekstach pomocniczych.** Helpery używają inline-code z backtickami kierowanymi do użytkownika końcowego, np. „`Wide alias` keeps the same wrapper classes as `Content`", „Section titles default to `h2`. Choose `h1` only when this band owns the primary page heading." — techniczne sformułowania w UI autora treści (analogiczne do historycznego niuanса U8 z Contact).
4. **„Wide alias (same wrapper)" to świadomy no-op.** Wybór tej szerokości kontenera stosuje identyczne klasy wrappera co „Content"; realna zmiana wymaga większego „Max width". Jest to opisane inline, ale opcja „Wide", która sama z siebie nic wizualnie nie zmienia, bywa myląca.
5. **Wariant „Bleed" nie jest sam z siebie edge-to-edge.** Pełna szerokość wymaga dodatkowo „Full-width wrapper" + „No max width" (opisane inline i ujęte w presecie „Edge-to-edge").
6. **Dobra praktyka warunkowości:** „Grid columns" jest wyłączone dopóki Region flow ≠ Grid, z jasnym komunikatem — pozytywny wzorzec UX.
7. **Radix Select vs. natywny select.** Comboboxy (heading level, max width, region flow itd.) to komponenty Radix — wymagają kliknięcia triggera i opcji; programowa komenda `select` (natywna) na nich nie działa. To niuans harnessu testowego, **nie** błąd widgetu (kliknięcie myszą działa poprawnie).
8. **„Visibility summary: Hidden on all devices"** w Advanced (oraz przełączniki Device visibility z etykietą „Hidden" w Visual) — to ustawienia **blokowe** (page builder), nie część edytora widgetu section. Odnotowuję je jako kontekst; nie weryfikowałem ich realnego wpływu na froncie (patrz sekcja 6 — front pokazuje inny, opublikowany fixture).

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Realny wybór assetu media** (obraz/wideo) — odsłoniłem tylko UI warunkowe; nie wskazałem prawdziwego pliku z biblioteki, więc render tła obrazu/wideo w canvas nie został potwierdzony.
- **Pola wideo** (poster, title, description wideo) — sprawdzone tylko pod kątem odsłonięcia dla typu Image; ścieżki dla Video nie były rozwinięte.
- **Gradient** — nie ustawiałem obu stopów naraz, więc realny render gradientu nie był weryfikowany (logika: gradient staje się widoczny dopiero, gdy `gradientFrom` i `gradientTo` są ustawione).
- **Border width / Corner radius / Surface motion** jako pojedyncze przełączenia — obecne (Radix), pokryte pośrednio przez presety, ale nie klikane osobno.
- **Region flow = Row**, rozmiary label/title/description, kolory nagłówka (label/title/description color) — nie klikane indywidualnie (wzorzec ColorField potwierdzony na Background color).
- **Dodanie realnego widgetu-dziecka do regionu** oraz dodanie/usunięcie regionów (Add Region) i zmiana nazwy regionu — nie wykonane; region pozostał pusty.
- **Publikacja (Publish)** — wykonano tylko „Save draft". W konsekwencji **moje zmiany z admina nie pojawiły się na froncie** `/section-widget-test`, który serwuje treść opublikowaną (wariant `contained`, nagłówek „Test Section Title", pusty region). Front zweryfikowałem więc pod kątem **poprawności renderu widgetu section**, a nie round-tripu moich konkretnych edycji do publicznej trasy.
- **Wpływ Device visibility na froncie** — nie weryfikowany (front to inny, opublikowany stan).

---

## 7. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Tylko read-only summary + przejście do Visual | ✅ Działa zgodnie z projektem (brak pól edycji — celowo) |
| **Visual** | Główny edytor (6 sekcji + Regions) | ✅ Wszystkie testowane kontrolki działają, aktualizują podgląd i są trwałe po zapisie |
| **Advanced** | 3 sekcje diagnostyczne read-only | ✅ Zero kontrolek edytowalnych; podsumowania wiernie odzwierciedlają stan |
| **Front** | `/section-widget-test` (treść opublikowana) | ✅ HTTP 200, semantyczny `<section>`, brak overflow (1280/375), 0 błędów konsoli |

**Werdykt końcowy:** W przetestowanym zakresie widget `section` jest sprawny i
spójny między edytorem a rendererem. Nie wykryto błędów funkcjonalnych. Tryby
Wizard/Advanced realizują zadeklarowany kontrakt (setup-only / read-only), a Visual
poprawnie obsługuje pełną konfigurację z trwałym zapisem. Uwagi z sekcji 5 to
niuanse UX, nie defekty. Obszary niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 8. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `section-admin-visual-28-05.png` | Admin, tryb Visual po edycjach (stan zapisany draftem) |
| `section-admin-advanced-28-05.png` | Admin, tryb Advanced — diagnostyka read-only |
| `section-public-desktop-28-05.png` | Front `/section-widget-test`, 1280px |
| `section-public-mobile-375-28-05.png` | Front `/section-widget-test`, 375px (brak overflow) |
