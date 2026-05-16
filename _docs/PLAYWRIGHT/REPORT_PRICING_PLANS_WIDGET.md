# RAPORT: Pricing Plans Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #N (Pricing Plans Widget)  
> **Środowisko admin:** http://localhost:5173/admin  
> **Środowisko front:** http://localhost:3000  
> **Strona testowa:** TEST-PRICING-PLANS-0516 (`/admin/pages/8902f76a-6745-4788-a9c6-9356998d3e9f`)

---

## 1. Przegląd widgetu

**Typ:** Composite  
**Moduł:** Content  
**Warianty:** `three-plans`, `four-plans`, `comparison-rows`  
**Slot:** brak (widget samodzielny)

Pricing Plans widget prezentuje karty cenowe lub tabelę porównawczą planów subskrypcyjnych. Obsługuje: nagłówek sekcji, przełącznik cyklu rozliczeniowego (monthly/annual), do 6 planów z funkcjami i CTA, kolory kart, promowanie wybranego planu (highlight).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych (`PricingPlansData`)

| Sekcja | Pola |
|--------|------|
| **Header** | `title`, `description` |
| **Plans (2–6)** | `id`, `name`, `price`, `period`, `badge`, `prices.monthly`, `prices.annual`, `features[]`, `ctaLabel`, `ctaHref`, `highlighted` |
| **billingToggle** | `enabled`, `monthlyLabel`, `annualLabel`, `defaultCycle` |
| **style** | `cardSurface`, `cardBorder`, `highlightRing`, `spacing` (4), `radius` (4), `featureMarker` (3) |

### 2.2 Warianty

| ID | Opis | Liczba planów |
|----|------|---------------|
| `three-plans` | Układ kart 3-kolumnowy | zawsze 3 |
| `four-plans` | Układ kart 4-kolumnowy | zawsze 4 |
| `comparison-rows` | Tabela porównawcza feature-by-feature | zawsze 3 |

**Uwaga z kodu:** `pricingVariantPlanCountMap` wymusza stałą liczbę planów per wariant — zmiana wariantu "ucina" lub dodaje plany automatycznie przez `normalizePricingPlans`.

### 2.3 Tryby edytora

- **Wizard** — uproszczony: layout dropdown, title, plans count, basic plan setup (name + price only)
- **Visual** — pełny: variant cards, plans count, header copy, billing toggle, plans/features/CTA, colors & emphasis
- **Advanced** — techniczne: spacing/radius tokens, normalizacja payloadu, raw JSON snapshot

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

### 3.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie Three Plans / Four Plans / Comparison Rows | ✓ Działa |
| Three Plans: grid 3-kolumnowy | ✓ Działa |
| Four Plans: grid 4-kolumnowy (sm:2, xl:4) | ✓ Działa |
| Comparison Rows: tabela feature-by-feature | ✓ Działa |
| Aktywny wariant oznaczony "Selected" | ✓ Działa |
| Tabela porównawcza z aria-label na ✓/- komórkach | ✓ Działa |

### 3.2 Billing toggle (UI)

| Test | Wynik |
|------|-------|
| Switch "Enable billing toggle" włącza/wyłącza sekcję | ✓ Działa |
| Billing toggle widoczny w canvas gdy enabled | ✓ Działa |
| Przyciski Monthly/Annual renderują się poprawnie | ✓ Działa |
| Monthly/Annual labels konfigurowalne z edytora | ✓ Działa |
| Default cycle (monthly/annual) poprawnie ustawia aria-pressed | ✓ Działa |

### 3.3 Plany i features

| Test | Wynik |
|------|-------|
| Dodawanie planu (Add plan) | ✓ Działa |
| Dodawanie features do planu (Add feature) | ✓ Działa |
| Move up/down dla planów | ✓ Działa |
| Move up/down dla features | ✓ Działa |
| Usuwanie feature (Remove) | ✓ Działa |
| Highlight plan — tylko jeden może być aktywny (normalizacja) | ✓ Działa |
| CTA label + URL per plan | ✓ Działa |
| Badge per plan | ✓ Działa |

### 3.4 Kolory i styl

