# REPORT: Toggle Block Widget — UX/UI Audit

**Widget:** `toggle-block`  
**Data:** 2026-05-16  
**Status:** Zakończony — pełny raport (analiza kodu + testy Playwright: Admin UI + Frontend)  
**Pliki:** `core/widgets/core/toggleBlock.tsx`, `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`

---

## 1. Przegląd widgetu

Toggle Block to interaktywny widget przełączający widoczność między dwoma panelami treści (Primary/Secondary). Posiada dwa warianty wizualne (Switch, Cards), konfigurowalny stan domyślny, etykiety przycisków i tekst pomocniczy. Widget renderuje runtime script odpowiedzialny za obsługę kliknięć i nawigacji klawiaturą.

### Obsługiwane opcje

| Opcja | Wartości | Domyślna |
|---|---|---|
| `variant` | `switch`, `cards` | `switch` |
| `labels.primary` | string | `"View A"` |
| `labels.secondary` | string | `"View B"` |
| `labels.helper` | string | `"Switch between two content views."` |
| `options.defaultState` | `primary`, `secondary` | `primary` |
| `style.surfaceColor` | CSS string (clearable) | `var(--color-surface)` |
| `style.borderColor` | CSS string | `var(--color-border)` |
| `style.accentColor` | CSS string | `var(--color-text)` |

---

## 2. Znalezione braki funkcjonalne (z analizy kodu)

### 2.1 Zduplikowane ID elementów HTML — błąd krytyczny dla wielu instancji

- **Problem:** `id="toggle-trigger-primary"`, `id="toggle-trigger-secondary"`, `id="toggle-pane-primary"`, `id="toggle-pane-secondary"` są hardcodowane w JSX (`toggleBlock.tsx:325, 329, 349, 368`). Jeśli na stronie pojawią się dwa lub więcej widgetów Toggle Block, identyfikatory ID będą się dublować.
- **Wpływ:** Duplikaty ID łamią powiązania ARIA (`aria-labelledby`, `aria-controls`), JavaScript `querySelector` zwraca pierwszy pasujący element, co powoduje nieprawidłowe działanie nawigacji i screen-readerów.
- **Rekomendacja:** Wygenerować unikalne ID per instancję, np. przez przekazanie `instanceId` (UUID lub inkrementacji) do komponentu.

### 2.2 Globalny flag `window.__nextlessToggleBlockBound` blokuje reinicjalizację

- **Problem:** Runtime script ustawia globalną flagę `window.__nextlessToggleBlockBound = true` i nie rejestruje handlerów ponownie (`toggleBlock.tsx:144-145`). Jeśli script zostanie wywołany po partial hydration (np. live reload, SPA navigation) flaga uniemożliwia ponowną rejestrację event listenerów.
- **Wpływ:** Po odświeżeniu fragmentu DOM bez pełnego przeładowania strony toggle może przestać działać.
- **Rekomendacja:** Rozważyć event delegation na `document` (już jest) + sprawdzenie czy nie ma regresji przy SPA. Flaga jest technicznie poprawna dla pierwszego ładowania, ale warta dokumentacji.

### 2.3 Niemożliwość wyczyszczenia helper text

- **Problem:** Funkcja `normalizeToggleBlockData` traktuje pusty/whitespace string jako `null` i zawsze falluje do domyślnego tekstu `"Switch between two content views."` (`toggleBlock.tsx:103`). Użytkownik nie może usunąć tekstu pomocniczego.
- **Lokalizacja kodu:** `toggleBlock.tsx:103` — `toTrimmedString(data.labels?.helper) ?? toggleBlockDefaults.labels?.helper ?? undefined`
- **Wpływ:** Brak kontroli nad obecnością tekstu pomocniczego — widget zawsze go wyświetla.
- **Rekomendacja:** Wyróżnić przypadek "świadomie wyczyszczone" vs "nigdy nie ustawione" (np. przez `null` jako sentinel). Dodać checkbox/toggle "Show helper text" do edytora.

