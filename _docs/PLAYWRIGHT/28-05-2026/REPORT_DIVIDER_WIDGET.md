# RAPORT: Divider Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-divider` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `074a7240-a254-4ebc-8a09-1d060e057981` (breadcrumb „Contract Test - divider")
> **Route public:** `http://localhost:3000/test-divider-0516` (tytuł „TEST-DIVIDER-0516")
> **Pliki źródłowe:** `core/widgets/core/divider.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/DividerEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026 (`../27-05-2026/REPORT_DIVIDER_WIDGET.md`), który był jedynie clean
> smoke (status `passed`, liczba sekcji edytora). Tutaj realnie klikałem w kontrolki
> i weryfikowałem zmianę w żywym podglądzie przez inspekcję atrybutów `data-divider-*`
> na faktycznie wyrenderowanym elemencie, sprawdzałem trwałość po zapisie (Save draft →
> reload) oraz render na publicznej trasie.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są
> commitowane do repo.

---

## 1. Przegląd widgetu

**Typ:** `divider` · **Kategoria:** layout
**Opis (z definicji):** „Visual separator with optional centered label and spacing controls."
**Warianty:** `line`, `dashed`, `label-center`.

**Model danych (skrót, `DividerData`):**

| Grupa | Pola |
|-------|------|
| Etykieta | `label`, `labelColor`, `labelSize` (xs/sm/base), `labelWeight` (medium/semibold/bold), `labelTransform` (none/uppercase), `labelLetterSpacing` (normal/wide), `labelGap` (2/3/4/6) |
| Linia | `thickness` (1–8, clamp), `color`, `lineStyle` (solid/dashed/dotted), `opacity` (100/75/50/25), `dashPattern` (browser/short/wide), `visibility` (line/spacer-only) |
| Szerokość | `width` (full/container/custom), `containerWidth` (sm/md/lg), `customWidth`, `align` (left/center/right) |
| Odstępy | `marginTop`, `marginBottom` (tokeny spacingu, np. `6` = 1.5rem) |

**Tryby edytora wg kontraktu (`dividerEditorContract`):**
- **Wizard** — 1 sekcja „Divider quick start" (rola `setup`), `writablePaths: []`, `readOnlyPaths: ["variant"]`.
- **Visual** — sekcja „Preview" (summary) + 3 sekcje edytowalne: „Variant and label", „Line style and width", „Spacing around divider". `editorCapabilities.visualOwnsVariantSelection: true`.
- **Advanced** — „Preview" (summary) + „Runtime divider summary" (diagnostics, read-only) + „Support summary" (read-only).

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie poniższe interakcje wykonano w żywej aplikacji. Efekt weryfikowałem przez
inspekcję atrybutów `data-divider-*` oraz inline-style faktycznie wyrenderowanego
elementu (zarówno w canvas, jak i w panelu „Live preview"), a trwałość przez ponowny
odczyt po reloadzie.

- Logowanie do admina + otwarcie fixture page.
- **Wizard:** wejście przez „Run setup again", odczyt zawartości, policzenie kontrolek edytowalnych, powrót przez „Finish setup and open Visual".
- **Visual:** zmiana wariantu na `label-center` (odsłonięcie pól etykiety), wpisanie tekstu etykiety, zmiana koloru etykiety (swatch), label size = Large, line thickness = Heavy (6), width mode = Container, container width = Wide (lg), alignment = Left, line color = `#3366ff`, line style = Dashed, dash pattern = Wide dash, line emphasis (opacity) = Muted (50%), visibility = Spacer only → z powrotem Visible line, top spacing = Hero gap (24).
- **Persistencja:** „Save draft" → toast „Draft saved." → reload strony → ponowna weryfikacja całego stanu.
- **Advanced:** odczyt 3 sekcji diagnostycznych, policzenie kontrolek edytowalnych, weryfikacja zgodności podsumowań ze stanem.
- **Front:** otwarcie `/test-divider-0516`, inspekcja DOM trzech opublikowanych dividerów, status HTTP, konsola, overflow przy 1280 i 375.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard
- W stanie domyślnym panel pokazuje baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics." z przyciskiem **„Run setup again"**; ten przycisk otwiera Wizard.
- Wizard zawiera **dokładnie jedną** sekcję **„Divider quick start"**: „Live divider preview" (renderer współdzielony), read-only wiersz **„Divider style: Line"** (ścieżka `variant`, zgodnie z `readOnlyPaths: ["variant"]`) oraz tekst pomocniczy „Visual owns divider style changes, center labels, line weight, color, width, and spacing."
- Przycisk **„Finish setup and open Visual"** poprawnie wraca do Visual.
- **Programowo potwierdzono 0 edytowalnych kontrolek widgetu** w panelu Wizard (jedyne 2 pola input w całym DOM to wyszukiwarki strony i biblioteki komponentów — poza panelem widgetu).
- **Werdykt:** Wizard działa zgodnie z kontraktem — to wyłącznie afordancja startowa/podsumowanie, bez pól edycji; wariant jest tu read-only.

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Kontrolka | Akcja testowa | Efekt w renderze (zweryfikowany) | Wynik |
|---|---|---|---|
| Karty wariantu | Klik „Label center" | `data-divider-variant=label-center`; odsłonięcie sekcji pól etykiety | ✅ |
| Center label (tekst) | Wpisanie „Sekcja testowa" | `data-divider-has-label=true`; span etykiety renderuje tekst; przycisk „Clear" przechodzi z disabled na aktywny | ✅ |
| Label color (swatch) | Ustawienie koloru | Kolor renderowanej etykiety zmienił się na `rgb(255,0,0)` | ✅ |
| Label size | Wybór „Large" | Klasa spana → `text-base` (z `text-xs`) | ✅ |
| Line thickness | Wybór „Heavy" (6) | `data-divider-thickness=6`; wysokość linii `6px` | ✅ |
| Width mode | Wybór „Container width" | `data-divider-width-mode=container`, `width-kind=container-md`; **odsłonięcie** „Container width" i „Horizontal alignment" | ✅ (UI warunkowe) |
| Container width | Wybór „Wide content width" | `width-kind=container-lg`; szerokość kontenera `min(100%, 64rem)` | ✅ |
| Horizontal alignment | Wybór „Left" | Klasa kontenera → `mr-auto` (z `mx-auto`) | ✅ |
| Line color (swatch) | Ustawienie `#3366ff` | `data-divider-color-kind` → `hex`; gradient linii `rgb(51,102,255)` | ✅ |
| Line style | Wybór „Dashed" | `data-divider-line-style=dashed`; `repeating-linear-gradient`; **odsłonięcie** „Dash pattern" | ✅ (UI warunkowe) |
| Dash pattern | Wybór „Wide dash" | Gradient `0 14px, transparent 14px 22px` (zgodny z presetem wide) | ✅ |
| Line emphasis (opacity) | Wybór „Muted" (50%) | `opacity:0.5` na linii **oraz** na etykiecie | ✅ |
| Visibility | Wybór „Spacer only" | `data-divider-visibility=spacer-only`; element nie renderuje żadnej zawartości (0 dzieci, zostają tylko marginesy) | ✅ |
| Visibility (powrót) | Wybór „Visible line" | Linia wraca, `has-label=true` przywrócone | ✅ |
| Top spacing | Wybór „Hero gap" (24) | `margin-top:6rem`; `margin-top-kind=token` | ✅ |

- **Warunkowe odsłanianie pól działa poprawnie:** pola etykiety pojawiają się tylko dla wariantu `label-center`; „Container width" tylko dla width=container; „Horizontal alignment" tylko gdy width≠full; „Dash pattern" tylko gdy visibility=line i lineStyle=dashed.
- **Panel „Preview"** w Visual aktualizuje się live przez ten sam renderer.

### 3.3 Spacer-only renderuje czysty odstęp
Po wyborze „Spacer only" element `[data-divider]` traci całą zawartość (0 dzieci) i
pozostawia jedynie marginesy — poprawna realizacja „odstępu bez widocznej linii"
(`visibility === "spacer-only" ? null : ...`). Brak „pustej kreski".

### 3.4 Persistencja (Save draft → reload)
„Save draft" zwraca toast **„Draft saved."**. Po reloadzie **wszystkie** zmiany wróciły
z bazy bez utraty: `variant=label-center`, `thickness=6`, `colorKind=hex`,
`widthKind=container-lg`, `lineStyle=dashed`, `visibility=line`, `has-label=true`,
`margin-top=6rem` / `margin-bottom=1.5rem`, `align=left` (`mr-auto`),
`innerWidth=min(100%, 64rem)`, etykieta „Sekcja testowa" (czerwona, `text-base`),
opacity linii `0.5`. ✅

_Zrzut (lokalny): `divider-admin-visual-28-05.png`_

### 3.5 Tryb Advanced — read-only, wiernie odzwierciedla stan
- **Programowo potwierdzono 0 edytowalnych kontrolek i 0 przycisków** w panelu widgetu Advanced.
- „Runtime divider summary" (diagnostics) zgadzało się ze stanem zapisanym w Visual:
  - Variant: **Label center**
  - Line: **dashed, Heavy, Muted, visible line**
  - Width: **Wide content width, aligned left.**
  - Spacing: **Top Hero gap, bottom Compact gap.**
  - Label: **Sekcja testowa (base, medium)**
- „Support summary": nota o normalizacji + **„Preset-only width and spacing values are saved."** (poprawnie, bo width=container i marginesy to tokeny — `hasSavedCompatibility=false`).
- **Werdykt:** Advanced realizuje zadeklarowany kontrakt diagnostyczny — zero edycji, podsumowania spójne ze stanem.

_Zrzut (lokalny): `divider-admin-advanced-28-05.png`_

### 3.6 Front (`/test-divider-0516`)
- HTTP **200 OK**, **0 błędów konsoli**.
- To **osobna, opublikowana strona** zawierająca **trzy** widgety divider (a nie tę pojedynczą instancję, którą edytowałem w adminie — patrz sekcja 6):
  1. `line` / thickness 1 / solid / full / bez etykiety / `role="separator"` + `aria-orientation="horizontal"`,
  2. `dashed` (wariant) / **`line-style=solid`** / full / bez etykiety / `role="separator"`,
  3. `label-center` / solid / full / etykieta **„OR"** / **bez** `role="separator"` i bez `aria-orientation`.
- Marginesy domyślne `1.5rem` (Compact gap) na wszystkich trzech.
- **Brak poziomego overflow** zarówno przy 1280px, jak i 375px (`scrollWidth == clientWidth`). ✅

_Zrzuty (lokalne): `divider-public-desktop-28-05.png`, `divider-public-mobile-375-28-05.png`_

---

## 4. Co NIE działa / problemy

- **Nie znaleziono błędów funkcjonalnych** w przetestowanym zakresie. Każda kontrolka, którą kliknąłem w Visual, realnie zmieniała render i przetrwała zapis; Wizard i Advanced zachowują się dokładnie tak, jak deklaruje kontrakt (odpowiednio: setup-only oraz read-only).
- Brak regresji względem smoke-reportu z 27-05 (który również był `passed`).

> Uczciwe zastrzeżenie: „brak błędów" dotyczy **przetestowanego** zakresu z sekcji 2.
> Obszary z sekcji 6 nie były klikane i nie mogę ich potwierdzić ani zaprzeczyć na
> podstawie tej sesji. Punkty z sekcji 5 to niuanse UX/a11y, nie defekty funkcjonalne.

---

## 5. Uwagi UX/UI i dostępności (niuanse, nie błędy funkcjonalne)

1. **Domyślny kolor (token) prezentowany jako „Saved custom color".** Pola Line color i Label color mają zapisane domyślne tokeny (`var(--color-border)` / `var(--color-text)`; `data-divider-color-kind=token`), ale swatch pokazuje fallback `#e2e8f0` / `#0f172a` i etykietę **„Saved custom color"** oraz „A saved custom color is configured.". Sugeruje to użytkownikowi zapisany kolor własny, podczas gdy faktycznie jest to domyślny token motywu. (Ta sama rodzina problemu co niuans „transparent-jako-biały" z raportu Section.)
2. **Helper „...or clear the field" bez przycisku Clear.** Przy Line color tekst pomocniczy mówi „Pick a swatch to replace it, or clear the field.", ale w kontrolce (przy `showValueInput={false}`) widoczny jest jedynie natywny swatch — brak widocznej afordancji „Clear". Tekst myli.
3. **Wariant „Dashed" nie wymusza linii przerywanej.** `lineStyle` jest niezależnie konfigurowalny; wariant ustala tylko *domyślny* styl linii. Na froncie opublikowany divider #2 ma wariant `dashed`, ale renderuje się jako linia ciągła (`line-style=solid`). Nazwa wariantu może wprowadzać w błąd.
4. **Niespójna semantyka separatora między wariantami.** Warianty `line` i `dashed` renderują kontener z `role="separator"` i `aria-orientation="horizontal"`. Wariant `label-center` z etykietą renderuje zwykły `flex`-div (linie jako `span[aria-hidden]`) — **bez** `role="separator"` i bez `aria-orientation`. Dla czytników ekranu divider z etykietą nie jest ogłaszany jako separator.
5. **„Line emphasis" (opacity) działa łącznie na linię i etykietę.** Wybór przezroczystości stosuje tę samą wartość `opacity` do linii oraz do tekstu etykiety — nie da się przyciemnić samej linii bez przyciemnienia etykiety.
6. **Odstępy są wyłącznie tokenowe (`allowCustom=false`).** Rozwijane listy Top/Bottom spacing zawierają wyłączoną pozycję **„Custom value unavailable"** — nie można wpisać własnej wartości px. Jednocześnie Advanced i copy mówią o „saved custom spacing" (kompatybilność dla wartości zapisanych spoza presetów) — drobna niespójność słownictwa względem tego, co realnie da się ustawić z UI.
7. **Wizard jest de facto pusty** — poza read-only podsumowaniem wariantu i podglądem nie ma tu nic do skonfigurowania (celowe; ten sam wzorzec co w widgecie Section).
8. **Radix Select vs natywny `select`.** Wszystkie comboboxy (thickness, width, line style, opacity, visibility, spacing, label size/weight…) to komponenty Radix — w teście wymagają kliknięcia triggera i opcji; programowa komenda `select` (natywna) na nich nie działa. To niuans harnessu, **nie** błąd widgetu.
9. **Natywny `input[type=color]` (swatch).** Kliknięcie swatcha otwiera systemowy dialog koloru, którego nie da się obsłużyć w headless. Zmianę koloru zweryfikowałem przez programowe ustawienie wartości + zdarzenia React (propagacja zadziałała — patrz 3.2). To niuans harnessu, nie defekt.

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Pozostałe pola etykiety pojedynczo:** Label weight, Text transform, Letter spacing, Label gap — kliknąłem reprezentatywnie tylko Label size. Wzorzec identyczny (Radix Select → writablePaths), ale nie weryfikowałem każdego z osobna.
- **Width mode = Custom** i komponent `CustomWidthField` (presety 240/320/480/640px, 75% oraz ścieżka „Saved custom width" / disabled „legacy-custom") — testowałem tylko tryb Container.
- **Pozostałe warianty wartości:** alignment Right (testowałem Left), line style Dotted (testowałem solid + dashed), dash pattern Short (testowałem Wide), opacity Faint/Soft (testowałem Muted), inne wartości thickness.
- **Clear dla Line/Label color** — nie udało się zlokalizować widocznego przycisku Clear w tych kontrolkach (patrz niuans 5.2); zachowanie czyszczenia nie zostało wykonane.
- **Publikacja (Publish)** — wykonałem wyłącznie „Save draft". W konsekwencji **moje zmiany nie trafiły na front**.
- **Round-trip moich edycji na trasę publiczną** — `/test-divider-0516` to **inna, opublikowana strona** niż edytowany fixture admin (jeden divider w adminie vs trzy na froncie). Front zweryfikowałem więc pod kątem **poprawności renderu widgetu divider** (3 warianty), a nie odzwierciedlenia moich konkretnych edycji.
- **Wpływ blokowych ustawień „Device visibility" na froncie** — Advanced pokazał „Hidden on all devices" (ustawienie page-buildera, nie część edytora widgetu); nie weryfikowałem jego realnego efektu na opublikowanej trasie.

