# RAPORT: Navigation Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> TASK-397 remediation for Navigation completed in workspace on 2026-06-02.
> **Strona admin:** `Audit 31-05 Navigation`
> **Admin page id:** `9163a987-89eb-43ee-a554-6ed5e972de4f`
> **Public route:** `/audit-31-05-navigation`
> **Dodatkowe runtime routes:** `/audit-31-05-navigation-rich`, `/audit-31-05-navigation-modes`, `/audit-31-05-navigation-double`, `/audit-31-05-navigation-empty`, `/audit-31-05-navigation-unsafe`
> **Playwright sessions:** `navigation-fixture-31`, `navigation-public-31`, `navigation-edge-31`, `navigation-wizard-31`, `nav-admin-inspect`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem. Dodatkowy przeglad zrobiono subagentem Codex.

## Metoda

Test byl prowadzony od UI na stronie audytowej z blokiem `navigation`.
Przed public runtime pass utworzono przez admin API kontrolowane strony:

- `/audit-31-05-navigation-rich` - `split`, drawer, submenu, metadata,
  target `_blank`, sticky, collapse-on-scroll i active-link mode,
- `/audit-31-05-navigation-modes` - trzy instancje: expanded, drawer,
  minimal z unsafe image fallback,
- `/audit-31-05-navigation-double` - dwie aktywne instancje drawer na jednej
  stronie,
- `/audit-31-05-navigation-empty` - manual links wyczyszczone do pustej listy,
- `/audit-31-05-navigation-unsafe` - manual links z `javascript:` i
  protocol-relative href.

Admin UI pass objal `Run setup again` dla Wizard, Visual, Advanced, canvas,
variant/source/logo/link/CTA/mobile/style/runtime controls oraz metadata
kontrolek. Public runtime sprawdzono realnym DOM-em: drawer open/close,
submenu open/outside close, active links, rel/target, safe logo fallback,
duplicate widget binding, empty-links i unsafe-links edge cases.

Uwaga srodowiskowa: public pages zwracaly HTTP 200, ale w lokalnym helperze
asset dev server `http://coderso-c.localhost:5178/site/*` zwracal
`ERR_CONNECTION_REFUSED`. Dlatego raport traktuje Tailwind utility class names
oraz runtime data attributes jako dowod kontraktu, ale nie opiera wnioskow o
`computedStyle` dla pozycji sticky/mobile display.

## Pokrycie UI

Przetestowane:

- Wizard read-only starter summary,
- Visual: warianty, links source, logo text/destination, manual links,
  metadata, sub-links, target, CTA, mobile mode, hide CTA, colors, tokens,
  sticky/transparent/collapse, layout,
