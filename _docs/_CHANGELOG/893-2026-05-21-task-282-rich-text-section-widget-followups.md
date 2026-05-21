# 893 - TASK-282 Rich Text Section implementation pass

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-282, TASK-282-01, TASK-282-02, TASK-282-03, TASK-282-04, TASK-282-05, TASK-282-06, TASK-282-07, TASK-282-08, TASK-282-09

## Key Changes

### CMS Widgets and Runtime

- Expanded `rich-text-section` into a fuller long-form content surface: the
  widget now supports title heading levels, truthful article-width handling,
  scoped TOC anchors, section labelling, visible TOC focus treatment, and safe
  structured image / attachment / embed blocks in addition to text blocks.
- Kept the runtime deterministic and bounded: HTML/body output mode resolution is
  explicit, block headings render through bounded `h2`/`h3`/`h4` levels, unsafe
  tags and attributes are stripped with diagnostics, and raw iframe / inline
  image HTML remains outside the persisted contract.

### Admin UI and Authoring

- Replaced raw HTML-first body editing with the shared rich-text adapter and
  surfaced rendered-source ownership plus sanitizer feedback directly in the
  widget editor.
- Reworked structured block editing around recoverable UX: block-count
  reductions and removals now confirm + undo, large block sets page through a
  navigator, and image/attachment/embed blocks use widget-owned controls instead
  of requiring raw HTML.
- Clarified editor mode responsibilities: Wizard keeps quick setup without
  mutating `outputMode`, Visual owns product-facing variant/media/reader flows,
  and Advanced stays technical with source diagnostics, a raw HTML sanitize/apply
  panel, and payload snapshots.

### Docs and QA

- Updated the Rich Text Section widget doc, TASK-282 family files, report notes,
  and task board so the shipped runtime/editor contract plus the remaining
  environment blockers are documented in one place.
- Added focused coverage for runtime rendering, sanitizer diagnostics, output
  source resolution, block media/attachment/embed rendering, editor mode
  behavior, destructive-action recovery, async media selection, and strict
  validator acceptance/reject-unknown behavior.

### Validation

- Green focused validation on 2026-05-21:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun x vitest run --config vitest.config.ts tests/vitest/widgets/richTextSection.test.tsx`
  - `bun x vitest run --config vitest.config.ts tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts`
- Green broader validation from the isolated worktree:
  - `git diff --check`
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
- Provisioned local scanner tooling in `/tmp` plus a Semgrep-safe Rich Text
  Section Advanced preview renderer so the strict security scan can complete
  cleanly without weakening the sanitizer contract.
- Provisioned local Playwright CLI, Chromium, and Linux browser dependencies,
  but did not record the final admin/frontend replay because the configured
  `DATABASE_URL` targets a remote Render Postgres instance and browser login or
  page setup would mutate a shared environment without explicit approval.

Final TASK-282 closure remains open until the remaining browser evidence is
captured against an explicitly approved or isolated database-backed
environment.
