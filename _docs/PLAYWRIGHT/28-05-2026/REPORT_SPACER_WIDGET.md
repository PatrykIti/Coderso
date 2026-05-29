# RAPORT: Spacer Widget — audyt wyczerpujący (Wizard / Visual / Advanced + front)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (plik pozostaje w katalogu `28-05-2026/` — upgrade istniejącego raportu)
> **Sesja przeglądarki:** `claude-29-05-spacer-exhaustive` (izolowana, oddzielna od innych agentów, zamknięta po audycie)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `719cca9b-25fe-43ba-a17c-24407f3f2d36` (tytuł „Contract Test - spacer")
> **Fixture public:** `http://localhost:3000/test-spacer-0516`
> **Pliki źródłowe:** `core/widgets/core/spacer.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/SpacerEditors.tsx` (edytory Wizard/Visual/Advanced), `core/admin/ui/widgets/editors/TokenOrPixelField.tsx` (kontrolka wysokości)

> **Metodologia — różnica względem poprzedniej wersji:** Poprzedni raport stosował
> „reprezentatywne" próbki (np. kliknięcie 5 z 14 tokenów). **Ten przebieg jest
> wyczerpujący**: faktycznie kliknąłem **każdy** dostępny token w **każdym** z trzech
> selectów wysokości (Desktop / Tablet / Mobile = 3 × 14 = 42 wybory), oba warianty,
> wszystkie 3 presety, zablokowaną opcję custom oraz przełącznik guide w obie strony.
> Każdą zmianę weryfikowałem programowo na realnie wyrenderowanym elemencie:
> atrybuty `data-spacer-*`, zmienne CSS `--spacer-*-height` oraz wyliczona wysokość
> (`getComputedStyle().height`). Na froncie zmierzyłem wysokość na trzech szerokościach
> viewportu i sprawdziłem brak overflow.

> **Uwaga o zrzutach:** Nazwy plików PNG w sekcji 9 to **wyłącznie lokalne etykiety**
> przechwyceń Playwright. Same pliki są zapisane w katalogu roboczym i są **ignorowane
> przez Git** (potwierdzone `git check-ignore`) — nie są commitowane i nie stanowią
> wymaganego evidence.

---

## 1. Przegląd widgetu i powierzchnia kontrolek

**Typ:** `spacer` · **Kategoria:** layout
**Opis (z definicji):** „Responsive vertical spacing primitive for clean rhythm control".
**Warianty:** `responsive` (niezależne wysokości desktop/tablet/mobile) oraz `fixed` (jedna wysokość współdzielona przez wszystkie breakpointy).

**Model danych (`SpacerData`):** `height.desktop`, `height.tablet`, `height.mobile` (string: token lub własna długość) oraz `showGuideInEditor` (boolean). W trybie `fixed` tablet/mobile są ignorowane w renderze, ale **zachowywane** w danych.

**Tokeny rytmu (15 w kodzie, 14 widocznych w UI):**

| Token | Etykieta UI | CSS | Wysokość @desktop |
|-------|-------------|-----|-------------------|
| `none` | No extra space | 0rem | 0 px |
| `0` | *(ukryty — duplikat `none`)* | 0rem | — |
| `1` | Micro gap | 0.25rem | 4 px |
| `2` | Tiny gap | 0.5rem | 8 px |
| `3` | Extra small gap | 0.75rem | 12 px |
| `4` | Small gap | 1rem | 16 px |
| `5` | Small plus gap | 1.25rem | 20 px |
| `6` | Compact gap | 1.5rem | 24 px |
| `8` | Card gap | 2rem | 32 px |
| `10` | Comfortable gap | 2.5rem | 40 px |
| `12` | Standard gap | 3rem | 48 px |
| `16` | Section gap | 4rem | 64 px |
| `20` | Large section gap | 5rem | 80 px |
| `24` | Hero gap | 6rem | 96 px |
| `32` | Extra large gap | 8rem | 128 px |

**Presety rytmu (3):** Card gap = 8/6/4 · Section gap = 16/12/8 · Hero gap = 24/20/16.

**Renderer (`SpacerBlock`):** `<div aria-hidden="true">` z klasami `h-[var(--spacer-mobile-height)]` (baza), `md:` = tablet, `lg:` = desktop, plus zmienne CSS per breakpoint. Etykieta-przewodnik (guide) renderuje się **tylko** gdy `showGuideInEditor` ON **i** kontekst to edytor/podgląd (lub przekazano `previewDevice`) — nigdy na publicznym froncie.

**Rodziny kontrolek widoczne w tym fixture:**
- karty wariantów (radio-cards) — **2 opcje**,
- karty presetów (radio-cards / shortcut buttons) — **3 opcje**,
- selecty/comboboxy wysokości (Radix Select) — **3 selecty × 14 tokenów + 1 opcja zablokowana**,
- switch „Show guide in editor" — **1 toggle (2 stany)**,
- zakładki trybów edytora — Visual / Advanced + Wizard przez „Run setup again".

**Rodziny kontrolek, których w tym widgecie NIE MA** (i dlatego nie były testowane — bo nie istnieją): add/remove/reorder pozycji powtarzalnych, color clear / transparent buttons. Spacer nie ma żadnej listy powtarzalnej ani kontrolki koloru.

---

## 2. Co było testowane (pełny zakres realnych interakcji)

| Rodzina | Co dokładnie kliknięto | Liczba interakcji |
|---|---|---|
| Wizard | wejście „Run setup again", odczyt read-only, wyjście „Finish setup and open Visual" | 2 + inspekcja |
| Warianty | Responsive → Fixed → (preset w Fixed) → Responsive | 3 przełączenia |
| Presety | Card gap, Section gap, Hero gap (w responsive) + Card gap/Section gap w Fixed | 5 |
| Desktop height | **wszystkie 14 tokenów** | 14 |
| Tablet height | **wszystkie 14 tokenów** | 14 |
| Mobile height | **wszystkie 14 tokenów** | 14 |
| Opcja custom | próba kliknięcia zablokowanej pozycji „Custom value unavailable" | 1 |
| Guide switch | ON → OFF → ON | 2 |
| Advanced | odczyt obu sekcji + weryfikacja braku kontrolek | inspekcja |
| Persistencja | Save draft → odczyt toasta → reload → ponowna weryfikacja | pełen round-trip |
| Front | otwarcie trasy, pomiar wysokości @375/800/1280, overflow, konsola, DOM | 3 viewporty |

Weryfikacja każdej zmiany: `data-spacer-variant/desktop/tablet/mobile/show-guide/preview-height`, zmienne CSS `--spacer-*-height`, `getComputedStyle().height`, `childElementCount` (obecność guide), tekst etykiety guide.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard — read-only, zgodny z kontraktem
- Wejście przyciskiem **„Run setup again"** (stan domyślny: baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics.").
- Region **„Spacer quick start"** zawiera **0 kontrolek edytowalnych** (zweryfikowane programowo na elemencie regionu: `input/select/textarea/switch/combobox` = 0; jedyny przycisk to tooltip „Rhythm presets info"). Zgodne z `writablePaths: []`.
- Pokazuje read-only: „Spacer mode: Responsive", „Rhythm presets: Desktop: 24 / Tablet: 20 / Phone: 16", „Desktop height: 24", oraz notę „Visual owns the editor guide toggle after setup…".
- Przycisk **„Finish setup and open Visual"** poprawnie przełącza do Visual (potwierdzone: po kliknięciu `aria-selected=true` na zakładce „Visual").
- Panel „Live preview" obok renderuje aktualny stan przez współdzielony renderer (etykieta „Spacer Hero gap").

