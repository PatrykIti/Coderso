# REPORT: Split Layout Widget — UX/UI Audit

**Widget:** `split-layout`  
**Data:** 2026-05-16  
**Status:** W trakcie — wstępny raport (analiza kodu + testy przeglądarki)  
**Pliki:** `core/widgets/core/splitLayout.tsx`, `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`

---

## 1. Przegląd widgetu

Split Layout to dwu-panelowy primitive layoutu z konfigurowalnymi proporcjami, zachowaniem na mobile i kontrolą odstępów. Widget oferuje trzy tryby edytora: Wizard, Visual, Advanced.

### Obsługiwane opcje

| Opcja | Wartości | Domyślna |
|---|---|---|
| `ratio.desktop` | `50-50`, `40-60`, `60-40` | `50-50` |
| `ratio.tablet` | `50-50`, `40-60`, `60-40` | `50-50` |
| `collapseMobile` | `stack`, `keep` | `stack` |
| `reverseOnMobile` | boolean | `false` |
| `gap` | `none`, `0`–`12` (11 tokenów) | `6` |
| `verticalAlign` | `start`, `center`, `end`, `stretch` | `stretch` |

---

## 2. Znalezione braki funkcjonalne (z analizy kodu)

### 2.1 Brak wizualnego podglądu proporcji paneli

- **Problem:** Karty wariantów (`50/50`, `40/60`, `60/40`) to tylko tekst z opisem słownym — brak graficznego podglądu jak panele będą wyglądały.
- **Wpływ:** Użytkownik musi domyślać się, jak `40/60` wygląda w praktyce.
- **Rekomendacja:** Dodać miniaturkę SVG/CSS prezentującą proporcje obu paneli na karcie wyboru.

### 2.2 Brak podglądu zachowania na mobile

- **Problem:** Opcje `Stack` i `Keep split` są opisane tylko tekstem. Brak animacji/miniaturki pokazującej efekt.
- **Wpływ:** Użytkownik nie wie co "stack" robi bez uruchomienia live preview.

### 2.3 Duplikat tokenów gap: `none` i `0`

- **Problem:** W `splitLayoutGapTokens` są oba tokeny `none` i `0`, które mapują się na identyczną klasę CSS `gap-0`. W edytorze użytkownik widzi dwie osobne opcje robiące to samo.
- **Lokalizacja kodu:** `splitLayout.tsx:8-20`, `splitLayout.tsx:114-126`
- **Wpływ:** Dezorientacja użytkownika — dwa tokeny z pozornie różnymi nazwami, ale identycznym efektem.
- **Rekomendacja:** Usunąć `"0"` z tokenów lub oznaczyć `none` jako alias.

### 2.4 Brak kontroli gap per breakpoint

- **Problem:** Gap jest jedną wartością globalną dla wszystkich breakpointów. W praktyce projektanci często potrzebują innego odstępu na mobile vs desktop (np. `gap-4` na mobile, `gap-8` na desktop).
- **Wpływ:** Ograniczone możliwości responsywnego projektowania.

### 2.5 `reverseOnMobile` jest aktywny gdy `collapseMobile === "keep"`

- **Problem (logika):** Gdy użytkownik wybierze `Keep split`, panele pozostają obok siebie na mobile. Wtedy toggle `Reverse on mobile` zmienia kolejność CSS przez `order-1`/`order-2`, ale UI nie komunikuje tego zachowania ani nie wyjaśnia różnicy w kontekście `keep` vs `stack`.
- **Lokalizacja kodu:** `splitLayout.tsx:217-226` — `order-2 md:order-1` zawsze dodawane gdy `reverseOnMobile === true`, niezależnie od `collapseMobile`.
- **Wpływ:** Użytkownik może nie rozumieć, co robi `reverseOnMobile` w trybie `keep`.

### 2.6 Brak kontroli per-pane (padding, tło)

- **Problem:** Widget nie oferuje żadnych opcji stylowania per-panel (padding, tło koloru). Wszelkie style wewnątrz paneli muszą być ustawiane przez widgety dziecko.
- **Wpływ:** Nie można np. dodać tła do jednego panelu bez wrappera.

### 2.7 Brak opcji mobile ratio (dedykowanego)

- **Problem:** Gdy `collapseMobile === "keep"`, mobilny layout używa `ratio.tablet` do wyliczenia span-ów. Brakuje dedykowanego `ratio.mobile`.
- **Lokalizacja kodu:** `splitLayout.tsx:214-215` — `mobileKeepLeftSpanMap[ratio.tablet ?? "50-50"]`
- **Wpływ:** Użytkownik ustawia tablet ratio myśląc o tablecie, ale nieświadomie zmienia też mobile (gdy `keep`).

### 2.8 Brak kontroli min-height paneli

- **Problem:** Brak możliwości ustawienia minimalnej wysokości paneli. Jeśli jeden panel ma mało treści, layout może wyglądać asymetrycznie.

### 2.9 Wizard nie oferuje kontroli verticalAlign

- **Problem:** Wizard (tryb dla nowych użytkowników) pomija `verticalAlign`. Domyślna wartość `stretch` może nie być odpowiednia gdy panele mają różną ilość treści.
- **Wpływ:** Nowi użytkownicy muszą przejść do trybu Visual aby to skonfigurować.

---

## 3. Problemy UX (z perspektywy użytkownika)

### 3.1 Dwa systemy sterowania ratio mogą się rozjechać

