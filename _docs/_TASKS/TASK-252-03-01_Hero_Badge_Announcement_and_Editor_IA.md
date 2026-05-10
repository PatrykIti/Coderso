# TASK-252-03-01: Hero Badge Announcement and Editor IA

# FileName: TASK-252-03-01_Hero_Badge_Announcement_and_Editor_IA.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-03
**Status:** To Do

---

## Overview

Turn the existing Hero surface into the first fully migrated TASK-252 example by adding a schema-first badge/announcement layer and reorganizing the editor around the shared inspector IA.

This is an execution leaf under `TASK-252-03`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/hero/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/hero/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Keep one `hero` widget type and preserve all existing layout, media, CTA, typography, background, border, preset, and responsive payloads.
- Add an optional badge/announcement model with label, optional prefix/icon text, safe href, tone/style, and placement that works for centered, split, and media-led variants.
- Preserve `widgets.hero.presets`: old presets must still apply, and new presets may include badge data without breaking older records.
- Expose badge/headline, CTA, media, typography, colors, borders, and currently
  supported responsive controls through the shared TASK-252 rows/sections and
  metadata. Existing background payloads remain render-compatible, but new
  background media, overlay, and motion controls stay Adapt-only for a separate
  leaf; proof rows and motion remain Adapt-only.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/hero/MATRIX.md`; for
  this leaf, start from the current `HeroData` fields plus the new schema-owned
  `badge` model, then add only the schema fields that the matrix explicitly
  keeps.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat social proof rows, motion/presentation extras, embedded forms/search, and proof/timeline hybrids as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: raw HTML badges, free-form class names, unbounded motion controls, and duplicate hero-pattern widgets.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `hero`.
- `Visual`: `Variant and preset`, `Badge and headline`, `CTA`, `Media`, `Surface`, `Typography and borders`.
- `Advanced`: `Responsive media behavior`, `Layout width and spacing`, `Preset compatibility diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/hero.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/services/userSettingsClient.ts` only if preset storage types change.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token adjacency changes.
- `tests/vitest/widgets/hero.test.tsx`
- `tests/vitest/widgets/heroEditors.test.tsx`
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/ui/hero-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/tmp/hero/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-03-01_Hero_Badge_Announcement_and_Editor_IA.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type HeroBadge = {
  enabled?: boolean;
  label: string;
  href?: string;
  prefix?: string;
  tone?: "neutral" | "primary" | "success" | "warning";
  placement?: "above-headline" | "inline-headline";
};

const heroBadgeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    label: { type: "string" },
    href: { type: "string" },
    prefix: { type: "string" },
    tone: { enum: ["neutral", "primary", "success", "warning"] },
    placement: { enum: ["above-headline", "inline-headline"] },
  },
};

const heroSchema = {
  ...currentHeroSchema,
  properties: {
    ...currentHeroSchema.properties,
    badge: heroBadgeSchema,
  },
};

const heroDefaults: HeroData = {
  ...currentHeroDefaults,
  badge: { enabled: false, label: "", tone: "neutral", placement: "above-headline" },
};

function normalizeHeroData(data: HeroData): HeroData {
  return {
    headline: normalizeHeroHeadline(data.headline),
    subhead: normalizeHeroSubhead(data.subhead),
    body: normalizeHeroBody(data.body),
    primaryCta: normalizeHeroCta(data.primaryCta),
    secondaryCta: normalizeHeroCta(data.secondaryCta),
    media: normalizeHeroMedia(data.media),
    layout: normalizeHeroLayout(data.layout),
    spacing: normalizeHeroSpacing(data.spacing),
    style: normalizeHeroStyle(data.style),
    background: preserveLegacyHeroBackground(data.background),
    responsive: normalizeHeroResponsive(data.responsive),
    badge: normalizeHeroBadge(data.badge),
  };
}

function normalizeHeroBadge(value: unknown): HeroBadge | undefined {
  if (!isRecord(value)) return undefined;
  const label = readTrimmedString(value.label);
  if (!label) return undefined;
  return {
    enabled: value.enabled !== false,
    label,
    href: normalizeHeroBadgeHref(value.href),
    prefix: readOptionalText(value.prefix),
    tone: normalizeHeroBadgeTone(value.tone),
    placement: normalizeHeroBadgePlacement(value.placement),
  };
}

function normalizeHeroBadgeHref(value: unknown): string | undefined {
  return normalizeHeroHref(value);
}

function normalizeHeroHref(value: unknown): string | undefined {
  return normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    rejectProtocols: ["javascript:", "data:", "vbscript:"],
    rejectProtocolRelative: true,
  });
}

function normalizeHeroCta(value: unknown): HeroCta | undefined {
  if (!isRecord(value)) return undefined;
  const label = readTrimmedString(value.label);
  if (!label) return undefined;
  return {
    label,
    href: normalizeHeroHref(value.href),
  };
}

function HeroBlock(props: WidgetRenderProps<HeroData>) {
  const data = normalizeHeroData(props.data);
  const badge = data.badge?.enabled ? data.badge : undefined;
  return (
    <HeroShell data={data}>
      {badge ? <HeroBadgeView badge={badge} data-widget-part="hero.badge" /> : null}
      <HeroHeadline data={data} />
    </HeroShell>
  );
}

function HeroVisualEditor(props: WidgetEditorProps<HeroData>) {
  return (
    <WidgetEditorSection id="badge-headline" title="Badge and headline">
      <WidgetControlRow id="hero.badge.label" label="Badge label">
        <Input value={props.value.badge?.label ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/hero/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/hero.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Add `badge` to `HeroData`, `heroSchema`, defaults/presets, the render path,
  and editor state together; existing presets without badge data must normalize
  to the previous rendered output.
- Do not add or expand background media, background overlay, or motion editor
  controls in this leaf. If the current editor already renders those controls,
  keep them as no-regression compatibility only and cover that old payloads
  still render through `preserveLegacyHeroBackground`.
- Extend the existing `HeroData` type in `core/widgets/core/hero.tsx` directly;
  do not introduce a parallel badge-only data type or editor-only local state.
- The `currentHeroSchema` and `currentHeroDefaults` pseudocode names refer to
  the existing `heroSchema` and defaults in `core/widgets/core/hero.tsx`; update
  those owners in place.
- Add a core-owned `normalizeHeroHref` helper in the Hero owner module, or
  extract a small widget-safe href helper and import it from Hero. Apply it to
  both existing CTA links (`primaryCta.href` / `secondaryCta.href`) and the new
  `badge.href`; do not leave the current public CTA anchors relying only on the
  editor-local `isValidHref` warning. Core normalization must reject
  `javascript:`, `data:`, `vbscript:`, protocol-relative URLs such as
  `//example.com`, and other non-HTTP protocols before render.
- Refactor `core/admin/ui/widgets/editors/HeroEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `hero` output is public page/runtime output.
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
  - changed `hero` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/hero.tsx`.
- Anti-abuse:
  - Badge text/prefix are text-only, not raw HTML.
  - Every public Hero href must pass core-owned safe href normalization before
    render, including existing primary/secondary CTA hrefs and the new badge
    href: relative paths, hash links, and HTTP(S) URLs are allowed;
    `javascript:`, `data:`, `vbscript:`, protocol-relative URLs, and unknown
    protocols are rejected or normalized away.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema validation changes.
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- Add Hero widget assertions that unsafe badge and CTA href payloads such as
  `javascript:alert(1)`, `data:text/html,...`, and `//evil.example` do not
  survive normalization or render as links.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-03-01_Hero_Badge_Announcement_and_Editor_IA.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- Hero badge data is schema-owned, normalized, rendered, editable, documented, and tested.
- Existing Hero payloads and presets remain editable and render without badge fields.
- Hero editor controls expose accessible labels or stable `data-widget-control` metadata.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
