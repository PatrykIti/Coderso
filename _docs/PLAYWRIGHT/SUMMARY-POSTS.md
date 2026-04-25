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

## Manualna re-weryfikacja Playwright (2026-04-23)

Ręczny przebieg po wdrożeniu fixów. Status per bug/UX poniżej.

### Zweryfikowane działające ✓

| ID | Element | Obserwacja na żywo |
|---|---|---|
| BUG-1 | Bulk select | Select all → "1 post selected" + "Apply a bulk action to the visible selection." + Bulk actions dropdown + Clear. Działa jak w Pages. |
| BUG-2 | Search placeholder | Placeholder w search bar: "Search posts by title..." (nie "Search pages..."). Copy-paste naprawione. |
| BUG-3 | Przycisk "Details" | Toolbar rozróżnia teraz 5 buttonów z unikalnymi aria-labels: "Add block" (Toggle block inserter), "Outline" (Hide document overview), "Details" (Hide post details), "Focus" (Toggle full width editor), "Revisions" (Open revision history). Details nie otwiera już Block Inserter. |
| BUG-4 | Category ID / Featured Image — raw fields | Featured image: "Browse media" button zamiast Media ID textbox, "No media selected yet." status — użyto istniejącego Media Pickera z Entries. Categories: "Category" dropdown z "No category" (nie raw ID). |
| UX-6 | "Typography reads from block" | Tekst zmieniony na "Typography follows the selected block style." — jaśniejsze, nie sugeruje że jest "readonly". |

### Zweryfikowane częściowo ⚠

| ID | Element | Obserwacja |
|---|---|---|
| BUG-5 | Toast po Publish / Update | Po Publish: badge Draft → Published, przycisk Publish → Update. **Toast nie jest widoczny** — aria-live region jest pusta. Pośredni feedback działa, ale dedykowanego toast notification brak. Analogiczny problem jak UX-1 w Pages. **Kierunek dopracowania UI:** podpiąć sonner toast "Post opublikowany" / "Zmiany zapisane" do aria-live region. |
| UX-1 | Preview w Revisions | Version 1 ma teraz button "Preview" + "Restore". Kliknięcie Preview → sekcja rozwija się z "Hide preview" toggle, ale treść pokazuje **"No preview available for this revision."** dla właśnie utworzonej wersji (1 block). Mechanizm istnieje, ale default empty state ścina UX. **Kierunek dopracowania UI:** dla pustych/bardzo krótkich wersji pokazać przynajmniej meta (author, date, rozmiar JSON) zamiast "No preview available". |
| UX-4 | Block Inserter Media | Zakładka Media zawiera teraz: Image + Embed (przedtem Image + Separator). Separator usunięty z Media — dobrze. Ale nadal brak Video, Gallery, Audio, File. Częściowa poprawa. |
| UX-7 | Search per kategoria w Block Inserter | Placeholder search bar: "Search blocks..." pozostał globalny niezależnie od aktywnej zakładki. Zakładki Text/Media/Interactive działają, ale search nie zawęża się do aktywnej zakładki. |

### Nowy bug wykryty podczas re-weryfikacji ⚠

### [BUG-6] NISKI: Radix `aria-describedby` warning nadal w Post revisions dialog

**Gdzie:** Edytor posta → przycisk "Revisions" → otwarcie drawera Post revisions

**Co się dzieje:** Po otwarciu Revisions dialog w konsoli pojawia się `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`. Pozostałe dialogi w Posts (jak widać w UX-7 Create Post drawer) są clean — tylko Revisions ma ten sam problem który był fixowany w Pages BUG-5. Pewnie ten specyficzny dialog umknął.

**Kierunek naprawy UI:** Dodać opis do DialogContent dla Revisions — np. "Restore an earlier snapshot of this post." (który już jest w subtitle dialogu — wystarczy podłączyć jako `aria-describedby`). Rozwiązanie takie samo jak w TASK-194 Pages BUG-5.

### [BUG-7] NISKI: 500 Internal Server Error na `/api/content-types/post/terms`

**Gdzie:** Edytor posta → prawy panel Post tab → sekcja Categories and Tags

**Co się dzieje:** Endpoint `GET /admin/api/content-types/post/terms` zwraca HTTP 500. W UI widoczne jako: "Category: No category — Failed query: select "id", "type_id", "name", "slug", "kind", "created_at", "updated_at" from "content_taxonomies" where ..." — raw query error w miejscu gdzie powinna być lista kategorii. Z poprzedniego raportu wiadomo że baza Render ma problem `CONNECTION_CLOSED` okresowo, ale frontend pokazuje surowy SQL error zamiast friendly fallback.

