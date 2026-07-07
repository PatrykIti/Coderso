# TASK-516: Forms Editor — Prototype UI/UX, Field Fixes & Whole-Form Styling

# FileName: TASK-516_Forms_Editor_Prototype_Fidelity_And_Form_Styling.md

**Priority:** High
**Category:** Admin UI / Content (Forms) / Page Builder / Runtime / Schema (JSON model)
**Estimated Effort:** Large
**Dependencies:** The theme/model/UI subtasks (516-01…06) ride the existing validated `PATCH /forms/:id` + `PUT /forms/:id/fields` write paths (`core/server/routes/formsRoutes.ts`). **516-07 does NOT merely ride existing write paths:** it adds a genuinely NEW public route `POST /forms/:id/uploads` (`handleFormAttachmentUploadRoute`), a NEW `formAttachmentUploadSchema` (`core/server/validation/formSchemas.ts`), two NEW leaf/backstop modules (`core/services/forms/formAttachment.ts`, `core/services/forms/mimeMatchesAccept.ts`), and additive single-writer edits to `core/services/media/mediaService.ts` (`uploadMedia` `constraints`) + `core/services/media/mediaUsageService.ts` (`"submission"` usage variant) — enumerated in the ownership table (516-07 row) + coordination note below. Relates to TASK-490 (submissions export) — **kept distinct**: this task does NOT touch export/submissions listing scope.
**Status:** ✅ Done (2026-07-06)
**Closure changelog (pinned):** 1228

---

## Overview

The Forms editor (`core/admin/ui/forms/**`, service `core/services/forms/**`,
routes `core/server/routes/formsRoutes.ts`, public widget
`core/widgets/core/formEmbed.tsx`) is functionally deep (13 field types,
per-field logic + style, presets, multi-step, automation, runtime preview) but
(a) does NOT match the prototype's builder layout/structure/tokens, (b) has
several genuinely broken/hidden field controls, and (c) offers **no way to style
the whole form** — only per-field width + label position. The prototype
(`_docs/_PROTOTYPE/src/pages/advanced/FormBuilderPreview.tsx`, live at
`http://localhost:5180/#/advanced/forms/sample`) shows a clean in-page
`PageHeader` + `EditorPreviewFrame` builder with a FIELDS rail (Text, Email,
Textarea, Select, Checkbox, Radio, Date, **File**, **Phone**), a realistic
centered form-card canvas, a right inspector, a toolbar with a status badge +
undo/redo + a **desktop/mobile device toggle**, and a **Publish** primary action.

This task brings the editor to prototype fidelity, fixes the broken fields, and
adds a **whole-form style/theme model** (container, layout, typography, colors,
inputs, submit button) stored in the existing `forms.settings` **jsonb** column —
so **no DDL is required** — edited via a new "Design" inspector tab and applied
consistently across the builder canvas, the runtime preview, and the public
`formEmbed` rendering. Maximum configuration flexibility is the bar.

## Gap summary (prototype vs. current — grounded in source + live prototype)

Comparison method: read prototype SOURCE
(`FormsPage.tsx`, `FormBuilderPreview.tsx`, `FormSubmissionsPage.tsx`) + live
prototype screenshot (`_docs/_workflows/_smoke/wf516-proto-builder.png`) vs. the
current admin source (`core/admin/ui/forms/*`) and services. (Live admin
side-by-side screenshot was blocked by bot-protection captcha on the login route
— see Open Questions; the current-side gaps below are grounded in source, which
is authoritative for structure.)

**Structural / visual gaps**

- **G1 — Builder chrome.** Prototype = in-page `PageHeader` (breadcrumb `Forms ›
  Contact form`, title, description, `Save` + `Publish`) + `EditorPreviewFrame`
  card with a toolbar (`Preview only` pill + `Contact form · draft` badge,
  undo/redo, **desktop/mobile device toggle**). Current = full-screen
  `EditorShell` (`FormBuilderPage.tsx:46,740`) with a sticky sub-toolbar
  (Submissions / Action logs / Runtime preview / Save form `:815`) and NO device
  toggle, NO undo/redo, NO `Publish` primary action (only a status `Select`).
  **Admin primitives to reuse (do NOT re-port the prototype frame):**
  `core/admin/ui/shared/EditorFrame.tsx` `export function EditorFrame({ title,
  toolbar, actions, left, canvas, right })` is the real admin port of the
  prototype `EditorPreviewFrame` (chrome bar / `w-60` left rail / dotted canvas /
  `w-72` right inspector); `core/admin/ui/shared/EditorRail.tsx`
  `EditorRailGroup`/`EditorRailItem` are the rail primitives (re-exported from
  `EditorFrame`); `PageHeader.tsx` is the in-page header. **516-03 replaces
  `EditorShell` with `EditorFrame` + `PageHeader`.** IMPORTANT: unlike the
  prototype's `EditorPreviewFrame` (which bakes in `device = true` and Undo/Redo
  buttons — `EditorPreviewFrame.tsx:19,47-59`), the admin `EditorFrame` is
  deliberately chrome-only: its own doc-comment states it has **NO "Preview only"
  pill, NO static device toggle, and does not bake in Undo/Redo — the host wires
  them into `toolbar`/`actions`**. So 516-03/04 must render the device toggle and
  the undo/redo controls themselves (see undo/redo scope in 516-03 pseudocode
  below); they are not free from the frame.
- **G2 — Field rail.** Prototype rail exposes **Phone** and **File**; current
  `fieldLibraryItems` (`FormBuilderPage.tsx:68-153`) exposes neither. Rail item
  styling/grouping differs (`EditorRailGroup`/`EditorRailItem` vs. flat list).
- **G3 — Canvas realism.** Prototype canvas renders realistic controls (real
  `<select>`, real checkbox, textarea, highlighted selected field). Current
  `FormCanvas.tsx` renders most types as a generic read-only text `Input`.

**Broken / hidden field controls (enumerated — all grounded)**

- **B1 — `phone` unreachable.** `phone` is fully supported end-to-end
  (`validation.ts:23,74`; `formRuntimeContract.ts`; `FormRuntimePreviewDialog`
  maps it to `type="tel"` :415; `formEmbed` `supportedFieldTypes` :650) but is
  **absent from the admin field library**, so authors can never add it.