### 3.2 Tryb Visual — karty wariantów (2/2)
| Akcja | Efekt w canvas | Wynik |
|---|---|---|
| **Responsive** (stan wyjściowy) | `variant=responsive`, pola Desktop/Tablet/Mobile widoczne | ✅ |
| **Fixed** | `variant=fixed`; render kolapsuje do desktop (24/24/24); pola **Tablet/Mobile znikają**; pojawia się „Fixed mode uses desktop height for tablet and mobile." oraz „Fixed mode preserves the saved tablet and mobile heights…" | ✅ |
| **Responsive** (powrót) | `variant=responsive`; tablet/mobile **przywrócone z danych** (po sekwencji: desktop=8 z Fixed Card gap, tablet=20, mobile=16) — bez utraty fallbacku | ✅ non-destructive |

### 3.3 Tryb Visual — karty presetów (3/3)
| Preset | data-spacer (d/t/m) | Chooser | Wynik |
|---|---|---|---|
| Card gap | 8 / 6 / 4 | „Current preset: Card gap." | ✅ |
| Section gap | 16 / 12 / 8 | „Current preset: Section gap." | ✅ |
| Hero gap | 24 / 20 / 16 | „Current preset: Hero gap." | ✅ |

**Preset w trybie Fixed (potwierdzone zachowanie desktop-only):** kliknięcie „Card gap" gdy `variant=fixed` zmienia **tylko** desktop=8 (render 8/8/8), ale zapisane tablet=20/mobile=16 pozostają nienaruszone. Chooser przechodzi wtedy na „Manual heights are active. Presets stay available as shortcuts." — ponieważ zapisany zestaw (8/20/16) nie odpowiada żadnemu presetowi. To jawnie potwierdza non-destructive fallback.

