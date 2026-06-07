# TASK-416-03: Tests Rewrite And Fixtures
# FileName: TASK-416-03-Tests-Rewrite-And-Fixtures.md

**Parent Task:** TASK-416
**Priority:** High
**Category:** CMS Widgets / Timeline / Testing (Vitest lane)
**Estimated Effort:** Medium
**Dependencies:** TASK-416-01, TASK-416-02
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Replace `tests/vitest/widgets/timeline.test.tsx` (which asserts the old
`data-timeline-variant/mode` attributes, milestones fallback, and mode IA strings)
with coverage for the new preset-driven contract, and fix every other Vitest suite
that references the old timeline shape. Timeline logic is Vitest-owned per
`_docs/TESTING_STRATEGY.md`.

## Sub-Tasks

- [ ] Full rewrite of `tests/vitest/widgets/timeline.test.tsx`.
- [ ] Update `tests/vitest/widgets/editorContract.test.ts` expectations for the new
      section ids; it also asserts all registered contracts are valid, so the new
      `timelineEditorContract` must pass.
- [ ] Rewrite the timeline cases in `tests/vitest/ui/timeline-editor-wave.test.tsx`
      (do not touch `compare-timeline` cases).
- [ ] Grep remaining `"timeline"` fixtures in `tests/vitest/pageBuilder/*`,
      `tests/vitest/widgets/renderer.test.tsx`, and `tests/unit/widgets/
      validator.test.ts`; update only timeline-shaped fixtures minimally.

## Implementation Pseudocode

```ts
// 1. Schema: defaults validate; additionalProperties:false rejects stray keys; variant enum.
// 2. Normalize: partial nested dot/connector/typography/spacing fully resolve;
//    step clamp 3-8; unique ids; safe-href drops javascript:/data:/vbscript:; cleared background omitted.
for (const v of ALL_PRESETS) {
  const html = renderToString(<TimelineBlock data={timelineDefaults} variant={v} />);
  expect(html).toContain(`data-timeline-variant="${v}"`);
  expect(html).toContain(`data-timeline-orientation="${cap(v).orientation}"`);
}
// 3. vertical-left vs vertical-right axis side; alternating zigzag; alternating-opposite <time> cell;
//    cards bordered surface; compact overflow wrapper.
// 4. Dot: filled vs outlined markup; tone -> var(--color-*) token; per-step override beats global;
//    expect(html).not.toMatch(/emerald|#[0-9a-f]{6}/i) for token-only output.
// 5. Capability gating invariant:
for (const v of ALL_PRESETS) for (const field of ALL_FIELDS) {
  const changed = mutateField(timelineDefaults, field);
  const same = renderToString(<TimelineBlock data={timelineDefaults} variant={v} />);
  const next = renderToString(<TimelineBlock data={changed} variant={v} />);
  cap(v).visibleFields.has(field) ? expect(next).not.toBe(same) : expect(next).toBe(same);
}
// 6. Safe-href + whole-step link suppressed when CTA present; a11y aria-current/list label/<time>.
// 7. validateWidgetEditorContract(createTimelineWidget(stubs)).valid === true.
// 8. Parity: render via WidgetRenderer under renderContext.mode "public" vs "editor-preview" -> identical timeline markup.
```

Error handling: tests register the widget through `registerWidget(createTimelineWidget(...))`
and `clearWidgets()` between suites; invalid variant still throws
`widget_invalid_variant`.

Regression-test shape: the capability "shown⇒rendered / hidden⇒inert" invariant is
the primary guard against the original canvas bug; the parity test locks
canvas == public output.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/renderer.test.tsx`
  (plus any additional impacted suites found during the grep pass)
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- Captured under TASK-416-04 (validation evidence in changelog + board).
