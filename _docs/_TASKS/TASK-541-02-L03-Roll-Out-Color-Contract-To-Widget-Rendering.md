# TASK-541-02-L03: Roll Out Color Contract to Form and Retained Rendering

# FileName: TASK-541-02-L03-Roll-Out-Color-Contract-To-Widget-Rendering.md

**Parent Subtask:** TASK-541-02
**Priority:** High
**Category:** Forms / Retained Compatibility / Schema / Render Security
**Estimated Effort:** Large
**Dependencies:** TASK-541-02-L02
**Status:** ✅ Done
**Started:** 2026-07-11
**Reopened:** 2026-07-12 (verified Runtime Preview description warning)
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Product boundary

This leaf is maintenance, not product expansion. Configurable product widgets
remain Dashboard-only and are not touched. Forms remain a Form-domain
section/block editor. Files under `core/widgets/*` and their historical editors
are retained read/render compatibility seams only: do not add a type, preset,
module-pack entry, Widget Template, Wizard/Visual/Advanced capability, insertion
path, persistence API, or public authoring surface.

## Exclusive source and test ownership

Own only the M-04 shared-helper callers and the enumerated true color-contract
mirrors below. This is not a claim over every historical caller of
`resolveClearableStyleValue` or every raw-style/composite grammar in
`core/widgets/*`:

- shared compatibility boundary: `core/widgets/core/clearableStyle.ts`;
- Form domain/read-render bridge:
  `core/services/forms/formSettings.ts`, `core/services/forms/formTheme.ts`, and
  `core/widgets/core/formEmbed.tsx`;
- Form control seam: `core/admin/ui/forms/FormDesignPanel.tsx`;
- post-smoke Form preview accessibility repair:
  `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`; the only permitted change
  is to connect the already-visible explanatory copy through
  `DialogDescription`, preserving its exact text/classes/layout and adding no
  color or product behavior;
- retained render/schema modules:
  `core/widgets/core/section.tsx`, `tabs.tsx`, `accordion.tsx`, `contact.tsx`,
  `toggleBlock.tsx`, `divider.tsx`, `navigation.tsx`, `gridColumns.tsx`,
  `footer.tsx`, `newsletter.tsx`, `timeline.tsx`, `hero.tsx`,
  `galleryMosaic.tsx`, and `ctaBanner.tsx`;
- retained editor compatibility only:
  `core/admin/ui/widgets/editors/SectionEditors.tsx`, `TabsEditors.tsx`,
  `AccordionEditors.tsx`, `ContactEditors.tsx`, `ToggleBlockEditors.tsx`,
  `DividerEditors.tsx`, `NavigationEditors.tsx`, `FooterEditors.tsx`,
  `HeroEditors.tsx`, `GalleryMosaicEditors.tsx`, and `CtaBannerEditors.tsx`.

`GridColumnsEditors.tsx`, `NewsletterEditors.tsx`, and `TimelineEditors.tsx` are
read-only compatibility consumers: they already compose the shared authoring
control and are not edited merely to restate that profile. Their exact editor-wave
suites below are mandatory read-only gates. If implementation proves that one of
these files preprocesses an owned color before the landed shared adapter or retains
a raw fallback, stop and record that concrete region plus its suite as
changed-behavior single-writer ownership in this leaf before editing it; do not
silently broaden ownership to unrelated editor behavior.

Own the changed-behavior tests and update them before this source gate:

- immutable, test-only shared tables in
  `tests/vitest/forms/formColorConsumerTable.ts`,
  `tests/vitest/widgets/retainedColorConsumerTable.ts`, and
  `tests/vitest/widgets/ctaBannerColorConsumerTable.ts`; these files contain
  fixed inputs/expected bytes and field-path adapters only, import production
  owners for execution, and must not reimplement production parsing or
  normalization;

- `tests/vitest/forms/formSettings.test.ts` and
  `tests/vitest/forms/formTheme.test.ts`;
- `tests/vitest/admin/formDesignPanel.test.tsx`,
  `tests/vitest/admin/formCanvas.test.tsx`,
  `tests/vitest/admin/formRuntimePreviewDialog.test.tsx`,
  `tests/vitest/forms/formRuntimeResolver.test.ts`, and
  `tests/vitest/widgets/formRuntimeScript.test.ts`;
