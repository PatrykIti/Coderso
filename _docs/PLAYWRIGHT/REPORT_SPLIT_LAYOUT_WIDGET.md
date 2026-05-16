# REPORT: Split Layout Widget — UX/UI Audit

**Widget:** `split-layout`
**Data:** 2026-05-16
**Status:** Zakończony
**Pliki:** `core/widgets/core/splitLayout.tsx`, `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
**Strona testowa:** `http://localhost:5173/admin/pages/4a1bbf86-6e3c-4aa7-804c-66df11d34186`
**Frontend URL:** `http://localhost:3000/test-split-layout-0516`

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

## 2. Wyniki testów — Admin UI (http://localhost:5173/admin)

### 2.1 Wizard

| Test | Wynik | Uwagi |
|---|---|---|
| Otwieranie Wizard edytora | ✅ OK | Otwiera się automatycznie po dodaniu widgetu |
| Split preset dropdown (50/50, 40/60, 60/40) | ✅ OK | Poprawnie pokazuje 3 opcje, zmiana aktualizuje `block.variant` |
| Mobile behavior (Stack / Keep split) | ✅ OK | Oba tokeny działają |
| Base gap dropdown (None, Gap 0–12) | ✅ OK | Zmiana odzwierciedlona w `data-split-gap` |
| "Continue to layout and styling" button | ✅ OK | Prawidłowo przełącza do zakładki Visual |
| Live preview po zmianie preset | ⚠️ POZORNE | Widget header pokazuje "40-60", ale **faktyczny rendering używa 50/50** (patrz BUG-01) |

### 2.2 Visual

| Test | Wynik | Uwagi |
|---|---|---|
| Karty wariantów (50/50, 40/60, 60/40) — kliknięcie | ✅ OK | Zmienia `block.variant`, aktualizuje "Selected" badge |
| Desktop ratio dropdown | ✅ OK | Zmiana poprawnie aktualizuje `data-split-ratio-desktop` |
| Tablet ratio dropdown | ✅ OK | Zmiana poprawnie aktualizuje `data-split-ratio-tablet` |
| Collapse mode dropdown | ✅ OK | `stack`/`keep` poprawnie mapuje na `data-split-collapse-mobile` |
| Reverse on mobile toggle | ✅ OK | Aktualizuje `data-split-reverse-mobile` |
| Gap dropdown | ✅ OK | Aktualizuje `data-split-gap` |
| Vertical align dropdown | ✅ OK | Aktualizuje `data-split-vertical-align`, `items-center` itd. |
| Sekcja "Pane slots" | ⚠️ INFO ONLY | Tylko tekst statyczny; poniżej jest sekcja "Structure" z faktyczną informacją o slotach |

### 2.3 Advanced

| Test | Wynik | Uwagi |
|---|---|---|
| JSON snapshot widoczny i aktualny | ✅ OK | Pokazuje znormalizowane dane, aktualizuje się po zmianie |
| Kontrolki ratio/gap/align | ✅ OK | Identyczne jak w Visual — brak faktycznie "zaawansowanych" opcji |
| Sekcja "Layout" (Container, Padding, Margin) | ✅ OK | Dodatkowa sekcja względem Visual — wspólna dla wszystkich widgetów |
| Sekcja "Visibility" | ✅ OK | Dostępna tylko w Advanced |

### 2.4 Preview dialog (Desktop/Tablet/Mobile)

| Test | Wynik | Uwagi |
|---|---|---|
| Preview dialog otwiera się | ✅ OK | Poprawny iframe z podglądem |
| Przełącznik Desktop/Tablet/Mobile | ✅ OK | Wizualnie zmienia viewport iframe |
| Podgląd pustych paneli | ✅ OK | Pokazuje "Empty left pane." / "Empty right pane." |

---

## 3. Wyniki testów — Frontend (http://localhost:3000/test-split-layout-0516)

| Test | Admin | Frontend | Zgodne? |
|---|---|---|---|
| `data-split-layout-variant` | `60-40` | `60-40` | ✅ |
| `data-split-ratio-desktop` | `60-40` | `60-40` | ✅ |
| `data-split-ratio-tablet` | `50-50` | `50-50` | ✅ |
| `data-split-collapse-mobile` | `keep` | `keep` | ✅ |
| `data-split-reverse-mobile` | `true` | `true` | ✅ |
| `data-split-gap` | `6` | `6` | ✅ |
| `data-split-vertical-align` | `center` | `center` | ✅ |
| CSS klasy kontenera | `grid w-full min-w-0 grid-cols-12 md:grid-cols-12 gap-6 items-center` | identyczne | ✅ |
| CSS klasy lewego panelu | `min-w-0 col-span-6 md:col-span-6 lg:col-span-7 order-2 md:order-1` | identyczne | ✅ |
| CSS klasy prawego panelu | `min-w-0 col-span-6 md:col-span-6 lg:col-span-5 order-1 md:order-2` | identyczne | ✅ |

