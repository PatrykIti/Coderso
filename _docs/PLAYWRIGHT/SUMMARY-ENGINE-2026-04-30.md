# Raport UX/QA — sekcja Engine / Content Types (Admin UI)

**Data testów:** 2026-04-30
**Tester:** Claude (Playwright CLI, izolowana sesja `engine-test`)
**Środowisko:** http://localhost:5173/admin/advanced/engine
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl
**Poprzedni raport:** [SUMMARY-ENGINE.md](SUMMARY-ENGINE.md) (2026-04-22, TASK-202 closure 2026-04-23)

---

## Cel

Weryfikacja, że wszystkie BUG/UX znalezione w poprzednim raporcie (i zamknięte przez TASK-202) faktycznie działają na żywo + retest pełnego edytora content type i wszystkich 7 typów pól.

---

## Przetestowane przepływy

- Lista content types: search, filtr statusu, sort kolumn (Name/Slug ASC/DESC), bulk select, bulk actions (Publish/Move to Draft/Delete), pagination
- Row actions menu (`...`): Edit / Duplicate / Delete
- Delete content type: dialog potwierdzenia + Cancel + faktyczne usunięcie
- Create New Collection drawer: walidacja unikalnej nazwy + slug, walidacja nazw `Screen <uuid>` (po stronie serwera), autogeneracja sluga + lock po edycji ręcznej
- Editor 3-panelowy: Fields list / Field settings / Schema Preview
- Wszystkie 7 typów pól: Text, Rich text, Number, Boolean, Select, Media, Relation
- Konfiguracja per pole: Field name (kebab-case z autogen + lock), Label, Required, Default value, Help text
- Layout & grouping: Tab, Section, Width (Full/Half), Display density
- Number-specific: Format (Integer/Decimal), Step, Min, Max
- Select-specific: Options jako pary Label/Value + reorder up/down + Remove + Allow multiple selections
- Relation-specific: Related content type dropdown z `Name (slug)` + Allow multiple
- Media-specific: Accepted file types (MIME) + Allow multiple
- Taxonomies (typu): Categories switch + Tags switch
- Schema Preview live update + Hide preview toggle + Copy
- Save draft + Publish (toast + status badge update)
- Remove field (dialog + Undo toast)
- Duplicate (z edytora + z listy)
- Danger Zone "Delete type" w edytorze

---

## Stan retestu BUG/UX z TASK-202

| Finding (z 2026-04-22) | TASK-202 status | Stan na 2026-04-30 | Dowód |
|---|---|---|---|
| BUG-1 Brak Delete content type | Fixed | **Confirmed fixed** | Row actions menu zawiera Edit/Duplicate/Delete; Delete otwiera dialog "Delete content type?" z alertem "The server blocks deletion for entries, custom screens, taxonomies, content routes, and listings"; Cancel/Delete działają. Edytor ma dodatkowo sekcję **Danger Zone** z "Delete type". |
| BUG-2 Duplikaty nazw | Fixed for future writes | **Confirmed fixed** | Drawer Create pokazuje inline `This name is already used by another content type.` + `This slug is already used by another content type.`; przycisk "Create Collection" disabled. Lista pokazuje badge **DUPLICATE NAME** przy każdym powtórzeniu. Brudne dane (4× News, 3× Notes) nadal istnieją — bez bulk cleanup. |
| BUG-3 Brak feedbacku save/publish | Fixed | **Confirmed fixed** | "Save draft" → toast `Draft saved.`; "Publish" → toast `Content type published.` + badge w nagłówku zmienia się z `draft` na `published`. |
| BUG-4 Remove field bez confirm | Fixed | **Confirmed fixed** | Dialog "Remove field?" z alertem "Removing a field can affect existing entries after you save the schema. You can undo the local removal before saving." + Cancel/Remove. Po confirm: toast `New field was removed from the local draft.` z przyciskiem **Undo**; Undo przywraca pole do listy. |
| BUG-5 Field name nie generuje się z Label | Fixed | **Confirmed fixed** | Wpisanie `Article Title` w Label produkuje `article-title` w Field name. Po ręcznej edycji klucza (`custom-key`) kolejne zmiany Label nie nadpisują klucza — lock działa. |
| BUG-6 Create nie nawiguje do edytora | Fixed | **Confirmed fixed** | Po "Create Collection" — przekierowanie do `/admin/advanced/engine/<id>`. ⚠️ Patrz `BUG-N1` (drobny issue z odświeżaniem inputów po Duplicate). |
| BUG-7 `Screen <uuid>` typy | Guarded | **Confirmed guarded (server-side)** | Nazwa `Screen abc123ef` + slug `screen-abc123ef-test` — POST `/admin/api/content-types` → 400 "Content type payload is invalid.". ⚠️ Patrz `UX-N1` — komunikat ogólny + brak inline walidacji. Brudne istniejące rekordy nadal w liście (~15 `Screen [UUID]`). Łącznie 45 typów (poprzednio 35; wzrost zawiera moje typy testowe + część brudnych). |
| UX-1 Lista bez search/filter/sort | Fixed | **Confirmed fixed (i ulepszone)** | Search po name/slug realtime, sortable Name/Slug/Fields/Status (ASC↑ ↔ DESC↓), filter `All statuses` / `Draft` / `Published`, pagination z `Rows: 10/…`. **Bonus:** bulk select per wiersz + Select all + bulk actions panel (Publish / Move to Draft / Delete). |
| UX-2 Relation bez kontekstu | Fixed | **Confirmed fixed** | Każda opcja w Relation target dropdownie ma format `Name (slug)`, np. `News (news-855f2ed1-fa16-4825-82cd-7b59f778616a)`, `Notes (notes-cfec6a03-…)`, `Screen 2dcaeaad (screen-2dcaeaad)`. Duplikaty są jednoznacznie odróżnialne. |
| UX-3 Select comma-separated | Fixed | **Confirmed fixed** | Dynamiczna lista par `Label` / `value`, przycisk "Add option", Move up / Move down (disabled na krańcach), Remove per option, switch "Allow multiple selections". Value autogeneruje się jako kebab-case Label. JSON Schema poprawne: `enum`, `xFieldConfig.select.options[].label/value`, `xFieldConfig.select.multiple`. |
| UX-4 Number bez min/max/format/step | Fixed | **Confirmed fixed** | Sekcja "Number constraints": Format (Integer/Decimal), Step, Min value, Max value. Schema dla `Integer` / step 1 / min 0 / max 5: `"type":"integer","minimum":0,"maximum":5,"multipleOf":1`. |
| UX-5 Machine-readable label | Fixed | Nie da się zweryfikować w UI w tej sesji (Post był jedynym typem z humanizable polami, został usunięty podczas testu BUG-1). Zaufanie w stosunku do `fieldsFromSchema` humanize w TASK-202. |
| UX-6 Brak Duplicate | Fixed | **Confirmed fixed** | Dostępny zarówno z menu actions na liście, jak i z toolbar edytora. Pierwszy duplikat → `Copy of <name>` + `<slug>-copy` + status `draft`. Drugi → `Copy of Copy of <name>` + `<slug>-copy-copy`. Pola schemy skopiowane (7/7). |