- **B2 — Canvas `select` preview bug.** `FormCanvas.renderField` computes
  `kind: "select"` (`FormCanvas.tsx:204-206`) but `FieldPreview` has **no
  `select` branch** → it falls through to a text `Input` (:120-129). Select
  fields look like text boxes in the builder.
- **B3 — Low-fidelity type previews.** `date`, `time`, `number`, `phone`,
  `email` all render as an identical generic text `Input` in the canvas; `rating`
  is mapped to the `range` slider preview instead of a scale. No type affordance.
- **B4 — Time increment not editable.** `validation.normalizeSettings` accepts
  `inputStep` for `time` (`validation.ts:199`) but `FieldSettingsPanel`
  `supportsStep = {number, range}` (`FieldSettingsPanel.tsx:71`) hides the
  control for `time`.
- **B5 — Dead `rating` controls.** `FieldSettingsPanel` shows a **Minimum** input
  for `rating` (`supportsNumericBounds` :70) but the backend **deletes** `min`
  for rating and clamps `max` to 3–10 (`validation.ts:234-243`). There is no
  dedicated "scale" affordance; the Minimum control is inert.
- **B6 — `hidden` requires a value with no UI guard.** The backend rejects a
  `hidden` field with an empty `defaultValue` (`validation.ts:226-232`) but the
  panel surfaces this only via a generic save error.

**Whole-form styling gap (the headline feature)**

- **G4 — No form-level styling.** The forms editor only has per-field
  `style.{width,labelPosition}` (`fieldSettings.ts`). There is **no** form-level
  container/layout/typography/color/input/button model. (Note: the `formEmbed`
  WIDGET has a rich per-embed `FormEmbedStyle`/`FormEmbedLayout`
  (`formEmbed.tsx:13-38`), but that lives on the page-widget instance, NOT on the
  form — so it cannot be authored from the Forms editor and does not travel with
  the form.) We add a form-owned theme in `forms.settings.theme`. The
  theme-vs-per-embed precedence (form theme = base, per-embed `FormEmbedStyle`
  overrides per explicit token) is specified in 516-06 pseudocode.

## Schema-extension plan (JSON model — NO DDL)

`forms.settings` is a `jsonb` column (`schema.ts:1241`; the `forms` pgTable
starts at `schema.ts:1230`) already carrying
`layoutMode`, `saveProgress`, `stepTitles`, `preset`, `automationRetry`
(`formSettings.ts`). We extend the same normalized `FormSettings` model with a
new **`theme`** sub-record (present-only, defaulted). `normalizeFormSettings` is a
**fully-defaulted** normalizer (it always re-emits `layoutMode`/`saveProgress`/
`stepTitles`/`preset`/`automationRetry` from a fresh object literal —
`formSettings.ts:82-125` — and returns `getDefaultFormSettings()` for a non-record
input), so it does NOT round-trip its input byte-for-byte. The `theme` invariant is
therefore **present-only**: the `theme` key is emitted only when a valid theme is
present, and is **absent** in the output when the input has none. The
theme vocabulary **overlaps** the token vocabulary the `formEmbed` widget already
ships (`FormEmbedStyle`/`FormEmbedLayout`, `formEmbed.tsx:13-38`) but is **NOT
identical** to it — several axes share a name with different value strings (theme
`layout.align` `left|center|right` vs. widget `alignment` `start|center|end`), some
theme values have no widget equivalent (`layout.width:"full"`, `surface.radius:"xl"`,
`layout.buttonAlignment:"full"`), and some theme tokens have no widget axis at all
(`typography.fontFamily`, `layout.columns`). The widget therefore inherits the theme
through a **documented translation + direct-apply** step (owned by 516-06: enum value
mapping such as `left→start`, clamp of extra values such as `radius:"xl"→"lg"`, and
direct container/grid application for tokens with no widget enum), NOT a clean 1:1
copy. Shape:

```
FormSettings.theme?: {
  layout?: {
    width?: "sm" | "md" | "lg" | "xl" | "full";
    align?: "left" | "center" | "right";
    fieldGap?: "sm" | "md" | "lg";
    columns?: 1 | 2;                 // form-wide default; per-field width still overrides
    buttonAlignment?: "left" | "center" | "right" | "full";
  };
  surface?: {
    card?: boolean;                  // show/hide the card container
    background?: string;             // validated color token (reuses clearableStyle policy)
    borderColor?: string;
    borderWidth?: "none" | "sm" | "md";
    radius?: "none" | "sm" | "md" | "lg" | "xl";
    padding?: "sm" | "md" | "lg" | "xl"; // 516-01 authoritative set (516-01:87,157,191); adds "xl"
    shadow?: "none" | "soft" | "sm" | "md" | "lg"; // 516-01 authoritative set (516-01:87,159,190); "soft" is the resolver DEFAULT (prototype Card shadow-soft), so the allowlist MUST accept it or the mandatory round-trip test (516-01:208) rejects shadow:"soft"
  };
  typography?: {
    titleSize?: "sm" | "md" | "lg" | "xl";
    titleWeight?: "normal" | "medium" | "semibold" | "bold"; // 516-01 authoritative set (516-01:87,163); the widget FormEmbedStyle.titleWeight is narrower (medium|semibold|bold) so 516-06 clamps "normal"→"medium" on the public embed
    titleColor?: string;
    labelColor?: string;
    helperColor?: string;
    fontFamily?: "display" | "inherit" | "sans" | "serif" | "mono"; // "display" = resolver DEFAULT (prototype font-display, 516-01:133); type/enum + every token→class map MUST include it
  };
  input?: {
    size?: "sm" | "md" | "lg";
    radius?: "none" | "sm" | "md" | "lg" | "xl"; // 516-01 authoritative: shared FormThemeRadius (516-01:194); adds "xl". Default "lg" (Input rounded-xl), NOT "md" — the round-trip test (516-01:208) asserts input.radius:"xl" persists
    borderColor?: string;
    background?: string;
  };
  submit?: {
    background?: string;
    textColor?: string;
    radius?: "none" | "sm" | "md" | "lg" | "xl"; // 516-01 authoritative: shared FormThemeRadius (516-01:194); adds "xl". Default "lg" (Button rounded-xl); round-trip test (516-01:208) asserts submit.radius:"xl" persists
    fullWidth?: boolean;
    label?: string;                  // whole-form submit label override
  };
}
```

