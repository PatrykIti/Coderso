# TASK-516-06: Runtime Theme Application (Preview + Public Inherit)

# FileName: TASK-516-06-Runtime-Theme-Application.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Runtime / Public Widgets
**Estimated Effort:** Medium
**Dependencies:** TASK-516-01 (`resolveFormTheme`, token maps), TASK-516-04
(canvas theme application patterns to mirror).
**Status:** ⏳ To Do

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` and
`core/widgets/core/formEmbed.tsx`.** Makes the form theme apply where the form is
actually rendered:

1. **Runtime preview** (`FormRuntimePreviewDialog.tsx`) — apply
   `resolveFormTheme(settings.theme)` to the preview form (container width/align,
   card, colors, input styling, submit label/colors/fullWidth) so the admin
   preview matches the canvas + front.
2. **Public `formEmbed`** — the widget already receives the resolved form
   settings via `formRuntimeResolver` (which returns `normalizeFormSettings(...)`
   → now includes `theme`, `formRuntimeResolver.ts:71,98`) and exposes them as
   `resolved.settings` (`formEmbed.tsx:1053-1060`). Make the widget **inherit the
   form theme as its base defaults**, with the existing per-instance
   `FormEmbedStyle`/`FormEmbedLayout` (`formEmbed.tsx:13-38`) taking precedence
   when set. i.e. resolution order: per-embed instance style > form theme >
   widget defaults.

## Pseudocode (grounded in real code)

`FormRuntimePreviewDialog.tsx`:

```tsx
import { resolveFormTheme, formThemeWidthClass, ... } from "../../../services/forms/formTheme";
const t = resolveFormTheme(settings.theme);
// wrap the preview grid container with width/align classes; apply card/colors via style vars;
// submit button: label = t.submit.label ?? "Submit preview" (keep preview semantics), colors/radius/fullWidth from t.submit
```

`formEmbed.tsx` (extend `FormEmbedResolvedData.settings` type + resolveStyle/resolveLayout):

```ts
// FormEmbedResolvedData.settings (:93) add: theme?: FormFormTheme
// when building the widget's effective style/layout, merge form theme UNDER per-instance:
const formTheme = resolveFormTheme(resolved?.settings?.theme);
const effectiveStyle: FormEmbedStyle = {
  background: data.style?.background ?? mapThemeSurfaceBackground(formTheme) ?? undefined, // instance > form > widget-default
  radius: data.style?.radius ?? mapThemeRadius(formTheme) ?? undefined,
  submitBackground: data.style?.submitBackground ?? formTheme.submit.background ?? undefined,
  // ...map each overlapping token; non-overlapping form-theme tokens applied directly to container/typography
};
const effectiveLayout: FormEmbedLayout = { width: data.layout?.width ?? mapThemeWidth(formTheme), align: ..., spacing: ... };
// keep existing resolveStyle/resolveLayout defaults as the final fallback (byte-identity when no theme + no instance style)
```

**Byte-identity requirement:** when a form has NO `theme` AND the embed has no
per-instance style, the widget output must be **byte-identical** to today
(present-only: the theme→widget mapping only contributes a token when the form
actually set it). Add a mapping helper, not a rewrite of `resolveStyle`.

Error handling: `resolveFormTheme(undefined)` returns defaults but the mapping
helpers return `undefined` for unset tokens so nothing new is emitted — preserving
the existing `formEmbed` SSR/hydration snapshot for un-themed forms.

## Security Contract

**Read/render path only; no new route/RBAC/endpoint/migration.** The public
submission route (`POST /forms/:id/submissions`,
`formsRoutes.ts:306` → `handleFormSubmissionRoute`) and its
`validateSubmissionPayload` are **untouched** — theme is presentation-only and
never affects payload validation, allowed field names, bot protection, nonce, or
submission access. `formRuntimeResolver` already normalizes `settings` through
`normalizeFormSettings` (fail-soft), so a malformed stored theme cannot reach the
DOM as raw input. No new user-controlled data enters the render.

## Testing requirements + lanes

- **Bun runtime** `tests/vitest/forms/formRuntimeResolver.test.ts` (extend):
  the resolution returns `settings.theme` when set and omits it when unset.
- **Vitest widget** `tests/vitest/widgets/formRuntimeScript.test.ts` (extend):
  - a form with a theme renders with the mapped container width / submit color;
  - **byte-identity:** a form WITHOUT a theme and no per-instance style renders
    the exact pre-change markup (snapshot);
  - per-instance `data.style` still overrides the form theme (precedence).
- **Vitest admin/UI** `tests/vitest/admin/formRuntimePreviewDialog.test.tsx`
  (NEW/extend): preview applies theme container width + submit styling; un-themed
  preview unchanged.

## UI/UX fidelity + max-config-flexibility notes

The whole-form theme must be a single source of truth that travels with the form
to every render surface (canvas, admin runtime preview, public embed), while the
page-level `formEmbed` instance retains full override power for per-placement
tuning — maximum flexibility with consistent defaults.