| Test | Wynik |
|------|-------|
| Card surface picker + text input | ✓ Działa |
| Card border picker + text input | ✓ Działa |
| Highlight ring picker + text input | ✓ Działa |
| Clear dla card surface i card border | ✓ Działa |
| Spacing selector (None/Compact/Default/Spacious) | ✓ Działa |
| Radius selector (None/Medium/Large/Extra large) | ✓ Działa |
| Feature marker: Bullet (•) | ✓ Działa |
| Feature marker: Check (✓) | ✓ Działa |
| Feature marker: Icon (◆ placeholder) | ✓ Działa (patrz UX-03) |

### 3.5 Wizard editor

| Test | Wynik |
|------|-------|
| Dropdown wyboru wariantu | ✓ Działa |
| Section title input | ✓ Działa |
| Plans count selector | ✓ Działa |
| Basic plan setup (name + price per plan) | ✓ Działa |
| Przejście do Visual po "Continue to layout and styling" | ✓ Działa |

### 3.6 Advanced editor

| Test | Wynik |
|------|-------|
| Spacing token selector | ✓ Działa |
| Radius token selector | ✓ Działa |
| "Normalize plans to variant baseline" przycisk | ✓ Działa |
| "Normalize full payload" przycisk | ✓ Działa |
| Raw payload JSON snapshot | ✓ Widoczny, aktualizuje się |
| Layout padding/margin kontrolki | ✓ Dostępne |
| Visibility (Desktop/Tablet/Mobile) | ✓ Dostępne |

### 3.7 Frontend (localhost:3000) — zgodność z admin preview

| Element | Admin Preview | Frontend | Status |
|---------|--------------|----------|--------|
| Three Plans layout | ✓ | ✓ | Zgodne |
| Comparison Rows layout | ✓ | ✓ | Zgodne |
| Plan content (name, price, features, CTA) | ✓ | ✓ | Zgodne |
| Header (title, description) | ✓ | ✓ | Zgodne |
| Billing toggle UI (Monthly/Annual buttons) | ✓ Widoczny | ✓ Widoczny | Zgodne |
| Billing toggle interaktywność | ✗ Nie działa | ✗ Nie działa | Zgodne — oba broken |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Billing toggle jest włączony domyślnie mimo `enabled: false` w defaults
**Priorytet:** Wysoki  
**Źródło:** Analiza kodu  
**Opis:** W `normalizePricingPlansData` przy obsłudze `billingToggle.enabled`:
```ts
enabled:
  typeof data.billingToggle?.enabled === "boolean"
    ? data.billingToggle.enabled
    : billingDefaults.enabled !== false,
```
Gdy `data.billingToggle` jest `undefined` (nowy widget), gałąź else-a daje `billingDefaults.enabled !== false` — a `billingDefaults.enabled = false`, więc wyrażenie daje **`false !== false` = `false`**. To jest poprawne — ale zapis jest mylący i podatny na błędy przy zmianie defaults. Jeśli ktoś zmieni default na `true`, wyrażenie zwróci `false` (co jest odwrotnym skutkiem).  
**Lokalizacja:** `pricingPlans.tsx:395-400`

#### BUG-02 — `resolvePricingSpacing` pomija wartość `"md"`
**Priorytet:** Wysoki  
**Źródło:** Analiza kodu  
**Opis:**
```ts
const resolvePricingSpacing = (value: string | undefined): PricingPlansSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};
```
Wartość `"md"` nie jest sprawdzana explicite — trafia do `return "md"` jako fallback. To działa, ALE sprawia że przekazanie np. `"xl"` lub dowolnej nieprawidłowej wartości zwraca `"md"` bez żadnego sygnału błędu. Analogicznie `resolvePricingRadius` pomija `"lg"`.  
**Lokalizacja:** `pricingPlans.tsx:232-239`

#### BUG-03 — Zmiana wariantu wymusza nadpisanie liczby planów bez ostrzeżenia
**Priorytet:** Wysoki  
**Źródło:** Analiza kodu  
**Opis:** `pricingVariantPlanCountMap` jest sztywny: `three-plans=3`, `four-plans=4`, `comparison-rows=3`. Zmiana wariantu z `four-plans` (4 plany z wypełnioną treścią) na `three-plans` lub `comparison-rows` powoduje **automatyczne ucięcie czwartego planu** przez `normalizePricingPlans(normalizedData.plans, visibleCount)` w `PricingPlansBlock`. Użytkownik nie dostaje żadnego ostrzeżenia że jego dane zostaną utracone.  
**Lokalizacja:** `pricingPlans.tsx:664-671`

