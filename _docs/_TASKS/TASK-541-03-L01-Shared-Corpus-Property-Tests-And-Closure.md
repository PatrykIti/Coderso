# TASK-541-03-L01: Shared Consumer Parity and Closure

# FileName: TASK-541-03-L01-Shared-Corpus-Property-Tests-And-Closure.md

**Parent Subtask:** TASK-541-03
**Priority:** High
**Category:** Shared Styling / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-541-02-L03
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Exclusive ownership

Own only:

- new additive `tests/vitest/services/css-color-consumer-parity.test.ts`;
- `_docs/DESIGN_TOKENS.md`, `_docs/THEMES_SPEC.md`, `_docs/PAGE_MODEL.md`,
  `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/WIDGETS.md`, and `docs/develop/content-and-widgets.md`;
- retained compatibility docs `_docs/_WIDGETS/SECTION.md`, `TABS.md`,
  `ACCORDION.md`, `CONTACT.md`, `DIVIDER.md`, `TOGGLE_BLOCK.md`,
  `NAVIGATION.md`, `FOOTER.md`, `GRID_COLUMNS.md`, `NEWSLETTER.md`,
  `FORM_EMBED.md`, `TIMELINE.md`, `HERO.md`, `GALLERY_MOSAIC.md`, and
  `CTA_BANNER.md`;
- TASK-541 descendants/parent, its board row/statistics, changelog 1253 and
  changelog index;
- task-scoped screenshots and concise closeout evidence under
  `_docs/_workflows/_smoke/`.

Every existing test edited by L01/L02/L03 is read-only in closure. Reread indexes
fresh and touch only TASK-541 rows/statistics. Do not edit production source or
another task family. Serialize with TASK-481 if it owns a shared Page/control
test. Documentation must state that Dashboard is the only configurable widget
surface; compatibility docs do not advertise insertion or authoring. There is no
pack-readiness change, so do not edit `_docs/WIDGET_PACK_MATRIX.md`.

## Additive parity test pseudocode

Import the immutable `cssColorCorpus.ts` fixture from TASK-541-01-L02. Do not
copy acceptance tables or rebaseline source-owner tests.

```text
for each value accepted by the authoring profile:
  pass the original, untouched corpus input to every consumer
  canonical normalize(value) = expected bytes
  authoring-profile admin commit adapter(value) = expected bytes
  Menu normalizer(value) = expected bytes
  Form inherited-profile superset normalizer(value) = expected bytes
  each applicable declared authoring/inherited compatibility resolver(value) = expected bytes

for each accepted value, in a separate idempotence pass:
  feed expected bytes—not the original input—through every applicable consumer
  each consumer returns expected bytes again

for currentColor/inherit:
  feed each original corpus spelling through authoring/admin-default/Menu and reject
  feed it through only the explicitly inherited admin control adapters and emit
    canonical bytes
  Form write/read/control/preview/public-render accepts canonical bytes through
    the explicit inherited-render profile inherited from TASK-516
  each explicitly inherited retained read/render field accepts canonical bytes
  Section/Divider nested gradient stops and Hero overlay stops reject inherit but
    accept currentColor; direct inherited properties accept both

for each rejected/oversized value:
  no admin commit; Menu follows its exact throw/drop/omit policy;
  Form inherited-profile write/route and retained render fail closed; no raw timeline fallback
```

Generate max/max+1 values from `CSS_COLOR_VALUE_MAX_LENGTH`, never a repeated
literal `128`. Assert schemas use the imported cap and structural pattern while
semantic out-of-range values still reject. Add a source inventory assertion that
every production M-04 `resolveClearableCssColorValue` caller is explicitly
classified and the color mirrors enumerated by TASK-541-02-L03 contain no copied
hex/rgb/hsl semantic grammar. The sole declared exception is the exported
`CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN` beside
`parseCtaBannerBackgroundGradient`: inventory asserts exactly one production owner,
schema reuse, and no copied CTA editor/source acceptance regex. It is tested against
`CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH`, not the simple-color corpus cap. Do not
claim coverage of every unrelated historical raw-style/composite contract.

The parity suite calls each consumer with `case.input` exactly as stored in the
immutable fixture; it must not trim, lowercase, stringify, or substitute
`case.parser[profile]?.normalized` before the first call. Assert the source-owned
test inventory includes, for every changed normalizer/helper, exact-cap and cap+1
ASCII U+0020 padding plus C0/C1-control and Unicode-whitespace cases. The exact-cap
terminal canonicalizes, cap+1 rejects before trimming, and control/non-ASCII-space
input rejects even when a generic `trim()` would expose a valid terminal. CTA's
composite parser uses the same raw-order assertions with its own exported cap and
does not consume `CSS_COLOR_CORPUS_CASES` as if a full gradient were a simple color.