### 2.4 Niekonsekwentny system clearable fields w edytorze

- **Problem:** Pole `surfaceColor` posiada `ClearableFieldHeader` z przyciskiem X (`ToggleBlockEditors.tsx:264-267`), natomiast `borderColor` i `accentColor` używają zwykłego `<p>` bez możliwości wyczyszczenia (`ToggleBlockEditors.tsx:280, 293`). Funkcja `clearStyleField` jest zdefiniowana dla wszystkich pól (`ToggleBlockEditors.tsx:102-114`) ale używana tylko dla `surfaceColor`.
- **Wpływ:** Niespójny UX — użytkownik musi sam wiedzieć, że inne pola też można wyczyścić (ale nie ma jak).
- **Rekomendacja:** Zastosować `ClearableFieldHeader` dla wszystkich trzech pól stylowych.

### 2.5 Hardcoded kontrast accent — `--nextless-toggle-accent-contrast`

- **Problem:** Wartość CSS `--nextless-toggle-accent-contrast` jest zawsze hardcodowana jako `var(--color-background)` (`toggleBlock.tsx:303`). Nie ma możliwości jej konfiguracji w edytorze.
- **Wpływ:** Przy ciemnym accent color na jasnym tle kontrast tekstu przycisku może być nieczytelny.
- **Rekomendacja:** Dodać pole `accentContrastColor` do `ToggleBlockData.style` lub automatycznie wyliczać kontrast (WCAG AA).

### 2.6 Brak możliwości posiadania więcej niż 2 stanów

- **Problem:** Architektura widgetu jest hardcodowana na dokładnie dwa stany: `primary` i `secondary`. Nie ma rozszerzalności (3+ views).
- **Wpływ:** Ograniczone zastosowanie — np. "Tabs" z 3+ zakładkami jest niemożliwe bez innego widgetu.
- **Rekomendacja:** To może być świadoma decyzja projektowa (atomic widget). Jeśli tak — warto opisać to explicite w dokumentacji; jeśli nie — rozważyć dynamiczne sloty.

### 2.7 Brak kontroli animacji/przejść

- **Problem:** Klasa CSS `transition` jest dodawana do triggerów (`toggleBlock.tsx:323`), ale nie ma żadnej kontroli przejść dla samych paneli. Panele pojawiają się/znikają natychmiastowo przez `hidden` attribute.
- **Wpływ:** Brak płynnych przejść między panelami może być odczuwany jako "jumpy" UI.
- **Rekomendacja:** Opcjonalnie dodać konfigurowalną animację fade/slide lub przynajmniej CSS `opacity` transition.

### 2.8 Wariant `cards` różni się minimalnie od `switch` wizualnie

- **Problem:** Jedyna różnica między wariantami `switch` i `cards` to zaokrąglenie przycisku (`rounded-full` vs `rounded-md`) oraz opcjonalne `rounded-lg` dla pane. Opis "Larger card-like panes for richer content swaps" sugeruje coś bardziej znaczącego wizualnie.
- **Lokalizacja kodu:** `toggleBlock.tsx:258-263`
- **Wpływ:** Użytkownik wybierający `cards` może być rozczarowany minimalną różnicą.

### 2.9 Brak per-pane stylowania

- **Problem:** Nie ma opcji niezależnego stylowania Primary Pane vs Secondary Pane (tło, padding, border-radius per-pane).
- **Wpływ:** Np. nie można zrobić "Primary: jasne tło, Secondary: ciemne tło" bez zagnieżdżenia widgetów.

### 2.10 `aria-label` radiogroup jest hardcoded i nielokalizable

- **Problem:** `aria-label="Toggle content view"` na `div[role="radiogroup"]` (`toggleBlock.tsx:313`) jest hardcodowanym angielskim stringiem niedostępnym dla wielojęzycznych serwisów.
- **Rekomendacja:** Wystawić konfigurowalną etykietę ARIA lub wyprowadzić ją z `labels.helper`.

