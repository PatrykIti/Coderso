# TASK-244-04-02: Form, Navigation, Footer, and Primitive Panel Color Clear

# FileName: TASK-244-04-02_Form_Navigation_Footer_and_Primitive_Panel_Color_Clear.md

**Priority:** High
**Category:** Widgets + Forms + Shell + Panels
**Estimated Effort:** Large
**Dependencies:** TASK-244-03-01, TASK-244-03-02
**Status:** To Do

---

## Overview

Add clear controls and runtime output omission for form widgets, global shell
widgets, and primitive panel widgets with forced or configurable backgrounds.

Target widgets:

- `contact`
- `newsletter`
- `form-embed`
- `navigation`
- `footer`
- `accordion`
- `tabs`
- `toggle-block`

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/contact.tsx`
- `core/widgets/core/newsletter.tsx`
- `core/widgets/core/formEmbed.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `core/widgets/core/accordion.tsx`
- `core/widgets/core/tabs.tsx`
- `core/widgets/core/toggleBlock.tsx`
- `core/admin/ui/widgets/editors/ContactEditors.tsx`
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx`
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/admin/ui/widgets/editors/FooterEditors.tsx`
- `core/admin/ui/widgets/editors/AccordionEditors.tsx`
- `core/admin/ui/widgets/editors/TabsEditors.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- `tests/vitest/widgets/contact.test.tsx`
- `tests/vitest/widgets/newsletter.test.tsx`
- `tests/vitest/widgets/formEmbed.test.tsx`
- `tests/vitest/widgets/navigation.test.tsx`
- `tests/vitest/widgets/footer.test.tsx`
- `tests/vitest/widgets/accordionWidget.test.tsx`
- `tests/vitest/widgets/tabs.test.tsx`
- `tests/vitest/widgets/toggleBlock.test.tsx`
- `tests/vitest/ui/contact-editor-wave.test.tsx`
- `tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `tests/vitest/ui/footer-editor-wave.test.tsx`
- `tests/vitest/ui/accordion-editor-wave.test.tsx`
- `tests/vitest/ui/tabs-editor-wave.test.tsx`
- `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`

No per-widget docs currently exist for `accordion`, `tabs`, or `toggle-block`.
Document their shared primitive-panel clear semantics in `_docs/WIDGETS.md`
unless implementation deliberately creates exact new `_docs/_WIDGETS/*.md`
files for those widgets. If new files are created, update
`_docs/_WIDGETS/README.md` in the same leaf.

## Implementation Notes

Navigation already has a transparent behavior mode. Do not replace that product
behavior. Add clear semantics only for style-owned color/background fields such
as CTA background or shell surface fields where the user can currently configure
a value but cannot clear it.

For forms, keep input readability and accessibility intact. Clearing a surface
must not make focus rings, labels, error messages, or submit controls unusable.
Do not include `form-embed` `inputSize` in this task; that is TASK-242 token
work. TASK-244 only covers root/background/surface fields and any explicit
button surface contract introduced by implementation.

For primitive panel widgets, preserve state semantics:

- `accordion.surfaceColor`
- `tabs.surfaceColor`
- `tabs.activeBackgroundColor`
- `tabs.panelBackgroundColor`
- `toggleBlock.surfaceColor`
- `toggleBlock` accent backgrounds where style-owned

This leaf must extend the current widget contracts in place. If a target field
already exists but its normalizer re-materializes a default, apply
TASK-244-01-02 before adding the editor `Clear` action. If a target field does
not exist, add it to the owning widget data type, schema, defaults, normalizer,
renderer, editor, tests, and docs while preserving `additionalProperties: false`.
Do not create an alternate form/shell/panel styling flow.

Default and compatibility policy:

- `contact`, `newsletter`, `form-embed`, `navigation`, `footer`, `accordion`,
  `tabs`, and `toggle-block` use **creation default only** for clearable
  background/surface fields already represented in widget defaults.
- A cleared field must remain absent in the saved style object and rendered
  output. If clearing removes the last key in `style`, persist `style: {}` when
  required to override shallow-merged defaults.
- Preserve navigation transparent behavior, form accessibility states, and panel
  selected/expanded semantics through local widget logic, not through a shared
  merge-path change.

## Per-Widget Implementation Matrix

