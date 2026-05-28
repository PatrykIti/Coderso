# RAPORT: Spacer Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-spacer` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `719cca9b-25fe-43ba-a17c-24407f3f2d36` (tytuł „Contract Test - spacer")
> **Fixture public:** `http://localhost:3000/test-spacer-0516`
> **Pliki źródłowe:** `core/widgets/core/spacer.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/SpacerEditors.tsx` (edytory Wizard/Visual/Advanced), `core/admin/ui/widgets/editors/TokenOrPixelField.tsx` (kontrolka wysokości)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026 (`../27-05-2026/` — w tamtym batchu nie było osobnego pliku spacer, były
> tylko clean smoke dla innych widgetów). Tutaj realnie klikałem w kontrolki i
> weryfikowałem zmiany w żywej aplikacji: inspekcja atrybutów `data-spacer-*` na
> faktycznie wyrenderowanym elemencie w canvas i na froncie, trwałość po zapisie
> (Save draft → reload) oraz zachowanie responsywne na froncie przez resize viewportu.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są
> commitowane do repo (są ignorowane przez Git).

---

## 1. Przegląd widgetu

**Typ:** `spacer` · **Kategoria:** layout
**Opis (z definicji):** „Responsive vertical spacing primitive for clean rhythm control" — responsywny prymityw odstępu pionowego.
**Warianty:** `responsive` (niezależne wysokości desktop/tablet/mobile) oraz `fixed` (jedna wysokość współdzielona przez wszystkie breakpointy).

**Model danych (`SpacerData`):**

| Pole | Typ | Uwagi |
|------|-----|-------|
| `height.desktop` | string | token rytmu lub własna długość (px/rem/vh/clamp) |
| `height.tablet` | string | jw.; w wariancie `fixed` ignorowany w renderze, ale **zachowywany** w danych |
| `height.mobile` | string | jw.; analogicznie zachowywany w `fixed` |
| `showGuideInEditor` | boolean | etykieta pomocnicza widoczna tylko w środowiskach edytora/podglądu |

**Tokeny rytmu (15 w kodzie):** `none, 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32` → mapowane na rem (`none`/`0`=0rem … `32`=8rem). W selekcie UI token `0` jest świadomie ukrywany (duplikat `none` = 0rem), więc widoczne są 14 opcji.

**Wartości domyślne:** desktop=`16` (Section gap), tablet=`12` (Standard gap), mobile=`8` (Card gap), guide=ON.

**Presety rytmu (3):**

| Preset | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Card gap | 8 | 6 | 4 |
| Section gap | 16 | 12 | 8 |
| Hero gap | 24 | 20 | 16 |

**Renderer (`SpacerBlock`):** wypluwa `<div aria-hidden="true">` z klasami responsywnymi Tailwind (`h-[var(--spacer-mobile-height)]` jako baza, `md:` = tablet, `lg:` = desktop) i zmiennymi CSS per breakpoint. Etykieta-przewodnik (guide) renderuje się **wyłącznie** gdy `showGuideInEditor` jest włączone **i** kontekst to `editor-preview`/`admin-preview` lub przekazano `previewDevice` — nigdy na publicznym froncie.

**Tryby edytora wg kontraktu (`spacerEditorContract`):**
- **Wizard** — 1 sekcja „Spacer quick start", `role: setup`, `writablePaths: []` (read-only summary).
- **Visual** — 3 sekcje: „Variant and responsive behavior", „Responsive heights", „Editor guide".
- **Advanced** — 2 sekcje read-only: „Runtime spacing summary", „Support summary" (`writablePaths: []`).

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie interakcje wykonano w żywej aplikacji; stan weryfikowałem przez inspekcję
atrybutów `data-spacer-*`, zmiennych CSS i wyliczonej wysokości (`getComputedStyle`)
na realnie wyrenderowanym elemencie.

