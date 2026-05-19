# REPORT: Content List Widget

> Status: **UKOŃCZONY** | Data: 2026-05-16 | Autor: Claude Code

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
| E-05 | **`textColor` nie ma przycisku "Clear"** | `backgroundColor` i `borderColor` używają `ClearableInputField` z przyciskiem reset, natomiast `textColor` to zwykły `<Input>`. Niespójność w UI/UX. **Potwierdzone w testach.** | Niski |
| E-06 | **Etykiety trybów źródła są techniczne** | `"Legacy content type source"` i `"Listings query source"` — terminologia techniczna niezrozumiała dla redaktorów. | Niski |
| E-07 | **Brak podglądu wariantów/układów** | Selektor wariantu to lista przycisków z tekstem. Brak wizualnych miniatur/podglądów pokazujących jak wygląda `cards` vs `list` vs `compact`. | Niski |
| E-08 | **Brak color picker** | Pola kolorów (background, border, text) to pola tekstowe. Brak pickera kolorów, trudno wpisać hex/hsl bez narzędzi. | Niski |
| E-09 | **Brak informacji o stanie "source not configured"** | Gdy nie wybrano content type ani listing query, widget pokazuje generyczny komunikat bez wskazówek co zrobić w edytorze. | Niski |
| E-10 | **Card Style nie ma podglądu** | Trzy style kart (`outlined`, `elevated`, `minimal`) wybierane są przez dropdown bez żadnego podglądu wizualnego. | Niski |
| E-11 | **Lista content types zawiera duplikaty i techniczne nazwy** | W Wizard edytorze dropdown content type pokazuje ~59 pozycji, w tym wielokrotne duplikaty (np. "News" ×4) i techniczne nazwy z appendowanymi UUID (np. "Screen 2dcaeaad"). Brak grupowania/filtrowania. **Potwierdzone w testach.** | Średni |

### 3.3 Potencjalne błędy techniczne

| # | Problem | Opis |
|---|---------|------|
| T-01 | **CTA niewidoczne bez href** | `showCta` jest `true`, ale `<a>` jest renderowane tylko gdy `item.href` jest ustawione (linia 549). Jeśli trasa nie jest skonfigurowana, CTA znika bez żadnej informacji dla użytkownika. |
| T-02 | **Brak stanu ładowania** | Edytory ładują content types i listing queries asynchronicznie (`useEffect`), ale brak skeleton loadera dla samej listy w preview — przy wolnym API lista jest pusta zanim się załaduje. |
| T-03 | **`statusScope` w trybie listing jest ignorowane** | Ustawienie `statusScope` w Advanced edytorze jest nieaktywne (`disabled`) dla trybu listing, ale nie ma żadnej wizualnej wskazówki poza małym tekstem informacyjnym. |
| T-04 | **`searchQuery` i `authorId` disabled ale nadal edytowalne** | W trybie listing pola są `disabled`, ale użytkownik widzi poprzednio wpisane wartości — może być mylące. |
| T-05 | **Empty state tekst mówi "content type" w trybie listing** | Domyślny tekst opisu empty state brzmi: *"Adjust filters or publish entries for this content type."* — zawiera "content type" nawet gdy widget działa w trybie Listing (query-based). Tekst nie jest dostosowany do aktywnego trybu źródła. **Potwierdzone na froncie.** |
| T-06 | **Toggle "Featured only" wyświetla się zielono mimo że jest disabled** | W Advanced edytorze przy trybie Listing, przełącznik `featuredOnly` jest poprawnie zablokowany (`disabled`), ale wizualnie wygląda jak aktywny (zielony kolor). Wprowadza w błąd — użytkownik myśli, że filtr działa. **Potwierdzone w testach.** |

---

## 4. Testowanie w przeglądarce (Admin UI)

> Status: **UKOŃCZONY** | Strona testowa: `TEST-CONTENT-LIST-0516` (ID: `28fab5e8-f3fc-45ef-9fe7-e3a57c14989f`)

