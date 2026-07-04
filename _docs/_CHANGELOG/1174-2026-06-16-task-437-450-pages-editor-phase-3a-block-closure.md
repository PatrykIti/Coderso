# 1174 - TASK-437..450 Pages editor Phase 3a block closure

**Date:** 2026-06-16
**Version:** Unreleased
**Tasks:** TASK-437, TASK-437-01, TASK-437-01-L01, TASK-437-02, TASK-438, TASK-438-01, TASK-438-01-L01, TASK-438-02, TASK-439, TASK-439-01, TASK-439-01-L01, TASK-439-02, TASK-440, TASK-440-01, TASK-440-01-L01, TASK-440-02, TASK-441, TASK-441-01, TASK-441-01-L01, TASK-441-02, TASK-443, TASK-443-01, TASK-443-01-L01, TASK-443-02, TASK-444, TASK-444-01, TASK-444-01-L01, TASK-444-02, TASK-445, TASK-445-01, TASK-445-01-L01, TASK-445-02, TASK-446, TASK-446-01, TASK-446-01-L01, TASK-446-02, TASK-447, TASK-447-01, TASK-447-01-L01, TASK-447-02, TASK-448, TASK-448-01, TASK-448-01-L01, TASK-448-02, TASK-450, TASK-450-01, TASK-450-01-L01, TASK-450-02
**Type:** Pages/Admin UI/Public Runtime/QA/Docs/Drift Audit

## Key Changes

### Pages Runtime

- Made `text.format: "rich"` render sanitized rich HTML instead of plain source
  text, with a small safe tag allowlist and safe link attributes only.
- Wired Button `variant` and `size` into the rendered anchor surface. The
  primary/secondary/ghost/link accent surfaces now use inline styles that
  consume `var(--coderso-section-accent,#0d9488)`, so visible section-accent
  rendering no longer depends on generated Tailwind arbitrary classes.
- Bound Video `autoplay` into the public `<video>` render with muted and
  playsInline browser policy companions.
- Rendered Card `image` and safe `href` props on the public card output.
- Made Divider `tone` affect the rendered border color while preserving
  thickness output.

### Pages Editor

- Closed the Phase 3a block-family audit after the modularized shared editor
  controls landed in the earlier phases: Heading, Image, Spacer, Statistic,
  Quote, Container, and Group required verification-shaped closure rather than
  new UX changes.
- Preserved the current Page Editor, Page Template, canvas, floating panel, and
  toolbar UX while adding renderer guard coverage for the remaining dead-prop
  findings.

### Documentation

- Updated `_docs/PAGE_MODEL.md` with the now-truthful block prop runtime
  semantics.
- Moved all Phase 3a block families and their physical children from To Do to
  Done in `_docs/_TASKS/README.md`.
- Recorded the merged audit trail inline: the 2026-06-16 phase 3a re-audit
  split the block families into renderer-fix owners (Text, Button, Video,
  Card, Divider) and verification-shaped closures after shared controls landed
  (Heading, Image, Spacer, Statistic, Quote, Container, Group). Final read-only
  agent passes found no unresolved high/medium runtime or task-board drift after
  the Button accent computed-style correction.

## Validation

- `bun run test:vitest tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `playwright-cli` minimal computed-style smoke: parent
  `--coderso-section-accent:#00ff00` plus Button inline
  `background-color:var(--coderso-section-accent,#0d9488)` computed to
  `rgb(0, 255, 0)`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
