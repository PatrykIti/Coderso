# Raport UX/QA — sekcja Entries (Admin UI) — Retест

**Data testów:** 2026-04-30
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/advanced/entries
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl
**Poprzedni raport:** SUMMARY-ENTRIES.md (2026-04-22, TASK-203)

---

## Uwaga architektoniczna — zmiana URL

Poprzedni test był prowadzony pod `/admin/coderso/entries` (z lewym sidebareem content types + lista wpisów po prawej).
Obecny test: `/admin/advanced/entries` — **całkowicie nowy design**:
- Płaska lista WSZYSTKICH wpisów ze wszystkich typów w jednej tabeli
- Filtr zaawansowany (Advanced) z dropdown Content type, Author, date range
- Brak lewego sidebaru z listą typów
- Brak przycisku "New Collection" w bocznym panelu

Niektóre poprawki z TASK-203 dotyczyły starego interfejsu (sidebar grup typów) i wymagają weryfikacji w nowym.

---

## Przetestowane przepływy

- Login przez formularz admin
- Strona listy wpisów `/admin/advanced/entries`
- Filtr Status (All/Draft/Published/Scheduled/Archived)
- Filtr zaawansowany: Content type (z licznikami), Author, daty Updated
- Wyszukiwarka "Search entries by title or slug..."
- Paginacja (Poprzednia / Następna, 10/strona)
- Przycisk "New" — dialog tworzenia nowego wpisu (Content type, Title, Slug, Tags)
- Tworzenie wpisu "QA Test Article 2026" dla content type "testowy"
- Edytor entry: toolbar (Runtime preview, Save draft, Publish/Update)
- Prawy panel: Publishing (Status + Schedule date), Publish checklist, "What is this?", SEO snippet, Taxonomy, Save metadata, Danger zone
- Toast po tworzeniu, zapisie szkicu, zapisie metadanych, publikacji, duplikacji, usunięciu
- Dirty state indicator (niezapisane zmiany)
- Akcje wiersza "..." → Edit, Duplicate, Delete
- Bulk select + bulk actions (Publish, Move to Draft, Archive, Delete)
- Delete entry dialog (z Danger zone w edytorze i z listy)
- Runtime Preview dialog (Desktop/Tablet/Mobile)

---

## Weryfikacja bugów z TASK-203

### [BUG-1] FIXED ✓ — Save metadata zwraca 500

**Weryfikacja:** `PATCH /admin/api/content/testowy/entries/{uuid}/metadata → 200 OK`
Toast "Metadata saved." pojawia się po kliknięciu. Przycisk nie zamraża się.

---

### [BUG-2] CANNOT VERIFY — Pole Rich text renderuje się jako textarea

**Weryfikacja:** Brak content type z polem `xFieldType: "richtext"` w obecnym środowisku.
Sprawdzenie API (`/admin/api/content-types`) — żaden z 43 typów nie ma pola richtext.
Typ "Post" (który miał richtext) nie istnieje na serwerze (404 pod `/admin/advanced/entries/post`).

**Zalecenie:** Stworzyć content type z polem Rich text w Engine i zweryfikować renderowanie.

---

### [BUG-3] FIXED ✓ — Delete entry używa natywnego window.confirm()

**Weryfikacja:**
- Delete z listy (menu "...") → Radix dialog "Delete entry?" z przyciskami "Cancel" / "Delete entry"
- Delete z Danger zone w edytorze → ten sam Radix dialog
- Toast "Entry deleted." po potwierdzeniu
- Brak natywnego `window.confirm`

---

### [BUG-4] FIXED ✓ — Duplicate entry — brak feedbacku

**Weryfikacja:**
- Po kliknięciu "Duplicate" z menu "..." → toast "Entry duplicated."
- Kopia "QA Test Article 2026 (updated) (Copy)" pojawia się na liście z slugiem `qa-test-article-2026-copy`
- Lista odświeża się automatycznie

---

### [BUG-5] FIXED ✓ — Dwa przyciski "Save draft" bez rozróżnienia roli