---

## 3. Problemy UX (z perspektywy użytkownika)

### 3.1 Nie można wyczyścić tekstu pomocniczego

- **Problem:** Pole "Helper text" w edytorze zawsze zapełnia się domyślnym tekstem po wyczyszczeniu. Użytkownik nie ma opcji "brak tekstu pomocniczego".
- **Doświadczenie:** Użytkownik usuwa tekst z pola, klika gdzie indziej, wraca do edytora — pole znowu ma domyślną wartość.

### 3.2 Brak wizualnego podglądu wariantów w edytorze

- **Problem:** Karty wariantów (`Switch`, `Cards`) pokazują tylko nazwę i opis tekstowy. Brak miniaturki prezentującej jak trigger przyciski wyglądają.
- **Wpływ:** Użytkownik musi kliknąć i sprawdzić w live preview by zobaczyć różnicę.

### 3.3 Wizard oferuje za mało w stosunku do nazwy

- **Problem:** Wizard zawiera tylko Variant + Labels — identyczna zawartość jak Visual minus sekcja Behavior/Style. Nie prowadzi użytkownika krok po kroku przez konfigurację (brak numerowanych kroków, progress, "Next" CTA).
- **Wpływ:** "Wizard" jest mylącą nazwą — de facto to "Simplified Visual".

### 3.4 Wszystkie 3 tryby edytora zawierają ten sam blok Variant

- **Problem:** Sekcja `VariantCards` jest powtórzona dosłownie we wszystkich trzech edytorach (Wizard, Visual, Advanced) — brak diferenciacji między trybami.
- **Wpływ:** Nie ma powodu zmieniać tryb edytora jeśli zawartość jest prawie identyczna.

### 3.5 Brak kolorowego color pickera — tylko surowy string CSS

- **Problem:** Pola `surfaceColor`, `borderColor`, `accentColor` to zwykłe input tekstowe wymagające znajomości składni CSS (`var(--color-X)` lub hex).
- **Wpływ:** Użytkownicy nieznający CSS/tokenów systemowych nie mogą intuicyjnie wybrać koloru. Brak natychmiastowej informacji zwrotnej co wpisać.
- **Rekomendacja:** Dodać color swatch z listą dostępnych tokenów systemowych lub `<input type="color">` obok pola.

### 3.6 Brak przycisku "Reset do domyślnych"

- **Problem:** Nie ma sposobu przywrócenia domyślnych wartości jednym kliknięciem po edycji.

### 3.7 Placeholder pustego panelu nie wskazuje jak dodać treść

- **Problem:** Puste pane wyświetla `"Add widgets for the primary view."` (`toggleBlock.tsx:362`) — bez żadnego CTA ani instrukcji jak faktycznie to zrobić.
- **Rekomendacja:** Dodać ikonę "+" i wskazanie Insert Dialog.

### 3.8 Brak informacji o aktywnym stanie w edytorze

- **Problem:** W live preview edytora, jeśli `defaultState === "secondary"`, widoczny jest Secondary pane — ale edytor nie komunikuje wyraźnie że podgląd pokazuje drugą zakładkę, nie pierwszą.

---

## 4. Testy w przeglądarce — Admin UI (http://localhost:5173/admin)

Strona testowa: `TEST-TOGGLE-BLOCK-0516` (`/test-toggle-block-0516`).

### 4.1 Wizard

