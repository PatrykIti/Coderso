# TASK-291-04: Timeline Marker Accent Numbering and Step Link Model

# FileName: TASK-291-04_Timeline_Marker_Accent_Numbering_and_Step_Link_Model.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-291, TASK-291-01, TASK-291-02, TASK-291-03
**Status:** Done (2026-05-22)

---

## Overview

Add Timeline-owned marker and per-step presentation controls requested by the
Playwright report.

This leaf owns W3, W4, W6, W10, and U6. It must keep schema/defaults/rendering
strict and beginner-safe.

Final outcome: marker display modes, icon-in-marker rendering, accent
inheritance, and safe whole-step links are landed. `steps[].labelPosition`
remains intentionally deferred because only the global `layout.labelPosition`
field stays truthful across axis, chronology, alternating, and compact layouts.

## Sub-Tasks

- [x] Reuse the existing `style.markerColor` inheritance model so per-step
  accents fall back to the configured Timeline marker color instead of manual
  repeated values.
- [x] Add bounded marker display modes: dot, number, and icon.
- [x] Support icon-in-marker rendering with separate marker background and icon
  color controls.
- [x] Add per-step label-position override only if it stays deterministic across
  milestone, compact, chronology, and alternating layouts.
- [x] Add optional whole-step links through the shared safe-href normalizer.
- [x] Keep existing CTA links backward compatible and avoid nested interactive
  anchors.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/timeline.tsx` | Extend schema/defaults/normalizer and renderer for `style.markerColor` fallback, marker modes, icon-in-marker fields, optional step links, and any accepted label-position override. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Add Visual/Wizard controls for marker mode, icon marker color/background, existing marker color, and safe step link fields. |
| `tests/vitest/widgets/timeline.test.tsx` | Cover schema, normalization, marker modes, safe whole-step links, CTA compatibility, and no nested anchor output. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover marker controls and safe-link editor feedback. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run if shared safe-href behavior changes; do not change it for Timeline only unless required. |

## Field Ownership

| Field path | Type/allowed values | Default and migration rule |
|---|---|---|
| `style.markerColor` | optional safe color string | Existing global marker/accent owner; keep current default and migration behavior. Do not add a second `style.accentColor` field. |
| `style.markerDisplay` | `"dot"`, `"number"`, or `"icon"` | Defaults to `"dot"` so old payloads render unchanged. |
| `steps[].markerIcon` | optional plain text icon token/emoji | Empty values are omitted; legacy `steps[].icon` remains readable until docs and editor migration choose the final single field. |
| `steps[].markerIconColor` | optional safe color string | Omitted by default; renderer falls back to inherited accent/foreground. |
| `steps[].markerBackgroundColor` | optional safe color string | Omitted by default; renderer falls back to existing marker surface. |
| `steps[].labelPosition` | optional `"top"` or `"bottom"` only if deterministic across layouts | Omitted by default; if any layout cannot render it truthfully, this field is deferred rather than partially implemented. |
| `steps[].link` | optional `{ href?: string; label?: string }` | Omitted by default; normalized through `normalizeWidgetSafeHref()` and disabled or rendered outside CTA when a CTA exists. |

Existing `icon`, `accent`, and `cta` payloads must remain backward compatible.
Any migration should be non-destructive: normalize old fields for rendering and
write new fields only after the editor intentionally changes them.

`steps[].accent` remains the per-step override and takes precedence over
`style.markerColor`. New marker icon foreground/background fields must fall
back to `steps[].accent`, then `style.markerColor`, then the existing renderer
defaults. Any docs or editor labels that describe a global Timeline accent must
name the existing `style.markerColor` field, not introduce `style.accentColor`.

## Implementation Pseudocode

```ts
type TimelineMarkerDisplay = "dot" | "number" | "icon";

type TimelineStepLink = {
  href?: string;
  label?: string;
};

function normalizeTimelineStepPresentation(step: TimelineStep): TimelineStep {
  return {
    ...step,
    markerIcon: normalizePlainText(step.markerIcon),
    markerIconColor: normalizeOptionalColor(step.markerIconColor),
    markerBackgroundColor: normalizeOptionalColor(step.markerBackgroundColor),
    link: normalizeTimelineStepLink(step.link),
  };
}

function renderStepFrame(step: TimelineStep, children: ReactNode) {
  const href = normalizeWidgetSafeHref(step.link?.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  if (!href || step.cta) return <div>{children}</div>;
  return <a href={href}>{children}</a>;
}
```

Data flow:

1. Add strict schema entries for any new marker/link fields.
2. Normalize unsafe or empty links to `undefined`.
3. Resolve existing `style.markerColor` before per-step marker render.
4. Avoid nested anchors by disabling whole-step link rendering when a step CTA
   is present, or by moving the CTA outside the link according to the final
   product decision.
5. Keep CTA links and whole-step links mutually safe: never render an `<a>`
   inside another `<a>`, and document the chosen behavior in
   `_docs/_WIDGETS/TIMELINE.md`.

Error handling:

- Invalid `href` values are omitted and surfaced in the editor.
- Unknown marker display values normalize to the existing dot marker.
- Empty icon/color strings are omitted rather than serialized as sentinels.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new marker/link fields must be added to
  `timelineSchema` with `additionalProperties: false`.
- Anti-abuse: whole-step links and CTA links must use `normalizeWidgetSafeHref`;
  no `javascript:` URLs, raw HTML, or user-provided class names.
- Secret handling: no secrets in link, marker, or diagnostic payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` only if
  shared safe-href behavior changes
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before committing or closing this runtime/editor leaf
- `bun run scan:security:strict` before committing or closing this leaf
- `bun run precommit` before committing or closing this leaf

## Documentation Updates Required

- Update `_docs/_WIDGETS/TIMELINE.md` with marker/link fields and examples.
- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed/deferred
  status for W3, W4, W6, W10, and U6.

## Acceptance Criteria

- Timeline supports dot, number, and icon marker modes without breaking old
  payloads.
- Per-step accents can inherit from a global Timeline accent.
- Per-step label-position overrides are either implemented truthfully across the
  supported layouts or explicitly deferred with report evidence.
- Icon-in-marker rendering supports independent marker background and icon color
  controls when the marker display uses icon mode.
- Whole-step links are safe, optional, and do not create nested anchors.
- Tests cover strict schema, safe normalization, and SSR output.