**Weryfikacja:** Toolbar ma "Save draft" (zapis treści) i "Update"/"Publish" (publikacja).
Prawy panel sidebar ma "Save metadata" (osobna operacja). Brak duplikatu "Save draft" w sidebarze.

---

### [BUG-6] FIXED ✓ — Brak Danger zone wewnątrz edytora entry

**Weryfikacja:** Prawy panel zawiera sekcję "Danger zone" z przyciskiem "Delete entry".
Kliknięcie otwiera Radix dialog z tekstem "Delete {title}? This cannot be undone."

---

### [BUG-7] FIXED ✓ — Brak toast po "Save draft" i "Update"

**Weryfikacja:**
- "Save draft" → toast "Draft saved."
- "Publish" → status zmieniony na Published, toast widoczny
- "Save metadata" → toast "Metadata saved."
- Create new entry → toast "Entry created."
- Duplicate → toast "Entry duplicated."
- Delete → toast "Entry deleted."

---

### [BUG-8] FIXED ✓ — Podgląd SEO pokazuje hardcoded URL "nextless.cms"

**Weryfikacja:** SEO snippet preview wyświetla `http://localhost:3000/testowy/qa-test-article-2026`.
URL pobierany z ustawień serwera (localhost:3000), nie hardcoded "nextless.cms".

---

## Weryfikacja problemów UX z TASK-203

### [UX-1] REDESIGNED — Sidebar content types bez grupowania

**Weryfikacja:** Stary sidebar (lewa kolumna) nie istnieje w `/admin/advanced/entries`.
Nowy design: filtr "Content type" w Advanced panel pokazuje dropdown ze wszystkimi 43 typami z licznikami, np. "testowy (3)", "Route Docs (2)", "News (0)".

**Problem: [NOWY BUG-NEW-1]** — Duplicate "News" bez disambiguacji w Content type dropdown
W Advanced filter dropdown widoczne są 4 identyczne opcje "News (0)" — nie wiadomo który wybrać.
TASK-203 miało dodać disambiguation slugiem, ale nie dotyczyło tego nowego komponentu.

---

### [UX-2] PARTIAL FIX ⚠️ — Metadata dirty flag bez guard nawigacji

**Weryfikacja:**
- ✓ Po zmianie Status w dropdownie pojawia się `alert` "Unsaved changes" + "Save the entry content or metadata to keep your edits."
- ✓ Breadcrumb pokazuje "Unsaved changes" indicator
- ✗ Kliknięcie linku "Entries" w nawigacji → NATYCHMIASTOWA nawigacja bez ostrzeżenia
- ✗ Brak dialogu potwierdzenia opuszczenia strony

**Szczegóły:** Indicator "Unsaved changes" jest widoczny w edytorze, ale nie blokuje nawigacji przez React Router (SPA links). Ochrona działa tylko przy próbie odświeżenia/zamknięcia okna (`beforeunload`), nie przy kliknięciu linków wewnątrz SPA.

---

### [UX-3] FIXED ✓ — "What is this?" zwinięte i zapisywane

**Weryfikacja:** `localStorage["entries.metadataHelpCollapsed"] = "true"` po zwinięciu.
Przy ponownym wejściu do edytora sekcja jest domyślnie zwinięta (tylko przycisk "What is this?", brak listy punktów).

---

### [UX-4] FIXED ✓ — Brak Preview wewnątrz edytora entry

**Weryfikacja:** Toolbar zawiera przycisk "Runtime preview".
Kliknięcie otwiera dialog "Entry Preview" z przyciskami Desktop/Tablet/Mobile.
Dialog pokazuje "Live preview unavailable — Frontend is not responding at http://localhost:3000" (frontend nie działa lokalnie, ale dialog i mechanizm są gotowe).

---

### [UX-5] FIXED ✓ — Taxonomy "disabled" bez linku do naprawy

**Weryfikacja:** Sekcja Taxonomy wyświetla:
"Categories and tags are disabled for this content type."
+ link "Enable taxonomy in content type settings" → `/admin/advanced/engine/{type-id}`

---

## Nowe bugi (nowe w tym teście)

### [BUG-NEW-1] ŚREDNI — Duplicate "News" w Content type filter bez disambiguacji

