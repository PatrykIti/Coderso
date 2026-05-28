# RAPORT: Grid Columns Widget — audyt stanu bieżącego (UX/UI + zachowanie)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-grid-columns` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** strona `ee3f7352-52f1-4b4a-a910-619d94dc4410` ("Contract Test - grid-columns")
> **Fixture public:** http://localhost:3000/test-grid-columns-0516 ("TEST-GRID-COLUMNS-0516")
> **Pliki źródłowe:**
> - `core/widgets/core/gridColumns.tsx` — renderer, typy, normalizacja, presety spanów
> - `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` — edytory Wizard / Visual / Advanced

> Uwaga: nazwy plików PNG w tym raporcie są wyłącznie lokalnymi etykietami przechwyceń Playwright.
> Same pliki PNG nie są wymaganym evidence w repo i nie są wersjonowane.

Ten raport jest znacznie bogatszy niż smoke-raport z 27-05 (który stwierdzał jedynie
`passed` dla `visual`/`advanced` oraz `200` na publicznej trasie). Tutaj każda kontrolka
została przeklikana i zweryfikowana względem realnego DOM-u podglądu i frontu.

---

## 1. Przegląd widgetu

**Typ:** `grid-columns` · **Kategoria:** layout
**Warianty:** `equal`, `asymmetric`, `masonry-lite`
**Liczba kolumn:** min 2 / max 6 (sloty repeatable, zarządzane przez współdzielony panel **Structure**)

Grid Columns to responsywny, 12-kolumnowy układ siatki z powtarzalnymi „content areas"
(kolumnami-slotami), do których wstawia się inne widgety. Każda kolumna ma niezależne
szerokości per breakpoint (desktop/tablet/telefon + opcjonalnie wide/very-wide), widoczność
per urządzenie, opcjonalne wyróżnienie (per-column surface override) oraz wysokość/wyrównanie.

### 1.1 Model danych (skrót)

| Sekcja | Pola |
|--------|------|
| **columns[]** | `id`, `label`, `desktopSpan`, `tabletSpan`, `mobileSpan`, `xlSpan`, `twoXlSpan`, `hideOnMobile/Tablet/Desktop`, `minHeight`, `mobileMinHeight`, `alignSelf`, `style{surface,background,borderColor,borderWidth,radius,padding,overflow}` |
| **layout** | `gapX`, `gapY`, `align` (start/center/end/stretch), `reverseOnMobile` |
| **style** | `cardizeColumns`, `columnBackground`, `columnBorderColor`, `columnBorderWidth`, `columnRadius`, `columnPadding` |

### 1.2 Architektura trybów edytora — istotny niuans

Panel edytora ma **tylko dwie zakładki: `Visual` (domyślna) i `Advanced`**.
**Nie ma osobnej zakładki „Wizard".** Wizard to **flow konfiguracji startowej** uruchamiany
przyciskiem **„Run setup again"** (oraz przy pierwszym dodaniu widgetu). Po jego zakończeniu
panel pokazuje komunikat: _„Setup complete — Daily edits live in Visual. Advanced is for
technical diagnostics."_ W tym raporcie „tryb Wizard" = ten właśnie flow setup.

---

## 2. Co zostało faktycznie przetestowane

Wszystkie interakcje wykonano w izolowanej sesji `claude-28-05-grid-columns`, weryfikując
efekty przez odczyt realnego DOM-u (atrybuty `data-grid-columns-*`, klasy Tailwind kolumn,
pozycje `getBoundingClientRect`) — nie tylko przez wygląd snapshotu.

