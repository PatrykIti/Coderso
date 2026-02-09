# Widgets Spec (v1)

Specyfikacja bazowych widgetow core i modelu konfiguracji, ktory musi byc
stosowany rowniez przez widgety z pluginow i addonow.

## Cele

- Latwy start dla nietechnicznych uzytkownikow.
- Spolny UX konfiguracji dla wszystkich widgetow.
- Wersja v1 core pozwala zbudowac pelnoprawna strone.

---

## Design Philosophy (Idioto-odpornosc + Power User)

System widgetow zostal zaprojektowany, aby rozwiazac odwieczny konflikt miedzy "latwym" a "elastycznym".

1. **Wizard-First**: Uzytkownik nietechniczny NIE moze zepsuc layoutu. Odpowiada tylko na proste pytania (np. "Gdzie ma byc zdjecie?").
2. **Visual Feedback**: Decyzje podejmowane sa na podstawie tego co widac, a nie abstrakcyjnych nazw ustawien.
3. **Progressive Disclosure**: Opcje zaawansowane (marginesy, paddingi) sa ukryte, dopoki uzytkownik swiadomie ich nie zazada. To chroni UI przed "rozjechaniem" przez przypadkowe klikniecia.
4. **Consistency**: Wymuszamy ten sam model konfiguracji na pluginach, aby uzytkownik nie musial uczyc sie obslugi kazdego widgetu od nowa.

---

## Lista widgetow w core v1

Wymagane:
- Section (layout wrapper z repeatable regions)
- Grid/Columns (layout primitive z responsywnym podzialem kolumn)
- Stack (flow layout primitive dla sekwencyjnych grup widgetow)
- Split Layout (dwu-kolumnowy layout z kontrola proporcji i collapse mobile)
- Spacer (kontrolowany pionowy rytm i odstepy miedzy sekcjami)
- Hero section
- Timeline (bez dat; etapy/proces w formie osi)
- Compare timeline (porownanie dwoch procesow na jednej osi)
- Newsletter signup
- Kontakt (formularz + dane kontaktowe)
- FAQ Accordion (pytania i odpowiedzi)
- CTA Banner (kompaktowy pasek konwersyjny)
- Logo Cloud (sekcja wiarygodnosci z logotypami)
- Gallery Mosaic (wizualna sekcja mediow)
- Stats KPI (sekcja metryk i proof points)
- Team (profile zespolu z rolami i social links)
- Rich Text Section (dluzszy blok tresci z bezpiecznym HTML)
- Content List (dynamiczna lista wpisow z Content Types)
- Entry Teaser (dynamiczny teaser pojedynczego wpisu)
- Menu/Nawigacja
- Stopka (linki, dane, social)

---

## Model konfiguracji (obowiazkowy)

Kazdy widget musi wspierac 3 tryby konfiguracji:

1) Wizard (kreator)
- Pytania prowadza uzytkownika do wyboru wariantu (auto).
- Minimalna liczba pol.
- Na koncu zapis do wspolnego modelu danych widgetu.

2) Visual (warianty + podglad)
- Uzytkownik wybiera wariant na podstawie podgladu.
- To jest glowny tryb codziennej edycji:
  - content i CTA
  - media
  - typography
  - colors/borders/background
- Widget moze przejac kontrole nad selektorem wariantu (bez generycznego duplikatu)
  przez `editorCapabilities.visualOwnsVariantSelection = true`.
- Core widgets `hero`, `navigation`, `footer` i `timeline` uzywaja tego podejscia i renderuja
  sekcyjny Visual IA zamiast generycznej listy wariantow.

3) Advanced
- Tryb ekspercki/techniczny:
  - spacing, marginesy, alignment, layout, responsywnosc
  - surowe pola techniczne
  - bez duplikowania podstawowych pol content/style z Visual.
- Tryb zaawansowany dostepny zawsze po wstepnej konfiguracji.

Zasady:
- Kazdy tryb mapuje do tego samego modelu danych.
- Uzytkownik moze w kazdej chwili przelaczyc sie na Advanced.
- Przejscie do Advanced nie resetuje danych.

---

## Dokumentacja widgetow