**Gdzie:** Entries list → Advanced filter → dropdown "Content type: All"

**Co się dzieje:** Dropdown pokazuje 4 identyczne pozycje "News (0)" bez żadnej dodatkowej informacji. Użytkownik nie może rozróżnić który "News" wybrać.

**Kontekst:** Stary sidebar (TASK-203) miał disambiguation slug po nazwie. Nowy dropdown Advanced filter nie implementuje tego rozwiązania.

**Kierunek naprawy:** Pokazać slug w nawiasach po duplikujących się nazwach, np. "News (news-855f2ed1) (0)" lub użyć drobniejszego tekstu ze slugiem pod nazwą. Docelowo: posprzątać dane i usunąć zduplikowane typy.

---

### [BUG-NEW-2] NISKI — Guard nawigacji SPA przy niezapisanych zmianach nie działa

**Gdzie:** Edytor entry → zmiana Status → kliknięcie linku w sidebar (np. "Entries")

**Co się dzieje:** Mimo widocznego alertu "Unsaved changes" w edytorze, kliknięcie linku w React Router SPA powoduje natychmiastową nawigację bez potwierdzenia. Zmiany metadanych zostają utracone bez ostrzeżenia.

**Kierunek naprawy:** Implementacja `useBlocker` (React Router v6) lub `useBeforeUnload` + React Router `block` dla linków wewnętrznych. Wzorzec stosowany przez Engine (który ma taki guard).

---

### [BUG-NEW-3] INFORMACYJNY — Brak widoku grid/siatki na nowej stronie Entries

**Gdzie:** `/admin/advanced/entries` — brak toggle list/grid

**Co się dzieje:** Stary interfejs miał przełącznik widoku tabela ↔ siatka. Nowy interfejs ma tylko widok tabelaryczny. Może to być celowa decyzja designowa lub pominięta funkcja.

**Kierunek:** Zweryfikować czy grid view jest planowany dla nowego `/admin/advanced/entries`, czy został celowo usunięty.

---

### [BUG-NEW-4] INFORMACYJNY — Content type "Article QA Test 2026" pojawił się w filtrze

**Gdzie:** Content type filter dropdown

**Co się dzieje:** W trakcie testowania w dropdownie pojawił się typ "Article QA Test 2026 (0)" — prawdopodobnie stworzony przez innego agenta lub poprzedni test. Środowisko testowe jest współdzielone, co może powodować interferencję między agentami.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Toast "Entry created." po tworzeniu wpisu | Pojawia się i informuje o sukcesie |
| Toast "Draft saved." po Save draft | FIXED — wcześniej brak |
| Toast "Metadata saved." po Save metadata | FIXED — wcześniej 500 |
| Toast "Entry duplicated." + lista odświeżona | FIXED — wcześniej brak |
| Toast "Entry deleted." po usunięciu | FIXED — wcześniej brak |
| Delete dialog (Radix AlertDialog) | FIXED — wcześniej window.confirm |
| Danger zone w edytorze | FIXED — wcześniej brak |
| "What is this?" zwijane + localStorage | FIXED — wcześniej domyślnie rozwinięte |
| SEO snippet URL z localhost:3000 | FIXED — wcześniej hardcoded nextless.cms |
| Taxonomy disabled → link do Engine | FIXED — wcześniej brak linku |
| Indicator "Unsaved changes" w edytorze | FIXED — ostrzega o niezapisanych zmianach |
| Filtr Status (All/Draft/Published/Scheduled/Archived) | Działa, lista filtruje natychmiast |
| Advanced filter: Content type, Author, Updated from/to | Nowa funkcja, działa poprawnie |
| Search "Search entries by title or slug..." | Filtruje natychmiast |
| Paginacja (1-10 of 23, Previous/Next) | Działa, pokazuje Showing X-Y of Z |
| Bulk select (Select All + wiersze) | "Selected 10", toolbar bulk actions |
| Bulk actions: Publish, Move to Draft, Archive, Delete | Kompletny zestaw w dropdownie |
| Runtime Preview dialog (Desktop/Tablet/Mobile) | FIXED — wcześniej brak |
| Scheduled status → pole datetime aktywne | Działa poprawnie |
| Publish checklist "3/4 ready" | Czytelna informacja o gotowości |
| Slug auto-generowany z tytułu | Działa w dialogi tworzenia i w edytorze |
| Breadcrumb Content / {type} / {title} | Nawigacja kontekstowa działa |