### 3.4 Tryb Visual — selecty wysokości: WSZYSTKIE 14 tokenów × 3 breakpointy

**Desktop height** — wszystkie 14 tokenów kliknięte, każdy odwzorowany 1:1 na atrybut, preview-height oraz wyliczoną wysokość:

| Etykieta | `data-spacer-desktop` | computed height | Etykieta guide |
|---|---|---|---|
| No extra space | none | 0px | Spacer No extra space |
| Micro gap | 1 | 4px | Spacer Micro gap |
| Tiny gap | 2 | 8px | Spacer Tiny gap |
| Extra small gap | 3 | 12px | Spacer Extra small gap |
| Small gap | 4 | 16px | Spacer Small gap |
| Small plus gap | 5 | 20px | Spacer Small plus gap |
| Compact gap | 6 | 24px | Spacer Compact gap |
| Card gap | 8 | 32px | Spacer Card gap |
| Comfortable gap | 10 | 40px | Spacer Comfortable gap |
| Standard gap | 12 | 48px | Spacer Standard gap |
| Section gap | 16 | 64px | Spacer Section gap |
| Large section gap | 20 | 80px | Spacer Large section gap |
| Hero gap | 24 | 96px | Spacer Hero gap |
| Extra large gap | 32 | 128px | Spacer Extra large gap |

**Tablet height** — wszystkie 14 tokenów kliknięte, każdy odwzorowany na `data-spacer-tablet` oraz zmienną CSS `--spacer-tablet-height` (none→0rem, 1→0.25rem, 2→0.5rem, 3→0.75rem, 4→1rem, 5→1.25rem, 6→1.5rem, 8→2rem, 10→2.5rem, 12→3rem, 16→4rem, 20→5rem, 24→6rem, 32→8rem). ✅ wszystkie zgodne.

**Mobile height** — wszystkie 14 tokenów kliknięte, każdy odwzorowany na `data-spacer-mobile` oraz `--spacer-mobile-height` (identyczna mapa jak wyżej). ✅ wszystkie zgodne.

> Uwaga metodologiczna: zmiana tabletu/mobile nie zmienia wyliczonej wysokości w canvas
> (canvas renderuje szerokość desktop = breakpoint `lg:`), dlatego dla tych dwóch selektów
> weryfikowałem atrybut `data-spacer-*` i zmienną CSS, a faktyczne przełączanie breakpointów
> potwierdziłem osobno na froncie przez resize (sekcja 3.8).