- Advanced: source summary, layout token summary, runtime behavior summary,
- public runtime: linked logo, safe image fallback, drawer state, submenu
  state, active link detection, collapse data toggle, target/rel, multiple
  widget instances, empty and unsafe link edge cases.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-navigation` i zaznaczony blok | Canvas pokazuje simple Navigation z logo i trzema linkami. | `/audit-31-05-navigation` HTTP 200, `nav[data-navigation-widget="1"]`, brak body overflow. | Dziala | Renderer ma root `nav` z `aria-label`, safe logo link i manual links. | Brak. |
| Wizard | `Run setup again` | Wizard root istnieje; read-only: Current layout, links source, first 3 quick links, logo type/value, CTA helper; `Finish setup and open Visual`. | Nie dotyczy. | Dziala | Wizard nie mutuje linkow; edycja jest w Visual zgodnie z docs. | Brak. |
| Visual sections | Otwarcie Visual | Sekcje: Variant and Structure, Brand and Logo, Navigation Links, CTA and Right Actions, Mobile Behavior, Colors/Borders/Typography, Surface and Runtime Behavior. | Public data odzwierciedla fixture. | Dziala funkcjonalnie | Visual jest glownym ownerem edycji. | Metadata paths sa niepelne, patrz `NV-31-05-04`. |
| Variant: simple | Bazowa strona | Simple zaznaczony; CTA helper mowi, ze Simple ukrywa CTA. | Public simple nie renderuje CTA. | Dziala | `variantSupportsCta()` ogranicza CTA do `with-cta` i `split`. | Brak. |
| Variant: with-cta / split | Fixture rich/modes | Karty wariantu widoczne, `onVariantChange` dziala w testach UI. | `split` renderuje CTA i centered links; `with-cta` renderuje CTA. | Dziala | SSR i testy pokrywaja warianty. | Brak. |
| Links source: manual | Edycja bazowej strony | Manual links sa edytowalne, mozna dodac, usunac, reorder, sub-link. | Public rich route renderuje parent links i sub-links. | Dziala | `NavigationVisualEditor` mutuje `items`; renderer normalizuje linki. | Brak dla standardowego path. |
| Links source: pages/menu | Code/UI review | UI ma select i menu picker; menu preview jest read-only po sync. | Resolver potrafi pages/menu i fallback. | Dziala podstawowo | `resolveNavigationRuntimeData()` obsluguje `pages`, `menu`, location fallback. | Edge safety w `NV-31-05-02`. |
| Logo text + destination | Logo text, saved custom destination | Text logo i destination picker widoczne; custom href jest replace/clear. | Public logo jest `<a href="/">`, accessible name `Coderso home`; rich route `Nav Audit home`. | Dziala | Logo zawsze renderuje focusable `<a>`. | Brak. |
| Image logo unsafe fallback | Minimal fixture z `ftp://...` image | Nie dotyczy bazowego admin. | Public minimal: `missingImage="true"`, brak `<img>`, tekst `Unsafe logo fallback`, logo href `#minimal`. | Dziala | Image URL idzie przez safe image href normalizer. | Brak. |
| Manual link metadata | Rich fixture | Visual ma icon, description, badge label/tone, target. | Public renderuje icon text, badge, description jako plain text. | Dziala | `renderNavigationLabel()` renderuje metadata bez raw HTML. | Brak. |
| Target `_blank` | Rich fixture link z target blank | Target select w Visual. | Public links maja `target="_blank"` i `rel="noopener noreferrer"`. | Dziala | `resolveLinkProps()` ustawia safe rel. | Brak. |
| Submenu | Klik toggle submenu | Visual dodaje sub-linki; admin preview statyczny. | Toggle zmienia `aria-expanded=false -> true`; panel `hidden=false`, `aria-hidden=false`; outside click zamyka. | Dziala | Runtime script zarzadza submenu state root-scoped. | Brak. |
| Drawer mode | Mobile public viewport, klik Menu | Visual opisuje focus loop i drawer policy. | Toggle `Menu -> Close`, `aria-label` open/close, panel `hidden=false`, Escape zamyka. | Dziala | Runtime script binduje drawer per root. | Active current clone w `NV-31-05-03`. |
| Multiple Navigation instances | `/audit-31-05-navigation-double` | Nie dotyczy admin. | Druga instancja drawer otwiera sie i zamyka; outside click zamyka obie bez globalnego one-shot problemu. | Dziala | Runtime ma globalne listeners, ale inicjalizuje wszystkie roots. | Brak. |
| Mobile mode: expanded | `/audit-31-05-navigation-modes` | Select pokazuje `Expanded links on mobile`. | Brak drawer toggle/panel; links stay in primary list contract. | Dziala kontraktowo | `mobileMode=expanded` ustawia `linksVisibleOnMobile`. | CSS display nie liczony przez asset gap. |
| Mobile mode: minimal | Minimal fixture | Select pokazuje `Minimal header on mobile`. | Brak drawer toggle/panel; image fallback dziala. | Dziala kontraktowo | `isMinimalMode` nie renderuje mobile panel. | CSS display nie liczony przez asset gap. |
| CTA mobile policy | Drawer rich fixture | Hide CTA switch istnieje. | Drawer mode renderuje desktop/header CTA plus mobile drawer CTA; header CTA ma class `hidden md:inline-flex`. | Dziala kontraktowo | CSS decyduje widocznosc per viewport. | Weryfikacja wizualna wymaga dzialajacych assets 5178. |
| Active link mode | Rich route `pathname` | Active-link select widoczny. | Oba klony active dostaja `data-navigation-active=true`; tylko pierwszy link ma `aria-current=page`. | Czesciowo dziala | State kolorowania dziala, ale a11y current trafia tylko w pierwszy klon. | Patrz `NV-31-05-03`. |
| Collapse on scroll | Rich route, scroll 360px | Toggle istnieje w Visual, Advanced pokazuje read-only status. | `data-navigation-collapsed=false -> true`, class `is-navigation-collapsed` dodana. | Dziala runtime-data | Script toggluje root state. | Visual sticky pozycji nie potwierdzono przez asset gap. |
| Sticky navigation | Rich route | Toggle istnieje w Visual. | SSR root ma class `sticky top-0 z-40`; computed sticky niezweryfikowany przez brak CSS assets. | Dziala kontrakt HTML | Renderer dodaje sticky classes. | Naprawic shared dev asset server osobno, jesli potrzebny visual CSS probe. |
| Colors / tokens / clear | Visual colors | Swatch-first, theme default labels, clear buttons; brak visible raw text inputs dla kolorow. | Rich route inline vars: surface/border/text/link/active/CTA colors. | Dziala z UI | `SharedColorControl` i inline CSS vars. | Persisted arbitrary color risk w `NV-31-05-06`. |
| Advanced diagnostics | Klik Advanced | `writablePaths=[]`; runtime/layout summaries read-only; menu key redagowany jako `Custom menu configured` / `Not configured`. | Nie dotyczy. | Dziala | Advanced sections sa diagnostics-only. | Public `data-menu-key` w `NV-31-05-05`. |
| Empty manual links | `/audit-31-05-navigation-empty` | Nie dotyczy bazowego UI; odtwarza saved cleared links. | HTTP 200, ale zamiast brand-only nav: `Invalid widget data (data/items must NOT have fewer than 1 items)`. | Nie dziala | Resolver zwraca `items=[]`, schema nadal ma `minItems:1`. | Patrz `NV-31-05-01`. |
| Unsafe manual href | `/audit-31-05-navigation-unsafe` | Visual feedback ma mowic, ze runtime ukrywa link bez safe destination. | `javascript:` nie trafia do DOM, ale label `Script link` zostaje jako widoczny href `#`; protocol-relative item znika. | Czesciowo nie dziala | Resolver przepisuje unsafe non-empty href do `#`. | Patrz `NV-31-05-02`. |