- **No DDL.** No migration SQL/snapshot/journal — the model lives in `jsonb`,
  exactly like the existing settings sub-records.
- **Reject-unknown at the boundary; fail-soft values.** `normalizeFormSettings`
  learns the `theme` block: unknown KEYS are dropped (present-only emission),
  bad color/enum VALUES are omitted (reuse the `clearableStyle` value policy the
  widget already uses). Legacy forms without `theme` normalize to output that
  contains **NO `theme` key** (the four/five base keys are always present by
  design — this is a defaulted normalizer, not a passthrough — only the `theme`
  sub-record is present-only).
- **Round-trip test is mandatory** for the new sub-record (fail-closed READ trap:
  every new key that joins the allowlist ships a persistence round-trip
  assertion + a present-only **no-theme-key** assertion for the default/no-theme
  form — i.e. `!("theme" in normalizeFormSettings(noThemeInput))`, NOT a
  whole-object byte-for-byte equality).
- **File field (516-07) is the only candidate for DDL** and is deliberately
  scoped to reference existing media rather than add a table; see Open Questions.

## Subtask breakdown (single-writer file ownership; strictly sequential land order)

| # | Subtask | Sole-writer files | Depends on |
|---|---------|-------------------|------------|
| 516-01 | Form theme/style model (settings) + resolver | `core/services/forms/formSettings.ts`, `core/services/forms/formTheme.ts` (NEW), `core/admin/services/formsClient.ts` (FormSettings type) | — (foundation) |
| 516-02 | Design inspector panel (new component) | `core/admin/ui/forms/FormDesignPanel.tsx` (NEW) | 516-01 |
| 516-03 | Builder chrome + rail fidelity + wiring | `core/admin/ui/forms/FormBuilderPage.tsx`, `FieldLibrary.tsx` (516-03 STOPS rendering `FieldListPanel` but leaves `FieldListPanel.tsx` unchanged — see 516-03 Scope item 5: it stays a standalone test-covered primitive) | 516-01, 516-02, **516-04** (FormCanvas `deviceWidth`/`theme` prop signature must exist before FormBuilderPage passes them) |
| 516-04 | Canvas fidelity + field-preview fixes (B2/B3/B5) + theme apply | `core/admin/ui/forms/FormCanvas.tsx` | 516-01 |
| 516-05 | Field settings control fixes (B1 wiring/B4/B5/B6) | `core/admin/ui/forms/FieldSettingsPanel.tsx`, `core/services/forms/fieldSettings.ts` | 516-01 |
| 516-06 | Runtime theme application (preview + public inherit) | `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`, `core/widgets/core/formEmbed.tsx`, **`core/services/pages/pageRendererV2.tsx` (per-region: `mapFormBindingToEmbedData`, `:1329-1361` — present-only `theme` passthrough only; no other 516 subtask touches this file)** | 516-01, 516-04 |
| 516-07 | `file` field type (optional/heaviest) | `core/services/forms/validation.ts`, `core/services/forms/submissionService.ts`; **NEW** `core/services/forms/formAttachment.ts` + `core/services/forms/mimeMatchesAccept.ts` (leaf); `core/server/routes/formsRoutes.ts` (submission handler branch + **NEW** `POST /forms/:id/uploads` `handleFormAttachmentUploadRoute` + additive `mapFormError` media cases); **NEW** `formAttachmentUploadSchema` in `core/server/validation/formSchemas.ts`; additive single-writer edits to `core/services/media/mediaService.ts` (`uploadMedia` `constraints` param) + `core/services/media/mediaUsageService.ts` (`"submission"` `MediaUsageTargetType` + `form_submissions` scan branch); **+ additive `file`-case-only edits to `FieldLibrary.tsx`/`FormBuilderPage.tsx` (rail item), `FormCanvas.tsx` (preview), `formEmbed.tsx` (control), `FormRuntimePreviewDialog.tsx` (control)** — see File-case seam + 516-07 Scope | 516-03, 516-04, 516-05, 516-06 |

**Land order:** 516-01 → 516-02 → **516-04 → 516-03** → 516-05 → 516-06 → 516-07.
516-04 (sole writer of `FormCanvas.tsx`) lands **before** 516-03 so the optional
`deviceWidth?` / `theme?` props exist on `FormCanvasProps` when 516-03's
`FormBuilderPage` wires them; otherwise 516-03 would pass excess props to an
un-extended `FormCanvas` and fail its own typecheck gate (`tsc` / `bun --cwd core
lint:types`). The optional props are a no-op until 516-03 supplies the values.

## Coordination / collision guards

- Disjoint single-writer ownership per the table above; no two subtasks edit the
  same file. `validation.ts` is touched **only** by 516-07 (516-04/05 are
  admin-only and align the UI to the *existing* backend behavior — no `validation.ts`
  change needed for B4/B5). The `mapFormBindingToEmbedData` region of
  `core/services/pages/pageRendererV2.tsx` (`:1329-1361`) is a **per-region
  single-writer entry owned only by 516-06** (adds the present-only `theme`
  passthrough — the projection at `:1353-1355` emits a 3-key literal
  `{ layoutMode, saveProgress, stepTitles }` that DROPS `theme`, so without it
  `resolved.settings.theme` is `undefined` at runtime and the public embed renders
  un-themed); no other 516 subtask edits `pageRendererV2.tsx` (516-04 owns
  `FormCanvas.tsx` only; the 516-07 file-case seam omits it), so there is no
  double-write. `formEmbed.tsx` primary owner is **516-06**;
  `FieldLibrary.tsx`/`FormBuilderPage.tsx`/`FormCanvas.tsx` primary owners are
  **516-03/516-03/516-04** respectively (516-03 mounts the 516-02 panel).
