# RAPORT: Divider Widget — audyt wyczerpujący (Wizard / Visual / Advanced + Front)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z 28-05; ten plik zastępuje poprzednią wersję)
> **Sesja przeglądarki:** `claude-29-05-divider-exhaustive` (izolowana)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `074a7240-a254-4ebc-8a09-1d060e057981`, slug `/ctr-divider-2305`, tytuł „Contract Test - divider" (status `draft`)
> **Route public:** `http://localhost:3000/test-divider-0516` (tytuł „TEST-DIVIDER-0516", osobna opublikowana strona)
> **Pliki źródłowe:** `core/widgets/core/divider.tsx` (model + normalizacja + renderer `DividerBlock`), `core/admin/ui/widgets/editors/DividerEditors.tsx` (edytory), `core/admin/ui/widgets/editors/{SharedColorControl,ClearableFields,TokenOrPixelField}.tsx` (pola wspólne)

> **Metodologia — czym ten przebieg różni się od poprzedniego:** poprzedni raport (28-05)
> klikał kontrolki *reprezentatywnie* (np. tylko Label size, tylko alignment Left, tylko
> opacity Muted) i jawnie wymieniał luki w sekcji „Czego nie testowałem". **Ten przebieg
> przeszedł przez WSZYSTKIE dyskretne opcje każdej dostępnej w fixture kontrolki**
> (każdy wariant, każdy preset selecta, każdy switch warunkowego odsłaniania), a efekt
> każdej zmiany weryfikowałem programowo na faktycznie wyrenderowanym elemencie
> `[data-divider]` (atrybuty `data-divider-*`, klasy i `getComputedStyle`).

> **Uwaga techniczna o środowisku (ważne):** katalog zrzutów Playwright (`.playwright-cli/`)
> jest **współdzielony przez równolegle działające sesje agentów**. Odczyt „najnowszego"
> pliku snapshotu (`ls -t | head`) zwracał pliki INNYCH widgetów (stats-kpi, spacer),
> co na starcie dało fałszywe wrażenie, że strona dividera zawiera Stats KPI. Po przejściu
> na inspekcję wyłącznie przez `--raw eval` (wynik trafia do mojego stdout, nie przez
> współdzielony plik) stan był stabilny i spójny — strona faktycznie zawiera **jeden**
> widget `divider` (potwierdzone też w backendzie: `currentData.blocks[0].type = divider`).

> **Uwaga o zrzutach:** nazwy plików PNG to wyłącznie lokalne etykiety przechwyceń.
> Same PNG nie są wymaganym evidence i **nie są commitowane** do repo.

---

## 1. Przegląd widgetu

**Typ:** `divider` · **Kategoria:** layout
**Opis (z definicji):** „Visual separator with optional centered label and spacing controls."
**Warianty:** `line`, `dashed`, `label-center` (Visual jest właścicielem wyboru wariantu — `editorCapabilities.visualOwnsVariantSelection: true`).

**Tryby edytora wg kontraktu (`dividerEditorContract`):**
- **Wizard** — 1 sekcja „Divider quick start" (rola `setup`), `writablePaths: []`, `readOnlyPaths: ["variant"]`.
- **Visual** — „Preview" (summary) + 3 sekcje edytowalne: „Variant and label", „Line style and width", „Spacing around divider".
- **Advanced** — „Preview" (summary) + „Runtime divider summary" (diagnostics, read-only) + „Support summary" (read-only).

**Stan początkowy fixture (przed audytem):** wariant `label-center`, etykieta „Sekcja testowa",
thickness 6, width container-lg, lineStyle dashed, dashPattern wide, opacity 50%, mt Hero / mb Compact
(pozostałość draftu z 28-05). **Stan końcowy** (zapisany draftem na koniec sesji) opisuje sekcja 4.5.

---

## 2. Co było faktycznie testowane (pełny zakres interakcji)

Wszystkie kliknięcia wykonano w żywej aplikacji; każdy efekt zweryfikowany na renderze.
Selecty to komponenty Radix — obsługiwane przez klik triggera (`[role=combobox]`) i klik
opcji (`[role=option]`). Pełne wyliczenie przejść w sekcji 3.

| Rodzina kontrolek | Liczba opcji | Przejście „przez wszystkie" |
|---|---|---|
| Karty wariantu | 3 | ✅ line, dashed, label-center |
| Center label (tekst) + Clear | — | ✅ wpis, render, Clear (czyszczenie) |
| Label color (swatch) | — | ✅ 2 kolory hex |
| Label size | 3 | ✅ Small / Medium / Large |
| Label weight | 3 | ✅ Medium / Semi-bold / Bold |
| Text transform | 2 | ✅ Normal case / Uppercase |
| Letter spacing | 2 | ✅ Normal / Wide |
| Label gap | 4 | ✅ Tight / Standard / Comfortable / Loose |
| Line thickness | 8 | ✅ Hairline … Maximum weight (1–8) |
| Width mode | 3 | ✅ Full / Container / Custom (+ warunkowe odsłanianie) |
| Container width | 3 | ✅ Narrow / Standard / Wide |
| Custom width | 5 | ✅ 240 / 320 / 480 / 640px / 75% |
| Horizontal alignment | 3 | ✅ Left / Center / Right |
| Line color (swatch) | — | ✅ 2 kolory hex |
| Line style | 3 | ✅ Solid / Dashed / Dotted (+ warunkowe odsłanianie dash pattern) |
| Line emphasis (opacity) | 4 | ✅ Solid / Soft / Muted / Faint |
| Visibility | 2 | ✅ Spacer only / Visible line |
| Dash pattern | 3 | ✅ Default / Short / Wide |
| Top spacing | 13 | ✅ wszystkie presety (none … Hero gap) |
| Bottom spacing | 13 | ✅ wszystkie presety (none … Hero gap) |

Dodatkowo: **Wizard** (read-only), **Advanced** (read-only diagnostyka), **persistencja**
(Save draft → reload → ponowna weryfikacja + odczyt z backendu), **front** `/test-divider-0516`
(HTTP, konsola, DOM 3 dividerów, overflow @1280 i @375).

---

## 3. Co działa (potwierdzone na renderze — pełne wyliczenie)

### 3.1 Wizard (read-only setup)
- „Run setup again" otwiera Wizard; **0 kontrolek edytowalnych** (`data-widget-control-ownership="writable"` = pusta lista; 0 inputów/comboboxów/przycisków w panelu poza Finish).
- Jedyny wiersz to **read-only `variant`** — pokazuje bieżący wariant („Label center"); zgodne z `readOnlyPaths: ["variant"]`.
- Tekst pomocniczy: „Visual owns divider style changes, center labels, line weight, color, width, and spacing."
- „Live divider preview" renderuje **bieżący** stan przez ten sam renderer (etykieta i styl identyczne z canvas).
- „Finish setup and open Visual" wraca do Visual **bez resetu danych** (po powrocie stan w pełni zachowany — variant, thickness 5, container-lg, dashed, mt 96px, mb 48px, etykieta).

### 3.2 Visual — Variant and label

| Kontrolka | Przejście | Zweryfikowany efekt na renderze |
|---|---|---|
| Karty wariantu | line | `data-divider-variant=line`, kontener z `role="separator"` + `aria-orientation="horizontal"`, `has-label=false` |
| | dashed | `variant=dashed`, `role="separator"` obecny |
| | label-center | `variant=label-center`, **brak** `role="separator"`, `has-label=true` |
| Center label | wpis „Audyt 29-05 divider" | render span aktualizuje tekst; `has-label=true` |
| Center label → Clear | klik „Clear" | input pusty, span etykiety znika, `has-label=false`, przycisk „Clear" przechodzi w `disabled` |
| Label color (swatch) | `#ff0000`, `#1e88e5` | kolor renderowanej etykiety = `rgb(255,0,0)` → `rgb(30,136,229)`; status swatcha „Selected color" |
| Label size | Small / Medium / Large | klasa spana `text-xs` / `text-sm` / `text-base` |
| Label weight | Medium / Semi-bold / Bold | `font-medium` / `font-semibold` / `font-bold` |
| Text transform | Normal case / Uppercase | `normal-case` / `uppercase` |
| Letter spacing | Normal / Wide | `tracking-normal` / `tracking-wider` |
| Label gap | Tight / Standard / Comfortable / Loose | kontener `gap-2` / `gap-3` / `gap-4` / `gap-6` |

### 3.3 Visual — Line style and width

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Line thickness | Hairline → Maximum weight (8 wartości) | `data-divider-thickness` 1→8; wysokość linii `1px`→`8px` (każdy krok) |
| Width mode | Full | `width-mode=full`, `width-kind=full`, brak inline width; **ukryte** Container width, Custom width, Alignment |
| | Container | `width-mode=container`; **odsłonięte** Container width + Alignment |
| | Custom | `width-mode=custom`; **odsłonięte** Custom width + Alignment |
| Container width | Narrow / Standard / Wide | `width-kind` container-sm/md/lg; inline width `min(100%, 40rem)` / `48rem` / `64rem` |
| Custom width | 240/320/480/640px / 75% | inline width = `240px`/`320px`/`480px`/`640px`/`75%`; helper „Selected width: …" aktualizuje się |
| Horizontal alignment | Left / Center / Right | klasa kontenera `mr-auto` / `mx-auto` / `ml-auto` (potwierdzone marginesami auto) |
| Line color (swatch) | `#d81b60`, `#00897b` | `color-kind=hex`; gradient linii przyjmuje kolor (`rgb(216,27,96)` → `rgb(0,137,123)`) |
| Line style | Solid | `line-style=solid`, `backgroundColor` ustawiony, brak `background-image` |
| | Dashed | `line-style=dashed`, `repeating-linear-gradient`; **odsłonięty** Dash pattern |
| | Dotted | `line-style=dotted`, `radial-gradient(circle, …)`; Dash pattern ukryty |
| Line emphasis (opacity) | Solid/Soft/Muted/Faint | `opacity` 1 / 0.75 / 0.5 / 0.25 — **na linii ORAZ na etykiecie** |
| Visibility | Spacer only | `visibility=spacer-only`, element ma **0 dzieci** (czysty odstęp), `has-label=false`, hint „Spacer-only hides the label…"; Dash pattern ukryty |
| | Visible line | `visibility=line`, linia wraca (1 dziecko), `has-label=true` |
| Dash pattern | Default / Short / Wide | gradient `0→8px / 8→12px` (8/4) · `0→6px / 6→9px` (6/3) · `0→14px / 14→22px` (14/8) |

**Warunkowe odsłanianie działa w pełni:** pola etykiety tylko dla `label-center`;
Container width tylko dla width=container; Custom width tylko dla width=custom;
Alignment tylko gdy width≠full; Dash pattern tylko gdy `visibility=line` **i** `lineStyle=dashed`.

### 3.4 Visual — Spacing around divider
- **Top spacing** — przejście przez wszystkie 13 presetów: `No extra space`=0px (kind `none`), `Micro`=4px, `Tiny`=8px, `Extra small`=12px, `Small`=16px, `Small plus`=20px, `Compact`=24px, `Card`=32px, `Comfortable`=40px, `Standard`=48px, `Section`=64px, `Large section`=80px, `Hero`=96px (kind `token`).
- **Bottom spacing** — przejście przez wszystkie 13 presetów: wartości identyczne jak wyżej (0px→96px).
- **Pozycja „Custom value unavailable" jest obecna i `disabled`** (lista ma 14 elementów = 13 presetów + 1 wyłączony). Potwierdza to: (a) token `0` jest filtrowany na rzecz `none` (`buildVisibleOffTokenOptions`), (b) wpisanie własnej wartości px jest zablokowane (`allowCustom=false`).

### 3.5 Persistencja (Save draft → reload)
- „Save draft" → toast **„Draft saved."**.
- Backend (`/admin/api/pages/…` → `currentData.blocks[0].data`) zapisał komplet pól:
  `align=center, color=#00897b, label="Audyt 29-05 divider", width=container, opacity=75, labelGap=4, labelSize=base, lineStyle=dashed, marginTop=24, thickness=5, labelColor=#1e88e5, visibility=line, customWidth=75%, dashPattern=wide, labelWeight=semibold, marginBottom=12, containerWidth=lg, labelTransform=uppercase, labelLetterSpacing=wide`.
- Po **reloadzie** edytor odtworzył cały stan z backendu: `variant=label-center, thickness=5, color-kind=hex, width-kind=container-lg, line-style=dashed, visibility=line, has-label=true`, mt `96px` / mb `48px`, etykieta „Audyt 29-05 divider" w kolorze `rgb(30,136,229)`, klasa `text-base font-semibold uppercase tracking-wider`, opacity linii `0.75`, gradient z dash 14px. ✅

_Zrzut (lokalny): `divexh-admin-visual-29-05.png`_

### 3.6 Advanced — read-only, wiernie odzwierciedla stan
- **0 kontrolek edytowalnych** i **0 inputów/comboboxów/przycisków** w panelu widgetu.
- „Runtime divider summary" (zgodne ze stanem zapisanym):
  - Variant: **Label center**
  - Line: **dashed, Bold, Soft, visible line**
  - Width: **Wide content width, aligned center.**
  - Spacing: **Top Hero gap, bottom Standard gap.**
  - Label: **Audyt 29-05 divider (base, semibold)**
- „Support summary": nota o normalizacji + **„Preset-only width and spacing values are saved."** (poprawnie — aktywny tryb to container i tokenowe marginesy; zapisane `customWidth=75%` jest nieaktywne i nie wpływa na flagę `hasSavedCompatibility`).
- Panel pokazuje też **read-only podsumowania bloku** page-buildera (poza kontraktem widgetu): „Block layout summary" (Content width default, Padding MD/MD, Margin None/None) oraz „Visibility summary" → **„Hidden on all devices"**.

### 3.7 Front (`/test-divider-0516`)
- HTTP **200** (`text/html`), **0 błędów i 0 ostrzeżeń konsoli**.
- Strona zawiera **3 opublikowane dividery** (osobna strona od edytowanego fixture):
  1. `line` / `line-style=solid` / full / thickness 1 / bez etykiety / `role="separator"` + `aria-orientation="horizontal"`,
  2. `dashed` (wariant) / **`line-style=solid`** / full / bez etykiety / `role="separator"` + `aria-orientation="horizontal"`,
  3. `label-center` / solid / full / etykieta **„OR"** / **bez** `role="separator"` i bez `aria-orientation`.
- Marginesy domyślne `24px` (1.5rem) na wszystkich trzech.
- **Brak poziomego overflow:** `scrollWidth == clientWidth` przy **1280px** (1280=1280) i **375px** (375=375). ✅

_Zrzuty (lokalne): `divexh-front-desktop-1280-29-05.png`, `divexh-front-mobile-375-29-05.png`_

---

## 4. Co NIE działa / problemy funkcjonalne

- **Nie wykryto błędów funkcjonalnych.** Każda dyskretna opcja każdej dostępnej kontrolki, którą udało się kliknąć (a w tym przebiegu kliknięto je wszystkie — patrz sekcja 3), realnie zmieniała render zgodnie z modelem i przetrwała zapis draftu + reload. Wizard i Advanced zachowują się dokładnie zgodnie z kontraktem (setup-only / read-only).
- Brak błędów konsoli na froncie; brak regresji renderu względem poprzednich przebiegów.

---

## 5. Czego NIE dało się w pełni zweryfikować (i dlaczego — konkretnie)

1. **Natywny dialog koloru OS (`input[type=color]`)** — dotyczy **Line color** i **Label color**. Kliknięcie swatcha otwiera systemowy picker, którego nie da się obsłużyć w headless. **Obejście:** ustawiałem `value` natywnym setterem + `input`/`change` (ścieżka zgodna z React `onChange` → `onSwatchChange`); propagacja zadziałała i efekt na renderze potwierdzony (sekcje 3.2, 3.3). To **ograniczenie harnessu, nie defekt widgetu**.
2. **Wyłączona pozycja „Saved custom width"** w `CustomWidthField` — renderuje się **wyłącznie**, gdy zapisany `customWidth` NIE należy do 5 presetów (`legacy-custom`, `disabled`). Z UI można ustawić tylko presety, więc tej gałęzi **nie da się aktywować z poziomu interfejsu** w tym fixture. Lista custom width zawierała tylko 5 presetów (0 pozycji disabled). Wymagałaby wstrzyknięcia nie-presetowej wartości po stronie backendu.
3. **Własna wartość px odstępu („Custom value unavailable")** — celowo wyłączona (`allowCustom=false`). Potwierdziłem, że pozycja jest obecna i `disabled`; **z założenia nie da się jej aktywować**. To nie defekt, to projekt.
4. **Przycisk „Clear" dla kolorów (Line/Label color)** — **nie istnieje**. `ColorField` nie przekazuje `onClear` do `SharedColorControl`, więc nagłówek pola nie renderuje przycisku „Clear". Jedyny działający „Clear" w edytorze dotyczy **tekstu etykiety** (zweryfikowany, sekcja 3.2). Nie ma więc czego klikać dla kolorów.
5. **Przycisk „Use transparent"** — **nie istnieje** dla kolorów dividera. `ColorField` nie przekazuje `allowTransparent`, więc przycisk się nie renderuje. Nie ma czego testować.
6. **Round-trip moich edycji na trasę publiczną** — fixture admin (`/ctr-divider-2305`, status `draft`) to **inna strona** niż opublikowana `/test-divider-0516` (id `37fbfa5f…`). Wykonałem wyłącznie **Save draft** (świadomie nie publikowałem — Publish to akcja widoczna publicznie, a i tak nie zmieniłaby `/test-divider-0516`). W efekcie front zweryfikowałem **niezależnie**, pod kątem poprawności renderu 3 opublikowanych dividerów, a nie odzwierciedlenia moich edycji.
7. **Efekt blokowego „Hidden on all devices"** — to ustawienie page-buildera (poza edytorem widgetu), widoczne jako read-only w Advanced. Ponieważ fixture nie jest opublikowany, nie weryfikowałem jego realnego skutku na żywej trasie.

---

## 6. Uwagi UX/UI i dostępności (niuanse, nie defekty)

1. **„Line emphasis" (opacity) działa łącznie na linię i etykietę.** Ta sama wartość `opacity` (1 / 0.75 / 0.5 / 0.25) trafia na linię **oraz** na tekst etykiety — nie da się przyciemnić samej linii bez przyciemnienia etykiety (potwierdzone na wszystkich 4 poziomach).
2. **Niespójna semantyka separatora między wariantami.** `line` i `dashed` renderują kontener z `role="separator"` + `aria-orientation="horizontal"`. `label-center` z etykietą renderuje zwykły `flex`-div (linie jako `span[aria-hidden]`) — **bez** `role="separator"`. Dla czytników ekranu divider z etykietą nie jest ogłaszany jako separator (potwierdzone w adminie i na froncie, divider #3).
3. **Wariant „Dashed" nie wymusza linii przerywanej.** `lineStyle` jest niezależny; wariant ustala tylko *domyślny* styl. Na froncie divider #2 ma wariant `dashed`, ale `line-style=solid` → renderuje się jako linia ciągła. Nazwa wariantu może mylić.
4. **Odstępy są wyłącznie tokenowe** (`allowCustom=false`): rozwijane Top/Bottom mają wyłączoną pozycję „Custom value unavailable", a mimo to copy w Advanced/Support mówi o „saved custom spacing" (kompatybilność dla wartości spoza presetów). Drobna niespójność słownictwa względem tego, co realnie da się ustawić z UI.
5. **Pola koloru — mylące copy w stanie domyślnym (z kodu).** Dla domyślnych tokenów (`var(--color-border)`/`var(--color-text)`) `SharedColorControl` pokazuje etykietę **„Saved custom color"** oraz tekst **„A saved custom color is configured. Pick a swatch to replace it, or clear the field."** — sugerując zapisany kolor własny i przycisk „Clear", którego (patrz 5.4) **nie ma**. W tym przebiegu nadpisałem kolory wartościami hex, więc obserwowałem status **„Selected color"** (bez tego helpera); niuans dotyczy stanu tokenowego i jest potwierdzony w źródle `SharedColorControl.tsx`.
6. **`customWidth=75%` pozostaje zapisany, choć nieaktywny**, gdy width=container. Advanced słusznie raportuje „Preset-only…", bo ocenia tylko aktywny tryb szerokości — ale w danych nadal siedzi wartość z wcześniejszego trybu custom (normalizer celowo zachowuje wszystkie pola).
7. **Wizard jest de facto pusty** — poza read-only podsumowaniem wariantu i podglądem nie ma tu nic do konfiguracji (celowe; ten sam wzorzec co Section/Spacer).
8. **Comboboxy to Radix (nie natywny `<select>`).** Wymagają kliknięcia triggera i opcji; natywna komenda `select` na nich nie działa — niuans harnessu, nie błąd widgetu.

---

## 7. Podsumowanie

| Tryb / obszar | Charakter | Wynik audytu (przebieg wyczerpujący) |
|---|---|---|
| **Wizard** | Read-only setup + preview | ✅ 0 pól edycji; tylko read-only `variant`; powrót do Visual bez resetu |
| **Visual** | Główny edytor (Preview + 3 sekcje) | ✅ **Wszystkie** dyskretne opcje wszystkich kontrolek działają, aktualizują render, są trwałe po zapisie; warunkowe odsłanianie poprawne |
| **Advanced** | Preview + 2 sekcje diagnostyczne | ✅ 0 kontrolek edytowalnych; podsumowania 1:1 ze stanem |
| **Persistencja** | Save draft → reload | ✅ Komplet pól w backendzie i pełne odtworzenie po reloadzie |
| **Front** | `/test-divider-0516` (3 dividery) | ✅ HTTP 200, 0 błędów konsoli, brak overflow (1280/375) |

**Werdykt końcowy:** Po przejściu przez **wszystkie** dostępne opcje każdej kontrolki widget
`divider` jest sprawny i spójny między edytorem a rendererem; nie wykryto żadnego defektu
funkcjonalnego. Warianty Wizard/Advanced realizują zadeklarowany kontrakt (setup-only /
read-only), a Visual obsługuje pełną konfigurację z poprawnym warunkowym odsłanianiem pól
i trwałym zapisem. Pozycje z sekcji 5 to albo świadome ograniczenia projektu (px-spacing,
brak przycisku Clear/transparent dla kolorów), albo ograniczenia harnessu (natywny picker
koloru), a nie błędy. Najważniejsze niuanse to sekcja 6: wspólna `opacity` linii i etykiety,
brak `role="separator"` dla wariantu z etykietą oraz mylące „Saved custom color" dla
domyślnych tokenów.

---

## 8. Zrzuty (etykiety lokalne, niecommitowane)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `divexh-admin-visual-29-05.png` | Admin, Visual po edycjach (stan zapisany draftem, po reloadzie) |
| `divexh-front-desktop-1280-29-05.png` | Front `/test-divider-0516`, 1280px (3 dividery, brak overflow) |
| `divexh-front-mobile-375-29-05.png` | Front `/test-divider-0516`, 375px (brak overflow) |
