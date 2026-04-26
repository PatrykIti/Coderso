# 744 - TASK-212 Posts editor media followups

Date: 2026-04-26
Version: unreleased
Tasks: TASK-212, TASK-212-01, TASK-212-01-01, TASK-212-01-02, TASK-212-02, TASK-212-02-01, TASK-212-02-02, TASK-212-03, TASK-212-03-01, TASK-212-03-02, TASK-212-04, TASK-212-04-01, TASK-212-04-02

## Key Changes

### Posts Editor Feedback
- Routed Posts editor Publish and Update success/error feedback through the shared admin action-toast adapter instead of direct Sonner calls.
- Kept the existing publish/update action model while making mutation failures visible through bounded error toasts rather than swallowing rejected promises.

### Posts Drawer Accessibility
- Bound the Create New Post drawer description through `SheetDescription` so Radix has a real `aria-describedby` target.
- Added focused a11y coverage for Create New Post plus a regression smoke for the already-fixed Post Revisions drawer.

### Media Blocks
- Added first-class `Video`, `Gallery`, `Audio`, and `File` Posts block contracts with deterministic defaults, normalization, inserter visibility, canvas placeholders, inspector controls, and media-library selection.
- Extended media kind detection to classify `video/*` assets and render the matching icon in media cards, picker, and details drawer.
- Added public runtime mapping/rendering for video, gallery, audio, and file blocks with safe media resolution and unresolved-asset omission.
- Guarded background media lookup against repeated refetch loops when a document references a missing media ID.

### Docs and QA
- Updated Posts QA notes, editor UX docs, CMS API/spec docs, current-state docs, task board, and changelog index.
- Validated with lint, typecheck, and targeted Vitest suites for action toasts, AdminApp/Sonner host wiring, editor state/header workflow, drawer a11y, media block normalization/catalog/defaults, canvas, inspector, inserter, and runtime rendering.
- Manual Playwright was not rerun in this code pass; TASK-212 preserves the 2026-04-26 live BUG-5 proof and closes BUG-8/UX-4 from code plus automated coverage.