- DB-backed Form schema/route coverage in `tests/integration/routes/forms.test.ts`;
- `tests/vitest/widgets/clearableStyle.test.ts`, `section.test.tsx`,
  `tabs.test.tsx`, `accordionWidget.test.tsx`, `contact.test.tsx`,
  `toggleBlock.test.tsx`, `divider.test.tsx`, `navigation.test.tsx`,
  `gridColumns.test.tsx`, `footer.test.tsx`, `newsletter.test.tsx`,
  `formEmbed.test.tsx`, `timeline.test.tsx`, `hero.test.tsx`,
  `heroEditors.test.tsx`, `galleryMosaic.test.tsx`, and `ctaBanner.test.tsx`;
- `tests/vitest/ui/section-editor-wave.test.tsx`,
  `tabs-editor-wave.test.tsx`, `accordion-editor-wave.test.tsx`,
  `contact-editor-wave.test.tsx`, `toggle-block-editor-wave.test.tsx`,
  `divider-editor-wave.test.tsx`, `navigation-editor-wave.test.tsx`, and
  `footer-editor-wave.test.tsx`, `hero-editor-wave.test.tsx`,
  `gallery-mosaic-editor-wave.test.tsx`, and `cta-banner-editor-wave.test.tsx`.

The existing `tests/vitest/ui/grid-columns-editor-wave.test.tsx`,
`newsletter-editor-wave.test.tsx`, and `timeline-editor-wave.test.tsx` suites are
mandatory read-only compatibility gates unless the stop-and-record condition above
is met, in which case only the affected suite becomes a changed-behavior test owned
by this leaf.

TASK-541-03-L01 reruns all of these read-only. Do not change unrelated defaults,
keys, render structure, runtime scripts, pack readiness, or persistence APIs.

## Bounded inventory rule

Before editing, run an exhaustive `resolveClearableCssColorValue` caller search
over `core/**` and compare it to the list above. Every production call must pass
an explicit profile or be covered by a checked default plus an inventory test.
A new/unlisted M-04 helper caller is contract drift: stop, add exact single-writer
ownership and its source-owned test here, then rerun the contract audit. Separately
check only the enumerated schema/editor/render mirrors in this leaf. Do not turn that
check into a promise to migrate all historical raw-style or composite CSS contracts,
and do not silently change semantics through a default parameter.

## Raw-input invariant

For every color field owned by this leaf, the first semantic operation is a call
with the original raw `unknown`/string value to `parseCssColorValue` or
`normalizeCssColorValue`. Consumer code must not call `trim()`, trim ASCII spaces,
lowercase, run a local color regex, extract numeric channels, or otherwise rewrite
the value before that call. This preserves the canonical owner's original-length,
control-character, and non-ASCII-whitespace policy. A wrapper may inspect
`ParsedCssColor` only after the raw call succeeds.

Composite owners may first locate their structural top-level components, but each
color component is passed as its original source slice directly to the shared
parser before component-side trimming/case folding. This applies to both Hero
overlay values and both Hero background-gradient stops. Schema regexes remain
structural prefilters and never authorize consumer-side preprocessing.

CTA Banner `background.gradient` is the sole explicit exception to the shared
simple-color component rule. Its whole value and retained 3-through-8-digit hex
stops first enter `parseCtaBannerBackgroundGradient` unchanged; that locally
bounded compatibility parser owns their historical composite grammar, including
5/7-digit stop spellings that the shared simple-color parser deliberately rejects.
All other CTA color fields use the shared parser normally. This exception does not
widen either shared profile or authorize another composite/raw-style bypass.

## Implementation Pseudocode

Refactor the central compatibility adapter:

```ts
export function resolveClearableCssColorValue(
  value: unknown,
  profile: CssColorProfile = "authoring",
  options: Readonly<{ allowInheritKeyword?: boolean }> = {}
): string | undefined {
  const normalized = normalizeCssColorValue(value, profile);
  return options.allowInheritKeyword === false && normalized === "inherit"
    ? undefined
    : normalized;
}

function resolveInheritedColor(value: unknown) {
  return resolveClearableCssColorValue(value, "inherited-render");
}

function resolveGradientStop(value: unknown) {
  return resolveClearableCssColorValue(value, "inherited-render", {
    allowInheritKeyword: false,
  });
}
```