### 4.1 Środowisko
- Admin URL: `http://localhost:5173/admin`
- Strona testowa: `TEST-CONTENT-LIST-0516` (dedykowana, nowo utworzona)
- Frontend URL: `/test-content-list-0516`
- Sesja playwright: `content-list-test` (izolowana, nie wpływa na inne agenty)

### 4.2 Wizard Editor

**Co widziałem:**
- Selektor trybu źródła: dropdown z opcjami `Legacy content type source` i `Listings query source` — działa poprawnie
- Dropdown Content Type: ładuje ~59 pozycji asynchronicznie; znaleziono **liczne duplikaty** (np. "News" pojawia się 4 razy), techniczne nazwy z UUID (np. "Screen 2dcaeaad"), brak grupowania
- Pole `Item limit`: licznik z przyciskami +/−, poprawnie ogranicza do zakresu 1–24
- Selektor wariantu: trzy przyciski `Cards` / `List` / `Compact` — działają, brak wizualnych miniatur

**Problemy:**
- **E-11 (potwierdzone)**: Dropdown content type jest nieprzydatny dla redaktorów — duplikaty, techniczne nazwy, brak search/filter
- **E-06 (potwierdzone)**: Etykiety `"Legacy content type source"` / `"Listings query source"` są techniczne

### 4.3 Visual Editor

**Co widziałem:**

**Sekcja "Variant and layout":**
- Selektor wariantu (przyciski Cards/List/Compact): działa, zmienia `data-content-list-variant` w canvas
- Dropdown `Columns` (1/2/3): zawsze widoczny niezależnie od wariantu
- Dropdown `Gap`: działa, opcje none/sm/md/lg
- Dropdown `Card style`: zmiana z `outlined` na `minimal` działa (potwierdzone w snapshot)

**Sekcja "Source and filters":**
- Status scope, sort order: wyglądają poprawnie
- Taxonomy filter: zwykły `<Input>` bez autocomplete (E-03 potwierdzone)
- Przełączenie Legacy → Listing: poprawnie ukrywa kontrolki content type i pokazuje Listing Query + Template

**Sekcja "Presentation fields":**
- Toggling `Show image` OFF: potwierdzono (snapshot zawierał `switch "Show image"` bez `[checked]`)
- Toggling showExcerpt, showMeta, showCta: działają

**Sekcja "Empty state":**
- Pola `title` i `description` dostępne i edytowalne

**Problemy:**
- **E-01 (potwierdzone)**: Kontrolka `Columns` jest widoczna dla wariantów `List` i `Compact` mimo że nie ma żadnego efektu — brak komunikatu wyjaśniającego, brak warunkowego ukrycia

### 4.4 Advanced Editor

**Co widziałem:**

**Sekcja "Query controls":**
- Pola `Search query filter` i `Author id filter` są poprawnie zablokowane (`disabled`) w trybie Listing
- Pole Author id wymaga surowego UUID — brak wyszukiwarki (E-04 potwierdzone)

**Sekcja "Styling tokens":**
- `backgroundColor`: pole + przycisk "Clear" ✓
- `borderColor`: pole + przycisk "Clear" ✓
- `textColor`: **TYLKO pole tekstowe, brak przycisku "Clear"** ✗ — **E-05 potwierdzone**
- Brak color picker dla żadnego z pól (E-08 potwierdzone)

**Toggle "Featured only":**
- W trybie Listing: przełącznik jest `disabled`, ale wyświetla się **zielono** (aktywny wygląd mimo blokady) — **T-06 nowy błąd**

**Sekcja "Runtime payload snapshot":**
- Wyświetla read-only JSON z aktualną konfiguracją widgetu
- Działa poprawnie — użyteczne dla debugowania

**Sekcja układu i widoczności (globalne):**
- Sekcje Container, Padding, Margin, Visibility (Desktop/Tablet/Mobile) — globalne ustawienia widgetu, nie specyficzne dla ContentListData

### 4.5 Canvas (podgląd w edytorze)

