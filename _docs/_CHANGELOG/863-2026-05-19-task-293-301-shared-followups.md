# 863. TASK-293 to TASK-301 shared follow-up owners

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-293, TASK-294, TASK-295, TASK-296, TASK-297, TASK-298, TASK-299, TASK-300, TASK-301

## Key Changes

### Builder and booking shared contracts
- Shared repeatable-slot add/remove/reorder now keeps slot order and widget metadata aligned through a builder-owned seam.
- Page/template/custom-screen/detail-template editors now expose same-surface booking flow summaries through `WidgetEditorContext.bookingFlows`.
- Booking Calendar now has explicit accessibility semantics, shared frame color-control adoption, and non-silent availability draft/save UX.
- Appointment Form now supports bounded custom-field authoring/rendering and `metadata.customFields` serialization.

### Shared runtime and compare follow-ups
- Compare Timeline now ships shared contrast advisories and bounded reduced-motion-safe motion presets.
- Public runtime HTML cache now skips nonce-bearing hydrated pages for Form Embed, Contact, and Appointment Form.

## Validation

- Focused Vitest lanes for page-builder, booking, compare, and appointment-form surfaces passed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
