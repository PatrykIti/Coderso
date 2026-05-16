# REPORT: Content List Widget

> Status: **W TRAKCIE** | Data: 2026-05-16 | Autor: Claude Code

---

## 1. Podsumowanie

Widget `content-list` służy do dynamicznego wyświetlania listy wpisów z wybranego źródła (typ treści lub zapytanie Listings). Obsługuje 3 warianty (`cards`, `list`, `compact`), konfigurowalną siatkę, filtry i stylizację tokenową.

---

## 2. Analiza kodu (statyczna)

### 2.1 Pliki

| Plik | Rola |
|------|------|
| `core/widgets/core/contentList.tsx` | Typy, schemat, domyślne, komponent `ContentListBlock` |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Edytory: Wizard, Visual, Advanced |
| `core/services/content/contentListResolver.ts` | Logika rozwiązywania danych w runtime |
| `core/templates/content-list.tsx` | Szablon strony z listą treści |

### 2.2 Schemat konfiguracji

**Źródło (`source`):**
- `mode`: `"legacy"` | `"listing"`
- `contentTypeId`: string (legacy)
- `listingQueryId` + `listingTemplateId`: string (listing)
- `statusScope`: `published` | `all` | `draft` | `scheduled` | `archived`
- `limit`: 1–24 (default: 6)
- `sort`: 6 opcji (published/updated/title × asc/desc)

**Filtry (`filters`):**
- `taxonomy`: string (free-text)
- `featuredOnly`: boolean
- `searchQuery`: string (tylko legacy)
- `authorId`: string UUID (tylko legacy)

**Pola widoczności (`fields`):**
- `showImage`, `showExcerpt`, `showMeta`, `showCta`: boolean

**Styl (`style`):**
- `columns`: `"1"` | `"2"` | `"3"` (tylko cards)
- `gap`: `none` | `sm` | `md` | `lg`
- `cardStyle`: `outlined` | `elevated` | `minimal`
- `ctaLabel`: string
- `backgroundColor`, `borderColor`, `textColor`: CSS value

**Empty state:**
- `title`, `description`: string

**Warianty:**
- `cards` – siatka kart z obrazkiem i metadanymi
- `list` – kolumna artykułów
- `compact` – gęsta lista do sidebara

---

## 3. Braki funkcjonalne i błędy UX (analiza kodu)

### 3.1 Krytyczne braki konfiguracyjne

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| B-01 | **Brak paginacji** | Pole `resolved.runtime.page` istnieje w schemacie, ale nie ma żadnego UI ani mechanizmu nawigacji między stronami. Widget wyświetla maksymalnie 24 pozycje bez możliwości przejścia dalej. | Wysoki |
| B-02 | **Brak tytułu sekcji** | Nie ma opcji dodania nagłówka/tytułu nad listą wpisów. Każdy widget musi być otoczony osobnym widgetem tekstowym, aby nadać kontekst. | Wysoki |
| B-03 | **Brak linku "Zobacz wszystkie"** | Nie ma opcji „View all" ani „Load more" na dole listy, co jest standardowym wzorcem UX dla list treści. | Wysoki |
| B-04 | **Kolumny nie działają dla `list` i `compact`** | W `ContentListBlock` (linia 621–627): wariant `list` zawsze używa `flex flex-col`, a `compact` zawsze `grid-cols-1`. Ustawienie `columns` w edytorze nie ma żadnego efektu dla tych dwóch wariantów. Użytkownik może zmienić liczbę kolumn i nie zobaczy żadnej zmiany — mylące. | Wysoki |
| B-05 | **Stała wysokość obrazka `h-40`** | Wysokość obrazka w kartach jest na stałe ustawiona na `h-40` (linia 562 w contentList.tsx). Brak konfiguracji proporcji/wysokości obrazu. | Średni |
| B-06 | **Brak opcji wyświetlania tagów jako badge** | Tagi są agregowane w jedną linię meta (max 2 tagi) wraz z datą i autorem. Nie ma opcji wyświetlenia tagów jako osobnych badge'y, co ogranicza czytelność i możliwości stylizacji. | Średni |