- **File-case seam (the single documented multi-writer exception).** Because the
  `file` type registers only in 516-07 and 516-07 lands **last**, 516-07 makes
  bounded, **additive `file`-case-only** edits to the already-shipped
  `FieldLibrary.tsx`/`FormBuilderPage.tsx` (rail item), `FormCanvas.tsx` (preview
  branch), `formEmbed.tsx` (upload control), and `FormRuntimePreviewDialog.tsx`
  (preview control). 516-03/04/06 add **no** `file` branch — they omit the type
  entirely. This seam is safe because it is strictly additive, references a type
  that exists only after all primary owners have shipped, and lands last.
- **516-07 additive single-writer edits + NEW modules/route (no in-task collision).**
  Beyond the file-case seam, 516-07 is the SOLE writer of: additive edits to
  `core/services/media/mediaService.ts` (`uploadMedia` gains an optional
  `constraints?` param) and `core/services/media/mediaUsageService.ts` (adds a
  `"submission"` `MediaUsageTargetType` member + a `form_submissions` scan branch);
  and it CREATES the NEW modules `core/services/forms/formAttachment.ts`,
  `core/services/forms/mimeMatchesAccept.ts`, and the `formAttachmentUploadSchema`
  in `core/server/validation/formSchemas.ts`, plus the NEW public route
  `POST /forms/:id/uploads` (`handleFormAttachmentUploadRoute`) + additive
  `mapFormError` media cases in `formsRoutes.ts`. No other 516 subtask writes any
  of these files, so single-writer holds; they are declared here (and in the
  ownership table + Dependencies) because they are genuinely NEW surfaces, not part
  of "riding the existing write paths". Full contract + Security in 516-07.
- The shared theme vocabulary (enum unions, clamp sets, `resolveFormTheme`
  helper name) is defined **once** in 516-01 and imported read-only by
  516-02/04/06. Any drift in these enums between subtasks is a reconcile failure.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` — the orchestrator
  owns board rows. Closure changelog pinned to **1228**.
- rg misdetects the large TSX (`formEmbed.tsx`, `FormBuilderPage.tsx`) as binary
  — use `Read` / `grep -an`, never trust an empty `rg`.

## Execution-ready pseudocode (per subtask)

> Signatures are the contract. Enum unions + clamp sets are defined **once** in
> 516-01 (`formTheme.ts`) and imported read-only by 516-02/04/06. Colors reuse
> the existing CSS-value policy — see Security Contract.

### 516-01 — model + resolver (`formSettings.ts`, `formTheme.ts` NEW)

Shared vocabulary (define once, export from `formTheme.ts`):

```ts
// formTheme.ts — ILLUSTRATIVE sketch. The AUTHORITATIVE names/shapes are owned by
// TASK-516-01 (sole writer of formTheme.ts): the enum sets are exported as `FORM_THEME_*`
// Sets (e.g. `FORM_THEME_WIDTHS = new Set([...])`, not `THEME_*` `as const` arrays), the
// theme type is `FormFormTheme`, and `ResolvedFormTheme` is the GROUPED-RAW shape below.
// Reconcile any drift TO 516-01, never the reverse.
export const THEME_WIDTHS   = ["sm","md","lg","xl","full"] as const;
export const THEME_ALIGNS   = ["left","center","right"] as const;
export const THEME_BTN_ALIGN= ["left","center","right","full"] as const;
export const THEME_GAPS     = ["sm","md","lg"] as const;
export const THEME_COLUMNS  = [1, 2] as const;
export const THEME_BORDER_W = ["none","sm","md"] as const;
export const THEME_RADII    = ["none","sm","md","lg","xl"] as const;   // surface AND input/submit (shared FormThemeRadius, 516-01:194)
export const THEME_PADS     = ["sm","md","lg","xl"] as const;          // == 516-01:87,191 (authoritative; adds "xl")
export const THEME_SHADOWS  = ["none","soft","sm","md","lg"] as const; // == 516-01:87,159,190 (authoritative; adds "soft", the resolver default)
export const THEME_TITLE_SZ = ["sm","md","lg","xl"] as const;
export const THEME_TITLE_WT = ["normal","medium","semibold","bold"] as const; // == 516-01:87,163 (authoritative; adds "normal")
export const THEME_FONTS    = ["display","inherit","sans","serif","mono"] as const; // == 516-01:87,164 (authoritative; MUST include "display", the resolver default = prototype font-display)
export const THEME_INPUT_SZ = ["sm","md","lg"] as const;

export type FormFormTheme = { /* the shape in the Schema-extension plan block */ }; // 516-01 name

// token -> Tailwind class maps (only these classes may reach the DOM):
const widthClass:  Record<(typeof THEME_WIDTHS)[number], string> = {
  sm:"max-w-md", md:"max-w-lg" /* prototype default :103 */, lg:"max-w-2xl", xl:"max-w-3xl", full:"max-w-none" };  // == 516-01:138 (authoritative)
// …radiusClass / padClass / shadowClass / gapClass / titleSizeClass /
//   titleWeightClass / fontFamilyClass / inputSizeClass / borderWidthClass…

// AUTHORITATIVE shape = TASK-516-01 (lines 116-122): `resolveFormTheme` returns
// GROUPED-RAW effective tokens (fully-defaulted concrete enum values per group), NOT
// className/style. This is what FormDesignPanel's ControlDefaultHint reads
// (`resolved.layout.width` → "md"). The token→className / token→style maps +
// `buildFormThemeStyleVars` (colors) are a SEPARATE concern (owned by 516-01) and MUST
// NOT be folded into this return shape. (An earlier className/style-shaped sketch here
// broke 516-02's hint contract — see 516-02 §"Cross-subtask reconcile".)
export type ResolvedFormTheme = {
  layout:     { width: FormThemeWidth; align: FormThemeAlign; columns: 1|2; fieldGap: FormThemeGap; buttonAlignment: FormThemeButtonAlign /* left|center|right|full — keeps parent's "full"; NOT FormThemeAlign (516-01:131,195) */ };
  surface:    { card: boolean; padding: FormThemePadding; radius: FormThemeRadius; shadow: FormThemeShadow; borderWidth: FormThemeBorderWidth /* none|sm|md — RESTORED per 516-01:132,192; default "sm" = Card's 1px border */; background?: string; borderColor?: string };
  typography: { fontFamily: FormThemeFontFamily; titleSize: FormThemeTitleSize; titleWeight: FormThemeTitleWeight; titleColor?: string; labelColor?: string; helperColor?: string };
  input:      { size: FormThemeInputSize; radius: FormThemeRadius; background?: string; borderColor?: string; textColor?: string };
  submit:     { fullWidth: boolean; radius: FormThemeRadius; label?: string; background?: string; textColor?: string };
};