## Znaleziska do poprawy

### NV-31-05-01 - Pusta lista linkow po public resolverze rozwala widget jako invalid data

**Status po TASK-397:** Naprawione. `navigationSchema.items` dopuszcza teraz
pusta liste, a regresja `navigation schema accepts resolved empty item lists`
potwierdza, ze public-resolved `items: []` nie przechodzi juz przez invalid
widget state.

**Objaw:** `/audit-31-05-navigation-empty` ma dwa zapisane linki bez
bezpiecznych destynacji. Public runtime powinien zachowac brand-only
Navigation albo ukryc tylko linki. Faktyczny wynik:

```json
{
  "status": 200,
  "invalid": true,
  "navCount": 0,
  "bodyText": "Invalid widget data (widget_schema_invalid: data/items must NOT have fewer than 1 items): navigation"
}
```

**Dlaczego:**

- Public hydration wpisuje wynik resolvera do `block.data.items`:
  `core/server/publicSite.tsx:515-524`.
- Resolver celowo zwraca `items=[]`, gdy zapisane manual links istnieja, ale
  wszystkie sa wyczyszczone:
  `core/services/navigation/navigationRuntimeResolver.ts:150-157`;
  test potwierdza ten kontrakt:
  `tests/unit/navigation/navigationRuntimeResolver.test.ts:42-54`.
