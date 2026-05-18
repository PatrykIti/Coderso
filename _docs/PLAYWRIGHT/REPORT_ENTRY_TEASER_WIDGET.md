# REPORT: Entry Teaser Widget

> Status: **CLOSED AFTER TASK-265** | Data: 2026-05-18 | Autor: Claude Code + Codex

---

## Closure Update (2026-05-18)

Poniższe sekcje `1-8` zachowują historyczny raport z 2026-05-16. Ten blok
jest finalnym matrixem closure po wdrożeniu `TASK-265`, `TASK-305`, i
powiązanych leafów.

### Finalny status findingów

#### Braki funkcjonalne (`B-*`)

| ID | Status końcowy | Owner | Dowód |
|---|---|---|---|
| B-01 | Fixed | TASK-265-04 | `section.title` + `section.headingLevel` w `entryTeaser.tsx`, `Section context` w `EntryTeaserEditors.tsx`, render/testy w widget/public suites |
| B-02 | Fixed | TASK-265-04 | `media.mode/aspect/height/fit` w `entryTeaser.tsx` i `Layout and media` w `EntryTeaserEditors.tsx` |
| B-03 | Fixed | TASK-265-04 | `fields.tagLimit` w schema/defaults/normalizer + render/test coverage |
| B-04 | Fixed | TASK-265-03 | `cta.opensInNewTab` + shared safe-link attrs w `entryTeaser.tsx` i editorze |
| B-05 | Fixed | TASK-265-03 | `cta.style` (`link`, `filled`, `outline`) w schema/render/editor/tests |
| B-06 | Fixed | TASK-265-01 | listing `latest`/`featured` semantics w `entryTeaserResolver.ts`; editor exposes tylko te tryby; Bun tests pokrywają fallback/no-fallback |
| B-07 | Fixed | TASK-265-04 | `layout.maxWidth` fixed-map w schema/render/editor/public HTML tests |
| B-08 | Fixed | TASK-265-04 | `media.mode = icon` w render/editor/tests; brak bezpiecznego źródła kończy się bez crusha |

#### UX edytora (`E-*`)

| ID | Status końcowy | Owner | Dowód |
|---|---|---|---|
| E-01 | Fixed | TASK-265-02 | labelki `Content type` / `Listing query`; usunięte stare techniczne copy |
| E-02 | Fixed | TASK-265-02 | `VariantCards` mają miniatury `data-variant-thumbnail=*` w Wizard i Visual |
| E-03 | Fixed | TASK-265-02 | source mutation tylko w Wizard; Visual ma `Source summary`, Advanced nie duplikuje source controls |
| E-04 | Fixed | TASK-265-02 | `Fallback state` łączy copy i `fallbackToLatest` |
| E-05 | Fixed | TASK-265-01 | transient preview state + `/widgets/entry-teaser/preview` pokazują resolved teaser w admin canvas |
| E-06 | Fixed | TASK-265-01 | auth-aware retry dla content types |
| E-07 | Fixed | TASK-265-01 | auth-aware retry i rozróżnienie empty/error dla manual entry loading |
| E-08 | Fixed | TASK-265-03 | `Custom URL` startuje pustym draftem zamiast `#` |
| E-09 | Fixed | TASK-265-02 | lokalny `Field preview` i live canvas preview pokazują efekt toggle’ów |
| E-10 | Fixed | TASK-265-02 | opis `Auto entry URL uses the resolved entry detail route...` |
| E-11 | Fixed | TASK-265-03 | realtime validation custom URL z inline komunikatem |
| E-12 | Fixed | TASK-265-02 | `Runtime payload snapshot` ma `Copy JSON` + failure feedback |
| E-13 | Fixed | TASK-265-01 | compact manual entry labels zachowują `(status)` |
| E-14 | Fixed | TASK-265-06 + TASK-305 | shared swatch-plus-text `SharedColorControl` dla surface/border + widget-local adoption test |

#### Techniczne (`T-*`)

