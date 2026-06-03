# RAPORT: Hero Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony po remediacji TASK-371. Pierwszy UI-first pass zostal
> uzupelniony o Hero UI replay, kodowy fix CTA oraz udokumentowana probe
> targeted Playwright contract smoke.
> **Strona admin:** `Audit 31-05 Hero`
> **Admin page id:** `1b9072a3-fd31-45f0-bf2f-33054ff3f900`
> **Public route:** `/audit-31-05-hero`
> **Playwright session:** `codex-31-05-ui-hero2`
> **Claude:** probowano uruchomic non-interactive w pierwszym pass; CLI zwrocil
> `401 Invalid authentication credentials` przed testem. TASK-371 staged
> remediation review zwrocil no blockers.

## Metoda

Test byl prowadzony od UI:

1. Otworzono nowa strone `/audit-31-05-hero` z domyslnym blokiem Hero.
2. Zaznaczono blok w page builderze i klikano kontrolki Visual.
3. Efekt sprawdzano na zywej preview sekcji w adminie przez DOM, klasy i
   computed style.
4. Public route sprawdzono przez HTTP/HTML po stronie `http://localhost:3000`.
5. Dla znalezionego dryftu wykonano krotki audyt kodu w `HeroEditors.tsx` i
   `hero.tsx`.

## Pokrycie UI

Przetestowane w tej czesci:

- warianty: Centered, Media Right, Media Left, Media Center,
- CTA layout: Single CTA, Dual CTA,
- headline input,
- `badge.enabled` / `socialProof.enabled` toggles,
- `style.textColor` swatch + Clear,
- public SSR baseline.

Domkniete w TASK-371 replay:

- destination picker primary/secondary/badge,
- background color, gradient, background media and overlay controls,
- media type image/video/none, media picker, poster picker, ratio and overlay,
- layout, spacing, height, bleed, hide-media-on-mobile,
- typography, shadow, border, radius, motion and font controls,
- rich headline/body toolbar and sanitizer feedback,
- social proof fields and Media Library avatar picker,
- Advanced read-only summaries and normalized runtime diagnostics.

