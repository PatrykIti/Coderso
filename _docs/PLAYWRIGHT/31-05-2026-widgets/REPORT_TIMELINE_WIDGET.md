# RAPORT: Timeline Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Timeline`
> **Admin page id:** `3e906e4d-5999-42d1-aa3c-22c26f98b1d3`
> **Public route:** `/audit-31-05-timeline`
> **Playwright session:** `timeline-31`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem `timeline`.
Klikalem realne opcje w admin live preview: Wizard summary, Visual mode/variant
cards, mode select, step count, step copy/date/status/icon/link fields, reorder,
guides, marker display, colors, typography, spacing, max width i Advanced.
Zmiany nie byly publikowane; public route pozostal baseline z domyslnym
Timeline.

Po UI pass zrobiono audyt kodu i niezalezny przeglad subagentem. Claude CLI
pozostal niedostepny lokalnie z powodu `401`.

## Pokrycie UI

Przetestowane:

- Wizard: read-only starter summary i brak daily controls,
- Visual: baseline `axis`, mode card `alternating`, mode select `process`,
  variant cards, oba update pathy mode-card/mode-select, step count `3/4`,
  orientation, label position, align, step copy/date/status/icon, CTA
  destination, whole-step destination, reorder, guides on/off/style/thickness,
  marker icon fallback, per-step marker colors, global colors set/clear,
  title/description/spacing/max width,
