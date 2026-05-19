# 866. TASK-310 shared color adoption wave

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-310, TASK-310-01, TASK-310-02, TASK-310-03, TASK-310-04

## Key Changes

### Shared editor color controls
- Remaining widget editors now consume the landed shared swatch/text color seam instead of local picker clones.
- Layout/interactive, content/marketing, shell/forms-adjacent, and team/testimonials editor waves were closed under physical TASK-310 leaves.
- Existing widget-local placeholders, clear semantics, token preservation, and safe picker fallbacks stayed intact while the helper ownership converged.

## Validation

- Focused editor-wave suites for every TASK-310 leaf passed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