#### BUG-04 — Plan count selector w Visual Editor nie jest zsynchronizowany z wariantem
**Priorytet:** Wysoki  
**Źródło:** Analiza kodu  
**Opis:** Visual Editor pokazuje "Plans count" selector (wartości 2–6) niezależnie od wybranego wariantu. Gdy wariant to `three-plans`, użytkownik może ustawić count=5, ale render zawsze pokaże 3 (wymusza `pricingVariantPlanCountMap`). Powoduje to **desynchronizację między edytorem a podglądem** — użytkownik edytuje plany które nie są widoczne.  
**Lokalizacja:** `PricingPlansEditors.tsx:596-616`

#### BUG-05 — `highlightRing` nie ma opcji `onClear`
**Priorytet:** Średni  
**Źródło:** Analiza kodu  
**Opis:** `ColorField` dla "Highlight ring" nie ma przekazanego `onClear` (w przeciwieństwie do `cardSurface` i `cardBorder`). Użytkownik nie może zresetować koloru pierścienia do wartości domyślnej `var(--color-primary)`.  
**Lokalizacja:** `PricingPlansEditors.tsx:965-971`

#### BUG-06 — Badge planu jest zawsze renderowany w kolorze `highlightRing`
**Priorytet:** Średni  
**Źródło:** Analiza kodu  
**Opis:** Każdy badge (np. "For individuals", "For teams") używa `style.highlightRing` jako tła — bez względu na to, czy plan jest `highlighted`. Oznacza to, że plany oznaczone jako niewyróżnione (`highlighted: false`) nadal mają badge w kolorze akcentu, co zaburza hierarchię wizualną.  
**Lokalizacja:** `pricingPlans.tsx:508-516`

#### BUG-07 — `comparison-rows` nie renderuje CTA planu w header tabeli
**Priorytet:** Średni  
**Źródło:** Analiza kodu  
**Opis:** W `PricingComparisonRowsLayout` header tabeli pokazuje tylko name, price i period — brak badge planu w nagłówku. CTA jest wyodrębnione do ostatniego wiersza tabeli ("Action row"). Nie ma możliwości wyróżnienia planu w header tabeli analogicznie do kart (brak visual hierarchy `highlighted`).

#### BUG-08 — Billing toggle nie jest interaktywny (statyczny render)
**Priorytet:** Wysoki  
**Źródło:** Analiza kodu  
**Opis:** Przyciski `Monthly` / `Annual` w `PricingPlansBlock` nie mają obsługi `onClick`. `defaultCycle` jest odczytywany ze stanu danych, ale kliknięcie przycisku nic nie robi — widget jest statyczny. Przełączenie cyklu rozliczeniowego **nie działa po stronie frontu**.  
**Lokalizacja:** `pricingPlans.tsx:708-726`

---

### 4.2 Problemy UX edytora

#### UX-01 — Spacing i Radius zduplikowane między Visual i Advanced
**Opis:** Kontrolki Spacing i Radius są obecne zarówno w zakładce **Visual** (sekcja "Colors and emphasis") jak i **Advanced** (sekcja "Display tokens"). Dwukrotna edycja tego samego pola w różnych miejscach powoduje dezorientację — użytkownik nie wie które miejsce jest "właściwe".  
**Rekomendacja:** Usunąć z Advanced lub oznaczyć jako "read-only reference".

#### UX-02 — Plan count selector konflikuje z wariantem
**Opis:** Selector `Plans count` (2–6) jest widoczny dla wszystkich wariantów mimo że wariant wymusza sztywną liczbę planów. Powoduje to false expectation — użytkownik ustawia "5 plans" ale widzi 3.  
**Rekomendacja:** Ukryć lub zablokować selector gdy wariant ma sztywną liczbę (wszystkie aktualne warianty), lub zmienić logikę na obsługę custom count.

#### UX-03 — Feature marker "icon" renderuje `◆` (losowy symbol)
**Opis:** W kodzie `featureMarkerIconMap` mapuje `"icon"` → `"◆"`. To jest placeholder, nie prawdziwa ikona. W edytorze pole nazywa się "Icon" ale użytkownik nie wie jaka ikona zostanie użyta ani nie może jej zmienić.  
**Rekomendacja:** Albo usunąć opcję "icon" do czasu implementacji, albo dodać pole wyboru ikony.

