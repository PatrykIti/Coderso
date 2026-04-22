# Raport UX/QA — sekcja Posts (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/posts
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Przetestowane przepływy

- Lista postów — widok, filtry, wyszukiwarka, menu akcji
- Tworzenie nowego posta ("Wprowadzenie do Nextless CMS")
- Edytor rich-text — pisanie treści, zmiana typu bloku (Heading)
- Block Inserter — zakładki Text / Media / Interactive
- Save (autosave) i Publish
- Prawy panel Post tab — Publishing, Categories & Tags, Featured Image, Advanced (SEO, tytuł, slug, excerpt)
- Editor Settings (preferencje użytkownika)
- Revisions (historia wersji)
- Bulk select, Status filter, Wyszukiwarka

---

## Porównanie z Pages

| Aspekt | Pages | Posts |
|--------|-------|-------|
| Typ edytora | Widget-based (drag & drop) | Rich-text block editor |
| Autosave | Brak (tylko "UNSAVED CHANGES") | Tak — timestamp widoczny |
| Przycisk po publikacji | Zostaje "Publish" (problem) | Zmienia się na "Update" ✓ |
| SEO fields w edytorze | Brak | Tak — w sekcji Advanced ✓ |
| Preferencje edytora | Brak | Editor Settings (focus, density) ✓ |
| Autor nowego wpisu | "Unknown" (bug) | Poprawnie "Patryk" ✓ |
| Format sluga | `/homepage` (z `/`) | `slug-bez-slash` (bez `/`) |
| Kolumna dodatkowa | Last Updated | Categories/Tags |
| Historia wersji | Ręczna (po save) | Autosave tworzy wersje ✓ |

---

## Bugi

### [BUG-1] KRYTYCZNY: Bulk select nie działa (taki sam jak w Pages)

**Gdzie:** Lista postów → checkbox "Select all posts"

**Co się dzieje:** "Select all" zaznacza tylko header checkbox, wiersze pozostają niezaznaczone. Brak bulk action toolbar. Identyczny bug jak w sekcji Pages.

---

### [BUG-2] ŚREDNI: Placeholder wyszukiwarki — błędny tekst (copy-paste)

**Gdzie:** Lista postów → pole wyszukiwania

**Co się dzieje:** Placeholder mówi `"Search pages by title..."` zamiast `"Search posts by title..."`. Kopiowanie z komponentu Pages bez zmiany tekstu.

---

### [BUG-3] ŚREDNI: Zachowanie przycisku "Details" nieintuicyjne

**Gdzie:** Edytor posta → przycisk "Details" w toolbarze

**Co się dzieje:** Kliknięcie "Details" otwiera Block Inserter po lewej stronie zamiast przełączać widoczność panelu Post details po prawej. Użytkownik spodziewając się szczegółów posta dostaje inserter bloków — mylące.

---

### [BUG-4] ŚREDNI: Category ID i Featured Image — surowe pola ID

**Gdzie:** Edytor posta → prawy panel "Post" → sekcje Categories and Tags, Featured Image

**Co się dzieje:**
- "Category ID" to tekstowe pole z placeholderem `"taxonomy category term ID"` — wymaga znajomości wewnętrznego ID
- "Featured Image" to pole `"Media ID (optional)"` — wymaga znania ID pliku z media library
Brak pickerów / dropdownów / przeglądarki mediów. Nieprzydatne dla użytkownika bez dostępu do DB/API.

---

### [BUG-5] NISKI: Brak powiadomień (toast) po Publish / Update

**Gdzie:** Edytor posta → przyciski "Publish" i "Update"

**Co się dzieje:** Brak widocznego feedbacku (toast) po opublikowaniu lub aktualizacji posta. Jedynym sygnałem jest zmiana badge'a i timestamp. (Ten sam problem co w Pages.)

---

## Problemy UX

### [UX-1] Brak podglądu treści w Revisions przed restore

**Gdzie:** Edytor → Revisions drawer

**Problem:** Historia wersji pokazuje datę, autora i liczbę bloków ("1 blocks"), ale brak podglądu zawartości. Użytkownik nie wie co jest w danej wersji, zanim ją przywróci.

**Sugestia:** Dodać rozwijany podgląd treści każdej wersji lub "Preview" link przed przyciskiem Restore.

---

### [UX-2] Focus mode domyślnie włączony — ukrywa Post settings

**Gdzie:** Edytor posta → domyślny widok przy otwarciu

**Problem:** Edytor otwiera się w focus mode (sidebary ukryte) co jest ustawieniem w Editor Settings. Nowy użytkownik może nie znaleźć sekcji Categories, Tags, Featured Image — są w prawym panelu, który jest ukryty.

**Sugestia:** Rozważyć domyślne wyłączenie focus mode lub wyświetlić onboarding tip przy pierwszym otwarciu.

---

### [UX-3] Sekcja "Advanced" domyślnie zwinięta ukrywa SEO

**Gdzie:** Prawy panel → zakładka Post → sekcja Advanced

**Problem:** SEO fields (SEO title, description, canonical URL, robots) są ukryte w zwiniętej sekcji Advanced. Użytkownicy nieświadomi mogą nigdy ich nie uzupełnić — mimo że SEO jest kluczowe.

