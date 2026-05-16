# RAPORT: Hero Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #2 (Hero Widget)  
> **Środowisko:** http://localhost:5173/admin

---

## 1. Przegląd widgetu

**Typ:** Composite  
**Moduł:** Content  
**Warianty:** `centered`, `split` (alias: `media-right`), `media-left`  
**Slot:** `content` — dodatkowe bloki poniżej obszaru CTA

Hero widget jest centralnym elementem sekcji hero stron. Odpowiada za: nagłówek, podnagłówek, treść, badge, CTA (1–2 przyciski), media (obraz/wideo), tło (kolor, gradient, media), typografię, style oraz układ responsywny.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Treść** | `headline` (wymagane), `subhead`, `body` |
| **Badge** | `enabled`, `label`, `prefix`, `href`, `tone` (4 opcje), `placement` (2 opcje) |
| **CTA** | `primaryCta` (label + href), `secondaryCta` (label + href) |
| **Media** | `type` (none/image/video), `source` (library/external), `assetId`, `src`, `alt`, `ratio`, `overlay` |
| **Typografia** | `align` (L/C/R), `headlineSize` (5 opcji), `subheadSize` (5 opcji), `bodySize` (5 opcji) |
| **Kolory** | headline, subhead, body, border card, border media, primary/secondary button (bg, text, border) |
| **Tło** | `color`, `gradient`, `image`, media (type/source/overlay) |
| **Układ** | `align`, `maxWidth`, `contentWidth`, `paddingTop`, `paddingBottom` |
| **Responsywne** | `hideMediaOnMobile` |
| **Presety** | do 24 presetów per użytkownik |

### 2.2 Tryby edytora

- **Wizard** — krok po kroku: cel, wariant, treść, CTA, media
- **Visual** — główny inspektor: badge, nagłówki, CTA, media, typografia, kolory, tło
- **Advanced** — układ, padding, responsywność, techniczne opcje tła

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | Brak pola `rel="noopener noreferrer"` dla zewnętrznych linków w CTA i badge | Bezpieczeństwo / SEO |
| C2 | Brak `loading="lazy"` na obrazach inline — wpływ na Core Web Vitals | Wydajność |
| C3 | Brak podglądu mobile/desktop w edytorze — użytkownik nie wie jak wygląda na mobile | UX edytora |
| C4 | Brak komunikatu/placeholdera gdy media zawiera błąd ładowania | UX użytkownika |
| C5 | Brak obsługi `video poster` — czarny ekran podczas ładowania wideo | UX użytkownika |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | Brak kontroli cieni/głębi (card, przyciski, media) | Styl |
| W2 | Brak srcset/responsive images — jeden rozmiar dla wszystkich ekranów | Wydajność |
| W3 | Brak eksportu/importu presetów między użytkownikami | Workflow |
| W4 | Brak wyszukiwarki/filtrowania presetów (max 24, brak organizacji) | Edytor |
| W5 | Brak walidatora kontrastu kolorów (accessibility) | Dostępność |
| W6 | Brak kontroli animacji/przejść (scroll effects, wejście elementów) | Efekty |
| W7 | Brak opcji pełnoekranowego hero (100vh) — brak predefiniowanej wartości paddingu | Layout |
| W8 | Brak `font-weight` i rodziny fontu jako oddzielnych kontrolek | Typografia |

### 3.3 Ulepszenia UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | Brak walidacji URL w czasie rzeczywistym w polach CTA | Edytor |
| U2 | Brak podglądu gradientu przed zastosowaniem | Edytor |
| U3 | Brak informacji o wymiarach/proporcjach przy wyborze media | Edytor |
| U4 | Brak predefiniowanych kombinacji kolorów (palety) | Edytor |
| U5 | Brak trybu „tylko treść" — szybka edycja bez rozwijania wszystkich sekcji | Edytor |

### 3.4 Brakujące warianty / rozszerzenia

| # | Problem | Obszar |
|---|---------|--------|
| V1 | Brak wariantu „media-center" (produkt/showcase na środku) | Wariant |
| V2 | Brak opcji full-bleed tła (wychodzące poza kontener) | Layout |
| V3 | Brak trybu form-hero (wbudowany formularz/wyszukiwarka) | Rozszerzenie |
| V4 | Brak social proof row (gwiazdki, liczby, avatary) | Rozszerzenie |

---

## 4. Problemy UX z perspektywy użytkownika końcowego

### 4.1 Dostępność (Accessibility)

- Brak atrybutów ARIA na badge, przyciskach CTA, ramkach media
- Przyciski CTA to tagi `<a>` bez `role="button"` gdy nie mają href — potencjalny problem nawigacji klawiaturą
- Brak `alt` wymaganego walidacyjnie w edytorze dla obrazów
- Kolory nie są walidowane pod kątem kontrastu WCAG

### 4.2 Performance (widoczne dla użytkownika)

- Brak lazy loading obrazów inline
- Brak poster dla wideo (czarny ekran)
- Brak WebP fallback
- Brak LCP optimization (brak `fetchpriority="high"` dla obrazu hero)

### 4.3 Spójność wizualna

- Brak predefiniowanych kombinacji styli — użytkownik musi ręcznie ustawiać 10+ pól kolorów
- Brak podglądu różnych urządzeń w czasie rzeczywistym
- Brak "reset do domyślnych" dla poszczególnych sekcji (tylko presety globalne)

---

## 5. Wyniki testów Playwright

> **Status:** Oczekuje na sesję przeglądarki

---

## 6. Podsumowanie priorytetów

| Priorytet | Ilość problemów | Kategoria |
|-----------|----------------|-----------|
| Krytyczne | 5 | C1–C5 |
| Ważne | 8 | W1–W8 |
| UX edytora | 5 | U1–U5 |
| Brakujące warianty | 4 | V1–V4 |
| **Łącznie** | **22** | |

---

*Raport będzie uzupełniany po każdym etapie testów Playwright.*
