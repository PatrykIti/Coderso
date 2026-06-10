# TASK-429-01-L01: Media Split Variant Layout And Dedicated Controls
# FileName: TASK-429-01-L01-Media-Split-Variant-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-429-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-429-01
**Status:** ⏳ To Do

---

## Overview

Implement real `default`/`split`/`horizontal` Media Split layouts on the
published front and replace the current raw media/responsive controls with the
shared dedicated surfaces.

---

## Implementation Pseudocode

```tsx
const templateClass = resolveMediaSplitTemplate(section.layout.variant);
return (
  <section className={templateClass}>
    <MediaSlot />
    <ContentSlot />
  </section>
);
```

Expected data flow:

- Variant changes produce real layout differences on the front.
- Media-related inspector fields use the shared picker/segmented/toggle widgets.
- Responsive controls integrate with TASK-425 panel ownership.

Error handling:

- Unknown variants fall back to `default`.
- Missing media assets degrade to safe empty/media-placeholder states already
  owned by runtime rules.

Regression-test shape:

- Runtime coverage for variant output and UI coverage for dedicated controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Media Split fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Media Split runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

