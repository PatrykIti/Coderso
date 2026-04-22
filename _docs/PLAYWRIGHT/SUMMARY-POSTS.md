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

**Kierunek naprawy UI:** Checkbox w nagłówku powinien mieć stan pośredni (częściowe zaznaczenie), a kliknięcie go zaznacza/odznacza wszystkie wiersze. Każdy wiersz potrzebuje własnego checkboxa. Po zaznaczeniu co najmniej jednego wiersza — nad tabelą pojawia się pasek akcji grupowych z przyciskami (np. "Opublikuj", "Przenieś do kosza") i licznikiem zaznaczonych elementów.

---

### [BUG-2] ŚREDNI: Placeholder wyszukiwarki — błędny tekst (copy-paste)

**Gdzie:** Lista postów → pole wyszukiwania

**Co się dzieje:** Placeholder mówi `"Search pages by title..."` zamiast `"Search posts by title..."`. Kopiowanie z komponentu Pages bez zmiany tekstu.

**Kierunek naprawy UI:** Zmiana jednego słowa w tekście placeholdera — "pages" → "posts". Rozważyć wyciągnięcie tego tekstu do props komponentu, żeby nie trzeba było pamiętać o zmianach przy kolejnym copy-paste.

---

### [BUG-3] ŚREDNI: Zachowanie przycisku "Details" nieintuicyjne

**Gdzie:** Edytor posta → przycisk "Details" w toolbarze

**Co się dzieje:** Kliknięcie "Details" otwiera Block Inserter po lewej stronie zamiast przełączać widoczność panelu Post details po prawej. Użytkownik spodziewając się szczegółów posta dostaje inserter bloków — mylące.

**Kierunek naprawy UI:** Przyciski w toolbarze powinny jednoznacznie komunikować co otwierają — ikona i label muszą odpowiadać docelowemu panelowi. "Details" / "Post settings" powinien otwierać prawy panel, a inserter bloków powinien mieć osobny przycisk (np. "+" lub "Add block"). Wyraźne wizualne odróżnienie tych dwóch akcji eliminuje pomyłkę.

---

### [BUG-4] ŚREDNI: Category ID i Featured Image — surowe pola ID

**Gdzie:** Edytor posta → prawy panel "Post" → sekcje Categories and Tags, Featured Image

**Co się dzieje:**
- "Category ID" to tekstowe pole z placeholderem `"taxonomy category term ID"` — wymaga znajomości wewnętrznego ID
- "Featured Image" to pole `"Media ID (optional)"` — wymaga znania ID pliku z media library
Brak pickerów / dropdownów / przeglądarki mediów. Nieprzydatne dla użytkownika bez dostępu do DB/API.

**Kierunek naprawy UI:**
- **Kategorie:** pole tekstowe zastąpić dropdownem lub multi-select z listą kategorii pobraną z API. Użytkownik wybiera nazwę, ID jest ukryte.
- **Featured Image:** zamiast pola na ID — przycisk "Wybierz zdjęcie" otwierający modal z galerią mediów (miniatury). Po wybraniu — wyświetlana miniatura + przycisk "Usuń". To standardowy pattern spotykany w WordPress czy Contentful.

---

### [BUG-5] NISKI: Brak powiadomień (toast) po Publish / Update

**Gdzie:** Edytor posta → przyciski "Publish" i "Update"

**Co się dzieje:** Brak widocznego feedbacku (toast) po opublikowaniu lub aktualizacji posta. Jedynym sygnałem jest zmiana badge'a i timestamp. (Ten sam problem co w Pages.)

**Kierunek naprawy UI:** Dodać krótkie powiadomienie toast pojawiające się w rogu ekranu po udanej akcji (np. "Post opublikowany" / "Zmiany zapisane"). Toast znika samodzielnie po 3–4 sekundach. Daje użytkownikowi pewność że akcja się powiodła, bez konieczności szukania zmiany w badge'u.

---

## Problemy UX

### [UX-1] Brak podglądu treści w Revisions przed restore

**Gdzie:** Edytor → Revisions drawer

**Problem:** Historia wersji pokazuje datę, autora i liczbę bloków ("1 blocks"), ale brak podglądu zawartości. Użytkownik nie wie co jest w danej wersji, zanim ją przywróci.

**Kierunek naprawy UI:** Każdy wpis w historii wersji powinien mieć przycisk "Podgląd" który otwiera treść tej wersji w trybie tylko-do-odczytu — albo jako rozwijany panel poniżej wpisu, albo jako overlay/modal. Przed przywróceniem użytkownik musi wiedzieć co przywraca.

---

### [UX-2] Focus mode domyślnie włączony — ukrywa Post settings

**Gdzie:** Edytor posta → domyślny widok przy otwarciu

**Problem:** Edytor otwiera się w focus mode (sidebary ukryte) co jest ustawieniem w Editor Settings. Nowy użytkownik może nie znaleźć sekcji Categories, Tags, Featured Image — są w prawym panelu, który jest ukryty.

**Kierunek naprawy UI:** Zmienić domyślną wartość focus mode na wyłączoną — panele widoczne od razu. Alternatywnie: przy pierwszym otwarciu edytora pokazać krótki tooltip lub highlight wskazujący na ikonę ustawień po prawej, żeby użytkownik wiedział że panel istnieje i jak go otworzyć.

---

### [UX-3] Sekcja "Advanced" domyślnie zwinięta ukrywa SEO

**Gdzie:** Prawy panel → zakładka Post → sekcja Advanced