- Advanced: runtime/layout/normalization summaries i read-only contract,
- public SSR baseline,
- targeted Vitest suites dla renderer/editor/contract/public renderer.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `curl /audit-31-05-timeline` | Nie dotyczy admin. | HTTP 200; `data-timeline-variant=milestones`, `mode=axis`, 3 kroki, `effectiveMaxWidth=5xl`, `aria-label=Timeline`. | Dziala | Domyslny timeline renderuje axis/milestones z diagnostyka szerokosci. | Brak. |
| Wizard | `Run setup again` | Jedna sekcja `timeline.wizard.starter-steps`, `writableControls=0`, header/steps jako readonly summary. | Nie dotyczy. | Dziala | Wizard jest summary-only po TASK-291/TASK-343-13. | Brak. |
| Mode card: Alternating | Klik `Alternating` | `data-timeline-mode=alternating`, `variant=cards`; preview przechodzi na alternating branch. | Nie publikowano. | Dziala | Mode cards ida przez `updateMode` i preferred variant. | Brak. |
| Mode select: Process | Select `Timeline mode -> Process` | `data-timeline-mode=process`, `variant=compact`, preview skraca tekst do compact strip. | Nie publikowano. | Dziala | Select uzywa tego samego `updateMode` co cards. | Brak. |
| Variant Cards while mode Process | Klik `Cards` po ustawieniu `Process` | `data-timeline-variant=cards`, ale `data-timeline-mode=process`; renderer nadal wybiera compact layout. | Nie publikowano. | Nie dziala jako truthfulness | `mode=process` ma priorytet nad `variant=cards`, wiec karta Cards moze nie zmienic widocznego layoutu. | Patrz `TL-31-05-03`. |
| Step count 4 | Select `4 steps` | Preview ma 4 kroki, dodany `Launch`; `effectiveMaxWidth` wraca do `6xl`. | Nie publikowano. | Dziala | Step count normalizuje do `3-8`, width diagnostics zalezy od liczby krokow. | Brak. |
| Orientation / labels / align | Vertical, Bottom, Start | Root: `orientation=vertical`, `labelPosition=bottom`, 4 kroki w pionie. | Nie publikowano. | Dziala | Layout tokens trafiaja do renderer branches. | Brak. |
| Date validation | Wpisano `Q3 launch` w Date | Editor pokazuje blad `Use YYYY-MM-DD here...`; preview nadal pokazuje tekst jako date fallback. | Nie publikowano. | Dziala z ostrzezeniem | Walidacja jest guidance, nie blokada zapisu. | Brak, chyba ze product chce strict reject zamiast warning. |
| Date/status/icon | `2026-06-01`, `June 1, 2026`, status `Current`, icon `star` | Preview ma `timeCount=1`, `aria-current` dla kroku i dekoracyjna ikone. | Nie publikowano. | Dziala | Date renderuje `<time>`, status daje `aria-current=step`. | Brak. |
| CTA + whole-step link | Ustawiono CTA i whole-step link dla tego samego kroku | Editor pokazuje komunikat o nested anchors; Advanced raportuje `1 safe CTA` i `1 safe whole-step`. Preview w process/compact ma `ctaHrefs=[]`. | Nie publikowano. | Nie dziala w process/compact | CTA jest ukryte w compact render, a whole-step link jest blokowany przez obecne CTA. | Patrz `TL-31-05-01`. |
| Reorder | Klik `Down` na kroku 1 | Kolejnosc w preview zmienia sie: `Planning` przed `Audit discovery`. | Nie publikowano. | Dziala | Button fallback wywoluje `moveStep`. | Brak. |
| Guides | Toggle OFF/ON, style `Solid`, line style `Dashed`, thickness `4px` | Advanced pozniej pokazuje `Guides Enabled, Solid style`, `Line: Dashed; Thickness: 4px`. | Nie publikowano. | Dziala strukturalnie | Renderer ma guide/line styles; brakuje bezposredniej regresji `guides.style`. | Dodac test z `borderStyle` dla guide connectorow. |
| Marker display Icon | Select `Icon` bez ikon dla wszystkich krokow | Root `markerDisplay=icon`, `markerFallbackCount=2/1`, per-marker effective `icon/dot`; editor ostrzega o fallbackach. | Nie publikowano. | Dziala | TASK-343-13 dodal requested/effective marker diagnostics. | Brak. |
| Marker colors | Global marker, Step accent/background/icon color | Button/marker styles aktualizuja sie; Advanced liczy step accents/background overrides. | Nie publikowano. | Dziala | Per-step marker controls mapuja na runtime marker styles. | Brak. |
| Global colors + clear | Ustawiono line/title/description/background, potem Clear | Preview/background wraca do inherited/transparent; editor pokazuje theme/default states. | Nie publikowano. | Dziala | Shared color controls usuwaja clearable overrides. | Brak. |
| Header title/description | Wpisano `31-05 Timeline Audit` i helper copy | Section przechodzi z `aria-label=Timeline` na `aria-labelledby=timeline-heading-31-05-timeline-audit`; list label `31-05 Timeline Audit steps`. | Nie publikowano. | Dziala | Header title generuje heading id i accessible section/list labels. | Brak. |
| Title size None | Select `Title size -> None` | Step titles znikaja, editor pokazuje warning `Step titles are currently hidden`. | Nie publikowano. | Dziala z ostrzezeniem | To celowe: `titleSize=none` ukrywa title, ale editor informuje. | Brak. |
| Description size None | Select `Description size -> None (inherit)` | Description pozostaje widoczna w non-compact modes; editor wyjasnia inherited sizing. | Nie publikowano. | Dziala | TASK-343-13 ustalil, ze `none` nie chowa description. | Brak. |
| Max width 6XL przy 3 krokach | Step count 3, max width 6XL | Root `data-timeline-max-width=6xl`, `effective=5xl`, `narrowed=true`; editor i Advanced jawnie raportuja narrowing. | Nie publikowano. | Dziala | Runtime ma saved/effective diagnostics. | Brak. |
| Advanced | Klik `Advanced` | Sekcje runtime/layout/normalization + builder summaries; `writableControls=0`; pokazuje icon fallback, width narrowing i safe-link counts. | Nie dotyczy. | Dziala, ale patrz CTA visibility | Advanced jest read-only, ale safe-link count nie mowi, ze CTA jest niewidoczne w process/compact. | Patrz `TL-31-05-01`. |
| Visual control metadata | Inspekcja DOM editor | Realne controls dzialaja, ale `data-widget-control` lista zawiera glownie link destination i builder controls; wiele input/select/button controls bez shared row/path. | Nie dotyczy. | Nie dziala jako contract metadata | Kontrakt deklaruje writable paths, ale UI nie wrapuje wielu kontrolek w `WidgetControlRow`. | Patrz `TL-31-05-02`. |

## Znaleziska do poprawy

### TL-31-05-01 - CTA zapisane w `process`/compact nie renderuje zadnego linku

**Objaw:** w Visual mozna ustawic `Step CTA label` i `Step CTA destination`.
Po ustawieniu CTA oraz whole-step link editor poprawnie ostrzega, ze
whole-step link jest disabled, zeby nie bylo nested anchors. Jednak aktywny
runtime byl `mode=process`, czyli compact layout, i preview mialo
`ctaHrefs=[]`. Advanced jednoczesnie raportowal `Step CTA links: 1 safe CTA
destination` oraz `Whole-step links: 1 safe whole-step destination`.