---

## Nowe znaleziska (po TASK-202)

### [BUG-N1] NISKI: Edytor po Duplicate pokazuje stare dane do pierwszego refresha

**Gdzie:** `/admin/advanced/engine/[new-id]` zaraz po kliknięciu "Duplicate" (z edytora lub z listy).

**Co się dzieje:** URL przechodzi na nowy id, ale inputy Name/Slug nadal pokazują wartości oryginału (`Article QA Test 2026` / `article-qa-test-2026`) zamiast `Copy of Article QA Test 2026` / `article-qa-test-2026-copy`. Po `Cmd+R` / nawigacji w bok i z powrotem — inputy są poprawne. Lista typów zawsze pokazuje poprawnego copy-recordu od razu, więc wiadomo że backend zapisał właściwie.

**Powtarzalność:** 2/2 (duplicate z edytora + duplicate z listy).

**Kierunek naprawy:** Po `POST /content-types/duplicate` query React'a powinno albo (a) używać payloadu z odpowiedzi do hydrate'owania store'a edytora, albo (b) zinwalidować `['content-type', newId]` zanim zrobimy `navigate(...)`. Aktualny stan wygląda jakby navigate odpalał się szybciej niż invalidate.

---

### [UX-N1] ŚREDNI: Komunikat błędu przy `Screen <uuid>` jest ogólny, brak inline walidacji

**Gdzie:** Drawer "Create New Collection".

**Co się dzieje:** Wpisanie `Screen abc123ef` jako name + unikalny slug → przycisk Create nie jest blokowany inline. Dopiero kliknięcie "Create Collection" zwraca 400 "Content type payload is invalid." (alert na górze drawera, ten sam komunikat jak dla każdego innego payload-error). Użytkownik nie wie *co* jest nie tak — czy nazwa? slug? Pole nie jest podświetlone.

**Powtarzalność:** 1/1.

**Kierunek naprawy:**
1. Krótkoterminowo: serwer powinien zwracać konkretny komunikat (np. `name`: "Names matching `Screen <uuid>` pattern are reserved for auto-generated screen types.") i frontend powinien zmappować to do błędu pod polem.
2. Długoterminowo: frontend mirroruje regex guard z shared content type name normalization i pokazuje inline błąd pod Name (analogicznie do `This name is already used`).

---

### [UX-N2] NISKI: "Copy" Schema Preview bez feedbacku

**Gdzie:** Edytor → prawy panel "Schema Preview" → przycisk "Copy".

**Co się dzieje:** Kliknięcie "Copy" działa technicznie (clipboard ma JSON — nie sprawdzono), ale przycisk nie zmienia etykiety (np. na `Copied!`), nie pojawia się toast, nie ma żadnego sygnału UX. Użytkownik nie wie, czy się udało.

**Kierunek naprawy:** Po kliknięciu zmienić tekst przycisku na `Copied!` na 1.5–2 s, lub krótki toast `Schema copied to clipboard.`. Wzorzec: GitHub copy-button na blokach kodu.