Targeted Playwright contract smoke zostal uruchomiony, ale lokalne srodowisko
nie mialo dostepnego admin smoke health i public fixture `/homepage`, wiec live
browser smoke pozostaje zapisanym environment/fixture gapem, nie nowym Hero
findingiem.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Centered | Klik karta wariantu | Preview przelacza layout na `flex flex-col gap-4`; brak placeholdera media; headline zostaje widoczny. | Public baseline renderuje domyslny centered SSR. | Dziala | Renderer wybiera `resolvedVariant === "centered"` i nie renderuje ramki media. | Brak. |
| Variant: Media Right | Klik karta wariantu | Preview ma `md:flex-row`; pojawia sie placeholder `Select media type`. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` traktuje `split` jako media-right. | Brak. |
| Variant: Media Left | Klik karta wariantu | Preview ma `md:flex-row-reverse`; pojawia sie placeholder `Select media type`. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` rozpoznaje `media-left` jako split z odwrocona kolejnoscia. | Brak. |
| Variant: Media Center | Klik karta wariantu | Preview ma `flex flex-col items-center gap-8`; pojawia sie inline media placeholder. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` renderuje `isMediaCenter`. | Brak. |
| CTA layout: Single CTA | Wybor z selecta | `secondaryCta.*` znika z inspektora; preview ma 1 link CTA. | Nie publikowano tej zmiany. | Dziala | Single CTA nadal zapisuje prawdziwy single-CTA stan przez `secondaryCta: undefined`; editor-local ref zachowuje ostatni uzyteczny secondary CTA tylko na potrzeby powrotu do Dual. | Brak. |
| CTA layout: Dual CTA po Single CTA | Wybor z selecta po wczesniejszym Single | Kontrolki secondary wracaja z ostatnim uzytecznym CTA lub domyslnym `Learn more` / `#`; preview ma drugi renderowalny link. | Runtime nadal pomija naprawde puste CTA, a UI nie tworzy juz pustego fallbacku po `Single -> Dual`. | Dziala po remediacji | TASK-371 dodaje `resolveUsefulHeroCta()`, `heroSecondaryCtaFallback` i editor-local `lastUsefulSecondaryCtaRef`; renderer pozostaje fail-closed dla pustych CTA. | Naprawione w TASK-371; pokryte regresja UI. |
| Headline | Fill `Audit Hero Headline 31` | `h1` w admin preview zmienia tekst natychmiast. | Nie publikowano tej zmiany. | Dziala | Input jest Visual-owned i aktualizuje `headline`. | Brak. |
| `badge.enabled` | Toggle | `aria-checked` zmienia stan; badge znika/wraca w preview, gdy dane badge sa obecne. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` renderuje badge tylko przy `normalized.badge?.enabled`. | Brak. |
| `socialProof.enabled` | Toggle | `aria-checked` zmienia stan; social proof renderuje sie warunkowo. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` renderuje `data-widget-part="hero.social-proof"` tylko przy enabled. | Brak. |
| `style.textColor` | Swatch ustawiony na `#00ff00`, potem Clear | Headline zmienia computed color na `rgb(0, 255, 0)`; kontrolka pokazuje `Selected color`; Clear przywraca `Theme default` i computed color `rgb(15, 23, 42)`. | Nie publikowano tej zmiany. | Dziala | `HeroColorField` `onChange` aktualizuje `style.textColor`; Clear usuwa zapisane pole. | Brak. |
| Destination picker primary/secondary/badge | UI replay wybiera znane strony i sprawdza custom destination copy | Page-first selecty aktualizuja `primaryCta.href`, `secondaryCta.href` i `badge.href`; raw unsafe URL input nie jest eksponowany. | Renderer normalizuje linki przez `normalizeHeroHref()` i puste/unsafe CTA odpadaja. | Dziala | Shared `LinkDestinationField` + Hero safe href normalizer. | Brak. |
| Media type image/video/none + picker | UI replay wybiera video/image, assety, poster, ratio i clear | Media Library picker zapisuje `assetId/src`; image alt przechodzi w video title/description; `none` czysci inline media. | Renderer pokazuje placeholder tylko dla wybranego typu bez URL i renderuje media po safe normalized data. | Dziala | `resolveMediaTypeTransition()`, `HeroMediaSourceFields`, `HeroPosterFields`, `normalizeHeroMedia()`. | Brak. |
| Background color/gradient/media/overlay | UI replay ustawia kolor, gradient angle/start/end, background image media i clear to none | Background controls zapisują bounded values bez raw URL pola; overlay uzywa color+strength. | Public style sklada bezpieczne `backgroundColor`, `backgroundImage` i overlay layers. | Dziala | `HeroGradientField`, `HeroOverlayField`, `normalizeHeroBackground()`. | Brak. |
| Layout/spacing/height/bleed/mobile media | UI replay pokrywa alignment, spacing controls and contract metadata | Visual exposes writable layout paths and hide-media-on-mobile switch. | Renderer mapuje bounded layout/spacing/height/bleed tokens na klasy/inline spacing. | Dziala | Bounded layout normalizers and literal class maps in `hero.tsx`. | Brak. |
| Typography/shadow/border/radius/motion | UI replay ustawia headline/subhead/body sizes, weights, shadows, radii, borders and motion | Controls expose bounded selects with `none` where supported; no raw CSS text inputs. | Renderer uses fixed class/value maps and reduced-motion-safe animation classes. | Dziala | `normalizeHeroStyle()` and token maps. | Brak. |
| Rich headline/body toolbar | UI replay covers rich text adapters and sanitizer diagnostics | Rich copy uses shared toolbar; unsupported pasted markup produces visible sanitizer feedback. | Renderer uses sanitized rich HTML and falls back to plain headline/body when empty. | Dziala | `PostRichTextAdapter`, `sanitizeRichTextHtmlWithDiagnostics()`, `sanitizeRichTextHtml()`. | Brak. |
| Social proof avatars | UI replay enables social proof and selects avatar media | Avatar rows use Media Library picker and saved external avatar replacement copy; limit remains 5. | Renderer only outputs normalized avatars with non-empty `src`. | Dziala | `HeroAvatarAssetField()` and `normalizeHeroSocialProof()`. | Brak. |
| Advanced summaries | Advanced editor render replay | Advanced exposes read-only layout/style/media/accessibility/runtime/contract summaries and no writable controls. | Nie dotyczy public bez zapisu. | Dziala | `HeroAdvancedEditor` uses normalized runtime summaries. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-hero` zwrocil HTTP 200 i SSR HTML z:

- `h1`: `Build your system with Coderso`,
- primary CTA: `Get started`,
- secondary CTA: `Learn more`,
- domyslny `centered` layout.

To potwierdza, ze nowa strona audytowa publikuje domyslny Hero. Zmiany z
klikanej sesji admin nie zostaly uzyte jako finalny stan publiczny w tym
czesciowym pass.

## Console / srodowisko

- Podczas przejscia do kolejnego widgetu core server zaczal timeoutowac przez
  Vite proxy; helper zostal zrestartowany zgodnie z instrukcja uzytkownika.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- TASK-371 smoke attempt:
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-371-hero-2026-06-01.*` reports
  `admin_unreachable` and public `/homepage` HTTP 404 in this local DB.
