# Content Editor UX (v1)

Opisuje pomoc i mikro‑teksty w edytorze wpisow (Entry Editor) oraz w edytorze Content Types.

## Cele

- Wyjasnic znaczenie typow pol.
- Ulatwic modelowanie tresci bez dokumentacji zewnetrznej.
- Dac szybkie przypomnienie jak dzialaja relacje, media, tagi.

## Content Type Editor – helpery

W edytorze typu tresci, przy polu **Field type**:
- tooltip opisuje, do czego sluzy dany typ pola,
- krotki helper tekst pod selektem podpowiada zastosowanie.

Przyklad:
- **Relation**: „Relations connect entries together (e.g. Testimonials → Projects).”
- **Media**: „Media fields link entries to images/files from the Media Library.”

TASK-202 dopina lifecycle i authoring UX dla Engine:
- lista content types ma search, sort i filtr statusu,
- duplicate-name badge oraz relation dropdown z nazwa + slug rozrozniaja typy,
- nowy typ po utworzeniu przechodzi do edytora i pokazuje toast,
- Duplicate tworzy draft schema-only bez entries,
- Delete type jest dostepne z listy i edytora, ale wymaga potwierdzenia oraz
  przechodzi przez server-side dependency guard,
- Remove field wymaga potwierdzenia i ma lokalne undo przed zapisem,
- Save draft / Publish pokazuja shared admin toast i status badge.

## Entry Editor – helpery pod polami

Kazde pole w edytorze wpisu ma tekst pomocniczy pod kontrolka.
- Jezeli pole ma `help` w definicji schematu, to pokazujemy to jako podpowiedz.
- W przeciwnym razie wyswietlamy domyslna wskazowke typu pola.

## Publish checklist i brakujace pola

W panelu metadanych (po prawej) pokazujemy **Publish checklist**:
- tytul i slug musza byc wypelnione,
- wszystkie wymagane pola musza byc uzupelnione,
- przy statusie **Scheduled** wymagamy poprawnej daty.

Brakujace wymagane pola sa wyroznione w edytorze wpisu (kolor/obramowanie).
Przycisk Publish blokuje publikacje, dopoki checklist ma krytyczne braki.

## Sidebar “What is this?”

W panelu szczegolow po prawej stronie (Entry Metadata) znajduje sie blok z krotkimi wskazowkami:
- skad pochodza pola,
- jak dziala Media Library,
- jak dzialaja relacje,
- do czego sluza kategorie/tagi.

Blok jest zwijany i pamieta stan w `localStorage`, zeby regularni operatorzy
nie tracili miejsca w bocznym panelu.

## Entries editor

- Engine `richtext` fields render through the shared rich text adapter instead
  of a textarea-only control, while legacy string values keep editable
  compatibility through the serializer.
- Status, schedule, SEO, category, and tag edits mark metadata as dirty and are
  covered by the same leave-page guard as content edits.
- The editor has one primary draft/update action in the top toolbar; metadata
  changes keep their own `Save metadata` action in the sidebar.
- Save draft, update, metadata save, publish, duplicate, and delete flows must
  surface success/failure feedback through the shared admin toast surface.
- The sidebar danger zone owns in-editor delete and uses the app dialog pattern
  before destructive deletion.
- SEO preview uses the active site/content route context. If no trusted public
  base URL is configured, show a neutral placeholder instead of a fake domain.
- When taxonomy is disabled for the active content type, the empty state links
  back to the Engine content type editor where category/tag toggles live.

## Accessibility

Tooltipy posiadaja `aria-label` dla czytnikow ekranu.

## Posts editor

- Toolbar edytora posta rozdziela:
  - `Add block` dla insertera,
  - `Outline` dla przegladu dokumentu,
  - `Details` dla prawego inspectora posta/bloku.
- `Details` ma stan pressed/expanded zgodny z prawym panelem i nie dzieli
  odpowiedzialnosci z inserterem.
- Publish / Update daje jawny success feedback przez shared admin toast z
  dostepnym `Admin notifications` live region.
- Publish / Update success i bounded error copy przechodza przez shared
  `createAdminActionToastAdapter`; editor shell nie wywoluje Sonnera ad hoc i
  nie ukrywa odrzuconych publish/update promises.
- Gdy autosave nie powiedzie sie, editor pokazuje `Autosave paused` z akcja
  `Retry now`; route boundary zwraca bounded `post_autosave_failed` copy, a
  draft pozostaje dirty do skutecznego zapisu.