- `NavigationBlock` potrafi renderowac `items=[]` bez przywracania starter
  defaults:
  `tests/vitest/widgets/navigation.test.tsx:536-549`.
- Ale `WidgetRenderer` najpierw odpala `normalizeWidgetBlock()`:
  `core/widgets/renderers/widgetRenderer.tsx:141-151`.
- `navigationSchema` nadal wymaga `items.minItems=1`:
  `core/widgets/core/navigation.tsx:122-124`.

**Jak naprawic:**

1. Uzgodnic kontrakt: skoro renderer i resolver wspieraja cleared/empty links,
   schema powinna dopuscic `items: []` dla Navigation.
2. Dodac regresje end-to-end dla `publicSite -> resolveNavigationRuntimeData ->
   WidgetRenderer`, nie tylko osobny test resolvera i `NavigationBlock`.
3. Jesli produkt jednak nie chce brand-only nav, resolver powinien zwracac
   explicit hidden/fallback state, a nie pusty payload niezgodny ze schema.

### NV-31-05-02 - Public resolver zmienia unsafe manual href w widoczny link `#`

**Status po TASK-397:** Naprawione na granicy widget-owner. Navigation traktuje
bare `#` jako brak destynacji, wiec resolverowy placeholder po unsafe href jest
ukrywany tak samo jak `javascript:` i protocol-relative href. Realne kotwice
typu `#overview` pozostaja dozwolone.

**Objaw:** `/audit-31-05-navigation-unsafe` ma link
`javascript:alert(1)`. DOM nie zawiera `javascript:`, ale nadal pokazuje link
`Script link` z href `#`:

```json
{
  "links": [
    { "text": "Unsafe Links", "href": "#unsafe" },
    { "text": "Script link", "href": "#" },
    { "text": "Safe fallback", "href": "/audit-31-05-navigation-unsafe" }
  ],
  "unsafeHrefCount": 0
}
```

Protocol-relative `//evil.example/path` znika dopiero pozniej, bo
`NavigationBlock` ponownie normalizuje dane. `javascript:` przezywa jako
`#`, bo resolver sam go tak przepisal.

**Dlaczego:**

- Resolver ma lokalny `sanitizeHref()` i nie uzywa shared
  `normalizeWidgetSafeHref()`:
  `core/services/navigation/navigationRuntimeResolver.ts:54-65`.
- `sanitizeHref()` zwraca `#` dla dowolnego niepustego unsafe href:
  `core/services/navigation/navigationRuntimeResolver.ts:64`.
- Shared normalizer odrzuca `//` oraz `javascript/data/vbscript`:
  `core/widgets/core/widgetSafeHref.ts:15-25`.
- Direct `NavigationBlock` ukrywa cleared/unsafe saved links:
  `tests/vitest/widgets/navigation.test.tsx:514-533`, ale public resolver
  zmienia zachowanie przed renderem.

**Jak naprawic:**

1. Usunac lokalny sanitizer z resolvera albo oprzec go o
   `normalizeWidgetSafeHref({ allowRelative: true, allowHash: true,
   allowHttp: true })`.
2. Dla manual items skipowac unsafe href zamiast przepisywac do `#`.
3. Dodac testy resolvera dla `javascript:` i `//evil.example`, plus public
   renderer test, ze labels z unsafe href nie zostaja klikalnymi placeholderami.

### NV-31-05-03 - Drawer active link ma `aria-current` tylko na pierwszym klonie

**Status po TASK-397:** Naprawione. Runtime oznacza wszystkie responsywne klony
najlepszego active-match jako `data-navigation-active="true"` oraz
`aria-current="page"`, wiec desktop i drawer clone maja zgodna semantyke.

**Objaw:** w `drawer` renderer ma desktop list i mobile panel z tymi samymi
linkami. Na `/audit-31-05-navigation-rich` oba klony aktualnego linku dostaly
`data-navigation-active="true"`, ale tylko pierwszy klon dostal
`aria-current="page"`:

