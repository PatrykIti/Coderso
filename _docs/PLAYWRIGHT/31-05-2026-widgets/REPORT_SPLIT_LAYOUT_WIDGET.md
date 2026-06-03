# RAPORT: Split Layout Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Split Layout Rich`
> **Admin page id:** `9f6cb5a9-60ad-4cdd-a203-133340472124`
> **Public routes:** `/audit-31-05-split-layout`, `/audit-31-05-split-layout-rich`, `/audit-31-05-split-layout-stack`, `/audit-31-05-split-layout-legacy-zero`, `/audit-31-05-split-layout-invalid`
> **Playwright sessions:** `codex-31-05-ui-split-layout`, `codex-31-05-ui-split-layout-public`, `codex-31-05-ui-split-layout-advanced`, `codex-31-05-ui-split-layout-interaction`
> **Claude:** remediation review z lokalnego CLI (2026-06-01) zakonczony wynikiem `No blockers`.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem
`split-layout`. Przed testem przeczytano `_docs/_WIDGETS/SPLIT_LAYOUT.md`,
taski `TASK-343-28`, `TASK-285`, `TASK-285-01` do `TASK-285-06`,
`TASK-256-05-02` i `TASK-252-05-04`, implementacje
`core/widgets/core/splitLayout.tsx`,
`core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`, shared Structure UI w
`core/admin/ui/pages/builder/BlockSettings.tsx` i
`core/admin/ui/pages/builder/VisualPanel.tsx` oraz testy
`tests/vitest/widgets/splitLayout.test.tsx`,
`tests/vitest/ui/split-layout-editor-wave.test.tsx` i renderer markers in
`tests/vitest/widgets/renderer.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-split-layout-rich` - desktop `60/40`, tablet `40/60`, phone
  `50/50`, `collapseMobile=keep`, reverse phone order, gap `4`, vertical align
  `center`, left/right slot content,
- `/audit-31-05-split-layout-stack` - desktop `40/60`, tablet/phone saved
  `60/40`, `collapseMobile=stack`, no gap, right slot empty,
- `/audit-31-05-split-layout-legacy-zero` - legacy `gap="0"` with `keep`,
- `/audit-31-05-split-layout-invalid` - invalid ratio/collapse/gap/align enums
  to verify public fail-closed rendering.

Admin UI pass objal `Run setup again`, Wizard starter split, Visual variant
cards/miniatures, desktop/tablet/phone ratios, collapse mode, phone split,
reverse phone order, gap, vertical alignment, pane guidance, shared Structure,
layout/visibility and Advanced diagnostics. Interaction smoke potwierdzil, ze
klikniecie desktop card `50 / 50` zachowuje tablet/phone overrides, a zmiana
`Phone layout` z `keep` na `stack` ukrywa phone split control i pokazuje stack
note.

Public runtime sprawdzono realnym DOM-em: data markers, pane classes,
left/right slot content, empty-pane placeholder gating, reverse mobile order,
legacy zero gap, invalid payload fallback and body overflow.

## Pokrycie UI

Przetestowane:

- Wizard: one-time starter split, variant seed path, no daily controls,
- Visual: variant cards, ratio disclosure, desktop/tablet ratios, `keep` phone
  ratio, `stack` phone note, reverse phone order, gap labels, vertical align,
  pane guidance, shared Structure and shared block layout/visibility,
- Advanced: read-only responsive diagnostics and saved layout summary, no raw
  payload,