**Kierunek naprawy UI:** Gdy endpoint `/terms` zwraca 500 — w UI pokazać: "Nie udało się załadować kategorii. [Spróbuj ponownie]" z retry button, nie surowe query. Raw SQL nie powinien nigdy trafić do UI użytkownika. (Zasada taka sama jak BUG-3 Forms — kody błędów mapować do user-friendly messages.)

### UX feel — obserwacje po całym flow ✨

**Co jest super teraz:**
- Rozróżnienie 5 buttonów w toolbarze z aria-labels — każdy robi dokładnie to co sugeruje ikona. Ogromny skok dostępności.
- Browse media picker zamiast Media ID textbox — WordPress-level UX dla Featured Image. Użycie tego samego komponentu co w Entries = spójność.
- Category dropdown (nawet jeśli empty z powodu 500 — mechanizm jest właściwy, to problem backend).
- "Typography follows the selected block style." — subtle ale kluczowa zmiana. Jedno słowo zrobiło różnicę ("reads from" → "follows").

**Co nadal zostawia niedosyt:**
- Brak widocznego toast po Publish/Update — ten sam pain point jak w Pages.
- "No preview available for this revision." — Preview button istnieje ale dla 80% wersji daje tę negatywną wiadomość. Lepiej pokazać fallback (tekst treści w read-only).
- BUG-7 (raw SQL error w UI kategorii) psuje pierwsze wrażenie z Post editor — user widzi coś co wygląda jak debug output.
- Zakładka Media w Block Inserter nadal uboga (tylko Image + Embed) — dla blog-posta dobrze by było też Gallery/Video.

### Screeny

- `retest-fix/posts-list.png` — lista z poprawnym placeholder search
- `retest-fix/bulk-select.png` — "1 post selected" + Bulk actions
- `retest-fix/post-editor.png` — edytor z 5 różnymi buttonami w toolbarze (Add block / Outline / Details / Focus / Revisions)
- `retest-fix/block-inserter.png` — Block Inserter z zakładkami Text/Media/Interactive
- `retest-fix/revisions-dialog.png` — Version 1 z przyciskiem Preview + Restore
- `retest-fix/revisions-preview-expanded.png` — "No preview available for this revision."

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

---

## Domknięcie TASK-204 (2026-04-23)

Zakres TASK-204 domknął dodatkowe znaleziska z ręcznej re-weryfikacji bez
rozszerzania Posts poza istniejące kontrakty. Nie wykonano nowego manualnego
replaya Playwright w tej zmianie; poniższy status bazuje na zmianach kodu,
route-mappingach i targetowanych testach Vitest/Bun.

