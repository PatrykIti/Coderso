# TASK-430-01-L01: Timeline Runtime Layout And Dedicated Controls
# FileName: TASK-430-01-L01-Timeline-Runtime-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-430-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-430-01
**Status:** ⏳ To Do

---

## Overview

Implement truthful Timeline runtime behavior so section variants produce real
timeline/milestone markup and pair that with the shared dedicated control
surface for timeline-specific options.

---

## Implementation Pseudocode

```tsx
const timelineModel = resolveTimelineSectionModel(section);
return <TimelineSectionRenderer model={timelineModel} variant={section.layout.variant} />;
```

Expected data flow:

- Timeline variants change real runtime structure/classes.
- Inspector controls use dedicated segmented/toggle/color widgets.
- Existing heading/text child content remains valid inside the richer layout.

Error handling:

- Unknown variants fall back to the safe default timeline layout.
- Missing timeline-specific data degrades to deterministic empty states.

Regression-test shape:

- Runtime coverage for variant output and UI coverage for timeline controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Timeline fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Timeline runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