Efekt dla autora: konfiguracja wyglada jako poprawna i bezpieczna, ale w
aktywnym compact/process layout nie ma zadnego widocznego linku dla tego kroku.

**Dlaczego:**

- `resolveStepLink` zwraca `undefined`, jesli krok ma CTA:
  `core/widgets/core/timeline.tsx:800-802`.
- `renderStepText` renderuje CTA tylko gdy `!compact`:
  `core/widgets/core/timeline.tsx:945-962`.
- `TimelineCompactLayout` zawsze wywoluje `renderStepText(... compact: true)`:
  `core/widgets/core/timeline.tsx:1395-1406`.
- Advanced liczy safe links bez informacji o widocznosci w aktualnym mode:
  `core/admin/ui/widgets/editors/TimelineEditors.tsx:1947-1957`.

**Jak naprawic:**

1. Najlepszy produktowo wariant: renderowac CTA w compact/process jako maly
   inline link lub secondary row, z zachowaniem zakazu nested anchors.
2. Jesli compact ma celowo ukrywac CTA, Visual musi pokazac ostrzezenie przy
   `mode=process`/`variant=compact`: `CTA is saved but hidden in compact process mode`.
3. Advanced powinien raportowac `1 safe CTA destination, hidden by current compact mode`
   zamiast samego `1 safe CTA destination`.
4. Dodac regresje w `tests/vitest/widgets/timeline.test.tsx` dla `mode=process`
   + `step.cta` oraz w `tests/vitest/ui/timeline-editor-wave.test.tsx` dla
   editor warningu.

### TL-31-05-02 - Visual controls dzialaja, ale nie wszystkie maja shared control metadata

**Objaw:** UI dziala, ale wiele realnych kontrolek nie jest opakowanych w
`WidgetControlRow` / shared metadata. Playwright widzial duzo writable paths,
ale lista `data-widget-control` zawierala glownie `timeline-step-*-destination`
oraz builder controls. Brakuje jednoznacznych control ids dla takich pol jak
step count, mode select, orientation, header title/description, step title/date
i czesc typography/spacing controls.

To utrudnia automatyczny audyt, mapping ownership i przyszle testy
per-kontrolka. Subagent niezaleznie potwierdzil tez drift sekcji kontraktu:

- kontrakt deklaruje `steps.count` i `header.*` pod `timeline.items-dates`,
  ale UI renderuje step count w `timeline.mode-layout`, a header w
  `timeline.typography-spacing`;
- kontrakt deklaruje `style.markerColor` w `timeline.colors`, ale UI renderuje
  global marker color w `timeline.markers-accents`.

**Dlaczego:**

- Kontrakt sekcji/writable paths jest w `core/widgets/core/timeline.tsx:491-557`.
- Step count/mode/orientation selects sa zwyklymi blokami bez shared row:
  `core/admin/ui/widgets/editors/TimelineEditors.tsx:768-850`.
- Header fields sa w Typography section:
  `core/admin/ui/widgets/editors/TimelineEditors.tsx:1210-1226`.
- Step fields sa zwyklymi `Input`/`Textarea`/`Select`:
  `core/admin/ui/widgets/editors/TimelineEditors.tsx:1623-1748`.

**Jak naprawic:**

1. Owinac realne controls w `WidgetControlRow` z unikalnym id i path, np.
   `timeline.visual.step-count`, `timeline.visual.mode`, `timeline.visual.step.0.title`.
2. Zaktualizowac `timelineEditorContract`, zeby sekcje posiadaly faktyczne
   sciezki tam, gdzie UI je renderuje, albo przeniesc UI do sekcji zgodnych z
   kontraktem.
3. Dodac test mapujacy `section id -> data-widget-control-path[]` dla Timeline.
4. Wzmocnic smoke, zeby wykrywal mutujace input/select/button bez
   `data-widget-control` w danej sekcji.

### TL-31-05-03 - Variant cards moga wygladac aktywnie, mimo ze `mode` decyduje o branchu renderera