- Logowanie do admina + otwarcie fixture page.
- **Wizard:** wejście przez „Run setup again", odczyt zawartości read-only, powrót przez „Finish setup and open Visual".
- **Visual:**
  - Preset „Section gap" (batch 16/12/8), preset „Card gap" (w trybie fixed),
  - zmiana pojedynczej wysokości Desktop przez Radix-select → „Hero gap" (24),
  - rozwinięcie selecta wysokości i odczyt pełnej listy opcji (14 tokenów + zablokowana pozycja custom),
  - przełączenie wariantu Responsive → Fixed → Responsive,
  - toggle „Show guide in editor" (ON→OFF→ON).
- **Persistencja:** „Save draft" → reload strony → ponowna weryfikacja stanu z canvas.
- **Advanced:** odczyt obu sekcji diagnostycznych i potwierdzenie braku kontrolek edytowalnych.
- **Front:** otwarcie `/test-spacer-0516`, inspekcja DOM spacera, pomiar wyliczonej wysokości przy 375 / 800 / 1280 px, sprawdzenie overflow, odczyt konsoli.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard — read-only, zgodny z kontraktem
- Otwierany przyciskiem **„Run setup again"** (stan domyślny pokazuje baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics.").
- Zawiera jedną sekcję **„Spacer quick start"** z **read-only** podsumowaniem:
  - „Spacer mode: Responsive",
  - „Rhythm presets: **Desktop: 8 / Tablet: 20 / Phone: 16**" (surowe wartości tokenów),
  - „Desktop height: 8",
  - tekst pomocniczy „Visual owns the editor guide toggle after setup…".
- Przycisk **„Finish setup and open Visual"** poprawnie przełącza do Visual.
- **Zero kontrolek edytowalnych** — wyłącznie podsumowanie + przejście do Visual. Zgodne z `writablePaths: []`.
- Panel „Live preview" obok renderuje aktualny stan przez współdzielony renderer (pokazał „Spacer Card gap" przy desktop=8).

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Kontrolka | Akcja testowa | Efekt w canvas (`data-spacer-*`) | Wynik |
|---|---|---|---|
| Preset „Section gap" | klik | desktop=16, tablet=12, mobile=8; guide → „Spacer Section gap"; chooser → „Current preset: Section gap."; 3 comboboxy → Section/Standard/Card gap | ✅ batch apply |
| Combobox „Desktop height" → „Hero gap" | otwarcie Radix-select + wybór | desktop=24 (6rem), tablet/mobile bez zmian; chooser wraca do „Manual heights are active." | ✅ pojedyncza edycja |
| Wariant → **Fixed** | klik karty | `data-spacer-variant=fixed`; render tablet=mobile=desktop (24/24/24); pola Tablet/Mobile **znikają**, pojawia się tekst „Fixed mode uses desktop height for tablet and mobile."; chooser pokazuje notę fixed | ✅ kolaps + warunkowe UI |
| Preset „Card gap" w trybie Fixed | klik | zmienia **tylko** desktop=8 (render 8/8/8); zapisany tablet/mobile pozostają nienaruszone w danych | ✅ aktualizacja desktop-only |
| Toggle „Show guide in editor" → OFF | klik switcha | `data-spacer-show-guide=false`; element-przewodnik usunięty z DOM (childCount=0) | ✅ |
| Wariant → **Responsive** (powrót) | klik karty | `variant=responsive`; tablet=12, mobile=8 **przywrócone** z zapisanych danych (desktop pozostał 8 z presetu) | ✅ non-destructive |

- **Karty wariantów** mają czytelne stany „Selected"/„Pick" i opisy. Zmiana natychmiast widoczna w canvas.
- **Chooser presetów** poprawnie rozróżnia „Current preset: X." vs „Manual heights are active. Presets stay available as shortcuts." i podświetla aktywny preset badge „Selected".
- **Etykiety w comboboxach** są przyjazne (np. token 16 = „Section gap", 12 = „Standard gap", 8 = „Card gap", 24 = „Hero gap").

### 3.3 Zachowanie non-destructive Fixed ↔ Responsive (potwierdzone)
Przełączenie na **Fixed** nie kasuje zapisanych wysokości tablet/mobile — renderer
jedynie ignoruje je (używa desktop dla wszystkich breakpointów), a po powrocie do
**Responsive** wartości tablet/mobile wracają z danych. Zweryfikowane realnie:
fixed (render 8/8/8) → responsive → render 8/**12**/**8** (tablet/mobile przywrócone).