### 3.5 Tryb Visual — switch „Show guide in editor" (2/2 stany)
- **OFF:** `data-spacer-show-guide=false`, element-przewodnik **usunięty z DOM** (`childElementCount=0`), switch `aria-checked=false`. ✅
- **ON:** `data-spacer-show-guide=true`, element-przewodnik **wraca** (`childElementCount=1`), switch `aria-checked=true`, etykieta renderuje się poprawnie. ✅
- Pozostałe 3 switche w panelu („Device visibility": Desktop/Tablet/Mobile) to kontrolki **page-buildera**, nie edytora spacer — poza zakresem (sekcja 5).

### 3.6 Persistencja (Save draft → reload)
- Ustawiłem stan kontrolny: Responsive, preset **Hero gap** (24/20/16), guide **ON**.
- Po „Save draft" **przechwyciłem toast „Draft saved."** (`role=status`).
- Po pełnym reloadzie strony canvas wrócił **identyczny**: `variant=responsive, desktop=24, tablet=20, mobile=16, showGuide=true, guide="Spacer Hero gap"`. ✅ Round-trip draftu działa.

### 3.7 Tryb Advanced — read-only, wiernie odzwierciedla stan
- **0 kontrolek edytowalnych i 0 przycisków** w tabpanelu Advanced (zweryfikowane programowo).
- **„Runtime spacing summary"** (stan testowy: Fixed po Section gap): Desktop/Tablet/Mobile height = wszystkie „Section gap" (render kolapsuje do desktop), „Editor guide: Shown in editor previews".
- **„Support summary":** „Spacer mode: Fixed rhythm" oraz **„Saved responsive fallback: Tablet or mobile fallback values are preserved for responsive mode."** — detekcja działa: zapisane tablet=12/mobile=8 ≠ desktop=16, więc Advanced raportuje zachowany fallback.
- W zakładce Advanced obecne są też 3 read-only sekcje **page-buildera** (poza zakresem audytu widgetu): „Block layout summary" (Content width: default; Padding: Top MD, bottom MD; Margin: Top None, bottom None) oraz „Visibility summary" (Shown on: „Hidden on all devices").

### 3.8 Front (`/test-spacer-0516`)
- Tytuł „TEST-SPACER-0516", **0 błędów / 0 ostrzeżeń** w konsoli.
- Renderuje **1** spacer: `<div aria-hidden="true">` z klasami `relative w-full shrink-0 h-[var(--spacer-mobile-height)] md:h-[…tablet] lg:h-[…desktop]`.
- Stan **opublikowany**: `variant=responsive, desktop=32, tablet=16, mobile=8`; zmienne CSS mobile=2rem, tablet=4rem, desktop=8rem.
- **Responsywność potwierdzona pomiarem `getComputedStyle().height`:**
  - 375 px → **32 px** (mobile, 2rem),
  - 800 px → **64 px** (tablet, 4rem, breakpoint `md:`),
  - 1280 px → **128 px** (desktop, 8rem, breakpoint `lg:`).
- **Brak poziomego overflow** na wszystkich trzech szerokościach (`scrollWidth == clientWidth`). ✅
- `data-spacer-show-guide="true"`, ale `childElementCount=0` → **guide NIE jest renderowany na froncie** (zgodnie z projektem). ✅
- Struktura: pojedynczy `<section>`, strona celowo minimalna (brak widocznej treści — spacer dekoracyjny).

---

## 4. Co NIE działa / ograniczenia

**Nie wykryto żadnego błędu funkcjonalnego.** Każda z 42 selekcji tokenów, oba warianty,
wszystkie 3 presety, oba stany switcha, persistencja i render frontu zadziałały zgodnie
z oczekiwaniem. Wizard i Advanced są w 100% read-only, dokładnie jak deklaruje kontrakt.

**Świadome ograniczenia produktowe (nie crashe — ale realnie zawężają autora):**

- **L1 — Brak wprowadzania własnej długości przez UI.** Selekt wysokości jest wywoływany
  z `allowCustom={false}`. W rozwiniętej liście pozycja custom jest **zablokowana**
  („Custom value unavailable", `aria-disabled=true`, `pointer-events-none`). Potwierdziłem
  to realnie: próba kliknięcia tej pozycji **zakończyła się timeoutem Playwright**
  (element nieinteraktywny), a `data-spacer-desktop` pozostał bez zmian. Pole tekstowe na
  własną wartość jest ukryte (`hidden`). Model i normalizator (`normalizeSpacerCustomHeightInput`)
  wspierają `px`/`rem`/`vh/dvh/svh/vw`/`clamp(...)`, a `schema` przyjmuje dowolny string —
  więc własne wysokości są możliwe **wyłącznie przez API/import**, nie przez edytor.
- **L2 — Token `0` ukryty w selekcie.** `buildVisibleOffTokenOptions` usuwa `0`, bo `none`
  daje tę samą wartość 0rem. Celowa deduplikacja → 14 widocznych tokenów zamiast 15.

---

## 5. Czego NIE dało się przetestować (z dokładnym powodem)

- **Własna długość px/rem/vh/clamp przez UI** — **zablokowane** (L1). Opcja w selekcie jest
  `disabled` i nieklikalna (potwierdzony timeout), pole tekstowe ukryte. Ścieżki tej **nie da
  się** wywołać z edytora w obecnym fixture; logikę normalizatora znam wyłącznie z kodu.
- **Token `0`** — **niedostępny w UI** (L2, ukryty przez deduplikację). Nie można go kliknąć,
  bo nie ma go na liście (14 widocznych pozycji).
- **Publikacja (Publish)** — **świadomie pominięta**, by nie zmieniać stanu publicznej trasy.
  Wykonałem tylko „Save draft". W efekcie front serwuje stan **opublikowany**
  (responsive, 32/16/8), a nie mój draft (24/20/16) — front zweryfikowałem pod kątem
  poprawności renderu i responsywności spacera, a nie round-tripu moich edycji do publicznej trasy.
- **Ścieżka `previewDevice` renderera** — w canvas edytora **nie ma przełącznika urządzenia**
  desktop/tablet/mobile. Funkcja `resolvePreviewHeight` istnieje w kodzie, ale nie da się jej
  wywołać z UI. Faktyczne przełączanie breakpointów potwierdziłem na froncie przez resize
  viewportu (375/800/1280).
- **Sekcje page-buildera w Advanced/Visual** („Block layout", „Device visibility",
  „Block layout summary", „Visibility summary") — **poza zakresem audytu widgetu spacer**;
  odnotowane tylko jako kontekst. Uwaga: „Visibility summary" pokazała „Hidden on all devices"
  w stanie draft — to ustawienie bloku page-buildera, nie spacer; nie weryfikowałem jego
  wpływu na froncie (front i tak renderuje stan opublikowany).

---

## 6. Uwagi UX/UI (niuanse, nie błędy)

1. **Wizard pokazuje surowe tokeny zamiast etykiet** („Desktop: 24 / Tablet: 20 / Phone: 16"),
   podczas gdy Visual i Advanced używają nazw („Hero gap" itd.). Drobna niespójność między trybami.
2. **Kolizja nazw token vs preset.** Etykiety wysokości („Card gap"=8, „Section gap"=16,
   „Hero gap"=24) są **identyczne** z nazwami presetów („Card gap"=8/6/4 itd.), choć oznaczają
   co innego (pojedynczy token vs zestaw 3 breakpointów). Combobox „Desktop height: Card gap"
   (token 8) ≠ preset „Card gap" (8/6/4). Potencjalnie mylące.
3. **Chooser i Advanced czytają ZAPISANE dane, nie render.** W trybie Fixed render kolapsuje
   do desktop, ale chooser nadal pokazuje preset wynikający z zapisanego zestawu (np.
   „Current preset: Section gap." przy danych 16/12/8), a Advanced raportuje „fallback
   preserved". To poprawne i pożądane (jawnie sygnalizuje, że fallback nie zniknął), ale wymaga
   świadomości, że to dwa różne widoki tego samego stanu.
4. **Warunkowe ukrywanie pól Tablet/Mobile w Fixed** (zamiast wyszarzania) — czysty UX,
   z czytelnym tekstem zastępczym.
5. **Guide tylko w edytorze/podglądzie.** Na froncie `data-spacer-show-guide="true"` pozostaje,
   ale element-przewodnik nie jest renderowany (childCount=0) — poprawnie. Atrybut na froncie
   jest nieszkodliwy, choć z punktu widzenia czystości DOM bywa zbędny.
6. **Toast „Draft saved." DZIAŁA.** Korekta względem poprzedniego raportu, który nie zdołał go
   przechwycić — w tym przebiegu komunikat `role=status` „Draft saved." pojawił się i został odczytany.
7. **Radix Select — niuanse narzędzia testowego (nie błąd widgetu):** natywna komenda `select`
   harnessu nie działa na Radix Select (trzeba kliknąć trigger + opcję). Dodatkowo refy
   snapshotu na kartach wariantów/presetów **stają się nieaktualne po re-renderze** (gdy badge
   „Selected" przeskakuje na inną kartę) — niezawodne okazały się lokatory rolowe
   (`getByRole('button', { name: /^Hero gap/ })`), nie refy `eNNN`.
8. **Brak przełącznika urządzenia w canvas** — responsywność realnie weryfikowalna dopiero na
   froncie przez resize (patrz sekcja 5).
9. **Kontrolki bloku w canvas** (Reorder / Move up/down / Duplicate / Delete) to operacje
   page-buildera na bloku, nie część edytora spacer — odnotowane jako kontekst.

---

## 7. Podsumowanie

| Tryb / obszar | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only summary + przejście do Visual | ✅ 0 kontrolek edycji (celowo); przejście działa |
| **Visual — warianty** | 2 karty (Responsive/Fixed) | ✅ obie + non-destructive fallback |
| **Visual — presety** | 3 karty | ✅ wszystkie 3 + zachowanie desktop-only w Fixed |
| **Visual — wysokości** | 3 selecty × 14 tokenów = 42 | ✅ **wszystkie 42** odwzorowane 1:1 |
| **Visual — custom** | opcja zablokowana | ⛔ celowo nieklikalna (potwierdzony timeout) |
| **Visual — guide** | switch 2 stany | ✅ ON/OFF + dodanie/usunięcie elementu z DOM |
| **Advanced** | 2 sekcje diagnostyczne | ✅ 0 kontrolek; fallback-detekcja działa |
| **Persistencja** | Save draft → reload | ✅ round-trip + toast „Draft saved." |
| **Front** | `/test-spacer-0516` (opublikowany) | ✅ 200, 32/64/128 px @375/800/1280, brak overflow, 0 błędów, guide niewidoczny |

**Werdykt końcowy:** W **wyczerpująco** przetestowanym zakresie widget `spacer` jest
**w pełni sprawny i spójny** między edytorem a rendererem. Przeklikanie wszystkich 42
kombinacji token×breakpoint nie ujawniło żadnej rozbieżności — każdy token mapuje się
poprawnie na atrybut, zmienną CSS i wyliczoną wysokość. Warianty, presety, switch guide
i persistencja draftu działają bez zarzutu; Fixed↔Responsive jest non-destructive, a
Advanced poprawnie wykrywa zachowany fallback. Jedyne realne ograniczenia to **zablokowane
w UI wprowadzanie własnych długości** (L1) oraz **ukryty token `0`** (L2) — obie to świadome
decyzje produktowe, nie defekty. Publikacja i ścieżka `previewDevice` nie były testowalne w
tym fixture z przyczyn opisanych w sekcji 5. Uwagi z sekcji 6 to niuanse UX, nie błędy.

---

## 8. Mapowanie kontrakt → realna kontrolka (skrót)

| Kontrakt (`spacerEditorContract`) | Tryb | Realny stan w UI |
|---|---|---|
| `spacer.wizard.quick-start` (writablePaths: []) | Wizard | ✅ read-only summary |
| `spacer.visual.variant` (writablePaths: variant) | Visual | ✅ 2 karty |
| `spacer.visual.rhythm` (writablePaths: height + 3 breakpointy) | Visual | ✅ 3 presety + 3 selecty × 14 |
| `spacer.visual.guide` (writablePaths: showGuideInEditor) | Visual | ✅ switch |
| `spacer.advanced.runtime-summary` (writablePaths: []) | Advanced | ✅ read-only |
| `spacer.advanced.support-summary` (writablePaths: []) | Advanced | ✅ read-only + fallback note |

---

## 9. Zrzuty (etykiety lokalne — git-ignored, niecommitowane)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `spacer-admin-visual-29-05.png` | Admin, tryb Visual (stan draft: Responsive, Hero gap, guide ON) |
| `spacer-public-desktop-29-05.png` | Front `/test-spacer-0516`, 1280 px (wysokość desktop = 128 px) |
| `spacer-public-mobile-375-29-05.png` | Front `/test-spacer-0516`, 375 px (wysokość mobile = 32 px, brak overflow) |