**Sugestia:** Wynieść SEO poza Advanced lub dodać widoczny indicator w prawym panelu gdy SEO jest niekompletne (np. badge "SEO: 0/3").

---

### [UX-4] Block Inserter — Media ubogi (tylko Image i Separator)

**Gdzie:** Edytor → Block Inserter → zakładka Media

**Problem:** Zakładka Media zawiera tylko 2 bloki: Image i Separator. Brak Video, Gallery, Embed YouTube/Vimeo, File download, Audio.

**Sugestia:** Rozszerzyć bibliotekę bloków medialnych lub umożliwić embed zewnętrznych mediów w bardziej intuicyjny sposób (Embed blok co prawda istnieje w Interactive, ale nie jest w Media).

---

### [UX-5] Slug Posts bez "/" — niespójny z Pages

**Gdzie:** Dialog tworzenia posta + Advanced → Slug

**Problem:** Slug posta: `wprowadzenie-do-nextless-cms` (bez `/`). Slug strony: `/homepage` (z `/`). Niespójny format między sekcjami.

**Sugestia:** Ujednolicić format slugów lub jasno wyjaśnić różnicę (dokumentacja lub tooltip przy polu).

---

### [UX-6] "Typography reads from block" — niejasny komunikat

**Gdzie:** Edytor → pasek formatowania → obok selektorów czcionki

**Problem:** Tekst `"Typography reads from block."` obok dropdownów Sans i Text M sugeruje że ustawienia czcionki są tylko informacyjne i czytane ze stylu bloku, ale nie jest jasne czy użytkownik może je zmienić i co faktycznie kontrolują.

**Sugestia:** Dodać tooltip lub helptext wyjaśniający kiedy i jak działa nadpisanie typografii.

---

### [UX-7] Lista bloków w Block Inserter — brak wyszukiwania per kategoria

**Gdzie:** Edytor → Block Inserter → zakładka "All"

**Problem:** Zakładka "All" i wyszukiwarka działają globalnie, ale po wybraniu zakładki (np. "Text") wyszukiwanie filtruje wszystkie bloki zamiast tylko tekstowe. Oczekiwanie: filtrowanie wewnątrz wybranej kategorii.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Autosave z timestampem ("Autosaved at 07:52 AM") | Wyraźny, ciągły feedback — lepiej niż Pages |
| Przycisk "Update" po publikacji (zamiast "Publish") | Jasne oznaczenie stanu — przewaga nad Pages |
| SEO fields z licznikiem "SEO fields completed: 0/3" | Dobry UX — motywuje do uzupełnienia |
| Editor Settings (focus mode, compact panels, density) | Przemyślane preferencje użytkownika |
| Autosave tworzy wersje w Revisions | Ciągła historia bez ręcznego zapisu |
| "Danger zone" ze "Move to trash" — wyraźna etykieta | Dobre ostrzeżenie destruktywnej akcji |
| Block Inserter podzielony na kategorie (Text, Media, Interactive) | Lepszy niż płaska lista widgetów w Pages |
| Document Outline — lewy panel z hierarchią nagłówków | Pomocna nawigacja w długich postach |
| Zmiana bloku Type (Paragraph → Heading → Quote) | Działa poprawnie, prawy panel aktualizuje się |
| Prawy panel auto-przełącza na "Block" przy zaznaczeniu bloku | Inteligentny kontekst ustawień |
| Autor nowego posta przypisany poprawnie | Brak bugu "Unknown" z Pages |
| Wyszukiwarka i filtr Status | Działają poprawnie |
| Menu akcji (...) spójne z Pages | Edit, Preview, Duplicate, Publish (disabled), Unpublish, Delete |
| Preview otwiera w nowej karcie z tokenem | Poprawne działanie po konfiguracji frontendu |

---

## Screenshoty

Dostępne w katalogu `screenshots/` (jeśli dodane):

- `posts-list.png` — lista postów przed testami
- `create-post-dialog.png` — dialog tworzenia posta (bez Template vs Pages)
- `post-editor.png` — edytor po otwarciu (focus mode aktywny)
- `post-typing.png` — po wpisaniu treści, prawy panel auto-przełączony na Block
- `post-heading.png` — blok zmieniony na Heading H2, Document Outline zaktualizowany
- `add-block-panel.png` — Block Inserter — zakładka Text
- `block-media-tab.png` — zakładka Media (tylko Image, Separator)
- `block-interactive-tab.png` — zakładka Interactive (Callout, Button, Embed)
- `post-revisions.png` — historia wersji (Version 1, Version 2 — autosave)
- `post-publish.png` — po publikacji: badge Published, przycisk → Update
- `post-settings-panel.png` — Editor Settings (focus mode, compact panels, guidance)
- `post-tab-settings.png` — prawy panel Post tab z Publishing, Categories, Featured Image
- `post-advanced.png` — Advanced rozwinięty (SEO fields, slug, excerpt)
- `posts-list2.png` — lista po testach z nowym postem (autor poprawny)
- `post-actions-menu.png` — menu (...) z opcjami akcji
- `posts-search.png` — wyszukiwarka filtruje do "terst*"
- `bulk-select.png` — bug: Select all nie zaznacza wierszy