This additive `.test.ts` suite stays pure and does not mount React. Exact
`SharedColorControl`/Section/Contact inherited-state DOM proof—`kind="inherited"`,
label `Inherited color`, `data-shared-color-state="inherited"`, and zero mount
emission—remains in the source-owned UI suites from L01/L03 and is rerun read-only.
The existing Grid Columns, Newsletter, and Timeline editor-wave suites are also
read-only compatibility gates unless TASK-541-02-L03 recorded a concrete
preprocessing/raw-fallback edit before implementation; only then is the affected
suite a landed changed-behavior suite rather than a read-only gate.

Page is a read-only compatibility gate in TASK-541. Its shared admin adapter uses
`authoring`, while its existing sanitizer still applies the narrower seven-token
allowlist. Test only `primary`, `secondary`, `accent`, `bg`, `surface`, `text`,
and `border` in the owner's exact order. TASK-539-02-L01 is the recorded source handoff that imports the shared
parser into Page sanitizer code without dropping this second allowlist.

## Automated validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts tests/vitest/ui/color-value.test.ts tests/vitest/ui/color-swatch-alpha.test.tsx tests/vitest/ui/shared-color-alpha.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/clearable-fields-alpha.test.tsx tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui/menu-color-alpha.test.tsx tests/vitest/ui/menu-design-editor.test.tsx tests/vitest/services/normalize-menu-appearance.test.ts tests/vitest/services/menu-document-v2.test.ts tests/vitest/forms/formSettings.test.ts tests/vitest/forms/formTheme.test.ts tests/vitest/admin/formDesignPanel.test.tsx tests/vitest/admin/formCanvas.test.tsx tests/vitest/admin/formRuntimePreviewDialog.test.tsx tests/vitest/forms/formRuntimeResolver.test.ts tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/widgets/clearableStyle.test.ts tests/vitest/widgets/section.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx
set -a && source .env && set +a
bun test tests/integration/routes/menus.test.ts
bun test tests/integration/routes/forms.test.ts
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

Rerun every named failing file alone before classification. A missing named file
or missing test result is failure, never a silent pass. The strict scan must run
and its exit code must be reported truthfully: exit zero is green. A nonzero result
may be recorded as an external, non-green result only when its sole finding is the
unchanged TASK-545-owned workflow finding already present before TASK-541 and the
touched-path scan is clean. Any TASK-541 finding, new/additional finding, scanner
tooling failure, or inability to prove identity blocks closure. Never suppress,
allowlist, or describe a nonzero strict scan as passing.

## Real browser smoke

Restart with the literal command
`coderso-dev-core-host /home/coder/project/Coderso` and verify both
`http://coderso-a.localhost:5173/admin/` and
`http://coderso-a.localhost:3000` respond. Load credentials only from `.env`.
The canonical seven-flow run uses the full
`playwright-cli -s=wf541smoke ...` command for every browser action. A verified
remediation rerun may use a distinct documented `wf541*` session so its evidence
cannot collide with the canonical run, but every action must still be a separate
full CLI command and the report must name and close that exact session. Do not
substitute an in-process Playwright script. Save screenshots under the
task-scoped `_docs/_workflows/_smoke/` path.

Execute at least these seven supported real flows:

1. Menu Design, light: set a deep-nested level-2 color (mandatory; no shallower
   nav-chrome/scrolled substitute) to
   hex8 plus opacity → save → reopen → publish → front computed color/alpha.
2. Menu Design, dark: leading-dot RGBA → canonical `0.x` persisted bytes →
   front computed parity.
3. Menu Design: HSL and HSLA (including `deg`/alias arity) → canonical
   save/reopen/front parity.
4. Menu Design: out-of-range RGB/HSL → rejected commit, unchanged persisted
   document, no optimistic preview.
5. Page section/block: one of the seven Page tokens → transparent → clear →
   save/publish/reopen/front; assert the visible fallback at a narrow viewport.
6. Page section/block: HSL then hex8 → save/reopen/front computed parity at
   wide/light and narrow/dark viewports.
7. Form Design + supported Page Form block: create a uniquely prefixed Form with a
   visible labelled field, set `theme.submit.background` to an accepted case
   variant of `currentColor`, and set `theme.submit.textColor` to a distinctive
   explicit literal whose computed RGB is unambiguous. Save and reopen the Form;
   assert persisted bytes are exactly canonical `currentColor` plus the canonical
   explicit text color and that mount/reopen emits no normalization write. Create a
   uniquely prefixed Page, insert its supported Page-domain `form` block, choose
   that Form through the block's Form selector, save and publish the Page, then open
   the published Page on the front. In both Form editor preview and published Page
   runtime, assert the visible submit button's computed `background-color` equals
   its computed `color`, and that both equal the distinctive expected RGB. This
   proves `currentColor` resolves from the submit button's authored text color.
   After save/reopen, use the top-bar `Runtime preview` action and require an
   actual `role="dialog"` named `Form Runtime Preview`; capture that open dialog
   and its runtime submit computed styles separately from the published Page.
   The ordinary Design canvas, a mere control/swatch assertion, or a direct
   unsupported Form URL is insufficient.