#### UX-04 — Wizard nie zawiera pól features, CTA i badge
**Opis:** Wizard editor oferuje tylko: layout, title, plans count i name+price per plan. Brakuje kluczowych pól: `badge`, `ctaLabel`, `ctaHref`, `features`. Użytkownik musi przejść do Visual żeby dodać te dane, co rozbija flow.  
**Rekomendacja:** Rozszerzyć Wizard o minimum: badge i CTA per plan.

#### UX-05 — "Normalization and safeguards" (Advanced) — nieczytelna nazwa
**Opis:** Sekcja "Normalization and safeguards" z przyciskami "Normalize plans to variant baseline" i "Normalize full payload" jest dla użytkownika niezrozumiała. Nie wiadomo co "normalizacja" robi i kiedy jej używać.  
**Rekomendacja:** Przepisać jako "Fix / Reset" z opisem "Resets plan count to match variant" i "Resets all values to defaults".

#### UX-06 — Brak potwierdzenia przy Remove planu
**Opis:** Przycisk "Remove" na planie usuwa go natychmiast bez dialogu potwierdzenia. Utracone dane (features, CTA) są nieodwracalne.  
**Rekomendacja:** Dodać confirm dialog lub undo snackbar.

#### UX-07 — Brak wizualnego wskaźnika aktywnego planu "highlighted" na liście planów
**Opis:** Na liście planów w edytorze nie ma żadnego wizualnego oznaczenia który plan jest wyróżniony (badge, kolor obramowania). Użytkownik musi kliknąć każdy plan żeby sprawdzić stan switcha "Highlight this plan".  
**Rekomendacja:** Dodać badge "★ Highlighted" obok nazwy planu na liście.

#### UX-08 — Billing toggle labels zawsze widoczne (nawet gdy toggle wyłączony)
**Opis:** Pola "Monthly label" i "Annual label" są zawsze widoczne i edytowalne, nawet gdy "Enable billing toggle" jest wyłączony. Edycja nieaktywnych pól może mylić użytkownika.  
**Rekomendacja:** Zwinąć/wyłączyć pola label gdy `enabled = false`.

---

### 4.3 Braki funkcjonalne

#### BF-01 — Brak interaktywności billing toggle na froncie
**Opis:** Billing toggle jest czysto dekoracyjny — kliknięcie Monthly/Annual nie przełącza cen. Wymaga JavaScript/React state dla prawdziwej interaktywności. Widget jest renderowany jako statyczny HTML.

#### BF-02 — Brak per-plan background color
**Opis:** `cardSurface` jest globalny dla wszystkich kart. Nie ma możliwości nadania wyróżnionemu planowi innego tła (np. ciemnego) — standardowy pattern na stronach cenowych.

#### BF-03 — Brak per-plan CTA button style (tylko link `<a>`)
**Opis:** CTA jest renderowane jako `<a>` z minimalnym stylem (border + text). Brak możliwości ustawienia wariantu przycisku (filled, outline, ghost), rozmiaru czy koloru per plan. Wyróżniony plan zazwyczaj ma wypełniony CTA button.

#### BF-04 — Brak sekcji "savings badge" (annual discount)
**Opis:** Gdy `billingToggle.enabled = true`, nie ma możliwości pokazania "Save 20%" lub "2 months free" przy cenie annual. Standardowy element UI na stronach cenowych.

#### BF-05 — Brak per-plan description/subline
**Opis:** Model nie zawiera pola `description` per plan — tylko `name`, `price`, `badge`, `features`. Brak możliwości dodania zdania opisującego plan (np. "For small teams getting started").

#### BF-06 — Brak custom feature icons
**Opis:** Feature marker jest globalny (bullet/check/icon) dla wszystkich planów i wszystkich cech. Brak możliwości oznaczenia pojedynczej cechy jako "premium" (inna ikona/kolor) czy "coming soon".

#### BF-07 — Brak sekcji "most popular" wyróżnienia ponad kartą
**Opis:** Wyróżniony plan ma `box-shadow` ring ale nie ma "kołnierza" (top banner "Most popular") który wynosi kartę ponad inne. Standardowy pattern SaaS pricing.

#### BF-08 — Brak kontroli typografii (size, weight, font)
**Opis:** Rozmiary i grubości czcionek są hardcoded w klasach Tailwind (`text-3xl font-semibold` dla ceny, `text-base font-semibold` dla nazwy). Brak możliwości dostosowania.

#### BF-09 — Brak sekcji FAQ / notes pod tabelą
**Opis:** Brak slotu "footer notes" pod widgetem (np. "* All prices exclude VAT", "Contact us for enterprise pricing"). Wiele stron cenowych ma taki element.

