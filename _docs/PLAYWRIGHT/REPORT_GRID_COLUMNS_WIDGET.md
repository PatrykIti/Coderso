# RAPORT: Grid Columns Widget — Closure Matrix

> **Status:** Zamknięty po TASK-271/TASK-325; TASK-336-19 supersedes the editor-mode ownership notes
> **Pierwotna sesja Playwright:** 2026-05-16
> **Raport closure:** 2026-05-21
> **Sesja:** Playwright #3 (Grid Columns Widget)
> **Środowisko źródłowe:** http://localhost:5173/admin | http://localhost:3000

---

## 1. Cel raportu

Ten plik zachowuje snapshot z sesji Playwright z 2026-05-16, ale po
TASK-256/TASK-293/TASK-271/TASK-325 nie może już być traktowany jako lista "wciąż
otwartych" problemów widgetu. Po TASK-336-19 nie może też być używany jako
źródło prawdy dla bieżącego podziału `Wizard` / `Visual` / `Advanced`.
Został więc przepisany do closure matrix:

- wskazuje, które findingi były shared-contract drift i zostały zamknięte poza
  TASK-271,
- które findingi zostały dostarczone lokalnie w TASK-271,
- które świadomie pozostają poza TASK-271 (brak safe-class policy albo
  current-state note).
- zapisuje, że finalny bieżący kontrakt to: Wizard jako jednorazowy starter,
  Visual jako właściciel codziennej konfiguracji, Advanced jako read-only
  diagnostics bez raw JSON/CSS-token pól.

## 1.1. TASK-336-19 ownership supersession

TASK-336-19 finalizuje bieżący kontrakt Grid Columns po starszych closure
passach:

- Wizard ma tylko jednorazowy wybór starter layoutu (`variant`) i nie renderuje
  label, gap, preset, responsive span, color ani raw token controls.
- Visual przejmuje codzienną konfigurację: variant, labels, content-area count
  guidance, width presets, responsive spans, visibility, spacing, cardized
  surfaces, swatch-only colors, and per-column behavior.
- Advanced nie dostaje `onChange` i pokazuje wyłącznie read-only layout,
  column override, and content-area diagnostics. It does not render inputs,
  selects, buttons, raw payload previews, hidden mutating controls, or visible
  `var(...)` token strings for nontechnical authors.
