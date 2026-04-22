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

## Accessibility

Tooltipy posiadaja `aria-label` dla czytnikow ekranu.

## Posts editor

- Toolbar edytora posta rozdziela:
  - `Add block` dla insertera,
  - `Outline` dla przegladu dokumentu,
  - `Details` dla prawego inspectora posta/bloku.
- `Details` ma stan pressed/expanded zgodny z prawym panelem i nie dzieli
  odpowiedzialnosci z inserterem.
- Publish / Update daje jawny success feedback przez shared admin toast.
- Gdy autosave nie powiedzie sie, editor pokazuje `Autosave paused` z akcja
  `Retry now`; draft pozostaje dirty do skutecznego zapisu.
- Revisions drawer ma bounded read-only preview przed restore.

## Post inspector

- Kategorie sa wybierane z listy kategorii, bez wpisywania surowego term ID.
- Featured image reuse’uje `MediaPicker` i ogranicza wybor do `image/*`.
- Sekcja `Advanced` pokazuje badge `SEO {done}/3` nawet w stanie zwinietym.
- Pole slug pokazuje:
  - concrete public URL tylko gdy istnieje wiarygodny `publicBaseUrl` i route
    oparty o `:slug`,
  - w pozostalych przypadkach neutralny route hint zamiast zmyslonego URL.

## Writing toolbar and inserter

- Typography helper copy nie sugeruje nowego modelu stanu; wyjasnia obecny
  kontrakt toolbaru i rozroznia stan disabled/unavailable.
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