| ID | Status końcowy | Owner | Dowód |
|---|---|---|---|
| T-01 | Fixed | TASK-265-04 | `resolveEntryTeaserRadius()` explicite akceptuje `lg` |
| T-02 | Fixed | TASK-265-04 | `resolveEntryTeaserVariant()` ma jawny guard dla `horizontal/vertical/minimal`; fallback do `horizontal` jest testowany jako intencjonalny |
| T-03 | Fixed | TASK-265-04 | render dodaje deterministyczne `width` i `height` dla obrazów |
| T-04 | Fixed | TASK-265-03 | `resolveWidgetLinkAttrs(... openInNewTab)` daje `rel="noopener noreferrer"` |
| T-05 | Fixed | TASK-265-01 | duplikaty content types są oznaczane `slug/status`, a editor wave pokrywa ten case |
| T-06 | Fixed | TASK-265-04 | oddzielne `section.headingLevel` i `title.headingLevel` w render/editor/tests |
| T-07 | Fixed | TASK-265-01 | admin preview ma loading state `Loading resolved teaser preview...` |

### Jawnie odroczony scope po TASK-265

- Manualny wybór konkretnego wiersza listingowego nie jest częścią finalnego
  zakresu `TASK-265`. Został zapisany jako fizyczny follow-up:
  `TASK-304_Entry_Teaser_Listing_Manual_Picker.md`.

### Finalna walidacja