**Objaw:** po ustawieniu `Timeline mode -> Process` klik `Cards` zmienia
`data-timeline-variant` na `cards`, ale runtime nadal renderuje compact/process
layout, bo `data-timeline-mode=process` ma pierwszenstwo. Autor moze uznac, ze
karta `Cards` nie zadzialala.

**Dlaczego:**

- Variant card zmienia tylko variant:
  `core/admin/ui/widgets/editors/TimelineEditors.tsx:328-342`.
- Renderer wybiera compact branch, gdy `mode === "process"`, niezaleznie od
  `resolvedVariant === "cards"`:
  `core/widgets/core/timeline.tsx:1512-1522`.

**Jak naprawic:**

1. Najprosciej: jesli current mode dominuje wariant, pokazac inline note przy
   kartach wariantu: `Process mode uses compact rendering; choose Axis/Chronology/Alternating to use this variant`.
2. Alternatywnie variant cards powinny tez ustawic kompatybilny mode, tak jak
   mode cards ustawiaja preferred variant.
3. Dodac regresje UI: ustaw `mode=process`, klik `Cards`, sprawdz czy preview
   zmienia layout albo editor jasno komunikuje, czemu nie zmienia.

## Public baseline

`curl http://localhost:3000/audit-31-05-timeline` zwrocil HTTP 200 i SSR HTML z:

- `data-timeline-variant="milestones"`,
- `data-timeline-mode="axis"`,
- `data-timeline-orientation="horizontal"`,
- `data-timeline-max-width="6xl"`,
- `data-timeline-effective-max-width="5xl"`,
- `data-timeline-max-width-narrowed="true"`,
- `data-timeline-marker-display="dot"`,
- `data-timeline-marker-icon-fallback-count="0"`,
- 3 kroki: `Discovery`, `Planning`, `Build`,
- `aria-label="Timeline"` i `ol aria-label="Timeline steps"`.

## Ograniczenia fixture

- Public route nie zawiera zmian z draft preview.
- Nie testowano kazdej opublikowanej strony w destination pickerze; wybrano
  `Audit 31-05 Timeline` jako reprezentatywny page-first destination.
- Nie testowano realnego drag-and-drop myszka; uzyto button fallback `Down`.
- Glowny przebieg mial jeden app-level console `404` dla `favicon.ico`, bez
  widget-owned crash.

## Kod-owner

- `core/widgets/core/timeline.tsx`
  - editor contract: `491-590`,
  - CTA/compact render finding: `800-802`, `945-962`, `1395-1406`,
  - variant/mode branch finding: `1512-1522`.
- `core/admin/ui/widgets/editors/TimelineEditors.tsx`
  - variant cards: `328-359`,
  - mode updater/cards/select: okolice `509`, `760-808`,
  - metadata gaps: `768-850`, `1210-1295`, `1623-1748`,
  - Advanced link summaries: `1947-1957`.
- `tests/vitest/widgets/timeline.test.tsx`
  - runtime diagnostics, safe links, compact/process coverage.
- `tests/vitest/ui/timeline-editor-wave.test.tsx`
  - Wizard/Visual/Advanced ownership and UI regressions.

## Rekomendacje

1. Naprawic `TL-31-05-01` jako funkcjonalna/truthfulness luka, bo autor moze
   zapisac CTA, ktore nie jest widoczne w aktywnym process/compact layout.
2. Naprawic `TL-31-05-02` przed kolejnymi automatycznymi audytami per control;
   inaczej UI dziala, ale metadata lane nie widzi prawdziwych wlascicieli.
3. Rozstrzygnac `TL-31-05-03`: albo variant cards sa tylko legacy metadata i
   dostaja wyjasnienie, albo maja mutowac mode tak, aby karta faktycznie
   zmieniala layout.

## Walidacja

- `playwright-cli -s=timeline-31 run-code --filename .tmp/playwright-timeline-compact.js` - passed.
- Admin console po przebiegu: `Errors: 1`, `Warnings: 0`; blad:
  `Failed to load resource: the server responded with a status of 404 (Not Found)`
  dla `favicon.ico`.
- `curl http://localhost:3000/audit-31-05-timeline` - HTTP 200, public baseline OK.
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx` - passed, 15 tests.
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx` - passed, 6 tests.
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts` - passed, 16 tests.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` - passed, 16 tests.
- Subagent code review potwierdzil read-only Wizard/Advanced, mode-card/select
  parity oraz wskazal niezaleznie metadata/contract gaps.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