**Kluczowe odkrycie:**
- Admin canvas jest **statyczny** — wyświetla `resolved.items` z zapisanej konfiguracji
- Nowo dodany lub niezapisany widget **zawsze pokazuje "No items found"** niezależnie od konfiguracji
- Dopiero po zapisaniu strony i odświeżeniu canvas pokazuje dane z ostatniego resolve'u (który jest wołany przy zapisie)
- To zachowanie jest by-design, ale **tworzy UX confusion** — redaktorzy nie wiedzą, czy widget jest poprawnie skonfigurowany

**Stan `missing-source`:** wyświetlany gdy nie wybrano source — zawiera generyczny komunikat bez wskazówek (E-09)

---

## 5. Testowanie na froncie (localhost:3000)

> Status: **UKOŃCZONY** | Strona: `/test-content-list-0516`

### 5.1 Środowisko testowe
- Frontend URL: `http://localhost:3000/test-content-list-0516`
- Widget skonfigurowany: tryb Listing, query "House Projects Catalog Query a3f06199"
- Strona opublikowana, renderuje poprawnie

### 5.2 Wyniki testów

**Renderowanie widgetu:**
- Widget renderuje się poprawnie na froncie
- Data-atrybuty w DOM: `data-content-list-state="empty"`, `data-content-list-items="0"`, `data-content-list-variant="cards"`, `data-content-list-source-mode="listing"`
- Wariant `cards` widoczny jako siatka (choć pusta)

**Stan "empty" (brak wyników):**
- Wyświetla: **"No items found"** (bold) + `"Adjust filters or publish entries for this content type."` (szary tekst)
- **T-05 potwierdzone**: tekst zawiera "for this content type" mimo że widget działa w trybie Listing (listing query, nie bezpośredni content type)

**Stan źródła:**
- Listing query "House Projects Catalog Query" = brak opublikowanych wpisów → widget poprawnie wyświetla empty state
- Resolver server-side działa poprawnie (zwraca pusty wynik zamiast błędu)

**Dostępność danych testowych:**
- W środowisku testowym brak opublikowanych wpisów w jakimkolwiek custom content type
- Jedyna listing query w systemie: "House Projects Catalog Query a3f06199" (ID: 22f2ad81-9e2f-4c6f-bdf6-8bff33549b6f) — również pusta

---

## 6. Porównanie Admin vs Frontend

> Status: **UKOŃCZONY**

### 6.1 Diagram przepływu danych

```
Admin Canvas (edytor)
  └── static: wyświetla resolved.items z ostatniego zapisu
  └── NIE wywołuje live resolve przy zmianie konfiguracji

Admin Preview Dialog
  └── live: wywołuje resolveContentListRuntimeData() w czasie rzeczywistym
  └── = takie same wyniki jak Frontend

Frontend (localhost:3000)
  └── live: wywołuje resolveContentListRuntimeData() przy SSR/request
  └── = takie same wyniki jak Preview Dialog
```

### 6.2 Tabela porównawcza

| Aspekt | Admin Canvas | Admin Preview Dialog | Frontend |
|--------|-------------|---------------------|----------|
| Dane | Statyczne (last-saved) | Live (on-demand resolve) | Live (SSR/request) |
| Źródło danych | `resolved.items` w JSON | `resolveContentListRuntimeData()` | `resolveContentListRuntimeData()` |
| Stan empty (brak wpisów) | "No items found" ✓ | "No items found" ✓ | "No items found" ✓ |
| Status scope | Ignorowany (statyczne) | `published` only (non-preview) | `published` only |
| Featured only (Listing) | — | Nieaktywne (ignorowane) | Nieaktywne |
| CSS/style | Pełny Tailwind ✓ | Pełny Tailwind ✓ | Pełny Tailwind ✓ |
| Data-atrybuty | ✓ | ✓ | ✓ |

### 6.3 Rozbieżności i ich przyczyny