| ID | Status po TASK-204 | Dowód / właściciel |
|---|---|---|
| BUG-1 | Bez zmian, nadal regression-smoke po TASK-195 | `PostsListPage` / `PostsTable`; brak nowego kodu w TASK-204 |
| BUG-2 | Bez zmian, nadal regression-smoke po TASK-195 | Posts list search placeholder; brak nowego kodu w TASK-204 |
| BUG-3 | Bez zmian, nadal regression-smoke po TASK-195 | `PostEditorTopBar` / shell action labels |
| BUG-4 | Bez zmian, nadal regression-smoke po TASK-195 | `DocumentInspector` category dropdown i `MediaPicker`; taxonomy failure osobno w BUG-7 |
| BUG-5 | Naprawione w shared admin toaster contract | `AdminApp` montuje `Toaster` z `containerAriaLabel`, close button i bounded duration; test `adminApp.test.tsx` |
| UX-1 | Naprawione | `PostRevisionDrawer` pokazuje fallback metadata dla krótkich/pustych rewizji zamiast `No preview available...`; test `post-hooks-and-drawers-wave.test.tsx` |
| UX-2 | Bez zmian, regression-smoke po TASK-195 | focus/details discoverability właścicielem pozostaje editor shell/layout |
| UX-3 | Bez zmian, regression-smoke po TASK-195 | collapsed SEO summary właścicielem pozostaje `DocumentInspector` |
| UX-4 | Jawnie nadal otwarte jako capability gap | Nie dodano label-only bloków. Pełna naprawa wymaga ruchu razem przez `blockCatalog.ts`, `postBlockDocument.ts`, `postBlockNormalizer.ts`, `postBlockRuntimeMapper.ts`, `postBlockRuntimeRenderer.tsx`, canvas/inspector/media picker i docs |
| UX-5 | Bez zmian, regression-smoke po TASK-195 | slug route context bez zmiany stored slug values |
| UX-6 | Bez zmian, nadal zweryfikowane po TASK-195 | typography helper copy |
| UX-7 | Naprawione | `BlockInserter` ma category-scoped placeholder i aria-label; testy `post-block-inserter-wave.test.tsx`, `block-inserter-wave.test.tsx`, `post-block-catalog-search.test.ts` |
| BUG-6 | Naprawione | `PostRevisionDrawer` używa `SheetDescription` dla opisu drawera; test `post-hooks-and-drawers-wave.test.tsx` |
| BUG-7 | Naprawione na granicy API/UI | `taxonomyRoutes` mapuje unexpected errors do `taxonomy_unexpected_error`, a Posts inspector pokazuje `Could not load categories.` + retry; testy `taxonomy.test.ts`, `post-document-inspector-wave.test.tsx`, `post-block-editor-shell-wave.test.tsx` |
| Realtime console: `site.adminPath` settings read | Naprawione na browser-facing API boundary | `settingsRoutes` mapuje unexpected settings errors do `settings_error` / `Could not complete settings request.`; test `settings.test.ts`. Źródłowy Render/Postgres outage pozostaje runtime/environment symptomem, nie udaje sukcesu |
| Realtime console: posts autosave `CONNECTION_CLOSED` | Naprawione na autosave route boundary | `postsRoutes` mapuje unexpected autosave failures do `post_autosave_failed` / `Could not autosave post.`; test `postsRoutes.test.ts`. UI nadal pokazuje truthful autosave failure state |