Szczegoly dla kazdego widgetu znajduja sie w `_docs/_WIDGETS/`:

- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/_WIDGETS/TEAM.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`

---

## Kontrakty widgetu (v1)

Kazdy widget powinien zdefiniowac:
- `variants`: lista wariantow (np. hero: centered, split, media-left).
- `schema`: JSON schema danych widgetu.
- `defaults`: bezpieczne domyslne wartosci.
- `fields`: pola widoczne w Wizard/Visual/Advanced.

---

## Model danych bloku (Page Builder)

Kazdy widget zapisany jest jako blok w `page.data.blocks`:

```ts
type WidgetBlock = {
  id: string;
  type: string;    // registry key
  variant: string; // wariant widgetu
  data: Record<string, unknown>;
  layout?: {
    container?: "default" | "narrow" | "full" | "inherit";
    padding?: { top?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit"; bottom?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit" };
    margin?: { top?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit"; bottom?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "inherit" };
    background?: { color?: string; image?: string | null };
  };
  visibility?: {
    enabled?: boolean;
    devices?: ("desktop" | "tablet" | "mobile")[];
  };
  editor?: {
    mode?: "wizard" | "visual" | "advanced";
  };
  slots?: Record<string, WidgetBlock[]>; // fixed ids and repeatable instance ids (e.g. "column:1")
  children?: WidgetBlock[]; // legacy
};
```

Uwaga: pole `editor` jest usuwane przy publikacji (`pageService.toPublishedData`).
`children` jest legacy — mapujemy je do `slots.default`, jesli `slots` nie wystepuje.

---

## Kontrakt definicji widgetu

Minimalna struktura definicji:

```ts
type WidgetDefinition<T = Record<string, unknown>> = {
  type: string;
  title: string;
  description?: string;
  category: "layout" | "content" | "forms" | "navigation" | "media";
  canHaveChildren?: boolean;
  slots?: {
    id: string;
    label: string;
    kind?: "fixed" | "repeatable";
    minItems?: number; // repeatable only
    maxItems?: number; // fixed: max children in slot, repeatable: max instances
    allowedTypes?: string[];
  }[];
  variants: { id: string; label: string; description?: string }[];
  schema: Record<string, unknown>; // JSON schema (draft-07)
  defaults: T;
  editor: {
    wizard: React.ComponentType<WidgetEditorProps<T>>;
    visual: React.ComponentType<WidgetEditorProps<T>>;
    advanced: React.ComponentType<WidgetEditorProps<T>>;
  };
  editorCapabilities?: {
    visualOwnsVariantSelection?: boolean;
  };
  render: React.ComponentType<{
    data: T;
    variant: string;
    slots?: Record<string, WidgetBlock[]>;
  }>;
};
```

### Slot kinds (fixed vs repeatable)

- `fixed` (default): stable slot id (`content`, `right`, `bottom`).
- `repeatable`: dynamic slot instances with deterministic keys in `slots` map:
  - format: `<slotId>:<instanceId>` (example: `column:1`, `column:2`)
  - `minItems` i `maxItems` kontroluja liczbe instancji.

Normalization rules:
- Legacy key `slots.<slotId>` dla repeatable jest migrowany do pierwszej instancji.
- Przy brakujacych instancjach dodawane sa automatycznie instancje do `minItems`.
- Nadmiarowe instancje ponad `maxItems` sa odcinane deterministycznie.

### WidgetEditorProps

```ts
type WidgetEditorProps<T> = {
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
};
```

---

## Registry API (core/widgets/registry.ts)

- `registerWidget(def)` – rejestruje widget
- `getWidget(type)` – zwraca definicje
- `listWidgets()` – lista wszystkich
- `clearWidgets()` – tylko dla testow

Naming rules:
- Core: `hero`, `timeline`, `compare-timeline`, `newsletter`, `contact`, `navigation`, `footer`
- Pluginy: `<plugin>.<widget>` (np. `seo-boost.hero`)

---

## Walidacja i defaults

Flow:
1) Pobierz definicje z registry
2) Sprawdz `variant`
3) `data = { ...defaults, ...data }`
4) Waliduj przez AJV (JSON schema)

---

## Render pipeline

- `WidgetRenderer` wybiera definicje po `type`.
- Brak widgetu → `MissingWidget`.
- Stosuje `layout` + `visibility`.
- Dla tokenow `inherit` renderer bierze wartosci z `page.settings.layout.sections.defaults`.
- Renderuje komponent `def.render`.
- Jesli widget **nie** definiuje `slots`, renderer wyswietla legacy `children`
  (lub `slots.default`) wewnatrz kontenera sekcji.
- Jesli widget ma `slots`, to on odpowiada za renderowanie tych blokow
  w odpowiednich miejscach UI.
- Przykład: `hero` renderuje `slots.content` pod sekcją CTA.
- Przykład: `navigation` renderuje `slots.right` w prawym obszarze akcji paska.
- Przykład: `footer` renderuje `slots.column-1/2/3` w kolumnach i `slots.bottom`
  w dolnym pasku legal/actions.

## Inheritance and page defaults

- `page.settings.layout.sections.defaults` definiuje fallback dla blokow z
  `layout.container/padding/margin = "inherit"`.
- `page.settings.layout.applyDefaultsToNewBlocks = true` powoduje, ze nowo
  dodane bloki w edytorze strony dostaja domyslne layout tokens z page settings.
- Runtime preview i published output korzystaja z tych samych zasad dziedziczenia.

---

## UI Wiring (Page Builder)

- Widget library czyta `listWidgets()` i pokazuje liste.
- Dodanie widgetu tworzy blok z `defaults`.
- Panel Wizard/Visual/Advanced renderuje `definition.editor.*`.
- Zmiana wariantu aktualizuje `block.variant`.

---

## Widget Catalog API

Admin UI pobiera katalog widgetow z API:

- `GET /widgets` zwraca liste core widgetow + templatek (source: `core` / `template`).
- Templateki sa zarzadzane przez `GET/POST/PATCH/DELETE /widgets/templates`
  (alias: `/widget-templates`).

Katalog zawiera podstawowe metadata:
`id`, `name`, `description`, `category`, `variants`, `status`.

---

## Widget Library (Preview konfiguracji)

- Drawer szczegolow widgetu pokazuje ten sam zestaw paneli (Wizard/Visual/Advanced),
  ktory jest uzywany po wstawieniu widgetu.
- Zmiany wykonane w podgladzie NIE zapisuja sie automatycznie — zapis nastepuje

### Favorites

- Ulubione widgety sa zapisywane per uzytkownik w `user_settings` pod kluczem
  `widgets.favorites`.
- Limit: max 50 pozycji.
- Hero variant presets sa zapisywane per uzytkownik w `user_settings` pod kluczem
  `widgets.hero.presets` (limit: 24).
  dopiero po wstawieniu widgetu do strony lub template.

---

## Template Preview (Admin)

- Podglad template renderuje bloki przez runtime `WidgetRenderer` (server-side).
- Podglad jest read-only i pokazuje ostatnia zapisana wersje template.
- Wynik zwracany jako HTML do iframe w edytorze template.

---

## Template Revisions (Admin)

- Kazdy zapis template tworzy rewizje (metadata + bloki).
- Restore przywraca wybrana rewizje i zapisuje nowy snapshot po przywroceniu.
- Rewizje pokazuja autora, status i liczbe blokow.

---

## Template Categories (Admin)

- Kategorie template sa zarzadzane przez ustawienia `widgets.templateCategories`.
- Template zapisuje nazwe kategorii (match case-insensitive na UI).
- Biblioteka templates filtruje po nazwie kategorii.

---

## Authoring Guide (plugin widgets)

- Definiuj wlasne `schema` i `defaults`.
- Trzymaj dane kompatybilne z JSON schema.
- Uzywaj design tokens zamiast hardcode kolorow.
- Stosuj Wizard/Visual/Advanced zgodnie ze standardem core.

---

## UX i spojnosc

- Nazewnictwo i uklad pol spojne w kazdym widgetcie.
- Minimalna liczba pol w Wizard.
- Visual pokazuje realny preview (miniatury lub skeletony).
- Advanced zapewnia kontrole nad spacing i typografia.
- Widgety powinny uzywac design tokens (`DESIGN_TOKENS.md`).