`allowInheritKeyword` defaults to `true` and only narrows
`inherited-render`; it never makes an authoring-only value valid. The same named
option is passed to `SharedColorControl` at nested-stop controls. With
`colorProfile="inherited-render"` and `allowInheritKeyword={false}`,
`currentColor` remains canonical/inherited, while a stored `inherit` is shown as
the existing `saved_custom` state and an attempted `inherit` commit emits no
change. Direct CSS-property controls retain the default.

Remove all local keyword/rgb/hsl/range grammars. The shared parser is semantic
authority. A schema pattern is only a structural prefilter and must be followed
by the same semantic normalization before persistence/rendering.

### Exact profile matrix

- `authoring`: Menu, shared Page admin-control commits, grid-columns, newsletter,
  and timeline stored overrides, plus new ordinary control commits outside the
  explicit compatibility exceptions below. TASK-541 does not replace the legacy
  Page backend sanitizer: its exact seven-token Page filter remains, and
  TASK-539-02-L01 owns the later shared-parser handoff at that backend boundary.
- `inherited-render`: the complete TASK-516 Form theme path in
  `formSettings.ts`, `formTheme.ts`, `FormDesignPanel.tsx`, the existing runtime
  preview/resolver projection, and `formEmbed.tsx`; direct CSS-property legacy reads
  in Section, Tabs, Accordion, Contact, Toggle, Divider, Navigation, Footer, Hero,
  Gallery Mosaic, and CTA Banner. Exact retained editor call sites pass
  `colorProfile="inherited-render"` so stored `currentColor`/`inherit` is recognized
  without a mount write.
- Section direct inherited fields are exactly `heading.labelColor`,
  `heading.titleColor`, `heading.descriptionColor`, `style.backgroundColor`,
  `style.borderColor`, and `style.overlayColor`. Section's
  `style.gradientFrom`/`style.gradientTo` are nested stops: their schema/normalizer,
  editor controls, preview, and renderer use `inherited-render` with
  `allowInheritKeyword=false`, accepting `currentColor` but rejecting `inherit`.
- Divider `labelColor` is a direct inherited CSS property. Divider `color` is
  classified as a nested/composite stop for every variant because dotted/dashed
  variants interpolate it into radial/repeating gradients. Its schema/normalizer,
  editor, and renderer therefore use `inherited-render` with
  `allowInheritKeyword=false` consistently: `currentColor` is valid and `inherit`
  is not. Do not make acceptance depend on the currently selected line style.
- Hero `media.overlay` and `background.media.overlay` are also nested stops because
  the renderer duplicates each value inside `linear-gradient(...)`; both use the
  same `allowInheritKeyword=false` rule at schema/normalizer/editor/render. Their
  existing `HeroOverlayField` is the editor exception described below; do not
  replace its UX with `SharedColorControl`. Direct Hero color properties retain the
  inherited-profile default.
- Accordion's hyphenated legacy token adapter remains a separate, documented
  legacy read adapter after canonical color parsing fails. Apply
  `CSS_COLOR_VALUE_MAX_LENGTH` before that fallback. It must not be added to the
  shared color grammar or accepted by other consumers.

Form is a context-specific backward-compatible exception, not an ambiguous
dual-purpose helper. Make its one profile explicit end to end:

```text
Form editor SharedColorControl(inherited-render)
  -> existing normalizeFormSettings/form theme seam(inherited-render)
stored Form theme -> resolveFormTheme/buildFormThemeStyleVars(inherited-render)
runtime preview/resolver projection -> inherited-render
Form embed bridge -> inherited-render recheck -> CSS custom property/direct style
```