- **Logowanie do admina** i otwarcie fixtura admin (2 puste kolumny: „Primary content",
  „Supporting content", wariant `equal`).
- **Wizard (setup):** wybór wszystkich 3 wariantów + powrót „Finish setup and open Visual".
- **Visual:** reset wariantu, vertical alignment, reverse on phone, preset szerokości 33/67,
  bezpośredni Select desktop width, edycja label, toggle „Hide on desktop", toggle „Cardized
  columns" (off), per-column „Highlight this column" (kolumna 2 on/off), odczyt diagnostyki
  „Current row width totals".
- **Advanced:** otwarcie zakładki i weryfikacja, że wszystkie wiersze są read-only oraz że
  odzwierciedlają bieżący stan edycji.
- **Front (public):** SSR przez `curl` + render w przeglądarce; pozycje kolumn na desktopie
  (1280px) i mobile (375px); kontrola overflow; konsola błędów; brak wycieku etykiet kolumn.

### Czego NIE testowano (uczciwie)

- Fizycznego **Move up / Move down** kolumn (przyciski są obecne i aktywne, ale samego
  przeniesienia nie wykonano).
- Zmiany spanów **xl / 2xl** („Wide screens" / „Very wide screens") oraz indywidualnej zmiany
  tablet/phone width (zweryfikowano tylko desktop width — mechanizm Select jest wspólny).
- Zmiany **wartości gap** na inną (kontrolki obecne, wartości startowe `gap-x-6`/`gap-y-6`).
- Interakcji z **color-pickerem / swatchem** ani działania przycisków **„Clear"** przy kolorach.
- Przycisku **„Reapply asymmetric desktop widths"** w Visual (logika opisana z kodu, nie klik).
- **Zapisu** (Save draft / Publish) — patrz sekcja 6 (świadomie pominięty, by nie nadpisać fixtura).

---

## 3. Co działa (potwierdzone)

### 3.1 Wizard (setup)

- **Jedna sekcja „Grid quick start"** z 3 kartami wariantów (Equal/Asymmetric/Masonry Lite),
  podpisem oraz tekstem pomocniczym _„Column labels, count, spacing, responsive spans, and
  surfaces stay in Visual after setup."_
- Karty są spójne wizualnie z Visual (te same `VariantCards`) — brak rozjazdu jak w innych
  widgetach, gdzie Wizard używał zwykłego selecta.
- Wybór wariantu **natychmiast aktualizuje** zarówno podgląd główny, jak i osobny podgląd
  Wizarda (_„Reflects the current Wizard state through the shared widget renderer."_).
- **Equal** → `data-grid-columns-variant="equal"`.
- **Masonry Lite** → wymusza kardyzację: wewnętrzny wrapper kolumny dostaje
  `h-full min-h-[6rem] border p-4 rounded-xl`. ✓
- **„Finish setup and open Visual"** poprawnie wraca do zakładki Visual i pokazuje „Setup complete". ✓

### 3.2 Visual — wszystkie sprawdzone kontrolki działają

| Kontrolka | Efekt zweryfikowany w DOM | Wynik |
|-----------|---------------------------|-------|
| Karty wariantu | reset na `equal` → `data-grid-columns-variant="equal"` | ✓ |
| Vertical alignment → Center | grid: `items-start` → `items-center`, `data-grid-columns-align="center"` | ✓ |
| Reverse on phone (on) | kolumny: `order-2 md:order-none` / `order-1 md:order-none`, `data-grid-columns-reverse-mobile="true"` | ✓ |
| Preset 33 / 67 | kol.1 `lg:col-span-4`, kol.2 `lg:col-span-8` (mobile/tablet bez zmian) | ✓ |
| Desktop width (Select) kol.1 → 3/12 | kol.1 `lg:col-span-3` | ✓ |
| Label kol.1 → „Lewa kolumna" | podgląd admina pokazuje natychmiast „Lewa kolumna" | ✓ |
| Hide on desktop (kol.1, on) | dodano `lg:hidden`; suma desktop spadła z 11 → 8 | ✓ |
| Cardized columns (toggle off) | kolumna BEZ override traci `border p-4 rounded-xl` | ✓ |
| Highlight this column (kol.2, on) | kol.2 dostaje własne `border p-4 rounded-xl` niezależnie od globalnego cardize | ✓ |
| „Current row width totals" | Desktop 11/12 „leaves unused width", Tablet 12/12 „fills one row", Phone 24/12 „continues onto additional rows" | ✓ |

- **Pierwszeństwo override nad globalem:** przy globalnym `cardize=off` kolumna z włączonym
  „Highlight" zachowuje kartę, a kolumna bez override — nie. To poprawne i intuicyjne. ✓
- **Diagnostyka sum spanów** jest dynamiczna i reaguje na każdą zmianę szerokości/widoczności.
- Sekcja „Gap and column surface" przy włączonym cardize odsłania komplet pól: tło, kolor
  obramowania, szerokość obramowania, promień, padding — każde z osobnym **„Clear"**
  (uwaga pozytywna: zarówno tło, jak i kolor obramowania mają „Clear", brak niespójności).

### 3.3 Advanced — read-only, ale rzetelne

- Zawiera **wyłącznie** wiersze diagnostyczne (read-only), brak edytowalnych kontrolek widgetu.
- Sekcje: **Layout summary** (Variant, Layout, Width totals, Cardized columns, Content area
  mismatch), **Column override summary** (liczba override'ów powierzchni + wysokości/wyrównania),
  **Content area diagnostics** (liczba content areas, „Shared surface").
- Dodatkowo współdzielone read-only: **Block layout summary** i **Visibility summary**.
- **Odzwierciedla stan na żywo:** po moich edycjach pokazał `Variant: Equal`, `Width totals:
  Desktop 11/12, tablet 12/12, phone 24/12 across 2 content areas`, `Cardized columns: Off`,
  `1 of 2 content areas use per-column surface overrides`, `Saved column settings match the
  Structure order`. ✓

### 3.4 Front (public route `/test-grid-columns-0516`)

- `curl` zwraca **HTTP 200** w ~1 s; widget jest **renderowany po stronie serwera** (SSR)
  z pełnym kontraktem atrybutów `data-grid-columns-*`.
- Fixture publiczny to **populated layout: 3 kolumny**, wariant `equal`, każda desktop `6/12`,
  kardyzowane (`border p-4 rounded-xl`, `background-color: var(--color-primary)`,
  `border-color: var(--color-border)`, `1px`). Każda kolumna zawiera zagnieżdżony widget
  Rich Text Section (eyebrow „Fixture" + `h3`).
- **Etykiety kolumn NIE wyciekają na front** (`labelLeak = 0`) — etykiety renderują się tylko
  w trybie editor/admin-preview, zgodnie z kodem. ✓
- **Desktop (1280px):** kol.1 (x=128, y=48) + kol.2 (x=652, y=48) w jednym rzędzie, **kol.3
  zawija się do drugiego rzędu** (x=128, y=346). 3×6=18 > 12, więc nadmiar przechodzi do
  kolejnego rzędu — zgodnie z zasadą „keeps saved widths as authored". Brak poziomego overflow.
- **Mobile (375px):** wszystkie 3 kolumny `12/12`, stackują się pionowo na pełną szerokość,
  brak poziomego overflow.
- **0 błędów w konsoli** na froncie.

_Zrzuty (lokalne etykiety): `grid-columns-frontend-desktop.png`, `grid-columns-frontend-mobile.png`._

---

## 4. Co nie działa / zachowania mylące (UX)

### 4.1 Wybór „Asymmetric" w Wizardzie nie zmienia gotowego układu (mylące)

Po wybraniu **Asymmetric** w Wizardzie flaga wariantu zmienia się na `asymmetric`, ale
**szerokości kolumn pozostają 50/50** (`lg:col-span-6` / `lg:col-span-6`). Powód: preset
asymetryczny ustawia jedynie **fallbackowe** spany dla kolumn bez jawnie zapisanej szerokości,
a fixture ma jawnie zapisany `desktopSpan: "6"`. Z perspektywy użytkownika setupu wygląda to
jak kontrolka, która „nic nie robi".

- **W Visual** istnieje obejście: notice „Custom desktop spans override the asymmetric preset…"
  + przycisk **„Reapply asymmetric desktop widths"**, który wymusza spany presetu.
- **W Wizardzie brak jakiejkolwiek podpowiedzi czy przycisku reapply** — to luka UX (Wizard
  pozwala wybrać wariant, którego efekt jest niewidoczny i nieodwracalny w samym Wizardzie).

### 4.2 Brak — nie wykryto żadnego błędu funkcjonalnego ani błędu renderingu

Poza niuansem z 4.1 (który wynika ze świadomej zasady „keep widths as authored"), **wszystkie
przetestowane kontrolki działały poprawnie**, podgląd aktualizował się natychmiast, stan
utrzymywał się w UI po re-renderze, a front renderował się spójnie z logiką edytora.
Nie napotkano błędów konsoli, zawieszeń kontrolek ani „martwych" przełączników.

---

## 5. Niuanse UX / UI warte odnotowania

1. **„Wizard" nie jest zakładką** — to flow setup („Run setup again"). Osoba szukająca trybu
   Wizard obok Visual/Advanced go nie znajdzie. Świadoma decyzja produktowa (Wizard = tylko
   wybór startowego kształtu siatki), ale wymaga przyzwyczajenia.
2. **Liczba kolumn jest zablokowana w Visual**, gdy istnieją współdzielone sloty Structure:
   select „Content area count" oraz przyciski „Add one column" / „Remove one column" są
   **disabled**, z komunikatem _„Shared content areas are controlled in the Structure section."_
   Kolumny dodaje/usuwa się w panelu **Structure** (powyżej zakładek), nie w Visual.
3. **Etykiety kolumn to pomoc tylko dla autora** — widoczne w podglądzie admina, niewidoczne
   na froncie. To poprawne, ale może zaskoczyć (wpisana etykieta „znika" na produkcji).
4. **Masonry Lite blokuje przełącznik cardize** — w Masonry Lite toggle „Cardized columns" jest
   wymuszony i zablokowany (helper: _„Masonry Lite always adds column cards, so this switch
   stays on."_).
5. **Sumy spanów są celowo „nie-pilnowane"** — widget pozwala przekroczyć 12 (zawijanie do
   kolejnego rzędu) i zejść poniżej 12 (puste miejsce). Diagnostyka „Current row width totals"
   jasno to komunikuje per breakpoint zamiast wymuszać korektę. Zgodne z `gridColumnsOverflowDecision = "no-runtime-guard"`.
6. **Advanced jest bogaty informacyjnie, ale nieedytowalny** — w przeciwieństwie do Contact
   widget nie ma tu snapshotu JSON ani przycisku normalizacji; to czysty zestaw czytelnych
   podsumowań, w tym wspólne „Block layout summary" / „Visibility summary" (edytowalne tylko w Visual).
7. **Sekcja per-column ma komplet opcji**: highlight (tło/obramowanie/szerokość/promień/padding
   z opcją „Global"), overflow (Visible/Hidden), min-height, phone min-height, vertical alignment
   — dużo precyzji, ale i długi, przewijalny panel bez zwijania sekcji.

---

## 6. Admin vs Front — zakres i ograniczenia porównania (uczciwie)

- **To nie jest porównanie tej samej strony.** Fixture admin (`ee3f7352…`) ma **2 puste
  kolumny** (`equal`), a fixture publiczny (`test-grid-columns-0516`) to **3 wypełnione,
  kardyzowane kolumny**. To dwie różne strony-fixture.
- **Moich edycji w Visual NIE zapisano** (świadomie nie klikałem Save draft / Publish, by nie
  nadpisać fixtura). Front renderuje więc **zapisany stan fixtura**, a nie moje zmiany z sesji.
  Spójność admin↔front zweryfikowano **na poziomie kontraktu renderera** (te same atrybuty
  `data-grid-columns-*`, ta sama logika klas span/cardize/order), a nie przez wypchnięcie moich
  konkretnych edycji na front.
- **Przy wyjściu z admina pojawia się prompt `beforeunload`** (niezapisane zmiany). Pierwsze
  próby `goto` na front zawieszały się właśnie na tym dialogu — **to nie jest bug widgetu**.
  Obejście: otwarcie frontu w nowej karcie. Warto o tym pamiętać przy automatyzacji.

| Aspekt | Admin preview | Front (public) | Zgodność kontraktu |
|--------|---------------|----------------|--------------------|
| Atrybuty `data-grid-columns-*` | obecne | obecne | ✓ |
| Klasy span (`col-span/md:/lg:`) | zgodne z konfiguracją | zgodne z konfiguracją | ✓ |
| Kardyzacja kolumn | `border p-4 rounded-xl` przy cardize/override | identycznie | ✓ |
| Etykiety kolumn | widoczne (helper autora) | niewidoczne | ✓ (zamierzone) |
| Zawijanie >12 spanów | — (admin miał 2 kol.) | kol.3 w 2. rzędzie | ✓ |
| Overflow poziomy | brak | brak (desktop i mobile) | ✓ |

---

## 7. Podsumowanie

- **Wizard / Visual / Advanced przetestowane.** Wszystkie sprawdzone kontrolki działają,
  podgląd aktualizuje się na żywo, stan trzyma się w UI, a Advanced wiernie raportuje stan.
- **Jedyne zastrzeżenie UX:** wybór **Asymmetric w Wizardzie** nie zmienia widocznie układu,
  gdy kolumny mają już jawne, równe spany — i Wizard nie oferuje (jak Visual) przycisku
  „Reapply". Reszta zachowań jest poprawna i przewidywalna.
- **Front renderuje się poprawnie** (SSR 200, brak błędów konsoli, brak overflow, poprawne
  zawijanie i stackowanie, brak wycieku etykiet).
- **Nie wykryto błędów krytycznych ani regresji** względem smoke-raportu z 27-05; ten audyt
  potwierdza i znacząco rozszerza tamten wynik `passed`.
- Pozycje świadomie nieprzetestowane wypisano w sekcji 2 („Czego NIE testowano").
