# TASK-252-06-04: FAQ Accordion Support CTA Icon Placement and Defaults

# FileName: TASK-252-06-04_FAQ_Accordion_Support_CTA_Icon_Placement_and_Defaults.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** Done
**Started:** 2026-05-12
**Completed:** 2026-05-12

---

## Overview

Improve FAQ Accordion from the question/answer contract first, then add the
research-backed support CTA, icon placement, and disclosure defaults. Categories
and search stay Adapt-only unless the implementation extends schema/defaults/
normalizer/render/editor/tests together.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/faq-accordion/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/faq-accordion/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/faq-accordion/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/faq-accordion/MATRIX.md`; for this leaf, start from the current owner fields `header`, `items`, `options`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: question/answer rows, single/multiple/default-open behavior,
  collapsible semantics, support/contact CTA, and constrained icon
  placement/style from `_docs/_WIDGETS/tmp/faq-accordion/MATRIX.md`.
- Adapt: categories and search remain conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `faq-accordion`.
- `Visual`: `Questions`, `Support CTA`, `Icon placement`, `Disclosure defaults`, `Panel style`.
- `Advanced`: `A11y diagnostics`, `Legacy answer mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/faqAccordion.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer fields change.
- `tests/vitest/widgets/faqAccordion.test.tsx`
- `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_WIDGETS/tmp/faq-accordion/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-04_FAQ_Accordion_Support_CTA_Icon_Placement_and_Defaults.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type FaqSupportCta = {
  label?: string;
  href?: string;
  ariaLabel?: string;
};

type FaqIconOptions = {
  enabled?: boolean;
  position?: "start" | "end";
  openIcon?: "chevron" | "plus";
  closedIcon?: "chevron" | "plus";
};

function normalizeFaqAccordionData(data: FaqAccordionData): FaqAccordionData {
  const items = normalizeFaqAccordionItems(data.items);
  return {
    header: normalizeFaqAccordionHeader(data.header),
    items,
    options: normalizeFaqAccordionOptions({
      openMode:
        data.options?.openMode ??
        ((data.options?.allowMultipleOpen ?? data.options?.allowMultiple)
          ? "multiple"
          : "single"),
      defaultOpenIds:
        data.options?.defaultOpenIds ??
        normalizeLegacyFaqDefaultOpenIndex(data.options?.defaultOpenIndex, items) ??
        normalizeLegacyFaqOpenId(data.options?.initiallyOpenId),
      collapsible: data.options?.collapsible ?? true,
    }),
    supportCta: normalizeFaqSupportCta(data.supportCta),
    icon: normalizeFaqIconOptions(data.icon),
    style: normalizeFaqAccordionStyle(data.style),
  };
}

function normalizeFaqAccordionItem(item: FaqAccordionItem, index: number): FaqAccordionItem {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `faq-accordion-${index + 1}`),
  };
}

function FaqAccordionVisualEditor(props: WidgetEditorProps<FaqAccordionData>) {
  return (
    <WidgetEditorSection id="faq-accordion.items" title="FAQ items">
      {props.value.items.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`faq-accordion.items.${index}.question`} label="Question" data-widget-control={`faq-accordion.items.${index}.question`}>
          <Input
            value={item.question ?? ""}
            onChange={(question) => props.onChange(updateFaqAccordionItem(props.value, index, { question }))}
          />
        </WidgetControlRow>
      ))}
      <WidgetControlRow id="faq-accordion.supportCta.label" label="Support CTA" data-widget-control="faq-accordion.supportCta.label">
        <Input value={props.value.supportCta?.label ?? ""} onChange={(label) => props.onChange(updateFaqSupportCta(props.value, { label }))} />
      </WidgetControlRow>
      <WidgetControlRow id="faq-accordion.supportCta.href" label="Support CTA link" data-widget-control="faq-accordion.supportCta.href">
        <Input value={props.value.supportCta?.href ?? ""} onChange={(href) => props.onChange(updateFaqSupportCta(props.value, { href }))} />
      </WidgetControlRow>
      <WidgetControlRow id="faq-accordion.icon.position" label="Icon position" data-widget-control="faq-accordion.icon.position">
        <SegmentedControl value={props.value.icon?.position ?? "start"} onChange={(position) => props.onChange(updateFaqIconOptions(props.value, { position }))} />
      </WidgetControlRow>
      <WidgetControlRow id="faq-accordion.options.collapsible" label="Allow all closed" data-widget-control="faq-accordion.options.collapsible">
        <Switch checked={props.value.options?.collapsible ?? true} onCheckedChange={(collapsible) => props.onChange(updateFaqOptions(props.value, { collapsible }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}

function renderFaqAccordionRuntime(
  items: FaqAccordionItem[],
  options: FaqAccordionOptions,
  supportCta?: FaqSupportCta,
  icon?: FaqIconOptions
) {
  const openIds = resolveFaqOpenIds(items, options);
  const supportHref = normalizeWidgetSafeHref(supportCta?.href);
  return (
    <div data-faq-accordion="1" data-faq-open-mode={options.openMode ?? "single"}>
      {items.map((item) => (
        <details
          key={item.id}
          data-faq-accordion-item={item.id}
          open={openIds.includes(item.id)}
        >
          <summary data-faq-icon-position={icon?.position ?? "start"}>{item.question}</summary>
          <div>{item.answer}</div>
        </details>
      ))}
      {supportCta?.label && supportHref ? (
        <a href={supportHref} aria-label={supportCta.ariaLabel}>
          {supportCta.label}
        </a>
      ) : null}
    </div>
  );
}

function bindFaqAccordionRuntime(root: HTMLElement) {
  // Native details/summary handles basic disclosure. If this leaf promises
  // runtime-enforced single-open or non-collapsible behavior after user
  // interaction, add an inline delegated controller that syncs open details and
  // accessible state. Otherwise document `openMode`/`defaultOpenIds` as SSR
  // initial state only.
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/faq-accordion/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/faqAccordion.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Define `supportCta` and `icon` schema/default/normalizer/render/editor
  contracts in this leaf if they remain in scope. `supportCta.href` must use the
  shared `normalizeWidgetSafeHref` helper before render, and icon placement must
  have bounded values plus renderer tests for start/end/default behavior.
- The current renderer uses native `details`/`summary`. Decide explicitly in
  implementation whether `openMode`, `defaultOpenIds`, and `collapsible` are
  SSR initial-state controls only, or whether they require a public delegated
  runtime controller. If enforcing single-open/non-collapsible behavior after
  interaction, ship the inline script and tests in the same slice.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `faq-accordion` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `faq-accordion` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/faqAccordion.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through a
    `core/widgets/core/widgetSafeHref.ts` helper with identical allowed/rejected
    protocol tests before render; media fields must stay on the
    existing media-picker/storage ownership path when one exists; raw URL media
    fields must add bounded sanitization and tests before render.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change; include accepted-new-field, unknown-field rejection, and
  legacy-normalization assertions for this widget.
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  must cover whether disclosure behavior is initial SSR-only or enforced by a
  delegated runtime controller; do not leave single/multiple/collapsible
  semantics implied but untested.
- Add support CTA tests for label/href rendering, unsafe href rejection through
  `widgetSafeHref`, and icon placement tests for start/end/default behavior.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-04_FAQ_Accordion_Support_CTA_Icon_Placement_and_Defaults.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `faq-accordion` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
