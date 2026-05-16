# TASK-263-02: CTA Banner Wizard and Action Editing UX

# FileName: TASK-263-02_CTA_Banner_Wizard_and_Action_Editing_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Editor UX + Validation
**Estimated Effort:** Large
**Dependencies:** TASK-263, TASK-263-01, TASK-256-01, TASK-256-07
**Status:** To Do

---

## Overview

Make CTA Banner action setup beginner-safe in Wizard and Visual modes.

`REPORT_CTA_BANNER_WIDGET.md` confirms that Wizard currently exposes only the
layout, headline, and primary CTA label. Visual exposes action label/href fields
but relies on placeholders instead of explicit labels and silently normalizes
unsafe URLs to `#`. This leaf adds CTA-specific action editing affordances
without changing the shared editor mode contract owned by TASK-256-01.

## Sub-Tasks

- [ ] Replace the Wizard layout `Select` with the same CTA variant card model
  used by Visual, or extract a CTA-local reusable variant card component.
- [ ] Add Wizard fields for primary CTA URL, secondary CTA label, and secondary
  CTA URL.
- [ ] Add an explicit secondary CTA enablement toggle so hiding the secondary
  action does not require clearing both label and href.
- [ ] Add visible `Label` and `URL` labels for primary and secondary action
  fields in Visual.
- [ ] Add CTA-local URL validation feedback that uses the same safe-href rules
  as `normalizeCtaBannerData()` before persistence.
- [ ] Preserve existing saved values when toggling secondary CTA off and on
  unless the user explicitly clears the values.
- [ ] Keep Advanced editor technical-only; do not move action editing into
  Advanced.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Wizard variant cards, primary URL field, secondary CTA controls, action field labels, URL feedback, and enablement toggle. |
| `core/widgets/core/ctaBanner.tsx` | Add schema/default/normalizer fields only if the enablement toggle needs persisted state. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover Wizard action fields, variant cards, labelled Visual action inputs, invalid URL feedback, and secondary toggle preservation. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Cover normalizer/render behavior for any new action enablement field. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document Wizard and action editing behavior. |

## Implementation Pseudocode

Action enablement model, only if a persisted toggle is required:

```ts
type CtaBannerAction = {
  label?: string;
  href?: string;
  enabled?: boolean;
};

function normalizeAction(action: CtaBannerAction | undefined, fallback: Required<CtaBannerAction>) {
  const label = resolveString(action?.label, fallback.label);
  const href = normalizeWidgetSafeHref(action?.href, safeHrefOptions) ?? fallback.href;
  return {
    label,
    href,
    enabled: typeof action?.enabled === "boolean" ? action.enabled : label.trim() !== "",
  };
}
```

URL feedback:

```ts
function getCtaHrefWarning(value: string | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  return normalizeWidgetSafeHref(raw, safeHrefOptions) ? null : "Use a relative, hash, http, or https URL.";
}
```

Editor flow:

```tsx
function ActionFields({ title, action, onPatch }: ActionFieldsProps) {
  const warning = getCtaHrefWarning(action.href);
  return (
    <fieldset>
      <legend>{title}</legend>
      <label>
        Label
        <Input value={action.label ?? ""} onChange={...} />
      </label>
      <label>
        URL
        <Input value={action.href ?? ""} aria-invalid={Boolean(warning)} onChange={...} />
      </label>
      {warning ? <p role="status">{warning}</p> : null}
    </fieldset>
  );
}
```

Error handling:

- Invalid URLs show editor feedback and still normalize to the safe fallback
  before render.
- Secondary CTA disabled state hides runtime output but does not destroy the
  user's draft label/href values.
- Sparse legacy actions normalize to current defaults.
- Wizard changes must use existing `onChange` and `onVariantChange` contracts;
  do not create a new block update path in this leaf.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update `ctaBannerSchema` for any persisted
  `enabled` field and keep `additionalProperties: false`.
- Anti-abuse: URL feedback must use the same safe-href allowlist as runtime
  normalization. Do not allow `javascript:`, unsafe data URLs, raw scripts, or
  custom click handlers.
- Secret handling: no private URLs, tokens, provider keys, or privileged
  settings in widget data, editor diagnostics, or tests.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CTA_BANNER.md` with Wizard variant/action coverage,
  secondary CTA enablement, and URL feedback behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` rows UX-03, UX-04,
  UX-05, UX-06, UX-07, and UX-08 after validation.

## Changelog Policy

- Covered by the TASK-263 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard can configure both primary and secondary CTA labels and URLs.
- Wizard variant selection gives visual CTA layout context, not only a dropdown.
- Visual action fields have explicit `Label` and `URL` labels.
- Unsafe URLs produce inline editor feedback and still render safely.
- Secondary CTA visibility is controlled intentionally without destructive
  clearing.