- public runtime: default empty split, rich keep split, stack split, legacy
  zero gap, invalid payload.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-split-layout` i zaznaczony blok | Visual root istnieje; default 50/50 stack. | HTTP 200, `data-split-layout-variant="50-50"`, 2 puste panes, brak admin placeholder copy. | Dziala | Empty pane helper idzie przez `renderEditorPlaceholder()`. | Brak. |
| Wizard starter | `Run setup again` | Starter layout select pokazuje `60 / 40`; `writablePaths=["variant"]`; brak daily mobile/gap controls. | Nie dotyczy bez zapisu. | Dziala | Wizard seediuje starter preset i opisuje, ze Visual przejmuje daily editing. | Brak. |
| Visual variant cards | Klik `50 / 50` na rich fixture | Selected card przechodzi na `50-50`; desktop value `50 / 50`, tablet zostaje `40 / 60`, phone `50 / 50`. | Nie dotyczy bez zapisu; public rich nadal 60/40. | Dziala | `buildVisualVariantSplitLayoutData()` zachowuje device overrides gdy roznia sie od desktop. | Brak. |
| Variant card metadata | Inspect Visual | Variant buttons maja path `variant`, ownership `writable`; no unwrapped controls. | Nie dotyczy. | Dziala | VariantCards siedzi w `WidgetControlRow` path `variant`. | Brak. |
| Ratio disclosure in keep | Rich fixture | Summary: Desktop `60 / 40`, tablet `40 / 60`, mobile `50 / 50`; copy mowi phone split has own saved value. | Public root markers i classes zgadzaja sie z keep split. | Dziala | Disclosure bazuje na normalized ratio i `collapseMobile=keep`. | Brak. |
| Ratio disclosure in stack | Stack fixture lub po interaction switch to stack | Summary mowi `phone stacked`, a saved phone split jest opisany jako dormant value dla przyszlego `keep`. | Public stack renderuje `grid-cols-1`, panes `col-span-1` on phone. | Dziala | Summary dostaje `collapseMobile`; active metadata ignoruje phone-only dormant ratios w stack mode. | Naprawione w `SPL-31-05-01` / TASK-364. |
| Desktop/tablet selects | Rich fixture | Desktop `60 / 40`, tablet `40 / 60`; writable paths `ratio.desktop`, `ratio.tablet`. | Public classes: left `lg:col-span-7 md:col-span-5`, right `lg:col-span-5 md:col-span-7`. | Dziala | Ratio tokens ida przez bounded maps. | Brak. |
| Phone layout keep | Rich fixture | Select `Keep two columns on phones`; phone split control visible `50 / 50`; helper warns tight screens. | Public root `collapseMobile=keep`, phone panes `col-span-6`. | Dziala | `mobileKeep` gates phone split control and renderer uses `mobileKeep*SpanMap`. | Brak. |
| Phone layout stack | Stack fixture and interaction | Select `Stack panes on phones`; phone split control hidden; stack note visible; Pane layout summary reports `phone stacked`. | Public root `grid-cols-1`, panes `col-span-1`, no phone split layout on mobile. | Dziala | Phone behavior and Pane layout now share effective stack semantics. | Brak. |
| Reverse phone order | Rich fixture | Copy says right pane is shown first on phones and screen reader order stays saved. | Public panes have `order-2 md:order-1` and `order-1 md:order-2`. | Dziala | Renderer applies order classes only for mobile. | Brak. |
| Gap labels | Rich/stack/legacy fixtures | Rich `Balanced`; stack `No gap`; legacy zero in public marker `gap="0"`. | Public rich `gap-4`, stack `gap-0`, legacy `gap-0`. | Dziala | `getSplitLayoutGapControlValue("0")` maps legacy zero to `none` in UI. | Brak. |
| Vertical alignment | Rich/legacy fixtures | Rich `Middle`, legacy `Bottom`. | Public rich `items-center`, legacy `items-end`. | Dziala | Bounded vertical align map. | Brak. |
| Pane content guidance | Visual | Shows `Pane content`, not old `Pane slots`; copy points to Structure/insert controls. | Public never shows admin pane guidance. | Dziala | Visual guidance is editor-only. | Brak. |
| Public empty pane | Stack fixture with empty right slot | Structure says right slot 0 items in admin. | Public has no `data-split-empty-pane`, no `Left/Right pane is empty`, no admin instructions. | Dziala | Empty guidance is render-context gated. | Brak. |
| Shared Structure fixed panes | Visual Structure | Left/right slots show counts and metadata paths `slots.left` / `slots.right`; Move up / Move down are not rendered for fixed panes. | Public unaffected. | Dziala | `BlockSettings` passes move flags only for repeatable slots, while fixed Split Layout panes remain stable rows. | Naprawione w `SPL-31-05-02` / TASK-364. |
| Advanced diagnostics | Click Advanced | `writablePaths=[]`, `rawControlCount=0`, `unwrappedControls=[]`; rows explain desktop/tablet/phone/gap/align and saved summary. | Nie dotyczy. | Dziala | `SplitLayoutAdvancedEditor` uses `ReadonlyWidgetSummaryRow`. | Brak. |
| Invalid enum payload | API fixture with invalid ratios/enums | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, `Invalid widget data`, no raw `75-25`/`baseline`/`float` in HTML. | Dziala fail-closed; route gap shared | Widget schema rejects invalid enums, but admin API allowed invalid payload to persist. | Shared write validation gap, same class as Section/Grid route contract. |

## Znaleziska i remediacja

### SPL-31-05-01 - `Pane layout` summary pokazuje phone split, gdy efektywny phone layout jest stacked

**Objaw:** na `/audit-31-05-split-layout-stack` Visual `Pane layout` pokazuje:

```text
Desktop 40 / 60, tablet 60 / 40, mobile 60 / 40.
Phone split is saved explicitly and currently matches the tablet layout.
```

Ta sama strona w sekcji `Phone behavior` mowi:

```text
Phones show one pane per row...
Stacked phone layout does not need a phone split. Each pane gets the full screen width.
```

Public runtime potwierdza, ze telefon efektywnie stackuje panele:

```json
{
  "collapseMobile": "stack",
  "className": "grid w-full min-w-0 grid-cols-1 md:grid-cols-12 gap-0 items-stretch",
  "panes": [
    { "side": "left", "className": "min-w-0 col-span-1 md:col-span-7 lg:col-span-5" },
    { "side": "right", "className": "min-w-0 col-span-1 md:col-span-5 lg:col-span-7" }
  ]
}
```

Interaction smoke pokazal ten sam drift po zmianie rich fixture z `keep` na
`stack`: phone split control znika i stack note jest widoczny, ale `Current
layout on devices` dalej podaje `mobile 50 / 50`.

**Dlaczego:**

- `VariantCards` renderuje summary tylko z `getSplitLayoutRatioDisclosure()`:
  `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx:305-324`.
- `getPhoneSplitDisclosureCopy()` nie dostaje `collapseMobile` i zawsze opisuje
  zapisany `ratio.mobile`: `SplitLayoutEditors.tsx:335-347`.
- `SplitLayoutVisualEditor` zna `mobileKeep` i `normalized.collapseMobile`, ale
  nie przekazuje tego stanu do summary: `SplitLayoutEditors.tsx:461-465` oraz
  `SplitLayoutEditors.tsx:476-495`.
- Renderer przy `collapseMobile="stack"` ignoruje mobile split dla phone classes
  i uzywa `grid-cols-1` + `col-span-1`:
  `core/widgets/core/splitLayout.tsx:571-583` i
  `core/widgets/core/splitLayout.tsx:590-603`.

**Jak naprawic:**

1. Przekazac `collapseMobile` albo diagnostics do `VariantCards`.
2. Dla `stack` zmienic summary na np. `Desktop 40 / 60, tablet 60 / 40, phone stacked.`
   oraz copy `Saved phone split is kept for when you choose Keep two columns on phones.`
3. Zostawic `ratio.mobile` w danych, bo to kompatybilny saved value dla
   przelaczenia na `keep`; poprawic tylko author-facing effective summary.
4. Dodac test w `tests/vitest/ui/split-layout-editor-wave.test.tsx`: przy
   `collapseMobile="stack"` summary nie moze mowic `mobile 60 / 40` jako
   efektywny layout i musi wspominac `phone stacked`.

**Status po remediacji (2026-06-01): Naprawione.**

- `VariantCards` dostaje `collapseMobile` i dla stack mode pokazuje
  `phone stacked` plus dormant saved-copy zamiast aktywnego `mobile ...`.
- Active metadata (`data-split-ratio-override`,
  `data-split-ratio-device-specific`) and `Custom device layout` badge ignore
  phone-only dormant ratios while phones stack.
- Desktop split cards preserve dormant saved phone ratios without inventing a
  tablet override when no active tablet/phone override exists.
- Regression coverage includes initial stack state, phone-only dormant saved
  ratio, and `keep -> stack -> keep` interaction.

### SPL-31-05-02 - Shared Structure pokazuje Move up / Move down dla fixed left/right panes

**Objaw:** Split Layout ma fixed slots `left` i `right`, ale Visual Structure
pokazuje:

```text
Left slot
1 item
Move up
Move down
Right slot
1 item
Move up
Move down
```

Przy fixed slots nie ma semantycznego reorderu; autor ma uzyc `reverse on
phone` albo wstawic/przeniesc nested widgets w konkretnym pane. Kontrolki sa
disabled, ale nadal wygladaja jak dostepne akcje strukturalne.

**Dlaczego:**

- `BlockSettings` ustawia `canMoveUp` / `canMoveDown` jako boolean false dla
  fixed slots: `core/admin/ui/pages/builder/BlockSettings.tsx:398-402`.
- `VisualPanel` renderuje move buttons gdy `typeof item.canMoveUp === "boolean"`,
  czyli takze dla `false`: `core/admin/ui/pages/builder/VisualPanel.tsx:199-221`.
- Rows maja action metadata, ale buttons nie maja path do `slots.left` /
  `slots.right`, wiec audyt widzi action controls bez path.

**Jak naprawic:**

1. W shared Structure rendererze renderowac Move up / Move down tylko dla
   repeatable slot items albo gdy istnieje realny `onMove*` handler.
2. Dla fixed slots pokazac jedynie count + empty guidance; nie pokazywac
   nieaplikowalnych disabled reorder actions.
3. Jesli shared action metadata ma byc audytowalne, dodac path dla slot rows,
   np. `slots.left` / `slots.right` albo `slots.<definitionId>`.
4. Dodac page-builder DOM test dla fixed-slot widgetu: Structure nie pokazuje
   move buttons dla non-repeatable slots.

**Status po remediacji (2026-06-01): Naprawione.**

- `BlockSettings` passes `canMoveUp` / `canMoveDown` only for repeatable slot
  instances, so fixed Split Layout panes no longer render Move up / Move down.
- Fixed pane row metadata remains auditable through `slots.left` and
  `slots.right`.
- Regression coverage confirms Split Layout fixed rows expose pane paths and do
  not render inert move controls.

## Co dziala

- Public renderer trzyma fixed `left` / `right` slots, bounded ratios and
  deterministic `data-split-*` markers.
- `keep` phone layout, phone-specific ratio, reverse phone order, gap tokens and
  vertical alignment renderuja sie zgodnie z UI.
- Desktop variant cards preserve responsive overrides zamiast resetowac tablet
  and phone silently.
- In stack mode, saved phone ratios are labelled dormant and do not create
  active custom-layout metadata until `keep` is selected.
- Shared Structure omits move actions for fixed Split Layout panes while keeping
  stable row metadata.
- Legacy `gap="0"` pozostaje backward-compatible publicznie i jest canonicalized
  to `No gap` in UI.
- Empty pane guidance is preview/admin-only and does not leak to public runtime.
- Invalid enum payload is fail-closed by widget schema/public renderer.
- Advanced is read-only, human-readable, and free of raw payload / class-token
  diagnostics.

## Walidacja

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 4 files / 63 tests.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 7 files / 111 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check` and `git diff --cached --check` - passed.
- `timeout 120s claude -p --dangerously-skip-permissions --max-budget-usd 1 "Review staged diff for TASK-364 only..."` - passed, no blockers.