```json
[
  { "text": "goRich homeNewActive page item", "active": "true", "current": "page" },
  { "text": "goRich homeNewActive page item", "active": "true", "current": null }
]
```

Na mobile widoczny jest drawer clone, wiec stan wizualny moze byc aktywny, ale
semantyka aktualnej strony trafia w ukryty desktop clone.

**Dlaczego:**

- Script zbiera wszystkie linki z root:
  `core/widgets/core/navigation.tsx:604-615`.
- Ustawia `data-navigation-active=true` na kazdy najlepszy match, ale
  `aria-current` tylko raz:
  `core/widgets/core/navigation.tsx:624-631`.
- Desktop list renderuje sie przed mobile panel:
  `core/widgets/core/navigation.tsx:1386-1395`,
  `core/widgets/core/navigation.tsx:1455-1471`.

**Jak naprawic:**

1. Dla duplicate responsive clones preferowac widoczny/focusable match w danym
   viewport przy `aria-current`.
2. Alternatywnie oznaczyc wszystkie najlepsze klony `aria-current="page"` i
   dodac ukrywanie semantyczne dla niewidocznego klona, jesli zespol akceptuje
   wiele current links w responsywnych duplikatach.
3. Dodac test runtime dla drawer active-link path na mobile.

### NV-31-05-04 - Visual dziala, ale metadata `data-widget-control-path` jest niepelne

**Status po TASK-397:** Naprawione. Navigation Visual uzywa wspolnych
`WidgetControlRow`, `SharedColorControl` i `LinkDestinationField` metadata dla
deklarowanych writable paths. Regresja w `navigation-editor-wave.test.tsx`
porownuje renderowane Visual control paths z `navigationEditorContract`.

**Objaw:** admin Visual ma wiele dzialajacych kontrolek, ale DOM metadata
pokazala tylko 13 `data-widget-control` rows, glownie destination pickery i
builder controls. Brak path metadata m.in. dla wariantow, links source, logo
type/text, active-link mode, metadata fields, target select, mobile mode,
switchy, token selects i wielu style controls.

**Dlaczego:**

- Sekcje w `navigationEditorContract` deklaruja szerokie writable paths:
  `core/widgets/core/navigation.tsx:300-384`.
- `NavigationVisualEditor` renderuje wiele raw `button`, `Select`, `Input` i
  `Switch` bez widget-owned `data-widget-control-path` wrappera, np.
  variant buttons `core/admin/ui/widgets/editors/NavigationEditors.tsx:910-929`,
  links source `:935-955`, logo text `:994-999`, mobile switch
  `:1377-1380`, layout/runtime switches `:1850-1881`.

**Jak naprawic:**

1. Dodac stabilne `data-widget-control-path` / ownership wrappers dla kazdej
   interaktywnej kontrolki zgodnej z `navigationEditorContract`.
2. Zostawic action-only przyciski (`Move up`, `Add sub-link`, slot actions)
   jako `ownership=action`, ale wpisac sciezke dla danych, ktore modyfikuja.
3. Rozszerzyc smoke test, zeby porownywal deklarowane writable paths z realnymi
   kontrolkami w DOM.

### NV-31-05-05 - Public DOM ujawnia `data-menu-key`

**Status po TASK-397:** Naprawione. Public renderer nie emituje juz
`data-menu-key` ani raw `menuKey`; zamiast tego pokazuje tylko
`data-menu-configured="true"` gdy menu jest skonfigurowane.

**Objaw:** renderer wystawia `data-menu-key={normalized.menuKey}` na public
`<nav>`, chociaz runtime client script go nie uzywa.

**Dlaczego:**

- Atrybut jest emitowany w rendererze:
  `core/widgets/core/navigation.tsx:1341-1344`.
- Advanced redaguje menu key jako `Custom menu configured` / `Not configured`,
  ale public DOM moze ujawnic konkretny identyfikator menu.