**Admin Canvas ≠ Preview Dialog / Frontend:**
- **Przyczyna**: Admin canvas renderuje komponenty React bezpośrednio z danych widgetu zapisanych w bazie (pole `resolved`). Nie wywołuje live resolver przy każdej interakcji w edytorze — byłoby to za wolne.
- **Skutek UX**: Redaktor widzi "No items found" nawet gdy zmieni content type na inny z wpisami. Musi zapisać + odświeżyć. Nie ma żadnego komunikatu wyjaśniającego to zachowanie.
- **Ocena**: Zachowanie by-design, ale brakuje informacji dla użytkownika ("Zapisz, aby zobaczyć podgląd z danymi" lub skeleton z "Preview requires save").

**Jednorodność Preview Dialog = Frontend:**
- Oba korzystają z tego samego `resolveContentListRuntimeData()`, więc wyniki są identyczne
- W trybie non-preview (frontend): `matchStatusScope()` zawsze zwraca tylko `published`, `normalizeListingQueryForRuntime()` ustawia `includeDrafts: false`
- W trybie preview (admin): może pokazywać draft entries

**Brak różnic renderowania:**
- Nie stwierdzono rozbieżności w renderowaniu CSS ani komponentów między Preview Dialog a frontendem

---

## 7. Wnioski i Rekomendacje

### Priorytety napraw (zaktualizowane po testach)

**Krytyczne (blokujące użytkowanie):**
1. **B-04 + E-01** — Kontrolka `Columns` widoczna i dostępna dla wariantów `list` i `compact`, gdzie jest bezużyteczna. Naprawić: ukryć `Columns` gdy aktywny wariant ≠ `cards`.
2. **B-01** — Brak paginacji (twarde ograniczenie 24 wpisów bez nawigacji dalej).
3. **B-02** — Brak opcji tytułu/nagłówka sekcji nad listą.
4. **E-11** — Dropdown content type z duplikatami i technicznymi nazwami blokuje użycie przez redaktorów (potwierdzone w testach).

**Ważne (ograniczające UX):**
5. **B-03** — Brak "View all" / "Load more" linku.
6. **T-05** — Tekst empty state mówi "content type" w trybie Listing — wymaga dostosowania do aktywnego trybu źródła.
7. **T-06** — Toggle "Featured only" wyświetla się jako aktywny (zielony) mimo że jest `disabled` w trybie Listing.
8. **E-03** — Autocomplete dla pola taxonomy filter.
9. **E-04** — Selektor autorów zamiast surowego UUID.
10. **E-05** — `textColor` bez przycisku "Clear" (niespójność z `backgroundColor` i `borderColor`).

**UX informacyjne:**
11. **Canvas static preview** — brak komunikatu wyjaśniającego, że canvas pokazuje dane z ostatniego zapisu (nie live). Sugerowany tekst: "Preview updates after saving."
12. **E-09** — W stanie `missing-source` brak wskazówek co zrobić (dodać link do edytora lub inline tip).

**Nice-to-have:**
13. **B-05** — Konfigurowalna wysokość/proporcje obrazka (aktualnie hardcoded `h-40`).
14. **E-07/E-10** — Wizualne podglądy wariantów i stylów kart zamiast tekstowych przycisków/dropdown.
15. **E-08** — Color picker dla pól kolorów.
16. **E-06** — Bardziej przyjazne etykiety trybów źródła ("By content type" / "By listing query" zamiast "Legacy"/"Listing").

### Podsumowanie stanu jakości

| Obszar | Ocena | Komentarz |
|--------|-------|-----------|
| Funkcjonalność core | ✅ Działa | Widget renderuje się, dane się ładują, stany poprawne |
| Edytor Wizard | ⚠️ Problemy UX | Duplicate content types, technical labels |
| Edytor Visual | ⚠️ Błąd logiki | Columns control visible/accessible for wrong variants |
| Edytor Advanced | ⚠️ Niespójność | textColor bez Clear, disabled toggle wyświetla się jako aktywny |
| Admin Canvas preview | ⚠️ Brak komunikacji | Statyczny bez informacji dla użytkownika |
| Frontend rendering | ✅ Działa | Poprawne data-atrybuty, empty state, SSR |
| Admin ↔ Frontend spójność | ✅ Spójne | Preview Dialog = Frontend (oba live) |