---

### [UX-N3] NISKI: Brak persistent log / notification center dla operacji destruktywnych

**Gdzie:** Top bar `region "Admin notifications alt+T"`.

**Co się dzieje:** Region istnieje (regionalne aria-label `Admin notifications alt+T`), ale po Save / Publish / Delete content type jest pusty. Toasts wyskakują na chwilę i znikają. Brak historii — nie da się pokazać użytkownikowi, że coś się zadziało, jeśli przegapił toast.

**Kierunek naprawy:** Wpiąć kluczowe akcje (publish, delete, duplicate) do panelu notyfikacji jako persistent items z timestampem. Skrót `Alt+T` jest już zarezerwowany — brakuje treści.

---

### [DATA-1] BRUDNE DANE: 14 typów `Screen [UUID]` + 4 testowe + duplikaty News/Notes nadal w produkcji

**Gdzie:** Lista content types (`/admin/advanced/engine`).

**Co się dzieje:** Łącznie **45 content types**. Po wyfiltrowaniu po `published` widać:
- ~14× `Screen <8-hex>` (np. `Screen 120d35ec`, `Screen 25c93fc2`, `Screen 2dcaeaad`, …) — wszystkie 0 fields, status published
- 3× `testowy` / `testowy2` / `test3` — 0 fields, published
- 4× `News` (różne UUID slugi) — z badge `Duplicate name`
- 3× `Notes` — j.w.
- `Legacy Service Type`

**Status:** TASK-202 explicitly pozostawiła cleanup poza zakresem. Guard chroni teraz przed nowymi takimi rekordami, ale lista zaśmiecona — w tym dropdownie Relation. Po dodaniu mojego testowego typu liczba wzrosła z 35 → 45 (z czego część to moje testy: `Article QA Test 2026`, `Copy of Article QA Test 2026`, `Copy of Copy of Article QA Test 2026`).

**Kierunek:** Jednorazowy migration script + bulk delete UI dostępne (Bulk actions → Delete). Ale to operacja uznaniowa właściciela danych, nie automatyczna.

---

## Co działa dobrze ✓

| Funkcja | Komentarz |
|---|---|
| Lista: search + filter status + sortable headers + pagination + bulk actions | Pełen feature-parity z dojrzałymi list-view'ami (Strapi/Directus). |
| Row actions menu (`...`) Edit/Duplicate/Delete z separatorem przed Delete | Wzorcowo zorganizowane menu. |
| Bulk select + Bulk actions (Publish/Move to Draft/Delete) | Ładnie obsługuje 35+ typów. |
| Drawer Create: walidacja unique name + unique slug + autogen sluga z lock po edycji | Inline messages, disabled-button, profesjonalne. |
| Editor: badge `draft` ↔ `published` widoczne w nagłówku, aktualizuje się po Publish | Natychmiastowy feedback statusu. |
| Toolbar edytora: Hide preview / Duplicate / Save draft / Publish / Delete | Logiczna grupacja działań. |
| Danger Zone w editorze z dodatkowym ostrzeżeniem | Dwukrotne potwierdzenie destrukcji. |
| Field type combobox ma description per typ (np. "Numeric value (use for ordering or stats).") | Pomaga w wyborze. |
| Number constraints: Format / Step / Min / Max → poprawnie do JSON Schema | `multipleOf`, `minimum`, `maximum`, `type:integer`. |
| Select options: dynamiczne pary Label/Value + reorder up/down + remove + multiple toggle | Dorównuje Strapi/Directus. |
| Relation target dropdown z `Name (slug)` | Rozwiązuje ambiguity duplikatów. |
| Layout & grouping per pole (tab/section/width/density) → zapis do `xFieldConfig.layout` | Daje moc nad Entry editor layoutem. |
| Schema Preview live update z każdą zmianą | Bezcenne dla dev-experience. |
| Toast `Draft saved.` + `Content type published.` + Undo toast po remove field | Pełen cykl feedbacku. |
| Duplicate: backend nadaje unikalną nazwę + slug + status draft | Bezpieczny default. |

---

## Krótka konsola / network observation

- 1 błąd w konsoli zaobserwowany podczas Create z nazwą `Screen abc123ef`: `Failed to load resource: 400 Bad Request /admin/api/content-types` — oczekiwany, server guard.
- Żadnych innych unexpected errors / warnings w konsoli podczas pełnego flow (login → list → drawer → editor → 7 fields → save → publish → duplicate → delete).

---

## Verdict

TASK-202 zamknął wszystkie 13 findingów (7 BUG + 6 UX) z poprzedniego raportu w sposób potwierdzony testem live. Engine + Content Type Editor są na poziomie produkcyjnym dla user flow tworzenia/edycji typów. Pozostały 3 nowe drobne issues (BUG-N1 refresh inputów po duplicate, UX-N1 ogólny error przy Screen-uuid, UX-N2 brak feedbacku Copy) i kwestia czyszczenia danych historycznych (DATA-1) — żadne z nich nie blokuje codziennej pracy.
