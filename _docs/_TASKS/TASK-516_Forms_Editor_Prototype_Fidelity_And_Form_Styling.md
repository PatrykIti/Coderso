# TASK-516: Forms Editor — Prototype UI/UX, Field Fixes & Whole-Form Styling

# FileName: TASK-516_Forms_Editor_Prototype_Fidelity_And_Form_Styling.md

**Priority:** High
**Category:** Admin UI / Content (Forms) / Page Builder / Runtime / Schema (JSON model)
**Estimated Effort:** Large
**Dependencies:** Rides the existing validated `PATCH /forms/:id` + `PUT /forms/:id/fields` write paths (`core/server/routes/formsRoutes.ts`). Relates to TASK-490 (submissions export) — **kept distinct**: this task does NOT touch export/submissions listing scope.
**Status:** ⏳ To Do
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
  card with a toolbar (`Contact form · draft` badge, undo/redo, **desktop/mobile
  device toggle**). Current = full-screen `EditorShell` with a sticky sub-toolbar
  (Submissions / Action logs / Runtime preview / Save form) and NO device toggle,
  NO undo/redo, NO `Publish` primary action (only a status `Select`).
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
  the form.) We add a form-owned theme in `forms.settings.theme`.

## Schema-extension plan (JSON model — NO DDL)

`forms.settings` is a `jsonb` column (`schema.ts:1224`) already carrying
`layoutMode`, `saveProgress`, `stepTitles`, `preset`, `automationRetry`
(`formSettings.ts`). We extend the same normalized `FormSettings` model with a
new **`theme`** sub-record (present-only, defaulted, byte-identity round-trip),
mirroring the token vocabulary the `formEmbed` widget already ships so the widget
can inherit it:

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
    padding?: "sm" | "md" | "lg";
    shadow?: "none" | "sm" | "md" | "lg";
  };
  typography?: {
    titleSize?: "sm" | "md" | "lg" | "xl";
    titleWeight?: "medium" | "semibold" | "bold";
    titleColor?: string;
    labelColor?: string;
    helperColor?: string;
    fontFamily?: "inherit" | "sans" | "serif" | "mono";
  };
  input?: {
    size?: "sm" | "md" | "lg";
    radius?: "none" | "sm" | "md" | "lg";
    borderColor?: string;
    background?: string;
  };
  submit?: {
    background?: string;
    textColor?: string;
    radius?: "none" | "sm" | "md" | "lg";
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
  widget already uses). Legacy forms without `theme` normalize byte-unchanged.
- **Round-trip test is mandatory** for the new sub-record (fail-closed READ trap:
  every new key that joins the allowlist ships a persistence round-trip
  assertion + a present-only byte-identity assertion for the default/no-theme
  form).
- **File field (516-07) is the only candidate for DDL** and is deliberately
  scoped to reference existing media rather than add a table; see Open Questions.

## Subtask breakdown (single-writer file ownership; strictly sequential land order)

| # | Subtask | Sole-writer files | Depends on |
|---|---------|-------------------|------------|
| 516-01 | Form theme/style model (settings) + resolver | `core/services/forms/formSettings.ts`, `core/services/forms/formTheme.ts` (NEW), `core/admin/services/formsClient.ts` (FormSettings type) | — (foundation) |
| 516-02 | Design inspector panel (new component) | `core/admin/ui/forms/FormDesignPanel.tsx` (NEW) | 516-01 |
| 516-03 | Builder chrome + rail fidelity + wiring | `core/admin/ui/forms/FormBuilderPage.tsx`, `FieldLibrary.tsx`, `FieldListPanel.tsx` | 516-01, 516-02, **516-04** (FormCanvas `deviceWidth`/`theme` prop signature must exist before FormBuilderPage passes them) |
| 516-04 | Canvas fidelity + field-preview fixes (B2/B3/B5) + theme apply | `core/admin/ui/forms/FormCanvas.tsx` | 516-01 |
| 516-05 | Field settings control fixes (B1 wiring/B4/B5/B6) | `core/admin/ui/forms/FieldSettingsPanel.tsx`, `core/services/forms/fieldSettings.ts` | 516-01 |
| 516-06 | Runtime theme application (preview + public inherit) | `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`, `core/widgets/core/formEmbed.tsx` | 516-01, 516-04 |
| 516-07 | `file` field type (optional/heaviest) | `core/services/forms/validation.ts`, `core/services/forms/submissionService.ts`, submission route in `formsRoutes.ts`, **+ additive `file`-case-only edits to `FieldLibrary.tsx`/`FormBuilderPage.tsx` (rail item), `FormCanvas.tsx` (preview), `formEmbed.tsx` (control), `FormRuntimePreviewDialog.tsx` (control)** — see File-case seam below | 516-03, 516-04, 516-05, 516-06 |

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
  change needed for B4/B5). `formEmbed.tsx` primary owner is **516-06**;
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
- The shared theme vocabulary (enum unions, clamp sets, `resolveFormTheme`
  helper name) is defined **once** in 516-01 and imported read-only by
  516-02/04/06. Any drift in these enums between subtasks is a reconcile failure.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` — the orchestrator
  owns board rows. Closure changelog pinned to **1228**.
- rg misdetects the large TSX (`formEmbed.tsx`, `FormBuilderPage.tsx`) as binary
  — use `Read` / `grep -an`, never trust an empty `rg`.

## Testing strategy (lanes)

- **Vitest, Bun-free pure** (`tests/vitest/forms/*`): `formSettings.ts` theme
  normalize/reject-unknown/clamp/round-trip/byte-identity (516-01);
  `formTheme.ts` token→class resolution (516-01); `fieldSettings.ts` option
  lists (516-05).
- **Vitest admin/UI** (`tests/vitest/admin/*`): `formsClient.ts` theme
  round-trip (516-01); component render assertions for `FormDesignPanel`,
  `FormCanvas` select/type previews, `FieldSettingsPanel` field-type control
  gating (516-02/04/05).
- **Bun runtime/route/DB** (`tests/integration/routes/forms.test.ts`,
  `tests/unit/forms/*`, `tests/unit/server/publicFormsApi.test.ts`): PATCH
  settings persists `theme` and rejects unknown theme keys (516-01);
  `formRuntimeResolver` returns `theme` through the resolution
  (`tests/vitest/forms/formRuntimeResolver.test.ts`, 516-06); file field
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

## Definition of done

All 7 subtasks landed in order; theme persists + round-trips + rejects unknown
keys; no-theme forms are byte-identical; all enumerated broken fields fixed;
builder matches prototype; theme applies in canvas + runtime preview + public
`formEmbed`; every gate green (root `tsc -p tsconfig.json --noEmit`,
`bun --cwd core lint:types`, vitest, `bun test`, `gates:coderso`); ≥5-scenario
Playwright smoke passes light + dark with 0 console errors; closure documented
under changelog 1228.
