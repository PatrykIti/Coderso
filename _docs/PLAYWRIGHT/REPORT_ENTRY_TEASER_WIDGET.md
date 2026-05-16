# REPORT: Entry Teaser Widget

> Status: **W TRAKCIE** | Data: 2026-05-16 | Autor: Claude Code

---

## 1. Podsumowanie

Widget `entry-teaser` służy do wyróżnionego podglądu jednego wybranego, najnowszego lub wyróżnionego wpisu. Obsługuje 3 warianty layoutu (`horizontal`, `vertical`, `minimal`), konfigurowalne pola widoczności, CTA, style tokenowe i mechanizm fallback. Wspiera dwa tryby źródła danych: legacy (typ treści) i listing (zapytanie).

---

## 2. Analiza kodu (statyczna)

### 2.1 Pliki

| Plik | Rola |
|------|------|
| `core/widgets/core/entryTeaser.tsx` | Typy, schemat, domyślne, komponent `EntryTeaserBlock` |
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Edytory: Wizard, Visual, Advanced |
| `core/services/content/entryTeaserResolver.ts` | Logika rozwiązywania danych w runtime |

### 2.2 Schemat konfiguracji

**Źródło (`source`):**
- `mode`: `"legacy"` | `"listing"`
- `contentTypeId`: string (legacy)
- `entryId`: string (legacy manual)
- `listingQueryId` + `listingTemplateId`: string (listing)

**Tryb źródła (`sourceMode`):**
- `"latest"` – najnowszy wpis z content type
- `"featured"` – wpis oznaczony jako featured
- `"manual"` – konkretny, wybrany wpis

**Pola widoczności (`fields`):**
- `showImage`, `showExcerpt`, `showMeta`, `showTags`: boolean

**CTA (`cta`):**
- `label`: string (default: "Read more")
- `hrefMode`: `"auto"` | `"custom"`
- `href`: string (tylko dla custom)

**Styl (`style`):**
- `surface`: CSS color value
- `border`: CSS color value
- `radius`: `"none"` | `"sm"` | `"md"` | `"lg"` | `"xl"`
- `spacing`: `"none"` | `"sm"` | `"md"` | `"lg"`

**Fallback:**
- `title`: string
- `description`: string
- `fallbackToLatest`: boolean (dla trybu `featured`)

**Warianty:**
- `horizontal` – media i tekst obok siebie (40%/60%)
- `vertical` – układ pionowy (stacked)
- `minimal` – kompaktowy, mniejsza czcionka i obrazek `h-36`

---

## 3. Braki funkcjonalne i błędy UX (analiza kodu)

### 3.1 Krytyczne braki konfiguracyjne

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| B-01 | **Brak pola tytułu / nagłówka widgetu** | Widget wyświetla sam teaser bez możliwości dodania nagłówka sekcji (np. "Polecany artykuł"). Każde zastosowanie wymaga osobnego widgetu tekstowego dla kontekstu. | Wysoki |
| B-02 | **Brak konfiguracji proporcji/rozmiaru obrazka** | Obrazek w wariancie `horizontal` i `vertical` ma stałą wysokość `h-52`, w `minimal` – `h-36`. Brak opcji zmiany proporcji, trybu skalowania (`cover`/`contain`) ani wysokości. | Wysoki |
| B-03 | **Brak limitu tagów w konfiguracji** | Tagi są obcinane do 5 (linia 552 `slice(0, 5)`) w renderze i do 8 (linia 307 `slice(0, 8)`) w normalizacji bez żadnej opcji konfiguracyjnej. Użytkownik nie może kontrolować tej wartości. | Średni |
| B-04 | **Brak opcji otwarcia linku w nowej karcie** | CTA jest renderowane jako zwykły `<a>`. Brak opcji `target="_blank"` — nie można skonfigurować otwierania linku w nowej karcie. | Średni |
| B-05 | **Brak stylizacji CTA (typ przycisku)** | CTA to zawsze tekst z podkreśleniem (`hover:underline`). Brak opcji zmiany na button, outlined, filled — ogranicza możliwości wizualne. | Średni |
| B-06 | **Brak opcji trybu `featured` w trybie listing** | `sourceMode` (`latest`/`featured`/`manual`) jest dostępny wyłącznie w trybie legacy. Przy przełączeniu na tryb listing, selektor `sourceMode` znika — brak sposobu na odpowiednik logiki "featured" w zapytaniach listingowych. | Średni |
| B-07 | **Brak konfiguracji max-width** | Widget zawsze renderuje `max-w-5xl`. Brak opcji pełnej szerokości, węższego lub szerszego layoutu dla różnych kontekstów strony. | Niski |
| B-08 | **Brak obsługi ikony/logo zamiast obrazka** | Pola `imageSrc`/`imageAlt` zakładają wyłącznie fotografie. Brak alternatywnego trybu dla ikon SVG lub logo — ogranicza warianty użycia (np. teaser produktu z logo firmy). | Niski |