#### BF-10 — Brak wariantu "two-plans"
**Opis:** Minimalną obsługiwaną liczbą planów jest 2 (`pricingPlanMin = 2`), ale nie ma dedykowanego wariantu "Two Plans" z odpowiednim layoutem (np. 2-kolumnowy centered).

#### BF-11 — Brak sticky header w comparison-rows
**Opis:** W wariancie `comparison-rows` przy dużej liczbie cech tabela przewija się w dół bez sticky header. Nazwy planów i ceny znikają z widoku użytkownika.

#### BF-12 — Brak kontroli max-width sekcji
**Opis:** `max-w-6xl` jest hardcoded w `PricingPlansBlock`. Brak możliwości zmiany szerokości sekcji (np. `max-w-4xl` dla 3 planów, `max-w-7xl` dla 6 planów).

#### BF-13 — Brak obsługi walut i formatowania cen
**Opis:** Pole `price` to zwykły string bez semantyki. Brak walidacji formatu ceny ani wyboru waluty. Użytkownik może wpisać dowolny tekst, ale edytor nie sugeruje formatu (np. "$49/mo" vs "$49" z osobnym `period`).

#### BF-14 — Brak "Free plan" / "$0" graceful handling
**Opis:** Gdy plan ma cenę `$0` lub pustą, UI nie oferuje specjalnego traktowania (np. "Free forever", ukrycie period). Fallback `"$0"` jest nieelegancki.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Billing toggle buttons bez `type="button"` (ale jest) — OK | — | — |
| A2 | Badge plan zawsze w kolorze `highlightRing` — może nie spełniać WCAG 4.5:1 | WCAG 1.4.3 | Wysoki |
| A3 | Comparison table bez `<caption>` | WCAG 1.3.1 | Wysoki |
| A4 | Feature check/cross cells mają `aria-label` ("Included"/"Not included") — OK | WCAG 1.1.1 | ✓ OK |
| A5 | Plan `<article>` bez `aria-labelledby` wskazującego na nazwę planu | WCAG 1.3.1 | Średni |
| A6 | CTA link bez `aria-label` — "Start now" bez kontekstu planu | WCAG 2.4.6 | Średni |
| A7 | Billing toggle buttons: brak `aria-controls` wskazującego na sekcję cen | WCAG 4.1.3 | Średni |
| A8 | Header tabeli comparison bez `scope="col"` na `<th>` | WCAG 1.3.1 | Wysoki |
| A9 | Brak `role="region"` + `aria-label` na sekcji `<section>` pricing | WCAG 1.3.6 | Niski |

---

## 6. Testy Playwright — Szczegółowe obserwacje Admin UI

### 6.1 Billing toggle — nieinternaktywny (BUG-08)

**Obserwacja:** Po włączeniu "Enable billing toggle" w edytorze, przyciski "Monthly" / "Annual" pojawiają się w canvasie. Po kliknięciu "Annual" — ceny **nie zmieniają się**. `aria-pressed` pozostaje `false`. Nie ma żadnego JavaScript obsługującego kliknięcia.

```
# Wynik testu:
Cena plan-1 przed kliknięciem Annual: "$19"
Cena plan-1 po kliknięciu Annual:     "$19"   ← BŁĄD
aria-pressed annual po kliknięciu:    "false"  ← BŁĄD
```

**Przyczyna (z kodu):** Przyciski w `PricingPlansBlock` (`pricingPlans.tsx:708-726`) nie mają `onClick`. `defaultCycle` jest statycznym polem z danych — nie istnieje stan React który zarządzałby aktywnym cyklem.

---

### 6.2 Plans count desynchronizacja z wariantem (BUG-04)

**Obserwacja:** Po przełączeniu z "Three Plans" na "Four Plans" — Plans count selector nadal pokazuje "3". Canvas renderuje 4 karty (bo `pricingVariantPlanCountMap` wymusza 4), ale edytor wskazuje 3. Użytkownik nie widzi planu 4 (Business) na liście edytora dopóki nie zwróci uwagi na canvas.

```
# Wynik testu:
Plans count selector po zmianie na Four Plans: "3"  ← BŁĄD
Liczba kart w canvas: 4                             ← poprawna
```

---

### 6.3 Zmiana wariantu usuwa dane planów bez ostrzeżenia (BUG-03)