### 3.4 Kontrolka wysokości — lista opcji (potwierdzona)
Rozwinięty Radix-select „Desktop height" zawiera dokładnie 14 nazwanych tokenów:
No extra space, Micro gap, Tiny gap, Extra small gap, Small gap, Small plus gap,
Compact gap, Card gap, Comfortable gap, Standard gap, Section gap, Large section gap,
Hero gap, Extra large gap — plus jedną pozycję **zablokowaną** „Custom value
unavailable" `[disabled]` (patrz sekcja 4: świadome ograniczenie UI).

### 3.5 Persistencja (Save draft → reload)
Ustawiłem stan kontrolny: Responsive, preset **Hero gap** (24/20/16), guide **ON**.
Po „Save draft" i pełnym reloadzie strony canvas wrócił z bazy **identyczny**:
`variant=responsive, desktop=24, tablet=20, mobile=16, showGuide=true,
guide="Spacer Hero gap"`. ✅ Round-trip draftu działa.

_Zrzut (lokalny): `spacer-admin-visual-28-05.png`_

### 3.6 Tryb Advanced — read-only, wiernie odzwierciedla stan
- **Zero kontrolek edytowalnych** w panelu widgetu Advanced (tylko wiersze podsumowań).
- **„Runtime spacing summary":** Desktop/Tablet/Mobile height jako **wartości runtime**
  (w testowanym stanie fixed=8 wszystkie pokazały „Card gap") + „Editor guide: Hidden in
  editor previews" (zgodnie z wyłączonym togglem).
- **„Support summary":** „Spacer mode: Fixed rhythm" oraz „Saved responsive fallback:
  **Tablet or mobile fallback values are preserved for responsive mode.**" — czyli
  Advanced jawnie raportuje, że zapisane wysokości responsywne nie zostały utracone w
  trybie fixed. Detekcja działa poprawnie (tablet=12 ≠ desktop=8 → „preserved").

_Zrzut (lokalny): `spacer-admin-advanced-28-05.png` (etykieta — Advanced był też inspekcjonowany programowo)_

### 3.7 Front (`/test-spacer-0516`)
- HTTP `200`, tytuł „TEST-SPACER-0516", **0 błędów / 0 ostrzeżeń** w konsoli.
- Renderuje **1** spacer: `<div aria-hidden="true">` z klasami
  `relative w-full shrink-0 h-[var(--spacer-mobile-height)] md:h-[...tablet] lg:h-[...desktop]`.
- **Responsywność potwierdzona pomiarem `getComputedStyle().height`** (stan opublikowany 32/16/8):
  - 375 px → **32 px** (= 2rem = mobile token 8),
  - 800 px → **64 px** (= 4rem = tablet token 16),
  - 1280 px → **128 px** (= 8rem = desktop token 32).
  Breakpointy `md:`/`lg:` działają zgodnie z projektem. ✅
- **Brak poziomego overflow** zarówno przy 1280 px, jak i 375 px (`scrollWidth == clientWidth`). ✅
- Struktura strony: pojedynczy `<section>` zawierający wyłącznie ten spacer (strona jest celowo minimalna — brak widocznej treści, spacer jest dekoracyjny).

_Zrzuty (lokalne): `spacer-public-desktop-28-05.png`, `spacer-public-mobile-375-28-05.png`_

---

## 4. Co NIE działa / ograniczenia

**Nie wykryto błędów funkcjonalnych** w testowanym zakresie. Każda kontrolka, którą
kliknąłem w Visual, realnie zmieniała render i przetrwała zapis; Wizard i Advanced
zachowują się dokładnie tak, jak deklaruje kontrakt (setup-only / read-only).

Odnotowuję natomiast **świadome ograniczenia** (nie są to crashe/bugi, ale realnie
zawężają możliwości autora i warto je nazwać uczciwie):

- **L1 — Brak wprowadzania własnej długości w UI Visual.** Kontrolka wysokości jest
  wywoływana z `allowCustom={false}`. W praktyce: w rozwijanej liście pozycja „custom"
  jest **zablokowana** („Custom value unavailable"), a pole tekstowe na własną wartość
  jest ukryte. Autor może więc wybrać **tylko** spośród 14 tokenów presetowych.
  Jednocześnie sam model i normalizator (`normalizeSpacerCustomHeightInput`) **wspierają**
  wartości `px`, `rem`, `vh/dvh/svh/vw` oraz `clamp(...)`, a `schema` przyjmuje dowolny
  string. Oznacza to, że własne wysokości są możliwe wyłącznie przez API/import danych,
  a nie przez edytor. Jeśli takie dane już istnieją, UI pokazuje je jako „Saved custom
  height" i pozwala je tylko zastąpić presetem (nie edytować liczbowo). **Nie udało mi
  się więc przetestować ścieżki własnej długości przez UI — bo UI ją blokuje** (potwierdziłem
  zablokowaną pozycję w liście).

- **L2 — Token `0` ukryty w selekcie.** `buildVisibleOffTokenOptions` usuwa `0`, bo
  `none` daje tę samą wartość 0rem. To celowa deduplikacja, ale w efekcie lista tokenów
  w UI (14) jest mniejsza niż w modelu (15).

Brak regresji w stosunku do clean-smoke z 27-05 (spacer nie miał wtedy osobnego raportu,
ale batch był `passed`).

> Uczciwe zastrzeżenie: „brak błędów" dotyczy **przetestowanego** zakresu z sekcji 2.
> Obszary z sekcji 6 nie były klikane i nie mogę ich potwierdzić ani zaprzeczyć na
> podstawie tej sesji.

---

## 5. Uwagi UX/UI (niuanse, nie błędy)

1. **Wizard pokazuje surowe tokeny zamiast etykiet.** Podsumowanie rytmu w Wizard to
   „Desktop: 8 / Tablet: 20 / Phone: 16" (gołe numery tokenów), podczas gdy Visual i
   Advanced używają przyjaznych nazw („Section gap", „Hero gap" itd.). Drobna
   niespójność językowa między trybami.
2. **Kolizja nazw: token vs preset.** Etykiety wysokości („Card gap"=8, „Section gap"=16,
   „Hero gap"=24) są **identyczne** z nazwami presetów rytmu („Card gap"=8/6/4,
   „Section gap"=16/12/8, „Hero gap"=24/20/16), choć oznaczają co innego (pojedynczy
   token vs zestaw 3 breakpointów). Np. combobox „Desktop height: Card gap" (=token 8)
   to nie to samo, co preset „Card gap" (8/6/4). Potencjalnie mylące dla autora.
3. **Fixed = aktualizacja tylko desktop, z zachowaniem fallbacku.** Bardzo dobry,
   non-destructive wzorzec — i, co ważne, **jawnie opisany** inline („Fixed mode preserves
   the saved tablet and mobile heights…") oraz raportowany w Advanced. Pozytyw.
4. **Warunkowe ukrywanie pól Tablet/Mobile w trybie Fixed** zamiast ich wyszarzania —
   czysty UX, z czytelnym tekstem zastępczym.
5. **Guide tylko w edytorze/podglądzie.** Na publicznym froncie atrybut
   `data-spacer-show-guide="true"` pozostaje, ale **element-przewodnik nie jest
   renderowany** (childCount=0) — zgodnie z projektem (guide to pomoc autorska). Atrybut
   na froncie jest nieszkodliwy, choć z punktu widzenia czystości DOM bywa zbędny.
6. **Brak przełącznika urządzenia w canvas.** W edytorze nie ma toggla desktop/tablet/mobile
   dla podglądu — canvas renderuje breakpoint desktop (`previewHeight`=desktop). Ścieżka
   `previewDevice` w rendererze istnieje (resolvePreviewHeight), ale nie da się jej
   wywołać z UI canvas; responsywność realnie weryfikowalna dopiero na froncie przez resize.
7. **Radix Select wymaga kliknięcia triggera + opcji** — natywna komenda `select`
   harnessu na nim nie działa (kliknięcie myszą działa poprawnie). To niuans narzędzia
   testowego, **nie** błąd widgetu.
8. **Sekcje „Block layout" i „Device visibility"** poniżej edytora widgetu to kontrolki
   **page-buildera** (szerokość/padding/marginesy bloku, widoczność per urządzenie), nie
   część edytora spacer. Odnotowuję je jako kontekst; nie są przedmiotem tego audytu.
9. **Brak feedbacku po „Save draft".** Nie udało mi się przechwycić żadnego toasta/komunikatu
   po zapisie (zapytanie o `[role=status]`/toast zwróciło pusto) — możliwe, że pojawił się i
   zniknął przed odczytem. Sam zapis zadziałał (potwierdzony reloadem), ale feedback wizualny
   był nieuchwytny w tej sesji.

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Wprowadzenie własnej długości (px/clamp/vh)** — niemożliwe przez UI (patrz L1: opcja
  zablokowana). Logikę normalizatora znam z kodu, ale nie wywołałem jej z poziomu edytora.
- **Publikacja (Publish)** — wykonałem tylko „Save draft". W konsekwencji **moje edycje z
  admina nie pojawiły się na froncie**: publiczna trasa `/test-spacer-0516` serwuje stan
  **opublikowany** (Responsive, desktop=32/tablet=16/mobile=8, guide ON), a nie mój draft
  (24/20/16). Front zweryfikowałem więc pod kątem **poprawności renderu i responsywności
  spacera**, a nie round-tripu moich konkretnych edycji do publicznej trasy.
- **Każdy z 14 tokenów osobno** — kliknąłem reprezentatywny zestaw (8, 12, 16, 20, 24);
  pozostałe tokeny potwierdzone tylko jako obecne w liście.
- **Wpływ „Device visibility" (page-builder) na froncie** — nie weryfikowany.
- **Ścieżka `previewDevice` renderera** — brak toggla urządzenia w canvas, więc nie
  wywołana z UI (responsywność potwierdziłem na froncie przez resize viewportu).
- **Tablet/Mobile combobox jako pojedyncze edycje** — testowane pośrednio przez presety i
  przez przełączanie wariantu; nie klikałem każdego z nich osobno w trybie responsive.

---

## 7. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only summary + przejście do Visual | ✅ Działa zgodnie z projektem (brak pól edycji — celowo) |
| **Visual** | Główny edytor (3 sekcje) | ✅ Wszystkie testowane kontrolki działają, aktualizują podgląd i są trwałe po zapisie; Fixed↔Responsive non-destructive |
| **Advanced** | 2 sekcje diagnostyczne read-only | ✅ Zero kontrolek edytowalnych; podsumowania wiernie odzwierciedlają stan runtime + fallback |
| **Front** | `/test-spacer-0516` (treść opublikowana) | ✅ HTTP 200, responsywność 32/64/128 px na 375/800/1280, brak overflow, 0 błędów konsoli, guide niewidoczny (poprawnie) |

**Werdykt końcowy:** W przetestowanym zakresie widget `spacer` jest **sprawny i spójny**
między edytorem a rendererem. Nie wykryto błędów funkcjonalnych — wszystko, co
przetestowałem, działa (presety, edycja wysokości, przełączanie wariantu z zachowaniem
fallbacku, toggle guide, persistencja draftu, responsywny render i dostępność
`aria-hidden`). Jedyne realne ograniczenie to **zablokowane w UI wprowadzanie własnych
długości** (L1) mimo wsparcia w modelu — to świadoma decyzja produktowa, nie crash.
Tryby Wizard/Advanced realizują zadeklarowany kontrakt (setup-only / read-only). Uwagi z
sekcji 5 to niuanse UX, nie defekty. Obszary niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 8. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `spacer-admin-visual-28-05.png` | Admin, tryb Visual po edycjach (stan zapisany draftem: Hero gap, guide ON) |
| `spacer-public-desktop-28-05.png` | Front `/test-spacer-0516`, 1280 px (wysokość desktop = 128 px) |
| `spacer-public-mobile-375-28-05.png` | Front `/test-spacer-0516`, 375 px (wysokość mobile = 32 px, brak overflow) |