### 3.2 Błędy UX w edytorze admin

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| E-01 | **Wizard Editor pokazuje "Data source mode" — termin techniczny** | Etykiety `"Legacy content type source"` i `"Listings query source"` to żargon techniczny niezrozumiały dla redaktorów. Powinno być np. "Typ treści" / "Zapytanie". | Wysoki |
| E-02 | **Brak wizualnego podglądu wariantów** | Selector wariantu w Wizard to zwykły `<Select>` a w Visual to karty tekstowe. Brak miniatur pokazujących jak wygląda `horizontal` vs `vertical` vs `minimal`. | Wysoki |
| E-03 | **Duplikacja "Data source mode" w trzech edytorach** | Selektor trybu źródła (Legacy/Listing) pojawia się we wszystkich trzech edytorach: Wizard, Visual, Advanced. Powoduje chaos — użytkownik może go zmienić w dowolnym edytorze niezależnie. | Wysoki |
| E-04 | **Fallback copy w Visual Editor, ale `fallbackToLatest` w Advanced** | Konfiguracja fallbacku jest podzielona: teksty w Visual (sekcja "Empty state copy"), a toggle logiki `fallbackToLatest` w Advanced (sekcja "Fallback behavior"). Brak spójności. | Wysoki |
| E-05 | **Brak stanu informującego o braku wpisu w trybie manual** | Gdy źródło to content type bez wpisów, pojawia się tylko tekst "No entries loaded yet" — nie ma wyraźnego komunikatu o braku opublikowanych wpisów (vs. brak wpisów w ogóle). | Średni |
| E-06 | **Brak podglądu efektu toggleów fields w edytorze** | Przełączniki `Show image`, `Show excerpt`, `Show meta`, `Show tags` nie mają żadnej wizualnej reprezentacji efektu — użytkownik musi zapisać i podglądać stronę osobno. | Średni |
| E-07 | **CTA "Auto entry URL" — brak wyjaśnienia co to znaczy** | Opcja `Auto entry URL` w href mode nie wyjaśnia, że URL pochodzi z adresu wpisu w CMS. Redaktor może nie wiedzieć, czy link zostanie automatycznie uzupełniony. | Średni |
| E-08 | **Brak color picker dla surface i border** | Pola kolorów `surface` i `border` to pola tekstowe (`ClearableInputField`). Brak pickera — trudno wpisać wartość hex/hsl bez narzędzi. | Niski |
| E-09 | **Advanced editor: "Runtime payload snapshot" nie jest interaktywny** | Sekcja z `JSON.stringify` to read-only, ale nie ma przycisku "Kopiuj do schowka", nie ma formatowania klikania — zmarnowany potencjał narzędzia debugowania. | Niski |
| E-10 | **Brak informacji o statusie wpisów przy wyborze Manual** | W trybie manual wpisy są listowane, ale w trybie `compact` (Wizard) status `(published)` jest ukrywany (linia 558: `compact ? "" : ` (${entry.status})`)`). Użytkownik nie wie czy wybierany wpis jest opublikowany. | Niski |
| E-11 | **Brak walidacji custom URL** | Pole `Custom URL` w sekcji CTA nie waliduje poprawności URL w czasie rzeczywistym — błędny URL zostanie zapisany i dopiero po podglądzie widoczny jest efekt sanityzacji do `#`. | Niski |

### 3.3 Potencjalne błędy techniczne

| # | Problem | Opis |
|---|---------|------|
| T-01 | **`resolveEntryTeaserVariant` nie obsługuje `"lg"` jako fallback** | Funkcja (linia 251–254) zwraca `"horizontal"` dla wszystkich nieznanych wartości. Zmiana enum w przyszłości może niepostrzeżenie cofnąć wariant do `horizontal`. |
| T-02 | **`resolveEntryTeaserRadius` pomija `"lg"` w warunkach** | W funkcji (linia 266–269) warunek sprawdza `none`, `sm`, `md`, `xl` — brak explicite `"lg"`. Fallback to `"lg"`, więc działa, ale jest to pułapka logiczna — `"lg"` nie jest walidowane. |
| T-03 | **Brak obsługi błędu rozwiązania w UI fallback** | Pole `resolved.error` (linia 502) wyświetla komunikat błędu, ale nie przesłania stanu "missing-source" — oba mogą pojawić się jednocześnie, co może zdezorientować użytkownika. |
| T-04 | **Obrazek bez `width`/`height`** | `<img>` (linia 523–531) nie ma atrybutów `width` i `height` — powoduje CLS (Cumulative Layout Shift) przy lazy loadowaniu. |
| T-05 | **Brak `rel="noopener noreferrer"` na CTA link** | `<a href={href}>` (linia 563) nie ma atrybutu `rel` — bezpieczeństwo dla zewnętrznych linków (gdy `target="_blank"` zostanie dodany). |
| T-06 | **Meta line łączy datę i autora bez separatora fallback** | `buildMetaLine` (linia 421–428) używa `" • "` jako separator, ale jeśli brakuje daty lub autora — wynik jest poprawny. Problem pojawia się przy bardzo długich nazwach autorów — brak truncation. |

---

## 4. Testy w Admin UI

> Status: **W TRAKCIE**

---

## 5. Testy na Froncie (http://localhost:3000)

> Status: **DO WYKONANIA**

---

## 6. Porównanie Admin vs Frontend

> Status: **DO WYKONANIA**

---

## 7. Wnioski i priorytety

> Status: **DO UZUPEŁNIENIA po testach**

---

## 8. Zrzuty ekranu

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

> Katalog: `_docs/PLAYWRIGHT/screenshots/entry-teaser/`
