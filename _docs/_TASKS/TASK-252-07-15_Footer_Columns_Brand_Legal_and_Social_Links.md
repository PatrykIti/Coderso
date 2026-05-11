# TASK-252-07-15: Footer Columns Brand Legal and Social Links

# FileName: TASK-252-07-15_Footer_Columns_Brand_Legal_and_Social_Links.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Refine footer columns, brand, legal/social links, and safe link sources while
keeping newsletter references Adapt-only and rejecting raw provider signup code.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/footer/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/footer/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/footer/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: multi-column link groups, menu/policy sources, safe manual links,
  logo/brand/copyright, and social links from
  `_docs/_WIDGETS/tmp/footer/MATRIX.md`; start from the current owner fields
  `columns`, `legal`, `social`, `layout`, and `style`, plus the existing
  builder-owned slots `column-1`, `column-2`, `column-3`, and `bottom`. This
  leaf must either add an explicit `brand` schema/default/normalizer/render/
  editor/test contract or derive brand copy from existing footer columns/legal
  fields; do not imply `brand` already exists in `FooterData`.
- Adapt: newsletter references and dense commerce locale/currency controls
  remain conditional; implement only when schema/defaults/normalizer/render/
  editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `footer`.
- `Visual`: `Columns`, `Brand`, `Legal/social`, `Surface`, `Footer slots`.
- `Advanced`: `Link diagnostics`, `Legacy column mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/footer.tsx`
- `core/admin/ui/widgets/editors/FooterEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/footer.test.tsx`
- `tests/vitest/ui/footer-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/_WIDGETS/tmp/footer/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-15_Footer_Columns_Brand_Legal_and_Social_Links.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeFooterData(data: FooterData): FooterData {
  return {
    columns: normalizeFooterColumns(data.columns),
    brand: normalizeFooterBrand(data.brand), // add this schema field in the same implementation slice
    legal: normalizeFooterLegal(data.legal),
    social: normalizeFooterSocial(data.social),
    layout: normalizeFooterLayout(data.layout),
    style: normalizeFooterStyle(data.style),
  };
}

function FooterVisualEditor(props: WidgetEditorProps<FooterData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="footer.0" title="Footer columns">
      <WidgetControlRow id="footer.columns.0.title" label="Column title">
        {(field) => <Input id={field.id} value={value.columns?.[0]?.title ?? ""} onChange={(event) => props.onChange(updateFooterColumn(value, 0, { title: event.target.value }))} aria-describedby={field.describedById} />}
      </WidgetControlRow>
      <WidgetControlRow id="footer.brand.logoAlt" label="Logo alt text">
        {(field) => <Input id={field.id} value={value.brand?.logoAlt ?? ""} onChange={(event) => props.onChange(updateFooterBrand(value, { logoAlt: event.target.value }))} aria-describedby={field.describedById} />}
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}

const footerSlotGroup: WidgetSlotControlGroup = {
  widgetType: "footer",
  includeSlotIds: ["column-1", "column-2", "column-3", "bottom"],
  sectionId: "footer.slots",
  title: "Footer slots",
};
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/footer/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/footer.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- If implementing `footer.brand.*`, add the full `brand` field to
  `FooterData`, `footerSchema`, defaults, normalizer, renderer, editor controls,
  validator tests, widget tests, and editor-wave tests in the same slice. If
  brand remains derived from existing columns/legal data, remove `footer.brand.*`
  editor rows from this leaf.
- Refactor `core/admin/ui/widgets/editors/FooterEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Preserve the existing footer slots (`column-1`, `column-2`, `column-3`,
  `bottom`) as builder-owned slot surfaces. Do not move them into `FooterData`,
  do not remove them from the widget definition, and do not duplicate slot
  add/remove logic in `FooterEditors.tsx`; register `footerSlotGroup` in the
  builder-level TASK-252-01 slot-control map and render it from
  `VisualPanel`/`BlockSettings` with stable `footer.slots` metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `footer` output is public page/runtime output.
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
  - changed `footer` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/footer.tsx`.
- Anti-abuse:
  - all public footer hrefs must pass core-owned safe href normalization before
    render, including column links, legal links, and social hrefs: relative
    paths, hash links, and HTTP(S) URLs are allowed; `javascript:`, `data:`,
    `vbscript:`, protocol-relative URLs, and unknown protocols are rejected or
    normalized away.
  - newsletter provider secrets stay backend-owned

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- Add footer widget assertions that unsafe column, legal, and social href
  payloads such as `javascript:alert(1)`, `data:text/html,...`, and
  `//evil.example` do not survive normalization or render as links.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-15_Footer_Columns_Brand_Legal_and_Social_Links.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `footer` editor exposes research-backed columns, brand/derived-brand,
  legal/social, link, and surface controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