**Jak naprawic:**

1. Usunac `data-menu-key` z public DOM.
2. Jesli diagnostyka potrzebuje stanu, wystawic boolean/enum bez identyfikatora,
   np. `data-menu-configured="true"`.

### NV-31-05-06 - Persisted/imported style colors nie sa schema-bounded

**Status po TASK-397:** Naprawione. Navigation color fields maja schema pattern
dla bezpiecznych kolorow i przechodza przez `resolveClearableCssColorValue()`
w normalizerze przed renderem. Regresje sprawdzaja odrzucenie importowanego
`url(javascript:...)` oraz zachowanie tokenow/hex/rgb.

**Objaw:** UI jest swatch-first i dziala poprawnie w codziennym edytowaniu, ale
schema przyjmuje style color fields jako dowolne stringi. Importowany albo
legacy payload moze zapisac wartosc, ktora potem trafia do inline style/CSS
variables.

**Dlaczego:**

- Style schema ma `type: "string"` dla kolorow:
  `core/widgets/core/navigation.tsx:224-233`.
- Renderer przekazuje te wartosci do inline `navStyle` / `ctaStyle`:
  `core/widgets/core/navigation.tsx:1130-1168`.
- UI waliduje czesc link color values helperem `isHexColorValue()`, ale
  normalizer domenowy nie ma wspolnego `normalizeNavigationColorValue()`.

**Jak naprawic:**

1. Dodac domenowy normalizer dla Navigation color values: hex, dozwolone theme
   tokens, `transparent` tylko tam, gdzie kontrakt go dopuszcza.
2. Spiac schema z tym kontraktem albo czyscic invalid values w
   `normalizeNavigationData()`.
3. Dodac testy dla importowanego payloadu z invalid color string.

## Co dziala dobrze

- Public root ma semantyczne `nav aria-label="Primary navigation"`.
- Logo jest focusable linkiem i ma accessible name.
- Image logo clear/unsafe URL fallback nie tworzy broken `<img>`.
- Submenu toggle ma `aria-expanded`, `aria-controls`, `aria-hidden` sync.
- Drawer toggle aktualizuje label/icon state i Escape zamyka panel.
- Multiple Navigation instances dzialaja w jednej stronie.
- Active-link coloring dziala przez `data-navigation-active`.
- Target `_blank` zawsze dostaje `rel="noopener noreferrer"`.
- Wizard i Advanced sa read-only zgodnie z obecnym kontraktem.
- Public `javascript:` nie trafia literalnie do DOM, czyli twardy XSS link nie
  renderuje sie jako `javascript:`.

## Walidacja

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, `3 files / 55 tests`.
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, `9 files / 125 tests`.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun test tests/security/codersoSecurityGate.test.ts` - passed.
- `bun run scan:gitleaks:worktree`, `bun run scan:trivy:secret`, `bun run scan:semgrep` - passed, Semgrep `0 findings`.
- `git diff --check -- core/widgets/core/navigation.tsx core/admin/ui/widgets/editors/NavigationEditors.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx _docs/_WIDGETS/NAVIGATION.md _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NAVIGATION_WIDGET.md _docs/_TASKS/TASK-397*.md` - passed.
- `git diff --check` - passed.
- `bun run gates:coderso` - passed: functional, ux, performance, security, reliability.

Walidacja historyczna z UI-first pass:

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx` - passed, `3 files / 37 tests`.
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/navigation/navigationRuntimeResolver.test.ts` - passed, `11 tests`.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.

## Rekomendowana kolejnosc napraw

Wszystkie pozycje `NV-31-05-01` do `NV-31-05-06` zostaly zamkniete w
TASK-397. Dalszy Playwright retest powinien skupic sie na potwierdzeniu
publicznych tras audytowych po uruchomieniu asset dev servera, bo pierwotny pass
nie mogl oprzec sie o `computedStyle` przez `ERR_CONNECTION_REFUSED` na porcie
5178.