- Revisions drawer ma opis a11y i bounded read-only preview przed restore; dla
  pustych/krotkich rewizji pokazuje metadata snapshotu zamiast negatywnego
  empty state.
- Revisions drawer korzysta z cache `posts:revisions:<id>`; autosave, publish
  i restore patchuja znana rewizje w cache zamiast wymuszac pelne odswiezenie
  listy po kazdej zmianie.
- Create New Post drawer uzywa `SheetDescription`, wiec widoczny opis
  `Start a new article and publish when ready.` jest powiazany z dialogiem przez
  `aria-describedby`.

## Post inspector

- Kategorie sa wybierane z listy kategorii, bez wpisywania surowego term ID.
  Jesli taxonomy overview nie zaladuje sie, inspector pokazuje friendly error i
  retry zamiast surowego SQL/query output.
- Tags sa zapisywane jako free-text lista w metadata payload. Zmiana kategorii
  nie czysci wpisanych tagow; taxonomy tagIds nadpisuja tagi tylko gdy sa
  jawnie wyslane.
- Featured image reuse’uje `MediaPicker` i ogranicza wybor do `image/*`.
- Sekcja `Advanced` jest domyslnie rozwinieta, bez dodatkowego przycisku
  toggle, i pokazuje badge `SEO {done}/3`.
- Pole `Canonical URL` jest automatycznie wypelniane wyliczonym publicznym URL,
  kiedy `site.publicBaseUrl` i post route z `:slug` sa dostepne; bez tego
  pozostaje jawna wartoscia override, a route hint pokazuje przewidywana sciezke.
- Pole slug pokazuje:
  - concrete public URL tylko gdy istnieje wiarygodny `publicBaseUrl` i route
    oparty o `:slug`,
  - w pozostalych przypadkach neutralny route hint zamiast zmyslonego URL.

## Writing toolbar and inserter

- Typography helper copy nie sugeruje nowego modelu stanu; wyjasnia obecny
  kontrakt toolbaru i rozroznia stan disabled/unavailable.
- Block inserter zawęża search do aktywnej kategorii i zmienia placeholder /
  aria-label na `Search Text blocks...`, `Search Media blocks...` albo
  `Search Interactive blocks...`.
- W inserterze:
  - `Embed` nalezy do kategorii `Media`,
  - `Video`, `Gallery`, `Audio`, i `File` sa widoczne tylko dlatego, ze maja
    pelny kontrakt: defaults, normalizer, canvas, inspector, media picker oraz
    runtime rendering,
  - `Separator` nalezy do kategorii `Text`,
  - search pozostaje ograniczony do aktywnej kategorii.

## Pages builder UX

- Icon-only widget-card actions expose explicit `aria-label` and `title`
  metadata.
- Wizard completion is a transition, not a silent mode switch:
  the next step explains layout/styling refinement before advanced settings.
- Empty slots expose a visible add action and route back into the existing
  widget library surface instead of opening a separate Pages-only inserter.
- The page-builder widget library is grouped by existing widget categories:
  `Layout`, `Content`, `Forms`, `Navigation`, `Media`.
- After a widget is inserted, the canvas scrolls to the new block and applies a
  short-lived visual highlight.

## Custom Screens workspace UX

- The builder header uses one workspace control model:
  `Preview`, `List View`, `Editor View`, and `Save`.
- `Open records`, `Builder`, and the center-canvas `Settings` tab are not part
  of the active Custom Screens workspace flow.
- `List View` is edited from a table-preview canvas with:
  - left rail list element library,
  - center table preview,
  - right inspector for screen settings and the selected column.
- `Preview` in the builder opens a dedicated modal preview:
  - `List View` preview renders the records table live, without mutating the
    active builder route,
  - `Editor View` preview renders the widget-based record surface with current
    bindings and sample content values.
- `Editor View` keeps the widget canvas, but the active palette is restricted to
  `admin-editor-view` widgets and the right inspector owns screen/data/selected
  widget controls.
- `Selected Widget` controls for `screen-record-header` and
  `screen-field-value` are binding-aware in Visual mode:
  they can show `Literal` / `Bound` / `Mixed` status and jump to the matching
  `Data` tab card without moving binding ownership out of the shared binding
  panel.
- The record editor route uses the screen-owned canvas as the active editing
  surface; bound screen widgets can edit the underlying entry inline instead of
  showing a preview card plus a separate classic-editor fallback.
- The record editor details rail exposes `Record` and `Selected Element` tabs so
  clicking a widget on the canvas can focus its bound fields and open
  element-scoped editing in the same screen-owned view.