**Problem:** SEO fields (SEO title, description, canonical URL, robots) są ukryte w zwiniętej sekcji Advanced. Użytkownicy nieświadomi mogą nigdy ich nie uzupełnić — mimo że SEO jest kluczowe.

**Kierunek naprawy UI:** Nagłówek sekcji "Advanced" powinien pokazywać badge z informacją o stanie SEO, np. "SEO: 0/3" w kolorze pomarańczowym gdy pola są puste — nawet gdy sekcja jest zwinięta. To zachęca do rozwinięcia i uzupełnienia. Alternatywnie: wynieść SEO jako osobną sekcję na tym samym poziomie co Publishing i Categories.

---

### [UX-4] Block Inserter — Media ubogi (tylko Image i Separator)

**Gdzie:** Edytor → Block Inserter → zakładka Media

**Problem:** Zakładka Media zawiera tylko 2 bloki: Image i Separator. Brak Video, Gallery, Embed YouTube/Vimeo, File download, Audio.

**Kierunek naprawy UI:** Przenieść blok Embed z zakładki Interactive do Media (lub dodać go do obu) — bo wklejanie linku YouTube to de facto media. Docelowo zakładka Media powinna zawierać: Image, Video, Gallery, Embed, Audio, File. Separator nie jest media — należy do Text.

---

### [UX-5] Slug Posts bez "/" — niespójny z Pages

**Gdzie:** Dialog tworzenia posta + Advanced → Slug

**Problem:** Slug posta: `wprowadzenie-do-nextless-cms` (bez `/`). Slug strony: `/homepage` (z `/`). Niespójny format między sekcjami.

**Kierunek naprawy UI:** Przy polu slug pokazać wizualnie pełną ścieżkę URL jako szary prefix przed polem, np. `example.com/blog/` + `[wprowadzenie-do-nextless-cms]`. Dzięki temu użytkownik widzi kontekst i format jest jasny bez potrzeby ujednolicania wartości w bazie.

---

### [UX-6] "Typography reads from block" — niejasny komunikat

**Gdzie:** Edytor → pasek formatowania → obok selektorów czcionki

**Problem:** Tekst `"Typography reads from block."` obok dropdownów Sans i Text M sugeruje że ustawienia czcionki są tylko informacyjne i czytane ze stylu bloku, ale nie jest jasne czy użytkownik może je zmienić i co faktycznie kontrolują.

**Kierunek naprawy UI:** Zastąpić ten tekst ikoną informacji (ⓘ) z tooltipem który wyjaśnia jednym zdaniem co się dzieje. Jeśli dropdowny są tylko-do-odczytu gdy blok ma własny styl — wyszarzyć je i dodać tooltip "Edytuj styl bloku aby zmienić typografię". Wyszarzenie od razu komunikuje że pole nie jest aktywne.

---

### [UX-7] Lista bloków w Block Inserter — brak wyszukiwania per kategoria

**Gdzie:** Edytor → Block Inserter → zakładka "All"

**Problem:** Zakładka "All" i wyszukiwarka działają globalnie, ale po wybraniu zakładki (np. "Text") wyszukiwanie filtruje wszystkie bloki zamiast tylko tekstowe. Oczekiwanie: filtrowanie wewnątrz wybranej kategorii.

**Kierunek naprawy UI:** Wyszukiwanie powinno zawężać wyniki do aktywnej zakładki. Gdy wybrana jest zakładka "Text" i użytkownik wpisuje frazę — widzi tylko pasujące bloki tekstowe. Placeholder pola wyszukiwania może się dynamicznie zmieniać: "Szukaj w Text..." zamiast "Szukaj bloków...". Zakładka "All" działa globalnie jak dotąd.

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

---

## Bledy z konsoli real time

```plaintext
Core HTTP server listening on http://localhost:3000
36 |   async queryWithCache(queryString, params, query) {
37 |     if (this.cache === void 0 || is(this.cache, NoopCache) || this.queryMetadata === void 0) {
38 |       try {
39 |         return await query();
40 |       } catch (e) {
41 |         throw new DrizzleQueryError(queryString, params, e);
                   ^
error: Failed query: select "key", "value", "updated_at" from "settings" where "settings"."key" = $1
params: site.adminPath
  query: "select \"key\", \"value\", \"updated_at\" from \"settings\" where \"settings\".\"key\" = $1",
 params: [
  "site.adminPath"
],

      at queryWithCache (/Users/pciechanski/Documents/_moje_projekty/Nextless/node_modules/drizzle-orm/pg-core/session.js:41:15)

448 |     socket = null
449 | 
450 |     if (initial)
451 |       return reconnect()
452 | 
453 |     !hadError && (query || sent.length) && error(Errors.connection('CONNECTION_CLOSED', options, socket))
                                                              ^
error: write CONNECTION_CLOSED dpg-d5r7o8e3jp1c73fhuqf0-a.frankfurt-postgres.render.com:5432
   errno: "CONNECTION_CLOSED",
 address: [ "dpg-d5r7o8e3jp1c73fhuqf0-a.frankfurt-postgres.render.com" ],
    port: [
  5432
],
    code: "CONNECTION_CLOSED"

      at closed (/Users/pciechanski/Documents/_moje_projekty/Nextless/node_modules/postgres/src/connection.js:453:57)
      at closed (/Users/pciechanski/Documents/_moje_projekty/Nextless/node_modules/postgres/src/connection.js:662:9)
      at emit (node:events:95:22)
      at node:net:1468:20
POST - http://localhost:3000/admin/api/posts/19e39b8f-33f6-48b2-89ed-febe408bc383/autosave failed
```