Zielone w tym worktree:

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/site/publicRenderer.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui/listings-page.test.tsx tests/vitest/ui/booking-page.test.tsx tests/vitest/ui/commerce-page.test.tsx tests/vitest/ui/form-builder.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx tests/integration/routes/entryTeaserPreview.test.ts tests/integration/routes/widgets.test.ts`
- `bun run gates:coderso`
- `bun run precommit`

Środowiskowy blocker pozostający poza zakresem widgetu:

- `bun run scan:security:strict`
  - `semgrep --error ...` pada lokalnie na `ca-certs: empty trust anchors`
  - `bun audit --audit-level high` pada lokalnie na `ConnectionRefused`
  - `trivy fs`, `trivy config`, `trivy secret`, `gitleaks git`, i `gitleaks dir`
    są zielone

---

## 1. Podsumowanie

Widget `entry-teaser` służy do wyróżnionego podglądu jednego wybranego, najnowszego lub wyróżnionego wpisu. Obsługuje 3 warianty layoutu (`horizontal`, `vertical`, `minimal`), konfigurowalne pola widoczności, CTA, style tokenowe i mechanizm fallback. Wspiera dwa tryby źródła danych: legacy (typ treści) i listing (zapytanie).

**Wynik testów:**
- Wszystkie 3 warianty (`horizontal`, `vertical`, `minimal`) renderują się poprawnie na froncie
- Widget poprawnie obsługuje stany: `ready`, `empty`, `missing-source`
- Admin preview **nigdy nie pokazuje** rzeczywistej treści wpisu — zawsze wyświetla fallback
- Atrybuty `data-entry-teaser-*` są poprawne na froncie

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
- `horizontal` – media i tekst obok siebie (md:flex-row, 40%/60%)
- `vertical` – układ pionowy (stacked)
- `minimal` – kompaktowy (`text-lg` zamiast `text-2xl`, `h-36` zamiast `h-52`)

---

## 3. Braki funkcjonalne i błędy UX (analiza kodu)

### 3.1 Krytyczne braki konfiguracyjne

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| B-01 | **Brak pola tytułu / nagłówka widgetu** | Widget wyświetla sam teaser bez możliwości dodania nagłówka sekcji (np. "Polecany artykuł"). Każde zastosowanie wymaga osobnego widgetu tekstowego dla kontekstu. | Wysoki |
| B-02 | **Brak konfiguracji proporcji/rozmiaru obrazka** | Obrazek w `horizontal` i `vertical` ma stałą wysokość `h-52`, w `minimal` – `h-36`. Brak opcji zmiany proporcji, trybu skalowania (`cover`/`contain`) ani wysokości. | Wysoki |
| B-03 | **Brak limitu tagów w konfiguracji** | Tagi są obcinane do 5 (render: `slice(0, 5)`) i do 8 (normalizacja: `slice(0, 8)`) bez żadnej opcji konfiguracyjnej. | Średni |
| B-04 | **Brak opcji otwarcia linku w nowej karcie** | CTA to `<a>` bez `target="_blank"` — nie można skonfigurować otwierania w nowej karcie. | Średni |
| B-05 | **Brak stylizacji CTA (typ przycisku)** | CTA to zawsze tekst z `hover:underline`. Brak opcji zmiany na button, outlined, filled — ogranicza możliwości wizualne. | Średni |
| B-06 | **Brak opcji trybu `featured`/`latest` w trybie listing** | `sourceMode` (`latest`/`featured`/`manual`) jest dostępny wyłącznie w trybie legacy. Przy przełączeniu na listing, selektor sourceMode znika — brak sposobu na odpowiednik logiki "featured" w zapytaniach listingowych. | Średni |
| B-07 | **Brak konfiguracji max-width** | Widget zawsze renderuje `max-w-5xl`. Brak opcji pełnej szerokości, węższego lub szerszego layoutu. | Niski |
| B-08 | **Brak obsługi ikony/logo zamiast obrazka** | Pola `imageSrc`/`imageAlt` zakładają wyłącznie fotografie. Brak alternatywnego trybu dla ikon SVG lub logo. | Niski |

### 3.2 Błędy UX w edytorze admin

| # | Problem | Opis | Priorytet |
|---|---------|------|-----------|
| E-01 | **Techniczna terminologia "Data source mode"** | Etykiety `"Legacy content type source"` i `"Listings query source"` to żargon techniczny. Powinno być np. "Typ treści" / "Zapytanie Listings". | Wysoki |
| E-02 | **Brak wizualnego podglądu wariantów** | Selector wariantu w Wizard to `<Select>` a w Visual to karty tekstowe. Brak miniatur/thumbnails pokazujących jak wygląda `horizontal` vs `vertical` vs `minimal`. | Wysoki |
| E-03 | **Duplikacja "Data source mode" w trzech edytorach** | Selektor trybu źródła (Legacy/Listing) pojawia się w Wizard, Visual i Advanced jednocześnie. Powoduje redundancję i chaos — zmiana w jednym edytorze jest widoczna w pozostałych. | Wysoki |
| E-04 | **Fallback copy w Visual Editor, `fallbackToLatest` w Advanced** | Konfiguracja fallbacku jest podzielona: teksty (title/description) w Visual → sekcja "Empty state copy", natomiast toggle logiki `fallbackToLatest` w Advanced → sekcja "Fallback behavior". Brak spójności. | Wysoki |
| E-05 | **Admin preview nigdy nie pokazuje rzeczywistej treści** | W panelu admina widget zawsze wyświetla stan empty/fallback. Resolver SSR nie działa w edytorze. Redaktor nie może podglądnąć jak teaser wygląda z rzeczywistym wpisem bez publikowania strony. | Wysoki |
| E-06 | **"Not authenticated" w dropdownie content type po błędzie API** | Gdy API `/api/content-types` zwraca 401, pod selektorem content type pojawia się mały tekst "Not authenticated". Brak komunikatu o błędzie, brak przycisku "Odśwież", brak wskazówki co zrobić. | Wysoki |
| E-07 | **Manual entry picker pusty gdy API content-types nie załadował** | Gdy `types` jest puste (błąd API), dropdown manual entry pokazuje tylko "No entry selected" i komunikat "No entries loaded yet" — bez rozróżnienia między brakiem wpisów a błędem API. | Wysoki |
| E-08 | **Custom URL field pokazuje "#" zamiast pustego pola** | Przy przełączeniu na tryb `Custom URL`, pole URL od razu wyświetla `"#"` (sanitized fallback z normalizacji). Użytkownik oczekuje pustego pola, nie znaku `#`. | Średni |
| E-09 | **Brak podglądu efektu toggleów fields** | Przełączniki `Show image`, `Show excerpt`, `Show meta`, `Show tags` nie mają żadnej wizualnej reprezentacji efektu — admin musi opublikować stronę by zobaczyć zmiany. | Średni |
| E-10 | **CTA "Auto entry URL" — brak wyjaśnienia co to znaczy** | Opcja `Auto entry URL` nie wyjaśnia, że URL pochodzi z adresu wpisu w CMS. Redaktor może nie wiedzieć, czy link zostanie uzupełniony automatycznie. | Średni |
| E-11 | **Brak walidacji custom URL w czasie rzeczywistym** | Pole `Custom URL` nie waliduje poprawności URL. Błędny URL (np. `javascript:`) jest sanityzowany do `#` bez komunikatu dla użytkownika. | Niski |
| E-12 | **Advanced editor: "Runtime payload snapshot" bez przycisku kopiowania** | Sekcja z `JSON.stringify` to read-only `<pre>`. Brak przycisku "Kopiuj do schowka" — zmarnowany potencjał narzędzia debugowania. | Niski |
| E-13 | **Brak informacji o statusie wpisu w Wizard (compact mode)** | W Wizard edytorze (compact: true) status wpisu `(published)` jest ukrywany w dropdownie manual entry (linia 558). Redaktor nie wie czy wybierany wpis jest opublikowany. | Niski |
| E-14 | **Brak color picker dla surface i border** | Pola kolorów to pola tekstowe (`ClearableInputField`). Brak pickera — trudno wpisać wartość hex/hsl bez narzędzi. | Niski |