`formSettings.ts` and `formTheme.ts` are Bun-free Form-domain owners. Both import
`normalizeCssColorValue`, `CSS_COLOR_SCHEMA_PATTERNS`, and/or
`CSS_COLOR_VALUE_MAX_LENGTH` as needed directly from
`core/services/theme/cssColorContract.ts`; they must not import
`core/widgets/core/clearableStyle.ts`. The Form schema uses the shared
`inherited-render` structural pattern/cap, `normalizeFormTheme` calls
`normalizeCssColorValue(value, "inherited-render")`, and `resolveFormTheme`
rechecks with that same direct service import. Retained `formEmbed.tsx` may use
the compatibility adapter with an explicit `inherited-render` profile before
emitting CSS variables.

Do not create `normalizeFormTheme(authoring)`, a second write/read adapter, or an
unowned `normalizeFormSettings` path. The established Form policy accepts canonical
`currentColor`/`inherit` at write, read, control, preview, and public render. This
does not authorize Menu, Page, or new ordinary overrides to persist inherited
keywords.

Timeline owns exactly two authoring-profile color paths:
`background.color` and every `steps[].markerIconColor`. Both schema fields,
normalization paths, and final render uses pass original raw values through the
canonical authoring parser. The background has a known unsafe compatibility branch
around current `timeline.tsx:792`:

```ts
color: resolveClearableCssColorValue(data.background?.color, "authoring")
// never `?? data.background?.color`

markerIconColor: resolveClearableCssColorValue(step.markerIconColor, "authoring")
// never trimmed/raw marker color in the timeline dot style
```

Remove that raw fallback and the marker's trim/raw path. Rejected input is omitted
for both fields in normalized data and at final render; no unchecked author string
survives for convenience. Tests cover both paths independently.

### Schema and classifier rollout

Replace confirmed schema/normalizer mirrors in Toggle, Divider, Navigation,
Grid Columns, Footer (both its schema region near the current `:293` and render
normalizer near `:694`), Newsletter, plus color-valued schema fields in the
additional owned compatibility modules. Import
`CSS_COLOR_SCHEMA_PATTERNS[profile]` and `CSS_COLOR_VALUE_MAX_LENGTH`; never
repeat `128` or semantic channel ranges.

Preserve each existing `""` clear/default sentinel with an explicit wrapper,
for example:

```ts
const clearableColorSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS[profile],
    },
  ],
};
```

Empty is a compatibility sentinel, not a color accepted by the semantic parser.
Unauthored/cleared documents and default emission remain byte-identical.

`NavigationEditors.tsx` removes its local hex/token classifier and derives its
hint/state from shared parsed metadata. `divider.tsx` removes its local hex kind
classifier in favor of parser metadata. `ClearableFields.tsx` and its tests are
owned by L01, so L03 imports its landed parser-backed helpers rather than editing
them. Footer no longer accepts arbitrary named colors. Newsletter stops using
its local hex/rgb/token mirrors. No consumer preserves raw input after rejection.

Section and Contact remove their bespoke picker/classifier `ColorField` bodies and
compose `SharedColorControl` with `showValueInput={false}` and
`colorProfile="inherited-render"`. Contact and Section's direct fields render seeded
`currentColor`/`inherit` as the exact shared
`{ kind: "inherited", label: "Inherited color" }` state with
`data-shared-color-state="inherited"`, emit no mount change, and remain replaceable
or clearable. Section's two gradient controls additionally pass
`allowInheritKeyword={false}` and follow the nested-stop behavior above.

### Exact additional compatibility regions

These are the only newly enumerated raw-style color regions; do not generalize the
ownership to unrelated fields in the same large files:

- Hero schema/normalizer/render/editor regions for `media.overlay`,
  `style.textColor`, `style.subheadColor`, `style.bodyColor`, `style.borderColor`,
  `style.mediaBorderColor`, both primary/secondary button background/text/border
  triples, `background.color`, and `background.media.overlay`. Route each simple
  persisted color through `inherited-render` at normalize and final render, and
  through shared parser-backed editor classification. The two overlay fields are
  the nested-stop exceptions above: keep their existing `HeroOverlayField`
  component and always enforce the equivalent of `allowInheritKeyword=false`.
  Preserve its visible preview swatch, native color picker, Clear action, strength
  label, and opacity slider (`min=0`, `max=90`, `step=5`, effective alpha
  `0..0.9`) for both `media.overlay` and `background.media.overlay`. Replace only
  the local `rgbaPattern`, trimming, channel clamping/extraction, and conversion
  helpers with canonical parser metadata. Apply this exact state matrix to both
  overlay paths:

  | Parsed value | Visible preview | Strength control | Commit/mount behavior |
  |---|---|---|---|
  | unauthored/cleared (`undefined` or `""`) | existing default black replacement preview at the path's bounded default opacity | enabled at the existing path default, `min=0`, `max=90`, `step=5` | mount emits nothing and Clear stays disabled; picker/strength interaction explicitly authors one canonical literal |
  | literal `hex`/`rgb`/`hsl` | parser-derived literal/base color and effective overlay alpha, never a black fallback | enabled, `min=0`, `max=90`, `step=5` | picker/strength edits emit canonical literal-alpha bytes; mount emits nothing |
  | `var(--color-*)` token or `currentColor` | `backgroundColor` receives the actual canonical token/keyword so the browser resolves the configured token/current foreground | disabled and truthfully labelled `100%`, with a stable hint to choose a picker color before editing strength | mount emits nothing; picker replacement uses the existing bounded default opacity and emits one canonical literal |
  | `transparent` | actually transparent, never the native picker's black fallback | disabled and truthfully labelled `0%`, with the same replacement hint | mount emits nothing; picker replacement emits one canonical literal at the bounded default opacity |
  | invalid value, including `inherit` | fail-closed transparent/unsupported saved-value state, never raw or black fallback | disabled at `0%` with an unsupported-value replacement hint | schema/normalize/preview/render reject; mount and slider emit nothing; picker may explicitly replace it |

  For persisted token/keyword/transparent/invalid nonliteral states, the native
  picker's fallback is only a replacement affordance: it must not drive their
  preview, strength label, mount output, or stored bytes. The exact
  unauthored/cleared row above is the intentional exception and preserves the
  historical default preview plus enabled strength affordance without a mount
  write. Literal `hex`/`rgb`/`hsl` results derive picker `baseHex` and alpha from
  `ParsedCssColor`; commits emit canonical alpha bytes. `inherit` rejects at
  normalize, preview, commit, and render.
  Do not migrate `HeroOverlayField` wholesale to `SharedColorControl` or change
  this UX.
  Hero `background.gradient` is not pre-existing safe infrastructure: this leaf
  creates and exports the one production composite owner
  `normalizeHeroBackgroundGradient` from `hero.tsx`, then imports/reuses it in the
  schema constants, data normalizer, editor parse/commit/preview, and final renderer.
- Gallery Mosaic schema/normalizer/render/editor regions for `style.overlay` only.
  Preserve its empty/default behavior while canonicalizing accepted simple colors
  and rejecting raw fallback.
- CTA Banner schema/normalizer/render/editor regions for `style.background`,
  `style.text`, `style.border`, `style.badgeBackground`, `style.badgeText`, both
  primary/secondary button background/text/border triples, and `background.color`.
  Its `background.gradient` remains a separate composite grammar owned by the
  exported CTA parser and local cap below; it is never passed to the simple-color
  parser as one value.

For every listed simple field, schema uses the shared structural pattern/cap,
normalization calls the semantic parser, renderer defense repeats the same profile,
and editor classification/commit uses shared metadata. Existing `""` sentinels,
defaults, and absent-field behavior remain present-only.

### Hero background-gradient composite

`normalizeHeroBackgroundGradient(value: unknown): string | undefined` owns this
exact positive grammar:

```text
TOTAL_MAX := HERO_BACKGROUND_GRADIENT_MAX_LENGTH
           := CSS_COLOR_VALUE_MAX_LENGTH * 2 + 64  // effective value 320
ANGLE     := an unsigned base-10 integer in 0..360, followed by lowercase/uppercase deg
GRADIENT  := linear-gradient(ANGLE, COLOR, COLOR)
COLOR     := one value accepted by parseCssColorValue(..., "inherited-render")
             after the nested-stop rule rejects normalized `inherit`
```