**Obserwacja:** Sekwencja testowa:
1. Dodano widget → Three Plans → 3 plany
2. Zmieniono na Four Plans → pojawił się "Business" (plan 4, domyślny)
3. Zmieniono z powrotem na Three Plans → Plan 4 "Business" **zniknął z edytora**
4. Zmieniono z powrotem na Four Plans → Plan 4 odtworzony z domyślnymi wartościami (dane utracone)

Brak jakiegokolwiek ostrzeżenia, dialogu, undoable akcji.

---

### 6.4 Usunięcie planu bez potwierdzenia (UX-06)

**Obserwacja:** Kliknięcie "Remove" na planie usuwa go natychmiast. Brak dialogu, brak undoable toast. Plan ze wszystkimi features, CTA, badge znika bez możliwości cofnięcia.

---

### 6.5 Highlight ring bez Clear (BUG-05)

**Obserwacja:** "Card surface" i "Card border" mają przycisk "Clear" (widoczny przy wartości). "Highlight ring" nie ma Clear — brak możliwości resetu do `var(--color-primary)`.

---

### 6.6 Badges wszystkich planów w kolorze highlightRing (BUG-06)

**Obserwacja:**
```
Badgi planów (innerHTML backgroundColor):
"var(--color-primary), var(--color-primary)"
```
Plany "For individuals" i "For teams" (oba `highlighted: false`) mają badge w tym samym kolorze co wyróżniony "Growth". Brak wizualnej hierarchii.

---

### 6.7 Icon marker — placeholder ◆ (UX-03)

**Obserwacja:** Wybranie "Icon" w Feature marker selector renderuje `◆` (Unicode Black Diamond Suit). To nie jest prawdziwa ikona — to hardcoded symbol bez możliwości konfiguracji. Etykieta "Icon" w edytorze sugeruje możliwość wyboru ikony, której nie ma.

---

### 6.8 Spacing i Radius zduplikowane (UX-01)

**Obserwacja:** Visual tab → "Colors and emphasis" → Spacing + Radius. Advanced tab → "Display tokens" → Spacing token + Radius token. Te same kontrolki, te same wartości, w dwóch miejscach.

---

### 6.9 Billing toggle labels widoczne przy disabled toggle (UX-08)

**Obserwacja:** Pola "Monthly label" i "Annual label" są zawsze widoczne i edytowalne — niezależnie od stanu switcha "Enable billing toggle". Gdy toggle jest off, edycja tych pól jest pozbawiona sensu dla użytkownika.

---

### 6.10 Wizard — ograniczone pola (UX-04)

**Obserwacja:** Wizard oferuje jedynie: layout, section title, plans count, oraz name + price per plan. Kluczowe pola: `badge`, `ctaLabel`, `ctaHref`, `features`, `period` — wymagają przejścia do Visual tab. Dla nowego użytkownika Wizard nie daje możliwości skonfigurowania pełnego widgetu.

---

### 6.11 "Normalization and safeguards" — niejasne nazwy (UX-05)

**Obserwacja:** Sekcja w Advanced posiada przyciski "Normalize plans to variant baseline" i "Normalize full payload". Działają poprawnie, ale nazwy są technicznie i nieczytelne dla zwykłego użytkownika. Brak tooltipa wyjaśniającego efekt kliknięcia.

---

### 6.12 Nowe feature bez auto-focus (obserwacja)

**Obserwacja:** Po kliknięciu "Add feature", nowe pole pojawia się z domyślną wartością "New feature" ALE kursor nie przechodzi na to pole. Focus pozostaje na przycisku "Add feature". Wymaga ręcznego kliknięcia w pole, co utrudnia szybką edycję wielu features.

---

## 7. Testy Playwright — Frontend (localhost:3000)

### 7.1 Zgodność admin preview ↔ frontend

Widget na froncie wygląda **identycznie** jak w podglądzie admina. Renderowanie po obu stronach jest spójne — to samo HTML, te same klasy Tailwind, ta sama zawartość.

### 7.2 Billing toggle — BROKEN na froncie (BUG-08 / BF-01)

```
Cena plan-1 przed kliknięciem Annual: "$19"
Cena plan-1 po kliknięciu Annual:     "$19"  ← BŁĄD
aria-pressed annual po kliknięciu:    "false" ← BŁĄD
Błędy JS w konsoli:                   0       ← brak błędów (btn po prostu nie ma onClick)
```

