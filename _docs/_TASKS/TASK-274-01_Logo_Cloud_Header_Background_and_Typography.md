# TASK-274-01: Logo Cloud Header Background and Typography

# FileName: TASK-274-01_Logo_Cloud_Header_Background_and_Typography.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-274, TASK-256-02, TASK-313-02
**Status:** To Do

---

## Overview

Add Logo Cloud-specific trust-section copy and visual shell controls without
reopening the shared heading/ARIA repair owned by TASK-256.

Source report findings:

- BF-01 missing `eyebrow`
- BF-02 missing section background
- BF-07 missing header typography controls

Explicitly out of scope:

- Changing the heading element or adding `headingLevel`; TASK-256-06-02 owns
  the Logo Cloud slice of the shared heading hierarchy repair, and the live
  residual reopen now routes through `TASK-313-02`.
- Adding section `aria-label` / `aria-labelledby`; the shared accessibility
  baseline stays outside this leaf and is consumed from the current shared
  owner.
- Adding a second generic background/clear contract; this leaf uses existing
  clearable style helpers and widget-local fields only.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Extend `LogoCloudData.header` / `style`, schema, defaults, normalizer, and render output for eyebrow, section background, bounded header alignment, and bounded header size. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add Visual controls in `Header copy` and `Display style` using existing editor primitives and clearable field patterns. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover normalization, rendered eyebrow/background/style markers, and backward-compatible defaults. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover editor controls and update flow for eyebrow/background/typography. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared renderer markers or section output assertions change. |
| `tests/unit/widgets/validator.test.ts` | Add coverage only if intentionally expanding the generic Bun validator suite; otherwise keep Logo Cloud schema/default/normalizer assertions in `tests/vitest/widgets/logoCloud.test.tsx`. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document new data fields and mode ownership. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for BF-01/BF-02/BF-07. |

## Implementation Pseudocode

```tsx
type LogoCloudHeaderAlign = "start" | "center" | "end";
type LogoCloudHeaderSize = "sm" | "md" | "lg";

type LogoCloudData = {
  header?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
  style?: {
    sectionBackground?: string;
    headerAlign?: LogoCloudHeaderAlign;
    headerSize?: LogoCloudHeaderSize;
  };
};

function normalizeLogoCloudHeader(header: LogoCloudData["header"]) {
  return {
    eyebrow: resolveOptionalTrimmedString(header?.eyebrow),
    title: resolveString(header?.title, logoCloudDefaults.header?.title ?? ""),
    description: resolveString(header?.description, logoCloudDefaults.header?.description ?? ""),
  };
}

function normalizeLogoCloudStyle(style: LogoCloudData["style"]) {
  return {
    ...existingStyle,
    sectionBackground: resolveClearableStyleValue(style?.sectionBackground),
    headerAlign: resolveHeaderAlign(style?.headerAlign),
    headerSize: resolveHeaderSize(style?.headerSize),
  };
}

function LogoCloudBlock(props: { data: LogoCloudData; variant: string }) {
  const normalized = normalizeLogoCloudData(props.data);
  const sectionStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.sectionBackground),
  });
  return (
    <section style={sectionStyle} data-logo-cloud-header-align={headerAlign}>
      {normalized.header?.eyebrow ? <p className={eyebrowClass}>{normalized.header.eyebrow}</p> : null}
      {/* TASK-256 owns the actual heading element and landmark aria attributes. */}
    </section>
  );
}
```

Editor data flow:

1. Normalize the incoming value once per render through `normalizeLogoCloudData`.
2. Add an optional `Eyebrow` input before `Title` in Visual `Header copy`.
3. Add `Header alignment` and `Header size` selects with bounded enums.
4. Add a clearable `Section background` field using `ClearableInputField`.
5. Persist updates through existing `updateHeader` / `updateStyle`; do not add
   local state.

Error handling:

- Unknown enum values normalize to defaults.
- Empty eyebrow normalizes to omitted/empty and does not render a blank node.
- Cleared background omits the inline style instead of forcing `transparent`.
- Legacy payloads without new fields render exactly like current saved pages
  except for TASK-256 heading/ARIA changes that may already be present.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page/template save flow.
- Reject-unknown validation: schema must reject unknown `header` and `style`
  fields while accepting the new bounded fields.
- Anti-abuse: no raw HTML, script, unbounded class name, image URL, provider key,
  or browser-stored secret is introduced. Background values must use the existing
  clearable style policy and tests.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  markers or shared renderer output changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  clearable background semantics touch style-none adjacency.
- `bun test tests/unit/widgets/validator.test.ts` only when intentionally adding
  Logo Cloud coverage to the generic Bun validator suite.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/WIDGETS.md` only if this changes global widget copy.
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Visual mode exposes eyebrow, bounded header alignment/size, and clearable
  section background.
- Runtime renders the eyebrow and background without hardcoding unsafe styles or
  blank nodes.
- Header element/ARIA details remain delegated to TASK-256 and are not
  reimplemented here. `TASK-313-02` must finish the shared heading residual
  first.
- Schema/defaults/normalizer/tests preserve existing Logo Cloud payloads.