Require the exact ASCII-case-insensitive function name, balanced parentheses,
exactly three top-level comma-separated components (angle plus two stops), no
color hints or extra layers/stops, and original-string length at or below
`HERO_BACKGROUND_GRADIENT_MAX_LENGTH`. Split at top-level commas so legacy
comma-form RGB/HSL stops remain parseable. Pass each original stop source slice
unchanged to the canonical parser before stop-local trimming or case folding. Both
stops use `allowInheritKeyword=false`; `currentColor` is accepted, `inherit` is
rejected. Canonical output is exactly
`linear-gradient(<integer>deg, <canonical-stop-1>, <canonical-stop-2>)`.
Decimal/signed/out-of-range angles, URL/image layers, unsafe functions/protocols,
comments/rule fragments, unbalanced input, a third stop, and any bad stop return
`undefined` without throwing or preserving raw bytes.

The complete stop-option inventory is explicit: shared-parser literals
(`hex3/4/6/8`, comma `rgb`/`rgba`, and comma `hsl`/`hsla` with the TASK-541 arity
and hue rules), `transparent`, canonical `var(--color-*)` tokens, and
`currentColor` are accepted; `inherit`, named colors, arbitrary CSS functions,
images/URLs, color hints, and every other spelling are rejected. The two stop
controls expose those same parser-backed choices with
`colorProfile="inherited-render"` and `allowInheritKeyword={false}`. They neither
advertise nor persist an option outside this inventory, and stored nonliteral
values mount without mutation.

The Hero JSON schema uses the exported total cap and a structural
`linear-gradient(...)` prefilter from this same production owner; schema shape is
not semantic authority. `normalizeHeroBackground`, `GradientField`, editor preview,
and renderer all call `normalizeHeroBackgroundGradient` and never retain,
interpolate, or fall back to the raw string. The editor's two stop controls use
`SharedColorControl` with `colorProfile="inherited-render"` and
`allowInheritKeyword={false}` rather than a hex-only regex/native-only classifier.

### CTA Banner background-gradient composite

CTA keeps its narrower historical hex-stop gradient language instead of borrowing
the shared simple-color cap or Hero's richer two-color-stop grammar. Define one
production semantic owner in `ctaBanner.tsx`; schema reuses its cap and owner-local
structural pattern, while normalization, editor parsing/commit/preview, and the
final renderer reuse its structured parse result:

```ts
export const CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH = 96 as const;
export const CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN: string;

export type ParsedCtaBannerBackgroundGradient = Readonly<{
  angle: number;
  start: string;
  end: string;
  normalized: string;
}>;

export function parseCtaBannerBackgroundGradient(
  value: unknown
): ParsedCtaBannerBackgroundGradient | undefined;
```

The cap is local and deliberate. The current native color inputs emit at most the
41-character six-digit-stop form; the retained alpha-compatible example
`linear-gradient(360deg, #00000000, #ffffffff)` is 45 characters, so 96 preserves
51 characters of legacy formatting/angle-spelling headroom while bounding all
regex, storage, and browser work before parsing. Length uses JavaScript UTF-16
code units; every accepted terminal is ASCII, so accepted values have the same
character count. This is not an alias for the simple-color `128`, Menu shadow
`200`, or Hero gradient `320` policies.

Check the original JavaScript string length against the CTA cap before any cleanup
or regex. Strip only surrounding ASCII U+0020 and allow only ASCII U+0020 at the
existing internal whitespace positions; tabs, CR/LF, C0/C1 controls, NBSP, EM
SPACE, and every other non-ASCII character reject. This whitespace tightening is
an intentional fail-closed correction aligned with TASK-541's raw-input policy;
hidden/control whitespace has no authored CTA meaning.

After that guard, preserve the remaining compatibility grammar: exact lowercase
`linear-gradient` and `deg`; one optional-minus signed integer/decimal angle using
`DIGITS` or `DIGITS.DIGITS`; and exactly two `#`-prefixed 3-through-8 hexadecimal
stop spellings. A plus sign, leading-dot/trailing-dot angle, uppercase function or
unit, malformed/extra stop, layer, URL, comment, or non-string rejects.
`normalized` is the outer-ASCII-trimmed accepted string; internal ASCII spacing,
angle spelling, stop length, and hex case remain byte-identical. This explicitly
retains decimal/negative angles and 5/7-digit legacy stop spellings accepted by the
old source/editor regex; tightening those non-whitespace compatibility forms is not
part of TASK-541. Rejection is `undefined`, never raw fallback.

`CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN` is anchored, JSON-Schema-compatible,
and spells every permitted outer/internal whitespace position as literal U+0020;
it accepts the same structural angle/stop spellings as the semantic parser but is
not semantic authority. `ctaBannerSchema.background.gradient` keeps the `""` clear
sentinel separately and applies this exported pattern plus the exported cap. The
semantic parser constructs its acceptance regex from the same pattern source after
the raw length guard; normalization and final rendering call the parser again.
`CtaBannerEditors.tsx` deletes its independent acceptance regex, reads
`angle`/`start`/`end` only from `parseCtaBannerBackgroundGradient`, and reparses
every emitted picker/angle candidate before `onChange`. Invalid stored values use
the existing replacement defaults without raw preview or mount mutation. No generic
gradient service, shared-color grammar widening, or new CTA authoring capability is
introduced.

### Verified post-smoke Runtime Preview repair

The final browser pass exposed a non-error Radix accessibility warning because
the dialog's already-visible explanatory copy was a plain paragraph. This late
repair is deliberately semantic and layout-neutral:

```text
FormRuntimePreviewDialog():
  keep DialogTitle("Form Runtime Preview") unchanged
  replace the adjacent descriptive <p> with DialogDescription
  preserve the exact copy and className
  let the Dialog primitive bind aria-describedby to that element

regression:
  mount the open dialog
  locate role=dialog
  read its non-empty aria-describedby id
  assert that id resolves to the exact visible explanatory copy
  browser: reopen a saved Form through the Runtime preview action
  assert role=dialog + resolvable description + zero console/page messages
```

No visual styling, Form payload, route, color, submit, or persistence behavior
changes. The warning was discovered only because the required real Runtime
Preview evidence was corrected; it is fixed here rather than hidden or deferred.

## Error and compatibility behavior

- Rejection returns `undefined`, causes the existing cleared/theme fallback, and
  never throws, clamps, logs, or returns raw input.
- Inherited values are accepted only at the exact opted-in call sites above. Form
  theme commits retain the TASK-516 exception; Menu/Page commits remain
  authoring-only.
- Unknown stored values remain untouched until explicit edit where the existing
  adapter supports that behavior; rendering fails closed.
- `inherit` is never interpolated as a nested gradient stop.
- No migration or schema version change is introduced.

## Form route Security Contract and tests

No route implementation, topology, visibility, auth, RBAC, CSRF, rate-limit, or
anti-abuse wiring is edited. Internal `POST /forms` and `PATCH /forms/:id` remain
mounted under the admin API and require an authenticated admin session, the existing
`forms:write` RBAC middleware, session CSRF, and the existing admin-write rate
bucket. Scoped API-key authentication remains limited to the unchanged internal
Form submission/upload write paths and does not authenticate this CRUD family.
Their strict `formCreateSchema`/`formUpdateSchema`
envelopes continue to import the nested `formSettingsSchema`. The nested accepted
value set and persistence bytes intentionally change: the inherited profile is
recognized end to end, accepted noncanonical values are stored canonically, and
semantically invalid values follow the existing fail-soft omission without raw
persistence. Public upload/submission routes, `public_write` accounting,
nonce/signature, captcha, and submission-access evaluation are unchanged.

In `tests/integration/routes/forms.test.ts`, add exact registered-route/schema
cases that:

- prove both create/update settings branches expose the shared inherited-profile
  structural pattern/cap and keep every nested `additionalProperties: false`;
- prove a uniquely named Form create or patch persists canonical leading-dot/HSL
  bytes plus canonical `currentColor`/`inherit` through the TASK-516 exception;
- prove an unknown nested theme key and structurally invalid/over-limit value return
  the existing validation 400 before changing the owned fixture;
- prove a range-invalid value that passes the structural prefilter is omitted by
  the fail-soft semantic normalizer and its raw bytes never reach DB/read output;
- record that both registered admin writes retain `forms:write`; do not weaken or
  mock away public-write security to exercise this internal seam.

Load `.env` before the Bun route suite, create a UUID-scoped fixture, and delete
only that fixture. Do not truncate shared Form tables or log rejected raw values.