- TASK-371 admin-only smoke attempt:
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-371-hero-admin-2026-06-01.*`
  also reports `admin_unreachable`. `curl` against `/admin/` returned HTTP
  200 during the same session, so this is tracked as smoke environment
  instability rather than a Hero widget defect.

## Znaleziska i remediacja

### HERO-31-05-01 - Dual CTA should restore a useful secondary CTA after Single CTA

**Status:** fixed in TASK-371 on 2026-06-01.

**Original evidence:** Single CTA removed `secondaryCta`; Dual CTA restored
`{ label: "", href: "" }`; renderer correctly omitted the empty secondary CTA.

**Fix:** `HeroVisualEditor` now resolves useful CTA objects, stores the last
useful secondary CTA in editor-local ref state while Single is active, and
restores that value or `heroDefaults.secondaryCta` on Dual. Runtime remains
unchanged and still omits truly empty CTA data.

**Regression:** focused UI test failed before the fix with
`expected { label: "", href: "" }` and passes after the fix for both authored
and default fallback restoration.

### HERO-31-05-02 - Finish the remaining Hero option matrix from the report

**Status:** closed in TASK-371 on 2026-06-01 with automated UI replay evidence.

The remaining matrix is covered by `tests/vitest/ui/hero-editor-wave.test.tsx`
and adjacent Hero renderer/editor tests. No additional product defect was
confirmed while closing the matrix. Live Playwright contract smoke was
attempted and documented as environment/fixture-blocked in this local checkout.

## Walidacja TASK-371

- Focused CTA regression before fix:
  - FAIL: `expected { label: "", href: "" }` after `Single -> Dual`.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/hero-editor-wave.test.tsx -t "restores a useful secondary CTA"`
  - PASS: 1 test, 19 skipped.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/hero.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
  - PASS: 2 files, 46 tests.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/hero.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx`
  - PASS: 3 files, 52 tests.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `git diff --check` - PASS.
- `bun scripts/playwright-widget-contract-smoke.ts --session task-371-hero-2026-06-01 --admin http://localhost:5173/admin --front http://localhost:3000 --widget hero --strict ...`
  - Attempted; artifact reports `admin_unreachable` and public `/homepage`
    HTTP 404 fixture gap.
- `bun scripts/playwright-widget-contract-smoke.ts --session task-371-hero-admin-2026-06-01 --admin http://localhost:5173/admin/ --front http://localhost:3000 --widget hero --strict --skip-front ...`
  - Attempted; artifact reports `admin_unreachable`.
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.8 "Review the current staged TASK-371 Hero diff only..."`
  - PASS: no blockers; Claude confirmed the hooks/compiler shape, CTA
    restoration contract, runtime contract, tests, task board/changelog, and
    honest Playwright smoke gap wording.