**Wniosek:** Frontend i admin preview renderują identycznie. Nie ma rozbieżności między podglądem admina a stroną frontendową.

---

## 4. Znalezione błędy i problemy UX

### BUG-01 — KRYTYCZNY: Wizard preset nie synchronizuje data.ratio

**Opis:** Gdy użytkownik zmienia preset w Wizard (np. wybiera "40 / 60"), zmieniony zostaje tylko `block.variant`, ale NIE `data.ratio.desktop` ani `data.ratio.tablet`. Renderer używa `data.ratio.desktop` do obliczenia rzeczywistych span-ów kolumn. Efekt: pomimo że header widgetu pokazuje "40-60", faktyczne kolumny są renderowane w proporcji **50/50** (domyślna wartość data.ratio).

**Reprodukcja:**
1. Dodaj Split Layout widget
2. W Wizard ustaw preset na "40 / 60"
3. Sprawdź: header widgetu pokazuje "40-60"
4. Przejdź do Visual editor — Desktop ratio dropdown pokazuje "50 / 50"
5. Sprawdź `data-split-ratio-desktop` → wartość "50-50"
6. Faktyczny layout: 6/6 kolumn (50/50), nie 5/7 (40/60)

**Dane z testów:**
```
block.variant = "40-60"
data-split-layout-variant = "40-60"  ← z block.variant
data-split-ratio-desktop = "50-50"   ← z data.ratio.desktop (nie zaktualizowane!)
faktyczne kolumny desktop: lg:col-span-6 / lg:col-span-6 (50/50)
```

**Przyczyna kodu:** `splitLayout.tsx:174` — `resolveSplitLayoutRatio(data.ratio?.desktop, resolvedVariant)` — gdy `data.ratio.desktop = "50-50"` (valid token), normalizer zachowuje tę wartość zamiast użyć fallbacku z `resolvedVariant`.

**Wpływ:** Użytkownik myśli że zmienił layout, ale rendering pozostaje bez zmian.

---

### BUG-02 — WYSOKI: Duplikat tokenów gap "None" i "Gap 0"

**Opis:** W dropdownie gap widoczne są dwie osobne opcje: "None" i "Gap 0". Obie mapują się na identyczną klasę CSS `gap-0` — zachowanie jest identyczne.

**Dane z testów:** Dropdown pokazuje kolejno: None → Gap 0 → Gap 1 → Gap 2...

**Przyczyna kodu:** `splitLayout.tsx:8-20` — `splitLayoutGapTokens` zawiera zarówno `"none"` jak i `"0"`. `gapClassMap` (`splitLayout.tsx:114-126`) mapuje oba na `"gap-0"`.

**Wpływ:** Dezorientacja użytkownika — dwie opcje o różnych nazwach ale identycznym efekcie.

---

### BUG-03 — WYSOKI: Mobile layout przy "Keep split" używa ratio.tablet (brak dedykowanego mobile ratio)

**Opis:** Gdy `collapseMobile === "keep"`, panele na mobile używają span-ów z `mobileKeepLeftSpanMap[ratio.tablet]` — czyli proporcje mobilne są takie same jak tabletowe. Nie istnieje dedykowane `ratio.mobile`. Użytkownik ustawiając "Tablet ratio" nieświadomie steruje też mobilem.

**Dane z testów:**
```css
/* tablet ratio = 50-50 */
/* mobile keep: */
left: col-span-6 md:col-span-6  /* identyczne! */
```

**Przyczyna kodu:** `splitLayout.tsx:214-215`:
```tsx
mobileStack ? "col-span-1" : mobileKeepLeftSpanMap[ratio.tablet ?? "50-50"],
```

**Wpływ:** Brak możliwości ustawienia innej proporcji na mobile niż na tablecie w trybie "keep".

---

### BUG-04 — WYSOKI: "Reverse on mobile" aktywny gdy collapseMobile = "keep" — brak wyjaśnienia

**Opis:** Toggle "Reverse on mobile" jest zawsze aktywny i klikalny, niezależnie od wartości `collapseMobile`. W trybie "keep" zmienia kolejność CSS (`order-1`/`order-2`), co wizualnie "odwraca" panele na WSZYSTKICH rozdzielczościach (nie tylko mobile, bo `md:order-*` blokuje efekt od tabletu wzwyż). Jednak UI mówi tylko "Swap left/right pane order only on mobile" — nie wyjaśnia różnicy w zachowaniu między trybem stack i keep.

**Dane z testów:** Toggle nie jest `disabled` gdy `collapseMobile = "keep"`. Brak disabled state, brak warunkowego opisu.

---

### ISSUE-01 — ŚREDNI: Dwa systemy sterowania ratio mogą się rozjechać

