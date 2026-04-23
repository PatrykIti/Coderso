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
- Gdy autosave nie powiedzie sie, editor pokazuje `Autosave paused` z akcja
  `Retry now`; route boundary zwraca bounded `post_autosave_failed` copy, a
  draft pozostaje dirty do skutecznego zapisu.
- Revisions drawer ma opis a11y i bounded read-only preview przed restore; dla
  pustych/krotkich rewizji pokazuje metadata snapshotu zamiast negatywnego
  empty state.

## Post inspector

- Kategorie sa wybierane z listy kategorii, bez wpisywania surowego term ID.
  Jesli taxonomy overview nie zaladuje sie, inspector pokazuje friendly error i
  retry zamiast surowego SQL/query output.
- Featured image reuse’uje `MediaPicker` i ogranicza wybor do `image/*`.
- Sekcja `Advanced` pokazuje badge `SEO {done}/3` nawet w stanie zwinietym.
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