---

## Błędy z konsoli (runtime)

```
[GET] http://localhost:3000/ => FAILED net::ERR_ABORTED (frontend wyłączony — oczekiwane)
[GET] http://localhost:3000/preview?type=content&... => FAILED net::ERR_ABORTED (preview — oczekiwane)
[WARNING] Missing Description or aria-describedby={undefined} for DialogContent (Radix)
```

Zero błędów JavaScript. Jeden warning Radix Dialog (brakujący `aria-describedby`) — drobny problem dostępności.

---

## Screenshoty

- `entries-list-global.png` — strona /admin/advanced/entries z płaską listą wpisów
- `create-entry-dialog.png` — dialog tworzenia nowego entry (Content type, Title, Slug, Tags)
- `entry-editor.png` — edytor entry po otwarciu (QA Test Article 2026)
- `entry-editor-full.png` — edytor entry (wersja Published z Update button)
- `save-metadata-toast.png` — toast "Metadata saved." — BUG-1 FIXED
- `save-draft-after.png` — po kliknięciu Save draft
- `publish-toast.png` — po kliknięciu Publish
- `delete-entry-dialog.png` — Radix dialog "Delete entry?" z edytora (BUG-6)
- `duplicate-toast.png` — toast "Entry duplicated." (BUG-4)
- `unsaved-changes-indicator.png` — alert "Unsaved changes" w edytorze (UX-2)
- `scheduled-status-unsaved.png` — status Scheduled + unsaved indicator
- `runtime-preview-dialog.png` — dialog Runtime preview z Desktop/Tablet/Mobile (UX-4)
- `bulk-actions-dropdown.png` — dropdown bulk actions (Publish, Move to Draft, Archive, Delete)
- `entry-actions-menu.png` — menu "..." z Edit, Duplicate, Delete
- `status-filter-draft.png` — filtr Status: Draft
- `advanced-filter.png` — rozwinięty panel Advanced filter
- `content-type-filter.png` — dropdown Content type z licznikami
- `content-type-filter-duplicates.png` — zduplikowane "News (0)" w dropdownie (BUG-NEW-1)
- `seo-snippet.png` — SEO snippet z URL localhost:3000 (BUG-8 FIXED)
- `entries-list-final.png` — końcowy stan listy entries

---

## Podsumowanie statusu TASK-203

| Bug/UX | Status |
|---|---|
| BUG-1: Save metadata 500 | ✓ FIXED |
| BUG-2: Rich text textarea | ❓ CANNOT VERIFY (brak test data) |
| BUG-3: Delete window.confirm | ✓ FIXED |
| BUG-4: Duplicate brak feedbacku | ✓ FIXED |
| BUG-5: Dwa Save draft | ✓ FIXED |
| BUG-6: Brak Danger zone | ✓ FIXED |
| BUG-7: Brak toast | ✓ FIXED |
| BUG-8: SEO URL hardcoded | ✓ FIXED |
| UX-1: Sidebar bez grupowania | ✓ FIXED (nowy design z Advanced filter) |
| UX-2: Metadata dirty guard nawigacji | ⚠️ PARTIAL — indicator jest, guard SPA brak |
| UX-3: "What is this?" zwijane | ✓ FIXED |
| UX-4: Brak Preview | ✓ FIXED (Runtime preview) |
| UX-5: Taxonomy bez linku | ✓ FIXED |
| **BUG-NEW-1** | 🆕 Duplicate "News" w Content type filter |
| **BUG-NEW-2** | 🆕 Leave-page guard SPA nie działa |
| **BUG-NEW-3** | ℹ️ Brak grid view (może być celowe) |
| **BUG-NEW-4** | ℹ️ Interferencja agentów w środowisku testowym |