### 3.3 Potencjalne błędy techniczne

| # | Problem | Opis |
|---|---------|------|
| T-01 | **`resolveEntryTeaserRadius` pomija `"lg"` w warunkach** | Funkcja (linia 266–269) sprawdza `none`, `sm`, `md`, `xl` — brak `"lg"`. Fallback to `"lg"`, więc działa, ale `"lg"` nie jest explicite walidowane. |
| T-02 | **`resolveEntryTeaserVariant` fallback do `"horizontal"`** | Funkcja zwraca `"horizontal"` dla wszystkich nieznanych wartości. Niepostrzeżona zmiana w enum może cofnąć wariant do horizontal. |
| T-03 | **Obrazek bez `width`/`height`** | `<img>` nie ma atrybutów `width` i `height` — powoduje CLS (Cumulative Layout Shift) przy lazy loadowaniu. |
| T-04 | **Brak `rel="noopener noreferrer"` na CTA link** | `<a href={href}>` nie ma `rel` — potencjalne ryzyko bezpieczeństwa gdy `target="_blank"` zostanie dodany. |
| T-05 | **Duplikaty content types na liście** | W dropdownie content type widocznych wiele duplikatów ("News" ×4, "Blog" ×2) oraz technicznie nazwane wpisy ("Screen 2dcaeaad", "Screen d4d0bb4d"). Brak grupowania ani deduplikacji. |
| T-06 | **Poziom nagłówka hardcoded jako `<h3>`** | Tytuł wpisu jest zawsze `<h3>` bez możliwości konfiguracji. W kontekście strony z jednym widgetem powinien być `<h2>` lub nawet `<h1>`. |
| T-07 | **Brak stanu ładowania w resolverze** | W admin preview nie ma skeleton loadera ani wskaźnika ładowania treści — stan fallback i stan błędu wyglądają identycznie. |

---

## 4. Testy w Admin UI

### 4.1 Strona testowa

- **URL admina:** `http://localhost:5173/admin/pages/b6991088-1ee5-4d08-9880-8c8b9d2af92d`
- **Slug:** `/test-entry-teaser-0516`
- **Status:** Published

### 4.2 Wyniki testów Admin

#### Wizard Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Data source mode selector | ✅ Działa | Etykiety techniczne (E-01) |
| Source mode (latest/featured/manual) | ✅ Działa | Widoczny tylko w trybie legacy |
| Content type dropdown | ✅ Działa | Duplikaty na liście (T-05) |
| Layout variant select | ✅ Działa | Brak wizualnego podglądu (E-02) |
| "Continue to layout" button | ✅ Działa | Przenosi do Visual editor |
| Stan widgetu w canvas (missing-source) | ✅ Wyświetla się | "Select content type to resolve teaser source." |
| Stan widgetu w canvas (empty/fallback) | ✅ Wyświetla się | Zawsze widoczny fallback, nigdy rzeczywista treść (E-05) |