| Test | Wynik | Uwagi |
|---|---|---|
| Otwieranie Wizard edytora | ✅ OK | Otwiera się domyślnie po dodaniu widgetu |
| Wybór wariantu Switch | ✅ OK | Karta zmienia `[data-state=active]`, preview aktualizuje klasę `rounded-full` |
| Wybór wariantu Cards | ✅ OK | Karta zmienia `[data-state=active]`, preview aktualizuje klasę `rounded-md` |
| Zmiana Primary label | ✅ OK | Live preview natychmiast aktualizuje tekst triggera |
| Zmiana Secondary label | ✅ OK | Live preview natychmiast aktualizuje tekst triggera |
| Zmiana Helper text | ✅ OK | Wpisanie nowego tekstu działa |
| **Wyczyszczenie Helper text** | ❌ **BUG** | Po wyczyszczeniu pola wartość NATYCHMIAST wraca do `"Switch between two content views."` — normalizer nie pozwala na pusty string |
| Live preview po zmianie wariantu | ✅ OK | Preview reaguje na zmiany w czasie rzeczywistym |
| Wariant Cards w preview | ⚠️ UWAGA | Różnica wizualna minimalnie zauważalna — tylko `rounded-full` → `rounded-md` |

### 4.2 Visual

| Test | Wynik | Uwagi |
|---|---|---|
| Karty wariantów — kliknięcie Switch | ✅ OK | Poprawna zmiana wariantu |
| Karty wariantów — kliknięcie Cards | ✅ OK | Poprawna zmiana wariantu |
| Zmiana Primary / Secondary label | ✅ OK | Live preview aktualizuje triggery |
| Helper text — wyczyszczenie i powrót | ❌ **BUG** | Identyczny bug jak w Wizard — powrót do default |
| Default state — Primary | ✅ OK | Dropdown poprawnie zmienia `defaultState` |
| Default state — Secondary | ✅ OK | Preview pokazuje secondary pane po zmianie |
| Surface color — wpisanie `#f0f4ff` | ✅ OK | `background-color: rgb(240, 244, 255)` pojawia się w preview |
| **Surface color — przycisk Clear** | ✅ OK | Przycisk "Clear" istnieje i usuwa `backgroundColor` ze style |
| **Border color — brak przycisku Clear** | ❌ **BUG** | Tylko `<p>` — brak `ClearableFieldHeader`. Border color wraca do `var(--color-border)` po wyczyszczeniu pola |
| **Accent color — brak przycisku Clear** | ❌ **BUG** | Tylko `<p>` — brak `ClearableFieldHeader`. Niespójność z `surfaceColor` |
| Border color — wpisanie wartości | ✅ OK | Wpisanie `#ff0000` aktualizuje `borderColor` w preview |
| Accent color — wpisanie wartości | ✅ OK | Wpisanie `#0000ff` aktualizuje `--nextless-toggle-accent` CSS var |
| Live preview po każdej zmianie | ✅ OK | Preview reaguje na wszystkie zmiany |

### 4.3 Advanced

| Test | Wynik | Uwagi |
|---|---|---|
| JSON Diagnostics widoczny | ✅ OK | Sekcja `Diagnostics` z `pre` wyświetla normalized payload |
| JSON aktualizuje się po zmianach | ✅ OK | Po zmianie default state na `secondary` JSON pokazał poprawną wartość |
| Kontrolki identyczne z Visual | ✅ OK | Wszystkie kontrolki Visual są dostępne + sekcja Diagnostics |
| JSON zawiera defaultState=secondary | ✅ OK | Potwierdzono: `"defaultState": "secondary"` |
| JSON pokazuje brak surfaceColor po Clear | ✅ OK | Po kliknięciu Clear, `surfaceColor` znika z JSON payload |

---

## 5. Testy w przeglądarce — Frontend (http://localhost:3000)

URL testowy: `http://localhost:3000/test-toggle-block-0516`

### 5.1 Renderowanie i interakcja

