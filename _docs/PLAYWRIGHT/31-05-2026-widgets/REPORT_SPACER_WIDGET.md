# RAPORT: Spacer Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Spacer`
> **Admin page id:** `bfed4886-897e-41f8-be1f-649290f2ef5f`
> **Public routes:** `/audit-31-05-spacer`, `/audit-31-05-spacer-fixed`, `/audit-31-05-spacer-no-guide`, `/audit-31-05-spacer-unsafe`, `/audit-31-05-spacer-invalid`
> **Playwright sessions:** `codex-31-05-ui-spacer-fixture`, `codex-31-05-ui-spacer-public`, `codex-31-05-ui-spacer-breakpoints`, `codex-31-05-ui-spacer-admin`
> **Claude:** lokalny CLI nadal blokuje wspolprace: `401 Invalid authentication credentials`. Raport opiera sie na Playwright + audycie kodu Codex.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem `spacer`.
Przed testem przeczytano `_docs/_WIDGETS/SPACER.md`, taski `TASK-284`,
`TASK-256-05-03` i `TASK-252-05-06`, implementacje
`core/widgets/core/spacer.tsx`, edytor
`core/admin/ui/widgets/editors/SpacerEditors.tsx`, shared
`TokenOrPixelField`, historyczny raport
`_docs/PLAYWRIGHT/28-05-2026/REPORT_SPACER_WIDGET.md` oraz testy
`tests/vitest/widgets/spacer.test.tsx` i
`tests/vitest/ui/spacer-editor-wave.test.tsx`.

Przez admin API utworzono i opublikowano fixture pages:

- `/audit-31-05-spacer` - responsive, Hero gap values `24/20/16`,
  `showGuideInEditor=true`,
- `/audit-31-05-spacer-fixed` - fixed mode with custom safe desktop `10vh`
  and preserved responsive fallbacks,
- `/audit-31-05-spacer-no-guide` - responsive Card gap values `8/6/4`,
  `showGuideInEditor=false`,
- `/audit-31-05-spacer-unsafe` - unsafe imported height strings,
- `/audit-31-05-spacer-invalid` - invalid variant.

Admin UI pass objal `Run setup again`, Wizard read-only setup summary, Visual
variant cards, rhythm presets, height selectors, hidden custom-value state,
editor guide toggle, block layout/visibility and Advanced diagnostics. Public
runtime sprawdzono realnym DOM-em: `data-spacer-*` markers, CSS custom
properties, computed height, `aria-hidden`, guide gating, invalid variant,
unsafe length normalization and breakpoint behavior at 375/800/1280 px.

## Pokrycie UI

Przetestowane:

- Wizard: read-only spacer mode, rhythm and desktop-height setup summary,
- Visual: responsive/fixed variant ownership, presets, desktop/tablet/mobile
  heights, hidden custom state and editor guide,
- Advanced: read-only runtime and support summaries,
- public runtime: responsive, fixed, no-guide, unsafe-length, invalid variant
  and three viewport widths.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta `/audit-31-05-spacer` | Visual root istnieje; `Responsive` selected, `Hero gap` selected, guide on. | HTTP 200, rootCount `1`, `aria-hidden=true`, `data-spacer-variant=responsive`, `24/20/16`, computed desktop height `96px`. | Dziala | Defaults/normalizer and renderer markers stable. | Brak. |