**Przyczyna:** Widget jest renderowany jako statyczny HTML/React bez client-side state. Przyciski `Monthly`/`Annual` nie mają `onClick`. Jest to kluczowa brakująca funkcjonalność — feature jest completnie nieużyteczna dla użytkownika końcowego.

**Zachowanie:** Identyczne na admin preview i froncie — w obu miejscach billing toggle jest nieinternaktywny. Nie jest to bug specyficzny dla frontu — to brak implementacji w runtime component.

### 7.3 Comparison Rows — poprawny render na froncie

Tabela porównawcza renderuje się poprawnie: features per plan, checkmarks (✓) i dashes (-), CTA buttons w ostatnim wierszu. Brak sticky header (BF-11).

### 7.4 Accessibility na froncie

| Element | Stan |
|---------|------|
| `<table>` bez `<caption>` | ✗ Brak — A3 |
| `<th>` bez `scope` | ✗ Brak — A8 (`scope="null, null, null, null"`) |
| `<article>` bez `aria-labelledby` | ✗ Brak — A5 |
| `aria-label` na checkmark spans | ✓ "Included"/"Not included" — OK |
| CTA links — brak kontekstu planu | ✗ "Start now" bez plan name — A6 |

---

## 8. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-03 | Zmiana wariantu ucina plany bez ostrzeżenia | Editor |
| BUG-04 | Plans count desynchronizacja z wariantem | Editor |
| BUG-08 | Billing toggle nieinteraktywny na froncie | Runtime |
| BF-01 | Billing toggle — brak onclick na przyciskach | Runtime |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-02 | Plans count selector ukryć/zablokować gdy wariant sztywny |
| UX-06 | Confirm dialog przy Remove plan |
| UX-07 | Wizualny wskaźnik "highlighted" na liście planów |
| UX-04 | Wizard bez features/CTA/badge |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-02 | Wysoki | Per-plan background color |
| BF-03 | Wysoki | Per-plan CTA button style |
| BF-04 | Wysoki | Annual savings badge |
| BF-05 | Wysoki | Per-plan description |
| BF-11 | Wysoki | Sticky header w comparison-rows |
| BF-07 | Średni | "Most popular" top banner |
| BF-09 | Średni | Footer notes / FAQ slot |
| BF-12 | Średni | Konfigurowalny max-width |
| BF-06 | Niski | Custom feature icons |
| BF-10 | Niski | Wariant two-plans |

---

## 9. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 8 |
| Problemy UX edytora | 8 |
| Braki funkcjonalne | 14 |
| Problemy dostępności | 7 |
| **Łącznie** | **37** |

---

## 10. Screenshoty

| Plik | Opis |
|------|------|
| `pricing-plans-01-page-created.png` | Nowa strona testowa po utworzeniu |
| `pricing-plans-02-widget-added.png` | Widok po dodaniu Pricing Plans widget |
| `pricing-plans-03-wizard-editor.png` | Wizard editor — ograniczone pola (name+price only) |
| `pricing-plans-04-visual-editor.png` | Visual editor — pełne opcje konfiguracji |
| `pricing-plans-05-four-plans-variant.png` | Wariant Four Plans w edytorze |
| `pricing-plans-06-billing-toggle-enabled.png` | Billing toggle włączony — przyciski Monthly/Annual |
| `pricing-plans-07-billing-toggle-noninteractive.png` | Billing toggle po kliknięciu Annual — ceny bez zmian |
| `pricing-plans-08-comparison-rows.png` | Wariant Comparison Rows w admin |
| `pricing-plans-09-advanced-editor.png` | Advanced editor — Display tokens + Raw payload |
| `pricing-plans-10-wizard-limited.png` | Wizard — widoczne ograniczenie do 2 planów |
| `pricing-plans-11-frontend.png` | Frontend — pusta strona (po błędzie publikacji) |
| `pricing-plans-12-frontend-with-widget.png` | Frontend — Pricing Plans widget z billing toggle |
| `pricing-plans-13-frontend-billing-toggle-broken.png` | Frontend — billing toggle nieinteraktywny |
| `pricing-plans-14-comparison-rows-admin.png` | Admin — wariant Comparison Rows |
| `pricing-plans-15-frontend-comparison-rows.png` | Frontend — Comparison Rows |
| `pricing-plans-16-icon-marker.png` | Feature marker "Icon" — placeholder ◆ |
| `pricing-plans-17-final-admin-state.png` | Końcowy stan edytora admin |

---

*Raport generowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*