| Test | Wynik | Uwagi |
|---|---|---|
| Wariant Cards — renderowanie | ✅ OK | `data-nextless-toggle-variant="cards"`, triggerklasa `rounded-md border px-3 py-2` |
| Wariant Switch — renderowanie | ✅ OK | `data-nextless-toggle-variant="switch"`, triggerklasa `rounded-full border px-3 py-1.5` |
| Kliknięcie Primary trigger | ✅ OK | `data-nextless-toggle-state` zmienia się na `primary`, pane widoczny |
| Kliknięcie Secondary trigger | ✅ OK | `data-nextless-toggle-state` zmienia się na `secondary`, pane widoczny |
| Nawigacja klawiaturą `ArrowRight` | ✅ OK | Przełącza na secondary |
| Nawigacja klawiaturą `ArrowLeft` | ✅ OK | Przełącza na primary |
| Nawigacja klawiaturą `End` | ✅ OK | Przełącza na secondary (ostatni) |
| Nawigacja klawiaturą `Home` | ✅ OK | Przełącza na primary (pierwszy) |
| Default state Primary — widoczny Primary pane | ✅ OK | Drugi blok (View A/B, switch) pokazuje primary pane domyślnie |
| Default state Secondary — widoczny Secondary pane | ✅ OK | Pierwszy blok (Primary/Secondary Tab, cards) pokazuje secondary pane domyślnie |
| Helper text widoczny | ✅ OK | `<p>Switch between two content views.</p>` renderuje się na froncie |
| Helper text ukryty (brak) | ⚠️ NIEMOŻLIWE | Ze względu na bug normalizatora — nie da się ustawić pustego helper text |
| ARIA `role="radiogroup"` obecny | ✅ OK | `aria-label="Toggle content view"` — hardcoded |
| ARIA `aria-checked` poprawny | ✅ OK | Aktualizuje się po każdym kliknięciu |
| ARIA `aria-live="polite"` | ✅ OK | Screen reader announcement działa |
| **Dwie instancje — niezależność kliknięć** | ✅ OK | Runtime script poprawnie izoluje kliknięcia przez `closest('[data-nextless-toggle-block]')` |
| **Dwie instancje — duplikaty HTML ID** | ❌ **KRYTYCZNY BUG** | `toggle-trigger-primary`, `toggle-trigger-secondary`, `toggle-pane-primary`, `toggle-pane-secondary` zduplikowane |
| **Dwie instancje — ARIA aria-controls** | ❌ **KRYTYCZNY BUG** | Triggery drugiego bloku mają `aria-controls` wskazujące na pane PIERWSZEGO bloku (`sameBlock: false`) |
| **Dwie instancje — ARIA aria-labelledby** | ❌ **KRYTYCZNY BUG** | Pane drugiego bloku mają `aria-labelledby` wskazujące na triggery PIERWSZEGO bloku (`sameBlock: false`) |

---

## 6. Porównanie admin vs frontend

| Zachowanie | Admin preview | Frontend | Zgodne? |
|---|---|---|---|
| Wariant Switch — klasy triggera (`rounded-full`, `py-1.5`) | ✅ Poprawne | ✅ Poprawne | ✅ Tak |
| Wariant Cards — klasy triggera (`rounded-md`, `py-2`) | ✅ Poprawne | ✅ Poprawne | ✅ Tak |
| Default state = secondary → secondary pane widoczny | ✅ Poprawne | ✅ Poprawne | ✅ Tak |
| Helper text widoczny | ✅ Widoczny | ✅ Widoczny | ✅ Tak |
| Kliknięcie triggera zmienia pane (runtime script) | ⚠️ Tylko w izolowanym preview | ✅ Działa | Brak bezpośredniego kliknięcia w admin preview (SSR preview) |
| Nawigacja klawiaturą | ⚠️ N/A w admin | ✅ Działa | — |
| Surface/border/accent color odzwierciedlone | ✅ Poprawne | ✅ Poprawne | ✅ Tak |
| Duplikaty HTML ID w admin preview | ❌ Duplikaty | ❌ Duplikaty | ✅ Spójne (ale oba błędne) |

---

## 7. Podsumowanie priorytetów