- **Problem (architektoniczny):** Karty wariantów zmieniają `block.variant` (przez `onVariantChange`), podczas gdy dropdown Desktop/Tablet ratio zmieniają `data.ratio.desktop/tablet`. Te dwie wartości mogą się rozjechać i dawać niespójne wyniki.
- **Przykład:** Użytkownik kliknie kartę "60/40" (zmieni `block.variant`), potem zmieni dropdown Desktop ratio na "40/60" — normalizer będzie priorytetyzował `data.ratio.desktop` nad `block.variant`.
- **Wpływ:** Zaawansowani użytkownicy mogą być zdezorientowani, dlaczego zmiana karty nie zmienia podglądu gdy ratio dropdown ma inną wartość.

### 3.2 Advanced editor nie dodaje wartości ponad Visual

- **Problem:** Tryb Advanced zawiera dokładnie te same kontrolki co Visual (ratio desktop/tablet, collapse, gap, align, reverse toggle) plus JSON dump. Nie ma żadnych "zaawansowanych" opcji.
- **Wpływ:** Mylące — użytkownik może spodziewać się czegoś innego w trybie Advanced.
- **Rekomendacja:** Advanced powinien mieć np. bezpośrednie wpisywanie klas CSS, surowy JSON edit, lub diagnostykę breakpointów.

### 3.3 Sekcja "Pane slots" w Visual jest niefunkcjonalna

- **Problem:** Sekcja "Pane slots" w Visual edytorze zawiera tylko jeden tekst informacyjny: "Use insert dialog targeting to place widgets into each side." — żadnej akcji, linku, ani przycisku.
- **Wpływ:** Sekcja zajmuje miejsce bez wartości — lepiej ją usunąć lub zastąpić inline wskazówką.

### 3.4 Etykiety gap nie podają pikseli ani rem

- **Problem:** Opcje "Gap 1", "Gap 2", ..., "Gap 12" nie komunikują ile to jest w pikselach/rem. Użytkownik nie wie czy "Gap 6" to 24px, 1.5rem, czy inna wartość.
- **Rekomendacja:** Dodać w opisie/tooltip: `Gap 6 (24px / 1.5rem)`.

### 3.5 Brak przycisku "Reset do domyślnych"

- **Problem:** Po edycji nie ma sposobu na przywrócenie domyślnych wartości jednym kliknięciem.

### 3.6 "Empty left pane / Empty right pane" jako placeholder

- **Problem:** Placeholder dla pustego panelu (`Empty left pane.` / `Empty right pane.`) nie sugeruje jak dodać zawartość.
- **Rekomendacja:** Zamienić na bardziej pomocny CTA: `+ Add widget to left pane` z akcją otwierającą insert dialog.

---

## 4. Testy w przeglądarce — Admin UI (http://localhost:5173/admin)

> *Sekcja do wypełnienia po testach Playwright*

### 4.1 Wizard

| Test | Wynik | Uwagi |
|---|---|---|
| Otwieranie Wizard edytora | — | — |
| Wybór split preset (dropdown) | — | — |
| Wybór mobile behavior | — | — |
| Wybór base gap | — | — |
| Podgląd zmian w live preview | — | — |

### 4.2 Visual

| Test | Wynik | Uwagi |
|---|---|---|
| Karty wariantów — kliknięcie | — | — |
| Desktop ratio dropdown | — | — |
| Tablet ratio dropdown | — | — |
| Collapse mode dropdown | — | — |
| Reverse on mobile toggle | — | — |
| Gap dropdown | — | — |
| Vertical align dropdown | — | — |
| Live preview po każdej zmianie | — | — |

### 4.3 Advanced

| Test | Wynik | Uwagi |
|---|---|---|
| JSON snapshot widoczny | — | — |
| Kontrolki ratio/gap/align | — | — |

---

## 5. Testy w przeglądarce — Frontend (http://localhost:3000)

> *Sekcja do wypełnienia po testach Playwright*

### 5.1 Renderowanie

| Test | Wynik | Uwagi |
|---|---|---|
| Wariant 50/50 na desktop | — | — |
| Wariant 40/60 na desktop | — | — |
| Wariant 60/40 na desktop | — | — |
| Stack na mobile | — | — |
| Keep split na mobile | — | — |
| Reverse on mobile | — | — |
| Gap między panelami | — | — |
| Vertical align | — | — |

---

## 6. Porównanie admin vs frontend

> *Sekcja do wypełnienia po testach Playwright*

| Zachowanie | Admin preview | Frontend | Zgodne? |
|---|---|---|---|
| Ratio 50/50 | — | — | — |
| Mobile stack | — | — | — |
| Gap rendering | — | — | — |
| Reverse mobile | — | — | — |

---

## 7. Podsumowanie priorytetów (wstępny)

### Krytyczne
- [ ] Usunąć duplikat `none`/`0` w tokenach gap (kod)
- [ ] Wyjaśnić `reverseOnMobile` w kontekście `collapseMobile === "keep"` (UI/logika)

### Wysokie
- [ ] Dodać wizualne miniaturki proporcji na kartach wariantów
- [ ] Dodać tooltip z px/rem do opcji gap
- [ ] Usunąć lub przekształcić niefunkcjonalną sekcję "Pane slots" w Visual
- [ ] Poprawić placeholder pustego panelu na CTA

### Średnie
- [ ] Ujednolicić tryb Advanced — dodać faktycznie "zaawansowane" opcje lub przełączyć na diagnostykę
- [ ] Dodać miniaturkę mobile behavior (stack vs keep)
- [ ] Dodać przycisk "Reset do domyślnych"
- [ ] Dokumentacja ratio.tablet → mobile mapping gdy `collapseMobile === "keep"`

### Niskie/Future
- [ ] Per-breakpoint gap control
- [ ] Dedykowany `ratio.mobile`
- [ ] Per-pane styling (padding, background)
- [ ] Min-height per pane