**Opis:** Karty wariantów w Visual editor zmieniają `block.variant` (przez `onVariantChange`), podczas gdy dropdown Desktop/Tablet ratio zmienia `data.ratio.desktop/tablet`. Gdy user kliknie kartę "60/40" i jednocześnie ma Desktop ratio ustawiony na "40/60", wynik jest niejasny.

**Dane z testów:**
- Karta wariantu: "60/40 Selected"
- Desktop ratio dropdown: "50 / 50" (niezaktualizowany po kliknięciu karty)
- `data-split-ratio-desktop`: "50-50" (faktyczny rendering)

**Rekomendacja:** Kliknięcie karty wariantu powinno też aktualizować `data.ratio.desktop` i `data.ratio.tablet`.

---

### ISSUE-02 — ŚREDNI: Sekcja "Pane slots" w Visual jest redundantna i niefunkcjonalna

**Opis:** Visual editor zawiera sekcję "Pane slots" która wyświetla tylko tekst: *"Use insert dialog targeting to place widgets into each side."* — zero akcji, linków, ani przycisków. Poniżej tej sekcji jest sekcja "Structure" z faktyczną informacją o slotach (liczba elementów, status). Dwie sekcje dotyczące slotów to nadmiar.

---

### ISSUE-03 — ŚREDNI: Advanced editor nie oferuje faktycznie "zaawansowanych" opcji

**Opis:** Zakładka Advanced zawiera te same kontrolki co Visual (ratio desktop/tablet, collapse, gap, align, reverse toggle) plus JSON dump. Nie ma żadnych unikalnych "zaawansowanych" funkcji. Dodatkowe sekcje "Layout" i "Visibility" w Advanced to sekcje wspólne dla wszystkich widgetów, nie specyficzne dla split-layout.

---

### ISSUE-04 — NISKI: Etykiety gap nie podają px/rem

**Opis:** Opcje "Gap 1", "Gap 2"... "Gap 12" nie komunikują ile pikseli/rem reprezentują. Użytkownik nie może ocenić wartości wizualnej bez kontekstu.

**Dane z testów:** Dropdown gap: None | Gap 0 | Gap 1 | Gap 2 | Gap 3 | Gap 4 | Gap 5 | Gap 6 | Gap 8 | Gap 10 | Gap 12.

---

### ISSUE-05 — NISKI: Brak wizualnego podglądu proporcji na kartach wariantów

**Opis:** Karty wariantów (50/50, 40/60, 60/40) pokazują tylko tekst i opis słowny. Brak graficznej miniaturki/ikony która wizualnie pokazuje jak panele będą wyglądać.

---

### ISSUE-06 — NISKI: Placeholder pustego panelu nie sugeruje akcji

**Opis:** Puste panele wyświetlają komunikat "Empty left pane." / "Empty right pane." — tekst statyczny, bez przycisku CTA ani wskazówki jak dodać treść. Admin canvas co prawda posiada przycisk "Add widget to Left/Right", ale placeholder w preview podglądu tego nie pokazuje.

---

## 5. Podsumowanie priorytetów

### Krytyczne — do naprawy przed releasem
- [x] **BUG-01**: Wizard preset nie synchronizuje `data.ratio.desktop/tablet` — rendering jest inny niż to co user widzi w headerze widgetu.

### Wysokie — do naprawy w najbliższym sprincie
- [ ] **BUG-02**: Usunąć duplikat `"none"` / `"0"` w tokenach gap
- [ ] **BUG-03**: Dokumentacja lub UI musi komunikować że tablet ratio = mobile ratio w trybie "keep"
- [ ] **BUG-04**: Wyjaśnić lub zablokować "Reverse on mobile" w kontekście `collapseMobile === "keep"`

### Średnie — do uwzględnienia w backlogu
- [ ] **ISSUE-01**: Kliknięcie karty wariantu powinno synchronizować `data.ratio.desktop/tablet`
- [ ] **ISSUE-02**: Usunąć lub przekształcić sekcję "Pane slots" w Visual — jest redundantna wobec "Structure"
- [ ] **ISSUE-03**: Advanced editor powinien mieć faktycznie zaawansowane opcje (lub zmienić jego zakres)

### Niskie — nice-to-have
- [ ] **ISSUE-04**: Dodać px/rem w etykietach gap (tooltip lub opis)
- [ ] **ISSUE-05**: Dodać graficzne miniaturki na kartach wariantów
- [ ] **ISSUE-06**: Zamienić placeholder "Empty left/right pane" na sugestię akcji

---

## 6. Admin vs Frontend: Porównanie

**Wynik: Frontend i Admin preview są w 100% spójne.**

Wszystkie data-atrybuty i klasy CSS są identyczne między podglądem admin a stroną frontend. Żaden z wykrytych błędów nie jest rozbieżnością admin/frontend — są to problemy UX w samym edytorze admin.