### Krytyczne (zweryfikowane testami)
- [ ] **Duplikaty HTML ID** — `toggle-trigger-primary`, `toggle-pane-primary` etc. muszą zawierać unikalny `instanceId` per blok. Powoduje złamane ARIA (`aria-controls`, `aria-labelledby`) dla drugiej i kolejnych instancji na stronie. Plik: `toggleBlock.tsx:325, 329, 349, 368`.
- [ ] **Wyczyszczenie helper text niemożliwe** — normalizer natychmiast przywraca domyślną wartość `"Switch between two content views."` gdy pole jest puste. Plik: `toggleBlock.tsx:103`. Potrzebny sentinel `null` zamiast `undefined` + checkbox "Show helper text".

### Wysokie (zweryfikowane testami)
- [ ] **Niespójny system clearable fields** — `surfaceColor` ma `ClearableFieldHeader`, `borderColor` i `accentColor` NIE mają, mimo że funkcja `clearStyleField` jest dla nich gotowa. Plik: `ToggleBlockEditors.tsx:280, 293`. Naprawić przez dodanie `ClearableFieldHeader` do obu pól.
- [ ] **`--nextless-toggle-accent-contrast` hardcoded** — kontrast tekstu na aktywnym triggerze zawsze `var(--color-background)`. Przy ciemnym accent na ciemnym tle nieczytelne. Plik: `toggleBlock.tsx:303`.
- [ ] **Minimalna różnica wizualna Switch vs Cards** — tylko `rounded-full`/`rounded-md` i `py-1.5`/`py-2`. Użytkownik nie widzi znaczącej różnicy w preview.
- [ ] **Placeholder pustego pane nie ma CTA** — `"Add widgets for the primary view."` bez interaktywnej akcji. Plik: `toggleBlock.tsx:362, 381`.

### Średnie
- [ ] Wizard nie jest prawdziwym wizard flow — brak kroków, numeracji, "Next" CTA. Rozważyć przemianowanie na "Simple".
- [ ] Brak color picker / listy tokenów systemowych — pola kolorów wymagają znajomości składni CSS.
- [ ] Brak przycisku "Reset do domyślnych".
- [ ] Hardcoded `aria-label="Toggle content view"` — nie jest internacjonalizowalny. Plik: `toggleBlock.tsx:313`.

### Niskie/Future
- [ ] Animacja przejść między panelami (obecnie natychmiastowe `hidden` toggle).
- [ ] Per-pane stylowanie (tło, padding).
- [ ] Wsparcie dla 3+ stanów (jeśli zmiana kierunku w stronę "Tabs").
- [ ] Konfigurowalny `accentContrastColor`.
- [ ] Globalny flag `window.__nextlessToggleBlockBound` — udokumentować ryzyko przy SPA navigation (`toggleBlock.tsx:144-145`).

---

## 8. Wyniki testów — podsumowanie weryfikacji

| Kwestia z analizy kodu | Zweryfikowane? | Wynik |
|---|---|---|
| Duplikaty HTML ID dla 2+ instancji | ✅ Tak | ❌ Potwierdzone na admin + frontend |
| Helper text nie można wyczyścić | ✅ Tak | ❌ Potwierdzone w Wizard i Visual |
| Brak Clear dla borderColor/accentColor | ✅ Tak | ❌ Potwierdzone — tylko surfaceColor ma Clear |
| ARIA aria-controls/aria-labelledby błędne przy 2+ instancjach | ✅ Tak | ❌ Potwierdzone — sameBlock: false dla bloku 2 |
| Kliknięcia dwóch instancji są niezależne | ✅ Tak | ✅ OK — runtime script używa `.closest()` |
| Nawigacja klawiaturą działa | ✅ Tak | ✅ ArrowLeft/Right/Home/End działają |
| Live preview aktualizuje się | ✅ Tak | ✅ Wszystkie kontrolki aktualizują preview |
| Switch vs Cards — minimalna różnica | ✅ Tak | ⚠️ Tylko radius i padding triggera |