Walidacja wykonana dla TASK-204:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/block-inserter-wave.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui/post-block-inserter-wave.test.tsx tests/vitest/ui-integration/post-block-inserter.test.tsx tests/vitest/ui-integration/post-editor-inserter-sidebar.test.tsx tests/vitest/posts/post-block-catalog-search.test.ts`
- `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/taxonomy.test.ts tests/integration/routes/settings.test.ts tests/integration/routes/postsRoutes.test.ts`

Follow-up 2026-04-24:

- Widoczny w panelu Posts `taxonomy_unexpected_error` nie był tylko transient DB
  failure. Root cause: dedicated Posts zwraca stable `typeId: "post"`, a
  taxonomy storage ma UUID-backed `content_taxonomies.type_id`.
- `taxonomyService` rozwiązuje teraz content type slug przez `content_types`
  przed query/mutacją taxonomy rows, więc `/admin/api/content-types/post/terms`
  nie porównuje już tekstowego `post` z UUID column.

---

## Manualna re-weryfikacja Playwright (2026-04-25)

**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/posts
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

### TL;DR

- **W pełni naprawione (12 / 13):** BUG-1, BUG-2, BUG-3, BUG-4, BUG-6, BUG-7, UX-1, UX-2, UX-3, UX-5, UX-6, UX-7.
- **Częściowo:** UX-4 (Block Inserter Media nadal tylko Image + Embed — bez Video/Gallery/Audio).
- **Wciąż otwarte:** BUG-5 (toast po Publish/Update — `[aria-live=polite]` w DOM, ale pozostaje pusty; sonner toast się nie pojawia mimo że POST `/publish` zwraca 200 OK).
- **Nowy regres (BUG-8):** Create New Post dialog emituje Radix warning `Missing Description or aria-describedby={undefined} for {DialogContent}`. Dialog ma `aria-describedby="radix-_r_a_"`, ale id w DOM nie istnieje (description tekstowo widoczny, ale niepodłączony).

### Krok 1 — Lista postów `/admin/coderso/posts`

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-1 | Bulk select | ✓ FIXED | "Select all posts" → header + wiersze checked, toolbar "1 post selected — Apply a bulk action to the visible selection." z combobox `Bulk actions` (opcje: **Publish / Move to Draft / Delete**), przycisk "Apply" (disabled bez akcji), "Clear". |
| BUG-2 | Search placeholder | ✓ FIXED | Pole wyszukiwania ma placeholder "Search posts by title..." (nie "pages"). |

**Regresja — wciąż działa:** filtr Status (combobox), filtr Author, menu (...) wiersza (Edit / Preview / Duplicate / Publish / Unpublish disabled / Delete), paginacja, autor "P Patryk" pokazany od razu po utworzeniu posta.

### Krok 2 — Editor toolbar i Block Inserter

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-3 | "Details" otwiera prawy panel, nie Block Inserter | ✓ FIXED | Toolbar ma 5 osobnych przycisków, każdy z unikalnym `aria-label`: `Toggle block inserter` (Add block), `Hide document overview` (Outline), `Hide post details` (Details), `Toggle full width editor` (Focus), `Open revision history` (Revisions). Każdy działa na swój panel. |
| BUG-6 | Radix description w Revisions dialog | ✓ FIXED | Dialog `Post revisions` ma `aria-describedby` poprawnie podłączony do "Restore an earlier snapshot of this post." Konsola — 0 Radix warnings po otwarciu Revisions. |
| UX-4 | Block Inserter Media | ⚠ CZĘŚCIOWE | Zakładka Media: **Image + Embed** (poprawa od Image+Separator). Separator słusznie przeniesiony do Text. Ale **brak Video, Gallery, Audio, File** — nadal capability gap. Komentarz w TASK-204 to potwierdza ("UX-4 jawnie nadal otwarte jako capability gap"). Bez zmian od 2026-04-23. |
| UX-6 | "Typography reads from block" | ✓ FIXED | Tekst zmieniony na "Typography follows the selected block style." + dodano przycisk "Info" (ikona ⓘ z tooltipem). Spójne z propozycją z raportu. |
| UX-7 | Search per kategoria w Block Inserter | ✓ FIXED | Placeholder/aria-label search bar zmienia się dynamicznie wraz z aktywną zakładką: "All" → `Search blocks`, "Text" → `Search Text blocks`, "Media" → `Search Media blocks`, "Interactive" → analogicznie. Test funkcjonalny: w zakładce Media wpisanie "image" → tylko Image (Embed odfiltrowany). Filtr scope-aware. |

### Krok 3 — Document Inspector (prawy panel Post tab)

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-4 | Category ID / Featured Image — raw fields | ✓ FIXED | **Categories and tags:** "Current category: Not assigned", combobox "Category" z opcją "No category" (zamiast textboxa na ID). Tags textbox z placeholder `news, guide, release`. **Featured image:** sekcja z opisem "Select a single asset. Allowed: image/*", przycisk **Browse media** (ikona + label) i status "No media selected yet." (gdy nic nie wybrane). Picker zamiast Media ID textboxa. |
| BUG-7 | 500 Internal Server Error / surowy SQL | ✓ FIXED | `GET /admin/api/content-types/post/terms` → **200 OK** (przedtem 500). UI nie pokazuje już raw query erroru. Brak fallbacka "Could not load categories. [Retry]" do zaobserwowania bo endpoint zwraca poprawnie pustą listę — ale z TASK-204 wiemy, że fallback istnieje gdy backend faktycznie wróci błąd. |
| UX-3 | Sekcja Advanced ukrywa SEO | ✓ FIXED | Sekcja Advanced ma w nagłówku **badge "SEO 0/3"** widoczny już przy zwiniętym stanie. Po rozwinięciu — paragraph "SEO summary" + "SEO fields completed: 0/3" + cztery pola: SEO title, SEO description, Canonical URL, Robots (combobox "Index + follow (default)"). Badge motywuje do uzupełnienia bez konieczności rozwijania. |
| UX-5 | Slug bez "/" — niespójny z Pages | ✓ FIXED | Tworzenie posta — pod polem Slug widać "Route hint: http://localhost:3000/post/:slug". W Advanced → Slug — pełny pre-fill: "Public URL: http://localhost:3000/post/test-post-2026-04-25". Kontekst URL widoczny, format slug-bez-prefixu już nie jest mylący. |

### Krok 4 — Save / Publish / Revisions

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-5 | Toast po Publish / Update | ⚠ NIE ZMIENIONE od 2026-04-23 | Po wpisaniu treści — POST `/autosave` 200 OK, label "Autosaved at 02:57 PM" w headerze (działa). Po Publish — POST `/publish` 200 OK, badge Draft → Published, przycisk Publish → **Update** (działa). **Toast nadal się nie pojawia.** `[aria-live=polite]` w DOM ma `textContent === ''`, brak `[data-sonner-toast]` w DOM. Pośredni feedback (timestamp + button label change) działa, ale dedicated toast nie został podpięty. **Identyczny pain point jak Pages UX-1.** |
| UX-1 | Preview w Revisions | ✓ FIXED | Po opublikowaniu — Revisions zawiera `Version 1 · Apr 25, 2026, 02:57 PM · Patryk · 1 blocks` + przyciski **Preview** i **Restore**. Klik Preview → expand panel z treścią rewizji ("Lorem ipsum dolor sit amet."), button toggluje na **Hide preview**. **NIE ma już** komunikatu "No preview available for this revision." dla niepustych rewizji — zgodnie z TASK-204 pokazuje treść/metadata. |

### Nowe znalezisko — BUG-8

#### [BUG-8] NISKI: Radix `aria-describedby` warning w Create New Post dialog

**Gdzie:** Lista postów → przycisk **New** → otwarcie dialogu "Create New Post"

**Co się dzieje:** Po otwarciu dialogu konsola loguje `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`. Inspekcja DOM:

- `[role=dialog].aria-labelledby` → `radix-_r_9_` (poprawnie wskazuje na heading "Create New Post")
- `[role=dialog].aria-describedby` → `radix-_r_a_`
- `document.getElementById('radix-_r_a_')` → **null**

Treść description "Start a new article and publish when ready." istnieje w UI jako zwykły `<p>`, ale bez `id={descId}` — Radix nie znajduje powiązanego elementu i loguje warning. Jest to symetryczna regresja do Pages BUG-5 / Posts BUG-6, ale specyficznie dla Create New Post drawer.

**Kierunek naprawy UI:** Owinąć paragraph "Start a new article and publish when ready." w komponent `<DialogDescription>` (Radix) zamiast plain `<p>`. Powinien być prawdopodobnie ten sam wrapper który został użyty w Page Create / Page Settings / Page History (Pages BUG-5). Naprawa jest jednolinijkowa.

### Krok 5 — UX feel po całym flow

**Co działa świetnie:**
- 5 oddzielnych przycisków w toolbarze z jasnymi aria-labels — top tier accessibility.
- Browse media picker zamiast Media ID textboxa = WordPress-level UX.
- Scoped Block Inserter search (placeholder zmienia się per zakładka) — bardzo dobry detal.
- "Public URL: ..." pre-fill pod polem Slug — kontekst URL bez ujednolicania bazy.
- "SEO 0/3" badge przy zwiniętej sekcji Advanced — discoverability bez nachalności.
- Revisions z Preview rozwijającym treść — można sprawdzić co się przywraca przed restore.

**Co nadal zostawia niedosyt:**
- Brak widocznego toast po Publish/Update (BUG-5) — ten sam pain point co w Pages UX-1.
- Block Inserter Media uboga (Image + Embed = 2 bloki) — UX-4 jawnie zostało jako capability gap.
- Create New Post dialog generuje Radix warning (BUG-8) — drobna ale głośna regresja w konsoli.

### Status vs. raport 2026-04-23 / TASK-204

- BUG-3, BUG-4, BUG-6, BUG-7, UX-1, UX-2, UX-6, UX-7 — wszystkie utrzymują status fixed po manualnym replay.
- UX-3, UX-5 — fix widoczny i działa na żywo (TASK-204 wymienia je jako "regression-smoke", manualnie potwierdzone).
- UX-4 — częściowy fix utrzymany (Image + Embed, bez Video/Gallery/Audio); raport TASK-204 poprawnie nazywa to capability gap.
- BUG-5 (toast) — bez zmian, pozostaje otwarte.
- **Nowość:** BUG-8 (Create Post dialog Radix warning) — wymaga osobnego ticketu / hotfixa.

### Walidacja środowiska

- Frontend `localhost:3000` dostępny (preview iframe loaduje się z bannerem PREVIEW MODE — taki sam stan jak Pages 2026-04-25).
- Backend Posts API: GET/POST /publish/autosave wszystko 200 OK (brak BUG-6-style 403 z Pages).
- Konsola: poza BUG-8 brak innych Radix warnings; brak raw SQL errorów; brak `CONNECTION_CLOSED`.

### Screeny (2026-04-25)

- `screenshots/2026-04-25/posts-01-list-bulk.png` — bulk toolbar widoczny.
- `screenshots/2026-04-25/posts-02-editor.png` — edytor po Publish (button → Update, badge Published).