Assert visible effects (computed CSS/geometry/DOM state), persisted bytes, light
and dark admin themes, and zero console/page errors. Do not create or save a
historical widget instance, Widget Template, preset, or public widget fixture.
Historical retained-widget `currentColor`/`inherit` behavior is Vitest/SSR-only;
the supported Form-through-Page-block flow above is the sole persisted/public
inherited-keyword smoke.
An optional
`/admin/advanced/widgets` check may open an already-existing Configure preview
without inserting or saving anything, but is not acceptance-critical.

TASK-545 lands later. Do not pre-create its future manifest or `.gitignore`
contract.

Use uniquely prefixed Menu/Page/Form fixtures wherever the UI supports creation.
Before mutation record the active published resource and admin theme state; after
the assertions delete every task-created fixture, restore any pre-existing active
Menu/publish state and light/dark preference changed by smoke, and verify the front
surface returned to its baseline. Delete every task-created Menu, Page, and Form;
the Form smoke must delete both its created Page and Form after
unpublishing/removing the Page as required by the UI. Every
cleanup/restoration browser operation uses the same documented task-scoped
session as that run. The canonical run finishes with literal
`playwright-cli -s=wf541smoke close`; a remediation run finishes with the same
full `playwright-cli -s=<documented-wf541-session> close` form for its exact
session. Then terminate the running `coderso-dev-core-host` process with its
normal interrupt/cleanup path and verify its API/admin/site processes stopped.
Do not leave a session, fixture, preference, or helper-owned server behind.

## Post-audit and closure

Run about five fresh lenses: policy/range correctness, admin/Menu/Form parity,
present-only legacy behavior, security/no-mirror inventory, and test/docs/task
graph. Findings require `file:line`. Fix verified HIGH/MEDIUM, rerun targeted
gates, and run a fresh reconcile.

Document profiles, ranges, arity/HSL canonicalization, structural-schema limits,
Page's second seven-token filter, Form's end-to-end TASK-516 inherited exception,
explicit retained inherited opt-ins, gradient `inherit` rejection, and the
Dashboard-only product-widget boundary. Create changelog 1253
with the actual date. Close descendants before parent, recompute board statistics,
and record tests, smoke, audit summary, and owner commit scope. Do not commit.

## Closure record

- Source and test owners completed the six-leaf sequence. The additive parity
  suite consumes original immutable corpus inputs, verifies canonical
  idempotence, inventories 86 classified clearable call sites and 66 structural
  regex nodes, and keeps CTA's composite gradient grammar separately owned. Its
  immutable source/AST cache removes the confirmed under-load timeout without
  changing a timeout or assertion. The no-theme Form Embed test pins the exact
  pre-task HEAD output length and SHA-256.
- Final stabilized closure validation passed 55 Vitest files / 1,428 tests,
  40 DB-backed Menu/Form route tests / 392 expectations, core lint/type lint,
  root TypeScript, Admin build (2,637 modules), the 776-file boundary check,
  bundle budgets (34.94/192.42/218.79 KiB gzip), all five release gates,
  `node --check`, and `git diff --check`. The strict scan's only non-green result
  is the exact unchanged TASK-545-owned finding in
  `_docs/_workflows/task-522-author.mjs`; all other scanners are clean and no
  scanner exception changed.
- Five independent final lenses are clean at 0 High/Medium/Low. They corrected
  over-broad present-only prose by distinguishing sparse owner contracts from
  retained legacy defaults/sentinels, rejected the first false-clean Runtime
  Preview evidence, required a pre-closure visual audit, and closed the resulting
  dialog-description warning with semantic markup plus a real regression.
- The canonical seven-flow run used `playwright-cli -s=wf541smoke`; the final
  corrective Flow 7 used full commands with the documented task-scoped session
  `wf541flow7final`. On current post-repair source, one Form persisted canonical
  `currentColor` plus `rgb(12, 34, 56)`, reopened without a mount write, rendered
  the actual role/name/described Runtime Preview and the published Page Form
  block with equal computed colors, and produced zero console errors, console
  warnings, or page errors. All 21 retained audit screenshots are valid unique
  PNG evidence; exact fixture IDs/routes, state, browser, ports, and helper
  cleanup were independently verified.
- Changelog 1253 covers every family ID. Owner commit scope is limited to
  TASK-541-owned source/tests/docs/workflow/evidence/task-board/changelog files;
  no agent staged or committed.
