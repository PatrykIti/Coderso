# TASK-213-06-05: CTA and Compare Timeline Quick Fields
# FileName: TASK-213-06-05_CTA_and_Compare_Timeline_Quick_Fields.md

**Priority:** Medium
**Category:** Content Widgets + Admin/UI + Wizard UX
**Estimated Effort:** Medium
**Dependencies:** TASK-213-06, TASK-213-05-02
**Status:** To Do

---

## Overview

Fix the underpowered quick fields for CTA Banner and Compare Timeline from the
per-widget audit.

Business outcome: editors can set the content that visibly defines these
sections without discovering hidden public preset text only after previewing.

Technical contract: keep Wizard concise, but do not hide rendered public copy
behind presets. New quick fields must map to existing widget schema/defaults or
extend the owner normalizer first.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- `core/widgets/core/ctaBanner.tsx`
- `core/widgets/core/compareTimeline.tsx`
- `tests/vitest/widgets/ctaBanner.test.tsx`
- `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `tests/vitest/widgets/compareTimeline.test.tsx`
- `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`

## Implementation Direction

CTA Banner:

```tsx
<Input label="Eyebrow" value={normalized.eyebrow} onChange={setEyebrow} />
<Textarea label="Description" value={normalized.description} onChange={setDescription} />
<Input label="Secondary CTA label" value={secondary.label} onChange={setSecondaryLabel} />
<Input label="Secondary CTA URL" value={secondary.href} onChange={setSecondaryHref} />
```

Compare Timeline:

```tsx
<Input label="Track 1 label" value={trackA.label} onChange={setTrackALabel} />
<Input label="Track 2 label" value={trackB.label} onChange={setTrackBLabel} />
<Select label="Axis step count" value={String(stepCount)} onValueChange={setStepCount} />
<p className="text-xs text-muted-foreground">
  Step labels are managed in Visual when more detail is needed.
</p>
```

If adding all step fields would make Wizard too dense, add clear helper copy and
route full step editing to Visual. Do not silently render preset labels that the
editor cannot find.

## Security Contract

- Visibility: internal admin editor; normalized widget output may render
  publicly.
- Auth/RBAC/CSRF/rate-limit: unchanged page/template editor contracts.
- Reject-unknown validation:
  - new CTA/timeline fields must be schema-owned and normalized before UI
    exposure.
- Anti-abuse:
  - CTA URLs must use existing safe URL handling;
  - no unsafe HTML/script content may be introduced through helper fields.

## Testing Requirements

- `tests/vitest/widgets/ctaBanner.test.tsx`
  - secondary CTA, description, and eyebrow normalize/render safely.
- `tests/vitest/widgets/compareTimeline.test.tsx`
  - track labels and axis count normalize deterministically;
  - helper-scoped hidden fields do not render stale preset surprises.
- UI/editor tests:
  - paired CTA URL inputs have accessible labels;
  - changing step count preserves deterministic labels/defaults.
- Manual Playwright:
  - add CTA Banner and Compare Timeline, edit quick fields, save/reopen, and
    verify preview text matches editor input.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`

## Acceptance Criteria

1. CTA Banner quick setup exposes rendered public copy or clearly routes it to
   Visual.
2. Compare Timeline quick setup makes track labels and axis count understandable.
3. Tests cover normalized fields and accessible paired inputs.