// Pure, Bun-free. Enum/bool tokens are always concrete; optional COLOR tokens stay
// undefined by default. Token→class maps (formThemeWidthClass etc.) + buildFormThemeStyleVars
// live alongside in formTheme.ts (516-01). Colors run through resolveClearableCssColorValue
// (see Security Contract) at the render maps (defence in depth).
export function resolveFormTheme(theme: FormFormTheme | undefined): ResolvedFormTheme;
```

`normalizeFormTheme` (invoked by `normalizeFormSettings`, mirrors the existing
`formSettings.ts` present-only idiom — `isRecord`/`toString`/`clampInt`, emit a
key only when a valid value is present):

```ts
// formSettings.ts (theme branch) — reuse local isRecord/toString helpers
const toEnum = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => {
  const s = toString(v);                 // toString already trims + null-empties
  return s && (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
};
const toColor = (v: unknown): string | undefined =>
  resolveClearableCssColorValue(v);      // policy: drop unsafe/invalid -> undefined

function normalizeFormTheme(value: unknown): FormFormTheme | undefined {
  if (!isRecord(value)) return undefined;              // absent -> stays absent
  const layout = isRecord(value.layout) ? {
    ...(toEnum(value.layout.width, THEME_WIDTHS)  ? { width: … } : {}),
    ...(toEnum(value.layout.align, THEME_ALIGNS)  ? { align: … } : {}),
    ...(toEnum(value.layout.fieldGap, THEME_GAPS) ? { fieldGap: … } : {}),
    ...(THEME_COLUMNS.includes(value.layout.columns as 1|2) ? { columns: … } : {}),
    ...(toEnum(value.layout.buttonAlignment, THEME_BTN_ALIGN) ? { buttonAlignment: … } : {}),
  } : undefined;
  // surface/typography/input/submit branches identical shape; colors via toColor.
  const theme = compact({ layout, surface, typography, input, submit }); // drop empty sub-objects
  return theme && Object.keys(theme).length ? theme : undefined;         // present-only
}
// In normalizeFormSettings: only assign `normalized.theme` when normalizeFormTheme
// returns a value -> a legacy form with no `theme` key emits NO `theme` key
// (present-only). NOTE: the base keys are ALWAYS re-emitted (defaulted normalizer),
// so this preserves the theme-absence invariant, NOT whole-object byte-identity.
// Unknown top-level and unknown per-branch keys are dropped (reject-unknown)
// because each branch is rebuilt field-by-field.
```

Error handling: never throw on bad theme input — fail-soft (drop the offending
key/value). Regression-test shapes (Vitest, Bun-free):
- reject-unknown: `normalizeFormSettings({ theme: { layout: { width:"sm", bogus:1 }, junk:2 }})` → `theme.layout === { width:"sm" }`, no `junk`/`bogus`.
- present-only (no theme key): `expect("theme" in normalizeFormSettings(legacyNoThemeSettings)).toBe(false)` — assert the `theme` sub-record is ABSENT when the input has none. Do NOT assert `JSON.stringify(out) === JSON.stringify(input)`: `normalizeFormSettings` is fully-defaulted (`formSettings.ts:82-125`, always re-emits the base keys and returns `getDefaultFormSettings()` for a non-record), so whole-object byte equality fails for any legacy input not already in the exact normalized shape/key-order. (Optionally also assert the base keys are still present and correctly normalized.)
- clamp/enum: bad enum (`width:"huge"`) and unsafe color (`background:"url(x)"`, `titleColor:"expression(alert(1))"`) → key omitted.
- resolver grouped-raw: `resolveFormTheme({ layout:{ width:"lg" }}).layout.width === "lg"`; unset group/key → default token (`.layout.width === "md"`). Token→class is tested separately on the maps (`formThemeWidthClass["lg"] === "max-w-2xl"`, per 516-01:138), NOT via a `.container.className` on the resolver return.

### 516-02 — Design inspector panel (`FormDesignPanel.tsx` NEW)

```tsx
type FormDesignPanelProps = {
  theme: FormFormTheme | undefined;             // current persisted theme (may be undefined)
  // GROUP-LEVEL REPLACE partial (authoritative shape = TASK-516-02): each emitted group
  // fully replaces theme[group]; `{ [group]: undefined }` clears a group; `undefined` = reset whole theme.
  onThemeChange: (updates: Partial<FormFormTheme> | undefined) => void; // parent persists via PATCH settings
  disabled?: boolean;
};
// Renders grouped sections (Layout / Surface / Typography / Inputs / Submit) using
// the SAME clearable-style color-swatch controls the widget editors use
// (resolveClearableCssColorValue-backed). Every control shows the resolved default
// (from resolveFormTheme(undefined)) as its placeholder/hint and has a reset-to-default
// affordance. onThemeChange emits a present-only group-level Partial<FormFormTheme> (unset
// control -> key absent, i.e. `undefined`), never writes enum strings the resolver can't map. When the panel clears
// the last token it emits `undefined` (drops the whole theme) so normalizeFormSettings
// emits no `theme` key (preserves the present-only / theme-absence invariant).
```
Test shape (Vitest admin/UI): render with `theme=undefined` → controls show
resolved-default hints; change width → `onThemeChange` called with `{ layout:{ width } }`
only; reset → key removed.

### 516-03 — builder chrome + rail (`FormBuilderPage.tsx`, `FieldLibrary.tsx`)

```tsx
// Replace <EditorShell> with <PageHeader …/> + <EditorFrame …/>.
// NOTE: PageHeader takes `breadcrumbs?: Crumb[]` where Crumb = { label; href? }
// (plural prop, objects with `href` — NOT a singular `breadcrumb` string[], and
// NOT the prototype's `to`; PageHeader.tsx:15,28). Getting the prop name/shape
// wrong fails the typecheck gate.
<PageHeader
  breadcrumbs={[{ label: "Forms", href: "/admin/forms" }, { label: form.name }]}
  title={form.name}
  description="Drag fields onto the canvas and configure them on the right."
  actions={<><Button variant="ghost" onClick={save}>Save</Button>
             <Button onClick={publish}>Publish</Button></>} />
// NOTE: the admin EditorFrame renders `{title}{toolbar}` in the LEFT chrome group
// and `{actions}` in the RIGHT group (EditorFrame.tsx:43-46) — the OPPOSITE
// mapping from the prototype `EditorPreviewFrame`, whose `toolbar` renders in the
// RIGHT group next to undo/redo/device. In the prototype the status badge +
// undo/redo + device toggle are all RIGHT-aligned, so in the admin frame they go
// in `actions`, NOT `toolbar`. Leave `toolbar` empty (or a left sub-title only).
<EditorFrame
  title="Form builder"
  actions={<>
    <StatusBadge>{form.name} · {form.status}</StatusBadge>
    <UndoRedoControls history={history}/>       {/* see undo/redo scope */}
    <DeviceToggle value={deviceWidth} onChange={setDeviceWidth}/>  {/* host-wired */}
  </>}
  left={<FieldLibrary items={fieldLibraryItems} onAdd={addField}/>}   // EditorRailGroup/Item
  canvas={<FormCanvas fields={fields} theme={theme} deviceWidth={deviceWidth} …/>}
  right={<InspectorTabs tabs={["Settings","Design","Automation"]}>
           {/* Design tab mounts <FormDesignPanel theme onThemeChange/> */}
         </InspectorTabs>} />
```
`FieldLibrary` uses `EditorRailGroup`/`EditorRailItem` (icon + label), NOT a flat
list. `deviceWidth` local state (`"desktop" | "mobile"`) drives the canvas frame
width; passed to `FormCanvas` via the optional prop added in 516-04 (land order).

**`FieldListPanel` fate (`FormBuilderPage.tsx` sole-writer edit — panel file left unchanged).** The current left rail
is a **two-tab split** — `Fields` (`FieldListPanel`, the list of already-added
fields with **selection only** — its props are `fields/selectedId/onSelect/onAdd`,
`FieldListPanel.tsx:17-23`; there is **no reorder** control today) and `Library`
(`FieldLibrary`). The prototype has **NO such split**: a **single** `Fields` rail
(which is the LIBRARY — `EditorRailGroup` at `FormBuilderPreview.tsx:60-74`) on the
left, and field **selection is canvas-click** (the selected field is highlighted on
the canvas card via `ring-2 ring-primary`, `FormBuilderPreview.tsx:117`). So 516-03:
(a) **removes the left Tabs split** and mounts `FieldLibrary` alone as
`EditorFrame.left`; (b) field SELECTION is driven by canvas-click, which the real
`FormCanvas` ALREADY implements (`onSelectField`/`selectedFieldId` + the prototype's
`ring-2 ring-primary` highlight, `FormCanvas.tsx:48`; per-card remove via
`onRemoveField`, `:66`) — so NO new canvas selection work is required (516-04 Scope
§4 "keep selection/remove affordances intact" already covers it). **Field REORDER is
out of scope for TASK-516** — it is not implemented anywhere today (`FieldListPanel`
has no `onMove`/`onReorder`; the canvas `GripVertical` at `FormCanvas.tsx:54` is a
render-only handle), so dropping the added-fields list tab loses no reorder feature;
canvas-side drag reorder is a follow-up, matching this task's out-of-scope posture on
functional edit-history (see "Undo/redo SCOPE decision"). Because its list-selection
role is now redundant with canvas-click selection, the sole-writer removal happens
**entirely in `FormBuilderPage.tsx`**: delete the `fieldListItems` `useMemo`
(`:317`), BOTH `<FieldListPanel>` render sites (`:749` desktop, `:892` mobile Sheet —
each replaced by `<FieldLibrary>`), and the now-unused
`import { FieldListPanel, type FormFieldListItem }` at `:61` (its only consumer was
the `:317` memo, so leaving it fails the typecheck/lint gate). **`FieldListPanel.tsx`
itself is left UNCHANGED — NOT gutted** — because the standalone component test
`tests/vitest/ui/forms-component-wave.test.tsx:416-486` (NOT in 516-03's ownership)
still imports and renders the real component; deleting/reducing it would break that
unowned test under `vitest` + `tsc`. It stays a test-covered primitive the builder
no longer renders (516-03 Scope item 5 has the full grounding). Net:
after 516-03 there is exactly ONE left rail (the library) and no `Fields`/`Library`
tab pair, matching the prototype.

**Undo/redo SCOPE decision (explicit).** The prototype's Undo/Redo buttons are
**decorative** (page marked "Preview only"; the admin `EditorFrame` does not
provide them). For this task, undo/redo is delivered as **render-only chrome
fidelity**: render the two buttons (matching the prototype's icons/placement) in
`disabled` state so the toolbar matches the prototype visually, with NO history
stack and NO functional behavior. Functional edit-history is **explicitly out of
scope** for TASK-516 (would require a builder-state history model spanning fields
+ settings + theme; tracked as a follow-up, not here). The device toggle IS
functional (drives canvas width). No smoke scenario exercises undo/redo; the
smoke asserts the buttons render disabled. (If a reviewer wants functional
history, it is a separate subtask with a history-stack contract — not folded into
"wiring".)

### 516-04 — canvas fidelity + field-preview fixes (`FormCanvas.tsx`)

```tsx
// Extend props (these land BEFORE 516-03 wires them — see Land order):
type FormCanvasProps = { …existing; theme?: FormFormTheme; deviceWidth?: "desktop"|"mobile"; };
// Apply resolveFormTheme(theme) to the canvas card + fields; deviceWidth sets frame max-width.
// FieldPreview: ADD a real `select` branch (fixes B2 — currently kind:"select" at
// :204-206 falls through to text Input :120-129) rendering a real <select> with the
// field's options; ADD type-specific affordances for date/time/number/phone/email
// (fixes B3: <input type=date|time|number|tel|email> instead of one generic text Input);
// map `rating` to a scale/star affordance (fixes B5 low-fidelity), NOT the range slider.
// Column/width precedence (documented): form theme `layout.columns` is the DEFAULT grid;
// a field's own `style.width` (fieldSettings) OVERRIDES the form default for that field.
```
Test shape (Vitest admin/UI): a `select` field renders a `<select>` (not
`<input type=text>`); `date` field renders `<input type="date">`; theme
`columns:2` yields a 2-col grid class unless a field sets `width:"full"`.

### 516-05 — field settings control fixes (`FieldSettingsPanel.tsx`, `fieldSettings.ts`)

```ts
// B4: add "time" to the step-supporting set so the increment control shows:
const supportsStep = new Set(["number","range","time"]);   // was {number,range}
// B5: remove the inert Minimum control for `rating` (backend deletes min + clamps
// max 3–10 at validation.ts:234-243); show a "scale (3–10)" max control only.
// B1: `phone` is added to the field library in 516-03; ensure the panel's control
// gating includes `phone` (type=tel) with no dead controls.
// B6: `hidden` requires a non-empty defaultValue (validation.ts:226-232) — surface
// an inline required-hint on the defaultValue control BEFORE save, not just via the
// generic save error.
```
Test shape (Vitest, Bun-free / admin): `supportsStep` includes `time`; `rating`
panel has no Minimum control; `hidden` panel shows the defaultValue requirement.

### 516-06 — runtime theme application (`FormRuntimePreviewDialog.tsx`, `formEmbed.tsx`)

```ts
// formEmbed today derives visuals from the PER-EMBED block instance:
//   const style = { ...resolveStyle(undefined), ...(normalizedData.style ?? {}) }  (:1046-1049)
// and reads ONLY layoutMode/stepTitles/saveProgress from resolved.settings (:1055-1060).
// 516-06 makes the widget INHERIT the form-owned theme via resolved.settings.theme.
//
// PRECEDENCE (explicit): the FORM THEME is the BASE; the per-embed FormEmbedStyle
// OVERRIDES per-token where the embed instance explicitly sets that token.
//   const formTheme = resolveFormTheme(resolved?.settings?.theme);     // base
//   const embed     = normalizedData.style ?? {};                      // page-widget overrides
//   const effective = mergeThemeThenEmbed(formTheme, embed); // embed wins per explicit key
// Rationale: the form theme travels with the form (author's intent for every embed);
// a page author may still fine-tune a specific placement. An unset embed token falls
// through to the form theme; an unset form token falls through to the built-in default.
// Colors STILL pass resolveClearableCssColorValue at render (Security Contract).
```
Test shapes: `formRuntimeResolver` returns `theme` through resolution
(`tests/vitest/forms/formRuntimeResolver.test.ts`); a form with a theme and an
embed with NO style shows the theme; an embed that overrides `background` wins
over the theme's `background`. Smoke: publish → front `formEmbed` shows the form
theme UNLESS the embed instance overrides a given token.

### 516-07 — `file` field (see Security Contract for the upload guard)

```ts
// validation.ts: register "file" in the field-type union + normalizeSettings
// (accept size/accept-type constraints, reject unknown). submissionService.ts +
// formsRoutes.ts submission path: validate the submitted value as a MEDIA REFERENCE
// (must resolve to an owned, existing media row of an allowed type within size);
// never trust a client-supplied path/URL. Additive file-case-only UI edits per the
// File-case seam.
```

## Security Contract

Two subtasks touch route/public-render surfaces and MUST satisfy the following.

### 516-01 — theme colors on the PUBLIC render path (XSS / CSS-injection)

The new `theme` color strings (`surface.background`, `surface.borderColor`,
`typography.titleColor`/`labelColor`/`helperColor`, `input.borderColor`/
`background`, `submit.background`/`textColor`) persist through
`PATCH /forms/:id` → `forms.settings` and are then emitted into the **public**
`formEmbed` via inline `style={{ … }}`. They are attacker-influenceable content
and MUST be constrained at BOTH boundaries:

1. **Normalize (write) boundary** — `normalizeFormTheme` runs every theme color
   through `core/widgets/core/clearableStyle.ts` `resolveClearableCssColorValue`
   (the existing CSS-value policy: allows hex / `var(--color-*)` tokens / bounded
   `rgb[a]`/`hsl[a]` / the `transparent|currentColor|inherit` keywords; rejects
   anything containing `url(` / `expression(` / `javascript:` / `data:` /
   `;{}<>`). Invalid/unsafe → the key is DROPPED (present-only emission), never
   persisted. Enum tokens (widths/radii/etc.) are validated against the fixed
   unions in `formTheme.ts`; unknown enum values are dropped.
2. **Render boundary (defence in depth)** — `resolveFormTheme` and the
   `formEmbed`/runtime-preview render paths re-run every color through
   `resolveClearableCssColorValue` before it reaches an inline `style`. This
   matters because the existing `formEmbed` code already emits some colors via
   the WEAKER `resolveClearableStyleValue` (trim/non-empty only — NOT a color
   policy) and even applies `borderColor` RAW (`formEmbed.tsx:1069`
   `borderColor: style.borderColor`, and `:739/:777/:808/:837` `style={{
   color: labelColor }}` / `style={{ borderColor }}`). 516-06's theme-inherit
   path MUST use `resolveClearableCssColorValue` (as `contact.tsx:4` already
   does) for every theme-derived color, and MUST NOT widen the existing raw
   `borderColor` seam to theme input.
3. **Allowlist + round-trip** — the `theme` key and each validated leaf join the
   PATCH-settings allowlist with **reject-unknown** at the boundary; ship a
   persistence round-trip test (write theme → read back equal) AND a present-only
   **no-theme-key** test (no-theme form emits no `theme` key — assert
   `!("theme" in normalizeFormSettings(noThemeInput))`, NOT a whole-object
   byte-for-byte equality, because the normalizer is fully-defaulted and always
   re-emits the base keys). No new theme key may ship without both assertions
   (fail-closed READ trap).

### 516-07 — file field submission (`formsRoutes.ts` submission path + `validation.ts`)

The `file` field accepts a value on the **public submission route**. It MUST be
validated as a **media reference**, not a free path:

- The submitted value resolves to an **existing** media row that is **owned**
  by / scoped to the site/tenant, of an **allowed type**, within a **size**
  bound (accept-type + max-size come from the field's normalized settings).
- Reject unknown/oversized/unresolvable references and any **client-supplied
  filesystem path or URL** — never trust or dereference client paths; only
  accept an ID/reference that the server can independently resolve and
  authorize.
- Submission validation runs in the Bun runtime/route lane
  (`tests/integration/routes/forms.test.ts`) with a rejection test for an
  unowned/nonexistent/oversized/wrong-type reference.

## Testing strategy (lanes)

- **Vitest, Bun-free pure** (`tests/vitest/forms/*`): `formSettings.ts` theme
  normalize/reject-unknown/clamp/round-trip/present-only-no-theme-key (516-01);
  `formTheme.ts` token→class resolution (516-01); `fieldSettings.ts` option
  lists (516-05); `formRuntimeResolver` returns `theme` through the resolution and
  omits it when unset (`tests/vitest/forms/formRuntimeResolver.test.ts`, 516-06 —
  imports `{ afterEach, expect, test, vi }` from `"vitest"` + `vi.doMock`, no DB /
  `Bun.serve`, so it is a Bun-free Vitest lane, NOT a Bun runtime/DB lane).
- **Vitest admin/UI** (`tests/vitest/admin/*`): `formsClient.ts` theme
  round-trip (516-01); component render assertions for `FormDesignPanel`,
  `FormCanvas` select/type previews, `FieldSettingsPanel` field-type control
  gating (516-02/04/05).
- **Bun runtime/route/DB** (`tests/integration/routes/forms.test.ts`,
  `tests/unit/forms/*`, `tests/unit/server/publicFormsApi.test.ts`): the MANDATORY
  theme-persistence round-trip (write `theme` → read back equal + present-only
  no-theme-key assertion) lives in `tests/unit/forms/formsService.test.ts` (516-01)
  — the Bun DB lane that actually persists rows (`import { db }`,
  `db.delete(forms)`, mirroring the existing `layoutMode` round-trip); keep
  `tests/integration/routes/forms.test.ts` for mock-only route-wiring / schema-shape
  assertions (it imports only from `"bun:test"` with NO `db` import, so it CANNOT
  create/persist rows and must NOT hold the persistence assertion). File field
  submission validation (516-07). **Shared-DB safety:** integration tests create
  and clean up their own form rows (unique slug per test); never assume seed
  data; the local Postgres is a resettable test DB.
- **Playwright smoke (mandatory for this UI work):** ≥5 distinct real-flow
  scenarios (add Phone field end-to-end; select-field renders as a real select in
  canvas; apply a full theme and see computed styles change in canvas + runtime
  preview; multi-step + per-field width still honored under a form theme; publish
  → front `formEmbed` inherits the theme). Assert VISIBLE effects (computed
  styles/geometry/DOM state), light + dark, 0 console errors, screenshots to
  `_docs/_workflows/_smoke/`.

## UI/UX fidelity + max-config-flexibility notes

- Reproduce the prototype builder LAYOUT faithfully (in-page `PageHeader` +
  framed canvas card, FIELDS rail incl. Phone + File, toolbar status badge +
  device toggle + Publish) before extending. No conservative fallback that keeps
  the old full-screen-only chrome.
- The Design tab must integrate cleanly and tastefully into the existing form
  inspector tab set (`Settings | Automation` → add `Design`), reusing existing
  color-swatch / clearable-style controls the widget editors already use, so the
  new controls feel native.
- Maximum flexibility: every theme token is optional, resettable to the resolved
  default, and independently overridable; per-field style still overrides the
  form default (columns/width precedence documented in 516-04).

## Open Questions

- **Live admin side-by-side was blocked (verification caveat).** The bot-protection
  captcha / rate-limit on the admin login route (`:5173`) blocked a live admin
  side-by-side capture under load, so the current-side gap analysis (G1–G4, B1–B6)
  is grounded in **source** (`core/admin/ui/forms/*`, services, routes, schema),
  which is authoritative for what exists today; the **prototype** side is grounded
  in prototype SOURCE + a live prototype screenshot
  (`_docs/_workflows/_smoke/wf516-proto-builder.png`, `http://localhost:5180/#/advanced/forms/sample`,
  no auth). RESOLUTION: implementers should re-confirm the current-side chrome by
  running the local admin (`coderso-dev-core-host`, admin at
  `http://coderso-a.localhost:5173/admin/`) once login is reachable; no contract
  claim depends on the blocked admin screenshot.
- **516-07 file field is scoped to REFERENCE existing media, not add a table.**
  Decision: the `file` field validates its submitted value as a **media reference**
  that resolves to an existing, owned media row (see Security Contract §516-07),
  rather than introducing a new uploads table / DDL. Rationale: keeps TASK-516
  DDL-free (consistent with the jsonb-only theme model), reuses the existing media
  ownership/authorization path, and avoids a schema migration in an already-Large
  task. A dedicated per-form file-upload store (with its own table + retention
  policy) is an explicit follow-up, not folded into 516-07.

## Definition of done

All 7 subtasks landed in order; theme persists + round-trips + rejects unknown
keys; no-theme forms emit no `theme` key (present-only invariant, not whole-object
byte-identity — the normalizer is fully-defaulted); all enumerated broken fields fixed;
builder matches prototype (`EditorFrame` + `PageHeader`, FIELDS rail via
`EditorRailGroup`/`EditorRailItem`, functional device toggle, render-only
disabled undo/redo per the 516-03 scope decision, `Publish` action); theme
applies in canvas + runtime preview + public `formEmbed` (form theme = base,
per-embed overrides); Security Contract satisfied (theme colors policy-checked at
normalize + render via `resolveClearableCssColorValue`; file field validated as
an owned media reference); every gate green (root `tsc -p tsconfig.json --noEmit`,
`bun --cwd core lint:types`, vitest, `bun test`, `gates:coderso`); ≥5-scenario
Playwright smoke passes light + dark with 0 console errors; closure documented
under changelog 1228.