---

## 7. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only podsumowanie wariantu + preview + przejście do Visual | ✅ Działa zgodnie z kontraktem (0 pól edycji, wariant read-only) |
| **Visual** | Główny edytor (Preview + 3 sekcje edytowalne) | ✅ Wszystkie testowane kontrolki działają, aktualizują podgląd i są trwałe po zapisie |
| **Advanced** | Preview + 2 sekcje diagnostyczne read-only | ✅ 0 kontrolek edytowalnych; podsumowania wiernie odzwierciedlają stan |
| **Front** | `/test-divider-0516` (treść opublikowana, 3 dividery) | ✅ HTTP 200, 0 błędów konsoli, brak overflow (1280/375) |

**Werdykt końcowy:** W przetestowanym zakresie widget `divider` jest sprawny i spójny
między edytorem a rendererem. Nie wykryto błędów funkcjonalnych. Warianty Wizard/Advanced
realizują zadeklarowany kontrakt (setup-only / read-only), a Visual poprawnie obsługuje
pełną konfigurację (wariant, etykieta, styl/grubość/kolor/szerokość/wyrównanie linii,
przezroczystość, widoczność, odstępy) z warunkowym odsłanianiem pól i trwałym zapisem.
Uwagi z sekcji 5 to niuanse UX/a11y (najważniejsze: brak `role="separator"` dla wariantu
z etykietą oraz mylące „Saved custom color" dla domyślnych tokenów), a nie defekty.
Obszary niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 8. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `divider-admin-visual-28-05.png` | Admin, tryb Visual po edycjach (stan zapisany draftem, po reloadzie) |
| `divider-admin-advanced-28-05.png` | Admin, tryb Advanced — diagnostyka read-only |
| `divider-public-desktop-28-05.png` | Front `/test-divider-0516`, 1280px (3 dividery, brak overflow) |
| `divider-public-mobile-375-28-05.png` | Front `/test-divider-0516`, 375px (brak overflow) |