| Responsive variant | Visual responsive fixture | Variant section exposes `variant`; duplicate writable paths `[]`; tablet and mobile controls visible. | Public responsive root keeps desktop/tablet/mobile separately. | Dziala | `resolveSpacerVariant()` defaults to responsive and Visual owns variant. | Brak. |
| Fixed variant | `/audit-31-05-spacer-fixed` | Fixture uses fixed mode; code path shows fixed copy and desktop-only runtime behavior. | Public root has `variant=fixed`, desktop/tablet/mobile all `10vh`, computed height `72px` at 1280x900. | Dziala | Renderer sets tablet/mobile to desktop when `variant=fixed`. | Brak. |
| Rhythm presets | Visual responsive fixture | `Current preset: Hero gap`; Card/Section are `Apply`, Hero is `Selected`. | Public attrs `desktop=24`, `tablet=20`, `mobile=16`; no persisted preset marker. | Dziala | Presets are transient and write concrete height values. | Brak. |
| Desktop height | Visual responsive fixture | Desktop combobox shows `Hero gap`, path `height.desktop`. | Public `--spacer-desktop-height:6rem`; desktop computed height `96px`. | Dziala | Token map resolves `24 -> 6rem`. | Brak. |
| Tablet height | Visual responsive fixture | Tablet combobox shows `Large section gap`, path `height.tablet`. | At 800px, computed height `80px`; public CSS var `5rem`. | Dziala | Breakpoint class `md:h-[var(--spacer-tablet-height)]`. | Brak. |
| Mobile height | Visual responsive fixture | Mobile combobox shows `Section gap`, path `height.mobile`. | At 375px, computed height `64px`; public CSS var `4rem`. | Dziala | Base class uses mobile height. | Brak. |
| Breakpoint behavior | Public resize 375/800/1280 | Nie dotyczy admin. | 375 => `64px`, 800 => `80px`, 1280 => `96px`; no overflow at any width. | Dziala | Responsive classes map mobile/tablet/desktop vars deterministically. | Brak. |
| Editor guide on | Visual responsive fixture | Switch `showGuideInEditor` is writable; Wizard says Visual owns guide. | Public has `data-spacer-show-guide=true` but `childElementCount=0`; guide does not leak to public. | Dziala | Guide renders only with previewDevice/editor-preview/admin-preview context. | Brak. |
| Editor guide off | `/audit-31-05-spacer-no-guide` | Fixture stores `showGuideInEditor=false`. | Public marker false, no child guide, Card gap height `32px` desktop. | Dziala | Boolean normalizer preserves explicit false. | Brak. |
| Custom safe lengths | `/audit-31-05-spacer-fixed` | UI keeps custom values as replaceable saved custom state; no free raw authoring in Visual. | Public accepts safe `10vh` desktop and fixed mode emits `10vh` for all breakpoints. | Dziala | Normalizer accepts bounded viewport and clamp lengths for compatibility. | Brak. |
| Unsafe length strings | `/audit-31-05-spacer-unsafe` | Nieosiagalne przez normalny UI; API/import edge. | Public root renders safe defaults `16/12/8`, no raw `url(...)`, `calc(...); color:red`, or `var(--unsafe-spacer)` in style. | Dziala fail-safe | Schema accepts strings, but `normalizeSpacerCustomHeightInput()` rejects unsafe lengths before renderer. | Brak. |
| Invalid variant | `/audit-31-05-spacer-invalid` | Nieosiagalne przez normalny UI; API/import edge. | HTTP 200, rootCount `0`, `Invalid widget data`, no raw invalid data. | Dziala fail-closed | Widget validator rejects invalid variant. | Brak. |
| Wizard | `Run setup again` | Wizard root exists, `writablePaths=[]`, `readonlyPaths=["variant","height","height.desktop"]`, no raw controls; summary shows `Desktop: 24 / Tablet: 20 / Phone: 16`. | Nie dotyczy bez zapisu. | Dziala | Wizard is read-only setup summary. | Brak. |
| Visual ownership | Rich admin inspect | Sections: Variant, Responsive heights, Editor guide, block layout, visibility; `unwrappedControls=[]`, `rawControlCount=0`. | Public output matches saved Visual-owned values. | Dziala | Editor contract and metadata align. | Brak. |
| Advanced diagnostics | Rich admin inspect | Advanced root exists, `writablePaths=[]`, `rawControlCount=0`, no unwrapped controls; summaries show Hero/Large section/Section gap and guide shown. | Nie dotyczy bez zapisu. | Dziala | Advanced uses readonly summary rows and shared readonly layout/visibility summaries. | Brak. |
| Slots / Structure | Inspect widget definition and admin UI | No Structure section for Spacer; no add/move/remove controls. | Public renders one decorative empty block only. | Dziala | Spacer has no slots by product contract. | Brak. |

## Znaleziska do poprawy

Brak nowych defektow funkcjonalnych w current-state pass.

Stare ryzyka z raportu 28/29-05 wygladaja na zamkniete:

- duplicate `none` / `0` is hidden in UI through shared token helper,
- fixed mode preserves responsive fallbacks and renders desktop height at
  runtime,
- Advanced is read-only and variant-aware,
- guide copy is truthful and public guide output is gated,
- unsafe imported height strings fall back to deterministic defaults before
  inline CSS output.

## Co dziala

- Responsive and fixed variants render deterministic public markers.
- Presets are transient shortcuts and write concrete height triplets.
- Breakpoint heights work at mobile/tablet/desktop widths without overflow.
- Safe custom length compatibility works for `vh` and bounded `clamp(...)`.
- Unsafe custom length strings are rejected by normalizer and do not leak to
  public inline style.
- Wizard and Advanced are read-only; Visual owns daily editing.
- Spacer remains decorative (`aria-hidden=true`) and has no slots/actions.

## Kodowe punkty kontroli

- Schema keeps `height.desktop/tablet/mobile` as strings for compatibility:
  `core/widgets/core/spacer.tsx:97-111`.
- Safe length parser accepts only bounded patterns:
  `core/widgets/core/spacer.tsx:230-244`.
- Runtime fixed mode copies desktop to tablet/mobile:
  `core/widgets/core/spacer.tsx:329-338`.
- Guide output is editor/preview-gated:
  `core/widgets/core/spacer.tsx:339-343`.
- Renderer emits only normalized vars and markers:
  `core/widgets/core/spacer.tsx:354-379`.
- Visual hidden custom state uses `allowCustom={false}`:
  `core/admin/ui/widgets/editors/SpacerEditors.tsx:253-292`.

## Walidacja

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx`
  - PASS: 5 files, 58 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/README.md` -
  PASS.
- `perl -ne 'print "$ARGV:$.: trailing whitespace\n" if /[ \t]$/; print "$ARGV:$.: space before tab\n" if / \t/;' ...`
  on Spacer report and Playwright scripts - PASS.
- `LC_ALL=C rg -n "[^\x00-\x7F]" ...` on Spacer report and Playwright
  scripts - PASS (no non-ASCII).