| Widget | Runtime field/output | Editor clear behavior | Regression proof |
|---|---|---|---|
| `contact` | `style.background` and `style.surfaceColor` at `contact.tsx:30-32`, schema `contact.tsx:179-181`, defaults `contact.tsx:204-206`, normalizer `contact.tsx:261-265`, runtime `contact.tsx:299-303` | Add `Clear` to `ContactEditors.tsx:619-636`; remove `background` and `surfaceColor` from `style` | `contact.test.tsx` asserts cleared section/card omit backgrounds; `contact-editor-wave.test.tsx` asserts key removal and no `"transparent"` sentinel |
| `newsletter` | `style.background` at `newsletter.tsx:24`, schema `newsletter.tsx:102`, defaults `newsletter.tsx:129`, `newsletter.tsx:187`, normalizer `newsletter.tsx:215`, runtime `newsletter.tsx:247` | Add `Clear` to `NewsletterEditors.tsx:514-517` | Assert cleared background omits `backgroundColor` and CTA theme token remains readable |
| `form-embed` | `style.background` and `style.surface` at `formEmbed.tsx:20-21`, defaults/fallbacks `formEmbed.tsx:154-155`, `formEmbed.tsx:244-245`, normalizer `formEmbed.tsx:270-271`, runtime `formEmbed.tsx:494-497` | Add `Clear` to `FormEmbedEditors.tsx:495-506`; exclude `inputSize` at `FormEmbedEditors.tsx:564-574` | Assert background/surface keys are removed; submit/step buttons stay accessible; no `inputSize` behavior changes |
| `navigation` | `surfaceColor`, `ctaBackgroundColor`, and related CTA colors at `navigation.tsx:62-67`, schema `navigation.tsx:196-201`, runtime `navigation.tsx:320-343`, CTA output `navigation.tsx:430-436` | Add `Clear` to `NavigationEditors.tsx:1049-1098`; preserve transparent behavior toggle at `NavigationEditors.tsx:1191-1198` | Assert surface/CTA clears remove keys while transparent behavior still overrides surface color |
| `footer` | `surfaceColor` at `footer.tsx:38`, schema `footer.tsx:119`, runtime `footer.tsx:303` | Add `Clear` to `FooterEditors.tsx:560-564` | Assert cleared footer omits background style and layout blocks remain |
| `accordion` | `surfaceColor` at `accordion.tsx:27`, schema `accordion.tsx:74`, default `accordion.tsx:100`, normalizer `accordion.tsx:191-194`, runtime `accordion.tsx:280` | Add `Clear` to `AccordionEditors.tsx:306-312` | Assert cleared accordion items omit panel background and expanded state remains |
| `tabs` | `surfaceColor`, `activeBackgroundColor`, and `panelBackgroundColor` at `tabs.tsx:27-32`, schema `tabs.tsx:77-82`, defaults `tabs.tsx:98-103`, normalizer `tabs.tsx:199-222`, runtime `tabs.tsx:340-355` | Add `Clear` to the existing `TabsEditors.tsx:319-365` surface/active controls and add a panel background control there because the live editor currently does not expose `panelBackgroundColor`; preserve text and border color controls | Assert cleared surface/active/panel backgrounds omit style without breaking selected tab state |
| `toggle-block` | `surfaceColor` at `toggleBlock.tsx:23`, schema `toggleBlock.tsx:53`, default `toggleBlock.tsx:71`, normalizer `toggleBlock.tsx:106-109`, runtime `toggleBlock.tsx:207` | Add `Clear` to `ToggleBlockEditors.tsx:245-255` | Assert cleared surface omits background and toggle behavior still works |

## Implementation Pseudocode

```ts
const rootStyle = compactStyle({
  backgroundColor: resolveClearableStyleValue(style.background),
});

const ctaStyle = compactStyle({
  backgroundColor: resolveClearableStyleValue(style.ctaBackgroundColor),
  color: resolveClearableStyleValue(style.ctaTextColor),
  borderColor: resolveClearableStyleValue(style.ctaBorderColor),
});
```

For widgets currently using class-only backgrounds, introduce a style field only
where it maps to user-facing control.

```tsx
<section className={joinClasses("rounded-xl border p-5", hasClearedSurface ? undefined : "bg-[var(--color-bg)]/95")} />
```

When cleared, prefer no background class and no inline background style.

Editor clear helpers must remove keys from `style`. If the widget's defaults
include `style`, keep `style: {}` when the last key is cleared so the shared
shallow default merge cannot re-materialize a cleared surface.

```ts
function clearPanelStyle<K extends keyof WidgetStyle>(key: K) {
  const { [key]: _removed, ...nextStyle } = value.style ?? {};
  onChange({
    ...value,
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
}
```

## Security Contract

- Visibility:
  - form/navigation/footer/panel widget editor controls are internal admin UI;
  - rendered widgets remain public page/runtime output.
- Auth model:
  - no new endpoint is introduced;
  - edits persist through existing authenticated admin page/template save flows.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this leaf does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - form, navigation, footer, and primitive panel style fields must stay
    schema-first and reject unknown keys.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - CTA/form/button color values must be validated fields or inline styles, not
    dynamic class fragments.
- Compatibility:
  - navigation transparent behavior, form input readability, submit state colors,
    and panel expanded/selected state semantics must remain intact.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/toggleBlock.test.tsx`
- Matching editor-wave tests:
  - `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- Add assertions that clear removes saved keys and does not write
  `"transparent"` or empty strings as off-state payloads.
- Add schema/normalizer assertions for every new or newly-clearable style field:
  configured value, cleared omission, legacy/default behavior where applicable,
  and rejected unknown style keys.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`
- New exact primitive panel docs only if implementation creates them for
  `accordion`, `tabs`, or `toggle-block`; otherwise keep primitive panel clear
  semantics in `_docs/WIDGETS.md`.
- `_docs/_WIDGETS/README.md` if any new primitive panel doc file is created
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Form widget backgrounds/surfaces can be cleared without breaking inputs.
2. Navigation/footer style-owned backgrounds can be cleared without changing
   route or menu behavior.
3. Primitive panel widget surfaces can be cleared while preserving active/state
   semantics.
4. Runtime/editor tests prove clear removes saved fields and rendered output.
5. `form-embed` `inputSize` remains outside this task and is not changed as a
   side effect of surface clearing.
6. Clear removes keys instead of serializing `"transparent"` as an off state.