---

_Raport ukończony po pełnym cyklu testów: analiza kodu + testy Admin UI + testy Frontend + porównanie._

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Content List is classification only. Widget-owned
  follow-up scope continues through the `TASK-262` family.
- Shared rows that match existing TASK-256 clear/link/truthful-control
  mechanisms remain referenced by `TASK-256-07` and `TASK-256-08`.

---

## Status po TASK-262 / TASK-302 (2026-05-17)

### Final classification

| Finding | Final status | Owner / landed scope | Evidence |
|---|---|---|---|
| B-01 | fixed | `TASK-262-03` | widget-owned pagination contract landed in `contentList.tsx`, `contentListResolver.ts`, and Visual controls; targeted unit + Vitest navigation assertions are green |
| B-02 | fixed | `TASK-262-02` | Content List now renders optional section title/description with accessible section labeling |
| B-03 | fixed | `TASK-262-03` | `view-all` / `load-more` / paged navigation contract landed with safe href handling and runtime page metadata |
| B-04 | fixed | `TASK-302` | misleading `Columns` control is removed for non-card variants in both Content List and Posts Feed editor surfaces |
| B-05 | fixed | `TASK-302` | image presentation is no longer hardcoded to a single `h-40` path; bounded `imageAspect` landed |
| B-06 | fixed | `TASK-262-04` | tags can render as bounded badges instead of being forced into the meta line |
| E-01 | fixed | `TASK-302` | `Columns` truthfulness now matches the renderer contract |
| E-02 | fixed | `TASK-262-01` | Visual now shows current source mode and mode-specific controls without owning the mode switch itself |
| E-03 | fixed | `TASK-262-01` | taxonomy filter now uses suggestions from the taxonomy overview seam |
| E-04 | fixed | `TASK-262-01` | author filter is now a picker/search flow backed by `admin-users` summaries |
| E-05 | fixed | `TASK-302` + `TASK-310-02` | `textColor` now uses the landed shared clear/picker implementation |
| E-06 | fixed | `TASK-262-01` | source-mode labels are editor-friendly (`By content type`, `By listing query`) |
| E-07 | fixed | `TASK-262-04` | variant selection now includes visual preview cards |
| E-08 | fixed | `TASK-302` + `TASK-310-02` | Content List color controls now include a picker without losing CSS-token text input ownership and use the shared implementation |
| E-09 | fixed | reverified in `TASK-262-05` | current `missing-source` copy is already source-aware and remained correct after the family landed |
| E-10 | fixed | `TASK-262-04` | card style now uses visual preview cards instead of a blind dropdown |
| E-11 | fixed | `TASK-262-01` | content type selection is searchable and duplicate names are disambiguated via friendly labels |
| T-01 | fixed | `TASK-302` | CTA no longer disappears silently when an item lacks `href`; a disabled label is rendered instead |
| T-02 | fixed | `TASK-262-02` | editor guidance now explains saved-data canvas behavior instead of leaving the static preview unexplained |
| T-03 | fixed / no longer reproducible | reverified in `TASK-262-05` | listing mode no longer exposes a misleading `statusScope` control path in the reported shape |
| T-04 | fixed | `TASK-262-01` | switching to listing mode clears legacy-only filters and removes stale disabled controls |
| T-05 | fixed | `TASK-262-02` | listing-mode empty copy is source-aware and no longer says `content type` |
| T-06 | fixed | `TASK-262-01` | listing mode no longer shows a stale disabled `Featured only` toggle that can look active |

### Validation snapshot

Validated locally on the TASK-262 worktree after the final implementation slices:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/content/contentListResolver.test.ts tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun run gates:coderso`
- `bun run precommit`

`bun run scan:security:strict` still has an environment blocker in this local setup:
- `semgrep`: local trust-store failure (`ca-certs: empty trust anchors`)
- `bun audit`: `ConnectionRefused`
- `trivy` and both `gitleaks` lanes were clean in the same strict pass.