### 3.2 Błędy UX w edytorze admin

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| E-01 | **Kolumny i gap dostępne dla wszystkich wariantów** | W Visual Editorze: kontrolka `Columns` jest zawsze widoczna, niezależnie od wybranego wariantu. Dla `list` i `compact` jest bezużyteczna — brak warunkowego ukrycia i informacji dla użytkownika. | Wysoki |
| E-02 | **Duplikacja "Source mode" w Wizard i Visual** | Selektor trybu źródła (Legacy/Listing) pojawia się zarówno w Wizard jak i Visual edytorze. Przy `visualOwnsVariantSelection: true` – selektor wariantu w Wizardzie nie powinien też powielać source mode. Niespójność w separacji odpowiedzialności. | Średni |
| E-03 | **Taxonomy filter — brak autocomplete** | Pole filtra taksonomii to zwykły `<Input>` z placeholderem `e.g. featured or case-study`. Użytkownik musi wpisać ręcznie dokładną nazwę taga bez podpowiedzi. | Średni |
| E-04 | **Author ID wymaga UUID** | Pole `Author id filter` w Advanced edytorze przyjmuje surowy UUID autora. Nie ma dropdownu ani wyszukiwarki autorów — bariera techniczna dla redaktorów. | Średni |
| E-05 | **`textColor` nie ma przycisku "Clear"** | `backgroundColor` i `borderColor` używają `ClearableInputField` z przyciskiem reset, natomiast `textColor` to zwykły `<Input>`. Niespójność w UI/UX. | Niski |
| E-06 | **Etykiety trybów źródła są techniczne** | `"Legacy content type source"` i `"Listings query source"` — terminologia techniczna niezrozumiała dla redaktorów. | Niski |
| E-07 | **Brak podglądu wariantów/układów** | Selektor wariantu to lista przycisków z tekstem. Brak wizualnych miniatur/podglądów pokazujących jak wygląda `cards` vs `list` vs `compact`. | Niski |
| E-08 | **Brak color picker** | Pola kolorów (background, border, text) to pola tekstowe. Brak pickera kolorów, trudno wpisać hex/hsl bez narzędzi. | Niski |
| E-09 | **Brak informacji o stanie "source not configured"** | Gdy nie wybrano content type ani listing query, widget pokazuje generyczny komunikat bez wskazówek co zrobić w edytorze. | Niski |
| E-10 | **Card Style nie ma podglądu** | Trzy style kart (`outlined`, `elevated`, `minimal`) wybierane są przez dropdown bez żadnego podglądu wizualnego. | Niski |

### 3.3 Potencjalne błędy techniczne

| # | Problem | Opis |
|---|---------|------|
| T-01 | **CTA niewidoczne bez href** | `showCta` jest `true`, ale `<a>` jest renderowane tylko gdy `item.href` jest ustawione (linia 549). Jeśli trasa nie jest skonfigurowana, CTA znika bez żadnej informacji dla użytkownika. |
| T-02 | **Brak stanu ładowania** | Edytory ładują content types i listing queries asynchronicznie (`useEffect`), ale brak skeleton loadera dla samej listy w preview — przy wolnym API lista jest pusta zanim się załaduje. |
| T-03 | **`statusScope` w trybie listing jest ignorowane** | Ustawienie `statusScope` w Advanced edytorze jest nieaktywne (`disabled`) dla trybu listing, ale nie ma żadnej wizualnej wskazówki poza małym tekstem informacyjnym. |
| T-04 | **`searchQuery` i `authorId` disabled ale nadal edytowalne** | W trybie listing pola są `disabled`, ale użytkownik widzi poprzednio wpisane wartości — może być mylące. |

---

## 4. Testowanie w przeglądarce (Admin UI)

> Status: **W TRAKCIE**

### 4.1 Środowisko
- Admin URL: `http://localhost:5173/admin`
- Strona testowa: wyodrębniona strona dedykowana do testów

### 4.2 Wyniki testów

_Do uzupełnienia po testach._

---

## 5. Testowanie na froncie (localhost:3000)

> Status: **OCZEKUJE**

### 5.1 Wyniki testów

_Do uzupełnienia po testach._

---

## 6. Porównanie Admin vs Frontend

> Status: **OCZEKUJE**

_Do uzupełnienia po testach._

---

## 7. Wnioski i Rekomendacje

### Priorytety napraw

**Krytyczne (blokujące użytkowanie):**
1. B-04 + E-01 — Kolumny i gap niedziałające / nieintuicyjne dla `list` i `compact`
2. B-01 — Brak paginacji (limit 24 wpisów)
3. B-02 — Brak tytułu sekcji

**Ważne (ograniczające UX):**
4. B-03 — Brak "View all" linku
5. E-03 — Autocomplete dla taksonomii
6. E-04 — Selektor autorów zamiast UUID
7. E-05 — `textColor` bez clear button

**Nice-to-have:**
8. B-05 — Konfigurowalna wysokość/proporcje obrazka
9. E-07/E-10 — Wizualne podglądy wariantów i stylów kart
10. E-08 — Color picker

---

_Raport będzie uzupełniany po każdym etapie testów._