## Source-owned regression shape and validation

Tests cover canonical bytes and range rejection at every changed normalizer,
schema, renderer, and editor. For every direct inherited-compatible editor, seed
both `currentColor` and `inherit`, assert
`data-shared-color-state="inherited"`/`Inherited color`, zero mount mutation,
schema+renderer acceptance, and canonical picker/clear replacement. Section and
Divider nested controls plus both Hero overlay controls instead pin
`currentColor` acceptance, stored `inherit` as `saved_custom`, zero mount/commit
mutation, and `inherit` rejection at normalize/preview/render. Form tests prove the same explicit inherited profile at settings
write, stored read, Design control, `FormCanvas`, runtime preview/resolver
projection, public embed/script render, and registered create/update route.
Hero tests cover direct fields, both overlay stop paths, and the exact
production-owned two-stop gradient grammar at schema/normalize/editor/renderer.
For both Hero overlay paths, pin the existing preview/picker/Clear/strength layout,
the complete unset/literal/token/`currentColor`/`transparent`/invalid state matrix above,
slider `0..90`/`step=5` interaction only for literal or unauthored/cleared values, canonical alpha bytes
after color and opacity edits, computed token/`currentColor` preview under explicit
test CSS variables/foreground, truthful disabled `100%`/`0%` labels and stable
replacement hints, zero mount mutation, and `inherit` rejection. These assertions
must fail if an authored token/keyword/transparent/invalid state falls back to
black or enables strength, or if either path is replaced wholesale by a different
shared-control UX.
Gallery Mosaic/CTA Banner tests cover every enumerated simple field and prove their
composite gradients remain separately bounded. CTA tests derive raw exact-cap and
cap+1 cases from `CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH`, prove the length guard
runs before trimming, preserve accepted legacy angle/stop bytes below the cap, and
prove schema/normalizer/editor/renderer all reuse the structured owner without a
second acceptance regex. Its parser/schema/normalizer/render table explicitly covers
non-string and `""` sentinel inputs; exact lowercase function/unit; zero, negative,
decimal, and long-but-under-cap angle spellings; rejection of plus, leading-dot,
trailing-dot, uppercase, malformed/extra-stop/layer, URL, comment, and over-cap
forms; retained 3-through-8 hex lengths; and ASCII-space acceptance versus tab,
newline, C0/C1, NBSP, and EM SPACE rejection. Editor tests prove valid and invalid
stored values emit nothing on mount, invalid raw values never enter preview, Clear
still works, and every picker/angle candidate is reparsed before exactly one
canonical UI emission. Timeline tests prove the raw fallback is gone.

Use a table covering every owned color field and feed the immutable corpus's
original input into its source normalizer/renderer/editor adapter; never pre-feed
only expected canonical bytes. For each distinct changed normalizer/helper, add
source-owned cases built from `CSS_COLOR_VALUE_MAX_LENGTH`: a short valid terminal
with surrounding ASCII U+0020 padding at exactly the cap must reach the parser and
canonicalize, while the same terminal at cap + 1 must reject before trimming.
Also reject representative C0/C1 controls and Unicode whitespace (including NBSP)
that a generic `trim()` could hide. Composite Hero tests derive analogous total-cap
and cap+1 inputs from their exported cap and pass each original stop slice through
the parser. No test repeats `128` or normalizes the fixture before invoking the
consumer under test.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/ui/color-value.test.ts tests/vitest/ui/color-swatch-alpha.test.tsx tests/vitest/ui/shared-color-alpha.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/clearable-fields-alpha.test.tsx
bun run test:vitest -- tests/vitest/forms/formSettings.test.ts tests/vitest/forms/formTheme.test.ts tests/vitest/admin/formDesignPanel.test.tsx tests/vitest/admin/formCanvas.test.tsx tests/vitest/admin/formRuntimePreviewDialog.test.tsx tests/vitest/forms/formRuntimeResolver.test.ts tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/widgets/clearableStyle.test.ts tests/vitest/widgets/section.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; if (!(await canConnect())) throw new Error("task_541_db_unreachable"); process.exit(0)'
bun test tests/integration/routes/forms.test.ts
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

Rerun each named failing file alone before classification.