- Final TASK-336-19 smoke:
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-grid-columns-advanced-readonly-2026-05-25.*`
  reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.

## 2. Snapshot źródłowy z 2026-05-16

Playwright wykrył trzy klasy problemów:

- shared truthfulness drift: slot/config desync, public helper labels,
  placeholder leakage, masonry/cardize truthfulness, CSS-variable color-picker
  semantics, span-truthfulness;
- lokalne braki produktowe: wizard labels, presety, responsive order/visibility,
  reorder, gap labels/tokens, per-column styling, min-height, align-self,
  overflow;
- obserwacje bieżącego UX shella: Preview modal vs canvas preview oraz brak
  safe policy dla custom CSS classes.

## 3. Finalna macierz findingów

| ID | Snapshot z 2026-05-16 | Finalny status | Owner | Evidence |
|---|---|---|---|---|
| C1 | slot/config desync i manualny sync | `current-state/shared`: live editor nie tworzy już lokalnie nowego driftu, bo count controls i local add/remove actions blokują się przy istniejących slotach i odsyłają do Structure; pełne auto-remap pozostaje poza TASK-271 | TASK-256/TASK-293 seam, plus TASK-271 local guard | `GridColumnsEditors.tsx`, `gridColumns.tsx`, `blockSettings-wave.test.tsx`, `grid-columns-editor-wave.test.tsx`, `gridColumns.test.tsx` |
| C2 | color picker nie pokazuje CSS variables truthfully | `superseded/fixed` | TASK-325-03 + TASK-336-19 | Grid Columns preserves approved token values at runtime, while normal Visual authoring is now swatch-only with saved custom color values shown as replace-or-clear state instead of editable token text |
| C3 | Wizard edytuje tylko kolumny 1 i 2 | `superseded/fixed` | TASK-271-01 + TASK-336-19 | Older TASK-271 label-input coverage is superseded by TASK-336-19: Wizard is one-time starter only, while Visual owns labels and content-area configuration; `grid-columns-editor-wave.test.tsx` |
| C4 | brak wizualnego preview spanów | `fixed outside TASK-271` | TASK-325-01 / TASK-325-02 | `asymmetric` now exposes preset-vs-saved desktop state, and the editor shows current per-breakpoint totals with explicit row-fit guidance |
| C5 | brak walidacji sumy spanów | `closed with explicit guidance` | TASK-325-02 / TASK-325-05 | editor totals now follow the effective visible layout, explain row-fit consequences, and record the explicit `no-runtime-guard` rejection instead of claiming runtime enforcement |
| W1 | brak per-column surface overrides | `fixed` | TASK-271-04 | per-column `style.surface/background/borderColor/borderWidth/radius/padding`; `gridColumns.tsx`, `gridColumns.test.tsx` |
| W2 | brak kontroli min-height | `fixed` | TASK-271-05 | `minHeight` i `mobileMinHeight` tokens; runtime class proof in tests |
| W3 | brak reverse on mobile | `fixed` | TASK-271-03 | `layout.reverseOnMobile`, runtime markers/classes, editor toggle |
| W4 | brak per-column visibility | `fixed` | TASK-271-03 | `hideOnMobile/hideOnTablet/hideOnDesktop`, runtime classes, editor warnings |
| W5 | brak per-column vertical alignment | `fixed` | TASK-271-05 | `alignSelf` with `self-*` runtime output |
| W6 | brak `xl` / `2xl` spanów | `fixed` | TASK-271-03 | optional `xlSpan` / `twoXlSpan` in schema, runtime, editor |
| W7 | brak reorderu kolumn | `fixed` (keyboard-safe move controls, nie DnD) | TASK-271-02 | widget-local move buttons + shared repeatable-slot sync; `blockSettings-wave.test.tsx` |
| W8 | brak custom CSS class per kolumna | `rejected` | TASK-271-07 | no safe class registry/policy; raw class strings intentionally not added |
| W9 | brak per-column overflow control | `fixed` | TASK-271-04 | per-column `style.overflow` now stays independent from local surface highlight, with runtime `overflow-hidden` proof |
| W10 | ograniczone gap tokens | `fixed` | TASK-271-06 | gap set expanded to `none/1/2/3/4/5/6/7/8/10/12` |
| U1 | gap labels bez px context | `superseded/fixed` | TASK-271-06 + TASK-336-19 | TASK-271 added scale context; TASK-336-19 later removed visible px-unit labels from normal authoring and keeps friendly bounded spacing names |
| U2 | variant cards bez miniaturek | `fixed` | TASK-271-01 | visual selector includes compact previews for all variants |
| U3 | Advanced nie ukrywa inactive cardize controls | `fixed outside TASK-271` | TASK-325-04 | cardize-only controls now hide/disable truthfully when inactive, and `masonry-lite` keeps the lock reason explicit |
| U4 | brak wskaźnika bieżącej sumy spanów | `fixed outside TASK-271` | TASK-325-02 | current desktop/tablet/mobile totals are visible with explicit row-fit guidance |
| U5 | mylące `Column configs` copy | `fixed` | TASK-271-01 | control, warning, and add/remove action copy now use user-facing column wording |
| U6 | masonry-lite wymusza cardize bez truthful UI | `fixed` | TASK-256-05-01 + TASK-271 | toggle is locked on with explanatory copy in both Visual and Advanced editors |
| U7 | label kolumny widoczny publicznie | `fixed outside TASK-271` | TASK-256-03 / TASK-256-05-01 | labels render only on editor/admin preview surfaces |
| U8 | brak layout presetów | `fixed` | TASK-271-01 | same-count preset buttons for 2-6 column layouts |
| P1 | publiczny `Column N` helper | `fixed outside TASK-271` | TASK-256-03 / TASK-256-05-01 | `gridColumns.test.tsx` public runtime no longer renders helper labels |
| P2 | publiczny `Empty column.` placeholder | `fixed outside TASK-271` | TASK-256-03 / TASK-256-05-01 | placeholder remains editor-only |
| P3 | overflow fallout przy błędnej sumie spanów | `resolved by explicit rejection` | TASK-325-05 | editor totals guidance now explains wrapping/unused-width behavior, and `gridColumnsOverflowDecision` records `no-runtime-guard` |
| P4 | mobile empty space przez hardcoded min-height | `fixed` | TASK-271-05 | bounded mobile min-height override lets authors reduce empty space |

## 4. TASK-271 shipped scope

### TASK-271-01

- Historical note: before TASK-336-19, Wizard label inputs covered every
  configured column. Current TASK-336-19 ownership moves label and daily
  content-area configuration to Visual, leaving Wizard as one-time starter only.
- Variant cards gained compact layout miniatures.
- Count copy is now user-facing (`Column count`).
- Same-count presets apply bounded span sets without adding/removing slots.

### TASK-271-02

- Grid Columns reorders column metadata and repeatable slot payloads atomically.
- Accessible move buttons are the shipped solution; drag-and-drop remains
  optional non-required scope.
- When no live repeatable slot ids exist yet, runtime now synthesizes targets
  from configured columns instead of truncating back to the repeatable-slot
  minimum.

### TASK-271-03

- Mobile reverse order landed.
- Per-column visibility landed.
- Optional `xl` / `2xl` spans landed.

### TASK-271-04

- A single column can now opt into a local cardized surface.
- Per-column overflow is bounded to `visible` / `hidden` and can clip content
  without forcing a local card shell.
- Per-column override colors remain restricted to approved token variables or
  hex values.

### TASK-271-05

- Historical `min-h-[6rem]` output is now schema-owned through bounded tokens.
- Authors can override mobile min-height without changing desktop output.
- Per-column vertical alignment now layers over the existing global wrapper
  alignment.

### TASK-271-06

- Gap tokens expanded to the approved bounded set.
- `gapX` and `gapY` remain separate persisted fields.
- Editor labels now explain the spacing scale.

## 5. Explicitly deferred / rejected

- `TASK-325` is now closed: asymmetric span truthfulness, current span totals, CSS-variable picker semantics, and inactive cardize controls all have shipped owner evidence.
- `P3` also closes here with an explicit no-runtime-guard decision: runtime keeps saved spans as authored, and the editor now explains the row-fit consequences instead of rewriting layouts.
- `W8`: raw custom CSS classes per column remain rejected until a safe shared
  class-policy owner exists.
- Preview modal vs canvas preview is current shell behavior, not a
  Grid Columns-local bugfix.

## 6. Validation evidence

Focused TASK-325 closure coverage completed during this closure pass:

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
  - `1` file passed, `30` tests passed on 2026-05-21 after the review loop closed the larger-count asymmetric preset drift, live-slot reconciliation drift, and conflicting-visibility normalization coverage.
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
  - `1` file passed, `26` tests passed on 2026-05-21 after the review loop added live-slot-aware row/preset recovery coverage, visual variant-card live-order coverage, repeatable-slot-id fallback coverage, visibility-warning truthfulness, and per-column token-preservation coverage.
- `bun test tests/unit/widgets/validator.test.ts`
  - `1` file passed, `19` tests passed on 2026-05-21 (`38` expect() calls). The generic validator lane stayed green after the follow-up, while the Grid Columns-specific global wrapper color hardening is proven in `gridColumns.test.tsx`.

Full TASK-325 closure validation is recorded in `TASK-325-06` together with `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run gates:coderso`, `git diff --check`, `bun run precommit`, and the local `scan:security:strict` tool availability limitation.

TASK-336-19 Grid Columns ownership validation:

- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/editorContract.test.ts`
  - `3` files passed, `70` tests passed on 2026-05-25.
- `bun scripts/playwright-widget-contract-smoke.ts --session task-336-19-grid-columns-final --widget grid-columns --admin http://localhost:5173/admin --front http://localhost:3000 --output-json _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-grid-columns-advanced-readonly-2026-05-25.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-grid-columns-advanced-readonly-2026-05-25.md --strict`
  - reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
    `metadataGaps=0`.

## 7. Notes

- Original Playwright snapshot date remains important because several findings
  were valid on 2026-05-16 and later became shared-fix evidence rather than
  open widget-local scope.
- This closure matrix intentionally does not claim TASK-271 alone fixed the
  TASK-256- and later TASK-325-owned shared-contract drift.

*Raport closure zaktualizowany po finalnym TASK-325 shared truthfulness closure pass oraz TASK-336-19 Grid Columns ownership supersession.*