#### Visual Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Variant cards (Horizontal/Vertical/Minimal) | ✅ Działa | Brak wizualnych miniatur (E-02) |
| Zmiana wariantu w canvas (real-time) | ✅ Działa | |
| Source configuration (ponowny data source mode) | ✅ Działa | Duplikacja z Wizard (E-03) |
| Source mode → Manual → entry picker | ⚠️ Warunkowo | Działa gdy API załaduje types; puste gdy API 401 (E-07) |
| Toggle Show image/excerpt/meta/tags | ✅ Działa | Brak live preview w canvas (E-09) |
| CTA label edit | ✅ Działa | |
| CTA Href mode: Auto | ✅ Działa | Brak wyjaśnienia (E-10) |
| CTA Href mode: Custom | ⚠️ Problem | Pole pokazuje "#" zamiast pustego (E-08) |
| Custom URL valid (https://...) | ✅ Działa | |
| Custom URL invalid (javascript:) | ✅ Sanityzuje do "#" | Bez komunikatu błędu (E-11) |
| Fallback title/description edit | ✅ Działa | Aktualizuje canvas real-time |

#### Advanced Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Data source mode (3. duplikat) | ✅ Działa | Kolejna duplikacja (E-03) |
| Listing mode: query selector | ✅ Działa | |
| Listing mode: template selector | ✅ Działa | |
| Style tokens: Surface color (ClearableInput) | ✅ Działa | Brak color picker (E-14) |
| Style tokens: Border color (ClearableInput) | ✅ Działa | Brak color picker (E-14) |
| Style tokens: Radius (5 opcji) | ✅ Działa | |
| Style tokens: Spacing (4 opcje) | ✅ Działa | |
| Fallback behavior: fallbackToLatest toggle | ✅ Działa | Odizolowany od fallback copy (E-04) |
| Runtime payload snapshot | ✅ Wyświetla JSON | Zawsze `item: null` w admin, brak kopiowania (E-12) |

---

## 5. Testy na Froncie (http://localhost:3000)

### 5.1 Strona testowa

- **URL:** `http://localhost:3000/test-entry-teaser-0516`
- **Entry testowa:** "QA Test Article 2026 (updated)" (content type: testowy, status: published)

### 5.2 Wyniki testów Frontend

| Test | Wynik | Uwagi |
|------|-------|-------|
| Wariant horizontal | ✅ Działa | `flex flex-col md:flex-row` |
| Wariant vertical | ✅ Działa | `flex flex-col` |
| Wariant minimal | ✅ Działa | `text-lg` (mniejszy h3), `h-36` obraz |
| Tytuł wpisu (h3) | ✅ Wyświetla | Zawsze `h3` (T-06) |
| Meta linia (data • autor) | ✅ Wyświetla | Format `YYYY-MM-DD • Autor` |
| CTA link (Auto URL) | ✅ Działa | href poprawny z entry slug |
| Brak obrazu gdy `imageSrc = null` | ✅ Brak wyświetlenia | Poprawne warunkowe renderowanie |
| Style tokeny (radius xl) | ✅ Działa | `rounded-2xl` w DOM |
| Atrybut `data-entry-teaser-state=ready` | ✅ Poprawny | |
| Atrybut `data-entry-teaser-variant=minimal` | ✅ Poprawny | |
| Atrybut `data-entry-teaser-source-mode=manual` | ✅ Poprawny | |
| Stan `empty` z custom fallback text | ✅ Działa | Tekst fallback z edytora widoczny |
| Brak `rel` na CTA anchor | ⚠️ Brak | (T-04) |
| Brak `width`/`height` na img | ⚠️ Brak | (T-03) |

---

## 6. Porównanie Admin vs Frontend

| Zachowanie | Admin Preview | Frontend | Spójne? |
|-----------|--------------|----------|---------|
| Stan `empty` (fallback) | ✅ Wyświetla fallback text | ✅ Wyświetla fallback text | ✅ Tak |
| Stan `ready` (rzeczywista treść) | ❌ **Nie pokazuje** — zawsze fallback | ✅ Pokazuje tytuł, meta, CTA | ❌ **Nie** |
| Stan `missing-source` | ✅ "Select content type..." | ✅ "Select content type..." | ✅ Tak |
| Zmiana wariantu | ✅ Widoczna w canvas (dla fallback) | ✅ Widoczna z rzeczywistą treścią | ✅ Tak |
| Style (radius, spacing) | ✅ Widoczne w canvas | ✅ Widoczne na stronie | ✅ Tak |

**Główna niespójność (E-05):** Admin preview nigdy nie renderuje rozwiązanego wpisu. Przyczyną jest brak uruchomienia runtime resolvera (`resolveEntryTeaserRuntimeData`) w środowisku edytora. Nie jest to błąd — jest to by design — ale stanowi istotny UX gap: redaktor nie może podejrzeć ostatecznego wyglądu teasera bez publikowania strony.

---

## 7. Wnioski i priorytety

### 7.1 Krytyczne (do naprawy przed produkcją)

1. **E-05** – Admin preview nigdy nie pokazuje rzeczywistej treści. Rozwiązanie: mock resolver w edytorze lub tryb „Preview" wywołujący API resolvera.
2. **E-04** – Fallback copy i fallbackToLatest w różnych edytorach. Zebrać w jedną sekcję (Visual lub Advanced).
3. **E-06/E-07** – Błąd API (401) w edytorze bez informacji zwrotnej i bez mechanizmu odświeżania.

### 7.2 Wysoki priorytet (UX)

4. **E-03** – `Data source mode` widoczny w 3 edytorach — usunąć z Wizard lub Advanced.
5. **E-01** – Techniczne etykiety „Legacy content type source" / „Listings query source" — zmienić na przyjazne.
6. **E-08** – Custom URL pokazuje `"#"` zamiast pustego pola po przełączeniu trybu.
7. **B-01** – Brak tytułu/nagłówka widgetu — wymaga osobnego Heading widgetu dla kontekstu.
8. **B-06** – sourceMode niedostępny w trybie listing.

### 7.3 Średni priorytet

9. **E-02** – Brak wizualnego podglądu wariantów.
10. **E-09** – Togglei fields bez live preview w edytorze.
11. **B-02** – Stały rozmiar obrazka bez konfiguracji.
12. **T-03** – Brak `width`/`height` na img (CLS).
13. **T-05** – Duplikaty content types w dropdownie.
14. **T-06** – Hardcoded `<h3>` bez konfiguracji poziomu nagłówka.

### 7.4 Niski priorytet

15. **E-10** – Brak opisu "Auto entry URL".
16. **E-12** – Brak przycisku kopiowania w Runtime payload snapshot.
17. **E-13** – Status wpisu ukryty w compact Wizard mode.
18. **T-04** – Brak `rel="noopener noreferrer"` na CTA.
19. **B-04** – Brak opcji `target="_blank"`.
20. **B-05** – Brak wariantów stylizacji CTA (button/outlined/filled).

---

## 8. Zrzuty ekranu

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

> Katalog: `_docs/PLAYWRIGHT/screenshots/entry-teaser/`

| Plik | Opis |
|------|------|
| `01-wizard-editor-initial.png` | Wizard Editor — stan początkowy (brak content type) |
| `02-widget-missing-source-state.png` | Widget w stanie missing-source w canvas |
| `03-wizard-with-content-type.png` | Wizard z wybranym content type (News) |
| `04-visual-editor-full.png` | Visual Editor — pełny widok z "Not authenticated" |
| `05-variant-vertical.png` | Wybór wariantu Vertical w Visual Editor |
| `06-variant-minimal.png` | Wybór wariantu Minimal w Visual Editor |
| `07-visual-editor-complete.png` | Visual Editor po ponownym logowaniu — kompletny |
| `08-show-image-off.png` | Toggle Show image wyłączony |
| `09-cta-custom-url-mode.png` | CTA Custom URL mode — pole z "#" |
| `10-advanced-editor-full.png` | Advanced Editor — pełny widok |
| `11-advanced-listing-mode.png` | Advanced Editor — tryb Listings query |
| `12-visual-editor-confirmed.png` | Visual Editor — potwierdzone działanie po czystym logowaniu |
| `13-manual-mode-no-entries.png` | Manual mode — puste entry picker (brak wpisów) |
| `14-fallback-copy-working.png` | Fallback copy aktualizuje canvas real-time |
| `15-advanced-runtime-snapshot.png` | Advanced Editor — Runtime payload (item: null) |
| `16-frontend-fallback-state.png` | Frontend — stan empty z custom fallback text |
| `17-frontend-ready-state-horizontal.png` | Frontend — stan ready, wariant horizontal |
| `18-frontend-horizontal-real-content.png` | Frontend — rzeczywista treść w horizontal |
| `19-frontend-vertical-variant.png` | Frontend — wariant vertical |
| `20-frontend-minimal-variant.png` | Frontend — wariant minimal |

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Entry Teaser is classification only. Widget-owned
  follow-up scope continues through the `TASK-265` family.
- Shared rows that match existing TASK-256 clear/link/accessibility mechanisms
  remain referenced by `TASK-256-07` and `TASK-256-08`.
